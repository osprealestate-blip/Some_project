import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { search } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!hasDatabase() || q.trim().length < 2) return NextResponse.json({ results: [] });
  try {
    return NextResponse.json({ results: await search(q.slice(0, 80)) });
  } catch {
    return NextResponse.json({ results: [], error: "search_failed" }, { status: 500 });
  }
}
