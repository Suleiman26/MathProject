/* node --test src/topics/proofs/sim-core.test.mjs
   Similarity statements in the checker core (spec 2026-11-23 §7.2): par, sim, prop, val; the proportion
   checked by rule from the similarity's vertex map; anchorOf (the problem's cong or sim fact). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { norm, holds, show, say, partsOf, checkProp, anchorOf, congOf, classify, checkMatching, optionsFor, present, findFact } from './core.js';
import { tx, T, NEW_DRAFTS } from './texts.js';
import { xsas } from './fixtures.mjs';

const G = (x, y) => ({ kind: 'ang', x, y });
const A = (v, r) => ({ v, r });
const sim = (...map) => ({ kind: 'sim', map });
const prop = (...fr) => ({ kind: 'prop', pairs: fr.map((f) => f.split('/')) });
const third = (P, Q) => [P[0] + (Q[0] - P[0]) / 3, P[1] + (Q[1] - P[1]) / 3];

/* "In △ABC, D on AB and E on AC with DE ∥ BC." `pts` = A, B, C; D and E at a third of AB, AC. */
function pyramid(pts, extra = {}) {
  const [a, b, c] = pts, de = Math.hypot(c[0] - b[0], c[1] - b[1]) / 3;
  return {
    id: 'fixture-pyramid', type: 'sim-calc', family: 'P',
    figure: {
      points: { A: a, B: b, C: c, D: third(a, b), E: third(a, c) }, scale: 3,
      lines: [['A', 'D', 'B'], ['A', 'E', 'C'], ['D', 'E'], ['B', 'C']],
      segs: ['AD', 'DB', 'AB', 'AE', 'EC', 'AC', 'DE', 'BC'],
      angles: [A('A', ['D', 'E']), A('D', ['A', 'E']), A('E', ['A', 'D']), A('B', ['A', 'C']), A('C', ['A', 'B'])],
      tris: [['A', 'D', 'E'], ['A', 'B', 'C']],
    },
    facts: {
      par: { kind: 'par', x: 'DE', y: 'BC' },
      a1: G(A('A', ['D', 'E']), A('A', ['B', 'C'])),
      a2: G(A('D', ['A', 'E']), A('B', ['A', 'C'])),
      sim: sim(['A', 'A'], ['D', 'B'], ['E', 'C']),
      prop: { ...prop('AD/AB', 'DE/BC'), need: { asked: 'DE', known: ['AD', 'AB', 'BC'] } },
      val: { kind: 'val', x: 'DE', v: Math.round(de * 3 * 1e9) / 1e9 },
    },
    just: {
      par: [{ reasons: ['given'], needs: [] }],
      a1: [{ reasons: ['common-angle'], needs: [] }],
      a2: [{ reasons: ['corresponding'], needs: ['par'] }],
      sim: [{ reasons: ['aa'], needs: ['a1', 'a2'] }],
      prop: [{ reasons: ['sim-ratio'], needs: ['sim'] }],
      val: [{ reasons: ['solve'], needs: ['prop'] }],
    },
    given: ['par'], target: 'val', canon: ['a1', 'a2', 'sim', 'prop', 'val'],
    ...extra,
  };
}
const ISO = pyramid([[0, 4], [-3, 0], [3, 0]]);          // the brief's figure (AB = AC; used for words and rules only)
const SC = pyramid([[1, 5], [-3, 0], [4, 0]]);           // scalene: only one matching is true
const F = ISO.figure;

