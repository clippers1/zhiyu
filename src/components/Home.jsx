import React from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Droplet,
  Heart,
  HeartPulse,
  Layers3,
  Leaf,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import BodyArt from "./BodyArt";
import { useContent } from "../hooks";
import { IndicatorCard, LoadState, SectionTitle } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import StartHere from "./StartHere";
import { TopicCards } from "./TopicRoute";
import { ContinueReading } from "./ReadingTools";
export default function Home({ go, onOpen, onOrgan, setTour, reading }) {
  const state = useContent("list", [
    { kind: "indicator", featured: true, limit: 3 },
  ]);
  const indicators = state.data?.items || [];
  const organState = useContent("list", [{ kind: "organ", limit: 24 }]);
  const organs = organState.data?.items || [];
  const featured = indicators[0];
  const selected = indicators[1] || featured;
  return (
    <div className="home-content">
      <>
        <div className="page-eyebrow">
          <span>
            <span className="status-dot" />
            从了解身体开始，照顾好自己
          </span>
          <span className="eyebrow-right">
            <Leaf size={13} /> 每一点了解，都是健康的积累
          </span>
        </div>
        <StartHere />
        <ContinueReading reading={reading} />
        <section className="hero">
          <div className="hero-content">
            <div className="overline">
              <span /> YOUR BODY, CONNECTED
            </div>
            <h1>
              看懂指标，
              <br />
              也看懂<span>你的身体。</span>
            </h1>
            <p>
              身体里的每个数字，都有它的故事。
              <br />
              从一张体检单出发，看见指标、器官与健康之间的联系。
            </p>
            <div className="hero-actions">
              <RouteLink page="indicators"
                className="primary-button"
                onNavigate={() => go("indicators")}
              >
                开启健康探索 <ArrowRight size={17} />
              </RouteLink>
              <button className="play-button" onClick={() => setTour(0)}>
                <span>
                  <Play size={12} fill="currentColor" />
                </span>{" "}
                1 分钟认识身体
              </button>
            </div>
            <div className="hero-note">
              <ShieldCheck size={15} /> 来源可查 · 核对状态公开 · 按需阅读
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-caption">
              <span className="live-dot" /> 你的身体，是一个相互连接的世界
            </div>
            <BodyArt
              selected="heart"
              availableIds={organs.map(item => item.id)}
              onSelect={(id) => {
                onOrgan(id);
              }}
            />
            <div className="visual-bottom">
              <span>THE HUMAN BODY</span>
              <span>
                亮起的器官可探索 <Plus size={12} />
              </span>
            </div>
          </div>
        </section>
        <section className="indicator-section">
          <SectionTitle
            kicker="READ YOUR NUMBERS"
            title="体检单上的数字，在说什么？"
            desc="从当前可用的专题开始，认识概念、关联与参考来源。"
            action="浏览指标百科"
            onClick={() => go("indicators")}
          />
          <LoadState {...state} />
          {state.data && !indicators.length && <p className="home-empty">当前暂无推荐专题。可前往指标百科查看全部可用内容；未展示不代表没有健康风险。</p>}
          <div className="indicator-grid">
            {indicators.map((item) => (
              <IndicatorCard key={item.id} item={item} onOpen={onOpen} />
            ))}
          </div>
        </section>
        <TopicCards items={indicators} />
        <div className={`lower-grid${selected ? "" : " single-panel"}`}>
          <section className="connection-card">
            <div className="small-overline">
              <span /> EVERYTHING IS CONNECTED
            </div>
            <div className="connection-title">
              <h2>沿着一个问题，把知识串起来。</h2>
              <span className="mini-badge">关联探索</span>
            </div>
            <p>从关心的指标开始，理解关联，再回到知识的来源。</p>
            <div className="connection-flow">
              <div>
                <span className="flow-icon peach">
                  <Droplet size={22} />
                </span>
                <b>找到指标</b>
                <small>从熟悉的术语开始</small>
              </div>
              <span className="flow-arrow">
                <i />
                <ArrowRight size={16} />
              </span>
              <div>
                <span className="flow-icon yellow">
                  <Activity size={22} />
                </span>
                <b>看懂解释</b>
                <small>理解概念与适用范围</small>
              </div>
              <span className="flow-arrow">
                <i />
                <ArrowRight size={16} />
              </span>
              <div>
                <span className="flow-icon green">
                  <Layers3 size={22} />
                </span>
                <b>探索关联</b>
                <small>认识身体中的联系</small>
              </div>
              <span className="flow-arrow">
                <i />
                <ArrowRight size={16} />
              </span>
              <div>
                <span className="flow-icon blue">
                  <TrendingUp size={22} />
                </span>
                <b>核验来源</b>
                <small>查看依据与核对状态</small>
              </div>
            </div>
            {featured && <RouteLink page="article" id={featured.id} className="text-link" onNavigate={() => onOpen(featured.id)}>
              查看过程与参考资料 <ArrowRight size={15} />
            </RouteLink>}
          </section>
          {selected && <section className="daily-card">
            <div className="daily-top">
              <span>
                <Sparkles size={15} /> 从这里读起
              </span>
              <span>{selected?.referenceCount || 0} 份参考资料</span>
            </div>
            <div className="daily-illustration">
              <div className="daily-orbit" />
              <HeartPulse size={51} strokeWidth={1.3} />
              <span className="tiny-plus">+</span>
              <span className="tiny-dot" />
            </div>
            <h3>
              {selected ? `一起认识${selected.title}` : "知识内容正在整理"}
            </h3>
            <p>
              {selected?.subtitle || "从一个关心的问题开始了解。"}
            </p>
            {selected && <RouteLink page="article" id={selected.id} className="text-link" onNavigate={() => onOpen(selected.id)}>
              了解知识与来源 <ArrowRight size={15} />
            </RouteLink>}
          </section>}
        </div>
        <section className="organ-topics" id="organ-topics" aria-labelledby="organ-topics-title">
          <h2 id="organ-topics-title">先选一个想了解的器官</h2>
          <p>以下入口来自当前可用的内容，不按症状推荐，也不判断个人健康状况。</p>
          <LoadState {...organState} />
          <div className="organ-topic-links">{organs.map(organ => <RouteLink page="organs" id={organ.id} key={organ.id} onNavigate={() => onOrgan(organ.id)}>
            <b>{organ.title}</b><span>{organ.subtitle}</span><ArrowUpRight size={17} />
          </RouteLink>)}</div>
          {organState.data && !organs.length && <p className="home-empty">器官专题暂未开放，请先浏览指标百科。这里不会使用已撤回的旧内容。</p>}
        </section>
        {organs.length > 0 && <section className="organ-strip">
          <div className="organ-strip-icon">
            <Heart size={25} />
          </div>
          <div>
            <h3>认识身体里的「默契搭档」</h3>
            <p>心脏、肝脏、肺、肾脏……每个器官都有自己的重要任务。</p>
          </div>
          <RouteLink page="organs" id={organs[0].id} onNavigate={() => onOrgan(organs[0].id)}>
            探索人体器官 <ArrowUpRight size={17} />
          </RouteLink>
        </section>}
      </>
    </div>
  );
}
