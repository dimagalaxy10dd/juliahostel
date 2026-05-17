// Валюта. Поменять здесь, если нужна другая.
export const CURRENCY = "zł";

export function formatMoney(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toLocaleString("ru-RU")} ${CURRENCY}`;
}
