import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { nearLabel, NEAR_RADIUS_M, parseFilter } from "@/lib/mapFilter";
import { buildingsByDeveloper, buildingsInCommunity, buildingsNear } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Which buildings match a map search: near a kind of place, by developer, or in an area. Slugs only, no personal data. */
export async function GET(req: Request) {
  const f = parseFilter(new URL(req.url).searchParams.get("f"));
  if (!f) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ error: "no_data" }, { status: 503 });
  const headers = { "Cache-Control": "public, s-maxage=3600, max-age=300" };
  try {
    if (f.type === "near") {
      const g = await buildingsNear(f.value, NEAR_RADIUS_M[f.value]);
      return NextResponse.json({ label: nearLabel(f.value), slugs: g.slugs, distances: g.distances }, { headers });
    }
    if (f.type === "dev") {
      const g = await buildingsByDeveloper(f.value);
      return NextResponse.json({ label: `Developer: ${f.value}`, slugs: g.slugs }, { headers });
    }
    const a = await buildingsInCommunity(f.value);
    return NextResponse.json({ label: a ? a.name : "Area", slugs: a?.slugs ?? [] }, { headers });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
