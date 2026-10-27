import { auth } from "@/auth";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { AIProviderError } from "@/lib/server/ai/types";
import { recordAIUsage } from "@/lib/server/ai/usage";
import { createApplicationPlan } from "@/lib/server/planning/application-plan";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();

  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to plan this project.");

    const { projectId } = await params;
    const project = await getPrisma().project.findFirst({
      where: { id: projectId, userId: session.user.id, status: { not: "DELETED" } },
      select: { id: true },
    });
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "INVALID_INPUT", "Provide a prompt to plan the project.");
    }
    const prompt = (body as Record<string, unknown>).prompt;
    if (typeof prompt !== "string") throw new ApiError(400, "INVALID_PROMPT", "Provide a project prompt.");

    const result = await createApplicationPlan(prompt);
    await recordAIUsage(result, { userId: session.user.id, projectId: project.id });
    return Response.json({ success: true, data: result.output, requestId });
  } catch (error) {
    if (error instanceof AIProviderError) {
      return errorResponse(new ApiError(error.status, error.code, error.message), requestId);
    }
    return errorResponse(error, requestId);
  }
}
