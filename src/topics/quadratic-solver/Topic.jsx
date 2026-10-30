'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/quadratic-solver.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const { useState, useMemo, useRef, useEffect } = React;

/* ── Math ─────────────────────────────────────────────────────────────────── */
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){let t=b;b=a%b;a=t;}return a||1}
function simplify(num,den){if(num===0)return[0,1];if(den<0){num=-num;den=-den;}const g=gcd(Math.abs(num),den);return[num/g,den/g]}
function addFracs(n1,d1,n2,d2){return simplify(n1*d2+n2*d1,d1*d2)}

/* ── Terms ────────────────────────────────────────────────────────────────── */
let _uid=0;const uid=()=>`t${++_uid}`;
function mkTerm(type,num,den=1){const[n,d]=simplify(num,den);return{id:uid(),type,num:n,den:d}}
function negTerm(t){return mkTerm(t.type,-t.num,t.den)}

function sideStr(terms){
  if(!terms.length)return'0';
  return terms.map((t,i)=>{
    const abs=Math.abs(t.num);
    const sign=t.num<0?(i===0?'−':' − '):(i===0?'':' + ');
    const frac=t.den===1?`${abs}`:`${abs}/${t.den}`;
    const coef=(abs===1&&t.den===1)?'':frac;
    if(t.type==='const')return`${sign}${frac}`;
    if(t.type==='x')return`${sign}${coef}x`;
    return`${sign}${coef}x²`;
  }).join('');
}
function eqStr(eq){return`${sideStr(eq.left)} = ${sideStr(eq.right)}`}

/* ── Operations ───────────────────────────────────────────────────────────── */
function doMove(eq,fromSide,termId){
  const from=[...eq[fromSide]];
  // auto-strip placeholder zeros from target side
  const rawTo=fromSide==='left'?eq.right:eq.left;
  const to=rawTo.filter(t=>!(t.type==='const'&&t.num===0&&t.den===1));
  const idx=from.findIndex(t=>t.id===termId);
  if(idx===-1)return eq;
  const[moved]=from.splice(idx,1);
  to.push(negTerm(moved));
  const ff=from.length?from:[mkTerm('const',0)];
  const ft=to.length?to:[mkTerm('const',0)];
  return fromSide==='left'?{left:ff,right:ft}:{left:ft,right:ff};
}
function doMultiply(eq,k){const f=t=>mkTerm(t.type,t.num*k,t.den);return{left:eq.left.map(f),right:eq.right.map(f)}}
function doDivide(eq,k){
  const f=t=>{const[n,d]=simplify(t.num,t.den*Math.abs(k));return mkTerm(t.type,k<0?-n:n,d)};
  return{left:eq.left.map(f),right:eq.right.map(f)};
}
function simplifySide(terms){
  let x2n=0,x2d=1,xn=0,xd=1,cn=0,cd=1;
  for(const t of terms){
    if(t.type==='x2')[x2n,x2d]=addFracs(x2n,x2d,t.num,t.den);
    else if(t.type==='x')[xn,xd]=addFracs(xn,xd,t.num,t.den);
    else[cn,cd]=addFracs(cn,cd,t.num,t.den);
  }
  const r=[];
  if(x2n!==0)r.push(mkTerm('x2',x2n,x2d));
  if(xn!==0)r.push(mkTerm('x',xn,xd));
  if(cn!==0)r.push(mkTerm('const',cn,cd));
  return r.length?r:[mkTerm('const',0)];
}
function canSimp(terms){
  return terms.filter(t=>t.type==='x2').length>1
      ||terms.filter(t=>t.type==='x').length>1
      ||terms.filter(t=>t.type==='const').length>1;
}

/* ── Standard form detection ──────────────────────────────────────────────── */
// Strict: checks the actual current state (student must have simplified manually)
function checkStandard(eq){
  const R=eq.right;
  if(!(R.length===1&&R[0].type==='const'&&R[0].num===0&&R[0].den===1))return null;
  const L=eq.left;
  if(L.filter(t=>t.type==='x2').length!==1)return null;
  if(L.filter(t=>t.type==='x').length>1)return null;
  if(L.filter(t=>t.type==='const').length>1)return null;
  return L;
}
// Near-standard: would be standard after simplification (hint trigger)
function nearStandard(eq){
  const R=simplifySide(eq.right);
  if(!(R.length===1&&R[0].type==='const'&&R[0].num===0))return false;
  const L=simplifySide(eq.left);
  return L.some(t=>t.type==='x2');
}

