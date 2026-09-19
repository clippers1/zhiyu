import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { Citation } from "./ContentUI";
import "./visual-learning.css";

const positions = {
  body: { x: 40, y: 165, w: 105, h: 78 },
  "right-atrium": { x: 220, y: 65, w: 112, h: 72 },
  "right-ventricle": { x: 220, y: 235, w: 112, h: 72 },
  lungs: { x: 475, y: 165, w: 105, h: 78 },
  "left-atrium": { x: 350, y: 65, w: 112, h: 72 },
  "left-ventricle": { x: 350, y: 235, w: 112, h: 72 },
};
const paths = {
  "body-ra": "M145 204 C180 204 180 101 220 101",
  "ra-rv": "M276 137 L276 235",
  "rv-lungs": "M332 271 C390 271 410 204 475 204",
  "lungs-la": "M475 183 C438 183 455 101 462 101",
  "la-lv": "M406 137 L406 235",
  "lv-body": "M350 271 C270 360 92 330 92 243",
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
  return <svg className="learning-diagram" viewBox="0 0 620 380" role="img" aria-labelledby="heart-flow-title heart-flow-desc">
    <title id="heart-flow-title">心脏与肺之间的简化血液循环图</title>
    <desc id="heart-flow-desc">图中展示全身、右心房、右心室、肺、左心房和左心室。箭头方向也在下方文字步骤中完整说明。</desc>
    <defs>
      <marker id="flow-arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" /></marker>
      <marker id="flow-arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" /></marker>
    </defs>
    {learning.steps.map((step, index) => <path key={step.id} d={paths[step.id]} className={`learning-path ${index < 3 ? "flow-blue" : "flow-red"}${activeStep === index ? " active" : ""}`} />)}
    {learning.parts.map(part => {
      const box = positions[part.id];
      if (!box) return null;
      const selected = activePart === part.id || active?.from === part.id || active?.to === part.id;
      return <g key={part.id} role="button" tabIndex="0" aria-label={`${part.label}：${part.summary}`} aria-pressed={activePart === part.id}
        className={`learning-part${selected ? " active" : ""}`} onClick={() => onPart(part.id)}
        onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPart(part.id); } }}>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="22" />
        <text x={box.x + box.w / 2} y={box.y + box.h / 2 + 6} textAnchor="middle">{part.label}</text>
      </g>;
    })}
    <text className="diagram-side" x="276" y="45" textAnchor="middle">身体右侧</text>
    <text className="diagram-side" x="406" y="45" textAnchor="middle">身体左侧</text>
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
  if (!learning || learning.type !== "heart-flow-v1" || !learning.steps?.length) return null;
  const move = next => { setPlaying(false); setPart(null); setStep(Math.max(0, Math.min(learning.steps.length - 1, next))); };
  return <section className="visual-learning" id="organ-learning" aria-labelledby="organ-learning-title">
    <header><span>互动图解 · 基础生理</span><h2 id="organ-learning-title">{learning.title}</h2><p>{learning.intro}</p></header>
    <div className="learning-layout">
      <div>
        <LearningDiagram learning={learning} activePart={part} activeStep={step} onPart={id => { setPlaying(false); setPart(id); }} />
        <p className="learning-legend"><i className="legend-blue" /> 前往肺的方向 <i className="legend-red" /> 从肺返回并前往全身的方向；颜色不是血液状态的唯一说明。</p>
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
