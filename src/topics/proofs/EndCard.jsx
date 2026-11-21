'use client';
/* The proofs section: the end of a proof (spec §7.7). A small result line (the tracker's "win"
   node when the proof is clean: session.endClean, the one mastery rule), the four dots, the quiet "proofs completed" line, a level-up
   ladder when a level was earned, and the proof as a notebook page: נתון / צ״ל and a real
   two-column table טענה | נימוק with the full reason wording, ending in מ.ש.ל. */
import React, { useEffect, useState } from 'react';
import { REASONS } from './reasons.js';
import { targets } from './core.js';
import { T, fill } from './texts.js';
import { St, Tx, IcCheck, IcBook } from './signs.jsx';

export default function EndCard({ problem, rows, clean, filled = true, counted = true, dots = [], done = 0, lessHelp, event, levelName, typeName, newLevel, round, onMore, onFinish }) {
  // the result line mounts one frame after the card: a small new node of its own (tracker rule: a
  // new node with more than 40 descendants is not read as feedback)
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  const p = problem, k = dots.filter((d) => d === true).length;
  const up = event === 'level-up' || event === 'type-done';
  const lv = event === 'type-done' ? 4 : newLevel || 1;
  return (
    <div className="prf-end-card">
      <div className="prf-end-scroll">
        <div className="prf-end-top">
          {shown && (clean
            ? <div className="banner prf-end"><span className="prf-end-seal"><IcCheck /></span><span>{T['ui.endClean']}</span></div>
            : <div className="prf-end is-helped"><span className="prf-end-seal"><IcCheck /></span><span>{T[filled ? 'ui.endHelped' : 'ui.endSlips']}</span></div>)}
          {up && (
            <div className="prf-lvup">
              <span className="prf-ladder" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => <i key={i} className={i < lv ? (i === lv - 1 || (lv === 4 && i === 3) ? 'is-new' : 'is-on') : ''} style={{ height: `${10 + i * 7}px` }} />)}
              </span>
              <span className="prf-lvup-t">{event === 'type-done' ? fill('ui.typeDone', { type: typeName }) : fill('ui.levelUp', { type: typeName, n: lv })}</span>
            </div>
          )}
          <div className="prf-end-stats">
            {counted && <span className="prf-dots is-big" aria-hidden="true">{dots.map((d, i) => <i key={i} className={d === true ? 'is-on' : d === false ? 'is-off' : ''} />)}</span>}
            {counted && <span>{fill('lbl.cleanN', { k })}</span>}
            {counted && <span className="prf-end-sep" aria-hidden="true" />}
            <span>{fill('lbl.done', { n: done })}</span>
          </div>
          {lessHelp && <p className="prf-end-line">{T['ui.lessHelp']}</p>}
          {round && <p className="prf-end-line">{T['ui.round']}</p>}
        </div>
        <section className="prf-page" aria-label={T['lbl.notebook']}>
          <h3 className="prf-page-h"><IcBook /><span>{T['lbl.notebook']}</span></h3>
          <div className="prf-page-in">
            {(p.text || []).map((t, i) => <p key={i} className="prf-page-l"><Tx k={t.key} vars={t.vars} /></p>)}
            <p className="prf-page-l"><b>{T['lbl.given']}</b>{' '}
              {(p.givenText || []).map((g, i) => <React.Fragment key={i}>{i > 0 && ', '}{g.form === 'eq' ? <St st={p.facts[g.facts[0]]} /> : <Tx k={g.key} vars={g.vars} />}{g.byOrder && ` ${T['lbl.byOrder']}`}</React.Fragment>)}
            </p>
            {p.type !== 'read-given' && <p className="prf-page-l"><b>{T['lbl.toProve']}</b>{' '}{targets(p).map((t, i) => <React.Fragment key={t}>{i > 0 && ', '}<St st={p.facts[t]} /></React.Fragment>)}</p>}
            <table className="prf-table">
              <thead><tr><th scope="col">{T['lbl.claim']}</th><th scope="col">{T['lbl.reason']}</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.fact}>
                    <td><span className="prf-table-n">{i + 1}.</span> <St st={p.facts[r.fact]} /></td>
                    <td>{(REASONS[r.reason] && (REASONS[r.reason].full || REASONS[r.reason].short)) || ''}</td>
                  </tr>
                ))}
                <tr className="prf-table-qed"><td colSpan={2}>{T['btn.qed']}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="prf-end-btns">
        <button type="button" className="prf-go" onClick={onMore}>{T['btn.more']}</button>
        <button type="button" className="prf-go is-quiet" onClick={onFinish}>{T['btn.finish']}</button>
      </div>
    </div>
  );
}
