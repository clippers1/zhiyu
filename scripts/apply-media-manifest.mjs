import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "docs/media-manifest.json"), "utf8"));

const FIGURE_MAP = {
  "indicator/glucose.json": {
    flow: {
      mediaId: "fig-glucose-flow",
      legend: [
        { title: "进入血液", text: "食物中的碳水化合物经消化形成葡萄糖，随血液流向全身。" },
        { title: "胰岛素信号", text: "胰腺分泌胰岛素，向细胞发出摄取和利用葡萄糖的信号。" },
        { title: "细胞利用与肝脏储存", text: "肌肉和脂肪等细胞摄取供能，多余部分暂存进肝脏调节供应。" },
      ],
    },
    windows: {
      mediaId: "fig-glucose-windows",
      legend: [
        { title: "空腹血糖", text: "至少 8 小时未摄入热量时的瞬时快照，观察安静状态下的基线。" },
        { title: "餐后 / 糖耐量", text: "进食或饮用葡萄糖溶液后，观察身体处理这一批糖的动态过程。" },
        { title: "糖化血红蛋白（HbA1c）", text: "随红细胞存留记录过去约 2–3 个月的平均血糖水平。" },
      ],
    },
  },
  "indicator/pressure.json": {
    pulse: {
      mediaId: "fig-pressure-flow",
      legend: [
        { title: "收缩压（高压）", text: "心脏收缩将血液泵出时，动脉血管壁承受的峰值压力。" },
        { title: "舒张压（低压）", text: "两次搏动之间心脏舒张充盈时，血管内仍保持的基础压力。" },
      ],
    },
  },
  "indicator/lipids.json": {
    transport: {
      mediaId: "fig-lipids-carriers",
      legend: [
        { title: "载脂蛋白运输车", text: "脂肪与胆固醇不溶于水，必须装进脂蛋白颗粒中随血液运输。" },
        { title: "向外输送与回收分工", text: "不同密度的脂蛋白方向各异，血脂报告需要合起来对照看。" },
      ],
    },
  },
  "indicator/cbc.json": {
    components: {
      mediaId: "fig-cbc-components",
      legend: [
        { title: "红细胞与血红蛋白", text: "负责把氧气从肺部运送到全身组织。" },
        { title: "白细胞", text: "参与免疫防御，不同亚型应对不同情况。" },
        { title: "血小板", text: "血管受损时迅速聚集，协助止血和修复。" },
      ],
    },
  },
  "indicator/liver-function.json": {
    tests: {
      mediaId: "fig-liver-tests",
      legend: [
        { title: "肝细胞内的酶", text: "如 ALT、AST，平时主要待在细胞里，细胞受损时释放入血。" },
        { title: "胆红素与胆汁通路", text: "反映肝脏处理代谢产物和排泄胆汁的顺畅程度。" },
        { title: "白蛋白等合成产物", text: "反映肝脏持续合成重要蛋白质的能力。" },
      ],
    },
  },
  "indicator/kidney-function.json": {
    filter: {
      mediaId: "fig-kidney-filter",
      legend: [
        { title: "血液进入肾小球滤网", text: "血液持续流经肾脏微滤结构，大分子蛋白与血细胞被留在血里。" },
        { title: "代谢废物排出", text: "肌酐、尿素等小分子废物滤入尿液排出体外，血尿两侧互相印证。" },
      ],
    },
  },
  "indicator/uric-acid.json": {
    path: {
      mediaId: "fig-uric-acid-path",
      legend: [
        { title: "体内生成与饮食来源", text: "嘌呤代谢产生尿酸，其中大部分来自人体自身细胞更新。" },
        { title: "肾脏与肠道排出", text: "尿酸主要经肾脏随尿液排出，生成与排出共同决定血尿酸水平。" },
      ],
    },
  },
  "indicator/thyroid-function.json": {
    axis: {
      mediaId: "fig-thyroid-axis",
      legend: [
        { title: "垂体发出 TSH 信号", text: "垂体分泌促甲状腺激素（TSH），像油门一样调节甲状腺工作节奏。" },
        { title: "甲状腺产出激素", text: "甲状腺分泌 T4 与 T3，参与调节全身能量代谢。" },
        { title: "负反馈回路", text: "血液中的甲状腺激素水平会反过来告诉垂体调高或调低信号。" },
      ],
    },
  },
  "indicator/urinalysis.json": {
    layers: {
      mediaId: "fig-urinalysis-layers",
      legend: [
        { title: "外观与比重", text: "观察颜色、清晰度与浓缩程度，受饮水与采样时段影响明显。" },
        { title: "化学试纸筛查", text: "快速筛查酸碱度、尿蛋白、尿糖、酮体等化学线索。" },
        { title: "显微镜沉渣观察", text: "查看尿液中是否存在红细胞、白细胞或管型等有形成分。" },
      ],
    },
  },
  "story/lab-range.json": {
    range: {
      mediaId: "fig-lab-range",
      legend: [
        { title: "不同参考人群与方法", text: "参考区间来自特定健康人群统计，受试剂、仪器与检测方法影响。" },
        { title: "以本张报告单为准", text: "同一个数字在两家医院落点不同很常见，对照必须使用同一张单子上的区间。" },
      ],
    },
  },
  "story/stairs-heart.json": {
    chain: {
      mediaId: "fig-stairs-heart",
      legend: [
        { title: "肌肉需氧增加", text: "爬楼时下肢大肌群做功加大，消耗的氧气与能量迅速上升。" },
        { title: "心率与呼吸协同提速", text: "心脏加快泵血、肺部加深呼吸，共同把更多含氧血送到肌肉。" },
      ],
    },
  },
};

