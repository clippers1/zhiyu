import React, { useEffect, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { useContent } from "../hooks";
import { LoadState, Pagination } from "./ContentUI";
import { RouteLink } from "./RouteLink";

export default function SearchDialog({ onOpen, onOrgan }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cursor, setCursor] = useState("0");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query);
      setCursor("0");
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const state = useContent("list", [{ query: debounced, cursor, limit: 6 }]);
  return (
    <>
      <h2 id="dialog-title">想了解身体的哪一部分？</h2>
      <div className="search-input-wrap">
        <Search size={21} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="试试“血糖”“肝脏”或“LDL”"
          aria-label="搜索指标或器官"
        />
      </div>
      <LoadState {...state} />
      {state.data && (
        <>
          <p className="search-hint">
            {debounced
              ? `找到 ${state.data.total} 个相关内容`
              : "从一个感兴趣的词开始"}
          </p>
          <div className="search-results">
            {state.data.items.map((result) => (
              <RouteLink page={result.kind === "indicator" ? "article" : "organs"} id={result.id}
                key={`${result.kind}-${result.id}`}
                onNavigate={() =>
                  result.kind === "indicator"
                    ? onOpen(result.id)
                    : onOrgan(result.id)
                }
              >
                <span>
                  <span className="search-type">
                    {result.kind === "indicator" ? "指标" : "器官"}
                  </span>
                  <b>{result.title}</b>
                  <small>{result.subtitle}</small>
                </span>
                <ArrowUpRight size={18} />
              </RouteLink>
            ))}
            {state.data.total === 0 && (
              <div className="search-empty">
                <Search size={26} />
                <p>暂时没有这个专题。试试血糖、血压、血脂或器官名称。</p>
              </div>
            )}
          </div>
          <Pagination
            cursor={cursor}
            nextCursor={state.data.nextCursor}
            onChange={setCursor}
          />
        </>
      )}
    </>
  );
}
