/* node --test src/topics/proofs/subjects.test.mjs
   The subjects layer (spec 2026-11-23 §5): subjects → levels (types) → help stages. Keys never change,
   each type knows its subject, label and shape, present() is unchanged for the four congruence types,
   and progress saved before the change loads exactly as before. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { TYPES, typeById } from './types/index.js';
import { SUBJECTS, subjectOf, levelNo, typesOf, prevInSubject, canShow, lawsOf, demoOf } from './subjects.js';
import { shapeOf, present, decisionsOf, acceptedReasons, roleOf, congOf } from './core.js';
import { REASONS, isLaw } from './reasons.js';
import { T, fill, NEW_DRAFTS } from './texts.js';
import { load, save, emptyType, KEY } from './mastery.js';
import { snapshot, start, restore } from './session.js';

const CONG = ['read-given', 'congruent-parts', 'prove-congruence', 'then-conclusion'];
const WORDS = ['midpoint', 'bisector', 'median', 'altitude'];
const mk = (type, seed = 20261123, level = 1, variant = 'A', counted = 0) =>
  type.make(makeR(seeded(seed)), level, variant, { recent: [], last: null }, { counted, words: WORDS });

test('buttons: unique, and the four congruence buttons are exactly the stored keys', () => {
  const b = TYPES.map((t) => t.button);
  assert.equal(new Set(b).size, b.length);
  assert.deepEqual(typesOf('congruence').map((t) => t.button), ['1. קוראים את הנתון', '2. מחפיפה לשוויונות', '3. הוכחת חפיפה', '4. חפיפה ואז מסקנה']);
});
test('every type: subject, label (= today\'s visible name), shape, live', () => {
  const SH = { 'read-given': 'given', 'congruent-parts': 'parts', 'prove-congruence': 'prove', 'then-conclusion': 'then' };
  for (const t of TYPES) {
    assert.ok(SUBJECTS.some((s) => s.id === t.subject), t.id);
    assert.ok(['given', 'parts', 'side', 'prove', 'then', 'exam'].includes(t.shape), t.id);
    assert.equal(typeof t.live, 'boolean', t.id);
    assert.equal(typeof t.label, 'string', t.id);
  }
  for (const id of CONG) {
    const t = typeById(id);
    assert.equal(t.subject, 'congruence'); assert.equal(t.label, T[`type.${id}`]); assert.equal(t.live, true); assert.equal(t.shape, SH[id]);
  }
});
test('SUBJECTS: two, Ministry order, names and months from texts', () => {
  assert.deepEqual(SUBJECTS.map((s) => s.id), ['congruence', 'similarity']);
  const [c, s] = SUBJECTS;
  assert.deepEqual([c.name, c.when, c.short, c.live], ['חפיפת משולשים', 'ינואר–פברואר', 'חפיפה', true]);
  assert.deepEqual([s.name, s.when, s.short, s.live], ['דמיון משולשים', 'מרץ–אפריל', 'דמיון', false]);
  assert.deepEqual(c.types, CONG); assert.deepEqual(s.types, []); assert.deepEqual(s.theorems, []); assert.equal(s.hero, null);
  assert.deepEqual(c.theorems, ['sas', 'asa', 'sss', 'vertical', 'common-side', 'cp-sides', 'cp-angles', 'bisector', 'median', 'midpoint', 'altitude']);
  for (const r of c.theorems) assert.ok(r in REASONS, r);
  assert.deepEqual(c.hero, { type: 'prove-congruence', template: '3-X-SAS', seed: 20261121 });
  const hp = typeById(c.hero.type).remake({ template: c.hero.template, seed: c.hero.seed, level: 1, variant: 'A', meta: null });
  assert.equal(hp.template, '3-X-SAS');
  for (const sub of SUBJECTS) { assert.equal(typeof sub.demos, 'object'); for (const id of sub.types) assert.equal(typeById(id).subject, sub.id); }
  // every type is in exactly one subject's list
  assert.deepEqual(SUBJECTS.flatMap((x) => x.types).sort(), TYPES.map((t) => t.id).sort());
});
test('subjectOf, levelNo, typesOf, prevInSubject', () => {
  assert.equal(subjectOf('then-conclusion').id, 'congruence'); assert.equal(subjectOf('nope'), null);
  assert.deepEqual(CONG.map(levelNo), [1, 2, 3, 4]); assert.equal(levelNo('prove-congruence'), 3); assert.equal(levelNo('nope'), 0);
  assert.deepEqual(typesOf('congruence').map((t) => t.id), CONG); assert.deepEqual(typesOf('similarity'), []); assert.deepEqual(typesOf('nope'), []);
  assert.equal(prevInSubject('read-given'), null);
  assert.equal(prevInSubject('prove-congruence').id, 'congruent-parts'); assert.equal(prevInSubject('nope'), null);
});
test('canShow: live, or the review frame, or a local / preview host', () => {
  const off = { live: false }, on = { live: true };
  const env = (host, framed = false) => ({ host, framed });
  assert.equal(canShow(off, env('mathix-sooty.vercel.app')), false);
  assert.equal(canShow(off, env('mathproject-gamma.vercel.app')), false);
  assert.equal(canShow(off, env('localhost')), true);
  assert.equal(canShow(off, env('127.0.0.1')), true);
  assert.equal(canShow(off, env('mathix-git-x-abed-shalgams-projects.vercel.app')), true);
  assert.equal(canShow(off, env('mathix-sooty.vercel.app', true)), true);
  assert.equal(canShow(off, env('evil-mathix-git-x-abed-shalgams-projects.vercel.app')), false);
  assert.equal(canShow(off, env('mathix-git-x-abed-shalgams-projects.vercel.app.evil.com')), false);
  assert.equal(canShow(off, {}), false);
  assert.equal(canShow(off, null), false); assert.equal(canShow({}, null), true);   // live defaults to true
  assert.equal(canShow(on, env('mathix-sooty.vercel.app')), true);
  assert.equal(canShow(SUBJECTS[1], env('mathix-sooty.vercel.app')), false);
  assert.equal(canShow(SUBJECTS[0], env('mathix-sooty.vercel.app')), true);
});
test('shapeOf: every existing problem, made or restored from a snapshot, has its type\'s shape', () => {
  for (const id of CONG) {
    const t = typeById(id);
    for (const [level, variant] of [[1, 'A'], [2, 'B'], [3, 'A']]) {
      const p = mk(t, 7 + level, level, variant);
      assert.equal(shapeOf(p), t.shape, `${id} made`);
      const s = start(p, present(p, level, variant, { R: makeR(seeded(1)) }));
      const back = restore(snapshot(s), (meta) => t.remake(meta));
      assert.ok(back, `${id} restored`);
      assert.equal(shapeOf(back.problem), t.shape, `${id} restored`);
    }
    assert.equal(shapeOf({ type: id }), t.shape);
  }
  assert.equal(shapeOf({ type: 'whatever', shape: 'exam' }), 'exam');
});
test('old storage loads unchanged (4 congruence types at levels 2, 3, 4, 1)', () => {
  const m = {}, store = { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } };
  const types = {};
  CONG.forEach((id, i) => { types[id] = { ...emptyType(), level: [2, 3, 4, 1][i], walked: i % 2 === 0, done: 3 + i, recent: ['3-X-SAS'] }; });
  types['then-conclusion'].warm = { done: true, kinds: { W2: [1, 0, 1] } };
  const saved = { v: 1, types };
  m[KEY + 'g'] = JSON.stringify(saved);
  assert.deepEqual(load(store, 'g'), saved);
  assert.equal(save(store, 'g', load(store, 'g')), true);
  assert.equal(m[KEY + 'g'], JSON.stringify(saved));
});
/* recorded on the code BEFORE this change (2026-11-23, seed 20261123, avoid empty):
   "<level><variant><counted>:mode/steps/chipsN/pre/known/tiles/plan/letters ties/decisions" */
