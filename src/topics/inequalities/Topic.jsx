'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/inequalities.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const {useState,useEffect,useRef} = React;

/* ---------- generic helpers ---------- */
function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
const SIGNS=['<','>','≤','≥'];
function flipSign(s){return {'<':'>','>':'<','≤':'≥','≥':'≤'}[s];}
function dirOfSign(s){return (s==='>'||s==='≥')?'right':'left';}
function closedOfSign(s){return (s==='≥'||s==='≤');}
function signFromDirClosed(dir,closed){
  if(dir==='right') return closed?'≥':'>';
  return closed?'≤':'<';
}
function parseIntList(text){const m=text.match(/-?\d+/g);return m?m.map(Number):[];}
function sameSet(a,b){
  const A=[...new Set(a)].sort((x,y)=>x-y);
  const B=[...new Set(b)].sort((x,y)=>x-y);
  return A.length===B.length && A.every((v,i)=>v===B[i]);
}
function integersInRange(lo,closedLo,hi,closedHi){
  const start=closedLo?lo:lo+1, end=closedHi?hi:hi-1;
  const out=[]; for(let i=start;i<=end;i++) out.push(i);
  return out;
}
function Fb({ok}){
  return <div className={`fb ${ok?'ok':'err'}`}>{ok?'✓ נכון!':'✗ לא נכון, נסו שוב'}</div>;
}

/* ---------- inequality term / solver logic ---------- */
function ieqMkTerm(type,coef){return {id:Math.random().toString(36).slice(2),type,coef};}
function ieqNegTerm(t){return {...t,coef:-t.coef};}
function ieqDoMove(state,side,id){
  const from = side==='left'?state.left:state.right;
  const to   = side==='left'?state.right:state.left;
  const term = from.find(t=>t.id===id);
  if(!term) return state;
  const newFrom = from.filter(t=>t.id!==id);
  const newTo   = [...to, ieqNegTerm(term)];
  return side==='left' ? {...state,left:newFrom,right:newTo} : {...state,left:newTo,right:newFrom};
}
function ieqDoSimplify(state){
  function combine(terms){
    let x=0,c=0;
    terms.forEach(t=>{ if(t.type==='x') x+=t.coef; else c+=t.coef; });
    const out=[];
    if(x!==0) out.push(ieqMkTerm('x',x));
    if(c!==0 || out.length===0) out.push(ieqMkTerm('const',c));
    return out;
  }
  return {...state,left:combine(state.left),right:combine(state.right)};
}
function ieqDoDivide(state,k){
  const all=[...state.left,...state.right];
  if(k===0 || all.some(t=>t.coef%k!==0)) return {ok:false};
  const div=terms=>terms.map(t=>ieqMkTerm(t.type,t.coef/k));
  let sign=state.sign;
  if(k<0) sign=flipSign(sign);
  return {ok:true,state:{...state,left:div(state.left),right:div(state.right),sign}};
}
function ieqCheckSolved(state){
  const {left,right,sign}=state;
  const isX1=arr=>arr.length===1 && arr[0].type==='x' && arr[0].coef===1;
  const isBareConst=arr=>arr.length===0 || (arr.length===1 && arr[0].type==='const');
  const constVal=arr=>arr.length===0?0:arr[0].coef;
  if(isX1(left) && isBareConst(right)) return {sign,value:constVal(right)};
  if(isX1(right) && isBareConst(left)) return {sign:flipSign(sign),value:constVal(left)};
  return null;
}
function makeIneqForSolution(v,sign){
  const a=randInt(2,5);
  const b=randInt(-10,10);
  const c=a*v+b;
  return {a,b,c,sign,v};
}
function fmtLinear(a,b){
  let s = a===1?'x':(a+'x');
  if(b>0) s+=' + '+b; else if(b<0) s+=' - '+Math.abs(b);
  return s;
}
function ineqText(a,b,c,sign){ return `${fmtLinear(a,b)}  ${sign}  ${c}`; }

