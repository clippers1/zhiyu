export function contentTrust(content) {
  content ||= {};
  const reviewed = content.reviewStatus === "reviewed" && Boolean(content.review?.name);
  const sourceChecked = content.publicationBasis === "source-curated" && Boolean(content.sourceCheck?.checkedAt);
  if (reviewed) return { kind: "reviewed", trusted: true, short: "专业审校", label: "该版本已完成专业审校" };
  if (sourceChecked) return { kind: "source-curated", trusted: true, short: "来源已核对", label: "依据具体来源整理" };
  return { kind: "demo", trusted: false, short: "来源待核对", label: "Beta 科普 · 来源与表达待完整核对" };
}
