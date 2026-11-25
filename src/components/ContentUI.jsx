import React from "react";
import { RouteLink } from "./RouteLink";
import {
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { artworkFor } from "../services/artworks";
import { contentTrust } from "../services/content-status";

export function RunHead({ children, className = "" }) {
  return <p className={`runhead ${className}`.trim()}>{children}</p>;
}

export function SectionHead({ id, title, action }) {
  return (
    <div className="section-head">
      <h2 id={id}>{title}</h2>
      {action}
    </div>
  );
}

export function IndexRow({ item, onOpen }) {
  // A story's title and question are the same sentence; repeating it in the
  // meta line reads like a duplication bug, so only the metadata is shown.
  const heading = item.question || `认识${item.title}`;
  const term = item.title.trim() === heading.trim() ? "" : item.title;
  const meta = [term, item.english, Number.isFinite(item.referenceCount) && `${item.referenceCount} 份来源`].filter(Boolean);
  return (
    <RouteLink
      page="article"
      id={item.id}
      className="index-row"
      onNavigate={onOpen ? () => onOpen(item.id) : undefined}
    >
      <span className="index-number" aria-hidden="true">
        {item.kind === "story" ? "长文" : item.number || "—"}
      </span>
      <div className="index-body">
        <h3>{heading}</h3>
        <p className="index-meta">{meta.join(" · ")}</p>
      </div>
      <span className="index-arrow" aria-hidden="true"><ArrowRight size={16} /></span>
    </RouteLink>
  );
}

export function BodyRow({ item, onOpen }) {
  const artwork = artworkFor(item.id);
  return (
    <RouteLink
      page="organs"
      id={item.id}
      className="body-row"
      onNavigate={onOpen ? () => onOpen(item.id) : undefined}
    >
      <span className="body-thumb" aria-hidden="true">
        {artwork
          ? <img src={artwork.src} alt="" width={artwork.width} height={artwork.height} loading="lazy" decoding="async" />
          : <span>{item.title.slice(0, 1)}</span>}
      </span>
      <span className="body-copy">
        <b>{item.title}</b>
        <span>
          {item.subtitle}
          {Number.isFinite(item.referenceCount) && ` · ${item.referenceCount} 份来源`}
        </span>
      </span>
      <span className="body-arrow" aria-hidden="true"><ArrowRight size={16} /></span>
    </RouteLink>
  );
}

export function Caveat({ id, title, children }) {
  return (
    <div className="caveat" id={id}>
      <b>{title}</b>
      <p>{children}</p>
    </div>
  );
}

export function BoundaryNote({ trust, children }) {
  return (
    <section className="boundary-note" aria-label="内容边界">
      <p><b>内容边界</b> · {children}</p>
      {trust && <span className="stamp">{trust.short}</span>}
    </section>
  );
}

export function NextEntry({ item, onOpen }) {
  if (!item) return null;
  return (
    <nav className="next-entry" aria-label="下一篇">
      <span className="next-label">下一篇</span>
      <RouteLink
        page="article"
        id={item.id}
        className="next-link"
        onNavigate={onOpen ? () => onOpen(item.id) : undefined}
      >
        <span>
          <b>{item.question || `认识${item.title}`}</b>
          <em>{item.number}{item.english ? ` · ${item.english}` : ""}</em>
        </span>
        <ArrowRight size={18} aria-hidden="true" />
      </RouteLink>
    </nav>
  );
}

export function QuestionRow({ item, onOpen }) {
  const thumb = item.leadFigure?.src;
  return (
    <RouteLink page="article" id={item.id}
      className={`question-row${thumb ? " has-thumb" : ""}`}
      onNavigate={() => onOpen(item.id)}
    >
      <span className="question-number" aria-hidden="true">{item.number || "—"}</span>
      <span className="question-row-main">
        <h3>{item.question || `认识${item.title}`}</h3>
        <span className="question-row-term"><b>{item.title}</b>{item.english && <small>{item.english}</small>}</span>
        <p>{item.questionAnswer || item.subtitle}</p>
        {item.match && <span className="search-match">匹配：{item.match}</span>}
      </span>
      <span className="question-row-meta">
        {thumb && (
          <span className="question-row-thumb" aria-hidden="true">
            <img src={thumb} alt="" width={item.leadFigure.width || 960} height={item.leadFigure.height || 640} loading="lazy" decoding="async" />
          </span>
        )}
        <span className="question-row-meta-line">
          {contentTrust(item).short} · {item.referenceCount} 份来源
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </span>
    </RouteLink>
  );
}

export function LoadState({ loading, error, retry }) {
  if (loading)
    return (
      <div className="load-state" role="status">
        <span className="loading-pulse" />
        正在加载知识内容…
      </div>
    );
  if (error)
    return (
      <div className="load-state error-state" role="alert">
        <p>{error}</p>
        <button className="text-link" onClick={retry}>
          <RefreshCw size={15} />
          重新加载
        </button>
      </div>
    );
  return null;
}

export function Pagination({ cursor, nextCursor, onChange }) {
  const hasPrevious = cursor !== "0";
  if (!hasPrevious && !nextCursor) return null;
  return (
    <div className="pagination">
      <button disabled={!hasPrevious} onClick={() => onChange("0")}>
        返回首页
      </button>
      <span>每页最多 6 条，按页阅读</span>
      <button disabled={!nextCursor} onClick={() => onChange(nextCursor)}>
        下一页 <ArrowRight size={15} />
      </button>
    </div>
  );
}

export function Citation({ ids = [], references, prefix }) {
  function jump(id) {
    document
      .getElementById(`${prefix}-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return (
    <span className="citations">
      {ids.map((id) => {
        const index = references.findIndex((r) => r.id === id);
        return index < 0 ? null : (
          <a href={`#${prefix}-${id}`}
            key={id}
            onClick={event => { event.preventDefault(); jump(id); }}
            aria-label={`查看参考资料 ${index + 1}`}
          >
            [{index + 1}]
          </a>
        );
      })}
    </span>
  );
}

