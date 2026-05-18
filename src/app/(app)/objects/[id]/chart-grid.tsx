"use client";

import { addDays, format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DateField } from "@/components/date-field";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RATE_LABELS,
  type RateType,
  paidThroughDays,
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
  status: string;
  agreedAmount: number;
  paidTotal: number;
  refundAmount: number | null;
  refundedAt: string | null;
};

export type ChartRoom = {
  id: string;
  buildingName: string;
  roomName: string;
  buildingColor: string | null;
  beds: ChartBed[];
};

// Цвета полосок проживания
const CLR_PAID = "#a7f3d0"; // оплаченные дни — зелёный
const CLR_DUE = "#fde68a"; // неоплаченные дни — жёлтый
const CLR_OVERDUE = "#fda4af"; // просрочено — красный

function fmtDate(iso: string): string {
  return iso.split("-").reverse().join(".");
}

function addDaysIso(iso: string, n: number): string {
  return format(addDays(new Date(iso), n), "yyyy-MM-dd");
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
  openStayId,
  openPanel,
}: {
  propertyId: string;
  days: string[];
  rooms: ChartRoom[];
  stays: ChartStay[];
  residentNames: string[];
  monthLabel: string;
  prevMonth: string;
  nextMonth: string;
  openStayId?: string;
  openPanel?: "extend" | "checkout";
}) {
  const [dialog, setDialog] = useState<DialogState>(() => {
    if (!openStayId) return null;
    const stay = stays.find((s) => s.id === openStayId);
    if (!stay) return null;
    for (const room of rooms) {
      const bed = room.beds.find((b) => b.id === stay.bedId);
      if (bed) return { type: "view", bed, stay };
    }
    return null;
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-start gap-3">
        <Link
          href={`?month=${prevMonth}`}
          className="bg-card hover:bg-muted rounded-lg border px-3 py-2 text-lg"
        >
          ←
        </Link>
        <span className="min-w-40 text-center text-lg font-semibold sm:min-w-44">
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
        <Legend color={CLR_PAID} label="Оплаченные дни" />
        <Legend color={CLR_DUE} label="Есть долг" />
        <Legend color={CLR_OVERDUE} label="Срок истёк" />
      </div>

      <p className="text-muted-foreground text-sm">
        Нажмите на свободную клетку, чтобы заселить жильца. Нажмите на полоску
        жильца, чтобы открыть заселение.
      </p>

      <div className="bg-card max-h-[72vh] overflow-auto overscroll-none rounded-lg border">
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-sm"
          style={{ minWidth: `${104 + days.length * 25}px` }}
        >
          <thead>
            <tr>
              <th className="bg-muted sticky left-0 top-0 z-40 w-[104px] border-b border-r px-2 py-2 text-left">
                Место
              </th>
              {days.map((d) => {
                const dayNum = Number(d.slice(8, 10));
                const isToday = d === today;
                return (
                  <th
                    key={d}
                    className={`sticky top-0 z-30 border-b border-r px-0 py-2 text-center text-xs font-medium ${
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
                stays={stays}
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
          today={today}
          initialPanel={
            dialog.stay.id === openStayId ? openPanel : undefined
          }
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

type RowSegment =
  | { kind: "free"; idx: number }
  | { kind: "stay"; stay: ChartStay; span: number; startIdx: number };

// Разбивает строку места на отрезки: свободные клетки и полоски проживаний.
function buildRow(bedId: string, days: string[], stays: ChartStay[]): RowSegment[] {
  const segs: RowSegment[] = [];
  let i = 0;
  while (i < days.length) {
    const stay = stays.find(
      (s) => s.bedId === bedId && s.dateFrom <= days[i] && days[i] < s.dateTo,
    );
    if (stay) {
      let span = 1;
      while (i + span < days.length && days[i + span] < stay.dateTo) span++;
      segs.push({ kind: "stay", stay, span, startIdx: i });
      i += span;
    } else {
      segs.push({ kind: "free", idx: i });
      i++;
    }
  }
  return segs;
}

function ChartRoomRows({
  room,
  days,
  today,
  stays,
  onCreate,
  onView,
}: {
  room: ChartRoom;
  days: string[];
  today: string;
  stays: ChartStay[];
  onCreate: (bed: ChartBed, date: string) => void;
  onView: (bed: ChartBed, stay: ChartStay) => void;
}) {
  const tint = room.buildingColor;
  return (
    <>
      <tr>
        <td colSpan={days.length + 1} className="bg-muted border-b p-0">
          <div
            className="bg-muted text-muted-foreground sticky left-0 z-20 w-fit px-2 py-1.5 text-xs font-semibold"
            style={tint ? { boxShadow: `inset 3px 0 0 ${tint}` } : undefined}
          >
            {room.buildingName} — {room.roomName}
          </div>
        </td>
      </tr>
      {room.beds.map((bed) => (
        <tr key={bed.id}>
          <td
            className="bg-card sticky left-0 z-20 w-[104px] truncate border-b border-r px-2 py-2 text-xs font-medium"
            style={tint ? { boxShadow: `inset 3px 0 0 ${tint}` } : undefined}
          >
            {bed.label}
          </td>
          {buildRow(bed.id, days, stays).map((seg) => {
            if (seg.kind === "free") {
              const d = days[seg.idx];
              return (
                <td
                  key={d}
                  onClick={() => onCreate(bed, d)}
                  className={`hover:bg-primary/10 h-9 cursor-pointer border-b border-r ${
                    d === today ? "bg-primary/5" : ""
                  }`}
                />
              );
            }
            return (
              <StayCell
                key={seg.stay.id + seg.startIdx}
                seg={seg}
                days={days}
                today={today}
                onClick={() => onView(bed, seg.stay)}
              />
            );
          })}
        </tr>
      ))}
    </>
  );
}

function StayCell({
  seg,
  days,
  today,
  onClick,
}: {
  seg: { stay: ChartStay; span: number; startIdx: number };
  days: string[];
  today: string;
  onClick: () => void;
}) {
  const { stay, span, startIdx } = seg;
  const totalDays = stayDays(new Date(stay.dateFrom), new Date(stay.dateTo));
  const paidDays = paidThroughDays(stay.paidTotal, stay.agreedAmount, totalDays);
  const paidUntil = addDaysIso(stay.dateFrom, paidDays);

  const spanDays = days.slice(startIdx, startIdx + span);
  const paidInSpan = spanDays.filter((d) => d < paidUntil).length;
  const pct = Math.round((paidInSpan / span) * 100);

  const balance = stay.agreedAmount - stay.paidTotal;
  const overdue = stay.dateTo <= today && balance > 0;
  const restColor = overdue ? CLR_OVERDUE : CLR_DUE;

  return (
    <td
      colSpan={span}
      onClick={onClick}
      title={`${stay.residentName} · ${fmtDate(stay.dateFrom)}–${fmtDate(stay.dateTo)}`}
      className="h-9 cursor-pointer overflow-hidden border-b border-r"
      style={{
        background: `linear-gradient(90deg, ${CLR_PAID} 0 ${pct}%, ${restColor} ${pct}% 100%)`,
      }}
    >
      <span className="block truncate px-1.5 text-center text-xs font-medium text-neutral-900">
        {stay.residentName}
      </span>
    </td>
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
  const [rateType, setRateType] = useState<RateType>("MONTHLY");
  const [received, setReceived] = useState("0");
  const [receivedEdited, setReceivedEdited] = useState(false);
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [nip, setNip] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  // «to» — день выезда (не оплачивается). Количество ночей = to − from.
  const nights =
    from && to && to > from ? stayDays(new Date(from), new Date(to)) : 0;
  const suggested =
    nights > 0
      ? suggestAmount(rateType, new Date(from), new Date(to), bed)
      : 0;

  useEffect(() => {
    if (!receivedEdited) setReceived(String(suggested));
  }, [suggested, receivedEdited]);

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
            <Label className="text-base">От</Label>
            <DateField name="dateFrom" value={from} onChange={setFrom} required />
          </div>
          <div className="space-y-2">
            <Label className="text-base">До</Label>
            <DateField
              name="dateTo"
              value={to}
              min={from || undefined}
              onChange={setTo}
              required
            />
          </div>
        </div>
        <RateSelect name="rateType" value={rateType} onChange={setRateType} />
        <SuggestBox
          label={`К оплате по тарифу${nights > 0 ? ` (за ${nights} ноч.)` : ""}`}
          value={suggested}
        />
        <AmountField
          label="Сумма получена"
          name="received"
          value={received}
          onChange={(v) => {
            setReceived(v);
            setReceivedEdited(true);
          }}
        />
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-base">
            <input
              type="checkbox"
              name="needsInvoice"
              checked={needsInvoice}
              onChange={(e) => setNeedsInvoice(e.target.checked)}
              className="size-4"
            />
            Нужна фактура
          </label>
          {needsInvoice && (
            <Input
              name="nip"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Номер NIP"
              className="h-11 text-base"
            />
          )}
        </div>
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

type Panel = "main" | "pay" | "extend" | "checkout" | "confirmDelete";

function StayDialog({
  bed,
  stay,
  propertyId,
  today,
  initialPanel,
  onClose,
}: {
  bed: ChartBed;
  stay: ChartStay;
  propertyId: string;
  today: string;
  initialPanel?: "extend" | "checkout";
  onClose: () => void;
}) {
  const [panel, setPanel] = useState<Panel>(initialPanel ?? "main");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const nights = stayDays(new Date(stay.dateFrom), new Date(stay.dateTo));
  const balance = stay.agreedAmount - stay.paidTotal;
  const ended = stay.status === "ENDED";

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
              {fmtDate(stay.dateFrom)} — {fmtDate(stay.dateTo)}{" "}
              ({nights} ноч.)
            </Row>
            <Row label="Тариф">{RATE_LABELS[stay.rateType]}</Row>
            {ended && <Row label="Статус">Выехал</Row>}
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

          {stay.refundedAt && stay.refundAmount != null && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Возврат выдан: {formatMoney(stay.refundAmount)}.
            </p>
          )}

          {balance > 0 && (
            <Button
              onClick={() => setPanel("pay")}
              className="h-11 w-full text-base"
            >
              Принять оплату
            </Button>
          )}

          {!ended && (
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
                onClick={() => setPanel("checkout")}
                disabled={pending}
                className="h-11"
              >
                Выселить
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setPanel("confirmDelete")}
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

      {panel === "checkout" && (
        <CheckoutPanel
          bed={bed}
          stay={stay}
          propertyId={propertyId}
          today={today}
          pending={pending}
          error={error}
          onBack={() => {
            setPanel("main");
            setError(undefined);
          }}
          onSubmit={(fd) => submitForm(checkoutStay, fd, "Жилец выселен")}
        />
      )}

      {panel === "confirmDelete" && (
        <div className="space-y-4">
          <p className="text-sm">
            Удалить заселение «{stay.residentName}» полностью? Это действие
            нельзя отменить, оплаты по нему тоже удалятся.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPanel("main")}
              disabled={pending}
              className="h-11 flex-1"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() =>
                runVoid(() => {
                  const fd = new FormData();
                  fd.set("id", stay.id);
                  fd.set("propertyId", propertyId);
                  return deleteStay(fd);
                }, "Заселение удалено")
              }
              disabled={pending}
              className="bg-destructive h-11 flex-1 text-white"
            >
              Удалить
            </Button>
          </div>
        </div>
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
        name="amount"
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
  // «до» — день выезда. Продление начинается с текущего дня выезда.
  const currentDo = stay.dateTo;
  const [newDateTo, setNewDateTo] = useState(currentDo);
  const [rateType, setRateType] = useState<RateType>(stay.rateType);
  const [received, setReceived] = useState("0");
  const [receivedEdited, setReceivedEdited] = useState(false);

  const extNights =
    newDateTo > currentDo
      ? stayDays(new Date(currentDo), new Date(newDateTo))
      : 0;
  const suggested =
    extNights > 0
      ? suggestAmount(rateType, new Date(stay.dateTo), new Date(newDateTo), bed)
      : 0;

  useEffect(() => {
    if (!receivedEdited) setReceived(String(suggested));
  }, [suggested, receivedEdited]);

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="stayId" value={stay.id} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <p className="text-muted-foreground -mt-1 text-sm">
        Текущая дата выезда: {fmtDate(currentDo)}. Продление считается
        отдельно — со своей суммой к оплате.
      </p>
      <div className="space-y-2">
        <Label className="text-base">Новая дата выезда</Label>
        <DateField
          name="newDateTo"
          value={newDateTo}
          min={stay.dateTo}
          onChange={setNewDateTo}
          required
        />
      </div>
      <RateSelect name="rateType" value={rateType} onChange={setRateType} />
      <SuggestBox
        label={`К оплате по тарифу${extNights > 0 ? ` (за ${extNights} ноч.)` : ""}`}
        value={suggested}
      />
      <AmountField
        label="Доплата получена"
        name="received"
        value={received}
        onChange={(v) => {
          setReceived(v);
          setReceivedEdited(true);
        }}
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
          {pending ? "Сохранение…" : "Продлить"}
        </Button>
      </div>
    </form>
  );
}

function CheckoutPanel({
  bed,
  stay,
  propertyId,
  today,
  pending,
  error,
  onBack,
  onSubmit,
}: {
  bed: ChartBed;
  stay: ChartStay;
  propertyId: string;
  today: string;
  pending: boolean;
  error?: string;
  onBack: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const defaultDate = today >= stay.dateFrom ? today : stay.dateFrom;
  const [actualDateTo, setActualDateTo] = useState(defaultDate);
  const [rateType, setRateType] = useState<RateType>(stay.rateType);
  const [withRefund, setWithRefund] = useState(false);

  // actualDateTo — фактический день выезда (не оплачивается).
  const actualNights =
    actualDateTo > stay.dateFrom
      ? stayDays(new Date(stay.dateFrom), new Date(actualDateTo))
      : 0;
  const recomputed =
    actualNights > 0
      ? suggestAmount(
          rateType,
          new Date(stay.dateFrom),
          new Date(actualDateTo),
          bed,
        )
      : 0;
  // Ранний выезд не может увеличить сумму к оплате.
  const owed = Math.min(stay.agreedAmount, recomputed);
  const refund = Math.max(0, stay.paidTotal - owed);

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="stayId" value={stay.id} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <input
        type="hidden"
        name="withRefund"
        value={withRefund ? "on" : ""}
      />
      <p className="text-muted-foreground -mt-1 text-sm">
        Жилец выезжает раньше срока. Укажите день выезда — за этот день оплата
        не берётся, место с него свободно.
      </p>
      <div className="space-y-2">
        <Label className="text-base">Фактическая дата выезда</Label>
        <DateField
          name="actualDateTo"
          value={actualDateTo}
          min={stay.dateFrom}
          onChange={setActualDateTo}
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-base">
          Возвращаете деньги за непрожитые дни?
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceButton active={!withRefund} onClick={() => setWithRefund(false)}>
            Без возврата
          </ChoiceButton>
          <ChoiceButton active={withRefund} onClick={() => setWithRefund(true)}>
            Сделать возврат
          </ChoiceButton>
        </div>
      </div>

      {withRefund ? (
        <>
          <RateSelect
            name="refundRateType"
            label="Пересчитать по тарифу"
            value={rateType}
            onChange={setRateType}
          />
          <div className="bg-muted space-y-1 rounded-lg p-3 text-sm">
            <Row label="Ночей проживания">{actualNights} ноч.</Row>
            <Row label="Стоимость проживания">{formatMoney(owed)}</Row>
            <Row label="Уже оплачено">{formatMoney(stay.paidTotal)}</Row>
            <div className="flex justify-between gap-4 border-t pt-1">
              <dt className="font-medium">К возврату жильцу</dt>
              <dd
                className={`font-semibold ${
                  refund > 0 ? "text-emerald-700" : ""
                }`}
              >
                {formatMoney(refund)}
              </dd>
            </div>
          </div>
          {refund > 0 && (
            <p className="text-muted-foreground text-xs">
              Сумму можно будет выдать отдельной кнопкой после выселения.
            </p>
          )}
        </>
      ) : (
        <input type="hidden" name="refundRateType" value="DAILY" />
      )}

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
          {pending ? "Сохранение…" : "Выселить"}
        </Button>
      </div>
    </form>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function RateSelect({
  name,
  label = "Тариф",
  value,
  onChange,
}: {
  name: string;
  label?: string;
  value: RateType;
  onChange: (v: RateType) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      <select
        name={name}
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

function SuggestBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted flex items-center justify-between rounded-lg px-3 py-2.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-semibold">{formatMoney(value)}</span>
    </div>
  );
}

function AmountField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      <Input
        type="number"
        name={name}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-base"
      />
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
