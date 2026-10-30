import React from "react";
import {
  ACCENT,
  CLAY,
  CLAY_WASH,
  INK,
  INK_2,
  INK_3,
  SLATE,
  SLATE_WASH,
  WASH,
  SketchArrow,
  SketchBar,
  SketchCard,
  SketchCurve,
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
// Every figure uses the hand-drawn primitives in sketch.js and a display face
// for its headline, so the set reads as one editorial system rather than as
// boxes drawn with a different library each time.
//
// The viewBox stays narrow (520 or less) so the 2026 type sizes stay legible at
// 320–430px phone widths.

const sans = "var(--sans)";
const display = "var(--figure-display)";

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

// White marker paper behind every figure; keeps strokes readable on any page
// background without introducing a card or a shadow.
function Sheet({ children }) {
  return <g>{children}</g>;
}

function Label({ x, y, children, size = 15, color = INK, anchor = "start", weight, display: isDisplay }) {
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

// Headline block: display face plus a marker stroke underneath.
function Headline({ children, seed, width = 300, y = 34 }) {
  return (
    <>
      <Label x={8} y={y} size={24} color={INK} display>{children}</Label>
      <SketchMarker x={10} y={y + 8} width={width} seed={seed} />
    </>
  );
}

export function GlucoseFlow({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 250"
      title="葡萄糖进入血液后的去向"
      description="食物中的碳水化合物消化为葡萄糖进入血液；胰岛素向细胞发出信号，葡萄糖进入肌肉和脂肪细胞供能，多余部分由肝脏储存，空腹时再释放。"
    >
      <Sheet>
        <Headline seed={101} width={214} y={30}>葡萄糖去了哪里？</Headline>

        {/* Intake */}
        <SketchCard x={8} y={78} width={132} height={72} tone={CLAY_WASH} stroke={CLAY} seed={11} />
        <Label x={24} y={104} size={16} color={CLAY}>食物中的碳水</Label>
        <Label x={24} y={128} size={13} color={INK_2}>变成葡萄糖</Label>
        <SketchArrow from={[142, 114]} to={[176, 114]} seed={12} />
        <Label x={148} y={102} size={11} color={INK_3}>吸收</Label>

        {/* Blood glucose */}
        <SketchCard x={182} y={78} width={146} height={72} tone={WASH} stroke={ACCENT} seed={13} />
        <Label x={255} y={104} size={16} color={ACCENT} anchor="middle">进入血液</Label>
        <Label x={255} y={128} size={13} color={INK_2} anchor="middle">胰岛素发信号</Label>

        <SketchCurve from={[332, 100]} to={[372, 66]} bow={-10} seed={14} />
        <SketchCurve from={[332, 128]} to={[372, 162]} bow={-10} seed={15} />

        {/* Outcomes */}
        <SketchCard x={376} y={36} width={136} height={62} tone={WASH} stroke={ACCENT} seed={16} />
        <Label x={392} y={60} size={15} color={ACCENT}>细胞摄取</Label>
        <Label x={392} y={82} size={12} color={INK_2}>用于供能</Label>

        <SketchCard x={376} y={138} width={136} height={62} tone={SLATE_WASH} stroke={SLATE} seed={17} />
        <Label x={392} y={162} size={15} color={SLATE}>肝脏储存</Label>
        <Label x={392} y={184} size={12} color={INK_2}>空腹再释放</Label>

        <Label x={8} y={230} size={12.5} color={INK_2}>胰岛素不是「降糖药」，它是身体自己的调度信号。</Label>
      </Sheet>
    </Frame>
  );
}

export function GlucoseWindows({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 268"
      title="三项血糖检查覆盖的时间范围"
      description="空腹血糖与口服葡萄糖耐量试验描述某个时段的血糖变化；糖化血红蛋白覆盖约过去两到三个月的平均水平。"
    >
      <Sheet>
        <Headline seed={201} width={196} y={28}>三个时间窗</Headline>

        <SketchCard x={8} y={56} width={152} height={66} tone={CLAY_WASH} stroke={CLAY} seed={21} />
        <Label x={22} y={82} size={15} color={CLAY}>空腹血糖</Label>
        <Label x={22} y={104} size={12} color={INK_2}>8 小时未进食</Label>

        <SketchCard x={184} y={56} width={152} height={66} tone={WASH} stroke={ACCENT} seed={22} />
        <Label x={198} y={82} size={15} color={ACCENT}>餐后 · 糖耐量</Label>
        <Label x={198} y={104} size={12} color={INK_2}>喝糖水后取样</Label>

        <SketchCard x={360} y={56} width={152} height={66} tone={SLATE_WASH} stroke={SLATE} seed={23} />
        <Label x={374} y={82} size={15} color={SLATE}>糖化血红蛋白</Label>
        <Label x={374} y={104} size={12} color={INK_2}>近 2–3 个月平均</Label>

        {/* Timeline: one axis, three coverage bars. */}
        <SketchLine from={[20, 190]} to={[500, 190]} seed={24} width={1.6} />
        <Label x={20} y={212} size={11} color={INK_3}>过去</Label>
        <Label x={456} y={212} size={11} color={INK_3}>抽血当天</Label>

        <SketchDot cx={484} cy={190} r={4.5} />
        <SketchDot cx={154} cy={190} r={4} color={CLAY} />
        <SketchDot cx={312} cy={190} r={4} />
        <SketchBar x={330} y={180} width={154} height={8} color={SLATE_WASH} seed={25} />
        <SketchLine from={[330, 184]} to={[484, 184]} color={SLATE} seed={26} width={2.4} />

        <Label x={20} y={246} size={11.5} color={INK_3}>圆点是抽血时间；色条是这次结果覆盖的范围，横轴不按比例。</Label>
      </Sheet>
    </Frame>
  );
}

export function StairsHeart({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 232"
      title="爬楼时肌肉、心脏与肺如何配合"
      description="爬楼时腿部肌肉需要更多含氧血液；心脏加快跳动把血液送向肺，肺为血液补充氧气，含氧血液再被送到正在用力的肌肉。"
    >
      <Sheet>
        <Headline seed={301} width={230} y={28}>爬楼时身体在做什么</Headline>

        <SketchCard x={8} y={62} width={140} height={68} tone={CLAY_WASH} stroke={CLAY} seed={31} />
        <Label x={24} y={88} size={15} color={CLAY}>腿部肌肉</Label>
        <Label x={24} y={110} size={12} color={INK_2}>需要更多氧</Label>

        <SketchArrow from={[152, 96]} to={[188, 96]} seed={32} />

        <SketchCard x={192} y={62} width={140} height={68} tone={WASH} stroke={ACCENT} seed={33} />
        <Label x={208} y={88} size={15} color={ACCENT}>心脏加快</Label>
        <Label x={208} y={110} size={12} color={INK_2}>跳得更快更有力</Label>

        <SketchArrow from={[336, 96]} to={[372, 96]} seed={34} />

        <SketchCard x={376} y={62} width={136} height={68} tone={SLATE_WASH} stroke={SLATE} seed={35} />
        <Label x={392} y={88} size={15} color={SLATE}>肺补充氧气</Label>
        <Label x={392} y={110} size={12} color={INK_2}>呼吸变快变深</Label>

        <SketchCurve from={[444, 134]} to={[252, 156]} bow={-26} seed={36} />
        <SketchCurve from={[248, 156]} to={[78, 134]} bow={-22} seed={37} />
        <Label x={260} y={196} size={12} color={INK_3} anchor="middle">含氧血液送回肌肉</Label>

        <Label x={8} y={216} size={12.5} color={INK_2}>停下来后心跳会慢慢回落，这是临时调整，不是「心脏不好」的证据。</Label>
      </Sheet>
    </Frame>
  );
}

export function PressurePulse({ id }) {
  const pulse = "M24 150 C44 150 48 74 70 74 C92 74 96 150 118 150 C140 150 144 74 166 74 C188 74 192 150 214 150 C236 150 240 74 262 74 C284 74 288 150 310 150 C332 150 336 74 358 74 C380 74 384 150 406 150 H496";
  return (
    <Frame
      id={id}
      viewBox="0 0 520 208"
      title="收缩压与舒张压是一次搏动周期里的高点和低点"
      description="心脏收缩泵血时，动脉内压力升高到收缩压；心脏舒张、两次搏动之间，压力回落到舒张压，但不会降到零。"
    >
      <Sheet>
        <Headline seed={401} width={214} y={28}>一次心跳的两个数字</Headline>

        <SketchLine from={[22, 150]} to={[498, 150]} seed={41} width={1.4} />
        <SketchLine from={[22, 74]} to={[498, 74]} seed={42} width={1} dash={[5, 7]} />
        <SketchPath d={pulse} seed={43} width={2.4} />

        <Label x={22} y={64} size={14} color={INK}>收缩压</Label>
        <Label x={22} y={172} size={14} color={INK}>舒张压</Label>
        <Label x={416} y={192} size={11} color={INK_3}>时间 →</Label>
        <Label x={22} y={196} size={11} color={INK_3}>高度是示意，不是真实数值</Label>
      </Sheet>
    </Frame>
  );
}

export function LipidTransport({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 244"
      title="脂蛋白把胆固醇和甘油三酯运向不同方向"
      description="肝脏合成并释放脂蛋白，LDL 把胆固醇送往身体组织，HDL 参与把胆固醇运回肝脏；甘油三酯是能量的储存形式。"
    >
      <Sheet>
        <Headline seed={501} width={200} y={28}>两种方向相反的车</Headline>

        <SketchCard x={8} y={86} width={122} height={68} tone={WASH} stroke={ACCENT} seed={51} />
        <Label x={24} y={112} size={15} color={ACCENT}>肝脏</Label>
        <Label x={24} y={134} size={12} color={INK_2}>合成与处理</Label>

        <SketchCurve from={[134, 100]} to={[206, 66]} bow={-12} seed={52} />
        <Label x={140} y={58} size={12} color={ACCENT}>LDL 运出</Label>
        <SketchCurve from={[206, 156]} to={[134, 132]} bow={-12} seed={53} color={CLAY} />
        <Label x={132} y={182} size={12} color={CLAY}>HDL 运回</Label>

        <SketchCard x={210} y={38} width={140} height={62} tone={CLAY_WASH} stroke={CLAY} seed={54} />
        <Label x={226} y={62} size={15} color={CLAY}>身体组织</Label>
        <Label x={226} y={84} size={12} color={INK_2}>细胞使用胆固醇</Label>

        <SketchCard x={210} y={126} width={140} height={62} tone={SLATE_WASH} stroke={SLATE} seed={55} />
        <Label x={226} y={150} size={15} color={SLATE}>甘油三酯</Label>
        <Label x={226} y={172} size={12} color={INK_2}>能量的储存形式</Label>

        <SketchDashed from={[356, 70]} to={[484, 118]} bow={-18} seed={56} color={INK_3} />
        <Label x={378} y={92} size={11} color={INK_3}>另一条运输线</Label>

        <Label x={8} y={226} size={11.5} color={INK_3}>箭头只表示主要方向，不代表数量、速度或完整代谢路径。</Label>
      </Sheet>
    </Frame>
  );
}

export function LabRange({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 268"
      title="同一份样本在两套测量体系中的位置"
      description="同一份样本送进两家实验室，使用不同方法和仪器，得到略有差异的数值；每个数值各自对照本实验室的参考区间。"
    >
      <Sheet>
        <Headline seed={601} width={206} y={28}>同一份血，两条区间</Headline>

        <SketchCard x={8} y={96} width={104} height={68} tone={WASH} stroke={ACCENT} seed={61} />
        <Label x={60} y={124} size={14} color={ACCENT} anchor="middle">同一份</Label>
        <Label x={60} y={146} size={14} color={ACCENT} anchor="middle">血液样本</Label>

        <SketchCurve from={[116, 112]} to={[166, 72]} bow={-8} seed={62} />
        <SketchCurve from={[116, 148]} to={[166, 188]} bow={-8} seed={63} />

        <Label x={172} y={52} size={13} color={INK_3}>A 实验室</Label>
        <SketchCard x={170} y={58} width={116} height={44} tone={WASH} stroke={ACCENT} seed={64} />
        <Label x={228} y={86} size={13} color={INK_2} anchor="middle">方法 · 仪器 A</Label>
        <SketchBar x={292} y={70} width={202} height={16} seed={65} />
        <SketchDot cx={356} cy={78} r={6} />
        <Label x={292} y={58} size={11} color={INK_3}>A 的参考区间</Label>
        <Label x={368} y={62} size={11} color={ACCENT}>结果</Label>

        <Label x={172} y={186} size={13} color={INK_3}>B 实验室</Label>
        <SketchCard x={170} y={192} width={116} height={44} tone={SLATE_WASH} stroke={SLATE} seed={66} />
        <Label x={228} y={220} size={13} color={INK_2} anchor="middle">方法 · 仪器 B</Label>
        <SketchBar x={306} y={204} width={188} height={16} color={SLATE_WASH} seed={67} />
        <SketchDot cx={372} cy={212} r={6} color={SLATE} />
        <Label x={306} y={250} size={11} color={INK_3}>B 的参考区间</Label>
        <Label x={384} y={196} size={11} color={SLATE}>结果</Label>
      </Sheet>
    </Frame>
  );
}

export function CbcComponents({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 250"
      title="一份血常规样本被分成三组分别计数"
      description="一份血液样本进入检测，分别计数红细胞、白细胞和血小板；红细胞一项还包含血红蛋白与红细胞压积等描述携氧能力的指标。"
    >
      <Sheet>
        <Headline seed={701} width={172} y={28}>一份血，三组数</Headline>

        <SketchCard x={8} y={92} width={106} height={68} tone={WASH} stroke={ACCENT} seed={71} />
        <Label x={61} y={120} size={14} color={ACCENT} anchor="middle">血液</Label>
        <Label x={61} y={142} size={13} color={INK_2} anchor="middle">一份样本</Label>

        <SketchCurve from={[118, 108]} to={[164, 66]} bow={-8} seed={72} />
        <SketchArrow from={[118, 126]} to={[164, 126]} seed={73} />
        <SketchCurve from={[118, 144]} to={[164, 186]} bow={-8} seed={74} />

        <SketchCard x={168} y={38} width={168} height={56} tone={WASH} stroke={ACCENT} seed={75} />
        <Label x={184} y={62} size={14} color={ACCENT}>红细胞</Label>
        <Label x={184} y={82} size={11} color={INK_2}>计数 · 血红蛋白 · 压积</Label>

        <SketchCard x={168} y={98} width={168} height={56} tone={CLAY_WASH} stroke={CLAY} seed={76} />
        <Label x={184} y={122} size={14} color={CLAY}>白细胞</Label>
        <Label x={184} y={142} size={11} color={INK_2}>总数 · 可加做分类</Label>

        <SketchCard x={168} y={158} width={168} height={56} tone={SLATE_WASH} stroke={SLATE} seed={77} />
        <Label x={184} y={182} size={14} color={SLATE}>血小板</Label>
        <Label x={184} y={202} size={11} color={INK_2}>计数 · 参与止血</Label>

        <Label x={348} y={70} size={11} color={INK_3}>运氧</Label>
        <Label x={348} y={130} size={11} color={INK_3}>免疫防御</Label>
        <Label x={348} y={190} size={11} color={INK_3}>凝血封堵</Label>

        <Label x={8} y={238} size={11.5} color={INK_3}>三组结果需要合起来读，单看一组容易得出片面结论。</Label>
      </Sheet>
    </Frame>
  );
}

export function LiverTests({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 246"
      title="肝功能检查测量的是几类不同物质"
      description="肝功能检查通过血液样本测量肝脏制造的蛋白质、肝细胞内的酶、胆红素等物质；医生通常把这些结果放在一起，寻找特定模式。"
    >
      <Sheet>
        <Headline seed={801} width={186} y={28}>肝功能不是一项</Headline>

        <SketchCard x={8} y={88} width={106} height={68} tone={WASH} stroke={ACCENT} seed={81} />
        <Label x={61} y={116} size={14} color={ACCENT} anchor="middle">血液</Label>
        <Label x={61} y={138} size={13} color={INK_2} anchor="middle">样本</Label>

        <SketchCurve from={[118, 104]} to={[164, 62]} bow={-8} seed={82} />
        <SketchArrow from={[118, 122]} to={[164, 122]} seed={83} />
        <SketchCurve from={[118, 140]} to={[164, 182]} bow={-8} seed={84} />

        <SketchCard x={168} y={34} width={176} height={56} tone={WASH} stroke={ACCENT} seed={85} />
        <Label x={184} y={58} size={14} color={ACCENT}>蛋白质</Label>
        <Label x={184} y={78} size={11} color={INK_2}>白蛋白 · 总蛋白</Label>

        <SketchCard x={168} y={94} width={176} height={56} tone={CLAY_WASH} stroke={CLAY} seed={86} />
        <Label x={184} y={118} size={14} color={CLAY}>酶</Label>
        <Label x={184} y={138} size={11} color={INK_2}>ALT · AST · ALP · GGT</Label>

        <SketchCard x={168} y={154} width={176} height={56} tone={SLATE_WASH} stroke={SLATE} seed={87} />
        <Label x={184} y={178} size={14} color={SLATE}>胆红素</Label>
        <Label x={184} y={198} size={11} color={INK_2}>红细胞分解后的处理</Label>

        <Label x={356} y={66} size={11} color={INK_3}>合成功能</Label>
        <Label x={356} y={126} size={11} color={INK_3}>细胞变化线索</Label>
        <Label x={356} y={186} size={11} color={INK_3}>胆汁处理</Label>

        <Label x={8} y={234} size={11.5} color={INK_3}>「肝功能」是多项检查的组合，不是单一数值。</Label>
      </Sheet>
    </Frame>
  );
}

export function KidneyFilter({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 238"
      title="肾功能项目从过滤和尿液两个角度观察"
      description="血液流经肾小球被过滤，肌酐是常用的过滤观察指标并用于估算 eGFR；尿白蛋白肌酐比从尿液一侧补充信息。"
    >
      <Sheet>
        <Headline seed={901} width={214} y={28}>血液和尿液两侧</Headline>

        <SketchCard x={8} y={82} width={118} height={66} tone={CLAY_WASH} stroke={CLAY} seed={91} />
        <Label x={24} y={108} size={14} color={CLAY}>血液</Label>
        <Label x={24} y={130} size={11} color={INK_2}>含肌酐等废物</Label>

        <SketchArrow from={[130, 115]} to={[168, 115]} seed={92} />

        <SketchCard x={172} y={82} width={124} height={66} tone={WASH} stroke={ACCENT} seed={93} />
        <Label x={234} y={108} size={14} color={ACCENT} anchor="middle">肾小球</Label>
        <Label x={234} y={130} size={11} color={INK_2} anchor="middle">过滤血液</Label>

        <SketchCurve from={[300, 100]} to={[346, 66]} bow={-8} seed={94} />
        <SketchCurve from={[300, 132]} to={[346, 166]} bow={-8} seed={95} />

        <SketchCard x={350} y={38} width={162} height={58} tone={WASH} stroke={ACCENT} seed={96} />
        <Label x={366} y={62} size={14} color={ACCENT}>血肌酐</Label>
        <Label x={366} y={82} size={11} color={INK_2}>→ 估算 eGFR</Label>

        <SketchCard x={350} y={140} width={162} height={58} tone={SLATE_WASH} stroke={SLATE} seed={97} />
        <Label x={366} y={164} size={14} color={SLATE}>尿白蛋白 / 肌酐</Label>
        <Label x={366} y={184} size={11} color={INK_2}>尿液一侧的信息</Label>

        <Label x={8} y={226} size={11.5} color={INK_3}>两侧项目互相补充；单个数值不能独立说明肾脏状态。</Label>
      </Sheet>
    </Frame>
  );
}

export function UricAcidPath({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 210"
      title="尿酸从生成到排出的路径"
      description="身体分解嘌呤时形成尿酸进入血液，大部分经肾脏过滤后随尿液排出；生成过多或排出不足都可能让血尿酸升高。"
    >
      <Sheet>
        <Headline seed={1001} width={170} y={28}>生成与排出</Headline>

        <SketchCard x={8} y={66} width={116} height={64} tone={CLAY_WASH} stroke={CLAY} seed={1002} />
        <Label x={24} y={92} size={14} color={CLAY}>嘌呤分解</Label>
        <Label x={24} y={114} size={11} color={INK_2}>细胞与食物</Label>

        <SketchArrow from={[128, 98]} to={[164, 98]} seed={1003} />

        <SketchCard x={168} y={66} width={116} height={64} tone={WASH} stroke={ACCENT} seed={1004} />
        <Label x={226} y={92} size={14} color={ACCENT} anchor="middle">尿酸</Label>
        <Label x={226} y={114} size={11} color={INK_2} anchor="middle">进入血液</Label>

        <SketchArrow from={[288, 98]} to={[324, 98]} seed={1005} />

        <SketchCard x={328} y={66} width={96} height={64} tone={WASH} stroke={ACCENT} seed={1006} />
        <Label x={376} y={92} size={14} color={ACCENT} anchor="middle">肾脏</Label>
        <Label x={376} y={114} size={11} color={INK_2} anchor="middle">过滤</Label>

        <SketchArrow from={[428, 98]} to={[460, 98]} seed={1007} />
        <Label x={466} y={92} size={13} color={INK}>尿液</Label>
        <Label x={466} y={112} size={11} color={INK_3}>排出</Label>

        <Label x={8} y={176} size={11.5} color={INK_2}>生成过多或排出不足都可能让血尿酸升高；单次结果不能说明是哪一环。</Label>
      </Sheet>
    </Frame>
  );
}

export function ThyroidAxis({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 236"
      title="TSH、T4 与 T3 构成调节反馈"
      description="脑下垂体释放 TSH 调节甲状腺；甲状腺产生 T4 和 T3，参与身体能量使用；血液中的激素水平又反过来影响 TSH 的释放。"
    >
      <Sheet>
        <Headline seed={1101} width={176} y={28}>一条反馈回路</Headline>

        <SketchCard x={8} y={58} width={140} height={66} tone={WASH} stroke={ACCENT} seed={1102} />
        <Label x={24} y={84} size={14} color={ACCENT}>脑下垂体</Label>
        <Label x={24} y={106} size={11} color={INK_2}>释放 TSH</Label>

        <SketchCurve from={[152, 84]} to={[206, 100]} bow={-10} seed={1103} />
        <Label x={132} y={62} size={11} color={INK_3}>调节信号</Label>

        <SketchCard x={210} y={70} width={126} height={66} tone={CLAY_WASH} stroke={CLAY} seed={1104} />
        <Label x={273} y={96} size={14} color={CLAY} anchor="middle">甲状腺</Label>
        <Label x={273} y={118} size={11} color={INK_2} anchor="middle">产生 T4、T3</Label>

        <SketchArrow from={[340, 100]} to={[372, 100]} seed={1105} />

        <SketchCard x={376} y={70} width={130} height={66} tone={SLATE_WASH} stroke={SLATE} seed={1106} />
        <Label x={392} y={96} size={14} color={SLATE}>身体</Label>
        <Label x={392} y={118} size={11} color={INK_2}>使用能量</Label>

        <SketchDashed from={[440, 142]} to={[78, 132]} bow={-34} seed={1107} color={INK_3} />
        <Label x={230} y={192} size={11} color={INK_3} anchor="middle">激素水平反过来影响 TSH 的释放</Label>

        <Label x={8} y={222} size={11.5} color={INK_3}>TSH、T4、T3 需要结合起来读，不能只看一项。</Label>
      </Sheet>
    </Frame>
  );
}

export function UrinalysisLayers({ id }) {
  return (
    <Frame
      id={id}
      viewBox="0 0 520 222"
      title="尿常规从外观、化学和显微镜三个层面观察"
      description="同一份尿液样本先观察颜色与清澈度，再用试纸做化学检测，必要时在显微镜下观察细胞、结晶和管型等成分。"
    >
      <Sheet>
        <Headline seed={1201} width={176} y={28}>一份样本，三层</Headline>

        <SketchCard x={8} y={74} width={106} height={66} tone={WASH} stroke={ACCENT} seed={1202} />
        <Label x={61} y={102} size={14} color={ACCENT} anchor="middle">尿液</Label>
        <Label x={61} y={124} size={13} color={INK_2} anchor="middle">样本</Label>

        <SketchCurve from={[118, 92]} to={[164, 56]} bow={-8} seed={1203} />
        <SketchArrow from={[118, 108]} to={[164, 108]} seed={1204} />
        <SketchCurve from={[118, 124]} to={[164, 160]} bow={-8} seed={1205} />

        <SketchCard x={168} y={30} width={160} height={52} tone={CLAY_WASH} stroke={CLAY} seed={1206} />
        <Label x={184} y={52} size={14} color={CLAY}>外观</Label>
        <Label x={184} y={72} size={11} color={INK_2}>颜色 · 清澈度</Label>

        <SketchCard x={168} y={84} width={160} height={52} tone={WASH} stroke={ACCENT} seed={1207} />
        <Label x={184} y={106} size={14} color={ACCENT}>试纸化学</Label>
        <Label x={184} y={126} size={11} color={INK_2}>pH · 蛋白 · 糖 · 潜血</Label>

        <SketchCard x={168} y={138} width={160} height={52} tone={SLATE_WASH} stroke={SLATE} seed={1208} />
        <Label x={184} y={160} size={14} color={SLATE}>显微镜</Label>
        <Label x={184} y={180} size={11} color={INK_2}>细胞 · 结晶 · 管型</Label>

        <Label x={344} y={60} size={11} color={INK_3}>样本信息</Label>
        <Label x={344} y={114} size={11} color={INK_3}>化学成分</Label>
        <Label x={344} y={168} size={11} color={INK_3}>有形成分</Label>

        <Label x={8} y={210} size={11.5} color={INK_3}>三个层面描述的是同一份样本，不能互相替代。</Label>
      </Sheet>
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
};

export const diagramFor = key => registry[key] || null;
