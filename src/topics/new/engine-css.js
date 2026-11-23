// The CSS of the shared chapter engine (board #84): the "חדש" module, "סטטיסטיקה והסתברות",
// "מערכת משוואות", and every chapter of it mounted inside another topic (./Mount.jsx).
// Everything is prefixed nw-; the base page look comes from src/styles/mp.css.

/* the page base of a topic built only from engine chapters (the module pages) */
export const LEGACY = `@layer mp-base, legacy, mp, page;
@layer legacy {
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#eef2ff;color:#1e293b;min-height:100vh;direction:rtl}
.hdr{background:linear-gradient(135deg,#312e81,#4f46e5);color:#fff;padding:18px 20px;text-align:center}
.hdr h1{margin:0;font-size:1.3rem}
.hdr-sub{display:block;margin-top:4px;font-size:.85rem;color:#c7d2fe}
.content{max-width:640px;margin:20px auto;padding:0 16px 60px}
.card{background:#fff;border-radius:14px;padding:22px 18px;box-shadow:0 2px 10px rgba(49,46,129,.08);margin-bottom:16px}
.sub-tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:14px}
.action-row{display:flex;gap:10px;justify-content:center;margin-top:16px}
.center{text-align:center}
.banner{padding:20px;margin-bottom:14px;text-align:center;font-size:1.2rem;font-weight:700}
.choice-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.ch-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:12px}
}
`;

