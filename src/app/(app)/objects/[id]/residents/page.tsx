import Link from "next/link";
import { notFound } from "next/navigation";
import { AddDialog } from "@/components/add-dialog";
import { DeleteForm } from "@/components/delete-form";
import { PropertyTabs } from "@/components/property-tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { createResident, deleteResident, updateResident } from "../../actions";

type ResidentDefaults = {
  fullName: string;
  phone: string;
  note: string;
  needsInvoice: boolean;
  nip: string;
};

function ResidentFields({ resident }: { resident?: ResidentDefaults }) {
  return (
    <>
      <div className="space-y-2">
        <Label className="text-base">Имя</Label>
        <Input
          name="fullName"
          required
          defaultValue={resident?.fullName}
          placeholder="Например: Сырватюк Наташа"
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-base">Телефон (необязательно)</Label>
        <Input
          name="phone"
          defaultValue={resident?.phone}
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-base">Заметка (необязательно)</Label>
        <Input
          name="note"
          defaultValue={resident?.note}
          className="h-11 text-base"
        />
      </div>
      <label className="flex items-center gap-2 text-base">
        <input
          type="checkbox"
          name="needsInvoice"
          defaultChecked={resident?.needsInvoice}
          className="size-4"
        />
        Нужна фактура
      </label>
      <div className="space-y-2">
        <Label className="text-base">Номер NIP (необязательно)</Label>
        <Input
          name="nip"
          defaultValue={resident?.nip}
          placeholder="Для фактуры"
          className="h-11 text-base"
        />
      </div>
    </>
  );
}

type ResidentRow = {
  id: string;
  fullName: string;
  phone: string | null;
  note: string | null;
  needsInvoice: boolean;
  nip: string | null;
  stayCount: number;
};

function ResidentItem({
  resident,
  propertyId,
}: {
  resident: ResidentRow;
  propertyId: string;
}) {
  return (
    <li className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
      <div>
        <p className="font-medium">{resident.fullName}</p>
        <p className="text-muted-foreground text-sm">
          {resident.phone || "телефон не указан"}
          {resident.note ? ` · ${resident.note}` : ""} · заселений:{" "}
          {resident.stayCount}
          {resident.needsInvoice
            ? ` · фактура${resident.nip ? `: NIP ${resident.nip}` : ""}`
            : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <AddDialog
          triggerLabel="Изменить"
          triggerVariant="outline"
          title={`Жилец — ${resident.fullName}`}
          action={updateResident}
          hidden={{ id: resident.id, propertyId }}
          successMessage="Данные обновлены"
        >
          <ResidentFields
            resident={{
              fullName: resident.fullName,
              phone: resident.phone ?? "",
              note: resident.note ?? "",
              needsInvoice: resident.needsInvoice,
              nip: resident.nip ?? "",
            }}
          />
        </AddDialog>
        <DeleteForm
          action={deleteResident}
          hidden={{ id: resident.id, propertyId }}
          label="Удалить"
          confirmText={`Удалить жильца «${resident.fullName}»? Его заселения тоже будут удалены.`}
        />
      </div>
    </li>
  );
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function ResidentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) notFound();

  const todayIso = new Date().toISOString().slice(0, 10);
  const residents = await prisma.resident.findMany({
    where: { propertyId: id },
    orderBy: { fullName: "asc" },
    include: {
      stays: { select: { dateFrom: true, dateTo: true } },
    },
  });

  const rows = residents.map((r) => ({
    row: {
      id: r.id,
      fullName: r.fullName,
      phone: r.phone,
      note: r.note,
      needsInvoice: r.needsInvoice,
      nip: r.nip,
      stayCount: r.stays.length,
    } satisfies ResidentRow,
    livingNow: r.stays.some(
      (s) => isoDay(s.dateFrom) <= todayIso && todayIso < isoDay(s.dateTo),
    ),
  }));

  const living = rows.filter((r) => r.livingNow).map((r) => r.row);
  const former = rows.filter((r) => !r.livingNow).map((r) => r.row);

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

      <PropertyTabs propertyId={id} active="residents" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Список жильцов</h2>
        <AddDialog
          triggerLabel="+ Добавить жильца"
          title="Новый жилец"
          action={createResident}
          hidden={{ propertyId: id }}
          successMessage="Жилец добавлен"
        >
          <ResidentFields />
        </AddDialog>
      </div>

      {residents.length === 0 ? (
        <p className="text-muted-foreground">
          Жильцов пока нет. Их можно добавить здесь или прямо при заселении в
          календаре.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <span className="inline-block size-2.5 rounded-full bg-emerald-400" />
              Живут сейчас
              <span className="text-muted-foreground font-normal">
                · {living.length}
              </span>
            </h3>
            {living.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Сейчас никто не проживает.
              </p>
            ) : (
              <ul className="space-y-2">
                {living.map((r) => (
                  <ResidentItem key={r.id} resident={r} propertyId={id} />
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <span className="bg-muted-foreground/40 inline-block size-2.5 rounded-full" />
              Не живут сейчас
              <span className="text-muted-foreground font-normal">
                · {former.length}
              </span>
            </h3>
            {former.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Все жильцы из списка проживают сейчас.
              </p>
            ) : (
              <ul className="space-y-2">
                {former.map((r) => (
                  <ResidentItem key={r.id} resident={r} propertyId={id} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