const BEFORE = {
  'read-given': '1A0:walk/2/3/0/0/0/null/00/1 1A2:walk/2/3/0/0/0/null/00/1 1B0:fill/2/4/0/0/0/null/00/2 1B2:fill/2/4/0/0/0/null/00/2 2A0:tiles/2/6/0/0/4/null/00/4 2A2:tiles/2/6/0/0/4/null/00/4 2B0:tiles/2/6/0/0/6/null/00/4 2B2:tiles/2/6/0/0/6/null/00/4 3A0:tap/2/null/0/0/0/null/00/4 3A2:tap/2/null/0/0/0/null/00/4 3B0:tap/2/null/0/0/0/null/00/4 3B2:tap/2/null/0/0/0/null/00/4',
  'congruent-parts': '1A0:walk/3/3/1/1/0/null/10/1 1A2:walk/3/3/1/1/0/null/10/1 1B0:fill/3/4/1/1/0/null/10/3 1B2:fill/3/4/1/1/0/null/10/3 2A0:tiles/3/4/1/1/4/null/00/6 2A2:tiles/3/4/1/1/4/null/00/6 2B0:tiles/3/6/1/1/6/null/00/6 2B2:tiles/3/6/1/1/6/null/00/6 3A0:tap/3/null/1/1/0/null/00/6 3A2:tap/3/null/1/1/0/null/00/6 3B0:tap/3/null/1/1/0/null/00/6 3B2:tap/3/null/1/1/0/null/00/6',
  'prove-congruence': '1A0:walk/4/3/0/0/0/null/01/1 1A2:walk/4/3/0/0/0/null/01/1 1B0:fill/2/4/2/0/0/null/00/2 1B2:fill/2/4/2/0/0/null/00/3 2A0:tiles/2/6/2/0/2/null/00/4 2A2:tiles/2/6/2/0/2/null/00/4 2B0:tiles/4/8/0/0/6/null/00/8 2B2:tiles/4/8/0/0/6/null/00/8 3A0:tap/4/null/0/0/0/line/00/8 3A2:tap/4/null/0/0/0/line/00/8 3B0:tap/4/null/0/0/0/null/00/8 3B2:tap/4/null/0/0/0/null/00/8',
  'then-conclusion': '1A0:walk/5/3/0/0/0/tris/01/1 1A2:walk/5/3/0/0/0/tris/01/1 1B0:fill/3/4/2/0/0/tris/00/3 1B2:fill/3/4/2/0/0/tris/00/4 2A0:tiles/3/6/2/0/3/tris/00/6 2A2:tiles/3/6/2/0/3/tris/00/6 2B0:tiles/5/8/0/0/7/tris/00/10 2B2:tiles/5/8/0/0/7/tris/00/10 3A0:tap/5/null/0/0/0/line/00/10 3A2:tap/5/null/0/0/0/line/00/10 3B0:tap/5/null/0/0/0/null/00/10 3B2:tap/5/null/0/0/0/null/00/10',
};
test('present() is unchanged for the four congruence types (snapshot taken before the change)', () => {
  for (const id of CONG) {
    const t = typeById(id), row = [];
    for (const l of [1, 2, 3]) for (const v of ['A', 'B']) for (const c of [0, 2]) {
      const R = makeR(seeded(20261123));
      const p = t.make(R, l, v, { recent: [], last: null }, { counted: c, words: WORDS });
      const w = present(p, l, v, { counted: c, R });
      row.push(`${l}${v}${c}:${w.mode}/${w.steps.length}/${w.chipsN}/${w.pre.length}/${w.known.length}/${w.tiles.length}/${w.plan}/${+w.letters}${+w.ties}/${decisionsOf(w)}`);
    }
    assert.equal(row.join(' '), BEFORE[id], id);
  }
});
test('texts: help stages, subject names and months, level label (all drafts)', () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => T[`stage.${i}`]), ['חימום', 'מודרך', 'ביחד', 'לבד']);
  assert.equal(T['subj.congruence'], 'חפיפת משולשים'); assert.equal(T['subj.similarity'], 'דמיון משולשים');
  assert.equal(T['subj.short.congruence'], 'חפיפה'); assert.equal(T['subj.short.similarity'], 'דמיון');
  assert.equal(T['subj.when.congruence'], 'ינואר–פברואר'); assert.equal(T['subj.when.similarity'], 'מרץ–אפריל');
  assert.equal(T['lbl.levelN'], 'רמה {n}'); assert.equal(fill('lbl.levelN', { n: 3 }), 'רמה 3');
  for (const k of ['stage.0', 'stage.1', 'stage.2', 'stage.3', 'subj.congruence', 'subj.similarity', 'subj.short.congruence', 'subj.short.similarity', 'subj.when.congruence', 'subj.when.similarity', 'lbl.levelN']) assert.ok(NEW_DRAFTS.includes(k), k);
  // the stored tab keys are untouched
  assert.deepEqual([T['tab.warm'], T['tab.1'], T['tab.2'], T['tab.3']], ['חימום', 'רמה 1', 'רמה 2', 'רמה 3']);
});

