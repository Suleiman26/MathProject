'use client';
/* The proofs section: screen C, one proof (spec §11.1; 2026-11-22 redesign "מחברת"). Header ("תרגיל אחר"),
   a "שורה X מתוך Y" bar, the drawing (always in view), the notebook (נתון, צ״ל and a טענה | נימוק table with
   the open row and the empty rows still to come), and the bottom sheet with one clear question. It drives session.js: every tap is an
   action, the reducer answers with the next state and effects, and this file only shows them.
   The header's "המשפטים" button opens the subject's theorem notebook (./Theorems.jsx, spec 2026-11-23 §6.2.4):
   plain screen state, never a session action, never recorded as help. */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { seeded, makeR } from '../new/core.js';
import { start, act, ready, summary } from './session.js';
import { reasonChips, partsOf, targets, roleOf, norm, required, whyOf, congOf, acceptedReasons, showPart } from './core.js';
import { partId } from './figure-core.js';
import { REASONS, reasonInline } from './reasons.js';
import { RULES } from './mastery.js';
import { T, LABELS, fill } from './texts.js';
import ProofFigure, { useReducedMotion } from './ProofFigure.jsx';
import ProofRows from './ProofRows.jsx';
import Tray from './Tray.jsx';
import EndCard from './EndCard.jsx';
import { useSelection, TapStatement, GroupPick } from './TapBuild.jsx';
import { St, Tx, Mx, Ask, CongSt, Law, hasLaw, lawWord, IcBack, IcBook, IcCheck, IcLock, IcSwap } from './signs.jsx';
import Theorems from './Theorems.jsx';
import { lawsOf } from './subjects.js';

const PAIR = { 1: 'var(--prf-p1)', 2: 'var(--prf-p2)', 3: 'var(--prf-p3)' };
const ids = (problem, fact) => (problem.facts[fact] ? partsOf(problem.facts[fact]).map((x) => partId(x, problem.figure)) : []);
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 2147483646 + 1; };

