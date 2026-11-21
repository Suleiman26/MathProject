// Tests for ratio-percent fixes board #92. Run: node --test src/topics/ratio-percent/flip.test.mjs
// 1) After "הפוך את השברים" the student goes on with the inverse operation; cross-multiplying is
//    not offered any more. 2) The half-coloured pictures by the question are gone (chapter 2, both parts).
// Loads Sulaiman's Topic.jsx code (between BEGIN/END ORIGINAL) with Next's own SWC, like ratio.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = fileURLToPath(new URL('.', import.meta.url));
const src = readFileSync(here + 'Topic.jsx', 'utf8');
const mid = src.split('// ===== BEGIN ORIGINAL =====')[1].split('// ===== END ORIGINAL =====')[0];
const names = ['genProportion', 'genPctCalc', 'pqCheckProportion', 'pqFlip', 'pqXDown', 'pqCross', 'pqAsFracs',
  'pqDoOperate', 'pqDoSimplify', 'pqCanSimp', 'pqCheckSolved', 'PqStart', 'PqTermPill'];
const swc = require('next/dist/build/swc/index.js');
await swc.loadBindings();
const { code } = await swc.transform(mid + `\n;module.exports={${names.join(',')}};`,
  { jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } } }, module: { type: 'commonjs' } });
const React = require('react');
const { renderToStaticMarkup: html } = require('react-dom/server');
const mod = { exports: {} };
new Function('React', 'ReactDOM', 'module', 'exports', 'require', code)(React, {}, mod, mod.exports, require);
const T = mod.exports;
const N = 3000;

// all orders of three numbers and one x in the boxes [tl, bl, tr, br] that the site accepts
function acceptedForms(known, ans) {
  const items = [...known.map(String), 'x'], out = [], seen = new Set();
  const rec = (left, acc) => {
    if (!left.length) { const k = acc.join('|'); if (!seen.has(k)) { seen.add(k); out.push(acc); } return; }
    left.forEach((v, i) => rec([...left.slice(0, i), ...left.slice(i + 1)], [...acc, v]));
  };
  rec(items, []);
  return out.map(p => T.pqCheckProportion(p, known, ans)).filter(r => r.ok).map(r => r.slots);
}
const xTerm = eq => [...eq.left, ...eq.right].find(t => t.type === 'x');
// the student's inverse operation: multiply both sides by x's denominator, then divide by what is left
function solveInverse(eq) {
  const x = xTerm(eq);
  if (x.den !== 1) eq = T.pqDoOperate(eq, '×', x.den, false);
  const x2 = xTerm(eq);
  if (x2.num !== 1 || x2.den !== 1) eq = T.pqDoOperate(eq, '÷', x2.num, false);
  return { eq, ans: T.pqCheckSolved(eq) };
}
// random legal moves: whatever the student does, a "solved" screen can only ever show the true x
function randomMoves(eq, ans, rnd) {
  for (let m = 0; m < 6; m++) {
    const op = ['+', '−', '×', '÷'][Math.floor(rnd() * 4)];
    const k = 1 + Math.floor(rnd() * 12);
    const isX = (op === '+' || op === '−') && rnd() < 0.3;
    eq = T.pqDoOperate(eq, op, k, isX);
    if (T.pqCanSimp(eq.left) || T.pqCanSimp(eq.right))
      eq = { left: T.pqCanSimp(eq.left) ? T.pqDoSimplify(eq.left) : eq.left, right: T.pqCanSimp(eq.right) ? T.pqDoSimplify(eq.right) : eq.right };
    const s = T.pqCheckSolved(eq);
    if (s !== null) assert.equal(s, ans, 'a wrong answer can never show as solved');
  }
}
let seed = 92; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

function checkFlipPath(known, ans) {
  let flips = 0;
  for (const slots of acceptedForms(known, ans)) {
    if (!T.pqXDown(slots)) {
      // x already on top: no flip button, cross-multiplying works as before (path unchanged)
      const c = T.pqCross(slots), x = xTerm(c);
      assert.equal(T.pqCheckSolved(T.pqDoOperate(c, '÷', x.num, false)), ans, 'cross path ' + slots);
      continue;
    }
    flips++;
    const f = T.pqFlip(slots);
    assert.ok(!T.pqXDown(f), 'after flipping x is in a numerator');
    const eq = T.pqAsFracs(f);
    // each fraction is ONE term, kept as written (not cross-multiplied, not reduced)
    assert.equal(eq.left.length, 1); assert.equal(eq.right.length, 1);
    const sides = [[eq.left[0], f[0], f[1]], [eq.right[0], f[2], f[3]]];
    for (const [t, n, d] of sides) {
      if (n === 'x') { assert.equal(t.type, 'x'); assert.equal(t.num, 1); assert.equal(t.den, d); }
      else { assert.equal(t.type, 'const'); assert.equal(t.num, n); assert.equal(t.den, d); }
    }
    // not already "solved" before the student does anything
    assert.equal(T.pqCheckSolved(eq), null);
    // the inverse operation (× x's denominator) gives the right answer
    const r = solveInverse(eq);
    assert.equal(r.ans, ans, 'inverse operation ' + f.join('|'));
    // and no sequence of moves ever shows a wrong answer as solved
    randomMoves(eq, ans, rnd);
  }
  return flips;
}

