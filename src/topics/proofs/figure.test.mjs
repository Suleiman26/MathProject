/* node --test src/topics/proofs/figure.test.mjs
   From a figure to a screen layout: parts, hit shapes, marks, labels (never on a line), the
   chooser for near taps, and the ending motion. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, labelErrors, markGeom, partsNear, partId, partName, motionMatrix, motionFrames } from './figure-core.js';
import { xsas, over } from './fixtures.mjs';

const P = xsas(), L = layout(P.figure);
test('layout: everything inside 320×196, no label on a line', () => {
  assert.equal(L.W, 320); assert.equal(L.H, 196);
  for (const p of Object.values(L.pts)) { assert.ok(p[0] >= 8 && p[0] <= 312 && p[1] >= 8 && p[1] <= 188); }
  assert.deepEqual(labelErrors(L), []); assert.deepEqual(labelErrors(layout(over().figure)), []);
  assert.equal(L.labels.length, 5); assert.equal(L.segs.length, 6); assert.equal(L.tris.length, 2);
  assert.equal(L.angles.length, 6); assert.equal(L.hits.length, 6 + 6 + 2);
});
test('labelErrors: a label put on a line is reported', () => {
  const bad = structuredClone(L), mid = [(L.pts.A[0] + L.pts.O[0]) / 2, (L.pts.A[1] + L.pts.O[1]) / 2];
  Object.assign(bad.labels[0], { x: mid[0], y: mid[1] });
  assert.ok(labelErrors(bad).length > 0);
});
test('ids and names', () => {
  // (plan slip fixed: an angle id is "by rays", which needs the figure; partId takes it as a second argument)
  assert.equal(partId('OA'), 's:AO'); assert.equal(partId(['C', 'A', 'O']), 't:ACO');
  assert.equal(partId({ v: 'O', r: ['A', 'C'] }), 'a:O:AC');
  assert.equal(partId({ v: 'A', r: ['O', 'C'] }, P.figure), partId({ v: 'A', r: ['C', 'B'] }, P.figure));
  assert.deepEqual(partName('AO'), { m: 'AO', he: 'הקטע AO' }); assert.equal(partName({ v: 'O', r: ['A', 'C'] }).he, 'הזווית AOC');
  assert.deepEqual(partName(['A', 'O', 'C']), { m: '△AOC', he: 'המשולש AOC' });
});
test('marks: tick and arc counts, a square for 90°', () => {
  assert.equal(markGeom(L, 'AO', { ticks: 1 }).lines.length, 1); assert.equal(markGeom(L, 'AC', { ticks: 3 }).lines.length, 3);
  assert.equal(markGeom(L, { v: 'O', r: ['A', 'C'] }, { arcs: 2 }).arcs.length, 2);
  const sq = markGeom(L, { v: 'O', r: ['A', 'C'] }, { right: true }); assert.ok(sq.square && sq.arcs.length === 0);
  const [x1, y1, x2, y2] = markGeom(L, 'AO', { ticks: 1 }).lines[0]; assert.ok(Math.abs(Math.hypot(x2 - x1, y2 - y1) - 12) < 1e-6);
});
test('chooser: a tap near the crossing point lists several parts, a tap on a side lists one', () => {
  const O = L.pts.O; assert.ok(partsNear(L, [O[0] - 6, O[1]]).length >= 2);
  const mid = [(L.pts.A[0] + L.pts.C[0]) / 2, (L.pts.A[1] + L.pts.C[1]) / 2]; assert.deepEqual(partsNear(L, mid), ['s:AC']);
  const t = L.tris.find((x) => x.id === 't:ACO'), c = [(t.pts[0][0] + t.pts[1][0] + t.pts[2][0]) / 3, (t.pts[0][1] + t.pts[1][1] + t.pts[2][1]) / 3];
  assert.deepEqual(partsNear(L, c), ['t:ACO']);
});
test('ending motion carries triangle 1 onto triangle 2 along the matching', () => {
  for (const pr of [P, over()]) {
    const Lp = layout(pr.figure), m = motionMatrix(Lp, pr), ap = ([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    for (const [u, v] of pr.facts.cong.map) { const q = ap(Lp.pts[u]); assert.ok(Math.hypot(q[0] - Lp.pts[v][0], q[1] - Lp.pts[v][1]) < 0.5, `${u}→${v}`); }
    assert.ok(Math.abs(Math.abs(m[0] * m[3] - m[1] * m[2]) - 1) < 1e-6, 'rigid');
  }
});
test('motion frames: start where the triangle is, end on the matching, rigid all the way for a turn', () => {
  const close = (m, q) => m.every((v, i) => Math.abs(v - q[i]) < 1e-6);
  for (const pr of [P, over()]) {
    const m = motionMatrix(layout(pr.figure), pr), fr = motionFrames(m, 12);
    assert.equal(fr.length, 13); assert.ok(close(fr[0], [1, 0, 0, 1, 0, 0])); assert.ok(close(fr[12], m));
    if (m[0] * m[3] - m[1] * m[2] > 0) for (const f of fr) assert.ok(Math.abs(f[0] * f[3] - f[1] * f[2] - 1) < 1e-6);
  }
  const flip = [1, 0, 0, -1, 0, 40], ff = motionFrames(flip, 4);          // a flip over the line y = 20
  assert.ok(close(ff[4], flip)); assert.ok(close(ff[2], [1, 0, 0, 0, 0, 20]));
  assert.ok(close(motionFrames([1, 0, 0, 1, 30, -10], 2)[1], [1, 0, 0, 1, 15, -5]));
});
