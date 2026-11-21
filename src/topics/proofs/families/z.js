/* Family Z (spec §6.4): triangles ABC and CDA sharing the diagonal AC; one is the other turned half
   way round (D = A + C − B, a slanted four-sided shape). Free fact: AC = CA (common side).
   Ending: a half-turn about the middle of AC. */
import { triFromAngles } from '../../new/chapters/geometry/geo.js';
import { assemble, honest, place, nameMap, S, Ang, G } from './kit.js';

const PAIRS = {
  sAB: S('AB', 'CD'), sBC: S('BC', 'DA'), sAC: S('AC', 'CA'),
  aA: G(Ang('A', ['B', 'C']), Ang('C', ['D', 'A'])),
  aC: G(Ang('C', ['B', 'A']), Ang('A', ['D', 'C'])),
  aB: G(Ang('B', ['A', 'C']), Ang('D', ['C', 'A'])),
};
const VARIANTS = {
  'Z-SSS': { theorem: 'sss', premises: ['sAB', 'sBC', 'sAC'] },
  'Z-SAS': { theorem: 'sas', premises: ['sAB', 'aA', 'sAC'] },
  'Z-ASA': { theorem: 'asa', premises: ['aA', 'sAC', 'aC'] },
};
const ROLES = ['A', 'B', 'C', 'D'];

function draw(R, variant, opts) {
  const al = R.int(28, 70), ga = R.int(24, 62);                        // ∢BAC, ∢BCA
  const [A, C, B] = triFromAngles([al, ga, 180 - al - ga], 1);
  const pts = place({ A, B, C, D: [A[0] + C[0] - B[0], A[1] + C[1] - B[1]] }, R);
  const figure = {
    points: pts, lines: [],
    segs: ['AB', 'BC', 'CD', 'DA', 'AC'],
    angles: [PAIRS.aA.x, PAIRS.aA.y, PAIRS.aC.x, PAIRS.aC.y, PAIRS.aB.x, PAIRS.aB.y],
    tris: [['A', 'B', 'C'], ['C', 'D', 'A']],
    motion: { kind: 'half-turn', about: ['A', 'C'] },
  };
  const v = VARIANTS[variant];
  return assemble({
    family: 'Z', variant, theorem: v.theorem, figure, pairs: structuredClone(PAIRS), cong: [['A', 'C'], ['B', 'D'], ['C', 'A']],
    premises: v.premises, free: { id: 'sAC', reason: 'common-side' }, words: null,
    text: { key: 'tx.Z', vars: { t1: '△ABC', t2: '△CDA', s: 'AC' } },
    names: nameMap(ROLES, R, opts),
  }, R);
}

export default {
  id: 'Z',
  variants: { 'Z-SSS': { theorem: 'sss' }, 'Z-SAS': { theorem: 'sas' }, 'Z-ASA': { theorem: 'asa' } },
  build(R, variantId, opts = {}) { if (!VARIANTS[variantId]) throw new Error(`Z: no variant ${variantId}`); return honest((r) => draw(r, variantId, opts), R); },
};
