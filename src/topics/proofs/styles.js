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
#root .prf-mover{fill:var(--a-500);fill-opacity:.3;stroke:var(--prf-goal);stroke-width:2;stroke-linejoin:round;pointer-events:none}
#root .prf-fig.is-end-tint .prf-mover{display:none}
#root .prf-fig.is-end-tint .prf-tri,#root .prf-fig.is-end-move .prf-tri{fill-opacity:.17}
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
#root .prf-head{flex:none;display:flex;align-items:center;gap:8px;height:44px;padding-inline:4px 14px}
#root .prf-back{flex:none;display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:50%;background:transparent;box-shadow:none;color:var(--a-700);font-size:20px}
#root .prf-head-t{flex:0 1 auto;min-width:0;font-size:1rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
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
#root .prf-ask-sent{flex:0 0 100%;min-width:0;padding:4px 10px;border-radius:10px;background:var(--a-50);color:var(--a-900);font-size:.95rem;line-height:1.45}
#root .prf-fc-goal{background:var(--a-50);border:1.5px dashed var(--a-300);color:var(--a-800)}
#root .prf-fc-goal.is-done{background:var(--ok-50);border:1.5px solid var(--ok-500);color:var(--ok-800)}

/* ── rows ── */
#root .prf-rows{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:6px 14px 8px}
#root .prf-intro{padding-block:2px 4px;font-size:.9rem;line-height:1.5;color:var(--ink-2)}
#root .prf-plan{width:fit-content;margin-block:2px 4px;padding:3px 10px;border-radius:999px;background:var(--a-50);color:var(--a-800);font-size:.84rem;font-weight:500}
#root .prf-rowlist{list-style:none;margin:0;padding:0}
#root .prf-row{border-bottom:1px solid var(--line);transition:background-color .3s ease}
#root .prf-row.is-new{animation:prf-row .2s var(--ease-out) backwards}
#root .prf-row.is-lead{background:var(--a-50)}
#root .prf-row-b{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:4px 2px;border:0;border-radius:0;background:transparent;box-shadow:none;color:var(--ink);text-align:start}
#root .prf-row-n{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--ok-50);color:var(--ok-700);box-shadow:inset 0 0 0 1.5px var(--ok-500);font-size:.76rem;font-weight:700;font-variant-numeric:tabular-nums}
#root .prf-row-st{flex:none;font-size:1.02rem}
#root .prf-row-r{flex:1;min-width:0;font-size:.84rem;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#root .prf-row-g{flex:none;display:flex;align-items:center;gap:4px}
#root .prf-row-ok{color:var(--ok-600);font-size:16px}
#root .prf-row-full{padding:0 32px 8px;font-size:.88rem;color:var(--ink-2)}
#root .prf-row-full b{font-weight:600;color:var(--ink)}
#root .prf-swap{flex:none;display:grid;place-items:center;width:40px;height:40px;margin-inline-start:auto;border:0;border-radius:50%;background:transparent;box-shadow:none;color:var(--a-700);font-size:18px}
#root .prf-swap + .prf-dots{margin-inline-start:0}
@keyframes prf-row{from{opacity:0;transform:translateY(8px)}}

