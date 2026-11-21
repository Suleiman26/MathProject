/* node --test src/topics/proofs/proofs.test.mjs           (RUNS=300 for a quick pass)
   The generator sweep (spec §6.6): for every type, level and variant, thousands of seeded problems —
   honest drawings (tests 1–5), the canonical and a shuffled valid proof pass, each wrong tile is
   rejected with its intended kind (6), enough variety (7), and the database texts are stable (8). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { TYPES, TABS, tabOf, typeById } from './types/index.js';
import { lies } from './families/kit.js';
import { present, classify, checkReason, isDone, canonRows, required, decisionsOf, show, norm, holds, optionsFor, whyOf } from './core.js';
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
    const R = makeR(seeded(12345)); const seen = {}, drawn = {}; let avoid = { recent: [], last: null };
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
      for (const t of p.tiles.wrong) { const c = classify(p, p.given, t.st); if (c.c === 'iso') { assert.equal(t.why, 'consequence'); continue; }   // family T: true, no reason in phase 1 (review I3)
        assert.ok(c.c === 'early' || c.c === 'false', `${p.id} wrong tile is ${c.c}`); assert.equal(c.kind, { consequence: 'looks-equal', goal: c.kind, 'letter-swap': 'false-statement', word: 'wrong-word', position: 'wrong-matching', 'next-letter': 'wrong-matching', 'kind-mix': 'wrong-matching' }[t.why]); }
      assert.ok(p.tiles.wrong.length <= (type.n >= 3 ? 2 : 4));
      if (variant === 'A') assert.equal(view.tiles.filter((t) => !t.fact).length <= (type.n === 1 ? 2 : type.n === 2 ? 1 : 0), true);
      if (variant === 'B' && type.n >= 3) assert.notEqual(p.family, '2');             // family 2 is for entry proofs only
      if (variant === 'A') assert.ok(p.givenText.every((g) => g.form === 'eq') || type.n === 1);
      assert.ok(!(avoid.last && avoid.last.family === p.family && avoid.last.theorem === p.theorem && p.theorem), 'same family + theorem twice in a row');
      drawn[p.template] = (drawn[p.template] || 0) + 1;
      (seen[p.template] ||= new Set()).add(JSON.stringify([Object.keys(p.figure.points), Object.values(p.figure.points).map((q) => q.map(Math.round))]));
      avoid = { recent: [p.template, ...avoid.recent].slice(0, 6), last: { family: p.family, theorem: p.theorem } };
    }
    // 7: a full run keeps the strict 12; a quick pass (RUNS < 3000) draws some templates fewer than 12 times, so the bar follows the draws
    for (const [tpl, set] of Object.entries(seen)) { const need = RUNS >= 3000 ? 12 : Math.min(12, Math.max(1, Math.floor(drawn[tpl] * 0.6))); assert.ok(set.size >= need, `${tpl}: only ${set.size} different instances in ${drawn[tpl]} draws (need ${need})`); }
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

/* ── Task 17: type 2 ── */
test('type 2: 6 templates; three asked parts with a side and an angle; no marks at the start', () => {
  const t = typeById('congruent-parts'); assert.equal(t.templates.length, 6); assert.equal(t.button, '2. מחפיפה לשוויונות');
  assert.deepEqual(t.templates.map((x) => x.id), ['2-a', '2-b', '2-c', '2-d', '2-e', '2-f']); assert.deepEqual(t.warm, ['W5']);
  const R = makeR(seeded(11));
  for (let i = 0; i < 500; i++) {
    const p = t.make(R, 2, 'B', { recent: [], last: null }, {});
    assert.equal(p.target.length, 3); const kinds = p.target.map((f) => p.facts[f].kind); assert.ok(kinds.includes('seg') && kinds.includes('ang'));
    assert.deepEqual(p.given, ['cong']); assert.deepEqual(present(p, 2, 'B', { R }).pre, ['cong']);
    assert.deepEqual(start(p, present(p, 2, 'B', { R })).rows, []);                     // the given congruence is no row, and no mark is drawn
    for (const f of p.target) { assert.equal(classify(p, ['cong'], p.facts[f]).c, 'ok'); assert.equal(checkReason(p, ['cong'], f, p.facts[f].kind === 'seg' ? 'cp-sides' : 'cp-angles').ok, true); }
    const rest = Object.keys(p.facts).filter((f) => f !== 'cong' && !p.target.includes(f)); assert.equal(rest.length, 3);
    assert.equal(classify(p, ['cong'], p.facts[rest[0]]).textKey, 'st.notAsked');
    for (const w of p.tiles.wrong) { const c = classify(p, ['cong'], w.st); assert.deepEqual([c.c, c.kind, c.textKey], ['false', 'wrong-matching', 'st.partner']); }
  }
});
test('type 2: 2-b is not alphabetical; 2-f matches A with C', () => {
  const t = typeById('congruent-parts'), R = makeR(seeded(12));
  for (let i = 0; i < 50; i++) { const b = t.make(R, 1, 'B', { recent: [], last: null }, { only: '2-b' }); const second = b.facts.cong.map.map((m) => m[1]).join(''); assert.notEqual(second, [...second].sort().join('')); }
  const f = t.make(R, 1, 'B', { recent: [], last: null }, { only: '2-f' }); const m = Object.fromEntries(f.facts.cong.map); const [x] = Object.keys(m).filter((k) => m[m[k]] === k && m[k] !== k); assert.ok(x);
  const d = t.make(R, 1, 'B', { recent: [], last: null }, { only: '2-d' }); assert.ok(d.facts.cong.map.some(([u, v]) => u === v && u === 'O'));
  const e = t.make(R, 1, 'B', { recent: [], last: null }, { only: '2-e' }); assert.equal(e.facts.cong.map.filter(([u, v]) => u === v).length, 2);
  const a = t.make(R, 1, 'A', { recent: [], last: null }, {}); assert.equal(a.template, '2-a');
  const c = t.make(R, 1, 'B', { recent: [], last: null }, { only: '2-c' }); assert.equal(c.figure.motion.mirror, true);
});
test('type 2: the pairs follow the written matching, a shared side is never asked, the partner part reads in order', () => {
  const t = typeById('congruent-parts'), R = makeR(seeded(13));
  for (let i = 0; i < 300; i++) {
    const p = t.make(R, 2, 'B', { recent: [], last: null }, {}), F = Object.fromEntries(p.facts.cong.map);
    for (const [id, f] of Object.entries(p.facts)) {
      if (f.kind === 'cong') continue;
      assert.equal(holds(p.figure, f), true, `${p.id} ${id}`);
      if (f.kind === 'seg') assert.equal(f.y, [...f.x].map((q) => F[q]).join('')); else assert.equal(f.y.v, F[f.x.v]);
    }
    for (const id of p.target) { const f = p.facts[id]; assert.ok(!(f.kind === 'seg' && [...f.x].sort().join('') === [...f.y].sort().join('')), `${p.id} asks a shared side`); assert.deepEqual(p.cue[id], [f.x]); }
    assert.equal(p.givenText.length, 1); assert.equal(p.givenText[0].byOrder, true);
    // every wrong partner (also in Level 1 options) gets the matching explanation, never "false" alone
    for (const id of p.target) for (const o of optionsFor(p, id, 3, R)) { const c = classify(p, ['cong'], o); assert.ok(c.c === 'ok' || c.textKey === 'st.partner', `${p.id} option ${show(o)} → ${c.textKey}`); }
  }
});
test('type 2: a wrong partner names the right vertex in the explanation', () => {
  const p = typeById('congruent-parts').make(makeR(seeded(14)), 2, 'B', { recent: [], last: null }, { only: '2-b' });
  const M = p.facts.cong.map, F = Object.fromEntries(M);
  for (const w of p.tiles.wrong) {
    const c = classify(p, ['cong'], w.st), { p: v, q } = c.vars;
    assert.equal(F[v], q); assert.equal(c.vars.place, ['הראשון', 'השני', 'השלישי'][M.findIndex((m) => m[0] === v)]);
    assert.ok(!(w.st.kind === 'seg' ? [...w.st.y] : [w.st.y.v]).includes(q) || w.st.kind === 'seg');
  }
  assert.ok(new Set(p.tiles.wrong.map((w) => w.why)).size >= 2);
});
test('type 2: the why-line names the letters in the same places', () => {
  const p = typeById('congruent-parts').make(makeR(seeded(15)), 1, 'A', { recent: [], last: null }, {});
  const a = p.target.find((f) => p.facts[f].kind === 'ang'), s = p.target.find((f) => p.facts[f].kind === 'seg');
  assert.deepEqual(whyOf(p, a).vars, { p: p.facts[a].x.v, q: p.facts[a].y.v }); assert.deepEqual(whyOf(p, s).vars, { p: p.facts[s].x, q: p.facts[s].y });
});
test('type 2: a hint while the partner is open pulses only the asked part', () => {
  const p = typeById('congruent-parts').make(makeR(seeded(16)), 2, 'B', { recent: [], last: null }, {}), view = present(p, 2, 'B', { R: makeR(seeded(1)) });
  const o = act(start(p, view), { t: 'hint' }), h = o.fx.find((f) => f.t === 'hint');
  assert.equal(h.parts.length, 1); assert.equal(h.key, 'hint.partner.1');
});
test('decisions: type 2 = 1, 3, 6, 6, 6', () => {
  const t = typeById('congruent-parts'), R = makeR(seeded(17));
  const n = (l, v) => decisionsOf(present(t.make(R, l, v, { recent: [], last: null }, {}), l, v, { counted: 2, R }));
  assert.deepEqual([n(1, 'A'), n(1, 'B'), n(2, 'A'), n(2, 'B'), n(3, 'B')], [1, 3, 6, 6, 6]);
  const p = t.make(R, 2, 'A', { recent: [], last: null }, {}), v = present(p, 2, 'A', { R });
  assert.equal(v.tiles.filter((x) => x.fact).length, 3); assert.equal(v.tiles.filter((x) => !x.fact).length, 1); assert.equal(v.chipsN, 4);
  const q = t.make(R, 2, 'B', { recent: [], last: null }, {}), w = present(q, 2, 'B', { R });
  assert.equal(w.tiles.filter((x) => !x.fact).length, 3); assert.equal(w.chipsN, 6);
  assert.equal(present(p, 1, 'A', { R }).letters, true); assert.equal(present(p, 2, 'B', { R }).letters, false);
});
test('type 2: remake rebuilds the same problem', () => {
  const t = typeById('congruent-parts'), R = makeR(seeded(18));
  for (let i = 0; i < 30; i++) { const p = t.make(R, 2, 'B', { recent: [], last: null }, {}), q = t.remake(p); assert.equal(q.id, p.id); assert.deepEqual(q.facts, p.facts); assert.deepEqual(q.tiles, p.tiles); assert.deepEqual(q.figure, p.figure); assert.deepEqual(q.target, p.target); }
});

