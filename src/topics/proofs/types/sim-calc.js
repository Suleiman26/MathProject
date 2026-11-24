/* Similarity level 4 "דמיון ואז חישוב" (spec 2026-11-23 §7.6, mirrors congruence type 4 + the Ministry's "הסבירו
   מדוע … חשבו …"): the level-3 proof, then the ratio (only the two fractions the calculation needs: the asked side and
   a pair whose both lengths are known) and the number. Families P and B; H (the matching crosses) only at לבד,
   variant B. The first מודרך proof re-uses a drawing the student proved in "הוכחת דמיון" (ctx.prefer, like type 4).
   The number row's wrong chips (מודרך) come with the problem: the ratio flipped, a whole side read as its piece.
   make(R, level, variant, avoid, ctx) → problem (§10.1); ctx.only pins a template. Pure: randomness only through R. */
import { seeded, makeR } from '../../new/core.js';
import { T } from '../texts.js';
import { SIM_FAMS, templatesOf, allowed, pickSim, angleWrong, wrongOrder, propWrongs, numberWrongs, numberTraps } from './sim-tools.js';

const TEMPLATES = templatesOf(9, ['P', 'B', 'H']);

function buildFrom(t, seed, level, variant) {
  const r = makeR(seeded(seed));
  const base = SIM_FAMS[t.family].build(r, t.variant, { ask: true });
  const p = { ...base, canon: [...base.canon, 'prop', 'val'], target: 'val' };
  const wrong = [angleWrong(p, r), ...propWrongs(p, 1), wrongOrder(p, r), ...numberWrongs(p)].filter(Boolean);
  return {
    ...p,
    id: `${t.id}:${seed}`, type: 'sim-calc', template: t.id, seed, level, variant,
    tiles: { wrong }, traps: numberTraps(p, wrong), meta: null,
  };
}

function make(R, level, variant, avoid = { recent: [], last: null }, ctx = {}) {
  let pool = TEMPLATES.filter((t) => allowed(t, level, variant));
  if (ctx.only) pool = TEMPLATES.filter((t) => t.id === ctx.only);
  else if (level === 1 && typeof ctx.prefer === 'string') {
    const same = pool.filter((t) => `8-${t.variant}` === ctx.prefer);
    if (same.length) pool = same;
  }
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
  id: 'sim-calc', n: 9, name: T['type.sim-calc'], button: `9. ${T['type.sim-calc']}`,
  warm: [], templates: TEMPLATES, make, remake,
  subject: 'similarity', label: T['type.sim-calc'], shape: 'then', live: true,
};
