'use client';
/* A small coin-flip lab for the probability lesson (fixes board #96, Sulaiman 2026-11-22):
   the student picks how many times to flip a fair coin (1 to 1,000,000), the computer flips at
   random, and the results of the last runs stay in a table (runs, heads, % heads), so it is easy to see the share of
   heads getting closer to 50% the more times one flips.  Lesson item: { fig: { type: 'coinSim' } } */
import React, { useState } from 'react';

const MAX = 1000000;
const QUICK = [10, 100, 1000, 10000, 100000, 1000000];
const th = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pct = (h, n) => (100 * h) / n;
const pctText = (h, n) => `${pct(h, n).toFixed(n >= 10000 ? 2 : 1)}%`;
const M = ({ children }) => <span className="nw-m">{children}</span>;

function flipMany(n) {
  let heads = 0; const seq = [];
  for (let i = 0; i < n; i++) { const h = Math.random() < 0.5; if (h) heads++; if (n <= 20) seq.push(h); }
  return { n, heads, seq: n <= 20 ? seq : null };
}

export function CoinSim() {
  const [txt, setTxt] = useState('10');
  const [runs, setRuns] = useState([]);
  const [err, setErr] = useState('');
  const [k, setK] = useState(0);
  function go(v) {
    if (!Number.isInteger(v) || v < 1 || v > MAX) { setErr('בחרו מספר שלם של הטלות, בין 1 ל-1,000,000.'); return; }
    setErr(''); setK((x) => x + 1);
    setRuns((rs) => [{ ...flipMany(v), id: Date.now() + Math.random() }, ...rs].slice(0, 6));
  }
  const fromTxt = () => go(Number(String(txt).replace(/[,\s]/g, '')));
  const last = runs[0];
  return (
    <div className="nw-coin" dir="rtl">
      <div className="nw-coin-t">מעבדת מטבע: מטבע הוגן, ההסתברות לעץ היא <M>50%</M></div>
      <div className="nw-coin-in">
        <label className="nw-coin-l" htmlFor="nw-coin-n">כמה הטלות?</label>
        <input id="nw-coin-n" className="nw-coin-n" dir="ltr" inputMode="numeric" value={txt}
          onChange={(e) => { setTxt(e.target.value); setErr(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') fromTxt(); }} />
        <button type="button" className="btn bp nw-coin-go" onClick={fromTxt}>הטילו</button>
      </div>
      <div className="nw-coin-quick" role="group" aria-label="מספר הטלות מהיר">
        {QUICK.map((q) => <button key={q} type="button" className="nw-coin-q" onClick={() => { setTxt(String(q)); go(q); }}><M>{th(q)}</M></button>)}
      </div>
      {err && <div className="nw-coin-err" role="alert">{err}</div>}
      {last && (
        <div className="nw-coin-res" key={k} aria-live="polite">
          <div className="nw-coin-big">
            <div className="nw-coin-side h"><span className="nw-coin-face">ע</span><b>עץ</b><M>{th(last.heads)}</M><small><M>{pctText(last.heads, last.n)}</M></small></div>
            <div className="nw-coin-of">מתוך <M>{th(last.n)}</M> הטלות</div>
            <div className="nw-coin-side t"><span className="nw-coin-face">פ</span><b>פלי</b><M>{th(last.n - last.heads)}</M><small><M>{pctText(last.n - last.heads, last.n)}</M></small></div>
          </div>
          <div className="nw-coin-bar" role="img" aria-label={`עץ ${pctText(last.heads, last.n)}, פלי ${pctText(last.n - last.heads, last.n)}`}>
            <span className="nw-coin-fill" style={{ width: `${pct(last.heads, last.n)}%` }} />
            <span className="nw-coin-mid" />
          </div>
          <div className="nw-coin-scale"><span>עץ</span><span><M>50%</M></span><span>פלי</span></div>
          {last.seq && <div className="nw-coin-seq" dir="ltr">{last.seq.map((h, i) => <span key={i} className={h ? 'h' : 't'}>{h ? 'ע' : 'פ'}</span>)}</div>}
        </div>
      )}
      {runs.length > 1 && (
        <div className="nw-tablewrap">
          <table className="nw-table nw-coin-hist">
            <thead><tr><th>הטלות</th><th>עץ</th><th>אחוז עץ</th></tr></thead>
            <tbody>{runs.map((r) => <tr key={r.id}><td><M>{th(r.n)}</M></td><td><M>{th(r.heads)}</M></td><td><M>{pctText(r.heads, r.n)}</M></td></tr>)}</tbody>
          </table>
        </div>
      )}
      {!runs.length && <div className="nw-coin-tip">נסו קודם <M>10</M> הטלות כמה פעמים, ואז <M>1,000,000</M>. מה קורה לאחוז העץ?</div>}
    </div>
  );
}
