"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Lock, Paperclip } from "lucide-react";

import { formatThaiDate, formatThb } from "@/lib/format";

import type { EntryWithRelations } from "./types";

type Props = {
  type: "INCOME" | "EXPENSE";
  entries: EntryWithRelations[];
  lockedMonths: Set<string>;
};

export function EntryTable({ type, entries, lockedMonths }: Props) {
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

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-muted/60 text-sm">
            <th className="p-3 font-medium">วันที่</th>
            <th className="p-3 font-medium">รายละเอียด</th>
            <th className="p-3 font-medium">สาขา</th>
            <th className="p-3 font-medium">ผู้บันทึก</th>
            <th className="p-3 text-right font-medium">จำนวนเงิน (บาท)</th>
            <th className="p-3 font-medium">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const locked = lockedMonths.has(e.yyyyMm);
            const summary =
              type === "INCOME"
                ? e.custName || e.prodType || e.soldProd || "-"
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
