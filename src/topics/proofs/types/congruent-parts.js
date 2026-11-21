/* Type 2 "מחפיפה לשוויונות" (spec §6.5, §7.4): the congruence △… ≅ △… is given "(החפיפה לפי סדר
   הקודקודים)"; the task asks for the partner of three named parts (at least one side and one
   angle). No marks in the drawing at the start. 6 templates:
     2-a two separate triangles, ABC / DEF order (entry: A variants) · 2-b separate, the second
     triangle not written in alphabetical order (△ABC ≅ △EFD) · 2-c separate, the second mirrored and
     turned (its position misleads) · 2-d X (△AOC ≅ △BOD: a vertex matches itself) · 2-e K
     (△ABC ≅ △ADC: two vertices match themselves) · 2-f Z (△ABC ≅ △CDA: A ↔ C, C ↔ A).
   Every pair of matching parts is a fact justified by cp-sides / cp-angles from the congruence; the
   three asked ones are the targets, the other three are "true but not asked". A shared side
   (AC = AC) is never asked. Wrong tiles: the part in the same position in the drawing, the part with
   the next letter, an angle ↔ side mix-up; every wrong partner has a trap that explains the matching.
   make(R, level, variant, avoid, ctx) → problem (§10.1); ctx.only pins a template. Pure. */
import { seeded, makeR } from '../../new/core.js';
import { T } from '../texts.js';
import { norm, holds, segKey, partsOf, kindOf } from '../core.js';
import { pickNames } from '../families/kit.js';
import { pickTemplate } from './tiles.js';
import X from '../families/x.js'; import K from '../families/k.js'; import Z from '../families/z.js';
import TWO from '../families/two.js';

const TEMPLATES = [
  { id: '2-a', family: '2', variant: '2-a', theorem: null },
  { id: '2-b', family: '2', variant: '2-b', theorem: null },
  { id: '2-c', family: '2', variant: '2-c', theorem: null },
  { id: '2-d', family: 'X', variant: '2-d', theorem: null },
  { id: '2-e', family: 'K', variant: '2-e', theorem: null },
  { id: '2-f', family: 'Z', variant: '2-f', theorem: null },
];
const PLACE = ['lbl.place1', 'lbl.place2', 'lbl.place3'];

/* the family drawing of a template (the family's own pairs and congruence; theorem and premises unused) */
function baseOf(t, r, names) {
  if (t.family === 'X') return X.build(r, 'X-SAS', names ? { names } : {});
  if (t.family === 'K') return K.build(r, 'K-SSS', names ? { names } : {});
  if (t.family === 'Z') return Z.build(r, 'Z-SSS', names ? { names } : {});
  let nm = names || pickNames(r, 6);
  if (t.id === '2-b' && !names) {                         // the second triangle written out of alphabetical order
    const [d, e, f] = nm.slice(3), sorted = [d, e, f].sort().join('');
    const perms = [[d, e, f], [d, f, e], [e, d, f], [e, f, d], [f, d, e], [f, e, d]].filter((q) => q.join('') !== sorted);
    nm = [...nm.slice(0, 3), ...r.pick(perms)];
  }
  return TWO.build(r, '2-SSS', { names: nm, mirror: t.id === '2-c', turn: true });
}

/* where a part sits inside its triangle, relative to the triangle's centre and size (raw coordinates) */
function placeIn(fig, part, tri) {
  const P = fig.points, c = [0, 1].map((k) => tri.reduce((s, q) => s + P[q][k], 0) / 3);
  const size = Math.max(...tri.map((q) => Math.hypot(P[q][0] - c[0], P[q][1] - c[1])));
  const at = kindOf(part) === 'seg' ? [0, 1].map((k) => (P[part[0]][k] + P[part[1]][k]) / 2) : P[part.v];
  return [(at[0] - c[0]) / size, (at[1] - c[1]) / size];
}

