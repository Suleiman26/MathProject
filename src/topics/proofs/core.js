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
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
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
