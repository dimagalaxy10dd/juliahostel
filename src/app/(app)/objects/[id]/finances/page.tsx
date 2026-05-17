import Link from "next/link";
import { notFound } from "next/navigation";
import { AddDialog } from "@/components/add-dialog";
import { DeleteForm } from "@/components/delete-form";
import { PropertyTabs } from "@/components/property-tabs";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  createExpenseCategory,
  deleteExpense,
  deleteExpenseCategory,
  updateExpenseCategory,
} from "../../actions";
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

function CategoryFields({
  category,
}: {
  category?: { name: string; fixedAmount: number | null };
}) {
  return (
    <>
      <div className="space-y-2">
        <Label className="text-base">Название категории</Label>
        <Input
          name="name"
          required
          defaultValue={category?.name}
          placeholder="Например: Электричество"
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-base">Обычная сумма за месяц (необязательно)</Label>
        <Input
          name="fixedAmount"
          type="number"
          min="0"
          step="1"
          defaultValue={category?.fixedAmount ?? undefined}
          placeholder="Подставится при добавлении затраты"
          className="h-11 text-base"
        />
      </div>
    </>
  );
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
                  {e.source === "AI" && (
                    <span className="text-muted-foreground text-xs">
                      {" "}
                      · распознано AI
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-sm">
                  {fmtDate(e.spentOn)}
                  {e.note ? ` · ${e.note}` : ""}
                  {e.photoUrl ? (
                    <>
                      {" · "}
                      <a
                        href={e.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        фото чека
                      </a>
                    </>
                  ) : null}
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

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h2 className="text-lg font-semibold">Категории затрат</h2>
        <AddDialog
          triggerLabel="+ Категория"
          triggerVariant="outline"
          title="Новая категория"
          action={createExpenseCategory}
          hidden={{ propertyId: id }}
          successMessage="Категория добавлена"
        >
          <CategoryFields />
        </AddDialog>
      </div>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">
          Категории помогают группировать затраты (электричество, мусор, вода
          и т.п.).
        </p>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                {c.fixedAmount != null && (
                  <p className="text-muted-foreground text-sm">
                    обычная сумма: {formatMoney(Number(c.fixedAmount))}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <AddDialog
                  triggerLabel="Изменить"
                  triggerVariant="outline"
                  title={`Категория — ${c.name}`}
                  action={updateExpenseCategory}
                  hidden={{ id: c.id, propertyId: id }}
                  successMessage="Категория обновлена"
                >
                  <CategoryFields
                    category={{
                      name: c.name,
                      fixedAmount:
                        c.fixedAmount != null ? Number(c.fixedAmount) : null,
                    }}
                  />
                </AddDialog>
                <DeleteForm
                  action={deleteExpenseCategory}
                  hidden={{ id: c.id, propertyId: id }}
                  label="Удалить"
                  confirmText={`Удалить категорию «${c.name}»?`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
