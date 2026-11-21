/* Family K (spec §6.4): triangles ABC and ADC on both sides of the shared side AC (a kite).
   Free fact: AC = AC (common side). D is B reflected over the line AC. Ending: a flip over AC. */
import { triFromAngles } from '../../new/chapters/geometry/geo.js';
import { assemble, honest, place, nameMap, wordOk, S, Ang, G } from './kit.js';

const PAIRS = {
  sAB: S('AB', 'AD'), sCB: S('CB', 'CD'), sAC: S('AC', 'AC'),
  aA: G(Ang('A', ['B', 'C']), Ang('A', ['D', 'C'])),
  aC: G(Ang('C', ['B', 'A']), Ang('C', ['D', 'A'])),
  aB: G(Ang('B', ['A', 'C']), Ang('D', ['A', 'C'])),
};
const VARIANTS = {
  'K-SSS': { theorem: 'sss', premises: ['sAB', 'sCB', 'sAC'] },
  'K-SAS': { theorem: 'sas', premises: ['sAB', 'aA', 'sAC'] },
  'K-ASA': { theorem: 'asa', premises: ['aA', 'sAC', 'aC'] },
};
const ROLES = ['A', 'B', 'C', 'D'];

function draw(R, variant, opts) {
  const al = R.int(22, 62), ga = R.int(18, 62);                       // ∢BAC, ∢BCA
  const [A, C, B] = triFromAngles([al, ga, 180 - al - ga], 1);
  const pts = place({ A, B, C, D: [B[0], -B[1]] }, R);
  const figure = {
    points: pts, lines: [],
    segs: ['AB', 'AD', 'CB', 'CD', 'AC'],
    angles: [PAIRS.aA.x, PAIRS.aA.y, PAIRS.aC.x, PAIRS.aC.y, PAIRS.aB.x, PAIRS.aB.y],
    tris: [['A', 'B', 'C'], ['A', 'D', 'C']],
    motion: { kind: 'flip', axis: ['A', 'C'] },
  };
  const v = VARIANTS[variant];
  const words = variant === 'K-SAS' && opts.words && wordOk(opts, 'bisector')
    ? [{ facts: ['aA'], word: 'bisector', key: 'gv.bisector', vars: { l: 'AC', a: '∢BAD' } }] : null;
  return assemble({
    family: 'K', variant, theorem: v.theorem, figure, pairs: structuredClone(PAIRS), cong: [['A', 'A'], ['B', 'D'], ['C', 'C']],
    premises: v.premises, free: { id: 'sAC', reason: 'common-side' }, words,
    text: { key: 'tx.K', vars: { t1: '△ABC', t2: '△ADC', s: 'AC' } },
    names: nameMap(ROLES, R, opts),
  }, R);
}

export default {
  id: 'K',
  variants: { 'K-SSS': { theorem: 'sss' }, 'K-SAS': { theorem: 'sas' }, 'K-ASA': { theorem: 'asa' } },
  build(R, variantId, opts = {}) { if (!VARIANTS[variantId]) throw new Error(`K: no variant ${variantId}`); return honest((r) => draw(r, variantId, opts), R); },
};
