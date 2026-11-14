'use client';
/* Chapter 1 of the equations topic (fixes board #70, Sulaiman): what an unknown and an
   algebraic expression are, examples, a worked example, and then practice: short stories
   from which the student writes an algebraic expression. Logic and stories: ./words.js.
   Styles: src/styles/topic-fixes.css (classes wx-*). */
import React, { useRef, useState } from 'react';
import { parse, check, storyDeck } from './words';

/* ── Math drawn left-to-right; a division is a stacked fraction (board #54) ── */
const bare = (n) => (n.t === 'grp' ? n.a : n);
function Node({ n }) {
  switch (n.t) {
    case 'n': return <span>{String(n.v)}</span>;
    case 'x': return <i className="wx-x">x</i>;
    case 'grp': return <>(<Node n={n.a} />)</>;
    case 'neg': return <>−<Node n={n.a} /></>;
    case '+': case '-': return <><Node n={n.a} /><span className="wx-op">{n.t === '+' ? '+' : '−'}</span><Node n={n.b} /></>;
    case '*': return n.imp ? <><Node n={n.a} /><Node n={n.b} /></> : <><Node n={n.a} /><span className="wx-dot">·</span><Node n={n.b} /></>;
    case '/': return <span className="wx-fr"><span><Node n={bare(n.a)} /></span><span><Node n={bare(n.b)} /></span></span>;
  }
  return null;
}
export function Ex({ s }) {
  const r = parse(s);
  return <span dir="ltr" className="wx-ex">{r.ok ? <Node n={r.ast} /> : s}</span>;
}
/* Hebrew text with [[math]] inside */
function Rich({ text }) {
  return String(text).split(/(\[\[.*?\]\])/).map((seg, i) =>
    seg.startsWith('[[') ? <Ex key={i} s={seg.slice(2, -2)} /> : <React.Fragment key={i}>{seg}</React.Fragment>);
}

/* ── Explanation → examples → worked example ─────────────────────────────── */
const PAIRS = [
  ['מספר שגדול ב-3 מ-[[x]]', 'x+3'],
  ['מספר שקטן ב-5 מ-[[x]]', 'x-5'],
  ['פי 2 מ-[[x]]', '2x'],
  ['חצי מ-[[x]]', 'x/2'],
  ['מה שנשאר מ-20 אחרי שמורידים [[x]]', '20-x'],
  ['פי 3 מ-[[x]], ועוד 4', '3x+4'],
  ['חצי מ-[[x]], פחות 4', 'x/2-4'],
];
function Lesson({ onStart }) {
  return (
    <>
      <div className="card wx-lesson">
        <div className="card-t">מה זה נעלם?</div>
        <p><Rich text="נעלם הוא מספר שעדיין לא יודעים מהו. במקום המספר כותבים אות, בדרך כלל [[x]]." /></p>
        <div className="wx-say">
          <span className="wx-say-t">למשל</span>
          <p><Rich text="בקופסה יש עפרונות, אבל לא יודעים כמה. מסמנים: בקופסה יש [[x]] עפרונות." /></p>
        </div>
      </div>

      <div className="card wx-lesson">
        <div className="card-t">מה זה ביטוי אלגברי?</div>
        <p>ביטוי אלגברי הוא חישוב שכתובים בו מספרים, פעולות חשבון ונעלם.</p>
        <ul className="wx-list">
          <li><span>הוסיפו לקופסה 3 עפרונות. מספר העפרונות בה עכשיו:</span><b><Ex s="x+3" /></b></li>
          <li><span>יש 2 קופסאות כאלה. מספר העפרונות בשתיהן יחד:</span><b><Ex s="2x" /></b></li>
        </ul>
        <p className="wx-note"><Rich text="כותבים [[2x]] במקום [[2*x]], בלי סימן הכפל." /></p>
        <div className="wx-say">
          <span className="wx-say-t">ומה עושים עם זה?</span>
          <p><Rich text="כשמגלים כמה שווה [[x]], מציבים ומחשבים. אם בקופסה 10 עפרונות, אז [[x+3]] שווה 13, ו-[[2x]] שווה 20." /></p>
        </div>
      </div>

      <div className="card wx-lesson">
        <div className="card-t">ממילים לביטוי</div>
        <div className="wx-pairs" role="table" aria-label="ממילים לביטוי אלגברי">
          {PAIRS.map(([w, e]) => (
            <div className="wx-pair" role="row" key={e}>
              <span role="cell"><Rich text={w} /></span>
              <b role="cell"><Ex s={e} /></b>
            </div>
          ))}
        </div>
        <p className="wx-note"><Rich text={'שימו לב: "פי 2" זה כפל, [[2x]]. "גדול ב-2" זה חיבור, [[x+2]].'} /></p>
      </div>

      <div className="card wx-lesson">
        <div className="card-t">דוגמה פתורה</div>
        <p className="wx-story"><Rich text="לאבי יש פי 2 כסף מאשר לאורן. אבי נתן לאורן 20 שקלים. סמנו ב-[[x]] את הכסף שהיה לאורן לפני כן, וכתבו ביטוי אלגברי לכסף שיש עכשיו לכל אחד מהם." /></p>
        <ol className="wx-steps">
          <li><span><Rich text="לאורן היו [[x]] שקלים. כך ביקשו לסמן." /></span></li>
          <li><span>לאבי היה פי 2 מזה:</span><b><Ex s="2x" /></b></li>
          <li><span>אבי נתן 20 שקלים, ולכן נשארו לו:</span><b><Ex s="2x-20" /></b></li>
          <li><span>אורן קיבל 20 שקלים, ולכן יש לו:</span><b><Ex s="x+20" /></b></li>
        </ol>
        <div className="wx-result">
          <div><span>הכסף של אבי עכשיו</span><b><Ex s="2x-20" /></b></div>
          <div><span>הכסף של אורן עכשיו</span><b><Ex s="x+20" /></b></div>
        </div>
      </div>

      <div className="center wx-go">
        <button className="btn bp wx-start" onClick={onStart}>הבנתי, לתרגול</button>
      </div>
    </>
  );
}

