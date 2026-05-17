import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Миграции выполняются по прямому подключению (DIRECT_URL),
  // приложение в рантайме — по DATABASE_URL (см. src/lib/prisma.ts).
  datasource: { url: env("DIRECT_URL") },
});
