import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseVersionSnapshot, type VersionSnapshotFile } from "@/lib/server/generation/version-snapshot";
import { createTypeScriptConfig, ensureTailwindProjectSetup } from "@/lib/server/generation/template";
import { logger } from "@/lib/server/logger";
import { SandboxError } from "@/lib/server/sandbox/run-build";

const IMAGE = process.env.SANDBOX_DOCKER_IMAGE?.trim() || "buildbox-sandbox:local";
const MAX_PREVIEW_MINUTES = 30;
const MAX_OUTPUT = 4_000;
const PREVIEW_NETWORK = "buildbox-preview-local";
type PreviewSession = { containerName: string; url: string; expiresAt: number; timer: NodeJS.Timeout };
const sessions = new Map<string, PreviewSession>();

function runDocker(args: string[], timeoutMs = 15_000): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const append = (chunk: Buffer) => { output = (output + chunk.toString("utf8")).slice(-MAX_OUTPUT); };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    timer.unref();
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => { clearTimeout(timer); resolve({ code, output }); });
  });
}

async function writeFiles(directory: string, files: VersionSnapshotFile[]) {
  for (const file of files) {
    const destination = path.join(directory, ...file.path.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.content, { encoding: "utf8", flag: "wx" });
  }
  if (!files.some((file) => file.path === "tsconfig.json")) {
    await writeFile(path.join(directory, "tsconfig.json"), JSON.stringify(createTypeScriptConfig(), null, 2), { encoding: "utf8", flag: "wx" });
  }
}

async function stopContainer(containerName: string) {
  try { await runDocker(["rm", "--force", containerName], 10_000); } catch { /* Container may already be gone. */ }
}

async function ensurePreviewNetwork() {
  const inspect = await runDocker(["network", "inspect", PREVIEW_NETWORK, "--format", "{{.Name}}"]);
  if (inspect.code === 0) return;
  // Docker Desktop may omit published port bindings on containers attached only
  // to an --internal bridge. Use a normal bridge with masquerading and
  // inter-container traffic disabled so localhost port publishing works
  // without giving preview code outbound internet access.
  const created = await runDocker([
    "network", "create", "--driver", "bridge",
    "--opt", "com.docker.network.bridge.enable_ip_masquerade=false",
    "--opt", "com.docker.network.bridge.enable_icc=false",
    PREVIEW_NETWORK,
  ]);
  if (created.code === 0) return;
  const racedInspect = await runDocker(["network", "inspect", PREVIEW_NETWORK, "--format", "{{.Name}}"]);
  if (racedInspect.code !== 0) {
    const diagnostic = created.output.replace(/[\r\n\t]+/g, " ").trim().slice(0, 240);
    logger.error("preview.network_create_failed", { code: "PREVIEW_NETWORK_UNAVAILABLE", message: diagnostic || "Docker network create failed." });
    throw new SandboxError("PREVIEW_NETWORK_UNAVAILABLE", `Docker could not create the isolated preview network${diagnostic ? `: ${diagnostic}` : "."}`, 503);
  }
}

async function findAvailableLocalPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (!address || typeof address === "string") throw new SandboxError("PREVIEW_PORT_UNAVAILABLE", "Could not reserve a localhost port for the project preview.", 503);
  return address.port;
}

export async function stopProjectPreview(projectId: string) {
  const session = sessions.get(projectId);
  if (session) {
    clearTimeout(session.timer);
    sessions.delete(projectId);
  }
  await stopContainer(session?.containerName ?? `buildbox-preview-${projectId}`);
}

export function getProjectPreview(projectId: string) {
  const session = sessions.get(projectId);
  if (!session) return null;
  return { url: session.url, expiresAt: new Date(session.expiresAt).toISOString() };
}

