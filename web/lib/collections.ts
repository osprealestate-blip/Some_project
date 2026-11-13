/** Named collections of saved buildings ("Near metro", "My shortlist"). Like the Saved list, they live in this browser only:
 *  no account, nothing sent to a server. Only building slugs and the name the visitor typed are stored. */
import { cleanSlugs, MAX_FAVOURITES } from "./favourites";

export const COLLECTIONS_KEY = "dpi-collections";
export const MAX_COLLECTIONS = 10;
export const NAME_MAX = 40;

export type Collection = { id: string; name: string; slugs: string[] };

/** A visitor-typed name: control characters removed, spaces collapsed, at most NAME_MAX characters. Null when empty. */
export function cleanName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const s = input.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
  return s || null;
}

export function parseCollections(raw: string | null): Collection[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    const out: Collection[] = [];
    for (const c of v) {
      const name = cleanName(c?.name);
      const id = typeof c?.id === "string" && /^[a-z0-9]{1,24}$/.test(c.id) ? c.id : null;
      if (name && id && !out.some((o) => o.id === id)) out.push({ id, name, slugs: cleanSlugs(c.slugs) });
      if (out.length === MAX_COLLECTIONS) break;
    }
    return out;
  } catch { return []; }
}

/** Adds an empty collection. Unchanged when the name is empty, taken (ignoring case) or the limit is reached. */
export function addCollection(list: Collection[], name: string, id: string): Collection[] {
  const n = cleanName(name);
  if (!n || list.length >= MAX_COLLECTIONS || list.some((c) => c.name.toLowerCase() === n.toLowerCase() || c.id === id)) return list;
  return [...list, { id, name: n, slugs: [] }];
}

export function renameCollection(list: Collection[], id: string, name: string): Collection[] {
  const n = cleanName(name);
  if (!n || list.some((c) => c.id !== id && c.name.toLowerCase() === n.toLowerCase())) return list;
  return list.map((c) => (c.id === id ? { ...c, name: n } : c));
}

export function removeCollection(list: Collection[], id: string): Collection[] {
  return list.filter((c) => c.id !== id);
}

/** Adds the slug to the collection, or removes it when already there. A full collection is left unchanged. */
export function toggleInCollection(list: Collection[], id: string, slug: string): Collection[] {
  return list.map((c) => {
    if (c.id !== id) return c;
    if (c.slugs.includes(slug)) return { ...c, slugs: c.slugs.filter((s) => s !== slug) };
    return c.slugs.length >= MAX_FAVOURITES ? c : { ...c, slugs: [...c.slugs, slug] };
  });
}

/** Link to the read-only page for a collection. It carries only the name and slugs, so anyone with it sees the same list. */
export function collectionHref(c: { name: string; slugs: string[] }): string {
  return `/collection?name=${encodeURIComponent(c.name)}&ids=${c.slugs.join(",")}`;
}

export function newCollectionId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function readCollections(): Collection[] {
  try { return parseCollections(localStorage.getItem(COLLECTIONS_KEY)); } catch { return []; }
}

export function writeCollections(list: Collection[]): boolean {
  try { localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(list)); } catch { return false; }
  try { window.dispatchEvent(new Event("dpi-collections")); } catch { /* ignore */ }
  return true;
}
