import Section from "@/components/Section";
import { figureFacts, type AboutInput } from "@/lib/aboutFigures";
import { day } from "@/lib/format";
import { DISCLAIMER } from "@/lib/sources";

/** "About these numbers": for each headline figure, its source, period, sample size, method and limits. */
export default function AboutNumbers(props: AboutInput) {
  const facts = figureFacts({ ...props, periodEnd: props.periodEnd ? day(props.periodEnd) : null });
  return (
    <Section id="about-numbers" title="About these numbers" open={false}>
      <p className="text-xs text-[var(--muted)]">How each headline figure is made. Counts are from the data behind this page. {DISCLAIMER}</p>
      <dl className="mt-3 space-y-3 text-sm">
        {facts.map((f) => (
          <div key={f.id} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
            <dt className="font-semibold">{f.label}</dt>
            <dd className="mt-1">{f.how}</dd>
            <dd className="mt-2 grid gap-x-4 gap-y-1 text-xs text-[var(--muted)] sm:grid-cols-[7rem_1fr]">
              <span>Source</span><span className="text-[var(--fg)]">{f.source}</span>
              <span>Period</span><span className="text-[var(--fg)]">{f.period}</span>
              <span>Sample</span><span className="text-[var(--fg)]">{f.sample}</span>
              <span>Limits</span><span className="text-[var(--fg)]">{f.limits}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
