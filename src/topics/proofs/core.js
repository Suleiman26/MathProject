/* The proofs section: the checker core. Pure (no React, no window, no Date, no Math.random), so
   `node --test` runs it. Spec §6.2 (statement kinds), §10.1 (problem = figure + fact graph),
   §10.2 (the checker), §7.2–7.4 (what each level presents).

   Parts:      seg 'AO' (two point names, order free) · ang { v:'O', r:['A','C'] } · tri ['A','O','C']
   Statements: { kind:'seg', x, y } | { kind:'ang', x, y, right? } | { kind:'cong', map:[[t1,t2] ×3] }
   A figure:   { points:{A:[x,y]}, lines:[['A','O','B'], …] (collinear sets), segs, angles, tris, motion } */
import { dist, angle, sub, dot } from '../new/chapters/geometry/geo.js';
import { T, fill } from './texts.js';
import { THEOREMS, CP, DEFS, SEEN, REASONS } from './reasons.js';

/* ── keys ─────────────────────────────────────────────────────────────────── */
export const segKey = (seg) => [...seg].sort().join('');
export const triKey = (tri) => [...tri].sort().join('');

/** The ray from v through p, as v + its farthest point: two points on one line of `fig.lines`,
    on the same side of v, give the same key. */
export function rayKey(fig, v, p) {
  const P = fig.points, line = (fig.lines || []).find((l) => l.includes(v) && l.includes(p));
  if (!line || !P[v] || !P[p]) return `${v}>${p}`;
  const d = sub(P[p], P[v]);
  let best = p, far = dist(P[v], P[p]);
  for (const q of line) {
    if (q === v || q === p) continue;
    if (dot(sub(P[q], P[v]), d) > 0 && dist(P[v], P[q]) > far) { best = q; far = dist(P[v], P[q]); }
  }
  return `${v}>${best}`;
}
/** An angle = its vertex + its two rays (unordered). */
export function angKey(fig, ang) {
  const [r1, r2] = ang.r.map((p) => rayKey(fig, ang.v, p).slice(ang.v.length + 1)).sort();
  return `${ang.v}:${r1}${r2}`;
}

/** The kind of a part: 'seg' | 'ang' | 'tri'. */
export const kindOf = (part) => (typeof part === 'string' ? 'seg' : Array.isArray(part) ? 'tri' : 'ang');
/** The parts a statement talks about (a congruence: its two triangles, in map order). */
export function partsOf(st) {
  if (st.kind === 'cong') return [st.map.map((p) => p[0]), st.map.map((p) => p[1])];
  return [st.x, st.y];
}

/** Normal form of a statement (§6.2): equal keys = the same statement. */
export function norm(fig, st) {
  if (st.kind === 'seg') return 'S:' + [segKey(st.x), segKey(st.y)].sort().join('=');
  if (st.kind === 'ang') return 'A:' + [angKey(fig, st.x), angKey(fig, st.y)].sort().join('=');
  if (st.kind === 'cong') return 'C:' + st.map.map((p) => [...p].sort().join('')).sort().join(',');
  throw new Error(`proofs core: unknown statement kind ${st.kind}`);
}

/* ── truth in the coordinates ─────────────────────────────────────────────── */
/** A length, or an angle in degrees. */
export function measure(fig, part) {
  const P = fig.points;
  if (kindOf(part) === 'seg') return dist(P[part[0]], P[part[1]]);
  if (kindOf(part) === 'ang') return angle(P[part.r[0]], P[part.v], P[part.r[1]]);
  throw new Error('proofs core: a triangle has no single measure');
}
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b)) + 1e-12;   // relative
/** True in the coordinates (relative tolerance). A right-angle statement also needs 90°. */
export function holds(fig, st, tol = 1e-6) {
  if (st.kind === 'seg' || st.kind === 'ang') {
    const a = measure(fig, st.x), b = measure(fig, st.y);
    if (!near(a, b, tol)) return false;
    return !(st.kind === 'ang' && st.right) || (near(a, 90, tol) && near(b, 90, tol));
  }
  const P = fig.points, m = st.map;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    if (!near(dist(P[m[i][0]], P[m[j][0]]), dist(P[m[i][1]], P[m[j][1]]), tol)) return false;
  }
  return true;
}

