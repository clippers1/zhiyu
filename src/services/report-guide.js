// 「单子怎么读」的手写内容源。
//
// Why a module instead of a content pack: this page explains how a printed
// report is laid out (columns, units, the marked interval), not a medical
// topic. It has no CMS draft, no review flow and no per-item variants, so it
// would only add a fourth content directory to the catalog pipeline. Keeping
// it in `src/services/` means both the Vite build and the Next SSR build bundle
// exactly the same text, and `scripts/report-guide.test.mjs` can check it the
// same way the content tests check the packs.
//
// Sources are the three references already used by
// `public/content/story/lab-range.json`, copied verbatim so the two pages can
// never drift apart. Nothing here interprets a personal result, names a
// threshold or prints a real value.

export const GUIDE_REFERENCES = [
  {
    id: "lab-results",
    publisher: "美国国家医学图书馆（NLM）· MedlinePlus",
    title: "How to Understand Your Lab Results",
    url: "https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/",
    scope: "参考区间的来源与人群分组、影响结果的生活因素、实验室方法差异与解释限制",
    locator: "What is a reference range?; What can affect my results?; What is a laboratory test?",
    accessedAt: "2026-10-27",
    language: "en",
    type: "机构健康科普",
    publicationDate: null,
  },
  {
    id: "prepare",
    publisher: "美国国家医学图书馆（NLM）· MedlinePlus",
    title: "How to Prepare for a Lab Test",
    url: "https://medlineplus.gov/lab-tests/how-to-prepare-for-a-lab-test/",
    scope: "检查前的准备说明、未按说明执行时结果可能受影响、药物与补充剂的影响",
    locator: "How do I prepare for a lab test?; Will I need to take other steps to prepare for my lab test?",
    accessedAt: "2026-10-27",
    language: "en",
    type: "机构健康科普",
    publicationDate: null,
  },
  {
    id: "blood-tests",
    publisher: "美国国立心肺血液研究所（NHLBI）",
    title: "Blood Tests",
    url: "https://www.nhlbi.nih.gov/health/blood-tests",
    scope: "常见血液检查的用途：筛查、监测器官功能与治疗效果；结果需结合其他信息",
    locator: "Types of blood tests",
    accessedAt: "2026-10-27",
    language: "en",
    type: "机构健康科普",
    publicationDate: null,
  },
];

export const GUIDE_SECTIONS = [
  {
    title: "一行结果，通常有这几列",
    paragraphs: [
      {
        text: "检验报告单的每一行，通常先写项目名称，再写这次的结果。名称可能是中文全称，也可能只有缩写，或者两者并列；缩写在不同机构之间并不完全统一，读的时候以这张单子自己的写法为准。",
        sourceIds: ["lab-results"],
      },
      {
        text: "结果后面通常跟着单位和参考区间。单位说明这个数字按什么尺度记录，参考区间说明在同一套检测方法下，一群健康人的结果大致落在哪里。有些报告还会附上检测方法、样本类型和备注，这些信息用来解释这行结果是怎么得到的。",
        sourceIds: ["lab-results"],
      },
    ],
  },
  {
    title: "参考区间描述的是「一群人」，不是「你」",
    paragraphs: [
      {
        text: "参考区间来自大样本健康人群的测量结果，取其中常见的范围。同一个项目，不同人群可能有各自的区间，例如儿童和成人、男性与女性；年龄、居住海拔等因素也可能让区间不同。",
        sourceIds: ["lab-results", "blood-tests"],
      },
      {
        text: "所以「正常值」这个说法容易让人误解。健康人偶尔也会落在区间之外，落在区间外不一定代表有病；反过来，结果在区间内，也不等于一定没有问题。区间是参考，不是判据。",
        sourceIds: ["lab-results"],
      },
    ],
  },
  {
    title: "箭头是报告单的排版，不是诊断",
    paragraphs: [
      {
        text: "不少报告单会用箭头或颜色标出结果与所标区间的关系：向上或向下的箭头，表示这个数字落在区间之外。这只是排版约定，方便快速浏览；不同机构可能用不同记号，有的单子只列数值、不额外标记，具体含义以报告单上的说明为准。",
        sourceIds: ["lab-results"],
      },
      {
        text: "看到一个箭头时，更有用的做法是回到这一行本身：它标注的区间是多少、这次结果和区间差在哪里、采样条件是否一致。单次结果落在区间外，通常需要结合症状、既往结果和其他检查一起看，而不是只凭一个记号下结论。",
        sourceIds: ["lab-results"],
      },
    ],
  },
  {
    title: "数字背后还有单位和检测方法",
    paragraphs: [
      {
        text: "不同项目使用不同的计量单位，同一个项目在不同实验室也可能采用不同方法。方法和仪器不同，参考区间往往也不同，所以不能拿别处查到的区间来对照自己这张单子上的结果。",
        sourceIds: ["lab-results"],
      },
      {
        text: "如果想把几次结果放在一起看趋势，尽量选择同一家实验室、同一套方法。跨机构、跨方法的数字放在一起比较，差异可能来自检测本身，而不一定来自身体的变化。",
        sourceIds: ["lab-results"],
      },
    ],
  },
  {
    title: "拿到单子，先确认这几件事",
    paragraphs: [
      {
        text: "先确认采样条件：这项检查是否要求空腹、距离上次进食多久、抽血前有没有按说明停用某些药物或补充剂。没有按说明准备，结果可能和平时不一样，这类影响并不罕见。",
        sourceIds: ["prepare", "lab-results"],
      },
      {
        text: "再看这张单子自己标注的单位和参考区间，而不是凭记忆里的「标准数字」。如果结果落在区间外、或者你有不舒服的症状，把整张单子交给了解你情况的医生，由对方结合症状和其他检查判断；本文只解释单子的结构，不解读个人数值。",
        sourceIds: ["lab-results"],
      },
    ],
  },
  {
    title: "整本多页报告，先看总览再看单项",
    paragraphs: [
      {
        text: "拿到厚厚一本综合体检报告时，可以先看前面的汇总结论与建议栏，分清哪些提示需要尽快去门诊核查，哪些属于定期随访观察，再回头翻具体检验页和影像描述，避免一页页焦虑。",
        sourceIds: ["lab-results", "blood-tests"],
      },
      {
        text: "去门诊找医生解读之前，建议带上整份完整报告和往年旧单方便对照变化趋势，并顺手记下近期的不适症状、抽血前的作息饮食情况，以及正在服用的药物或保健品，帮助医生结合完整背景给出判断。",
        sourceIds: ["prepare", "lab-results"],
      },
    ],
  },
];

