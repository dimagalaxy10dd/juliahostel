import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@julia.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Пользователь уже существует: ${email}`);
    return;
  }
  const password = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: { email, name: "Владелец", password, role: "OWNER" },
  });
  console.log(`Создан владелец: ${email} / пароль: admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
