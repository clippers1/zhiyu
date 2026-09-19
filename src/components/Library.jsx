import React, { useState } from "react";
import { BookOpen, Bookmark, Search } from "lucide-react";
import { useContent } from "../hooks";
import { IndicatorCard, LoadState, PageIntro, Pagination } from "./ContentUI";

export default function Library({
  savedOnly = false,
  saved = [],
  onOpen,
  onBrowse,
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [cursor, setCursor] = useState("0");
  const state = useContent("list", [
    {
      kind: "indicator",
      query,
      category,
      cursor,
      limit: 6,
      ...(savedOnly ? { ids: saved } : {}),
    },
  ]);
  const data = state.data;
  function filter(setter, value) {
    setter(value);
    setCursor("0");
  }
  return (
    <>
      <div id={savedOnly ? "reading-collection" : undefined}>
      <PageIntro
        label={
          savedOnly ? "YOUR LITTLE HEALTH LIBRARY" : "THE INDICATOR LIBRARY"
        }
        title={
          savedOnly ? "把有用的知识，留给自己。" : "读懂数字背后的身体语言。"
        }
        description={
          savedOnly
            ? "收藏你关心的指标，随时回来温习。收藏保存在当前浏览器中。"
            : "先找到一个关心的指标，再理解它与身体的联系。每篇内容都可追溯来源。"
        }
      />
      </div>
      {!savedOnly && <section className="lookup-help" aria-label="术语查找提示">
        <h2>先输入体检单上的一个词</h2>
        <p>支持指标名称、英文缩写和相关术语。这里只查找科普专题，不判断检查结果是否正常；请勿输入姓名、联系方式或完整报告。</p>
      </section>}
      <section className="library-controls">
        <label className="library-search">
          <Search size={18} />
          <input
            id={savedOnly ? "saved-search" : "indicator-search"}
            value={query}
            onChange={(e) => filter(setQuery, e.target.value)}
            placeholder="搜索指标、英文缩写或关键词"
            aria-label="筛选指标"
          />
        </label>
        <div className="category-filters">
          <button
            className={!category ? "active" : ""}
            onClick={() => filter(setCategory, "")}
          >
            全部指标
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
      <LoadState {...state} />
      {data && (
        <>
          <div className="result-count">
            {savedOnly ? "已收藏" : "找到"} {data.total} 个专题
            <span>按主题慢慢了解，不必一次记住</span>
          </div>
          <div className="indicator-grid library-grid">
            {data.items.map((item) => (
              <IndicatorCard key={item.id} item={item} onOpen={onOpen} />
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
                  ? "你的健康知识库，等你开启"
                  : "暂时没有匹配的内容"}
              </h2>
              <p>
                {savedOnly
                  ? "在知识详情页点击收藏，即可在这里找到。"
                  : "换一个关键词，或查看全部指标。"}
              </p>
              <button
                className="primary-button"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setCursor("0");
                  if (savedOnly) onBrowse();
                }}
              >
                浏览全部指标
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
