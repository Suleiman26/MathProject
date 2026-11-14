'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/equation-solver.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// Chapter 1, "from words to an algebraic expression" (fixes board #70), lives in ./WordsChapter.jsx + ./words.js.
import WordsChapter from './WordsChapter';
// ===== BEGIN ORIGINAL =====

const { useState, useMemo, useEffect, useRef } = React;

/* ── Math ─────────────────────────────────────────────────────────────────── */
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){let t=b;b=a%b;a=t;}return a||1}
function simplify(num,den){if(num===0)return[0,1];if(den<0){num=-num;den=-den;}const g=gcd(Math.abs(num),den);return[num/g,den/g]}
function addFracs(n1,d1,n2,d2){return simplify(n1*d2+n2*d1,d1*d2)}

/* ── Terms ────────────────────────────────────────────────────────────────── */
let _uid=0;const uid=()=>`t${++_uid}`;
function mkTerm(type,num,den=1){const[n,d]=simplify(num,den);return{id:uid(),type,num:n,den:d}}

function sideStr(terms,v='x'){
  if(!terms.length)return'0';
  return terms.map((t,i)=>{
    const abs=Math.abs(t.num);
    const sign=t.num<0?(i===0?'−':' − '):(i===0?'':' + ');
    const frac=t.den===1?`${abs}`:`${abs}/${t.den}`;
    return t.type==='const'?`${sign}${frac}`:`${sign}${abs===t.den?'':frac}${v}`;
  }).join('');
}
function eqStr(eq,v='x'){return`${sideStr(eq.left,v)} = ${sideStr(eq.right,v)}`}

/* ── Operations ───────────────────────────────────────────────────────────── */
/* Apply the SAME operation to both sides of the equation (add/subtract/multiply/divide). */
function doOperate(eq,opType,k,isX){
  const type=isX?'x':'const';
  /* Fixes board #69: the inverse operation cancels its term right away on the side where it
     meets its opposite (2x + 3 − 3 → 2x); only the other side is left for the student to simplify. */
  function addTerm(terms,num){
    const i=terms.findIndex(t=>t.type===type&&t.den===1&&t.num===-num);
    if(i<0)return[...terms,mkTerm(type,num)];
    const rest=terms.filter((_,j)=>j!==i);
    return rest.length?rest:[mkTerm('const',0)];
  }
  function applySide(terms){
    if(opType==='+')return addTerm(terms,k);
    if(opType==='−')return addTerm(terms,-k);
    if(opType==='×')return terms.map(t=>mkTerm(t.type,t.num*k,t.den));
    if(opType==='÷')return terms.map(t=>{const[n,d]=simplify(t.num,t.den*Math.abs(k));return mkTerm(t.type,k<0?-n:n,d)});
    return terms;
  }
  return{left:applySide(eq.left),right:applySide(eq.right)};
}
function opDesc(opType,k,isX,v='x'){
  const q=isX?`${k}${v}`:`${k}`;
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
/* Simplify only the terms the student picked: same family (unknown / numbers), same side. */
function simplifyPicked(eq,sel,v='x'){
  const picked=[];
  for(const side of['left','right'])for(const t of eq[side])if(sel.has(t.id))picked.push({...t,side});
  if(picked.length<2)return null;
  const types=new Set(picked.map(t=>t.type));
  if(types.size>1)return{err:`לא ניתן לפשט איברים שאינם מאותה משפחה (${v}, מספרים)`};
  const sides=new Set(picked.map(t=>t.side));
  if(sides.size>1)return{err:'ניתן לפשט רק איברים שנמצאים באותו אגף'};
  const side=picked[0].side,type=picked[0].type;
  const inSel=eq[side].filter(t=>sel.has(t.id));
  const notSel=eq[side].filter(t=>!sel.has(t.id));
  let rn=0,rd=1;
  for(const t of inSel)[rn,rd]=addFracs(rn,rd,t.num,t.den);
  const newTerms=[...notSel];
  if(rn!==0)newTerms.push(mkTerm(type,rn,rd));
  newTerms.sort((a,b)=>({x:0,const:1}[a.type]-{x:0,const:1}[b.type]));
  return{eq:{...eq,[side]:newTerms.length?newTerms:[mkTerm('const',0)]},picked:inSel};
}
/* After X_ROUNDS equations solved with x, the unknown gets other letters too (it is only a name).
   Letters that look like a digit or a sign (o, l, i, s, z, b, q, g, t) are left out. */
const X_ROUNDS=3;
const LETTERS=['y','a','m','n','k','p','x'];
const DONE_KEY='mp-equation-solver-solved';
function loadDone(){try{return Math.max(0,parseInt(localStorage.getItem(DONE_KEY),10)||0)}catch(e){return 0}}
function saveDone(n){try{localStorage.setItem(DONE_KEY,String(n))}catch(e){}}
function pickLetter(done,prev){
  if(done<X_ROUNDS)return'x';
  const pool=LETTERS.filter(l=>l!==prev);
  return pool[Math.floor(Math.random()*pool.length)];
}
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
function TermPill({term,index,v='x',selected,onPick}){
  const{type,num,den}=term;
  const isNeg=num<0;const abs=Math.abs(num);
  const body=()=>{
    if(type==='const'){
      if(den===1)return<span className="tv">{abs}</span>;
      return<span className="tf"><span className="fn">{abs}</span><span className="fd">{den}</span></span>;
    }
    const showC=!(abs===den);
    const coef=showC?(den===1?<span className="tv">{abs}</span>:<span className="tf"><span className="fn">{abs}</span><span className="fd">{den}</span></span>):null;
    return<>{coef}<span className="tv-x">{v}</span></>;
  };
  return(
    <span className={`tp${onPick?' click':''}${selected?' selected':''}`} onClick={onPick||undefined}
      role={onPick?'button':undefined} tabIndex={onPick?0:undefined} aria-pressed={onPick?!!selected:undefined}
      onKeyDown={onPick?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPick()}}:undefined}>
      {index>0&&<span className="ts">{isNeg?'−':'+'}</span>}
      {index===0&&isNeg&&<span className="ts">−</span>}
      {body()}
    </span>
  );
}

