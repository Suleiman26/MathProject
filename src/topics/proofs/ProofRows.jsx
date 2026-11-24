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
   labels ("4/10 = x/15", one left-to-right island) and, at מודרך only, the cross-multiplication. A side the drawing gives
   by its labelled pieces is added up first, at every help stage ("TR = 16.5 + 11 = 27.5", its own island).
   work = null | { fact, sums:[string], sub:[[top, bottom] ×2], text, cross: string|null }

   now = null | { at: index of a finished row being shown (walk-through, "על אילו שורות זה נשען?") }
              | { st: node|null, reason: node|null, ask: 'st'|'reason'|null }   (the open row)

   The exam (spec 2026-11-23 §8): `sections` = [{ letter, goal: node, done, total }] and `secOf(fact)` → the section
   index. Each section is one block under its letter and goal line ("א. הוכיחו: …"): its written rows (in the order
   written), the open row when it belongs there (`openSec`), and its empty rows. Rows are numbered down the page. */
import React from 'react';
import { REASONS } from './reasons.js';
import { T } from './texts.js';
import { St, Mx, Fracs, Glyph, IcCheck, IcDown, Law, hasLaw, lawWord } from './signs.jsx';

const Slot = () => <span className="prf-qslot" aria-hidden="true">?</span>;
const Bar = ({ w }) => <span className="prf-ghost-bar" style={{ width: w }} aria-hidden="true" />;

export default function ProofRows({ problem, rows, total = rows.length, now = null, openRow, onOpen, fresh, lead = [], said = null, work = null, sections = null, secOf = null, openSec = 0 }) {
  const open1 = now && now.at == null;                     // an open (not yet written) row
  const lawAt = rows.reduce((k, r, i) => (hasLaw(r.reason) ? i : k), -1);   // the newest row that stands on a theorem / definition
  // the blocks: one for a plain proof; one per section in the exam (written rows keep their index `i` into `rows`)
  const indexed = rows.map((r, i) => ({ r, i }));
  const blocks = sections && secOf
    ? sections.map((sec, k) => {
      const mine = indexed.filter((x) => Math.max(0, secOf(x.r.fact)) === k), open = open1 && openSec === k;
      return { sec, k, rows: mine, open, ghosts: Math.max(0, (sec.total || 0) - mine.length - (open ? 1 : 0)) };
    })
    : [{ sec: null, k: 0, rows: indexed, open: open1, ghosts: Math.max(0, total - rows.length - (open1 ? 1 : 0)) }];
  let no = 0;                                              // the row numbers, down the page
  const rowEl = ({ r, i }) => {
    const n = ++no;
    const f = problem.facts[r.fact], open = openRow === r.fact, reason = REASONS[r.reason] || REASONS.given;
    const law = hasLaw(reason.id), newest = i === lawAt, held = newest && said === r.fact;   // held: the sheet is quoting it right now
    const cls = `prf-row${fresh === r.fact ? ' is-new' : ''}${open ? ' is-open' : ''}${lead.includes(r.fact) ? ' is-lead' : ''}${now && now.at === i ? ' is-now' : ''}${law ? ' is-law' : ''}`;
    const cells = (
      <>
        <span className="prf-row-n">{n}</span>
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
            {(work.sums || []).map((q) => <span key={q} className="prf-work-s"><Mx s={q} className="prf-work-m" /></span>)}
            <span className="prf-work-s"><span className="prf-work-k">{T['lbl.work']}</span><Fracs pairs={work.sub} label={work.text} className="prf-work-m" /></span>
            {work.cross && <span className="prf-work-s"><span className="prf-work-k">{T['lbl.cross']}</span><Mx s={work.cross} className="prf-work-m" /></span>}
          </p>
        )}
      </li>
    );
  };
  const openEl = () => (
    <li key="open" className="prf-row is-now is-open-row">
      <div className="prf-row-b">
        <span className="prf-row-n">{++no}</span>
        <span className="prf-row-c">{now.st || (now.ask === 'st' ? <Slot /> : <Bar w="64%" />)}</span>
        <span className="prf-row-r">{now.reason || (now.ask === 'reason' ? <Slot /> : now.ask === 'st' ? <span className="prf-row-later">{T['lbl.later']}</span> : <Bar w="58%" />)}</span>
      </div>
    </li>
  );
  const ghostEls = (k, count) => [...Array(count)].map((_, i) => (
    <li key={`g${k}-${i}`} className="prf-row is-ghost" aria-hidden="true">
      <div className="prf-row-b">
        <span className="prf-row-n">{++no}</span>
        <span className="prf-row-c"><Bar w={`${58 - (i % 3) * 8}%`} /></span>
        <span className="prf-row-r"><Bar w={`${48 + (i % 2) * 12}%`} /></span>
      </div>
    </li>
  ));
  return (
    <div className={`prf-nb-table${sections ? ' is-exam' : ''}`}>
      <div className="prf-nb-th" aria-hidden="true"><span>#</span><span>{T['lbl.claim']}</span><span>{T['lbl.reason']}</span></div>
      {blocks.map((b) => (
        <React.Fragment key={b.k}>
          {b.sec && (
            <p className={`prf-sec${b.sec.done ? ' is-done' : ''}`}>
              <span className="prf-sec-l">{b.sec.letter}.</span>
              <span className="prf-sec-g">{b.sec.goal}</span>
              {b.sec.done && <IcCheck className="prf-sec-ok" />}
            </p>
          )}
          <ol className="prf-rowlist">
            {b.rows.map(rowEl)}
            {b.open && openEl()}
            {ghostEls(b.k, b.ghosts)}
          </ol>
        </React.Fragment>
      ))}
    </div>
  );
}
