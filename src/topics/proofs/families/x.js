/* Family X (spec §6.4): two segments AB, CD crossing at O; triangles AOC, BOD (a bow-tie).
   Free fact: ∢AOC = ∢BOD (vertical angles). Each end is reflected through O, so all six matching
   pairs are true; the variant decides which three are the premises. Ending: a half-turn about O. */
import { assemble, honest, place, nameMap, wordOk, S, Ang, G } from './kit.js';

const PAIRS = {
  sAO: S('AO', 'OB'), sCO: S('CO', 'OD'), sAC: S('AC', 'BD'),
  aO: G(Ang('O', ['A', 'C']), Ang('O', ['B', 'D'])),
  aA: G(Ang('A', ['O', 'C']), Ang('B', ['O', 'D'])),
  aC: G(Ang('C', ['O', 'A']), Ang('D', ['O', 'B'])),
};
const VARIANTS = {
  'X-SAS': { theorem: 'sas', premises: ['sAO', 'aO', 'sCO'] },
  'X-ASA': { theorem: 'asa', premises: ['aA', 'sAO', 'aO'] },
};
const ROLES = ['A', 'B', 'C', 'D', 'O'];

function draw(R, variant, opts) {
  const a = 1, c = R.bool() ? 0.5 + R.rand() * 0.33 : 1.2 + R.rand() * 0.55;   // CO : AO, never close to 1
  const th = (R.bool() ? R.int(40, 78) : R.int(102, 132)) * Math.PI / 180;     // ∢AOC
  const A = [-a, 0], C = [-c * Math.cos(th), c * Math.sin(th)];
  const pts = place({ A, B: [a, 0], C, D: [-C[0], -C[1]], O: [0, 0] }, R);
  const figure = {
    points: pts, lines: [['A', 'O', 'B'], ['C', 'O', 'D']],
    segs: ['AO', 'OB', 'CO', 'OD', 'AC', 'BD'],
    angles: [PAIRS.aO.x, PAIRS.aO.y, PAIRS.aA.x, PAIRS.aA.y, PAIRS.aC.x, PAIRS.aC.y],
    tris: [['A', 'O', 'C'], ['B', 'O', 'D']],
    motion: { kind: 'half-turn', about: 'O' },
  };
  const v = VARIANTS[variant];
  let words = null;
  if (variant === 'X-SAS' && opts.words && wordOk(opts, 'midpoint')) {
    words = [
      [{ facts: ['sAO'], word: 'midpoint', key: 'gv.midpoint', vars: { p: 'O', s: 'AB' } }],
      [{ facts: ['sCO'], word: 'midpoint', key: 'gv.midpoint', vars: { p: 'O', s: 'CD' } }],
      [{ facts: ['sAO', 'sCO'], word: 'midpoint', key: 'gv.bisect2', vars: { s1: 'AB', s2: 'CD', p: 'O' } }],
    ][R.int(0, 2)];
  }
  return assemble({
    family: 'X', variant, theorem: v.theorem, figure, pairs: structuredClone(PAIRS), cong: [['A', 'B'], ['O', 'O'], ['C', 'D']],
    premises: v.premises, free: { id: 'aO', reason: 'vertical' }, words,
    text: { key: 'tx.X', vars: { s1: 'AB', s2: 'CD', p: 'O' } },
    names: nameMap(ROLES, R, opts, true),
  }, R);
}

export default {
  id: 'X',
  variants: { 'X-SAS': { theorem: 'sas' }, 'X-ASA': { theorem: 'asa' } },
  build(R, variantId, opts = {}) { if (!VARIANTS[variantId]) throw new Error(`X: no variant ${variantId}`); return honest((r) => draw(r, variantId, opts), R); },
};
