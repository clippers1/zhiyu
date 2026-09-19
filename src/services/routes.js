const pages = new Set(["map", "indicators", "organs", "saved", "article"]);
const validId = /^[a-z0-9-]+$/;

export function parseRoute(pathname) {
  const path = pathname.replace(/\/$/, "");
  if (!path || path === "/map") return { page: "map", id: "" };
  const match = /^\/([a-z]+)(?:\/([a-z0-9-]+))?$/.exec(path);
  if (!match || !pages.has(match[1])) return { page: "not-found", id: "" };
  const [, page, id = ""] = match;
  if ((page === "article" && !id) || (id && !["article", "organs"].includes(page))) {
    return { page: "not-found", id: "" };
  }
  return { page, id: id || (page === "organs" ? "heart" : "") };
}

export function routePath(page, id = "") {
  if (!pages.has(page) || (id && (!validId.test(id) || !["article", "organs"].includes(page))) || (page === "article" && !id)) {
    throw new Error("Invalid route");
  }
  return page === "map" ? "/" : `/${page}${id ? `/${id}` : ""}`;
}

// Old shared links are upgraded in the browser: URL fragments never reach Nginx.
export function legacyRoutePath(hash) {
  if (!hash.startsWith("#/")) return null;
  const route = parseRoute(hash.slice(1));
  return route.page === "not-found" ? null : routePath(route.page, route.id);
}
