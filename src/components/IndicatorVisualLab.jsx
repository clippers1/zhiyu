import React, { useState } from "react";
import { Activity, Layers, SlidersHorizontal } from "lucide-react";
import { Citation } from "./ContentUI";
import "./indicator-visual-lab.css";

/* -------------------------------------------------------------------------- */
/* 1. ECG Interactive P-QRS-T Waveform + Cardiac Conduction Explorer          */
/* -------------------------------------------------------------------------- */
const ECG_WAVES = [
  {
    id: "p",
    label: "P 波",
    short: "心房激动",
    part: "sa-atria",
    xRange: [92, 146],
    summary: "右心房上部的窦房结发出微弱电脉冲并传遍左右心房，触发心房轻轻收缩、把血液送入心室。每个正常波形前都有规整的 P 波，就是报告上「窦性心律」的电信号标志。",
    sourceIds: ["ecg-ency", "arrhythmias"],
  },
  {
    id: "pr",
    label: "PR 段",
    short: "房室缓冲",
    part: "av-node",
    xRange: [146, 186],
    summary: "电信号在心房与心室之间的「房室结」短暂放慢约零点几秒，让心房先把血液充分推入心室，随后再统一启动心室泵血，保证上下腔室接力不打架。",
    sourceIds: ["ecg-ency"],
  },
  {
    id: "qrs",
    label: "QRS 波群",
    short: "心室收缩",
    part: "ventricles",
    xRange: [186, 242],
    summary: "电信号沿心室传导束迅速传遍左右心室肌，引发最强有力的一次泵血收缩，因此在心电图纸上画出一记高而尖锐的折线峰。",
    sourceIds: ["ecg-ency"],
  },
  {
    id: "st",
    label: "ST 段",
    short: "心室平台期",
    part: "myocardium",
    xRange: [242, 316],
    summary: "心室肌完成激动后进入短暂的电信号平衡平台。体检心电图机常自动打印「非特异性 ST-T 改变」，可能受心率、导联位置、紧张或供血等多种因素影响，必须由医生核对原图与症状。",
    sourceIds: ["ecg-ency", "heart-tests"],
  },
  {
    id: "t",
    label: "T 波",
    short: "心室恢复",
    part: "recovery",
    xRange: [316, 404],
    summary: "心室心肌电活动重新恢复到静息准备状态，等待窦房结发出下一拍指令。T 波与 ST 段合称心室复极段，医生常结合既往图纸前后对比形态变化。",
    sourceIds: ["ecg-ency", "arrhythmias-diag"],
  },
];

const ECG_MODES = [
  {
    id: "sinus",
    label: "正常窦性节律",
    note: "每次搏动都由窦房结按较均匀间隔发起，P-QRS-T 顺序完整规整——「窦性心律」是健康基础节律，不是病名。",
    path: "M16 96 L56 96 Q68 80 80 96 L104 96 L112 106 L124 30 L135 114 L144 96 L174 96 Q192 70 212 96 L248 96 Q260 80 272 96 L296 96 L304 106 L316 30 L327 114 L336 96 L366 96 Q384 70 404 96 L440 96 Q452 80 464 96 L488 96 L496 106 L508 30 L519 114 L528 96 L558 96 Q576 70 596 96 L628 96",
    highlight: null,
  },
  {
    id: "arrhythmia",
    label: "窦性心律不齐（呼吸起伏）",
    note: "起搏点仍是正常窦房结，只是相邻两拍间距随呼吸自然一紧一松（吸气略快、呼气略慢），在年轻人群中十分常见。",
    path: "M16 96 L44 96 Q56 80 68 96 L90 96 L98 106 L110 30 L121 114 L130 96 L158 96 Q176 70 196 96 L214 96 Q226 80 238 96 L260 96 L268 106 L280 30 L291 114 L300 96 L328 96 Q346 70 366 96 L432 96 Q444 80 456 96 L478 96 L486 106 L498 30 L509 114 L518 96 L546 96 Q564 70 584 96 L628 96",
    highlight: { x1: 110, x2: 280, x3: 498, label1: "吸气时略紧", label2: "呼气时略舒缓" },
  },
  {
    id: "premature",
    label: "偶发早搏（提前抢拍）",
    note: "窦房结还没到下一拍时间，心房或心室某处提前发令抢跳一拍，随后往往跟着一小段代偿停顿，有人会感觉胸口「咯噔」一下。",
    path: "M16 96 L54 96 Q66 80 78 96 L102 96 L110 106 L122 30 L133 114 L142 96 L172 96 Q190 70 210 96 L236 96 L246 112 L262 24 L278 126 L292 96 Q312 114 334 96 L442 96 Q454 80 466 96 L490 96 L498 106 L510 30 L521 114 L530 96 L560 96 Q578 70 598 96 L628 96",
    highlight: { prematureX: 262, pauseX1: 336, pauseX2: 440 },
  },
];