/* ── Live preview: only digits and one leading minus; the pending operation is
     drawn faintly on both sides while typing (nothing changes until ✓) ── */
function cleanNum(v){
  v=v.replace(/[−–]/g,'-').replace(/[^\d-]/g,'');
  const neg=v.startsWith('-');
  return(neg?'-':'')+v.replace(/-/g,'').replace(/^0+(?=\d)/,'').slice(0,3);
}
function PreviewSide({terms,opType,k,isX,v,sel,onPick}){
  const pills=terms.map((t,i)=><TermPill key={t.id} term={t} index={i} v={v} selected={!!sel&&sel.has(t.id)} onPick={onPick?()=>onPick(t.id):null}/>);
  if(k===null)return pills;
  if(opType==='+'||opType==='−'){
    const g={type:isX?'x':'const',num:opType==='+'?k:-k,den:1};
    return<>{pills}<span className="pv-ghost"><TermPill term={g} index={1} v={v}/></span></>;
  }
  const many=terms.length>1;
  return<>
    {many?<span className="pv-group"><span className="pv-ghost pv-par">(</span>{pills}<span className="pv-ghost pv-par">)</span></span>:pills}
    <span className="pv-ghost"><span className="tp"><span className="ts">{opType==='×'?'·':'÷'}</span><span className="tv">{k<0?`(−${-k})`:k}</span></span></span>
  </>;
}

