import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseVersionSnapshot } from "@/lib/server/generation/version-snapshot";
import type { VersionSnapshotFile } from "@/lib/server/generation/version-snapshot";
import { createTypeScriptConfig, ensureTailwindProjectSetup } from "@/lib/server/generation/template";

const BUILD_TIMEOUT_MS = 120_000;
const CLEANUP_TIMEOUT_MS = 10_000;
const MAX_BUILD_OUTPUT_CHARS = 40_000;
const DEFAULT_IMAGE = "buildbox-sandbox:local";

export class SandboxError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 503) {
    super(message);
    this.name = "SandboxError";
  }
}

type ProcessResult = { code: number | null; output: string; timedOut: boolean; truncated: boolean };

function runDocker(args: string[], timeoutMs: number, outputLimit = MAX_BUILD_OUTPUT_CHARS): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    let output = "";
    let timedOut = false;
    let truncated = false;
    let finished = false;
    const child = spawn("docker", args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const append = (chunk: Buffer) => {
      if (output.length >= outputLimit) {
        truncated = true;
        child.kill("SIGTERM");
        return;
      }
      const text = chunk.toString("utf8");
      if (output.length + text.length > outputLimit) {
        output += text.slice(0, outputLimit - output.length);
        output += "\n[Build output truncated at the safety limit.]";
        truncated = true;
        child.kill("SIGTERM");
      } else output += text;
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(error);
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      const killTimer = setTimeout(() => child.kill("SIGKILL"), 2_000);
      killTimer.unref();
    }, timeoutMs);
    timer.unref();
    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({ code, output, timedOut, truncated });
    });
  });
}

async function writeSandboxFiles(directory: string, files: VersionSnapshotFile[]) {
  for (const file of files) {
    const destination = path.join(directory, ...file.path.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.content, { encoding: "utf8", flag: "wx" });
  }
  if (!files.some(({ path: filePath }) => filePath === "tsconfig.json")) {
    await writeFile(path.join(directory, "tsconfig.json"), JSON.stringify(createTypeScriptConfig(), null, 2), { encoding: "utf8", flag: "wx" });
  }
}

function imageName(): string {
  const configured = process.env.SANDBOX_DOCKER_IMAGE?.trim() || DEFAULT_IMAGE;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]{0,127}$/.test(configured)) {
    throw new SandboxError("SANDBOX_CONFIGURATION", "SANDBOX_DOCKER_IMAGE contains invalid characters.", 503);
  }
  return configured;
}

function dockerPermissionDenied(output: string): boolean {
  return /permission denied.*(?:docker|npipe|pipe)|access is denied.*(?:docker|npipe|pipe)/i.test(output);
}

