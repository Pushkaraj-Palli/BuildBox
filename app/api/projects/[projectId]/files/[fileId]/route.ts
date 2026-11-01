import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { parseVersionSnapshot } from "@/lib/server/generation/version-snapshot";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 200_000;

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string; fileId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to edit project files.");
    const { projectId, fileId } = await params;
    const prisma = getPrisma();
    const file = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId, project: { userId: session.user.id, status: { not: "DELETED" } } },
      select: { id: true },
    });
    if (!file) throw new ApiError(404, "FILE_NOT_FOUND", "Project file was not found.");

    let body: unknown;
    try { body = await request.json(); } catch { throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON."); }
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as Record<string, unknown>).content !== "string") {
      throw new ApiError(400, "INVALID_CONTENT", "Provide file content as text.");
    }
    const content = (body as { content: string }).content;
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
      throw new ApiError(413, "FILE_TOO_LARGE", "A project file cannot exceed 200 KB.");
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const savedFile = await transaction.projectFile.update({
        where: { id: fileId },
        data: { content, version: { increment: 1 } },
        select: { id: true, path: true, content: true, language: true, version: true, updatedAt: true },
      });
      await transaction.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
      const currentFiles = await transaction.projectFile.findMany({
        where: { projectId },
        select: { path: true, content: true, language: true },
        orderBy: { path: "asc" },
      });
      const snapshotFiles = parseVersionSnapshot({ files: currentFiles, framework: "nextjs" });
      const latest = await transaction.projectVersion.findFirst({ where: { projectId }, orderBy: { versionNumber: "desc" }, select: { versionNumber: true } });
      await transaction.projectVersion.create({
        data: {
          projectId,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          description: `Edited ${savedFile.path}`,
          snapshot: { files: snapshotFiles, framework: "nextjs" },
          createdBy: session.user.id,
        },
      });
      return savedFile;
    });
    return Response.json({ success: true, data: updated, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
