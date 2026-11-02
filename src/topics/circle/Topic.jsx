'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/circle.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const {useState,useEffect,useCallback}=React;

/* ═══ Utilities ═══ */
function randInt(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function pick(arr){return arr[randInt(0,arr.length-1)];}
function gcd(a,b){return b===0?Math.abs(a):gcd(b,a%b);}
function Fb({fb}){if(!fb)return null;return fb==='ok'?<div className="fb ok">✓ נכון!</div>:<div className="fb err">✗ לא נכון, נסה שוב.</div>;}

/* ═══ SVG Helpers ═══ */
function pt(cx,cy,r,deg){const a=deg*Math.PI/180;return{x:cx+r*Math.cos(a),y:cy-r*Math.sin(a)};}
function arcD(cx,cy,r,s,e){const p1=pt(cx,cy,r,s),p2=pt(cx,cy,r,e);const lg=(e-s)>180?1:0;return`M${p1.x},${p1.y} A${r},${r} 0 ${lg} 0 ${p2.x},${p2.y}`;}
function secD(cx,cy,r,s,e){const p1=pt(cx,cy,r,s),p2=pt(cx,cy,r,e);const lg=(e-s)>180?1:0;return`M${cx},${cy} L${p1.x},${p1.y} A${r},${r} 0 ${lg} 0 ${p2.x},${p2.y} Z`;}
function fmtFrac(n,d){if(d===1)return n===1?'π':n+'π';if(n===1)return'π/'+d;return n+'π/'+d;}

/* ═══ Chapter 1: Introduction ═══ */
const defs={
  'מרכז':'נקודה המרוחקת מרחק שווה מכל נקודות המעגל. מסומנת O.',
  'רדיוס':'קטע מהמרכז לנקודה על המעגל. אורכו מסומן r.',
  'קוטר':'קטע העובר דרך המרכז ומחבר שתי נקודות על המעגל. d = 2r.',
  'מיתר':'קטע המחבר שתי נקודות על המעגל (לא חייב לעבור דרך המרכז).',
  'משיק':'ישר הנוגע למעגל בנקודה אחת בלבד, בזווית ישרה לרדיוס.',
  'קשת':'חלק מקו המעגל (ההיקף) בין שתי נקודות.',
  'גזרה':'שטח הכלוא בין שני רדיוסים וקשת — כמו פרוסת פיצה.',
};

// Only the chosen part is drawn (Sulaiman, fixes board #48). quiz: no letters that give the answer away.
function ExplorerSVG({sel,rot=0,quiz=false}){
  const W=320,H=280,cx=160,cy=140,r=80,C='#0369a1';
  const pR=pt(cx,cy,r,35),pD1=pt(cx,cy,r,180),pD2=pt(cx,cy,r,0);
  const pC1=pt(cx,cy,r,120),pC2=pt(cx,cy,r,210),pT=pt(cx,cy,r,90);
  const g=`rotate(${-rot} ${cx} ${cy})`;
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:Math.min(320,W),height:'auto',direction:'ltr'}}>
    <g transform={g}>
      {sel==='גזרה'&&<><path d={secD(cx,cy,r,250,310)} fill="rgba(3,105,161,0.2)" stroke={C} strokeWidth={3}/>
        <line x1={cx} y1={cy} x2={pt(cx,cy,r,250).x} y2={pt(cx,cy,r,250).y} stroke={C} strokeWidth={2}/><line x1={cx} y1={cy} x2={pt(cx,cy,r,310).x} y2={pt(cx,cy,r,310).y} stroke={C} strokeWidth={2}/></>}
      {sel==='קשת'&&<path d={arcD(cx,cy,r+3,50,120)} fill="none" stroke="#ea580c" strokeWidth={5}/>}
    </g>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2563eb" strokeWidth={2.5}/>
    <g transform={g}>
      {sel==='משיק'&&<><line x1={pT.x-60} y1={pT.y} x2={pT.x+60} y2={pT.y} stroke={C} strokeWidth={3}/><circle cx={pT.x} cy={pT.y} r={3} fill={C}/>
        {!quiz&&<line x1={cx} y1={cy} x2={pT.x} y2={pT.y} stroke={C} strokeWidth={1} strokeDasharray="4,3"/>}</>}
      {sel==='מיתר'&&<line x1={pC1.x} y1={pC1.y} x2={pC2.x} y2={pC2.y} stroke={C} strokeWidth={3}/>}
      {sel==='קוטר'&&<line x1={pD1.x} y1={pD1.y} x2={pD2.x} y2={pD2.y} stroke={C} strokeWidth={3}/>}
      {sel==='רדיוס'&&<line x1={cx} y1={cy} x2={pR.x} y2={pR.y} stroke={C} strokeWidth={3}/>}
    </g>
    {!quiz&&sel==='קוטר'&&<text x={cx} y={cy-8} textAnchor="middle" fontSize="14" fontWeight="700" fill={C}>d</text>}
    {!quiz&&sel==='רדיוס'&&<text x={(cx+pR.x)/2+10} y={(cy+pR.y)/2-6} fontSize="14" fontWeight="700" fill={C}>r</text>}
    <circle cx={cx} cy={cy} r={sel==='מרכז'?6:3} fill={sel==='מרכז'?C:'#334155'}/>
    <text x={cx-7} y={cy-7} textAnchor="end" fontSize="14" fontWeight="700" fill="#334155">O</text>
  </svg>;
}

function genCh1(){
  const type=pick(['identify','identify','radDiam']);
  if(type==='identify'){
    // one part is drawn; the student picks its name from four (Sulaiman, fixes board #48)
    const all=Object.keys(defs);
    const target=pick(all);
    const others=all.filter(n=>n!==target);
    for(let i=others.length-1;i>0;i--){const j=randInt(0,i);[others[i],others[j]]=[others[j],others[i]];}
    const opts=[target,...others.slice(0,3)];
    for(let i=3;i>0;i--){const j=randInt(0,i);[opts[i],opts[j]]=[opts[j],opts[i]];}
    return{type,target,opts,rot:randInt(0,7)*45};
  }
  const isRtoD=Math.random()>0.5;
  const r=randInt(2,20);
  return{type,isRtoD,r,d:r*2};
}

