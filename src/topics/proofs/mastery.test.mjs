/* node --test src/topics/proofs/mastery.test.mjs
   The mastery rule (spec §8): clean proofs, level up, fast track, never down, the rescue ladder,
   A/B variants, the four dots, and device storage that never throws (Review Focus 1, 4). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warmed, RULES, ERR, ERR_WARM, isClean, isPerfect, emptyType, record, variantFor, walked, useForce, dots, lessHelp, load, save, typeState, adoptGuest, seedFromServer, whoKey, KEY, OPEN_KEY, leftRecord, takeRescue } from './mastery.js';

const rec = (n, solo, o = {}) => ({ n, solo, helped: 0, missed: n - solo - (o.filled || 0), filled: o.filled || 0, variant: 'B', tpl: o.tpl || '3-X-SAS', day: 1 });
const run = (ts, level, recs, opt) => { let out; for (const r of recs) { out = record(ts, level, r, opt); ts = out.ts; } return out; };
test('constants are the spec numbers', () => {
  assert.deepEqual([RULES.CLEAN_SOLO, RULES.WINDOW, RULES.NEED, RULES.FAST_MIN_PROOFS, RULES.FAST_MIN_DECISIONS, RULES.RESCUE_STREAK, RULES.STUCK, RULES.MAX_TRIES, RULES.HINT3_WAIT_MS, RULES.IDLE_MS, RULES.ROUND, RULES.WARM_CAP], [0.8, 4, 3, 2, 6, 2, 6, 2, 4000, 20000, 3, 8]);
  assert.equal(ERR_WARM['wrong-theorem'], 'W4'); assert.equal(ERR_WARM['looks-equal'], 'W2'); assert.equal(ERR_WARM['false-statement'], 'W1');
  assert.equal(KEY, 'mp:proofs:v1:'); assert.equal(OPEN_KEY, 'mp:proofs:open');
});
test('clean: 3–4 decisions all alone, 5–9 one slip, 10+ two; never with a filled step', () => {
  assert.equal(isClean(rec(3, 3)), true);  assert.equal(isClean(rec(3, 2)), false); assert.equal(isClean(rec(4, 3)), false);
  assert.equal(isClean(rec(5, 4)), true);  assert.equal(isClean(rec(9, 8)), true);  assert.equal(isClean(rec(9, 7)), false);
  assert.equal(isClean(rec(10, 8)), true); assert.equal(isClean(rec(10, 7)), false);
  assert.equal(isClean({ ...rec(10, 9), missed: 0, filled: 1 }), false);
  assert.equal(isPerfect(rec(4, 4)), true); assert.equal(isPerfect(rec(4, 3)), false);
});
test('level up: 3 clean among the last 4', () => {
  const C = rec(8, 7), N = rec(8, 5);
  assert.equal(run(emptyType(), 1, [N, C, C]).event, null);
  assert.equal(run(emptyType(), 1, [N, C, C, C]).event, 'level-up');
  assert.equal(run(emptyType(), 1, [C, N, C, C]).ts.level, 2);
  assert.equal(run(emptyType(), 1, [C, C, N, N, C]).event, null);          // last 4 = C N N C
});
test('fast track: first proofs all perfect, at least 2 proofs and 6 decisions', () => {
  assert.equal(run(emptyType(), 1, [rec(3, 3), rec(3, 3)]).event, 'level-up');
  assert.equal(run(emptyType(), 1, [rec(2, 2), rec(2, 2)]).event, null);    // 4 decisions
  assert.equal(run(emptyType(), 1, [rec(2, 2), rec(2, 2), rec(2, 2)]).event, 'level-up');
  assert.equal(run(emptyType(), 1, [rec(8, 8)]).event, null);               // one proof
  assert.equal(run(emptyType(), 1, [rec(8, 7), rec(8, 8)]).event, null);    // not "all perfect" → normal rule
});
test('never down; level 3 passed = 4 = type done; uncounted proofs change no level', () => {
  let ts = { ...emptyType(), level: 3 };
  assert.equal(run(ts, 3, [rec(8, 8), rec(8, 8)]).event, 'type-done'); assert.equal(run(ts, 3, [rec(8, 8), rec(8, 8)]).ts.level, 4);
  assert.equal(run(ts, 1, [rec(8, 0, { filled: 3 }), rec(8, 0, { filled: 3 })]).ts.level, 3);
  const u = run(emptyType(), 1, [rec(1, 1), rec(1, 1), rec(1, 1)], { counted: false });
  assert.deepEqual([u.ts.level, u.ts.done, u.ts.hist[1].length], [1, 3, 0]);
});
test('a level-up clears the error counts, the rescue stage and the forced variant', () => {
  let o = record({ ...emptyType(), level: 2 }, 2, rec(8, 4), { errs: { 'wrong-theorem': 2 } });
  o = record(o.ts, 2, rec(8, 4)); assert.equal(o.ts.force, 'A');
  for (let i = 0; i < 3; i++) o = record(o.ts, 2, rec(8, 8));
  assert.equal(o.ts.level, 3); assert.deepEqual([o.ts.errs, o.ts.resc, o.ts.force], [{}, { stage: 0, bad: 0 }, null]);
});
test('rescue ladder: 2 bad → warm-up of the commonest error + variant A; 2 more → worked example; 6 without level-up → kind card', () => {
  const N = rec(8, 4); let o = record({ ...emptyType(), level: 2 }, 2, N, { errs: { 'wrong-theorem': 2, 'too-early': 1 } });
  assert.equal(o.rescue, null);
  o = record(o.ts, 2, N, { errs: { 'wrong-theorem': 1 } });
  assert.deepEqual(o.rescue, { step: 1, warm: 'W4' }); assert.equal(variantFor(o.ts, 2).variant, 'A');
  o = record(o.ts, 2, N); assert.equal(o.rescue, null);
  o = record(o.ts, 2, N); assert.deepEqual(o.rescue, { step: 2 });
  o = record(o.ts, 2, N); o = record(o.ts, 2, N); assert.deepEqual(o.rescue, { step: 3 });
});
test('rescue: a clean proof resets the streak, not the stage; ties pick the earlier kind; no errors → W1', () => {
  const N = rec(8, 4), C = rec(8, 8);
  let o = record({ ...emptyType(), level: 2 }, 2, N, { errs: { 'wrong-matching': 1, 'looks-equal': 1 } });
  o = record(o.ts, 2, N); assert.deepEqual(o.rescue, { step: 1, warm: 'W2' });          // looks-equal comes before wrong-matching
  o = record(o.ts, 2, N); o = record(o.ts, 2, C); assert.equal(o.ts.resc.stage, 1); assert.equal(o.ts.resc.bad, 0);
  o = record({ ...emptyType(), level: 2 }, 2, N); o = record(o.ts, 2, N); assert.deepEqual(o.rescue, { step: 1, warm: 'W1' });
});
test('variants: Level 1 starts with an uncounted walk-through; a new level starts with a counted A', () => {
  assert.deepEqual(variantFor(emptyType(), 1), { variant: 'A', counted: false });
  assert.deepEqual(variantFor({ ...emptyType(), walked: true }, 1), { variant: 'A', counted: true });
  assert.deepEqual(variantFor({ ...emptyType(), walked: true, count: { 1: 1, 2: 0, 3: 0 } }, 1), { variant: 'B', counted: true });
  assert.deepEqual(dots(run(emptyType(), 1, [rec(8, 7), rec(8, 4)]).ts, 1), [true, false, null, null]);
  assert.equal(walked(emptyType()).walked, true); assert.equal(useForce({ ...emptyType(), force: 'A' }).force, null);
});
test('the quiet second line: done count, "less help than last time", recent templates, second chance', () => {
  let o = record(emptyType(), 1, rec(8, 5, { tpl: '3-K-SAS' }), { filledReason: 'vertical' });
  assert.deepEqual([o.ts.done, o.ts.lastHelp, o.ts.recent, o.ts.retry], [1, 3, ['3-K-SAS'], 'vertical']);
  assert.equal(lessHelp(o.ts, rec(8, 6)), true); assert.equal(lessHelp(o.ts, rec(8, 5)), false); assert.equal(lessHelp(emptyType(), rec(8, 8)), false);
  for (let i = 0; i < 8; i++) o = record(o.ts, 1, rec(8, 8, { tpl: `t${i}` }));
  assert.equal(o.ts.recent.length, 6); assert.equal(o.ts.recent[0], 't7'); assert.equal(o.ts.retry, null);
});
const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };
test('storage: junk, a missing store and a throwing store all give empty progress (Review Focus 1)', () => {
  const s = mem(); s.m[KEY + 'g'] = '{not json';
  assert.deepEqual(load(s, 'g'), { v: 1, types: {} });
  s.m[KEY + 'g'] = JSON.stringify({ v: 7, types: 'x' }); assert.deepEqual(load(s, 'g'), { v: 1, types: {} });
  assert.deepEqual(load(null, 'g'), { v: 1, types: {} });
  const boom = { getItem() { throw new Error('private'); }, setItem() { throw new Error('full'); } };
  assert.deepEqual(load(boom, 'g'), { v: 1, types: {} }); assert.equal(save(boom, 'g', { v: 1, types: {} }), false);
  assert.equal(whoKey(null), 'g'); assert.equal(whoKey({ id: 'ab12' }), 'u:ab12');
});
test('storage: a hand-edited type state is cleaned, never trusted blindly', () => {
  const s = mem(); s.m[KEY + 'g'] = JSON.stringify({ v: 1, types: { 'prove-congruence': { level: 'x', hist: { 1: 'no' }, done: -3, recent: [1, '3-K-SAS'] }, 'read-given': 5 } });
  const st = load(s, 'g'), ts = typeState(st, 'prove-congruence');
  assert.deepEqual([ts.level, ts.hist[1], ts.done, ts.recent], [1, [], 0, ['3-K-SAS']]);
  assert.deepEqual(typeState(st, 'read-given'), emptyType()); assert.deepEqual(typeState(st, 'nope'), emptyType());
  assert.equal(typeState({ v: 1, types: { a: { level: 9 } } }, 'a').level, 4);
  assert.equal(save(s, 'g', st), true);
});
test('sign-in: the guest progress is copied once into an empty user key', () => {
  const s = mem(); save(s, 'g', { v: 1, types: { 'prove-congruence': { ...emptyType(), level: 2 } } });
  adoptGuest(s, 'ab12'); assert.equal(load(s, 'u:ab12').types['prove-congruence'].level, 2);
  save(s, 'g', { v: 1, types: {} }); adoptGuest(s, 'ab12'); assert.equal(load(s, 'u:ab12').types['prove-congruence'].level, 2);
  assert.doesNotThrow(() => adoptGuest(null, 'x'));
});
test('server seed: highest "רמה N" row wins, never lowers, ignores rows that are not ours (Review Focus 4)', () => {
  const TYPES = [{ id: 'prove-congruence', button: '3. הוכחת חפיפה' }, { id: 'read-given', button: '1. קוראים את הנתון' }];
  const rows = [{ page: 'proofs.html', chapter: '3. הוכחת חפיפה › רמה 2', ok: 3 }, { page: 'proofs.html', chapter: '3. הוכחת חפיפה › חימום' },
    { page: 'triangles.html', chapter: '1. קוראים את הנתון › רמה 3' }, { page: 'proofs.html', chapter: '9. משהו › רמה 3' },
    { page: 'proofs.html', chapter: '1. קוראים את הנתון' }, { page: 'proofs.html', chapter: '1. קוראים את הנתון › רמה 9' }, { page: 'proofs.html', chapter: null }];
  let st = seedFromServer({ v: 1, types: {} }, rows, TYPES);
  assert.equal(st.types['prove-congruence'].level, 2); assert.equal(st.types['prove-congruence'].warm.done, true);
  assert.equal(st.types['read-given'] ? st.types['read-given'].level : 1, 1);
  st = seedFromServer({ v: 1, types: { 'prove-congruence': { ...emptyType(), level: 3 } } }, rows, TYPES);
  assert.equal(st.types['prove-congruence'].level, 3);
  assert.deepEqual(seedFromServer({ v: 1, types: {} }, null, TYPES), { v: 1, types: {} });
  assert.deepEqual(seedFromServer({ v: 1, types: {} }, [null, 7, { page: 'proofs.html', chapter: 5 }], TYPES), { v: 1, types: {} });
});

test('left in the middle: counts as not clean after a non-solo decision, not at all before one', () => {
  assert.equal(leftRecord({ n: 8, decided: [{ state: 'solo' }, { state: 'solo' }] }), null);
  assert.deepEqual(leftRecord({ n: 8, decided: [{ state: 'solo' }, { state: 'missed' }], variant: 'B', tpl: '3-K-SAS', day: 3 }), { n: 8, solo: 1, helped: 0, missed: 7, filled: 0, variant: 'B', tpl: '3-K-SAS', day: 3 });
  assert.equal(isClean(leftRecord({ n: 10, decided: [{ state: 'helped' }] , variant: 'B', tpl: 'x', day: 1 })), false);
});

test('warm-up: done once it is behind the student; answers are kept per kind, history untouched', () => {
  const a = warmed(emptyType(), { W1: [true, false], W4: [true] });
  assert.deepEqual([a.warm.done, a.warm.kinds, a.hist, a.done, a.level], [true, { W1: [1, 0], W4: [1] }, { 1: [], 2: [], 3: [] }, 0, 1]);
  const b = warmed(a, { W1: [true, true, true, true, true, true, true] });
  assert.equal(b.warm.kinds.W1.length, 8); assert.deepEqual(warmed(emptyType()).warm, { done: true, kinds: {} });
  assert.deepEqual(warmed(emptyType(), { W2: 'x' }).warm.kinds, {});
});
test('rescue is queued on the type until the next start, so a proof left in the middle never uses a stage silently (review M3)', () => {
  const left = (decided) => leftRecord({ n: 8, decided, variant: 'B', tpl: '3-K-SAS', day: 2 });
  let o = record({ ...emptyType(), level: 2 }, 2, left([{ state: 'missed' }]), { errs: { 'wrong-theorem': 1 } });
  assert.equal(o.ts.queued, null);
  o = record(o.ts, 2, left([{ state: 'solo' }, { state: 'helped' }]));
  assert.deepEqual([o.rescue, o.ts.queued, o.ts.resc.stage], [{ step: 1, warm: 'W4' }, { step: 1, warm: 'W4' }, 1]);
  const st = { v: 1, types: { 'prove-congruence': o.ts } }, mem = new Map(), store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  save(store, 'g', st); assert.deepEqual(typeState(load(store, 'g'), 'prove-congruence').queued, { step: 1, warm: 'W4' });     // it survives a reload
  const t = takeRescue(o.ts); assert.deepEqual([t.rescue, t.ts.queued, t.ts.resc.stage], [{ step: 1, warm: 'W4' }, null, 1]);
  assert.deepEqual(takeRescue(t.ts).rescue, null);
  o = record(t.ts, 2, rec(8, 4)); o = record(o.ts, 2, rec(8, 4)); assert.deepEqual(o.ts.queued, { step: 2 });              // the next stage, only after step 1 was shown
  for (let i = 0; i < 3; i++) o = record(o.ts, 2, rec(8, 8));
  assert.deepEqual([o.ts.level, o.ts.queued], [3, null]);                                                                       // a level-up drops it
  for (const junk of [{ step: 9 }, { step: 1, warm: 'W9' }, 'x', 7]) assert.equal(typeState({ v: 1, types: { t: { ...emptyType(), queued: junk } } }, 't').queued, null);
});
test('server seeding restores a finished type: 3 clean proofs ("win") at רמה 3 → level 4 (review M11)', async () => {
  const { TYPES } = await import('./types/index.js');
  const row = (win) => ({ page: 'proofs.html', chapter: '3. הוכחת חפיפה › רמה 3', ok: 9, bad: 1, win });
  assert.equal(seedFromServer({ v: 1, types: {} }, [row(3)], TYPES).types['prove-congruence'].level, 4);
  assert.equal(seedFromServer({ v: 1, types: {} }, [row(2)], TYPES).types['prove-congruence'].level, 3);
  assert.equal(seedFromServer({ v: 1, types: {} }, [row('3')], TYPES).types['prove-congruence'].level, 3);
  assert.equal(seedFromServer({ v: 1, types: {} }, [{ ...row(5), chapter: '3. הוכחת חפיפה › רמה 2' }], TYPES).types['prove-congruence'].level, 2);
});

/* Task 13 (spec 2026-11-23 §7.8): the similarity error kinds feed the rescue ladder with the similarity warm-up */
test('similarity errors: ERR order, ERR_WARM, and a calculation slip twice → warm-up S4', () => {
  assert.deepEqual(ERR.slice(-4), ['ratio-flip', 'non-matching-sides', 'calc', 'wrong-parallel-reason']);
  assert.deepEqual(['ratio-flip', 'non-matching-sides', 'calc', 'wrong-parallel-reason'].map((k) => ERR_WARM[k]), ['S2', 'S3', 'S4', 'S1']);
  const N = rec(8, 4);
  let o = record({ ...emptyType(), level: 2 }, 2, N, { errs: { calc: 2 } });
  assert.equal(o.rescue, null);
  o = record(o.ts, 2, N, { errs: { calc: 2 } });
  assert.deepEqual(o.rescue, { step: 1, warm: 'S4' }); assert.deepEqual(o.ts.queued, { step: 1, warm: 'S4' });
  // a level's own warm-up list: an error whose kind the level has not (W5 is a congruence task) goes to the level's twin or its first kind
  o = record({ ...emptyType(), level: 2 }, 2, N, { errs: { 'wrong-matching': 3 }, kinds: ['S1', 'S2', 'W2'] });
  o = record(o.ts, 2, N, { kinds: ['S1', 'S2', 'W2'] }); assert.deepEqual(o.rescue, { step: 1, warm: 'S2' });
  o = record({ ...emptyType(), level: 2 }, 2, N, { errs: { 'false-statement': 1, calc: 1 }, kinds: ['S1', 'S3', 'S4', 'W2'] });
  o = record(o.ts, 2, N, { kinds: ['S1', 'S3', 'S4', 'W2'] }); assert.deepEqual(o.rescue, { step: 1, warm: 'S4' });
  o = record({ ...emptyType(), level: 2 }, 2, N, { kinds: ['S5', 'S2', 'S3', 'W2'] });
  o = record(o.ts, 2, N, { kinds: ['S5', 'S2', 'S3', 'W2'] }); assert.deepEqual(o.rescue, { step: 1, warm: 'S5' });
});
test('a queued rescue: an old W3 card still loads, the S kinds load, anything else is dropped', () => {
  const back = (q) => typeState({ v: 1, types: { t: { ...emptyType(), queued: q } } }, 't').queued;
  assert.deepEqual(back({ step: 1, warm: 'W3' }), { step: 1, warm: 'W3' });
  for (const k of ['S1', 'S2', 'S3', 'S4', 'S5']) assert.deepEqual(back({ step: 1, warm: k }), { step: 1, warm: k });
  for (const k of ['S0', 'S6', 'S', 'W8']) assert.equal(back({ step: 1, warm: k }), null);
  const errs = typeState({ v: 1, types: { t: { ...emptyType(), errs: { calc: 2, 'ratio-flip': 1, nope: 4 } } } }, 't').errs;
  assert.deepEqual(errs, { 'ratio-flip': 1, calc: 2 });
});
