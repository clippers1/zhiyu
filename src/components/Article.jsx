import React, { useEffect, useState } from "react";
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
import { RouteLink } from "./RouteLink";
import { ReadingTools } from "./ReadingTools";
import { TopicReturn } from "./TopicRoute";
import ShareCardButton from "./ShareCard";
import { readingGuide } from "../services/reading-guide";
import { QuickRead, TermQuestions } from "./ReadingGuide";

export default function Article({
  id,
  onBack,
  onOrgan,
  saved,
  toggleSave,
  storageError,
  bookmarksReady,
  reading,
}) {
  const state = useContent("get", ["indicator", id]);
  const detail = state.data;
  const guide = readingGuide(detail);
  const relatedState = useContent("list", [{ kind: "organ", ids: (detail?.relatedOrgans || []).map((item) => item.id), limit: 24 }]);
  const [shareMessage, setShareMessage] = useState("");
  const [showLink, setShowLink] = useState(false);
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
            {detail.reviewStatus !== "reviewed" && (
              <p className="review-notice">Beta 科普内容 · 待专业审校</p>
            )}
            <a
              className="source-jump"
              href="#article-source-panel"
            >
              {detail.references.length} 份参考资料 · 整理于 {detail.updatedAt}
              <ArrowRight size={13} />
            </a>
          </div>
          <ReadingTools reading={reading} kind="indicator" id={id} content={detail} />
          <div className="article-share-entry"><ShareCardButton content={detail} /></div>
          <TopicReturn id={id} title={detail.title} />
          <QuickRead guide={guide} content={detail} />
          <nav className="reading-toc" aria-label="文章目录">
            <span>按需阅读</span>
            {(guide?.concept || guide?.reminder) && <a href="#article-quick-read">快速了解</a>}
            <a href="#article-overview">先了解概念</a>
            <a href="#article-metrics">认识指标</a>
            {Boolean(guide?.questions.length) && <a href="#article-questions">术语问答</a>}
            <a href="#article-process">理解过程</a>
            <a href="#article-reminder">看报告提示</a>
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
            <h2 id="article-metrics">一组指标，各有分工</h2>
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
            <div className="detail-tip" id="article-reminder">
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
              <p>可继续了解本文关联的器官，也可回到路线选择阅读顺序。关联不用于判断个人病因。</p>
              <LoadState {...relatedState} />
              {(relatedState.data?.items || []).map(organ => <RouteLink key={organ.id} page="organs" id={organ.id} onNavigate={() => onOrgan(organ.id)} className="text-link">继续了解{organ.title} <ArrowRight size={15} /></RouteLink>)}
              <TopicReturn id={id} title={detail.title} />
            </section>
          </div>
        </article>
      )}
      {detail && (
        <div className={`reading-actions${bookmarksReady ? " is-ready" : ""}`}>
          <div aria-live="polite">
            {storageError
              ? "无法正常读写收藏，本次更改可能未保存。若需移除旧收藏，请清除此站点的浏览器数据。"
              : shareMessage || "把有用的知识留给自己"}
          </div>
          <button
            className={`save-button ${saved.includes(id) ? "is-saved" : ""}`}
            disabled={!bookmarksReady}
            aria-pressed={saved.includes(id)}
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
          value={`${window.location.origin}${window.location.pathname}`}
          aria-label="文章分享链接"
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  );
}
