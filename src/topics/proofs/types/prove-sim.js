/* Similarity level 3 "הוכחת דמיון" (spec 2026-11-23 §7.6, mirrors congruence type 3): two angle rows with their
   reasons, then the similarity in vertex order with ז.ז. A parallel given (P, B) is the first row, written by the
   app (it is never asked, §7.2). Families P and B at every help stage; H and N (the matching crosses) only at לבד,
   variant B. Wrong tiles at ביחד: an angle pair that looks equal but is not known (or a false look-alike of an angle
   row), and the similarity in a wrong vertex order.
   make(R, level, variant, avoid, ctx) → problem (§10.1); ctx.only pins a template. Pure: randomness only through R;
   remake() rebuilds a problem from its seed. */
import { seeded, makeR } from '../../new/core.js';
import { T } from '../texts.js';
import { SIM_FAMS, templatesOf, allowed, pickSim, angleWrong, wrongOrder } from './sim-tools.js';

const TEMPLATES = templatesOf(8, ['P', 'B', 'H', 'N']);

function buildFrom(t, seed, level, variant) {
  const r = makeR(seeded(seed));
  const base = SIM_FAMS[t.family].build(r, t.variant, {});
  const wrong = [angleWrong(base, r), wrongOrder(base, r)].filter(Boolean);
  return {
    ...base,
    id: `${t.id}:${seed}`, type: 'prove-sim', template: t.id, seed, level, variant,
    target: 'sim', tiles: { wrong }, traps: {}, meta: null,
  };
}

function make(R, level, variant, avoid = { recent: [], last: null }, ctx = {}) {
  let pool = TEMPLATES.filter((t) => allowed(t, level, variant));
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
  id: 'prove-sim', n: 8, name: T['type.prove-sim'], button: `8. ${T['type.prove-sim']}`,
  warm: ['S1', 'S2', 'W2'], templates: TEMPLATES, make, remake,
  subject: 'similarity', label: T['type.prove-sim'], shape: 'prove', live: true,
};
