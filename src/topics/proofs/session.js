/* The proofs section: one proof in progress (plan D3; spec §8 decision states, §9.1 hints).
   A pure reducer: act(s, action) → { s, fx }. The UI renders `s` and plays the effects `fx`; it never
   judges anything itself. An action that cannot apply now (a closed decision, a disabled chip, a
   second tap) returns the SAME `s` and no effects (Review Focus 2).

   s = { problem, view, done:[factId], rows:[{ fact, reason, by:'app'|'student' }], pending:null|{ fact },
         cur:null|{ key, kind:'statement'|'reason', label, tries, rung, wrong:[…], fact, expect },
         decisions:[{ key, label, state, fact }], errs:{ kind:n }, nonSolo, ended, … }
   Actions: { t:'statement', st } · { t:'reason', id } · { t:'matching', tri1, order } · { t:'hint' }
            · { t:'cancel' } · { t:'next' } (walk-through) · { t:'qed' }
   Effects: { t:'fb', cls:'ok'|'err'|'note', key, vars, kind? } · { t:'mark', fact } · { t:'question', parts }
            · { t:'why', key, vars, law? } · { t:'filled', fact, reason } · { t:'hint', rung, key, vars, parts }
            · { t:'end', clean } (clean = endClean(s), the mastery rule)
   fb.cls → the tracker (spec §10.4): 'ok' only for right on the first try; a right second try is 'note'. */
import { classify, checkReason, checkMatching, isDone, roleOf, acceptedReasons, partsOf, show, whyOf, congOf, required, norm } from './core.js';
import { RULES, isClean } from './mastery.js';
import { LABELS, T } from './texts.js';
import { DEFS, reasonInline } from './reasons.js';

const ORDERED = (v) => v.mode === 'walk' || v.mode === 'fill';
const same = (s) => ({ s, fx: [] });
const within = (needs, done) => needs.every((n) => done.includes(n));
/** The reason the app writes for a fact: the first reason of a justification whose needs are done. */
const firstReason = (p, id, done) => { const js = p.just[id] || []; return (js.find((j) => within(j.needs, done)) || js[0]).reasons[0]; };

function clone(s) {
  return {
    ...s, done: [...s.done], rows: [...s.rows], pending: s.pending && { ...s.pending },
    cur: s.cur && { ...s.cur, wrong: [...s.cur.wrong] }, decisions: [...s.decisions], errs: { ...s.errs },
    stash: { ...s.stash }, placed: [...s.placed],
  };
}
const stepOf = (s, fact) => s.view.steps.find((x) => x.fact === fact) || { fact, ask: ['statement', 'reason'] };

/* the fact the student is expected to write next (labels and hints of an open statement decision) */
function expectedFact(s) {
  const p = s.problem;
  if (ORDERED(s.view)) { const st = s.view.steps[s.stepI]; return st ? st.fact : null; }
  const req = required(p), open = p.canon.filter((f) => req.has(f) && !s.done.includes(f));
  const ready = open.find((f) => (p.just[f] || []).some((j) => within(j.needs, s.done)));
  return ready || open[0] || null;
}
const isTapCong = (s, fact) => s.view.mode === 'tap' && fact && fact === congOf(s.problem);
const stmtLabel = (s, fact) => (isTapCong(s, fact) ? LABELS.matching : LABELS.stmt(roleOf(s.problem, fact)));

function openStatement(s, fact = null) {
  const expect = fact || expectedFact(s);
  if (!expect) { s.cur = null; return; }
  s.nst += 1;
  s.cur = { key: `st#${s.nst}`, kind: 'statement', label: stmtLabel(s, expect), tries: 0, rung: 0, wrong: [], fact, expect, tainted: false };
}
function openReason(s, fact) {
  const key = `rs:${fact}`;
  if (s.stash[key]) { s.cur = { ...s.stash[key], wrong: [...s.stash[key].wrong] }; delete s.stash[key]; return; }
  s.cur = { key, kind: 'reason', label: LABELS.reason(roleOf(s.problem, fact)), tries: 0, rung: 0, wrong: [], fact, expect: fact, tainted: false };
}
function openStep(s, step) {
  s.pending = { fact: step.fact };
  if (step.ask.includes('statement')) openStatement(s, step.fact); else openReason(s, step.fact);
}
/* walk-through and fill: go on through the steps; the app writes the rows that ask nothing */
function advance(s, fx) {
  s.cur = null; s.pending = null;
  while (s.stepI < s.view.steps.length) {
    const step = s.view.steps[s.stepI];
    if (step.ask.length) { openStep(s, step); return; }
    if (s.view.mode === 'walk') return;
    writeRow(s, fx, step.fact, firstReason(s.problem, step.fact, s.done), 'app');
    s.stepI += 1;
  }
}
function afterRow(s, fx) {
  s.pending = null; s.cur = null;
  if (ORDERED(s.view)) { s.stepI += 1; if (s.view.mode === 'fill') advance(s, fx); return; }
  if (!isDone(s.problem, s.done)) openStatement(s);
}
function writeRow(s, fx, fact, reason, by) {
  s.rows.push({ fact, reason, by });
  s.done.push(fact);
  fx.push({ t: 'mark', fact });
  if (s.view.whyLine) { const w = whyOf(s.problem, fact, reason); fx.push({ t: 'why', key: w.key, vars: w.vars, ...(w.law ? { law: w.law } : {}) }); }
}

