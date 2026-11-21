'use client';
/* The proofs section: the bottom tray. The active row sits in its header ("שורה 3 · AO = OB · מה
   הנימוק?"), then the chips / tiles / one button, with the feedback lines above (so the chips stay
   under the thumb). It renders what ProofScreen decides; it judges nothing.

   Tracker contract (spec §10.4): every feedback line is a NEW small node inside its own .step-card
   whose .step-label names the decision kind. The labels are hidden: they name the answer. */
import React from 'react';
import { T } from './texts.js';
import { show } from './core.js';
import { St, Tx, IcCheck, IcNote, IcBulb, IcClose } from './signs.jsx';

const short = (s) => [...s].length <= 7;

function Feedback({ f }) {
  const cls = f.cls === 'ok' ? 'fb ok pf-fb' : f.cls === 'err' ? 'fb err pf-fb' : `pf-note pf-fb${f.look === 'ok' ? ' is-ok' : ''}`;
  return (
    <div className="step-card pf-fbc">
      <span className="step-label pf-sr" aria-hidden="true">{f.label}</span>
      <div className={cls}>
        {f.cls === 'note' && (f.look === 'ok' ? <IcCheck /> : <IcNote />)}
        <span><Tx k={f.key} vars={f.vars} /></span>
      </div>
    </div>
  );
}

function HintButton({ hint, onHint }) {
  if (!hint) return null;
  const label = hint.rung >= 2 ? T['btn.show'] : hint.rung === 1 ? T['btn.hint2'] : T['btn.hint'];
  return (
    <button type="button" className={`pf-hintb${hint.nudge ? ' is-nudge' : ''}${hint.wait ? ' is-wait' : ''}`} disabled={!!hint.wait} onClick={onHint}>
      {hint.wait && <span className="pf-hintb-fill" style={{ animationDuration: `${hint.waitMs}ms` }} />}
      <IcBulb />
      <span>{label}</span>
      <span className="pf-rungs" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={hint.rung >= n ? 'is-on' : ''} />)}</span>
    </button>
  );
}

function Body({ body, onPick, onNext, onQed, qedBusy }) {
  if (!body) return null;
  if (body.t === 'chips') {
    const cols = body.cols || (body.chips.every((c) => short(c.label)) ? 3 : 2);
    return (
      <div className={`pf-chips pf-cols-${cols}`}>
        {body.chips.map((c) => (
          <button type="button" key={c.id} className={`pf-chip${c.dim ? ' is-dim' : ''}${c.yes ? ' is-yes' : ''}`} disabled={!!c.disabled} onClick={() => onPick(c.id)}>{c.label}</button>
        ))}
      </div>
    );
  }
  if (body.t === 'options' || body.t === 'tiles') {
    return (
      <div className={`pf-chips pf-tiles${body.t === 'options' ? ' pf-cols-1' : ' pf-cols-2'}`}>
        {body.items.map((o) => (
          <button type="button" key={o.id} className={`pf-chip pf-tile${show(o.st).length > 13 ? ' is-wide' : ''}`} disabled={!!o.disabled} onClick={() => onPick(o.id)}><St st={o.st} /></button>
        ))}
      </div>
    );
  }
  if (body.t === 'next') return <div className="pf-go-row"><button type="button" className="pf-go" onClick={onNext}>{body.label || T['btn.next']}</button></div>;
  if (body.t === 'action') return <div className="pf-go-row"><button type="button" className="pf-go is-soft" onClick={body.onClick}>{body.icon}{body.label}</button></div>;
  if (body.t === 'qed') return <div className="pf-go-row"><button type="button" className="pf-go pf-qed" disabled={!!qedBusy} onClick={onQed}>{T['btn.qed']}</button></div>;
  if (body.t === 'node') return body.node;
  return null;
}

export default function Tray({ label, head, body, fbs = [], why, hintLine, hint, onPick, onHint, onNext, onQed, onCancel, qedBusy }) {
  return (
    <div className="pf-tray">
      {fbs.map((f) => <Feedback key={f.id} f={f} />)}
      {why && <p className="pf-why" key={why.id}><Tx k={why.key} vars={why.vars} /></p>}
      <div className="step-card pf-step">
        <span className="step-label pf-sr" aria-hidden="true">{label}</span>
        {head && (
          <div className="pf-ask">
            <div className="pf-ask-t">
              {head.sent && <span className="pf-ask-sent">{head.sent}</span>}
              {head.kicker && <span className="pf-ask-k">{head.kicker}</span>}
              {head.lead}
              {head.st && <St st={head.st} color={head.color} className="pf-ask-st" />}
              {head.reason && <span className="pf-ask-r">{head.reason}</span>}
              {head.ask && <span className="pf-ask-q">{head.ask}</span>}
            </div>
            <div className="pf-ask-e">
              {onCancel && <button type="button" className="pf-x" aria-label={T['btn.cancel']} onClick={onCancel}><IcClose /><span>{T['btn.cancel']}</span></button>}
              <HintButton hint={hint} onHint={onHint} />
            </div>
          </div>
        )}
        {hintLine && <p className="pf-hint" key={hintLine.id}><Tx k={hintLine.key} vars={hintLine.vars} /></p>}
        <Body body={body} onPick={onPick} onNext={onNext} onQed={onQed} qedBusy={qedBusy} />
      </div>
    </div>
  );
}
