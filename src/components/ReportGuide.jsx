import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { BoundaryNote, Citation, RunHead, SourceReferences } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { REPORT_ROWS, GUIDE_CONTENT, GUIDE_FAQ, GUIDE_SECTIONS } from "../services/report-guide";
import "./indicator-flowchart.css";

const GUIDE_FLOW_STEPS = [
  {
    num: "01",
    tag: "看清前提",
    tone: "teal",
    title: "核对采样与准备条件",
    detail: "先看报告抬头与采样时间：是否按要求空腹、近期是否熬夜、饮酒、剧烈运动或感冒服药，这些都会让单次数字出现短暂波动。",
  },
  {
    num: "02",
    tag: "拆解一行",
    tone: "blue",
    title: "对应项目名、结果与区间",
    detail: "逐行对照「项目名 → 结果 → 单位 → 参考区间」。旁边的 ↑↓ 箭头只说明数字落在参考范围之外，不等于自动确诊疾病。",
  },
  {
    num: "03",
    tag: "组合来看",
    tone: "amber",
    title: "同一系统项目横向对照",
    detail: "把相关指标放在一起看更有意义：例如空腹血糖配糖化血红蛋白，肝酶配肝脏 B 超，肌酐配尿常规，不孤立盯着某一个箭头。",
  },
  {
    num: "04",
    tag: "纵向复盘",
    tone: "coral",
    title: "对比往年旧单并问医生",
    detail: "找出近 1–3 年旧体检报告看变化趋势，把不理解的项目、近期不适与用药清单记下来，携带完整原件向医生咨询。",
  },
];

