import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to view version history.");
    const { projectId } = await params;
    const prisma = getPrisma();
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id, status: { not: "DELETED" } },
      select: { id: true },
    });
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");

    const versions = await prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: "desc" },
      take: 50,
      select: { id: true, versionNumber: true, description: true, snapshot: true, createdAt: true },
    });
    const data = versions.map((version) => {
      const snapshotFiles = version.snapshot && typeof version.snapshot === "object" && !Array.isArray(version.snapshot) &&
        Array.isArray((version.snapshot as { files?: unknown }).files)
        ? (version.snapshot as { files: unknown[] }).files
        : [];
      const files = snapshotFiles.flatMap((file) =>
        file && typeof file === "object" && !Array.isArray(file) && typeof (file as { path?: unknown }).path === "string"
          ? [(file as { path: string }).path]
          : [],
      ).slice(0, 30);
      return { id: version.id, versionNumber: version.versionNumber, description: version.description, createdAt: version.createdAt, files };
    });
    return Response.json({ success: true, data, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
