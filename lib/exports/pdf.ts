// PDF export — uses headless Chromium (via puppeteer-core) to render an HTML
// template to PDF. Chrome handles Thai line-breaking + combining marks
// correctly, which @react-pdf/renderer couldn't.
//
// In production (Vercel) we use @sparticuz/chromium-min, a 4MB stub that
// fetches a slim Chromium binary at cold start. The first PDF request after
// a deploy pays a ~3-5s download tax; subsequent requests reuse the cached
// binary in /tmp.
//
// In local development we pick up a locally-installed Chrome / Chromium /
// Edge automatically. No need to bundle puppeteer's full binary.
import { promises as fs } from "node:fs";
import path from "node:path";
import chromium from "@sparticuz/chromium-min";
import puppeteer, { type Browser } from "puppeteer-core";

import type { ExportData, ExportRow } from "./data";

// Pin a known-good Chromium build that matches the @sparticuz/chromium-min
// major version. Update both together when bumping the package.
const CHROMIUM_BINARY_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v148.0.0/chromium-v148.0.0-pack.x64.tar";

// Memoised fonts — loaded once per Lambda warm container.
let fontDataCache: { regular: string; bold: string } | null = null;
async function loadFonts() {
  if (fontDataCache) return fontDataCache;
  const fontDir = path.join(process.cwd(), "public/fonts");
  const [regular, bold] = await Promise.all([
    fs.readFile(path.join(fontDir, "Sarabun-Regular.ttf")),
    fs.readFile(path.join(fontDir, "Sarabun-Bold.ttf")),
  ]);
  fontDataCache = {
    regular: regular.toString("base64"),
    bold: bold.toString("base64"),
  };
  return fontDataCache;
}

/// Resolve a path to a Chromium binary we can actually launch.
///   - On Vercel / production: download the sparticuz pack from the URL above.
///   - On local dev (macOS/Linux): probe the usual install paths.
async function resolveExecutablePath(): Promise<string> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return chromium.executablePath(CHROMIUM_BINARY_URL);
  }

  // Local dev — prefer Google Chrome, fall back to Chromium / Edge.
  const candidates =
    process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // try the next one
    }
  }
  throw new Error(
    "No local Chromium found. Install Google Chrome or set PUPPETEER_EXECUTABLE_PATH.",
  );
}

