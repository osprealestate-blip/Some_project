/** The figures behind the community card on the map: one master community, market numbers and names only.
 *  Pure shaping of what `masterPage` returns, so the rules (sales floor, same-tower change, "not available" not zero) are tested
 *  without a database. Same rules as the community page. */
import { communityState, isHandChecked, masterEvidence, masterNameAr, masterSlug, type CommunityState, type MasterEvidenceRow } from "./masterCommunities";
import type { MasterPage } from "./masterQueries";
import { change } from "./stats";

export type CommunityCardData = {
  name: string;
  nameAr: string | null;
  slug: string;
  buildings: number;
  placed: number;
  developments: number;
  areas: string[];
  developers: string[];
  state: CommunityState;
  /** False when the figure tables are not on this database: counts only, no medians. */
  figures: boolean;
  periodEnd: string | null;
  sales12m: number;
  rents12m: number;
  psf: number | null;
  /** Year-on-year change in price per sq ft: the same-tower figure when there is one, else the plain median change. */
  change: { value: number; basis: "same-tower" | "median"; towers: number | null } | null;
  rent: number | null;
  yield: number | null;
  ready: { psf: number | null; sales: number } | null;
  offplan: { psf: number | null; sales: number } | null;
  types: { rooms: number; sales: number; psf: number | null; rent: number | null; yield: number | null }[];
  top: { slug: string; name: string; sales: number; psf: number | null }[];
  evidence: MasterEvidenceRow[];
  handChecked: boolean;
};

export function toCommunityCard(page: MasterPage): CommunityCardData {
  const { name, summaries, buildings, areas, developers } = page;
  const all = summaries.find((s) => s.rooms === -1) ?? null;
  const placed = buildings.filter((b) => b.placed).length;
  const sales12m = all?.sale_count_12m ?? buildings.reduce((n, b) => n + b.sales, 0);
  const rents12m = all?.rent_count_12m ?? 0;
  const state = communityState(sales12m, buildings.length);
  const yields = summaries.filter((s) => s.rooms >= 0 && s.gross_yield != null).map((s) => s.gross_yield as number).sort((a, b) => a - b);
  const plain = change(all?.sale_median_psf_12m, all?.sale_median_psf_prev_12m);
  const lfl = all?.like_for_like_change ?? null;
  const yoy: CommunityCardData["change"] = lfl != null ? { value: lfl, basis: "same-tower", towers: all?.like_for_like_towers ?? null }
    : plain != null ? { value: plain, basis: "median", towers: null } : null;
  const hasReady = (all?.sale_count_ready_12m ?? 0) > 0, hasOff = (all?.sale_count_offplan_12m ?? 0) > 0;
  return {
    name,
    nameAr: masterNameAr(name),
    slug: masterSlug(name),
    buildings: buildings.length,
    placed,
    developments: new Set(buildings.map((b) => b.complexKey).filter(Boolean)).size,
    areas: areas.map((a) => a.name),
    developers: developers.map((d) => d.name),
    state,
    figures: page.figures,
    periodEnd: all?.period_end ?? null,
    sales12m,
    rents12m,
    psf: all?.sale_median_psf_12m ?? null,
    change: yoy,
    rent: all?.rent_median_12m ?? null,
    yield: yields.length ? yields[Math.floor((yields.length - 1) / 2)] : null,
    ready: hasReady ? { psf: all?.sale_median_psf_ready_12m ?? null, sales: all?.sale_count_ready_12m ?? 0 } : null,
    offplan: hasOff ? { psf: all?.sale_median_psf_offplan_12m ?? null, sales: all?.sale_count_offplan_12m ?? 0 } : null,
    types: summaries.filter((s) => s.rooms >= 0 && (s.sale_count_12m > 0 || s.rent_count_12m > 0))
      .map((s) => ({ rooms: s.rooms, sales: s.sale_count_12m, psf: s.sale_median_psf_12m, rent: s.rent_median_12m, yield: s.gross_yield })),
    top: buildings.filter((b) => b.sales > 0).slice(0, 5).map((b) => ({ slug: b.slug, name: b.name, sales: b.sales, psf: b.psf })),
    evidence: masterEvidence({ buildings: buildings.length, placed, sales12m, rents12m, handChecked: isHandChecked(name) }),
    handChecked: isHandChecked(name),
  };
}
