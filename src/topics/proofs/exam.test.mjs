/* node --test src/topics/proofs/exam.test.mjs
   The exam level of each subject ("כמו במבחן", spec 2026-11-23 §8): mixed problems of the subject, sections א/ב/ג
   from canon, the exam's own mastery (starts at לבד, always variant B, no fast track, no walk-through: the exam
   rescue card), when it opens, "שולטים בנושא", and the rows a new device restores it from. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { TYPES, typeById } from './types/index.js';
import { SUBJECTS, typesOf, levelNo } from './subjects.js';
import { present, shapeOf, required, sectionOf, targets, anchorOf, decisionsOf } from './core.js';
import { start, act, ready, snapshot, restore } from './session.js';
import { emptyType, record, variantFor, typeState, examOpen, subjectMastered, seedFromServer, load, save, KEY, takeRescue, rescueKinds } from './mastery.js';
import { T, fill, NEW_DRAFTS } from './texts.js';
import { lies } from './families/kit.js';
import { liesSim } from './families/sim-kit.js';

const CE = typeById('cong-exam'), SE = typeById('sim-exam');
const mk = (type, seed, ctx = {}) => type.make(makeR(seeded(seed)), 3, 'B', { recent: [], last: null }, ctx);
const rec = (n, solo, o = {}) => ({ n, solo, helped: 0, missed: n - solo - (o.filled || 0), filled: o.filled || 0, variant: 'B', tpl: o.tpl || '5-X-SAS-1', day: 1 });
const run = (ts, recs, opt) => { let out; for (const r of recs) { out = record(ts, 3, r, opt); ts = out.ts; } return out; };
/* the facts a fact stands on (every justification), itself included */
const closure = (p, ids) => { const out = new Set(); const v = (id) => { if (out.has(id)) return; out.add(id); for (const j of p.just[id] || []) j.needs.forEach(v); }; ids.forEach(v); return out; };

test('two exam types: keys, shape, label, live, the last level of their subject', () => {
  assert.equal(CE.button, '5. חפיפה – כמו במבחן'); assert.equal(SE.button, '10. דמיון – כמו במבחן');
  assert.ok(CE.button.includes('–') && SE.button.includes('–'));
  for (const t of [CE, SE]) { assert.equal(t.shape, 'exam'); assert.equal(t.live, true); assert.equal(t.label, 'כמו במבחן'); assert.ok(t.warm.length > 0); }
  assert.equal(CE.subject, 'congruence'); assert.equal(SE.subject, 'similarity');
  assert.deepEqual(SUBJECTS[0].types.slice(-2), ['then-conclusion', 'cong-exam']);
  assert.deepEqual(SUBJECTS[1].types.slice(-2), ['sim-calc', 'sim-exam']);
  assert.equal(levelNo('cong-exam'), 5); assert.equal(levelNo('sim-exam'), 5);
  assert.deepEqual(TYPES.map((t) => t.n), [...TYPES.map((t) => t.n)].sort((a, b) => a - b));   // TYPES stays in key order
  assert.deepEqual([CE.n, SE.n], [5, 10]);
  assert.deepEqual(rescueKinds(SE), SE.warm);
});

