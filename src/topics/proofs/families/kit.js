/* The family kit: names, turn/mirror, the honesty check ("the drawing must not lie", spec §6.6
   tests 1–5) and the assembly of a family base (facts, justifications, roles, marks, given lines).
   Pure: randomness comes in as R (makeR(seeded(n)) from ../../new/core.js).

   A family base = { family, variant, theorem, isosceles?, figure, facts, just, given, canon, roles,
     cong:'cong', consequences:[factId ×3], givenText, text }.  Fact ids are the family's pair ids
   (stable per family), plus 'cong'. */
import { measure, holds, norm, angKey, triKey, rayKey, segKey } from '../core.js';
import { layout, labelErrors } from '../figure-core.js';

/* ── names ────────────────────────────────────────────────────────────────── */
// letter sets without look-alikes (no I, no O, no Q, no U/V together) that spell nothing; a window of
// consecutive letters is taken, so the order inside a set never makes a word
const SETS = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['K', 'L', 'M', 'N', 'P', 'R'],
  ['E', 'F', 'G', 'H', 'K', 'L'],
  ['K', 'P', 'N', 'S', 'T', 'R'],
  ['S', 'T', 'R', 'M', 'N', 'K'],
  ['P', 'R', 'S', 'T', 'K', 'M'],
];
/** n letters; with { crossing:true } the LAST one is 'O' (the crossing point) and n − 1 come from a set. */
export function pickNames(R, n, { crossing = false } = {}) {
  const k = crossing ? n - 1 : n;
  if (k > 6) throw new Error('pickNames: at most 6 letters');
  const set = R.bool(0.45) ? SETS[0] : R.pick(SETS);      // the familiar A, B, C… is the most common
  const at = R.int(0, set.length - k), out = set.slice(at, at + k);
  return crossing ? [...out, 'O'] : out;
}

/** Turn in steps of 15°, optional mirror (about the y axis). */
export function place(points, R) {
  const t = R.int(0, 23) * 15 * Math.PI / 180, flip = R.bool(), c = Math.cos(t), s = Math.sin(t);
  const out = {};
  for (const [k, [x0, y]] of Object.entries(points)) { const x = flip ? -x0 : x0; out[k] = [x * c - y * s, x * s + y * c]; }
  return out;
}

