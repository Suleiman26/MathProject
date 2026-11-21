// Tests for ratio-percent (fixes board #87, #88 incl. round 2: 25 contexts + shuffle bag). Run: node --test src/topics/ratio-percent/ratio.test.mjs
// Loads Sulaiman's Topic.jsx code (between BEGIN/END ORIGINAL) with Next's own SWC, no extra packages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = fileURLToPath(new URL('.', import.meta.url));
const src = readFileSync(here + 'Topic.jsx', 'utf8');
const mid = src.split('// ===== BEGIN ORIGINAL =====')[1].split('// ===== END ORIGINAL =====')[0];
const names = ['genProportion', 'genPctCalc', 'genRatio', 'pqCheckProportion', 'pqFlip', 'pqXDown', 'pqCross',
  'pqDoOperate', 'pqDoSimplify', 'pqCanSimp', 'pqCheckSolved', 'RATIO_CTXS', 'RatioVis', 'genRatioAmount', 'RatioIcon', 'PackVis', 'gcd',
  'makeRatioSeq', 'RP_ICON'];
const swc = require('next/dist/build/swc/index.js');
await swc.loadBindings();
const have = names.filter(n => new RegExp(`(function|const|let)\\s+${n}\\b`).test(mid));
const { code } = await swc.transform(mid + `\n;module.exports={${have.join(',')}};`,
  { jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } } }, module: { type: 'commonjs' } });
const React = require('react');
const mod = { exports: {} };
new Function('React', 'ReactDOM', 'module', 'exports', 'require', code)(React, {}, mod, mod.exports, require);
const T = mod.exports;
const N = 3000;

/* ---------- #87: the proportion in any order ---------- */
// all 24 ways to put three numbers and one x into the four boxes [tl, bl, tr, br]
function placements(nums) {
  const items = [...nums.map(String), 'x'], out = [];
  const rec = (left, acc) => {
    if (!left.length) { out.push(acc); return; }
    left.forEach((v, i) => rec([...left.slice(0, i), ...left.slice(i + 1)], [...acc, v]));
  };
  rec(items, []);
  return out;
}
// exact fraction truth: tl/bl = tr/br with x = ans  <=>  tl·br = bl·tr (all positive)
const isTrue = (s, ans) => { const v = s.map(t => (t === 'x' ? ans : Number(t))); return v[0] * v[3] === v[1] * v[2]; };
// solve the cross-multiplied equation with the operation box like a student: divide by the x coefficient
function solveLikeStudent(slots) {
  let eq = T.pqCross(slots);
  const xt = [...eq.left, ...eq.right].find(t => t.type === 'x');
  eq = T.pqDoOperate(eq, '÷', xt.num, false);
  return T.pqCheckSolved(eq);
}
const key = s => s.join('|');
function checkExercise(known, ans) {
  const all = placements(known);
  const seen = new Set(), accepted = new Set();
  for (const p of all) {
    if (seen.has(key(p))) continue; seen.add(key(p));
    const r = T.pqCheckProportion(p, known, ans);
    assert.equal(r.ok, isTrue(p, ans), `accept must equal truth for ${key(p)} (known ${known}, x=${ans})`);
    if (!r.ok) { assert.equal(r.why, 'order'); continue; }
    accepted.add(key(p));
    // straight cross-multiplication gives the right answer
    assert.equal(solveLikeStudent(r.slots), ans, `cross ${key(p)}`);
    // flipping (offered only when x is in a denominator) keeps it true and puts x on top
    const f = T.pqFlip(r.slots);
    assert.ok(isTrue(f, ans));
    if (T.pqXDown(r.slots)) assert.ok(!T.pqXDown(f));
    assert.equal(solveLikeStudent(f), ans, `flip ${key(p)}`);
  }
  // with three different numbers exactly 8 orders are correct (x in each box, 2 orders each)
  if (new Set(known).size === 3) assert.equal(accepted.size, 8, `8 correct forms for ${known}`);
  return accepted.size;
}
function checkWrongInputs(known, ans) {
  const [a, b, c] = known.map(String);
  const bad = [
    [[a, b, c, ''], 'fill'], [[a, b, c, a], 'nox'], [['x', b, c, 'x'], 'manyx'], [['x', 'x', 'x', 'x'], 'manyx'],
    [[a, b, String(Number(c) + 1), 'x'], 'nums'], [[a, b, 'x', '1'], 'nums'], [[a + '.5', b, c, 'x'], 'fill'],
    [['-' + a, b, c, 'x'], 'fill'], [[String(ans), b, c, 'x'], new Set(known).has(ans) ? null : 'nums'],
  ];
  for (const [v, why] of bad) {
    const r = T.pqCheckProportion(v, known, ans);
    if (why === null) continue;
    assert.equal(r.ok, false, `must reject ${v}`); assert.equal(r.why, why, `${v}`);
  }
  // spaces and a capital X are fine
  const good = T.pqCheckProportion([` ${a} `, b, c, 'X'], known, ans);
  if (isTrue([a, b, c, 'x'], ans)) assert.ok(good.ok);
}

