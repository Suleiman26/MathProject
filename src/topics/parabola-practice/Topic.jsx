'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/parabola-practice.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// Fraction drawn as numerator over denominator (Sulaiman, fixes board #54).
const Fr = ({ n, d }) => <span className="pp-fr" dir="ltr"><span>{n}</span><span>{d}</span></span>;
// Sharp graph drawing (#62) and the [ ] > [ ] range rows (#39) live in ./extras.jsx.
// The root sign that covers everything under it (fixes board #65).
import { Root } from '@/components/Root';
import { drawGraph, graphDpr, monoCheck, MonoRows, MonoError, MonoSummary, signCheck, SignRows, SignError, SignSummary, SIGN_EMPTY, QuadIntro } from './extras';
// ===== BEGIN ORIGINAL =====

const { useState, useEffect, useRef, useCallback } = React;

// ── helpers ──────────────────────────────────────────────────────────────────
const GRAPH_SIZE = 400;
const RANGE = 8;
const toCanvas = (val) => (val + RANGE) / (2 * RANGE) * GRAPH_SIZE;
const toWorld = (px) => (px / GRAPH_SIZE) * (2 * RANGE) - RANGE;
const evalY = (a, b, c, x) => a * x * x + b * x + c;

// allowSymmetric: permit b=0 parabolas (~20% chance)
// integerVertex:  force vx,vy to be integers (r1,r2 same parity)
function makeFunction(forceSymmetric = false, allowSymmetric = true, integerVertex = false) {
  const as = [1, -1, 2, -2];
  const a = as[Math.floor(Math.random() * as.length)];
  let r1, r2;
  if (forceSymmetric || (allowSymmetric && !integerVertex && Math.random() < 0.2)) {
    r1 = -(Math.floor(Math.random() * 4) + 1);
    r2 = -r1;
  } else {
    let tries = 0;
    do {
      r1 = Math.floor(Math.random() * 9) - 4;
      r2 = Math.floor(Math.random() * 9) - 4;
      tries++;
      if (tries > 200) break;
    } while (
      r2 === r1 ||
      (!allowSymmetric && r1 + r2 === 0) ||
      (integerVertex && (r1 + r2) % 2 !== 0)
    );
  }
  const b = a * (-(r1 + r2));
  const c = a * r1 * r2;
  const vx = -b / (2 * a);
  const vy = evalY(a, b, c, vx);
  if (Math.abs(vx) > 7 || Math.abs(vy) > 7) return makeFunction(forceSymmetric, allowSymmetric, integerVertex);
  return { a, b, c, r1, r2, vx, vy };
}

// ── Graph component ───────────────────────────────────────────────────────────
function Graph({
  a, b, c,
  extraPoints = [],
  highlightVertex = false,
  axisOfSymmetry = null,
  hoverX = null,
  drawPath = [],
  userPath = [],
  roots = [],
  riseRegions = [],
  fallRegions = [],
  posRegions = [],
  negRegions = [],
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  width = GRAPH_SIZE,
  height = GRAPH_SIZE,
}) {
  const canvasRef = useRef(null);
  const [range, setRange] = useState(8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const panStartRef = useRef(null);
  const toC  = useCallback((val) => (val - offset.x + range) / (2 * range) * width,  [width, range, offset.x]);
  const toV  = useCallback((px)  => (px  / width)  * (2 * range) - range + offset.x,  [width, range, offset.x]);
  const toCY = useCallback((val) => (offset.y + range - val) / (2 * range) * height, [height, range, offset.y]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawGraph(canvas, { a, b, c, extraPoints, highlightVertex, axisOfSymmetry, hoverX, drawPath, userPath, roots,
      riseRegions, fallRegions, posRegions, negRegions, width, height, range, offset, toC, toV, toCY });

  }, [a, b, c, extraPoints, highlightVertex, axisOfSymmetry, hoverX, drawPath, userPath, roots, riseRegions, fallRegions, posRegions, negRegions, width, height, toC, toCY, toV, range, offset]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const touch = e.touches ? e.touches[0] : e;
    const cpx = (touch.clientX - rect.left) * scaleX;
    const cpy = (touch.clientY - rect.top) * scaleY;
    return {
      px: cpx, py: cpy,
      wx: toV(cpx),
      wy: offset.y + range - (cpy / height) * (2 * range),
    };
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setRange(r => Math.max(3, Math.min(20, r * (e.deltaY > 0 ? 1.2 : 1 / 1.2))));
  };

  const handlePanDown = (e) => {
    const touch = e.touches ? e.touches[0] : e;
    panStartRef.current = { clientX: touch.clientX, clientY: touch.clientY, ox: offset.x, oy: offset.y };
  };
  const handlePanMove = (e) => {
    if (!panStartRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const dx = (touch.clientX - panStartRef.current.clientX) * (2 * range) / rect.width;
    const dy = (touch.clientY - panStartRef.current.clientY) * (2 * range) / rect.height;
    setOffset({ x: panStartRef.current.ox - dx, y: panStartRef.current.oy + dy });
  };
  const handlePanUp = () => { panStartRef.current = null; };

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:11, color:'#999', marginBottom:4, flexWrap:'wrap'}}>
        <span>🖱 גלגלת: זום | טווח ±{range.toFixed(1)}</span>
        <button onClick={() => setPanMode(p => !p)}
          style={{fontSize:11, padding:'2px 8px', border:'1px solid #ccc', borderRadius:4, cursor:'pointer',
            background: panMode ? '#1a237e' : '#f5f5f5', color: panMode ? '#fff' : '#555'}}>
          ✋ הזז גרף
        </button>
        <button onClick={() => { setOffset({x:0,y:0}); setRange(8); }}
          style={{fontSize:11, padding:'2px 8px', border:'1px solid #ccc', borderRadius:4, cursor:'pointer', background:'#f5f5f5', color:'#555'}}>
          ⊕ מרכז
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={Math.round(width * graphDpr())}
        height={Math.round(height * graphDpr())}
        style={{ width: Math.min(width, window.innerWidth - 48), height: 'auto', maxWidth: '100%',
          touchAction: 'none', cursor: panMode ? (panStartRef.current ? 'grabbing' : 'grab') : 'crosshair' }}
        onMouseMove={panMode ? (e) => handlePanMove(e) : (onMouseMove ? (e) => onMouseMove(getPos(e)) : undefined)}
        onMouseDown={panMode ? (e) => handlePanDown(e) : (onMouseDown ? (e) => onMouseDown(getPos(e)) : undefined)}
        onMouseUp={panMode ? () => handlePanUp() : (onMouseUp ? (e) => onMouseUp(getPos(e)) : undefined)}
        onMouseLeave={panMode ? handlePanUp : onMouseLeave}
        onWheel={handleWheel}
        onTouchMove={panMode ? (e) => { e.preventDefault(); handlePanMove(e); } : (onMouseMove ? (e) => { e.preventDefault(); onMouseMove(getPos(e)); } : undefined)}
        onTouchStart={panMode ? (e) => { e.preventDefault(); handlePanDown(e); } : (onMouseDown ? (e) => { e.preventDefault(); onMouseDown(getPos(e)); } : undefined)}
        onTouchEnd={panMode ? handlePanUp : (onMouseUp ? () => onMouseUp({}) : undefined)}
      />
    </div>
  );
}

