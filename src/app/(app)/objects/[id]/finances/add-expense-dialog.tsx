"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyzeReceipt, createExpense } from "../../actions";

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
  const [photoUrl, setPhotoUrl] = useState("");
  const [source, setSource] = useState<"MANUAL" | "AI">("MANUAL");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setCategoryId("");
    setAmount("");
    setSpentOn(today());
    setNote("");
    setPhotoUrl("");
    setSource("MANUAL");
    setError(undefined);
  }

  function pickCategory(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat?.fixedAmount != null && (amount === "" || amount === "0")) {
      setAmount(String(cat.fixedAmount));
    }
  }

  async function handlePhoto(file: File) {
    setAnalyzing(true);
    setError(undefined);
    try {
      const fd = new FormData();
      fd.set("photo", file);
      fd.set("categories", categories.map((c) => c.name).join("|"));
      const result = await analyzeReceipt(fd);
      if (result.ok) {
        setAmount(String(result.amount));
        setNote(result.note);
        setPhotoUrl(result.photoUrl);
        setSource("AI");
        const match = categories.find(
          (c) => c.name.toLowerCase() === result.categoryName.toLowerCase(),
        );
        if (match) setCategoryId(match.id);
        toast.success("Чек распознан — проверьте данные");
      } else {
        setError(result.error);
      }
    } catch {
      setError("Не удалось обработать фото");
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новая затрата"
      >
        <div className="space-y-4">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhoto(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={analyzing}
              onClick={() => fileRef.current?.click()}
              className="h-11 w-full text-base"
            >
              {analyzing ? "Распознаём чек…" : "Распознать фото чека"}
            </Button>
            <p className="text-muted-foreground mt-1 text-xs">
              Сфотографируйте чек — AI заполнит поля сам.
            </p>
          </div>

          <form action={handleSubmit} className="space-y-4">
            <input type="hidden" name="propertyId" value={propertyId} />
            <input type="hidden" name="photoUrl" value={photoUrl} />
            <input type="hidden" name="source" value={source} />

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
                <Input
                  type="date"
                  name="spentOn"
                  value={spentOn}
                  onChange={(e) => setSpentOn(e.target.value)}
                  required
                  className="h-11"
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

            {photoUrl && (
              <p className="text-muted-foreground text-xs">
                Фото чека прикреплено{source === "AI" ? " · распознано AI" : ""}.
              </p>
            )}
            {error && (
              <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={pending || analyzing}
              className="h-11 w-full text-base"
            >
              {pending ? "Сохранение…" : "Сохранить"}
            </Button>
          </form>
        </div>
      </Modal>
    </>
  );
}
