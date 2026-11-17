/** Plain wording for how much of an area's data is tied to individual buildings. Counts and shares only. */
export type CoverageInput = { sales_total: number; sales_linked: number; rents_total: number; rents_linked: number };

const share = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

export function coverageLines(c: CoverageInput | null | undefined): string[] {
  if (!c) return [];
  const out: string[] = [];
  const s = share(c.sales_linked, c.sales_total);
  const r = share(c.rents_linked, c.rents_total);
  const n = (x: number) => x.toLocaleString("en-US");
  if (s != null) out.push(`Sales: ${n(c.sales_linked)} of ${n(c.sales_total)} (${s}%) are tied to a building page.`);
  if (r != null) out.push(`Rent contracts: ${n(c.rents_linked)} of ${n(c.rents_total)} (${r}%) are tied to a building page. Contracts name the project, not the tower, so this share is lower.`);
  return out;
}
