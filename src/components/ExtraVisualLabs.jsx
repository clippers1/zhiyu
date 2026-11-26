import React, { useState } from "react";
import { Citation } from "./ContentUI";

/* -------------------------------------------------------------------------- */
/* 15. Kidney Function: Creatinine / eGFR / UACR Glomerular Sieve Explorer    */
/* -------------------------------------------------------------------------- */
const KIDNEY_MODES = [
  {
    id: "steady",
    label: "正常滤过视角",
    tag: "代谢废物排得畅，蛋白质留得住",
    desc: "肾小球像一层极精细的滤网：日常肌肉代谢产生的肌酐等小分子废物能顺利滤进尿液排出，而对身体宝贵的白蛋白等大分子被稳稳留在血液里。",
    creaState: "输入与滤出大致平衡",
    egfrState: "滤过流速保持稳定",
    uacrState: "尿液中几乎不漏蛋白",
    sourceIds: ["creatinine", "gfr", "uacr"],
  },
  {
    id: "muscle",
    label: "肌肉量大 / 运动或高蛋白饮食",
    tag: "上游产出增多，滤网本身未必坏了",
    desc: "血肌酐来自肌肉日常代谢，也会受近期高强度力量训练、肉类摄入和体格影响。因此单次血肌酐略高于参考范围，不等于肾脏滤网一定受损，常需结合年龄、性别换算 eGFR，必要时复查或配合尿检与胱抑素 C 同看。",
    creaState: "上游产出偏多，血液浓度易走高",
    egfrState: "结合体格与复查综合评估",
    uacrState: "尿蛋白侧可提供补充对照",
    sourceIds: ["creatinine", "gfr"],
  },
  {
    id: "complement",
    label: "为什么要三项互补同看？",
    tag: "血液看「排得快不快」，尿液看「网眼漏不漏」",
    desc: "血肌酐与 eGFR 反映肾脏过滤废物的总体流速，但早期轻微渗漏时血液读数可能变化还不明显；尿白蛋白肌酐比（UACR）从尿液一侧捕捉微量白蛋白漏出，两者互补比孤立盯一个数字更完整。",
    creaState: "单独看易受肌肉量与饮水影响",
    egfrState: "把血肌酐换算成更直观的滤过能力视角",
    uacrState: "补齐尿液侧早期滤网通透性线索",
    sourceIds: ["gfr", "uacr", "kidney"],
  },
];