// ── Section 1 ─────────────────────────────────────────────────────────────────
const near1 = (v, t) => Math.abs(v - t) < 0.05;
const tasks1 = [
  { text: 'שנה את a ל-2 וצפה מה קורה לפרבולה — האם היא נעשית צרה יותר או רחבה יותר?', check: (a,b,c) => near1(a,2), hint: 'הזז את הסליידר של a עד שיהיה 2',
    q: 'הפרבולה נעשתה צרה יותר?', yes: true, why: 'ככל ש-|a| גדול יותר, הענפים עולים מהר יותר והפרבולה צרה יותר.' },
  { text: 'שנה את a ל-(-1) — מה קורה לכיוון הפתיחה?', check: (a,b,c) => near1(a,-1), hint: 'הזז את הסליידר של a ל-(-1)',
    q: 'הפרבולה עדיין פתוחה כלפי מעלה?', yes: false, why: 'כש-a שלילי הפרבולה פתוחה כלפי מטה (∩). הסימן של a קובע את כיוון הפתיחה.' },
  { text: 'החזר את a ל-1, ושנה את c ל-3 — מה השתנה בגרף?', check: (a,b,c) => near1(a,1) && near1(c,3), hint: 'a=1, c=3',
    q: 'הצורה של הפרבולה השתנתה?', yes: false, why: 'c לא משנה את הצורה. הוא רק מזיז את הפרבולה למעלה או למטה, ו-c היא נקודת החיתוך עם ציר y.' },
  { text: 'שנה את b ל-2 — לאן עבר הקודקוד?', check: (a,b,c) => near1(b,2), hint: 'הזז את b ל-2',
    q: 'הקודקוד נשאר על ציר y?', yes: false, why: <>b מזיז את הקודקוד הצידה: x של הקודקוד הוא <Fr n="−b" d="2a" />.</> },
  { text: 'שנה את b ל-(-4) — שים לב לציר הסימטריה', check: (a,b,c) => near1(b,-4), hint: 'הזז את b ל-(-4)',
    q: 'ציר הסימטריה עבר לצד השני של ציר y?', yes: true, why: <>כשהסימן של b מתהפך, <Fr n="−b" d="2a" /> מחליף סימן, והקודקוד עובר לצד השני.</> },
  { text: 'הגדר a=2, b=-4, c=1 — מצא את נקודת הקודקוד מהגרף', check: (a,b,c) => near1(a,2) && near1(b,-4) && near1(c,1), hint: 'a=2, b=-4, c=1',
    q: 'הקודקוד הוא הנקודה (1, −1)?', yes: true, why: <><bdi dir="ltr">x = <Fr n="−(−4)" d="2·2" /> = 1</bdi>, ו-<bdi dir="ltr">y = 2·1² − 4·1 + 1 = −1</bdi>.</> },
];

