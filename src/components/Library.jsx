import React, { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useContent } from "../hooks";
import { IndexRow, LoadState, Pagination, QuestionRow, RunHead } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { useSearchInput } from "../useSearchInput";
import SearchSuggestions from "./SearchSuggestions";

// 体检项目：搜索置顶，分类胶囊横向滚动，列表按问题索引组织。
// 只显示当前已发布内容，项目名/缩写/别名仍可搜索；输入关键词时同步匹配体检准备与日常长文。
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
  const crossStorySearch = Boolean(effective.trim() && !category);
  const storyState = useContent("list", [
    crossStorySearch
      ? { kind: "story", query: effective, limit: 6 }
      : { kind: "story", ids: [], limit: 6 },
  ]);
  const data = pending ? null : state.data;
  const matchedStories = !pending && crossStorySearch ? (storyState.data?.items || []) : [];
  function filter(setter, value) {
    setter(value);
    setCursor("0");
  }
  return (
    <>
      <header className="library-head">
        <RunHead><b>体检项目</b> / 索引</RunHead>
        <h1 className="statement library-title">读懂数字背后的身体语言。</h1>
      </header>
      <section className="library-controls" aria-labelledby="library-title-label">
        <h2 id="library-title-label" className="visually-hidden">查找体检项目</h2>
        <label className="library-search">
          <Search size={18} aria-hidden="true" />
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
        <div className="glossary-entry-banner">
          <p>
            <b>报告单上只印了英文字母？</b>如 ALT、eGFR、TSH、HbA1c、TI-RADS、BI-RADS，可用 A–Z 词典 3 秒定位。
          </p>
          <RouteLink page="glossary">
            A–Z 缩写速查 <ArrowRight size={14} aria-hidden="true" />
          </RouteLink>
        </div>
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
          {matchedStories.length > 0 && (
            <section className="library-stories" aria-labelledby="library-stories-title">
              <div className="result-count">
                <span id="library-stories-title">相关的体检准备与日常长文（{matchedStories.length} 篇）</span>
              </div>
              <div className="index-list">
                {matchedStories.map((item) => (
                  <IndexRow key={item.id} item={item} onOpen={onOpen} />
                ))}
              </div>
            </section>
          )}
          {data.total === 0 && matchedStories.length === 0 && (
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
