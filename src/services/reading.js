export const READING_KEY = "zhiyu-reading-v1";
export const HISTORY_LIMIT = 20;
export const HISTORY_AGE = 90 * 24 * 60 * 60 * 1000;
export const defaultReading = () => ({ large: false, enabled: false, entries: [] });

export function normalizeReading(value, now = Date.now()) {
  const enabled = value?.enabled === true;
  const seen = new Set();
  const entries = enabled && Array.isArray(value.entries) ? value.entries
    .filter(item => item && ["indicator", "organ"].includes(item.kind)
      && typeof item.id === "string" && /^[a-z0-9-]{1,100}$/.test(item.id)
      && Number.isFinite(item.at) && item.at <= now && item.at > now - HISTORY_AGE)
    .sort((a, b) => b.at - a.at)
    .filter(item => {
      const key = `${item.kind}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, HISTORY_LIMIT).map(({ kind, id, at }) => ({ kind, id, at })) : [];
  return { large: value?.large === true, enabled, entries };
}

export function recordReading(value, kind, id, now = Date.now()) {
  const current = normalizeReading(value, now);
  if (!current.enabled) return current;
  return normalizeReading({ ...current, entries: [{ kind, id, at: now }, ...current.entries] }, now);
}
