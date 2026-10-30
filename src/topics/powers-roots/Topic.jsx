'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/powers-roots.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const {useState,useEffect,useRef,useCallback,useMemo}=React;
function randInt(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function pick(arr){return arr[randInt(0,arr.length-1)];}
function Fb({fb}){if(!fb)return null;return fb==='ok'?<div className="fb ok">✓ נכון!</div>:<div className="fb err">✗ לא נכון, נסה שוב.</div>;}
function Frac({n,d,style}){return <span className="frac" style={style}><span className="frac-num">{n}</span><span className="frac-den">{d}</span></span>;}
// Shows a power the way it is written in a notebook (small raised exponent), never with "^".
// "x^12" → x¹², "2^(−3)" → 2⁻³, "x^2y^3" → x²y³.
function Mx({s}){
  const out=[];let buf='',i=0,k=0;
  const flush=()=>{if(buf){out.push(buf);buf='';}};
  while(i<s.length){
    if(s[i]!=='^'){buf+=s[i];i++;continue;}
    let e='';i++;
    if(s[i]==='('){let d=1;i++;while(i<s.length){if(s[i]==='(')d++;else if(s[i]===')'){d--;if(d===0){i++;break;}}e+=s[i];i++;}}
    else if(/[0-9]/.test(s[i]||'')){while(i<s.length&&/[0-9]/.test(s[i])){e+=s[i];i++;}}
    else{e=s[i]||'';i++;}
    flush();out.push(<sup key={k++}>{e}</sup>);
  }
  flush();
  return <span className="mx">{out}</span>;
}
// Letters for the parametric exercises (not only x and y).
const VARS=['x','y','z','a','b','m','n','t'];
function pickVars(){const v=pick(VARS);let w=pick(VARS);while(w===v)w=pick(VARS);return [v,w];}

/* ═══════════════════════════════════════
   CHAPTER 1 — Understanding Powers (Visual)
   ═══════════════════════════════════════ */
function genCh1(){
  const mode = randInt(0,1); // 0=forward, 1=reverse
  if(mode===0){
    const base = randInt(2,6);
    const exp = randInt(2,5);
    const ans = Math.pow(base,exp);
    const visType = exp===2?'grid':exp===3?'cube':'chain';
    return {mode,base,exp,ans,visType};
  } else {
    const pairs=[[2,4,16],[2,5,32],[3,2,9],[3,3,27],[3,4,81],[4,2,16],[4,3,64],[5,2,25],[5,3,125],[2,6,64],[2,7,128],[6,2,36],[7,2,49],[8,2,64],[9,2,81],[10,2,100]];
    const [base,exp,ans]=pick(pairs);
    return {mode,base,exp,ans,visType:'chain'};
  }
}

function GridVis({n}){
  const s=20,g=2,total=s+g;
  return <svg viewBox={`0 0 ${n*total} ${n*total}`} style={{width:Math.min(160,n*total),height:Math.min(160,n*total)}}>
    {Array.from({length:n*n},(_,i)=>{
      const r=Math.floor(i/n),c=i%n;
      return <rect key={i} x={c*total} y={r*total} width={s} height={s} rx={3} fill="#7c3aed" opacity={0.7}/>;
    })}
  </svg>;
}

function ChainVis({base,exp}){
  const parts=[];
  for(let i=0;i<exp;i++){
    parts.push(<span key={'n'+i} style={{background:'#ede9fe',padding:'4px 8px',borderRadius:6,fontWeight:700,color:'#7c3aed'}}>{base}</span>);
    if(i<exp-1) parts.push(<span key={'x'+i} style={{margin:'0 4px',color:'#a78bfa'}}>×</span>);
  }
  return <div style={{display:'flex',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:2,direction:'ltr'}}>{parts}</div>;
}

function genBaseExp(){
  const mode=randInt(0,1); // 0 = given a power: name base and exponent, 1 = given a repeated product: write it as a power
  return mode===0?{mode,base:randInt(2,12),exp:randInt(2,9)}:{mode,base:randInt(2,9),exp:randInt(2,6)};
}

function BaseExp(){
  const [ex,setEx]=useState(()=>genBaseExp());
  const [b,setB]=useState('');const [e,setE]=useState('');
  const [fb,setFb]=useState(null);const [done,setDone]=useState(false);
  const check=()=>{if(parseInt(b)===ex.base&&parseInt(e)===ex.exp){setFb('ok');setDone(true);}else setFb('err');};
  const reset=()=>{setEx(genBaseExp());setB('');setE('');setFb(null);setDone(false);};
  return <>
    <div className="card">
      <div className="card-t">זיהוי בסיס ומעריך</div>
      {ex.mode===0
        ?<div className="eq-box">{ex.base}<sup>{ex.exp}</sup></div>
        :<div className="eq-box"><ChainVis base={ex.base} exp={ex.exp}/></div>}
      <div className={`step-card ${done?'done':''}`}>
        <div className="step-label">{ex.mode===0?'מה הבסיס ומה המעריך?':'כתוב את הכפל כחזקה: מה הבסיס ומה המעריך?'}</div>
        {!done?<>
          <div className="ans-row">
            <span className="be-template">
              <input value={b} onChange={x=>{setB(x.target.value);setFb(null);}} placeholder="בסיס" style={{width:64}}/>
              <sup><input value={e} onChange={x=>{setE(x.target.value);setFb(null);}} placeholder="מעריך" style={{width:64}} onKeyDown={x=>x.key==='Enter'&&check()}/></sup>
            </span>
            <button className="btn bg" onClick={check}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ בסיס {ex.base}, מעריך {ex.exp}: {ex.base}<sup>{ex.exp}</sup> = {ChainText(ex.base,ex.exp)}</div>}
      </div>
    </div>
    {done?<div className="banner">✅ כל הכבוד!
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </>;
}
function ChainText(base,exp){return Array.from({length:exp},()=>base).join('·');}

function Ch1(){
  const [sub,setSub]=useState(0);
  return <div className="content">
    <div className="info pw-info">
      <p><b>חזקה</b> היא סימן מקוצר לכפל חוזר. כשכופלים מספר בעצמו כמה פעמים, לא כותבים את כל הכפל: כותבים את המספר פעם אחת, ולמעלה, בקטן, כמה פעמים כופלים אותו.</p>
      <div className="be-demo" dir="ltr">
        <span className="be-pow"><span className="be-b">2<em>בסיס</em></span><span className="be-e">4<em>מעריך</em></span></span>
        <span className="be-eq">= 2·2·2·2 = 16</span>
      </div>
      <p><b>הבסיס</b> הוא המספר שכופלים. <b>המעריך</b> אומר כמה פעמים כופלים אותו. קוראים: ״2 בחזקת 4״.</p>
      <p className="pw-warn">שימו לב: <span className="mx">2<sup>4</sup></span> זה לא <span className="mx">2·4</span>.<br/><span className="mx">2<sup>4</sup> = 2·2·2·2 = 16</span>, ואילו <span className="mx">2·4 = 8</span>.</p>
    </div>
    <div className="sub-btns">
      {['זיהוי בסיס ומעריך','חישוב חזקה'].map((l,i)=><button key={i} className={`sub-btn ${sub===i?'active':''}`} onClick={()=>setSub(i)}>{String.fromCharCode(1488+i)}. {l}</button>)}
    </div>
    {sub===0?<BaseExp key="be"/>:<Ch1Calc key="calc"/>}
  </div>;
}

function Ch1Calc(){
  const [ex,setEx]=useState(()=>genCh1());
  const [step,setStep]=useState(1);
  const [a1,setA1]=useState('');
  const [a2,setA2]=useState('');
  const [fb,setFb]=useState(null);

  const check1=()=>{
    if(ex.mode===0){
      // forward: enter multiplication chain result
      const v=parseInt(a1);
      if(v===ex.ans){setFb('ok');setTimeout(()=>{setStep(2);setFb(null);},600);}
      else setFb('err');
    } else {
      // reverse: enter exponent
      const v=parseInt(a1);
      if(v===ex.exp){setFb('ok');setStep(3);}
      else setFb('err');
    }
  };
  const check2=()=>{
    const v=parseInt(a2);
    if(v===ex.ans){setFb('ok');setStep(3);}
    else setFb('err');
  };
  const reset=()=>{const e=genCh1();setEx(e);setStep(1);setA1('');setA2('');setFb(null);};

  return <div>
    <div className="card">
      <div className="card-t">הבנת חזקות</div>
      {ex.mode===0?<>
        <div className="eq-box">{ex.base}<sup>{ex.exp}</sup> = ?</div>
        <div className="vis-wrap">
          {ex.visType==='grid'?<GridVis n={ex.base}/>:<ChainVis base={ex.base} exp={ex.exp}/>}
        </div>
        <div className={`step-card ${step>1?'done':''}`}>
          <div className="step-label">שלב 1 — חשב את הכפל החוזר</div>
          {step===1?<>
            <div className="ans-row">
              <ChainVis base={ex.base} exp={ex.exp}/>
              <span style={{margin:'0 6px'}}>=</span>
              <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?"
                onKeyDown={e=>e.key==='Enter'&&check1()}/>
              <button className="btn bg" onClick={check1}>✓ בדוק</button>
            </div>
            <Fb fb={fb}/>
          </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.ans}</div>}
        </div>
      </>:<>
        <div className="eq-box">{ex.ans} = {ex.base}<sup>?</sup></div>
        <div className="vis-wrap"><ChainVis base={ex.base} exp={ex.exp}/></div>
        <div className={`step-card ${step>2?'done':''}`}>
          <div className="step-label">מצא את המעריך</div>
          {step<3?<>
            <div className="ans-row">
              <span style={{fontSize:18}}>{ex.ans} = {ex.base}</span>
              <sup style={{fontSize:14}}>
                <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:45}}
                  onKeyDown={e=>e.key==='Enter'&&check1()}/>
              </sup>
              <button className="btn bg" onClick={check1}>✓ בדוק</button>
            </div>
            <Fb fb={fb}/>
          </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.base}<sup>{ex.exp}</sup> = {ex.ans}</div>}
        </div>
      </>}
    </div>
    {step>=3?<div className="banner">✅ כל הכבוד!
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══════════════════════════════════════
   CHAPTER 2 — Power Laws (Numeric)
   ═══════════════════════════════════════ */
function genLaw(lawIdx){
  if(lawIdx===0){// a^n * a^m = a^(n+m)
    const base=pick([2,3,4,5]);const n=randInt(2,4);const m=randInt(2,4);
    return {law:0,base,n,m,expAns:n+m,numAns:Math.pow(base,n+m),
      q:`${base}^${n} · ${base}^${m} = ${base}^?`};
  }
  if(lawIdx===1){// a^n / a^m = a^(n-m)
    const base=pick([2,3,5]);const n=randInt(4,7);const m=randInt(1,n-1);
    return {law:1,base,n,m,expAns:n-m,numAns:Math.pow(base,n-m),
      q:`${base}^${n} ÷ ${base}^${m} = ${base}^?`};
  }
  if(lawIdx===2){// (a^n)^m = a^(n*m)
    const base=pick([2,3]);const n=randInt(2,3);const m=randInt(2,4);
    return {law:2,base,n,m,expAns:n*m,numAns:Math.pow(base,n*m),
      q:`(${base}^${n})^${m} = ${base}^?`};
  }
  if(lawIdx===3){// (a*b)^n = a^n * b^n
    const a=pick([2,3]);const b=pick([2,3,5]);const n=randInt(2,3);
    return {law:3,a,b,n,ansA:Math.pow(a,n),ansB:Math.pow(b,n),numAns:Math.pow(a*b,n),
      q:`(${a}·${b})^${n} = ?·?`};
  }
  if(lawIdx===4){// a^0 = 1
    const base=pick([2,3,5,7,10,13,42,100]);
    return {law:4,base,ans:1,q:`${base}^0 = ?`};
  }
  // lawIdx===5: a^(-n) = 1/a^n
  const base=pick([2,3,4,5]);const n=randInt(1,3);
  return {law:5,base,n,den:Math.pow(base,n),q:`${base}^(−${n}) = ?`};
}

const lawNames=['כפל חזקות','חילוק חזקות','חזקה של חזקה','חזקה של מכפלה','חזקה אפס','חזקה שלילית'];
const lawFormulas=['aⁿ · aᵐ = aⁿ⁺ᵐ','aⁿ ÷ aᵐ = aⁿ⁻ᵐ','(aⁿ)ᵐ = aⁿ·ᵐ','(a·b)ⁿ = aⁿ·bⁿ','a⁰ = 1','a⁻ⁿ = 1/aⁿ'];
// "Why is it true?" for each law: a hint to try first, then the proof and an example.
const lawProofs=[
  {hint:<>כתבו כל חזקה ככפל חוזר, וספרו כמה פעמים מופיע a.</>,
   steps:[<><Mx s="a^n"/> זה a כפול עצמו n פעמים, ו-<Mx s="a^m"/> זה a כפול עצמו m פעמים.</>,
     <>כשכופלים אותם יחד, a מופיע <span className="mx">n+m</span> פעמים. כלומר <Mx s="a^n · a^m = a^(n+m)"/>.</>],
   ex:'2^3 · 2^2 = (2·2·2)·(2·2) = 2^5'},
  {hint:<>כתבו את החילוק כשבר, וצמצמו.</>,
   steps:[<>ב-<Mx s="a^n ÷ a^m"/> יש במונה n פעמים a, ובמכנה m פעמים a.</>,
     <>כל a במכנה מצטמצם עם a אחד במונה, ונשארים <span className="mx">n−m</span> פעמים a. כלומר <Mx s="a^(n−m)"/>.</>],
   ex:'2^5 ÷ 2^2 = (2·2·2·2·2) ÷ (2·2) = 2·2·2 = 2^3'},
  {hint:<>כתבו את <Mx s="(a^n)^m"/> ככפל של <Mx s="a^n"/> בעצמו, והשתמשו בחוק 1.</>,
   steps:[<><Mx s="(a^n)^m"/> זה <Mx s="a^n"/> כפול עצמו m פעמים.</>,
     <>לפי חוק 1 מחברים את המעריכים: <span className="mx">n+n+…+n</span> (m פעמים), וזה <span className="mx">n·m</span>. כלומר <Mx s="a^(n·m)"/>.</>],
   ex:'(2^3)^2 = 2^3 · 2^3 = 2^(3+3) = 2^6'},
  {hint:<>כתבו את <Mx s="(a·b)^n"/> ככפל חוזר, ושנו את סדר הגורמים.</>,
   steps:[<><Mx s="(a·b)^n"/> זה <span className="mx">(a·b)</span> כפול עצמו n פעמים.</>,
     <>בכפל מותר לשנות סדר: מקבצים את כל ה-a יחד ואת כל ה-b יחד, ומקבלים <Mx s="a^n · b^n"/>.</>],
   ex:'(2·3)^2 = (2·3)·(2·3) = 2·2·3·3 = 2^2 · 3^2'},
  {hint:<>חלקו חזקה בעצמה בשתי דרכים: לפי חוק 2, ולפי מה שיודעים על מספר חלקי עצמו.</>,
   steps:[<>לפי חוק 2: <Mx s="a^n ÷ a^n = a^(n−n) = a^0"/>.</>,
     <>אבל כל מספר (שאינו 0) חלקי עצמו שווה 1. לכן <Mx s="a^0 = 1"/>.</>],
   ex:'5^3 ÷ 5^3 = 5^0 = 1'},
  {hint:<>חשבו על <Mx s="a^0 ÷ a^n"/> בשתי דרכים: לפי חוק 2 ולפי חוק 5.</>,
   steps:[<>לפי חוק 2: <Mx s="a^0 ÷ a^n = a^(0−n) = a^(−n)"/>.</>,
     <>לפי חוק 5: <Mx s="a^0 = 1"/>, ולכן אותו חילוק שווה <Mx s="1 ÷ a^n"/>.</>,
     <>שתי הדרכים נותנות את אותו מספר, ולכן <Mx s="a^(−n) = 1 ÷ a^n"/>.</>],
   ex:'2^(−3) = 1 ÷ 2^3 = 1/8'},
];

function LawProof({i}){
  const [open,setOpen]=useState(0); // 0 closed, 1 try it, 2 proof shown
  const p=lawProofs[i];
  if(open===0)return <button className="proof-open" onClick={()=>setOpen(1)}>🧠 למה זה נכון? נסו להוכיח</button>;
  return <div className="proof">
    <div className="proof-head"><b>נסו להוכיח בעצמכם</b><button className="proof-x" aria-label="סגור" onClick={()=>setOpen(0)}>✕</button></div>
    <p className="proof-hint">💡 רמז: {p.hint}</p>
    {open===1?<button className="btn bp proof-show" onClick={()=>setOpen(2)}>הצג הוכחה</button>:<>
      <ol className="proof-steps">{p.steps.map((s,k)=><li key={k}>{s}</li>)}</ol>
      <div className="proof-ex"><span>דוגמה:</span> <Mx s={p.ex}/></div>
    </>}
  </div>;
}

function Ch2(){
  const [lawIdx,setLawIdx]=useState(0);
  const [ex,setEx]=useState(()=>genLaw(0));
  const [step,setStep]=useState(1);
  const [a1,setA1]=useState('');const [a2,setA2]=useState('');
  const [fb,setFb]=useState(null);

  const switchLaw=(i)=>{setLawIdx(i);const e=genLaw(i);setEx(e);setStep(1);setA1('');setA2('');setFb(null);};
  const reset=()=>{const e=genLaw(lawIdx);setEx(e);setStep(1);setA1('');setA2('');setFb(null);};

  const check1=()=>{
    let correct=false;
    if(ex.law<=2){const v=parseInt(a1);correct=v===ex.expAns;}
    else if(ex.law===3){const v1=parseInt(a1),v2=parseInt(a2);correct=(v1===ex.ansA&&v2===ex.ansB)||(v1===ex.ansB&&v2===ex.ansA);}
    else if(ex.law===4){const v=parseInt(a1);correct=v===1;}
    else{// negative exponent — the student fills the denominator of 1/? (typing 1/n still works)
      const v=a1.trim();
      if(v.includes('/')){const ps=v.split('/');correct=parseInt(ps[0])===1&&parseInt(ps[1])===ex.den;}
      else correct=parseInt(v)===ex.den;
    }
    if(correct){
      if(ex.law<=2){setFb('ok');setTimeout(()=>{setStep(2);setFb(null);},600);}
      else{setFb('ok');setStep(3);}
    } else setFb('err');
  };
  const check2=()=>{
    const v=parseInt(a2);
    if(v===ex.numAns){setFb('ok');setStep(3);}
    else setFb('err');
  };

  return <div className="content">
    <div className="sub-btns">
      {lawNames.map((l,i)=><button key={i} className={`sub-btn ${lawIdx===i?'active':''}`} onClick={()=>switchLaw(i)}>{i+1}. {l}</button>)}
    </div>
    <div className="law-card">
      <div className="law-title">חוק {lawIdx+1}: {lawNames[lawIdx]}</div>
      <div className="law-formula">{lawFormulas[lawIdx]}</div>
      <LawProof key={lawIdx} i={lawIdx}/>
    </div>
    <div className="card">
      <div className="card-t">תרגול — {lawNames[lawIdx]}</div>
      <div className="eq-box"><Mx s={ex.q}/></div>

      <div className={`step-card ${step>1?'done':''}`}>
        <div className="step-label">שלב 1{ex.law<=2?' — מצא את המעריך':ex.law===3?' — חשב כל חזקה בנפרד':ex.law===5?' — כתוב כשבר: 1 חלקי ?':' — מצא את התוצאה'}</div>
        {step===1?<>
          <div className="ans-row">
            {ex.law<=2?<>
              <span style={{fontSize:18}}>{ex.base}<sup><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:45}} onKeyDown={e=>e.key==='Enter'&&check1()}/></sup></span>
            </>:ex.law===3?<>
              <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:55}}/>
              <span>·</span>
              <input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" style={{width:55}} onKeyDown={e=>e.key==='Enter'&&check1()}/>
            </>:ex.law===5?<>
              <Frac n="1" d={<input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:64}} onKeyDown={e=>e.key==='Enter'&&check1()}/>}/>
            </>:<>
              <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:70}} onKeyDown={e=>e.key==='Enter'&&check1()}/>
            </>}
            <button className="btn bg" onClick={check1}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ שלב הושלם</div>}
      </div>

      {ex.law<=2&&step>=2&&<div className={`step-card ${step>2?'done':''}`}>
        <div className="step-label">שלב 2 — חשב את התוצאה המספרית</div>
        {step===2?<>
          <div className="ans-row">
            <span style={{fontSize:18}}>{ex.base}<sup>{ex.expAns}</sup> =</span>
            <input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" onKeyDown={e=>e.key==='Enter'&&check2()}/>
            <button className="btn bg" onClick={check2}>✓ בדוק</button>
          </div>
          <Fb fb={fb}/>
        </>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.numAns}</div>}
      </div>}
    </div>
    {step>=3?<div className="banner">✅ כל הכבוד!
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══════════════════════════════════════
   CHAPTER 3 — Power Laws (Parametric)
   ═══════════════════════════════════════ */
function genParam(subIdx){
  const [v,w]=pickVars();
  if(subIdx===0){// x^a * x^b = x^?
    const a=randInt(2,6),b=randInt(2,6);
    return {v,w,sub:0,a,b,ans:a+b,q:`${v}^${a} · ${v}^${b} = ${v}^?`};
  }
  if(subIdx===1){// (x^a)^b * x^c = x^?
    const a=randInt(2,3),b=randInt(2,3),c=randInt(1,4);
    return {v,w,sub:1,a,b,c,step1:a*b,ans:a*b+c,q:`(${v}^${a})^${b} · ${v}^${c} = ${v}^?`};
  }
  if(subIdx===2){// (kx^a)^b = ?·x^?
    const k=pick([2,3,4,5]);const a=randInt(2,4);const b=pick([2,3]);
    return {v,w,sub:2,k,a,b,coefAns:Math.pow(k,b),expAns:a*b,q:`(${k}${v}^${a})^${b} = ?·${v}^?`};
  }
  if(subIdx===3){// x^a / x^b = x^?
    const a=randInt(5,9),b=randInt(1,a-1);
    return {v,w,sub:3,a,b,ans:a-b,q:`${v}^${a} / ${v}^${b} = ${v}^?`};
  }
  // sub 4: (kx^a·y^b)^c
  const k=pick([2,3]);const a=randInt(1,3),b=randInt(1,3),c=pick([2,3]);
  return {v,w,sub:4,k,a,b,c,coefAns:Math.pow(k,c),expA:a*c,expB:b*c,q:`(${k}${v}^${a}${w}^${b})^${c} = ?·${v}^?·${w}^?`};
}

const paramNames=['כפל פשוט','חזקה של חזקה + כפל','חזקה עם מקדם','חילוק','ביטוי מעורב'];

function Ch3(){
  const [subIdx,setSubIdx]=useState(0);
  const [ex,setEx]=useState(()=>genParam(0));
  const [step,setStep]=useState(1);
  const [a1,setA1]=useState('');const [a2,setA2]=useState('');const [a3,setA3]=useState('');
  const [fb,setFb]=useState(null);

  const switchSub=(i)=>{setSubIdx(i);setEx(genParam(i));setStep(1);setA1('');setA2('');setA3('');setFb(null);};
  const reset=()=>{setEx(genParam(subIdx));setStep(1);setA1('');setA2('');setA3('');setFb(null);};

  const check=()=>{
    let correct=false;
    if(ex.sub===0||ex.sub===3){correct=parseInt(a1)===ex.ans;}
    else if(ex.sub===1){
      if(step===1){correct=parseInt(a1)===ex.step1;}
      else{correct=parseInt(a2)===ex.ans;}
    }
    else if(ex.sub===2){correct=parseInt(a1)===ex.coefAns&&parseInt(a2)===ex.expAns;}
    else if(ex.sub===4){correct=parseInt(a1)===ex.coefAns&&parseInt(a2)===ex.expA&&parseInt(a3)===ex.expB;}
    if(correct){
      if(ex.sub===1&&step===1){setFb('ok');setTimeout(()=>{setStep(2);setFb(null);},600);}
      else{setFb('ok');setStep(10);}
    } else setFb('err');
  };

  return <div className="content">
    <div className="sub-btns">
      {paramNames.map((l,i)=><button key={i} className={`sub-btn ${subIdx===i?'active':''}`} onClick={()=>switchSub(i)}>{String.fromCharCode(1488+i)}. {l}</button>)}
    </div>
    <div className="card">
      <div className="card-t">חוקי חזקות — פרמטרי</div>
      <div className="eq-box"><Mx s={ex.q}/></div>

      {(ex.sub===0||ex.sub===3)?<div className={`step-card ${step>=10?'done':''}`}>
        <div className="step-label">מצא את המעריך</div>
        {step<10?<><div className="ans-row">
          <span style={{fontSize:18}}>{ex.v}<sup><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:45}} onKeyDown={e=>e.key==='Enter'&&check()}/></sup></span>
          <button className="btn bg" onClick={check}>✓ בדוק</button>
        </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.v}<sup>{ex.ans}</sup></div>}
      </div>

      :ex.sub===1?<>
        <div className={`step-card ${step>1?'done':''}`}>
          <div className="step-label">שלב 1 — פשט ({ex.v}<sup>{ex.a}</sup>)<sup>{ex.b}</sup></div>
          {step===1?<><div className="ans-row">
            <span style={{fontSize:18}}>{ex.v}<sup><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:45}} onKeyDown={e=>e.key==='Enter'&&check()}/></sup></span>
            <button className="btn bg" onClick={check}>✓ בדוק</button>
          </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.v}<sup>{ex.step1}</sup></div>}
        </div>
        {step>=2&&<div className={`step-card ${step>=10?'done':''}`}>
          <div className="step-label">שלב 2 — חשב {ex.v}<sup>{ex.step1}</sup> · {ex.v}<sup>{ex.c}</sup></div>
          {step<10?<><div className="ans-row">
            <span style={{fontSize:18}}>{ex.v}<sup><input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" style={{width:45}} onKeyDown={e=>e.key==='Enter'&&check()}/></sup></span>
            <button className="btn bg" onClick={check}>✓ בדוק</button>
          </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.v}<sup>{ex.ans}</sup></div>}
        </div>}
      </>

      :ex.sub===2?<div className={`step-card ${step>=10?'done':''}`}>
        <div className="step-label">מצא את המקדם והמעריך</div>
        {step<10?<><div className="ans-row">
          <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="מקדם" style={{width:60}}/>
          <span>· {ex.v}<sup><input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" style={{width:45}}
            onKeyDown={e=>e.key==='Enter'&&check()}/></sup></span>
          <button className="btn bg" onClick={check}>✓ בדוק</button>
        </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.coefAns}{ex.v}<sup>{ex.expAns}</sup></div>}
      </div>

      :<div className={`step-card ${step>=10?'done':''}`}>
        <div className="step-label">מצא את המקדם והמעריכים</div>
        {step<10?<><div className="ans-row">
          <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="מקדם" style={{width:55}}/>
          <span>· {ex.v}<sup><input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" style={{width:40}}/></sup></span>
          <span>· {ex.w}<sup><input value={a3} onChange={e=>{setA3(e.target.value);setFb(null);}} placeholder="?" style={{width:40}}
            onKeyDown={e=>e.key==='Enter'&&check()}/></sup></span>
          <button className="btn bg" onClick={check}>✓ בדוק</button>
        </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.coefAns}{ex.v}<sup>{ex.expA}</sup>{ex.w}<sup>{ex.expB}</sup></div>}
      </div>}
    </div>
    {step>=10?<div className="banner">✅ כל הכבוד!
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>ביטוי חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>ביטוי חדש ↺</button></div>}
  </div>;
}

