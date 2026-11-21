/* Family T (spec §6.4): triangle ABC with AB = AC, D on BC; triangles ABD and ACD share AD (a split
   triangle, isosceles on purpose). Free fact: AD = AD (common side). ∢ADB = ∢ADC carries right:true
   (shown "∢ADB = ∢ADC = 90°"). Ending: a flip over AD. */
import { assemble, honest, place, nameMap, wordOk, S, Ang, G } from './kit.js';

const PAIRS = {
  sAB: S('AB', 'AC'), sBD: S('BD', 'DC'), sAD: S('AD', 'AD'),
  aA: G(Ang('A', ['B', 'D']), Ang('A', ['C', 'D'])),
  aB: G(Ang('B', ['A', 'D']), Ang('C', ['A', 'D'])),
  aD: G(Ang('D', ['A', 'B']), Ang('D', ['A', 'C']), { right: true }),
};
const VARIANTS = {
  'T-SSS': { theorem: 'sss', premises: ['sAB', 'sBD', 'sAD'] },
  'T-SAS': { theorem: 'sas', premises: ['sAB', 'aA', 'sAD'] },
  'T-ASA': { theorem: 'asa', premises: ['aA', 'sAD', 'aD'] },
};
const ROLES = ['A', 'B', 'C', 'D'];

function wordsFor(variant, opts, R) {
  if (!opts.words) return null;
  const ok = (w) => wordOk(opts, w);
  if (variant === 'T-SSS') {
    const forms = [];
    if (ok('median')) forms.push({ facts: ['sBD'], word: 'median', key: 'gv.median', vars: { l: 'AD', s: 'BC' } });
    if (ok('midpoint')) forms.push({ facts: ['sBD'], word: 'midpoint', key: 'gv.mid', vars: { p: 'D', s: 'BC' } });
    return forms.length ? [R.pick(forms)] : null;
  }
  const out = [];
  if ((variant === 'T-SAS' || variant === 'T-ASA') && ok('bisector')) out.push({ facts: ['aA'], word: 'bisector', key: 'gv.bisector', vars: { l: 'AD', a: '∢BAC' } });
  if (variant === 'T-ASA' && ok('altitude')) out.push({ facts: ['aD'], word: 'altitude', key: 'gv.altitude', vars: { l: 'AD', s: 'BC' } });
  return out.length ? out : null;
}

function draw(R, variant, opts) {
  const be = (R.bool() ? R.int(25, 39) : R.int(52, 72)) * Math.PI / 180;   // the base angle, never near 45°
  const w = 0.85 + R.rand() * 0.3;
  const pts = place({ A: [0, w * Math.tan(be)], B: [-w, 0], C: [w, 0], D: [0, 0] }, R);
  const figure = {
    points: pts, lines: [['B', 'D', 'C']],
    segs: ['AB', 'AC', 'BD', 'DC', 'AD'],
    angles: [PAIRS.aA.x, PAIRS.aA.y, PAIRS.aB.x, PAIRS.aB.y, PAIRS.aD.x, PAIRS.aD.y],
    tris: [['A', 'B', 'D'], ['A', 'C', 'D']],
    motion: { kind: 'flip', axis: ['A', 'D'] },
  };
  const v = VARIANTS[variant];
  return assemble({
    family: 'T', variant, theorem: v.theorem, isosceles: true, figure, pairs: structuredClone(PAIRS), cong: [['A', 'A'], ['B', 'C'], ['D', 'D']],
    premises: v.premises, free: { id: 'sAD', reason: 'common-side' }, words: wordsFor(variant, opts, R),
    text: { key: 'tx.T', vars: { p: 'D', s: 'BC', t: '△ABC' } },
    names: nameMap(ROLES, R, opts),
  }, R);
}

export default {
  id: 'T',
  variants: { 'T-SSS': { theorem: 'sss' }, 'T-SAS': { theorem: 'sas' }, 'T-ASA': { theorem: 'asa' } },
  build(R, variantId, opts = {}) { if (!VARIANTS[variantId]) throw new Error(`T: no variant ${variantId}`); return honest((r) => draw(r, variantId, opts), R); },
};
