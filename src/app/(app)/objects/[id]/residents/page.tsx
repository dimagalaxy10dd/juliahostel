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
    </>
  );
}

export default async function ResidentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) notFound();

  const residents = await prisma.resident.findMany({
    where: { propertyId: id },
    orderBy: { fullName: "asc" },
    include: { _count: { select: { stays: true } } },
  });

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
          Жильцов пока нет. Их можно добавить здесь или прямо при заселении на
          шахматке.
        </p>
      ) : (
        <ul className="space-y-2">
          {residents.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
            >
              <div>
                <p className="font-medium">{r.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {r.phone || "телефон не указан"}
                  {r.note ? ` · ${r.note}` : ""} · заселений:{" "}
                  {r._count.stays}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AddDialog
                  triggerLabel="Изменить"
                  triggerVariant="outline"
                  title={`Жилец — ${r.fullName}`}
                  action={updateResident}
                  hidden={{ id: r.id, propertyId: id }}
                  successMessage="Данные обновлены"
                >
                  <ResidentFields
                    resident={{
                      fullName: r.fullName,
                      phone: r.phone ?? "",
                      note: r.note ?? "",
                    }}
                  />
                </AddDialog>
                <DeleteForm
                  action={deleteResident}
                  hidden={{ id: r.id, propertyId: id }}
                  label="Удалить"
                  confirmText={`Удалить жильца «${r.fullName}»? Его заселения тоже будут удалены.`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