/* ── Operation box (two rendered instances share the same state → mirrored) ── */
const OPS=['+','−','×','÷'];
function OpBox({opType,opVal,opIsX,onOpType,onOpVal,onToggleX,v='x'}){
  const allowX=opType==='+'||opType==='−';
  return(
    <div className="op-box">
      <div className="op-btns">
        {OPS.map(op=><button key={op} className={`op-btn ${opType===op?'active':''}`} onClick={()=>onOpType(op)}>{op}</button>)}
      </div>
      <input className="op-input" value={opVal} onChange={e=>onOpVal(cleanNum(e.target.value))} placeholder="מס׳" inputMode="numeric"/>
      {allowX&&<button className={`op-x-btn ${opIsX?'active':''}`} onClick={onToggleX} title={`הוספה/חיסור של כפולת ${v}`}>{v}</button>}
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────────────────────── */
/* Fixes board #70: chapter 1 (the unknown, algebraic expressions, stories) comes before solving.
   A student who already solved equations here comes back to the solver; the last chapter is remembered. */
const CH_KEY='mp-equation-solver-ch';
function loadCh(done){try{const c=parseInt(localStorage.getItem(CH_KEY),10);if(c===1||c===2)return c}catch(e){}return done>0?2:1}
function App(){
  const[done,setDone]=useState(loadDone);
  const[ch,setChState]=useState(()=>loadCh(done));
  function setCh(c){setChState(c);try{localStorage.setItem(CH_KEY,String(c))}catch(e){}}
  const introSeen=useRef(done>=X_ROUNDS);
  const[app,setApp]=useState(()=>{const eq=genEq();return{initial:eq,current:eq,history:[],v:pickLetter(done,null),counted:false,intro:false}});
  const[opType,setOpType]=useState('+');
  const[opVal,setOpVal]=useState('');
  const[opIsX,setOpIsX]=useState(false);
  const[opErr,setOpErr]=useState('');
  const[sel,setSel]=useState(()=>new Set());

  const{current:cur,history:hist,initial:init,v}=app;
  const solved=useMemo(()=>checkSolved(cur),[cur]);
  const canSimpAny=canSimp(cur.left)||canSimp(cur.right);
  const selCount=sel.size;

  useEffect(()=>{
    if(solved===null||app.counted)return;
    setApp(s=>({...s,counted:true}));
    setDone(n=>{saveDone(n+1);return n+1});
  },[solved,app.counted]);

  // phones: while the on-screen keypad is open, keep the simplify button (and its message) in sight above it
  function keepActionsVisible(){
    requestAnimationFrame(()=>{
      const row=document.querySelector('.action-row'),kp=document.querySelector('.kp:not(.kp-ghost)');
      if(!row||!kp)return;
      const over=row.getBoundingClientRect().bottom+12-kp.getBoundingClientRect().top;
      if(over>0)window.scrollBy({top:over,behavior:'smooth'});
    });
  }
  function togglePick(tid){
    keepActionsVisible();
    setSel(prev=>{const n=new Set(prev);n.has(tid)?n.delete(tid):n.add(tid);return n});
    setOpErr('');
  }

  function setOpValClean(v){setOpVal(v);setOpErr('')}
  function setOpTypeClean(t){setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false)}
  function toggleOpIsX(){setOpIsX(v=>!v);setOpErr('')}

  function applyOp(){
    const v=opVal.trim();
    if(!/^-?\d+$/.test(v)){setOpErr('הזינו מספר שלם');return}
    const k=parseInt(v,10);
    if(k===0){setOpErr('בחרו מספר שאינו אפס');return}
    const isX=opIsX&&(opType==='+'||opType==='−');
    setApp(s=>{const n=doOperate(s.current,opType,k,isX);return{...s,current:n,history:[...s.history,{eq:n,desc:opDesc(opType,k,isX,s.v)}]}});
    setOpVal('');setOpErr('');setOpIsX(false);setSel(new Set());
  }

  function handleSimplify(){
    const r=simplifyPicked(cur,sel,v);
    if(!r)return;
    if(r.err){setOpErr(r.err);keepActionsVisible();return}
    const desc=<>פישוט: {r.picked.map((t,i)=><React.Fragment key={t.id}>{i>0&&' ו-'}<span dir="ltr">{sideStr([t],v)}</span></React.Fragment>)}</>;
    setApp(s=>({...s,current:r.eq,history:[...s.history,{eq:r.eq,desc}]}));
    setSel(new Set());setOpErr('');
  }

  function newEq(){
    const eq=genEq();
    const intro=done>=X_ROUNDS&&!introSeen.current;
    if(intro)introSeen.current=true;
    setApp(s=>({initial:eq,current:eq,history:[],v:pickLetter(done,s.v),counted:false,intro}));
    setOpVal('');setOpErr('');setOpType('+');setOpIsX(false);setSel(new Set());
  }
  function resetEq(){setApp(s=>({...s,current:s.initial,history:[]}));setOpVal('');setOpErr('');setOpType('+');setOpIsX(false);setSel(new Set())}

  const renderTerms=(terms)=>terms.map((t,i)=><TermPill key={t.id} term={t} index={i}/>);
  const pvK=/^-?\d+$/.test(opVal)&&parseInt(opVal,10)!==0?parseInt(opVal,10):null;
  const pvX=opIsX&&(opType==='+'||opType==='−');

  return(
    <div>
      <div className="hdr">
        <h1>פתרון משוואות בנעלם אחד</h1>
        <span className="hdr-sub">כיתה ז׳</span>
        <div className="ch-nav">
          <button className={`ch-btn ${ch===1?'active':''}`} onClick={()=>setCh(1)}>1. ביטוי אלגברי</button>
          <button className={`ch-btn ${ch===2?'active':''}`} onClick={()=>setCh(2)}>2. פתרון משוואות</button>
        </div>
      </div>
      {ch===1&&<WordsChapter/>}
      {ch===2&&<div className="content">

        {solved!==null&&(
          <div className="banner">
            🎉 כל הכבוד! פתרת את המשוואה
            <div className="s-val">{v} = {solved}</div>
          </div>
        )}

        {app.intro&&(
          <div className="info-box var-note">
            <b>שימו לב: מעכשיו הנעלם לא תמיד יהיה x</b>
            <p>האות היא רק סימון למספר שמחפשים. במשוואה הזו הנעלם הוא <span dir="ltr" className="var-letter">{v}</span> — פותרים בדיוק באותה דרך.</p>
          </div>
        )}

        <div className="card">
          {!app.intro&&v!=='x'&&<div className="var-line">הנעלם במשוואה הזו הוא <span dir="ltr" className="var-letter">{v}</span> — האות היא רק סימון, פותרים בדיוק כמו עם x</div>}
          {solved===null&&<div className="hint">בצעו את אותה פעולה על שני אגפי המשוואה — בחיבור/חיסור ניתן גם להוסיף כפולת {v} (כפתור {v})</div>}

          <div className="solve-grid">
            {solved===null&&<>
              <div className="g-left"><OpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX} v={v}/></div>
              <div className="g-mid"></div>
              <div className="g-right"><OpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX} v={v}/></div>
            </>}

            <div className="g-left side-zone"><PreviewSide terms={cur.left} opType={opType} k={solved===null?pvK:null} isX={pvX} v={v} sel={sel} onPick={solved===null?togglePick:null}/></div>
            <span className="g-mid eq-sign">=</span>
            <div className="g-right side-zone"><PreviewSide terms={cur.right} opType={opType} k={solved===null?pvK:null} isX={pvX} v={v} sel={sel} onPick={solved===null?togglePick:null}/></div>
          </div>

          {solved===null&&(canSimpAny||selCount>0)&&(
            <div className="hint simp-hint">{selCount===0?'לפישוט: לחצו על איברים מאותה משפחה באותו אגף, ואז על פשט'
              :selCount===1?'איבר אחד נבחר — בחרו עוד איבר מאותה משפחה'
              :`${selCount} איברים נבחרו — לחצו פשט לאיחוד`}</div>
          )}

          {opErr&&<div className="fb err">{opErr}</div>}

          {solved===null&&(
            <div className="action-row">
              <button className="btn bp" onClick={applyOp}>✓ אישור</button>
              <button className="btn" disabled={selCount<2} onClick={handleSimplify}>פשט{selCount>=2?` (${selCount})`:' ≡'}</button>
            </div>
          )}
        </div>

        {hist.length>0&&(
          <div className="card">
            <div className="hist-label">שלבי הפתרון</div>
            {[{eq:init,desc:'משוואה מקורית'},...hist].map((s,i)=>(
              <div className="h-row" key={i}>
                <span className="h-num">{i+1}</span>
                <span className="h-eq">{eqStr(s.eq,v)}</span>
                <span className="h-desc">{s.desc}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bottom">
          <button className="btn bp" onClick={newEq}>משוואה חדשה 🎲</button>
          <button className="btn" onClick={resetEq}>התחל מחדש ↺</button>
        </div>
      </div>}
    </div>
  );
}


// ===== END ORIGINAL =====
export default App;
