"use client";

import Link from "next/link";

/** Shown when a page fails to load. No details are shown to the reader; Next logs them on the server. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">This page could not load, so we are not showing any figures. This is usually temporary.</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={reset} className="min-h-11 rounded-md bg-[var(--accent)] px-5 font-medium text-white">Try again</button>
        <Link className="link flex min-h-11 items-center" href="/map">Back to the map</Link>
      </div>
    </main>
  );
}
