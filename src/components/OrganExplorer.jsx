import React from "react";
import { ArrowRight } from "lucide-react";
import OrganArtwork from "./OrganArtwork";
import { useContent } from "../hooks";
import { Citation, LoadState, RunHead, SourceReferences } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { TopicReturn } from "./TopicRoute";
import ShareCardButton from "./ShareCard";
import VisualLearning from "./VisualLearning";
import FeedbackBox from "./FeedbackBox";

export default function OrganExplorer({ id, onSelect, onOpen }) {
  const state = useContent("get", ["organ", id]);
  const catalog = useContent("list", [{ kind: "organ", limit: 24 }]);
  const selected = state.data;
  const related = useContent("list", [{ kind: "indicator", ids: selected?.related || [], limit: 24 }]);
  const organs = catalog.data?.items || [];
  const relatedItems = related.data?.items || [];
  const tabs = (className) => (
    <div className={`organ-tabs ${className}`}>
      {organs.map(({ id: key, title: name }) => (
        <RouteLink page="organs" id={key}
          key={key}
          className={id === key ? "active" : ""}
          onNavigate={() => onSelect(key)}
        >
          {name}
        </RouteLink>
      ))}
    </div>
  );
  return (
    <div className="organ-page">
      <header className="organ-page-heading">
        <RunHead><b>认识身体</b> / 结构与功能</RunHead>
        <h1 className="statement">先认识器官，再理解指标。</h1>
        <p className="lede">了解一个器官的基本功能，再按需查看已开放的关联项目与来源。关联不用于判断病因。</p>
      </header>
      {tabs("mobile-organ-tabs")}
      <section className={`organ-explorer${selected ? "" : " no-visual"}`}>
        <div className="organ-information">
          {tabs("desktop-organ-tabs")}
          <LoadState {...state} />
          {selected?.related?.length > 0 && <LoadState {...related} />}
          {selected && (
            <>
              <span className="overline">{selected.en}</span>
              <h2>
                {selected.name}
                <span>/ {selected.headline}</span>
              </h2>
              <p className="organ-description" id="organ-overview">
                {selected.text}
                <Citation
                  ids={selected.references.map((r) => r.id)}
                  references={selected.references}
                  prefix="organ-source"
                />
              </p>
              <div className="organ-related" id="organ-related">
                <span>可以一起了解的指标</span>
                <h3>{selected.connection}</h3>
                <p>相关指标提供观察线索，需要结合检查条件与个人情况解读。</p>
                {relatedItems.map((related) => (
                  <RouteLink page="article" id={related.id}
                    key={related.id}
                    className="text-link"
                    onNavigate={() => onOpen(related.id)}
                  >
                    了解{related.title}
                    <ArrowRight size={16} />
                  </RouteLink>
                ))}
                {related.data && relatedItems.length === 0 && (
                  <p className="coming-note">
                    目前没有已开放的关联项目，可继续阅读器官功能与来源。
                  </p>
                )}
              </div>
              <div className="organ-bookmark">
                <ShareCardButton content={selected} />
              </div>
            </>
          )}
        </div>
        {selected && <div className="explorer-visual">
          <OrganArtwork id={id} />
        </div>}
      </section>
      {selected?.sections?.length > 0 && (
        <section className="organ-sections" aria-label="器官功能与常见检查">
          {selected.sections.map((section, index) => (
            <div className="organ-section-card" key={section.title}>
              <h3>
                <i>0{index + 1}</i>
                {section.title}
              </h3>
              {section.paragraphs.map((paragraph, pIdx) => (
                <p key={pIdx}>
                  {paragraph.text}
                  <Citation ids={paragraph.sourceIds} references={selected.references} prefix="organ-source" />
                </p>
              ))}
            </div>
          ))}
        </section>
      )}
      {selected && <VisualLearning content={selected} />}
      {selected && (
        <SourceReferences content={selected} prefix="organ-source" />
      )}
      {selected && <FeedbackBox content={selected} />}
      {selected && relatedItems.length > 0 && <section className="topic-followup" aria-label="相关阅读路线">
        <h2>把相关知识串起来</h2>
        <p>选择一个指标路线，回看概念或核对对应来源。</p>
        {relatedItems.map(item => <TopicReturn key={item.id} id={item.id} title={item.title} />)}
      </section>}
    </div>
  );
}
