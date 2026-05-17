import Link from "next/link";
import { notFound } from "next/navigation";
import { AddDialog } from "@/components/add-dialog";
import { DeleteForm } from "@/components/delete-form";
import { PropertyTabs } from "@/components/property-tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  createBed,
  createBuilding,
  createRoom,
  deleteBed,
  deleteBuilding,
  deleteRoom,
  updateBed,
} from "../../actions";

type BedDefaults = {
  label: string;
  priceDaily: number;
  priceWeekly: number;
  priceMonthly: number;
};

function BedFields({ bed }: { bed?: BedDefaults }) {
  return (
    <>
      <div className="space-y-2">
        <Label className="text-base">Название места</Label>
        <Input
          name="label"
          required
          defaultValue={bed?.label}
          placeholder="Например: Место 1"
          className="h-11 text-base"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Сутки</Label>
          <Input
            name="priceDaily"
            type="number"
            min="0"
            step="1"
            defaultValue={bed?.priceDaily ?? 0}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Неделя</Label>
          <Input
            name="priceWeekly"
            type="number"
            min="0"
            step="1"
            defaultValue={bed?.priceWeekly ?? 0}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Месяц</Label>
          <Input
            name="priceMonthly"
            type="number"
            min="0"
            step="1"
            defaultValue={bed?.priceMonthly ?? 0}
            className="h-11"
          />
        </div>
      </div>
    </>
  );
}

export default async function StructurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/objects"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Все объекты
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{property.name}</h1>
      </div>

      <PropertyTabs propertyId={property.id} active="structure" />

      <p className="text-muted-foreground">
        Помещения, комнаты, места и цены.
      </p>

      <AddDialog
        triggerLabel="+ Добавить помещение"
        title="Новое помещение"
        action={createBuilding}
        hidden={{ propertyId: property.id }}
        successMessage="Помещение добавлено"
      >
        <div className="space-y-2">
          <Label className="text-base">Название</Label>
          <Input
            name="name"
            required
            placeholder="Например: Этаж 1 или Летний домик"
            className="h-11 text-base"
          />
        </div>
      </AddDialog>

      {property.buildings.length === 0 && (
        <p className="text-muted-foreground">
          Помещений пока нет. Помещение — это этаж, корпус или отдельный домик.
        </p>
      )}

      <div className="space-y-5">
        {property.buildings.map((building) => (
          <section
            key={building.id}
            className="rounded-lg border bg-card p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{building.name}</h2>
              <div className="flex items-center gap-2">
                <AddDialog
                  triggerLabel="+ Комната"
                  triggerVariant="outline"
                  title={`Новая комната — ${building.name}`}
                  action={createRoom}
                  hidden={{
                    buildingId: building.id,
                    propertyId: property.id,
                  }}
                  successMessage="Комната добавлена"
                >
                  <div className="space-y-2">
                    <Label className="text-base">Название комнаты</Label>
                    <Input
                      name="name"
                      required
                      placeholder="Например: Комната 1"
                      className="h-11 text-base"
                    />
                  </div>
                </AddDialog>
                <DeleteForm
                  action={deleteBuilding}
                  hidden={{ id: building.id, propertyId: property.id }}
                  label="Удалить помещение"
                  confirmText={`Удалить помещение «${building.name}» со всеми комнатами и местами?`}
                />
              </div>
            </div>

            {building.rooms.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">Комнат пока нет.</p>
            )}

            <div className="mt-3 space-y-3">
              {building.rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-muted rounded-md border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{room.name}</h3>
                    <div className="flex items-center gap-2">
                      <AddDialog
                        triggerLabel="+ Место"
                        triggerVariant="outline"
                        title={`Новое место — ${room.name}`}
                        action={createBed}
                        hidden={{
                          roomId: room.id,
                          propertyId: property.id,
                        }}
                        successMessage="Место добавлено"
                      >
                        <BedFields />
                      </AddDialog>
                      <DeleteForm
                        action={deleteRoom}
                        hidden={{ id: room.id, propertyId: property.id }}
                        label="Удалить комнату"
                        confirmText={`Удалить комнату «${room.name}» со всеми местами?`}
                      />
                    </div>
                  </div>

                  {room.beds.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Мест пока нет.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {room.beds.map((bed) => {
                        const view: BedDefaults = {
                          label: bed.label,
                          priceDaily: Number(bed.priceDaily),
                          priceWeekly: Number(bed.priceWeekly),
                          priceMonthly: Number(bed.priceMonthly),
                        };
                        return (
                          <li
                            key={bed.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                          >
                            <div>
                              <p className="font-medium">{bed.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatMoney(view.priceDaily)} / сутки ·{" "}
                                {formatMoney(view.priceWeekly)} / неделя ·{" "}
                                {formatMoney(view.priceMonthly)} / месяц
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <AddDialog
                                triggerLabel="Изменить"
                                triggerVariant="outline"
                                title={`Место — ${bed.label}`}
                                action={updateBed}
                                hidden={{
                                  id: bed.id,
                                  propertyId: property.id,
                                }}
                                successMessage="Место обновлено"
                              >
                                <BedFields bed={view} />
                              </AddDialog>
                              <DeleteForm
                                action={deleteBed}
                                hidden={{
                                  id: bed.id,
                                  propertyId: property.id,
                                }}
                                label="Удалить"
                                confirmText={`Удалить место «${bed.label}»?`}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