test('#92 proportion (2א): flip → inverse operation solves every exercise, never a wrong answer', () => {
  let flips = 0;
  for (let i = 0; i < N; i++) {
    const ex = T.genProportion();
    flips += checkFlipPath([ex.a, ex.b, ex.c], ex.d);
  }
  assert.ok(flips >= N * 2, 'flip path exercised');
});

test('#92 percent (2ב): flip → inverse operation solves every exercise, never a wrong answer', () => {
  let flips = 0;
  for (let i = 0; i < N; i++) {
    const ex = T.genPctCalc();
    const known = ex.type === 0 ? [ex.whole, ex.pct, 100] : ex.type === 1 ? [ex.part, ex.whole, 100] : [ex.part, ex.pct, 100];
    flips += checkFlipPath(known, ex.ans);
  }
  assert.ok(flips >= N * 2, 'flip path exercised');
});

test('#92 hand example: 3/12 = 5/x → flip 12/3 = x/5 → × 5 → x = 20', () => {
  const f = T.pqFlip([3, 12, 5, 'x']);
  assert.deepEqual(f, [12, 3, 'x', 5]);
  let eq = T.pqAsFracs(f);
  eq = T.pqDoOperate(eq, '×', 5, false);
  assert.equal(T.pqCheckSolved(eq), 20);
  // x/5 is shown as a fraction with x on top
  const pill = html(React.createElement(T.PqTermPill, { term: T.pqAsFracs(f).right[0], index: 0 }));
  assert.match(pill, /frac-num"><span class="tv-x"[^>]*>x<\/span><\/span><span class="frac-den">5</);
  const c = html(React.createElement(T.PqTermPill, { term: T.pqAsFracs(f).left[0], index: 0 }));
  assert.match(c, /frac-num">12<\/span><span class="frac-den">3</, '12/3 kept as written');
});

// the two exercise screens (Ch2 = 2א, Ch4 = 2ב)
const body = name => { const i = mid.indexOf(`function ${name}(){`); return mid.slice(i, mid.indexOf('\nfunction ', i + 10)); };

test('#92 no cross-multiplication after a flip (both screens)', () => {
  for (const name of ['Ch2', 'Ch4']) {
    const b = body(name);
    // the flip button goes straight into solving with the fractions as they are
    const flip = b.match(/const doFlip=\(\)=>\{([\s\S]*?)\};/);
    assert.ok(flip, name + ' has doFlip');
    assert.match(flip[1], /setCur\(pqAsFracs\(pqFlip\(eq\)\)\)/);
    assert.match(flip[1], /setCrossed\(true\)/);
    assert.doesNotMatch(flip[1], /pqCross\(/, name + ': flipping never cross-multiplies');
    assert.match(b, /<PqStart slots=\{eqNow\} onFlip=\{doFlip\} onCross=\{doCrossMultiply\}\/>/);
    // the cross-multiply button lives only inside PqStart, which is shown only before solving starts
    assert.match(b, /\{!crossed\?<PqStart/);
    assert.doesNotMatch(b, /הכפלה בהצלבה<\/button>/, name + ': no cross button in the solving part');
  }
  // before choosing (x in a denominator): both buttons are offered
  const start = html(React.createElement(T.PqStart, { slots: [3, 12, 5, 'x'], onFlip() {}, onCross() {} }));
  assert.ok(start.includes('הפוך את השברים') && start.includes('בצע הכפלה בהצלבה'));
  // x already on top: only cross-multiplying (unchanged)
  const top = html(React.createElement(T.PqStart, { slots: ['x', 5, 12, 3], onFlip() {}, onCross() {} }));
  assert.ok(!top.includes('הפוך את השברים') && top.includes('בצע הכפלה בהצלבה'));
});

test('#92 the half-coloured pictures by the question are gone (2א and 2ב)', () => {
  for (const name of ['Ch2', 'Ch4']) {
    const b = body(name);
    assert.doesNotMatch(b, /vis-wrap|<BarVis|<GlassVis/, name);
    assert.match(b, /className="q-text"/, name + ' still has the question');
  }
});
