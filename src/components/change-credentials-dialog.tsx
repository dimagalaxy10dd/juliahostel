"use client";

import { useState } from "react";
import { toast } from "sonner";
import { changeCredentials, logout } from "@/app/(app)/actions";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangeCredentialsDialog({
  currentEmail,
}: {
  currentEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    try {
      const result = await changeCredentials(undefined, formData);
      if (result.ok) {
        toast.success("Логин и пароль изменены. Войдите заново.");
        await logout();
      } else {
        setError(result.error ?? "Не удалось сохранить");
        setPending(false);
      }
    } catch {
      setError("Произошла ошибка. Попробуйте ещё раз.");
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
        className="text-foreground mt-1 block text-sm hover:underline"
      >
        Сменить логин и пароль
      </button>

      {open && (
        <Modal
          open
          onClose={() => {
            if (!pending) setOpen(false);
          }}
          title="Логин и пароль"
        >
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base">Текущий пароль</Label>
              <Input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">Новый логин (email)</Label>
              <Input
                name="email"
                type="email"
                required
                defaultValue={currentEmail}
                autoComplete="username"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">Новый пароль</Label>
              <Input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="оставьте пустым, чтобы не менять"
                className="h-11 text-base"
              />
              <p className="text-muted-foreground text-xs">
                Минимум 8 символов. Чтобы не менять пароль — оставьте поле
                пустым.
              </p>
            </div>
            {error && (
              <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full text-base"
            >
              {pending ? "Сохранение…" : "Сохранить"}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