export default function ProofScreen({ type, problem, view, level = 1, dots = [null, null, null, null], levelName, onEnd, onLeave, onSwap, onState, restored, end }) {
  const [s, setS] = useState(() => restored || start(problem, view));
  const sRef = useRef(s);
  const [fbs, setFbs] = useState([]);
  const [why, setWhy] = useState(null);
  const [hintLine, setHintLine] = useState(null);
  const [pulse, setPulse] = useState([]);
  const [question, setQuestion] = useState([]);
  const [leans, setLeans] = useState(null);
  const [openRow, setOpenRow] = useState(null);
  const [badTiles, setBadTiles] = useState([]);
  const [lawList, setLawList] = useState(null);       // Level 3: the decision whose list of theorems (with their sentences) is open in the sheet
  const [said, setSaid] = useState(null);             // the row whose theorem the sheet is quoting right now: the notebook holds that sentence back (it is on screen once, not twice)
  const [lawsOpen, setLawsOpen] = useState(false);    // the "המשפטים" sheet (the student's theorem notebook): never an action, never help
  const [peek, setPeek] = useState(null);             // { key, id }: the theorem chip being read before it is chosen (§6.2.2); a preview, never a decision
  const [lead, setLead] = useState([]);
  const [fresh, setFresh] = useState(null);
  const [showKey, setShowKey] = useState(null);       // the decision whose "הראו לי" is unlocked
  const [nudge, setNudge] = useState(false);
  const [ending, setEnding] = useState(restored && restored.ended ? 'tint' : null);
  const [cardOn, setCardOn] = useState(false);
  const [live, setLive] = useState('');
  // type 4: the unscored plan question "באילו שני משולשים נמצאים …?" before the first row (not a decision, no row)
  const [planQ, setPlanQ] = useState(() => (!restored && view.plan === 'tris' && (problem.figure.tris || []).length === 2 ? { picked: [] } : null));
  const n = useRef(0), timers = useRef({}), nbEl = useRef(null), workEl = useRef(null), qedDone = useRef(false), intro = useRef(!restored), wasOpen = useRef(null);
  const reduce = useReducedMotion();
  // how the level is laid out (types/index.js `shape`): reading the given and the parts of a known congruence are
  // the two small shapes (no triangles to tap, the drawing never outlines an answer); the rest are full proofs
  const isGiven = type.shape === 'given', isParts = type.shape === 'parts', small = isGiven || isParts;
  const sel = useSelection(problem, (key) => setFbs([{ id: ++n.current, cls: 'note', key, vars: {}, label: '' }]), small ? ['seg', 'ang'] : null);
  const p = problem, cur = s.cur, mode = s.view.mode, cong = congOf(p);
  const later = (name, ms, fn) => { clearTimeout(timers.current[name]); timers.current[name] = setTimeout(fn, ms); };
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);
  useEffect(() => { if (onState) onState(sRef.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { const t = setTimeout(() => { intro.current = false; }, 1400); return () => clearTimeout(t); }, []);

  /* ── one action → the reducer → show its effects ── */
  function dispatch(a) {
    const prev = sRef.current, r = act(prev, a);
    if (r.s === prev) return r;
    sRef.current = r.s; setS(r.s);
    if (onState) onState(r.s);
    const grew = r.s.decisions.length > prev.decisions.length;
    const label = grew ? r.s.decisions[r.s.decisions.length - 1].label : prev.cur ? prev.cur.label : '';
    const out = [], said = [];
    let w = null, h = null, filled = null;
    for (const f of r.fx) {
      if (f.t === 'fb') {
        // a right second try looks right (green) but stays a private note for the tracker (§10.4)
        out.push({ id: ++n.current, cls: f.cls, key: f.key, vars: f.vars, label, look: f.cls === 'note' && f.key === 'fb.ok' ? 'ok' : null });
        said.push(fill(f.key, f.vars));
      } else if (f.t === 'why') w = { id: ++n.current, key: f.key, vars: f.vars, law: f.law };
      else if (f.t === 'hint') h = f;
      else if (f.t === 'question') { setQuestion(f.parts.map((x) => partId(x, p.figure))); later('q', RULES.Q_BADGE_MS, () => setQuestion([])); }
      else if (f.t === 'filled') filled = f;
      else if (f.t === 'mark') said.push(T['lbl.marked']);
      else if (f.t === 'end') finish(r.s, f.clean);
    }
    if (filled) {
      const row = r.s.rows.find((x) => x.fact === filled.fact);
      if (row && !w) { const q = whyOf(p, filled.fact, row.reason); w = { id: ++n.current, key: q.key, vars: q.vars }; }
      if (w && filled.reason) w.law = null;                // the "מילאנו יחד" note already quotes the sentence: once is enough
      setLeans({ fact: filled.fact, picked: null });
    }
    const wrote = r.s.rows.length > prev.rows.length ? r.s.rows[r.s.rows.length - 1] : null;
    setSaid(wrote && ((w && w.law) || (filled && filled.reason && hasLaw(filled.reason))) ? wrote.fact : null);
    setFbs(out); setWhy(w);
    if (h) {
      setHintLine({ id: ++n.current, key: h.key, vars: h.vars, rung: h.rung, law: h.law || null });   // a hint that names a theorem shows its sentence (§6.2.6)
      setPulse([]); later('p0', 20, () => setPulse(h.parts.map((x) => partId(x, p.figure)))); later('p', 1900, () => setPulse([]));
      said.push(fill(h.key, h.vars));
      if (h.law) said.push(REASONS[h.law].full);
      if (h.rung === 2) { const key = r.s.cur && r.s.cur.key; later('show', RULES.HINT3_WAIT_MS, () => setShowKey(key)); }
    } else if (!r.s.cur || !prev.cur || r.s.cur.key !== prev.cur.key) setHintLine(null);
    if (r.s.rows.length > prev.rows.length) setFresh(r.s.rows[r.s.rows.length - 1].fact);
    setNudge(false);
    if (said.length) setLive(said.join(' '));
    return r;
  }
  function finish(st, clean) {
    if (qedDone.current) return;
    qedDone.current = true;
    setEnding(small ? 'tint' : 'move');
    const d = st.decisions.find((x) => x.state === 'filled' && String(x.key).startsWith('rs:'));
    const row = d && st.rows.find((x) => x.fact === d.fact);
    onEnd({ summary: summary(st), errs: st.errs, clean, filledReason: row ? row.reason : null, rows: st.rows });
  }
  useEffect(() => {
    if (!end) return undefined;
    const t = setTimeout(() => setCardOn(true), reduce ? 60 : 700);
    return () => clearTimeout(t);
  }, [end, reduce]);

  // no tap for a while on one step (Levels 1–2): the hint button pulses once, no text
  const curKey = cur ? cur.key : null, tries = cur ? cur.tries : 0;
  useEffect(() => {
    setNudge(false);
    if (!curKey || level > 2) return undefined;
    const t = setTimeout(() => setNudge(true), RULES.IDLE_MS);
    return () => clearTimeout(t);
  }, [curKey, tries, level]);

  // the row being worked on stays in view inside the notebook (on a phone the notebook scrolls between the drawing and the sheet)
  useLayoutEffect(() => {
    const box = nbEl.current;
    const opened = openRow && openRow !== wasOpen.current;                 // a finished row was just opened (its theorem): that row, with its sentence, comes into view
    wasOpen.current = openRow;
    if (!box || box.scrollHeight <= box.clientHeight + 1) return;
    const el = (opened && box.querySelector('.prf-row.is-open')) || box.querySelector('.prf-row.is-now') || box.querySelector('.prf-row:not(.is-ghost):last-of-type');
    if (!el) return;
    const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    let d = 0;
    if (r.bottom > b.bottom - 24) d = Math.min(r.bottom - b.bottom + 30, r.top - b.top - 6);   // a little of the next (empty) row shows under it; a tall row (its theorem under it) keeps its first line in view
    else if (r.top < b.top + 4) d = r.top - b.top - 10;
    if (d) box.scrollTo({ top: box.scrollTop + d, behavior: reduce || intro.current ? 'auto' : 'smooth' });
  }, [s.rows.length, curKey, leans, planQ, end, fbs, why, hintLine, openRow, peek, said, lawList]); // eslint-disable-line react-hooks/exhaustive-deps
  // on a computer the page itself scrolls (the sheet is as tall as its rows): keep the sheet's foot, where the tray is, in view
  useEffect(() => {
    const el = workEl.current;
    if (!el || !window.matchMedia || !window.matchMedia('(min-width:1024px) and (min-height:501px)').matches) return;
    if (end && cardOn) { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }   // the end: the result line first, the notebook page under it
    const over = el.getBoundingClientRect().bottom - window.innerHeight + 16;
    if (over > 0) window.scrollBy({ top: over, behavior: reduce ? 'auto' : 'smooth' });
  }, [s.rows.length, curKey, cardOn, fbs, why, hintLine, leans, planQ, openRow, peek]); // eslint-disable-line react-hooks/exhaustive-deps

  /* type 4's plan question: tap the two triangles (in the drawing or as chips); the reply is a private note */
  function pickPlan(id) {
    if (!planQ || planQ.picked.includes(id) || planQ.picked.length >= 2) return;
    const picked = [...planQ.picked, id];
    setPlanQ({ picked });
    if (picked.length === 2) {
      const [t1, t2] = tris.map((t) => `△${t.join('')}`);
      setFbs([{ id: ++n.current, cls: 'note', key: 'ui.planOk', vars: { t1, t2 }, label: '', look: 'ok' }]);
      setLive(fill('ui.planOk', { t1, t2 }));
    }
  }

  /* ── what the drawing shows ── */
  const walkLast = mode === 'walk' && !cur && s.rows.length ? s.rows[s.rows.length - 1] : null;
  // the row being worked on (types 1–2 show its sentence / asked part): the open decision, or in the walk-through the row on display
  const askFact = leans ? leans.fact : cur ? (cur.fact || cur.expect) : mode === 'walk' ? (walkLast ? walkLast.fact : (s.view.steps[0] || {}).fact || null) : null;
  // where to look while a statement is open (types 1–2): the sentence's line / the asked part, never the answer
  const cueIds = (fact) => (p.cue && p.cue[fact] ? p.cue[fact].map((x) => partId(x, p.figure)) : ids(p, fact));
  const marks = useMemo(() => {
    const out = [], pre = s.view.pre || [];
    s.done.forEach((fact) => { const i = pre.indexOf(fact); out.push({ fact, style: 'on', delay: intro.current && i >= 0 ? 250 + i * 260 : 0 }); });
    for (const t of targets(p)) {
      if (s.done.includes(t) || isGiven) continue;            // type 1: the drawing never shows the answer before it is written
      if (isParts) { if (t === askFact) out.push({ fact: t, style: 'goal', only: p.cue && p.cue[t] }); continue; }   // type 2: only the asked part
      out.push({ fact: t, style: 'goal' });
    }
    return out;
  }, [s.done, s.view, p, isGiven, isParts, askFact]);
  const rowNo = s.rows.length + 1;
  const activeFact = leans ? leans.fact : cur ? (cur.kind === 'reason' ? cur.fact : (mode === 'fill' || mode === 'walk') ? cur.fact : null) : null;
  const cueFact = small && !leans && mode !== 'tap' && ((cur && cur.kind === 'statement') || (mode === 'walk' && !cur && !walkLast)) ? askFact : null;
  const focus = useMemo(() => {
    if (cueFact) return cueIds(cueFact);
    const f = activeFact || (walkLast && walkLast.fact);
    return f && f !== cong ? ids(p, f) : [];
  }, [activeFact, walkLast, p, cong, cueFact]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── chips of a reason decision: fixed per fact, so a re-render never reshuffles them ── */
  const chipCache = useRef({});
  const chipsFor = (fact) => {
    if (!chipCache.current[fact]) chipCache.current[fact] = reasonChips(p, fact, s.view.chipsN || 4, makeR(seeded(hash(`${p.id}:${fact}`))));
    return chipCache.current[fact];
  };

  /* ── the sheet: one row label, one question, its answers; the notebook row it belongs to ── */
  const isDone = ready(s);
  const total = useMemo(() => {
    const known = s.view.known || [];
    return new Set([...(s.view.pre || []).filter((f) => !known.includes(f)), ...s.view.steps.map((x) => x.fact)]).size;
  }, [s.view]);
  const totalRows = Math.max(total, s.rows.length);
  const rowAt = (fact) => s.rows.findIndex((x) => x.fact === fact);
  const colorOf = (fact) => (level === 1 && p.facts[fact].mark ? PAIR[p.facts[fact].mark.color] : undefined);
  const given = p.givenText || [];
  // type 2, Level 1: the letters of the active part and of its partner carry the row's pair colour in the given congruence
  const lit = s.view.letters && askFact && p.facts[askFact] && p.facts[askFact].kind !== 'cong' && cong ? (() => {
    const f = p.facts[askFact], t1 = p.facts[cong].map.map((m) => m[0]);
    return { at: (f.kind === 'seg' ? [...f.x] : [f.x.v]).map((q) => t1.indexOf(q)), color: f.mark ? PAIR[f.mark.color] : undefined };
  })() : null;
  const congQuote = cong ? <>{lit ? <CongSt st={p.facts[cong]} at={lit.at} color={lit.color} /> : <St st={p.facts[cong]} />} <span className="prf-fc-note">{T['lbl.byOrder']}</span></> : null;
  let head = null, body = null, label = cur ? cur.label : '', hint = null, onCancel = null, onPick = () => {}, now = null, whyShown = why;

  const tris = p.figure.tris || [];
  if (planQ) {
    const gp = partsOf(p.facts[targets(p)[0]]).map(showPart), both = planQ.picked.length === 2;
    head = { kicker: T['lbl.beforeStart'], ask: <Tx k="lbl.planTris" vars={{ x: gp[0], y: gp[1] }} /> };
    label = '';
    body = { t: 'node', node: (
      <>
        <div className="prf-chips prf-cols-2">
          {tris.map((t) => { const id = partId(t), on = planQ.picked.includes(id); return <button type="button" key={id} className={`prf-chip prf-partc${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => pickPlan(id)}><Mx s={`△${t.join('')}`} /></button>; })}
        </div>
        {both && <div className="prf-go-row"><button type="button" className="prf-go" onClick={() => setPlanQ(null)}>{T['btn.start']}</button></div>}
      </>
    ) };
  } else if (leans) {
    const role = roleOf(p, leans.fact), at = rowAt(leans.fact);
    const answer = role === 'vertical' || role === 'common' ? 'seen' : role === 'congruence' || role === 'conclusion' ? 'rows' : 'given';   // type 2's partner leans on the given congruence
    const done = !!leans.picked;
    head = { kicker: fill('lbl.row', { n: at + 1 || rowNo }), ask: T['lbl.leans'] };
    now = { at };
    label = '';
    if (!done) {
      body = { t: 'chips', cols: 3, chips: [['given', T['lbl.leanGiven']], ['seen', T['lbl.leanSeen']], ['rows', T['lbl.leanRows']]].map(([id, lb]) => ({ id, label: lb })) };
      onPick = (id) => {
        setLeans({ ...leans, picked: id, answer });
        if (answer === 'rows') { const js = (p.just[leans.fact] || [])[0]; setLead(js ? js.needs : []); later('lead', 2200, () => setLead([])); } else { setPulse(ids(p, leans.fact)); later('p', 1900, () => setPulse([])); }
      };
    } else {
      body = { t: 'node', node: (
        <>
          <div className="prf-chips prf-cols-3">
            {[['given', T['lbl.leanGiven']], ['seen', T['lbl.leanSeen']], ['rows', T['lbl.leanRows']]].map(([id, lb]) => <button type="button" key={id} className={`prf-chip${id === leans.answer ? ' is-yes' : ' is-dim'}`} disabled>{lb}</button>)}
          </div>
          <div className="prf-go-row"><button type="button" className="prf-go" onClick={() => setLeans(null)}>{T['btn.next']}</button></div>
        </>
      ) };
    }
  } else if (isDone) {
    head = { ask: T['lbl.proofDone'] };
    body = { t: 'qed', label: isGiven ? T['btn.doneRead'] : null };
  } else if (mode === 'walk' && !cur) {
    // the walk-through: the guide says what is done and why; nothing is graded, so nothing says "נכון"
    if (!walkLast) {
      head = { kicker: T['lbl.howTo'], coach: T['coach.start'] };
      body = { t: 'next', label: T['btn.start'] };
      now = { st: null, reason: null, ask: null };
    } else {
      const at = s.rows.length - 1, role = roleOf(p, walkLast.fact), rs = REASONS[walkLast.reason] ? walkLast.reason : 'given', w = whyOf(p, walkLast.fact, walkLast.reason);
      // a row that stands on a theorem / definition: the guide quotes its full sentence (§6.2.3); the others name their reason in a word
      head = { kicker: fill('lbl.rowShow', { n: at + 1 }), coach: role === 'given' || role === 'given-more' ? T['coach.given'] : w.law && w.law === rs ? <><Tx k={w.key} vars={w.vars} /><Law id={w.law} className="prf-why-law" /></> : <><Tx k={w.key} vars={w.vars} /> {fill('coach.reason', { reason: reasonInline(rs) })}</> };
      if (w.law && w.law === rs && !(role === 'given' || role === 'given-more')) head.said = walkLast.fact;
      body = { t: 'next', label: T['btn.gotIt'] };
      now = { at };
      whyShown = null;
    }
  } else if (cur && cur.kind === 'reason') {
    const fact = cur.fact, role = roleOf(p, fact);
    head = { kicker: fill('lbl.rowReason', { n: rowNo }), ask: role === 'congruence' ? T['q.whyCong'] : role === 'conclusion' ? T['q.whyConcl'] : T['q.whyRow'] };
    now = { st: <St st={p.facts[fact]} color={colorOf(fact)} />, reason: null, ask: 'reason' };
    if (mode === 'tap') {
      // a list of theorems with their sentences is long: while it is open the big question and the lines about the row before step aside
      const key = cur.key;
      body = { t: 'node', node: <GroupPick key={key} wrong={cur.wrong} onPick={(id) => dispatch({ t: 'reason', id })} onGroup={(g) => { setLawList(g ? key : null); if (g) { setFbs((f) => (f.some((x) => x.cls === 'err') ? f : [])); setWhy(null); setSaid(null); } }} /> };
      if (lawList === key) head.ask = null;
    } else {
      const all = chipsFor(fact), acc = acceptedReasons(p, fact);
      const keep = cur.rung >= 2 ? [...all.filter((c) => acc.includes(c)), ...all.filter((c) => !acc.includes(c) && !cur.wrong.includes(c))].slice(0, 3) : all;
      // a theorem / definition chip is read first: tap = its full sentence in the sheet, a second tap or "בחירה" = choose (§6.2.2).
      // While a sentence is open, a tap on ANY other chip only moves the preview there (a plain chip shows its name and "בחירה"):
      // the sheet's layout may have moved, so a decision is made only by "בחירה" or a second tap on the pressed chip.
      // With no preview open, a plain chip chooses at once. Where the app writes the row itself there is no tap at all.
      const at = peek && peek.key === cur.key && all.includes(peek.id) && !cur.wrong.includes(peek.id) ? peek.id : null;
      const choose = (id) => { setPeek(null); dispatch({ t: 'reason', id }); };
      body = { t: 'chips', chips: all.map((id) => ({ id, label: REASONS[id].short, sub: T[`sub.${id}`], disabled: cur.wrong.includes(id), dim: !keep.includes(id), law: hasLaw(id) || !!at, on: at === id })) };
      onPick = (id) => {
        if (at === id) { if (Date.now() - peek.t >= 350) choose(id); return; }      // the tail of a double tap on the pressed chip is not a choice
        if (!at && !hasLaw(id)) { choose(id); return; }
        // the feedback lines stay where they are (an error line is what the student needs for the next pick); the preview is read out too
        setPeek({ key: cur.key, id, t: Date.now() });
        setLive(hasLaw(id) ? `${REASONS[id].short}. ${lawWord(id)}: ${REASONS[id].full} ${T['btn.choose']}` : `${REASONS[id].short}. ${T['btn.choose']}`);
      };
      if (at) head.law = { id: at, name: hasLaw(at) ? null : REASONS[at].short, onChoose: () => choose(at) };
    }
    if (s.pending && (mode === 'tiles' || mode === 'tap')) onCancel = () => dispatch({ t: 'cancel' });
  } else if (cur && cur.kind === 'statement') {
    const step = s.view.steps.find((x) => x.fact === cur.fact);
    const asked = askFact && p.facts[askFact] && p.facts[askFact].kind !== 'cong' ? askFact : null;
    now = { st: isParts && asked ? <Ask part={p.facts[asked].x} className="prf-ask-st" /> : null, reason: null, ask: 'st' };
    if ((mode === 'fill' || mode === 'walk') && step && step.options) {
      head = { kicker: fill('lbl.rowStmt', { n: rowNo }), ask: isGiven ? T['q.sentence'] : isParts ? T['q.partner'] : T['lbl.whatClaim'] };
      const items = step.options.map((st, i) => ({ id: `o${i}`, st, disabled: cur.wrong.includes(norm(p.figure, st)) }));
      body = { t: 'options', items };
      onPick = (id) => dispatch({ t: 'statement', st: items.find((x) => x.id === id).st });
    } else if (mode === 'tiles') {
      head = { kicker: fill('lbl.rowStmt', { n: rowNo }), ask: T['lbl.pickTile'] };
      const req = required(p);
      const items = s.view.tiles.filter((t) => !(t.fact && s.done.includes(t.fact))).map((t) => ({ id: t.id, st: t.st, disabled: badTiles.includes(t.id) || cur.wrong.includes(norm(p.figure, t.st)) }));
      body = { t: 'tiles', items };
      onPick = (id) => {
        const t = s.view.tiles.find((x) => x.id === id), r = dispatch({ t: 'statement', st: t.st });
        if (r.fx.some((f) => f.t === 'fb' && f.cls === 'err') && !(t.fact && req.has(t.fact))) setBadTiles((b) => [...b, id]);
      };
    } else if (mode === 'tap') {
      const two = sel.parts.length === 2, both = sel.kind === 'tri' && two;
      head = { kicker: fill('lbl.rowStmt', { n: rowNo }), ask: sel.chooser ? null : both ? T['lbl.matchOrder'] : sel.parts.length === 1 ? T['lbl.tapSecond'] : two ? null : T['lbl.tapTwo'] };
      body = { t: 'node', node: (
        <TapStatement sel={sel}
          onAdd={(st) => { dispatch({ t: 'statement', st }); sel.clear(); }}
          onMatching={(tri1, order) => { dispatch({ t: 'matching', tri1, order }); sel.clear(); }} />
      ) };
    }
    // where the answer is read from: the sentence being read (type 1, its gap), or the given congruence (type 2)
    if (head && isGiven && step && step.options) {
      const g = asked && given.find((x) => x.facts.includes(asked));
      if (g) head.quote = g.form === 'eq' ? <St st={p.facts[g.facts[0]]} /> : <Tx k={g.key} vars={g.vars} />;
    }
    if (head && isParts) head.quote = congQuote;
  }
  if (cur && !planQ && !leans && !isDone) hint = { rung: cur.rung, nudge, wait: cur.rung === 2 && showKey !== cur.key, waitMs: RULES.HINT3_WAIT_MS };

  // the sheet is quoting this row's theorem now (the why-line, the guide's bubble, the "מילאנו יחד" note): the notebook shows it when the sheet moves on
  const saidRow = end ? null : head && head.said ? head.said : said;

  // Level 1: while the congruence's reason is open, the rows it stands on stay lit (no extra button)
  const congNeeds = useMemo(() => {
    if (level !== 1 || !cur || cur.kind !== 'reason' || !cong || cur.fact !== cong) return [];
    const j = (p.just[cong] || []).find((x) => x.needs.every((f) => s.done.includes(f))) || (p.just[cong] || [])[0];
    return j ? j.needs : [];
  }, [level, cur, cong, p, s.done]);
  const leadRows = lead.length ? lead : congNeeds;

  // the walk-through: a row "seen in the drawing" (vertical angles, a common side) flashes there once
  const walkFact = mode === 'walk' && walkLast ? walkLast.fact : null;
  useEffect(() => {
    if (!walkFact || !s.view.ties) return;
    const role = roleOf(p, walkFact);
    if (role !== 'vertical' && role !== 'common') return;
    setPulse([]); later('p0', 20, () => setPulse(ids(p, walkFact))); later('p', 1900, () => setPulse([]));
  }, [walkFact]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── progress: "שורה X מתוך Y" ── */
  const curN = isDone || s.ended ? 0 : leans ? rowAt(leans.fact) + 1 : mode === 'walk' && !cur ? Math.max(1, s.rows.length) : Math.min(rowNo, totalRows);
  const progText = curN ? fill('lbl.rowOf', { n: curN, t: totalRows }) : T['lbl.allRows'];

  // "המשפטים": only at מודרך (the app guides every step) the sheet shows which theorem this row stands on. At ביחד and לבד
  // choosing it is the counted decision, so the sheet highlights nothing there.
  const hasLaws = useMemo(() => { const l = lawsOf(type.subject); return l.laws.length + l.more.length > 0; }, [type.subject]);
  const lawNow = (() => {
    if (level !== 1 || end || isDone || planQ) return null;
    const fact = leans ? leans.fact : cur ? (cur.fact || cur.expect) : walkLast ? walkLast.fact : null;
    if (!fact || !p.facts[fact]) return null;
    const row = s.rows.find((x) => x.fact === fact), js = p.just[fact] || [];
    const r = row ? row.reason : ((js.find((j) => j.needs.every((f) => s.done.includes(f))) || js[0] || {}).reasons || [])[0];
    return r && r !== 'given' ? r : null;
  })();

  const tapping = mode === 'tap' && !end && !planQ && !!cur && cur.kind === 'statement' && !leans && !isDone;
  const leave = () => onLeave && onLeave({ nonSolo: s.nonSolo, decisions: s.decisions, ended: s.ended });
  const showCard = end && cardOn;

  return (
    <div className={`prf-screen prf-mode-${mode}${end ? ' is-ended' : ''}`} data-pf={JSON.stringify({ template: p.template, seed: p.seed, level: p.level, variant: p.variant, meta: p.meta || null })}>
      <div className="prf-head">
        <button type="button" className="prf-back" aria-label={T['btn.back']} onClick={leave}><IcBack /></button>
        <span className="prf-head-t">{type.label}</span>
        {levelName && <span className="prf-pill">{levelName}</span>}
        {hasLaws && <button type="button" className="prf-lawsb" aria-haspopup="dialog" aria-expanded={lawsOpen} aria-label={T['lbl.laws']} title={T['lbl.laws']} onClick={() => setLawsOpen(true)}><IcBook /><span aria-hidden="true">{T['lbl.laws']}</span></button>}
        {onSwap && !s.ended && <button type="button" className="prf-swap" aria-label={T['btn.swap']} onClick={() => onSwap({ nonSolo: s.nonSolo, decisions: s.decisions })}><IcSwap /><span>{T['btn.swap']}</span></button>}
      </div>
      {!showCard && (
        <div className="prf-prog">
          <span className="prf-prog-t">{progText}</span>
          <span className="prf-prog-bar" aria-hidden="true">
            {[...Array(totalRows)].map((_, i) => <i key={i} className={i === curN - 1 ? 'is-cur' : i < s.rows.length ? 'is-done' : ''} />)}
          </span>
        </div>
      )}
      <div className="prf-figcol">
        <div className="prf-stage">
          <ProofFigure problem={p} marks={marks} focus={end || planQ ? [] : focus} selected={planQ ? planQ.picked : tapping ? sel.selected : []} pulse={pulse} question={question}
            tappable={planQ ? ['tri'] : tapping ? (small ? ['seg', 'ang'] : ['seg', 'ang', 'tri']) : false} onPart={planQ ? (id) => pickPlan(id) : sel.tap} ending={ending} />
        </div>
      </div>
      <div className="prf-work" ref={workEl}>
        {showCard ? <EndCard problem={p} rows={s.rows} {...end} /> : (
          <>
            <div className="prf-nb" ref={nbEl}>
              {(p.text || []).map((t, i) => <p key={i} className="prf-intro"><Tx k={t.key} vars={t.vars} /></p>)}
              <div className="prf-nb-head">
                <span className="prf-nb-k">{T['lbl.given']}</span>
                <ol className="prf-givl">
                  {given.map((g, i) => {
                    const used = g.facts.every((f) => s.done.includes(f)), f0 = p.facts[g.facts[0]];
                    const on = isGiven && !end && !isDone && askFact && g.facts.includes(askFact);       // type 1: the sentence being read
                    return (
                      <li key={i} className={`prf-gv${used && !isParts ? ' is-used' : ''}${on ? ' is-now' : ''}`}>
                        <span className="prf-gv-n">{used && !isParts ? <IcCheck /> : i + 1}</span>
                        <span className="prf-gv-t">
                          {g.form !== 'eq' ? <Tx k={g.key} vars={g.vars} /> : f0.kind === 'cong' && lit && !end ? <CongSt st={f0} at={lit.at} color={lit.color} /> : <St st={f0} />}
                          {g.byOrder && <> <span className="prf-fc-note">{T['lbl.byOrder']}</span></>}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {!isGiven && <span className="prf-nb-k">{T['lbl.toProve']}</span>}
                {!isGiven && (
                  <span className="prf-goals">
                    {targets(p).map((t) => {
                      const ok = s.done.includes(t);
                      // while writing the congruence is itself a decision (a statement gap, or Level 3), the goal names the two triangles without the matching order
                      const step = s.view.steps.find((x) => x.fact === t);
                      const open = !ok && t === cong && tris.length === 2 && step && step.ask.includes('statement') && (mode === 'tap' || !!step.options);
                      return <span key={t} className={`prf-goal${ok ? ' is-done' : ''}`}>{ok ? <IcCheck /> : <IcLock />}{open ? <span><Tx k="lbl.goalCong" vars={{ t1: `△${tris[0].join('')}`, t2: `△${tris[1].join('')}` }} /></span> : isParts && !ok ? <Ask part={p.facts[t].x} /> : <St st={p.facts[t]} />}</span>;
                    })}
                  </span>
                )}
              </div>
              {s.view.plan === 'line' && <p className="prf-plan">{T['lbl.planL3']}</p>}
              <ProofRows problem={p} rows={s.rows} total={totalRows} now={end ? null : now} openRow={openRow} onOpen={setOpenRow} fresh={fresh} lead={leadRows} said={saidRow} />
            </div>
            {!end && (
              <Tray label={label} head={head} body={body} fbs={fbs} why={whyShown} hintLine={hintLine} hint={hint}
                onPick={onPick} onHint={() => dispatch({ t: 'hint' })} onNext={() => dispatch({ t: 'next' })} onQed={() => dispatch({ t: 'qed' })} onCancel={onCancel} qedBusy={s.ended} />
            )}
          </>
        )}
      </div>
      <div className="prf-sr" aria-live="polite">{live}</div>
      {lawsOpen && <Theorems subject={type.subject} mode="sheet" current={lawNow} onClose={() => setLawsOpen(false)} />}
    </div>
  );
}
