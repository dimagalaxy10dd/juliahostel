import Link from "next/link";
import { notFound } from "next/navigation";
import { AddDialog } from "@/components/add-dialog";
import { DeleteForm } from "@/components/delete-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  createBed,
  createBuilding,
  createExpenseCategory,
  createRoom,
  deleteBed,
  deleteBuilding,
  deleteExpenseCategory,
  deleteRoom,
  updateBed,
  updateBuilding,
  updateExpenseCategory,
} from "../../actions";

// Палитра цветов помещений (мягкие пастельные тона)
const BUILDING_COLORS = [
  "#FFD8DD",
  "#FFE6C7",
  "#FFF4C2",
  "#D4F0D2",
  "#C9EBF0",
  "#D7DEFF",
  "#EAD5F7",
  "#E0E0E0",
];

function BuildingFields({ building }: { building?: { name: string; color: string | null } }) {
  return (
    <>
      <div className="space-y-2">
        <Label className="text-base">Название</Label>
        <Input
          name="name"
          required
          defaultValue={building?.name}
          placeholder="Например: Этаж 1 или Летний домик"
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-base">Цвет в календаре</Label>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer">
            <input
              type="radio"
              name="color"
              value=""
              defaultChecked={!building?.color}
              className="peer sr-only"
            />
            <span className="border-input bg-background text-muted-foreground peer-checked:ring-foreground flex size-9 items-center justify-center rounded-full border text-xs peer-checked:ring-2 peer-checked:ring-offset-2">
              нет
            </span>
          </label>
          {BUILDING_COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c}
                defaultChecked={building?.color === c}
                className="peer sr-only"
              />
              <span
                className="peer-checked:ring-foreground block size-9 rounded-full border peer-checked:ring-2 peer-checked:ring-offset-2"
                style={{ backgroundColor: c }}
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

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
        <Label className="text-base">
          Обычная сумма за месяц (необязательно)
        </Label>
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

  const categories = await prisma.expenseCategory.findMany({
    where: { propertyId: id },
    orderBy: { name: "asc" },
  });

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

      <p className="text-muted-foreground">
        Настройки объекта: помещения, комнаты, места и цены.
      </p>

      <AddDialog
        triggerLabel="+ Добавить помещение"
        title="Новое помещение"
        action={createBuilding}
        hidden={{ propertyId: property.id }}
        successMessage="Помещение добавлено"
      >
        <BuildingFields />
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
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span
                  className="inline-block size-4 rounded-full border"
                  style={{ backgroundColor: building.color ?? "#f7f7f7" }}
                />
                {building.name}
              </h2>
              <div className="flex items-center gap-2">
                <AddDialog
                  triggerLabel="Изменить"
                  triggerVariant="outline"
                  title={`Помещение — ${building.name}`}
                  action={updateBuilding}
                  hidden={{ id: building.id, propertyId: property.id }}
                  successMessage="Помещение обновлено"
                >
                  <BuildingFields
                    building={{ name: building.name, color: building.color }}
                  />
                </AddDialog>
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

      <section className="bg-card space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Категории затрат</h2>
            <p className="text-muted-foreground text-sm">
              Группируют затраты в Финансах: электричество, мусор, вода и т.п.
            </p>
          </div>
          <AddDialog
            triggerLabel="+ Категория"
            triggerVariant="outline"
            title="Новая категория"
            action={createExpenseCategory}
            hidden={{ propertyId: property.id }}
            successMessage="Категория добавлена"
          >
            <CategoryFields />
          </AddDialog>
        </div>

        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">Категорий пока нет.</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="bg-muted flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
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
                    hidden={{ id: c.id, propertyId: property.id }}
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
                    hidden={{ id: c.id, propertyId: property.id }}
                    label="Удалить"
                    confirmText={`Удалить категорию «${c.name}»?`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
