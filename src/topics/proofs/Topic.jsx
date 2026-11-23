'use client';
/* The proofs section ("הוכחות"): geometry proofs for grades 8–9, by Ministry subject.
   Subject (חפיפת משולשים, דמיון משולשים…) → ONE ladder of levels (the proof types, "רמה N · name") →
   help stages inside a level (חימום · מודרך · ביחד · לבד: ./ProofChapter.jsx).
   The landing shows one subject at a time: its short name as a giant wordmark with a drawing in front,
   the subject switcher (only when more than one subject can show), one meta line (when it is taught,
   levels done) and the ladder; the open level shows what it is about and its help stages. Under that first
   screen comes the subject's theorem notebook ("המשפטים", ./Theorems.jsx, §6.2.5); a quiet link under the
   ladder leads to it.
   Stored names never change: a level button carries its tracker key in data-mp-key (type.button), the
   visible text is free. A `?ch=<key>` link to a level of the subject not on screen lands on a hidden
   stub that switches the subject and opens the level.
   Specs: docs/superpowers/specs/2026-11-21-proofs-design.md, 2026-11-23-proofs-subjects-similarity-design.md
   (§5, §10.1) · the proof screen: ./ProofScreen.jsx · the pure core: core.js, session.js, mastery.js. */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { TYPES, typeById, stageOf } from './types/index.js';
import { SUBJECTS, typesOf, levelNo, canShow, lawsOf } from './subjects.js';
import { typeState, SUBJECT_KEY } from './mastery.js';
import { targets } from './core.js';
import { T, fill } from './texts.js';
import ProofChapter, { readOpen, peekState, deviceStore } from './ProofChapter.jsx';
import ProofFigure from './ProofFigure.jsx';
import Theorems from './Theorems.jsx';
import { IcCheck, IcBook, IcDown } from './signs.jsx';
import { isAdminFrame } from '@/lib/admin-frame';

/* the drawing in the hero: one fixed, good-looking instance per level; a level without one shows its subject's */
const HERO = {
  'read-given': ['1-a', 20261124], 'congruent-parts': ['2-c', 20261122], 'prove-congruence': ['3-X-SAS', 20261121], 'then-conclusion': ['4-K-SAS-1', 20261123],
  'sim-parts': ['6-P', 20261127], 'sim-side': ['7-P', 20261127], 'prove-sim': ['8-P-CC', 20261127], 'sim-calc': ['9-B-VA', 20261127],
};
function heroOf(type, subject) {
  try {
    let t = type, pick = HERO[type.id];
    if (!pick && subject.hero && typeById(subject.hero.type)) { t = typeById(subject.hero.type); pick = [subject.hero.template, subject.hero.seed]; }
    if (!pick) pick = [type.templates[0].id, 20261121];
    const p = t.remake({ template: pick[0], seed: pick[1], level: 1, variant: 'A', meta: null });
    if (!p) return null;
    // what the drawing may show before a proof starts: the given marks and the dashed goal. The two small
    // shapes ask the student to find the equalities, so their drawing never outlines an answer.
    let marks = [];
    const anchor = (f) => p.facts[f].kind === 'cong' || p.facts[f].kind === 'sim';
    if (t.shape === 'parts') marks = Object.keys(p.facts).filter(anchor).map((fact) => ({ fact, style: 'on' }));
    else if (t.shape !== 'given') {
      const goal = targets(p);
      // (a parallel given has no honest mark yet: it is never passed to the drawing)
      marks = [...p.canon.filter((f) => !anchor(f) && p.facts[f].kind !== 'par' && !goal.includes(f)).map((fact, i) => ({ fact, style: 'on', delay: 350 + i * 380 })), ...goal.map((fact) => ({ fact, style: 'goal' }))];
    }
    return { p, marks };
  } catch { return null; }
}

