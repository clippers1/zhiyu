import React, { useState } from "react";
import { ArrowRight, Play, Search } from "lucide-react";
import { useContent } from "../hooks";
import {
  BodyRow,
  IndexRow,
  LoadState,
  RunHead,
  SectionHead,
} from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { contentTrust } from "../services/content-status";
import { selectDiscovery } from "../services/discovery";

const QUICK_TOPICS = [
  { id: "liver-function", label: "ALT · 肝功" },
  { id: "glucose", label: "HbA1c · 血糖" },
  { id: "thyroid-function", label: "TSH · 甲功" },
  { id: "fatty-liver", label: "脂肪肝" },
  { id: "thyroid-nodule", label: "甲状腺结节" },
  { id: "lung-nodule", label: "肺结节" },
  { id: "ecg", label: "心电图" },
  { id: "tumor-markers", label: "肿瘤标志物" },
  { id: "h-pylori", label: "幽门螺杆菌" },
  { id: "carotid-ultrasound", label: "颈动脉斑块" },
];

export default function Home({ go, onOpen, onOrgan, setTour }) {
  const [showAllStories, setShowAllStories] = useState(false);
  const state = useContent("list", [{ kind: "indicator", limit: 48 }]);
  const organState = useContent("list", [{ kind: "organ", limit: 48 }]);
  const storyState = useContent("list", [{ kind: "story", limit: 48 }]);
  const {
    feature,
    indexRows,
    stories,
    organs,
    guideAvailable,
    totalIndicators,
    totalOrgans,
  } = selectDiscovery(state.data?.items, organState.data?.items, storyState.data?.items);
  const trust = feature ? contentTrust(feature) : null;
  const availableIds = new Set((state.data?.items || []).map((item) => item.id));
  const quickLinks = QUICK_TOPICS.filter((item) => availableIds.has(item.id));

  return (
    <div className="home-content">
      <div className="home-layout">
        <div className="home-main">
          <RunHead><b>读体检单</b> / 从一张单子读起</RunHead>
          <h1 className="statement home-statement">从一张体检单读起。</h1>
          <p className="lede home-lede">
            {totalIndicators > 0
              ? `${totalIndicators} 个常见项目，讲清它能说明什么，以及不能说明什么。`
              : "从一个常见项目开始，讲清它依据什么、能说明什么，以及不能说明什么。"}
          </p>
          <a href="/indicators#indicator-search" className="home-search-trigger">
            <Search size={17} aria-hidden="true" />
            <span>搜索项目名称、缩写或你的问题</span>
          </a>
          <RouteLink page="guide" className="home-report-guide" onNavigate={() => go("guide")}>
            <b>单子怎么读</b>
            <span>先认清报告单的四列</span>
            <ArrowRight size={15} aria-hidden="true" />
          </RouteLink>
          {quickLinks.length > 0 && (
            <nav className="home-quick-links" aria-label="高频报告速查">
              <span className="home-quick-label">常见缩写与高频发现</span>
              <div className="home-quick-pills">
                {quickLinks.map((item) => (
                  <RouteLink
                    key={item.id}
                    page="article"
                    id={item.id}
                    className="home-quick-pill"
                    onNavigate={() => onOpen(item.id)}
                  >
                    {item.label}
                  </RouteLink>
                ))}
                <RouteLink
                  page="glossary"
                  className="home-quick-pill"
                  onNavigate={() => go("glossary")}
                >
                  A–Z 全部缩写 →
                </RouteLink>
              </div>
            </nav>
          )}

          {feature && (
            <RouteLink
              page="article"
              id={feature.id}
              className="home-feature"
              onNavigate={() => onOpen(feature.id)}
            >
              <span className="feature-kicker">
                <span className="feature-no">{feature.number || "—"}</span>
                {feature.english && <span className="feature-term">{feature.english}</span>}
              </span>
              <span className="feature-title">
                {feature.question || `认识${feature.title}`}
              </span>
              {feature.questionAnswer && (
                <span className="feature-sub">{feature.questionAnswer}</span>
              )}
              {feature.leadFigure?.src && (
                <span className="feature-figure">
                  <img
                    src={feature.leadFigure.src}
                    alt={feature.leadFigure.alt || feature.leadFigure.caption || feature.title}
                    width={feature.leadFigure.width || undefined}
                    height={feature.leadFigure.height || undefined}
                    decoding="async"
                  />
                </span>
              )}
              {feature.leadFigure?.src && feature.leadFigure?.caption && (
                <span className="feature-figure-caption">
                  {feature.leadFigure.caption}
                  <i>
                    {feature.leadFigure.attribution?.kind === "ai-generated"
                      ? `${feature.leadFigure.attribution.name}${feature.leadFigure.attribution.model ? ` · ${feature.leadFigure.attribution.model}` : ""}`
                      : "知愈自制示意图"}
                  </i>
                </span>
              )}
              <span className="feature-read">
                读这一篇 <ArrowRight size={16} aria-hidden="true" />
              </span>
            </RouteLink>
          )}
          {state.data && !feature && (
            <p className="home-empty">目前没有可阅读的问题，可到体检项目目录查看已开放的内容。</p>
          )}

          <section className="home-index" aria-labelledby="home-index-title">
            <SectionHead
              id="home-index-title"
              title="按项目读"
              action={totalIndicators > 1 && (
                <RouteLink page="indicators" onNavigate={() => go("indicators")}>
                  全部 {totalIndicators} 个 <ArrowRight size={15} aria-hidden="true" />
                </RouteLink>
              )}
            />
            {indexRows.length > 0 && (
              <div className="index-list">
                {indexRows.map((item) => (
                  <IndexRow key={item.id} item={item} onOpen={onOpen} />
                ))}
              </div>
            )}
          </section>

          {stories.length > 0 && (
            <section className="home-index home-stories" aria-labelledby="home-stories-title">
              <SectionHead
                id="home-stories-title"
                title="身体与日常"
                action={stories.length > 4 && (
                  <button
                    type="button"
                    className="stories-toggle"
                    onClick={() => setShowAllStories(v => !v)}
                  >
                    {showAllStories ? "收起部分" : `全部 ${stories.length} 篇`}
                  </button>
                )}
              />
              <div className="index-list">
                {(showAllStories ? stories : stories.slice(0, 4)).map((item) => (
                  <IndexRow key={item.id} item={item} onOpen={onOpen} />
                ))}
              </div>
            </section>
          )}

          {guideAvailable && (
            <div className="home-reading-path">
              <RouteLink page="topics" onNavigate={() => go("topics")}>
                <span className="path-label">阅读路线</span>
                <span className="path-title">从一个项目读到相关的身体知识</span>
                <ArrowRight size={16} aria-hidden="true" />
              </RouteLink>
            </div>
          )}
        </div>

        {(organs.length > 0 || organState.loading || organState.error) && (
          <aside className="home-rail" id="organ-topics" aria-labelledby="organ-topics-title">
            <SectionHead
              id="organ-topics-title"
              title="认识身体"
              action={totalOrgans > organs.length && (
                <RouteLink page="organs" onNavigate={() => go("organs")}>
                  全部 {totalOrgans} 个 <ArrowRight size={15} aria-hidden="true" />
                </RouteLink>
              )}
            />
            <LoadState {...organState} />
            {organs.length > 0 && (
              <div className="body-list">
                {organs.map((item) => (
                  <BodyRow key={item.id} item={item} onOpen={onOrgan} />
                ))}
              </div>
            )}
            {organs.length > 0 && (
              <button className="play-button" onClick={() => setTour(0)}>
                <Play size={16} aria-hidden="true" /> 1 分钟认识身体
              </button>
            )}
            <div className="home-note">
              <b>这里是什么</b>
              <p>
                从现有体检项目和身体条目出发，每一篇都标出依据的具体来源与整理日期，写明能说明什么、不能说明什么。
              </p>
              {trust && <span className="stamp">{trust.short}</span>}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
