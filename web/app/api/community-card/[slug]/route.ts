import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { toCommunityCard } from "@/lib/communityCard";
import { masterPage, resolveMaster } from "@/lib/masterQueries";

export const dynamic = "force-dynamic";

/** Read-only: the figures behind the community card on the map, for one master community. Market fields only, no personal data. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!hasDatabase()) return NextResponse.json({ error: "no_data" }, { status: 503 });
  try {
    const name = await resolveMaster(slug);
    if (!name) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(toCommunityCard(await masterPage(name)), { headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
