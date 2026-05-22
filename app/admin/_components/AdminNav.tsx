"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/branches", label: "สาขา" },
  { href: "/admin/expense-sources", label: "แหล่งจ่ายเงิน" },
  { href: "/admin/payment-methods", label: "ช่องทางการชำระเงิน" },
  { href: "/admin/booking-channels", label: "ช่องทางการจอง" },
  { href: "/admin/car-brands", label: "ยี่ห้อรถ" },
  { href: "/admin/product-types", label: "ชนิดสินค้า" },
  { href: "/admin/products", label: "สินค้า" },
  { href: "/admin/users", label: "ผู้ใช้งาน" },
  { href: "/admin/locks", label: "ล็อคเดือน" },
  { href: "/admin/settings", label: "ตั้งค่า" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-4 flex gap-2 overflow-x-auto md:gap-3">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors md:px-5",
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
