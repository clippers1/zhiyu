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
    title: "空气进入肺泡并与毛细血管交换气体的医学图解",
    description: "以肺和肺泡医学插图为底图，标出空气经气管和支气管到达肺泡，以及氧气和二氧化碳的交换方向。",
    paths: {
      "air-trachea": ["M142 43 C165 43 183 59 190 84", "flow-air"],
      "trachea-bronchi": ["M190 92 C190 126 190 150 190 176", "flow-air"],
      "bronchi-alveoli": ["M203 180 C295 194 351 165 421 142", "flow-air"],
      "alveoli-capillaries": ["M485 202 C520 224 542 258 548 302", "flow-oxygen"],
      "capillaries-alveoli": ["M552 306 C524 278 505 240 490 207", "flow-carbon"],
      "alveoli-air": ["M433 128 C337 58 235 36 142 43", "flow-carbon"],
    },
    legend: [{ className: "legend-air", label: "空气沿气道移动" }, { className: "legend-blue", label: "氧气进入血液" }, { className: "legend-carbon", label: "二氧化碳进入肺泡并呼出" }],
    attributions: [
      { name: "肺", url: "https://smart.servier.com/smart_image/lungs-11/" },
      { name: "肺泡与毛细血管", url: "https://smart.servier.com/smart_image/intrapulmonary-airways-lungs/" },
    ],
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
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

const lungPartSpots = {
  "nose-mouth": { shape: "rect", values: [18, 17, 126, 50], label: [81, 48] },
  trachea: { shape: "ellipse", values: [190, 112, 24, 55], label: [190, 72] },
  bronchi: { shape: "ellipse", values: [190, 184, 69, 47], label: [190, 226] },
  alveoli: { shape: "ellipse", values: [478, 166, 91, 91], label: [478, 78] },
  capillaries: { shape: "ellipse", values: [548, 309, 91, 69], label: [548, 389] },
};

function LungPartSpot({ part, spot, selected, pressed, onPart }) {
  const common = {
    className: "lung-medical-spot-shape",
  };
  return <g role="button" tabIndex="0" aria-label={`${part.label}：${part.summary}`} aria-pressed={pressed}
    className={`lung-medical-spot lung-medical-spot-${part.id}${selected ? " active" : ""}`} onClick={() => onPart(part.id)}
    onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPart(part.id); } }}>
    {spot.shape === "rect"
      ? <rect {...common} x={spot.values[0]} y={spot.values[1]} width={spot.values[2]} height={spot.values[3]} rx="6" />
      : <ellipse {...common} cx={spot.values[0]} cy={spot.values[1]} rx={spot.values[2]} ry={spot.values[3]} />}
    <text className="lung-medical-label" x={spot.label[0]} y={spot.label[1]} textAnchor="middle">{part.label}</text>
  </g>;
}

function LungMedicalArtwork({ learning, activePart, activeStep, onPart, diagram }) {
  const parts = Object.fromEntries(learning.parts.map(part => [part.id, part]));
  const active = learning.steps[activeStep];
  const selected = id => activePart === id || active?.from === id || active?.to === id;
  return <svg className="learning-diagram lung-medical-diagram" viewBox="0 0 700 430" role="img" aria-labelledby="lung-medical-title lung-medical-desc">
    <title id="lung-medical-title">{diagram.title}</title>
    <desc id="lung-medical-desc">{diagram.description}</desc>
    <DiagramDefs />
    <rect className="lung-medical-paper" width="700" height="430" />
    <image className="lung-medical-image lung-medical-lungs" href="/media/lung-servier.png" x="46" y="73" width="285" height="254" />
    <image className="lung-medical-image lung-medical-alveoli" href="/media/alveoli-servier.png" x="394" y="29" width="258" height="351" />
    <path className="lung-medical-connector" d="M300 204 C339 204 361 190 397 169" />
    <text className="lung-medical-panel-label" x="188" y="362" textAnchor="middle">肺与气道</text>
    <text className="lung-medical-panel-label" x="523" y="405" textAnchor="middle">肺泡与毛细血管 · 放大示意</text>
    <FlowPaths learning={learning} activeStep={activeStep} diagram={diagram} />
    {Object.entries(lungPartSpots).map(([id, spot]) => <LungPartSpot key={id} part={parts[id]} spot={spot}
      selected={selected(id)} pressed={activePart === id} onPart={onPart} />)}
    <text className="heart-stage-number" x="674" y="42" textAnchor="end">{String(activeStep + 1).padStart(2, "0")}</text>
  </svg>;
}

function LearningDiagram({ learning, activePart, activeStep, onPart }) {
  const diagram = diagrams[learning.type];
  if (learning.type === "heart-flow-v1") {
    return <HeartMedicalArtwork learning={learning} activePart={activePart} activeStep={activeStep} onPart={onPart} diagram={diagram} />;
  }
  return <LungMedicalArtwork learning={learning} activePart={activePart} activeStep={activeStep} onPart={onPart} diagram={diagram} />;
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
        {diagram.attributions && <p className="learning-attribution">医学底图：Servier Medical Art by Servier（{diagram.attributions.map((item, index) => <React.Fragment key={item.url}>{index > 0 && "、"}<a href={item.url} target="_blank" rel="noreferrer">{item.name}</a></React.Fragment>)}），<a href={diagram.licenseUrl} target="_blank" rel="noreferrer">{diagram.license}</a>。</p>}
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
