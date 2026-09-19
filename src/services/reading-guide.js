// A second reading layout for the SAME published statements, not generated
// medical summaries. Never truncate caveats or borrow a newer draft's text.
export function readingGuide(content) {
  if (content?.kind !== "indicator") return null;
  const sources = new Set((content.references || []).map(source => source.id));
  const statement = (text, sourceIds) => typeof text === "string" && text.trim()
    && Array.isArray(sourceIds) && sourceIds.length && sourceIds.every(id => sources.has(id))
    ? { text, sourceIds: [...new Set(sourceIds)] } : null;
  const concept = statement(content.desc, content.descriptionSourceIds);
  const reminder = statement(content.tip, content.tipSourceIds);
  const questions = (Array.isArray(content.metrics) ? content.metrics : []).flatMap((metric, index) => {
    const answer = statement(metric.text, metric.sourceIds);
    return answer && typeof metric.name === "string" && metric.name.trim()
      ? [{ id: `term-${index}`, question: `如何理解${metric.name}？`, answer }] : [];
  }).slice(0, 8);
  return concept || reminder || questions.length ? { concept, reminder, questions } : null;
}
