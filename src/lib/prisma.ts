import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// На Supabase порт 5432 — session pooler: он держит не больше 15 клиентов
// и не рассчитан на serverless (каждый экземпляр функции Vercel держит
// свои подключения → лимит быстро исчерпывается → EMAXCONNSESSION).
// Порт 6543 — transaction pooler: он мультиплексирует подключения и
// рассчитан на множество одновременных клиентов. Для рантайма используем
// именно его. Миграции (prisma.config.ts) остаются на 5432.
function runtimeConnectionString(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (url.includes("pooler.supabase.com")) {
    return url.replace(":5432/", ":6543/");
  }
  return url;
}

function createPrisma() {
  const adapter = new PrismaPg({
    connectionString: runtimeConnectionString(),
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
