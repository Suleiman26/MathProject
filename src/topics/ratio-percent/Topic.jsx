'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/ratio-percent.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const {useState, useEffect, useRef, useCallback, useMemo} = React;

/* ═══════ Utilities ═══════ */
function randInt(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function pick(arr){return arr[randInt(0,arr.length-1)];}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a;}
function round2(n){return Math.round(n*100)/100;}

/* ═══════ Equation solving (operation-box method, ported from
   equation-solver.html) — used to solve the equation obtained by
   cross-multiplying a proportion, to find x ═══════ */
let _pqUid=0;const pqUid=()=>`pq${++_pqUid}`;
function pqSimpFrac(num,den){if(num===0)return[0,1];if(den<0){num=-num;den=-den;}const g=gcd(Math.abs(num),den)||1;return[num/g,den/g];}
function pqMkTerm(type,num,den=1){const[n,d]=pqSimpFrac(num,den);return{id:pqUid(),type,num:n,den:d};}
function pqDoOperate(eq,opType,k,isX){
  const type=isX?'x':'const';
  function applySide(terms){
    if(opType==='+')return[...terms,pqMkTerm(type,k)];
    if(opType==='−')return[...terms,pqMkTerm(type,-k)];
    if(opType==='×')return terms.map(t=>pqMkTerm(t.type,t.num*k,t.den));
    if(opType==='÷')return terms.map(t=>{const[n,d]=pqSimpFrac(t.num,t.den*Math.abs(k));return pqMkTerm(t.type,k<0?-n:n,d);});
    return terms;
  }
  return{left:applySide(eq.left),right:applySide(eq.right)};
}
function pqDoSimplify(terms){
  let xn=0,xd=1,cn=0,cd=1;
  for(const t of terms){
    if(t.type==='x'){const[n,d]=pqSimpFrac(xn*t.den+t.num*xd,xd*t.den);xn=n;xd=d;}
    else{const[n,d]=pqSimpFrac(cn*t.den+t.num*cd,cd*t.den);cn=n;cd=d;}
  }
  const r=[];
  if(xn!==0)r.push(pqMkTerm('x',xn,xd));
  if(cn!==0)r.push(pqMkTerm('const',cn,cd));
  return r.length?r:[pqMkTerm('const',0)];
}
function pqCanSimp(terms){return terms.filter(t=>t.type==='x').length>1||terms.filter(t=>t.type==='const').length>1;}
function pqCheckSolved(eq){
  const isX1=t=>t.type==='x'&&t.num===1&&t.den===1;
  const isC=t=>t.type==='const'&&t.den===1;
  if(eq.left.length===1&&isX1(eq.left[0])&&eq.right.length===1&&isC(eq.right[0]))return eq.right[0].num;
  if(eq.right.length===1&&isX1(eq.right[0])&&eq.left.length===1&&isC(eq.left[0]))return eq.left[0].num;
  return null;
}
/* A proportion written in any correct order (Sulaiman, fixes board #87).
   The four boxes of  tl/bl = tr/br  are kept as [tl, bl, tr, br]. An answer is accepted only when
   exactly one box is x, the other three are the question's three numbers, and the equation is TRUE
   for the real answer: tl·br = bl·tr (whole numbers, no rounding). So any correct order passes and
   a wrong one never does. */
function pqReadSlot(v){const s=String(v==null?'':v).trim().toLowerCase();if(s==='x')return'x';return /^\d+$/.test(s)?parseInt(s,10):null;}
function pqCheckProportion(vals,known,ans){
  const s=vals.map(pqReadSlot);
  if(s.some(v=>v===null))return{ok:false,why:'fill'};
  const xs=s.filter(v=>v==='x').length;
  if(xs!==1)return{ok:false,why:xs?'manyx':'nox'};
  const nums=s.filter(v=>v!=='x').sort((p,q)=>p-q),want=[...known].sort((p,q)=>p-q);
  if(nums.length!==want.length||nums.some((v,i)=>v!==want[i]))return{ok:false,why:'nums'};
  const val=s.map(v=>v==='x'?ans:v);
  if(val[0]*val[3]!==val[1]*val[2])return{ok:false,why:'order'};
  return{ok:true,slots:s};
}
const pqXDown=s=>s[1]==='x'||s[3]==='x';
const pqFlip=s=>[s[1],s[0],s[3],s[2]];   // both fractions upside down: still equal
function pqCrossSide(p,q){return p==='x'?[pqMkTerm('x',q)]:q==='x'?[pqMkTerm('x',p)]:[pqMkTerm('const',p*q)];}
function pqCross(s){return{left:pqCrossSide(s[0],s[3]),right:pqCrossSide(s[1],s[2])};}
/* After flipping the fractions (Sulaiman, fixes board #92) x is in a numerator and the student goes
   on with the inverse operation, never cross-multiplying: each fraction becomes one term of the
   equation, kept as written (e.g. 12/3 = x/5), and is solved with the operation box (× 5). */
function pqFracSide(n,d){return n==='x'?[{id:pqUid(),type:'x',num:1,den:d}]:[{id:pqUid(),type:'const',num:n,den:d}];}
function pqAsFracs(s){return{left:pqFracSide(s[0],s[1]),right:pqFracSide(s[2],s[3])};}
const PQ_WHY={
  fill:'מלאו את כל ארבע המשבצות.',
  nox:'כתבו x באחת המשבצות, במקום הגודל שלא ידוע.',
  manyx:'x צריך להופיע רק פעם אחת.',
  nums:'השתמשו בשלושת המספרים מהשאלה, ו-x במקום הגודל שלא ידוע.',
  order:'✗ המשוואה הזאת לא נכונה. בשני השברים צריך לסדר את הגדלים באותו אופן.',
};
function PqFb({fb}){return PQ_WHY[fb]?<div className="fb err">{PQ_WHY[fb]}</div>:<Fb fb={fb}/>;}
/* step 2 before cross-multiplying: the student's own proportion. If x is in a denominator,
   explain (before the button) that both fractions may be turned upside down. */
function PqStart({slots,onFlip,onCross}){
  const down=pqXDown(slots),f=pqFlip(slots);
  return<>
    <div className="ans-row" style={{fontSize:22}}><Frac n={slots[0]} d={slots[1]}/>&nbsp;=&nbsp;<Frac n={slots[2]} d={slots[3]}/></div>
    {down&&<div className="pq-flip">
      <b>x נמצא במכנה.</b> אפשר להפוך את שני השברים: המונה יורד למטה והמכנה עולה למעלה.
      אם שני שברים שווים, גם השברים ההפוכים שלהם שווים, ולכן המשוואה נשארת נכונה, ו-x יעבור למונה:
      <div className="ans-row" style={{fontSize:18,marginTop:6}}><Frac n={f[0]} d={f[1]}/>&nbsp;=&nbsp;<Frac n={f[2]} d={f[3]}/></div>
      <div className="pq-flip-or">אפשר גם לבצע הכפלה בהצלבה בלי להפוך.</div>
    </div>}
    <div className="center pq-start-btns" style={{marginTop:10}}>
      {down&&<button className="btn bp" onClick={onFlip}>⇅ הפוך את השברים</button>}
      <button className="btn bg" onClick={onCross}>✕ בצע הכפלה בהצלבה</button>
    </div>
  </>;
}
function PqTermPill({term,index}){
  const{type,num,den}=term;
  const isNeg=num<0;const abs=Math.abs(num);
  const pillFracStyle={fontSize:16,fontWeight:700,color:'inherit',margin:'0 2px'};
  const body=()=>{
    if(type==='const'){
      if(den===1)return<span className="tv">{abs}</span>;
      return<Frac n={abs} d={den} style={{...pillFracStyle,color:'#134e4a'}}/>;
    }
    if(abs===1&&den>1)return<Frac n={<span className="tv-x" style={{fontSize:'inherit'}}>x</span>} d={den} style={{...pillFracStyle,color:'#134e4a'}}/>;   // x/5 after a flip (#92)
    const showC=!(abs===den);
    return<>{showC&&(den===1?<span className="tv">{abs}</span>:<Frac n={abs} d={den} style={{...pillFracStyle,color:'#134e4a'}}/>)}<span className="tv-x">x</span></>;
  };
  return<span className="tp">{index>0&&<span className="ts">{isNeg?'−':'+'}</span>}{index===0&&isNeg&&<span className="ts">−</span>}{body()}</span>;
}
const PQ_OPS=['+','−','×','÷'];
function PqOpBox({opType,opVal,opIsX,onOpType,onOpVal,onToggleX}){
  const allowX=opType==='+'||opType==='−';
  return<div className="op-box">
    <div className="op-btns">{PQ_OPS.map(op=><button key={op} className={`op-btn ${opType===op?'active':''}`} onClick={()=>onOpType(op)}>{op}</button>)}</div>
    <input className="op-input" value={opVal} onChange={e=>onOpVal(e.target.value)} placeholder="מס׳" inputMode="numeric"/>
    {allowX&&<button className={`op-x-btn ${opIsX?'active':''}`} onClick={onToggleX} title="הוספה/חיסור של כפולת x">x</button>}
  </div>;
}

/* ═══════ Visualizations ═══════ */

/* Pie/Cake */
function PieVis({total, filled, color1='#f59e0b', color2='#e5e7eb'}){
  const slices = [];
  for(let i=0;i<total;i++){
    const a1 = (i/total)*360 - 90;
    const a2 = ((i+1)/total)*360 - 90;
    const r = 70, cx=80, cy=80;
    const x1=cx+r*Math.cos(a1*Math.PI/180), y1=cy+r*Math.sin(a1*Math.PI/180);
    const x2=cx+r*Math.cos(a2*Math.PI/180), y2=cy+r*Math.sin(a2*Math.PI/180);
    const large = (a2-a1)>180?1:0;
    slices.push(<path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
      fill={i<filled?color1:color2} stroke="#fff" strokeWidth="2"/>);
  }
  return <svg viewBox="0 0 160 160" style={{width:140,height:140}}>{slices}</svg>;
}

/* Bar */
function BarVis({total, filled, color1='#3b82f6', color2='#e5e7eb'}){
  const w = 280, h = 36, sw = w/total;
  return <svg viewBox={`0 0 ${w} ${h+20}`} style={{width:Math.min(280,w),height:56}}>
    {Array.from({length:total},(_,i)=>
      <rect key={i} x={i*sw} y={0} width={sw-2} height={h} rx={3}
        fill={i<filled?color1:color2} stroke="#fff" strokeWidth={1}/>
    )}
    <text x={w/2} y={h+16} textAnchor="middle" fontSize="12" fill="#64748b">
      {filled}/{total}
    </text>
  </svg>;
}

/* People */
function PeopleVis({total, filled, color1='#8b5cf6'}){
  const perRow = Math.min(total, 10);
  const rows = Math.ceil(total/perRow);
  const w = perRow*28, h = rows*36;
  return <svg viewBox={`0 0 ${w} ${h}`} style={{width:Math.min(280,w),height:h}}>
    {Array.from({length:total},(_,i)=>{
      const col=i%perRow, row=Math.floor(i/perRow);
      const x=col*28+14, y=row*36+10;
      const c = i<filled?color1:'#d1d5db';
      return <g key={i}>
        <circle cx={x} cy={y} r={7} fill={c}/>
        <line x1={x} y1={y+8} x2={x} y2={y+20} stroke={c} strokeWidth={2.5} strokeLinecap="round"/>
        <line x1={x-5} y1={y+13} x2={x+5} y2={y+13} stroke={c} strokeWidth={2} strokeLinecap="round"/>
      </g>;
    })}
  </svg>;
}

/* Ratio pictures (Sulaiman, fixes board #88): one small drawing per context. Each icon draws
   itself in its own w×h box; k=1 is the first quantity, k=2 the second. */
