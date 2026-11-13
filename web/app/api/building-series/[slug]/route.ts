import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { buildingBySlug, buildingSeries, recentPsf } from "@/lib/queries";
import { histogram } from "@/lib/stats";

export const dynamic = "force-dynamic";

/** Read-only: quarterly median price per sq ft and rent for one building, loaded only when the panel's chart is opened. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!hasDatabase()) return NextResponse.json({ error: "no_data" }, { status: 503 });
  try {
    const b = await buildingBySlug(slug);
    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const [series, psf] = await Promise.all([buildingSeries(b), recentPsf(b.id)]);
    return NextResponse.json({ ...series, histogram: histogram(psf), histogramCount: psf.length }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