/* ---------- drag-based term pill ---------- */
const LP=400;
function IeqTermPill({term,side,onMove,onDivideRequest}){
  const [grabbed,setGrabbed]=useState(false);
  const [ghost,setGhost]=useState(null);
  function label(t){
    if(t.type==='const') return String(t.coef);
    if(t.coef===1) return 'x';
    if(t.coef===-1) return '-x';
    return t.coef+'x';
  }
  function onPointerDown(e){
    e.stopPropagation();
    const startX=e.clientX, startY=e.clientY;
    let longPressed=false, moved=false;
    const timer=setTimeout(()=>{ longPressed=true; setGrabbed(true); setGhost({x:startX,y:startY}); },LP);
    function move(ev){
      const dx=ev.clientX-startX, dy=ev.clientY-startY;
      if(Math.abs(dx)>6||Math.abs(dy)>6) moved=true;
      if(longPressed) setGhost({x:ev.clientX,y:ev.clientY});
    }
    function up(ev){
      clearTimeout(timer);
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
      if(longPressed){
        setGrabbed(false); setGhost(null);
        const el=document.elementFromPoint(ev.clientX,ev.clientY);
        const zone=el && el.closest('[data-zone]');
        if(zone){
          const targetSide=zone.getAttribute('data-zone');
          if(targetSide!==side) onMove(side,term.id);
        }
      } else if(!moved){
        if(term.type==='x' && Math.abs(term.coef)!==1) onDivideRequest(term.coef);
      }
    }
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
  }
  return <>
    <span className={`ieq-pill ${grabbed?'ieq-grabbed':''}`} onPointerDown={onPointerDown}>{label(term)}</span>
    {ghost && ReactDOM.createPortal(
      <span className="ieq-ghost" style={{left:ghost.x,top:ghost.y}}>{label(term)}</span>,
      document.body
    )}
  </>;
}

function SolvedConfirm({sign,value,onCorrect}){
  const [txt,setTxt]=useState('');
  const [fb,setFb]=useState(null);
  function check(){
    const n=parseInt(txt,10);
    if(!isNaN(n) && n===value){ setFb('ok'); setTimeout(onCorrect,450); }
    else setFb('err');
  }
  return <div className="ans-row" style={{direction:'ltr'}}>
    <span style={{fontSize:'1.3rem',fontWeight:700,color:'#831843'}}>x {sign}</span>
    <input value={txt} onChange={e=>{setTxt(e.target.value);setFb(null);}} style={{width:70}}/>
    <button className="btn bp" onClick={check}>✓ בדוק</button>
    {fb==='err' && <Fb ok={false}/>}
    {fb==='ok' && <Fb ok={true}/>}
  </div>;
}

