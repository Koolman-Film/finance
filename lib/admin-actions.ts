"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function uniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// ============================================================================
// Branches
// ============================================================================

const branchNameSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อสาขา").max(100),
});

export async function createBranch(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = branchNameSchema.safeParse({ name: form.get("name") });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const max = await prisma.branch.aggregate({ _max: { sortOrder: true } });
    await prisma.branch.create({
      data: { name: parsed.data.name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีสาขาชื่อนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/branches");
  return { ok: true };
}

export async function renameBranch(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = branchNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: "ชื่อสาขาไม่ถูกต้อง" };
  }
  try {
    await prisma.branch.update({ where: { id }, data: { name: parsed.data.name } });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีสาขาชื่อนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/branches");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleBranchActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.branch.update({ where: { id }, data: { active } });
  revalidatePath("/admin/branches");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ============================================================================
// Expense Sources
// ============================================================================

const expenseSourceNameSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อแหล่งจ่ายเงิน").max(100),
});

export async function createExpenseSource(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = expenseSourceNameSchema.safeParse({ name: form.get("name") });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const max = await prisma.expenseSource.aggregate({ _max: { sortOrder: true } });
    await prisma.expenseSource.create({
      data: { name: parsed.data.name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีแหล่งจ่ายเงินชื่อนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/expense-sources");
  return { ok: true };
}

export async function renameExpenseSource(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = expenseSourceNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: "ชื่อไม่ถูกต้อง" };
  }
  try {
    await prisma.expenseSource.update({ where: { id }, data: { name: parsed.data.name } });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีแหล่งจ่ายเงินชื่อนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/expense-sources");
  return { ok: true };
}

export async function toggleExpenseSourceActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  await prisma.expenseSource.update({ where: { id }, data: { active } });
  revalidatePath("/admin/expense-sources");
  return { ok: true };
}

// ============================================================================
// Payment Methods
// ============================================================================

const paymentMethodNameSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อช่องทาง").max(100),
});

export async function createPaymentMethod(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = paymentMethodNameSchema.safeParse({ name: form.get("name") });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const max = await prisma.paymentMethod.aggregate({ _max: { sortOrder: true } });
    await prisma.paymentMethod.create({
      data: { name: parsed.data.name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีช่องทางชื่อนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/payment-methods");
  return { ok: true };
}

export async function renamePaymentMethod(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = paymentMethodNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: "ชื่อช่องทางไม่ถูกต้อง" };
  }
  try {
    await prisma.paymentMethod.update({ where: { id }, data: { name: parsed.data.name } });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีช่องทางชื่อนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/payment-methods");
  return { ok: true };
}

export async function togglePaymentMethodActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  await prisma.paymentMethod.update({ where: { id }, data: { active } });
  revalidatePath("/admin/payment-methods");
  return { ok: true };
}

// ============================================================================
// Booking Channels (จองผ่าน)
// ============================================================================

const bookingChannelNameSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อช่องทางการจอง").max(100),
});

export async function createBookingChannel(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = bookingChannelNameSchema.safeParse({ name: form.get("name") });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const max = await prisma.bookingChannel.aggregate({ _max: { sortOrder: true } });
    await prisma.bookingChannel.create({
      data: { name: parsed.data.name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีช่องทางการจองชื่อนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/booking-channels");
  return { ok: true };
}

export async function renameBookingChannel(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = bookingChannelNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: "ชื่อช่องทางการจองไม่ถูกต้อง" };
  }
  try {
    await prisma.bookingChannel.update({ where: { id }, data: { name: parsed.data.name } });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีช่องทางการจองชื่อนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/booking-channels");
  return { ok: true };
}

export async function toggleBookingChannelActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  await prisma.bookingChannel.update({ where: { id }, data: { active } });
  revalidatePath("/admin/booking-channels");
  return { ok: true };
}

// ============================================================================
// Car Brands (ยี่ห้อรถ)
// ============================================================================

const carBrandNameSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกยี่ห้อรถ").max(100),
});

export async function createCarBrand(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = carBrandNameSchema.safeParse({ name: form.get("name") });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const max = await prisma.carBrand.aggregate({ _max: { sortOrder: true } });
    await prisma.carBrand.create({
      data: { name: parsed.data.name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มียี่ห้อรถนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/car-brands");
  return { ok: true };
}

export async function renameCarBrand(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = carBrandNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: "ยี่ห้อรถไม่ถูกต้อง" };
  }
  try {
    await prisma.carBrand.update({ where: { id }, data: { name: parsed.data.name } });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มียี่ห้อรถนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/car-brands");
  return { ok: true };
}

export async function toggleCarBrandActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.carBrand.update({ where: { id }, data: { active } });
  revalidatePath("/admin/car-brands");
  return { ok: true };
}

// ============================================================================
// Car Models (รุ่นรถ/สีรถ)
// ============================================================================

const carModelNameSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกรุ่นรถ/สีรถ").max(150),
});

