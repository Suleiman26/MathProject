/* node --test src/topics/proofs/warmup.test.mjs
   The warm-up (spec §7.1): the flow rule, and for every kind thousands of seeded tasks with exactly
   one right answer on an honest drawing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { makeTask, checkTask, flow, next, answer, passed, KINDS } from './warmup-core.js';
import { layout, labelErrors } from './figure-core.js';
import { holds, norm, isoLater, angKey, measure, segKey } from './core.js';
import { parallelKind } from './families/sim-kit.js';
import { TYPES, typeById } from './types/index.js';
import { T, tx } from './texts.js';

const RUNS = Number(process.env.RUNS || 3000);

test('flow: 4 right in a row ends the warm-up', () => { let s = flow(['W1', 'W2', 'W3', 'W4']); for (let i = 0; i < 4; i++) s = answer(s, next(s), true); assert.equal(next(s), null); assert.equal(passed(s), true); });
test('flow: a miss adds two tasks of that kind; hard cap 8', () => {
  let s = flow(['W1', 'W2', 'W3', 'W4']); const seen = [];
  for (let i = 0; i < 4; i++) { const k = next(s); seen.push(k); s = answer(s, k, k !== 'W4'); }
  assert.deepEqual(seen, ['W1', 'W2', 'W3', 'W4']);
  assert.deepEqual([next(s)], ['W4']); s = answer(s, 'W4', true); assert.equal(next(s), 'W4'); s = answer(s, 'W4', true); assert.equal(next(s), null);   // 2 of the last 3
  assert.equal(passed(s), true);
  let t = flow(['W5']); let n = 0; while (next(t)) { t = answer(t, next(t), false); n++; } assert.equal(n, 8); assert.equal(passed(t), false);
});
test('flow: each kind at least once; two kinds alternate; two missed kinds take turns', () => {
  assert.deepEqual(flow(['W1', 'W7']).first, ['W1', 'W7', 'W1', 'W7']);
  assert.deepEqual(flow(['W5']).first, ['W5', 'W5', 'W5', 'W5']);
  let s = flow(['W2', 'W4', 'W5', 'W6']);
  for (let i = 0; i < 4; i++) { const k = next(s); s = answer(s, k, k === 'W2' || k === 'W5'); }
  const order = []; while (next(s)) { order.push(next(s)); s = answer(s, next(s), true); }
  assert.deepEqual(order, ['W4', 'W6', 'W4', 'W6']); assert.equal(s.n, 8);
  // every level has a warm-up (2 to 4 kinds); the similarity levels' lists are the spec's (2026-11-23 §7.7)
  for (const t of TYPES) { assert.ok(t.warm.length >= 1 && t.warm.length <= 4, t.id); for (const k of t.warm) assert.ok(KINDS.includes(k)); }
  assert.deepEqual(Object.fromEntries(['sim-parts', 'sim-side', 'prove-sim', 'sim-calc'].map((id) => [id, typeById(id).warm])), {
    'sim-parts': ['S5', 'S2', 'S3', 'W2'], 'sim-side': ['S2', 'S3', 'S4'], 'prove-sim': ['S1', 'S2', 'W2'], 'sim-calc': ['S1', 'S3', 'S4', 'W2'],
  });
});
for (const kind of KINDS) test(`${kind}: ${RUNS} tasks, one right answer, the drawing is honest`, () => {
  const R = makeR(seeded(77)); const seen = new Set();
  for (let i = 0; i < RUNS; i++) {
    const t = makeTask(R, kind); assert.equal(t.kind, kind); assert.equal(checkTask(t, t.answer), true);
    if (t.options) { assert.ok(t.options.length >= 2 && t.options.length <= 4); assert.equal(t.options.filter((o) => checkTask(t, o.id)).length, 1); assert.equal(new Set(t.options.map((o) => o.id)).size, t.options.length); }
    if (t.input === 'tap') { assert.equal(t.tap.need.length, 2); assert.equal(checkTask(t, [...t.tap.need].reverse()), true); assert.equal(checkTask(t, [t.tap.need[0]]), false); }
    if (t.figure) assert.deepEqual(labelErrors(layout(t.figure)), []);     // S4 (a bare proportion) has no drawing
    for (const id of [...t.marks, ...t.reveal, ...(t.goal ? [t.goal] : [])]) { assert.ok(t.facts[id], `${kind}: no fact ${id}`); assert.equal(holds(t.figure, t.facts[id]), true); }   // what the drawing marks is true
    tx(t.text.k, t.text.vars); tx(t.why.k, t.why.vars); assert.ok(T[t.why.k]);
    // a statement option that is not the answer is never a given or seen (marked) fact twice, and the options differ
    if (t.options && t.options[0].st) assert.equal(new Set(t.options.map((o) => norm(t.figure, o.st))).size, t.options.length);
    seen.add(JSON.stringify([t.text, t.answer]));
  }
  assert.ok(seen.size >= 12, `${kind}: only ${seen.size} different tasks`);
});
test('W4 includes both traps', () => {
  const R = makeR(seeded(78)); let cant = 0, notBetween = 0, threeAngles = 0;
  for (let i = 0; i < 2000; i++) { const t = makeTask(R, 'W4'); assert.deepEqual(t.options.map((o) => o.id), ['sas', 'asa', 'sss', 'cant']); if (t.answer === 'cant') { cant++; if (t.trap === 'not-between') notBetween++; if (t.trap === 'three-angles') threeAngles++; } }
  assert.ok(notBetween > 50 && threeAngles > 50 && cant < 1200);
});
test('W2 / W6: both answers come up; W7 wrong options are false in the drawing; W3 answer is the seen fact', () => {
  const R = makeR(seeded(79)); const c = { known: 0, looks: 0, yes: 0, no: 0 };
  for (let i = 0; i < 400; i++) {
    c[makeTask(R, 'W2').answer]++; c[makeTask(R, 'W6').answer]++;
    const t7 = makeTask(R, 'W7'); for (const o of t7.options) assert.equal(holds(t7.figure, o.st), o.id === t7.answer, 'W7 option truth');
    const t3 = makeTask(R, 'W3'); assert.ok(t3.reveal.length === 1 && norm(t3.figure, t3.facts[t3.reveal[0]]) === t3.answer);
    // W6 (review M1): "yes" is a given or a seen fact, "no" is the goal or another consequence
    const t6 = makeTask(R, 'W6'), k6 = norm(t6.figure, t6.st);
    assert.equal(t6.answer === 'yes', ['given', 'seen'].includes(t6.from), t6.from);
    if (t6.from === 'given') assert.ok(t6.given.some((g) => norm(t6.figure, g) === k6), 'W6 given');
    if (t6.from === 'seen') { assert.ok(holds(t6.figure, t6.st)); assert.ok(t6.st.kind === 'seg' ? t6.st.x.split('').sort().join('') === t6.st.y.split('').sort().join('') : t6.st.x.v === t6.st.y.v, 'W6 seen: a shared side or vertical angles'); assert.ok(!t6.given.some((g) => norm(t6.figure, g) === k6)); }
    if (t6.from === 'goal') assert.equal(k6, norm(t6.figure, t6.toProve));
    if (t6.from === 'consequence') { assert.ok(holds(t6.figure, t6.st)); assert.notEqual(k6, norm(t6.figure, t6.toProve)); assert.ok(!t6.given.some((g) => norm(t6.figure, g) === k6)); }
  }
  for (const k of Object.keys(c)) assert.ok(c[k] > 100, k);
});
/* review I2: "angle not between the sides" is only asked when it is truly side-side-angle ambiguous: the angle is
   opposite the SHORTER marked side, so a second, different triangle has the same three marks */
