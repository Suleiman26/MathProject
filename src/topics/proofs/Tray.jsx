'use client';
/* The proofs section: the bottom sheet (2026-11-22 redesign, "מחברת"). One line names the row and
   what is asked ("שורה 3 · מה הנימוק?") with the hint button beside it, then ONE clear question in
   big type (or, in the walk-through, the guide's bubble), then the answers. The feedback lines sit
   above it. It renders what ProofScreen decides; it judges nothing.

   Tracker contract (spec §10.4): every feedback line is a NEW small node inside its own .step-card
   whose .step-label names the decision kind. The labels are hidden: they name the answer.

   Reading a theorem before choosing it (spec 2026-11-23 §6.2.2): a chip with `law` is a toggle (aria-pressed);
   `head.law = { id, onChoose }` shows its full sentence in .prf-q-law with the "בחירה" button. That preview is
   plain text inside the step: it is never a .fb / feedback node, so the tracker counts nothing. While it is
   open the question (row line, hint button, heading) is pinned to the sheet's top, the feedback lines stay, and
   the pressed chip is described by the sentence and its "בחירה" button (aria-describedby; ProofScreen also reads
   it out in the live region). */
import React, { useLayoutEffect, useRef } from 'react';
import { T } from './texts.js';
import { show } from './core.js';
import { St, Tx, Law, IcCheck, IcNote, IcBulb, IcClose, IcPen } from './signs.jsx';

const short = (s) => [...s].length <= 7;

function Feedback({ f }) {
  const cls = f.cls === 'ok' ? 'fb ok prf-fb' : f.cls === 'err' ? 'fb err prf-fb' : `prf-note prf-fb${f.look === 'ok' ? ' is-ok' : ''}`;
  return (
    <div className="step-card prf-fbc">
      <span className="step-label prf-sr" aria-hidden="true">{f.label}</span>
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
    <button type="button" className={`prf-hintb${hint.nudge ? ' is-nudge' : ''}${hint.wait ? ' is-wait' : ''}`} disabled={!!hint.wait} onClick={onHint}>
      {hint.wait && <span className="prf-hintb-fill" style={{ animationDuration: `${hint.waitMs}ms` }} />}
      <IcBulb />
      <span>{label}</span>
      <span className="prf-rungs" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={hint.rung >= n ? 'is-on' : ''} />)}</span>
    </button>
  );
}

function Body({ body, onPick, onNext, onQed, qedBusy, onChipDown }) {
  if (!body) return null;
  if (body.t === 'chips') {
    const cols = body.cols || (body.chips.every((c) => short(c.label)) ? 3 : 2);
    return (
      <div className={`prf-chips prf-cols-${cols}`}>
        {body.chips.map((c) => (
          <button type="button" key={c.id} className={`prf-chip${c.dim ? ' is-dim' : ''}${c.yes ? ' is-yes' : ''}${c.on ? ' is-on' : ''}`} disabled={!!c.disabled} aria-pressed={c.law ? !!c.on : undefined} aria-describedby={c.on ? 'prf-q-law' : undefined} data-chip={c.id} onClick={(e) => { if (onChipDown) onChipDown(c.id, e.currentTarget); onPick(c.id); }}>{c.sub ? <span className="prf-chip-2"><span>{c.label}</span><small>{c.sub}</small></span> : c.label}</button>
        ))}
      </div>
    );
  }
  if (body.t === 'options' || body.t === 'tiles') {
    return (
      <div className={`prf-chips prf-tiles${body.t === 'options' ? ' prf-cols-1' : ' prf-cols-2'}`}>
        {body.items.map((o) => (
          <button type="button" key={o.id} className={`prf-chip prf-tile${show(o.st).length > 13 ? ' is-wide' : ''}`} disabled={!!o.disabled} onClick={() => onPick(o.id)}><St st={o.st} /></button>
        ))}
      </div>
    );
  }
  if (body.t === 'next') return <div className="prf-go-row"><button type="button" className="prf-go" onClick={onNext}>{body.label || T['btn.next']}</button></div>;
  if (body.t === 'action') return <div className="prf-go-row"><button type="button" className="prf-go is-soft" onClick={body.onClick}>{body.icon}{body.label}</button></div>;
  if (body.t === 'qed') return <div className="prf-go-row"><button type="button" className="prf-go prf-qed" disabled={!!qedBusy} onClick={onQed}>{body.label || T['btn.qed']}</button></div>;
  if (body.t === 'node') return body.node;
  return null;
}

