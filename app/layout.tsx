import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบจัดการรายรับ-รายจ่าย Finnix Film",
  description: "ระบบบันทึกรายรับ-รายจ่ายของกิจการแต่ละสาขา",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-gray-800">{children}</body>
    </html>
  );
}
