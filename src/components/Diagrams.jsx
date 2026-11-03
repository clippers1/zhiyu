import React from "react";
import {
  ACCENT,
  CLAY,
  CLAY_WASH,
  INK,
  INK_2,
  INK_3,
  RULE,
  SLATE,
  SLATE_WASH,
  WASH,
  SketchArrow,
  SketchCard,
  SketchDashed,
  SketchDot,
  SketchLine,
  SketchMarker,
  SketchPath,
} from "./Sketch";

// Self-made mechanism diagrams are inline SVG, not <img> files: an external SVG
// cannot reach the page's @font-face, so Chinese labels would fall back to the
// device font (and often to tofu). Inline text also stays selectable.
//
// Every figure uses the hand-drawn primitives in Sketch.jsx and a display face
// for its headline, so the set reads as one editorial system.
//
// Type sizes are picked for the narrowest phone: the canvas is 360 units wide
// and a 320px viewport renders it at about 280px, a scale of 0.78. Nothing in a
// figure is smaller than 14 units, so no label drops below ~11px on screen.
// Long explanations belong in the caption, not inside the drawing.

const sans = "var(--sans)";
const display = "var(--figure-display)";

const W = 360;
const LEFT = 8;
const INNER = 344;

function Frame({ children, height, title, description, id, labelledBy }) {
  return (
    <svg
      className="diagram"
      viewBox={`0 0 ${W} ${height}`}
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

function Label({ x, y, children, size = 14, color = INK, anchor = "start", weight, display: isDisplay }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={color}
      textAnchor={anchor}
      fontFamily={isDisplay ? display : sans}
      fontWeight={weight || (isDisplay ? 700 : 400)}
    >
      {children}
    </text>
  );
}

// Headline with the marker stroke underneath. `width` is measured from the
// text, not guessed: callers pass a value that clears the longest headline.
function Headline({ children, seed, width }) {
  return (
    <>
      <Label x={LEFT} y={26} size={22} color={INK} display>{children}</Label>
      <SketchMarker x={LEFT + 2} y={34} width={width} height={8} seed={seed} />
    </>
  );
}

// One full-width row: bold label plus a quiet second line. `width` lets a
// figure reserve a gutter on the right for a feedback line; `x` lets a branch
// indent its rows under a connector rail.
function Row({ x = LEFT, y, title, sub, tone = WASH, stroke = ACCENT, titleColor = ACCENT, seed, height = 58, width = INNER }) {
  // Baselines are derived from the card height so two-line text stays centred
  // and never touches the hand-drawn border, whatever the row height.
  const titleY = y + height / 2 - 5;
  const subY = y + height / 2 + 15;
  return (
    <>
      <SketchCard x={x} y={y} width={width} height={height} tone={tone} stroke={stroke} seed={seed} />
      <Label x={x + 16} y={titleY} size={17} color={titleColor}>{title}</Label>
      {sub && <Label x={x + 16} y={subY} size={14} color={INK_2}>{sub}</Label>}
    </>
  );
}

// A short downwards connector between two stacked rows.
function Drop({ fromY, toY, x = W / 2, seed }) {
  return <SketchArrow from={[x, fromY]} to={[x, toY]} seed={seed} />;
}

// A one-to-many connector for stacked rows: a short trunk, an elbow into the
// left margin, then one arrow into each row. Side-by-side columns would push
// the labels below the legible size on a phone, so the fan reads downwards.
function Tree({ fromY, targets, seed, indent = 30 }) {
  const spineX = LEFT + 10;
  const elbowY = fromY + 12;
  const last = targets[targets.length - 1];
  return (
    <>
      <SketchLine from={[W / 2, fromY]} to={[W / 2, elbowY]} color={ACCENT} seed={seed} width={2} />
      <SketchLine from={[W / 2, elbowY]} to={[spineX, elbowY]} color={ACCENT} seed={seed + 1} width={2} />
      <SketchLine from={[spineX, elbowY]} to={[spineX, last]} color={ACCENT} seed={seed + 2} width={2} />
      {targets.map((centerY, index) => (
        <SketchArrow key={index} from={[spineX, centerY]} to={[LEFT + indent - 2, centerY]} seed={seed + 3 + index} />
      ))}
    </>
  );
}

// A return path: out of the last row, up the right gutter, back into the
// first. Only the final segment carries an arrowhead, so it reads as one loop
// rather than three separate arrows — and it never crosses a card.
function Feedback({ seed, railX, fromX, fromY, toX, toY }) {
  return (
    <>
      <SketchLine from={[fromX, fromY]} to={[railX, fromY]} color={INK_3} seed={seed} width={1.6} dash={[6, 7]} />
      <SketchLine from={[railX, fromY]} to={[railX, toY]} color={INK_3} seed={seed + 1} width={1.6} dash={[6, 7]} />
      <SketchDashed from={[railX + 2, toY]} to={[toX, toY]} bow={0} color={INK_3} seed={seed + 2} />
    </>
  );
}

// Two destinations of the same signal, side by side under one arrow. Stacking
// them would read as a sequence, which is the wrong mechanism.
function Pair({ y, left, right, seed, height = 58 }) {
  const width = (INNER - 12) / 2;
  return (
    <>
      <SketchCard x={LEFT} y={y} width={width} height={height} tone={left.tone || WASH} stroke={left.stroke || ACCENT} seed={seed} />
      <Label x={LEFT + 14} y={y + 24} size={16} color={left.stroke || ACCENT}>{left.title}</Label>
      <Label x={LEFT + 14} y={y + 45} size={14} color={INK_2}>{left.sub}</Label>
      <SketchCard x={LEFT + width + 12} y={y} width={width} height={height} tone={right.tone || WASH} stroke={right.stroke || ACCENT} seed={seed + 1} />
      <Label x={LEFT + width + 26} y={y + 24} size={16} color={right.stroke || ACCENT}>{right.title}</Label>
      <Label x={LEFT + width + 26} y={y + 45} size={14} color={INK_2}>{right.sub}</Label>
    </>
  );
}

function Footnote({ y, children }) {
  return <Label x={LEFT} y={y} size={14} color={INK_2}>{children}</Label>;
}

export function GlucoseFlow({ id }) {
  return (
    <Frame
      id={id}
      height={292}
      title="葡萄糖进入血液后的去向"
      description="食物中的碳水化合物消化为葡萄糖进入血液；胰岛素向细胞发出信号，葡萄糖进入肌肉和脂肪细胞供能，多余部分由肝脏储存，空腹时再释放。"
    >
      <Headline seed={101} width={166}>葡萄糖去了哪里？</Headline>

      <Row y={44} title="食物中的碳水" sub="消化后变成葡萄糖" tone={CLAY_WASH} stroke={CLAY} titleColor={CLAY} seed={11} height={54} />
      <Drop fromY={98} toY={114} seed={12} />
      <Row y={118} title="进入血液" sub="胰岛素发出信号" seed={13} height={54} />
      <Drop fromY={172} toY={188} seed={14} />
      <Pair
        y={192}
        seed={15}
        left={{ title: "细胞摄取", sub: "用于供能" }}
        right={{ title: "肝脏储存", sub: "空腹再释放", tone: SLATE_WASH, stroke: SLATE }}
      />

      <Footnote y={276}>胰岛素不是「降糖药」，它是身体自己的调度信号。</Footnote>
    </Frame>
  );
}

export function GlucoseWindows({ id }) {
  return (
    <Frame
      id={id}
      height={332}
      title="三项血糖检查覆盖的时间范围"
      description="空腹血糖与口服葡萄糖耐量试验描述某个时段的血糖变化；糖化血红蛋白覆盖约过去两到三个月的平均水平。"
    >
      <Headline seed={201} width={166}>三个时间窗</Headline>

      <Row y={48} title="空腹血糖" sub="8 小时未进食" tone={CLAY_WASH} stroke={CLAY} titleColor={CLAY} seed={21} height={50} />
      <Row y={104} title="餐后 · 糖耐量" sub="喝糖水后按时间取样" seed={22} height={50} />
      <Row y={160} title="糖化血红蛋白" sub="近 2–3 个月的平均" tone={SLATE_WASH} stroke={SLATE} titleColor={SLATE} seed={23} height={50} />

      <SketchLine from={[LEFT + 4, 244]} to={[W - LEFT - 4, 244]} seed={24} width={2} />
      <SketchDot cx={20} cy={244} r={5} color={CLAY} />
      <SketchLine from={[20, 244]} to={[96, 244]} color={CLAY} seed={25} width={3} />
      <SketchDot cx={W - 20} cy={244} r={5} />
      <SketchLine from={[W - 172, 244]} to={[W - 20, 244]} color={SLATE} seed={26} width={3} />
      <Label x={LEFT} y={268} size={14} color={INK_3}>过去</Label>
      <Label x={W - LEFT} y={268} size={14} color={INK_3} anchor="end">抽血当天</Label>

      <Footnote y={306}>圆点是抽血时间，色条是覆盖范围；横轴不按比例。</Footnote>
    </Frame>
  );
}

export function StairsHeart({ id }) {
  // The return path (oxygenated blood back to the muscle) runs in a right
  // gutter so it never crosses the labels; the rows stop short for it.
  const cardWidth = INNER - 44;
  const railX = LEFT + INNER - 16;
  const centerX = (LEFT + cardWidth) / 2;
  return (
    <Frame
      id={id}
      height={306}
      title="爬楼时肌肉、心脏与肺如何配合"
      description="爬楼时腿部肌肉需要更多含氧血液；心脏加快跳动把血液送向肺，肺为血液补充氧气，含氧血液再被送到正在用力的肌肉。"
    >
      <Headline seed={301} width={186}>爬楼时发生了什么</Headline>

      <Row y={48} title="腿部肌肉" sub="需要更多氧" tone={CLAY_WASH} stroke={CLAY} titleColor={CLAY} seed={31} height={50} width={cardWidth} />
      <Drop fromY={98} toY={116} x={centerX} seed={32} />
      <Row y={120} title="心脏加快" sub="跳得更快、更有力" seed={33} height={50} width={cardWidth} />
      <Drop fromY={170} toY={188} x={centerX} seed={34} />
      <Row y={192} title="肺补充氧气" sub="呼吸变快变深" tone={SLATE_WASH} stroke={SLATE} titleColor={SLATE} seed={35} height={50} width={cardWidth} />

      <Feedback
        railX={railX}
        fromX={LEFT + cardWidth}
        fromY={217}
        toX={LEFT + cardWidth - 4}
        toY={73}
        seed={36}
      />
      <Footnote y={276}>含氧血液送回到正在用力的肌肉。</Footnote>
      <Footnote y={296}>这是临时调整，不是「心脏不好」的证据。</Footnote>
    </Frame>
  );
}

export function PressurePulse({ id }) {
  const pulse = "M16 150 C34 150 38 74 58 74 C78 74 82 150 102 150 C122 150 126 74 146 74 C166 74 170 150 190 150 C210 150 214 74 234 74 C254 74 258 150 278 150 C298 150 302 74 322 74 C336 74 338 110 344 122";
  return (
    <Frame
      id={id}
      height={268}
      title="收缩压与舒张压是一次搏动周期里的高点和低点"
      description="心脏收缩泵血时，动脉内压力升高到收缩压；心脏舒张、两次搏动之间，压力回落到舒张压，但不会降到零。"
    >
      <Headline seed={401} width={204}>一次心跳的两个数字</Headline>

      <SketchLine from={[16, 150]} to={[W - 16, 150]} seed={41} width={1.6} />
      <SketchLine from={[16, 74]} to={[W - 16, 74]} seed={42} width={1.2} dash={[5, 7]} />
      <SketchPath d={pulse} seed={43} width={2.6} />

      <Label x={16} y={62} size={15} color={INK}>收缩压</Label>
      <Label x={16} y={172} size={15} color={INK}>舒张压</Label>

      <Footnote y={206}>高度是示意，不是真实数值，也不代表任何分级标准。</Footnote>
      <Footnote y={228}>横轴是时间，波形经过简化。</Footnote>
    </Frame>
  );
}

export function LipidTransport({ id }) {
  // Two opposite directions, not one sequence: LDL runs out from the liver to
  // the tissues, HDL runs back. The return path sits in the right gutter with
  // its own short label, so the outbound arrow is never mistaken for the loop.
  const cardWidth = INNER - 44;
  const centerX = (LEFT + cardWidth) / 2;
  const railX = LEFT + INNER - 12;
  return (
    <Frame
      id={id}
      height={318}
      title="脂蛋白把胆固醇和甘油三酯运向不同方向"
      description="肝脏合成并释放脂蛋白，LDL 把胆固醇送往身体组织，HDL 参与把胆固醇运回肝脏；甘油三酯是能量的储存形式。"
    >
      <Headline seed={501} width={196}>两种方向相反的车</Headline>

      <Row y={48} title="肝脏" sub="合成并释放脂蛋白" seed={51} height={54} width={cardWidth} />
      <Drop fromY={102} toY={134} x={centerX} seed={52} />
      <Label x={centerX + 10} y={120} size={14} color={ACCENT}>LDL 运出</Label>
      <Label x={railX - 8} y={120} size={14} color={SLATE} anchor="end">HDL 运回</Label>
      <Row y={138} title="身体组织" sub="细胞使用胆固醇" tone={CLAY_WASH} stroke={CLAY} titleColor={CLAY} seed={53} height={54} width={cardWidth} />

      <Feedback railX={railX} fromX={LEFT + cardWidth} fromY={165} toX={LEFT + cardWidth - 4} toY={75} seed={54} />

      <Row y={214} title="甘油三酯" sub="能量的储存形式" tone={SLATE_WASH} stroke={SLATE} titleColor={SLATE} seed={55} height={54} width={cardWidth} />

      <Footnote y={300}>HDL 参与把胆固醇运回肝脏；箭头只表示方向。</Footnote>
    </Frame>
  );
}

export function LabRange({ id }) {
  return (
    <Frame
      id={id}
      height={324}
      title="同一份样本在两套测量体系中的位置"
      description="同一份样本送进两家实验室，使用不同方法和仪器，得到略有差异的数值；每个数值各自对照本实验室的参考区间。"
    >
      <Headline seed={601} width={208}>同一份血，两条区间</Headline>

      <Row y={48} title="同一份血液样本" sub="分成两份送去检测" seed={61} height={54} />
      <Drop fromY={102} toY={120} seed={62} />

      <SketchCard x={LEFT} y={124} width={150} height={54} tone={CLAY_WASH} stroke={CLAY} seed={63} />
      <Label x={LEFT + 14} y={147} size={15} color={CLAY}>A 实验室</Label>
      <Label x={LEFT + 14} y={167} size={14} color={INK_2}>方法与仪器 A</Label>
      <Label x={LEFT} y={200} size={14} color={INK_3}>A 的参考区间</Label>
      <SketchLine from={[LEFT, 210]} to={[W - LEFT, 210]} color={CLAY} seed={64} width={3} />
      <SketchDot cx={210} cy={210} r={7} color={CLAY} />
      <Label x={W - LEFT} y={200} size={14} color={CLAY} anchor="end">这次的结果</Label>

      <SketchCard x={LEFT} y={228} width={150} height={54} tone={SLATE_WASH} stroke={SLATE} seed={65} />
      <Label x={LEFT + 14} y={251} size={15} color={SLATE}>B 实验室</Label>
      <Label x={LEFT + 14} y={271} size={14} color={INK_2}>方法与仪器 B</Label>
      <Label x={LEFT} y={300} size={14} color={INK_3}>B 的参考区间</Label>
      <SketchLine from={[LEFT, 310]} to={[W - LEFT, 310]} color={SLATE} seed={66} width={3} />
      <SketchDot cx={236} cy={310} r={7} color={SLATE} />
      <Label x={W - LEFT} y={300} size={14} color={SLATE} anchor="end">这次的结果</Label>
    </Frame>
  );
}

function ThreeWay({ lead, leadSub, branches, footnote, seed, height }) {
  const indent = 34;
  const rowY = 132;
  const rowH = 52;
  const gap = 8;
  return (
    <>
      <Row y={48} title={lead} sub={leadSub} seed={seed} height={54} />
      <Tree
        fromY={102}
        targets={branches.map((_, index) => rowY + index * (rowH + gap) + rowH / 2)}
        seed={seed + 1}
        indent={indent}
      />
      {branches.map((branch, index) => (
        <Row
          key={branch.title}
          x={LEFT + indent}
          y={rowY + index * (rowH + gap)}
          width={INNER - indent}
          title={branch.title}
          sub={branch.sub}
          tone={branch.tone}
          stroke={branch.stroke}
          titleColor={branch.stroke}
          seed={seed + 10 + index}
          height={rowH}
        />
      ))}
      <Footnote y={height - 14}>{footnote}</Footnote>
    </>
  );
}

export function CbcComponents({ id }) {
  return (
    <Frame
      id={id}
      height={346}
      title="一份血常规样本被分成三组分别计数"
      description="一份血液样本进入检测，分别计数红细胞、白细胞和血小板；红细胞一项还包含血红蛋白与红细胞压积等描述携氧能力的指标。"
    >
      <Headline seed={701} width={140}>一份血，三组数</Headline>
      <ThreeWay
        seed={710}
        height={346}
        lead="血液样本"
        leadSub="同一次抽血"
        branches={[
          { title: "红细胞", sub: "计数 · 血红蛋白 · 压积", tone: WASH, stroke: ACCENT },
          { title: "白细胞", sub: "总数 · 可加做分类", tone: CLAY_WASH, stroke: CLAY },
          { title: "血小板", sub: "计数 · 参与止血", tone: SLATE_WASH, stroke: SLATE },
        ]}
        footnote="三组需要合起来读，单看一组容易得出片面结论。"
      />
    </Frame>
  );
}

export function LiverTests({ id }) {
  return (
    <Frame
      id={id}
      height={346}
      title="肝功能检查测量的是几类不同物质"
      description="肝功能检查通过血液样本测量肝脏制造的蛋白质、肝细胞内的酶、胆红素等物质；医生通常把这些结果放在一起，寻找特定模式。"
    >
      <Headline seed={801} width={152}>肝功能不是一项</Headline>
      <ThreeWay
        seed={810}
        height={346}
        lead="血液样本"
        leadSub="一次抽血查多个项目"
        branches={[
          { title: "蛋白质", sub: "白蛋白 · 总蛋白", tone: WASH, stroke: ACCENT },
          { title: "酶", sub: "ALT · AST · ALP · GGT", tone: CLAY_WASH, stroke: CLAY },
          { title: "胆红素", sub: "红细胞分解后的处理", tone: SLATE_WASH, stroke: SLATE },
        ]}
        footnote="「肝功能」是多项检查的组合，不是单一数值。"
      />
    </Frame>
  );
}

export function KidneyFilter({ id }) {
  const indent = 34;
  return (
    <Frame
      id={id}
      height={342}
      title="肾功能项目从过滤和尿液两个角度观察"
      description="血液流经肾小球被过滤，肌酐是常用的过滤观察指标并用于估算 eGFR；尿白蛋白肌酐比从尿液一侧补充信息。"
    >
      <Headline seed={901} width={166}>血液和尿液两侧</Headline>

      <Row y={48} title="血液" sub="含肌酐等代谢废物" tone={CLAY_WASH} stroke={CLAY} titleColor={CLAY} seed={91} height={50} />
      <Drop fromY={98} toY={114} seed={92} />
      <Row y={118} title="肾小球过滤" sub="把废物滤进尿液" seed={93} height={50} />
      <Tree fromY={168} targets={[221, 277]} seed={94} indent={indent} />
      <Row x={LEFT + indent} width={INNER - indent} y={196} title="血肌酐" sub="用来估算 eGFR" seed={95} height={50} />
      <Row x={LEFT + indent} width={INNER - indent} y={252} title="尿白蛋白 / 肌酐" sub="尿液一侧的信息" tone={SLATE_WASH} stroke={SLATE} titleColor={SLATE} seed={96} height={50} />

      <Footnote y={326}>两侧互相补充；单个数值不能独立说明肾脏状态。</Footnote>
    </Frame>
  );
}

export function UricAcidPath({ id }) {
  return (
    <Frame
      id={id}
      height={356}
      title="尿酸从生成到排出的路径"
      description="身体分解嘌呤时形成尿酸进入血液，大部分经肾脏过滤后随尿液排出；生成过多或排出不足都可能让血尿酸升高。"
    >
      <Headline seed={1001} width={128}>生成与排出</Headline>

      <Row y={48} title="嘌呤分解" sub="细胞更新与食物" tone={CLAY_WASH} stroke={CLAY} titleColor={CLAY} seed={1002} height={48} />
      <Drop fromY={96} toY={112} seed={1003} />
      <Row y={116} title="尿酸进入血液" sub="生成与排出共同决定水平" seed={1004} height={48} />
      <Drop fromY={164} toY={180} seed={1005} />
      <Row y={184} title="肾脏过滤" sub="大部分从这里离开" seed={1006} height={48} />
      <Drop fromY={232} toY={248} seed={1007} />
      <Row y={252} title="随尿液排出" sub="其余途径不在图中" tone={SLATE_WASH} stroke={SLATE} titleColor={SLATE} seed={1008} height={48} />

      <Footnote y={324}>生成过多或排出不足都可能让它升高；</Footnote>
      <Footnote y={344}>单次结果不能说明是哪一环。</Footnote>
    </Frame>
  );
}

export function ThyroidAxis({ id }) {
  // The feedback line runs in a gutter on the right, so it never crosses the
  // cards; rows stop 44 units short and the dashed line returns upwards there.
  const cardWidth = INNER - 44;
  const railX = LEFT + INNER - 16;
  return (
    <Frame
      id={id}
      height={352}
      title="TSH、T4 与 T3 构成调节反馈"
      description="脑下垂体释放 TSH 调节甲状腺；甲状腺产生 T4 和 T3，参与身体能量使用；血液中的激素水平又反过来影响 TSH 的释放。"
    >
      <Headline seed={1101} width={128}>一条反馈回路</Headline>

      <Row y={48} title="脑下垂体" sub="释放 TSH" seed={1102} height={48} width={cardWidth} />
      <Drop fromY={96} toY={120} x={(LEFT + cardWidth) / 2} seed={1103} />
      <Label x={(LEFT + cardWidth) / 2 + 12} y={114} size={14} color={INK_3}>调节信号</Label>
      <Row y={124} title="甲状腺" sub="产生 T4 与 T3" tone={CLAY_WASH} stroke={CLAY} titleColor={CLAY} seed={1104} height={48} width={cardWidth} />
      <Drop fromY={172} toY={188} x={(LEFT + cardWidth) / 2} seed={1105} />
      <Row y={192} title="身体组织" sub="调节能量使用" tone={SLATE_WASH} stroke={SLATE} titleColor={SLATE} seed={1106} height={48} width={cardWidth} />

      <Feedback railX={railX} fromX={LEFT + cardWidth} fromY={216} toX={LEFT + cardWidth - 4} toY={72} seed={1107} />
      <Footnote y={276}>激素水平反过来抑制 TSH 的释放，</Footnote>
      <Footnote y={296}>所以两项常常一高一低。</Footnote>
      <Footnote y={320}>三项要结合起来读，不能只看一项。</Footnote>
    </Frame>
  );
}

export function UrinalysisLayers({ id }) {
  return (
    <Frame
      id={id}
      height={346}
      title="尿常规从外观、化学和显微镜三个层面观察"
      description="同一份尿液样本先观察颜色与清澈度，再用试纸做化学检测，必要时在显微镜下观察细胞、结晶和管型等成分。"
    >
      <Headline seed={1201} width={152}>一份样本，三层</Headline>
      <ThreeWay
        seed={1210}
        height={346}
        lead="尿液样本"
        leadSub="同一次留取"
        branches={[
          { title: "外观", sub: "颜色 · 清澈度", tone: CLAY_WASH, stroke: CLAY },
          { title: "试纸化学", sub: "pH · 蛋白 · 糖 · 潜血", tone: WASH, stroke: ACCENT },
          { title: "显微镜", sub: "细胞 · 结晶 · 管型", tone: SLATE_WASH, stroke: SLATE },
        ]}
        footnote="三个层面描述同一份样本，不能互相替代。"
      />
    </Frame>
  );
}

// A lab report is a table, not a flow: four columns, one row per item. The
// figure only shows the structure — no real item name, value, unit or interval
// — and the numbered callouts are explained in the page legend below it.
export function ReportAnatomy({ id }) {
  const columns = [
    { label: "项目名", x: 20, width: 112, center: 76 },
    { label: "结果", x: 140, width: 54, center: 167 },
    { label: "单位", x: 204, width: 58, center: 233 },
    { label: "参考区间", x: 272, width: 76, center: 310 },
  ];
  const row = (y, color) => (
    <>
      <Label x={20} y={y} size={14} color={color}>项目名称</Label>
      <Label x={140} y={y} size={15} color={color}>数值</Label>
    </>
  );
  return (
    <Frame
      id={id}
      height={256}
      title="检验报告单的列结构"
      description="检验报告单的每一行通常包含项目名称、结果、单位和参考区间；结果旁的箭头提示这个数字落在所标区间之外，是排版记号，不是诊断。"
    >
      <Headline seed={1301} width={132}>单子上的四列</Headline>

      <SketchCard x={LEFT} y={52} width={INNER} height={124} tone="var(--surface)" stroke={RULE} seed={1310} radius={10} />
      {columns.map(column => (
        <Label key={column.label} x={column.x} y={78} size={14} color={INK_3}>{column.label}</Label>
      ))}
      <SketchLine from={[LEFT + 8, 92]} to={[W - LEFT - 8, 92]} color={RULE} seed={1311} width={1.2} />
      <SketchLine from={[131, 52]} to={[131, 176]} color={RULE} seed={1312} width={1} />
      <SketchLine from={[196, 52]} to={[196, 176]} color={RULE} seed={1313} width={1} />
      <SketchLine from={[264, 52]} to={[264, 176]} color={RULE} seed={1314} width={1} />

      {row(126, INK)}
      <SketchArrow from={[190, 130]} to={[190, 106]} color={CLAY} seed={1315} />
      <Label x={204} y={126} size={14} color={INK_2}>单位</Label>
      <Label x={272} y={126} size={14} color={INK_2}>区间</Label>

      {row(162, INK_3)}
      <Label x={204} y={162} size={14} color={INK_3}>单位</Label>
      <Label x={272} y={162} size={14} color={INK_3}>区间</Label>

      {columns.map((column, index) => (
        <React.Fragment key={column.center}>
          <SketchDot cx={column.center} cy={202} r={9} color={ACCENT} />
          <Label x={column.center} y={207} size={14} color="#ffffff" anchor="middle">{index + 1}</Label>
        </React.Fragment>
      ))}

      <Footnote y={240}>示意图只画结构，不含真实项目、数值或区间。</Footnote>
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
  "cbc-components": CbcComponents,
  "liver-tests": LiverTests,
  "kidney-filter": KidneyFilter,
  "uric-acid-path": UricAcidPath,
  "thyroid-axis": ThyroidAxis,
  "urinalysis-layers": UrinalysisLayers,
  "report-anatomy": ReportAnatomy,
};

export const diagramFor = key => registry[key] || null;
