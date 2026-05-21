"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertCircle, Loader2, Lock, Unlock } from "lucide-react";

import { ThaiMonthPicker } from "@/components/ThaiMonthPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lockMonth, unlockMonth, type ActionResult } from "@/lib/admin-actions";
import { formatThaiYyyyMm } from "@/lib/thai-date";

const IDLE: ActionResult = { ok: false, error: "" };

type LockRow = {
  yyyyMm: string;
  note: string | null;
  lockedAt: string;
  lockedByName: string | null;
};

export function LocksManager({ locks }: { locks: LockRow[] }) {
  const [state, formAction, pending] = useActionState(lockMonth, IDLE);
  const [formKey, setFormKey] = useState(0);
  // The ThaiMonthPicker is controlled — we own its value here so we can clear
  // it on success, and so the hidden `yyyyMm` input gets the right form data.
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormKey((k) => k + 1);

      setSelectedMonth("");
    }
  }, [state]);

  const fieldErrors: Record<string, string> =
    state && "ok" in state && !state.ok && "fieldErrors" in state ? (state.fieldErrors ?? {}) : {};

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">ล็อคเดือนใหม่</h2>
        <p className="text-muted-foreground mb-3 text-sm">
          เมื่อล็อคเดือนแล้ว ทุกคน (รวมถึงผู้ดูแลระบบ) จะไม่สามารถเพิ่มหรือแก้ไขรายการในเดือนนั้นได้
          จนกว่าจะปลดล็อค
        </p>

        <form
          key={formKey}
          action={formAction}
          className="bg-muted/30 grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_2fr_auto] md:items-end"
        >
          <input type="hidden" name="yyyyMm" value={selectedMonth} />
          <div className="space-y-1.5">
            <Label htmlFor="lock-month">เดือนที่จะล็อค</Label>
            <ThaiMonthPicker
              id="lock-month"
              value={selectedMonth}
              onValueChange={setSelectedMonth}
              yearsBack={3}
              yearsForward={0}
            />
            {fieldErrors.yyyyMm && <p className="text-destructive text-xs">{fieldErrors.yyyyMm}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lock-note">หมายเหตุ (ถ้ามี)</Label>
            <Input
              id="lock-note"
              name="note"
              maxLength={500}
              placeholder="เช่น ปิดงบเดือนนี้แล้ว"
            />
          </div>
          <Button type="submit" disabled={pending || !selectedMonth}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            ล็อค
          </Button>
        </form>

        {state && "ok" in state && !state.ok && state.error && (
          <p className="text-destructive mt-2 flex items-center gap-1.5 text-sm">
            <AlertCircle className="size-4" />
            {state.error}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">เดือนที่ถูกล็อคไว้ ({locks.length})</h2>
        {locks.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
            ยังไม่มีเดือนที่ถูกล็อค
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {locks.map((l) => (
              <LockRowView key={l.yyyyMm} lock={l} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LockRowView({ lock }: { lock: LockRow }) {
  const [pending, startTransition] = useTransition();

  function unlock() {
    startTransition(async () => {
      await unlockMonth(lock.yyyyMm);
    });
  }

  return (
    <li className="flex items-center gap-4 p-3 text-sm">
      <Lock className="text-muted-foreground size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">
          {formatThaiYyyyMm(lock.yyyyMm)}{" "}
          <span className="text-muted-foreground ml-1 font-mono text-xs">({lock.yyyyMm})</span>
        </p>
        {lock.note && <p className="text-muted-foreground text-xs">{lock.note}</p>}
        <p className="text-muted-foreground mt-0.5 text-xs">
          ล็อคโดย {lock.lockedByName ?? "—"} ·{" "}
          {new Date(lock.lockedAt).toLocaleString("th-TH-u-ca-buddhist")}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={unlock} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Unlock className="size-4" />}
        ปลดล็อค
      </Button>
    </li>
  );
}