/* ── Practice ─────────────────────────────────────────────────────────────── */
const blank = (story) => story.parts.map(() => ({ v: '', ok: false }));
function Practice() {
  const deck = useRef(null);
  if (!deck.current) deck.current = storyDeck();
  const [story, setStory] = useState(() => deck.current());
  const [boxes, setBoxes] = useState(() => blank(story));
  const [msg, setMsg] = useState(null);        // { kind: 'err' | 'warn', text }
  const [tries, setTries] = useState(0);
  const [shown, setShown] = useState(false);   // the answer was shown (not counted as solved)
  const [count, setCount] = useState(0);
  const inputs = useRef([]);
  const solved = boxes.every((b) => b.ok);
  const over = solved || shown;

  function type(i, v) {
    setBoxes((bs) => bs.map((b, k) => (k === i ? { ...b, v } : b)));
    if (msg && msg.kind === 'warn') setMsg(null);
  }
  function verify() {
    if (over) return;
    const empty = boxes.findIndex((b) => !b.ok && !b.v.trim());
    if (boxes.every((b) => b.ok || !b.v.trim())) return; // nothing typed: the page points at the empty box
    const res = boxes.map((b, i) => (b.ok || !b.v.trim() ? null : check(b.v, story.parts[i], story.parts)));
    const named = (i, text) => (story.parts.length > 1 ? `${story.parts[i].label}: ${text}` : text);
    const format = res.findIndex((r) => r && !r.ok && r.format);
    if (format >= 0) {
      setMsg({ kind: 'warn', text: named(format, res[format].msg) });
      if (inputs.current[format]) inputs.current[format].focus();
      return;
    }
    const next = boxes.map((b, i) => (res[i] && res[i].ok ? { ...b, ok: true } : b));
    setBoxes(next);
    const wrong = res.findIndex((r) => r && !r.ok);
    if (wrong >= 0) {
      setTries((n) => n + 1);
      setMsg({ kind: 'err', text: named(wrong, res[wrong].msg) });
      return;
    }
    setMsg(null);
    if (next.every((b) => b.ok)) { setCount((n) => n + 1); return; }
    if (empty >= 0 && inputs.current[empty]) inputs.current[empty].focus(); // one part right, the other still empty
  }
  function fresh() {
    const s = deck.current();
    setStory(s); setBoxes(blank(s)); setMsg(null); setTries(0); setShown(false);
  }

  const cut = story.text.indexOf('סמנו ב-');
  const tale = story.text.slice(0, cut).trim(), ask = story.text.slice(cut);

  return (
    <>
      <div className="card wx-card">
        <div className="wx-top">
          <span className="card-t wx-tag">{story.tag}</span>
          {count > 0 && <span className="wx-count">{count === 1 ? 'פתרתם סיפור אחד' : `פתרתם ${count} סיפורים`}</span>}
        </div>
        {tale && <p className="wx-story"><Rich text={tale} /></p>}
        <p className="wx-ask"><Rich text={ask} /></p>

        <div className="wx-parts">
          {story.parts.map((p, i) => (
            <label className={`wx-part${boxes[i].ok ? ' done' : ''}`} key={story.id + i}>
              <span className="wx-lbl">{p.label}</span>
              <input
                ref={(el) => { inputs.current[i] = el; }}
                type="text" className={`wx-in${boxes[i].ok ? ' ok' : ''}`}
                value={boxes[i].v} readOnly={boxes[i].ok || shown}
                onChange={(e) => type(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); verify(); } }}
                placeholder="ביטוי עם x" maxLength={30}
                autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                data-kp-mode="math" data-kp-extras="× ÷"
              />
            </label>
          ))}
        </div>

        {msg && !over && <div className={msg.kind === 'err' ? 'fb err' : 'feedback-warn wx-warn'}><Rich text={msg.text} /></div>}

        {!over && (
          <div className="action-row wx-actions">
            <button className="btn bp" onClick={verify}>בדיקה</button>
            {tries >= 3 && <button className="btn wx-show" onClick={() => { setShown(true); setMsg(null); }}>הצגת התשובה</button>}
          </div>
        )}

        {shown && (
          <div className="wx-answer">
            <div className="wx-answer-t">התשובה</div>
            {story.parts.map((p) => <div className="wx-line" key={p.label}><span>{p.label}</span><b><Ex s={p.ans} /></b></div>)}
            <p><Rich text={story.parts.map((p) => p.hint).join(' ')} /></p>
          </div>
        )}
      </div>

      {solved && (
        <div className="banner wx-banner">
          כל הכבוד! כתבתם ביטוי אלגברי נכון
          <div className="wx-lines">
            {story.parts.map((p) => <div className="wx-line" key={p.label}><span>{p.label}</span><b><Ex s={p.ans} /></b></div>)}
          </div>
          <button className="btn bp" onClick={fresh}>סיפור חדש</button>
        </div>
      )}
      {shown && (
        <div className="center wx-go">
          <button className="btn bp wx-new" onClick={fresh}>סיפור חדש</button>
        </div>
      )}
      {!over && (
        <div className="center wx-skip">
          <button className="btn wx-other" onClick={fresh}>סיפור אחר</button>
        </div>
      )}
    </>
  );
}

const SEEN = 'mp-equation-words-seen';
export default function WordsChapter() {
  const [tab, setTab] = useState(() => { try { return localStorage.getItem(SEEN) ? 'practice' : 'learn'; } catch (e) { return 'learn'; } });
  function go(t) {
    setTab(t);
    if (t === 'practice') { try { localStorage.setItem(SEEN, '1'); } catch (e) {} }
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) {}
  }
  return (
    <div className="content wx">
      <div className="sub-tabs">
        <button className={`sub-tab ${tab === 'learn' ? 'active' : ''}`} onClick={() => go('learn')}>הסבר ודוגמאות</button>
        <button className={`sub-tab ${tab === 'practice' ? 'active' : ''}`} onClick={() => go('practice')}>תרגול</button>
      </div>
      {tab === 'learn' ? <Lesson onStart={() => go('practice')} /> : <Practice />}
    </div>
  );
}
