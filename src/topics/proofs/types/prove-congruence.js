/* Type 3 "הוכחת חפיפה" (spec §6.5): two given facts (family 2: three) + one seen in the drawing →
   the congruence, with the right theorem. 14 templates = every variant of the five families.
   make(R, level, variant, avoid, ctx) → problem (§10.1). Pure: randomness only through R; each
   problem is built from its own seed, so remake(problem or snapshot meta) rebuilds it exactly. */
import { seeded, makeR } from '../../new/core.js';
import { T } from '../texts.js';
import { DEFS, THEOREMS } from '../reasons.js';
import { findFact, holds, norm, show } from '../core.js';
import X from '../families/x.js'; import K from '../families/k.js'; import Z from '../families/z.js';
import TT from '../families/t.js'; import TWO from '../families/two.js';

const FAMS = { X, K, Z, T: TT, 2: TWO };
const TEMPLATES = Object.values(FAMS).flatMap((f) => Object.entries(f.variants).map(([variant, v]) => ({ id: `3-${variant}`, family: f.id, variant, theorem: v.theorem })));
// the words a template can use when its given is worded (§6.4)
const WORDS = { 'X-SAS': ['midpoint'], 'K-SAS': ['bisector'], 'T-SSS': ['median', 'midpoint'], 'T-SAS': ['bisector'], 'T-ASA': ['bisector', 'altitude'] };
const SEEN = { vertical: ['X'], 'common-side': ['K', 'Z', 'T'] };
/* does a template's proof use this reason (the "second chance soon" rule, §9.1)? */
function uses(t, want, wordsOk) {
  if (!want || want === 'given') return true;
  if (SEEN[want]) return SEEN[want].includes(t.family);
  if (THEOREMS.includes(want)) return t.theorem === want;
  if (DEFS.includes(want)) return wordsOk && (WORDS[t.variant] || []).includes(want);
  return false;
}
const bare = (st) => { const { mark, ...rest } = st; return structuredClone(rest); };

/* §7.5 wrong tiles for type 3: one true consequence not known yet, one false letter-swap of a given */
function wrongTiles(base, R) {
  const fig = base.figure, wrong = [], traps = {};
  const c = R.pick(base.consequences);
  wrong.push({ st: bare(base.facts[c]), why: 'consequence' });
  const cands = [];
  for (const g of base.given) {
    const f = base.facts[g], parts = f.kind === 'seg' ? fig.segs : fig.angles;
    for (const q of parts) {
      const st = { kind: f.kind, x: structuredClone(f.x), y: structuredClone(q) };
      if (norm(fig, st) === norm(fig, f) || findFact(base, st) || holds(fig, st, 1e-6)) continue;
      const letters = (s) => (typeof s === 'string' ? [...s] : [s.v, ...s.r]);
      const share = letters(q).filter((l) => letters(f.y).includes(l)).length;
      cands.push({ st, share, given: g });
    }
  }
  const best = Math.max(...cands.map((x) => x.share));
  const pick = R.pick(cands.filter((x) => x.share === best));
  if (pick) {
    wrong.push({ st: pick.st, why: 'letter-swap' });
    traps[norm(fig, pick.st)] = { kind: 'false-statement', textKey: 'st.letterSwap', vars: { given: show(base.facts[pick.given]) } };
  }
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
  const recent = (avoid && avoid.recent) || [], last = avoid && avoid.last;
  const met = variant === 'B' && Array.isArray(ctx.words) ? ctx.words.filter((w) => DEFS.includes(w)) : [];
  let pool = TEMPLATES.filter((t) => variant === 'A' || t.family !== '2');                   // family 2: entry proofs only
  const notLast = pool.filter((t) => !(last && last.family === t.family && last.theorem === t.theorem));
  if (notLast.length) pool = notLast;
  const fresh = pool.filter((t) => !recent.includes(t.id));
  let pick = fresh.length ? fresh : pool;
  if (ctx.want) {
    const w = pick.filter((t) => uses(t, ctx.want, met.includes(ctx.want)));
    const w2 = pool.filter((t) => uses(t, ctx.want, met.includes(ctx.want)));
    if (w.length) pick = w; else if (w2.length) pick = w2;
  }
  const t = R.pick(pick), seed = R.int(1, 2147483646);
  let words = false;
  if (met.length && (WORDS[t.variant] || []).some((w) => met.includes(w))) {
    if (ctx.want && DEFS.includes(ctx.want) && met.includes(ctx.want)) words = [ctx.want];
    else if (R.bool(0.5)) words = met;
  }
  return buildFrom(t, seed, level, variant, words);
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