function Ch1(){
  const [sel,setSel]=useState(null);
  const [ex,setEx]=useState(()=>genCh1());
  const [fb,setFb]=useState(null);
  const [ans,setAns]=useState('');
  const [done,setDone]=useState(false);
  const [showInfo,setShowInfo]=useState(true);

  const check=()=>{
    if(ex.type==='identify'){
      if(ans===ex.target){setFb('ok');setDone(true);}else setFb('err');
    } else {
      const expected=ex.isRtoD?ex.d:ex.r;
      if(parseInt(ans)===expected){setFb('ok');setDone(true);}else setFb('err');
    }
  };
  const reset=()=>{setEx(genCh1());setFb(null);setAns('');setDone(false);};

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>📐 היכרות עם המעגל</h3>
      <p>לחצו על הכפתורים למטה כדי לגלות את חלקי המעגל: כל חלק מופיע על המעגל כשלוחצים עליו. לאחר מכן פתרו תרגילים.</p>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="card">
      <div className="card-t">סייר במעגל</div>
      <div className="graph-wrap"><ExplorerSVG sel={sel}/></div>
      <div className="choice-row">
        {Object.keys(defs).map(k=><button key={k} className={`choice-btn ${sel===k?'active':''}`} onClick={()=>setSel(k)} style={{fontSize:12}}>{k}</button>)}
      </div>
      {sel&&<div className="elem-info"><strong>{sel}:</strong> {defs[sel]}</div>}
    </div>

    <div className="card">
      <div className="card-t">{ex.type==='identify'?'זיהוי אלמנטים':'רדיוס וקוטר'}</div>
      {ex.type==='identify'?<>
        <div className="graph-wrap"><ExplorerSVG sel={ex.target} rot={ex.rot} quiz/></div>
        <p className="hint">מה שם החלק המסומן במעגל?</p>
        <div className="choice-row">
          {ex.opts.map(n=><button key={n} className={`choice-btn ${ans===n?'active':''} ${done&&n===ex.target?'correct':''}`}
            onClick={()=>{if(!done){setAns(n);setFb(null);}}} disabled={done}>{n}</button>)}
        </div>
        {!done&&<div className="center"><button className="btn bg" disabled={!ans} onClick={check}>✓ בדוק</button></div>}
      </>:<>
        <div className="graph-wrap">
          <svg viewBox="0 0 280 200" style={{width:280,height:'auto',direction:'ltr'}}>
            <circle cx={140} cy={100} r={70} fill="none" stroke="#2563eb" strokeWidth={2.5}/>
            <circle cx={140} cy={100} r={3} fill="#334155"/>
            <text x={133} y={117} textAnchor="end" fontSize="13" fontWeight="700" fill="#334155">O</text>
            {ex.isRtoD?<>
              <line x1={140} y1={100} x2={210} y2={100} stroke="#dc2626" strokeWidth={2.5}/>
              <text x={175} y={92} fontSize="14" fontWeight="700" fill="#dc2626">r = {ex.r}</text>
            </>:<>
              <line x1={70} y1={100} x2={210} y2={100} stroke="#16a34a" strokeWidth={2.5}/>
              <text x={140} y={88} fontSize="14" fontWeight="700" fill="#16a34a" textAnchor="middle">d = {ex.d}</text>
            </>}
          </svg>
        </div>
        <p className="hint">{ex.isRtoD?`הרדיוס הוא ${ex.r} ס"מ. מה הקוטר?`:`הקוטר הוא ${ex.d} ס"מ. מה הרדיוס?`}</p>
        <div className="ans-row">
          <span style={{fontSize:16,fontWeight:600}}>{ex.isRtoD?'d':'r'} =</span>
          <input value={ans} onChange={e=>{setAns(e.target.value);setFb(null);}} disabled={done} onKeyDown={e=>e.key==='Enter'&&!done&&check()}/>
          <span>ס"מ</span>
          {!done&&<button className="btn bg" onClick={check}>✓ בדוק</button>}
        </div>
      </>}
      <Fb fb={fb}/>
      {done&&<div className="fb ok" style={{fontWeight:700}}>✓ נכון!</div>}
    </div>
    {done?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══ Chapter 2: Circumference ═══ */
// Where the angle's value goes along the middle of a sector: far enough out to
// clear both radii (small angles need more room), but still inside the circle.
function sectorLabelPos(angle,txt,size,sr){
  const w=txt.length*size*0.6, h=size, half=angle*Math.PI/360;
  const ext=(nx,ny)=>Math.abs(nx)*w/2+Math.abs(ny)*h/2;
  const r1=ext(0,1), r2=ext(Math.sin(2*half),Math.cos(2*half));
  const along=ext(Math.cos(half),Math.sin(half));
  const need=(Math.max(r1,r2)+4)/Math.max(Math.sin(Math.min(half,Math.PI/2)),0.05);
  const d=Math.max(sr*0.55, 16+along+4, need);
  return {d:Math.min(d, sr-along-5)};
}
function Frac({n,d}){
  return <span className="mp-frac"><span className="mp-frac-n">{n}</span><span className="mp-frac-d">{d}</span></span>;
}
function CircleSVG({r,rVal,label,arcHighlight,sectorAngle,sectorColor,showDiam,dVal,extra}){
  const W=300,H=260,cx=150,cy=130,sr=80;
  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:Math.min(300,W),height:'auto',direction:'ltr'}}>
    {sectorAngle&&<path d={secD(cx,cy,sr,0,sectorAngle)} fill={sectorColor||'rgba(3,105,161,0.15)'} stroke="none"/>}
    {arcHighlight&&<path d={arcD(cx,cy,sr+2,arcHighlight[0],arcHighlight[1])} fill="none" stroke="#ea580c" strokeWidth={5}/>}
    <circle cx={cx} cy={cy} r={sr} fill="none" stroke="#2563eb" strokeWidth={2.5}/>
    <circle cx={cx} cy={cy} r={3} fill="#334155"/>
    <text x={cx-7} y={sectorAngle&&!showDiam?cy+18:cy-7} textAnchor="end" fontSize="13" fontWeight="700" fill="#334155">O</text>
    <line x1={cx} y1={cy} x2={cx+sr} y2={cy} stroke="#dc2626" strokeWidth={2}/>
    <text x={cx+sr/2} y={sectorAngle&&!showDiam?cy+16:cy-8} dominantBaseline={sectorAngle&&!showDiam?'central':undefined} fontSize="14" fontWeight="700" fill="#dc2626" textAnchor="middle">{rVal!=null?'r = '+rVal:'r'}</text>
    {showDiam&&<><line x1={cx-sr} y1={cy} x2={cx+sr} y2={cy} stroke="#16a34a" strokeWidth={2}/>
      <text x={cx} y={cy+20} fontSize="14" fontWeight="700" fill="#16a34a" textAnchor="middle">{dVal!=null?'d = '+dVal:'d'}</text></>}
    {sectorAngle&&<>
      <line x1={cx} y1={cy} x2={pt(cx,cy,sr,sectorAngle).x} y2={pt(cx,cy,sr,sectorAngle).y} stroke="#dc2626" strokeWidth={2}/>
      {label&&<path d={arcD(cx,cy,16,0,sectorAngle)} fill="none" stroke="#ea580c" strokeWidth={2}/>}
      {label&&(()=>{const p=sectorLabelPos(sectorAngle,String(label),13,sr);const q=pt(cx,cy,p.d,sectorAngle/2);
        return <text x={q.x} y={q.y} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill="#ea580c">{label}</text>;})()}
    </>}
    {extra}
  </svg>;
}

