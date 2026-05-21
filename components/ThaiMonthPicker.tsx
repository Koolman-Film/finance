"use client";

import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listYyyyMmOptions } from "@/lib/thai-date";

/// Radix Select disallows empty string as a value, so we use a sentinel that
/// the wrapper translates to "" on the way out and back to the sentinel on
/// the way in. Callers see plain "" / "YYYY-MM" strings.
const ALL = "__all__";

type Props = {
  /// "" when no month is selected (only meaningful with `allowEmpty`).
  value: string;
  onValueChange: (next: string) => void;
  yearsBack?: number;
  yearsForward?: number;
  allowEmpty?: boolean;
  emptyLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function ThaiMonthPicker({
  value,
  onValueChange,
  yearsBack,
  yearsForward,
  allowEmpty,
  emptyLabel = "ทุกเดือน",
  placeholder = "เลือกเดือน",
  disabled,
  id,
  className,
}: Props) {
  const options = useMemo(
    () => listYyyyMmOptions({ yearsBack, yearsForward }),
    [yearsBack, yearsForward],
  );

  const selectValue = value === "" ? ALL : value;

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => onValueChange(v === ALL ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value={ALL}>{emptyLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
