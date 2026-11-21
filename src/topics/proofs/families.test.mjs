/* node --test src/topics/proofs/families.test.mjs        (RUNS=300 for a quick pass)
   Figure families (spec §6.4) and "the drawing must not lie" (§6.6 tests 1–5): thousands of seeded
   drawings per variant, each honest, each with a canonical proof the checker accepts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { lies, pickNames } from './families/kit.js';
import { classify, checkReason, isDone, canonRows, holds } from './core.js';
import X from './families/x.js'; import K from './families/k.js';

const RUNS = Number(process.env.RUNS || 3000);
const FAMILIES = [X, K];
test('inventory: X has 2 theorems, K has all 3', () => {
  assert.deepEqual(Object.keys(X.variants), ['X-SAS', 'X-ASA']); assert.deepEqual(Object.keys(K.variants), ['K-SSS', 'K-SAS', 'K-ASA']);
});
test('names: no look-alikes, O only as the crossing point', () => {
  const R = makeR(seeded(3));
  for (let i = 0; i < 500; i++) { const n = pickNames(R, 4); assert.ok(!n.includes('I') && !n.includes('O')); assert.equal(new Set(n).size, 4); }
  assert.ok(pickNames(R, 5, { crossing: true }).includes('O'));
  for (let i = 0; i < 200; i++) assert.equal(new Set(pickNames(R, 6)).size, 6);
});
for (const fam of FAMILIES) for (const v of Object.keys(fam.variants)) for (const words of [false, true]) {
  test(`${v}${words ? ' (words)' : ''}: ${RUNS} honest drawings, canon proof passes`, () => {
    const R = makeR(seeded(12345)); const seen = new Set();
    for (let i = 0; i < RUNS; i++) {
      const b = fam.build(R, v, { words });
      assert.deepEqual(lies(b), [], JSON.stringify(b.figure.points));
      assert.equal(b.theorem, fam.variants[v].theorem); assert.equal(b.consequences.length, 3);
      const p = { ...b, target: 'cong', type: 'prove-congruence', traps: {} }, done = [];
      for (const row of canonRows(p)) { assert.equal(classify(p, done, row.st).c, 'ok'); assert.equal(checkReason(p, done, row.fact, row.reason).ok, true); done.push(row.fact); }
      assert.equal(isDone(p, done), true);
      for (const c of b.consequences) assert.equal(holds(b.figure, b.facts[c]), true);
      seen.add(Object.keys(b.figure.points).join('') + JSON.stringify(Object.values(b.figure.points).map((q) => q.map(Math.round))));
    }
    assert.ok(seen.size >= 12, `only ${seen.size} different drawings`);
  });
}
test('word-givens: the definition and "given" are both accepted', () => {
  const R = makeR(seeded(4)); let met = 0;
  for (let i = 0; i < 40; i++) {
    const b = X.build(R, 'X-SAS', { words: true }), w = b.givenText.find((g) => g.form === 'words');
    assert.ok(w, 'X-SAS with words has a sentence'); met++;
    for (const f of w.facts) { assert.equal(b.roles[f], 'given-words'); assert.deepEqual(b.just[f][0].reasons, ['midpoint', 'given']); }
  }
  assert.ok(met > 0);
  const k = K.build(R, 'K-SAS', { words: ['bisector'] }); assert.equal(k.givenText.find((g) => g.form === 'words').word, 'bisector');
  const n = K.build(R, 'K-SAS', { words: ['median'] }); assert.ok(n.givenText.every((g) => g.form === 'eq'));
});
test('lies() catches a drawing that lies', () => {
  const bad = structuredClone(X.build(makeR(seeded(1)), 'X-SAS', {}));
  const name = Object.keys(bad.figure.points).find((n) => n !== 'O'); const q = bad.figure.points[name];
  bad.figure.points[name] = [q[0] * 1.3 + 1, q[1]];                       // one end moved: a given equality is no longer true
  assert.ok(lies(bad).length > 0);
});
