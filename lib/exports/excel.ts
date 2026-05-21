import ExcelJS from "exceljs";

import type { ExportData } from "./data";

const THB = '"฿"#,##0.00;[Red]-"฿"#,##0.00';

export async function buildExcel(data: ExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Finnix Film";
  wb.created = new Date();

  const sheet = wb.addWorksheet("รายงาน");

  // Title rows
  sheet.addRow(["ระบบจัดการรายรับ-รายจ่าย Finnix Film"]);
  sheet.addRow([data.scopeLabel]);
  sheet.addRow([`วันที่ออกรายงาน: ${new Date().toLocaleString("th-TH-u-ca-buddhist")}`]);
  sheet.addRow([]);

  // Header row — customer / car / item are now their own columns so the
  // result is filterable/sortable in Excel.
  const headers = [
    "วันที่",
    "ประเภท",
    "สาขา",
    "ลูกค้า",
    "รถ",
    "รายการ",
    "ช่องทาง / แหล่งเงิน",
    "ผู้บันทึก",
    "จำนวนเงิน (บาท)",
  ];
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } };
    cell.border = { bottom: { style: "thin" } };
  });

  for (const r of data.rows) {
    const paymentOrSource = r.type === "INCOME" ? (r.paymentMethod ?? "") : (r.expenseSource ?? "");
    const row = sheet.addRow([
      r.date,
      r.type === "INCOME" ? "รายรับ" : "รายจ่าย",
      r.branchName,
      r.customer ?? "",
      r.car ?? "",
      r.item,
      paymentOrSource,
      r.createdByName ?? "",
      r.amount,
    ]);
    row.getCell(1).numFmt = "dd/mm/yyyy";
    row.getCell(9).numFmt = THB;
    if (r.type === "EXPENSE") row.getCell(9).font = { color: { argb: "FFC00000" } };
  }

  // Totals
  sheet.addRow([]);
  const incomeRow = sheet.addRow(["", "", "", "", "", "", "", "รายรับรวม", data.totalIncome]);
  incomeRow.getCell(9).numFmt = THB;
  incomeRow.getCell(9).font = { bold: true, color: { argb: "FF006400" } };
  incomeRow.getCell(8).font = { bold: true };

  const expenseRow = sheet.addRow(["", "", "", "", "", "", "", "รายจ่ายรวม", data.totalExpense]);
  expenseRow.getCell(9).numFmt = THB;
  expenseRow.getCell(9).font = { bold: true, color: { argb: "FFC00000" } };
  expenseRow.getCell(8).font = { bold: true };

  const netRow = sheet.addRow([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "คงเหลือสุทธิ",
    data.totalIncome - data.totalExpense,
  ]);
  netRow.getCell(9).numFmt = THB;
  netRow.getCell(9).font = { bold: true };
  netRow.getCell(8).font = { bold: true };

  // Column widths sized for typical content.
  sheet.columns = [
    { width: 12 }, // date
    { width: 9 }, // type
    { width: 14 }, // branch
    { width: 22 }, // customer
    { width: 32 }, // car
    { width: 28 }, // item
    { width: 18 }, // payment / source
    { width: 16 }, // created by
    { width: 18 }, // amount
  ];

  // Freeze the title + header rows so scrolling keeps them visible.
  sheet.views = [{ state: "frozen", ySplit: 5 }];

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
