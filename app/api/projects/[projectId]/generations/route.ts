import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to view project generations.");
    const { projectId } = await params;
    const project = await getPrisma().project.findFirst({
      where: { id: projectId, userId: session.user.id, status: { not: "DELETED" } },
      select: { id: true },
    });
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");

    const generations = await getPrisma().generationJob.findMany({
      where: { projectId, userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, prompt: true, status: true, attempt: true, createdAt: true, updatedAt: true, startedAt: true, completedAt: true, errorMessage: true },
    });
    return Response.json({ success: true, data: generations, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
