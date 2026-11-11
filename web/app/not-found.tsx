import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        We don&apos;t have a page for that yet. Buildings get a page once enough DLD sales are matched to them.
      </p>
      <p className="mt-4 text-sm"><Link className="link" href="/map">Back to the map</Link></p>
    </main>
  );
}
