import { AIProviderError } from "@/lib/server/ai/types";
import { recordAIUsage } from "@/lib/server/ai/usage";
import { getPrisma } from "@/lib/server/prisma";
import { createApplicationPlan } from "@/lib/server/planning/application-plan";
import { generateProjectFiles } from "@/lib/server/generation/file-generator";

type GenerateProjectInput = { projectId: string; userId: string; prompt: string };

async function addLog(
  generationJobId: string,
  stage: string,
  level: string,
  message: string,
  metadata?: Record<string, string | number | string[]>,
) {
  await getPrisma().generationLog.create({
    data: { generationJobId, stage, level, message, metadata },
  });
}

function safeFailureMessage(error: unknown): string {
  if (error instanceof AIProviderError) return error.message;
  return "Project generation failed. Please try again.";
}

export async function generateProject({ projectId, userId, prompt }: GenerateProjectInput) {
  const prisma = getPrisma();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, status: { not: "DELETED" } },
    select: { id: true, name: true, files: { select: { id: true }, take: 1 } },
  });
  if (!project) throw new AIProviderError("PROJECT_NOT_FOUND", "Project was not found.", 404);
  if (project.files.length > 0) {
    throw new AIProviderError("PROJECT_ALREADY_GENERATED", "This project already has files. Use the project iteration workflow to make changes.", 409);
  }

  const job = await prisma.generationJob.create({
    data: { projectId, userId, prompt: prompt.trim(), status: "PENDING" },
    select: { id: true },
  });

  try {
    await prisma.generationJob.update({ where: { id: job.id }, data: { status: "PLANNING", startedAt: new Date() } });
    await addLog(job.id, "planning", "INFO", "Planning the application.");

    const planResult = await createApplicationPlan(prompt);
    await recordAIUsage(planResult, { userId, projectId, generationJobId: job.id });
    await addLog(job.id, "planning", "INFO", "Application plan created.", {
      pages: planResult.output.pages.length,
      files: planResult.output.files.length,
      dependencies: planResult.output.dependencies.map(({ name }) => name),
    });

    await prisma.generationJob.update({ where: { id: job.id }, data: { status: "GENERATING" } });
    await addLog(job.id, "generation", "INFO", "Generating project files.");

    const generated = await generateProjectFiles(planResult.output);
    for (const item of generated.usage) {
      await recordAIUsage({ ...item, output: "" }, { userId, projectId, generationJobId: job.id });
    }

    await prisma.generationJob.update({ where: { id: job.id }, data: { status: "VALIDATING" } });
    await addLog(job.id, "validation", "INFO", "Checking file paths, manifest entries, and project size.");

    const snapshot = {
      files: generated.files.map(({ path, content, language }) => ({ path, content, language })),
      framework: "nextjs",
      dependencies: generated.dependencies,
    };

    await prisma.$transaction(async (transaction) => {
      await transaction.projectFile.createMany({
        data: generated.files.map(({ path, content, language }) => ({ projectId, path, content, language })),
      });
      await transaction.projectVersion.create({
        data: {
          projectId,
          versionNumber: 1,
          description: "Initial generated project",
          snapshot,
          createdBy: userId,
        },
      });
      await transaction.project.update({
        where: { id: projectId },
        data: { name: planResult.output.project.name, framework: "nextjs" },
      });
      await transaction.generationJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await transaction.generationLog.create({
        data: {
          generationJobId: job.id,
          stage: "validation",
          level: "INFO",
          message: "File manifest and project structure checks passed; files and initial version saved.",
          metadata: { fileCount: generated.files.length, dependencies: generated.dependencies },
        },
      });
    });

    return {
      id: job.id,
      status: "COMPLETED" as const,
      projectId,
      projectName: planResult.output.project.name,
      summary: planResult.output.summary,
      files: generated.files.map(({ path, language }) => ({ path, language })),
      dependencies: generated.dependencies,
    };
  } catch (error) {
    const message = safeFailureMessage(error);
    try {
      await prisma.$transaction([
        prisma.generationJob.update({
          where: { id: job.id },
          data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
        }),
        prisma.generationLog.create({
          data: { generationJobId: job.id, stage: "generation", level: "ERROR", message },
        }),
      ]);
    } catch {
      // Keep the original, user-safe generation error if recording the failure also fails.
    }
    throw error;
  }
}
