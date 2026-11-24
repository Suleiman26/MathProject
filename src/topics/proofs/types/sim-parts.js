/* Similarity level 1 "מדמיון לשוויונות ויחס" (spec 2026-11-23 §7.6, mirrors congruence type 2): △ADE ∼ △ABC is
   given in vertex order (and the drawing). The student writes two equal angle pairs (the partner of each named
   angle) and the ratio of the matching sides AD/AB = AE/AC = DE/BC. A common angle (∢DAE = ∢BAC is one angle) is
   never asked. Families P (entry, variant A) and B. Wrong tiles: the angle in the same place in the drawing / the next
   letter (each with a trap that explains the matching), and a flipped ratio.
   make(R, level, variant, avoid, ctx) → problem (§10.1); ctx.only pins a template. Pure: randomness only through R. */
import { seeded, makeR } from '../../new/core.js';
import { T } from '../texts.js';
import { holds, norm, angKey } from '../core.js';
import { sidesOf } from '../families/sim-kit.js';
import { SIM_FAMS, pickSim, givenSim, simGivenLine, propWrongs } from './sim-tools.js';

const TEMPLATES = [
  { id: '6-P', family: 'P', variant: 'P-CC', theorem: 'aa', crossed: false },
  { id: '6-B', family: 'B', variant: 'B-VA', theorem: 'aa', crossed: false },
];
const PLACE = ['lbl.place1', 'lbl.place2', 'lbl.place3'];

/* where a point sits inside its triangle, relative to the triangle's centre and size */
function placeIn(P, q, tri) {
  const c = [0, 1].map((k) => tri.reduce((s, x) => s + P[x][k], 0) / 3);
  const size = Math.max(...tri.map((x) => Math.hypot(P[x][0] - c[0], P[x][1] - c[1])));
  return [(P[q][0] - c[0]) / size, (P[q][1] - c[1]) / size];
}

function buildFrom(t, seed, level, variant) {
  const r = makeR(seeded(seed));
  const base = SIM_FAMS[t.family].build(r, t.variant, {}), fig = base.figure, P = fig.points;
  const M = base.facts.sim.map, F = Object.fromEntries(M), t1 = M.map((m) => m[0]), t2 = M.map((m) => m[1]);
  const ids = ['a0', 'a1', 'a2'];
  const askable = ids.filter((id) => angKey(fig, base.facts[id].x) !== angKey(fig, base.facts[id].y));   // never a common angle
  const asked = r.shuffle(askable).slice(0, 2).sort();
  const rest = ids.filter((id) => !asked.includes(id));
  const { facts, just, roles } = givenSim(base, [...asked, ...rest]);

  // wrong partners of the asked angles (every one has a trap that explains the matching) and a flipped ratio
  const all = [], traps = {};
  for (const id of asked) {
    const f = facts[id], at = (q) => placeIn(P, q, t1), there = (q) => placeIn(P, q, t2);
    const cands = t2.filter((v) => v !== f.y.v).map((v) => ({ v, r: t2.filter((x) => x !== v) }));
    const near = (v) => { const a = at(f.x.v), b = there(v); return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    const byPlace = [f.y, ...cands].sort((u, w) => near(u.v) - near(w.v))[0];
    for (const y of cands) {
      const st = { kind: 'ang', x: structuredClone(f.x), y };
      if (holds(fig, st, 1e-6) || Object.values(facts).some((q) => q.kind === 'ang' && norm(fig, q) === norm(fig, st))) continue;
      const p = f.x.v;
      traps[norm(fig, st)] = { kind: 'wrong-matching', textKey: 'st.partner', vars: { p, q: F[p], place: T[PLACE[t1.indexOf(p)]] } };
      all.push({ st, why: y === byPlace ? 'position' : 'next-letter', for: id });
    }
  }
  const problem = {
    id: `${t.id}:${seed}`, type: 'sim-parts', template: t.id, seed, level, variant,
    family: t.family, theorem: 'aa', crossed: false, figure: fig, facts, just, roles,
    given: ['sim'], target: [...asked, 'prop'], canon: ['sim', ...asked, 'prop'], sim: 'sim', consequences: rest,
    ratio: { ...base.ratio }, text: base.text, givenText: [{ ...simGivenLine }],
    // where to look while a row is open: the named angle; for the ratio, the sides of the first triangle
    cue: { ...Object.fromEntries(asked.map((id) => [id, [facts[id].x]])), prop: sidesOf(fig, t1) },
    traps, meta: null,
  };
  const pick = (why, used) => all.find((x) => x.why === why && !used.includes(x)) || null;
  const first = pick('position', []), second = pick('next-letter', [first]) || all.find((x) => x !== first) || null;
  problem.tiles = { wrong: [first, ...propWrongs(problem, 1), second].filter(Boolean) };
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
  id: 'sim-parts', n: 6, name: T['type.sim-parts'], button: `6. ${T['type.sim-parts']}`,
  warm: ['S5', 'S2', 'S3', 'W2'], templates: TEMPLATES, make, remake,
  subject: 'similarity', label: T['type.sim-parts'], shape: 'parts', live: true,
};
