/* The similarity family kit (spec 2026-11-23 §7.4, §7.5): the ratio and the lengths, the honesty check
   for similarity drawings ("the drawing must not lie", extended) and the assembly of a similarity base.
   Pure: randomness only through R.

   A similarity base (simBase) = { family, variant, theorem:'aa', crossed, figure (+ scale, labels:{piece → number}),
     facts, just, given, canon, roles, sim:'sim', ratio:{p,q}, consequences, givenText, text,
     ask? (the asked side), values? ({side → number}: every known side, wholes included), asks (allowed asks) }.
   Fact ids: 'par' (P, B), 'a0' 'a1' 'a2' (the angle pair at each matched vertex, map order), 'sim', 'prop', 'val'.
   The similarity map always goes small → big, so ratio p/q = (side of the 2nd triangle) / (side of the 1st). */
import { measure, holds, angKey, segKey } from '../core.js';
import { layout } from '../figure-core.js';
import { lies, cramped, rename, Ang, G } from './kit.js';
import { add, sub, mul, dot, unit, dist, distPointSeg, textW, TH, triFromSides } from '../../new/chapters/geometry/geo.js';

/* ── ratio and lengths ────────────────────────────────────────────────────── */
/** Every ratio k = p/q a family may use (small integers, 1.5 ≤ k ≤ 3). */
export const K_ALL = [[3, 2], [5, 3], [7, 4], [2, 1], [9, 4], [5, 2], [7, 3], [8, 3], [3, 1]].map(([p, q]) => ({ p, q }));
/** The ratios that keep clear of 2 (|k − 2| ≥ 0.15: a 2:1 drawing invites another matching, spec §7.4). */
export const K_FAR2 = K_ALL.filter(({ p, q }) => Math.abs(p / q - 2) >= 0.15);
export const kOf = (r) => r.p / r.q;
const MAX_LEN = 30, MIN_LEN = 2;
const angles3 = ([a, b, c]) => {
  const at = (x, y, z) => Math.acos(Math.max(-1, Math.min(1, (y * y + z * z - x * x) / (2 * y * z)))) * 180 / Math.PI;
  return [at(a, b, c), at(b, c, a), at(c, a, b)];
};
/** A good triangle shape: no sliver, no angle near 90°, angles clearly different (scalene). */
export function shapeOk(angs, { minDeg = 22, gap = 13, right = 7 } = {}) {
  if (angs.some((x) => !(x >= minDeg) || Math.abs(x - 90) < right)) return false;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (Math.abs(angs[i] - angs[j]) < gap) return false;
  return true;
}
/**
 * The lengths of a similar pair (spec §7.5): three different whole numbers n_i, so that every side of the big
 * triangle (p·n_i/2) and of the small one (q·n_i/2) is whole or x.5, the big ones at most 30, the small at least 2,
 * and the shape is a good scalene triangle. Returns { n, big, small } (index i = the side opposite vertex i).
 */
export function lengths(R, ratio, { ok = () => true } = {}) {
  const { p, q } = ratio, lo = Math.ceil((2 * MIN_LEN) / q), hi = Math.floor((2 * MAX_LEN) / p);
  for (let t = 0; t < 400; t++) {
    const n = [R.int(lo, hi), R.int(lo, hi), R.int(lo, hi)];
    if (new Set(n).size < 3) continue;
    const s = [...n].sort((x, y) => x - y);
    if (s[2] >= s[0] + s[1]) continue;
    const angs = angles3(n);
    if (!shapeOk(angs) || !ok(n, angs)) continue;
    return { n, big: n.map((x) => (p * x) / 2), small: n.map((x) => (q * x) / 2) };
  }
  return null;
}
/** A triangle from its three sides (side i opposite vertex i), vertex 0 at the origin. */
export const triangle = (sides) => triFromSides(sides);
/** Points divided by s (the drawing is about one unit big; fig.scale = s gives the lengths back). */
export const shrink = (pts, s) => Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, [v[0] / s, v[1] / s]]));