/** Rename every point letter in a base (figure, facts, sentence variables). */
export function rename(base, map) {
  const ch = (s) => s.replace(/[A-Z]/g, (c) => map[c] || c);
  const deep = (v) => (typeof v === 'string' ? ch(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);
  const fig = base.figure, points = {};
  for (const [k, p] of Object.entries(fig.points)) points[ch(k)] = p;
  const { points: _, ...rest } = fig;
  return {
    ...base,
    figure: { ...deep(rest), points },
    facts: deep(base.facts),
    givenText: base.givenText.map((g) => (g.vars ? { ...g, vars: deep(g.vars) } : g)),
    text: (base.text || []).map((t) => ({ ...t, vars: deep(t.vars || {}) })),
  };
}

/* ── the honesty check ────────────────────────────────────────────────────── */
const MIN_LEN = 0.08, MIN_DEG = 6, RIGHT_GAP = 6, ISO = 0.08;
const relDiff = (a, b) => Math.abs(a - b) / Math.max(a, b);
/** The parts of a premise mapped by the congruence (t1 → t2), or null when they do not correspond. */
function corresponds(fig, st, F, t1, t2) {
  if (st.kind === 'seg') {
    for (const [x, y] of [[st.x, st.y], [st.y, st.x]]) {
      if ([...x].every((q) => t1.includes(q)) && segKey([...x].map((q) => F[q]).join('')) === segKey(y) && [...y].every((q) => t2.includes(q))) return { kind: 'seg', ends: [...x] };
    }
    return null;
  }
  const angAt = (a, t) => { if (!t.includes(a.v)) return null; const o = t.filter((q) => q !== a.v); return angKey(fig, { v: a.v, r: o }) === angKey(fig, a) ? o : null; };
  for (const [x, y] of [[st.x, st.y], [st.y, st.x]]) {
    const o = angAt(x, t1);
    if (o && angKey(fig, { v: F[x.v], r: o.map((q) => F[q]) }) === angKey(fig, y) && t2.includes(F[x.v])) return { kind: 'ang', v: x.v };
  }
  return null;
}
/** Why a drawing (a family base or a whole problem) lies; [] = honest. With { quick:true } it stops
    at the first reason (and measures the letters last), for rejection sampling. */
export function lies(base, { quick = false } = {}) {
  try { return liesOf(base, quick); } catch (e) { if (e === STOP) return ['(stopped at the first reason)']; throw e; }
}
const STOP = Symbol('stop');
function liesOf(base, quick) {
  const found = [], fig = base.figure, facts = base.facts;
  const out = { push: (...m) => { found.push(...m); if (quick && found.length) throw STOP; } };
  // 1. every listed fact is true in the coordinates
  for (const [id, f] of Object.entries(facts)) if (!holds(fig, f, 1e-6)) out.push(`fact ${id} is false`);
  // angles known to be right: a right-angle fact, or an angle equality that is exactly 90° in the
  // coordinates (type 4 states ∢ADB = ∢ADC without "= 90°": only the equality follows from the congruence)
  const is90 = (a) => Math.abs(measure(fig, a) - 90) < 1e-6;
  const right = new Set(Object.values(facts).filter((f) => f.kind === 'ang' && (f.right || (is90(f.x) && is90(f.y)))).flatMap((f) => [angKey(fig, f.x), angKey(fig, f.y)]));
  // 2. same-kind tappable parts that are not a fact look clearly different (a pair that is exactly
  //    equal is not a lie: it is true, and the checker answers it as "true, no reason in our list")
  const keys = new Set(Object.values(facts).map((f) => norm(fig, f)));
  const segs = fig.segs || [], angs = fig.angles || [];
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const st = { kind: 'seg', x: segs[i], y: segs[j] };
    if (!keys.has(norm(fig, st)) && relDiff(measure(fig, segs[i]), measure(fig, segs[j])) < MIN_LEN && !holds(fig, st)) out.push(`${segs[i]} looks equal to ${segs[j]}`);
  }
  for (let i = 0; i < angs.length; i++) for (let j = i + 1; j < angs.length; j++) {
    const st = { kind: 'ang', x: angs[i], y: angs[j] };
    if (angKey(fig, angs[i]) === angKey(fig, angs[j])) continue;
    if (right.has(angKey(fig, angs[i])) && right.has(angKey(fig, angs[j]))) continue;     // both known to be 90°
    if (!keys.has(norm(fig, st)) && Math.abs(measure(fig, angs[i]) - measure(fig, angs[j])) < MIN_DEG && !holds(fig, st)) out.push(`∢${angKey(fig, angs[i])} looks equal to ∢${angKey(fig, angs[j])}`);
  }
  // 3. no angle near 90° unless it is a right-angle fact; no triangle near isosceles
  const allAngs = [...angs, ...(fig.tris || []).flatMap((t) => t.map((v, i) => ({ v, r: [t[(i + 1) % 3], t[(i + 2) % 3]] })))];
  for (const a of allAngs) if (!right.has(angKey(fig, a)) && Math.abs(measure(fig, a) - 90) < RIGHT_GAP) out.push(`∢${angKey(fig, a)} looks right`);
  for (const t of fig.tris || []) {
    const s = [0, 1, 2].map((i) => measure(fig, t[i] + t[(i + 1) % 3]));
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (relDiff(s[i], s[j]) < ISO) out.push(`△${t.join('')} looks isosceles`);
  }
  // 4. the premises fit the theorem and agree with one vertex matching
  const cid = base.cong || 'cong', cong = facts[cid];
  if (cong && base.just && base.just[cid]) {
    const F = Object.fromEntries(cong.map.map(([u, v]) => [u, v])), t1 = cong.map.map((m) => m[0]), t2 = cong.map.map((m) => m[1]);
    for (const j of base.just[cid]) {
      const th = j.reasons[0], prem = j.needs.map((n) => corresponds(fig, facts[n], F, t1, t2));
      if (prem.some((x) => !x)) { out.push(`a premise of ${th} does not follow the matching`); continue; }
      const S = prem.filter((x) => x.kind === 'seg'), A = prem.filter((x) => x.kind === 'ang');
      if (th === 'sss' && S.length !== 3) out.push('sss needs three side pairs');
      if (th === 'sas' && !(S.length === 2 && A.length === 1 && S.every((x) => x.ends.includes(A[0].v)))) out.push('sas: the angle is not between the sides');
      if (th === 'asa' && !(S.length === 1 && A.length === 2 && A.every((x) => S[0].ends.includes(x.v)))) out.push('asa: the side is not between the angles');
    }
  }
  // 5. letters: none on a line, all inside, none over a tap target's centre
  out.push(...labelErrors(layout(fig)));
  return found;
}

