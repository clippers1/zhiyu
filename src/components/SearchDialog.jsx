import React, { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { useContent } from "../hooks";
import { LoadState, Pagination } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { useSearchInput } from "../useSearchInput";
import SearchSuggestions from "./SearchSuggestions";

export default function SearchDialog({ onOpen, onOrgan }) {
  const { query, setQuery, effective, pending, inputProps } = useSearchInput();
  const [cursor, setCursor] = useState("0");
  const changeQuery = value => { setQuery(value); setCursor("0"); };
  const state = useContent("list", [{ query: effective, cursor, limit: 6 }]);
  return (
    <>
      <h2 id="dialog-title">你想弄懂什么？</h2>
      <div className="search-input-wrap">
        <Search size={21} />
        <input
          {...inputProps}
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          placeholder="试试“血糖”“血脂”或“HbA1c”"
          aria-label="搜索体检项目或器官"
        />
      </div>
      <p className="search-safety">这里查找知识内容，不解读个人数值。请勿输入姓名、联系方式或完整体检报告。</p>
      {pending ? <p role="status" className="search-hint">输入完成后查找…</p> : <LoadState {...state} />}
      {!pending && state.data && (
        <>
          <p className="search-hint">
            {effective.trim()
              ? `找到 ${state.data.total} 个相关内容`
              : "从一个项目名或你的问题开始"}
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
                    {result.kind === "indicator" ? "项目" : "器官"}
                  </span>
                  <b>{result.kind === "indicator" && result.question ? result.question : result.title}</b>
                  <small>{result.kind === "indicator" ? result.questionAnswer || result.subtitle : result.subtitle}</small>
                  {result.match && <small className="search-match">匹配：{result.match}</small>}
                </span>
                <ArrowUpRight size={18} />
              </RouteLink>
            ))}
            {state.data.total === 0 && (
              <div className="search-empty">
                <Search size={26} />
                <p>没有找到匹配的项目。试试“血糖”“肝功能”或项目缩写，也可以换一种问法。</p>
                <p>没有搜索结果不代表没有健康风险，本工具不能判断是否需要就医。</p>
                <SearchSuggestions suggestions={state.data.suggestions} onChoose={changeQuery} />
                <RouteLink page="indicators" className="text-link">浏览已开放的体检项目</RouteLink>
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
