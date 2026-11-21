// Small in-memory store for uploaded/downloaded subtitle files (replaces the old Redis cache).
// Entries expire after 24 hours and the store is capped so uploads can't exhaust server memory.
// Note: this is per-process, so it only works with a single server instance.
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

const store = new Map<string, { data: Buffer; expires: number }>();

export function saveSubtitle(hash: string, data: Buffer) {
  // Re-insert so the entry moves to the end (Map keeps insertion order)
  store.delete(hash);
  store.set(hash, { data, expires: Date.now() + TTL_MS });
  while (store.size > MAX_ENTRIES) {
    // Evict the oldest entry
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function getSubtitle(hash: string): Buffer | undefined {
  const entry = store.get(hash);
  if (!entry) {
    return undefined;
  }
  if (entry.expires < Date.now()) {
    store.delete(hash);
    return undefined;
  }
  // Refresh expiry on access, like the old Redis EXPIRE
  entry.expires = Date.now() + TTL_MS;
  return entry.data;
}