/* node --test src/topics/proofs/care.test.mjs
   Care details (spec 2026-11-23 §9, §10.1; Task 15): the similarity first-visit nudge, the meta line's way to
   "שולטים בנושא", the exam's warm-up tab (tracker key "<exam key> › חימום"), the forced level of a proof start,
   the exam wording, the altitude demo's foot, and a row with no justification. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { seeded, makeR } from '../new/core.js';
import { typeById, tabsOf, TABS } from './types/index.js';
import { SUBJECTS, demoOf } from './subjects.js';
import { emptyType, nudgeOf } from './mastery.js';
import { classify } from './core.js';
import { T, NEW_DRAFTS } from './texts.js';

const withTypes = (o) => ({ v: 1, types: Object.fromEntries(Object.entries(o).map(([id, x]) => [id, { ...emptyType(), ...x }])) });
const src = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');

test('nudge: similarity\'s first visit while congruence רמה 3 is not reached; never on congruence; gone once begun', () => {
  assert.equal(nudgeOf({ v: 1, types: {} }, 'similarity'), 'lbl.simNudge');
  assert.equal(nudgeOf(null, 'similarity'), 'lbl.simNudge');
  assert.equal(nudgeOf(withTypes({ 'prove-congruence': { level: 2 } }), 'similarity'), 'lbl.simNudge');
  assert.equal(nudgeOf(withTypes({ 'prove-congruence': { level: 3 } }), 'similarity'), null);
  assert.equal(nudgeOf(withTypes({ 'prove-congruence': { level: 4 } }), 'similarity'), null);
  // a level of similarity begun (a proof done, a walk-through, a warm-up): no longer a first visit
  assert.equal(nudgeOf(withTypes({ 'sim-parts': { done: 1 } }), 'similarity'), null);
  assert.equal(nudgeOf(withTypes({ 'sim-side': { walked: true } }), 'similarity'), null);
  assert.equal(nudgeOf(withTypes({ 'prove-sim': { warm: { done: true, kinds: {} } } }), 'similarity'), null);
  assert.equal(nudgeOf({ v: 1, types: {} }, 'congruence'), null);
  assert.equal(nudgeOf({ v: 1, types: {} }, 'nope'), null);
  // the exact line (spec §9), a draft on the review list
  assert.equal(T['lbl.simNudge'], 'דמיון דומה מאוד להוכחת חפיפה. אפשר להתחיל כאן.');
  assert.ok(NEW_DRAFTS.includes('lbl.simNudge'));
  // a nudge, never a lock: only the similarity subject has one, and it points at an existing level and text
  assert.deepEqual(SUBJECTS.filter((s) => s.nudge).map((s) => s.id), ['similarity']);
  const n = SUBJECTS[1].nudge; assert.ok(typeById(n.after)); assert.ok(T[n.text]);
});

test('meta line: the way to "שולטים בנושא" (a draft), the landing shows it or the seal; the switcher keeps its seal', () => {
  assert.equal(T['lbl.toMastered'], 'עד "שולטים בנושא"');
  assert.ok(NEW_DRAFTS.includes('lbl.toMastered'));
  const s = src('./Topic.jsx');
  assert.match(s, /won \? <span className="prf-subj-won"><IcSeal \/>\{T\['lbl\.mastered'\]\}<\/span> : <span>\{T\['lbl\.toMastered'\]\}<\/span>/);
  assert.match(s, /nudge && <p className="prf-subj-nudge"/);
  assert.match(s, /\{won && <IcSeal className="prf-subj-seal" \/>\}/);           // Task 14's switcher mark, not duplicated
});

test('help-stage tabs: the exam shows לבד, and חימום only while its rescue warm-up runs (key "<exam key> › חימום")', () => {
  for (const id of ['cong-exam', 'sim-exam']) {
    const t = typeById(id);
    assert.ok((t.warm || []).length > 0, id);
    assert.deepEqual(tabsOf(t), [3], id);
    assert.deepEqual(tabsOf(t, true), [0, 3], id);
    assert.equal(TABS[0], 'חימום');
  }
  for (const id of ['read-given', 'then-conclusion', 'sim-parts', 'sim-calc']) assert.deepEqual(tabsOf(typeById(id)), [0, 1, 2, 3], id);
  assert.deepEqual(tabsOf({ warm: [], shape: 'prove' }), [1, 2, 3]);              // a level without warm-up kinds: no חימום
  assert.deepEqual(tabsOf({ warm: [], shape: 'exam' }, true), [3]);
  const s = src('./ProofChapter.jsx');
  assert.match(s, /const shownTabs = tabsOf\(type, !!warm\);/);
  assert.match(s, /if \(!shownTabs\.includes\(i\)\) return null;/);
});

test('startProof: the tab and the open proof use the forced level (the exam: 3, a walk-through: 1), not the argument', () => {
  const s = src('./ProofChapter.jsx'), body = s.slice(s.indexOf('function startProof('), s.indexOf('function startWarm('));
  assert.match(body, /let lv = isExam \? 3 : level;/);
  assert.match(body, /setTab\(lv\)/);
  assert.match(body, /setOpen\(\{ key: \+\+n\.current, problem, view, level: lv,/);
  assert.doesNotMatch(body, /setTab\(level\)/);
});

test('texts: "כמו במבחן" (never "בבחינה"); the congruence exam line does not promise ג; the topic line names both subjects', async () => {
  for (const k of ['about.cong-exam', 'about.sim-exam']) { assert.match(T[k], /כמו במבחן/, k); assert.doesNotMatch(T[k], /בבחינה/, k); assert.ok(NEW_DRAFTS.includes(k), k); }
  const { CHAPTER_INFO, TOPIC_INFO } = await import('../../home/chapterInfo.js');
  const ci = CHAPTER_INFO.proofs;
  assert.equal(ci['5. חפיפה – כמו במבחן'], 'שאלה כמו במבחן: שרטוט אחד וכמה סעיפים, בלי עזרה');
  assert.doesNotMatch(ci['5. חפיפה – כמו במבחן'], /א־ב־ג/);
  assert.equal(TOPIC_INFO.proofs, 'בונים הוכחות שורה אחרי שורה, טענה ונימוק: חפיפת משולשים ודמיון משולשים');
});

test('altitude demo: the foot sits well inside its side (30%–70% along it), never near a corner', () => {
  const d = demoOf('congruence', 'altitude'), p = d.problem, f = p.facts[d.marks[0]], P = p.figure.points;
  assert.equal(f.right, true);
  const E = f.x.v, B = f.x.r[1], C = f.y.r[1];
  const along = Math.hypot(P[E][0] - P[B][0], P[E][1] - P[B][1]) / Math.hypot(P[C][0] - P[B][0], P[C][1] - P[B][1]);
  assert.ok(along >= 0.3 && along <= 0.7, `the foot is ${Math.round(along * 100)}% along ${B}${C}`);
});

test('a similarity row with no justification at all is "leans on a row not proved yet", never the neutral note forever', () => {
  const t = typeById('prove-sim'), p = t.make(makeR(seeded(7)), 3, 'B', { recent: [], last: null }, { only: '8-P-CC2' });
  assert.equal(p.template, '8-P-CC2');
  // as made: a1 leans only on the parallel given → "only the order is missing", a neutral note
  assert.deepEqual([classify(p, [], p.facts.a1).c, classify(p, [], p.facts.a1).textKey], ['note', 'st.needFirst']);
  // the same row with no justification: a too-early row, not a note
  const bare = { ...p, just: { ...p.just, a1: [] } };
  const c = classify(bare, [], p.facts.a1);
  assert.notEqual(c.textKey, 'st.needFirst');
  assert.deepEqual([c.c, c.textKey], ['early', 'st.needRow']);
});
