// Generates a practical, non-diagnostic "questions to ask your doctor" checklist
// tailored to a published checkup indicator. Pure in-memory helper; never stores
// personal health data or produces diagnostic cutoffs.

export function buildDoctorChecklistItems(detail, relatedIndicators = [], reportRows = []) {
  if (!detail || detail.kind !== "indicator") return [];
  const title = detail.title || "这项检查";
  const relatedNames = relatedIndicators
    .map((item) => item?.title)
    .filter(Boolean)
    .slice(0, 3);
  const firstRow = reportRows[0] || "";

  const questions = [
    {
      id: "interference",
      tag: "排除干扰",
      text: `我这次「${title}」的结果，受近期熬夜、饮食、运动、感冒或正在服用的药物影响大吗？是否需要避开干扰后再复查一次？`,
      defaultChecked: true,
    },
    {
      id: "compare",
      tag: "横向与纵向对比",
      text: relatedNames.length
        ? `看「${title}」时，需要和报告里的${relatedNames.join("、")}以及往年旧体检单放在一起看变化趋势吗？`
        : `看「${title}」时，需要和报告里的其他相关项目以及往年旧体检单放在一起看变化趋势吗？`,
      defaultChecked: true,
    },
    {
      id: "followup",
      tag: "复查节奏",
      text: `结合我的年龄和整体情况，这项结果按常规年度体检观察就行，还是建议隔一段时间针对性复查？复查前需要做哪些准备？`,
      defaultChecked: true,
    },
    {
      id: "lifestyle",
      tag: "日常习惯",
      text: `针对「${title}」这一项，平时在作息、饮食或运动上最值得优先坚持的 1–2 件事是什么？`,
      defaultChecked: false,
    },
    {
      id: "redflags",
      tag: "就医信号",
      text: `平时如果出现哪些具体的身体不适或新变化，我应该提前来看门诊，而不要等到下一次体检？`,
      defaultChecked: true,
    },
  ];

  const preps = [
    {
      id: "prep-old-reports",
      tag: "就诊准备",
      text: "带上近 1–3 年旧体检报告原件或清晰照片（便于医生看纵向趋势）",
      defaultChecked: true,
    },
    {
      id: "prep-meds",
      tag: "就诊准备",
      text: "列出目前正在服用的处方药、非处方药及保健品名称",
      defaultChecked: true,
    },
    ...(firstRow
      ? [
          {
            id: "prep-row",
            tag: "核对原话",
            text: `向医生核对报告单上「${firstRow}」这一行的具体写法与本次参考区间`,
            defaultChecked: false,
          },
        ]
      : []),
  ];

  return { questions, preps };
}

export function formatChecklistText(title, selectedQuestions, selectedPreps) {
  const lines = [
    `【${title} · 复诊提问与准备清单】（知愈健康科普整理）`,
    "",
  ];
  if (selectedQuestions.length) {
    lines.push("一、想请教医生的问题：");
    selectedQuestions.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.text}`);
    });
    lines.push("");
  }
  if (selectedPreps.length) {
    lines.push("二、就诊前随身准备：");
    selectedPreps.forEach((item) => {
      lines.push(`- [ ] ${item.text}`);
    });
    lines.push("");
  }
  lines.push("注：本清单仅用于辅助与医生高效沟通，不含个人检查数值或医学诊断结论。");
  return lines.join("\n");
}