test('norm: a similarity is its vertex pairs (any order, either triangle first); a different matching differs', () => {
  assert.equal(norm(F, sim(['A', 'A'], ['D', 'B'], ['E', 'C'])), norm(F, sim(['A', 'A'], ['B', 'D'], ['C', 'E'])));
  assert.equal(norm(F, sim(['E', 'C'], ['A', 'A'], ['D', 'B'])), norm(F, sim(['A', 'A'], ['D', 'B'], ['E', 'C'])));
  assert.notEqual(norm(F, sim(['A', 'A'], ['D', 'B'], ['E', 'C'])), norm(F, sim(['A', 'A'], ['D', 'C'], ['E', 'B'])));
  assert.notEqual(norm(F, sim(['A', 'A'], ['D', 'B'], ['E', 'C'])), norm(F, { kind: 'cong', map: [['A', 'A'], ['D', 'B'], ['E', 'C']] }));
});
test('norm: a proportion is direction-free as a whole, a mixed direction is another statement', () => {
  const k = norm(F, prop('AD/AB', 'DE/BC'));
  assert.equal(norm(F, prop('AB/AD', 'BC/DE')), k);
  assert.equal(norm(F, prop('DE/BC', 'AD/AB')), k);
  assert.equal(norm(F, prop('DA/BA', 'ED/CB')), k);
  assert.notEqual(norm(F, prop('AD/AB', 'BC/DE')), k);
  assert.notEqual(norm(F, prop('AD/AB', 'AE/AC', 'DE/BC')), k);
  assert.ok(k.startsWith('R:'));
});
test('norm: parallel lines and a length', () => {
  assert.equal(norm(F, { kind: 'par', x: 'DE', y: 'BC' }), norm(F, { kind: 'par', x: 'CB', y: 'ED' }));
  assert.ok(norm(F, { kind: 'par', x: 'DE', y: 'BC' }).startsWith('P:'));
  assert.equal(norm(F, { kind: 'val', x: 'DE', v: 6 }), norm(F, { kind: 'val', x: 'ED', v: 6 }));
  assert.notEqual(norm(F, { kind: 'val', x: 'DE', v: 6 }), norm(F, { kind: 'val', x: 'DE', v: 6.5 }));
  assert.ok(norm(F, { kind: 'val', x: 'DE', v: 6 }).startsWith('V:'));
});
test('holds: parallel, similar, proportion, length (the scale gives the length)', () => {
  const S = SC.figure;
  assert.equal(holds(S, { kind: 'par', x: 'DE', y: 'BC' }), true);
  assert.equal(holds(S, { kind: 'par', x: 'DB', y: 'EC' }), false);
  assert.equal(holds(S, sim(['A', 'A'], ['D', 'B'], ['E', 'C'])), true);
  assert.equal(holds(S, sim(['A', 'A'], ['D', 'C'], ['E', 'B'])), false);
  assert.equal(holds(S, prop('AD/AB', 'AE/AC', 'DE/BC')), true);
  assert.equal(holds(S, prop('AB/AD', 'BC/DE')), true);
  assert.equal(holds(S, prop('AD/AB', 'BC/DE')), false);
  assert.equal(holds(F, { kind: 'val', x: 'DE', v: 6 }), true);     // DE = 2 drawing units × 3
  assert.equal(holds(F, { kind: 'val', x: 'AB', v: 15 }), true);
  assert.equal(holds(F, { kind: 'val', x: 'DE', v: 6.5 }), false);
  const noScale = { ...F, scale: undefined };
  assert.equal(holds(noScale, { kind: 'val', x: 'DE', v: 6 }), false);   // no scale: never true, never a throw
});
test('show: exact maths lines', () => {
  assert.equal(show({ kind: 'par', x: 'DE', y: 'BC' }), 'DE ∥ BC');
  assert.equal(show(sim(['A', 'A'], ['D', 'B'], ['E', 'C'])), '△ADE ∼ △ABC');
  assert.equal(show(prop('AD/AB', 'DE/BC')), 'AD/AB = DE/BC');
  assert.equal(show(prop('AD/AB', 'AE/AC', 'DE/BC')), 'AD/AB = AE/AC = DE/BC');
  assert.equal(show({ kind: 'val', x: 'DE', v: 6 }), 'DE = 6');
  assert.equal(show({ kind: 'val', x: 'DE', v: 7.5 }), 'DE = 7.5');
});
test('say: one sentence each; the proportion is one left-to-right island', () => {
  assert.equal(say({ kind: 'par', x: 'DE', y: 'BC' }), 'הישר DE מקביל לישר BC');
  assert.equal(say(sim(['A', 'A'], ['D', 'B'], ['E', 'C'])), 'המשולש ADE דומה למשולש ABC');
  assert.equal(say({ kind: 'val', x: 'DE', v: 6 }), 'אורך הקטע DE הוא 6');
  const parts = tx('say.prop', { x: show(prop('AD/AB', 'DE/BC')) });
  assert.deepEqual(parts.filter((q) => q.t === 'm').map((q) => q.v), ['AD/AB = DE/BC']);
  assert.ok(say(prop('AD/AB', 'DE/BC')).includes('AD/AB = DE/BC'));
});
test('parts: a similarity is its two triangles, a proportion its sides, a length its side', () => {
  assert.deepEqual(partsOf(sim(['A', 'A'], ['D', 'B'], ['E', 'C'])), [['A', 'D', 'E'], ['A', 'B', 'C']]);
  assert.deepEqual(partsOf(prop('AD/AB', 'DE/BC')), ['AD', 'AB', 'DE', 'BC']);
  assert.deepEqual(partsOf({ kind: 'val', x: 'DE', v: 6 }), ['DE']);
  assert.deepEqual(partsOf({ kind: 'par', x: 'DE', y: 'BC' }), ['DE', 'BC']);
});

