import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { clusterPoints } from "@/lib/villaClusterQueries";

export const dynamic = "force-dynamic";

const round = (v: number | null, step = 1) => (v == null ? null : Math.round(v / step) * step);

/** GeoJSON points for the map: one per villa or townhouse cluster that has a map point, never one per villa.
 *  Aggregates only. An empty collection (no table yet, no clusters) just means the layer is not drawn. */
export async function GET() {
  const empty = { type: "FeatureCollection", features: [] };
  if (!hasDatabase()) return NextResponse.json(empty);
  try {
    const rows = await clusterPoints();
    return NextResponse.json(
      {
        type: "FeatureCollection",
        features: rows.map((r) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [Math.round(r.lng * 1e6) / 1e6, Math.round(r.lat * 1e6) / 1e6] },
          properties: { slug: r.slug, name: r.name, kind: r.kind, community: r.community, sales: r.sales, psf: round(r.psf), price: round(r.price, 1000), rent: round(r.rent, 100) },
        })),
      },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json(empty); // table not created yet (migration 0014): no clusters, no error on the map
  }
}