function ssaOf(t) {
  const P = t.figure.points, [s1, s2, a] = t.marks.map((id) => t.facts[id]);
  const ang = a.kind === 'ang' ? a : null, sides = [s1, s2, a].filter((f) => f.kind === 'seg').map((f) => f.x);
  const v = ang.x.v, adj = sides.find((s) => s.includes(v)), opp = sides.find((s) => !s.includes(v));
  const w = [...adj].find((q) => q !== v), u = ang.x.r.find((q) => q !== w);
  const d = Math.hypot(P[u][0] - P[v][0], P[u][1] - P[v][1]), dir = [(P[u][0] - P[v][0]) / d, (P[u][1] - P[v][1]) / d];
  const wv = [P[w][0] - P[v][0], P[w][1] - P[v][1]], b = Math.hypot(...wv), A = Math.hypot(P[opp[0]][0] - P[opp[1]][0], P[opp[0]][1] - P[opp[1]][1]);
  const half = dir[0] * wv[0] + dir[1] * wv[1], disc = half * half - (b * b - A * A);   // |W − (V + s·dir)| = a  ⇔  s² − 2·half·s + b² − a² = 0
  return { a: A, b, roots: disc > 0 ? [half - Math.sqrt(disc), half + Math.sqrt(disc)] : [], onRay: ang.x.r.includes(u) && opp.includes(u) && opp.includes(w), d };
}
test('W4 "not between": the angle is opposite the shorter side and a second, different triangle fits the marks (review I2)', () => {
  const R = makeR(seeded(80)); let n = 0;
  for (let i = 0; i < 3000; i++) {
    const t = makeTask(R, 'W4');
    if (t.trap !== 'not-between') continue;
    n++;
    const g = ssaOf(t);
    assert.ok(g.onRay, 'the opposite side ends on the angle\'s other ray');
    assert.ok(g.a < g.b * 0.95, `angle opposite the shorter side (${g.a.toFixed(3)} vs ${g.b.toFixed(3)})`);
    assert.equal(g.roots.length, 2); assert.ok(g.roots[0] > 0.05 * g.b, 'both triangles are real');
    assert.ok(g.roots.some((r) => Math.abs(r - g.d) < 1e-6 * g.b), 'the drawn triangle is one of the two');
    assert.ok(g.roots[1] - g.roots[0] > 0.15 * g.b, 'the two triangles differ visibly');
    assert.equal(t.answer, 'cant');
  }
  assert.ok(n > 200, `only ${n} "not between" tasks`);
});
test('W2 / W6: an isosceles consequence of family T is never "only looks so" or "not yet" (review I3)', () => {
  const R = makeR(seeded(81)), seen = { T: 0 };
  for (let i = 0; i < 1500; i++) for (const kind of ['W2', 'W6']) {
    const t = makeTask(R, kind), p = typeById(t.src.type).remake(t.src);
    assert.equal(norm(p.figure, p.facts[t.src.fact]), norm(t.figure, t.st), 'src rebuilds the statement');
    if (p.family === 'T') seen.T++;
    if (t.answer === 'looks' || t.answer === 'no') assert.equal(isoLater(p, p.given, t.src.fact), false, `${kind} ${p.id} ${t.src.fact}`);
  }
  assert.ok(seen.T > 100, 'family T comes up');
});

