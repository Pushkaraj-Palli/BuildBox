import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { AIProviderError } from "@/lib/server/ai/types";
import { logger } from "@/lib/server/logger";
import { getPrisma } from "@/lib/server/prisma";
import { runSandboxBuild, SandboxError } from "@/lib/server/sandbox/run-build";

export const runtime = "nodejs";
export const maxDuration = 150;

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

    logger.info("sandbox.build_started", { requestId, projectId });
    const result = await runSandboxBuild(project.files);
    logger.info("sandbox.build_completed", { requestId, projectId, stage: result.status, durationMs: result.durationMs });
    return Response.json({ success: true, data: result, requestId });
  } catch (error) {
    if (error instanceof SandboxError || error instanceof AIProviderError) {
      return errorResponse(new ApiError(error.status, error.code, error.message), requestId);
    }
    return errorResponse(error, requestId);
  }
}
