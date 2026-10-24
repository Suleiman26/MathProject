'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/equation-solver.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const { useState, useMemo } = React;

/* ── Math ─────────────────────────────────────────────────────────────────── */
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){let t=b;b=a%b;a=t;}return a||1}
function simplify(num,den){if(num===0)return[0,1];if(den<0){num=-num;den=-den;}const g=gcd(Math.abs(num),den);return[num/g,den/g]}
function addFracs(n1,d1,n2,d2){return simplify(n1*d2+n2*d1,d1*d2)}

/* ── Terms ────────────────────────────────────────────────────────────────── */
let _uid=0;const uid=()=>`t${++_uid}`;
function mkTerm(type,num,den=1){const[n,d]=simplify(num,den);return{id:uid(),type,num:n,den:d}}

function sideStr(terms){
  if(!terms.length)return'0';
  return terms.map((t,i)=>{
    const abs=Math.abs(t.num);
    const sign=t.num<0?(i===0?'−':' − '):(i===0?'':' + ');
    const frac=t.den===1?`${abs}`:`${abs}/${t.den}`;
    return t.type==='const'?`${sign}${frac}`:`${sign}${abs===t.den?'':frac}x`;
  }).join('');
}
function eqStr(eq){return`${sideStr(eq.left)} = ${sideStr(eq.right)}`}

/* ── Operations ───────────────────────────────────────────────────────────── */
/* Apply the SAME operation to both sides of the equation (add/subtract/multiply/divide). */
function doOperate(eq,opType,k,isX){
  const type=isX?'x':'const';
  function applySide(terms){
    if(opType==='+')return[...terms,mkTerm(type,k)];
    if(opType==='−')return[...terms,mkTerm(type,-k)];
    if(opType==='×')return terms.map(t=>mkTerm(t.type,t.num*k,t.den));
    if(opType==='÷')return terms.map(t=>{const[n,d]=simplify(t.num,t.den*Math.abs(k));return mkTerm(t.type,k<0?-n:n,d)});
    return terms;
  }
  return{left:applySide(eq.left),right:applySide(eq.right)};
}
function opDesc(opType,k,isX){
  const q=isX?`${k}x`:`${k}`;
  const labels={'+':`הוספת ${q}`,'−':`חיסור ${q}`,'×':`כפל ב-${k}`,'÷':`חילוק ב-${k}`};
  return `${labels[opType]} משני האגפים`;
}
function doSimplify(terms){
  let xn=0,xd=1,cn=0,cd=1;
  for(const t of terms){if(t.type==='x')[xn,xd]=addFracs(xn,xd,t.num,t.den);else[cn,cd]=addFracs(cn,cd,t.num,t.den)}
  const r=[];
  if(xn!==0)r.push(mkTerm('x',xn,xd));
  if(cn!==0)r.push(mkTerm('const',cn,cd));
  return r.length?r:[mkTerm('const',0)];
}
function canSimp(terms){return terms.filter(t=>t.type==='x').length>1||terms.filter(t=>t.type==='const').length>1}
function checkSolved(eq){
  const isX=t=>t.type==='x'&&t.num===1&&t.den===1;
  const isC=t=>t.type==='const'&&t.den===1;
  if(eq.left.length===1&&isX(eq.left[0])&&eq.right.length===1&&isC(eq.right[0]))return eq.right[0].num;
  if(eq.right.length===1&&isX(eq.right[0])&&eq.left.length===1&&isC(eq.left[0]))return eq.left[0].num;
  return null;
}
function genEq(){
  for(let i=0;i<300;i++){
    const n=(Math.floor(Math.random()*9)+1)*(Math.random()<.5?1:-1);
    const a=Math.floor(Math.random()*4)+1;
    const c=Math.floor(Math.random()*a);
    const b=Math.floor(Math.random()*11)-5;
    const d=b+n*(a-c);
    if(Math.abs(d)>18)continue;
    const left=[mkTerm('x',a)];
    if(b!==0)left.push(mkTerm('const',b));
    const right=[];
    if(c!==0)right.push(mkTerm('x',c));
    if(d!==0)right.push(mkTerm('const',d));
    if(!right.length)right.push(mkTerm('const',0));
    if(left.length+right.length<3)continue;
    return{left,right};
  }
  return{left:[mkTerm('x',3),mkTerm('const',-2)],right:[mkTerm('x',1),mkTerm('const',4)]};
}

/* ── TermPill (static display) ───────────────────────────────────────────── */
function TermPill({term,index}){
  const{type,num,den}=term;
  const isNeg=num<0;const abs=Math.abs(num);
  const body=()=>{
    if(type==='const'){
      if(den===1)return<span className="tv">{abs}</span>;
      return<span className="tf"><span className="fn">{abs}</span><span className="fd">{den}</span></span>;
    }
    const showC=!(abs===den);
    const coef=showC?(den===1?<span className="tv">{abs}</span>:<span className="tf"><span className="fn">{abs}</span><span className="fd">{den}</span></span>):null;
    return<>{coef}<span className="tv-x">x</span></>;
  };
  return(
    <span className="tp">
      {index>0&&<span className="ts">{isNeg?'−':'+'}</span>}
      {index===0&&isNeg&&<span className="ts">−</span>}
      {body()}
    </span>
  );
}

