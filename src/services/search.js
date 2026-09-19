// Deliberately limited to Latin letters, digits and basic Chinese characters.
// Formatting tolerance is not a medical synonym/diagnosis inference engine.
export function normalizeSearch(value = "") {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
}

export function searchRank(item, needle) {
  if (!needle) return -1;
  const title = normalizeSearch(item.title);
  const english = normalizeSearch(item.english);
  const tags = (item.tags || []).map(normalizeSearch);
  if (title === needle) return 0;
  if (english === needle || tags.includes(needle)) return 1;
  if (title.includes(needle)) return 2;
  if (english.includes(needle) || tags.some(tag => tag.includes(needle))) return 3;
  return [item.subtitle, item.searchText].some(text => normalizeSearch(text).includes(needle)) ? 4 : -1;
}

export const matchLabels = ["标题", "英文名称或标签", "标题", "英文名称或标签", "正文或别名"];

// A single insertion/deletion/substitution or adjacent transposition; no guesses
// for short Chinese terms or short abbreviations, where confusion is dangerous.
export function nearSearch(a, b) {
  if (a === b || a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  if (!/^[a-z0-9]+$/.test(a) || !/^[a-z0-9]+$/.test(b)) return false;
  if (a.length === b.length) {
    const differences = [...a].flatMap((char, i) => char === b[i] ? [] : [i]);
    if (differences.length === 1) return true;
    const [i, j] = differences;
    return differences.length === 2 && j === i + 1 && a[i] === b[j] && a[j] === b[i];
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < short.length && short[i] === long[i]) i++;
  return short.slice(i) === long.slice(i + 1);
}

export function searchSuggestions(items, query) {
  const needle = normalizeSearch(query);
  const choices = new Set();
  for (const item of items.slice(0, 200)) {
    for (const label of [item.title, item.english, ...(item.tags || [])]) {
      if (!label) continue;
      const forms = [normalizeSearch(label), ...String(label).match(/[a-zA-Z][a-zA-Z0-9-]{3,}/g) || []].map(normalizeSearch);
      if (forms.some(form => nearSearch(needle, form))) choices.add(label);
      if (choices.size === 3) return [...choices];
    }
  }
  return [...choices];
}