function buildFrom(t, seed, level, variant, names) {
  const r = makeR(seeded(seed));
  const base = baseOf(t, r, names), fig = base.figure;
  const M = base.facts.cong.map, F = Object.fromEntries(M), t1 = M.map((m) => m[0]), t2 = M.map((m) => m[1]);
  const at = (q) => t1.indexOf(q);
  // the six pairs, the second part written in matching order (AB ↔ EF, ∢ABC ↔ ∢EFD)
  const pairs = {};
  for (const [id, f] of Object.entries(base.facts)) {
    if (f.kind === 'cong') continue;
    const y = f.kind === 'seg' ? [...f.x].map((q) => F[q]).join('') : { v: F[f.x.v], r: f.x.r.map((q) => F[q]) };
    const st = { kind: f.kind, x: structuredClone(f.x), y };
    if (norm(fig, st) !== norm(fig, f)) throw new Error(`type 2: pair ${id} does not follow the matching`);
    pairs[id] = st;
  }
  const self = (st) => st.kind === 'seg' && segKey(st.x) === segKey(st.y);
  const ids = Object.keys(pairs), askable = ids.filter((id) => !self(pairs[id]));
  let asked;
  do { asked = r.shuffle(askable).slice(0, 3); } while (!asked.some((id) => pairs[id].kind === 'seg') || !asked.some((id) => pairs[id].kind === 'ang'));
  const rest = ids.filter((id) => !asked.includes(id));

  // marks: only the asked rows are ever written; colours 1–3 in the asked order, ticks / arcs counted per kind
  let ticks = 0, arcs = 0;
  const facts = { cong: { kind: 'cong', map: M.map((m) => [...m]) } }, just = { cong: [{ reasons: ['given'], needs: [] }] }, roles = { cong: 'congruence' };
  [...asked, ...rest].forEach((id, i) => {
    const st = pairs[id], color = (i % 3) + 1;
    facts[id] = { ...st, mark: st.kind === 'seg' ? { ticks: ++ticks > 3 ? 1 : ticks, color } : { arcs: ++arcs > 3 ? 1 : arcs, color } };
    just[id] = [{ reasons: [st.kind === 'seg' ? 'cp-sides' : 'cp-angles'], needs: ['cong'] }];
    roles[id] = 'partner';
  });

  // wrong partners (every one gets a trap; three become tiles)
  const all = [], traps = {};
  const sidesOf = (tri) => [0, 1, 2].map((i) => tri[i] + tri[(i + 1) % 3]);
  const angAt = (tri, v) => { const o = tri.filter((q) => q !== v); return { v, r: o }; };
  for (const id of asked) {
    const f = facts[id], right = f.y;
    const cands = f.kind === 'seg' ? sidesOf(t2).filter((s) => segKey(s) !== segKey(right)) : t2.filter((v) => v !== right.v).map((v) => angAt(t2, v));
    const near = (part) => { const a = placeIn(fig, f.x, t1), b = placeIn(fig, part, t2); return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    const byPlace = [right, ...cands].sort((u, w) => near(u) - near(w))[0];
    for (const y of cands) {
      const st = { kind: f.kind, x: structuredClone(f.x), y };
      if (holds(fig, st, 1e-6) || Object.values(pairs).some((q) => norm(fig, q) === norm(fig, st))) continue;    // never call a true statement false
      // the vertex whose partner is wrong, for the explanation
      const xs = f.kind === 'seg' ? [...f.x] : [f.x.v], ys = f.kind === 'seg' ? [...y] : [y.v];
      const p = xs.find((q) => !ys.includes(F[q])) || xs[0];
      const mix = f.kind === 'seg' ? !y.includes(F[f.x[0]]) : y.v === F[f.x.r[0]];
      const why = y === byPlace ? 'position' : mix ? 'kind-mix' : 'next-letter';
      const key = norm(fig, st);
      traps[key] = { kind: 'wrong-matching', textKey: 'st.partner', vars: { p, q: F[p], place: T[PLACE[at(p)]] } };
      all.push({ st, why, for: id });
    }
  }
  const wrong = [], usedFor = new Set();
  for (const why of ['position', 'next-letter', 'kind-mix']) {
    const c = all.find((x) => x.why === why && !wrong.includes(x) && !usedFor.has(x.for)) || all.find((x) => x.why === why && !wrong.includes(x));
    if (c) { wrong.push(c); usedFor.add(c.for); }
  }
  for (const c of all) if (wrong.length < 3 && !wrong.includes(c) && !usedFor.has(c.for)) { wrong.push(c); usedFor.add(c.for); }
  for (const c of all) if (wrong.length < 3 && !wrong.includes(c)) wrong.push(c);

  return {
    id: `${t.id}:${seed}`, type: 'congruent-parts', template: t.id, seed, level, variant,
    family: t.family, theorem: null, figure: fig, facts, just, roles,
    given: ['cong'], target: asked, canon: ['cong', ...asked], cong: 'cong', consequences: rest,
    text: base.text, givenText: [{ facts: ['cong'], form: 'eq', byOrder: true }],
    cue: Object.fromEntries(asked.map((id) => [id, [facts[id].x]])),        // where to look while the partner is open: the asked part only
    tiles: { wrong: wrong.map((w) => ({ st: w.st, why: w.why, for: w.for })) }, traps,
    meta: names ? { names } : null,
  };
}

function make(R, level, variant, avoid = { recent: [], last: null }, ctx = {}) {
  let pool = variant === 'A' ? TEMPLATES.filter((t) => t.id === '2-a') : TEMPLATES.filter((t) => t.id !== '2-a');   // 2-a is the entry template
  if (ctx.only) pool = TEMPLATES.filter((t) => t.id === ctx.only);
  const t = pickTemplate(R, pool, avoid, { ...ctx, want: null }, []), seed = R.int(1, 2147483646);
  return buildFrom(t, seed, level, variant, ctx.names || null);
}
/** Rebuild a problem from itself or from a snapshot's meta ({ template, seed, level, variant, meta }). */
function remake(x) {
  const t = TEMPLATES.find((q) => q.id === x.template);
  if (!t || !Number.isFinite(x.seed)) return null;
  return buildFrom(t, x.seed, x.level, x.variant, (x.meta && x.meta.names) || null);
}
/** The parts of an asked fact that the drawing may show while its partner is still open. */
export const cueOf = (p, id) => (p.cue && p.cue[id]) || partsOf(p.facts[id]);

export default {
  id: 'congruent-parts', n: 2, name: T['type.congruent-parts'], button: `2. ${T['type.congruent-parts']}`,
  warm: ['W5'], templates: TEMPLATES, make, remake,
};
