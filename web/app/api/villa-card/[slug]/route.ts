import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { villaCard } from "@/lib/villaCardData";

export const dynamic = "force-dynamic";

/** Read-only: the figures behind the villa cluster card. Aggregates only, no personal data. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!hasDatabase()) return NextResponse.json({ error: "no_data" }, { status: 503 });
  try {
    const data = await villaCard(slug);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