for (const [type, fams, n] of [[CE, ['X', 'K', 'Z', 'T'], 3], [SE, ['P', 'B', 'H', 'N'], 3]]) {
  test(`${type.id}: 200 seeds: sections in order from canon, each section stands on the one before, remake is exact`, () => {
    const seen = new Set(), counts = new Set();
    for (let seed = 1; seed <= 200; seed++) {
      const p = mk(type, seed * 7919);
      seen.add(p.family); counts.add(p.sections.length);
      assert.equal(shapeOf(p), 'exam'); assert.equal(p.type, type.id);
      assert.deepEqual((type === CE ? lies : liesSim)(p), [], `${p.id}: the drawing lies`);
      assert.ok(p.sections.length >= 2 && p.sections.length <= n, `${p.id}: ${p.sections.length} sections`);
      assert.deepEqual(p.sections.map((s) => s.letter), ['א', 'ב', 'ג'].slice(0, p.sections.length));
      assert.deepEqual(targets(p), p.sections.flatMap((s) => s.targets), p.id);
      // every section target is a canon row; the canon is ordered by section
      const at = (f) => p.canon.indexOf(f);
      for (const s of p.sections) for (const f of s.targets) assert.ok(at(f) >= 0, `${p.id}: ${f} not in canon`);
      const secs = p.canon.map((f) => sectionOf(p, f));
      assert.deepEqual(secs, [...secs].sort((a, b) => a - b), `${p.id}: canon not in section order`);
      assert.ok(secs.every((i) => i >= 0), `${p.id}: a canon row outside every section`);
      for (let i = 1; i < p.sections.length; i++) {
        const c = closure(p, p.sections[i].targets);
        for (const f of p.sections[i - 1].targets) assert.ok(c.has(f), `${p.id}: section ${i + 1} does not need ${f}`);
      }
      for (const s of p.sections) { assert.ok(typeof s.goalKey === 'string' && s.goalKey in T, s.goalKey); fill(s.goalKey, s.goalVars); }
      // remake (a refresh, a snapshot) rebuilds it exactly
      assert.deepEqual(type.remake(p), p, p.id);
      assert.deepEqual(type.remake({ template: p.template, seed: p.seed, level: p.level, variant: p.variant, meta: p.meta }), p, p.id);
    }
    assert.deepEqual([...seen].sort(), [...fams].sort(), 'every family of the subject');
    if (type === CE) assert.deepEqual([...counts].sort(), [2, 3], 'with and without a given in words');
  });
}
test('congruence exam: א is the row a given in words yields, ב the congruence, ג the conclusion (else א/ב)', () => {
  let words = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const p = mk(CE, seed * 104729), ids = p.sections.map((s) => s.targets);
    const w = p.canon.filter((f) => p.roles[f] === 'given-words');
    if (w.length) { words++; assert.deepEqual(ids[0], w); ids.shift(); }
    assert.deepEqual(ids, [['cong'], [p.canon[p.canon.length - 1]]]);
    assert.ok(p.sections.every((s) => s.goalKey === 'exam.goal.prove'));
  }
  assert.ok(words > 20, `words givens are common (${words}/120)`);
});
test('similarity exam: א the similarity, ב the ratio, ג the number', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const p = mk(SE, seed * 31);
    assert.deepEqual(p.sections.map((s) => s.targets), [[anchorOf(p)], ['prop'], ['val']]);
    assert.deepEqual(p.sections.map((s) => s.goalKey), ['exam.goal.prove', 'exam.goal.ratio', 'exam.goal.calc']);
    assert.equal(p.sections[2].goalVars.x, p.facts.val.x);
    assert.ok(Number.isInteger(p.facts.val.v * 2), 'whole or x.5');
  }
});
test('present: an exam is always לבד mechanics, variant B, no why-line, no automatic hint, no plan', () => {
  for (const [type, seed] of [[CE, 11], [SE, 12]]) {
    const p = mk(type, seed);
    for (const [lv, v] of [[1, 'A'], [2, 'A'], [3, 'A'], [3, 'B']]) {
      const view = present(p, lv, v, { counted: 0, R: makeR(seeded(1)) });
      const b = present({ ...p, shape: 'prove' }, 3, 'B', { counted: 0, R: makeR(seeded(1)) });
      assert.equal(view.mode, 'tap'); assert.equal(view.whyLine, false); assert.equal(view.autoHint, false); assert.equal(view.shortFirst, true);
      assert.equal(view.plan, null); assert.equal(view.exam, true);
      assert.deepEqual(view.steps, b.steps); assert.deepEqual(view.pre, b.pre);
    }
  }
});
/* the canon answer to whatever is open (as in session.test.mjs) */
function canonAction(s) {
  const p = s.problem, c = s.cur;
  if (!c) return { t: 'qed' };
  const fact = c.fact || c.expect, f = p.facts[fact];
  if (c.kind === 'reason') return { t: 'reason', id: p.just[fact].find((j) => j.needs.every((x) => s.done.includes(x))).reasons[0] };
  if (f.kind === 'val') return { t: 'number', text: String(f.v) };
  if (f.kind === 'prop') { const at = (c.pairs || []).length; return { t: 'pair', a: f.pairs[at][0], b: f.pairs[at][1] }; }
  if (fact === anchorOf(p)) return { t: 'matching', tri1: f.map.map((m) => m[0]), order: f.map.map((m) => m[1]) };
  return { t: 'statement', st: f };
}
test('an exam proof plays to the end, section by section, and survives a snapshot', () => {
  for (const type of [CE, SE]) {
    for (let seed = 1; seed <= 40; seed++) {
      const p = mk(type, seed * 613), view = present(p, 3, 'B', { R: makeR(seeded(seed)) });
      let s = start(p, view), last = -1;
      for (let g = 0; g < 80 && !ready(s); g++) {
        const o = act(s, canonAction(s)); assert.notEqual(o.s, s, `${p.id} stuck`);
        if (o.s.rows.length > s.rows.length) { const i = sectionOf(p, o.s.rows.at(-1).fact); assert.ok(i >= last, `${p.id}: rows out of section order`); last = i; }
        s = o.s;
        if (g === 3) { const back = restore(snapshot(s), (m) => type.remake(m)); assert.deepEqual(back.problem, p); }
      }
      assert.ok(ready(s), `${p.id} did not finish`);
      assert.equal(last, p.sections.length - 1);
      assert.ok(decisionsOf(view) >= 6);
    }
  }
});
test('mixed templates every time: the last six (fewer when the subject has fewer) are avoided, never the same family and theorem twice in a row', () => {
  for (const type of [CE, SE]) {
    const R = makeR(seeded(99)); let recent = [], last = null;
    const win = Math.min(6, type.templates.length - 2);
    for (let i = 0; i < 30; i++) {
      const p = type.make(R, 3, 'B', { recent, last }, {});
      assert.ok(!recent.slice(0, win).includes(p.template), `${type.id}: ${p.template} repeated`);
      if (last) assert.ok(!(last.family === p.family && last.theorem === p.theorem), `${type.id}: same family and theorem twice`);
      recent = [p.template, ...recent].slice(0, 6); last = { family: p.family, theorem: p.theorem };
    }
  }
});

