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
