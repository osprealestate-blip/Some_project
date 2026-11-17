import { freshnessParts, reviewStatus, type Stamps } from "@/lib/coverage";

/** One short block: is this area hand-checked, and how old are the files behind the page. */
export default function CoverageNotice({ dmCode, stamps }: { dmCode: string | number | null | undefined; stamps: Stamps }) {
  const s = reviewStatus(dmCode);
  return (
    <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 text-xs text-[var(--muted)]" role="note">
      <p>
        <span aria-hidden className="me-1.5 inline-block h-2 w-2 rounded-full" style={{ background: s.checked ? "var(--good)" : "var(--warn)" }} />
        <strong className="font-medium text-[var(--fg)]">{s.label}.</strong> {s.detail}
      </p>
      <p className="mt-1">Data dates: {freshnessParts(stamps).join(" · ")}. Source: DLD open data.</p>
    </div>
  );
}
