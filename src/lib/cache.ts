const store = new Map<string, { data: unknown; expires: number }>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { store.delete(key); return null; }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs = 300_000): void {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

export function invalidateCache(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
