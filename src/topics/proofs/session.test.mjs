/* node --test src/topics/proofs/session.test.mjs
   One proof in progress (spec §8, §9.1): decision states, neutral outcomes, hints, filled steps,
   double taps (Review Focus 2), the end, and the saved open proof. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { start, act, summary, canSwapFree, snapshot, restore, endClean, hintLaw } from './session.js';
import { isClean } from './mastery.js';
import { canonRows, present } from './core.js';
import { xsas } from './fixtures.mjs';
import { seeded, makeR } from '../new/core.js';

const P = xsas();
const V = { mode: 'tiles', pre: [], known: [], steps: canonRows(P).map((r) => ({ fact: r.fact, ask: ['statement', 'reason'] })), tiles: [], chipsN: 8, whyLine: false, autoHint: false, shortFirst: false, plan: null, ties: false, letters: false };
test('states: solo, helped, missed, filled', () => {
  let s = start(P, V), o;
  o = act(s, { t: 'statement', st: P.facts.a }); assert.equal(o.fx[0].cls, 'ok');                       // statement a: solo
  o = act(o.s, { t: 'reason', id: 'vertical' }); assert.deepEqual([o.fx[0].cls, o.fx[0].key], ['err', 'rs.given.vertical']);
  o = act(o.s, { t: 'reason', id: 'vertical' }); assert.deepEqual(o.fx, []);                             // disabled chip
  o = act(o.s, { t: 'reason', id: 'given' });    assert.equal(o.fx[0].cls, 'note');                      // right on try 2: not a tracked ok
  assert.deepEqual(o.s.decisions.map((d) => d.state), ['solo', 'missed']); assert.ok(o.fx.some((f) => f.t === 'mark' && f.fact === 'a'));
  o = act(o.s, { t: 'statement', st: P.facts.c });
  o = act(o.s, { t: 'hint' }); o = act(o.s, { t: 'hint' }); o = act(o.s, { t: 'reason', id: 'vertical' });
  assert.equal(o.s.decisions.at(-1).state, 'helped');
  o = act(o.s, { t: 'statement', st: P.facts.b }); o = act(o.s, { t: 'reason', id: 'sas' }); o = act(o.s, { t: 'reason', id: 'cp-sides' });
  assert.equal(o.s.decisions.at(-1).state, 'filled'); assert.ok(o.fx.some((f) => f.t === 'filled' && f.reason === 'given'));
  assert.deepEqual(o.s.errs, { 'wrong-source': 1, 'too-early': 1, 'goal-as-known': 1 });
});
test('neutral outcomes are not decisions; "too early" is a wrong try', () => {
  let o = act(start(P, V), { t: 'statement', st: { kind: 'seg', x: 'AD', y: 'CB' } });
  assert.deepEqual([o.fx[0].cls, o.fx[0].key, o.s.decisions.length, o.s.nonSolo], ['note', 'st.unprovable', 0, 0]);
  o = act(o.s, { t: 'statement', st: P.facts.goal }); assert.deepEqual([o.fx[0].cls, o.fx[0].key], ['err', 'st.goalEarly']);
  assert.ok(o.fx.some((f) => f.t === 'question')); assert.equal(o.s.nonSolo, 1);
  o = act(o.s, { t: 'statement', st: P.facts.a }); o = act(o.s, { t: 'cancel' }); assert.equal(o.s.pending, null); assert.equal(o.s.done.length, 0);
});
test('a clean run: 10 decisions solo, qed only at the end, a second qed is ignored (Review Focus 2)', () => {
  let s = start(P, V); assert.deepEqual(act(s, { t: 'qed' }).fx, []);
  for (const [f, r] of [['b', 'given'], ['a', 'given'], ['c', 'vertical'], ['cong', 'sas'], ['goal', 'cp-sides']]) { s = act(s, { t: 'statement', st: P.facts[f] }).s; s = act(s, { t: 'reason', id: r }).s; }
  assert.deepEqual(summary(s), { n: 10, solo: 10, helped: 0, missed: 0, filled: 0 });
  const e = act(s, { t: 'qed' }); assert.deepEqual(e.fx, [{ t: 'end', clean: true }]); assert.deepEqual(act(e.s, { t: 'qed' }).fx, []);
});
test('Level 3-B: the first wrong reason is short, the second explains', () => {
  let o = act(start(P, { ...V, mode: 'tap', shortFirst: true }), { t: 'statement', st: P.facts.a });
  o = act(o.s, { t: 'reason', id: 'vertical' }); assert.equal(o.fx[0].key, 'rs.short');
  o = act(o.s, { t: 'reason', id: 'common-side' }); assert.equal(o.fx[0].key, 'rs.given.common'); assert.equal(o.s.decisions.at(-1).state, 'filled');
});
test('restore: junk gives null', () => { assert.equal(restore('{', () => P), null); assert.equal(restore(JSON.stringify({ v: 0 }), () => P), null); });

/* ── more of §8 / §9.1 ── */
test('double taps: the same tile twice, a statement while a row waits for its reason (Review Focus 2)', () => {
  let o = act(start(P, V), { t: 'statement', st: { kind: 'seg', x: 'AO', y: 'CO' } });
  assert.equal(o.fx[0].cls, 'err'); const again = act(o.s, { t: 'statement', st: { kind: 'seg', x: 'CO', y: 'AO' } });
  assert.deepEqual(again.fx, []); assert.equal(again.s, o.s);
  o = act(o.s, { t: 'statement', st: P.facts.a }); const twice = act(o.s, { t: 'statement', st: P.facts.a });
  assert.deepEqual(twice.fx, []); assert.equal(o.s.decisions.length, 1);
});
test('cancel keeps a reason decision\'s wrong tries; re-placing the row is not a new decision', () => {
  let o = act(start(P, V), { t: 'statement', st: P.facts.a });
  o = act(o.s, { t: 'reason', id: 'vertical' }); o = act(o.s, { t: 'cancel' });
  o = act(o.s, { t: 'statement', st: P.facts.a }); assert.equal(o.fx[0].cls, 'note'); assert.equal(o.s.decisions.length, 1);
  assert.deepEqual(o.s.cur.wrong, ['vertical']);
  o = act(o.s, { t: 'reason', id: 'given' }); assert.deepEqual(o.s.decisions.map((d) => d.state), ['solo', 'missed']);
});
test('hints: rung 1 is free, rung 2 makes "helped", rung 3 fills the step and shows the full reason', () => {
  let o = act(start(P, V), { t: 'hint' });
  assert.deepEqual([o.fx[0].t, o.fx[0].rung, o.fx[0].key], ['hint', 1, 'hint.given.1']); assert.deepEqual(o.fx[0].parts, ['AO', 'OB']);
  assert.equal(o.s.nonSolo, 0);
  o = act(o.s, { t: 'statement', st: P.facts.a }); o = act(o.s, { t: 'reason', id: 'given' });
  o = act(o.s, { t: 'statement', st: P.facts.b }); o = act(o.s, { t: 'hint' }); assert.equal(o.fx[0].key, 'hint.given-more.1');
  o = act(o.s, { t: 'reason', id: 'given' });
  o = act(o.s, { t: 'statement', st: P.facts.c }); o = act(o.s, { t: 'hint' }); assert.deepEqual(o.fx[0].vars, { pt: 'O' });
  o = act(o.s, { t: 'hint' }); assert.equal(o.s.nonSolo, 1); o = act(o.s, { t: 'hint' });
  assert.ok(o.fx.some((f) => f.t === 'filled' && f.reason === 'vertical')); assert.ok(o.fx.some((f) => f.t === 'fb' && f.key === 'ui.filled' && f.vars.reason === 'זוויות קדקודיות שוות זו לזו'));
  assert.deepEqual(o.s.decisions.map((d) => d.state), ['solo', 'solo', 'solo', 'solo', 'solo', 'filled']);
});
test('the why effect names the theorem / definition of the row (law); a given row has none', () => {
  const W = { ...V, whyLine: true };
  let o = act(start(P, W), { t: 'statement', st: P.facts.a }); o = act(o.s, { t: 'reason', id: 'given' });
  const g = o.fx.find((f) => f.t === 'why'); assert.equal(g.key, 'why.given'); assert.equal('law' in g, false);
  o = act(o.s, { t: 'statement', st: P.facts.c }); o = act(o.s, { t: 'reason', id: 'vertical' });
  assert.equal(o.fx.find((f) => f.t === 'why').law, 'vertical');
  o = act(o.s, { t: 'statement', st: P.facts.b }); o = act(o.s, { t: 'reason', id: 'given' });
  o = act(o.s, { t: 'statement', st: P.facts.cong }); o = act(o.s, { t: 'reason', id: 'sas' });
  assert.deepEqual([o.fx.find((f) => f.t === 'why').key, o.fx.find((f) => f.t === 'why').law], ['why.sas', 'sas']);
});
test('two wrong statements: the app places the expected row; the label names the decision kind', () => {
  let o = act(start(P, V), { t: 'statement', st: { kind: 'seg', x: 'AO', y: 'CO' } });
  assert.equal(o.s.cur.label, 'טענה · נתון');
  o = act(o.s, { t: 'statement', st: P.facts.e1 });
  assert.ok(o.fx.some((f) => f.t === 'filled' && f.fact === 'a' && f.reason === null));
  assert.deepEqual([o.s.decisions[0].state, o.s.decisions[0].label, o.s.pending.fact, o.s.cur.label], ['filled', 'טענה · נתון', 'a', 'נימוק · נתון']);
  assert.deepEqual(o.s.errs, { 'false-statement': 1, 'looks-equal': 1 });
});
test('Level 1 walk-through: the app writes rows on "next"; the one gap is the theorem', () => {
  const R = makeR(seeded(4)), view = present(P, 1, 'A', { R });
  let s = start(P, view), o;
  assert.equal(act(s, { t: 'reason', id: 'sas' }).fx.length, 0);                      // nothing is open yet
  for (let i = 0; i < 3; i++) { o = act(s, { t: 'next' }); s = o.s; assert.ok(o.fx.some((f) => f.t === 'mark')); assert.ok(o.fx.some((f) => f.t === 'why')); }
  o = act(s, { t: 'next' }); s = o.s; assert.equal(s.cur.label, 'נימוק · משפט חפיפה'); assert.deepEqual(act(s, { t: 'next' }).fx, []);
  o = act(s, { t: 'reason', id: 'asa' }); assert.ok(o.fx.some((f) => f.t === 'hint' && f.rung === 1));      // autoHint
  o = act(o.s, { t: 'reason', id: 'sas' }); s = o.s; assert.equal(s.decisions.length, 1);
  o = act(s, { t: 'next' }); s = o.s; assert.deepEqual(act(s, { t: 'qed' }).fx, [{ t: 'end', clean: false }]);   // its one decision was missed: not clean (the mastery rule)
});
test('Level 1-B fill: given rows arrive written; the gaps come in order; a statement gap among options', () => {
  const R = makeR(seeded(4)), view = present(P, 1, 'B', { counted: 2, R });
  let s = start(P, view);
  assert.deepEqual(s.done, ['a', 'b']); assert.equal(s.cur.fact, 'c');
  s = act(s, { t: 'reason', id: 'vertical' }).s; s = act(s, { t: 'reason', id: 'sas' }).s;
  assert.equal(s.cur.kind, 'statement'); const opts = view.steps.find((x) => x.fact === 'goal').options;
  const wrong = opts.find((x) => x !== P.facts.goal && JSON.stringify(x) !== JSON.stringify(P.facts.goal));
  let o = act(s, { t: 'statement', st: wrong }); assert.equal(o.fx[0].cls, 'err');
  o = act(o.s, { t: 'statement', st: P.facts.goal }); o = act(o.s, { t: 'reason', id: 'cp-sides' });
  assert.deepEqual(summary(o.s), { n: 4, solo: 3, helped: 0, missed: 1, filled: 0 });
  assert.deepEqual(act(o.s, { t: 'qed' }).fx, [{ t: 'end', clean: false }]);   // 3 of 4 solo is under 80%: not clean
});
test('Level 3: the congruence row is a vertex matching (one decision, its own label)', () => {
  let s = start(P, { ...V, mode: 'tap' });
  for (const [f, r] of [['a', 'given'], ['c', 'vertical'], ['b', 'given']]) { s = act(s, { t: 'statement', st: P.facts[f] }).s; s = act(s, { t: 'reason', id: r }).s; }
  let o = act(s, { t: 'matching', tri1: ['A', 'O', 'C'], order: ['D', 'O', 'B'] });
  assert.deepEqual([o.fx[0].cls, o.fx[0].key, o.s.cur.label], ['err', 'st.matchingSide', 'התאמת קודקודים']);
  o = act(o.s, { t: 'matching', tri1: ['B', 'O', 'D'], order: ['A', 'O', 'C'] });
  assert.deepEqual([o.s.decisions.at(-1).label, o.s.decisions.at(-1).state, o.s.pending.fact], ['התאמת קודקודים', 'missed', 'cong']);
});
test('a filled step makes the end not clean; swap is free only before the first non-solo decision', () => {
  let s = start(P, V); assert.equal(canSwapFree(s), true);
  s = act(s, { t: 'statement', st: P.facts.a }).s; assert.equal(canSwapFree(s), true);
  s = act(s, { t: 'hint' }).s; s = act(s, { t: 'hint' }).s; assert.equal(canSwapFree(s), false); s = act(s, { t: 'hint' }).s;
  for (const [f, r] of [['b', 'given'], ['c', 'vertical'], ['cong', 'sas'], ['goal', 'cp-sides']]) { s = act(s, { t: 'statement', st: P.facts[f] }).s; s = act(s, { t: 'reason', id: r }).s; }
  assert.deepEqual(act(s, { t: 'qed' }).fx, [{ t: 'end', clean: false }]);
});
test('snapshot / restore: an open proof survives a refresh', () => {
  let s = start(P, V); s = act(s, { t: 'statement', st: P.facts.a }).s; s = act(s, { t: 'reason', id: 'vertical' }).s;
  const back = restore(snapshot(s), (meta) => (meta.id === P.id ? xsas() : null));
  assert.deepEqual([back.done, back.pending, back.cur.wrong, back.decisions.length], [[], { fact: 'a' }, ['vertical'], 1]);
  assert.equal(act(back, { t: 'reason', id: 'given' }).s.decisions.at(-1).state, 'missed');
  assert.equal(restore(snapshot(s), () => null), null);
  assert.equal(restore(JSON.stringify({ v: 1, id: P.id, state: { done: 'x' } }), () => xsas()), null);
});
test('clean at the end is the mastery rule (review I1): 2 of 8 decisions missed is not clean, 2 of 10 is', () => {
  const V8 = { ...V, pre: ['b'], steps: V.steps.filter((x) => x.fact !== 'b') };
  let s = start(P, V8);
  s = act(s, { t: 'statement', st: P.facts.a }).s; s = act(s, { t: 'reason', id: 'vertical' }).s; s = act(s, { t: 'reason', id: 'given' }).s;   // missed
  s = act(s, { t: 'statement', st: P.facts.c }).s; s = act(s, { t: 'reason', id: 'given' }).s; s = act(s, { t: 'reason', id: 'vertical' }).s;   // missed
  for (const [f, r] of [['cong', 'sas'], ['goal', 'cp-sides']]) { s = act(s, { t: 'statement', st: P.facts[f] }).s; s = act(s, { t: 'reason', id: r }).s; }
  const sum = summary(s); assert.deepEqual(sum, { n: 8, solo: 6, helped: 0, missed: 2, filled: 0 });
  assert.equal(isClean(sum), false); assert.equal(endClean(s), false);
  assert.deepEqual(act(s, { t: 'qed' }).fx, [{ t: 'end', clean: false }]);
  let t = start(P, V);
  t = act(t, { t: 'statement', st: P.facts.a }).s; t = act(t, { t: 'reason', id: 'vertical' }).s; t = act(t, { t: 'reason', id: 'given' }).s;
  t = act(t, { t: 'statement', st: P.facts.c }).s; t = act(t, { t: 'reason', id: 'given' }).s; t = act(t, { t: 'reason', id: 'vertical' }).s;
  for (const [f, r] of [['b', 'given'], ['cong', 'sas'], ['goal', 'cp-sides']]) { t = act(t, { t: 'statement', st: P.facts[f] }).s; t = act(t, { t: 'reason', id: r }).s; }
  assert.deepEqual(summary(t), { n: 10, solo: 8, helped: 0, missed: 2, filled: 0 });
  assert.deepEqual(act(t, { t: 'qed' }).fx, [{ t: 'end', clean: true }]);
});

