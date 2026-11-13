"use client";
import { createContext, useContext, useMemo, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LANG_COOKIE, LANGS, isTranslatedPath, makeT, type Lang, type T } from "@/lib/i18n";

const Ctx = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
export function useT(): T {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}

/** Wraps a page. Where the page is not translated yet it stays English and left-to-right, with a notice in Arabic. */
export function LangPage({ children }: { children: React.ReactNode }) {
  const lang = useLang();
  const pathname = usePathname();
  if (lang === "en" || isTranslatedPath(pathname)) return <>{children}</>;
  return (
    <>
      <p role="note" className="border-b border-[var(--border)] bg-[var(--grid)] px-4 py-2 text-center text-sm">هذه الصفحة متوفرة بالإنجليزية فقط حالياً. صفحة الخريطة متوفرة بالعربية.</p>
      <Ctx.Provider value="en"><div lang="en" dir="ltr">{children}</div></Ctx.Provider>
    </>
  );
}

/** One button that switches language. Saves the choice in a cookie for a year and re-renders the page. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = LANGS.find((l) => l.id !== lang)!;
  return (
    <button type="button" disabled={pending} lang={next.id} title={next.label}
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      onClick={() => { document.cookie = `${LANG_COOKIE}=${next.id}; path=/; max-age=31536000; SameSite=Lax`; start(() => router.refresh()); }}
      className={`rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs font-medium text-[var(--fg)] hover:border-[var(--accent)] disabled:opacity-60 ${className}`}>
      {next.native}
    </button>
  );
}