/* ── Task 18: type 1 ── */
test('type 1: 9 templates (1-i was a copy of 1-c, review M4); the word is true, the other words are false with the right message', () => {
  const t = typeById('read-given'); assert.equal(t.templates.length, 9); assert.ok(!t.templates.some((x) => x.id === '1-i')); assert.equal(t.button, '1. קוראים את הנתון'); assert.deepEqual(t.warm, ['W1', 'W7']);
  const R = makeR(seeded(21));
  for (const tpl of t.templates) for (let i = 0; i < 300; i++) {
    const p = t.make(R, 2, 'B', { recent: [], last: null }, { only: tpl.id });
    assert.equal(p.template, tpl.id); assert.equal(p.target.length, 2);
    for (const f of p.target) { assert.equal(holds(p.figure, p.facts[f]), true); assert.equal(classify(p, [], p.facts[f]).c, 'ok'); assert.equal(checkReason(p, [], f, 'given').ok, true); assert.deepEqual(p.just[f][0].needs, []); }
    for (const w of p.tiles.wrong.filter((x) => x.why === 'word')) { const c = classify(p, [], w.st); assert.deepEqual([c.c, c.kind], ['false', 'wrong-word']); assert.ok(/^st\.word\./.test(c.textKey)); assert.equal(holds(p.figure, w.st), false); }
    assert.ok(p.tiles.wrong.length === 4, `${p.id}: ${p.tiles.wrong.length} wrong tiles`);
    assert.equal(p.givenText.flatMap((g) => g.facts).length, 2);
  }
});
test('type 1: accepted reasons follow the form of the sentence', () => {
  const t = typeById('read-given'), R = makeR(seeded(22)), mk = (id) => t.make(R, 2, 'B', { recent: [], last: null }, { only: id });
  const a = mk('1-a'), bis = a.target.find((f) => a.facts[f].kind === 'ang'), med = a.target.find((f) => a.facts[f].kind === 'seg');
  assert.equal(checkReason(a, [], bis, 'bisector').ok, true); assert.equal(checkReason(a, [], med, 'median').ok, true);
  assert.deepEqual([checkReason(a, [], med, 'bisector').kind, checkReason(a, [], med, 'bisector').textKey], ['wrong-word', 'rs.words.otherDef']);
  const h = mk('1-h'), eq = h.target.find((f) => h.facts[f].kind === 'seg');
  assert.equal(checkReason(h, [], eq, 'given').ok, true); assert.equal(checkReason(h, [], eq, 'bisector').ok, false); assert.equal(h.just[eq][0].reasons.length, 1);
  const b = mk('1-b'), alt = b.target.find((f) => b.facts[f].right); assert.equal(checkReason(b, [], alt, 'altitude').ok, true); assert.match(show(b.facts[alt]), / = 90°$/);
  const d = mk('1-d'); assert.ok(d.target.some((f) => d.just[f][0].reasons.includes('midpoint')));
  const c3 = mk('1-c'); assert.ok(c3.tiles.wrong.some((w) => w.why === 'word' && w.st.kind === 'ang'));        // a median is not a bisector
});
test('type 1: the sentences say exactly what the statements say (spec §6.5 wording)', () => {
  const t = typeById('read-given'), R = makeR(seeded(23));
  for (const tpl of t.templates) for (let i = 0; i < 40; i++) {
    const p = t.make(R, 1, 'B', { recent: [], last: null }, { only: tpl.id });
    for (const g of p.givenText) {
      const f = p.facts[g.facts[0]];
      if (g.form === 'eq') { assert.equal(tpl.id, '1-h'); assert.equal(p.just[g.facts[0]][0].reasons.join(), 'given'); continue; }
      if (g.key === 'gv.bisector') { const [, v, ] = [...g.vars.a.slice(1)]; assert.equal(f.kind, 'ang'); assert.equal(f.x.v, g.vars.a[2]); assert.ok(g.vars.l.includes(f.x.v)); assert.ok([...f.x.r, ...f.y.r].every((q) => g.vars.a.includes(q) || g.vars.l.includes(q))); assert.ok(v); }
      if (g.key === 'gv.median' || g.key === 'gv.altitude') { const foot = g.vars.l[1]; assert.ok(f.kind === (g.key === 'gv.median' ? 'seg' : 'ang')); if (f.kind === 'seg') assert.deepEqual([f.x, f.y].map((s) => s.replace(foot, '')).sort().join(''), [...g.vars.s].sort().join('')); else { assert.equal(f.right, true); assert.equal(f.x.v, foot); } }
      if (g.key === 'gv.midSide' || g.key === 'gv.midpoint') { assert.equal(f.kind, 'seg'); assert.ok(f.x.includes(g.vars.p) && f.y.includes(g.vars.p)); }
      if (g.key === 'gv.bisect2') assert.equal(g.facts.length, 2);
    }
    if (tpl.id === '1-d') assert.ok(!p.figure.plain.some((s) => p.givenText.some((g) => g.key === 'gv.midSide' && s.includes(g.vars.p))), '1-d draws no line to the midpoint');
  }
});
test('type 1: 1-h is not symmetric (AB ≠ AD), 1-g is (two bisectors along a diagonal force it)', () => {
  const t = typeById('read-given'), R = makeR(seeded(24));
  for (let i = 0; i < 100; i++) {
    const h = t.make(R, 2, 'B', { recent: [], last: null }, { only: '1-h' }), [tA, tB] = h.figure.tris;
    assert.equal(holds(h.figure, { kind: 'seg', x: tA[0] + tA[1], y: tB[0] + tB[1] }), false);
    assert.ok(h.tiles.wrong.some((w) => w.why === 'word' && w.st.kind === 'seg'));
    const g = t.make(R, 2, 'B', { recent: [], last: null }, { only: '1-g' }), [gA, gB] = g.figure.tris;
    assert.equal(holds(g.figure, { kind: 'seg', x: gA[0] + gA[1], y: gB[0] + gB[1] }), true);
  }
});
test('type 1: hints and the drawing point at the sentence\'s line, never at the answer', () => {
  const t = typeById('read-given'), R = makeR(seeded(25));
  const p = t.make(R, 2, 'B', { recent: [], last: null }, { only: '1-a' }), view = present(p, 2, 'B', { R });
  const h = act(start(p, view), { t: 'hint' }).fx.find((f) => f.t === 'hint');
  assert.equal(h.parts.length, 1); assert.equal(typeof h.parts[0], 'string'); assert.ok(p.figure.plain.includes(h.parts[0]));
});
test('decisions: type 1 = 1, 2, 4, 4, 4', () => {
  const t = typeById('read-given'), R = makeR(seeded(26));
  const n = (l, v) => decisionsOf(present(t.make(R, l, v, { recent: [], last: null }, {}), l, v, { counted: 2, R }));
  assert.deepEqual([n(1, 'A'), n(1, 'B'), n(2, 'A'), n(2, 'B'), n(3, 'B')], [1, 2, 4, 4, 4]);
  const p = t.make(R, 2, 'A', { recent: [], last: null }, {}), v = present(p, 2, 'A', { R }); assert.deepEqual([v.tiles.filter((x) => x.fact).length, v.tiles.filter((x) => !x.fact).length, v.chipsN], [2, 2, 6]);
  const q = t.make(R, 2, 'B', { recent: [], last: null }, {}), w = present(q, 2, 'B', { R }); assert.deepEqual([w.tiles.length, w.chipsN], [6, 6]);
  for (const f of q.target) { const o = optionsFor(q, f, 3, R); assert.equal(o.length, 3); assert.equal(o.filter((x) => classify(q, [], x).c === 'ok').length, 1); }
});
test('type 1: remake rebuilds the same problem', () => {
  const t = typeById('read-given'), R = makeR(seeded(27));
  for (let i = 0; i < 30; i++) { const p = t.make(R, 2, 'B', { recent: [], last: null }, {}), q = t.remake(p); assert.equal(q.id, p.id); assert.deepEqual(q.facts, p.facts); assert.deepEqual(q.tiles, p.tiles); assert.deepEqual(q.figure, p.figure); assert.deepEqual(q.givenText, p.givenText); }
});
test('all four types are present, in order', () => { assert.deepEqual(TYPES.map((t) => t.button), ['1. קוראים את הנתון', '2. מחפיפה לשוויונות', '3. הוכחת חפיפה', '4. חפיפה ואז מסקנה']); assert.equal(TYPES.reduce((n, t) => n + t.templates.length, 0), 62); });