function EcgWaveformLab({ detail }) {
  const [waveId, setWaveId] = useState("qrs");
  const [rhythmId, setRhythmId] = useState("sinus");
  const wave = ECG_WAVES.find((w) => w.id === waveId) || ECG_WAVES[2];
  const rhythm = ECG_MODES.find((m) => m.id === rhythmId) || ECG_MODES[0];

  return (
    <div className="vlab-body">
      <div className="vlab-split ecg-split">
        {/* Main clickable single-beat P-QRS-T anatomy diagram */}
        <div className="vlab-canvas-card">
          <div className="vlab-subhead">
            <span>单次心跳波形拆解（点击波段高亮对应心脏电路）</span>
          </div>
          <svg className="vlab-svg" viewBox="0 0 460 190" role="img" aria-label="单次心电图 P-QRS-T 波段拆解示意图">
            <defs>
              <pattern id="ecg-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0 L0 0 0 20" fill="none" stroke="#dbece9" strokeWidth="0.9" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="460" height="190" rx="12" fill="#f7fbfb" />
            <rect x="10" y="10" width="440" height="170" rx="8" fill="url(#ecg-grid)" />
            {/* Baseline */}
            <line x1="20" y1="126" x2="440" y2="126" stroke="#b9d6d2" strokeWidth="1" strokeDasharray="4 4" />
            {/* Active segment highlight band */}
            <rect
              x={wave.xRange[0]}
              y="18"
              width={wave.xRange[1] - wave.xRange[0]}
              height="148"
              rx="8"
              fill="#0f766e"
              fillOpacity="0.11"
              stroke="#0f766e"
              strokeOpacity="0.32"
              strokeDasharray="4 3"
            />
            {/* Full muted wave */}
            <path
              d="M24 126 L92 126 Q119 94 146 126 L186 126 L198 142 L214 28 L230 156 L242 126 L316 126 Q358 78 404 126 L438 126"
              fill="none"
              stroke="#7ca6a1"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Individual clickable wave paths */}
            <path
              d="M92 126 Q119 94 146 126"
              className={`ecg-seg${waveId === "p" ? " active" : ""}`}
              onClick={() => setWaveId("p")}
            />
            <path
              d="M146 126 L186 126"
              className={`ecg-seg${waveId === "pr" ? " active" : ""}`}
              onClick={() => setWaveId("pr")}
            />
            <path
              d="M186 126 L198 142 L214 28 L230 156 L242 126"
              className={`ecg-seg${waveId === "qrs" ? " active" : ""}`}
              onClick={() => setWaveId("qrs")}
            />
            <path
              d="M242 126 L316 126"
              className={`ecg-seg${waveId === "st" ? " active" : ""}`}
              onClick={() => setWaveId("st")}
            />
            <path
              d="M316 126 Q358 78 404 126"
              className={`ecg-seg${waveId === "t" ? " active" : ""}`}
              onClick={() => setWaveId("t")}
            />
            {/* Labels */}
            {[
              { id: "p", x: 119, y: 84, text: "P 波" },
              { id: "pr", x: 166, y: 150, text: "PR" },
              { id: "qrs", x: 214, y: 175, text: "QRS 波群" },
              { id: "st", x: 279, y: 150, text: "ST 段" },
              { id: "t", x: 358, y: 74, text: "T 波" },
            ].map((lbl) => (
              <text
                key={lbl.id}
                x={lbl.x}
                y={lbl.y}
                textAnchor="middle"
                className={`vlab-svg-label clickable${waveId === lbl.id ? " active" : ""}`}
                onClick={() => setWaveId(lbl.id)}
              >
                {lbl.text}
              </text>
            ))}
          </svg>

          <div className="vlab-pills" role="group" aria-label="选择心电图波段">
            {ECG_WAVES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={waveId === item.id ? "active" : ""}
                aria-pressed={waveId === item.id}
                onClick={() => setWaveId(item.id)}
              >
                <b>{item.label}</b>
                <span>{item.short}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Synced minimalist heart electrical conduction map */}
        <div className="vlab-canvas-card ecg-conduction-card">
          <div className="vlab-subhead">
            <span>心脏电路同步位置</span>
          </div>
          <svg className="vlab-svg" viewBox="0 0 210 190" role="img" aria-label="心脏电传导系统同步位置图">
            {/* Soft minimalist heart silhouette */}
            <path
              d="M105 168 C58 142 36 106 38 72 C40 42 66 28 88 38 C96 42 102 48 105 54 C108 48 114 42 122 38 C144 28 170 42 172 72 C174 106 152 142 105 168 Z"
              fill={waveId === "t" ? "#fef3eb" : "#eef6f5"}
              stroke={waveId === "t" ? "#cf7f32" : "#95bdb8"}
              strokeWidth="2.2"
            />
            {/* Septum + chambers subtle guide */}
            <path d="M105 56 L105 156" fill="none" stroke="#c8dedb" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M46 86 Q105 94 164 86" fill="none" stroke="#c8dedb" strokeWidth="1.5" strokeDasharray="3 3" />

            {/* Atrial conduction arcs (P wave) */}
            <path
              d="M72 56 Q88 64 100 84 M72 56 Q102 54 134 66"
              fill="none"
              stroke={waveId === "p" ? "#0f766e" : "#b8d0cd"}
              strokeWidth={waveId === "p" ? "3.5" : "2"}
              strokeLinecap="round"
            />
            {/* SA node */}
            <circle
              cx="72"
              cy="56"
              r={waveId === "p" ? "10" : "6.5"}
              fill={waveId === "p" ? "#0f766e" : "#89b2ad"}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text x="58" y="42" className={`vlab-mini-tag${waveId === "p" ? " active" : ""}`}>窦房结</text>

            {/* AV node (PR) */}
            <circle
              cx="101"
              cy="87"
              r={waveId === "pr" ? "9.5" : "6"}
              fill={waveId === "pr" ? "#3b76a3" : "#9cb8c9"}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text x="114" y="84" className={`vlab-mini-tag${waveId === "pr" ? " active" : ""}`}>房室结</text>

            {/* Bundle branches + Purkinje fibers (QRS) */}
            <path
              d="M101 93 L105 124 M105 124 L74 136 L60 108 M105 124 L138 136 L152 106"
              fill="none"
              stroke={waveId === "qrs" ? "#cf564e" : "#c5a9a7"}
              strokeWidth={waveId === "qrs" ? "3.8" : "2"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* ST plateau / T recovery halo */}
            {(waveId === "st" || waveId === "t") && (
              <ellipse
                cx="105"
                cy="122"
                rx="46"
                ry="30"
                fill={waveId === "st" ? "#0f766e" : "#cf7f32"}
                fillOpacity="0.16"
                stroke={waveId === "st" ? "#0f766e" : "#cf7f32"}
                strokeWidth="2"
                strokeDasharray="5 3"
              />
            )}
            <text x="105" y="182" textAnchor="middle" className="vlab-mini-tag active">
              当前高亮：{wave.label} · {wave.short}
            </text>
          </svg>
        </div>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{wave.label} · {wave.short}</span>
        <p>
          {wave.summary}
          <Citation ids={wave.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>

      {/* Rhythm strip comparator (Sinus vs Sinus Arrhythmia vs Premature Beat) */}
      <div className="vlab-strip-box">
        <div className="vlab-strip-head">
          <span>常见报告节律术语对照（概念示意）</span>
          <div className="vlab-mode-tabs" role="group" aria-label="切换心律模式">
            {ECG_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={rhythmId === m.id ? "active" : ""}
                aria-pressed={rhythmId === m.id}
                onClick={() => setRhythmId(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <svg className="vlab-svg ecg-strip-svg" viewBox="0 0 640 144" role="img" aria-label={`心电图节律概念示意：${rhythm.label}`}>
          <rect x="0" y="0" width="640" height="144" rx="10" fill="#f7fbfb" />
          <path d="M0 36 H640 M0 72 H640 M0 108 H640" stroke="#e2efed" strokeWidth="1" />
          <path
            d={rhythm.path}
            fill="none"
            stroke="#0f766e"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {rhythmId === "arrhythmia" && (
            <>
              <line x1="110" y1="22" x2="280" y2="22" stroke="#3b76a3" strokeWidth="2" />
              <text x="195" y="16" textAnchor="middle" className="vlab-mini-tag active">间距略短（吸气）</text>
              <line x1="280" y1="22" x2="498" y2="22" stroke="#cf7f32" strokeWidth="2" />
              <text x="389" y="16" textAnchor="middle" className="vlab-mini-tag active">间距略长（呼气）</text>
            </>
          )}
          {rhythmId === "premature" && (
            <>
              <circle cx="262" cy="24" r="7" fill="#cf564e" fillOpacity="0.24" stroke="#cf564e" strokeWidth="2" />
              <text x="262" y="14" textAnchor="middle" className="vlab-mini-tag warn">提前抢拍（早搏）</text>
              <rect x="336" y="84" width="104" height="24" rx="6" fill="#cf7f32" fillOpacity="0.12" stroke="#cf7f32" strokeDasharray="3 3" />
              <text x="388" y="128" textAnchor="middle" className="vlab-mini-tag">随后一小段停顿</text>
            </>
          )}
        </svg>
        <p className="vlab-strip-note">{rhythm.note}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Blood Pressure Interactive Systolic / Diastolic Pulse Cycle Lab         */
/* -------------------------------------------------------------------------- */
const BP_MODES = [
  {
    id: "systolic",
    label: "收缩压（高压）",
    tag: "心脏收缩泵血峰值",
    summary: "心脏有力收缩、把血液推入动脉的瞬间，弹性动脉壁被迅速撑开，动脉内达到这一次心跳周期里的较高压力，就是报告上靠前或偏上的「收缩压」。",
    sourceIds: ["bp"],
  },
  {
    id: "diastolic",
    label: "舒张压（低压）",
    tag: "心室舒张期动脉底压",
    summary: "心脏在两次跳动之间放松充盈时，动脉壁靠自身弹性温和回缩，继续推着血液向前走，因此血管内压力并不会跌到零——此时维持的较低压力就是「舒张压」。",
    sourceIds: ["bp", "who"],
  },
  {
    id: "factors",
    label: "血管阻力与水盐容量",
    tag: "不止由心脏决定",
    summary: "血压受「心脏泵血量 + 动脉口径与弹性阻力 + 肾脏调节的水盐血量」三方共同决定。刚活动、紧张或姿势不对都会带来短暂波动，因此规范静坐的多次读数更有参考价值。",
    sourceIds: ["who", "kidney", "bp"],
  },
];

function PressurePulseLab({ detail }) {
  const [modeId, setModeId] = useState("systolic");
  const mode = BP_MODES.find((m) => m.id === modeId) || BP_MODES[0];
  const expanded = modeId === "systolic";

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换血压机制观察点">
        {BP_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={modeId === m.id ? "active" : ""}
            aria-pressed={modeId === m.id}
            onClick={() => setModeId(m.id)}
          >
            <b>{m.label}</b>
            <span>{m.tag}</span>
          </button>
        ))}
      </div>

      <svg className="vlab-svg" viewBox="0 0 640 206" role="img" aria-label="收缩压与舒张压动脉搏动原理示意图">
        <rect x="0" y="0" width="640" height="206" rx="12" fill="#f7fbfb" />
        {/* Left: elastic artery cross-section responding to systolic vs diastolic */}
        <text x="148" y="26" textAnchor="middle" className="vlab-mini-tag active">
          动脉血管壁形态（{expanded ? "收缩期：血浪撑开" : modeId === "diastolic" ? "舒张期：弹性回缩" : "口径阻力影响压力"}）
        </text>
        <rect
          x="32"
          y={expanded ? 54 : 68}
          width="232"
          height={expanded ? 92 : 64}
          rx={expanded ? 46 : 32}
          fill={expanded ? "#fae8e6" : "#e8f3f5"}
          stroke={expanded ? "#cf564e" : "#3b76a3"}
          strokeWidth={modeId === "factors" ? "7" : "4"}
        />
        {/* Pressure arrows */}
        {expanded ? (
          <g stroke="#cf564e" strokeWidth="2.4" strokeLinecap="round">
            <path d="M110 100 L110 68 M104 75 L110 68 L116 75" />
            <path d="M110 100 L110 132 M104 125 L110 132 L116 125" />
            <path d="M186 100 L186 68 M180 75 L186 68 L192 75" />
            <path d="M186 100 L186 132 M180 125 L186 132 L192 125" />
          </g>
        ) : (
          <g stroke="#3b76a3" strokeWidth="2.2" strokeLinecap="round">
            <path d="M72 100 L224 100 M216 94 L224 100 L216 106" />
          </g>
        )}
        <text x="148" y="176" textAnchor="middle" className="vlab-mini-tag">
          {modeId === "factors" ? "管腔阻力增高或血容量增加 → 管壁承压升高" : "两次心跳之间，血管内始终保持基础压力"}
        </text>

        {/* Right: pressure pulse waveform */}
        <line x1="308" y1="168" x2="612" y2="168" stroke="#c3d9dc" strokeWidth="1.5" />
        <text x="312" y="186" className="vlab-mini-tag">零压力基准（活体动脉中不会降到零）</text>
        {/* Peak & trough guide lines */}
        <line x1="308" y1="54" x2="612" y2="54" stroke="#cf564e" strokeOpacity={modeId === "systolic" ? "0.7" : "0.25"} strokeDasharray="4 4" />
        <line x1="308" y1="128" x2="612" y2="128" stroke="#3b76a3" strokeOpacity={modeId === "diastolic" ? "0.75" : "0.28"} strokeDasharray="4 4" />
        <path
          d="M312 128 C332 128 344 54 366 54 C388 54 398 102 414 96 C430 92 444 128 468 128 C488 128 500 54 522 54 C544 54 554 102 570 96 C586 92 596 126 610 128"
          fill="none"
          stroke="#0f766e"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="366" cy="54" r={modeId === "systolic" ? "8" : "5"} fill="#cf564e" stroke="#ffffff" strokeWidth="2" />
        <text x="366" y="40" textAnchor="middle" className={`vlab-mini-tag${modeId === "systolic" ? " warn" : ""}`}>收缩压（峰）</text>
        <circle cx="468" cy="128" r={modeId === "diastolic" ? "8" : "5"} fill="#3b76a3" stroke="#ffffff" strokeWidth="2" />
        <text x="468" y="148" textAnchor="middle" className={`vlab-mini-tag${modeId === "diastolic" ? " active" : ""}`}>舒张压（谷）</text>
      </svg>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{mode.label} · {mode.tag}</span>
        <p>
          {mode.summary}
          <Citation ids={mode.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Lipids Bidirectional Transport Lab (LDL vs HDL vs TG)                   */
/* -------------------------------------------------------------------------- */
const LIPID_MODES = [
  {
    id: "all",
    label: "全部车队对照",
    tag: "不同方向各有分工",
    summary: "胆固醇和甘油三酯不溶于水，必须装进不同密度的脂蛋白「运输车」随血流动。总胆固醇（TC）是所有车队携带胆固醇的总和，因此只看总数看不清方向。",
    sourceIds: ["chol", "lipids"],
  },
  {
    id: "ldl",
    label: "LDL-C（向外运送）",
    tag: "过剩易滞留管壁",
    summary: "低密度脂蛋白（LDL）负责把胆固醇从肝脏运往全身组织参与细胞膜构建；但血液里数量过多时，容易在动脉内壁逐渐沉积形成斑块，因此医生高度关注 LDL-C。",
    sourceIds: ["chol", "lipids"],
  },
  {
    id: "hdl",
    label: "HDL-C（逆向清运）",
    tag: "回收送回肝脏处理",
    summary: "高密度脂蛋白（HDL）参与把外周多余的胆固醇逆向运回肝脏代谢清除。但它不是「越高越保险」，解读时仍需结合 LDL-C、甘油三酯和整体心血管背景。",
    sourceIds: ["chol"],
  },
  {
    id: "tg",
    label: "甘油三酯（TG）",
    tag: "储能燃料 · 餐后易波动",
    summary: "甘油三酯是身体的能量储备形式，与胆固醇的「建材」角色不同。它对近期饮食、饮酒、体重和是否空腹非常敏感，一顿大餐后读数就可能明显起伏。",
    sourceIds: ["lipids"],
  },
];

function LipidsTransportLab({ detail }) {
  const [modeId, setModeId] = useState("all");
  const mode = LIPID_MODES.find((m) => m.id === modeId) || LIPID_MODES[0];
  const dim = (target) => (modeId === "all" || modeId === target ? 1 : 0.2);

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择脂蛋白运输类型">
        {LIPID_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={modeId === m.id ? "active" : ""}
            aria-pressed={modeId === m.id}
            onClick={() => setModeId(m.id)}
          >
            <b>{m.label}</b>
            <span>{m.tag}</span>
          </button>
        ))}
      </div>

      <svg className="vlab-svg" viewBox="0 0 640 220" role="img" aria-label="LDL、HDL 与甘油三酯在肝脏与外周组织之间的运输方向图">
        <rect x="0" y="0" width="640" height="220" rx="12" fill="#f7fbfb" />
        {/* Left: Liver hub */}
        <rect x="20" y="34" width="114" height="152" rx="16" fill="#fbece6" stroke="#d07d65" strokeWidth="2" />
        <text x="77" y="102" textAnchor="middle" className="vlab-box-title">肝脏</text>
        <text x="77" y="124" textAnchor="middle" className="vlab-mini-tag">装配 · 调度 · 清除</text>

        {/* Right: Peripheral cells */}
        <rect x="506" y="34" width="114" height="152" rx="16" fill="#eaf5f3" stroke="#0f766e" strokeWidth="2" />
        <text x="563" y="102" textAnchor="middle" className="vlab-box-title">外周组织</text>
        <text x="563" y="124" textAnchor="middle" className="vlab-mini-tag">细胞膜 · 能量储存</text>

        {/* Center bloodstream channel */}
        <rect x="148" y="30" width="344" height="160" rx="14" fill="#ffffff" stroke="#d5e4e8" strokeWidth="1.6" />

        {/* Lane 1: LDL Liver -> Tissue */}
        <g opacity={dim("ldl")}>
          <path d="M168 68 L472 68" stroke="#cf564e" strokeWidth="3.5" strokeDasharray="8 6" className="vlab-dash-right" />
          <path d="M464 61 L476 68 L464 75" fill="none" stroke="#cf564e" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="240" cy="68" r="11" fill="#cf564e" />
          <circle cx="348" cy="68" r="11" fill="#cf564e" />
          <text x="320" y="50" textAnchor="middle" className="vlab-mini-tag warn">LDL 运出胆固醇 → 过剩易滞留动脉壁</text>
        </g>

        {/* Lane 2: HDL Tissue -> Liver */}
        <g opacity={dim("hdl")}>
          <path d="M472 114 L168 114" stroke="#0f766e" strokeWidth="3.5" strokeDasharray="8 6" className="vlab-dash-left" />
          <path d="M176 107 L164 114 L176 121" fill="none" stroke="#0f766e" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="388" cy="114" r="9.5" fill="#0f766e" />
          <circle cx="272" cy="114" r="9.5" fill="#0f766e" />
          <text x="320" y="100" textAnchor="middle" className="vlab-mini-tag active">← HDL 逆向回收多余胆固醇回肝脏</text>
        </g>

        {/* Lane 3: TG Energy delivery */}
        <g opacity={dim("tg")}>
          <path d="M168 160 L472 160" stroke="#cf7f32" strokeWidth="3.5" strokeDasharray="6 6" className="vlab-dash-right" />
          <path d="M464 153 L476 160 L464 167" fill="none" stroke="#cf7f32" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="288" y="150" width="24" height="20" rx="6" fill="#cf7f32" />
          <text x="320" y="146" textAnchor="middle" className="vlab-mini-tag">甘油三酯（TG）供能与储能 → 受饮食影响快</text>
        </g>
      </svg>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{mode.label} · {mode.tag}</span>
        <p>
          {mode.summary}
          <Citation ids={mode.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Liver Function 3-Family Lab Map (Enzymes / Bilirubin-Bile / Protein)    */
/* -------------------------------------------------------------------------- */
const LIVER_FAMILIES = [
  {
    id: "enzymes",
    label: "肝细胞内的酶",
    code: "ALT / AST",
    tag: "反映细胞是否受影响",
    summary: "ALT 和 AST 平时主要待在肝细胞内部加速化学反应；当肝细胞膜受炎症、脂肪堆积、药物或剧烈运动影响时，这些酶会释放进入血液。单看某一个酶无法直接定因，需要结合整组模式与病史。",
    sourceIds: ["liver-tests"],
  },
  {
    id: "bile",
    label: "胆红素与胆汁通路",
    code: "TBIL / ALP / GGT",
    tag: "反映加工与排泄通畅度",
    summary: "衰老红细胞分解产生胆红素，经肝脏加工后随胆汁排入肠道；ALP、GGT 也与胆道排泄密切相关。这一路的变化可能来自肝脏加工、胆道排泄受阻，也可能来自红细胞分解增多。",
    sourceIds: ["liver-tests", "liver", "hemoglobin"],
  },
  {
    id: "protein",
    label: "肝脏合成蛋白质",
    code: "白蛋白 ALB / 总蛋白",
    tag: "反映持续合成能力",
    summary: "白蛋白由肝脏持续制造并送入血液，是观察肝脏合成储备的重要侧面；总蛋白还包含主要由免疫系统产生的球蛋白。白蛋白也会受营养与体液分布影响，需多项对照。",
    sourceIds: ["liver-tests"],
  },
];

function LiverPanelLab({ detail }) {
  const [familyId, setFamilyId] = useState("enzymes");
  const family = LIVER_FAMILIES.find((f) => f.id === familyId) || LIVER_FAMILIES[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择肝功能项目组">
        {LIVER_FAMILIES.map((f) => (
          <button
            key={f.id}
            type="button"
            className={familyId === f.id ? "active" : ""}
            aria-pressed={familyId === f.id}
            onClick={() => setFamilyId(f.id)}
          >
            <b>{f.label}</b>
            <span>{f.code}</span>
          </button>
        ))}
      </div>

      <svg className="vlab-svg" viewBox="0 0 640 210" role="img" aria-label="肝功能三类指标分工解剖关系图">
        <rect x="0" y="0" width="640" height="210" rx="12" fill="#f7fbfb" />
        {/* 3 interactive functional columns inside liver lobule -> blood draw */}
        {[
          { id: "enzymes", x: 24, title: "肝细胞内部", sub: "ALT · AST", note: "细胞受影响时释放入血", fill: "#fbece6", stroke: "#cf564e" },
          { id: "bile", x: 224, title: "胆红素与胆道", sub: "TBIL · ALP · GGT", note: "代谢加工与胆汁排泄", fill: "#fcf3e3", stroke: "#cf7f32" },
          { id: "protein", x: 424, title: "蛋白合成工厂", sub: "白蛋白 · 总蛋白", note: "持续合成输出至血液", fill: "#e8f4f2", stroke: "#0f766e" },
        ].map((card) => {
          const active = familyId === card.id;
          return (
            <g
              key={card.id}
              className="vlab-click-group"
              role="button"
              tabIndex="0"
              aria-pressed={active}
              onClick={() => setFamilyId(card.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFamilyId(card.id); } }}
            >
              <rect
                x={card.x}
                y="22"
                width="192"
                height="112"
                rx="14"
                fill={active ? card.fill : "#ffffff"}
                stroke={active ? card.stroke : "#d3e2e6"}
                strokeWidth={active ? "2.6" : "1.5"}
              />
              <text x={card.x + 96} y="54" textAnchor="middle" className="vlab-box-title">{card.title}</text>
              <text x={card.x + 96} y="78" textAnchor="middle" className="vlab-mini-tag active">{card.sub}</text>
              <text x={card.x + 96} y="106" textAnchor="middle" className="vlab-mini-tag">{card.note}</text>
              <path
                d={`M${card.x + 96} 134 L${card.x + 96} 160`}
                stroke={active ? card.stroke : "#c4d7dc"}
                strokeWidth={active ? "3" : "1.6"}
                strokeDasharray={active ? "5 3" : "none"}
              />
            </g>
          );
        })}
        {/* Bottom unified blood tube bar */}
        <rect x="24" y="160" width="592" height="34" rx="10" fill="#eef5f7" stroke="#b9d0d6" strokeWidth="1.5" />
        <text x="320" y="182" textAnchor="middle" className="vlab-mini-tag active">
          同一管静脉血化验单 · 医生通过三组指标的「组合模式」判断方向，而非只看单一数字
        </text>
      </svg>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{family.label}（{family.code}） · {family.tag}</span>
        <p>
          {family.summary}
          <Citation ids={family.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Glucose 3-Time-Window Interactive Timeline Lab                          */
/* -------------------------------------------------------------------------- */
const GLUCOSE_WINDOWS = [
  {
    id: "fpg",
    label: "空腹血糖（FPG）",
    span: "至少 8 小时未进食 · 瞬时底片",
    summary: "空腹血糖像一张清晨「安静的底片」，反映没有新食物进入时的基础血糖水平；但它看不到吃完饭之后血糖会不会冲得太高。",
    sourceIds: ["tests"],
  },
  {
    id: "ogtt",
    label: "餐后 / OGTT",
    span: "进食或喝糖水后 · 负荷曲线",
    summary: "口服葡萄糖耐量试验（OGTT）或餐后血糖观察的是「一批糖进来之后，胰岛素和细胞处理得快不快」，回答动态调节能力问题。",
    sourceIds: ["tests", "insulin"],
  },
  {
    id: "hba1c",
    label: "糖化血红蛋白（HbA1c）",
    span: "红细胞寿命周期 · 近 2–3 个月平均",
    summary: "葡萄糖会附着在红细胞的血红蛋白上，因为红细胞在血液里存留数月，HbA1c 反映过去约 2–3 个月的平均水平，不受抽血当天早饭影响；但贫血或红细胞寿命改变可能影响读数。",
    sourceIds: ["a1c"],
  },
];

function GlucoseWindowsLab({ detail }) {
  const [winId, setWinId] = useState("hba1c");
  const win = GLUCOSE_WINDOWS.find((w) => w.id === winId) || GLUCOSE_WINDOWS[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换血糖时间窗">
        {GLUCOSE_WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            className={winId === w.id ? "active" : ""}
            aria-pressed={winId === w.id}
            onClick={() => setWinId(w.id)}
          >
            <b>{w.label}</b>
            <span>{w.span.split(" · ")[1]}</span>
          </button>
        ))}
      </div>

      <svg className="vlab-svg" viewBox="0 0 640 200" role="img" aria-label="空腹血糖、餐后负荷与糖化血红蛋白时间窗对照曲线图">
        <rect x="0" y="0" width="640" height="200" rx="12" fill="#f7fbfb" />
        {/* Axes */}
        <line x1="42" y1="164" x2="610" y2="164" stroke="#bfd4d8" strokeWidth="1.5" />
        <text x="96" y="184" textAnchor="middle" className="vlab-mini-tag">清晨空腹</text>
        <text x="236" y="184" textAnchor="middle" className="vlab-mini-tag">早餐 / 糖负荷后</text>
        <text x="406" y="184" textAnchor="middle" className="vlab-mini-tag">午餐后</text>
        <text x="546" y="184" textAnchor="middle" className="vlab-mini-tag">晚餐后</text>

        {/* HbA1c 90-day moving average band */}
        <rect
          x="42"
          y="88"
          width="568"
          height="34"
          rx="8"
          fill="#cf7f32"
          fillOpacity={winId === "hba1c" ? "0.24" : "0.08"}
          stroke="#cf7f32"
          strokeOpacity={winId === "hba1c" ? "0.75" : "0.22"}
          strokeDasharray="6 4"
        />
        <text x="598" y="34" textAnchor="end" className={`vlab-mini-tag${winId === "hba1c" ? " active" : ""}`}>
          HbA1c 反映过去 2–3 个月平均带
        </text>

        {/* Post-meal / OGTT shaded curve zone */}
        <rect
          x="156"
          y="28"
          width="156"
          height="136"
          rx="10"
          fill="#3b76a3"
          fillOpacity={winId === "ogtt" ? "0.14" : "0.03"}
          stroke="#3b76a3"
          strokeOpacity={winId === "ogtt" ? "0.65" : "0.14"}
          strokeDasharray="4 4"
        />

        {/* Daily glucose fluctuation curve */}
        <path
          d="M48 134 L126 134 C166 134 192 44 228 44 C264 44 282 124 328 124 C368 124 388 64 416 64 C448 64 468 126 502 126 C532 126 550 58 576 58 C592 58 602 98 608 118"
          fill="none"
          stroke="#0f766e"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* FPG snapshot marker */}
        <circle cx="96" cy="134" r={winId === "fpg" ? "9" : "5.5"} fill="#0f766e" stroke="#ffffff" strokeWidth="2.5" />
        <text x="96" y="116" textAnchor="middle" className={`vlab-mini-tag${winId === "fpg" ? " active" : ""}`}>
          空腹瞬时点
        </text>

        {/* OGTT peak marker */}
        <circle cx="228" cy="44" r={winId === "ogtt" ? "9" : "5.5"} fill="#3b76a3" stroke="#ffffff" strokeWidth="2.5" />
        <text x="234" y="22" textAnchor="middle" className={`vlab-mini-tag${winId === "ogtt" ? " active" : ""}`}>
          餐后 / 糖耐量波动峰
        </text>
      </svg>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{win.label} · {win.span}</span>
        <p>
          {win.summary}
          <Citation ids={win.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Thyroid & Breast Ultrasound Echo + TI-RADS / BI-RADS Literacy Lab       */
/* -------------------------------------------------------------------------- */
const ECHO_FEATURES = [
  {
    id: "cyst",
    label: "单纯囊性（液体暗区）",
    tag: "多呈光滑无回声",
    desc: "内部以清亮液体为主，在 B 超画面上呈均匀的暗色（无回声）、边界清晰光滑，绝大多数单纯囊肿属于良性常见发现。",
  },
  {
    id: "oval-solid",
    label: "规整实性（边界清晰）",
    tag: "形态圆润水平生长",
    desc: "内部由实体组织构成，但整体呈规整椭圆形、边缘清楚光滑，体检发现的多数良性增生或纤维腺瘤常具备这类外观特征。",
  },
  {
    id: "mixed",
    label: "囊实混合性",
    tag: "液实并存看组合特征",
    desc: "既有液体暗区又有实体成分，超声医生会进一步观察实性部分的边界、回声与大小，综合计入分级并记录供后续复查对照。",
  },
  {
    id: "complex",
    label: "多条可疑特征组合",
    tag: "提示进一步核查而非确诊",
    desc: "当结节同时出现边界模糊、形态不规则、明显低回声或点状强回声等特征时，分级会相应上调——用来提醒医生安排缩短复查或细针穿刺/活检核实，不等于已经确诊恶性。",
  },
];

function UltrasoundTierLab({ detail, isBreast }) {
  const [featId, setFeatId] = useState("cyst");
  const feat = ECHO_FEATURES.find((f) => f.id === featId) || ECHO_FEATURES[0];
  const systemName = isBreast ? "BI-RADS" : "TI-RADS";
  const srcIds = isBreast ? ["breast-us", "mammograms"] : ["sonogram", "nodule-ency"];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换超声形态描述词">
        {ECHO_FEATURES.map((f) => (
          <button
            key={f.id}
            type="button"
            className={featId === f.id ? "active" : ""}
            aria-pressed={featId === f.id}
            onClick={() => setFeatId(f.id)}
          >
            <b>{f.label}</b>
            <span>{f.tag}</span>
          </button>
        ))}
      </div>

      <div className="vlab-split us-split">
        {/* Stylized B-mode ultrasound viewport */}
        <div className="vlab-canvas-card us-viewport-card">
          <div className="vlab-subhead">
            <span>超声回声形态概念示意（{feat.label}）</span>
          </div>
          <svg className="vlab-svg" viewBox="0 0 320 176" role="img" aria-label={`超声形态概念示意：${feat.label}`}>
            <defs>
              <radialGradient id="us-bg" cx="50%" cy="20%" r="80%">
                <stop offset="0%" stopColor="#354854" />
                <stop offset="100%" stopColor="#1c2932" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="320" height="176" rx="12" fill="url(#us-bg)" />
            {/* Ultrasound sector fan beams */}
            <path d="M110 8 L28 168 M210 8 L292 168" stroke="#6cc5bd" strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="4 4" />
            <rect x="112" y="6" width="96" height="10" rx="5" fill="#77cfc6" />

            {featId === "cyst" && (
              <ellipse cx="160" cy="96" rx="52" ry="34" fill="#0d161c" stroke="#9be3dc" strokeWidth="2.4" />
            )}
            {featId === "oval-solid" && (
              <ellipse cx="160" cy="96" rx="54" ry="33" fill="#5e7684" stroke="#bfe8e3" strokeWidth="2.2" />
            )}
            {featId === "mixed" && (
              <g>
                <ellipse cx="160" cy="96" rx="54" ry="36" fill="#152028" stroke="#9adbd4" strokeWidth="2" />
                <path d="M114 96 C126 78 164 82 186 98 C200 108 196 126 160 130 C128 130 112 114 114 96 Z" fill="#647c8a" />
              </g>
            )}
            {featId === "complex" && (
              <g>
                <path
                  d="M160 52 C178 54 190 66 196 86 C202 104 194 126 174 136 C154 144 132 136 124 116 C118 96 126 68 144 58 Z"
                  fill="#293944"
                  stroke="#f0a875"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                />
                <circle cx="152" cy="86" r="2.8" fill="#ffffff" />
                <circle cx="168" cy="98" r="2.5" fill="#ffffff" />
                <circle cx="158" cy="108" r="2.2" fill="#ffffff" />
              </g>
            )}
            <text x="160" y="160" textAnchor="middle" fill="#cde6e4" fontSize="11.5" fontWeight="600">
              {feat.label}（非真实超声影像）
            </text>
          </svg>
        </div>

        {/* TI-RADS / BI-RADS action-oriented tier ladder */}
        <div className="vlab-canvas-card">
          <div className="vlab-subhead">
            <span>{systemName} 分类是「行动沟通语言」，不是癌症分期</span>
          </div>
          <ol className="us-tier-list">
            <li className={featId === "cyst" ? "active" : ""}>
              <b>低级别（如 1–2 类）</b>
              <span>未见异常或明确良性特征（如单纯囊肿），常规按年度体检即可。</span>
            </li>
            <li className={featId === "oval-solid" || featId === "mixed" ? "active" : ""}>
              <b>中间级（如 3 类）</b>
              <span>大概率良性，重在留存原报告、按医嘱间隔复查观察有无明显变化。</span>
            </li>
            <li className={featId === "complex" ? "active" : ""}>
              <b>较高级别（4 类及以上）</b>
              <span>提示存在可疑形态组合，需医生结合大小与{isBreast ? "钼靶等联合影像" : "甲功抽血"}评估是否穿刺活检核实，最终性质靠病理确定。</span>
            </li>
          </ol>
        </div>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{feat.label} · {systemName} 解读要点</span>
        <p>
          {feat.desc}
          <Citation ids={srcIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. CBC Three-Lineage Blood Cell Lab (RBC / WBC / PLT)                      */
/* -------------------------------------------------------------------------- */
const CBC_CELLS = [
  {
    id: "rbc",
    label: "红细胞与血红蛋白",
    code: "RBC / HGB / MCV",
    tag: "携氧运输队",
    summary: "红细胞里的血红蛋白负责把肺部吸入的氧气送往全身组织。化验单同时还会看红细胞平均体积（MCV）与压积，用来辅助判断贫血线索或体液浓缩情况。",
    sourceIds: ["cbc", "hemoglobin"],
  },
  {
    id: "wbc",
    label: "白细胞与分类",
    code: "WBC",
    tag: "免疫防御巡逻队",
    summary: "白细胞是免疫系统应对感染与炎症的主力军，下面常细分为中性粒细胞、淋巴细胞等亚群。感冒、熬夜、情绪应激或轻度炎症都可能引起短暂起伏。",
    sourceIds: ["cbc", "blood-tests"],
  },
  {
    id: "plt",
    label: "血小板",
    code: "PLT",
    tag: "血管修补止血队",
    summary: "血小板体积很小，血管壁出现微小破损时会迅速聚集参与凝血止血。单次轻度偏高或偏低可能受采样、饮水或近期感染影响，需结合整张血常规与既往记录。",
    sourceIds: ["cbc", "lab-results"],
  },
];

function CbcCellsLab({ detail }) {
  const [cellId, setCellId] = useState("rbc");
  const cell = CBC_CELLS.find((c) => c.id === cellId) || CBC_CELLS[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择血细胞类型">
        {CBC_CELLS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={cellId === c.id ? "active" : ""}
            aria-pressed={cellId === c.id}
            onClick={() => setCellId(c.id)}
          >
            <b>{c.label}</b>
            <span>{c.code}</span>
          </button>
        ))}
      </div>

      <svg className="vlab-svg" viewBox="0 0 640 206" role="img" aria-label="血常规红细胞、白细胞与血小板三系细胞分工示意图">
        <rect x="0" y="0" width="640" height="206" rx="12" fill="#f7fbfb" />
        {/* Microscopic circular blood smear viewport on left */}
        <circle cx="148" cy="103" r="82" fill="#fff8f7" stroke="#d4e3e6" strokeWidth="2.4" />
        <circle cx="148" cy="103" r="76" fill="none" stroke="#e8eff1" strokeWidth="1.2" strokeDasharray="4 4" />

        {/* RBC biconcave discs */}
        <g opacity={cellId === "rbc" ? 1 : 0.28}>
          {[[108, 76], [176, 68], [116, 134], [186, 126], [150, 102]].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="17" fill="#dc6a61" stroke="#b94840" strokeWidth="1.5" />
              <circle cx={cx} cy={cy} r="7.5" fill="#f3a69f" />
            </g>
          ))}
        </g>

        {/* WBC lobed immune cells */}
        <g opacity={cellId === "wbc" ? 1 : 0.25}>
          {[[148, 62], [156, 144]].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="20" fill="#e2eff8" stroke="#3b76a3" strokeWidth="2.2" />
              <circle cx={cx - 5} cy={cy - 2} r="5.5" fill="#4f88b5" />
              <circle cx={cx + 5} cy={cy + 3} r="5.5" fill="#4f88b5" />
              <circle cx={cx + 2} cy={cy - 6} r="4.2" fill="#4f88b5" />
            </g>
          ))}
        </g>

        {/* PLT tiny fragments */}
        <g opacity={cellId === "plt" ? 1 : 0.28}>
          {[[96, 104], [126, 98], [188, 96], [128, 158], [174, 150], [124, 56]].map(([cx, cy]) => (
            <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="6" ry="4" fill="#d99a3e" stroke="#a66f1d" strokeWidth="1.2" />
          ))}
        </g>

        {/* Right: 3 interactive lineage breakdown cards */}
        {[
          { id: "rbc", y: 20, title: "红细胞系（RBC / HGB / MCV）", sub: "数量 · 血红蛋白浓度 · 细胞大小形态", color: "#cf564e", bg: "#fdf0ee" },
          { id: "wbc", y: 80, title: "白细胞系（WBC 及分类比例）", sub: "免疫应答线索 · 易随感冒应激波动", color: "#3b76a3", bg: "#eef5fa" },
          { id: "plt", y: 140, title: "血小板系（PLT）", sub: "凝血止血修补 · 需结合多项整体看", color: "#cf7f32", bg: "#fcf4e6" },
        ].map((row) => {
          const active = cellId === row.id;
          return (
            <g
              key={row.id}
              className="vlab-click-group"
              role="button"
              tabIndex="0"
              aria-pressed={active}
              onClick={() => setCellId(row.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCellId(row.id); } }}
            >
              <rect
                x="262"
                y={row.y}
                width="354"
                height="48"
                rx="12"
                fill={active ? row.bg : "#ffffff"}
                stroke={active ? row.color : "#d4e3e6"}
                strokeWidth={active ? "2.4" : "1.4"}
              />
              <circle cx="284" cy={row.y + 24} r="7" fill={row.color} />
              <text x="302" y={row.y + 21} className="vlab-box-title" fontSize="13.5">{row.title}</text>
              <text x="302" y={row.y + 39} className="vlab-mini-tag">{row.sub}</text>
            </g>
          );
        })}
      </svg>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{cell.label}（{cell.code}） · {cell.tag}</span>
        <p>
          {cell.summary}
          <Citation ids={cell.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Urinalysis 3-Layer Inspection Lab                                       */
/* -------------------------------------------------------------------------- */
const URINE_LAYERS = [
  {
    id: "visual",
    label: "第一层：外观观察",
    tag: "颜色与清澈度",
    summary: "最直观的一层，看尿液颜色深浅和是否浑浊。喝水少、晨尿浓缩、吃特定食物或补充维生素 B 族都会让尿液明显偏黄，外观改变不一定等于肾脏生病。",
    sourceIds: ["urinalysis", "urine-color"],
  },
  {
    id: "dipstick",
    label: "第二层：试纸化学检查",
    tag: "尿蛋白 / 尿糖 / 尿潜血 / 酸碱度",
    summary: "把化学试纸浸入尿样，通过色块反应快速筛查蛋白质、葡萄糖、潜血、白细胞酯酶和比重。剧烈运动、发热、留取不规范或经期污染都可能导致单次试纸出现加号。",
    sourceIds: ["urinalysis", "protein"],
  },
  {
    id: "microscope",
    label: "第三层：显微镜沉渣检查",
    tag: "直接辨认红白细胞与管型",
    summary: "试纸只是初筛；显微镜检查会把尿液离心后放大观察，直接确认有没有真正的红细胞、白细胞、细菌、结晶或管型，帮助医生区分是假阳性干扰还是需要进一步评估。",
    sourceIds: ["urinalysis", "kidney"],
  },
];

function UrinalysisLayersLab({ detail }) {
  const [layerId, setLayerId] = useState("dipstick");
  const layer = URINE_LAYERS.find((l) => l.id === layerId) || URINE_LAYERS[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择尿常规检查层面">
        {URINE_LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={layerId === l.id ? "active" : ""}
            aria-pressed={layerId === l.id}
            onClick={() => setLayerId(l.id)}
          >
            <b>{l.label}</b>
            <span>{l.tag}</span>
          </button>
        ))}
      </div>

      <svg className="vlab-svg" viewBox="0 0 640 198" role="img" aria-label="尿常规外观、试纸化学与显微镜检查三层递进图">
        <rect x="0" y="0" width="640" height="198" rx="12" fill="#f7fbfb" />
        {[
          { id: "visual", x: 18, num: "01", title: "外观物理观察", sub: "颜色 · 透明度 · 浓缩度", note: "易受饮水与食物影响", stroke: "#cf7f32", fill: "#fcf4e6" },
          { id: "dipstick", x: 232, num: "02", title: "试纸化学初筛", sub: "蛋白 · 潜血 · 尿糖 · pH", note: "色块快速筛查，可有干扰", stroke: "#0f766e", fill: "#e8f5f3" },
          { id: "microscope", x: 446, num: "03", title: "显微镜沉渣核实", sub: "红白细胞 · 管型 · 结晶", note: "直接看清微观有形成分", stroke: "#3b76a3", fill: "#ecf4fa" },
        ].map((step, idx) => {
          const active = layerId === step.id;
          return (
            <g key={step.id}>
              {idx < 2 && (
                <path
                  d={`M${step.x + 182} 98 L${step.x + 206} 98 M${step.x + 200} 92 L${step.x + 207} 98 L${step.x + 200} 104`}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <g
                className="vlab-click-group"
                role="button"
                tabIndex="0"
                aria-pressed={active}
                onClick={() => setLayerId(step.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLayerId(step.id); } }}
              >
                <rect
                  x={step.x}
                  y="24"
                  width="176"
                  height="146"
                  rx="14"
                  fill={active ? step.fill : "#ffffff"}
                  stroke={active ? step.stroke : "#d3e2e6"}
                  strokeWidth={active ? "2.6" : "1.5"}
                />
                <rect x={step.x + 14} y="38" width="32" height="22" rx="6" fill={active ? step.stroke : "#eef4f6"} />
                <text x={step.x + 30} y="53" textAnchor="middle" fill={active ? "#ffffff" : "#4f6b70"} fontSize="11.5" fontWeight="700">{step.num}</text>
                <text x={step.x + 88} y="88" textAnchor="middle" className="vlab-box-title">{step.title}</text>
                <text x={step.x + 88} y="114" textAnchor="middle" className="vlab-mini-tag active">{step.sub}</text>
                <text x={step.x + 88} y="142" textAnchor="middle" className="vlab-mini-tag">{step.note}</text>
              </g>
            </g>
          );
        })}
      </svg>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{layer.label} · {layer.tag}</span>
        <p>
          {layer.summary}
          <Citation ids={layer.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. Uric Acid Production vs Excretion Balance Scale Lab                     */
/* -------------------------------------------------------------------------- */
const UA_STATES = [
  {
    id: "balanced",
    label: "生成与排出平衡",
    tag: "血尿酸维持平稳",
    tilt: 0,
    summary: "尿酸是嘌呤分解后的正常代谢产物：一部分来自体内自身细胞更新，一部分来自食物嘌呤；绝大部分经肾脏随尿液排出。只要生成速度与排出能力大致匹配，血尿酸就维持在平稳区间。",
    sourceIds: ["uric-acid", "kidney"],
  },
  {
    id: "production",
    label: "来源与生成增多",
    tag: "内源代谢 + 饮食饮酒负荷",
    tilt: -9,
    summary: "除了高嘌呤食物、含糖饮料或饮酒等外源因素，身体自身细胞代谢加快、体重增加等内源因素也会让尿酸生成增多——所以并不是「绝对只靠少吃海鲜」就能解释所有波动。",
    sourceIds: ["uric-acid"],
  },
  {
    id: "excretion",
    label: "肾脏排出减慢",
    tag: "排水通道变窄或受药物影响",
    tilt: 9,
    summary: "肾脏负责排出人体大部分尿酸。当肾脏排泄效率下降、饮水过少，或受某些药物与代谢因素干扰时，即便吃得清淡，血液里的尿酸也可能蓄积升高；这也是医生常把尿酸与肾功能一起对照看的原因。",
    sourceIds: ["uric-acid", "kidney", "lab-results"],
  },
];

function UricAcidBalanceLab({ detail }) {
  const [stateId, setStateId] = useState("balanced");
  const st = UA_STATES.find((s) => s.id === stateId) || UA_STATES[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换尿酸平衡状态">
        {UA_STATES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={stateId === s.id ? "active" : ""}
            aria-pressed={stateId === s.id}
            onClick={() => setStateId(s.id)}
          >
            <b>{s.label}</b>
            <span>{s.tag}</span>
          </button>
        ))}
      </div>

      <svg className="vlab-svg" viewBox="0 0 640 208" role="img" aria-label="尿酸生成与肾脏排出动态天平示意图">
        <rect x="0" y="0" width="640" height="208" rx="12" fill="#f7fbfb" />
        {/* Fulcrum base */}
        <polygon points="320,118 294,174 346,174" fill="#d9e8eb" stroke="#0f766e" strokeWidth="2" />
        <rect x="248" y="174" width="144" height="12" rx="6" fill="#0f766e" fillOpacity="0.2" />

        {/* Tilting balance beam */}
        <g transform={`rotate(${st.tilt} 320 116)`}>
          <line x1="128" y1="116" x2="512" y2="116" stroke="#0f766e" strokeWidth="5" strokeLinecap="round" />
          <circle cx="320" cy="116" r="8" fill="#0f766e" stroke="#ffffff" strokeWidth="2.5" />

          {/* Left pan: Generation */}
          <rect
            x="60"
            y="44"
            width="176"
            height="62"
            rx="14"
            fill={stateId === "production" ? "#fbece6" : "#ffffff"}
            stroke={stateId === "production" ? "#cf564e" : "#c7dce0"}
            strokeWidth={stateId === "production" ? "2.6" : "1.8"}
          />
          <text x="148" y="70" textAnchor="middle" className="vlab-box-title">尿酸生成端</text>
          <text x="148" y="92" textAnchor="middle" className="vlab-mini-tag">体内嘌呤代谢 + 饮食摄入</text>

          {/* Right pan: Excretion */}
          <rect
            x="404"
            y="44"
            width="176"
            height="62"
            rx="14"
            fill={stateId === "excretion" ? "#eef5fa" : "#ffffff"}
            stroke={stateId === "excretion" ? "#3b76a3" : "#c7dce0"}
            strokeWidth={stateId === "excretion" ? "2.6" : "1.8"}
          />
          <text x="492" y="70" textAnchor="middle" className="vlab-box-title">肾脏排泄端</text>
          <text x="492" y="92" textAnchor="middle" className="vlab-mini-tag">经肾过滤随尿液排出</text>
        </g>

        <text x="320" y="200" textAnchor="middle" className="vlab-mini-tag active">
          当前示意：{st.label}（{st.tag}）
        </text>
      </svg>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{st.label} · {st.tag}</span>
        <p>
          {st.summary}
          <Citation ids={st.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 10. H. pylori C13/C14 Breath Test & False-Negative Medication Window Lab   */
/* -------------------------------------------------------------------------- */
const HP_MODES = [
  {
    id: "breath",
    label: "呼气试验原理（C13 / C14）",
    tag: "查现症活跃感染",
    summary: "吞服安全标记的尿素胶囊后，如果胃内存在活跃的幽门螺杆菌，细菌分泌的尿素酶会迅速分解尿素并释放带标记的二氧化碳，经血液和肺呼出到集气袋里，仪器对比服药前后吹气即可判断。",
    sourceIds: ["hp-tests", "hp-info"],
  },
  {
    id: "meds",
    label: "为什么近期服药易「假阴性」",
    tag: "抑酸药与抗生素干扰",
    summary: "检查前如果近期服过质子泵抑制剂（拉唑类抑酸药）、铋剂或抗生素，会把胃内细菌活性暂时压低，导致吹气信号变弱而测不出——务必按检查机构说明核对停药时间窗。",
    sourceIds: ["hp-tests", "ulcer-diag"],
  },
  {
    id: "compare",
    label: "呼气 / 粪便 / 抽血 / 胃镜分工",
    tag: "不同查法回答不同问题",
    summary: "呼气试验与粪便抗原反映「此刻是不是正在感染」；抽血查抗体只能提示「曾经接触过」，杀菌后抗体仍可能长期存在；胃镜活检则能在检查的同时直接观察胃黏膜有没有炎症或溃疡。",
    sourceIds: ["hp-tests", "ulcer-diag"],
  },
];

function HPyloriBreathLab({ detail }) {
  const [modeId, setModeId] = useState("breath");
  const mode = HP_MODES.find((m) => m.id === modeId) || HP_MODES[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择幽门螺杆菌原理视角">
        {HP_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={modeId === m.id ? "active" : ""}
            aria-pressed={modeId === m.id}
            onClick={() => setModeId(m.id)}
          >
            <b>{m.label}</b>
            <span>{m.tag}</span>
          </button>
        ))}
      </div>

      <svg className="vlab-svg" viewBox="0 0 640 192" role="img" aria-label="幽门螺杆菌呼气试验原理与干扰因素示意图">
        <rect x="0" y="0" width="640" height="192" rx="12" fill="#f7fbfb" />
        {modeId === "compare" ? (
          <>
            {[
              { x: 20, title: "C13 / C14 呼气", sub: "无创 · 查现症感染", badge: "体检常用", stroke: "#0f766e", fill: "#e8f5f3" },
              { x: 176, title: "粪便抗原检测", sub: "无创 · 查现症感染", badge: "可替代呼气", stroke: "#3b76a3", fill: "#ecf4fa" },
              { x: 332, title: "抽血查抗体", sub: "区分不了既往/现症", badge: "不用于复查", stroke: "#cf7f32", fill: "#fcf4e6" },
              { x: 488, title: "胃镜下活检", sub: "同步直视胃黏膜", badge: "看有无溃疡", stroke: "#cf564e", fill: "#fdf0ee" },
            ].map((item) => (
              <g key={item.title}>
                <rect x={item.x} y="28" width="136" height="136" rx="14" fill={item.fill} stroke={item.stroke} strokeWidth="2" />
                <text x={item.x + 68} y="62" textAnchor="middle" className="vlab-box-title" fontSize="13.5">{item.title}</text>
                <text x={item.x + 68} y="92" textAnchor="middle" className="vlab-mini-tag">{item.sub}</text>
                <rect x={item.x + 26} y="114" width="84" height="24" rx="12" fill="#ffffff" stroke={item.stroke} strokeWidth="1.2" />
                <text x={item.x + 68} y="130" textAnchor="middle" className="vlab-mini-tag active">{item.badge}</text>
              </g>
            ))}
          </>
        ) : (
          <>
            {[
              { x: 20, title: "1. 吞服标记尿素", sub: "空腹服下安全试剂" },
              { x: 178, title: modeId === "meds" ? "2. 细菌被药物压低" : "2. 胃内活跃菌分解", sub: modeId === "meds" ? "抑酸药 / 抗生素干扰" : "尿素酶裂解产生气体" },
              { x: 336, title: "3. 经血与肺呼出", sub: modeId === "meds" ? "呼出标记气体偏少" : "标记 CO₂ 随呼吸排出" },
              { x: 494, title: modeId === "meds" ? "4. 易致假阴性" : "4. 集气袋前后对照", sub: modeId === "meds" ? "请先核对停药时间" : "评估是否存在现症感染" },
            ].map((box, idx) => (
              <g key={box.title}>
                {idx < 3 && (
                  <path d={`M${box.x + 132} 96 L${box.x + 154} 96 M${box.x + 148} 90 L${box.x + 155} 96 L${box.x + 148} 102`} fill="none" stroke={modeId === "meds" ? "#cf7f32" : "#0f766e"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                )}
                <rect
                  x={box.x}
                  y="36"
                  width="130"
                  height="120"
                  rx="14"
                  fill={modeId === "meds" && (idx === 1 || idx === 3) ? "#fcf4e6" : "#ffffff"}
                  stroke={modeId === "meds" && (idx === 1 || idx === 3) ? "#cf7f32" : "#0f766e"}
                  strokeWidth="2"
                />
                <text x={box.x + 65} y="82" textAnchor="middle" className="vlab-box-title" fontSize="13">{box.title}</text>
                <text x={box.x + 65} y="112" textAnchor="middle" className="vlab-mini-tag">{box.sub}</text>
              </g>
            ))}
          </>
        )}
      </svg>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{mode.label} · {mode.tag}</span>
        <p>
          {mode.summary}
          <Citation ids={mode.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 11. Fatty Liver Ultrasound Echo & Multi-Test Assessment Lab                */
/* -------------------------------------------------------------------------- */
const FL_MODES = [
  {
    id: "normal",
    label: "正常肝实质",
    tag: "回声均匀柔和",
    summary: "健康肝细胞排列整齐、细胞内极少脂肪微滴，超声波可以顺畅穿透整个肝脏深度，回声细腻均匀、后方视野清晰。",
    sourceIds: ["sonogram", "niddk-def"],
  },
  {
    id: "steatosis",
    label: "脂肪微滴蓄积（超声变亮）",
    tag: "前场回声增强 · 后方衰减",
    summary: "大量细小脂肪滴聚积在肝细胞里，会不断反射散射超声波：于是报告上常写「肝实质回声细密增强、后方回声衰减」。这反映的是脂肪多不多。",
    sourceIds: ["niddk-def", "niddk-diag", "sonogram"],
  },
  {
    id: "assess",
    label: "超声之外还要看什么？",
    tag: "脂肪堆积 ≠ 炎症与纤维化",
    summary: "普通 B 超主要看「有没有脂肪堆积」，并不能单独确认是否伴随肝细胞炎症或纤维化。医生通常会结合肝功抽血（ALT/AST）、血糖血脂，必要时安排肝脏弹性成像综合评估。",
    sourceIds: ["niddk-diag", "medline-steatotic", "liver-tests"],
  },
];

function FattyLiverEchoLab({ detail }) {
  const [modeId, setModeId] = useState("steatosis");
  const mode = FL_MODES.find((m) => m.id === modeId) || FL_MODES[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换脂肪肝评估视角">
        {FL_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={modeId === m.id ? "active" : ""}
            aria-pressed={modeId === m.id}
            onClick={() => setModeId(m.id)}
          >
            <b>{m.label}</b>
            <span>{m.tag}</span>
          </button>
        ))}
      </div>

      <div className="vlab-split us-split">
        <div className="vlab-canvas-card">
          <div className="vlab-subhead">
            <span>超声穿透深度与回声变化示意</span>
          </div>
          <svg className="vlab-svg" viewBox="0 0 320 172" role="img" aria-label={`脂肪肝超声回声概念示意：${mode.label}`}>
            <defs>
              <linearGradient id="fl-normal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4c6470" />
                <stop offset="100%" stopColor="#354954" />
              </linearGradient>
              <linearGradient id="fl-bright" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#cfdce0" />
                <stop offset="48%" stopColor="#7a939e" />
                <stop offset="100%" stopColor="#1b262e" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="320" height="172" rx="12" fill={modeId === "normal" ? "url(#fl-normal)" : "url(#fl-bright)"} />
            <rect x="112" y="6" width="96" height="10" rx="5" fill="#77cfc6" />
            {/* Microscopic fat droplets when steatosis/assess */}
            {modeId !== "normal" && (
              <g fill="#f7dca4" fillOpacity="0.85">
                {[[84, 46, 5], [118, 54, 7], [156, 42, 6], [198, 52, 7.5], [232, 46, 5], [100, 78, 6], [142, 74, 7], [182, 82, 5.5], [218, 76, 6]].map(([cx, cy, r]) => (
                  <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
                ))}
              </g>
            )}
            <text x="160" y="130" textAnchor="middle" fill="#e6f2f2" fontSize="12" fontWeight="700">
              {modeId === "normal" ? "声波均匀穿透 · 深浅层次清楚" : "浅层脂滴密集反射变亮 · 深层后方衰减"}
            </text>
            <text x="160" y="152" textAnchor="middle" fill="#bdd6da" fontSize="11">
              {mode.label}（概念示意，非真实超声图）
            </text>
          </svg>
        </div>

        <div className="vlab-canvas-card">
          <div className="vlab-subhead">
            <span>临床评估脂肪肝的三块拼图</span>
          </div>
          <ol className="us-tier-list">
            <li className={modeId === "steatosis" ? "active" : ""}>
              <b>1. 腹部超声（看脂肪多不多）</b>
              <span>无创发现肝细胞内脂肪堆积线索，适合常规体检初筛。</span>
            </li>
            <li className={modeId === "assess" ? "active" : ""}>
              <b>2. 肝功能 + 血糖血脂（看炎症与代谢）</b>
              <span>ALT / AST 观察肝细胞是否受累，糖脂指标帮助排查代谢背景。</span>
            </li>
            <li className={modeId === "assess" ? "active" : ""}>
              <b>3. 肝脏弹性成像（必要时看硬度）</b>
              <span>当医生怀疑进展风险时，用来无创评估肝脏纤维化程度。</span>
            </li>
          </ol>
        </div>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{mode.label} · {mode.tag}</span>
        <p>
          {mode.summary}
          <Citation ids={mode.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 12. Gallbladder Ultrasound Posture Lab (Stone Rolls vs Polyp Stays Fixed)  */
/* -------------------------------------------------------------------------- */
const GB_MODES = [
  {
    id: "stone",
    label: "胆囊结石（翻身会滚落）",
    tag: "强回声 + 后方声影 + 随体位移动",
    summary: "结石游离在胆汁里，超声波遇到致密结石会强烈反射并在背后留下暗色「声影」。检查时医生让你侧身翻转，结石通常会顺着重力滚向低处。",
    sourceIds: ["gallstones", "gallstones-diag"],
  },
  {
    id: "polyp",
    label: "胆囊息肉（附壁不动）",
    tag: "附着囊壁 + 无声影 + 原地不动",
    summary: "息肉样病变长在胆囊内壁上，改变体位时位置固定不动，后方通常也不带明显声影。体检中多数无症状小息肉以按医嘱定期超声随访为主。",
    sourceIds: ["gallbladder-info", "abd-us"],
  },
  {
    id: "fasting",
    label: "为什么必须充分空腹？",
    tag: "吃早饭会让胆囊收缩变小",
    summary: "空腹时胆囊充满胆汁像一只舒展的小梨，囊壁光滑度与内部结构一目了然；进食后胆囊会收缩排胆汁，囊壁变厚褶皱，容易漏看小结石或误把皱褶当增厚。",
    sourceIds: ["abd-us", "gallbladder-info"],
  },
];

function GallbladderPostureLab({ detail }) {
  const [modeId, setModeId] = useState("stone");
  const [turned, setTurned] = useState(false);
  const mode = GB_MODES.find((m) => m.id === modeId) || GB_MODES[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择胆囊超声观察项">
        {GB_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={modeId === m.id ? "active" : ""}
            aria-pressed={modeId === m.id}
            onClick={() => setModeId(m.id)}
          >
            <b>{m.label}</b>
            <span>{m.tag.split(" + ")[0]}</span>
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-strip-head">
          <span>体位翻转演示（观察结石与息肉的差别）</span>
          <div className="vlab-mode-tabs" role="group" aria-label="切换检查体位">
            <button type="button" className={!turned ? "active" : ""} aria-pressed={!turned} onClick={() => setTurned(false)}>
              仰卧位扫查
            </button>
            <button type="button" className={turned ? "active" : ""} aria-pressed={turned} onClick={() => setTurned(true)}>
              左侧卧 / 翻身位
            </button>
          </div>
        </div>

        <svg className="vlab-svg" viewBox="0 0 640 192" role="img" aria-label={`胆囊超声体位翻转示意：${mode.label}`}>
          <rect x="0" y="0" width="640" height="192" rx="12" fill="#1e2c36" />
          <rect x="272" y="6" width="96" height="10" rx="5" fill="#77cfc6" />

          {/* Gallbladder pear outline (contracted if fasting mode toggled to post-meal illustration) */}
          <g transform={turned ? "rotate(-20 320 98)" : "rotate(0 320 98)"}>
            <ellipse
              cx="320"
              cy="102"
              rx={modeId === "fasting" && turned ? 62 : 124}
              ry={modeId === "fasting" && turned ? 30 : 54}
              fill="#0d171e"
              stroke="#8adbd2"
              strokeWidth={modeId === "fasting" && turned ? "5" : "2.6"}
            />

            {/* Wall-attached polyp: ALWAYS stays fixed on upper-right wall even when turned! */}
            {modeId !== "fasting" && (
              <circle cx="388" cy="64" r="10" fill="#a8c9cf" stroke="#e4f4f6" strokeWidth="1.6" opacity={modeId === "polyp" ? 1 : 0.42} />
            )}
          </g>

          {/* Upright label for wall-attached polyp outside rotation so it never clips */}
          {modeId !== "fasting" && (
            <text
              x={turned ? 428 : 422}
              y={turned ? 44 : 58}
              fill="#d9f0ee"
              fontSize="11.5"
              fontWeight="600"
              opacity={modeId === "polyp" ? 1 : 0.55}
            >
              附壁息肉（原地不动）
            </text>
          )}

          {/* Free gallstone with acoustic shadow: ROLLS to the lowest point when turned! */}
          {modeId !== "fasting" && (
            <g opacity={modeId === "stone" ? 1 : 0.35}>
              {/* Dark acoustic shadow band directly behind stone */}
              <polygon
                points={turned ? "228,128 256,128 268,186 216,186" : "298,142 326,142 338,186 286,186"}
                fill="#070d11"
                fillOpacity="0.88"
              />
              <ellipse
                cx={turned ? 242 : 312}
                cy={turned ? 124 : 138}
                rx="15"
                ry="11"
                fill="#ffffff"
                stroke="#f5c678"
                strokeWidth="2"
              />
              <text x={turned ? 156 : 312} y={turned ? 114 : 176} textAnchor="middle" fill="#ffe2a8" fontSize="11.5" fontWeight="700">
                {turned ? "结石随重力滚向低处 + 声影" : "强回声结石 + 后方暗声影"}
              </text>
            </g>
          )}

          {modeId === "fasting" && (
            <text x="320" y="174" textAnchor="middle" fill="#cde6e4" fontSize="12" fontWeight="600">
              {turned ? "进食后胆囊收缩皱缩，囊壁变厚容易遮挡细节" : "充分空腹时胆囊充盈舒展，内壁与胆汁清晰可见"}
            </text>
          )}
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{mode.label} · {mode.tag}</span>
        <p>
          {mode.summary}
          <Citation ids={mode.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 13. Tumor Markers Multi-Cause & Verification Funnel Lab                    */
/* -------------------------------------------------------------------------- */
const TM_STAGES = [
  {
    id: "benign",
    label: "非肿瘤原因也会升高",
    tag: "炎症 / 吸烟 / 良性囊肿 / 生理期",
    summary: "许多肿瘤标志物原本就是正常细胞也会分泌的蛋白质。长期吸烟可让 CEA 轻度升高，良性肝病或孕期可能影响 AFP，炎症或生理期也会干扰 CA125——单看一次箭头绝不能等同于癌症。",
    sourceIds: ["nci-markers", "medline-markers", "cea", "afp"],
  },
  {
    id: "trend",
    label: "动态趋势比单次值更关键",
    tag: "同院复查观察走向",
    summary: "医生通常更关注同家医院、同一套检测方法下连续几次的变化趋势：是短暂波动后回落、长期低幅稳定，还是持续阶梯式上升。跨医院对比往往会受试剂盒差异影响。",
    sourceIds: ["medline-markers", "nci-markers"],
  },
  {
    id: "confirm",
    label: "确诊必须靠影像与病理",
    tag: "标志物只是线索之一",
    summary: "肿瘤标志物不能单独用来确诊癌症，正常也不能百分百排除癌症。真正的明确评估需要由医生结合症状、高危因素，安排针对性的 CT/超声/胃肠镜，必要时以病理活检为金标准。",
    sourceIds: ["nci-markers", "medline-markers"],
  },
];

function TumorMarkersFunnelLab({ detail }) {
  const [stageId, setStageId] = useState("benign");
  const st = TM_STAGES.find((s) => s.id === stageId) || TM_STAGES[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择肿瘤标志物阅读环节">
        {TM_STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={stageId === s.id ? "active" : ""}
            aria-pressed={stageId === s.id}
            onClick={() => setStageId(s.id)}
          >
            <b>{s.label}</b>
            <span>{s.tag}</span>
          </button>
        ))}
      </div>

      <svg className="vlab-svg" viewBox="0 0 640 202" role="img" aria-label="肿瘤标志物多重影响因素与分层核实路径图">
        <rect x="0" y="0" width="640" height="202" rx="12" fill="#f7fbfb" />
        {/* Left: Multiple inputs converging into one blood marker reading */}
        <g opacity={stageId === "benign" ? 1 : 0.45}>
          {[
            { y: 24, text: "吸烟 / 熬夜 / 生理期" },
            { y: 74, text: "良性炎症 / 息肉 / 慢性肝病" },
            { y: 124, text: "不同医院检测体系差异" },
          ].map((src) => (
            <g key={src.text}>
              <rect x="18" y={src.y} width="176" height="36" rx="10" fill="#fcf4e6" stroke="#cf7f32" strokeWidth="1.8" />
              <text x="106" y={src.y + 22} textAnchor="middle" className="vlab-mini-tag">{src.text}</text>
              <path d={`M194 ${src.y + 18} L228 96`} stroke="#cf7f32" strokeWidth="1.6" strokeDasharray="4 3" />
            </g>
          ))}
        </g>

        {/* Middle: Single blood reading -> Trend check */}
        <g
          className="vlab-click-group"
          role="button"
          tabIndex="0"
          onClick={() => setStageId("trend")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStageId("trend"); } }}
        >
          <rect
            x="228"
            y="48"
            width="172"
            height="100"
            rx="14"
            fill={stageId === "trend" ? "#e8f5f3" : "#ffffff"}
            stroke={stageId === "trend" ? "#0f766e" : "#b9d0d6"}
            strokeWidth={stageId === "trend" ? "2.6" : "1.6"}
          />
          <text x="314" y="84" textAnchor="middle" className="vlab-box-title" fontSize="13.5">单次偏高 ≠ 确诊</text>
          <text x="314" y="108" textAnchor="middle" className="vlab-mini-tag active">排查干扰 · 同院复查趋势</text>
          <text x="314" y="128" textAnchor="middle" className="vlab-mini-tag">看是回落、平稳还是持续升</text>
        </g>

        <path d="M402 98 L434 98 M428 92 L435 98 L428 104" fill="none" stroke="#0f766e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Right: Imaging & Pathology confirmation */}
        <g
          className="vlab-click-group"
          role="button"
          tabIndex="0"
          onClick={() => setStageId("confirm")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStageId("confirm"); } }}
        >
          <rect
            x="438"
            y="48"
            width="184"
            height="100"
            rx="14"
            fill={stageId === "confirm" ? "#ecf4fa" : "#ffffff"}
            stroke={stageId === "confirm" ? "#3b76a3" : "#b9d0d6"}
            strokeWidth={stageId === "confirm" ? "2.6" : "1.6"}
          />
          <text x="530" y="84" textAnchor="middle" className="vlab-box-title" fontSize="13.5">影像 / 内镜与病理</text>
          <text x="530" y="108" textAnchor="middle" className="vlab-mini-tag active">超声 · CT · 胃肠镜核实</text>
          <text x="530" y="128" textAnchor="middle" className="vlab-mini-tag">最终定性以病理为准</text>
        </g>

        <text x="320" y="186" textAnchor="middle" className="vlab-mini-tag active">
          提示：良性因素引起的轻度波动远比恶性肿瘤更常见，请带着完整报告由医生综合评估
        </text>
      </svg>

      <div className="vlab-explain" aria-live="polite">
        <span className="vlab-explain-kicker">{st.label} · {st.tag}</span>
        <p>
          {st.summary}
          <Citation ids={st.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Unified Dispatcher (14 Specialized Interactive Visual Labs)                */
/* -------------------------------------------------------------------------- */
const LABS = {
  ecg: {
    kicker: "专项交互图解 · 心电图",
    title: "点一点波形：看懂 P-QRS-T 与常见节律词",
    boundary: "本图仅演示心电图各波段对应的心脏电传导顺序与常见节律术语概念，不按真实毫伏电压或毫秒时间网格绘制，不用于对照个人心电图纸诊断。",
    render: (detail) => <EcgWaveformLab detail={detail} />,
  },
  pressure: {
    kicker: "专项交互图解 · 血压",
    title: "看清收缩压与舒张压：同一拍里的峰与谷",
    boundary: "本图仅演示心动周期中动脉压力起伏与血管阻力的生理概念，不含血压分级标准或具体数值门槛。",
    render: (detail) => <PressurePulseLab detail={detail} />,
  },
  lipids: {
    kicker: "专项交互图解 · 血脂",
    title: "脂蛋白车队分工：LDL、HDL 与甘油三酯怎么跑",
    boundary: "本图仅展示主要脂蛋白的运输方向分工概念，省略多种载脂蛋白亚类与酶代谢细节，不含个人降脂目标值。",
    render: (detail) => <LipidsTransportLab detail={detail} />,
  },
  "liver-function": {
    kicker: "专项交互图解 · 肝功能",
    title: "一管血查三个侧面：酶、胆红素与白蛋白分工图",
    boundary: "本图仅用于区分肝功能检验组合中三类常见项目的观察侧面，不涵盖全部肝功指标，不用于推断单一指标升高的具体病因。",
    render: (detail) => <LiverPanelLab detail={detail} />,
  },
  glucose: {
    kicker: "专项交互图解 · 血糖",
    title: "同一人的血糖，为什么三个项目数字不一样？",
    boundary: "本图为时间窗概念示意，纵轴与横轴不按真实数值比例绘制，不含糖尿病诊断切点或控糖目标。",
    render: (detail) => <GlucoseWindowsLab detail={detail} />,
  },
  "thyroid-nodule": {
    kicker: "专项交互图解 · 甲状腺超声",
    title: "看懂超声形态词与 TI-RADS 风险沟通逻辑",
    boundary: "本图仅用于帮助理解囊实性、边界等常见超声描述词及 TI-RADS 分层沟通逻辑，不含任何恶性概率数字或穿刺毫米门槛。",
    render: (detail) => <UltrasoundTierLab detail={detail} isBreast={false} />,
  },
  "breast-ultrasound": {
    kicker: "专项交互图解 · 乳腺超声",
    title: "看懂超声形态词与 BI-RADS 行动分类逻辑",
    boundary: "本图仅用于帮助理解乳腺超声常见描述词及 BI-RADS 行动分类含义，不含恶性概率数字、穿刺门槛或筛查年龄处方。",
    render: (detail) => <UltrasoundTierLab detail={detail} isBreast={true} />,
  },
  cbc: {
    kicker: "专项交互图解 · 血常规",
    title: "一滴血里的三支队伍：红细胞、白细胞与血小板",
    boundary: "本图为血细胞三系分工的简化显微概念示意，不按真实细胞比例或计数参考区间绘制。",
    render: (detail) => <CbcCellsLab detail={detail} />,
  },
  urinalysis: {
    kicker: "专项交互图解 · 尿常规",
    title: "同一份尿样怎么查？外观、试纸与显微镜三层分工",
    boundary: "本图仅说明尿常规三个检测层面的递进关系，不替代规范中段尿留取要求或临床解读。",
    render: (detail) => <UrinalysisLayersLab detail={detail} />,
  },
  "uric-acid": {
    kicker: "专项交互图解 · 尿酸",
    title: "尿酸动态天平：为什么不只和「吃了什么」有关？",
    boundary: "本图仅演示尿酸生成与排泄两端动态平衡概念，不含血尿酸数值门槛、痛风诊断或饮食/降尿酸用药方案。",
    render: (detail) => <UricAcidBalanceLab detail={detail} />,
  },
  "h-pylori": {
    kicker: "专项交互图解 · 幽门螺杆菌",
    title: "吹气试验怎么查感染？为什么近期吃药容易测不准？",
    boundary: "本图仅演示幽门螺杆菌检测原理与常见查法分工，不构成根除治疗或停药处方，具体停药时长以检查机构和医生说明为准。",
    render: (detail) => <HPyloriBreathLab detail={detail} />,
  },
  "fatty-liver": {
    kicker: "专项交互图解 · 脂肪肝",
    title: "B 超为什么能看见脂肪肝？为什么不能只看超声轻重？",
    boundary: "本图仅示意肝细胞脂滴对超声回声的影响及多检查互补关系，不展示脂肪肝临床分期或治疗标准。",
    render: (detail) => <FattyLiverEchoLab detail={detail} />,
  },
  gallbladder: {
    kicker: "专项交互图解 · 胆囊超声",
    title: "翻个身就分清：结石会滚落，附壁息肉原地不动",
    boundary: "本图仅演示空腹状态下胆囊结石与附壁息肉在体位变化时的典型影像概念差异，不替代专业超声诊断或手术/随访门槛。",
    render: (detail) => <GallbladderPostureLab detail={detail} />,
  },
  "tumor-markers": {
    kicker: "专项交互图解 · 肿瘤标志物",
    title: "单次箭头为什么不等于确诊癌症？看懂三步核实逻辑",
    boundary: "本图仅解释肿瘤标志物的多种非肿瘤来源与临床核实路径，不提供任何标志物数值解读、肿瘤排除承诺或筛查处方。",
    render: (detail) => <TumorMarkersFunnelLab detail={detail} />,
  },
};

export function hasIndicatorVisualLab(id) {
  return Boolean(LABS[id]);
}

export default function IndicatorVisualLab({ detail }) {
  const spec = detail?.kind === "indicator" ? LABS[detail.id] : null;
  if (!spec) return null;

  return (
    <section
      className="indicator-vlab"
      id="article-visual-lab"
      aria-labelledby="indicator-vlab-title"
    >
      <div className="vlab-head">
        <div>
          <span className="vlab-kicker">
            <Activity size={13} aria-hidden="true" />
            {spec.kicker}
          </span>
          <h2 id="indicator-vlab-title">{spec.title}</h2>
        </div>
        <span className="vlab-badge">
          <SlidersHorizontal size={13} aria-hidden="true" />
          互动图解
        </span>
      </div>
      {spec.render(detail)}
      <p className="vlab-boundary">
        <b>图示边界：</b>{spec.boundary}
      </p>
    </section>
  );
}
