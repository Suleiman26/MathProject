'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/directed-numbers.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const {useState, useEffect, useRef, useCallback} = React;

/* ═══════ Constants ═══════ */
const SVG_W = 760, SVG_H = 150, PAD = 40, LY = 88;
const NL_MIN = -20, NL_MAX = 20;
const UNIT = (SVG_W - 2 * PAD) / (NL_MAX - NL_MIN);

function v2x(v) { return PAD + (v - NL_MIN) * UNIT; }
function x2v(px) { return Math.max(NL_MIN, Math.min(NL_MAX, Math.round((px - PAD) / UNIT + NL_MIN))); }
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmtS(n) { return n < 0 ? '(' + n + ')' : '(+' + n + ')'; }

/* ═══════ Number Line Base ═══════ */
function NLBase() {
  const els = [];
  for (let i = NL_MIN; i <= NL_MAX; i++) {
    const x = v2x(i), big = i % 5 === 0;
    els.push(<line key={'t'+i} x1={x} y1={LY-(big?10:4)} x2={x} y2={LY+(big?10:4)}
      stroke={i===0?'#1e293b':'#9ca3af'} strokeWidth={i===0?2.5:big?1.5:0.7} />);
    if (big) els.push(<text key={'l'+i} x={x} y={LY+24} textAnchor="middle"
      fontSize={i===0?'14':'11'} fontWeight={i===0?'700':'400'}
      fill={i===0?'#1e293b':'#6b7280'}>{i}</text>);
  }
  return (<>
    <defs>
      <marker id="aL" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="7" markerHeight="7">
        <polygon points="10,1 0,5 10,9" fill="#374151"/></marker>
      <marker id="aR" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7">
        <polygon points="0,1 10,5 0,9" fill="#374151"/></marker>
    </defs>
    <line x1={PAD-12} y1={LY} x2={SVG_W-PAD+12} y2={LY}
      stroke="#374151" strokeWidth="2" markerStart="url(#aL)" markerEnd="url(#aR)" />
    {els}
  </>);
}

/* ═══════ Drag Hook ═══════ */
function useDrag(svgRef, onDrag, enabled) {
  const dragging = useRef(false);
  const cb = useRef(onDrag);
  cb.current = onDrag;

  const onPointerDown = useCallback((e) => {
    if (!enabled) return;
    e.preventDefault();
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    dragging.current = true;
  }, [enabled]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      cb.current(x2v((e.clientX - r.left) / r.width * SVG_W));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [svgRef]);

  return onPointerDown;
}

/* ═══════ Exercise Generators ═══════ */
function pickSigns() {
  const c = [['p','p'],['n','n'],['p','n'],['n','p']][randInt(0,3)];
  return [c[0]==='p'?1:-1, c[1]==='p'?1:-1];
}

function genAdd() {
  let a, b;
  do { const [sa,sb] = pickSigns(); a = randInt(1,15)*sa; b = randInt(1,15)*sb; }
  while (Math.abs(a+b) > 20);
  return { a, b, ans: a+b };
}

function genSub() {
  let a, b;
  do { const [sa,sb] = pickSigns(); a = randInt(1,15)*sa; b = randInt(1,15)*sb; }
  while (Math.abs(a-b) > 20);
  return { a, b, ans: a-b, eqB: -b };
}

function genMul() {
  let a, b;
  do { const [sa,sb] = pickSigns(); a = randInt(1,10)*sa; b = randInt(1,10)*sb; }
  while (Math.abs(a*b) > 20);
  return { a, b, ans: a*b };
}

function genDiv() {
  let dv, ds, q;
  do { const [sa,sb] = pickSigns(); q = randInt(1,10)*sa; ds = randInt(1,10)*sb; dv = q*ds; }
  while (Math.abs(dv) > 20 || ds === 0);
  return { a: dv, b: ds, ans: q, style: pick(['ruler','packages']) };
}
const G_COLORS = ['#3b82f6','#f97316','#8b5cf6','#ec4899','#14b8a6','#eab308','#ef4444','#06b6d4','#84cc16','#6366f1'];
/* Ruler style: shows the dividend bar and ONE reference bracket of length |b| (the divisor,
   already given) — NOT one bracket per group, since drawing |ans| brackets would let the
   student just count them and read off the answer directly. */