export async function startProjectPreview(projectId: string, projectFiles: unknown) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(projectId)) throw new SandboxError("PREVIEW_INVALID_PROJECT", "Invalid project identifier.", 400);
  const files = ensureTailwindProjectSetup(parseVersionSnapshot({ files: projectFiles, framework: "nextjs" }));
  const previewStartedAt = Date.now();
  await stopProjectPreview(projectId);
  const sourceDirectory = await mkdtemp(path.join(tmpdir(), "buildbox-preview-"));
  const containerName = `buildbox-preview-${projectId}`;
  let stage = "prepare_files";
  try {
    // Also clean up a stale container left behind if the Next.js server restarted.
    await stopContainer(containerName);
    await writeFiles(sourceDirectory, files);
    stage = "inspect_image";
    const imageCheck = await runDocker(["image", "inspect", IMAGE, "--format", "{{.Id}}"]);
    if (imageCheck.code !== 0) {
      const message = imageCheck.output.replace(/[\r\n\t]+/g, " ").trim().slice(0, 240);
      throw new SandboxError("SANDBOX_IMAGE_MISSING", `Sandbox image "${IMAGE}" is unavailable. Build it with npm run sandbox:build.${message ? ` Docker: ${message}` : ""}`, 503);
    }
    stage = "ensure_network";
    await ensurePreviewNetwork();
    stage = "reserve_host_port";
    const hostPort = await findAvailableLocalPort();
    const sourceMount = `type=bind,src=${sourceDirectory},dst=/input,readonly`;
    stage = "start_container";
    logger.info("preview.container_starting", { projectId, stage });
    const start = await runDocker([
      "run", "--detach", "--rm", "--init", "--name", containerName,
      "--network", PREVIEW_NETWORK,
      "--publish", `127.0.0.1:${hostPort}:3000/tcp`,
      "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
      "--pids-limit", "128", "--memory", "768m", "--memory-swap", "768m", "--cpus", "1.0",
      "--ulimit", "nofile=512:512", "--user", "10001:10001",
      "--tmpfs", "/workspace:rw,nosuid,nodev,size=256m,uid=10001,gid=10001,mode=700",
      "--tmpfs", "/tmp:rw,nosuid,nodev,size=32m,uid=10001,gid=10001,mode=700",
      "--mount", sourceMount,
      "--env", "HOME=/tmp", "--env", "TMPDIR=/tmp", "--env", "NEXT_TELEMETRY_DISABLED=1",
      "--workdir", "/workspace", IMAGE, "sh", "-c",
      "cp -R /input/. /workspace/ && ln -s /opt/buildbox-sandbox/node_modules /workspace/node_modules && exec node /opt/buildbox-sandbox/node_modules/next/dist/bin/next dev -H 0.0.0.0 -p 3000",
    ], 30_000);
    if (start.code !== 0) {
      const diagnostic = start.output.replace(/[\r\n\t]+/g, " ").trim().slice(0, 320);
      throw new SandboxError("PREVIEW_START_FAILED", `Docker could not start the project preview${diagnostic ? `: ${diagnostic}` : "."}`, 503);
    }
    stage = "bind_port";
    const port = await runDocker(["port", containerName, "3000/tcp"]);
    const match = port.output.match(/127\.0\.0\.1:(\d+)/);
    if (port.code !== 0 || Number(match?.[1]) !== hostPort) {
      const diagnostic = port.output.replace(/[\r\n\t]+/g, " ").trim().slice(0, 240);
      throw new SandboxError("PREVIEW_PORT_UNAVAILABLE", `Docker did not provide a local port for the project preview${diagnostic ? `: ${diagnostic}` : "."}`, 503);
    }
    const url = `http://127.0.0.1:${hostPort}`;
    stage = "wait_for_app";
    let ready = false;
    const readyDeadline = Date.now() + 30_000;
    while (Date.now() < readyDeadline) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
        if (response.status < 500) { ready = true; break; }
      } catch { /* Next.js is still starting. */ }
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
    if (!ready) {
      const logs = await runDocker(["logs", "--tail", "40", containerName], 5_000).catch(() => ({ code: null, output: "" }));
      const diagnostic = logs.output.replace(/[\r\n\t]+/g, " ").trim().slice(-700);
      logger.error("preview.app_readiness_failed", {
        projectId,
        stage,
        code: "PREVIEW_START_TIMEOUT",
        message: diagnostic || "The preview container did not return a successful response within 30 seconds.",
      });
      throw new SandboxError("PREVIEW_START_TIMEOUT", "The generated app did not become ready in 30 seconds. Check the preview startup logs in the terminal.", 503);
    }
    const expiresAt = Date.now() + MAX_PREVIEW_MINUTES * 60_000;
    const timer = setTimeout(() => { void stopProjectPreview(projectId); }, MAX_PREVIEW_MINUTES * 60_000);
    timer.unref();
    const session = { containerName, url, expiresAt, timer };
    sessions.set(projectId, session);
    logger.info("preview.container_started", { projectId, stage: "ready", durationMs: Date.now() - previewStartedAt });
    return { url: session.url, expiresAt: new Date(expiresAt).toISOString() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown preview startup error.";
    logger.error("preview.start_failed", {
      projectId,
      stage,
      code: error instanceof SandboxError ? error.code : "PREVIEW_START_FAILED",
      message: message.slice(0, 400),
    });
    await stopContainer(containerName);
    if (error instanceof SandboxError) throw error;
    if (error && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new SandboxError("SANDBOX_DOCKER_UNAVAILABLE", "Docker is not available. Start Docker Desktop and try again.", 503);
    }
    throw new SandboxError("PREVIEW_START_FAILED", "Docker could not prepare the isolated project preview. Check that Docker Desktop is running and the sandbox image is built.", 503);
  } finally {
    await rm(sourceDirectory, { recursive: true, force: true });
  }
}
