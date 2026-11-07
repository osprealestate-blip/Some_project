import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { marketRent } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const rooms = Math.min(4, Math.max(0, Number(sp.get("rooms") ?? "1") | 0));
  const slug = sp.get("building");
  const community = sp.get("community");
  if (!hasDatabase()) return NextResponse.json({ rent: null, error: "no_data" }, { status: 503 });
  if (!slug && !community) return NextResponse.json({ rent: null, error: "pick_a_building" }, { status: 400 });
  try {
    return NextResponse.json({ rent: await marketRent(slug, community, rooms) });
  } catch {
    return NextResponse.json({ rent: null, error: "failed" }, { status: 500 });
  }
}
