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

  // Header row — each field gets its own column so Excel can filter/sort.
  // จองผ่าน / ทะเบียนรถ / สินค้าที่ขาย mirror the on-screen income list.
  const headers = [
    "วันที่",
    "ประเภท",
    "สาขา",
    "ลูกค้า",
    "จองผ่าน",
    "รถ",
    "ทะเบียนรถ",
    "สินค้าที่ขาย",
    "รายการ",
    "ช่องทาง / แหล่งเงิน",
    "กลุ่มค่าใช้จ่าย",
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
      r.bookingChannel ?? "",
      r.car ?? "",
      r.license ?? "",
      r.soldProduct ?? "",
      r.item,
      paymentOrSource,
      r.expenseGroup ?? "",
      r.createdByName ?? "",
      r.amount,
    ]);
    row.getCell(1).numFmt = "dd/mm/yyyy";
    row.getCell(13).numFmt = THB;
    if (r.type === "EXPENSE") row.getCell(13).font = { color: { argb: "FFC00000" } };
  }

  // Totals — label sits in column 12 (ผู้บันทึก), amount in column 13.
  sheet.addRow([]);
  const blanks = (n: number) => Array.from({ length: n }, () => "");
  const incomeRow = sheet.addRow([...blanks(11), "รายรับรวม", data.totalIncome]);
  incomeRow.getCell(13).numFmt = THB;
  incomeRow.getCell(13).font = { bold: true, color: { argb: "FF006400" } };
  incomeRow.getCell(12).font = { bold: true };

  const expenseRow = sheet.addRow([...blanks(11), "รายจ่ายรวม", data.totalExpense]);
  expenseRow.getCell(13).numFmt = THB;
  expenseRow.getCell(13).font = { bold: true, color: { argb: "FFC00000" } };
  expenseRow.getCell(12).font = { bold: true };

  const netRow = sheet.addRow([
    ...blanks(11),
    "คงเหลือสุทธิ",
    data.totalIncome - data.totalExpense,
  ]);
  netRow.getCell(13).numFmt = THB;
  netRow.getCell(13).font = { bold: true };
  netRow.getCell(12).font = { bold: true };

  // Column widths sized for typical content.
  sheet.columns = [
    { width: 12 }, // date
    { width: 9 }, // type
    { width: 14 }, // branch
    { width: 22 }, // customer
    { width: 14 }, // จองผ่าน
    { width: 24 }, // car (brand + model, no license)
    { width: 16 }, // ทะเบียนรถ
    { width: 28 }, // สินค้าที่ขาย
    { width: 24 }, // รายการ
    { width: 18 }, // payment / source
    { width: 18 }, // กลุ่มค่าใช้จ่าย
    { width: 16 }, // created by
    { width: 18 }, // amount
  ];

  // Freeze the title + header rows so scrolling keeps them visible.
  sheet.views = [{ state: "frozen", ySplit: 5 }];

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
