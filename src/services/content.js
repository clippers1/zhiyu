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
  const needle = query.trim().toLocaleLowerCase();
  const filtered = catalog.items.filter(
    (item) =>
      (!kind || item.kind === kind) &&
      (!category || item.category === category) &&
      (!ids || ids.includes(item.id)) &&
      (!featured || item.featured) &&
      (!needle ||
        `${item.title} ${item.subtitle} ${item.searchText}`
          .toLocaleLowerCase()
          .includes(needle)),
  );
  const availableCategories = new Set(
    catalog.items
      .filter((item) => !kind || item.kind === kind)
      .map((item) => item.category),
  );
  return {
    items: filtered.slice(offset, offset + size),
    total: filtered.length,
    nextCursor: offset + size < filtered.length ? String(offset + size) : null,
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
  async function read(url, signal) {
    const response = await fetcher(url, {
      signal,
      headers: { Accept: "application/json" },
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
    async get(kind, id, { signal } = {}) {
      if (!["indicator", "organ"].includes(kind) || !/^[a-z0-9-]+$/.test(id))
        throw new Error("内容地址不正确。");
      const content = apiBase
        ? await read(
            `${apiBase.replace(/\/$/, "")}/content/${kind}/${encodeURIComponent(id)}`,
            signal,
          )
        : await cached(`${assetBase}content/${kind}/${id}.json`);
      if (
        content.id !== id ||
        content.kind !== kind ||
        !Array.isArray(content.references)
      )
        throw new Error("内容记录不完整。");
      return content;
    },
  };
}
