import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Создаёт первого владельца. Логин и пароль берутся ТОЛЬКО из переменных
// окружения (.env) — в коде их нет. Дальше логин/пароль меняются в самом
// приложении и хранятся (в виде хэша) лишь в базе данных.
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const rawPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !rawPassword) {
    console.error(
      "Задайте SEED_ADMIN_EMAIL и SEED_ADMIN_PASSWORD в .env, затем запустите снова.",
    );
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Пользователь уже существует: ${email}`);
    return;
  }

  const password = await bcrypt.hash(rawPassword, 10);
  await prisma.user.create({
    data: { email, name: "Владелец", password, role: "OWNER" },
  });
  console.log(`Создан владелец: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
