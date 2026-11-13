/** Two languages: English (default) and Arabic. The text of a screen is written in English in the code and passed through
 *  t("English text"); Arabic comes from the dictionary in i18nAr.ts, and any text without an entry shows in English.
 *  Numbers, money and dates keep Western digits and the same formats in both languages. */
import { AR } from "./i18nAr";

export type Lang = "en" | "ar";
export const LANG_COOKIE = "dpi-lang";
export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: "en", label: "English", native: "English" },
  { id: "ar", label: "Arabic", native: "العربية" },
];

export function parseLang(v: string | null | undefined): Lang {
  return v === "ar" ? "ar" : "en";
}
export const dirOf = (lang: Lang): "ltr" | "rtl" => (lang === "ar" ? "rtl" : "ltr");

/** `{name}` placeholders are filled from `vars` after translating, so word order can differ between languages. */
export function translate(lang: Lang, text: string, vars?: Record<string, string | number>): string {
  const out = lang === "ar" ? AR[text] ?? text : text;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

export type T = (text: string, vars?: Record<string, string | number>) => string;
export const makeT = (lang: Lang): T => (text, vars) => translate(lang, text, vars);

/** Pages whose text is fully translated. Elsewhere the page stays English and left-to-right, under a notice. */
export function isTranslatedPath(pathname: string): boolean {
  return pathname === "/map" || pathname.startsWith("/map/");
}

/** Legend rows are built from numbers ("Under AED 1,000", "AED 1,000 to AED 1,500"): translate the frame, keep the numbers. */
export function tLegend(t: T, label: string): string {
  let m = /^Under (.+)$/.exec(label);
  if (m) return t("Under {a}", { a: m[1] });
  m = /^(.+) and over$/.exec(label);
  if (m) return t("{a} and over", { a: m[1] });
  m = /^(.+) to (.+)$/.exec(label);
  if (m) return t("{a} to {b}", { a: m[1], b: m[2] });
  return t(label);
}

/** Sources are written as "A; B" in places: translate each part. */
export function tList(t: T, text: string): string {
  return text.split("; ").map((x) => t(x)).join(t("; "));
}
