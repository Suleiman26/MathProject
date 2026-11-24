/* Similarity level 2 "מיחס לצלע חסרה" (spec 2026-11-23 §7.6; the calculation is learned here, before it sits inside a
   long proof): △ADE ∼ △ABC and some lengths are given. Rows: the ratio (only the two fractions needed: the asked side
   and a pair whose both lengths are known), then the number. מודרך: the app writes the ratio, the student picks the
   number among three chips (right, the ratio flipped, a whole side read as its piece). Families P (entry, variant A)
   and B. Wrong tiles: proportions that flip a fraction or pair the wrong sides.
   make(R, level, variant, avoid, ctx) → problem (§10.1); ctx.only pins a template. Pure: randomness only through R. */
import { seeded, makeR } from '../../new/core.js';
import { T } from '../texts.js';
import { SIM_FAMS, pickSim, givenSim, simGivenLine, propWrongs, numberWrongs, numberTraps } from './sim-tools.js';

const TEMPLATES = [
  { id: '7-P', family: 'P', variant: 'P-CC', theorem: 'aa', crossed: false },
  { id: '7-B', family: 'B', variant: 'B-VA', theorem: 'aa', crossed: false },
];

function buildFrom(t, seed, level, variant) {
  const r = makeR(seeded(seed));
  const base = SIM_FAMS[t.family].build(r, t.variant, { ask: true });
  const { facts, just, roles } = givenSim(base);
  const problem = {
    id: `${t.id}:${seed}`, type: 'sim-side', template: t.id, seed, level, variant,
    family: t.family, theorem: 'aa', crossed: false, figure: base.figure, facts, just, roles,
    given: ['sim'], target: 'val', canon: ['sim', 'prop', 'val'], sim: 'sim', consequences: ['a0', 'a1', 'a2'],
    ratio: { ...base.ratio }, text: base.text,
    givenText: [{ ...simGivenLine }, ...base.givenText.filter((g) => g.form === 'len')],
    ask: base.ask, asks: [...base.asks], values: { ...base.values }, traps: {}, meta: null,
  };
  problem.tiles = { wrong: [...propWrongs(problem, 3), ...numberWrongs(problem)] };
  problem.traps = numberTraps(problem, problem.tiles.wrong);
  return problem;
}

function make(R, level, variant, avoid = { recent: [], last: null }, ctx = {}) {
  let pool = variant === 'A' ? TEMPLATES.filter((t) => t.family === 'P') : TEMPLATES;     // the pyramid is the entry drawing
  if (ctx.only) pool = TEMPLATES.filter((t) => t.id === ctx.only);
  const t = pickSim(R, pool, avoid, ctx), seed = R.int(1, 2147483646);
  return buildFrom(t, seed, level, variant);
}
/** Rebuild a problem from itself or from a snapshot's meta ({ template, seed, level, variant, meta }). */
function remake(x) {
  const t = TEMPLATES.find((q) => q.id === x.template);
  if (!t || !Number.isFinite(x.seed)) return null;
  return buildFrom(t, x.seed, x.level, x.variant);
}

export default {
  id: 'sim-side', n: 7, name: T['type.sim-side'], button: `7. ${T['type.sim-side']}`,
  warm: ['S2', 'S3', 'S4'], templates: TEMPLATES, make, remake,
  subject: 'similarity', label: T['type.sim-side'], shape: 'side', live: true,
};
