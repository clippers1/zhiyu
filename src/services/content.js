import { normalizeSearch, searchRank, searchSuggestions, matchLabels } from "./search.js";
const PAGE_LIMIT = 24;
export function selectPage(
  catalog,
  {
    kind,
    query = "",
    category = "",
    cursor = "0",
    limit = 6,
    ids,
    featured,
  } = {},
) {
  const size = Math.min(PAGE_LIMIT, Math.max(1, Number(limit) || 6));
  const offset = Math.max(0, Number.parseInt(cursor, 10) || 0);
  const needle = normalizeSearch(query);
  const searching = Boolean(query.trim());
  const candidates = catalog.items.filter(
    (item) =>
      (!kind || item.kind === kind) &&
      (!category || item.category === category) &&
      (!ids || ids.includes(item.id)) &&
      (!featured || item.featured),
  );
  const filtered = searching ? candidates.map((item, index) => ({ item, index, rank: searchRank(item, needle) }))
    .filter(result => result.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item, rank }) => ({ ...item, match: matchLabels[rank] })) : candidates;
  const availableCategories = new Set(
    catalog.items
      .filter((item) => !kind || item.kind === kind)
      .map((item) => item.category),
  );
  return {
    items: filtered.slice(offset, offset + size),
    total: filtered.length,
    nextCursor: offset + size < filtered.length ? String(offset + size) : null,
    suggestions: searching && filtered.length === 0 ? searchSuggestions(candidates, query) : [],
    categories: catalog.categories.filter((category) =>
      availableCategories.has(category.id),
    ),
  };
}

// The UI uses the same contract for bundled JSON and a future content API.
// The bundled adapter downloads the summary index; production search/paging belongs on the server.
export function createContentRepository({
  apiBase = "",
  assetBase = "/",
  fetcher = (...args) => fetch(...args),
} = {}) {
  const cache = new Map();
  async function read(url, signal, refresh = false) {
    const response = await fetcher(url, {
      signal,
      headers: { Accept: "application/json" },
      ...(refresh ? { cache: "no-store" } : {}),
    });
    if (!response.ok)
      throw new Error(
        response.status === 404
          ? "这篇内容暂时不存在。"
          : "内容加载失败，请稍后重试。",
      );
    return response.json();
  }
  async function cached(url) {
    if (!cache.has(url))
      cache.set(
        url,
        read(url).catch((error) => {
          cache.delete(url);
          throw error;
        }),
      );
    return cache.get(url);
  }
  return {
    async list(options = {}, { signal } = {}) {
      if (!apiBase)
        return selectPage(
          await cached(`${assetBase}content/index.json`),
          options,
        );
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined && value !== null && value !== "")
          params.set(
            key,
            Array.isArray(value) ? value.join(",") : String(value),
          );
      }
      const page = await read(
        `${apiBase.replace(/\/$/, "")}/content?${params}`,
        signal,
      );
      if (
        !Array.isArray(page.items) ||
        !Array.isArray(page.categories) ||
        !Number.isInteger(page.total) ||
        !("nextCursor" in page)
      )
        throw new Error("内容接口返回格式不正确。");
      return page;
    },
    async get(kind, id, { signal, refresh = false } = {}) {
      // "article" is the shared /article/:id namespace: a long-form indicator or
      // a story. The catalog already knows which one an id is, so the reader
      // never has to probe a wrong path and log a 404.
      if (!["indicator", "organ", "story", "article"].includes(kind) || !/^[a-z0-9-]+$/.test(id))
        throw new Error("内容地址不正确。");
      let resolved = kind;
      if (kind === "article" && !apiBase) {
        // The catalog was already loaded for the page; use it to pick the path
        // instead of probing both kinds and logging a 404 on the wrong one.
        const items = (await cached(`${assetBase}content/index.json`)).items || [];
        resolved = items.find(item => item.id === id && ["indicator", "story"].includes(item.kind))?.kind;
        if (!resolved) throw new Error("这篇内容暂时不存在。");
      }
      const url = apiBase
        ? `${apiBase.replace(/\/$/, "")}/content/${kind}/${encodeURIComponent(id)}`
        : `${assetBase}content/${resolved}/${id}.json`;
      // refresh keeps its no-store semantics for share cards: re-check the
      // current publication rather than reusing what the page already has.
      const content = refresh ? await read(url, signal, true) : await cached(url);
      if (
        content.id !== id ||
        !(kind === "article" ? ["indicator", "story"] : [kind]).includes(content.kind) ||
        !Array.isArray(content.references)
      )
        throw new Error("内容记录不完整。");
      return content;
    },
  };
}