/* ── sides, pieces, the calculation (spec §7.5) ───────────────────────────── */
const half = (v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-6;
const round2 = (v) => Math.round(v * 2) / 2;
/** A side's name as the figure spells it (a drawn segment with the same two points), else u+v. */
export function sideName(fig, u, v) {
  const k = segKey(u + v);
  return [...(fig.segs || []), ...(fig.plain || [])].find((s) => segKey(s) === k) || u + v;
}
/** The three sides of a triangle, side i opposite vertex i. */
export const sidesOf = (fig, t) => [0, 1, 2].map((i) => sideName(fig, t[(i + 1) % 3], t[(i + 2) % 3]));
/** The drawn pieces of a segment: itself, or the parts between the points of its line that lie inside it. */
export function piecesOf(fig, seg) {
  const P = fig.points, [u, v] = [seg[0], seg[1]];
  const line = (fig.lines || []).find((l) => l.includes(u) && l.includes(v));
  if (!line) return [seg];
  const d = sub(P[v], P[u]), len2 = dot(d, d);
  const inside = line.map((x) => [x, dot(sub(P[x], P[u]), d) / len2]).filter(([, t]) => t > 1e-9 && t < 1 - 1e-9).sort((a, b) => a[1] - b[1]).map(([x]) => x);
  if (!inside.length) return [seg];
  const chain = [u, ...inside, v];
  return chain.slice(1).map((x, i) => sideName(fig, chain[i], x));
}
const lenOf = (fig, s) => measure(fig, s) * fig.scale;
/** Every allowed calculation: { asked, tri, a, b, known:[3 sides], pieces:[labelled], pairs } (role letters).
    The asked side is a drawn piece (no point inside), never a side of both triangles; a known whole side is shown
    by its pieces, never through the asked one; every number is whole or x.5. */
export function calcOptions(fig, t1, t2) {
  const S = [sidesOf(fig, t1), sidesOf(fig, t2)], shared = new Set(S[0].map(segKey).filter((k) => S[1].map(segKey).includes(k)));
  const out = [];
  for (const tri of [0, 1]) for (let a = 0; a < 3; a++) {
    const asked = S[tri][a];
    if (shared.has(segKey(asked)) || piecesOf(fig, asked).length > 1) continue;
    for (let b = 0; b < 3; b++) {
      if (b === a) continue;
      const known = [S[1 - tri][a], S[0][b], S[1][b]];
      const pieces = [...new Map(known.flatMap((s) => piecesOf(fig, s)).map((s) => [segKey(s), s])).values()];
      if (pieces.some((s) => segKey(s) === segKey(asked))) continue;
      const vals = [asked, ...known, ...pieces].map((s) => lenOf(fig, s));
      if (!vals.every((x) => half(x) && x >= 1 - 1e-9)) continue;
      // the numbers on the drawing and the answer all differ (a substitution never hides a mix-up)
      const shown = [asked, ...pieces].map((s) => round2(lenOf(fig, s)));
      out.push({ asked, tri, a, b, known, pieces, pairs: [[S[0][b], S[1][b]], [S[0][a], S[1][a]]], distinct: new Set(shown).size === shown.length });
    }
  }
  return out;
}

/* ── assembling a base ────────────────────────────────────────────────────── */
/**
 * spec = { family, variant, crossed, figure (role letters: points, scale, lines, segs, plain?, tris? ), t1, t2 (map order,
 *          small first), ratio:{p,q}, par:{x,y} | null, direct:{ a_i: { reasons, needs?, role, right? } } (angle pairs
 *          known without the similarity), premises:[a_i ×2] (the canonical two, in row order), given:[id],
 *          givenRows:[givenText entry], text:{ key, vars }, ask: role-letter side | null, asks:[role-letter sides], names }
 */
export function assembleSim(spec, R) {
  const { t1, t2, figure: fig, direct, premises } = spec;
  const facts = {}, just = {}, roles = {};
  const pairAt = (i) => G(Ang(t1[i], [t1[(i + 1) % 3], t1[(i + 2) % 3]]), Ang(t2[i], [t2[(i + 1) % 3], t2[(i + 2) % 3]]), direct[`a${i}`] && direct[`a${i}`].right ? { right: true } : {});
  const ids = ['a0', 'a1', 'a2'], cons = ids.filter((id) => !premises.includes(id));
  const mark = (id, n, color) => ({ ...(direct[id] && direct[id].right ? { right: true } : {}), arcs: n, color });

  if (spec.par) { facts.par = { kind: 'par', x: spec.par.x, y: spec.par.y }; just.par = [{ reasons: ['given'], needs: [] }]; roles.par = 'given'; }
  premises.forEach((id, i) => { facts[id] = { ...pairAt(+id[1]), mark: mark(id, i + 1, i + 1) }; });
  facts.sim = { kind: 'sim', map: t1.map((u, i) => [u, t2[i]]) };
  cons.forEach((id) => { facts[id] = { ...pairAt(+id[1]), mark: mark(id, 3, 3) }; });

  for (const id of ids) if (direct[id]) { just[id] = [{ reasons: [...direct[id].reasons], needs: [...(direct[id].needs || [])] }]; roles[id] = direct[id].role; }
  // the similarity stands on any two angle pairs known without it (the variant's two first: the canonical proof)
  const known = ids.filter((id) => direct[id]), two = [];
  for (let i = 0; i < known.length; i++) for (let j = i + 1; j < known.length; j++) two.push([known[i], known[j]]);
  just.sim = [premises, ...two.filter((x) => !(x.includes(premises[0]) && x.includes(premises[1])))].map((needs) => ({ reasons: ['aa'], needs: [...needs] }));
  roles.sim = 'similarity';
  // the other angle pair follows from the similarity (and, when it is known directly too, that way as well)
  for (const id of cons) {
    just[id] = [{ reasons: ['sim-angles'], needs: ['sim'] }, ...(just[id] || [])];
    if (!direct[id]) roles[id] = 'sim-partner';
  }

  // the ratio row and the number (spec §7.5): with an ask, the two fractions needed + the asked length
  const consequences = [...cons, 'prop'];
  let calc = null;
  if (spec.ask) {
    const all = calcOptions(fig, t1, t2).filter((o) => segKey(o.asked) === segKey(spec.ask)), opts = all.filter((o) => o.distinct);
    if (!all.length) throw new Error(`${spec.family}: cannot ask ${spec.ask}`);
    if (!opts.length) return null;                                     // equal numbers by chance: draw again
    calc = R.pick(opts);
    facts.prop = { kind: 'prop', pairs: calc.pairs.map((x) => [...x]), need: { asked: calc.asked, known: [...new Set([...calc.known, ...calc.pieces])] } };
    facts.val = { kind: 'val', x: calc.asked, v: round2(lenOf(fig, calc.asked)) };
    just.val = [{ reasons: ['solve'], needs: ['prop'] }]; roles.val = 'number';
    consequences.push('val');
  } else {
    const S1 = sidesOf(fig, t1), S2 = sidesOf(fig, t2);
    facts.prop = { kind: 'prop', pairs: [0, 1, 2].map((i) => [S1[i], S2[i]]) };
  }
  just.prop = [{ reasons: ['sim-ratio'], needs: ['sim'] }]; roles.prop = 'ratio';

  // the drawing: every angle of the pairs is tappable (one per angle); the numbers only on the sides the problem uses
  const angles = [];
  for (const id of ids) for (const a of [facts[id].x, facts[id].y]) if (!angles.some((b) => angKey(fig, b) === angKey(fig, a))) angles.push(a);
  const figure = { ...fig, angles, tris: [[...t1], [...t2]], labels: {} };
  const givenText = spec.givenRows.map((g) => ({ ...g, ...(g.vars ? { vars: { ...g.vars } } : {}) }));
  const values = {};
  if (calc) {
    for (const s of calc.pieces) figure.labels[s] = round2(lenOf(fig, s));
    for (const s of [...calc.known, ...calc.pieces]) values[s] = round2(lenOf(fig, s));
    for (const s of calc.pieces) givenText.push({ facts: [], form: 'len', key: 'gv.math', vars: { s: `${s} = ${figure.labels[s]}` } });
  }
  const base = {
    family: spec.family, variant: spec.variant, theorem: 'aa', crossed: !!spec.crossed,
    figure, facts, just, given: [...spec.given], roles,
    // the parallel given first (binding: an angle row between parallels needs it as a row), then a given angle, then the rest
    canon: [...(spec.par ? ['par'] : []), ...premises.filter((x) => spec.given.includes(x)), ...premises.filter((x) => !spec.given.includes(x)), 'sim'],
    sim: 'sim', ratio: { p: spec.ratio.p, q: spec.ratio.q }, consequences, givenText, text: spec.text ? [spec.text] : [],
    asks: [...spec.asks], ...(calc ? { ask: calc.asked, values } : {}),
  };
  return spec.names ? renameSim(base, spec.names) : base;
}

/** kit rename + the similarity extras whose KEYS are letters (labels, values) and the plain strings (ask, asks). */
export function renameSim(base, map) {
  const ch = (s) => s.replace(/[A-Z]/g, (c) => map[c] || c);
  const keys = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [ch(k), v]));
  const b = rename(base, map);
  b.figure.labels = keys(base.figure.labels || {});
  if (base.values) b.values = keys(base.values);
  if (base.ask) b.ask = ch(base.ask);
  b.asks = base.asks.map(ch);
  return b;
}

