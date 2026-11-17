import { rentTier, type RentTierInput } from "@/lib/rentTier";

/** One line under the rent figures: what kind of rent evidence this is. */
export default function RentEvidence(props: RentTierInput) {
  const t = rentTier(props);
  const tone = t.kind === "Actual" ? "var(--good)" : t.kind === "Estimated" ? "var(--warn)" : "var(--muted)";
  return (
    <p className="mt-2 text-sm">
      <span aria-hidden className="me-1.5 inline-block h-2 w-2 rounded-full" style={{ background: tone }} />
      <strong className="font-medium">{t.label}</strong> <span className="text-xs text-[var(--muted)]">({t.kind.toLowerCase()})</span>
      <span className="block text-xs text-[var(--muted)]">{t.line}</span>
    </p>
  );
}
