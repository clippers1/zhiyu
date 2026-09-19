import test from 'node:test';
import assert from 'node:assert/strict';
import { readingRoute } from '../src/services/topics.js';

const detail = { kind: 'indicator', id: 'glucose', title: '血糖', reviewStatus: 'pending', relatedOrgans: [{ id: 'pancreas' }, { id: 'liver' }] };
const pancreas = { kind: 'organ', id: 'pancreas', title: '胰腺', reviewStatus: 'pending' };
test('routes use only published, explicitly related organs and do not duplicate steps', () => {
  const steps = readingRoute(detail, [pancreas, pancreas, { kind: 'organ', id: 'heart' }, { kind: 'indicator', id: 'liver' }]);
  assert.deepEqual(steps.map(step => step.href), ['/article/glucose', '/organs/pancreas', '/article/glucose#article-source-panel']);
  assert.ok(steps.every(step => step.trust.reviewStatus === 'pending'));
  assert.equal(steps[1].title, '一起了解胰腺');
});
test('missing relationships leave a useful concept/source route, not a fabricated organ', () => {
  assert.equal(readingRoute(detail, []).length, 2);
  assert.equal(readingRoute({ ...detail, relatedOrgans: [] }, [pancreas]).length, 2);
  assert.deepEqual(readingRoute(null), []);
  assert.deepEqual(readingRoute(pancreas), []);
});
test('review labels remain independent for each publication', () => {
  const steps = readingRoute({ ...detail, reviewStatus: 'reviewed' }, [pancreas]);
  assert.deepEqual(steps.map(step => step.trust.reviewStatus), ['reviewed', 'pending', 'reviewed']);
});
