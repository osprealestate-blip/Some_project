import { explain, type ActivityInput } from "@/lib/activityExplainer";

/** Two plain sentences and any cautions, above the history charts. */
export default function ActivityExplainer(props: ActivityInput) {
  const e = explain(props);
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-sm">
      <h3 className="font-semibold">In plain words</h3>
      <p className="mt-1"><strong className="font-medium">How active:</strong> {e.activity}</p>
      <p className="mt-1"><strong className="font-medium">Price:</strong> {e.price}</p>
      {e.cautions.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 ps-5 text-xs text-[var(--muted)]">{e.cautions.map((c) => <li key={c}>{c}</li>)}</ul>
      )}
      <p className="mt-2 text-xs text-[var(--muted)]">Counted apartment sales from DLD. This describes the past; it is not a forecast or advice.</p>
    </div>
  );
}
