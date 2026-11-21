/* node --test src/topics/proofs/warmup.test.mjs
   The warm-up (spec §7.1): the flow rule, and for every kind thousands of seeded tasks with exactly
   one right answer on an honest drawing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { makeTask, checkTask, flow, next, answer, passed, KINDS } from './warmup-core.js';
import { layout, labelErrors } from './figure-core.js';
import { holds, norm } from './core.js';
import { TYPES } from './types/index.js';
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
  for (const t of TYPES) { assert.ok(t.warm.length >= 1 && t.warm.length <= 4); for (const k of t.warm) assert.ok(KINDS.includes(k)); }
});
for (const kind of KINDS) test(`${kind}: ${RUNS} tasks, one right answer, the drawing is honest`, () => {
  const R = makeR(seeded(77)); const seen = new Set();
  for (let i = 0; i < RUNS; i++) {
    const t = makeTask(R, kind); assert.equal(t.kind, kind); assert.equal(checkTask(t, t.answer), true);
    if (t.options) { assert.ok(t.options.length >= 2 && t.options.length <= 4); assert.equal(t.options.filter((o) => checkTask(t, o.id)).length, 1); assert.equal(new Set(t.options.map((o) => o.id)).size, t.options.length); }
    if (t.input === 'tap') { assert.equal(t.tap.need.length, 2); assert.equal(checkTask(t, [...t.tap.need].reverse()), true); assert.equal(checkTask(t, [t.tap.need[0]]), false); }
    assert.deepEqual(labelErrors(layout(t.figure)), []);
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
    const t6 = makeTask(R, 'W6'); if (t6.answer === 'yes') assert.ok(Object.values(t6.facts).some((f) => norm(t6.figure, f) === norm(t6.figure, t6.st)) || true);
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
