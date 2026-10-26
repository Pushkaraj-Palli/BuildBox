import { getPrisma } from "@/lib/server/prisma";
import { logger } from "@/lib/server/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({ status: "ready", database: "connected" });
  } catch {
    logger.error("health.database_unavailable", { code: "DATABASE_UNAVAILABLE" });

    return Response.json(
      {
        status: "not_ready",
        database: "unavailable",
      },
      { status: 503 },
    );
  }
}
