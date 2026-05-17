import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteForm } from "@/components/delete-form";
import { PropertyTabs } from "@/components/property-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deleteExpense } from "../../actions";
import { AddExpenseDialog } from "./add-expense-dialog";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(d: Date): string {
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

export default async function FinancesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const { month } = await searchParams;

  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) notFound();

  const now = new Date();
  let year = now.getFullYear();
  let mon = now.getMonth() + 1;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    year = y;
    mon = m;
  }
  const monthStart = new Date(Date.UTC(year, mon - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, mon, 1));
  const prevMonth = `${mon === 1 ? year - 1 : year}-${pad(mon === 1 ? 12 : mon - 1)}`;
  const nextMonth = `${mon === 12 ? year + 1 : year}-${pad(mon === 12 ? 1 : mon + 1)}`;
  const monthLabel = `${MONTHS[mon - 1]} ${year}`;

  const [incomeAgg, expenses, categories] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        stay: { bed: { room: { building: { propertyId: id } } } },
        paidAt: { gte: monthStart, lt: nextMonthStart },
      },
    }),
    prisma.expense.findMany({
      where: {
        propertyId: id,
        spentOn: { gte: monthStart, lt: nextMonthStart },
      },
      include: { category: true },
      orderBy: { spentOn: "desc" },
    }),
    prisma.expenseCategory.findMany({
      where: { propertyId: id },
      orderBy: { name: "asc" },
    }),
  ]);

  const income = Number(incomeAgg._sum.amount ?? 0);
  const expenseTotal = expenses.reduce((n, e) => n + Number(e.amount), 0);
  const profit = income - expenseTotal;

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: c.name,
    fixedAmount: c.fixedAmount != null ? Number(c.fixedAmount) : null,
  }));

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
      </div>

      <PropertyTabs propertyId={id} active="finances" />

      <div className="flex items-center justify-center gap-3">
        <Link
          href={`?month=${prevMonth}`}
          className="bg-card hover:bg-muted rounded-lg border px-3 py-2 text-lg"
        >
          ←
        </Link>
        <span className="min-w-44 text-center text-lg font-semibold">
          {monthLabel}
        </span>
        <Link
          href={`?month=${nextMonth}`}
          className="bg-card hover:bg-muted rounded-lg border px-3 py-2 text-lg"
        >
          →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent>
            <p className="text-xl font-semibold sm:text-2xl">
              {formatMoney(income)}
            </p>
            <p className="text-muted-foreground text-sm">Доход</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xl font-semibold sm:text-2xl">
              {formatMoney(expenseTotal)}
            </p>
            <p className="text-muted-foreground text-sm">Расход</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p
              className={`text-xl font-semibold sm:text-2xl ${
                profit >= 0 ? "text-emerald-700" : "text-destructive"
              }`}
            >
              {formatMoney(profit)}
            </p>
            <p className="text-muted-foreground text-sm">Прибыль</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Затраты за {monthLabel}</h2>
        <AddExpenseDialog propertyId={id} categories={categoryOptions} />
      </div>

      {expenses.length === 0 ? (
        <p className="text-muted-foreground">
          За этот месяц затрат нет. Нажмите «Добавить затрату».
        </p>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div>
                <p className="font-medium">
                  {e.category?.name ?? "Без категории"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {fmtDate(e.spentOn)}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">
                  {formatMoney(Number(e.amount))}
                </span>
                <DeleteForm
                  action={deleteExpense}
                  hidden={{ id: e.id, propertyId: id }}
                  label="Удалить"
                  confirmText="Удалить эту затрату?"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
