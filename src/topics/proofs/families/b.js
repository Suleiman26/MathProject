/* Family B "פרפר" (spec 2026-11-23 §7.4): AB ∥ CD (given), AD and BC cross at O. △AOB ∼ △DOC (the small one
   first). ∢AOB = ∢DOC are vertical angles; ∢OAB = ∢ODC and ∢OBA = ∢OCD are alternate angles between the
   parallels. Variants: B-VA (vertical + alternate), B-AA (alternate + alternate). The parallel given is the first
   row. Every side is a drawn piece, so any side may be asked. */
import { place, nameMap } from './kit.js';
import { assembleSim, honestSim, lengths, triangle, shrink, K_ALL } from './sim-kit.js';

const ROLES = ['A', 'B', 'C', 'D', 'O'];
const T1 = ['A', 'O', 'B'], T2 = ['D', 'O', 'C'];
const ASKS = ['BO', 'AB', 'AO', 'OC', 'CD', 'OD'];
const VARIANTS = {
  'B-VA': { premises: (R) => ['a1', R.pick(['a0', 'a2'])] },
  'B-AA': { premises: () => ['a0', 'a2'] },
};
const DIRECT = {
  a0: { reasons: ['alternate'], needs: ['par'], role: 'parallel' },
  a1: { reasons: ['vertical'], role: 'vertical' },
  a2: { reasons: ['alternate'], needs: ['par'], role: 'parallel' },
};

function draw(R, variant, opts) {
  const ratio = R.pick(K_ALL), sides = lengths(R, ratio);
  if (!sides) return null;
  const k = ratio.p / ratio.q, [A0, O0, B0] = triangle(sides.small);   // side i of △AOB opposite its vertex i
  const A = [A0[0] - O0[0], A0[1] - O0[1]], B = [B0[0] - O0[0], B0[1] - O0[1]], s = Math.max(...sides.big);
  const pts = place(shrink({ A, B, C: [-k * B[0], -k * B[1]], D: [-k * A[0], -k * A[1]], O: [0, 0] }, s), R);
  const figure = {
    points: pts, scale: s,
    lines: [['A', 'O', 'D'], ['B', 'O', 'C'], ['A', 'B'], ['C', 'D']],
    segs: ['AO', 'OD', 'BO', 'OC', 'AB', 'CD'],
    motion: { kind: 'similarity' },
  };
  const ask = opts.ask === true ? R.pick(ASKS) : opts.ask || null;
  return assembleSim({
    family: 'B', variant, crossed: false, figure, t1: T1, t2: T2, ratio, par: { x: 'AB', y: 'CD' }, direct: DIRECT,
    premises: VARIANTS[variant].premises(R), given: ['par'], givenRows: [{ facts: ['par'], form: 'eq' }],
    text: { key: 'tx.X', vars: { s1: 'AD', s2: 'BC', p: 'O' } },
    ask, asks: ASKS, names: nameMap(ROLES, R, opts, true),
  }, R);
}

export default {
  id: 'B', roles: ROLES, asks: ASKS,
  variants: { 'B-VA': { theorem: 'aa', crossed: false }, 'B-AA': { theorem: 'aa', crossed: false } },
  build(R, variantId, opts = {}) { if (!VARIANTS[variantId]) throw new Error(`B: no variant ${variantId}`); return honestSim((r) => draw(r, variantId, opts), R); },
};
