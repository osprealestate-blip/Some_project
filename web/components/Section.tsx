import type { ReactNode } from "react";

/** A collapsible page section (native <details>, so it works without JavaScript). `adv` hides it in Simple view. */
export default function Section({ id, title, children, adv = false, open = true, className = "" }: {
  id: string; title: string; children: ReactNode; adv?: boolean; open?: boolean; className?: string;
}) {
  return (
    <details id={id} open={open} className={`group mt-8 scroll-mt-16 ${adv ? "adv-only" : ""} ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 border-b border-[var(--border)] pb-1 [&::-webkit-details-marker]:hidden">
        <h2 className="text-base font-semibold">{title}</h2>
        <span aria-hidden className="text-xs text-[var(--muted)] group-open:rotate-180">▼</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