/* ── number labels: placed by measuring, never on a line (P1 rule) ────────── */
const reachOf = (w, h, d) => Math.abs(d[0]) * w / 2 + Math.abs(d[1]) * h / 2;
const boxOf = (l) => [l.x - l.w / 2, l.y - l.h / 2, l.x + l.w / 2, l.y + l.h / 2];
const inBox = (p, b, e = 0) => p[0] > b[0] - e && p[0] < b[2] + e && p[1] > b[1] - e && p[1] < b[3] + e;
const meet = (p, q) => p[0] < q[2] && q[0] < p[2] && p[1] < q[3] && q[1] < p[3];
const crossZ = (p, q) => p[0] * q[1] - p[1] * q[0];
function segsCross(a, b, c, d) {
  const d1 = crossZ(sub(b, a), sub(c, a)), d2 = crossZ(sub(b, a), sub(d, a)), d3 = crossZ(sub(d, c), sub(a, c)), d4 = crossZ(sub(d, c), sub(b, c));
  return d1 * d2 < 0 && d3 * d4 < 0;
}
function segBoxDist(a, b, box) {
  if (inBox(a, box) || inBox(b, box)) return 0;
  const C = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
  for (let i = 0; i < 4; i++) if (segsCross(a, b, C[i], C[(i + 1) % 4])) return 0;
  const pb = (p) => Math.hypot(Math.max(box[0] - p[0], 0, p[0] - box[2]), Math.max(box[1] - p[1], 0, p[1] - box[3]));
  return Math.min(...C.map((c) => distPointSeg(c, a, b)), pb(a), pb(b));
}
const ARC_ROOM = 5, CLEAR = 2, OWN_GAP = 3;
/* does a box reach into an angle's arc area (its wedge up to the arc radius + room)? */
function inArc(a, box) {
  const full = Math.acos(Math.max(-1, Math.min(1, dot(a.u1, a.u2))));
  const xs = [box[0], (box[0] + box[2]) / 2, box[2]], ys = [box[1], (box[1] + box[3]) / 2, box[3]];
  for (const x of xs) for (const y of ys) {
    const d = sub([x, y], a.v), r = Math.hypot(d[0], d[1]);
    if (r > a.r + ARC_ROOM) continue;
    if (r < 1e-6) return true;
    const w = unit(d), s1 = Math.acos(Math.max(-1, Math.min(1, dot(a.u1, w)))), s2 = Math.acos(Math.max(-1, Math.min(1, dot(w, a.u2))));
    if (s1 + s2 <= full + 0.05) return true;
  }
  return false;
}
/* the segments that contain `seg` (the whole side AB around its piece AD): a label beside AD is beside AB too */
const contains = (P, big, seg) => [seg[0], seg[1]].every((q) => big.n.includes(q) || distPointSeg(P[q], big.a, big.b) < 1e-6) && Math.abs(crossZ(unit(sub(big.b, big.a)), unit(sub(P[seg[1]], P[seg[0]])))) < 1e-6;
/**
 * The number labels of a layout: { labels:[{ seg, text, x, y, w, h }], errors:[…] }. Each sits beside the middle of its
 * own segment (outside the figure when it can), clear of every line, letter, arc, tap centre and other number, and
 * nearer to its own segment than to any other. items = [{ seg, text }].
 */
