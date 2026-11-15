import { describe, expect, it } from "vitest";
import { pickFitPoints, allInside, fitPadding, freeRect, planFit, verifyFit, zoomOutToFit, type FitMap } from "./mapFit";

const zero = { top: 0, bottom: 0, left: 0, right: 0 };

describe("fitPadding", () => {
  it("does not count the padding the map already has twice", () => {
    // phone: sheet 300 px, top bar 64, map already padded (top 20, bottom 300) to keep the building clear of the sheet
    expect(fitPadding({ top: 64, bottom: 300, left: 0, right: 0 }, { top: 20, bottom: 300, left: 0, right: 0 }, 28))
      .toEqual({ top: 72, bottom: 28, left: 28, right: 28 });
  });
  it("desktop: the side card is already in the map padding", () => {
    expect(fitPadding({ top: 0, bottom: 0, left: 420, right: 0 }, { top: 0, bottom: 0, left: 420, right: 0 }, 28))
      .toEqual({ top: 28, bottom: 28, left: 28, right: 28 });
  });
});

describe("freeRect / allInside", () => {
  const r = freeRect(400, 800, { top: 64, bottom: 300, left: 0, right: 0 }, 28);
  it("leaves out the sheet and the top bar", () => expect(r).toEqual({ left: 28, top: 92, right: 372, bottom: 472 }));
  it("detects points behind the sheet", () => {
    expect(allInside([{ x: 200, y: 300 }], r)).toBe(true);
    expect(allInside([{ x: 200, y: 600 }], r)).toBe(false);
    expect(allInside([{ x: 10, y: 300 }], r)).toBe(false);
  });
});

describe("zoomOutToFit", () => {
  const r = { left: 0, top: 0, right: 200, bottom: 200 };
  it("is 0 when everything fits", () => expect(zoomOutToFit([{ x: 50, y: 50 }, { x: 150, y: 150 }], r)).toBe(0));
  it("halves the scale for a point twice too far", () => expect(zoomOutToFit([{ x: 300, y: 100 }], r)).toBeCloseTo(-1, 5));
  it("is capped", () => expect(zoomOutToFit([{ x: 1e9, y: 100 }], r)).toBe(-3));
});

/** A flat stand-in for the map: 1 degree = 1000 px at zoom 10, doubling per zoom level. */
function fake(zoom: number, w = 400, h = 800, padding = zero): FitMap & { lastBounds?: unknown } {
  const px = (z: number) => 1000 * 2 ** (z - 10);
  return {
    getZoom: () => zoom,
    getPadding: () => padding,
    getContainer: () => ({ clientWidth: w, clientHeight: h }),
    project: ([lng, lat]) => ({ x: w / 2 + lng * px(zoom), y: h / 2 - lat * px(zoom) }),
    cameraForBounds: (b: any, o) => {
      const [[w0, s0], [e0, n0]] = b.pts;
      const availW = w - (padding.left + padding.right + o.padding.left + o.padding.right);
      const availH = h - (padding.top + padding.bottom + o.padding.top + o.padding.bottom);
      const z = Math.min(Math.log2(Math.min(availW / ((e0 - w0) * 1000), availH / ((n0 - s0) * 1000))) + 10, o.maxZoom);
      return { center: [(w0 + e0) / 2, (s0 + n0) / 2], zoom: z };
    },
  };
}
const mk = (pts: [number, number][]) => ({ pts: [[Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))], [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))]] }) as any;
const inset = { top: 64, bottom: 300, left: 0, right: 0 };

describe("planFit", () => {
  it("does nothing when the places are already in view", () => {
    expect(planFit(fake(14), [[0, 0], [0.0005, 0.0005]], inset, mk)).toBeNull();
  });
  it("zooms out, never in, when they do not fit", () => {
    const plan = planFit(fake(14), [[0, 0], [0.05, 0.03]], inset, mk)!;
    expect(plan).not.toBeNull();
    expect(plan.zoom).toBeLessThan(14);
    // zoom is the largest that fits the free area (344 x 380 px after the sheet, bar and margins)
    expect(plan.zoom).toBeCloseTo(Math.log2(Math.min(344 / 50, 380 / 30)) + 10, 1);
  });
  it("keeps the visitor's zoom when a pan is enough", () => {
    const plan = planFit(fake(12), [[0.0, 0.0], [0.4, 0.05]], { top: 64, bottom: 0, left: 0, right: 0 }, mk, { margin: 10 })!;
    expect(plan.zoom).toBeLessThanOrEqual(12);
  });
  it("is limited by the minimum zoom", () => {
    expect(planFit(fake(14), [[0, 0], [5, 5]], inset, mk)!.zoom).toBe(12.5);
  });
  it("needs two points", () => expect(planFit(fake(14), [[0, 0]], inset, mk)).toBeNull());
});

describe("verifyFit", () => {
  it("asks for more zoom-out when a point is still hidden (tilted view)", () => {
    expect(verifyFit(fake(13), [[0, 0], [0.12, 0]], inset)).toBeLessThan(0);
    expect(verifyFit(fake(13), [[0, 0], [0.01, 0.01]], inset)).toBe(0);
  });
});

describe("pickFitPoints", () => {
  const from: [number, number] = [55.14, 25.08];
  it("leaves out a place far away", () => {
    const near: [number, number][] = [[55.145, 25.082], [55.15, 25.085], [55.135, 25.075], [55.155, 25.09]];
    const far: [number, number] = [55.4, 25.3]; // ~ 30 km
    const pts = pickFitPoints(from, [...near, far]);
    expect(pts).toContainEqual(from);
    expect(pts).not.toContainEqual(far);
    expect(pts).toHaveLength(1 + near.length);
  });
  it("always keeps the nearest few, however far", () => {
    const pts = pickFitPoints(from, [[55.4, 25.3], [55.5, 25.4], [55.6, 25.5], [55.7, 25.6]]);
    expect(pts).toHaveLength(1 + 3);
  });
});
