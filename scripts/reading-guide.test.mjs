import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readingGuide } from '../src/services/reading-guide.js';
import { READING_REACTIONS, readingFeedbackBody } from '../src/services/reading-feedback.js';
import { normalizePosition } from '../src/services/reading.js';

test('quick reading and questions reuse published statements verbatim, including caveats and references', async () => {
  for (const id of ['glucose', 'pressure', 'lipids']) {
    const content = JSON.parse(await readFile(`public/content/indicator/${id}.json`, 'utf8'));
    const before = JSON.stringify(content);
    const guide = readingGuide(content);
    assert.equal(guide.concept.text, content.desc);
    assert.equal(guide.reminder.text, content.tip);
    assert.deepEqual(guide.concept.sourceIds, content.descriptionSourceIds);
    assert.equal(guide.questions.length, content.metrics.length);
    guide.questions.forEach((question, index) => {
      assert.equal(question.answer.text, content.metrics[index].text);
      assert.deepEqual(question.answer.sourceIds, content.metrics[index].sourceIds);
    });
    assert.equal(JSON.stringify(content), before);
  }
});

test('missing or unknown citations do not produce unsourced shortcuts; non-indicator records are ignored', () => {
  assert.equal(readingGuide(null), null);
  assert.equal(readingGuide({ kind: 'organ' }), null);
  const content = { kind: 'indicator', references: [{ id: 'known' }], desc: 'x', descriptionSourceIds: ['missing'], tip: 'y', metrics: [{ name: 'Term', text: 'z', sourceIds: [] }] };
  assert.equal(readingGuide(content), null);
  const guide = readingGuide({ ...content, tipSourceIds: ['known', 'known'] });
  assert.deepEqual(guide.reminder, { text: 'y', sourceIds: ['known'] });
  assert.equal(guide.concept, null);
  assert.deepEqual(guide.questions, []);
});

test('a newer publication changes every derived statement without a separate summary cache', () => {
  const content = { kind: 'indicator', references: [{ id: 'ref' }], desc: 'old', descriptionSourceIds: ['ref'] };
  assert.equal(readingGuide(content).concept.text, 'old');
  assert.equal(readingGuide({ ...content, desc: 'new with limitations' }).concept.text, 'new with limitations');
  assert.equal(readingGuide({ ...content, references: [] }), null);
});

test('quick-read and term question sections are accepted by version-bound reading positions', () => {
  for (const section of ['article-quick-read', 'article-questions']) {
    assert.deepEqual(normalizePosition('indicator', { section, revision: 'release:2' }), { section, revision: 'release:2' });
    assert.equal(normalizePosition('organ', { section, revision: 'release:2' }), undefined);
  }
});

test('reading feedback is fixed-choice, consented, publication-bound and contains no personal extras', () => {
  const content = { kind: 'indicator', id: 'glucose', demo: true, releaseID: 3, search: 'private', desc: 'private' };
  for (const option of READING_REACTIONS) {
    const body = readingFeedbackBody(content, option.id, 'a'.repeat(64), true);
    assert.equal(body.releaseID, 3);
    assert.equal(body.message, option.message);
    assert.ok(body.message.length >= 10);
    assert.equal(body.channel, 'demo');
    assert.equal(body.category, option.category);
    assert.ok(!JSON.stringify(body).includes('private'));
  }
  assert.equal(readingFeedbackBody({ ...content, demo: false }, 'helpful', 'a'.repeat(64), true).channel, 'official');
  for (const bad of [{ ...content, releaseID: undefined }, { ...content, id: undefined }, { ...content, id: 123 }, { ...content, id: '../admin' }, { ...content, kind: 'other' }]) {
    assert.throws(() => readingFeedbackBody(bad, 'helpful', 'a'.repeat(64), true));
  }
  assert.throws(() => readingFeedbackBody(content, 'free text', 'a'.repeat(64), true));
  assert.throws(() => readingFeedbackBody(content, 'helpful', 'a'.repeat(64), false));
  assert.throws(() => readingFeedbackBody(content, 'helpful', 'guessable', true));
});
