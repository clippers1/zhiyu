import React from "react";
import { ArrowRight } from "lucide-react";
import BodyArt from "./BodyArt";
import { useContent } from "../hooks";
import { Citation, LoadState, PageIntro, SourceReferences } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { ReadingTools } from "./ReadingTools";

export default function OrganExplorer({ id, onSelect, onOpen, reading }) {
  const state = useContent("get", ["organ", id]);
  const catalog = useContent("list", [{ kind: "organ", limit: 24 }]);
  const selected = state.data;
  const related = useContent("list", [{ kind: "indicator", ids: selected?.related || [], limit: 24 }]);
  const organs = catalog.data?.items || [];
  const relatedItems = related.data?.items || [];
  return (
    <>
      <PageIntro
        label="MEET YOUR BODY"
        title="每个器官，都在认真工作。"
        description="轻点器官，看看它做什么、与哪些指标有关。"
      />
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
      <section className="organ-explorer">
        <div className="explorer-visual">
          <BodyArt selected={id} onSelect={onSelect} large />
          <small>人体正面示意 · 位置与形态经过简化</small>
        </div>
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
          {selected && (
            <>
              <ReadingTools reading={reading} kind="organ" id={id} />
              <span className="overline">{selected.en}</span>
              <h2>
                {selected.name}
                <span> / {selected.headline}</span>
              </h2>
              <p className="organ-description">
                {selected.text}
                <Citation
                  ids={selected.references.map((r) => r.id)}
                  references={selected.references}
                  prefix="organ-source"
                />
              </p>
              <div className="organ-related">
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
                {selected.related.length === 0 && (
                  <p className="coming-note">
                    本期先从器官功能开始；血氧与肺功能专题将继续补充。
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </section>
      {selected && (
        <SourceReferences content={selected} prefix="organ-source" />
      )}
    </>
  );
}
