/** Side-by-side figures for 2 to 4 communities. Shown as they are; no ranking and no "best" marker. */
import { change } from "./stats";

export type AreaInput = {
  code: string; name: string; sales: number; psf: number | null; psfPrev: number | null; likeForLike: number | null;
  rent: number | null; rentCount: number; yields: number[]; readySales: number; offPlanSales: number; periodEnd: string | null;
};
export type AreaFigures = {
  code: string; name: string; sales: number; psf: number | null; yoy: number | null; yoyBasis: "same towers" | "median" | null;
  rent: number | null; rentCount: number; grossYield: number | null; offPlanShare: number | null; thin: boolean; periodEnd: string | null;
};

export const MAX_AREAS = 4;

export function parseCodes(v: string | string[] | undefined): string[] {
  const raw = (Array.isArray(v) ? v.join(",") : v ?? "").split(",").map((s) => s.trim()).filter((s) => /^\d{1,4}$/.test(s));
  return [...new Set(raw)].slice(0, MAX_AREAS);
}

export function areaFigures(a: AreaInput): AreaFigures {
  const ys = [...a.yields].sort((x, y) => x - y);
  const mid = ys.length ? ys[Math.floor((ys.length - 1) / 2)] : null;
  const tot = a.readySales + a.offPlanSales;
  const plain = change(a.psf, a.psfPrev);
  return {
    code: a.code, name: a.name, sales: a.sales, psf: a.psf,
    yoy: a.likeForLike ?? plain, yoyBasis: a.likeForLike != null ? "same towers" : plain != null ? "median" : null,
    rent: a.rent, rentCount: a.rentCount, grossYield: mid, offPlanShare: tot > 0 ? a.offPlanSales / tot : null,
    thin: a.sales < 30, periodEnd: a.periodEnd,
  };
}