/* role of the open decision, for hints ('given' becomes 'given-more' once another given is used) */
function hintRole(s) {
  const p = s.problem, c = s.cur, fact = c.fact || c.expect;
  if (c.kind === 'statement' && isTapCong(s, fact)) return 'matching';
  const r = roleOf(p, fact);
  if (r === 'given' && (p.given || []).some((g) => g !== fact && s.done.includes(g))) return 'given-more';
  return r;
}
function hintFx(s, rung) {
  const p = s.problem, fact = s.cur.fact || s.cur.expect, f = p.facts[fact], role = hintRole(s);
  const vars = {};
  if (role === 'given-words') { const def = acceptedReasons(p, fact).find((r) => DEFS.includes(r)); vars.word = def ? T[`word.${def}`] : ''; }
  if (role === 'vertical') vars.pt = f.x.v;
  if (role === 'partner') vars.letter = typeof f.x === 'string' ? f.x[0] : f.x.v;
  // while the statement is open, types 1 and 2 point only where to look (p.cue): both parts would give the answer away
  const cue = s.cur.kind === 'statement' && p.cue && p.cue[fact];
  return { t: 'hint', rung, key: `hint.${role}.${rung}`, vars, parts: cue || partsOf(f) };
}
function taint(s) { if (!s.cur.tainted) { s.cur.tainted = true; s.nonSolo += 1; } }
function decide(s, state, fact, label = s.cur.label) {
  s.decisions.push({ key: s.cur.key, label, state, fact });
}

/* the app fills the open decision (hint 3, or two wrong tries) */
function fillCur(s, fx) {
  const p = s.problem, c = s.cur;
  taint(s);
  if (c.kind === 'reason') {
    const r = firstReason(p, c.fact, s.done);
    decide(s, 'filled', c.fact);
    fx.push({ t: 'filled', fact: c.fact, reason: r });
    fx.push({ t: 'fb', cls: 'note', key: 'ui.filled', vars: { reason: reasonInline(r) } });
    writeRow(s, fx, c.fact, r, 'app');
    afterRow(s, fx);
    return;
  }
  const fact = c.fact || c.expect;
  decide(s, 'filled', fact, stmtLabel(s, fact));
  s.placed.push(fact);
  fx.push({ t: 'filled', fact, reason: null });
  fx.push({ t: 'fb', cls: 'note', key: 'ui.filledSt', vars: { st: show(p.facts[fact]) } });
  placeRow(s, fx, fact);
}
/* a statement is on its row: next its reason, or (no reason asked) the app writes it */
function placeRow(s, fx, fact) {
  s.pending = { fact };
  if (stepOf(s, fact).ask.includes('reason')) openReason(s, fact);
  else { writeRow(s, fx, fact, firstReason(s.problem, fact, s.done), 'student'); afterRow(s, fx); }
}
function wrongTry(s, fx, kind, key, vars, dedupe) {
  const c = s.cur;
  c.tries += 1;
  if (dedupe != null) c.wrong.push(dedupe);
  s.errs[kind] = (s.errs[kind] || 0) + 1;
  taint(s);
  const short = s.view.shortFirst && c.kind === 'reason' && c.tries === 1;
  fx.push({ t: 'fb', cls: 'err', key: short ? 'rs.short' : key, vars: short ? {} : vars, kind });
  if (s.view.autoHint && c.tries === 1 && c.rung < 1) { c.rung = 1; fx.push(hintFx(s, 1)); }
  if (c.tries >= RULES.MAX_TRIES) fillCur(s, fx);
}
const rightState = (c) => (c.tries > 0 ? 'missed' : c.rung >= 2 ? 'helped' : 'solo');
const rightFb = (state) => ({ t: 'fb', cls: state === 'missed' ? 'note' : 'ok', key: 'fb.ok', vars: {} });