export function numberLabels(L, items) {
  const P = L.pts, names = Object.keys(P), centre = mul(names.map((n) => P[n]).reduce(add, [0, 0]), 1 / names.length);
  const placed = [], errors = [];
  for (const it of items) {
    const a = P[it.seg[0]], b = P[it.seg[1]], d = unit(sub(b, a)), n0 = [-d[1], d[0]];
    const mid = mul(add(a, b), 0.5), out = dot(n0, sub(mid, centre)) >= 0 ? n0 : mul(n0, -1);
    const w = textW(it.text), h = TH;
    const own = L.segs.find((s) => segKey(s.n.join('')) === segKey(it.seg));
    let best = null;
    search: for (const t of [0.5, 0.42, 0.58, 0.34, 0.66]) for (const side of [out, mul(out, -1)]) for (const gap of [3, 6, 10]) {
      const at = add(add(a, mul(sub(b, a), t)), mul(side, reachOf(w, h, side) + gap));
      const l = { seg: it.seg, text: it.text, x: at[0], y: at[1], w, h }, box = boxOf(l);
      if (box[0] < 0 || box[1] < 0 || box[2] > L.W || box[3] > L.H) continue;
      const mine = own ? segBoxDist(own.a, own.b, box) : Infinity;
      if (L.segs.some((s) => segBoxDist(s.a, s.b, box) < CLEAR)) continue;
      if (L.segs.some((s) => s !== own && !contains(P, s, it.seg) && segBoxDist(s.a, s.b, box) < mine + OWN_GAP)) continue;
      if (L.labels.some((q) => meet(box, boxOf(q))) || placed.some((q) => meet(box, boxOf(q)))) continue;
      if (L.hits.some((x) => inBox(x.c, box, 2))) continue;
      if (L.angles.some((x) => inArc(x, box))) continue;
      best = l; break search;
    }
    if (best) placed.push(best); else errors.push(`no room for the number of ${it.seg}`);
  }
  return { labels: placed, errors };
}
/** The number items of a base: its labels, and '?' on the asked side (its place is kept free too). */
export const numberItems = (base) => [
  ...Object.entries(base.figure.labels || {}).map(([seg, v]) => ({ seg, text: String(v) })),
  ...(base.ask ? [{ seg: base.ask, text: '?' }] : []),
];

