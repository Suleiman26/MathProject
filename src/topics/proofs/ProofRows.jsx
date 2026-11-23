'use client';
/* The proofs section: the proof as a notebook table (2026-11-22 redesign, "מחברת"). A header row
   (# · טענה · נימוק), the finished rows, the row being worked on (a "?" where the answer goes) and
   faint empty rows for what is still to come, so the student sees the whole proof from the start.
   Tap a finished row to read its full reason. It shows what ProofScreen decides; it judges nothing.

   now = null | { at: index of a finished row being shown (walk-through, "על אילו שורות זה נשען?") }
              | { st: node|null, reason: node|null, ask: 'st'|'reason'|null }   (the open row)   */
import React from 'react';
import { REASONS } from './reasons.js';
import { T } from './texts.js';
import { St, Glyph, IcCheck } from './signs.jsx';

const Slot = () => <span className="prf-qslot" aria-hidden="true">?</span>;
const Bar = ({ w }) => <span className="prf-ghost-bar" style={{ width: w }} aria-hidden="true" />;

export default function ProofRows({ problem, rows, total = rows.length, now = null, openRow, onOpen, fresh, lead = [] }) {
  const open1 = now && now.at == null;                     // an open (not yet written) row
  const ghosts = Math.max(0, total - rows.length - (open1 ? 1 : 0));
  return (
    <div className="prf-nb-table">
      <div className="prf-nb-th" aria-hidden="true"><span>#</span><span>{T['lbl.claim']}</span><span>{T['lbl.reason']}</span></div>
      <ol className="prf-rowlist">
        {rows.map((r, i) => {
          const f = problem.facts[r.fact], open = openRow === r.fact, reason = REASONS[r.reason] || REASONS.given;
          const cls = `prf-row${fresh === r.fact ? ' is-new' : ''}${open ? ' is-open' : ''}${lead.includes(r.fact) ? ' is-lead' : ''}${now && now.at === i ? ' is-now' : ''}`;
          return (
            <li key={r.fact} className={cls}>
              <button type="button" className="prf-row-b" aria-expanded={open} onClick={() => onOpen(open ? null : r.fact)}>
                <span className="prf-row-n">{i + 1}</span>
                <span className="prf-row-c"><St st={f} className="prf-row-st" />{f.kind !== 'cong' && <Glyph mark={f.mark} kind={f.kind} />}</span>
                <span className="prf-row-r">{reason.short}<IcCheck className="prf-row-ok" /></span>
              </button>
              {open && <p className="prf-row-full"><b>{T['lbl.reason']}:</b> {reason.full || reason.short}</p>}
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
