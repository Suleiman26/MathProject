// Tests for ratio-percent (fixes board #87, #88). Run: node --test src/topics/ratio-percent/ratio.test.mjs
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
  'pqDoOperate', 'pqDoSimplify', 'pqCanSimp', 'pqCheckSolved', 'RATIO_CTXS', 'RatioVis', 'genRatioAmount', 'RatioIcon'];
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
