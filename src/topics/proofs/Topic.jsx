'use client';
/* The proofs section ("הוכחות"): geometry proofs for grades 8–9, hidden until the maths owner
   approves it. Four proof types (chapter buttons), a warm-up and three fading levels each.
   The landing: one giant wordmark with the chosen type's drawing in front of it, then the path of
   the four types in the recommended order (the open one shows what it is about and its levels).
   Spec: docs/superpowers/specs/2026-11-21-proofs-design.md · one type: ./ProofChapter.jsx ·
   the proof screen: ./ProofScreen.jsx · the pure core: core.js, session.js, mastery.js. */
import React, { useCallback, useMemo, useState } from 'react';
import { TYPES, tabOf } from './types/index.js';
import { typeState } from './mastery.js';
import { targets } from './core.js';
import { T } from './texts.js';
import ProofChapter, { readOpen } from './ProofChapter.jsx';
import ProofFigure from './ProofFigure.jsx';
import { IcCheck } from './signs.jsx';

/* the drawing in the hero: one fixed, good-looking instance per type */
const HERO = { 'read-given': ['1-a', 20261124], 'congruent-parts': ['2-c', 20261122], 'prove-congruence': ['3-X-SAS', 20261121], 'then-conclusion': ['4-K-SAS-1', 20261123] };
function heroOf(type) {
  try {
    const [template, seed] = HERO[type.id] || [type.templates[0].id, 20261121];
    const p = type.remake({ template, seed, level: 1, variant: 'A', meta: null });
    if (!p) return null;
    // what the drawing may show before a proof starts: the given marks and the dashed goal. Types 1
    // and 2 ask the student to find the equalities, so their drawing never outlines an answer.
    let marks = [];
    if (type.n === 2) marks = Object.keys(p.facts).filter((f) => p.facts[f].kind === 'cong').map((fact) => ({ fact, style: 'on' }));
    if (type.n >= 3) {
      const goal = targets(p);
      marks = [...p.canon.filter((f) => p.facts[f].kind !== 'cong' && !goal.includes(f)).map((fact, i) => ({ fact, style: 'on', delay: 350 + i * 380 })), ...goal.map((fact) => ({ fact, style: 'goal' }))];
    }
    return { p, marks };
  } catch { return null; }
}

export default function App({ devRescue }) {
  // a proof left open by a refresh comes back on its own type
  const [ch, setCh] = useState(() => { const o = readOpen(), i = o ? TYPES.findIndex((t) => t.id === o.type) : -1; return i >= 0 ? i : 0; });
  const [inProof, setInProof] = useState(false);
  const go = (i) => { if (i !== ch) setCh(i); };
  const hero = useMemo(() => heroOf(TYPES[ch]), [ch]);

  /* the path of the four types; `inner` (what the open type is about + its level tabs) comes from ProofChapter */
  const path = useCallback(({ state, inner }) => {
    const all = TYPES.map((t) => typeState(state, t.id));
    const nextUp = all.findIndex((ts) => ts.level < 4);              // the recommended order is 1 → 4
    return (
      <nav className="ch-btns pf-path" aria-label={T['lbl.order']}>
        {TYPES.map((t, i) => {
          const ts = all[i], passed = ts.level >= 4, lv = Math.min(3, ts.level), open = ch === i;
          const began = ts.done > 0 || ts.walked || ts.warm.done;
          return (
            <div key={t.id} className={`pf-pt${open ? ' is-open' : ''}${passed ? ' is-passed' : ''}${began ? ' is-began' : ''}`}>
              <div className="pf-pt-row">
                <button type="button" className={`ch-btn ${open ? 'active' : ''}`} aria-expanded={open} onClick={() => go(i)}>
                  <span className="pf-pt-n">{t.n}</span><span className="pf-sr">. </span><span className="pf-pt-name">{t.name}</span>
                </button>
                {i === nextUp && <span className="pf-pt-next">{T['lbl.nextUp']}</span>}
                {passed && <span className="pf-pt-ok" aria-hidden="true"><IcCheck /></span>}
                <span className="pf-pt-lv" aria-hidden="true">
                  {[0, 1, 2, 3].map((k) => <i key={k} className={passed || (k === 0 ? began : k < lv) ? 'is-on' : k === lv && began ? 'is-here' : ''} style={{ height: `${7 + k * 3}px` }} />)}
                </span>
                <span className="pf-sr">{passed ? T['lbl.passed'] : began ? tabOf(ts.level) : ''}</span>
              </div>
              {open && <div className="pf-pt-open">{inner}</div>}
            </div>
          );
        })}
      </nav>
    );
  }, [ch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`pf pf-topic${inProof ? ' pf-in-proof' : ''}`}>
      <p className="pf-team" title={T['lbl.team']}>{T['ui.teamNote']}</p>
      <div className="hdr pf-mast">
        <h1 className="pf-wm">{T['lbl.title']}</h1>
        {hero && <div className="pf-stage pf-mast-fig" key={TYPES[ch].id}><ProofFigure problem={hero.p} marks={hero.marks} label={T['lbl.sample']} /></div>}
      </div>
      <ProofChapter type={TYPES[ch]} key={TYPES[ch].id} path={path} onOpen={setInProof} onGoType={(id) => { const i = TYPES.findIndex((t) => t.id === id); if (i >= 0) { go(i); try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { /* older browsers */ } } }} devRescue={devRescue} />
    </div>
  );
}
