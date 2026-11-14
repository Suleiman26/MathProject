'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/quadrilaterals.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const {useState} = React;

/* ═══════════════════ Utilities ═══════════════════ */
function randInt(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function pick(arr){return arr[randInt(0,arr.length-1)];}
const ANGLES=[30,45,60,90,120,150];
const ANGLES_NO90=[30,45,60,120,150];
const PY_TRIPLES=[[3,4,5],[6,8,10],[5,12,13],[9,12,15],[8,15,17],[12,16,20],[15,20,25]];
function pickTriple(maxLeg){
  const opts=PY_TRIPLES.filter(t=>t[0]<=maxLeg&&t[1]<=maxLeg);
  const t=pick(opts.length?opts:[[3,4,5]]);
  return Math.random()<0.5?[t[0],t[1],t[2]]:[t[1],t[0],t[2]];
}

/* ═══════════════════ Equation-check helpers ═══════════════════ */
function safeEvalExpr(expr){
  if(!/^[0-9+\-*/().\s]+$/.test(expr)) return NaN;
  try{ const v=Function('"use strict";return ('+expr+')')(); return typeof v==='number'&&isFinite(v)?v:NaN; }
  catch(e){ return NaN; }
}
function numsInExpr(expr){ return (expr.match(/\d+(?:\.\d+)?/g)||[]).map(Number); }
function checkEquation(text, unknownVal, requiredNums){
  const raw=String(text).trim();
  if((raw.match(/\?/g)||[]).length!==1 || (raw.match(/=/g)||[]).length!==1) return false;
  const filled=raw.replace('?', String(unknownVal));
  const parts=filled.split('=');
  const lv=safeEvalExpr(parts[0]), rv=safeEvalExpr(parts[1]);
  if(isNaN(lv)||isNaN(rv)||Math.abs(lv-rv)>1e-6) return false;
  const nums=numsInExpr(raw.replace('?',''));
  return requiredNums.every(r=>nums.some(n=>Math.abs(n-r)<1e-9));
}

/* ═══════════════════ Feedback ═══════════════════ */
function Fb({fb}){
  if(!fb) return null;
  return fb==='ok'?<div className="fb ok">✓ נכון!</div>:<div className="fb err">✗ לא נכון, נסה שוב.</div>;
}

/* ═══════════════════ Geometry: angle arc ═══════════════════ */
function angleArcAtVertex(vx,vy,p1,p2,radius){
  const a1=Math.atan2(p1.y-vy,p1.x-vx);
  const a2=Math.atan2(p2.y-vy,p2.x-vx);
  let start=a1,end=a2;
  let diff=(end-start+2*Math.PI)%(2*Math.PI);
  if(diff>Math.PI){const t=start;start=end;end=t;diff=2*Math.PI-diff;}
  const sx=vx+radius*Math.cos(start),sy=vy+radius*Math.sin(start);
  const ex=vx+radius*Math.cos(end),ey=vy+radius*Math.sin(end);
  const large=diff>Math.PI?1:0;
  return{path:`M${sx},${sy}A${radius},${radius} 0 ${large} 1 ${ex},${ey}`,
    midX:vx+(radius+8)*Math.cos(start+diff/2),midY:vy+(radius+8)*Math.sin(start+diff/2)};
}

/* ═══════════════════ Generic quadrilateral SVG ═══════════════════ */
// Place an angle's value inside its angle, clear of both sides and the arc
// (measured, not a fixed offset). Too-sharp corners get it just outside.
function fitAngleLabel(vert,p1,p2,arcR,txt,size,maxD,centroid,diagTo,letter){
  maxD=Math.min(maxD,arcR+34);
  const u=(p)=>{const dx=p.x-vert.x,dy=p.y-vert.y,m=Math.hypot(dx,dy)||1;return{x:dx/m,y:dy/m};};
  let u1=u(p1),u2=u(p2);
  // a diagonal from this corner splits the angle: use the wider of the two parts
  if(diagTo){const g=u(diagTo);const ang=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.x*b.x+a.y*b.y)));
    if(ang(u1,g)>=ang(g,u2))u2=g;else u1=g;}
  let bx=u1.x+u2.x,by=u1.y+u2.y;const bm=Math.hypot(bx,by)||1;bx/=bm;by/=bm;
  const half=Math.acos(Math.max(-1,Math.min(1,u1.x*u2.x+u1.y*u2.y)))/2;
  const sinH=Math.max(Math.sin(half),0.05);
  for(const s of [size,size*0.88,Math.max(9.5,size*0.78)]){
    const w=txt.length*s*0.6,h=s*0.95;
    const ext=(nx,ny)=>Math.abs(nx)*w/2+Math.abs(ny)*h/2;
    const dEdge=Math.max(ext(-u1.y,u1.x),ext(-u2.y,u2.x))+4;
    const d=Math.max(dEdge/sinH,arcR+ext(bx,by)+4);
    if(d<=maxD)return{x:vert.x+bx*d,y:vert.y+by*d,size:s};
  }
  // no room inside: right beside the corner letter, on its outer side ("B 60°")
  const s=Math.max(9,size*0.9),w=txt.length*s*0.6;
  const side=vert.x>=centroid.x?1:-1;
  return{x:letter.x+side*(7+w/2),y:letter.y-4,size:s};
}

function QuadBase({verts, order, highlight, onPart, sideLabels={}, angleLabels={}, ticks={}, parallelArrows={}, rightAngleAt=[], diagonals=[], letterOut=false, extra=null}){
  const n=order.length;
  const pts=order.map(k=>verts[k]);
  const sides=order.map((k,i)=>({id:k+order[(i+1)%n], a:verts[k], b:verts[order[(i+1)%n]]}));
  const isHi=(kind,id)=> highlight && highlight.kind===kind && highlight.ids.includes(id);
  const cx=pts.reduce((s,p)=>s+p.x,0)/n, cy=pts.reduce((s,p)=>s+p.y,0)/n;

  return (
    <svg viewBox="0 0 300 270" style={{width:'100%',maxWidth:300,height:'auto',direction:'ltr'}}>
      <polygon points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="#eef2ff" stroke="none"/>

      {diagonals.map(([p1,p2])=>{
        const id=p1+p2; const A=verts[p1],B=verts[p2]; const active=isHi('diag',id);
        return <line key={id} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
          stroke={active?'#7c3aed':'#94a3b8'} strokeWidth={active?3:1.5}
          strokeDasharray="6,4" style={{cursor:'pointer'}} onClick={()=>onPart('diag',id)}/>;
      })}
      {extra}

      {sides.map(s=>{
        const midx=(s.a.x+s.b.x)/2, midy=(s.a.y+s.b.y)/2;
        const dx=s.b.x-s.a.x, dy=s.b.y-s.a.y, len=Math.hypot(dx,dy)||1;
        const ux=dx/len, uy=dy/len;
        const outSign = ((midx-cx)*(-uy)+(midy-cy)*(ux))>=0?1:-1;
        const nx=-uy*outSign, ny=ux*outSign;
        const tickCount=ticks[s.id]||0;
        const arrowCount=parallelArrows[s.id]||0;
        const active=isHi('side',s.id);
        return <g key={s.id} style={{cursor:'pointer'}} onClick={()=>onPart('side',s.id)}>
          <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y}
            stroke={active?'#7c3aed':'#334155'} strokeWidth={active?4:2.5}/>
          <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke="transparent" strokeWidth={18}/>
          {Array.from({length:tickCount}).map((_,i)=>{
            const off=(i-(tickCount-1)/2)*7;
            const tx=midx+ux*off, ty=midy+uy*off;
            return <line key={i} x1={tx-nx*6} y1={ty-ny*6} x2={tx+nx*6} y2={ty+ny*6} stroke="#334155" strokeWidth={2}/>;
          })}
          {Array.from({length:arrowCount}).map((_,i)=>{
            const off=(i-(arrowCount-1)/2)*11;
            const cx2=midx+ux*off, cy2=midy+uy*off;
            const p1x=cx2-ux*5+nx*5, p1y=cy2-uy*5+ny*5;
            const p2x=cx2+ux*5, p2y=cy2+uy*5;
            const p3x=cx2-ux*5-nx*5, p3y=cy2-uy*5-ny*5;
            return <polyline key={i} points={`${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`} fill="none" stroke="#334155" strokeWidth={2}/>;
          })}
          {sideLabels[s.id]&&<text x={midx+nx*18} y={midy+ny*18+4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">{sideLabels[s.id]}</text>}
        </g>;
      })}

      {order.map((k,i)=>{
        const v=verts[k];
        const prev=verts[order[(i-1+n)%n]], next=verts[order[(i+1)%n]];
        const active=isHi('angle',k);
        const isRight=rightAngleAt.includes(k);
        const arc=angleArcAtVertex(v.x,v.y,prev,next,isRight?16:20);
        const outx=v.x+(v.x-cx)*0.001, outy=v.y+(v.y-cy)*0.001;
        // letterOut: the corner letter sits just outside its corner, straight out from the centre
        const om=Math.hypot(v.x-cx,v.y-cy)||1;
        const labelDx=letterOut?(v.x-cx)/om*17:((v.x-cx)>=0?18:-18), labelDy=letterOut?(v.y-cy)/om*17+4:((v.y-cy)>=0?18:-18);
        return <g key={k} style={{cursor:'pointer'}} onClick={()=>onPart('angle',k)}>
          <circle cx={v.x} cy={v.y} r={26} fill="transparent"/>
          {isRight?(
            <RightSquareMark v={v} prev={prev} next={next} active={active}/>
          ):(
            <path d={arc.path} fill="none" stroke={active?'#7c3aed':'#94a3b8'} strokeWidth={active?3:1.5}/>
          )}
          {angleLabels[k]!=null&&(()=>{const f=fitAngleLabel(v,prev,next,isRight?16:20,String(angleLabels[k]),12.5,Math.hypot(v.x-cx,v.y-cy)*0.72,{x:cx,y:cy},(()=>{const dg=diagonals.find(d=>d.includes(k));return dg?verts[dg[0]===k?dg[1]:dg[0]]:null;})(),{x:v.x+labelDx,y:v.y+labelDy});
            return <text x={f.x} y={f.y} textAnchor="middle" dominantBaseline="central" fontSize={f.size} fontWeight="700" fill={active?'#7c3aed':'#475569'}>{angleLabels[k]}</text>;})()}
          <text x={v.x+labelDx} y={v.y+labelDy} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e293b">{k}</text>
        </g>;
      })}
    </svg>
  );
}
function RightSquareMark({v,prev,next,active}){
  const a1=Math.atan2(prev.y-v.y,prev.x-v.x);
  const a2=Math.atan2(next.y-v.y,next.x-v.x);
  const s=13;
  const p1x=v.x+s*Math.cos(a1), p1y=v.y+s*Math.sin(a1);
  const p2x=v.x+s*Math.cos(a2), p2y=v.y+s*Math.sin(a2);
  const p3x=p1x+(p2x-v.x), p3y=p1y+(p2y-v.y);
  return <polyline points={`${p1x},${p1y} ${p3x},${p3y} ${p2x},${p2y}`} fill="none"
    stroke={active?'#7c3aed':'#94a3b8'} strokeWidth={active?3:1.5}/>;
}

/* ═══════════════════ Interactive diagram (Part A — one property at a time) ═══════════════════ */
function lineIntersect(A,B,C,D){
  const a1=B.y-A.y, b1=A.x-B.x, c1=a1*A.x+b1*A.y;
  const a2=D.y-C.y, b2=C.x-D.x, c2=a2*C.x+b2*C.y;
  const det=a1*b2-a2*b1;
  if(Math.abs(det)<1e-9) return {x:(A.x+B.x)/2,y:(A.y+B.y)/2};
  return {x:(b2*c1-b1*c2)/det, y:(a1*c2-a2*c1)/det};
}
function SegTick({p,ux,uy,count}){
  const nx=-uy, ny=ux;
  return <>{Array.from({length:count}).map((_,i)=>{
    const off=(i-(count-1)/2)*6;
    const tx=p.x+ux*off, ty=p.y+uy*off;
    return <line key={i} x1={tx-nx*6} y1={ty-ny*6} x2={tx+nx*6} y2={ty+ny*6} stroke="#7c3aed" strokeWidth={2.5}/>;
  })}</>;
}

function InteractiveQuadBase({verts, order, diagonals=[], activeProp, alwaysRight=[], letterOut=false}){
  const n=order.length;
  const pts=order.map(k=>verts[k]);
  const sides=order.map((k,i)=>({id:k+order[(i+1)%n], a:verts[k], b:verts[order[(i+1)%n]]}));
  const cx=pts.reduce((s,p)=>s+p.x,0)/n, cy=pts.reduce((s,p)=>s+p.y,0)/n;

  const kind = activeProp && activeProp.kind;
  const ids = activeProp ? activeProp.ids : [];
  const mark = activeProp && activeProp.mark;
  const groups = activeProp && activeProp.groups;
  const groupCount = id => {
    if(!groups) return 1;
    const gi = groups.findIndex(g=>g.includes(id));
    return gi>=0? gi+1 : 1;
  };

  let diagInt=null;
  if(diagonals.length>=2 && (mark==='diagPerp'||mark==='diagBisect'||mark==='kiteDiag')){
    const [p1a,p1b]=diagonals[0], [p2a,p2b]=diagonals[1];
    diagInt=lineIntersect(verts[p1a],verts[p1b],verts[p2a],verts[p2b]);
  }

  return (
    <svg viewBox="0 0 300 270" style={{width:'100%',maxWidth:300,height:'auto',direction:'ltr'}}>
      <polygon points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="#eef2ff" stroke="none"/>

      {diagonals.map(([p1,p2])=>{
        const id=p1+p2; const A=verts[p1],B=verts[p2];
        const active = kind==='diag' && ids.includes(id);
        return <line key={id} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
          stroke={active?'#7c3aed':'#cbd5e1'} strokeWidth={active?3:1.5} strokeDasharray="6,4"/>;
      })}

      {kind==='diag' && mark==='diagEqual' && diagonals.filter(([p1,p2])=>ids.includes(p1+p2)).map(([p1,p2])=>{
        const A=verts[p1],B=verts[p2]; const len=Math.hypot(B.x-A.x,B.y-A.y)||1;
        const ux=(B.x-A.x)/len, uy=(B.y-A.y)/len;
        const pA={x:A.x+ux*len*0.35,y:A.y+uy*len*0.35};
        const pB={x:A.x+ux*len*0.65,y:A.y+uy*len*0.65};
        return <React.Fragment key={p1+p2}>
          <SegTick p={pA} ux={ux} uy={uy} count={1}/>
          <SegTick p={pB} ux={ux} uy={uy} count={1}/>
        </React.Fragment>;
      })}

      {kind==='diag' && mark==='diagPerp' && diagInt &&
        <RightSquareMark v={diagInt} prev={verts[diagonals[0][0]]} next={verts[diagonals[1][0]]} active={true}/>}

      {kind==='diag' && mark==='diagBisect' && diagInt && diagonals.filter(([p1,p2])=>ids.includes(p1+p2)).map(([p1,p2],gi)=>{
        const A=verts[p1],B=verts[p2]; const len=Math.hypot(B.x-A.x,B.y-A.y)||1;
        const ux=(B.x-A.x)/len, uy=(B.y-A.y)/len;
        const midA={x:(A.x+diagInt.x)/2,y:(A.y+diagInt.y)/2};
        const midB={x:(B.x+diagInt.x)/2,y:(B.y+diagInt.y)/2};
        const count=gi+1;
        return <React.Fragment key={p1+p2}>
          <SegTick p={midA} ux={ux} uy={uy} count={count}/>
          <SegTick p={midB} ux={ux} uy={uy} count={count}/>
        </React.Fragment>;
      })}

      {kind==='diag' && mark==='kiteDiag' && diagInt && (()=>{
        const [p1,p2]=diagonals[1]; const A=verts[p1],B=verts[p2];
        const len=Math.hypot(B.x-A.x,B.y-A.y)||1;
        const ux=(B.x-A.x)/len, uy=(B.y-A.y)/len;
        const midA={x:(A.x+diagInt.x)/2,y:(A.y+diagInt.y)/2};
        const midB={x:(B.x+diagInt.x)/2,y:(B.y+diagInt.y)/2};
        return <React.Fragment>
          <RightSquareMark v={diagInt} prev={A} next={verts[diagonals[0][1]]} active={true}/>
          <SegTick p={midA} ux={ux} uy={uy} count={1}/>
          <SegTick p={midB} ux={ux} uy={uy} count={1}/>
        </React.Fragment>;
      })()}

      {sides.map(s=>{
        const midx=(s.a.x+s.b.x)/2, midy=(s.a.y+s.b.y)/2;
        const dx=s.b.x-s.a.x, dy=s.b.y-s.a.y, len=Math.hypot(dx,dy)||1;
        const ux=dx/len, uy=dy/len;
        const outSign = ((midx-cx)*(-uy)+(midy-cy)*(ux))>=0?1:-1;
        const nx=-uy*outSign, ny=ux*outSign;
        const active = kind==='side' && ids.includes(s.id);
        const showTick = active && mark==='tick';
        const showArrow = active && mark==='arrow';
        const count = groupCount(s.id);
        return <g key={s.id}>
          <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y}
            stroke={active?'#7c3aed':'#334155'} strokeWidth={active?4:2.5}/>
          {showTick && Array.from({length:count}).map((_,i)=>{
            const off=(i-(count-1)/2)*7;
            const tx=midx+ux*off, ty=midy+uy*off;
            return <line key={i} x1={tx-nx*6} y1={ty-ny*6} x2={tx+nx*6} y2={ty+ny*6} stroke="#7c3aed" strokeWidth={2.5}/>;
          })}
          {showArrow && Array.from({length:count}).map((_,i)=>{
            const off=(i-(count-1)/2)*11;
            const cx2=midx+ux*off, cy2=midy+uy*off;
            const p1x=cx2-ux*5+nx*5, p1y=cy2-uy*5+ny*5;
            const p2x=cx2+ux*5, p2y=cy2+uy*5;
            const p3x=cx2-ux*5-nx*5, p3y=cy2-uy*5-ny*5;
            return <polyline key={i} points={`${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`} fill="none" stroke="#7c3aed" strokeWidth={2.5}/>;
          })}
        </g>;
      })}

      {order.map((k,i)=>{
        const v=verts[k];
        const prev=verts[order[(i-1+n)%n]], next=verts[order[(i+1)%n]];
        const active = kind==='angle' && ids.includes(k);
        const showRight = (active && mark==='right') || alwaysRight.includes(k);
        const showArc = active && mark==='arc';
        const arc=angleArcAtVertex(v.x,v.y,prev,next,showRight?16:20);
        // letterOut: the corner letter sits just outside its corner, straight out from the centre (same rule as QuadBase)
        const om=Math.hypot(v.x-cx,v.y-cy)||1;
        const labelDx=letterOut?(v.x-cx)/om*17:((v.x-cx)>=0?18:-18), labelDy=letterOut?(v.y-cy)/om*17+4:((v.y-cy)>=0?18:-18);
        return <g key={k}>
          {showRight && <RightSquareMark v={v} prev={prev} next={next} active={active && mark==='right'}/>}
          {showArc && <path d={arc.path} fill="none" stroke="#7c3aed" strokeWidth={3}/>}
          <text x={v.x+labelDx} y={v.y+labelDy} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e293b">{k}</text>
        </g>;
      })}
    </svg>
  );
}

