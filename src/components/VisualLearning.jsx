import React, { useEffect, useId, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { Citation } from "./ContentUI";
import "./visual-learning.css";

const diagrams = {
  "heart-flow-v1": {
    title: "心脏内部结构与血液流动方向图",
    description: "以医学心脏剖面插图为底图，每次只高亮一个相关区域，并用一小段动态路径说明当前血液流动方向。",
    legend: [{ className: "legend-blue", label: "从全身前往肺" }, { className: "legend-red", label: "从肺返回并前往全身" }],
    attribution: {
      name: "Servier Medical Art by Servier",
      url: "https://smart.servier.com/smart_image/smart-heart/",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
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

const heartFlowVisuals = {
  "body-ra": {
    path: "M91 78 C91 145 103 223 150 294", tone: "flow-blue", duration: "2.4s", spot: [150, 288, 105, 132],
    label: { line: "M150 294 L92 324 L40 324", x: 22, y: 307, width: 92, textX: 68, textY: 329, text: "右心房" },
  },
  "ra-rv": {
    path: "M153 300 C171 339 198 378 232 421", tone: "flow-blue", duration: "2.4s", spot: [226, 410, 120, 150],
    label: { line: "M232 421 L114 462 L54 462", x: 28, y: 445, width: 102, textX: 79, textY: 467, text: "右心室" },
  },
  "rv-lungs": {
    path: "M232 421 C261 374 278 321 278 261 C278 203 285 148 317 104", tone: "flow-blue", duration: "3s", spot: [278, 252, 122, 186],
    label: { line: "M317 104 L405 78 L512 78", x: 414, y: 61, width: 120, textX: 474, textY: 83, text: "前往肺部" },
  },
  "lungs-la": {
    path: "M528 214 C487 218 450 235 407 274", tone: "flow-red", duration: "2.4s", spot: [408, 274, 96, 112],
    label: { line: "M407 274 L482 304 L538 304", x: 446, y: 287, width: 92, textX: 492, textY: 309, text: "左心房" },
  },
  "la-lv": {
    path: "M407 278 C407 321 410 365 416 430", tone: "flow-red", duration: "2.4s", spot: [414, 412, 112, 152],
    label: { line: "M416 430 L478 469 L536 469", x: 443, y: 452, width: 95, textX: 491, textY: 474, text: "左心室" },
  },
  "lv-body": {
    path: "M416 430 C374 371 347 308 334 239 C321 169 304 100 281 46", tone: "flow-red", duration: "3s", spot: [334, 230, 130, 214],
    label: { line: "M281 46 L214 77 L112 77", x: 30, y: 60, width: 182, textX: 121, textY: 82, text: "主动脉 · 前往全身" },
  },
};

const heartPartSpots = {
  "right-atrium": [150, 288, 62, 72],
  "right-ventricle": [226, 410, 70, 90],
  "left-atrium": [408, 274, 58, 65],
  "left-ventricle": [414, 412, 68, 92],
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

function HeartMedicalArtwork({ learning, activePart, activeStep, onPart, diagram }) {
  const clipID = `heart-focus-${useId().replaceAll(":", "")}`;
  const parts = Object.fromEntries(learning.parts.map(part => [part.id, part]));
  const active = learning.steps[activeStep];
  const visual = heartFlowVisuals[active.id];
  const [spotX, spotY, spotWidth, spotHeight] = visual.spot;
  return <svg className="heart-medical-diagram" viewBox="0 0 560 610" role="img" aria-labelledby="heart-medical-title heart-medical-desc">
    <title id="heart-medical-title">{diagram.title}</title>
    <desc id="heart-medical-desc">{diagram.description}</desc>
    <defs>
      <clipPath id={clipID}><ellipse cx={spotX} cy={spotY} rx={spotWidth} ry={spotHeight} /></clipPath>
      <filter id="heart-spot-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="8" floodColor="#542f2b" floodOpacity=".12" /></filter>
    </defs>
    <rect className="heart-medical-paper" width="560" height="610" />
    <image className="heart-medical-base" href="/media/heart-servier.png" x="30" y="0" width="500" height="1011" />
    <image className="heart-medical-focus" href="/media/heart-servier.png" x="30" y="0" width="500" height="1011" clipPath={`url(#${clipID})`} />
    <ellipse className="heart-focus-ring" cx={spotX} cy={spotY} rx={spotWidth} ry={spotHeight} />
    <g className={`heart-flow ${visual.tone}`} aria-hidden="true">
      <path className="heart-flow-halo" d={visual.path} />
      <path className="heart-flow-line" d={visual.path} />
      <circle className="heart-flow-dot" r="6"><animateMotion path={visual.path} dur={visual.duration} repeatCount="indefinite" /></circle>
      <circle className="heart-flow-dot heart-flow-dot-small" r="4"><animateMotion path={visual.path} dur={visual.duration} begin="-.8s" repeatCount="indefinite" /></circle>
      <path className="heart-label-line" d={visual.label.line} />
      <circle className="heart-label-dot" cx={visual.path.match(/[-\d.]+/g)?.slice(-2)[0]} cy={visual.path.match(/[-\d.]+/g)?.slice(-2)[1]} r="4" />
      <rect className="heart-label-bg" x={visual.label.x} y={visual.label.y} width={visual.label.width} height="34" rx="4" />
      <text className="heart-label-text" x={visual.label.textX} y={visual.label.textY} textAnchor="middle">{visual.label.text}</text>
    </g>
    {Object.entries(heartPartSpots).map(([id, [cx, cy, rx, ry]]) => {
      const part = parts[id];
      return <g key={id} role="button" tabIndex="0" aria-label={`${part.label}：${part.summary}`} aria-pressed={activePart === id}
        className={`heart-part-spot${activePart === id ? " active" : ""}`} onClick={() => onPart(id)}
        onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPart(id); } }}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
      </g>;
    })}
    <text className="heart-orientation" x="18" y="27"><tspan x="18">正面剖视图</tspan><tspan x="18" dy="17">图像左侧对应身体右侧</tspan></text>
    <text className="heart-stage-number" x="536" y="42" textAnchor="end">{String(activeStep + 1).padStart(2, "0")}</text>
  </svg>;
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
  if (learning.type === "heart-flow-v1") {
    return <HeartMedicalArtwork learning={learning} activePart={activePart} activeStep={activeStep} onPart={onPart} diagram={diagram} />;
  }
  const titleID = `${learning.type}-title`;
  const descriptionID = `${learning.type}-desc`;
  return <svg className={`learning-diagram ${learning.type}`} viewBox="0 0 620 430" role="img" aria-labelledby={`${titleID} ${descriptionID}`}>
    <title id={titleID}>{diagram.title}</title>
    <desc id={descriptionID}>{diagram.description}</desc>
    <DiagramDefs />
    <LungArtwork learning={learning} activePart={activePart} activeStep={activeStep} onPart={onPart} diagram={diagram} />
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
        {diagram.attribution && <p className="learning-attribution">医学底图：<a href={diagram.attribution.url} target="_blank" rel="noreferrer">{diagram.attribution.name}</a>，<a href={diagram.attribution.licenseUrl} target="_blank" rel="noreferrer">{diagram.attribution.license}</a>。</p>}
        <div className="learning-route" aria-label="选择讲解步骤">
          {learning.steps.map((item, index) => <button key={item.id} type="button" className={step === index && !part ? "active" : ""}
            aria-current={step === index && !part ? "step" : undefined} onClick={() => move(index)}>{index + 1}</button>)}
        </div>
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
