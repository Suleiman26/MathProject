'use client';
/* The student's own work on a word problem, before the final answer (fixes board #93, Sulaiman):
   in each question the student chooses to write the equation of the story, or (motion questions)
   to fill a helper table speed · time = distance. Both are optional: the final answer below them
   is what solves the exercise. Logic: ./work.js.
   Its messages use their own classes (nw-wk-*), not the site's answer feedback classes, so this work
   is never counted as an answer in the stats (src/lib/mp-runtime.js) and the check button below is
   never pressed by it. data-kp-scope: the phone keypad's ✓ presses this panel's own button. */
import React, { useState } from 'react';
import { checkEquation, checkSolveStep, checkTable, parseEquation, rootOf, toM } from './work';
import { M, Rich } from './rich';

const COLS = [['מהירות', 'קמ״ש'], ['זמן', 'שעות'], ['דרך', 'ק״מ']];
const BOX = { type: 'text', autoComplete: 'off', autoCapitalize: 'off', autoCorrect: 'off', spellCheck: false, 'data-kp-mode': 'math', 'data-kp-extras': '× ÷' };

function Msg({ m }) {
  if (!m) return null;
  return <div className={`nw-wk-msg ${m.ok ? 'is-ok' : m.format ? 'is-warn' : 'is-err'}`} role="status"><Rich text={m.msg} /></div>;
}

function EquationPad({ xs, locked }) {
  const [src, setSrc] = useState('');
  const [msg, setMsg] = useState(null);
  const p = src.trim() ? parseEquation(src) : null;
  function check() {
    if (!src.trim()) { setMsg({ format: true, msg: 'כתבו כאן משוואה' }); return; }
    setMsg(checkEquation(src, xs));
  }
  return (
    <div className="nw-wk-body" data-kp-scope="">
      <label className="nw-wk-lbl" htmlFor="nw-wk-eq"><Rich text="כתבו את המשוואה שיוצאת מהסיפור (הנעלם [[x]])" /></label>
      <div className="nw-wk-eqrow">
        <input id="nw-wk-eq" {...BOX} dir="ltr" className={`nw-wk-in${msg && msg.ok ? ' ok' : ''}`} value={src} readOnly={locked}
          placeholder="3x + 5 = 20" maxLength={60}
          onChange={(e) => { setSrc(e.target.value); setMsg(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } }} />
        {!locked && <button type="button" className="btn nw-wk-go" data-kp-ok="" onClick={check}>בודקים</button>}
      </div>
      {p && p.ok && <div className="nw-wk-show" aria-hidden="true"><M s={`${toM(p.L)} = ${toM(p.R)}`} /></div>}
      <Msg m={msg} />
      {msg && msg.ok && rootOf(src) != null && <SolvePad key={src} root={rootOf(src)} locked={locked} />}
    </div>
  );
}

/* solving the accepted equation here, line by line (board #93, Sulaiman 2026-11-25): every line is checked
   to stay equivalent to it; the solving ends at "x = a number". Its own data-kp-scope: the keypad's ✓ checks this line. */
function SolvePad({ root, locked }) {
  const [lines, setLines] = useState([]);           // the accepted lines, as rendered math
  const [src, setSrc] = useState('');
  const [msg, setMsg] = useState(null);
  const done = lines.length > 0 && lines[lines.length - 1].done;
  const max = lines.length >= 10;
  function check() {
    if (!src.trim()) { setMsg({ format: true, msg: 'כתבו כאן את השורה הבאה בפתרון' }); return; }
    const r = checkSolveStep(src, root);
    setMsg(r);
    if (r.ok) {
      const e = parseEquation(src);
      setLines((ls) => [...ls, { m: `${toM(e.L)} = ${toM(e.R)}`, done: !!r.done }]);
      setSrc('');
    }
  }
  return (
    <div className="nw-wk-solve" data-kp-scope="">
      <p className="nw-wk-lbl"><Rich text="פותרים את המשוואה: בכל שורה עושים פעולה אחת בשני האגפים, עד [[x = …]]" /></p>
      {lines.length > 0 && (
        <ol className="nw-wk-lines">
          {lines.map((l, i) => <li key={i} className={l.done ? 'is-done' : undefined}><M s={l.m} /></li>)}
        </ol>
      )}
      {!done && !locked && !max && (
        <div className="nw-wk-eqrow">
          <input {...BOX} dir="ltr" className="nw-wk-in" value={src} maxLength={60} aria-label="השורה הבאה בפתרון"
            placeholder={lines.length ? 'השורה הבאה' : '3x = 15'}
            onChange={(e) => { setSrc(e.target.value); setMsg(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } }} />
          <button type="button" className="btn nw-wk-go" data-kp-ok="" onClick={check}>בודקים</button>
        </div>
      )}
      <Msg m={msg} />
    </div>
  );
}

