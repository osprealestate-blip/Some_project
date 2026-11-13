"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import NavLinks from "./NavLinks";
import { useT } from "./LangProvider";
import { INTENT_NAV, MAIN_NAV } from "@/lib/nav";

const rowCls = "flex min-h-12 items-center rounded-lg px-3 text-base";

/** Phone menu: a full-height sheet with large touch rows. Children (search, currency) are rendered inside it. */
export default function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.querySelector<HTMLElement>("input,a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <span aria-hidden>{open ? "✕" : "☰"}</span>
        <span>{open ? t("Close") : t("Menu")}</span>
      </button>
      {open && (
        <div
          id="mobile-menu"
          ref={sheet}
          role="dialog"
          aria-label={t("Menu")}
          className="fixed inset-x-0 bottom-0 top-[var(--header-h,3.5rem)] z-30 overflow-y-auto overscroll-contain border-t border-[var(--border)] bg-[var(--panel)] px-4 pb-8 pt-4"
        >
          <div className="space-y-3">{children}</div>
          <nav aria-label={t("Main menu")} className="mt-4">
            <NavLinks items={MAIN_NAV} linkClassName={rowCls} className="space-y-1" />
          </nav>
          <nav aria-label={t("What do you want to do?")} className="mt-6 border-t border-[var(--border)] pt-4">
            <p className="px-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{t("What do you want to do?")}</p>
            <NavLinks items={INTENT_NAV} linkClassName={rowCls} className="mt-1 space-y-1" />
          </nav>
        </div>
      )}
    </div>
  );
}