function Section1() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [taskIdx, setTaskIdx] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [answer, setAnswer] = useState(null); // null | 'ok' | 'err'
  const [finished, setFinished] = useState(false);
  const task = tasks1[taskIdx];
  const vx = -b / (2 * a);
  const vy = evalY(a, b, c, vx);
  const r1 = v => Math.round(v * 10) / 10;
  const sgn = v => (v >= 0 ? '+ ' + r1(v) : '− ' + r1(Math.abs(v)));

  const handleA = (v) => {
    const val = parseFloat(v);
    setA(Math.abs(val) < 0.05 ? 0.1 : val);
  };

  useEffect(() => {
    if (confirmed || finished) return;
    if (task && task.check(a, b, c)) setConfirmed(true);
  }, [a, b, c, taskIdx]);

  const reply = (yes) => setAnswer(yes === task.yes ? 'ok' : 'err');
  const next = () => {
    setAnswer(null); setConfirmed(false);
    if (taskIdx < tasks1.length - 1) setTaskIdx(t => t + 1); else setFinished(true);
  };

  return (
    <div className="section">
      <div className="card">
        <div className="section-title">1 — השפעת המקדמים על הגרף</div>
        <QuadIntro />
        <div className="formula" dir="ltr">y = {r1(a)}x² {sgn(b)}x {sgn(c)}</div>
        <div style={{marginBottom: 8, color: '#555', fontSize: 14}}>קודקוד: <bdi dir="ltr">({r1(vx)}, {r1(vy)})</bdi></div>
        <Graph a={a} b={b} c={c} highlightVertex />
        <div style={{marginTop: 16}}>
          <div className="slider-row">
            <span className="slider-label">a</span>
            <input type="range" min="-3" max="3" step="0.1" value={a} disabled={confirmed && !finished}
              onChange={e => handleA(e.target.value)} />
            <span className="slider-val">{r1(a)}</span>
          </div>
          <div className="slider-row">
            <span className="slider-label">b</span>
            <input type="range" min="-5" max="5" step="0.1" value={b} disabled={confirmed && !finished}
              onChange={e => setB(parseFloat(e.target.value))} />
            <span className="slider-val">{r1(b)}</span>
          </div>
          <div className="slider-row">
            <span className="slider-label">c</span>
            <input type="range" min="-5" max="5" step="0.1" value={c} disabled={confirmed && !finished}
              onChange={e => setC(parseFloat(e.target.value))} />
            <span className="slider-val">{r1(c)}</span>
          </div>
        </div>
        {!finished ? (
          <>
            <div className="task-box">
              <strong>משימה {taskIdx + 1}/{tasks1.length}:</strong> {task.text}
            </div>
            {confirmed ? (
              <div className="pp-q">
                <div className="pp-q-t">{task.q}</div>
                {answer !== 'ok' && <div className="pp-q-b">
                  <button className="btn green" onClick={() => reply(true)}>כן</button>
                  <button className="btn" onClick={() => reply(false)}>לא</button>
                </div>}
                {answer === 'err' && <div className="msg-error">לא בדיוק. הסתכלו שוב על הגרף ונסו שוב.</div>}
                {answer === 'ok' && <div className="msg-success">נכון! {task.why}
                  <button className="btn" style={{marginRight: 10}} onClick={next}>{taskIdx < tasks1.length - 1 ? 'משימה הבאה ←' : 'לסיכום ←'}</button></div>}
              </div>
            ) : (
              <div className="msg-info" style={{fontSize:13}}>רמז: {task.hint}</div>
            )}
          </>
        ) : (
          <div className="pp-sum">
            <h3>סיכום: מה עושה כל מקדם?</h3>
            <div className="pp-sum-r"><b>a</b><span>הסימן קובע את כיוון הפתיחה: a חיובי ← פתוחה למעלה (∪), a שלילי ← פתוחה למטה (∩). ככל ש-|a| גדול יותר, הפרבולה צרה יותר.</span></div>
            <div className="pp-sum-r"><b>b</b><span>מזיז את הקודקוד הצידה (יחד עם a): ציר הסימטריה הוא <bdi dir="ltr">x = <Fr n="−b" d="2a" /></bdi>. כש-b = 0 הקודקוד על ציר y.</span></div>
            <div className="pp-sum-r"><b>c</b><span>מזיז את הפרבולה למעלה ולמטה בלי לשנות את הצורה. c היא נקודת החיתוך עם ציר y: <bdi dir="ltr">(0, c)</bdi>.</span></div>
            <button className="btn" onClick={() => { setFinished(false); setTaskIdx(0); setA(1); setB(0); setC(0); }}>להתחיל מחדש</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section 2 ─────────────────────────────────────────────────────────────────
function Section2() {
  const [fn, setFn] = useState(() => makeFunction(false, false));
  const [hoverX, setHoverX] = useState(null);
  const [clicked, setClicked] = useState(null);
  const [success, setSuccess] = useState(false);

  const newFn = () => { setFn(makeFunction(false, false)); setClicked(null); setSuccess(false); };
  const { a, b, c, vx } = fn;

  const handleClick = ({ wx }) => {
    if (success) return;
    const diff = Math.abs(wx - vx);
    setClicked(wx);
    if (diff <= 0.5) setSuccess(true);
  };

  return (
    <div className="section">
      <div className="card">
        <div className="section-title">2 — ציר הסימטריה</div>
        <div className="explanation">
          ציר הסימטריה הוא הישר האנכי העובר דרך הקודקוד. הוא מחלק את הפרבולה לשני חצאים שווים.<br />
          <strong>משוואתו: <bdi dir="ltr">x = <Fr n="−b" d="2a" /></bdi></strong>
        </div>
        <div className="formula">y = {a}x² {b >= 0 ? '+' : ''}{b}x {c >= 0 ? '+' : ''}{c}</div>
        <div className="task-box">לחץ על ציר הסימטריה של הפרבולה (הישר האנכי שעובר דרך הקודקוד)</div>
        <Graph
          a={a} b={b} c={c}
          hoverX={!success ? hoverX : null}
          axisOfSymmetry={success ? vx : null}
          onMouseMove={({ wx }) => setHoverX(wx)}
          onMouseDown={handleClick}
          onMouseLeave={() => setHoverX(null)}
        />
        {success ? (
          <div className="msg-success">מצוין! ציר הסימטריה: x = {vx % 1 === 0 ? vx : vx.toFixed(2)}</div>
        ) : clicked !== null ? (
          <div className="msg-error">נסה שוב — ציר הסימטריה עובר דרך הקודקוד (x = {vx % 1 === 0 ? vx : vx.toFixed(2)} בקירוב)</div>
        ) : null}
        <button className="btn orange" style={{marginTop: 12}} onClick={newFn}>פרבולה חדשה</button>
      </div>
    </div>
  );
}

// ── Section 3 ─────────────────────────────────────────────────────────────────
function Section3() {
  const [fn, setFn] = useState(() => makeFunction(false, true, true));
  const [inX, setInX] = useState('');
  const [inY, setInY] = useState('');
  const [result, setResult] = useState(null);

  const { a, b, c, vx, vy } = fn;
  const newFn = () => { setFn(makeFunction(false, true, true)); setInX(''); setInY(''); setResult(null); };

  const check = () => {
    const x = parseFloat(inX), y = parseFloat(inY);
    if (isNaN(x) || isNaN(y)) { setResult('invalid'); return; }
    if (Math.abs(x - vx) < 0.1 && Math.abs(y - vy) < 0.1) setResult('ok');
    else setResult('err');
  };

  return (
    <div className="section">
      <div className="card">
        <div className="section-title">3 — מציאת הקודקוד מגרף</div>
        <div className="explanation">
          <strong>הקודקוד</strong> הוא הנקודה שבה הפרבולה ״מסתובבת״: הנקודה הכי נמוכה כשהפרבולה פתוחה למעלה, או הכי גבוהה כשהיא פתוחה למטה. ציר הסימטריה עובר דרכו.<br/>
          כדי לקרוא אותו מהגרף: יורדים ממנו לציר x (זה ה-x שלו) ופונים לציר y (זה ה-y שלו).
        </div>
        <div className="task-box">זהה את הקודקוד (הנקודה הכתומה) והזן את הקואורדינטות שלו</div>
        <Graph a={a} b={b} c={c} highlightVertex />
        <div className="input-row" style={{marginTop: 14, direction: 'ltr', justifyContent: 'flex-start'}}>
          <label>x =</label>
          <input value={inX} onChange={e => { setInX(e.target.value); setResult(null); }} placeholder="?" />
          <label>y =</label>
          <input value={inY} onChange={e => { setInY(e.target.value); setResult(null); }} placeholder="?" />
          <button className="btn" onClick={check}>בדוק</button>
        </div>
        {result === 'ok' && <div className="msg-success">מצוין! הקודקוד הוא <span dir="ltr">({vx}, {vy})</span></div>}
        {result === 'err' && <div className="msg-error">לא מדויק — נסה שוב. שים לב לנקודה הכתומה</div>}
        {result === 'invalid' && <div className="msg-error">יש להזין מספרים</div>}
        <button className="btn orange" style={{marginTop: 12}} onClick={newFn}>פרבולה חדשה</button>
      </div>
    </div>
  );
}

// ── Section 4 ─────────────────────────────────────────────────────────────────
function Section4() {
  const [fn, setFn] = useState(() => makeFunction(false, true, true));
  const [step, setStep] = useState(1);
  const [inB, setInB] = useState('');
  const [inA, setInA] = useState('');
  const [inY, setInY] = useState('');
  const [vxFound, setVxFound] = useState(null);
  const [result1, setResult1] = useState(null);
  const [result2, setResult2] = useState(null);
  const { a, b, c, vx, vy } = fn;

  const newFn = () => { setFn(makeFunction(false, true, true)); setStep(1); setInB(''); setInA(''); setInY(''); setVxFound(null); setResult1(null); setResult2(null); };

  const checkStep1 = () => {
    const nb = parseFloat(inB), na = parseFloat(inA);
    if (isNaN(nb) || isNaN(na)) { setResult1('invalid'); return; }
    const computed = -nb / (2 * na);
    if (Math.abs(computed - vx) < 0.1) { setVxFound(computed); setResult1('ok'); }
    else setResult1('err');
  };

  const checkStep2 = () => {
    const y = parseFloat(inY);
    if (isNaN(y)) { setResult2('invalid'); return; }
    if (Math.abs(y - vy) < 0.1) setResult2('ok');
    else setResult2('err');
  };

  return (
    <div className="section">
      <div className="card">
        <div className="section-title">4 — מציאת הקודקוד מהמשוואה</div>
        <div className="explanation pp-ex">
          <div><strong>איך מוצאים את הקודקוד בלי גרף?</strong></div>
          <div>1. ה-x של הקודקוד: <bdi dir="ltr">x = <Fr n="−b" d="2a" /></bdi></div>
          <div>2. ה-y של הקודקוד: מציבים את ה-x הזה במשוואה.</div>
          <div className="pp-ex-box">
            <div><strong>דוגמה:</strong> <bdi dir="ltr">y = x² − 4x + 1</bdi> (כאן <bdi dir="ltr">a = 1 , b = −4</bdi>)</div>
            <div>1. <bdi dir="ltr">x = <Fr n="−(−4)" d="2·1" /> = <Fr n="4" d="2" /> = 2</bdi></div>
            <div>2. <bdi dir="ltr">y = 2² − 4·2 + 1 = 4 − 8 + 1 = −3</bdi></div>
            <div>הקודקוד: <bdi dir="ltr">(2, −3)</bdi></div>
          </div>
        </div>
        <div className="formula">y = {a}x² {b >= 0 ? '+' : ''}{b}x {c >= 0 ? '+' : ''}{c}</div>

        <div style={{marginTop: 12}}>
          <strong>שלב א׳ — x קודקוד:</strong>
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:10, margin:'14px 0', direction:'ltr', flexWrap:'wrap'}}>
            <span style={{fontSize:17, fontWeight:'bold'}}>x<sub>קודקוד</sub> =</span>
            <div style={{display:'inline-flex', flexDirection:'column', alignItems:'center', gap:0}}>
              <div style={{borderBottom:'2.5px solid #1a237e', padding:'4px 12px', textAlign:'center', display:'flex', alignItems:'center', gap:4}}>
                <span style={{fontSize:17}}>−</span>
                <input style={{width:52, textAlign:'center', border:'1.5px solid #c5cae9', borderRadius:5, padding:'4px 6px', fontSize:15}} value={inB} onChange={e => { setInB(e.target.value); setResult1(null); }} placeholder="b" />
              </div>
              <div style={{padding:'4px 12px', textAlign:'center', display:'flex', alignItems:'center', gap:4}}>
                <span style={{fontSize:16}}>2 ×</span>
                <input style={{width:52, textAlign:'center', border:'1.5px solid #c5cae9', borderRadius:5, padding:'4px 6px', fontSize:15}} value={inA} onChange={e => { setInA(e.target.value); setResult1(null); }} placeholder="a" />
              </div>
            </div>
          </div>
          {result1 !== 'ok' && <button className="btn" onClick={checkStep1}>בדוק</button>}
          {result1 === 'ok' && <div className="msg-success">נכון! x קודקוד = {vxFound}</div>}
          {result1 === 'err' && <div className="msg-error">לא נכון — הצב את ערכי b ו-a מהמשוואה</div>}
          {result1 === 'invalid' && <div className="msg-error">יש להזין מספרים</div>}
        </div>

        {result1 === 'ok' && (
          <div style={{marginTop: 16}}>
            <strong>שלב ב׳ — y קודקוד:</strong>
            <div style={{fontSize: 15, margin: '8px 0'}}>
              y = {a}·({vxFound})² {b >= 0 ? '+' : ''}{b}·({vxFound}) {c >= 0 ? '+' : ''}{c}
            </div>
            <div className="input-row">
              <label>y =</label>
              <input value={inY} onChange={e => { setInY(e.target.value); setResult2(null); }} placeholder="?" />
              <button className="btn" onClick={checkStep2}>בדוק</button>
            </div>
            {result2 === 'ok' && <div className="msg-success">מצוין! הקודקוד הוא <span dir="ltr">({vx}, {vy})</span></div>}
            {result2 === 'err' && <div className="msg-error">לא נכון — הצב את x קודקוד במשוואה</div>}
            {result2 === 'invalid' && <div className="msg-error">יש להזין מספר</div>}
          </div>
        )}
        <button className="btn orange" style={{marginTop: 16}} onClick={newFn}>פונקציה חדשה</button>
      </div>
    </div>
  );
}

// ── Drawing helper for sections 5, 6 ─────────────────────────────────────────
function useDrawing(a, b, c) {
  const [userPath, setUserPath] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState(null);
  const [showTrue, setShowTrue] = useState(false);

  // store world coordinates so accuracy is zoom-independent
  const startDraw = ({ wx, wy }) => { setDrawing(true); setUserPath([{ wx, wy }]); setDrawResult(null); setShowTrue(false); };
  const continueDraw = ({ wx, wy }) => { if (drawing) setUserPath(p => [...p, { wx, wy }]); };
  // Checks the drawing like a teacher would:
  //  1. the line stays close to the parabola (distance to the curve, not only the vertical gap,
  //     so steep parts are judged fairly)
  //  2. it goes through the vertex
  //  3. it covers both sides of the vertex (a real parabola, not a short scribble)
  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    if (userPath.length < 5) return;
    const vx = -b / (2 * a), vy = evalY(a, b, c, vx);
    const curve = [];
    for (let x = -RANGE; x <= RANGE; x += 0.02) { const y = evalY(a, b, c, x); if (Math.abs(y) <= RANGE + 2) curve.push([x, y]); }
    const dist = (pt) => { let m = Infinity; for (const [x, y] of curve) { const d = (pt.wx - x) ** 2 + (pt.wy - y) ** 2; if (d < m) m = d; } return Math.sqrt(m); };
    const ds = userPath.map(dist).sort((p, q) => p - q);
    const mean = ds.reduce((s, d) => s + d, 0) / ds.length;
    const p90 = ds[Math.floor(ds.length * 0.9)];
    const nearVertex = userPath.some(pt => Math.hypot(pt.wx - vx, pt.wy - vy) <= 0.7);
    // how far to each side the parabola stays on screen (at most 2 units)
    const room = Math.sqrt(Math.max(0, (RANGE - 0.5 - (a > 0 ? vy : -vy)) / Math.abs(a)));
    const need = Math.min(2, room) * 0.75;
    const xs = userPath.map(pt => pt.wx);
    const bothSides = Math.min(...xs) <= vx - need && Math.max(...xs) >= vx + need;
    if (mean <= 0.45 && p90 <= 0.9 && nearVertex && bothSides) { setDrawResult('ok'); setShowTrue(true); }
    else setDrawResult(!nearVertex ? 'vertex' : !bothSides ? 'sides' : 'err');
  };

  const reset = () => { setUserPath([]); setDrawResult(null); setShowTrue(false); };

  return { userPath, drawing, drawResult, showTrue, startDraw, continueDraw, endDraw, reset };
}

