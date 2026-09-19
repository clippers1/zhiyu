import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { Citation } from "./ContentUI";
import "./visual-learning.css";

const diagrams = {
  "heart-flow-v1": {
    title: "心脏与肺之间的简化血液循环图",
    description: "图中展示全身、右心房、右心室、肺、左心房和左心室。箭头方向也在下方文字步骤中完整说明。",
    positions: {
      body: { x: 40, y: 165, w: 105, h: 78 },
      "right-atrium": { x: 220, y: 65, w: 112, h: 72 },
      "right-ventricle": { x: 220, y: 235, w: 112, h: 72 },
      lungs: { x: 475, y: 165, w: 105, h: 78 },
      "left-atrium": { x: 350, y: 65, w: 112, h: 72 },
      "left-ventricle": { x: 350, y: 235, w: 112, h: 72 },
    },
    paths: {
      "body-ra": ["M145 204 C180 204 180 101 220 101", "flow-blue"],
      "ra-rv": ["M276 137 L276 235", "flow-blue"],
      "rv-lungs": ["M332 271 C390 271 410 204 475 204", "flow-blue"],
      "lungs-la": ["M475 183 C438 183 455 101 462 101", "flow-red"],
      "la-lv": ["M406 137 L406 235", "flow-red"],
      "lv-body": ["M350 271 C270 360 92 330 92 243", "flow-red"],
    },
    annotations: [{ x: 276, y: 45, label: "身体右侧" }, { x: 406, y: 45, label: "身体左侧" }],
    legend: [{ className: "legend-blue", label: "前往肺的方向" }, { className: "legend-red", label: "从肺返回并前往全身的方向" }],
  },
  "lung-gas-exchange-v1": {
    title: "空气进入肺泡并与毛细血管交换气体的简化图",
    description: "图中展示鼻或口、气管、支气管、肺泡和毛细血管。箭头和下方文字共同说明空气与气体移动方向。",
    positions: {
      "nose-mouth": { x: 35, y: 155, w: 110, h: 74 },
      trachea: { x: 190, y: 50, w: 105, h: 70 },
      bronchi: { x: 190, y: 255, w: 105, h: 70 },
      alveoli: { x: 365, y: 145, w: 105, h: 74 },
      capillaries: { x: 495, y: 265, w: 110, h: 74 },
    },
    paths: {
      "air-trachea": ["M145 192 C170 192 165 85 190 85", "flow-air"],
      "trachea-bronchi": ["M242 120 L242 255", "flow-air"],
      "bronchi-alveoli": ["M295 290 C330 290 330 182 365 182", "flow-air"],
      "alveoli-capillaries": ["M417 219 C420 265 460 302 495 302", "flow-oxygen"],
      "capillaries-alveoli": ["M495 280 C465 258 455 218 470 198", "flow-carbon"],
      "alveoli-air": ["M365 165 C290 125 205 145 145 174", "flow-carbon"],
    },
    annotations: [{ x: 242, y: 35, label: "空气通道" }, { x: 483, y: 135, label: "气体交换" }],
    legend: [{ className: "legend-air", label: "空气沿气道移动" }, { className: "legend-blue", label: "氧气进入血液" }, { className: "legend-carbon", label: "二氧化碳进入肺泡并呼出" }],
  },
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReduced(media.matches);
    update(); media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function LearningDiagram({ learning, activePart, activeStep, onPart }) {
  const active = learning.steps[activeStep];
  const diagram = diagrams[learning.type];
  const titleID = `${learning.type}-title`;
  const descriptionID = `${learning.type}-desc`;
  return <svg className={`learning-diagram ${learning.type}`} viewBox="0 0 620 380" role="img" aria-labelledby={`${titleID} ${descriptionID}`}>
    <title id={titleID}>{diagram.title}</title>
    <desc id={descriptionID}>{diagram.description}</desc>
    <defs>
      <marker id="flow-arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path fill="#5683a4" d="M0 0 L10 5 L0 10 z" /></marker>
      <marker id="flow-arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path fill="#c67469" d="M0 0 L10 5 L0 10 z" /></marker>
      <marker id="flow-arrow-air" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path fill="#648b68" d="M0 0 L10 5 L0 10 z" /></marker>
      <marker id="flow-arrow-carbon" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path fill="#b97a45" d="M0 0 L10 5 L0 10 z" /></marker>
    </defs>
    {learning.steps.map((step, index) => {
      const path = diagram.paths[step.id];
      return path && <path key={step.id} d={path[0]} className={`learning-path ${path[1]}${activeStep === index ? " active" : ""}`} />;
    })}
    {learning.parts.map(part => {
      const box = diagram.positions[part.id];
      if (!box) return null;
      const selected = activePart === part.id || active?.from === part.id || active?.to === part.id;
      return <g key={part.id} role="button" tabIndex="0" aria-label={`${part.label}：${part.summary}`} aria-pressed={activePart === part.id}
        className={`learning-part${selected ? " active" : ""}`} onClick={() => onPart(part.id)}
        onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPart(part.id); } }}>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="22" />
        <text x={box.x + box.w / 2} y={box.y + box.h / 2 + 6} textAnchor="middle">{part.label}</text>
      </g>;
    })}
    {diagram.annotations.map(item => <text key={item.label} className="diagram-side" x={item.x} y={item.y} textAnchor="middle">{item.label}</text>)}
  </svg>;
}

