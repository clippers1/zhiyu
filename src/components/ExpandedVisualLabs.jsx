import React, { useState } from "react";
import { Citation } from "./ContentUI";

/* -------------------------------------------------------------------------- */
/* 18. Hepatitis B 5-Marker Panel Decoder (hepatitis-b)                       */
/* -------------------------------------------------------------------------- */
const HBV_MARKERS = [
  { key: "HBsAg", short: "1. 表面抗原", role: "病毒外壳信号" },
  { key: "HBsAb", short: "2. 表面抗体", role: "保护性免疫盾" },
  { key: "HBeAg", short: "3. e 抗原", role: "复制活跃信号" },
  { key: "HBeAb", short: "4. e 抗体", role: "复制趋弱信号" },
  { key: "HBcAb", short: "5. 核心抗体", role: "曾经接触印记" },
];

const HBV_PATTERNS = [
  {
    id: "vaccine",
    label: "仅第 2 项阳性（疫苗保护）",
    signs: ["-", "+", "-", "-", "-"],
    tag: "理想保护状态",
    tone: "safe",
    summary: "只有表面抗体（HBsAb）阳性，说明通过接种乙肝疫苗已经建立起对乙肝病毒的保护性免疫力，体内并没有乙肝病毒。",
    sourceIds: ["hbv-panel", "hbv-cdc"],
  },
  {
    id: "all-neg",
    label: "五项全阴性",
    signs: ["-", "-", "-", "-", "-"],
    tag: "未感染 · 也缺乏保护抗体",
    tone: "neutral",
    summary: "五项全部阴性说明目前没有感染乙肝病毒，但体内也缺乏足够的保护性表面抗体；一般成年人可向医生或接种点咨询是否需要接种或补种乙肝疫苗。",
    sourceIds: ["hbv-panel", "hbv-cdc"],
  },
  {
    id: "big-three",
    label: "1 · 3 · 5 阳性（俗称大三阳）",
    signs: ["+", "-", "+", "-", "+"],
    tag: "表面抗原 + e 抗原阳性",
    tone: "warn",
    summary: "提示存在乙肝病毒感染且病毒复制通常较活跃，但「大三阳」只是血清学模式名称，不直接等同于肝脏受损程度；必须联合肝功能（ALT/AST）、HBV-DNA 与肝脏超声由专科医生综合评估。",
    sourceIds: ["hbv-panel", "hbv-niddk"],
  },
  {
    id: "small-three",
    label: "1 · 4 · 5 阳性（俗称小三阳）",
    signs: ["+", "-", "-", "+", "+"],
    tag: "表面抗原 + e 抗体阳性",
    tone: "caution",
    summary: "提示存在乙肝病毒感染且 e 抗原已转为 e 抗体；并不代表「一定没事、不用复查」，少数人仍可能存在病毒活跃或隐匿肝损伤，同样要定期核对肝功能、HBV-DNA 与肝脏 B 超。",
    sourceIds: ["hbv-panel", "hbv-niddk"],
  },
  {
    id: "recovered",
    label: "2 · 4 · 5 或 2 · 5 阳性（既往恢复）",
    signs: ["-", "+", "-", "+", "+"],
    tag: "曾经接触 · 已产生保护抗体",
    tone: "safe",
    summary: "表面抗原阴性而表面抗体与核心抗体阳性，多见于过去曾接触过乙肝病毒并已依靠自身免疫清除恢复，如今已获得保护性抗体。",
    sourceIds: ["hbv-panel", "hbv-info"],
  },
];

