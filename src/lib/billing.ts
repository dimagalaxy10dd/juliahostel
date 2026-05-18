import { differenceInCalendarDays } from "date-fns";

export type RateType = "DAILY" | "MONTHLY";

export const RATE_LABELS: Record<RateType, string> = {
  DAILY: "Посуточно",
  MONTHLY: "Помесячно",
};

// Количество ночей проживания. dateTo — день выезда (не оплачивается).
export function stayDays(from: Date, to: Date): number {
  return Math.max(0, differenceInCalendarDays(to, from));
}

type Prices = {
  priceDaily: number;
  priceMonthly: number;
};

function isLastDayOfMonth(d: Date): boolean {
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1),
  );
  return next.getUTCMonth() !== d.getUTCMonth();
}

// Дата, до которой длится один «месяц аренды», начатый датой d (аналог
// dateTo — следующий день после последнего дня месяца проживания).
// Месяц = до того же числа следующего месяца. Если d — последний день
// месяца, месяц аренды покрывает весь следующий календарный месяц.
function rentMonthEnd(d: Date): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (isLastDayOfMonth(d)) {
    return new Date(Date.UTC(y, m + 2, 1));
  }
  return new Date(Date.UTC(y, m + 1, d.getUTCDate()));
}

// Стоимость по месячному тарифу для диапазона [from, toExcl): каждый
// полный месяц аренды стоит ровно priceMonthly (независимо от того,
// 28, 30 или 31 день в месяце), неполный остаток — пропорционально.
function monthlyCost(from: Date, toExcl: Date, priceMonthly: number): number {
  let cursor = from;
  let months = 0;
  for (let guard = 0; guard < 600; guard += 1) {
    const next = rentMonthEnd(cursor);
    if (next.getTime() <= toExcl.getTime()) {
      months += 1;
      cursor = next;
    } else {
      break;
    }
  }
  let raw = months * priceMonthly;
  const leftover = stayDays(cursor, toExcl);
  if (leftover > 0) {
    const monthLen = stayDays(cursor, rentMonthEnd(cursor));
    raw += (leftover / monthLen) * priceMonthly;
  }
  return raw;
}

// Рекомендуемая сумма к оплате за период [from, toExcl) по тарифу.
// Тариф «посуточно» — цена за одну ночь, поэтому считаем ночи.
export function suggestAmount(
  rateType: RateType,
  from: Date,
  toExcl: Date,
  prices: Prices,
): number {
  const nights = stayDays(from, toExcl);
  if (nights <= 0) return 0;
  if (rateType === "DAILY") return Math.round(nights * prices.priceDaily);
  return Math.round(monthlyCost(from, toExcl, prices.priceMonthly));
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