function MotionTable({ names, locked, onEquation }) {
  const [cells, setCells] = useState(() => names.map(() => ['', '', '']));
  const [res, setRes] = useState(null);
  function type(r, c, v) {
    setCells((rows) => rows.map((row, i) => (i !== r ? row : row.map((o, k) => (k === c ? v : o)))));
    setRes(null);
  }
  const check = () => setRes(checkTable(cells, names));
  return (
    <div className="nw-wk-body" data-kp-scope="">
      <p className="nw-wk-lbl"><Rich text="בכל שורה: דרך = מהירות · זמן. כותבים מספר או ביטוי עם [[x]]." /></p>
      <div className="nw-wk-tablewrap">
        <table className="nw-wk-table">
          <thead><tr><th />{COLS.map(([h, u]) => <th key={h}>{h}<small>({u})</small></th>)}</tr></thead>
          <tbody>
            {names.map((n, r) => (
              <tr key={n} className={res && res.rows[r] === 'ok' ? 'ok' : res && res.rows[r] === 'bad' ? 'bad' : ''}>
                <th scope="row">{n}</th>
                {COLS.map(([h], c) => (
                  <td key={h}>
                    <input {...BOX} dir="ltr" className="nw-wk-cell" value={cells[r][c]} readOnly={locked} maxLength={16}
                      aria-label={`${h} של ${n}`} onChange={(e) => type(r, c, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!locked && (
        <div className="nw-wk-acts">
          <button type="button" className="btn nw-wk-go" data-kp-ok="" onClick={check}>בודקים את הטבלה</button>
          {res && res.ok && <button type="button" className="btn nw-wk-next" onClick={onEquation}>לכתיבת המשוואה</button>}
        </div>
      )}
      <Msg m={res} />
    </div>
  );
}

export default function WordWork({ work, locked }) {
  const [mode, setMode] = useState(null);
  const [opened, setOpened] = useState({});        // keep what was typed when switching back and forth
  function pick(m) { setMode((cur) => (cur === m ? null : m)); setOpened((o) => ({ ...o, [m]: true })); }
  const opts = [['eq', 'כותבים משוואה'], ...(work.table ? [['table', 'בונים טבלת עזר']] : [])];
  return (
    <section className={`nw-wk${mode ? ' is-open' : ''}`} aria-label="דרך הפתרון שלכם">
      <div className="nw-wk-head">
        <span className="nw-wk-t">{work.table ? 'איך תפתרו?' : 'דרך הפתרון'}</span>
        <div className="nw-wk-pick">
          {opts.map(([k, t]) => (
            <button type="button" key={k} className={`nw-wk-chip${mode === k ? ' on' : ''}`} aria-pressed={mode === k} onClick={() => pick(k)}>
              <span className="nw-wk-ico" aria-hidden="true">{k === 'eq' ? <i className="nw-wk-x">x</i> : <TableIcon />}</span>{t}
            </button>
          ))}
        </div>
      </div>
      {opened.eq && <div hidden={mode !== 'eq'}><EquationPad xs={work.xs} locked={locked} /></div>}
      {opened.table && work.table && <div hidden={mode !== 'table'}><MotionTable names={work.table.names} locked={locked} onEquation={() => pick('eq')} /></div>}
    </section>
  );
}

function TableIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <rect x="2.5" y="3.5" width="15" height="13" rx="2.5" /><path d="M2.5 8h15M8 8v8.5M12.5 8v8.5" />
    </svg>
  );
}
