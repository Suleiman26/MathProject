// The proofs section's own CSS ("הוכחות"), shown only while the topic is open.
// Page look comes from src/styles/mp.css; everything after the marker is prefixed pf- and scoped under #root.
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

/* ── pf ── */
#root .pf{--pf-p1:#0284c7;--pf-p2:#7c3aed;--pf-p3:#0d9488;--pf-goal:var(--a-600);--pf-btn:var(--a-700);--pf-top:56px}

/* ── islands and signs ── */
#root .pf-m{display:inline-block;direction:ltr;unicode-bidi:isolate;white-space:nowrap;font-weight:600;font-variant-numeric:tabular-nums}
#root .pf-sign{display:inline-block;width:1.03em;height:.72em;vertical-align:baseline;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;margin-inline:.02em .07em}
#root .pf-sign-cong,#root .pf-sign-match{margin-inline:.3em}
#root .pf-ic{display:block;width:1em;height:1em;flex:none}
#root .pf-gl{display:block;width:20px;height:14px;flex:none}
#root .pf-gl.pf-c1{stroke:var(--pf-p1)}
#root .pf-gl.pf-c2{stroke:var(--pf-p2)}
#root .pf-gl.pf-c3{stroke:var(--pf-p3)}
#root .pf-sr{position:absolute;top:0;left:0;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}

