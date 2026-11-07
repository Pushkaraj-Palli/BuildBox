import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { AIProviderError } from "@/lib/server/ai/types";
import { getPrisma } from "@/lib/server/prisma";
import { getProjectPreview, startProjectPreview, stopProjectPreview } from "@/lib/server/sandbox/preview";
import { SandboxError } from "@/lib/server/sandbox/run-build";

export const runtime = "nodejs";
export const maxDuration = 45;

function previewErrorResponse(error: unknown, requestId: string) {
  if (error instanceof SandboxError || error instanceof AIProviderError) {
    return errorResponse(new ApiError(error.status, error.code, error.message), requestId);
  }
  return errorResponse(error, requestId);
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to view this project preview.");
    const { projectId } = await params;
    const project = await getPrisma().project.findFirst({ where: { id: projectId, userId: session.user.id, status: { not: "DELETED" } }, select: { id: true } });
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    return Response.json({ success: true, data: getProjectPreview(projectId), requestId });
  } catch (error) { return previewErrorResponse(error, requestId); }
}

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to start this project preview.");
    const { projectId } = await params;
    const project = await getPrisma().project.findFirst({
      where: { id: projectId, userId: session.user.id, status: { not: "DELETED" } },
      select: { id: true, files: { select: { path: true, content: true, language: true }, orderBy: { path: "asc" } } },
    });
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    if (!project.files.length) throw new ApiError(409, "PROJECT_NOT_GENERATED", "Generate project files before starting a preview.");
    const data = await startProjectPreview(projectId, project.files);
    return Response.json({ success: true, data, requestId });
  } catch (error) { return previewErrorResponse(error, requestId); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to stop this project preview.");
    const { projectId } = await params;
    const project = await getPrisma().project.findFirst({ where: { id: projectId, userId: session.user.id, status: { not: "DELETED" } }, select: { id: true } });
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    await stopProjectPreview(projectId);
    return Response.json({ success: true, data: null, requestId });
  } catch (error) { return errorResponse(error, requestId); }
}