test('#87 proportion (chapter 2): every correct order accepted, every wrong one rejected', () => {
  let forms = 0;
  for (let i = 0; i < N; i++) {
    const ex = T.genProportion();
    assert.equal(ex.d * ex.a, ex.b * ex.c, 'generator answer');
    const known = [ex.a, ex.b, ex.c];
    assert.ok(T.pqCheckProportion([ex.a, ex.b, ex.c, 'x'], known, ex.d).ok, 'the old form still works');
    assert.ok(T.pqCheckProportion([ex.a, ex.c, ex.b, 'x'], known, ex.d).ok, 'the old second form still works');
    forms += checkExercise(known, ex.d);
    checkWrongInputs(known, ex.d);
  }
  assert.ok(forms >= N * 4);
});

test('#87 percent calculations (chapter 4): every correct order accepted, every wrong one rejected', () => {
  for (let i = 0; i < N; i++) {
    const ex = T.genPctCalc();
    assert.equal(ex.part * 100, ex.whole * ex.pct, 'generator answer');
    const known = ex.type === 0 ? [ex.whole, ex.pct, 100] : ex.type === 1 ? [ex.part, ex.whole, 100] : [ex.part, ex.pct, 100];
    const ans = ex.ans;
    // the old single form
    const old = [ex.type === 0 ? 'x' : ex.part, ex.type === 2 ? 'x' : ex.whole, ex.type === 1 ? 'x' : ex.pct, 100];
    assert.ok(T.pqCheckProportion(old, known, ans).ok, 'old form');
    checkExercise(known, ans);
    checkWrongInputs(known, ans);
  }
});

test('#87 a hand-made example', () => {
  // 3 notebooks cost 12, 5 cost x = 20
  const k = [3, 12, 5];
  for (const s of [['3', '12', '5', 'x'], ['3', '5', '12', 'x'], ['12', '3', 'x', '5'], ['x', '5', '12', '3'], ['5', 'x', '3', '12'], ['x', '12', '5', '3']])
    assert.ok(T.pqCheckProportion(s, k, 20).ok, s.join(' '));
  for (const s of [['3', 'x', '5', '12'], ['x', '3', '12', '5'], ['3', '12', 'x', '5'], ['12', '5', '3', 'x']])
    assert.equal(T.pqCheckProportion(s, k, 20).ok, false, s.join(' '));
});

/* ---------- #88: 25 ratio contexts with matching pictures, a shuffle bag ---------- */
const { renderToStaticMarkup: html } = require('react-dom/server');
const FRUIT = /תות|מנגו|תפוח|תפוז|פירות/;
const count = (s, re) => (s.match(re) || []).length;
const NC = 25;
const two = (x, y) => Math.min(x, y) + ':' + Math.max(x, y);

test('#88 twenty-five contexts, the two liked ones kept, no fruit, each its own picture and sentence', () => {
  assert.equal(T.RATIO_CTXS.length, NC);
  const pairs = T.RATIO_CTXS.map(c => c.label1 + '/' + c.label2);
  assert.equal(new Set(pairs).size, NC, 'all different');
  assert.ok(pairs.includes('שוקולד/וניל') && pairs.includes('בנים/בנות'));
  const labels = T.RATIO_CTXS.flatMap(c => [c.label1, c.label2]);
  assert.equal(new Set(labels).size, labels.length, 'no label used twice');
  for (const c of T.RATIO_CTXS) {
    assert.ok(!FRUIT.test(c.label1 + c.label2), 'no fruit: ' + c.label1);
    if (c.type === 'icons') { assert.ok(c.icon && T.RP_ICON[c.icon] && typeof c.q === 'function', c.label1); }
  }
  const icons = T.RATIO_CTXS.filter(c => c.type === 'icons').map(c => c.icon);
  assert.equal(new Set(icons).size, icons.length, 'each context has its own picture');
  const qs = T.RATIO_CTXS.filter(c => c.q).map(c => html(React.createElement('p', null, c.q('T', 'A', 'B'))));
  assert.equal(new Set(qs).size, qs.length, 'each context has its own sentence');
});

