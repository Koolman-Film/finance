"use client";

import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { THAI_MONTH_FULL, toBuddhistYear } from "@/lib/thai-date";
import { cn } from "@/lib/utils";

/// Radix Select disallows empty string as a value, so we use a sentinel that
/// the wrapper translates to "" on the way out and back to the sentinel on
/// the way in. Callers see plain "" / "YYYY-MM" strings.
const ALL = "__all__";

type Props = {
  /// "" when no month is selected. Otherwise Gregorian "YYYY-MM".
  value: string;
  onValueChange: (next: string) => void;
  yearsBack?: number;
  yearsForward?: number;
  /// Add a "ทั้งหมด" choice to both selects; when either is set to it, the
  /// emitted value becomes "" (no filter).
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function ThaiMonthPicker({
  value,
  onValueChange,
  yearsBack = 5,
  yearsForward = 1,
  allowEmpty,
  emptyLabel = "ทั้งหมด",
  disabled,
  id,
  className,
}: Props) {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  const selectedYear = m ? m[1] : "";
  const selectedMonth = m ? m[2] : "";

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const out: number[] = [];
    for (let y = currentYear + yearsForward; y >= currentYear - yearsBack; y--) out.push(y);
    return out;
  }, [yearsBack, yearsForward]);

  function emit(year: string, month: string) {
    onValueChange(year && month ? `${year}-${month}` : "");
  }

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <Select
        value={selectedMonth || ALL}
        onValueChange={(v) => emit(selectedYear, v === ALL ? "" : v)}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="เดือน" />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value={ALL}>{emptyLabel}</SelectItem>}
          {THAI_MONTH_FULL.map((name, idx) => {
            const m = String(idx + 1).padStart(2, "0");
            return (
              <SelectItem key={m} value={m}>
                {name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select
        value={selectedYear || ALL}
        onValueChange={(v) => emit(v === ALL ? "" : v, selectedMonth)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="ปี" />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value={ALL}>{emptyLabel}</SelectItem>}
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {toBuddhistYear(y)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