/* the engine's own look (explanation, practice, drawings) */
export const NW_CSS = `/* ── math ── */
#root .nw-m{display:inline-block;direction:ltr;unicode-bidi:isolate;white-space:nowrap;font-weight:700;color:var(--a-900);font-variant-numeric:tabular-nums}
#root .nw-v{font-style:italic;color:var(--a-600);padding-inline-end:.04em}
#root .nw-m sup{font-size:.68em;line-height:0;vertical-align:.55em;margin-left:.04em}
#root .nw-m sub{font-size:.68em;line-height:0;vertical-align:-.3em}
#root .nw-fr{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:.86em;line-height:1.2;margin:0 .14em}
#root .nw-fr>span{padding:0 .3em}
#root .nw-fr>span:first-child{border-bottom:2px solid currentColor;padding-bottom:1px}
#root .nw-fr>span:last-child{padding-top:1px}
#root .nw-slot{display:inline-block;width:1.5em;height:1.35em;vertical-align:-.3em;margin:0 .12em;border-radius:7px;border:1.5px dashed var(--a-300);background:var(--a-50)}

/* ── note for the team: where this chapter belongs ── */
#root .nw-place{display:grid;gap:2px;margin:0 0 14px;padding:10px 14px;border-radius:14px;border:1px dashed var(--line-strong);background:var(--surface-2);font-size:.88rem;line-height:1.6;color:var(--ink-2)}
#root .nw-place-t{font-size:.76rem;font-weight:700;color:var(--ink-3)}
#root .nw-place-b b{color:var(--ink);font-weight:700}

/* ── explanation ── */
#root .nw-lesson .nw-p{font-size:1.02rem;line-height:1.8;color:var(--ink-2);margin:0}
#root .nw-lesson>*+*{margin-top:12px}
#root .nw-lesson>.card-t{margin-bottom:0}
#root .nw-formula{direction:ltr;text-align:center;padding:14px 10px;border-radius:14px;background:color-mix(in srgb,var(--a-50) 75%,#fff);font-size:clamp(1.1rem,4.6vw,1.45rem);overflow-x:auto}
#root .nw-formula .nw-m{white-space:normal;line-height:1.9}
#root .nw-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
#root .nw-list li{position:relative;padding-inline-start:18px;font-size:1.02rem;line-height:1.7;color:var(--ink)}
#root .nw-list li::before{content:"";position:absolute;inset-inline-start:2px;top:.72em;width:7px;height:7px;border-radius:50%;background:var(--a-500)}
#root .nw-note{font-size:.92rem;line-height:1.7;color:var(--ink-2);padding:10px 14px;border-radius:12px;background:var(--warn-50);border:1px solid var(--warn-200)}
#root .nw-ex{padding:12px 14px 14px;border-radius:14px;background:color-mix(in srgb,var(--a-50) 75%,#fff)}
#root .nw-ex-t{display:block;font-size:.82rem;font-weight:700;color:var(--a-700);margin-bottom:2px}
#root .nw-ex-q{font-size:1.02rem;line-height:1.8;color:var(--ink);font-weight:600;margin:0}
#root .nw-steps{list-style:none;counter-reset:nw;margin:12px 0 0;padding:0;display:grid;gap:10px;text-align:start}
#root .nw-steps li{counter-increment:nw;position:relative;padding-inline-start:36px;min-height:28px;font-size:1rem;line-height:1.75;color:var(--ink);font-weight:500}
#root .nw-steps li::before{content:counter(nw);position:absolute;inset-inline-start:0;top:2px;width:26px;height:26px;border-radius:50%;background:var(--a-100);color:var(--a-800);font-size:.85rem;font-weight:700;display:flex;align-items:center;justify-content:center}
#root .nw-go{display:flex;justify-content:center;margin:4px 0 28px}
#root .nw-go .btn{min-height:52px;width:min(100%,340px);font-size:1.02rem}

/* ── practice ── */
#root .nw-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
#root .nw-tag{margin:0;padding:5px 12px;border-radius:var(--r-pill);background:var(--a-50);color:var(--a-800);font-size:.85rem;font-weight:700;line-height:1.3}
#root .nw-count{font-size:.82rem;color:var(--ink-3)}
#root .nw-ask{font-size:var(--q-ask);line-height:1.85;color:var(--ink);font-weight:500;margin:0;white-space:pre-line}
#root .nw-rows{display:grid;gap:14px;margin-top:18px}
#root .nw-row{display:grid;gap:6px;justify-items:center}
#root .nw-lbl{font-size:.95rem;font-weight:700;color:var(--ink);justify-self:start}
/* answer rows drawn as a table to fill in (q.tableHead, board #94) */
#root .nw-rows--table{grid-template-columns:minmax(120px,max-content) minmax(110px,max-content);gap:0;justify-content:center;width:max-content;max-width:100%;margin-inline:auto;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff}
#root .nw-rows--table .nw-row{display:contents}
#root .nw-rows--table :is(.nw-th,.nw-lbl,.nw-line){display:flex;align-items:center;justify-content:center;padding:6px 14px;border-bottom:1px solid var(--line);min-height:52px}
#root .nw-rows--table :is(.nw-th,.nw-lbl){border-inline-end:1px solid var(--line)}
#root .nw-rows--table .nw-th:nth-child(2){border-inline-end:0}
#root .nw-rows--table .nw-th{background:var(--a-50);color:var(--a-900);font-weight:700;min-height:44px}
#root .nw-rows--table .nw-lbl{justify-self:stretch;font-weight:600}
#root .nw-rows--table .nw-row:last-child :is(.nw-lbl,.nw-line){border-bottom:0;background:var(--a-50)}
#root .nw-rows--table .nw-row:last-child .nw-lbl{font-weight:700}
#root .nw-rows--table .nw-line{border-radius:0;background:transparent;box-shadow:none;margin:0;width:auto}
#root .nw-rows--table .nw-row:last-child .nw-line{background:var(--a-50)}
#root .nw-line{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 10px;direction:rtl;font-size:clamp(1.2rem,5.4vw,1.5rem);max-width:100%;padding:12px 10px;border-radius:14px;background:color-mix(in srgb,var(--a-50) 75%,#fff);width:100%}
#root .nw-grp{display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 6px;direction:ltr;max-width:100%}
#root .nw-unit{font-size:1rem;font-weight:600;color:var(--ink-2)}
#root .nw-in{width:4.2ch;min-width:64px;height:48px;padding:0 6px;text-align:center;direction:ltr;font:inherit;font-weight:700;font-size:1.2rem;color:var(--ink);background:#fff;border:1.5px solid var(--line-strong);border-radius:12px;outline:0;transition:border-color var(--t),box-shadow var(--t)}
#root .nw-in:focus{border-color:var(--a-500);box-shadow:var(--ring)}
#root .nw-in.ok{border-color:var(--ok-500);background:var(--ok-50);color:var(--ok-800)}
#root .nw-frin{display:inline-flex;flex-direction:column;align-items:center;gap:5px;vertical-align:middle;position:relative}
#root .nw-frin::after{content:"";position:absolute;left:-3px;right:-3px;top:50%;height:2px;margin-top:-1px;background:var(--a-900);border-radius:2px}
#root .nw-in--fr{height:40px;min-width:60px;width:60px;font-size:1.1rem}
#root .nw-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px}
#root .nw-choice{min-height:56px;padding:8px 10px;border-radius:14px;font-size:1.05rem;line-height:1.5;white-space:normal}
#root .nw-choice:disabled{opacity:1;cursor:default}
#root .nw-card :is(.fb,.nw-warn){margin-top:14px}
#root .nw-warn{text-align:center;border-radius:14px;font-weight:600;line-height:1.5}
#root .nw-card .fb :is(.nw-m,.nw-v){color:inherit}
#root .nw-actions{flex-wrap:wrap}
#root .nw-actions .btn{min-height:52px}
#root .nw-actions .bp{flex:1 1 200px;max-width:340px}
#root .nw-sol{margin-top:16px;padding:12px 14px 14px;border-radius:14px;background:color-mix(in srgb,var(--a-50) 75%,#fff);text-align:start}
#root .nw-sol-t{font-size:.82rem;font-weight:700;color:var(--a-700)}
#root .nw-banner .nw-sol{background:rgb(255 255 255 / .72);margin:14px auto 2px;max-width:520px}
#root .nw-banner .nw-sol-t{color:var(--ok-700)}
#root .nw-banner .nw-steps li{font-size:.98rem;color:var(--ok-900)}
#root .nw-banner .nw-steps li::before{background:var(--ok-100);color:var(--ok-800)}
#root .nw-banner :is(.nw-m,.nw-v){color:var(--ok-800)}
#root .nw-banner .btn{margin-top:16px;min-height:48px;min-width:160px}
#root .nw-skip{display:flex;justify-content:center;margin:-4px 0 24px}
#root .nw-other{min-height:44px;padding:8px 16px;border:0;background:transparent;box-shadow:none;color:var(--ink-3);font-size:.9rem;font-weight:500;text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--line-strong)}

/* ── word problems: the student's own work before the final answer (board #93) ── */
#root .nw-wk{margin-top:18px;padding:14px;border-radius:16px;background:color-mix(in srgb,var(--a-50) 60%,#fff);border:1px solid var(--a-100);transition:background-color 180ms ease-out,border-color 180ms ease-out}
#root .nw-wk.is-open{background:#fff;border-color:var(--a-200);box-shadow:var(--sh-1)}
#root .nw-wk-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
#root .nw-wk-t{font-size:.92rem;font-weight:700;color:var(--a-900)}
#root .nw-wk-pick{display:flex;flex-wrap:wrap;gap:8px}
#root .nw-wk-chip{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:6px 14px 6px 16px;border-radius:var(--r-pill);border:1.5px solid var(--a-200);background:#fff;color:var(--a-800);font:inherit;font-size:.95rem;font-weight:700;white-space:nowrap;cursor:pointer;transition:transform 100ms ease-out,background-color 140ms ease-out,border-color 140ms ease-out,color 140ms ease-out;-webkit-tap-highlight-color:transparent}
#root .nw-wk-chip:active{transform:scale(.97)}
#root .nw-wk-chip.on{background:var(--a-600);border-color:var(--a-600);color:#fff}

#root .nw-wk-ico{display:inline-grid;place-items:center;min-width:22px;font-size:.9rem}
#root .nw-wk-x{font-family:Georgia,'Times New Roman',serif;font-size:1.15rem;font-weight:700;line-height:1}
#root .nw-wk-body{display:grid;gap:10px;margin-top:14px;animation:nw-wk-in 220ms cubic-bezier(.2,.8,.2,1)}
@keyframes nw-wk-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
#root .nw-wk-lbl{display:block;margin:0;font-size:.95rem;line-height:1.6;font-weight:600;color:var(--ink-2)}
#root .nw-wk-eqrow{display:flex;gap:8px;align-items:stretch}
#root .nw-wk-in{flex:1 1 auto;min-width:0;height:52px;padding:0 14px;direction:ltr;text-align:left;font:inherit;font-size:1.2rem;font-weight:700;color:var(--ink);background:#fff;border:1.5px solid var(--line-strong);border-radius:12px;outline:0;transition:border-color var(--t),box-shadow var(--t)}
#root .nw-wk-in::placeholder{color:var(--ink-3);font-weight:500;font-size:1rem}
#root .nw-wk-in:focus{border-color:var(--a-500);box-shadow:var(--ring)}
#root .nw-wk-in.ok{border-color:var(--ok-500);background:var(--ok-50);color:var(--ok-800)}
#root .nw-wk-go{flex:none;min-height:52px;min-width:96px;padding:0 18px;border-radius:12px;border:1.5px solid var(--a-600);background:#fff;color:var(--a-700);font-weight:700}
#root .nw-wk-next{min-height:48px;padding:0 18px;border-radius:12px}
#root .nw-wk-show{text-align:center;font-size:clamp(1.15rem,5vw,1.4rem);padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--a-50) 75%,#fff);overflow-x:auto}
#root .nw-wk-msg{padding:10px 14px;border-radius:12px;font-size:.95rem;line-height:1.6;font-weight:600;text-align:center}
#root .nw-wk-msg.is-ok{background:var(--ok-50);color:var(--ok-800);border:1px solid var(--ok-200)}
#root .nw-wk-msg.is-err{background:var(--bad-50);color:var(--bad-700);border:1px solid var(--bad-200)}
#root .nw-wk-msg.is-warn{background:var(--warn-50);color:var(--warn-800);border:1px solid var(--warn-200)}
#root .nw-wk-msg :is(.nw-m,.nw-v){color:inherit}
#root .nw-wk-acts{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
#root .nw-wk-tablewrap{max-width:100%;overflow-x:auto}
#root .nw-wk-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;table-layout:fixed}
#root .nw-wk-table :is(th,td){padding:6px;text-align:center;border-bottom:1px solid var(--line);border-inline-start:1px solid var(--line);vertical-align:middle}
#root .nw-wk-table :is(th,td):first-child{border-inline-start:0}
#root .nw-wk-table tbody tr:last-child :is(th,td){border-bottom:0}
#root .nw-wk-table thead th{background:var(--a-50);color:var(--a-900);font-size:.92rem;font-weight:700;line-height:1.3}
#root .nw-wk-table thead th:first-child{width:26%}
#root .nw-wk-table thead small{display:block;font-size:.75rem;font-weight:500;color:var(--ink-3)}
#root .nw-wk-table tbody th{font-size:.9rem;font-weight:700;color:var(--ink);line-height:1.35;background:color-mix(in srgb,var(--a-50) 40%,#fff)}
#root .nw-wk-table tr.ok :is(th,td){background:var(--ok-50)}
#root .nw-wk-table tr.bad :is(th,td){background:var(--bad-50)}
#root .nw-wk-cell{width:100%;min-width:0;height:44px;padding:0 4px;text-align:center;direction:ltr;font:inherit;font-weight:700;font-size:1.05rem;color:var(--ink);background:#fff;border:1.5px solid var(--line-strong);border-radius:10px;outline:0}
#root .nw-wk-cell:focus{border-color:var(--a-500);box-shadow:var(--ring)}
#root .nw-final-t{margin:22px 0 -4px;font-size:.92rem;font-weight:700;color:var(--a-900)}
@media (max-width:480px){
  #root .nw-wk{padding:12px 10px}
  #root .nw-wk-pick{width:100%}
  #root .nw-wk-chip{flex:1 1 0;justify-content:center;gap:5px;padding-inline:8px;font-size:.88rem}
  #root .nw-wk-go{min-width:84px;padding:0 12px}
  #root .nw-wk-table :is(th,td){padding:5px 3px}
  #root .nw-wk-table thead th{font-size:.82rem}
  #root .nw-wk-table tbody th{font-size:.8rem}
}
@media (prefers-reduced-motion:reduce){#root .nw-wk-body{animation:none}}

/* ── drawings ── */
#root .nw-figbox{margin:14px auto 0;display:grid;justify-items:center;gap:6px;max-width:100%}
#root .nw-fig{direction:ltr;display:block;width:100%;max-width:380px;height:auto;font-family:var(--font)}
#root .nw-cap{font-size:.85rem;color:var(--ink-3);text-align:center}
#root .nw-tablewrap{max-width:100%;overflow-x:auto}
#root .nw-table{border-collapse:separate;border-spacing:0;font-size:1rem;margin:0 auto;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff}
#root .nw-table :is(th,td){padding:8px 14px;text-align:center;border-bottom:1px solid var(--line);border-inline-start:1px solid var(--line);font-variant-numeric:tabular-nums}
#root .nw-table :is(th,td):first-child{border-inline-start:0}
#root .nw-table tr:last-child :is(th,td){border-bottom:0}
#root .nw-table th{background:var(--a-50);color:var(--a-900);font-weight:700}
#root .nw-table td{color:var(--ink);font-weight:500}


/* ── coin-flip lab (probability lesson, board #96) ── */
#root .nw-figbox--coinSim{width:100%;justify-items:stretch}
#root .nw-coin{display:grid;gap:12px;width:100%;padding:16px;border-radius:16px;background:var(--a-50);border:1px solid var(--a-100)}
#root .nw-coin-t{font-weight:700;color:var(--a-900);text-align:center;font-size:1rem;text-wrap:balance}
#root .nw-coin-in{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}
#root .nw-coin-l{font-weight:600;color:var(--ink-2)}
#root .nw-coin-n{width:130px;height:46px;text-align:center;font-size:1.1rem;font-weight:700;border-radius:12px;font-variant-numeric:tabular-nums}
#root .nw-coin-go{min-height:46px;min-width:96px}
#root .nw-coin-quick{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
#root .nw-coin-q{min-height:36px;padding:4px 12px;border-radius:999px;border:1px solid var(--a-200);background:#fff;color:var(--a-800);font-size:.9rem;cursor:pointer;transition:transform 100ms ease-out,background-color 120ms ease-out}
#root .nw-coin-q:active{transform:scale(.95)}
#root .nw-coin-q .nw-m{color:inherit;font-weight:600}
#root .nw-coin-err{color:var(--err-700,#b91c1c);font-weight:600;text-align:center;font-size:.92rem}
#root .nw-coin-res{display:grid;gap:8px;padding:14px 12px;border-radius:14px;background:#fff;animation:nw-coin-in 260ms cubic-bezier(.2,.8,.2,1)}
@keyframes nw-coin-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
#root .nw-coin-big{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}
#root .nw-coin-side{display:grid;justify-items:center;gap:2px}
#root .nw-coin-side>.nw-m{font-size:1.5rem}
#root .nw-coin-side small .nw-m{font-size:.95rem;color:var(--ink-3)}
#root .nw-coin-side b{font-size:.9rem;color:var(--ink-2)}
#root .nw-coin-face{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;font-weight:800;color:#fff;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 2px 6px rgba(0,0,0,.12)}
#root .nw-coin-side.h .nw-coin-face{background:var(--a-600)}
#root .nw-coin-side.t .nw-coin-face{background:#2563eb}
#root .nw-coin-side.h>.nw-m{color:var(--a-800)}
#root .nw-coin-side.t>.nw-m{color:#1d4ed8}
#root .nw-coin-of{font-size:.85rem;color:var(--ink-3);text-align:center}
#root .nw-coin-bar{position:relative;height:16px;border-radius:999px;background:#2563eb;overflow:hidden}
#root .nw-coin-fill{position:absolute;top:0;bottom:0;inset-inline-start:0;background:var(--a-600);transition:width 420ms cubic-bezier(.2,.8,.2,1)}
#root .nw-coin-mid{position:absolute;top:-2px;bottom:-2px;left:50%;width:2px;margin-left:-1px;background:#fff}
#root .nw-coin-scale{display:flex;justify-content:space-between;font-size:.8rem;color:var(--ink-3)}
#root .nw-coin-scale .nw-m{color:var(--ink-3);font-weight:600}
#root .nw-coin-seq{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
#root .nw-coin-seq span{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;font-size:.8rem;font-weight:800;color:#fff}
#root .nw-coin-seq .h{background:var(--a-600)}
#root .nw-coin-seq .t{background:#2563eb}
#root .nw-coin-hist{font-size:.92rem}
#root .nw-coin-tip{text-align:center;color:var(--ink-3);font-size:.9rem}
@media (prefers-reduced-motion:reduce){#root .nw-coin-res{animation:none}#root .nw-coin-fill{transition:none}}
@media (max-width:480px){#root .nw-coin{padding:12px 10px}#root .nw-coin-side>.nw-m{font-size:1.25rem}#root .nw-coin-hist :is(th,td){padding:6px 6px;font-size:.85rem}}

@media (max-width:480px){
  #root .nw-choices{grid-template-columns:1fr}
  #root .nw-table :is(th,td){padding:7px 9px;font-size:.95rem}
}
`;

/* a chapter mounted inside another topic (Mount.jsx): the few base classes it relies on, scoped to
   the chapter, so it looks the same whatever the host topic's own CSS says */
export const MOUNT_CSS = `@layer mp-base, legacy, mp, page;
@layer legacy {
.nw.content{max-width:640px;margin:20px auto;padding:0 16px 60px}
.nw .card{background:#fff;border-radius:14px;padding:22px 18px;box-shadow:0 2px 10px rgba(49,46,129,.08);margin-bottom:16px}
.nw .sub-tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:14px}
.nw .action-row{display:flex;gap:10px;justify-content:center;margin-top:16px}
.nw .center{text-align:center}
.nw .banner{padding:20px;margin-bottom:14px;text-align:center;font-size:1.2rem;font-weight:700}
.nw .choice-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
}
/* a host whose chapters sit inside its own page box (.app: linear-function, quadratic-solver): that box
   already sets the page width and side padding, so the chapter fills it like the host's own chapters */
#root .app > .nw.content{max-width:none;margin:8px 0 0;padding:0 0 60px}
` + NW_CSS;
