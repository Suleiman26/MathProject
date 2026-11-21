'use client';
/* The proofs section: maths as left-to-right islands inside Hebrew text, with ∢ △ ≅ ↔ drawn as
   small inline SVGs (Rubik has no such glyphs; spec §11 "Signs"). Each sign has a Hebrew name for
   screen readers. Also the small line icons the screens share (never an emoji, never a "✓" char). */
import React from 'react';
import { tx, fill } from './texts.js';
import { show, say, showPart } from './core.js';

const SIGNS = {
  '∢': 'angle', '△': 'tri', '≅': 'cong', '↔': 'match',
};
const NAMES = { angle: 'זווית', tri: 'משולש', cong: 'חופף ל', match: 'מתאים ל' };
/* drawn on a 20 × 14 grid: the cap height of the letters beside them */
const PATHS = {
  angle: <><path d="M16.5 2.2L3.5 12.3h14" /><path d="M9.6 12.3a7.4 7.4 0 0 0-1.7-3.4" /></>,
  tri: <path d="M10 1.9l7.3 10.6H2.7z" />,
  cong: <><path d="M3 4.3c2.3-2.4 4.6-2.4 7 0s4.7 2.4 7 0" /><path d="M3 8.4h14M3 12.2h14" /></>,
  match: <><path d="M2.6 7h14.8" /><path d="M6.3 3.2L2.5 7l3.8 3.8M13.7 3.2L17.5 7l-3.8 3.8" /></>,
};

/** One sign: `name` ∈ 'angle' | 'tri' | 'cong' | 'match'. */
export function Sign({ name, quiet }) {
  return (
    <svg className={`pf-sign pf-sign-${name}`} viewBox="0 0 20 14" role={quiet ? undefined : 'img'} aria-label={quiet ? undefined : NAMES[name]} aria-hidden={quiet ? 'true' : undefined} focusable="false">
      {PATHS[name]}
    </svg>
  );
}

