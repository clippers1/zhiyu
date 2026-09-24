import React from "react";
import { ArrowRight, Play, Search } from "lucide-react";
import { useContent } from "../hooks";
import { LoadState } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { contentTrust } from "../services/content-status";
import { selectDiscovery } from "../services/discovery";

export default function Home({ go, onOpen, onOrgan, setTour }) {
  const state = useContent("list", [{ kind: "indicator", limit: 24 }]);
  const organState = useContent("list", [{ kind: "organ", limit: 24 }]);
  const { questions, guideAvailable, organPreview } = selectDiscovery(
    state.data?.items,
    organState.data?.items,
  );

  return (
    <div className="home-content">
      <section className="hero" aria-labelledby="home-question-title">
        <div className="hero-content">
          <h1 id="home-question-title">看懂体检单，从一个问题开始。</h1>
          <p>先找到你关心的项目，读懂它能说明什么、不能说明什么。</p>
          <a href="/indicators#indicator-search" className="home-search-trigger">
            <Search size={19} />
            <span>搜索项目名称、缩写或你的问题</span>
          </a>
          <div className="home-intents">
            <RouteLink page="indicators" className="intent-chip" onNavigate={() => go("indicators")}>按体检项目查</RouteLink>
            {guideAvailable && <RouteLink page="topics" className="intent-chip" onNavigate={() => go("topics")}>从体检单开始</RouteLink>}
          </div>
        </div>
      </section>

      <section className="indicator-section" aria-labelledby="common-questions-title">
        <div className="home-section-heading">
          <h2 id="common-questions-title">先回答一个问题</h2>
          <RouteLink page="indicators" onNavigate={() => go("indicators")}>查看全部问题 <ArrowRight size={16} /></RouteLink>
        </div>
        <LoadState {...state} />
        {state.data && !questions.length && <p className="home-empty">目前没有可阅读的问题，可到体检项目目录查看已开放的内容。</p>}
        {questions.length > 0 && <div className="question-grid">
          {questions.map(item => <RouteLink key={item.id} page="article" id={item.id} className="question-card" onNavigate={() => onOpen(item.id)}>
            <span className="question-kicker">{item.title}</span>
            <h3>{item.question}</h3>
            <p>{item.questionAnswer}</p>
            <span className="question-meta">{contentTrust(item).short} · 阅读解释与来源 <ArrowRight size={15} /></span>
          </RouteLink>)}
        </div>}
      </section>

      {guideAvailable && <section className="home-reading-path" aria-labelledby="home-reading-path-title">
        <h2 id="home-reading-path-title">想接着了解？</h2>
        <RouteLink page="topics" onNavigate={() => go("topics")}>
          <span>体检单阅读入口</span>
          <h3>从一个看不懂的项目开始</h3>
          <p>选一个问题，读完解释与局限，再决定是否了解相关的身体知识。</p>
          <span>挑一个问题开始 <ArrowRight size={16} /></span>
        </RouteLink>
      </section>}

      {(organPreview || organState.loading || organState.error) && <section className="organ-topics" id="organ-topics" aria-labelledby="organ-topics-title">
        <div className="home-section-heading">
          <h2 id="organ-topics-title">进一步理解：身体如何运作</h2>
          {organPreview && <RouteLink page="organs" id={organPreview.id} onNavigate={() => onOrgan(organPreview.id)}>认识身体 <ArrowRight size={16} /></RouteLink>}
        </div>
        <LoadState {...organState} />
        {organPreview && <>
          <div className="organ-topic-links">
            <RouteLink page="organs" id={organPreview.id} onNavigate={() => onOrgan(organPreview.id)}>
              <b>{organPreview.title}</b>
              <span>{organPreview.subtitle}</span>
              <ArrowRight size={17} />
            </RouteLink>
          </div>
          <button className="play-button" onClick={() => setTour(0)}><Play size={16} /> 1 分钟认识身体</button>
        </>}
      </section>}
    </div>
  );
}
