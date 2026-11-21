'use client';
/* The proofs section: screen B, the warm-up ("חימום", spec §7.1). One small question at a time on
   the same frame as a proof: header, the drawing, the question, and the answer chips (or a tap in
   the drawing) in the bottom tray. A miss shows its explanation; nothing here counts toward levels.
   Tasks and the flow rule come from warmup-core.js; this file only shows them.

   Tracker contract (§10.4): the answer sits in a .step-card whose .step-label is the skill's short
   name; a right answer mounts a small new .fb.ok node, a miss a small new .fb.err node. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { seeded, makeR } from '../new/core.js';
import { makeTask, checkTask, flow, next, answer } from './warmup-core.js';
import { T } from './texts.js';
import ProofFigure from './ProofFigure.jsx';
import { useSelection } from './TapBuild.jsx';
import { St, Tx, Mx, IcBack, IcLock, IcClose } from './signs.jsx';

const newSeed = () => { try { const a = new Uint32Array(1); window.crypto.getRandomValues(a); return (a[0] % 2147483646) + 1; } catch { return Math.floor(Math.random() * 2147483646) + 1; } };
const ONLY_TASKS = 2;                                  // rescue step 1: two tasks of one kind

export default function Warmup({ type, kinds, only = null, seed, onDone, onLeave }) {
  const R = useRef(null);
  if (!R.current) R.current = makeR(seeded(seed || newSeed()));
  const [fl, setFl] = useState(() => (only ? flow([only], { tasks: ONLY_TASKS }) : flow(kinds)));
  const kindAfter = (s) => (only ? (s.n < ONLY_TASKS ? only : null) : next(s));
  const [task, setTask] = useState(() => makeTask(R.current, kindAfter(fl)));
  const [res, setRes] = useState(null);                // { right, picked } once answered
  const [log, setLog] = useState([]);                  // right / wrong, in order (the header dots)
  const [pulse, setPulse] = useState([]);
  const n = useRef(0), timer = useRef(null), busy = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  const problem = useMemo(() => ({ figure: task.figure, facts: task.facts }), [task]);
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
    sel.clear(); setPulse([]); setRes(null);
    setTask(makeTask(R.current, k));
  }

  const marks = [
    ...task.marks.map((fact) => ({ fact, style: 'on' })),
    ...(res ? task.reveal.map((fact) => ({ fact, style: 'on' })) : []),
    ...(task.goal ? [{ fact: task.goal, style: 'goal' }] : []),
  ];
  const skill = T[`skill.${task.kind}`];
  const dots = [...log, ...Array(Math.max(0, (only ? ONLY_TASKS : fl.first.length) - log.length)).fill(null)];
  const opts = task.options || [];
  const cols = opts.some((o) => o.st) ? 1 : opts.length === 3 ? 3 : 2;

  return (
    <div className="pf-screen pf-warm">
      <div className="pf-head">
        <button type="button" className="pf-back" aria-label={T['btn.back']} onClick={onLeave}><IcBack /></button>
        <span className="pf-head-t">{type.name}</span>
        <span className="pf-pill">{T['tab.warm']}</span>
        <span className="pf-dots" aria-hidden="true">{dots.map((d, i) => <i key={i} className={d === true ? 'is-on' : d === false ? 'is-off' : ''} />)}</span>
      </div>
      <div className="pf-figcol">
        <div className="pf-stage">
          <ProofFigure problem={problem} marks={marks} selected={tapping ? sel.selected : []} pulse={pulse}
            tappable={tapping ? ['seg'] : false} onPart={sel.tap} />
        </div>
      </div>
      <div className="pf-work">
        {(task.given || task.toProve) && (
          <div className="pf-strip">
            {task.given && <span className="pf-strip-given"><span className="pf-strip-k">{T['lbl.given']}</span>{task.given.map((st, i) => <span key={i} className="pf-fc"><St st={st} /></span>)}</span>}
            {task.toProve && <span className="pf-strip-goal"><span className="pf-strip-k">{T['lbl.toProve']}</span><span className="pf-fc pf-fc-goal"><IcLock /><St st={task.toProve} /></span></span>}
          </div>
        )}
        <div className="pf-warm-mid" key={`q${log.length}`}>
          <p className="pf-warm-k">{skill}</p>
          {task.sent && <p className="pf-warm-sent"><Tx k={task.sent.key} vars={task.sent.vars} /></p>}
          {task.st && <p className="pf-warm-st"><St st={task.st} /></p>}
          <p className="pf-warm-q"><Tx k={task.text.k} vars={task.text.vars} /></p>
        </div>
        <div className="pf-tray">
          <div className="step-card pf-step">
            <span className="step-label pf-sr" aria-hidden="true">{skill}</span>
            {res && (res.right
              ? <div className="fb ok pf-fb" key={`f${n.current}`}><span>{T['fb.ok']}</span></div>
              : <div className="fb err pf-fb" key={`f${n.current}`}><span><Tx k={task.why.k} vars={task.why.vars} /></span></div>)}
            {res && last && !only && <p className="pf-why">{T['ui.warmDone']}</p>}
            {task.input === 'chips' && (
              <div className={`pf-chips pf-cols-${cols}${opts.some((o) => o.st) ? ' pf-tiles' : ''}`}>
                {opts.map((o) => {
                  const yes = res && o.id === task.answer, off = res && !yes;
                  if (off && o.st) return null;                    // long options: once answered only the right one stays, so the next button is in reach
                  return (
                    <button type="button" key={o.id} className={`pf-chip${o.st ? ' pf-tile' : ''}${o.m ? ' pf-vert' : ''}${yes ? ' is-yes' : off ? ' is-dim' : ''}`} disabled={!!res} onClick={() => judge(o.id)}>
                      {o.st ? <St st={o.st} /> : o.m ? <Mx s={o.m} /> : o.label}
                    </button>
                  );
                })}
              </div>
            )}
            {tapping && sel.chooser && (
              <div className="pf-tap">
                <p className="pf-tap-q">{T['lbl.chooser']}</p>
                <div className="pf-chips pf-cols-2">
                  {sel.chooser.map((id) => sel.index[id] && <button type="button" key={id} className="pf-chip" onClick={() => sel.pickFromChooser(id)}>{sel.index[id].he}</button>)}
                </div>
              </div>
            )}
            {tapping && !sel.chooser && (
              <div className="pf-warm-tap">
                <span className="pf-warm-picked" aria-live="polite">
                  {[0, 1].map((i) => (sel.parts[i] ? <span key={i} className="pf-fc is-now"><Mx s={sel.parts[i].part} /></span> : <i key={i} className="pf-slot is-wide" />))}
                </span>
                {sel.parts.length > 0 && <button type="button" className="pf-x" aria-label={T['btn.cancel']} onClick={sel.clear}><IcClose /></button>}
                <button type="button" className="pf-go" disabled={sel.parts.length !== 2} onClick={() => judge(sel.selected)}>{T['btn.these']}</button>
              </div>
            )}
            {res && <div className="pf-go-row"><button type="button" className="pf-go" onClick={onward}>{last ? T['btn.go'] : T['btn.next']}</button></div>}
          </div>
        </div>
      </div>
      <div className="pf-sr" aria-live="polite">{res ? (res.right ? T['fb.ok'] : T[task.why.k]) : ''}</div>
    </div>
  );
}