export async function runSandboxBuild(projectFiles: unknown) {
  const files = ensureTailwindProjectSetup(parseVersionSnapshot({ files: projectFiles, framework: "nextjs" }));
  const image = imageName();
  const sourceDirectory = await mkdtemp(path.join(tmpdir(), "buildbox-sandbox-"));
  const containerName = `buildbox-validate-${randomUUID()}`;
  let containerStarted = false;

  try {
    await writeSandboxFiles(sourceDirectory, files);
    let imageCheck: ProcessResult;
    try {
      imageCheck = await runDocker(["image", "inspect", image, "--format", "{{.Id}}"], 15_000, 500);
    } catch {
      throw new SandboxError("SANDBOX_DOCKER_UNAVAILABLE", "Docker is not available. Start the Docker Engine and try again.", 503);
    }
    if (imageCheck.code !== 0) {
      if (dockerPermissionDenied(imageCheck.output)) {
        throw new SandboxError(
          "SANDBOX_DOCKER_PERMISSION",
          "BuildBox cannot access the Docker Desktop pipe from this Windows account. Add the account to the docker-users group, then sign out and back in before restarting BuildBox.",
          503,
        );
      }
      if (imageCheck.timedOut || /failed to connect|cannot connect|error during connect|docker daemon|docker api/i.test(imageCheck.output)) {
        throw new SandboxError("SANDBOX_DOCKER_UNAVAILABLE", "Docker Engine is not running. Start Docker Desktop and try again.", 503);
      }
      let context = "unknown";
      try {
        const contextResult = await runDocker(["context", "show"], 10_000, 500);
        if (contextResult.code === 0 && contextResult.output.trim()) context = contextResult.output.trim().slice(0, 100);
      } catch { /* The inspect diagnostic below is still useful if context lookup is unavailable. */ }
      const diagnostic = imageCheck.output.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 240);
      if (/no such image|image .* not found|manifest unknown/i.test(diagnostic)) {
        throw new SandboxError("SANDBOX_IMAGE_MISSING", `Sandbox image "${image}" is not available in Docker context "${context}". Build it in the same context with npm run sandbox:build.`, 503);
      }
      throw new SandboxError(
        "SANDBOX_DOCKER_CHECK_FAILED",
        `Docker could not inspect sandbox image "${image}" in context "${context}" (exit ${imageCheck.code ?? "unknown"})${diagnostic ? `: ${diagnostic}` : "."}`,
        503,
      );
    }

    const startedAt = Date.now();
    const sourceMount = `type=bind,src=${sourceDirectory},dst=/input,readonly`;
    const command = "cp -R /input/. /workspace/ && ln -s /opt/buildbox-sandbox/node_modules /workspace/node_modules && cd /workspace && node /opt/buildbox-sandbox/node_modules/next/dist/bin/next build";
    let result: ProcessResult;
    try {
      containerStarted = true;
      result = await runDocker([
        "run", "--rm", "--init", "--name", containerName,
        "--network", "none",
        "--read-only",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--pids-limit", "128",
        "--memory", "768m",
        "--memory-swap", "768m",
        "--cpus", "1.0",
        "--ulimit", "nofile=512:512",
        "--user", "10001:10001",
        "--tmpfs", "/workspace:rw,nosuid,nodev,size=256m,uid=10001,gid=10001,mode=700",
        "--tmpfs", "/tmp:rw,nosuid,nodev,size=32m,uid=10001,gid=10001,mode=700",
        "--mount", sourceMount,
        "--env", "HOME=/tmp",
        "--env", "TMPDIR=/tmp",
        "--env", "NEXT_TELEMETRY_DISABLED=1",
        "--env", "CIRCLE_NODE_TOTAL=1",
        image,
        "sh", "-c", command,
      ], BUILD_TIMEOUT_MS);
    } catch {
      throw new SandboxError("SANDBOX_DOCKER_UNAVAILABLE", "Docker could not start the isolated build container.", 503);
    }

    const durationMs = Date.now() - startedAt;
    if (result.timedOut) {
      return { status: "FAILED" as const, message: "The build exceeded the 120-second time limit.", output: result.output, durationMs };
    }
    if (result.truncated) {
      return { status: "FAILED" as const, message: "Build output exceeded the 40,000-character limit.", output: result.output, durationMs };
    }
    if (result.code === 125 && dockerPermissionDenied(result.output)) {
      throw new SandboxError(
        "SANDBOX_DOCKER_PERMISSION",
        "BuildBox lost access to Docker Desktop. Add the Windows account running BuildBox to the docker-users group, then sign out and back in.",
        503,
      );
    }
    if (result.code !== 0) {
      return { status: "FAILED" as const, message: "The generated project did not pass its isolated production build.", output: result.output, durationMs };
    }
    return { status: "PASSED" as const, message: "The project passed its isolated production build.", output: result.output, durationMs };
  } finally {
    if (containerStarted) {
      try { await runDocker(["rm", "--force", containerName], CLEANUP_TIMEOUT_MS, 2_000); } catch { /* Docker may already have removed the container. */ }
    }
    await rm(sourceDirectory, { recursive: true, force: true });
  }
}
