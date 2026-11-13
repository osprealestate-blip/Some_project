import { NextResponse } from "next/server";
import { buildingCard } from "@/lib/cardData";
import { hasDatabase } from "@/lib/db";
import { parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Read-only: the figures behind the map card and panel for one building. Market fields only, no personal data. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!hasDatabase()) return NextResponse.json({ error: "no_data" }, { status: 503 });
  try {
    const data = await buildingCard(slug, parseLang(new URL(req.url).searchParams.get("lang")));
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
