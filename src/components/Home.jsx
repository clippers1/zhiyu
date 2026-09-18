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
              <h2>指标不是孤岛，身体是个整体。</h2>
              <span className="mini-badge">关联探索</span>
            </div>
            <p>一起来看看，血糖是怎样被身体调节的。</p>
            <div className="connection-flow">
              <div>
                <span className="flow-icon peach">
                  <Droplet size={22} />
                </span>
                <b>吃进食物</b>
                <small>葡萄糖进入血液</small>
              </div>
              <span className="flow-arrow">
                <i />
                <ArrowRight size={16} />
              </span>
              <div>
                <span className="flow-icon yellow">
                  <Activity size={22} />
                </span>
                <b>胰腺响应</b>
                <small>释放胰岛素信号</small>
              </div>
              <span className="flow-arrow">
                <i />
                <ArrowRight size={16} />
              </span>
              <div>
                <span className="flow-icon green">
                  <Layers3 size={22} />
                </span>
                <b>细胞利用</b>
                <small>摄取葡萄糖供能</small>
              </div>
              <span className="flow-arrow">
                <i />
                <ArrowRight size={16} />
              </span>
              <div>
                <span className="flow-icon blue">
                  <TrendingUp size={22} />
                </span>
                <b>回归平衡</b>
                <small>血糖逐渐回落</small>
              </div>
            </div>
            <button className="text-link" onClick={() => onOpen("glucose")}>
              查看过程与参考资料 <ArrowRight size={15} />
            </button>
          </section>
          <section className="daily-card">
            <div className="daily-top">
              <span>
                <Sparkles size={15} /> 今天多懂一点
              </span>
              <span>来自 WHO</span>
            </div>
            <div className="daily-illustration">
              <div className="daily-orbit" />
              <HeartPulse size={51} strokeWidth={1.3} />
              <span className="tiny-plus">+</span>
              <span className="tiny-dot" />
            </div>
            <h3>
              没有症状，
              <br />
              血压就一定正常吗？
            </h3>
            <p>
              高血压常常没有明显症状。
              <br />
              规律测量，比“凭感觉”更可靠。
            </p>
            <button className="text-link" onClick={() => onOpen("pressure")}>
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
