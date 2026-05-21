"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AppUser } from "@/lib/auth";
import { IDLE, saveEntry, type EntryActionState } from "@/lib/entry-actions";
import { deleteEntryFile, uploadEntryFile } from "@/lib/file-actions";
import { formatThb, toYyyyMm } from "@/lib/format";

import { FileSlot } from "./FileSlot";
import type { EntryWithRelations } from "./types";

type Props = {
  type: "INCOME" | "EXPENSE";
  entry: EntryWithRelations | null;
  branches: { id: string; name: string }[];
  expenseSources: { id: string; name: string }[];
  lockedMonths: string[];
  currentUser: AppUser;
  onSuccess: () => void;
};

type FileKind = "JOB_SHEET" | "INCOME_PROOF" | "EXPENSE_RECEIPT";

function defaultBranchId(user: AppUser, branches: Props["branches"]): string {
  if (user.role === "STAFF" && user.branchId) return user.branchId;
  return branches[0]?.id ?? "";
}

function isoDate(d: Date | string | null): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

export function EntryForm({
  type,
  entry,
  branches,
  expenseSources,
  lockedMonths,
  currentUser,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [actionState, setActionState] = useState<EntryActionState>(IDLE);
  const [submitting, setSubmitting] = useState(false);

  // Controlled fields that drive the profit-delta UI / hidden inputs.
  const [bookedPrice, setBookedPrice] = useState<string>(entry?.bookedPrice?.toString() ?? "");
  const [soldPrice, setSoldPrice] = useState<string>(entry?.soldPrice?.toString() ?? "");
  const [date, setDate] = useState<string>(isoDate(entry?.date ?? null));
  const [branchId, setBranchId] = useState<string>(
    entry?.branchId ?? defaultBranchId(currentUser, branches),
  );
  const [paymentType, setPaymentType] = useState<string>(entry?.paymentType ?? "CASH");
  const [expenseSourceId, setExpenseSourceId] = useState<string>(
    entry?.expenseSourceId ?? expenseSources[0]?.id ?? "",
  );

  // File staging — applied after the entry save succeeds.
  const existingFilesByKind = useMemo(() => {
    const map: Partial<
      Record<
        FileKind,
        {
          id: string;
          originalName: string;
          sizeBytes: number | null;
          mimeType: string | null;
          kind: FileKind;
        }
      >
    > = {};
    for (const f of entry?.files ?? [])
      map[f.kind as FileKind] = { ...f, kind: f.kind as FileKind };
    return map;
  }, [entry?.files]);
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<FileKind, File | null>>>({});
  const [deletedFileIds, setDeletedFileIds] = useState<Set<string>>(new Set());

  const profit = useMemo(() => {
    const b = Number(bookedPrice) || 0;
    const s = Number(soldPrice) || 0;
    return s - b;
  }, [bookedPrice, soldPrice]);

  const lockedSet = useMemo(() => new Set(lockedMonths), [lockedMonths]);
  const monthIsLocked = lockedSet.has(toYyyyMm(date));

  const fieldErrors: Record<string, string> =
    actionState && "ok" in actionState && !actionState.ok && "fieldErrors" in actionState
      ? (actionState.fieldErrors ?? {})
      : {};

  function setFileFor(kind: FileKind, file: File | null) {
    setPendingFiles((p) => ({ ...p, [kind]: file }));
  }
  function markDelete(id: string) {
    setDeletedFileIds((s) => new Set(s).add(id));
  }
  function unmarkDelete(id: string) {
    setDeletedFileIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await saveEntry(IDLE, formData);
    setActionState(result);

    if (!result.ok) {
      setSubmitting(false);
      return;
    }

    const entryId = result.id;

    // Run file ops in parallel; collect any failures into a single message.
    const ops: Promise<{ ok: boolean; error?: string }>[] = [];
    for (const kind of ["JOB_SHEET", "INCOME_PROOF", "EXPENSE_RECEIPT"] as const) {
      const file = pendingFiles[kind];
      if (file) ops.push(uploadEntryFile(entryId, kind, file));
    }
    for (const fid of deletedFileIds) {
      ops.push(deleteEntryFile(fid));
    }

    if (ops.length > 0) {
      const results = await Promise.all(ops);
      const errors = results.filter((r) => !r.ok).map((r) => ("error" in r ? r.error : "") || "");
      if (errors.length > 0) {
        setActionState({
          ok: false,
          error: `รายการบันทึกแล้ว แต่ไฟล์บางส่วนมีปัญหา: ${errors.join(", ")}`,
        });
        setSubmitting(false);
        router.refresh();
        return;
      }
    }

    router.refresh();
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="id" value={entry?.id ?? ""} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="paymentType" value={paymentType} />
      <input type="hidden" name="expenseSourceId" value={expenseSourceId} />

      <div className="bg-muted/40 grid grid-cols-1 gap-4 rounded-lg p-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>สาขา</Label>
          <Select
            value={branchId}
            onValueChange={setBranchId}
            disabled={currentUser.role === "STAFF"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="form-date">วันที่</Label>
          <Input
            id="form-date"
            type="date"
            name="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {monthIsLocked && (
            <p className="text-destructive flex items-center gap-1 text-xs">
              <AlertCircle className="size-3" />
              เดือนนี้ถูกล็อค ไม่สามารถบันทึกได้
            </p>
          )}
        </div>
      </div>

      {type === "INCOME" && (
        <>
          <Section title="1. ข้อมูลลูกค้า" toneClass="bg-blue-50/80 border-blue-100">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormField
                label="ชื่อลูกค้า"
                name="custName"
                defaultValue={entry?.custName ?? ""}
                error={fieldErrors.custName}
              />
              <FormField
                label="เบอร์โทรลูกค้า"
                name="custTel"
                type="tel"
                defaultValue={entry?.custTel ?? ""}
                error={fieldErrors.custTel}
              />
              <FormField label="จองผ่าน" name="bookedVia" defaultValue={entry?.bookedVia ?? ""} />
              <FormField label="ยี่ห้อรถ" name="carBrand" defaultValue={entry?.carBrand ?? ""} />
              <FormField label="รุ่นรถ/สีรถ" name="carModel" defaultValue={entry?.carModel ?? ""} />
              <FormField label="ทะเบียนรถ" name="license" defaultValue={entry?.license ?? ""} />
            </div>
          </Section>

          <Section title="2. ข้อมูลสินค้า" toneClass="bg-emerald-50/80 border-emerald-100">
            <FormField label="ชนิดสินค้า" name="prodType" defaultValue={entry?.prodType ?? ""} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <FormField
                label="สินค้าที่จอง"
                name="bookedProd"
                defaultValue={entry?.bookedProd ?? ""}
              />
              <FormField
                label="ราคาที่จอง"
                name="bookedPrice"
                type="number"
                step="0.01"
                value={bookedPrice}
                onChange={setBookedPrice}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <FormField
                label="สินค้าที่ขาย"
                name="soldProd"
                defaultValue={entry?.soldProd ?? ""}
              />
              <FormField
                label="ราคาที่ขาย"
                name="soldPrice"
                type="number"
                step="0.01"
                value={soldPrice}
                onChange={setSoldPrice}
              />
            </div>
            <div
              className={`bg-background mt-3 rounded-md border p-2.5 text-sm font-bold ${
                profit >= 0 ? "border-emerald-200 text-emerald-700" : "border-red-200 text-red-700"
              }`}
            >
              ผลต่าง: {profit >= 0 ? "+" : ""}
              {formatThb(profit)} บาท
            </div>
            <FormField
              label="รายละเอียดสินค้า"
              name="prodDetail"
              textarea
              defaultValue={entry?.prodDetail ?? ""}
              className="mt-3"
            />
            <FormField
              label="รายละเอียดอื่นๆ"
              name="otherDetail"
              textarea
              defaultValue={entry?.otherDetail ?? ""}
              className="mt-3"
            />
            <div className="mt-3">
              <FileSlot
                label="แนบไฟล์ (ใบงาน)"
                existing={existingFilesByKind.JOB_SHEET ?? null}
                pendingFile={pendingFiles.JOB_SHEET ?? null}
                pendingDelete={
                  !!existingFilesByKind.JOB_SHEET &&
                  deletedFileIds.has(existingFilesByKind.JOB_SHEET.id)
                }
                onSelectFile={(f) => setFileFor("JOB_SHEET", f)}
                onMarkDeleted={() =>
                  existingFilesByKind.JOB_SHEET && markDelete(existingFilesByKind.JOB_SHEET.id)
                }
                onUnmarkDeleted={() =>
                  existingFilesByKind.JOB_SHEET && unmarkDelete(existingFilesByKind.JOB_SHEET.id)
                }
                disabled={submitting || monthIsLocked}
              />
            </div>
          </Section>

          <Section title="3. ข้อมูลการชำระเงิน" toneClass="bg-amber-50/80 border-amber-100">
            <div className="space-y-1.5">
              <Label>การชำระเงิน</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">เงินสด</SelectItem>
                  <SelectItem value="TRANSFER">เงินโอน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3">
              <FileSlot
                label="แนบไฟล์ (หลักฐานการชำระเงิน)"
                existing={existingFilesByKind.INCOME_PROOF ?? null}
                pendingFile={pendingFiles.INCOME_PROOF ?? null}
                pendingDelete={
                  !!existingFilesByKind.INCOME_PROOF &&
                  deletedFileIds.has(existingFilesByKind.INCOME_PROOF.id)
                }
                onSelectFile={(f) => setFileFor("INCOME_PROOF", f)}
                onMarkDeleted={() =>
                  existingFilesByKind.INCOME_PROOF &&
                  markDelete(existingFilesByKind.INCOME_PROOF.id)
                }
                onUnmarkDeleted={() =>
                  existingFilesByKind.INCOME_PROOF &&
                  unmarkDelete(existingFilesByKind.INCOME_PROOF.id)
                }
                disabled={submitting || monthIsLocked}
              />
            </div>
          </Section>
        </>
      )}

      {type === "EXPENSE" && (
        <div className="space-y-4 border-t pt-4">
          <FormField
            label="รายละเอียดค่าใช้จ่าย"
            name="expenseDetail"
            textarea
            defaultValue={entry?.expenseDetail ?? ""}
            labelSize="md"
            error={fieldErrors.expenseDetail}
          />
          <div className="space-y-1.5">
            <Label>จ่ายจาก</Label>
            <Select value={expenseSourceId} onValueChange={setExpenseSourceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {expenseSources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FileSlot
            label="แนบไฟล์ (ใบเสร็จ)"
            existing={existingFilesByKind.EXPENSE_RECEIPT ?? null}
            pendingFile={pendingFiles.EXPENSE_RECEIPT ?? null}
            pendingDelete={
              !!existingFilesByKind.EXPENSE_RECEIPT &&
              deletedFileIds.has(existingFilesByKind.EXPENSE_RECEIPT.id)
            }
            onSelectFile={(f) => setFileFor("EXPENSE_RECEIPT", f)}
            onMarkDeleted={() =>
              existingFilesByKind.EXPENSE_RECEIPT &&
              markDelete(existingFilesByKind.EXPENSE_RECEIPT.id)
            }
            onUnmarkDeleted={() =>
              existingFilesByKind.EXPENSE_RECEIPT &&
              unmarkDelete(existingFilesByKind.EXPENSE_RECEIPT.id)
            }
            disabled={submitting || monthIsLocked}
          />
        </div>
      )}

      <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
        <Label htmlFor="form-amount" className="text-primary text-sm font-bold">
          ยอดเงินรวม (บาท)
        </Label>
        <Input
          id="form-amount"
          type="number"
          name="amount"
          required
          step="0.01"
          defaultValue={entry?.amount?.toString() ?? ""}
          className="mt-1.5 text-lg font-bold"
        />
        {fieldErrors.amount && (
          <p className="text-destructive mt-1 text-xs">{fieldErrors.amount}</p>
        )}
      </div>

      {actionState &&
        "ok" in actionState &&
        !actionState.ok &&
        "error" in actionState &&
        actionState.error && (
          <div className="text-destructive bg-destructive/5 border-destructive/20 flex items-start gap-2 rounded-md border p-2.5 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{actionState.error}</span>
          </div>
        )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onSuccess} className="flex-1">
          ยกเลิก
        </Button>
        <Button type="submit" disabled={submitting || monthIsLocked} className="flex-1">
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  toneClass,
  children,
}: {
  title: string;
  toneClass: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-lg border p-4 ${toneClass}`}>
      <h3 className="mb-3 border-b border-current/20 pb-1 font-bold">{title}</h3>
      {children}
    </section>
  );
}

function FormField({
  label,
  name,
  type = "text",
  step,
  textarea,
  defaultValue,
  value,
  onChange,
  className,
  labelSize = "xs",
  error,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  textarea?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
  labelSize?: "xs" | "sm" | "md";
  error?: string;
}) {
  const labelClass =
    labelSize === "md"
      ? "text-sm font-medium"
      : labelSize === "sm"
        ? "text-sm font-medium"
        : "text-xs text-muted-foreground";
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className={labelClass}>{label}</Label>
      {textarea ? (
        <Textarea name={name} defaultValue={defaultValue} rows={2} />
      ) : value !== undefined ? (
        <Input
          name={name}
          type={type}
          step={step}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <Input name={name} type={type} step={step} defaultValue={defaultValue} />
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
