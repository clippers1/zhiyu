import React from "react";
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
import { indicatorArtwork } from "../services/artworks";

export default function Home({ go, onOpen, onOrgan, setTour }) {
  const state = useContent("list", [{ kind: "indicator", limit: 24 }]);
  const organState = useContent("list", [{ kind: "organ", limit: 24 }]);
  const storyState = useContent("list", [{ kind: "story", limit: 24 }]);
  const {
    feature,
    indexRows,
    longForm,
    organs,
    guideAvailable,
    totalIndicators,
    totalOrgans,
  } = selectDiscovery(state.data?.items, organState.data?.items, storyState.data?.items);
  const art = feature ? indicatorArtwork(feature) : null;
  const trust = feature ? contentTrust(feature) : null;

  return (
    <div className="home-content">
      <div className="home-layout">
        <div className="home-main">
          <RunHead><b>发现</b> / 身体与日常</RunHead>
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

          {feature && (
            <RouteLink
              page="article"
              id={feature.id}
              className={`home-feature${art ? " has-plate" : ""}`}
              onNavigate={() => onOpen(feature.id)}
            >
              <span className="feature-kicker">
                <span className="feature-no">
                  {feature.kind === "story" ? "长文" : feature.number || "—"}
                </span>
                {feature.english && <span className="feature-term">{feature.english}</span>}
              </span>
              <span className="feature-title">
                {feature.question || `认识${feature.title}`}
              </span>
              {feature.subtitle && <span className="feature-sub">{feature.subtitle}</span>}
              {art && (
                <span className="feature-plate" aria-hidden="true">
                  <img
                    src={art.src}
                    alt=""
                    width={art.width}
                    height={art.height}
                    decoding="async"
                  />
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

          {longForm.length > 0 && (
            <section className="home-index home-longform" aria-labelledby="home-longform-title">
              <SectionHead id="home-longform-title" title="长文" />
              <div className="index-list">
                {longForm.map((item) => (
                  <IndexRow key={item.id} item={item} onOpen={onOpen} />
                ))}
              </div>
            </section>
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
