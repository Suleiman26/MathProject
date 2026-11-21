/* node --test src/topics/proofs/proofs.test.mjs           (RUNS=300 for a quick pass)
   The generator sweep (spec §6.6): for every type, level and variant, thousands of seeded problems —
   honest drawings (tests 1–5), the canonical and a shuffled valid proof pass, each wrong tile is
   rejected with its intended kind (6), enough variety (7), and the database texts are stable (8). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { TYPES, TABS, tabOf, typeById } from './types/index.js';
import { lies } from './families/kit.js';
import { present, classify, checkReason, isDone, canonRows, required, decisionsOf, show, norm } from './core.js';
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
/* one whole proof through the session, the student always answering the canon way */
function playThrough(p, view) {
  let s = start(p, view);
  for (let guard = 0; guard < 60 && !s.ended; guard++) {
    let a;
    if (s.cur && s.cur.kind === 'reason') a = { t: 'reason', id: p.just[s.cur.fact][0].reasons[0] };
    else if (s.cur) { const f = s.cur.fact || s.cur.expect; a = { t: 'statement', st: p.facts[f] }; }
    else if (view.mode === 'walk' && s.stepI < view.steps.length) a = { t: 'next' };
    else a = { t: 'qed' };
    const o = act(s, a); assert.notEqual(o.s, s, `${p.id} L${p.level}${p.variant} stuck on ${JSON.stringify(a)}`); s = o.s;
  }
  return s;
}
for (const type of TYPES) test(`a whole ${type.id} proof plays through the session at every level`, () => {
  const R = makeR(seeded(31));
  for (const [level, variant] of [[1, 'A'], [1, 'B'], [2, 'A'], [2, 'B'], [3, 'A'], [3, 'B']]) for (let i = 0; i < 20; i++) {
    const p = type.make(R, level, variant, { recent: [], last: null }, { counted: 2 }), view = present(p, level, variant, { counted: 2, R });
    const s = playThrough(p, view);
    assert.equal(s.ended, true, `${p.id} L${level}${variant} did not end`);
    assert.ok(s.decisions.every((d) => d.state === 'solo'));
    assert.equal(s.decisions.length, decisionsOf(view), `${p.id} L${level}${variant}: decisions`);
  }
});

