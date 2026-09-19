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
      <h2 id="dialog-title">想了解身体的哪一部分？</h2>
      <div className="search-input-wrap">
        <Search size={21} />
        <input
          {...inputProps}
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          placeholder="试试“血糖”“肝脏”或“LDL”"
          aria-label="搜索指标或器官"
        />
      </div>
      <p className="search-safety">按知识主题查找，不用于判断症状或诊断。请勿输入姓名、联系方式或完整体检报告。</p>
      {pending ? <p role="status" className="search-hint">输入完成后查找…</p> : <LoadState {...state} />}
      {!pending && state.data && (
        <>
          <p className="search-hint">
            {effective.trim()
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
                  {result.match && <small className="search-match">匹配：{result.match}</small>}
                </span>
                <ArrowUpRight size={18} />
              </RouteLink>
            ))}
            {state.data.total === 0 && (
              <div className="search-empty">
                <Search size={26} />
                <p>暂时没有这个专题。试试血糖、血压、血脂或器官名称。</p>
                <p>没有搜索结果不代表没有健康风险，本工具不能判断是否需要就医。</p>
                <SearchSuggestions suggestions={state.data.suggestions} onChoose={changeQuery} />
                <div className="search-suggestions">{["血糖", "血压", "血脂"].map(word => <button key={word} onClick={() => changeQuery(word)}>查找{word}</button>)}</div>
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
