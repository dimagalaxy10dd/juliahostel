import Link from "next/link";
import { AddDialog } from "@/components/add-dialog";
import { DeleteForm } from "@/components/delete-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { createProperty, deleteProperty } from "./actions";

export default async function ObjectsPage() {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Выберите объект</h1>
        <AddDialog
          triggerLabel="+ Добавить объект"
          title="Новый объект"
          action={createProperty}
          successMessage="Объект добавлен"
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base">
              Название
            </Label>
            <Input
              id="name"
              name="name"
              required
              className="h-11 text-base"
              placeholder="Например: Хостел на Центральной"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="text-base">
              Адрес (необязательно)
            </Label>
            <Input id="address" name="address" className="h-11 text-base" />
          </div>
        </AddDialog>
      </div>

      {properties.length === 0 ? (
        <p className="text-muted-foreground">
          Пока нет объектов. Нажмите «Добавить объект», чтобы создать первый.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {properties.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                {p.address && <CardDescription>{p.address}</CardDescription>}
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Link
                  href={`/objects/${p.id}`}
                  className="text-primary text-base font-medium hover:underline"
                >
                  Открыть →
                </Link>
                <DeleteForm
                  action={deleteProperty}
                  hidden={{ id: p.id }}
                  label="Удалить"
                  confirmText={`Удалить объект «${p.name}» со всеми помещениями, комнатами и местами?`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