test('checkProp: by rule from the similarity (matching sides, one direction, at least two fractions)', () => {
  assert.deepEqual(checkProp(ISO, prop('AD/AB', 'DE/BC')), { ok: true });
  assert.deepEqual(checkProp(ISO, prop('AB/AD', 'BC/DE')), { ok: true });
  assert.deepEqual(checkProp(ISO, prop('AD/AB', 'AE/AC', 'DE/BC')), { ok: true });
  assert.deepEqual(checkProp(ISO, prop('AE/AC', 'DE/BC')), { ok: true });   // not the stored fact, still right
  let r = checkProp(ISO, prop('AD/AB', 'BC/DE'));
  assert.deepEqual([r.ok, r.kind, r.textKey], [false, 'ratio-flip', 'st.ratioFlip']);
  r = checkProp(ISO, prop('AD/AB', 'AE/BC'));
  assert.deepEqual([r.ok, r.kind, r.textKey], [false, 'non-matching-sides', 'st.nonMatchingSides']);
  r = checkProp(ISO, prop('AD/AC', 'AE/AB'));            // true in the isosceles drawing, but not matching sides
  assert.deepEqual([r.ok, r.kind], [false, 'non-matching-sides']);
  assert.deepEqual(checkProp(ISO, prop('AD/DE', 'AB/BC')), { note: 'st.propInside' });
  assert.deepEqual(checkProp(ISO, prop('DE/AD', 'BC/AB')), { note: 'st.propInside' });
  r = checkProp(ISO, prop('AD/DE', 'BC/AB'));            // inside, but the two fractions point opposite ways
  assert.equal(r.ok, false);
  r = checkProp(ISO, prop('AD/AB', 'AD/AB'));            // one fraction twice is not two
  assert.equal(r.ok, false);
});
test('checkProp with a calculation: one fraction holds the asked side, another is fully known', () => {
  const need = { asked: 'DE', known: ['AD', 'AB', 'AE', 'AC'] };
  assert.equal(checkProp(ISO, prop('AD/AB', 'AE/AC'), { need }).ok, false);
  assert.equal(checkProp(ISO, prop('AD/AB', 'DE/BC'), { need }).kind, 'prop-need');   // BC is not known: two unknowns
  assert.deepEqual(checkProp(ISO, prop('AD/AB', 'DE/BC'), { need: { asked: 'DE', known: ['AD', 'AB', 'BC'] } }), { ok: true });
  assert.deepEqual(checkProp(ISO, prop('AB/AD', 'CB/ED'), { need: { asked: 'ED', known: ['DA', 'BA', 'BC'] } }), { ok: true });
  assert.deepEqual(checkProp(ISO, prop('AD/AB', 'AE/AC', 'DE/BC'), { need: { asked: 'DE', known: ['AD', 'AB', 'BC'] } }), { ok: true });
  const r = checkProp(ISO, prop('AD/AB', 'BC/DE'), { need: { asked: 'DE', known: ['AD', 'AB', 'BC'] } });
  assert.equal(r.kind, 'ratio-flip');                    // the rule is checked before the need
});
test('checkProp: no similarity in the problem → a miss, never a throw', () => {
  const r = checkProp(xsas(), prop('AO/OB', 'CO/OD'));
  assert.deepEqual([r.ok, r.kind, r.textKey], [false, 'non-matching-sides', 'st.propNoSim']);
});

test('anchorOf: the congruence of a congruence problem (same as congOf), the similarity of a similarity problem', () => {
  const X = xsas();
  assert.equal(anchorOf(X), congOf(X)); assert.equal(anchorOf(X), 'cong');
  assert.equal(anchorOf(ISO), 'sim'); assert.equal(congOf(ISO), null);
});

