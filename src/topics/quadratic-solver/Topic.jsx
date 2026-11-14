'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/quadratic-solver.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// The root sign that covers everything under it (fixes board #65).
import { Root as MpRoot } from '@/components/Root';
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
// kind (fixes board #61, one chapter per case): 'c0' = c=0, 'b0' = b=0, 'none' = no zero coefficient; else mixed
function genEq(kind){
  const opts=[-5,-4,-3,-2,-1,1,2,3,4,5];
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  const mode=kind==='c0'?0.1:kind==='b0'?0.3:kind==='none'?0.7:Math.random(); // <0.2: c=0 (common factor), <0.4: b=0 (x² = number), else general
  for(let i=0;i<300;i++){
    let r1=pick(opts),r2=pick(opts.filter(x=>x!==r1));
    if(mode<0.2) r1=0;
    else if(mode<0.4) r2=-Math.abs(r1), r1=Math.abs(r1);
    const B=-(r1+r2),C=r1*r2;
    if(kind==='none'&&B===0)continue;
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

/* ── Phase 1 (fixes board #64): arrange by doing the SAME operation on both sides ── */
// Like the one-unknown equations chapter: pick an operation and a number (or x, x²); it is written on
// both sides. Like terms on one side are joined by tapping them and then "פשט" (the simplify step is unchanged).
const QS_OPS=['+','−','×','÷'];
const QS_OP_NAME={'+':'חיבור','−':'חיסור','×':'כפל','÷':'חילוק'};
const QS_FAM=[['const','מספר'],['x','x'],['x2','x²']];
function M({children}){return <span dir="ltr" className="qs-ltr">{children}</span>}
function termLabel(t,first){const s=sideStr([t]);if(first)return s;return t.num<0?'− '+s.slice(1):'+ '+s}
const isZeroSide=side=>side.length===1&&side[0].type==='const'&&side[0].num===0;
function Phase1({eqData,onNext}){
  const[cur,setCur]=useState({left:eqData.left,right:eqData.right});
  const[hist,setHist]=useState([]); // [{eq: the line before this step, desc: what was done}]
  const[sel,setSel]=useState(()=>new Set());
  const[op,setOp]=useState('−');
  const[val,setVal]=useState('');
  const[fam,setFam]=useState('const');
  const[err,setErr]=useState('');

  const sf=useMemo(()=>checkStandard(cur),[cur]);
  const near=useMemo(()=>!sf&&nearStandard(cur),[sf,cur]);
  const like=canSimp(cur.left)||canSimp(cur.right);
  const addSub=op==='+'||op==='−';

  function push(next,desc){setHist(h=>[...h,{eq:cur,desc}]);setCur(next);setSel(new Set());setErr('')}
  function applyOp(){
    const k=num(val);
    if(val.trim()===''){setErr('כתבו מספר בתיבה.');return}
    if(!Number.isInteger(k)){setErr('כתבו מספר שלם, למשל 3 או −2.');return}
    if(k===0){setErr(op==='÷'?'אי אפשר לחלק ב-0.':op==='×'?'כפל ב-0 מוחק את כל המשוואה. בחרו מספר אחר.':'הוספה או חיסור של 0 לא משנים כלום.');return}
    let next,desc;
    if(addSub){
      const v=op==='+'?k:-k; // the term that is added to both sides
      const add=side=>[...side.filter(t=>!(t.type==='const'&&t.num===0)),mkTerm(fam,v)];
      next={left:add(cur.left),right:add(cur.right)};
      const q=sideStr([mkTerm(fam,Math.abs(v))]);
      desc=v>0?<>מוסיפים <M>{q}</M> לשני האגפים</>:<>מחסרים <M>{q}</M> משני האגפים</>;
    }else{
      if(op==='÷'&&[...cur.left,...cur.right].some(t=>t.den!==1||t.num%k!==0)){setErr('לא כל האיברים מתחלקים ב-'+fmtN(k)+'. נסו פעולה אחרת.');return}
      next=op==='×'?doMultiply(cur,k):doDivide(cur,k);
      desc=<>{op==='×'?'כופלים':'מחלקים'} את שני האגפים ב-<M>{par(k)}</M></>;
    }
    push(next,desc);setVal('');
  }
  function simp(){
    const picked=[];
    for(const side of['left','right'])for(const t of cur[side])if(sel.has(t.id))picked.push({...t,side});
    if(picked.length<2)return;
    if(new Set(picked.map(t=>t.type)).size>1){setErr('לא ניתן לפשט איברים שאינם מאותה משפחה (x², x, מספרים)');return}
    if(new Set(picked.map(t=>t.side)).size>1){setErr('ניתן לפשט רק איברים שנמצאים באותו צד');return}
    const side=picked[0].side,type=picked[0].type;
    let rn=0,rd=1;
    for(const t of picked)[rn,rd]=addFracs(rn,rd,t.num,t.den);
    const out=cur[side].filter(t=>!sel.has(t.id));
    if(rn!==0)out.push(mkTerm(type,rn,rd));
    out.sort((a,b)=>({x2:0,x:1,const:2}[a.type]-{x2:0,x:1,const:2}[b.type]));
    push({...cur,[side]:out.length?out:[mkTerm('const',0)]},<>מפשטים: <M>{picked.map(t=>sideStr([t])).join(' , ')}</M></>);
  }
  function undo(){const h=hist[hist.length-1];if(!h)return;setHist(hist.slice(0,-1));setCur(h.eq);setSel(new Set());setErr('')}
  function toggle(id){setSel(p=>{const s=new Set(p);s.has(id)?s.delete(id):s.add(id);return s});setErr('')}

  const tap=terms=>terms.map((t,i)=>(
    <button key={t.id} type="button" className={'qs-term'+(sel.has(t.id)?' sel':'')} aria-pressed={sel.has(t.id)}
      disabled={!!sf} onClick={()=>toggle(t.id)}>{termLabel(t,i===0)}</button>
  ));
  const order=t=>({x2:0,x:1,const:2}[t.type]);
  return(
    <div className="card qs-arr">
      <div className="card-title">שלב 1 — סדר את המשוואה</div>
      <div className="qs-goal">המטרה: להגיע לצורה <M>ax² + bx + c = 0</M>. כלומר, אחרי ה-= יישאר רק 0.</div>
      <div className="qs-lines">
        {hist.map((h,i)=><React.Fragment key={i}>
          <div className="qs-lrow old" dir="ltr">{eqStr(h.eq)}</div>
          <div className="qs-did"><span aria-hidden="true">↓</span> {h.desc}</div>
        </React.Fragment>)}
        <div className={'qs-lrow cur'+(sf?' std':'')} dir="ltr">{tap(cur.left)}<span className="qs-eqs">=</span>{tap(cur.right)}</div>
      </div>
      {hist.length>0&&!sf&&<div className="qs-tools">
        <button type="button" className="act-btn" onClick={undo}>↶ צעד אחורה</button>
        {isZeroSide(cur.left)&&!isZeroSide(cur.right)&&<button type="button" className="act-btn" onClick={()=>push({left:cur.right,right:cur.left},'מחליפים בין האגפים')}>⇄ החלפת אגפים</button>}
      </div>}
      {sf&&(
        <div className="std-banner">
          <span className="std-text">✓ המשוואה בצורה <M>ax² + bx + c = 0</M></span>
          <button className="btn-next" onClick={()=>onNext([...sf].sort((a,b)=>order(a)-order(b)))}>המשך לשלב 2 →</button>
        </div>
      )}
      {!sf&&<>
        {sel.size===0&&near&&<div className="near-hint">⚠ פשטו את האיברים הדומים כדי להמשיך לשלב 2</div>}
        {sel.size===0&&like&&!near&&<div className="qs-like">לחצו על איברים מאותה משפחה באותו צד, ואז על ״פשט״</div>}
        {sel.size>0&&<div className="qs-like">{sel.size===1?'איבר אחד נבחר. בחרו עוד איבר מאותה משפחה':sel.size+' איברים נבחרו. לחצו ״פשט״ לאיחוד'}</div>}
        {sel.size>=2&&<div className="qs-act"><button type="button" className="btn-next" onClick={simp}>פשט ({sel.size})</button></div>}
        {!like&&sel.size===0&&<div className="qs-op">
          <div className="qs-op-t">איזו פעולה עושים על שני האגפים?</div>
          <div className="qs-op-row" dir="ltr">
            {QS_OPS.map(s=><button key={s} type="button" className={'qs-sym'+(op===s?' on':'')} aria-pressed={op===s} aria-label={QS_OP_NAME[s]}
              onClick={()=>{setOp(s);setErr('');if(s==='×'||s==='÷')setFam('const')}}>{s==='×'?'·':s}</button>)}
            <input className="qs-opnum" value={val} placeholder="מספר" inputMode="numeric" aria-label="המספר"
              onChange={e=>{setVal(e.target.value);setErr('')}} onKeyDown={e=>e.key==='Enter'&&applyOp()}/>
            {addSub&&<span className="qs-fam" role="group" aria-label="איזה איבר">
              {QS_FAM.map(([k,l])=><button key={k} type="button" className={'qs-famb'+(fam===k?' on':'')} aria-pressed={fam===k} onClick={()=>{setFam(k);setErr('')}}>{l}</button>)}
            </span>}
          </div>
          <div className="qs-act"><button type="button" className="btn-next" onClick={applyOp}>החל על שני האגפים</button></div>
        </div>}
        {err&&<div className="sel-err">{err}</div>}
        <div className="hint">כמו בפרק פתרון משוואות: בוחרים פעולה ומספר (אפשר גם x או x²), והיא נעשית על שני האגפים. אחר כך מאחדים איברים דומים באותו צד.</div>
      </>}
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

/* ── Step 4 (fixes board #61): shared small parts ─────────────────────────── */
// typed text → number ("−3", "-3", "+3", "3"); anything else is NaN
const num=s=>{const t=String(s).trim().replace(/−/g,'-').replace(/^\+/,'');return /^-?\d+(\.\d+)?$/.test(t)?Number(t):NaN};
const same=(x,y)=>Math.abs(x-y)<1e-9;
const par=v=>v<0?`(${fmtN(v)})`:fmtN(v);
function polyStr(a,b,c){
  const p=[];
  const add=(v,s)=>{if(!v)return;const abs=Math.abs(v);p.push((p.length?(v<0?' − ':' + '):(v<0?'−':''))+((abs===1&&s)?'':abs)+s)};
  add(a,'x²');add(b,'x');add(c,'');
  return p.join('')||'0';
}
function Frac({n,d}){return <span className="qs-fr"><span className="qs-fr-n">{n}</span><span className="qs-fr-d">{d}</span></span>}
function Root({children}){return <MpRoot row>{children}</MpRoot>}
// a value n/d as a whole number, or as a stacked fraction
function Val({n,d}){
  const[sn,sd]=simplify(n,d);
  if(sd===1)return <>{fmtN(sn)}</>;
  return <>{sn<0?'−':''}<Frac n={Math.abs(sn)} d={sd}/></>;
}
function Done({children}){return <div className="qs-done success-banner">✅ <span dir="ltr" className="qs-ltr">{children}</span></div>}
// one answer box; `marks[id]` is 'ok' | 'bad' after a check (only that box is coloured)
function Slot({id,st,ph,label,lock,onEnter}){
  const{v,setV,marks,setMarks,setErr}=st;
  return <input className={'qs-slot'+(marks[id]?' '+marks[id]:'')} value={v[id]} placeholder={ph||'?'} aria-label={label} disabled={lock}
    onChange={e=>{setV({...v,[id]:e.target.value});if(marks[id]){const m={...marks};delete m[id];setMarks(m)}setErr('')}}
    onKeyDown={e=>e.key==='Enter'&&onEnter()}/>;
}
function useSlots(init){
  const[v,setV]=useState(init);
  const[marks,setMarks]=useState({});
  const[err,setErr]=useState('');
  return{v,setV,marks,setMarks,err,setErr};
}

// The root formula: what it is, what it finds, a worked example, and the calculator note.
function FormulaInfo(){
  return(
    <details className="qs-example qs-info">
      <summary>הסבר ודוגמה: נוסחת השורשים</summary>
      <div className="qs-info-body"><FormulaBody/></div>
    </details>
  );
}
function FormulaBody(){
  return(
      <>
        <p>כל משוואה ריבועית אפשר לסדר בצורה <span dir="ltr" className="qs-ltr">ax² + bx + c = 0</span>. נוסחת השורשים מקבלת את שלושת המקדמים a, b ו-c, ונותנת את הפתרונות של המשוואה:</p>
        <div className="qs-formula" dir="ltr">
          <span>x<sub>1,2</sub> =</span>
          <Frac n={<>−b ± <Root>b² − 4ac</Root></>} d="2a"/>
        </div>
        <p>הפתרונות נקראים גם <b>האפסים</b> (או השורשים) של המשוואה: אלה ערכי x שכאשר מציבים אותם בביטוי <span dir="ltr" className="qs-ltr">ax² + bx + c</span> מקבלים 0. בגרף, אלה הנקודות שבהן הפרבולה חותכת את ציר x.</p>
        <p>הסימן ± אומר שמחשבים פעמיים: פעם עם + ופעם עם −. לכן יש בדרך כלל שני פתרונות.</p>
        <div className="qs-ex-title">דוגמה פתורה: <span dir="ltr" className="qs-ltr">x² − 5x + 6 = 0</span></div>
        <ol className="qs-ex">
          <li><span>מזהים את המקדמים:</span><div className="qs-exm" dir="ltr">a = 1 ,  b = −5 ,  c = 6</div></li>
          <li><span>מציבים אותם בנוסחה:</span><div className="qs-exm" dir="ltr"><span>x<sub>1,2</sub> =</span><Frac n={<>−(−5) ± <Root>(−5)² − 4·(1)·(6)</Root></>} d="2·(1)"/></div></li>
          <li><span>מחשבים את מה שמתחת לשורש:</span><div className="qs-exm" dir="ltr"><span>25 − 24 = 1</span><span className="qs-gap">,</span><Root>1</Root><span>= 1</span></div></li>
          <li><span>פעם עם + ופעם עם −:</span>
            <div className="qs-exm" dir="ltr"><span>x<sub>1</sub> =</span><Frac n="5 + 1" d="2"/><span>=</span><Frac n="6" d="2"/><span>= 3</span></div>
            <div className="qs-exm" dir="ltr"><span>x<sub>2</sub> =</span><Frac n="5 − 1" d="2"/><span>=</span><Frac n="4" d="2"/><span>= 2</span></div>
          </li>
          <li><span>בודקים: מציבים 3 במשוואה ומקבלים 0, ולכן 3 הוא אפס של המשוואה. כך גם 2.</span><div className="qs-exm" dir="ltr">3² − 5·3 + 6 = 9 − 15 + 6 = 0</div></li>
        </ol>
        <p className="qs-calc"><b>טוב לדעת:</b> מחשבון מדעי יודע לחשב את זה בעצמו. מקלידים בו את a, b ו-c, והוא מציג את הפתרונות. כדאי להיעזר בו כדי לבדוק את התשובה.</p>
      </>
  );
}

// c = 0: x(ax + b) = 0
function SolveCommonFactor({a,b,n=4}){
  const st=useSlots({p:'',q:'',r:''});
  const{v,marks,setMarks,err,setErr}=st;
  const[step,setStep]=useState(1);
  const root=-b/a;
  function check1(){
    if(v.p.trim()===''||v.q.trim()===''){setErr('מלאו את שני המקומות שבסוגריים.');return}
    const m={p:num(v.p)===a?'ok':'bad',q:num(v.q)===b?'ok':'bad'};
    setMarks({...marks,...m});
    if(m.p==='ok'&&m.q==='ok'){setStep(2);setErr('')}
    else if(m.p==='ok'&&num(v.q)===-b)setErr('שימו לב לסימן של המספר. מספר שלילי כותבים עם מינוס.');
    else setErr('בדקו שוב: מה נשאר בסוגריים אחרי שמוציאים x?');
  }
  function check2(){
    if(v.r.trim()===''){setErr('כתבו את הפתרון השני.');return}
    if(same(num(v.r),root)){setMarks({...marks,r:'ok'});setStep(3);setErr('')}
    else{setMarks({...marks,r:'bad'});setErr(same(num(v.r),-root)?'כמעט: בדקו את הסימן. מתי הסוגריים שווים 0?':'בדקו שוב: מתי הגורם בסוגריים שווה 0?')}
  }
  const inner=polyStr(0,a,b);
  return(
    <div className="card qs4">
      <div className="card-title">שלב {n} — פתרון בגורם משותף</div>
      <div className="p2-eq" dir="ltr">{polyStr(a,b,0)} = 0</div>
      <div className="qs-sub"><span className="qs-n">1</span><span>מוציאים x כגורם משותף. מה נשאר בסוגריים?</span></div>
      <div className="qs-line" dir="ltr">
        <span>x · (</span>
        <Slot id="p" st={st} label="המקדם של x בסוגריים" lock={step>1} onEnter={check1}/>
        <span>x +</span>
        <Slot id="q" st={st} label="המספר בסוגריים" lock={step>1} onEnter={check1}/>
        <span>) = 0</span>
      </div>
      {step===1&&<>
        <div className="qs-tip">מספר שלילי כותבים עם מינוס, למשל <span dir="ltr" className="qs-ltr">−3</span>. אם לפני x אין מספר, המקדם הוא 1.</div>
        <div className="qs-act"><button className="btn-next" onClick={check1}>בדוק ✓</button></div>
      </>}
      {step>=2&&<>
        <div className="qs-res" dir="ltr">x · ({inner}) = 0</div>
        <div className="qs-sub"><span className="qs-n">2</span><span>מכפלה שווה 0 רק כשאחד הגורמים שווה 0. לכן <span dir="ltr" className="qs-ltr">x = 0</span>, או <span dir="ltr" className="qs-ltr">{inner} = 0</span>.</span></div>
        <div className="qs-line" dir="ltr">
          <span>x<sub>1</sub> = 0</span><span className="qs-gap">,</span><span>x<sub>2</sub> =</span>
          <Slot id="r" st={st} label="הפתרון השני" lock={step>2} onEnter={check2}/>
        </div>
        {step===2&&<div className="qs-act"><button className="btn-next" onClick={check2}>בדוק ✓</button></div>}
      </>}
      {err&&<div className="err-msg">{err}</div>}
      {step===3&&<Done>x = 0 &nbsp;או&nbsp; x = <Val n={-b} d={a}/></Done>}
    </div>
  );
}

// b = 0: ax² + c = 0 → x² = −c/a → x = ±√
function SolveNoB({a,c,n=4}){
  const st=useSlots({s:'',r:''});
  const{v,marks,setMarks,err,setErr}=st;
  const[step,setStep]=useState(1);
  const sq=-c/a, r=sq>=0?Math.sqrt(sq):NaN;
  function check1(){
    if(v.s.trim()===''){setErr('כתבו למה שווה x².');return}
    if(same(num(v.s),sq)){setMarks({...marks,s:'ok'});setStep(sq<0?3:2);setErr('')}
    else{setMarks({...marks,s:'bad'});setErr(same(num(v.s),-sq)?'כמעט: בדקו את הסימן. איזו פעולה הפוכה מבטלת את המספר?':'בדקו שוב: מוסיפים או מחסרים את המספר משני האגפים, ואז מחלקים את שני האגפים במקדם של x².')}
  }
  function check2(){
    if(v.r.trim()===''){setErr('כתבו את השורש.');return}
    if(same(Math.abs(num(v.r)),r)){setMarks({...marks,r:'ok'});setStep(3);setErr('')}
    else{setMarks({...marks,r:'bad'});setErr('בדקו שוב: איזה מספר בריבוע נותן '+fmtN(sq)+'?')}
  }
  return(
    <div className="card qs4">
      <div className="card-title">שלב {n} — בידוד x²</div>
      <div className="p2-eq" dir="ltr">{polyStr(a,0,c)} = 0</div>
      <div className="qs-sub"><span className="qs-n">1</span><span>מבודדים את x² בפעולות הפוכות: מבטלים את המספר בשני האגפים, ואז מחלקים במקדם של x². למה שווה x²?</span></div>
      <div className="qs-line" dir="ltr">
        <span>x² =</span>
        <Slot id="s" st={st} label="x בריבוע שווה" lock={step>1} onEnter={check1}/>
      </div>
      {step===1&&<div className="qs-act"><button className="btn-next" onClick={check1}>בדוק ✓</button></div>}
      {step>=2&&sq>=0&&<>
        <div className="qs-sub"><span className="qs-n">2</span><span>מוציאים שורש. יש שני פתרונות: חיובי ושלילי.</span></div>
        <div className="qs-line" dir="ltr">
          <span>x = ±</span>
          <Slot id="r" st={st} label="השורש" lock={step>2} onEnter={check2}/>
        </div>
        {step===2&&<div className="qs-act"><button className="btn-next" onClick={check2}>בדוק ✓</button></div>}
      </>}
      {err&&<div className="err-msg">{err}</div>}
      {step===3&&sq>=0&&<Done>x = {fmtN(r)} &nbsp;או&nbsp; x = {fmtN(-r)}</Done>}
      {step===3&&sq<0&&<div className="qs-none">ריבוע של מספר אף פעם לא שלילי, ולכן למשוואה אין פתרון.</div>}
    </div>
  );
}

// No zero coefficient: the root formula as a template. The student places a, b, c; the computer calculates.
function FormulaTemplate({a,b,c,n=4}){
  const st=useSlots({b1:'',b2:'',a1:'',c1:'',a2:''});
  const{v,setMarks,err,setErr}=st;
  const[ok,setOk]=useState(false);
  const[rev,setRev]=useState(0);
  const want={b1:b,b2:b,a1:a,c1:c,a2:a};
  const name={b1:'b',b2:'b',a1:'a',c1:'c',a2:'a'};
  function check(){
    const keys=Object.keys(want);
    if(keys.some(k=>v[k].trim()==='')){
      const m={};keys.forEach(k=>{if(v[k].trim()!=='')m[k]=num(v[k])===want[k]?'ok':'bad'});
      setMarks(m);setErr('יש עוד מקומות ריקים. מלאו את כל חמשת המקומות.');return;
    }
    const m={};keys.forEach(k=>{m[k]=num(v[k])===want[k]?'ok':'bad'});
    setMarks(m);
    const bad=keys.filter(k=>m[k]==='bad');
    if(!bad.length){setOk(true);setErr('');return}
    const sign=bad.find(k=>num(v[k])===-want[k]);
    setErr((bad.length===1?'מקום אחד לא נכון (מסומן באדום).':bad.length+' מקומות לא נכונים (מסומנים באדום).')+' '
      +(sign?'שימו לב לסימן: '+name[sign]+' = '+fmtN(want[sign])+(want[sign]<0?', וכותבים אותו יחד עם המינוס.':', בלי מינוס.'):'בכל מקום כותבים את המקדם שהאות שלו מופיעה שם: a, b או c.'));
  }
  const slot=k=><Slot key={k} id={k} st={st} ph={name[k]} label={'המקום של '+name[k]} lock={ok} onEnter={check}/>;

  // the computer's part: Δ, its root, and the two solutions
  const D=b*b-4*a*c, den=2*a, sq=D>=0?Math.sqrt(D):NaN, whole=Number.isInteger(sq);
  const fac=4*a*c;
  const steps=[
    <div className="qs-step" key="d">
      <div className="qs-step-t">מחשבים את מה שמתחת לשורש. קוראים לו דיסקרימיננטה, ומסמנים Δ:</div>
      <div className="qs-step-m" dir="ltr"><span>Δ = {par(b)}² − 4·{par(a)}·{par(c)}</span><span>= {b*b} {fac<0?'+':'−'} {Math.abs(fac)}</span><span>= <b className="qs-hl">{fmtN(D)}</b></span></div>
    </div>
  ];
  let done=null;
  if(D<0){
    steps.push(<div className="qs-step none" key="n"><div className="qs-step-t">Δ שלילי, ואי אפשר להוציא שורש ממספר שלילי. לכן למשוואה אין פתרון.</div></div>);
  }else if(D===0){
    steps.push(<div className="qs-step sol" key="o">
      <div className="qs-step-t">Δ = 0, ולכן ± לא משנה דבר ויש פתרון אחד:</div>
      <div className="qs-step-m" dir="ltr"><span>x =</span><Frac n={fmtN(-b)} d={fmtN(den)}/><span>= <b className="qs-sol"><Val n={-b} d={den}/></b></span></div>
    </div>);
    done=<Done>x = <Val n={-b} d={den}/></Done>;
  }else{
    steps.push(<div className="qs-step" key="s">
      <div className="qs-step-t">מוציאים שורש:</div>
      <div className="qs-step-m" dir="ltr"><Root>{D}</Root><span>{whole?'=':'≈'} <b className="qs-hl">{whole?sq:sq.toFixed(2)}</b></span></div>
    </div>);
    const line=(i,sg)=>{
      const n=sg>0?-b+sq:-b-sq;
      return <div className="qs-step-m" dir="ltr" key={i}><span>x<sub>{i}</sub> =</span><Frac n={`${fmtN(-b)} ${sg>0?'+':'−'} ${whole?sq:sq.toFixed(2)}`} d={fmtN(den)}/>
        {whole?<><span>=</span><Frac n={fmtN(n)} d={fmtN(den)}/><span>= <b className="qs-sol"><Val n={n} d={den}/></b></span></>
              :<span>≈ <b className="qs-sol">{fmtN(Math.round(n/den*100)/100)}</b></span>}</div>;
    };
    steps.push(<div className="qs-step sol" key="x">
      <div className="qs-step-t">מציבים בנוסחה פעמיים: פעם עם + ופעם עם −.</div>
      {line(1,1)}{line(2,-1)}
    </div>);
    done=whole?<Done>x = <Val n={-b+sq} d={den}/> &nbsp;או&nbsp; x = <Val n={-b-sq} d={den}/></Done>
              :<Done>x ≈ {fmtN(Math.round((-b+sq)/den*100)/100)} &nbsp;או&nbsp; x ≈ {fmtN(Math.round((-b-sq)/den*100)/100)}</Done>;
  }
  const last=rev>=steps.length-1;
  return(
    <div className="card qs4">
      <div className="card-title">שלב {n} — נוסחת השורשים</div>
      <FormulaInfo/>
      <div className="p2-eq" dir="ltr">{polyStr(a,b,c)} = 0</div>
      <div className="qs-sub"><span className="qs-n">1</span><span>הציבו את המקדמים בנוסחה. בכל מקום כתובה האות שצריכה להיכנס אליו.</span></div>
      <div className="qs-chips" dir="ltr"><span>a = {fmtN(a)}</span><span>b = {fmtN(b)}</span><span>c = {fmtN(c)}</span></div>
      <div className="qs-template" dir="ltr">
        <span className="qs-x">x<sub>1,2</sub> =</span>
        <Frac n={<>−({slot('b1')}) ± <Root>({slot('b2')})<sup>2</sup> − 4·({slot('a1')})·({slot('c1')})</Root></>} d={<>2·({slot('a2')})</>}/>
      </div>
      {!ok&&<>
        <div className="qs-tip">מספר שלילי כותבים עם מינוס, למשל <span dir="ltr" className="qs-ltr">−3</span>.</div>
        <div className="qs-act"><button className="btn-next" onClick={check}>בדוק הצבה ✓</button></div>
      </>}
      {err&&<div className="err-msg">{err}</div>}
      {ok&&<>
        <div className="qs-sub"><span className="qs-n">2</span><span>ההצבה נכונה. מכאן המחשב מחשב, שלב אחרי שלב:</span></div>
        <div className="qs-steps">{steps.slice(0,rev+1)}</div>
        {!last&&<div className="qs-act"><button className="btn-rev" onClick={()=>setRev(r=>r+1)}>הצג שלב הבא →</button></div>}
        {last&&done}
        {last&&D<0&&<div className="qs-none">למשוואה אין פתרון.</div>}
      </>}
    </div>
  );
}

/* ── Chapters (fixes board #61): one case at a time, explanation → "הבנתי" → practice ─── */
const QS_CH=['1. משוואה פשוטה','2. גורם משותף','3. בידוד x²','4. נוסחת השורשים','5. סיכום ותרגול'];
const QS_KIND={2:'c0',3:'b0',4:'none',5:'mix'};
const QS_KEY='qs-learned';
function loadLearned(){try{return JSON.parse(localStorage.getItem(QS_KEY))||{}}catch(e){return{}}}
function saveLearned(o){try{localStorage.setItem(QS_KEY,JSON.stringify(o))}catch(e){}}

// one worked-example step: the words, then the maths line(s)
function ExStep({t,children}){return <li><span>{t}</span>{children}</li>}
function ExM({children}){return <div className="qs-exm" dir="ltr">{children}</div>}
function Form({children}){return <div className="qs-form" dir="ltr">{children}</div>}

// a = 0: no x² is left, so it is a simple (linear) equation
function SimpleBody(){
  return(<>
    <p>במשוואה ריבועית יש <M>x²</M>. אבל לפעמים, אחרי שמסדרים את המשוואה, ה-<M>x²</M> נעלם <M>(a = 0)</M>. אז זו <b>משוואה פשוטה</b>, ופותרים אותה כמו בפרק פתרון משוואות: בפעולות הפוכות על שני האגפים.</p>
    <Form>bx + c = 0</Form>
    <div className="qs-ex-title">דוגמה פתורה: <M>x² + 2x − 6 = x² + 4</M></div>
    <ol className="qs-ex">
      <ExStep t="מחסרים x² משני האגפים:"><ExM>x² + 2x − 6 − x² = x² + 4 − x²</ExM></ExStep>
      <ExStep t="מפשטים. אין יותר x², ולכן זו משוואה פשוטה:"><ExM>2x − 6 = 4</ExM></ExStep>
      <ExStep t="מוסיפים 6 לשני האגפים:"><ExM>2x = 10</ExM></ExStep>
      <ExStep t="מחלקים את שני האגפים ב-2:"><ExM>x = 5</ExM></ExStep>
      <ExStep t="בודקים: מציבים 5 בשני האגפים ומקבלים אותו מספר."><ExM>5² + 2·5 − 6 = 29 ,  5² + 4 = 29</ExM></ExStep>
    </ol>
  </>);
}
// c = 0: common factor
function CommonBody(){
  return(<>
    <p>כשאין מספר חופשי <M>(c = 0)</M>, אחרי הסידור המשוואה נראית כך:</p>
    <Form>ax² + bx = 0</Form>
    <p>בכל איבר יש x, ולכן <b>מוציאים x כגורם משותף</b>. מכפלה שווה 0 רק כשאחד הגורמים שווה 0, ולכן מקבלים שתי משוואות פשוטות.</p>
    <div className="qs-ex-title">דוגמה פתורה: <M>x² + 3x = 5x</M></div>
    <ol className="qs-ex">
      <ExStep t="מסדרים: מחסרים 5x משני האגפים ומפשטים."><ExM>x² − 2x = 0</ExM></ExStep>
      <ExStep t={<>אין מספר חופשי <M>(c = 0)</M>. מוציאים x כגורם משותף:</>}><ExM>x(x − 2) = 0</ExM></ExStep>
      <ExStep t="מכפלה שווה 0, ולכן אחד הגורמים שווה 0:"><ExM>x = 0 <span className="qs-or">או</span> x − 2 = 0</ExM></ExStep>
      <ExStep t="פותרים את המשוואה הפשוטה (מוסיפים 2 לשני האגפים):"><ExM>x = 0 ,  x = 2</ExM></ExStep>
      <ExStep t="בודקים את 2:"><ExM>2² + 3·2 = 10 ,  5·2 = 10</ExM></ExStep>
    </ol>
    <div className="qs-ex-title">עוד דוגמה: <M>3x² + 12x = 0</M></div>
    <ol className="qs-ex">
      <ExStep t="מוציאים x כגורם משותף:"><ExM>x(3x + 12) = 0</ExM></ExStep>
      <ExStep t={<><M>x = 0</M>, או שהסוגריים שווים 0:</>}><ExM>3x + 12 = 0  →  3x = −12  →  x = −4</ExM></ExStep>
    </ol>
    <p className="qs-calc"><b>שימו לב:</b> כש-<M>c = 0</M>, אחד הפתרונות הוא תמיד <M>x = 0</M>. לא מחלקים את המשוואה ב-x, כי כך הפתרון <M>x = 0</M> הולך לאיבוד.</p>
  </>);
}
// b = 0: isolate x², then the square root (two answers)
function NoBBody(){
  return(<>
    <p>כשאין איבר עם x <M>(b = 0)</M>, אחרי הסידור המשוואה נראית כך:</p>
    <Form>ax² + c = 0</Form>
    <p><b>מבודדים את x²</b> בפעולות הפוכות, ואז מוציאים שורש. לשני מספרים יש אותו ריבוע, חיובי ושלילי, ולכן יש שני פתרונות.</p>
    <div className="qs-ex-title">דוגמה פתורה: <M>2x² − 18 = 0</M></div>
    <ol className="qs-ex">
      <ExStep t="מוסיפים 18 לשני האגפים:"><ExM>2x² = 18</ExM></ExStep>
      <ExStep t="מחלקים את שני האגפים ב-2:"><ExM>x² = 9</ExM></ExStep>
      <ExStep t={<>מוציאים שורש. יש שני פתרונות, כי <M>3² = 9</M> וגם <M>(−3)² = 9</M></>}><ExM>x = 3 ,  x = −3</ExM></ExStep>
    </ol>
    <div className="qs-ex-title">מקרים מיוחדים</div>
    <ol className="qs-ex">
      <ExStep t="יוצא x² שווה למספר שלילי: אין פתרון, כי ריבוע של מספר אף פעם לא שלילי."><ExM>x² + 4 = 0  →  x² = −4</ExM></ExStep>
      <ExStep t={<>גם <M>c = 0</M>: הפתרון היחיד הוא 0.</>}><ExM>5x² = 0  →  x = 0</ExM></ExStep>
    </ol>
  </>);
}
// no zero coefficient: the root formula
function FormulaLessonBody(){
  return(<>
    <p>כשיש גם <M>x²</M>, גם x וגם מספר חופשי (<M>a</M>, <M>b</M> ו-<M>c</M> שונים מ-0), משתמשים ב<b>נוסחת השורשים</b>.</p>
    <FormulaBody/>
    <p>המספר שמתחת לשורש, <M>b² − 4ac</M>, אומר כמה פתרונות יש: אם הוא חיובי יש שני פתרונות, אם הוא 0 יש פתרון אחד, ואם הוא שלילי אין פתרון.</p>
  </>);
}
// the summary: all four cases on one screen, 2 × 2
function SummaryBody({onGo}){
  const Q=({i,t,form,how,children})=>(
    <div className={'qs-q q'+i}>
      <div className="qs-q-h"><span className="qs-q-n">{i}</span><b>{t}</b></div>
      <div className="qs-q-f" dir="ltr">{form}</div>
      <div className="qs-q-how">{how}</div>
      <div className="qs-q-ex" dir="ltr">{children}</div>
      {onGo&&<button type="button" className="qs-q-go" onClick={()=>onGo(i)}>לפרק {i} ←</button>}
    </div>
  );
  return(<>
    <p className="qs-sum-intro">תמיד מתחילים בסידור: <M>ax² + bx + c = 0</M>. אחר כך בודקים איזה מקדם שווה 0, ובוחרים דרך:</p>
    <div className="qs-sum">
      <Q i={1} t={<>משוואה פשוטה <M>a = 0</M></>} form="bx + c = 0" how="אין x². פותרים בפעולות הפוכות, כמו בפרק פתרון משוואות.">
        <div>2x − 6 = 0</div><div>2x = 6</div><div className="qs-q-r">x = 3</div>
      </Q>
      <Q i={2} t={<>גורם משותף <M>c = 0</M></>} form="ax² + bx = 0" how="מוציאים x כגורם משותף. פתרון אחד הוא תמיד 0.">
        <div>x² − 5x = 0</div><div>x(x − 5) = 0</div><div className="qs-q-r">x = 0 , x = 5</div>
      </Q>
      <Q i={3} t={<>בידוד x² <M>b = 0</M></>} form="ax² + c = 0" how="מבודדים את x² ומוציאים שורש: פתרון חיובי ופתרון שלילי.">
        <div>x² − 9 = 0</div><div>x² = 9</div><div className="qs-q-r">x = 3 , x = −3</div>
      </Q>
      <Q i={4} t="נוסחת השורשים" form="ax² + bx + c = 0" how="אף מקדם לא 0. מציבים את a, b ו-c בנוסחה:">
        <div className="qs-q-fx"><span>x<sub>1,2</sub> =</span><Frac n={<>−b ± <Root>b² − 4ac</Root></>} d="2a"/></div>
        <div>x² − 5x + 6 = 0</div><div className="qs-q-r">x = 3 , x = 2</div>
      </Q>
    </div>
  </>);
}

const QS_LESSON={
  1:{t:'משוואה פשוטה: כשאין x²',B:SimpleBody},
  2:{t:<>גורם משותף: כשאין מספר חופשי <M>(c = 0)</M></>,B:CommonBody},
  3:{t:<>בידוד x²: כשאין איבר עם x <M>(b = 0)</M></>,B:NoBBody},
  4:{t:'נוסחת השורשים: כשאף מקדם לא 0',B:FormulaLessonBody},
  5:{t:'סיכום: ארבעת המקרים',B:SummaryBody},
};

function Lesson({ch,learned,onOk,onGo}){
  const{t,B}=QS_LESSON[ch];
  return(
    <div className="card qs-lesson">
      <div className="card-title">{t}</div>
      <div className="qs-info-body qs-lesson-body"><B onGo={onGo}/></div>
      {ch===1&&<a className="qs-link" href="/topics/equation-solver">לתרגול משוואות פשוטות: פרק ״פתרון משוואות״ ←</a>}
      {ch===1&&learned&&<div className="success-banner qs-ch1-done">✅ מעולה! עכשיו למשוואות ריבועיות.<button type="button" className="btn-next" onClick={()=>onGo(2)}>לפרק 2: גורם משותף</button></div>}
      {!(ch===1&&learned)&&<div className="qs-act qs-ok">
        <button type="button" className="btn-next" onClick={onOk}>{ch===1?'הבנתי ✓':ch===5?'הבנתי, לתרגול משולב':'הבנתי, לתרגול'}</button>
      </div>}
    </div>
  );
}

function Practice({kind}){
  const mix=kind==='mix';
  const[eqData,setEqData]=useState(()=>genEq(kind));
  const[phase,setPhase]=useState(1);
  const[stdTerms,setStdTerms]=useState(null);
  const[coeffs,setCoeffs]=useState(null);
  const[route,setRoute]=useState(mix?null:kind);

  function newEq(){
    setEqData(genEq(kind));setPhase(1);setStdTerms(null);setCoeffs(null);setRoute(mix?null:kind);
  }
  function handleNext(terms){setStdTerms(terms);setPhase(2)}
  function handleCoeffs(a,b,c){setCoeffs({a,b,c});setPhase(3)}

  const solveAt=mix?4:3;
  const phaseLabels=mix?['שלב 1: סידור','שלב 2: מקדמים','שלב 3: איזה מקרה?','שלב 4: פתרון']:['שלב 1: סידור','שלב 2: מקדמים','שלב 3: פתרון'];
  return(
    <div>
      <div className="phases">
        {phaseLabels.map((l,i)=>(
          <div key={i} className={`ph${phase===i+1?' active':phase>i+1?' done':''}`}>{l}</div>
        ))}
      </div>
      {phase===1&&<Phase1 key={eqData.key} eqData={eqData} onNext={handleNext}/>}
      {phase===2&&<Phase2 stdTerms={stdTerms} onConfirm={handleCoeffs}/>}
      {mix&&phase===3&&<PickCase a={coeffs.a} b={coeffs.b} c={coeffs.c} onPick={r=>{setRoute(r);setPhase(4)}}/>}
      {phase===solveAt&&route==='c0'&&<SolveCommonFactor n={solveAt} a={coeffs.a} b={coeffs.b}/>}
      {phase===solveAt&&route==='b0'&&<SolveNoB n={solveAt} a={coeffs.a} c={coeffs.c}/>}
      {phase===solveAt&&route==='none'&&<FormulaTemplate n={solveAt} a={coeffs.a} b={coeffs.b} c={coeffs.c}/>}
      <div className="bottom" style={{marginTop:8}}>
        <button className="btn-new" onClick={newEq}>משוואה חדשה 🎲</button>
      </div>
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────────────────────── */
function App(){
  const[ch,setCh]=useState(1);
  const[learned,setLearned]=useState(loadLearned);
  const[tab,setTab]=useState('learn');
  const top=useRef(null);
  const toTop=()=>requestAnimationFrame(()=>{const el=top.current;if(el&&el.getBoundingClientRect().top<0)el.scrollIntoView({behavior:'smooth',block:'start'})});

  function go(i){setCh(i);setTab(i>1&&learned[i]?'practice':'learn');toTop()}
  function ok(i){
    const L={...learned,[i]:true};setLearned(L);saveLearned(L);
    if(i>1){setTab('practice');toTop()}
  }
  const kind=QS_KIND[ch];
  const{t,B}=QS_LESSON[ch];
  return(
    <div className="app">
      <h1>משוואות ריבועיות</h1>
      <p className="sub">כיתה ט׳</p>
      <div className="ch-nav qs-chnav" ref={top}>
        {QS_CH.map((l,i)=><button key={i} type="button" className={`ch-btn ${ch===i+1?'active':''}`} onClick={()=>go(i+1)}>{l}</button>)}
      </div>
      {ch>1&&<div className="sub-tabs">
        <button type="button" className={`sub-tab ${tab==='learn'?'active':''}`} onClick={()=>{setTab('learn')}}>{ch===5?'סיכום':'הסבר ודוגמה'}</button>
        <button type="button" className={`sub-tab ${tab==='practice'?'active':''}`} disabled={!learned[ch]} onClick={()=>setTab('practice')}>{learned[ch]?'':'🔒 '}{ch===5?'תרגול משולב':'תרגול'}</button>
      </div>}
      {ch>1&&!learned[ch]&&<div className="qs-lock">התרגול נפתח אחרי שקוראים את ההסבר ולוחצים ״הבנתי״.</div>}
      {(ch===1||tab==='learn')&&<Lesson ch={ch} learned={!!learned[ch]} onOk={()=>ok(ch)} onGo={go}/>}
      {ch>1&&tab==='practice'&&learned[ch]&&<>
        {kind!=='none'&&<details className="qs-example qs-info">
          <summary><span>תזכורת: {t}</span></summary>
          <div className="qs-info-body"><B/></div>
        </details>}
        <Practice key={ch} kind={kind}/>
      </>}
    </div>
  );
}


// ===== END ORIGINAL =====
export default App;
