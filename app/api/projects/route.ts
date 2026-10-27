import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { logger } from "@/lib/server/logger";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to view your projects.");

    const projects = await getPrisma().project.findMany({
      where: { userId: session.user.id, status: { not: "DELETED" } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, description: true, framework: true, status: true, createdAt: true, updatedAt: true },
    });

    return Response.json({ success: true, data: projects, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to create a project.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "INVALID_INPUT", "Provide a project name and optional description.");
    }

    const input = body as Record<string, unknown>;
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const description = typeof input.description === "string" ? input.description.trim() : null;
    const framework = typeof input.framework === "string" ? input.framework.trim() : null;

    if (!name || name.length > 100) throw new ApiError(400, "INVALID_NAME", "Project name must be between 1 and 100 characters.");
    if (description && description.length > 2000) throw new ApiError(400, "INVALID_DESCRIPTION", "Project description must be 2000 characters or fewer.");
    if (framework && framework.length > 50) throw new ApiError(400, "INVALID_FRAMEWORK", "Framework must be 50 characters or fewer.");

    const project = await getPrisma().project.create({
      data: { userId: session.user.id, name, description, framework: framework || null },
      select: { id: true, name: true, description: true, framework: true, status: true, createdAt: true, updatedAt: true },
    });
    logger.info("projects.created", { requestId });

    return Response.json({ success: true, data: project, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
