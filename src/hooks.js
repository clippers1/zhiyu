import { useEffect, useState } from "react";
import { contentRepository } from "./services/content";
import { legacyRoutePath, parseRoute, routePath } from "./services/routes";

export function useContent(method, args) {
  const key = JSON.stringify(args);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    key: "",
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ key, data: null, loading: true, error: null });
    const values = JSON.parse(key);
    contentRepository[method](...values, { signal: controller.signal })
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
  }, [method, key, attempt]);
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
export function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  function navigate(page, id = "") {
    const path = routePath(page, id);
    if (window.location.pathname === path) return;
    window.history.pushState({ zhiyu: true }, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  return {
    route,
    navigate,
    back: () =>
      window.history.state?.zhiyu
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
  const [saved, setSaved] = useState(read);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("zhiyu-saved", JSON.stringify(saved));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [saved]);
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