/* ── Generation ───────────────────────────────────────────────────────────── */
function genEq(){
  const opts=[-5,-4,-3,-2,-1,1,2,3,4,5];
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  const mode=Math.random(); // <0.2: c=0 (common factor), <0.4: b=0 (x² = number), else general
  for(let i=0;i<300;i++){
    let r1=pick(opts),r2=pick(opts.filter(x=>x!==r1));
    if(mode<0.2) r1=0;
    else if(mode<0.4) r2=-Math.abs(r1), r1=Math.abs(r1);
    const B=-(r1+r2),C=r1*r2;
    const k=Math.floor(Math.random()*3);    // extra x² on both sides (0-2)
    const m=Math.floor(Math.random()*7)-3;  // extra x on both (-3..3)
    const n=Math.floor(Math.random()*11)-5; // extra const on both (-5..5)
    if(k===0&&m===0&&n===0)continue;
    const lx2=1+k,lx=B+m,lc=C+n;
    if(Math.abs(lx2)>5||Math.abs(lx)>15||Math.abs(lc)>25)continue;
    const left=[],right=[];
    if(lx2!==0)left.push(mkTerm('x2',lx2));
    if(lx!==0)left.push(mkTerm('x',lx));
    if(lc!==0)left.push(mkTerm('const',lc));
    if(!left.length)continue;
    if(k!==0)right.push(mkTerm('x2',k));
    if(m!==0)right.push(mkTerm('x',m));
    if(n!==0)right.push(mkTerm('const',n));
    if(!right.length)continue;
    return{left,right,roots:[r1,r2].sort((a,b)=>b-a),key:Math.random()};
  }
  return{left:[mkTerm('x2',2),mkTerm('x',3),mkTerm('const',-5)],
         right:[mkTerm('x2',1),mkTerm('x',1),mkTerm('const',1)],
         roots:[1,-6],key:Math.random()};
}

/* ── TermPill ─────────────────────────────────────────────────────────────── */
function TermPill({term,index,onPointerDown,grabbed,pressing,selected,isStatic}){
  const{type,num,den}=term;
  const isNeg=num<0;const abs=Math.abs(num);
  const isOne=abs===1&&den===1;
  const CoefEl=()=>{
    if(isOne)return null;
    if(den===1)return<span className="tc">{abs}</span>;
    return<span className="tf"><span className="fn">{abs}</span><span className="fd">{den}</span></span>;
  };
  const Body=()=>{
    if(type==='const'){
      if(den===1)return<span className="tc">{abs}</span>;
      return<span className="tf"><span className="fn">{abs}</span><span className="fd">{den}</span></span>;
    }
    if(type==='x')return<><CoefEl/><span className="xv">x</span></>;
    return<><CoefEl/><span className="xv">x<sup>2</sup></span></>;
  };
  const cls=['tp',isStatic?'':'draggable',grabbed?'grabbed':'',pressing?'pressing':'',selected?'selected':''].filter(Boolean).join(' ');
  return(
    <span className={cls} onPointerDown={onPointerDown||undefined} style={{touchAction:'none',opacity:grabbed?.2:1}}>
      {index>0&&<span className="ts">{isNeg?'−':'+'}</span>}
      {index===0&&isNeg&&<span className="ts">−</span>}
      <Body/>
    </span>
  );
}

/* ── Ghost ────────────────────────────────────────────────────────────────── */
function Ghost({term,x,y,over}){
  if(!term)return null;
  return(
    <div className={`ghost${over?' over':''}`} style={{position:'fixed',left:x,top:y,pointerEvents:'none',zIndex:9999,transform:'translate(-50%,-50%) scale(1.15)'}}>
      <TermPill term={term} index={0} isStatic/>
    </div>
  );
}

