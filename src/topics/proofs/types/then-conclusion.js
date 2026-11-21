/* Type 4 "חפיפה ואז מסקנה" (spec §6.5): the type-3 proof, then one equality that follows from the
   congruence. 33 templates = the 11 variants of X, K, Z, T × the three goals of the §6.5 table, in
   that table's order. Canonical rows: fact, fact, fact, congruence, conclusion; the two unused
   consequences stay facts ("true but not needed").
   make(R, level, variant, avoid, ctx) → problem (§10.1). ctx.only pins a template (tests, dev lab);
   ctx.prefer (a type-3 template id the student proved) is used for the first Level-1 proof, so only
   the last row is new. Pure: randomness only through R; remake() rebuilds a problem from its seed. */
import { seeded, makeR } from '../../new/core.js';
import { T } from '../texts.js';
import { DEFS } from '../reasons.js';
import { bare, letterSwap, pickTemplate, wordsFor } from './tiles.js';
import X from '../families/x.js'; import K from '../families/k.js'; import Z from '../families/z.js';
import TT from '../families/t.js';

const FAMS = { X, K, Z, T: TT };
/* the three goals of each variant (family pair ids), in the order of the §6.5 table */
const GOALS = {
  'X-SAS': ['sAC', 'aA', 'aC'], 'X-ASA': ['sCO', 'sAC', 'aC'],
  'K-SSS': ['aA', 'aC', 'aB'], 'K-SAS': ['sCB', 'aC', 'aB'], 'K-ASA': ['sAB', 'sCB', 'aB'],
  'Z-SSS': ['aA', 'aC', 'aB'], 'Z-SAS': ['sBC', 'aC', 'aB'], 'Z-ASA': ['sAB', 'sBC', 'aB'],
  'T-SSS': ['aB', 'aA', 'aD'], 'T-SAS': ['sBD', 'aB', 'aD'], 'T-ASA': ['sAB', 'sBD', 'aB'],
};
const TEMPLATES = Object.values(FAMS).flatMap((f) => Object.entries(f.variants).flatMap(([variant, v]) => GOALS[variant].map((g, i) => ({
  id: `4-${variant}-${i + 1}`, family: f.id, variant, theorem: v.theorem, goal: i + 1, goalKind: g[0] === 's' ? 'seg' : 'ang',
}))));

/* Only the equality follows from the congruence: a consequence never says "= 90°" here (in family T
   the angles at D are right only because they are equal AND together make a straight angle). */
function plainConsequences(base) {
  const facts = { ...base.facts };
  for (const id of base.consequences) {
    const f = facts[id];
    if (f.kind !== 'ang' || !f.right) continue;
    const { right, ...st } = f, { right: r2, ...mark } = f.mark || {};
    facts[id] = { ...st, mark: { ...mark, arcs: mark.arcs || 1 } };
  }
  return facts;
}

function buildFrom(t, seed, level, variant, words, names) {
  const r = makeR(seeded(seed));
  const base0 = FAMS[t.family].build(r, t.variant, { words, ...(names ? { names } : {}) });
  const base = { ...base0, facts: plainConsequences(base0) };
  const goal = GOALS[t.variant][t.goal - 1];
  const wrong = [], traps = {};
  // §7.5: one consequence that is not the goal (looks equal, not known yet) + one false letter-swap
  wrong.push({ st: bare(base.facts[r.pick(base.consequences.filter((c) => c !== goal))]), why: 'consequence' });
  const ls = letterSwap(base, r);
  if (ls) { wrong.push(ls.tile); traps[ls.trap[0]] = ls.trap[1]; }
  return {
    ...base,
    id: `${t.id}:${seed}`, type: 'then-conclusion', template: t.id, seed, level, variant,
    target: goal, canon: [...base.canon, goal], tiles: { wrong }, traps, meta: { words, ...(names ? { names } : {}) },
  };
}

function make(R, level, variant, avoid = { recent: [], last: null }, ctx = {}) {
  const met = variant === 'B' && Array.isArray(ctx.words) ? ctx.words.filter((w) => DEFS.includes(w)) : [];
  let pool = TEMPLATES;
  if (ctx.only) pool = TEMPLATES.filter((t) => t.id === ctx.only);
  else if (level === 1 && typeof ctx.prefer === 'string') {
    const same = TEMPLATES.filter((t) => `3-${t.variant}` === ctx.prefer);
    if (same.length) pool = same;
  }
  const t = pickTemplate(R, pool, avoid, ctx, met), seed = R.int(1, 2147483646);
  return buildFrom(t, seed, level, variant, wordsFor(R, t, met, ctx), ctx.names || null);
}
/** Rebuild a problem from itself or from a snapshot's meta ({ template, seed, level, variant, meta }). */
function remake(x) {
  const t = TEMPLATES.find((q) => q.id === x.template);
  if (!t || !Number.isFinite(x.seed)) return null;
  const m = x.meta || {};
  return buildFrom(t, x.seed, x.level, x.variant, m.words || false, m.names || null);
}

export default {
  id: 'then-conclusion', n: 4, name: T['type.then-conclusion'], button: `4. ${T['type.then-conclusion']}`,
  warm: ['W2', 'W4', 'W5', 'W6'], templates: TEMPLATES, make, remake,
};