/* ── words ────────────────────────────────────────────────────────────────── */
const angName = (a) => `∢${a.r[0]}${a.v}${a.r[1]}`;
const triName = (t) => `△${t.join('')}`;
/** The maths line of a statement: 'AO = OB', '∢AOC = ∢BOD', '∢ADB = ∢ADC = 90°', '△AOC ≅ △BOD'. */
export function show(st) {
  if (st.kind === 'seg') return `${st.x} = ${st.y}`;
  if (st.kind === 'ang') return `${angName(st.x)} = ${angName(st.y)}${st.right ? ' = 90°' : ''}`;
  const [t1, t2] = partsOf(st);
  return `${triName(t1)} ≅ ${triName(t2)}`;
}
/** A part's name as maths: 'AO', '∢AOC', '△AOC'. */
export const showPart = (part) => (kindOf(part) === 'seg' ? part : kindOf(part) === 'ang' ? angName(part) : triName(part));
/** The statement as a Hebrew sentence (§11.3), for screen readers. */
export function say(st) {
  if (st.kind === 'seg') return fill('say.seg', { x: st.x, y: st.y });
  if (st.kind === 'ang') {
    const v = { x: angName(st.x).slice(1), y: angName(st.y).slice(1) };
    return fill(st.right ? 'say.angRight' : 'say.ang', v);
  }
  const [t1, t2] = partsOf(st);
  return fill('say.cong', { x: t1.join(''), y: t2.join('') });
}

/* ── the fact graph (§10.1) ───────────────────────────────────────────────── */
/** The target fact ids (a list: type 2 asks for three). */
export const targets = (p) => (Array.isArray(p.target) ? [...p.target] : [p.target]);
/** Every fact on ANY justification path to a target (plan D6: another valid path is never "not needed"). */
export function required(p) {
  const out = new Set();
  const visit = (id) => { if (out.has(id)) return; out.add(id); for (const j of p.just[id] || []) j.needs.forEach(visit); };
  targets(p).forEach(visit);
  return out;
}
export function extras(p) { const r = required(p); return new Set(Object.keys(p.facts).filter((id) => !r.has(id))); }
/** The fact a statement names (by normal form), or null. */
export function findFact(p, st) {
  const k = norm(p.figure, st);
  for (const id of Object.keys(p.facts)) if (p.facts[id].kind === st.kind && norm(p.figure, p.facts[id]) === k) return id;
  return null;
}
const within = (needs, done) => needs.every((n) => done.includes(n));
/** Some justification has all its needs written. */
export const provable = (p, done, id) => (p.just[id] || []).some((j) => within(j.needs, done));
export const isDone = (p, done) => targets(p).every((t) => done.includes(t));
/** The id of the congruence fact. */
export const congOf = (p) => p.cong || Object.keys(p.facts).find((id) => p.facts[id].kind === 'cong') || null;
/** A row's role (hints, texts, step labels). */
export function roleOf(p, id) {
  if (p.roles && p.roles[id]) return p.roles[id];
  const f = p.facts[id];
  if (f && f.kind === 'cong') return 'congruence';
  if ((p.just[id] || []).some((j) => j.reasons.some((r) => CP.includes(r)))) return p.type === 'congruent-parts' ? 'partner' : 'conclusion';
  return 'given';
}
/** Every reason that some justification of the fact accepts. */
export const acceptedReasons = (p, id) => [...new Set((p.just[id] || []).flatMap((j) => j.reasons))];
/** The rows as the app writes them: canon order, first reason of the first justification. */
export const canonRows = (p) => p.canon.map((fact) => ({ fact, st: p.facts[fact], reason: p.just[fact][0].reasons[0] }));

