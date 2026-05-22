"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatThb } from "@/lib/format";

export type TopProductRow = {
  productName: string;
  quantity: number;
  revenue: number;
};

export function TopProductsCard({ data }: { data: TopProductRow[] }) {
  const maxQty = data.reduce((m, r) => Math.max(m, r.quantity), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>สินค้าขายดี 10 ลำดับ</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            ไม่มีข้อมูลในช่วงที่เลือก
          </p>
        ) : (
          <ol className="space-y-2.5">
            {data.map((row, i) => {
              const pct = maxQty > 0 ? (row.quantity / maxQty) * 100 : 0;
              return (
                <li
                  key={row.productName}
                  className="hover:bg-muted/30 grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 transition-colors"
                >
                  <span className="text-muted-foreground text-center text-sm font-semibold tabular-nums">
                    {i + 1}.
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={row.productName}>
                      {row.productName}
                    </p>
                    <div className="bg-muted mt-1.5 h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-base leading-tight font-semibold">
                      {row.quantity.toLocaleString("th-TH")}
                      <span className="text-muted-foreground ml-1 text-xs font-normal">ชิ้น</span>
                    </p>
                    <p className="text-muted-foreground text-xs leading-tight">
                      ฿{formatThb(row.revenue)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
