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
export default function Home({ go, onOpen, onOrgan, setTour }) {
  const state = useContent("list", [
    { kind: "indicator", featured: true, limit: 3 },
  ]);
  const indicators = state.data?.items || [];
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
              <button
                className="primary-button"
                onClick={() => go("indicators")}
              >
                开启健康探索 <ArrowRight size={17} />
              </button>
              <button className="play-button" onClick={() => setTour(0)}>
                <span>
                  <Play size={12} fill="currentColor" />
                </span>{" "}
                1 分钟认识身体
              </button>
            </div>
            <div className="hero-note">
              <ShieldCheck size={15} /> 科学知识 · 可视化理解 · 轻松一点点
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-caption">
              <span className="live-dot" /> 你的身体，是一个相互连接的世界
            </div>
            <BodyArt
              selected="heart"
              onSelect={(id) => {
                onOrgan(id);
              }}
            />
            <div className="visual-bottom">
              <span>THE HUMAN BODY</span>
              <span>
                点击器官，发现更多 <Plus size={12} />
              </span>
            </div>
          </div>
        </section>
        <section className="indicator-section">
          <SectionTitle
            kicker="READ YOUR NUMBERS"
            title="体检单上的数字，在说什么？"
            desc="从最常见的三类指标，读懂身体发出的信号。"
            action="浏览指标百科"
            onClick={() => go("indicators")}
          />
          <div className="indicator-grid">
            {indicators.map((item) => (
              <IndicatorCard key={item.id} item={item} onOpen={onOpen} />
            ))}
          </div>
        </section>
        <div className="lower-grid">
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
                <small>查看依据与审校状态</small>
              </div>
            </div>
            <button className="text-link" disabled={!featured} onClick={() => onOpen(featured.id)}>
              查看过程与参考资料 <ArrowRight size={15} />
            </button>
          </section>
          <section className="daily-card">
            <div className="daily-top">
              <span>
                <Sparkles size={15} /> 编辑精选
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
            <button className="text-link" disabled={!selected} onClick={() => onOpen(selected.id)}>
              了解知识与来源 <ArrowRight size={15} />
            </button>
          </section>
        </div>
        <section className="organ-strip">
          <div className="organ-strip-icon">
            <Heart size={25} />
          </div>
          <div>
            <h3>认识身体里的「默契搭档」</h3>
            <p>心脏、肝脏、肺、肾脏……每个器官都有自己的重要任务。</p>
          </div>
          <button onClick={() => go("organs")}>
            探索人体器官 <ArrowUpRight size={17} />
          </button>
        </section>
      </>
      <LoadState {...state} />
    </div>
  );
}
