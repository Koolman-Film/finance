import path from "node:path";
import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ExportData } from "./data";

// Register Sarabun (Thai-capable) so the PDF renders Thai script correctly.
// pdfkit needs TTF, which we ship under public/fonts/ — same file works on
// Vercel because public/ assets are included in the deployment bundle.
let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Sarabun",
    fonts: [
      {
        src: path.join(process.cwd(), "public/fonts/Sarabun-Regular.ttf"),
        fontWeight: 400,
      },
      {
        src: path.join(process.cwd(), "public/fonts/Sarabun-Bold.ttf"),
        fontWeight: 700,
      },
    ],
  });
  fontsRegistered = true;
}

const COLORS = {
  primary: "#C2410C", // brand red (close to OKLCH primary)
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  income: "#047857",
  expense: "#B91C1C",
  bg: "#F9FAFB",
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Sarabun",
    color: COLORS.text,
  },
  title: { fontSize: 16, fontWeight: 700, color: COLORS.primary },
  subtitle: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
  meta: { fontSize: 8, color: COLORS.muted, marginTop: 2 },
  headerSpacer: { borderBottom: `2px solid ${COLORS.primary}`, marginTop: 8, marginBottom: 8 },

  table: { marginTop: 4 },
  row: { flexDirection: "row", borderBottom: `1px solid ${COLORS.border}`, paddingVertical: 4 },
  headRow: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    paddingVertical: 5,
    paddingHorizontal: 0,
    fontWeight: 700,
  },
  cellDate: { width: 60, paddingHorizontal: 3 },
  cellType: { width: 40, paddingHorizontal: 3 },
  cellBranch: { width: 60, paddingHorizontal: 3 },
  cellDetail: { flex: 1, paddingHorizontal: 3 },
  cellWho: { width: 70, paddingHorizontal: 3 },
  cellAmount: { width: 80, paddingHorizontal: 3, textAlign: "right" },

  totals: { marginTop: 12, padding: 10, backgroundColor: COLORS.bg, borderRadius: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { color: COLORS.muted },
  totalAmountIncome: { fontWeight: 700, color: COLORS.income },
  totalAmountExpense: { fontWeight: 700, color: COLORS.expense },
  totalAmountNet: { fontWeight: 700 },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    fontSize: 7,
    color: COLORS.muted,
    textAlign: "center",
  },
});

function fmtThb(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtThaiDate(d: Date): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function ReportDocument({ data }: { data: ExportData }) {
  const generatedAt = new Date().toLocaleString("th-TH-u-ca-buddhist");
  const titleSuffix =
    data.type === "income" ? "รายรับ" : data.type === "expense" ? "รายจ่าย" : "ภาพรวม";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>รายงาน{titleSuffix} Finnix Film</Text>
        <Text style={styles.subtitle}>{data.scopeLabel}</Text>
        <Text style={styles.meta}>วันที่ออกรายงาน: {generatedAt}</Text>
        <View style={styles.headerSpacer} />

        <View style={styles.table}>
          <View style={styles.headRow} fixed>
            <Text style={styles.cellDate}>วันที่</Text>
            <Text style={styles.cellType}>ประเภท</Text>
            <Text style={styles.cellBranch}>สาขา</Text>
            <Text style={styles.cellDetail}>รายละเอียด</Text>
            <Text style={styles.cellWho}>ผู้บันทึก</Text>
            <Text style={styles.cellAmount}>จำนวนเงิน (บาท)</Text>
          </View>

          {data.rows.length === 0 ? (
            <View style={styles.row}>
              <Text
                style={{ flex: 1, textAlign: "center", color: COLORS.muted, paddingVertical: 10 }}
              >
                ไม่มีรายการในช่วงที่เลือก
              </Text>
            </View>
          ) : (
            data.rows.map((r, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={styles.cellDate}>{fmtThaiDate(r.date)}</Text>
                <Text
                  style={{
                    ...styles.cellType,
                    color: r.type === "INCOME" ? COLORS.income : COLORS.expense,
                  }}
                >
                  {r.type === "INCOME" ? "รายรับ" : "รายจ่าย"}
                </Text>
                <Text style={styles.cellBranch}>{r.branchName}</Text>
                <Text style={styles.cellDetail}>{r.detail}</Text>
                <Text style={styles.cellWho}>{r.createdByName ?? "—"}</Text>
                <Text
                  style={{
                    ...styles.cellAmount,
                    color: r.type === "EXPENSE" ? COLORS.expense : COLORS.text,
                  }}
                >
                  {fmtThb(r.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>รายรับรวม</Text>
            <Text style={styles.totalAmountIncome}>{fmtThb(data.totalIncome)} บาท</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>รายจ่ายรวม</Text>
            <Text style={styles.totalAmountExpense}>{fmtThb(data.totalExpense)} บาท</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>คงเหลือสุทธิ</Text>
            <Text style={styles.totalAmountNet}>
              {fmtThb(data.totalIncome - data.totalExpense)} บาท
            </Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

export async function buildPdf(data: ExportData): Promise<Buffer> {
  registerFonts();
  return await renderToBuffer(<ReportDocument data={data} />);
}
