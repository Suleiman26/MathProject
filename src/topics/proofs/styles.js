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
#root .pf-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}

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
#root .pf-sg.is-dim{opacity:.5}
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
#root .pf-mk.is-dim{opacity:.5}
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
`;
export default css;
