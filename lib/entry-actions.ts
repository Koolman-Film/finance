"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { canWriteToBranch } from "@/lib/branch-scope";
import { toYyyyMm } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/// Returned by saveEntry / deleteEntry. Consumers define their own IDLE
/// initial-state value locally — "use server" files can only export async
/// functions (and types, which are erased), not value constants.
export type EntryActionState =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | { ok: false; idle: true };

const uuid = z.string().uuid();
const yyyymmdd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง");
const decimalString = z
  .string()
  .trim()
  .min(1)
  .refine((v) => Number.isFinite(Number(v)), "ต้องเป็นตัวเลข")
  .transform((v) => new Prisma.Decimal(v));
const optionalDecimal = z
  .preprocess((v) => (v === "" || v == null ? null : v), z.string().nullable())
  .transform((v) => (v == null ? null : new Prisma.Decimal(v)))
  .nullable();
const trim = z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string());
const optionalTrim = trim.transform((v) => (v === "" ? null : v)).nullable();

const baseSchema = z.object({
  id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  branchId: uuid,
  date: yyyymmdd,
  amount: decimalString,
});

const incomeSchema = baseSchema.extend({
  type: z.literal("INCOME"),
  custName: optionalTrim,
  custTel: optionalTrim,
  bookedVia: optionalTrim,
  carBrand: optionalTrim,
  carModel: optionalTrim,
  license: optionalTrim,
  prodType: optionalTrim,
  bookedProd: optionalTrim,
  bookedPrice: optionalDecimal,
  soldProd: optionalTrim,
  soldPrice: optionalDecimal,
  prodDetail: optionalTrim,
  otherDetail: optionalTrim,
  paymentType: z.enum(["CASH", "TRANSFER"]).default("CASH"),
});

const expenseSchema = baseSchema.extend({
  type: z.literal("EXPENSE"),
  expenseDetail: optionalTrim,
  expenseSourceId: uuid.nullable().or(z.literal("").transform(() => null)),
});

const entrySchema = z.discriminatedUnion("type", [incomeSchema, expenseSchema]);

function formDataToObject(form: FormData): Record<string, FormDataEntryValue> {
  const obj: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of form.entries()) obj[k] = v;
  return obj;
}

function flattenErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

async function isMonthLocked(yyyyMm: string): Promise<boolean> {
  const row = await prisma.monthLock.findUnique({ where: { yyyyMm } });
  return !!row;
}

async function staffCanEditOthers(): Promise<boolean> {
  const row = await prisma.setting.findUnique({
    where: { key: "staff_can_edit_others_in_branch" },
  });
  return row?.value !== "false"; // default true
}

export async function saveEntry(form: FormData): Promise<EntryActionState> {
  const user = await requireUser();

  const parsed = entrySchema.safeParse(formDataToObject(form));
  if (!parsed.success) {
    return {
      ok: false,
      error: "ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบช่องที่ขีดเส้นแดง",
      fieldErrors: flattenErrors(parsed.error),
    };
  }
  const data = parsed.data;

  if (!canWriteToBranch(user, data.branchId)) {
    return { ok: false, error: "คุณไม่มีสิทธิ์บันทึกรายการของสาขานี้" };
  }

  const yyyyMm = toYyyyMm(data.date);
  if (await isMonthLocked(yyyyMm)) {
    return {
      ok: false,
      error: `เดือน ${yyyyMm} ถูกล็อคโดยผู้ดูแลระบบ ไม่สามารถบันทึก/แก้ไขได้`,
    };
  }

  const sharedPayload =
    data.type === "INCOME"
      ? {
          custName: data.custName,
          custTel: data.custTel,
          bookedVia: data.bookedVia,
          carBrand: data.carBrand,
          carModel: data.carModel,
          license: data.license,
          prodType: data.prodType,
          bookedProd: data.bookedProd,
          bookedPrice: data.bookedPrice,
          soldProd: data.soldProd,
          soldPrice: data.soldPrice,
          prodDetail: data.prodDetail,
          otherDetail: data.otherDetail,
          paymentType: data.paymentType,
          expenseDetail: null,
          expenseSourceId: null,
        }
      : {
          custName: null,
          custTel: null,
          bookedVia: null,
          carBrand: null,
          carModel: null,
          license: null,
          prodType: null,
          bookedProd: null,
          bookedPrice: null,
          soldProd: null,
          soldPrice: null,
          prodDetail: null,
          otherDetail: null,
          paymentType: null,
          expenseDetail: data.expenseDetail,
          expenseSourceId: data.expenseSourceId,
        };

  try {
    if (data.id) {
      const existing = await prisma.entry.findUnique({
        where: { id: data.id },
        select: { branchId: true, yyyyMm: true, createdById: true },
      });
      if (!existing) return { ok: false, error: "ไม่พบรายการ" };
      if (!canWriteToBranch(user, existing.branchId)) {
        return { ok: false, error: "คุณไม่มีสิทธิ์แก้ไขรายการของสาขานี้" };
      }
      if (await isMonthLocked(existing.yyyyMm)) {
        return { ok: false, error: `เดือน ${existing.yyyyMm} ถูกล็อคไว้ แก้ไขไม่ได้` };
      }
      if (
        user.role === "STAFF" &&
        existing.createdById &&
        existing.createdById !== user.id &&
        !(await staffCanEditOthers())
      ) {
        return { ok: false, error: "ไม่อนุญาตให้แก้ไขรายการที่ผู้อื่นบันทึกไว้" };
      }

      await prisma.entry.update({
        where: { id: data.id },
        data: {
          type: data.type,
          branchId: data.branchId,
          date: new Date(data.date),
          yyyyMm,
          amount: data.amount,
          ...sharedPayload,
          updatedById: user.id,
        },
      });
      revalidatePath(`/${data.type.toLowerCase()}`);
      revalidatePath("/summary");
      return { ok: true, id: data.id };
    }

    const created = await prisma.entry.create({
      data: {
        type: data.type,
        branchId: data.branchId,
        date: new Date(data.date),
        yyyyMm,
        amount: data.amount,
        ...sharedPayload,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true },
    });
    revalidatePath(`/${data.type.toLowerCase()}`);
    revalidatePath("/summary");
    return { ok: true, id: created.id };
  } catch (err) {
    console.error("saveEntry failed", err);
    return { ok: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
}

export async function deleteEntry(id: string): Promise<EntryActionState> {
  const user = await requireUser();
  const existing = await prisma.entry.findUnique({
    where: { id },
    select: { branchId: true, yyyyMm: true, type: true, createdById: true },
  });
  if (!existing) return { ok: false, error: "ไม่พบรายการ" };
  if (!canWriteToBranch(user, existing.branchId)) {
    return { ok: false, error: "คุณไม่มีสิทธิ์ลบรายการของสาขานี้" };
  }
  if (await isMonthLocked(existing.yyyyMm)) {
    return { ok: false, error: `เดือน ${existing.yyyyMm} ถูกล็อคไว้` };
  }
  if (
    user.role === "STAFF" &&
    existing.createdById &&
    existing.createdById !== user.id &&
    !(await staffCanEditOthers())
  ) {
    return { ok: false, error: "ไม่อนุญาตให้ลบรายการที่ผู้อื่นบันทึกไว้" };
  }

  await prisma.entry.delete({ where: { id } });
  revalidatePath(`/${existing.type.toLowerCase()}`);
  revalidatePath("/summary");
  return { ok: true, id };
}
