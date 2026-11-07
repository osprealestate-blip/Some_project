import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { mapBuildings } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** GeoJSON points for the map: matched buildings with a position, with 12-month median AED/sq ft. */
export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ type: "FeatureCollection", features: [] });
  try {
    const rows = await mapBuildings();
    return NextResponse.json(
      {
        type: "FeatureCollection",
        features: rows.map((r) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [r.lng, r.lat] },
          properties: { slug: r.slug, name: r.name, psf: r.psf == null ? null : Math.round(r.psf), sales: r.sales, yield: r.yield },
        })),
      },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch {
    return NextResponse.json({ type: "FeatureCollection", features: [] }, { status: 500 });
  }
}
