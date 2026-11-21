'use client';
/* The proofs section: the finished rows, one line each (number · statement · short reason · pair
   glyph + check icon). Tap a row to open its full reason. Spec §11.1. */
import React from 'react';
import { REASONS } from './reasons.js';
import { T } from './texts.js';
import { St, Glyph, IcCheck } from './signs.jsx';

export default function ProofRows({ problem, rows, openRow, onOpen, fresh, lead = [] }) {
  return (
    <ol className="pf-rowlist">
      {rows.map((r, i) => {
        const f = problem.facts[r.fact], open = openRow === r.fact, reason = REASONS[r.reason] || REASONS.given;
        return (
          <li key={r.fact} className={`pf-row${fresh === r.fact ? ' is-new' : ''}${open ? ' is-open' : ''}${lead.includes(r.fact) ? ' is-lead' : ''}`}>
            <button type="button" className="pf-row-b" aria-expanded={open} onClick={() => onOpen(open ? null : r.fact)}>
              <span className="pf-row-n">{i + 1}</span>
              <St st={f} className="pf-row-st" />
              <span className="pf-row-r">{reason.short}</span>
              <span className="pf-row-g">{f.kind !== 'cong' && <Glyph mark={f.mark} kind={f.kind} />}<IcCheck className="pf-row-ok" /></span>
            </button>
            {open && <p className="pf-row-full"><b>{T['lbl.reason']}:</b> {reason.full || reason.short}</p>}
          </li>
        );
      })}
    </ol>
  );
}
