import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: 'Property tools', description: 'Fair-price checker and rent increase calculator, based on Dubai Land Department data and Decree 43 of 2013.', path: '/tools' });

const TOOLS = [
  { href: "/tools/fair-price", title: "Fair-price checker", use: "Use this when you have an asking price.", text: "Compare it with what the same bedroom type sold for in that building over the last 12 months." },
  { href: "/tools/rent-increase", title: "Rent increase calculator", use: "Use this when your lease is up for renewal.", text: "The most a landlord can raise the rent under Decree 43 of 2013, with the notice date." },
  { href: "/search", title: "Monthly cost and net yield", use: "Use this when you are weighing a purchase.", text: "Mortgage, service charge and utilities for one building. Search for the building, then open Monthly cost and net yield on its page." },
  { href: "/search", title: "Golden Visa price check", use: "Use this to see where typical prices sit against the AED 2 million threshold.", text: "It checks prices only, not whether you qualify. Search for a building and find it on its page." },
];

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Property tools</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">Each tool uses official DLD data and shows its source and date. They give estimates, not valuations or advice.</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <li key={t.title} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 focus-within:border-[var(--accent)] hover:border-[var(--accent)]">
            <h2 className="text-base font-semibold"><Link href={t.href} className="hover:underline">{t.title}</Link></h2>
            <p className="mt-1 text-sm font-medium">{t.use}</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{t.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