function genCh2(){
  const sub=pick(['calc','findR','numerical']);
  const r=randInt(2,15);
  return{sub,r,d:2*r,circCoeff:2*r};
}

function Ch2(){
  const [ex,setEx]=useState(()=>genCh2());
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [a1,setA1]=useState('');
  const [a2,setA2]=useState('');
  const [showInfo,setShowInfo]=useState(true);

  const reset=()=>{const e=genCh2();setEx(e);setFb(null);setPhase(0);setA1('');setA2('');};
  const advance=()=>{setPhase(p=>p+1);setFb(null);setA1('');setA2('');};

  const totalSteps=ex.sub==='calc'?1:2;
  const allDone=phase>=totalSteps;

  const checkStep=()=>{
    if(ex.sub==='calc'){
      if(parseInt(a1)===ex.circCoeff){setFb('ok');setTimeout(advance,600);}else setFb('err');
    } else if(ex.sub==='findR'){
      if(phase===0){if(parseInt(a1)===ex.circCoeff){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else{if(parseInt(a1)===ex.r){setFb('ok');setTimeout(advance,600);}else setFb('err');}
    } else {
      const expected=parseFloat((2*3.14*ex.r).toFixed(1));
      const val=parseFloat(a1);
      if(!isNaN(val)&&Math.abs(val-expected)<=0.1){setFb('ok');setTimeout(advance,600);}else setFb('err');
    }
  };

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>📏 היקף המעגל</h3>
      <div className="pi-box">
        <p><b>π (פאי)</b> הוא מספר מיוחד: בכל מעגל, ההיקף גדול מהקוטר פי π בדיוק. הוא מופיע בכל בעיה שיש בה סיבוב ומחזוריות: גלגלים, שעונים, גלים.</p>
        <p><bdi dir="ltr">π ≈ 3.14159…</bdi> הוא <b>מספר ממשי אי-רציונלי</b>: אי אפשר לכתוב אותו כשבר, והספרות אחרי הנקודה לא נגמרות ולא חוזרות על עצמן. יש אנשים שמתחרים מי זוכר יותר ספרות שלו, והשיאנים זוכרים עשרות אלפי ספרות!</p>
        <p>בפרק הרדיאנים ראינו שלאורך מעגל שלם נכנסים <bdi dir="ltr">2π</bdi> רדיוסים. לכן ההיקף הוא <bdi dir="ltr">2π</bdi> כפול הרדיוס.</p>
      </div>
      <p>היקף המעגל הוא אורך קו המעגל. הנוסחה:</p>
      <div className="formula-box">C = 2πr = πd</div>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="card">
      <div className="card-t">{ex.sub==='calc'?'חישוב היקף':ex.sub==='findR'?'מציאת רדיוס מהיקף':'חישוב מספרי'}</div>
      <div className="graph-wrap"><CircleSVG rVal={ex.sub==='findR'?null:ex.r} showDiam={ex.sub==='calc'}/></div>

      {ex.sub==='calc'&&<>
        <p className="hint">r = {ex.r}. חשב את היקף המעגל:</p>
        <div className="eq-row"><span>C = 2π·{ex.r} =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} disabled={allDone} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&!allDone&&checkStep()}/> <span>π</span></div>
      </>}

      {ex.sub==='findR'&&<>
        <p className="hint">היקף המעגל הוא {ex.circCoeff}π. מצא את הרדיוס.</p>
        {phase>0&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ 2πr = {ex.circCoeff}π</div></div>}
        {phase===0&&<div className="step-card"><div className="step-label">שלב 1 — כתוב משוואה</div>
          <div className="eq-row">2πr = <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> π</div></div>}
        {phase>1&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ r = {ex.r}</div></div>}
        {phase===1&&<div className="step-card"><div className="step-label">שלב 2 — פתור</div>
          <div className="ans-row"><span>r =</span><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/></div></div>}
      </>}

      {ex.sub==='numerical'&&<>
        <p className="hint">r = {ex.r}. חשב את ההיקף לפי π ≈ 3.14</p>
        <div className="eq-row"><span>C = 2×3.14×{ex.r} =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} disabled={allDone} style={{width:70}} onKeyDown={e=>e.key==='Enter'&&!allDone&&checkStep()}/></div>
      </>}

      {!allDone&&<div className="center" style={{marginTop:8}}><button className="btn bg" onClick={checkStep}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══ Chapter 3: Area ═══ */
function genCh3(){
  const sub=pick(['calc','findR','sector']);
  if(sub==='sector'){
    const angles=[30,45,60,90,120,150,180];
    for(let i=0;i<200;i++){const angle=pick(angles);const r=randInt(2,12);const c=(angle*r*r)/360;if(Number.isInteger(c))return{sub,r,angle,fullArea:r*r,sectorArea:c};}
  }
  const r=randInt(2,12);
  return{sub,r,area:r*r};
}

// An answer typed as "25π", "25 pi", "π" or a number (π ≈ 3.14). Sulaiman, fixes board #51.
function parsePiAns(str){
  const t=(str||'').replace(/\s+/g,'').replace(/pi|פאי/gi,'π').replace(/[·*×]/g,'').replace(',','.');
  if(!t) return null;
  if(t.includes('π')){
    const m=t.match(/^(\d*\.?\d*)π$/)||t.match(/^π(\d*\.?\d*)$/);
    if(!m) return null;
    const c=m[1]===''?1:parseFloat(m[1]);
    return isNaN(c)?null:{pi:true,c};
  }
  if(!/^\d*\.?\d+$/.test(t)) return null;
  return {pi:false,v:parseFloat(t)};
}
function piMatches(p,c){
  if(!p) return false;
  if(p.pi) return Math.abs(p.c-c)<1e-9;
  return p.v>=c*3.14-0.06&&p.v<=c*3.1429+0.06;   // π as 3.14, 3.1416 or 22/7
}

// Cut the circle into slices and lay them head to tail: almost a rectangle r high and πr wide.
function AreaWhySVG(){
  const R=46,N=8,w=2*R*Math.sin(Math.PI/N),bul=R*(1-Math.cos(Math.PI/N))*2,top=14+bul,bot=top+R*Math.cos(Math.PI/N);
  const cols=['#38bdf8','#fbbf24'];
  const x0=170;
  const wedges=Array.from({length:N},(_,i)=>{
    const x=x0+i*w/2, up=i%2===0;
    const d=up?`M${x+w/2},${top} L${x+w},${bot} Q${x+w/2},${bot+bul} ${x},${bot} Z`:`M${x+w/2},${bot} L${x+w},${top} Q${x+w/2},${top-bul} ${x},${top} Z`;
    return <path key={i} d={d} fill={cols[i%2]} stroke="#fff" strokeWidth="1.5"/>;
  });
  const cx=70,cy=(top+bot)/2+2;
  const slices=Array.from({length:N},(_,i)=><path key={i} d={secD(cx,cy,R+4,i*360/N,(i+1)*360/N)} fill={cols[i%2]} stroke="#fff" strokeWidth="1.5"/>);
  const W=x0+(N+1)*w/2+14;
  return <svg viewBox={`0 0 ${W} ${bot+bul+30}`} style={{width:'100%',maxWidth:380,height:'auto',direction:'ltr'}} role="img" aria-label="מעגל חתוך לפרוסות שמסודרות כמעט כמו מלבן">
    <defs><marker id="aw" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8"/></marker></defs>
    {slices}
    <text x={cx} y={bot+bul+22} textAnchor="middle" fontSize="12" fill="#334155" direction="rtl" style={{unicodeBidi:'plaintext'}}>8 פרוסות</text>
    <path d={`M${cx+R+10},${cy} L${x0-28},${cy}`} stroke="#94a3b8" strokeWidth="2" markerEnd="url(#aw)"/>
    {wedges}
    <text x={x0-6} y={(top+bot)/2} textAnchor="end" dominantBaseline="central" fontSize="14" fontWeight="800" fill="#b91c1c">r</text>
    <text x={x0+(N+1)*w/4} y={bot+bul+22} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0369a1">πr</text>
  </svg>;
}

function Ch3(){
  const [ex,setEx]=useState(()=>genCh3());
  const [fb,setFb]=useState(null);
  const [done,setDone]=useState(false);
  const [a1,setA1]=useState('');
  const [showInfo,setShowInfo]=useState(true);
  const [why,setWhy]=useState(false);

  const reset=()=>{setEx(genCh3());setFb(null);setDone(false);setA1('');};
  const check=()=>{
    const ok=ex.sub==='findR'?parseFloat((a1||'').replace(',','.'))===ex.r
      :piMatches(parsePiAns(a1),ex.sub==='calc'?ex.area:ex.sectorArea);
    if(ok){setFb('ok');setDone(true);}else setFb('err');
  };
  const addPi=()=>{if(!done){setA1(v=>(v||'')+'π');setFb(null);}};

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>📐 שטח המעגל</h3>
      <p>שטח המעגל הוא השטח הכלוא בתוכו.</p>
      <div className="formula-box">S = πr²</div>
      <p style={{marginTop:6}}>שטח גזרה = (θ/360°) · πr²</p>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="area-why">
      <button className="area-why-t" onClick={()=>setWhy(!why)} aria-expanded={why}><span>🔎 למתקדמים: מאיפה מגיעה הנוסחה <bdi dir="ltr">S = πr²</bdi>?</span><span aria-hidden="true">{why?'▲':'▼'}</span></button>
      {why&&<div className="area-why-b">
        <AreaWhySVG/>
        <p>חותכים את המעגל לפרוסות שוות ומסדרים אותן אחת למעלה ואחת למטה. ככל שהפרוסות דקות יותר, הצורה נראית יותר כמו <b>מלבן</b>.</p>
        <p>הגובה של המלבן הוא <b>הרדיוס r</b>. הבסיס שלו הוא <b>חצי מההיקף</b>: חצי מהפרוסות פונות למטה וחצי למעלה, אז לאורך הבסיס יש חצי מ-<bdi dir="ltr">2πr</bdi>, כלומר <b><bdi dir="ltr">πr</bdi></b>.</p>
        <p>שטח מלבן = בסיס × גובה, ולכן: <bdi dir="ltr"><b>S = πr · r = πr²</b></bdi></p>
      </div>}
    </div>

    <div className="card">
      <div className="card-t">{ex.sub==='calc'?'חישוב שטח':ex.sub==='findR'?'מציאת רדיוס משטח':'שטח גזרה'}</div>
      <div className="area-q">
        <div className="graph-wrap"><CircleSVG rVal={ex.sub==='findR'?'?':ex.r} sectorAngle={ex.sub==='sector'?ex.angle:null} label={ex.sub==='sector'?ex.angle+'°':null}/></div>
        <div className="area-f">
          <small>הנוסחה</small>
          <b dir="ltr">S = π · r²</b>
          {ex.sub==='sector'&&<span>שטח גזרה = <Frac n="θ" d="360°"/> · πr²</span>}
        </div>
      </div>
      <p className="hint area-hint">{ex.sub==='calc'?`r = ${ex.r}. חשבו את שטח המעגל.`:ex.sub==='findR'?`שטח המעגל הוא ${ex.area}π. מה הרדיוס?`:`r = ${ex.r}, θ = ${ex.angle}°. חשבו את שטח הגזרה.`}</p>
      <div className="eq-row">
        <span>{ex.sub==='findR'?'r =':'S ='}</span>
        <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} disabled={done} style={{width:96}} onKeyDown={e=>e.key==='Enter'&&!done&&check()}/>
        {ex.sub!=='findR'&&<button type="button" className="btn pi-btn" onClick={addPi} disabled={done} aria-label="הוספת π">π</button>}
      </div>
      {ex.sub!=='findR'&&<p className="area-note">אפשר לענות עם π (למשל 25π) או במספר (π ≈ 3.14)</p>}
      {!done&&<div className="center" style={{marginTop:8}}><button className="btn bg" onClick={check}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {done?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══ Chapter 4: Arc ═══ */
function genCh4(){
  const sub=pick(['arcLen','findAngle','sectorPerim']);
  const angles=[30,45,60,90,120,150,180];
  for(let i=0;i<200;i++){
    const angle=pick(angles);const r=randInt(2,15);
    const arcCoeff=(angle*r)/180;
    if(Number.isInteger(arcCoeff))return{sub,r,angle,arcCoeff,fullCircCoeff:2*r};
  }
  return{sub:sub,r:6,angle:90,arcCoeff:3,fullCircCoeff:12};
}

function Ch4(){
  const [ex,setEx]=useState(()=>genCh4());
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [a1,setA1]=useState('');
  const [a2,setA2]=useState('');
  const [showInfo,setShowInfo]=useState(true);

  const totalSteps=ex.sub==='sectorPerim'?3:2;
  const allDone=phase>=totalSteps;
  const reset=()=>{setEx(genCh4());setFb(null);setPhase(0);setA1('');setA2('');};
  const advance=()=>{setPhase(p=>p+1);setFb(null);setA1('');setA2('');};

  const checkStep=()=>{
    const v=parseInt(a1);
    if(ex.sub==='arcLen'){
      if(phase===0){if(v===ex.fullCircCoeff){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else{if(v===ex.arcCoeff){setFb('ok');setTimeout(advance,600);}else setFb('err');}
    } else if(ex.sub==='findAngle'){
      if(phase===0){if(v===ex.fullCircCoeff){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else{if(v===ex.angle){setFb('ok');setTimeout(advance,600);}else setFb('err');}
    } else {
      if(phase===0){if(v===ex.fullCircCoeff){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else if(phase===1){if(v===ex.arcCoeff){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else{if(v===ex.arcCoeff&&parseInt(a2)===2*ex.r){setFb('ok');setTimeout(advance,600);}
        else if(v===ex.arcCoeff+2*ex.r||parseInt(a2)===ex.arcCoeff+2*ex.r){setFb('err');}
        else setFb('err');}
    }
  };

  // For sector perimeter step 3, check both values
  const checkPerim=()=>{
    const vArc=parseInt(a1),vR=parseInt(a2);
    if(vArc===ex.arcCoeff&&vR===2*ex.r){setFb('ok');setTimeout(advance,600);}else setFb('err');
  };

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>🌙 קשת</h3>
      <p>קשת היא חלק מהיקף המעגל.</p>
      <div className="formula-box">L = (θ/360°) · 2πr</div>
      <p style={{marginTop:6}}>היקף גזרה = אורך קשת + 2r</p>
      <div className="ex-card">
        <h3>דוגמה פתורה</h3>
        <div className="graph-wrap"><CircleSVG rVal={6} arcHighlight={[0,60]} sectorAngle={60} label="60°"/></div>
        <p>במעגל שהרדיוס שלו <bdi>r = 6</bdi> יש זווית מרכזית <bdi>θ = 60°</bdi>. נחשב את אורך הקשת ואת היקף הגזרה.</p>
        <ol className="ex-steps">
          <li className="ex-step"><div className="ex-text"><b>שלב 1 — היקף המעגל כולו:</b></div><div className="formula-box ex-math">2πr = 2π · 6 = 12π</div></li>
          <li className="ex-step"><div className="ex-text"><b>שלב 2 — אורך הקשת:</b> הזווית <bdi>60°</bdi> היא חלק מ-<bdi>360°</bdi>, ולכן הקשת היא אותו חלק מההיקף.</div>
            <div className="formula-box ex-math">L = <Frac n="60" d="360"/> · 12π = <Frac n="1" d="6"/> · 12π = 2π</div></li>
          <li className="ex-step"><div className="ex-text"><b>שלב 3 — היקף הגזרה:</b> אורך הקשת ועוד שני רדיוסים.</div>
            <div className="formula-box ex-math">P = 2π + 2 · 6 = 2π + 12</div></li>
        </ol>
      </div>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="card">
      <div className="card-t">{ex.sub==='arcLen'?'אורך קשת':ex.sub==='findAngle'?'מציאת זווית מקשת':'היקף גזרה'}</div>
      <div className="graph-wrap"><CircleSVG rVal={ex.r} arcHighlight={[0,ex.angle]} sectorAngle={ex.sub==='sectorPerim'?ex.angle:null} label={ex.angle+'°'}/></div>

      {ex.sub==='arcLen'&&<>
        <p className="hint">r = {ex.r}, θ = {ex.angle}°. חשב את אורך הקשת.</p>
        {phase>0&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ 2πr = {ex.fullCircCoeff}π</div></div>}
        {phase===0&&<div className="step-card"><div className="step-label">שלב 1 — היקף המעגל</div>
          <div className="eq-row"><span>2π·{ex.r} =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> <span>π</span></div></div>}
        {phase>1&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ L = ({ex.angle}/360)·{ex.fullCircCoeff}π = {ex.arcCoeff}π</div></div>}
        {phase===1&&<div className="step-card"><div className="step-label">שלב 2 — אורך הקשת</div>
          <div className="eq-row"><span>({ex.angle}/360)·{ex.fullCircCoeff}π =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> <span>π</span></div></div>}
      </>}

      {ex.sub==='findAngle'&&<>
        <p className="hint">אורך הקשת הוא {ex.arcCoeff}π, r = {ex.r}. מצא את הזווית המרכזית.</p>
        {phase>0&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ 2πr = {ex.fullCircCoeff}π</div></div>}
        {phase===0&&<div className="step-card"><div className="step-label">שלב 1 — היקף המעגל</div>
          <div className="eq-row"><span>2π·{ex.r} =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> <span>π</span></div></div>}
        {phase>1&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ θ = {ex.angle}°</div></div>}
        {phase===1&&<div className="step-card"><div className="step-label">שלב 2 — פתור</div>
          <p className="hint">(θ/360)·{ex.fullCircCoeff}π = {ex.arcCoeff}π</p>
          <div className="ans-row"><span>θ =</span><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/><span>°</span></div></div>}
      </>}

      {ex.sub==='sectorPerim'&&<>
        <p className="hint">r = {ex.r}, θ = {ex.angle}°. חשב את היקף הגזרה.</p>
        {phase>0&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ 2πr = {ex.fullCircCoeff}π</div></div>}
        {phase===0&&<div className="step-card"><div className="step-label">שלב 1 — היקף המעגל</div>
          <div className="eq-row"><span>2π·{ex.r} =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> <span>π</span></div></div>}
        {phase>1&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ L = {ex.arcCoeff}π</div></div>}
        {phase===1&&<div className="step-card"><div className="step-label">שלב 2 — אורך קשת</div>
          <div className="eq-row"><span>({ex.angle}/360)·{ex.fullCircCoeff}π =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> <span>π</span></div></div>}
        {phase>2&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ P = {ex.arcCoeff}π + {2*ex.r}</div></div>}
        {phase===2&&<div className="step-card"><div className="step-label">שלב 3 — היקף גזרה = קשת + 2r</div>
          <div className="ans-row"><span>P =</span><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:45}}/><span>π +</span>
            <input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} style={{width:45}}/></div></div>}
      </>}

      {!allDone&&<div className="center" style={{marginTop:8}}><button className="btn bg" onClick={phase===2&&ex.sub==='sectorPerim'?checkPerim:checkStep}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══ Chapter 5: Combined ═══ */
function genCh5(){
  const sub=pick(['circToArea','sectorToR','annulus']);
  if(sub==='circToArea'){const r=randInt(2,15);return{sub,r,circCoeff:2*r,area:r*r};}
  if(sub==='sectorToR'){
    const angles=[30,45,60,90,120,150,180];
    for(let i=0;i<200;i++){const angle=pick(angles);const r=randInt(2,10);const sa=(angle*r*r)/360;if(Number.isInteger(sa))return{sub,r,angle,sectorArea:sa,rSquared:r*r,mult:360/angle};}
    return{sub,r:6,angle:90,sectorArea:9,rSquared:36,mult:4};
  }
  const R=randInt(6,15),r=randInt(2,R-2);
  return{sub,R,r,bigArea:R*R,smallArea:r*r,annulusArea:R*R-r*r};
}

function Ch5(){
  const [ex,setEx]=useState(()=>genCh5());
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [a1,setA1]=useState('');
  const [showInfo,setShowInfo]=useState(true);

  const totalSteps=ex.sub==='circToArea'?2:3;
  const allDone=phase>=totalSteps;
  const reset=()=>{setEx(genCh5());setFb(null);setPhase(0);setA1('');};
  const advance=()=>{setPhase(p=>p+1);setFb(null);setA1('');};

  const checkStep=()=>{
    const v=parseInt(a1);
    if(ex.sub==='circToArea'){
      if(phase===0){if(v===ex.r){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else{if(v===ex.area){setFb('ok');setTimeout(advance,600);}else setFb('err');}
    } else if(ex.sub==='sectorToR'){
      if(phase===0){if(v===ex.rSquared){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else if(phase===1){if(v===ex.rSquared){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else{if(v===ex.r){setFb('ok');setTimeout(advance,600);}else setFb('err');}
    } else {
      if(phase===0){if(v===ex.bigArea){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else if(phase===1){if(v===ex.smallArea){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else{if(v===ex.annulusArea){setFb('ok');setTimeout(advance,600);}else setFb('err');}
    }
  };

  function AnnulusSVG(){
    const W=300,H=260,cx=150,cy=130;
    const sr1=80,sr2=Math.round(80*ex.r/ex.R);
    return <svg viewBox={`0 0 ${W} ${H}`} style={{width:280,height:'auto',direction:'ltr'}}>
      <circle cx={cx} cy={cy} r={sr1} fill="rgba(3,105,161,0.15)" stroke="#2563eb" strokeWidth={2.5}/>
      <circle cx={cx} cy={cy} r={sr2} fill="#fff" stroke="#0369a1" strokeWidth={2}/>
      <circle cx={cx} cy={cy} r={3} fill="#334155"/>
      <text x={cx-7} y={cy+18} textAnchor="end" fontSize="13" fontWeight="700" fill="#334155">O</text>
      <line x1={cx} y1={cy} x2={cx+sr1} y2={cy} stroke="#dc2626" strokeWidth={2}/>
      <text x={cx+(sr1+sr2)/2} y={cy+14} dominantBaseline="central" fontSize="12" fontWeight="700" fill="#dc2626" textAnchor="middle">R = {ex.R}</text>
      <line x1={cx} y1={cy} x2={cx} y2={cy-sr2} stroke="#ea580c" strokeWidth={2}/>
      <text x={cx-6} y={sr2>=30?cy-sr2/2:cy-sr2-10} dominantBaseline="central" textAnchor="end" fontSize="12" fontWeight="700" fill="#ea580c">r = {ex.r}</text>
    </svg>;
  }

  return <div className="content">
    {showInfo&&<div className="info-box">
      <h3>🧩 הכל יחד</h3>
      <p>תרגילים משולבים — שימוש בכמה נוסחאות יחד.</p>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="card">
      <div className="card-t">{ex.sub==='circToArea'?'מהיקף לשטח':ex.sub==='sectorToR'?'מגזרה לרדיוס':'שטח טבעת'}</div>

      {ex.sub==='circToArea'&&<>
        <div className="graph-wrap"><CircleSVG rVal="?"/></div>
        <p className="hint">היקף המעגל הוא {ex.circCoeff}π. מצא את שטחו.</p>
        {phase>0&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ 2πr = {ex.circCoeff}π → r = {ex.r}</div></div>}
        {phase===0&&<div className="step-card"><div className="step-label">שלב 1 — מצא r מהיקף</div>
          <p className="hint">2πr = {ex.circCoeff}π</p>
          <div className="ans-row"><span>r =</span><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/></div></div>}
        {phase>1&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ S = π · {ex.r}² = {ex.area}π</div></div>}
        {phase===1&&<div className="step-card"><div className="step-label">שלב 2 — חשב שטח</div>
          <div className="eq-row"><span>S = π·{ex.r}² =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> <span>π</span></div></div>}
      </>}

      {ex.sub==='sectorToR'&&<>
        <div className="graph-wrap"><CircleSVG rVal="?" sectorAngle={ex.angle} label={ex.angle+'°'}/></div>
        <p className="hint">שטח גזרה = {ex.sectorArea}π, θ = {ex.angle}°. מצא את הרדיוס.</p>
        {phase>0&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ πr² = {ex.rSquared}π</div></div>}
        {phase===0&&<div className="step-card"><div className="step-label">שלב 1 — מצא πr²</div>
          <p className="hint">({ex.angle}/360)·πr² = {ex.sectorArea}π</p>
          <p className="hint">הכפל ב-{ex.mult}:</p>
          <div className="eq-row"><span>πr² =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> <span>π</span></div></div>}
        {phase>1&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ r² = {ex.rSquared}</div></div>}
        {phase===1&&<div className="step-card"><div className="step-label">שלב 2 — חלק ב-π</div>
          <div className="eq-row"><span>r² =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/></div></div>}
        {phase>2&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ r = {ex.r}</div></div>}
        {phase===2&&<div className="step-card"><div className="step-label">שלב 3 — הוצא שורש</div>
          <div className="eq-row"><span>r = √{ex.rSquared} =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/></div></div>}
      </>}

      {ex.sub==='annulus'&&<>
        <div className="graph-wrap"><AnnulusSVG/></div>
        <p className="hint">R = {ex.R}, r = {ex.r}. חשב את שטח הטבעת (השטח בין שני המעגלים).</p>
        {phase>0&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ S₁ = π·{ex.R}² = {ex.bigArea}π</div></div>}
        {phase===0&&<div className="step-card"><div className="step-label">שלב 1 — שטח המעגל הגדול</div>
          <div className="eq-row"><span>S₁ = π·{ex.R}² =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> <span>π</span></div></div>}
        {phase>1&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ S₂ = π·{ex.r}² = {ex.smallArea}π</div></div>}
        {phase===1&&<div className="step-card"><div className="step-label">שלב 2 — שטח המעגל הקטן</div>
          <div className="eq-row"><span>S₂ = π·{ex.r}² =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> <span>π</span></div></div>}
        {phase>2&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ S = {ex.bigArea}π − {ex.smallArea}π = {ex.annulusArea}π</div></div>}
        {phase===2&&<div className="step-card"><div className="step-label">שלב 3 — שטח הטבעת</div>
          <div className="eq-row"><span>{ex.bigArea}π − {ex.smallArea}π =</span> <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> <span>π</span></div></div>}
      </>}

      {!allDone&&<div className="center" style={{marginTop:8}}><button className="btn bg" onClick={checkStep}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══ Chapter 6: Radians ═══ */
const radVals=[
  {deg:30,num:1,den:6},{deg:45,num:1,den:4},{deg:60,num:1,den:3},
  {deg:90,num:1,den:2},{deg:120,num:2,den:3},{deg:150,num:5,den:6},
  {deg:180,num:1,den:1},{deg:270,num:3,den:2},{deg:360,num:2,den:1}
];

/* Radians, right after the introduction, in three sub-chapters (Sulaiman, fixes board #49):
   א — degrees, ב — what a radian is, ג — how the two are related. */
const turnFracs=[
  {num:1,den:4,deg:90},{num:1,den:2,deg:180},{num:1,den:8,deg:45},{num:1,den:3,deg:120},{num:1,den:6,deg:60},
  {num:3,den:4,deg:270},{num:1,den:12,deg:30},{num:2,den:3,deg:240},{num:3,den:8,deg:135},{num:5,den:6,deg:300}
];
function genCh6(part){
  if(part===0){
    const sub=pick(['fracToDeg','degToFrac']);
    const f=pick(turnFracs);
    const others=turnFracs.filter(x=>x.deg!==f.deg);
    for(let i=others.length-1;i>0;i--){const j=randInt(0,i);[others[i],others[j]]=[others[j],others[i]];}
    const opts=[f,...others.slice(0,3)];
    for(let i=3;i>0;i--){const j=randInt(0,i);[opts[i],opts[j]]=[opts[j],opts[i]];}
    return{sub,...f,opts};
  }
  if(part===1){
    const sub=pick(['thetaArc','arcRad']);
    if(sub==='thetaArc'){
      const r=randInt(2,9),theta=pick([1,2,3,0.5,1.5,2.5]);
      return{sub,r,theta,L:r*theta};
    }
    for(let i=0;i<200;i++){
      const rv=pick(radVals.slice(0,7));
      const r=randInt(2,12);
      const coeff=(r*rv.num)/rv.den;
      if(Number.isInteger(coeff))return{sub,...rv,r,arcCoeff:coeff};
    }
    return{sub,deg:90,num:1,den:2,r:6,arcCoeff:3};
  }
  const sub=pick(['degToRad','radToDeg']);
  const rv=pick(radVals.slice(0,7));
  return{sub,...rv};
}

function Ch6(){
  const [part,setPart]=useState(0);
  return <>
    <div className="content" style={{marginBottom:0}}>
      <div className="sub-tabs">
        {['א. מעלות','ב. רדיאנים','ג. הקשר ביניהם'].map((l,i)=><button key={i} className={`sub-tab-btn ${part===i?'active':''}`} onClick={()=>setPart(i)}>{l}</button>)}
      </div>
    </div>
    <RadPart key={part} part={part}/>
  </>;
}

function RadPart({part}){
  const [ex,setEx]=useState(()=>genCh6(part));
  const [fb,setFb]=useState(null);
  const [phase,setPhase]=useState(0);
  const [a1,setA1]=useState('');
  const [a2,setA2]=useState('');
  const [showInfo,setShowInfo]=useState(true);

  const totalSteps=ex.sub==='degToRad'||ex.sub==='radToDeg'?2:1;
  const allDone=phase>=totalSteps;
  const reset=()=>{setEx(genCh6(part));setFb(null);setPhase(0);setA1('');setA2('');};
  const advance=()=>{setPhase(p=>p+1);setFb(null);setA1('');setA2('');};

  const checkStep=()=>{
    if(ex.sub==='degToRad'){
      if(phase===0){if(parseInt(a1)===ex.deg){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else{
        const n=parseInt(a1),d=parseInt(a2);
        if(!isNaN(n)&&!isNaN(d)&&d>0&&n*ex.den===d*ex.num){setFb('ok');setTimeout(advance,600);}else setFb('err');
      }
    } else if(ex.sub==='radToDeg'){
      if(phase===0){if(parseInt(a1)===ex.num&&parseInt(a2)===ex.den){setFb('ok');setTimeout(advance,600);}else setFb('err');}
      else{if(parseInt(a1)===ex.deg){setFb('ok');setTimeout(advance,600);}else setFb('err');}
    } else if(ex.sub==='arcRad'){
      if(parseInt(a1)===ex.arcCoeff){setFb('ok');setTimeout(advance,600);}else setFb('err');
    } else if(ex.sub==='fracToDeg'){
      if(parseInt(a1)===ex.deg){setFb('ok');setTimeout(advance,600);}else setFb('err');
    } else if(ex.sub==='degToFrac'){
      if(a1===String(ex.deg)){setFb('ok');setTimeout(advance,600);}else setFb('err');
    } else {
      const v=parseFloat((a1||'').replace(',','.'));
      if(!isNaN(v)&&Math.abs(v-ex.theta)<1e-9){setFb('ok');setTimeout(advance,600);}else setFb('err');
    }
  };

  const title={fracToDeg:'חלק מסיבוב → מעלות',degToFrac:'מעלות → חלק מסיבוב',thetaArc:'זווית ברדיאנים',arcRad:'אורך קשת ברדיאנים',degToRad:'מעלות → רדיאנים',radToDeg:'רדיאנים → מעלות'}[ex.sub];

  return <div className="content">
    {showInfo&&part===0&&<div className="info-box">
      <h3>🕐 מעלות</h3>
      <p>מחלקים סיבוב שלם ל-<b>360</b> חלקים שווים. כל חלק הוא <b>מעלה</b> אחת (1°).</p>
      <div className="rad-facts">
        <span>רבע סיבוב = <b>90°</b> (זווית ישרה)</span>
        <span>חצי סיבוב = <b>180°</b> (זווית שטוחה)</span>
        <span>סיבוב שלם = <b>360°</b></span>
      </div>
      <p style={{marginTop:6}}>כדי לדעת כמה מעלות יש בחלק מסיבוב, כופלים את החלק ב-360. למשל: <Frac n={1} d={8}/> מסיבוב = <bdi dir="ltr">360 : 8 = 45°</bdi></p>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}
    {showInfo&&part===1&&<div className="info-box">
      <h3>📏 רדיאנים</h3>
      <div className="rad-def">
        <CircleSVG sectorAngle={57.3} arcHighlight={[0,57.3]} label="1 rad"/>
        <div>
          <p><b>רדיאן</b> הוא דרך נוספת למדוד זווית, בעזרת הרדיוס עצמו: מניחים קשת שאורכה <b>בדיוק כמו הרדיוס</b> על קו המעגל. הזווית שהיא יוצרת במרכז היא <b>רדיאן אחד</b> (בערך 57°).</p>
          <p>זווית ברדיאנים = אורך הקשת חלקי הרדיוס: <bdi dir="ltr">θ = <Frac n="L" d="r"/></bdi>, ולכן <bdi dir="ltr">L = r · θ</bdi>.</p>
          <p>לאורך מעגל שלם נכנסים קצת יותר מ-6 רדיוסים: בדיוק <b><bdi dir="ltr">2π</bdi></b> (π הוא בערך 3.14, נכיר אותו מקרוב בפרק ההיקף). לכן סיבוב שלם = <b><bdi dir="ltr">2π</bdi> רדיאנים</b>.</p>
        </div>
      </div>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}
    {showInfo&&part===2&&<div className="info-box">
      <h3>🔄 הקשר בין מעלות לרדיאנים</h3>
      <p>חצי סיבוב הוא 180°, והוא גם π רדיאנים. לכן: <b><bdi dir="ltr">π rad = 180°</bdi></b></p>
      <div className="formula-box" style={{fontSize:16}}>rad = deg · π/180 &nbsp;|&nbsp; deg = rad · 180/π</div>
      <table className="rad-table" style={{marginTop:10}}>
        <thead><tr><th>מעלות</th><th>0°</th><th>30°</th><th>45°</th><th>60°</th><th>90°</th><th>180°</th><th>360°</th></tr></thead>
        <tbody><tr><td><strong>רדיאנים</strong></td><td>0</td><td>π/6</td><td>π/4</td><td>π/3</td><td>π/2</td><td>π</td><td>2π</td></tr></tbody>
      </table>
      <div className="center" style={{marginTop:6}}><button className="btn bp" onClick={()=>setShowInfo(false)} style={{fontSize:12}}>הבנתי ✓</button></div>
    </div>}

    <div className="card">
      <div className="card-t">{title}</div>

      {ex.sub==='fracToDeg'&&<>
        <div className="graph-wrap"><CircleSVG sectorAngle={ex.deg} sectorColor="rgba(234,88,12,0.18)"/></div>
        <p className="hint" style={{fontSize:16}}>הזווית המסומנת היא <Frac n={ex.num} d={ex.den}/> מסיבוב שלם. כמה מעלות היא?</p>
        {phase>0?<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ <bdi dir="ltr">360 · {ex.num}/{ex.den} = {ex.deg}°</bdi></div></div>
          :<div className="ans-row"><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:60}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/><span>°</span></div>}
      </>}

      {ex.sub==='degToFrac'&&<>
        <p className="hint" style={{fontSize:16}}>איזה חלק מסיבוב שלם היא זווית של <b>{ex.deg}°</b>?</p>
        <div className="choice-row">
          {ex.opts.map(o=><button key={o.deg} className={`choice-btn rad-frac ${a1===String(o.deg)?'active':''} ${allDone&&o.deg===ex.deg?'correct':''}`}
            onClick={()=>{if(!allDone){setA1(String(o.deg));setFb(null);}}} disabled={allDone}><Frac n={o.num} d={o.den}/></button>)}
        </div>
        {allDone&&<div className="graph-wrap"><CircleSVG sectorAngle={ex.deg} sectorColor="rgba(234,88,12,0.18)" label={ex.deg+'°'}/></div>}
      </>}

      {ex.sub==='thetaArc'&&<>
        <div className="graph-wrap"><CircleSVG rVal={ex.r} arcHighlight={[0,ex.theta*180/Math.PI]} sectorAngle={ex.theta*180/Math.PI} sectorColor="rgba(3,105,161,0.08)"/></div>
        <p className="hint" style={{fontSize:16}}>הרדיוס הוא {ex.r}, ואורך הקשת הכתומה הוא {ex.L}. מה הזווית ברדיאנים?</p>
        {phase>0?<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ <bdi dir="ltr">θ = {ex.L} : {ex.r} = {ex.theta} rad</bdi></div></div>
          :<div className="eq-row">θ = <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:60}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> rad</div>}
      </>}

      {ex.sub==='degToRad'&&<>
        <p className="hint" style={{fontSize:16}}>המר {ex.deg}° לרדיאנים</p>
        {phase>0&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.deg} · π/180</div></div>}
        {phase===0&&<div className="step-card"><div className="step-label">שלב 1 — כתוב נוסחה</div>
          <div className="eq-row"><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:50}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> · π/180</div></div>}
        {phase>1&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {fmtFrac(ex.num,ex.den)}</div></div>}
        {phase===1&&<div className="step-card"><div className="step-label">שלב 2 — פשט</div>
          <div className="ans-row"><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:40}} placeholder="מונה"/>
            <span style={{fontSize:18}}>π /</span>
            <input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} style={{width:40}} placeholder="מכנה" onKeyDown={e=>e.key==='Enter'&&checkStep()}/></div>
          <p className="hint">(למשל: π/3 → מונה=1, מכנה=3)</p></div>}
      </>}

      {ex.sub==='radToDeg'&&<>
        <p className="hint" style={{fontSize:16}}>המר {fmtFrac(ex.num,ex.den)} רדיאנים למעלות</p>
        {phase>0&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ ({ex.num}/{ex.den}) · 180</div></div>}
        {phase===0&&<div className="step-card"><div className="step-label">שלב 1 — הצב בנוסחה</div>
          <div className="eq-row">(<input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:35}}/>/<input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} style={{width:35}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/>) · 180</div></div>}
        {phase>1&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.deg}°</div></div>}
        {phase===1&&<div className="step-card"><div className="step-label">שלב 2 — חשב</div>
          <div className="ans-row"><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/><span>°</span></div></div>}
      </>}

      {ex.sub==='arcRad'&&<>
        <div className="graph-wrap"><CircleSVG rVal={ex.r} arcHighlight={[0,ex.deg]} label={fmtFrac(ex.num,ex.den)+' rad'}/></div>
        <p className="hint">r = {ex.r}, θ = {fmtFrac(ex.num,ex.den)} rad. חשב אורך קשת.</p>
        <div className="formula-box" style={{fontSize:16}}>L = r · θ = {ex.r} · {fmtFrac(ex.num,ex.den)}</div>
        {phase>0&&<div className="step-card done"><div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ L = {ex.arcCoeff}π</div></div>}
        {phase===0&&<div className="step-card"><div className="step-label">חשב</div>
          <div className="eq-row">L = <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} style={{width:55}} onKeyDown={e=>e.key==='Enter'&&checkStep()}/> π</div></div>}
      </>}

      {!allDone&&<div className="center" style={{marginTop:8}}><button className="btn bg" onClick={checkStep}>✓ בדוק</button></div>}
      <Fb fb={fb}/>
    </div>
    {allDone?<div className="banner">✅ כל הכבוד!<div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div></div>
      :<div className="center"><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══ App ═══ */
function App(){
  const [ch,setCh]=useState(0);
  // radians come right after the introduction (Sulaiman, fixes board #49)
  const chs=[
    {name:'1. היכרות',comp:Ch1},{name:'2. רדיאנים',comp:Ch6},{name:'3. היקף',comp:Ch2},
    {name:'4. שטח',comp:Ch3},{name:'5. קשת',comp:Ch4},{name:'6. הכל יחד',comp:Ch5}
  ];
  const Comp=chs[ch].comp;
  return <>
    <div className="hdr">
      <div className="hdr-title">מעגל</div>
      <div className="ch-btns">
        {chs.map((c,i)=><button key={i} className={`ch-btn ${ch===i?'active':''}`} onClick={()=>setCh(i)}>{c.name}</button>)}
      </div>
    </div>
    <Comp key={ch}/>
  </>;
}

// ===== END ORIGINAL =====
export default App;