/* the subjects this visitor may see, each with its levels (hidden ones show only where Abed and Sulaiman look) */
function shownSubjects() {
  const env = { host: typeof window !== 'undefined' ? window.location.hostname : '', framed: isAdminFrame() };
  const out = SUBJECTS.filter((s) => canShow(s, env)).map((s) => ({ s, levels: typesOf(s.id).filter((t) => canShow(t, env)) })).filter((x) => x.levels.length);
  return out.length ? out : [{ s: SUBJECTS[0], levels: TYPES }];
}
const began = (ts) => ts.done > 0 || ts.walked || ts.warm.done;
/* the student's spot on a subject's ladder: the first level not finished yet (the last one when all are) */
const spotOf = (levels, state) => { const i = levels.findIndex((t) => typeState(state, t.id).level < 4); return i < 0 ? levels.length - 1 : i; };
/* where the landing opens: the proof left open by a refresh → the subject last looked at → a subject with
   progress → the first one; inside the subject, on the student's spot */
function firstSpot(shown) {
  const o = readOpen();
  if (o) for (const x of shown) { const i = x.levels.findIndex((t) => t.id === o.type); if (i >= 0) return { subject: x.s.id, ch: i }; }
  const state = peekState();
  let x = null;
  try { const id = deviceStore().getItem(SUBJECT_KEY); x = shown.find((y) => y.s.id === id) || null; } catch { /* private mode */ }
  if (!x) x = shown.find((y) => y.levels.some((t) => began(typeState(state, t.id)))) || shown[0];
  return { subject: x.s.id, ch: spotOf(x.levels, state) };
}

