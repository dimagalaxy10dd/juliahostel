import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { RateType } from "@/lib/billing";
import { ChartGrid, type ChartRoom, type ChartStay } from "../chart-grid";

function isoDay(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

type StayRow = {
  id: string;
  bedId: string;
  resident: { fullName: string };
  payments: { amount: unknown }[];
  dateFrom: Date;
  dateTo: Date;
  rateType: string;
  status: string;
  agreedAmount: unknown;
  refundAmount: unknown;
  refundedAt: Date | null;
};

function mapStay(s: StayRow): ChartStay {
  return {
    id: s.id,
    bedId: s.bedId,
    residentName: s.resident.fullName,
    dateFrom: s.dateFrom.toISOString().slice(0, 10),
    dateTo: s.dateTo.toISOString().slice(0, 10),
    rateType: s.rateType as RateType,
    status: s.status,
    agreedAmount: Number(s.agreedAmount),
    paidTotal: s.payments.reduce((sum, p) => sum + Number(p.amount), 0),
    refundAmount: s.refundAmount != null ? Number(s.refundAmount) : null,
    refundedAt: s.refundedAt ? s.refundedAt.toISOString() : null,
  };
}

export default async function PropertyChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; open?: string; panel?: string }>;
}) {
  const { id } = await params;
  const { month, open, panel } = await searchParams;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      buildings: {
        orderBy: { sortOrder: "asc" },
        include: {
          rooms: {
            orderBy: { sortOrder: "asc" },
            include: { beds: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });
  if (!property) notFound();

  // Заселение, которое нужно открыть сразу (переход из «Требует внимания»).
  const openStay = open
    ? await prisma.stay.findUnique({
        where: { id: open },
        include: { resident: true, payments: true },
      })
    : null;

  const base =
    month && /^\d{4}-\d{2}$/.test(month)
      ? new Date(`${month}-01T00:00:00`)
      : openStay
        ? startOfMonth(openStay.dateFrom)
        : new Date();
  const monthStart = startOfMonth(base);
  const monthEnd = endOfMonth(base);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map(
    isoDay,
  );
  const monthLabelRaw = format(monthStart, "LLLL yyyy", { locale: ru });
  const monthLabel =
    monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

  const rooms: ChartRoom[] = [];
  for (const b of property.buildings) {
    for (const r of b.rooms) {
      rooms.push({
        id: r.id,
        buildingName: b.name,
        roomName: r.name,
        buildingColor: b.color,
        beds: r.beds.map((bed) => ({
          id: bed.id,
          label: bed.label,
          buildingName: b.name,
          roomName: r.name,
          priceDaily: Number(bed.priceDaily),
          priceMonthly: Number(bed.priceMonthly),
        })),
      });
    }
  }
  const bedCount = rooms.reduce((n, r) => n + r.beds.length, 0);

  const stayRows = await prisma.stay.findMany({
    where: {
      bed: { room: { building: { propertyId: id } } },
      dateFrom: { lt: addDays(monthEnd, 2) },
      dateTo: { gt: addDays(monthStart, -1) },
    },
    include: { resident: true, payments: true },
  });
  const stays = stayRows.map(mapStay);
  if (openStay && !stays.some((s) => s.id === openStay.id)) {
    stays.push(mapStay(openStay));
  }

  const residents = await prisma.resident.findMany({
    where: { propertyId: id },
    orderBy: { fullName: "asc" },
  });
  // Уникальные имена — список нужен только для автоподсказки, а одинаковые
  // имена ломают ключи в <datalist>.
  const residentNames = [...new Set(residents.map((r) => r.fullName))];

  return (
    <div className="space-y-5">
      {bedCount === 0 ? (
        <div className="bg-card rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">
            Сначала добавьте помещения, комнаты и места.
          </p>
          <Link
            href={`/objects/${id}/structure`}
            className="text-primary mt-2 inline-block font-medium hover:underline"
          >
            Перейти к настройкам →
          </Link>
        </div>
      ) : (
        <ChartGrid
          propertyId={id}
          days={days}
          rooms={rooms}
          stays={stays}
          residentNames={residentNames}
          monthLabel={monthLabel}
          prevMonth={format(addMonths(monthStart, -1), "yyyy-MM")}
          nextMonth={format(addMonths(monthStart, 1), "yyyy-MM")}
          openStayId={openStay?.id}
          openPanel={
            panel === "extend" || panel === "checkout" ? panel : undefined
          }
        />
      )}
    </div>
  );
}