export const GUIDE_FAQ = [
  {
    question: "报告单上的箭头是什么意思？",
    answer: "箭头是报告单用来提示「这个结果落在所标区间之外」的排版记号。不同机构的记号不完全一样，有的只列数值不标记。它表示结果与区间的关系，不等同于疾病诊断；是否需要注意，要结合症状、采样条件和其他检查。",
    sourceIds: ["lab-results"],
  },
  {
    question: "参考区间就是「正常值」吗？",
    answer: "不是同一个意思。参考区间是健康人群测量结果的常见范围，会随人群、方法和仪器变化。把它叫作「正常值」容易让人以为区间外就是有病、区间内就是没病，这两种推断都不成立。",
    sourceIds: ["lab-results"],
  },
  {
    question: "为什么同一项目，两家医院的区间不一样？",
    answer: "因为实验室使用的检测方法、仪器和单位可能不同，参考区间也会随之不同。读结果时应使用这张报告单上标注的区间，不要把另一家医院的区间套过来。",
    sourceIds: ["lab-results"],
  },
  {
    question: "抽血前为什么有时要求空腹？",
    answer: "食物中的成分吸收后会进入血液，可能影响某些项目的测量。空腹要求的具体时长按检查机构说明执行；如果没做到，应如实告诉采样人员，因为即使很小的准备差异也可能影响结果。",
    sourceIds: ["prepare"],
  },
  {
    question: "结果在区间内，还需要给医生看吗？",
    answer: "区间内不等于一定没有问题。有些人有健康问题，结果仍可能落在参考区间内；如果存在症状，或者医生原本就在监测某个情况，仍应按安排复诊。是否需要额外检查，由了解你情况的医生决定。",
    sourceIds: ["lab-results"],
  },
  {
    question: "多页体检报告去门诊复核前，需要准备什么？",
    answer: "尽量把整本报告、历年旧报告和影像胶片或电子片一起带上，而不是只拍某一行的局部照片；同时记下近期身体不适以及正在使用的药物与补充剂，方便医生整体评估。",
    sourceIds: ["prepare", "lab-results"],
  },
];

