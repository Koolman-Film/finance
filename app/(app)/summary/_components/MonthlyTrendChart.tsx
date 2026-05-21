"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatThb, formatThbCompact } from "@/lib/format";

export type MonthlyRow = {
  yyyyMm: string;
  label: string;
  income: number;
  expense: number;
  net: number;
};

const COLORS = {
  income: "#059669", // emerald-600
  expense: "#dc2626", // red-600
  net: "#2563eb", // blue-600
};

type Props = {
  data: MonthlyRow[];
  title?: string;
};

export function MonthlyTrendChart({ data, title = "แนวโน้มรายเดือน (6 เดือนล่าสุด)" }: Props) {
  const allZero = data.every((d) => d.income === 0 && d.expense === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {allZero ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            ยังไม่มีข้อมูลในช่วง 6 เดือนนี้
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatThbCompact} tick={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="oklch(0.85 0 0)" strokeWidth={1} />
              <Tooltip
                cursor={{ stroke: "oklch(0.85 0 0)", strokeWidth: 1 }}
                formatter={(value) => formatThb(Number(value)) + " บาท"}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid oklch(0.92 0 0)",
                  fontSize: 13,
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line
                type="monotone"
                dataKey="income"
                name="รายรับ"
                stroke={COLORS.income}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="รายจ่าย"
                stroke={COLORS.expense}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="คงเหลือสุทธิ"
                stroke={COLORS.net}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
