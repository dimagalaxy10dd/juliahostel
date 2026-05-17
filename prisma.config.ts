import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` грузит этот файл при сборке (в т.ч. на Vercel), но
// строка подключения ему не нужна. Поэтому читаем env напрямую и даём
// безопасный плейсхолдер — иначе сборка падает из-за отсутствия переменной.
// Реальные DIRECT_URL / DATABASE_URL нужны только для миграций (локально).
const migrationUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: migrationUrl },
});
