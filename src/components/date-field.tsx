"use client";

import { CalendarDays } from "lucide-react";
import { useRef, useState } from "react";

function isoToText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
}

// Из набора цифр делает «дд.мм.гггг» — точки подставляются сами.
function formatDigits(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length > 2) out += "." + d.slice(2, 4);
  if (d.length > 4) out += "." + d.slice(4, 8);
  return out;
}

function textToIso(text: string): string {
  const d = text.replace(/\D/g, "");
  if (d.length !== 8) return "";
  const day = Number(d.slice(0, 2));
  const mon = Number(d.slice(2, 4));
  const year = Number(d.slice(4, 8));
  if (mon < 1 || mon > 12 || day < 1 || day > 31 || year < 1900) return "";
  const iso = `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
  const dt = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime()) || dt.getUTCDate() !== day) return "";
  return iso;
}

// Поле даты: можно вписывать цифры (точки появляются сами) или выбрать
// дату в календаре по кнопке.
export function DateField({
  name,
  value,
  onChange,
  required,
  min,
}: {
  name?: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  min?: string;
}) {
  const [text, setText] = useState(() => isoToText(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const pickerRef = useRef<HTMLInputElement>(null);

  // Подхватываем изменение даты извне, не затирая текущий ввод.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (textToIso(text) !== value) setText(isoToText(value));
  }

  function handleText(raw: string) {
    const formatted = formatDigits(raw);
    setText(formatted);
    onChange(textToIso(formatted));
  }

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <input
        inputMode="numeric"
        value={text}
        onChange={(e) => handleText(e.target.value)}
        placeholder="дд.мм.гггг"
        required={required}
        className="border-input bg-background h-11 w-full rounded-lg border px-3 pr-11 text-base tabular-nums"
      />
      <button
        type="button"
        aria-label="Открыть календарь"
        onClick={() => {
          try {
            pickerRef.current?.showPicker();
          } catch {
            /* календарь недоступен — можно вписать дату вручную */
          }
        }}
        className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2"
      >
        <CalendarDays className="size-5" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={value}
        min={min}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onChange(e.target.value);
          setText(isoToText(e.target.value));
        }}
        className="pointer-events-none absolute right-3 bottom-1 size-4 opacity-0"
      />
    </div>
  );
}
