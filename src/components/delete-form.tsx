"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";

type DeleteAction = (formData: FormData) => Promise<void>;

export function DeleteForm({
  action,
  hidden,
  label,
  confirmText,
}: {
  action: DeleteAction;
  hidden: Record<string, string>;
  label: string;
  confirmText: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const fd = new FormData();
    for (const [k, v] of Object.entries(hidden)) fd.set(k, v);
    try {
      await action(fd);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-destructive hover:bg-destructive/10 rounded-md px-2 py-1 text-sm"
      >
        {label}
      </button>
      {open && (
        <Modal
          open
          onClose={() => {
            if (!pending) setOpen(false);
          }}
          title="Подтверждение"
        >
          <div className="space-y-4">
            <p className="text-sm">{confirmText}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="h-11 flex-1"
              >
                Отмена
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="bg-destructive h-11 flex-1 text-white"
              >
                {pending ? "Удаление…" : "Удалить"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
