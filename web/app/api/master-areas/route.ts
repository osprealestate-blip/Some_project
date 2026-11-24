import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { toAreaCollection } from "@/lib/masterAreas";
import { masterAreaRows } from "@/lib/masterQueries";

export const dynamic = "force-dynamic";

/** Outlines and label points for every master community, for the map. Names, counts and shapes only. */
export async function GET() {
  const empty = { type: "FeatureCollection", features: [] };
  if (!hasDatabase()) return NextResponse.json(empty);
  try {
    return NextResponse.json(toAreaCollection(await masterAreaRows()), { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json(empty, { status: 500 });
  }
}