function GuideReadingFlowchart() {
  const [active, setActive] = useState(0);
  const current = GUIDE_FLOW_STEPS[active];
  return (
    <section className="guide-flowchart" id="guide-flowchart" aria-labelledby="guide-flowchart-title">
      <span className="flowchart-kicker">可视化阅读流程图</span>
      <h2 id="guide-flowchart-title">拿到一份体检报告，建议按这四步看</h2>
      <p className="guide-flowchart-sub">点击每一步查看要点；这套顺序适用于大多数血检、尿检与常见影像报告。</p>
      <div className="flowchart-panel">
        <svg className="flowchart-rail-svg" viewBox="0 0 800 36" preserveAspectRatio="none" aria-hidden="true">
          <line x1="90" y1="18" x2="710" y2="18" stroke="#d5e4e8" strokeWidth="3" strokeLinecap="round" />
          <line x1="90" y1="18" x2="710" y2="18" stroke="#0f766e" strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round" className="flowchart-rail-animated" />
          {[90, 297, 503, 710].map((cx, i) => (
            <g key={cx}>
              <circle cx={cx} cy="18" r={active === i ? 9 : 6} fill={active === i ? "#0f766e" : "#ffffff"} stroke="#0f766e" strokeWidth="2.5" />
              {i < 3 && <path d={`M${cx + 94} 13 L${cx + 105} 18 L${cx + 94} 23`} fill="none" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          ))}
        </svg>
        <ol className="flowchart-grid">
          {GUIDE_FLOW_STEPS.map((step, i) => (
            <li key={step.num} className={`flowchart-node tone-${step.tone}${active === i ? " active" : ""}`}>
              <button type="button" className="flowchart-node-btn" aria-pressed={active === i} onClick={() => setActive(i)}>
                <span className="flowchart-node-head">
                  <span className="flowchart-num">{step.num}</span>
                  <span className="flowchart-tag">{step.tag}</span>
                </span>
                <span className="flowchart-text">{step.title}</span>
              </button>
              {i < GUIDE_FLOW_STEPS.length - 1 && (
                <span className="flowchart-mobile-arrow" aria-hidden="true"><ArrowRight size={15} /></span>
              )}
            </li>
          ))}
        </ol>
        <div className="flowchart-detail" aria-live="polite">
          <span className="flowchart-detail-step">第 {current.num} 步 · {current.title}</span>
          <p>{current.detail}</p>
        </div>
      </div>
    </section>
  );
}

const PREFIX = "guide-source";

// Numbered legend for the report figure. Kept in HTML rather than inside an
// image so every explanation wraps cleanly and is readable by screen readers.
const LEGEND = [
  { title: "项目名", short: "查的是哪一项", tone: "", text: "这一行查的是什么。可能是中文全称、缩写，或两者并列。" },
  { title: "结果", short: "本次测出的数字", tone: "accent", text: "这次样本测出的数字；旁边的箭头只是提示它落在所标区间之外。" },
  { title: "单位", short: "测量的尺度", tone: "", text: "数字按什么尺度记录。不同项目、不同实验室可能不同。" },
  { title: "参考区间", short: "健康人群常见范围", tone: "caution", text: "这套方法下健康人群的常见范围，不是个人的合格线。" },
];

function GuideFigure() {
  return (
    <figure className="article-figure guide-figure">
      <div className="article-figure-stage">
        <img
          src="/media/fig-report-guide.webp"
          alt="示意图：极简医学检验报告单的四列栏目抽象构图与放大镜，不含真实项目名、数值与区间"
          width={960}
          height={640}
          decoding="async"
        />
      </div>
      <div className="report-anatomy-card" role="img" aria-label="化验单四列结构示意：项目名、结果、单位与参考区间">
        <div className="report-anatomy-head">化验单一行的四个常见栏目</div>
        <div className="report-anatomy-grid">
          {LEGEND.map((item, index) => (
            <div className={`report-anatomy-col${item.tone ? ` ${item.tone}` : ""}`} key={item.title}>
              <span className="report-anatomy-badge" aria-hidden="true">{index + 1}</span>
              <b>{item.title}</b>
              <span>{item.short}</span>
            </div>
          ))}
        </div>
      </div>
      <figcaption>
        <span>化验单的一行通常由项目名、结果、单位和参考区间四列组成。</span>
        <small className="article-figure-attribution">插图：AI 生成插图 · 模型 gpt-image-2.6</small>
      </figcaption>
      <ol className="guide-legend">
        {LEGEND.map((item, index) => (
          <li key={item.title}>
            <span aria-hidden="true">{index + 1}</span>
            <div>
              <b>{item.title}</b>
              <p>{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="article-figure-note">
        <b>图示边界：</b>
        图为报告单版面概念示意，不含真实项目名称、数值、单位或参考区间，也未按任何一份真实报告绘制；不同机构的栏目名称与排列可能不同。
      </p>
    </figure>
  );
}

function GuideSection({ section, index }) {
  return (
    <section className="article-section" key={section.title}>
      <h2 id={`guide-section-${index + 1}`}>
        <i>{["一", "二", "三", "四", "五", "六"][index] || index + 1}</i>
        {section.title}
      </h2>
      {section.paragraphs.map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex}>
          {paragraph.text}
          <Citation ids={paragraph.sourceIds} references={GUIDE_CONTENT.references} prefix={PREFIX} />
        </p>
      ))}
    </section>
  );
}

function ReportRowsIndex({ go }) {
  return (
    <section className="guide-rows" id="guide-report-rows" aria-labelledby="guide-rows-title">
      <h2 id="guide-rows-title">
        <i>附</i>
        按项目找这一行
      </h2>
      <p className="guide-rows-note">
        选一个项目，看它在报告单上常见的写法，以及那一篇解释的是什么。
      </p>
      <ul>
        {Object.entries(REPORT_ROWS).map(([id, entry]) => (
          <li key={id}>
            <RouteLink page="article" id={id} className="guide-rows-item" onNavigate={() => go && go("article", id)}>
              <span className="guide-rows-term">
                <b>{entry.title}</b>
                <small>{entry.rows.join(" · ")}</small>
              </span>
              <ArrowRight size={15} aria-hidden="true" />
            </RouteLink>
          </li>
        ))}
      </ul>
      <p className="guide-rows-note">
        单子上的写法因机构而异，如果只看到英文缩写，也可以直接用
        <RouteLink page="glossary" className="text-link" onNavigate={() => go && go("glossary")}>
          体检缩写 A–Z 速查词典 <ArrowRight size={13} aria-hidden="true" />
        </RouteLink>
        按字母查找。
      </p>
    </section>
  );
}

// The strip inside an indicator article. It only lists the printed names and
// points at the guide; the explanation and its sources stay on one page, so no
// article gains extra citation numbers or a second source list.
export function ReportRowStrip({ id, go }) {
  const entry = REPORT_ROWS[id];
  if (!entry) return null;
  return (
    <section className="report-rows" id="article-report-rows" aria-labelledby="article-report-rows-title">
      <h2 id="article-report-rows-title">单子上的位置</h2>
      <ul>
        {entry.rows.map(row => <li key={row}>{row}</li>)}
      </ul>
      <p>
        不同机构的名称与缩写可能不同。看不懂某一列是什么意思，可以看
        <RouteLink page="guide" className="text-link" onNavigate={() => go && go("guide")}>
          单子怎么读 <ArrowRight size={13} aria-hidden="true" />
        </RouteLink>
        。
      </p>
    </section>
  );
}

const PAGE_REFERENCE = { ...GUIDE_CONTENT };

export default function ReportGuide({ go }) {
  return (
    <div className="guide-page" id="guide-top">
      <RunHead>
        <b>读体检单</b> / 单子怎么读
      </RunHead>
      <h1 className="guide-title">先看卡片上这一行。</h1>
      <p className="guide-lede">
        一张检验报告单，每一行都在回答同一个问题：这个项目这次测出了什么，和一群健康人的范围相比在哪里。这一页只讲版面怎么读，不判断任何人的结果。
      </p>
      <BoundaryNote trust={null}>
        本页解释报告单的栏目、区间与记号的含义，不解读个人数值，也不构成诊断或治疗建议。具体区间的适用条件以出具报告的实验室说明为准。
      </BoundaryNote>

      <GuideFigure />
      <GuideReadingFlowchart />

      <nav className="reading-toc" aria-label="页面目录">
        <span>本页内容</span>
        <a href="#guide-flowchart">四步阅读流程</a>
        {GUIDE_SECTIONS.map((section, index) => (
          <a key={section.title} href={`#guide-section-${index + 1}`}>{section.title}</a>
        ))}
        <a href="#guide-questions">常见问题</a>
        <a href={`#${PREFIX}-panel`}>核对来源</a>
      </nav>

      <div className="detail-body guide-body">
        {GUIDE_SECTIONS.map((section, index) => (
          <GuideSection key={section.title} section={section} index={index} />
        ))}

        <section className="term-questions" id="guide-questions" aria-labelledby="guide-questions-title">
          <h2 id="guide-questions-title"><i>附</i>常见问题</h2>
          <p className="guide-note">选一个问题，查看本页已有的解释与依据。不用于判断个人检查结果。</p>
          {GUIDE_FAQ.map(item => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>
                {item.answer}
                <Citation ids={item.sourceIds} references={PAGE_REFERENCE.references} prefix={PREFIX} />
              </p>
              <a className="guide-original" href="#guide-top">回到本页开头</a>
            </details>
          ))}
        </section>

        <ReportRowsIndex go={go} />

        <SourceReferences content={PAGE_REFERENCE} prefix={PREFIX} />

        <section className="topic-followup" aria-label="继续阅读">
          <h2>继续读</h2>
          <p>想弄懂抽血前怎么准备、哪些因素会引起短暂波动，或参考区间为何因医院而异，可以接着读这几篇；想查具体某一项，可以从项目索引里选。</p>
          <RouteLink page="article" id="fasting-test" className="text-link" onNavigate={() => go && go("article", "fasting-test")}>
            抽血前要求空腹，到底能不能喝水和吃药？ <ArrowRight size={15} />
          </RouteLink>
          <RouteLink page="article" id="pre-test-factors" className="text-link" onNavigate={() => go && go("article", "pre-test-factors")}>
            熬夜、喝酒、感冒或剧烈运动，为什么会让体检单出现短暂波动？ <ArrowRight size={15} />
          </RouteLink>
          <RouteLink page="article" id="lab-range" className="text-link" onNavigate={() => go && go("article", "lab-range")}>
            同一份血，两家医院的参考区间为什么不一样？ <ArrowRight size={15} />
          </RouteLink>
          <RouteLink page="article" id="imaging-guide" className="text-link" onNavigate={() => go && go("article", "imaging-guide")}>
            B 超、CT、核磁共振（MRI）和 X 光，体检里为什么不能互相替代？ <ArrowRight size={15} />
          </RouteLink>
          <RouteLink page="article" id="report-history" className="text-link" onNavigate={() => go && go("article", "report-history")}>
            为什么每次看报告，医生总问「去年的旧体检单带了吗」？ <ArrowRight size={15} />
          </RouteLink>
          <RouteLink page="indicators" className="text-link" onNavigate={() => go && go("indicators")}>
            浏览已开放的体检项目 <ArrowRight size={15} />
          </RouteLink>
          <RouteLink page="map" className="text-link" onNavigate={() => go && go("map")}>
            返回首页 <ArrowRight size={15} />
          </RouteLink>
        </section>
      </div>
    </div>
  );
}