/* a maths string ("∢AOC = ∢BOD", "A ↔ B") as text pieces and signs */
function pieces(s) {
  const out = []; let buf = '';
  for (const ch of String(s)) {
    if (SIGNS[ch]) { if (buf) out.push(buf); buf = ''; out.push({ sign: SIGNS[ch] }); } else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}
/** A maths island: left to right, never broken, signs drawn. */
export function Mx({ s, label, className, style }) {
  return (
    <span className={`pf-m${className ? ` ${className}` : ''}`} dir="ltr" aria-label={label || undefined} style={style}>
      {pieces(s).map((p, i) => (typeof p === 'string' ? <span key={i} aria-hidden={label ? 'true' : undefined}>{p}</span> : <Sign key={i} name={p.sign} quiet={!!label} />))}
    </span>
  );
}
/** A statement island, read aloud as a Hebrew sentence. `color` paints it in a pair colour (Level 1). */
export function St({ st, color, className }) {
  return <Mx s={show(st)} label={say(st)} className={className} style={color ? { color } : undefined} />;
}
/** Type 2: an asked part and an empty box for its partner ("AB = ▢"), read as "AB שווה ל…". */
export function Ask({ part, className }) {
  return (
    <span className={`pf-m pf-askst${className ? ` ${className}` : ''}`} dir="ltr" role="img" aria-label={fill('say.ask', { x: showPart(part) })}>
      <span aria-hidden="true"><Mx s={`${showPart(part)} =`} /> <i className="pf-slot" /></span>
    </span>
  );
}
/** A congruence island whose letters at the positions `at` (0–2) carry a pair colour in both
    triangles (type 2, Level 1: position 1 ↔ position 1). Colour is never alone: the letters are underlined too. */
export function CongSt({ st, at = [], color, className }) {
  const [t1, t2] = [st.map.map((m) => m[0]), st.map.map((m) => m[1])];
  const tri = (t) => <><Sign name="tri" quiet />{t.map((q, i) => (at.includes(i) ? <span key={i} className="pf-lk" style={color ? { color } : undefined}>{q}</span> : <span key={i}>{q}</span>))}</>;
  return (
    <span className={`pf-m${className ? ` ${className}` : ''}`} dir="ltr" role="img" aria-label={say(st)}>
      <span aria-hidden="true">{tri(t1)} <Sign name="cong" quiet /> {tri(t2)}</span>
    </span>
  );
}
/** A part's name ("AO", "∢AOC", "△AOC") as an island. */
export function Part({ part }) { return <Mx s={showPart(part)} />; }
/** A keyed text with its islands. */
export function Tx({ k, vars }) {
  return <>{tx(k, vars).map((p, i) => (p.t === 'm' ? <Mx key={i} s={p.v} /> : <React.Fragment key={i}>{p.v}</React.Fragment>))}</>;
}

/* ── line icons (currentColor) ── */
const I = (d, vb = 20, sw = 2) => function Icon({ className }) {
  return <svg className={`pf-ic${className ? ` ${className}` : ''}`} viewBox={`0 0 ${vb} ${vb}`} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{d}</svg>;
};
export const IcCheck = I(<path d="M4.5 10.5l3.6 3.6L15.5 6.5" />, 20, 2.2);
export const IcNote = I(<><path d="M10 9v5" /><circle cx="10" cy="5.9" r=".7" fill="currentColor" /></>, 20, 2.2);
export const IcLock = I(<><rect x="4" y="9" width="12" height="8" rx="2.2" /><path d="M6.8 9V6.7a3.2 3.2 0 016.4 0V9" /></>, 20, 1.8);
export const IcBack = I(<path d="M8 4.5l5.5 5.5L8 15.5" />, 20, 2.2);     // points to the right: "back" in Hebrew
export const IcBulb = I(<><path d="M7.3 13.2a5 5 0 115.4 0c-.5.4-.8.9-.8 1.5H8.1c0-.6-.3-1.1-.8-1.5z" /><path d="M8.3 17.3h3.4" /></>, 20, 1.7);
export const IcList = I(<><path d="M7.5 5.5h9M7.5 10h9M7.5 14.5h9" /><path d="M3.6 5.5h.01M3.6 10h.01M3.6 14.5h.01" strokeWidth="2.6" /></>, 20, 1.8);
export const IcSwap = I(<><path d="M4 7.5h11.5M12.5 4.5l3 3-3 3" /><path d="M16 13H4.5M7.5 10l-3 3 3 3" /></>, 20, 1.8);
export const IcClose = I(<path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />, 20, 2);
export const IcBook = I(<><path d="M4 4.5h5a2 2 0 012 2V16a1.5 1.5 0 00-1.5-1.5H4z" /><path d="M16 4.5h-5a2 2 0 00-2 2V16a1.5 1.5 0 011.5-1.5H16z" /></>, 20, 1.6);
export const IcHand = I(<><circle cx="10" cy="10" r="2.2" fill="currentColor" stroke="none" /><circle cx="10" cy="10" r="6.2" /></>, 20, 1.6);

/** The pair glyph beside a finished row: n ticks or n arcs (or a square) in the pair colour. */
export function Glyph({ mark, kind }) {
  if (!mark) return null;
  const n = Math.max(1, Math.min(3, kind === 'seg' ? mark.ticks || 1 : mark.arcs || 1));
  let d;
  if (kind === 'seg') d = [...Array(n)].map((_, i) => `M${10 + (i - (n - 1) / 2) * 4} 2.5v9`).join('');
  else if (mark.right) d = 'M5 11.5V5h6.5';
  else d = [...Array(n)].map((_, i) => { const r = 5 + i * 3; return `M${10 - r * 0.78} ${12.5 - r * 0.62}A${r} ${r} 0 0 1 ${10 + r * 0.78} ${12.5 - r * 0.62}`; }).join('');
  return <svg className={`pf-gl pf-c${mark.color || 1}`} viewBox="0 0 20 14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={d} /></svg>;
}
