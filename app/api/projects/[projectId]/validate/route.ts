import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { AIProviderError } from "@/lib/server/ai/types";
import { recordAIUsage } from "@/lib/server/ai/usage";
import { repairBuildFailure } from "@/lib/server/generation/build-repair";
import { logger } from "@/lib/server/logger";
import { getPrisma } from "@/lib/server/prisma";
import { runSandboxBuild, SandboxError } from "@/lib/server/sandbox/run-build";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_COMBINED_OUTPUT_CHARS = 40_000;
const MAX_BUILD_REPAIR_ATTEMPTS = 3;

function combineOutput(...sections: string[]) {
  return sections.filter(Boolean).join("\n\n").slice(-MAX_COMBINED_OUTPUT_CHARS);
}

function shouldAttemptRepair(message: string, output: string) {
  return !/exceeded the 120-second time limit|output exceeded the 40,000-character limit|\bEAGAIN\b|out of memory|no space left on device/i.test(`${message}\n${output}`);
}

async function saveBuildRepair(projectId: string, userId: string, originalFiles: Array<{ path: string; content: string; language: string | null }>, repairedFiles: Array<{ path: string; content: string; language: string }>, changedFiles: string[]) {
  const prisma = getPrisma();
  const originalByPath = new Map(originalFiles.map((file) => [file.path, file]));
  const repairedByPath = new Map(repairedFiles.map((file) => [file.path, file]));
  const snapshot = {
    files: repairedFiles.map(({ path, content, language }) => ({ path, content, language })),
    framework: "nextjs",
  };

  await prisma.$transaction(async (transaction) => {
    const currentFiles = await transaction.projectFile.findMany({
      where: { projectId },
      select: { path: true, content: true },
      orderBy: { path: "asc" },
    });
    if (currentFiles.length !== originalFiles.length || currentFiles.some((file) => originalByPath.get(file.path)?.content !== file.content)) {
      throw new Error("Project files changed while automatic repair was running.");
    }

    for (const path of changedFiles) {
      const original = originalByPath.get(path);
      const repaired = repairedByPath.get(path);
      if (!original || !repaired) throw new Error("The automatic repair file set changed before save.");
      const update = await transaction.projectFile.updateMany({
        where: { projectId, path, content: original.content },
        data: { content: repaired.content, version: { increment: 1 } },
      });
      if (update.count !== 1) throw new Error("Project files changed while automatic repair was running.");
    }

    const latestVersion = await transaction.projectVersion.findFirst({ where: { projectId }, orderBy: { versionNumber: "desc" }, select: { versionNumber: true } });
    const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;
    await transaction.projectVersion.create({
      data: { projectId, versionNumber, description: "Automatic repair after failed production build", snapshot, createdBy: userId },
    });
    await transaction.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  }, { isolationLevel: "Serializable" });
}

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to validate this project.");
    const { projectId } = await params;
    const project = await getPrisma().project.findFirst({
      where: { id: projectId, userId: session.user.id, status: { not: "DELETED" } },
      select: { id: true, files: { select: { path: true, content: true, language: true }, orderBy: { path: "asc" } } },
    });
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    if (!project.files.length) throw new ApiError(409, "PROJECT_NOT_GENERATED", "Generate project files before running a build check.");

    const validationStartedAt = Date.now();
    logger.info("sandbox.build_started", { requestId, projectId });
    let currentBuild = await runSandboxBuild(project.files);
    logger.info("sandbox.build_completed", { requestId, projectId, stage: currentBuild.status, durationMs: currentBuild.durationMs });
    const outputSections = [`Build attempt 1 (${currentBuild.status}):`, currentBuild.output];
    if (currentBuild.status === "PASSED" || !shouldAttemptRepair(currentBuild.message, currentBuild.output)) {
      return Response.json({ success: true, data: currentBuild, requestId });
    }

    const currentFiles = project.files.map((file) => ({ ...file, language: file.language ?? "text" }));
    const changedPathSet = new Set<string>();
    let repairAttempts = 0;
    let repairFailure = "";

    while (repairAttempts < MAX_BUILD_REPAIR_ATTEMPTS && shouldAttemptRepair(currentBuild.message, currentBuild.output)) {
      repairAttempts += 1;
      const repairStartedAt = Date.now();
      logger.info("sandbox.build_repair_started", { requestId, projectId, attempt: repairAttempts });
      let repair: Awaited<ReturnType<typeof repairBuildFailure>>;
      try {
        repair = await repairBuildFailure(currentFiles, currentBuild.output);
        if (!repair.changedFiles.length) {
          repairFailure = `Automatic repair attempt ${repairAttempts} found no source changes to apply.`;
          logger.info("sandbox.build_repair_no_changes", { requestId, projectId, attempt: repairAttempts, durationMs: Date.now() - repairStartedAt });
          break;
        }
        for (const path of repair.changedFiles) changedPathSet.add(path);
        for (const file of repair.files) {
          const currentIndex = currentFiles.findIndex(({ path }) => path === file.path);
          if (currentIndex >= 0) currentFiles[currentIndex] = file;
        }
        try {
          await recordAIUsage(repair.result, { userId: session.user.id, projectId });
        } catch {
          logger.error("sandbox.build_repair_usage_record_failed", { requestId, projectId, code: "USAGE_RECORD_FAILED", attempt: repairAttempts });
        }
      } catch (repairError) {
        repairFailure = repairError instanceof AIProviderError ? repairError.message : "Automatic repair could not be completed.";
        logger.error("sandbox.build_repair_failed", {
          requestId,
          projectId,
          code: repairError instanceof AIProviderError ? repairError.code : "BUILD_REPAIR_FAILED",
          attempt: repairAttempts,
          durationMs: Date.now() - repairStartedAt,
        });
        break;
      }

      logger.info("sandbox.build_repair_completed", { requestId, projectId, attempt: repairAttempts, durationMs: Date.now() - repairStartedAt });
      currentBuild = await runSandboxBuild(currentFiles);
      logger.info("sandbox.build_repair_retry_completed", { requestId, projectId, attempt: repairAttempts, stage: currentBuild.status, durationMs: currentBuild.durationMs });
      outputSections.push(`Build attempt ${repairAttempts + 1} (${currentBuild.status}) after repair ${repairAttempts}:`, currentBuild.output);
      if (currentBuild.status === "PASSED" || !shouldAttemptRepair(currentBuild.message, currentBuild.output)) break;
    }

    const totalDurationMs = Date.now() - validationStartedAt;
    if (currentBuild.status !== "PASSED") {
      const failureMessage = repairFailure
        ? `${currentBuild.message} ${repairFailure} The original saved files were kept.`
        : `${currentBuild.message} The project still fails after ${repairAttempts} automatic repair attempt${repairAttempts === 1 ? "" : "s"}. The original saved files were kept.`;
      logger.info("sandbox.build_repair_exhausted", { requestId, projectId, attempt: repairAttempts, durationMs: totalDurationMs });
      return Response.json({
        success: true,
        data: {
          ...currentBuild,
          message: failureMessage,
          durationMs: totalDurationMs,
          output: combineOutput(...outputSections, repairFailure ? `Automatic repair stopped: ${repairFailure}` : ""),
        },
        requestId,
      });
    }

    const originalByPath = new Map(project.files.map((file) => [file.path, file.content]));
    const finalChangedFiles = [...changedPathSet].filter((path) => originalByPath.get(path) !== currentFiles.find((file) => file.path === path)?.content);
    if (!finalChangedFiles.length) {
      return Response.json({
        success: true,
        data: { ...currentBuild, message: "The project passed its isolated production build after automatic repair; no file changes needed saving.", durationMs: totalDurationMs, output: combineOutput(...outputSections) },
        requestId,
      });
    }

    try {
      await saveBuildRepair(projectId, session.user.id, project.files, currentFiles, finalChangedFiles);
    } catch {
      logger.error("sandbox.build_repair_save_failed", { requestId, projectId, code: "BUILD_REPAIR_SAVE_FAILED" });
      return Response.json({
        success: true,
        data: {
          ...currentBuild,
          status: "FAILED" as const,
          message: "The project passed after automatic repair, but the repair could not be saved because the project changed during validation. Run Validate build again.",
          durationMs: totalDurationMs,
          output: combineOutput(...outputSections),
        },
        requestId,
      });
    }

    logger.info("sandbox.build_repair_saved", { requestId, projectId, stage: "PASSED", attempt: repairAttempts, durationMs: totalDurationMs });
    return Response.json({
      success: true,
      data: {
        ...currentBuild,
        message: `The project passed its isolated production build after ${repairAttempts} automatic repair attempt${repairAttempts === 1 ? "" : "s"}. Repaired files were saved as a new version.`,
        durationMs: totalDurationMs,
        changedFiles: finalChangedFiles,
        output: combineOutput(...outputSections, `Saved repaired files: ${finalChangedFiles.join(", ")}.`),
      },
      requestId,
    });
  } catch (error) {
    if (error instanceof SandboxError || error instanceof AIProviderError) {
      return errorResponse(new ApiError(error.status, error.code, error.message), requestId);
    }
    return errorResponse(error, requestId);
  }
}
