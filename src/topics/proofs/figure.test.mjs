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

/* ── room for the marks (the phone gate, 2026-11-21) ── */
test('two angles side by side at one vertex never draw their arcs at one radius', async () => {
  const { layout: lay, markGeom: mg } = await import('./figure-core.js');
  const fig = { points: { A: [0, 2], B: [-2, 0], C: [2, 0], D: [0, 0] }, lines: [['B', 'D', 'C']], segs: ['AB', 'AC', 'BD', 'DC', 'AD'],
    angles: [{ v: 'A', r: ['B', 'D'] }, { v: 'A', r: ['C', 'D'] }, { v: 'B', r: ['A', 'D'] }, { v: 'C', r: ['A', 'D'] }], tris: [['A', 'B', 'D'], ['A', 'C', 'D']] };
  const L = lay(fig), at = (v) => L.angles.filter((a) => a.vn === v).map((a) => a.r);
  assert.equal(new Set(at('A')).size, 2); assert.ok(Math.abs(at('A')[0] - at('A')[1]) >= 9);          // clear of up to three arcs
  assert.deepEqual([at('B'), at('C')], [[18], [18]]);                                                  // alone at its vertex: the usual radius
  const r = (d) => +d.match(/A([\d.]+) /)[1];
  assert.deepEqual(L.angles.filter((a) => a.vn === 'A').map((a) => r(mg(L, a.part, { arcs: 1 }).arcs[0])), at('A'));   // the marks follow
  // vertical angles (not side by side) keep one radius
  const X = lay({ points: { A: [-2, 0], B: [2, 0], C: [-1, 1.5], D: [1, -1.5], O: [0, 0] }, lines: [['A', 'O', 'B'], ['C', 'O', 'D']], segs: ['AO', 'OB', 'CO', 'OD'], angles: [{ v: 'O', r: ['A', 'C'] }, { v: 'O', r: ['B', 'D'] }], tris: [] });
  assert.deepEqual(X.angles.map((a) => a.r), [18, 18]);
});
test('the goal echo of a triangle stays inside it, clear of the ticks; a small triangle gets none', async () => {
  const { triEcho } = await import('./figure-core.js');
  const P = [[20, 180], [300, 180], [160, 20]], Q = triEcho(P);
  assert.equal(Q.length, 3);
  const dist = (p, a, b) => Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (const q of Q) for (let i = 0; i < 3; i++) assert.ok(dist(q, P[i], P[(i + 1) % 3]) >= 11);
  assert.equal(triEcho([[0, 0], [60, 0], [30, 30]]), null);
});

/* ── Task 12 (spec 2026-11-23 §7.6, the ending): the small triangle grows onto the big one ── */
test('similarity ending: the final matrix lays △1 on △2 along the sim map (P, B, H, N, 1e-6 in screen space)', async () => {
  const { seeded, makeR } = await import('../new/core.js');
  const FAMS = await Promise.all(['p', 'b', 'h', 'n'].map((f) => import(`./families/${f}.js`).then((m) => m.default)));
  const R = makeR(seeded(1212));
  let flips = 0, turns = 0;
  for (const fam of FAMS) for (const v of Object.keys(fam.variants)) for (const ask of [false, true]) for (let i = 0; i < 25; i++) {
    const b = fam.build(R, v, { ask }), Lb = layout(b.figure), m = motionMatrix(Lb, b);
    const ap = ([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    for (const [u, w] of b.facts.sim.map) { const q = ap(Lb.pts[u]); assert.ok(Math.hypot(q[0] - Lb.pts[w][0], q[1] - Lb.pts[w][1]) < 1e-6, `${v} ${u}→${w}`); }
    const det = m[0] * m[3] - m[1] * m[2], k = Math.sqrt(Math.abs(det));
    assert.ok(Math.abs(k - b.ratio.p / b.ratio.q) < 1e-6, `${v}: scale ${k} vs ${b.ratio.p}/${b.ratio.q} (the small one grows)`);
    // a similarity: a turn and a scale (a = d, b = −c), or with a flip (a = −d, b = c)
    if (det > 0) { turns++; assert.ok(Math.abs(m[0] - m[3]) < 1e-6 && Math.abs(m[1] + m[2]) < 1e-6, v); }
    else { flips++; assert.ok(Math.abs(m[0] + m[3]) < 1e-6 && Math.abs(m[1] - m[2]) < 1e-6, v); }
    const fr = motionFrames(m, 16), close = (x, y) => x.every((q, j) => Math.abs(q - y[j]) < 1e-6);
    assert.equal(fr.length, 17); assert.ok(close(fr[0], [1, 0, 0, 1, 0, 0]), v); assert.ok(close(fr[16], m), v);
    // it grows all the way (a turn: a similarity in every frame, its scale rising from 1 to k)
    if (det > 0) {
      let last = 1 - 1e-9;
      for (const f of fr) {
        assert.ok(Math.abs(f[0] - f[3]) < 1e-6 && Math.abs(f[1] + f[2]) < 1e-6, `${v}: a similarity in every frame`);
        const s = Math.hypot(f[0], f[1]); assert.ok(s >= last, `${v}: grows`); last = s;
      }
    }
    // a shared corner (P: A ↔ A) never moves: the small triangle grows out of it
    for (const [u, w] of b.facts.sim.map) if (u === w) for (const f of fr) {
      const p = Lb.pts[u], q = [f[0] * p[0] + f[2] * p[1] + f[4], f[1] * p[0] + f[3] * p[1] + f[5]];
      assert.ok(Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6, `${v}: ${u} stays`);
    }
  }
  assert.ok(turns > 0, 'some endings turn and grow');
  assert.ok(flips + turns > 0);
});
test('similarity frames: a flip grows too, through the axis squash, and ends on M', () => {
  const close = (x, y) => x.every((q, j) => Math.abs(q - y[j]) < 1e-6);
  const M = [2, 0, 0, -2, 0, 60];                                   // ×2 with a flip over y = 20 (the fixed point (0, 20))
  const fr = motionFrames(M, 4);
  assert.ok(close(fr[0], [1, 0, 0, 1, 0, 0])); assert.ok(close(fr[4], M));
  assert.ok(Math.abs(fr[2][3]) < 1e-6, 'half way it is flat across the axis');
  assert.ok(Math.abs(fr[2][0] - Math.SQRT2) < 1e-6, 'and √2 long along it');
  const S = [3, 0, 0, 3, -20, -40];                                 // a plain ×3 about (10, 20)
  for (const f of motionFrames(S, 6)) { const q = [f[0] * 10 + f[2] * 20 + f[4], f[1] * 10 + f[3] * 20 + f[5]]; assert.ok(Math.hypot(q[0] - 10, q[1] - 20) < 1e-6); }
});
