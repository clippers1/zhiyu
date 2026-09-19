export const READING_KEY = "zhiyu-reading-v1";
export const HISTORY_LIMIT = 20;
export const HISTORY_AGE = 90 * 24 * 60 * 60 * 1000;
export const defaultReading = () => ({ large: false, enabled: false, entries: [] });
export const READING_SECTIONS = {
  indicator: { "article-quick-read": "快速了解", "article-overview": "概念说明", "article-metrics": "指标说明", "article-questions": "术语问答", "article-process": "身体里的过程", "article-reminder": "看报告提示", "article-source-panel": "知识来源" },
  organ: { "organ-overview": "器官功能", "organ-related": "关联指标", "organ-source-panel": "知识来源" },
};
const safeToken = value => typeof value === "string" && /^[a-zA-Z0-9:._-]{1,100}$/.test(value);
export function readingRevision(content) {
  if (content?.releaseID != null) return `release:${content.releaseID}`;
  return `static:${content?.version || 0}:${content?.updatedAt || "unknown"}`;
}
export function normalizePosition(kind, position) {
  return position && Object.hasOwn(READING_SECTIONS[kind] || {}, position.section) && safeToken(position.revision)
    ? { section: position.section, revision: position.revision } : undefined;
}

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
    }).slice(0, HISTORY_LIMIT).map(({ kind, id, at, position, visit }) => {
      const point = normalizePosition(kind, position);
      return { kind, id, at, ...(point ? { position: point } : {}), ...(safeToken(visit) ? { visit } : {}) };
    }) : [];
  return { large: value?.large === true, enabled, entries };
}

export function recordReading(value, kind, id, now = Date.now(), { revision, visit } = {}) {
  const current = normalizeReading(value, now);
  if (!current.enabled) return value;
  const previous = current.entries.find(item => item.kind === kind && item.id === id);
  const position = previous?.position && (!revision || previous.position.revision === revision) ? previous.position : undefined;
  return normalizeReading({ ...current, entries: [{ kind, id, at: now, position, visit }, ...current.entries] }, now);
}

// Never create a record from a scroll event. Clearing, disabling or opening a
// newer visit in another tab invalidates delayed writes from this visit.
export function recordPosition(value, kind, id, visit, position, now = Date.now()) {
  const current = normalizeReading(value, now);
  if (!current.enabled || !safeToken(visit)) return value;
  const point = normalizePosition(kind, position);
  const target = current.entries.find(item => item.kind === kind && item.id === id && item.visit === visit);
  if (!point || !target || (target.position?.section === point.section && target.position?.revision === point.revision)) return value;
  return { ...current, entries: current.entries.map(item => item.kind === kind && item.id === id && item.visit === visit
    ? { ...item, position: point } : item) };
}
