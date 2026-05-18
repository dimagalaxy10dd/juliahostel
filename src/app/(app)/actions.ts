"use server";

import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/types";
import { credentialsSchema } from "@/lib/validation";

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

// Смена логина (email) и пароля. Требует текущий пароль. Данные пишутся
// только в базу (пароль — в виде bcrypt-хэша), в коде их нет.
export async function changeCredentials(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Требуется вход в систему" };

  const get = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  const parsed = credentialsSchema.safeParse({
    currentPassword: get("currentPassword"),
    email: get("email"),
    newPassword: get("newPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Пользователь не найден" };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) return { ok: false, error: "Неверный текущий пароль" };

  const emailTaken = await prisma.user.findFirst({
    where: { email: parsed.data.email, id: { not: user.id } },
  });
  if (emailTaken) return { ok: false, error: "Этот email уже занят" };

  const data: { email: string; password?: string } = {
    email: parsed.data.email,
  };
  if (parsed.data.newPassword) {
    data.password = await bcrypt.hash(parsed.data.newPassword, 10);
  }
  await prisma.user.update({ where: { id: user.id }, data });
  return { ok: true };
}
