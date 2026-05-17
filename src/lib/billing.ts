import { differenceInCalendarDays } from "date-fns";

export type RateType = "DAILY" | "WEEKLY" | "MONTHLY";

export const RATE_LABELS: Record<RateType, string> = {
  DAILY: "Посуточно",
  WEEKLY: "Понедельно",
  MONTHLY: "Помесячно",
};

// Количество дней проживания. dateTo — день выезда (не включается).
export function stayDays(from: Date, to: Date): number {
  return Math.max(0, differenceInCalendarDays(to, from));
}

type Prices = {
  priceDaily: number;
  priceWeekly: number;
  priceMonthly: number;
};

// Рекомендуемая сумма к оплате — пропорционально дням по выбранному тарифу.
export function suggestAmount(
  rateType: RateType,
  days: number,
  prices: Prices,
): number {
  if (days <= 0) return 0;
  let raw = 0;
  if (rateType === "DAILY") raw = days * prices.priceDaily;
  else if (rateType === "WEEKLY") raw = (days / 7) * prices.priceWeekly;
  else if (rateType === "MONTHLY") raw = (days / 30) * prices.priceMonthly;
  return Math.round(raw);
}

// Состояние проживания для подсветки и предупреждений.
// overdue — срок проживания истёк; unpaid — есть долг; paid — всё в порядке.
export type PayState = "paid" | "unpaid" | "overdue";

export function payState(
  balance: number,
  dateTo: string,
  today: string,
): PayState {
  if (dateTo <= today) return "overdue";
  if (balance > 0) return "unpaid";
  return "paid";
}

// Сколько дней проживания покрыто оплатой.
// Оплата пропорциональна согласованной сумме: оплачено половину — покрыта
// половина дней. Если сумма не задана (0) — считаем всё оплаченным.
export function paidThroughDays(
  paidTotal: number,
  agreedAmount: number,
  totalDays: number,
): number {
  if (totalDays <= 0) return 0;
  if (agreedAmount <= 0) return totalDays;
  const fraction = Math.min(1, Math.max(0, paidTotal / agreedAmount));
  return Math.round(fraction * totalDays);
}
