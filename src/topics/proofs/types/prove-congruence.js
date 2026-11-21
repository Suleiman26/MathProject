/* Type 3 "הוכחת חפיפה" (spec §6.5): two given facts (family 2: three) + one seen in the drawing →
   the congruence, with the right theorem. 14 templates = every variant of the five families.
   make(R, level, variant, avoid, ctx) → problem (§10.1). Pure: randomness only through R; each
   problem is built from its own seed, so remake(problem or snapshot meta) rebuilds it exactly. */
import { seeded, makeR } from '../../new/core.js';
import { T } from '../texts.js';
import { DEFS } from '../reasons.js';
import { bare, letterSwap, pickTemplate, wordsFor } from './tiles.js';
import X from '../families/x.js'; import K from '../families/k.js'; import Z from '../families/z.js';
import TT from '../families/t.js'; import TWO from '../families/two.js';

const FAMS = { X, K, Z, T: TT, 2: TWO };
const TEMPLATES = Object.values(FAMS).flatMap((f) => Object.entries(f.variants).map(([variant, v]) => ({ id: `3-${variant}`, family: f.id, variant, theorem: v.theorem })));

/* §7.5 wrong tiles for type 3: one true consequence not known yet, one false letter-swap of a given */
function wrongTiles(base, R) {
  const wrong = [], traps = {};
  const c = R.pick(base.consequences);
  wrong.push({ st: bare(base.facts[c]), why: 'consequence' });
  const ls = letterSwap(base, R);
  if (ls) { wrong.push(ls.tile); traps[ls.trap[0]] = ls.trap[1]; }
  return { wrong, traps };
}

function buildFrom(t, seed, level, variant, words) {
  const r = makeR(seeded(seed));
  const base = FAMS[t.family].build(r, t.variant, { words });
  const { wrong, traps } = wrongTiles(base, r);
  return {
    ...base,
    id: `${t.id}:${seed}`, type: 'prove-congruence', template: t.id, seed, level, variant,
    target: 'cong', tiles: { wrong }, traps, meta: { words },
  };
}

function make(R, level, variant, avoid = { recent: [], last: null }, ctx = {}) {
  const met = variant === 'B' && Array.isArray(ctx.words) ? ctx.words.filter((w) => DEFS.includes(w)) : [];
  let pool = TEMPLATES.filter((t) => variant === 'A' || t.family !== '2');                   // family 2: entry proofs only
  if (ctx.only) pool = TEMPLATES.filter((t) => t.id === ctx.only);
  const t = pickTemplate(R, pool, avoid, ctx, met), seed = R.int(1, 2147483646);
  return buildFrom(t, seed, level, variant, wordsFor(R, t, met, ctx));
}
/** Rebuild a problem from itself or from a snapshot's meta ({ template, seed, level, variant, meta }). */
function remake(x) {
  const t = TEMPLATES.find((q) => q.id === x.template);
  if (!t || !Number.isFinite(x.seed)) return null;
  return buildFrom(t, x.seed, x.level, x.variant, (x.meta && x.meta.words) || false);
}

export default {
  id: 'prove-congruence', n: 3, name: T['type.prove-congruence'], button: `3. ${T['type.prove-congruence']}`,
  warm: ['W1', 'W2', 'W3', 'W4'], templates: TEMPLATES, make, remake,
};
