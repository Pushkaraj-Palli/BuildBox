import { logger } from "@/lib/server/logger";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof ApiError) {
    return Response.json(
      {
        success: false,
        error: { code: error.code, message: error.message },
        requestId,
      },
      { status: error.status },
    );
  }

  logger.error("api.unhandled_error", { requestId, code: "INTERNAL_SERVER_ERROR" });

  return Response.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
      requestId,
    },
    { status: 500 },
  );
}