/* ── Task 16: type 4 ── */
test('type 4: 33 templates = 11 variants × 3 goals, exactly the goals of §6.5', () => {
  const t = typeById('then-conclusion'); assert.equal(t.templates.length, 33); assert.equal(t.button, '4. חפיפה ואז מסקנה');
  assert.deepEqual(t.warm, ['W2', 'W4', 'W5', 'W6']); assert.equal(t.n, 4);
  assert.ok(!t.templates.some((x) => x.family === '2'));
  const R = makeR(seeded(4)), goals = {};
  for (const tpl of t.templates) { const p = t.make(R, 2, 'B', { recent: [], last: null }, { only: tpl.id }); assert.equal(p.template, tpl.id); (goals[tpl.variant] ||= []).push(p.facts[p.target].kind); assert.equal(classify(p, [...p.given, ...canonRows(p).slice(0, 3).map((r) => r.fact), 'cong'], p.facts[p.target]).c, 'ok'); }
  assert.deepEqual(goals['X-SAS'], ['seg', 'ang', 'ang']); assert.deepEqual(goals['X-ASA'], ['seg', 'seg', 'ang']);
  assert.deepEqual(goals['K-SSS'], ['ang', 'ang', 'ang']); assert.deepEqual(goals['T-ASA'], ['seg', 'seg', 'ang']);
});
test('type 4: the goals are the very statements of the §6.5 table (role letters)', () => {
  const t = typeById('then-conclusion'), R = makeR(seeded(41));
  const want = {
    'X-SAS': ['AC = BD', '∢OAC = ∢OBD', '∢OCA = ∢ODB'], 'X-ASA': ['CO = OD', 'AC = BD', '∢OCA = ∢ODB'],
    'K-SSS': ['∢BAC = ∢DAC', '∢BCA = ∢DCA', '∢ABC = ∢ADC'], 'K-SAS': ['CB = CD', '∢BCA = ∢DCA', '∢ABC = ∢ADC'], 'K-ASA': ['AB = AD', 'CB = CD', '∢ABC = ∢ADC'],
    'Z-SSS': ['∢BAC = ∢DCA', '∢BCA = ∢DAC', '∢ABC = ∢CDA'], 'Z-SAS': ['BC = DA', '∢BCA = ∢DAC', '∢ABC = ∢CDA'], 'Z-ASA': ['AB = CD', 'BC = DA', '∢ABC = ∢CDA'],
    'T-SSS': ['∢ABD = ∢ACD', '∢BAD = ∢CAD', '∢ADB = ∢ADC'], 'T-SAS': ['BD = DC', '∢ABD = ∢ACD', '∢ADB = ∢ADC'], 'T-ASA': ['AB = AC', 'BD = DC', '∢ABD = ∢ACD'],
  };
  for (const tpl of t.templates) {
    const names = tpl.family === 'X' ? ['A', 'B', 'C', 'D', 'O'] : ['A', 'B', 'C', 'D'];
    const p = t.make(R, 2, 'B', { recent: [], last: null }, { only: tpl.id, names });
    assert.equal(show(p.facts[p.target]), want[tpl.variant][tpl.goal - 1], tpl.id);
    assert.equal(p.just[p.target][0].reasons[0], p.facts[p.target].kind === 'seg' ? 'cp-sides' : 'cp-angles');
    assert.deepEqual(p.just[p.target][0].needs, ['cong']); assert.equal(p.roles[p.target], 'conclusion');
    assert.deepEqual(p.canon, [...p.canon.slice(0, 3), 'cong', p.target]);
  }
});
test('type 4: the unused consequences are "true but not needed"; the goal before the congruence is goal-as-known', () => {
  const p = typeById('then-conclusion').make(makeR(seeded(6)), 3, 'B', { recent: [], last: null }, {});
  const all = canonRows(p).map((r) => r.fact), other = Object.keys(p.facts).find((f) => !all.includes(f));
  assert.equal(classify(p, all.slice(0, 4), p.facts[other]).textKey, 'st.notNeeded');
  assert.equal(classify(p, all.slice(0, 3), p.facts[p.target]).kind, 'goal-as-known');
});
test('type 4: a conclusion is never claimed as a right angle (only the equality follows from the congruence)', () => {
  const t = typeById('then-conclusion'), R = makeR(seeded(42));
  for (const id of ['4-T-SSS-3', '4-T-SAS-3']) for (let i = 0; i < 30; i++) {
    const p = t.make(R, 2, 'B', { recent: [], last: null }, { only: id });
    assert.ok(!p.facts[p.target].right, id); assert.ok(!(p.facts[p.target].mark || {}).right, id);
    assert.doesNotMatch(show(p.facts[p.target]), /90/);
    for (const f of Object.keys(p.facts)) if (!p.canon.slice(0, 3).includes(f)) assert.ok(!p.facts[f].right, `${id} ${f}`);
  }
});
test('type 4: the first Level-1 proof re-uses a variant already proved in type 3', () => {
  const p = typeById('then-conclusion').make(makeR(seeded(9)), 1, 'B', { recent: [], last: null }, { prefer: '3-K-SAS' }); assert.equal(p.template.slice(0, 7), '4-K-SAS');
  const q = typeById('then-conclusion').make(makeR(seeded(9)), 1, 'B', { recent: [], last: null }, { prefer: '3-2-SAS' }); assert.ok(q.template.startsWith('4-'));
});
test('type 4: wrong tiles are one unused consequence and one letter-swap; the goal is a real tile', () => {
  const t = typeById('then-conclusion'), R = makeR(seeded(43));
  for (let i = 0; i < 200; i++) {
    const p = t.make(R, 2, 'B', { recent: [], last: null }, {});
    assert.deepEqual(p.tiles.wrong.map((w) => w.why), ['consequence', 'letter-swap']);
    assert.notEqual(norm(p.figure, p.tiles.wrong[0].st), norm(p.figure, p.facts[p.target]));
    const v = present(p, 2, 'B', { R }); assert.ok(v.tiles.some((x) => x.fact === p.target));
  }
});
test('type 4: remake rebuilds the same problem', () => {
  const t = typeById('then-conclusion'), R = makeR(seeded(44));
  for (let i = 0; i < 20; i++) { const p = t.make(R, 2, 'B', { recent: [], last: null }, { words: ['midpoint', 'bisector'] }), q = t.remake(p); assert.equal(q.id, p.id); assert.deepEqual(q.facts, p.facts); assert.deepEqual(q.tiles, p.tiles); assert.deepEqual(q.figure, p.figure); }
});
