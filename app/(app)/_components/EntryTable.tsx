"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Lock, Paperclip } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppUser } from "@/lib/auth";
import { updateExpenseGroup } from "@/lib/entry-actions";
import { formatThaiDate, formatThb } from "@/lib/format";

import type { TaxonomyOption } from "./EntryForm";
import type { EntryWithRelations } from "./types";

type Props = {
  type: "INCOME" | "EXPENSE";
  entries: EntryWithRelations[];
  lockedMonths: Set<string>;
  /// Expense-only: the active list of admin-managed กลุ่มค่าใช้จ่าย used by
  /// the inline editor in each row. Unused for income tables.
  expenseGroups?: TaxonomyOption[];
  currentUser?: AppUser;
};

export function EntryTable({
  type,
  entries,
  lockedMonths,
  expenseGroups = [],
  currentUser,
}: Props) {
  const pathname = usePathname();
  const search = useSearchParams();

  function editHref(id: string) {
    const next = new URLSearchParams(search.toString());
    next.delete("add");
    next.set("edit", id);
    return `${pathname}?${next.toString()}`;
  }

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
        ยังไม่มีรายการในช่วงนี้ — กด <span className="font-semibold">“+ เพิ่มรายการ”</span>{" "}
        เพื่อเริ่มบันทึก
      </div>
    );
  }

  const isIncome = type === "INCOME";
  const isExpense = type === "EXPENSE";
  const canEditGroup = currentUser?.role === "ADMIN";

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-muted/60 text-sm">
            <th className="p-3 font-medium">วันที่</th>
            <th className="p-3 font-medium">รายละเอียด</th>
            {isIncome && (
              <>
                <th className="p-3 font-medium">จองผ่าน</th>
                <th className="p-3 font-medium">ทะเบียนรถ</th>
                <th className="p-3 font-medium">สินค้าที่ขาย</th>
              </>
            )}
            {isExpense && (
              <>
                <th className="p-3 font-medium">กลุ่มค่าใช้จ่าย</th>
                <th className="p-3 font-medium">จ่ายจาก</th>
              </>
            )}
            <th className="p-3 font-medium">สาขา</th>
            <th className="p-3 font-medium">ผู้บันทึก</th>
            <th className="p-3 text-right font-medium">จำนวนเงิน (บาท)</th>
            <th className="p-3 font-medium">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const locked = lockedMonths.has(e.yyyyMm);
            const summary = isIncome
              ? e.custName ||
                e.productType?.name ||
                e.soldProduct?.name ||
                e.bookedProduct?.name ||
                "-"
              : e.expenseDetail || "-";
            return (
              <tr key={e.id} className="hover:bg-muted/30 border-b text-sm">
                <td className="p-3 whitespace-nowrap">{formatThaiDate(e.date)}</td>
                <td className="p-3 font-medium">
                  {summary}
                  {e.files && e.files.length > 0 && (
                    <Paperclip
                      className="text-muted-foreground ml-1 inline size-3.5"
                      aria-label={`${e.files.length} ไฟล์แนบ`}
                    />
                  )}
                </td>
                {isIncome && (
                  <>
                    <td className="text-muted-foreground p-3 whitespace-nowrap">
                      {e.bookingChannel?.name ?? "—"}
                    </td>
                    <td className="text-muted-foreground p-3 whitespace-nowrap">
                      {e.license || "—"}
                    </td>
                    <td className="text-muted-foreground p-3">{e.soldProduct?.name ?? "—"}</td>
                  </>
                )}
                {isExpense && (
                  <>
                    <td className="p-3">
                      <ExpenseGroupCell
                        entryId={e.id}
                        currentValue={e.expenseGroupId ?? ""}
                        currentName={e.expenseGroup?.name ?? null}
                        options={expenseGroups}
                        editable={canEditGroup && !locked}
                        locked={locked}
                      />
                    </td>
                    <td className="text-muted-foreground p-3 whitespace-nowrap">
                      {e.expenseSource?.name ?? "—"}
                    </td>
                  </>
                )}
                <td className="p-3 whitespace-nowrap">{e.branch.name}</td>
                <td className="text-muted-foreground p-3 whitespace-nowrap">
                  {e.createdBy?.displayName ?? "—"}
                </td>
                <td className="p-3 text-right font-semibold whitespace-nowrap">
                  {formatThb(e.amount.toString())}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {locked ? (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <Lock className="size-3" /> ล็อค
                    </span>
                  ) : (
                    <Link
                      href={editHref(e.id)}
                      className="text-primary hover:underline"
                      scroll={false}
                    >
                      แก้ไข
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/// Inline editor for the กลุ่มค่าใช้จ่าย column. ADMIN sees a Select that
/// fires updateExpenseGroup on change; everyone else (and locked months)
/// sees the value as plain text. Errors surface below the cell.
const CLEAR_VALUE = "__none__";

function ExpenseGroupCell({
  entryId,
  currentValue,
  currentName,
  options,
  editable,
  locked,
}: {
  entryId: string;
  currentValue: string;
  currentName: string | null;
  options: TaxonomyOption[];
  editable: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editable) {
    return (
      <span className="text-muted-foreground whitespace-nowrap">
        {currentName ?? "—"}
        {locked && (
          <Lock className="ml-1 inline size-3 opacity-60" aria-label="เดือนถูกล็อค แก้ไขไม่ได้" />
        )}
      </span>
    );
  }

  function onChange(next: string) {
    const nextId = next === CLEAR_VALUE ? null : next;
    setError(null);
    startTransition(async () => {
      const res = await updateExpenseGroup(entryId, nextId);
      if (!res.ok) {
        // updateExpenseGroup never returns the idle variant, so error is set.
        setError("error" in res ? res.error : "บันทึกไม่สำเร็จ");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="min-w-[10rem] space-y-1">
      <Select
        value={currentValue === "" ? CLEAR_VALUE : currentValue}
        onValueChange={onChange}
        disabled={pending}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="— เลือกกลุ่ม —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CLEAR_VALUE}>— ยังไม่ระบุ —</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-destructive flex items-center gap-1 text-xs">
          <AlertCircle className="size-3" /> {error}
        </p>
      )}
    </div>
  );
}
