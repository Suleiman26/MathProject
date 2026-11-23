/* node --test src/topics/proofs/families-sim.test.mjs        (RUNS=200 for a quick pass)
   Similarity figure families P, B, H, N (spec 2026-11-23 §7.4–§7.6): seeded drawings per variant, each honest
   (liesSim: ratio, scalene, parallel, the parallel-angle reason matches the geometry, numbers whole or x.5 and to
   scale, every number beside its own side), each with a canonical proof the checker accepts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { cramped } from './families/kit.js';
import { liesSim, parallelKind, kOf, numberItems, numberLabels, piecesOf, sidesOf } from './families/sim-kit.js';
import { classify, checkReason, isDone, canonRows, holds, measure, segKey, checkProp, anchorOf, roleOf } from './core.js';
import { layout } from './figure-core.js';
import { T, NEW_DRAFTS } from './texts.js';
import P from './families/p.js'; import B from './families/b.js';
import H from './families/h.js'; import N from './families/n.js';

const RUNS = Number(process.env.RUNS || 1000);
const FAMS = [P, B, H, N];
const half = (v) => Number.isInteger(v * 2);
const triAngles = (fig, t) => t.map((v, i) => measure(fig, { v, r: [t[(i + 1) % 3], t[(i + 2) % 3]] }));

test('inventory: six variants, H and N crossed, P and B not', () => {
  assert.deepEqual(Object.keys(P.variants), ['P-CC', 'P-CC2']); assert.deepEqual(Object.keys(B.variants), ['B-VA', 'B-AA']);
  assert.deepEqual(Object.keys(H.variants), ['H-CR']); assert.deepEqual(Object.keys(N.variants), ['N-CG']);
  for (const f of [P, B]) for (const v of Object.values(f.variants)) assert.equal(v.crossed, false);
  for (const f of [H, N]) for (const v of Object.values(f.variants)) assert.equal(v.crossed, true);
  assert.deepEqual(H.asks, ['AD', 'CD', 'BC']);
  assert.ok(!H.asks.includes('AC'));
});

/* walk the canonical proof (and the ratio + number rows when asked) through the checker */
function walk(b) {
  const target = b.ask ? 'val' : 'sim', canon = b.ask ? [...b.canon, 'prop', 'val'] : b.canon;
  const p = { ...b, target, canon, type: b.ask ? 'sim-calc' : 'prove-sim', traps: {} }, done = [];
  for (const row of canonRows(p)) {
    const c = classify(p, done, row.st);
    assert.equal(c.c, 'ok', `${b.variant} ${row.fact}: ${JSON.stringify(c)}`);
    assert.equal(checkReason(p, done, row.fact, row.reason).ok, true, `${b.variant} ${row.fact} ${row.reason}`);
    done.push(row.fact);
  }
  assert.equal(isDone(p, done), true);
}

for (const fam of FAMS) for (const v of Object.keys(fam.variants)) for (const ask of [false, true]) {
  test(`${v}${ask ? ' (with a length to find)' : ''}: ${RUNS} honest drawings, canon proof passes`, () => {
    const R = makeR(seeded(777)); const seen = new Set();
    for (let i = 0; i < RUNS; i++) {
      const b = fam.build(R, v, { ask });
      const fig = b.figure, why = JSON.stringify(fig.points);
      assert.deepEqual(liesSim(b), [], why);
      assert.deepEqual(cramped(fig), [], why);
      assert.equal(b.family, fam.id); assert.equal(b.variant, v); assert.equal(b.sim, 'sim'); assert.equal(anchorOf(b), 'sim');
      assert.equal(b.crossed, fam.variants[v].crossed);
      for (const [id, f] of Object.entries(b.facts)) assert.ok(holds(fig, f), `${v} ${id} ${why}`);
      // the ratio: p/q in [1.5, 3], the sides in that ratio
      const k = kOf(b.ratio); assert.ok(k >= 1.5 && k <= 3, `k ${k}`);
      if (b.crossed) assert.ok(Math.abs(k - 2) >= 0.15, `k ${k}`);
      const [t1, t2] = [b.facts.sim.map.map((m) => m[0]), b.facts.sim.map.map((m) => m[1])];
      const [S1, S2] = [sidesOf(fig, t1), sidesOf(fig, t2)];
      for (let j = 0; j < 3; j++) assert.ok(Math.abs(measure(fig, S2[j]) / measure(fig, S1[j]) - k) < 1e-9);
      // scalene: every two angles of a triangle 12° apart or more
      for (const t of [t1, t2]) { const A = triAngles(fig, t); for (let x = 0; x < 3; x++) for (let y = x + 1; y < 3; y++) assert.ok(Math.abs(A[x] - A[y]) >= 12, `${t} ${A}`); }
      // numbers: whole or x.5, to scale, only on the sides the problem uses, the asked side never given
      assert.ok(fig.scale > 0);
      for (const [s, n] of Object.entries(fig.labels)) { assert.ok(half(n) && n >= 1, `${s}=${n}`); assert.ok(Math.abs(measure(fig, s) * fig.scale - n) < 1e-6 * n); }
      if (ask) {
        const val = b.facts.val, prop = b.facts.prop;
        assert.ok(half(val.v) && val.v >= 1); assert.equal(val.x, b.ask);
        assert.equal(fig.labels[b.ask], undefined, 'the asked length is never given');
        assert.ok(!(segKey(b.ask) in Object.fromEntries(Object.keys(fig.labels).map((s) => [segKey(s), 1]))));
        assert.ok(b.asks.includes(b.ask));
        const shown = [...Object.values(fig.labels), val.v];
        assert.equal(new Set(shown).size, shown.length, `numbers repeat: ${shown}`);
        assert.equal(prop.pairs.length, 2); assert.deepEqual(checkProp(b, prop, { need: prop.need }), { ok: true });
        const used = new Set(prop.need.known.flatMap((s) => piecesOf(fig, s)).map(segKey));
        for (const s of Object.keys(fig.labels)) assert.ok(used.has(segKey(s)), `${s} labelled but not used`);
        for (const s of prop.need.known) assert.ok(half(b.values[s]), s);
        assert.ok(!S1.map(segKey).includes(segKey(b.ask)) || !S2.map(segKey).includes(segKey(b.ask)), 'never a side of both triangles');
        assert.deepEqual(b.consequences.slice(-2), ['prop', 'val']);
      } else {
        assert.deepEqual(fig.labels, {}); assert.equal(b.ask, undefined); assert.equal(b.facts.prop.pairs.length, 3);
        assert.equal(b.facts.val, undefined);
      }
      walk(b);
      seen.add(Object.keys(fig.points).join('') + JSON.stringify(Object.values(fig.points).map((q) => q.map((x) => Math.round(x * 10)))));
    }
    assert.ok(seen.size >= Math.min(12, RUNS / 2), `only ${seen.size} different drawings`);
  });
}