test('#88 shuffle bag: every round of 25 shows all 25 contexts, numbers vary', () => {
  for (let run = 0; run < 200; run++) {
    const seq = T.makeRatioSeq();
    assert.equal(seq(0), seq(0), 'the same exercise every time it is asked for');
    const rounds = 6;
    for (let r = 0; r < rounds; r++) {
      const bag = Array.from({ length: NC }, (_, i) => seq(r * NC + i));
      assert.equal(new Set(bag.map(e => e.ctx)).size, NC, `round ${r}: all 25 contexts, none twice`);
      assert.equal(new Set(bag.map(e => two(e.a, e.b))).size, NC, `round ${r}: no number pair twice`);
      const per = {};
      for (const e of bag) per[two(e.simA, e.simB)] = (per[two(e.simA, e.simB)] || 0) + 1;
      assert.ok(Math.max(...Object.values(per)) <= 3, `round ${r}: one reduced ratio at most 3 times ${JSON.stringify(per)}`);
    }
    for (let i = 1; i < rounds * NC; i++) {
      const p = seq(i - 1), e = seq(i);
      assert.notEqual(e.ctx, p.ctx, 'never the same context twice in a row (also across rounds)');
      assert.ok(![p.a, p.b].includes(e.a) && ![p.a, p.b].includes(e.b), `numbers differ from the one before: ${p.a}:${p.b} → ${e.a}:${e.b}`);
      assert.notEqual(e.total, p.total, 'total differs from the one before');
      assert.notEqual(two(e.simA, e.simB), two(p.simA, p.simB), 'reduced ratio differs from the one before');
    }
  }
});

test('#88 every context: right numbers, picture shows exactly a and b items, sentence says them', () => {
  const seen = new Map();
  const seq = T.makeRatioSeq();
  for (let i = 0; i < N * 2; i++) {
    const ex = seq(i);
    seen.set(ex.ctx, (seen.get(ex.ctx) || 0) + 1);
    assert.equal(ex.a + ex.b, ex.total);
    assert.equal(T.gcd(ex.simA, ex.simB), 1);
    assert.ok(ex.simA >= 1 && ex.simB >= 1 && ex.simA !== ex.simB);
    assert.equal(ex.a * ex.simB, ex.b * ex.simA, 'reduced ratio equals the ratio');
    assert.ok(T.gcd(ex.a, ex.b) >= 2, 'there is something to reduce');
    assert.equal(ex.a / ex.simA, T.gcd(ex.a, ex.b), 'fully reduced');
    assert.ok(ex.a >= 2 && ex.b >= 2 && ex.total <= 40);
    if (ex.ctx.type !== 'icons') continue;
    const svg = html(React.createElement(T.RatioVis, { ctx: ex.ctx, total: ex.total, filled: ex.a }));
    assert.equal(count(svg, /data-k="1"/g), ex.a, ex.ctx.label1);
    assert.equal(count(svg, /data-k="2"/g), ex.b, ex.ctx.label2);
    assert.ok(!/NaN|undefined/.test(svg), 'clean svg ' + ex.ctx.icon);
    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    assert.ok(vb && +vb[1] > 0 && +vb[1] <= 420 && +vb[2] > 0 && +vb[2] <= 420, 'size ' + ex.ctx.icon + ' ' + (vb && vb[0]));
    const q = html(React.createElement('p', null, ex.ctx.q(React.createElement('b', null, ex.total),
      React.createElement('b', null, ex.a + ' ' + ex.ctx.label1), React.createElement('b', null, ex.b + ' ' + ex.ctx.label2))));
    assert.ok(q.includes('<b>' + ex.total + '</b>') && q.includes(ex.a + ' ' + ex.ctx.label1) && q.includes(ex.b + ' ' + ex.ctx.label2), q);
  }
  assert.equal(seen.size, NC, 'all 25 contexts appear');
  for (const [c, k] of seen) assert.ok(k === N * 2 / NC, 'every context equally often: ' + c.label1 + ' ' + k);
});

test('#88 1ב (ratio to amounts): no fruit, numbers right, pack pictures right', () => {
  const ctxs = new Set();
  for (let i = 0; i < N; i++) {
    const ex = T.genRatioAmount(['grid', 'groups', 'table'][i % 3]);
    ctxs.add(ex.ctx.l1);
    assert.ok(!FRUIT.test(ex.ctx.l1 + ex.ctx.l2 + ex.ctx.unit), ex.ctx.l1);
    assert.equal(ex.A + ex.B, ex.total);
    assert.equal(ex.A * ex.b, ex.B * ex.a);
    const packs = html(React.createElement(T.PackVis, { a: ex.a, b: ex.b, c1: ex.ctx.c1, c2: ex.ctx.c2, n: ex.k, icon: ex.ctx.icon, i2: ex.ctx.i2 }));
    const items = ex.ctx.icon ? count(packs, /class="rp-mi"/g) : count(packs, /<i /g);
    assert.equal(items, ex.total, 'pack items ' + ex.ctx.l1);
  }
  assert.ok(ctxs.size >= 8);
});
