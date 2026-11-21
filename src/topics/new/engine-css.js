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