const RP_STAR=(()=>{const p=[];for(let i=0;i<10;i++){const r=i%2?5:12,a=-Math.PI/2+i*Math.PI/5;p.push(`${(14+r*Math.cos(a)).toFixed(1)},${(14.5+r*Math.sin(a)).toFixed(1)}`);}return p.join(' ');})();
const RP_ICON={
  pencil:{w:22,h:44,draw:(k,c)=><>
    <rect x={7} y={3} width={8} height={5} rx={2} fill="#f9a8d4"/><rect x={7} y={7.5} width={8} height={3} fill="#94a3b8"/>
    <rect x={7} y={10.5} width={8} height={23.5} fill={c}/><rect x={9.6} y={10.5} width={2.2} height={23.5} fill="#fff" opacity={.28}/>
    <polygon points="7,34 15,34 11,42" fill="#fcd9a8"/><polygon points="9.8,38.8 12.2,38.8 11,42" fill="#334155"/></>},
  marble:{w:28,h:28,draw:(k,c)=><>
    <circle cx={14} cy={14} r={11} fill={c}/><path d="M6.5 16 Q12 9 21.5 12.5" stroke="#fff" strokeWidth={2.2} fill="none" opacity={.35} strokeLinecap="round"/>
    <circle cx={10} cy={9.5} r={3} fill="#fff" opacity={.75}/></>},
  bulb:{w:28,h:38,draw:(k,c)=><>
    {k===1&&<circle cx={14} cy={22} r={13} fill="#fde047" opacity={.35}/>}
    <rect x={10} y={4} width={8} height={8} rx={1.5} fill="#64748b"/>
    <circle cx={14} cy={21} r={9} fill={k===1?'#facc15':'#f1f5f9'} stroke={k===1?'#eab308':'#94a3b8'} strokeWidth={1.5}/>
    <path d="M10.5 22 l1.7 -3 l1.8 3 l1.8 -3 l1.7 3" stroke={k===1?'#b45309':'#94a3b8'} strokeWidth={1.3} fill="none"/></>},
  seat:{w:30,h:30,draw:(k,c)=><>
    <rect x={6} y={3} width={18} height={15} rx={4} fill={c}/><rect x={3} y={15} width={24} height={9} rx={3} fill={c}/>
    <rect x={3} y={15} width={24} height={9} rx={3} fill="#000" opacity={k===1?.15:.04}/>
    <rect x={5} y={24} width={3} height={4} fill="#94a3b8"/><rect x={22} y={24} width={3} height={4} fill="#94a3b8"/></>},
  day:{w:34,h:34,draw:k=><>
    <rect x={1.5} y={1.5} width={31} height={31} rx={6} fill="#fff" stroke="#e2e8f0" strokeWidth={1.5}/>
    {k===1?<g stroke="#f59e0b" strokeWidth={2} strokeLinecap="round">
      {[0,45,90,135,180,225,270,315].map(d=>{const a=d*Math.PI/180;return<line key={d} x1={17+9*Math.cos(a)} y1={17+9*Math.sin(a)} x2={17+12*Math.cos(a)} y2={17+12*Math.sin(a)}/>;})}
      <circle cx={17} cy={17} r={6} fill="#fbbf24" stroke="none"/></g>
    :<g><g fill="#94a3b8"><circle cx={12.5} cy={15} r={5}/><circle cx={19} cy={12.5} r={6.5}/><circle cx={24} cy={16} r={4.5}/><rect x={12.5} y={14} width={11.5} height={6.5}/></g>
      <g stroke="#3b82f6" strokeWidth={2} strokeLinecap="round"><line x1={13} y1={24} x2={11.5} y2={28}/><line x1={18.5} y1={24} x2={17} y2={28}/><line x1={24} y1={24} x2={22.5} y2={28}/></g></g>}</>},
  hoop:{w:28,h:28,draw:(k,c)=><>
    <circle cx={14} cy={14} r={11} fill={k===1?'#f97316':'#e2e8f0'} stroke={k===1?'#9a3412':'#94a3b8'} strokeWidth={1.5}/>
    <g stroke={k===1?'#7c2d12':'#94a3b8'} strokeWidth={1.2} fill="none"><line x1={14} y1={3} x2={14} y2={25}/><line x1={3} y1={14} x2={25} y2={14}/>
      <path d="M6.5 6.5 Q12 14 6.5 21.5"/><path d="M21.5 6.5 Q16 14 21.5 21.5"/></g></>},
  answer:{w:28,h:28,draw:(k,c)=><>
    <circle cx={14} cy={14} r={11.5} fill={c}/>
    {k===1?<path d="M8.5 14.5 L12.5 18.5 L20 10" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      :<path d="M10 10 L18 18 M18 10 L10 18" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round"/>}</>},
  flower:{w:28,h:38,draw:k=><>
    <line x1={14} y1={18} x2={14} y2={37} stroke="#16a34a" strokeWidth={2.5}/><ellipse cx={18.5} cy={29} rx={4.5} ry={2} fill="#22c55e" transform="rotate(-30 18.5 29)"/>
    {k===1?<><circle cx={14} cy={12} r={8} fill="#e11d48"/><path d="M14 8.5 a3.5 3.5 0 1 1 -3.3 4.6 M14 6 a6 6 0 0 1 5.6 8" stroke="#9f1239" strokeWidth={1.4} fill="none" strokeLinecap="round"/></>
      :<>{Array.from({length:10},(_,i)=><ellipse key={i} cx={14} cy={5.5} rx={2.6} ry={4.6} fill="#facc15" transform={`rotate(${i*36} 14 12)`}/>)}<circle cx={14} cy={12} r={4.4} fill="#78350f"/></>}</>},
  car:{w:30,h:44,draw:(k,c)=><>
    <rect x={3} y={9} width={3} height={7} rx={1} fill="#1e293b"/><rect x={24} y={9} width={3} height={7} rx={1} fill="#1e293b"/>
    <rect x={3} y={28} width={3} height={7} rx={1} fill="#1e293b"/><rect x={24} y={28} width={3} height={7} rx={1} fill="#1e293b"/>
    <rect x={5} y={3} width={20} height={38} rx={7} fill={c}/>
    <rect x={8} y={11} width={14} height={7} rx={2} fill="#1e293b" opacity={.8}/><rect x={8.5} y={31} width={13} height={5} rx={2} fill="#1e293b" opacity={.8}/>
    <rect x={8} y={19} width={14} height={11} rx={2} fill="#fff" opacity={.18}/></>},
  fish:{w:32,h:22,draw:(k,c)=><>
    <polygon points="22,11 30,4.5 30,17.5" fill={c}/><ellipse cx={14} cy={11} rx={10.5} ry={7} fill={c}/>
    <path d="M13 6 Q16 11 13 16" stroke="#fff" strokeWidth={1.3} fill="none" opacity={.5}/><circle cx={8.5} cy={9.5} r={1.7} fill="#0f172a"/></>},
  sticker:{w:28,h:28,draw:k=>k===1
    ?<polygon points={RP_STAR} fill="#facc15" stroke="#ca8a04" strokeWidth={1.4} strokeLinejoin="round"/>
    :<path d="M14 24 C4 17 3 11 6 7.5 C9 4.5 13 6 14 9 C15 6 19 4.5 22 7.5 C25 11 24 17 14 24 Z" fill="#ec4899" stroke="#be185d" strokeWidth={1.4} strokeLinejoin="round"/>},
  tree:{w:28,h:38,draw:k=><>
    <rect x={12} y={26} width={4} height={10} rx={1} fill="#92400e"/>
    {k===1?<g fill="#166534"><polygon points="14,2 22,13 6,13"/><polygon points="14,8 24,20 4,20"/><polygon points="14,14 26,28 2,28"/></g>
      :<g fill="#65a30d"><circle cx={14} cy={11} r={8}/><circle cx={8.5} cy={18} r={6.5}/><circle cx={19.5} cy={18} r={6.5}/><circle cx={14} cy={20} r={6}/></g>}</>},
  balloon:{w:26,h:42,draw:(k,c)=><>
    <path d="M13 27 Q10 33 13.5 36 Q16 39 13 42" stroke="#94a3b8" strokeWidth={1.2} fill="none"/>
    <polygon points="10.8,28 15.2,28 13,24.5" fill={c}/><ellipse cx={13} cy={13.5} rx={9.5} ry={11.5} fill={c}/>
    <ellipse cx={9.5} cy={9} rx={2.2} ry={3.6} fill="#fff" opacity={.5} transform="rotate(20 9.5 9)"/></>},
  // round 2 (#88: 25 contexts)
  book:{w:18,h:40,draw:(k,c)=><>
    <rect x={2} y={2} width={14} height={36} rx={2} fill={c}/><rect x={2} y={2} width={3.2} height={36} rx={1.5} fill="#000" opacity={.14}/>
    {k===1?<><rect x={6.5} y={9} width={7.5} height={8} rx={1.2} fill="#fff" opacity={.9}/><rect x={6.5} y={31} width={7.5} height={2.5} rx={1} fill="#fff" opacity={.55}/></>
      :<g fill="#fde68a"><rect x={5} y={7} width={11} height={2.2}/><rect x={5} y={11} width={11} height={1.2}/><rect x={5} y={28} width={11} height={1.2}/><rect x={5} y={31} width={11} height={2.2}/></g>}</>},
  egg:{w:24,h:30,draw:(k,c)=><>
    <path d="M12 2.5 C5.5 2.5 3 13 3 18.5 C3 24.5 7 28.5 12 28.5 C17 28.5 21 24.5 21 18.5 C21 13 18.5 2.5 12 2.5 Z" fill={c} stroke={k===1?'#cbd5e1':'#9a5b2c'} strokeWidth={1.2}/>
    <ellipse cx={8.5} cy={12} rx={2} ry={3.6} fill="#fff" opacity={k===1?.9:.35} transform="rotate(18 8.5 12)"/></>},
  boat:{w:34,h:34,draw:(k,c)=>k===1?<>
    <line x1={16} y1={3} x2={16} y2={25} stroke="#475569" strokeWidth={1.6}/>
    <polygon points="17.5,4 17.5,23 30,23" fill={c}/><polygon points="14.5,8 14.5,23 5,23" fill={c} opacity={.75}/>
    <path d="M3 25 H31 L27 31 H7 Z" fill="#7c2d12"/></>
    :<><rect x={10} y={15} width={13} height={9} rx={2} fill="#fff" stroke="#cbd5e1" strokeWidth={1}/>
    <rect x={12.5} y={17.5} width={3.5} height={3.5} rx={.8} fill="#38bdf8"/><rect x={18} y={17.5} width={3.5} height={3.5} rx={.8} fill="#38bdf8"/>
    <path d="M2 24 H32 L28 31 H6 Z" fill={c}/><rect x={2} y={24} width={30} height={2} fill="#fff" opacity={.35}/></>},
  shape:{w:28,h:28,draw:(k,c)=>k===1
    ?<polygon points="14,3 26,24.5 2,24.5" fill={c} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round"/>
    :<rect x={4} y={4} width={20} height={20} rx={2} fill={c} stroke="#fff" strokeWidth={1.4}/>},
  pet:{w:30,h:28,draw:(k,c)=>k===1?<>
    <ellipse cx={6} cy={12} rx={4.2} ry={8} fill="#78350f" transform="rotate(14 6 12)"/><ellipse cx={24} cy={12} rx={4.2} ry={8} fill="#78350f" transform="rotate(-14 24 12)"/>
    <circle cx={15} cy={15} r={10} fill={c}/><ellipse cx={15} cy={20} rx={5.5} ry={4} fill="#fde7c7"/>
    <circle cx={11.3} cy={13} r={1.6} fill="#0f172a"/><circle cx={18.7} cy={13} r={1.6} fill="#0f172a"/><ellipse cx={15} cy={18.2} rx={2.2} ry={1.6} fill="#0f172a"/></>
    :<><polygon points="5.5,4 13,9 6.5,14" fill={c}/><polygon points="24.5,4 17,9 23.5,14" fill={c}/>
    <circle cx={15} cy={16} r={10} fill={c}/><polygon points="7,6.5 10.5,9.5 7.5,11.5" fill="#fda4af"/><polygon points="23,6.5 19.5,9.5 22.5,11.5" fill="#fda4af"/>
    <ellipse cx={11.3} cy={14.5} rx={1.5} ry={2.2} fill="#14532d"/><ellipse cx={18.7} cy={14.5} rx={1.5} ry={2.2} fill="#14532d"/><polygon points="13.6,18.5 16.4,18.5 15,20" fill="#e11d48"/>
    <g stroke="#fff" strokeWidth={.9} opacity={.85}><line x1={3} y1={18} x2={10} y2={19.5}/><line x1={3} y1={22} x2={10} y2={21}/><line x1={27} y1={18} x2={20} y2={19.5}/><line x1={27} y1={22} x2={20} y2={21}/></g></>},
  shirt:{w:30,h:28,draw:(k,c)=><>
    <path d="M9.5 3 L2.5 8 L6 14 L9.5 12 L9.5 26.5 L20.5 26.5 L20.5 12 L24 14 L27.5 8 L20.5 3 Q15 7.5 9.5 3 Z" fill={c} stroke="#000" strokeOpacity={.12} strokeWidth={1}/>
    <path d="M11.5 3.8 Q15 6.2 18.5 3.8" stroke="#000" strokeOpacity={.25} strokeWidth={1.2} fill="none"/>
    <rect x={13.2} y={13} width={3.6} height={6} rx={1} fill="#fff" opacity={.55}/></>},
  medal:{w:26,h:38,draw:(k,c)=><>
    <polygon points="5,2 11,2 15,17 9,17" fill={k===1?'#2563eb':'#7c3aed'}/><polygon points="21,2 15,2 11,17 17,17" fill={k===1?'#dc2626':'#0d9488'}/>
    <circle cx={13} cy={26} r={10} fill={c} stroke={k===1?'#ca8a04':'#94a3b8'} strokeWidth={1.6}/>
    <circle cx={13} cy={26} r={6.5} fill="none" stroke={k===1?'#ca8a04':'#94a3b8'} strokeWidth={1}/>
    <ellipse cx={9.5} cy={22.5} rx={1.8} ry={2.8} fill="#fff" opacity={.6} transform="rotate(35 9.5 22.5)"/></>},
  window:{w:22,h:26,draw:(k,c)=><>
    {k===1&&<rect x={0} y={0} width={22} height={26} rx={4} fill="#fde047" opacity={.25}/>}
    <rect x={2.5} y={2.5} width={17} height={21} rx={1.5} fill={c} stroke="#94a3b8" strokeWidth={1.5}/>
    <g stroke="#94a3b8" strokeWidth={1.3}><line x1={11} y1={3} x2={11} y2={23}/><line x1={3} y1={12} x2={19} y2={12}/></g></>},
  thumb:{w:28,h:30,draw:(k,c)=><g transform={k===2?'rotate(180 14 15)':undefined}>
    <rect x={3} y={13.5} width={4.5} height={12.5} rx={1.5} fill="#334155"/>
    <rect x={8.5} y={2.5} width={7} height={15} rx={3.5} fill={c}/>
    <rect x={7.5} y={12.5} width={15.5} height={14.5} rx={4} fill={c}/>
    <g stroke="#fff" strokeWidth={1.2} opacity={.5} strokeLinecap="round"><line x1={15} y1={16.6} x2={22} y2={16.6}/><line x1={15} y1={20} x2={22} y2={20}/><line x1={15} y1={23.4} x2={22} y2={23.4}/></g></g>},
  bug:{w:30,h:28,draw:(k,c)=>k===1?<>
    <ellipse cx={8.5} cy={9.5} rx={6.5} ry={6} fill={c}/><ellipse cx={21.5} cy={9.5} rx={6.5} ry={6} fill={c}/>
    <ellipse cx={9.5} cy={19.5} rx={5} ry={4.5} fill={c} opacity={.8}/><ellipse cx={20.5} cy={19.5} rx={5} ry={4.5} fill={c} opacity={.8}/>
    <circle cx={8.5} cy={9.5} r={2.2} fill="#fff" opacity={.6}/><circle cx={21.5} cy={9.5} r={2.2} fill="#fff" opacity={.6}/>
    <rect x={13.6} y={5} width={2.8} height={19} rx={1.4} fill="#1e293b"/>
    <path d="M14.3 5.5 Q12 2 10 1.5 M15.7 5.5 Q18 2 20 1.5" stroke="#1e293b" strokeWidth={1} fill="none"/></>
    :<><circle cx={15} cy={6.5} r={4.5} fill="#1e293b"/><circle cx={15} cy={16} r={10} fill={c}/>
    <line x1={15} y1={6.5} x2={15} y2={26} stroke="#1e293b" strokeWidth={1.4}/>
    <g fill="#1e293b"><circle cx={10} cy={12.5} r={2}/><circle cx={20} cy={12.5} r={2}/><circle cx={9.5} cy={19.5} r={1.8}/><circle cx={20.5} cy={19.5} r={1.8}/></g>
    <circle cx={11} cy={9.5} r={1.3} fill="#fff" opacity={.55}/></>},
};
function RatioIcon({icon,k,c,h=20}){
  const I=RP_ICON[icon];
  return<svg className="rp-mi" viewBox={`0 0 ${I.w} ${I.h}`} style={{height:h,width:h*I.w/I.h}} aria-hidden="true">{I.draw(k,c)}</svg>;
}
/* the whole picture: `filled` icons of the first kind, then the rest of the second kind, in balanced rows,
   on a small scene (aquarium, parking lot, calendar, ...) */
function RatioVis({ctx,total,filled}){
  const I=RP_ICON[ctx.icon];
  const per=ctx.perRow||(total<=10?total:Math.ceil(total/Math.ceil(total/10)));
  const rows=Math.ceil(total/per), gx=I.w+4, gy=I.h+(ctx.rowGap||6);
  const pad=ctx.scene?10:2, head=ctx.scene==='cinema'?24:ctx.scene==='calendar'?20:0;
  const W=per*gx-4+pad*2, H=head+rows*gy-(ctx.rowGap||6)+pad*2;
  const at=i=>{const col=i%per,row=Math.floor(i/per);return[pad+(ctx.rtl?per-1-col:col)*gx,head+pad+row*gy];};
  const scene=ctx.scene==='aquarium'?<><rect x={0} y={0} width={W} height={H} rx={12} fill="#e0f2fe" stroke="#7dd3fc" strokeWidth={2}/>
      <rect x={1} y={H-8} width={W-2} height={7} rx={4} fill="#fde68a"/>
      {[0.18,0.52,0.83].map(f=><circle key={f} cx={W*f} cy={6} r={2.5} fill="none" stroke="#7dd3fc" strokeWidth={1.2}/>)}</>
    :ctx.scene==='parking'?<><rect x={0} y={0} width={W} height={H} rx={12} fill="#475569"/>
      {Array.from({length:rows},(_,r)=>Array.from({length:per+1},(_,c)=><line key={r+'-'+c} x1={pad-2+c*gx} y1={pad+r*gy} x2={pad-2+c*gx} y2={pad+r*gy+I.h} stroke="#fff" strokeWidth={1.5} opacity={.8}/>))}</>
    :ctx.scene==='cinema'?<><path d={`M${W*0.1} 12 Q${W/2} 2 ${W*0.9} 12`} stroke="#94a3b8" strokeWidth={4} fill="none" strokeLinecap="round"/>
      <text x={W/2} y={22} textAnchor="middle" fontSize="9" fill="#64748b">מסך</text></>
    :ctx.scene==='calendar'?<>{['א','ב','ג','ד','ה','ו','ש'].slice(0,per).map((d,i)=><text key={d} x={pad+(per-1-i)*gx+I.w/2} y={pad+9} textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">{d}</text>)}</>
    :ctx.scene==='wire'?<>{Array.from({length:rows},(_,r)=><path key={r} d={`M2 ${pad+r*gy+5} Q${W/2} ${pad+r*gy+11} ${W-2} ${pad+r*gy+5}`} stroke="#334155" strokeWidth={1.5} fill="none"/>)}</>
    :ctx.scene==='grass'?<>{Array.from({length:rows},(_,r)=><rect key={r} x={0} y={pad+r*gy+I.h-4} width={W} height={6} rx={3} fill="#bbf7d0"/>)}</>
    :ctx.scene==='sheet'?<rect x={1} y={1} width={W-2} height={H-2} rx={10} fill="#fff" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="5 4"/>
    :ctx.scene==='jar'?<rect x={1} y={1} width={W-2} height={H-2} rx={16} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={2}/>
    // round 2 scenes (#88): bookshelf, egg tray, sea, chalkboard, clothesline, building at night, garden
    :ctx.scene==='shelf'?<><rect x={0} y={0} width={W} height={H} rx={10} fill="#fef3c7"/>
      {Array.from({length:rows},(_,r)=><rect key={r} x={2} y={pad+r*gy+I.h} width={W-4} height={5} rx={2} fill="#b45309"/>)}</>
    :ctx.scene==='tray'?<><rect x={0} y={0} width={W} height={H} rx={10} fill="#e7c9a0"/>
      {Array.from({length:total},(_,i)=>{const[x,y]=at(i);return<ellipse key={i} cx={x+I.w/2} cy={y+I.h-6} rx={I.w/2+1} ry={7} fill="#c9a06b"/>;})}</>
    :ctx.scene==='sea'?<><rect x={0} y={0} width={W} height={H} rx={12} fill="#e0f2fe"/>
      {Array.from({length:rows},(_,r)=><path key={r} d={`M2 ${pad+r*gy+I.h-2}`+Array.from({length:per*2},()=>` q${gx/4} -3.5 ${gx/2} 0`).join('')} stroke="#38bdf8" strokeWidth={2} fill="none" strokeLinecap="round"/>)}</>
    :ctx.scene==='board'?<><rect x={1.5} y={1.5} width={W-3} height={H-3} rx={6} fill="#14532d" stroke="#a16207" strokeWidth={3}/>
      <rect x={W*0.62} y={H-5} width={W*0.2} height={3} rx={1.5} fill="#e2e8f0" opacity={.8}/></>
    :ctx.scene==='line'?<>{Array.from({length:rows},(_,r)=><path key={r} d={`M1 ${pad+r*gy+3} Q${W/2} ${pad+r*gy+6} ${W-1} ${pad+r*gy+3}`} stroke="#64748b" strokeWidth={1.3} fill="none"/>)}
      {Array.from({length:total},(_,i)=>{const[x,y]=at(i);return<g key={i} fill="#a16207"><rect x={x+8} y={y} width={2.5} height={6} rx={1}/><rect x={x+19.5} y={y} width={2.5} height={6} rx={1}/></g>;})}</>
    :ctx.scene==='building'?<><rect x={0} y={0} width={W} height={H} rx={6} fill="#475569"/><rect x={0} y={0} width={W} height={5} rx={2} fill="#334155"/></>
    :ctx.scene==='garden'?<rect x={1} y={1} width={W-2} height={H-2} rx={14} fill="#dcfce7" stroke="#86efac" strokeWidth={1.5}/>
    :null;
  return<div className="rp-vis">
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:Math.min(Math.round(W*1.4),320),'--rp-w':W+'px',height:'auto',display:'block',margin:'0 auto'}}
      role="img" aria-label={`${filled} ${ctx.label1} ו-${total-filled} ${ctx.label2}`}>
      {scene}
      {Array.from({length:total},(_,i)=>{const[x,y]=at(i),k=i<filled?1:2;
        return<g key={i} transform={`translate(${x} ${y})`} data-k={k}>{I.draw(k,k===1?ctx.color1:ctx.color2)}</g>;})}
    </svg>
    <div className="rp-legend">
      <span><RatioIcon icon={ctx.icon} k={1} c={ctx.color1}/>{ctx.label1}</span>
      <span><RatioIcon icon={ctx.icon} k={2} c={ctx.color2}/>{ctx.label2}</span>
    </div>
  </div>;
}

/* Glass */
function GlassVis({pct, color='#3b82f6'}){
  const gh=100, gw=50, fillH=gh*(pct/100);
  return <svg viewBox="0 0 70 130" style={{width:70,height:130}}>
    <rect x={10} y={10} width={gw} height={gh} rx={4} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={2}/>
    <rect x={10} y={10+gh-fillH} width={gw} height={fillH} rx={fillH>=gh?4:0} fill={color} opacity={0.6}/>
    <text x={35} y={gh+25} textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">{pct}%</text>
  </svg>;
}

/* Price Tag */
function PriceTag({original, final: finalP, label, finalLabel}){
  return <div style={{display:'flex',gap:16,justifyContent:'center',alignItems:'center',flexWrap:'wrap'}}>
    <div style={{background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:10,padding:'10px 16px',textAlign:'center'}}>
      <div style={{fontSize:12,color:'#92400e'}}>{label||'מחיר מקורי'}</div>
      <div style={{fontSize:22,fontWeight:700,color:'#92400e'}}>{original}₪</div>
    </div>
    <div style={{fontSize:24}}>→</div>
    <div style={{background:'#dcfce7',border:'2px solid #16a34a',borderRadius:10,padding:'10px 16px',textAlign:'center'}}>
      <div style={{fontSize:12,color:'#166534'}}>{finalLabel||'מחיר סופי'}</div>
      <div style={{fontSize:22,fontWeight:700,color:'#166534'}}>{finalP != null ? finalP+'₪' : '?'}</div>
    </div>
  </div>;
}

/* Before/After bars */
function BeforeAfterBar({before, after, maxVal}){
  const mx = maxVal || Math.max(before, after||before)*1.3;
  const w1 = (before/mx)*240, w2 = after!=null?(after/mx)*240:0;
  return <svg viewBox="0 0 300 70" style={{width:300,height:70}}>
    <rect x={40} y={5} width={w1} height={24} rx={4} fill="#3b82f6"/>
    <text x={35} y={21} textAnchor="end" fontSize="12" fill="#334155">לפני</text>
    <text x={44+w1} y={21} fontSize="12" fill="#1e40af" fontWeight="700">{before}</text>
    <rect x={40} y={38} width={w2||0} height={24} rx={4} fill="#f97316"/>
    <text x={35} y={54} textAnchor="end" fontSize="12" fill="#334155">אחרי</text>
    {after!=null && <text x={44+w2} y={54} fontSize="12" fill="#c2410c" fontWeight="700">{after}</text>}
  </svg>;
}

/* Fraction display */
function Frac({n,d,style}){
  return <span className="frac" style={style}>
    <span className="frac-num">{n}</span>
    <span className="frac-den">{d}</span>
  </span>;
}

/* Cross-multiplication diagram: tl/bl = tr/br, with diagonal arrows tl→br and bl→tr */
function CrossMultDiagram({tl,tr,bl,br}){
  const w=180,h=110,x1=36,x2=w-36,y1=30,y2=h-26;
  return <svg viewBox={`0 0 ${w} ${h}`} style={{width:w,height:h,display:'block',margin:'0 auto'}}>
    <defs>
      <marker id="cmArrow" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="#0f766e"/>
      </marker>
    </defs>
    <line x1={x1+8} y1={y1+4} x2={x2-8} y2={y2-10} stroke="#0f766e" strokeWidth="2" markerEnd="url(#cmArrow)"/>
    <line x1={x1+8} y1={y2-4} x2={x2-8} y2={y1+10} stroke="#0f766e" strokeWidth="2" markerEnd="url(#cmArrow)"/>
    <text x={x1} y={y1} textAnchor="middle" fontSize="20" fontWeight="700" fill="#134e4a">{tl}</text>
    <text x={x2} y={y1} textAnchor="middle" fontSize="20" fontWeight="700" fill="#134e4a">{tr}</text>
    <text x={x1} y={y2} textAnchor="middle" fontSize="20" fontWeight="700" fill="#134e4a">{bl}</text>
    <text x={x2} y={y2} textAnchor="middle" fontSize="20" fontWeight="700" fill="#134e4a">{br}</text>
  </svg>;
}

/* Feedback */
function Fb({fb}){
  if(!fb) return null;
  return fb==='ok'?<div className="fb ok">✓ נכון!</div>:<div className="fb err">✗ לא נכון, נסה שוב.</div>;
}

/* ═══════ Chapter 1: Ratio ═══════ */
/* 25 contexts, each with its own picture (Sulaiman, fixes board #88: more variety; chocolate/vanilla and
   boys/girls stay, the fruit pairs are gone; round 2: 10 more, from books to ladybugs). q = the question sentence; T = the total, A/B = the two amounts.
   t1/t2 = text colour when the drawing colour is too light to read. */
const RATIO_CTXS = [
  {type:'pie',label1:'שוקולד',label2:'וניל',color1:'#92400e',color2:'#fef3c7'},
  {type:'people',label1:'בנים',label2:'בנות',color1:'#3b82f6'},
  {type:'icons',icon:'pencil',label1:'עפרונות אדומים',label2:'עפרונות כחולים',color1:'#dc2626',color2:'#2563eb',perRow:12,
    q:(T,A,B)=><>בקלמר יש {T} עפרונות: {A} ו-{B}.</>},
  {type:'icons',icon:'marble',scene:'jar',label1:'גולות כחולות',label2:'גולות ירוקות',color1:'#2563eb',color2:'#16a34a',
    q:(T,A,B)=><>בצנצנת יש {T} גולות: {A} ו-{B}.</>},
  {type:'icons',icon:'bulb',scene:'wire',label1:'נורות דולקות',label2:'נורות כבויות',color1:'#facc15',color2:'#94a3b8',t1:'#a16207',t2:'#475569',
    q:(T,A,B)=><>בשרשרת האורות יש {T} נורות: {A} ו-{B}.</>},
  {type:'icons',icon:'seat',scene:'cinema',label1:'מושבים תפוסים',label2:'מושבים פנויים',color1:'#7c3aed',color2:'#e2e8f0',t2:'#64748b',
    q:(T,A,B)=><>באולם הקולנוע יש {T} מושבים: {A} ו-{B}.</>},
  {type:'icons',icon:'day',scene:'calendar',perRow:7,rtl:true,rowGap:3,label1:'ימים שמשיים',label2:'ימים גשומים',color1:'#f59e0b',color2:'#3b82f6',t1:'#b45309',
    q:(T,A,B)=><>במשך {T} ימים היו {A} ו-{B}.</>},
  {type:'icons',icon:'hoop',label1:'קליעות',label2:'החטאות',color1:'#f97316',color2:'#94a3b8',t1:'#c2410c',t2:'#64748b',
    q:(T,A,B)=><>נועה זרקה {T} זריקות לסל: {A} ו-{B}.</>},
  {type:'icons',icon:'answer',label1:'תשובות נכונות',label2:'תשובות שגויות',color1:'#16a34a',color2:'#dc2626',
    q:(T,A,B)=><>בחידון של {T} שאלות היו {A} ו-{B}.</>},
  {type:'icons',icon:'flower',label1:'ורדים',label2:'חמניות',color1:'#e11d48',color2:'#facc15',t2:'#a16207',
    q:(T,A,B)=><>בזר יש {T} פרחים: {A} ו-{B}.</>},
  {type:'icons',icon:'car',scene:'parking',label1:'מכוניות כחולות',label2:'מכוניות אדומות',color1:'#3b82f6',color2:'#ef4444',
    q:(T,A,B)=><>בחניון יש {T} מכוניות: {A} ו-{B}.</>},
  {type:'icons',icon:'fish',scene:'aquarium',label1:'דגים כתומים',label2:'דגים כחולים',color1:'#f97316',color2:'#2563eb',t1:'#c2410c',rowGap:8,
    q:(T,A,B)=><>באקווריום יש {T} דגים: {A} ו-{B}.</>},
  {type:'icons',icon:'sticker',scene:'sheet',label1:'מדבקות כוכב',label2:'מדבקות לב',color1:'#facc15',color2:'#ec4899',t1:'#a16207',t2:'#db2777',
    q:(T,A,B)=><>בדף יש {T} מדבקות: {A} ו-{B}.</>},
  {type:'icons',icon:'tree',scene:'grass',label1:'עצי אורן',label2:'עצי אלון',color1:'#166534',color2:'#65a30d',t2:'#4d7c0f',
    q:(T,A,B)=><>בפארק יש {T} עצים: {A} ו-{B}.</>},
  {type:'icons',icon:'balloon',label1:'בלונים אדומים',label2:'בלונים צהובים',color1:'#ef4444',color2:'#facc15',t2:'#a16207',
    q:(T,A,B)=><>במסיבה יש {T} בלונים: {A} ו-{B}.</>},
  // round 2 (#88)
  {type:'icons',icon:'book',scene:'shelf',rowGap:9,label1:'ספרי קריאה',label2:'ספרי לימוד',color1:'#0d9488',color2:'#7c3aed',
    q:(T,A,B)=><>על המדף בספרייה יש {T} ספרים: {A} ו-{B}.</>},
  {type:'icons',icon:'egg',scene:'tray',label1:'ביצים לבנות',label2:'ביצים חומות',color1:'#ffffff',color2:'#c47a43',t1:'#64748b',t2:'#9a5b2c',
    q:(T,A,B)=><>בתבנית יש {T} ביצים: {A} ו-{B}.</>},
  {type:'icons',icon:'boat',scene:'sea',label1:'סירות מפרש',label2:'סירות מנוע',color1:'#ef4444',color2:'#1e3a8a',t1:'#dc2626',
    q:(T,A,B)=><>במעגן יש {T} סירות: {A} ו-{B}.</>},
  {type:'icons',icon:'shape',scene:'board',label1:'משולשים',label2:'ריבועים',color1:'#facc15',color2:'#38bdf8',t1:'#a16207',t2:'#0369a1',
    q:(T,A,B)=><>על הלוח ציירה המורה {T} צורות: {A} ו-{B}.</>},
  {type:'icons',icon:'pet',label1:'כלבים',label2:'חתולים',color1:'#d97706',color2:'#64748b',t1:'#b45309',t2:'#475569',
    q:(T,A,B)=><>בפנסיון לבעלי חיים יש {T} חיות: {A} ו-{B}.</>},
  {type:'icons',icon:'shirt',scene:'line',rowGap:8,label1:'חולצות צהובות',label2:'חולצות ירוקות',color1:'#facc15',color2:'#16a34a',t1:'#a16207',
    q:(T,A,B)=><>על חבל הכביסה תלויות {T} חולצות: {A} ו-{B}.</>},
  {type:'icons',icon:'medal',label1:'מדליות זהב',label2:'מדליות כסף',color1:'#facc15',color2:'#e2e8f0',t1:'#a16207',t2:'#64748b',
    q:(T,A,B)=><>ביום הספורט חילקו {T} מדליות: {A} ו-{B}.</>},
  {type:'icons',icon:'window',scene:'building',label1:'חלונות מוארים',label2:'חלונות חשוכים',color1:'#fde047',color2:'#1e293b',t1:'#a16207',t2:'#334155',
    q:(T,A,B)=><>בערב, בבניין יש {T} חלונות: {A} ו-{B}.</>},
  {type:'icons',icon:'thumb',label1:'הצבעות בעד',label2:'הצבעות נגד',color1:'#16a34a',color2:'#e11d48',
    q:(T,A,B)=><>בהצבעה בכיתה היו {T} הצבעות: {A} ו-{B}.</>},
  {type:'icons',icon:'bug',scene:'garden',label1:'פרפרים',label2:'פרות משה רבנו',color1:'#a855f7',color2:'#dc2626',t1:'#9333ea',
    q:(T,A,B)=><>בגינה ספרו הילדים {T} חרקים: {A} ו-{B}.</>},
];
/* Fixes board #88 round 2 (Sulaiman: "the first 25 should all be different, and the numbers too"):
   a shuffle bag. Every 25 exercises in a row show all 25 contexts in a random order, then a new round
   starts (never the same context twice in a row). Numbers: no number pair twice in a round, at most 3
   pairs from the same reduced ratio, and never the same numbers, total or reduced ratio as the
   exercise just before. hist = the exercises so far. */
const RATIO_BASE=[[2,3],[3,4],[1,2],[1,3],[2,5],[3,5],[1,4],[3,7],[2,7],[4,5]];
const RATIO_PAIRS=(()=>{const out=[];
  for(const[x,y]of RATIO_BASE)for(const[sa,sb]of[[x,y],[y,x]])for(let m=2;m<=5&&(sa+sb)*m<=40;m++)out.push({sa,sb,a:sa*m,b:sb*m});
  return out;})();
function genRatio(hist=[]){
  const n=RATIO_CTXS.length, round=hist.slice(hist.length-hist.length%n), last=hist[hist.length-1];
  const ctx=pick(RATIO_CTXS.filter(c=>c!==(last&&last.ctx)&&!round.some(e=>e.ctx===c)));
  const two=(x,y)=>Math.min(x,y)+':'+Math.max(x,y);
  const used=new Set(round.map(e=>two(e.a,e.b)));
  const fresh=RATIO_PAIRS.filter(p=>!used.has(two(p.a,p.b)));
  const apart=p=>!last||(![last.a,last.b].includes(p.a)&&![last.a,last.b].includes(p.b)&&p.a+p.b!==last.total&&two(p.sa,p.sb)!==two(last.simA,last.simB));
  const few=p=>round.filter(e=>two(e.simA,e.simB)===two(p.sa,p.sb)).length<3;
  const {sa,sb,a,b}=pick([fresh.filter(p=>apart(p)&&few(p)),fresh.filter(apart),fresh,RATIO_PAIRS].find(l=>l.length));
  const total = a+b;
  // step 3: scaled question
  const scaleMult = pick([2,3,4,5,6]);
  const scaledTotal = total * scaleMult;
  const scaledA = a * scaleMult;
  return {ctx, a, b, total, simA:sa, simB:sb, scaledTotal, scaledA, g:gcd(a,b)};
}
// the exercise list of this visit, built as needed: RATIO_SEQ(i) is exercise number i (the same every time)
function makeRatioSeq(){const list=[];return i=>{while(list.length<=i)list.push(genRatio(list));return list[i];};}
const RATIO_SEQ=makeRatioSeq();
let ratioAt=0;   // the exercise shown now; kept when the student switches chapters and comes back

/* Chapter 1 has two sub-chapters (Sulaiman, fixes board #46):
   א — ratio and reducing it (step by step, #45), ב — from a ratio to amounts. */
function Ch1(){
  const [part,setPart]=useState(0);
  return <div>
    <div className="content" style={{marginBottom:0}}>
      <div className="sub-tabs">
        <button className={`sub-tab-btn ${part===0?'active':''}`} onClick={()=>setPart(0)}>א. יחס וצמצום</button>
        <button className={`sub-tab-btn ${part===1?'active':''}`} onClick={()=>setPart(1)}>ב. מיחס לכמות</button>
      </div>
    </div>
    {part===0?<Ch1Ratio key="r"/>:<Ch1Amount key="a"/>}
  </div>;
}

function Ch1Ratio(){
  const [at, setAt] = useState(()=>ratioAt);
  const ex = RATIO_SEQ(at);
  const [step, setStep] = useState(1);
  const [r1,setR1]=useState('');const [r2,setR2]=useState('');
  const [s1,setS1]=useState('');const [s2,setS2]=useState('');
  const [chain,setChain]=useState([]);   // reductions so far, e.g. [[12,18],[6,9]]
  const [fb,setFb]=useState(null);

  const check1=()=>{
    const v1=parseInt(r1),v2=parseInt(r2);
    if(v1===ex.a&&v2===ex.b){setFb('ok');setTimeout(()=>{setStep(2);setChain([[ex.a,ex.b]]);setFb(null);},600);}
    else setFb('err');
  };
  // reducing may take several small steps: a correct but partial reduction is accepted and the student goes on
  const check2=()=>{
    const v1=parseInt(s1),v2=parseInt(s2);
    const [c1,c2]=chain[chain.length-1];
    const same = v1>0&&v2>0&&v1*c2===v2*c1;
    if(same&&v1<c1){
      if(gcd(v1,v2)===1){setChain([...chain,[v1,v2]]);setFb('ok');setTimeout(()=>{setStep(4);setFb(null);},600);}
      else{setChain([...chain,[v1,v2]]);setS1('');setS2('');setFb('more');}
    } else setFb(same?'same':'err');
  };
  const reset=()=>{ratioAt=at+1;setAt(at+1);setStep(1);setR1('');setR2('');setS1('');setS2('');setChain([]);setFb(null);};

  const vis = ex.ctx.type==='pie'?<PieVis total={ex.total} filled={ex.a} color1={ex.ctx.color1} color2={ex.ctx.color2}/>
    :ex.ctx.type==='icons'?<RatioVis ctx={ex.ctx} total={ex.total} filled={ex.a}/>
    :ex.ctx.type==='bar'?<BarVis total={ex.total} filled={ex.a} color1={ex.ctx.color1} color2={ex.ctx.color2}/>
    :<PeopleVis total={ex.total} filled={ex.a} color1={ex.ctx.color1}/>;
  const cur = chain.length?chain[chain.length-1]:null;

  return <div className="content">
    <div className="info">
      <b>יחס</b> מבטא את היחס בין שתי כמויות. למשל 2:3 אומר שעל כל 2 מהראשון יש 3 מהשני.
    </div>
    <div className="card">
      <div className="card-t">יחס</div>
      <div className="vis-wrap">{vis}</div>
      {ex.ctx.q?<p className="q-text">
        {ex.ctx.q(<b>{ex.total}</b>,<b style={{color:ex.ctx.t1||ex.ctx.color1}}>{ex.a} {ex.ctx.label1}</b>,<b style={{color:ex.ctx.t2||ex.ctx.color2}}>{ex.b} {ex.ctx.label2}</b>)}
      </p>:<p className="q-text">
        מתוך <b>{ex.total}</b> — <b style={{color:ex.ctx.color1||'#0f766e'}}>{ex.a} {ex.ctx.label1}</b> ו-<b>{ex.b} {ex.ctx.label2}</b>
      </p>}

      {/* Step 1 */}
      <div className={`step-card ${step>1?'done':''}`}>
        <div className="step-label">שלב א׳ — מה היחס בין {ex.ctx.label1} ל{ex.ctx.label2}?</div>
        {step===1?<>
          <div className="ans-row">
            <input type="text" value={r1} onChange={e=>{setR1(e.target.value);setFb(null);}} placeholder="?" style={{width:55}}/>
            <span style={{fontSize:22,fontWeight:700}}>:</span>
            <input type="text" value={r2} onChange={e=>{setR2(e.target.value);setFb(null);}} placeholder="?" style={{width:55}}
              onKeyDown={e=>e.key==='Enter'&&check1()}/>
            <button className="btn bg" onClick={check1}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ {ex.a} : {ex.b}</div>}
      </div>

      {/* Step 2 */}
      {step>=2 && <div className={`step-card ${step>2?'done':''}`}>
        <div className="step-label">שלב ב׳ — פשט את היחס למספרים הקטנים ביותר</div>
        {step===2&&<div className="rp-hint">אפשר לצמצם בכמה צעדים: בכל צעד מחלקים את שני המספרים באותו מספר.</div>}
        {chain.length>0&&<div className="rp-chain" dir="ltr">
          {chain.map(([x,y],i)=><React.Fragment key={i}>{i>0&&<span className="rp-arrow">→</span>}<span className={i===chain.length-1&&step>2?'rp-last':''}>{x} : {y}</span></React.Fragment>)}
        </div>}
        {step===2?<>
          <div className="ans-row">
            <input type="text" value={s1} onChange={e=>{setS1(e.target.value);setFb(null);}} placeholder="?" style={{width:55}}/>
            <span style={{fontSize:22,fontWeight:700}}>:</span>
            <input type="text" value={s2} onChange={e=>{setS2(e.target.value);setFb(null);}} placeholder="?" style={{width:55}}
              onKeyDown={e=>e.key==='Enter'&&check2()}/>
            <button className="btn bg" onClick={check2}>✓ בדוק</button>
          </div>
          {fb==='more'?<div className="fb ok rp-more">👍 יפה! צמצמת נכון ל-<span dir="ltr">{cur[0]} : {cur[1]}</span>. אבל אפשר לצמצם עוד. המשיכו.</div>
            :fb==='same'?<div className="fb err">זה אותו יחס בלי צמצום. חלקו את שני המספרים באותו מספר.</div>
            :<Fb fb={fb}/>}
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ {ex.simA} : {ex.simB}</div>}
      </div>}
    </div>

    {step===4?<div className="banner">
      ✅ כל הכבוד!
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ── 1ב: from a ratio to amounts. Three kinds of questions, in turn:
   coloring squares, dividing into packs, and a ratio table. ── */
const RA_KINDS=['grid','groups','table'];
function genRatioAmount(kind){
  const ctxs=[
    {l1:'בנים',l2:'בנות',unit:'ילדים',pack:'קבוצה',packs:'קבוצות',c1:'#3b82f6',c2:'#ec4899'},
    {l1:'עפרונות אדומים',l2:'עפרונות כחולים',unit:'עפרונות',pack:'חבילה',packs:'חבילות',c1:'#ef4444',c2:'#3b82f6',icon:'pencil'},
    {l1:'כדורים צהובים',l2:'כדורים סגולים',unit:'כדורים',pack:'שקית',packs:'שקיות',c1:'#eab308',c2:'#8b5cf6'},
    // more variety, no fruit (#88); icon = the small drawing shown inside each pack
    {l1:'בלונים אדומים',l2:'בלונים צהובים',unit:'בלונים',pack:'צרור',packs:'צרורות',c1:'#ef4444',c2:'#ca8a04',icon:'balloon',i2:'#facc15'},
    {l1:'גולות כחולות',l2:'גולות ירוקות',unit:'גולות',pack:'שקית',packs:'שקיות',c1:'#2563eb',c2:'#16a34a',icon:'marble'},
    {l1:'ורדים',l2:'חמניות',unit:'פרחים',pack:'זר',packs:'זרים',c1:'#e11d48',c2:'#ca8a04',icon:'flower'},
    {l1:'מדבקות כוכב',l2:'מדבקות לב',unit:'מדבקות',pack:'דף',packs:'דפים',c1:'#ca8a04',c2:'#db2777',icon:'sticker'},
    {l1:'דגים כתומים',l2:'דגים כחולים',unit:'דגים',pack:'אקווריום',packs:'אקווריומים',c1:'#ea580c',c2:'#2563eb',icon:'fish'},
  ];
  const ctx=pick(ctxs);
  const [a,b]=pick([[1,2],[2,3],[1,3],[3,4],[2,5],[3,5],[1,4],[3,2],[4,3],[5,2]]);
  const maxK=kind==='grid'?Math.max(2,Math.floor(24/(a+b))):8;   // at most 24 squares to color
  const k=randInt(2,maxK);
  return {kind,ctx,a,b,k,total:(a+b)*k,A:a*k,B:b*k};
}

/* mult: shows an arrow beside the table from the ratio row to the amount row, with "×mult" on it (fixes board #46) */
function RatioTable({h1,h2,rows,mult}){
  const wrap=useRef(null);
  const [pos,setPos]=useState(null);
  useEffect(()=>{
    if(!mult||!wrap.current) return;
    const el=wrap.current;
    const measure=()=>{
      const tr=el.querySelectorAll('tbody tr');
      if(tr.length<2) return;
      const o=el.getBoundingClientRect().top, ra=tr[tr.length-2].getBoundingClientRect(), rb=tr[tr.length-1].getBoundingClientRect();
      const top=ra.top-o+ra.height/2, bot=rb.top-o+rb.height/2;
      setPos({top,height:bot-top});
    };
    measure();
    const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
    if(ro) ro.observe(el);
    return ()=>{if(ro) ro.disconnect();};
  },[mult]);
  const table=<table className="rp-table">
    <thead><tr><th></th><th>{h1}</th><th>{h2}</th><th>סה״כ</th></tr></thead>
    <tbody>{rows.map((r,i)=><tr key={i}><th>{r[0]}</th>{r.slice(1).map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody>
  </table>;
  if(!mult) return table;
  return <div className="rp-tw" ref={wrap}>
    {table}
    {pos&&<div className="rp-mul" style={{top:pos.top,height:pos.height}} aria-hidden="true"><b dir="ltr">×{mult}</b></div>}
    <span className="rp-sr">כופלים את שורת היחס ב-{mult} ומקבלים את שורת הכמות.</span>
  </div>;
}

function PackVis({a,b,c1,c2,n=1,icon,i2}){
  // with an icon (#88) each item is its small drawing instead of a dot
  const item=(k,j)=>icon?<RatioIcon key={k+"-"+j} icon={icon} k={k} c={k===1?c1:(i2||c2)} h={18}/>:<i key={(k===1?'a':'b')+j} style={{background:k===1?c1:c2}}/>;
  return <div className={'rp-packs'+(icon?' rp-packs-i':'')}>{Array.from({length:n},(_,i)=><span key={i} className="rp-pack">
    {Array.from({length:a},(_,j)=>item(1,j))}
    {Array.from({length:b},(_,j)=>item(2,j))}
  </span>)}</div>;
}

function Ch1Amount(){
  const [turn,setTurn]=useState(0);
  const [ex,setEx]=useState(()=>genRatioAmount(RA_KINDS[0]));
  const [done,setDone]=useState(false);
  const [fb,setFb]=useState(null);
  // grid
  const [on,setOn]=useState([]);
  // groups
  const [gStep,setGStep]=useState(1);const [gk,setGk]=useState('');const [gA,setGA]=useState('');const [gB,setGB]=useState('');
  // table
  const [cells,setCells]=useState(['','','','','','']);const [bad,setBad]=useState([]);

  const next=()=>{const t=turn+1;setTurn(t);setEx(genRatioAmount(RA_KINDS[t%3]));setDone(false);setFb(null);
    setOn([]);setGStep(1);setGk('');setGA('');setGB('');setCells(['','','','','','']);setBad([]);};
  const win=()=>{setFb('ok');setDone(true);};

  const checkGrid=()=>{
    const n=on.filter(Boolean).length;
    if(n===ex.A) win(); else setFb(n<ex.A?'few':'many');
  };
  const checkK=()=>{if(parseInt(gk)===ex.k){setFb('ok');setTimeout(()=>{setGStep(2);setFb(null);},600);}else setFb('err');};
  const checkAB=()=>{if(parseInt(gA)===ex.A&&parseInt(gB)===ex.B) win(); else setFb('err');};
  const checkTable=()=>{
    const want=[ex.a,ex.b,ex.a+ex.b,ex.A,ex.B,ex.total];
    const wrong=want.map((w,i)=>parseInt(cells[i])===w?-1:i).filter(i=>i>=0);
    setBad(wrong);
    if(!wrong.length) win(); else setFb('err');
  };

  const c=ex.ctx;
  const cellIn=(i)=><input type="text" value={cells[i]} className={bad.includes(i)?'rp-bad':''} disabled={done}
    onChange={e=>{const v=[...cells];v[i]=e.target.value;setCells(v);setFb(null);setBad(bad.filter(x=>x!==i));}}
    onKeyDown={e=>e.key==='Enter'&&checkTable()} placeholder="?"/>;

  return <div className="content">
    <div className="info">
      כשיודעים את <b>היחס</b> ואת <b>הכמות הכוללת</b>, אפשר למצוא כמה יש מכל סוג:<br/>
      1. מחברים את חלקי היחס, וכך יודעים כמה יש ב<b>קבוצה אחת</b>.<br/>
      2. מחלקים את הכמות הכוללת בגודל הקבוצה, וכך יודעים <b>כמה קבוצות</b> יש.<br/>
      3. כופלים כל חלק של היחס במספר הקבוצות.
    </div>
    <div className="example-box">
      <div className="ex-title">דוגמה פתורה</div>
      <div>היחס בין בנים לבנות בכיתה הוא <b dir="ltr">2 : 3</b>, ויש בכיתה <b>20</b> תלמידים. כמה בנים וכמה בנות?</div>
      <RatioTable h1="בנים" h2="בנות" rows={[['יחס',2,3,5],['כמות',8,12,20]]} mult={4}/>
      <div>בכל קבוצה יש <span dir="ltr">2 + 3 = 5</span> תלמידים. <span dir="ltr">20 : 5 = 4</span> קבוצות.<br/>
        בנים: <span dir="ltr">2 · 4 = 8</span>, בנות: <span dir="ltr">3 · 4 = 12</span>. בדיקה: <span dir="ltr">8 + 12 = 20</span> ✓</div>
    </div>

    <div className="card">
      {ex.kind==='grid'&&<>
        <div className="card-t">צביעת משבצות</div>
        <p className="q-text">יש <b>{ex.total}</b> משבצות. צבעו משבצות כך שהיחס בין <b style={{color:'#2563eb'}}>הצבועות</b> ל<b>לבנות</b> יהיה <b dir="ltr">{ex.a} : {ex.b}</b>.</p>
        <div className="rp-grid">{Array.from({length:ex.total},(_,i)=><button key={i} type="button" className={'rp-sq'+(on[i]?' on':'')} disabled={done}
          aria-label={`משבצת ${i+1}`} aria-pressed={!!on[i]} onClick={()=>{const v=[...on];v[i]=!v[i];setOn(v);setFb(null);}}/>)}</div>
        <p className="rp-count">צבעת <b>{on.filter(Boolean).length}</b> · לבנות <b>{ex.total-on.filter(Boolean).length}</b></p>
        {!done&&<div className="center"><button className="btn bg" onClick={checkGrid}>✓ בדוק</button></div>}
        {fb==='few'&&<div className="fb err">צריך לצבוע עוד. רמז: חלקו את {ex.total} המשבצות לקבוצות של {ex.a+ex.b}. בכל קבוצה {ex.a} צבועות.</div>}
        {fb==='many'&&<div className="fb err">צבעת יותר מדי. רמז: חלקו את {ex.total} המשבצות לקבוצות של {ex.a+ex.b}. בכל קבוצה {ex.a} צבועות.</div>}
        {done&&<div className="fb ok">✓ נכון! {ex.k} קבוצות של {ex.a+ex.b}: <span dir="ltr">{ex.a} · {ex.k} = {ex.A}</span> צבועות ו-<span dir="ltr">{ex.b} · {ex.k} = {ex.B}</span> לבנות.</div>}
      </>}

      {ex.kind==='groups'&&<>
        <div className="card-t">חלוקה ל{c.packs}</div>
        <p className="q-text">בכל {c.pack} יש <b style={{color:c.c1}}>{ex.a} {c.l1}</b> ו-<b style={{color:c.c2}}>{ex.b} {c.l2}</b>. בסך הכל יש <b>{ex.total}</b> {c.unit}.</p>
        <PackVis a={ex.a} b={ex.b} c1={c.c1} c2={c.c2} n={gStep>1?ex.k:1} icon={c.icon} i2={c.i2}/>
        <div className={`step-card ${gStep>1?'done':''}`}>
          <div className="step-label">שלב א׳ — כמה {c.packs} יש?</div>
          {gStep===1?<><div className="ans-row">
            <input type="text" value={gk} onChange={e=>{setGk(e.target.value);setFb(null);}} onKeyDown={e=>e.key==='Enter'&&checkK()} placeholder="?"/>
            <button className="btn bg" onClick={checkK}>✓ בדוק</button>
          </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ <span dir="ltr">{ex.total} : {ex.a+ex.b} = {ex.k}</span></div>}
        </div>
        {gStep>1&&<div className={`step-card ${done?'done':''}`}>
          <div className="step-label">שלב ב׳ — כמה {c.l1} וכמה {c.l2}?</div>
          <div className="ans-row" dir="rtl">
            <label>{c.l1}: <input type="text" value={gA} disabled={done} onChange={e=>{setGA(e.target.value);setFb(null);}} placeholder="?"/></label>
            <label>{c.l2}: <input type="text" value={gB} disabled={done} onChange={e=>{setGB(e.target.value);setFb(null);}} onKeyDown={e=>e.key==='Enter'&&checkAB()} placeholder="?"/></label>
            {!done&&<button className="btn bg" onClick={checkAB}>✓ בדוק</button>}
          </div>
          {done?<div className="fb ok">✓ נכון! <span dir="ltr">{ex.a} · {ex.k} = {ex.A}</span>, <span dir="ltr">{ex.b} · {ex.k} = {ex.B}</span></div>:<Fb fb={fb}/>}
        </div>}
      </>}

      {ex.kind==='table'&&<>
        <div className="card-t">טבלת יחסים</div>
        <p className="q-text">היחס בין {c.l1} ל{c.l2} הוא <b dir="ltr">{ex.a} : {ex.b}</b>, ובסך הכל יש <b>{ex.total}</b> {c.unit}. השלימו את הטבלה.</p>
        <RatioTable h1={c.l1} h2={c.l2} rows={[['יחס',cellIn(0),cellIn(1),cellIn(2)],['כמות',cellIn(3),cellIn(4),cellIn(5)]]} mult={done?ex.k:null}/>
        {!done&&<div className="center"><button className="btn bg" onClick={checkTable}>✓ בדוק</button></div>}
        {!done&&fb==='err'&&<div className="fb err">יש תאים שגויים (מסומנים באדום). שורת היחס: חלקי היחס וסכומם. שורת הכמות: כל מספר כפול מספר הקבוצות.</div>}
        {done&&<div className="fb ok">✓ נכון! כל מספר בשורת היחס כפול {ex.k} נותן את שורת הכמות.</div>}
      </>}
    </div>

    {done?<div className="banner">
      ✅ כל הכבוד!
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={next}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={next}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══════ Chapter 2: Proportion ═══════ */
function genProportion(){
  const contexts = [
    {q:'מים שוקלות',unit1:'כוסות',unit2:'גרם',vis:'glass',tail:c=>`כמה גרם ישקלו ${c} כוסות?`},
    {q:'נסיעה לוקחת',unit1:'ק"מ',unit2:'דקות',vis:'bar',tail:c=>`כמה דקות ייקחו ${c} ק"מ?`},
    {q:'דורשות',unit1:'עוגות',unit2:'ביצים',vis:'pie',tail:c=>`כמה ביצים יידרשו ל-${c} עוגות?`},
    {q:'עולות',unit1:'חולצות',unit2:'₪',vis:'people',tail:c=>`כמה יעלו ${c} חולצות?`},
    {q:'מכילים',unit1:'בקבוקים',unit2:'ליטר',vis:'glass',tail:c=>`כמה ליטר יכילו ${c} בקבוקים?`},
  ];
  const ctx = pick(contexts);
  const a = randInt(2,6);
  const b = a * pick([5,10,15,20,25,30,50]);
  const c = randInt(a+1, 12);
  // make sure c != a
  const d = (b/a)*c;
  return {ctx, a, b, c, d: Math.round(d)};
}

function Ch2(){
  const [ex,setEx]=useState(()=>genProportion());
  const [step,setStep]=useState(1);
  const [p1,setP1]=useState('');const [p2,setP2]=useState('');
  const [p3,setP3]=useState('');const [p4,setP4]=useState('');
  const [fb,setFb]=useState(null);
  const [eq,setEq]=useState(null);        // the proportion as the student wrote it (#87)
  const [flipped,setFlipped]=useState(false);
  const eqNow = eq?(flipped?pqFlip(eq):eq):null;

  // step 2: equation-solving state (operation-box method)
  const [crossed,setCrossed]=useState(false);
  const [cur,setCur]=useState(null);
  const [opType,setOpType]=useState('+');
  const [opVal,setOpVal]=useState('');
  const [opIsX,setOpIsX]=useState(false);
  const [opErr,setOpErr]=useState('');

  const solved = useMemo(()=>cur?pqCheckSolved(cur):null,[cur]);
  const canSimpAny = cur?(pqCanSimp(cur.left)||pqCanSimp(cur.right)):false;

  const check1=()=>{
    // any correct order is accepted, x in any box (#87): checked by pqCheckProportion
    const r=pqCheckProportion([p1,p2,p3,p4],[ex.a,ex.b,ex.c],ex.d);
    if(r.ok){
      setFb('ok');setEq(r.slots);setFlipped(false);
      setTimeout(()=>{
        setStep(2);setFb(null);
      },600);
    } else setFb(r.why);
  };
  const doCrossMultiply=()=>{
    setCur(pqCross(eqNow));
    setCrossed(true);
  };
  // flipping (#92): no cross-multiplication after it, the student solves x/… = … with the inverse operation
  const doFlip=()=>{
    setFlipped(true);
    setCur(pqAsFracs(pqFlip(eq)));
    setCrossed(true);
  };
  const setOpValClean=v=>{setOpVal(v);setOpErr('');};
  const setOpTypeClean=t=>{setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false);};
  const toggleOpIsX=()=>{setOpIsX(v=>!v);setOpErr('');};
  const applyOp=()=>{
    const v=opVal.trim();
    if(!/^-?\d+$/.test(v)){setOpErr('הזינו מספר שלם');return;}
    const k=parseInt(v,10);
    if(k===0){setOpErr('בחרו מספר שאינו אפס');return;}
    const isX=opIsX&&(opType==='+'||opType==='−');
    setCur(c=>pqDoOperate(c,opType,k,isX));
    setOpVal('');setOpErr('');setOpIsX(false);
  };
  const handleSimplify=()=>{
    setCur(c=>({left:pqCanSimp(c.left)?pqDoSimplify(c.left):c.left,right:pqCanSimp(c.right)?pqDoSimplify(c.right):c.right}));
  };
  const finish=()=>setStep(3);
  const reset=()=>{
    const e=genProportion();setEx(e);setStep(1);
    setP1('');setP2('');setP3('');setP4('');setFb(null);setEq(null);setFlipped(false);
    setCrossed(false);setCur(null);setOpVal('');setOpErr('');setOpType('+');setOpIsX(false);
  };

  const renderTerms=terms=>terms.map((t,i)=><PqTermPill key={t.id} term={t} index={i}/>);

  return <div className="content">
    <div className="info">
      <b>פרופורציה</b> היא שוויון בין שני יחסים: <span style={{direction:'ltr',display:'inline-block'}}><Frac n="a" d="b"/> = <Frac n="c" d="d"/></span>
    </div>
    <div className="example-box">
      <div className="ex-title">לדוגמה:</div>
      <div style={{textAlign:'center'}}>3 חוברות עולות 12 ₪. כמה יעלו 5 חוברות?</div>
      <div style={{textAlign:'center',fontSize:13,color:'#0f766e',marginTop:4}}>מה כל שבר מייצג — ומה שלא ידוע מסמנים ב-x:</div>
      <div className="ex-eq" style={{fontSize:14,color:'#5eaba3'}}>
        <Frac n="כמות" d="מחיר" style={{fontFamily:"'Segoe UI',Tahoma,sans-serif"}}/>&nbsp;=&nbsp;<Frac n="כמות" d="מחיר" style={{fontFamily:"'Segoe UI',Tahoma,sans-serif"}}/>
      </div>
      <div className="ex-eq"><Frac n={3} d={12}/>&nbsp;=&nbsp;<Frac n={5} d="x"/></div>
      <div style={{textAlign:'center',fontSize:13,color:'#0f766e',marginTop:6}}>הכפלה בהצלבה:</div>
      <CrossMultDiagram tl={3} tr={5} bl={12} br="x"/>
      <div className="ex-eq">3 · x = 12 · 5 = 60</div>
      <div className="ex-eq">x = <Frac n={60} d={3}/> = 20</div>
      <div style={{textAlign:'center',fontWeight:700,color:'#0f766e'}}>5 חוברות יעלו 20 ₪</div>
    </div>
    <div className="card">
      <div className="card-t">פרופורציה</div>
      <p className="q-text">
        אם <b>{ex.a}</b> {ex.ctx.unit1} {ex.ctx.q} <b>{ex.b}</b> {ex.ctx.unit2},<br/>
        {ex.ctx.tail(ex.c)}
      </p>
      {/* the half-coloured picture under the question was removed (Sulaiman, fixes board #92: not helpful) */}

      {/* Step 1 */}
      <div className={`step-card ${step>1?'done':''}`}>
        <div className="step-label">שלב א׳ — כתוב את הפרופורציה</div>
        {step===1&&<div className="rp-hint">אפשר לכתוב את הפרופורציה בכל סדר נכון, ו-x יכול להיות במונה או במכנה.</div>}
        {step===1?<>
          <div className="ans-row" style={{fontSize:20}}>
            <Frac n={<input type="text" value={p1} onChange={e=>{setP1(e.target.value);setFb(null);}} placeholder="?" style={{width:50,fontSize:16}}/>}
                  d={<input type="text" value={p2} onChange={e=>{setP2(e.target.value);setFb(null);}} placeholder="?" style={{width:50,fontSize:16}}/>}/>
            <span style={{fontSize:24,margin:'0 6px'}}>=</span>
            <Frac n={<input type="text" value={p3} onChange={e=>{setP3(e.target.value);setFb(null);}} placeholder="?" style={{width:50,fontSize:16}}/>}
                  d={<input type="text" value={p4} onChange={e=>{setP4(e.target.value);setFb(null);}} placeholder="?" style={{width:50,fontSize:16}}
                    onKeyDown={e=>e.key==='Enter'&&check1()}/>}/>
            <button className="btn bg" onClick={check1} style={{marginRight:8}}>✓ בדוק</button>
          </div>
          <PqFb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>
          ✓ <Frac n={eq[0]} d={eq[1]} style={{color:'#16a34a'}}/> = <Frac n={eq[2]} d={eq[3]} style={{color:'#16a34a'}}/>
        </div>}
      </div>

      {/* Step 2 */}
      {step>=2 && <div className={`step-card ${step>2?'done':''}`}>
        <div className="step-label">שלב ב׳ — פתרו את המשוואה כדי למצוא את x</div>
        {step===2?<>
          {!crossed?<PqStart slots={eqNow} onFlip={doFlip} onCross={doCrossMultiply}/>:<>
            {flipped&&<div className="fb ok pq-flipped">✓ הפכנו את שני השברים, ועכשיו x במונה. המשיכו לפתור את המשוואה בפעולה הפוכה.</div>}
            <div className="solve-grid">
              {solved===null&&<>
                <div className="g-left"><PqOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
                <div className="g-mid"></div>
                <div className="g-right"><PqOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
              </>}
              <div className="g-left side-zone">{renderTerms(cur.left)}</div>
              <span className="g-mid eq-sign">=</span>
              <div className="g-right side-zone">{renderTerms(cur.right)}</div>
            </div>
            {opErr&&<div className="fb err">{opErr}</div>}
            {solved===null?
              <div className="ans-row">
                <button className="btn bg" onClick={applyOp}>✓ אישור</button>
                <button className="btn" style={{background:'#e5e7eb',color:'#374151'}} disabled={!canSimpAny} onClick={handleSimplify}>פשט</button>
              </div>
            :<>
              <div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ x = {solved}</div>
              <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={finish}>המשך ›</button></div>
            </>}
          </>}
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ x = {ex.d} {ex.ctx.unit2}</div>}
      </div>}
    </div>

    {step===3?<div className="banner">
      ✅ כל הכבוד!
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══════ Chapter 4: Percent Calculations ═══════ */
function genPctCalc(){
  const type = randInt(0,2);
  // part must divide out to an exact integer (whole·pct/100) so the
  // cross-multiplied equation always solves to a whole number via the
  // operation-box mechanic — retry until an exact combo is found
  let pct,whole,part;
  for(let tries=0;tries<200;tries++){
    pct = pick([10,15,20,25,30,40,50,60,75,80]);
    whole = pick([40,50,60,80,100,120,150,200,240,250,300,400,500]);
    part = whole*pct/100;
    if(Number.isInteger(part)) break;
  }
  if(!Number.isInteger(part)){pct=20;whole=50;part=10;}

  if(type===0){
    // X% of Y = ?
    const contexts = [
      `כמה זה ${pct}% מ-${whole}?`,
      `${pct}% מתוך ${whole} תלמידים — כמה תלמידים?`,
      `${pct}% הנחה על פריט ב-${whole}₪ — כמה ההנחה?`,
    ];
    return {type,pct,whole,part,ans:part,q:pick(contexts)};
  } else if(type===1){
    // X is what % of Y?
    const contexts = [
      `${part} הם כמה אחוז מ-${whole}?`,
      `מתוך ${whole} תלמידים, ${part} קיבלו ציון מעולה. כמה אחוז?`,
    ];
    return {type,pct,whole,part,ans:pct,q:pick(contexts)};
  } else {
    // X% of ? = Y
    const q = `${pct}% מהכיתה הם ${part} תלמידים. כמה תלמידים בכיתה?`;
    return {type,pct,whole,part,ans:whole,q};
  }
}

function Ch4(){
  const [ex,setEx]=useState(()=>genPctCalc());
  const [step,setStep]=useState(1);
  const [p1,setP1]=useState('');const [p2,setP2]=useState('');
  const [p3,setP3]=useState('');const [p4,setP4]=useState('');
  const [fb,setFb]=useState(null);

  // step 2: equation-solving state (operation-box method, same as Ch2)
  const [crossed,setCrossed]=useState(false);
  const [cur,setCur]=useState(null);
  const [opType,setOpType]=useState('+');
  const [opVal,setOpVal]=useState('');
  const [opIsX,setOpIsX]=useState(false);
  const [opErr,setOpErr]=useState('');

  const solved = useMemo(()=>cur?pqCheckSolved(cur):null,[cur]);
  const canSimpAny = cur?(pqCanSimp(cur.left)||pqCanSimp(cur.right)):false;

  // the proportion as the student wrote it: any correct order, x in any box (#87)
  const [eq,setEq]=useState(null);
  const [flipped,setFlipped]=useState(false);
  const eqNow = eq?(flipped?pqFlip(eq):eq):null;
  // the three known numbers (part, whole, percent, 100 without the unknown one)
  const known = ex.type===0?[ex.whole,ex.pct,100]:ex.type===1?[ex.part,ex.whole,100]:[ex.part,ex.pct,100];

  const check1=()=>{
    const r=pqCheckProportion([p1,p2,p3,p4],known,ex.ans);
    if(r.ok){
      setFb('ok');setEq(r.slots);setFlipped(false);
      setTimeout(()=>{setStep(2);setFb(null);},600);
    } else setFb(r.why);
  };
  const doCrossMultiply=()=>{
    setCur(pqCross(eqNow));
    setCrossed(true);
  };
  // flipping (#92): no cross-multiplication after it, the student solves x/… = … with the inverse operation
  const doFlip=()=>{
    setFlipped(true);
    setCur(pqAsFracs(pqFlip(eq)));
    setCrossed(true);
  };
  const setOpValClean=v=>{setOpVal(v);setOpErr('');};
  const setOpTypeClean=t=>{setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false);};
  const toggleOpIsX=()=>{setOpIsX(v=>!v);setOpErr('');};
  const applyOp=()=>{
    const v=opVal.trim();
    if(!/^-?\d+$/.test(v)){setOpErr('הזינו מספר שלם');return;}
    const k=parseInt(v,10);
    if(k===0){setOpErr('בחרו מספר שאינו אפס');return;}
    const isX=opIsX&&(opType==='+'||opType==='−');
    setCur(c=>pqDoOperate(c,opType,k,isX));
    setOpVal('');setOpErr('');setOpIsX(false);
  };
  const handleSimplify=()=>{
    setCur(c=>({left:pqCanSimp(c.left)?pqDoSimplify(c.left):c.left,right:pqCanSimp(c.right)?pqDoSimplify(c.right):c.right}));
  };
  const finish=()=>setStep(3);
  const reset=()=>{
    const e=genPctCalc();setEx(e);setStep(1);
    setP1('');setP2('');setP3('');setP4('');setFb(null);setEq(null);setFlipped(false);
    setCrossed(false);setCur(null);setOpVal('');setOpErr('');setOpType('+');setOpIsX(false);
  };

  const renderTerms=terms=>terms.map((t,i)=><PqTermPill key={t.id} term={t} index={i}/>);

  return <div className="content">
    <div className="info">
      <b>חישובי אחוזים</b> מבוססים על היחס הקבוע <span style={{direction:'ltr',display:'inline-block'}}><Frac n="חלק" d="שלם" style={{fontFamily:"'Segoe UI',Tahoma,sans-serif"}}/> = <Frac n="אחוז" d="100" style={{fontFamily:"'Segoe UI',Tahoma,sans-serif"}}/></span> —
      מסמנים את הגודל הלא-ידוע ב-x, כותבים את השוויון, ופותרים אותו כמו כל משוואה.
    </div>
    <div className="example-box">
      <div className="ex-title">לדוגמה:</div>
      <div style={{textAlign:'center'}}>כמה זה 20% מ-50?</div>
      <div style={{textAlign:'center',fontSize:13,color:'#0f766e',marginTop:4}}>מסמנים את החלק הלא-ידוע ב-x וכותבים שוויון שברים:</div>
      <div className="ex-eq" style={{fontSize:14,color:'#5eaba3'}}>
        <Frac n="חלק" d="שלם" style={{fontFamily:"'Segoe UI',Tahoma,sans-serif"}}/>&nbsp;=&nbsp;<Frac n="אחוז" d={100} style={{fontFamily:"'Segoe UI',Tahoma,sans-serif"}}/>
      </div>
      <div className="ex-eq"><Frac n="x" d={50}/>&nbsp;=&nbsp;<Frac n={20} d={100}/></div>
      <div style={{textAlign:'center',fontSize:13,color:'#0f766e',marginTop:6}}>הכפלה בהצלבה:</div>
      <CrossMultDiagram tl="x" tr={20} bl={50} br={100}/>
      <div className="ex-eq">x · 100 = 50 · 20 = 1000</div>
      <div className="ex-eq">x = <Frac n={1000} d={100}/> = 10</div>
      <div style={{textAlign:'center',fontWeight:700,color:'#0f766e'}}>התשובה: 20% מתוך 50 שווים <span dir="ltr">10</span></div>
    </div>
    <div className="card">
      <div className="card-t">חישובי אחוזים</div>
      {/* the half-coloured bar by the question was removed (Sulaiman, fixes board #92: not helpful) */}
      <p className="q-text">{ex.q}</p>

      {/* Step 1 */}
      <div className={`step-card ${step>1?'done':''}`}>
        <div className="step-label">שלב א׳ — סמנו את הלא-ידוע ב-x וכתבו את שוויון השברים</div>
        {step===1&&<div className="rp-hint">אפשר לכתוב את שוויון השברים בכל סדר נכון, ו-x יכול להיות במונה או במכנה.</div>}
        {step===1?<>
          <div className="ans-row" style={{fontSize:20}}>
            <Frac n={<input type="text" value={p1} onChange={e=>{setP1(e.target.value);setFb(null);}} placeholder="?" style={{width:50,fontSize:16}}/>}
                  d={<input type="text" value={p2} onChange={e=>{setP2(e.target.value);setFb(null);}} placeholder="?" style={{width:50,fontSize:16}}/>}/>
            <span style={{fontSize:24,margin:'0 6px'}}>=</span>
            <Frac n={<input type="text" value={p3} onChange={e=>{setP3(e.target.value);setFb(null);}} placeholder="?" style={{width:50,fontSize:16}}/>}
                  d={<input type="text" value={p4} onChange={e=>{setP4(e.target.value);setFb(null);}} placeholder="?" style={{width:50,fontSize:16}}
                    onKeyDown={e=>e.key==='Enter'&&check1()}/>}/>
            <button className="btn bg" onClick={check1} style={{marginRight:8}}>✓ בדוק</button>
          </div>
          <PqFb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>
          ✓ <Frac n={eq[0]} d={eq[1]} style={{color:'#16a34a'}}/> = <Frac n={eq[2]} d={eq[3]} style={{color:'#16a34a'}}/>
        </div>}
      </div>

      {/* Step 2 */}
      {step>=2 && <div className={`step-card ${step>2?'done':''}`}>
        <div className="step-label">שלב ב׳ — פתרו את המשוואה כדי למצוא את x</div>
        {step===2?<>
          {!crossed?<PqStart slots={eqNow} onFlip={doFlip} onCross={doCrossMultiply}/>:<>
            {flipped&&<div className="fb ok pq-flipped">✓ הפכנו את שני השברים, ועכשיו x במונה. המשיכו לפתור את המשוואה בפעולה הפוכה.</div>}
            <div className="solve-grid">
              {solved===null&&<>
                <div className="g-left"><PqOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
                <div className="g-mid"></div>
                <div className="g-right"><PqOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
              </>}
              <div className="g-left side-zone">{renderTerms(cur.left)}</div>
              <span className="g-mid eq-sign">=</span>
              <div className="g-right side-zone">{renderTerms(cur.right)}</div>
            </div>
            {opErr&&<div className="fb err">{opErr}</div>}
            {solved===null?
              <div className="ans-row">
                <button className="btn bg" onClick={applyOp}>✓ אישור</button>
                <button className="btn" style={{background:'#e5e7eb',color:'#374151'}} disabled={!canSimpAny} onClick={handleSimplify}>פשט</button>
              </div>
            :<>
              <div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ x = {solved}</div>
              <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={finish}>המשך ›</button></div>
            </>}
          </>}
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ x = {ex.ans}</div>}
      </div>}
    </div>

    {step===3?<div className="banner">
      ✅ כל הכבוד! התשובה: {ex.ans}
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══════ Chapter 5: Percent Increase/Decrease ═══════ */
// picks (pct, original) so that original·pct/100 is always an exact integer —
// avoids the rounding-drift dead-ends found earlier (#30, #36): with an exact
// diff, final/actualPct/the solved x all come out clean with no Math.round
function genExactPctPair(){
  const pcts = [10,15,20,25,30,40,50];
  let pct,original,diff;
  for(let tries=0;tries<200;tries++){
    pct = pick(pcts);
    original = pick([40,50,60,80,100,120,150,200,240,250,300,400,500]);
    diff = original*pct/100;
    if(Number.isInteger(diff)) break;
  }
  if(!Number.isInteger(diff)){pct=10;original=200;diff=20;}
  return {pct,original,diff};
}
function genPctChange(){
  const type = randInt(0,3);
  if(type===0){
    // increase: price * (1+p/100)
    const {pct,original,diff} = genExactPctPair();
    const mult = round2(1+pct/100);
    const contexts = [
      {q:`מחיר של ${original}₪ עלה ב-${pct}%. כמה הוא עכשיו?`,label:'מחיר מקורי',finalLabel:'מחיר סופי'},
      {q:`שכר של ${original}₪ עלה ב-${pct}%. כמה הוא עכשיו?`,label:'שכר מקורי',finalLabel:'שכר סופי'},
    ];
    const ctx = pick(contexts);
    return {type,pct,original,final:original+diff,mult,q:ctx.q,label:ctx.label,finalLabel:ctx.finalLabel};
  } else if(type===1){
    // decrease: price * (1-p/100)
    const {pct,original,diff} = genExactPctPair();
    const mult = round2(1-pct/100);
    const contexts = [
      {q:`הנחה של ${pct}% על פריט ב-${original}₪ — כמה משלמים?`,label:'מחיר מקורי'},
      {q:`מחיר של ${original}₪ ירד ב-${pct}%. כמה הוא עכשיו?`,label:'מחיר מקורי'},
    ];
    const ctx = pick(contexts);
    return {type,pct,original,final:original-diff,mult,q:ctx.q,label:ctx.label};
  } else if(type===2){
    // find percent change
    const {pct,original,diff} = genExactPctPair();
    const isUp = randInt(0,1);
    const final_ = isUp?original+diff:original-diff;
    const dir = isUp?'עלה':'ירד';
    return {type,pct,original,final:final_,diff,dir,
      q:`מחיר ${dir} מ-${original}₪ ל-${final_}₪ — בכמה אחוז?`};
  } else {
    // find original: x · mult = final
    const {pct,original,diff} = genExactPctPair();
    const isUp = randInt(0,1);
    const mult = round2(isUp?1+pct/100:1-pct/100);
    const final_ = isUp?original+diff:original-diff;
    const dir = isUp?'עלייה':'הנחה';
    return {type,pct,original,final:final_,mult,isUp,
      q:`אחרי ${dir} של ${pct}% המחיר הוא ${final_}₪ — מה היה המחיר המקורי?`};
  }
}

function Ch5(){
  const [ex,setEx]=useState(()=>genPctChange());
  const [step,setStep]=useState(1);
  const [a1,setA1]=useState('');const [a2,setA2]=useState('');const [a3,setA3]=useState('');
  const [fb,setFb]=useState(null);

  // type 3 only (find original): equation-solving state (operation-box
  // method, same as Ch2/Ch4) — used after clearing the decimal multiplier
  const [crossed,setCrossed]=useState(false);
  const [cur,setCur]=useState(null);
  const [opType,setOpType]=useState('+');
  const [opVal,setOpVal]=useState('');
  const [opIsX,setOpIsX]=useState(false);
  const [opErr,setOpErr]=useState('');

  const solved = useMemo(()=>cur?pqCheckSolved(cur):null,[cur]);
  const canSimpAny = cur?(pqCanSimp(cur.left)||pqCanSimp(cur.right)):false;

  const checkStep1=()=>{
    let correct = false;
    if(ex.type===0||ex.type===1){
      // expect: original · mult = ?
      const v1=parseFloat(a1), v2=parseFloat(a2);
      if((v1===ex.original&&v2===ex.mult)||(v2===ex.original&&v1===ex.mult)) correct=true;
    } else if(ex.type===2){
      // expect: diff/original · 100 or (final-original)/original · 100
      const v1=parseInt(a1),v2=parseInt(a2),v3=parseInt(a3);
      if(v1===ex.diff&&v2===ex.original&&v3===100) correct=true;
      if(v1===ex.diff&&v2===ex.original) correct=true;
    } else {
      // find original: x · mult = final
      const v1=parseFloat(a1),v2=parseFloat(a2);
      if((v1===ex.mult&&v2===ex.final)||(v2===ex.mult&&v1===ex.final)) correct=true;
    }
    if(correct){setFb('ok');setTimeout(()=>{setStep(2);setFb(null);},600);}
    else setFb('err');
  };
  const checkStep2=()=>{
    const v=parseFloat(a3||a1);
    let ans;
    if(ex.type===0||ex.type===1) ans=ex.final;
    else ans=ex.pct;
    if(v===ans){setFb('ok');setStep(3);}
    else setFb('err');
  };
  const clearDecimal=()=>{
    const leftCoef = ex.isUp?100+ex.pct:100-ex.pct;
    setCur({left:[pqMkTerm('x',leftCoef)],right:[pqMkTerm('const',ex.final*100)]});
    setCrossed(true);
  };
  const setOpValClean=v=>{setOpVal(v);setOpErr('');};
  const setOpTypeClean=t=>{setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false);};
  const toggleOpIsX=()=>{setOpIsX(v=>!v);setOpErr('');};
  const applyOp=()=>{
    const v=opVal.trim();
    if(!/^-?\d+$/.test(v)){setOpErr('הזינו מספר שלם');return;}
    const k=parseInt(v,10);
    if(k===0){setOpErr('בחרו מספר שאינו אפס');return;}
    const isX=opIsX&&(opType==='+'||opType==='−');
    setCur(c=>pqDoOperate(c,opType,k,isX));
    setOpVal('');setOpErr('');setOpIsX(false);
  };
  const handleSimplify=()=>{
    setCur(c=>({left:pqCanSimp(c.left)?pqDoSimplify(c.left):c.left,right:pqCanSimp(c.right)?pqDoSimplify(c.right):c.right}));
  };
  const finish=()=>setStep(3);
  const reset=()=>{
    const e=genPctChange();setEx(e);setStep(1);setA1('');setA2('');setA3('');setFb(null);
    setCrossed(false);setCur(null);setOpVal('');setOpErr('');setOpType('+');setOpIsX(false);
  };

  const renderTerms=terms=>terms.map((t,i)=><PqTermPill key={t.id} term={t} index={i}/>);

  return <div className="content">
    <div className="info">
      <b>עלייה/ירידה באחוזים</b> — במקום לחשב את האחוז בנפרד ואז לחבר או להחסיר, אפשר להכפיל
      ישירות במכפיל: <span className="rp-rule">עלייה של <span dir="ltr">X%</span> — מכפיל <span dir="ltr" className="rp-mult">1 + <Frac n="X" d={100} style={{fontFamily:"'Segoe UI',Tahoma,sans-serif"}}/></span>.</span>
      <span className="rp-rule">ירידה של <span dir="ltr">X%</span> — מכפיל <span dir="ltr" className="rp-mult">1 − <Frac n="X" d={100} style={{fontFamily:"'Segoe UI',Tahoma,sans-serif"}}/></span>.</span>
    </div>
    <div className="example-box">
      <div className="ex-title">לדוגמה:</div>
      <div style={{textAlign:'center'}}>מחיר של 200₪ עלה ב-10%. כמה הוא עכשיו?</div>
      <div style={{textAlign:'center',fontSize:13,color:'#0f766e',marginTop:4}}>מחשבים את המכפיל:</div>
      <div className="ex-eq">1 + <Frac n={10} d={100}/> = 1.1</div>
      <div style={{textAlign:'center',fontSize:13,color:'#0f766e',marginTop:4}}>מכפילים במחיר המקורי:</div>
      <div className="ex-eq">200 · 1.1 = 220</div>
      <div style={{textAlign:'center',fontWeight:700,color:'#0f766e'}}>המחיר עכשיו הוא <span dir="ltr">220 ₪</span></div>
    </div>
    {ex.type===3 && <div className="example-box">
      <div className="ex-title">מציאת המחיר המקורי:</div>
      <div style={{textAlign:'center'}}>לאחר עלייה של 15%, המחיר הוא 230 ₪. מה היה המחיר המקורי?</div>
      <div style={{textAlign:'center',fontSize:13,color:'#0f766e',marginTop:4}}>מסמנים את המחיר המקורי ב-x וכותבים את הנוסחה:</div>
      <div className="ex-eq">x · 1.15 = 230</div>
      <div style={{textAlign:'center',fontSize:13,color:'#0f766e',marginTop:6}}>כדי להיפטר מהעשרוני, מכפילים את שני האגפים ב-100:</div>
      <div className="ex-eq">x · 115 = 23000</div>
      <div style={{textAlign:'center',fontSize:13,color:'#0f766e',marginTop:4}}>מחלקים ב-115:</div>
      <div className="ex-eq">x = <Frac n={23000} d={115}/> = 200</div>
      <div style={{textAlign:'center',fontWeight:700,color:'#0f766e'}}>המחיר המקורי היה <span dir="ltr">200 ₪</span></div>
    </div>}
    <div className="card">
      <div className="card-t">עלייה וירידה באחוזים</div>
      {(ex.type===0||ex.type===1)?
        <div className="vis-wrap"><PriceTag original={ex.original} final={step>=3?ex.final:null} label={ex.label} finalLabel={ex.finalLabel}/></div>
        :ex.type===2?
        <div className="vis-wrap"><BeforeAfterBar before={ex.original} after={ex.final}/></div>
        :<div className="vis-wrap"><PriceTag original={step>2?ex.original:'?'} final={ex.final} label="מחיר מקורי"/></div>
      }
      <p className="q-text">{ex.q}</p>

      <div className={`step-card ${step>1?'done':''}`}>
        <div className="step-label">שלב א׳ — כתוב את הנוסחה{ex.type===3?' (סמנו את המחיר המקורי ב-x)':''}</div>
        {step===1?<>
          {(ex.type===0||ex.type===1)?<div className="ans-row" style={{fontSize:18}}>
            <input type="text" value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:70}}/>
            <span>·</span>
            <input type="text" value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" style={{width:70}}
              onKeyDown={e=>e.key==='Enter'&&checkStep1()}/>
            <span>=</span><span>?</span>
            <button className="btn bg" onClick={checkStep1}>✓ בדוק</button>
          </div>
          :ex.type===2?<div className="ans-row" style={{fontSize:16}}>
            <Frac n={<input type="text" value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:50,fontSize:15}}/>}
                  d={<input type="text" value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" style={{width:50,fontSize:15}}/>}/>
            <span>· 100 = ?</span>
            <button className="btn bg" onClick={checkStep1}>✓ בדוק</button>
          </div>
          :<div className="ans-row" style={{fontSize:18}}>
            <span>x</span><span>·</span>
            <input type="text" value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="מכפיל" style={{width:70}}/>
            <span>=</span>
            <input type="text" value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="סופי" style={{width:70}}
              onKeyDown={e=>e.key==='Enter'&&checkStep1()}/>
            <button className="btn bg" onClick={checkStep1}>✓ בדוק</button>
          </div>}
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
          {ex.type===3?<>✓ x · {ex.mult} = {ex.final}</>:'✓ שלב הושלם'}
        </div>}
      </div>

      {step>=2 && ex.type!==3 && <div className={`step-card ${step>2?'done':''}`}>
        <div className="step-label">שלב ב׳ — מצא את התשובה</div>
        {step===2?<>
          <div className="ans-row">
            <input type="text" value={a3} onChange={e=>{setA3(e.target.value);setFb(null);}} placeholder="?"
              onKeyDown={e=>e.key==='Enter'&&checkStep2()} style={{width:80}}/>
            {ex.type===2?<span>%</span>:<span>₪</span>}
            <button className="btn bg" onClick={checkStep2}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>
          ✓ {ex.type===0||ex.type===1?ex.final+'₪':ex.pct+'%'}
        </div>}
      </div>}

      {/* type 3 only: solve x·mult=final via the operation-box mechanic,
          after an explicit ×100 step to clear the decimal multiplier */}
      {step>=2 && ex.type===3 && <div className={`step-card ${step>2?'done':''}`}>
        <div className="step-label">שלב ב׳ — פתרו את המשוואה כדי למצוא את x (המחיר המקורי)</div>
        {step===2?<>
          {!crossed?<>
            <div className="ans-row" style={{fontSize:20}}>x · {ex.mult} = {ex.final}</div>
            <p style={{fontSize:13,color:'#64748b',textAlign:'center',margin:'6px 0'}}>
              כדי להימנע ממספר עשרוני, מכפילים את שני האגפים ב-100:
            </p>
            <div className="center" style={{marginTop:6}}>
              <button className="btn bg" onClick={clearDecimal}>✕ הכפילו ב-100</button>
            </div>
          </>:<>
            <div className="solve-grid">
              {solved===null&&<>
                <div className="g-left"><PqOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
                <div className="g-mid"></div>
                <div className="g-right"><PqOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
              </>}
              <div className="g-left side-zone">{renderTerms(cur.left)}</div>
              <span className="g-mid eq-sign">=</span>
              <div className="g-right side-zone">{renderTerms(cur.right)}</div>
            </div>
            {opErr&&<div className="fb err">{opErr}</div>}
            {solved===null?
              <div className="ans-row">
                <button className="btn bg" onClick={applyOp}>✓ אישור</button>
                <button className="btn" style={{background:'#e5e7eb',color:'#374151'}} disabled={!canSimpAny} onClick={handleSimplify}>פשט</button>
              </div>
            :<>
              <div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ x = {solved}</div>
              <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={finish}>המשך ›</button></div>
            </>}
          </>}
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ x = {ex.original}₪</div>}
      </div>}
    </div>

    {step===3?<div className="banner">
      ✅ כל הכבוד!
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* Chapter 2 has two sub-chapters (Sulaiman, fixes board #86): the proportion itself, and
   percent calculations as one of its applications (until 2026-11-21 its own chapter "4. חישובי %").
   The conversions chapter moved to "יסודות החשבון" (directed-numbers, fixes board #85). */
function Ch2Parts(){
  const [part,setPart]=useState(0);
  return <div>
    <div className="content" style={{marginBottom:0}}>
      <div className="sub-tabs">
        <button className={`sub-tab-btn ${part===0?'active':''}`} onClick={()=>setPart(0)}>א. פרופורציה</button>
        <button className={`sub-tab-btn ${part===1?'active':''}`} onClick={()=>setPart(1)}>ב. יישום של פרופורציה - אחוזים</button>
      </div>
    </div>
    {part===0?<Ch2 key="p"/>:<Ch4 key="pct"/>}
  </div>;
}

/* ═══════ Main App ═══════ */
function App(){
  const [ch, setCh] = useState(1);
  const labels = ['יחס','פרופורציה','עלייה/ירידה'];
  return <div>
    <div className="hdr">
      <div className="hdr-title">יחס, פרופורציה ואחוזים</div>
      <div className="ch-btns">
        {labels.map((l,i)=>
          <button key={i} className={`ch-btn ${ch===i+1?'active':''}`}
            onClick={()=>setCh(i+1)}>{i+1}. {l}</button>
        )}
      </div>
    </div>
    {ch===1?<Ch1 key="c1"/>:ch===2?<Ch2Parts key="c2"/>:<Ch5 key="c3"/>}
  </div>;
}


// ===== END ORIGINAL =====
export default App;