/* ── Operation box (two rendered instances share the same state → mirrored) ── */
const OPS=['+','−','×','÷'];
function OpBox({opType,opVal,opIsX,onOpType,onOpVal,onToggleX}){
  const allowX=opType==='+'||opType==='−';
  return(
    <div className="op-box">
      <div className="op-btns">
        {OPS.map(op=><button key={op} className={`op-btn ${opType===op?'active':''}`} onClick={()=>onOpType(op)}>{op}</button>)}
      </div>
      <input className="op-input" value={opVal} onChange={e=>onOpVal(e.target.value)} placeholder="מס׳" inputMode="numeric"/>
      {allowX&&<button className={`op-x-btn ${opIsX?'active':''}`} onClick={onToggleX} title="הוספה/חיסור של כפולת x">x</button>}
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────────────────────── */
function App(){
  const[app,setApp]=useState(()=>{const eq=genEq();return{initial:eq,current:eq,history:[]}});
  const[opType,setOpType]=useState('+');
  const[opVal,setOpVal]=useState('');
  const[opIsX,setOpIsX]=useState(false);
  const[opErr,setOpErr]=useState('');

  const{current:cur,history:hist,initial:init}=app;
  const solved=useMemo(()=>checkSolved(cur),[cur]);
  const canSimpAny=canSimp(cur.left)||canSimp(cur.right);

  function setOpValClean(v){setOpVal(v);setOpErr('')}
  function setOpTypeClean(t){setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false)}
  function toggleOpIsX(){setOpIsX(v=>!v);setOpErr('')}

  function applyOp(){
    const v=opVal.trim();
    if(!/^-?\d+$/.test(v)){setOpErr('הזינו מספר שלם');return}
    const k=parseInt(v,10);
    if(k===0){setOpErr('בחרו מספר שאינו אפס');return}
    const isX=opIsX&&(opType==='+'||opType==='−');
    setApp(s=>{const n=doOperate(s.current,opType,k,isX);return{...s,current:n,history:[...s.history,{eq:n,desc:opDesc(opType,k,isX)}]}});
    setOpVal('');setOpErr('');setOpIsX(false);
  }

  function handleSimplify(){
    setApp(s=>{
      const left=canSimp(s.current.left)?doSimplify(s.current.left):s.current.left;
      const right=canSimp(s.current.right)?doSimplify(s.current.right):s.current.right;
      return{...s,current:{left,right},history:[...s.history,{eq:{left,right},desc:'פישוט'}]};
    });
  }

  function newEq(){const eq=genEq();setApp({initial:eq,current:eq,history:[]});setOpVal('');setOpErr('');setOpType('+');setOpIsX(false)}
  function resetEq(){setApp(s=>({...s,current:s.initial,history:[]}));setOpVal('');setOpErr('');setOpType('+');setOpIsX(false)}

  const renderTerms=(terms)=>terms.map((t,i)=><TermPill key={t.id} term={t} index={i}/>);

  return(
    <div>
      <div className="hdr">
        <h1>פתרון משוואות בנעלם אחד</h1>
        <span className="hdr-sub">כיתה ז׳</span>
      </div>
      <div className="content">

        {solved!==null&&(
          <div className="banner">
            🎉 כל הכבוד! פתרת את המשוואה
            <div className="s-val">x = {solved}</div>
          </div>
        )}

        <div className="card">
          {solved===null&&<div className="hint">בצעו את אותה פעולה על שני אגפי המשוואה — בחיבור/חיסור ניתן גם להוסיף כפולת x (כפתור x)</div>}

          <div className="solve-grid">
            {solved===null&&<>
              <div className="g-left"><OpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
              <div className="g-mid"></div>
              <div className="g-right"><OpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
            </>}

            <div className="g-left side-zone">{renderTerms(cur.left)}</div>
            <span className="g-mid eq-sign">=</span>
            <div className="g-right side-zone">{renderTerms(cur.right)}</div>
          </div>

          {opErr&&<div className="fb err">{opErr}</div>}

          {solved===null&&(
            <div className="action-row">
              <button className="btn bp" onClick={applyOp}>✓ אישור</button>
              <button className="btn" disabled={!canSimpAny} onClick={handleSimplify}>פשט ≡</button>
            </div>
          )}
        </div>

        {hist.length>0&&(
          <div className="card">
            <div className="hist-label">שלבי הפתרון</div>
            {[{eq:init,desc:'משוואה מקורית'},...hist].map((s,i)=>(
              <div className="h-row" key={i}>
                <span className="h-num">{i+1}</span>
                <span className="h-eq">{eqStr(s.eq)}</span>
                <span className="h-desc">{s.desc}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bottom">
          <button className="btn bp" onClick={newEq}>משוואה חדשה 🎲</button>
          <button className="btn" onClick={resetEq}>התחל מחדש ↺</button>
        </div>
      </div>
    </div>
  );
}


// ===== END ORIGINAL =====
export default App;