test('P and B: the parallel given is the first canon row and a given; its angle rows lean on it', () => {
  const R = makeR(seeded(5));
  for (const [f, v] of [[P, 'P-CC'], [P, 'P-CC2'], [B, 'B-VA'], [B, 'B-AA']]) for (let i = 0; i < 40; i++) {
    const b = f.build(R, v, {});
    assert.equal(b.canon[0], 'par'); assert.deepEqual(b.given, ['par']); assert.equal(roleOf(b, 'par'), 'given');
    assert.deepEqual(b.givenText[0], { facts: ['par'], form: 'eq' });
    for (const id of b.canon.slice(1, 3)) {
      const r = b.just[id][0].reasons[0];
      if (r === 'corresponding' || r === 'alternate') { assert.deepEqual(b.just[id][0].needs, ['par']); assert.equal(roleOf(b, id), 'parallel'); }
    }
  }
});
test('variants: P-CC = common + corresponding, P-CC2 = two corresponding, B-VA = vertical + alternate, B-AA = two alternate', () => {
  const R = makeR(seeded(8));
  const reasons = (b) => b.canon.slice(1, 3).map((id) => b.just[id][0].reasons[0]).sort();
  for (let i = 0; i < 30; i++) {
    assert.deepEqual(reasons(P.build(R, 'P-CC', {})), ['common-angle', 'corresponding']);
    assert.deepEqual(reasons(P.build(R, 'P-CC2', {})), ['corresponding', 'corresponding']);
    assert.deepEqual(reasons(B.build(R, 'B-VA', {})), ['alternate', 'vertical']);
    assert.deepEqual(reasons(B.build(R, 'B-AA', {})), ['alternate', 'alternate']);
  }
});
test('H: right angles accept both נתון and שתי זוויות ישרות; never asks AC; matching crosses C ↔ B', () => {
  const R = makeR(seeded(9)), names = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < 200; i++) {
    const b = H.build(R, 'H-CR', { ask: true, names });
    assert.notEqual(segKey(b.ask), 'AC');
    const id = b.given[0], f = b.facts[id];
    assert.equal(f.right, true); assert.deepEqual([...b.just[id][0].reasons].sort(), ['given', 'right-angles']);
    for (const r of ['given', 'right-angles']) assert.equal(checkReason(b, [], id, r).ok, true);
    assert.ok(b.facts.sim.map.some(([u, v]) => u === 'C' && v === 'B'));
  }
  assert.throws(() => H.build(makeR(seeded(1)), 'H-CR', { ask: 'AC', names }), /cannot ask/);
});
test('N: the given angle pairs D with C (not B); DE is visibly not parallel to BC', () => {
  const R = makeR(seeded(10)), names = ['A', 'B', 'C', 'D', 'E'];
  for (let i = 0; i < 200; i++) {
    const b = N.build(R, 'N-CG', { ask: i % 2 === 0, names });
    assert.ok(b.facts.sim.map.some(([u, v]) => u === 'D' && v === 'C'));
    assert.equal(holds(b.figure, { kind: 'par', x: 'DE', y: 'BC' }, 0.05), false);
    assert.equal(b.facts.par, undefined); assert.deepEqual(b.given, [b.canon[0]]); assert.equal(roleOf(b, b.given[0]), 'given');
  }
});
test('opts.ask names a side in the family\'s own letters; the result is in the drawn letters', () => {
  const R = makeR(seeded(11));
  for (const [f, v] of [[P, 'P-CC'], [B, 'B-VA'], [H, 'H-CR'], [N, 'N-CG']]) for (const ask of f.asks) {
    const id = f.build(R, v, { ask, names: f.roles });
    assert.equal(segKey(id.ask), segKey(ask));
    const named = f.build(R, v, { ask });
    assert.ok(named.asks.map(segKey).includes(segKey(named.ask)));
  }
});
test('builds are deterministic from the seed', () => {
  for (const f of FAMS) for (const v of Object.keys(f.variants)) for (const ask of [false, true]) {
    assert.deepEqual(f.build(makeR(seeded(4242)), v, { ask }), f.build(makeR(seeded(4242)), v, { ask }));
  }
});

