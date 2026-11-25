import React, { useState } from "react";
import { ArrowRight, GitBranch, ClipboardList } from "lucide-react";
import { Citation } from "./ContentUI";
import { RouteLink } from "./RouteLink";
import { REPORT_ROWS } from "../services/report-guide";
import "./indicator-flowchart.css";

const MECHANISM_STAGES = [
  { tag: "起点 / 触发", tone: "teal" },
  { tag: "体内变化 / 成像", tone: "blue" },
  { tag: "化验 / 影像呈现", tone: "amber" },
  { tag: "综合解读视角", tone: "coral" },
];

export default function IndicatorFlowchart({ detail, relatedIndicators = [], go, onOpen }) {
  const [tab, setTab] = useState("mechanism"); // mechanism | reading
  const [activeStep, setActiveStep] = useState(0);

  if (!detail || detail.kind !== "indicator" || !Array.isArray(detail.chain) || detail.chain.length < 3) {
    return null;
  }

  const reportRow = REPORT_ROWS[detail.id];
  const metricNames = (detail.metrics || []).map((m) => m.name).slice(0, 4);
  const steps = detail.chain;

  const readingSteps = [
    {
      num: "01",
      title: "在单子上认出这一项",
      tag: "定位栏目",
      tone: "teal",
      summary: reportRow
        ? `报告单常见写法：${reportRow.rows.join("、")}。不同医院缩写略有差异，先核对全称与单位。`
        : `先在检验单或影像报告中找到「${detail.title}」对应的完整项目名、结果与单位。`,
    },
    {
      num: "02",
      title: "先核对检查条件与干扰",
      tag: "排除干扰",
      tone: "blue",
      summary: detail.tip || "单次数值容易受空腹时长、近期作息、用药或临时状态影响，不凭单行箭头急着下结论。",
      sourceIds: detail.tipSourceIds,
    },
    {
      num: "03",
      title: "组内分工与相邻项对照",
      tag: "横向联动",
      tone: "amber",
      summary: metricNames.length
        ? `本组常一起看：${metricNames.join(" / ")}${relatedIndicators.length ? `；报告单上也常和${relatedIndicators.slice(0, 3).map((x) => x.title).join("、")}横向对照。` : "。"}`
        : "把同一系统的多项指标和伴随检查放在一起看，比盯单个数字更有背景意义。",
    },
    {
      num: "04",
      title: "对比往年趋势并问医生",
      tag: "长期视角",
      tone: "coral",
      summary: "翻出近 1–3 年旧报告观察是长期稳定还是近期突变；若有明显异常、持续变化或伴随不适，携带完整原件咨询医生。",
    },
  ];

  const currentReading = readingSteps[Math.min(activeStep, readingSteps.length - 1)];

  return (
    <section
      className="indicator-flowchart"
      id="article-flowchart"
      aria-labelledby="indicator-flowchart-title"
    >
      <div className="flowchart-header">
        <div>
          <span className="flowchart-kicker">可视化流程图 · 一图看懂</span>
          <h2 id="indicator-flowchart-title">{detail.title}：原理与看单流程</h2>
        </div>
        <div className="flowchart-tabs" role="tablist" aria-label="切换流程图视角">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "mechanism"}
            className={tab === "mechanism" ? "active" : ""}
            onClick={() => { setTab("mechanism"); setActiveStep(0); }}
          >
            <GitBranch size={15} aria-hidden="true" />
            原理与检测流程
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "reading"}
            className={tab === "reading" ? "active" : ""}
            onClick={() => { setTab("reading"); setActiveStep(0); }}
          >
            <ClipboardList size={15} aria-hidden="true" />
            看单四步路径
          </button>
        </div>
      </div>

      {tab === "mechanism" ? (
        <div className="flowchart-panel" role="tabpanel">
          {/* Crisp SVG visual connector bar for desktop */}
          <svg
            className="flowchart-rail-svg"
            viewBox="0 0 800 36"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="fc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f766e" />
                <stop offset="38%" stopColor="#3b76a3" />
                <stop offset="70%" stopColor="#cf7f32" />
                <stop offset="100%" stopColor="#cf564e" />
              </linearGradient>
            </defs>
            <line x1="90" y1="18" x2="710" y2="18" stroke="#d5e4e8" strokeWidth="3" strokeLinecap="round" />
            <line
              x1="90"
              y1="18"
              x2="710"
              y2="18"
              stroke="url(#fc-grad)"
              strokeWidth="3"
              strokeDasharray="8 6"
              strokeLinecap="round"
              className="flowchart-rail-animated"
            />
            {[90, 297, 503, 710].slice(0, steps.length).map((cx, i) => (
              <g key={cx}>
                <circle
                  cx={cx}
                  cy="18"
                  r={activeStep === i ? 9 : 6}
                  fill={activeStep === i ? "#0f766e" : "#ffffff"}
                  stroke="#0f766e"
                  strokeWidth="2.5"
                />
                {i < steps.length - 1 && (
                  <path
                    d={`M${cx + 94} 13 L${cx + 105} 18 L${cx + 94} 23`}
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            ))}
          </svg>

          <ol className="flowchart-grid">
            {steps.map((text, i) => {
              const stage = MECHANISM_STAGES[i] || MECHANISM_STAGES[MECHANISM_STAGES.length - 1];
              const isSelected = activeStep === i;
              return (
                <li key={text} className={`flowchart-node tone-${stage.tone}${isSelected ? " active" : ""}`}>
                  <button
                    type="button"
                    className="flowchart-node-btn"
                    aria-pressed={isSelected}
                    onClick={() => setActiveStep(i)}
                  >
                    <span className="flowchart-node-head">
                      <span className="flowchart-num">0{i + 1}</span>
                      <span className="flowchart-tag">{stage.tag}</span>
                    </span>
                    <span className="flowchart-text">{text}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <span className="flowchart-mobile-arrow" aria-hidden="true">
                      <ArrowRight size={15} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="flowchart-detail" aria-live="polite">
            <span className="flowchart-detail-step">
              第 {activeStep + 1} / {steps.length} 步 · {(MECHANISM_STAGES[activeStep] || MECHANISM_STAGES[3]).tag}
            </span>
            <p>
              <b>{steps[activeStep]}</b>
              {detail.chainSourceIds?.length > 0 && (
                <Citation ids={detail.chainSourceIds} references={detail.references} prefix="article-source" />
              )}
            </p>
            <span className="flowchart-detail-hint">
              点击上方任意节点按顺序梳理；下方正文各节会逐一展开细节与依据。
            </span>
          </div>
        </div>
      ) : (
        <div className="flowchart-panel" role="tabpanel">
          <svg
            className="flowchart-rail-svg"
            viewBox="0 0 800 36"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line x1="90" y1="18" x2="710" y2="18" stroke="#d5e4e8" strokeWidth="3" strokeLinecap="round" />
            <line
              x1="90"
              y1="18"
              x2="710"
              y2="18"
              stroke="#0f766e"
              strokeWidth="3"
              strokeDasharray="8 6"
              strokeLinecap="round"
              className="flowchart-rail-animated"
            />
            {[90, 297, 503, 710].map((cx, i) => (
              <g key={cx}>
                <circle
                  cx={cx}
                  cy="18"
                  r={activeStep === i ? 9 : 6}
                  fill={activeStep === i ? "#0f766e" : "#ffffff"}
                  stroke="#0f766e"
                  strokeWidth="2.5"
                />
                {i < 3 && (
                  <path
                    d={`M${cx + 94} 13 L${cx + 105} 18 L${cx + 94} 23`}
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            ))}
          </svg>
          <ol className="flowchart-grid">
            {readingSteps.map((step, i) => {
              const isSelected = activeStep === i;
              return (
                <li key={step.num} className={`flowchart-node tone-${step.tone}${isSelected ? " active" : ""}`}>
                  <button
                    type="button"
                    className="flowchart-node-btn"
                    aria-pressed={isSelected}
                    onClick={() => setActiveStep(i)}
                  >
                    <span className="flowchart-node-head">
                      <span className="flowchart-num">{step.num}</span>
                      <span className="flowchart-tag">{step.tag}</span>
                    </span>
                    <span className="flowchart-text">{step.title}</span>
                  </button>
                  {i < readingSteps.length - 1 && (
                    <span className="flowchart-mobile-arrow" aria-hidden="true">
                      <ArrowRight size={15} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="flowchart-detail" aria-live="polite">
            <span className="flowchart-detail-step">
              看单第 {currentReading.num} 步 · {currentReading.title}
            </span>
            <p>
              {currentReading.summary}
              {currentReading.sourceIds?.length > 0 && (
                <Citation ids={currentReading.sourceIds} references={detail.references} prefix="article-source" />
              )}
            </p>
            {activeStep === 2 && relatedIndicators.length > 0 && (
              <div className="flowchart-links">
                {relatedIndicators.slice(0, 4).map((item) => (
                  <RouteLink
                    key={item.id}
                    page="article"
                    id={item.id}
                    className="flowchart-chip"
                    onNavigate={() => onOpen?.(item.id)}
                  >
                    对照看：{item.title} <ArrowRight size={13} aria-hidden="true" />
                  </RouteLink>
                ))}
              </div>
            )}
            {activeStep === 3 && (
              <div className="flowchart-links">
                <RouteLink page="guide" className="flowchart-chip" onNavigate={() => go?.("guide")}>
                  读懂化验单四列结构 <ArrowRight size={13} aria-hidden="true" />
                </RouteLink>
                <RouteLink page="article" id="report-history" className="flowchart-chip" onNavigate={() => onOpen?.("report-history")}>
                  为什么要带往年旧报告 <ArrowRight size={13} aria-hidden="true" />
                </RouteLink>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="flowchart-boundary">
        <b>图示边界：</b>本流程图用于梳理「{detail.title}」的科普机制与阅读体检报告的常规顺序，不含具体数值诊断分界或个体化诊疗决策，异常结果请以医生面对面评估为准。
      </p>
    </section>
  );
}
