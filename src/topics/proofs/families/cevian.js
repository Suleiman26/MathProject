/* The type-1 triangle ("קוראים את הנתון", spec §6.5): an acute triangle ABC, clearly not isosceles,
   with two lines from two of its vertices. Each line has a word (bisector / median / altitude /
   midpoint); `gives` is what the word means, `others` what the other two words would give for the
   same line (the wrong tiles of type 1), each visibly false (≥ 8% / ≥ 6°).
   build(R, { lines:[{ word, from:0|1|2, draw? }, …], names? }) → { figure, lines:{ AD:{ word, gives, others, from, foot, side, drawn } } }
   The first line's foot is D, the second's E. */
import { triFromAngles, dist, sub, add, mul, dot } from '../../new/chapters/geometry/geo.js';
import { place, rename, lies, S, Ang, G } from './kit.js';
import { measure } from '../core.js';

const V = ['A', 'B', 'C'], FEET = ['D', 'E'];
const SIDE = { A: ['B', 'C'], B: ['A', 'C'], C: ['A', 'B'] };
const statementOf = (word, v, f, [p, q]) => {
  if (word === 'bisector') return G(Ang(v, [p, f]), Ang(v, [f, q]));
  if (word === 'altitude') return G(Ang(f, [v, p]), Ang(f, [v, q]), { right: true });
  return S(p + f, f + q);                                    // median, midpoint
};
const KINDS = ['bisector', 'median', 'altitude'];

/** One unchecked drawing (exported for debugging the rejection rate). */
export function _draw(R, spec) {
  let a, b, c;
  const iso = (x, y) => Math.abs(Math.sin(x * Math.PI / 180) - Math.sin(y * Math.PI / 180)) / Math.max(Math.sin(x * Math.PI / 180), Math.sin(y * Math.PI / 180)) < 0.1;
  do { a = R.int(40, 80); b = R.int(36, 80); c = 180 - a - b; }
  while (c < 36 || c > 80 || Math.abs(a - b) < 8 || Math.abs(b - c) < 8 || Math.abs(a - c) < 8 || iso(a, b) || iso(b, c) || iso(a, c));
  const [B, C, A] = triFromAngles([b, c, a], 1);
  const P = { A, B, C };
  const lines = {}, lineSets = [], segs = ['AB', 'BC', 'CA'].map((s) => s), angles = [];
  const footed = {};
  spec.lines.forEach((ln, i) => {
    const v = V[ln.from], [p, q] = SIDE[v], f = FEET[i], PV = P[v], PP = P[p], PQ = P[q];
    let F;
    if (ln.word === 'bisector') { const k = dist(PV, PP) / (dist(PV, PP) + dist(PV, PQ)); F = add(PP, mul(sub(PQ, PP), k)); }
    else if (ln.word === 'altitude') { const d = sub(PQ, PP), t = dot(sub(PV, PP), d) / dot(d, d); F = add(PP, mul(d, t)); }
    else F = mul(add(PP, PQ), 0.5);
    P[f] = F;
    footed[p + q] = f;
    lineSets.push([p, f, q]);
    const gives = statementOf(ln.word, v, f, [p, q]);
    const main = ln.word === 'midpoint' ? 'median' : ln.word;
    // { draw:false } (only for 'midpoint'): the point is named, no line is drawn, so the other words have nothing to say
    const drawn = !(ln.draw === false && ln.word === 'midpoint');
    const others = drawn ? KINDS.filter((k) => k !== main).map((k) => statementOf(k, v, f, [p, q])) : [];
    lines[v + f] = { word: ln.word, gives, others, from: v, foot: f, side: p + q, drawn };
    for (const st of [gives, ...others]) if (st.kind === 'ang') angles.push(st.x, st.y);
  });
  // sides cut by a foot are drawn as their two pieces (tappable: the statements use them); the
  // other sides and the lines themselves are drawn only
  const drawn = [], plain = [];
  for (const s of segs) {
    const f = footed[s] || footed[s[1] + s[0]];
    if (f) drawn.push(s[0] + f, f + s[1]); else plain.push(s);
  }
  for (const l of Object.values(lines)) if (l.drawn) plain.push(l.from + l.foot);
  const seen = new Set(), uniq = angles.filter((g) => { const k = `${g.v}${[...g.r].sort().join('')}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const figure = { points: place(P, R), lines: lineSets, segs: drawn, plain, angles: uniq, tris: [['A', 'B', 'C']], motion: null };
  return { figure, lines };
}

/* visibly false: the other words' statements differ by ≥ 8% (lengths) or ≥ 12° (two angles, so each
   is ≥ 6° away from the other / from 90°) */
function clearlyFalse(fig, st) {
  const a = measure(fig, st.x), b = measure(fig, st.y);
  if (st.kind === 'seg') return Math.abs(a - b) / Math.max(a, b) >= 0.08;
  if (st.right) return Math.abs(a - 90) >= 6 && Math.abs(b - 90) >= 6;
  return Math.abs(a - b) >= 6;
}

export function build(R, spec) {
  for (let i = 0; i < 3000; i++) {
    const c = _draw(R, spec), fig = c.figure;
    if (!Object.values(c.lines).every((l) => l.others.every((o) => clearlyFalse(fig, o)))) continue;
    const facts = Object.fromEntries(Object.values(c.lines).map((l, k) => [`f${k}`, l.gives]));
    if (lies({ figure: fig, facts }, { quick: true }).length) continue;
    if (!spec.names) return c;
    const map = Object.fromEntries(['A', 'B', 'C', 'D', 'E'].map((r, k) => [r, spec.names[k]]));
    const base = rename({ figure: fig, facts: { ...Object.fromEntries(Object.entries(c.lines).map(([k, l]) => [k, l])) }, givenText: [], text: [] }, map);
    const ch = (s) => s.replace(/[A-Z]/g, (x) => map[x] || x);
    return { figure: base.figure, lines: Object.fromEntries(Object.entries(base.facts).map(([k, l]) => [ch(k), l])) };
  }
  throw new Error('cevian: no honest triangle in 3000 tries');
}
