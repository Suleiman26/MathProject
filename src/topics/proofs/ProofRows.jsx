'use client';
/* The proofs section: the proof as a notebook table (2026-11-22 redesign, "מחברת"). A header row
   (# · טענה · נימוק), the finished rows, the row being worked on (a "?" where the answer goes) and
   faint empty rows for what is still to come, so the student sees the whole proof from the start.
   Tap a finished row to read its full reason. It shows what ProofScreen decides; it judges nothing.
   The theorems stay in sight (spec 2026-11-23 §6.2.1): the NEWEST row that stands on a theorem or a definition
   carries its full sentence under it (muted, never cut); older ones show the short name and a small "המשפט"
   opener (the row is the button). Rows with נתון or a rule keep the short form. While the sheet itself is quoting
   the newest row's sentence (`said`: the why-line, the guide's bubble) the row waits, so it is on screen once.

   The work line (spec 2026-11-23 §7.5): under the written ratio row of a calculation, the substitution built from the
   labels ("4/10 = x/15", one left-to-right island) and, at מודרך only, the cross-multiplication.
   work = null | { fact, sub:[[top, bottom] ×2], text, cross: string|null }

   now = null | { at: index of a finished row being shown (walk-through, "על אילו שורות זה נשען?") }
              | { st: node|null, reason: node|null, ask: 'st'|'reason'|null }   (the open row)   */
import React from 'react';
import { REASONS } from './reasons.js';
import { T } from './texts.js';
import { St, Mx, Fracs, Glyph, IcCheck, IcDown, Law, hasLaw, lawWord } from './signs.jsx';

const Slot = () => <span className="prf-qslot" aria-hidden="true">?</span>;
const Bar = ({ w }) => <span className="prf-ghost-bar" style={{ width: w }} aria-hidden="true" />;

export default function ProofRows({ problem, rows, total = rows.length, now = null, openRow, onOpen, fresh, lead = [], said = null, work = null }) {
  const open1 = now && now.at == null;                     // an open (not yet written) row
  const ghosts = Math.max(0, total - rows.length - (open1 ? 1 : 0));
  const lawAt = rows.reduce((k, r, i) => (hasLaw(r.reason) ? i : k), -1);   // the newest row that stands on a theorem / definition
  return (
    <div className="prf-nb-table">
      <div className="prf-nb-th" aria-hidden="true"><span>#</span><span>{T['lbl.claim']}</span><span>{T['lbl.reason']}</span></div>
      <ol className="prf-rowlist">
        {rows.map((r, i) => {
          const f = problem.facts[r.fact], open = openRow === r.fact, reason = REASONS[r.reason] || REASONS.given;
          const law = hasLaw(reason.id), newest = i === lawAt, held = newest && said === r.fact;   // held: the sheet is quoting it right now
          const cls = `prf-row${fresh === r.fact ? ' is-new' : ''}${open ? ' is-open' : ''}${lead.includes(r.fact) ? ' is-lead' : ''}${now && now.at === i ? ' is-now' : ''}${law ? ' is-law' : ''}`;
          const cells = (
            <>
              <span className="prf-row-n">{i + 1}</span>
              <span className="prf-row-c"><St st={f} className="prf-row-st" />{f.kind !== 'cong' && <Glyph mark={f.mark} kind={f.kind} />}</span>
              <span className="prf-row-r">
                <span className="prf-row-rt">{reason.short}{law && !newest && <span className="prf-row-op">{lawWord(reason.id)}<IcDown /></span>}</span>
                <IcCheck className="prf-row-ok" />
              </span>
            </>
          );
          return (
            <li key={r.fact} className={cls}>
              {newest
                ? <div className="prf-row-b">{cells}</div>
                : <button type="button" className="prf-row-b" aria-expanded={open} onClick={() => onOpen(open ? null : r.fact)}>{cells}</button>}
              {law && (newest ? !held : open) && <p className="prf-row-law"><Law id={reason.id} /></p>}
              {!law && open && <p className="prf-row-full"><b>{T['lbl.reason']}:</b> {reason.full || reason.short}</p>}
              {work && work.fact === r.fact && (
                <p className="prf-row-work">
                  <span className="prf-work-s"><span className="prf-work-k">{T['lbl.work']}</span><Fracs pairs={work.sub} label={work.text} className="prf-work-m" /></span>
                  {work.cross && <span className="prf-work-s"><span className="prf-work-k">{T['lbl.cross']}</span><Mx s={work.cross} className="prf-work-m" /></span>}
                </p>
              )}
            </li>
          );
        })}
        {open1 && (
          <li className="prf-row is-now is-open-row">
            <div className="prf-row-b">
              <span className="prf-row-n">{rows.length + 1}</span>
              <span className="prf-row-c">{now.st || (now.ask === 'st' ? <Slot /> : <Bar w="64%" />)}</span>
              <span className="prf-row-r">{now.reason || (now.ask === 'reason' ? <Slot /> : now.ask === 'st' ? <span className="prf-row-later">{T['lbl.later']}</span> : <Bar w="58%" />)}</span>
            </div>
          </li>
        )}
        {[...Array(ghosts)].map((_, i) => (
          <li key={`g${i}`} className="prf-row is-ghost" aria-hidden="true">
            <div className="prf-row-b">
              <span className="prf-row-n">{rows.length + (open1 ? 2 : 1) + i}</span>
              <span className="prf-row-c"><Bar w={`${58 - (i % 3) * 8}%`} /></span>
              <span className="prf-row-r"><Bar w={`${48 + (i % 2) * 12}%`} /></span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
