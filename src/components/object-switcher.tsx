"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/(app)/actions";
import { createProperty } from "@/app/(app)/objects/actions";
import { AddDialog } from "@/components/add-dialog";
import { ChangeCredentialsDialog } from "@/components/change-credentials-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PropertyOption = { id: string; name: string };

export function ObjectSwitcher({
  properties,
  userName,
  userEmail,
}: {
  properties: PropertyOption[];
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const currentId = pathname.match(/^\/objects\/([^/]+)/)?.[1];
  const current = properties.find((p) => p.id === currentId);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bg-card hover:bg-muted flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
      >
        <span className="max-w-40 truncate">
          {current ? current.name : "Выберите объект"}
        </span>
        <span className="text-muted-foreground text-xs">▾</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="bg-card absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-xl">
            <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium">
              Объекты
            </p>
            {properties.length === 0 ? (
              <p className="text-muted-foreground px-3 pb-2 text-sm">
                Пока нет объектов
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto pb-1">
                {properties.map((p) => (
                  <Link
                    key={p.id}
                    href={`/objects/${p.id}`}
                    className={cn(
                      "hover:bg-muted block truncate px-3 py-2 text-sm",
                      p.id === currentId && "bg-muted font-semibold",
                    )}
                  >
                    {p.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="border-t p-1">
              <AddDialog
                triggerLabel="+ Добавить объект"
                triggerVariant="ghost"
                triggerClassName="h-9 w-full justify-start font-normal"
                title="Новый объект"
                action={createProperty}
                successMessage="Объект добавлен"
              >
                <div className="space-y-2">
                  <Label className="text-base">Название</Label>
                  <Input
                    name="name"
                    required
                    placeholder="Например: Хостел на Центральной"
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Адрес (необязательно)</Label>
                  <Input name="address" className="h-11 text-base" />
                </div>
              </AddDialog>
            </div>

            <div className="border-t px-3 py-2">
              <p className="text-muted-foreground truncate text-xs">
                {userName}
                {userEmail ? ` · ${userEmail}` : ""}
              </p>
              <ChangeCredentialsDialog currentEmail={userEmail} />
              <form action={logout}>
                <button
                  type="submit"
                  className="text-destructive mt-1 text-sm hover:underline"
                >
                  Выйти
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
