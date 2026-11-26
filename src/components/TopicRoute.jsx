import React from "react";
import { ArrowRight } from "lucide-react";
import { useContent } from "../hooks";
import { LoadState } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { readingRoute } from "../services/topics";
import { contentTrust } from "../services/content-status";
import { selectDiscovery } from "../services/discovery";

const SCENARIO_BUNDLES = [
  {
    id: "metabolism-cluster",
    kicker: "代谢联读",
    title: "血糖、血脂、脂肪肝与尿酸，为什么总一起亮红灯？",
    desc: "四项常见代谢指标共享能量储存与胰岛素响应链条，放在一起看比单盯某一行更有头绪。",
    items: ["glucose", "lipids", "fatty-liver", "uric-acid", "liver-function"],
  },
  {
    id: "nodules-vs-function",
    kicker: "形态 vs 功能",
    title: "B 超或 CT 报了结节息肉，抽血却全正常怎么理解？",
    desc: "影像看「长什么样」，抽血看「干活快不快」；把两种检查的边界分清，能少走很多焦虑弯路。",
    items: ["thyroid-nodule", "thyroid-function", "breast-ultrasound", "lung-nodule", "gallbladder"],
  },
  {
    id: "vascular-load",
    kicker: "血管长期负荷",
    title: "从血压、心电图到颈动脉斑块，看懂心血管的长期线索",
    desc: "把单次诊室测量、电信号节律与颈部大动脉超声串起来，理解为什么血压要配合家庭记录和血脂一起看。",
    items: ["pressure", "white-coat-bp", "ecg", "carotid-ultrasound", "lipids"],
  },
  {
    id: "report-literacy",
    kicker: "体检前与拿到单子后",
    title: "空腹准备、前测干扰、影像分工与历年旧单对比",
    desc: "一套可转发给家人的体检实用通识：检查前别踩坑，拿到报告先排除假波动再和历年对照。",
    items: ["fasting-test", "pre-test-factors", "lab-range", "imaging-guide", "report-history"],
  },
];

export function TopicReturn({ id, title }) {
  return <RouteLink className="text-link" page="topics" id={id}>查看{title}阅读路线 <ArrowRight size={15} /></RouteLink>;
}

function TopicIndex() {
  const state = useContent("list", [{ kind: "indicator", limit: 48 }]);
  const storyState = useContent("list", [{ kind: "story", limit: 48 }]);
  const { questions } = selectDiscovery(state.data?.items);
  const byId = new Map([
    ...(state.data?.items || []).map(item => [item.id, item]),
    ...(storyState.data?.items || []).map(item => [item.id, item]),
  ]);
  const bundles = SCENARIO_BUNDLES.map(bundle => ({
    ...bundle,
    resolved: bundle.items.map(id => byId.get(id)).filter(Boolean),
  })).filter(bundle => bundle.resolved.length >= 2);

  return <div className="topic-reader">
    <RouteLink page="map" className="text-link">返回首页</RouteLink>
    <LoadState {...state} />
    {state.data && <>
      <header className="topic-heading">
        <h1>拿到体检单，从哪里开始？</h1>
        <p>选一个你关心的项目或体检场景，按顺序了解它的含义、关联和来源。下面只是阅读入口，不是检查顺序，也不解读个人结果。</p>
      </header>
      <div className="topic-cards">{questions.map(item => <RouteLink key={item.id} page="topics" id={item.id}>
        <span>{item.title}</span><h2>{item.question}</h2><p>{item.questionAnswer}</p>
        <span>{contentTrust(item).short}</span>
        <b>阅读解释与来源 <ArrowRight size={16} /></b>
      </RouteLink>)}</div>
      {bundles.length > 0 && (
        <section className="topic-bundles" id="topic-scenarios" aria-labelledby="topic-bundles-title">
          <h2 id="topic-bundles-title">按真实体检场景联读</h2>
          <p className="topic-note">体检单上的发现常成组出现，可以顺着同一场景一次读懂几篇相关文章。</p>
          <div className="bundle-list">
            {bundles.map(bundle => (
              <div className="bundle-card" key={bundle.id}>
                <span className="bundle-kicker">{bundle.kicker}</span>
                <h3>{bundle.title}</h3>
                <p>{bundle.desc}</p>
                <div className="bundle-links">
                  {bundle.resolved.map(item => (
                    <RouteLink key={item.id} page="article" id={item.id} className="bundle-pill">
                      {item.title} <ArrowRight size={13} aria-hidden="true" />
                    </RouteLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {!questions.length && <p className="topic-note">目前没有可用的问题路线，可先浏览体检项目目录。</p>}
      <RouteLink page="indicators" className="text-link">查找全部已开放项目 <ArrowRight size={16} /></RouteLink>
    </>}
  </div>;
}

export default function TopicRoute({ id }) {
  if (!id) return <TopicIndex />;
  const state = useContent("get", ["indicator", id]);
  const detail = state.data;
  const related = useContent("list", [{ kind: "organ", ids: (detail?.relatedOrgans || []).map(item => item.id), limit: 48 }]);
  const relatedIndicators = useContent("list", [{ kind: "indicator", ids: detail?.related || [], limit: 48 }]);
  const steps = readingRoute(detail, related.data?.items || []);
  const siblingItems = (relatedIndicators.data?.items || []).filter(item => item.id !== detail?.id);
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
      {siblingItems.length > 0 && (
        <section className="topic-siblings" aria-label="同组对照项目">
          <h2>还可以对照读的体检项目</h2>
          <div className="bundle-links">
            {siblingItems.map(item => (
              <RouteLink key={item.id} page="article" id={item.id} className="bundle-pill">
                {item.title} <ArrowRight size={13} aria-hidden="true" />
              </RouteLink>
            ))}
          </div>
        </section>
      )}
      <p className="topic-note">各篇内容独立展示来源和版本状态。有关联不表示异常由该器官引起，也不代表内容已覆盖全部相关知识。</p>
      <RouteLink page="indicators" className="text-link">查找其他指标 <ArrowRight size={15} /></RouteLink>
    </>}
  </div>;
}
