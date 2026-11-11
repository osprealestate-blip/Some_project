"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { glossaryEntry, termAnchor, type TermId } from "@/lib/glossary";

type Pos = { top: number; left: number; width: number };

/**
 * A term with a short plain-language definition. Open it with a tap, click, Enter or Space;
 * close with Esc, a tap elsewhere or scrolling. Placed with fixed coordinates so it is never clipped by a
 * scrolling table. Links to the full entry on /how-it-works.
 */
export default function Term({ id, children }: { id: TermId; children?: React.ReactNode }) {
  const entry = glossaryEntry(id);
  const [pos, setPos] = useState<Pos | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const popId = useId();
  const open = pos != null;

  const show = () => {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(288, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos({ top: r.bottom + 6, left, width });
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); button.current?.focus(); }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !button.current?.contains(t)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => (open ? setPos(null) : show())}
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        className="cursor-help rounded-sm underline decoration-dotted decoration-[var(--muted)] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      >
        {children ?? entry.term}
      </button>
      {open && (
        <div
          ref={pop}
          id={popId}
          role="dialog"
          aria-label={entry.term}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 text-start text-sm font-normal normal-case leading-snug tracking-normal text-[var(--fg)] shadow-lg"
        >
          <p className="font-semibold">{entry.term}</p>
          <p className="mt-1">{entry.short}</p>
          <p className="mt-2">
            <Link href={`/how-it-works#${termAnchor(id)}`} className="link">What does this mean?</Link>
          </p>
        </div>
      )}
    </>
  );
}
