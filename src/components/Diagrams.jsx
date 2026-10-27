import React from "react";

// Self-made mechanism diagrams are inline SVG, not <img> files: an external SVG
// cannot use the page's @font-face, so Chinese labels would fall back to the
// device font. Inline text also stays selectable and readable by assistive tech.
// Each diagram is keyed by the figure key used in public/content.
//
// The viewBox is kept narrow (520) so that at 320–430px phone widths the 20px
// labels still render at roughly 14px instead of shrinking into illegibility.

const sans = "var(--sans)";
const ink = "var(--ink)";
const ink2 = "var(--ink-2)";
const ink3 = "var(--ink-3)";
const accent = "var(--accent)";
const ruleStrong = "var(--rule-strong)";
const wash = "var(--accent-wash)";

const boxStyle = { fill: "none", stroke: ruleStrong, strokeWidth: 1.5, rx: 3 };
const centerStyle = { fill: wash, stroke: accent, strokeWidth: 1.5, rx: 3 };

function Frame({ children, viewBox, title, description, id, labelledBy }) {
  return (
    <svg
      className="diagram"
      viewBox={viewBox}
      role="img"
      aria-labelledby={labelledBy || `${id}-title`}
      focusable="false"
    >
      <title id={`${id}-title`}>{title}</title>
      <desc>{description}</desc>
      {children}
    </svg>
  );
}

export function GlucoseFlow(id) {
  const arrow = `url(#${id}-arrow)`;
  return (
    <Frame
      id={id}
      viewBox="0 0 520 300"
      title="葡萄糖进入血液后的去向"
      description="食物中的碳水化合物消化为葡萄糖进入血液；胰岛素向细胞发出信号，葡萄糖进入肌肉和脂肪细胞供能，多余部分由肝脏储存，空腹时再释放。"
    >
      <defs>
        <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={accent} />
        </marker>
      </defs>

      <rect {...boxStyle} x="8" y="118" width="150" height="70" />
      <text x="83" y="146" fontSize="19" textAnchor="middle" fill={ink} fontFamily={sans}>食物中的</text>
      <text x="83" y="170" fontSize="19" textAnchor="middle" fill={ink} fontFamily={sans}>碳水化合物</text>

      <path d="M162 153 H186" fill="none" stroke={accent} strokeWidth="2" markerEnd={arrow} />
      <text x="174" y="140" fontSize="14" textAnchor="middle" fill={ink3} fontFamily={sans}>消化</text>

      <rect {...centerStyle} x="190" y="112" width="120" height="82" />
      <text x="250" y="146" fontSize="19" textAnchor="middle" fill={ink} fontFamily={sans}>葡萄糖</text>
      <text x="250" y="170" fontSize="19" textAnchor="middle" fill={ink} fontFamily={sans}>进入血液</text>

      <path d="M310 136 C344 136 336 66 400 66" fill="none" stroke={accent} strokeWidth="2" markerEnd={arrow} />
      <path d="M310 170 C344 170 336 240 400 240" fill="none" stroke={accent} strokeWidth="2" markerEnd={arrow} />
      <text x="352" y="146" fontSize="13" textAnchor="middle" fill={ink3} fontFamily={sans}>胰岛素</text>
      <text x="352" y="164" fontSize="13" textAnchor="middle" fill={ink3} fontFamily={sans}>信号</text>

      <rect {...boxStyle} x="404" y="28" width="108" height="76" />
      <text x="458" y="58" fontSize="17" textAnchor="middle" fill={ink} fontFamily={sans}>细胞摄取</text>
      <text x="458" y="82" fontSize="14" textAnchor="middle" fill={ink2} fontFamily={sans}>用于供能</text>

      <rect {...boxStyle} x="404" y="202" width="108" height="76" />
      <text x="458" y="232" fontSize="17" textAnchor="middle" fill={ink} fontFamily={sans}>肝脏储存</text>
      <text x="458" y="256" fontSize="14" textAnchor="middle" fill={ink2} fontFamily={sans}>空腹再释放</text>
    </Frame>
  );
}

