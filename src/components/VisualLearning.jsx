import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { Citation } from "./ContentUI";
import "./visual-learning.css";

const diagrams = {
  "heart-flow-v1": {
    title: "心脏、肺与全身之间的简化血液循环图",
    description: "图中用器官轮廓展示全身、四个心腔和肺，动态箭头与下方文字共同说明血液流动方向。",
    paths: {
      "body-ra": ["M143 270 C178 270 192 224 232 218", "flow-blue"],
      "ra-rv": ["M276 248 C272 264 278 277 292 288", "flow-blue"],
      "rv-lungs": ["M302 332 C205 286 218 140 282 118", "flow-blue"],
      "lungs-la": ["M364 118 C422 136 431 182 394 211", "flow-red"],
      "la-lv": ["M383 248 C397 266 391 285 371 299", "flow-red"],
      "lv-body": ["M341 350 C280 403 145 382 112 324", "flow-red"],
    },
    legend: [{ className: "legend-blue", label: "从全身前往肺" }, { className: "legend-red", label: "从肺返回并前往全身" }],
  },
  "lung-gas-exchange-v1": {
    title: "空气进入肺泡并与毛细血管交换气体的简化图",
    description: "图中展示鼻或口、气管、支气管、肺泡和毛细血管，箭头与下方文字共同说明空气和气体移动方向。",
    paths: {
      "air-trachea": ["M133 100 C164 100 186 100 218 100", "flow-air"],
      "trachea-bronchi": ["M243 134 C243 176 263 210 304 228", "flow-air"],
      "bronchi-alveoli": ["M322 228 C360 225 395 188 432 171", "flow-air"],
      "alveoli-capillaries": ["M477 205 C506 224 514 253 497 278", "flow-oxygen"],
      "capillaries-alveoli": ["M466 280 C443 254 442 226 457 205", "flow-carbon"],
      "alveoli-air": ["M430 151 C351 82 230 59 133 82", "flow-carbon"],
    },
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

function DiagramDefs() {
  return <defs>
    <marker id="flow-arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path fill="#5683a4" d="M0 0 L10 5 L0 10 z" /></marker>
    <marker id="flow-arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path fill="#c67469" d="M0 0 L10 5 L0 10 z" /></marker>
    <marker id="flow-arrow-air" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path fill="#648b68" d="M0 0 L10 5 L0 10 z" /></marker>
    <marker id="flow-arrow-carbon" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path fill="#b97a45" d="M0 0 L10 5 L0 10 z" /></marker>
    <filter id="part-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#29493b" floodOpacity=".12" /></filter>
  </defs>;
}

function FlowPaths({ learning, activeStep, diagram }) {
  return learning.steps.map((step, index) => {
    const path = diagram.paths[step.id];
    return path && <path key={step.id} d={path[0]} className={`learning-path ${path[1]}${activeStep === index ? " active" : ""}`} />;
  });
}

function InteractivePart({ part, selected, pressed, onPart, tone = "neutral", labelX, labelY, children }) {
  return <g role="button" tabIndex="0" aria-label={`${part.label}：${part.summary}`} aria-pressed={pressed}
    className={`learning-part tone-${tone}${selected ? " active" : ""}`} onClick={() => onPart(part.id)}
    onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPart(part.id); } }}>
    {children}
    <text className="part-label" x={labelX} y={labelY} textAnchor="middle">{part.label}</text>
  </g>;
}

