"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type PayState,
  RATE_LABELS,
  type RateType,
  payState,
  stayDays,
  suggestAmount,
} from "@/lib/billing";
import { formatMoney } from "@/lib/format";
import {
  checkoutStay,
  createStay,
  deleteStay,
  extendStay,
  recordPayment,
} from "../actions";

export type ChartBed = {
  id: string;
  label: string;
  buildingName: string;
  roomName: string;
  priceDaily: number;
  priceWeekly: number;
  priceMonthly: number;
};

export type ChartStay = {
  id: string;
  bedId: string;
  residentName: string;
  dateFrom: string;
  dateTo: string;
  rateType: RateType;
  agreedAmount: number;
  paidTotal: number;
};

export type ChartRoom = {
  id: string;
  buildingName: string;
  roomName: string;
  beds: ChartBed[];
};

const STATUS_STYLE: Record<PayState, string> = {
  paid: "bg-emerald-200 text-emerald-950",
  unpaid: "bg-amber-200 text-amber-950",
  overdue: "bg-rose-300 text-rose-950",
};

const STATUS_LABEL: Record<PayState, string> = {
  paid: "Оплачено",
  unpaid: "Есть долг",
  overdue: "Срок истёк",
};

function fmtDate(iso: string): string {
  return iso.split("-").reverse().join(".");
}

type DialogState =
  | { type: "create"; bed: ChartBed; date: string }
  | { type: "view"; bed: ChartBed; stay: ChartStay }
  | null;