// Solve like an equation: write an operation on both sides, then simplify. Each line stays on screen.
function iqTerms(terms){
  const parts=[];
  terms.forEach((t,i)=>{
    if(t.coef===0 && terms.length>1) return;
    const abs=Math.abs(t.coef);
    const body=t.type==='x'?(abs===1?'x':abs+'x'):String(abs);
    if(parts.length===0) parts.push((t.coef<0?'−':'')+body);
    else parts.push((t.coef<0?' − ':' + ')+body);
  });
  return parts.join('')||'0';
}
const IQ_OPS={'+':'+','-':'−','*':'·','/':'÷'};
function iqWithOp(terms,o,n){
  const side=iqTerms(terms);
  const num=n<0?'('+'−'+Math.abs(n)+')':String(n);
  const wrap=(o==='*'||o==='/')&&terms.filter(t=>t.coef!==0).length>1?'('+side+')':side;
  return wrap+' '+IQ_OPS[o]+' '+num;
}
function IeqSolver({a,b,c,sign,onSolved}){
  const [state,setState]=useState(()=>({left:[ieqMkTerm('x',a),ieqMkTerm('const',b)],right:[ieqMkTerm('const',c)],sign}));
  const [hist,setHist]=useState([]);
  const [pending,setPending]=useState(null);
  const [opSym,setOpSym]=useState('-');
  const [opNum,setOpNum]=useState('');
  const [err,setErr]=useState(null);
  const [note,setNote]=useState(null);
  const [solvedInfo,setSolvedInfo]=useState(null);
  const [confirmed,setConfirmed]=useState(false);

  useEffect(()=>{
    if(confirmed) return;
    setSolvedInfo(pending?null:ieqCheckSolved(state));
  },[state,pending]);

  function applyOp(){
    const n=parseInt(String(opNum).replace('−','-'),10);
    if(isNaN(n)){ setErr('כתבו מספר'); return; }
    if((opSym==='*'||opSym==='/')&&n===0){ setErr(opSym==='/'?'אי אפשר לחלק ב-0':'כפל ב-0 מוחק את כל האי-שוויון'); return; }
    if((opSym==='+'||opSym==='-')&&n===0){ setErr('הוספה או חיסור של 0 לא משנים כלום'); return; }
    if(opSym==='/'&&[...state.left,...state.right].some(t=>t.coef%n!==0)){ setErr('לא כל האיברים מתחלקים ב-'+n+'. נסו פעולה אחרת קודם.'); return; }
    setErr(null); setNote(null); setPending({o:opSym,n});
  }
  function simplify(){
    const {o,n}=pending;
    const line=`${iqWithOp(state.left,o,n)}  ${state.sign}  ${iqWithOp(state.right,o,n)}`;
    let next;
    if(o==='+'||o==='-'){
      const k=o==='+'?n:-n;
      next=ieqDoSimplify({...state,left:[...state.left,ieqMkTerm('const',k)],right:[...state.right,ieqMkTerm('const',k)]});
    } else {
      const f=t=>ieqMkTerm(t.type,o==='*'?t.coef*n:t.coef/n);
      const flip=n<0;
      next=ieqDoSimplify({...state,left:state.left.map(f),right:state.right.map(f),sign:flip?flipSign(state.sign):state.sign});
      if(flip) setNote((o==='*'?'כפלנו':'חילקנו')+' במספר שלילי, ולכן סימן אי-השוויון התהפך: '+state.sign+' ← '+next.sign);
    }
    setHist(h=>[...h,line]);
    setState(next); setPending(null); setOpNum('');
  }
  function undo(){
    if(pending){ setPending(null); return; }
  }
  const cur=`${iqTerms(state.left)}  ${state.sign}  ${iqTerms(state.right)}`;
  return <div className="ieq-solver iq">
    <div className="iq-lines" dir="ltr">
      {hist.map((l,i)=><div key={i} className="iq-line old">{l}</div>)}
      {pending
        ? <div className="iq-line cur">{iqWithOp(state.left,pending.o,pending.n)}  {state.sign}  {iqWithOp(state.right,pending.o,pending.n)}</div>
        : <div className="iq-line cur">{cur}</div>}
    </div>
    {note && <div className="iq-note">{note}</div>}
    {!solvedInfo && !pending && <div className="iq-op">
      <div className="iq-op-t">איזו פעולה עושים על שני האגפים?</div>
      <div className="iq-op-row" dir="ltr">
        {Object.keys(IQ_OPS).map(k=><button key={k} className={`iq-sym${opSym===k?' on':''}`} onClick={()=>{setOpSym(k);setErr(null);}} aria-label={{'+':'חיבור','-':'חיסור','*':'כפל','/':'חילוק'}[k]}>{IQ_OPS[k]}</button>)}
        <input className="iq-num" value={opNum} onChange={e=>{setOpNum(e.target.value);setErr(null);}} onKeyDown={e=>e.key==='Enter'&&applyOp()} placeholder="מספר" inputMode="numeric"/>
        <button className="btn bp" onClick={applyOp}>החל על שני האגפים</button>
      </div>
    </div>}
    {pending && <div className="iq-act">
      <button className="btn bp" onClick={simplify}>פשט ⟵</button>
      <button className="btn" onClick={undo}>ביטול הפעולה</button>
    </div>}
    {err && <div className="ieq-div-err">{err}</div>}
    {!solvedInfo && <div className="hint">כמו במשוואה: בוחרים פעולה (למשל − 4 או ÷ 3), היא נכתבת על שני האגפים, ולוחצים ״פשט״. כפל או חילוק במספר שלילי הופכים את הסימן.</div>}
    {solvedInfo && !confirmed && <SolvedConfirm sign={solvedInfo.sign} value={solvedInfo.value} onCorrect={()=>{setConfirmed(true); onSolved(solvedInfo.sign,solvedInfo.value);}}/>}
    {confirmed && solvedInfo && <div className="iq-done" dir="ltr">x {solvedInfo.sign} {solvedInfo.value} ✓</div>}
  </div>;
}