/* ── the similarity warm-up S1–S5 (spec 2026-11-23 §7.7, Task 13) ── */
const SK = ['S1', 'S2', 'S3', 'S4', 'S5'];
const halfN = (v) => Number.isFinite(v) && v >= 1 && Math.abs(v * 2 - Math.round(v * 2)) < 1e-9;
test('S1–S5: 200 seeds each, the right answer passes and a wrong one fails', () => {
  const S = makeR(seeded(2026)), c = {};                          // 200 seeds like the app's own (random 31-bit: small seeds' first draws are alike)
  for (const kind of SK) for (let n = 1; n <= 200; n++) {
    const seed = S.int(1, 2147483646), t = makeTask(makeR(seeded(seed)), kind);
    c[`${kind}:${t.answer}`] = 1;
    assert.equal(t.kind, kind); assert.equal(checkTask(t, t.answer), true, `${kind} #${seed}`);
    if (t.input === 'keypad') {
      assert.equal(checkTask(t, String(t.answer)), true);
      for (const w of [t.answer + 0.5, String(t.answer + 1), '', '.', `0${t.answer}`, null]) assert.equal(checkTask(t, w), false, `${kind} #${seed} ${w}`);
    } else {
      const wrong = t.options.filter((o) => o.id !== t.answer);
      assert.ok(wrong.length >= 1); for (const o of wrong) assert.equal(checkTask(t, o.id), false);
    }
    assert.ok(T[t.why.k], t.why.k); tx(t.why.k, t.why.vars); tx(t.text.k, t.text.vars);
  }
  for (const k of ['S1:common-angle', 'S1:vertical', 'S1:corresponding', 'S1:alternate', 'S5:yes', 'S5:no']) assert.ok(c[k], `${k} never came up`);
});
test('S1: the reason is the one the geometry gives (common · vertical · corresponding · alternate), all four come up', () => {
  const R = makeR(seeded(131)), c = {};
  for (let i = 0; i < 400; i++) {
    const t = makeTask(R, 'S1'), [id] = t.marks, f = t.facts[id], fig = t.figure;
    assert.deepEqual(t.options.map((o) => o.id).sort(), ['alternate', 'common-angle', 'corresponding', 'vertical']);
    assert.equal(holds(fig, f), true); assert.ok(t.facts.par && t.given.length === 1 && t.given[0].kind === 'par');
    if (t.answer === 'common-angle') assert.equal(angKey(fig, f.x), angKey(fig, f.y));
    else if (t.answer === 'vertical') { assert.equal(f.x.v, f.y.v); assert.notEqual(angKey(fig, f.x), angKey(fig, f.y)); }
    else assert.equal(parallelKind(fig, f, t.facts.par), t.answer);
    if (['common-angle', 'vertical'].includes(t.answer)) assert.equal(parallelKind(fig, f, t.facts.par), null);
    c[t.answer] = (c[t.answer] || 0) + 1;
  }
  for (const k of ['common-angle', 'vertical', 'corresponding', 'alternate']) assert.ok(c[k] > 30, `${k}: ${c[k]}`);
});
test('S2: the partner is the letter in the same place of the written similarity; S3: the side opposite the equal angle', () => {
  const R = makeR(seeded(132)); let vtx = 0, side = 0;
  for (let i = 0; i < 400; i++) {
    const t = makeTask(R, 'S2'), M = t.map, F = Object.fromEntries(M);
    assert.ok(holds(t.figure, { kind: 'sim', map: M }));
    if (t.ask.p) { vtx++; assert.notEqual(F[t.ask.p], t.ask.p, 'never a shared vertex'); assert.equal(t.answer, F[t.ask.p]); assert.deepEqual(t.options.map((o) => o.id), M.map((m) => m[1]).sort()); }
    else { side++; assert.equal(t.answer, segKey(F[t.ask.s[0]] + F[t.ask.s[1]])); assert.equal(t.options.length, 3); }
    const u = makeTask(R, 'S3'), fig = u.figure, [from, to] = u.ask.tris;
    const opp = (tri, s) => { const v = tri.find((q) => !s.includes(q)); return measure(fig, { v, r: tri.filter((q) => q !== v) }); };
    const a = opp(from, u.ask.s);
    assert.ok(Math.abs(opp(to, u.answer) - a) < 1e-6, 'the answer is opposite the equal angle');
    for (const o of u.options) if (o.id !== u.answer) assert.ok(Math.abs(opp(to, o.id) - a) > 10, 'no other side is opposite an equal angle');
    assert.equal(u.marks.length, 3); for (const id of u.marks) assert.equal(holds(fig, u.facts[id]), true);
    assert.ok(!/∼/.test(JSON.stringify(u.text)), 'S3 gives no similarity in vertex order');
    const vOf = (tri, sd) => tri.find((q) => !sd.includes(q)), angOf = (tri, sd) => { const v = vOf(tri, sd); return { v, r: tri.filter((q) => q !== v) }; };
    assert.equal(u.why.k === 'w.S3.whyCommon', angKey(fig, angOf(from, u.ask.s)) === angKey(fig, angOf(to, u.answer)), 'the "common angle" explanation only for one shared angle');
  }
  assert.ok(vtx > 100 && side > 100);
});
test('S4: a true proportion, whole or x.5 numbers, four different numbers', () => {
  const R = makeR(seeded(133)), seen = new Set();
  for (let i = 0; i < 1000; i++) {
    const t = makeTask(R, 'S4'), v = (q) => (q === 'x' ? t.answer : Number(q)), [[a, b], [c, d]] = t.pairs;
    assert.equal(t.pairs.flat().filter((q) => q === 'x').length, 1);
    assert.ok(Math.abs(v(a) / v(b) - v(c) / v(d)) < 1e-9);
    const nums = t.pairs.flat().map(v); for (const n of nums) assert.ok(halfN(n), String(n));
    assert.equal(new Set(nums).size, 4); assert.ok(Math.max(...nums) <= 30);
    seen.add(t.pairs.flat().indexOf('x'));
  }
  assert.equal(seen.size, 4, 'x stands in every place');
});
test('S5: equal angles — two triangles are similar (yes), two rectangles not necessarily (their ratios clearly differ)', () => {
  const R = makeR(seeded(134)), c = { yes: 0, no: 0 };
  for (let i = 0; i < 400; i++) {
    const t = makeTask(R, 'S5'), fig = t.figure, P = fig.points, len = (a, b) => Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]);
    c[t.answer]++;
    for (const id of t.marks) assert.equal(holds(fig, t.facts[id]), true);
    const [p1, p2] = t.polys, L = layout(fig), at = Object.fromEntries(L.labels.map((l) => [l.p, l]));
    for (const a of p1) for (const b of p2) assert.ok(Math.hypot(at[a].x - at[b].x, at[a].y - at[b].y) >= 30, `letters ${a}, ${b} of the two shapes too close`);   // the shapes read apart
    if (t.answer === 'yes') {
      assert.ok(p1.length === 3 && p2.length === 3); assert.equal(t.marks.length, 3);
      const k = len(p2[0], p2[1]) / len(p1[0], p1[1]);
      for (let j = 0; j < 3; j++) assert.ok(Math.abs(len(p2[j], p2[(j + 1) % 3]) / len(p1[j], p1[(j + 1) % 3]) - k) < 1e-6);
      assert.ok(Math.abs(k - 1) > 0.3, 'clearly different sizes');
    } else {
      assert.ok(p1.length === 4 && p2.length === 4); assert.equal(t.marks.length, 4);
      for (const id of t.marks) assert.ok(Math.abs(measure(fig, t.facts[id].x) - 90) < 1e-6 && t.facts[id].mark.right);
      const ratio = (q) => Math.max(len(q[0], q[1]), len(q[1], q[2])) / Math.min(len(q[0], q[1]), len(q[1], q[2]));
      assert.ok(Math.abs(ratio(p1) - ratio(p2)) >= 1, `${ratio(p1)} vs ${ratio(p2)}`);
    }
  }
  assert.ok(c.yes > 120 && c.no > 120, JSON.stringify(c));
});
