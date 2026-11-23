/* Family N "לא מקביל" (spec 2026-11-23 §7.4): △ABC, D on AB, E on AC, given ∢AED = ∢ABC (DE is NOT parallel
   to BC, and stays 18° or more away from parallel). △ADE ∼ △ACB: A ↔ A, D ↔ C, E ↔ B — the trap: D matches C, not B. ∢A is common. Crossed: לבד and the
   exam only. The ratio keeps clear of 2. Numbers (opts.ask): DE, BC, AD or AE; a whole side (AB, AC) is given by
   its two pieces. */
import { place, nameMap } from './kit.js';
import { assembleSim, honestSim, lengths, triangle, shrink, K_FAR2 } from './sim-kit.js';
import { sub, unit } from '../../new/chapters/geometry/geo.js';

const ROLES = ['A', 'B', 'C', 'D', 'E'];
const T1 = ['A', 'D', 'E'], T2 = ['A', 'C', 'B'];
const ASKS = ['DE', 'BC', 'AD', 'AE'];
const DIRECT = {
  a0: { reasons: ['common-angle'], role: 'common' },
  a2: { reasons: ['given'], role: 'given' },
};
const ROOM = 0.8;          // D and E stay inside their sides, with a piece left beyond them
const NOT_PAR = 18;        // DE stays at least 18° away from parallel to BC: the trap must not look like family P
/** The angle between the lines PQ and RS in degrees (0–90). */
const lineAngle = (P, Q, R, S) => { const u = unit(sub(Q, P)), v = unit(sub(S, R)); return Math.asin(Math.min(1, Math.abs(u[0] * v[1] - u[1] * v[0]))) * 180 / Math.PI; };

function draw(R, variant, opts) {
  const ratio = R.pick(K_FAR2), k = ratio.p / ratio.q;
  // big sides in the order of T2 = [A, C, B]: CB, AB (opposite C), AC (opposite B)
  const sides = lengths(R, ratio, { ok: (n) => n[2] / k <= ROOM * n[1] && n[1] / k <= ROOM * n[2] });
  if (!sides) return null;
  const [A, C, B] = triangle(sides.big), ab = sides.big[1], ac = sides.big[2], s = Math.max(...sides.big);
  const D = [B[0] * (ac / k) / ab, B[1] * (ac / k) / ab], E = [C[0] * (ab / k) / ac, C[1] * (ab / k) / ac];
  if (lineAngle(D, E, B, C) < NOT_PAR) return null;
  const pts = place(shrink({ A, B, C, D, E }, s), R);
  const figure = {
    points: pts, scale: s,
    lines: [['A', 'D', 'B'], ['A', 'E', 'C'], ['D', 'E'], ['B', 'C']],
    segs: ['AD', 'DB', 'AB', 'AE', 'EC', 'AC', 'DE', 'BC'],
    motion: { kind: 'similarity' },
  };
  const ask = opts.ask === true ? R.pick(ASKS) : opts.ask || null;
  return assembleSim({
    family: 'N', variant, crossed: true, figure, t1: T1, t2: T2, ratio, par: null, direct: DIRECT,
    premises: ['a2', 'a0'], given: ['a2'], givenRows: [{ facts: ['a2'], form: 'eq' }],
    text: { key: 'tx.P', vars: { t: '△ABC', d: 'D', s1: 'AB', e: 'E', s2: 'AC' } },
    ask, asks: ASKS, names: nameMap(ROLES, R, opts),
  }, R);
}

export default {
  id: 'N', roles: ROLES, asks: ASKS,
  variants: { 'N-CG': { theorem: 'aa', crossed: true } },
  build(R, variantId, opts = {}) { if (variantId !== 'N-CG') throw new Error(`N: no variant ${variantId}`); return honestSim((r) => draw(r, variantId, opts), R); },
};
