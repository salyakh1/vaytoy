import { PrismaClient } from "@prisma/client";

/** Один клиент на процесс (важно для Vercel serverless: переиспользование в тёплом контейнере). */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
