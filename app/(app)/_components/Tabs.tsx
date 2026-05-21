"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/summary", label: "สรุปภาพรวม" },
  { href: "/income", label: "บันทึกรายรับ" },
  { href: "/expense", label: "บันทึกรายจ่าย" },
] as const;

export function Tabs() {
  const pathname = usePathname();
  const search = useSearchParams();
  const qs = search.toString();
  const suffix = qs ? `?${qs}` : "";

  return (
    <nav className="mb-4 flex gap-2 overflow-x-auto md:gap-3">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={`${t.href}${suffix}`}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors md:px-6",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
