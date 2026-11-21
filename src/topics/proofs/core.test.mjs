/* node --test src/topics/proofs/core.test.mjs
   The checker core: statement normal forms (spec §6.2), truth in the coordinates, the fact-graph
   checker (§10.2) and the level presentation (§7.2–7.4). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { norm, holds, show, say, segKey, measure, partsOf, kindOf } from './core.js';
import { xsas, over } from './fixtures.mjs';

const F = xsas().figure;
const S = (x, y) => ({ kind: 'seg', x, y });
const A = (v, r) => ({ v, r });
test('norm: segment statements ignore order and direction', () => {
  assert.equal(norm(F, S('AO', 'OB')), norm(F, S('BO', 'OA'))); assert.notEqual(norm(F, S('AO', 'OB')), norm(F, S('AO', 'CO')));
  assert.equal(segKey('OA'), 'AO');
});
test('norm: an angle is its two rays (∢OAC is ∢BAC when O is on AB)', () => {
  assert.equal(norm(F, { kind: 'ang', x: A('A', ['O', 'C']), y: A('B', ['O', 'D']) }), norm(F, { kind: 'ang', x: A('B', ['D', 'A']), y: A('A', ['C', 'B']) }));
  assert.notEqual(norm(F, { kind: 'ang', x: A('O', ['A', 'C']), y: A('O', ['B', 'D']) }), norm(F, { kind: 'ang', x: A('O', ['A', 'D']), y: A('O', ['B', 'C']) }));
});
test('norm: all 6 vertex orders and both sides-first are one statement', () => {
  const k = norm(F, { kind: 'cong', map: [['A', 'B'], ['O', 'O'], ['C', 'D']] });
  assert.equal(norm(F, { kind: 'cong', map: [['O', 'O'], ['C', 'D'], ['A', 'B']] }), k);
  assert.equal(norm(F, { kind: 'cong', map: [['D', 'C'], ['B', 'A'], ['O', 'O']] }), k);
  assert.notEqual(norm(F, { kind: 'cong', map: [['A', 'D'], ['O', 'O'], ['C', 'B']] }), k);
});
test('holds: only what is true in the coordinates', () => {
  assert.equal(holds(F, S('AO', 'OB')), true); assert.equal(holds(F, S('AC', 'BD')), true);
  assert.equal(holds(F, S('AD', 'CB')), true);            // true, though not a fact of the graph
  assert.equal(holds(F, S('AO', 'CO')), false);
  assert.equal(holds(F, { kind: 'cong', map: [['A', 'B'], ['O', 'O'], ['C', 'D']] }), true);
  assert.equal(holds(F, { kind: 'cong', map: [['A', 'D'], ['O', 'O'], ['C', 'B']] }), false);
  assert.equal(holds(over().figure, S('AB', 'AD')), true);
  assert.ok(Math.abs(measure(F, 'AO') - Math.hypot(98, 58)) < 1e-9);
});
test('holds: a right-angle statement also needs 90°', () => {
  const K = over().figure;
  assert.equal(holds(K, { kind: 'ang', x: A('A', ['B', 'C']), y: A('A', ['D', 'C']) }), true);
  assert.equal(holds(K, { kind: 'ang', x: A('A', ['B', 'C']), y: A('A', ['D', 'C']), right: true }), false);
});
test('show / say', () => {
  assert.equal(show(S('AO', 'OB')), 'AO = OB'); assert.equal(show({ kind: 'cong', map: [['A', 'B'], ['O', 'O'], ['C', 'D']] }), '△AOC ≅ △BOD');
  assert.equal(show({ kind: 'ang', x: A('D', ['A', 'B']), y: A('D', ['A', 'C']), right: true }), '∢ADB = ∢ADC = 90°');
  assert.equal(say(S('AO', 'OB')), 'הקטע AO שווה לקטע OB'); assert.equal(say({ kind: 'cong', map: [['A', 'B'], ['O', 'O'], ['C', 'D']] }), 'המשולש AOC חופף למשולש BOD');
});
test('parts and kinds', () => {
  assert.deepEqual(partsOf(S('AO', 'OB')), ['AO', 'OB']);
  assert.deepEqual(partsOf({ kind: 'cong', map: [['A', 'B'], ['O', 'O'], ['C', 'D']] }), [['A', 'O', 'C'], ['B', 'O', 'D']]);
  assert.deepEqual([kindOf('AO'), kindOf(A('O', ['A', 'C'])), kindOf(['A', 'O', 'C'])], ['seg', 'ang', 'tri']);
});
