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

/* ── Task 3: the graph checker (§10.2) ── */
import { classify, checkReason, checkMatching, required, isDone, canonRows, findFact, roleOf } from './core.js';
const P = xsas(), fact = (id) => P.facts[id];
test('classify: every case of §10.2', () => {
  assert.deepEqual(classify(P, [], fact('a')).c, 'ok');
  assert.equal(classify(P, [], { kind: 'seg', x: 'BO', y: 'OA' }).fact, 'a');
  assert.equal(classify(P, ['a'], fact('a')).c, 'written');
  let r = classify(P, [], fact('cong'));   assert.deepEqual([r.c, r.sub, r.kind, r.textKey, r.vars.n], ['early', 'congruence', 'too-early', 'st.congEarly', 0]);
  assert.equal(classify(P, ['a', 'c'], fact('cong')).vars.n, 2);
  r = classify(P, [], fact('goal'));        assert.deepEqual([r.c, r.sub, r.kind], ['early', 'target', 'goal-as-known']);
  r = classify(P, [], fact('e1'));          assert.deepEqual([r.c, r.sub, r.kind], ['early', 'consequence', 'looks-equal']);
  r = classify(P, ['a', 'b', 'c', 'cong'], fact('e1')); assert.deepEqual([r.c, r.textKey], ['extra', 'st.notNeeded']);
  r = classify(P, [], { kind: 'seg', x: 'AD', y: 'CB' }); assert.deepEqual([r.c, r.textKey], ['unprovable', 'st.unprovable']);
  r = classify(P, [], { kind: 'seg', x: 'AO', y: 'CO' }); assert.deepEqual([r.c, r.kind, r.textKey], ['false', 'false-statement', 'st.falseSeg']);
  r = classify(P, ['a', 'b', 'c'], { kind: 'cong', map: [['A', 'D'], ['O', 'O'], ['C', 'B']] }); assert.deepEqual([r.c, r.kind], ['false', 'wrong-matching']);
  assert.deepEqual(r.vars, { s1: 'AO', s2: 'OB', p: 'A', q: 'B' });
  r = classify(P, ['a', 'b', 'c'], { kind: 'cong', map: [['A', 'O'], ['O', 'B'], ['C', 'D']] }); assert.equal(r.textKey, 'st.matchingShared');
  assert.equal(classify(P, ['a', 'b', 'c'], { kind: 'cong', map: [['C', 'D'], ['A', 'B'], ['O', 'O']] }).c, 'ok');
});
test('classify: a trap has its own message; type 2 extras are "not asked"', () => {
  const Q = xsas(); const st = { kind: 'seg', x: 'AO', y: 'CO' };
  Q.traps = { [`S:AO=CO`]: { kind: 'false-statement', textKey: 'st.letterSwap', vars: { given: 'AO = OB' } } };
  const r = classify(Q, [], st); assert.deepEqual([r.c, r.kind, r.textKey, r.vars.given], ['false', 'false-statement', 'st.letterSwap', 'AO = OB']);
  const W = xsas(); W.type = 'congruent-parts';
  assert.equal(classify(W, ['a', 'b', 'c', 'cong'], fact('e1')).textKey, 'st.notAsked');
});
test('any valid order is accepted; nothing is compared with canon', () => {
  for (const order of [['a', 'c', 'b'], ['b', 'a', 'c'], ['c', 'b', 'a']]) {
    const done = [];
    for (const id of [...order, 'cong', 'goal']) { assert.equal(classify(P, done, fact(id)).c, 'ok', id); done.push(id); }
    assert.equal(isDone(P, done), true);
  }
  assert.deepEqual(canonRows(P).map((x) => x.fact), ['a', 'c', 'b', 'cong', 'goal']);
  assert.equal(findFact(P, { kind: 'ang', x: { v: 'O', r: ['D', 'B'] }, y: { v: 'O', r: ['C', 'A'] } }), 'c');
  assert.deepEqual(['a', 'c', 'cong', 'goal', 'e1'].map((f) => roleOf(P, f)), ['given', 'vertical', 'congruence', 'conclusion', 'conclusion']);
});
test('checkReason: the table of §9.2', () => {
  const miss = (done, f, rs) => { const x = checkReason(P, done, f, rs); return [x.ok, x.kind, x.textKey]; };
  assert.equal(checkReason(P, [], 'a', 'given').ok, true);
  assert.deepEqual(miss([], 'a', 'vertical'), [false, 'wrong-source', 'rs.given.vertical']);
  assert.deepEqual(miss([], 'a', 'common-side'), [false, 'wrong-source', 'rs.given.common']);
  assert.deepEqual(miss([], 'a', 'sas'), [false, 'too-early', 'rs.fact.theorem']);
  assert.deepEqual(miss([], 'a', 'cp-sides'), [false, 'goal-as-known', 'rs.fact.cp']);
  assert.deepEqual(miss([], 'c', 'given'), [false, 'wrong-source', 'rs.seen.given']);
  assert.deepEqual(miss([], 'c', 'alternate'), [false, 'wrong-source', 'rs.vertical.alternate']);
  assert.deepEqual(miss([], 'c', 'common-angle'), [false, 'wrong-source', 'rs.vertical.common']);
  const d3 = ['a', 'c', 'b'];
  assert.equal(checkReason(P, d3, 'cong', 'sas').ok, true);
  assert.deepEqual(miss(d3, 'cong', 'asa'), [false, 'wrong-theorem', 'rs.cong.asa1']);
  assert.deepEqual(miss(d3, 'cong', 'sss'), [false, 'wrong-theorem', 'rs.cong.sss2']);
  assert.deepEqual(miss(d3, 'cong', 'given'), [false, 'wrong-source', 'rs.cong.given']);
  assert.deepEqual(miss(d3, 'cong', 'cp-angles'), [false, 'wrong-source', 'rs.cong.cp']);
  const d4 = [...d3, 'cong'];
  assert.equal(checkReason(P, d4, 'goal', 'cp-sides').ok, true);
  assert.deepEqual(miss(d4, 'goal', 'cp-angles'), [false, 'wrong-source', 'rs.concl.otherCp']);
  assert.deepEqual(checkReason(P, d4, 'goal', 'cp-angles').vars, { these: 'צלעות', those: 'זוויות' });
  assert.deepEqual(miss(d4, 'goal', 'given'), [false, 'goal-as-known', 'rs.concl.given']);
  assert.deepEqual(miss(d4, 'goal', 'sas'), [false, 'wrong-source', 'rs.concl.theorem']);
  assert.deepEqual(miss(d4, 'goal', 'vertical'), [false, 'wrong-source', 'rs.other']);
});
test('a fact given in words accepts the definition and "given"; another definition is wrong-word', () => {
  const W = xsas(); W.just.a = [{ reasons: ['midpoint', 'given'], needs: [] }]; W.roles.a = 'given-words';
  assert.equal(checkReason(W, [], 'a', 'midpoint').ok, true); assert.equal(checkReason(W, [], 'a', 'given').ok, true);
  const x = checkReason(W, [], 'a', 'median'); assert.deepEqual([x.kind, x.textKey], ['wrong-word', 'rs.words.otherDef']);
  assert.deepEqual(x.vars, { word: 'אמצע' });
});
test('an over-determined proof: both theorems are right, each on its own premises', () => {
  const O = over();
  assert.deepEqual([...required(O)].sort(), ['a', 'b', 'cong', 'g', 'k']);
  assert.equal(checkReason(O, ['a', 'b', 'k'], 'cong', 'sss').ok, true);  assert.equal(checkReason(O, ['a', 'b', 'k'], 'cong', 'sas').ok, false);
  assert.equal(checkReason(O, ['a', 'g', 'k'], 'cong', 'sas').ok, true);  assert.equal(checkReason(O, ['a', 'g', 'k'], 'cong', 'sss').ok, false);
  assert.equal(classify(O, ['a', 'g', 'k'], O.facts.cong).c, 'ok');       assert.equal(classify(O, ['a', 'k'], O.facts.cong).c, 'early');
  assert.equal(checkReason(O, ['a', 'g', 'k'], 'cong', 'sss').textKey, 'rs.cong.sss2');
  assert.equal(checkReason(O, ['a', 'b', 'k'], 'cong', 'sas').textKey, 'rs.cong.noAngle');
});
test('checkMatching: any consistent order', () => {
  assert.equal(checkMatching(P, ['A', 'O', 'C'], ['B', 'O', 'D']).ok, true);
  assert.equal(checkMatching(P, ['C', 'A', 'O'], ['D', 'B', 'O']).ok, true);
  assert.equal(checkMatching(P, ['B', 'O', 'D'], ['A', 'O', 'C']).ok, true);
  assert.equal(checkMatching(P, ['A', 'O', 'C'], ['D', 'O', 'B']).kind, 'wrong-matching');
  assert.equal(checkMatching(P, ['A', 'O', 'C'], ['O', 'B', 'D']).textKey, 'st.matchingShared');
});

