"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { THAI_MONTH_FULL, toBuddhistYear } from "@/lib/thai-date";
import { cn } from "@/lib/utils";

type Props = {
  /// Gregorian "YYYY-MM-DD" or "" when no date is picked.
  value: string;
  onValueChange: (next: string) => void;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

function parseIsoLocal(value: string): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  // Build at local midnight so the Date isn't shifted by the user's TZ
  // (vs `new Date("2026-05-21")` which is UTC midnight).
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatThaiFullDate(date: Date): string {
  return `${date.getDate()} ${THAI_MONTH_FULL[date.getMonth()]} ${toBuddhistYear(date.getFullYear())}`;
}

export function ThaiDatePicker({
  value,
  onValueChange,
  id,
  disabled,
  className,
  placeholder = "เลือกวันที่",
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoLocal(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 opacity-70" />
          {selected ? formatThaiFullDate(selected) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(2000, 0)}
          endMonth={new Date(new Date().getFullYear() + 5, 11)}
          onSelect={(d) => {
            if (d) {
              onValueChange(toIsoLocal(d));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