/* Task 6 (spec 2026-11-23 §6.2.4–§6.3): the "המשפטים" page. */
test('theorem list: every entry exists with its full sentence; theorems first, then definitions and rules', () => {
  const c = SUBJECTS[0];
  assert.equal(new Set(c.theorems).size, c.theorems.length);
  for (const id of c.theorems) { assert.ok(REASONS[id], id); assert.equal(typeof REASONS[id].full, 'string', id); assert.notEqual(REASONS[id].kind, 'given', id); }
  for (const id of ['sas', 'asa', 'sss', 'vertical', 'bisector', 'median', 'midpoint', 'altitude']) { assert.ok(c.theorems.includes(id)); assert.equal(isLaw(id), true, id); }
  const { laws, more } = lawsOf(c.id);
  assert.deepEqual(laws, ['sas', 'asa', 'sss', 'vertical']);
  assert.deepEqual(more, ['bisector', 'median', 'midpoint', 'altitude', 'common-side', 'cp-sides', 'cp-angles']);
  assert.deepEqual(lawsOf('similarity'), { laws: [], more: [] }); assert.deepEqual(lawsOf('nope'), { laws: [], more: [] });
});
test('theorem list: a reason without its sentence is left out (alternate, until similarity)', () => {
  const fake = { id: 'x', theorems: ['sas', 'alternate', 'nope', 'given', 'median'] };
  assert.deepEqual(lawsOf(fake), { laws: ['sas'], more: ['median'] });
});
test('demos: one per congruence entry; each builds, and its marks are facts that show the pattern honestly', () => {
  const c = SUBJECTS[0];
  assert.deepEqual(Object.keys(c.demos).sort(), [...c.theorems].sort());
  for (const id of c.theorems) {
    const d = demoOf(c.id, id);
    assert.ok(d, id);
    const p = d.problem, f = (m) => p.facts[m];
    assert.equal(p.template, c.demos[id].template, id);
    assert.ok(d.marks.length > 0, id);
    assert.equal(new Set(d.marks).size, d.marks.length, id);
    for (const m of d.marks) assert.ok(f(m), `${id}: ${m}`);
    const kinds = d.marks.map((m) => f(m).kind).sort().join(' ');
    if (['sas', 'asa', 'sss'].includes(id)) {
      // exactly the three equalities the theorem needs, in a proof that uses this theorem
      const j = p.just[congOf(p)].find((x) => x.reasons.includes(id));
      assert.ok(j, id); assert.deepEqual([...d.marks].sort(), [...j.needs].sort(), id);
      assert.equal(kinds, { sas: 'ang seg seg', asa: 'ang ang seg', sss: 'seg seg seg' }[id]);
    } else if (id === 'cp-sides' || id === 'cp-angles') {
      // the two congruent triangles and ONE pair of matching parts
      assert.deepEqual(d.marks.filter((m) => f(m).kind === 'cong'), [congOf(p)], id);
      const rest = d.marks.filter((m) => f(m).kind !== 'cong');
      assert.equal(rest.length, 1, id); assert.equal(f(rest[0]).kind, id === 'cp-sides' ? 'seg' : 'ang'); assert.ok(acceptedReasons(p, rest[0]).includes(id), id);
    } else {
      assert.equal(d.marks.length, 1, id);
      assert.ok(acceptedReasons(p, d.marks[0]).includes(id), id);
      if (id === 'vertical') assert.equal(roleOf(p, d.marks[0]), 'vertical');
      if (id === 'altitude') assert.equal(f(d.marks[0]).right, true);
      if (id === 'common-side') assert.equal(f(d.marks[0]).kind, 'seg');
    }
  }
  assert.equal(demoOf(c.id, 'given'), null); assert.equal(demoOf('similarity', 'sas'), null); assert.equal(demoOf('nope', 'sas'), null);
});
test('texts: the theorem page and sheet (all drafts)', () => {
  assert.equal(T['lbl.laws'], 'המשפטים');
  assert.equal(fill('lbl.lawsIn', { subject: T['subj.congruence'] }), 'המשפטים בחפיפת משולשים');
  for (const k of ['lbl.laws', 'lbl.lawsIn', 'lbl.lawsOf', 'lbl.lawsSub', 'lbl.lawsMore', 'lbl.lawNow', 'lbl.lawFig', 'btn.close']) { assert.ok(T[k], k); assert.ok(NEW_DRAFTS.includes(k), k); }
});
