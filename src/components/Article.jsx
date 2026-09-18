import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CircleHelp,
  Share2,
} from "lucide-react";
import { useContent } from "../hooks";
import { Citation, LoadState, SourceReferences } from "./ContentUI";

export default function Article({
  id,
  onBack,
  onOrgan,
  saved,
  toggleSave,
  storageError,
}) {
  const state = useContent("get", ["indicator", id]);
  const detail = state.data;
  const [shareMessage, setShareMessage] = useState("");
  const [showLink, setShowLink] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${detail.title} · 知愈`,
          text: detail.subtitle,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage("链接已复制");
    } catch (error) {
      if (error.name !== "AbortError") {
        setShowLink(true);
        setShareMessage("复制下方链接即可分享");
      }
    }
  }
  return (
    <div className="article-reader">
      <div className="reading-bar">
        <button onClick={onBack} aria-label="返回上一页">
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>
        <span>知愈 · 指标解读</span>
        <button onClick={share} disabled={!detail} aria-label="分享这篇知识">
          <Share2 size={18} />
          <span>分享</span>
        </button>
      </div>
      <LoadState {...state} />
      {detail && (
        <article>
          <div className={`detail-heading ${detail.color}`}>
            <span className="overline">{detail.english}</span>
            <h1>认识{detail.title}</h1>
            <p>{detail.subtitle}</p>
            <button
              className="source-jump"
              onClick={() =>
                document
                  .getElementById("article-source-panel")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              {detail.references.length} 份参考资料 · 整理于 {detail.updatedAt}
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="detail-body">
            <p className="detail-intro">
              {detail.desc}
              <Citation
                ids={detail.descriptionSourceIds}
                references={detail.references}
                prefix="article-source"
              />
            </p>
            <h2>一组指标，各有分工</h2>
            <div className="metric-list">
              {detail.metrics.map((metric, i) => (
                <div key={metric.name}>
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{metric.name}</h3>
                    <p>
                      {metric.text}
                      <Citation
                        ids={metric.sourceIds}
                        references={detail.references}
                        prefix="article-source"
                      />
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <h2>把身体里的过程串起来</h2>
            <div className="detail-chain">
              {detail.chain.map((step, i) => (
                <React.Fragment key={step}>
                  <span>
                    <i>{i + 1}</i>
                    {step}
                  </span>
                  {i < detail.chain.length - 1 && <ArrowRight size={16} />}
                </React.Fragment>
              ))}
            </div>
            <div className="detail-tip">
              <CircleHelp size={19} />
              <div>
                <b>看报告时，记住这一点</b>
                <p>
                  {detail.tip}
                  <Citation
                    ids={detail.tipSourceIds}
                    references={detail.references}
                    prefix="article-source"
                  />
                </p>
              </div>
            </div>
            <div className="detail-related">
              <span>关联器官：{detail.organ}</span>
              <button
                className="text-link"
                onClick={() =>
                  onOrgan(
                    detail.id === "pressure"
                      ? "heart"
                      : detail.id === "glucose"
                        ? "pancreas"
                        : "liver",
                  )
                }
              >
                探索器官 <ArrowUpRight size={14} />
              </button>
            </div>
            <SourceReferences content={detail} prefix="article-source" />
            <p className="article-disclaimer">
              本文用于认识指标，不提供个人诊断或治疗方案。请结合体检报告及医生建议理解结果。
            </p>
          </div>
        </article>
      )}
      {detail && (
        <div className="reading-actions">
          <div aria-live="polite">
            {storageError
              ? "当前无法保存到浏览器，收藏仅在本次会话有效。"
              : shareMessage || "把有用的知识留给自己"}
          </div>
          <button
            className={`save-button ${saved.includes(id) ? "is-saved" : ""}`}
            onClick={() => toggleSave(id)}
          >
            {saved.includes(id) ? <Check size={18} /> : <Bookmark size={18} />}{" "}
            {saved.includes(id) ? "已收藏" : "收藏知识"}
          </button>
        </div>
      )}
      {showLink && (
        <input
          className="share-url"
          readOnly
          value={window.location.href}
          aria-label="文章分享链接"
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  );
}
