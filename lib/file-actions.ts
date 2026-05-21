"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth";
import { canWriteToBranch } from "@/lib/branch-scope";
import { prisma } from "@/lib/prisma";

const ENTRY_FILES_BUCKET = "entry-files";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // matches Storage bucket limit
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

type FileKind = "JOB_SHEET" | "INCOME_PROOF" | "EXPENSE_RECEIPT";

export type FileActionResult =
  | { ok: true; fileId: string }
  | { ok: true; url: string }
  | { ok: true }
  | { ok: false; error: string };

/// Use the service role from the server only (never exposed to the browser).
/// We enforce branch scope + month lock in our actions before touching storage.
function supabaseStorage() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function isMonthLocked(yyyyMm: string): Promise<boolean> {
  const row = await prisma.monthLock.findUnique({ where: { yyyyMm } });
  return !!row;
}

/// Upload a single file to the entry-files bucket and record it in EntryFile.
export async function uploadEntryFile(
  entryId: string,
  kind: FileKind,
  file: File,
): Promise<FileActionResult> {
  const user = await requireUser();

  if (file.size === 0) return { ok: false, error: "ไฟล์ว่างเปล่า" };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "ไฟล์ใหญ่เกิน 10 MB" };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "รองรับเฉพาะไฟล์รูป (JPG / PNG / WebP) หรือ PDF เท่านั้น" };
  }

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    select: { branchId: true, yyyyMm: true, type: true },
  });
  if (!entry) return { ok: false, error: "ไม่พบรายการ" };
  if (!canWriteToBranch(user, entry.branchId)) {
    return { ok: false, error: "ไม่มีสิทธิ์แนบไฟล์รายการของสาขานี้" };
  }
  if (await isMonthLocked(entry.yyyyMm)) {
    return { ok: false, error: `เดือน ${entry.yyyyMm} ถูกล็อคไว้` };
  }

  // Sanitize filename — keep only chars that play nicely with URLs.
  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(0, 100);
  const storagePath = `entries/${entryId}/${kind.toLowerCase()}/${randomUUID()}-${safeName}`;

  const supabase = supabaseStorage();
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from(ENTRY_FILES_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadErr) {
    console.error("storage upload failed", uploadErr);
    return { ok: false, error: `อัปโหลดล้มเหลว: ${uploadErr.message}` };
  }

  const row = await prisma.entryFile.create({
    data: {
      entryId,
      kind,
      storagePath,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });

  revalidatePath(`/${entry.type.toLowerCase()}`);
  return { ok: true, fileId: row.id };
}

export async function deleteEntryFile(fileId: string): Promise<FileActionResult> {
  const user = await requireUser();
  const row = await prisma.entryFile.findUnique({
    where: { id: fileId },
    include: { entry: { select: { branchId: true, yyyyMm: true, type: true } } },
  });
  if (!row) return { ok: false, error: "ไม่พบไฟล์" };
  if (!canWriteToBranch(user, row.entry.branchId)) {
    return { ok: false, error: "ไม่มีสิทธิ์ลบไฟล์ของสาขานี้" };
  }
  if (await isMonthLocked(row.entry.yyyyMm)) {
    return { ok: false, error: `เดือน ${row.entry.yyyyMm} ถูกล็อคไว้` };
  }

  const supabase = supabaseStorage();
  const { error: removeErr } = await supabase.storage
    .from(ENTRY_FILES_BUCKET)
    .remove([row.storagePath]);
  if (removeErr) {
    console.error("storage remove failed", removeErr);
    // Continue anyway — orphan in storage is better than orphan in DB.
  }

  await prisma.entryFile.delete({ where: { id: fileId } });

  revalidatePath(`/${row.entry.type.toLowerCase()}`);
  return { ok: true };
}

/// Return a short-lived signed URL to download a file. Enforces branch read
/// scope (STAFF can only view their own branch's files).
export async function getEntryFileSignedUrl(fileId: string): Promise<FileActionResult> {
  const user = await requireUser();
  const row = await prisma.entryFile.findUnique({
    where: { id: fileId },
    include: { entry: { select: { branchId: true } } },
  });
  if (!row) return { ok: false, error: "ไม่พบไฟล์" };
  if (user.role !== "ADMIN" && user.branchId !== row.entry.branchId) {
    return { ok: false, error: "ไม่มีสิทธิ์เข้าถึงไฟล์ของสาขาอื่น" };
  }

  const supabase = supabaseStorage();
  const { data, error } = await supabase.storage
    .from(ENTRY_FILES_BUCKET)
    .createSignedUrl(row.storagePath, 60 * 5); // 5 minutes
  if (error || !data) {
    return { ok: false, error: error?.message ?? "สร้างลิงก์ไม่สำเร็จ" };
  }
  return { ok: true, url: data.signedUrl };
}
