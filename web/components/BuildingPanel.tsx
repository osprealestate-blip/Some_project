"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Marks the page while a building panel is open, so a map click swaps the panel instead of stacking history. */
export const PANEL_ATTR = "data-building-panel";

type Props = { slug?: string; children: React.ReactNode };

/**
 * Building details as a panel over the map: a side sheet on wide screens, a bottom sheet on phones.
 * The map behind stays usable (hover and click other buildings). Close with the button, Esc or browser Back.
 */
export default function BuildingPanel({ slug, children }: Props) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    document.documentElement.setAttribute(PANEL_ATTR, slug ?? "loading");
    return () => document.documentElement.removeAttribute(PANEL_ATTR);
  }, [slug]);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="building-panel-title"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[85dvh] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl sm:inset-x-auto sm:end-0 sm:top-0 sm:bottom-0 sm:h-auto sm:w-[min(640px,92vw)] sm:rounded-none sm:rounded-s-2xl"
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2">
        <span className="mx-auto h-1 w-10 rounded-full bg-[var(--border)] sm:hidden" aria-hidden />
        {slug && (
          // A plain link, so it loads the full page instead of opening this panel again.
          <a href={`/building/${slug}`} className="link order-first text-sm">Open full page</a>
        )}
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close building details"
          title="Close (Esc)"
          className="ms-auto shrink-0 whitespace-nowrap rounded-full border border-[var(--border)] px-3 py-1 text-sm hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          ✕ Close
        </button>
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">{children}</div>
    </aside>
  );
}
