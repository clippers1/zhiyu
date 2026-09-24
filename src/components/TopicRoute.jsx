import React from "react";
import { ArrowRight } from "lucide-react";
import { useContent } from "../hooks";
import { LoadState } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { readingRoute } from "../services/topics";
import { contentTrust } from "../services/content-status";
import { selectDiscovery } from "../services/discovery";

export function TopicReturn({ id, title }) {
  return <RouteLink className="text-link" page="topics" id={id}>查看{title}阅读路线 <ArrowRight size={15} /></RouteLink>;
}

function TopicIndex() {
  const state = useContent("list", [{ kind: "indicator", limit: 12 }]);
  const { questions } = selectDiscovery(state.data?.items);
  return <div className="topic-reader">
    <RouteLink page="map" className="text-link">返回首页</RouteLink>
    <LoadState {...state} />
    {state.data && <>
      <header className="topic-heading">
        <h1>拿到体检单，从哪里开始？</h1>
        <p>选一个你关心的项目，了解它的含义、局限和来源。下面只是阅读入口，不是检查顺序，也不解读个人结果。</p>
      </header>
      <div className="topic-cards">{questions.map(item => <RouteLink key={item.id} page="topics" id={item.id}>
        <span>{item.title}</span><h2>{item.question}</h2><p>{item.questionAnswer}</p>
        <span>{contentTrust(item).short}</span>
        <b>阅读解释与来源 <ArrowRight size={16} /></b>
      </RouteLink>)}</div>
      {!questions.length && <p className="topic-note">目前没有可用的问题路线，可先浏览体检项目目录。</p>}
      <RouteLink page="indicators" className="text-link">查找全部已开放项目 <ArrowRight size={16} /></RouteLink>
    </>}
  </div>;
}

export default function TopicRoute({ id }) {
  if (!id) return <TopicIndex />;
  const state = useContent("get", ["indicator", id]);
  const detail = state.data;
  const related = useContent("list", [{ kind: "organ", ids: (detail?.relatedOrgans || []).map(item => item.id), limit: 24 }]);
  const steps = readingRoute(detail, related.data?.items || []);
  return <div className="topic-reader">
    <RouteLink page="map" className="text-link">返回首页</RouteLink>
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