/* Task 6 (spec 2026-11-23 §6.2.6): a rung-2 hint that names a theorem / definition carries it (`law`), and the sheet shows its sentence. */
test('hints: rung 2 carries the law it names; never the chip of the open reason decision; rung 1 never', async () => {
  // vertical angles: while the STATEMENT is open the theorem's sentence comes with the hint; while its REASON is open it would name the chip
  // an ordered view (fill), so the open decision is the vertical-angles row
  let o, s;
  const VF = { ...V, mode: 'fill', steps: canonRows(P).map((r) => ({ fact: r.fact, ask: ['statement', 'reason'], options: [P.facts[r.fact]] })) };
  s = start(P, VF);
  for (const f of canonRows(P).map((r) => r.fact)) {
    if (f === 'c') break;
    s = act(s, { t: 'statement', st: P.facts[f] }).s; s = act(s, { t: 'reason', id: 'given' }).s;
  }
  o = act(s, { t: 'hint' }); assert.deepEqual([o.fx[0].key, o.fx[0].law], ['hint.vertical.1', undefined]);
  o = act(o.s, { t: 'hint' }); assert.deepEqual([o.fx[0].key, o.fx[0].law], ['hint.vertical.2', 'vertical']);
  s = act(s, { t: 'statement', st: P.facts.c }).s; assert.equal(s.cur.kind, 'reason');
  o = act(s, { t: 'hint' }); o = act(o.s, { t: 'hint' }); assert.deepEqual([o.fx[0].key, o.fx[0].law], ['hint.vertical.2', undefined]);
  // a given in words: rung 1 already named the word, rung 2 quotes its definition (statement and reason alike)
  const { typeById } = await import('./types/index.js');
  const t = typeById('read-given'), p = t.remake({ template: '1-a', seed: 20261124, level: 2, variant: 'A', meta: null });
  const rows = canonRows(p), vf = { ...V, mode: 'fill', steps: rows.map((r) => ({ fact: r.fact, ask: ['statement', 'reason'], options: [p.facts[r.fact]] })) };
  s = start(p, vf);
  o = act(s, { t: 'hint' }); assert.deepEqual([o.fx[0].key, o.fx[0].law], ['hint.given-words.1', undefined]);
  o = act(o.s, { t: 'hint' }); assert.deepEqual([o.fx[0].key, o.fx[0].law], ['hint.given-words.2', rows[0].reason]);
  s = act(s, { t: 'statement', st: p.facts[rows[0].fact] }).s; assert.equal(s.cur.kind, 'reason');
  o = act(s, { t: 'hint' }); o = act(o.s, { t: 'hint' }); assert.deepEqual([o.fx[0].key, o.fx[0].law], ['hint.given-words.2', rows[0].reason]);
  // no other role carries one (the congruence hint must not name the theorem)
  for (const r of ['given', 'given-more', 'common', 'congruence', 'matching', 'conclusion', 'partner']) assert.equal(hintLaw(r, 'statement', P, 'cong'), null, r);
});