export function HepatitisBPanelLab({ detail }) {
  const [patternId, setPatternId] = useState("vaccine");
  const cur = HBV_PATTERNS.find((p) => p.id === patternId) || HBV_PATTERNS[0];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换常见乙肝五项组合">
        {HBV_PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={patternId === p.id}
            className={patternId === p.id ? "active" : ""}
            onClick={() => setPatternId(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">乙肝两对半五项示意：先记口诀「抗原（Ag）= 病毒信号，抗体（Ab）= 免疫反应」</div>
        <svg className="vlab-svg" viewBox="0 0 600 206" role="img" aria-label="乙肝五项两对半常见阴阳组合对照示意图">
          <rect x="0" y="0" width="600" height="206" rx="12" fill="#f7fbfb" />

          {HBV_MARKERS.map((m, idx) => {
            const x = 18 + idx * 114;
            const pos = cur.signs[idx] === "+";
            const isProtect = pos && m.key === "HBsAb";
            const stroke = !pos ? "#cfdce0" : isProtect ? "#0f766e" : m.key.endsWith("Ag") ? "#c1453e" : "#d97706";
            const bg = !pos ? "#ffffff" : isProtect ? "#e6f6f4" : m.key.endsWith("Ag") ? "#fff5f5" : "#fef9ec";
            return (
              <g key={m.key}>
                <rect x={x} y="20" width="106" height="126" rx="14" fill={bg} stroke={stroke} strokeWidth={pos ? 2.2 : 1.4} />
                <text x={x + 53} y="44" textAnchor="middle" className="vlab-box-title" style={{ fontSize: "13.5px" }}>
                  {m.key}
                </text>
                <text x={x + 53} y="62" textAnchor="middle" className="vlab-mini-tag">
                  {m.short}
                </text>
                <circle cx={x + 53} cy="94" r="18" fill={pos ? stroke : "#edf3f5"} />
                <text
                  x={x + 53}
                  y="100"
                  textAnchor="middle"
                  style={{ fontSize: "18px", fontWeight: 700, fill: pos ? "#ffffff" : "#64748b" }}
                >
                  {cur.signs[idx]}
                </text>
                <text x={x + 53} y="132" textAnchor="middle" className="vlab-mini-tag" style={{ fontSize: "10.5px" }}>
                  {m.role}
                </text>
              </g>
            );
          })}

          <rect x="18" y="160" width="564" height="32" rx="10" fill="#ffffff" stroke="#dce7ea" />
          <text x="300" y="180" textAnchor="middle" className="vlab-mini-tag active">
            读单关键：{cur.tag} · 五项只是「身份牌」，评估肝脏状态须结合肝功能、HBV-DNA 与超声
          </text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.label}</b>
          <span>{cur.tag}</span>
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
/* 19. GI Endoscopy Report Terms & Polyp Comparison (gi-endoscopy)            */
/* -------------------------------------------------------------------------- */
const GI_TERMS = [
  {
    id: "superficial",
    label: "非萎缩性 / 浅表性胃炎",
    badge: "胃镜最常见描述",
    depth: "仅在黏膜最表层轻微充血或水肿",
    summary: "这是成年人胃镜报告里出现频率极高的描述，指胃黏膜最表层有轻度充血或散在红斑，但深层腺体并未明显变薄；很多人并无明显不适，常与饮食不规律、熬夜、刺激性食物或幽门螺杆菌有关。",
    sourceIds: ["gastritis", "upper-gi"],
  },
  {
    id: "atrophic",
    label: "萎缩性胃炎 / 肠化",
    badge: "需按医生建议规律随访",
    depth: "胃黏膜固有腺体变薄或出现结构替代",
    summary: "「萎缩」不是指整个胃变小，而是显微镜下胃黏膜表层腺体数量减少，常伴随肠上皮化生。它属于慢性黏膜改变，需要查清是否合并幽门螺杆菌并按消化科医生建议定期复查，不必直接等同于胃癌。",
    sourceIds: ["gastritis", "upper-gi"],
  },
  {
    id: "polyp",
    label: "增生性息肉 vs 腺瘤性息肉",
    badge: "外观难分 · 病理定性",
    depth: "向管腔凸起的小肉芽，不同病理类型风险不同",
    summary: "肠镜或胃镜里看到的小凸起统称「息肉」。增生性或炎性息肉通常恶变倾向极低；腺瘤性息肉则被视为需要规范切除并定期复查的癌前病变。仅靠肉眼很难百分百定性，切下或夹取后送病理切片才是金标准。",
    sourceIds: ["colon-polyps", "colonoscopy"],
  },
  {
    id: "biopsy",
    label: "为什么写「取活检待病理」？",
    badge: "常规核实步骤 · 不等于确诊",
    depth: "用微细活检钳轻夹米粒大黏膜在显微镜下看细胞",
    summary: "很多人看到「取活检」瞬间吓坏，其实内镜医生在发现红斑、糜烂、息肉或可疑幽门螺杆菌改变时，常规都会夹取一两毫米表层黏膜送显微镜核实，就像「把模糊照片放大看清像素」，本身并不代表已经查出恶性病变。",
    sourceIds: ["upper-gi", "colonoscopy"],
  },
];

export function GiEndoscopyLab({ detail }) {
  const [termId, setTermId] = useState("polyp");
  const cur = GI_TERMS.find((t) => t.id === termId) || GI_TERMS[2];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择胃肠镜常见报告词">
        {GI_TERMS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={termId === t.id}
            className={termId === t.id ? "active" : ""}
            onClick={() => setTermId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">内镜观察与黏膜层次概念示意：先看表面形态，必要时靠病理显微镜定性</div>
        <svg className="vlab-svg" viewBox="0 0 600 208" role="img" aria-label="胃肠镜检查黏膜层次、息肉类型与活检病理流程示意图">
          <rect x="0" y="0" width="600" height="208" rx="12" fill="#f7fbfb" />

          {/* Left: Endoscope view schematic */}
          <rect x="18" y="18" width="268" height="172" rx="14" fill="#ffffff" stroke="#cddde0" strokeWidth="1.6" />
          <text x="152" y="40" textAnchor="middle" className="vlab-box-title">内镜视野与黏膜剖面</text>

          {/* Soft mucosa base layers */}
          <rect x="36" y="132" width="232" height="22" rx="6" fill="#e6f4f2" stroke="#9fd3cd" />
          <rect x="36" y="156" width="232" height="18" rx="5" fill="#dce7ea" />
          <text x="50" y="147" className="vlab-mini-tag">黏膜表层</text>
          <text x="50" y="169" className="vlab-mini-tag">深层肌壁</text>

          {/* Scope light cone */}
          <path d="M98 58 L62 126 L142 126 Z" fill="#0f766e" fillOpacity="0.1" />
          <rect x="86" y="48" width="24" height="14" rx="5" fill="#0f766e" />

          {/* Context visual cue */}
          {termId === "superficial" && (
            <ellipse cx="176" cy="132" rx="34" ry="7" fill="#fca5a5" fillOpacity="0.65" />
          )}
          {termId === "atrophic" && (
            <rect x="140" y="138" width="94" height="12" rx="4" fill="#fde68a" stroke="#d97706" strokeWidth="1.4" />
          )}
          {termId === "polyp" && (
            <g>
              <path d="M150 132 Q158 102 174 102 Q190 102 198 132" fill="#f97316" fillOpacity="0.28" stroke="#d97706" strokeWidth="2" />
              <text x="174" y="94" textAnchor="middle" className="vlab-mini-tag warn">息肉隆起</text>
            </g>
          )}
          {termId === "biopsy" && (
            <g>
              <line x1="176" y1="68" x2="176" y2="122" stroke="#0f766e" strokeWidth="2.2" strokeDasharray="4 3" />
              <circle cx="176" cy="128" r="7" fill="#eef8f7" stroke="#0f766e" strokeWidth="2" />
              <text x="176" y="88" textAnchor="middle" className="vlab-mini-tag active">微夹取样</text>
            </g>
          )}

          {/* Right: Structured breakdown */}
          <rect x="304" y="18" width="278" height="172" rx="14" fill="#eef8f7" stroke="#99d2cb" strokeWidth="1.6" />
          <rect x="320" y="34" width="156" height="24" rx="12" fill="#0f766e" />
          <text x="398" y="50" textAnchor="middle" style={{ fontSize: "11.5px", fontWeight: 700, fill: "#ffffff" }}>
            {cur.badge}
          </text>
          <text x="320" y="82" className="vlab-box-title" style={{ fontSize: "14.5px" }}>{cur.label}</text>
          <text x="320" y="106" className="vlab-mini-tag active">镜下看到的是什么：</text>
          <text x="320" y="126" className="vlab-mini-tag" style={{ fill: "#1b2d33" }}>{cur.depth}</text>
          <line x1="320" y1="142" x2="564" y2="142" stroke="#c3dfdc" />
          <text x="320" y="162" className="vlab-mini-tag">检查准备提示：胃镜需空腹，肠镜需规范清肠；</text>
          <text x="320" y="179" className="vlab-mini-tag">肠道准备越干净，越不易漏看微小息肉。</text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.label}</b>
          <span>最终定性以病理报告为准</span>
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
/* 20. Cervical Screening Dual-Track: TCT vs HPV (cervical-screening)         */
/* -------------------------------------------------------------------------- */
const CERVICAL_SCENES = [
  {
    id: "transient",
    label: "HPV 阳性，但 TCT 细胞正常",
    tctStatus: "细胞形态规整",
    hpvStatus: "检出病毒线索",
    outcome: "多数人在免疫系统作用下可自行清除，需按医生要求定期复查观察是否「持续感染」",
    summary: "体检检出 HPV 阳性在育龄女性中非常常见，绝不等于得了宫颈癌。绝大多数感染是一过性的，人体自身免疫力常可在一段时间后将其清除；只有高危型病毒长期持续存在，才可能逐步引发细胞异常。",
    sourceIds: ["hpv-test", "hpv-info", "nci-cervical"],
  },
  {
    id: "dual-neg",
    label: "TCT 与 HPV 双阴性",
    tctStatus: "未见异常细胞",
    hpvStatus: "未检出高危病毒",
    outcome: "当前风险极低，按常规筛查周期保持规律检查即可",
    summary: "TCT 从显微镜下看宫颈脱落细胞形态有没有变形，HPV 从分子层面查有没有高危病毒隐患。两项同时阴性提供了较高的安全保障，无需短期内反复焦虑加测。",
    sourceIds: ["pap-smear", "nci-cervical"],
  },
  {
    id: "followup",
    label: "TCT 提示细胞异常或高危持续阳性",
    tctStatus: "细胞提示需核实",
    hpvStatus: "高危型持续线索",
    outcome: "按妇科医生建议进一步做阴道镜检查，必要时定点活检明确级别",
    summary: "TCT 报告上出现 ASC-US、LSIL 等缩写，表示显微镜下看到部分细胞有轻度或待定变化，并不等于确诊癌症；阴道镜放大观察与定点组织病理才是明确是否需要干预的下一步。",
    sourceIds: ["pap-smear", "nci-cervical"],
  },
];

export function CervicalScreeningLab({ detail }) {
  const [sceneId, setSceneId] = useState("transient");
  const cur = CERVICAL_SCENES.find((s) => s.id === sceneId) || CERVICAL_SCENES[0];
  const hpvPos = sceneId !== "dual-neg";
  const tctAbn = sceneId === "followup";

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换 TCT 与 HPV 常见组合">
        {CERVICAL_SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={sceneId === s.id}
            className={sceneId === s.id ? "active" : ""}
            onClick={() => setSceneId(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">双轨互补示意：HPV 查「有没有病毒原因」，TCT 查「细胞有没有发生变化」</div>
        <svg className="vlab-svg" viewBox="0 0 600 202" role="img" aria-label="TCT 液基细胞学与 HPV 病毒检测双轨分工示意图">
          <rect x="0" y="0" width="600" height="202" rx="12" fill="#f7fbfb" />

          {/* Left track: TCT */}
          <rect
            x="20"
            y="22"
            width="266"
            height="108"
            rx="14"
            fill={tctAbn ? "#fff5f5" : "#eef8f7"}
            stroke={tctAbn ? "#e07a73" : "#0f766e"}
            strokeWidth="2"
          />
          <text x="153" y="48" textAnchor="middle" className="vlab-box-title">TCT（液基细胞学）</text>
          <text x="153" y="70" textAnchor="middle" className="vlab-mini-tag">显微镜看脱落细胞「长相」</text>
          <rect x="68" y="86" width="170" height="28" rx="14" fill="#ffffff" stroke={tctAbn ? "#e07a73" : "#9fd3cd"} />
          <text x="153" y="104" textAnchor="middle" className={tctAbn ? "vlab-mini-tag warn" : "vlab-mini-tag active"}>
            {cur.tctStatus}
          </text>

          {/* Right track: HPV */}
          <rect
            x="314"
            y="22"
            width="266"
            height="108"
            rx="14"
            fill={hpvPos ? "#fff8f1" : "#eef8f7"}
            stroke={hpvPos ? "#d97706" : "#0f766e"}
            strokeWidth="2"
          />
          <text x="447" y="48" textAnchor="middle" className="vlab-box-title">HPV 检测（病毒分型）</text>
          <text x="447" y="70" textAnchor="middle" className="vlab-mini-tag">分子查是否存在高危型病毒</text>
          <rect x="362" y="86" width="170" height="28" rx="14" fill="#ffffff" stroke={hpvPos ? "#f0cca8" : "#9fd3cd"} />
          <text x="447" y="104" textAnchor="middle" style={{ fontSize: "11.5px", fontWeight: 700, fill: hpvPos ? "#b45309" : "#0f766e" }}>
            {cur.hpvStatus}
          </text>

          {/* Bottom combined takeaway */}
          <rect x="20" y="146" width="560" height="40" rx="10" fill="#ffffff" stroke="#dce7ea" />
          <text x="300" y="170" textAnchor="middle" className="vlab-mini-tag active">
            联合阅读方向：{cur.outcome}
          </text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.label}</b>
          <span>接种 HPV 疫苗后仍需按规定定期筛查</span>
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
/* 21. Gynecologic Ultrasound Lab (gynecologic-ultrasound)                    */
/* -------------------------------------------------------------------------- */
const GYN_TOPICS = [
  {
    id: "route",
    label: "经腹（憋尿）vs 经阴超声",
    badge: "两种探头视角互补",
    leftTitle: "经腹超声（隔肚皮）",
    leftNote: "需适度憋尿借充盈膀胱作「声窗」，适合未有性生活者或观察较大范围",
    rightTitle: "经阴道超声（贴近观察）",
    rightNote: "无需憋尿、排空膀胱即可做，探头更靠近子宫卵巢，图像通常更清晰",
    summary: "两者都用无辐射声波成像。医生会根据是否已有性生活史、排查重点及个人舒适度选择合适方式，并不是「更痛才更高级」。",
    sourceIds: ["pelvic-us", "tv-us"],
  },
  {
    id: "cyst",
    label: "卵巢囊肿（生理性 vs 随访）",
    badge: "很多囊肿会自动消退",
    leftTitle: "常见生理性囊肿",
    leftNote: "如卵泡囊肿、黄体囊肿，随月经周期形成，常在 1–3 个周期后自然缩小消失",
    rightTitle: "持续存在或复杂囊肿",
    rightNote: "若多次在月经干净后复查仍存在或内部回声复杂，由妇科进一步评估",
    summary: "育龄期女性体检偶然查出单纯小囊肿非常常见，很多只是排卵周期的正常小水泡；医生常会建议在下次月经刚结束时复查，观察它是否已自行吸收。",
    sourceIds: ["ovarian-cysts", "tv-us"],
  },
  {
    id: "fibroid",
    label: "子宫肌瘤",
    badge: "最常见的良性实性结节",
    leftTitle: "绝大多数为良性",
    leftNote: "由子宫平滑肌细胞增生形成，很多体积不大、无症状者只需按期观察",
    rightTitle: "影响与「位置」密切相关",
    rightNote: "是否引起经量增多、压迫感或备孕考量，既看大小，更看长在肌壁间、浆膜下还是黏膜下",
    summary: "报告写着「子宫肌瘤」常常让人紧张，但它绝大多数属于良性结构改变；无需见瘤就动手术，结合有无经血过多、贫血或压迫症状再由专科决策。",
    sourceIds: ["fibroids", "pelvic-us"],
  },
  {
    id: "fluid",
    label: "少量盆腔积液",
    badge: "往往是正常生理润滑",
    leftTitle: "生理性少量积液",
    leftNote: "腹膜润滑液、排卵期卵泡液或经期少量倒流都可在超声下表现为少量液性暗区",
    rightTitle: "何时需要关注？",
    rightNote: "若积液量明显增多，或同时伴随下腹痛、发烧、异常分泌物，才需结合妇科查明原因",
    summary: "体检单上写着「盆腔少量积液」且平时没有任何肚子痛或发烧时，大多数属于完全正常的生理现象，千万不要被误导去做不必要的消炎灌注或理疗。",
    sourceIds: ["pelvic-us", "ovarian-cysts"],
  },
];

export function GynecologicUltrasoundLab({ detail }) {
  const [topicId, setTopicId] = useState("cyst");
  const cur = GYN_TOPICS.find((t) => t.id === topicId) || GYN_TOPICS[1];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="选择妇科超声常见疑问">
        {GYN_TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={topicId === t.id}
            className={topicId === t.id ? "active" : ""}
            onClick={() => setTopicId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">妇科超声高频报告词拆解（看清生理波动与需要专科随访的边界）</div>
        <svg className="vlab-svg" viewBox="0 0 600 194" role="img" aria-label="妇科超声常见发现与生理病理区分示意图">
          <rect x="0" y="0" width="600" height="194" rx="12" fill="#f7fbfb" />

          <rect x="20" y="20" width="270" height="122" rx="14" fill="#eef8f7" stroke="#0f766e" strokeWidth="1.8" />
          <text x="36" y="46" className="vlab-box-title" style={{ fontSize: "14px", fill: "#0f766e" }}>{cur.leftTitle}</text>
          <foreignObject x="34" y="56" width="242" height="76">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: "12.5px", lineHeight: 1.6, color: "#334e55" }}>
              {cur.leftNote}
            </div>
          </foreignObject>

          <rect x="310" y="20" width="270" height="122" rx="14" fill="#fff8f1" stroke="#e5b887" strokeWidth="1.8" />
          <text x="326" y="46" className="vlab-box-title" style={{ fontSize: "14px", fill: "#b45309" }}>{cur.rightTitle}</text>
          <foreignObject x="324" y="56" width="242" height="76">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: "12.5px", lineHeight: 1.6, color: "#4b5563" }}>
              {cur.rightNote}
            </div>
          </foreignObject>

          <rect x="20" y="154" width="560" height="26" rx="8" fill="#ffffff" stroke="#dce7ea" />
          <text x="300" y="171" textAnchor="middle" className="vlab-mini-tag active">
            核心要点：{cur.badge} · 复查建议尽量选在月经刚干净后的同一时间窗
          </text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.label}</b>
          <span>{cur.badge}</span>
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
/* 22. Prostate Ultrasound + PSA Non-Cancer Factors Lab (prostate-check)      */
/* -------------------------------------------------------------------------- */
const PROSTATE_VIEWS = [
  {
    id: "benign",
    label: "前列腺增生与钙化灶",
    highlight: "us",
    headline: "中老年男性超声极常见表现，不等于肿瘤",
    summary: "随着年龄增长，前列腺腺体常会生理性慢慢增大（良性前列腺增生，BPH）；而超声里的「前列腺钙化灶」往往就像过去轻微炎症愈合后留下的小疤痕点，没有症状时通常只需常规随访。",
    sourceIds: ["bph", "prostate-info"],
  },
  {
    id: "psa-noise",
    label: "为什么单次 PSA 升高不等于前列腺癌？",
    highlight: "psa",
    headline: "PSA 是「前列腺组织特有」，不是「癌症特有」",
    summary: "PSA 由正常和异常的前列腺细胞共同产生。良性前列腺增生、前列腺炎、尿路感染、近期剧烈骑行、排精、直肠指检或导尿操作，都可能把血 PSA 短暂推高。因此单次箭头需要排除干扰后复查。",
    sourceIds: ["psa-test", "nci-psa"],
  },
  {
    id: "combo",
    label: "医生怎么组合看超声、PSA 与趋势？",
    highlight: "both",
    headline: "结合游离/总 PSA 比例、纵向增速与专科评估",
    summary: "面对持续偏高的 PSA，泌尿外科医生通常会综合观察总 PSA（tPSA）与游离 PSA（fPSA）比值、历年变化速度、直肠指检与多参数核磁（mpMRI）结果，再审慎决定是否需要穿刺活检。",
    sourceIds: ["nci-psa", "psa-test"],
  },
];

export function ProstateCheckLab({ detail }) {
  const [viewId, setViewId] = useState("psa-noise");
  const cur = PROSTATE_VIEWS.find((v) => v.id === viewId) || PROSTATE_VIEWS[1];

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换前列腺检查观察角度">
        {PROSTATE_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={viewId === v.id}
            className={viewId === v.id ? "active" : ""}
            onClick={() => setViewId(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="vlab-canvas-card">
        <div className="vlab-subhead">超声看「大小与形态」+ 抽血看「PSA 蛋白线索」：为什么容易受良性因素影响</div>
        <svg className="vlab-svg" viewBox="0 0 600 202" role="img" aria-label="前列腺超声形态与血 PSA 非肿瘤干扰因素互补示意图">
          <rect x="0" y="0" width="600" height="202" rx="12" fill="#f7fbfb" />

          {/* Left: Ultrasound */}
          <rect
            x="20"
            y="20"
            width="256"
            height="122"
            rx="14"
            fill={cur.highlight !== "psa" ? "#eef8f7" : "#ffffff"}
            stroke={cur.highlight !== "psa" ? "#0f766e" : "#cfdce0"}
            strokeWidth={cur.highlight !== "psa" ? 2.2 : 1.4}
          />
          <text x="148" y="46" textAnchor="middle" className="vlab-box-title">前列腺超声（形态视角）</text>
          <text x="148" y="70" textAnchor="middle" className="vlab-mini-tag">看腺体大小、增生程度与残余尿</text>
          <rect x="44" y="86" width="96" height="26" rx="13" fill="#ffffff" stroke="#9fd3cd" />
          <text x="92" y="103" textAnchor="middle" className="vlab-mini-tag active">良性增生</text>
          <rect x="152" y="86" width="100" height="26" rx="13" fill="#ffffff" stroke="#9fd3cd" />
          <text x="202" y="103" textAnchor="middle" className="vlab-mini-tag active">常见钙化灶</text>

          {/* Right: PSA */}
          <rect
            x="300"
            y="20"
            width="280"
            height="122"
            rx="14"
            fill={cur.highlight !== "us" ? "#fff8f1" : "#ffffff"}
            stroke={cur.highlight !== "us" ? "#d97706" : "#cfdce0"}
            strokeWidth={cur.highlight !== "us" ? 2.2 : 1.4}
          />
          <text x="440" y="46" textAnchor="middle" className="vlab-box-title">血 PSA 检测（蛋白线索）</text>
          <text x="440" y="68" textAnchor="middle" className="vlab-mini-tag">多种良性情况都会短暂推高 PSA：</text>
          {[
            { x: 316, w: 76, t: "增生 / 炎症" },
            { x: 400, w: 80, t: "骑车 / 排精" },
            { x: 488, w: 76, t: "近期导尿" },
          ].map((chip) => (
            <g key={chip.t}>
              <rect x={chip.x} y="86" width={chip.w} height="26" rx="13" fill="#ffffff" stroke="#f0cca8" />
              <text x={chip.x + chip.w / 2} y="103" textAnchor="middle" className="vlab-mini-tag" style={{ fill: "#b45309" }}>
                {chip.t}
              </text>
            </g>
          ))}

          <rect x="20" y="156" width="560" height="30" rx="9" fill="#ffffff" stroke="#dce7ea" />
          <text x="300" y="175" textAnchor="middle" className="vlab-mini-tag active">
            核心判断原则：{cur.headline}
          </text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.label}</b>
          <span>抽血查 PSA 前常需遵医嘱避开剧烈骑行与局部操作</span>
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
/* 23. Vitamin D & Ferritin Reserve Lab (vitamin-d-ferritin)                  */
/* -------------------------------------------------------------------------- */
const NUTRIENT_MODES = [
  {
    id: "latent-iron",
    label: "铁蛋白偏低，但血红蛋白还正常？",
    tag: "先动用「仓库库存」，再影响「流动现金」",
    summary: "铁蛋白好比身体存铁的「仓库」，血红蛋白好比正在街上送氧的「流动现金」。缺铁早期，身体会先掏空铁蛋白仓库来保住血红蛋白正常，因此血常规看起来没贫血，人却可能已觉疲惫或掉发——查铁蛋白能更早看见储备见底。",
    sourceIds: ["ferritin-test", "iron-anemia"],
  },
  {
    id: "ferritin-high",
    label: "为什么铁蛋白升高不一定是「铁太多」？",
    tag: "铁蛋白同时也是「炎症急性期反应蛋白」",
    summary: "感冒发烧、脂肪肝、慢性炎症、饮酒或肝细胞受损时，肝脏也会大量释放铁蛋白，导致单次血铁蛋白显著升高。此时不能自行断定铁过载，常需结合肝功能、炎症指标（CRP）与转铁蛋白饱和度一起评估。",
    sourceIds: ["ferritin-test"],
  },
  {
    id: "vit-d",
    label: "维生素 D 为什么查 25(OH)D？",
    tag: "日照合成 + 饮食摄入 → 帮肠道吸收钙",
    summary: "血液中最稳定反映维生素 D 储备的指标是 25-羟维生素 D（25(OH)D）。长期室内办公、过度防晒或日照不足都容易让储备偏低；它像帮肠道打开「钙吸收闸门」的钥匙，与骨骼矿化（骨密度）密切相关，补充剂量应遵医生建议，避免盲目大剂量自补。",
    sourceIds: ["vitd-test", "vitd-info"],
  },
];

export function VitaminDFerritinLab({ detail }) {
  const [modeId, setModeId] = useState("latent-iron");
  const cur = NUTRIENT_MODES.find((m) => m.id === modeId) || NUTRIENT_MODES[0];
  const isVitD = modeId === "vit-d";
  const isHigh = modeId === "ferritin-high";

  return (
    <div className="vlab-body">
      <div className="vlab-pills" role="group" aria-label="切换维生素 D 与铁蛋白视角">
        {NUTRIENT_MODES.map((m) => (
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
        <div className="vlab-subhead">
          {isVitD ? "维生素 D 储备与钙吸收协同示意" : "铁蛋白「储备仓库」vs 血红蛋白「循环供氧」分工示意"}
        </div>
        <svg className="vlab-svg" viewBox="0 0 600 202" role="img" aria-label="铁蛋白储备与维生素 D 钙吸收原理示意图">
          <rect x="0" y="0" width="600" height="202" rx="12" fill="#f7fbfb" />

          {isVitD ? (
            <g>
              <rect x="20" y="26" width="164" height="110" rx="14" fill="#fff8eb" stroke="#f59e0b" strokeWidth="1.8" />
              <circle cx="102" cy="64" r="18" fill="#fbbf24" />
              <text x="102" y="104" textAnchor="middle" className="vlab-box-title" style={{ fontSize: "13.5px" }}>日照皮肤 + 饮食</text>
              <text x="102" y="124" textAnchor="middle" className="vlab-mini-tag">生成维生素 D 原料</text>

              <line x1="186" y1="81" x2="216" y2="81" stroke="#0f766e" strokeWidth="2.4" strokeDasharray="6 4" className="vlab-dash-right" />
              <path d="M210 75 L220 81 L210 87" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              <rect x="222" y="26" width="160" height="110" rx="14" fill="#eef8f7" stroke="#0f766e" strokeWidth="2" />
              <text x="302" y="60" textAnchor="middle" className="vlab-box-title" style={{ fontSize: "14px" }}>25(OH)D 储备</text>
              <text x="302" y="84" textAnchor="middle" className="vlab-mini-tag active">体检抽血测这一项</text>
              <text x="302" y="114" textAnchor="middle" className="vlab-mini-tag">经肝肾活化起效</text>

              <line x1="384" y1="81" x2="414" y2="81" stroke="#0f766e" strokeWidth="2.4" strokeDasharray="6 4" className="vlab-dash-right" />
              <path d="M408 75 L418 81 L408 87" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              <rect x="420" y="26" width="160" height="110" rx="14" fill="#ffffff" stroke="#9fd3cd" strokeWidth="1.8" />
              <text x="500" y="60" textAnchor="middle" className="vlab-box-title" style={{ fontSize: "14px" }}>肠道钙吸收 & 骨骼</text>
              <text x="500" y="84" textAnchor="middle" className="vlab-mini-tag">帮助维持血钙与骨矿化</text>
              <text x="500" y="114" textAnchor="middle" className="vlab-mini-tag active">常与骨密度协同关注</text>
            </g>
          ) : (
            <g>
              {/* Iron warehouse */}
              <rect
                x="24"
                y="24"
                width="244"
                height="116"
                rx="14"
                fill={isHigh ? "#fff5f5" : "#fff8eb"}
                stroke={isHigh ? "#e07a73" : "#d97706"}
                strokeWidth="2"
              />
              <text x="146" y="48" textAnchor="middle" className="vlab-box-title">铁蛋白（铁储备仓库）</text>
              <rect x="52" y="64" width="188" height="22" rx="11" fill="#edf3f5" />
              <rect
                x="52"
                y="64"
                width={isHigh ? 172 : 34}
                height="22"
                rx="11"
                fill={isHigh ? "#c1453e" : "#d97706"}
              />
              <text x="146" y="106" textAnchor="middle" className={isHigh ? "vlab-mini-tag warn" : "vlab-mini-tag"} style={{ fill: isHigh ? "#c1453e" : "#b45309", fontWeight: 700 }}>
                {isHigh ? "炎症/脂肪肝也会让读数虚高" : "库存告急：隐性缺铁最早信号"}
              </text>
              <text x="146" y="126" textAnchor="middle" className="vlab-mini-tag">
                {isHigh ? "需结合肝功与炎症指标同看" : "优先调出库存支援红细胞"}
              </text>

              <line x1="272" y1="82" x2="320" y2="82" stroke="#0f766e" strokeWidth="2.4" strokeDasharray="6 4" className="vlab-dash-right" />
              <path d="M314 76 L324 82 L314 88" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {/* Circulating Hb */}
              <rect x="330" y="24" width="246" height="116" rx="14" fill="#eef8f7" stroke="#0f766e" strokeWidth="2" />
              <text x="453" y="48" textAnchor="middle" className="vlab-box-title">血红蛋白（循环现金流）</text>
              <rect x="358" y="64" width="190" height="22" rx="11" fill="#d8eeec" />
              <rect x="358" y="64" width="142" height="22" rx="11" fill="#0f766e" />
              <text x="453" y="106" textAnchor="middle" className="vlab-mini-tag active">
                血常规里看到的 HGB 此时可能仍正常
              </text>
              <text x="453" y="126" textAnchor="middle" className="vlab-mini-tag">
                直到库存耗尽才会明显下降
              </text>
            </g>
          )}

          <rect x="20" y="156" width="560" height="30" rx="9" fill="#ffffff" stroke="#dce7ea" />
          <text x="300" y="175" textAnchor="middle" className="vlab-mini-tag active">
            核心要点：{cur.tag}
          </text>
        </svg>
      </div>

      <div className="vlab-explain" aria-live="polite">
        <div className="vlab-explain-head">
          <b>{cur.label}</b>
          <span>营养素补充须结合检验与医嘱，不建议盲目大剂量自补</span>
        </div>
        <p>
          {cur.summary}
          <Citation ids={cur.sourceIds} references={detail.references} prefix="article-source" />
        </p>
      </div>
    </div>
  );
}
