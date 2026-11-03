import React from "react";
import { ArrowRight } from "lucide-react";
import { BoundaryNote, Citation, RunHead, SourceReferences } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { diagramFor } from "./Diagrams";
import { REPORT_ROWS, GUIDE_CONTENT, GUIDE_FAQ, GUIDE_SECTIONS } from "../services/report-guide";

const PREFIX = "guide-source";

// Numbered legend for the report figure. Kept in HTML rather than inside the
// SVG: the diagram is a picture of a layout, the legend is prose, and prose in
// HTML can wrap and be read by a screen reader at any size.
const LEGEND = [
  { title: "项目名", text: "这一行查的是什么。可能是中文全称、缩写，或两者并列。" },
  { title: "结果", text: "这次样本测出的数字；旁边的箭头只是提示它落在所标区间之外。" },
  { title: "单位", text: "数字按什么尺度记录。不同项目、不同实验室可能不同。" },
  { title: "参考区间", text: "这套方法下健康人群的常见范围，不是个人的合格线。" },
];

function GuideFigure() {
  const Diagram = diagramFor("report-anatomy");
  if (!Diagram) return null;
  return (
    <figure className="article-figure guide-figure">
      <div className="article-figure-stage">
        <Diagram id="guide-report-diagram" />
      </div>
      <figcaption>
        <span>化验单的一行由项目名、结果、单位和参考区间组成。</span>
        <small className="article-figure-attribution">插图：知愈自制示意图</small>
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
        图为报告单版面示意，不含真实项目名称、数值、单位或参考区间，也未按任何一份真实报告绘制；不同机构的栏目名称与排列可能不同。
      </p>
    </figure>
  );
}

function GuideSection({ section, index }) {
  return (
    <section className="article-section" key={section.title}>
      <h2 id={`guide-section-${index + 1}`}>
        <i>{["一", "二", "三", "四", "五"][index] || index + 1}</i>
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
        单子上的写法因机构而异，没列出的名称也可以到项目目录里按缩写查找。
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

      <nav className="reading-toc" aria-label="页面目录">
        <span>本页内容</span>
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
          <p>想弄懂参考区间为什么因医院而异，可以看这篇长文；想换一个项目，可以从项目索引里选。</p>
          <RouteLink page="article" id="lab-range" className="text-link" onNavigate={() => go && go("article", "lab-range")}>
            同一份血，两家医院的参考区间为什么不一样？ <ArrowRight size={15} />
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
