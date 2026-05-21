"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, FileText } from "lucide-react";

import { ThaiMonthPicker } from "@/components/ThaiMonthPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentYyyyMm } from "@/lib/thai-date";

type Props = {
  branches: { id: string; name: string }[];
  canSelectAllBranches: boolean;
};

export function FilterBar({ branches, canSelectAllBranches }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [, startTransition] = useTransition();

  const branchValue =
    search.get("branch") ?? (canSelectAllBranches ? "all" : (branches[0]?.id ?? ""));

  // Mirror lib/filters.ts: no `month` param = default to current; `month=all`
  // = user explicitly chose "ทั้งหมด" (no month filter).
  const monthParam = search.get("month");
  const monthValue =
    monthParam === "all"
      ? ""
      : monthParam && /^\d{4}-\d{2}$/.test(monthParam)
        ? monthParam
        : currentYyyyMm();

  function update(key: string, value: string) {
    const next = new URLSearchParams(search.toString());
    if (key === "branch") {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    } else if (key === "month") {
      // "" from the picker means the user picked "ทั้งหมด" — record it
      // explicitly so we don't fall back to the current-month default.
      if (!value) next.set("month", "all");
      else next.set("month", value);
    } else {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    startTransition(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`));
  }

  const branchDisabled = !canSelectAllBranches && branches.length <= 1;

  return (
    <div className="bg-card text-card-foreground mb-4 grid grid-cols-1 items-end gap-3 rounded-xl border p-4 shadow-sm md:grid-cols-4 md:p-5">
      <div className="space-y-1.5">
        <Label>สาขา</Label>
        <Select
          value={branchValue}
          onValueChange={(v) => update("branch", v)}
          disabled={branchDisabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {canSelectAllBranches && <SelectItem value="all">ทุกสาขา</SelectItem>}
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="month-filter">เดือน</Label>
        <ThaiMonthPicker
          id="month-filter"
          value={monthValue}
          onValueChange={(v) => update("month", v)}
          allowEmpty
        />
      </div>
      <div className="flex gap-2 md:col-span-2">
        <Button variant="secondary" className="flex-1" disabled title="จะเปิดใช้งานในเวอร์ชันถัดไป">
          <FileText className="size-4" /> PDF
        </Button>
        <Button variant="secondary" className="flex-1" disabled title="จะเปิดใช้งานในเวอร์ชันถัดไป">
          <FileSpreadsheet className="size-4" /> Excel
        </Button>
      </div>
    </div>
  );
}