function HeartArtwork({ learning, activePart, activeStep, onPart, diagram }) {
  const parts = Object.fromEntries(learning.parts.map(part => [part.id, part]));
  const active = learning.steps[activeStep];
  const selected = id => activePart === id || active?.from === id || active?.to === id;
  return <>
    <path className="diagram-orbit" d="M95 216 C112 105 202 44 305 46 C442 48 534 143 523 266 C515 353 440 394 337 394" />
    <FlowPaths learning={learning} activeStep={activeStep} diagram={diagram} />
    <g className="heart-anatomy" aria-hidden="true">
      <path className="heart-shell" d="M220 197 C218 151 252 150 307 176 C356 143 424 161 427 220 C431 292 374 361 327 381 C276 356 220 293 220 197Z" />
      <path className="heart-septum" d="M326 181 C323 234 326 305 327 367" />
    </g>
    <InteractivePart part={parts.body} selected={selected("body")} pressed={activePart === "body"} onPart={onPart} tone="body" labelX="88" labelY="277">
      <circle className="part-surface" cx="88" cy="270" r="55" />
      <circle className="part-detail" cx="88" cy="270" r="43" />
    </InteractivePart>
    <InteractivePart part={parts.lungs} selected={selected("lungs")} pressed={activePart === "lungs"} onPart={onPart} tone="lung" labelX="322" labelY="111">
      <path className="part-surface" d="M306 46 L306 92 C293 62 273 47 253 51 C224 57 211 89 217 126 C223 158 244 173 277 165 C302 158 311 135 311 107 L311 46Z" />
      <path className="part-surface" d="M334 46 L334 92 C347 62 367 47 387 51 C416 57 429 89 423 126 C417 158 396 173 363 165 C338 158 329 135 329 107 L329 46Z" />
      <path className="part-detail part-line" d="M320 37 L320 108 M320 74 L279 111 M320 74 L361 111" />
    </InteractivePart>
    <InteractivePart part={parts["right-atrium"]} selected={selected("right-atrium")} pressed={activePart === "right-atrium"} onPart={onPart} tone="venous" labelX="271" labelY="219">
      <path className="part-surface" d="M235 181 C250 167 284 170 307 185 L306 244 C285 253 252 248 237 230 C228 219 226 191 235 181Z" />
    </InteractivePart>
    <InteractivePart part={parts["right-ventricle"]} selected={selected("right-ventricle")} pressed={activePart === "right-ventricle"} onPart={onPart} tone="venous" labelX="282" labelY="307">
      <path className="part-surface" d="M237 246 C258 255 286 255 307 247 L319 362 C280 341 245 305 237 246Z" />
    </InteractivePart>
    <InteractivePart part={parts["left-atrium"]} selected={selected("left-atrium")} pressed={activePart === "left-atrium"} onPart={onPart} tone="arterial" labelX="374" labelY="219">
      <path className="part-surface" d="M335 184 C359 167 398 171 414 190 C422 203 417 228 407 239 C389 251 357 251 337 241Z" />
    </InteractivePart>
    <InteractivePart part={parts["left-ventricle"]} selected={selected("left-ventricle")} pressed={activePart === "left-ventricle"} onPart={onPart} tone="arterial" labelX="369" labelY="307">
      <path className="part-surface" d="M337 248 C357 255 389 254 407 242 C403 296 371 344 329 368 L329 274Z" />
    </InteractivePart>
    <text className="diagram-side" x="272" y="158" textAnchor="middle">身体右侧</text>
    <text className="diagram-side" x="374" y="158" textAnchor="middle">身体左侧</text>
    <text className="diagram-caption" x="322" y="414" textAnchor="middle">示意图 · 位置、比例和速度均经过简化</text>
  </>;
}

