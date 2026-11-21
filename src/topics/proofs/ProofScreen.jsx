'use client';
/* The proofs section: screen C, one proof (spec §11.1). Header, the drawing (always in view), the
   given + goal strip, the finished rows, and the bottom tray. It drives session.js: every tap is an
   action, the reducer answers with the next state and effects, and this file only shows them. */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { seeded, makeR } from '../new/core.js';
import { start, act, ready, summary } from './session.js';
import { reasonChips, partsOf, targets, roleOf, norm, required, whyOf, congOf, acceptedReasons, showPart } from './core.js';
import { partId } from './figure-core.js';
import { REASONS } from './reasons.js';
import { RULES } from './mastery.js';
import { T, LABELS, fill } from './texts.js';
import ProofFigure, { useReducedMotion } from './ProofFigure.jsx';
import ProofRows from './ProofRows.jsx';
import Tray from './Tray.jsx';
import EndCard from './EndCard.jsx';
import { useSelection, TapStatement, GroupPick } from './TapBuild.jsx';
import { St, Tx, Mx, Ask, CongSt, IcBack, IcCheck, IcLock, IcSwap, IcHand } from './signs.jsx';

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
  const [walk, setWalk] = useState({ tie1: false, tie2: false });
  const [lead, setLead] = useState([]);
  const [fresh, setFresh] = useState(null);
  const [showKey, setShowKey] = useState(null);       // the decision whose "הראו לי" is unlocked
  const [nudge, setNudge] = useState(false);
  const [ending, setEnding] = useState(restored && restored.ended ? 'tint' : null);
  const [cardOn, setCardOn] = useState(false);
  const [live, setLive] = useState('');
  // type 4: the unscored plan question "באילו שני משולשים נמצאים …?" before the first row (not a decision, no row)
  const [planQ, setPlanQ] = useState(() => (!restored && view.plan === 'tris' && (problem.figure.tris || []).length === 2 ? { picked: [] } : null));
  const n = useRef(0), timers = useRef({}), rowsEl = useRef(null), workEl = useRef(null), qedDone = useRef(false), intro = useRef(!restored);
  const reduce = useReducedMotion();
  const sel = useSelection(problem, (key) => setFbs([{ id: ++n.current, cls: 'note', key, vars: {}, label: '' }]), type.n <= 2 ? ['seg', 'ang'] : null);
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
      } else if (f.t === 'why') w = { id: ++n.current, key: f.key, vars: f.vars };
      else if (f.t === 'hint') h = f;
      else if (f.t === 'question') { setQuestion(f.parts.map((x) => partId(x, p.figure))); later('q', RULES.Q_BADGE_MS, () => setQuestion([])); }
      else if (f.t === 'filled') filled = f;
      else if (f.t === 'mark') said.push(T['lbl.marked']);
      else if (f.t === 'end') finish(r.s, f.clean);
    }
    if (filled) {
      const row = r.s.rows.find((x) => x.fact === filled.fact);
      if (row && !w) { const q = whyOf(p, filled.fact, row.reason); w = { id: ++n.current, key: q.key, vars: q.vars }; }
      setLeans({ fact: filled.fact, picked: null });
    }
    setFbs(out); setWhy(w);
    if (h) {
      setHintLine({ id: ++n.current, key: h.key, vars: h.vars, rung: h.rung });
      setPulse([]); later('p0', 20, () => setPulse(h.parts.map((x) => partId(x, p.figure)))); later('p', 1900, () => setPulse([]));
      said.push(fill(h.key, h.vars));
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
    setEnding(type.n >= 3 ? 'move' : 'tint');
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

  // the newest row stays in view
  const rowsSeen = useRef(s.rows.length);
  useLayoutEffect(() => {
    const el = rowsEl.current;
    if (el && s.rows.length !== rowsSeen.current) el.scrollTop = el.scrollHeight;
    rowsSeen.current = s.rows.length;
  }, [s.rows.length]);
  // on a computer the page itself scrolls (the sheet is as tall as its rows): keep the sheet's foot, where the tray is, in view
  useEffect(() => {
    const el = workEl.current;
    if (!el || !window.matchMedia || !window.matchMedia('(min-width:1024px) and (min-height:501px)').matches) return;
    if (end && cardOn) { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }   // the end: the result line first, the notebook page under it
    const over = el.getBoundingClientRect().bottom - window.innerHeight + 16;
    if (over > 0) window.scrollBy({ top: over, behavior: reduce ? 'auto' : 'smooth' });
  }, [s.rows.length, curKey, cardOn, fbs, why, hintLine, leans, planQ]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const tn = type.n;
  const walkLast = mode === 'walk' && !cur && s.rows.length ? s.rows[s.rows.length - 1] : null;
  // the row being worked on (types 1–2 show its sentence / asked part): the open decision, or in the walk-through the row on display
  const askFact = leans ? leans.fact : cur ? (cur.fact || cur.expect) : mode === 'walk' ? (walkLast ? walkLast.fact : (s.view.steps[0] || {}).fact || null) : null;
  // where to look while a statement is open (types 1–2): the sentence's line / the asked part, never the answer
  const cueIds = (fact) => (p.cue && p.cue[fact] ? p.cue[fact].map((x) => partId(x, p.figure)) : ids(p, fact));
  const marks = useMemo(() => {
    const out = [], pre = s.view.pre || [];
    s.done.forEach((fact) => { const i = pre.indexOf(fact); out.push({ fact, style: 'on', delay: intro.current && i >= 0 ? 250 + i * 260 : 0 }); });
    for (const t of targets(p)) {
      if (s.done.includes(t) || tn === 1) continue;            // type 1: the drawing never shows the answer before it is written
      if (tn === 2) { if (t === askFact) out.push({ fact: t, style: 'goal', only: p.cue && p.cue[t] }); continue; }   // type 2: only the asked part
      out.push({ fact: t, style: 'goal' });
    }
    return out;
  }, [s.done, s.view, p, tn, askFact]);
  const rowNo = s.rows.length + 1;
  const activeFact = leans ? leans.fact : cur ? (cur.kind === 'reason' ? cur.fact : (mode === 'fill' || mode === 'walk') ? cur.fact : null) : null;
  const cueFact = tn <= 2 && !leans && mode !== 'tap' && ((cur && cur.kind === 'statement') || (mode === 'walk' && !cur && !walkLast)) ? askFact : null;
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

  /* ── the tray ── */
  const isDone = ready(s);
  const rowKicker = fill('lbl.row', { n: rowNo });
  const colorOf = (fact) => (level === 1 && p.facts[fact].mark ? PAIR[p.facts[fact].mark.color] : undefined);
  let head = null, body = null, label = cur ? cur.label : '', hint = null, onCancel = null, onPick = () => {};

  const tris = p.figure.tris || [];
  if (planQ) {
    const gp = partsOf(p.facts[targets(p)[0]]).map(showPart), both = planQ.picked.length === 2;
    head = { ask: <Tx k="lbl.planTris" vars={{ x: gp[0], y: gp[1] }} /> };
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
    const role = roleOf(p, leans.fact);
    const answer = role === 'vertical' || role === 'common' ? 'seen' : role === 'congruence' || role === 'conclusion' ? 'rows' : 'given';   // type 2's partner leans on the given congruence
    const done = !!leans.picked;
    head = { kicker: fill('lbl.row', { n: s.rows.findIndex((x) => x.fact === leans.fact) + 1 || rowNo }), st: p.facts[leans.fact], ask: T['lbl.leans'] };
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
    body = { t: 'qed' };
  } else if (mode === 'walk' && !cur) {
    if (!walkLast) { head = { ask: T['lbl.walkIntro'] }; body = { t: 'next' }; } else {
      const role = roleOf(p, walkLast.fact);
      head = { kicker: fill('lbl.row', { n: s.rows.length }), st: p.facts[walkLast.fact], color: colorOf(walkLast.fact), reason: REASONS[walkLast.reason].short };
      if (s.view.ties && !walk.tie1 && (role === 'vertical' || role === 'common')) {
        body = { t: 'action', label: T['lbl.show'], icon: <IcHand />, onClick: () => { setWalk((x) => ({ ...x, tie1: true })); setPulse([]); later('p0', 20, () => setPulse(ids(p, walkLast.fact))); later('p', 1900, () => setPulse([])); } };
      } else body = { t: 'next' };
    }
  } else if (cur && cur.kind === 'reason') {
    const fact = cur.fact;
    head = { kicker: rowKicker, st: p.facts[fact], color: colorOf(fact), ask: mode === 'tap' ? T['lbl.whereFrom'] : T['lbl.whatReason'] };
    if (mode === 'walk' && s.view.ties && !walk.tie2 && fact === cong) {
      head.ask = null;
      body = { t: 'action', label: T['lbl.leadRows'], onClick: () => {
        setWalk((x) => ({ ...x, tie2: true }));
        const js = (p.just[fact] || [])[0], needs = js ? js.needs : [];
        setLead(needs); later('lead', 2400, () => setLead([]));
        setPulse([]); later('p0', 20, () => setPulse(needs.flatMap((f) => ids(p, f)))); later('p', 1900, () => setPulse([]));
        setFbs([{ id: ++n.current, cls: 'note', key: 'hint.congruence.1', vars: {}, label: '' }]);
      } };
    } else if (mode === 'tap') {
      body = { t: 'node', node: <GroupPick key={cur.key} wrong={cur.wrong} onPick={(id) => dispatch({ t: 'reason', id })} /> };
    } else {
      const all = chipsFor(fact), acc = acceptedReasons(p, fact);
      const keep = cur.rung >= 2 ? [...all.filter((c) => acc.includes(c)), ...all.filter((c) => !acc.includes(c) && !cur.wrong.includes(c))].slice(0, 3) : all;
      body = { t: 'chips', chips: all.map((id) => ({ id, label: REASONS[id].short, disabled: cur.wrong.includes(id), dim: !keep.includes(id) })) };
      onPick = (id) => dispatch({ t: 'reason', id });
    }
    if (s.pending && (mode === 'tiles' || mode === 'tap')) onCancel = () => dispatch({ t: 'cancel' });
  } else if (cur && cur.kind === 'statement') {
    const step = s.view.steps.find((x) => x.fact === cur.fact);
    if ((mode === 'fill' || mode === 'walk') && step && step.options) {
      head = { kicker: rowKicker, ask: T['lbl.whatClaim'] };
      const items = step.options.map((st, i) => ({ id: `o${i}`, st, disabled: cur.wrong.includes(norm(p.figure, st)) }));
      body = { t: 'options', items };
      onPick = (id) => dispatch({ t: 'statement', st: items.find((x) => x.id === id).st });
    } else if (mode === 'tiles') {
      head = { kicker: rowKicker, ask: T['lbl.pickTile'] };
      const req = required(p);
      const items = s.view.tiles.filter((t) => !(t.fact && s.done.includes(t.fact))).map((t) => ({ id: t.id, st: t.st, disabled: badTiles.includes(t.id) || cur.wrong.includes(norm(p.figure, t.st)) }));
      body = { t: 'tiles', items };
      onPick = (id) => {
        const t = s.view.tiles.find((x) => x.id === id), r = dispatch({ t: 'statement', st: t.st });
        if (r.fx.some((f) => f.t === 'fb' && f.cls === 'err') && !(t.fact && req.has(t.fact))) setBadTiles((b) => [...b, id]);
      };
    } else if (mode === 'tap') {
      const two = sel.parts.length === 2, tris = sel.kind === 'tri' && two;
      head = { kicker: rowKicker, ask: sel.chooser ? null : tris ? T['lbl.matchOrder'] : sel.parts.length === 1 ? T['lbl.tapSecond'] : two ? null : T['lbl.tapTwo'] };
      body = { t: 'node', node: (
        <TapStatement sel={sel}
          onAdd={(st) => { dispatch({ t: 'statement', st }); sel.clear(); }}
          onMatching={(tri1, order) => { dispatch({ t: 'matching', tri1, order }); sel.clear(); }} />
      ) };
    }
  }
  const given = p.givenText || [];
  // type 2, Level 1: the letters of the active part and of its partner carry the row's pair colour in the given congruence
  const lit = s.view.letters && askFact && p.facts[askFact] && p.facts[askFact].kind !== 'cong' && cong ? (() => {
    const f = p.facts[askFact], t1 = p.facts[cong].map.map((m) => m[0]);
    return { at: (f.kind === 'seg' ? [...f.x] : [f.x.v]).map((q) => t1.indexOf(q)), color: f.mark ? PAIR[f.mark.color] : undefined };
  })() : null;
  // types 1–2: the tray names the sentence being read (type 1), or the given congruence and the asked part "AB = ▢" (type 2:
  // on a phone the strip scrolls, and the congruence is what the student reads from)
  if (head && !planQ && !isDone && askFact && p.facts[askFact] && p.facts[askFact].kind !== 'cong') {
    const g = tn === 1 && given.find((x) => x.facts.includes(askFact));
    if (g) head.sent = g.form === 'eq' ? <St st={p.facts[g.facts[0]]} /> : <Tx k={g.key} vars={g.vars} />;
    if (tn === 2 && cong) head.sent = <>{lit ? <CongSt st={p.facts[cong]} at={lit.at} color={lit.color} /> : <St st={p.facts[cong]} />} <span className="prf-fc-note">{T['lbl.byOrder']}</span></>;
    if (tn === 2 && !head.st) head.lead = <Ask part={p.facts[askFact].x} className="prf-ask-st" />;
  }
  if (cur && !planQ && !leans && !isDone && !(mode === 'walk' && body && body.t === 'action')) {
    hint = { rung: cur.rung, nudge, wait: cur.rung === 2 && showKey !== cur.key, waitMs: RULES.HINT3_WAIT_MS };
  }

  const tapping = mode === 'tap' && !end && !planQ && !!cur && cur.kind === 'statement' && !leans && !isDone;
  const leave = () => onLeave && onLeave({ nonSolo: s.nonSolo, decisions: s.decisions, ended: s.ended });

  return (
    <div className={`prf-screen prf-mode-${mode}${end ? ' is-ended' : ''}`} data-pf={JSON.stringify({ template: p.template, seed: p.seed, level: p.level, variant: p.variant, meta: p.meta || null })}>
      <div className="prf-head">
        <button type="button" className="prf-back" aria-label={T['btn.back']} onClick={leave}><IcBack /></button>
        <span className="prf-head-t">{type.name}</span>
        {levelName && <span className="prf-pill">{levelName}</span>}
        {onSwap && !s.ended && <button type="button" className="prf-swap" aria-label={T['btn.swap']} title={T['btn.swap']} onClick={() => onSwap({ nonSolo: s.nonSolo, decisions: s.decisions })}><IcSwap /></button>}
        <span className="prf-dots" role="img" aria-label={`${T['lbl.cleanAria']}: ${dots.filter((d) => d === true).length}`}>
          {dots.map((d, i) => <i key={i} className={d === true ? 'is-on' : d === false ? 'is-off' : ''} />)}
        </span>
      </div>
      <div className="prf-figcol">
        <div className="prf-stage">
          <ProofFigure problem={p} marks={marks} focus={end || planQ ? [] : focus} selected={planQ ? planQ.picked : tapping ? sel.selected : []} pulse={pulse} question={question}
            tappable={planQ ? ['tri'] : tapping ? (tn <= 2 ? ['seg', 'ang'] : ['seg', 'ang', 'tri']) : false} onPart={planQ ? (id) => pickPlan(id) : sel.tap} ending={ending} />
        </div>
      </div>
      <div className="prf-work" ref={workEl}>
        <div className="prf-strip">
          <span className="prf-strip-given">
            <span className="prf-strip-k">{T['lbl.given']}</span>
            {given.map((g, i) => {
              const used = g.facts.every((f) => s.done.includes(f)), f0 = p.facts[g.facts[0]];
              const now = tn === 1 && !end && askFact && g.facts.includes(askFact);       // type 1: the sentence being read
              return (
                <span key={i} className={`prf-fc${used ? ' is-used' : ''}${now ? ' is-now' : ''}`}>
                  {g.form !== 'eq' ? <span><Tx k={g.key} vars={g.vars} /></span> : f0.kind === 'cong' && lit && !end ? <CongSt st={f0} at={lit.at} color={lit.color} /> : <St st={f0} />}
                  {g.byOrder && <span className="prf-fc-note">{T['lbl.byOrder']}</span>}
                  {used && tn !== 2 && <IcCheck />}
                </span>
              );
            })}
          </span>
          {tn !== 1 && <span className="prf-strip-goal">
            <span className="prf-strip-k">{T['lbl.toProve']}</span>
            {targets(p).map((t) => {
              const ok = s.done.includes(t);
              // while writing the congruence is itself a decision (a statement gap, or Level 3), the goal names the two triangles without the matching order
              const step = s.view.steps.find((x) => x.fact === t), tris = p.figure.tris || [];
              const open = !ok && t === cong && tris.length === 2 && step && step.ask.includes('statement') && (mode === 'tap' || !!step.options);
              return <span key={t} className={`prf-fc prf-fc-goal${ok ? ' is-done' : ''}`}>{ok ? <IcCheck /> : <IcLock />}{open ? <span><Tx k="lbl.goalCong" vars={{ t1: `△${tris[0].join('')}`, t2: `△${tris[1].join('')}` }} /></span> : tn === 2 && !ok ? <Ask part={p.facts[t].x} /> : <St st={p.facts[t]} />}</span>;
            })}
          </span>}
        </div>
        {end && cardOn ? <EndCard problem={p} rows={s.rows} {...end} /> : (
          <>
            <div className="prf-rows" ref={rowsEl}>
              {(p.text || []).map((t, i) => <p key={i} className="prf-intro"><Tx k={t.key} vars={t.vars} /></p>)}
              {s.view.plan === 'line' && <p className="prf-plan">{T['lbl.planL3']}</p>}
              <ProofRows problem={p} rows={s.rows} openRow={openRow} onOpen={setOpenRow} fresh={fresh} lead={lead} />
            </div>
            {!end && (
              <Tray label={label} head={head} body={body} fbs={fbs} why={why} hintLine={hintLine} hint={hint}
                onPick={onPick} onHint={() => dispatch({ t: 'hint' })} onNext={() => dispatch({ t: 'next' })} onQed={() => dispatch({ t: 'qed' })} onCancel={onCancel} qedBusy={s.ended} />
            )}
          </>
        )}
      </div>
      <div className="prf-sr" aria-live="polite">{live}</div>
    </div>
  );
}
