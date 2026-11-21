'use client';
/* The proofs section: the finished rows, one line each (number · statement · short reason · pair
   glyph + check icon). Tap a row to open its full reason. Spec §11.1. */
import React from 'react';
import { REASONS } from './reasons.js';
import { T } from './texts.js';
import { St, Glyph, IcCheck } from './signs.jsx';

export default function ProofRows({ problem, rows, openRow, onOpen, fresh, lead = [] }) {
  return (
    <ol className="prf-rowlist">
      {rows.map((r, i) => {
        const f = problem.facts[r.fact], open = openRow === r.fact, reason = REASONS[r.reason] || REASONS.given;
        return (
          <li key={r.fact} className={`prf-row${fresh === r.fact ? ' is-new' : ''}${open ? ' is-open' : ''}${lead.includes(r.fact) ? ' is-lead' : ''}`}>
            <button type="button" className="prf-row-b" aria-expanded={open} onClick={() => onOpen(open ? null : r.fact)}>
              <span className="prf-row-n">{i + 1}</span>
              <St st={f} className="prf-row-st" />
              <span className="prf-row-r">{reason.short}</span>
              <span className="prf-row-g">{f.kind !== 'cong' && <Glyph mark={f.mark} kind={f.kind} />}<IcCheck className="prf-row-ok" /></span>
            </button>
            {open && <p className="prf-row-full"><b>{T['lbl.reason']}:</b> {reason.full || reason.short}</p>}
          </li>
        );
      })}
    </ol>
  );
}
