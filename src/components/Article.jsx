import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  Settings2,
  Share2,
} from "lucide-react";
import { useContent } from "../hooks";
import { Citation, LoadState, SourceReferences } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { TopicReturn } from "./TopicRoute";
import ShareCardButton from "./ShareCard";
import { readingGuide } from "../services/reading-guide";
import { TermQuestions } from "./ReadingGuide";
import { contentTrust } from "../services/content-status";

function FigureBlock({ figure }) {
  const [imageFailed, setImageFailed] = useState(false);
  const refs = figure?.sourceIds || [];
  if (!figure || !refs.length) return null;
  return (
    <figure className="article-figure" id="article-figure">
      <div className="article-figure-stage">
        {imageFailed ? <p role="status">图片暂时无法显示，可继续阅读下方的文字解释与来源。</p> : <img
          src={figure.src}
          alt={figure.alt}
          width={figure.width || undefined}
          height={figure.height || undefined}
          decoding="async"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />}
      </div>
      <figcaption>
        <span>{figure.caption}</span>
        <Citation ids={refs} references={figure.references} prefix="article-source" />
      </figcaption>
      <p className="article-figure-note">
        <b>图示边界：</b>
        {figure.simplification}
      </p>
      <small className="article-figure-attribution">
        插图：
        <a href={figure.attribution.url} target="_blank" rel="noreferrer">
          {figure.attribution.name}
        </a>
        {" · "}
        <a href={figure.attribution.licenseUrl} target="_blank" rel="noreferrer">
          {figure.attribution.license}
        </a>
      </small>
    </figure>
  );
}

export default function Article({
  id,
  onBack,
  onOrgan,
  onTools,
}) {
  const state = useContent("get", ["indicator", id]);
  const detail = state.data;
  const guide = readingGuide(detail);
  const trust = contentTrust(detail);
  const relatedState = useContent("list", [{ kind: "organ", ids: (detail?.relatedOrgans || []).map((item) => item.id), limit: 24 }]);
  const [shareMessage, setShareMessage] = useState("");
  const [showLink, setShowLink] = useState(false);
  const figure = detail?.figure ? {
    ...detail.figure,
    references: detail.references,
  } : null;
  useEffect(() => {
    if (detail && window.location.hash === "#article-source-panel") {
      document.getElementById("article-source-panel")?.scrollIntoView();
    }
  }, [detail]);
  async function share() {
    const url = `${window.location.origin}${window.location.pathname}`;
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
        <span>知愈 · 体检项目</span>
        <span className="reading-bar-tools">
          <button onClick={onTools} aria-label="偏好设置" aria-haspopup="dialog">
            <Settings2 size={18} />
            <span>偏好</span>
          </button>
          <button onClick={share} disabled={!detail} aria-label="分享这篇知识">
            <Share2 size={18} />
            <span>分享</span>
          </button>
        </span>
      </div>
      <LoadState {...state} />
      {detail && (
        <article>
          <div className={`detail-heading ${detail.color}`}>
            <span className="overline">{detail.english}</span>
            <h1>{detail.question || `认识${detail.title}`}</h1>
            <p className="review-notice">{trust.label}</p>
            {detail.questionAnswer && (
              <p className="detail-answer" id="article-answer">
                {detail.questionAnswer}
              </p>
            )}
            {detail.tip && <div className="detail-tip article-priority-limit" id="article-reminder">
              <CircleHelp size={19} aria-hidden="true" />
              <div>
                <b>不能仅凭这一项判断</b>
                <p>{detail.tip}<Citation ids={detail.tipSourceIds} references={detail.references} prefix="article-source" /></p>
              </div>
            </div>}
            <a
              className="source-jump"
              href="#article-source-panel"
            >
              {detail.references.length} 份参考资料 · 整理于 {detail.updatedAt}
              <ArrowRight size={13} />
            </a>
          </div>
          {figure && <FigureBlock key={detail.id} figure={figure} />}
          <div className="article-share-entry"><ShareCardButton content={detail} /></div>
            <nav className="reading-toc" aria-label="文章目录">
              <span>深入阅读</span>
              <a href="#article-overview">它是什么</a>
              {figure && <a href="#article-figure">图解</a>}
              <a href="#article-metrics">常见项目</a>
              {Boolean(guide?.questions.length) && <a href="#article-questions">术语问答</a>}
              <a href="#article-process">理解过程</a>
              {detail.tip && <a href="#article-reminder">不能说明什么</a>}
              <a href="#article-source-panel">核对来源</a>
            </nav>
          <div className="detail-body">
            <p className="detail-intro" id="article-overview">
              {detail.desc}
              <Citation
                ids={detail.descriptionSourceIds}
                references={detail.references}
                prefix="article-source"
              />
            </p>
            <h2 id="article-metrics">常见相关项目</h2>
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
            <TermQuestions guide={guide} content={detail} />
            <h2 id="article-process">把身体里的过程串起来</h2>
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
            <div className="detail-related">
              <span>关联器官：{detail.organ}</span>
              {(relatedState.data?.items || []).map((organ, index) => <RouteLink page="organs" id={organ.id}
                key={organ.id}
                className="text-link"
                onNavigate={() => onOrgan(organ.id)}
              >
                {index === 0 ? "探索器官" : `了解${organ.title}`} <ArrowUpRight size={14} />
              </RouteLink>)}
            </div>
            <SourceReferences content={detail} prefix="article-source" />
            <p className="article-disclaimer">
              本文用于认识指标，不提供个人诊断或治疗方案。请结合体检报告及医生建议理解结果。
            </p>
            <section className="topic-followup" aria-label="接下来读什么">
              <h2>接下来读什么？</h2>
              <p>可继续了解本文关联的器官，或再选一个体检项目。关联不用于判断个人病因。</p>
              <LoadState {...relatedState} />
              {(relatedState.data?.items || []).map(organ => <RouteLink key={organ.id} page="organs" id={organ.id} onNavigate={() => onOrgan(organ.id)} className="text-link">继续了解{organ.title} <ArrowRight size={15} /></RouteLink>)}
              <TopicReturn id={id} title={detail.title} />
              <RouteLink page="topics" className="text-link">从其他体检问题继续读 <ArrowRight size={15} /></RouteLink>
            </section>
          </div>
        </article>
      )}
      {detail && (
        <div className="reading-actions is-ready">
          <div aria-live="polite">
            {shareMessage || "觉得有用，就分享给需要的人"}
          </div>
          <div className="reading-actions-buttons">
            <ShareCardButton content={detail} />
          </div>
        </div>
      )}
      {showLink && (
        <input
          className="share-url"
          readOnly
          value={`${window.location.origin}${window.location.pathname}`}
          aria-label="文章分享链接"
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  );
}