/* ── vertex matching ──────────────────────────────────────────────────────── */
/* What to say when a matching is wrong: a shared vertex not matched to itself, or the first vertex
   whose partner is wrong, explained by a side pair that shows the right partner. */
function matchingMiss(p, pairs) {
  const id = congOf(p), M = p.facts[id].map, fig = p.figure;
  const t1 = M.map((m) => m[0]), t2 = M.map((m) => m[1]);
  const mine = pairs.map((m) => m[0]);
  const fwd = triKey(mine) === triKey(t1) || triKey(mine) !== triKey(t2);
  const F = Object.fromEntries(M.map(([u, v]) => (fwd ? [u, v] : [v, u])));
  const shared = t1.filter((q) => t2.includes(q));
  for (const [u, v] of pairs) if (shared.includes(u) && F[u] === u && v !== u) return { textKey: 'st.matchingShared', vars: { p: u } };
  const bad = pairs.find(([u, v]) => F[u] !== v) || pairs[0];
  const pt = bad[0], q = F[pt];
  const others = pairs.map((m) => m[0]).filter((r) => r !== pt && F[r]);
  let s1 = pt + others[0], s2 = q + F[others[0]];
  for (const r of others) {                     // prefer a side pair that is a fact of the problem
    const st = { kind: 'seg', x: pt + r, y: q + F[r] }, fid = findFact(p, st);
    if (fid) { const f = p.facts[fid]; const first = segKey(f.x) === segKey(pt + r); s1 = first ? f.x : f.y; s2 = first ? f.y : f.x; break; }
  }
  return { textKey: 'st.matching', vars: { s1, s2, p: pt, q } };
}
/** Level 3 vertex matching: ok when every (tri1[i], ordered[i]) is a pair of the congruence, read in
    one direction (either triangle may come first). */
export function checkMatching(p, tri1, ordered) {
  const M = p.facts[congOf(p)].map, pairs = tri1.map((u, i) => [u, ordered[i]]);
  const has = (u, v) => M.some((m) => m[0] === u && m[1] === v);
  if (pairs.every(([u, v]) => has(u, v)) || pairs.every(([u, v]) => has(v, u))) return { ok: true };
  return { ok: false, kind: 'wrong-matching', ...matchingMiss(p, pairs) };
}

/* ── family T: what an isosceles triangle gives (lead ruling on review I3) ── */
/* Once AB = AC is known (given or written), the base angles are equal, and the bisector, the median and
   the altitude from the apex are one line (any one of them gives the other two). Phase 1 has no reason
   for that, so such a true fact is a neutral note: never "looks equal", never a wrong try, never an
   error kind for the rescue ladder. Fact ids are family T's pair ids (stable after renaming). */
const APEX = ['aA', 'sBD', 'aD'];
export function isoLater(p, done, id) {
  if (p.family !== 'T' || !p.isosceles || !p.facts[id]) return false;
  const known = (f) => (done || []).includes(f) || (p.given || []).includes(f);
  if (!known('sAB') || known(id)) return false;
  if (id === 'aB') return true;
  return APEX.includes(id) && APEX.some((f) => f !== id && known(f));
}

