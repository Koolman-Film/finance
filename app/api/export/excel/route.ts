import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { exportFilename, loadExportData } from "@/lib/exports/data";
import { buildExcel } from "@/lib/exports/excel";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    params[k] = v;
  });

  const data = await loadExportData(user, params);
  const buffer = await buildExcel(data);
  const filename = exportFilename(data.type, "xlsx");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
