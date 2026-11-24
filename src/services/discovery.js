const validId = /^[a-z0-9-]+$/;

const byNumber = (left, right) =>
  numeric(left.number) - numeric(right.number) ||
  (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

function numeric(value) {
  const text = String(value ?? "");
  return /^\d+$/.test(text) ? Number(text) : Number.MAX_SAFE_INTEGER;
}

function readableIndicator(item) {
  return Boolean(item.question?.trim() && item.questionAnswer?.trim());
}

function publishedItems(items, kind, isReadable, sort) {
  const seen = new Set();
  const result = (Array.isArray(items) ? items : []).filter(item => {
    if (!item || item.kind !== kind || !validId.test(item.id || "") || !isReadable(item) || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return sort ? result.sort(sort) : result;
}

export function selectDiscovery(indicators = [], organs = [], stories = []) {
  const orderedQuestions = publishedItems(indicators, "indicator", readableIndicator, byNumber);
  // Stories carry no number; the catalog already returns them in editorial order.
  const orderedStories = publishedItems(stories, "story", readableIndicator);
  const availableOrgans = publishedItems(organs, "organ", item => Boolean(item.title?.trim()));
  // The home page answers one task: reading a lab report. So the lead is always
  // an indicator, never a story; `featured` is the editor's only lever, and the
  // lowest number wins among several. Nothing is reordered by popularity.
  const articleIndicators = orderedQuestions.filter(item => item.format === "article");
  const feature = articleIndicators.find(item => item.featured) || articleIndicators[0] || orderedQuestions[0] || null;
  return {
    feature,
    // Nine indicator articles are all long-form now, so a format-based split
    // would repeat the same content under two names. One index holds them all.
    indexRows: orderedQuestions.filter(item => item.id !== feature?.id).slice(0, 8),
    questions: orderedQuestions.slice(0, 3),
    stories: orderedStories,
    organs: availableOrgans.slice(0, 6),
    organPreview: availableOrgans[0] || null,
    guideAvailable: orderedQuestions.length >= 2,
    totalIndicators: orderedQuestions.length,
    totalOrgans: availableOrgans.length,
    totalStories: orderedStories.length,
  };
}

// The "next entry" is simply the next published item of the same kind in
// catalog order. It never wraps around, so the last article ends instead of
// looping. Stories stay inside the story list; indicators inside the index.
export function nextIndicator(items = [], id, kind = "indicator") {
  // Indicators are numbered; stories keep the catalog's editorial order.
  const ordered = publishedItems(items, kind, readableIndicator, kind === "indicator" ? byNumber : undefined);
  const index = ordered.findIndex(item => item.id === id);
  return index >= 0 ? ordered[index + 1] || null : null;
}