export function KidneyFilterLab({ detail }) {
  const [modeId, setModeId] = useState("steady");
  const current = KIDNEY_MODES.find((m) => m.id === modeId) || KIDNEY_MODES[0];

  const isMuscle = modeId === "muscle";
  const isComplement = modeId === "complement";

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换肾功能观察视角">
        {KIDNEY_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={modeId === m.id}
            className={modeId === m.id ? "active" : ""}
            onClick={() => setModeId(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">肾小球滤网三视角示意：上游肌肉产出 → 肾小球筛网 → 血液与尿液分流</div>
        <svg className="vlab-svg" viewBox="0 0 600 228" role="img" aria-label="肾功能血肌酐、eGFR 与尿白蛋白分工示意图">
          <rect x="0" y="0" width="600" height="228" rx="12" fill="#f7fbfb" />

          {/* Left: Muscle / diet input */}
          <rect
            x="18"
            y="38"
            width="148"
            height="136"
            rx="14"
            fill={isMuscle ? "#fff5f0" : "#ffffff"}
            stroke={isMuscle ? "#d97706" : "#cddde0"}
            strokeWidth={isMuscle ? 2.2 : 1.5}
          />
          <text x="92" y="64" textAnchor="middle" className="vlab-box-title">上游血液输入</text>
          <text x="92" y="84" textAnchor="middle" className="vlab-mini-tag">肌肉代谢产出肌酐</text>

          {/* Creatinine small teal dots + albumin large amber circles */}
          <circle cx="56" cy="112" r="5" fill="#0f766e" />
          <circle cx="76" cy="122" r="5" fill="#0f766e" />
          <circle cx="62" cy="136" r="5" fill="#0f766e" />
          {isMuscle && (
            <>
              <circle cx="94" cy="112" r="5.5" fill="#d97706" />
              <circle cx="88" cy="134" r="5.5" fill="#d97706" />
              <circle cx="110" cy="124" r="5.5" fill="#d97706" />
            </>
          )}
          <circle cx="132" cy="118" r="10" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.8" />
          <text x="92" y="160" textAnchor="middle" className={isMuscle ? "vlab-mini-tag warn" : "vlab-mini-tag"}>
            {isMuscle ? "肌肉/运动→肌酐产出增多" : "小点=肌酐 · 大球=白蛋白"}
          </text>

          {/* Flow arrow into glomerulus */}
          <line x1="168" y1="106" x2="212" y2="106" stroke="#0f766e" strokeWidth="2.4" strokeDasharray="6 4" className="vlab-dash-right" />
          <path d="M206 100 L216 106 L206 112" fill="none" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Center: Glomerulus filter sieve */}
          <rect
            x="220"
            y="28"
            width="156"
            height="156"
            rx="18"
            fill="#eef8f7"
            stroke="#0f766e"
            strokeWidth="2"
          />
          <text x="298" y="52" textAnchor="middle" className="vlab-box-title">肾小球滤网</text>
          <text x="298" y="70" textAnchor="middle" className="vlab-mini-tag active">eGFR 评估总体流速</text>

          {/* Sieve bars */}
          <line x1="298" y1="84" x2="298" y2="164" stroke="#0f766e" strokeWidth="4" strokeDasharray={isComplement ? "8 11" : "10 6"} strokeLinecap="round" />
          {/* Left of sieve: large albumin bounced back */}
          <circle cx="266" cy="108" r="10" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.8" />
          <path d="M278 104 Q288 94 276 86" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
          {/* Passing small waste */}
          <circle cx="272" cy="142" r="5" fill="#0f766e" />
          <circle cx="322" cy="142" r="5" fill="#0f766e" />
          <circle cx="342" cy="134" r="5" fill="#0f766e" />
          {isComplement && (
            <circle cx="332" cy="108" r="8.5" fill="#fee2e2" stroke="#c1453e" strokeWidth="1.8" strokeDasharray="3 2" />
          )}
          <text x="298" y="175" textAnchor="middle" className={isComplement ? "vlab-mini-tag warn" : "vlab-mini-tag"}>
            {isComplement ? "滤速与网眼松紧需双侧同看" : "留大分子 · 滤小分子废物"}
          </text>

          {/* Right top: Back to blood */}
          <line x1="378" y1="76" x2="416" y2="76" stroke="#2563eb" strokeWidth="2.2" strokeDasharray="6 4" className="vlab-dash-right" />
          <path d="M410 70 L420 76 L410 82" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="424" y="34" width="158" height="72" rx="12" fill="#f3f8ff" stroke="#93c5fd" strokeWidth="1.6" />
          <text x="503" y="58" textAnchor="middle" className="vlab-box-title">留在血液侧</text>
          <text x="503" y="78" textAnchor="middle" className="vlab-mini-tag">白蛋白保留 · 查血肌酐/eGFR</text>
          <text x="503" y="96" textAnchor="middle" className="vlab-mini-tag active">{current.egfrState}</text>

          {/* Right bottom: Into urine */}
          <line x1="378" y1="146" x2="416" y2="146" stroke={isComplement ? "#c1453e" : "#0f766e"} strokeWidth="2.2" strokeDasharray="6 4" className="vlab-dash-right" />
          <path d="M410 140 L420 146 L410 152" fill="none" stroke={isComplement ? "#c1453e" : "#0f766e"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect
            x="424"
            y="116"
            width="158"
            height="72"
            rx="12"
            fill={isComplement ? "#fff5f5" : "#eef8f7"}
            stroke={isComplement ? "#e07a73" : "#7ec4bc"}
            strokeWidth="1.6"
          />
          <text x="503" y="140" textAnchor="middle" className="vlab-box-title">排入尿液侧</text>
          <text x="503" y="160" textAnchor="middle" className="vlab-mini-tag">滤出废物 · 查尿白蛋白 UACR</text>
          <text x="503" y="178" textAnchor="middle" className={isComplement ? "vlab-mini-tag warn" : "vlab-mini-tag active"}>
            {current.uacrState}
          </text>

          {/* Footer status pill */}
          <rect x="18" y="196" width="564" height="24" rx="8" fill="#ffffff" stroke="#dce7ea" />
          <text x="300" y="212" textAnchor="middle" className="vlab-mini-tag active">
            核心要点：{current.tag}
          </text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{current.label}</b>
          <span>{current.creaState}</span>
        </div>
        <p>
          {current.desc}
          <Citation ids={current.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 16. Thyroid Function: Pituitary TSH <-> Thyroid T3/T4 Seesaw Feedback      */
/* -------------------------------------------------------------------------- */
const THYROID_STATES = [
  {
    id: "balanced",
    label: "平衡巡航",
    tilt: 0,
    tshBadge: "TSH：平稳发令",
    t4Badge: "T4 / T3：平稳输出",
    feedbackText: "激素充足 → 负反馈告诉垂体维持现状",
    summary: "脑下垂体像房间温控器，甲状腺像暖气片。甲状腺激素（T4、T3）处于合适水平时，垂体只需发出平稳的促甲状腺激素（TSH）信号即可维持日常代谢节奏。",
    sourceIds: ["thyroid-tests", "tsh", "t4"],
  },
  {
    id: "low-hormone",
    label: "激素偏低 → TSH 反向升高",
    tilt: 7.5,
    tshBadge: "TSH：拉高催促 ↑",
    t4Badge: "T4 / T3：输出偏少 ↓",
    feedbackText: "垂体察觉不够用 → 加大 TSH 喊甲状腺加油",
    summary: "这是甲功报告里最容易看反的一点：当甲状腺激素分泌不足时，大脑垂体为了把产量提上来，会反向分泌更多 TSH 去催促甲状腺。因此甲状腺功能偏低方向，往往最先表现为 TSH 升高。",
    sourceIds: ["tsh", "thyroid-tests", "t4"],
  },
  {
    id: "high-hormone",
    label: "激素偏高 → TSH 反向压低",
    tilt: -7.5,
    tshBadge: "TSH：主动刹车 ↓",
    t4Badge: "T4 / T3：输出偏多 ↑",
    feedbackText: "垂体察觉太充裕 → 减少 TSH 帮甲状腺减速",
    summary: "相反，如果甲状腺分泌了过多的 T4、T3，这些激素通过血液传回大脑后，垂体会迅速踩刹车、大幅减少 TSH 分泌。所以甲功三项/五项需要配对看，不能只凭箭头方向直观猜高低。",
    sourceIds: ["tsh", "t4", "t3"],
  },
];

export function ThyroidAxisLab({ detail }) {
  const [stateId, setStateId] = useState("low-hormone");
  const current = THYROID_STATES.find((s) => s.id === stateId) || THYROID_STATES[1];
  const isLow = stateId === "low-hormone";
  const isHigh = stateId === "high-hormone";

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换垂体与甲状腺负反馈状态">
        {THYROID_STATES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={stateId === s.id}
            className={stateId === s.id ? "active" : ""}
            onClick={() => setStateId(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">负反馈跷跷板示意：为什么 TSH 与 T4 / T3 经常呈「反向变化」</div>
        <svg className="vlab-svg" viewBox="0 0 600 228" role="img" aria-label="垂体 TSH 与甲状腺 T4 T3 负反馈跷跷板示意图">
          <rect x="0" y="0" width="600" height="228" rx="12" fill="#f7fbfb" />

          {/* Upper command arc: Pituitary -> Thyroid */}
          <path
            d="M172 48 Q300 18 428 48"
            fill="none"
            stroke={isLow ? "#c1453e" : "#0f766e"}
            strokeWidth={isLow ? 3.2 : isHigh ? 1.5 : 2.2}
            strokeDasharray={isHigh ? "4 6" : "8 5"}
            className="vlab-dash-right"
          />
          <path d="M421 41 L432 49 L419 53" fill="none" stroke={isLow ? "#c1453e" : "#0f766e"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="210" y="10" width="180" height="24" rx="12" fill="#ffffff" stroke={isLow ? "#e07a73" : "#b8dad6"} />
          <text x="300" y="26" textAnchor="middle" className={isLow ? "vlab-mini-tag warn" : "vlab-mini-tag active"}>
            {isLow ? "TSH 强力催促信号 ↑" : isHigh ? "TSH 信号减弱刹车 ↓" : "TSH 常规调节信号"}
          </text>

          {/* Seesaw pivot & rotating beam */}
          <polygon points="300,152 284,182 316,182" fill="#d9ecea" stroke="#0f766e" strokeWidth="1.6" />
          <g transform={`rotate(${current.tilt}, 300, 152)`}>
            <line x1="110" y1="152" x2="490" y2="152" stroke="#0f766e" strokeWidth="4.5" strokeLinecap="round" />

            {/* Left pan: Pituitary TSH */}
            <rect
              x="44"
              y="74"
              width="148"
              height="74"
              rx="14"
              fill={isLow ? "#fff5f5" : "#ffffff"}
              stroke={isLow ? "#c1453e" : "#0f766e"}
              strokeWidth="2"
            />
            <text x="118" y="98" textAnchor="middle" className="vlab-box-title">脑下垂体（TSH）</text>
            <text x="118" y="118" textAnchor="middle" className="vlab-mini-tag">指挥中心 · 温控器</text>
            <text x="118" y="137" textAnchor="middle" className={isLow ? "vlab-mini-tag warn" : "vlab-mini-tag active"}>
              {current.tshBadge}
            </text>

            {/* Right pan: Thyroid T4/T3 */}
            <rect
              x="408"
              y="74"
              width="148"
              height="74"
              rx="14"
              fill={isHigh ? "#fff5f5" : "#eef8f7"}
              stroke={isHigh ? "#c1453e" : "#0f766e"}
              strokeWidth="2"
            />
            <text x="482" y="98" textAnchor="middle" className="vlab-box-title">甲状腺（T4 / T3）</text>
            <text x="482" y="118" textAnchor="middle" className="vlab-mini-tag">激素工厂 · 暖气片</text>
            <text x="482" y="137" textAnchor="middle" className={isHigh || isLow ? "vlab-mini-tag warn" : "vlab-mini-tag active"}>
              {current.t4Badge}
            </text>
          </g>

          {/* Bottom feedback return line */}
          <rect x="64" y="192" width="472" height="26" rx="10" fill="#ffffff" stroke="#dce7ea" />
          <text x="300" y="209" textAnchor="middle" className="vlab-mini-tag active">
            负反馈闭环：{current.feedbackText}
          </text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{current.label}</b>
          <span>游离 T4/T3（FT4/FT3）更贴近当下有活性的部分</span>
        </div>
        <p>
          {current.summary}
          <Citation ids={current.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 17. Stool FOBT vs FIT Lab: Interference Comparison & Cause Breakdown       */
/* -------------------------------------------------------------------------- */
const FOBT_METHODS = [
  {
    id: "fit",
    label: "免疫法（FIT）",
    subtitle: "专认「人血红蛋白」的锁钥反应",
    dietResult: "不受红肉 / 动物血 / 铁剂干扰 → 保持阴性",
    dietWarn: false,
    bleedResult: "精准识别人血红蛋白 → 检出阳性线索",
    summary: "免疫化学法（FIT）利用特异性抗体只识别人类血红蛋白，常规饮食中的红肉、猪血、铁剂或维生素 C 一般不会引起误报，且对下消化道微量出血较敏感，体检时通常无需严格忌口。",
    sourceIds: ["fobt", "crc-screen"],
  },
  {
    id: "guaiac",
    label: "化学法（gFOBT）",
    subtitle: "遇血红素或过氧化物即化学显色",
    dietResult: "可能被红肉、动物血或铁剂干扰 → 出现假阳性",
    dietWarn: true,
    bleedResult: "检出血液化学反应 → 呈现阳性线索",
    summary: "传统化学法通过化学氧化显色来捕捉血红素痕迹，无法区分是「人的血」还是「昨晚吃的鸭血/红肉」，也可能受部分药物或大剂量维生素 C 干扰，因此检查前常需按机构要求短暂忌口。",
    sourceIds: ["guaiac", "fobt"],
  },
];

const FOBT_SAMPLES = [
  { id: "diet", label: "样本里只有昨晚吃的红肉 / 铁剂" },
  { id: "bleed", label: "样本里混入消化道微量人血" },
];

export function StoolFobtLab({ detail }) {
  const [methodId, setMethodId] = useState("fit");
  const [sampleId, setSampleId] = useState("diet");
  const method = FOBT_METHODS.find((m) => m.id === methodId) || FOBT_METHODS[0];
  const isDiet = sampleId === "diet";
  const resultText = isDiet ? method.dietResult : method.bleedResult;
  const isPositive = !isDiet || method.dietWarn;

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择便潜血检测方法">
        {FOBT_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={methodId === m.id}
            className={methodId === m.id ? "active" : ""}
            onClick={() => setMethodId(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-strip-head">
          <span>模拟放进不同样本，看两种检测方法如何反应</span>
          <div className="vlab-mode-tabs">
            {FOBT_SAMPLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={sampleId === s.id ? "active" : ""}
                onClick={() => setSampleId(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <svg className="vlab-svg" viewBox="0 0 600 220" role="img" aria-label="便潜血化学法与免疫法 FIT 抗干扰原理及阳性排查来源示意图">
          <rect x="0" y="0" width="600" height="220" rx="12" fill="#f7fbfb" />

          {/* Step 1: Sample */}
          <rect x="18" y="24" width="160" height="106" rx="14" fill="#ffffff" stroke="#cddde0" strokeWidth="1.6" />
          <text x="98" y="48" textAnchor="middle" className="vlab-box-title">1. 送检样本</text>
          <circle cx="72" cy="82" r="12" fill={isDiet ? "#fef3c7" : "#fee2e2"} stroke={isDiet ? "#d97706" : "#c1453e"} strokeWidth="2" />
          <circle cx="122" cy="82" r="9" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.4" />
          <text x="98" y="114" textAnchor="middle" className="vlab-mini-tag">
            {isDiet ? "动物血红素 / 铁剂" : "微量人血红蛋白"}
          </text>

          {/* Arrow 1->2 */}
          <line x1="180" y1="77" x2="210" y2="77" stroke="#0f766e" strokeWidth="2.2" strokeDasharray="5 4" className="vlab-dash-right" />
          <path d="M204 72 L214 77 L204 82" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Step 2: Test strip */}
          <rect x="218" y="24" width="164" height="106" rx="14" fill="#eef8f7" stroke="#0f766e" strokeWidth="2" />
          <text x="300" y="48" textAnchor="middle" className="vlab-box-title">2. {method.label}</text>
          <rect x="236" y="62" width="128" height="32" rx="8" fill="#ffffff" stroke="#99d2cb" />
          <text x="300" y="82" textAnchor="middle" className="vlab-mini-tag active">
            {methodId === "fit" ? "人血红蛋白专属抗体" : "广谱化学显色试剂"}
          </text>
          <text x="300" y="114" textAnchor="middle" className="vlab-mini-tag">
            {methodId === "fit" ? "只和「人血」配对" : "遇血红素即变色"}
          </text>

          {/* Arrow 2->3 */}
          <line x1="384" y1="77" x2="414" y2="77" stroke={isPositive ? "#c1453e" : "#0f766e"} strokeWidth="2.2" strokeDasharray="5 4" className="vlab-dash-right" />
          <path d="M408 72 L418 77 L408 82" fill="none" stroke={isPositive ? "#c1453e" : "#0f766e"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Step 3: Output */}
          <rect
            x="422"
            y="24"
            width="160"
            height="106"
            rx="14"
            fill={isPositive ? "#fff5f5" : "#eef8f7"}
            stroke={isPositive ? "#e07a73" : "#0f766e"}
            strokeWidth="2"
          />
          <text x="502" y="48" textAnchor="middle" className="vlab-box-title">3. 试纸读数</text>
          <rect
            x="456"
            y="62"
            width="92"
            height="28"
            rx="14"
            fill={isPositive ? "#c1453e" : "#0f766e"}
          />
          <text x="502" y="80" textAnchor="middle" style={{ fontSize: "12px", fontWeight: 700, fill: "#ffffff" }}>
            {isPositive ? (isDiet ? "可能假阳性" : "潜血阳性 (+)") : "潜血阴性 (-)"}
          </text>
          <text x="502" y="114" textAnchor="middle" className={isPositive ? "vlab-mini-tag warn" : "vlab-mini-tag active"}>
            {isPositive ? (isDiet ? "需忌口后复查" : "提示需找出血点") : "成功排除饮食干扰"}
          </text>

          {/* Bottom bar: Positive != Cancer, 4 common bleeding sources */}
          <rect x="18" y="144" width="564" height="62" rx="12" fill="#ffffff" stroke="#dce7ea" />
          <text x="34" y="166" className="vlab-mini-tag active">阳性不等于肠癌，医生会按线索排查多种常见来源：</text>
          {[
            { x: 34, w: 120, t: "痔疮 / 肛裂" },
            { x: 168, w: 124, t: "消化道炎症 / 溃疡" },
            { x: 306, w: 120, t: "肠道息肉" },
            { x: 440, w: 126, t: "需肠镜核实的病变" },
          ].map((b) => (
            <g key={b.t}>
              <rect x={b.x} y="175" width={b.w} height="22" rx="11" fill="#f1f8f7" stroke="#c3dfdc" />
              <text x={b.x + b.w / 2} y="190" textAnchor="middle" className="vlab-mini-tag">{b.t}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{method.label} · {resultText}</b>
        </div>
        <p>
          {method.summary}
          <Citation ids={method.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}
