import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrisma>;
};

// На Supabase порт 5432 — session pooler (лимит 15 клиентов, не для
// serverless). Порт 6543 — transaction pooler, рассчитан на множество
// подключений. Для рантайма используем transaction pooler.
function runtimeConnectionString(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (url.includes("pooler.supabase.com")) {
    return url.replace(":5432/", ":6543/");
  }
  return url;
}

// Кратковременные сбои подключения к базе (оборвалось соединение,
// таймаут и т.п.). В serverless такое случается, когда пул держит
// соединение, а оно успело «умереть». Такие ошибки безопасно повторить.
function isTransientDbError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /ECONNRESET|ETIMEDOUT|EPIPE|Connection terminated|Connection ended|connection closed|server closed the connection|Closed the connection|EMAXCONNSESSION|Timed out|timeout exceeded|socket hang up|too many connections/i.test(
    msg,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPrisma() {
  const pool = new Pool({
    connectionString: runtimeConnectionString(),
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  });
  // Без обработчика 'error' падение простаивающего соединения вызывает
  // необработанное событие и крах serverless-функции.
  pool.on("error", (err) => {
    console.error("pg pool error:", err.message);
  });

  const base = new PrismaClient({ adapter: new PrismaPg(pool) });

  // Автоповтор при кратковременных сбоях подключения, чтобы пользователь
  // не видел случайных ошибок «A server error occurred».
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            return await query(args);
          } catch (error) {
            lastError = error;
            if (!isTransientDbError(error)) throw error;
            await sleep(120 * (attempt + 1));
          }
        }
        throw lastError;
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