/* ── classify a statement (§10.2) ─────────────────────────────────────────── */
export function classify(p, done, st) {
  const id = findFact(p, st);
  if (id) {
    if (done.includes(id)) return { c: 'written', fact: id, textKey: 'st.written', vars: {} };
    if (!provable(p, done, id)) {
      const f = p.facts[id];
      if (f.kind === 'cong') {
        const n = Math.max(0, ...(p.just[id] || []).map((j) => j.needs.filter((x) => done.includes(x)).length));
        return { c: 'early', fact: id, sub: 'congruence', kind: 'too-early', textKey: 'st.congEarly', vars: { n } };
      }
      if (isoLater(p, done, id)) return { c: 'iso', fact: id, textKey: 'st.isoLater', vars: {} };
      if (targets(p).includes(id)) return { c: 'early', fact: id, sub: 'target', kind: 'goal-as-known', textKey: 'st.goalEarly', vars: {} };
      return { c: 'early', fact: id, sub: 'consequence', kind: 'looks-equal', textKey: 'st.consEarly', vars: {} };
    }
    if (required(p).has(id)) return { c: 'ok', fact: id };
    return { c: 'extra', fact: id, textKey: p.type === 'congruent-parts' ? 'st.notAsked' : 'st.notNeeded', vars: {} };
  }
  const trap = p.traps && p.traps[norm(p.figure, st)];
  if (trap) return { c: 'false', kind: trap.kind, textKey: trap.textKey, vars: { ...(trap.vars || {}) } };
  if (st.kind === 'cong') {
    const cid = congOf(p);
    if (cid) {
      const [a, b] = partsOf(p.facts[cid]).map(triKey), [x, y] = partsOf(st).map(triKey);
      if ((a === x && b === y) || (a === y && b === x)) return { c: 'false', kind: 'wrong-matching', ...matchingMiss(p, st.map) };
    }
  }
  if (holds(p.figure, st)) return { c: 'unprovable', textKey: 'st.unprovable', vars: {} };
  if (st.kind === 'seg') return { c: 'false', kind: 'false-statement', textKey: 'st.falseSeg', vars: { x: st.x, y: st.y } };
  if (st.kind === 'ang') return { c: 'false', kind: 'false-statement', textKey: 'st.falseAng', vars: { x: showPart(st.x), y: showPart(st.y) } };
  return { c: 'false', kind: 'false-statement', textKey: 'st.matching', ...matchingMiss(p, st.map) };
}

/* ── check a reason (§9.2 "Reason chosen") ────────────────────────────────── */
const miss = (kind, textKey, vars = {}) => ({ ok: false, kind, textKey, vars });
/* wrong theorem: computed from what the justified premises are (count side pairs and angle pairs) */
function theoremMiss(p, done, id, chosen) {
  const js = p.just[id] || [];
  const j = js.find((x) => within(x.needs, done)) || [...js].sort((u, v) => v.needs.filter((n) => done.includes(n)).length - u.needs.filter((n) => done.includes(n)).length)[0];
  const kinds = (j ? j.needs : []).map((n) => p.facts[n].kind);
  const sides = kinds.filter((k) => k === 'seg').length, angles = kinds.filter((k) => k === 'ang').length;
  let key = 'rs.other';
  if (chosen === 'sss') key = sides === 2 ? 'rs.cong.sss2' : sides < 2 ? 'rs.cong.sss1' : 'rs.other';
  else if (sides === 3) key = 'rs.cong.noAngle';
  else if (chosen === 'asa' && angles <= 1) key = 'rs.cong.asa1';
  else if (chosen === 'sas' && sides <= 1) key = 'rs.cong.sas1';
  return miss('wrong-theorem', key);
}
const WORD = (def) => T[`word.${def}`];
export function checkReason(p, done, id, reasonId) {
  if ((p.just[id] || []).some((j) => j.reasons.includes(reasonId) && within(j.needs, done))) return { ok: true };
  const role = roleOf(p, id), f = p.facts[id], acc = acceptedReasons(p, id), r = reasonId;
  if (role === 'congruence') {
    if (THEOREMS.includes(r)) return theoremMiss(p, done, id, r);
    if (r === 'given') return miss('wrong-source', 'rs.cong.given');
    if (CP.includes(r)) return miss('wrong-source', 'rs.cong.cp');
    return miss('wrong-source', 'rs.other');
  }
  if (role === 'conclusion' || role === 'partner') {
    if (r === 'given') return miss('goal-as-known', 'rs.concl.given');
    if (THEOREMS.includes(r)) return miss('wrong-source', role === 'conclusion' ? 'rs.concl.theorem' : 'rs.other');
    if (CP.includes(r) && !acc.includes(r)) {
      const side = f.kind === 'seg', S = T['lbl.sidesWord'], A = T['lbl.anglesWord'];
      return miss('wrong-source', 'rs.concl.otherCp', { these: side ? S : A, those: side ? A : S });
    }
    return miss('wrong-source', 'rs.other');
  }
  // a single fact: given, given in words, or seen in the drawing
  if (THEOREMS.includes(r)) return miss('too-early', 'rs.fact.theorem');
  if (CP.includes(r)) return miss('goal-as-known', 'rs.fact.cp');
  if (role === 'given-words' && DEFS.includes(r)) {
    const def = acc.find((x) => DEFS.includes(x));
    if (def) return miss('wrong-word', 'rs.words.otherDef', { word: WORD(def) });
  }
  if (role === 'given' || role === 'given-more' || role === 'given-words') {
    if (r === 'vertical' && f.kind === 'seg') return miss('wrong-source', 'rs.given.vertical');
    if (r === 'common-side') return miss('wrong-source', 'rs.given.common');
  }
  if (role === 'vertical') {
    if (r === 'given') return miss('wrong-source', 'rs.seen.given');
    if (r === 'alternate') return miss('wrong-source', 'rs.vertical.alternate');
    if (r === 'common-side' || r === 'common-angle') return miss('wrong-source', 'rs.vertical.common');
  }
  if (role === 'common' && r === 'given') return miss('wrong-source', 'rs.seen.given');
  return miss('wrong-source', 'rs.other');
}