export default function Tray({ label, head, body, fbs = [], why, hintLine, hint, onPick, onHint, onNext, onQed, onCancel, qedBusy }) {
  // a theorem's sentence opens above the chips: the chip just tapped must stay under the finger (a second tap chooses it).
  // Where the sheet cannot grow any more, it scrolls by exactly what the chip moved (on a computer: the page).
  const el = useRef(null), anchor = useRef(null), lawId = head && head.law ? head.law.id : null;
  useLayoutEffect(() => {
    const a = anchor.current, box = el.current;
    anchor.current = null;
    if (!a || !box) return;
    const chip = [...box.querySelectorAll('[data-chip]')].find((b) => b.getAttribute('data-chip') === a.id);
    if (!chip) return;
    let d = chip.getBoundingClientRect().top - a.top;
    if (Math.abs(d) >= 1) {
      const was = box.scrollTop;
      box.scrollTop = was + d;
      d -= box.scrollTop - was;
      if (Math.abs(d) >= 1 && typeof window !== 'undefined') window.scrollBy(0, d);
    }
    // the question stays pinned at the sheet's top (.prf-q.is-pin); the sentence is never left under it
    const pin = box.querySelector('.prf-q.is-pin'), law = box.querySelector('.prf-q-law');
    if (pin && law && getComputedStyle(pin).position === 'sticky') {
      const under = pin.getBoundingClientRect().bottom - law.getBoundingClientRect().top;
      if (under > 0) box.scrollTop -= under;
    }
  }, [lawId]);
  // a new answer line: the sheet starts from its top (on a short phone it can be taller than its room; the line is read first)
  useLayoutEffect(() => { if (el.current && (fbs.length || why)) el.current.scrollTop = 0; }, [fbs, why]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="prf-tray" ref={el}>
      {fbs.map((f) => <Feedback key={f.id} f={f} />)}
      {why && <p className="prf-why" key={why.id}><Tx k={why.key} vars={why.vars} />{why.law && <Law id={why.law} className="prf-why-law" />}</p>}
      <div className="step-card prf-step">
        <span className="step-label prf-sr" aria-hidden="true">{label}</span>
        {head && (
          <div className={`prf-q${head.law ? ' is-pin' : ''}`}>
            {(head.kicker || hint || onCancel) && (
              <div className="prf-q-top">
                <span className="prf-q-k">{head.kicker}</span>
                <span className="prf-q-e">
                  {onCancel && <button type="button" className="prf-x" aria-label={T['btn.cancel']} onClick={onCancel}><IcClose /><span>{T['btn.cancel']}</span></button>}
                  <HintButton hint={hint} onHint={onHint} />
                </span>
              </div>
            )}
            {head.coach && <div className="prf-coach"><span className="prf-coach-av" aria-hidden="true"><IcPen /></span><p className="prf-coach-t">{head.coach}</p></div>}
            {head.quote && <div className="prf-q-quote">{head.quote}</div>}
            {head.ask && <h3 className="prf-q-h">{head.ask}</h3>}
          </div>
        )}
        {head && head.law && (
          <div className="prf-q-law" id="prf-q-law" key={head.law.id}>
            <p className="prf-q-law-t"><Law id={head.law.id} /></p>
            <button type="button" className="prf-go prf-choose" onClick={head.law.onChoose}>{T['btn.choose']}</button>
          </div>
        )}
        {hintLine && <p className="prf-hint" key={hintLine.id}><Tx k={hintLine.key} vars={hintLine.vars} /></p>}
        <Body body={body} onPick={onPick} onNext={onNext} onQed={onQed} qedBusy={qedBusy} onChipDown={(id, b) => { anchor.current = { id, top: b.getBoundingClientRect().top }; }} />
      </div>
    </div>
  );
}
