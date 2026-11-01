import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { AIProviderError } from "@/lib/server/ai/types";
import { parseVersionSnapshot } from "@/lib/server/generation/version-snapshot";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string; versionId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to restore a project version.");
    const { projectId, versionId } = await params;
    const prisma = getPrisma();
    const version = await prisma.projectVersion.findFirst({
      where: { id: versionId, projectId, project: { userId: session.user.id, status: { not: "DELETED" } } },
      select: { id: true, versionNumber: true, snapshot: true },
    });
    if (!version) throw new ApiError(404, "VERSION_NOT_FOUND", "Project version was not found.");
    const files = parseVersionSnapshot(version.snapshot);
    const paths = files.map(({ path }) => path);

    const restored = await prisma.$transaction(async (transaction) => {
      const activeJob = await transaction.generationJob.findFirst({
        where: { projectId, userId: session.user!.id, status: { in: ["PENDING", "PLANNING", "GENERATING", "VALIDATING", "REPAIRING"] } },
        select: { id: true },
      });
      if (activeJob) throw new ApiError(409, "GENERATION_IN_PROGRESS", "Wait for the current project update to finish before restoring a version.");

      const latest = await transaction.projectVersion.findFirst({ where: { projectId }, orderBy: { versionNumber: "desc" }, select: { versionNumber: true } });
      await transaction.projectFile.deleteMany({ where: { projectId, path: { notIn: paths } } });
      for (const file of files) {
        await transaction.projectFile.upsert({
          where: { projectId_path: { projectId, path: file.path } },
          create: { projectId, path: file.path, content: file.content, language: file.language },
          update: { content: file.content, language: file.language, version: { increment: 1 } },
        });
      }
      const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;
      const snapshot = { files, framework: "nextjs" };
      const newVersion = await transaction.projectVersion.create({
        data: {
          projectId,
          versionNumber: nextVersionNumber,
          description: `Restored version ${version.versionNumber}`,
          snapshot,
          createdBy: session.user!.id,
        },
        select: { id: true, versionNumber: true, description: true, createdAt: true },
      });
      await transaction.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
      return newVersion;
    });
    return Response.json({ success: true, data: { ...restored, restoredFrom: version.versionNumber }, requestId });
  } catch (error) {
    if (error instanceof AIProviderError) return errorResponse(new ApiError(error.status, error.code, error.message), requestId);
    return errorResponse(error, requestId);
  }
}