/* ═══════════════════════════════════════
   CHAPTER 4 — Square Roots
   ═══════════════════════════════════════ */
function genRoot(subIdx){
  if(subIdx===0){// exact: √n² = n
    const n=pick([2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
    return {sub:0,val:n*n,ans:n};
  }
  if(subIdx===1){// simplify: √(a²·b) = a√b
    const pairs=[[2,2,8],[2,3,12],[2,5,20],[2,7,28],[3,2,18],[3,3,27],[3,5,45],[4,2,32],[4,3,48],[5,2,50],[5,3,75],[6,2,72]];
    const [a,b,val]=pick(pairs);
    return {sub:1,val,a,b,q:`√${val}`};
  }
  if(subIdx===2){// operations
    const opType=randInt(0,3);
    if(opType===0){// √a · √b = √(ab)
      const pairs=[[3,12,36,6],[2,8,16,4],[5,20,100,10],[2,18,36,6],[3,27,81,9],[2,32,64,8]];
      const [a,b,prod,ans]=pick(pairs);
      return {sub:2,opType:0,a,b,prod,ans,q:`√${a} · √${b}`};
    }
    if(opType===1){// √a / √b
      const pairs=[[50,2,25,5],[72,2,36,6],[75,3,25,5],[48,3,16,4],[98,2,49,7]];
      const [a,b,div,ans]=pick(pairs);
      return {sub:2,opType:1,a,b,div,ans,q:`√${a} ÷ √${b}`};
    }
    if(opType===2){// k√a + m√a = (k+m)√a
      const base=pick([2,3,5,7]);const k=randInt(1,5),m=randInt(1,5);
      return {sub:2,opType:2,base,k,m,ans:k+m,q:`${k}√${base} + ${m}√${base}`};
    }
    // opType===3: √8 + √2 = 3√2
    const triples=[[8,2,3,2],[18,2,4,2],[12,3,3,3],[27,3,4,3],[20,5,3,5],[45,5,4,5],[50,2,6,2]];
    const [a,b,coef,base]=pick(triples);
    return {sub:2,opType:3,a,b,coef,base,q:`√${a} + √${b}`};
  }
  return genRoot(0);
}

const rootNames=['שורשים מדויקים','פישוט שורשים','פעולות עם שורשים'];

// Exact roots: an example and the multiplication table, whose diagonal holds every perfect square.
function RootExactInfo(){
  const n=[1,2,3,4,5,6,7,8,9,10];
  // open on computers; on phones it starts closed so the exercise stays close
  const [wide]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(min-width: 700px)').matches);
  return <div className="info pw-info">
    <p><b>דוגמה:</b> <span className="mx">√49 = 7</span>, כי <span className="mx">7<sup>2</sup> = 7·7 = 49</span>. שואלים: איזה מספר כפול עצמו נותן 49?</p>
    <p>השורשים המדויקים נמצאים על <b>האלכסון של לוח הכפל</b>: שם כל מספר כפול עצמו.</p>
    <details className="sq-details" open={wide}>
      <summary>לוח הכפל — האלכסון</summary>
      <div className="sq-wrap"><table className="sq-table" dir="ltr"><tbody>
        <tr><th>×</th>{n.map(c=><th key={c}>{c}</th>)}</tr>
        {n.map(r=><tr key={r}><th>{r}</th>{n.map(c=><td key={c} className={r===c?'d':''}>{r*c}</td>)}</tr>)}
      </tbody></table></div>
    </details>
    <p className="pw-warn">⭐ חשוב לדעת בעל פה את השורשים המדויקים לפחות עד 100:</p>
    <div className="sq-chips" dir="ltr">{n.map(k=><span key={k}>√{k*k} = {k}</span>)}</div>
  </div>;
}

// Simplifying roots: the rule, why it is true (law 4: power of a product), and an example.
function RootSimplifyInfo(){
  return <div className="info pw-info">
    <p><b>הכלל:</b> <span className="mx">√(a·b) = √a · √b</span>. שורש של מכפלה שווה למכפלת השורשים (כש-a ו-b אינם שליליים).</p>
    <p><b>למה?</b> לפי חוק 4 בחוקי חזקות (חזקה של מכפלה): <Mx s="(√a · √b)^2 = (√a)^2 · (√b)^2 = a·b"/>. כלומר <span className="mx">√a · √b</span> הוא המספר שבריבוע נותן <span className="mx">a·b</span>, ולכן הוא <span className="mx">√(a·b)</span>.</p>
    <p><b>דוגמה:</b> <span className="mx">√12 = √(4·3) = √4 · √3 = 2√3</span></p>
    <p>הטריק: מחפשים את <b>הריבוע המושלם הגדול ביותר</b> שמחלק את המספר (מהאלכסון של לוח הכפל), ומוציאים את השורש שלו מחוץ לשורש.</p>
  </div>;
}

function Ch4(){
  const [subIdx,setSubIdx]=useState(0);
  const [ex,setEx]=useState(()=>genRoot(0));
  const [step,setStep]=useState(1);
  const [a1,setA1]=useState('');const [a2,setA2]=useState('');
  const [fb,setFb]=useState(null);

  const switchSub=(i)=>{setSubIdx(i);setEx(genRoot(i));setStep(1);setA1('');setA2('');setFb(null);};
  const reset=()=>{setEx(genRoot(subIdx));setStep(1);setA1('');setA2('');setFb(null);};

  const check=()=>{
    let correct=false;
    if(ex.sub===0){correct=parseInt(a1)===ex.ans;}
    else if(ex.sub===1){
      if(step===1){// decomposition: a² and b
        const v1=parseInt(a1),v2=parseInt(a2);
        correct=(v1===ex.a*ex.a&&v2===ex.b);
      } else {// final: coef√base
        const v1=parseInt(a1),v2=parseInt(a2);
        correct=v1===ex.a&&v2===ex.b;
      }
    } else {
      if(ex.opType===0){correct=parseInt(a1)===ex.ans;}
      else if(ex.opType===1){correct=parseInt(a1)===ex.ans;}
      else if(ex.opType===2){correct=parseInt(a1)===ex.ans;}
      else{// √a+√b = coef√base
        const v1=parseInt(a1),v2=parseInt(a2);
        correct=v1===ex.coef&&v2===ex.base;
      }
    }
    if(correct){
      if(ex.sub===1&&step===1){setFb('ok');setTimeout(()=>{setStep(2);setFb(null);},600);}
      else{setFb('ok');setStep(10);}
    } else setFb('err');
  };

  return <div className="content">
    <div className="info">
      <b>שורש ריבועי</b> הוא הפעולה ההפוכה לחזקה שנייה: <span style={{direction:'ltr',display:'inline-block'}}>√n² = n</span>
    </div>
    <div className="sub-btns">
      {rootNames.map((l,i)=><button key={i} className={`sub-btn ${subIdx===i?'active':''}`} onClick={()=>switchSub(i)}>{String.fromCharCode(1488+i)}. {l}</button>)}
    </div>
    {subIdx===0&&<RootExactInfo/>}
    {subIdx===1&&<RootSimplifyInfo/>}
    <div className="card">
      <div className="card-t">{rootNames[subIdx]}</div>

      {ex.sub===0?<>
        <div className="eq-box">√{ex.val} = ?</div>
        <div className="vis-wrap">
          <div style={{textAlign:'center'}}>
            <svg viewBox="0 0 120 120" style={{width:100,height:100}}>
              <rect x={5} y={5} width={110} height={110} fill="#ede9fe" stroke="#7c3aed" strokeWidth={2} rx={6}/>
              <text x={60} y={50} textAnchor="middle" fontSize="14" fill="#7c3aed" fontWeight="700">שטח = {ex.val}</text>
              <text x={60} y={75} textAnchor="middle" fontSize="14" fill="#6d28d9">צלע = ?</text>
            </svg>
          </div>
        </div>
        <div className={`step-card ${step>=10?'done':''}`}>
          <div className="step-label">איזה מספר בריבוע נותן {ex.val}?</div>
          {step<10?<><div className="ans-row">
            <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" onKeyDown={e=>e.key==='Enter'&&check()}/>
            <button className="btn bg" onClick={check}>✓ בדוק</button>
          </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.ans}</div>}
        </div>
      </>

      :ex.sub===1?<>
        <div className="eq-box">{ex.q} = ?√?</div>
        <div className={`step-card ${step>1?'done':''}`}>
          <div className="step-label">שלב 1 — פרק: √({ex.val}) = √(__ · __)</div>
          {step===1?<><div className="ans-row">
            <span>√(</span>
            <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="ריבועי" style={{width:55}}/>
            <span>·</span>
            <input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="שארית" style={{width:55}} onKeyDown={e=>e.key==='Enter'&&check()}/>
            <span>)</span>
            <button className="btn bg" onClick={check}>✓ בדוק</button>
          </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ √({ex.a*ex.a}·{ex.b})</div>}
        </div>
        {step>=2&&<div className={`step-card ${step>=10?'done':''}`}>
          <div className="step-label">שלב 2 — הוצא מהשורש</div>
          {step<10?<><div className="ans-row">
            <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="מקדם" style={{width:50}}/>
            <span>√</span>
            <input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" style={{width:50}} onKeyDown={e=>e.key==='Enter'&&check()}/>
            <button className="btn bg" onClick={check}>✓ בדוק</button>
          </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>✓ {ex.a}√{ex.b}</div>}
        </div>}
      </>

      :<>
        <div className="eq-box">{ex.q} = ?</div>
        <div className={`step-card ${step>=10?'done':''}`}>
          <div className="step-label">חשב</div>
          {step<10?<><div className="ans-row">
            {(ex.opType===3)?<>
              <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="מקדם" style={{width:50}}/>
              <span>√</span>
              <input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" style={{width:50}} onKeyDown={e=>e.key==='Enter'&&check()}/>
            </>:ex.opType===2?<>
              <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="מקדם" style={{width:50}} onKeyDown={e=>e.key==='Enter'&&check()}/>
              <span>√{ex.base}</span>
            </>:<>
              <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" onKeyDown={e=>e.key==='Enter'&&check()}/>
            </>}
            <button className="btn bg" onClick={check}>✓ בדוק</button>
          </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
            {ex.opType===3?`✓ ${ex.coef}√${ex.base}`:ex.opType===2?`✓ ${ex.ans}√${ex.base}`:`✓ ${ex.ans}`}
          </div>}
        </div>
      </>}
    </div>
    {step>=10?<div className="banner">✅ כל הכבוד!
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>תרגיל חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>תרגיל חדש ↺</button></div>}
  </div>;
}

/* ═══════════════════════════════════════
   CHAPTER 5 — Everything Together
   ═══════════════════════════════════════ */
function genCombined(diff){
  const [v,w]=pickVars();
  // easy: one power law, or a root of an even power
  const easy=[
    ()=>{const a=pick([4,6,8,10]);return {q:`√(${v}^${a}) = ${v}^?`,ans:a/2,type:'exp'};},
    ()=>{const a=randInt(3,5),b=randInt(1,2*a-1);return {q:`(${v}^${a})^2 ÷ ${v}^${b} = ${v}^?`,ans:2*a-b,type:'exp'};},
    ()=>{const a=randInt(2,6),b=randInt(2,6),c=randInt(1,a+b-1);return {q:`${v}^${a} · ${v}^${b} ÷ ${v}^${c} = ${v}^?`,ans:a+b-c,type:'exp'};},
  ];
  // medium: a root together with a power law
  const medium=[
    ()=>{const a=pick([4,6,8]);return {q:`(√${v})^${a} = ${v}^?`,ans:a/2,type:'exp'};},
    ()=>{const a=pick([2,4,6]),b=randInt(1,4);return {q:`√(${v}^${a}) · ${v}^${b} = ${v}^?`,ans:a/2+b,type:'exp'};},
    ()=>{const b=pick([2,4,6]),a=randInt(b/2+1,b/2+5);return {q:`${v}^${a} ÷ √(${v}^${b}) = ${v}^?`,ans:a-b/2,type:'exp'};},
    ()=>{const k=randInt(2,5),a=randInt(1,4);return {q:`(${k}${v}^${a})^2 = ?·${v}^?`,coef:k*k,expAns:2*a,type:'coefexp'};},
  ];
  // hard: several laws in one expression
  const hard=[
    ()=>{const a=pick([2,3]),b=pick([2,4]);return {q:`√(${v}^${a*b}·${w}^${2*b}) = ${v}^?·${w}^?`,ansA:a*b/2,ansB:b,type:'2exp'};},
    ()=>{const a=pick([2,3,4]);return {q:`${v}^${a} · √(${v}^${2*a}) = ${v}^?`,ans:2*a,type:'exp'};},
    ()=>{const k=pick([4,9,16,25]);const r=Math.sqrt(k);const a=pick([2,4]);return {q:`√(${k}${v}^${a}) = ?·${v}^?`,coef:r,expAns:a/2,type:'coefexp'};},
    ()=>{const a=pick([3,5,7]),b=pick([1,3,5]);return {q:`√(${v}^${a}) · ${b===1?`√${v}`:`√(${v}^${b})`} = ${v}^?`,ans:(a+b)/2,type:'exp'};},
    ()=>{const a=randInt(2,3),b=randInt(2,3),c=pick([2,3]),d=randInt(1,a*c-1);return {q:`(${v}^${a}${w}^${b})^${c} ÷ ${v}^${d} = ${v}^?·${w}^?`,ansA:a*c-d,ansB:b*c,type:'2exp'};},
    ()=>{const a=randInt(1,4),b=randInt(a+1,a+6);return {q:`${v}^(−${a}) · ${v}^${b} = ${v}^?`,ans:b-a,type:'exp'};},
  ];
  return {diff,v,w,...pick([easy,medium,hard][diff])()};
}

const diffNames=['קל','בינוני','קשה'];

function Ch5(){
  const [diff,setDiff]=useState(0);
  const [ex,setEx]=useState(()=>genCombined(0));
  const [a1,setA1]=useState('');const [a2,setA2]=useState('');
  const [fb,setFb]=useState(null);const [done,setDone]=useState(false);

  const switchDiff=(d)=>{setDiff(d);setEx(genCombined(d));setA1('');setA2('');setFb(null);setDone(false);};
  const reset=()=>{setEx(genCombined(diff));setA1('');setA2('');setFb(null);setDone(false);};

  const check=()=>{
    let correct=false;
    if(ex.type==='exp'){correct=parseFloat(a1)===ex.ans;}
    else if(ex.type==='2exp'){correct=parseFloat(a1)===ex.ansA&&parseFloat(a2)===ex.ansB;}
    else if(ex.type==='coefexp'){correct=parseFloat(a1)===ex.coef&&parseFloat(a2)===ex.expAns;}
    if(correct){setFb('ok');setDone(true);}
    else setFb('err');
  };

  return <div className="content">
    <div className="sub-btns">
      {diffNames.map((l,i)=><button key={i} className={`sub-btn ${diff===i?'active':''}`} onClick={()=>switchDiff(i)}>{l}</button>)}
    </div>
    <div className="card">
      <div className="card-t">הכל יחד</div>
      <div className="eq-box"><Mx s={ex.q}/></div>
      <div className={`step-card ${done?'done':''}`}>
        <div className="step-label">פשט את הביטוי</div>
        {!done?<><div className="ans-row">
          {ex.type==='exp'?<>
            <span>{ex.v}<sup><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:45}} onKeyDown={e=>e.key==='Enter'&&check()}/></sup></span>
          </>:ex.type==='2exp'?<>
            <span>{ex.v}<sup><input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="?" style={{width:40}}/></sup></span>
            <span>· {ex.w}<sup><input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" style={{width:40}} onKeyDown={e=>e.key==='Enter'&&check()}/></sup></span>
          </>:<>
            <input value={a1} onChange={e=>{setA1(e.target.value);setFb(null);}} placeholder="מקדם" style={{width:50}}/>
            <span>· {ex.v}<sup><input value={a2} onChange={e=>{setA2(e.target.value);setFb(null);}} placeholder="?" style={{width:40}} onKeyDown={e=>e.key==='Enter'&&check()}/></sup></span>
          </>}
          <button className="btn bg" onClick={check}>✓ בדוק</button>
        </div><Fb fb={fb}/></>:<div className="ans-row" style={{color:'#16a34a',fontWeight:700}}>
          ✓ <Mx s={ex.type==='exp'?`${ex.v}^${ex.ans}`:ex.type==='2exp'?`${ex.v}^${ex.ansA}·${ex.w}^${ex.ansB}`:`${ex.coef}${ex.v}^${ex.expAns}`}/>
        </div>}
      </div>
    </div>
    {done?<div className="banner">✅ כל הכבוד!
      <div style={{marginTop:12}}><button className="btn" style={{background:'#fff',color:'#16a34a',fontSize:17}} onClick={reset}>ביטוי חדש ↺</button></div>
    </div>:<div className="center" style={{marginTop:8}}><button className="btn bp" onClick={reset}>ביטוי חדש ↺</button></div>}
  </div>;
}

/* ═══════ Main App ═══════ */
function App(){
  const [ch,setCh]=useState(1);
  const labels=['הבנת חזקות','חוקי חזקות','פרמטרי','שורשים','הכל יחד'];
  return <div>
    <div className="hdr">
      <div className="hdr-title">חזקות ושורשים</div>
      <div className="ch-btns">
        {labels.map((l,i)=><button key={i} className={`ch-btn ${ch===i+1?'active':''}`} onClick={()=>setCh(i+1)}>{i+1}. {l}</button>)}
      </div>
    </div>
    {ch===1?<Ch1 key="c1"/>:ch===2?<Ch2 key="c2"/>:ch===3?<Ch3 key="c3"/>:ch===4?<Ch4 key="c4"/>:<Ch5 key="c5"/>}
  </div>;
}


// ===== END ORIGINAL =====
export default App;