/* ═══════════════════ Property explorer (Part A) ═══════════════════ */
function PropertyExplorer({verts, order, diagonals=[], properties, alwaysRight=[], letterOut=false}){
  const [active,setActive]=useState(null);
  const prop = properties.find(p=>p.id===active);
  return (
    <div className="card">
      <div className="card-t">חלק א׳ — הצגה ויזואלית</div>
      <div className="quad-wrap">
        <InteractiveQuadBase verts={verts} order={order} diagonals={diagonals} activeProp={prop||null} alwaysRight={alwaysRight} letterOut={letterOut}/>
      </div>
      <div className="prop-list">
        {properties.map(p=>(
          <button key={p.id} className={`prop-btn ${active===p.id?'active':''}`}
            onClick={()=>setActive(p.id)}>{p.label}</button>
        ))}
      </div>
      <div className="def-box">{prop?prop.def:'לחץ על תכונה כדי לראות אותה מודגשת בשרטוט'}</div>
    </div>
  );
}

/* ═══════════════════ Solved examples ═══════════════════ */
function Frac({n,d}){
  return <span className="mp-frac"><span className="mp-frac-n">{n}</span><span className="mp-frac-d">{d}</span></span>;
}
function SolvedExample({title, visual, given, steps}){
  return (
    <div className="card ex-card">
      <div className="card-t">{title}</div>
      {visual&&<div className="quad-wrap">{visual}</div>}
      {given&&<div className="given-box">{given}</div>}
      <ol className="ex-steps">
        {steps.map((st,i)=>(
          <li key={i} className="ex-step">
            <div className="ex-text">{st.text}</div>
            {st.math&&<div className="formula-box ex-math">{st.math}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ═══════════════════ Part B as sub-chapters (fixes board #77) ═══════════════════
   Every exercise type of a shape is its own sub-chapter: explanation → solved
   example → practice. The last tab is a poster with all the shape's formulas. */
const F_DIAG=<>S = <Frac n="d₁·d₂" d="2"/></>;
const F_TRAP=<>S = <Frac n="b₁+b₂" d="2"/> · h</>;
// Hebrew words inside a formula: each word is isolated so the formula keeps its left-to-right order
const F_ISO_H=<span dir="ltr" className="sc-ltr"><bdi>שוק</bdi>² = <bdi>גובה</bdi>² + (<Frac n="b₂−b₁" d="2"/>)²</span>;
// helper drawings for the solved examples: a dashed segment (height, diagonal) with its label beside it
function HelpLine({from,to,label,lx=8,ly=5,anchor='start',sq,color='#7c3aed'}){
  return <g>
    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={2.5} strokeDasharray="6,4"/>
    {sq&&<RightSquareMark v={to} prev={from} next={sq} active={false}/>}
    {label!=null&&<text x={(from.x+to.x)/2+lx} y={(from.y+to.y)/2+ly} textAnchor={anchor} fontSize="13" fontWeight="700" fill={color}>{label}</text>}
  </g>;
}
function Lbl({x,y,children,color='#7c3aed',anchor='middle'}){
  return <text x={x} y={y} textAnchor={anchor} fontSize="13" fontWeight="700" fill={color}>{children}</text>;
}
function Tri({pts,fill='#ede9fe'}){
  return <polygon points={pts.map(q=>`${q.x},${q.y}`).join(' ')} fill={fill} stroke="none"/>;
}
function FormulaPoster({name, visual, formulas, facts}){
  return (
    <div className="sc-poster">
      <div className="sc-poster-head">
        <div className="sc-poster-kicker">סיכום נוסחאות</div>
        <div className="sc-poster-name">{name}</div>
      </div>
      {visual&&<div className="quad-wrap sc-poster-fig">{visual}</div>}
      <div className="sc-ptiles">
        {formulas.map((f,i)=>(
          <div key={i} className={`sc-ptile ${f.wide?'wide':''}`}>
            <div className="sc-ptile-l">{f.label}</div>
            <div className="sc-ptile-f">{f.math}</div>
            {f.note&&<div className="sc-ptile-n">{f.note}</div>}
          </div>
        ))}
      </div>
      <ul className="sc-pfacts">
        {facts.map((t,i)=><li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}
function SubChapters({items, poster}){
  const [cur,setCur]=useState(0);
  const top=React.useRef(null);
  const n=items.length;
  const next=()=>{
    setCur(c=>Math.min(c+1,n));
    if(top.current&&top.current.scrollIntoView) top.current.scrollIntoView({block:'start',behavior:'smooth'});
  };
  const it=items[cur];
  return (
    <div className="card sc-card" ref={top}>
      <div className="card-t">חלק ב׳ — תרגילים</div>
      <div className="sub-tabs sc-tabs">
        {items.map((x,i)=>(
          <button key={i} className={`sub-tab ${cur===i?'active':''}`} onClick={()=>setCur(i)}>{x.tab}</button>
        ))}
        <button className={`sub-tab sc-tab-poster ${cur===n?'active':''}`} onClick={()=>setCur(n)}>סיכום נוסחאות</button>
      </div>
      {it?<div className="sc-body" key={cur}>
        <div className="sc-sec">
          <div className="sc-h"><span className="sc-n">1</span>הסבר</div>
          <div className="sc-explain">{it.explain}</div>
          {it.formula&&<div className="formula-box">{it.formula}</div>}
          {it.more}
        </div>
        <div className="sc-sec">
          <div className="sc-h"><span className="sc-n">2</span>דוגמה פתורה</div>
          <div className="sc-example ex-card">
            {it.example.visual&&<div className="quad-wrap">{it.example.visual}</div>}
            {it.example.given&&<div className="given-box">{it.example.given}</div>}
            <ol className="ex-steps">
              {it.example.steps.map((st,i)=>(
                <li key={i} className="ex-step">
                  <div className="ex-text">{st.text}</div>
                  {st.math&&<div className="formula-box ex-math">{st.math}</div>}
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="sc-sec">
          <div className="sc-h"><span className="sc-n">3</span>עכשיו תורך — תרגול</div>
          {it.practice}
        </div>
        <div className="sc-next">
          <button className="sc-next-btn" onClick={next}>{cur<n-1?<>הבא: {items[cur+1].tab} ←</>:<>לסיכום הנוסחאות ←</>}</button>
        </div>
      </div>:<FormulaPoster key="poster" {...poster}/>}
    </div>
  );
}

/* ═══════════════════ Generic question components (Part B) ═══════════════════ */
function NumericQuestion({title, genFn}){
  const [data,setData]=useState(()=>genFn());
  const [inp,setInp]=useState('');
  const [fb,setFb]=useState(null);
  const [done,setDone]=useState(false);
  const reset=()=>{setData(genFn());setInp('');setFb(null);setDone(false);};
  const check=()=>{
    const v=parseFloat(inp);
    if(!isNaN(v)&&Math.abs(v-data.answer)<1e-6){setFb('ok');setDone(true);}
    else setFb('err');
  };
  return (
    <div className="step-card">
      <div className="step-label">{title}</div>
      {data.visual&&<div className="quad-wrap">{data.visual}</div>}
      {data.given&&<div className="given-box">{data.given}</div>}
      {data.formula&&<div className="formula-box">{data.formula}</div>}
      {!done?<>
        <div className="ans-row">
          <span>{data.askLabel||'תשובה ='}</span>
          <input value={inp} onChange={e=>{setInp(e.target.value);setFb(null);}}
            onKeyDown={e=>e.key==='Enter'&&check()}/>
          {data.unit&&<span>{data.unit}</span>}
          <button className="btn bg" onClick={check}>✓ בדוק</button>
        </div>
        <Fb fb={fb}/>
      </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ נכון!</div>}
      <div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>
    </div>
  );
}

function EquationSideQuestion({title, genFn}){
  const [data,setData]=useState(()=>genFn());
  const [phase,setPhase]=useState(0);
  const [eqText,setEqText]=useState('');
  const [ansInp,setAnsInp]=useState('');
  const [fb,setFb]=useState(null);
  const reset=()=>{setData(genFn());setPhase(0);setEqText('');setAnsInp('');setFb(null);};
  const checkEq=()=>{
    if(checkEquation(eqText, data.answer, data.requiredNums)){
      setFb('ok'); setTimeout(()=>{setPhase(1);setFb(null);},600);
    } else setFb('err');
  };
  const checkAns=()=>{
    const v=parseFloat(ansInp);
    if(!isNaN(v)&&Math.abs(v-data.answer)<1e-6){setFb('ok');setPhase(2);}
    else setFb('err');
  };
  return (
    <div className="step-card">
      <div className="step-label">{title}</div>
      {data.visual&&<div className="quad-wrap">{data.visual}</div>}
      {data.given&&<div className="given-box">{data.given}</div>}
      {data.formula&&<div className="formula-box">{data.formula}</div>}
      {phase===0&&<>
        <p className="hint">כתוב משוואה עם ? במקום הגודל המבוקש (למשל: 40=?*5)</p>
        <div className="ans-row">
          <input value={eqText} onChange={e=>{setEqText(e.target.value);setFb(null);}}
            onKeyDown={e=>e.key==='Enter'&&checkEq()} style={{width:180,direction:'ltr'}}/>
          <button className="btn bg" onClick={checkEq}>✓ בדוק</button>
        </div>
        <Fb fb={fb}/>
      </>}
      {phase===1&&<>
        <div className="step-card done" style={{marginTop:0}}><div style={{color:'#16a34a',fontWeight:700,textAlign:'center'}}>✓ המשוואה נכתבה</div></div>
        <div className="ans-row">
          <span>{data.askLabel||'תשובה ='}</span>
          <input value={ansInp} onChange={e=>{setAnsInp(e.target.value);setFb(null);}}
            onKeyDown={e=>e.key==='Enter'&&checkAns()}/>
          {data.unit&&<span>{data.unit}</span>}
          <button className="btn bg" onClick={checkAns}>✓ בדוק</button>
        </div>
        <Fb fb={fb}/>
      </>}
      {phase===2&&<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ נכון!</div>}
      <div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>
    </div>
  );
}

function ReasonedAngleQuestion({title, genFn, reasonOptions}){
  const [data,setData]=useState(()=>genFn());
  const [idx,setIdx]=useState(0);
  const [subPhase,setSubPhase]=useState('reason');
  const [reasonChoice,setReasonChoice]=useState(null);
  const [valInp,setValInp]=useState('');
  const [fb,setFb]=useState(null);
  const reset=()=>{setData(genFn());setIdx(0);setSubPhase('reason');setReasonChoice(null);setValInp('');setFb(null);};
  const target=data.targets[idx];
  const allDone = idx>=data.targets.length;
  const checkReason=()=>{
    if(reasonChoice===target.reason){setFb('ok');setTimeout(()=>{setSubPhase('value');setFb(null);},450);}
    else setFb('err');
  };
  const checkVal=()=>{
    const v=parseFloat(valInp);
    if(!isNaN(v)&&Math.abs(v-target.value)<1e-6){
      setFb('ok');
      setTimeout(()=>{
        setIdx(i=>i+1); setReasonChoice(null); setValInp(''); setSubPhase('reason'); setFb(null);
      },550);
    } else setFb('err');
  };
  return (
    <div className="step-card">
      <div className="step-label">{title}</div>
      {data.visual&&<div className="quad-wrap">{data.visual}</div>}
      {data.given&&<div className="given-box">{data.given}</div>}
      {!allDone&&<>
        <p className="hint">מצא את {target.name} (שלב {idx+1} מתוך {data.targets.length})</p>
        {subPhase==='reason'?<>
          <div className="choice-row">
            {reasonOptions.map(r=>(
              <button key={r.key} className={`choice-btn ${reasonChoice===r.key?'active':''}`}
                onClick={()=>{setReasonChoice(r.key);setFb(null);}}>{r.label}</button>
            ))}
          </div>
          <div className="center"><button className="btn bg" disabled={!reasonChoice} onClick={checkReason}>✓ בדוק</button></div>
        </>:<div className="ans-row">
          <span>{target.name} =</span>
          <input value={valInp} onChange={e=>{setValInp(e.target.value);setFb(null);}}
            onKeyDown={e=>e.key==='Enter'&&checkVal()}/>
          <span>°</span>
          <button className="btn bg" onClick={checkVal}>✓ בדוק</button>
        </div>}
        <Fb fb={fb}/>
      </>}
      {allDone&&<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ כל הזוויות נמצאו!</div>}
      <div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>
    </div>
  );
}

/* ═══════════════════ SQUARE ═══════════════════ */
const SQ_VERTS={A:{x:200,y:60},B:{x:200,y:160},C:{x:100,y:160},D:{x:100,y:60}};
const SQ_ORDER=['A','B','C','D'];
function SquareShape({highlight,onPart,angleLabels={},sideLabels={},extra}){
  return <QuadBase verts={SQ_VERTS} order={SQ_ORDER} highlight={highlight} onPart={onPart}
    sideLabels={sideLabels} angleLabels={angleLabels}
    ticks={{AB:1,BC:1,CD:1,DA:1}} parallelArrows={{AB:1,CD:1,BC:2,DA:2}}
    rightAngleAt={['A','B','C','D']} diagonals={[['A','C'],['B','D']]} extra={extra}/>;
}
const SQUARE_PROPS=[
  {id:'sides',label:'צלעות שוות',kind:'side',ids:['AB','BC','CD','DA'],mark:'tick',def:'כל 4 הצלעות שוות באורכן.'},
  {id:'angles',label:'זוויות ישרות',kind:'angle',ids:['A','B','C','D'],mark:'right',def:'כל 4 הזוויות הן זוויות ישרות (90°).'},
  {id:'deq',label:'אלכסונים שווים',kind:'diag',ids:['AC','BD'],mark:'diagEqual',def:'שני האלכסונים שווים באורכם — לכן מסומן קו קטן אחד באמצע כל אלכסון.'},
  {id:'dperp',label:'אלכסונים ניצבים',kind:'diag',ids:['AC','BD'],mark:'diagPerp',def:'האלכסונים ניצבים זה לזה — שימו לב לסימן הזווית הישרה בנקודת המפגש שלהם.'},
  {id:'dbis',label:'אלכסונים חוצים זה את זה',kind:'diag',ids:['AC','BD'],mark:'diagBisect',def:'כל אלכסון מתחלק לשני חצאים שווים בנקודת המפגש — לכן שני החצאים של אותו אלכסון מסומנים באותו מספר קווים קטנים.'},
];
function genSquareArea(){
  const a=randInt(2,20);
  return {a, answer:a*a, formula:'S = a²', askLabel:'S =', unit:'',
    given:`צלע a = ${a}`,
    visual:<SquareShape sideLabels={{AB:a}}/>};
}
function genSquarePerimeter(){
  const a=randInt(2,20);
  return {a, answer:4*a, formula:'P = 4a', askLabel:'P =',
    given:`צלע a = ${a}`,
    visual:<SquareShape sideLabels={{AB:a}}/>};
}
function genSquareSide(){
  const a=randInt(2,20); const S=a*a;
  return {a, answer:a, formula:'a² = S', askLabel:'a =',
    given:`שטח S = ${S} (הוצא שורש כדי למצוא את הצלע)`,
    visual:<SquareShape/>};
}
const SQUARE_SUBS=[
  {tab:'שטח',
    explain:<>שטח הריבוע הוא <b>צלע כפול צלע</b>. כל הצלעות בריבוע שוות, לכן מספיק לדעת צלע אחת.</>,
    formula:<>S = a²</>,
    example:{visual:<SquareShape sideLabels={{AB:6}}/>,
      given:<>נתון ריבוע ABCD שאורך הצלע שלו <bdi>a = 6</bdi>. נחשב את השטח.</>,
      steps:[
        {text:<>בריבוע כל הצלעות שוות, לכן השטח הוא צלע כפול צלע.</>, math:<>S = a² = 6 · 6 = 36</>},
      ]},
    practice:<NumericQuestion title="שטח" genFn={genSquareArea}/>},
  {tab:'היקף',
    explain:<>ההיקף הוא <b>סכום ארבע הצלעות</b>. בריבוע כולן שוות, לכן כופלים את הצלע ב-4.</>,
    formula:<>P = 4a</>,
    example:{visual:<SquareShape sideLabels={{AB:6}}/>,
      given:<>נתון ריבוע ABCD שאורך הצלע שלו <bdi>a = 6</bdi>. נחשב את ההיקף.</>,
      steps:[
        {text:<>ההיקף הוא סכום ארבע הצלעות, וכולן שוות ל-6.</>, math:<>P = 4a = 4 · 6 = 24</>},
      ]},
    practice:<NumericQuestion title="היקף" genFn={genSquarePerimeter}/>},
  {tab:'צלע',
    explain:<>כשנתון השטח ומחפשים את הצלע, שואלים: <b>איזה מספר כפול עצמו נותן את השטח?</b> המספר הזה הוא השורש הריבועי של השטח.</>,
    formula:<>a² = S &nbsp;→&nbsp; a = √S</>,
    example:{visual:<SquareShape sideLabels={{AB:'?'}}/>,
      given:<>נתון ריבוע ששטחו <bdi>S = 49</bdi>. נמצא את אורך הצלע.</>,
      steps:[
        {text:<>מציבים את השטח בנוסחה.</>, math:<>a² = 49</>},
        {text:<>מוציאים שורש: איזה מספר כפול עצמו נותן 49?</>, math:<>a = √49 = 7</>},
        {text:<>בודקים את התשובה.</>, math:<>7 · 7 = 49 ✓</>},
      ]},
    practice:<NumericQuestion title="צלע (נתון שטח)" genFn={genSquareSide}/>},
];
const SQUARE_POSTER={name:'ריבוע', visual:<SquareShape/>,
  formulas:[
    {label:'שטח', math:<>S = a²</>},
    {label:'היקף', math:<>P = 4a</>},
    {label:'צלע מתוך השטח', math:<>a = √S</>, wide:true},
  ],
  facts:['כל 4 הצלעות שוות','כל 4 הזוויות ישרות (90°)','האלכסונים שווים, ניצבים וחוצים זה את זה']};
function Ch1Square(){
  return <div className="content">
    <PropertyExplorer verts={SQ_VERTS} order={SQ_ORDER} diagonals={[['A','C'],['B','D']]} properties={SQUARE_PROPS}/>
    <SubChapters items={SQUARE_SUBS} poster={SQUARE_POSTER}/>
  </div>;
}

/* ═══════════════════ RECTANGLE ═══════════════════ */
const RC_VERTS={A:{x:220,y:70},B:{x:220,y:170},C:{x:80,y:170},D:{x:80,y:70}};
const RC_ORDER=['A','B','C','D'];
function RectShape({highlight,onPart,angleLabels={},sideLabels={},extra}){
  return <QuadBase verts={RC_VERTS} order={RC_ORDER} highlight={highlight} onPart={onPart}
    sideLabels={sideLabels} angleLabels={angleLabels}
    ticks={{AB:1,CD:1,BC:2,DA:2}} parallelArrows={{AB:1,CD:1,BC:2,DA:2}}
    rightAngleAt={['A','B','C','D']} diagonals={[['A','C'],['B','D']]} extra={extra}/>;
}
const RECT_PROPS=[
  {id:'seq',label:'צלעות נגדיות שוות',kind:'side',ids:['AB','CD','BC','DA'],mark:'tick',groups:[['AB','CD'],['BC','DA']],def:'צלעות נגדיות שוות זו לזו (AB=CD, BC=DA) — כל זוג מסומן במספר קווים משלו.'},
  {id:'spar',label:'צלעות נגדיות מקבילות',kind:'side',ids:['AB','CD','BC','DA'],mark:'arrow',groups:[['AB','CD'],['BC','DA']],def:'צלעות נגדיות מקבילות זו לזו — כל זוג מסומן בחיצים משלו.'},
  {id:'angles',label:'זוויות ישרות',kind:'angle',ids:['A','B','C','D'],mark:'right',def:'כל 4 הזוויות הן זוויות ישרות (90°).'},
  {id:'deq',label:'אלכסונים שווים',kind:'diag',ids:['AC','BD'],mark:'diagEqual',def:'שני האלכסונים שווים באורכם.'},
  {id:'dbis',label:'אלכסונים חוצים זה את זה',kind:'diag',ids:['AC','BD'],mark:'diagBisect',def:'האלכסונים חוצים זה את זה (לא בהכרח בניצב) — לכן שני החצאים של אותו אלכסון מסומנים באותו מספר קווים קטנים.'},
];
function genRectPair(){
  let l=randInt(2,20), w=randInt(2,20);
  if(l===w){ w = w<20? w+1 : w-1; }
  return [l,w];
}
function genRectArea(){
  const [l,w]=genRectPair();
  return {l,w, answer:l*w, formula:'S = l·w', askLabel:'S =',
    given:`אורך l = ${l}, רוחב w = ${w}`,
    visual:<RectShape sideLabels={{DA:l,AB:w}}/>};
}
function genRectPerimeter(){
  const [l,w]=genRectPair();
  return {l,w, answer:2*(l+w), formula:'P = 2(l+w)', askLabel:'P =',
    given:`אורך l = ${l}, רוחב w = ${w}`,
    visual:<RectShape sideLabels={{DA:l,AB:w}}/>};
}
function genRectSide(){
  const [l,w]=genRectPair(); const S=l*w;
  return {l,w, answer:w, requiredNums:[S,l], formula:'S = l·w', askLabel:'w =',
    given:`שטח S = ${S}, אורך l = ${l}`,
    visual:<RectShape sideLabels={{DA:l}}/>};
}
const RECT_SUBS=[
  {tab:'שטח',
    explain:<>שטח המלבן הוא <b>אורך כפול רוחב</b>.</>,
    formula:<>S = l·w</>,
    example:{visual:<RectShape sideLabels={{DA:8,AB:5}}/>,
      given:<>נתון מלבן שאורכו <bdi>l = 8</bdi> ורוחבו <bdi>w = 5</bdi>. נחשב את השטח.</>,
      steps:[
        {text:<>כופלים את האורך ברוחב.</>, math:<>S = l·w = 8 · 5 = 40</>},
      ]},
    practice:<NumericQuestion title="שטח" genFn={genRectArea}/>},
  {tab:'היקף',
    explain:<>במלבן יש <b>שני אורכים ושני רוחבים</b>. לכן מחברים אורך ורוחב, ואת הסכום כופלים ב-2.</>,
    formula:<>P = 2(l+w)</>,
    example:{visual:<RectShape sideLabels={{DA:8,AB:5}}/>,
      given:<>נתון מלבן שאורכו <bdi>l = 8</bdi> ורוחבו <bdi>w = 5</bdi>. נחשב את ההיקף.</>,
      steps:[
        {text:<>מחברים אורך ורוחב.</>, math:<>8 + 5 = 13</>},
        {text:<>כופלים ב-2, כי כל צלע מופיעה פעמיים.</>, math:<>P = 2 · 13 = 26</>},
      ]},
    practice:<NumericQuestion title="היקף" genFn={genRectPerimeter}/>},
  {tab:'צלע',
    explain:<>כשנתונים השטח והאורך, כותבים את נוסחת השטח <b>כמשוואה</b>: במקום הרוחב שמים סימן שאלה. כדי לפתור מחלקים את השטח באורך.</>,
    formula:<>S = l·w</>,
    example:{visual:<RectShape sideLabels={{DA:7,AB:'?'}}/>,
      given:<>נתון מלבן ששטחו <bdi>S = 42</bdi> ואורכו <bdi>l = 7</bdi>. נמצא את הרוחב.</>,
      steps:[
        {text:<>כותבים משוואה לפי נוסחת השטח, עם ? במקום הרוחב. (בתרגול מקלידים כפל בעזרת כוכבית: <bdi>42=7*?</bdi>)</>, math:<>42 = 7 · ?</>},
        {text:<>מחלקים את השטח באורך.</>, math:<>? = 42 : 7 = 6</>},
        {text:<>הרוחב הוא 6. בודקים:</>, math:<>7 · 6 = 42 ✓</>},
      ]},
    practice:<EquationSideQuestion title="צלע (רוחב, נתון שטח ואורך)" genFn={genRectSide}/>},
];
const RECT_POSTER={name:'מלבן', visual:<RectShape/>,
  formulas:[
    {label:'שטח', math:<>S = l·w</>},
    {label:'היקף', math:<>P = 2(l+w)</>},
    {label:'צלע מתוך השטח', math:<>w = <Frac n="S" d="l"/></>, wide:true},
  ],
  facts:['צלעות נגדיות שוות ומקבילות','כל 4 הזוויות ישרות (90°)','האלכסונים שווים וחוצים זה את זה']};
function Ch2Rectangle(){
  return <div className="content">
    <PropertyExplorer verts={RC_VERTS} order={RC_ORDER} diagonals={[['A','C'],['B','D']]} properties={RECT_PROPS}/>
    <SubChapters items={RECT_SUBS} poster={RECT_POSTER}/>
  </div>;
}

/* ═══════════════════ RHOMBUS ═══════════════════ */
const RH_VERTS={A:{x:150,y:40},B:{x:230,y:130},C:{x:150,y:220},D:{x:70,y:130}};
const RH_ORDER=['A','B','C','D'];
function RhombusShape({highlight,onPart,angleLabels={},sideLabels={},extra}){
  return <QuadBase verts={RH_VERTS} order={RH_ORDER} highlight={highlight} onPart={onPart}
    sideLabels={sideLabels} angleLabels={angleLabels}
    ticks={{AB:1,BC:1,CD:1,DA:1}} parallelArrows={{AB:1,CD:1,BC:2,DA:2}}
    rightAngleAt={[]} diagonals={[['A','C'],['B','D']]} extra={extra}/>;
}
const RHOMBUS_PROPS=[
  {id:'sides',label:'צלעות שוות',kind:'side',ids:['AB','BC','CD','DA'],mark:'tick',def:'כל 4 הצלעות שוות באורכן.'},
  {id:'oeq',label:'זוויות נגדיות שוות',kind:'angle',ids:['A','B','C','D'],mark:'arc',def:'זוויות נגדיות שוות זו לזו (A=C, B=D).'},
  {id:'asup',label:'זוויות סמוכות משלימות',kind:'angle',ids:['A','B'],mark:'arc',def:'זוויות סמוכות משלימות זו את זו ל-180°.'},
  {id:'dperp',label:'אלכסונים ניצבים',kind:'diag',ids:['AC','BD'],mark:'diagPerp',def:'האלכסונים ניצבים זה לזה — שימו לב לסימן הזווית הישרה בנקודת המפגש שלהם.'},
  {id:'dbis',label:'אלכסונים חוצים זה את זה',kind:'diag',ids:['AC','BD'],mark:'diagBisect',def:'כל אלכסון מתחלק לשני חצאים שווים בנקודת המפגש — לכן שני החצאים של אותו אלכסון מסומנים באותו מספר קווים קטנים.'},
];
function genRhombusArea(){
  let d1=randInt(2,20); if(d1%2!==0) d1++;
  const d2=randInt(2,20);
  return {d1,d2, answer:(d1*d2)/2, formula:F_DIAG, askLabel:'S =',
    given:`אלכסון d₁ = ${d1}, אלכסון d₂ = ${d2}`,
    visual:<RhombusShape/>};
}
function genRhombusPerimeter(){
  const a=randInt(2,20);
  return {a, answer:4*a, formula:'P = 4a', askLabel:'P =',
    given:`צלע a = ${a}`,
    visual:<RhombusShape sideLabels={{AB:a}}/>};
}
function genRhombusSide(){
  const [p,q,side]=pickTriple(20);
  return {p,q, answer:side, formula:'a² = p² + q²', askLabel:'a =',
    given:`חצי אלכסון אחד = ${p}, חצי אלכסון שני = ${q} (משולש ישר-זווית עם האלכסונים)`,
    visual:<RhombusShape/>};
}
function genRhombusAngle(){
  const A=pick(ANGLES_NO90);
  return {A, given:`זווית A = ${A}°`, visual:<RhombusShape angleLabels={{A:A+'°'}}/>,
    targets:[
      {vertex:'C', name:'זווית C', value:A, reason:'opposite'},
      {vertex:'B', name:'זווית B', value:180-A, reason:'adjacent'},
      {vertex:'D', name:'זווית D', value:180-A, reason:'adjacent'},
    ]};
}
const OPP_ADJ_REASONS=[
  {key:'opposite', label:'זווית נגדית (שווה לנתונה)'},
  {key:'adjacent', label:'זווית סמוכה (משלימה ל-180°)'},
];
const RH_O={x:150,y:130};
const RHOMBUS_SUBS=[
  {tab:'זווית',
    explain:<>במעוין <b>זוויות נגדיות שוות</b> זו לזו, ו<b>זוויות סמוכות</b> (שתי זוויות ליד אותה צלע) משלימות זו את זו ל-180°. לכן מספיק לדעת זווית אחת כדי למצוא את כולן.</>,
    example:{visual:<RhombusShape angleLabels={{A:'60°'}}/>,
      given:<>נתון מעוין ABCD שבו הזווית <bdi>A = 60°</bdi>. נמצא את שאר הזוויות.</>,
      steps:[
        {text:<>הזווית C נמצאת מול הזווית A. זוויות נגדיות שוות.</>, math:<>C = 60°</>},
        {text:<>הזווית B סמוכה לזווית A. זוויות סמוכות משלימות ל-180°.</>, math:<>B = 180° − 60° = 120°</>},
        {text:<>גם הזווית D סמוכה לזווית A.</>, math:<>D = 180° − 60° = 120°</>},
      ]},
    practice:<ReasonedAngleQuestion title="זווית" genFn={genRhombusAngle} reasonOptions={OPP_ADJ_REASONS}/>},
  {tab:'שטח',
    explain:<>שטח המעוין הוא <b>מכפלת האלכסונים חלקי 2</b>.</>,
    formula:F_DIAG,
    example:{visual:<RhombusShape extra={<>
        <HelpLine from={RH_VERTS.A} to={RH_VERTS.C} label="8" ly={-38}/>
        <HelpLine from={RH_VERTS.D} to={RH_VERTS.B} label="6" color="#0e7490" lx={-38} ly={-7} anchor="middle"/>
      </>}/>,
      given:<>נתון מעוין שהאלכסונים שלו <bdi>d₁ = 8</bdi> ו-<bdi>d₂ = 6</bdi>. נחשב את השטח.</>,
      steps:[
        {text:<>כופלים את שני האלכסונים.</>, math:<>d₁·d₂ = 8 · 6 = 48</>},
        {text:<>מחלקים ב-2.</>, math:<>S = <Frac n="48" d="2"/> = 24</>},
      ]},
    practice:<NumericQuestion title="שטח" genFn={genRhombusArea}/>},
  {tab:'היקף',
    explain:<>כל ארבע הצלעות של המעוין שוות, לכן ההיקף הוא <b>4 כפול הצלע</b>.</>,
    formula:<>P = 4a</>,
    example:{visual:<RhombusShape sideLabels={{AB:9}}/>,
      given:<>נתון מעוין שאורך הצלע שלו <bdi>a = 9</bdi>. נחשב את ההיקף.</>,
      steps:[
        {text:<>ארבע צלעות שוות, כל אחת באורך 9.</>, math:<>P = 4a = 4 · 9 = 36</>},
      ]},
    practice:<NumericQuestion title="היקף" genFn={genRhombusPerimeter}/>},
  {tab:'צלע',
    explain:<>האלכסונים במעוין <b>ניצבים וחוצים זה את זה</b>, ולכן הם מחלקים אותו ל-4 משולשים ישרי-זווית. בכל משולש כזה הניצבים הם חצאי האלכסונים (p ו-q), והיתר הוא צלע המעוין (a). משתמשים במשפט פיתגורס.</>,
    formula:<>a² = p² + q²</>,
    example:{visual:<RhombusShape sideLabels={{AB:'a'}} extra={<>
        <Tri pts={[RH_VERTS.A,RH_O,RH_VERTS.B]}/>
        <RightSquareMark v={RH_O} prev={RH_VERTS.A} next={RH_VERTS.B} active={false}/>
        <Lbl x={141} y={95} anchor="end">4</Lbl>
        <Lbl x={190} y={147} color="#0e7490">3</Lbl>
      </>}/>,
      given:<>נתון מעוין שבו חצי אלכסון אחד הוא 4 וחצי האלכסון השני הוא 3. נמצא את הצלע a.</>,
      steps:[
        {text:<>מציבים את חצאי האלכסונים במשפט פיתגורס.</>, math:<>a² = 4² + 3²</>},
        {text:<>מחשבים.</>, math:<>a² = 16 + 9 = 25</>},
        {text:<>מוציאים שורש.</>, math:<>a = √25 = 5</>},
      ]},
    practice:<NumericQuestion title="צלע (פיתגורס)" genFn={genRhombusSide}/>},
];
const RHOMBUS_POSTER={name:'מעוין', visual:<RhombusShape/>,
  formulas:[
    {label:'שטח', math:F_DIAG},
    {label:'היקף', math:<>P = 4a</>},
    {label:'צלע (פיתגורס)', math:<>a² = p² + q²</>, note:'p ו-q הם חצאי האלכסונים'},
    {label:'זוויות סמוכות', math:<>α + β = 180°</>},
  ],
  facts:['כל 4 הצלעות שוות','זוויות נגדיות שוות','האלכסונים ניצבים וחוצים זה את זה']};
function Ch3Rhombus(){
  return <div className="content">
    <PropertyExplorer verts={RH_VERTS} order={RH_ORDER} diagonals={[['A','C'],['B','D']]} properties={RHOMBUS_PROPS}/>
    <SubChapters items={RHOMBUS_SUBS} poster={RHOMBUS_POSTER}/>
  </div>;
}

/* ═══════════════════ PARALLELOGRAM ═══════════════════ */
const PG_VERTS={A:{x:230,y:70},B:{x:190,y:170},C:{x:70,y:170},D:{x:110,y:70}};
const PG_ORDER=['A','B','C','D'];
function ParallelogramShape({highlight,onPart,angleLabels={},sideLabels={},extra,noDiag=false}){
  return <QuadBase verts={PG_VERTS} order={PG_ORDER} highlight={highlight} onPart={onPart}
    sideLabels={sideLabels} angleLabels={angleLabels}
    ticks={{AB:1,CD:1,BC:2,DA:2}} parallelArrows={{AB:1,CD:1,BC:2,DA:2}}
    rightAngleAt={[]} diagonals={noDiag?[]:[['A','C'],['B','D']]} extra={extra}/>;
}
const PARA_PROPS=[
  {id:'seq',label:'צלעות נגדיות שוות',kind:'side',ids:['AB','CD','BC','DA'],mark:'tick',groups:[['AB','CD'],['BC','DA']],def:'צלעות נגדיות שוות זו לזו — כל זוג מסומן במספר קווים משלו.'},
  {id:'spar',label:'צלעות נגדיות מקבילות',kind:'side',ids:['AB','CD','BC','DA'],mark:'arrow',groups:[['AB','CD'],['BC','DA']],def:'צלעות נגדיות מקבילות זו לזו — כל זוג מסומן בחיצים משלו.'},
  {id:'oeq',label:'זוויות נגדיות שוות',kind:'angle',ids:['A','B','C','D'],mark:'arc',def:'זוויות נגדיות שוות זו לזו.'},
  {id:'asup',label:'זוויות סמוכות משלימות',kind:'angle',ids:['A','B'],mark:'arc',def:'זוויות סמוכות משלימות זו את זו ל-180°.'},
  {id:'dbis',label:'אלכסונים חוצים זה את זה',kind:'diag',ids:['AC','BD'],mark:'diagBisect',def:'האלכסונים חוצים זה את זה — לכן שני החצאים של אותו אלכסון מסומנים באותו מספר קווים קטנים.'},
];
function genParaArea(){
  const b=randInt(2,20), h=randInt(2,20);
  return {b,h, answer:b*h, formula:'S = b·h', askLabel:'S =',
    given:`בסיס b = ${b}, גובה h = ${h}`,
    visual:<ParallelogramShape sideLabels={{BC:b}}/>};
}
function genParaPerimeter(){
  let a=randInt(2,20), b=randInt(2,20);
  if(a===b){ b = b<20? b+1 : b-1; }
  return {a,b, answer:2*(a+b), formula:'P = 2(a+b)', askLabel:'P =',
    given:`צלע a = ${a}, צלע b = ${b}`,
    visual:<ParallelogramShape sideLabels={{AB:a,BC:b}}/>};
}
function genParaSide(){
  const b=randInt(2,20), h=randInt(2,20); const S=b*h;
  return {b,h, answer:b, requiredNums:[S,h], formula:'S = b·h', askLabel:'b =',
    given:`שטח S = ${S}, גובה h = ${h}`,
    visual:<ParallelogramShape/>};
}
function genParaAngle(){
  const A=pick(ANGLES_NO90);
  return {A, given:`זווית A = ${A}°`, visual:<ParallelogramShape angleLabels={{A:A+'°'}}/>,
    targets:[
      {vertex:'C', name:'זווית C', value:A, reason:'opposite'},
      {vertex:'B', name:'זווית B', value:180-A, reason:'adjacent'},
      {vertex:'D', name:'זווית D', value:180-A, reason:'adjacent'},
    ]};
}
const PG_F={x:110,y:170};
const PARA_SUBS=[
  {tab:'זווית',
    explain:<>במקבילית <b>זוויות נגדיות שוות</b> זו לזו, ו<b>זוויות סמוכות</b> (שתי זוויות ליד אותה צלע) משלימות זו את זו ל-180°. לכן מספיק לדעת זווית אחת כדי למצוא את כולן.</>,
    example:{visual:<ParallelogramShape angleLabels={{A:'45°'}}/>,
      given:<>נתונה מקבילית ABCD שבה הזווית <bdi>A = 45°</bdi>. נמצא את שאר הזוויות.</>,
      steps:[
        {text:<>הזווית C נמצאת מול הזווית A. זוויות נגדיות שוות.</>, math:<>C = 45°</>},
        {text:<>הזווית B סמוכה לזווית A. זוויות סמוכות משלימות ל-180°.</>, math:<>B = 180° − 45° = 135°</>},
        {text:<>גם הזווית D סמוכה לזווית A.</>, math:<>D = 180° − 45° = 135°</>},
      ]},
    practice:<ReasonedAngleQuestion title="זווית" genFn={genParaAngle} reasonOptions={OPP_ADJ_REASONS}/>},
  {tab:'שטח',
    explain:<>שטח המקבילית הוא <b>בסיס כפול הגובה לאותו בסיס</b>. הגובה הוא קטע שיורד אל הבסיס בזווית ישרה (90°). שימו לב: הגובה אינו הצלע הנטויה!</>,
    formula:<>S = b·h</>,
    example:{visual:<ParallelogramShape noDiag sideLabels={{BC:10}} extra={<HelpLine from={PG_VERTS.D} to={PG_F} sq={PG_VERTS.B} label="6"/>}/>,
      given:<>נתונה מקבילית שהבסיס שלה <bdi>b = 10</bdi> והגובה לבסיס הזה <bdi>h = 6</bdi>. נחשב את השטח.</>,
      steps:[
        {text:<>כופלים את הבסיס בגובה.</>, math:<>S = b·h = 10 · 6 = 60</>},
      ]},
    practice:<NumericQuestion title="שטח" genFn={genParaArea}/>},
  {tab:'היקף',
    explain:<>במקבילית צלעות נגדיות שוות, לכן יש <b>שתי צלעות באורך a ושתי צלעות באורך b</b>. מחברים את שתי הצלעות השונות, ואת הסכום כופלים ב-2.</>,
    formula:<>P = 2(a+b)</>,
    example:{visual:<ParallelogramShape sideLabels={{AB:7,BC:12}}/>,
      given:<>נתונה מקבילית שצלעותיה <bdi>a = 7</bdi> ו-<bdi>b = 12</bdi>. נחשב את ההיקף.</>,
      steps:[
        {text:<>מחברים את שתי הצלעות השונות.</>, math:<>7 + 12 = 19</>},
        {text:<>כופלים ב-2, כי כל צלע מופיעה פעמיים.</>, math:<>P = 2 · 19 = 38</>},
      ]},
    practice:<NumericQuestion title="היקף" genFn={genParaPerimeter}/>},
  {tab:'צלע',
    explain:<>כשנתונים השטח והגובה, כותבים את נוסחת השטח <b>כמשוואה</b>: במקום הבסיס שמים סימן שאלה. כדי לפתור מחלקים את השטח בגובה.</>,
    formula:<>S = b·h</>,
    example:{visual:<ParallelogramShape noDiag sideLabels={{BC:'?'}} extra={<HelpLine from={PG_VERTS.D} to={PG_F} sq={PG_VERTS.B} label="8"/>}/>,
      given:<>נתונה מקבילית ששטחה <bdi>S = 72</bdi> והגובה שלה <bdi>h = 8</bdi>. נמצא את הבסיס.</>,
      steps:[
        {text:<>כותבים משוואה לפי נוסחת השטח, עם ? במקום הבסיס. (בתרגול מקלידים כפל בעזרת כוכבית: <bdi>72=?*8</bdi>)</>, math:<>72 = ? · 8</>},
        {text:<>מחלקים את השטח בגובה.</>, math:<>? = 72 : 8 = 9</>},
        {text:<>הבסיס הוא 9. בודקים:</>, math:<>9 · 8 = 72 ✓</>},
      ]},
    practice:<EquationSideQuestion title="צלע (בסיס, נתון שטח וגובה)" genFn={genParaSide}/>},
];
const PARA_POSTER={name:'מקבילית', visual:<ParallelogramShape/>,
  formulas:[
    {label:'שטח', math:<>S = b·h</>, note:'h הוא הגובה לבסיס b'},
    {label:'היקף', math:<>P = 2(a+b)</>},
    {label:'בסיס מתוך השטח', math:<>b = <Frac n="S" d="h"/></>},
    {label:'זוויות סמוכות', math:<>α + β = 180°</>},
  ],
  facts:['צלעות נגדיות שוות ומקבילות','זוויות נגדיות שוות','האלכסונים חוצים זה את זה']};
function Ch4Parallelogram(){
  return <div className="content">
    <PropertyExplorer verts={PG_VERTS} order={PG_ORDER} diagonals={[['A','C'],['B','D']]} properties={PARA_PROPS}/>
    <SubChapters items={PARA_SUBS} poster={PARA_POSTER}/>
  </div>;
}

/* ═══════════════════ TRAPEZOID (3 variants) ═══════════════════ */
const TG_VERTS={A:{x:180,y:70},B:{x:240,y:180},C:{x:60,y:180},D:{x:120,y:70}};
const TI_VERTS={A:{x:190,y:70},B:{x:230,y:180},C:{x:70,y:180},D:{x:110,y:70}};
const TR_VERTS={A:{x:190,y:70},B:{x:210,y:180},C:{x:90,y:180},D:{x:90,y:70}};
const T_ORDER=['A','B','C','D'];

function TrapGeneralShape({highlight,onPart,angleLabels={},sideLabels={},extra}){
  return <QuadBase verts={TG_VERTS} order={T_ORDER} highlight={highlight} onPart={onPart}
    sideLabels={sideLabels} angleLabels={angleLabels}
    ticks={{}} parallelArrows={{BC:1,DA:1}} rightAngleAt={[]} diagonals={[]} extra={extra}/>;
}
function TrapIsoShape({highlight,onPart,angleLabels={},sideLabels={},extra,noDiag=false}){
  return <QuadBase verts={TI_VERTS} order={T_ORDER} highlight={highlight} onPart={onPart}
    sideLabels={sideLabels} angleLabels={angleLabels}
    ticks={{AB:1,CD:1}} parallelArrows={{BC:1,DA:1}} rightAngleAt={[]} diagonals={noDiag?[]:[['A','C'],['B','D']]} extra={extra}/>;
}
function TrapRightShape({highlight,onPart,angleLabels={},sideLabels={},extra}){
  return <QuadBase verts={TR_VERTS} order={T_ORDER} highlight={highlight} onPart={onPart}
    sideLabels={sideLabels} angleLabels={angleLabels}
    ticks={{}} parallelArrows={{BC:1,DA:1}} rightAngleAt={['C','D']} diagonals={[]} extra={extra}/>;
}

const TRAP_GEN_PROPS=[
  {id:'par',label:'זוג צלעות מקביל',kind:'side',ids:['BC','DA'],mark:'arrow',def:'רק זוג אחד של צלעות מקביל — אלה הבסיסים של הטרפז.'},
  {id:'cosup',label:'זוויות חד-צדדיות משלימות',kind:'angle',ids:['A','B'],mark:'arc',def:'זוויות הנמצאות על אותה שוק, בין שני הבסיסים, משלימות זו את זו ל-180°.'},
];
const TRAP_ISO_PROPS=[
  ...TRAP_GEN_PROPS,
  {id:'legs',label:'שוקיים שוות',kind:'side',ids:['AB','CD'],mark:'tick',def:'שתי השוקיים שוות באורכן.'},
  {id:'base-ang',label:'זוויות בסיס שוות',kind:'angle',ids:['D','A'],mark:'arc',def:'זוויות הבסיס (משני צידי אותו בסיס) שוות זו לזו.'},
  {id:'deq',label:'אלכסונים שווים',kind:'diag',ids:['AC','BD'],mark:'diagEqual',def:'שני האלכסונים שווים באורכם.'},
];
const TRAP_RIGHT_PROPS=[
  ...TRAP_GEN_PROPS,
];

/* ---- General ---- */
function genTrapGenPair(){
  let b1=randInt(2,20), b2=randInt(2,20);
  if(b1===b2) b2 = b2<20? b2+1 : b2-1;
  return b1<b2?[b1,b2]:[b2,b1];
}
function genTrapGenBasesEven(){
  const b1=randInt(2,18);
  const maxDelta=20-b1;
  const maxEvenDelta=maxDelta-(maxDelta%2);
  const opts=[]; for(let d=2; d<=maxEvenDelta; d+=2) opts.push(d);
  const delta=opts.length?pick(opts):2;
  return [b1, b1+delta];
}
function genTrapGenArea(){
  const [b1,b2]=genTrapGenBasesEven();
  const h=randInt(2,20);
  return {b1,b2,h, answer:((b1+b2)/2)*h, formula:F_TRAP, askLabel:'S =',
    given:`בסיס עליון b₁ = ${b1}, בסיס תחתון b₂ = ${b2}, גובה h = ${h}`,
    visual:<TrapGeneralShape sideLabels={{DA:b1,BC:b2}}/>};
}
function genTrapGenPerimeter(){
  const [b1,b2]=genTrapGenPair(); const l1=randInt(2,20), l2=randInt(2,20);
  return {b1,b2,l1,l2, answer:b1+b2+l1+l2, formula:'P = b₁+b₂+l₁+l₂', askLabel:'P =',
    given:`b₁=${b1}, b₂=${b2}, שוק1=${l1}, שוק2=${l2}`,
    visual:<TrapGeneralShape sideLabels={{DA:b1,BC:b2,AB:l1,CD:l2}}/>};
}
function genTrapGenSide(){
  const [b1,b2]=genTrapGenBasesEven();
  const h=randInt(2,20); const S=((b1+b2)/2)*h;
  return {b1,b2,h, answer:b2, requiredNums:[b1,h,S], formula:F_TRAP, askLabel:'b₂ =',
    given:`שטח S = ${S}, גובה h = ${h}, בסיס עליון b₁ = ${b1}`,
    visual:<TrapGeneralShape sideLabels={{DA:b1}}/>};
}
function genTrapGenAngle(){
  let a1,a2,a3,a4;
  for(let i=0;i<200;i++){
    a1=pick(ANGLES); a2=pick(ANGLES); a3=pick(ANGLES);
    a4=360-a1-a2-a3;
    if(a4>10&&a4<170) break;
  }
  const hidden=3;
  const vals=[a1,a2,a3,a4];
  return {vals, answer:a4,
    given:`זווית A=${a1}°, זווית B=${a2}°, זווית C=${a3}°`,
    formula:'סכום זוויות מרובע = 360°', askLabel:'זווית D =',
    visual:<TrapGeneralShape angleLabels={{A:a1+'°',B:a2+'°',C:a3+'°',D:'?'}}/>};
}
const TG_F={x:120,y:180};
const TRAP_GEN_SUBS=[
  {tab:'זווית',
    explain:<>סכום הזוויות בכל מרובע הוא <b>360°</b>. כשנתונות שלוש זוויות, מחברים אותן ומחסרים את הסכום מ-360°.</>,
    formula:<>A + B + C + D = 360°</>,
    example:{visual:<TrapGeneralShape angleLabels={{A:'120°',B:'60°',C:'70°',D:'?'}}/>,
      given:<>נתון טרפז ABCD שבו שלוש זוויות נתונות: <bdi>A = 120°</bdi>, <bdi>B = 60°</bdi>, <bdi>C = 70°</bdi>. נמצא את הזווית D.</>,
      steps:[
        {text:<>מחברים את שלוש הזוויות הנתונות.</>, math:<>120° + 60° + 70° = 250°</>},
        {text:<>מחסרים את הסכום מ-360°.</>, math:<>D = 360° − 250° = 110°</>},
      ]},
    practice:<NumericQuestion title="זווית (הרביעית)" genFn={genTrapGenAngle}/>},
  {tab:'שטח',
    explain:<>שטח הטרפז: <b>מחברים את שני הבסיסים, מחלקים ב-2 וכופלים בגובה</b>. הגובה הוא קטע שמחבר בין שני הבסיסים בזווית ישרה (90°).</>,
    formula:F_TRAP,
    example:{visual:<TrapGeneralShape sideLabels={{DA:6,BC:10}} extra={<HelpLine from={TG_VERTS.D} to={TG_F} sq={TG_VERTS.B} label="5"/>}/>,
      given:<>נתון טרפז שבסיסיו <bdi>b₁ = 6</bdi> ו-<bdi>b₂ = 10</bdi> וגובהו <bdi>h = 5</bdi>. נחשב את השטח.</>,
      steps:[
        {text:<>מחברים את שני הבסיסים.</>, math:<>6 + 10 = 16</>},
        {text:<>מחלקים ב-2.</>, math:<><Frac n="16" d="2"/> = 8</>},
        {text:<>כופלים בגובה.</>, math:<>S = 8 · 5 = 40</>},
      ]},
    practice:<NumericQuestion title="שטח" genFn={genTrapGenArea}/>},
  {tab:'היקף',
    explain:<>ההיקף הוא <b>סכום ארבע הצלעות</b>: שני הבסיסים ושתי השוקיים. בטרפז כללי כל הצלעות יכולות להיות שונות, לכן פשוט מחברים את כולן.</>,
    formula:<>P = b₁+b₂+l₁+l₂</>,
    example:{visual:<TrapGeneralShape sideLabels={{DA:6,BC:10,AB:5,CD:7}}/>,
      given:<>נתון טרפז שבסיסיו 6 ו-10 ושוקיו 5 ו-7. נחשב את ההיקף.</>,
      steps:[
        {text:<>מחברים את ארבע הצלעות.</>, math:<>P = 6 + 10 + 5 + 7 = 28</>},
      ]},
    practice:<NumericQuestion title="היקף" genFn={genTrapGenPerimeter}/>},
  {tab:'בסיס שני',
    explain:<>כשנתונים השטח, הגובה ובסיס אחד, כותבים את נוסחת השטח <b>כמשוואה</b>: במקום הבסיס החסר שמים סימן שאלה. פותרים אחורה, צעד אחרי צעד: מחלקים בגובה, כופלים ב-2 ומחסרים את הבסיס הידוע.</>,
    formula:F_TRAP,
    example:{visual:<TrapGeneralShape sideLabels={{DA:6,BC:'?'}} extra={<HelpLine from={TG_VERTS.D} to={TG_F} sq={TG_VERTS.B} label="5"/>}/>,
      given:<>נתון טרפז ששטחו <bdi>S = 40</bdi>, גובהו <bdi>h = 5</bdi> והבסיס העליון שלו <bdi>b₁ = 6</bdi>. נמצא את הבסיס השני.</>,
      steps:[
        {text:<>כותבים משוואה לפי נוסחת השטח, עם ? במקום הבסיס החסר. (בתרגול מקלידים כך: <bdi>40=(6+?)/2*5</bdi>)</>, math:<>40 = <Frac n="6+?" d="2"/> · 5</>},
        {text:<>מחלקים את שני האגפים בגובה.</>, math:<><Frac n="6+?" d="2"/> = 40 : 5 = 8</>},
        {text:<>כופלים ב-2.</>, math:<>6 + ? = 16</>},
        {text:<>מחסרים את הבסיס הידוע.</>, math:<>? = 16 − 6 = 10</>},
      ]},
    practice:<EquationSideQuestion title="בסיס שני (נתון שטח, גובה ובסיס אחד)" genFn={genTrapGenSide}/>},
];
const TRAP_GEN_POSTER={name:'טרפז כללי', visual:<TrapGeneralShape/>,
  formulas:[
    {label:'שטח', math:F_TRAP, note:'h הוא הגובה בין הבסיסים', wide:true},
    {label:'היקף', math:<>P = b₁+b₂+l₁+l₂</>, wide:true},
    {label:'סכום הזוויות', math:<>360°</>},
    {label:'זוויות ליד אותה שוק', math:<>α + β = 180°</>},
  ],
  facts:['רק זוג אחד של צלעות מקבילות: הבסיסים','שתי הצלעות האחרות הן השוקיים']};
function ChTrapGeneral(){
  return <div className="content">
    <PropertyExplorer verts={TG_VERTS} order={T_ORDER} diagonals={[]} properties={TRAP_GEN_PROPS}/>
    <SubChapters items={TRAP_GEN_SUBS} poster={TRAP_GEN_POSTER}/>
  </div>;
}

/* ---- Isosceles ---- */
function genTrapIsoBase(){
  const [k,h,s]=pickTriple(9);
  const b1=randInt(2, Math.max(2,20-2*k));
  const b2=b1+2*k;
  return {k,h,s,b1,b2};
}
function genTrapIsoArea(){
  const {h,s,b1,b2}=genTrapIsoBase();
  return {b1,b2,h,s, answer:((b1+b2)/2)*h, formula:F_TRAP, askLabel:'S =',
    given:`בסיס עליון b₁ = ${b1}, בסיס תחתון b₂ = ${b2}, גובה h = ${h}`,
    visual:<TrapIsoShape sideLabels={{DA:b1,BC:b2}}/>};
}
function genTrapIsoPerimeter(){
  const {h,s,b1,b2}=genTrapIsoBase();
  return {b1,b2,s, answer:b1+b2+2*s, formula:'P = b₁+b₂+2·שוק', askLabel:'P =',
    given:`b₁=${b1}, b₂=${b2}, שוק = ${s}`,
    visual:<TrapIsoShape sideLabels={{DA:b1,BC:b2,AB:s,CD:s}}/>};
}
function genTrapIsoSide(){
  const {h,s,b1,b2}=genTrapIsoBase();
  return {b1,b2,s, answer:h, formula:F_ISO_H, askLabel:'h =',
    given:`b₁=${b1}, b₂=${b2}, שוק = ${s} (השתמש בפיתגורס)`,
    visual:<TrapIsoShape sideLabels={{DA:b1,BC:b2,AB:s,CD:s}}/>};
}
function genTrapIsoAngle(){
  const A=pick(ANGLES_NO90);
  return {A, given:`זווית בסיס A = ${A}°`, visual:<TrapIsoShape angleLabels={{A:A+'°'}}/>,
    targets:[
      {vertex:'D', name:'זווית D', value:A, reason:'baseEqual'},
      {vertex:'B', name:'זווית B', value:180-A, reason:'coInterior'},
      {vertex:'C', name:'זווית C', value:180-A, reason:'coInterior'},
    ]};
}
const BASE_COINT_REASONS=[
  {key:'baseEqual', label:'זווית בסיס (שווה לנתונה)'},
  {key:'coInterior', label:'זווית חד-צדדית (משלימה ל-180°)'},
];
const TI_F={x:110,y:180};
const TRAP_ISO_SUBS=[
  {tab:'זווית',
    explain:<>בטרפז שווה-שוקיים <b>זוויות הבסיס שוות</b>: שתי הזוויות שליד אותו בסיס שוות זו לזו. שתי זוויות שליד אותה שוק (זוויות חד-צדדיות) <b>משלימות ל-180°</b>.</>,
    example:{visual:<TrapIsoShape noDiag angleLabels={{A:'120°'}}/>,
      given:<>נתון טרפז שווה-שוקיים ABCD שבו זווית הבסיס <bdi>A = 120°</bdi>. נמצא את שאר הזוויות.</>,
      steps:[
        {text:<>הזוויות A ו-D נמצאות ליד אותו בסיס (AD). זוויות בסיס שוות.</>, math:<>D = 120°</>},
        {text:<>הזוויות A ו-B נמצאות ליד אותה שוק (AB). זוויות חד-צדדיות משלימות ל-180°.</>, math:<>B = 180° − 120° = 60°</>},
        {text:<>הזוויות D ו-C נמצאות ליד אותה שוק (CD), ולכן גם הן משלימות ל-180°.</>, math:<>C = 180° − 120° = 60°</>},
      ]},
    practice:<ReasonedAngleQuestion title="זווית" genFn={genTrapIsoAngle} reasonOptions={BASE_COINT_REASONS}/>},
  {tab:'שטח',
    explain:<>שטח הטרפז: <b>מחברים את שני הבסיסים, מחלקים ב-2 וכופלים בגובה</b>. הגובה הוא קטע שמחבר בין שני הבסיסים בזווית ישרה (90°). אם הגובה לא נתון, מוצאים אותו קודם בעזרת משפט פיתגורס (תת-הפרק ״גובה״).</>,
    formula:F_TRAP,
    example:{visual:<TrapIsoShape noDiag sideLabels={{DA:4,BC:10}} extra={<HelpLine from={TI_VERTS.D} to={TI_F} sq={TI_VERTS.B} label="4"/>}/>,
      given:<>נתון טרפז שווה-שוקיים שבסיסיו <bdi>b₁ = 4</bdi> ו-<bdi>b₂ = 10</bdi> וגובהו <bdi>h = 4</bdi>. נחשב את השטח.</>,
      steps:[
        {text:<>מחברים את שני הבסיסים.</>, math:<>4 + 10 = 14</>},
        {text:<>מחלקים ב-2.</>, math:<><Frac n="14" d="2"/> = 7</>},
        {text:<>כופלים בגובה.</>, math:<>S = 7 · 4 = 28</>},
      ]},
    practice:<NumericQuestion title="שטח (פיתגורס לגובה)" genFn={genTrapIsoArea}/>},
  {tab:'היקף',
    explain:<>ההיקף הוא סכום ארבע הצלעות. בטרפז שווה-שוקיים <b>שתי השוקיים שוות</b>, לכן מחברים את שני הבסיסים ומוסיפים פעמיים את השוק.</>,
    formula:<>P = b₁+b₂+2·שוק</>,
    example:{visual:<TrapIsoShape noDiag sideLabels={{DA:4,BC:10,AB:5,CD:5}}/>,
      given:<>נתון טרפז שווה-שוקיים שבסיסיו 4 ו-10 ואורך כל שוק 5. נחשב את ההיקף.</>,
      steps:[
        {text:<>שתי השוקיים יחד:</>, math:<>2 · 5 = 10</>},
        {text:<>מוסיפים את שני הבסיסים.</>, math:<>P = 4 + 10 + 10 = 24</>},
      ]},
    practice:<NumericQuestion title="היקף" genFn={genTrapIsoPerimeter}/>},
  {tab:'גובה',
    explain:<>מורידים גובה מקצה הבסיס הקצר אל הבסיס הארוך. נוצר <b>משולש ישר-זווית</b>: היתר הוא השוק, ניצב אחד הוא הגובה, והניצב השני הוא חצי מההפרש בין הבסיסים. משתמשים במשפט פיתגורס.</>,
    formula:F_ISO_H,
    example:{visual:<TrapIsoShape noDiag sideLabels={{DA:4,BC:10,CD:5}} extra={<>
        <Tri pts={[TI_VERTS.C,TI_F,TI_VERTS.D]}/>
        <HelpLine from={TI_VERTS.D} to={TI_F} sq={TI_VERTS.B} label="h"/>
        <Lbl x={93} y={175} color="#0e7490">3</Lbl>
      </>}/>,
      given:<>נתון טרפז שווה-שוקיים שבסיסיו <bdi>b₁ = 4</bdi> ו-<bdi>b₂ = 10</bdi> ואורך השוק 5. נמצא את הגובה h.</>,
      steps:[
        {text:<>מוצאים את הניצב שעל הבסיס: חצי מההפרש בין הבסיסים.</>, math:<><Frac n="10 − 4" d="2"/> = 3</>},
        {text:<>מציבים במשפט פיתגורס: השוק היא היתר.</>, math:<>5² = h² + 3²</>},
        {text:<>מבודדים את h².</>, math:<>h² = 25 − 9 = 16</>},
        {text:<>מוציאים שורש.</>, math:<>h = √16 = 4</>},
      ]},
    practice:<NumericQuestion title="גובה (פיתגורס)" genFn={genTrapIsoSide}/>},
];
const TRAP_ISO_POSTER={name:'טרפז שווה-שוקיים', visual:<TrapIsoShape/>,
  formulas:[
    {label:'שטח', math:F_TRAP, wide:true},
    {label:'היקף', math:<>P = b₁+b₂+2·שוק</>, wide:true},
    {label:'גובה (פיתגורס)', math:<span dir="ltr" className="sc-ltr"><bdi>שוק</bdi>² = h² + (<Frac n="b₂−b₁" d="2"/>)²</span>, wide:true},
    {label:'זוויות ליד אותה שוק', math:<>α + β = 180°</>, wide:true},
  ],
  facts:['שתי השוקיים שוות','זוויות הבסיס שוות','האלכסונים שווים']};
function ChTrapIso(){
  return <div className="content">
    <PropertyExplorer verts={TI_VERTS} order={T_ORDER} diagonals={[['A','C'],['B','D']]} properties={TRAP_ISO_PROPS}/>
    <SubChapters items={TRAP_ISO_SUBS} poster={TRAP_ISO_POSTER}/>
  </div>;
}

/* ---- Right ---- */
function genTrapRightBase(){
  const [k,h,s]=pickTriple(14);
  const b1=randInt(2, Math.max(2,20-k));
  const b2=b1+k;
  return {k,h,s,b1,b2};
}
function genTrapRightArea(){
  const {h,s,b1,b2}=genTrapRightBase();
  return {b1,b2,h,s, answer:((b1+b2)/2)*h, formula:F_TRAP, askLabel:'S =',
    given:`בסיס עליון b₁ = ${b1}, בסיס תחתון b₂ = ${b2}, שוק ניצבה (גובה) h = ${h}`,
    visual:<TrapRightShape sideLabels={{DA:b1,BC:b2,CD:h}}/>};
}
function genTrapRightPerimeter(){
  const {h,s,b1,b2}=genTrapRightBase();
  return {b1,b2,h,s, answer:b1+b2+h+s, formula:'שוק אלכסונית² = (b₂-b₁)² + h²',askLabel:'P =',
    given:`b₁=${b1}, b₂=${b2}, שוק ניצבה h=${h} (מצא את השוק האלכסונית בעזרת פיתגורס לפני שתחשב היקף)`,
    visual:<TrapRightShape sideLabels={{DA:b1,BC:b2,CD:h}}/>};
}
function genTrapRightSide(){
  const {h,s,b1,b2}=genTrapRightBase();
  const S=((b1+b2)/2)*h;
  return {b1,b2,h, answer:b2, requiredNums:[b1,h,S], formula:F_TRAP, askLabel:'b₂ =',
    given:`שטח S = ${S}, שוק ניצבה h = ${h}, בסיס עליון b₁ = ${b1}`,
    visual:<TrapRightShape sideLabels={{DA:b1,CD:h}}/>};
}
function genTrapRightAngle(){
  const given=pick([60,120,150,30,45]);
  return {given, answer:180-given, formula:'זוויות חד-צדדיות בין הבסיסים משלימות ל-180°', askLabel:'הזווית השלישית =',
    given:`שתי הזוויות הישרות (90°) ידועות; הזווית הנוספת = ${given}°`,
    visual:<TrapRightShape angleLabels={{A:given+'°',B:'?'}}/>};
}
const TR_F={x:190,y:180};
const TRAP_RIGHT_SUBS=[
  {tab:'זווית',
    explain:<>בטרפז ישר-זווית <b>שתי זוויות הן ישרות (90°)</b>. שתי הזוויות האחרות נמצאות ליד אותה שוק, ולכן הן <b>משלימות זו את זו ל-180°</b>.</>,
    example:{visual:<TrapRightShape angleLabels={{A:'120°',B:'?'}}/>,
      given:<>נתון טרפז ישר-זווית ABCD. הזוויות C ו-D ישרות, והזווית <bdi>A = 120°</bdi>. נמצא את הזווית B.</>,
      steps:[
        {text:<>הזוויות A ו-B נמצאות ליד אותה שוק (AB), בין שני הבסיסים. הן משלימות ל-180°.</>, math:<>B = 180° − 120° = 60°</>},
        {text:<>בודקים: סכום כל הזוויות במרובע הוא 360°.</>, math:<>90° + 90° + 120° + 60° = 360° ✓</>},
      ]},
    practice:<NumericQuestion title="זווית (השלישית)" genFn={genTrapRightAngle}/>},
  {tab:'שטח',
    explain:<>שטח הטרפז: <b>מחברים את שני הבסיסים, מחלקים ב-2 וכופלים בגובה</b>. הגובה הוא קטע שמחבר בין שני הבסיסים בזווית ישרה (90°). בטרפז ישר-זווית הגובה h הוא השוק שניצבת לבסיסים.</>,
    formula:F_TRAP,
    example:{visual:<TrapRightShape sideLabels={{DA:5,BC:9,CD:3}}/>,
      given:<>נתון טרפז ישר-זווית שבסיסיו <bdi>b₁ = 5</bdi> ו-<bdi>b₂ = 9</bdi>, והשוק הניצבת שלו <bdi>h = 3</bdi>. נחשב את השטח.</>,
      steps:[
        {text:<>מחברים את שני הבסיסים.</>, math:<>5 + 9 = 14</>},
        {text:<>מחלקים ב-2.</>, math:<><Frac n="14" d="2"/> = 7</>},
        {text:<>כופלים בגובה.</>, math:<>S = 7 · 3 = 21</>},
      ]},
    practice:<NumericQuestion title="שטח" genFn={genTrapRightArea}/>},
  {tab:'היקף',
    explain:<>כדי לחשב היקף צריך את כל ארבע הצלעות, אבל <b>השוק האלכסונית חסרה</b>. נסמן אותה c. מורידים גובה מקצה הבסיס הקצר: נוצר משולש ישר-זווית שהניצבים שלו הם הגובה h וההפרש בין הבסיסים, והיתר שלו הוא c. מוצאים את c בעזרת משפט פיתגורס, ורק אז מחברים את הצלעות.</>,
    formula:<>c² = (b₂−b₁)² + h²</>,
    example:{visual:<TrapRightShape sideLabels={{DA:5,BC:9,CD:3,AB:'c'}} extra={<>
        <Tri pts={[TR_VERTS.A,TR_F,TR_VERTS.B]}/>
        <HelpLine from={TR_VERTS.A} to={TR_F} sq={TR_VERTS.C} label="3" lx={-8} anchor="end"/>
        <Lbl x={201} y={197} color="#0e7490">4</Lbl>
      </>}/>,
      given:<>נתון טרפז ישר-זווית שבסיסיו <bdi>b₁ = 5</bdi> ו-<bdi>b₂ = 9</bdi>, והשוק הניצבת שלו <bdi>h = 3</bdi>. נחשב את ההיקף.</>,
      steps:[
        {text:<>מוצאים את הניצב שעל הבסיס: ההפרש בין הבסיסים.</>, math:<>9 − 5 = 4</>},
        {text:<>מציבים במשפט פיתגורס. השוק האלכסונית c היא היתר.</>, math:<>c² = 4² + 3² = 25</>},
        {text:<>מוציאים שורש.</>, math:<>c = √25 = 5</>},
        {text:<>עכשיו מחברים את ארבע הצלעות.</>, math:<>P = 5 + 9 + 3 + 5 = 22</>},
      ]},
    practice:<NumericQuestion title="היקף (פיתגורס לשוק האלכסונית)" genFn={genTrapRightPerimeter}/>},
  {tab:'בסיס שני',
    explain:<>כשנתונים השטח, השוק הניצבת (הגובה) ובסיס אחד, כותבים את נוסחת השטח <b>כמשוואה</b>: במקום הבסיס החסר שמים סימן שאלה. פותרים אחורה, צעד אחרי צעד: מחלקים בגובה, כופלים ב-2 ומחסרים את הבסיס הידוע.</>,
    formula:F_TRAP,
    example:{visual:<TrapRightShape sideLabels={{DA:5,CD:3,BC:'?'}}/>,
      given:<>נתון טרפז ישר-זווית ששטחו <bdi>S = 21</bdi>, השוק הניצבת שלו <bdi>h = 3</bdi> והבסיס העליון שלו <bdi>b₁ = 5</bdi>. נמצא את הבסיס השני.</>,
      steps:[
        {text:<>כותבים משוואה לפי נוסחת השטח, עם ? במקום הבסיס החסר. (בתרגול מקלידים כך: <bdi>21=(5+?)/2*3</bdi>)</>, math:<>21 = <Frac n="5+?" d="2"/> · 3</>},
        {text:<>מחלקים את שני האגפים בגובה.</>, math:<><Frac n="5+?" d="2"/> = 21 : 3 = 7</>},
        {text:<>כופלים ב-2.</>, math:<>5 + ? = 14</>},
        {text:<>מחסרים את הבסיס הידוע.</>, math:<>? = 14 − 5 = 9</>},
      ]},
    practice:<EquationSideQuestion title="בסיס שני (נתון שטח ושוק ניצבה)" genFn={genTrapRightSide}/>},
];
const TRAP_RIGHT_POSTER={name:'טרפז ישר-זווית', visual:<TrapRightShape/>,
  formulas:[
    {label:'שטח', math:F_TRAP, note:'h הוא השוק הניצבת לבסיסים', wide:true},
    {label:'שוק אלכסונית (פיתגורס)', math:<>c² = (b₂−b₁)² + h²</>, note:'c היא השוק האלכסונית', wide:true},
    {label:'היקף', math:<>P = b₁+b₂+h+c</>, wide:true},
    {label:'שתי הזוויות שאינן ישרות', math:<>α + β = 180°</>, wide:true},
  ],
  facts:['שתי זוויות ישרות (90°)','שוק אחת ניצבת לשני הבסיסים']};
function ChTrapRight(){
  return <div className="content">
    <PropertyExplorer verts={TR_VERTS} order={T_ORDER} diagonals={[]} properties={TRAP_RIGHT_PROPS} alwaysRight={['C','D']}/>
    <SubChapters items={TRAP_RIGHT_SUBS} poster={TRAP_RIGHT_POSTER}/>
  </div>;
}

function Ch5Trapezoid(){
  const [variant,setVariant]=useState('general');
  return <div className="content">
    <div className="sub-tabs">
      <button className={`sub-tab ${variant==='general'?'active':''}`} onClick={()=>setVariant('general')}>כללי</button>
      <button className={`sub-tab ${variant==='iso'?'active':''}`} onClick={()=>setVariant('iso')}>שווה שוקיים</button>
      <button className={`sub-tab ${variant==='right'?'active':''}`} onClick={()=>setVariant('right')}>ישר זווית</button>
    </div>
    {variant==='general'&&<ChTrapGeneral key="g"/>}
    {variant==='iso'&&<ChTrapIso key="i"/>}
    {variant==='right'&&<ChTrapRight key="r"/>}
  </div>;
}

/* ═══════════════════ KITE ═══════════════════ */
const KT_VERTS={T:{x:150,y:40},R:{x:210,y:120},B:{x:150,y:230},L:{x:90,y:120}};
const KT_ORDER=['T','R','B','L'];
function KiteShape({highlight,onPart,angleLabels={},sideLabels={},noDiag=false,extra}){
  return <QuadBase verts={KT_VERTS} order={KT_ORDER} highlight={highlight} onPart={onPart}
    sideLabels={sideLabels} angleLabels={angleLabels}
    ticks={{TR:1,LT:1,RB:2,BL:2}} parallelArrows={{}} rightAngleAt={[]}
    diagonals={noDiag?[]:[['T','B'],['L','R']]} letterOut extra={extra}/>;
}
const KITE_PROPS=[
  {id:'sides',label:'צלעות שוות (סמוכות)',kind:'side',ids:['TR','RB','BL','LT'],mark:'tick',groups:[['TR','LT'],['RB','BL']],def:'יש שני זוגות של צלעות שוות, אך הן סמוכות זו לזו (לא נגדיות כמו במקבילית) — כל זוג מסומן במספר קווים משלו.'},
  {id:'dperpbis',label:'אלכסון ראשי ניצב וחוצה',kind:'diag',ids:['TB','LR'],mark:'kiteDiag',def:'האלכסון הראשי (TB) ניצב לאלכסון השני (שימו לב לסימן הזווית הישרה) וחוצה אותו לשני חלקים שווים (מסומנים בקווים קטנים תואמים).'},
  {id:'angeq',label:'זוג זוויות שוות',kind:'angle',ids:['R','L'],mark:'arc',def:'הזוויות שבין הצלעות הלא-שוות (R ו-L) שוות זו לזו.'},
];
function genKiteArea(){
  let d1=randInt(2,20); if(d1%2!==0 && d1<20) d1++;
  const d2=randInt(2,20);
  return {d1,d2, answer:(d1*d2)/2, formula:F_DIAG, askLabel:'S =',
    given:`אלכסון ראשי d₁ = ${d1}, אלכסון משני d₂ = ${d2}`,
    visual:<KiteShape/>};
}
function genKitePerimeter(){
  let a=randInt(2,20), b=randInt(2,20);
  if(a===b) b = b<20? b+1 : b-1;
  if(a>b) [a,b]=[b,a];
  return {a,b, answer:2*(a+b), formula:'P = 2(a+b)', askLabel:'P =',
    given:`צלע קצרה a = ${a}, צלע ארוכה b = ${b}`,
    visual:<KiteShape sideLabels={{TR:a,LT:a,RB:b,BL:b}}/>};
}
function genKiteSide(){
  let d1=randInt(2,20); if(d1%2!==0 && d1<20) d1++;
  const d2=randInt(2,20); const S=(d1*d2)/2;
  return {d1, answer:d2, formula:F_DIAG, askLabel:'d₂ =',
    given:`שטח S = ${S}, אלכסון d₁ = ${d1}`,
    visual:<KiteShape/>};
}
function genKiteAngle(){
  let a1,a2,a3,a4;
  for(let i=0;i<200;i++){
    a1=pick(ANGLES); a2=pick(ANGLES); a3=pick(ANGLES);
    a4=360-a1-a2-a3;
    if(a4>10&&a4<170) break;
  }
  return {answer:a4,
    given:`שלוש זוויות: ${a1}°, ${a2}°, ${a3}°`,
    formula:'סכום זוויות מרובע = 360°', askLabel:'הזווית הרביעית =',
    visual:<KiteShape noDiag angleLabels={{T:a1+'°',R:a2+'°',B:a3+'°',L:'?'}}/>};
}
function KiteAreaSVG(){
  const {T,R,B,L}=KT_VERTS; const M={x:T.x,y:R.y};
  const pts=(...p)=>p.map(q=>`${q.x},${q.y}`).join(' ');
  return (
    <svg viewBox="0 0 300 270" style={{width:'100%',maxWidth:300,height:'auto',direction:'ltr'}}>
      <polygon points={pts(T,R,L)} fill="#ede9fe" stroke="none"/>
      <polygon points={pts(B,R,L)} fill="#ffedd5" stroke="none"/>
      <polygon points={pts(T,R,B,L)} fill="none" stroke="#334155" strokeWidth={2.5} strokeLinejoin="round"/>
      <line x1={L.x} y1={L.y} x2={R.x} y2={R.y} stroke="#0e7490" strokeWidth={3}/>
      <line x1={T.x} y1={T.y} x2={M.x} y2={M.y} stroke="#7c3aed" strokeWidth={2.5} strokeDasharray="6,4"/>
      <line x1={M.x} y1={M.y} x2={B.x} y2={B.y} stroke="#ea580c" strokeWidth={2.5} strokeDasharray="6,4"/>
      <RightSquareMark v={M} prev={R} next={B} active={false}/>
      <text x={M.x+12} y={(T.y+M.y)/2+6} fontSize="14" fontWeight="700" fill="#7c3aed">h₁</text>
      <text x={M.x+12} y={(M.y+B.y)/2+6} fontSize="14" fontWeight="700" fill="#ea580c">h₂</text>
      <text x={(L.x+M.x)/2} y={M.y+18} textAnchor="middle" fontSize="14" fontWeight="700" fill="#0e7490">d₂</text>
      <text x={T.x} y={T.y-8} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e293b">T</text>
      <text x={R.x+10} y={R.y+4} textAnchor="start" fontSize="12" fontWeight="700" fill="#1e293b">R</text>
      <text x={B.x} y={B.y+18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e293b">B</text>
      <text x={L.x-10} y={L.y+4} textAnchor="end" fontSize="12" fontWeight="700" fill="#1e293b">L</text>
    </svg>
  );
}
function KiteAreaExplain(){
  return <SolvedExample title="מאיפה מגיעה נוסחת השטח של הדלתון?"
    visual={<KiteAreaSVG/>}
    steps={[
      {text:<>האלכסון LR (באורך d₂) מחלק את הדלתון לשני משולשים שווי שוקיים עם <b>בסיס משותף</b> LR: המשולש TLR (כי <bdi>TL = TR</bdi>) והמשולש BLR (כי <bdi>BL = BR</bdi>).</>},
      {text:<>הגובה של כל משולש לבסיס LR מונח על האלכסון הראשי TB, כי TB ניצב ל-LR. לכן שני הגבהים יחד הם האלכסון כולו:</>, math:<>h₁ + h₂ = d₁</>},
      {text:<>מחברים את שטחי שני המשולשים (בסיס כפול גובה חלקי 2):</>, math:<>S = <Frac n="d₂·h₁" d="2"/> + <Frac n="d₂·h₂" d="2"/> = <Frac n="d₂·(h₁+h₂)" d="2"/></>},
      {text:<>מציבים <bdi>h₁ + h₂ = d₁</bdi> ומקבלים את הנוסחה:</>, math:<>S = <Frac n="d₁·d₂" d="2"/></>},
    ]}/>;
}
const KITE_SUBS=[
  {tab:'זווית',
    explain:<>סכום הזוויות בכל מרובע הוא <b>360°</b>, וגם בדלתון. כשנתונות שלוש זוויות, מחברים אותן ומחסרים את הסכום מ-360°.</>,
    formula:<>T + R + B + L = 360°</>,
    example:{visual:<KiteShape noDiag angleLabels={{T:'90°',R:'110°',B:'50°',L:'?'}}/>,
      given:<>נתון דלתון שבו שלוש זוויות: 90°, 110° ו-50°. נמצא את הזווית הרביעית.</>,
      steps:[
        {text:<>מחברים את שלוש הזוויות הנתונות.</>, math:<>90° + 110° + 50° = 250°</>},
        {text:<>מחסרים את הסכום מ-360°.</>, math:<>L = 360° − 250° = 110°</>},
      ]},
    practice:<NumericQuestion title="זווית (הרביעית)" genFn={genKiteAngle}/>},
  {tab:'שטח',
    explain:<>שטח הדלתון הוא <b>מכפלת האלכסונים חלקי 2</b>. למטה מוסבר מאיפה הנוסחה מגיעה.</>,
    formula:F_DIAG,
    more:<KiteAreaExplain/>,
    example:{visual:<KiteShape extra={<>
        <HelpLine from={KT_VERTS.T} to={KT_VERTS.B} label="10" ly={-40}/>
        <HelpLine from={KT_VERTS.L} to={KT_VERTS.R} label="6" color="#0e7490" lx={-28} ly={-7} anchor="middle"/>
      </>}/>,
      given:<>נתון דלתון שהאלכסון הראשי שלו <bdi>d₁ = 10</bdi> והאלכסון המשני <bdi>d₂ = 6</bdi>. נחשב את השטח.</>,
      steps:[
        {text:<>כופלים את שני האלכסונים.</>, math:<>d₁·d₂ = 10 · 6 = 60</>},
        {text:<>מחלקים ב-2.</>, math:<>S = <Frac n="60" d="2"/> = 30</>},
      ]},
    practice:<NumericQuestion title="שטח" genFn={genKiteArea}/>},
  {tab:'היקף',
    explain:<>בדלתון יש <b>שני זוגות של צלעות סמוכות שוות</b>: שתי צלעות קצרות (a) ושתי צלעות ארוכות (b). מחברים צלע קצרה וצלע ארוכה, ואת הסכום כופלים ב-2.</>,
    formula:<>P = 2(a+b)</>,
    example:{visual:<KiteShape noDiag sideLabels={{TR:5,LT:5,RB:8,BL:8}}/>,
      given:<>נתון דלתון שהצלע הקצרה שלו <bdi>a = 5</bdi> והצלע הארוכה <bdi>b = 8</bdi>. נחשב את ההיקף.</>,
      steps:[
        {text:<>מחברים צלע קצרה וצלע ארוכה.</>, math:<>5 + 8 = 13</>},
        {text:<>כופלים ב-2, כי כל צלע מופיעה פעמיים.</>, math:<>P = 2 · 13 = 26</>},
      ]},
    practice:<NumericQuestion title="היקף" genFn={genKitePerimeter}/>},
  {tab:'אלכסון שני',
    explain:<>כשנתונים השטח ואלכסון אחד, מציבים אותם בנוסחת השטח ופותרים אחורה: <b>כופלים את השטח ב-2 ומחלקים באלכסון הידוע</b>.</>,
    formula:F_DIAG,
    example:{visual:<KiteShape extra={<>
        <HelpLine from={KT_VERTS.T} to={KT_VERTS.B} label="10" ly={-40}/>
        <HelpLine from={KT_VERTS.L} to={KT_VERTS.R} label="?" color="#0e7490" lx={-28} ly={-7} anchor="middle"/>
      </>}/>,
      given:<>נתון דלתון ששטחו <bdi>S = 30</bdi> והאלכסון הראשי שלו <bdi>d₁ = 10</bdi>. נמצא את האלכסון השני.</>,
      steps:[
        {text:<>מציבים בנוסחת השטח.</>, math:<>30 = <Frac n="10·d₂" d="2"/></>},
        {text:<>כופלים את שני האגפים ב-2.</>, math:<>60 = 10·d₂</>},
        {text:<>מחלקים באלכסון הידוע.</>, math:<>d₂ = 60 : 10 = 6</>},
      ]},
    practice:<NumericQuestion title="אלכסון שני (נתון שטח ואלכסון אחד)" genFn={genKiteSide}/>},
];
const KITE_POSTER={name:'דלתון', visual:<KiteShape/>,
  formulas:[
    {label:'שטח', math:F_DIAG},
    {label:'היקף', math:<>P = 2(a+b)</>},
    {label:'אלכסון מתוך השטח', math:<>d₂ = <Frac n="2·S" d="d₁"/></>},
    {label:'סכום הזוויות', math:<>360°</>},
  ],
  facts:['שני זוגות של צלעות סמוכות שוות','האלכסון הראשי ניצב לאלכסון המשני וחוצה אותו','הזוויות שבין הצלעות הלא-שוות שוות זו לזו']};
function Ch6Kite(){
  return <div className="content">
    <PropertyExplorer verts={KT_VERTS} order={KT_ORDER} diagonals={[['T','B'],['L','R']]} properties={KITE_PROPS} letterOut/>
    <SubChapters items={KITE_SUBS} poster={KITE_POSTER}/>
  </div>;
}

/* ═══════════════════ App root ═══════════════════ */
function App(){
  const [ch,setCh]=useState(1);
  const labels=['ריבוע','מלבן','מעוין','מקבילית','טרפז','דלתון'];
  return (
    <div>
      <div className="hdr">
        <div className="hdr-title">📐 מרובעים — כיתות ז׳-ח׳</div>
        <div className="ch-btns">
          {labels.map((l,i)=><button key={i} className={`ch-btn ${ch===i+1?'active':''}`} onClick={()=>setCh(i+1)}>{i+1}. {l}</button>)}
        </div>
      </div>
      {ch===1?<Ch1Square key="c1"/>
        :ch===2?<Ch2Rectangle key="c2"/>
        :ch===3?<Ch3Rhombus key="c3"/>
        :ch===4?<Ch4Parallelogram key="c4"/>
        :ch===5?<Ch5Trapezoid key="c5"/>
        :<Ch6Kite key="c6"/>}
    </div>
  );
}


// ===== END ORIGINAL =====
export default App;
