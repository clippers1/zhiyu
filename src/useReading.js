import { useCallback, useEffect, useRef, useState } from "react";
import { defaultReading, normalizeReading, READING_KEY, recordReading, recordPosition } from "./services/reading";

export function useReading() {
  const [value, setValue] = useState(defaultReading);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const current = useRef(value);
  const volatile = useRef(false);
  const read = () => {
    try { return normalizeReading(JSON.parse(localStorage.getItem(READING_KEY) || "null")); }
    catch { return defaultReading(); }
  };
  useEffect(() => {
    current.current = read();
    setValue(current.current);
    try {
      if (localStorage.getItem(READING_KEY) !== null) localStorage.setItem(READING_KEY, JSON.stringify(current.current));
    } catch { setError(true); }
    setReady(true);
    const sync = event => {
      if (event.key === READING_KEY || event.key === null) {
        current.current = read();
        setValue(current.current);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  // Persist changes synchronously before document navigation. Read other tabs'
  // latest state before mutations so a disabled history cannot be resurrected.
  const update = useCallback(change => {
    let latest = current.current;
    try {
      if (!volatile.current) latest = normalizeReading(JSON.parse(localStorage.getItem(READING_KEY) || "null"));
    } catch { /* session-only fallback */ }
    const changed = change(latest);
    if (changed === latest) return latest;
    const next = normalizeReading(changed);
    try {
      localStorage.setItem(READING_KEY, JSON.stringify(next));
      volatile.current = false;
      setError(false);
    } catch {
      volatile.current = true;
      setError(true);
    }
    current.current = next;
    setValue(next);
    return next;
  }, []);
  const record = useCallback((kind, id, revision) => {
    const visit = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const next = update(current => recordReading(current, kind, id, Date.now(), { revision, visit }));
    return next.entries.find(item => item.kind === kind && item.id === id);
  }, [update]);
  const savePosition = useCallback((kind, id, visit, position) => update(current => recordPosition(current, kind, id, visit, position)), [update]);
  return { ...value, ready, error, record, savePosition,
    toggleSize: () => update(current => ({ ...current, large: !current.large })),
    toggleHistory: () => update(current => ({ ...current, enabled: !current.enabled, entries: [] })),
    clear: () => update(current => ({ ...current, entries: [] })),
  };
}
