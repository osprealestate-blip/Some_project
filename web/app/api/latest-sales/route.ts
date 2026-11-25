import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { latestSales } from "@/lib/latestSales";
import { parseLatest } from "@/lib/latestSalesShared";

export const dynamic = "force-dynamic";

/** Newest counted sales for one community (?master=… or ?area=…, optional &limit=). Market fields only. */
export async function GET(req: Request) {
  const p = parseLatest(new URL(req.url).searchParams);
  if (!p) return NextResponse.json({ error: "master or area required" }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ rows: [] });
  try {
    return NextResponse.json({ rows: await latestSales(p.scope, p.limit) }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