/* ── the honesty check for a similarity drawing (spec §7.4) ───────────────── */
const SIM_DEG = 12, PAR_DEG = 12, NEAR2 = 0.15, K_LO = 1.5, K_HI = 3;
const triAngles = (fig, t) => t.map((v, i) => measure(fig, { v, r: [t[(i + 1) % 3], t[(i + 2) % 3]] }));
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const onLine = (P, q, a, b) => Math.abs(crossZ(sub(P[b], P[a]), sub(P[q], P[a]))) <= 1e-9 * dist(P[a], P[b]) * Math.max(1, dist(P[q], P[a]));
/* Which kind of angle pair two angles at parallel lines are, by the geometry: 'corresponding' (same side of the
   transversal, same side of their parallel lines), 'alternate' (opposite sides of the transversal, between the
   parallels), 'other', or null when they are not two angles at the two parallel lines with the transversal as a ray. */
export function parallelKind(fig, f, par) {
  const P = fig.points, v1 = f.x.v, v2 = f.y.v;
  if (v1 === v2) return null;
  const on = (q, s) => onLine(P, q, s[0], s[1]);
  if (!((on(v1, par.x) && on(v2, par.y)) || (on(v1, par.y) && on(v2, par.x)))) return null;
  const u = sub(P[v2], P[v1]), w = sub(P[par.x[1]], P[par.x[0]]);
  const split = (a, v) => {
    const along = a.r.find((q) => onLine(P, q, v1, v2)), other = a.r.find((q) => q !== along);
    if (!along || !other || Math.abs(crossZ(unit(sub(P[other], P[v])), unit(w))) > 1e-6) return null;
    return { s: Math.sign(dot(sub(P[along], P[v]), u)), e: Math.sign(dot(sub(P[other], P[v]), w)) };
  };
  const A = split(f.x, v1), B = split(f.y, v2);
  if (!A || !B) return null;
  if (A.s === B.s && A.e === B.e) return 'corresponding';
  if (A.e !== B.e && A.s > 0 && B.s < 0) return 'alternate';
  return 'other';
}

