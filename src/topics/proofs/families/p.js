/* Family P "פירמידה" (spec 2026-11-23 §7.4): △ABC, D on AB, E on AC, DE ∥ BC (given). △ADE ∼ △ABC.
   ∢A is common; ∢ADE = ∢ABC and ∢AED = ∢ACB are corresponding angles between the parallels.
   Variants: P-CC (common + corresponding), P-CC2 (corresponding + corresponding). The parallel given is the
   first row. Numbers (opts.ask): only DE or BC is asked (AB and AC carry a point, so their lengths are given by
   their pieces AD, DB / AE, EC). */
import { place, nameMap } from './kit.js';
import { assembleSim, honestSim, lengths, triangle, shrink, K_ALL } from './sim-kit.js';

const ROLES = ['A', 'B', 'C', 'D', 'E'];
const T1 = ['A', 'D', 'E'], T2 = ['A', 'B', 'C'];
const ASKS = ['DE', 'BC'];
const VARIANTS = {
  'P-CC': { crossed: false, premises: (R) => ['a0', R.pick(['a1', 'a2'])] },
  'P-CC2': { crossed: false, premises: () => ['a1', 'a2'] },
};
const DIRECT = {
  a0: { reasons: ['common-angle'], role: 'common' },
  a1: { reasons: ['corresponding'], needs: ['par'], role: 'parallel' },
  a2: { reasons: ['corresponding'], needs: ['par'], role: 'parallel' },
};

function draw(R, variant, opts) {
  const ratio = R.pick(K_ALL), sides = lengths(R, ratio);
  if (!sides) return null;
  const [A, B, C] = triangle(sides.big), r = ratio.q / ratio.p, s = Math.max(...sides.big);
  const pts = place(shrink({ A, B, C, D: [B[0] * r, B[1] * r], E: [C[0] * r, C[1] * r] }, s), R);
  const figure = {
    points: pts, scale: s,
    lines: [['A', 'D', 'B'], ['A', 'E', 'C'], ['D', 'E'], ['B', 'C']],
    segs: ['AD', 'DB', 'AB', 'AE', 'EC', 'AC', 'DE', 'BC'],
    motion: { kind: 'similarity' },
  };
  const ask = opts.ask === true ? R.pick(ASKS) : opts.ask || null;
  return assembleSim({
    family: 'P', variant, crossed: false, figure, t1: T1, t2: T2, ratio, par: { x: 'DE', y: 'BC' }, direct: DIRECT,
    premises: VARIANTS[variant].premises(R), given: ['par'], givenRows: [{ facts: ['par'], form: 'eq' }],
    text: { key: 'tx.P', vars: { t: '△ABC', d: 'D', s1: 'AB', e: 'E', s2: 'AC' } },
    ask, asks: ASKS, names: nameMap(ROLES, R, opts),
  }, R);
}

export default {
  id: 'P', roles: ROLES, asks: ASKS,
  variants: { 'P-CC': { theorem: 'aa', crossed: false }, 'P-CC2': { theorem: 'aa', crossed: false } },
  build(R, variantId, opts = {}) { if (!VARIANTS[variantId]) throw new Error(`P: no variant ${variantId}`); return honestSim((r) => draw(r, variantId, opts), R); },
};
