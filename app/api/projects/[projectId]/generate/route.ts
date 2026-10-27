import { auth } from "@/auth";
import { after } from "next/server";
import { ApiError, errorResponse } from "@/lib/server/api-error";
import { AIProviderError } from "@/lib/server/ai/types";
import { logger } from "@/lib/server/logger";
import { generateProject, startProjectGeneration } from "@/lib/server/generation/generate-project";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const requestId = crypto.randomUUID();

  try {
    const session = await auth();
    if (!session?.user?.id) throw new ApiError(401, "UNAUTHORIZED", "Sign in to generate this project.");

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 20_000) throw new ApiError(413, "REQUEST_TOO_LARGE", "Generation request is too large.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "INVALID_INPUT", "Provide a prompt to generate the project.");
    }
    const prompt = (body as Record<string, unknown>).prompt;
    if (typeof prompt !== "string") throw new ApiError(400, "INVALID_PROMPT", "Provide a project prompt.");

    const { projectId } = await params;
    const job = await startProjectGeneration({ projectId, userId: session.user.id, prompt });
    after(async () => {
      try {
        await generateProject({ projectId, userId: session.user.id, prompt, generationJobId: job.id });
      } catch (error) {
        logger.error("generation.background_failed", {
          requestId,
          code: error instanceof AIProviderError ? error.code : "UNKNOWN_ERROR",
          message: error instanceof AIProviderError ? error.message.slice(0, 400) : "Generation failed with an unexpected server error.",
        });
      }
    });
    return Response.json({ success: true, data: job, requestId }, { status: 202 });
  } catch (error) {
    if (error instanceof AIProviderError) {
      return errorResponse(new ApiError(error.status, error.code, error.message), requestId);
    }
    return errorResponse(error, requestId);
  }
}