export function GlucoseWindows(id) {
  const axisStyle = { stroke: ruleStrong, strokeWidth: 1.5 };
  const dot = { fill: accent };
  return (
    <Frame
      id={id}
      viewBox="0 0 520 300"
      title="三项血糖检查覆盖的时间范围"
      description="空腹血糖与口服葡萄糖耐量试验描述某个时段的血糖变化；糖化血红蛋白覆盖约过去两到三个月的平均水平。"
    >
      <text x="8" y="26" fontSize="19" fill={ink} fontFamily={sans}>空腹血糖</text>
      <text x="8" y="48" fontSize="15" fill={ink2} fontFamily={sans}>至少 8 小时未摄入热量</text>
      <line {...axisStyle} x1="460" y1="18" x2="460" y2="212" strokeDasharray="4 6" />
      <circle {...dot} cx="460" cy="22" r="6" />

      <text x="8" y="96" fontSize="19" fill={ink} fontFamily={sans}>口服葡萄糖耐量试验</text>
      <text x="8" y="118" fontSize="15" fill={ink2} fontFamily={sans}>喝下葡萄糖溶液后按时间点采样</text>
      <path d="M372 132 C400 104 428 98 460 104" fill="none" stroke={accent} strokeWidth="2" />
      <circle {...dot} cx="372" cy="132" r="5" />
      <circle {...dot} cx="460" cy="104" r="5" />
      <text x="378" y="152" fontSize="14" fill={ink3} fontFamily={sans}>数小时</text>

      <text x="8" y="182" fontSize="19" fill={ink} fontFamily={sans}>糖化血红蛋白</text>
      <text x="8" y="204" fontSize="15" fill={ink2} fontFamily={sans}>约过去 2–3 个月的平均水平</text>
      <rect x="286" y="172" width="174" height="18" rx="3" fill={wash} />
      <line x1="286" y1="181" x2="460" y2="181" stroke={accent} strokeWidth="2.5" />
      <circle {...dot} cx="460" cy="181" r="6" />

      <line {...axisStyle} x1="8" y1="228" x2="460" y2="228" />
      <text x="8" y="252" fontSize="14" fill={ink3} fontFamily={sans}>过去</text>
      <text x="400" y="252" fontSize="14" fill={ink3} fontFamily={sans}>抽血当天</text>
      <circle {...dot} cx="8" cy="278" r="4.5" />
      <text x="20" y="283" fontSize="14" fill={ink3} fontFamily={sans}>抽血时间点</text>
      <rect x="128" y="271" width="20" height="12" rx="2" fill={wash} />
      <text x="156" y="283" fontSize="14" fill={ink3} fontFamily={sans}>覆盖范围</text>
      <text x="330" y="283" fontSize="14" fill={ink3} fontFamily={sans}>横轴不按比例</text>
    </Frame>
  );
}

export function StairsHeart(id) {
  const arrow = `url(#${id}-arrow)`;
  return (
    <Frame
      id={id}
      viewBox="0 0 520 240"
      title="爬楼时肌肉、心脏与肺如何配合"
      description="爬楼时腿部肌肉需要更多含氧血液；心脏加快跳动把血液送向肺，肺为血液补充氧气，含氧血液再被送到正在用力的肌肉。"
    >
      <defs>
        <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={accent} />
        </marker>
      </defs>

      <rect {...centerStyle} x="8" y="34" width="130" height="76" />
      <text x="73" y="66" fontSize="18" textAnchor="middle" fill={ink} fontFamily={sans}>腿部肌肉</text>
      <text x="73" y="90" fontSize="15" textAnchor="middle" fill={ink2} fontFamily={sans}>需要更多氧</text>

      <path d="M142 72 H186" fill="none" stroke={accent} strokeWidth="2" markerEnd={arrow} />

      <rect {...boxStyle} x="190" y="34" width="130" height="76" />
      <text x="255" y="66" fontSize="18" textAnchor="middle" fill={ink} fontFamily={sans}>心脏加快</text>
      <text x="255" y="90" fontSize="15" textAnchor="middle" fill={ink2} fontFamily={sans}>跳动与泵血</text>

      <path d="M324 72 H368" fill="none" stroke={accent} strokeWidth="2" markerEnd={arrow} />

      <rect {...centerStyle} x="372" y="34" width="140" height="76" />
      <text x="442" y="66" fontSize="18" textAnchor="middle" fill={ink} fontFamily={sans}>肺补充氧气</text>
      <text x="442" y="90" fontSize="15" textAnchor="middle" fill={ink2} fontFamily={sans}>呼吸变快变深</text>

      <path d="M442 114 C442 170 300 176 255 176" fill="none" stroke={accent} strokeWidth="2" markerEnd={arrow} />
      <path d="M251 176 C200 176 73 170 73 118" fill="none" stroke={accent} strokeWidth="2" markerEnd={arrow} />
      <text x="258" y="198" fontSize="14" textAnchor="middle" fill={ink3} fontFamily={sans}>含氧血液送到肌肉</text>
    </Frame>
  );
}