// ── Section 5 ─────────────────────────────────────────────────────────────────
function Section5() {
  const [fn, setFn] = useState(() => makeFunction());
  const { a, b, c, vx, vy } = fn;
  const { userPath, drawResult, showTrue, startDraw, continueDraw, endDraw, reset } = useDrawing(a, b, c);

  // second point: x = vx + 2
  const px2 = vx + 2, py2 = evalY(a, b, c, px2);
  const points = [
    { x: vx, y: vy, color: '#ff6f00', label: 'קודקוד' },
    { x: px2, y: py2, color: '#e91e63', label: 'נקודה' },
  ];

  const truePath = showTrue ? (() => {
    const pts = [];
    for (let wx = -RANGE; wx <= RANGE; wx += 0.1) {
      pts.push({ x: wx, y: evalY(a, b, c, wx) });
    }
    return pts;
  })() : [];

  const newFn = () => { setFn(makeFunction()); reset(); };

  return (
    <div className="section">
      <div className="card">
        <div className="section-title">5 — שרטוט פרבולה דרך קודקוד ונקודה נוספת</div>
        <div className="task-box">שרטט את הפרבולה על ידי לחיצה ארוכה וגרירה לאורך עקומת הפרבולה</div>
        <div style={{fontSize: 13, color: '#555', marginBottom: 8}}>קודקוד: ({vx}, {vy}) | נקודה נוספת: ({px2}, {py2 % 1 === 0 ? py2 : py2.toFixed(1)})</div>
        <Graph
          a={showTrue ? a : 0} b={b} c={c}
          extraPoints={points}
          drawPath={truePath}
          userPath={userPath}
          onMouseDown={startDraw}
          onMouseMove={continueDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        />
        {drawResult === 'ok' && <div className="msg-success">מצוין! הפרבולה מדויקת — הפרבולה האמיתית מוצגת בירוק</div>}
        {drawResult === 'err' && <div className="msg-error">נסה שוב — הפרבולה צריכה לעבור דרך שתי הנקודות בדיוק</div>}
        {drawResult === 'vertex' && <div className="msg-error">נסה שוב — הקו צריך לעבור דרך הקודקוד (הנקודה הכתומה)</div>}
        {drawResult === 'sides' && <div className="msg-error">נסה שוב — שרטט את שני הענפים, משני צידי הקודקוד</div>}
        <div style={{display:'flex', gap: 8, marginTop: 12}}>
          <button className="btn" onClick={reset}>נקה ונסה שוב</button>
          <button className="btn orange" onClick={newFn}>פרבולה חדשה</button>
        </div>
      </div>
    </div>
  );
}

// ── Section 6 ─────────────────────────────────────────────────────────────────
function Section6() {
  const [fn, setFn] = useState(() => makeFunction());
  const [inC, setInC] = useState('');
  const [step, setStep] = useState(1);
  const [result1, setResult1] = useState(null);
  const { a, b, c, vx, vy } = fn;
  const { userPath, drawResult, showTrue, startDraw, continueDraw, endDraw, reset } = useDrawing(a, b, c);

  const newFn = () => { setFn(makeFunction()); setInC(''); setStep(1); setResult1(null); reset(); };

  const checkPart1 = () => {
    const val = parseFloat(inC);
    if (isNaN(val)) { setResult1('invalid'); return; }
    if (Math.abs(val - c) < 0.1) { setResult1('ok'); setStep(2); }
    else setResult1('err');
  };

  const truePath = showTrue ? (() => {
    const pts = [];
    for (let wx = -RANGE; wx <= RANGE; wx += 0.1) pts.push({ x: wx, y: evalY(a, b, c, wx) });
    return pts;
  })() : [];

  return (
    <div className="section">
      <div className="card">
        <div className="section-title">6 — חיתוך עם ציר y ושרטוט</div>
        <div className="formula">y = {a}x² {b >= 0 ? '+' : ''}{b}x {c >= 0 ? '+' : ''}{c}</div>
        <div className="explanation">נקודת החיתוך עם ציר y מתקבלת כאשר x=0, כלומר y=c</div>

        {step === 1 && (
          <>
            <div className="task-box">מהי נקודת החיתוך עם ציר y? הזן את ערך y (כאשר x=0)</div>
            <div className="input-row" style={{direction:'ltr', justifyContent:'flex-start'}}>
              <label>(0,</label>
              <input value={inC} onChange={e => { setInC(e.target.value); setResult1(null); }} placeholder="y=?" />
              <label>)</label>
              <button className="btn" onClick={checkPart1}>בדוק</button>
            </div>
            {result1 === 'ok' && <div className="msg-success">נכון! נקודת החיתוך היא (0, {c})</div>}
            {result1 === 'err' && <div className="msg-error">לא נכון — כאשר x=0, y=?</div>}
            {result1 === 'invalid' && <div className="msg-error">יש להזין מספר</div>}
          </>
        )}

        {step === 2 && (
          <>
            <div className="task-box">שרטט את הפרבולה — שים לב לקודקוד ולנקודת החיתוך עם ציר y</div>
            <div style={{fontSize: 13, color: '#555', marginBottom: 8}}>
              קודקוד: ({vx % 1 === 0 ? vx : vx.toFixed(2)}, {vy % 1 === 0 ? vy : vy.toFixed(2)}) | חיתוך ציר y: (0, {c})
            </div>
            <Graph
              a={showTrue ? a : 0} b={b} c={c}
              extraPoints={[
                { x: vx, y: vy, color: '#ff6f00', label: 'קודקוד' },
                { x: 0, y: c, color: '#9c27b0', label: 'חיתוך y' },
              ]}
              drawPath={truePath}
              userPath={userPath}
              onMouseDown={startDraw}
              onMouseMove={continueDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            />
            {drawResult === 'ok' && <div className="msg-success">מצוין!</div>}
            {drawResult === 'err' && <div className="msg-error">נסה שוב — הפרבולה צריכה לעבור דרך שתי הנקודות</div>}
            <div style={{display:'flex', gap: 8, marginTop: 12}}>
              <button className="btn" onClick={reset}>נקה ונסה שוב</button>
            </div>
          </>
        )}
        <button className="btn orange" style={{marginTop: 12}} onClick={newFn}>פונקציה חדשה</button>
      </div>
    </div>
  );
}

// ── Section 7 ─────────────────────────────────────────────────────────────────
function QuadSolver({ a, b, c, onDone }) {
  const [stage, setStage] = useState(0); // 0 coefficients, 1 template, 2 computed
  const [co, setCo] = useState({ a: '', b: '', c: '' });
  const [coErr, setCoErr] = useState(null);
  const [slot, setSlot] = useState({ b1: '', b2: '', a1: '', c1: '', a2: '' });
  const [slotErr, setSlotErr] = useState(null);

  const disc = b * b - 4 * a * c;
  const r1 = disc >= 0 ? (-b + Math.sqrt(disc)) / (2 * a) : null;
  const r2 = disc >= 0 ? (-b - Math.sqrt(disc)) / (2 * a) : null;
  const num = v => parseFloat(String(v).replace('−', '-'));
  const f2 = v => (v % 1 === 0 ? v : v.toFixed(2));
  const p = v => (v < 0 ? `(${v})` : `${v}`);

  const checkCo = () => {
    if (num(co.a) === a && num(co.b) === b && num(co.c) === c) { setStage(1); setCoErr(null); }
    else setCoErr('לא נכון — a הוא המקדם של x², b של x, ו-c המספר החופשי (עם הסימן).');
  };
  const want = { b1: b, b2: b, a1: a, c1: c, a2: a };
  const bad = Object.keys(want).filter(k => slot[k] === '' || num(slot[k]) !== want[k]);
  const checkSlots = () => {
    if (!bad.length) { setStage(2); setSlotErr(null); }
    else setSlotErr(bad.length === 1 ? 'מקום אחד לא נכון (מסומן באדום).' : bad.length + ' מקומות לא נכונים (מסומנים באדום).');
  };
  const box = k => <input key={k} className={'pp-slot' + (slotErr && bad.includes(k) && slot[k] !== '' ? ' bad' : '')} value={slot[k]} placeholder={k[0]} disabled={stage > 1}
    onChange={e => { setSlot(v => ({ ...v, [k]: e.target.value })); setSlotErr(null); }} onKeyDown={e => e.key === 'Enter' && checkSlots()} />;
  const roots = disc < 0 ? [] : disc === 0 ? [r1] : [r1, r2];

  return (
    <div>
      <div style={{marginBottom: 8, fontWeight: 'bold', color: '#1a237e'}}>שלב 1: זהה את המקדמים</div>
      <div className="input-row" dir="ltr">
        {['a', 'b', 'c'].map(k => <React.Fragment key={k}><label>{k} =</label>
          <input value={co[k]} disabled={stage > 0} onChange={e => { setCo(v => ({ ...v, [k]: e.target.value })); setCoErr(null); }} onKeyDown={e => e.key === 'Enter' && checkCo()} placeholder="?" /></React.Fragment>)}
        {stage === 0 && <button className="btn" onClick={checkCo}>בדוק</button>}
      </div>
      {coErr && <div className="msg-error">{coErr}</div>}

      {stage >= 1 && <>
        <div style={{margin: '14px 0 4px', fontWeight: 'bold', color: '#1a237e'}}>שלב 2: הציבו בנוסחת השורשים (החישוב על המחשב)</div>
        <div className="pp-template" dir="ltr">
          <span className="pp-x">x₁,₂ =</span>
          <span className="pp-frac">
            <span className="pp-num">−({box('b1')}) ± <Root row>({box('b2')})² − 4·({box('a1')})·({box('c1')})</Root></span>
            <span className="pp-den">2·({box('a2')})</span>
          </span>
        </div>
        {stage === 1 && <button className="btn" onClick={checkSlots}>בדוק הצבה</button>}
        {slotErr && <div className="msg-error">{slotErr}</div>}
      </>}

      {stage === 2 && <div className="pp-calc" dir="ltr">
        <div>Δ = {p(b)}² − 4·{p(a)}·{p(c)} = {b * b} {4 * a * c >= 0 ? '−' : '+'} {Math.abs(4 * a * c)} = <b>{disc}</b></div>
        {disc < 0 && <div className="pp-calc-he" dir="rtl">Δ שלילי ← <b>אין חיתוך עם ציר x</b> (הפרבולה כולה מעל או מתחת לציר).</div>}
        {disc === 0 && <div>x = <Fr n={-b} d={2 * a} /> = <b>{f2(r1)}</b> <span dir="rtl">(Δ = 0 ← נקודת חיתוך אחת)</span></div>}
        {disc > 0 && <>
          <div><Root>Δ</Root> = <Root>{disc}</Root> = {f2(Math.sqrt(disc))}</div>
          <div>x₁ = <Fr n={<>{-b} + {f2(Math.sqrt(disc))}</>} d={2 * a} /> = <b>{f2(r1)}</b></div>
          <div>x₂ = <Fr n={<>{-b} − {f2(Math.sqrt(disc))}</>} d={2 * a} /> = <b>{f2(r2)}</b></div>
        </>}
        <button className="btn green" style={{marginTop: 10}} onClick={() => onDone && onDone(roots)}>סיום</button>
      </div>}
    </div>
  );
}

function Section7() {
  const [fn, setFn] = useState(() => makeFunction());
  const [done, setDone] = useState(false);
  const [roots, setRoots] = useState([]);
  const { a, b, c } = fn;

  const newFn = () => { setFn(makeFunction()); setDone(false); setRoots([]); };

  return (
    <div className="section">
      <div className="card">
        <div className="section-title">7 — חיתוך עם ציר x (שורשים)</div>
        <div className="explanation">
          נמצא את נקודות החיתוך עם ציר x על ידי פתרון <strong>ax²+bx+c=0</strong> בעזרת נוסחת השורשים:<br />
          <bdi dir="ltr">x = <Fr n={<>−b ± <Root>b²−4ac</Root></>} d="2a" /></bdi>
        </div>
        <div className="formula">y = {a}x² {b >= 0 ? '+' : ''}{b}x {c >= 0 ? '+' : ''}{c}</div>
        <div style={{marginTop: 14}}>
          <QuadSolver key={fn.a+'_'+fn.b+'_'+fn.c} a={a} b={b} c={c} onDone={(rs) => { setRoots(rs); setDone(true); }} />
        </div>
        {done && (
          <>
            {roots.length === 0
              ? <div className="msg-info">אין חיתוך עם ציר x</div>
              : <div className="msg-success">נקודות החיתוך עם ציר x: {roots.map((r,i) => `x${i+1}=${r%1===0?r:r.toFixed(2)}`).join(', ')}</div>
            }
            <Graph a={a} b={b} c={c} roots={roots} />
          </>
        )}
        <button className="btn orange" style={{marginTop: 12}} onClick={newFn}>פונקציה חדשה</button>
      </div>
    </div>
  );
}

// ── Section 8 ─────────────────────────────────────────────────────────────────
function Section8() {
  const [fn, setFn] = useState(() => makeFunction());
  const { a, b, c, vx } = fn;
  const [mode, setMode] = useState(null); // 'rise' | 'fall'
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [riseRange, setRiseRange] = useState(null);
  const [fallRange, setFallRange] = useState(null);
  const [checked, setChecked] = useState(false);
  const [regionResult, setRegionResult] = useState(null);
  const [answers, setAnswers] = useState({ rise: { l: '', r: '' }, fall: { l: '', r: '' } });
  const [ansResult, setAnsResult] = useState(null);

  const newFn = () => {
    setFn(makeFunction()); setMode(null); setDragging(false); setDragStart(null);
    setRiseRange(null); setFallRange(null); setChecked(false); setRegionResult(null);
    setAnswers({ rise: { l: '', r: '' }, fall: { l: '', r: '' } }); setAnsResult(null);
  };

  const handleDown = ({ wx }) => {
    if (!mode) return;
    setDragging(true); setDragStart(wx);
  };
  const handleMove = ({ wx }) => {
    if (!dragging || !mode) return;
    const range = [Math.min(dragStart, wx), Math.max(dragStart, wx)];
    if (mode === 'rise') setRiseRange(range);
    else setFallRange(range);
  };
  const handleUp = () => { setDragging(false); };

  const checkRegions = () => {
    if (!riseRange || !fallRange) { setRegionResult('missing'); return; }
    // For a > 0: rises when x > vx, falls when x < vx
    // For a < 0: rises when x < vx, falls when x > vx
    let riseOk, fallOk;
    if (a > 0) {
      riseOk = riseRange[0] >= vx - 0.5 && riseRange[1] > vx;
      fallOk = fallRange[0] < vx && fallRange[1] <= vx + 0.5;
    } else {
      riseOk = riseRange[0] < vx && riseRange[1] <= vx + 0.5;
      fallOk = fallRange[0] >= vx - 0.5 && fallRange[1] > vx;
    }
    setChecked(riseOk && fallOk);
    setRegionResult(riseOk && fallOk ? 'ok' : 'err');
  };

  const checkAnswers = () => setAnsResult(monoCheck(a, vx, answers.rise, answers.fall));

  const riseRegions = riseRange ? [riseRange] : [];
  const fallRegions = fallRange ? [fallRange] : [];

  return (
    <div className="section">
      <div className="card">
        <div className="section-title">8 — תחומי עלייה וירידה</div>
        <div className="formula">y = {fn.a}x² {fn.b >= 0 ? '+' : ''}{fn.b}x {fn.c >= 0 ? '+' : ''}{fn.c}</div>
        <div className="task-box">
          לחץ על כפתור, ואז לחץ וגרור על הגרף כדי לסמן את התחום הרצוי
        </div>
        <div style={{display:'flex', gap: 8, marginBottom: 10}}>
          <button className={`btn ${mode === 'rise' ? 'green' : ''}`} onClick={() => setMode('rise')}>סמן תחום עלייה (ירוק)</button>
          <button className={`btn ${mode === 'fall' ? 'red' : ''}`} onClick={() => setMode('fall')}>סמן תחום ירידה (אדום)</button>
        </div>
        <Graph
          a={fn.a} b={fn.b} c={fn.c}
          highlightVertex
          riseRegions={riseRegions}
          fallRegions={fallRegions}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
        />
        <div style={{display:'flex', gap: 8, marginTop: 10}}>
          <button className="btn" onClick={checkRegions}>בדוק סימון</button>
          <button className="btn orange" onClick={newFn}>פרבולה חדשה</button>
        </div>
        {regionResult === 'ok' && <div className="msg-success">מצוין! הסימון נכון</div>}
        {regionResult === 'err' && <div className="msg-error">לא מדויק — שים לב לקודקוד (הנקודה הכתומה)</div>}
        {regionResult === 'missing' && <div className="msg-error">יש לסמן גם תחום עלייה וגם תחום ירידה</div>}

        {checked && (
          <div style={{marginTop: 16}}>
            <strong>חלק ב׳ — נסח את התחומים:</strong>
            <MonoRows rise={answers.rise} fall={answers.fall} res={ansResult}
              setRise={f => setAnswers(p => ({...p, rise: f(p.rise)}))} setFall={f => setAnswers(p => ({...p, fall: f(p.fall)}))}
              onEdit={() => setAnsResult(null)} onEnter={checkAnswers} />
            <button className="btn" onClick={checkAnswers}>בדוק</button>
            {ansResult && ansResult.code === 'ok' && <div className="msg-success">מצוין! ניסוח נכון</div>}
            <MonoError res={ansResult} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section 9 ─────────────────────────────────────────────────────────────────
function Section9() {
  const [fn, setFn] = useState(() => {
    let f;
    do { f = makeFunction(); } while (f.r1 === f.r2);
    return f;
  });
  const { a, b, c, r1, r2 } = fn;
  const [mode, setMode] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [currentDrag, setCurrentDrag] = useState(null); // live preview while dragging
  const [posRegions, setPosRegions] = useState([]);
  const [negRegions, setNegRegions] = useState([]);
  const [checked, setChecked] = useState(false);
  const [regionResult, setRegionResult] = useState(null);
  const [answers, setAnswers] = useState({ pos: SIGN_EMPTY, neg: SIGN_EMPTY });
  const [ansResult, setAnsResult] = useState(null);

  const lo = Math.min(r1, r2), hi = Math.max(r1, r2);

  const newFn = () => {
    let f; do { f = makeFunction(); } while (f.r1 === f.r2);
    setFn(f); setMode(null); setDragging(false); setDragStart(null); setCurrentDrag(null);
    setPosRegions([]); setNegRegions([]); setChecked(false); setRegionResult(null);
    setAnswers({ pos: SIGN_EMPTY, neg: SIGN_EMPTY }); setAnsResult(null);
  };

  const handleDown = ({ wx }) => {
    if (!mode) return;
    setDragging(true); setDragStart(wx); setCurrentDrag([wx, wx]);
    setChecked(false); setRegionResult(null);
  };
  const handleMove = ({ wx }) => {
    if (!dragging || !mode) return;
    setCurrentDrag([Math.min(dragStart, wx), Math.max(dragStart, wx)]);
  };
  const handleUp = () => {
    if (!dragging || !currentDrag) { setDragging(false); return; }
    const range = currentDrag;
    if (Math.abs(range[1] - range[0]) > 0.2) {
      if (mode === 'pos') setPosRegions(p => [...p, range]);
      else setNegRegions(p => [...p, range]);
    }
    setDragging(false); setCurrentDrag(null);
  };

  // check (fixes board #67): the areas next to the roots (up to 1 unit on each side) must be
  // marked in the right colour; farther away marking is optional, but never in the wrong colour
  const checkRegions = () => {
    if (posRegions.length === 0 || negRegions.length === 0) { setRegionResult('missing'); return; }
    const samples = 320;
    let allOk = true;
    for (let i = 0; i <= samples; i++) {
      const wx = -8 + (16 * i / samples);
      const wy = evalY(a, b, c, wx);
      const d = Math.min(Math.abs(wx - lo), Math.abs(wx - hi));
      if (d < 0.2) continue; // right at a root: either colour is fine
      const isPos = wy > 0.1;
      const isNeg = wy < -0.1;
      if (!isPos && !isNeg) continue; // near zero, skip
      const markedPos = posRegions.some(([x1, x2]) => wx >= x1 && wx <= x2);
      const markedNeg = negRegions.some(([x1, x2]) => wx >= x1 && wx <= x2);
      if (isPos && markedNeg) { allOk = false; break; }
      if (isNeg && markedPos) { allOk = false; break; }
      if (d > 1) continue; // far from the roots: no need to mark
      if (isPos && !markedPos) { allOk = false; break; }
      if (isNeg && !markedNeg) { allOk = false; break; }
    }
    setChecked(allOk);
    setRegionResult(allOk ? 'ok' : 'err');
  };

  const checkAnswers = () => setAnsResult(signCheck(a, lo, hi, answers.pos, answers.neg));

  // merge current drag preview into display
  const displayPos = mode === 'pos' && currentDrag ? [...posRegions, currentDrag] : posRegions;
  const displayNeg = mode === 'neg' && currentDrag ? [...negRegions, currentDrag] : negRegions;

  return (
    <div className="section">
      <div className="card">
        <div className="section-title">9 — תחומי חיוביות ושליליות</div>
        <div className="formula">y = {a}x² {b >= 0 ? '+' : ''}{b}x {c >= 0 ? '+' : ''}{c}</div>
        <div style={{fontSize: 14, color: '#555', marginBottom: 8}}>שורשים: x₁={lo}, x₂={hi}</div>
        <div className="task-box">
          סמן את כל התחומים בהם הפונקציה חיובית (מעל ציר x) ושלילית (מתחת לציר x) — ניתן לסמן כמה תחומים<br/>
          <span style={{color:'#b71c1c', fontWeight:'bold'}}>⚠ אין צורך לצבוע את כל הגרף: מספיק לסמן בירוק ובאדום את האזורים שליד נקודות החיתוך עם ציר x, משני הצדדים של כל נקודה</span>
        </div>
        <div style={{display:'flex', gap: 8, marginBottom: 10, flexWrap:'wrap'}}>
          <button className={`btn ${mode === 'pos' ? 'green' : ''}`} onClick={() => setMode('pos')}>+ סמן תחום חיובי (ירוק)</button>
          <button className={`btn ${mode === 'neg' ? 'red' : ''}`} onClick={() => setMode('neg')}>+ סמן תחום שלילי (אדום)</button>
          <button className="btn" onClick={() => { setPosRegions([]); setNegRegions([]); setChecked(false); setRegionResult(null); }}>נקה הכל</button>
        </div>
        {mode && <div style={{fontSize:13,color:'#1a237e',marginBottom:6}}>מצב: {mode === 'pos' ? 'חיובי — גרור על הגרף לסימון' : 'שלילי — גרור על הגרף לסימון'}</div>}
        <Graph
          a={a} b={b} c={c}
          roots={[lo, hi]}
          posRegions={displayPos}
          negRegions={displayNeg}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
        />
        <div style={{fontSize:12,color:'#888',margin:'6px 0'}}>
          תחומים חיוביים: {posRegions.length} | תחומים שליליים: {negRegions.length}
        </div>
        <div style={{display:'flex', gap: 8, marginTop: 4}}>
          <button className="btn" onClick={checkRegions}>בדוק סימון</button>
          <button className="btn orange" onClick={newFn}>פרבולה חדשה</button>
        </div>
        {regionResult === 'ok' && <div className="msg-success">מצוין! הסימון נכון</div>}
        {regionResult === 'err' && <div className="msg-error">לא מדויק — ודא שסימנת בצבע הנכון את שני הצדדים של כל נקודת חיתוך</div>}
        {regionResult === 'missing' && <div className="msg-error">יש לסמן גם תחום חיובי וגם תחום שלילי</div>}

        {checked && (
          <div style={{marginTop: 16}}>
            <strong>חלק ב׳ — נסח:</strong>
            <div style={{fontSize: 14, color: '#555', margin: '8px 0'}}>x₁={lo}, x₂={hi}</div>
            <SignRows pos={answers.pos} neg={answers.neg} res={ansResult}
              setPos={f => setAnswers(p => ({...p, pos: f(p.pos)}))} setNeg={f => setAnswers(p => ({...p, neg: f(p.neg)}))}
              onEdit={() => setAnsResult(null)} onEnter={checkAnswers} />
            <button className="btn" onClick={checkAnswers}>בדוק</button>
            {ansResult && ansResult.code === 'ok' && <div className="msg-success">מצוין! ניסוח נכון</div>}
            <SignError res={ansResult} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section 10 ────────────────────────────────────────────────────────────────
function Section10() {
  const [fn, setFn] = useState(() => makeFunction());
  const [step, setStep] = useState(0); // 0-5
  const [stepDone, setStepDone] = useState([false,false,false,false,false,false]);
  const [summary, setSummary] = useState(null);

  // per-step state
  const [inYaxis, setInYaxis] = useState('');
  const [yAxisResult, setYAxisResult] = useState(null);
  const [roots, setRoots] = useState([]);
  const [rootsDone, setRootsDone] = useState(false);
  const [vtxInputs, setVtxInputs] = useState({inB:'',inA:'',inY:''});
  const [vtxStep, setVtxStep] = useState(1);
  const [vtxVx, setVtxVx] = useState(null);
  const [vtxResult1, setVtxResult1] = useState(null);
  const [vtxResult2, setVtxResult2] = useState(null);
  const { a, b, c, vx, vy } = fn;
  const disc = b*b-4*a*c;
  const r1 = disc>=0?(-b+Math.sqrt(disc))/(2*a):null;
  const r2 = disc>=0?(-b-Math.sqrt(disc))/(2*a):null;

  // draw
  const { userPath, drawResult, showTrue, startDraw, continueDraw, endDraw, reset: resetDraw } = useDrawing(a, b, c);

  // step 4: sign/monotone
  const [riseAns, setRiseAns] = useState({l:'',r:''});
  const [fallAns, setFallAns] = useState({l:'',r:''});
  const [posAns, setPosAns] = useState(SIGN_EMPTY);
  const [negAns, setNegAns] = useState(SIGN_EMPTY);
  const [monResult, setMonResult] = useState(null);
  const [signResult, setSignResult] = useState(null);

  const markDone = (i) => setStepDone(p => { const n=[...p]; n[i]=true; return n; });

  const newFn = () => {
    setFn(makeFunction()); setStep(0); setStepDone([false,false,false,false,false,false]); setSummary(null);
    setInYaxis(''); setYAxisResult(null); setRoots([]); setRootsDone(false);
    setVtxInputs({inB:'',inA:'',inY:''}); setVtxStep(1); setVtxVx(null); setVtxResult1(null); setVtxResult2(null);
    resetDraw(); setRiseAns({l:'',r:''}); setFallAns({l:'',r:''});
    setPosAns(SIGN_EMPTY); setNegAns(SIGN_EMPTY); setMonResult(null); setSignResult(null);
  };

  const stepLabels = ['א. חיתוך ציר y','ב. חיתוך ציר x','ג. קודקוד','ד. שרטוט','ה. חיוביות/שליליות','ו. עלייה/ירידה'];

  const buildSummary = () => {
    setSummary({
      yInt: c,
      roots: roots,
      vertex: [vx, vy],
      monotone: <MonoSummary a={a} vx={vx} />,
      sign: disc < 0 ? (a > 0 ? 'חיובית תמיד' : 'שלילית תמיד') :
        <SignSummary a={a} lo={Math.min(r1||0,r2||0)} hi={Math.max(r1||0,r2||0)} />,
    });
  };

  return (
    <div className="section">
      <div className="card">
        <div className="section-title">10 — חקירה מלאה</div>
        <div className="formula">y = {a}x² {b >= 0 ? '+' : ''}{b}x {c >= 0 ? '+' : ''}{c}</div>
        <div className="step-indicator">
          {stepLabels.map((l,i) => (
            <div key={i} className={`step-dot ${stepDone[i]?'done':step===i?'active':''}`} title={l}>
              {stepDone[i] ? '✓' : i+1}
            </div>
          ))}
        </div>
        <div style={{fontSize: 13, color: '#555', marginBottom: 12}}>{stepLabels[step]}</div>

        {/* Step 0: y-intercept */}
        {step === 0 && (
          <div>
            <div className="task-box">מהי נקודת החיתוך עם ציר y? (x=0)</div>
            <div className="input-row" style={{direction:'ltr', justifyContent:'flex-start'}}>
              <label>(0,</label>
              <input value={inYaxis} onChange={e => { setInYaxis(e.target.value); setYAxisResult(null); }} placeholder="y=?" />
              <label>)</label>
              <button className="btn" onClick={() => {
                const v = parseFloat(inYaxis);
                if (isNaN(v)) { setYAxisResult('invalid'); return; }
                if (Math.abs(v-c) < 0.1) { setYAxisResult('ok'); }
                else setYAxisResult('err');
              }}>בדוק</button>
            </div>
            {yAxisResult === 'ok' && <>
              <div className="msg-success">נכון! (0, {c})</div>
              <button className="btn green" onClick={() => { markDone(0); setStep(1); }}>שלב הבא</button>
            </>}
            {yAxisResult === 'err' && <div className="msg-error">לא נכון</div>}
            {yAxisResult === 'invalid' && <div className="msg-error">יש להזין מספר</div>}
          </div>
        )}

        {/* Step 1: x-intercepts */}
        {step === 1 && (
          <div>
            <QuadSolver key={'s10_'+fn.a+'_'+fn.b+'_'+fn.c} a={a} b={b} c={c} onDone={(rs) => { setRoots(rs); setRootsDone(true); }} />
            {rootsDone && <>
              <div className="msg-success">
                {roots.length === 0 ? 'אין חיתוך עם ציר x' :
                 roots.length === 1 ? `חיתוך יחיד: x=${roots[0]%1===0?roots[0]:roots[0].toFixed(2)}` :
                 `x₁=${roots[0]%1===0?roots[0]:roots[0].toFixed(2)}, x₂=${roots[1]%1===0?roots[1]:roots[1].toFixed(2)}`}
              </div>
              <button className="btn green" onClick={() => { markDone(1); setStep(2); }}>שלב הבא</button>
            </>}
          </div>
        )}

        {/* Step 2: vertex */}
        {step === 2 && (
          <div>
            <strong>שלב א׳ — x קודקוד:</strong>
            <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:10, margin:'14px 0', direction:'ltr', flexWrap:'wrap'}}>
              <span style={{fontSize:16, fontWeight:'bold'}}>x<sub>קודקוד</sub> =</span>
              <div style={{display:'inline-flex', flexDirection:'column', alignItems:'center'}}>
                <div style={{borderBottom:'2.5px solid #1a237e', padding:'4px 10px', textAlign:'center', display:'flex', alignItems:'center', gap:4}}>
                  <span style={{fontSize:16}}>−</span>
                  <input style={{width:48,textAlign:'center',border:'1.5px solid #c5cae9',borderRadius:5,padding:'3px 5px',fontSize:14}}
                    value={vtxInputs.inB} onChange={e=>setVtxInputs(p=>({...p,inB:e.target.value}))} placeholder="b"/>
                </div>
                <div style={{padding:'4px 10px', textAlign:'center', display:'flex', alignItems:'center', gap:4}}>
                  <span style={{fontSize:15}}>2 ×</span>
                  <input style={{width:48,textAlign:'center',border:'1.5px solid #c5cae9',borderRadius:5,padding:'3px 5px',fontSize:14}}
                    value={vtxInputs.inA} onChange={e=>setVtxInputs(p=>({...p,inA:e.target.value}))} placeholder="a"/>
                </div>
              </div>
            </div>
            {vtxResult1 !== 'ok' && <button className="btn" onClick={() => {
              const nb=parseFloat(vtxInputs.inB),na=parseFloat(vtxInputs.inA);
              if(isNaN(nb)||isNaN(na)){setVtxResult1('invalid');return;}
              const comp=-nb/(2*na);
              if(Math.abs(comp-vx)<0.1){setVtxVx(comp);setVtxResult1('ok');}
              else setVtxResult1('err');
            }}>בדוק</button>}
            {vtxResult1==='ok' && <div className="msg-success">x קודקוד = {vtxVx}</div>}
            {vtxResult1==='err' && <div className="msg-error">לא נכון — הצב b ו-a מהמשוואה</div>}
            {vtxResult1==='invalid' && <div className="msg-error">יש להזין מספרים</div>}

            {vtxResult1==='ok' && (
              <div style={{marginTop:12}}>
                <strong>שלב ב׳ — y קודקוד:</strong>
                <div style={{fontSize:14,margin:'6px 0'}}>y = {a}·({vtxVx})² {b>=0?'+':''}{b}·({vtxVx}) {c>=0?'+':''}{c}</div>
                <div className="input-row">
                  <label>y =</label>
                  <input value={vtxInputs.inY} onChange={e=>setVtxInputs(p=>({...p,inY:e.target.value}))} placeholder="?" />
                  <button className="btn" onClick={() => {
                    const y=parseFloat(vtxInputs.inY);
                    if(isNaN(y)){setVtxResult2('invalid');return;}
                    if(Math.abs(y-vy)<0.1){setVtxResult2('ok');}else setVtxResult2('err');
                  }}>בדוק</button>
                </div>
                {vtxResult2==='ok' && <>
                  <div className="msg-success">קודקוד: <span dir="ltr">({vx}, {vy})</span></div>
                  <button className="btn green" onClick={() => { markDone(2); setStep(3); }}>שלב הבא</button>
                </>}
                {vtxResult2==='err' && <div className="msg-error">לא נכון</div>}
                {vtxResult2==='invalid' && <div className="msg-error">יש להזין מספר</div>}
              </div>
            )}
          </div>
        )}

        {/* Step 3: draw */}
        {step === 3 && (
          <div>
            <div className="task-box">שרטט את הפרבולה עם כל הנקודות שמצאת</div>
            <Graph
              a={showTrue?a:0} b={b} c={c}
              extraPoints={[
                {x:vx,y:vy,color:'#ff6f00',label:'קודקוד'},
                {x:0,y:c,color:'#9c27b0',label:'y-axis'},
                ...roots.map((r,i)=>({x:r,y:0,color:'#e91e63',label:`x${i+1}`})),
              ]}
              drawPath={showTrue?(() => { const p=[]; for(let x=-RANGE;x<=RANGE;x+=0.1)p.push({x,y:evalY(a,b,c,x)}); return p; })():[]}
              userPath={userPath}
              onMouseDown={startDraw}
              onMouseMove={continueDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            />
            {drawResult==='ok' && <>
              <div className="msg-success">מצוין!</div>
              <button className="btn green" onClick={() => { markDone(3); setStep(4); }}>שלב הבא</button>
            </>}
            {drawResult==='err' && <div className="msg-error">נסה שוב</div>}
            {drawResult==='vertex' && <div className="msg-error">נסה שוב — הקו צריך לעבור דרך הקודקוד</div>}
            {drawResult==='sides' && <div className="msg-error">נסה שוב — שרטט את שני הענפים, משני צידי הקודקוד</div>}
            <button className="btn" onClick={resetDraw} style={{marginTop:8}}>נקה</button>
          </div>
        )}

        {/* Step 4: sign */}
        {step === 4 && (
          <div>
            <div className="task-box">נסח את תחומי החיוביות והשליליות</div>
            {roots.length >= 2 ? (
              <>
                <div style={{fontSize:14,color:'#555',margin:'8px 0'}}>שורשים: x₁={Math.min(...roots)%1===0?Math.min(...roots):Math.min(...roots).toFixed(2)}, x₂={Math.max(...roots)%1===0?Math.max(...roots):Math.max(...roots).toFixed(2)}</div>
                <SignRows pos={posAns} neg={negAns} setPos={setPosAns} setNeg={setNegAns} res={signResult}
                  onEdit={() => setSignResult(null)} onEnter={() => setSignResult(signCheck(a, Math.min(...roots), Math.max(...roots), posAns, negAns))} />
                <button className="btn" onClick={() => setSignResult(signCheck(a, Math.min(...roots), Math.max(...roots), posAns, negAns))}>בדוק</button>
                {signResult && signResult.code==='ok' && <>
                  <div className="msg-success">מצוין!</div>
                  <button className="btn green" onClick={() => { markDone(4); setStep(5); }}>שלב הבא</button>
                </>}
                <SignError res={signResult} />
              </>
            ) : (
              <>
                <div className="msg-info">{a>0?'הפרבולה חיובית תמיד (מלבד הקודקוד)':'הפרבולה שלילית תמיד (מלבד הקודקוד)'}</div>
                <button className="btn green" onClick={() => { markDone(4); setStep(5); }}>שלב הבא</button>
              </>
            )}
          </div>
        )}

        {/* Step 5: monotone */}
        {step === 5 && (
          <div>
            <div className="task-box">נסח את תחומי העלייה והירידה</div>
            <div className="pp-mon-hint">הגבול בין עלייה לירידה הוא ה-x של הקודקוד: <bdi dir="ltr">x = {vx%1===0?vx:vx.toFixed(2)}</bdi> (הקו המקווקו). הסתכלו לאן הפרבולה הולכת משמאל ומימין לו.</div>
            <Graph a={a} b={b} c={c} highlightVertex axisOfSymmetry={vx}
              extraPoints={[{x:vx,y:vy,color:'#ff6f00',label:'קודקוד'}]} />
            <MonoRows rise={riseAns} fall={fallAns} setRise={setRiseAns} setFall={setFallAns} res={monResult}
              onEdit={() => setMonResult(null)} onEnter={() => setMonResult(monoCheck(a, vx, riseAns, fallAns))} />
            <button className="btn" onClick={() => setMonResult(monoCheck(a, vx, riseAns, fallAns))}>בדוק</button>
            {monResult && monResult.code==='ok' && <>
              <div className="msg-success">מצוין! סיימת את החקירה!</div>
              <button className="btn green" onClick={() => { markDone(5); buildSummary(); }}>הצג סיכום</button>
            </>}
            <MonoError res={monResult} />
          </div>
        )}

        {summary && (
          <div className="summary-box">
            <h3>סיכום החקירה</h3>
            <div className="summary-row"><span className="label">פונקציה:</span> y = {a}x² {b>=0?'+':''}{b}x {c>=0?'+':''}{c}</div>
            <div className="summary-row"><span className="label">חיתוך ציר y:</span> (0, {summary.yInt})</div>
            <div className="summary-row"><span className="label">חיתוך ציר x:</span> {summary.roots.length===0?'אין':summary.roots.map((r,i)=>`(${r%1===0?r:r.toFixed(2)}, 0)`).join(', ')}</div>
            <div className="summary-row"><span className="label">קודקוד:</span> ({summary.vertex[0]%1===0?summary.vertex[0]:summary.vertex[0].toFixed(2)}, {summary.vertex[1]%1===0?summary.vertex[1]:summary.vertex[1].toFixed(2)})</div>
            <div className="summary-row"><span className="label">מונוטוניות:</span> {summary.monotone}</div>
            <div className="summary-row"><span className="label">סימן:</span> {summary.sign}</div>
          </div>
        )}

        <button className="btn orange" style={{marginTop: 16}} onClick={newFn}>פונקציה חדשה</button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
const SECTIONS = [Section1, Section2, Section3, Section4, Section5, Section6, Section7, Section8, Section9, Section10];
const SECTION_NAMES = [
  'השפעת מקדמים', 'ציר סימטריה', 'קודקוד מגרף', 'קודקוד ממשוואה',
  'שרטוט חופשי', 'חיתוך ציר y', 'שורשים', 'עלייה/ירידה', 'חיוביות/שליליות', 'חקירה מלאה'
];

function App() {
  const [active, setActive] = useState(0);
  const SectionComp = SECTIONS[active];
  return (
    <div>
      <nav className="nav">
        <span className="nav-title">פונקציה ריבועית</span>
        {SECTION_NAMES.map((name, i) => (
          <button key={i} className={`nav-btn ${active === i ? 'active' : ''}`} onClick={() => setActive(i)}>
            {i+1}. {name}
          </button>
        ))}
      </nav>
      <SectionComp key={active} />
    </div>
  );
}


// ===== END ORIGINAL =====
export default App;
