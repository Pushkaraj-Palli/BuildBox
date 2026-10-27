import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { logger } from "@/lib/server/logger";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

async function getOwnedProject(projectId: string, userId: string) {
  const project = await getPrisma().project.findFirst({
    where: { id: projectId, userId, status: { not: "DELETED" } },
    select: { id: true, name: true, description: true, framework: true, status: true, createdAt: true, updatedAt: true },
  });
  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");
  return project;
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to view this project.");
    const { projectId } = await params;
    const project = await getOwnedProject(projectId, session.user.id);
    return Response.json({ success: true, data: project, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to update this project.");
    const { projectId } = await params;
    await getOwnedProject(projectId, session.user.id);

    let body: unknown;
    try { body = await request.json(); } catch { throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "INVALID_INPUT", "Provide project fields to update.");
    const input = body as Record<string, unknown>;
    const data: { name?: string; description?: string | null; framework?: string | null; status?: "ACTIVE" | "ARCHIVED" } = {};

    if ("name" in input) {
      if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 100) throw new ApiError(400, "INVALID_NAME", "Project name must be between 1 and 100 characters.");
      data.name = input.name.trim();
    }
    if ("description" in input) {
      if (input.description !== null && (typeof input.description !== "string" || input.description.trim().length > 2000)) throw new ApiError(400, "INVALID_DESCRIPTION", "Project description must be 2000 characters or fewer.");
      data.description = typeof input.description === "string" ? input.description.trim() || null : null;
    }
    if ("framework" in input) {
      if (input.framework !== null && (typeof input.framework !== "string" || input.framework.trim().length > 50)) throw new ApiError(400, "INVALID_FRAMEWORK", "Framework must be 50 characters or fewer.");
      data.framework = typeof input.framework === "string" ? input.framework.trim() || null : null;
    }
    if ("status" in input) {
      if (input.status !== "ACTIVE" && input.status !== "ARCHIVED") throw new ApiError(400, "INVALID_STATUS", "Project status must be ACTIVE or ARCHIVED.");
      data.status = input.status;
    }
    if (!Object.keys(data).length) throw new ApiError(400, "EMPTY_UPDATE", "Provide at least one field to update.");

    const project = await getPrisma().project.update({
      where: { id: projectId }, data,
      select: { id: true, name: true, description: true, framework: true, status: true, createdAt: true, updatedAt: true },
    });
    logger.info("projects.updated", { requestId });
    return Response.json({ success: true, data: project, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to delete this project.");
    const { projectId } = await params;
    await getOwnedProject(projectId, session.user.id);
    await getPrisma().project.update({ where: { id: projectId }, data: { status: "DELETED" } });
    logger.info("projects.deleted", { requestId });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
