import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { searchMasters } from "@/lib/masterQueries";
import { search, type SearchHit } from "@/lib/queries";
import { searchClusters } from "@/lib/villaClusterQueries";

export const dynamic = "force-dynamic";

/** Master communities (Dubai Marina, Azizi Venice ...) come first, then official areas that are not the same name, then the rest. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!hasDatabase() || q.trim().length < 2) return NextResponse.json({ results: [] });
  try {
    const term = q.slice(0, 80).trim().toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    const [hits, masters, clusters] = await Promise.all([search(q.slice(0, 80)), term.length >= 2 ? searchMasters(term).catch(() => []) : Promise.resolve([]), term.length >= 3 ? searchClusters(term).catch(() => []) : Promise.resolve([])]);
    const masterHits: SearchHit[] = masters.map((m) => ({ kind: "community", slug: m.slug, name: m.name, community: null, psf: null }));
    const taken = new Set(masters.map((m) => m.name.toLowerCase()));
    const rest = hits.filter((h) => !(h.kind === "community" && taken.has(h.name.toLowerCase())));
    return NextResponse.json({ results: [...masterHits, ...rest, ...clusters] });
  } catch {
    return NextResponse.json({ results: [], error: "search_failed" }, { status: 500 });
  }
}