/* ── Task 11 (spec 2026-11-23 §7.5–§7.6): the number row, the keypad's raw text, pair tapping, similarity hints ── */
const { TYPES: ALL_TYPES } = await import('./types/index.js');
const { RULES: RL } = await import('./mastery.js');
const { ready: isReady, numberOf } = await import('./session.js');
const { holds: holdsIn, flipOf, workOf, anchorOf, roleOf, acceptedReasons, provable, checkProp, isDone: coreDone } = await import('./core.js');
const { T: TX } = await import('./texts.js');
const typeOf = (id) => ALL_TYPES.find((t) => t.id === id);
/* every template a level may show at a help stage (crossed matchings only at לבד, variant B) */
const tplsOf = (type, level, variant) => type.templates.filter((t) => !t.crossed || (level === 3 && variant === 'B')).filter((t) => !(type.id === 'sim-side' && variant === 'A' && t.family !== 'P')).map((t) => t.id);
const SIM_TYPES = ALL_TYPES.filter((t) => t.subject === 'similarity');
const simProblem = (id, level, variant, seed = 5, ctx = {}) => { const R = makeR(seeded(seed)); const p = typeOf(id).make(R, level, variant, { recent: [], last: null }, ctx); return { p, view: present(p, level, variant, { counted: 2, R }) }; };
/* play the canon rows until the number row is open */
function toNumber(p, view) {
  let s = start(p, view);
  for (let g = 0; g < 80; g++) {
    const c = s.cur, f = c && (c.fact || c.expect);
    if (c && c.kind === 'statement' && p.facts[f].kind === 'val') return s;
    const o = act(s, canonAction(s)); assert.notEqual(o.s, s, `${p.id} stuck before the number`); s = o.s;
  }
  throw new Error('no number row');
}
/* the canon answer to whatever is open: the first accepted reason whose rows are written, the row's own statement,
   the vertex order as a matching (לבד), a ratio pair by pair (לבד), the number as typed text (ביחד, לבד) */
