import { test } from 'node:test';
import assert from 'node:assert/strict';
import { business, seedState } from '../domain/reports.mjs';

test('composition respects selected inputs, snapshots, scope and versions', () => {
  const state = seedState();
  const source = state.reports.find(r => r.type === 'diagnosis' && r.equipmentId === 'truck-01');
  const body = { sourceId: source.id, sourceVersion: source.version, units: 1, delivery: '2026Q4', finance: false, documentIds: ['QUOTE-YL', 'PROC-YL'] };
  const first = business(state, body);
  assert.deepEqual(first.documentIds, ['PROC-YL', 'QUOTE-YL']);
  assert.ok(first.sections.some(s => s.title.includes('预算底稿')));
  assert.equal(first.evidenceSnapshot[0].id, source.id);
  assert.equal(business(state, { ...body, documentIds: ['PROC-YL', 'QUOTE-YL', 'PROC-YL'] }), first);
  const reduced = business(state, { ...body, documentIds: ['PROC-YL'] });
  assert.equal(reduced.version, first.version + 1);
  assert.ok(!reduced.evidenceSnapshot.some(d => d.id === 'QUOTE-YL'));
  assert.ok(!reduced.sections.some(s => s.title.includes('预算底稿')));
  assert.deepEqual(first.documentIds, ['PROC-YL', 'QUOTE-YL']);
  for (const documentIds of [['IOT-loader-01'], ['missing'], 'PROC-YL', [null]]) {
    assert.throws(() => business(state, { ...body, documentIds }), e => e.status === 400);
  }
  assert.throws(() => business(state, { ...body, sourceVersion: 999 }), e => e.status === 404);
  const other = state.reports.find(r => r.type === 'diagnosis' && r.equipmentId === 'truck-01' && r.id !== source.id);
  const next = business(state, { ...body, sourceId: other.id, sourceVersion: other.version });
  assert.equal(next.version, reduced.version + 1);
});
