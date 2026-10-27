import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readingGuide } from '../src/services/reading-guide.js';

test('quick reading and questions reuse published statements verbatim, including caveats and references', async () => {
  for (const id of ['glucose', 'pressure', 'lipids']) {
    const content = JSON.parse(await readFile(`public/content/indicator/${id}.json`, 'utf8'));
    const before = JSON.stringify(content);
    const guide = readingGuide(content);
    assert.equal(guide.concept.text, content.desc);
    assert.equal(guide.reminder.text, content.tip);
    assert.deepEqual(guide.concept.sourceIds, content.descriptionSourceIds);
    if (content.faq?.length) {
      // Long-form articles publish their own questions; the guide must use them
      // verbatim rather than inventing "如何理解…" from the metric list.
      assert.equal(guide.questions.length, content.faq.length);
      guide.questions.forEach((question, index) => {
        assert.equal(question.question, content.faq[index].question);
        assert.equal(question.answer.text, content.faq[index].answer);
        assert.deepEqual(question.answer.sourceIds, content.faq[index].sourceIds);
      });
      assert.ok(guide.questions.every(question => !/^如何理解/.test(question.question)));
    } else {
      assert.equal(guide.questions.length, content.metrics.length);
      guide.questions.forEach((question, index) => {
        assert.equal(question.answer.text, content.metrics[index].text);
        assert.deepEqual(question.answer.sourceIds, content.metrics[index].sourceIds);
      });
    }
    assert.equal(JSON.stringify(content), before);
  }
});

test('faq entries with unknown citations are dropped instead of shown without a source', () => {
  const content = {
    kind: 'indicator', references: [{ id: 'known' }], desc: 'd', descriptionSourceIds: ['known'],
    faq: [
      { question: '有来源的问题？', answer: 'a', sourceIds: ['known'] },
      { question: '无来源的问题？', answer: 'b', sourceIds: ['missing'] },
      { question: '空来源的问题？', answer: 'c', sourceIds: [] },
    ],
  };
  assert.deepEqual(readingGuide(content).questions.map(item => item.question), ['有来源的问题？']);
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