test('classify: a similarity — the stored one, an early one, a wrong matching explained by a known angle', () => {
  assert.equal(classify(SC, ['a1', 'a2'], sim(['B', 'D'], ['A', 'A'], ['C', 'E'])).c, 'ok');
  let r = classify(SC, ['a1'], SC.facts.sim);
  assert.deepEqual([r.c, r.kind, r.textKey, r.vars.n], ['early', 'too-early', 'st.simEarly', 1]);
  r = classify(SC, ['a1', 'a2'], sim(['A', 'A'], ['D', 'C'], ['E', 'B']));
  assert.deepEqual([r.c, r.kind, r.textKey, r.vars.p, r.vars.q], ['false', 'wrong-matching', 'st.matchingAng', 'D', 'B']);
  r = checkMatching(SC, ['A', 'D', 'E'], ['A', 'C', 'B'], ['a2']);
  assert.deepEqual([r.ok, r.kind, r.textKey, r.vars.p, r.vars.q], [false, 'wrong-matching', 'st.matchingAng', 'D', 'B']);
  r = checkMatching(SC, ['A', 'D', 'E'], ['B', 'A', 'C'], []);
  assert.deepEqual([r.textKey, r.vars.p], ['st.matchingShared', 'A']);
  r = checkMatching(SC, ['A', 'D', 'E'], ['A', 'C', 'B'], []);
  assert.equal(r.textKey, 'st.matchingPlain');           // sides are not equal in a similarity: no side argument
  assert.deepEqual(checkMatching(SC, ['A', 'D', 'E'], ['A', 'B', 'C']), { ok: true });
});
test('classify: a similarity that is true in the drawing is the problem\'s similarity (holds first)', () => {
  assert.equal(findFact(SC, sim(['D', 'B'], ['A', 'A'], ['E', 'C'])), 'sim');
  const r = classify(ISO, ['a1', 'a2'], sim(['A', 'A'], ['D', 'C'], ['E', 'B']));     // the isosceles mirror is true
  assert.deepEqual([r.c, r.fact], ['ok', 'sim']);
});
test('classify: a proportion goes through the rule and lands on the problem\'s proportion row', () => {
  let r = classify(SC, ['a1', 'a2', 'sim'], prop('AB/AD', 'BC/DE'));
  assert.deepEqual([r.c, r.fact], ['ok', 'prop']);
  r = classify(SC, ['a1', 'a2', 'sim'], prop('AD/AB', 'BC/DE'));
  assert.deepEqual([r.c, r.kind, r.textKey], ['false', 'ratio-flip', 'st.ratioFlip']);
  r = classify(SC, ['a1', 'a2', 'sim'], prop('AD/AB', 'AE/AC'));       // right, but no help for DE
  assert.equal(r.c === 'ok', false);
  r = classify(SC, ['a1', 'a2', 'sim'], prop('AD/DE', 'AB/BC'));
  assert.deepEqual([r.c, r.textKey], ['note', 'st.propInside']);
  r = classify(SC, ['a1', 'a2'], prop('AD/AB', 'DE/BC'));
  assert.deepEqual([r.c, r.kind, r.textKey], ['early', 'looks-equal', 'st.consEarlySim']);
  r = classify(SC, ['a1', 'a2', 'sim', 'prop'], prop('AB/AD', 'BC/DE'));
  assert.equal(r.c, 'written');
});
test('classify: lengths and parallels never throw', () => {
  assert.equal(SC.facts.val.v, 7);
  assert.deepEqual([classify(SC, ['a1', 'a2', 'sim', 'prop'], { kind: 'val', x: 'ED', v: 7 }).c, classify(SC, ['a1', 'a2', 'sim', 'prop'], { kind: 'val', x: 'ED', v: 7 }).fact], ['ok', 'val']);
  const r = classify(SC, [], { kind: 'par', x: 'AD', y: 'EC' });
  assert.deepEqual([r.c, r.kind, r.textKey], ['false', 'false-statement', 'st.falsePar']);
  assert.equal(classify(SC, [], { kind: 'val', x: 'DE', v: 99 }).c, 'false');
});
test('optionsFor: a similarity gap offers only false matchings; a proportion gap a flip and non-matching sides', () => {
  const o = optionsFor(SC, 'sim', 3);
  assert.equal(o.length, 3); assert.equal(o.filter((st) => holds(SC.figure, st)).length, 1);
  const q = optionsFor(SC, 'prop', 3);
  assert.equal(q.length, 3);
  assert.equal(q.filter((st) => checkProp(SC, st).ok).length, 1);
  assert.ok(q.some((st) => checkProp(SC, st).kind === 'ratio-flip'));
});
test('present: a similarity problem lays out without throwing', () => {
  for (const level of [1, 2, 3]) for (const v of ['A', 'B']) assert.ok(present(SC, level, v).steps.length >= 1);
});
test('texts: the new keys exist, are drafts, never glue an island', () => {
  for (const k of ['st.ratioFlip', 'st.nonMatchingSides', 'st.propInside', 'st.propNoSim', 'st.simEarly', 'st.consEarlySim', 'st.falsePar', 'say.par', 'say.sim', 'say.prop', 'say.val']) {
    assert.ok(T[k], k); assert.ok(NEW_DRAFTS.includes(k), k);
  }
  assert.equal(T['st.propInside'], 'נכון. בהוכחה כותבים את היחס בין הצלעות המתאימות.');
});
