import React from "react";
import { ArrowRight } from "lucide-react";
import OrganArtwork from "./OrganArtwork";
import { useContent } from "../hooks";
import { Citation, LoadState, SourceReferences } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { TopicReturn } from "./TopicRoute";
import ShareCardButton from "./ShareCard";
import VisualLearning from "./VisualLearning";

export default function OrganExplorer({ id, onSelect, onOpen }) {
  const state = useContent("get", ["organ", id]);
  const catalog = useContent("list", [{ kind: "organ", limit: 24 }]);
  const selected = state.data;
  const related = useContent("list", [{ kind: "indicator", ids: selected?.related || [], limit: 24 }]);
  const organs = catalog.data?.items || [];
  const relatedItems = related.data?.items || [];
  return (
    <>
      <div className="organ-page-heading">
        <h1>认识身体</h1>
        <p>先了解一个器官的基本功能，再按需查看已开放的关联项目与来源。</p>
      </div>
      <div className="organ-tabs mobile-organ-tabs">
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
      <section className={`organ-explorer${selected ? "" : " no-visual"}`}>
        <div className="organ-information">
          <div className="organ-tabs desktop-organ-tabs">
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
          <LoadState {...state} />
          {selected?.related?.length > 0 && <LoadState {...related} />}
          {selected && (
            <>
              <span className="overline">{selected.en}</span>
              <h2>
                {selected.name}
                <span> / {selected.headline}</span>
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
      {selected && <VisualLearning content={selected} />}
      {selected && (
        <SourceReferences content={selected} prefix="organ-source" />
      )}
      {selected && relatedItems.length > 0 && <section className="topic-followup" aria-label="相关阅读路线">
        <h2>把相关知识串起来</h2>
        <p>选择一个指标路线，回看概念或核对对应来源。</p>
        {relatedItems.map(item => <TopicReturn key={item.id} id={item.id} title={item.title} />)}
      </section>}
    </>
  );
}
