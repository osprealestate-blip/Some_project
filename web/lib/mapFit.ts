import type { LngLatBounds, LngLatLike } from "maplibre-gl";

/**
 * Camera fit for the nearby lines: the selected building plus the places it points at must all be readable in the part
 * of the map that is not covered by the bottom sheet (phones), the side card (desktop) or the top bar.
 *
 * MapLibre adds the options padding to the padding the map already carries (the one that keeps the building clear of
 * the sheet), so passing the covered area as options padding would count it twice. `fitPadding` turns the covered area
 * into the padding that has to be passed on top of what the map already has.
 */
export type Inset = { top: number; bottom: number; left: number; right: number };
export type Pt = { x: number; y: number };
export type Rect = { left: number; top: number; right: number; bottom: number };

export const FIT_MARGIN = 28;
/** Desktop: width the docked building card takes from the left edge (tool rail + card + gap). */
export const DOCK_INSET = 540;
/** Phone: side room kept free so a place label (up to ~128 px wide, centred on its pin) is not cut off by the screen edge. */
export const PHONE_SIDE = 64;
export const FIT_MAX_ZOOM = 15.5;
export const FIT_MIN_ZOOM = 12.5;
/** Places farther than this (straight line) from the building are left out of the fit: one far hospital must not push the map out to a city view. */
export const FIT_RADIUS_M = 3500;
/** ...but the nearest few are always kept, so there is always something to frame. */
export const FIT_KEEP_NEAREST = 3;

function metres(a: [number, number], b: [number, number]): number {
  const k = 111320;
  const dx = (a[0] - b[0]) * k * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
  const dy = (a[1] - b[1]) * k;
  return Math.hypot(dx, dy);
}

/** The points the camera frames: the building, then the places within FIT_RADIUS_M (at least the nearest FIT_KEEP_NEAREST). */
export function pickFitPoints(from: [number, number], places: [number, number][], radius = FIT_RADIUS_M, keep = FIT_KEEP_NEAREST): [number, number][] {
  const sorted = places.map((p) => ({ p, d: metres(from, p) })).sort((a, b) => a.d - b.d);
  const chosen = sorted.filter((x, i) => i < keep || x.d <= radius).map((x) => x.p);
  return [from, ...chosen];
}

/** Padding to hand to cameraForBounds so that, together with the map's own padding, the free area is `inset` + margin. */
export function fitPadding(inset: Inset, current: Partial<Inset>, margin = FIT_MARGIN): Inset {
  return {
    top: inset.top + margin - (current.top ?? 0),
    bottom: inset.bottom + margin - (current.bottom ?? 0),
    left: inset.left + margin - (current.left ?? 0),
    right: inset.right + margin - (current.right ?? 0),
  };
}

/** The part of a w x h map that must hold every point. */
export function freeRect(w: number, h: number, inset: Inset, margin = FIT_MARGIN): Rect {
  return { left: inset.left + margin, top: inset.top + margin, right: w - inset.right - margin, bottom: h - inset.bottom - margin };
}

export function allInside(pts: Pt[], r: Rect): boolean {
  return pts.every((p) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom);
}

/** Zoom change (log2, <= 0) that brings points back into the rectangle when scaled around the rectangle's centre. 0 = fits. */
export function zoomOutToFit(pts: Pt[], r: Rect): number {
  const cx = (r.left + r.right) / 2;
  const cy = (r.top + r.bottom) / 2;
  const hw = (r.right - r.left) / 2;
  const hh = (r.bottom - r.top) / 2;
  let scale = 1;
  for (const p of pts) {
    if (hw > 0) scale = Math.min(scale, hw / Math.max(Math.abs(p.x - cx), 1e-6));
    if (hh > 0) scale = Math.min(scale, hh / Math.max(Math.abs(p.y - cy), 1e-6));
  }
  return Math.max(Math.log2(Math.min(1, scale)), -3);
}

/** The bits of a MapLibre map the planner uses (so tests can use a stand-in). */
export type FitMap = {
  getZoom(): number;
  getPadding(): Partial<Inset>;
  getContainer(): { clientWidth: number; clientHeight: number };
  project(p: [number, number]): Pt;
  cameraForBounds(b: LngLatBounds, o: { padding: Inset; maxZoom: number }): { center?: LngLatLike; zoom?: number } | undefined;
};

export type FitPlan = { center: LngLatLike; zoom: number } | null;

/**
 * Where to move so every point is in view. Nothing moves when they already are. The zoom never goes in (only out when the
 * set does not fit at the visitor's own zoom) and never beyond `minZoom`.
 */
export function planFit(
  map: FitMap, pts: [number, number][], inset: Inset, makeBounds: (pts: [number, number][]) => LngLatBounds,
  opts: { margin?: number; maxZoom?: number; minZoom?: number } = {},
): FitPlan {
  if (pts.length < 2) return null;
  const margin = opts.margin ?? FIT_MARGIN;
  const box = map.getContainer();
  const rect = freeRect(box.clientWidth, box.clientHeight, inset, margin);
  if (rect.right <= rect.left || rect.bottom <= rect.top) return null;
  if (allInside(pts.map((p) => map.project(p)), rect)) return null;
  const cur = map.getZoom();
  const cam = map.cameraForBounds(makeBounds(pts), { padding: fitPadding(inset, map.getPadding(), margin), maxZoom: Math.min(cur, opts.maxZoom ?? FIT_MAX_ZOOM) });
  if (!cam || !cam.center) return null;
  return { center: cam.center, zoom: Math.max(cam.zoom ?? cur, Math.min(cur, opts.minZoom ?? FIT_MIN_ZOOM)) };
}

/** After the move (the view is tilted, which a flat fit cannot see): the extra zoom-out still needed, 0 if all fit. */
export function verifyFit(map: FitMap, pts: [number, number][], inset: Inset, margin = FIT_MARGIN): number {
  const box = map.getContainer();
  const rect = freeRect(box.clientWidth, box.clientHeight, inset, margin);
  const screen = pts.map((p) => map.project(p));
  return allInside(screen, rect) ? 0 : zoomOutToFit(screen, rect);
}
