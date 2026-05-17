"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

type Action = (
  prev: ActionResult | undefined,
  formData: FormData,
) => Promise<ActionResult>;

export function AddDialog({
  triggerLabel,
  title,
  action,
  hidden,
  children,
  triggerClassName,
  triggerVariant = "default",
  submitLabel = "Сохранить",
  successMessage = "Сохранено",
}: {
  triggerLabel: string;
  title: string;
  action: Action;
  hidden?: Record<string, string>;
  children: React.ReactNode;
  triggerClassName?: string;
  triggerVariant?: "default" | "outline" | "secondary";
  submitLabel?: string;
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    try {
      const result = await action(undefined, formData);
      if (result.ok) {
        setOpen(false);
        toast.success(successMessage);
      } else {
        setError(result.error ?? "Не удалось сохранить");
      }
    } catch {
      setError("Произошла ошибка. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        className={triggerClassName}
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        {triggerLabel}
      </Button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="relative z-10 w-full max-w-sm rounded-xl bg-card p-5 shadow-xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="text-muted-foreground hover:bg-muted absolute right-3 top-3 rounded-md px-2 py-1 text-lg"
              >
                ✕
              </button>
              <h2 className="pr-8 text-lg font-bold">{title}</h2>
              <form action={handleSubmit} className="mt-4 space-y-4">
                {hidden &&
                  Object.entries(hidden).map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                {children}
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
                  {pending ? "Сохранение…" : submitLabel}
                </Button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