/* ---------- number line ---------- */
function xOf(v){ return 20+(v+15)*20; }
function valueFromX(x){
  let v=Math.round((x-20)/20)-15;
  return Math.max(-15,Math.min(15,v));
}
function svgXFromEvent(svgEl,evt){
  const rect=svgEl.getBoundingClientRect();
  const scaleX=640/rect.width;
  return (evt.clientX-rect.left)*scaleX;
}
function Axis(){
  const ticks=[];
  for(let v=-15;v<=15;v++){
    const x=xOf(v);
    const isMajor=v%5===0;
    const isZero=v===0;
    ticks.push(<g key={v}>
      <line x1={x} y1={50} x2={x} y2={50+(isMajor?10:5)} stroke={isZero?'#111':'#94a3b8'} strokeWidth={isZero?2.5:1.5}/>
      {isMajor && <text x={x} y={75} textAnchor="middle" fontSize="11" fill="#334155">{v}</text>}
    </g>);
  }
  return <g><line x1={20} y1={50} x2={620} y2={50} stroke="#334155" strokeWidth={2}/>{ticks}</g>;
}
function SegmentShape({seg}){
  const c=seg.color||'#db2777';
  if(seg.type==='point'){
    return <circle cx={xOf(seg.value)} cy={38} r={6} fill={c} stroke={c} strokeWidth={2}/>;
  }
  if(seg.type==='ray'){
    const x1=xOf(seg.value), x2=seg.dir==='right'?xOf(15):xOf(-15);
    return <g>
      <line x1={x1} y1={38} x2={x2} y2={38} stroke={c} strokeWidth={6} strokeLinecap="round"/>
      <circle cx={x1} cy={38} r={6} fill={seg.closed?c:'#fff'} stroke={c} strokeWidth={2.5}/>
    </g>;
  }
  if(seg.type==='interval'){
    const xa=xOf(seg.a), xb=xOf(seg.b);
    return <g>
      <line x1={xa} y1={38} x2={xb} y2={38} stroke={c} strokeWidth={6} strokeLinecap="round"/>
      <circle cx={xa} cy={38} r={6} fill={seg.closedA?c:'#fff'} stroke={c} strokeWidth={2.5}/>
      <circle cx={xb} cy={38} r={6} fill={seg.closedB?c:'#fff'} stroke={c} strokeWidth={2.5}/>
    </g>;
  }
  return null;
}
function NumberLineStatic({segments}){
  return <div className="nl-wrap"><svg className="nl-svg" viewBox="0 0 640 90">
    <Axis/>
    {segments.map((s,i)=><SegmentShape key={i} seg={s}/>)}
  </svg></div>;
}

function RayMarker({expected,color,onCorrect,staticSegments}){
  const svgRef=useRef(null);
  const [value,setValue]=useState(null);
  const [closed,setClosed]=useState(false);
  const [dir,setDir]=useState(null);
  const [fb,setFb]=useState(null);

  function handleClick(e){
    const x=svgXFromEvent(svgRef.current,e);
    const v=valueFromX(x);
    setValue(v); setDir(null); setFb(null);
  }
  function handlePointerDown(e){
    e.stopPropagation();
    if(value==null) return;
    const startX=e.clientX;
    function move(ev){
      const dx=ev.clientX-startX;
      if(Math.abs(dx)>6) setDir(dx>0?'right':'left');
    }
    function up(){
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
    }
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
  }
  function check(){
    if(value==null || dir==null){ setFb('err'); return; }
    const ok = value===expected.value && closed===expected.closed && dir===expected.dir;
    if(ok){ setFb('ok'); setTimeout(onCorrect,450); } else setFb('err');
  }
  const preview = value!=null ? {type:'ray',value,closed,dir:dir||'right',color:color||'#db2777'} : null;
  return <div>
    <div className="nl-wrap"><svg ref={svgRef} className="nl-svg" viewBox="0 0 640 90">
      <Axis/>
      {(staticSegments||[]).map((s,i)=><SegmentShape key={'s'+i} seg={s}/>)}
      {preview && dir && <SegmentShape seg={preview}/>}
      {value!=null && !dir && <circle cx={xOf(value)} cy={38} r={6} fill={closed?(color||'#db2777'):'#fff'} stroke={color||'#db2777'} strokeWidth={2.5}/>}
      <rect x="0" y="20" width="640" height="40" fill="transparent" onClick={handleClick} style={{cursor:'pointer'}}/>
      {value!=null && <circle cx={xOf(value)} cy={38} r={11} fill="transparent" stroke="transparent" onPointerDown={handlePointerDown} style={{cursor:'ew-resize'}}/>}
    </svg></div>
    <div className="nl-controls">
      <span className="hint" style={{margin:0}}>סוג נקודה:</span>
      <button className={`nl-toggle ${!closed?'active':''}`} onClick={()=>setClosed(false)}>○</button>
      <button className={`nl-toggle ${closed?'active':''}`} onClick={()=>setClosed(true)}>●</button>
    </div>
    <div className="hint" style={{textAlign:'center'}}>לחצו על הציר למיקום הנקודה, ואז גררו ממנה ימינה או שמאלה לבחירת כיוון הצביעה.</div>
    <div style={{textAlign:'center'}}><button className="btn bp" onClick={check}>✓ בדוק</button></div>
    {fb==='err' && <Fb ok={false}/>}
    {fb==='ok' && <Fb ok={true}/>}
  </div>;
}