async function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ?? (await resolveExecutablePath());
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return puppeteer.launch({
    args: isServerless
      ? chromium.args
      : ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
    executablePath,
    headless: true,
    defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

/// Build the HTML document we hand to Chromium. CSS is inline because we use
/// page.setContent() with no base URL — external stylesheets wouldn't resolve.
function renderHtml(data: ExportData, fonts: { regular: string; bold: string }): string {
  const generatedAt = new Date().toLocaleString("th-TH-u-ca-buddhist");
  const titleSuffix =
    data.type === "income" ? "รายรับ" : data.type === "expense" ? "รายจ่าย" : "ภาพรวม";

  const rowsHtml = data.rows.length
    ? data.rows.map((r) => rowHtml(r)).join("")
    : `<tr><td colspan="13" class="empty">ไม่มีรายการในช่วงที่เลือก</td></tr>`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>รายงาน${escapeHtml(titleSuffix)} Finnix Film</title>
<style>
  @font-face {
    font-family: "Sarabun";
    font-weight: 400;
    src: url(data:font/ttf;base64,${fonts.regular}) format("truetype");
  }
  @font-face {
    font-family: "Sarabun";
    font-weight: 700;
    src: url(data:font/ttf;base64,${fonts.bold}) format("truetype");
  }
  @page {
    size: A4 landscape;
    margin: 14mm 10mm;
  }
  html, body {
    font-family: "Sarabun", "Helvetica Neue", Arial, sans-serif;
    font-size: 9px;
    color: #1f2937;
    margin: 0;
    padding: 0;
    line-height: 1.4;
  }
  .header { margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #c2410c; }
  .title { color: #c2410c; font-size: 16px; font-weight: 700; margin: 0; }
  .subtitle { color: #6b7280; font-size: 10px; margin-top: 2px; }
  .meta { color: #6b7280; font-size: 8px; margin-top: 1px; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  thead th {
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    padding: 6px 4px;
    text-align: left;
    font-weight: 700;
    font-size: 9px;
    vertical-align: bottom;
  }
  tbody td {
    border-bottom: 1px solid #e5e7eb;
    padding: 4px;
    vertical-align: top;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  tbody tr { page-break-inside: avoid; }
  .empty {
    text-align: center;
    color: #6b7280;
    padding: 20px;
  }
  .nowrap { white-space: nowrap; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .income { color: #047857; font-weight: 700; }
  .expense { color: #b91c1c; font-weight: 700; }
  .muted { color: #6b7280; }

  /* Column widths sum to 100% — fixed layout keeps them stable across pages. */
  col.c-date { width: 7%; }
  col.c-type { width: 4.5%; }
  col.c-branch { width: 8%; }
  col.c-customer { width: 10%; }
  col.c-channel { width: 6.5%; }
  col.c-car { width: 12%; }
  col.c-license { width: 7%; }
  col.c-sold { width: 11%; }
  col.c-item { width: 8%; }
  col.c-payment { width: 7%; }
  col.c-group { width: 7%; }
  col.c-who { width: 5.5%; }
  col.c-amount { width: 6.5%; }

  .totals {
    margin-top: 16px;
    padding: 10px 12px;
    background: #f9fafb;
    border-radius: 4px;
    font-size: 10px;
  }
  .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .totals-row .label { color: #6b7280; }

  .footer {
    position: fixed;
    bottom: 4mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 8px;
    color: #6b7280;
  }
</style>
</head>
<body>
  <div class="header">
    <p class="title">รายงาน${escapeHtml(titleSuffix)} Finnix Film</p>
    <p class="subtitle">${escapeHtml(data.scopeLabel)}</p>
    <p class="meta">วันที่ออกรายงาน: ${escapeHtml(generatedAt)}</p>
  </div>

  <table>
    <colgroup>
      <col class="c-date" />
      <col class="c-type" />
      <col class="c-branch" />
      <col class="c-customer" />
      <col class="c-channel" />
      <col class="c-car" />
      <col class="c-license" />
      <col class="c-sold" />
      <col class="c-item" />
      <col class="c-payment" />
      <col class="c-group" />
      <col class="c-who" />
      <col class="c-amount" />
    </colgroup>
    <thead>
      <tr>
        <th>วันที่</th>
        <th>ประเภท</th>
        <th>สาขา</th>
        <th>ลูกค้า</th>
        <th>จองผ่าน</th>
        <th>รถ</th>
        <th>ทะเบียนรถ</th>
        <th>สินค้าที่ขาย</th>
        <th>รายการ</th>
        <th>ช่องทาง/แหล่งเงิน</th>
        <th>กลุ่มค่าใช้จ่าย</th>
        <th>ผู้บันทึก</th>
        <th class="num">จำนวนเงิน (บาท)</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span class="label">รายรับรวม</span>
      <span class="income">${fmtThb(data.totalIncome)} บาท</span>
    </div>
    <div class="totals-row">
      <span class="label">รายจ่ายรวม</span>
      <span class="expense">${fmtThb(data.totalExpense)} บาท</span>
    </div>
    <div class="totals-row">
      <span class="label">คงเหลือสุทธิ</span>
      <span><strong>${fmtThb(data.totalIncome - data.totalExpense)} บาท</strong></span>
    </div>
  </div>
</body>
</html>`;
}

function rowHtml(r: ExportRow): string {
  const typeClass = r.type === "INCOME" ? "income" : "expense";
  const typeLabel = r.type === "INCOME" ? "รายรับ" : "รายจ่าย";
  const paymentOrSource = r.type === "INCOME" ? (r.paymentMethod ?? "—") : (r.expenseSource ?? "—");
  const amountClass = r.type === "EXPENSE" ? "num expense" : "num";

  return `<tr>
    <td class="nowrap">${escapeHtml(fmtThaiDate(r.date))}</td>
    <td class="${typeClass}">${typeLabel}</td>
    <td>${escapeHtml(r.branchName)}</td>
    <td>${escapeHtml(r.customer ?? "—")}</td>
    <td class="muted">${escapeHtml(r.bookingChannel ?? "—")}</td>
    <td>${escapeHtml(r.car ?? "—")}</td>
    <td class="muted">${escapeHtml(r.license ?? "—")}</td>
    <td>${escapeHtml(r.soldProduct ?? "—")}</td>
    <td class="muted">${escapeHtml(r.item)}</td>
    <td class="muted">${escapeHtml(paymentOrSource)}</td>
    <td class="muted">${escapeHtml(r.expenseGroup ?? "—")}</td>
    <td class="muted">${escapeHtml(r.createdByName ?? "—")}</td>
    <td class="${amountClass}">${fmtThb(r.amount)}</td>
  </tr>`;
}

export async function buildPdf(data: ExportData): Promise<Buffer> {
  const fonts = await loadFonts();
  const html = renderHtml(data, fonts);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // Wait for the @font-face data URIs to register before snapshotting —
    // otherwise the first PDF can render with a fallback font on some runs.
    await page.evaluate(() => document.fonts.ready);
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      // page CSS @page already sets margins; passing margin: 0 here lets the
      // CSS win without Chromium adding default top/bottom margins.
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
