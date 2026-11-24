'use client';
/* The proofs section: screen B, the warm-up ("חימום", spec §7.1). One small question at a time on
   the same frame as a proof: header, the drawing, the question, and the answer chips (or a tap in
   the drawing) in the bottom tray. A miss shows its explanation; nothing here counts toward levels.
   Tasks and the flow rule come from warmup-core.js; this file only shows them.

   Tracker contract (§10.4): the answer sits in a .step-card whose .step-label is the skill's short
   name; a right answer mounts a small new .fb.ok node, a miss a small new .fb.err node.
   Similarity (spec 2026-11-23 §7.7): S4 has no drawing — the proportion stands in the drawing's place and the answer
   is typed on the number keypad (a format slip is a quiet note, never a try); S5 draws two triangles or two rectangles. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { seeded, makeR } from '../new/core.js';
import { makeTask, checkTask, flow, next, answer } from './warmup-core.js';
import { numberOf } from './session.js';
import { T, fill } from './texts.js';
import Keypad, { typeKey } from './Keypad.jsx';
import ProofFigure from './ProofFigure.jsx';
import { useSelection } from './TapBuild.jsx';
import { St, Tx, Mx, Fracs, IcBack, IcLock, IcClose, IcNote } from './signs.jsx';

const newSeed = () => { try { const a = new Uint32Array(1); window.crypto.getRandomValues(a); return (a[0] % 2147483646) + 1; } catch { return Math.floor(Math.random() * 2147483646) + 1; } };
const ONLY_TASKS = 2;                                  // rescue step 1: two tasks of one kind
const NO_FIG = { points: {}, lines: [], segs: [], angles: [], tris: [] };   // S4: a proportion, no drawing

export default function Warmup({ type, kinds, only = null, seed, onDone, onLeave }) {
  const R = useRef(null);
  if (!R.current) R.current = makeR(seeded(seed || newSeed()));
  const [fl, setFl] = useState(() => (only ? flow([only], { tasks: ONLY_TASKS }) : flow(kinds)));
  const kindAfter = (s) => (only ? (s.n < ONLY_TASKS ? only : null) : next(s));
  const [task, setTask] = useState(() => makeTask(R.current, kindAfter(fl)));
  const [res, setRes] = useState(null);                // { right, picked } once answered
  const [log, setLog] = useState([]);                  // right / wrong, in order (the header dots)
  const [pulse, setPulse] = useState([]);
  const [num, setNum] = useState({ text: '', slip: null });   // the keypad (S4): the typed text, a format note
  const n = useRef(0), timer = useRef(null), busy = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  const problem = useMemo(() => ({ figure: task.figure || NO_FIG, facts: task.facts }), [task]);
  const sel = useSelection(problem, null, ['seg']);
  const tapping = task.input === 'tap' && !res;
  const last = res ? kindAfter(fl) === null : false;

  function judge(picked) {
    if (res || busy.current) return;
    busy.current = true;
    const right = checkTask(task, picked);
    n.current += 1;
    setRes({ right, picked });
    setFl((s) => answer(s, task.kind, right));
    setLog((l) => [...l, right]);
    if (!right && task.input === 'tap') { setPulse(task.tap.need); clearTimeout(timer.current); timer.current = setTimeout(() => setPulse([]), 1900); }
  }
  function onward() {
    const k = kindAfter(fl);
    if (k === null) { onDone(fl.res); return; }
    busy.current = false;
    sel.clear(); setPulse([]); setRes(null); setNum({ text: '', slip: null });
    setTask(makeTask(R.current, k));
  }

  const marks = [
    ...task.marks.map((fact) => ({ fact, style: 'on' })),
    ...(res ? task.reveal.map((fact) => ({ fact, style: 'on' })) : []),
    ...(task.goal ? [{ fact: task.goal, style: 'goal' }] : []),
  ];
  function submitNum() {
    if (res) return;
    const v = numberOf(num.text);
    if (v.slip) { setNum((x) => ({ ...x, slip: { key: v.slip, vars: v.vars } })); return; }   // not a try: the box says what is wrong
    setNum((x) => ({ ...x, slip: null }));
    judge(num.text);
  }
  const keypad = task.input === 'keypad';
  // the proportion: x, then (answered) the right number in its place
  const shownPairs = keypad ? task.pairs.map((pr) => pr.map((q) => (q === 'x' && res ? <span className="prf-warm-x is-found">{String(task.answer)}</span> : q === 'x' ? <span className="prf-warm-x">x</span> : q))) : null;
  const eqLabel = keypad ? task.pairs.map(([a, b]) => fill('say.frac', { x: a === 'x' && res ? task.answer : a, y: b === 'x' && res ? task.answer : b })).join(' = ') : '';
  const skill = T[`skill.${task.kind}`];
  const dots = [...log, ...Array(Math.max(0, (only ? ONLY_TASKS : fl.first.length) - log.length)).fill(null)];
  const opts = task.options || [];
  const cols = opts.some((o) => o.st) ? 1 : opts.length === 3 ? 3 : 2;

  return (
    <div className="prf-screen prf-warm">
      <div className="prf-head">
        <button type="button" className="prf-back" aria-label={T['btn.back']} onClick={onLeave}><IcBack /></button>
        <span className="prf-head-t">{type.label}</span>
        <span className="prf-pill">{T['tab.warm']}</span>
        <span className="prf-dots" aria-hidden="true">{dots.map((d, i) => <i key={i} className={d === true ? 'is-on' : d === false ? 'is-off' : ''} />)}</span>
      </div>
      <div className="prf-figcol">
        {task.figure ? (
          <div className="prf-stage">
            <ProofFigure problem={problem} marks={marks} selected={tapping ? sel.selected : []} pulse={pulse}
              tappable={tapping ? ['seg'] : false} onPart={sel.tap} />
          </div>
        ) : keypad && (
          <div className="prf-stage prf-warm-eq" key={`e${log.length}`}><Fracs pairs={shownPairs} label={eqLabel} /></div>
        )}
      </div>
      <div className="prf-work">
        {(task.given || task.toProve) && (
          <div className="prf-strip">
            {task.given && <span className="prf-strip-given"><span className="prf-strip-k">{T['lbl.given']}</span>{task.given.map((st, i) => <span key={i} className="prf-fc"><St st={st} /></span>)}</span>}
            {task.toProve && <span className="prf-strip-goal"><span className="prf-strip-k">{T['lbl.toProve']}</span><span className="prf-fc prf-fc-goal"><IcLock /><St st={task.toProve} /></span></span>}
          </div>
        )}
        <div className="prf-warm-mid" key={`q${log.length}`}>
          <p className="prf-warm-k">{skill}</p>
          {task.sent && <p className="prf-warm-sent"><Tx k={task.sent.key} vars={task.sent.vars} /></p>}
          {task.st && <p className="prf-warm-st"><St st={task.st} /></p>}
          <p className="prf-warm-q"><Tx k={task.text.k} vars={task.text.vars} /></p>
        </div>
        <div className="prf-tray">
          <div className="step-card prf-step">
            <span className="step-label prf-sr" aria-hidden="true">{skill}</span>
            {res && (res.right
              ? <div className="fb ok prf-fb" key={`f${n.current}`}><span>{T['fb.ok']}</span></div>
              : <div className="fb err prf-fb" key={`f${n.current}`}><span><Tx k={task.why.k} vars={task.why.vars} /></span></div>)}
            {res && last && !only && <p className="prf-why">{T['ui.warmDone']}</p>}
            {keypad && !res && num.slip && <div className="prf-note prf-fb" key={`n${num.text}`}><IcNote /><span><Tx k={num.slip.key} vars={num.slip.vars} /></span></div>}
            {keypad && !res && <Keypad name={task.name} text={num.text} onKey={(k) => setNum((x) => ({ text: typeKey(x.text, k), slip: null }))} onSubmit={submitNum} />}
            {task.input === 'chips' && (
              <div className={`prf-chips prf-cols-${cols}${opts.some((o) => o.st) ? ' prf-tiles' : ''}`}>
                {opts.map((o) => {
                  const yes = res && o.id === task.answer, off = res && !yes;
                  if (off && o.st) return null;                    // long options: once answered only the right one stays, so the next button is in reach
                  return (
                    <button type="button" key={o.id} className={`prf-chip${o.st ? ' prf-tile' : ''}${o.m ? ' prf-vert' : ''}${yes ? ' is-yes' : off ? ' is-dim' : ''}`} disabled={!!res} onClick={() => judge(o.id)}>
                      {o.st ? <St st={o.st} /> : o.m ? <Mx s={o.m} /> : o.label}
                    </button>
                  );
                })}
              </div>
            )}
            {tapping && sel.chooser && (
              <div className="prf-tap">
                <p className="prf-tap-q">{T['lbl.chooser']}</p>
                <div className="prf-chips prf-cols-2">
                  {sel.chooser.map((id) => sel.index[id] && <button type="button" key={id} className="prf-chip" onClick={() => sel.pickFromChooser(id)}>{sel.index[id].he}</button>)}
                </div>
              </div>
            )}
            {tapping && !sel.chooser && (
              <div className="prf-warm-tap">
                <span className="prf-warm-picked" aria-live="polite">
                  {[0, 1].map((i) => (sel.parts[i] ? <span key={i} className="prf-fc is-now"><Mx s={sel.parts[i].part} /></span> : <i key={i} className="prf-slot is-wide" />))}
                </span>
                {sel.parts.length > 0 && <button type="button" className="prf-x" aria-label={T['btn.cancel']} onClick={sel.clear}><IcClose /></button>}
                <button type="button" className="prf-go" disabled={sel.parts.length !== 2} onClick={() => judge(sel.selected)}>{T['btn.these']}</button>
              </div>
            )}
            {res && <div className="prf-go-row"><button type="button" className="prf-go" onClick={onward}>{last ? T['btn.go'] : T['btn.next']}</button></div>}
          </div>
        </div>
      </div>
      <div className="prf-sr" aria-live="polite">{res ? (res.right ? T['fb.ok'] : T[task.why.k]) : ''}</div>
    </div>
  );
}
