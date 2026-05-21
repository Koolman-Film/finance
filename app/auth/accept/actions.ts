"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AcceptInviteResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  displayName: z.string().trim().min(1, "กรุณากรอกชื่อที่แสดง").max(100),
});

/// Called from the /auth/accept client form AFTER the user has already set
/// their password via the Supabase JS SDK (which only works from the browser
/// side because it needs the established session cookie). Just persists the
/// chosen display name to our users table.
export async function setOwnDisplayName(
  _prev: AcceptInviteResult,
  form: FormData,
): Promise<AcceptInviteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ไม่ได้ลงชื่อเข้าใช้" };

  const parsed = schema.safeParse({ displayName: form.get("displayName") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".") || "_"] = issue.message;
    }
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { displayName: parsed.data.displayName },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
