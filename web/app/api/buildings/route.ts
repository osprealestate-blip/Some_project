import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import type { MapBuildingProps } from "@/lib/mapMetrics";
import { dataFreshness, mapBuildings } from "@/lib/queries";
import { change } from "@/lib/stats";

export const dynamic = "force-dynamic";

const round = (v: number | null, step = 1) => (v == null ? null : Math.round(v / step) * step);

/** GeoJSON for the map: one footprint per placed building, with its 12-month figures (DLD sales and rents).
 *  `lng`/`lat` give the label point for dots at low zoom. No personal data: building-level medians only. */
export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ type: "FeatureCollection", features: [] });
  try {
    const [rows, fresh] = await Promise.all([mapBuildings(), dataFreshness()]);
    return NextResponse.json(
      {
        type: "FeatureCollection",
        // Foreign member (allowed by GeoJSON): the last day the 12-month figures cover, for the legend's source line.
        meta: { periodEnd: fresh.period_end },
        features: rows.map((r) => {
          const properties: MapBuildingProps & { lng: number; lat: number; height: number } = {
            slug: r.slug,
            name: r.name,
            community: r.community,
            psf: round(r.psf),
            yield: r.yield == null ? null : Math.round(r.yield * 10000) / 10000,
            price: round(r.price, 1000),
            rent: round(r.rent, 100),
            change: (() => { const c = change(r.psf, r.prev_psf); return c == null ? null : Math.round(c * 1000) / 1000; })(),
            sales: r.sales,
            rentLevel: r.rent_level,
            approx: r.approx,
            lng: Math.round(r.lng * 1e6) / 1e6,
            lat: Math.round(r.lat * 1e6) / 1e6,
            height: Math.round(r.height),
          };
          return { type: "Feature", geometry: JSON.parse(r.footprint), properties };
        }),
      },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch {
    return NextResponse.json({ type: "FeatureCollection", features: [] }, { status: 500 });
  }
}
