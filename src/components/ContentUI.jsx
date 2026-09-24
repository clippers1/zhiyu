import React from "react";
import { RouteLink } from "./RouteLink";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { contentTrust } from "../services/content-status";

export function QuestionRow({ item, onOpen }) {
  return (
    <RouteLink page="article" id={item.id}
      className="question-row"
      onNavigate={() => onOpen(item.id)}
    >
      <span className="question-row-main">
        <h3>{item.question || `认识${item.title}`}</h3>
        <span className="question-row-term"><b>{item.title}</b>{item.english && <small>{item.english}</small>}</span>
        <p>{item.questionAnswer || item.subtitle}</p>
        {item.match && <span className="search-match">匹配：{item.match}</span>}
      </span>
      <span className="question-row-meta">
        {contentTrust(item).short} · {item.referenceCount} 份参考资料
        <ArrowRight size={16} aria-hidden="true" />
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
    <>
    <section
      className="source-panel"
      id={`${prefix}-panel`}
      aria-label="知识来源"
    >
      <div className="source-heading">
        <BookOpen size={18} />
        <h3>知识来源</h3>
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
            <span className="source-index">{index + 1}</span>
            <div>
              <span className="source-publisher">{source.publisher}</span>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
                <ExternalLink size={13} />
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
        <span>
          {trust.label}
        </span>
      </div>
    </section>
    </>
  );
}
