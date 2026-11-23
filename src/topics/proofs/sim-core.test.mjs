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

/* ── Task 8: similarity reasons, roles, reason checking, why-lines, chips (spec 2026-11-23 §6.1, §7.3, §7.8) ── */
import { checkReason, whyOf, reasonChips, roleOf, acceptedReasons, canonRows, required, isDone } from './core.js';
import { REASONS, GROUPS, groupsFor, groupOf, isLaw } from './reasons.js';
import { fill, LABELS } from './texts.js';
import { seeded, makeR } from '../new/core.js';

/* A whole hand-made similarity proof on the scalene pyramid: DE ∥ BC (given row), ∢A common, ∢ADE = ∢ABC
   (corresponding), △ADE ∼ △ABC (ז.ז), AD/AB = DE/BC, DE = 7. */
const proofP = (extra = {}) => ({
  ...pyramid([[1, 5], [-3, 0], [4, 0]]), id: 'fixture-sim-proof', shape: 'then',
  canon: ['par', 'a1', 'a2', 'sim', 'prop', 'val'],
  roles: { par: 'given', a1: 'common', a2: 'parallel', sim: 'similarity', prop: 'ratio', val: 'number' },
  ...extra,
});
/* A butterfly: AB ∥ CD, AD and BC cross at O. ∢AOB = ∢DOC (vertical), ∢OAB = ∢ODC (alternate), △AOB ∼ △DOC. */
const butterfly = () => ({
  id: 'fixture-butterfly', type: 'prove-sim', shape: 'prove', family: 'B',
  figure: {
    points: { A: [-2, 3], B: [3, 3], O: [0, 0], D: [1, -1.5], C: [-1.5, -1.5] },
    lines: [['A', 'O', 'D'], ['B', 'O', 'C'], ['A', 'B'], ['C', 'D']],
    segs: ['AO', 'OD', 'BO', 'OC', 'AB', 'CD'],
    angles: [A('O', ['A', 'B']), A('O', ['D', 'C']), A('A', ['O', 'B']), A('D', ['O', 'C']), A('B', ['O', 'A']), A('C', ['O', 'D'])],
    tris: [['A', 'O', 'B'], ['D', 'O', 'C']],
  },
  facts: {
    par: { kind: 'par', x: 'AB', y: 'CD' },
    v: G(A('O', ['A', 'B']), A('O', ['D', 'C'])),
    al: G(A('A', ['O', 'B']), A('D', ['O', 'C'])),
    sim: sim(['A', 'D'], ['O', 'O'], ['B', 'C']),
  },
  just: {
    par: [{ reasons: ['given'], needs: [] }],
    v: [{ reasons: ['vertical'], needs: [] }],
    al: [{ reasons: ['alternate'], needs: ['par'] }],
    sim: [{ reasons: ['aa'], needs: ['v', 'al'] }],
  },
  given: ['par'], target: 'sim', canon: ['par', 'v', 'al', 'sim'],
  roles: { par: 'given', v: 'vertical', al: 'parallel', sim: 'similarity' },
});
const OLD_GROUPS = [
  { id: 'written', he: 'כתוב בשאלה', reasons: ['given'] },
  { id: 'definition', he: 'הגדרה', reasons: ['bisector', 'median', 'midpoint', 'altitude'] },
  { id: 'seen', he: 'רואים בציור', reasons: ['common-side', 'common-angle', 'vertical'] },
  { id: 'theorem', he: 'משפט חפיפה', reasons: ['sas', 'asa', 'sss'] },
  { id: 'follows', he: 'נובע מהחפיפה', reasons: ['cp-sides', 'cp-angles'] },
];
const SIM_REASONS = ['aa', 'corresponding', 'alternate', 'common-angle', 'right-angles', 'sim-angles', 'sim-ratio', 'solve'];
const CONG_ONLY = ['sas', 'asa', 'sss', 'cp-sides', 'cp-angles', 'common-side', 'bisector', 'median', 'midpoint', 'altitude'];

