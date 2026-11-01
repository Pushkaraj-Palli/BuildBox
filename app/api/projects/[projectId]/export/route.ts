import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { parseVersionSnapshot } from "@/lib/server/generation/version-snapshot";
import { createZipArchive } from "@/lib/server/export/zip";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

function archiveName(projectName: string): string {
  const slug = projectName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  return `${slug || "buildbox-project"}.zip`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to export this project.");
    const { projectId } = await params;
    const project = await getPrisma().project.findFirst({
      where: { id: projectId, userId: session.user.id, status: { not: "DELETED" } },
      select: { name: true, files: { select: { path: true, content: true, language: true }, orderBy: { path: "asc" } } },
    });
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    if (!project.files.length) throw new ApiError(409, "PROJECT_NOT_GENERATED", "Generate project files before exporting this project.");

    const files = parseVersionSnapshot({ files: project.files, framework: "nextjs" });
    const archive = createZipArchive(files);
    return new Response(new Uint8Array(archive), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archiveName(project.name)}"`,
        "Content-Length": String(archive.length),
        "Cache-Control": "private, no-store",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
