"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatThb, formatThbCompact } from "@/lib/format";

export type BranchRow = {
  branchName: string;
  income: number;
  expense: number;
};

const COLORS = {
  income: "#059669", // emerald-600
  expense: "#dc2626", // red-600
};

export function BranchComparisonChart({ data }: { data: BranchRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>เปรียบเทียบรายรับ-รายจ่ายแต่ละสาขา</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            ไม่มีข้อมูลในช่วงที่เลือก
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" />
              <XAxis dataKey="branchName" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatThbCompact} tick={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: "oklch(0.97 0 0)" }}
                formatter={(value) => formatThb(Number(value)) + " บาท"}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid oklch(0.92 0 0)",
                  fontSize: 13,
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="income" name="รายรับ" fill={COLORS.income} radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="รายจ่าย" fill={COLORS.expense} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