// Printed names that map a report row to the article explaining it. The labels
// are deliberately restricted to names the article body actually uses, so the
// little strip never points at a term the page does not explain.
// `scripts/report-guide.test.mjs` verifies every label against the catalog
// search text of the matching indicator.
export const REPORT_ROWS = {
  glucose: {
    title: "血糖",
    rows: ["空腹血糖（FPG）", "糖化血红蛋白（HbA1c）", "口服葡萄糖耐量试验（OGTT）", "随机血糖"],
  },
  pressure: {
    title: "血压",
    rows: ["收缩压（高压）", "舒张压（低压）"],
  },
  lipids: {
    title: "血脂",
    rows: ["总胆固醇（TC）", "甘油三酯（TG）", "低密度脂蛋白胆固醇（LDL-C）", "高密度脂蛋白胆固醇（HDL-C）"],
  },
  cbc: {
    title: "血常规",
    rows: ["白细胞（WBC）", "红细胞（RBC）", "血红蛋白（HGB）", "血小板（PLT）"],
  },
  "liver-function": {
    title: "肝功能",
    rows: ["丙氨酸氨基转移酶（ALT）", "天门冬氨酸氨基转移酶（AST）", "胆红素（TBIL）", "白蛋白（ALB）"],
  },
  "kidney-function": {
    title: "肾功能",
    rows: ["血肌酐（CREA）", "估算肾小球滤过率（eGFR）", "尿白蛋白肌酐比（UACR）"],
  },
  "uric-acid": {
    title: "尿酸",
    rows: ["血尿酸（UA）"],
  },
  "thyroid-function": {
    title: "甲状腺功能",
    rows: ["促甲状腺激素（TSH）", "甲状腺素（T4）", "三碘甲状腺原氨酸（T3）"],
  },
  urinalysis: {
    title: "尿常规",
    rows: ["尿蛋白", "尿糖", "尿潜血", "尿沉渣镜检"],
  },
  "fatty-liver": {
    title: "脂肪肝",
    rows: ["腹部超声", "肝实质回声增强", "非酒精性脂肪肝（NAFLD）", "代谢相关脂肪性肝病（MASLD）"],
  },
  "thyroid-nodule": {
    title: "甲状腺结节",
    rows: ["甲状腺超声（TI-RADS）", "低回声结节", "甲状腺囊肿", "细针穿刺（FNA）"],
  },
  "lung-nodule": {
    title: "肺结节",
    rows: ["磨玻璃结节（GGO / GGN）", "实性结节", "微小结节", "低剂量CT（LDCT）"],
  },
  ecg: {
    title: "心电图",
    rows: ["窦性心律", "期前收缩", "ST-T改变", "动态心电图（Holter）"],
  },
  "tumor-markers": {
    title: "肿瘤标志物",
    rows: ["癌胚抗原（CEA）", "甲胎蛋白（AFP）", "肿瘤指标（CA125 / CA199 / PSA）"],
  },
  "h-pylori": {
    title: "幽门螺杆菌",
    rows: ["尿素呼气试验（C13 / C14）", "粪便抗原检测", "血清抗体检测"],
  },
  "carotid-ultrasound": {
    title: "颈动脉超声",
    rows: ["内中膜厚度（IMT）", "颈动脉斑块", "多普勒超声"],
  },
  gallbladder: {
    title: "胆囊超声",
    rows: ["胆囊息肉样病变", "胆囊结石", "胆囊壁毛糙"],
  },
  "breast-ultrasound": {
    title: "乳腺超声",
    rows: ["乳腺结节", "乳腺增生", "乳腺囊肿", "乳腺超声（BI-RADS）"],
  },
  "stool-fobt": {
    title: "便常规与便潜血",
    rows: ["免疫化学法便潜血（FIT）", "化学法便潜血（gFOBT）", "大便常规"],
  },
  "bone-density": {
    title: "骨密度检查",
    rows: ["双能 X 线吸收法（DXA / DEXA）", "骨密度（BMD）", "T 值", "Z 值"],
  },
};

// The object SourceReferences expects: references plus the version fields it
// prints. Review status stays "pending", like every static pack, so the page
// carries the same 来源待核对 stamp as the articles.
export const GUIDE_CONTENT = {
  id: "guide",
  kind: "guide",
  title: "单子怎么读",
  subtitle: "一张化验单上的列、区间和记号，分别是什么意思。",
  version: 1,
  updatedAt: "2026-11-03",
  reviewStatus: "pending",
  applicability: "面向拿到检验报告单、想先看懂版面结构的一般成年读者。",
  limitations: "不提供任何项目的参考数值、结果判断、复查或治疗建议；具体区间的适用条件以出具报告的实验室说明为准。",
  references: GUIDE_REFERENCES,
};

export function reportRowsFor(id) {
  const entry = REPORT_ROWS[id];
  return entry ? entry.rows : [];
}