/* ── figure ── */
#root .pf-stage{position:relative;isolation:isolate;height:clamp(150px,30dvh,240px);padding:2px 12px}
#root .pf-stage::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background-image:radial-gradient(circle,color-mix(in srgb,var(--a-500) 26%,transparent) 1.1px,transparent 1.6px);
  background-size:18px 18px;background-position:center;
  -webkit-mask-image:radial-gradient(closest-side,#000 40%,transparent 100%);mask-image:radial-gradient(closest-side,#000 40%,transparent 100%)}
#root .pf-fig{display:block;width:100%;height:100%;direction:ltr;overflow:visible;-webkit-user-select:none;user-select:none;touch-action:manipulation}
#root .pf-sg{fill:none;stroke:var(--ink);stroke-width:2;stroke-linecap:round;transition:stroke .3s ease,opacity .3s ease}
#root .pf-sg.pf-c1{stroke:var(--pf-p1)}
#root .pf-sg.pf-c2{stroke:var(--pf-p2)}
#root .pf-sg.pf-c3{stroke:var(--pf-p3)}
#root .pf-sg.is-goal{stroke:var(--pf-goal);stroke-width:2.4;stroke-dasharray:5.5 4.5}
#root .pf-sg.is-dim{opacity:.58}
#root .pf-sg.is-sel{stroke:var(--pf-goal);stroke-width:4.6;opacity:1}
#root .pf-tri{fill:var(--a-500);fill-opacity:0;stroke:none;transition:fill-opacity .4s ease}
#root .pf-tri.is-on{fill-opacity:.11}
#root .pf-tri.is-sel{fill-opacity:.28}
#root .pf-tri-goal{fill:var(--a-500);fill-opacity:.045;stroke:var(--pf-goal);stroke-width:1.6;stroke-dasharray:4 4;stroke-linejoin:round;stroke-linecap:round;pointer-events:none}
#root .pf-mk{fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none;transition:opacity .3s ease;animation:pf-mark .25s var(--ease-out) backwards}
#root .pf-mk.pf-c1{stroke:var(--pf-p1)}
#root .pf-mk.pf-c2{stroke:var(--pf-p2)}
#root .pf-mk.pf-c3{stroke:var(--pf-p3)}
#root .pf-mk.is-goal{stroke:var(--pf-goal);stroke-width:2;stroke-dasharray:3.5 3.5}
#root .pf-mk.is-dim{opacity:.58}
#root .pf-mk.is-sel{stroke:var(--pf-goal);stroke-width:3.4;stroke-dasharray:none;opacity:1}
#root .pf-arc.is-quiet{fill:none;stroke:var(--line-strong);stroke-width:1.8;stroke-linecap:round;pointer-events:none}
#root .pf-arc.is-quiet.is-sel{stroke:var(--pf-goal);stroke-width:3.4}
#root .pf-selw{fill:var(--a-500);fill-opacity:.2;stroke:none;pointer-events:none}
#root .pf-pulse{fill:none;stroke:var(--a-500);stroke-width:10;stroke-linecap:round;opacity:0;pointer-events:none;animation:pf-pulse .8s ease-in-out 2}
#root .pf-pulse.is-fill{fill:var(--a-500);stroke:none}
#root .pf-lb{font:600 14px var(--font);fill:var(--ink);stroke:var(--surface);stroke-width:4.5px;paint-order:stroke;stroke-linejoin:round;text-anchor:middle;pointer-events:none}
#root .pf-qm{pointer-events:none}
#root .pf-qm circle{fill:var(--bad-600);stroke:var(--surface);stroke-width:2}
#root .pf-qm text{font:700 11.5px var(--font);fill:#fff;text-anchor:middle}
#root .pf-mover{fill:var(--a-500);fill-opacity:.3;stroke:var(--pf-goal);stroke-width:2;stroke-linejoin:round;pointer-events:none}
#root .pf-fig.is-end-tint .pf-mover{display:none}
#root .pf-fig.is-end-tint .pf-tri,#root .pf-fig.is-end-move .pf-tri{fill-opacity:.17}
#root .pf-hit{fill:transparent;stroke:transparent;pointer-events:all;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}
#root .pf-hit-seg{fill:none;stroke-linecap:round}
#root .pf-hit:focus-visible{stroke:var(--a-500);stroke-opacity:.38}
#root .pf-hit-ang:focus-visible,#root .pf-hit-tri:focus-visible{stroke-width:3;stroke-opacity:.9;stroke-linejoin:round}
@keyframes pf-mark{from{opacity:0}}
@keyframes pf-pulse{0%,100%{opacity:0}50%{opacity:.42}}
@media (prefers-reduced-motion: reduce){
  #root .pf-pulse{animation:none;opacity:.3}
  #root .pf-mk{animation:none}
}

/* ── screen ── */
#root .pf-screen{position:relative;display:flex;flex-direction:column;width:100%;max-width:100vw;min-width:0;height:calc(100dvh - var(--pf-top));min-height:400px;overflow:hidden;overflow:clip;touch-action:manipulation;background:var(--surface);color:var(--ink);font-size:16px;line-height:1.5;text-align:start}
#root .pf-screen button{font-family:inherit;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#root .pf-figcol{flex:none;min-width:0}
#root .pf-work{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}

/* ── head ── */
#root .pf-head{flex:none;display:flex;align-items:center;gap:8px;height:44px;padding-inline:4px 14px}
#root .pf-back{flex:none;display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:50%;background:transparent;box-shadow:none;color:var(--ink-2);font-size:20px}
#root .pf-head-t{flex:0 1 auto;min-width:0;font-size:1rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#root .pf-pill{flex:none;padding:2px 9px;border-radius:999px;background:var(--a-50);color:var(--a-800);font-size:.78rem;font-weight:600;line-height:1.5}
#root .pf-dots{flex:none;display:flex;gap:5px;margin-inline-start:auto}
#root .pf-dots i{display:block;width:9px;height:9px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--line-strong)}
#root .pf-dots i.is-on{background:var(--a-500);box-shadow:none}
#root .pf-dots i.is-off{background:var(--line-strong);box-shadow:none}

/* ── strip ── */
#root .pf-strip{flex:none;min-width:0;max-width:100%;display:flex;flex-wrap:wrap;align-items:center;column-gap:12px;padding:3px 14px;border-bottom:1px solid var(--line);font-size:.84rem;color:var(--ink-3)}
#root .pf-strip-given{flex:1 1 auto;min-width:0;max-width:100%;display:flex;align-items:center;gap:6px;height:30px;overflow-x:auto;overscroll-behavior-x:contain;white-space:nowrap;scrollbar-width:none}
#root .pf-strip-given::-webkit-scrollbar{display:none}
#root .pf-strip-goal{flex:none;display:flex;align-items:center;gap:6px;height:30px}
#root .pf-strip-k{flex:none;font-weight:600}
#root .pf-fc{flex:none;display:inline-flex;align-items:center;gap:5px;height:26px;padding-inline:10px;border-radius:999px;border:1.5px solid transparent;background:var(--surface-3);color:var(--ink);font-size:.88rem}
#root .pf-fc .pf-ic{font-size:13px}
#root .pf-fc.is-used{color:var(--ink-2)}
#root .pf-fc.is-used .pf-ic{color:var(--ok-600)}
#root .pf-fc.is-now{border-color:var(--a-500);background:var(--a-50);color:var(--a-900)}
#root .pf-fc-note{font-size:.78rem;color:var(--ink-3)}
#root .pf-lk{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px;font-weight:700}
#root .pf-askst .pf-slot{width:1.9em;vertical-align:-.3em}
#root .pf-ask-sent{flex:0 0 100%;min-width:0;padding:4px 10px;border-radius:10px;background:var(--a-50);color:var(--a-900);font-size:.95rem;line-height:1.45}
#root .pf-fc-goal{background:var(--a-50);border:1.5px dashed var(--a-300);color:var(--a-800)}
#root .pf-fc-goal.is-done{background:var(--ok-50);border:1.5px solid var(--ok-500);color:var(--ok-800)}

/* ── rows ── */
#root .pf-rows{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:6px 14px 8px}
#root .pf-intro{padding-block:2px 4px;font-size:.9rem;line-height:1.5;color:var(--ink-2)}
#root .pf-plan{width:fit-content;margin-block:2px 4px;padding:3px 10px;border-radius:999px;background:var(--a-50);color:var(--a-800);font-size:.84rem;font-weight:500}
#root .pf-rowlist{list-style:none;margin:0;padding:0}
#root .pf-row{border-bottom:1px solid var(--line);transition:background-color .3s ease}
#root .pf-row.is-new{animation:pf-row .2s var(--ease-out) backwards}
#root .pf-row.is-lead{background:var(--a-50)}
#root .pf-row-b{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:4px 2px;border:0;border-radius:0;background:transparent;box-shadow:none;color:var(--ink);text-align:start}
#root .pf-row-n{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--ok-50);color:var(--ok-700);box-shadow:inset 0 0 0 1.5px var(--ok-500);font-size:.76rem;font-weight:700;font-variant-numeric:tabular-nums}
#root .pf-row-st{flex:none;font-size:1.02rem}
#root .pf-row-r{flex:1;min-width:0;font-size:.84rem;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#root .pf-row-g{flex:none;display:flex;align-items:center;gap:4px}
#root .pf-row-ok{color:var(--ok-600);font-size:16px}
#root .pf-row-full{padding:0 32px 8px;font-size:.88rem;color:var(--ink-2)}
#root .pf-row-full b{font-weight:600;color:var(--ink)}
#root .pf-swap{flex:none;display:grid;place-items:center;width:40px;height:40px;margin-inline-start:auto;border:0;border-radius:50%;background:transparent;box-shadow:none;color:var(--ink-3);font-size:18px}
#root .pf-swap + .pf-dots{margin-inline-start:0}
@keyframes pf-row{from{opacity:0;transform:translateY(8px)}}

/* ── tray ── */
#root .pf-tray{flex:none;display:flex;flex-direction:column;gap:8px;min-height:120px;max-height:40dvh;overflow-y:auto;overscroll-behavior:contain;padding:10px 14px max(12px,env(safe-area-inset-bottom,0px));background:var(--surface-2);border-top:1px solid var(--line);box-shadow:0 -14px 28px -22px rgb(28 27 25 / .25)}
#root .pf-step,#root .pf-fbc{margin:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none;animation:none}
#root .pf-ask{display:flex;align-items:center;gap:8px;min-height:44px}
#root .pf-ask-t{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:baseline;column-gap:8px;line-height:1.35}
#root .pf-ask-k{font-size:.78rem;font-weight:700;color:var(--a-700)}
#root .pf-ask-st{font-size:1.16rem}
#root .pf-ask-r{font-size:.9rem;color:var(--ink-2)}
#root .pf-ask-q{flex:0 0 100%;font-size:.95rem;color:var(--ink-2)}
#root .pf-ask-k + .pf-ask-q,#root .pf-ask-q:first-child{flex:1 1 auto;color:var(--ink);font-weight:500;font-size:1rem}
#root .pf-ask-e{flex:none;display:flex;align-items:center;gap:6px}
#root .pf-hintb{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:6px;min-height:40px;padding-inline:11px;border:0;border-radius:12px;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-strong);color:var(--ink-2);font-size:.88rem;font-weight:600;white-space:nowrap}
#root .pf-hintb > *{position:relative;z-index:1}
#root .pf-hintb .pf-ic{font-size:17px;color:var(--a-600)}
#root .pf-hintb:disabled{color:var(--ink-3)}
#root .pf-hintb .pf-hintb-fill{position:absolute;inset:0;z-index:0;background:var(--a-100);transform-origin:right;animation:pf-fill 4s linear both}
#root .pf-hintb.is-nudge{animation:pf-nudge .9s var(--ease-out) 1}
#root .pf-rungs{display:inline-flex;gap:3px}
#root .pf-rungs i{display:block;width:5px;height:5px;border-radius:50%;background:var(--line-strong)}
#root .pf-rungs i.is-on{background:var(--a-500)}
#root .pf-ask-e .pf-x span{display:none}
#root .pf-x{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:40px;min-height:40px;padding-inline:8px;border:0;background:transparent;box-shadow:none;color:var(--ink-3);font-size:.86rem;font-weight:500}
#root .pf-x .pf-ic{font-size:15px}
#root .pf-hint{margin-top:4px;padding-inline-start:10px;border-inline-start:3px solid var(--a-300);font-size:.92rem;line-height:1.45;color:var(--ink-2);animation:pf-row .25s var(--ease-out) backwards}
#root .pf-why{padding-inline-start:10px;border-inline-start:3px solid var(--ok-200);font-size:.9rem;line-height:1.45;color:var(--ink-2);animation:pf-row .25s var(--ease-out) backwards}
@keyframes pf-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pf-nudge{0%,100%{transform:none}30%{transform:scale(1.09)}60%{transform:scale(.98)}}

/* ── chips ── */
#root .pf-chips{display:grid;gap:8px;margin-top:8px}
#root .pf-cols-1{grid-template-columns:minmax(0,1fr)}
#root .pf-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
#root .pf-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
#root .pf-chip.is-wide{grid-column:1 / -1}
#root .pf-chip{display:flex;align-items:center;justify-content:center;min-height:44px;margin:0;padding:6px 10px;border:1.5px solid var(--line-strong);border-radius:12px;background:var(--surface);box-shadow:none;color:var(--ink);font-size:.92rem;font-weight:500;line-height:1.25;text-align:center}
#root .pf-chip:disabled{opacity:.4;text-decoration:line-through}
#root .pf-chip.is-dim{opacity:.4}
#root .pf-chip.is-yes{opacity:1;border-color:var(--ok-500);background:var(--ok-50);color:var(--ok-800);text-decoration:none}
#root .pf-tile{font-size:1.04rem;box-shadow:0 2px 0 var(--line-strong)}
#root .pf-go-row{display:flex;gap:8px;margin-top:8px}
#root .pf-go{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding-inline:22px;border:0;border-radius:999px;background:var(--pf-btn);box-shadow:var(--sh-accent);color:#fff;font-size:1rem;font-weight:700}
#root .pf-go.is-soft{background:var(--a-50);box-shadow:inset 0 0 0 1.5px var(--a-300);color:var(--a-800)}
#root .pf-go.is-quiet{flex:0 0 auto;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-strong);color:var(--ink-2);font-weight:600}
#root .pf-go:disabled{opacity:.6}
#root .pf-go .pf-ic{font-size:18px}
#root .pf-qed{min-height:52px;font-size:1.2rem}

/* ── fb ── */
#root .pf-fb{display:flex;align-items:flex-start;gap:8px;width:100%;max-width:none;margin:0;padding:7px 12px;border-radius:12px;font-size:.92rem;font-weight:500;line-height:1.45;text-align:start}
#root .fb.pf-fb{padding-inline-start:40px}
#root .fb.pf-fb::before{top:8px;inset-inline-start:12px}
#root .pf-note.pf-fb{border:1px solid transparent;background:var(--surface-3);color:var(--ink);animation:pf-row .2s var(--ease-out) backwards}
#root .pf-note.pf-fb.is-ok{border-color:var(--ok-200);background:var(--ok-50);color:var(--ok-800)}
#root .pf-note.pf-fb .pf-ic{margin-top:2px;font-size:18px;color:var(--ink-3)}
#root .pf-note.pf-fb.is-ok .pf-ic{color:var(--ok-600)}

/* ── tap ── */
#root .pf-fig.is-tap .pf-sg{stroke-width:2.2}
#root .pf-tap{display:flex;flex-direction:column;gap:8px;margin-top:4px}
#root .pf-tap-q{font-size:.95rem;font-weight:500;color:var(--ink)}
#root .pf-prev{display:flex;align-items:center;gap:10px;min-height:48px;padding:6px 8px 6px 12px;border-radius:14px;background:var(--a-50);box-shadow:inset 0 0 0 1.5px var(--a-300);animation:pf-row .2s var(--ease-out) backwards}
#root .pf-prev-st{flex:1;min-width:0;font-size:1.14rem;color:var(--a-900);text-align:left}
#root .pf-prev-eq{margin-inline:.25em;color:var(--a-700)}
#root .pf-slot{display:inline-block;width:1.15em;height:1.3em;margin-inline:1px;vertical-align:-.28em;border-radius:6px;border:1.5px dashed var(--a-300);background:var(--surface);font-style:normal;text-align:center;line-height:1.25em}
#root .pf-slot.is-wide{width:2.4em}
#root .pf-slot.is-next{border-color:var(--a-600)}
#root .pf-slot.is-set{width:auto;min-width:.7em;height:auto;margin:0;border:0;background:transparent;vertical-align:baseline;line-height:inherit}
#root .pf-add{flex:none;width:max-content;min-height:44px;padding-inline:16px;font-size:.95rem;white-space:nowrap}
#root .pf-self{gap:10px;justify-content:flex-start;padding-inline:12px;font-size:.88rem;color:var(--ink-2)}
#root .pf-self .pf-m{font-size:1.02rem;color:var(--ink)}
#root .pf-vert{font-size:1.1rem;font-weight:600}
#root .pf-tap-foot{display:flex;align-items:center;justify-content:space-between;gap:8px}
#root .pf-listb{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding-inline:10px;border:0;border-radius:12px;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-strong);color:var(--ink-2);font-size:.86rem;font-weight:600}
#root .pf-listb.is-open{background:var(--surface-3)}
#root .pf-listb .pf-ic{font-size:17px}
#root .pf-parts{display:flex;flex-direction:column;gap:8px}
#root .pf-parts-t{display:block;margin-bottom:4px;font-size:.78rem;font-weight:600;color:var(--ink-3)}
#root .pf-parts-c{display:flex;flex-wrap:wrap;gap:6px}
#root .pf-partc{min-width:64px;padding-inline:12px;font-size:.98rem}
#root .pf-partc.is-on{border-color:var(--a-600);background:var(--a-50);color:var(--a-900)}
#root .pf-group-h{display:flex;align-items:center;justify-content:space-between;margin-top:2px}
#root .pf-group-t{font-size:.84rem;font-weight:700;color:var(--a-800)}
#root .pf-groupin .pf-chips{margin-top:2px}

/* ── end ── */
#root .pf-screen.is-ended .pf-strip{display:none}
#root .pf-end-card{flex:1;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--line);background:var(--surface-2);animation:pf-row .3s var(--ease-out) backwards}
#root .pf-end-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px 14px 14px}
#root .pf-end-top{display:flex;flex-direction:column;gap:8px;min-height:58px}
#root .pf-end{display:flex;align-items:center;gap:10px;margin:0;padding:11px 14px;border-radius:16px;font-size:1.12rem;font-weight:700;line-height:1.35;text-align:start}
#root .pf-end.is-helped{align-items:flex-start;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:.95rem;font-weight:500;line-height:1.5}
#root .pf-end-seal{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--ok-600);color:#fff;font-size:17px}
#root .pf-end.is-helped .pf-end-seal{margin-top:1px;background:var(--surface-3);color:var(--ink-2)}
#root .pf-end-stats{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding-inline:2px;font-size:.9rem;color:var(--ink-2)}
#root .pf-dots.is-big{margin:0;gap:6px}
#root .pf-dots.is-big i{width:12px;height:12px}
#root .pf-end-sep{width:1px;height:14px;background:var(--line-strong)}
#root .pf-end-line{padding-inline:2px;font-size:.9rem;color:var(--ink-2)}
#root .pf-lvup{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:16px;background:var(--a-50);box-shadow:inset 0 0 0 1.5px var(--a-200);color:var(--a-900);font-size:1rem;font-weight:700;line-height:1.35}
#root .pf-ladder{flex:none;display:flex;align-items:flex-end;gap:4px;height:34px;direction:rtl}
#root .pf-ladder i{display:block;width:9px;border-radius:3px;background:var(--a-200)}
#root .pf-ladder i.is-on{background:var(--a-500)}
#root .pf-ladder i.is-new{background:var(--a-600);transform-origin:center bottom;animation:pf-grow .6s .35s var(--ease-out) backwards}
#root .pf-page{margin-top:14px}
#root .pf-page-h{display:flex;align-items:center;gap:6px;margin:0 0 6px;font-size:.84rem;font-weight:600;color:var(--ink-3)}
#root .pf-page-h .pf-ic{font-size:17px}
#root .pf-page-in{padding:12px 14px 14px;border-radius:14px;border:1px solid var(--line);border-inline-start:3px solid color-mix(in srgb,var(--bad-500) 45%,transparent);background:var(--surface);box-shadow:var(--sh-1)}
#root .pf-page-l{font-size:.95rem;line-height:1.7;color:var(--ink)}
#root .pf-page-l b{font-weight:700}
#root .pf-table{width:100%;margin-top:8px;border-collapse:collapse;font-size:.92rem;line-height:1.4}
#root .pf-table th{padding:5px 6px;border-bottom:1.5px solid var(--ink);font-size:.82rem;font-weight:700;text-align:start;color:var(--ink)}
#root .pf-table td{padding:7px 6px;border-bottom:1px solid var(--line);vertical-align:top;text-align:start;color:var(--ink)}
#root .pf-table th:first-child,#root .pf-table td:first-child{width:52%;border-inline-end:1px solid var(--line);white-space:nowrap}
#root .pf-table td + td{color:var(--ink-2)}
#root .pf-table-n{display:inline-block;min-width:1.3em;color:var(--ink-3);font-variant-numeric:tabular-nums}
#root .pf-table .pf-table-qed td{width:auto;border:0;padding-top:9px;text-align:end;font-weight:800;color:var(--ink)}
#root .pf-end-btns{flex:none;display:flex;gap:8px;padding:10px 14px max(12px,env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);background:var(--surface-2)}
@keyframes pf-grow{from{transform:scaleY(.2);opacity:.4}}

/* ── team ── */
#root .pf-team{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 8px;max-width:var(--page-w);margin:6px auto 0;padding:6px 12px;border:1px dashed var(--line-strong);border-radius:14px;background:var(--surface-2);font-size:.78rem;line-height:1.45;color:var(--ink-2)}
#root .pf-topic > .hdr{padding:14px 16px 6px;gap:8px}
#root .pf-topic > .hdr h1{font-size:1.25rem}
#root .pf-topic > .pf-ch{margin-top:2px}
#root .pf-ch > .sub-tabs{margin:4px 0 10px}
#root .pf-team-t{font-size:.76rem;font-weight:700;color:var(--ink-3)}
#root .pf-topic > .pf-team{width:calc(100% - 32px)}

/* ── landing ── */
#root .pf-in-proof > .pf-team,#root .pf-in-proof > .hdr,#root .pf-ch-open > .sub-tabs{display:none}
#root .pf-in-proof > .pf-ch-open{max-width:none;margin:0;padding:0}
#root .pf-ch .sub-tab:disabled{opacity:.45}
#root .pf-locked{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:-4px;font-size:.82rem;color:var(--ink-3)}
#root .pf-locked .pf-ic{font-size:14px}
#root .pf-land{margin-top:12px;text-align:center}
#root .pf-land-h{margin-top:0;font-size:clamp(1.9rem,8.6vw,2.7rem);font-weight:800;line-height:1.1;color:var(--ink)}
#root .pf-land-a{max-width:30ch;margin:8px auto 0;font-size:1.02rem;line-height:1.55;color:var(--ink-2);text-wrap:balance}
#root .pf-land-fig{height:clamp(170px,30dvh,250px);margin-top:10px}
#root .pf-steps{list-style:none;display:flex;align-items:flex-end;justify-content:center;gap:10px;margin:14px 0 0;padding:0 0 22px;direction:rtl}
#root .pf-st{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;width:64px}
#root .pf-st-bar{display:grid;place-items:center;width:100%;border-radius:8px 8px 3px 3px;background:var(--surface-3);box-shadow:inset 0 0 0 1.5px var(--line);color:#fff;font-size:14px}
#root .pf-st.is-done .pf-st-bar{background:var(--a-500);box-shadow:none}
#root .pf-st.is-here .pf-st-bar{background:var(--a-100);box-shadow:inset 0 0 0 2px var(--a-500)}
#root .pf-st-n{font-size:.84rem;font-weight:600;color:var(--ink-3)}
#root .pf-st.is-done .pf-st-n,#root .pf-st.is-here .pf-st-n{color:var(--ink)}
#root .pf-st-here{position:absolute;top:100%;margin-top:3px;white-space:nowrap;font-size:.74rem;font-weight:700;color:var(--a-700)}
#root .pf-land-stats{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 10px;margin-top:6px;font-size:.9rem;color:var(--ink-2)}
#root .pf-land-go{position:sticky;bottom:0;display:flex;margin:18px -16px 0;padding:12px 16px max(14px,env(safe-area-inset-bottom,0px));background:linear-gradient(to top,var(--bg) 62%,transparent)}
#root .pf-land-go .pf-go{min-height:54px;font-size:1.08rem}
#root .pf-ch:not(.pf-ch-open){padding-bottom:0}

/* ── rescue ── */
#root .pf-rescue{display:flex;flex-direction:column;gap:10px;max-width:440px;margin:26px auto 0;padding:22px 20px;border-radius:22px;background:var(--surface);box-shadow:var(--sh-2);text-align:center}
#root .pf-rescue-k{font-size:.84rem;font-weight:700;color:var(--a-700)}
#root .pf-rescue-t{font-size:1.2rem;font-weight:700;line-height:1.45;color:var(--ink);text-wrap:balance}
#root .pf-rescue-b{display:flex;flex-direction:column;gap:8px;margin-top:6px}
#root .pf-rescue-b .pf-go{flex:none;width:100%}

/* ── wide screens and phones on their side: the drawing beside the rows ── */
@media (min-width:900px),(orientation:landscape) and (max-height:500px){
  #root .pf-screen{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);column-gap:20px;max-width:1120px;margin-inline:auto;padding-inline:16px;background:transparent}
  #root .pf-head{grid-column:1 / -1}
  #root .pf-figcol{align-self:center}
  #root .pf-stage{height:min(62dvh,480px)}
  #root .pf-work{margin-bottom:16px;overflow:hidden;border:1px solid var(--line);border-radius:20px;background:var(--surface);box-shadow:var(--sh-2)}
  #root .pf-tray{max-height:52dvh}
}
/* short phones (an iPhone SE in Safari shows about 550px): one-line strip with the goal first, a lower drawing */
@media (max-height:600px) and (max-width:899px) and (orientation:portrait){
  #root .pf-head{height:40px}
  #root .pf-stage{height:150px}
  #root .pf-strip{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-block:2px}
  #root .pf-strip::-webkit-scrollbar{display:none}
  #root .pf-strip-goal{order:-1}
  #root .pf-strip-given{flex:0 0 auto;max-width:none;overflow:visible}
  #root .pf-strip-goal{position:sticky;inset-inline-start:0;z-index:1;padding-inline-end:8px;background:var(--surface)}
  #root .pf-intro{font-size:.84rem}
}
@media (prefers-reduced-motion: reduce){
  #root .pf-row.is-new,#root .pf-hint,#root .pf-why,#root .pf-hintb.is-nudge{animation:none}
}
`;
export default css;