export default function App({ devRescue }) {
  const shown = useMemo(shownSubjects, []);
  const [at, setAt] = useState(() => firstSpot(shown));          // { subject, ch }: the subject on screen and its open level
  const [dir, setDir] = useState(null);                          // the last subject change: 'fwd' | 'back' (the hero slides that way)
  const [inProof, setInProof] = useState(false);
  const touch = useRef(null);
  const si = Math.max(0, shown.findIndex((x) => x.s.id === at.subject));
  const cur = shown[si], subject = cur.s, type = cur.levels[Math.min(at.ch, cur.levels.length - 1)];
  const many = shown.length > 1;

  const go = (i) => { if (i !== at.ch) { setDir(null); setAt({ subject: subject.id, ch: i }); } };
  /* another subject (the switcher, a swipe on the hero, a ?ch= stub, "go back one"): remembered on the device */
  const pick = (id, ch) => {
    const i = shown.findIndex((x) => x.s.id === id);
    if (i < 0 || (i === si && ch == null)) return;
    if (i !== si) setDir(i > si ? 'fwd' : 'back');
    setAt({ subject: id, ch: ch == null ? spotOf(shown[i].levels, peekState()) : ch });
    try { deviceStore().setItem(SUBJECT_KEY, id); } catch { /* private mode */ }
  };
  const goType = (id) => {
    for (const x of shown) { const i = x.levels.findIndex((t) => t.id === id); if (i >= 0) { if (x.s.id === subject.id) go(i); else pick(x.s.id, i); try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { /* older browsers */ } return; } }
  };
  /* a sideways swipe on the hero changes subject (the page is right-to-left: the next subject sits on the left, so it comes in with a swipe to the right) */
  const swipe = many ? {
    onTouchStart: (e) => { const t = e.touches[0]; touch.current = t ? { x: t.clientX, y: t.clientY } : null; },
    onTouchEnd: (e) => {
      const a = touch.current, t = e.changedTouches[0]; touch.current = null;
      if (!a || !t) return;
      const dx = t.clientX - a.x, dy = t.clientY - a.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const next = shown[si + (dx > 0 ? 1 : -1)];
      if (next) pick(next.s.id);
    },
  } : null;

  const hero = useMemo(() => heroOf(type, subject), [type, subject]);
  const hasLaws = useMemo(() => { const l = lawsOf(subject.id); return l.laws.length + l.more.length > 0; }, [subject]);
  const toLaws = () => {
    const el = document.getElementById('prf-laws');
    if (!el) return;
    const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: calm ? 'auto' : 'smooth' }); } catch { el.scrollIntoView(); }
  };
  const slide = dir ? ` prf-subj-in is-${dir}` : '';

  /* the subject bar (switcher + meta line) and the ladder of this subject; `inner` (what the open level is about +
     its help stages) comes from ProofChapter, which also owns the saved progress (`state`) */
  const path = useCallback(({ state, inner }) => {
    const all = cur.levels.map((t) => typeState(state, t.id));
    const spot = all.findIndex((ts) => ts.level < 4);              // the recommended order is the ladder's
    const done = all.filter((ts) => ts.level >= 4).length;
    return (
      <>
        <div className="prf-subjbar">
          {many && (
            <div className="prf-subj" role="group" aria-label={T['lbl.subjects']} style={{ '--prf-n': shown.length, '--prf-i': si }}>
              <span className="prf-subj-thumb" aria-hidden="true" />
              {shown.map((x, i) => <button type="button" key={x.s.id} className={`prf-subj-b${i === si ? ' is-on' : ''}`} aria-pressed={i === si} onClick={() => pick(x.s.id)}>{x.s.name}</button>)}
            </div>
          )}
          <p className="prf-subj-meta" key={subject.id}>
            {!many && <b>{subject.name}</b>}{!many && <span aria-hidden="true"> · </span>}
            <span>{fill('lbl.subjMeta', { when: subject.when, done, n: all.length })}</span>
          </p>
        </div>
        <nav className="ch-btns prf-path" aria-label={T['lbl.order']} key={subject.id}>
          {cur.levels.map((t, i) => {
            const ts = all[i], passed = ts.level >= 4, lv = Math.min(3, ts.level), open = at.ch === i, on = began(ts), no = levelNo(t.id);
            return (
              <div key={t.id} className={`prf-pt${open ? ' is-open' : ''}${passed ? ' is-passed' : ''}${on ? ' is-began' : ''}`}>
                <div className="prf-pt-row">
                  <button type="button" className={`ch-btn ${open ? 'active' : ''}`} data-mp-key={t.button} aria-expanded={open} onClick={() => go(i)}>
                    <span className="prf-pt-n" aria-hidden="true">{no}</span>
                    <span className="prf-pt-tx"><span className="prf-pt-k">{fill('lbl.levelN', { n: no })}</span><span className="prf-sr"> · </span><span className="prf-pt-name">{t.label}</span></span>
                  </button>
                  {i === spot && <span className="prf-pt-next">{on ? T['lbl.here'] : T['lbl.nextUp']}</span>}
                  {passed && <span className="prf-pt-ok" aria-hidden="true"><IcCheck /></span>}
                  <span className="prf-pt-lv" aria-hidden="true">
                    {[0, 1, 2, 3].map((k) => <i key={k} className={passed || (k === 0 ? on : k < lv) ? 'is-on' : k === lv && on ? 'is-here' : ''} style={{ height: `${7 + k * 3}px` }} />)}
                  </span>
                  <span className="prf-sr">{passed ? T['lbl.passed'] : on ? stageOf(ts.level) : ''}</span>
                </div>
                {open && <div className="prf-pt-open">{inner}</div>}
              </div>
            );
          })}
        </nav>
        {hasLaws && <button type="button" className="prf-tolaws" onClick={toLaws}><IcBook /><span>{T['lbl.lawsOf']}</span><IcDown /></button>}
      </>
    );
  }, [at, si, shown, hasLaws]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="prf prf-book">
    <div className={`prf-topic${inProof ? ' prf-in-proof' : ''}`}>
      <div className="hdr prf-mast" {...swipe}>
        <h1 className={`prf-wm${slide}`} key={subject.id} aria-label={`${T['lbl.title']} · ${subject.name}`}>{subject.short}</h1>
        {hero && <div className={`prf-stage prf-mast-fig${slide}`} key={type.id}><ProofFigure problem={hero.p} marks={hero.marks} label={T['lbl.sample']} /></div>}
      </div>
      <ProofChapter type={type} key={type.id} path={path} onOpen={setInProof} onGoType={goType} devRescue={devRescue} />
      {/* the levels of the subjects not on screen: found by ?ch=<key> (TopicView clicks the button with that key) */}
      {many && (
        <div className="prf-sr" aria-hidden="true">
          {shown.map((x, i) => (i === si ? null : x.levels.map((t, k) => <button type="button" key={t.id} className="ch-btn" tabIndex={-1} data-mp-key={t.button} onClick={() => pick(x.s.id, k)} />)))}
        </div>
      )}
    </div>
    {!inProof && hasLaws && <Theorems subject={subject.id} mode="page" key={subject.id} />}
    </div>
  );
}
