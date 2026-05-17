import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyTabs } from "@/components/property-tabs";
import { Card, CardContent } from "@/components/ui/card";
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
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const todayIso = isoDay(now);
  const soonIso = isoDay(new Date(now.getTime() + 3 * 86400000));
  const monthName = MONTHS[now.getUTCMonth()];

  const [stayRows, expenseAgg, incomeAgg, bedCount, buildingCount, roomCount] =
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
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          propertyId: id,
          spentOn: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          stay: { bed: { room: { building: { propertyId: id } } } },
          paidAt: { gte: monthStart, lt: nextMonthStart },
        },
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
  const occupancyPct =
    bedCount > 0 ? Math.round((occupied / bedCount) * 100) : 0;

  const overdue = items.filter((i) => i.dateTo <= todayIso);
  const endingSoon = items.filter(
    (i) => i.dateTo > todayIso && i.dateTo <= soonIso,
  );
  const unpaid = items.filter((i) => i.balance > 0);

  const income = Number(incomeAgg._sum.amount ?? 0);
  const expenses = Number(expenseAgg._sum.amount ?? 0);
  const profit = income - expenses;

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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Всего мест" value={String(bedCount)} />
            <StatCard
              label="Свободно сейчас"
              value={String(free)}
              tone="good"
            />
            <StatCard
              label="Занято сейчас"
              value={`${occupied}`}
              hint={`загрузка ${occupancyPct}%`}
            />
            <StatCard
              label={`Доход за ${monthName}`}
              value={formatMoney(income)}
            />
            <StatCard
              label={`Расход за ${monthName}`}
              value={formatMoney(expenses)}
            />
            <StatCard
              label={`Прибыль за ${monthName}`}
              value={formatMoney(profit)}
              tone={profit >= 0 ? "good" : "bad"}
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
