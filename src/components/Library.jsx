import React, { useState } from "react";
import { Search } from "lucide-react";
import { useContent } from "../hooks";
import { LoadState, Pagination, QuestionRow } from "./ContentUI";
import { useSearchInput } from "../useSearchInput";
import SearchSuggestions from "./SearchSuggestions";

// H03：体检项目列表按问题索引组织。项目名/缩写/别名仍可搜索，
// 只显示当前已发布内容，不提供器官以外的新范围。
export default function Library({ onOpen }) {
  const { query, setQuery, effective, pending, inputProps } = useSearchInput();
  const [category, setCategory] = useState("");
  const [cursor, setCursor] = useState("0");
  const state = useContent("list", [
    {
      kind: "indicator",
      query: effective,
      category,
      cursor,
      limit: 6,
    },
  ]);
  const data = pending ? null : state.data;
  function filter(setter, value) {
    setter(value);
    setCursor("0");
  }
  return (
    <>
      <section className="library-controls" aria-labelledby="library-title">
        <h1 id="library-title">查体检项目</h1>
        <label className="library-search">
          <Search size={18} />
          <input
            {...inputProps}
            id="indicator-search"
            value={query}
            onChange={(e) => filter(setQuery, e.target.value)}
            placeholder="搜索项目名称、缩写或你的问题"
            aria-label="筛选体检项目"
          />
        </label>
        <div className="category-filters" aria-label="按分类筛选">
          <button
            className={!category ? "active" : ""}
            onClick={() => filter(setCategory, "")}
          >
            全部项目
          </button>
          {(data?.categories || []).map((c) => (
            <button
              className={category === c.id ? "active" : ""}
              key={c.id}
              onClick={() => filter(setCategory, c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <p className="library-help">可用项目名、缩写或日常说法查找；这里不判断个人检查结果。</p>
      </section>
      {pending ? <p className="search-hint" role="status">输入完成后查找…</p> : <LoadState {...state} />}
      {data && (
        <>
          <div className="result-count">
            找到 {data.total} 个项目专题
            <span>按问题慢慢了解，不必一次记住</span>
          </div>
          <div className="question-list">
            {data.items.map((item) => (
              <QuestionRow key={item.id} item={item} onOpen={onOpen} />
            ))}
          </div>
          <Pagination
            cursor={cursor}
            nextCursor={data.nextCursor}
            onChange={setCursor}
          />
          {data.total === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <h2>没有匹配的项目</h2>
              <p>换一个说法，例如“血糖”“血脂”或项目缩写；也可以查看全部问题。</p>
              <SearchSuggestions suggestions={data.suggestions} onChoose={value => filter(setQuery, value)} />
              {query && category && <button className="clear-category" onClick={() => filter(setCategory, "")}>保留关键词，清除分类限制</button>}
              <button
                className="primary-button"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setCursor("0");
                }}
              >
                浏览全部问题
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
