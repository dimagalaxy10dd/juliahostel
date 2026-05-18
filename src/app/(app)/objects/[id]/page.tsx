import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyTabs } from "@/components/property-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { paidThroughDays, stayDays } from "@/lib/billing";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const MONTHS = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  return iso.split("-").reverse().join(".");
}

type WarnItem = {
  id: string;
  residentName: string;
  place: string;
  dateTo: string;
  balance: number;
};

export default async function PropertyDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) notFound();

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const nextMonthStart = new Date(Date.UTC(year, month + 1, 1));
  const sixStart = new Date(Date.UTC(year, month - 5, 1));
  const todayIso = isoDay(now);
  const soonIso = isoDay(new Date(now.getTime() + 3 * 86400000));
  const tomorrow = new Date(now.getTime() + 86400000);
  const monthName = MONTHS[month];

  const [stayRows, payments, expenses, bedCount, buildingCount, roomCount] =
    await Promise.all([
      prisma.stay.findMany({
        where: {
          status: "ACTIVE",
          bed: { room: { building: { propertyId: id } } },
        },
        include: {
          resident: true,
          payments: true,
          bed: { include: { room: { include: { building: true } } } },
        },
      }),
      prisma.payment.findMany({
        where: {
          stay: { bed: { room: { building: { propertyId: id } } } },
          paidAt: { gte: sixStart, lt: nextMonthStart },
        },
        select: { amount: true, paidAt: true },
      }),
      prisma.expense.findMany({
        where: {
          propertyId: id,
          spentOn: { gte: sixStart, lt: nextMonthStart },
        },
        select: { amount: true, spentOn: true },
      }),
      prisma.bed.count({
        where: { room: { building: { propertyId: id } } },
      }),
      prisma.building.count({ where: { propertyId: id } }),
      prisma.room.count({ where: { building: { propertyId: id } } }),
    ]);

  const items = stayRows.map((s) => {
    const paid = s.payments.reduce((n, p) => n + Number(p.amount), 0);
    const b = s.bed.room.building;
    return {
      id: s.id,
      residentName: s.resident.fullName,
      place: `${b.name} · ${s.bed.room.name} · ${s.bed.label}`,
      dateFrom: isoDay(s.dateFrom),
      dateTo: isoDay(s.dateTo),
      balance: Number(s.agreedAmount) - paid,
    };
  });

  const occupied = items.filter(
    (i) => i.dateFrom <= todayIso && todayIso < i.dateTo,
  ).length;
  const free = Math.max(0, bedCount - occupied);

  const overdue = items.filter((i) => i.dateTo <= todayIso);
  const endingSoon = items.filter(
    (i) => i.dateTo > todayIso && i.dateTo <= soonIso,
  );
  const unpaid = items.filter((i) => i.balance > 0);

  // Долг за уже прожитые, но не оплаченные дни.
  let livedDebtTotal = 0;
  let debtorsCount = 0;
  for (const s of stayRows) {
    const totalDays = stayDays(s.dateFrom, s.dateTo);
    if (totalDays <= 0) continue;
    const agreed = Number(s.agreedAmount);
    const paid = s.payments.reduce((n, p) => n + Number(p.amount), 0);
    const dailyRate = agreed / totalDays;
    const paidDays = paidThroughDays(paid, agreed, totalDays);
    const livedDays = Math.min(
      totalDays,
      Math.max(0, stayDays(s.dateFrom, tomorrow)),
    );
    const debt = Math.round(Math.max(0, livedDays - paidDays) * dailyRate);
    if (debt > 0) {
      livedDebtTotal += debt;
      debtorsCount += 1;
    }
  }

  // Доход / расход по месяцам за последние 6 месяцев.
  const buckets = [];
  for (let k = 5; k >= 0; k--) {
    const d = new Date(Date.UTC(year, month - k, 1));
    buckets.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      income: 0,
      expense: 0,
    });
  }
  for (const p of payments) {
    const b = buckets.find(
      (x) =>
        x.year === p.paidAt.getUTCFullYear() &&
        x.month === p.paidAt.getUTCMonth(),
    );
    if (b) b.income += Number(p.amount);
  }
  for (const e of expenses) {
    const b = buckets.find(
      (x) =>
        x.year === e.spentOn.getUTCFullYear() &&
        x.month === e.spentOn.getUTCMonth(),
    );
    if (b) b.expense += Number(e.amount);
  }
  const series = buckets.map((b) => ({ ...b, profit: b.income - b.expense }));
  const cur = series[series.length - 1];
  const prev = series[series.length - 2];

  const allClear =
    overdue.length === 0 && endingSoon.length === 0 && unpaid.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/objects"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Все объекты
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{property.name}</h1>
        {property.address && (
          <p className="text-muted-foreground">{property.address}</p>
        )}
      </div>

      <PropertyTabs propertyId={id} active="dashboard" />

      {bedCount === 0 ? (
        <div className="bg-card rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">
            В объекте пока нет мест. Добавьте помещения, комнаты и места.
          </p>
          <Link
            href={`/objects/${id}/structure`}
            className="text-primary mt-2 inline-block font-medium hover:underline"
          >
            Перейти к настройкам →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Свободно сейчас"
              value={`${free}/${bedCount}`}
              tone={free > 0 ? "good" : "bad"}
            />
            <StatCard
              label="Долг за прожитые дни"
              value={formatMoney(livedDebtTotal)}
              tone={livedDebtTotal > 0 ? "bad" : "good"}
              hint={
                debtorsCount > 0
                  ? `не оплатили: ${debtorsCount} чел.`
                  : "все оплачено"
              }
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Финансы за {monthName}</h2>
            <div className="grid grid-cols-3 gap-3">
              <FinanceCard
                label="Доход"
                value={cur.income}
                prev={prev.income}
                goodWhenUp
              />
              <FinanceCard
                label="Расход"
                value={cur.expense}
                prev={prev.expense}
                goodWhenUp={false}
              />
              <FinanceCard
                label="Прибыль"
                value={cur.profit}
                prev={prev.profit}
                goodWhenUp
                colorValue
              />
            </div>
          </div>

          <div className="bg-card space-y-3 rounded-lg border p-4">
            <h2 className="text-base font-semibold">Прибыль по месяцам</h2>
            <MonthlyBars
              data={series.map((s) => ({
                label: MONTHS_SHORT[s.month],
                value: s.profit,
              }))}
            />
          </div>

          <p className="text-muted-foreground text-sm">
            {buildingCount} помещ. · {roomCount} комн. · {bedCount} мест
          </p>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Требует внимания</h2>

            {allClear && (
              <div className="bg-card rounded-lg border p-6 text-center">
                <p className="text-muted-foreground">
                  Сейчас ничего не требует внимания.
                </p>
              </div>
            )}

            <WarnSection
              title="Срок проживания истёк"
              tone="overdue"
              propertyId={id}
              items={overdue}
              render={(i) => `выехать должны были ${fmtDate(i.dateTo)}`}
            />
            <WarnSection
              title="Скоро заканчивается срок"
              tone="soon"
              propertyId={id}
              items={endingSoon}
              render={(i) => `срок до ${fmtDate(i.dateTo)}`}
            />
            <WarnSection
              title="Не оплачено"
              tone="unpaid"
              propertyId={id}
              items={unpaid}
              render={(i) => `долг ${formatMoney(i.balance)}`}
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  const valueColor =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-destructive"
        : "";
  return (
    <Card>
      <CardContent>
        <p className={`text-xl font-semibold sm:text-2xl ${valueColor}`}>
          {value}
        </p>
        <p className="text-muted-foreground text-sm">{label}</p>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function FinanceCard({
  label,
  value,
  prev,
  goodWhenUp,
  colorValue,
}: {
  label: string;
  value: number;
  prev: number;
  goodWhenUp: boolean;
  colorValue?: boolean;
}) {
  const delta = value - prev;
  const better = goodWhenUp ? delta >= 0 : delta <= 0;
  const valueColor = colorValue
    ? value >= 0
      ? "text-emerald-700"
      : "text-destructive"
    : "";
  return (
    <Card>
      <CardContent>
        <p className={`text-base font-semibold sm:text-xl ${valueColor}`}>
          {formatMoney(value)}
        </p>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p
          className={`mt-0.5 text-[11px] ${
            delta === 0
              ? "text-muted-foreground"
              : better
                ? "text-emerald-700"
                : "text-destructive"
          }`}
        >
          {delta === 0
            ? "как в прошлом мес."
            : `${delta > 0 ? "↑" : "↓"} ${formatMoney(Math.abs(delta))}`}
        </p>
      </CardContent>
    </Card>
  );
}

function MonthlyBars({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  return (
    <div className="flex items-end gap-1.5">
      {data.map((d, i) => {
        const isCurrent = i === data.length - 1;
        const negative = d.value < 0;
        const pct = (Math.abs(d.value) / maxAbs) * 100;
        return (
          <div
            key={`${d.label}-${i}`}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <span
              className={`text-[10px] tabular-nums ${
                negative ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {d.value !== 0 ? d.value.toLocaleString("ru-RU") : ""}
            </span>
            <div className="flex h-24 w-full items-end">
              <div
                className={`w-full rounded-t ${
                  negative
                    ? "bg-destructive/70"
                    : isCurrent
                      ? "bg-primary"
                      : "bg-foreground/15"
                }`}
                style={{
                  height: d.value !== 0 ? `${Math.max(4, pct)}%` : "0%",
                }}
              />
            </div>
            <span
              className={`text-[10px] ${
                isCurrent
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const TONE_DOT: Record<string, string> = {
  overdue: "bg-rose-400",
  soon: "bg-amber-400",
  unpaid: "bg-amber-400",
};

function WarnSection({
  title,
  tone,
  propertyId,
  items,
  render,
}: {
  title: string;
  tone: "overdue" | "soon" | "unpaid";
  propertyId: string;
  items: WarnItem[];
  render: (i: WarnItem) => string;
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardContent>
        <p className="flex items-center gap-2 text-base font-semibold">
          <span
            className={`inline-block size-2.5 rounded-full ${TONE_DOT[tone]}`}
          />
          {title}
          <span className="text-muted-foreground font-normal">
            · {items.length}
          </span>
        </p>
        <div className="mt-2 space-y-1">
          {items.map((i) => (
            <Link
              key={i.id}
              href={`/objects/${propertyId}/chart`}
              className="hover:bg-muted -mx-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md px-2 py-2"
            >
              <span>
                <span className="font-medium">{i.residentName}</span>
                <span className="text-muted-foreground text-sm">
                  {" "}
                  — {i.place}
                </span>
              </span>
              <span className="text-muted-foreground text-sm">
                {render(i)}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