/* ── room for the marks ───────────────────────────────────────────────────── */
const MIN_TRI_DEG = 20, MIN_INRADIUS = 17, MIN_SEG = 34;      // degrees; pixels of the 320 × 196 view
/** Why a drawing is too thin for its marks (ticks, arcs and the goal echo would crowd); [] = roomy. */
export function cramped(fig) {
  const out = [], L = layout(fig), P = L.pts, d = (a, b) => Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]);
  for (const t of fig.tris || []) {
    for (let i = 0; i < 3; i++) if (measure(fig, { v: t[i], r: [t[(i + 1) % 3], t[(i + 2) % 3]] }) < MIN_TRI_DEG) out.push(`△${t.join('')} has a sliver angle at ${t[i]}`);
    const s = [d(t[0], t[1]), d(t[1], t[2]), d(t[2], t[0])], per = s[0] + s[1] + s[2], h = per / 2;
    const area = Math.sqrt(Math.max(0, h * (h - s[0]) * (h - s[1]) * (h - s[2])));
    if ((2 * area) / per < MIN_INRADIUS) out.push(`△${t.join('')} is too thin on screen`);
  }
  for (const s of fig.segs || []) if (d(s[0], s[1]) < MIN_SEG) out.push(`${s} is too short on screen`);
  return out;
}

/** Build until the drawing is honest and has room for its marks. */
export function honest(build, R, tries = 400) {
  let last = [];
  for (let i = 0; i < tries; i++) {
    const b = build(R);
    if (lies(b, { quick: true }).length) { last = lies(b); continue; }
    const c = cramped(b.figure);
    if (!c.length) return b;
    last = c;
  }
  throw new Error(`honest: no honest drawing in ${tries} tries (${last.slice(0, 3).join('; ')})`);
}

/* ── assembling a base ────────────────────────────────────────────────────── */
export const S = (x, y) => ({ kind: 'seg', x, y });
export const Ang = (v, r) => ({ v, r });
export const G = (x, y, extra = {}) => ({ kind: 'ang', x, y, ...extra });
/** Is a word allowed by opts.words (true = any; a list = only those met)? */
export const wordOk = (opts, word) => opts.words === true || (Array.isArray(opts.words) && opts.words.includes(word));

/**
 * spec = { family, variant, theorem, isosceles?, figure (role names), pairs:{id: st}, cong:map,
 *          premises:[id ×3 in reading order], free:{ id, reason } | null, words:[option] | null,
 *          text:{ key, vars }, names:{ role → letter } }
 * option (a given sentence in words) = { facts:[id], word, key, vars }
 */
export function assemble(spec, R) {
  const { pairs, premises, free } = spec;
  const facts = {}, just = {}, roles = {};
  const consequences = Object.keys(pairs).filter((id) => !premises.includes(id));
  let ticks = 0, arcs = 0;
  const mark = (st, color) => (st.kind === 'seg' ? { ticks: ++ticks, color } : st.right ? { right: true, arcs: ++arcs, color } : { arcs: ++arcs, color });
  premises.forEach((id, i) => { facts[id] = { ...pairs[id], mark: mark(pairs[id], i + 1) }; });
  facts.cong = { kind: 'cong', map: spec.cong };
  consequences.forEach((id, i) => { facts[id] = { ...pairs[id], mark: mark(pairs[id], i + 1) }; });

  const given = premises.filter((id) => !free || id !== free.id);
  const words = spec.words || null, inWords = new Set(words ? words.flatMap((w) => w.facts) : []);
  for (const id of given) {
    const w = words && words.find((o) => o.facts.includes(id));
    just[id] = [{ reasons: w ? [w.word, 'given'] : ['given'], needs: [] }];
    roles[id] = w ? 'given-words' : 'given';
  }
  if (free) { just[free.id] = [{ reasons: [free.reason], needs: [] }]; roles[free.id] = free.reason === 'vertical' ? 'vertical' : 'common'; }
  just.cong = [{ reasons: [spec.theorem], needs: [...premises] }];
  roles.cong = 'congruence';
  for (const id of consequences) { just[id] = [{ reasons: [pairs[id].kind === 'seg' ? 'cp-sides' : 'cp-angles'], needs: ['cong'] }]; roles[id] = 'conclusion'; }

  const givenText = [];
  for (const id of given) {
    if (inWords.has(id)) continue;
    givenText.push({ facts: [id], form: 'eq' });
  }
  for (const w of words || []) givenText.push({ facts: [...w.facts], form: 'words', word: w.word, key: w.key, vars: { ...w.vars } });
  const base = {
    family: spec.family, variant: spec.variant, theorem: spec.theorem,
    ...(spec.isosceles ? { isosceles: true } : {}),
    figure: spec.figure, facts, just, given, canon: [...premises, 'cong'], roles,
    cong: 'cong', consequences, givenText: R.shuffle(givenText), text: spec.text ? [spec.text] : [],
  };
  return spec.names ? rename(base, spec.names) : base;
}

/** role letters → the drawn names (opts.names wins). */
export function nameMap(roles, R, opts = {}, crossing = false) {
  const names = opts.names || pickNames(R, roles.length, { crossing });
  return Object.fromEntries(roles.map((r, i) => [r, names[i]]));
}
export { rayKey, triKey };
