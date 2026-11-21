/* Family 2 (spec §6.4): two separate triangles ABC and DEF, the second turned or mirrored beside the
   first. No free fact: all three premises are given. Entry proofs only (variant A, see types/).
   Ending: a slide with a turn or a flip. */
import { triFromAngles } from '../../new/chapters/geometry/geo.js';
import { assemble, honest, nameMap, S, Ang, G } from './kit.js';

const PAIRS = {
  sAB: S('AB', 'DE'), sBC: S('BC', 'EF'), sCA: S('CA', 'FD'),
  aA: G(Ang('A', ['B', 'C']), Ang('D', ['E', 'F'])),
  aB: G(Ang('B', ['A', 'C']), Ang('E', ['D', 'F'])),
  aC: G(Ang('C', ['B', 'A']), Ang('F', ['E', 'D'])),
};
// the premise sets, in reading order, for each theorem (which vertex / side varies)
const SETS = {
  sas: [['sAB', 'aB', 'sBC'], ['sCA', 'aA', 'sAB'], ['sBC', 'aC', 'sCA']],
  asa: [['aA', 'sAB', 'aB'], ['aB', 'sBC', 'aC'], ['aC', 'sCA', 'aA']],
  sss: [['sAB', 'sBC', 'sCA']],
};
const VARIANTS = { '2-SAS': 'sas', '2-ASA': 'asa', '2-SSS': 'sss' };
const ROLES = ['A', 'B', 'C', 'D', 'E', 'F'];

const turn = (p, t) => [p[0] * Math.cos(t) - p[1] * Math.sin(t), p[0] * Math.sin(t) + p[1] * Math.cos(t)];
function draw(R, variant, opts) {
  const a = R.int(34, 80), b = R.int(30, 80);
  const tri = triFromAngles([a, b, 180 - a - b], 1);                     // A, B, C
  const c0 = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3];
  const t1 = R.int(-3, 3) * 15 * Math.PI / 180, mirror = R.bool(), t2 = R.int(2, 10) * 15 * Math.PI / 180 * (R.bool() ? 1 : -1);
  const one = tri.map((p) => turn([p[0] - c0[0], p[1] - c0[1]], t1));
  const two = one.map((p) => turn(mirror ? [-p[0], p[1]] : p, mirror && R.bool() ? 0 : t2));
  const span = (q) => [Math.min(...q.map((p) => p[0])), Math.max(...q.map((p) => p[0]))];
  const [, r1] = span(one), [l2] = span(two), dx = r1 - l2 + 0.35;
  const pts = { A: one[0], B: one[1], C: one[2], D: [two[0][0] + dx, two[0][1]], E: [two[1][0] + dx, two[1][1]], F: [two[2][0] + dx, two[2][1]] };
  const figure = {
    points: pts, lines: [],
    segs: ['AB', 'BC', 'CA', 'DE', 'EF', 'FD'],
    angles: [PAIRS.aA.x, PAIRS.aA.y, PAIRS.aB.x, PAIRS.aB.y, PAIRS.aC.x, PAIRS.aC.y],
    tris: [['A', 'B', 'C'], ['D', 'E', 'F']],
    motion: { kind: 'slide', mirror },
  };
  const theorem = VARIANTS[variant];
  return assemble({
    family: '2', variant, theorem, figure, pairs: structuredClone(PAIRS), cong: [['A', 'D'], ['B', 'E'], ['C', 'F']],
    premises: R.pick(SETS[theorem]), free: null, words: null,
    text: { key: 'tx.2', vars: { t1: '△ABC', t2: '△DEF' } },
    names: nameMap(ROLES, R, opts),
  }, R);
}

export default {
  id: '2',
  variants: { '2-SAS': { theorem: 'sas' }, '2-ASA': { theorem: 'asa' }, '2-SSS': { theorem: 'sss' } },
  build(R, variantId, opts = {}) { if (!VARIANTS[variantId]) throw new Error(`2: no variant ${variantId}`); return honest((r) => draw(r, variantId, opts), R); },
};