export async function createCarModel(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = carModelNameSchema.safeParse({ name: form.get("name") });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const max = await prisma.carModel.aggregate({ _max: { sortOrder: true } });
    await prisma.carModel.create({
      data: { name: parsed.data.name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีรุ่นรถนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/car-models");
  return { ok: true };
}

export async function renameCarModel(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = carModelNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: "รุ่นรถไม่ถูกต้อง" };
  }
  try {
    await prisma.carModel.update({ where: { id }, data: { name: parsed.data.name } });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีรุ่นรถนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/car-models");
  return { ok: true };
}

export async function toggleCarModelActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.carModel.update({ where: { id }, data: { active } });
  revalidatePath("/admin/car-models");
  return { ok: true };
}

// ============================================================================
// Product Types (ชนิดสินค้า)
// ============================================================================

const productTypeNameSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชนิดสินค้า").max(100),
});

export async function createProductType(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productTypeNameSchema.safeParse({ name: form.get("name") });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const max = await prisma.productType.aggregate({ _max: { sortOrder: true } });
    await prisma.productType.create({
      data: { name: parsed.data.name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีชนิดสินค้านี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/product-types");
  return { ok: true };
}

export async function renameProductType(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productTypeNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: "ชนิดสินค้าไม่ถูกต้อง" };
  }
  try {
    await prisma.productType.update({ where: { id }, data: { name: parsed.data.name } });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีชนิดสินค้านี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/product-types");
  return { ok: true };
}

export async function toggleProductTypeActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.productType.update({ where: { id }, data: { active } });
  revalidatePath("/admin/product-types");
  return { ok: true };
}

// ============================================================================
// Products (สินค้าที่จอง / สินค้าที่ขาย — shared catalog)
// ============================================================================

const productNameSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อสินค้า").max(200),
});

export async function createProduct(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productNameSchema.safeParse({ name: form.get("name") });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    const max = await prisma.product.aggregate({ _max: { sortOrder: true } });
    await prisma.product.create({
      data: { name: parsed.data.name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีสินค้าชื่อนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function renameProduct(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: "ชื่อสินค้าไม่ถูกต้อง" };
  }
  try {
    await prisma.product.update({ where: { id }, data: { name: parsed.data.name } });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "มีสินค้าชื่อนี้อยู่แล้ว" };
    throw err;
  }
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function toggleProductActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { active } });
  revalidatePath("/admin/products");
  return { ok: true };
}

// ============================================================================
// Users
// ============================================================================

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("อีเมลไม่ถูกต้อง"),
  displayName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
  role: z.enum(["ADMIN", "STAFF"]),
  branchId: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/// Origin of the currently-deployed app (for building the invite redirect