/* ── the why-line after a right row (§9.2 "After a right answer") ─────────── */
/** { key, vars } of the why-line of a justified row (`reason` = the reason used, for a congruence). */
export function whyOf(p, id, reason) {
  const f = p.facts[id], role = roleOf(p, id);
  if (role === 'given' || role === 'given-more') return { key: 'why.given', vars: {} };
  if (role === 'given-words') {
    const def = acceptedReasons(p, id).find((r) => DEFS.includes(r));
    return def ? { key: 'why.given-words', vars: { word: T[`word.${def}`], st: show(f) } } : { key: 'why.given', vars: {} };
  }
  if (role === 'vertical') return { key: 'why.vertical', vars: { pt: f.x.v } };
  if (role === 'common') return { key: 'why.common', vars: {} };
  if (role === 'congruence') {
    const th = THEOREMS.includes(reason) ? reason : (p.just[id][0].reasons.find((r) => THEOREMS.includes(r)) || 'sas');
    const [m1, m2, m3] = f.map.map(([u, v]) => `${u} ↔ ${v}`);
    return { key: `why.${th}`, vars: { m1, m2, m3 } };
  }
  // type 2: the letters written in the same places (a side: both its letters; an angle: its vertex)
  if (role === 'partner') return { key: 'why.partner', vars: f.kind === 'ang' ? { p: f.x.v, q: f.y.v } : { p: f.x, q: f.y } };
  return f.kind === 'seg' ? { key: 'why.concl-side', vars: { x: f.x, y: f.y } } : { key: 'why.concl-angle', vars: { x: showPart(f.x), y: showPart(f.y) } };
}

/* ── chips and options ────────────────────────────────────────────────────── */
const shuffled = (R, a) => (R ? R.shuffle(a) : [...a]);
const POOL = ['given', 'vertical', 'common-side', 'common-angle', 'sas', 'asa', 'sss', 'cp-sides', 'cp-angles', 'bisector', 'median', 'midpoint', 'altitude'];
/** n reason chips for a fact: every accepted reason + the most tempting wrong ones for its role,
    shuffled. 'alternate' only on the X figure. Never a chip outside phase 1. */