/** Why a similarity drawing lies; [] = honest. With { quick:true } it stops at the first reason. */
export function liesSim(base, { quick = false } = {}) {
  const out = [];
  const push = (m) => { out.push(m); return quick; };
  const fig = base.figure, facts = base.facts, sim = facts[base.sim || 'sim'];
  if (!sim || sim.kind !== 'sim' || !holds(fig, sim)) { if (push('the similarity is false')) return out; }
  // the ratio: p/q in [1.5, 3], the drawing's sides in that ratio, clear of 2 where another matching could look right
  const k = kOf(base.ratio), t1 = sim.map.map((m) => m[0]), t2 = sim.map.map((m) => m[1]);
  if (!(k >= K_LO - 1e-9 && k <= K_HI + 1e-9)) { if (push(`ratio ${k} outside [1.5, 3]`)) return out; }
  if (base.crossed && Math.abs(k - 2) < NEAR2) { if (push(`ratio ${k} too close to 2`)) return out; }
  const S1 = sidesOf(fig, t1), S2 = sidesOf(fig, t2);
  for (let i = 0; i < 3; i++) if (Math.abs(measure(fig, S2[i]) / measure(fig, S1[i]) - k) > 1e-6 * k) { if (push(`${S2[i]}/${S1[i]} is not ${k}`)) return out; }
  // scalene: the angles of each triangle differ by 12° or more, so no other matching looks right
  const A1 = triAngles(fig, t1), A2 = triAngles(fig, t2);
  for (const [t, A] of [[t1, A1], [t2, A2]]) for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    if (Math.abs(A[i] - A[j]) < SIM_DEG) { if (push(`△${t.join('')} is not clearly scalene`)) return out; }
  }
  for (const q of PERMS.slice(1)) if (Math.max(...[0, 1, 2].map((i) => Math.abs(A1[i] - A2[q[i]]))) < SIM_DEG) { if (push('another matching looks right')) return out; }
  // two tappable angles that are not equal differ by 12° or more
  const angs = [...(fig.angles || []), ...[t1, t2].flatMap((t) => t.map((v, i) => Ang(v, [t[(i + 1) % 3], t[(i + 2) % 3]])))];
  for (let i = 0; i < angs.length; i++) for (let j = i + 1; j < angs.length; j++) {
    const d = Math.abs(measure(fig, angs[i]) - measure(fig, angs[j]));
    if (d > 1e-6 && d < SIM_DEG) { if (push(`∢${angKey(fig, angs[i])} and ∢${angKey(fig, angs[j])} look equal`)) return out; }
  }
  // the parallel lines are parallel; no other two lines look parallel
  const P = fig.points, pars = Object.values(facts).filter((f) => f && f.kind === 'par');
  const segs = [...(fig.segs || []), ...(fig.plain || [])];
  const sameLine = (s, t) => [t[0], t[1]].every((q) => onLine(P, q, s[0], s[1]));
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const s = segs[i], t = segs[j];
    if (sameLine(s, t) || [...s].some((q) => t.includes(q))) continue;
    const c = Math.abs(crossZ(unit(sub(P[s[1]], P[s[0]])), unit(sub(P[t[1]], P[t[0]]))));
    if (Math.asin(Math.min(1, c)) * 180 / Math.PI >= PAR_DEG) continue;
    if (pars.some((f) => (sameLine(f.x, s) && sameLine(f.y, t)) || (sameLine(f.y, s) && sameLine(f.x, t)))) continue;
    if (push(`${s} looks parallel to ${t}`)) return out;
  }
  // a pair of angles between parallel lines carries the reason its geometry gives (corresponding / alternate)
  for (const [id, js] of Object.entries(base.just || {})) for (const j of js) {
    const r = j.reasons.find((x) => x === 'corresponding' || x === 'alternate');
    if (!r) continue;
    const par = facts[j.needs.find((n) => facts[n] && facts[n].kind === 'par')];
    const kind = par ? parallelKind(fig, facts[id], par) : null;
    if (kind !== r) { if (push(`${id}: called ${r}, the drawing says ${kind || 'no angles at the parallel lines'}`)) return out; }
  }
  // the numbers: whole or x.5, drawn to scale, only on drawn pieces
  const labels = fig.labels || {};
  if (Object.keys(labels).length || base.ask) {
    if (!(typeof fig.scale === 'number' && fig.scale > 0)) { if (push('no drawing scale')) return out; }
    for (const [s, v] of Object.entries(labels)) {
      if (!half(v) || v < 1) { if (push(`label ${s} = ${v} is not whole or x.5`)) return out; }
      if (Math.abs(measure(fig, s) * fig.scale - v) > 1e-6 * v) { if (push(`label ${s} = ${v} is not to scale`)) return out; }
      if (piecesOf(fig, s).length > 1) { if (push(`label ${s} is on a side with a point inside`)) return out; }
    }
    if (base.ask && labels[base.ask] != null) { if (push(`the asked side ${base.ask} is labelled`)) return out; }
    const shown = [...Object.values(labels), ...Object.values(facts).filter((f) => f.kind === 'val').map((f) => f.v)];
    if (new Set(shown).size !== shown.length) { if (push('two numbers on the drawing are the same')) return out; }
  }
  for (const f of Object.values(facts)) if (f.kind === 'val' && (!half(f.v) || f.v < 1)) { if (push(`${f.x} = ${f.v} is not whole or x.5`)) return out; }
  // the congruence-family checks (facts hold, looks-equal sides, near-right angles, letters) — after the cheap ones
  const kit = lies(base, { quick });
  if (kit.length) { out.push(...kit); if (quick) return out; }
  // the numbers fit beside their sides
  const items = numberItems(base);
  if (items.length) {
    const L = layout(fig);
    for (const it of items) {
      const len = dist(L.pts[it.seg[0]], L.pts[it.seg[1]]);
      if (len < textW(it.text) + 14) { if (push(`${it.seg} is too short on screen for its number`)) return out; }
    }
    const nl = numberLabels(L, items);
    for (const e of nl.errors) if (push(e)) return out;
  }
  return out;
}

/** Build until the drawing is honest and has room for its marks. */
export function honestSim(build, R, tries = 400) {
  let last = [];
  for (let i = 0; i < tries; i++) {
    const b = build(R);
    if (!b) continue;
    if (liesSim(b, { quick: true }).length) { last = liesSim(b); continue; }
    const c = cramped(b.figure);
    if (!c.length) return b;
    last = c;
  }
  throw new Error(`honestSim: no honest drawing in ${tries} tries (${last.slice(0, 3).join('; ')})`);
}
