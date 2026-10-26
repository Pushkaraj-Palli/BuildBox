import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running the database seed.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    await prisma.$connect();
    console.info("Database seed completed. No development accounts or sample data are created by default.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error("Database seed failed.");
  process.exitCode = 1;
});