/* ── Phase 1 ──────────────────────────────────────────────────────────────── */
const LP=400;
function Phase1({eqData,onNext}){
  const[curEq,setCurEq]=useState({left:eqData.left,right:eqData.right});
  const[hist,setHist]=useState([]);
  const[drag,setDrag]=useState(null);
  const[pressingId,setPressingId]=useState(null);
  const[sel,setSel]=useState(new Set()); // selected term IDs
  const[selErr,setSelErr]=useState('');

  const sf=useMemo(()=>checkStandard(curEq),[curEq]);
  const near=useMemo(()=>!sf&&nearStandard(curEq),[sf,curEq]);
  const initEq={left:eqData.left,right:eqData.right};

  const R=useRef({drag:null,curEq:null,lz:null,rz:null,timer:null,pending:null});
  R.current.curEq=curEq;R.current.drag=drag;

  // stable ref for toggle (called from event handler closure)
  const toggleSelRef=useRef(null);
  toggleSelRef.current=(tid)=>{
    setSel(prev=>{const n=new Set(prev);n.has(tid)?n.delete(tid):n.add(tid);return n});
    setSelErr('');
  };

  function handleSimplify(){
    // Collect selected terms with side info
    const selTerms=[];
    for(const[side,terms]of[['left',curEq.left],['right',curEq.right]]){
      for(const t of terms)if(sel.has(t.id))selTerms.push({...t,side});
    }
    if(selTerms.length<2)return;
    const types=new Set(selTerms.map(t=>t.type));
    if(types.size>1){setSelErr('לא ניתן לפשט איברים שאינם מאותה משפחה (x², x, מספרים)');return}
    const sides=new Set(selTerms.map(t=>t.side));
    if(sides.size>1){setSelErr('ניתן לפשט רק איברים שנמצאים באותו צד');return}
    const side=[...sides][0],type=[...types][0];
    const sideTerms=curEq[side];
    const inSel=sideTerms.filter(t=>sel.has(t.id));
    const notSel=sideTerms.filter(t=>!sel.has(t.id));
    let rn=0,rd=1;
    for(const t of inSel)[rn,rd]=addFracs(rn,rd,t.num,t.den);
    const newTerms=[...notSel];
    if(rn!==0)newTerms.push(mkTerm(type,rn,rd));
    newTerms.sort((a,b)=>({x2:0,x:1,const:2}[a.type]-{x2:0,x:1,const:2}[b.type]));
    const ft=newTerms.length?newTerms:[mkTerm('const',0)];
    const lbl=inSel.map(t=>sideStr([t])).join(' ו-');
    const newEq={...curEq,[side]:ft};
    setHist(h=>[...h,{eq:curEq,desc:`פישוט: ${lbl}`}]);
    setCurEq(newEq);setSel(new Set());setSelErr('');
  }

  useEffect(()=>{
    function onMove(e){
      const d=R.current.drag;if(!d)return;
      const x=e.clientX,y=e.clientY;
      const tel=d.fs==='left'?R.current.rz:R.current.lz;
      let over=false;
      if(tel){const r=tel.getBoundingClientRect();over=x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
      const nd={...d,x,y,over};R.current.drag=nd;setDrag(nd);
    }
    function onUp(){
      clearTimeout(R.current.timer);setPressingId(null);
      const pend=R.current.pending;R.current.pending=null;
      const d=R.current.drag;
      if(pend&&!d){
        // short press → toggle selection
        toggleSelRef.current&&toggleSelRef.current(pend.tid);
        return;
      }
      if(d){
        if(d.over){
          const eq=R.current.curEq;
          const term=eq[d.fs].find(t=>t.id===d.tid);
          const lbl=term?sideStr([term]):'';
          const toLbl=d.fs==='left'?'ימין':'שמאל';
          const newEq=doMove(eq,d.fs,d.tid);
          setHist(h=>[...h,{eq,desc:`הזזת ${lbl} לצד ${toLbl}`}]);
          setCurEq(newEq);setSel(new Set());setSelErr('');
        }
        R.current.drag=null;setDrag(null);
      }
    }
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp);
    return()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp)};
  },[]);

  function onTermDown(tid,side,e){
    if(sf)return;
    e.preventDefault();e.stopPropagation();
    clearTimeout(R.current.timer);
    const sx=e.clientX,sy=e.clientY;
    R.current.pending={tid,side};setPressingId(tid);
    R.current.timer=setTimeout(()=>{
      R.current.pending=null;setPressingId(null);
      setSel(new Set());// clear selection when dragging starts
      const nd={tid,fs:side,x:sx,y:sy,over:false};R.current.drag=nd;setDrag(nd);
    },LP);
  }

  const ghostTerm=drag?curEq[drag.fs].find(t=>t.id===drag.tid):null;
  const selCount=sel.size;

  const hint=drag
    ?(drag.over?'✓ שחרר להעברה':'גרור לצד השני ↔')
    :selCount>0
      ?`${selCount} איבר${selCount>1?'ים':''} נבחר${selCount>1?'ו':''} — לחץ פשט לאיחוד`
      :'לחיצה קצרה = בחר • לחיצה ממושכת = גרור לצד השני';

  return(
    <div>
      <Ghost term={ghostTerm} x={drag?.x} y={drag?.y} over={drag?.over}/>
      {sf&&(
        <div className="std-banner">
          <span className="std-text">✓ המשוואה בצורה הסטנדרטית ax²+bx+c=0</span>
          <button className="btn-next" onClick={()=>onNext(sf)}>המשך לשלב 2 →</button>
        </div>
      )}
      <div className="card">
        <div className="card-title">שלב 1 — סדר את המשוואה</div>
        <div className="eq-row">
          <div ref={el=>R.current.lz=el}
            className={`side-zone${drag&&drag.fs==='right'&&drag.over?' drop-zone':''}`}>
            {curEq.left.map((t,i)=>(
              <TermPill key={t.id} term={t} index={i}
                grabbed={drag&&drag.tid===t.id} pressing={pressingId===t.id}
                selected={sel.has(t.id)}
                onPointerDown={!sf?e=>onTermDown(t.id,'left',e):null}/>
            ))}
          </div>
          <span className="eq-sign">=</span>
          <div ref={el=>R.current.rz=el}
            className={`side-zone${drag&&drag.fs==='left'&&drag.over?' drop-zone':''}`}>
            {curEq.right.map((t,i)=>(
              <TermPill key={t.id} term={t} index={i}
                grabbed={drag&&drag.tid===t.id} pressing={pressingId===t.id}
                selected={sel.has(t.id)}
                onPointerDown={!sf?e=>onTermDown(t.id,'right',e):null}/>
            ))}
          </div>
        </div>
        <div className="hint">{hint}</div>
      </div>

      {!sf&&(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,marginBottom:14}}>
          {near&&<div className="near-hint">⚠ פשט את האיברים הדומים כדי להמשיך לשלב 2</div>}
          <button className="act-btn" disabled={selCount<2} onClick={handleSimplify}
            style={{fontSize:'1rem',padding:'11px 36px'}}>
            פשט{selCount>=2?` (${selCount})`:' ≡'}
          </button>
          {selErr&&<div className="sel-err">{selErr}</div>}
        </div>
      )}

      {hist.length>0&&(
        <div className="history">
          <div className="hlabel">שלבי הפתרון</div>
          {[{eq:initEq,desc:'משוואה מקורית'},...hist].map((s,i)=>(
            <div className="hrow" key={i}>
              <span className="hnum">{i+1}</span>
              <span className="heq">{eqStr(s.eq)}</span>
              <span className="hdesc">{s.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Phase 2 ──────────────────────────────────────────────────────────────── */
function Phase2({stdTerms,onConfirm}){
  const[vals,setVals]=useState({a:'',b:'',c:''});
  const[err,setErr]=useState('');
  const correct=useMemo(()=>{
    const x2=stdTerms.find(t=>t.type==='x2');
    const x=stdTerms.find(t=>t.type==='x');
    const c=stdTerms.find(t=>t.type==='const');
    return{a:x2?x2.num/x2.den:0,b:x?x.num/x.den:0,c:c?c.num/c.den:0};
  },[stdTerms]);

  function submit(){
    const ua=Number(vals.a),ub=Number(vals.b),uc=Number(vals.c);
    if(vals.a===''||vals.b===''||vals.c===''){setErr('מלא את כל השדות');return}
    if(ua!==correct.a||ub!==correct.b||uc!==correct.c){
      setErr(`לא בדיוק — בדוק שוב. זכור: a הוא מקדם x², b הוא מקדם x, ו-c הוא הקבוע`);
      return;
    }
    if(ua===0){setErr('a=0 → זו לא משוואה ריבועית! חזור לשלב 1');return}
    onConfirm(correct.a,correct.b,correct.c);
  }

  return(
    <div className="card">
      <div className="card-title">שלב 2 — זהה את המקדמים</div>
      <div className="p2-eq">{sideStr(stdTerms)} = 0</div>
      <div className="p2-hint">מהו ערכו של כל מקדם במשוואה שלפניך?</div>
      <div className="coef-row" style={{direction:'ltr'}}>
        {['a','b','c'].map(k=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:4}}>
            <span className="coef-label">{k} =</span>
            <input className="coef-inp" type="number" value={vals[k]} placeholder="?"
              onChange={e=>{setVals(v=>({...v,[k]:e.target.value}));setErr('')}}
              onKeyDown={e=>e.key==='Enter'&&submit()}/>
          </div>
        ))}
      </div>
      {err&&<div className="err-msg">{err}</div>}
      <div style={{textAlign:'center',marginTop:14}}>
        <button className="btn-next" onClick={submit}>אמת ✓</button>
      </div>
    </div>
  );
}

/* ── Phase 3 ──────────────────────────────────────────────────────────────── */
function buildSteps(a,b,c){
  const steps=[];
  const D=b*b-4*a*c;
  // Step: substitution
  steps.push({type:'sub',a,b,c});
  // Step: discriminant
  steps.push({type:'disc',b,a,c,bSq:b*b,fac:4*a*c,D});
  if(D<0){steps.push({type:'nosol',D});return steps}
  const sqD=Math.round(Math.sqrt(D));
  steps.push({type:'sqrt',D,sqD});
  if(D===0){
    const num=-b,den=2*a;
    const[xn,xd]=simplify(num,den);
    steps.push({type:'onesol',b,a,xn,xd,x:xn/xd});
    return steps;
  }
  const n1=-b+sqD,n2=-b-sqD,den=2*a;
  const[x1n,x1d]=simplify(n1,den);
  const[x2n,x2d]=simplify(n2,den);
  steps.push({type:'twosol',b,sqD,a,n1,n2,den,x1:x1n/x1d,x2:x2n/x2d});
  return steps;
}

function StepItem({step,last}){
  const s=step;
  const negB=s.b!=null?(-s.b):0;
  if(s.type==='sub')return(
    <div className="step-item sub">
      <div className="step-label">הצבת הערכים בנוסחה:</div>
      <div className="step-math">
        x = ( −({s.b}) ± √( ({s.b})² − 4·({s.a})·({s.c}) ) ) / ( 2·({s.a}) )
      </div>
    </div>
  );
  if(s.type==='disc'){
    const facSign=s.fac>=0?'−':'+'
    const facAbs=Math.abs(s.fac);
    return(
      <div className="step-item disc">
        <div className="step-label">חישוב הדיסקרימיננטה Δ = b² − 4ac :</div>
        <div className="step-math">
          Δ = {s.bSq} {facSign} {facAbs} = <span className="delta-sym">{s.D}</span>
        </div>
      </div>
    );
  }
  if(s.type==='nosol')return(
    <div className="step-item nosol">
      <div className="step-label">הדיסקרימיננטה שלילית</div>
      <div className="step-math">Δ = {s.D} &lt; 0 → אין פתרון ממשי</div>
    </div>
  );
  if(s.type==='sqrt')return(
    <div className="step-item sqrt">
      <div className="step-label">שורש הדיסקרימיננטה:</div>
      <div className="step-math">√Δ = √{s.D} = <span className="delta-sym">{s.sqD}</span></div>
    </div>
  );
  if(s.type==='onesol')return(
    <div className="step-item onesol">
      <div className="step-label">Δ = 0 ← פתרון יחיד:</div>
      <div className="step-math">
        x = −b / 2a = {-s.b} / {2*s.a} = <span className="sol-val">{s.x}</span>
      </div>
    </div>
  );
  if(s.type==='twosol')return(
    <div className="step-item sol">
      <div className="step-label">שני הפתרונות:</div>
      <div className="step-math">
        x₁ = ({-s.b} + {s.sqD}) / {s.den} = {s.n1} / {s.den} = <span className="sol-val">{s.x1}</span>
        <br/>
        x₂ = ({-s.b} − {s.sqD}) / {s.den} = {s.n2} / {s.den} = <span className="sol-val">{s.x2}</span>
      </div>
    </div>
  );
  return null;
}

function Phase3({a,b,c}){
  const[rev,setRev]=useState(0);
  const steps=useMemo(()=>buildSteps(a,b,c),[a,b,c]);
  const bDisp=b<0?`(${b})`:`${b}`;
  return(
    <div>
      <div className="card">
        <div className="card-title">שלב 3 — נוסחת השורשים</div>
        <div className="big-formula" dir="ltr">
          <span style={{fontSize:'1.8rem'}}>x =</span>
          <div className="bf-frac">
            <div className="bf-num">−b ± √(b² − 4ac)</div>
            <div style={{height:'2.5px',background:'#1e3a5f',margin:'3px 0'}}/>
            <div className="bf-den">2a</div>
          </div>
        </div>
        <div style={{textAlign:'center',marginBottom:14,fontSize:'.9rem',color:'#475569'}}>
          עם: <span dir="ltr" style={{fontWeight:700,color:'#1e3a5f'}}>a={a},  b={b},  c={c}</span>
        </div>
        <div className="steps-list">
          {steps.slice(0,rev+1).map((s,i)=>(
            <StepItem key={i} step={s} last={i===rev}/>
          ))}
        </div>
        {rev<steps.length-1&&(
          <div style={{textAlign:'center'}}>
            <button className="btn-rev" onClick={()=>setRev(r=>r+1)}>הצג שלב הבא →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Special cases (Sulaiman's fix list) ─────────────────────────────────── */
const fmtN=v=>(v<0?'−'+Math.abs(v):String(v));
function SpecialCasesInfo(){
  return(
    <details className="qs-special">
      <summary>מקרים מיוחדים: מתי לא צריך את נוסחת השורשים?</summary>
      <div className="qs-cases">
        <div className="qs-case"><b>c = 0 (אין מספר חופשי)</b><span>מוציאים x כגורם משותף, ומכפלה שווה 0 רק כשאחד הגורמים 0.</span><div className="qs-m" dir="ltr">x² − 5x = 0 → x(x − 5) = 0 → x = 0 , x = 5</div></div>
        <div className="qs-case"><b>b = 0 (אין איבר עם x)</b><span>מבודדים את x² ומוציאים שורש. לא לשכוח: יש פתרון חיובי ושלילי. אם יוצא x² שלילי, אין פתרון.</span><div className="qs-m" dir="ltr">x² − 9 = 0 → x² = 9 → x = ±3</div></div>
        <div className="qs-case"><b>b = 0 וגם c = 0</b><span>נשאר ax² = 0, ולכן הפתרון היחיד הוא x = 0.</span></div>
        <div className="qs-case"><b>a = 0</b><span>זו בכלל לא משוואה ריבועית, אלא משוואה קווית.</span></div>
        <div className="qs-case main"><b>אף מקדם לא 0</b><span>רק אז משתמשים בנוסחת השורשים.</span></div>
      </div>
    </details>
  );
}

function PickCase({a,b,c,onPick}){
  const[err,setErr]=useState('');
  const right=c===0?'c0':b===0?'b0':'none';
  const opts=[['c0','c = 0: גורם משותף'],['b0','b = 0: בידוד x²'],['none','אף אחד: נוסחת השורשים']];
  return(
    <div className="card">
      <div className="card-title">שלב 3 — איזה מקרה זה?</div>
      <div className="p2-eq" dir="ltr">a = {a} ,  b = {b} ,  c = {c}</div>
      <div className="p2-hint">לפני שבוחרים דרך פתרון: האם אחד המקדמים b או c שווה 0?</div>
      <div className="qs-pick">
        {opts.map(([k,l])=><button key={k} className="btn-next qs-opt" onClick={()=>{if(k===right)onPick(k);else setErr(k==='none'?'בדקו שוב: אחד המקדמים כן שווה 0.':'בדקו שוב את המקדמים.')}}>{l}</button>)}
      </div>
      {err&&<div className="err-msg">{err}</div>}
    </div>
  );
}

function Done({text}){return <div className="qs-done">✅ {text}</div>}

// c = 0: x(ax + b) = 0
function SolveCommonFactor({a,b}){
  const[v,setV]=useState({p:'',q:'',r:''});
  const[step,setStep]=useState(1);
  const[err,setErr]=useState('');
  const root=-b/a;
  function check1(){if(Number(v.p)===a&&Number(v.q)===b){setStep(2);setErr('')}else setErr('בדקו שוב: מה נשאר בסוגריים אחרי שמוציאים x?')}
  function check2(){if(Number(v.r)===root){setStep(3);setErr('')}else setErr('בדקו שוב: מתי הגורם בסוגריים שווה 0?')}
  return(
    <div className="card">
      <div className="card-title">שלב 4 — פתרון בגורם משותף</div>
      <div className="p2-eq" dir="ltr">{fmtN(a)===('1')?'':fmtN(a)===('−1')?'−':fmtN(a)}x² {b<0?'−':'+'} {Math.abs(b)}x = 0</div>
      <div className="p2-hint">1. מוציאים x כגורם משותף:</div>
      <div className="coef-row" dir="ltr">
        <span className="coef-label">x(</span>
        <input className="coef-inp" value={v.p} placeholder="?" disabled={step>1} onChange={e=>{setV({...v,p:e.target.value});setErr('')}}/>
        <span className="coef-label">x +</span>
        <input className="coef-inp" value={v.q} placeholder="?" disabled={step>1} onChange={e=>{setV({...v,q:e.target.value});setErr('')}} onKeyDown={e=>e.key==='Enter'&&check1()}/>
        <span className="coef-label">) = 0</span>
        {step===1&&<button className="btn-next" onClick={check1}>בדוק</button>}
      </div>
      {step>=2&&<>
        <div className="p2-hint">2. מכפלה שווה 0 רק כשאחד הגורמים 0: <span dir="ltr" className="qs-ltr">x = 0</span> או שהסוגריים שווים 0.</div>
        <div className="coef-row" dir="ltr">
          <span className="coef-label">x₁ = 0 ,  x₂ =</span>
          <input className="coef-inp" value={v.r} placeholder="?" disabled={step>2} onChange={e=>{setV({...v,r:e.target.value});setErr('')}} onKeyDown={e=>e.key==='Enter'&&check2()}/>
          {step===2&&<button className="btn-next" onClick={check2}>בדוק</button>}
        </div>
      </>}
      {err&&<div className="err-msg">{err}</div>}
      {step===3&&<Done text={`x = 0  או  x = ${root}`}/>}
    </div>
  );
}

// b = 0: ax² + c = 0 → x² = −c/a → x = ±√
function SolveNoB({a,c}){
  const[v,setV]=useState({s:'',r:''});
  const[step,setStep]=useState(1);
  const[err,setErr]=useState('');
  const sq=-c/a, r=Math.sqrt(sq);
  function check1(){if(Number(v.s)===sq){setStep(2);setErr('')}else setErr('בדקו שוב: מעבירים את c לצד השני ומחלקים ב-a.')}
  function check2(){if(Number(v.r)===r){setStep(3);setErr('')}else setErr('בדקו שוב: איזה מספר בריבוע נותן '+sq+'?')}
  return(
    <div className="card">
      <div className="card-title">שלב 4 — בידוד x²</div>
      <div className="p2-eq" dir="ltr">{a===1?'':a===-1?'−':fmtN(a)}x² {c<0?'−':'+'} {Math.abs(c)} = 0</div>
      <div className="p2-hint">1. מבודדים את x²:</div>
      <div className="coef-row" dir="ltr">
        <span className="coef-label">x² =</span>
        <input className="coef-inp" value={v.s} placeholder="?" disabled={step>1} onChange={e=>{setV({...v,s:e.target.value});setErr('')}} onKeyDown={e=>e.key==='Enter'&&check1()}/>
        {step===1&&<button className="btn-next" onClick={check1}>בדוק</button>}
      </div>
      {step>=2&&<>
        <div className="p2-hint">2. מוציאים שורש. יש שני פתרונות: חיובי ושלילי.</div>
        <div className="coef-row" dir="ltr">
          <span className="coef-label">x = ±</span>
          <input className="coef-inp" value={v.r} placeholder="?" disabled={step>2} onChange={e=>{setV({...v,r:e.target.value});setErr('')}} onKeyDown={e=>e.key==='Enter'&&check2()}/>
          {step===2&&<button className="btn-next" onClick={check2}>בדוק</button>}
        </div>
      </>}
      {err&&<div className="err-msg">{err}</div>}
      {step===3&&<Done text={`x = ${r}  או  x = −${r}`}/>}
    </div>
  );
}

// No zero coefficient: the root formula as a template. The student places a, b, c; the computer calculates.
function FormulaExample(){
  return(
    <details className="qs-example">
      <summary>דוגמה פתורה: x² − 5x + 6 = 0</summary>
      <ol>
        <li>מקדמים: <span dir="ltr" className="qs-ltr">a = 1 , b = −5 , c = 6</span></li>
        <li>הצבה בתבנית: <span dir="ltr" className="qs-ltr">x = ( −(−5) ± √( (−5)² − 4·(1)·(6) ) ) / ( 2·(1) )</span></li>
        <li>הדיסקרימיננטה: <span dir="ltr" className="qs-ltr">Δ = 25 − 24 = 1 , √Δ = 1</span></li>
        <li>שני הפתרונות: <span dir="ltr" className="qs-ltr">x₁ = (5 + 1) / 2 = 3 , x₂ = (5 − 1) / 2 = 2</span></li>
      </ol>
    </details>
  );
}
function FormulaTemplate({a,b,c}){
  const[v,setV]=useState({b1:'',b2:'',a1:'',c1:'',a2:''});
  const[ok,setOk]=useState(false);
  const[err,setErr]=useState('');
  const[rev,setRev]=useState(0);
  const steps=useMemo(()=>buildSteps(a,b,c).slice(1),[a,b,c]);
  const want={b1:b,b2:b,a1:a,c1:c,a2:a};
  function check(){
    const bad=Object.keys(want).filter(k=>v[k]===''||Number(v[k])!==want[k]);
    if(!bad.length){setOk(true);setErr('')}
    else setErr((bad.length===1?'מקום אחד לא נכון':bad.length+' מקומות לא נכונים')+' (מסומן באדום). b נכנס במקומות של b, a במקומות של a, ו-c במקום של c.');
  }
  const box=k=><input key={k} className={'qs-slot'+(err&&v[k]!==''&&Number(v[k])!==want[k]?' bad':'')} value={v[k]} placeholder={k[0]} disabled={ok}
    onChange={e=>{setV({...v,[k]:e.target.value});setErr('')}} onKeyDown={e=>e.key==='Enter'&&check()}/>;
  return(
    <div className="card">
      <div className="card-title">שלב 4 — נוסחת השורשים</div>
      <FormulaExample/>
      <div className="p2-hint">הציבו את המקדמים <span dir="ltr" className="qs-ltr">a = {a} , b = {b} , c = {c}</span> במקומות המתאימים. את החישוב המחשב יעשה.</div>
      <div className="qs-template" dir="ltr">
        <span className="qs-x">x =</span>
        <span className="qs-frac">
          <span className="qs-num">−({box('b1')}) ± √( ({box('b2')})² − 4·({box('a1')})·({box('c1')}) )</span>
          <span className="qs-den">2·({box('a2')})</span>
        </span>
      </div>
      {!ok&&<div style={{textAlign:'center',marginTop:12}}><button className="btn-next" onClick={check}>בדוק הצבה ✓</button></div>}
      {err&&<div className="err-msg">{err}</div>}
      {ok&&<>
        <div className="steps-list" style={{marginTop:14}}>
          {steps.slice(0,rev+1).map((st,i)=><StepItem key={i} step={st} last={i===rev}/>)}
        </div>
        {rev<steps.length-1&&<div style={{textAlign:'center'}}><button className="btn-rev" onClick={()=>setRev(r=>r+1)}>הצג שלב הבא →</button></div>}
      </>}
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────────────────────── */
function App(){
  const[eqData,setEqData]=useState(()=>genEq());
  const[phase,setPhase]=useState(1);
  const[stdTerms,setStdTerms]=useState(null);
  const[coeffs,setCoeffs]=useState(null);
  const[route,setRoute]=useState(null);

  function newEq(){
    setEqData(genEq());setPhase(1);setStdTerms(null);setCoeffs(null);setRoute(null);
  }
  function handleNext(terms){setStdTerms(terms);setPhase(2)}
  function handleCoeffs(a,b,c){setCoeffs({a,b,c});setPhase(3)}

  const phaseLabels=['שלב 1: סידור','שלב 2: מקדמים','שלב 3: איזה מקרה?','שלב 4: פתרון'];
  return(
    <div className="app">
      <h1>משוואות ריבועיות</h1>
      <p className="sub">כיתה ט׳</p>
      <SpecialCasesInfo/>
      <div className="phases">
        {phaseLabels.map((l,i)=>(
          <div key={i} className={`ph${phase===i+1?' active':phase>i+1?' done':''}`}>{l}</div>
        ))}
      </div>
      {phase===1&&<Phase1 key={eqData.key} eqData={eqData} onNext={handleNext}/>}
      {phase===2&&<Phase2 stdTerms={stdTerms} onConfirm={handleCoeffs}/>}
      {phase===3&&<PickCase a={coeffs.a} b={coeffs.b} c={coeffs.c} onPick={r=>{setRoute(r);setPhase(4)}}/>}
      {phase===4&&route==='c0'&&<SolveCommonFactor a={coeffs.a} b={coeffs.b}/>}
      {phase===4&&route==='b0'&&<SolveNoB a={coeffs.a} c={coeffs.c}/>}
      {phase===4&&route==='none'&&<FormulaTemplate a={coeffs.a} b={coeffs.b} c={coeffs.c}/>}
      <div className="bottom" style={{marginTop:8}}>
        <button className="btn-new" onClick={newEq}>משוואה חדשה 🎲</button>
      </div>
    </div>
  );
}


// ===== END ORIGINAL =====
export default App;