for (const [relFile, map] of Object.entries(FIGURE_MAP)) {
  const fullPath = path.join(root, "public/content", relFile);
  const doc = JSON.parse(await readFile(fullPath, "utf8"));
  doc.figures = (doc.figures || []).map(fig => {
    const entry = map[fig.key];
    if (!entry) throw new Error(`${relFile}: unmapped figure key ${fig.key}`);
    const asset = manifest.items[entry.mediaId];
    if (!asset) throw new Error(`Missing media manifest entry: ${entry.mediaId}`);
    const { diagram, ...rest } = fig;
    return {
      ...rest,
      src: asset.src,
      width: asset.width,
      height: asset.height,
      legend: entry.legend,
      attribution: {
        kind: "ai-generated",
        name: "AI 生成插图",
        model: asset.model || "gpt-image-2.6",
        assetSha256: asset.sha256,
      },
    };
  });
  await writeFile(fullPath, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`Updated ${relFile}`);
}

const organs = [
  { id: "heart", name: "心脏", detail: "心脏与大血管", className: "portrait" },
  { id: "lung", name: "肺", detail: "肺叶与气管" },
  { id: "liver", name: "肝脏", detail: "肝脏与胆囊" },
  { id: "kidney", name: "肾脏", detail: "双肾与血管" },
  { id: "pancreas", name: "胰腺", detail: "胰腺外形", className: "landscape" },
];
const artworksObj = Object.fromEntries(organs.map(o => {
  const asset = manifest.items[`organ-${o.id}`];
  if (!asset) throw new Error(`Missing organ manifest entry: organ-${o.id}`);
  return [o.id, {
    name: o.name,
    src: asset.src,
    detail: o.detail,
    ...(o.className ? { className: o.className } : {}),
    width: asset.width,
    height: asset.height,
  }];
}));
const artworksSource = `// Shared 3D organ illustration records generated via gpt-image-2.6 (transparent WebP).
// Used by organ pages and by the body rail on the home page.
export const ARTWORK_MODEL = "gpt-image-2.6";
export const ARTWORK_CREDIT = \`AI 生成插图 · 模型 \${ARTWORK_MODEL}\`;

export const artworks = ${JSON.stringify(artworksObj, null, 2)};

export const artworkFor = id => artworks[id] || null;
`;
await writeFile(path.join(root, "src/services/artworks.js"), artworksSource);
console.log("Updated src/services/artworks.js");
