export const BOOKMARK_KEYS = { indicator: "zhiyu-saved", organ: "zhiyu-saved-organs" };
export function normalizeBookmarks(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === "string" && /^[a-z0-9-]{1,100}$/.test(id)))] : [];
}

// Keep the original indicator key: no destructive migration or duplicate source of truth.
// Write before document navigation, and read the latest tab state before each edit.
export function createBookmarkStore(storage) {
  const current = { indicator: [], organ: [] };
  const failed = new Set();
  function read(kind) {
    try {
      const raw = storage.getItem(BOOKMARK_KEYS[kind]);
      current[kind] = normalizeBookmarks(JSON.parse(raw || "[]"));
      failed.delete(kind);
    } catch { failed.add(kind); }
  }
  const snapshot = () => ({ saved: [...current.indicator], savedOrgans: [...current.organ], storageError: failed.size > 0 });
  return {
    sync(key) {
      for (const kind of Object.keys(BOOKMARK_KEYS)) if (key == null || key === BOOKMARK_KEYS[kind]) read(kind);
      return snapshot();
    },
    change(kind, action, ids) {
      if (!BOOKMARK_KEYS[kind]) throw new Error("Invalid bookmark kind");
      const selected = normalizeBookmarks(ids);
      if (!failed.has(kind)) read(kind);
      if (action === "remove") current[kind] = current[kind].filter(id => !selected.includes(id));
      else if (action === "add") current[kind] = normalizeBookmarks([...selected, ...current[kind]]);
      else if (action === "toggle" && selected.length === 1) current[kind] = current[kind].includes(selected[0])
        ? current[kind].filter(id => id !== selected[0]) : [selected[0], ...current[kind]];
      else throw new Error("Invalid bookmark action");
      try {
        storage.setItem(BOOKMARK_KEYS[kind], JSON.stringify(current[kind]));
        failed.delete(kind);
      } catch { failed.add(kind); }
      return snapshot();
    },
  };
}

// Each request stays within the API's 200-ID / 24-result limits. A failed batch
// must fail the whole lookup, never mark the rest as withdrawn.
export async function savedContent(list, { kind, ids, query = "", category = "", cursor = "0", limit = 6 }, options = {}) {
  const keys = normalizeBookmarks(ids);
  const items = [];
  const categories = new Map();
  const suggestions = new Set();
  for (let start = 0; start < keys.length; start += 200) {
    let next = "0";
    const seen = new Set();
    do {
      if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (seen.has(next)) throw new Error("收藏内容分页异常，请稍后重试。");
      seen.add(next);
      const page = await list({ kind, ids: keys.slice(start, start + 200), query, category, cursor: next, limit: 24 }, options);
      items.push(...page.items);
      for (const entry of page.categories) categories.set(entry.id, entry);
      for (const term of page.suggestions || []) suggestions.add(term);
      next = page.nextCursor;
    } while (next !== null);
  }
  const allowed = new Set(keys);
  const unique = [...new Map(items.filter(item => item.kind === kind && allowed.has(item.id)).map(item => [item.id, item])).values()];
  const offset = Math.max(0, Number.parseInt(cursor, 10) || 0);
  return { items: unique.slice(offset, offset + limit), total: unique.length,
    availableIds: unique.map(item => item.id), categories: [...categories.values()],
    suggestions: unique.length ? [] : [...suggestions].slice(0, 3),
    nextCursor: offset + limit < unique.length ? String(offset + limit) : null };
}
