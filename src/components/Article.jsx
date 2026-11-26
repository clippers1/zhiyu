import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  List,
  Settings2,
  Share2,
  X,
  ZoomIn,
} from "lucide-react";
import { useContent } from "../hooks";
import {
  BoundaryNote,
  Caveat,
  Citation,
  LoadState,
  NextEntry,
  RunHead,
  SourceReferences,
} from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { TopicReturn } from "./TopicRoute";
import ShareCardButton from "./ShareCard";
import { readingGuide } from "../services/reading-guide";
import { TermQuestions } from "./ReadingGuide";
import { contentTrust } from "../services/content-status";
import { nextIndicator } from "../services/discovery";
import { ReportRowStrip } from "./ReportGuide";
import { REPORT_ROWS } from "../services/report-guide";
import FeedbackBox from "./FeedbackBox";
import IndicatorFlowchart from "./IndicatorFlowchart";
import IndicatorVisualLab, { hasIndicatorVisualLab } from "./IndicatorVisualLab";
import ConceptSlice3D from "./three/ConceptSlice3D";
import InlineGlossaryText from "./InlineGlossaryText";
import FigureLightbox from "./FigureLightbox";

function FigureBlock({ figure, id = "article-figure", onZoom }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef(null);
  const refs = figure?.sourceIds || [];
  // 服务端先输出 <img>，请求可能在 hydration 前就失败，React 收不到那次
  // error 事件；挂载后补查一次解码结果，避免一直停在坏图上。
  useEffect(() => setImageFailed(false), [figure?.src]);
  useEffect(() => {
    const node = imageRef.current;
    if (node?.complete && node.naturalWidth === 0) setImageFailed(true);
  }, [figure?.src]);
  if (!figure || !refs.length || !figure.src) return null;
  const selfMade = figure.attribution.kind === "self-made";
  const aiGenerated = figure.attribution.kind === "ai-generated";
  const creditText = selfMade
    ? `插图：${figure.attribution.name}`
    : aiGenerated
      ? `插图：${figure.attribution.name}${figure.attribution.model ? ` · 模型 ${figure.attribution.model}` : ""}`
      : `插图：${figure.attribution.name} · ${figure.attribution.license}`;
  return (
    <figure className="article-figure" id={id}>
      <div className="article-figure-stage">
        {imageFailed ? <p role="status">图片暂时无法显示，可继续阅读下方的文字解释与来源。</p> : (
          <button
            type="button"
            className="figure-zoom-trigger"
            aria-label={`放大查看插图：${figure.caption || figure.alt}`}
            onClick={() => onZoom?.({
              src: figure.src,
              alt: figure.alt,
              caption: figure.caption,
              credit: creditText,
            })}
          >
            <img
              ref={imageRef}
              src={figure.src}
              alt={figure.alt}
              width={figure.width || undefined}
              height={figure.height || undefined}
              decoding="async"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
            <span className="figure-zoom-badge" aria-hidden="true">
              <ZoomIn size={13} />
              放大
            </span>
          </button>
        )}
      </div>
      <figcaption>
        <span>{figure.caption}</span>
        <Citation ids={refs} references={figure.references} prefix="article-source" />
        <small className="article-figure-attribution">
          插图：
          {selfMade ? (
            <span>{figure.attribution.name}</span>
          ) : aiGenerated ? (
            <span>{figure.attribution.name}{figure.attribution.model ? ` · 模型 ${figure.attribution.model}` : ""}</span>
          ) : (
            <>
              <a href={figure.attribution.url} target="_blank" rel="noreferrer">
                {figure.attribution.name}
              </a>
              {" · "}
              <a href={figure.attribution.licenseUrl} target="_blank" rel="noreferrer">
                {figure.attribution.license}
              </a>
            </>
          )}
        </small>
      </figcaption>
      {Array.isArray(figure.legend) && figure.legend.length > 0 && (
        <ol className="figure-legend">
          {figure.legend.map((item, index) => (
            <li key={item.title}>
              <span aria-hidden="true">{index + 1}</span>
              <div>
                <b>{item.title}</b>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="article-figure-note">
        <b>图示边界：</b>
        {figure.simplification}
      </p>
    </figure>
  );
}

// Published figures are declared next to the prose they explain. A section can
// name one by key; whatever is left over becomes the opening plate.
function attachFigures(detail) {
  const list = (detail?.figures || []).map(figure => ({ ...figure, references: detail.references }));
  const byKey = new Map(list.map(figure => [figure.key, figure]));
  const placed = new Set((detail?.sections || []).map(section => section.figure).filter(Boolean));
  return {
    byKey,
    opening: list.find(figure => !placed.has(figure.key)) || null,
    firstAnchor: list[0] ? (placed.has(list[0].key) ? `article-figure-${list[0].key}` : "article-figure") : null,
  };
}

const SECTION_NUMBERS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

function SectionBody({ section, content, first, onOpen }) {
  const seen = new Set();
  return section.paragraphs.map((paragraph, index) => (
    <p key={index} className={first && index === 0 ? "detail-intro" : undefined}>
      <InlineGlossaryText
        text={paragraph.text}
        seen={seen}
        currentArticleId={content.id}
        onOpenArticle={onOpen}
      />
      <Citation ids={paragraph.sourceIds} references={content.references} prefix="article-source" />
    </p>
  ));
}

function LongForm({ detail, figures, onZoom, onOpen }) {
  return detail.sections.map((section, index) => (
    <section className="article-section" key={section.title}>
      <h2 id={index === 0 ? "article-overview" : `article-section-${index + 1}`}>
        <i>{SECTION_NUMBERS[index] || index + 1}</i>
        {section.title}
      </h2>
      <SectionBody section={section} content={detail} first={index === 0} onOpen={onOpen} />
      {section.figure && figures.byKey.get(section.figure) && (
        <FigureBlock
          figure={figures.byKey.get(section.figure)}
          id={`article-figure-${section.figure}`}
          onZoom={onZoom}
        />
      )}
    </section>
  ));
}

export default function Article({
  id,
  go,
  onBack,
  onOrgan,
  onOpen,
  onTools,
}) {
  // /article/:id serves both long-form indicators and stories, so the route is
  // resolved against the shared reader namespace rather than a fixed kind.
  const state = useContent("get", ["article", id]);
  const detail = state.data;
  const isOrgan = detail?.kind === "organ";
  const isStory = detail?.kind === "story";
  const hasReportRows = detail?.kind === "indicator" && Boolean(REPORT_ROWS[id]);
  const longForm = Boolean(detail?.sections?.length);
  const guide = readingGuide(detail);
  const trust = contentTrust(detail);
  const catalog = useContent("list", [{ kind: isStory ? "story" : "indicator", limit: 48 }]);
  const relatedState = useContent("list", [{ kind: "organ", ids: (detail?.relatedOrgans || []).map((item) => item.id), limit: 48 }]);
  const relatedIndicatorsState = useContent("list", [{ kind: "indicator", ids: detail?.related || [], limit: 48 }]);
  const next = nextIndicator(catalog.data?.items, id, isStory ? "story" : "indicator");
  const figures = attachFigures(detail);
  const questions = longForm && detail?.faq?.length ? detail.faq : guide?.questions || [];
  const [shareMessage, setShareMessage] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [lightboxFigure, setLightboxFigure] = useState(null);
  const tocDrawerRef = useRef(null);
  const entryFigure = !longForm && detail?.figure ? {
    ...detail.figure,
    references: detail.references,
  } : null;
  const relatedOrgans = relatedState.data?.items || [];
  const relatedIndicators = (relatedIndicatorsState.data?.items || []).filter(item => item.id !== detail?.id);

  const tocItems = detail ? [
    { href: "#article-overview", label: "它是什么" },
    ...(hasReportRows ? [{ href: "#article-report-rows", label: "单子上的位置" }] : []),
    ...(figures.firstAnchor ? [{ href: `#${figures.firstAnchor}`, label: "图解" }] : []),
    ...(!isOrgan && hasIndicatorVisualLab(id)
      ? [{ href: "#article-visual-lab", label: isStory ? "互动原理图解" : "专项交互图解", highlight: true }]
      : []),
    ...(!isStory && detail.chain?.length >= 3 ? [{ href: "#article-flowchart", label: "可视化流程图" }] : []),
    ...(longForm
      ? detail.sections.slice(1).map((section, index) => ({
          href: `#article-section-${index + 2}`,
          label: section.short || section.title,
        }))
      : []),
    ...(detail.metrics?.length ? [{ href: "#article-metrics", label: "常见项目" }] : []),
    ...(questions.length > 0
      ? [{ href: "#article-questions", label: longForm && detail.faq?.length ? "常见问题" : "术语问答" }]
      : []),
    ...(!longForm && detail.chain?.length > 0 ? [{ href: "#article-process", label: "理解过程" }] : []),
    ...(detail.tip ? [{ href: "#article-reminder", label: "不能说明什么" }] : []),
    { href: "#article-source-panel", label: "核对来源" },
  ] : [];

  useEffect(() => {
    setTocOpen(false);
    setLightboxFigure(null);
  }, [id]);

  useEffect(() => {
    if (detail && window.location.hash === "#article-source-panel") {
      document.getElementById("article-source-panel")?.scrollIntoView();
    }
  }, [detail]);

  useEffect(() => {
    let rafId = 0;
    const updateProgress = () => {
      rafId = 0;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100));
      setProgress(pct);
    };
    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateProgress);
    };
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [id, detail]);

  useEffect(() => {
    if (!tocOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setTocOpen(false);
    };
    const onPointerDown = (event) => {
      if (tocDrawerRef.current && !tocDrawerRef.current.contains(event.target)) {
        setTocOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [tocOpen]);
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
      <div className="reading-progress-track" aria-hidden="true">
        <div className="reading-progress-bar" style={{ width: `${progress.toFixed(1)}%` }} />
      </div>
      <div className="reading-bar">
        <div className="reading-bar-left">
          <button onClick={onBack} aria-label="返回上一页">
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
          <span className="reading-bar-context">
            知愈 · {isOrgan ? "认识身体" : isStory ? "身体与日常" : "体检项目"}
          </span>
        </div>
        <div className="reading-bar-tools">
          {detail && tocItems.length > 0 && (
            <button
              type="button"
              onClick={() => setTocOpen((prev) => !prev)}
              aria-label="章节目录"
              aria-expanded={tocOpen}
              aria-controls="article-toc-drawer"
            >
              <List size={18} />
            </button>
          )}
          <button onClick={onTools} aria-label="偏好设置" aria-haspopup="dialog">
            <Settings2 size={18} />
          </button>
          <button onClick={share} disabled={!detail} aria-label="分享这篇知识">
            <Share2 size={18} />
          </button>
        </div>
      </div>
      {tocOpen && detail && (
        <div
          id="article-toc-drawer"
          ref={tocDrawerRef}
          className="reading-toc-drawer"
          role="region"
          aria-label="章节快速跳转"
        >
          <div className="reading-toc-drawer-head">
            <span>本章快速跳转</span>
            <button
              type="button"
              className="reading-toc-drawer-close"
              aria-label="关闭章节目录"
              onClick={() => setTocOpen(false)}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="reading-toc-drawer-list">
            {tocItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={item.highlight ? "highlight" : undefined}
                onClick={() => setTocOpen(false)}
              >
                <span>{item.label}</span>
                <ArrowRight size={13} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      )}
      <p className="share-message" role="status">{shareMessage}</p>
      <LoadState {...state} />
      {detail && (
        <article>
          <header className="article-head">
            <RunHead>
              {isStory ? (
                <><b>身体与日常</b> / 长文</>
              ) : (
                <>
                  {detail.number ? `${detail.number} / ` : ""}
                  <b>{detail.title}</b>
                  {detail.english && <span className="article-english"> {detail.english}</span>}
                </>
              )}
            </RunHead>
            <h1>{detail.question || `认识${detail.title}`}</h1>
            {detail.questionAnswer && (
              <p className="detail-answer" id="article-answer">{detail.questionAnswer}</p>
            )}
            {detail.tip && (
              <Caveat id="article-reminder" title={isStory ? "不能只凭这一点判断" : "不能仅凭这一项判断"}>
                {detail.tip}
                <Citation ids={detail.tipSourceIds} references={detail.references} prefix="article-source" />
              </Caveat>
            )}
            {hasReportRows && <ReportRowStrip id={id} go={go} />}
          </header>
          {entryFigure && <FigureBlock key={detail.id} figure={entryFigure} onZoom={setLightboxFigure} />}
          {figures.opening && <FigureBlock key={`${detail.id}-opening`} figure={figures.opening} onZoom={setLightboxFigure} />}
          {!isOrgan && <IndicatorVisualLab detail={detail} />}
          {!isStory && (
            <IndicatorFlowchart
              detail={detail}
              relatedIndicators={relatedIndicators}
              go={go}
              onOpen={onOpen}
            />
          )}
          {!isStory && <ConceptSlice3D id={id} />}
          <nav className="reading-toc" aria-label="文章目录">
            <span>深入阅读</span>
            <a href="#article-overview">它是什么</a>
            {hasReportRows && <a href="#article-report-rows">单子上的位置</a>}
            {figures.firstAnchor && <a href={`#${figures.firstAnchor}`}>图解</a>}
            {!isOrgan && hasIndicatorVisualLab(id) && (
              <a href="#article-visual-lab">{isStory ? "互动原理图解" : "专项交互图解"}</a>
            )}
            {!isStory && detail.chain?.length >= 3 && <a href="#article-flowchart">可视化流程图</a>}
            {longForm && detail.sections.slice(1).map((section, index) => (
              <a key={section.title} href={`#article-section-${index + 2}`}>{section.short || section.title}</a>
            ))}
            {Boolean(detail.metrics?.length) && <a href="#article-metrics">常见项目</a>}
            {questions.length > 0 && <a href="#article-questions">{longForm && detail.faq?.length ? "常见问题" : "术语问答"}</a>}
            {!longForm && detail.chain?.length > 0 && <a href="#article-process">理解过程</a>}
            {detail.tip && <a href="#article-reminder">不能说明什么</a>}
            <a href="#article-source-panel">核对来源</a>
          </nav>
          <div className="detail-body">
            {longForm ? (
              <>
                <LongForm detail={detail} figures={figures} onZoom={setLightboxFigure} onOpen={onOpen} />
                {Boolean(detail.metrics?.length) && (
                  <>
                    <h2 id="article-metrics">{isStory ? "" : <i>附</i>}常见项目与分工</h2>
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
                  </>
                )}
              </>
            ) : (
              <>
                <h2 id="article-overview"><i>一</i>它是什么</h2>
                <p className="detail-intro">
                  {detail.desc}
                  <Citation
                    ids={detail.descriptionSourceIds}
                    references={detail.references}
                    prefix="article-source"
                  />
                </p>
                <h2 id="article-metrics"><i>二</i>一组指标，各有分工</h2>
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
                <h2 id="article-process"><i>三</i>身体里发生的过程</h2>
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
              </>
            )}
            <TermQuestions items={questions} content={detail} />
            <div className="detail-related">
              {detail.organ && <span>关联器官：{detail.organ}</span>}
              {relatedOrgans.map((organ, index) => <RouteLink page="organs" id={organ.id}
                key={organ.id}
                className="text-link"
                onNavigate={() => onOrgan(organ.id)}
              >
                {index === 0 ? "探索器官" : `了解${organ.title}`} <ArrowUpRight size={14} />
              </RouteLink>)}
            </div>
            {relatedIndicators.length > 0 && (
              <section className="related-indicators" aria-labelledby="related-indicators-title">
                <h2 id="related-indicators-title"><i>联</i>报告单上常一起对照看</h2>
                <p className="related-indicators-note">以下项目常与本文一起出现在同一份体检报告中，横向对照有助于了解整体背景，不用于推断个人病因。</p>
                <div className="related-indicators-grid">
                  {relatedIndicators.map(item => (
                    <RouteLink key={item.id} page="article" id={item.id} className="related-indicator-card" onNavigate={() => onOpen(item.id)}>
                      <span className="related-indicator-meta">{item.number ? `${item.number} · ` : ""}{item.title}</span>
                      <b>{item.question || `认识${item.title}`}</b>
                      <span className="related-indicator-go">查看解释 <ArrowRight size={14} aria-hidden="true" /></span>
                    </RouteLink>
                  ))}
                </div>
              </section>
            )}
            <SourceReferences content={detail} prefix="article-source" />
            <FeedbackBox content={detail} />
            <BoundaryNote trust={trust}>
              {isStory
                ? "本文用于认识身体与日常现象，不解释个人检查结果，也不构成诊断或治疗建议。"
                : "本文用于认识指标名称与相互关系，不解释个人报告，也不构成诊断或治疗建议。请结合体检报告及医生建议理解结果。"}
            </BoundaryNote>
            <div className="article-share-entry"><ShareCardButton content={detail} /></div>
            <section className="topic-followup" aria-label="继续阅读">
              <h2>继续读</h2>
              <p>
                {relatedOrgans.length
                  ? "可继续了解本文关联的器官，或再选一个体检项目。关联不用于判断个人病因。"
                  : "可以继续读下一篇，或回到项目索引换一个体检项目。"}
              </p>
              <LoadState {...relatedState} />
              {relatedOrgans.map(organ => <RouteLink key={organ.id} page="organs" id={organ.id} onNavigate={() => onOrgan(organ.id)} className="text-link">继续了解{organ.title} <ArrowRight size={15} /></RouteLink>)}
              {!isStory && <TopicReturn id={id} title={detail.title} />}
              <RouteLink page="topics" className="text-link">从其他体检问题继续读 <ArrowRight size={15} /></RouteLink>
            </section>
            <NextEntry item={next} onOpen={onOpen} />
          </div>
        </article>
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
      <FigureLightbox figure={lightboxFigure} onClose={() => setLightboxFigure(null)} />
    </div>
  );
}
