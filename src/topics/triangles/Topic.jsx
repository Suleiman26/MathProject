'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/triangles.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const {useState,useEffect,useCallback,useRef,useMemo}=React;

/* ═══ Utilities ═══ */
const randInt=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const gcd=(a,b)=>b?gcd(b,a%b):a;
const deg2rad=d=>d*Math.PI/180;
const dist=(a,b)=>Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);

function Frac({n,d,style}){
  return<span className="frac" style={style}><span className="frac-num">{n}</span><span className="frac-den">{d}</span></span>;
}

function Fb({fb}){
  if(!fb)return null;
  return fb==='ok'?<div className="fb ok">✓ נכון!</div>:<div className="fb err">✗ לא נכון, נסה שוב.</div>;
}

/* ═══ Free-text linear-equation check (parses "ax+b" style expressions) ═══ */
function parseLinearExpr(str){
  let s=String(str).replace(/\s+/g,'').replace(/[()]/g,'');
  if(s==='')return null;
  if(s[0]!=='+'&&s[0]!=='-')s='+'+s;
  const tokens=s.match(/[+-][^+-]+/g);
  if(!tokens)return null;
  let coeff=0,c=0;
  for(const tok of tokens){
    const sign=tok[0]==='-'?-1:1;
    const body=tok.slice(1);
    if(body==='')return null;
    if(body.includes('x')){
      const numPart=body.replace('x','');
      const val=numPart===''?1:parseFloat(numPart);
      if(isNaN(val))return null;
      coeff+=sign*val;
    } else {
      const val=parseFloat(body);
      if(isNaN(val))return null;
      c+=sign*val;
    }
  }
  return{coeff,c};
}
function checkLinearEquation(text,targetL,targetR){
  const raw=String(text).trim();
  if((raw.match(/=/g)||[]).length!==1)return false;
  const[lhsStr,rhsStr]=raw.split('=');
  const L=parseLinearExpr(lhsStr),R=parseLinearExpr(rhsStr);
  if(!L||!R)return false;
  const dCoeff=L.coeff-R.coeff,dC=L.c-R.c;
  const tCoeff=targetL.coeff-targetR.coeff,tC=targetL.c-targetR.c;
  return Math.abs(dCoeff-tCoeff)<1e-9&&Math.abs(dC-tC)<1e-9;
}

/* ═══ Equation solving (operation-box method, ported from ratio-percent.html) ═══ */
let _slvUid=0;const slvUid=()=>`sv${++_slvUid}`;
function slvSimpFrac(num,den){if(num===0)return[0,1];if(den<0){num=-num;den=-den;}const g=gcd(Math.abs(num),den)||1;return[num/g,den/g];}
function slvMkTerm(type,num,den=1){const[n,d]=slvSimpFrac(num,den);return{id:slvUid(),type,num:n,den:d};}
function slvDoOperate(eq,opType,k,isX){
  const type=isX?'x':'const';
  function applySide(terms){
    if(opType==='+')return[...terms,slvMkTerm(type,k)];
    if(opType==='−')return[...terms,slvMkTerm(type,-k)];
    if(opType==='×')return terms.map(t=>slvMkTerm(t.type,t.num*k,t.den));
    if(opType==='÷')return terms.map(t=>{const[n,d]=slvSimpFrac(t.num,t.den*Math.abs(k));return slvMkTerm(t.type,k<0?-n:n,d);});
    return terms;
  }
  return{left:applySide(eq.left),right:applySide(eq.right)};
}
function slvDoSimplify(terms){
  let xn=0,xd=1,cn=0,cd=1;
  for(const t of terms){
    if(t.type==='x'){const[n,d]=slvSimpFrac(xn*t.den+t.num*xd,xd*t.den);xn=n;xd=d;}
    else{const[n,d]=slvSimpFrac(cn*t.den+t.num*cd,cd*t.den);cn=n;cd=d;}
  }
  const r=[];
  if(xn!==0)r.push(slvMkTerm('x',xn,xd));
  if(cn!==0)r.push(slvMkTerm('const',cn,cd));
  return r.length?r:[slvMkTerm('const',0)];
}
function slvCanSimp(terms){return terms.filter(t=>t.type==='x').length>1||terms.filter(t=>t.type==='const').length>1;}
function slvCheckSolved(eq){
  const isX1=t=>t.type==='x'&&t.num===1&&t.den===1;
  const isC=t=>t.type==='const'&&t.den===1;
  if(eq.left.length===1&&isX1(eq.left[0])&&eq.right.length===1&&isC(eq.right[0]))return eq.right[0].num;
  if(eq.right.length===1&&isX1(eq.right[0])&&eq.left.length===1&&isC(eq.left[0]))return eq.left[0].num;
  return null;
}
function SlvTermPill({term,index,xLabel='x'}){
  const{type,num,den}=term;
  const isNeg=num<0;const abs=Math.abs(num);
  const body=()=>{
    if(type==='const'){
      if(den===1)return<span className="slv-tv">{abs}</span>;
      return<Frac n={abs} d={den} style={{fontSize:16,fontWeight:700,margin:'0 2px'}}/>;
    }
    const showC=!(abs===den);
    return<>{showC&&(den===1?<span className="slv-tv">{abs}</span>:<Frac n={abs} d={den} style={{fontSize:16,fontWeight:700,margin:'0 2px'}}/>)}<span className="slv-tv-x">{xLabel}</span></>;
  };
  return<span className="slv-tp">{index>0&&<span className="slv-ts">{isNeg?'−':'+'}</span>}{index===0&&isNeg&&<span className="slv-ts">−</span>}{body()}</span>;
}
const SLV_OPS=['+','−','×','÷'];
function SlvOpBox({opType,opVal,opIsX,onOpType,onOpVal,onToggleX}){
  const allowX=opType==='+'||opType==='−';
  return<div className="slv-opbox">
    <div className="slv-opbtns">{SLV_OPS.map(op=><button key={op} className={`slv-opbtn ${opType===op?'active':''}`} onClick={()=>onOpType(op)}>{op}</button>)}</div>
    <input className="slv-opinput" value={opVal} onChange={e=>onOpVal(e.target.value)} placeholder="מס׳" inputMode="numeric"/>
    {allowX&&<button className={`slv-opxbtn ${opIsX?'active':''}`} onClick={onToggleX} title="הוספה/חיסור של כפולת x">x</button>}
  </div>;
}

/* ═══ SVG Helpers ═══ */
function arcPath(cx,cy,r,startDeg,endDeg){
  const s=deg2rad(startDeg),e=deg2rad(endDeg);
  const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s);
  const x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e);
  const large=(endDeg-startDeg)>180?1:0;
  return `M${x1},${y1}A${r},${r} 0 ${large} 1 ${x2},${y2}`;
}

/* A label centered on a fixed point (textAnchor="middle") always has half its width
   reaching back toward the vertex/edge — fine for a single digit, but wider labels then
   overlap the arc or the triangle's side. Fix: anchor the text on the edge closest to the
   vertex/line, so the whole label grows outward regardless of its width (same technique as
   angles-parallel.html's labelAnchorFor, adapted to this file's un-flipped y-down radians). */
function labelAnchorFor(rad){
  const c=Math.cos(rad), s=Math.sin(rad);
  const anchor=c>0.35?'start':c<-0.35?'end':'middle';
  const baseline=s>0.35?'hanging':s<-0.35?'auto':'middle';
  return{anchor,baseline};
}

function angleArcAtVertex(vx,vy,p1,p2,radius,labelOffset=14,centroid){
  const a1=Math.atan2(p1.y-vy,p1.x-vx);
  const a2=Math.atan2(p2.y-vy,p2.x-vx);
  let start=a1,end=a2;
  let diff=(end-start+2*Math.PI)%(2*Math.PI);
  if(diff>Math.PI){const t=start;start=end;end=t;diff=2*Math.PI-diff;}
  const sx=vx+radius*Math.cos(start),sy=vy+radius*Math.sin(start);
  const ex=vx+radius*Math.cos(end),ey=vy+radius*Math.sin(end);
  const large=diff>Math.PI?1:0;
  const midRad=start+diff/2;
  // For the label's grow-direction, use the vertex's own position relative to
  // the triangle's centroid rather than the arc's bisector. In a symmetric
  // (isosceles/equilateral) triangle, the two base vertices' bisectors both
  // point toward the incenter — i.e. toward EACH OTHER — so growing the
  // label along the bisector grows it straight into the other vertex's
  // label. Growing away from the centroid instead always fans labels
  // outward regardless of shape. Falls back to the bisector when no
  // centroid is given (e.g. an exterior-angle arc has no sibling vertex to
  // avoid, so the original technique is fine there).
  const dirRad=centroid?Math.atan2(vy-centroid.y,vx-centroid.x):midRad;
  const{anchor,baseline}=labelAnchorFor(dirRad);
  return{path:`M${sx},${sy}A${radius},${radius} 0 ${large} 1 ${ex},${ey}`,
    midRad,anchor,baseline,
    midX:vx+(radius+labelOffset)*Math.cos(midRad),midY:vy+(radius+labelOffset)*Math.sin(midRad)};
}

function midPt(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};}

// offset the label outward from the a-b edge; if a centroid is given, the normal direction
// is flipped as needed so the label always points away from the triangle's interior,
// regardless of which winding order this particular edge happens to be listed in
function sideLabel(a,b,offset,centroid){
  const m=midPt(a,b);
  const dx=b.x-a.x,dy=b.y-a.y;
  const len=Math.sqrt(dx*dx+dy*dy)||1;
  let nx=-dy/len,ny=dx/len;
  if(centroid){
    const tx=centroid.x-m.x, ty=centroid.y-m.y;
    if(nx*tx+ny*ty>0){nx=-nx;ny=-ny;}
  }
  const abs=Math.abs(offset);
  const px=nx*abs, py=ny*abs;
  const{anchor,baseline}=labelAnchorFor(Math.atan2(py,px));
  return{x:m.x+px,y:m.y+py,anchor,baseline};
}

function tickMarks(a,b,count){
  const m=midPt(a,b);
  const dx=b.x-a.x,dy=b.y-a.y;
  const len=Math.sqrt(dx*dx+dy*dy);
  const nx=-dy/len,ny=dx/len;
  const marks=[];
  const gap=5;
  const startOff=-(count-1)*gap/2;
  for(let i=0;i<count;i++){
    const off=startOff+i*gap;
    const cx=m.x+(dx/len)*off,cy=m.y+(dy/len)*off;
    marks.push({x1:cx+nx*5,y1:cy+ny*5,x2:cx-nx*5,y2:cy-ny*5});
  }
  return marks;
}

function rightAngleMark(vertex,p1,p2,size){
  const d1x=p1.x-vertex.x,d1y=p1.y-vertex.y;
  const d2x=p2.x-vertex.x,d2y=p2.y-vertex.y;
  const l1=Math.sqrt(d1x*d1x+d1y*d1y);
  const l2=Math.sqrt(d2x*d2x+d2y*d2y);
  const u1={x:d1x/l1*size,y:d1y/l1*size};
  const u2={x:d2x/l2*size,y:d2y/l2*size};
  const a={x:vertex.x+u1.x,y:vertex.y+u1.y};
  const b={x:vertex.x+u1.x+u2.x,y:vertex.y+u1.y+u2.y};
  const c={x:vertex.x+u2.x,y:vertex.y+u2.y};
  return `M${a.x},${a.y}L${b.x},${b.y}L${c.x},${c.y}`;
}