function DivRuler({ex}) {
  const x0 = v2x(0), xE = v2x(ex.a);
  const xLeft = Math.min(x0,xE), w = Math.abs(xE-x0);
  const dir = Math.sign(ex.a) || 1;
  const uEnd = dir*Math.abs(ex.b);
  const ux0 = v2x(0), ux1 = v2x(uEnd);
  const uxLeft = Math.min(ux0,ux1), uw = Math.abs(ux1-ux0);
  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H+10}`} style={{maxWidth:'100%',height:'auto',direction:'ltr'}}>
      <NLBase />
      <rect x={xLeft} y={LY-6} width={w} height={12} rx="3"
        fill="#0d9488" fillOpacity="0.15" stroke="#0d9488" strokeWidth="1.5" />
      <rect x={uxLeft} y={LY-6} width={uw} height={12} rx="2"
        fill="#f97316" fillOpacity="0.3" stroke="#f97316" strokeWidth="2" />
      <text x={uxLeft+uw/2} y={LY+40} textAnchor="middle" fontSize="12" fontWeight="700" fill="#f97316">{Math.abs(ex.b)}</text>
      <text x={v2x(ex.a/2)} y={LY-16} textAnchor="middle" fontSize="12" fill="#0d9488" fontWeight="600">
        {'\u05E1\u05D4"\u05DB '}{Math.abs(ex.a)}
      </text>
    </svg>
  );
}
/* Packages style: |a| dots (the given total) and |b| EMPTY package outlines (the given
   number of packages) — never shows how many items land in each package, since that's
   the answer the student has to find. */
function DivPackages({ex}) {
  const total = Math.abs(ex.a), boxCount = Math.abs(ex.b);
  return (
    <div style={{margin:'12px 0'}}>
      <div style={{display:'flex',flexWrap:'wrap',gap:5,justifyContent:'center',marginBottom:12,maxWidth:380,marginLeft:'auto',marginRight:'auto'}}>
        {Array.from({length:total}).map((_,i) => (
          <span key={i} style={{width:14,height:14,borderRadius:'50%',background:'#0d9488',display:'inline-block'}}/>
        ))}
      </div>
      <p style={{textAlign:'center',fontSize:13,color:'#6b7280',marginBottom:10}}>
        {total} {'\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DE\u05EA\u05D7\u05DC\u05E7\u05D9\u05DD \u05E9\u05D5\u05D5\u05D4 \u05D1\u05E9\u05D5\u05D5\u05D4 \u05DC\u05BE'}{boxCount}{' \u05D7\u05D1\u05D9\u05DC\u05D5\u05EA:'}
      </p>
      <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center'}}>
        {Array.from({length:boxCount}).map((_,i) => {
          const c = G_COLORS[i % G_COLORS.length];
          return (
            <div key={i} style={{border:`2px dashed ${c}`,borderRadius:10,padding:'12px 16px',minWidth:52,textAlign:'center',background:c+'11'}}>
              <div style={{fontSize:11,color:c,fontWeight:700,marginBottom:4}}>{'\u05D7\u05D1\u05D9\u05DC\u05D4'} {i+1}</div>
              <div style={{fontSize:20,color:c,fontWeight:700}}>?</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════ Arrow + Handle SVG helper ═══════ */
function ArrowVis({ startVal, dragVal, color, done, startDrag }) {
  const sX = v2x(startVal), eX = v2x(dragVal);
  const aY = LY - 24;
  const moved = dragVal !== startVal;
  const dir = dragVal > startVal;
  return (<>
    {/* start dot */}
    <circle cx={sX} cy={LY} r="7" fill={color} />
    {/* connector from dot to arrow level */}
    {moved && <line x1={sX} y1={LY} x2={sX} y2={aY} stroke={color} strokeWidth="1.5" strokeDasharray="3,2" />}
    {/* arrow line */}
    {moved && <line x1={sX} y1={aY} x2={eX} y2={aY} stroke={color} strokeWidth="3" />}
    {/* arrowhead */}
    {moved && <polygon fill={color}
      points={dir ? `${eX-7},${aY-5} ${eX+2},${aY} ${eX-7},${aY+5}`
                   : `${eX+7},${aY-5} ${eX-2},${aY} ${eX+7},${aY+5}`} />}
    {/* end connector */}
    {moved && <line x1={eX} y1={aY} x2={eX} y2={LY} stroke={color} strokeWidth="1.5" strokeDasharray="3,2" />}
    {/* end dot */}
    {moved && <circle cx={eX} cy={LY} r="5" fill={color} />}
    {/* value label */}
    {moved && <text x={eX} y={aY-12} textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>{dragVal}</text>}
    {/* drag handle */}
    {!done && <circle cx={eX} cy={aY} r="13" fill={color} fillOpacity="0.15"
      stroke={color} strokeWidth="2.5" style={{cursor:'grab'}} onPointerDown={startDrag} />}
  </>);
}

/* ═══════ Answer Row ═══════ */
function AnsRow({ answer, setAnswer, onCheck, done, fb, setFb }) {
  return (<>
    <div className="ans-row">
      <span style={{ fontSize: 18, fontWeight: 600 }}>=</span>
      <input style={{ width: 70 }} value={answer}
        onChange={e => { setAnswer(e.target.value); setFb(null); }}
        onKeyDown={e => e.key === 'Enter' && onCheck()}
        disabled={done} />
      <button className="btn bg" onClick={onCheck} disabled={done || !answer.trim()}>
        {'\u2713'} {'\u05D1\u05D3\u05D5\u05E7'}</button>
    </div>
    {fb === 'err' && <div className="fb err">{'\u2717'} {'\u05DC\u05D0 \u05E0\u05DB\u05D5\u05DF, \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.'}</div>}
  </>);
}

/* ═══════ Chapter 1: Addition ═══════ */
function Ch1() {
  const [ex, setEx] = useState(() => genAdd());
  const [dragVal, setDragVal] = useState(ex.a);
  const [answer, setAnswer] = useState('');
  const [fb, setFb] = useState(null);
  const [done, setDone] = useState(false);
  const svgRef = useRef(null);
  const startDrag = useDrag(svgRef, v => { if (!done) setDragVal(v); }, !done);

  const check = () => {
    const v = parseInt(answer);
    if (isNaN(v)) { setFb('err'); return; }
    if (v === ex.ans) { setFb('ok'); setDone(true); setDragVal(ex.ans); }
    else setFb('err');
  };
  const reset = () => { const e = genAdd(); setEx(e); setDragVal(e.a); setAnswer(''); setFb(null); setDone(false); };
  const color = done ? '#16a34a' : '#0d9488';

  return (
    <div className="content">
      <div className="card">
        <div className="card-t">{'\u05D7\u05D9\u05D1\u05D5\u05E8 \u05DE\u05E1\u05E4\u05E8\u05D9\u05DD \u05DE\u05DB\u05D5\u05D5\u05E0\u05D9\u05DD'}</div>
        <div className="eq-box">{fmtS(ex.a)} + {fmtS(ex.b)} = ?</div>
        <p style={{textAlign:'center',fontSize:14,color:'#6b7280',marginBottom:4}}>
          {'\u05D2\u05E8\u05D5\u05E8 \u05D0\u05EA \u05E8\u05D0\u05E9 \u05D4\u05D7\u05E5 \u05E2\u05DC \u05E6\u05D9\u05E8 \u05D4\u05DE\u05E1\u05E4\u05E8\u05D9\u05DD:'}</p>
        <div className="nl-wrap">
          <svg ref={svgRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{maxWidth:'100%',height:'auto',direction:'ltr'}}>
            <NLBase />
            <ArrowVis startVal={ex.a} dragVal={dragVal} color={color} done={done} startDrag={startDrag} />
          </svg>
        </div>
        <AnsRow answer={answer} setAnswer={setAnswer} onCheck={check} done={done} fb={fb} setFb={setFb} />
      </div>

      {done && (
        <div className="banner">
          {'\u2705'} {'\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3!'} &nbsp;
          <span style={{direction:'ltr',display:'inline-block'}}>{fmtS(ex.a)} + {fmtS(ex.b)} = {ex.ans}</span>
          <div style={{marginTop:12}}>
            <button className="btn bg" style={{fontSize:17}} onClick={reset}>
              {'\u05EA\u05E8\u05D2\u05D9\u05DC \u05D7\u05D3\u05E9 \u21BA'}</button>
          </div>
        </div>
      )}
      {!done && <div className="center" style={{marginTop:8}}>
        <button className="btn bp" onClick={reset}>{'\u05EA\u05E8\u05D2\u05D9\u05DC \u05D7\u05D3\u05E9 \u21BA'}</button>
      </div>}
    </div>
  );
}

/* ═══════ Chapter 2: Subtraction ═══════ */
function Ch2() {
  const [ex, setEx] = useState(() => genSub());
  const [phase, setPhase] = useState(0); // 0=convert, 1=solve, 2=done
  const [c1, setC1] = useState('');
  const [c2, setC2] = useState('');
  const [cfb, setCfb] = useState(null);
  const [dragVal, setDragVal] = useState(0);
  const [answer, setAnswer] = useState('');
  const [fb, setFb] = useState(null);
  const svgRef = useRef(null);
  const startDrag = useDrag(svgRef, v => { if (phase === 1) setDragVal(v); }, phase === 1);

  const checkConv = () => {
    const v1 = parseInt(c1), v2 = parseInt(c2);
    if (isNaN(v1) || isNaN(v2)) { setCfb('err'); return; }
    if (v1 === ex.a && v2 === ex.eqB) { setCfb('ok'); setPhase(1); setDragVal(ex.a); }
    else setCfb('err');
  };
  const checkAns = () => {
    const v = parseInt(answer);
    if (isNaN(v)) { setFb('err'); return; }
    if (v === ex.ans) { setFb('ok'); setPhase(2); setDragVal(ex.ans); }
    else setFb('err');
  };
  const reset = () => { const e = genSub(); setEx(e); setPhase(0); setC1(''); setC2(''); setCfb(null); setDragVal(0); setAnswer(''); setFb(null); };
  const color = phase === 2 ? '#16a34a' : '#0d9488';

  return (
    <div className="content">
      <div className="info">
        <b>{'\u05D7\u05D9\u05E1\u05D5\u05E8 \u05DE\u05E1\u05E4\u05E8 \u05E9\u05D5\u05D5\u05D4 \u05DC\u05D7\u05D9\u05D1\u05D5\u05E8 \u05D4\u05E0\u05D2\u05D3\u05D9 \u05E9\u05DC\u05D5:'}</b><br/>
        <span style={{direction:'ltr',display:'inline-block',fontFamily:'Courier New',fontSize:18}}>a &minus; b = a + (&minus;b)</span>
      </div>

      <div className="card">
        <div className="card-t">{'\u05E9\u05DC\u05D1 \u05D0\u05F3 \u2014 \u05D4\u05DE\u05E8\u05D4 \u05DC\u05D7\u05D9\u05D1\u05D5\u05E8'}</div>
        <div className="eq-box">{fmtS(ex.a)} &minus; {fmtS(ex.b)} = ?</div>
        {phase === 0 ? (<>
          <p style={{textAlign:'center',fontSize:14,marginBottom:10}}>{'\u05D4\u05DE\u05E8 \u05DC\u05D1\u05D9\u05D8\u05D5\u05D9 \u05D7\u05D9\u05D1\u05D5\u05E8 \u05E9\u05E7\u05D5\u05DC:'}</p>
          <div className="eq-box" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:22}}>
            <input style={{width:60}} value={c1} onChange={e=>{setC1(e.target.value);setCfb(null);}}
              onKeyDown={e=>e.key==='Enter'&&checkConv()} placeholder="?" />
            <span>+</span>
            <input style={{width:60}} value={c2} onChange={e=>{setC2(e.target.value);setCfb(null);}}
              onKeyDown={e=>e.key==='Enter'&&checkConv()} placeholder="?" />
          </div>
          <div className="center" style={{marginTop:10}}>
            <button className="btn bg" onClick={checkConv}>{'\u2713'} {'\u05D1\u05D3\u05D5\u05E7'}</button>
          </div>
          {cfb==='err' && <div className="fb err">{'\u2717'} {'\u05DC\u05D0 \u05E0\u05DB\u05D5\u05DF. \u05D6\u05DB\u05D5\u05E8: a \u2212 b = a + (\u2212b)'}</div>}
        </>) : (
          <div className="fb ok" style={{direction:'ltr'}}>
            {'\u2713'} {fmtS(ex.a)} + {fmtS(ex.eqB)}
          </div>
        )}
      </div>

      {phase >= 1 && (
        <div className="card">
          <div className="card-t">{'\u05E9\u05DC\u05D1 \u05D1\u05F3 \u2014 \u05E4\u05EA\u05E8\u05D5\u05DF \u05E2\u05DC \u05E6\u05D9\u05E8 \u05D4\u05DE\u05E1\u05E4\u05E8\u05D9\u05DD'}</div>
          <div className="eq-box" style={{fontSize:22}}>{fmtS(ex.a)} + {fmtS(ex.eqB)} = ?</div>
          <div className="nl-wrap">
            <svg ref={svgRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{maxWidth:'100%',height:'auto',direction:'ltr'}}>
              <NLBase />
              <ArrowVis startVal={ex.a} dragVal={dragVal} color={color} done={phase===2} startDrag={startDrag} />
            </svg>
          </div>
          <AnsRow answer={answer} setAnswer={setAnswer} onCheck={checkAns} done={phase===2} fb={fb} setFb={setFb} />
        </div>
      )}

      {phase === 2 && (
        <div className="banner">
          {'\u2705'} {'\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3!'} &nbsp;
          <span style={{direction:'ltr',display:'inline-block'}}>{fmtS(ex.a)} &minus; {fmtS(ex.b)} = {ex.ans}</span>
          <div style={{marginTop:12}}>
            <button className="btn bg" style={{fontSize:17}} onClick={reset}>
              {'\u05EA\u05E8\u05D2\u05D9\u05DC \u05D7\u05D3\u05E9 \u21BA'}</button>
          </div>
        </div>
      )}
      {phase < 2 && <div className="center" style={{marginTop:8}}>
        <button className="btn bp" onClick={reset}>{'\u05EA\u05E8\u05D2\u05D9\u05DC \u05D7\u05D3\u05E9 \u21BA'}</button>
      </div>}
    </div>
  );
}

/* ═══════ Chapter 3: Multiplication ═══════ */
function Ch3() {
  const [ex, setEx] = useState(() => genMul());
  const [visJumps, setVisJumps] = useState(0);
  const [answer, setAnswer] = useState('');
  const [fb, setFb] = useState(null);
  const [done, setDone] = useState(false);

  const dir = Math.sign(ex.a * ex.b);
  const jSize = Math.abs(ex.a);
  const jCount = Math.abs(ex.b);
  const jumps = [];
  for (let i = 0; i < jCount; i++) jumps.push({ from: i*jSize*dir, to: (i+1)*jSize*dir });

  useEffect(() => {
    if (visJumps < jCount) {
      const t = setTimeout(() => setVisJumps(v => v + 1), 550);
      return () => clearTimeout(t);
    }
  }, [visJumps, jCount]);

  const check = () => {
    const v = parseInt(answer);
    if (isNaN(v)) { setFb('err'); return; }
    if (v === ex.ans) { setFb('ok'); setDone(true); } else setFb('err');
  };
  const reset = () => { const e = genMul(); setEx(e); setVisJumps(0); setAnswer(''); setFb(null); setDone(false); };

  const signA = ex.a >= 0 ? '+' : '\u2212';
  const signB = ex.b >= 0 ? '+' : '\u2212';
  const signR = ex.ans >= 0 ? '+' : '\u2212';
  const ruleIdx = (ex.a >= 0 ? 0 : 2) + (ex.b >= 0 ? 0 : 1);

  const arcColor = done ? '#16a34a' : '#0d9488';

  return (
    <div className="content">
      <div className="card">
        <div className="card-t">{'\u05DB\u05E4\u05DC \u05DE\u05E1\u05E4\u05E8\u05D9\u05DD \u05DE\u05DB\u05D5\u05D5\u05E0\u05D9\u05DD'}</div>
        <p style={{textAlign:'center',fontSize:14,color:'#0d9488',fontWeight:600,marginBottom:6}}>
          {'\u05D7\u05D5\u05E7\u05D9 \u05D4\u05E1\u05D9\u05DE\u05E0\u05D9\u05DD:'}</p>
        <div className="rules-grid">
          {[['(+)\u00B7(+) = (+)',0],['(+)\u00B7(\u2212) = (\u2212)',1],
            ['(\u2212)\u00B7(+) = (\u2212)',2],[`(\u2212)\u00B7(\u2212) = (+)`,3]].map(([txt,idx]) => (
            <div key={idx} className={`rule-item ${ruleIdx===idx?'on':''}`}>{txt}</div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="eq-box">
          {ex.a < 0 ? '('+ex.a+')' : ex.a} {'\u00B7'} {ex.b < 0 ? '('+ex.b+')' : ex.b} = ?
        </div>
        <p style={{textAlign:'center',fontSize:13,color:'#6b7280',marginBottom:4}}>
          {Math.abs(ex.b)} {'\u05E7\u05E4\u05D9\u05E6\u05D5\u05EA'} {'\u05E9\u05DC'} {Math.abs(ex.a)} {'\u05E6\u05E2\u05D3\u05D9\u05DD'} {dir > 0 ? '\u05D9\u05DE\u05D9\u05E0\u05D4' : '\u05E9\u05DE\u05D0\u05DC\u05D4'}
        </p>
        <div className="nl-wrap">
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{maxWidth:'100%',height:'auto',direction:'ltr'}}>
            <NLBase />
            {/* starting dot at 0 */}
            <circle cx={v2x(0)} cy={LY} r="6" fill="#0d9488" />
            {/* jump arcs */}
            {jumps.map((j, i) => {
              if (i >= visJumps) return null;
              const x1 = v2x(j.from), x2 = v2x(j.to);
              const mx = (x1+x2)/2;
              const dy = Math.min(32, Math.abs(x2-x1)*0.4);
              const path = `M ${x1} ${LY-4} Q ${mx} ${LY-4-dy} ${x2} ${LY-4}`;
              return (
                <g key={i}>
                  <path d={path} stroke={arcColor} strokeWidth="2.5" fill="none" />
                  <circle cx={x2} cy={LY-4} r="3" fill={arcColor} />
                  <text x={mx} y={LY-8-dy} textAnchor="middle" fontSize="11" fill={arcColor} fontWeight="600">{i+1}</text>
                </g>
              );
            })}
            {/* end value label */}
            {visJumps === jCount && (
              <text x={v2x(ex.ans)} y={LY+38} textAnchor="middle" fontSize="13" fontWeight="700"
                fill={arcColor}>{ex.ans}</text>
            )}
          </svg>
        </div>

        {visJumps === jCount && (
          <AnsRow answer={answer} setAnswer={setAnswer} onCheck={check} done={done} fb={fb} setFb={setFb} />
        )}
        {visJumps < jCount && (
          <p style={{textAlign:'center',fontSize:14,color:'#6b7280'}}>{'\u05DE\u05E6\u05D9\u05D2 \u05E7\u05E4\u05D9\u05E6\u05D5\u05EA...'}</p>
        )}
      </div>

      {done && (
        <div className="banner">
          {'\u2705'} {'\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3!'} &nbsp;
          <span style={{direction:'ltr',display:'inline-block'}}>
            {ex.a < 0 ? '('+ex.a+')' : ex.a} {'\u00B7'} {ex.b < 0 ? '('+ex.b+')' : ex.b} = {ex.ans}
          </span>
          <div style={{marginTop:12}}>
            <button className="btn bg" style={{fontSize:17}} onClick={reset}>
              {'\u05EA\u05E8\u05D2\u05D9\u05DC \u05D7\u05D3\u05E9 \u21BA'}</button>
          </div>
        </div>
      )}
      {!done && <div className="center" style={{marginTop:8}}>
        <button className="btn bp" onClick={reset}>{'\u05EA\u05E8\u05D2\u05D9\u05DC \u05D7\u05D3\u05E9 \u21BA'}</button>
      </div>}
    </div>
  );
}

/* ═══════ Chapter 4: Division ═══════ */
function Ch4() {
  const [ex, setEx] = useState(() => genDiv());
  const [answer, setAnswer] = useState('');
  const [fb, setFb] = useState(null);
  const [done, setDone] = useState(false);

  const check = () => {
    const v = parseInt(answer);
    if (isNaN(v)) { setFb('err'); return; }
    if (v === ex.ans) { setFb('ok'); setDone(true); } else setFb('err');
  };
  const reset = () => { const e = genDiv(); setEx(e); setAnswer(''); setFb(null); setDone(false); };
  const ruleIdx = (ex.a >= 0 ? 0 : 2) + (ex.b >= 0 ? 0 : 1);

  return (
    <div className="content">
      <div className="card">
        <div className="card-t">{'\u05D7\u05D9\u05DC\u05D5\u05E7 \u05DE\u05E1\u05E4\u05E8\u05D9\u05DD \u05DE\u05DB\u05D5\u05D5\u05E0\u05D9\u05DD'}</div>
        <p style={{textAlign:'center',fontSize:14,color:'#0d9488',fontWeight:600,marginBottom:6}}>
          {'\u05D7\u05D5\u05E7\u05D9 \u05D4\u05E1\u05D9\u05DE\u05E0\u05D9\u05DD:'}</p>
        <div className="rules-grid">
          {[['(+)\u00F7(+) = (+)',0],['(+)\u00F7(\u2212) = (\u2212)',1],
            ['(\u2212)\u00F7(+) = (\u2212)',2],['(\u2212)\u00F7(\u2212) = (+)',3]].map(([txt,idx]) => (
            <div key={idx} className={`rule-item ${ruleIdx===idx?'on':''}`}>{txt}</div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="eq-box">
          {ex.a < 0 ? '('+ex.a+')' : ex.a} {'\u00F7'} {ex.b < 0 ? '('+ex.b+')' : ex.b} = ?
        </div>
        {ex.style === 'ruler' && (
          <p style={{textAlign:'center',fontSize:13,color:'#6b7280',marginBottom:4}}>
            {'\u05D4\u05DE\u05E8\u05D7\u05E7'} {Math.abs(ex.a)} {'\u05DE\u05EA\u05D7\u05DC\u05E7 \u05DC\u05E7\u05D1\u05D5\u05E6\u05D5\u05EA \u05E9\u05D5\u05D5\u05EA \u05D1\u05D0\u05D5\u05E8\u05DA'} {Math.abs(ex.b)} {'\u2014 \u05DB\u05DE\u05D4 \u05E7\u05D1\u05D5\u05E6\u05D5\u05EA?'}
          </p>
        )}
        <div className="nl-wrap">
          {ex.style === 'ruler' ? <DivRuler ex={ex}/> : <DivPackages ex={ex}/>}
        </div>

        <AnsRow answer={answer} setAnswer={setAnswer} onCheck={check} done={done} fb={fb} setFb={setFb} />
      </div>

      {done && (
        <div className="banner">
          {'\u2705'} {'\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3!'} &nbsp;
          <span style={{direction:'ltr',display:'inline-block'}}>
            {ex.a < 0 ? '('+ex.a+')' : ex.a} {'\u00F7'} {ex.b < 0 ? '('+ex.b+')' : ex.b} = {ex.ans}
          </span>
          <div style={{marginTop:12}}>
            <button className="btn bg" style={{fontSize:17}} onClick={reset}>
              {'\u05EA\u05E8\u05D2\u05D9\u05DC \u05D7\u05D3\u05E9 \u21BA'}</button>
          </div>
        </div>
      )}
      {!done && <div className="center" style={{marginTop:8}}>
        <button className="btn bp" onClick={reset}>{'\u05EA\u05E8\u05D2\u05D9\u05DC \u05D7\u05D3\u05E9 \u21BA'}</button>
      </div>}
    </div>
  );
}

/* ═══════ Order-of-operations helpers ═══════ */
function divisorsOf(n) {
  n = Math.abs(n);
  const out = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d);
  return out;
}
function randNonZero(a, b) {
  let v;
  do { v = randInt(a, b); } while (v === 0);
  return v;
}
function genOrderEx() {
  const opsPool = ['+', '-', '×', '÷'];
  const ops = [pick(opsPool), pick(opsPool), pick(opsPool)];
  const nums = [randInt(1, 9), randInt(1, 9), randInt(1, 9), randInt(1, 9)];
  const withParens = Math.random() < 0.35;
  function rankOps(indices) {
    const high = indices.filter(i => ops[i] === '×' || ops[i] === '÷');
    const low = indices.filter(i => ops[i] === '+' || ops[i] === '-');
    const order = [...high, ...low];
    const map = {};
    order.forEach((idx, step) => { map[idx] = step + 1; });
    return map;
  }
  let stepMap;
  if (withParens) {
    const outer = rankOps([1, 2]);
    stepMap = { 0: 1, 1: outer[1] + 1, 2: outer[2] + 1 };
  } else {
    stepMap = rankOps([0, 1, 2]);
  }
  return { nums, ops, withParens, stepMap };
}

/* ═══════ Chapter 5: Order of Operations ═══════ */
function OpMarkBtn({ op, step, onClick, disabled }) {
  return (
    <button className={`op-mark-btn ${step ? 'marked' : ''}`} onClick={onClick} disabled={disabled}>
      {op}
      {step && <span className="op-step-badge">{step}</span>}
    </button>
  );
}
function Ch5() {
  const [ex, setEx] = useState(() => genOrderEx());
  const [marked, setMarked] = useState({});
  const [fb, setFb] = useState(null);
  const [done, setDone] = useState(false);
  const markedCount = Object.keys(marked).length;

  const clickOp = (idx) => {
    if (done || marked[idx] != null || markedCount >= 3) return;
    setMarked(m => ({ ...m, [idx]: markedCount + 1 }));
    setFb(null);
  };
  const clearMarks = () => { setMarked({}); setFb(null); };
  const check = () => {
    if (markedCount < 3) return;
    const ok = ex.stepMap[0] === marked[0] && ex.stepMap[1] === marked[1] && ex.stepMap[2] === marked[2];
    if (ok) { setFb('ok'); setDone(true); } else setFb('err');
  };
  const reset = () => { setEx(genOrderEx()); setMarked({}); setFb(null); setDone(false); };

  return (
    <div className="content">
      <div className="info">
        <b>סדר פעולות חשבון:</b><br/>
        1. סוגריים — תמיד מבוצעים ראשונים<br/>
        2. כפל וחילוק — משמאל לימין (מה שמופיע ראשון משמאל מבוצע קודם)<br/>
        3. חיבור וחיסור — משמאל לימין (מה שמופיע ראשון משמאל מבוצע קודם)
      </div>

      <div className="card">
        <div className="card-t">סמנו את סדר ביצוע הפעולות (בלי לחשב!)</div>
        <div className="expr-row">
          {ex.withParens && <span className="paren-mark">(</span>}
          <span>{ex.nums[0]}</span>
          <OpMarkBtn op={ex.ops[0]} step={marked[0]} onClick={() => clickOp(0)} disabled={done}/>
          <span>{ex.nums[1]}</span>
          {ex.withParens && <span className="paren-mark">)</span>}
          <OpMarkBtn op={ex.ops[1]} step={marked[1]} onClick={() => clickOp(1)} disabled={done}/>
          <span>{ex.nums[2]}</span>
          <OpMarkBtn op={ex.ops[2]} step={marked[2]} onClick={() => clickOp(2)} disabled={done}/>
          <span>{ex.nums[3]}</span>
        </div>
        <p style={{textAlign:'center',fontSize:13,color:'#6b7280'}}>לחצו על הפעולות לפי סדר הביצוע שלהן (1, 2, 3)</p>
        <div className="center" style={{marginTop:10,display:'flex',gap:10,justifyContent:'center'}}>
          <button className="btn" style={{background:'#f1f5f9',color:'#374151'}} onClick={clearMarks} disabled={done}>נקה</button>
          <button className="btn bg" onClick={check} disabled={done || markedCount < 3}>{'✓'} בדוק</button>
        </div>
        {fb === 'err' && <div className="fb err">{'✗'} לא נכון, נסו שוב.</div>}
      </div>

      {done && (
        <div className="banner">
          {'✅'} כל הכבוד!
          <div style={{marginTop:12}}>
            <button className="btn bg" style={{fontSize:17}} onClick={reset}>תרגיל חדש {'↺'}</button>
          </div>
        </div>
      )}
      {!done && <div className="center" style={{marginTop:8}}>
        <button className="btn bp" onClick={reset}>תרגיל חדש {'↺'}</button>
      </div>}
    </div>
  );
}

/* ═══════ Chapter 6: Combined practice ═══════ */
function genCombo() {
  const templates = [
    () => { // a + b×c − d÷e
      const e = randInt(2,9), k1 = randNonZero(-9,9), d = k1*e;
      const c = randInt(2,9), b = randNonZero(-9,9);
      const a = randInt(-15,15);
      return { tokens:[a,'+',b,'×',c,'−',d,'÷',e], result: a + b*c - k1 };
    },
    () => { // a×b − c÷d + e
      const d = randInt(2,9), k2 = randNonZero(-9,9), c = k2*d;
      const b = randInt(2,9), a = randNonZero(-9,9);
      const e = randInt(-15,15);
      return { tokens:[a,'×',b,'−',c,'÷',d,'+',e], result: a*b - k2 + e };
    },
    () => { // (a + b) × c − d÷e
      const e = randInt(2,9), k1 = randNonZero(-9,9), d = k1*e;
      const c = randInt(2,9);
      const a = randInt(-9,9), b = randInt(-9,9);
      const s = a+b;
      return { tokens:['(',a,'+',b,')','×',c,'−',d,'÷',e], result: s*c - k1 };
    },
    () => { // a÷b + (c − d) × e
      const b = randInt(2,9), k1 = randNonZero(-9,9), a = k1*b;
      const c = randInt(-9,9), d = randInt(-9,9);
      const e = randInt(2,9);
      const diff = c-d;
      return { tokens:[a,'÷',b,'+','(',c,'−',d,')','×',e], result: k1 + diff*e };
    },
    () => { // a×b÷c + d − e
      const c = randInt(2,9), m = randNonZero(-9,9), b = c*m;
      const a = randNonZero(-9,9);
      const d = randInt(-15,15), e = randInt(-15,15);
      return { tokens:[a,'×',b,'÷',c,'+',d,'−',e], result: a*m + d - e };
    },
    () => { // a + b÷c − d×e
      const c = randInt(2,9), k1 = randNonZero(-9,9), b = k1*c;
      const d = randNonZero(-9,9), e = randNonZero(-9,9);
      const a = randInt(-15,15);
      return { tokens:[a,'+',b,'÷',c,'−',d,'×',e], result: a + k1 - d*e };
    },
  ];
  return pick(templates)();
}

/* Find the single next operation to perform under standard precedence (parens first,
   then ×÷ left-to-right, then +− left-to-right), within a flat token array that has
   at most one (unnested) parenthesized group. */
function reduceStep(tokens) {
  const lp = tokens.indexOf('(');
  let scopeStart, scopeEnd;
  if (lp !== -1) {
    const rp = tokens.indexOf(')', lp);
    scopeStart = lp + 1; scopeEnd = rp - 1;
  } else {
    scopeStart = 0; scopeEnd = tokens.length - 1;
  }
  const opPositions = [];
  for (let i = scopeStart + 1; i <= scopeEnd - 1; i += 2) opPositions.push(i);
  let chosen = opPositions.find(i => tokens[i] === '×' || tokens[i] === '÷');
  if (chosen === undefined) chosen = opPositions[0];
  const leftPos = chosen - 1, rightPos = chosen + 1;
  return { opPos: chosen, leftPos, rightPos, opSymbol: tokens[chosen], leftVal: tokens[leftPos], rightVal: tokens[rightPos] };
}
function applyArith(a, op, b) {
  if (op === '+') return a + b;
  if (op === '-' || op === '−') return a - b;
  if (op === '×') return a * b;
  return a / b;
}
function collapseTokens(tokens, leftPos, rightPos, result) {
  const nt = [...tokens.slice(0, leftPos), result, ...tokens.slice(rightPos + 1)];
  if (nt[leftPos - 1] === '(' && nt[leftPos + 1] === ')') {
    nt.splice(leftPos + 1, 1);
    nt.splice(leftPos - 1, 1);
  }
  return nt;
}
function Ch6() {
  const [ex, setEx] = useState(() => genCombo());
  const [tokens, setTokens] = useState(() => ex.tokens);
  const [phase, setPhase] = useState('mark'); // 'mark' | 'compute' | 'done'
  const [active, setActive] = useState(null);
  const [markFb, setMarkFb] = useState(null);
  const [computeVal, setComputeVal] = useState('');
  const [computeFb, setComputeFb] = useState(null);
  const [history, setHistory] = useState([]);

  const reset = () => {
    const e = genCombo();
    setEx(e); setTokens(e.tokens); setPhase('mark'); setActive(null);
    setMarkFb(null); setComputeVal(''); setComputeFb(null); setHistory([]);
  };

  const clickOp = (pos) => {
    if (phase !== 'mark') return;
    const step = reduceStep(tokens);
    if (pos === step.opPos) { setActive(step); setPhase('compute'); setMarkFb(null); }
    else setMarkFb('err');
  };
  const checkCompute = () => {
    const v = parseInt(computeVal);
    if (isNaN(v)) { setComputeFb('err'); return; }
    const correct = applyArith(active.leftVal, active.opSymbol, active.rightVal);
    if (v === correct) {
      const nt = collapseTokens(tokens, active.leftPos, active.rightPos, correct);
      setHistory(h => [...h, { left: active.leftVal, op: active.opSymbol, right: active.rightVal, result: correct }]);
      setTokens(nt);
      setComputeVal(''); setComputeFb(null); setActive(null);
      setPhase(nt.length === 1 ? 'done' : 'mark');
    } else setComputeFb('err');
  };

  return (
    <div className="content">
      <div className="info">
        <b>תרגול מקיף — סדר פעולות חשבון</b><br/>
        פתרו שלב אחר שלב: בכל פעם סמנו את הפעולה הבאה שיש לבצע, חשבו אותה, וכך עד לתשובה הסופית.
      </div>

      {history.map((h,i) => (
        <div key={i} className="fb ok" style={{direction:'ltr',marginBottom:8}}>
          {'✓'} {h.left} {h.op} {h.right} = {h.result}
        </div>
      ))}

      <div className="card">
        <div className="card-t">{phase === 'mark' ? 'סמנו את הפעולה הבאה שיש לבצע' : phase === 'compute' ? 'חשבו את הפעולה המסומנת' : 'סיימתם!'}</div>
        <div className="eq-box">
          {tokens.map((t,i) => {
            if (t === '(' || t === ')') return <span key={i}>{t}</span>;
            if (typeof t === 'number') return <span key={i}>{t}</span>;
            return (
              <button key={i} className={`op-mark-btn ${active && active.opPos===i ? 'marked' : ''}`}
                disabled={phase !== 'mark'} onClick={() => clickOp(i)} style={{fontSize:24,margin:'0 4px',verticalAlign:'middle'}}>
                {t}
              </button>
            );
          })}
          {phase !== 'done' && <span>&nbsp;=&nbsp;?</span>}
        </div>
        {markFb === 'err' && <div className="fb err">{'✗'} זו לא הפעולה הבאה לפי סדר הפעולות. נסו שוב.</div>}

        {phase === 'compute' && (
          <div className="ans-row">
            <span style={{fontSize:18,direction:'ltr'}}>{active.leftVal} {active.opSymbol} {active.rightVal} =</span>
            <input style={{width:70}} value={computeVal}
              onChange={e => { setComputeVal(e.target.value); setComputeFb(null); }}
              onKeyDown={e => e.key === 'Enter' && checkCompute()} autoFocus/>
            <button className="btn bg" onClick={checkCompute}>{'✓'} בדוק</button>
          </div>
        )}
        {computeFb === 'err' && <div className="fb err">{'✗'} לא נכון, נסו שוב.</div>}
      </div>

      {phase === 'done' && (
        <div className="banner">
          {'✅'} כל הכבוד! <span style={{direction:'ltr',display:'inline-block'}}>= {tokens[0]}</span>
          <div style={{marginTop:12}}>
            <button className="btn bg" style={{fontSize:17}} onClick={reset}>תרגיל חדש {'↺'}</button>
          </div>
        </div>
      )}
      {phase !== 'done' && <div className="center" style={{marginTop:8}}>
        <button className="btn bp" onClick={reset}>תרגיל חדש {'↺'}</button>
      </div>}
    </div>
  );
}

/* ═══════ Main App ═══════ */
function App() {
  const [ch, setCh] = useState(1);
  const labels = [
    '\u05D7\u05D9\u05D1\u05D5\u05E8',
    '\u05D7\u05D9\u05E1\u05D5\u05E8',
    '\u05DB\u05E4\u05DC',
    '\u05D7\u05D9\u05DC\u05D5\u05E7',
    '\u05E1\u05D3\u05E8 \u05E4\u05E2\u05D5\u05DC\u05D5\u05EA',
    '\u05EA\u05E8\u05D2\u05D5\u05DC \u05DE\u05E7\u05D9\u05E3'
  ];
  return (
    <div>
      <div className="hdr">
        <div className="hdr-title">{'\u05DE\u05E1\u05E4\u05E8\u05D9\u05DD \u05DE\u05DB\u05D5\u05D5\u05E0\u05D9\u05DD'}</div>
        <div className="ch-btns">
          {labels.map((l, i) => (
            <button key={i} className={`ch-btn ${ch===i+1?'active':''}`}
              onClick={() => setCh(i+1)}>{i+1}. {l}</button>
          ))}
        </div>
      </div>
      {ch===1 ? <Ch1 key="c1"/> : ch===2 ? <Ch2 key="c2"/> : ch===3 ? <Ch3 key="c3"/> : ch===4 ? <Ch4 key="c4"/> : ch===5 ? <Ch5 key="c5"/> : <Ch6 key="c6"/>}
    </div>
  );
}


// ===== END ORIGINAL =====
export default App;
