import React, { useMemo, useState } from "react";
import { ArrowRight, BookMarked, Search, X } from "lucide-react";
import { BoundaryNote, RunHead } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import {
  filterGlossary,
  GLOSSARY_GROUPS,
  GLOSSARY_ITEMS,
  GLOSSARY_LETTERS,
} from "../services/glossary";
import "./glossary.css";

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Glossary({ go, onOpen }) {
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState("");
  const [group, setGroup] = useState("all");

  const filtered = useMemo(
    () => filterGlossary({ query, letter, group }),
    [query, letter, group],
  );

  const groupedByLetter = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      if (!map.has(item.letter)) map.set(item.letter, []);
      map.get(item.letter).push(item);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const activeLetters = useMemo(() => new Set(GLOSSARY_LETTERS), []);

  function resetFilters() {
    setQuery("");
    setLetter("");
    setGroup("all");
  }

  return (
    <div className="glossary-page">
      <header className="glossary-head">
        <RunHead>
          <b>体检项目</b> / 英文缩写 A–Z 速查
        </RunHead>
        <h1 className="statement">对着报告单字母，3 秒查清它是什么。</h1>
        <p className="lede">
          收录体检报告上最常见的 {GLOSSARY_ITEMS.length} 个英文缩写与影像分级词（如 ALT、eGFR、TSH、HbA1c、TI-RADS、BI-RADS），先看中文全称和观察方向，再一键进入详细专题。
        </p>
      </header>

      <section className="glossary-controls" aria-label="筛选体检缩写">
        <label className="library-search">
          <Search size={18} aria-hidden="true" />
          <input
            id="glossary-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setLetter("");
            }}
            placeholder="输入缩写或中文（如 ALT、eGFR、转氨酶、磨玻璃、BI-RADS）"
            aria-label="搜索体检缩写"
          />
          {query && (
            <button
              type="button"
              className="glossary-clear-input"
              aria-label="清空搜索"
              onClick={() => setQuery("")}
            >
              <X size={16} />
            </button>
          )}
        </label>

        <div className="category-filters" role="group" aria-label="按体检系统筛选">
          {GLOSSARY_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={group === g.id ? "active" : ""}
              onClick={() => setGroup(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        <nav className="glossary-alpha" aria-label="按首字母快速筛选">
          <button
            type="button"
            className={!letter ? "active" : ""}
            onClick={() => setLetter("")}
          >
            全部
          </button>
          {ALL_LETTERS.map((ch) => {
            const available = activeLetters.has(ch);
            return (
              <button
                key={ch}
                type="button"
                disabled={!available}
                className={letter === ch ? "active" : ""}
                onClick={() => setLetter(letter === ch ? "" : ch)}
              >
                {ch}
              </button>
            );
          })}
        </nav>
      </section>

      <div className="result-count">
        找到 {filtered.length} 个常见体检缩写
        {(query || letter || group !== "all") && (
          <button type="button" className="glossary-reset-btn" onClick={resetFilters}>
            重置筛选
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        query.trim() ? (
          <div className="glossary-grid glossary-search-results">
            {filtered.map((item) => (
              <article className="glossary-card" key={item.code}>
                <div className="glossary-card-top">
                  <span className="glossary-code">{item.code}</span>
                  <div className="glossary-names">
                    <h3>{item.zh}</h3>
                    <p className="glossary-en">{item.en}</p>
                  </div>
                </div>
                <p className="glossary-summary">{item.summary}</p>
                <RouteLink
                  page="article"
                  id={item.articleId}
                  className="text-link glossary-link"
                  onNavigate={() => onOpen?.(item.articleId)}
                >
                  查看对应专题详解 <ArrowRight size={14} aria-hidden="true" />
                </RouteLink>
              </article>
            ))}
          </div>
        ) : (
        <div className="glossary-sections">
          {groupedByLetter.map(([ch, items]) => (
            <section className="glossary-letter-group" key={ch} id={`glossary-${ch}`} aria-labelledby={`glossary-h-${ch}`}>
              <h2 className="glossary-letter-heading" id={`glossary-h-${ch}`}>
                <span>{ch}</span>
                <small>{items.length} 项</small>
              </h2>
              <div className="glossary-grid">
                {items.map((item) => (
                  <article className="glossary-card" key={item.code}>
                    <div className="glossary-card-top">
                      <span className="glossary-code">{item.code}</span>
                      <div className="glossary-names">
                        <h3>{item.zh}</h3>
                        <p className="glossary-en">{item.en}</p>
                      </div>
                    </div>
                    <p className="glossary-summary">{item.summary}</p>
                    <RouteLink
                      page="article"
                      id={item.articleId}
                      className="text-link glossary-link"
                      onNavigate={() => onOpen?.(item.articleId)}
                    >
                      查看对应专题详解 <ArrowRight size={14} aria-hidden="true" />
                    </RouteLink>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        )
      ) : (
        <div className="empty-state">
          <BookMarked size={28} />
          <h2>未找到匹配的缩写</h2>
          <p>可以试试去掉筛选条件，或到体检项目目录里用日常说法搜索。</p>
          <button type="button" className="primary-button" onClick={resetFilters}>
            查看全部 {GLOSSARY_ITEMS.length} 个缩写
          </button>
        </div>
      )}

      <BoundaryNote trust={null}>
        本词典仅解释体检报告单常见英文缩写的中文全称与观察方向，不提供参考数值范围、异常判定或诊疗建议；不同医院对同一项目的缩写写法可能略有差异，请以报告单完整名称为准。
      </BoundaryNote>

      <section className="topic-followup" aria-label="继续阅读">
        <h2>继续读</h2>
        <p>查清字母含义后，可以看看化验单四列栏目的阅读方法，或回到体检项目总目录继续浏览。</p>
        <RouteLink page="guide" className="text-link" onNavigate={() => go?.("guide")}>
          单子怎么读（四列结构与四步阅读流程） <ArrowRight size={15} />
        </RouteLink>
        <RouteLink page="indicators" className="text-link" onNavigate={() => go?.("indicators")}>
          浏览全部 20 项体检专题 <ArrowRight size={15} />
        </RouteLink>
      </section>
    </div>
  );
}
