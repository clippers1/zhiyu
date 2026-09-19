import { useEffect, useRef, useState } from "react";
import { contentKey, useReader } from "./reader-context";
import { legacyRoutePath, parseRoute, routePath } from "./services/routes";
import { createBookmarkStore } from "./services/bookmarks";

export function useContent(method, args) {
  const { preloaded, repository } = useReader();
  const key = JSON.stringify(args);
  const initial = preloaded[contentKey(method, args)];
  const consumedInitial = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    key,
    data: initial || null,
    loading: !initial,
    error: null,
  });
  useEffect(() => {
    if (!consumedInitial.current && initial && attempt === 0) {
      consumedInitial.current = true;
      return;
    }
    consumedInitial.current = true;
    let active = true;
    const controller = new AbortController();
    setState({ key, data: null, loading: true, error: null });
    const values = JSON.parse(key);
    repository[method](...values, { signal: controller.signal })
      .then((data) => {
        if (active) setState({ key, data, loading: false, error: null });
      })
      .catch((error) => {
        if (active && error.name !== "AbortError")
          setState({ key, data: null, loading: false, error: error.message });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [method, key, attempt, repository]);
  return {
    ...(state.key === key ? state : { data: null, loading: true, error: null }),
    retry: () => setAttempt((a) => a + 1),
  };
}

function readRoute() {
  const legacyPath = legacyRoutePath(window.location.hash);
  if (legacyPath) {
    window.history.replaceState(window.history.state, "", legacyPath + window.location.search);
  }
  return parseRoute(window.location.pathname);
}
export function useRoute(initialRoute, serverRendered = false) {
  const [route, setRoute] = useState(() => initialRoute || (typeof window === "undefined" ? { page: "map", id: "" } : readRoute()));
  const routeKey = useRef(`${route.page}:${route.id}`);
  useEffect(() => {
    if (serverRendered) {
      const legacyPath = legacyRoutePath(window.location.hash);
      if (legacyPath) window.location.replace(legacyPath + window.location.search);
      const refreshRestoredPage = event => { if (event.persisted) window.location.reload(); };
      window.addEventListener("pageshow", refreshRestoredPage);
      return () => window.removeEventListener("pageshow", refreshRestoredPage);
    }
    const update = () => {
      const next = readRoute();
      const key = `${next.page}:${next.id}`;
      // Ordinary section anchors are native document navigation, not new pages.
      if (routeKey.current === key) return;
      routeKey.current = key;
      setRoute(next);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, [serverRendered]);
  function navigate(page, id = "") {
    const path = routePath(page, id);
    if (window.location.pathname === path) return;
    if (serverRendered) { window.location.assign(path); return; }
    window.history.pushState({ zhiyu: true }, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  return {
    route,
    navigate,
    back: () =>
      (serverRendered ? document.referrer.startsWith(window.location.origin + "/") && window.history.length > 1 : window.history.state?.zhiyu)
        ? window.history.back()
        : navigate("indicators"),
  };
}

export function useBookmarks() {
  const store = useRef(null);
  const [value, setValue] = useState({ saved: [], savedOrgans: [], storageError: false });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    store.current = createBookmarkStore({ getItem: key => localStorage.getItem(key), setItem: (key, data) => localStorage.setItem(key, data) });
    setValue(store.current.sync(null));
    setReady(true);
    const update = event => setValue(store.current.sync(event.key));
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  const change = (kind, action, ids) => { if (store.current) setValue(store.current.change(kind, action, ids)); };
  return {
    ...value, ready,
    toggleSave: (id, kind = "indicator") => change(kind, "toggle", [id]),
    remove: (kind, ids) => change(kind, "remove", ids),
    add: (kind, ids) => change(kind, "add", ids),
  };
}
