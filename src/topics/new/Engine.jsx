'use client';
/* One chapter of the "חדש" module (board #84): explanation + practice, drawn from the
   chapter's data (./core.js describes the shapes). All chapters share this screen: in the
   module pages (./Module.jsx) and inside other topics (./Mount.jsx). */
import React, { useRef, useState } from 'react';
import { boxesOf, emptyValue, isEmpty, checkAll, deck } from './core';
import { M, Rich } from './rich';
import { Fig } from './figs';

/* ── Explanation ──────────────────────────────────────────────────────────── */
function LessonItem({ it }) {
  if (typeof it === 'string') return <p className="nw-p"><Rich text={it} /></p>;
  if (it.f != null) return <div className="nw-formula"><M s={it.f} /></div>;
  if (it.list) return <ul className="nw-list">{it.list.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ul>;
  if (it.note != null) return <p className="nw-note"><Rich text={it.note} /></p>;
  if (it.fig) return <Fig fig={it.fig} />;
  if (it.ex != null) {
    return (
      <div className="nw-ex">
        <span className="nw-ex-t">דוגמה</span>
        <p className="nw-ex-q"><Rich text={it.ex} /></p>
        {it.fig2 && <Fig fig={it.fig2} />}
        <ol className="nw-steps">{it.sol.map((s, i) => <li key={i}><span><Rich text={s} /></span></li>)}</ol>
      </div>
    );
  }
  return null;
}
function Lesson({ ch, onStart }) {
  return (
    <>
      {ch.lesson.map((card, i) => (
        <div className="card nw-lesson" key={i}>
          <div className="card-t">{card.t}</div>
          {card.items.map((it, k) => <LessonItem it={it} key={k} />)}
        </div>
      ))}
      <div className="center nw-go"><button className="btn bp nw-start" onClick={onStart}>הבנתי, לתרגול</button></div>
    </>
  );
}

/* ── Practice ─────────────────────────────────────────────────────────────── */
/* row parts → runs: [maths and boxes…] | { t: Hebrew text } */
function groupParts(parts) {
  const out = [];
  parts.forEach((p) => {
    if (p && typeof p === 'object' && 't' in p) { out.push(p); return; }
    const last = out[out.length - 1];
    if (Array.isArray(last)) last.push(p); else out.push([p]);
  });
  return out;
}
function Steps({ q }) {
  return (
    <div className="nw-sol">
      <div className="nw-sol-t">דרך הפתרון</div>
      <ol className="nw-steps">{q.steps.map((s, i) => <li key={i}><span><Rich text={s} /></span></li>)}</ol>
    </div>
  );
}

function Practice({ ch }) {
  const next = useRef(null);
  if (!next.current) next.current = deck(ch);
  const [q, setQ] = useState(() => next.current());
  const boxes = boxesOf(q);
  const [vals, setVals] = useState(() => boxes.map(emptyValue));
  const [ok, setOk] = useState(() => boxes.map(() => false));
  const [picked, setPicked] = useState([]);          // multiple choice: the wrong options already tried
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState(null);              // { kind: 'err' | 'warn', text }
  const [tries, setTries] = useState(0);
  const [shown, setShown] = useState(false);         // the solution was opened (does not count as solved)
  const [count, setCount] = useState(0);
  const over = won || shown;

  function fresh() {
    const n = next.current(); const bs = boxesOf(n);
    setQ(n); setVals(bs.map(emptyValue)); setOk(bs.map(() => false)); setPicked([]);
    setWon(false); setMsg(null); setTries(0); setShown(false);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }
  function type(i, v, part) {
    setVals((vs) => vs.map((old, k) => (k !== i ? old : part == null ? v : old.map((o, p) => (p === part ? v : o)))));
    if (msg && msg.kind === 'warn') setMsg(null);
  }
  function verify() {
    if (over) return;
    if (boxes.every((b, i) => isEmpty(b, vals[i]))) return;      // nothing typed: the page points at the empty box
    const { res, solved } = checkAll(q, vals);
    const format = res.find((r) => r && !r.ok && r.format);
    if (format) { setMsg({ kind: 'warn', text: format.msg }); return; }
    setOk(res.map((r) => !!(r && r.ok)));
    if (solved) { setWon(true); setMsg(null); setCount((n) => n + 1); return; }
    if (res.some((r) => r && !r.ok)) {
      setTries((n) => n + 1);
      setMsg({ kind: 'err', text: q.hint || (res.some((r) => r && r.ok) ? 'חלק מהתשובות נכונות. בדקו שוב את התיבות שלא נצבעו בירוק.' : 'לא מדויק. בדקו את החישוב ונסו שוב.') });
    } else setMsg(null);                                          // right so far, some boxes still empty
  }
  function choose(i) {
    if (over) return;
    if (i === q.choices.correct) { setWon(true); setMsg(null); setCount((n) => n + 1); return; }
    setPicked((p) => (p.includes(i) ? p : [...p, i]));
    setTries((n) => n + 1);
    setMsg({ kind: 'err', text: q.hint || 'לא נכון. חשבו שוב ובחרו תשובה אחרת.' });
  }

  let bi = -1;
  const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); verify(); } };
  return (
    <>
      <div className="card nw-card" key={q.key}>
        <div className="nw-top">
          <span className="card-t nw-tag">{q.tag}</span>
          {count > 0 && <span className="nw-count">{count === 1 ? 'פתרתם תרגיל אחד' : `פתרתם ${count} תרגילים`}</span>}
        </div>
        <p className="nw-ask"><Rich text={q.text} /></p>
        {q.fig && <Fig fig={q.fig} />}

        {q.rows && (
          <div className="nw-rows">
            {q.rows.map((row, ri) => (
              <div className="nw-row" key={ri}>
                {row.label && <span className="nw-lbl"><Rich text={row.label} /></span>}
                {/* Hebrew reading order for the line; every run of maths + boxes inside it stays left-to-right,
                    so "x = [ ] ס״מ" reads like in a Hebrew textbook (the unit after the number) */}
                <span className="nw-line">
                  {groupParts(row.parts).map((g, gi) => {
                    if (g.t != null) return <span className="nw-unit" key={gi}><Rich text={g.t} /></span>;
                    return (
                      <span className="nw-grp" dir="ltr" key={gi}>
                        {g.map((p, pi) => {
                          if (typeof p === 'string') return <M s={p} key={pi} />;
                          const i = ++bi; const done = ok[i] || won; const lock = done || shown;
                          if ('frac' in p) {
                            return (
                              <span className={`nw-frin${done ? ' done' : ''}`} key={pi}>
                                {[0, 1].map((k) => (
                                  <input key={k} type="text" inputMode="numeric" className={`nw-in nw-in--fr${done ? ' ok' : ''}`} value={vals[i][k]} readOnly={lock}
                                    onChange={(e) => type(i, e.target.value, k)} onKeyDown={onKey} maxLength={6} aria-label={k === 0 ? 'מונה' : 'מכנה'}
                                    autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                                ))}
                              </span>
                            );
                          }
                          return (
                            <input key={pi} type="text" inputMode="numeric" className={`nw-in${done ? ' ok' : ''}`} value={vals[i]} readOnly={lock}
                              onChange={(e) => type(i, e.target.value)} onKeyDown={onKey} maxLength={9} aria-label="תשובה"
                              style={p.w ? { width: `${p.w + 2}ch` } : undefined}
                              autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                          );
                        })}
                      </span>
                    );
                  })}
                </span>
              </div>
            ))}
          </div>
        )}

        {q.choices && (
          <div className="choice-row nw-choices">
            {q.choices.options.map((o, i) => (
              <button key={i} className={`choice-btn nw-choice${won && i === q.choices.correct ? ' correct' : ''}${picked.includes(i) ? ' wrong' : ''}`}
                disabled={over || picked.includes(i)} onClick={() => choose(i)}><Rich text={o} /></button>
            ))}
          </div>
        )}

        {msg && !over && <div className={msg.kind === 'err' ? 'fb err' : 'feedback-warn nw-warn'}><Rich text={msg.text} /></div>}

        {!over && (
          <div className="action-row nw-actions">
            {q.rows && <button className="btn bp" onClick={verify}>בדיקה</button>}
            {tries >= 3 && <button className="btn nw-show" onClick={() => { setShown(true); setMsg(null); }}>הצגת הפתרון</button>}
          </div>
        )}

        {shown && <Steps q={q} />}
      </div>

      {won && (
        <div className="banner nw-banner">
          כל הכבוד! תשובה נכונה
          <Steps q={q} />
          <button className="btn bp" onClick={fresh}>תרגיל חדש</button>
        </div>
      )}
      {shown && <div className="center nw-go"><button className="btn bp nw-new" onClick={fresh}>תרגיל חדש</button></div>}
      {!over && <div className="center nw-skip"><button className="btn nw-other" onClick={fresh}>תרגיל אחר</button></div>}
    </>
  );
}

