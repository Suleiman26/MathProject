/* The proofs section: the checker core. Pure (no React, no window, no Date, no Math.random), so
   `node --test` runs it. Spec §6.2 (statement kinds), §10.1 (problem = figure + fact graph),
   §10.2 (the checker), §7.2–7.4 (what each level presents).

   Parts:      seg 'AO' (two point names, order free) · ang { v:'O', r:['A','C'] } · tri ['A','O','C']
   Statements: { kind:'seg', x, y } | { kind:'ang', x, y, right? } | { kind:'cong', map:[[t1,t2] ×3] }
   A figure:   { points:{A:[x,y]}, lines:[['A','O','B'], …] (collinear sets), segs, angles, tris, motion } */
import { dist, angle, sub, dot } from '../new/chapters/geometry/geo.js';
import { T, fill } from './texts.js';
import { THEOREMS, CP, DEFS, SEEN, REASONS } from './reasons.js';

/* ── keys ─────────────────────────────────────────────────────────────────── */
export const segKey = (seg) => [...seg].sort().join('');
export const triKey = (tri) => [...tri].sort().join('');

/** The ray from v through p, as v + its farthest point: two points on one line of `fig.lines`,
    on the same side of v, give the same key. */
export function rayKey(fig, v, p) {
  const P = fig.points, line = (fig.lines || []).find((l) => l.includes(v) && l.includes(p));
  if (!line || !P[v] || !P[p]) return `${v}>${p}`;
  const d = sub(P[p], P[v]);
  let best = p, far = dist(P[v], P[p]);
  for (const q of line) {
    if (q === v || q === p) continue;
    if (dot(sub(P[q], P[v]), d) > 0 && dist(P[v], P[q]) > far) { best = q; far = dist(P[v], P[q]); }
  }
  return `${v}>${best}`;
}
/** An angle = its vertex + its two rays (unordered). */
export function angKey(fig, ang) {
  const [r1, r2] = ang.r.map((p) => rayKey(fig, ang.v, p).slice(ang.v.length + 1)).sort();
  return `${ang.v}:${r1}${r2}`;
}

/** The kind of a part: 'seg' | 'ang' | 'tri'. */
export const kindOf = (part) => (typeof part === 'string' ? 'seg' : Array.isArray(part) ? 'tri' : 'ang');
/** The parts a statement talks about (a congruence: its two triangles, in map order). */
export function partsOf(st) {
  if (st.kind === 'cong') return [st.map.map((p) => p[0]), st.map.map((p) => p[1])];
  return [st.x, st.y];
}

/** Normal form of a statement (§6.2): equal keys = the same statement. */
export function norm(fig, st) {
  if (st.kind === 'seg') return 'S:' + [segKey(st.x), segKey(st.y)].sort().join('=');
  if (st.kind === 'ang') return 'A:' + [angKey(fig, st.x), angKey(fig, st.y)].sort().join('=');
  if (st.kind === 'cong') return 'C:' + st.map.map((p) => [...p].sort().join('')).sort().join(',');
  throw new Error(`proofs core: unknown statement kind ${st.kind}`);
}

/* ── truth in the coordinates ─────────────────────────────────────────────── */
/** A length, or an angle in degrees. */
export function measure(fig, part) {
  const P = fig.points;
  if (kindOf(part) === 'seg') return dist(P[part[0]], P[part[1]]);
  if (kindOf(part) === 'ang') return angle(P[part.r[0]], P[part.v], P[part.r[1]]);
  throw new Error('proofs core: a triangle has no single measure');
}
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
/** True in the coordinates (relative tolerance). A right-angle statement also needs 90°. */
export function holds(fig, st, tol = 1e-6) {
  if (st.kind === 'seg' || st.kind === 'ang') {
    const a = measure(fig, st.x), b = measure(fig, st.y);
    if (!near(a, b, tol)) return false;
    return !(st.kind === 'ang' && st.right) || (near(a, 90, tol) && near(b, 90, tol));
  }
  const P = fig.points, m = st.map;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    if (!near(dist(P[m[i][0]], P[m[j][0]]), dist(P[m[i][1]], P[m[j][1]]), tol)) return false;
  }
  return true;
}

/* ── words ────────────────────────────────────────────────────────────────── */
const angName = (a) => `∢${a.r[0]}${a.v}${a.r[1]}`;
const triName = (t) => `△${t.join('')}`;
/** The maths line of a statement: 'AO = OB', '∢AOC = ∢BOD', '∢ADB = ∢ADC = 90°', '△AOC ≅ △BOD'. */
export function show(st) {
  if (st.kind === 'seg') return `${st.x} = ${st.y}`;
  if (st.kind === 'ang') return `${angName(st.x)} = ${angName(st.y)}${st.right ? ' = 90°' : ''}`;
  const [t1, t2] = partsOf(st);
  return `${triName(t1)} ≅ ${triName(t2)}`;
}
/** A part's name as maths: 'AO', '∢AOC', '△AOC'. */
export const showPart = (part) => (kindOf(part) === 'seg' ? part : kindOf(part) === 'ang' ? angName(part) : triName(part));
/** The statement as a Hebrew sentence (§11.3), for screen readers. */
export function say(st) {
  if (st.kind === 'seg') return fill('say.seg', { x: st.x, y: st.y });
  if (st.kind === 'ang') {
    const v = { x: angName(st.x).slice(1), y: angName(st.y).slice(1) };
    return fill(st.right ? 'say.angRight' : 'say.ang', v);
  }
  const [t1, t2] = partsOf(st);
  return fill('say.cong', { x: t1.join(''), y: t2.join('') });
}
