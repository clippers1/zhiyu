import React from "react";
import { FeedbackPanel } from "./Feedback";
import ReadingFeedback from "./ReadingFeedback";
import { RouteLink } from "./RouteLink";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Droplet,
  ExternalLink,
  HeartPulse,
  Layers3,
  RefreshCw,
} from "lucide-react";

const icons = { droplet: Droplet, "heart-pulse": HeartPulse, layers: Layers3 };
export function IndicatorCard({ item, onOpen }) {
  const Icon = icons[item.icon] || BookOpen;
  return (
    <RouteLink page="article" id={item.id}
      className={`indicator-card ${item.color}`}
      onNavigate={() => onOpen(item.id)}
    >
      <div className="card-top">
        <span className="metric-icon">
          <Icon size={22} />
        </span>
        <span className="card-number">{item.number}</span>
      </div>
      <div className="metric-title">
        <h3>{item.title}</h3>
        <span>{item.english}</span>
      </div>
      <p>{item.subtitle}</p>
      {item.match && <span className="search-match">匹配：{item.match}</span>}
      <div className="tags">
        {item.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="card-bottom">
        <span>
          <BookOpen size={12} /> {item.referenceCount} 份参考资料
        </span>
        <ArrowUpRight size={17} />
      </div>
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
export function PageIntro({ label, title, description }) {
  return (
    <div className="page-intro">
      <span className="overline">{label}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
export function SectionTitle({ kicker, title, desc, action, onClick, page = "indicators" }) {
  return (
    <div className="section-heading">
      <div>
        <div className="section-kicker">{kicker}</div>
        <h2>{title}</h2>
        <p>{desc}</p>
      </div>
      {action && (
        <RouteLink page={page} className="text-link" onNavigate={onClick}>
          {action}
          <ArrowUpRight size={16} />
        </RouteLink>
      )}
    </div>
  );
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
      {content.reviewStatus === "reviewed" && content.review && (
        <p className="source-explanation">
          医学审校：{content.review.name}
          {content.review.professionalTitle && ` · ${content.review.professionalTitle}`}
          {content.review.reviewedAt && ` · ${content.review.reviewedAt.slice(0, 10)}`}
        </p>
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
          {content.reviewStatus === "reviewed"
            ? "已完成专业审校"
            : "科普整理 · 待专业审校"}
        </span>
      </div>
    </section>
    <ReadingFeedback key={`reaction:${content.kind}:${content.id}:${content.releaseID || `${content.version}:${content.updatedAt}`}`} content={content} />
    <FeedbackPanel key={`${content.kind}:${content.id}:${content.releaseID}`} content={content} />
    </>
  );
}