/* ── tray ── */
#root .prf-tray{flex:none;display:flex;flex-direction:column;gap:8px;min-height:120px;max-height:40dvh;overflow-y:auto;overscroll-behavior:contain;padding:10px 14px max(12px,env(safe-area-inset-bottom,0px));background:var(--surface-2);border-top:1px solid var(--line);box-shadow:0 -14px 28px -22px rgb(28 27 25 / .25)}
#root .prf-step,#root .prf-fbc{margin:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none;animation:none}
#root .prf-ask{display:flex;align-items:center;gap:8px;min-height:44px}
#root .prf-ask-t{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:baseline;column-gap:8px;line-height:1.35}
#root .prf-ask-k{font-size:.78rem;font-weight:700;color:var(--a-700)}
#root .prf-ask-st{font-size:1.16rem}
#root .prf-ask-r{font-size:.9rem;color:var(--ink-2)}
#root .prf-ask-q{flex:0 0 100%;font-size:.95rem;color:var(--ink-2)}
#root .prf-ask-k + .prf-ask-q,#root .prf-ask-q:first-child{flex:1 1 auto;color:var(--ink);font-weight:500;font-size:1rem}
#root .prf-ask-e{flex:none;display:flex;align-items:center;gap:6px}
#root .prf-hintb{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:6px;min-height:40px;padding-inline:11px;border:0;border-radius:12px;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-strong);color:var(--ink-2);font-size:.88rem;font-weight:600;white-space:nowrap}
#root .prf-hintb > *{position:relative;z-index:1}
#root .prf-hintb .prf-ic{font-size:17px;color:var(--a-600)}
#root .prf-hintb:disabled{color:var(--ink-3)}
#root .prf-hintb .prf-hintb-fill{position:absolute;inset:0;z-index:0;background:var(--a-100);transform-origin:right;animation:prf-fill 4s linear both}
#root .prf-hintb.is-nudge{animation:prf-nudge .9s var(--ease-out) 1}
#root .prf-rungs{display:inline-flex;gap:3px}
#root .prf-rungs i{display:block;width:5px;height:5px;border-radius:50%;background:var(--line-strong)}
#root .prf-rungs i.is-on{background:var(--a-500)}
#root .prf-ask-e .prf-x span{display:none}
#root .prf-x{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:40px;min-height:40px;padding-inline:8px;border:0;background:transparent;box-shadow:none;color:var(--ink-3);font-size:.86rem;font-weight:500}
#root .prf-x .prf-ic{font-size:15px;color:var(--a-600)}
#root .prf-hint{margin-top:4px;padding-inline-start:10px;border-inline-start:3px solid var(--a-300);font-size:.92rem;line-height:1.45;color:var(--ink-2);animation:prf-row .25s var(--ease-out) backwards}
#root .prf-why{padding-inline-start:10px;border-inline-start:3px solid var(--ok-200);font-size:.9rem;line-height:1.45;color:var(--ink-2);animation:prf-row .25s var(--ease-out) backwards}
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
#root .prf-tray .prf-prev{position:sticky;top:0;z-index:2;box-shadow:inset 0 0 0 1.5px var(--a-300),0 8px 14px -12px rgb(28 27 25 / .35)}
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
#root .prf-end-btns{flex:none;display:flex;gap:8px;padding:10px 14px max(12px,env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);background:var(--surface-2)}
@keyframes prf-grow{from{transform:scaleY(.2);opacity:.4}}

/* ── team ── */
#root .prf-team{flex:none;width:100%;max-width:560px;margin:6px auto 0;padding:0 16px;font-size:.72rem;line-height:1.4;color:var(--ink-3);text-align:center}
#root .prf-topic{display:flex;flex-direction:column;min-height:calc(100dvh - var(--prf-top))}
#root .prf-topic > *{min-width:0}