/* staff: the "חדש" module shows the team where the chapter is recommended to live; a chapter
   that already lives in its topic (board #84, 2026-11-21) does not */
export default function Chapter({ ch, staff = false }) {
  const seenKey = `mp-new-seen-${ch.id}`;
  const [tab, setTab] = useState(() => { try { return localStorage.getItem(seenKey) ? 'practice' : 'learn'; } catch (e) { return 'learn'; } });
  function go(t) {
    setTab(t);
    if (t === 'practice') { try { localStorage.setItem(seenKey, '1'); } catch (e) {} }
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) {}
  }
  return (
    <div className="content nw">
      {staff && (
        <div className="nw-place">
          <span className="nw-place-t">הערה לצוות · כיתה {ch.grade}</span>
          <span className="nw-place-b"><b>המלצה למיקום:</b> {ch.place}</span>
        </div>
      )}
      <div className="sub-tabs">
        <button className={`sub-tab ${tab === 'learn' ? 'active' : ''}`} onClick={() => go('learn')}>הסבר ודוגמאות</button>
        <button className={`sub-tab ${tab === 'practice' ? 'active' : ''}`} onClick={() => go('practice')}>תרגול</button>
      </div>
      {tab === 'learn' ? <Lesson ch={ch} onStart={() => go('practice')} /> : <Practice ch={ch} />}
    </div>
  );
}