function onStatement(s0, st, viaMatching) {
  if (s0.ended || !s0.cur || s0.cur.kind !== 'statement') return same(s0);
  const p = s0.problem, k = norm(p.figure, st);
  if (s0.cur.wrong.includes(k)) return same(s0);
  const s = clone(s0), fx = [], c = s.cur;
  if (viaMatching) c.label = LABELS.matching;
  const r = classify(p, s.done, st);
  if (r.c === 'early' || r.c === 'false') {
    if (r.c === 'early' && (r.sub === 'target' || r.sub === 'consequence')) fx.unshift({ t: 'question', parts: partsOf(st) });
    wrongTry(s, fx, r.kind, r.textKey, r.vars, k);
    if (fx[0].t === 'question') fx.push(fx.shift());          // the feedback line comes first
    return { s, fx };
  }
  const ordered = ORDERED(s.view);
  if (r.c !== 'ok' || (ordered && r.fact !== c.fact)) {
    fx.push({ t: 'fb', cls: 'note', key: r.textKey || 'st.notNeeded', vars: r.vars || {} });
    return { s, fx };
  }
  const fact = r.fact;
  if (s.placed.includes(fact) && c.tries === 0) {             // placed before, then cancelled: not a new decision
    fx.push({ t: 'fb', cls: 'note', key: 'fb.ok', vars: {} });
  } else {
    const state = rightState(c);
    decide(s, state, fact, viaMatching || isTapCong(s, fact) ? LABELS.matching : LABELS.stmt(roleOf(p, fact)));
    if (!s.placed.includes(fact)) s.placed.push(fact);
    fx.push(rightFb(state));
  }
  placeRow(s, fx, fact);
  return { s, fx };
}

function onReason(s0, id) {
  if (s0.ended || !s0.cur || s0.cur.kind !== 'reason' || s0.cur.wrong.includes(id)) return same(s0);
  const s = clone(s0), fx = [], c = s.cur, p = s.problem;
  const r = checkReason(p, s.done, c.fact, id);
  if (!r.ok) { wrongTry(s, fx, r.kind, r.textKey, r.vars, id); return { s, fx }; }
  const state = rightState(c);
  decide(s, state, c.fact);
  fx.push(rightFb(state));
  writeRow(s, fx, c.fact, id, 'student');
  afterRow(s, fx);
  return { s, fx };
}

function onMatching(s0, tri1, order) {
  if (s0.ended || !s0.cur || s0.cur.kind !== 'statement') return same(s0);
  const p = s0.problem, st = { kind: 'cong', map: tri1.map((u, i) => [u, order[i]]) };
  const m = checkMatching(p, tri1, order, s0.done);
  if (m.ok) return onStatement(s0, st, true);
  const k = 'M:' + tri1.map((u, i) => u + order[i]).join(',');
  if (s0.cur.wrong.includes(k)) return same(s0);
  const s = clone(s0), fx = [];
  s.cur.label = LABELS.matching;
  wrongTry(s, fx, m.kind, m.textKey, m.vars, k);
  return { s, fx };
}

function onHint(s0) {
  if (s0.ended || !s0.cur) return same(s0);
  const s = clone(s0), fx = [], c = s.cur;
  c.rung = Math.min(3, c.rung + 1);
  if (c.rung === 2) taint(s);
  if (c.rung < 3) fx.push(hintFx(s, c.rung)); else fillCur(s, fx);
  return { s, fx };
}

function onCancel(s0) {
  if (s0.ended || !s0.pending || ORDERED(s0.view) || !s0.cur || s0.cur.kind !== 'reason') return same(s0);
  const s = clone(s0);
  s.stash[s.cur.key] = { ...s.cur, wrong: [...s.cur.wrong] };
  s.pending = null;
  openStatement(s);
  return { s, fx: [] };
}

function onNext(s0) {
  if (s0.view.mode !== 'walk' || s0.ended || s0.cur || s0.stepI >= s0.view.steps.length) return same(s0);
  const s = clone(s0), fx = [], step = s.view.steps[s.stepI];
  if (step.ask.length) openStep(s, step);
  else { writeRow(s, fx, step.fact, firstReason(s.problem, step.fact, s.done), 'app'); s.stepI += 1; }
  return { s, fx };
}

