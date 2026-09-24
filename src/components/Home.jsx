import React from "react";
import { ArrowRight, Play, Search, ShieldCheck } from "lucide-react";
import BodyArt from "./BodyArt";
import { useContent } from "../hooks";
import { LoadState, SectionTitle } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { contentTrust } from "../services/content-status";
import { TopicCards } from "./TopicRoute";

// H02 首页第一刀：主操作是搜索和问题卡；身体插画下沉到“理解原理”位置。
// 问题卡只从已发布列表生成，不用编辑占位；列表为空或撤回时不出孤儿卡。
export default function Home({ go, onOpen, onOrgan, setTour }) {
  const state = useContent("list", [{ kind: "indicator", limit: 24 }]);
  const organState = useContent("list", [{ kind: "organ", limit: 24 }]);
  const indicators = (state.data?.items || []).filter(item => item.question);
  const organs = organState.data?.items || [];
  return (
    <div className="home-content">
      <>
        <section className="hero" aria-labelledby="home-question-title">
          <div className="hero-content">
            <div className="overline">
              <span /> START WITH A QUESTION
            </div>
            <h1 id="home-question-title">
              看懂体检单，
              <br />
              从<span>一个问题</span>开始。
            </h1>
            <p>
              先弄懂你眼前的那一项，再决定要不要往深里看。
              <br />
              每个问题都连着当前可读的内容与来源。
            </p>
            <a href="/indicators#indicator-search" className="home-search-trigger">
              <Search size={19} />
              <span>搜血糖、血脂、肌酐，或你看到的术语…</span>
              <kbd>⌕</kbd>
            </a>
            <div className="home-intents">
              <span>我现在想了解：</span>
              <RouteLink page="indicators" className="intent-chip" onNavigate={() => go("indicators")}>
                体检项目看不懂
              </RouteLink>
              <a href="#organ-topics" className="intent-chip">
                想认识身体原理
              </a>
            </div>
            <div className="hero-actions">
              <button className="play-button" onClick={() => setTour(0)}>
                <span>
                  <Play size={12} fill="currentColor" />
                </span>{" "}
                1 分钟认识身体
              </button>
            </div>
            <div className="hero-note">
              <ShieldCheck size={15} /> 只显示已发布内容 · 来源可查 · 不解读个人报告
            </div>
          </div>
        </section>
        <section className="indicator-section" aria-labelledby="common-questions-title">
          <SectionTitle
            kicker="COMMON QUESTIONS"
            title="大家常问"
            desc="以下问题来自当前已发布的指标内容；每张卡都能打开一篇可核对的解释。"
            action="看全部问题"
            onClick={() => go("indicators")}
          />
          <LoadState {...state} />
          {state.data && !indicators.length && (
            <p className="home-empty">当前暂无可展示的问题。可前往体检项目列表查看全部可用内容；未展示不代表没有健康风险。</p>
          )}
          <div className="question-grid">
            {indicators.map(item => (
              <RouteLink key={item.id} page="article" id={item.id} className="question-card" onNavigate={() => onOpen(item.id)}>
                <span className="question-kicker">{item.title}</span>
                <h3>{item.question}</h3>
                <p>{item.questionAnswer || item.subtitle}</p>
                <span className="question-meta">
                  {item.referenceCount} 份参考资料 · {contentTrust(item).short}
                </span>
              </RouteLink>
            ))}
          </div>
        </section>
        <TopicCards items={indicators.slice(0, 3)} />
        <section className="organ-topics" id="organ-topics" aria-labelledby="organ-topics-title">
          <SectionTitle
            kicker="UNDERSTAND THE BODY"
            title="进一步理解：身体如何运作"
            desc="已有问题答案后，可以从器官和过程的角度延伸；器官内容不用于判断疾病。"
          />
          <LoadState {...organState} />
          <div className="organ-topic-links">
            {organs.map(organ => (
              <RouteLink key={organ.id} page="organs" id={organ.id} onNavigate={() => onOrgan(organ.id)}>
                <b>{organ.title}</b>
                <span>{organ.subtitle}</span>
              </RouteLink>
            ))}
          </div>
          <div className="hero-visual home-organ-visual">
            <div className="visual-caption">
              <span className="live-dot" /> 认识身体里的器官
            </div>
            <BodyArt
              selected="heart"
              availableIds={organs.map(item => item.id)}
              onSelect={id => onOrgan(id)}
            />
            <div className="visual-bottom">
              <span>THE HUMAN BODY</span>
              <span>亮起的器官可探索</span>
            </div>
          </div>
          {organState.data && !organs.length && (
            <p className="home-empty">器官专题暂未开放，可先浏览体检项目。这里不会使用已撤回的旧内容。</p>
          )}
        </section>
      </>
    </div>
  );
}