/* ═══ Triangle SVG Component ═══ */
function TriSVG({verts,labels=['A','B','C'],angleVals,sideVals,equalSides,equalAngles,
  rightAt,showExterior,extAngleVal,highlight,heightLine,onClick,W=340,H=280}){
  const [A,B,C]=verts;
  const sides=[[A,B],[B,C],[A,C]];
  const angleVerts=[[A,B,C],[B,C,A],[C,A,B]]; // vertex, then two other points
  const centroid={x:(A.x+B.x+C.x)/3,y:(A.y+B.y+C.y)/3};
  // all the arc radii / label offsets / font sizes below were tuned for the
  // default 340×280 canvas; a smaller canvas (e.g. a compact side-by-side
  // example) needs everything scaled down proportionally, or fixed-pixel
  // offsets overshoot past the incenter and labels converge/collide near
  // the centroid — scl=1 exactly at the default size, so nothing here
  // changes for any existing (default-sized) caller
  const scl=Math.min(1,Math.min(W,H)/280);
  const fs=(px,floor=7)=>Math.max(floor,px*scl);
  // A fixed pixel radius+offset (tuned for a "normal" triangle) can overshoot
  // past the incenter on a flat/obtuse triangle — e.g. a wide, short apex
  // angle sits close to the incenter even though its own angular cone is
  // wide — pushing that vertex's label into the next vertex's territory.
  // Cap each vertex's reach to a safe fraction of its own distance to the
  // incenter so this can't happen regardless of shape.
  const lenBC=dist(B,C),lenAC=dist(A,C),lenAB=dist(A,B);
  const peri=lenBC+lenAC+lenAB;
  const incenter=peri>0?{x:(lenBC*A.x+lenAC*B.x+lenAB*C.x)/peri,y:(lenBC*A.y+lenAC*B.y+lenAB*C.y)/peri}:centroid;
  const reachToIncenter=[A,B,C].map(v=>dist(v,incenter));
  // The default-sized (340×280) diagram is the single main exercise figure,
  // so let it fill up to a generous width on wide screens instead of sitting
  // at a tiny fixed 340px inside a much wider card — a custom smaller W/H
  // (compact side-by-side example thumbnails) keeps its exact old fixed-px
  // sizing untouched.
  const isDefaultCanvas=W===340&&H===280;
  const svgStyle=isDefaultCanvas
    ?{width:'100%',maxWidth:640,height:'auto',display:'block',direction:'ltr'}
    :{width:Math.min(W,340),height:'auto',direction:'ltr'};
  return <svg viewBox={`0 0 ${W} ${H}`} style={svgStyle}>
    {/* Triangle edges */}
    <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="rgba(37,99,235,0.05)" stroke="#2563eb" strokeWidth="2.5"/>

    {/* Side labels */}
    {sideVals&&sideVals.map((v,i)=>{
      if(v==null)return null;
      const pos=sideLabel(sides[i][0],sides[i][1],18*scl,centroid);
      return <text key={'s'+i} x={pos.x} y={pos.y} textAnchor={pos.anchor} dominantBaseline={pos.baseline}
        fontSize={fs(13)} fontWeight="600" fill={highlight===('s'+i)?'#dc2626':'#334155'}
        style={{cursor:onClick?'pointer':'default'}}
        onClick={()=>onClick&&onClick('s'+i)}>{v}</text>;
    })}

    {/* Equality tick marks on sides */}
    {equalSides&&equalSides.map((count,i)=>{
      if(!count)return null;
      return tickMarks(sides[i][0],sides[i][1],count).map((t,j)=>
        <line key={'t'+i+j} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#2563eb" strokeWidth="2"/>);
    })}

    {/* Angle arcs */}
    {angleVals&&angleVals.map((v,i)=>{
      if(v==null)return null;
      const [vert,p1,p2]=angleVerts[i];
      const isRight=rightAt===i;
      if(isRight){
        return <path key={'ra'+i} d={rightAngleMark(vert,p1,p2,14*scl)} fill="none" stroke="#7c3aed" strokeWidth="1.5"/>;
      }
      // longer labels (algebraic expressions like "(3x+21)°") need a smaller
      // font and a bit more offset from the vertex, or they collide with a
      // neighboring vertex's label when the two vertices sit close together
      const vLen=String(v).length;
      const lblFontSize=fs(vLen>6?9:vLen>4?10.5:12);
      // when this vertex ALSO carries an equal-angle double-arc mark (below),
      // its own arc stroke would sit right under/through this value's arc at
      // nearly the same radius — especially once the incenter-reach cap
      // shrinks both toward the vertex on a compact (e.g. near-equilateral)
      // triangle. Skip the redundant overlapping arc stroke here and start
      // this label's radius OUTSIDE the equal-marks' own outer arc instead,
      // so the number is never drawn on top of an arc line.
      const eqCount=(equalAngles&&equalAngles[i])||0;
      const eqOuterR=eqCount?(18+(eqCount-1)*5)*scl:0;
      const arcFloor=eqCount?eqOuterR+6*scl:10*scl;
      let arcR=eqCount?eqOuterR+6*scl:22*scl, lblOffset=(vLen>6?22:vLen>4?19:17)*scl;
      const maxReach=reachToIncenter[i]*0.6;
      if(arcR+lblOffset>maxReach&&arcR+lblOffset>0){
        // A label's rendered text size doesn't shrink with the cap the way a
        // stroke does, so squeezing arcR and lblOffset by the same factor
        // (the old approach) starves the label's clearance exactly when a
        // tight vertex needs it most — the number ends up smaller-offset but
        // still wide enough to bleed back onto the arc. Shrink the arc's own
        // radius toward its floor FIRST instead, and only give up some of
        // the label's offset as a last resort if that alone isn't enough.
        const overflow=(arcR+lblOffset)-maxReach;
        const arcShrink=Math.min(Math.max(0,arcR-arcFloor),overflow);
        arcR-=arcShrink;
        const remainingOverflow=overflow-arcShrink;
        if(remainingOverflow>0){
          const capFactor=maxReach/(arcR+lblOffset);
          arcR*=capFactor;lblOffset*=capFactor;
        }
      }
      const arc=angleArcAtVertex(vert.x,vert.y,p1,p2,arcR,lblOffset,centroid);
      return <g key={'a'+i}>
        {!eqCount&&<path d={arc.path} fill="none" stroke={highlight===('a'+i)?'#dc2626':'#7c3aed'} strokeWidth="1.8"
          style={{cursor:onClick?'pointer':'default'}} onClick={()=>onClick&&onClick('a'+i)}/>}
        <text x={arc.midX} y={arc.midY} textAnchor={arc.anchor} dominantBaseline={arc.baseline}
          fontSize={lblFontSize} fontWeight="700" fill={highlight===('a'+i)?'#dc2626':'#7c3aed'}
          style={{cursor:onClick?'pointer':'default'}} onClick={()=>onClick&&onClick('a'+i)}>
          {v}</text>
      </g>;
    })}

    {/* Equal angle marks (double arcs) */}
    {equalAngles&&equalAngles.map((count,i)=>{
      if(!count)return null;
      const [vert,p1,p2]=angleVerts[i];
      const arcs=[];
      for(let k=0;k<count;k++){
        const arc=angleArcAtVertex(vert.x,vert.y,p1,p2,(18+k*5)*scl);
        arcs.push(<path key={'ea'+i+k} d={arc.path} fill="none" stroke="#7c3aed" strokeWidth="1.2"/>);
      }
      return <g key={'eag'+i}>{arcs}</g>;
    })}

    {/* Right angle mark */}
    {rightAt!=null&&!angleVals&&<path d={rightAngleMark(verts[rightAt],
      verts[(rightAt+1)%3],verts[(rightAt+2)%3],14*scl)} fill="none" stroke="#7c3aed" strokeWidth="1.5"/>}

    {/* Height line */}
    {heightLine&&<>
      <line x1={heightLine.from.x} y1={heightLine.from.y} x2={heightLine.to.x} y2={heightLine.to.y}
        stroke="#dc2626" strokeWidth="1.5" strokeDasharray="5,3"/>
      <path d={rightAngleMark(heightLine.to,heightLine.from,
        {x:heightLine.to.x+(heightLine.to.x>heightLine.from.x?15:-15),y:heightLine.to.y},10*scl)}
        fill="none" stroke="#dc2626" strokeWidth="1"/>
    </>}

    {/* Exterior angle */}
    {showExterior&&(()=>{
      const idx=showExterior.vertex;
      const v=verts[idx];
      const prev=verts[(idx+2)%3];
      const dx=v.x-prev.x,dy=v.y-prev.y;
      const mag=Math.sqrt(dx*dx+dy*dy);
      const ext={x:v.x+dx/mag*50,y:v.y+dy/mag*50};
      const other=verts[(idx+1)%3];
      const arc=angleArcAtVertex(v.x,v.y,ext,other,26*scl);
      return <g>
        <line x1={v.x} y1={v.y} x2={ext.x} y2={ext.y} stroke="#dc2626" strokeWidth="2" strokeDasharray="5,3"/>
        <path d={arc.path} fill="none" stroke="#dc2626" strokeWidth="2"/>
        <text x={arc.midX} y={arc.midY} textAnchor={arc.anchor} dominantBaseline={arc.baseline}
          fontSize={fs(13)} fontWeight="700" fill="#dc2626">{extAngleVal||'?'}</text>
      </g>;
    })()}

    {/* Vertex labels */}
    {labels&&labels.map((l,i)=>{
      const v=verts[i];
      const cx=(A.x+B.x+C.x)/3,cy=(A.y+B.y+C.y)/3;
      const dx=v.x-cx,dy=v.y-cy;
      const m=Math.sqrt(dx*dx+dy*dy);
      const ox=dx/m*18*scl,oy=dy/m*18*scl;
      return <text key={'l'+i} x={v.x+ox} y={v.y+oy} textAnchor="middle" dominantBaseline="middle"
        fontSize={fs(14,9)} fontWeight="700" fill="#1e3a5f">{l}</text>;
    })}
  </svg>;
}

/* ═══ Vertex computation from angles ═══ */
// Places B,C on a horizontal base and finds A directly from angle B and side
// AB (via the law of sines) — no ray-intersection needed, since a triangle is
// fully determined by its three angles up to scale. (The previous version
// solved for A as the intersection of two rays whose direction formulas had
// their signs wrong, which for most non-symmetric angle triples placed A
// enormously far from the base — the subsequent fit-to-box scaling then
// crushed the whole triangle down to a sliver. Isosceles/equilateral cases
// looked fine only because they happened to hit that function's degenerate
// det≈0 fallback, which masked the bug elsewhere in the file.)
function vertsFromAngles(angles,W=340,H=280){
  const [aA,aB,aC]=angles.map(deg2rad);
  const base=200;
  const B={x:0,y:0}, C={x:base,y:0};
  const AB=base*Math.sin(aC)/Math.sin(aA);
  const A={x:AB*Math.cos(aB),y:-AB*Math.sin(aB)};
  const pts=[A,B,C];
  const minX=Math.min(...pts.map(p=>p.x)), maxX=Math.max(...pts.map(p=>p.x));
  const minY=Math.min(...pts.map(p=>p.y)), maxY=Math.max(...pts.map(p=>p.y));
  const scaleX=(W-80)/(maxX-minX||1);
  const scaleY=(H-80)/(maxY-minY||1);
  const sc=Math.min(scaleX,scaleY,3);
  return pts.map(p=>({x:(p.x-minX)*sc+40,y:(p.y-minY)*sc+40}));
}

// Three small side-by-side reference triangles (acute/right/obtuse), shown
// before the student is asked to classify one themselves
function TriTypeExample(){
  const types=[
    {angles:[60,60,60],label:'חד זווית',rightAt:null},
    {angles:[90,45,45],label:'ישר זווית',rightAt:0},
    {angles:[100,50,30],label:'קהה זווית',rightAt:null},
  ];
  const W=210,H=180;
  return <div style={{display:'flex',justifyContent:'center',gap:10,flexWrap:'wrap',margin:'8px 0'}}>
    {types.map((t,i)=>{
      const verts=vertsFromAngles(t.angles,W,H);
      return <div key={i} style={{textAlign:'center'}}>
        <TriSVG verts={verts} angleVals={t.angles.map(a=>a+'°')} rightAt={t.rightAt} W={W} H={H}/>
        <div style={{fontSize:12,fontWeight:700,color:'#0369a1'}}>{t.label}</div>
      </div>;
    })}
  </div>;
}

function vertsFromSidesAndBase(sideA,sideB,base,W=340,H=280){
  // Place base horizontally, compute apex
  const bx1=W/2-base*4, by=H-50;
  const bx2=W/2+base*4;
  // cos rule: angle at B between sides c(=base) and a
  // Actually let's place it simply
  const sc=Math.min(160/base,30);
  const B={x:W/2-base*sc/2,y:H-50};
  const C={x:W/2+base*sc/2,y:H-50};
  // A is at distance sideB from B and sideA from C
  // cos(B) = (c^2 + a_side^2 - b_side^2) / (2*c*a_side) ...
  // let's use: AB=sideB (side c?), actually let me define:
  // sides: a=BC, b=AC, c=AB. But simpler: just use coordinates
  // Place B at left, C at right, base = BC
  // AB = sideB, AC = sideA
  const cosB=(base*base+sideB*sideB-sideA*sideA)/(2*base*sideB);
  const sinB=Math.sqrt(Math.max(0,1-cosB*cosB));
  const A={x:B.x+sideB*sc*cosB,y:B.y-sideB*sc*sinB};
  return [A,B,C];
}

/* ═══ Chapter 1: Sum of Angles ═══ */
// One theme only: find an angle via the sum-to-180 rule, always by writing
// an equation (marking the unknown as x) and solving it. Two variants:
// 'numeric' — two given numeric angles, third is x; 'algebra' — all three
// angles given as expressions in x, solve for x, then substitute to find
// the one asked-about angle. The first exercise on mount is always forced
// to 'numeric' by the caller; later resets vary between both.
// every angle in [40,90] AND no more than 40° apart from each other — wide
// enough for real variety, but never so imbalanced that the triangle comes
// out tall-and-narrow at the base (which crowds the two base-angle labels
// into each other, especially the longer algebraic-expression ones)
function wellBalanced(angles){
  return angles.every(a=>a>=40&&a<=90)&&(Math.max(...angles)-Math.min(...angles))<=40;
}
function genCh1(forceType){
  const type=forceType||pick(['numeric','algebra']);
  if(type==='numeric'){
    let a,b,c;
    for(let tries=0;tries<300;tries++){
      a=randInt(40,90);b=randInt(40,90);c=180-a-b;
      if(wellBalanced([a,b,c]))break;
    }
    if(!wellBalanced([a,b,c])){a=60;b=65;c=55;}
    const hidden=randInt(0,2);
    return{type,angles:[a,b,c],hidden};
  }
  // algebra: all three angles are expressions in x, summing to exactly 180
  for(let iter=0;iter<300;iter++){
    const x=randInt(5,20);
    const a1=randInt(1,3),b1=randInt(-15,25);
    const a2=randInt(1,3),b2=randInt(-15,25);
    const a3=randInt(1,3);
    const v1=a1*x+b1,v2=a2*x+b2;
    const b3=180-v1-v2-a3*x;
    const v3=a3*x+b3;
    if(wellBalanced([v1,v2,v3])){
      const askIdx=randInt(0,2);
      return{type,x,exprs:[{a:a1,b:b1},{a:a2,b:b2},{a:a3,b:b3}],angles:[v1,v2,v3],askIdx};
    }
  }
  return{type,x:10,exprs:[{a:2,b:30},{a:1,b:50},{a:1,b:60}],angles:[50,60,70],askIdx:0};
}

function fmtExpr(e){
  if(e.a===1) return e.b>0?`x+${e.b}`:e.b<0?`x${e.b}`:'x';
  return e.b>0?`${e.a}x+${e.b}`:e.b<0?`${e.a}x${e.b}`:`${e.a}x`;
}

function ch1BuildEq(ex){
  if(ex.type==='numeric'){
    const known=ex.angles.filter((_,i)=>i!==ex.hidden);
    return{left:[slvMkTerm('const',known[0]),slvMkTerm('const',known[1]),slvMkTerm('x',1)],right:[slvMkTerm('const',180)]};
  }
  const left=[];
  ex.exprs.forEach(e=>{left.push(slvMkTerm('x',e.a));if(e.b!==0)left.push(slvMkTerm('const',e.b));});
  return{left,right:[slvMkTerm('const',180)]};
}

function Ch1(){
  const [ex,setEx]=useState(()=>genCh1('numeric'));
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [a1,setA1]=useState('');
  const [showInfo,setShowInfo]=useState(true);
  const [eqText,setEqText]=useState('');

  // step 2 (both variants): solve the written equation via operation boxes
  const [cur,setCur]=useState(null);
  const [opType,setOpType]=useState('+');
  const [opVal,setOpVal]=useState('');
  const [opIsX,setOpIsX]=useState(false);
  const [opErr,setOpErr]=useState('');

  const solved=useMemo(()=>cur?slvCheckSolved(cur):null,[cur]);
  const canSimpAny=cur?(slvCanSimp(cur.left)||slvCanSimp(cur.right)):false;

  const reset=()=>{
    setEx(genCh1());setFb(null);setPhase(0);setA1('');setEqText('');
    setCur(null);setOpVal('');setOpErr('');setOpType('+');setOpIsX(false);
  };

  const totalSteps=ex.type==='numeric'?2:3;
  const allDone=phase>=totalSteps;

  const check1=()=>{
    const target=ex.type==='numeric'
      ?{L:{coeff:1,c:ex.angles[(ex.hidden+1)%3]+ex.angles[(ex.hidden+2)%3]},R:{coeff:0,c:180}}
      :{L:{coeff:ex.exprs.reduce((s,e)=>s+e.a,0),c:ex.exprs.reduce((s,e)=>s+e.b,0)},R:{coeff:0,c:180}};
    const ok=checkLinearEquation(eqText,target.L,target.R);
    if(ok){
      setFb('ok');
      setTimeout(()=>{setCur(ch1BuildEq(ex));setPhase(1);setFb(null);},600);
    } else setFb('err');
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
    setCur(c=>slvDoOperate(c,opType,k,isX));
    setOpVal('');setOpErr('');setOpIsX(false);
  };
  const handleSimplify=()=>{
    setCur(c=>({left:slvCanSimp(c.left)?slvDoSimplify(c.left):c.left,right:slvCanSimp(c.right)?slvDoSimplify(c.right):c.right}));
  };
  const finishSolve=()=>{setPhase(2);setA1('');setFb(null);};
  const checkSubstitute=()=>{
    if(parseInt(a1)===ex.angles[ex.askIdx]){setFb('ok');setTimeout(()=>{setPhase(3);setFb(null);},600);}
    else setFb('err');
  };

  const xAnswer=ex.type==='numeric'?ex.angles[ex.hidden]:ex.x;
  const verts=vertsFromAngles(ex.angles);
  const angleLabels=ex.type==='numeric'
    ?ex.angles.map((a,i)=>i===ex.hidden?(phase>=2?a+'°':'x'):a+'°')
    :ex.angles.map((a,i)=>phase>=3?a+'°':`(${fmtExpr(ex.exprs[i])})°`);

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>📐 סכום זוויות משולש</h3>
      <p>סכום הזוויות במשולש הוא תמיד 180°.</p>
      <p>מסמנים את הזווית הלא-ידועה ב-x, כותבים משוואה, ופותרים אותה.</p>
      <div className="formula-box">α + β + γ = 180°</div>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="card">
      <div className="card-t">מציאת זווית חסרה</div>
      <div className="graph-wrap">
        <TriSVG verts={verts} angleVals={angleLabels}/>
      </div>

      <div className={`step-card ${phase>0?'done':''}`}>
        <div className="step-label">שלב 1 — כתוב משוואה מתאימה למציאת x</div>
        {phase===0?<>
          <div className="ans-row">
            <input value={eqText} onChange={e=>{setEqText(e.target.value);setFb(null);}} style={{width:220,direction:'ltr'}}
              onKeyDown={e=>e.key==='Enter'&&check1()}/>
          </div>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ המשוואה נכתבה</div>}
      </div>

      {phase>=1&&<div className={`step-card ${phase>1?'done':''}`}>
        <div className="step-label">שלב 2 — פתרו את המשוואה כדי למצוא את x</div>
        {phase===1?<>
          <div className="slv-grid">
            {solved===null&&<>
              <div className="slv-left"><SlvOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
              <div></div>
              <div className="slv-right"><SlvOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
            </>}
            <div className="slv-left slv-zone">{cur.left.map((t,i)=><SlvTermPill key={t.id} term={t} index={i}/>)}</div>
            <span className="slv-eqsign">=</span>
            <div className="slv-right slv-zone">{cur.right.map((t,i)=><SlvTermPill key={t.id} term={t} index={i}/>)}</div>
          </div>
          {opErr&&<div className="fb err">{opErr}</div>}
          {solved===null?
            <div className="center" style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button className="btn bg" onClick={applyOp}>✓ אישור</button>
              <button className="btn" style={{background:'#e5e7eb',color:'#374151'}} disabled={!canSimpAny} onClick={handleSimplify}>פשט</button>
            </div>
          :<>
            <div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ x = {solved}</div>
            <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={finishSolve}>המשך ›</button></div>
          </>}
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ x = {xAnswer}</div>}
      </div>}

      {ex.type==='algebra'&&phase>=2&&<div className={`step-card ${phase>2?'done':''}`}>
        <div className="step-label">שלב 3 — הציבו את x ומצאו את הזווית המבוקשת</div>
        {phase===2?<div className="ans-row">
          <span>({fmtExpr(ex.exprs[ex.askIdx])})° =</span>
          <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}}
            onKeyDown={e=>e.key==='Enter'&&checkSubstitute()}/><span>°</span>
        </div>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
          ✓ הזווית המבוקשת = {ex.angles[ex.askIdx]}°</div>}
      </div>}

      {(phase===0||(ex.type==='algebra'&&phase===2))&&
        <div className="center" style={{marginTop:8}}>
          <button className="btn bg" onClick={phase===0?check1:checkSubstitute}>✓ בדוק</button>
        </div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══ Chapter (new): Special Triangles — right-angle / isosceles / equilateral ═══ */
const pyTriples=[[3,4,5],[5,12,13],[6,8,10],[7,24,25],[8,15,17],[9,12,15],[9,40,41],[10,24,26],[12,16,20],[15,20,25]];

function genChRight(forceSub){
  const sub=forceSub||pick(['identify','area','pythagoras']);
  const triple=pick(pyTriples);
  const swap=Math.random()<0.5;
  const legA=swap?triple[1]:triple[0];
  const legB=swap?triple[0]:triple[1];
  const hyp=triple[2];
  if(sub==='identify'){
    const qType=pick(['hyp','leg']);
    return{sub,legA,legB,hyp,qType};
  }
  if(sub==='area'){
    const mode=pick(['direct','equation']);
    const area=(legA*legB)/2;
    if(mode==='direct')return{sub,mode,legA,legB,area};
    // equation: legB known, legA missing — legA·legB = 2·area, solved for x=legA
    return{sub,mode,knownLeg:legB,missingLeg:legA,area,doubleArea:2*area};
  }
  const unknown=pick(['hyp','legA','legB']);
  return{sub:'pythagoras',legA,legB,hyp,unknown};
}

function buildRightVerts(legA,legB,W=340,H=280){
  // Scale to FILL the available box using whichever leg is the binding
  // constraint (width from legA, height from legB) — not a flat px-per-unit
  // cap, so small numeric leg values still render a large triangle.
  const topMargin=H*(35/280), bottomMargin=H*(60/280);
  const availW=W*(280/340), availH=Math.max(10,H-topMargin-bottomMargin);
  const sc=Math.min(availW/legA,availH/legB);
  const C={x:W/2-legA*sc/2,y:H-bottomMargin};
  const B={x:C.x+legA*sc,y:C.y};
  const A={x:C.x,y:C.y-legB*sc};
  return[A,B,C];
}

function ChRightExercise({forceSub}){
  const [ex,setEx]=useState(()=>genChRight(forceSub));
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [a1,setA1]=useState('');
  const [chosen,setChosen]=useState(null);
  const [showInfo,setShowInfo]=useState(true);

  // area/pythagoras subs: the student fills in every slot of the
  // calculation themselves rather than reading pre-filled numbers
  const [n1,setN1]=useState('');
  const [n2,setN2]=useState('');
  const [n3,setN3]=useState('');

  // equation-solving state (area/'equation' mode and pythagoras) — same
  // operation-box mechanic as Ch1/ratio-percent.html
  const [cur,setCur]=useState(null);
  const [opType,setOpType]=useState('+');
  const [opVal,setOpVal]=useState('');
  const [opIsX,setOpIsX]=useState(false);
  const [opErr,setOpErr]=useState('');
  const [didSqrt,setDidSqrt]=useState(false);
  const solved=useMemo(()=>cur?slvCheckSolved(cur):null,[cur]);
  const canSimpAny=cur?(slvCanSimp(cur.left)||slvCanSimp(cur.right)):false;
  // pythagoras only: once both sides are a single simplified term, the
  // equation reads "x = (missing side)²" — √ is the only sensible next move
  const readyForSqrt=cur&&cur.left.length===1&&cur.right.length===1&&!canSimpAny;

  const reset=()=>{
    setEx(genChRight(forceSub));setFb(null);setPhase(0);setA1('');setChosen(null);
    setN1('');setN2('');setN3('');
    setCur(null);setOpVal('');setOpErr('');setOpType('+');setOpIsX(false);setDidSqrt(false);
  };
  const advance=()=>{setPhase(p=>p+1);setFb(null);setA1('');setChosen(null);};

  const totalSteps=ex.sub==='identify'?1:ex.sub==='area'?(ex.mode==='direct'?1:3):3;
  const allDone=phase>=totalSteps;

  // pythagoras: canonical a²+b²=c² positions for whichever side is missing
  const pyLeftExpected=ex.sub==='pythagoras'?(
    ex.unknown==='hyp'?[ex.legA,ex.legB]:ex.unknown==='legA'?['x',ex.legB]:[ex.legA,'x']
  ):null;
  const pyRightExpected=ex.sub==='pythagoras'?(ex.unknown==='hyp'?'x':ex.hyp):null;
  const pyMissingLabel=ex.unknown==='hyp'?'c':ex.unknown==='legA'?'a':'b';
  const pyAnswer=ex.sub==='pythagoras'?(ex.unknown==='hyp'?ex.hyp:ex.unknown==='legA'?ex.legA:ex.legB):null;

  const applyOp=()=>{
    const v=opVal.trim();
    if(!/^-?\d+$/.test(v)){setOpErr('הזינו מספר שלם');return;}
    const k=parseInt(v,10);
    if(k===0){setOpErr('בחרו מספר שאינו אפס');return;}
    const isX=opIsX&&(opType==='+'||opType==='−');
    setCur(c=>slvDoOperate(c,opType,k,isX));
    setOpVal('');setOpErr('');setOpIsX(false);
  };
  const handleSimplify=()=>{
    setCur(c=>({left:slvCanSimp(c.left)?slvDoSimplify(c.left):c.left,right:slvCanSimp(c.right)?slvDoSimplify(c.right):c.right}));
  };
  const applySqrt=()=>{
    const sqrtTerm=t=>slvMkTerm(t.type,Math.round(Math.sqrt(Math.abs(t.num/t.den))));
    setCur(c=>({left:[sqrtTerm(c.left[0])],right:[sqrtTerm(c.right[0])]}));
    setDidSqrt(true);
  };

  const checkStep=()=>{
    if(ex.sub==='identify'){
      const correct=ex.qType==='hyp'?chosen===ex.hyp:(chosen===ex.legA||chosen===ex.legB);
      if(correct){setFb('ok');setTimeout(advance,600);}else setFb('err');
      return;
    }
    const matchX=v=>String(v).trim().toLowerCase()==='x';
    if(ex.sub==='area'){
      const v1=parseInt(n1),v2=parseInt(n2),v3=parseFloat(n3);
      if(ex.mode==='direct'){
        const legsOk=(v1===ex.legA&&v2===ex.legB)||(v1===ex.legB&&v2===ex.legA);
        if(legsOk&&v3===ex.area){setFb('ok');setTimeout(advance,600);}else setFb('err');
      } else {
        const xOk=(matchX(n1)&&v2===ex.knownLeg)||(matchX(n2)&&v1===ex.knownLeg);
        if(xOk&&v3===ex.area){setFb('ok');setTimeout(advance,600);}else setFb('err');
      }
      return;
    }
    // pythagoras — step 0 (write the equation) only; the rest is the
    // op-box solve phase, handled by its own buttons
    const matchVal=(v,expected)=>expected==='x'?matchX(v):parseInt(v)===expected;
    const [exp1,exp2]=pyLeftExpected;
    const leftOk=(matchVal(n1,exp1)&&matchVal(n2,exp2))||(matchVal(n1,exp2)&&matchVal(n2,exp1));
    const rightOk=matchVal(n3,pyRightExpected);
    if(leftOk&&rightOk){setFb('ok');setTimeout(advance,600);}else setFb('err');
  };
  const clearFraction=()=>{
    setCur({left:[slvMkTerm('x',ex.knownLeg)],right:[slvMkTerm('const',ex.doubleArea)]});
    setPhase(2);
  };
  const finishEquation=()=>setPhase(3);
  const computeSquares=()=>{
    let left,right;
    if(ex.unknown==='hyp'){
      left=[slvMkTerm('const',ex.legA*ex.legA),slvMkTerm('const',ex.legB*ex.legB)];
      right=[slvMkTerm('x',1)];
    } else if(ex.unknown==='legA'){
      left=[slvMkTerm('x',1),slvMkTerm('const',ex.legB*ex.legB)];
      right=[slvMkTerm('const',ex.hyp*ex.hyp)];
    } else {
      left=[slvMkTerm('const',ex.legA*ex.legA),slvMkTerm('x',1)];
      right=[slvMkTerm('const',ex.hyp*ex.hyp)];
    }
    setCur({left,right});
    setPhase(2);
  };
  const finishPy=()=>setPhase(3);

  const verts=buildRightVerts(ex.legA,ex.legB);

  return <div className="content">
    {showInfo&&<div className="info-box">
      {ex.sub==='area'?<>
        <h3>📐 שטח משולש ישר-זווית</h3>
        <p style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:4}}>
          <span>בכל משולש ישר-זווית שני הניצבים מאונכים זה לזה — אפשר להשתמש באחד כ"בסיס" ובשני כ"גובה": <strong>S =</strong></span>
          <Frac n="ניצב × ניצב" d={2} style={{fontSize:13}}/><span>.</span>
        </p>
        <p style={{textAlign:'center',fontWeight:600,marginTop:4}}>לדוגמה: ניצבים 6 ו-8</p>
        <div className="ans-row" style={{justifyContent:'center'}}>
          <span>S =</span><Frac n={<>6×8</>} d={2}/><span>= 24</span>
        </div>
      </>:ex.sub==='pythagoras'?<>
        <h3>📐 משפט פיתגורס</h3>
        <div className="step-card" style={{marginTop:8}}>
          <div className="step-label">מה זה a²?</div>
          <p style={{margin:0}}>הסימון <strong>a²</strong> ("a בריבוע") פירושו a×a — המספר כפול את עצמו. <span dir="ltr">לדוגמה: 5² = 5×5 = 25.</span></p>
        </div>
        <div className="step-card">
          <div className="step-label">מה זה √ (שורש)?</div>
          <p style={{margin:0}}>השורש הריבועי הוא הפעולה <strong>ההפוכה</strong> לריבוע: אם a²=b, אז √b=a. <span dir="ltr">לדוגמה: √25 = 5</span>, כי <span dir="ltr">5² = 25</span>.</p>
        </div>
        <div className="formula-box">a² + b² = c²</div>
        <p style={{textAlign:'center',fontSize:12,color:'#64748b',marginTop:-6}}>a ו-b הם הניצבים, c הוא היתר</p>
        <p style={{textAlign:'center',fontWeight:600,marginTop:10}}>לדוגמה: ניצבים 3 ו-4</p>
        <div style={{display:'flex',justifyContent:'center'}}>
          <TriSVG verts={buildRightVerts(4,3,180,150)} sideVals={[5,4,3]} rightAt={2} W={180} H={150}/>
        </div>
        <div className="ans-row" style={{justifyContent:'center',flexWrap:'wrap',marginTop:4}}>
          <span dir="ltr">c² = 3² + 4² = 9 + 16</span>
        </div>
        <div className="ans-row" style={{justifyContent:'center'}}>
          <span dir="ltr">c² = 25</span>
        </div>
        <div className="ans-row" style={{justifyContent:'center'}}>
          <span dir="ltr">c = √25 = 5</span>
        </div>
      </>:<>
        <h3>📐 משולש ישר-זווית</h3>
        <p>במשולש ישר-זווית יש זווית אחת של 90°. שתי הצלעות היוצרות את הזווית הישרה נקראות <strong>ניצבים</strong>, והצלע השלישית — מול הזווית הישרה, והארוכה מבין השלוש — נקראת <strong>יתר</strong>.</p>
      </>}
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}
    <div className="card">
      <div className="card-t">{ex.sub==='identify'?'ניצב או יתר?':ex.sub==='area'?'שטח משולש ישר-זווית':'מציאת צלע חסרה'}</div>

      {ex.sub==='identify'&&(()=>{
        const opts=[ex.legA,ex.legB,ex.hyp];
        return <>
          <div className="graph-wrap">
            <TriSVG verts={verts} sideVals={[ex.hyp,ex.legA,ex.legB]} rightAt={2}/>
          </div>
          <p className="hint">{ex.qType==='hyp'
            ?<>איזו מבין הצלעות היא <strong>היתר</strong>?</>
            :<>איזו מבין הצלעות היא <strong>ניצב</strong>? (בחרו אחת)</>}</p>
          {!allDone&&<div className="choice-row">
            {opts.map((o,i)=><button key={i} className={`choice-btn ${chosen===o?'active':''}`}
              onClick={()=>{setChosen(o);setFb(null);}}>{o}</button>)}
          </div>}
          {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
            ✓ היתר = {ex.hyp} (מול הזווית הישרה); {ex.legA} ו-{ex.legB} הם הניצבים</div></div>}
        </>;
      })()}

      {ex.sub==='area'&&ex.mode==='direct'&&<>
        <div className="graph-wrap">
          <TriSVG verts={verts} sideVals={[ex.hyp,ex.legA,ex.legB]} rightAt={2}/>
        </div>
        <p className="hint">כתבו בעצמכם את חישוב השטח (הניצבים נראים באיור).</p>
        {!allDone?<div className="ans-row" style={{fontSize:18}}>
          <span>S =</span>
          <Frac n={<span style={{display:'inline-flex',alignItems:'center',gap:4}}>
            <input value={n1} onChange={e=>{setN1(e.target.value);setFb(null);}} style={{width:42}}/>
            <span>×</span>
            <input value={n2} onChange={e=>{setN2(e.target.value);setFb(null);}} style={{width:42}}/>
          </span>} d={2}/>
          <span>=</span>
          <input value={n3} onChange={e=>{setN3(e.target.value);setFb(null);}} style={{width:55}}
            onKeyDown={e=>e.key==='Enter'&&checkStep()}/>
        </div>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
          ✓ S = <Frac n={<>{ex.legA}×{ex.legB}</>} d={2} style={{color:'#16a34a'}}/> = {ex.area}</div>}
      </>}

      {ex.sub==='area'&&ex.mode==='equation'&&(()=>{
        return <>
          <div className="graph-wrap">
            <TriSVG verts={buildRightVerts(ex.knownLeg,phase>=3?ex.missingLeg:ex.knownLeg)}
              sideVals={[null,ex.knownLeg,phase>=3?ex.missingLeg:'x']} rightAt={2}/>
          </div>
          <p className="hint">ניצב אחד = {ex.knownLeg}, שטח המשולש = {ex.area}. מצאו את הניצב השני (סמנו אותו כ-x).</p>

          <div className={`step-card ${phase>0?'done':''}`}>
            <div className="step-label">שלב 1 — כתבו בעצמכם את המשוואה</div>
            {phase===0?<div className="ans-row" style={{fontSize:18}}>
              <span>S =</span>
              <Frac n={<span style={{display:'inline-flex',alignItems:'center',gap:4}}>
                <input value={n1} onChange={e=>{setN1(e.target.value);setFb(null);}} style={{width:42}}/>
                <span>×</span>
                <input value={n2} onChange={e=>{setN2(e.target.value);setFb(null);}} style={{width:42}}/>
              </span>} d={2}/>
              <span>=</span>
              <input value={n3} onChange={e=>{setN3(e.target.value);setFb(null);}} style={{width:55}}
                onKeyDown={e=>e.key==='Enter'&&checkStep()}/>
            </div>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
              ✓ <Frac n={<>x×{ex.knownLeg}</>} d={2} style={{color:'#16a34a'}}/> = {ex.area}</div>}
          </div>

          {phase>=1&&<div className={`step-card ${phase>1?'done':''}`}>
            <div className="step-label">שלב 2 — הכפילו את שני האגפים ב-2</div>
            {phase===1?<div className="center" style={{marginTop:6}}>
              <button className="btn bg" onClick={clearFraction}>✕ הכפילו ב-2</button>
            </div>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ x×{ex.knownLeg} = {ex.doubleArea}</div>}
          </div>}

          {phase>=2&&<div className={`step-card ${phase>2?'done':''}`}>
            <div className="step-label">שלב 3 — פתרו את המשוואה כדי למצוא את x</div>
            {phase===2?<>
              <div className="slv-grid">
                {solved===null&&<>
                  <div className="slv-left"><SlvOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={t=>{setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false);}} onOpVal={v=>{setOpVal(v);setOpErr('');}} onToggleX={()=>{setOpIsX(v=>!v);setOpErr('');}}/></div>
                  <div></div>
                  <div className="slv-right"><SlvOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={t=>{setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false);}} onOpVal={v=>{setOpVal(v);setOpErr('');}} onToggleX={()=>{setOpIsX(v=>!v);setOpErr('');}}/></div>
                </>}
                <div className="slv-left slv-zone">{cur.left.map((t,i)=><SlvTermPill key={t.id} term={t} index={i}/>)}</div>
                <span className="slv-eqsign">=</span>
                <div className="slv-right slv-zone">{cur.right.map((t,i)=><SlvTermPill key={t.id} term={t} index={i}/>)}</div>
              </div>
              {opErr&&<div className="fb err">{opErr}</div>}
              {solved===null?
                <div className="center" style={{display:'flex',gap:8,justifyContent:'center'}}>
                  <button className="btn bg" onClick={applyOp}>✓ אישור</button>
                  <button className="btn" style={{background:'#e5e7eb',color:'#374151'}} disabled={!canSimpAny} onClick={handleSimplify}>פשט</button>
                </div>
              :<>
                <div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ x = {solved}</div>
                <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={finishEquation}>המשך ›</button></div>
              </>}
            </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ x = {ex.missingLeg}</div>}
          </div>}
        </>;
      })()}

      {ex.sub==='pythagoras'&&<>
        <div className="graph-wrap">
          <TriSVG verts={verts} sideVals={[
            ex.unknown==='hyp'?(allDone?ex.hyp:'?'):ex.hyp,
            ex.unknown==='legA'?(allDone?ex.legA:'?'):ex.legA,
            ex.unknown==='legB'?(allDone?ex.legB:'?'):ex.legB,
          ]} rightAt={2}/>
        </div>
        <p className="hint">כתבו בעצמכם את המשוואה (סמנו את הצלע החסרה כ-x) ופתרו אותה.</p>

        <div className={`step-card ${phase>0?'done':''}`}>
          <div className="step-label">שלב 1 — כתבו את המשוואה</div>
          {phase===0?<div className="ans-row" style={{fontSize:18}}>
            <input value={n1} onChange={e=>{setN1(e.target.value);setFb(null);}} style={{width:42}}/><span>²</span>
            <span>+</span>
            <input value={n2} onChange={e=>{setN2(e.target.value);setFb(null);}} style={{width:42}}/><span>²</span>
            <span>=</span>
            <input value={n3} onChange={e=>{setN3(e.target.value);setFb(null);}} style={{width:42}}/><span>²</span>
          </div>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
            <span>✓</span><span dir="ltr">{pyLeftExpected[0]}² + {pyLeftExpected[1]}² = {pyRightExpected}²</span></div>}
        </div>

        {phase>=1&&<div className={`step-card ${phase>1?'done':''}`}>
          <div className="step-label">שלב 2 — חשבו את הריבועים</div>
          {phase===1?<div className="center" style={{marginTop:6}}>
            <button className="btn bg" onClick={computeSquares}>✕ חשבו את הריבועים</button>
          </div>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ בוצע</div>}
        </div>}

        {phase>=2&&<div className={`step-card ${phase>2?'done':''}`}>
          <div className="step-label">שלב 3 — פתרו את המשוואה כדי למצוא את {pyMissingLabel}</div>
          {phase===2?<>
            <div className="slv-grid">
              {!didSqrt&&!readyForSqrt&&<>
                <div className="slv-left"><SlvOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={t=>{setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false);}} onOpVal={v=>{setOpVal(v);setOpErr('');}} onToggleX={()=>{setOpIsX(v=>!v);setOpErr('');}}/></div>
                <div></div>
                <div className="slv-right"><SlvOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={t=>{setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false);}} onOpVal={v=>{setOpVal(v);setOpErr('');}} onToggleX={()=>{setOpIsX(v=>!v);setOpErr('');}}/></div>
              </>}
              <div className="slv-left slv-zone">{cur.left.map((t,i)=><SlvTermPill key={t.id} term={t} index={i} xLabel={didSqrt?'x':'x²'}/>)}</div>
              <span className="slv-eqsign">=</span>
              <div className="slv-right slv-zone">{cur.right.map((t,i)=><SlvTermPill key={t.id} term={t} index={i} xLabel={didSqrt?'x':'x²'}/>)}</div>
            </div>
            {opErr&&<div className="fb err">{opErr}</div>}
            {didSqrt?<>
              <div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ {pyMissingLabel} = {solved}</div>
              <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={finishPy}>המשך ›</button></div>
            </>:readyForSqrt?<>
              <p className="hint" style={{marginBottom:6}}>המשוואה כעת בצורה {pyMissingLabel}² = מספר. הוציאו שורש משני האגפים כדי למצוא את {pyMissingLabel}:</p>
              <div className="center"><button className="btn bg" onClick={applySqrt}>√ הוציאו שורש</button></div>
            </>:<div className="center" style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button className="btn bg" onClick={applyOp}>✓ אישור</button>
              <button className="btn" style={{background:'#e5e7eb',color:'#374151'}} disabled={!canSimpAny} onClick={handleSimplify}>פשט</button>
            </div>}
          </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {pyMissingLabel} = {pyAnswer}</div>}
        </div>}
      </>}

      {!allDone&&!(ex.sub==='area'&&ex.mode==='equation'&&phase>=1)&&!(ex.sub==='pythagoras'&&phase>=1)&&
        <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={checkStep}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

// three separately-selectable exercise types (not randomized between —
// each is its own sub-tab so the student picks which one to practice)
function ChRightAngle(){
  const [part,setPart]=useState(0);
  const labels=['ניצב או יתר?','שטח המשולש','משפט פיתגורס'];
  const subs=['identify','area','pythagoras'];
  return <div>
    <div className="content" style={{marginBottom:-14}}>
      <div className="sub-tabs">
        {labels.map((l,i)=><button key={i} className={`sub-tab-btn ${part===i?'active':''}`} onClick={()=>setPart(i)}>{l}</button>)}
      </div>
    </div>
    <ChRightExercise key={subs[part]} forceSub={subs[part]}/>
  </div>;
}

/* ═══ Isosceles triangle: shared vertex builder ═══ */
function buildIsoVerts(leg,base,W=340,H=280){
  // Scale to FILL the available bounding box based on the triangle's own
  // geometric aspect ratio (base width vs. true height from leg/base) —
  // not a flat px-per-unit cap. A flat cap made small numeric leg/base
  // values (e.g. leg=4) render as a tiny triangle even though the canvas
  // had plenty of room; picking whichever of width/height is the binding
  // constraint means the triangle is always as big as its shape allows,
  // regardless of the magnitude of the numbers behind it.
  const topMargin=H*(35/280), bottomMargin=H*(50/280);
  const availW=W*(280/340), availH=Math.max(10,H-topMargin-bottomMargin);
  const halfBaseUnits=base/2;
  const heightUnits=Math.sqrt(Math.max(0.01,leg*leg-halfBaseUnits*halfBaseUnits));
  const sc=Math.min(availW/base,availH/heightUnits);
  const B={x:W/2-base*sc/2,y:H-bottomMargin};
  const C={x:W/2+base*sc/2,y:H-bottomMargin};
  const h=heightUnits*sc;
  const A={x:W/2,y:H-bottomMargin-h};
  return[A,B,C];
}

// a second, absolutely-positioned SVG sharing the same viewBox as the TriSVG
// beneath it — used to annotate a sub-segment or sub-angle (e.g. the angle
// between a height and a leg, or a cevian's foot partway along a side) that
// TriSVG's own vertex-angle/whole-side props have no slot for, without
// duplicating TriSVG's rendering internals for a handful of one-off diagrams
function SvgOverlay({W=340,H=280,children}){
  // mirrors TriSVG's own responsive-width rule exactly (same default check,
  // same cap) so the overlay always renders at the identical pixel width as
  // the TriSVG beneath it, regardless of the container's actual size
  const isDefaultCanvas=W===340&&H===280;
  const widthStyle=isDefaultCanvas?{width:'100%',maxWidth:640}:{width:Math.min(W,340)};
  return <svg viewBox={`0 0 ${W} ${H}`} style={{position:'absolute',top:0,left:0,
    ...widthStyle,height:'auto',direction:'ltr',pointerEvents:'none'}}>{children}</svg>;
}

/* ═══ Isosceles — sub-tab A: definitions & basic properties ═══ */
function genIsoBasics(forceSub){
  const sub=forceSub||pick(['identify','missingAngle','missingLeg']);
  if(sub==='identify'){
    const isIso=Math.random()<0.6;
    if(isIso){
      const leg=randInt(4,15);
      const base=randInt(3,leg*2-1);
      if(base===leg) return genIsoBasics(sub);
      return{sub,isIso:true,leg,base,sides:[leg,base,leg]};
    } else {
      const a=randInt(4,12),b=randInt(a+1,15),c=randInt(Math.abs(a-b)+1,a+b-1);
      if(a===b||b===c||a===c) return genIsoBasics(sub);
      return{sub,isIso:false,sides:[a,b,c]};
    }
  }
  if(sub==='missingAngle'){
    const leg=randInt(4,12);
    const type=Math.random()<0.5?'fromVertex':'fromBase';
    if(type==='fromVertex'){
      // capped away from a near-flat apex (v near 180), which crowds the
      // apex angle-value label against the "A" vertex letter
      const v=randInt(10,65)*2; // even vertex angle
      const b=(180-v)/2;
      return{sub,type,leg,vertexAngle:v,baseAngle:b};
    } else {
      const b=randInt(25,80);
      const v=180-2*b;
      return{sub,type,leg,vertexAngle:v,baseAngle:b};
    }
  }
  // missingLeg — one leg + the two (equal) base angles are given; the word
  // "isosceles" never appears — the student must infer it from the equal
  // base angles (equal angles ⇒ equal opposite sides) to find the 2nd leg
  const baseAngle=randInt(30,80);
  const leg=randInt(4,20);
  const base=Math.max(3,Math.round(2*leg*Math.cos(deg2rad(baseAngle))));
  return{sub,baseAngle,leg,base};
}

// mirrors ch1BuildEq's pattern: the angle-sum-to-180 equation with the
// unknown marked x, built after the student's own free-text equation is
// verified to have the right (coefficient, constant) shape
function isoAngleBuildEq(ex){
  return ex.type==='fromVertex'
    ?{left:[slvMkTerm('const',ex.vertexAngle),slvMkTerm('x',2)],right:[slvMkTerm('const',180)]}
    :{left:[slvMkTerm('const',2*ex.baseAngle),slvMkTerm('x',1)],right:[slvMkTerm('const',180)]};
}

function IsoBasicsExercise({forceSub}){
  const [ex,setEx]=useState(()=>genIsoBasics(forceSub));
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [a1,setA1]=useState('');
  const [chosen,setChosen]=useState(null);
  const [showInfo,setShowInfo]=useState(true);

  // missingAngle only: write-equation-then-solve, same mechanic as Ch1
  const [eqText,setEqText]=useState('');
  const [cur,setCur]=useState(null);
  const [opType,setOpType]=useState('+');
  const [opVal,setOpVal]=useState('');
  const [opIsX,setOpIsX]=useState(false);
  const [opErr,setOpErr]=useState('');
  const solved=useMemo(()=>cur?slvCheckSolved(cur):null,[cur]);
  const canSimpAny=cur?(slvCanSimp(cur.left)||slvCanSimp(cur.right)):false;

  const reset=()=>{
    setEx(genIsoBasics(forceSub));setFb(null);setPhase(0);setA1('');setChosen(null);
    setEqText('');setCur(null);setOpVal('');setOpErr('');setOpType('+');setOpIsX(false);
  };
  const advance=()=>{setPhase(p=>p+1);setFb(null);setA1('');setChosen(null);};

  const totalSteps=ex.sub==='identify'?1:ex.sub==='missingAngle'?2:1;
  const allDone=phase>=totalSteps;

  const setOpValClean=v=>{setOpVal(v);setOpErr('');};
  const setOpTypeClean=t=>{setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false);};
  const toggleOpIsX=()=>{setOpIsX(v=>!v);setOpErr('');};
  const applyOp=()=>{
    const v=opVal.trim();
    if(!/^-?\d+$/.test(v)){setOpErr('הזינו מספר שלם');return;}
    const k=parseInt(v,10);
    if(k===0){setOpErr('בחרו מספר שאינו אפס');return;}
    const isX=opIsX&&(opType==='+'||opType==='−');
    setCur(c=>slvDoOperate(c,opType,k,isX));
    setOpVal('');setOpErr('');setOpIsX(false);
  };
  const handleSimplify=()=>{
    setCur(c=>({left:slvCanSimp(c.left)?slvDoSimplify(c.left):c.left,right:slvCanSimp(c.right)?slvDoSimplify(c.right):c.right}));
  };
  const finishSolve=()=>{setPhase(2);setFb(null);};
  const checkEq=()=>{
    const target=ex.type==='fromVertex'
      ?{L:{coeff:2,c:ex.vertexAngle},R:{coeff:0,c:180}}
      :{L:{coeff:1,c:2*ex.baseAngle},R:{coeff:0,c:180}};
    const ok=checkLinearEquation(eqText,target.L,target.R);
    if(ok){
      setFb('ok');
      setTimeout(()=>{setCur(isoAngleBuildEq(ex));setPhase(1);setFb(null);},600);
    } else setFb('err');
  };
  const xAnswer=ex.sub==='missingAngle'?(ex.type==='fromVertex'?ex.baseAngle:ex.vertexAngle):null;

  const checkStep=()=>{
    if(ex.sub==='identify'){
      if(ex.isIso&&chosen==='yes'||!ex.isIso&&chosen==='no'){setFb('ok');setTimeout(advance,600);}else setFb('err');
    } else if(ex.sub==='missingAngle'){
      checkEq();
    } else { // missingLeg
      if(parseInt(a1)===ex.leg){setFb('ok');setTimeout(advance,600);}else setFb('err');
    }
  };

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>📐 משולש שווה שוקיים</h3>
      <p>במשולש שווה שוקיים שתי צלעות שוות הנקראות <strong>שוקיים</strong>, והצלע השלישית נקראת <strong>בסיס</strong>.</p>
      <p>על הבסיס יושבות שתי זוויות שוות — <strong>זוויות הבסיס</strong>. הזווית השלישית, זו שבין שני השוקיים, נקראת <strong>זווית הראש</strong>.</p>
      <div className="graph-wrap">
        <TriSVG verts={buildIsoVerts(10,8)} sideVals={['שוק','בסיס','שוק']} equalSides={[1,0,1]}
          angleVals={['α','β','β']} equalAngles={[0,1,1]}/>
      </div>
      <p style={{textAlign:'center',fontSize:12,color:'#64748b',marginTop:-6}}>α — זווית הראש &nbsp;|&nbsp; β,β — זוויות הבסיס (שוות)</p>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="card">
      <div className="card-t">{ex.sub==='identify'?'זיהוי משולש שווה שוקיים':ex.sub==='missingAngle'?'חישוב זווית חסרה':'מציאת שוק חסר'}</div>

      {ex.sub==='identify'&&(()=>{
        const verts=ex.isIso?buildIsoVerts(ex.leg,ex.base):vertsFromAngles([60,70,50]);
        return <>
          <div className="graph-wrap">
            <TriSVG verts={verts} sideVals={ex.sides}/>
          </div>
          <p className="hint">צלעות: {ex.sides.join(', ')}</p>
          <p className="hint" style={{fontWeight:600}}>האם זהו משולש שווה שוקיים?</p>
          {!allDone&&<div className="choice-row">
            <button className={`choice-btn ${chosen==='yes'?'active':''}`} onClick={()=>{setChosen('yes');setFb(null);}}>כן</button>
            <button className={`choice-btn ${chosen==='no'?'active':''}`} onClick={()=>{setChosen('no');setFb(null);}}>לא</button>
          </div>}
        </>;
      })()}

      {ex.sub==='missingAngle'&&(()=>{
        const base=Math.max(3,Math.round(2*ex.leg*Math.cos(deg2rad(ex.baseAngle))));
        const verts=buildIsoVerts(ex.leg,base);
        const aVals=ex.type==='fromVertex'
          ?[ex.vertexAngle+'°',allDone?ex.baseAngle+'°':'x',allDone?ex.baseAngle+'°':'x']
          :[allDone?ex.vertexAngle+'°':'x',ex.baseAngle+'°',ex.baseAngle+'°'];
        return <>
          <div className="graph-wrap">
            <TriSVG verts={verts} angleVals={aVals} equalSides={[1,0,1]} equalAngles={[0,1,1]}/>
          </div>
          {ex.type==='fromVertex'
            ?<p className="hint">זווית הראש = {ex.vertexAngle}°. סמנו את זווית הבסיס כ-x, כתבו משוואה מתאימה ופתרו אותה.</p>
            :<p className="hint">זווית בסיס = {ex.baseAngle}°. סמנו את זווית הראש כ-x, כתבו משוואה מתאימה ופתרו אותה.</p>}

          <div className={`step-card ${phase>0?'done':''}`}>
            <div className="step-label">שלב 1 — כתבו משוואה מתאימה למציאת x</div>
            {phase===0?<div className="ans-row">
              <input value={eqText} onChange={e=>{setEqText(e.target.value);setFb(null);}} style={{width:220,direction:'ltr'}}
                onKeyDown={e=>e.key==='Enter'&&checkEq()}/>
            </div>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ המשוואה נכתבה</div>}
          </div>

          {phase>=1&&<div className={`step-card ${phase>1?'done':''}`}>
            <div className="step-label">שלב 2 — פתרו את המשוואה כדי למצוא את x</div>
            {phase===1?<>
              <div className="slv-grid">
                {solved===null&&<>
                  <div className="slv-left"><SlvOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
                  <div></div>
                  <div className="slv-right"><SlvOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
                </>}
                <div className="slv-left slv-zone">{cur.left.map((t,i)=><SlvTermPill key={t.id} term={t} index={i}/>)}</div>
                <span className="slv-eqsign">=</span>
                <div className="slv-right slv-zone">{cur.right.map((t,i)=><SlvTermPill key={t.id} term={t} index={i}/>)}</div>
              </div>
              {opErr&&<div className="fb err">{opErr}</div>}
              {solved===null?
                <div className="center" style={{display:'flex',gap:8,justifyContent:'center'}}>
                  <button className="btn bg" onClick={applyOp}>✓ אישור</button>
                  <button className="btn" style={{background:'#e5e7eb',color:'#374151'}} disabled={!canSimpAny} onClick={handleSimplify}>פשט</button>
                </div>
              :<>
                <div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ x = {solved}</div>
                <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={finishSolve}>המשך ›</button></div>
              </>}
            </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ x = {xAnswer}</div>}
          </div>}

          {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
            ✓ הזוויות: {ex.vertexAngle}°, {ex.baseAngle}°, {ex.baseAngle}°</div></div>}
        </>;
      })()}

      {ex.sub==='missingLeg'&&(()=>{
        const verts=buildIsoVerts(ex.leg,ex.base);
        return <>
          <div className="graph-wrap">
            <TriSVG verts={verts} sideVals={[ex.leg,null,allDone?ex.leg:'?']}
              angleVals={[null,ex.baseAngle+'°',ex.baseAngle+'°']}/>
          </div>
          <p className="hint">בצלעות AB ו-AC יש קודקוד משותף A. נתון: AB = {ex.leg}, וזוויות הבסיס שוות ({ex.baseAngle}° כל אחת). מצאו את אורך הצלע AC.</p>
          <div className="ans-row">
            <span style={{fontWeight:600}}>AC =</span>
            <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} disabled={allDone} style={{width:55}}
              onKeyDown={e=>e.key==='Enter'&&!allDone&&checkStep()}/>
          </div>
          {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
            ✓ שתי זוויות הבסיס שוות ⟵ הצלעות שמולן שוות ⟵ AC = AB = {ex.leg}</div></div>}
        </>;
      })()}

      {!allDone&&!(ex.sub==='missingAngle'&&phase>=1)&&
        <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={checkStep}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

function ChIsoBasics(){
  const [part,setPart]=useState(0);
  const labels=['זיהוי','זווית חסרה','שוק חסר'];
  const subs=['identify','missingAngle','missingLeg'];
  return <div>
    <div className="content" style={{marginBottom:-14}}>
      <div className="sub-tabs">
        {labels.map((l,i)=><button key={i} className={`sub-tab-btn ${part===i?'active':''}`} onClick={()=>setPart(i)}>{l}</button>)}
      </div>
    </div>
    <IsoBasicsExercise key={subs[part]} forceSub={subs[part]}/>
  </div>;
}

/* ═══ Isosceles — sub-tab B: the height to the base ═══ */
function genIsoHeight(forceSub){
  const sub=forceSub||pick(['classify','legAngle','baseAngleHalf','baseLength']);
  if(sub==='classify'){
    // scalene (clearly non-isosceles) with base angles far enough apart
    // that the height/median/bisector feet from the apex land at visibly
    // distinct points on the base
    let angB,angC,angA;
    for(let tries=0;tries<300;tries++){
      angB=randInt(35,75);angC=randInt(35,75);angA=180-angB-angC;
      if(angA>=30&&angA<=110&&Math.abs(angB-angC)>=18)break;
    }
    const markType=pick(['height','median','bisector']);
    return{sub,angA,angB,angC,markType};
  }
  if(sub==='legAngle'){
    // baseAngle capped away from the extremes — a very flat (wide-apex) or
    // very tall (narrow-apex) triangle crowds the apex-angle overlay label
    // against the base-angle label or the tick marks
    const baseAngle=randInt(25,65);
    const leg=randInt(4,15);
    const base=Math.max(3,Math.round(2*leg*Math.cos(deg2rad(baseAngle))));
    return{sub,baseAngle,leg,base,answer:90-baseAngle};
  }
  if(sub==='baseAngleHalf'){
    const half=randInt(15,55); // half of the apex angle — same crowding cap as legAngle
    const baseAngle=90-half;
    const leg=randInt(4,20);
    const base=Math.max(3,Math.round(2*leg*Math.cos(deg2rad(baseAngle))));
    return{sub,half,leg,base,answer:baseAngle};
  }
  // baseLength
  const dir=pick(['halfToFull','fullToHalf']);
  const half=randInt(4,20);
  const base=half*2;
  const leg=randInt(half+2,half+16);
  return{sub,dir,half,base,leg};
}

function IsoHeightExercise({forceSub}){
  const [ex,setEx]=useState(()=>genIsoHeight(forceSub));
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [a1,setA1]=useState('');
  const [chosen,setChosen]=useState(null);
  const [showInfo,setShowInfo]=useState(true);

  const reset=()=>{setEx(genIsoHeight(forceSub));setFb(null);setPhase(0);setA1('');setChosen(null);};
  const advance=()=>{setPhase(p=>p+1);setFb(null);setA1('');setChosen(null);};
  const totalSteps=1;
  const allDone=phase>=totalSteps;

  const checkStep=()=>{
    if(ex.sub==='classify'){
      if(chosen===ex.markType){setFb('ok');setTimeout(advance,600);}else setFb('err');
      return;
    }
    if(ex.sub==='legAngle'||ex.sub==='baseAngleHalf'){
      if(parseInt(a1)===ex.answer){setFb('ok');setTimeout(advance,600);}else setFb('err');
      return;
    }
    const expected=ex.dir==='halfToFull'?ex.base:ex.half;
    if(parseInt(a1)===expected){setFb('ok');setTimeout(advance,600);}else setFb('err');
  };

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>📐 הגובה לבסיס</h3>
      <p>במשולש שווה שוקיים, הגובה לבסיס הוא גם <strong>תיכון</strong> (חוצה את הבסיס לשני חלקים שווים) וגם <strong>חוצה זווית</strong> (חוצה את זווית הראש לשני חלקים שווים) — שלוש התכונות מתקיימות יחד באותו קטע.</p>
      <div className="graph-wrap">
        <div style={{position:'relative',width:'100%',maxWidth:640}}>
        {(()=>{
          const A={x:170,y:60},B={x:90,y:220},C={x:250,y:220},M={x:170,y:220};
          return <>
            <TriSVG verts={[A,B,C]} equalSides={[1,0,1]} heightLine={{from:A,to:M}}/>
            <SvgOverlay>
              {tickMarks(B,M,2).map((t,i)=><line key={'m1'+i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#dc2626" strokeWidth="2"/>)}
              {tickMarks(M,C,2).map((t,i)=><line key={'m2'+i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#dc2626" strokeWidth="2"/>)}
              {[0,1].map(k=><path key={'ea1'+k} d={angleArcAtVertex(A.x,A.y,B,M,18+k*5).path} fill="none" stroke="#dc2626" strokeWidth="1.2"/>)}
              {[0,1].map(k=><path key={'ea2'+k} d={angleArcAtVertex(A.x,A.y,M,C,18+k*5).path} fill="none" stroke="#dc2626" strokeWidth="1.2"/>)}
            </SvgOverlay>
          </>;
        })()}
        </div>
      </div>
      <p style={{textAlign:'center',fontSize:12,color:'#64748b',marginTop:-6}}>
        AM ⊥ BC (גובה) &nbsp;|&nbsp; BM = MC (תיכון, בסימון אדום) &nbsp;|&nbsp; ∠BAM = ∠CAM (חוצה זווית, בסימון אדום)</p>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="card">
      <div className="card-t">{ex.sub==='classify'?'גובה, תיכון או חוצה זווית?':ex.sub==='legAngle'?'זווית בין הגובה לשוק':ex.sub==='baseAngleHalf'?'זווית בסיס ממחצית זווית הראש':'אורך הבסיס'}</div>

      {ex.sub==='classify'&&(()=>{
        const verts=vertsFromAngles([ex.angA,ex.angB,ex.angC]);
        const[A,B,C]=verts;
        const Dh={x:A.x,y:B.y};
        const Dm={x:(B.x+C.x)/2,y:B.y};
        const abLen=dist(A,B),acLen=dist(A,C);
        const t=abLen/(abLen+acLen);
        const Db={x:B.x+t*(C.x-B.x),y:B.y+t*(C.y-B.y)};
        const D=ex.markType==='height'?Dh:ex.markType==='median'?Dm:Db;
        return <>
          <div className="graph-wrap">
            <div style={{position:'relative',width:'100%',maxWidth:640}}>
            <TriSVG verts={verts}/>
            <SvgOverlay>
              <line x1={A.x} y1={A.y} x2={D.x} y2={D.y} stroke="#334155" strokeWidth="2"/>
              {ex.markType==='height'&&<path d={rightAngleMark(D,A,C,14)} fill="none" stroke="#7c3aed" strokeWidth="1.5"/>}
              {ex.markType==='median'&&[...tickMarks(B,D,1),...tickMarks(D,C,1)].map((t,i)=>
                <line key={'tm'+i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#2563eb" strokeWidth="2"/>)}
              {ex.markType==='bisector'&&[0,1].flatMap(k=>[
                <path key={'b1'+k} d={angleArcAtVertex(A.x,A.y,B,D,18+k*5).path} fill="none" stroke="#7c3aed" strokeWidth="1.2"/>,
                <path key={'b2'+k} d={angleArcAtVertex(A.x,A.y,D,C,18+k*5).path} fill="none" stroke="#7c3aed" strokeWidth="1.2"/>,
              ])}
            </SvgOverlay>
            </div>
          </div>
          <p className="hint" style={{fontWeight:600}}>מה ניתן להסיק מהסימון באיור על הקטע AD?</p>
          {!allDone&&<div className="choice-row">
            <button className={`choice-btn ${chosen==='height'?'active':''}`} onClick={()=>{setChosen('height');setFb(null);}}>AD הוא גובה</button>
            <button className={`choice-btn ${chosen==='median'?'active':''}`} onClick={()=>{setChosen('median');setFb(null);}}>AD הוא תיכון</button>
            <button className={`choice-btn ${chosen==='bisector'?'active':''}`} onClick={()=>{setChosen('bisector');setFb(null);}}>AD הוא חוצה זווית</button>
          </div>}
        </>;
      })()}

      {ex.sub==='legAngle'&&(()=>{
        const verts=buildIsoVerts(ex.leg,ex.base);
        const[A,B]=verts;
        const M={x:(verts[1].x+verts[2].x)/2,y:verts[1].y};
        const arc=angleArcAtVertex(A.x,A.y,B,M,10,5);
        // the label sits at a FIXED small offset from A (not the arc's own
        // geometry-dependent midpoint) so it can never drift toward the base
        // angle's own label as the triangle's proportions change
        const labelX=A.x-9,labelY=A.y+12;
        return <>
          <div className="graph-wrap">
            <div style={{position:'relative',width:'100%',maxWidth:640}}>
            <TriSVG verts={verts} angleVals={[null,ex.baseAngle+'°',ex.baseAngle+'°']} equalSides={[1,0,1]} heightLine={{from:A,to:M}}/>
            <SvgOverlay>
              <path d={arc.path} fill="none" stroke="#dc2626" strokeWidth="1.8"/>
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" fill="#dc2626">?</text>
            </SvgOverlay>
            </div>
          </div>
          <p className="hint">זווית הבסיס = {ex.baseAngle}°. AM הוא הגובה לבסיס. מצאו את הזווית בין הגובה AM לשוק AB (מסומנת ? באיור, בצבע אדום).</p>
          <div className="ans-row">
            <span style={{fontWeight:600}}>הזווית =</span>
            <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} disabled={allDone} style={{width:55}}
              onKeyDown={e=>e.key==='Enter'&&!allDone&&checkStep()}/><span>°</span>
          </div>
          {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
            ✓ 90 - {ex.baseAngle} = {ex.answer}°</div></div>}
        </>;
      })()}

      {ex.sub==='baseAngleHalf'&&(()=>{
        const verts=buildIsoVerts(ex.leg,ex.base);
        const[A,B]=verts;
        const M={x:(verts[1].x+verts[2].x)/2,y:verts[1].y};
        const arc=angleArcAtVertex(A.x,A.y,B,M,10,5);
        const labelX=A.x-9,labelY=A.y+12;
        return <>
          <div className="graph-wrap">
            <div style={{position:'relative',width:'100%',maxWidth:640}}>
            <TriSVG verts={verts} angleVals={[null,'?','?']} equalSides={[1,0,1]} equalAngles={[0,1,1]} heightLine={{from:A,to:M}}/>
            <SvgOverlay>
              <path d={arc.path} fill="none" stroke="#dc2626" strokeWidth="1.8"/>
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="700" fill="#dc2626">{ex.half}°</text>
            </SvgOverlay>
            </div>
          </div>
          <p className="hint">AM הוא הגובה לבסיס, וחוצה את זווית הראש. מחצית זווית הראש (מסומנת באדום) = {ex.half}°. מצאו את זווית הבסיס.</p>
          <div className="ans-row">
            <span style={{fontWeight:600}}>זווית הבסיס =</span>
            <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} disabled={allDone} style={{width:55}}
              onKeyDown={e=>e.key==='Enter'&&!allDone&&checkStep()}/><span>°</span>
          </div>
          {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
            ✓ 90 - {ex.half} = {ex.answer}°</div></div>}
        </>;
      })()}

      {ex.sub==='baseLength'&&(()=>{
        const verts=buildIsoVerts(ex.leg,ex.base);
        const[A,B,C]=verts;
        const M={x:(B.x+C.x)/2,y:B.y};
        const centroid={x:(A.x+B.x+C.x)/3,y:(A.y+B.y+C.y)/3};
        const halfLabelPos=sideLabel(B,M,16,centroid);
        return <>
          <div className="graph-wrap">
            <div style={{position:'relative',width:'100%',maxWidth:640}}>
            <TriSVG verts={verts} equalSides={[1,0,1]}
              sideVals={ex.dir==='fullToHalf'?[null,ex.base,null]:null}
              heightLine={{from:A,to:M}}/>
            {ex.dir==='halfToFull'&&<SvgOverlay>
              <text x={halfLabelPos.x} y={halfLabelPos.y} textAnchor={halfLabelPos.anchor} dominantBaseline={halfLabelPos.baseline}
                fontSize="13" fontWeight="600" fill="#334155">{ex.half}</text>
            </SvgOverlay>}
            </div>
          </div>
          {ex.dir==='halfToFull'?<>
            <p className="hint">AM הוא הגובה לבסיס BC. חצי הבסיס BM = {ex.half}. מצאו את אורך הבסיס המלא BC.</p>
            <div className="ans-row">
              <span style={{fontWeight:600}}>BC =</span>
              <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} disabled={allDone} style={{width:55}}
                onKeyDown={e=>e.key==='Enter'&&!allDone&&checkStep()}/>
            </div>
          </>:<>
            <p className="hint">AM הוא הגובה לבסיס BC. הבסיס BC = {ex.base}. מצאו את אורך חצי הבסיס BM.</p>
            <div className="ans-row">
              <span style={{fontWeight:600}}>BM =</span>
              <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} disabled={allDone} style={{width:55}}
                onKeyDown={e=>e.key==='Enter'&&!allDone&&checkStep()}/>
            </div>
          </>}
          {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
            ✓ AM גובה ⟵ גם תיכון ⟵ BM = MC = {ex.half}, BC = {ex.base}</div></div>}
        </>;
      })()}

      {!allDone&&<div className="center" style={{marginTop:8}}><button className="btn bg" onClick={checkStep}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

function ChIsoHeightTab(){
  const [part,setPart]=useState(0);
  const labels=['גובה/תיכון/חוצה זווית','זווית גובה-שוק','זווית בסיס ממחצית','אורך הבסיס'];
  const subs=['classify','legAngle','baseAngleHalf','baseLength'];
  return <div>
    <div className="content" style={{marginBottom:-14}}>
      <div className="sub-tabs">
        {labels.map((l,i)=><button key={i} className={`sub-tab-btn ${part===i?'active':''}`} onClick={()=>setPart(i)}>{l}</button>)}
      </div>
    </div>
    <IsoHeightExercise key={subs[part]} forceSub={subs[part]}/>
  </div>;
}

function ChIsosceles(){
  const [part,setPart]=useState(0);
  const labels=['הגדרות ותכונות','הגובה לבסיס'];
  return <div>
    <div className="content" style={{marginBottom:-14}}>
      <div className="sub-tabs">
        {labels.map((l,i)=><button key={i} className={`sub-tab-btn ${part===i?'active':''}`} onClick={()=>setPart(i)}>{l}</button>)}
      </div>
    </div>
    {part===0?<ChIsoBasics key="basics"/>:<ChIsoHeightTab key="height"/>}
  </div>;
}

// one side is an algebraic expression in x, the other two are the same
// known number — since the triangle is equilateral, that expression must
// equal that number, giving a single unambiguous equation to write & solve
function genChEquilateral(){
  const quantity=pick(['side','angle']);
  const unknownIdx=randInt(0,2);
  const phrasing=pick(['given','forWhich']);
  if(quantity==='angle'){
    // one angle is an algebraic expression; equilateral ⇒ every angle is
    // 60°, so the expression must equal 60 — derive b from x so it's exact
    const x=randInt(4,15);
    const a=pick([1,2,3]);
    const b=60-a*x;
    return{quantity,x,a,b,unknownIdx,phrasing};
  }
  let x,a,b,knownSide;
  for(let tries=0;tries<200;tries++){
    x=randInt(4,15);
    a=pick([1,2,3]);
    b=randInt(-15,20);
    knownSide=a*x+b;
    if(knownSide>=3&&knownSide<=60)break;
  }
  return{quantity,x,a,b,knownSide,unknownIdx,phrasing};
}

function buildEquiVerts(side,W=340,H=280){
  // fills the available box (not a flat px-per-unit cap) — same principle
  // as buildIsoVerts/buildRightVerts, so a small numeric side still draws
  // a large triangle
  const topMargin=H*(35/280),bottomMargin=H*(50/280);
  const availW=W*(280/340),availH=H-topMargin-bottomMargin;
  const heightUnits=side*Math.sqrt(3)/2;
  const sc=Math.min(availW/side,availH/heightUnits);
  const B={x:W/2-side*sc/2,y:H-bottomMargin};
  const C={x:W/2+side*sc/2,y:H-bottomMargin};
  const h=heightUnits*sc;
  const A={x:W/2,y:H-bottomMargin-h};
  return[A,B,C];
}

function ChEquilateral(){
  const [ex,setEx]=useState(()=>genChEquilateral());
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [showInfo,setShowInfo]=useState(true);
  const [eqText,setEqText]=useState('');
  const [cur,setCur]=useState(null);
  const [opType,setOpType]=useState('+');
  const [opVal,setOpVal]=useState('');
  const [opIsX,setOpIsX]=useState(false);
  const [opErr,setOpErr]=useState('');
  const solved=useMemo(()=>cur?slvCheckSolved(cur):null,[cur]);
  const canSimpAny=cur?(slvCanSimp(cur.left)||slvCanSimp(cur.right)):false;

  const reset=()=>{
    setEx(genChEquilateral());setFb(null);setPhase(0);setEqText('');
    setCur(null);setOpVal('');setOpErr('');setOpType('+');setOpIsX(false);
  };
  const totalSteps=2;
  const allDone=phase>=totalSteps;

  const setOpValClean=v=>{setOpVal(v);setOpErr('');};
  const setOpTypeClean=t=>{setOpType(t);setOpErr('');if(t==='×'||t==='÷')setOpIsX(false);};
  const toggleOpIsX=()=>{setOpIsX(v=>!v);setOpErr('');};
  const applyOp=()=>{
    const v=opVal.trim();
    if(!/^-?\d+$/.test(v)){setOpErr('הזינו מספר שלם');return;}
    const k=parseInt(v,10);
    if(k===0){setOpErr('בחרו מספר שאינו אפס');return;}
    const isX=opIsX&&(opType==='+'||opType==='−');
    setCur(c=>slvDoOperate(c,opType,k,isX));
    setOpVal('');setOpErr('');setOpIsX(false);
  };
  const handleSimplify=()=>{
    setCur(c=>({left:slvCanSimp(c.left)?slvDoSimplify(c.left):c.left,right:slvCanSimp(c.right)?slvDoSimplify(c.right):c.right}));
  };
  const finishSolve=()=>{setPhase(2);setFb(null);};
  const targetConst=ex.quantity==='angle'?60:ex.knownSide;
  const checkEq=()=>{
    const target={L:{coeff:ex.a,c:ex.b},R:{coeff:0,c:targetConst}};
    const ok=checkLinearEquation(eqText,target.L,target.R);
    if(ok){
      setFb('ok');
      setTimeout(()=>{
        const left=[slvMkTerm('x',ex.a)];
        if(ex.b!==0)left.push(slvMkTerm('const',ex.b));
        setCur({left,right:[slvMkTerm('const',targetConst)]});
        setPhase(1);setFb(null);
      },600);
    } else setFb('err');
  };

  const verts=buildEquiVerts(12);
  const exprText=fmtExpr({a:ex.a,b:ex.b});
  const sideVals=ex.quantity==='side'
    ?[0,1,2].map(i=>i===ex.unknownIdx?(allDone?ex.knownSide:exprText):ex.knownSide)
    :null;
  const angleVals=ex.quantity==='angle'
    ?[0,1,2].map(i=>i===ex.unknownIdx?(allDone?'60°':exprText):'60°')
    :null;

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>📐 משולש שווה צלעות</h3>
      <p>במשולש שווה צלעות שלוש הצלעות שוות, ושלוש הזוויות שוות ל-60° כל אחת.</p>
      <div className="graph-wrap">
        <TriSVG verts={buildEquiVerts(10)} equalSides={[1,1,1]} angleVals={['60°','60°','60°']}/>
      </div>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}
    <div className="card">
      <div className="card-t">מציאת x במשולש שווה צלעות</div>
      <div className="graph-wrap">
        <TriSVG verts={verts} sideVals={sideVals} angleVals={angleVals} equalSides={[1,1,1]}/>
      </div>

      {ex.phrasing==='given'
        ?<p className="hint">המשולש הבא הוא שווה צלעות. מצאו את x.</p>
        :<p className="hint">עבור איזה ערך של x המשולש הבא הוא שווה צלעות?</p>}

      <div className={`step-card ${phase>0?'done':''}`}>
        <div className="step-label">שלב 1 — כתבו משוואה מתאימה למציאת x</div>
        {phase===0?<div className="ans-row">
          <input value={eqText} onChange={e=>{setEqText(e.target.value);setFb(null);}} style={{width:220,direction:'ltr'}}
            onKeyDown={e=>e.key==='Enter'&&checkEq()}/>
        </div>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ המשוואה נכתבה</div>}
      </div>

      {phase>=1&&<div className={`step-card ${phase>1?'done':''}`}>
        <div className="step-label">שלב 2 — פתרו את המשוואה כדי למצוא את x</div>
        {phase===1?<>
          <div className="slv-grid">
            {solved===null&&<>
              <div className="slv-left"><SlvOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
              <div></div>
              <div className="slv-right"><SlvOpBox opType={opType} opVal={opVal} opIsX={opIsX} onOpType={setOpTypeClean} onOpVal={setOpValClean} onToggleX={toggleOpIsX}/></div>
            </>}
            <div className="slv-left slv-zone">{cur.left.map((t,i)=><SlvTermPill key={t.id} term={t} index={i}/>)}</div>
            <span className="slv-eqsign">=</span>
            <div className="slv-right slv-zone">{cur.right.map((t,i)=><SlvTermPill key={t.id} term={t} index={i}/>)}</div>
          </div>
          {opErr&&<div className="fb err">{opErr}</div>}
          {solved===null?
            <div className="center" style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button className="btn bg" onClick={applyOp}>✓ אישור</button>
              <button className="btn" style={{background:'#e5e7eb',color:'#374151'}} disabled={!canSimpAny} onClick={handleSimplify}>פשט</button>
            </div>
          :<>
            <div className="ans-row" style={{color:'#16a34a',fontWeight:700,fontSize:18}}>✓ x = {solved}</div>
            <div className="center" style={{marginTop:8}}><button className="btn bg" onClick={finishSolve}>המשך ›</button></div>
          </>}
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ x = {ex.x}</div>}
      </div>}

      {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
        {ex.quantity==='side'?<>✓ כל הצלעות שוות ל-{ex.knownSide}</>:<>✓ כל הזוויות שוות ל-60°</>}</div></div>}

      {phase===0&&<div className="center" style={{marginTop:8}}><button className="btn bg" onClick={checkEq}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

function ChSpecialTriangles(){
  const [part,setPart]=useState(0);
  const labels=['ישר זווית','שווה שוקיים','שווה צלעות'];
  return <div>
    <div className="content" style={{marginBottom:-14}}>
      <div className="sub-tabs">
        {labels.map((l,i)=><button key={i} className={`sub-tab-btn ${part===i?'active':''}`} onClick={()=>setPart(i)}>{l}</button>)}
      </div>
    </div>
    {part===0?<ChRightAngle key="right"/>:part===1?<ChIsosceles key="iso"/>:<ChEquilateral key="equi"/>}
  </div>;
}

/* ═══ Chapter 3: Triangle Congruence ═══ */
const theorems=['צ.צ.צ','צ.ז.צ','ז.צ.ז','צ.צ.ז','ז.ז.צ'];
const theoremNames={
  'צ.צ.צ':'שלוש צלעות שוות (SSS)',
  'צ.ז.צ':'שתי צלעות והזווית הכלואה (SAS)',
  'ז.צ.ז':'שתי זוויות והצלע הכלואה (ASA)',
  'צ.צ.ז':'שתי צלעות וזווית מול הגדולה (SSA)',
  'ז.ז.צ':'שתי זוויות וצלע לא כלואה (AAS)'
};

function genCh3(){
  const sub=pick(['identify','complete','calculate']);
  const theorem=pick(theorems);

  // Generate a triangle
  const a=randInt(30,80),b=randInt(30,120-a);
  const c=180-a-b;
  const s1=randInt(4,12),s2=randInt(4,12),s3=randInt(4,12);

  if(sub==='identify'){
    // Mark sides and angles according to the theorem
    let marks={sides:[0,0,0],angles:[0,0,0]};
    if(theorem==='צ.צ.צ') marks={sides:[1,2,3],angles:[0,0,0]};
    else if(theorem==='צ.ז.צ') marks={sides:[1,0,2],angles:[0,0,1]}; // two sides + included angle
    else if(theorem==='ז.צ.ז') marks={sides:[0,1,0],angles:[1,0,2]}; // two angles + included side
    else if(theorem==='צ.צ.ז') marks={sides:[1,2,0],angles:[1,0,0]}; // two sides + angle opposite longer
    else marks={sides:[0,0,1],angles:[1,2,0]}; // AAS: two angles + non-included side
    return{sub,theorem,marks,angles:[a,b,c],sides:[s1,s2,s3]};
  }
  if(sub==='complete'){
    // Show partial marks, ask what's missing
    let given={sides:[0,0,0],angles:[0,0,0]};
    let missing='';
    let missingType='';
    let missingIdx=0;
    if(theorem==='צ.צ.צ'){given={sides:[1,2,0],angles:[0,0,0]};missing='צלע c';missingType='side';missingIdx=2;}
    else if(theorem==='צ.ז.צ'){given={sides:[1,0,2],angles:[0,0,0]};missing='הזווית הכלואה';missingType='angle';missingIdx=2;}
    else if(theorem==='ז.צ.ז'){given={sides:[0,0,0],angles:[1,0,2]};missing='הצלע הכלואה';missingType='side';missingIdx=1;}
    else if(theorem==='צ.צ.ז'){given={sides:[1,2,0],angles:[0,0,0]};missing='זווית מול הצלע הגדולה';missingType='angle';missingIdx=0;}
    else{given={sides:[0,0,0],angles:[1,0,2]};missing='צלע (לא כלואה)';missingType='side';missingIdx=2;}
    const options=[
      {text:'צלע נוספת',correct:missingType==='side'},
      {text:'הזווית הכלואה',correct:missing==='הזווית הכלואה'},
      {text:'זווית מול הצלע הגדולה',correct:missing==='זווית מול הצלע הגדולה'},
      {text:'הצלע הכלואה',correct:missing==='הצלע הכלואה'},
    ].filter(o=>o.correct||Math.random()>0.3).slice(0,4);
    if(!options.find(o=>o.correct)) options[0]={text:missing,correct:true};
    return{sub,theorem,given,missing,missingType,options:options.sort(()=>Math.random()-0.5),angles:[a,b,c],sides:[s1,s2,s3]};
  }
  // calculate
  const corr=randInt(4,12); // corresponding side/angle value
  const calcAngle=180-a-b;
  return{sub,theorem,angles:[a,b,c],sides:[s1,s2,s3],
    givenVal:s1,answerVal:s1,answerAngle:a, // triangle 2 corresponding values
    corrSide:s1,corrAngle:a};
}

function DualTriSVG({marks1,marks2,angles,sides,labels1=['A','B','C'],labels2=['D','E','F'],W=380,H=250}){
  const verts1=vertsFromAngles(angles).map(v=>({x:v.x*0.5+10,y:v.y*0.85+10}));
  const verts2=vertsFromAngles(angles).map(v=>({x:v.x*0.5+200,y:v.y*0.85+10}));

  const drawTri=(verts,labels,marks,xoff)=>{
    const [A,B,C]=verts;
    const allSides=[[A,B],[B,C],[A,C]];
    return <g>
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="rgba(37,99,235,0.05)" stroke="#2563eb" strokeWidth="2"/>
      {/* Tick marks */}
      {marks.sides&&marks.sides.map((count,i)=>{
        if(!count)return null;
        return tickMarks(allSides[i][0],allSides[i][1],count).map((t,j)=>
          <line key={`t${xoff}${i}${j}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#dc2626" strokeWidth="2"/>);
      })}
      {/* Angle arcs */}
      {marks.angles&&marks.angles.map((count,i)=>{
        if(!count)return null;
        const angleVerts=[[A,B,C],[B,C,A],[C,A,B]];
        const [vert,p1,p2]=angleVerts[i];
        const arcs=[];
        for(let k=0;k<count;k++){
          const arc=angleArcAtVertex(vert.x,vert.y,p1,p2,14+k*5);
          arcs.push(<path key={`a${xoff}${i}${k}`} d={arc.path} fill="none" stroke="#7c3aed" strokeWidth="1.5"/>);
        }
        return arcs;
      })}
      {/* Labels */}
      {labels.map((l,i)=>{
        const v=verts[i];
        const cx=(A.x+B.x+C.x)/3,cy=(A.y+B.y+C.y)/3;
        const dx=v.x-cx,dy=v.y-cy;
        const m=Math.sqrt(dx*dx+dy*dy)||1;
        return <text key={`l${xoff}${i}`} x={v.x+dx/m*14} y={v.y+dy/m*14} textAnchor="middle"
          dominantBaseline="middle" fontSize="12" fontWeight="700" fill="#1e3a5f">{l}</text>;
      })}
    </g>;
  };

  // same responsive-width rule as TriSVG: the default (380×280) canvas is
  // the only size this component is ever called at, so it always gets to
  // fill up to the wider cap instead of sitting fixed at 380px
  const isDefaultCanvas=W===380&&H===250;
  const svgStyle=isDefaultCanvas
    ?{width:'100%',maxWidth:680,height:'auto',display:'block',direction:'ltr'}
    :{width:Math.min(W,380),height:'auto',direction:'ltr'};
  return <svg viewBox={`0 0 ${W} ${H}`} style={svgStyle}>
    {drawTri(verts1,labels1,marks1||{sides:[0,0,0],angles:[0,0,0]},0)}
    {drawTri(verts2,labels2,marks2||{sides:[0,0,0],angles:[0,0,0]},1)}
    <text x={verts1[0].x} y={H-5} textAnchor="middle" fontSize="11" fill="#6b7280">△{labels1.join('')}</text>
    <text x={verts2[0].x} y={H-5} textAnchor="middle" fontSize="11" fill="#6b7280">△{labels2.join('')}</text>
  </svg>;
}

function Ch3(){
  const [ex,setEx]=useState(()=>genCh3());
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [a1,setA1]=useState('');
  const [chosen,setChosen]=useState(null);
  const [showInfo,setShowInfo]=useState(true);
  const [expandedTheorem,setExpandedTheorem]=useState(null);

  const reset=()=>{setEx(genCh3());setFb(null);setPhase(0);setA1('');setChosen(null);};
  const advance=()=>{setPhase(p=>p+1);setFb(null);setA1('');setChosen(null);};
  const allDone=phase>=1;

  const checkStep=()=>{
    if(ex.sub==='identify'){
      if(chosen===ex.theorem){setFb('ok');setTimeout(advance,600);}else setFb('err');
    } else if(ex.sub==='complete'){
      const opt=ex.options.find(o=>o.text===chosen);
      if(opt&&opt.correct){setFb('ok');setTimeout(advance,600);}else setFb('err');
    } else {
      if(parseInt(a1)===ex.corrSide){setFb('ok');setTimeout(advance,600);}else setFb('err');
    }
  };

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>📐 חפיפת משולשים</h3>
      <p>שני משולשים חופפים אם ניתן להתאים ביניהם כך שכל הצלעות והזוויות שווים.</p>
      <div className="theorem-cards">
        {theorems.map(t=><div key={t} className={`theorem-card ${expandedTheorem===t?'expanded':''}`}
          onClick={()=>setExpandedTheorem(expandedTheorem===t?null:t)}>
          <h4>{t}</h4>
          {expandedTheorem===t&&<p>{theoremNames[t]}</p>}
        </div>)}
      </div>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="card">
      <div className="card-t">{ex.sub==='identify'?'זיהוי משפט חפיפה':ex.sub==='complete'?'השלמת נתונים':'חישוב מחפיפה'}</div>
      <div className="graph-wrap">
        <DualTriSVG marks1={ex.sub==='identify'?ex.marks:ex.given} marks2={ex.sub==='identify'?ex.marks:ex.given} angles={ex.angles}/>
      </div>

      {ex.sub==='identify'&&<>
        <p className="hint">הסימונים מראים אלמנטים שווים. על פי איזה משפט המשולשים חופפים?</p>
        {!allDone&&<div className="choice-row">
          {theorems.map(t=><button key={t} className={`choice-btn ${chosen===t?'active':''}`}
            onClick={()=>{setChosen(t);setFb(null);}}>{t}</button>)}
        </div>}
        {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.theorem} — {theoremNames[ex.theorem]}</div></div>}
      </>}

      {ex.sub==='complete'&&<>
        <p className="hint">כדי להוכיח חפיפה לפי {ex.theorem}, מה עוד צריך לדעת?</p>
        {!allDone&&<div className="choice-row">
          {ex.options.map((o,i)=><button key={i} className={`choice-btn ${chosen===o.text?'active':''}`}
            onClick={()=>{setChosen(o.text);setFb(null);}}>{o.text}</button>)}
        </div>}
        {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.missing}</div></div>}
      </>}

      {ex.sub==='calculate'&&<>
        <p className="hint">המשולשים חופפים. AB = {ex.corrSide}. מצא את DE.</p>
        {!allDone&&<div className="ans-row">
          <span style={{fontWeight:600}}>DE =</span>
          <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}}
            onKeyDown={e=>e.key==='Enter'&&checkStep()}/>
        </div>}
        {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ DE = {ex.corrSide}</div></div>}
      </>}

      {!allDone&&<div className="center" style={{marginTop:8}}><button className="btn bg" onClick={checkStep}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══ Chapter 4: Types of Triangles ═══ */
function classifyByAngles(angles){
  if(angles.some(a=>a===90))return'ישר זווית';
  if(angles.some(a=>a>90))return'קהה זווית';
  return'חד זווית';
}
function classifyBySides(sides){
  const s=[...sides].sort((a,b)=>a-b);
  if(s[0]===s[1]&&s[1]===s[2])return'שווה צלעות';
  if(s[0]===s[1]||s[1]===s[2])return'שווה שוקיים';
  return'שונה צלעות';
}

function genCh4(){
  const sub=pick(['classify','build']);
  if(sub==='classify'){
    // Generate triangle with known classification
    const type=pick(['acute','right','obtuse']);
    let angles,sides;
    if(type==='right'){
      const a=randInt(20,70);
      angles=[90,a,90-a];
      const triple=pick(pyTriples);
      sides=[triple[2],triple[0],triple[1]];
    } else if(type==='obtuse'){
      const big=randInt(95,150);
      const rest=180-big;
      const a=randInt(Math.max(10,rest-70),Math.min(70,rest-10));
      angles=[big,a,rest-a];
      sides=[randInt(4,10),randInt(4,10),randInt(4,10)];
    } else {
      const a=randInt(35,75),b=randInt(35,Math.min(80,175-a));
      angles=[a,b,180-a-b];
      sides=[randInt(4,10),randInt(4,10),randInt(4,10)];
    }
    // Make sides match classification
    const sideType=pick(['equilateral','isosceles','scalene']);
    if(sideType==='equilateral'){sides=[7,7,7];angles=[60,60,60];}
    else if(sideType==='isosceles'){
      const leg=randInt(5,12);sides=[leg,leg,randInt(3,leg*2-1)];
      if(sides[2]===leg)sides[2]=leg+1;
    }
    else{
      // ensure all different
      sides=[randInt(4,8),randInt(9,12),randInt(13,16)];
      // verify triangle inequality
      if(sides[0]+sides[1]<=sides[2])sides[0]=sides[2]-1;
    }
    return{sub,angles,sides,byAngles:classifyByAngles(angles),bySides:classifyBySides(sides)};
  }
  // build: target condition
  const targets=[
    {byAngles:'ישר זווית',bySides:'שווה שוקיים'},
    {byAngles:'חד זווית',bySides:'שווה צלעות'},
    {byAngles:'קהה זווית',bySides:'שווה שוקיים'},
    {byAngles:'חד זווית',bySides:'שונה צלעות'},
  ];
  const target=pick(targets);
  return{sub,...target};
}

function Ch4(){
  const [ex,setEx]=useState(()=>genCh4());
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [chosenAngle,setChosenAngle]=useState(null);
  const [chosenSide,setChosenSide]=useState(null);
  const [showInfo,setShowInfo]=useState(true);
  // For drag exercise
  const [dragPt,setDragPt]=useState({x:170,y:60});
  const svgRef=useRef(null);
  const [dragging,setDragging]=useState(false);

  const reset=()=>{setEx(genCh4());setFb(null);setPhase(0);setChosenAngle(null);setChosenSide(null);setDragPt({x:170,y:60});};
  const advance=()=>{setPhase(p=>p+1);setFb(null);};
  const allDone=phase>=1;

  const angleOptions=['חד זווית','ישר זווית','קהה זווית'];
  const sideOptions=['שווה צלעות','שווה שוקיים','שונה צלעות'];

  const checkStep=()=>{
    if(ex.sub==='classify'){
      const aOk=chosenAngle===ex.byAngles;
      const sOk=chosenSide===ex.bySides;
      if(aOk&&sOk){setFb('ok');setTimeout(advance,600);}else setFb('err');
    } else {
      // build: check if dragged triangle meets conditions
      const B={x:100,y:220},C={x:260,y:220},A=dragPt;
      const sides=[dist(A,B),dist(A,C),dist(B,C)];
      const s=sides.map(Math.round);
      // Calculate angles using law of cosines
      const ab=dist(A,B),ac=dist(A,C),bc=dist(B,C);
      const angA=Math.round(Math.acos((ab*ab+ac*ac-bc*bc)/(2*ab*ac))*180/Math.PI);
      const angB=Math.round(Math.acos((ab*ab+bc*bc-ac*ac)/(2*ab*bc))*180/Math.PI);
      const angC=180-angA-angB;
      const byA=classifyByAngles([angA,angB,angC]);
      const byS=classifyBySides(s);
      if(byA===ex.byAngles&&byS===ex.bySides){setFb('ok');setTimeout(advance,600);}else setFb('err');
    }
  };

  const handleMouseDown=e=>{
    if(ex.sub!=='build'||allDone)return;
    setDragging(true);
  };
  const handleMouseMove=useCallback(e=>{
    if(!dragging||!svgRef.current)return;
    const rect=svgRef.current.getBoundingClientRect();
    const scaleX=340/rect.width;
    const scaleY=280/rect.height;
    let x=(e.clientX-rect.left)*scaleX;
    let y=(e.clientY-rect.top)*scaleY;
    x=Math.max(20,Math.min(320,x));
    y=Math.max(20,Math.min(200,y));
    setDragPt({x,y});
  },[dragging]);
  const handleMouseUp=useCallback(()=>setDragging(false),[]);

  useEffect(()=>{
    if(dragging){
      window.addEventListener('mousemove',handleMouseMove);
      window.addEventListener('mouseup',handleMouseUp);
      window.addEventListener('touchmove',e=>{
        const t=e.touches[0];
        handleMouseMove({clientX:t.clientX,clientY:t.clientY});
      });
      window.addEventListener('touchend',handleMouseUp);
      return()=>{
        window.removeEventListener('mousemove',handleMouseMove);
        window.removeEventListener('mouseup',handleMouseUp);
      };
    }
  },[dragging,handleMouseMove,handleMouseUp]);

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>📐 סוגי משולשים</h3>
      <p><strong>סוגי זוויות:</strong> זווית חדה — קטנה מ-90°. זווית ישרה — בדיוק 90°. זווית קהה — גדולה מ-90° (וקטנה מ-180°).</p>
      <p><strong>לפי זוויות:</strong> חד זווית (כל הזוויות חדות), ישר זווית (זווית אחת 90°), קהה זווית (זווית אחת קהה)</p>
      <p style={{textAlign:'center',fontWeight:600,marginTop:4}}>לדוגמה:</p>
      <TriTypeExample/>
      <p><strong>לפי צלעות:</strong> שווה צלעות (3 שוות), שווה שוקיים (2 שוות), שונה צלעות (אף אחת לא שווה)</p>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="card">
      <div className="card-t">{ex.sub==='classify'?'סיווג משולש':'בנה משולש לפי תנאים'}</div>

      {ex.sub==='classify'&&(()=>{
        const verts=vertsFromAngles(ex.angles);
        return <>
          <div className="graph-wrap">
            <TriSVG verts={verts} angleVals={ex.angles.map(a=>a+'°')} sideVals={ex.sides}/>
          </div>
          <p className="hint">סווג את המשולש:</p>
          <div style={{marginBottom:10}}>
            <p className="hint" style={{fontWeight:600}}>לפי זוויות:</p>
            <div className="choice-row">
              {angleOptions.map(o=><button key={o} className={`choice-btn ${chosenAngle===o?'active':''}`}
                onClick={()=>{setChosenAngle(o);setFb(null);}}>{o}</button>)}
            </div>
          </div>
          <div>
            <p className="hint" style={{fontWeight:600}}>לפי צלעות:</p>
            <div className="choice-row">
              {sideOptions.map(o=><button key={o} className={`choice-btn ${chosenSide===o?'active':''}`}
                onClick={()=>{setChosenSide(o);setFb(null);}}>{o}</button>)}
            </div>
          </div>
          {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
            ✓ {ex.byAngles} + {ex.bySides}</div></div>}
        </>;
      })()}

      {ex.sub==='build'&&(()=>{
        const B={x:100,y:220},C={x:260,y:220},A=dragPt;
        const sides=[Math.round(dist(A,B)),Math.round(dist(A,C)),Math.round(dist(B,C))];
        const ab=dist(A,B),ac=dist(A,C),bc=dist(B,C);
        let angA=0,angB=0,angC=0;
        if(ab>0&&ac>0&&bc>0){
          const cosA=(ab*ab+ac*ac-bc*bc)/(2*ab*ac);
          angA=Math.round(Math.acos(Math.max(-1,Math.min(1,cosA)))*180/Math.PI);
          const cosB=(ab*ab+bc*bc-ac*ac)/(2*ab*bc);
          angB=Math.round(Math.acos(Math.max(-1,Math.min(1,cosB)))*180/Math.PI);
          angC=180-angA-angB;
        }
        const byA=classifyByAngles([angA,angB,angC]);
        const byS=classifyBySides(sides);
        return <>
          <p className="hint" style={{fontWeight:600,fontSize:15,color:'#0369a1'}}>
            בנה משולש: {ex.byAngles} + {ex.bySides}</p>
          <p className="drag-hint">גרור את הקודקוד העליון</p>
          <div className="graph-wrap">
            <svg ref={svgRef} viewBox="0 0 340 250" style={{width:'100%',maxWidth:640,height:'auto',display:'block',direction:'ltr',touchAction:'none'}}>
              <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
                fill="rgba(37,99,235,0.08)" stroke="#2563eb" strokeWidth="2"/>
              <circle cx={A.x} cy={A.y} r={8} fill={dragging?'#dc2626':'#0369a1'} stroke="#fff" strokeWidth="2"
                style={{cursor:'grab'}} onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}/>
              <circle cx={B.x} cy={B.y} r={4} fill="#334155"/>
              <circle cx={C.x} cy={C.y} r={4} fill="#334155"/>
              <text x={A.x} y={A.y-14} textAnchor="middle" fontSize="12" fill="#1e3a5f" fontWeight="700">A</text>
              <text x={B.x-10} y={B.y+14} textAnchor="middle" fontSize="12" fill="#1e3a5f" fontWeight="700">B</text>
              <text x={C.x+10} y={C.y+14} textAnchor="middle" fontSize="12" fill="#1e3a5f" fontWeight="700">C</text>
            </svg>
          </div>
          <div className="center">
            <span className="classify-badge angle">זוויות: {byA}</span>
            <span className="classify-badge side">צלעות: {byS}</span>
          </div>
          {allDone&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
            ✓ {ex.byAngles} + {ex.bySides}</div></div>}
        </>;
      })()}

      {!allDone&&<div className="center" style={{marginTop:8}}><button className="btn bg" onClick={checkStep}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}


/* ═══ App Shell ═══ */
function App(){
  const [ch,setCh]=useState(0);
  const chs=[
    {name:'1. זוויות',comp:Ch1},
    {name:'2. סוגי משולשים',comp:Ch4},
    {name:'3. משולשים מיוחדים',comp:ChSpecialTriangles},
    {name:'4. חפיפה',comp:Ch3}
  ];
  const Comp=chs[ch].comp;
  return <>
    <div className="hdr">
      <div className="hdr-title">משולשים</div>
      <div className="ch-btns">
        {chs.map((c,i)=><button key={i} className={`ch-btn ${ch===i?'active':''}`} onClick={()=>setCh(i)}>{c.name}</button>)}
      </div>
    </div>
    <Comp key={ch}/>
  </>;
}

// ===== END ORIGINAL =====
export default App;
