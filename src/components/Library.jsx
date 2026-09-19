import React, { useEffect, useState } from "react";
import { BookOpen, Bookmark, Search } from "lucide-react";
import { useContent } from "../hooks";
import { IndicatorCard, LoadState, PageIntro, Pagination } from "./ContentUI";
import { useSearchInput } from "../useSearchInput";
import SearchSuggestions from "./SearchSuggestions";
import { RouteLink } from "./RouteLink";

export default function Library({
  savedOnly = false,
  saved = [],
  onOpen,
  onBrowse,
  kind = "indicator",
  onRemove,
}) {
  const { query, setQuery, effective, pending, inputProps } = useSearchInput();
  const [category, setCategory] = useState("");
  const [cursor, setCursor] = useState("0");
  const savedKey = JSON.stringify(saved);
  useEffect(() => { if (savedOnly) setCursor("0"); }, [savedKey, savedOnly]);
  const state = useContent(savedOnly ? "saved" : "list", [
    {
      kind,
      query: effective,
      category,
      cursor,
      limit: 6,
      ...(savedOnly ? { ids: saved } : {}),
    },
  ]);
  const data = pending ? null : state.data;
  function filter(setter, value) {
    setter(value);
    setCursor("0");
  }
  return (
    <>
      {!savedOnly && <div>
      <PageIntro
        label="THE INDICATOR LIBRARY"
        title="读懂数字背后的身体语言。"
        description="先找到一个关心的指标，再理解它与身体的联系。每篇内容都可追溯来源。"
      />
      </div>}
      {!savedOnly && <section className="lookup-help" aria-label="术语查找提示">
        <h2>先输入体检单上的一个词</h2>
        <p>支持指标名称、英文缩写和相关术语。这里只查找科普专题，不判断检查结果是否正常；请勿输入姓名、联系方式或完整报告。</p>
      </section>}
      <section className="library-controls">
        <label className="library-search">
          <Search size={18} />
          <input
            {...inputProps}
            id={savedOnly ? "saved-search" : "indicator-search"}
            value={query}
            onChange={(e) => filter(setQuery, e.target.value)}
            placeholder={kind === "organ" ? "搜索已收藏的器官" : "搜索指标、英文缩写或关键词"}
            aria-label={kind === "organ" ? "筛选收藏器官" : "筛选指标"}
          />
        </label>
        <div className="category-filters">
          <button
            className={!category ? "active" : ""}
            onClick={() => filter(setCategory, "")}
          >
            {kind === "organ" ? "全部器官" : "全部指标"}
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
      </section>
      {!savedOnly && !query && !category && data?.items.some(item => item.tags?.length) && <div className="term-suggestions" aria-label="可查找的术语示例">
        <span>从已有专题试一试</span>
        {[...new Set(data.items.flatMap(item => item.tags || []))].slice(0, 6).map(term => <button key={term} onClick={() => filter(setQuery, term)}>{term}</button>)}
      </div>}
      {pending ? <p className="search-hint" role="status">输入完成后查找…</p> : <LoadState {...state} />}
      {data && (
        <>
          <div className="result-count">
            {savedOnly ? "当前可阅读" : "找到"} {data.total} 个专题
            <span>按主题慢慢了解，不必一次记住</span>
          </div>
          <div className="indicator-grid library-grid">
            {data.items.map((item) => (
              savedOnly ? <div className="saved-card" key={item.id}>
                {kind === "indicator" ? <IndicatorCard item={item} onOpen={onOpen} /> : <RouteLink className="saved-organ-card" page="organs" id={item.id} onNavigate={() => onOpen(item.id)}>
                  <span>器官科普</span><h3>{item.title}</h3><p>{item.subtitle}</p><small>{item.referenceCount} 份参考资料</small>
                </RouteLink>}
                <button className="remove-saved" aria-label={`移除${item.title}收藏`} onClick={() => { setCursor("0"); onRemove(item); }}>移除收藏</button>
              </div> : <IndicatorCard key={item.id} item={item} onOpen={onOpen} />
            ))}
          </div>
          <Pagination
            cursor={cursor}
            nextCursor={data.nextCursor}
            onChange={setCursor}
          />
          {data.total === 0 && (
            <div className="empty-state">
              <span>
                {savedOnly ? <Bookmark size={28} /> : <Search size={28} />}
              </span>
              <h2>
                {savedOnly && !query && !category
                  ? saved.length ? "当前没有可阅读的收藏" : "你的健康知识库，等你开启"
                  : "暂时没有匹配的内容"}
              </h2>
              <p>
                {savedOnly
                  ? query || category ? "当前收藏中没有匹配结果，可清除筛选后再找。" : "在指标或器官详情页点击收藏，即可在这里找到。"
                  : "换一个关键词，或查看全部指标。"}
              </p>
              <SearchSuggestions suggestions={data.suggestions} onChoose={value => filter(setQuery, value)} />
              {query && category && <button className="clear-category" onClick={() => filter(setCategory, "")}>保留关键词，清除分类限制</button>}
              {savedOnly && (query || category) && <button className="clear-category" onClick={() => { setQuery(""); setCategory(""); setCursor("0"); }}>清除收藏筛选</button>}
              <button
                className="primary-button"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setCursor("0");
                  if (savedOnly) onBrowse();
                }}
              >
                {kind === "organ" ? "浏览器官专题" : "浏览全部指标"}
              </button>
            </div>
          )}
        </>
      )}
      {!savedOnly && (
        <section className="reading-guide">
          <BookOpen size={25} />
          <div>
            <h2>读体检单，可以从这三步开始</h2>
            <div className="guide-grid">
              {[
                [
                  "确认检查条件",
                  "是否空腹、采样时间、近期运动和用药，都可能影响结果。",
                ],
                [
                  "结合相关指标",
                  "同一个身体系统往往需要多个指标共同观察，单一异常不等于确诊。",
                ],
                [
                  "关注变化与背景",
                  "对照历次结果，结合症状、病史和报告参考区间，必要时请医生评估。",
                ],
              ].map(([title, text], i) => (
                <div key={title}>
                  <span>0{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
