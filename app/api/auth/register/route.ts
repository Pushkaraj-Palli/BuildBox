import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { errorResponse } from "@/lib/server/api-error";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

type RegistrationBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

function isRecord(value: unknown): value is RegistrationBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function getExpectedOrigin(request: Request): string {
  const configuredAuthUrl = process.env.AUTH_URL?.trim();
  if (configuredAuthUrl) {
    try { return new URL(configuredAuthUrl).origin; } catch { /* Fall back to trusted proxy headers. */ }
  }

  // Render terminates TLS at its proxy, so request.url can contain the
  // internal service URL (for example localhost:10000). Compare Origin with
  // the public URL forwarded by the platform instead.
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  if (forwardedHost && forwardedProto && ["http", "https"].includes(forwardedProto)) {
    try { return new URL(`${forwardedProto}://${forwardedHost}`).origin; } catch { /* Use the request origin below. */ }
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const requestId = randomUUID();

  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== getExpectedOrigin(request)) {
      return Response.json(
        { success: false, error: { code: "INVALID_ORIGIN", message: "Request origin is not allowed." }, requestId },
        { status: 403 },
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 4096) {
      return Response.json(
        { success: false, error: { code: "REQUEST_TOO_LARGE", message: "Request is too large." }, requestId },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: { code: "INVALID_JSON", message: "Request body must be valid JSON." }, requestId },
        { status: 400 },
      );
    }

    if (!isRecord(body)) {
      return Response.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Registration details are invalid." }, requestId },
        { status: 400 },
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Enter a valid name and email address." }, requestId },
        { status: 400 },
      );
    }

    const passwordBytes = Buffer.byteLength(password, "utf8");
    if (password.length < 8 || !/\d/.test(password) || passwordBytes > 72) {
      return Response.json(
        { success: false, error: { code: "INVALID_PASSWORD", message: "Password must be at least 8 characters, include a number, and not exceed 72 UTF-8 bytes." }, requestId },
        { status: 400 },
      );
    }

    const passwordHash = await hash(password, 12);
    const user = await getPrisma().user.create({
      data: { name: name || null, email, passwordHash },
      select: { id: true, name: true, email: true },
    });

    return Response.json({ success: true, data: user, requestId }, { status: 201 });
  } catch (error) {
    if (hasUniqueConstraintError(error)) {
      return Response.json(
        { success: false, error: { code: "ACCOUNT_UNAVAILABLE", message: "An account with that email may already exist. Try logging in." }, requestId },
        { status: 409 },
      );
    }

    return errorResponse(error, requestId);
  }
}