/* ── wiring (plan Task 20) ── */
test('wiring: registered, coral, public on the home lists (Abed, 2026-11-21)', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../registry.js', import.meta.url), 'utf8');
  assert.match(src, /"proofs": \{"title": "הוכחות", "topic": "orange", "file": "proofs\.html"\}/);
  assert.match(src, /"proofs": \(\) => import\('\.\/proofs\/Topic\.jsx'\)/); assert.match(src, /"proofs": \(\) => import\('\.\/proofs\/styles\.js'\)/);
  const { CHAPTERS } = await import('../../home/chapters.js'); assert.deepEqual(CHAPTERS.proofs, TYPES.map((t) => t.button));
  const cat = fs.readFileSync(new URL('../../home/catalog.js', import.meta.url), 'utf8'); assert.match(cat, /slug: "proofs", name: "הוכחות", grades: "כיתה ח׳", g: \["8"\]/);
  const page = fs.readFileSync(new URL('../../../app/topics/[slug]/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /hidden \? \{ robots: \{ index: false, follow: false \} \}/);
});
test('CSS: every class, keyframe and custom property is prf-; no generic @property; no letter-spacing', async () => {
  const css = (await import('./styles.js')).default; const own = css.slice(css.indexOf('/* ── prf ── */')); assert.ok(css.includes('/* ── prf ── */'));
  for (const m of own.matchAll(/@keyframes\s+([\w-]+)/g)) assert.match(m[1], /^prf-/);
  for (const m of css.matchAll(/@property\s+(--[\w-]+)/g)) assert.match(m[1], /^--prf-/);
  for (const m of own.matchAll(/(--[\w-]+)\s*:/g)) assert.match(m[1], /^--prf-/);
  assert.equal(/letter-spacing/.test(css), false);
  // our own classes are prf-…; `is-…` are states and only ever follow a prf- class or a shared one; the rest are shared mp.css names
  const shared = ['hdr', 'ch-btns', 'ch-btn', 'content', 'sub-tabs', 'sub-tab', 'banner', 'fb', 'ok', 'err', 'step-card', 'step-label', 'active'];
  for (const m of own.matchAll(/\.([a-zA-Z][\w-]*)/g)) assert.ok(m[1] === 'prf' || /^(prf|is)-/.test(m[1]) || shared.includes(m[1]), m[1]);
  for (const m of own.matchAll(/(^|[\s,>+~(])\.is-[\w-]+/g)) assert.fail(`a bare state class: ${m[0]}`);
  // every rule of ours is scoped under #root
  for (const line of own.split('\n')) { const sel = line.trim(); if (/^[.#\w][^{@]*\{/.test(sel) && !/^(from|to|\d+%)/.test(sel)) for (const one of sel.slice(0, sel.indexOf('{')).split(',')) assert.ok(one.trim().startsWith('#root '), one); }
});
test('every text key the screens use exists', async () => {
  const fs = await import('node:fs'); const { T } = await import('./texts.js');
  const dir = new URL('./', import.meta.url);
  for (const f of fs.readdirSync(dir).filter((n) => /\.jsx$/.test(n))) {
    const src = fs.readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/\bT\['([\w.-]+)'\]/g)) assert.ok(T[m[1]] != null, `${f}: no text "${m[1]}"`);
    for (const m of src.matchAll(/\bfill\('([\w.-]+)'/g)) assert.ok(T[m[1]] != null, `${f}: no text "${m[1]}"`);
  }
});

/* ── review fixes ── */
test('family T: what the isosceles triangle gives is a neutral note, never "looks equal" or a wrong try (review I3)', () => {
  const t3 = typeById('prove-congruence'), t4 = typeById('then-conclusion'), R = makeR(seeded(51));
  for (let i = 0; i < 40; i++) {
    const sss = t3.make(R, 3, 'B', { recent: [], last: null }, { only: '3-T-SSS' });
    for (const id of ['aB', 'aA', 'aD']) for (const done of [[], ['sAB'], ['sAB', 'sBD']]) assert.deepEqual([classify(sss, done, sss.facts[id]).c, classify(sss, done, sss.facts[id]).textKey], ['iso', 'st.isoLater'], `T-SSS ${id}`);
    const sas = t3.make(R, 3, 'B', { recent: [], last: null }, { only: '3-T-SAS' });
    for (const id of ['sBD', 'aB', 'aD']) assert.equal(classify(sas, [], sas.facts[id]).c, 'iso', `T-SAS ${id}`);
    const asa = t3.make(R, 3, 'B', { recent: [], last: null }, { only: '3-T-ASA' });                // AB = AC is not given here
    for (const id of ['sAB', 'sBD', 'aB']) assert.deepEqual([classify(asa, [], asa.facts[id]).c, classify(asa, [], asa.facts[id]).kind], ['early', 'looks-equal'], `T-ASA ${id}`);
    const goal = t4.make(R, 3, 'B', { recent: [], last: null }, { only: '4-T-SAS-1' });              // the goal BD = DC: still neutral before the congruence
    assert.equal(classify(goal, [], goal.facts.sBD).c, 'iso');
    const rows = canonRows(goal).map((r) => r.fact), done = [];
    for (const f of rows) { assert.equal(classify(goal, done, goal.facts[f]).c, 'ok', `${goal.id} ${f}`); done.push(f); }          // the congruence path still works
    // in a proof: a note, no decision, no error kind, no taint
    let s = start(sss, present(sss, 3, 'B', { R })), o = act(s, { t: 'statement', st: sss.facts.aB });
    assert.deepEqual([o.fx[0].cls, o.fx[0].key, o.s.decisions.length, o.s.nonSolo, o.s.errs], ['note', 'st.isoLater', 0, 0, {}]);
    // a family that is not T is untouched
    const x = t3.make(R, 3, 'B', { recent: [], last: null }, { only: '3-X-SAS' }), c = x.consequences[0];
    assert.equal(classify(x, [], x.facts[c]).kind, 'looks-equal');
  }
});
test('type 3: the "looks equal" tile never says "= 90°" (review I5)', () => {
  const t = typeById('prove-congruence'), R = makeR(seeded(52));
  for (const id of ['3-T-SAS', '3-T-SSS']) for (let i = 0; i < 80; i++) {
    const p = t.make(R, 2, 'B', { recent: [], last: null }, { only: id });
    for (const w of p.tiles.wrong) { assert.ok(!w.st.right, `${p.id}`); assert.doesNotMatch(show(w.st), /90/); }
  }
});