/* ── landing ── */
#root .prf-in-proof > .prf-team,#root .prf-in-proof > .hdr,#root .prf-in-proof > .prf-path{display:none}
#root .prf-in-proof > .prf-ch-open{max-width:none;margin:0;padding:0}
#root .prf-in-proof > .prf-ch-card{flex:1;display:flex;flex-direction:column;justify-content:center;width:100%;margin:0 auto;padding:16px}
#root .prf-mast{--prf-wm:clamp(4.6rem,22vw,8.6rem);flex:1 1 auto;display:flex;flex-direction:column;flex-wrap:nowrap;align-items:stretch;justify-content:flex-start;gap:0;width:100%;max-width:560px;margin:0 auto;padding:4px 16px 0;border:0;border-radius:0;background:none;box-shadow:none;text-align:center}
#root .prf-mast .prf-wm{flex:none;margin:-.06em 0 0;padding:0;font-size:var(--prf-wm);font-weight:800;line-height:.86;white-space:nowrap;color:var(--a-600);background:linear-gradient(180deg,var(--a-300) 0%,var(--a-600) 80%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
#root .prf-mast-fig{flex:1 1 136px;height:auto;min-height:136px;max-height:270px;margin-top:calc(var(--prf-wm) * -.17);padding:0 6px;animation:prf-row .35s var(--ease-out) backwards}
#root .prf-mast-fig::before{display:none}
#root .prf-path{flex:none;display:flex;flex-direction:column;flex-wrap:nowrap;align-items:stretch;justify-content:flex-start;gap:0;width:100%;max-width:560px;margin:2px auto 0;padding:0 16px;overflow:visible;border:0;border-radius:0;background:none;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;-webkit-mask-image:none;mask-image:none;scroll-snap-type:none}
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
  #root .prf-mast{--prf-wm:clamp(3.6rem,17vw,6rem)}
  #root .prf-mast-fig{flex-basis:124px;min-height:124px}
}

/* ── warm ── */
#root .prf-warm-mid{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:8px;padding:10px 16px;text-align:start;animation:prf-row .25s var(--ease-out) backwards}
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

/* ── rescue ── */
#root .prf-rescue{display:flex;flex-direction:column;gap:10px;width:100%;max-width:440px;margin:0 auto;padding:22px 20px;border-radius:22px;background:var(--surface);box-shadow:var(--sh-2);text-align:center}
#root .prf-rescue-k{font-size:.84rem;font-weight:700;color:var(--a-700)}
#root .prf-rescue-t{font-size:1.2rem;font-weight:700;line-height:1.45;color:var(--ink);text-wrap:balance}
#root .prf-rescue-b{display:flex;flex-direction:column;gap:8px;margin-top:6px}
#root .prf-rescue-b .prf-go{flex:none;width:100%}

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

/* ── wide screens and phones on their side: the drawing beside the rows ── */
@media (min-width:900px),(orientation:landscape) and (max-height:500px){
  #root .prf-screen{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);column-gap:20px;max-width:1120px;margin-inline:auto;padding-inline:16px;background:transparent}
  #root .prf-head{grid-column:1 / -1}
  #root .prf-figcol{align-self:center}
  #root .prf-stage{height:min(62dvh,480px)}
  #root .prf-work{margin-bottom:16px;overflow:hidden;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--sh-2)}
  #root .prf-tray{max-height:52dvh}
}
/* short phones (an iPhone SE in Safari shows about 550px): one-line strip with the goal first, a lower drawing */
@media (max-height:600px) and (max-width:899px) and (orientation:portrait){
  #root .prf-head{height:40px}
  #root .prf-stage{height:150px}
  #root .prf-strip{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-block:2px;padding-inline-end:34px;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 30px);mask-image:linear-gradient(to right,transparent 0,#000 30px)}
  #root .prf-strip::-webkit-scrollbar{display:none}
  #root .prf-strip-goal{order:-1;flex:none;flex-wrap:nowrap;max-width:none}
  #root .prf-strip-given{flex:0 0 auto;flex-wrap:nowrap;max-width:none}
  #root .prf-strip .prf-fc{flex:none;white-space:nowrap}
  #root .prf-strip-goal{position:sticky;inset-inline-start:0;z-index:1;padding-inline-end:8px;background:var(--surface)}
  #root .prf-intro{font-size:.84rem}
}
@media (prefers-reduced-motion: reduce){
  #root .prf-row.is-new,#root .prf-hint,#root .prf-why,#root .prf-hintb.is-nudge,#root .prf-mast-fig,#root .prf-pt-open,#root .prf-warm-mid,#root .prf-end-card,#root .prf-prev,#root .prf-note.prf-fb{animation:none}
  #root .prf-pt-n{transition:none}
}
`;
export default css;
