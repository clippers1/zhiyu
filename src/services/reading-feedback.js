// Fixed choices only: do not turn this into a health-query/free-text collector.
export const READING_REACTIONS = [
  { id: "helpful", label: "有帮助", category: "experience", message: "阅读帮助度反馈：这篇内容对我有帮助。此反馈不是医学准确性评价。" },
  { id: "unclear", label: "仍没看懂", category: "clarity", message: "阅读帮助度反馈：我仍没看懂，希望解释更易理解。" },
  { id: "missing", label: "没找到想了解的", category: "experience", message: "阅读帮助度反馈：这篇内容未覆盖我想了解的问题。" },
];

export function readingFeedbackBody(content, choice, receipt, consent) {
  const reaction = READING_REACTIONS.find(item => item.id === choice);
  if (!reaction || consent !== true || !["indicator", "organ"].includes(content?.kind)
    || typeof content.id !== "string" || !/^[a-z0-9-]{1,100}$/.test(content.id) || !Number.isSafeInteger(content.releaseID) || content.releaseID < 1
    || !/^[a-f0-9]{64}$/.test(receipt)) throw new Error("请选择阅读感受，并确认提交说明。");
  return { kind: content.kind, slug: content.id, channel: content.demo ? "demo" : "official",
    releaseID: content.releaseID, category: reaction.category, message: reaction.message, receipt, consent: true };
}
