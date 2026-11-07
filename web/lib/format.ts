/** Display formatting. All money is AED; sizes are square feet. */

const aed0 = new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 });

export function aed(n: number | null | undefined): string {
  return n == null ? "–" : `AED ${aed0.format(Math.round(n))}`;
}

/** 1,250,000 -> "AED 1.25M"; 85,000 -> "AED 85K". */
export function aedShort(n: number | null | undefined): string {
  if (n == null) return "–";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}M`;
  if (a >= 10_000) return `AED ${Math.round(n / 1000)}K`;
  return aed(n);
}

export function psf(n: number | null | undefined): string {
  return n == null ? "–" : `AED ${aed0.format(Math.round(n))}/sq ft`;
}

export function sqft(n: number | null | undefined): string {
  return n == null ? "–" : `${aed0.format(Math.round(n))} sq ft`;
}

export function pct(n: number | null | undefined, digits = 1, signed = false): string {
  if (n == null) return "–";
  const s = `${(n * 100).toFixed(digits)}%`;
  return signed && n > 0 ? `+${s}` : s;
}

export function count(n: number | null | undefined): string {
  return n == null ? "–" : aed0.format(n);
}

export function roomsLabel(rooms: number): string {
  if (rooms < 0) return "All types";
  if (rooms === 0) return "Studio";
  if (rooms >= 4) return "4+ beds";
  return `${rooms} bed${rooms === 1 ? "" : "s"}`;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-30" or a Date -> "30 Oct 2026". */
export function day(d: string | Date | null | undefined): string {
  if (!d) return "–";
  const x = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00Z`) : d;
  return `${x.getUTCDate()} ${months[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function monthYear(d: string | Date): string {
  const x = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00Z`) : d;
  return `${months[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function quarterLabel(d: string | Date): string {
  const x = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00Z`) : d;
  return `Q${Math.floor(x.getUTCMonth() / 3) + 1} ${x.getUTCFullYear()}`;
}

export function metres(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}
