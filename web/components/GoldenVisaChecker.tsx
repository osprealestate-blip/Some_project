import Link from "next/link";
import { GOLDEN_VISA_CONFIG } from "@/config/goldenVisa";
import { aed } from "@/lib/format";
import { evaluateGoldenVisa } from "@/lib/goldenVisa";

interface Props {
  price: number | null | undefined;
  buildingName?: string;
}

export default function GoldenVisaChecker({ price, buildingName }: Props) {
  const result = evaluateGoldenVisa(price);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div>
          <h2 className="text-base font-semibold">10-Year Golden Visa Checker</h2>
          <p className="text-xs text-[var(--muted)]">
            UAE property investor residency requirements {buildingName ? `for ${buildingName}` : ""}.
          </p>
        </div>
        <span className="rounded bg-[var(--bg)] px-2 py-0.5 text-xs font-medium text-[var(--muted)] border border-[var(--border)]">
          Threshold: AED 2,000,000
        </span>
      </div>

      {/* Status section */}
      <div className="mt-4">
        {result.hasPrice ? (
          <div
            className={`rounded-lg border p-4 ${
              result.eligible
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                : "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">{result.statusText}</span>
              <span className="text-xs font-semibold tabular-nums">
                Median: {aed(result.price)}
              </span>
            </div>

            <p className="mt-1 text-xs opacity-90">{result.summaryText}</p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div>
                <span className="opacity-70">Requirement</span>
                <p className="font-semibold tabular-nums">{aed(result.threshold)}</p>
              </div>
              <div>
                <span className="opacity-70">Building Median</span>
                <p className="font-semibold tabular-nums">{aed(result.price)}</p>
              </div>
              <div>
                <span className="opacity-70">
                  {result.isExact ? "Difference" : result.eligible ? "Surplus" : "Shortfall"}
                </span>
                <p className="font-semibold tabular-nums">
                  {result.isExact
                    ? "AED 0 (Exact match)"
                    : result.eligible
                    ? `+${aed(result.surplus)}`
                    : `-${aed(result.shortfall)}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted)]">
            Median price is not available for this building yet to determine Golden Visa qualification.
          </div>
        )}
      </div>

      {/* Explainer section */}
      <div className="mt-5 space-y-2 border-t border-[var(--border)] pt-4 text-xs">
        <h3 className="font-semibold text-[var(--fg)]">Key Golden Visa Conditions:</h3>
        <ul className="list-inside list-disc space-y-1 text-[var(--muted)]">
          <li>
            <strong className="text-[var(--fg)] font-medium">Property Ownership:</strong> The investor must purchase one or more properties valued at AED 2,000,000 or more, owned under a title deed issued in their name.
          </li>
          <li>
            <strong className="text-[var(--fg)] font-medium">Off-plan & Mortgaged Units:</strong> Properties bought with a mortgage from approved local banks or off-plan from approved developers can qualify, but specific bank NOC letters or developer progress rules apply and vary.
          </li>
          <li>
            <strong className="text-[var(--fg)] font-medium">Changing Regulations:</strong> UAE immigration and residency rules change over time.
          </li>
        </ul>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
          <a
            href={GOLDEN_VISA_CONFIG.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
          >
            <span>Official UAE Government Golden Visa Rules ({GOLDEN_VISA_CONFIG.officialSourceName})</span>
            <span aria-hidden="true">↗</span>
          </a>
          <span className="text-[11px] text-[var(--muted)] font-medium">
            {GOLDEN_VISA_CONFIG.disclaimer}
          </span>
        </div>
      </div>
    </div>
  );
}