/* the honesty check catches what it must */
test('liesSim: corresponding vs alternate is checked against the geometry (a mislabel fails)', () => {
  const p = P.build(makeR(seeded(1)), 'P-CC2', {});
  const id = p.canon[1];
  assert.equal(parallelKind(p.figure, p.facts[id], p.facts.par), 'corresponding');
  const bad = structuredClone(p); bad.just[id][0].reasons = ['alternate'];
  assert.ok(liesSim(bad).some((m) => m.includes('called alternate')), liesSim(bad).join('; '));
  const b = B.build(makeR(seeded(2)), 'B-AA', {}), bid = b.canon[1];
  assert.equal(parallelKind(b.figure, b.facts[bid], b.facts.par), 'alternate');
  const bad2 = structuredClone(b); bad2.just[bid][0].reasons = ['corresponding'];
  assert.ok(liesSim(bad2).some((m) => m.includes('called corresponding')));
  // a consequence's direct path is checked too
  const c = structuredClone(p), cons = c.consequences.find((x) => x[0] === 'a' && c.just[x].length > 1);
  if (cons) { c.just[cons][1].reasons = ['alternate']; assert.ok(liesSim(c).length > 0); }
});
test('liesSim: off-scale or broken numbers, a labelled asked side, a 2:1 crossed ratio, a non-parallel "parallel" all lie', () => {
  const p = P.build(makeR(seeded(3)), 'P-CC', { ask: true });
  const s = Object.keys(p.figure.labels)[0];
  let bad = structuredClone(p); bad.figure.labels[s] += 0.5;
  assert.ok(liesSim(bad).some((m) => m.includes('not to scale')));
  bad = structuredClone(p); bad.figure.labels[s] = Math.round(bad.figure.labels[s] * 10 + 1) / 10;   // 1 decimal, not x.5
  assert.ok(liesSim(bad).length > 0);
  bad = structuredClone(p); const [s1, s2] = Object.keys(p.figure.labels); bad.figure.labels[s2] = bad.figure.labels[s1];
  assert.ok(liesSim(bad).length > 0);
  bad = structuredClone(p); bad.figure.labels[p.ask] = p.facts.val.v;
  assert.ok(liesSim(bad).some((m) => m.includes('asked side')));
  bad = structuredClone(p); bad.ratio = { p: 7, q: 2 };
  assert.ok(liesSim(bad).length > 0);
  const n = N.build(makeR(seeded(4)), 'N-CG', {});
  bad = structuredClone(n); bad.ratio = { p: 2, q: 1 };
  assert.ok(liesSim(bad).length > 0);
  bad = structuredClone(p); const pt = Object.keys(bad.figure.points)[1]; bad.figure.points[pt] = [bad.figure.points[pt][0] + 0.07, bad.figure.points[pt][1]];
  assert.ok(liesSim(bad).length > 0);
});
test('number labels: each beside its own side, clear of lines and letters (rendered layout)', () => {
  const R = makeR(seeded(12));
  for (const f of FAMS) for (const v of Object.keys(f.variants)) for (let i = 0; i < 30; i++) {
    const b = f.build(R, v, { ask: true }), items = numberItems(b), L = layout(b.figure), nl = numberLabels(L, items);
    assert.deepEqual(nl.errors, []); assert.equal(nl.labels.length, items.length);
    assert.equal(items.filter((x) => x.text === '?').length, 1);
  }
});
test('texts: the family intros exist and are drafts', () => {
  for (const k of ['tx.P', 'tx.H']) { assert.ok(T[k], k); assert.ok(NEW_DRAFTS.includes(k), k); }
  assert.equal(T['gv.math'], '{s}');
});