/* ── mastery ── */
const withLevels = (o) => ({ v: 1, types: Object.fromEntries(Object.entries(o).map(([id, level]) => [id, { ...emptyType(), level }])) });
test('the exam starts at לבד: typeState gives level 3 (also with { start:3 }), an ordinary level starts at 1', () => {
  assert.equal(typeState({ v: 1, types: {} }, 'cong-exam').level, 3);
  assert.equal(typeState({ v: 1, types: {} }, 'sim-exam').level, 3);
  assert.equal(typeState(null, 'whatever', { start: 3 }).level, 3);
  assert.equal(typeState({ v: 1, types: {} }, 'then-conclusion').level, 1);
  assert.equal(emptyType({ start: 3 }).level, 3); assert.equal(emptyType().level, 1);
  assert.equal(typeState(withLevels({ 'cong-exam': 4 }), 'cong-exam').level, 4);
  assert.equal(typeState({ v: 1, types: { 'cong-exam': { level: 1 } } }, 'cong-exam').level, 3);   // never below לבד
});
test('examOpen: the subject\'s last proof level at לבד (3) or done; subjectMastered: the exam passed', () => {
  assert.equal(examOpen(withLevels({ 'then-conclusion': 2 }), 'congruence'), false);
  assert.equal(examOpen(withLevels({ 'then-conclusion': 3 }), 'congruence'), true);
  assert.equal(examOpen(withLevels({ 'then-conclusion': 4 }), 'congruence'), true);
  assert.equal(examOpen(withLevels({ 'sim-calc': 2, 'then-conclusion': 4 }), 'similarity'), false);
  assert.equal(examOpen(withLevels({ 'sim-calc': 3 }), 'similarity'), true);
  assert.equal(examOpen({ v: 1, types: {} }, 'nope'), false);
  assert.equal(subjectMastered(withLevels({ 'cong-exam': 3 }), 'congruence'), false);
  assert.equal(subjectMastered(withLevels({ 'cong-exam': 4 }), 'congruence'), true);
  assert.equal(subjectMastered(withLevels({ 'cong-exam': 4 }), 'similarity'), false);
  assert.equal(subjectMastered({ v: 1, types: {} }, 'congruence'), false);
});
test('exam: always variant B and counted', () => {
  const ts = typeState({ v: 1, types: {} }, 'cong-exam');
  assert.deepEqual(variantFor(ts, 3, { exam: true }), { variant: 'B', counted: true });
  assert.deepEqual(variantFor({ ...ts, force: 'A' }, 3, { exam: true }), { variant: 'B', counted: true });
  assert.deepEqual(variantFor(ts, 3), { variant: 'A', counted: true });                 // an ordinary level is unchanged
});
test('exam: two perfect proofs do NOT level up (no fast track); 3 clean of the last 4 do → mastered', () => {
  const ts = typeState({ v: 1, types: {} }, 'cong-exam'), P = rec(9, 9), C = rec(9, 8), N = rec(9, 5);
  assert.equal(run(ts, [P, P], { exam: true }).event, null);
  assert.equal(run(ts, [P, P], {}).event, 'type-done');                                  // (an ordinary level would)
  assert.equal(run(ts, [N, C, C], { exam: true }).event, null);
  const o = run(ts, [C, N, C, C], { exam: true });
  assert.equal(o.event, 'type-done'); assert.equal(o.ts.level, 4);
  assert.equal(subjectMastered({ v: 1, types: { 'cong-exam': o.ts } }, 'congruence'), true);
});
test('exam rescue: step 1 is the warm-up as usual; steps 2 and 3 become the exam card; never a walk-through', () => {
  const N = rec(9, 4); let ts = typeState({ v: 1, types: {} }, 'sim-exam'); const seen = [];
  for (let i = 0; i < 14; i++) {
    const o = record(ts, 3, N, { exam: true, errs: { 'ratio-flip': 1 }, kinds: SE.warm });
    ts = o.ts; if (o.rescue) seen.push(o.rescue);
    assert.equal(variantFor(ts, 3, { exam: true }).variant, 'B');
  }
  assert.deepEqual(seen[0], { step: 1, warm: 'S2' });
  assert.ok(seen.length >= 3, JSON.stringify(seen));
  assert.ok(seen.slice(1).every((r) => r.step === 'exam'), JSON.stringify(seen));
  assert.ok(!seen.some((r) => r.step === 2 || r.step === 3));
  // the card waits on the type until the next start, and survives storage
  const o = record(ts, 3, N, { exam: true });
  const m = {}, store = { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } };
  save(store, 'g', { v: 1, types: { 'sim-exam': { ...o.ts, queued: { step: 'exam' } } } });
  assert.deepEqual(load(store, 'g').types['sim-exam'].queued, { step: 'exam' });
  assert.deepEqual(takeRescue(load(store, 'g').types['sim-exam']).rescue, { step: 'exam' });
  assert.ok(m[KEY + 'g']);
});
test('a new device: rows "<exam key> › רמה 3" restore the exam; win ≥ 3 → שולטים בנושא', () => {
  const rows = [{ page: 'proofs.html', chapter: '5. חפיפה – כמו במבחן › רמה 3', win: 1 }];
  let st = seedFromServer({ v: 1, types: {} }, rows, TYPES);
  assert.equal(st.types['cong-exam'].level, 3); assert.equal(subjectMastered(st, 'congruence'), false);
  st = seedFromServer({ v: 1, types: {} }, [{ page: 'proofs.html', chapter: '5. חפיפה – כמו במבחן › רמה 3', win: 3 }], TYPES);
  assert.equal(subjectMastered(st, 'congruence'), true);
  st = seedFromServer({ v: 1, types: {} }, [{ page: 'proofs.html', chapter: '10. דמיון – כמו במבחן › רמה 3', win: 4 }], TYPES);
  assert.equal(subjectMastered(st, 'similarity'), true); assert.equal(subjectMastered(st, 'congruence'), false);
});
test('texts: the new exam texts exist and are on the review list', () => {
  for (const k of ['type.exam', 'about.cong-exam', 'about.sim-exam', 'exam.sec.1', 'exam.sec.2', 'exam.sec.3', 'exam.goal.prove', 'exam.goal.ratio', 'exam.goal.calc', 'lbl.examLocked', 'ui.rescueExam', 'ui.mastered', 'ui.masteredSub', 'lbl.mastered']) {
    assert.ok(k in T, k); assert.ok(NEW_DRAFTS.includes(k), k);
  }
  assert.equal(T['type.exam'], 'כמו במבחן');
  assert.equal(fill('lbl.examLocked', { level: 'רמה 4' }), "נפתח כשמגיעים ל'לבד' ברמה 4");
  assert.equal(typesOf('congruence').length, 5); assert.equal(typesOf('similarity').length, 5);
});
