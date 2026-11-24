// The proofs section's own CSS ("הוכחות"), shown only while the topic is open.
// Page look comes from src/styles/mp.css; everything after the marker is prefixed prf- and scoped under #root.
const css = `@layer mp-base, legacy, mp, page;
@layer legacy {
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff7ed;color:#1c1b19;min-height:100vh;direction:rtl}
.hdr{background:linear-gradient(135deg,#9a3412,#ea580c);color:#fff;padding:18px 20px;text-align:center}
.hdr h1{margin:0;font-size:1.3rem}
.content{max-width:640px;margin:20px auto;padding:0 16px 60px}
.sub-tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:14px}
.banner{padding:20px;margin-bottom:14px;text-align:center;font-size:1.2rem;font-weight:700}
.ch-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:12px}
}

/* ── prf ── */
#root .prf{--prf-p1:#0284c7;--prf-p2:#7c3aed;--prf-p3:#0d9488;--prf-goal:var(--a-600);--prf-btn:var(--a-700);--prf-top:56px}

/* ── islands and signs ── */
#root .prf-m{display:inline-block;direction:ltr;unicode-bidi:isolate;white-space:nowrap;font-weight:600;font-variant-numeric:tabular-nums}
#root .prf-sign{display:inline-block;width:1.03em;height:.72em;vertical-align:baseline;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;margin-inline:.02em .07em}
#root .prf-sign-cong,#root .prf-sign-match{margin-inline:.3em}
/* the icon slot: a plain inline glyph (no box, no fill), whatever the button around it sets */
#root .prf .prf-ic{display:block;width:1em;height:1em;flex:none;border-radius:0;background:none}
#root .prf :where(.prf-ic){color:inherit}
#root .prf-gl{display:block;width:20px;height:14px;flex:none}
#root .prf-gl.prf-c1{stroke:var(--prf-p1)}
#root .prf-gl.prf-c2{stroke:var(--prf-p2)}
#root .prf-gl.prf-c3{stroke:var(--prf-p3)}
#root .prf-sr{position:absolute;top:0;left:0;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}

/* ── figure ── */
#root .prf-stage{position:relative;isolation:isolate;height:clamp(150px,30dvh,240px);padding:2px 12px}
@media (max-width:767px) and (orientation:portrait){#root .prf-figcol .prf-stage{height:clamp(128px,23dvh,210px)}}
#root .prf-stage::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background-image:radial-gradient(circle,color-mix(in srgb,var(--a-500) 26%,transparent) 1.1px,transparent 1.6px);
  background-size:18px 18px;background-position:center;
  -webkit-mask-image:radial-gradient(closest-side,#000 40%,transparent 100%);mask-image:radial-gradient(closest-side,#000 40%,transparent 100%)}
#root .prf-fig{display:block;width:100%;height:100%;direction:ltr;overflow:visible;-webkit-user-select:none;user-select:none;touch-action:manipulation}
#root .prf-sg{fill:none;stroke:var(--ink);stroke-width:2;stroke-linecap:round;transition:stroke .3s ease,opacity .3s ease}
#root .prf-sg.prf-c1{stroke:var(--prf-p1)}
#root .prf-sg.prf-c2{stroke:var(--prf-p2)}
#root .prf-sg.prf-c3{stroke:var(--prf-p3)}
#root .prf-sg.is-goal{stroke:var(--prf-goal);stroke-width:2.4;stroke-dasharray:5.5 4.5}
#root .prf-sg.is-dim{opacity:.42}
#root .prf-sg.is-focus{stroke-width:3}
#root .prf-sg.is-sel{stroke:var(--prf-goal);stroke-width:4.6;opacity:1}
#root .prf-tri{fill:var(--a-500);fill-opacity:0;stroke:none;transition:fill-opacity .4s ease}
#root .prf-tri.is-on{fill-opacity:.09}
#root .prf-tri.is-sel{fill-opacity:.17}
#root .prf-tri-goal{fill:var(--a-500);fill-opacity:.055;stroke:none;pointer-events:none}
#root .prf-tri-echo{fill:none;stroke:var(--prf-goal);stroke-width:1.4;stroke-dasharray:3.5 4.5;stroke-linecap:round;stroke-linejoin:round;opacity:.8;pointer-events:none}
#root .prf-mk{fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none;transition:opacity .3s ease;animation:prf-mark .25s var(--ease-out) backwards}
#root .prf-mk.prf-c1{stroke:var(--prf-p1)}
#root .prf-mk.prf-c2{stroke:var(--prf-p2)}
#root .prf-mk.prf-c3{stroke:var(--prf-p3)}
#root .prf-mk.is-goal{stroke:var(--prf-goal);stroke-width:2;stroke-dasharray:3.5 3.5}
#root .prf-mk.is-focus{stroke-width:2.8}
#root .prf-mk.is-sel{stroke:var(--prf-goal);stroke-width:3.4;stroke-dasharray:none;opacity:1}
#root .prf-arc.is-quiet{fill:none;stroke:var(--line-strong);stroke-width:1.8;stroke-linecap:round;pointer-events:none}
#root .prf-arc.is-quiet.is-sel{stroke:var(--prf-goal);stroke-width:3.4}
#root .prf-selw{fill:var(--a-500);fill-opacity:.2;stroke:none;pointer-events:none}
#root .prf-pulse{fill:none;stroke:var(--a-500);stroke-width:10;stroke-linecap:round;opacity:0;pointer-events:none;animation:prf-pulse .8s ease-in-out 2}
#root .prf-pulse.is-fill{fill:var(--a-500);stroke:none}
#root .prf-lb{font:600 14px var(--font);fill:var(--ink);stroke:var(--surface);stroke-width:4.5px;paint-order:stroke;stroke-linejoin:round;text-anchor:middle;pointer-events:none}
#root .prf-qm{pointer-events:none}
#root .prf-qm circle{fill:var(--bad-600);stroke:var(--surface);stroke-width:2}
#root .prf-qm text{font:700 11.5px var(--font);fill:#fff;text-anchor:middle}
#root .prf-mover{fill:var(--a-500);fill-opacity:.3;stroke:var(--prf-goal);stroke-width:2;stroke-linejoin:round;vector-effect:non-scaling-stroke;pointer-events:none}
#root .prf-fig.is-end-tint .prf-mover,#root .prf-fig.is-end-flash .prf-mover{display:none}
#root .prf-fig.is-end-tint .prf-tri,#root .prf-fig.is-end-move .prf-tri,#root .prf-fig.is-end-flash .prf-tri{fill-opacity:.17}
#root .prf-flash{fill:var(--a-500);stroke:var(--prf-goal);stroke-width:2.4;stroke-linejoin:round;opacity:0;pointer-events:none}
#root .prf-hit{fill:transparent;stroke:transparent;pointer-events:all;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}
#root .prf-hit-seg{fill:none;stroke-linecap:round}
#root .prf-hit:focus-visible{stroke:var(--a-500);stroke-opacity:.38}
#root .prf-hit-ang:focus-visible,#root .prf-hit-tri:focus-visible{stroke-width:3;stroke-opacity:.9;stroke-linejoin:round}
@keyframes prf-mark{from{opacity:0}}
@keyframes prf-pulse{0%,100%{opacity:0}50%{opacity:.42}}
@media (prefers-reduced-motion: reduce){
  #root .prf-pulse{animation:none;opacity:.3}
  #root .prf-mk{animation:none}
}

/* ── screen ── */
#root .prf-screen{position:relative;display:flex;flex-direction:column;width:100%;max-width:100vw;min-width:0;height:calc(100dvh - var(--prf-top));min-height:400px;overflow:hidden;overflow:clip;touch-action:manipulation;background:var(--surface);color:var(--ink);font-size:16px;line-height:1.5;text-align:start}
#root .prf-screen button{font-family:inherit;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#root .prf-figcol{flex:none;min-width:0}
#root .prf-work{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}

/* ── head ── */
#root .prf-head{flex:none;display:flex;align-items:center;gap:8px;min-height:44px;padding-inline:4px 14px}
#root .prf-back{flex:none;display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:50%;background:transparent;box-shadow:none;color:var(--a-700);font-size:20px}
/* the level's name is never cut: on a narrow phone it takes two lines (balanced) instead of an ellipsis */
#root .prf-head-t{flex:0 1 auto;min-width:0;font-size:1rem;font-weight:700;line-height:1.15;white-space:normal;text-wrap:balance}
#root .prf-pill{flex:none;padding:2px 9px;border-radius:999px;background:var(--a-50);color:var(--a-800);font-size:.78rem;font-weight:600;line-height:1.5}
#root .prf-dots{flex:none;display:flex;gap:5px;margin-inline-start:auto}
#root .prf-dots i{display:block;width:9px;height:9px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--line-strong)}
#root .prf-dots i.is-on{background:var(--a-500);box-shadow:none}
#root .prf-dots i.is-off{background:var(--line-strong);box-shadow:none}

/* ── strip ── */
#root .prf-strip{flex:none;min-width:0;max-width:100%;display:flex;flex-wrap:wrap;align-items:center;column-gap:12px;padding:3px 14px;border-bottom:1px solid var(--line);font-size:.84rem;color:var(--ink-3)}
#root .prf-strip-given{flex:1 1 auto;min-width:0;max-width:100%;display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;min-height:30px;padding-block:2px}
#root .prf-strip-goal{flex:0 1 auto;min-width:0;max-width:100%;display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;min-height:30px;padding-block:2px}
#root .prf-strip-k{flex:none;font-weight:600}
#root .prf-fc{flex:0 1 auto;min-width:0;display:inline-flex;align-items:center;gap:5px;min-height:26px;padding:1px 10px;border-radius:13px;line-height:1.35;border:1.5px solid transparent;background:var(--surface-3);color:var(--ink);font-size:.88rem}
#root .prf-fc .prf-ic{font-size:13px}
#root .prf-fc.is-used{color:var(--ink-2)}
#root .prf-fc.is-used .prf-ic{color:var(--ok-600)}
#root .prf-fc.is-now{border-color:var(--a-500);background:var(--a-50);color:var(--a-900)}
#root .prf-fc-note{font-size:.78rem;color:var(--ink-3)}
#root .prf-lk{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px;font-weight:700}
#root .prf-askst .prf-slot{width:1.9em;vertical-align:-.3em}
#root .prf-fc-goal{background:var(--a-50);border:1.5px dashed var(--a-300);color:var(--a-800)}
#root .prf-fc-goal.is-done{background:var(--ok-50);border:1.5px solid var(--ok-500);color:var(--ok-800)}

/* ── progress: "שורה X מתוך Y" ── */
#root .prf-prog{flex:none;display:flex;align-items:center;gap:10px;padding:0 16px 6px}
#root .prf-prog-t{flex:none;font-size:.78rem;font-weight:600;color:var(--ink-2);white-space:nowrap;font-variant-numeric:tabular-nums}
#root .prf-prog-bar{flex:1;display:flex;gap:4px;min-width:0}
#root .prf-prog-bar i{flex:1;height:5px;border-radius:9px;background:var(--line);transition:background-color .3s ease}
#root .prf-prog-bar i.is-done{background:var(--ok-500)}
#root .prf-prog-bar i.is-cur{background:var(--a-500)}
#root .prf-swap{flex:none;display:inline-flex;align-items:center;gap:5px;min-height:40px;margin-inline-start:auto;padding-inline:10px;border:0;border-radius:999px;background:transparent;box-shadow:none;color:var(--a-700);font-size:.84rem;font-weight:600;white-space:nowrap}
#root .prf-swap .prf-ic{font-size:16px}

/* ── the notebook: נתון, צ״ל, then the טענה | נימוק table ── */
#root .prf-nb{flex:1;min-height:96px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:10px 14px 14px;border-top:1px solid var(--line);background:var(--surface)}
#root .prf-intro{padding-block:0 6px;font-size:.88rem;line-height:1.5;color:var(--ink-2)}
#root .prf-plan{width:fit-content;margin-block:2px 6px;padding:3px 10px;border-radius:999px;background:var(--a-50);color:var(--a-800);font-size:.82rem;font-weight:500}
#root .prf-nb-head{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:baseline;gap:5px 8px;margin-bottom:10px;font-size:.92rem;line-height:1.4}
#root .prf-nb-k{font-weight:700;color:var(--ink-2)}
#root .prf-givl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;min-width:0}
#root .prf-gv{display:flex;align-items:center;gap:7px;min-width:0;margin-inline-start:-7px;padding:2px 7px;border-radius:9px;transition:background-color .3s ease}
#root .prf-gv-n{flex:none;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--surface-3);color:var(--ink-2);font-size:.68rem;font-weight:700;font-variant-numeric:tabular-nums}
#root .prf-gv-n .prf-ic{font-size:11px}
#root .prf-gv-t{min-width:0}
#root .prf-gv.is-now{background:var(--a-50);box-shadow:inset 0 0 0 1.5px var(--a-300);color:var(--a-900)}
#root .prf-gv.is-now .prf-gv-n{background:var(--a-600);color:#fff}
#root .prf-gv.is-used{color:var(--ink-2)}
#root .prf-gv.is-used .prf-gv-n{background:var(--ok-600);color:#fff}
#root .prf-goals{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
#root .prf-goal{display:inline-flex;align-items:center;gap:6px;min-width:0;padding:1px 9px;border-radius:9px;border:1.5px dashed var(--a-300);background:var(--a-50);color:var(--a-800)}
#root .prf-goal .prf-ic{font-size:13px}
#root .prf-goal.is-done{border-style:solid;border-color:var(--ok-500);background:var(--ok-50);color:var(--ok-800)}
#root .prf-nb-th,#root .prf-row-b{display:grid;grid-template-columns:22px minmax(0,1.25fr) minmax(0,1fr);align-items:center;column-gap:8px}
#root .prf-nb-th{padding:3px 4px 4px;border-bottom:1.5px solid var(--ink);font-size:.72rem;font-weight:600;color:var(--ink-3)}
#root .prf-rowlist{list-style:none;margin:0;padding:0}
#root .prf-row{border-bottom:1px solid var(--line);transition:background-color .3s ease}
#root .prf-row.is-new{animation:prf-row .25s var(--ease-out) backwards}
#root .prf-row.is-lead{background:color-mix(in srgb,var(--a-100) 50%,transparent)}
#root .prf-row.is-lead .prf-row-n{color:var(--a-700)}
#root .prf-row.is-now{background:var(--a-50);box-shadow:inset -3px 0 0 var(--a-500)}
#root .prf-row-b{width:100%;min-height:40px;margin:0;padding:5px 4px;border:0;border-radius:0;background:transparent;box-shadow:none;color:var(--ink);font-size:inherit;text-align:start}
#root .prf-row-n{font-size:.78rem;font-weight:700;color:var(--ok-700);font-variant-numeric:tabular-nums}
#root .prf-row.is-now .prf-row-n{color:var(--a-700)}
#root .prf-row.is-ghost .prf-row-n{color:var(--line-strong)}
#root .prf-row-c{display:flex;align-items:center;gap:6px;min-width:0}
#root .prf-row-st{font-size:1rem}
#root .prf-row-r{display:flex;align-items:center;gap:4px;min-width:0;font-size:.82rem;line-height:1.3;color:var(--ink-2)}
#root .prf-row-ok{flex:none;margin-inline-start:auto;color:var(--ok-600);font-size:15px}
#root .prf-row-later{font-size:.8rem;color:var(--ink-3)}
#root .prf-ghost-bar{display:block;height:10px;border-radius:6px;background:var(--surface-3)}
#root .prf-qslot{display:inline-grid;place-items:center;min-width:56px;height:26px;padding-inline:8px;border-radius:8px;border:1.5px dashed var(--a-500);color:var(--a-700);font-size:.9rem;font-weight:800;animation:prf-qpulse 1.6s ease-in-out infinite}
#root .prf-row-full{padding:0 34px 8px;font-size:.86rem;color:var(--ink-2)}
#root .prf-row-full b{font-weight:600;color:var(--ink)}
/* the theorems stay in sight (spec 2026-11-23 §6.2): the full sentence is muted, smaller and never cut */
#root .prf-law{font-size:.8rem;font-weight:400;line-height:1.5;color:var(--ink-2)}
#root .prf-law-k{display:inline-block;margin-inline-end:3px;padding-inline:6px;border-radius:6px;background:var(--a-50);box-shadow:inset 0 0 0 1px var(--a-200);color:var(--a-800);font-size:.7rem;font-weight:700;line-height:1.5;vertical-align:.08em}
#root .prf-row-rt{display:flex;flex-wrap:wrap;align-items:center;gap:0 6px;min-width:0}
#root .prf-row-op{display:inline-flex;align-items:center;gap:1px;color:var(--a-700);font-size:.72rem;font-weight:700;white-space:nowrap;text-decoration:underline;text-decoration-color:var(--a-300);text-underline-offset:3px}
#root .prf-row-op .prf-ic{font-size:13px;transition:transform .2s var(--ease-out)}
#root .prf-row.is-open .prf-row-op .prf-ic{transform:rotate(180deg)}
#root .prf-row-law{margin:0;padding-block:0 9px;padding-inline:34px 10px;animation:prf-row .25s var(--ease-out) backwards}
@keyframes prf-row{from{opacity:0;transform:translateY(8px)}}
@keyframes prf-fade{from{opacity:0}}
@keyframes prf-qpulse{50%{background:var(--a-100)}}

/* ── the sheet: the row and what is asked, one question, the answers ── */
#root .prf-tray{flex:0 1 auto;display:flex;flex-direction:column;gap:8px;min-height:120px;max-height:56dvh;overflow-y:auto;overscroll-behavior:contain;padding:12px 16px max(14px,env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;background:var(--surface);box-shadow:0 0 0 1px var(--line),0 -12px 30px -10px rgb(28 27 25 / .14)}
#root .prf-tray > *{flex:none}
#root .prf-step,#root .prf-fbc{margin:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none;animation:none}
#root .prf-q{display:flex;flex-direction:column;gap:4px}
#root .prf-q-top{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:30px}
#root .prf-q-k{min-width:0;font-size:.8rem;font-weight:700;color:var(--a-700)}
#root .prf-q-e{flex:none;display:flex;align-items:center;gap:4px}
#root .prf-q-h{margin:0;font-size:1.12rem;font-weight:800;line-height:1.38;color:var(--ink);text-wrap:balance}
#root .prf-q-quote{width:fit-content;max-width:100%;padding:4px 10px;border-radius:10px;background:var(--a-50);box-shadow:inset 0 0 0 1px var(--a-200);color:var(--a-900);font-size:.98rem;line-height:1.45}
#root .prf-ask-st{font-size:1.02rem}
#root .prf-coach{display:flex;align-items:flex-start;gap:10px;padding-top:2px}
#root .prf-coach-av{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:linear-gradient(145deg,var(--a-300),var(--a-600));color:#fff}
#root .prf-coach-av .prf-ic{font-size:17px}
#root .prf-coach-t{margin:0;font-size:.98rem;line-height:1.55;color:var(--ink)}
#root .prf-chip-2{display:flex;flex-direction:column;align-items:center;gap:1px}
#root .prf-chip-2 small{font-size:.68rem;font-weight:500;color:var(--ink-3)}
#root .prf-hintb{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:6px;min-height:40px;padding-inline:11px;border:0;border-radius:12px;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-strong);color:var(--ink-2);font-size:.88rem;font-weight:600;white-space:nowrap}
#root .prf-hintb > *{position:relative;z-index:1}
#root .prf-hintb .prf-ic{font-size:17px;color:var(--a-600)}
#root .prf-q-e .prf-hintb{min-height:36px;padding-inline:12px;border-radius:999px;background:var(--surface-3);box-shadow:none;font-size:.84rem}
#root .prf-hintb:disabled{color:var(--ink-3)}
#root .prf-hintb .prf-hintb-fill{position:absolute;inset:0;z-index:0;background:var(--a-100);transform-origin:right;animation:prf-fill 4s linear both}
#root .prf-hintb.is-nudge{animation:prf-nudge .9s var(--ease-out) 1}
#root .prf-rungs{display:inline-flex;gap:3px}
#root .prf-rungs i{display:block;width:5px;height:5px;border-radius:50%;background:var(--line-strong)}
#root .prf-rungs i.is-on{background:var(--a-500)}
#root .prf-q-e .prf-x span{display:none}
#root .prf-x{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:40px;min-height:40px;padding-inline:8px;border:0;background:transparent;box-shadow:none;color:var(--ink-3);font-size:.86rem;font-weight:500}
#root .prf-x .prf-ic{font-size:15px;color:var(--a-600)}
#root .prf-hint{margin-top:4px;padding-inline-start:10px;border-inline-start:3px solid var(--a-300);font-size:.92rem;line-height:1.45;color:var(--ink-2);animation:prf-row .25s var(--ease-out) backwards}
#root .prf-why{padding-inline-start:10px;border-inline-start:3px solid var(--ok-200);font-size:.9rem;line-height:1.45;color:var(--ink-2);animation:prf-row .25s var(--ease-out) backwards}
#root .prf-why-law{display:block;margin-top:3px}
#root .prf-coach-t .prf-why-law{margin-top:5px}
/* reading a theorem before choosing it: its sentence and the "בחירה" button, right under the pressed chip's row */
#root .prf-q.is-pin{position:sticky;top:-12px;z-index:3;margin-inline:-16px;padding:10px 16px 6px;background:var(--surface);box-shadow:0 8px 8px -8px rgb(28 27 25 / .16)}
#root .prf-q-law{grid-column:1 / -1;display:flex;align-items:flex-end;gap:10px;padding-block:2px 4px;padding-inline-start:10px;border-inline-start:3px solid var(--a-300);animation:prf-fade .2s ease-out backwards}
#root .prf-q-law-t{flex:1;min-width:0;margin:0}
#root .prf-q-pick{display:block;padding-block:9px;font-size:.95rem;font-weight:700;line-height:1.4;color:var(--ink)}
#root .prf-q-law .prf-law{font-size:.84rem}
#root .prf-q-law .prf-choose{flex:none;min-height:40px;padding-inline:18px;font-size:.92rem;box-shadow:none}
@keyframes prf-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes prf-nudge{0%,100%{transform:none}30%{transform:scale(1.09)}60%{transform:scale(.98)}}

/* ── chips ── */
#root .prf-chips{display:grid;gap:8px;margin-top:8px}
#root .prf-cols-1{grid-template-columns:minmax(0,1fr)}
#root .prf-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
#root .prf-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
#root .prf-chip.is-wide{grid-column:1 / -1}
#root .prf-chip{display:flex;align-items:center;justify-content:center;min-height:44px;margin:0;padding:6px 10px;border:1.5px solid var(--line-strong);border-radius:12px;background:var(--surface);box-shadow:none;color:var(--ink);font-size:.92rem;font-weight:500;line-height:1.25;text-align:center}
#root .prf-chip:disabled{opacity:.4;text-decoration:line-through}
#root .prf-chip.is-dim{opacity:.4}
#root .prf-chip.is-yes{opacity:1;border-color:var(--ok-500);background:var(--ok-50);color:var(--ok-800);text-decoration:none}
#root .prf-chip.is-on{border-color:var(--a-600);background:var(--a-50);box-shadow:inset 0 0 0 1px var(--a-600);color:var(--a-900);font-weight:700}
#root .prf-chip.prf-lawc{flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;padding:8px 12px;text-align:start}
#root .prf-laws .prf-chip{justify-content:flex-start;padding-inline:12px;font-weight:700;text-align:start}
#root .prf-lawc-n{font-weight:700}
#root .prf-lawc-t{font-size:.78rem;font-weight:400;line-height:1.45;color:var(--ink-2)}
#root .prf-chip.prf-lawc:disabled{text-decoration:none}
#root .prf-chip.prf-lawc:disabled .prf-lawc-n{text-decoration:line-through}
#root .prf-tile{font-size:1.04rem;box-shadow:0 2px 0 var(--line-strong)}
#root .prf-go-row{display:flex;gap:8px;margin-top:8px}
#root .prf-go{flex:1;width:auto;height:auto;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding-inline:22px;border:0;border-radius:999px;background:var(--prf-btn);box-shadow:var(--sh-accent);color:#fff;font-size:1rem;font-weight:700}
#root .prf-go.is-soft{background:var(--a-50);box-shadow:inset 0 0 0 1.5px var(--a-300);color:var(--a-800)}
#root .prf-go.is-quiet{flex:0 0 auto;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-strong);color:var(--ink-2);font-weight:600}
#root .prf-go:disabled{opacity:.6}
#root .prf-go .prf-ic{font-size:18px}
#root .prf-go span{display:inline}
#root .prf-qed{min-height:52px;font-size:1.2rem}

/* ── fb ── */
#root .prf-fb{display:flex;align-items:flex-start;gap:8px;width:100%;max-width:none;margin:0;padding:7px 12px;border-radius:12px;font-size:.92rem;font-weight:500;line-height:1.45;text-align:start}
#root .fb.prf-fb{padding-inline-start:40px}
#root .fb.prf-fb::before{top:8px;inset-inline-start:12px}
#root .prf-note.prf-fb{border:1px solid transparent;background:var(--surface-3);color:var(--ink);animation:prf-row .2s var(--ease-out) backwards}
#root .prf-note.prf-fb.is-ok{border-color:var(--ok-200);background:var(--ok-50);color:var(--ok-800)}
#root .prf-note.prf-fb .prf-ic{margin-top:2px;font-size:18px;color:var(--ink-3)}
#root .prf-note.prf-fb.is-ok .prf-ic{color:var(--ok-600)}

/* ── tap ── */
#root .prf-fig.is-tap .prf-sg{stroke-width:2.2}
#root .prf-tap{display:flex;flex-direction:column;gap:8px;margin-top:4px}
#root .prf-tap-q{font-size:.95rem;font-weight:500;color:var(--ink)}
#root .prf-prev{display:flex;align-items:center;gap:10px;min-height:48px;padding:6px 8px 6px 12px;border-radius:14px;background:var(--a-50);box-shadow:inset 0 0 0 1.5px var(--a-300);animation:prf-row .2s var(--ease-out) backwards}
/* the preview + "להוסיף שורה" stay pinned at the top of the tray while the parts list scrolls under it (review M8) */
#root .prf-tray .prf-prev{position:sticky;top:0;z-index:2;box-shadow:inset 0 0 0 1.5px var(--a-300),0 -12px 0 0 var(--surface-2),0 8px 14px -12px rgb(28 27 25 / .35)}
#root .prf-prev-st{flex:1;min-width:0;font-size:1.14rem;color:var(--a-900);text-align:left}
#root .prf-prev-eq{margin-inline:.25em;color:var(--a-700)}
#root .prf-slot{display:inline-block;width:1.15em;height:1.3em;margin-inline:1px;vertical-align:-.28em;border-radius:6px;border:1.5px dashed var(--a-300);background:var(--surface);font-style:normal;text-align:center;line-height:1.25em}
#root .prf-slot.is-wide{width:2.4em}
#root .prf-slot.is-next{border-color:var(--a-600)}
#root .prf-slot.is-set{width:auto;min-width:.7em;height:auto;margin:0;border:0;background:transparent;vertical-align:baseline;line-height:inherit}
#root .prf-add{flex:none;width:max-content;min-height:44px;padding-inline:16px;font-size:.95rem;white-space:nowrap}
#root .prf-self{gap:10px;justify-content:flex-start;padding-inline:12px;font-size:.88rem;color:var(--ink-2)}
#root .prf-self .prf-m{font-size:1.02rem;color:var(--ink)}
#root .prf-vert{font-size:1.1rem;font-weight:600}
#root .prf-tap-foot{display:flex;align-items:center;justify-content:space-between;gap:8px}
#root .prf-listb{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding-inline:10px;border:0;border-radius:12px;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-strong);color:var(--ink-2);font-size:.86rem;font-weight:600}
#root .prf-listb.is-open{background:var(--surface-3)}
#root .prf-listb .prf-ic{font-size:17px;color:var(--a-600)}
#root .prf-parts{display:flex;flex-direction:column;gap:8px}
#root .prf-parts-t{display:block;margin-bottom:4px;font-size:.78rem;font-weight:600;color:var(--ink-3)}
#root .prf-parts-c{display:flex;flex-wrap:wrap;gap:6px}
#root .prf-partc{min-width:64px;padding-inline:12px;font-size:.98rem}
#root .prf-partc.is-on{border-color:var(--a-600);background:var(--a-50);color:var(--a-900)}
#root .prf-group-h{display:flex;align-items:center;justify-content:space-between;margin-top:2px}
#root .prf-group-t{font-size:.84rem;font-weight:700;color:var(--a-800)}
#root .prf-groupin .prf-chips{margin-top:2px}

/* ── end ── */
#root .prf-screen.is-ended .prf-strip{display:none}
#root .prf-end-card{flex:1;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--line);background:var(--surface-2);animation:prf-row .3s var(--ease-out) backwards}
#root .prf-end-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px 14px 14px}
#root .prf-end-top{display:flex;flex-direction:column;gap:8px;min-height:58px}
#root .prf-end{display:flex;align-items:center;gap:10px;margin:0;padding:11px 14px;border-radius:16px;font-size:1.12rem;font-weight:700;line-height:1.35;text-align:start}
#root .prf-end.is-helped{align-items:flex-start;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:.95rem;font-weight:500;line-height:1.5}
#root .prf-end-seal{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--ok-600);color:#fff;font-size:17px}
#root .prf-end.is-helped .prf-end-seal{margin-top:1px;background:var(--surface-3);color:var(--ink-2)}
#root .prf-end-stats{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding-inline:2px;font-size:.9rem;color:var(--ink-2)}
#root .prf-dots.is-big{margin:0;gap:6px}
#root .prf-dots.is-big i{width:12px;height:12px}
#root .prf-end-sep{width:1px;height:14px;background:var(--line-strong)}
#root .prf-end-line{padding-inline:2px;font-size:.9rem;color:var(--ink-2)}
#root .prf-lvup{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:16px;background:var(--a-50);box-shadow:inset 0 0 0 1.5px var(--a-200);color:var(--a-900);font-size:1rem;font-weight:700;line-height:1.35}
#root .prf-ladder{flex:none;display:flex;align-items:flex-end;gap:4px;height:34px;direction:rtl}
#root .prf-ladder i{display:block;width:9px;border-radius:3px;background:var(--a-200)}
#root .prf-ladder i.is-on{background:var(--a-500)}
#root .prf-ladder i.is-new{background:var(--a-600);transform-origin:center bottom;animation:prf-grow .6s .35s var(--ease-out) backwards}
#root .prf-page{margin-top:14px}
#root .prf-page-h{display:flex;align-items:center;gap:6px;margin:0 0 6px;font-size:.84rem;font-weight:600;color:var(--ink-3)}
#root .prf-page-h .prf-ic{font-size:17px}
#root .prf-page-in{padding:12px 14px 14px;border-radius:14px;border:1px solid var(--line);border-inline-start:3px solid color-mix(in srgb,var(--bad-500) 45%,transparent);background:var(--surface);box-shadow:var(--sh-1)}
#root .prf-page-l{font-size:.95rem;line-height:1.7;color:var(--ink)}
#root .prf-page-l b{font-weight:700}
#root .prf-table{width:100%;margin-top:8px;border-collapse:collapse;font-size:.92rem;line-height:1.4}
#root .prf-table th{padding:5px 6px;border-bottom:1.5px solid var(--ink);font-size:.82rem;font-weight:700;text-align:start;color:var(--ink)}
#root .prf-table td{padding:7px 6px;border-bottom:1px solid var(--line);vertical-align:top;text-align:start;color:var(--ink)}
#root .prf-table th:first-child,#root .prf-table td:first-child{width:52%;border-inline-end:1px solid var(--line);white-space:nowrap}
#root .prf-table td + td{color:var(--ink-2)}
#root .prf-table-n{display:inline-block;min-width:1.3em;color:var(--ink-3);font-variant-numeric:tabular-nums}
#root .prf-table .prf-table-qed td{width:auto;border:0;padding-top:9px;text-align:end;font-weight:800;color:var(--ink)}
#root .prf-table-r{display:flex;flex-wrap:wrap;align-items:center;gap:0 8px}
#root .prf-table-op{display:inline-flex;align-items:center;gap:1px;min-height:40px;margin-block:-11px;padding:0 4px;border:0;border-radius:8px;background:transparent;box-shadow:none;color:var(--a-700);font-size:.74rem;font-weight:700;text-decoration:underline;text-decoration-color:var(--a-300);text-underline-offset:3px}
#root .prf-table-op .prf-ic{font-size:13px;transition:transform .2s var(--ease-out)}
#root .prf-table-op[aria-expanded="true"] .prf-ic{transform:rotate(180deg)}
#root .prf-table tr.is-open td{border-bottom-color:transparent}
#root .prf-table .prf-table-law td{width:auto;padding-top:0;border-inline-end:0;white-space:normal}
#root .prf-end-btns{flex:none;display:flex;gap:8px;padding:10px 14px max(12px,env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);background:var(--surface-2)}
@keyframes prf-grow{from{transform:scaleY(.2);opacity:.4}}

/* ── team ── */
#root .prf-team{flex:none;width:100%;max-width:560px;margin:6px auto 0;padding:0 16px;font-size:.72rem;line-height:1.4;color:var(--ink-3);text-align:center}
#root .prf-topic{display:flex;flex-direction:column;min-height:calc(100dvh - var(--prf-top))}
#root .prf-topic > *{min-width:0}

/* ── landing ── */
#root .prf-in-proof > .prf-team,#root .prf-in-proof > .hdr,#root .prf-in-proof > .prf-subjbar,#root .prf-in-proof > .prf-path{display:none}
#root .prf-in-proof > .prf-ch-open{max-width:none;margin:0;padding:0}
#root .prf-in-proof > .prf-ch-card{flex:1;display:flex;flex-direction:column;justify-content:center;width:100%;margin:0 auto;padding:16px}
#root .prf-mast{--prf-wm:clamp(5rem,26vw,9.4rem);flex:1 1 auto;display:flex;flex-direction:column;flex-wrap:nowrap;align-items:stretch;justify-content:flex-start;gap:0;width:100%;max-width:560px;margin:0 auto;padding:4px 16px 0;border:0;border-radius:0;background:none;box-shadow:none;text-align:center}
#root .prf-mast .prf-wm{flex:none;margin:-.06em 0 0;padding:0;font-size:var(--prf-wm);font-weight:800;line-height:.86;white-space:nowrap;color:var(--a-600);background:linear-gradient(180deg,var(--a-300) 0%,var(--a-600) 80%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
#root .prf-mast-fig{flex:1 1 136px;height:auto;min-height:136px;max-height:270px;margin-top:calc(var(--prf-wm) * -.17);padding:0 6px;animation:prf-row .35s var(--ease-out) backwards}
#root .prf-mast-fig::before{display:none}
#root .prf-path{flex:none;display:flex;flex-direction:column;flex-wrap:nowrap;align-items:stretch;justify-content:flex-start;gap:0;width:100%;max-width:560px;margin:2px auto 0;padding:0 16px;overflow:visible;border:0;border-radius:0;background:none;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;-webkit-mask-image:none;mask-image:none;scroll-snap-type:none}
/* the subject bar: the switcher (a soft track with a sliding thumb; only when more than one subject shows) and one meta line */
#root .prf-subjbar{flex:none;display:flex;flex-direction:column;align-items:center;gap:7px;width:100%;max-width:560px;margin:2px auto 8px;padding:0 16px}
#root .prf-subj{position:relative;isolation:isolate;display:grid;grid-template-columns:repeat(var(--prf-n),minmax(0,1fr));width:100%;max-width:420px;padding:4px;border-radius:999px;background:color-mix(in srgb,var(--a-100) 70%,transparent)}
#root .prf-subj-thumb{position:absolute;z-index:-1;inset-block:4px;inset-inline-start:4px;width:calc((100% - 8px) / var(--prf-n));border-radius:999px;background:var(--surface);box-shadow:var(--sh-1);transform:translateX(calc(var(--prf-i) * -100%));transition:transform .34s var(--ease-out)}
#root .prf-subj-b{min-width:0;min-height:40px;margin:0;padding:6px 10px;border:0;border-radius:999px;background:none;box-shadow:none;color:var(--ink-2);font:inherit;font-size:.94rem;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .2s var(--ease-out)}
#root .prf-subj-b.is-on{color:var(--a-800);font-weight:800}
#root .prf-subj-b:active{opacity:.7}
#root .prf-subj-b:focus-visible{outline:2px solid var(--a-600);outline-offset:2px}
#root .prf-subj-meta{font-size:.8rem;font-weight:600;line-height:1.4;color:var(--ink-3);text-align:center;animation:prf-row .3s var(--ease-out) backwards}
#root .prf-subj-meta b{color:var(--a-800);font-weight:800}
/* a subject change: the wordmark and the drawing come in together, from the side the subject sits on */
#root .prf-mast .prf-subj-in.is-fwd{animation:prf-subj-fwd .42s var(--ease-out) backwards}
#root .prf-mast .prf-subj-in.is-back{animation:prf-subj-back .42s var(--ease-out) backwards}
@keyframes prf-subj-fwd{from{opacity:0;transform:translateX(-36px)}}
@keyframes prf-subj-back{from{opacity:0;transform:translateX(36px)}}
#root .prf-pt{position:relative}
#root .prf-pt::before{content:"";position:absolute;inset-inline-start:19px;top:41px;bottom:-4px;width:2px;border-radius:2px;background:var(--line)}
#root .prf-pt:last-child::before{display:none}
#root .prf-pt.is-passed::before{background:var(--a-300)}
#root .prf-pt-row{display:flex;align-items:center;gap:8px;min-height:44px}
#root .prf-path .ch-btn{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:12px;min-height:44px;margin:0;padding:0;border:0;border-radius:14px;background:transparent;box-shadow:none;color:var(--ink-2);font-size:1.02rem;font-weight:600;line-height:1.2;text-align:start;white-space:normal;scroll-snap-align:none}
#root .prf-path .ch-btn::before{content:none}
#root .prf-pt-n{position:relative;z-index:1;flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--line-strong);color:var(--ink-2);font-size:1rem;font-weight:700;font-variant-numeric:tabular-nums;transition:transform .18s var(--ease-out)}
#root .prf-path .ch-btn:active .prf-pt-n{transform:scale(.94)}
#root .prf-pt.is-began .prf-pt-n{background:var(--a-50);box-shadow:inset 0 0 0 1.5px var(--a-300);color:var(--a-800)}
#root .prf-pt.is-open .prf-pt-n{background:var(--a-600);box-shadow:var(--sh-accent);color:#fff}
#root .prf-pt-tx{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:1px}
#root .prf-pt-k{font-size:.7rem;font-weight:700;line-height:1.2;color:var(--ink-3)}
#root .prf-pt.is-open .prf-pt-k{color:var(--a-700)}
#root .prf-pt-name{min-width:0}
#root .prf-pt.is-open .prf-pt-name{color:var(--ink);font-size:1.24rem;font-weight:800}
#root .prf-pt-next{flex:none;padding:2px 9px;border-radius:999px;background:var(--a-50);color:var(--a-800);font-size:.74rem;font-weight:700;line-height:1.5;white-space:nowrap}
#root .prf-pt-ok{flex:none;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--ok-600);color:#fff;font-size:13px}
#root .prf-pt-lv{flex:none;display:flex;align-items:flex-end;gap:3px;height:16px;direction:rtl}
#root .prf-pt-lv i{display:block;width:5px;border-radius:2px;background:var(--line-strong)}
#root .prf-pt-lv i.is-on{background:var(--a-500)}
#root .prf-pt-lv i.is-here{background:var(--a-300)}
#root .prf-pt-open{padding-block:0 10px;padding-inline:52px 0;animation:prf-row .25s var(--ease-out) backwards}
#root .prf-pt-about{margin:-3px 0 9px;font-size:.92rem;line-height:1.45;color:var(--ink-2);text-align:start;text-wrap:pretty}
#root .prf-tabs{display:flex;flex-wrap:nowrap;justify-content:flex-start;gap:6px;margin:0}
#root .prf-tabs .sub-tab{flex:1 1 0;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:40px;margin:0;padding:6px 4px;font-size:.86rem;white-space:nowrap}
#root .prf-tabs .sub-tab .prf-ic{font-size:13px}
#root .prf-tabs .sub-tab.prf-is-done .prf-ic{color:var(--ok-600)}
#root .prf-tabs .sub-tab:disabled{opacity:.5}
#root .prf-locked{display:flex;align-items:center;gap:6px;margin-top:7px;font-size:.78rem;line-height:1.4;color:var(--ink-3);text-align:start}
#root .prf-locked .prf-ic{font-size:13px;color:var(--a-600)}
#root .prf-land-stats{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin-top:6px;font-size:.8rem;color:var(--ink-2)}
#root .prf-land-go{position:sticky;bottom:0;z-index:5;flex:none;display:flex;flex-direction:column;gap:4px;width:100%;max-width:560px;margin:auto auto 0;padding:4px 16px max(12px,env(safe-area-inset-bottom,0px));background:var(--bg)}
#root .prf-land-go::before{content:"";position:absolute;inset:auto 0 100% 0;height:22px;background:linear-gradient(to top,var(--bg),transparent);pointer-events:none}
#root .prf-land-what{font-size:.8rem;font-weight:600;line-height:1.4;color:var(--ink-3);text-align:center}
#root .prf-land-go .prf-go{flex:none;width:100%;min-height:52px;font-size:1.1rem}
@media (max-height:600px){
  #root .prf-mast{--prf-wm:clamp(3.8rem,19vw,6.4rem)}
  #root .prf-mast-fig{flex-basis:124px;min-height:124px}
}

/* ── warm ── */
#root .prf-warm-mid{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;justify-content:flex-start;align-items:flex-start;gap:8px;padding:10px 16px;text-align:start;animation:prf-row .25s var(--ease-out) backwards}
/* centred while it fits; when the answer sheet grows, it scrolls from its top (centring would cut the top off, unreachable) */
#root .prf-warm-mid>:first-child{margin-top:auto}
#root .prf-warm-mid>:last-child{margin-bottom:auto}
#root .prf-warm-k{padding:2px 10px;border-radius:999px;background:var(--a-50);color:var(--a-800);font-size:.78rem;font-weight:600;line-height:1.5}
#root .prf-warm-q{font-size:1.16rem;font-weight:600;line-height:1.45;color:var(--ink);text-wrap:balance}
#root .prf-warm-st{font-size:1.55rem;line-height:1.3;color:var(--ink)}
#root .prf-warm-sent{padding:6px 12px;border-radius:12px;background:var(--a-50);color:var(--a-900);font-size:1.08rem;line-height:1.45}
#root .prf-warm .prf-fb{margin-bottom:8px}
#root .prf-warm .prf-why{margin-bottom:8px}
#root .prf-warm .prf-chips{margin-top:0}
#root .prf-warm-tap{display:flex;align-items:center;gap:8px}
#root .prf-warm-picked{flex:1;min-width:0;display:flex;align-items:center;gap:6px;font-size:1.05rem}
#root .prf-warm-picked .prf-slot{height:26px}
#root .prf-warm-tap .prf-go{flex:0 0 auto}
/* S4: the proportion stands where the drawing would be (no drawing to solve a proportion) */
#root .prf-warm-eq{display:flex;align-items:center;justify-content:center;font-size:clamp(1.9rem,9vw,2.6rem);color:var(--ink);animation:prf-row .25s var(--ease-out) backwards}
#root .prf-warm-eq .prf-frac-t,#root .prf-warm-eq .prf-frac-b{min-width:1.7em}
#root .prf-warm-x{font-weight:700;color:var(--a-700)}
#root .prf-warm-x.is-found{color:var(--ok-700)}
#root .prf-warm .prf-kp{margin-top:2px}
@media (prefers-reduced-motion: reduce){#root .prf-warm-eq{animation:none}}

/* ── rescue ── */
#root .prf-rescue{display:flex;flex-direction:column;gap:10px;width:100%;max-width:440px;margin:0 auto;padding:22px 20px;border-radius:22px;background:var(--surface);box-shadow:var(--sh-2);text-align:center}
#root .prf-rescue-k{font-size:.84rem;font-weight:700;color:var(--a-700)}
#root .prf-rescue-t{font-size:1.2rem;font-weight:700;line-height:1.45;color:var(--ink);text-wrap:balance}
#root .prf-rescue-b{display:flex;flex-direction:column;gap:8px;margin-top:6px}
#root .prf-rescue-b .prf-go{flex:none;width:100%}

/* ── theorems: "המשפטים", the subject's notebook (a page on the landing, a sheet from the proof header) ──
   Ruled paper: every height inside is a multiple of --prf-rule, so each line of text sits on a ruled line.
   No frames: entries are separated by an empty line; the drawing is drawn straight on the paper. */
#root .prf-th{--prf-rule:30px;--prf-th-m:38px;--prf-th-line:color-mix(in srgb,var(--ink) 15%,transparent);color:var(--ink);font-size:16px;text-align:start}
#root .prf-th-paper{position:relative;isolation:isolate;padding-block:calc(var(--prf-rule) * 2);padding-inline:calc(var(--prf-th-m) + 14px) 18px}
#root .prf-th-paper::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:linear-gradient(to bottom,transparent calc(var(--prf-rule) - 1px),var(--prf-th-line) calc(var(--prf-rule) - 1px));background-size:100% var(--prf-rule);background-position:0 -7px}
#root .prf-th-paper::after{content:"";position:absolute;z-index:-1;top:0;bottom:0;inset-inline-start:var(--prf-th-m);width:1.5px;pointer-events:none;background:color-mix(in srgb,var(--bad-500) 36%,transparent)}
#root .prf-th-page{width:100%;margin:10px auto 0}
#root .prf-th-page .prf-th-paper::before,#root .prf-th-page .prf-th-paper::after{-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 56px,#000 calc(100% - 56px),transparent 100%);mask-image:linear-gradient(to bottom,transparent 0,#000 56px,#000 calc(100% - 56px),transparent 100%)}
#root .prf-th-head{margin-bottom:var(--prf-rule)}
#root .prf-th-h{margin:0;padding:0;font-size:1.42rem;font-weight:800;line-height:var(--prf-rule);color:var(--ink);text-wrap:balance}
#root .prf-th-sub{margin:0;font-size:.9rem;line-height:var(--prf-rule);color:var(--ink-2)}
#root .prf-th-h2{margin:calc(var(--prf-rule) * 2) 0 0;padding:0;font-size:1.08rem;font-weight:800;line-height:var(--prf-rule);color:var(--ink)}
#root .prf-th-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);row-gap:var(--prf-rule)}
#root .prf-th-e{position:relative;display:grid;grid-template-columns:minmax(0,1fr);margin:0;padding:0}
#root .prf-th-n{position:absolute;top:0;inset-inline-start:calc(-14px - var(--prf-th-m));width:var(--prf-th-m);font-size:.8rem;font-weight:700;line-height:var(--prf-rule);color:var(--ink-3);text-align:center;font-variant-numeric:tabular-nums}
#root .prf-th-tx{min-width:0}
#root .prf-th-k{display:flex;flex-wrap:wrap;align-items:center;gap:0 9px;min-height:var(--prf-rule);margin:0}
#root .prf-th-pill{display:inline-block;padding-inline:11px;border-radius:999px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--line-strong);color:var(--ink);font-size:.84rem;font-weight:700;line-height:24px;white-space:nowrap}
#root .prf-th-e.is-theorem .prf-th-pill{background:var(--prf-btn);box-shadow:none;color:#fff}
#root .prf-th-s{margin:0;font-size:1rem;font-weight:400;line-height:var(--prf-rule);color:var(--ink);text-wrap:pretty}
#root .prf-th-fig{height:calc(var(--prf-rule) * 4);padding-block:5px}
#root .prf-th-fig .prf-lb{font-size:19px;stroke-width:5px;stroke:var(--bg)}
#root .prf-th-sheet .prf-th-fig .prf-lb{stroke:var(--surface)}
#root .prf-th-fig .prf-mk{stroke-width:2.7}
#root .prf-th-fig .prf-sg{stroke-width:2.2}
#root .prf-th-fig .prf-tri.is-on{fill-opacity:.12}
/* מודרך: the theorem of the row being worked on, marked like with a highlighter pen and named in words */
#root .prf-th-e.is-now .prf-th-mark{padding:3px 3px;margin-inline:-3px;border-radius:5px;background:color-mix(in srgb,var(--a-300) 46%,transparent);-webkit-box-decoration-break:clone;box-decoration-break:clone}
#root .prf-th-e.is-now .prf-th-n{color:var(--a-700);font-size:.92rem;font-weight:800}
#root .prf-th-now{font-size:.78rem;font-weight:700;line-height:1.3;color:var(--a-800)}
#root .prf-th-sheet{position:fixed;inset:0;z-index:70;display:flex;flex-direction:column;justify-content:flex-end}
#root .prf-th-scrim{position:absolute;inset:0;background:rgb(28 27 25 / .42);animation:prf-fade .22s ease-out backwards;transition:opacity .19s ease-in}
#root .prf-th-panel{position:relative;display:flex;flex-direction:column;min-height:0;max-height:calc(100dvh - 52px);overflow:hidden;border-radius:22px 22px 0 0;background:var(--surface);box-shadow:0 -16px 40px -14px rgb(28 27 25 / .4);animation:prf-th-up .34s var(--ease-out) backwards;transition:transform .19s ease-in}
#root .prf-th-sheet.is-out .prf-th-scrim{opacity:0}
#root .prf-th-sheet.is-out .prf-th-panel{transform:translateY(100%)}
#root .prf-th-bar{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:58px;padding-block:8px;padding-inline:18px 10px;border-bottom:1.5px solid var(--ink)}
#root .prf-th-bar .prf-th-h{min-width:0;font-size:1.14rem;line-height:1.3}
#root .prf-th-x{flex:none;display:grid;place-items:center;width:40px;height:40px;margin:0;padding:0;border:0;border-radius:50%;background:var(--surface-3);box-shadow:none;color:var(--ink-2);font-size:18px;cursor:pointer;-webkit-tap-highlight-color:transparent}
#root .prf-th-x:focus-visible{outline:2px solid var(--a-600);outline-offset:2px}
#root .prf-th-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;outline:none}
#root .prf-th-body:focus-visible{box-shadow:inset 0 0 0 2px var(--a-600)}
#root .prf-th-sheet .prf-th-paper{padding-block:var(--prf-rule) calc(var(--prf-rule) * 2 + env(safe-area-inset-bottom,0px))}
@keyframes prf-th-up{from{transform:translateY(100%)}}
@keyframes prf-th-side{from{transform:translateX(-100%)}}
/* the header button (a phone shows the book alone, its name is read out) and the quiet link under the ladder */
#root .prf-lawsb{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:40px;min-height:40px;margin:0;margin-inline-start:auto;padding:0;border:0;border-radius:999px;background:var(--a-50);box-shadow:none;color:var(--a-800);font-size:.84rem;font-weight:700;white-space:nowrap;cursor:pointer}
#root .prf-lawsb .prf-ic{font-size:19px}
#root .prf-lawsb span{display:none}
#root .prf-lawsb + .prf-swap{margin-inline-start:0}
#root .prf-lawsb:focus-visible,#root .prf-tolaws:focus-visible{outline:2px solid var(--a-600);outline-offset:2px}
#root .prf-tolaws{flex:none;display:flex;align-items:center;justify-content:flex-start;gap:0;width:100%;max-width:560px;min-height:40px;margin:0 auto;padding:0 16px;border:0;border-radius:0;background:none;box-shadow:none;color:var(--ink-2);font:inherit;font-size:.9rem;font-weight:600;line-height:1.3;text-align:start;cursor:pointer;-webkit-tap-highlight-color:transparent}
#root .prf-tolaws .prf-ic:first-child{margin-inline:10px 22px;font-size:20px;color:var(--a-700)}
#root .prf-tolaws .prf-ic:last-child{margin-inline-start:5px;font-size:15px;color:var(--ink-3)}
#root .prf-tolaws:active{opacity:.7}
#root .prf-in-proof > .prf-tolaws{display:none}
/* the header on a phone: back, the level's name (never cut), the stage, "המשפטים" WITH its word (from 360px:
   always in sight) and "תרגיל אחר", which gives way first: under 480px it is its icon alone (its name is read out) */
@media (min-width:360px){
  #root .prf-lawsb{padding-inline:11px}
  #root .prf-lawsb span{display:inline}
}
@media (max-width:399px){
  #root .prf-head{gap:5px;padding-inline:2px 8px}
  #root .prf-head-t{font-size:.88rem;line-height:1.12}
  #root .prf-pill{padding-inline:7px}
  #root .prf-lawsb{gap:5px;padding-inline:9px;font-size:.8rem}
  #root .prf-lawsb .prf-ic{font-size:17px}
}
@media (max-width:479px){
  #root .prf-swap{justify-content:center;min-width:40px;padding-inline:0}
  #root .prf-swap span{display:none}
}
/* the landing below 1024px: the start button stays under the thumb over the whole page, the theorem notebook
   included. The first screen's parts and the notebook share one column (.prf-book); the button is the column's
   last item and sticks to the bottom, so everything above it can always be scrolled clear of it. */
@media (max-width:1023px),(max-height:500px){
  #root .prf-book{display:flex;flex-direction:column;min-height:calc(100dvh - var(--prf-top))}
  #root .prf-book > .prf-topic:not(.prf-in-proof){display:contents}
  #root .prf-book > .prf-th-page{order:2;flex:none}
  #root .prf-book > .prf-topic:not(.prf-in-proof) > .prf-land-go{order:3;max-width:none;margin-top:auto}
}
@media (max-width:767px){
  #root .prf-book > .prf-topic:not(.prf-in-proof) .prf-mast-fig{flex:none;height:clamp(124px,calc(100dvh - 530px),270px);min-height:0}
  #root .prf-book > .prf-topic:not(.prf-in-proof) > .prf-land-go .prf-go{align-self:center;max-width:528px}
}
@media (min-width:768px) and (min-height:501px){
  #root .prf-th{--prf-rule:34px;--prf-th-m:60px;font-size:17px}
  #root .prf-th-page{max-width:860px;margin-top:28px}
  #root .prf-th-page .prf-th-paper{padding-inline-end:40px}
  #root .prf-th-page .prf-th-paper::before{-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 64px,#000 calc(100% - 64px),transparent 100%),linear-gradient(to right,transparent 0,#000 56px,#000 calc(100% - 20px),transparent 100%);mask-image:linear-gradient(to bottom,transparent 0,#000 64px,#000 calc(100% - 64px),transparent 100%),linear-gradient(to right,transparent 0,#000 56px,#000 calc(100% - 20px),transparent 100%);-webkit-mask-composite:source-in;mask-composite:intersect}
  #root .prf-th-page .prf-th-h{font-size:2rem;line-height:calc(var(--prf-rule) * 2)}
  #root .prf-th-page .prf-th-sub{font-size:1rem}
  #root .prf-th-page .prf-th-e{grid-template-columns:minmax(0,1fr) 250px;column-gap:32px;align-items:start}
  #root .prf-th-page .prf-th-e.is-plain{grid-template-columns:minmax(0,1fr)}
  #root .prf-th-page .prf-th-fig .prf-lb{font-size:17px}
  #root .prf-th-pill{font-size:.88rem;line-height:26px}
  #root .prf-th-h2{font-size:1.2rem}
  #root .prf-th-sheet{flex-direction:row;justify-content:flex-end}
  #root .prf-th-panel{width:min(540px,92vw);height:100%;max-height:none;border-radius:0 26px 26px 0;box-shadow:16px 0 44px -16px rgb(28 27 25 / .4);animation-name:prf-th-side}
  #root .prf-th-sheet.is-out .prf-th-panel{transform:translateX(-100%)}
  #root .prf-th-bar{min-height:68px;padding-inline:26px 14px}
  #root .prf-th-bar .prf-th-h{font-size:1.3rem}
  #root .prf-th-x{width:44px;height:44px}
  #root .prf-lawsb{min-height:44px;padding-inline:15px;font-size:.95rem}
  #root .prf-tolaws{min-height:44px;font-size:1rem}
  #root .prf-tolaws .prf-ic:first-child{margin-inline:12px 24px}
}
@media (min-width:1024px) and (min-height:501px){
  #root .prf-topic:not(.prf-in-proof) > .prf-tolaws{grid-area:tolaws;max-width:none;margin:4px 0 0;padding:0}
  #root .prf-th-page{max-width:920px;margin-top:0;padding-inline:24px}
}
@media (prefers-reduced-motion: reduce){
  #root .prf-th-scrim,#root .prf-th-panel{animation:none;transition:none}
}

/* ── lab ── (the dev lab's review sheet; never on a student's screen) */
#root .prf-lab-sheet{max-width:1100px;margin:0 auto;padding:16px;color:var(--ink);text-align:start}
#root .prf-lab-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;font-size:.86rem}
#root .prf-lab-nav a,#root .prf-lab-nav button{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border:0;border-radius:999px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--line-strong);color:var(--ink);font:inherit;text-decoration:none}
#root .prf-lab-h{margin:14px 0 6px;font-size:1.3rem;font-weight:800;line-height:1.3}
#root .prf-lab-p{max-width:70ch;margin-bottom:12px;font-size:.92rem;line-height:1.55;color:var(--ink-2)}
#root .prf-lab-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}
#root .prf-lab-card{break-inside:avoid;page-break-inside:avoid}
#root section.prf-lab-card{padding:12px 14px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
#root .prf-lab-id{font-size:.82rem;font-weight:700;color:var(--a-800);text-align:left}
#root .prf-lab-fig{height:190px}
#root .prf-lab-k{margin-top:10px;font-size:.8rem;font-weight:700;color:var(--ink-3)}
#root .prf-lab-w{display:flex;flex-direction:column;gap:1px;margin-top:6px;font-size:.86rem;line-height:1.45}
#root .prf-lab-w span{color:var(--ink-2)}
#root .prf-lab-texts td:first-child{width:34%;white-space:normal;font-size:.8rem;color:var(--ink-3)}
#root .prf-lab-sheet .prf-table th:first-child,#root .prf-lab-sheet .prf-table td:first-child{white-space:normal}
@media print{
  #root .prf-lab-nav{display:none}
  #root .prf-lab-sheet{max-width:none;padding:0}
  #root .prf-lab-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  #root section.prf-lab-card{border-color:#999}
  #root .prf-lab-sheet .prf-mk{animation:none}
}

/* ── phones on their side (and very short windows): the drawing beside the rows ── */
@media (orientation:landscape) and (max-height:500px){
  #root .prf-screen{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr);column-gap:20px;max-width:1120px;margin-inline:auto;padding-inline:16px;background:transparent}
  #root .prf-head,#root .prf-prog{grid-column:1 / -1}
  #root .prf-figcol{align-self:center}
  #root .prf-stage{height:min(62dvh,480px)}
  #root .prf-work{margin-bottom:16px;overflow:hidden;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--sh-2)}
  #root .prf-tray{max-height:52dvh}
}
/* short phones (an iPhone SE in Safari shows about 550px): one-line strip with the goal first, a lower drawing */
@media (max-height:600px) and (max-width:767px) and (orientation:portrait){
  #root .prf-head{min-height:40px}
  #root .prf-figcol .prf-stage{height:118px}
  #root .prf-strip{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-block:2px;padding-inline-end:34px;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 30px);mask-image:linear-gradient(to right,transparent 0,#000 30px)}
  #root .prf-strip::-webkit-scrollbar{display:none}
  #root .prf-strip-goal{order:-1;flex:none;flex-wrap:nowrap;max-width:none}
  #root .prf-strip-given{flex:0 0 auto;flex-wrap:nowrap;max-width:none}
  #root .prf-strip .prf-fc{flex:none;white-space:nowrap}
  #root .prf-strip-goal{position:sticky;inset-inline-start:0;z-index:1;padding-inline-end:8px;background:var(--surface)}
  #root .prf-intro{font-size:.84rem}
}
@media (prefers-reduced-motion: reduce){
  #root .prf-row.is-new,#root .prf-row-law,#root .prf-q-law,#root .prf-hint,#root .prf-why,#root .prf-hintb.is-nudge,#root .prf-mast-fig,#root .prf-mast .prf-subj-in,#root .prf-subj-meta,#root .prf-subj-nudge,#root .prf-pt-open,#root .prf-warm-mid,#root .prf-end-card,#root .prf-prev,#root .prf-note.prf-fb{animation:none}
  #root .prf-pt-n,#root .prf-subj-thumb,#root .prf-subj-b,#root .prf-row-op .prf-ic,#root .prf-table-op .prf-ic{transition:none}
}

/* ══ tablets and computers (from 768 px wide, taller than a phone on its side) ══
   Everything above is the phone design and stays as it is. From here up the screens get their own
   layout: panels that size to what is in them (no tall empty card with a button at its foot), the start
   button with the content, a large coloured drawing and bigger type. 768–1023: one centred column.
   From 1024: two columns, the work on the right and the drawing on the left (RTL). */
@media (min-width:768px) and (min-height:501px){
  /* landing: the poster (wordmark + drawing) and the path */
  #root .prf-topic:not(.prf-in-proof) > .prf-mast,#root .prf-in-proof > .prf-mast{position:relative;isolation:isolate;container-type:inline-size}
  #root .prf-topic:not(.prf-in-proof) > .prf-mast::before,#root .prf-in-proof > .prf-mast::before{content:"";position:absolute;z-index:-1;inset:18% -6% -4%;pointer-events:none;background:radial-gradient(closest-side,color-mix(in srgb,var(--a-200) 55%,transparent),color-mix(in srgb,var(--a-100) 22%,transparent) 55%,transparent)}
  #root .prf-mast .prf-wm{position:relative;z-index:0}
  #root .prf-mast-fig{position:relative;z-index:1;flex:none;width:100%;height:auto;min-height:0;max-height:none;aspect-ratio:320 / 196;margin-top:calc(var(--prf-wm) * -.1);padding:0;animation:prf-rise .6s var(--ease-out) backwards}
  #root .prf-mast-fig .prf-sg{stroke-width:2.3;stroke:color-mix(in srgb,var(--a-900) 70%,var(--ink))}
  #root .prf-mast-fig .prf-sg.prf-c1{stroke:var(--prf-p1)}
  #root .prf-mast-fig .prf-sg.prf-c2{stroke:var(--prf-p2)}
  #root .prf-mast-fig .prf-sg.prf-c3{stroke:var(--prf-p3)}
  #root .prf-mast-fig .prf-sg.is-goal{stroke:var(--prf-goal)}
  #root .prf-mast-fig .prf-tri{fill-opacity:.1}
  #root .prf-mast-fig .prf-lb{font-size:13px}
  #root .prf-mast-fig .prf-fig > line.prf-sg{animation:prf-mark .45s var(--ease-out) backwards}
  #root .prf-mast-fig .prf-fig > line.prf-sg:nth-of-type(2){animation-delay:.08s}
  #root .prf-mast-fig .prf-fig > line.prf-sg:nth-of-type(3){animation-delay:.16s}
  #root .prf-mast-fig .prf-fig > line.prf-sg:nth-of-type(4){animation-delay:.24s}
  #root .prf-mast-fig .prf-fig > line.prf-sg:nth-of-type(5){animation-delay:.32s}
  #root .prf-mast-fig .prf-fig > line.prf-sg:nth-of-type(n+6){animation-delay:.4s}
  #root .prf-subjbar{align-items:flex-start;gap:10px}
  #root .prf-subj-b{min-height:44px;font-size:1rem}
  #root .prf-subj-meta{font-size:.9rem;text-align:start}
  #root .prf-subj-nudge{font-size:.86rem;text-align:start}
  #root .prf-pt-k{font-size:.76rem}
  #root .prf-path .ch-btn{flex:0 1 auto;min-height:48px;font-size:1.1rem}
  #root .prf-pt-row{min-height:52px;gap:12px}
  #root .prf-pt::before{inset-inline-start:21px;top:47px}
  #root .prf-pt-n{width:44px;height:44px;font-size:1.06rem}
  #root .prf-pt.is-open .prf-pt-name{font-size:1.7rem;line-height:1.15}
  #root .prf-pt-lv{margin-inline-start:auto}
  #root .prf-pt-open{padding-inline:56px 0;padding-block:2px 14px}
  #root .prf-pt-about{margin:0 0 14px;font-size:1.06rem;line-height:1.5;color:var(--ink-2)}
  #root .prf-tabs{gap:8px}
  #root .prf-tabs .sub-tab{min-height:44px;font-size:.95rem}
  #root .prf-locked{margin-top:10px;font-size:.86rem}
  #root .prf-land-stats{margin-top:10px;font-size:.88rem}
  #root .prf-land-go{position:relative;bottom:auto;z-index:auto;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:8px 18px;padding:0;background:none}
  #root .prf-land-go::before{content:none}
  #root .prf-land-go .prf-go{width:auto;min-width:220px;min-height:56px;padding-inline:40px;font-size:1.14rem}
  #root .prf-land-what{order:2;font-size:.9rem;text-align:start}
  @media (hover:hover){
    #root .prf-path .ch-btn:hover .prf-pt-name{color:var(--ink)}
    #root .prf-path .ch-btn:hover .prf-pt-n{box-shadow:inset 0 0 0 1.5px var(--a-500)}
    #root .prf-pt.is-open .ch-btn:hover .prf-pt-n{box-shadow:var(--sh-accent)}
  }

  /* every proof screen: the work sits on one sheet that is as tall as what is in it */
  #root .prf-in-proof > .prf-ch-open{max-width:none;margin:0;padding:0}
  #root .prf-screen{font-size:17px;background:transparent}
  #root .prf-head{height:auto;min-height:56px;padding-block:6px;padding-inline:0 4px;gap:10px}
  #root .prf-back{margin-inline-start:-8px}
  #root .prf-head-t{font-size:1.3rem;font-weight:800}
  #root .prf-pill{padding:3px 11px;font-size:.84rem}
  #root .prf-dots{gap:6px}
  #root .prf-dots i{width:11px;height:11px}
  #root .prf-work{flex:0 1 auto;justify-content:flex-start;overflow:hidden;border:1px solid var(--line);border-radius:24px;background:var(--surface);box-shadow:var(--sh-2)}
  #root .prf-strip{flex-direction:column;align-items:stretch;row-gap:6px;padding:12px 20px 12px;font-size:.92rem;background:var(--surface-2)}
  #root .prf-strip-given,#root .prf-strip-goal{gap:6px 8px;min-height:34px}
  #root .prf-strip-k{min-width:2.8em}
  #root .prf-fc{min-height:32px;padding:3px 12px;border-radius:16px;font-size:1rem}
  #root .prf-nb{flex:0 1 auto;padding:16px 22px 14px;border-top:0}
  #root .prf-prog{padding:0 2px 10px}
  #root .prf-prog-t{font-size:.9rem}
  #root .prf-prog-bar i{height:6px}
  #root .prf-nb-head{font-size:1.02rem;gap:7px 10px;margin-bottom:14px}
  #root .prf-gv-n{width:22px;height:22px;font-size:.78rem}
  #root .prf-nb-th,#root .prf-row-b{grid-template-columns:28px minmax(0,1.2fr) minmax(0,1fr);column-gap:12px}
  #root .prf-nb-th{font-size:.82rem}
  #root .prf-swap{font-size:.95rem;min-height:44px;padding-inline:14px}
  #root .prf-intro{font-size:1.02rem;padding-block:4px 6px}
  #root .prf-plan{font-size:.92rem;padding:4px 12px}
  #root .prf-row-b{min-height:50px;padding:6px 6px}
  #root .prf-row-n{font-size:.88rem}
  #root .prf-row-st{font-size:1.14rem}
  #root .prf-row-r{font-size:.95rem}
  #root .prf-row-full{padding:0 46px 10px;font-size:.96rem}
  #root .prf-law{font-size:.9rem}
  #root .prf-law-k,#root .prf-row-op,#root .prf-table-op{font-size:.78rem}
  #root .prf-row-law{padding-block:0 11px;padding-inline:46px 14px}
  #root .prf-q-law .prf-law{font-size:.95rem}
  #root .prf-lawc-t{font-size:.86rem}
  #root .prf-qslot{min-width:70px;height:30px;font-size:1rem}
  #root .prf-row:last-child{border-bottom:0}
  #root .prf-tray{flex:none;min-height:0;max-height:none;overflow:visible;gap:10px;padding:16px 22px 22px;border-radius:0;border-top:1px solid var(--line);box-shadow:none;background:var(--surface-2)}
  #root .prf-tray .prf-prev{position:relative;top:auto;box-shadow:inset 0 0 0 1.5px var(--a-300)}
  #root .prf-q.is-pin{position:static;margin-inline:0;padding:0;background:none;box-shadow:none}
  #root .prf-q-k{font-size:.88rem}
  #root .prf-q-h{font-size:1.32rem}
  #root .prf-q-quote{font-size:1.06rem;padding:6px 12px}
  #root .prf-coach-t{font-size:1.06rem}
  #root .prf-coach-av{width:40px;height:40px}
  #root .prf-ask-st{font-size:1.14rem}
  #root .prf-q-e .prf-x span{display:inline}
  #root .prf-q-e .prf-hintb{min-height:40px}
  #root .prf-hintb{min-height:44px;font-size:.94rem;padding-inline:14px}
  #root .prf-hint,#root .prf-why{font-size:1rem}
  #root .prf-fb{font-size:1rem;padding:9px 14px}
  #root .prf-chips{gap:10px}
  #root .prf-chip{min-height:52px;font-size:1.02rem;border-radius:14px}
  #root .prf-tile{font-size:1.14rem}
  #root .prf-go-row .prf-go{flex:0 1 auto;min-width:200px;min-height:52px;font-size:1.06rem}
  #root .prf-go-row{justify-content:flex-start}
  #root .prf-qed{min-height:56px;font-size:1.24rem}
  #root .prf-tap-q{font-size:1.04rem}
  #root .prf-prev-st{font-size:1.28rem}
  #root .prf-partc{font-size:1.04rem}
  /* the end of a proof: the result and the notebook page on the same sheet, the buttons right under it */
  #root .prf-end-card{flex:0 1 auto;border-top:0;background:transparent}
  #root .prf-end-scroll{flex:0 1 auto;padding:20px 20px 8px}
  #root .prf-end{font-size:1.24rem;padding:13px 16px}
  #root .prf-end.is-helped{font-size:1.04rem}
  #root .prf-lvup{font-size:1.1rem;padding:12px 16px}
  #root .prf-end-stats,#root .prf-end-line{font-size:.98rem}
  #root .prf-page{margin-top:18px}
  #root .prf-page-h{font-size:.92rem}
  #root .prf-page-in{padding:16px 20px 18px;box-shadow:none;background:var(--surface-2)}
  #root .prf-page-l{font-size:1.04rem}
  #root .prf-table{font-size:1rem}
  #root .prf-table th{font-size:.88rem}
  #root .prf-end-btns{justify-content:flex-start;padding:12px 20px 20px;border-top:0;background:transparent}
  #root .prf-end-btns .prf-go{flex:0 1 auto;min-width:220px}
  #root .prf-end-btns .prf-go.is-quiet{min-width:0}
  /* the warm-up: the question, then its answers, on the same sheet */
  #root .prf-warm-mid{flex:none;justify-content:flex-start;overflow:visible;gap:10px;padding:22px 20px 18px}
  #root .prf-warm-k{font-size:.86rem;padding:3px 12px}
  #root .prf-warm-q{font-size:1.36rem}
  #root .prf-warm-st{font-size:1.8rem}
  #root .prf-warm-sent{font-size:1.16rem;padding:8px 14px}
  #root .prf-warm-picked{font-size:1.16rem}
  /* the rescue card: words, not a floating phone card */
  #root .prf-rescue{max-width:520px;gap:14px;padding:0;border-radius:0;background:none;box-shadow:none;text-align:start}
  #root .prf-rescue-k{font-size:.9rem}
  #root .prf-rescue-t{font-size:clamp(1.5rem,2.4vw,2rem);font-weight:800;line-height:1.3}
  #root .prf-rescue-b{flex-direction:row;flex-wrap:wrap;gap:10px;margin-top:10px}
  #root .prf-rescue-b .prf-go{width:auto;min-width:220px;min-height:56px;font-size:1.1rem}
  #root .prf-rescue-b .prf-go.is-quiet{min-width:0}
}

/* 768–1023 (a tablet held upright): one centred column */
@media (min-width:768px) and (max-width:1023px) and (min-height:501px){
  #root .prf-topic:not(.prf-in-proof){padding-block:4px 0}
  #root .prf-topic:not(.prf-in-proof) > .prf-mast{--prf-wm:min(31cqw,17dvh);flex:none;max-width:600px}
  #root .prf-mast-fig{width:min(100%,500px);margin-inline:auto}
  #root .prf-subjbar{max-width:600px;margin-top:14px;align-items:center}
  #root .prf-subj-meta,#root .prf-subj-nudge{text-align:center}
  #root .prf-path{max-width:600px;margin-top:6px}
  /* the start button stays in reach while the path scrolls (as on a phone, but as a pill with its line beside it) */
  #root .prf-land-go{position:sticky;bottom:0;z-index:5;justify-content:center;max-width:none;margin:8px 0 0;padding:14px 16px max(16px,env(safe-area-inset-bottom,0px));background:var(--bg)}
  #root .prf-land-go::before{content:"";position:absolute;inset:auto 0 100% 0;height:28px;background:linear-gradient(to top,var(--bg),transparent);pointer-events:none}
  /* a proof: the drawing on top, then the sheet; the tray follows the rows and the rows scroll when they fill the screen */
  #root .prf-screen{max-width:720px;margin-inline:auto;padding-inline:24px 24px}
  #root .prf-stage{height:clamp(240px,34dvh,380px)}
  #root .prf-work{margin-bottom:20px}
  #root .prf-nb{min-height:60px;overflow-y:auto}
  #root .prf-tray{flex:none;max-height:46dvh;overflow-y:auto}
  #root .prf-end-card{min-height:0}
  #root .prf-end-scroll{overflow-y:auto}
  #root .prf-warm-mid{overflow-y:auto;flex:0 1 auto}
  /* the rescue card under the poster */
  #root .prf-in-proof:has(> .prf-ch-card){justify-content:center;padding-bottom:40px}
  #root .prf-in-proof:has(> .prf-ch-card) > .hdr{display:flex;flex:none;--prf-wm:min(31cqw,17dvh);max-width:600px}
  #root .prf-in-proof > .prf-ch-card{flex:none;max-width:600px;margin:8px auto 0;padding:0 16px}
}

/* from 1024: two columns */
@media (min-width:1024px) and (min-height:501px){
  #root .prf-topic{width:100%;max-width:1360px;margin-inline:auto}
  #root .prf-topic.prf-in-proof{max-width:1480px}
  #root .prf-topic:not(.prf-in-proof){display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.24fr);grid-template-rows:minmax(0,1fr) auto auto auto auto auto minmax(0,1fr);grid-template-areas:". mast" "team mast" "subj mast" "path mast" "tolaws mast" "go mast" ". mast";column-gap:clamp(40px,5.5vw,104px);padding:12px clamp(24px,4vw,56px) 28px}
  #root .prf-topic:not(.prf-in-proof) > .prf-team{grid-area:team;width:auto;max-width:none;margin:0 0 22px;padding:0;text-align:start;font-size:.8rem}
  #root .prf-topic:not(.prf-in-proof) > .prf-mast{grid-area:mast;align-self:center;--prf-wm:min(31cqw,22dvh);max-width:none;margin:0;padding:0}
  #root .prf-topic:not(.prf-in-proof) > .prf-subjbar{grid-area:subj;max-width:none;margin:0 0 16px;padding:0}
  #root .prf-topic:not(.prf-in-proof) > .prf-path{grid-area:path;max-width:none;margin:0;padding:0}
  #root .prf-topic:not(.prf-in-proof) > .prf-land-go{grid-area:go;max-width:none;margin:28px 0 0;padding:0 56px 0 0}
  #root .prf-pt.is-open .prf-pt-name{font-size:clamp(1.7rem,2.3vw,2.2rem)}

  /* a proof: the work on the right, the drawing large and sticky on the left */
  #root .prf-screen{display:grid;grid-template-columns:minmax(0,600px) minmax(0,780px);justify-content:center;grid-template-rows:auto auto minmax(0,1fr);grid-template-areas:"head fig" "prog fig" "work fig";column-gap:clamp(32px,4vw,72px);max-width:none;height:auto;min-height:calc(100dvh - var(--prf-top));overflow:visible;padding:4px clamp(24px,3.5vw,56px) 40px}
  #root .prf-head{grid-area:head}
  #root .prf-figcol{grid-area:fig;position:sticky;top:var(--prf-top);align-self:start;padding-top:66px}
  #root .prf-stage{width:100%;height:auto;max-height:calc(100dvh - var(--prf-top) - 90px);aspect-ratio:320 / 196}
  #root .prf-work{grid-area:work;align-self:start;max-width:640px}
  #root .prf-nb{overflow:visible}
  #root .prf-prog{grid-area:prog}
  /* the rescue card beside the poster */
  #root .prf-in-proof:has(> .prf-ch-card){display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.24fr);grid-template-areas:"card mast";align-items:center;column-gap:clamp(40px,5.5vw,104px);padding:12px clamp(24px,4vw,56px) 28px}
  #root .prf-in-proof:has(> .prf-ch-card) > .hdr{display:flex;grid-area:mast;--prf-wm:min(31cqw,22dvh);max-width:none;margin:0;padding:0}
  #root .prf-in-proof > .prf-ch-card{grid-area:card;padding:0}
  #root .prf-in-proof > .prf-ch-card .prf-rescue{margin:0}
}
@media (min-width:1024px) and (max-width:1279px) and (min-height:501px){
  #root .prf-screen{grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);column-gap:32px;padding-inline:24px}
}
/* big screens (1600 and up): the same two columns, larger */
@media (min-width:1600px) and (min-height:960px){
  #root .prf-topic{max-width:1600px}
  #root .prf-topic:not(.prf-in-proof){grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)}
  #root .prf-in-proof:has(> .prf-ch-card){grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)}
  #root .prf-team{font-size:.86rem}
  #root .prf-subj-b{min-height:48px;font-size:1.08rem}
  #root .prf-subj-meta{font-size:1rem}
  #root .prf-pt-k{font-size:.84rem}
  #root .prf-path .ch-btn{font-size:1.24rem}
  #root .prf-pt-row{min-height:60px}
  #root .prf-pt-n{width:50px;height:50px;font-size:1.16rem}
  #root .prf-pt::before{inset-inline-start:24px;top:55px}
  #root .prf-pt-open{padding-inline:62px 0;padding-block:4px 18px}
  #root .prf-pt.is-open .prf-pt-name{font-size:2.5rem}
  #root .prf-pt-about{font-size:1.2rem}
  #root .prf-tabs{gap:10px}
  #root .prf-tabs .sub-tab{min-height:50px;font-size:1.04rem}
  #root .prf-locked{font-size:.94rem}
  #root .prf-topic:not(.prf-in-proof) > .prf-land-go{padding-inline-start:62px;margin-top:34px}
  #root .prf-land-go .prf-go{min-width:260px;min-height:62px;font-size:1.24rem}
  #root .prf-land-what{font-size:1rem}
  #root .prf-screen{grid-template-columns:minmax(0,660px) minmax(0,820px);font-size:18px}
  #root .prf-work{max-width:none}
  #root .prf-head-t{font-size:1.44rem}
  #root .prf-fc{font-size:1.08rem}
  #root .prf-intro{font-size:1.1rem}
  #root .prf-row-b{min-height:56px}
  #root .prf-row-st{font-size:1.28rem}
  #root .prf-row-r{font-size:1.02rem}
  #root .prf-q-h{font-size:1.44rem}
  #root .prf-ask-st{font-size:1.28rem}
  #root .prf-chip{min-height:58px;font-size:1.1rem}
  #root .prf-tile{font-size:1.24rem}
  #root .prf-fb,#root .prf-hint,#root .prf-why{font-size:1.08rem}
  #root .prf-warm-q{font-size:1.5rem}
  #root .prf-page-l,#root .prf-table{font-size:1.1rem}
  #root .prf-rescue{max-width:600px}
  #root .prf-rescue-t{font-size:2.5rem}
}
@keyframes prf-rise{from{opacity:0;transform:translateY(14px) scale(.97)}}
@media (prefers-reduced-motion: reduce){
  #root .prf-mast-fig,#root .prf-mast-fig .prf-fig > line.prf-sg{animation:none}
}

/* ══ similarity: ∥ and ∼, stacked fractions, the work line, numbers on the drawing, the number keypad (spec 2026-11-23 §7.5, §10.2) ══ */
#root .prf-sign-par{margin-inline:-.14em}
#root .prf-sign-sim{margin-inline:.3em}
#root .prf-m.prf-fracs,#root .prf-fracs{display:inline-flex;align-items:center;gap:.42em;vertical-align:middle}
#root .prf-frac{display:inline-flex;flex-direction:column;align-items:center;font-size:.9em;line-height:1.2}
#root .prf-frac-t{min-width:1.5em;padding:0 .26em .08em;border-bottom:1.5px solid currentColor;text-align:center}
#root .prf-frac-b{min-width:1.5em;padding:.08em .26em 0;text-align:center}
#root .prf-frac-eq{font-weight:500;opacity:.75}
#root .prf-frac .prf-slot{display:block;width:1.9em;height:1.12em;margin:1px auto;vertical-align:0}
#root .prf-row-work{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin:0;padding-block:0 9px;padding-inline:34px 10px;animation:prf-row .25s var(--ease-out) backwards}
#root .prf-work-s{display:inline-flex;align-items:center;gap:8px;min-width:0}
#root .prf-work-k{flex:none;padding-inline:6px;border-radius:6px;background:var(--a-50);box-shadow:inset 0 0 0 1px var(--a-200);color:var(--a-800);font-size:.7rem;font-weight:700;line-height:1.5}
#root .prf-work-m{font-size:.96rem;color:var(--ink)}
#root .prf-num{font:600 13px var(--font);font-variant-numeric:tabular-nums;fill:var(--ink-2);stroke:var(--surface);stroke-width:2.6px;paint-order:stroke;stroke-linejoin:round;text-anchor:middle;pointer-events:none}
#root .prf-num.is-ask{fill:var(--prf-goal);font-size:13.5px;font-weight:800;font-style:italic}
#root .prf-num.is-found{fill:var(--ok-800);font-weight:800}
#root .prf-chip.is-num{min-height:52px;font-size:1.22rem;font-weight:700}
#root .prf-slot.is-num{width:2.6em}
#root .prf-slot.is-num.is-set{min-width:1em;color:var(--a-800);font-weight:800}
#root .prf-prev-frac{min-height:58px}
#root .prf-prev-frac .prf-prev-st{flex:1;justify-content:flex-start}
#root .prf-unpair{min-height:40px}
#root .prf-kp{display:flex;flex-direction:column;gap:8px;margin-top:2px}
#root .prf-kp-top{display:flex;align-items:stretch;gap:8px}
#root .prf-kp-box{flex:1;min-width:0;display:flex;align-items:center;gap:.36em;min-height:48px;padding-inline:14px;overflow:hidden;border-radius:14px;background:var(--a-50);box-shadow:inset 0 0 0 1.5px var(--a-300);direction:ltr;text-align:left;white-space:nowrap;color:var(--a-900);font-size:1.22rem;font-weight:700;font-variant-numeric:tabular-nums}
#root .prf-kp-name{font-weight:600;color:var(--ink-2)}
#root .prf-kp-box.is-stale .prf-kp-val{color:var(--ink-3);text-decoration:line-through;text-decoration-thickness:1.5px}
#root .prf-kp-caret{flex:none;width:2px;height:1.15em;margin-inline-start:-.2em;border-radius:1px;background:var(--a-600);animation:prf-caret 1.1s steps(1) infinite}
#root .prf-kp-box.is-stale .prf-kp-caret{display:none}
@keyframes prf-caret{50%{opacity:0}}
#root .prf-go.prf-kp-go{flex:0 0 auto;min-height:48px;padding-inline:18px;white-space:nowrap}
#root .prf-kp-keys{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;direction:ltr}
#root .prf-kp-k{display:flex;align-items:center;justify-content:center;width:auto;height:auto;min-width:40px;min-height:46px;margin:0;padding:0;border:0;border-radius:12px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--line-strong),0 2px 0 var(--line-strong);color:var(--ink);font-size:1.26rem;font-weight:600;font-variant-numeric:tabular-nums;line-height:1;transition:transform .08s var(--ease-out)}
#root .prf-kp-k:active{transform:translateY(2px)}
#root .prf-kp-k:disabled{opacity:.35}
#root .prf-kp-k.is-del{color:var(--a-700)}
#root .prf-kp-k .prf-ic{width:26px;height:22px}
/* the keypad sheet is tall: on a phone the notebook keeps just the open row in view above it; a short phone gets tighter keys */
@media (max-width:767px),(max-height:500px){
  #root .prf-screen.is-kp .prf-nb{min-height:54px}
}
@media (max-height:720px) and (max-width:767px){
  #root .prf-kp{gap:6px}
  #root .prf-kp-k{min-height:42px}
  #root .prf-kp-box,#root .prf-go.prf-kp-go{min-height:44px}
}
@media (max-width:359px){
  #root .prf-kp-keys{gap:5px}
  #root .prf-go.prf-kp-go{padding-inline:13px;font-size:.94rem}
  #root .prf-kp-box{padding-inline:11px;font-size:1.12rem}
}
@media (min-width:768px) and (min-height:501px){
  #root .prf-row-work{padding-block:0 11px;padding-inline:46px 14px;gap:8px 24px}
  #root .prf-work-m{font-size:1.1rem}
  #root .prf-work-k{font-size:.78rem}
  #root .prf-kp{max-width:460px}
  #root .prf-kp-k{min-height:52px;font-size:1.36rem}
  #root .prf-kp-box{min-height:52px;font-size:1.36rem}
  #root .prf-go.prf-kp-go{min-height:52px}
  #root .prf-chip.is-num{min-height:58px;font-size:1.36rem}
}
@media (prefers-reduced-motion: reduce){
  #root .prf-row-work,#root .prf-kp-caret{animation:none}
  #root .prf-kp-k{transition:none}
}
/* ── the exam level "כמו במבחן" and "שולטים בנושא" (spec 2026-11-23 §8; Task 14) ── */
/* the notebook: each section's goal line, like a test's sub-question, above its block of rows */
#root .prf-sec{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 7px;margin:14px 0 0;padding:3px 4px 5px;border-bottom:1px solid var(--line-strong);font-size:.9rem;font-weight:600;line-height:1.45;color:var(--ink)}
#root .prf-nb-th + .prf-sec{margin-top:6px}
#root .prf-sec-l{flex:none;min-width:1.1em;font-size:1rem;font-weight:800;color:var(--a-700)}
#root .prf-sec-g{flex:1 1 0;min-width:0}
#root .prf-sec-ok{flex:none;align-self:center;color:var(--ok-600);font-size:15px}
#root .prf-sec.is-done{color:var(--ink-2)}
#root .prf-sec.is-done .prf-sec-l{color:var(--ok-700)}
#root .prf-table .prf-table-sec td:first-child{width:auto;padding:12px 6px 5px;border-inline-end:0;border-bottom:1px solid var(--line-strong);white-space:normal;font-size:.88rem;font-weight:600;line-height:1.45;color:var(--ink)}
#root .prf-table .prf-table-sec .prf-sec-l{font-size:.95rem}
/* the ladder: the locked exam (a lock in its circle, one line saying what opens it), the passed one (a seal) */
#root .prf-pt-why{display:block;margin-top:2px;font-size:.76rem;font-weight:500;line-height:1.35;color:var(--ink-3);text-wrap:pretty}
#root .prf-pt.is-locked .prf-pt-n{background:var(--surface-2);box-shadow:inset 0 0 0 1.5px var(--line);color:var(--ink-3)}
#root .prf-pt.is-locked .prf-pt-n .prf-ic{font-size:17px}
#root .prf-pt.is-locked.is-open .prf-pt-n{background:var(--a-100);box-shadow:inset 0 0 0 1.5px var(--a-300);color:var(--a-700)}
#root .prf-pt.is-locked .prf-pt-name{color:var(--ink-2)}
#root .prf-pt.is-exam.is-passed .prf-pt-n{background:var(--a-600);box-shadow:none;color:#fff}
#root .prf-pt-won{flex:none;display:inline-flex;align-items:center;gap:4px;padding:2px 10px 2px 8px;border-radius:999px;background:var(--a-600);color:#fff;font-size:.74rem;font-weight:700;line-height:1.6;white-space:nowrap}
#root .prf-pt-won .prf-ic{font-size:15px}
/* the exam has one help stage (לבד): a short tab at the start of the row, not a bar across it */
#root .prf-pt.is-exam .prf-tabs .sub-tab{flex:0 0 auto;min-width:104px;padding-inline:18px}
#root .prf-pt.is-locked .prf-pt-open .prf-pt-about{margin-top:4px}
/* the subject switcher: a small seal before a mastered subject's name */
#root .prf-subj-b.is-won{display:inline-flex;align-items:center;justify-content:center;gap:5px}
#root .prf-subj-nm{min-width:0;overflow:hidden;text-overflow:ellipsis}
#root .prf-subj-seal{flex:none;font-size:17px;color:var(--a-600)}
/* the meta line: how far to "שולטים בנושא", or the seal once it is reached; the quiet first-visit nudge under it (§9) */
#root .prf-subj-won{display:inline-flex;align-items:center;gap:3px;color:var(--a-700);font-weight:700;vertical-align:bottom}
#root .prf-subj-won .prf-ic{font-size:15px}
#root .prf-subj-nudge{max-width:36ch;margin:-2px 0 0;font-size:.8rem;font-weight:500;line-height:1.45;color:var(--ink-3);text-align:center;text-wrap:balance;animation:prf-row .3s .1s var(--ease-out) backwards}
/* the end card: "שולטים בנושא", calm and proud: a seal that settles, a ring that opens around it, the words */
#root .prf-mastered{display:flex;flex-direction:column;align-items:center;gap:3px;padding:12px 8px 8px;text-align:center}
#root .prf-mastered-seal{position:relative;display:grid;place-items:center;width:68px;height:68px;margin-bottom:8px;border-radius:50%;background:var(--a-600);box-shadow:var(--sh-accent);color:#fff;font-size:38px;animation:prf-seal .7s .1s var(--ease-out) backwards}
#root .prf-mastered-seal::after{content:"";position:absolute;inset:-9px;border-radius:50%;box-shadow:0 0 0 1.5px var(--a-200);animation:prf-seal-ring .9s .45s var(--ease-out) backwards}
#root .prf-mastered-t{font-size:1.7rem;font-weight:800;line-height:1.2;color:var(--a-800);animation:prf-row .45s .3s var(--ease-out) backwards}
#root .prf-mastered-s{max-width:32ch;font-size:.94rem;line-height:1.5;color:var(--ink-2);text-wrap:balance;animation:prf-row .45s .45s var(--ease-out) backwards}
@keyframes prf-seal{from{opacity:0;transform:scale(.55) rotate(-16deg)}}
@keyframes prf-seal-ring{from{opacity:0;transform:scale(.72)}}
@media (prefers-reduced-motion: reduce){
  #root .prf-mastered-seal,#root .prf-mastered-seal::after,#root .prf-mastered-t,#root .prf-mastered-s{animation:none}
}
`;
export default css;
