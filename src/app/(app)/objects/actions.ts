"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult, ReceiptResult } from "@/lib/types";
import {
  bedSchema,
  buildingSchema,
  checkoutSchema,
  expenseCategorySchema,
  expenseSchema,
  extendSchema,
  paymentSchema,
  propertySchema,
  residentSchema,
  roomSchema,
  staySchema,
} from "@/lib/validation";
import { stayDays, suggestAmount } from "@/lib/billing";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Требуется вход в систему");
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

// --- Объект ---

export async function createProperty(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = propertySchema.safeParse({
    name: str(formData, "name"),
    address: str(formData, "address") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  await prisma.property.create({
    data: { name: parsed.data.name, address: parsed.data.address ?? null },
  });
  revalidatePath("/objects");
  return { ok: true };
}

export async function deleteProperty(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.property.delete({ where: { id: str(formData, "id") } });
  revalidatePath("/objects");
}

// --- Помещение ---

export async function createBuilding(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = buildingSchema.safeParse({ name: str(formData, "name") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const propertyId = str(formData, "propertyId");
  const count = await prisma.building.count({ where: { propertyId } });
  await prisma.building.create({
    data: { name: parsed.data.name, propertyId, sortOrder: count },
  });
  revalidatePath(`/objects/${propertyId}`);
  return { ok: true };
}

export async function deleteBuilding(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.building.delete({ where: { id: str(formData, "id") } });
  revalidatePath(`/objects/${str(formData, "propertyId")}`);
}

// --- Комната ---

export async function createRoom(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = roomSchema.safeParse({ name: str(formData, "name") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const buildingId = str(formData, "buildingId");
  const count = await prisma.room.count({ where: { buildingId } });
  await prisma.room.create({
    data: { name: parsed.data.name, buildingId, sortOrder: count },
  });
  revalidatePath(`/objects/${str(formData, "propertyId")}`);
  return { ok: true };
}

export async function deleteRoom(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.room.delete({ where: { id: str(formData, "id") } });
  revalidatePath(`/objects/${str(formData, "propertyId")}`);
}

// --- Место (кровать) ---

export async function createBed(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = bedSchema.safeParse({
    label: str(formData, "label"),
    priceDaily: str(formData, "priceDaily"),
    priceWeekly: str(formData, "priceWeekly"),
    priceMonthly: str(formData, "priceMonthly"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const roomId = str(formData, "roomId");
  const count = await prisma.bed.count({ where: { roomId } });
  await prisma.bed.create({
    data: {
      label: parsed.data.label,
      roomId,
      sortOrder: count,
      priceDaily: parsed.data.priceDaily,
      priceWeekly: parsed.data.priceWeekly,
      priceMonthly: parsed.data.priceMonthly,
    },
  });
  revalidatePath(`/objects/${str(formData, "propertyId")}`);
  return { ok: true };
}

export async function updateBed(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = bedSchema.safeParse({
    label: str(formData, "label"),
    priceDaily: str(formData, "priceDaily"),
    priceWeekly: str(formData, "priceWeekly"),
    priceMonthly: str(formData, "priceMonthly"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  await prisma.bed.update({
    where: { id: str(formData, "id") },
    data: {
      label: parsed.data.label,
      priceDaily: parsed.data.priceDaily,
      priceWeekly: parsed.data.priceWeekly,
      priceMonthly: parsed.data.priceMonthly,
    },
  });
  revalidatePath(`/objects/${str(formData, "propertyId")}`);
  return { ok: true };
}

export async function deleteBed(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.bed.delete({ where: { id: str(formData, "id") } });
  revalidatePath(`/objects/${str(formData, "propertyId")}`);
}

// --- Жилец ---

export async function createResident(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = residentSchema.safeParse({
    fullName: str(formData, "fullName"),
    phone: str(formData, "phone") || undefined,
    note: str(formData, "note") || undefined,
    needsInvoice: str(formData, "needsInvoice"),
    nip: str(formData, "nip") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const propertyId = str(formData, "propertyId");
  await prisma.resident.create({
    data: {
      propertyId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
      note: parsed.data.note ?? null,
      needsInvoice: parsed.data.needsInvoice,
      nip: parsed.data.nip ?? null,
    },
  });
  revalidatePath(`/objects/${propertyId}/residents`);
  return { ok: true };
}

export async function updateResident(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = residentSchema.safeParse({
    fullName: str(formData, "fullName"),
    phone: str(formData, "phone") || undefined,
    note: str(formData, "note") || undefined,
    needsInvoice: str(formData, "needsInvoice"),
    nip: str(formData, "nip") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  await prisma.resident.update({
    where: { id: str(formData, "id") },
    data: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
      note: parsed.data.note ?? null,
      needsInvoice: parsed.data.needsInvoice,
      nip: parsed.data.nip ?? null,
    },
  });
  revalidatePath(`/objects/${str(formData, "propertyId")}/residents`);
  return { ok: true };
}

export async function deleteResident(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.resident.delete({ where: { id: str(formData, "id") } });
  revalidatePath(`/objects/${str(formData, "propertyId")}/residents`);
}

// --- Проживание (заселение) ---

export async function createStay(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = staySchema.safeParse({
    bedId: str(formData, "bedId"),
    residentName: str(formData, "residentName"),
    dateFrom: str(formData, "dateFrom"),
    dateTo: str(formData, "dateTo"),
    rateType: str(formData, "rateType"),
    received: str(formData, "received"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const propertyId = str(formData, "propertyId");
  const { bedId, residentName, rateType, received } = parsed.data;
  const from = new Date(parsed.data.dateFrom);
  const to = new Date(parsed.data.dateTo);

  const overlap = await prisma.stay.findFirst({
    where: { bedId, dateFrom: { lt: to }, dateTo: { gt: from } },
  });
  if (overlap) {
    return {
      ok: false,
      error: "На это место уже есть заселение в выбранные даты",
    };
  }

  const bed = await prisma.bed.findUnique({ where: { id: bedId } });
  if (!bed) return { ok: false, error: "Место не найдено" };
  const agreedAmount = suggestAmount(rateType, stayDays(from, to), {
    priceDaily: Number(bed.priceDaily),
    priceWeekly: Number(bed.priceWeekly),
    priceMonthly: Number(bed.priceMonthly),
  });

  let resident = await prisma.resident.findFirst({
    where: { propertyId, fullName: residentName },
  });
  if (!resident) {
    resident = await prisma.resident.create({
      data: {
        propertyId,
        fullName: residentName,
        needsInvoice: str(formData, "needsInvoice") === "on",
        nip: str(formData, "nip").trim() || null,
      },
    });
  }

  const stay = await prisma.stay.create({
    data: {
      bedId,
      residentId: resident.id,
      dateFrom: from,
      dateTo: to,
      rateType,
      agreedAmount,
      status: "ACTIVE",
    },
  });
  if (received > 0) {
    await prisma.payment.create({ data: { stayId: stay.id, amount: received } });
  }
  revalidatePath(`/objects/${propertyId}`);
  return { ok: true };
}

export async function deleteStay(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.stay.delete({ where: { id: str(formData, "id") } });
  revalidatePath(`/objects/${str(formData, "propertyId")}`);
  revalidatePath("/");
}

// --- Оплата, продление, выселение ---

export async function recordPayment(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = paymentSchema.safeParse({ amount: str(formData, "amount") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  await prisma.payment.create({
    data: { stayId: str(formData, "stayId"), amount: parsed.data.amount },
  });
  revalidatePath(`/objects/${str(formData, "propertyId")}`);
  revalidatePath("/");
  return { ok: true };
}

export async function extendStay(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = extendSchema.safeParse({
    newDateTo: str(formData, "newDateTo"),
    rateType: str(formData, "rateType"),
    received: str(formData, "received"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const stayId = str(formData, "stayId");
  const propertyId = str(formData, "propertyId");
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    include: { bed: true },
  });
  if (!stay) return { ok: false, error: "Заселение не найдено" };

  const newTo = new Date(parsed.data.newDateTo);
  if (newTo <= stay.dateTo) {
    return {
      ok: false,
      error: "Новая дата выезда должна быть позже текущей",
    };
  }

  const overlap = await prisma.stay.findFirst({
    where: {
      bedId: stay.bedId,
      id: { not: stayId },
      dateFrom: { lt: newTo },
      dateTo: { gt: stay.dateFrom },
    },
  });
  if (overlap) {
    return { ok: false, error: "Продление пересекается с другим заселением" };
  }

  const extCost = suggestAmount(
    parsed.data.rateType,
    stayDays(stay.dateTo, newTo),
    {
      priceDaily: Number(stay.bed.priceDaily),
      priceWeekly: Number(stay.bed.priceWeekly),
      priceMonthly: Number(stay.bed.priceMonthly),
    },
  );

  await prisma.stay.update({
    where: { id: stayId },
    data: {
      dateTo: newTo,
      status: "ACTIVE",
      rateType: parsed.data.rateType,
      agreedAmount: { increment: extCost },
    },
  });
  if (parsed.data.received > 0) {
    await prisma.payment.create({
      data: { stayId, amount: parsed.data.received, note: "Продление" },
    });
  }
  revalidatePath(`/objects/${propertyId}`);
  revalidatePath("/");
  return { ok: true };
}

// Ранний выезд: укорачиваем срок, пересчитываем стоимость по выбранному
// тарифу и считаем сумму к возврату (если жилец переплатил).
export async function checkoutStay(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = checkoutSchema.safeParse({
    actualDateTo: str(formData, "actualDateTo"),
    refundRateType: str(formData, "refundRateType"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const stayId = str(formData, "stayId");
  const propertyId = str(formData, "propertyId");
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    include: { bed: true, payments: true },
  });
  if (!stay) return { ok: false, error: "Заселение не найдено" };

  const actualTo = new Date(parsed.data.actualDateTo);
  if (actualTo <= stay.dateFrom) {
    return { ok: false, error: "Дата выезда должна быть позже даты заезда" };
  }

  const actualDays = stayDays(stay.dateFrom, actualTo);
  const owed = suggestAmount(parsed.data.refundRateType, actualDays, {
    priceDaily: Number(stay.bed.priceDaily),
    priceWeekly: Number(stay.bed.priceWeekly),
    priceMonthly: Number(stay.bed.priceMonthly),
  });
  const paidTotal = stay.payments.reduce((n, p) => n + Number(p.amount), 0);
  const refund = paidTotal - owed;
  const doRefund = str(formData, "withRefund") === "on" && refund > 0;

  await prisma.stay.update({
    where: { id: stayId },
    data: {
      dateTo: actualTo,
      status: "ENDED",
      agreedAmount: owed,
      refundAmount: doRefund ? refund : null,
      refundedAt: doRefund ? new Date() : null,
    },
  });
  // Возврат выдаётся сразу при выселении — фиксируем как отрицательную оплату.
  if (doRefund) {
    await prisma.payment.create({
      data: { stayId, amount: -refund, note: "Возврат при раннем выезде" },
    });
  }
  revalidatePath(`/objects/${propertyId}`);
  revalidatePath("/");
  return { ok: true };
}

// --- Категории затрат ---

export async function createExpenseCategory(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = expenseCategorySchema.safeParse({
    name: str(formData, "name"),
    fixedAmount: str(formData, "fixedAmount") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const propertyId = str(formData, "propertyId");
  await prisma.expenseCategory.create({
    data: {
      propertyId,
      name: parsed.data.name,
      fixedAmount: parsed.data.fixedAmount ?? null,
      isFixed: parsed.data.fixedAmount != null,
    },
  });
  revalidatePath(`/objects/${propertyId}/structure`);
  return { ok: true };
}

export async function updateExpenseCategory(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = expenseCategorySchema.safeParse({
    name: str(formData, "name"),
    fixedAmount: str(formData, "fixedAmount") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  await prisma.expenseCategory.update({
    where: { id: str(formData, "id") },
    data: {
      name: parsed.data.name,
      fixedAmount: parsed.data.fixedAmount ?? null,
      isFixed: parsed.data.fixedAmount != null,
    },
  });
  revalidatePath(`/objects/${str(formData, "propertyId")}/structure`);
  return { ok: true };
}

export async function deleteExpenseCategory(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.expenseCategory.delete({ where: { id: str(formData, "id") } });
  revalidatePath(`/objects/${str(formData, "propertyId")}/structure`);
}

// --- Затраты ---

export async function createExpense(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireAuth();
  const parsed = expenseSchema.safeParse({
    categoryId: str(formData, "categoryId") || undefined,
    amount: str(formData, "amount"),
    spentOn: str(formData, "spentOn"),
    note: str(formData, "note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const propertyId = str(formData, "propertyId");
  await prisma.expense.create({
    data: {
      propertyId,
      categoryId: parsed.data.categoryId || null,
      amount: parsed.data.amount,
      spentOn: new Date(parsed.data.spentOn),
      note: parsed.data.note ?? null,
      photoUrl: str(formData, "photoUrl") || null,
      source: str(formData, "source") === "AI" ? "AI" : "MANUAL",
    },
  });
  revalidatePath(`/objects/${propertyId}/finances`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteExpense(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.expense.delete({ where: { id: str(formData, "id") } });
  revalidatePath(`/objects/${str(formData, "propertyId")}/finances`);
  revalidatePath("/");
}

// --- AI-анализ фото чека (Claude API) ---

const RECEIPT_MEDIA: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> =
  {
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    "image/gif": "image/gif",
  };

export async function analyzeReceipt(
  formData: FormData,
): Promise<ReceiptResult> {
  await requireAuth();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "AI не настроен: добавьте ключ ANTHROPIC_API_KEY в файл .env",
    };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Выберите фото чека" };
  }
  const mediaType = RECEIPT_MEDIA[file.type];
  if (!mediaType) {
    return { ok: false, error: "Поддерживаются только фото: JPG, PNG, WEBP" };
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Сохраняем фото в public/uploads
  const ext = mediaType === "image/jpeg" ? "jpg" : mediaType.split("/")[1];
  const fileName = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), bytes);
  const photoUrl = `/uploads/${fileName}`;

  const categories = (str(formData, "categories") || "")
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);

  const prompt = `На фото — чек, квитанция или счёт за расходы хостела (коммунальные услуги, покупки, ремонт и т.п.).
Определи:
- amount: итоговую сумму к оплате, только число (без валюты);
- note: краткое описание на русском, 1–4 слова (например «Электроэнергия» или «Вывоз мусора»);
- category: наиболее подходящую категорию строго из этого списка: ${
    categories.length ? categories.join(", ") : "(список пуст)"
  }. Если ничего не подходит или список пуст — верни пустую строку.
Ответь ТОЛЬКО валидным JSON без пояснений и без markdown: {"amount": число, "note": "строка", "category": "строка"}`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: bytes.toString("base64") },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "AI не смог обработать фото" };
    }
    const cleaned = textBlock.text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const data = JSON.parse(cleaned) as {
      amount?: number;
      note?: string;
      category?: string;
    };
    return {
      ok: true,
      amount: Number(data.amount) || 0,
      note: typeof data.note === "string" ? data.note : "",
      categoryName: typeof data.category === "string" ? data.category : "",
      photoUrl,
    };
  } catch {
    return {
      ok: false,
      error: "Не удалось распознать чек. Введите данные вручную.",
    };
  }
}
