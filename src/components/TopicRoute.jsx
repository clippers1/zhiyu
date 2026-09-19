import React from "react";
import { ArrowRight } from "lucide-react";
import { useContent } from "../hooks";
import { LoadState } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { readingRoute } from "../services/topics";
import { contentTrust } from "../services/content-status";

export function TopicCards({ items }) {
  if (!items.length) return null;
  return <section className="topic-section" aria-labelledby="topic-section-title">
    <h2 id="topic-section-title">选一个专题，顺着读下去</h2>
    <p>从概念到关联器官，再回到参考来源。可按顺序阅读，也可直接跳到关心的部分。</p>
    <div className="topic-cards">{items.map(item => <RouteLink key={item.id} page="topics" id={item.id}>
      <span>专题阅读路线</span><h3>认识{item.title}</h3><p>{item.subtitle}</p>
      <span>{contentTrust(item).short}</span>
      <b>查看路线 <ArrowRight size={16} /></b>
    </RouteLink>)}</div>
  </section>;
}

export function TopicReturn({ id, title }) {
  return <RouteLink className="text-link" page="topics" id={id}>查看{title}阅读路线 <ArrowRight size={15} /></RouteLink>;
}

export default function TopicRoute({ id }) {
  const state = useContent("get", ["indicator", id]);
  const detail = state.data;
  const related = useContent("list", [{ kind: "organ", ids: (detail?.relatedOrgans || []).map(item => item.id), limit: 24 }]);
  const steps = readingRoute(detail, related.data?.items || []);
  return <div className="topic-reader">
    <RouteLink page="map" className="text-link">返回健康地图</RouteLink>
    <LoadState {...state} />
    {detail && <>
      <header className="topic-heading">
        <span className="overline">READING ROUTE · 专题阅读路线</span>
        <h1>认识{detail.title}的阅读路线</h1>
        <p>{detail.subtitle}</p>
        <p>这是一份阅读顺序建议，不是检查、诊断或治疗路径。无需按顺序完成，也不记录阅读进度。</p>
        {contentTrust(detail).kind !== "reviewed" && <p className="review-notice">{contentTrust(detail).label}</p>}
      </header>
      <LoadState {...related} />
      {related.error && <p>关联器官暂时加载失败，仍可阅读指标和核对来源。</p>}
      {related.data && steps.length === 2 && <p className="topic-note">目前没有可阅读的关联器官专题，先了解指标与来源；未展示不代表没有医学关联。</p>}
      <ol className="topic-steps" aria-label="专题阅读步骤">{steps.map((step, index) => <li key={step.key}>
        <span className="topic-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <div><h2><a href={step.href}>{step.title} <ArrowRight size={17} /></a></h2><p>{step.description}</p>
          <small>{contentTrust(step.trust).label}</small>
        </div>
      </li>)}</ol>
      <p className="topic-note">各篇内容独立展示来源和版本状态。有关联不表示异常由该器官引起，也不代表内容已覆盖全部相关知识。</p>
      <RouteLink page="indicators" className="text-link">查找其他指标 <ArrowRight size={15} /></RouteLink>
    </>}
  </div>;
}