export function SourceReferences({ content, prefix = "source" }) {
  const trust = contentTrust(content);
  return (
    <section
      className="source-panel"
      id={`${prefix}-panel`}
      aria-label="知识来源"
    >
      <div className="source-heading">
        <h2>知识来源</h2>
        <span>{content.references.length} 份参考资料</span>
      </div>
      <p className="source-explanation">
        以下为对应知识点的参考原文；中文为科普整理，图示为简化示意。
      </p>
      {content.applicability && (
        <p className="source-explanation">适用范围：{content.applicability}</p>
      )}
      {content.limitations && (
        <p className="source-explanation">不覆盖：{content.limitations}</p>
      )}
      {content.reviewStatus === "reviewed" && content.review && (
        <p className="source-explanation">
          医学审校：{content.review.name}
          {content.review.professionalTitle && ` · ${content.review.professionalTitle}`}
          {content.review.reviewedAt && ` · ${content.review.reviewedAt.slice(0, 10)}`}
        </p>
      )}
      {trust.kind === "source-curated" && (
        <p className="source-explanation">来源整理：本版本已核对具体来源、中文表达和示意边界 · {content.sourceCheck.checkedAt.slice(0, 10)}</p>
      )}
      <ol className="source-list">
        {content.references.map((source, index) => (
          <li key={source.id} id={`${prefix}-${source.id}`}>
            <span className="source-index" aria-hidden="true">{index + 1}</span>
            <div>
              <span className="source-publisher">{source.publisher}</span>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
              <p>{source.scope}</p>
              <small>
                {source.language === "zh" ? "中文原文" : source.language === "en" ? "英文原文" : "参考原文"} · {source.type} · 链接核验 {source.accessedAt}
                {source.locator && ` · ${source.locator}`}
              </small>
            </div>
          </li>
        ))}
      </ol>
      <div className="content-version">
        <span>
          内容版本 v{content.version} · 整理于 {content.updatedAt}
        </span>
        <span>{trust.label}</span>
      </div>
    </section>
  );
}
