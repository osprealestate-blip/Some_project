import { NextResponse } from "next/server";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";
import { hasDatabase } from "@/lib/db";
import { exploreBuildings, parseFilters } from "@/lib/explore";

export const dynamic = "force-dynamic";

/** Read-only: buildings in one launch community filtered by bedroom type, maximum median price and minimum gross yield. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const code = sp.get("community") ?? "";
  if (!LAUNCH_COMMUNITIES.some((c) => c.code === code)) return NextResponse.json({ results: [], error: "unknown_community" }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ results: [], error: "no_data" }, { status: 503 });
  try {
    return NextResponse.json({ results: await exploreBuildings(parseFilters(sp, code)) });
  } catch {
    return NextResponse.json({ results: [], error: "failed" }, { status: 500 });
  }
}