export function reasonChips(p, id, n, R) {
  const acc = acceptedReasons(p, id), role = roleOf(p, id), f = p.facts[id];
  const X = p.family === 'X', th = p.theorem || 'sas';
  const cp = f.kind === 'seg' ? 'cp-sides' : 'cp-angles', other = cp === 'cp-sides' ? 'cp-angles' : 'cp-sides';
  const tempt = {
    given: ['vertical', 'common-side', th, cp], 'given-more': ['vertical', 'common-side', th, cp],
    'given-words': [...DEFS, 'vertical', 'common-side', th],
    vertical: ['given', 'common-angle', 'common-side', X ? 'alternate' : null, th],
    common: ['given', 'common-angle', 'vertical', th, cp],
    congruence: [...THEOREMS, 'given', 'cp-sides', 'cp-angles'],
    conclusion: [other, 'given', th, 'vertical'], partner: [other, 'given', th, 'vertical'],
  }[role] || [];
  const all = [...new Set([...acc, ...tempt, ...POOL, ...(X ? ['alternate'] : [])])].filter((r) => r && REASONS[r] && (r !== 'alternate' || X));
  return shuffled(R, all.slice(0, Math.max(n, acc.length)));
}
const pairsOf = (list) => { const out = []; for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) out.push([list[i], list[j]]); return out; };
/** Same-kind statements over the figure's tappable parts that are false and no fact (wrong options). */
function falseOptions(p, kind, avoid = []) {
  const fig = p.figure, parts = kind === 'seg' ? fig.segs || [] : fig.angles || [];
  const seen = new Set(avoid.map((s) => norm(fig, s)));
  return pairsOf(parts).map(([x, y]) => ({ kind, x, y })).filter((st) => {
    const k = norm(fig, st);
    if (seen.has(k) || findFact(p, st) || holds(fig, st)) return false;
    seen.add(k); return true;
  });
}
/** A statement gap: n options, exactly one right (the fact itself), the others wrong. */
export function optionsFor(p, id, n = 3, R) {
  const f = p.facts[id];
  let wrong;
  if (f.kind === 'cong') {
    const [t1, t2] = partsOf(f), perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const maps = perms.map((q) => t1.map((u, i) => [u, t2[q[i]]])).filter((m) => norm(p.figure, { kind: 'cong', map: m }) !== norm(p.figure, f));
    wrong = shuffled(R, maps).map((map) => ({ kind: 'cong', map }));
  } else if (p.type === 'congruent-parts') {
    const other = partsOf(p.facts[congOf(p)])[1], k = f.kind;
    const cands = k === 'seg' ? [0, 1, 2].map((i) => other[i] + other[(i + 1) % 3]) : other.map((v, i) => ({ v, r: [other[(i + 1) % 3], other[(i + 2) % 3]] }));
    wrong = cands.map((y) => ({ kind: k, x: f.x, y })).filter((st) => norm(p.figure, st) !== norm(p.figure, f));
  } else {
    const own = ((p.tiles && p.tiles.wrong) || []).filter((w) => w.for === id).map((w) => w.st);
    const near = falseOptions(p, f.kind, [f, ...own]);
    const touches = (st) => [st.x, st.y].some((q) => [f.x, f.y].some((g) => JSON.stringify(g) === JSON.stringify(q)));
    wrong = [...own, ...near.filter(touches), ...near.filter((st) => !touches(st))];
  }
  const pick = R ? [...wrong.slice(0, 1), ...shuffled(R, wrong.slice(1))] : wrong;
  return shuffled(R, [f, ...pick.slice(0, n - 1)]);
}

/* ── what each level presents (§7.2–7.4) ──────────────────────────────────── */
export const TYPE_N = { 'read-given': 1, 'congruent-parts': 2, 'prove-congruence': 3, 'then-conclusion': 4 };
/**
 * present(problem, level, variant, { counted, R }) → view =
 *   { mode:'walk'|'fill'|'tiles'|'tap', known:[factId] (true from the start, no row: type 2's congruence),
 *     pre:[factId] (written + justified at the start; a known fact is pre but gets no row), steps:[{ fact, ask:[…], options?, chips }],
 *     tiles:[{ id, st, fact|null, why? }], chipsN, whyLine, autoHint, shortFirst, plan, ties, letters }
 * Walk and fill modes go through `steps` in order (show rows in canon order); tiles and tap modes
 * accept any valid order.
 */
