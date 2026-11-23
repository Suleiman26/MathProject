'use client';
/* The proofs section: "המשפטים", the subject's theorem notebook (spec 2026-11-23 §6.2.4, §6.2.5, §6.3).
   One list, two places:
   · mode="page"  : the notebook page under the subject's ladder on the landing.
   · mode="sheet" : the same page opened from the proof header (a bottom sheet on a phone, a side sheet on a
                    computer). `current` = the reason of the step being worked on: its entry is highlighted and
                    scrolled into view. ProofScreen passes it ONLY at מודרך; at ביחד / לבד choosing the theorem is
                    the counted decision, so nothing is highlighted.
   Ruled paper, entries separated by space and the ruled lines: the theorems first (short name in the coral pill,
   the full sentence, a small honest drawing with only the theorem's own pattern marked: subjects.js `demos`),
   then the definitions and rules under their own small heading. A reason with no sentence yet is left out.
   Opening and closing is the student's own notebook: it never touches the proof (no session action, no help
   recorded, no feedback node for the tracker). The sheet traps focus, closes with Esc, the close button, a tap
   outside or the phone's back button, and gives the focus back to the button that opened it. */
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SUBJECTS, lawsOf, demoOf } from './subjects.js';
import { REASONS } from './reasons.js';
import { T, fill } from './texts.js';
import ProofFigure, { useReducedMotion } from './ProofFigure.jsx';
import { IcClose } from './signs.jsx';

/* the small drawing: built when the entry comes near the screen (the landing page), at once inside the sheet */
function Demo({ subject, id, eager }) {
  const box = useRef(null);
  const [near, setNear] = useState(!!eager);
  useEffect(() => {
    const el = box.current;
    if (near || !el) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return undefined; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: '360px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  const d = near ? demoOf(subject, id) : null;
  const marks = useMemo(() => (d ? d.marks.map((fact) => ({ fact, style: 'on' })) : []), [d]);
  return <div className="prf-th-fig" ref={box}>{d && <ProofFigure problem={d.problem} marks={marks} label={fill('lbl.lawFig', { name: REASONS[id].short })} />}</div>;
}

function Entry({ subject, id, n, now, eager, drawn }) {
  const r = REASONS[id];
  return (
    <li className={`prf-th-e is-${r.kind}${now ? ' is-now' : ''}${drawn ? '' : ' is-plain'}`} aria-current={now ? 'true' : undefined} data-law={id}>
      <span className="prf-th-n" aria-hidden="true">{n}</span>
      <div className="prf-th-tx">
        <p className="prf-th-k"><b className="prf-th-pill">{r.short}</b>{now && <span className="prf-th-now">{T['lbl.lawNow']}</span>}</p>
        <p className="prf-th-s"><span className="prf-th-mark">{r.full}</span></p>
      </div>
      {drawn && <Demo subject={subject} id={id} eager={eager} />}
    </li>
  );
}

function Paper({ subject, current, eager, head }) {
  const s = SUBJECTS.find((x) => x.id === subject);
  const { laws, more } = useMemo(() => lawsOf(subject), [subject]);
  const entry = (id, i) => <Entry key={id} subject={subject} id={id} n={i + 1} now={current === id} eager={eager} drawn={!!(s.demos && s.demos[id])} />;
  return (
    <div className="prf-th-paper">
      {head}
      {laws.length > 0 && <ol className="prf-th-list">{laws.map((id, i) => entry(id, i))}</ol>}
      {more.length > 0 && <h3 className="prf-th-h2">{T['lbl.lawsMore']}</h3>}
      {more.length > 0 && <ol className="prf-th-list" start={laws.length + 1}>{more.map((id, i) => entry(id, laws.length + i))}</ol>}
    </div>
  );
}

const MARK = 'prfLaws';
const onTop = () => { try { return !!(window.history.state && window.history.state[MARK]); } catch { return false; } };

function Sheet({ subject, title, current, onClose }) {
  const hid = useId();
  const panel = useRef(null), body = useRef(null), x = useRef(null), pushed = useRef(false), gone = useRef(false), t = useRef(null);
  const [out, setOut] = useState(false);
  const reduce = useReducedMotion(), reduceRef = useRef(reduce);
  reduceRef.current = reduce;

  // the sheet leaves (a short slide), then the proof screen takes it off
  const finish = () => {
    if (gone.current) return;
    gone.current = true;
    setOut(true);
    t.current = setTimeout(() => onClose && onClose(), reduceRef.current ? 0 : 190);
  };
  // closing by hand also takes our entry off the phone's back stack (the back button then leaves the page as before)
  const close = () => {
    if (pushed.current && onTop()) { try { window.history.back(); } catch { finish(); } t.current = setTimeout(finish, 350); } else finish();
  };
  const closeRef = useRef(close), finishRef = useRef(finish);
  closeRef.current = close; finishRef.current = finish;

  useEffect(() => {
    const opener = document.activeElement;
    if (x.current) x.current.focus({ preventScroll: true });
    if (!pushed.current) { pushed.current = true; try { window.history.pushState({ [MARK]: 1 }, ''); } catch { pushed.current = false; } }
    const onPop = () => { clearTimeout(t.current); finishRef.current(); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const stops = [x.current, body.current].filter(Boolean), at = stops.indexOf(document.activeElement);
      e.preventDefault();
      const next = at < 0 ? 0 : (at + (e.shiftKey ? stops.length - 1 : 1)) % stops.length;
      stops[next].focus({ preventScroll: true });
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey, true);
      if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => () => clearTimeout(t.current), []);

  // מודרך: the theorem of the step being worked on is brought into view (its first line a little under the top)
  useLayoutEffect(() => {
    const box = body.current, el = current && box ? box.querySelector('[aria-current="true"]') : null;
    if (!el) return;
    const d = el.getBoundingClientRect().top - box.getBoundingClientRect().top - 46;
    box.scrollTop = Math.max(0, box.scrollTop + d);
  }, [current]);

  return (
    <div className={`prf-th prf-th-sheet${out ? ' is-out' : ''}`}>
      <div className="prf-th-scrim" aria-hidden="true" onClick={close} />
      <div className="prf-th-panel" ref={panel} role="dialog" aria-modal="true" aria-labelledby={hid}>
        <div className="prf-th-bar">
          <h2 className="prf-th-h" id={hid}>{title}</h2>
          <button type="button" className="prf-th-x" ref={x} aria-label={T['btn.close']} onClick={close}><IcClose /></button>
        </div>
        <div className="prf-th-body" ref={body} tabIndex={0} role="group" aria-labelledby={hid}>
          <Paper subject={subject} current={current} eager />
        </div>
      </div>
    </div>
  );
}

export default function Theorems({ subject, current = null, mode = 'page', onClose }) {
  const hid = useId();
  const s = SUBJECTS.find((x) => x.id === subject);
  const any = useMemo(() => { const l = lawsOf(subject); return l.laws.length + l.more.length > 0; }, [subject]);
  if (!s || !any) return null;
  const title = fill('lbl.lawsIn', { subject: s.name });
  if (mode === 'sheet') return <Sheet subject={subject} title={title} current={current} onClose={onClose} />;
  return (
    <section className="prf-th prf-th-page" id="prf-laws" aria-labelledby={hid}>
      <Paper subject={subject} current={null} head={(
        <header className="prf-th-head">
          <h2 className="prf-th-h" id={hid}>{title}</h2>
          <p className="prf-th-sub">{T['lbl.lawsSub']}</p>
        </header>
      )} />
    </section>
  );
}