function canonAction(s) {
  const p = s.problem, c = s.cur, mode = s.view.mode;
  if (!c) return mode === 'walk' && s.stepI < s.view.steps.length ? { t: 'next' } : { t: 'qed' };
  const fact = c.fact || c.expect, f = p.facts[fact];
  if (c.kind === 'reason') return { t: 'reason', id: p.just[fact].find((j) => j.needs.every((n) => s.done.includes(n))).reasons[0] };
  if (f.kind === 'val') return mode === 'tiles' || mode === 'tap' ? { t: 'number', text: String(f.v) } : { t: 'statement', st: f };
  if (f.kind === 'prop' && mode === 'tap') { const at = (c.pairs || []).length; return { t: 'pair', a: f.pairs[at][0], b: f.pairs[at][1] }; }
  if (mode === 'tap' && fact === anchorOf(p)) return { t: 'matching', tri1: f.map.map((m) => m[0]), order: f.map.map((m) => m[1]) };
  return { t: 'statement', st: f };
}

test('RULES.MAX_TRIES_NUM = 3; a number row at מודרך: the right chip → fb ok, the row is written by "פתרון הפרופורציה"', () => {
  assert.equal(RL.MAX_TRIES_NUM, 3); assert.equal(RL.MAX_TRIES, 2);
  const { p, view } = simProblem('sim-side', 1, 'B');
  const s = toNumber(p, view), o = act(s, { t: 'statement', st: p.facts.val });
  assert.deepEqual(o.fx.find((f) => f.t === 'fb'), { t: 'fb', cls: 'ok', key: 'fb.ok', vars: {} });
  assert.deepEqual(o.s.rows.at(-1), { fact: 'val', reason: 'solve', by: 'student' });
  assert.equal(o.s.decisions.at(-1).state, 'solo'); assert.equal(o.s.decisions.at(-1).label, 'טענה · חישוב');
  assert.ok(isReady(o.s));
});
test('a wrong number: the flipped ratio → st.numFlip (ratio-flip); another number → st.numCalc (calc); the same number again is no try', () => {
  for (const [id, level, variant] of [['sim-side', 2, 'A'], ['sim-calc', 2, 'B'], ['sim-calc', 3, 'A'], ['sim-side', 3, 'B']]) {
    const { p, view } = simProblem(id, level, variant, 9);
    const s = toNumber(p, view), flip = flipOf(p, 'val'), x = p.facts.val.v;
    assert.ok(Number.isFinite(flip) && flip !== x, 'a flipped value');
    const a = act(s, { t: 'number', text: String(flip) });
    assert.deepEqual(a.fx.find((f) => f.t === 'fb'), { t: 'fb', cls: 'err', key: 'st.numFlip', vars: {}, kind: 'ratio-flip' });
    assert.equal(a.s.cur.tries, 1); assert.equal(a.s.errs['ratio-flip'], 1);
    // a flipped answer is rarely round: typed to one or two decimals it is still the flipped ratio
    for (const t of [flip.toFixed(1), flip.toFixed(2)]) assert.equal(act(s, { t: 'number', text: String(Number(t)) }).fx.find((f) => f.t === 'fb').key, 'st.numFlip', `${p.id}: ${t}`);
    const slip = [x + 1, x + 2, x + 3].find((v) => v !== flip);
    const b = act(a.s, { t: 'number', text: String(slip) });
    assert.deepEqual(b.fx.find((f) => f.t === 'fb'), { t: 'fb', cls: 'err', key: 'st.numCalc', vars: {}, kind: 'calc' });
    assert.equal(b.s.cur.tries, 2); assert.equal(b.s.errs.calc, 1);
    assert.ok(b.s.cur, 'two wrong numbers do not fill a number row');
    const again = act(b.s, { t: 'number', text: String(slip) });
    assert.equal(again.s.cur.tries, 2); assert.deepEqual(again.fx.map((f) => [f.cls, f.key]), [['note', 'st.numAgain']]);
    const ok = act(b.s, { t: 'number', text: String(x) });
    assert.equal(ok.s.decisions.at(-1).state, 'missed'); assert.equal(ok.fx.find((f) => f.t === 'fb').cls, 'note');
    assert.ok(isReady(ok.s));
  }
});
test('a format slip is a note and uses no try: empty, a lone dot, a leading zero ("06"), more than 6 characters, zero', () => {
  assert.deepEqual(numberOf('7.5'), { v: 7.5 }); assert.deepEqual(numberOf('12'), { v: 12 }); assert.deepEqual(numberOf('0.5'), { v: 0.5 }); assert.deepEqual(numberOf('7.'), { v: 7 });
  const { p, view } = simProblem('sim-side', 2, 'B');
  const s = toNumber(p, view);
  for (const [text, key] of [['', 'st.numEmpty'], ['.', 'st.numDot'], ['06', 'st.numZero'], ['1234567', 'st.numLong'], ['1.2.3', 'st.numDot'], ['0', 'st.numNone'], ['abc', 'st.numDot'], ['00', 'st.numZero']]) {
    const o = act(s, { t: 'number', text });
    assert.notEqual(o.s, s, text); assert.equal(o.s.cur.tries, 0, text); assert.equal(o.s.nonSolo, 0); assert.deepEqual(o.s.errs, {});
    assert.equal(o.fx.length, 1); assert.equal(o.fx[0].cls, 'note'); assert.equal(o.fx[0].key, key, text);
    assert.ok(TX[key], key); fill_(o.fx[0]);
    assert.equal(o.s.decisions.length, s.decisions.length);
  }
  const zero = act(s, { t: 'number', text: '06' }); assert.deepEqual(zero.fx[0].vars, { good: '6', bad: '06' });
  // after the slips the right number is still a solo decision
  const ok = act(act(s, { t: 'number', text: '06' }).s, { t: 'number', text: String(p.facts.val.v) });
  assert.equal(ok.s.decisions.at(-1).state, 'solo');
  // a number is not taken while another row is open
  const early = start(p, view); assert.equal(act(early, { t: 'number', text: '5' }).s, early);
});
function fill_(f) { return fillKey(f.key, f.vars); }
const { fill: fillKey } = await import('./texts.js');
test('three wrong numbers: the app fills the row (filled, not clean)', () => {
  const { p, view } = simProblem('sim-calc', 2, 'A', 3);
  let s = toNumber(p, view); const x = p.facts.val.v;
  for (const d of [11, 12]) { s = act(s, { t: 'number', text: String(x + d) }).s; assert.ok(s.cur && s.cur.kind === 'statement'); }
  const o = act(s, { t: 'number', text: String(x + 13) });
  assert.equal(o.s.decisions.at(-1).state, 'filled'); assert.equal(o.s.rows.at(-1).fact, 'val');
  assert.ok(o.fx.some((f) => f.t === 'filled' && f.fact === 'val'));
  assert.ok(o.fx.some((f) => f.t === 'fb' && f.key === 'ui.filledSt' && f.vars.st === `${p.facts.val.x} = ${x}`));
  assert.ok(isReady(o.s)); assert.equal(endClean(act(o.s, { t: 'qed' }).s), false);
  // a wrong chip at מודרך counts the same way: the third wrong one fills
  const g = simProblem('sim-side', 1, 'B', 3); let q = toNumber(g.p, g.view);
  const wrong = g.view.steps.find((z) => z.fact === 'val').options.filter((st) => st.v !== g.p.facts.val.v);
  assert.equal(wrong.length, 2);
  q = act(q, { t: 'statement', st: wrong[0] }).s; q = act(q, { t: 'statement', st: wrong[1] }).s;
  assert.ok(q.cur && q.cur.tries === 2, 'two wrong chips: the number row is still open');
});
test('snapshot in the middle of a number → restore → the same decision is open, with its tries and wrong numbers', () => {
  const { p, view } = simProblem('sim-calc', 3, 'B', 4);
  let s = toNumber(p, view);
  s = act(s, { t: 'number', text: String(flipOf(p, 'val')) }).s;
  const back = restore(snapshot(s), (meta) => typeOf('sim-calc').remake(meta));
  assert.ok(back); assert.deepEqual(back.cur, s.cur); assert.equal(back.cur.tries, 1); assert.deepEqual(back.done, s.done);
  assert.deepEqual(act(back, { t: 'number', text: String(flipOf(p, 'val')) }).fx.map((f) => f.key), ['st.numAgain']);
  const o = act(back, { t: 'number', text: String(p.facts.val.v) });
  assert.equal(o.s.rows.at(-1).fact, 'val'); assert.ok(isReady(o.s));
});
test('the number chips at מודרך: three, the right one, the flipped ratio, a slip; whole or x.5, all different', () => {
  let flips = 0, total = 0;
  for (const [id, variant] of [['sim-side', 'A'], ['sim-side', 'B'], ['sim-calc', 'B']]) for (const only of tplsOf(typeOf(id), 1, variant)) for (let seed = 1; seed <= 50; seed++) {
    const { p, view } = simProblem(id, 1, variant, seed, { only });
    const step = view.steps.find((z) => z.fact === 'val'), vs = step.options.map((st) => st.v);
    assert.equal(vs.length, 3, p.id); assert.equal(new Set(vs).size, 3, p.id);
    assert.ok(vs.every((v) => v >= 1 && Number.isInteger(v * 2)), `${p.id}: ${vs}`);
    assert.ok(vs.includes(p.facts.val.v));
    const whys = p.tiles.wrong.filter((w) => w.for === 'val').map((w) => w.why);
    // the flipped-ratio chip: the flipped answer itself, or its nearest half when it is not a round number
    const flipChip = (p.tiles.wrong.find((w) => w.for === 'val' && w.why === 'num-flip') || { st: {} }).st.v;
    if (flipChip != null) { flips++; assert.ok(vs.includes(flipChip)); assert.ok(Math.abs(flipChip - flipOf(p, 'val')) <= 0.25, `${p.id}: the flipped chip ${flipChip} vs ${flipOf(p, 'val')}`); }
    for (const st of step.options) if (st.v !== p.facts.val.v) {
      const o = act(toNumber(p, view), { t: 'statement', st }).fx.find((f) => f.t === 'fb');
      assert.deepEqual([o.key, o.kind], st.v === flipChip ? ['st.numFlip', 'ratio-flip'] : ['st.numCalc', 'calc'], p.id);
    }
    total++;
  }
  assert.ok(flips >= total * 0.95, `the flipped ratio is one of the chips almost always (${flips} of ${total})`);
});
test('the work line: the substitution from the labels, with x for the asked side; the cross-multiplication', () => {
  for (const id of ['sim-side', 'sim-calc']) for (const only of typeOf(id).templates.map((t) => t.id)) for (let seed = 1; seed <= 50; seed++) {
    const { p } = simProblem(id, 3, 'B', seed, { only }), w = workOf(p, 'val'), x = p.facts.val.v;
    assert.ok(w, p.id); assert.equal(w.sub.length, 2);
    assert.equal(w.sub.flat().filter((q) => q === 'x').length, 1, p.id);
    const num = (q) => (q === 'x' ? x : Number(q));
    assert.ok(Math.abs(num(w.sub[0][0]) / num(w.sub[0][1]) - num(w.sub[1][0]) / num(w.sub[1][1])) < 1e-9, `${p.id}: ${w.text}`);
    assert.equal(w.text, w.sub.map(([a, b]) => `${a}/${b}`).join(' = '));
    assert.match(w.cross, /^x · [\d.]+ = [\d.]+ · [\d.]+$/);
    const [l, r] = w.cross.split(' = ').map((side) => side.split(' · ').map(num).reduce((a, b) => a * b, 1));
    assert.ok(Math.abs(l - r) < 1e-9, `${p.id}: ${w.cross}`);
  }
  assert.equal(workOf(xsas(), 'cong'), null);
});
test('לבד: a ratio is built by side pairs; the last pair judges it by rule; undo; mixed direction → ratio-flip', () => {
  const { p, view } = simProblem('sim-calc', 3, 'A', 6);
  let s = start(p, view);
  for (let g = 0; g < 40 && !(s.cur && s.cur.kind === 'statement' && p.facts[s.cur.expect].kind === 'prop'); g++) s = act(s, canonAction(s)).s;
  const [[a, b], [c, d]] = p.facts.prop.pairs;
  const one = act(s, { t: 'pair', a, b });
  assert.deepEqual(one.s.cur.pairs, [[a, b]]); assert.deepEqual(one.fx, []); assert.equal(one.s.rows.length, s.rows.length);
  assert.deepEqual(restore(snapshot(one.s), (meta) => typeOf('sim-calc').remake(meta)).cur.pairs, [[a, b]]);   // the half-built ratio survives a refresh
  const undo = act(one.s, { t: 'unpair' }); assert.deepEqual(undo.s.cur.pairs, []); assert.equal(act(undo.s, { t: 'unpair' }).s, undo.s);
  // mixed direction
  const flip = act(one.s, { t: 'pair', a: d, b: c });
  assert.deepEqual(flip.fx.find((f) => f.t === 'fb'), { t: 'fb', cls: 'err', key: 'st.ratioFlip', vars: {}, kind: 'ratio-flip' });
  assert.equal(flip.s.cur.tries, 1); assert.deepEqual(flip.s.cur.pairs, []);
  // the same wrong ratio again: no second try
  const again = act(act(flip.s, { t: 'pair', a, b }).s, { t: 'pair', a: d, b: c });
  assert.equal(again.s.cur.tries, 1); assert.deepEqual(again.s.cur.pairs, []); assert.deepEqual(again.fx.map((f) => [f.cls, f.key]), [['note', 'st.propAgain']]);
  // sides that do not match
  const other = p.figure.segs.find((q) => checkProp(p, { kind: 'prop', pairs: [[a, b], [c, q]] }).textKey === 'st.nonMatchingSides' && !holdsIn(p.figure, { kind: 'prop', pairs: [[a, b], [c, q]] }));
  assert.ok(other); assert.equal(act(act(s, { t: 'pair', a, b }).s, { t: 'pair', a: c, b: other }).fx.find((f) => f.t === 'fb').kind, 'non-matching-sides');
  // all fractions the other way up is right too
  const ok = act(act(s, { t: 'pair', a: b, b: a }).s, { t: 'pair', a: d, b: c });
  assert.equal(ok.s.pending.fact, 'prop'); assert.equal(ok.s.cur.kind, 'reason'); assert.equal(ok.s.decisions.at(-1).state, 'solo');
  // a pair is nothing while a reason is open, in an ordered mode, with a name that is no side, or on a congruence
  assert.equal(act(ok.s, { t: 'pair', a, b }).s, ok.s);
  assert.equal(act(s, { t: 'pair', a, b: a }).s, s); assert.equal(act(s, { t: 'pair', a: 'ZZ', b }).s, s); assert.equal(act(s, { t: 'pair', a }).s, s);
  const cg = start(P, { ...V, mode: 'tap' }); assert.equal(act(cg, { t: 'pair', a: 'AO', b: 'BO' }).s, cg);
  // similarity level 1 asks for the full ratio: three pairs
  const g = simProblem('sim-parts', 3, 'B', 2); let q = start(g.p, g.view);
  for (const [u, v] of g.p.facts.prop.pairs.slice(0, 2)) q = act(q, { t: 'pair', a: u, b: v }).s;
  assert.equal(q.cur.pairs.length, 2); assert.ok(!q.pending);
  q = act(q, { t: 'pair', a: g.p.facts.prop.pairs[2][0], b: g.p.facts.prop.pairs[2][1] }).s;
  assert.equal(q.pending.fact, 'prop');
});
test('לבד on a similarity: the vertex order builds a `sim` statement (its own label); a wrong order is a wrong matching', () => {
  const { p, view } = simProblem('prove-sim', 3, 'A', 8);
  let s = start(p, view);
  for (let g = 0; g < 40 && !(s.cur && s.cur.kind === 'statement' && s.cur.expect === p.sim); g++) s = act(s, canonAction(s)).s;
  assert.equal(s.cur.label, 'התאמת קודקודים');
  const f = p.facts[p.sim], t1 = f.map.map((m) => m[0]), t2 = f.map.map((m) => m[1]);
  const bad = act(s, { t: 'matching', tri1: t1, order: [t2[1], t2[0], t2[2]] });
  assert.equal(bad.fx.find((x) => x.t === 'fb').kind, 'wrong-matching'); assert.equal(bad.s.cur.tries, 1);
  const ok = act(s, { t: 'matching', tri1: t1, order: t2 });
  assert.equal(ok.s.pending.fact, p.sim); assert.equal(ok.s.decisions.at(-1).label, 'התאמת קודקודים'); assert.equal(ok.s.decisions.at(-1).state, 'solo');
  // the hint of the open vertex order talks about angles, not about side ticks
  const h = act(s, { t: 'hint' }).fx.find((x) => x.t === 'hint'); assert.equal(h.key, 'hint.matching-sim.1');
});
test('similarity hints: every open decision of every level has both rungs; a common ANGLE and a parallel given have their own words', () => {
  const seen = new Set();
  for (const type of SIM_TYPES) for (const [level, variant] of [[1, 'B'], [2, 'A'], [2, 'B'], [3, 'A'], [3, 'B']]) for (const only of tplsOf(type, level, variant)) for (let seed = 1; seed <= 4; seed++) {
    const { p, view } = simProblem(type.id, level, variant, seed, { only });
    let s = start(p, view);
    for (let g = 0; g < 80 && !s.ended; g++) {
      if (s.cur) {
        const fact = s.cur.fact || s.cur.expect, f = p.facts[fact], role = roleOf(p, fact);
        for (const rung of [1, 2]) {
          const h = act(rung === 2 ? act(s, { t: 'hint' }).s : s, { t: 'hint' }).fx.find((x) => x.t === 'hint');
          assert.ok(TX[h.key], `${p.id}: ${h.key}`); fillKey(h.key, h.vars); seen.add(h.key.replace(/\.\d$/, ''));
          if (role === 'common' && f.kind === 'ang') assert.equal(h.key, `hint.common-angle.${rung}`);
          if (f.kind === 'par') assert.equal(h.key, `hint.given-par.${rung}`);
          if (f.kind === 'ang' || f.kind === 'par') assert.ok(!/צלע/.test(TX[h.key]) || role === 'sim-partner', `${h.key} talks about a side on an angle row`);
        }
      }
      s = act(s, canonAction(s)).s;
    }
  }
  for (const k of ['hint.parallel', 'hint.common-angle', 'hint.vertical', 'hint.similarity', 'hint.ratio', 'hint.number']) assert.ok(seen.has(k), `${k} never shown`);
  for (const k of ['hint.common-angle', 'hint.given-par', 'hint.matching-sim']) for (const r of [1, 2]) assert.ok(TX[`${k}.${r}`], k);
  assert.ok(!/שוויון/.test(TX['hint.given-par.2']));
  // a congruence common SIDE keeps its words
  assert.equal(TX['hint.common.2'], 'צלע תמיד שווה לעצמה.');
});
test('every similarity level, every help stage and variant, 50 seeds: the canon answers (first accepted reasons, the numbers) end the proof', () => {
  let n = 0; const seenTpl = new Set();
  for (const type of SIM_TYPES) for (const [level, variant] of [[1, 'A'], [1, 'B'], [2, 'A'], [2, 'B'], [3, 'A'], [3, 'B']]) for (const only of tplsOf(type, level, variant)) for (let seed = 1; seed <= 50; seed++) {
    const { p, view } = simProblem(type.id, level, variant, seed, { only });
    n++; seenTpl.add(p.template); assert.equal(p.template, only);
    let s = start(p, view);
    for (let g = 0; g < 120 && !s.ended; g++) {
      const a = canonAction(s), o = act(s, a);
      assert.notEqual(o.s, s, `${p.id} L${level}${variant} stuck on ${JSON.stringify(a)}`);
      assert.ok(!o.fx.some((f) => f.t === 'fb' && f.cls === 'err'), `${p.id} L${level}${variant}: ${JSON.stringify(a)} was judged wrong`);
      s = o.s;
    }
    assert.equal(s.ended, true, `${p.id} L${level}${variant} did not end`);
    assert.ok(coreDone(p, s.done)); assert.ok(s.decisions.every((d) => d.state === 'solo'), p.id);
    assert.equal(endClean(s), true);
    for (const r of s.rows) assert.ok(acceptedReasons(p, r.fact).includes(r.reason), `${p.id}: row ${r.fact} has reason ${r.reason}`);
  }
  assert.equal(seenTpl.size, SIM_TYPES.reduce((k, t) => k + t.templates.length, 0), 'every template walked');
  assert.ok(n >= 3000, `${n} proofs walked`);
});
test('the texts of Task 11 exist and are drafts', async () => {
  const { NEW_DRAFTS } = await import('./texts.js');
  for (const k of ['st.numFlip', 'st.numCalc', 'st.numEmpty', 'st.numDot', 'st.numZero', 'st.numLong', 'st.numNone', 'st.numAgain', 'st.propAgain', 'btn.answer', 'btn.unpair', 'q.number', 'lbl.kp', 'lbl.kpDel', 'lbl.kpDot', 'lbl.work', 'lbl.cross', 'lbl.tapPair1', 'lbl.tapPair2', 'lbl.tapSim', 'say.frac', 'say.numBox', 'say.numLabel', 'say.numAsk',
    'hint.common-angle.1', 'hint.common-angle.2', 'hint.given-par.1', 'hint.given-par.2', 'hint.matching-sim.1', 'hint.matching-sim.2']) { assert.ok(TX[k], k); assert.ok(NEW_DRAFTS.includes(k), `${k} not in NEW_DRAFTS`); }
  assert.equal(TX['btn.answer'], 'זו התשובה');
  assert.ok(!/בדוק|בדיקה|בדקו|אישור|אשר|✓/.test(TX['btn.answer'] + TX['btn.unpair']));
});