export function present(p, level, variant, ctx = {}) {
  const n = TYPE_N[p.type] || 3, R = ctx.R, counted = ctx.counted || 0, big = n >= 3;
  const rows = p.canon.filter((f) => f !== congOf(p) || n !== 2);
  const known = n === 2 && congOf(p) ? [congOf(p)] : [];
  const plainGiven = (f) => (p.given || []).includes(f) && roleOf(p, f) === 'given';
  const view = { mode: 'tiles', known, pre: [...known], steps: [], tiles: [], chipsN: 6, whyLine: false, autoHint: false, shortFirst: false, plan: null, ties: false, letters: false };
  const step = (fact, ask, extra = {}) => ({ fact, ask, chips: view.chipsN, ...extra });
  const gap = (fact) => step(fact, ['statement'], { options: optionsFor(p, fact, 3, R) });
  const tile = (st, fact, why) => ({ st, fact, ...(why ? { why } : {}) });
  const target = targets(p)[0];

  if (level === 1) {
    view.whyLine = true; view.autoHint = true; view.letters = n === 2; view.plan = n === 4 ? 'tris' : null;
    if (variant === 'A') {
      view.mode = 'walk'; view.chipsN = 3; view.ties = big;
      const last = rows[rows.length - 1];
      view.steps = rows.map((f) => (big ? step(f, f === congOf(p) ? ['reason'] : []) : f === last ? gap(f) : step(f, [])));
    } else {
      view.mode = 'fill'; view.chipsN = 4;
      if (big) {
        view.pre = rows.filter(plainGiven);
        const gapAt = counted >= 2 ? (n === 3 ? congOf(p) : target) : null;
        view.steps = rows.filter((f) => !view.pre.includes(f)).map((f) => (f === gapAt ? { ...gap(f), ask: ['statement', 'reason'] } : step(f, ['reason'])));
      } else view.steps = rows.map(gap);
    }
    return view;
  }
  const wrongTiles = ((p.tiles && p.tiles.wrong) || []).map((w) => tile(w.st, null, w.why));
  if (level === 2) {
    view.mode = 'tiles'; view.plan = n === 4 ? 'tris' : null;
    if (variant === 'A') {
      view.whyLine = true; view.chipsN = n === 2 ? 4 : 6;
      view.pre = big ? rows.filter((f) => (p.given || []).includes(f)) : [...known];
      const todo = rows.filter((f) => !view.pre.includes(f));
      view.steps = todo.map((f) => step(f, ['statement', 'reason']));
      const extra = n === 1 ? wrongTiles.slice(0, 2) : n === 2 ? wrongTiles.slice(0, 1) : [];
      view.tiles = [...todo.map((f) => tile(p.facts[f], f)), ...extra];
    } else {
      view.chipsN = big ? 8 : 6;
      view.steps = rows.map((f) => step(f, ['statement', 'reason']));
      const extra = big ? wrongTiles.slice(0, 2) : n === 1 ? wrongTiles.slice(0, Math.max(0, 6 - rows.length)) : wrongTiles.slice(0, 3);
      view.tiles = [...rows.map((f) => tile(p.facts[f], f)), ...extra];
    }
    view.tiles = shuffled(R, view.tiles).map((t, i) => ({ id: `t${i}`, ...t }));
    return view;
  }
  view.mode = 'tap'; view.chipsN = null;                     // all reasons, two-step pick
  view.steps = rows.map((f) => step(f, ['statement', 'reason']));
  if (variant === 'A') { view.whyLine = true; view.plan = big ? 'line' : null; } else view.shortFirst = true;
  return view;
}
/** How many decisions a view asks for (a statement and its reason are two). */
export const decisionsOf = (view) => view.steps.reduce((s, x) => s + x.ask.length, 0);