function BoundaryPointsMarker({expectedPoints,color,onCorrect,staticSegments}){
  const svgRef=useRef(null);
  const [points,setPoints]=useState([]);
  const [fb,setFb]=useState(null);
  const n=expectedPoints.length;
  function handleClick(e){
    if(points.length>=n) return;
    const x=svgXFromEvent(svgRef.current,e);
    const v=valueFromX(x);
    setPoints(p=>[...p,{value:v,closed:false}]);
    setFb(null);
  }
  function toggleClosed(idx){
    setPoints(p=>p.map((pt,i)=>i===idx?{...pt,closed:!pt.closed}:pt));
  }
  function clear(){ setPoints([]); setFb(null); }
  function check(){
    if(points.length<n){ setFb('err'); return; }
    const norm=arr=>arr.map(p=>p.value+(p.closed?'c':'o')).sort();
    const ok = JSON.stringify(norm(points))===JSON.stringify(norm(expectedPoints));
    if(ok){ setFb('ok'); setTimeout(onCorrect,450); } else setFb('err');
  }
  return <div>
    <div className="nl-wrap"><svg ref={svgRef} className="nl-svg" viewBox="0 0 640 90">
      <Axis/>
      {(staticSegments||[]).map((s,i)=><SegmentShape key={'s'+i} seg={s}/>)}
      {points.map((p,i)=><circle key={i} cx={xOf(p.value)} cy={38} r={7} fill={p.closed?(color||'#16a34a'):'#fff'} stroke={color||'#16a34a'} strokeWidth={2.5}/>)}
      <rect x="0" y="20" width="640" height="40" fill="transparent" onClick={handleClick} style={{cursor:points.length<n?'pointer':'default'}}/>
    </svg></div>
    {points.length>0 && <div className="nl-controls">
      {points.map((p,i)=><span key={i} style={{display:'flex',gap:4,alignItems:'center'}}>
        <span className="hint" style={{margin:0}}>נקודה {i+1} ({p.value}):</span>
        <button className={`nl-toggle ${!p.closed?'active':''}`} onClick={()=>toggleClosed(i)}>○</button>
        <button className={`nl-toggle ${p.closed?'active':''}`} onClick={()=>toggleClosed(i)}>●</button>
      </span>)}
    </div>}
    <div className="hint" style={{textAlign:'center'}}>לחצו על הציר למיקום {n===1?'הנקודה':'שתי הנקודות'}, ובחרו פתוחה/סגורה לכל נקודה.</div>
    <div style={{textAlign:'center',display:'flex',gap:8,justifyContent:'center'}}>
      <button className="btn" onClick={clear}>נקה</button>
      <button className="btn bp" onClick={check}>✓ בדוק</button>
    </div>
    {fb==='err' && <Fb ok={false}/>}
    {fb==='ok' && <Fb ok={true}/>}
  </div>;
}

function NotationInputRay({expectedSign,expectedValue,onCorrect}){
  const [sign,setSign]=useState(null);
  const [txt,setTxt]=useState('');
  const [fb,setFb]=useState(null);
  function check(){
    const n=parseInt(txt,10);
    if(sign && !isNaN(n) && sign===expectedSign && n===expectedValue){ setFb('ok'); setTimeout(onCorrect,450); }
    else setFb('err');
  }
  return <div>
    <div className="choice-row" style={{direction:'ltr'}}>
      <span style={{fontSize:'1.2rem',fontWeight:700,color:'#831843'}}>x</span>
      {SIGNS.map(s=><button key={s} className={`choice-btn ${sign===s?'active':''}`} onClick={()=>{setSign(s);setFb(null);}}>{s}</button>)}
      <input value={txt} onChange={e=>{setTxt(e.target.value);setFb(null);}} style={{width:70}}/>
    </div>
    <div style={{textAlign:'center'}}><button className="btn bp" onClick={check}>✓ בדוק</button></div>
    {fb==='err' && <Fb ok={false}/>}
    {fb==='ok' && <Fb ok={true}/>}
  </div>;
}

/* ================= Chapter 1 ================= */
function genCh1(){
  const v=randInt(-10,10);
  const sign=pick(SIGNS);
  return makeIneqForSolution(v,sign);
}
function Ch1(){
  const [data,setData]=useState(genCh1);
  const [phase,setPhase]=useState('solve');
  function reset(){ setData(genCh1()); setPhase('solve'); }
  return <div className="content">
    <div className="card">
      <div className="card-t">אי-שוויון פשוט</div>
      <div className="formula-box">{ineqText(data.a,data.b,data.c,data.sign)}</div>
      {phase==='solve' && <div className="step-card">
        <div className="hint">שלב 1: פתרו את האי-שוויון, כמו משוואה</div>
        <IeqSolver key={data.a+'-'+data.b+'-'+data.c} a={data.a} b={data.b} c={data.c} sign={data.sign}
          onSolved={()=>setPhase('line')}/>
      </div>}
      {phase==='line' && <div className="step-card">
        <div className="iq-sols" dir="ltr"><span className="c0">x {data.sign} {data.v}</span></div>
        <div className="hint">שלב 2: סמנו את הפתרון על ציר המספרים</div>
        <RayMarker expected={{value:data.v,closed:closedOfSign(data.sign),dir:dirOfSign(data.sign)}}
          color="#db2777" onCorrect={()=>setPhase('done')}/>
      </div>}
      {phase==='done' && <div className="banner">✅ כל הכבוד! פתרתם נכון.
        <button className="btn bg" onClick={reset}>אי-שוויון חדש ↺</button>
      </div>}
    </div>
  </div>;
}

