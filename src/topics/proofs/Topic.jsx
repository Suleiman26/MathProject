'use client';
/* The proofs section ("הוכחות"): geometry proofs for grades 8–9, hidden until the maths owner
   approves it. Four proof types (chapter buttons), a warm-up and three fading levels each.
   Spec: docs/superpowers/specs/2026-11-21-proofs-design.md · one type: ./ProofChapter.jsx ·
   the proof screen: ./ProofScreen.jsx · the pure core: core.js, session.js, mastery.js. */
import React, { useEffect, useRef, useState } from 'react';
import { TYPES } from './types/index.js';
import { T } from './texts.js';
import ProofChapter, { readOpen } from './ProofChapter.jsx';

export default function App({ devRescue }) {
  // a proof left open by a refresh comes back on its own type
  const [ch, setCh] = useState(() => { const o = readOpen(), i = o ? TYPES.findIndex((t) => t.id === o.type) : -1; return i >= 0 ? i : 0; });
  const [inProof, setInProof] = useState(false);
  // phones: the types are one swipe row, so the open one is brought into view
  const row = useRef(null);
  useEffect(() => {
    const el = row.current && row.current.querySelector('.ch-btn.active');
    if (!el || row.current.scrollWidth <= row.current.clientWidth) return;
    try { el.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' }); } catch (e) { /* older browsers */ }
  }, [ch]);
  const go = (i) => { setCh(i); try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { /* older browsers */ } };
  return (
    <div className={`pf pf-topic${inProof ? ' pf-in-proof' : ''}`}>
      <div className="pf-team"><span className="pf-team-t">{T['lbl.team']}</span><span>{T['ui.teamNote']}</span></div>
      <div className="hdr">
        <h1>{T['lbl.title']}</h1>
        <div className="ch-btns" ref={row}>
          {TYPES.map((t, i) => <button type="button" key={t.id} className={`ch-btn ${ch === i ? 'active' : ''}`} onClick={() => go(i)}>{t.button}</button>)}
        </div>
      </div>
      <ProofChapter type={TYPES[ch]} key={TYPES[ch].id} onOpen={setInProof} onGoType={(id) => { const i = TYPES.findIndex((t) => t.id === id); if (i >= 0) go(i); }} devRescue={devRescue} />
    </div>
  );
}
