/* Family H "גובה ליתר" (spec 2026-11-23 §7.4): △ABC with ∢ACB = 90°, CD ⊥ AB (D on AB). △ACD ∼ △ABC
   (A ↔ A, C ↔ B, D ↔ C: the matching crosses). ∢A is common; ∢ADC = ∢ACB = 90° is given and accepts both
   "נתון" and "שתי זוויות ישרות". Only this one pair of the three similar triangles is asked. Crossed: לבד and the
   exam only. Numbers (opts.ask): the shared side AC is never asked (it would give x² = …), nor AB (it carries D);
   a length needs BC, so a calculation uses the 3-4-5 triangle (k = 5/3; AB = 12.5 or 25). DB is drawn, not
   tappable (in the 3-4-5 triangle it is 8 next to AC = 7.5). */
import { place, nameMap } from './kit.js';
import { assembleSim, honestSim, shrink } from './sim-kit.js';

const ROLES = ['A', 'B', 'C', 'D'];
const T1 = ['A', 'C', 'D'], T2 = ['A', 'B', 'C'];
const ASKS = ['AD', 'CD', 'BC'];
const K_SHAPE = [[5, 3], [7, 4], [7, 3], [5, 2]].map(([p, q]) => ({ p, q }));   // no length: any of these shapes
const DIRECT = {
  a0: { reasons: ['common-angle'], role: 'common' },
  a2: { reasons: ['given', 'right-angles'], role: 'given', right: true },
};

function draw(R, variant, opts) {
  const ask = opts.ask === true ? R.pick(ASKS) : opts.ask || null;
  const ratio = ask ? { p: 5, q: 3 } : R.pick(K_SHAPE), c = ratio.q / ratio.p;      // cos A = AC/AB = 1/k
  const s = (ratio.p * ratio.p * R.pick([1, 2])) / 2;                               // AB in length units
  const C = [c * c, c * Math.sqrt(1 - c * c)];
  const pts = place(shrink({ A: [0, 0], B: [s, 0], C: [C[0] * s, C[1] * s], D: [c * c * s, 0] }, s), R);
  const figure = {
    points: pts, scale: s,
    lines: [['A', 'D', 'B'], ['A', 'C'], ['B', 'C'], ['C', 'D']],
    segs: ['AD', 'AB', 'AC', 'BC', 'CD'], plain: ['DB'],
    motion: { kind: 'similarity' },
  };
  return assembleSim({
    family: 'H', variant, crossed: true, figure, t1: T1, t2: T2, ratio, par: null, direct: DIRECT,
    premises: ['a2', 'a0'], given: ['a2'],
    givenRows: [{ facts: ['a2'], form: 'math', key: 'gv.math', vars: { s: '∢ACB = 90°' } }, { facts: ['a2'], form: 'math', key: 'gv.math', vars: { s: 'CD ⊥ AB' } }],
    text: { key: 'tx.H', vars: { t: '△ABC', d: 'D', s: 'AB' } },
    ask, asks: ASKS, names: nameMap(ROLES, R, opts),
  }, R);
}

export default {
  id: 'H', roles: ROLES, asks: ASKS,
  variants: { 'H-CR': { theorem: 'aa', crossed: true } },
  build(R, variantId, opts = {}) { if (variantId !== 'H-CR') throw new Error(`H: no variant ${variantId}`); return honestSim((r) => draw(r, variantId, opts), R); },
};
