import { NextResponse } from "next/server";
import { hasDatabase, query } from "@/lib/db";
import { parsePoint } from "@/lib/place";

export const dynamic = "force-dynamic";

/** Read-only: which Dubai Municipality community a map point lies in. Used by the "no data yet" card for a
 *  building we hold no records for. Returns the community only, nothing about people. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const pt = parsePoint(u.get("lng"), u.get("lat"));
  if (!pt) return NextResponse.json({ error: "bad_point" }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ community: null });
  try {
    const rows = await query<{ code: string; name: string }>(
      `select dm_code as code, coalesce(name_common, name_official) as name
         from communities where geom is not null and ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) limit 1`,
      [pt.lng, pt.lat],
    );
    return NextResponse.json({ community: rows[0] ?? null }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    return NextResponse.json({ community: null }, { status: 500 });
  }
}