function KnowledgeCheck({ questions, references }) {
  const [answers, setAnswers] = useState({});
  if (!questions?.length) return null;
  return <section className="learning-check" aria-labelledby="learning-check-title">
    <h3 id="learning-check-title">用两道题检查是否看懂</h3>
    <p>选择只在本页生效，不保存答案，也不生成健康评分。</p>
    {questions.map((item, questionIndex) => {
      const answer = answers[questionIndex];
      return <fieldset key={item.question}>
        <legend>{questionIndex + 1}. {item.question}</legend>
        <div className="learning-options">{item.options.map((option, optionIndex) => <button type="button" key={option}
          aria-pressed={answer === optionIndex} onClick={() => setAnswers(current => ({ ...current, [questionIndex]: optionIndex }))}>{option}</button>)}</div>
        {answer !== undefined && <p className={`learning-answer ${answer === item.correctIndex ? "correct" : "retry"}`} role="status">
          <b>{answer === item.correctIndex ? "理解正确。" : "再顺着路径看一遍。"}</b> {item.explanation}
          <Citation ids={item.sourceIds} references={references} prefix="organ-source" />
        </p>}
      </fieldset>;
    })}
  </section>;
}

export default function VisualLearning({ content }) {
  const learning = content?.learning;
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [part, setPart] = useState(null);
  const [playing, setPlaying] = useState(false);
  const active = learning?.steps?.[step];
  const selectedPart = useMemo(() => learning?.parts?.find(item => item.id === part), [learning, part]);
  useEffect(() => {
    if (!playing || reduced || !learning?.steps?.length) return;
    const timer = window.setTimeout(() => setStep(current => {
      if (current >= learning.steps.length - 1) { setPlaying(false); return current; }
      return current + 1;
    }), 2200);
    return () => window.clearTimeout(timer);
  }, [learning, playing, reduced, step]);
  const diagram = diagrams[learning?.type];
  if (!learning || !diagram || !learning.steps?.length) return null;
  const move = next => { setPlaying(false); setPart(null); setStep(Math.max(0, Math.min(learning.steps.length - 1, next))); };
  return <section className="visual-learning" id="organ-learning" aria-labelledby="organ-learning-title">
    <header><span>互动图解 · 基础生理</span><h2 id="organ-learning-title">{learning.title}</h2><p>{learning.intro}</p></header>
    <div className="learning-layout">
      <div>
        <LearningDiagram learning={learning} activePart={part} activeStep={step} onPart={id => { setPlaying(false); setPart(id); }} />
        <p className="learning-legend">{diagram.legend.map(item => <React.Fragment key={item.label}><i className={item.className} /> {item.label}</React.Fragment>)}；颜色不是方向或气体含义的唯一说明。</p>
      </div>
      <div className="learning-current" aria-live="polite">
        {selectedPart ? <><span>点选结构</span><h3>{selectedPart.label}</h3><p>{selectedPart.summary}<Citation ids={selectedPart.sourceIds} references={content.references} prefix="organ-source" /></p></>
          : <><span>第 {step + 1} / {learning.steps.length} 步</span><h3>{active.title}</h3><p>{active.text}<Citation ids={active.sourceIds} references={content.references} prefix="organ-source" /></p></>}
        <div className="learning-controls">
          <button type="button" onClick={() => move(step - 1)} disabled={step === 0} aria-label="上一步"><ChevronLeft size={18} />上一步</button>
          <button type="button" className="learning-play" onClick={() => { setPart(null); if (step === learning.steps.length - 1) setStep(0); setPlaying(value => !value); }} disabled={reduced}>
            {playing ? <Pause size={18} /> : <Play size={18} />}{playing ? "暂停" : reduced ? "已减少动态" : "逐步播放"}
          </button>
          <button type="button" onClick={() => move(step + 1)} disabled={step === learning.steps.length - 1}>下一步<ChevronRight size={18} /></button>
        </div>
        <button type="button" className="learning-reset" onClick={() => { setPart(null); setPlaying(false); setStep(0); }}><RotateCcw size={15} />重新开始</button>
      </div>
    </div>
    <details className="learning-transcript"><summary>阅读全部步骤</summary><ol>{learning.steps.map(item => <li key={item.id}><b>{item.title}</b><p>{item.text}<Citation ids={item.sourceIds} references={content.references} prefix="organ-source" /></p></li>)}</ol></details>
    <p className="learning-boundary"><b>图示边界：</b>{learning.simplification}</p>
    <KnowledgeCheck questions={learning.questions} references={content.references} />
  </section>;
}
