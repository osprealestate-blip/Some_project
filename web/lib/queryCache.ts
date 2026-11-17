/** Small in-memory cache for read-only query results. The public data only changes when a new load is pushed, so
 *  repeating the same query within a few minutes can reuse the answer. Identical queries running at the same time
 *  share one database call. Failures are never cached. Each server instance keeps its own cache. */
export type QueryCache = {
  get<T>(key: string, load: () => Promise<T>): Promise<T>;
  clear(): void;
};

export function makeQueryCache(ttlMs: number, maxEntries: number, now: () => number = Date.now): QueryCache {
  const done = new Map<string, { at: number; value: unknown }>();
  const running = new Map<string, Promise<unknown>>();
  return {
    async get<T>(key: string, load: () => Promise<T>): Promise<T> {
      if (ttlMs <= 0) return load();
      const hit = done.get(key);
      if (hit && now() - hit.at < ttlMs) return hit.value as T;
      const live = running.get(key);
      if (live) return live as Promise<T>;
      const p = load().then(
        (value) => {
          running.delete(key);
          done.delete(key);
          done.set(key, { at: now(), value });
          while (done.size > maxEntries) done.delete(done.keys().next().value as string);
          return value;
        },
        (err) => {
          running.delete(key);
          throw err;
        },
      );
      running.set(key, p);
      return p;
    },
    clear() {
      done.clear();
      running.clear();
    },
  };
}
