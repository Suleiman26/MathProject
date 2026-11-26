// Board #93: the student's own equation / motion table on a word problem.
// node --test src/topics/new/work.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEquation, checkTable, checkTableRow, parseEquation } from './work.js';
import { wordsLinear } from './chapters/equations/word-problems.js';
import { deck } from './core.js';

// the equation the solution steps write: the last [[…]] with one "=" in steps[1]
function refEquation(q) {
  const m = [...q.steps[1].matchAll(/\[\[(.*?)\]\]/g)].map((x) => x[1]).filter((s) => (s.match(/=/g) || []).length === 1);
  return m[m.length - 1];
}

test('every story: its own equation is accepted, a changed one is not', () => {
  let n = 0;
  for (let seed = 0; seed < 40; seed++) {
    const next = deck(wordsLinear);
    for (let i = 0; i < 40; i++) {
      const q = next();
      assert.ok(q.work && Array.isArray(q.work.xs) && q.work.xs.length, `${q.gen}: work data`);
      const eq = refEquation(q);
      assert.ok(eq, `${q.gen}: reference equation in steps[1]: ${q.steps[1]}`);
      const ok = checkEquation(eq, q.work.xs);
      assert.equal(ok.ok, true, `${q.gen}: "${eq}" should pass (${ok.msg})`);
      const [L, R] = eq.split('=');
      const off = checkEquation(`${L}= ${R.trim()} + 1`, q.work.xs);
      assert.equal(off.ok, false, `${q.gen}: "${L}= ${R} + 1" should fail`);
      const ans = q.work.xs[0];
      assert.equal(checkEquation(`x = ${ans}`, q.work.xs).format, true, 'bare answer is not an equation of the story');
      n++;
    }
  }
  assert.ok(n >= 1000);
});

test('the other quantity a student may call x', () => {
  // ages: x = the older one: x + (x - d) = S
  assert.equal(checkEquation('x + x - 4 = 30', [13, 17]).ok, true);
  // consecutive numbers with x = the middle one
  assert.equal(checkEquation('x - 1 + x + x + 1 = 33', [10, 11, 12]).ok, true);
});

test('equation messages', () => {
  assert.equal(checkEquation('', [5]).format, true);
  assert.equal(checkEquation('3x + 5', [5]).format, true);            // no "="
  assert.equal(checkEquation('3x = 15 = 15', [5]).format, true);      // two "="
  assert.equal(checkEquation('3 + 2 = 5', [5]).format, true);         // no x
  assert.equal(checkEquation('3y = 15', [5]).format, true);           // other letter
  assert.equal(checkEquation('2(x + 1) = 2x + 2', [5]).ok, false);    // true for every x
  assert.equal(checkEquation('2(x + 1) = 2x + 2', [5]).format, undefined);
  assert.equal(checkEquation('0.8x = 120', [150]).ok, true);           // decimals
  assert.equal(checkEquation('80x/100 = 120', [150]).ok, true);        // fraction
  assert.equal(checkEquation('3x+5=20', [5]).ok, true);                // no spaces
  assert.equal(checkEquation('20 = 3x + 5', [5]).ok, true);            // sides swapped
  assert.equal(checkEquation('3·x + 5 = 20', [5]).ok, true);           // the keypad's dot
  assert.equal(checkEquation('3x − 5 = 10', [5]).ok, true);            // the minus sign
  assert.equal(parseEquation('3x + = 5').ok, false);
});

test('motion table', () => {
  assert.equal(checkTableRow(['80', 'x', '80x']).state, 'ok');
  assert.equal(checkTableRow(['x + 5', '3', '3(x + 5)']).state, 'ok');
  assert.equal(checkTableRow(['60', 'x + 1', '60x + 60']).state, 'ok');
  assert.equal(checkTableRow(['80', 'x', '80 + x']).state, 'bad');
  assert.equal(checkTableRow(['80', '', '']).state, 'part');
  assert.equal(checkTableRow(['', '', '']).state, 'empty');
  assert.equal(checkTableRow(['80', 'x', '80*']).state, 'format');
  const names = ['המכונית', 'המשאית'];
  assert.equal(checkTable([['80', 'x', '80x'], ['70', 'x', '70x']], names).ok, true);
  const bad = checkTable([['80', 'x', '80x'], ['70', 'x', '70']], names);
  assert.equal(bad.ok, false); assert.match(bad.msg, /המשאית/);
  assert.equal(checkTable([['', '', ''], ['', '', '']], names).format, true);
  const part = checkTable([['80', 'x', '80x'], ['70', '', '']], names);
  assert.equal(part.ok, false); assert.equal(part.format, true);
});

test('motion stories have the table, the others do not', () => {
  const next = deck(wordsLinear);
  for (let i = 0; i < 300; i++) {
    const q = next();
    if (q.gen === 'motion-story') assert.equal(q.work.table.names.length, 2, 'two rows');
    else assert.equal(q.work.table, null);
  }
});

// Board #93 (2026-11-25): solving the accepted equation line by line
import { rootOf, checkSolveStep } from './work.js';

test('every story: the accepted equation is solved step by step to x = its root', () => {
  let n = 0;
  for (let seed = 0; seed < 30; seed++) {
    const next = deck(wordsLinear);
    for (let i = 0; i < 30; i++) {
      const q = next();
      const eq = refEquation(q);
      const root = rootOf(eq);
      assert.ok(root != null, `${q.gen}: "${eq}" has a root`);
      assert.ok(q.work.xs.some((v) => Math.abs(v - root) < 1e-7), `${q.gen}: root ${root} is a story quantity`);
      const k = 3, c = Math.round(root * k * 1e6) / 1e6;
      const mid = checkSolveStep(`${k}x = ${c}`, root);
      assert.equal(mid.ok, true, `${q.gen}: ${k}x = ${c} (${mid.msg})`);
      assert.ok(!mid.done, 'a middle line does not end the solving');
      assert.equal(checkSolveStep(`${k}x = ${c} + 1`, root).ok, false, 'a wrong line is rejected');
      const end = checkSolveStep(`x = ${Math.round(root * 1e6) / 1e6}`, root);
      assert.equal(end.ok && end.done, true, `${q.gen}: x = root ends it`);
      const flip = checkSolveStep(`${Math.round(root * 1e6) / 1e6} = x`, root);
      assert.equal(flip.ok && flip.done, true, 'root = x also ends it');
      assert.equal(checkSolveStep(`x = ${root + 1}`, root).ok, false, 'a wrong final value is rejected');
      n++;
    }
  }
  assert.ok(n >= 900);
});

test('solving lines: formats and traps', () => {
  const root = rootOf('3x + 5 = 20');
  assert.equal(root, 5);
  assert.equal(checkSolveStep('3x = 15', root).ok, true);
  assert.equal(checkSolveStep('3x = 25', root).ok, false);
  assert.equal(checkSolveStep('15 = 15', root).format, true);       // x gone, numbers only
  assert.equal(checkSolveStep('x - x = 0', root).ok, false);        // identity
  assert.equal(checkSolveStep('x*x = 25', root).ok, false);         // not linear
  assert.equal(checkSolveStep('x = 15/3', root).done, undefined);   // still arithmetic to do
  assert.equal(checkSolveStep('x = 15/3', root).ok, true);
  assert.equal(checkSolveStep('x = 5', root).done, true);
  assert.equal(checkSolveStep('3x = ', root).format, true);
  assert.equal(rootOf('x*x = 4'), null);
  assert.equal(rootOf('x/4 + 2 = 5'), 12);
});