test('fixtures: the hand-made proofs are honest and complete', () => {
  for (const p of [proofP(), butterfly()]) {
    for (const [id, f] of Object.entries(p.facts)) assert.ok(holds(p.figure, f), `${p.id} ${id}`);
    assert.ok(isDone(p, p.canon)); assert.deepEqual([...required(p)].sort(), [...p.canon].sort());
  }
});
test('reasons §7.3: the similarity reasons, chips, full sentences, kinds', () => {
  const DEF = 'משולשים דומים הם משולשים שבהם לכל זווית במשולש אחד יש זווית ששווה לה במשולש האחר, וקיים יחס שווה בין שלושת זוגות הצלעות המתאימות (צלעות מתאימות נמצאות מול זוויות שוות).';
  const want = {
    aa: ['ז.ז', 'אם לשני משולשים זוויות שוות, אז הם דומים.', 'theorem'],
    corresponding: ['מתאימות בין מקבילים', 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.', 'theorem'],
    alternate: ['מתחלפות בין מקבילים', 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.', 'theorem'],
    'right-angles': ['שתי זוויות ישרות', 'שתי זוויות ישרות שוות זו לזו.', 'rule'],
    'sim-angles': ['משולשים דומים: זוויות שוות', DEF, 'definition'],
    'sim-ratio': ['משולשים דומים: יחס הצלעות', DEF, 'definition'],
    solve: ['פתרון הפרופורציה', 'מציבים את האורכים הידועים בפרופורציה ופותרים.', 'rule'],
    'common-angle': ['זווית משותפת', 'זווית משותפת לשני המשולשים.', 'rule'],
  };
  for (const [id, [short, full, kind]] of Object.entries(want)) assert.deepEqual([REASONS[id].short, REASONS[id].full, REASONS[id].kind], [short, full, kind], id);
  assert.ok(!Object.values(REASONS).some((r) => r.short === 'זוויות מתאימות'), 'no bare "זוויות מתאימות" chip (clashes with the congruence one)');
  assert.ok(isLaw('aa') && isLaw('sim-ratio') && !isLaw('solve') && !isLaw('right-angles'));
  for (const id of SIM_REASONS) if (id !== 'common-angle') assert.ok(NEW_DRAFTS.includes(`reason.${id}`), id);
});
test('groupsFor: congruence = today\'s GROUPS exactly; similarity = its six groups', () => {
  assert.deepEqual(groupsFor('congruence'), OLD_GROUPS);
  assert.deepEqual(GROUPS, OLD_GROUPS);
  assert.deepEqual(groupsFor('nope'), OLD_GROUPS);
  const S = groupsFor('similarity');
  assert.deepEqual(S.map((g) => g.he), ['כתוב בשאלה', 'רואים בציור', 'ישרים מקבילים', 'משפט דמיון', 'נובע מהדמיון', 'חישוב']);
  assert.deepEqual(S.find((g) => g.id === 'parallel').reasons, ['corresponding', 'alternate']);
  assert.deepEqual(S.find((g) => g.id === 'theorem').reasons, ['aa']);
  assert.ok(S.find((g) => g.id === 'follows').reasons.includes('sim-ratio'));
  assert.deepEqual(S.find((g) => g.id === 'calc').reasons, ['solve']);
  const all = S.flatMap((g) => g.reasons);
  assert.equal(new Set(all).size, all.length);
  assert.ok(!all.some((r) => CONG_ONLY.includes(r)), 'no congruence-only reason in the similarity pick');
  assert.equal(groupOf('alternate'), null); assert.equal(groupOf('alternate', 'similarity'), 'parallel'); assert.equal(groupOf('aa', 'similarity'), 'theorem');
});
test('roles: from p.roles, and by fact kind / reason when a problem has none', () => {
  const p = proofP();
  assert.deepEqual(p.canon.map((f) => roleOf(p, f)), ['given', 'common', 'parallel', 'similarity', 'ratio', 'number']);
  const q = proofP({ roles: undefined });
  assert.deepEqual(q.canon.map((f) => roleOf(q, f)), ['given', 'common', 'parallel', 'similarity', 'ratio', 'number']);
  const b = { ...butterfly(), roles: undefined };
  assert.deepEqual(b.canon.map((f) => roleOf(b, f)), ['given', 'vertical', 'parallel', 'similarity']);
  const parts = { ...proofP({ roles: undefined }), shape: 'parts', just: { ...proofP().just, a2: [{ reasons: ['sim-angles'], needs: ['sim'] }] } };
  assert.equal(roleOf(parts, 'a2'), 'sim-partner');
  for (const r of ['similarity', 'ratio', 'number', 'parallel', 'sim-partner']) {
    assert.ok(LABELS.stmt(r).startsWith('טענה · ')); assert.ok(LABELS.reason(r).startsWith('נימוק · '));
    assert.ok(T[`hint.${r}.1`] && T[`hint.${r}.2`], r); assert.ok(NEW_DRAFTS.includes(`hint.${r}.1`) && NEW_DRAFTS.includes(`hint.${r}.2`), r);
  }
});
test('checkReason: a P-family angle row accepts corresponding; alternate is wrong-parallel-reason', () => {
  const p = proofP();
  assert.deepEqual(checkReason(p, ['par'], 'a2', 'corresponding'), { ok: true });
  let r = checkReason(p, ['par'], 'a2', 'alternate');
  assert.deepEqual([r.ok, r.kind, r.textKey], [false, 'wrong-parallel-reason', 'rs.par.notAlt']);
  const b = butterfly();
  assert.deepEqual(checkReason(b, ['par'], 'al', 'alternate'), { ok: true });
  r = checkReason(b, ['par'], 'al', 'corresponding');
  assert.deepEqual([r.ok, r.kind, r.textKey], [false, 'wrong-parallel-reason', 'rs.par.notCorr']);
  assert.deepEqual([checkReason(p, ['par'], 'a2', 'given').kind, checkReason(p, ['par'], 'a2', 'given').textKey], ['wrong-source', 'rs.par.given']);
  assert.deepEqual([checkReason(p, ['par'], 'a2', 'vertical').kind, checkReason(p, ['par'], 'a2', 'vertical').textKey], ['wrong-source', 'rs.par.seen']);
  assert.equal(checkReason(p, ['par'], 'a2', 'aa').kind, 'too-early');
  assert.equal(checkReason(p, ['par'], 'a2', 'sim-angles').kind, 'goal-as-known');
});
test('checkReason: the similarity row accepts ז.ז only after both angle rows; congruence theorems are the wrong theorem', () => {
  const p = proofP();
  assert.equal(checkReason(p, ['par', 'a1'], 'sim', 'aa').ok, false);
  assert.equal(checkReason(p, ['par', 'a1'], 'sim', 'aa').note, true);              // right reason, a row missing: neutral
  assert.deepEqual(checkReason(p, ['par', 'a1', 'a2'], 'sim', 'aa'), { ok: true });
  const d = ['par', 'a1', 'a2'];
  for (const th of ['sas', 'asa', 'sss']) assert.deepEqual([checkReason(p, d, 'sim', th).kind, checkReason(p, d, 'sim', th).textKey], ['wrong-theorem', 'rs.sim.cong']);
  assert.equal(checkReason(p, d, 'sim', 'given').textKey, 'rs.sim.given');
  assert.equal(checkReason(p, d, 'sim', 'sim-ratio').textKey, 'rs.sim.follows');
  assert.equal(checkReason(p, d, 'sim', 'corresponding').textKey, 'rs.sim.angle');
});
test('checkReason: the ratio row, the number row, a sim-partner, a common and a vertical angle in a similarity', () => {
  const p = proofP(), d = ['par', 'a1', 'a2', 'sim'];
  assert.deepEqual(checkReason(p, d, 'prop', 'sim-ratio'), { ok: true });
  let r = checkReason(p, d, 'prop', 'sim-angles');
  assert.deepEqual([r.kind, r.textKey, r.vars.these], ['wrong-source', 'rs.concl.otherCp', T['lbl.sidesWord']]);
  assert.equal(checkReason(p, d, 'prop', 'given').textKey, 'rs.ratio.given');
  assert.equal(checkReason(p, d, 'prop', 'aa').textKey, 'rs.sim.after');
  assert.equal(checkReason(p, d, 'prop', 'solve').textKey, 'rs.ratio.solve');
  assert.equal(checkReason(p, d, 'prop', 'cp-sides').textKey, 'rs.sim.cp');
  assert.deepEqual(checkReason(p, [...d, 'prop'], 'val', 'solve'), { ok: true });
  assert.deepEqual([checkReason(p, [...d, 'prop'], 'val', 'given').kind, checkReason(p, [...d, 'prop'], 'val', 'given').textKey], ['goal-as-known', 'rs.num.given']);
  assert.equal(checkReason(p, [...d, 'prop'], 'val', 'sim-ratio').textKey, 'rs.num.ratio');
  const parts = { ...proofP(), shape: 'parts', roles: { ...proofP().roles, a2: 'sim-partner' }, just: { ...proofP().just, a2: [{ reasons: ['sim-angles'], needs: ['sim'] }] } };
  assert.deepEqual(checkReason(parts, ['sim'], 'a2', 'sim-angles'), { ok: true });
  r = checkReason(parts, ['sim'], 'a2', 'sim-ratio');
  assert.deepEqual([r.textKey, r.vars.these], ['rs.concl.otherCp', T['lbl.anglesWord']]);
  assert.deepEqual([checkReason(parts, ['sim'], 'a2', 'given').kind, checkReason(parts, ['sim'], 'a2', 'given').textKey], ['goal-as-known', 'rs.simc.given']);
  assert.equal(checkReason(parts, ['sim'], 'a2', 'cp-angles').textKey, 'rs.sim.cp');
  assert.deepEqual(checkReason(p, ['par'], 'a1', 'common-angle'), { ok: true });
  assert.equal(checkReason(p, ['par'], 'a1', 'given').textKey, 'rs.seen.given');
  assert.equal(checkReason(p, ['par'], 'a1', 'aa').textKey, 'rs.fact.simTheorem');
  const b = butterfly();
  r = checkReason(b, ['par'], 'v', 'alternate');
  assert.deepEqual([r.kind, r.textKey], ['wrong-source', 'rs.vertical.parallelSim']);   // never "there is no parallel given" (there is one)
  // a given angle (family N: no parallel lines) taken for corresponding angles
  const n = proofP({ given: ['a2'], canon: ['a1', 'a2', 'sim', 'prop', 'val'], roles: { ...proofP().roles, a2: 'given' }, facts: { ...proofP().facts, par: undefined }, just: { ...proofP().just, par: undefined, a2: [{ reasons: ['given'], needs: [] }] } });
  delete n.facts.par; delete n.just.par;
  assert.equal(checkReason(n, [], 'a2', 'corresponding').textKey, 'rs.given.noPar');
});
test('every similarity miss text exists, is a draft and fills', () => {
  const p = proofP(), b = butterfly(), keys = new Set();
  for (const [q, done] of [[p, ['par', 'a1', 'a2', 'sim', 'prop']], [p, ['par']], [b, ['par', 'v', 'al']], [b, []]]) {
    for (const id of Object.keys(q.facts)) for (const r of Object.keys(REASONS)) {
      const x = checkReason(q, done, id, r);
      if (x.ok) continue;
      assert.ok(T[x.textKey], x.textKey); fill(x.textKey, x.vars); keys.add(x.textKey);
    }
  }
  for (const k of keys) if (/^rs\.(par|sim|ratio|num|simc)\.|^rs\.fact\.sim|parallelSim|noPar/.test(k)) assert.ok(NEW_DRAFTS.includes(k), k);
});
test('whyOf: the similarity row stands on ז.ז; every role gives a line that fills', () => {
  const p = proofP();
  const w = whyOf(p, 'sim', 'aa');
  assert.deepEqual([w.key, w.law], ['why.aa', 'aa']);
  assert.equal(fill(w.key, w.vars), 'שני זוגות של זוויות שוות. ההתאמה: A ↔ A, D ↔ B, E ↔ C');
  assert.deepEqual([whyOf(p, 'a2', 'corresponding').key, whyOf(p, 'a2', 'corresponding').law], ['why.corresponding', 'corresponding']);
  assert.deepEqual([whyOf(butterfly(), 'al', 'alternate').key, whyOf(butterfly(), 'al').law], ['why.alternate', 'alternate']);
  assert.deepEqual([whyOf(p, 'a1').key, whyOf(p, 'a1').law], ['why.commonAngle', undefined]);
  assert.deepEqual([whyOf(p, 'prop').key, whyOf(p, 'prop').law], ['why.ratio', 'sim-ratio']);
  assert.equal(fill(whyOf(p, 'val').key, whyOf(p, 'val').vars), 'מציבים בפרופורציה את האורכים הידועים, ומקבלים DE = 7.');
  const parts = { ...proofP(), shape: 'parts', roles: { ...proofP().roles, a2: 'sim-partner' }, just: { ...proofP().just, a2: [{ reasons: ['sim-angles'], needs: ['sim'] }] } };
  assert.deepEqual([whyOf(parts, 'a2').key, whyOf(parts, 'a2').law, whyOf(parts, 'a2').vars], ['why.sim-partner', 'sim-angles', { p: 'D', q: 'B' }]);
  for (const q of [p, butterfly(), parts]) for (const id of q.canon) {
    const x = whyOf(q, id, acceptedReasons(q, id)[0]);
    assert.ok(T[x.key], x.key); fill(x.key, x.vars);
    if (x.law) assert.ok(REASONS[x.law].full && isLaw(x.law), x.law);
    if (x.key !== 'why.given') assert.ok(NEW_DRAFTS.includes(x.key), x.key);
  }
});
test('reasonChips on a similarity: accepted reasons in, never a congruence reason (never צ.ז.צ)', () => {
  for (const q of [proofP(), butterfly(), proofP({ roles: undefined })]) for (const id of q.canon) for (const n of [3, 4, 6, 8]) for (let s = 1; s <= 30; s++) {
    const c = reasonChips(q, id, n, makeR(seeded(s)));
    assert.ok(c.length >= Math.min(n, 3), `${id} ${n}`); assert.equal(new Set(c).size, c.length);
    for (const r of acceptedReasons(q, id)) assert.ok(c.includes(r), `${id} ${r}`);
    assert.ok(!c.some((r) => CONG_ONLY.includes(r)), `${q.id} ${id}: ${c}`);
    assert.ok(c.every((r) => REASONS[r]));
  }
  const c = reasonChips(proofP(), 'a2', 4, makeR(seeded(1)));
  assert.ok(c.includes('corresponding') && c.includes('alternate'), 'the other parallel reason is the most tempting wrong chip');
  const s = reasonChips(proofP(), 'sim', 3, makeR(seeded(1)));
  assert.ok(s.includes('aa'));
});
test('reasonChips on a congruence never offers a similarity-only reason; alternate stays an X-only wrong chip', () => {
  const X = xsas();
  for (const id of X.canon) for (let s = 1; s <= 30; s++) {
    const c = reasonChips(X, id, 8, makeR(seeded(s)));
    assert.ok(!c.some((r) => ['aa', 'corresponding', 'right-angles', 'sim-angles', 'sim-ratio', 'solve'].includes(r)), `${id}: ${c}`);
  }
  assert.deepEqual([checkReason(X, [], 'c', 'alternate').kind, checkReason(X, [], 'c', 'alternate').textKey], ['wrong-source', 'rs.vertical.alternate']);
});

/* Controller rulings carried from the Task 7 review: a TRUE proportion is never a wrong try. */
test('classify: a proportion that is true in the drawing but not from the similarity is neutral', () => {
  const p = proofP(), d = ['par', 'a1', 'a2', 'sim'];
  let r = classify(p, d, prop('AD/DB', 'AE/EC'));                 // the intercept form: true, not from the matching sides
  assert.deepEqual([r.c, r.textKey], ['unprovable', 'st.unprovable']);
  r = classify(ISO, ['a1', 'a2', 'sim'], prop('AD/AC', 'AE/AB'));   // true in the isosceles drawing, not matching sides
  assert.equal(r.c, 'unprovable');
  r = classify(p, d, prop('AD/AB', 'AE/AC'));                      // right, but no help for DE: a note, not a try
  assert.deepEqual([r.c, r.textKey], ['note', 'st.propNeed']);
  r = classify(p, d, prop('AD/AB', 'AD/AB'));
  assert.deepEqual([r.c, r.textKey], ['note', 'st.propSame']);
  r = classify(p, d, prop('AD/AB', 'BC/DE'));
  assert.deepEqual([r.c, r.kind], ['false', 'ratio-flip']);
  r = classify(p, d, prop('AD/AB', 'AE/BC'));
  assert.deepEqual([r.c, r.kind], ['false', 'non-matching-sides']);
});
test('classify: a parallel-angle row written before the parallel given is a neutral note (true and known: only the order is missing)', () => {
  const r = classify(proofP(), ['a1'], proofP().facts.a2);
  assert.deepEqual([r.c, r.kind, r.textKey], ['note', undefined, 'st.needFirst']);
  assert.ok(T['st.needFirst'] && NEW_DRAFTS.includes('st.needFirst'));
  assert.ok(!T['st.needFirst'].startsWith('נכון, אבל מוקדם מדי'));
});
test('session: that statement uses no try, makes no decision and records no error kind', async () => {
  const { start, act } = await import('./session.js');
  const p = proofP(), V = { mode: 'tiles', pre: [], known: [], steps: p.canon.map((fact) => ({ fact, ask: ['statement', 'reason'] })), tiles: [], chipsN: 8, whyLine: false, autoHint: false, shortFirst: false, plan: null, ties: false, letters: false };
  const o = act(start(p, V), { t: 'statement', st: p.facts.a2 });
  assert.deepEqual([o.fx[0].cls, o.fx[0].key], ['note', 'st.needFirst']);
  assert.deepEqual([o.s.cur.tries, o.s.decisions.length, o.s.nonSolo, o.s.errs], [0, 0, 0, {}]);
});
test('checkReason: a right reason before the rows it leans on is a neutral note, never a wrong try', async () => {
  const p = proofP();
  assert.deepEqual(checkReason(p, [], 'a2', 'corresponding'), { ok: false, note: true, textKey: 'st.needFirst', vars: {} });
  assert.deepEqual(checkReason(p, ['par', 'a1'], 'sim', 'aa'), { ok: false, note: true, textKey: 'st.simEarly', vars: { n: 1 } });
  assert.deepEqual(checkReason(p, ['par', 'a1', 'a2'], 'prop', 'sim-ratio'), { ok: false, note: true, textKey: 'rs.fact.sim', vars: {} });
  assert.deepEqual(checkReason(p, ['par', 'a1', 'a2', 'sim'], 'val', 'solve'), { ok: false, note: true, textKey: 'st.needRow', vars: {} });
  assert.ok(T['st.needRow'] && NEW_DRAFTS.includes('st.needRow'));
  // in the session: a reason-only view that skips the parallel row, so the angle row's reason opens before it
  const { start, act } = await import('./session.js');
  const V = { mode: 'fill', pre: [], known: [], steps: [{ fact: 'a2', ask: ['reason'] }, { fact: 'par', ask: ['reason'] }], tiles: [], chipsN: 4, whyLine: false, autoHint: false, shortFirst: false, plan: null, ties: false, letters: false };
  const s = start(p, V);
  assert.deepEqual([s.cur.kind, s.cur.fact], ['reason', 'a2']);
  const o = act(s, { t: 'reason', id: 'corresponding' });
  assert.deepEqual([o.fx[0].cls, o.fx[0].key, o.s.cur.tries, o.s.errs, o.s.decisions.length], ['note', 'st.needFirst', 0, {}, 0]);
});
test('reasonChips: right-angles can appear as a tempting chip when the problem has a right angle', () => {
  const p = proofP(); p.facts = { ...p.facts, rt: { kind: 'ang', x: A('A', ['D', 'E']), y: A('A', ['D', 'E']), right: true } };
  assert.ok(reasonChips(p, 'a1', 8, makeR(seeded(1))).includes('right-angles'));
  assert.ok(!reasonChips(proofP(), 'a1', 8, makeR(seeded(1))).includes('right-angles'));
});
test('optionsFor: no wrong proportion option is true in the drawing', () => {
  for (const q of [proofP(), ISO, SC]) for (let s = 1; s <= 40; s++) {
    const o = optionsFor(q, 'prop', 3, makeR(seeded(s)));
    assert.equal(o.filter((st) => holds(q.figure, st)).length, 1, `${q.id} ${s}`);
  }
});
test('holds and checkProp never throw on a missing point or a malformed fraction', () => {
  const p = proofP(), Fg = p.figure;
  assert.equal(holds(Fg, { kind: 'par', x: 'DE', y: 'BZ' }), false);
  assert.equal(holds(Fg, { kind: 'par', x: 'DD', y: 'BC' }), false);           // a zero direction is never parallel
  assert.equal(holds(Fg, sim(['A', 'A'], ['D', 'Z'], ['E', 'C'])), false);
  assert.equal(holds(Fg, sim(['A', 'A'], ['D', 'B'])), false);
  assert.equal(holds(Fg, prop('AD/AZ', 'DE/BC')), false);
  assert.equal(holds(Fg, { kind: 'prop', pairs: [['AD'], ['DE', 'BC']] }), false);
  assert.equal(holds(Fg, { kind: 'prop', pairs: null }), false);
  assert.equal(holds(Fg, { kind: 'val', x: 'ZZ', v: 3 }), false);
  for (const bad of [{ kind: 'prop', pairs: [['AD'], ['DE', 'BC']] }, { kind: 'prop', pairs: null }, { kind: 'prop', pairs: [[null, 'AB'], ['DE', 'BC']] }, { kind: 'prop' }]) {
    const r = checkProp(p, bad);
    assert.deepEqual([r.ok, r.kind], [false, 'non-matching-sides']);
    assert.doesNotThrow(() => classify(p, ['par', 'a1', 'a2', 'sim'], bad));
  }
});
test('texts: the similarity statement keys carried from Task 7 are drafts too', () => {
  for (const k of ['st.propSame', 'st.propNeed', 'st.falseVal']) { assert.ok(T[k], k); assert.ok(NEW_DRAFTS.includes(k), k); }
});
