/* node --test src/topics/new/new.test.mjs
   The "חדש" module (board #84): every chapter keeps the contract, and every generator is
   run thousands of times: the question must be well-formed, its own independent verify()
   must agree with the answer, and the answer checker must accept exactly the right answers. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import CHAPTERS from './chapters/index.js';
import { seeded, makeR, validate, validateChapter, boxesOf, checkAll, checkBox, parseNum, num, fracStr, poly, sum, deck } from './core.js';

const RUNS = Number(process.env.RUNS || 3000);

test('helpers', () => {
  assert.equal(num(-3), '-3'); assert.equal(num(0.1 + 0.2), '0.3');
  assert.equal(fracStr(6, 8), '{3|4}'); assert.equal(fracStr(-4, 2), '-2'); assert.equal(fracStr(1, -2), '-{1|2}');
  assert.equal(poly([1, -5, 6]), 'x^2 - 5x + 6'); assert.equal(poly([-1, 0, 4]), '-x^2 + 4'); assert.equal(sum([[0, 'x'], [0, '']]), '0');
  assert.equal(parseNum('−3'), -3); assert.equal(parseNum('2,5'), 2.5); assert.equal(parseNum('2x'), null); assert.equal(parseNum(''), null);
  assert.equal(checkBox({ ans: 5 }, '5').ok, true); assert.equal(checkBox({ ans: 5 }, '6').ok, false);
  assert.equal(checkBox({ ans: 3.14, tol: 0.01 }, '3.142').ok, true);
  assert.equal(checkBox({ frac: [1, 2] }, ['2', '4']).ok, true); assert.equal(checkBox({ frac: [1, 2] }, ['2', '3']).ok, false);
  assert.equal(checkBox({ frac: [1, 2], reduced: true }, ['2', '4']).format, true);
  assert.equal(checkBox({ frac: [1, 2] }, ['1', '0']).format, true);
  const q = { rows: [{ parts: [{ ans: 2 }, { ans: 3 }] }], swap: [[[0], [1]]] };
  assert.equal(checkAll(q, ['3', '2']).solved, true); assert.equal(checkAll(q, ['3', '3']).solved, false);
  const pts = { rows: [{ parts: [{ ans: 1 }, { ans: 2 }] }, { parts: [{ ans: 3 }, { ans: 4 }] }], swap: [[[0, 1], [2, 3]]] };
  assert.equal(checkAll(pts, ['3', '4', '1', '2']).solved, true); assert.equal(checkAll(pts, ['1', '4', '3', '2']).solved, false);
});

test('chapters: unique ids and names', () => {
  assert.ok(CHAPTERS.length > 0);
  assert.equal(new Set(CHAPTERS.map((c) => c.id)).size, CHAPTERS.length);
  assert.equal(new Set(CHAPTERS.map((c) => c.name)).size, CHAPTERS.length);
});

for (const ch of CHAPTERS) {
  test(`chapter ${ch.id}: contract`, () => { assert.deepEqual(validateChapter(ch), []); });
  for (const g of ch.gens) {
    test(`chapter ${ch.id} / ${g.id}: ${RUNS} questions`, () => {
      const R = makeR(seeded(12345));
      const seen = new Set();
      for (let i = 0; i < RUNS; i++) {
        const q = g.make(R);
        const errs = validate(q);
        assert.deepEqual(errs, [], `${JSON.stringify(q)}`);
        const v = g.verify(q);
        assert.equal(v, true, `verify: ${v}\n${JSON.stringify(q)}`);
        if (q.rows) {
          const boxes = boxesOf(q);
          const right = boxes.map((b) => ('frac' in b ? [String(b.frac[0]), String(b.frac[1])] : String(b.ans)));
          assert.equal(checkAll(q, right).solved, true, `the right answer is rejected: ${JSON.stringify(q)}`);
          const wrong = boxes.map((b) => ('frac' in b ? [String(b.frac[0] + b.frac[1]), String(b.frac[1])] : String(b.ans + 1 + (b.tol || 0) * 3)));
          assert.equal(checkAll(q, wrong).solved, false, `a wrong answer is accepted: ${JSON.stringify(q)}`);
        }
        seen.add(q.text + JSON.stringify(q.rows || q.choices) + JSON.stringify(q.fig || ''));
      }
      assert.ok(seen.size >= Math.min(12, RUNS / 10), `only ${seen.size} different questions`);
    });
  }
  test(`chapter ${ch.id}: deck gives every generator`, () => {
    const next = deck(ch, seeded(7)); const got = new Set();
    for (let i = 0; i < ch.gens.length * 3; i++) got.add(next().gen);
    assert.equal(got.size, ch.gens.length);
  });
}

test('home list of chapters (src/home/chapters.js, chapterInfo.js) matches the chapter buttons', async () => {
  const { CHAPTERS: HOME } = await import('../../home/chapters.js');
  const { CHAPTER_INFO } = await import('../../home/chapterInfo.js');
  const names = CHAPTERS.map((c, i) => `${i + 1}. ${c.name}`);
  assert.deepEqual(HOME.new, names);
  assert.deepEqual(Object.keys(CHAPTER_INFO.new), names);
});