/// URL). Reads from request headers so we work on local dev, Vercel preview,
/// and finance.kool-man.com without an extra SITE_URL env var.
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "finance.kool-man.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/// Invite a new user by email. Creates the Supabase Auth user (no password —
/// they'll set one when they click the email link) and our users row with
/// the assigned role/branch. The invitee lands on /auth/callback → /auth/accept
/// after clicking the email link.
export async function createUser(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createUserSchema.safeParse({
    email: form.get("email"),
    displayName: form.get("displayName"),
    role: form.get("role"),
    branchId: form.get("branchId"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "ข้อมูลไม่ครบถ้วน",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const data = parsed.data;
  if (data.role === "STAFF" && !data.branchId) {
    return {
      ok: false,
      error: "พนักงานสาขาต้องมีสาขากำกับ",
      fieldErrors: { branchId: "เลือกสาขา" },
    };
  }

  const admin = supabaseAdmin();
  const origin = await siteOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/auth/accept")}`;

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(data.email, {
    redirectTo,
    data: { displayName: data.displayName },
  });
  if (inviteErr) {
    if (inviteErr.message.toLowerCase().includes("already")) {
      return { ok: false, error: "มีผู้ใช้อีเมลนี้แล้วในระบบ — หากต้องการเชิญใหม่ให้ลบออกก่อน" };
    }
    return { ok: false, error: inviteErr.message };
  }

  try {
    await prisma.user.create({
      data: {
        id: invited.user!.id,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        branchId: data.role === "STAFF" ? data.branchId : null,
      },
    });
  } catch (err) {
    // Roll back the auth user so we don't leave an orphan
    await admin.auth.admin.deleteUser(invited.user!.id).catch(() => {});
    if (uniqueViolation(err)) return { ok: false, error: "มีผู้ใช้อีเมลนี้แล้วในระบบ" };
    throw err;
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

/// Resend the Supabase invite (or password-recovery) email for an existing
/// user. Used when:
///   - the user lost the original email
///   - the original 24h token expired
///   - the user clicked the link in a different browser/device
///
/// Implementation note: inviteUserByEmail only works for emails that don't
/// yet exist in auth.users — Supabase refuses with "already registered" once
/// the account has been created. For everyone else (including users who
/// were invited but never accepted, and users who already use the system),
/// we fall back to resetPasswordForEmail which sends a recovery link with
/// the same flow (lands on /auth/callback → /auth/accept, set a password).
export async function resendInvite(userId: string): Promise<ActionResult> {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) return { ok: false, error: "ไม่พบผู้ใช้" };

  const admin = supabaseAdmin();
  const origin = await siteOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/auth/accept")}`;

  // First try the invite path — it works for accounts that haven't been
  // created in auth.users yet (shouldn't be our case since createUser made
  // them, but kept here for safety in case of state drift).
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(user.email, {
    redirectTo,
  });
  if (!inviteErr) {
    revalidatePath("/admin/users");
    return { ok: true };
  }

  // Already-registered → use the recovery flow. The recovery email points at
  // the same /auth/callback → /auth/accept chain so the UX is identical.
  if (
    inviteErr.message.toLowerCase().includes("already") ||
    inviteErr.message.toLowerCase().includes("registered")
  ) {
    const { error: resetErr } = await admin.auth.resetPasswordForEmail(user.email, {
      redirectTo,
    });
    if (resetErr) {
      return { ok: false, error: `ส่งคำเชิญใหม่ไม่สำเร็จ: ${resetErr.message}` };
    }
    revalidatePath("/admin/users");
    return { ok: true };
  }

  return { ok: false, error: `ส่งคำเชิญใหม่ไม่สำเร็จ: ${inviteErr.message}` };
}

export async function updateUser(
  id: string,
  patch: {
    displayName?: string;
    role?: "ADMIN" | "STAFF";
    branchId?: string | null;
    active?: boolean;
  },
): Promise<ActionResult> {
  await requireAdmin();
  if (patch.role === "STAFF" && patch.branchId === null) {
    return { ok: false, error: "พนักงานสาขาต้องมีสาขากำกับ" };
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true, active: true },
  });
  if (!target) return { ok: false, error: "ไม่พบผู้ใช้" };

  // Guard against losing the last active ADMIN. If the patch would leave
  // the target as anything other than an active admin AND the target is
  // currently the only active admin, refuse.
  const nextRole = patch.role ?? target.role;
  const nextActive = patch.active ?? target.active;
  const wouldStayActiveAdmin = nextRole === "ADMIN" && nextActive;
  if (!wouldStayActiveAdmin && target.role === "ADMIN" && target.active) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: "ADMIN", active: true, id: { not: id } },
    });
    if (otherActiveAdmins === 0) {
      return {
        ok: false,
        error:
          "ไม่สามารถลดสิทธิ์หรือปิดใช้งานผู้ดูแลระบบคนสุดท้ายได้ — กรุณาเพิ่มผู้ดูแลระบบคนอื่นก่อน",
      };
    }
  }

  const data: Prisma.UserUpdateInput = {};
  if (patch.displayName !== undefined) data.displayName = patch.displayName;
  if (patch.role !== undefined) data.role = patch.role;
  if (patch.branchId !== undefined) {
    data.branch = patch.branchId ? { connect: { id: patch.branchId } } : { disconnect: true };
  }
  if (patch.active !== undefined) data.active = patch.active;

  await prisma.user.update({ where: { id }, data });
  revalidatePath("/admin/users");
  return { ok: true };
}

// ============================================================================
// Month Locks
// ============================================================================

const lockSchema = z.object({
  yyyyMm: z.string().regex(/^\d{4}-\d{2}$/, "เดือนไม่ถูกต้อง"),
  note: z
    .string()
    .max(500)
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export async function lockMonth(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = lockSchema.safeParse({ yyyyMm: form.get("yyyyMm"), note: form.get("note") });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  try {
    await prisma.monthLock.create({
      data: {
        yyyyMm: parsed.data.yyyyMm,
        note: parsed.data.note,
        lockedById: user.id,
      },
    });
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "เดือนนี้ถูกล็อคไว้แล้ว" };
    throw err;
  }
  revalidatePath("/admin/locks");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unlockMonth(yyyyMm: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.monthLock.delete({ where: { yyyyMm } }).catch(() => {});
  revalidatePath("/admin/locks");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ============================================================================
// Settings
// ============================================================================

export async function setStaffCanEditOthers(value: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.setting.upsert({
    where: { key: "staff_can_edit_others_in_branch" },
    update: { value: value ? "true" : "false" },
    create: { key: "staff_can_edit_others_in_branch", value: value ? "true" : "false" },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}
