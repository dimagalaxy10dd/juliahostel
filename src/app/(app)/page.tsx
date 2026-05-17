import { endOfMonth, format, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type WarnItem = {
  id: string;
  residentName: string;
  place: string;
  propertyId: string;
  propertyName: string;
  dateTo: string;
  balance: number;
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  return iso.split("-").reverse().join(".");
}

export default async function HomePage() {
  const session = await auth();
  const now = new Date();
  const todayIso = isoDay(now);
  const soonIso = isoDay(new Date(now.getTime() + 3 * 86400000));

  const propertyCount = await prisma.property.count();

  if (propertyCount === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">
          Здравствуйте, {session?.user?.name}!
        </h1>
        <div className="bg-card rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">
            Пока нет ни одного объекта.
          </p>
          <Link
            href="/objects"
            className="text-primary mt-2 inline-block font-medium hover:underline"
          >
            Добавить первый объект →
          </Link>
        </div>
      </div>
    );
  }

  const stayRows = await prisma.stay.findMany({
    where: { status: "ACTIVE" },
    include: {
      resident: true,
      payments: true,
      bed: {
        include: {
          room: { include: { building: { include: { property: true } } } },
        },
      },
    },
  });

  const items = stayRows.map((s) => {
    const paid = s.payments.reduce((n, p) => n + Number(p.amount), 0);
    const property = s.bed.room.building.property;
    return {
      id: s.id,
      bedId: s.bedId,
      residentName: s.resident.fullName,
      propertyId: property.id,
      propertyName: property.name,
      place: `${s.bed.room.building.name} · ${s.bed.room.name} · ${s.bed.label}`,
      dateFrom: isoDay(s.dateFrom),
      dateTo: isoDay(s.dateTo),
      balance: Number(s.agreedAmount) - paid,
    };
  });

  const overdue = items.filter((i) => i.dateTo <= todayIso);
  const endingSoon = items.filter(
    (i) => i.dateTo > todayIso && i.dateTo <= soonIso,
  );
  const unpaid = items.filter((i) => i.balance > 0);

  const totalBeds = await prisma.bed.count();
  const occupied = items.filter(
    (i) => i.dateFrom <= todayIso && todayIso < i.dateTo,
  ).length;
  const free = Math.max(0, totalBeds - occupied);

  const payAgg = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { paidAt: { gte: startOfMonth(now), lte: endOfMonth(now) } },
  });
  const incomeMonth = Number(payAgg._sum.amount ?? 0);
  const monthName = format(now, "LLLL", { locale: ru });

  const allClear =
    overdue.length === 0 && endingSoon.length === 0 && unpaid.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Здравствуйте, {session?.user?.name}!
      </h1>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Свободно мест" value={String(free)} />
        <StatCard label="Занято мест" value={String(occupied)} />
        <StatCard
          label={`Доход за ${monthName}`}
          value={formatMoney(incomeMonth)}
        />
      </div>

      <div className="space-y-4">
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
          items={overdue}
          render={(i) => `выехать должны были ${fmtDate(i.dateTo)}`}
        />
        <WarnSection
          title="Скоро заканчивается срок"
          tone="soon"
          items={endingSoon}
          render={(i) => `срок до ${fmtDate(i.dateTo)}`}
        />
        <WarnSection
          title="Не оплачено"
          tone="unpaid"
          items={unpaid}
          render={(i) => `долг ${formatMoney(i.balance)}`}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xl font-semibold sm:text-2xl">{value}</p>
        <p className="text-muted-foreground text-sm">{label}</p>
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
  items,
  render,
}: {
  title: string;
  tone: "overdue" | "soon" | "unpaid";
  items: WarnItem[];
  render: (i: WarnItem) => string;
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={`inline-block size-2.5 rounded-full ${TONE_DOT[tone]}`} />
          {title}
          <span className="text-muted-foreground font-normal">
            · {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((i) => (
          <Link
            key={i.id}
            href={`/objects/${i.propertyId}`}
            className="hover:bg-muted -mx-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md px-2 py-2"
          >
            <span>
              <span className="font-medium">{i.residentName}</span>
              <span className="text-muted-foreground text-sm">
                {" "}
                — {i.propertyName}, {i.place}
              </span>
            </span>
            <span className="text-muted-foreground text-sm">{render(i)}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
