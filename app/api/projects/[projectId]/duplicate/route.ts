import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to duplicate this project.");
    const { projectId } = await params;
    const prisma = getPrisma();
    const source = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id, status: { not: "DELETED" } },
      include: { files: { select: { path: true, content: true, language: true, version: true } } },
    });
    if (!source) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");

    const duplicate = await prisma.project.create({
      data: {
        userId: session.user.id,
        name: `${source.name} copy`.slice(0, 100),
        description: source.description,
        framework: source.framework,
        files: { create: source.files.map(({ path, content, language, version }) => ({ path, content, language, version })) },
      },
      select: { id: true, name: true, description: true, framework: true, status: true, createdAt: true, updatedAt: true },
    });
    return Response.json({ success: true, data: duplicate, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
