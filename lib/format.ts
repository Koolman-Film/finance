/// Buddhist-era date for Thai display (พ.ศ. = ค.ศ. + 543).
export function formatThaiDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/// Always renders with two decimal places — the convention for currency
/// (THB or otherwise). Callers don't need to remember to set the options.
export function formatThb(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function toYyyyMm(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}
