import { cookies } from "next/headers";
import { LANG_COOKIE, makeT, parseLang, type Lang, type T } from "./i18n";

export async function getServerLang(): Promise<Lang> {
  try { return parseLang((await cookies()).get(LANG_COOKIE)?.value); } catch { return "en"; }
}
export async function getT(): Promise<{ lang: Lang; t: T }> {
  const lang = await getServerLang();
  return { lang, t: makeT(lang) };
}
