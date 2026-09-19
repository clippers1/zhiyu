import { useEffect, useState } from "react";

export function useSearchInput() {
  const [query, setQuery] = useState("");
  const [effective, setEffective] = useState("");
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    if (composing) return;
    const timer = setTimeout(() => setEffective(query), 250);
    return () => clearTimeout(timer);
  }, [query, composing]);
  return { query, setQuery, effective, pending: composing || query !== effective,
    inputProps: { maxLength: 200, onCompositionStart: () => setComposing(true), onCompositionEnd: () => setComposing(false) },
  };
}