function onQed(s0) {
  if (s0.ended || s0.pending || !isDone(s0.problem, s0.done)) return same(s0);
  const s = clone(s0);
  s.ended = true; s.cur = null;
  return { s, fx: [{ t: 'end', clean: endClean(s) }] };
}

/** A new proof in progress. */
export function start(problem, view) {
  const pre = view.pre || [], known = view.known || [];
  const s = {
    v: 1, problem, view, done: [...known], rows: [], pending: null, cur: null, decisions: [], errs: {}, nonSolo: 0,
    stash: {}, placed: [], stepI: 0, nst: 0, ended: false,
  };
  for (const f of pre) { if (s.done.includes(f)) continue; s.rows.push({ fact: f, reason: firstReason(problem, f, s.done), by: 'app' }); s.done.push(f); }   // a known fact (type 2's congruence) has no row
  if (view.mode === 'fill') advance(s, []);
  else if (!ORDERED(view)) openStatement(s);
  return s;
}

/** One action → the next state and its effects. Pure. */
export function act(s, a) {
  switch (a && a.t) {
    case 'statement': return onStatement(s, a.st, false);
    case 'reason': return onReason(s, a.id);
    case 'matching': return onMatching(s, a.tri1, a.order);
    case 'hint': return onHint(s);
    case 'cancel': return onCancel(s);
    case 'next': return onNext(s);
    case 'qed': return onQed(s);
    default: return same(s);
  }
}

/** The proof's record for mastery: how many decisions ended in each state. */
export function summary(s) {
  const out = { n: s.decisions.length, solo: 0, helped: 0, missed: 0, filled: 0 };
  for (const d of s.decisions) out[d.state] += 1;
  return out;
}
/** Is the proof clean? The one mastery rule (spec §8): no filled decision and solo ≥ 80% (mastery.isClean).
    The end card, the tracker's win and the new dot all read this. */
export const endClean = (s) => isClean(summary(s));
/** "הוכחה אחרת" is free only before the first non-solo decision. */
export const canSwapFree = (s) => s.nonSolo === 0;
/** Is the proof ready for "מ.ש.ל."? */
export const ready = (s) => !s.ended && !s.pending && isDone(s.problem, s.done);

/* ── the open proof survives a refresh (sessionStorage, spec §8) ── */
const KEEP = ['view', 'done', 'rows', 'pending', 'cur', 'decisions', 'errs', 'nonSolo', 'stash', 'placed', 'stepI', 'nst', 'ended'];
/** The proof in progress as a JSON string (the problem is rebuilt from its id / template / seed). */
export function snapshot(s) {
  const p = s.problem, state = Object.fromEntries(KEEP.map((k) => [k, s[k]]));
  return JSON.stringify({ v: 1, id: p.id, type: p.type, template: p.template, seed: p.seed, level: p.level, variant: p.variant, meta: p.meta || null, state });
}
/** Back from a snapshot; `make(meta)` rebuilds the problem. null for anything that cannot be read. */
export function restore(json, make) {
  try {
    const x = JSON.parse(json);
    if (!x || x.v !== 1 || !x.state || typeof x.state !== 'object') return null;
    const st = x.state, problem = make(x);
    if (!problem || problem.id !== x.id) return null;
    const isFact = (f) => typeof f === 'string' && f in problem.facts;
    const ok = Array.isArray(st.done) && st.done.every(isFact) && Array.isArray(st.rows) && st.rows.every((r) => r && isFact(r.fact))
      && Array.isArray(st.decisions) && Array.isArray(st.placed) && st.view && typeof st.view.mode === 'string' && Array.isArray(st.view.steps)
      && (st.pending === null || (st.pending && isFact(st.pending.fact)))
      && (st.cur === null || (st.cur && typeof st.cur.key === 'string' && Array.isArray(st.cur.wrong) && (st.cur.kind === 'statement' || st.cur.kind === 'reason')))
      && Number.isFinite(st.nonSolo) && Number.isFinite(st.stepI) && st.errs && typeof st.errs === 'object' && st.stash && typeof st.stash === 'object';
    if (!ok) return null;
    return { v: 1, problem, ...Object.fromEntries(KEEP.map((k) => [k, st[k]])) };
  } catch { return null; }
}
