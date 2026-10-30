'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/intersection.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const {useState,useRef,useEffect,useCallback}=React;
function randInt(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function pick(arr){return arr[randInt(0,arr.length-1)];}
function Fb({fb}){if(!fb)return null;return fb==='ok'?<div className="fb ok">✓ נכון!</div>:<div className="fb err">✗ לא נכון, נסה שוב.</div>;}

/* ═══════ Graph Component ═══════ */
const GW=340,GH=340,GPAD=30,RANGE=8;
const SCALE=(GW-2*GPAD)/(2*RANGE);
function gx(v){return GPAD+(v+RANGE)*SCALE;}
function gy(v){return GPAD+(RANGE-v)*SCALE;}

function Graph({funcs,points}){
  const gridLines=[];
  for(let i=-RANGE;i<=RANGE;i++){
    const big=i%2===0;
    gridLines.push(<line key={`gx${i}`} x1={gx(i)} y1={gy(-RANGE)} x2={gx(i)} y2={gy(RANGE)}
      stroke={i===0?'#334155':'#e5e7eb'} strokeWidth={i===0?2:big?0.7:0.3}/>);
    gridLines.push(<line key={`gy${i}`} x1={gx(-RANGE)} y1={gy(i)} x2={gx(RANGE)} y2={gy(i)}
      stroke={i===0?'#334155':'#e5e7eb'} strokeWidth={i===0?2:big?0.7:0.3}/>);
    if(i!==0&&i%2===0){
      gridLines.push(<text key={`lx${i}`} x={gx(i)} y={gy(0)+16} textAnchor="middle" fontSize="10" fill="#6b7280">{i}</text>);
      gridLines.push(<text key={`ly${i}`} x={gx(0)-8} y={gy(i)+4} textAnchor="end" fontSize="10" fill="#6b7280">{i}</text>);
    }
  }
  gridLines.push(<polygon key="ax" points={`${gx(RANGE)+5},${gy(0)} ${gx(RANGE)-3},${gy(0)-4} ${gx(RANGE)-3},${gy(0)+4}`} fill="#334155"/>);
  gridLines.push(<polygon key="ay" points={`${gx(0)},${gy(RANGE)-5} ${gx(0)-4},${gy(RANGE)+3} ${gx(0)+4},${gy(RANGE)+3}`} fill="#334155"/>);
  gridLines.push(<text key="xl" x={gx(RANGE)+2} y={gy(0)+16} fontSize="12" fill="#334155" fontWeight="700">x</text>);
  gridLines.push(<text key="yl" x={gx(0)+10} y={gy(RANGE)+2} fontSize="12" fill="#334155" fontWeight="700">y</text>);

  const curves=funcs.map((f,fi)=>{
    const pts=[];
    for(let x=-RANGE;x<=RANGE;x+=0.1){
      const y=f.fn(x);
      if(Math.abs(y)<=RANGE+2) pts.push(`${pts.length===0?'M':'L'}${gx(x).toFixed(1)},${gy(y).toFixed(1)}`);
    }
    return <path key={fi} d={pts.join(' ')} fill="none" stroke={f.color} strokeWidth={2.5}/>;
  });

  const dots=(points||[]).map((p,i)=>(
    <g key={`p${i}`}>
      <circle cx={gx(p.x)} cy={gy(p.y)} r={6} fill="#16a34a" stroke="#fff" strokeWidth={2}/>
      <text x={gx(p.x)+8} y={gy(p.y)-8} fontSize="12" fontWeight="700" fill="#16a34a">({p.x},{p.y})</text>
    </g>
  ));

  return <svg viewBox={`0 0 ${GW} ${GH}`} style={{width:Math.min(340,GW),height:'auto',direction:'ltr'}}>
    {gridLines}{curves}{dots}
  </svg>;
}

/* ═══════ Format helpers ═══════ */
function fmtLinear(m,b,label='y'){
  let s=`${label} = `;
  if(m===0) return s+(b||'0');
  if(m===1) s+='x';
  else if(m===-1) s+='-x';
  else s+=m+'x';
  if(b>0) s+=' + '+b;
  else if(b<0) s+=' - '+(-b);
  return s;
}
function fmtQuad(a,b,c,label='y'){
  let s=`${label} = `;
  if(a===1) s+='x²';
  else if(a===-1) s+='-x²';
  else s+=a+'x²';
  if(b>0) s+=' + '+b+'x';
  else if(b<0) s+=' - '+(-b)+'x';
  if(c>0) s+=' + '+c;
  else if(c<0) s+=' - '+(-c);
  return s;
}

/* ═══════ Term formatting ═══════ */
let _termId=0;
function mkTerm(coef,type){return {id:++_termId,coef,type};}

function fmtTerm(term,isFirst){
  const c=term.coef;
  if(term.type==='x2'){
    if(c===0) return '0';
    if(c===1) return isFirst?'x²':'+ x²';
    if(c===-1) return isFirst?'-x²':'- x²';
    if(c>0) return isFirst?c+'x²':'+ '+c+'x²';
    return isFirst?c+'x²':'- '+(-c)+'x²';
  }
  if(term.type==='x'){
    if(c===0) return '0';
    if(c===1) return isFirst?'x':'+ x';
    if(c===-1) return isFirst?'-x':'- x';
    if(c>0) return isFirst?c+'x':'+ '+c+'x';
    return isFirst?c+'x':'- '+(-c)+'x';
  }
  if(c===0) return isFirst?'0':'';
  if(c>0) return isFirst?''+c:'+ '+c;
  return isFirst?''+c:'- '+(-c);
}

/* ═══════ Drag Equation Solver ═══════ */
/* mode='linear': solve for x.  mode='quadratic': move everything to left, get ...=0 */
function DragEqSolver({initLeft,initRight,onSolved,mode='linear'}){
  const [left,setLeft]=useState(initLeft);
  const [right,setRight]=useState(initRight);
  const [dragId,setDragId]=useState(null);
  const [dragFrom,setDragFrom]=useState(null);
  const [overSide,setOverSide]=useState(null);
  const [special,setSpecial]=useState('');
  const [fb,setFb]=useState(null);

  function checkState(l,r){
    if(mode==='quadratic'){
      // Check if right side is just 0
      const rAll=r.every(t=>t.coef===0);
      const rSingle=r.length===1&&r[0].coef===0;
      if(rAll||rSingle){
        // Check left has been simplified
        const types=new Set(l.map(t=>t.type));
        const counts={};
        l.forEach(t=>{counts[t.type]=(counts[t.type]||0)+1;});
        const allSingle=Object.values(counts).every(c=>c<=1);
        if(allSingle) return {status:'ready'};
      }
      return {status:'working'};
    }
    // Linear mode
    const lx=l.filter(t=>t.type==='x'), ln=l.filter(t=>t.type==='num');
    const rx=r.filter(t=>t.type==='x'), rn=r.filter(t=>t.type==='num');
    if(lx.length===1&&ln.length===0&&rx.length===0&&rn.length===1){
      if(lx[0].coef===0&&rn[0].coef===0) return {status:'identity'};
      if(lx[0].coef===0) return {status:'contradiction'};
      if(lx[0].coef===1) return {status:'solved',x:rn[0].coef};
      if(lx[0].coef===-1) return {status:'solved',x:-rn[0].coef};
      return {status:'needDivide',xCoef:lx[0].coef,num:rn[0].coef};
    }
    if(rx.length===1&&rn.length===0&&lx.length===0&&ln.length===1){
      if(rx[0].coef===0&&ln[0].coef===0) return {status:'identity'};
      if(rx[0].coef===0) return {status:'contradiction'};
      if(rx[0].coef===1) return {status:'solved',x:ln[0].coef};
      if(rx[0].coef===-1) return {status:'solved',x:-ln[0].coef};
      return {status:'needDivide',xCoef:rx[0].coef,num:ln[0].coef};
    }
    if(lx.length===0&&rx.length===0){
      const lSum=ln.reduce((s,t)=>s+t.coef,0);
      const rSum=rn.reduce((s,t)=>s+t.coef,0);
      if(lSum===rSum) return {status:'identity'};
      return {status:'contradiction'};
    }
    return {status:'working'};
  }

  const simplify=()=>{
    const simplSide=(terms)=>{
      const x2Sum=terms.filter(t=>t.type==='x2').reduce((s,t)=>s+t.coef,0);
      const xSum=terms.filter(t=>t.type==='x').reduce((s,t)=>s+t.coef,0);
      const nSum=terms.filter(t=>t.type==='num').reduce((s,t)=>s+t.coef,0);
      const res=[];
      if(x2Sum!==0) res.push(mkTerm(x2Sum,'x2'));
      if(xSum!==0) res.push(mkTerm(xSum,'x'));
      if(nSum!==0) res.push(mkTerm(nSum,'num'));
      if(res.length===0) res.push(mkTerm(0,'num'));
      return res;
    };
    const nl=simplSide(left), nr=simplSide(right);
    setLeft(nl);setRight(nr);setFb(null);
  };

  // Drag handlers
  const onDragStart=(e,termId,side)=>{
    setDragId(termId);setDragFrom(side);
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain',termId+'|'+side);
  };
  const onDragOver=(e,side)=>{e.preventDefault();setOverSide(side);};
  const onDragLeave=()=>{setOverSide(null);};
  const onDrop=(e,targetSide)=>{
    e.preventDefault();setOverSide(null);
    const data=e.dataTransfer.getData('text/plain');
    if(!data)return;
    const [tidStr,fromSide]=data.split('|');
    const tid=parseInt(tidStr);
    if(fromSide===targetSide) return; // same side, no-op
    // Move term: remove from source, add negated to target
    const src=fromSide==='left'?[...left]:[...right];
    const idx=src.findIndex(t=>t.id===tid);
    if(idx===-1) return;
    const term=src[idx];
    src.splice(idx,1);
    if(src.length===0) src.push(mkTerm(0,'num'));
    const dst=targetSide==='left'?[...left]:[...right];
    dst.push(mkTerm(-term.coef,term.type));
    if(fromSide==='left'){setLeft(src);setRight(dst);}
    else{setRight(src);setLeft(dst);}
    setDragId(null);setDragFrom(null);setFb(null);
  };
  const onDragEnd=()=>{setDragId(null);setDragFrom(null);setOverSide(null);};

  // Touch drag support
  const touchRef=useRef(null);
  const touchTermRef=useRef(null);
  const ghostRef=useRef(null);

  const onTouchStart=(e,termId,side)=>{
    const touch=e.touches[0];
    touchRef.current={id:termId,side,startX:touch.clientX,startY:touch.clientY,moved:false};
    touchTermRef.current=e.currentTarget;
    // Create ghost element
    const ghost=e.currentTarget.cloneNode(true);
    ghost.style.position='fixed';
    ghost.style.left=touch.clientX-30+'px';
    ghost.style.top=touch.clientY-20+'px';
    ghost.style.opacity='0.8';
    ghost.style.pointerEvents='none';
    ghost.style.zIndex='1000';
    ghost.style.transform='scale(1.1)';
    document.body.appendChild(ghost);
    ghostRef.current=ghost;
  };
  const onTouchMove=(e)=>{
    if(!touchRef.current) return;
    const touch=e.touches[0];
    touchRef.current.moved=true;
    if(ghostRef.current){
      ghostRef.current.style.left=touch.clientX-30+'px';
      ghostRef.current.style.top=touch.clientY-20+'px';
    }
  };
  const onTouchEnd=(e)=>{
    if(ghostRef.current){document.body.removeChild(ghostRef.current);ghostRef.current=null;}
    if(!touchRef.current||!touchRef.current.moved){touchRef.current=null;return;}
    const touch=e.changedTouches[0];
    const {id:tid,side:fromSide}=touchRef.current;
    touchRef.current=null;
    // Determine drop target by position
    const els=document.elementsFromPoint(touch.clientX,touch.clientY);
    let targetSide=null;
    for(const el of els){
      if(el.dataset.dropside){targetSide=el.dataset.dropside;break;}
    }
    if(!targetSide||targetSide===fromSide) return;
    // Same logic as onDrop
    const src=fromSide==='left'?[...left]:[...right];
    const idx=src.findIndex(t=>t.id===tid);
    if(idx===-1)return;
    const term=src[idx];
    src.splice(idx,1);
    if(src.length===0) src.push(mkTerm(0,'num'));
    const dst=targetSide==='left'?[...left]:[...right];
    dst.push(mkTerm(-term.coef,term.type));
    if(fromSide==='left'){setLeft(src);setRight(dst);}
    else{setRight(src);setLeft(dst);}
    setFb(null);
  };

  useEffect(()=>{
    window.addEventListener('touchmove',onTouchMove,{passive:true});
    window.addEventListener('touchend',onTouchEnd);
    return ()=>{window.removeEventListener('touchmove',onTouchMove);window.removeEventListener('touchend',onTouchEnd);};
  });

  const state=checkState(left,right);

  const handleSpecial=()=>{
    if(state.status==='contradiction'&&special==='none'){setFb('ok');setTimeout(()=>onSolved('parallel'),600);}
    else if(state.status==='identity'&&special==='inf'){setFb('ok');setTimeout(()=>onSolved('identical'),600);}
    else setFb('err');
  };

  const [divAns,setDivAns]=useState('');
  const handleDivide=()=>{
    const v=parseInt(divAns);
    if(v===state.num/state.xCoef){setFb('ok');setTimeout(()=>onSolved(v),600);}
    else setFb('err');
  };
  const handleSolved=()=>{
    setFb('ok');setTimeout(()=>onSolved(state.x),600);
  };

  const renderTerms=(terms,side)=>{
    return terms.map((t,i)=>{
      const txt=fmtTerm(t,i===0);
      if(!txt) return null;
      const cls=`term-chip ${t.type==='x2'?'x2-term':t.type==='x'?'x-term':'n-term'} ${dragId===t.id?'dragging':''}`;
      return <span key={t.id} className={cls} draggable
        onDragStart={e=>onDragStart(e,t.id,side)}
        onDragEnd={onDragEnd}
        onTouchStart={e=>onTouchStart(e,t.id,side)}
      >{txt}</span>;
    });
  };

  return <div>
    <div className="drag-eq">
      <div className={`drag-side ${overSide==='left'?'over':''}`}
        data-dropside="left"
        onDragOver={e=>onDragOver(e,'left')}
        onDragLeave={onDragLeave}
        onDrop={e=>onDrop(e,'left')}>
        {renderTerms(left,'left')}
      </div>
      <span className="eq-sign">=</span>
      <div className={`drag-side ${overSide==='right'?'over':''}`}
        data-dropside="right"
        onDragOver={e=>onDragOver(e,'right')}
        onDragLeave={onDragLeave}
        onDrop={e=>onDrop(e,'right')}>
        {renderTerms(right,'right')}
      </div>
    </div>
    <p className="hint">{mode==='quadratic'?'גרור איברים לצד שמאל כדי לקבל ... = 0':'גרור איברים מצד לצד כדי לבודד את x'}</p>
    <div className="simplify-row">
      <button className="btn bo" onClick={simplify}>כנס איברים דומים</button>
    </div>

    {state.status==='solved'&&<div style={{marginTop:12}}>
      <div className="fb ok" style={{fontSize:16,fontWeight:700}}>x = {state.x}</div>
      <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={handleSolved}>✓ המשך</button></div>
    </div>}

    {state.status==='needDivide'&&<div style={{marginTop:12}}>
      <p className="hint">חלק את שני האגפים ב-{state.xCoef}</p>
      <div className="ans-row">
        <span style={{fontSize:16}}>x =</span>
        <input value={divAns} onChange={e=>{setDivAns(e.target.value);setFb(null);}} placeholder="?"
          onKeyDown={e=>e.key==='Enter'&&handleDivide()}/>
        <button className="btn bg" onClick={handleDivide}>✓ בדוק</button>
      </div>
    </div>}

    {(state.status==='contradiction'||state.status==='identity')&&<div style={{marginTop:12}}>
      <p className="hint" style={{fontWeight:600,color:'#b91c1c'}}>
        {state.status==='contradiction'?'קיבלנו סתירה! מה המסקנה?':'קיבלנו זהות! מה המסקנה?'}
      </p>
      <div className="ans-row" style={{gap:12}}>
        <button className={`special-btn ${special==='none'?'active':''}`} onClick={()=>{setSpecial('none');setFb(null);}}>אין פתרון</button>
        <button className={`special-btn ${special==='inf'?'active':''}`} onClick={()=>{setSpecial('inf');setFb(null);}}>אינסוף פתרונות</button>
        <button className="btn bg" onClick={handleSpecial}>✓ בדוק</button>
      </div>
    </div>}

    {state.status==='ready'&&<div style={{marginTop:12}}>
      <div className="fb ok" style={{fontSize:16,fontWeight:700}}>המשוואה מסודרת — המשך לזיהוי מקדמים</div>
      <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={()=>{
        // collect coefficients from left side
        const a2=left.find(t=>t.type==='x2');
        const ax=left.find(t=>t.type==='x');
        const an=left.find(t=>t.type==='num');
        onSolved({a:a2?a2.coef:0, b:ax?ax.coef:0, c:an?an.coef:0});
      }}>✓ המשך</button></div>
    </div>}

    <Fb fb={fb}/>
  </div>;
}

/* ═══════ Chapter 1: Line–Line ═══════ */
function genLL(){
  const caseType=randInt(0,9); // 0-7=normal, 8=parallel, 9=identical
  if(caseType===8){
    const m=pick([-3,-2,-1,1,2,3]);
    const b1=randInt(-5,5);
    let b2;do{b2=randInt(-5,5);}while(b2===b1);
    return {m1:m,b1,m2:m,b2,type:'parallel',solX:null,solY:null};
  }
  if(caseType===9){
    const m=pick([-3,-2,-1,1,2,3]);
    const b=randInt(-5,5);
    return {m1:m,b1:b,m2:m,b2:b,type:'identical',solX:null,solY:null};
  }
  const x0=randInt(-5,5);
  const y0=randInt(-5,5);
  let m1,m2;
  do{m1=randInt(-3,3);}while(m1===0);
  do{m2=randInt(-3,3);}while(m2===0||m2===m1);
  const b1=y0-m1*x0;
  const b2=y0-m2*x0;
  return {m1,b1,m2,b2,type:'normal',solX:x0,solY:y0};
}

function Ch1(){
  const [ex,setEx]=useState(()=>genLL());
  const [phase,setPhase]=useState('eq'); // eq, drag, chooseEq, findY, writePoint, done
  const [fb,setFb]=useState(null);
  const [showPts,setShowPts]=useState([]);
  const [foundX,setFoundX]=useState(null);
  const [solY,setSolY]=useState('');
  const [ptX,setPtX]=useState('');const [ptY,setPtY]=useState('');
  const [eq1,setEq1]=useState('');const [eq2,setEq2]=useState('');
  const [chosenEq,setChosenEq]=useState(null);

  const f1=x=>ex.m1*x+ex.b1;
  const f2=x=>ex.m2*x+ex.b2;
  const funcs=[{fn:f1,color:'#2563eb'},{fn:f2,color:'#dc2626'}];

  // Step 1: write equality
  function parseSide(s){
    s=s.replace(/\s/g,'').replace(/−/g,'-').replace(/–/g,'-');
    let m=0,b=0,match;
    match=s.match(/^([+-]?\d*)x([+-]\d+)?$/);
    if(match){m=match[1]===''||match[1]==='+'?1:match[1]==='-'?-1:parseInt(match[1]);b=match[2]?parseInt(match[2]):0;return{m,b};}
    match=s.match(/^([+-]?\d+)([+-]\d*)x$/);
    if(match){b=parseInt(match[1]);m=match[2]===''||match[2]==='+'?1:match[2]==='-'?-1:parseInt(match[2]);return{m,b};}
    match=s.match(/^([+-]?\d+)$/);
    if(match) return{m:0,b:parseInt(match[1])};
    if(s==='x') return{m:1,b:0};
    if(s==='-x') return{m:-1,b:0};
    return null;
  }
  const checkEq=()=>{
    const l=eq1.trim().replace(/\s/g,''),r=eq2.trim().replace(/\s/g,'');
    const side1=parseSide(l),side2=parseSide(r);
    if(!side1||!side2){setFb('err');return;}
    const ok=((side1.m===ex.m1&&side1.b===ex.b1&&side2.m===ex.m2&&side2.b===ex.b2)||
              (side1.m===ex.m2&&side1.b===ex.b2&&side2.m===ex.m1&&side2.b===ex.b1));
    if(ok){setFb('ok');setTimeout(()=>{setPhase('drag');setFb(null);},600);}
    else setFb('err');
  };

  // Build initial terms for drag solver
  const buildInitTerms=()=>{
    const l=[], r=[];
    if(ex.m1!==0) l.push(mkTerm(ex.m1,'x'));
    if(ex.b1!==0) l.push(mkTerm(ex.b1,'num'));
    if(l.length===0) l.push(mkTerm(0,'num'));
    if(ex.m2!==0) r.push(mkTerm(ex.m2,'x'));
    if(ex.b2!==0) r.push(mkTerm(ex.b2,'num'));
    if(r.length===0) r.push(mkTerm(0,'num'));
    return {l,r};
  };

  const onDragSolved=(result)=>{
    if(result==='parallel'||result==='identical'){
      setPhase('done');
      setFoundX(result);
    } else {
      setFoundX(result);
      setPhase('chooseEq');
    }
  };

  const checkY=()=>{
    const v=parseInt(solY);
    if(v===ex.solY){setFb('ok');setTimeout(()=>{setPhase('writePoint');setFb(null);},600);}
    else setFb('err');
  };
  const checkPoint=()=>{
    const vx=parseInt(ptX),vy=parseInt(ptY);
    if(vx===ex.solX&&vy===ex.solY){setFb('ok');setShowPts([{x:ex.solX,y:ex.solY}]);setPhase('done');}
    else setFb('err');
  };

  const reset=()=>{_termId=0;const e=genLL();setEx(e);setPhase('eq');setFb(null);setShowPts([]);
    setFoundX(null);setSolY('');setPtX('');setPtY('');setEq1('');setEq2('');setChosenEq(null);};

  const initTerms=buildInitTerms();

  return <div className="content">
    <div className="card">
      <div className="card-t">חיתוך בין שני ישרים</div>
      <div className="func-labels">
        <span className="func-label" style={{background:'#dbeafe',color:'#2563eb'}}>{fmtLinear(ex.m1,ex.b1)}</span>
        <span className="func-label" style={{background:'#fee2e2',color:'#dc2626'}}>{fmtLinear(ex.m2,ex.b2)}</span>
      </div>
      <div className="graph-wrap"><Graph funcs={funcs} points={showPts}/></div>

      {/* Step 1: Write equality */}
      <div className={`step-card ${phase!=='eq'?'done':''}`}>
        <div className="step-label">שלב 1 — השווה את שתי המשוואות</div>
        <p className="hint">בנקודת החיתוך ערכי y שווים</p>
        {phase==='eq'?<>
          <div className="ans-row" style={{fontSize:18}}>
            <input value={eq1} onChange={e=>{setEq1(e.target.value);setFb(null);}} placeholder="צד שמאל" style={{width:110}}/>
            <span style={{fontWeight:700}}>=</span>
            <input value={eq2} onChange={e=>{setEq2(e.target.value);setFb(null);}} placeholder="צד ימין" style={{width:110}}
              onKeyDown={e=>e.key==='Enter'&&checkEq()}/>
            <button className="btn bg" onClick={checkEq}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ שלב הושלם</div>}
      </div>

      {/* Step 2: Drag to solve */}
      {phase==='drag'&&<div className="step-card">
        <div className="step-label">שלב 2 — פתור את המשוואה</div>
        <DragEqSolver key={ex.m1+'_'+ex.b1+'_'+ex.m2+'_'+ex.b2}
          initLeft={initTerms.l} initRight={initTerms.r} onSolved={onDragSolved}/>
      </div>}
      {(phase==='chooseEq'||phase==='findY'||phase==='writePoint'||phase==='done')&&foundX!=='parallel'&&foundX!=='identical'&&
        <div className="step-card done"><div className="step-label">שלב 2 — פתרון</div>
          <div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ x = {foundX}</div>
        </div>}
      {phase==='done'&&(foundX==='parallel'||foundX==='identical')&&
        <div className="step-card done"><div className="step-label">שלב 2 — מסקנה</div>
          <div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {foundX==='parallel'?'אין פתרון — ישרים מקבילים':'אינסוף פתרונות — ישרים זהים'}</div>
        </div>}

      {/* Partial point reminder */}
      {foundX!==null&&foundX!=='parallel'&&foundX!=='identical'&&phase!=='eq'&&phase!=='drag'&&phase!=='done'&&
        <div className="partial-pts"><div className="partial-pt">({foundX}, ?)</div></div>}

      {/* Step 3: Choose equation */}
      {(phase==='chooseEq'||phase==='findY'||phase==='writePoint'||phase==='done')&&foundX!=='parallel'&&foundX!=='identical'&&
        <div className={`step-card ${phase!=='chooseEq'?'done':''}`}>
          <div className="step-label">שלב 3 — בחר משוואה להצבה</div>
          {phase==='chooseEq'?<>
            <p className="hint">בחר באיזו משוואה להציב x = {foundX}</p>
            <div className="ans-row" style={{gap:12}}>
              <button className={`eq-choice ${chosenEq===1?'active':''}`} onClick={()=>{setChosenEq(1);setFb(null);}}>{fmtLinear(ex.m1,ex.b1)}</button>
              <button className={`eq-choice ${chosenEq===2?'active':''}`} onClick={()=>{setChosenEq(2);setFb(null);}}>{fmtLinear(ex.m2,ex.b2)}</button>
            </div>
            <div className="center" style={{marginTop:8}}>
              <button className="btn bg" disabled={!chosenEq} onClick={()=>{setPhase('findY');setFb(null);}}>✓ המשך</button>
            </div>
          </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,direction:'ltr'}}>✓ {chosenEq===1?fmtLinear(ex.m1,ex.b1):fmtLinear(ex.m2,ex.b2)}</div>}
        </div>}

      {/* Step 4: Find y */}
      {(phase==='findY'||phase==='writePoint'||phase==='done')&&foundX!=='parallel'&&foundX!=='identical'&&<div className={`step-card ${phase!=='findY'?'done':''}`}>
        <div className="step-label">שלב 4 — הצב x = {foundX} ומצא y</div>
        <p className="hint" style={{direction:'ltr'}}>{chosenEq===1?fmtLinear(ex.m1,ex.b1):fmtLinear(ex.m2,ex.b2)}</p>
        {phase==='findY'?<>
          <div className="ans-row">
            <span style={{fontSize:16}}>y =</span>
            <input value={solY} onChange={e=>{setSolY(e.target.value);setFb(null);}} placeholder="?"
              onKeyDown={e=>e.key==='Enter'&&checkY()}/>
            <button className="btn bg" onClick={checkY}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ y = {ex.solY}</div>}
      </div>}

      {/* Step 5: Write point */}
      {(phase==='writePoint'||phase==='done')&&foundX!=='parallel'&&foundX!=='identical'&&<div className={`step-card ${phase==='done'?'done':''}`}>
        <div className="step-label">שלב 5 — כתוב את נקודת החיתוך</div>
        {phase==='writePoint'?<>
          <div className="ans-row" style={{fontSize:18}}>
            <span>(</span>
            <input value={ptX} onChange={e=>{setPtX(e.target.value);setFb(null);}} placeholder="x" style={{width:50}}/>
            <span>,</span>
            <input value={ptY} onChange={e=>{setPtY(e.target.value);setFb(null);}} placeholder="y" style={{width:50}}
              onKeyDown={e=>e.key==='Enter'&&checkPoint()}/>
            <span>)</span>
            <button className="btn bg" onClick={checkPoint}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ ({ex.solX}, {ex.solY})</div>}
      </div>}
    </div>

    {phase==='done'?<div className="banner">
      ✅ כל הכבוד!{foundX!=='parallel'&&foundX!=='identical'?` נקודת החיתוך: (${ex.solX}, ${ex.solY})`:foundX==='parallel'?' הישרים מקבילים — אין חיתוך':' הישרים זהים — אינסוף נקודות חיתוך'}
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══════ Chapter 2: Line–Parabola ═══════ */
function genLP(){
  const caseType=randInt(0,9);
  if(caseType>=7&&caseType<=8){
    const x0=randInt(-3,3);
    const a=pick([-1,1]);
    const m=randInt(-3,3);
    const y0=m*x0+randInt(-3,3);
    const n=y0-m*x0;
    const pa=a, pb=-2*a*x0, pc=a*x0*x0+y0;
    const da=pa, db=pb-m, dc=pc-n;
    const disc=db*db-4*da*dc;
    if(Math.abs(disc)>0.01||Math.abs(y0)>8) return genLP();
    return {pa,pb,pc,m,n,type:'tangent',pts:[{x:x0,y:y0}],eqA:da,eqB:db,eqC:dc};
  }
  if(caseType===9){
    const a=1;
    const x0=randInt(-2,2);const y0=randInt(2,5);
    const pa=a, pb=-2*x0, pc=x0*x0+y0;
    const m=0;const n=y0-randInt(1,3);
    const da=pa,db=pb-m,dc=pc-n;
    const disc=db*db-4*da*dc;
    if(disc>=0) return genLP();
    return {pa,pb,pc,m,n,type:'none',pts:[],eqA:da,eqB:db,eqC:dc};
  }
  const x1=randInt(-4,1);
  let x2;do{x2=randInt(x1+1,5);}while(x2===x1);
  const a=pick([-1,1]);
  const m=randInt(-3,3);
  const n_line=randInt(-5,5);
  const y1=m*x1+n_line;
  const y2=m*x2+n_line;
  const pa=a, pb=-a*(x1+x2)+m, pc=a*x1*x2+n_line;
  const vy1=pa*x1*x1+pb*x1+pc;
  const vy2=pa*x2*x2+pb*x2+pc;
  if(Math.abs(vy1-y1)>0.01||Math.abs(vy2-y2)>0.01||Math.abs(y1)>8||Math.abs(y2)>8) return genLP();
  const da=pa,db=pb-m,dc=pc-n_line;
  return {pa,pb,pc,m,n:n_line,type:'two',pts:[{x:x1,y:y1},{x:x2,y:y2}],eqA:da,eqB:db,eqC:dc};
}

function Ch2(){
  const [ex,setEx]=useState(()=>genLP());
  const [phase,setPhase]=useState('eq'); // eq, drag, coefs, solve, chooseEq, findY, writePoint, done
  const [fb,setFb]=useState(null);
  const [showPts,setShowPts]=useState([]);
  const [eq1,setEq1]=useState('');const [eq2,setEq2]=useState('');
  const [ca,setCa]=useState('');const [cb,setCb]=useState('');const [cc,setCc]=useState('');
  const [x1,setX1]=useState('');const [x2,setX2]=useState('');
  const [y1,setY1]=useState('');const [y2,setY2]=useState('');
  const [pt1x,setPt1x]=useState('');const [pt1y,setPt1y]=useState('');
  const [pt2x,setPt2x]=useState('');const [pt2y,setPt2y]=useState('');
  const [special,setSpecial]=useState('');
  const [dragCoefs,setDragCoefs]=useState(null);
  const [chosenEq,setChosenEq]=useState(null);

  const fp=x=>ex.pa*x*x+ex.pb*x+ex.pc;
  const fl=x=>ex.m*x+ex.n;
  const funcs=[{fn:fp,color:'#2563eb'},{fn:fl,color:'#dc2626'}];

  // Step 1: write equality — student writes both sides
  function parseQuadSide(s){
    s=s.replace(/\s/g,'').replace(/−/g,'-').replace(/–/g,'-').replace(/\*\*/g,'^');
    let a=0,b=0,c=0;
    // Try to parse ax²+bx+c or ax^2+bx+c
    const x2re=/([+-]?\d*)x[\²\^2]/g;
    const xre=/([+-]?\d*)x(?![\²\^2])/g;
    let tmp=s;
    // extract x² terms
    let m;
    const x2matches=[];
    const x2regex=/([+-]?\d*)x[\²2]|([+-]?\d*)x\^2/g;
    while((m=x2regex.exec(tmp))!==null){
      const coefStr=m[1]||m[2]||'';
      const coef=coefStr===''||coefStr==='+'?1:coefStr==='-'?-1:parseInt(coefStr);
      a+=coef;
      x2matches.push(m[0]);
    }
    // remove x² parts
    for(const xm of x2matches) tmp=tmp.replace(xm,'');
    // extract x terms
    const xregex2=/([+-]?\d*)x/g;
    const xmatches=[];
    while((m=xregex2.exec(tmp))!==null){
      const coefStr=m[1]||'';
      const coef=coefStr===''||coefStr==='+'?1:coefStr==='-'?-1:parseInt(coefStr);
      b+=coef;
      xmatches.push(m[0]);
    }
    for(const xm of xmatches) tmp=tmp.replace(xm,'');
    // remaining should be constant
    tmp=tmp.replace(/^\+/,'');
    if(tmp) c=parseInt(tmp)||0;
    return {a,b,c};
  }

  const checkEq=()=>{
    const s1=parseQuadSide(eq1.trim());
    const s2=parseQuadSide(eq2.trim());
    if(!s1||!s2){setFb('err');return;}
    const ok=((s1.a===ex.pa&&s1.b===ex.pb&&s1.c===ex.pc&&s2.a===0&&s2.b===ex.m&&s2.c===ex.n)||
              (s2.a===ex.pa&&s2.b===ex.pb&&s2.c===ex.pc&&s1.a===0&&s1.b===ex.m&&s1.c===ex.n));
    if(ok){setFb('ok');setTimeout(()=>{setPhase('drag');setFb(null);},600);}
    else setFb('err');
  };

  // Build initial terms for drag (parabola on left, line on right)
  const buildInitTerms2=()=>{
    const l=[],r=[];
    if(ex.pa!==0) l.push(mkTerm(ex.pa,'x2'));
    if(ex.pb!==0) l.push(mkTerm(ex.pb,'x'));
    if(ex.pc!==0) l.push(mkTerm(ex.pc,'num'));
    if(l.length===0) l.push(mkTerm(0,'num'));
    if(ex.m!==0) r.push(mkTerm(ex.m,'x'));
    if(ex.n!==0) r.push(mkTerm(ex.n,'num'));
    if(r.length===0) r.push(mkTerm(0,'num'));
    return {l,r};
  };

  const onDragSolved2=(result)=>{
    // result is {a, b, c} from the drag solver
    setDragCoefs(result);
    setPhase('coefs');
  };

  const checkCoefs=()=>{
    const va=parseInt(ca),vb=parseInt(cb),vc=parseInt(cc);
    // accept the equation exactly as the student arranged it (e.g. everything moved to the other side)
    const mine=dragCoefs&&va===dragCoefs.a&&vb===dragCoefs.b&&vc===dragCoefs.c;
    if((va===ex.eqA&&vb===ex.eqB&&vc===ex.eqC)||mine){setFb('ok');setTimeout(()=>{setPhase('solve');setFb(null);},600);}
    else setFb('err');
  };
  // the arranged equation, shown after step 2 so it stays visible while identifying a, b, c
  const arranged=dragCoefs||{a:ex.eqA,b:ex.eqB,c:ex.eqC};
  const arrangedStr=fmtQuad(arranged.a,arranged.b,arranged.c,'#').replace('# = ','')+' = 0';

  const checkXvals=()=>{
    if(ex.type==='none'){if(special==='none'){setFb('ok');setPhase('done');}else setFb('err');return;}
    if(ex.type==='tangent'){const v=parseInt(x1);if(v===ex.pts[0].x){setFb('ok');setTimeout(()=>{setPhase('chooseEq');setFb(null);},600);}else setFb('err');return;}
    const v1=parseInt(x1),v2=parseInt(x2);
    if((v1===ex.pts[0].x&&v2===ex.pts[1].x)||(v1===ex.pts[1].x&&v2===ex.pts[0].x)){setFb('ok');setTimeout(()=>{setPhase('chooseEq');setFb(null);},600);}
    else setFb('err');
  };

  const checkYvals=()=>{
    if(ex.type==='tangent'){const v=parseInt(y1);if(v===ex.pts[0].y){setFb('ok');setTimeout(()=>{setPhase('writePoint');setFb(null);},600);}else setFb('err');return;}
    const v1=parseInt(y1),v2=parseInt(y2);
    const p=ex.pts;
    const ux1=parseInt(x1),ux2=parseInt(x2);
    const ey1=ux1===p[0].x?p[0].y:p[1].y;
    const ey2=ux2===p[0].x?p[0].y:p[1].y;
    if(v1===ey1&&v2===ey2){setFb('ok');setTimeout(()=>{setPhase('writePoint');setFb(null);},600);}
    else setFb('err');
  };

  const checkPoints=()=>{
    if(ex.type==='tangent'){
      const vx=parseInt(pt1x),vy=parseInt(pt1y);
      if(vx===ex.pts[0].x&&vy===ex.pts[0].y){setFb('ok');setShowPts(ex.pts);setPhase('done');}else setFb('err');return;
    }
    const vx1=parseInt(pt1x),vy1=parseInt(pt1y),vx2=parseInt(pt2x),vy2=parseInt(pt2y);
    const p=ex.pts;
    const ok=((vx1===p[0].x&&vy1===p[0].y&&vx2===p[1].x&&vy2===p[1].y)||(vx1===p[1].x&&vy1===p[1].y&&vx2===p[0].x&&vy2===p[0].y));
    if(ok){setFb('ok');setShowPts(ex.pts);setPhase('done');}else setFb('err');
  };

  const reset=()=>{_termId=0;const e=genLP();setEx(e);setPhase('eq');setFb(null);setShowPts([]);
    setEq1('');setEq2('');setCa('');setCb('');setCc('');setX1('');setX2('');setY1('');setY2('');
    setPt1x('');setPt1y('');setPt2x('');setPt2y('');setSpecial('');setDragCoefs(null);setChosenEq(null);};

  const initTerms2=buildInitTerms2();
  const phases=['eq','drag','coefs','solve','chooseEq','findY','writePoint','done'];
  const pi=phases.indexOf(phase);

  return <div className="content">
    <div className="card">
      <div className="card-t">חיתוך בין ישר לפרבולה</div>
      <div className="func-labels">
        <span className="func-label" style={{background:'#dbeafe',color:'#2563eb'}}>{fmtQuad(ex.pa,ex.pb,ex.pc)}</span>
        <span className="func-label" style={{background:'#fee2e2',color:'#dc2626'}}>{fmtLinear(ex.m,ex.n)}</span>
      </div>
      <div className="graph-wrap"><Graph funcs={funcs} points={showPts}/></div>

      {/* Step 1: Write equality */}
      <div className={`step-card ${pi>0?'done':''}`}>
        <div className="step-label">שלב 1 — השווה את שתי המשוואות</div>
        <p className="hint">בנקודת החיתוך ערכי y שווים — כתוב את שני הצדדים</p>
        {phase==='eq'?<>
          <div className="ans-row" style={{fontSize:16}}>
            <input value={eq1} onChange={e=>{setEq1(e.target.value);setFb(null);}} placeholder="צד שמאל" style={{width:130}}/>
            <span style={{fontWeight:700}}>=</span>
            <input value={eq2} onChange={e=>{setEq2(e.target.value);setFb(null);}} placeholder="צד ימין" style={{width:130}}
              onKeyDown={e=>e.key==='Enter'&&checkEq()}/>
            <button className="btn bg" onClick={checkEq}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ שלב הושלם</div>}
      </div>

      {/* Step 2: Drag to arrange as ...=0 */}
      {phase==='drag'&&<div className="step-card">
        <div className="step-label">שלב 2 — סדר את המשוואה לצורה ax² + bx + c = 0</div>
        <DragEqSolver key={'q_'+ex.pa+'_'+ex.m}
          initLeft={initTerms2.l} initRight={initTerms2.r} onSolved={onDragSolved2} mode="quadratic"/>
      </div>}
      {pi>1&&<div className="step-card done"><div className="step-label">שלב 2 — סידור</div>
        <div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ <span dir="ltr">{arrangedStr}</span></div>
      </div>}

      {/* Step 3: Identify coefficients */}
      {pi>=2&&<div className={`step-card ${pi>2?'done':''}`}>
        <div className="step-label">שלב 3 — זהה את המקדמים a, b, c</div>
        {phase==='coefs'&&<div className="isx-eq" dir="ltr">{arrangedStr}</div>}
        {phase==='coefs'?<>
          <div className="ans-row">
            <span>a =</span><input value={ca} onChange={e=>{setCa(e.target.value);setFb(null);}} placeholder="?" style={{width:50}}/>
            <span>b =</span><input value={cb} onChange={e=>{setCb(e.target.value);setFb(null);}} placeholder="?" style={{width:50}}/>
            <span>c =</span><input value={cc} onChange={e=>{setCc(e.target.value);setFb(null);}} placeholder="?" style={{width:50}}
              onKeyDown={e=>e.key==='Enter'&&checkCoefs()}/>
            <button className="btn bg" onClick={checkCoefs}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ a={ex.eqA}, b={ex.eqB}, c={ex.eqC}</div>}
      </div>}

      {/* Step 4: Solve quadratic */}
      {pi>=3&&<div className={`step-card ${pi>3?'done':''}`}>
        <div className="step-label">שלב 4 — פתור את המשוואה הריבועית</div>
        {phase==='solve'?<>
          {ex.type==='none'?<>
            <p className="hint">חשב Δ = b² - 4ac</p>
            <div className="ans-row" style={{gap:12}}>
              <button className={`special-btn ${special==='none'?'active':''}`} onClick={()=>{setSpecial('none');setFb(null);}}>אין נקודות חיתוך (Δ {'<'} 0)</button>
              <button className="btn bg" onClick={checkXvals}>✓ בדוק</button>
            </div>
          </>:ex.type==='tangent'?<>
            <p className="hint">Δ = 0 — הישר משיק לפרבולה. מצא x</p>
            <div className="ans-row">
              <span>x =</span><input value={x1} onChange={e=>{setX1(e.target.value);setFb(null);}} placeholder="?" onKeyDown={e=>e.key==='Enter'&&checkXvals()}/>
              <button className="btn bg" onClick={checkXvals}>✓ בדוק</button>
            </div>
          </>:<>
            <p className="hint">מצא את שני ערכי x</p>
            <div className="ans-row">
              <span>x₁ =</span><input value={x1} onChange={e=>{setX1(e.target.value);setFb(null);}} placeholder="?"/>
              <span>x₂ =</span><input value={x2} onChange={e=>{setX2(e.target.value);setFb(null);}} placeholder="?" onKeyDown={e=>e.key==='Enter'&&checkXvals()}/>
              <button className="btn bg" onClick={checkXvals}>✓ בדוק</button>
            </div>
          </>}
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
          {ex.type==='none'?'✓ אין נקודות חיתוך':ex.type==='tangent'?`✓ x = ${ex.pts[0].x}`:`✓ x₁ = ${parseInt(x1)}, x₂ = ${parseInt(x2)}`}
        </div>}
      </div>}

      {/* Partial points reminder */}
      {pi>=4&&ex.type!=='none'&&phase!=='done'&&
        <div className="partial-pts">
          {ex.type==='tangent'
            ?<div className="partial-pt">({parseInt(x1)}, ?)</div>
            :<>{<div className="partial-pt">({parseInt(x1)}, ?)</div>}{<div className="partial-pt">({parseInt(x2)}, ?)</div>}</>}
        </div>}

      {/* Step 5: Choose equation */}
      {pi>=4&&ex.type!=='none'&&<div className={`step-card ${pi>4?'done':''}`}>
        <div className="step-label">שלב 5 — בחר משוואה להצבה</div>
        {phase==='chooseEq'?<>
          <p className="hint">בחר באיזו משוואה להציב את ערכי x</p>
          <div className="ans-row" style={{gap:12}}>
            <button className={`eq-choice ${chosenEq===1?'active':''}`} onClick={()=>{setChosenEq(1);setFb(null);}}>{fmtQuad(ex.pa,ex.pb,ex.pc)}</button>
            <button className={`eq-choice ${chosenEq===2?'active':''}`} onClick={()=>{setChosenEq(2);setFb(null);}}>{fmtLinear(ex.m,ex.n)}</button>
          </div>
          <div className="center" style={{marginTop:8}}>
            <button className="btn bg" disabled={!chosenEq} onClick={()=>{setPhase('findY');setFb(null);}}>✓ המשך</button>
          </div>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700,direction:'ltr'}}>✓ {chosenEq===1?fmtQuad(ex.pa,ex.pb,ex.pc):fmtLinear(ex.m,ex.n)}</div>}
      </div>}

      {/* Step 6: Find y */}
      {pi>=5&&ex.type!=='none'&&<div className={`step-card ${pi>5?'done':''}`}>
        <div className="step-label">שלב 6 — הצב ומצא y</div>
        <p className="hint" style={{direction:'ltr'}}>{chosenEq===1?fmtQuad(ex.pa,ex.pb,ex.pc):fmtLinear(ex.m,ex.n)}</p>
        {phase==='findY'?<>
          <div className="ans-row">
            {ex.type==='tangent'?<><span>y =</span><input value={y1} onChange={e=>{setY1(e.target.value);setFb(null);}} placeholder="?" onKeyDown={e=>e.key==='Enter'&&checkYvals()}/></>
            :<><span>y₁ =</span><input value={y1} onChange={e=>{setY1(e.target.value);setFb(null);}} placeholder="?"/>
              <span>y₂ =</span><input value={y2} onChange={e=>{setY2(e.target.value);setFb(null);}} placeholder="?" onKeyDown={e=>e.key==='Enter'&&checkYvals()}/></>}
            <button className="btn bg" onClick={checkYvals}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
          {ex.type==='tangent'?`✓ y = ${ex.pts[0].y}`:`✓ y₁ = ${parseInt(y1)}, y₂ = ${parseInt(y2)}`}
        </div>}
      </div>}

      {/* Step 7: Write points */}
      {pi>=6&&ex.type!=='none'&&<div className={`step-card ${phase==='done'?'done':''}`}>
        <div className="step-label">שלב 7 — כתוב את נקודות החיתוך</div>
        {phase==='writePoint'?<>
          <div className="ans-row" style={{fontSize:16}}>
            <span>(</span>
            <input value={pt1x} onChange={e=>{setPt1x(e.target.value);setFb(null);}} placeholder="x" style={{width:45}}/>
            <span>,</span>
            <input value={pt1y} onChange={e=>{setPt1y(e.target.value);setFb(null);}} placeholder="y" style={{width:45}}/>
            <span>)</span>
            {ex.type==='two'&&<>
              <span style={{margin:'0 4px'}}>ו-</span>
              <span>(</span>
              <input value={pt2x} onChange={e=>{setPt2x(e.target.value);setFb(null);}} placeholder="x" style={{width:45}}/>
              <span>,</span>
              <input value={pt2y} onChange={e=>{setPt2y(e.target.value);setFb(null);}} placeholder="y" style={{width:45}} onKeyDown={e=>e.key==='Enter'&&checkPoints()}/>
              <span>)</span>
            </>}
            <button className="btn bg" onClick={checkPoints}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
          {ex.type==='tangent'?`✓ (${ex.pts[0].x}, ${ex.pts[0].y})`:`✓ (${ex.pts[0].x}, ${ex.pts[0].y}) ו-(${ex.pts[1].x}, ${ex.pts[1].y})`}
        </div>}
      </div>}
    </div>

    {phase==='done'?<div className="banner">
      ✅ כל הכבוד!
      {ex.type==='none'?' הישר והפרבולה לא נחתכים':
       ex.type==='tangent'?` נקודת השקה: (${ex.pts[0].x}, ${ex.pts[0].y})`:
       ` נקודות חיתוך: (${ex.pts[0].x}, ${ex.pts[0].y}) ו-(${ex.pts[1].x}, ${ex.pts[1].y})`}
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══════ Main App ═══════ */
function App(){
  const [ch,setCh]=useState(1);
  const labels=['ישר–ישר','ישר–פרבולה'];
  return <div>
    <div className="hdr">
      <div className="hdr-title">חיתוך בין פונקציות</div>
      <div className="ch-btns">
        {labels.map((l,i)=><button key={i} className={`ch-btn ${ch===i+1?'active':''}`} onClick={()=>setCh(i+1)}>{i+1}. {l}</button>)}
      </div>
    </div>
    {ch===1?<Ch1 key="c1"/>:<Ch2 key="c2"/>}
  </div>;
}


// ===== END ORIGINAL =====
export default App;