/* ── Task 9: what each level presents (§7.2–7.4) ── */
import { present, reasonChips, decisionsOf, optionsFor, whyOf } from './core.js';
import { seeded, makeR } from '../new/core.js';
test('present: decisions per level for the X-SAS conclusion proof', () => {
  const R = makeR(seeded(1)), n = (l, v, c = 0) => decisionsOf(present(P, l, v, { counted: c, R }));
  assert.equal(n(1, 'A'), 1); assert.equal(n(1, 'B', 0), 3); assert.equal(n(1, 'B', 2), 4);
  assert.equal(n(2, 'A'), 6); assert.equal(n(2, 'B'), 10); assert.equal(n(3, 'A'), 10); assert.equal(n(3, 'B'), 10);
  assert.equal(present(P, 2, 'A', { R }).tiles.every((t) => t.fact), true);            // no wrong tiles in A
  assert.ok(present(P, 2, 'B', { R }).tiles.filter((t) => !t.fact).length <= 2);
  assert.deepEqual(present(P, 2, 'A', { R }).pre.sort(), ['a', 'b']);
  assert.equal(present(P, 3, 'B', { R }).shortFirst, true); assert.equal(present(P, 3, 'A', { R }).plan, 'line');
});
test('present: modes, chips and flags follow the table', () => {
  const R = makeR(seeded(3)), v = (l, x, c = 0) => present(P, l, x, { counted: c, R });
  assert.deepEqual(['1A', '1B', '2A', '2B', '3A', '3B'].map((k) => v(+k[0], k[1]).mode), ['walk', 'fill', 'tiles', 'tiles', 'tap', 'tap']);
  assert.deepEqual([v(1, 'A').chipsN, v(1, 'B').chipsN, v(2, 'A').chipsN, v(2, 'B').chipsN], [3, 4, 6, 8]);
  assert.deepEqual(['1A', '1B', '2A', '2B', '3A', '3B'].map((k) => v(+k[0], k[1]).whyLine), [true, true, true, false, true, false]);
  assert.deepEqual([v(1, 'A').autoHint, v(1, 'B').autoHint, v(2, 'A').autoHint], [true, true, false]);
  assert.deepEqual([v(1, 'A').ties, v(1, 'A').plan, v(2, 'B').plan, v(3, 'B').plan], [true, 'tris', 'tris', null]);
  const gap = v(1, 'B', 2).steps.find((s) => s.ask.includes('statement'));
  assert.equal(gap.fact, 'goal'); assert.equal(gap.options.length, 3);
  assert.equal(gap.options.filter((o) => classify(P, ['a', 'b', 'c', 'cong'], o).c === 'ok').length, 1);
  assert.equal(v(2, 'B').tiles.filter((t) => t.fact).length, 5);
  const T3 = { ...xsas(), type: 'prove-congruence', target: 'cong', canon: ['a', 'c', 'b', 'cong'] };
  const g3 = present(T3, 1, 'B', { counted: 2, R }).steps.find((s) => s.ask.includes('statement'));
  assert.equal(g3.fact, 'cong'); assert.deepEqual(g3.options.map((o) => classify(T3, ['a', 'b', 'c'], o).c).sort(), ['false', 'false', 'ok']);
  assert.equal(present(T3, 1, 'A', { R }).plan, null);
});
test('reasonChips: n chips, every accepted reason inside, "alternate" only on the X figure', () => {
  const R = makeR(seeded(2)); const c = reasonChips(P, 'c', 6, R);
  assert.equal(c.length, 6); assert.ok(c.includes('vertical')); assert.equal(new Set(c).size, 6);
  assert.ok(!reasonChips(over(), 'k', 8, R).includes('alternate'));
  const t = reasonChips(P, 'cong', 3, R); assert.deepEqual([...t].sort(), ['asa', 'sas', 'sss']);
  const W = xsas(); W.just.a = [{ reasons: ['midpoint', 'given'], needs: [] }]; W.roles.a = 'given-words';
  const w = reasonChips(W, 'a', 4, R); assert.ok(w.includes('midpoint') && w.includes('given'));
});
test('options for a statement gap: one right, the others wrong', () => {
  const R = makeR(seeded(9));
  for (let i = 0; i < 20; i++) {
    const o = optionsFor(P, 'cong', 3, R); assert.equal(o.length, 3);
    assert.deepEqual(o.map((x) => classify(P, ['a', 'b', 'c'], x).c).sort(), ['false', 'false', 'ok']);
  }
});
test('whyOf: the why-line of each role', () => {
  assert.equal(whyOf(P, 'a').key, 'why.given'); assert.deepEqual(whyOf(P, 'c'), { key: 'why.vertical', vars: { pt: 'O' } });
  assert.deepEqual(whyOf(P, 'cong', 'sas'), { key: 'why.sas', vars: { m1: 'A ↔ B', m2: 'O ↔ O', m3: 'C ↔ D' } });
  assert.deepEqual(whyOf(P, 'goal'), { key: 'why.concl-side', vars: { x: 'AC', y: 'BD' } });
  assert.equal(whyOf(P, 'e1').key, 'why.concl-angle');
});
