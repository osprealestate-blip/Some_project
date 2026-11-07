import Link from "next/link";
import { DISCLAIMER } from "@/lib/sources";

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--border)] px-4 py-6 text-xs text-[var(--muted)]">
      <div className="mx-auto max-w-6xl space-y-1">
        <p>{DISCLAIMER}</p>
        <p>
          Sales and rents: Dubai Land Department open data (Dubai Pulse). Places: KHDA, DHA and © OpenStreetMap
          contributors. Community boundaries: Dubai Municipality. <Link className="underline" href="/about">How the figures are made</Link>
        </p>
      </div>
    </footer>
  );
}
