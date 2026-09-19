import { useEffect, useRef, useState } from "react";
import { contentKey, useReader } from "./reader-context";
import { legacyRoutePath, parseRoute, routePath } from "./services/routes";

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
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem("zhiyu-saved") || "[]");
      return Array.isArray(value)
        ? value.filter((x) => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  };
  const [saved, setSaved] = useState([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => { setSaved(read()); setReady(true); }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("zhiyu-saved", JSON.stringify(saved));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [saved, ready]);
  useEffect(() => {
    const update = (event) => {
      if (event.key === "zhiyu-saved") setSaved(read());
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  return {
    saved,
    storageError,
    toggleSave: (id) =>
      setSaved((current) =>
        current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
      ),
  };
}
