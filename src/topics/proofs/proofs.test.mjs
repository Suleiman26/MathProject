/* node --test src/topics/proofs/proofs.test.mjs           (RUNS=300 for a quick pass)
   The generator sweep (spec §6.6): for every type, level and variant, thousands of seeded problems —
   honest drawings (tests 1–5), the canonical and a shuffled valid proof pass, each wrong tile is
   rejected with its intended kind (6), enough variety (7), and the database texts are stable (8). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { TYPES, TABS, tabOf, typeById } from './types/index.js';
import { lies } from './families/kit.js';
import { present, classify, checkReason, isDone, canonRows, required } from './core.js';
import { start, act, restore, snapshot } from './session.js';

const RUNS = Number(process.env.RUNS || 3000);
/* a random order of the required facts in which each fact comes after the needs of one of its justifications */
function validShuffle(p, R) {
  const req = [...required(p)], done = [];
  while (!isDone(p, done)) {
    const ready = R.shuffle(req.filter((f) => !done.includes(f) && (p.just[f] || []).some((j) => j.needs.every((n) => done.includes(n)))));
    done.push(ready[0]);
  }
  return done;
}

test('section 6.1: button and tab texts are the database keys', () => {
  assert.equal(typeById('prove-congruence').button, '3. הוכחת חפיפה'); assert.deepEqual(TABS, ['חימום', 'רמה 1', 'רמה 2', 'רמה 3']);
  assert.deepEqual([tabOf(0), tabOf(1), tabOf(3), tabOf(4)], ['חימום', 'רמה 1', 'רמה 3', 'רמה 3']);
  for (const t of TYPES) assert.equal(t.button, `${t.n}. ${t.name}`);
  assert.equal(typeById('nope'), null);
});
test('type 3 has the 14 templates of §6.4', () => {
  const t = typeById('prove-congruence');
  assert.equal(t.templates.length, 14); assert.deepEqual(t.warm, ['W1', 'W2', 'W3', 'W4']);
  assert.ok(t.templates.every((x) => x.id === `3-${x.variant}`));
});
for (const type of TYPES) for (const level of [1, 2, 3]) for (const variant of ['A', 'B']) {
  test(`${type.id} L${level}-${variant}: ${RUNS} problems`, () => {
    const R = makeR(seeded(12345)); const seen = {}; let avoid = { recent: [], last: null };
    for (let i = 0; i < RUNS; i++) {
      const p = type.make(R, level, variant, avoid, { counted: i % 4, words: ['midpoint', 'bisector', 'median', 'altitude'] });
      assert.deepEqual(lies(p), [], p.id);                                             // §6.6 tests 1–5
      const view = present(p, level, variant, { counted: i % 4, R });
      // 6: the canonical proof passes; a shuffled valid order passes; each wrong tile is rejected with the intended kind
      for (const order of [canonRows(p).map((r) => r.fact), validShuffle(p, R)]) {
        const done = [];
        for (const f of order) { assert.equal(classify(p, done, p.facts[f]).c, 'ok', `${p.id} ${f}`); assert.equal(checkReason(p, done, f, p.just[f][0].reasons[0]).ok, true); done.push(f); }
        assert.equal(isDone(p, done), true);
      }
      for (const t of p.tiles.wrong) { const c = classify(p, p.given, t.st); assert.ok(c.c === 'early' || c.c === 'false', `${p.id} wrong tile is ${c.c}`); assert.equal(c.kind, { consequence: 'looks-equal', goal: c.kind, 'letter-swap': 'false-statement', word: 'wrong-word', position: 'wrong-matching', 'next-letter': 'wrong-matching', 'kind-mix': 'wrong-matching' }[t.why]); }
      assert.ok(p.tiles.wrong.length <= (type.n >= 3 ? 2 : 4));
      if (variant === 'A') assert.equal(view.tiles.filter((t) => !t.fact).length <= (type.n === 1 ? 2 : type.n === 2 ? 1 : 0), true);
      if (variant === 'B' && type.n >= 3) assert.notEqual(p.family, '2');             // family 2 is for entry proofs only
      if (variant === 'A') assert.ok(p.givenText.every((g) => g.form === 'eq') || type.n === 1);
      assert.ok(!(avoid.last && avoid.last.family === p.family && avoid.last.theorem === p.theorem && p.theorem), 'same family + theorem twice in a row');
      (seen[p.template] ||= new Set()).add(JSON.stringify([Object.keys(p.figure.points), Object.values(p.figure.points).map((q) => q.map(Math.round))]));
      avoid = { recent: [p.template, ...avoid.recent].slice(0, 6), last: { family: p.family, theorem: p.theorem } };
    }
    for (const [tpl, set] of Object.entries(seen)) assert.ok(set.size >= 12, `${tpl}: only ${set.size} different instances`);   // 7
  });
}
test('variety: in 200 draws of type 3 no family maps to a single theorem', () => {
  const R = makeR(seeded(5)), by = {}; let avoid = { recent: [], last: null };
  for (let i = 0; i < 200; i++) { const p = typeById('prove-congruence').make(R, 2, 'B', avoid, {}); (by[p.family] ||= new Set()).add(p.theorem); avoid = { recent: [p.template, ...avoid.recent].slice(0, 6), last: { family: p.family, theorem: p.theorem } }; }
  for (const [f, s] of Object.entries(by)) assert.ok(s.size >= 2, f);
});
test('"second chance": ctx.want = vertical gives the X figure', () => {
  const R = makeR(seeded(8)); for (let i = 0; i < 50; i++) assert.equal(typeById('prove-congruence').make(R, 2, 'B', { recent: [], last: null }, { want: 'vertical' }).family, 'X');
});
test('the last 6 templates are avoided while others are left; word-givens only in B and only when met', () => {
  const t = typeById('prove-congruence'), R = makeR(seeded(11));
  const recent = ['3-X-SAS', '3-X-ASA', '3-K-SSS', '3-K-SAS', '3-K-ASA', '3-Z-SSS'];
  for (let i = 0; i < 100; i++) assert.ok(!recent.includes(t.make(R, 2, 'B', { recent, last: null }, {}).template));
  for (let i = 0; i < 100; i++) assert.ok(t.make(R, 3, 'B', { recent: [], last: null }, { words: [] }).givenText.every((g) => g.form === 'eq'));
  let words = 0; for (let i = 0; i < 200; i++) words += t.make(R, 3, 'B', { recent: [], last: null }, { words: ['midpoint', 'bisector', 'median', 'altitude'] }).givenText.some((g) => g.form === 'words');
  assert.ok(words > 10, `word-givens seen ${words} times`);
});
test('remake: the same template + seed + words gives the same problem (for an open proof after a refresh)', () => {
  const t = typeById('prove-congruence'), R = makeR(seeded(21));
  for (let i = 0; i < 30; i++) {
    const p = t.make(R, 2, 'B', { recent: [], last: null }, { words: ['midpoint', 'bisector'] }), q = t.remake(p);
    assert.equal(q.id, p.id); assert.deepEqual(q.figure, p.figure); assert.deepEqual(q.facts, p.facts); assert.deepEqual(q.tiles, p.tiles);
  }
  const p = t.make(R, 2, 'B', { recent: [], last: null }, {});
  let s = start(p, present(p, 2, 'B', { R })); s = act(s, { t: 'statement', st: p.facts[p.canon[0]] }).s;
  const back = restore(snapshot(s), (meta) => t.remake(meta));
  assert.ok(back); assert.equal(back.pending.fact, p.canon[0]);
});
test('a whole type-3 proof plays through the session at every level', () => {
  const t = typeById('prove-congruence'), R = makeR(seeded(31));
  for (const [level, variant] of [[1, 'A'], [1, 'B'], [2, 'A'], [2, 'B'], [3, 'A'], [3, 'B']]) for (let i = 0; i < 20; i++) {
    const p = t.make(R, level, variant, { recent: [], last: null }, { counted: 2 }), view = present(p, level, variant, { counted: 2, R });
    let s = start(p, view);
    for (let guard = 0; guard < 40 && !s.ended; guard++) {
      let a;
      if (s.cur && s.cur.kind === 'reason') a = { t: 'reason', id: p.just[s.cur.fact][0].reasons[0] };
      else if (s.cur) { const f = s.cur.fact || s.cur.expect; a = { t: 'statement', st: p.facts[f] }; }
      else if (view.mode === 'walk' && s.stepI < view.steps.length) a = { t: 'next' };
      else a = { t: 'qed' };
      const o = act(s, a); assert.notEqual(o.s, s, `${p.id} L${level}${variant} stuck on ${JSON.stringify(a)}`); s = o.s;
    }
    assert.equal(s.ended, true, `${p.id} L${level}${variant} did not end`);
    assert.ok(s.decisions.every((d) => d.state === 'solo'));
  }
});
