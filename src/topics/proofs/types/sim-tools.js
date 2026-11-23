/* Shared pieces of the four similarity levels (spec 2026-11-23 §7.4–§7.6): the families, the template pick with the
   "second chance soon" rule for similarity reasons, and the wrong tiles / number chips. Pure: randomness only
   through R. */
import { optionsFor, holds, norm, segKey } from '../core.js';
import { pickTemplate, letterSwap, plain } from './tiles.js';
import { piecesOf } from '../families/sim-kit.js';
import P from '../families/p.js'; import B from '../families/b.js';
import H from '../families/h.js'; import N from '../families/n.js';

export const SIM_FAMS = { P, B, H, N };

/** The family variants whose canonical proof uses a reason (the rest of the reasons fit every template). */
const USES = {
  'common-angle': ['P-CC', 'H-CR', 'N-CG'], corresponding: ['P-CC', 'P-CC2'], alternate: ['B-VA', 'B-AA'],
  vertical: ['B-VA'], 'right-angles': ['H-CR'],
};
/** Pick a template: like the congruence types (never one of the last six while others are left, never the same family
    twice in a row), and ctx.want (a reason the student just missed) prefers a template whose proof uses it. */
export function pickSim(R, pool0, avoid, ctx = {}) {
  let pool = pool0;
  const want = ctx.want && USES[ctx.want];
  if (want) { const w = pool.filter((t) => want.includes(t.variant)); if (w.length) pool = w; }
  return pickTemplate(R, pool, avoid, { ...ctx, want: null }, []);
}

/** Every template of one level: `${n}-${variant}` for each family variant listed (crossed = H, N: לבד and the exam only). */
export const templatesOf = (n, fams) => fams.flatMap((id) => Object.entries(SIM_FAMS[id].variants).map(([variant, v]) => ({
  id: `${n}-${variant}`, family: id, variant, theorem: v.theorem, crossed: !!v.crossed,
})));
/** May a template appear at this help stage? Crossed matchings only at לבד, variant B (spec §7.6). */
export const allowed = (t, level, variant) => !t.crossed || (level === 3 && variant === 'B');

const half = (v) => Number.isFinite(v) && Math.abs(v * 2 - Math.round(v * 2)) < 1e-9;
/**
 * Two wrong number chips for the `val` row (spec §7.5): the ratio flipped, then a whole side read as one of its pieces
 * (AB taken as DB), then a near number. Every chip is whole or x.5, at least 1, different from the answer and from
 * each other. → [{ st:{ kind:'val', x, v }, why, for:'val' }]
 */
export function numberWrongs(p) {
  const pr = p.facts.prop, x = p.facts.val.v, asked = segKey(pr.need.asked), V = {};
  for (const [s, n] of Object.entries(p.values || {})) V[segKey(s)] = n;
  const fi = pr.pairs.findIndex((f) => f.some((s) => segKey(s) === asked));
  const [a, b] = pr.pairs[fi], [kn, kd] = pr.pairs[1 - fi], top = segKey(a) === asked;
  const solve = (val) => (top ? (val(b) * val(kn)) / val(kd) : (val(a) * val(kd)) / val(kn));
  const plainV = (s) => V[segKey(s)];
  const cands = [[top ? (plainV(b) * plainV(kd)) / plainV(kn) : (plainV(a) * plainV(kn)) / plainV(kd), 'num-flip']];
  for (const s of [a, b, kn, kd]) {
    if (segKey(s) === asked) continue;
    for (const q of piecesOf(p.figure, s).length > 1 ? piecesOf(p.figure, s) : []) cands.push([solve((z) => (segKey(z) === segKey(s) ? V[segKey(q)] : V[segKey(z)])), 'num-slip']);
  }
  for (const d of [1, -1, 2, 0.5, -0.5, 3]) cands.push([x + d, 'num-near']);
  const out = [];
  for (const [v, why] of cands) {
    if (!half(v) || v < 1 || v > 99 || v === x || out.some((o) => o.st.v === v)) continue;
    out.push({ st: { kind: 'val', x: p.facts.val.x, v: Math.round(v * 2) / 2 }, why, for: 'val' });
    if (out.length === 2) break;
  }
  return out;
}

/** Wrong proportions (a flipped fraction first, then sides moved to the wrong fraction), never true in the drawing. */
export const propWrongs = (p, n) => optionsFor(p, 'prop', n + 1, null).slice(1).map((st) => ({ st, why: 'ratio', for: 'prop' }));

/** The similarity in a wrong vertex order (false in the drawing). */
export function wrongOrder(p, R) {
  const f = p.facts[p.sim], t1 = f.map.map((m) => m[0]), t2 = f.map.map((m) => m[1]);
  const perms = [[0, 2, 1], [1, 0, 2], [2, 1, 0], [1, 2, 0], [2, 0, 1]];
  const maps = perms.map((q) => t1.map((u, i) => [u, t2[q[i]]])).filter((m) => !holds(p.figure, { kind: 'sim', map: m }) && norm(p.figure, { kind: 'sim', map: m }) !== norm(p.figure, f));
  return { st: { kind: 'sim', map: R.pick(maps) }, why: 'wrong-order', for: p.sim };
}

/** The proof's first wrong tile (§7.6, "ביחד"): an angle pair that follows from the similarity but is not known yet
    (it looks equal: families H, N), else a false look-alike of an angle row (letters swapped). Null when none. */
export function angleWrong(p, R) {
  const later = p.consequences.filter((c) => p.facts[c].kind === 'ang' && (p.just[c] || []).every((j) => j.needs.includes(p.sim)));
  if (later.length) return { st: plain(p.facts[R.pick(later)]), why: 'consequence' };
  const rows = p.canon.filter((f) => p.facts[f].kind === 'ang');
  const ls = letterSwap(p, R, rows);
  return ls ? { st: ls.tile.st, why: 'letter-swap', for: ls.tile.for } : null;     // its trap names a given: not used here
}

/** The facts of a problem whose similarity is GIVEN (levels 1–2 of the subject): the parallel given and the angles'
    own reasons are dropped; every angle pair follows from the similarity ('sim-partner'), the ratio from its definition,
    the number from the ratio. `order` = the angle pairs in row order (their marks are numbered that way). */
export function givenSim(base, order = ['a0', 'a1', 'a2']) {
  const facts = { sim: { kind: 'sim', map: base.facts.sim.map.map((m) => [...m]) } };
  const just = { sim: [{ reasons: ['given'], needs: [] }] }, roles = { sim: 'similarity' };
  order.forEach((id, i) => {
    const { mark, ...st } = base.facts[id];
    facts[id] = { ...structuredClone(st), mark: { ...(st.right ? { right: true } : {}), arcs: i + 1, color: i + 1 } };
    just[id] = [{ reasons: ['sim-angles'], needs: ['sim'] }]; roles[id] = 'sim-partner';
  });
  facts.prop = structuredClone(base.facts.prop); just.prop = [{ reasons: ['sim-ratio'], needs: ['sim'] }]; roles.prop = 'ratio';
  if (base.facts.val) { facts.val = { ...base.facts.val }; just.val = [{ reasons: ['solve'], needs: ['prop'] }]; roles.val = 'number'; }
  return { facts, just, roles };
}
/** The given line of a similarity: "△ADE ∼ △ABC (הדמיון לפי סדר הקודקודים)". */
export const simGivenLine = { facts: ['sim'], form: 'eq', byOrder: true };