export function PressurePulse(id) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 260"
      title="收缩压与舒张压是一次搏动周期里的高点和低点"
      description="心脏收缩泵血时，动脉内压力升高到收缩压；心脏舒张、两次搏动之间，压力回落到舒张压，但不会降到零。"
    >
      <path d="M30 200 C60 200 66 96 96 96 C126 96 132 200 166 200 C196 200 202 96 232 96 C262 96 268 200 302 200 C332 200 338 96 368 96 C398 96 404 200 438 200 H490"
        fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      <line x1="30" y1="200" x2="490" y2="200" stroke="var(--rule-strong)" strokeWidth="1.5" />
      <line x1="30" y1="96" x2="490" y2="96" stroke="var(--rule-strong)" strokeWidth="1" strokeDasharray="4 6" />

      <text x="30" y="80" fontSize="17" fill="var(--ink)" fontFamily="var(--sans)">收缩压</text>
      <text x="30" y="224" fontSize="17" fill="var(--ink)" fontFamily="var(--sans)">舒张压</text>
      <text x="366" y="240" fontSize="14" fill="var(--ink-3)" fontFamily="var(--sans)">时间 →</text>
      <text x="30" y="34" fontSize="14" fill="var(--ink-3)" fontFamily="var(--sans)">动脉内压力（示意，非真实数值）</text>
    </Frame>
  );
}

export function LipidTransport(id) {
  const arrow = `url(#${id}-arrow)`;
  return (
    <Frame
      id={id}
      viewBox="0 0 520 260"
      title="脂蛋白把胆固醇和甘油三酯运向不同方向"
      description="肝脏合成并释放脂蛋白，LDL 把胆固醇送往身体组织，HDL 参与把胆固醇运回肝脏；甘油三酯是能量的储存形式。"
    >
      <defs>
        <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
        </marker>
      </defs>

      <rect {...centerStyle} x="16" y="92" width="120" height="76" />
      <text x="76" y="124" fontSize="18" textAnchor="middle" fill="var(--ink)" fontFamily="var(--sans)">肝脏</text>
      <text x="76" y="148" fontSize="14" textAnchor="middle" fill="var(--ink-2)" fontFamily="var(--sans)">合成与处理</text>

      <path d="M140 112 C180 112 178 58 218 58" fill="none" stroke="var(--accent)" strokeWidth="2" markerEnd={arrow} />
      <path d="M218 186 C178 186 180 148 140 148" fill="none" stroke="var(--clay)" strokeWidth="2" markerEnd={arrow} />
      <text x="176" y="40" fontSize="14" fill="var(--ink-3)" fontFamily="var(--sans)">LDL 运出</text>
      <text x="160" y="212" fontSize="14" fill="var(--clay)" fontFamily="var(--sans)">HDL 运回</text>

      <rect {...boxStyle} x="222" y="22" width="132" height="74" />
      <text x="288" y="52" fontSize="17" textAnchor="middle" fill="var(--ink)" fontFamily="var(--sans)">身体组织</text>
      <text x="288" y="76" fontSize="14" textAnchor="middle" fill="var(--ink-2)" fontFamily="var(--sans)">细胞使用胆固醇</text>

      <rect {...boxStyle} x="360" y="112" width="146" height="72" />
      <text x="433" y="140" fontSize="17" textAnchor="middle" fill="var(--ink)" fontFamily="var(--sans)">甘油三酯</text>
      <text x="433" y="164" fontSize="14" textAnchor="middle" fill="var(--ink-2)" fontFamily="var(--sans)">能量储存形式</text>
      <path d="M358 58 C420 58 430 84 430 108" fill="none" stroke="var(--rule-strong)" strokeWidth="2" strokeDasharray="5 5" markerEnd={arrow} />

      <text x="16" y="242" fontSize="14" fill="var(--ink-3)" fontFamily="var(--sans)">箭头表示主要方向，不代表数量、速度或完整代谢路径。</text>
    </Frame>
  );
}