/* ================= Chapter 2 ================= */
function genCh2A(){
  const dir=pick(['left','right']);
  const closed=Math.random()<0.5;
  const value=randInt(-10,10);
  return {value,closed,dir,sign:signFromDirClosed(dir,closed)};
}
function Ch2A(){
  const [data,setData]=useState(genCh2A);
  const [done,setDone]=useState(false);
  function reset(){ setData(genCh2A()); setDone(false); }
  return <div className="step-card">
    <div className="hint">כתבו את אי-השוויון המתאים לתחום המסומן על הציר (בצורה x [סימן] [מספר])</div>
    <NumberLineStatic segments={[{type:'ray',value:data.value,closed:data.closed,dir:data.dir,color:'#7c3aed'}]}/>
    {!done && <NotationInputRay expectedSign={data.sign} expectedValue={data.value} onCorrect={()=>setDone(true)}/>}
    {done && <div className="banner">✅ כל הכבוד!
      <button className="btn bg" onClick={reset}>תרגיל חדש ↺</button>
    </div>}
  </div>;
}
function genCh2B(){
  const sign=pick(SIGNS);
  const value=randInt(-10,10);
  return {sign,value,closed:closedOfSign(sign),dir:dirOfSign(sign)};
}
function Ch2B(){
  const [data,setData]=useState(genCh2B);
  const [done,setDone]=useState(false);
  function reset(){ setData(genCh2B()); setDone(false); }
  return <div className="step-card">
    <div className="hint">סמנו על הציר את התחום המתאים לאי-השוויון</div>
    <div className="formula-box" style={{direction:'ltr'}}>x {data.sign} {data.value}</div>
    {!done && <RayMarker expected={{value:data.value,closed:data.closed,dir:data.dir}} color="#7c3aed" onCorrect={()=>setDone(true)}/>}
    {done && <div className="banner">✅ כל הכבוד!
      <button className="btn bg" onClick={reset}>תרגיל חדש ↺</button>
    </div>}
  </div>;
}
function genCh2C(){
  const lo=randInt(-9,5);
  const span=randInt(2,6);
  const hi=Math.min(10,lo+span);
  const closedLo=Math.random()<0.5, closedHi=Math.random()<0.5;
  return {lo,hi,closedLo,closedHi};
}
function Ch2C(){
  const [data,setData]=useState(genCh2C);
  const [txt,setTxt]=useState('');
  const [fb,setFb]=useState(null);
  const [done,setDone]=useState(false);
  function reset(){ setData(genCh2C()); setTxt(''); setFb(null); setDone(false); }
  function check(){
    const expected=integersInRange(data.lo,data.closedLo,data.hi,data.closedHi);
    const got=parseIntList(txt);
    if(sameSet(got,expected)){ setFb('ok'); setDone(true); } else setFb('err');
  }
  return <div className="step-card">
    <div className="hint">כתבו את כל הערכים השלמים המקיימים את התחום המסומן</div>
    <NumberLineStatic segments={[{type:'interval',a:data.lo,b:data.hi,closedA:data.closedLo,closedB:data.closedHi,color:'#7c3aed'}]}/>
    {!done && <div className="ans-row">
      <input value={txt} onChange={e=>{setTxt(e.target.value);setFb(null);}} placeholder="לדוגמה: 1, 2, 3" style={{minWidth:160}}/>
      <button className="btn bp" onClick={check}>✓ בדוק</button>
    </div>}
    {fb==='err' && <Fb ok={false}/>}
    {done && <div className="banner">✅ כל הכבוד!
      <button className="btn bg" onClick={reset}>תרגיל חדש ↺</button>
    </div>}
  </div>;
}
function Ch2(){
  const [sub,setSub]=useState('a');
  return <div className="content">
    <div className="card">
      <div className="card-t">הצגה על ציר המספרים וקריאתה</div>
      <div className="sub-tabs">
        <button className={`sub-tab ${sub==='a'?'active':''}`} onClick={()=>setSub('a')}>מציר לכתיב</button>
        <button className={`sub-tab ${sub==='b'?'active':''}`} onClick={()=>setSub('b')}>מכתיב לציר</button>
        <button className={`sub-tab ${sub==='c'?'active':''}`} onClick={()=>setSub('c')}>קריאת תחום</button>
      </div>
      {sub==='a' && <Ch2A key="a"/>}
      {sub==='b' && <Ch2B key="b"/>}
      {sub==='c' && <Ch2C key="c"/>}
    </div>
  </div>;
}

