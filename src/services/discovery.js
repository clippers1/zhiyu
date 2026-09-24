const validId = /^[a-z0-9-]+$/;

function publishedItems(items, kind, isReadable) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .filter(item => {
      if (!item || item.kind !== kind || !validId.test(item.id || "") || !isReadable(item) || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((left, right) => Number(Boolean(right.featured)) - Number(Boolean(left.featured)) ||
      (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

export function selectDiscovery(indicators = [], organs = []) {
  const availableQuestions = publishedItems(indicators, "indicator", item =>
    Boolean(item.question?.trim() && item.questionAnswer?.trim()));
  const availableOrgans = publishedItems(organs, "organ", item => Boolean(item.title?.trim()));
  return {
    questions: availableQuestions.slice(0, 3),
    guideAvailable: availableQuestions.length >= 2,
    organPreview: availableOrgans[0] || null,
  };
}
