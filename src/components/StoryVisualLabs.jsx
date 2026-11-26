import React, { useState } from "react";
import { Citation } from "./ContentUI";

/* -------------------------------------------------------------------------- */
/* Story 1: B超 / X光 / CT / MRI 四维选型对照图 (imaging-guide)                */
/* -------------------------------------------------------------------------- */
const IMAGING_MODES = [
  {
    id: "us",
    label: "B 超 / 彩超",
    principle: "高频声波反射成像",
    radiation: "无电离辐射",
    radTone: "safe",
    bestFor: "甲状腺、乳腺、肝胆胰脾肾、血管血流与浅表软组织",
    limit: "声波怕气体和厚骨骼，不适合穿透肺泡或颅骨看深层",
    summary: "超声用探头发射声波并接收回声，没有辐射、可实时动态观察，因此成为体检筛查肝胆肾、甲状腺、乳腺与颈动脉的首选窗口。",
    sourceIds: ["ultrasound", "diag-img"],
  },
  {
    id: "xray",
    label: "X 光（平片）",
    principle: "X 射线平面穿透投影",
    radiation: "极低剂量电离辐射",
    radTone: "mild",
    bestFor: "快速初筛骨折、胸廓骨骼与明显肺部大范围病变",
    limit: "把立体身体压成一张平面图，前后组织重叠容易遮挡细微结节",
    summary: "X 光快且便捷，但像把一本书压扁成一张透明纸，肋骨与心脏后方的小病灶容易被重叠遮住，因此肺结节精细观察常改用 CT。",
    sourceIds: ["xrays", "diag-img"],
  },
  {
    id: "ct",
    label: "CT（断层扫描）",
    principle: "X 射线 360° 旋转切薄片",
    radiation: "有电离辐射（低剂量肺 CT 剂量较低）",
    radTone: "mild",
    bestFor: "肺部微小结节、骨骼细微结构、胸腹部急症与快速断层",
    limit: "对韧带、脑白质等精细软组织对比度不如 MRI",
    summary: "CT 把身体一层层「切薄片」再电脑重建，彻底解决 X 光前后重叠问题，是看肺部细节与急诊快速排查的利器。",
    sourceIds: ["ctscans", "diag-img"],
  },
  {
    id: "mri",
    label: "核磁共振（MRI）",
    principle: "强磁场与射频脉冲共振",
    radiation: "无电离辐射",
    radTone: "safe",
    bestFor: "大脑、脊髓、椎间盘、关节韧带及软组织精细定性",
    limit: "检查时间较长、噪声明显，体内有不兼容金属植入物者受限",
    summary: "MRI 不使用 X 射线，对含水量不同的软组织分辨力极高，但扫描慢且怕气体移动，所以很少拿来查肺部常规筛查。",
    sourceIds: ["mriscans", "diag-img"],
  },
];