export function ChartGrid({
  propertyId,
  days,
  rooms,
  stays,
  residentNames,
  monthLabel,
  prevMonth,
  nextMonth,
}: {
  propertyId: string;
  days: string[];
  rooms: ChartRoom[];
  stays: ChartStay[];
  residentNames: string[];
  monthLabel: string;
  prevMonth: string;
  nextMonth: string;
}) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const today = new Date().toISOString().slice(0, 10);

  function stayFor(bedId: string, day: string): ChartStay | undefined {
    return stays.find(
      (s) => s.bedId === bedId && s.dateFrom <= day && day < s.dateTo,
    );
  }

  function stateOf(s: ChartStay): PayState {
    return payState(s.agreedAmount - s.paidTotal, s.dateTo, today);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <Link
          href={`?month=${prevMonth}`}
          className="bg-card hover:bg-muted rounded-lg border px-3 py-2 text-lg"
        >
          ←
        </Link>
        <span className="min-w-44 text-center text-lg font-semibold">
          {monthLabel}
        </span>
        <Link
          href={`?month=${nextMonth}`}
          className="bg-card hover:bg-muted rounded-lg border px-3 py-2 text-lg"
        >
          →
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {(["paid", "unpaid", "overdue"] as PayState[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-4 rounded-sm ${STATUS_STYLE[s]}`}
            />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      <p className="text-muted-foreground text-sm">
        Нажмите на свободную клетку, чтобы заселить жильца. Нажмите на цветную
        полоску, чтобы открыть заселение.
      </p>

      <div className="bg-card overflow-x-auto rounded-lg border">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="bg-muted sticky left-0 z-20 w-36 min-w-36 border-b border-r px-3 py-2 text-left">
                Место
              </th>
              {days.map((d) => {
                const dayNum = Number(d.slice(8, 10));
                const isToday = d === today;
                return (
                  <th
                    key={d}
                    className={`w-9 min-w-9 border-b border-r px-0 py-2 text-center font-medium ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {dayNum}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <ChartRoomRows
                key={room.id}
                room={room}
                days={days}
                today={today}
                stayFor={stayFor}
                stateOf={stateOf}
                onCreate={(bed, date) => setDialog({ type: "create", bed, date })}
                onView={(bed, stay) => setDialog({ type: "view", bed, stay })}
              />
            ))}
          </tbody>
        </table>
      </div>

      {dialog?.type === "create" && (
        <CheckInDialog
          key={`${dialog.bed.id}-${dialog.date}`}
          bed={dialog.bed}
          date={dialog.date}
          propertyId={propertyId}
          residentNames={residentNames}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "view" && (
        <StayDialog
          key={dialog.stay.id}
          bed={dialog.bed}
          stay={dialog.stay}
          propertyId={propertyId}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function ChartRoomRows({
  room,
  days,
  today,
  stayFor,
  stateOf,
  onCreate,
  onView,
}: {
  room: ChartRoom;
  days: string[];
  today: string;
  stayFor: (bedId: string, day: string) => ChartStay | undefined;
  stateOf: (s: ChartStay) => PayState;
  onCreate: (bed: ChartBed, date: string) => void;
  onView: (bed: ChartBed, stay: ChartStay) => void;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={days.length + 1}
          className="bg-muted text-muted-foreground sticky left-0 border-b border-t px-3 py-1.5 text-xs font-semibold"
        >
          {room.buildingName} — {room.roomName}
        </td>
      </tr>
      {room.beds.map((bed) => (
        <tr key={bed.id}>
          <td className="bg-card sticky left-0 z-10 w-36 min-w-36 border-b border-r px-3 py-2 font-medium">
            {bed.label}
          </td>
          {days.map((d) => {
            const stay = stayFor(bed.id, d);
            if (stay) {
              const showName =
                d === stay.dateFrom || (d === days[0] && stay.dateFrom < d);
              return (
                <td
                  key={d}
                  onClick={() => onView(bed, stay)}
                  title={stay.residentName}
                  className={`h-9 cursor-pointer border-b border-r ${STATUS_STYLE[stateOf(stay)]}`}
                >
                  {showName && (
                    <span className="pointer-events-none relative z-10 whitespace-nowrap px-1 text-xs font-medium">
                      {stay.residentName}
                    </span>
                  )}
                </td>
              );
            }
            return (
              <td
                key={d}
                onClick={() => onCreate(bed, d)}
                className={`hover:bg-primary/10 h-9 cursor-pointer border-b border-r ${
                  d === today ? "bg-primary/5" : ""
                }`}
              />
            );
          })}
        </tr>
      ))}
    </>
  );
}

function CheckInDialog({
  bed,
  date,
  propertyId,
  residentNames,
  onClose,
}: {
  bed: ChartBed;
  date: string;
  propertyId: string;
  residentNames: string[];
  onClose: () => void;
}) {
  const [residentName, setResidentName] = useState("");
  const [from, setFrom] = useState(date);
  const [to, setTo] = useState("");
  const [rateType, setRateType] = useState<RateType>("DAILY");
  const [amount, setAmount] = useState("0");
  const [amountEdited, setAmountEdited] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const days = from && to && to > from ? stayDays(new Date(from), new Date(to)) : 0;
  const suggested = suggestAmount(rateType, days, bed);

  useEffect(() => {
    if (!amountEdited) setAmount(String(suggested));
  }, [suggested, amountEdited]);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    try {
      const result = await createStay(undefined, formData);
      if (result.ok) {
        toast.success("Жилец заселён");
        onClose();
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
    <Modal open onClose={onClose} title={`Заселить — ${bed.label}`}>
      <p className="text-muted-foreground -mt-3 mb-3 text-sm">
        {bed.buildingName} · {bed.roomName}
      </p>
      <form action={handleSubmit} className="space-y-4">
        <input type="hidden" name="bedId" value={bed.id} />
        <input type="hidden" name="propertyId" value={propertyId} />
        <div className="space-y-2">
          <Label className="text-base">Имя жильца</Label>
          <Input
            name="residentName"
            list="resident-names"
            value={residentName}
            onChange={(e) => setResidentName(e.target.value)}
            required
            placeholder="Например: Сырватюк Наташа"
            className="h-11 text-base"
          />
          <datalist id="resident-names">
            {residentNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-base">Заезд</Label>
            <Input
              type="date"
              name="dateFrom"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Выезд</Label>
            <Input
              type="date"
              name="dateTo"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="h-11"
            />
          </div>
        </div>
        <RateSelect value={rateType} onChange={setRateType} />
        <AmountField
          label={`Сумма к оплате${days > 0 ? ` (за ${days} дн.)` : ""}`}
          value={amount}
          onChange={(v) => {
            setAmount(v);
            setAmountEdited(true);
          }}
          hint={!amountEdited && days > 0}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full text-base"
        >
          {pending ? "Сохранение…" : "Заселить"}
        </Button>
      </form>
    </Modal>
  );
}

function StayDialog({
  bed,
  stay,
  propertyId,
  onClose,
}: {
  bed: ChartBed;
  stay: ChartStay;
  propertyId: string;
  onClose: () => void;
}) {
  const [panel, setPanel] = useState<"main" | "pay" | "extend">("main");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const days = stayDays(new Date(stay.dateFrom), new Date(stay.dateTo));
  const balance = stay.agreedAmount - stay.paidTotal;

  async function runVoid(action: () => Promise<void>, message: string) {
    setPending(true);
    try {
      await action();
      toast.success(message);
      onClose();
    } catch {
      setPending(false);
    }
  }

  async function handleCheckout() {
    if (!window.confirm(`Выселить «${stay.residentName}»? Место освободится.`))
      return;
    await runVoid(() => {
      const fd = new FormData();
      fd.set("id", stay.id);
      fd.set("propertyId", propertyId);
      return checkoutStay(fd);
    }, "Жилец выселен");
  }

  async function handleDelete() {
    if (!window.confirm(`Удалить заселение «${stay.residentName}»?`)) return;
    await runVoid(() => {
      const fd = new FormData();
      fd.set("id", stay.id);
      fd.set("propertyId", propertyId);
      return deleteStay(fd);
    }, "Заселение удалено");
  }

  async function submitForm(
    action: (
      p: undefined,
      fd: FormData,
    ) => Promise<{ ok: boolean; error?: string }>,
    formData: FormData,
    message: string,
  ) {
    setPending(true);
    setError(undefined);
    try {
      const result = await action(undefined, formData);
      if (result.ok) {
        toast.success(message);
        onClose();
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
    <Modal open onClose={onClose} title={stay.residentName}>
      {panel === "main" && (
        <div className="space-y-4">
          <dl className="space-y-2 text-sm">
            <Row label="Место">
              {bed.buildingName} · {bed.roomName} · {bed.label}
            </Row>
            <Row label="Период">
              {fmtDate(stay.dateFrom)} — {fmtDate(stay.dateTo)} ({days} дн.)
            </Row>
            <Row label="Тариф">{RATE_LABELS[stay.rateType]}</Row>
          </dl>

          <div className="bg-muted space-y-1 rounded-lg p-3 text-sm">
            <Row label="Сумма к оплате">{formatMoney(stay.agreedAmount)}</Row>
            <Row label="Оплачено">{formatMoney(stay.paidTotal)}</Row>
            <div className="flex justify-between gap-4 border-t pt-1">
              <dt className="font-medium">Остаток</dt>
              <dd
                className={`font-semibold ${
                  balance > 0 ? "text-destructive" : "text-emerald-700"
                }`}
              >
                {balance > 0 ? formatMoney(balance) : "оплачено полностью"}
              </dd>
            </div>
          </div>

          {balance > 0 && (
            <Button
              onClick={() => setPanel("pay")}
              className="h-11 w-full text-base"
            >
              Принять оплату
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setPanel("extend")}
              disabled={pending}
              className="h-11"
            >
              Продлить срок
            </Button>
            <Button
              variant="outline"
              onClick={handleCheckout}
              disabled={pending}
              className="h-11"
            >
              Выселить
            </Button>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive w-full text-center text-sm"
          >
            Удалить заселение
          </button>
        </div>
      )}

      {panel === "pay" && (
        <PayPanel
          stay={stay}
          propertyId={propertyId}
          balance={balance}
          pending={pending}
          error={error}
          onBack={() => {
            setPanel("main");
            setError(undefined);
          }}
          onSubmit={(fd) => submitForm(recordPayment, fd, "Оплата записана")}
        />
      )}

      {panel === "extend" && (
        <ExtendPanel
          bed={bed}
          stay={stay}
          propertyId={propertyId}
          pending={pending}
          error={error}
          onBack={() => {
            setPanel("main");
            setError(undefined);
          }}
          onSubmit={(fd) => submitForm(extendStay, fd, "Срок продлён")}
        />
      )}
    </Modal>
  );
}

function PayPanel({
  stay,
  propertyId,
  balance,
  pending,
  error,
  onBack,
  onSubmit,
}: {
  stay: ChartStay;
  propertyId: string;
  balance: number;
  pending: boolean;
  error?: string;
  onBack: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [amount, setAmount] = useState(String(balance > 0 ? balance : 0));

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="stayId" value={stay.id} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <p className="text-muted-foreground -mt-1 text-sm">
        Остаток к оплате: {formatMoney(balance)}
      </p>
      <AmountField
        label="Сколько получено"
        value={amount}
        onChange={setAmount}
      />
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-11"
        >
          ← Назад
        </Button>
        <Button type="submit" disabled={pending} className="h-11 flex-1">
          {pending ? "Сохранение…" : "Записать оплату"}
        </Button>
      </div>
    </form>
  );
}

function ExtendPanel({
  bed,
  stay,
  propertyId,
  pending,
  error,
  onBack,
  onSubmit,
}: {
  bed: ChartBed;
  stay: ChartStay;
  propertyId: string;
  pending: boolean;
  error?: string;
  onBack: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [newDateTo, setNewDateTo] = useState(stay.dateTo);
  const [rateType, setRateType] = useState<RateType>(stay.rateType);
  const [amount, setAmount] = useState("0");
  const [amountEdited, setAmountEdited] = useState(false);

  const extDays =
    newDateTo > stay.dateTo
      ? stayDays(new Date(stay.dateTo), new Date(newDateTo))
      : 0;
  const suggested = suggestAmount(rateType, extDays, bed);

  useEffect(() => {
    if (!amountEdited) setAmount(String(suggested));
  }, [suggested, amountEdited]);

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="stayId" value={stay.id} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <p className="text-muted-foreground -mt-1 text-sm">
        Текущая дата выезда: {fmtDate(stay.dateTo)}
      </p>
      <div className="space-y-2">
        <Label className="text-base">Новая дата выезда</Label>
        <Input
          type="date"
          name="newDateTo"
          value={newDateTo}
          min={stay.dateTo}
          onChange={(e) => setNewDateTo(e.target.value)}
          required
          className="h-11"
        />
      </div>
      <RateSelect value={rateType} onChange={setRateType} />
      <AmountField
        label={`Доплата${extDays > 0 ? ` (за ${extDays} дн.)` : ""}`}
        value={amount}
        onChange={(v) => {
          setAmount(v);
          setAmountEdited(true);
        }}
        hint={!amountEdited && extDays > 0}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="markPaid"
          defaultChecked
          className="size-4"
        />
        Оплата за продление получена
      </label>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-11"
        >
          ← Назад
        </Button>
        <Button type="submit" disabled={pending} className="h-11 flex-1">
          {pending ? "Сохранение…" : "Продлить"}
        </Button>
      </div>
    </form>
  );
}

function RateSelect({
  value,
  onChange,
}: {
  value: RateType;
  onChange: (v: RateType) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base">Тариф</Label>
      <select
        name="rateType"
        value={value}
        onChange={(e) => onChange(e.target.value as RateType)}
        className="border-input bg-background h-11 w-full rounded-lg border px-3 text-base"
      >
        <option value="DAILY">Посуточно</option>
        <option value="WEEKLY">Понедельно</option>
        <option value="MONTHLY">Помесячно</option>
      </select>
    </div>
  );
}

function AmountField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      <Input
        type="number"
        name="amount"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-base"
      />
      {hint && (
        <p className="text-muted-foreground text-xs">
          Рассчитано автоматически — сумму можно изменить.
        </p>
      )}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
      {children}
    </p>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
