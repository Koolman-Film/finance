// Thai-locale date helpers. The DB and all wire formats stay Gregorian
// (e.g. "2026-05"); these helpers only translate at the UI boundary.

export const THAI_MONTH_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export const THAI_MONTH_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

/** ค.ศ. → พ.ศ. (Gregorian + 543). */
export function toBuddhistYear(gregorianYear: number): number {
  return gregorianYear + 543;
}

/** พ.ศ. → ค.ศ. (Buddhist − 543). */
export function toGregorianYear(buddhistYear: number): number {
  return buddhistYear - 543;
}

/** "2026-05" → "พฤษภาคม 2569" (full Thai month + Buddhist year). */
export function formatThaiYyyyMm(yyyyMm: string, opts: { short?: boolean } = {}): string {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyyMm);
  if (!m) return yyyyMm;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return yyyyMm;
  const monthName = (opts.short ? THAI_MONTH_SHORT : THAI_MONTH_FULL)[month - 1];
  return `${monthName} ${toBuddhistYear(year)}`;
}

/**
 * Build a descending list of "YYYY-MM" + Thai label options spanning a window
 * around the current month. Used by the ThaiMonthPicker dropdown.
 */
export function listYyyyMmOptions({
  yearsBack = 5,
  yearsForward = 1,
}: { yearsBack?: number; yearsForward?: number } = {}): { value: string; label: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const out: { value: string; label: string }[] = [];
  for (let y = currentYear + yearsForward; y >= currentYear - yearsBack; y--) {
    for (let m = 12; m >= 1; m--) {
      const value = `${y}-${String(m).padStart(2, "0")}`;
      out.push({ value, label: formatThaiYyyyMm(value) });
    }
  }
  return out;
}
