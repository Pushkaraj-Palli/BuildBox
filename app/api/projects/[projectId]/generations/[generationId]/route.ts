import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; generationId: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to view this generation.");
    const { projectId, generationId } = await params;
    const generation = await getPrisma().generationJob.findFirst({
      where: { id: generationId, projectId, userId: session.user.id, project: { userId: session.user.id, status: { not: "DELETED" } } },
      select: {
        id: true,
        projectId: true,
        status: true,
        prompt: true,
        attempt: true,
        startedAt: true,
        completedAt: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        logs: { orderBy: { createdAt: "asc" }, select: { id: true, stage: true, level: true, message: true, metadata: true, createdAt: true } },
      },
    });
    if (!generation) throw new ApiError(404, "GENERATION_NOT_FOUND", "Generation was not found.");
    return Response.json({ success: true, data: generation, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
