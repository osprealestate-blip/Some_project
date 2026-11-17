import Section from "@/components/Section";
import { buyChecklist, OFFICIAL_LINKS, type ChecklistFacts } from "@/lib/buyChecklist";

/** Collapsed by default: a short list of things to check before buying, with the official bodies to check them with. */
export default function BuyChecklist(props: ChecklistFacts) {
  const items = buyChecklist(props);
  return (
    <Section id="before-you-buy" title="Before you buy" open={false}>
      <ol className="list-decimal space-y-2 ps-5 text-sm">
        {items.map((i) => (
          <li key={i.id}>{i.text}{i.why && <span className="block text-xs text-[var(--muted)]">{i.why}</span>}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Official sites: {OFFICIAL_LINKS.map((l, k) => <span key={l.id}>{k > 0 && ", "}<a className="link" href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a></span>)}.
        This list is a prompt, not legal advice, and does not state what the law requires.
      </p>
    </Section>
  );
}
