import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrl } from "@/lib/server/env";

const globalForPrisma = globalThis as typeof globalThis & {
  buildBoxPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.buildBoxPrisma) {
    globalForPrisma.buildBoxPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
    });
  }

  return globalForPrisma.buildBoxPrisma;
}