function LungArtwork({ learning, activePart, activeStep, onPart, diagram }) {
  const parts = Object.fromEntries(learning.parts.map(part => [part.id, part]));
  const active = learning.steps[activeStep];
  const selected = id => activePart === id || active?.from === id || active?.to === id;
  return <>
    <g className="lung-anatomy" aria-hidden="true">
      <path className="lung-lobe" d="M237 121 C197 128 176 172 180 241 C183 315 212 354 267 342 C294 336 310 306 305 267 L291 151 C283 126 261 116 237 121Z" />
      <path className="lung-lobe" d="M328 151 L315 267 C310 306 326 336 353 342 C408 354 437 315 440 241 C444 172 423 128 383 121 C359 116 337 126 328 151Z" />
      <path className="lung-divider" d="M309 118 L309 345" />
    </g>
    <FlowPaths learning={learning} activeStep={activeStep} diagram={diagram} />
    <InteractivePart part={parts["nose-mouth"]} selected={selected("nose-mouth")} pressed={activePart === "nose-mouth"} onPart={onPart} tone="air" labelX="80" labelY="106">
      <circle className="part-surface" cx="80" cy="100" r="52" />
      <path className="part-detail part-line" d="M57 90 C65 76 79 72 88 78 C95 84 92 95 81 98 C94 99 102 106 102 116 C88 126 67 124 57 112" />
    </InteractivePart>
    <InteractivePart part={parts.trachea} selected={selected("trachea")} pressed={activePart === "trachea"} onPart={onPart} tone="air" labelX="242" labelY="92">
      <path className="part-surface airway-tube" d="M225 58 L259 58 L259 178 C259 193 266 207 279 216 L263 237 C238 223 225 203 225 179Z" />
      <path className="part-detail airway-rings" d="M228 79 H256 M228 99 H256 M228 119 H256 M228 139 H256" />
    </InteractivePart>
    <InteractivePart part={parts.bronchi} selected={selected("bronchi")} pressed={activePart === "bronchi"} onPart={onPart} tone="air" labelX="316" labelY="259">
      <path className="part-surface part-line bronchi-line" d="M267 216 C285 229 299 239 316 245 M316 245 C294 269 274 284 246 295 M316 245 C340 269 363 283 391 294" />
    </InteractivePart>
    <InteractivePart part={parts.alveoli} selected={selected("alveoli")} pressed={activePart === "alveoli"} onPart={onPart} tone="alveoli" labelX="475" labelY="173">
      <path className="part-detail part-line" d="M405 188 C426 180 434 174 442 165" />
      <circle className="part-surface" cx="456" cy="144" r="24" />
      <circle className="part-surface" cx="491" cy="142" r="25" />
      <circle className="part-surface" cx="475" cy="176" r="28" />
      <circle className="part-surface" cx="512" cy="177" r="20" />
      <circle className="part-surface" cx="441" cy="181" r="19" />
    </InteractivePart>
    <InteractivePart part={parts.capillaries} selected={selected("capillaries")} pressed={activePart === "capillaries"} onPart={onPart} tone="capillary" labelX="482" labelY="315">
      <path className="part-surface capillary-loop" d="M426 277 C448 249 505 247 530 274 C554 300 539 342 502 352 C465 363 421 339 417 309 C415 297 418 286 426 277Z" />
      <path className="part-detail capillary-inner" d="M443 289 C461 271 498 270 515 289 C529 306 518 330 493 336 C468 342 440 328 437 309 C436 302 438 295 443 289Z" />
    </InteractivePart>
    <text className="diagram-caption" x="310" y="405" textAnchor="middle">气道、肺泡与毛细血管数量均经过简化</text>
  </>;
}

function LearningDiagram({ learning, activePart, activeStep, onPart }) {
  const diagram = diagrams[learning.type];
  const titleID = `${learning.type}-title`;
  const descriptionID = `${learning.type}-desc`;
  return <svg className={`learning-diagram ${learning.type}`} viewBox="0 0 620 430" role="img" aria-labelledby={`${titleID} ${descriptionID}`}>
    <title id={titleID}>{diagram.title}</title>
    <desc id={descriptionID}>{diagram.description}</desc>
    <DiagramDefs />
    {learning.type === "heart-flow-v1"
      ? <HeartArtwork learning={learning} activePart={activePart} activeStep={activeStep} onPart={onPart} diagram={diagram} />
      : <LungArtwork learning={learning} activePart={activePart} activeStep={activeStep} onPart={onPart} diagram={diagram} />}
  </svg>;
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
        <p className="learning-legend">{diagram.legend.map(item => <React.Fragment key={item.label}><i className={item.className} /> {item.label}</React.Fragment>)}；颜色只是辅助，箭头和文字会同时说明方向。</p>
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
    <details className="learning-transcript"><summary>一次读完整个过程</summary><ol>{learning.steps.map(item => <li key={item.id}><b>{item.title}</b><p>{item.text}<Citation ids={item.sourceIds} references={content.references} prefix="organ-source" /></p></li>)}</ol></details>
    <p className="learning-boundary"><b>图示边界：</b>{learning.simplification}</p>
  </section>;
}