export function ImagingGuideLab({ detail }) {
  const [modeId, setModeId] = useState("us");
  const cur = IMAGING_MODES.find((m) => m.id === modeId) || IMAGING_MODES[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择影像检查类型对比">
        {IMAGING_MODES.map((m) => (
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
        <div className="vlab-subhead">成像原理与强项分工示意（它们是不同视角，不是贵就一定全能）</div>
        <svg className="vlab-svg" viewBox="0 0 600 214" role="img" aria-label="B超、X光、CT 与 MRI 成像原理与适用部位对比示意图">
          <rect x="0" y="0" width="600" height="214" rx="12" fill="#f7fbfb" />

          {/* Left schematic stage */}
          <rect x="18" y="18" width="214" height="178" rx="14" fill="#ffffff" stroke="#cddde0" strokeWidth="1.6" />
          <text x="125" y="42" textAnchor="middle" className="vlab-box-title">{cur.label}</text>

          {modeId === "us" && (
            <g>
              <rect x="97" y="56" width="56" height="20" rx="6" fill="#0f766e" />
              <path d="M98 88 Q125 100 152 88" fill="none" stroke="#0f766e" strokeWidth="2.2" />
              <path d="M86 104 Q125 120 164 104" fill="none" stroke="#2d9e95" strokeWidth="2" />
              <path d="M74 120 Q125 140 176 120" fill="none" stroke="#7ec4bc" strokeWidth="1.8" />
              <ellipse cx="125" cy="148" rx="44" ry="20" fill="#eef8f7" stroke="#0f766e" strokeWidth="1.8" />
              <text x="125" y="152" textAnchor="middle" className="vlab-mini-tag active">声波回声实时成像</text>
            </g>
          )}
          {modeId === "xray" && (
            <g>
              <circle cx="125" cy="64" r="10" fill="#d97706" />
              <line x1="125" y1="74" x2="72" y2="152" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="5 4" />
              <line x1="125" y1="74" x2="125" y2="152" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="5 4" />
              <line x1="125" y1="74" x2="178" y2="152" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="5 4" />
              <ellipse cx="125" cy="116" rx="44" ry="22" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.6" />
              <rect x="64" y="154" width="122" height="14" rx="4" fill="#334155" />
              <text x="125" y="184" textAnchor="middle" className="vlab-mini-tag">单方向穿透压成平面</text>
            </g>
          )}
          {modeId === "ct" && (
            <g>
              <circle cx="125" cy="116" r="46" fill="none" stroke="#0f766e" strokeWidth="2.5" strokeDasharray="9 5" />
              <rect x="92" y="92" width="66" height="10" rx="4" fill="#d5efec" stroke="#0f766e" strokeWidth="1.2" />
              <rect x="92" y="111" width="66" height="10" rx="4" fill="#99d2cb" stroke="#0f766e" strokeWidth="1.4" />
              <rect x="92" y="130" width="66" height="10" rx="4" fill="#d5efec" stroke="#0f766e" strokeWidth="1.2" />
              <text x="125" y="182" textAnchor="middle" className="vlab-mini-tag active">360° 逐层断层薄片</text>
            </g>
          )}
          {modeId === "mri" && (
            <g>
              <rect x="66" y="72" width="118" height="80" rx="34" fill="#eef4ff" stroke="#2563eb" strokeWidth="2.2" />
              <ellipse cx="125" cy="112" rx="34" ry="22" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.6" />
              <path d="M52 112 L74 112 M176 112 L198 112" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
              <text x="125" y="116" textAnchor="middle" className="vlab-mini-tag" style={{ fill: "#1d4ed8" }}>强磁场共振</text>
              <text x="125" y="182" textAnchor="middle" className="vlab-mini-tag">软组织高清精细分辨</text>
            </g>
          )}

          {/* Right structured spec cards */}
          <rect x="248" y="18" width="334" height="48" rx="12" fill="#ffffff" stroke="#dce7ea" />
          <text x="264" y="38" className="vlab-mini-tag">成像原理与辐射</text>
          <text x="264" y="56" className="vlab-box-title" style={{ fontSize: "13.5px" }}>{cur.principle}</text>
          <rect
            x="456"
            y="28"
            width="114"
            height="26"
            rx="13"
            fill={cur.radTone === "safe" ? "#e6f6f4" : "#fef3c7"}
            stroke={cur.radTone === "safe" ? "#84ccc3" : "#f59e0b"}
          />
          <text
            x="513"
            y="45"
            textAnchor="middle"
            className="vlab-mini-tag"
            style={{ fill: cur.radTone === "safe" ? "#0f766e" : "#b45309", fontWeight: 700 }}
          >
            {cur.radTone === "safe" ? "无电离辐射" : "含低剂量 X 线"}
          </text>

          <rect x="248" y="76" width="334" height="56" rx="12" fill="#eef8f7" stroke="#9fd3cd" />
          <text x="264" y="96" className="vlab-mini-tag active">最擅长看的部位</text>
          <text x="264" y="118" className="vlab-mini-tag" style={{ fill: "#1b2d33" }}>{cur.bestFor}</text>

          <rect x="248" y="142" width="334" height="54" rx="12" fill="#fff8f1" stroke="#f0cca8" />
          <text x="264" y="162" className="vlab-mini-tag" style={{ fill: "#b45309" }}>天然局限 / 注意</text>
          <text x="264" y="183" className="vlab-mini-tag" style={{ fill: "#4b5563" }}>{cur.limit}</text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.label}</b>
          <span>{cur.radiation}</span>
        </div>
        <p>
          {cur.summary}
          <Citation ids={cur.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Story 2: 95% Reference Range Bell Curve Explorer (lab-range)               */
/* -------------------------------------------------------------------------- */
const RANGE_MODES = [
  {
    id: "ninetyfive",
    label: "95% 健康人群分布",
    shift: 0,
    caption: "常规参考区间常取健康参照人群中间约 95% 的范围，两端各有约 2.5% 的健康人天生落在界线外。",
    summary: "参考区间是给「一大群健康人」画出的常见范围，而不是非黑即白的「生病分界线」。抽血一次查几十项时，健康人偶有一项贴边出现小箭头并不少见，必须结合症状和复查判断。",
    sourceIds: ["lab-results"],
  },
  {
    id: "subgroup",
    label: "按年龄 / 性别分组差异",
    shift: 28,
    caption: "不同性别、年龄段或生理期的人群分布中心不同，因此同一项目常有分组参考区间。",
    summary: "例如血红蛋白、尿酸或部分激素水平在不同性别与年龄人群中天生存在差异；对照单子时要先确认区间是否匹配你的分组。",
    sourceIds: ["lab-results", "blood-tests"],
  },
  {
    id: "method",
    label: "两家医院仪器与方法不同",
    shift: -26,
    caption: "同一管血在不同检测试剂、仪器和单位体系下，测出的读数与配套区间会整体平移。",
    summary: "甲医院的数值不能直接拿去套乙医院的参考区间；比较不同机构的报告时，应同时核对检验方法、计量单位与该单自带的参考范围。",
    sourceIds: ["lab-results", "prepare"],
  },
];

export function LabRangeLab({ detail }) {
  const [modeId, setModeId] = useState("ninetyfive");
  const cur = RANGE_MODES.find((m) => m.id === modeId) || RANGE_MODES[0];
  const dx = cur.shift;

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换参考区间差异原因">
        {RANGE_MODES.map((m) => (
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
        <div className="vlab-subhead">统计学分布概念图（横轴不含真实数值，仅示意区间如何划定与平移）</div>
        <svg className="vlab-svg" viewBox="0 0 600 210" role="img" aria-label="实验室参考区间 95% 健康人群分布及跨机构偏移示意图">
          <rect x="0" y="0" width="600" height="210" rx="12" fill="#f7fbfb" />

          {/* Baseline axis */}
          <line x1="40" y1="158" x2="560" y2="158" stroke="#9bb7bc" strokeWidth="1.6" />

          {/* Ghost original curve when shifted */}
          {dx !== 0 && (
            <path
              d="M66 158 C130 156 178 144 216 96 C248 52 272 34 300 34 C328 34 352 52 384 96 C422 144 470 156 534 158"
              fill="none"
              stroke="#b8cdd1"
              strokeWidth="1.8"
              strokeDasharray="5 4"
            />
          )}

          {/* Active bell curve group */}
          <g transform={`translate(${dx}, 0)`}>
            {/* Middle 95% shaded region */}
            <path
              d="M150 158 L150 144 C178 134 196 118 216 96 C248 52 272 34 300 34 C328 34 352 52 384 96 C404 118 422 134 450 144 L450 158 Z"
              fill="#0f766e"
              fillOpacity="0.16"
            />
            {/* Left & right 2.5% tails */}
            <path d="M66 158 C108 157 132 152 150 144 L150 158 Z" fill="#c1453e" fillOpacity="0.28" />
            <path d="M450 144 C468 152 492 157 534 158 L450 158 Z" fill="#c1453e" fillOpacity="0.28" />
            {/* Bell curve stroke */}
            <path
              d="M66 158 C130 156 178 144 216 96 C248 52 272 34 300 34 C328 34 352 52 384 96 C422 144 470 156 534 158"
              fill="none"
              stroke="#0f766e"
              strokeWidth="2.8"
            />
            {/* Interval markers */}
            <line x1="150" y1="74" x2="150" y2="164" stroke="#0f766e" strokeWidth="1.6" strokeDasharray="4 3" />
            <line x1="450" y1="74" x2="450" y2="164" stroke="#0f766e" strokeWidth="1.6" strokeDasharray="4 3" />
            <text x="300" y="96" textAnchor="middle" className="vlab-box-title" style={{ fill: "#0f766e" }}>约 95% 参考区间</text>
            <text x="300" y="116" textAnchor="middle" className="vlab-mini-tag">多数健康人落在此区间内</text>
            <text x="108" y="142" textAnchor="middle" className="vlab-mini-tag warn">约 2.5%</text>
            <text x="492" y="142" textAnchor="middle" className="vlab-mini-tag warn">约 2.5%</text>
          </g>

          <rect x="28" y="174" width="544" height="26" rx="8" fill="#ffffff" stroke="#dce7ea" />
          <text x="300" y="191" textAnchor="middle" className="vlab-mini-tag active">{cur.caption}</text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.label}</b>
          <span>以本张报告自带参考区间为准</span>
        </div>
        <p>
          {cur.summary}
          <Citation ids={cur.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Story 3: Pre-test 72h Interference Timeline (pre-test-factors)             */
/* -------------------------------------------------------------------------- */
const PRETEST_SLOTS = [
  {
    id: "72h",
    time: "前 2–3 天",
    event: "剧烈运动 / 力量训练",
    affected: ["转氨酶（尤其 AST）", "血肌酐", "尿常规（一过性潜血/蛋白）"],
    summary: "高强度跑步、撸铁后肌肉微损伤会释放部分肌酶与肌酐，也可能引发短暂运动性尿液变化，容易在报告上制造「假箭头」。",
    sourceIds: ["prepare", "liver-tests"],
  },
  {
    id: "24h",
    time: "前 1 天",
    event: "饮酒与高脂高嘌呤大餐",
    affected: ["甘油三酯（TG）", "转氨酶 / GGT", "血尿酸"],
    summary: "前一晚宵夜、火锅或饮酒会显著抬高甘油三酯与尿酸，并短时间加重肝脏代谢负担；检验前保持平日清淡饮食更接近真实基线。",
    sourceIds: ["fasting", "liver-tests", "lab-results"],
  },
  {
    id: "night",
    time: "前一晚",
    event: "熬夜失眠 / 感冒发烧",
    affected: ["血压与心率", "空腹血糖", "白细胞计数（感染期）"],
    summary: "睡眠不足或处于感冒发烧阶段时，应激激素与免疫细胞都会处于活跃状态；若正在急性感染期，建议告知医生或避开恢复后再查常规体检。",
    sourceIds: ["lab-results", "blood-tests"],
  },
  {
    id: "morning",
    time: "当天早晨",
    event: "赶路紧张 / 长时间未喝水",
    affected: ["诊室血压与心率", "心电图窦速", "尿液浓缩（比重偏高）"],
    summary: "一路小跑赶排队、没休息就上袖带或完全不敢喝一口白水，都会让血压、心率和尿浓缩度偏离静息状态。",
    sourceIds: ["prepare", "lab-results"],
  },
];

export function PreTestFactorsLab({ detail }) {
  const [slotId, setSlotId] = useState("24h");
  const cur = PRETEST_SLOTS.find((s) => s.id === slotId) || PRETEST_SLOTS[1];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择体检前时间节点">
        {PRETEST_SLOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={slotId === s.id}
            className={slotId === s.id ? "active" : ""}
            onClick={() => setSlotId(s.id)}
          >
            {s.time} · {s.event.split(" / ")[0]}
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">点击时间轴节点：查看不同阶段行为最容易牵动哪些指标短暂波动</div>
        <svg className="vlab-svg" viewBox="0 0 600 202" role="img" aria-label="体检前 72 小时至当天早晨生活干扰因素时间轴示意图">
          <rect x="0" y="0" width="600" height="202" rx="12" fill="#f7fbfb" />

          {/* Timeline track */}
          <line x1="70" y1="62" x2="530" y2="62" stroke="#c3d9dd" strokeWidth="3" strokeLinecap="round" />
          <line x1="70" y1="62" x2="530" y2="62" stroke="#0f766e" strokeWidth="2.5" strokeDasharray="7 5" className="vlab-dash-right" />

          {PRETEST_SLOTS.map((s, idx) => {
            const cx = 86 + idx * 142;
            const active = s.id === slotId;
            return (
              <g key={s.id} style={{ cursor: "pointer" }} onClick={() => setSlotId(s.id)}>
                <circle
                  cx={cx}
                  cy="62"
                  r={active ? 14 : 9}
                  fill={active ? "#0f766e" : "#ffffff"}
                  stroke="#0f766e"
                  strokeWidth="2.4"
                />
                <text x={cx} y="34" textAnchor="middle" className={active ? "vlab-svg-label active" : "vlab-svg-label"}>
                  {s.time}
                </text>
                <text x={cx} y="96" textAnchor="middle" className={active ? "vlab-mini-tag active" : "vlab-mini-tag"}>
                  {s.event.split(" / ")[0]}
                </text>
              </g>
            );
          })}

          {/* Highlighted affected indicators tray */}
          <rect x="20" y="114" width="560" height="72" rx="12" fill="#ffffff" stroke="#b8dad6" strokeWidth="1.6" />
          <text x="36" y="136" className="vlab-mini-tag active">
            当「{cur.event}」发生时，最常随之短暂波动的项目：
          </text>
          {cur.affected.map((item, i) => {
            const bx = 36 + i * 178;
            return (
              <g key={item}>
                <rect x={bx} y="148" width="166" height="26" rx="13" fill="#fff5f0" stroke="#f0c4a8" />
                <text x={bx + 83} y="165" textAnchor="middle" className="vlab-mini-tag" style={{ fill: "#b45309", fontWeight: 700 }}>
                  {item}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.time} · {cur.event}</b>
          <span>单次异常先核对采样背景</span>
        </div>
        <p>
          {cur.summary}
          <Citation ids={cur.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Story 4: Fasting Water & Medication Traffic Light (fasting-test)           */
/* -------------------------------------------------------------------------- */
const FASTING_ITEMS = [
  {
    id: "water",
    label: "少量白开水",
    status: "通常允许",
    tone: "safe",
    impact: "不含糖分与脂肪，不触发消化吸收高峰",
    summary: "绝大多数空腹抽血前允许小口喝少量白开水，既缓解口渴也能避免血液过度浓缩；如同时要做无痛胃镜等特殊项目，则需严格按该项禁水通知执行。",
    sourceIds: ["fasting", "prepare"],
  },
  {
    id: "drinks",
    label: "咖啡 / 茶 / 奶 / 果汁",
    status: "不算白开水 · 应避免",
    tone: "stop",
    impact: "含热量、糖脂或咖啡因，可扰动血糖、血脂与心率",
    summary: "黑咖啡、浓茶、牛奶、含糖饮料或嚼口香糖都不算「清水」，会刺激消化分泌或直接改变血糖、甘油三酯读数，应留到空腹项目完成后再喝。",
    sourceIds: ["fasting", "prepare"],
  },
  {
    id: "bp-meds",
    label: "日常降压药等处方药",
    status: "先确认 · 勿擅自停药",
    tone: "caution",
    impact: "贸然停用慢性病药物可能引起血压骤升等风险",
    summary: "长期服用的降压药、抗心律失常药等通常不建议自行擅停，可用一小口白开水按医嘱送服；不确定时请提前向开单医生或体检机构核实。",
    sourceIds: ["prepare", "lab-results"],
  },
  {
    id: "sugar-meds",
    label: "降糖药 / 胰岛素",
    status: "务必提前问医生",
    tone: "caution",
    impact: "空腹未进食时用药存在低血糖风险，需个体化安排",
    summary: "正在使用降糖药或胰岛素的人，体检当天怎么调整服药与进餐顺序必须事先咨询医生，并把早餐与药品带在身边，抽完空腹血后按指导处理。",
    sourceIds: ["fasting", "prepare"],
  },
];

export function FastingTestLab({ detail }) {
  const [itemId, setItemId] = useState("water");
  const cur = FASTING_ITEMS.find((i) => i.id === itemId) || FASTING_ITEMS[0];
  const colorMap = {
    safe: { bg: "#e6f6f4", border: "#0f766e", fg: "#0f766e" },
    caution: { bg: "#fef3c7", border: "#d97706", fg: "#b45309" },
    stop: { bg: "#fee2e2", border: "#c1453e", fg: "#c1453e" },
  };
  const palette = colorMap[cur.tone];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择空腹常见场景">
        {FASTING_ITEMS.map((i) => (
          <button
            key={i.id}
            type="button"
            aria-pressed={itemId === i.id}
            className={itemId === i.id ? "active" : ""}
            onClick={() => setItemId(i.id)}
          >
            {i.label}
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">空腹准备红绿灯示意（具体要求以开单医生与检查机构须知为准）</div>
        <svg className="vlab-svg" viewBox="0 0 600 186" role="img" aria-label="空腹抽血前喝水、饮品与日常用药红绿灯速查示意图">
          <rect x="0" y="0" width="600" height="186" rx="12" fill="#f7fbfb" />

          {/* Traffic light column */}
          <rect x="24" y="24" width="68" height="138" rx="22" fill="#1e293b" />
          <circle cx="58" cy="54" r="14" fill={cur.tone === "stop" ? "#ef4444" : "#475569"} />
          <circle cx="58" cy="93" r="14" fill={cur.tone === "caution" ? "#f59e0b" : "#475569"} />
          <circle cx="58" cy="132" r="14" fill={cur.tone === "safe" ? "#10b981" : "#475569"} />

          {/* Active detail board */}
          <rect x="112" y="24" width="466" height="138" rx="16" fill="#ffffff" stroke={palette.border} strokeWidth="2" />
          <rect x="132" y="42" width="164" height="28" rx="14" fill={palette.bg} stroke={palette.border} />
          <text x="214" y="60" textAnchor="middle" style={{ fontSize: "12.5px", fontWeight: 700, fill: palette.fg }}>
            {cur.status}
          </text>
          <text x="314" y="61" className="vlab-box-title">{cur.label}</text>

          <line x1="132" y1="86" x2="558" y2="86" stroke="#e5eef0" strokeWidth="1.2" />
          <text x="132" y="110" className="vlab-mini-tag active">对血液与检验的直接影响：</text>
          <text x="132" y="134" className="vlab-mini-tag" style={{ fill: "#1b2d33", fontSize: "13px" }}>{cur.impact}</text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.label} · {cur.status}</b>
        </div>
        <p>
          {cur.summary}
          <Citation ids={cur.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Story 5: Single-Year vs 3-Year Longitudinal Trend (report-history)         */
/* -------------------------------------------------------------------------- */
export function ReportHistoryLab({ detail }) {
  const [view, setView] = useState("trend");
  const isTrend = view === "trend";

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换单年视图与三年趋势视图">
        <button
          type="button"
          aria-pressed={view === "single"}
          className={view === "single" ? "active" : ""}
          onClick={() => setView("single")}
        >
          只看今年一张单子
        </button>
        <button
          type="button"
          aria-pressed={view === "trend"}
          className={view === "trend" ? "active" : ""}
          onClick={() => setView("trend")}
        >
          串联近三年旧报告
        </button>
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">概念趋势图：同样没有超标箭头，纵向连线却能一眼看出「稳定基线」与「逐年爬坡」的区别</div>
        <svg className="vlab-svg" viewBox="0 0 600 214" role="img" aria-label="单年孤立报告与三年纵向趋势对比示意图">
          <rect x="0" y="0" width="600" height="214" rx="12" fill="#f7fbfb" />

          {/* Reference band */}
          <rect x="64" y="48" width="490" height="104" rx="6" fill="#0f766e" fillOpacity="0.1" />
          <line x1="64" y1="48" x2="554" y2="48" stroke="#0f766e" strokeWidth="1.5" strokeDasharray="5 4" />
          <line x1="64" y1="152" x2="554" y2="152" stroke="#0f766e" strokeWidth="1.5" strokeDasharray="5 4" />
          <text x="74" y="40" className="vlab-mini-tag active">参考区间上限</text>
          <text x="74" y="170" className="vlab-mini-tag">参考区间下限</text>

          {/* X-axis years */}
          <text x="150" y="194" textAnchor="middle" className="vlab-svg-label">前 年</text>
          <text x="310" y="194" textAnchor="middle" className="vlab-svg-label">去 年</text>
          <text x="470" y="194" textAnchor="middle" className="vlab-svg-label active">今 年</text>

          {isTrend ? (
            <g>
              {/* Stable baseline comparison */}
              <path d="M150 112 L310 110 L470 113" fill="none" stroke="#64748b" strokeWidth="2.2" strokeDasharray="6 4" />
              <circle cx="150" cy="112" r="5" fill="#64748b" />
              <circle cx="310" cy="110" r="5" fill="#64748b" />
              <circle cx="470" cy="113" r="5" fill="#64748b" />
              <text x="344" y="132" className="vlab-mini-tag">情境 A：连年平稳基线</text>

              {/* Rising drift still inside range */}
              <path d="M150 138 L310 100 L470 60" fill="none" stroke="#c1453e" strokeWidth="3" />
              <circle cx="150" cy="138" r="6" fill="#c1453e" />
              <circle cx="310" cy="100" r="6" fill="#c1453e" />
              <circle cx="470" cy="60" r="7.5" fill="#c1453e" />
              <rect x="278" y="54" width="126" height="24" rx="12" fill="#fff5f5" stroke="#e07a73" />
              <text x="341" y="70" textAnchor="middle" className="vlab-mini-tag warn">情境 B：持续上移</text>
            </g>
          ) : (
            <g>
              <circle cx="470" cy="60" r="8" fill="#0f766e" />
              <rect x="330" y="52" width="124" height="40" rx="10" fill="#ffffff" stroke="#0f766e" />
              <text x="392" y="69" textAnchor="middle" className="vlab-mini-tag active">今年读数在区间内</text>
              <text x="392" y="85" textAnchor="middle" className="vlab-mini-tag">看不出是稳还是涨</text>
            </g>
          )}
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{isTrend ? "串联旧报告：比「有没有箭头」更早看见趋势" : "孤立看今年：难以分辨「天生偏高」还是「近期走高」"}</b>
        </div>
        <p>
          {isTrend
            ? "同一项指标或影像（如结节、息肉、血糖、血脂），哪怕今年还在参考区间内，若连续几年同向缓慢抬升，医生往往会建议提前调整生活方式或安排随访；相反，若多年形态与数值始终纹丝不动，反而最能让人安心。"
            : "单看今年这一个点，你不知道它过去三年是一直稳稳待在这里，还是从底部一路爬到了上限边缘。对比时也要先核对两年的检测机构、方法与单位是否一致。"}
          <Citation ids={["lab-results", "diag-img"]} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Story 6: Climbing Stairs Heart Rate & Oxygen Demand (stairs-heart)         */
/* -------------------------------------------------------------------------- */
const STAIRS_STATES = [
  {
    id: "rest",
    label: "安静坐着",
    bpmLabel: "基础节律",
    demandW: 72,
    flowColor: "#0f766e",
    summary: "安静休息时，腿部和全身肌肉耗氧很少，心脏以从容的节奏即可把含氧血送遍全身，呼吸也轻而平稳。",
    sourceIds: ["heart", "pulse"],
  },
  {
    id: "climb",
    label: "连爬几层楼梯",
    bpmLabel: "加快 + 更有力",
    demandW: 210,
    flowColor: "#c1453e",
    summary: "爬楼时大腿大块肌肉瞬间需要大量氧气和能量：肺加快换气、心脏既提高跳动频率也增加单次泵血量，共同把含氧血加速送往腿部。",
    sourceIds: ["activity", "flow", "lungs"],
  },
  {
    id: "recover",
    label: "停下来后继续喘一阵",
    bpmLabel: "逐步回落补氧",
    demandW: 138,
    flowColor: "#d97706",
    summary: "脚步刚停下，肌肉刚才累积的代谢产物和「氧债」还没清完，因此心跳与呼吸会在几分钟内缓慢平复，这属于正常生理恢复过程。",
    sourceIds: ["activity", "heart", "lungs"],
  },
];

export function StairsHeartLab({ detail }) {
  const [stateId, setStateId] = useState("climb");
  const cur = STAIRS_STATES.find((s) => s.id === stateId) || STAIRS_STATES[1];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择活动阶段">
        {STAIRS_STATES.map((s) => (
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
        <div className="vlab-subhead">心肺供氧联动示意：肌肉先发出「要用氧」信号 → 呼吸加深 + 心跳加速响应</div>
        <svg className="vlab-svg" viewBox="0 0 600 198" role="img" aria-label="爬楼梯时肺部摄氧、心脏加速泵血与腿部肌肉耗氧联动示意图">
          <rect x="0" y="0" width="600" height="198" rx="12" fill="#f7fbfb" />

          {/* 3 linked organ/system cards */}
          <rect x="20" y="26" width="154" height="96" rx="14" fill="#eef8f7" stroke="#0f766e" strokeWidth="1.8" />
          <text x="97" y="54" textAnchor="middle" className="vlab-box-title">1. 双肺换气</text>
          <text x="97" y="76" textAnchor="middle" className="vlab-mini-tag">吸入更多新鲜氧气</text>
          <text x="97" y="102" textAnchor="middle" className="vlab-mini-tag active">
            {stateId === "rest" ? "呼吸轻而平缓" : stateId === "climb" ? "呼吸加深加快" : "延续换气补氧"}
          </text>

          <line x1="176" y1="74" x2="218" y2="74" stroke={cur.flowColor} strokeWidth="2.8" strokeDasharray="6 4" className="vlab-dash-right" />
          <path d="M212 68 L222 74 L212 80" fill="none" stroke={cur.flowColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          <rect x="224" y="26" width="154" height="96" rx="14" fill="#ffffff" stroke={cur.flowColor} strokeWidth="2.2" />
          <text x="301" y="54" textAnchor="middle" className="vlab-box-title">2. 心脏泵血</text>
          <text x="301" y="76" textAnchor="middle" className="vlab-mini-tag">心输出量 = 频率 × 每次量</text>
          <text x="301" y="102" textAnchor="middle" style={{ fontSize: "12px", fontWeight: 700, fill: cur.flowColor }}>
            {cur.bpmLabel}
          </text>

          <line x1="380" y1="74" x2="422" y2="74" stroke={cur.flowColor} strokeWidth="2.8" strokeDasharray="6 4" className="vlab-dash-right" />
          <path d="M416 68 L426 74 L416 80" fill="none" stroke={cur.flowColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          <rect x="428" y="26" width="152" height="96" rx="14" fill="#fff8f1" stroke="#e3b685" strokeWidth="1.8" />
          <text x="504" y="54" textAnchor="middle" className="vlab-box-title">3. 腿部肌肉</text>
          <text x="504" y="76" textAnchor="middle" className="vlab-mini-tag">抬升体重 · 迅速耗氧</text>
          <text x="504" y="102" textAnchor="middle" className="vlab-mini-tag" style={{ fill: "#b45309", fontWeight: 700 }}>
            {stateId === "rest" ? "低耗氧待机" : stateId === "climb" ? "高负荷急需氧气" : "偿还代谢氧债"}
          </text>

          {/* Oxygen demand meter bar */}
          <rect x="20" y="140" width="560" height="40" rx="10" fill="#ffffff" stroke="#dce7ea" />
          <text x="36" y="164" className="vlab-mini-tag active">当前全身供氧需求水平：</text>
          <rect x="196" y="152" width="240" height="16" rx="8" fill="#e6eff1" />
          <rect x="196" y="152" width={cur.demandW} height="16" rx="8" fill={cur.flowColor} />
          <text x="452" y="164" className="vlab-mini-tag" style={{ fill: cur.flowColor, fontWeight: 700 }}>
            {cur.label}
          </text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.label}</b>
          <span>若伴胸痛、明显头晕或休息很久不回落应及时就医</span>
        </div>
        <p>
          {cur.summary}
          <Citation ids={cur.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Story 7: White Coat BP vs Standardized Home Baseline (white-coat-bp)       */
/* -------------------------------------------------------------------------- */
export function WhiteCoatBpLab({ detail }) {
  const [scene, setScene] = useState("clinic");
  const isClinic = scene === "clinic";

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换测压环境对比">
        <button
          type="button"
          aria-pressed={isClinic}
          className={isClinic ? "active" : ""}
          onClick={() => setScene("clinic")}
        >
          诊室 / 体检现场单次测
        </button>
        <button
          type="button"
          aria-pressed={!isClinic}
          className={!isClinic ? "active" : ""}
          onClick={() => setScene("home")}
        >
          居家安静连续多日记录
        </button>
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">环境波动概念对比（纵轴仅示意相对高低起伏，不含血压诊断切点）</div>
        <svg className="vlab-svg" viewBox="0 0 600 206" role="img" aria-label="诊室白大衣效应血压脉冲与居家安静连续记录基线对比示意图">
          <rect x="0" y="0" width="600" height="206" rx="12" fill="#f7fbfb" />

          {/* Calm home baseline band */}
          <rect x="34" y="102" width="532" height="50" rx="8" fill="#0f766e" fillOpacity="0.1" />
          <text x="46" y="118" className="vlab-mini-tag active">平时真实基础水平带</text>

          {/* Waveform */}
          <path
            d="M46 138 L120 134 L186 140 L248 132 L300 44 L344 130 L416 136 L484 133 L548 137"
            fill="none"
            stroke={isClinic ? "#c1453e" : "#0f766e"}
            strokeWidth="2.8"
            strokeLinejoin="round"
          />

          {/* Highlight node */}
          {isClinic ? (
            <g>
              <circle cx="300" cy="44" r="8" fill="#c1453e" />
              <rect x="322" y="24" width="234" height="52" rx="10" fill="#fff5f5" stroke="#e07a73" />
              <text x="336" y="45" className="vlab-mini-tag warn">白大衣短暂冲高</text>
              <text x="336" y="64" className="vlab-mini-tag">赶路、排队、紧张→交感神经兴奋</text>
            </g>
          ) : (
            <g>
              <circle cx="120" cy="134" r="6" fill="#0f766e" />
              <circle cx="186" cy="140" r="6" fill="#0f766e" />
              <circle cx="416" cy="136" r="6" fill="#0f766e" />
              <circle cx="484" cy="133" r="6" fill="#0f766e" />
              <rect x="322" y="24" width="234" height="52" rx="10" fill="#eef8f7" stroke="#84ccc3" />
              <text x="336" y="45" className="vlab-mini-tag active">居家早晚连续记录</text>
              <text x="336" y="64" className="vlab-mini-tag">静坐 5 分钟 + 上臂与心脏齐平</text>
            </g>
          )}

          {/* Bottom 3 tips */}
          <rect x="34" y="164" width="532" height="28" rx="8" fill="#ffffff" stroke="#dce7ea" />
          <text x="300" y="182" textAnchor="middle" className="vlab-mini-tag">
            规范自测要点：测前静坐 5 分钟 · 排空膀胱不憋尿 · 靠背坐直双脚平放不跷腿
          </text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{isClinic ? "体检现场偏高：先排除紧张与姿势干扰" : "家庭记录与动态监测：帮医生看清真实水平"}</b>
        </div>
        <p>
          {isClinic
            ? "在陌生诊室、刚爬完楼、憋尿、说话或袖带绑在厚衣服外面测血压，都可能让单次读数明显高于平时。遇到体检偏高不必恐慌，但也不应盲目忽视。"
            : "带上连续数日规范记录的居家早晚血压本去复诊，必要时配合医生做 24 小时动态血压监测，才能客观区分「单纯白大衣效应」与需要长期管理的血压升高。"}
          <Citation ids={["bp-diag", "bp-meas"]} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}
