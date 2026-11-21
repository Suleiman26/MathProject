/* Shared pieces of the proof types (spec §6.4–§6.6, §7.5): the template pool with the variety rules,
   and the false letter-swap tile. Pure: randomness only through R. */
import { DEFS, THEOREMS, CP } from '../reasons.js';
import { findFact, holds, norm, show } from '../core.js';

/** A statement without its drawing mark (a tile, a trap). */
export const bare = (st) => { const { mark, ...rest } = st; return structuredClone(rest); };
/** A consequence as a tile: bare, and never "= 90°" (in family T the right angle needs the straight angle too, not only the congruence). */
export const plain = (st) => { const { right, ...rest } = bare(st); return rest; };

/* the words a family variant can use when its given is worded (§6.4) */
export const WORDS = { 'X-SAS': ['midpoint'], 'K-SAS': ['bisector'], 'T-SSS': ['median', 'midpoint'], 'T-SAS': ['bisector'], 'T-ASA': ['bisector', 'altitude'] };
const SEEN = { vertical: ['X'], 'common-side': ['K', 'Z', 'T'] };
/** Does a template's proof use this reason (the "second chance soon" rule, §9.1)? */
export function uses(t, want, wordsOk) {
  if (!want || want === 'given') return true;
  if (SEEN[want]) return SEEN[want].includes(t.family);
  if (THEOREMS.includes(want)) return t.theorem === want;
  if (DEFS.includes(want)) return wordsOk && (WORDS[t.variant] || []).includes(want);
  if (CP.includes(want)) return t.goalKind ? t.goalKind === (want === 'cp-sides' ? 'seg' : 'ang') : true;
  return false;
}

/**
 * Pick a template (§6.4, §6.6): never one of `avoid.recent` (the last 6) while others are left,
 * never the same family + theorem as `avoid.last`, ctx.want prefers a template that uses that reason.
 * `pool` is already filtered by the type's own rules (variant, family 2, ctx.only, ctx.prefer).
 */
export function pickTemplate(R, pool0, avoid, ctx, met) {
  const recent = (avoid && avoid.recent) || [], last = avoid && avoid.last;
  let pool = pool0;
  const notLast = pool.filter((t) => !(last && last.family === t.family && last.theorem === t.theorem));
  if (notLast.length) pool = notLast;
  const fresh = pool.filter((t) => !recent.includes(t.id));
  let pick = fresh.length ? fresh : pool;
  if (ctx.want) {
    const ok = (t) => uses(t, ctx.want, met.includes(ctx.want));
    const w = pick.filter(ok), w2 = pool.filter(ok);
    if (w.length) pick = w; else if (w2.length) pick = w2;
  }
  return R.pick(pick);
}
/** The word-givens of one proof: only words the student met (variant B), only where the variant has them. */
export function wordsFor(R, t, met, ctx) {
  if (!met.length || !(WORDS[t.variant] || []).some((w) => met.includes(w))) return false;
  if (ctx.want && DEFS.includes(ctx.want) && met.includes(ctx.want)) return [ctx.want];
  return R.bool(0.5) ? met : false;
}

const letters = (s) => (typeof s === 'string' ? [...s] : [s.v, ...s.r]);
/**
 * §7.5 (3): a false look-alike of one of the problem's given facts (letters swapped), tested false in
 * the coordinates and not a fact. → { tile:{ st, why:'letter-swap', for? }, trap:[normKey, trap] } | null
 * `from` = the fact ids to swap from (default: base.given); `skip` = normal forms already used.
 */
export function letterSwap(base, R, from = base.given, skip = new Set()) {
  const fig = base.figure, cands = [];
  for (const g of from) {
    const f = base.facts[g];
    if (f.kind === 'cong') continue;
    const parts = f.kind === 'seg' ? fig.segs : fig.angles;
    for (const q of parts || []) {
      const st = { kind: f.kind, x: structuredClone(f.x), y: structuredClone(q) };
      if (norm(fig, st) === norm(fig, f) || skip.has(norm(fig, st)) || findFact(base, st) || holds(fig, st, 1e-6)) continue;
      const share = letters(q).filter((l) => letters(f.y).includes(l)).length;
      cands.push({ st, share, given: g });
    }
  }
  if (!cands.length) return null;
  const best = Math.max(...cands.map((x) => x.share));
  const pick = R.pick(cands.filter((x) => x.share === best));
  return {
    tile: { st: pick.st, why: 'letter-swap', for: pick.given },
    trap: [norm(fig, pick.st), { kind: 'false-statement', textKey: 'st.letterSwap', vars: { given: show(base.facts[pick.given]) } }],
  };
}
