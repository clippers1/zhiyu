import { useCallback, useEffect, useRef, useState } from "react";
const READING_KEY = "zhiyu-reading";

const LARGE_KEY = READING_KEY;

export function useReading() {
  const [large, setLarge] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const current = useRef(large);
  const read = () => {
    try { return JSON.parse(localStorage.getItem(LARGE_KEY) || "{}")?.large === true; }
    catch { return false; }
  };
  useEffect(() => {
    current.current = read();
    setLarge(current.current);
    setReady(true);
    const sync = event => {
      if (event.key === LARGE_KEY || event.key === null) {
        current.current = read();
        setLarge(current.current);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const toggleSize = useCallback(() => {
    const next = !current.current;
    try {
      localStorage.setItem(LARGE_KEY, JSON.stringify({ large: next }));
      setError(false);
    } catch {
      setError(true);
    }
    current.current = next;
    setLarge(next);
    return next;
  }, []);
  return { large, ready, error, toggleSize };
}