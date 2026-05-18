"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DateField } from "@/components/date-field";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExpense } from "../../actions";

export type ExpenseCategoryOption = {
  id: string;
  name: string;
  fixedAmount: number | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddExpenseDialog({
  propertyId,
  categories,
}: {
  propertyId: string;
  categories: ExpenseCategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  function reset() {
    setCategoryId("");
    setAmount("");
    setSpentOn(today());
    setNote("");
    setError(undefined);
  }

  function pickCategory(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat?.fixedAmount != null && (amount === "" || amount === "0")) {
      setAmount(String(cat.fixedAmount));
    }
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    try {
      const result = await createExpense(undefined, formData);
      if (result.ok) {
        toast.success("Затрата добавлена");
        setOpen(false);
        reset();
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
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        + Добавить затрату
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Новая затрата">
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="propertyId" value={propertyId} />

          <div className="space-y-2">
            <Label className="text-base">Категория</Label>
            <select
              name="categoryId"
              value={categoryId}
              onChange={(e) => pickCategory(e.target.value)}
              className="border-input bg-background h-11 w-full rounded-lg border px-3 text-base"
            >
              <option value="">Без категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-base">Сумма</Label>
              <Input
                type="number"
                name="amount"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">Дата</Label>
              <DateField
                name="spentOn"
                value={spentOn}
                onChange={setSpentOn}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base">Заметка (необязательно)</Label>
            <Input
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11 text-base"
            />
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
    </>
  );
}