/* ================= Chapter 3 ================= */
function checkIntersectionNotation(text,result){
  let t=(text||'').replace(/\s+/g,'').replace(/<=/g,'≤').replace(/>=/g,'≥');
  if(result.type==='empty') return /אין/.test(text) && /פתרון/.test(text);
  if(result.type==='point'){
    const m=t.match(/^x=(-?\d+)$/);
    return !!m && parseInt(m[1],10)===result.value;
  }
  const m=t.match(/^(-?\d+)(≤|<)x(≤|<)(-?\d+)$/);
  if(!m) return false;
  const lo=parseInt(m[1],10), signA=m[2], signB=m[3], hi=parseInt(m[4],10);
  return lo===result.lo && hi===result.hi && signA===(result.closedLo?'≤':'<') && signB===(result.closedHi?'≤':'<');
}
function genCh3(){
  const scenario=pick(['interval','interval','interval','empty','point']);
  let sign1,v1,sign2,v2,result;
  if(scenario==='interval'){
    const lo=randInt(-8,5);
    const span=randInt(2,8);
    const hi=Math.min(10,lo+span);
    const closedLo=Math.random()<0.5, closedHi=Math.random()<0.5;
    sign1=closedLo?'≥':'>'; v1=lo;
    sign2=closedHi?'≤':'<'; v2=hi;
    result={type:'interval',lo,hi,closedLo,closedHi};
  } else if(scenario==='point'){
    const v=randInt(-8,8);
    sign1='≥'; v1=v;
    sign2='≤'; v2=v;
    result={type:'point',value:v};
  } else {
    const lo=randInt(-8,2);
    const hi=lo+randInt(1,5);
    sign1='≥'; v1=hi;
    sign2='≤'; v2=lo;
    result={type:'empty'};
  }
  return {scenario,ineq1:makeIneqForSolution(v1,sign1),ineq2:makeIneqForSolution(v2,sign2),result};
}
function Ch3(){
  const [data,setData]=useState(genCh3);
  const [phase,setPhase]=useState(0);
  const [boundaryOk,setBoundaryOk]=useState(false);
  const [notationTxt,setNotationTxt]=useState('');
  const [notationFb,setNotationFb]=useState(null);
  const [listTxt,setListTxt]=useState('');
  const [listFb,setListFb]=useState(null);
  const [done1,setDone1]=useState(false);
  const [done2,setDone2]=useState(false);
  useEffect(()=>{ if(phase===0&&done1&&done2) setPhase(2); },[done1,done2,phase]);

  function reset(){
    setDone1(false); setDone2(false);
    setData(genCh3()); setPhase(0); setBoundaryOk(false);
    setNotationTxt(''); setNotationFb(null); setListTxt(''); setListFb(null);
  }
  const r1={value:data.ineq1.v,closed:closedOfSign(data.ineq1.sign),dir:dirOfSign(data.ineq1.sign)};
  const r2={value:data.ineq2.v,closed:closedOfSign(data.ineq2.sign),dir:dirOfSign(data.ineq2.sign)};
  const seg1={type:'ray',value:r1.value,closed:r1.closed,dir:r1.dir,color:'#2563eb'};
  const seg2={type:'ray',value:r2.value,closed:r2.closed,dir:r2.dir,color:'#ea580c'};

  function checkNotation(){
    const ok=checkIntersectionNotation(notationTxt,data.result);
    if(ok){ setNotationFb('ok'); setTimeout(()=>setPhase(data.result.type==='empty'?6:5),500); }
    else setNotationFb('err');
  }
  function checkList(){
    const expected = data.result.type==='point' ? [data.result.value] : integersInRange(data.result.lo,data.result.closedLo,data.result.hi,data.result.closedHi);
    const got=parseIntList(listTxt);
    if(sameSet(got,expected)){ setListFb('ok'); setTimeout(()=>setPhase(6),500); }
    else setListFb('err');
  }

  return <div className="content">
    <div className="card">
      <div className="card-t">מערכת אי-שוויונות</div>
      <div className="formula-box" style={{direction:'ltr',fontSize:'1.15rem'}}>
        {ineqText(data.ineq1.a,data.ineq1.b,data.ineq1.c,data.ineq1.sign)}<br/>
        {ineqText(data.ineq2.a,data.ineq2.b,data.ineq2.c,data.ineq2.sign)}
      </div>

      {phase<=1 && <div className="step-card">
        <div className="hint">שלב 1: פתרו את שני האי-שוויונות (בכל סדר)</div>
        <div className="iq-pair">
          <div className="iq-col c1"><div className="iq-col-t">אי-שוויון 1</div>
            <IeqSolver key={'s1-'+data.ineq1.a+data.ineq1.b+data.ineq1.c} a={data.ineq1.a} b={data.ineq1.b} c={data.ineq1.c} sign={data.ineq1.sign} onSolved={()=>setDone1(true)}/></div>
          <div className="iq-col c2"><div className="iq-col-t">אי-שוויון 2</div>
            <IeqSolver key={'s2-'+data.ineq2.a+data.ineq2.b+data.ineq2.c} a={data.ineq2.a} b={data.ineq2.b} c={data.ineq2.c} sign={data.ineq2.sign} onSolved={()=>setDone2(true)}/></div>
        </div>
      </div>}

      {phase>=2 && phase<6 && <div className="iq-sols">
        <span className="c1">x {data.ineq1.sign} {data.ineq1.v}</span>
        <span className="iq-and">וגם</span>
        <span className="c2">x {data.ineq2.sign} {data.ineq2.v}</span>
      </div>}

      {phase===2 && <div className="step-card">
        <div className="hint">שלב 2: סמנו את תחום הפתרון של האי-שוויון הראשון על הציר</div>
        <RayMarker expected={r1} color="#2563eb" onCorrect={()=>setPhase(3)}/>
      </div>}

      {phase===3 && <div className="step-card">
        <div className="hint">שלב 2: סמנו את תחום הפתרון של האי-שוויון השני על הציר</div>
        <RayMarker expected={r2} color="#ea580c" staticSegments={[seg1]} onCorrect={()=>setPhase(4)}/>
      </div>}

      {phase===4 && <div className="step-card">
        <div className="hint">שלב 3: מצאו את התחום המשותף לשני האי-שוויונות</div>
        {data.result.type!=='empty' && !boundaryOk && <BoundaryPointsMarker
          expectedPoints={data.result.type==='point'
            ? [{value:data.result.value,closed:true}]
            : [{value:data.result.lo,closed:data.result.closedLo},{value:data.result.hi,closed:data.result.closedHi}]}
          color="#16a34a" staticSegments={[seg1,seg2]} onCorrect={()=>setBoundaryOk(true)}/>}
        {(data.result.type==='empty' || boundaryOk) && <div>
          <div className="ans-row">
            <input value={notationTxt} onChange={e=>{setNotationTxt(e.target.value);setNotationFb(null);}}
              placeholder={data.result.type==='empty' ? 'אין פתרון' : 'לדוגמה: -2 < x ≤ 5'} style={{minWidth:170}}/>
            <button className="btn bp" onClick={checkNotation}>✓ בדוק</button>
          </div>
          {notationFb==='err' && <Fb ok={false}/>}
          {notationFb==='ok' && <Fb ok={true}/>}
        </div>}
      </div>}

      {phase===5 && <div className="step-card">
        <div className="hint">שלב 4: רשמו את כל הערכים השלמים המקיימים את שני האי-שוויונות</div>
        <div className="ans-row">
          <input value={listTxt} onChange={e=>{setListTxt(e.target.value);setListFb(null);}} placeholder="לדוגמה: 1, 2, 3" style={{minWidth:160}}/>
          <button className="btn bp" onClick={checkList}>✓ בדוק</button>
        </div>
        {listFb==='err' && <Fb ok={false}/>}
      </div>}

      {phase===6 && <div className="banner">✅ כל הכבוד! פתרתם את המערכת בהצלחה.
        <button className="btn bg" onClick={reset}>מערכת חדשה ↺</button>
      </div>}
    </div>
  </div>;
}

/* ================= App ================= */
function App(){
  const [chapter,setChapter]=useState(1);
  return <div>
    <div className="hdr">
      <h1>תרגול אי-שוויונות</h1>
      <div className="ch-nav">
        <button className={`ch-btn ${chapter===1?'active':''}`} onClick={()=>setChapter(1)}>1. אי-שוויון פשוט</button>
        <button className={`ch-btn ${chapter===2?'active':''}`} onClick={()=>setChapter(2)}>2. ציר מספרים</button>
        <button className={`ch-btn ${chapter===3?'active':''}`} onClick={()=>setChapter(3)}>3. מערכת אי-שוויונות</button>
      </div>
    </div>
    {chapter===1 && <Ch1/>}
    {chapter===2 && <Ch2/>}
    {chapter===3 && <Ch3/>}
  </div>;
}


// ===== END ORIGINAL =====
export default App;
