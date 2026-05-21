"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setStaffCanEditOthers } from "@/lib/admin-actions";

export function SettingsForm({ staffCanEdit }: { staffCanEdit: boolean }) {
  const [enabled, setEnabled] = useState(staffCanEdit);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const res = await setStaffCanEditOthers(next);
      if (!res.ok) setEnabled(!next); // revert on failure
    });
  }

  return (
    <div className="space-y-6">
      <section className="bg-muted/30 rounded-lg border p-4">
        <h2 className="font-semibold">สิทธิ์การแก้ไขข้ามผู้ใช้ในสาขาเดียวกัน</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          เมื่อ <span className="font-medium">เปิด</span>:
          พนักงานในสาขาเดียวกันสามารถแก้ไขรายการของกันและกันได้
          <br />
          เมื่อ <span className="font-medium">ปิด</span>:
          พนักงานแก้ไขได้เฉพาะรายการที่ตัวเองเป็นคนบันทึก (Admin ยังแก้ไขได้ทุกรายการ)
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={toggle} disabled={pending} variant={enabled ? "default" : "outline"}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {enabled ? "เปิดอยู่" : "ปิดอยู่"}
          </Button>
          <span className="text-muted-foreground text-sm">
            (กดเพื่อ{enabled ? "ปิด" : "เปิด"}การใช้งาน)
          </span>
        </div>
      </section>
    </div>
  );
}