export function LabRange(id) {
  const arrow = `url(#${id}-arrow)`;
  const band = { fill: "var(--accent-wash)" };
  return (
    <Frame
      id={id}
      viewBox="0 0 520 300"
      title="同一份样本在两套测量体系中的位置"
      description="同一份样本送进两家实验室，使用不同方法和仪器，得到略有差异的数值；每个数值各自对照本实验室的参考区间。"
    >
      <defs>
        <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={accent} />
        </marker>
      </defs>

      <rect {...boxStyle} x="8" y="112" width="110" height="70" />
      <text x="63" y="142" fontSize="17" textAnchor="middle" fill={ink} fontFamily={sans}>同一份</text>
      <text x="63" y="166" fontSize="17" textAnchor="middle" fill={ink} fontFamily={sans}>血液样本</text>

      <path d="M122 132 C150 132 148 72 176 72" fill="none" stroke={accent} strokeWidth="2" markerEnd={arrow} />
      <path d="M122 162 C150 162 148 222 176 222" fill="none" stroke={accent} strokeWidth="2" markerEnd={arrow} />

      <text x="204" y="46" fontSize="15" fill={ink3} fontFamily={sans}>A 实验室</text>
      <rect {...boxStyle} x="180" y="54" width="120" height="56" />
      <text x="240" y="88" fontSize="15" textAnchor="middle" fill={ink2} fontFamily={sans}>方法 · 仪器 A</text>
      <rect {...band} x="316" y="68" width="196" height="18" rx="3" />
      <text x="316" y="104" fontSize="13" fill={ink3} fontFamily={sans}>A 的参考区间</text>
      <circle cx="384" cy="77" r="7" fill={accent} />
      <text x="398" y="60" fontSize="13" fill={accent} fontFamily={sans}>结果</text>

      <text x="204" y="196" fontSize="15" fill={ink3} fontFamily={sans}>B 实验室</text>
      <rect {...boxStyle} x="180" y="204" width="120" height="56" />
      <text x="240" y="238" fontSize="15" textAnchor="middle" fill={ink2} fontFamily={sans}>方法 · 仪器 B</text>
      <rect {...band} x="330" y="218" width="182" height="18" rx="3" />
      <text x="330" y="254" fontSize="13" fill={ink3} fontFamily={sans}>B 的参考区间</text>
      <circle cx="404" cy="227" r="7" fill={accent} />
      <text x="418" y="210" fontSize="13" fill={accent} fontFamily={sans}>结果</text>

      <text x="8" y="288" fontSize="13" fill={ink3} fontFamily={sans}>两条区间不完全相同，数值位置也会变化；图中刻度不代表真实比例。</text>
    </Frame>
  );
}

const registry = {
  "glucose-flow": GlucoseFlow,
  "glucose-windows": GlucoseWindows,
  "stairs-heart": StairsHeart,
  "pressure-pulse": PressurePulse,
  "lipid-transport": LipidTransport,
  "lab-range": LabRange,
};

export const diagramFor = key => registry[key] || null;
