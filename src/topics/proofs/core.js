/* The proofs section: the checker core. Pure (no React, no window, no Date, no Math.random), so
   `node --test` runs it. Spec §6.2 (statement kinds), §10.1 (problem = figure + fact graph),
   §10.2 (the checker), §7.2–7.4 (what each level presents).

   Parts:      seg 'AO' (two point names, order free) · ang { v:'O', r:['A','C'] } · tri ['A','O','C']
   Statements: { kind:'seg', x, y } | { kind:'ang', x, y, right? } | { kind:'cong', map:[[t1,t2] ×3] }
               similarity (spec 2026-11-23 §7.2): { kind:'par', x, y } (DE ∥ BC) | { kind:'sim', map } (△ADE ∼ △ABC)
               | { kind:'prop', pairs:[[num, den] ×2–3] } (AD/AB = DE/BC) | { kind:'val', x, v } (DE = 6)
   A figure:   { points:{A:[x,y]}, lines:[['A','O','B'], …] (collinear sets), segs, angles, tris, motion,
                 scale? (length units per drawing unit: a `val` needs it) } */
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
  if (st.kind === 'cong' || st.kind === 'sim') return [st.map.map((p) => p[0]), st.map.map((p) => p[1])];
  if (st.kind === 'prop') return st.pairs.flat();
  if (st.kind === 'val') return [st.x];
  return [st.x, st.y];
}
const mapKey = (map) => map.map((p) => [...p].sort().join('')).sort().join(',');
/* A proportion as a set of fractions, direction-free as a whole: the statement and its all-flipped twin give
   the same key (the smaller of the two), a mixed direction gives another one. */
function propKey(pairs) {
  const one = (flip) => pairs.map(([a, b]) => (flip ? `${segKey(b)}/${segKey(a)}` : `${segKey(a)}/${segKey(b)}`)).sort().join(',');
  const [u, v] = [one(false), one(true)];
  return u < v ? u : v;
}

/** Normal form of a statement (§6.2): equal keys = the same statement. */
export function norm(fig, st) {
  if (st.kind === 'seg') return 'S:' + [segKey(st.x), segKey(st.y)].sort().join('=');
  if (st.kind === 'ang') return 'A:' + [angKey(fig, st.x), angKey(fig, st.y)].sort().join('=');
  if (st.kind === 'cong') return 'C:' + mapKey(st.map);
  if (st.kind === 'sim') return 'M:' + mapKey(st.map);
  if (st.kind === 'par') return 'P:' + [segKey(st.x), segKey(st.y)].sort().join('|');
  if (st.kind === 'prop') return 'R:' + propKey(st.pairs);
  if (st.kind === 'val') return 'V:' + segKey(st.x) + '=' + Number(st.v);
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
  const P = fig.points;
  if (st.kind === 'par') {
    const d1 = sub(P[st.x[1]], P[st.x[0]]), d2 = sub(P[st.y[1]], P[st.y[0]]);
    return Math.abs(d1[0] * d2[1] - d1[1] * d2[0]) <= tol * Math.hypot(...d1) * Math.hypot(...d2);
  }
  if (st.kind === 'prop') {
    const r = st.pairs.map(([a, b]) => measure(fig, a) / measure(fig, b));
    return r.every((x) => near(x, r[0], tol));
  }
  if (st.kind === 'val') return typeof fig.scale === 'number' && near(measure(fig, st.x) * fig.scale, Number(st.v), tol);
  const m = st.map;
  if (st.kind === 'sim') {                                     // the three angle pairs equal (side ratios follow)
    const at = (i, s) => angle(P[m[(i + 1) % 3][s]], P[m[i][s]], P[m[(i + 2) % 3][s]]);
    return [0, 1, 2].every((i) => near(at(i, 0), at(i, 1), tol));
  }
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    if (!near(dist(P[m[i][0]], P[m[j][0]]), dist(P[m[i][1]], P[m[j][1]]), tol)) return false;
  }
  return true;
}

/* ── words ────────────────────────────────────────────────────────────────── */
const angName = (a) => `∢${a.r[0]}${a.v}${a.r[1]}`;
const triName = (t) => `△${t.join('')}`;
/** The maths line of a statement: 'AO = OB', '∢AOC = ∢BOD', '∢ADB = ∢ADC = 90°', '△AOC ≅ △BOD',
    'DE ∥ BC', '△ADE ∼ △ABC', 'AD/AB = DE/BC' (one left-to-right island), 'DE = 6'. */
export function show(st) {
  if (st.kind === 'seg') return `${st.x} = ${st.y}`;
  if (st.kind === 'ang') return `${angName(st.x)} = ${angName(st.y)}${st.right ? ' = 90°' : ''}`;
  if (st.kind === 'par') return `${st.x} ∥ ${st.y}`;
  if (st.kind === 'prop') return st.pairs.map(([a, b]) => `${a}/${b}`).join(' = ');
  if (st.kind === 'val') return `${st.x} = ${st.v}`;
  const [t1, t2] = partsOf(st);
  return `${triName(t1)} ${st.kind === 'sim' ? '∼' : '≅'} ${triName(t2)}`;
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
  if (st.kind === 'par') return fill('say.par', { x: st.x, y: st.y });
  if (st.kind === 'prop') return fill('say.prop', { x: show(st) });
  if (st.kind === 'val') return fill('say.val', { x: st.x, v: st.v });
  const [t1, t2] = partsOf(st);
  return fill(st.kind === 'sim' ? 'say.sim' : 'say.cong', { x: t1.join(''), y: t2.join('') });
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
/** The id of the congruence fact (congruence-only code: the motion, the congruence warm-ups). */
export const congOf = (p) => p.cong || Object.keys(p.facts).find((id) => p.facts[id].kind === 'cong') || null;
/** The id of the problem's anchor relation: its congruence or its similarity (same as congOf on a congruence problem). */
export const anchorOf = (p) => p.cong || p.sim || Object.keys(p.facts).find((id) => p.facts[id].kind === 'cong' || p.facts[id].kind === 'sim') || null;
const isAnchor = (st) => st && (st.kind === 'cong' || st.kind === 'sim');
/** A row's role (hints, texts, step labels). */
export function roleOf(p, id) {
  if (p.roles && p.roles[id]) return p.roles[id];
  const f = p.facts[id];
  if (f && f.kind === 'cong') return 'congruence';
  if ((p.just[id] || []).some((j) => j.reasons.some((r) => CP.includes(r)))) return shapeOf(p) === 'parts' ? 'partner' : 'conclusion';
  return 'given';
}
/** Every reason that some justification of the fact accepts. */
export const acceptedReasons = (p, id) => [...new Set((p.just[id] || []).flatMap((j) => j.reasons))];
/** The rows as the app writes them: canon order, first reason of the first justification. */
export const canonRows = (p) => p.canon.map((fact) => ({ fact, st: p.facts[fact], reason: p.just[fact][0].reasons[0] }));

/* ── vertex matching ──────────────────────────────────────────────────────── */
/* What to say when a matching is wrong (review I4). A shared vertex not matched to itself; otherwise the
   first vertex whose partner is wrong AND that can be explained ONLY by what is known already (the given and the rows
   written: never a consequence the congruence will prove), with an argument that is valid:
     1. a known equal-angle pair at that vertex and its partner ("∢ABC = ∢DEF, so B matches E");
     2. two known side pairs that meet at that vertex (their common ends match);
     3. one known side pair from that vertex whose other end the student already matched right.
   Nothing known fits → a general sentence that is always true (no vertex named).
   A similarity (spec 2026-11-23 §7.2): its sides are not equal, so only rule 1 (and the shared vertex) applies.
   `facts` = the fact ids the sentence cites (tests). */
function matchingMiss(p, pairs, done = []) {
  const id = anchorOf(p), M = p.facts[id].map, fig = p.figure, eqSides = p.facts[id].kind === 'cong';
  const t1 = M.map((m) => m[0]), t2 = M.map((m) => m[1]);
  const mine = pairs.map((m) => m[0]);
  const fwd = triKey(mine) === triKey(t1) || triKey(mine) !== triKey(t2);
  const F = Object.fromEntries(M.map(([u, v]) => (fwd ? [u, v] : [v, u])));
  const shared = t1.filter((q) => t2.includes(q));
  for (const [u, v] of pairs) if (shared.includes(u) && F[u] === u && v !== u) return { textKey: 'st.matchingShared', vars: { p: u }, facts: [] };
  const plain = { textKey: 'st.matchingPlain', vars: {}, facts: [] };
  const T1 = fwd ? t1 : t2, T2 = fwd ? t2 : t1;                                        // the student's first triangle, its partner
  if (pairs.some(([u]) => !F[u])) return plain;
  const right = (u) => pairs.some(([a, b]) => a === u && b === F[u]);
  const known = [...new Set([...(p.given || []), ...done])].filter((f) => p.facts[f] && (p.facts[f].kind === 'seg' || p.facts[f].kind === 'ang'));
  const angAt = (tri, v) => ({ v, r: tri.filter((x) => x !== v) });
  // a known fact, oriented so its first part is in T1 and maps onto the second: { f, kind, a, b, st }
  const oriented = (f) => {
    const st = p.facts[f];
    for (const [x, y] of [[st.x, st.y], [st.y, st.x]]) {
      if (st.kind === 'seg') {
        if (eqSides && [...x].every((c) => T1.includes(c)) && segKey([...x].map((c) => F[c]).join('')) === segKey(y)) return { f, kind: 'seg', a: x, b: y, st: { kind: 'seg', x, y } };
      } else if (T1.includes(x.v) && F[x.v] === y.v && angKey(fig, x) === angKey(fig, angAt(T1, x.v)) && angKey(fig, y) === angKey(fig, angAt(T2, y.v))) {
        return { f, kind: 'ang', a: x, b: y, st: { kind: 'ang', x, y } };
      }
    }
    return null;
  };
  const facts = known.map(oriented).filter(Boolean);
  // the first wrong vertex that the known facts explain
  for (const [pt] of pairs.filter(([u, v]) => F[u] !== v)) {
    const q = F[pt];
    const ang = facts.find((k) => k.kind === 'ang' && k.a.v === pt);
    if (ang) return { textKey: 'st.matchingAng', vars: { st: show(ang.st), p: pt, q }, facts: [ang.f] };
    const sides = facts.filter((k) => k.kind === 'seg' && k.a.includes(pt) && segKey(k.a) !== segKey(k.b));
    if (sides.length >= 2) return { textKey: 'st.matchingTwo', vars: { st1: show(sides[0].st), st2: show(sides[1].st), p: pt, q }, facts: [sides[0].f, sides[1].f] };
    for (const k of sides) {
      const r = [...k.a].find((c) => c !== pt);
      if (r && right(r)) return { textKey: 'st.matchingSide', vars: { st: show(k.st), r, s: F[r], p: pt, q }, facts: [k.f] };
    }
  }
  return plain;
}
/** Level 3 vertex matching: ok when every (tri1[i], ordered[i]) is a pair of the congruence, read in
    one direction (either triangle may come first). `done` = the rows written (for the explanation). */
export function checkMatching(p, tri1, ordered, done = []) {
  const M = p.facts[anchorOf(p)].map, pairs = tri1.map((u, i) => [u, ordered[i]]);
  const has = (u, v) => M.some((m) => m[0] === u && m[1] === v);
  if (pairs.every(([u, v]) => has(u, v)) || pairs.every(([u, v]) => has(v, u))) return { ok: true };
  return { ok: false, kind: 'wrong-matching', ...matchingMiss(p, pairs, done) };
}

/* ── a proportion, checked by rule (spec 2026-11-23 §7.2, binding) ───────────── */
/* Right when every fraction pairs a side of one triangle with its matching side of the other (from the
   similarity's vertex map), all fractions point the same way and there are at least two different ones; in a
   calculation (`need = { asked, known }`) one fraction holds the asked side and another has both sides known.
   The form with the ratio INSIDE each triangle (AD/DE = AB/BC) is true: a neutral note, never a wrong try. */
const pmiss = (kind, textKey) => ({ ok: false, kind, textKey, vars: {} });
export function checkProp(p, st, { need } = {}) {
  const sid = anchorOf(p), S = sid && p.facts[sid];
  if (!S || S.kind !== 'sim') return pmiss('non-matching-sides', 'st.propNoSim');
  const t1 = S.map.map((m) => m[0]), t2 = S.map.map((m) => m[1]), F = Object.fromEntries(S.map);
  const inT = (t, s) => s.length === 2 && s[0] !== s[1] && t.includes(s[0]) && t.includes(s[1]);
  const img = (s) => segKey(F[s[0]] + F[s[1]]);             // a side of the first triangle → its match in the second
  const fr = st.pairs || [];
  const dirs = fr.map(([a, b]) => [inT(t1, a) && img(a) === segKey(b) ? 'f' : null, inT(t1, b) && img(b) === segKey(a) ? 'b' : null].filter(Boolean));
  if (dirs.some((d) => !d.length)) {
    // the ratio inside each triangle: every fraction lies in one triangle, all say the same once mapped to the second
    const reads = fr.map(([a, b]) => [inT(t1, a) && inT(t1, b) ? { k: `${img(a)}/${img(b)}`, from: 1 } : null, inT(t2, a) && inT(t2, b) ? { k: `${segKey(a)}/${segKey(b)}`, from: 2 } : null].filter(Boolean));
    const inside = fr.length >= 2 && reads.every((r) => r.length) && reads[0].some(({ k }) => {
      const at = reads.map((r) => r.filter((x) => x.k === k).map((x) => x.from));
      return at.every((x) => x.length) && at.some((x, i) => x.includes(1) && at.some((y, j) => j !== i && y.includes(2)));
    });
    return inside ? { note: 'st.propInside' } : pmiss('non-matching-sides', 'st.nonMatchingSides');
  }
  const way = ['f', 'b'].find((w) => dirs.every((d) => d.includes(w)));
  if (!way) return pmiss('ratio-flip', 'st.ratioFlip');
  const sideOf = ([a, b]) => segKey(way === 'f' ? a : b);
  if (new Set(fr.map(sideOf)).size !== fr.length || fr.length < 2) return pmiss('non-matching-sides', 'st.propSame');
  if (need) {
    const K = new Set((need.known || []).map(segKey)), has = (f, s) => f.some((x) => segKey(x) === segKey(s));
    const i = fr.findIndex((f) => has(f, need.asked));                  // the asked side's partner must be known too (else two unknowns)
    if (i < 0 || !fr[i].every((x) => segKey(x) === segKey(need.asked) || K.has(segKey(x))) || !fr.some((f, j) => j !== i && f.every((x) => K.has(segKey(x))))) return pmiss('prop-need', 'st.propNeed');
  }
  return { ok: true };
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
const extraOf = (p, id) => ({ c: 'extra', fact: id, textKey: shapeOf(p) === 'parts' ? 'st.notAsked' : 'st.notNeeded', vars: {} });
export function classify(p, done, st) {
  let id = findFact(p, st);
  if (!id && st.kind === 'prop') {                     // by rule (§7.2), then the problem's proportion row
    const props = Object.keys(p.facts).filter((f) => p.facts[f].kind === 'prop');
    const row = props.find((f) => !done.includes(f)) || props[0];
    const r = checkProp(p, st, { need: row && p.facts[row].need });
    if (r.note) return { c: 'note', textKey: r.note, vars: {} };
    if (!r.ok) return { c: 'false', kind: r.kind, textKey: r.textKey, vars: { ...(r.vars || {}) } };
    if (!row) return extraOf(p, null);
    id = row;
  }
  if (!id && st.kind === 'sim') {                      // tested in the drawing first (§7.2): true on the same triangles = the similarity
    const aid = anchorOf(p), a = aid && p.facts[aid];
    if (a && a.kind === 'sim' && holds(p.figure, st)) {
      const [x, y] = partsOf(a).map(triKey), [u, v] = partsOf(st).map(triKey);
      if ((x === u && y === v) || (x === v && y === u)) id = aid;
    }
  }
  if (id) {
    if (done.includes(id)) return { c: 'written', fact: id, textKey: 'st.written', vars: {} };
    if (!provable(p, done, id)) {
      const f = p.facts[id];
      if (isAnchor(f)) {
        const n = Math.max(0, ...(p.just[id] || []).map((j) => j.needs.filter((x) => done.includes(x)).length));
        if (f.kind === 'sim') return { c: 'early', fact: id, sub: 'similarity', kind: 'too-early', textKey: 'st.simEarly', vars: { n } };
        return { c: 'early', fact: id, sub: 'congruence', kind: 'too-early', textKey: 'st.congEarly', vars: { n } };
      }
      if (isoLater(p, done, id)) return { c: 'iso', fact: id, textKey: 'st.isoLater', vars: {} };
      if (targets(p).includes(id)) return { c: 'early', fact: id, sub: 'target', kind: 'goal-as-known', textKey: 'st.goalEarly', vars: {} };
      const simP = (p.facts[anchorOf(p)] || {}).kind === 'sim';
      return { c: 'early', fact: id, sub: 'consequence', kind: 'looks-equal', textKey: simP ? 'st.consEarlySim' : 'st.consEarly', vars: {} };
    }
    if (required(p).has(id)) return { c: 'ok', fact: id };
    return extraOf(p, id);
  }
  const trap = p.traps && p.traps[norm(p.figure, st)];
  if (trap) return { c: 'false', kind: trap.kind, textKey: trap.textKey, vars: { ...(trap.vars || {}) } };
  if (isAnchor(st)) {
    const cid = anchorOf(p);
    if (cid && p.facts[cid].kind === st.kind) {
      const [a, b] = partsOf(p.facts[cid]).map(triKey), [x, y] = partsOf(st).map(triKey);
      if ((a === x && b === y) || (a === y && b === x)) return { c: 'false', kind: 'wrong-matching', ...matchingMiss(p, st.map, done) };
    }
  }
  if (holds(p.figure, st)) return { c: 'unprovable', textKey: 'st.unprovable', vars: {} };
  if (st.kind === 'seg') return { c: 'false', kind: 'false-statement', textKey: 'st.falseSeg', vars: { x: st.x, y: st.y } };
  if (st.kind === 'ang') return { c: 'false', kind: 'false-statement', textKey: 'st.falseAng', vars: { x: showPart(st.x), y: showPart(st.y) } };
  if (st.kind === 'par') return { c: 'false', kind: 'false-statement', textKey: 'st.falsePar', vars: { x: st.x, y: st.y } };
  if (st.kind === 'val') return { c: 'false', kind: 'calc', textKey: 'st.falseVal', vars: { x: st.x, v: st.v } };
  if (!anchorOf(p)) return { c: 'false', kind: 'false-statement', textKey: 'st.matchingPlain', vars: {} };
  return { c: 'false', kind: 'false-statement', ...matchingMiss(p, st.map, done) };
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
/** { key, vars, law? } of the why-line of a justified row (`reason` = the reason used, for a congruence).
    law = the theorem or definition the row stands on (spec 2026-11-23 §6.2.3): the UI writes its full sentence
    (REASONS[law].full) after the line. Rows that stand on the given or on a rule have none. */
export function whyOf(p, id, reason) {
  const f = p.facts[id], role = roleOf(p, id);
  if (role === 'given' || role === 'given-more') return { key: 'why.given', vars: {} };
  if (role === 'given-words') {
    const def = acceptedReasons(p, id).find((r) => DEFS.includes(r));
    return def ? { key: 'why.given-words', vars: { word: T[`word.${def}`], st: show(f) }, law: def } : { key: 'why.given', vars: {} };
  }
  if (role === 'vertical') return { key: 'why.vertical', vars: { pt: f.x.v }, law: 'vertical' };
  if (role === 'common') return { key: 'why.common', vars: {} };
  if (role === 'congruence') {
    const th = THEOREMS.includes(reason) ? reason : (p.just[id][0].reasons.find((r) => THEOREMS.includes(r)) || 'sas');
    const m = f.map.map(([u, v]) => `${u} ↔ ${v}`).join(', ');      // one island: it never breaks into a garbled line (RTL)
    return { key: `why.${th}`, vars: { m }, law: th };
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
  const own = () => ((p.tiles && p.tiles.wrong) || []).filter((w) => w.for === id).map((w) => w.st);
  if (isAnchor(f)) {
    const [t1, t2] = partsOf(f), perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const maps = perms.map((q) => t1.map((u, i) => [u, t2[q[i]]])).filter((m) => norm(p.figure, { kind: f.kind, map: m }) !== norm(p.figure, f)
      && (f.kind === 'cong' || !holds(p.figure, { kind: 'sim', map: m })));
    wrong = shuffled(R, maps).map((map) => ({ kind: f.kind, map }));
  } else if (f.kind === 'prop') {
    // a flipped fraction (ratio-flip) first, then sides moved to the wrong fraction (non-matching), never a right one
    const n = f.pairs.length, at = (i, pr) => ({ kind: 'prop', pairs: f.pairs.map((x, j) => (j === i ? pr : x)) });
    const flips = f.pairs.map(([a, b], i) => at(i, [b, a]));
    const moved = f.pairs.map(([a], i) => ({ kind: 'prop', pairs: f.pairs.map(([x, y], j) => (j === i ? [a, f.pairs[(i + 1) % n][1]] : j === (i + 1) % n ? [x, f.pairs[i][1]] : [x, y])) }));
    const seen = new Set([norm(p.figure, f)]);
    wrong = [...own(), ...flips.slice(-1), ...moved, ...flips.slice(0, -1)].filter((st) => {
      const k = norm(p.figure, st), r = checkProp(p, st);
      if (seen.has(k) || r.ok || r.note) return false;
      seen.add(k); return true;
    });
  } else if (f.kind === 'par' || f.kind === 'val') {
    wrong = own();                                             // a number's chips come from its family (§7.5)
  } else if (shapeOf(p) === 'parts') {
    const other = partsOf(p.facts[anchorOf(p)])[1], k = f.kind;
    const cands = k === 'seg' ? [0, 1, 2].map((i) => other[i] + other[(i + 1) % 3]) : other.map((v, i) => ({ v, r: [other[(i + 1) % 3], other[(i + 2) % 3]] }));
    wrong = cands.map((y) => ({ kind: k, x: f.x, y })).filter((st) => norm(p.figure, st) !== norm(p.figure, f));
  } else {
    const mine = own();
    const near = falseOptions(p, f.kind, [f, ...mine]);
    const touches = (st) => [st.x, st.y].some((q) => [f.x, f.y].some((g) => JSON.stringify(g) === JSON.stringify(q)));
    wrong = [...mine, ...near.filter(touches), ...near.filter((st) => !touches(st))];
  }
  const pick = R ? [...wrong.slice(0, 1), ...shuffled(R, wrong.slice(1))] : wrong;
  return shuffled(R, [f, ...pick.slice(0, n - 1)]);
}

/* ── what each level presents (§7.2–7.4) ──────────────────────────────────── */
/* How a problem is laid out (spec 2026-11-23 §11): 'given' (read the given) · 'parts' (from a known congruence to
   equalities) · 'side' (from a ratio to a missing side) · 'prove' (prove the congruence/similarity) · 'then' (prove,
   then a conclusion) · 'exam'. A problem may carry its own `shape`; else it follows its type id (also for a problem
   rebuilt from a saved snapshot). Kept here, not read from types/, so core.js never imports the types (they import it).
   Every type's `shape` field must match this (subjects.test.mjs); unknown types count as 'prove'. */
const SHAPE = { 'read-given': 'given', 'congruent-parts': 'parts', 'prove-congruence': 'prove', 'then-conclusion': 'then' };
export const shapeOf = (p) => (p && p.shape) || SHAPE[p && p.type] || 'prove';
/**
 * present(problem, level, variant, { counted, R }) → view =
 *   { mode:'walk'|'fill'|'tiles'|'tap', known:[factId] (true from the start, no row: type 2's congruence),
 *     pre:[factId] (written + justified at the start; a known fact is pre but gets no row), steps:[{ fact, ask:[…], options?, chips }],
 *     tiles:[{ id, st, fact|null, why? }], chipsN, whyLine, autoHint, shortFirst, plan, ties, letters }
 * Walk and fill modes go through `steps` in order (show rows in canon order); tiles and tap modes
 * accept any valid order.
 */
export function present(p, level, variant, ctx = {}) {
  const shape = shapeOf(p), R = ctx.R, counted = ctx.counted || 0;
  const given = shape === 'given', parts = shape === 'parts', then = shape === 'then', big = !given && !parts;
  const rows = p.canon.filter((f) => f !== anchorOf(p) || !parts);
  const known = parts && anchorOf(p) ? [anchorOf(p)] : [];
  const plainGiven = (f) => (p.given || []).includes(f) && roleOf(p, f) === 'given';
  const view = { mode: 'tiles', known, pre: [...known], steps: [], tiles: [], chipsN: 6, whyLine: false, autoHint: false, shortFirst: false, plan: null, ties: false, letters: false };
  const step = (fact, ask, extra = {}) => ({ fact, ask, chips: view.chipsN, ...extra });
  const gap = (fact) => step(fact, ['statement'], { options: optionsFor(p, fact, 3, R) });
  const tile = (st, fact, why) => ({ st, fact, ...(why ? { why } : {}) });
  const target = targets(p)[0];

  if (level === 1) {
    view.whyLine = true; view.autoHint = true; view.letters = parts; view.plan = then ? 'tris' : null;
    if (variant === 'A') {
      view.mode = 'walk'; view.chipsN = 3; view.ties = big;
      const last = rows[rows.length - 1];
      view.steps = rows.map((f) => (big ? step(f, f === anchorOf(p) ? ['reason'] : []) : f === last ? gap(f) : step(f, [])));
    } else {
      view.mode = 'fill'; view.chipsN = 4;
      if (big) {
        view.pre = rows.filter(plainGiven);
        const gapAt = counted >= 2 ? (shape === 'prove' ? anchorOf(p) : target) : null;
        view.steps = rows.filter((f) => !view.pre.includes(f)).map((f) => (f === gapAt ? { ...gap(f), ask: ['statement', 'reason'] } : step(f, ['reason'])));
      } else view.steps = rows.map(gap);
    }
    return view;
  }
  const wrongTiles = ((p.tiles && p.tiles.wrong) || []).map((w) => tile(w.st, null, w.why));
  if (level === 2) {
    view.mode = 'tiles'; view.plan = then ? 'tris' : null;
    if (variant === 'A') {
      view.whyLine = true; view.chipsN = parts ? 4 : 6;
      view.pre = big ? rows.filter((f) => (p.given || []).includes(f)) : [...known];
      const todo = rows.filter((f) => !view.pre.includes(f));
      view.steps = todo.map((f) => step(f, ['statement', 'reason']));
      const extra = given ? wrongTiles.slice(0, 2) : parts ? wrongTiles.slice(0, 1) : [];
      view.tiles = [...todo.map((f) => tile(p.facts[f], f)), ...extra];
    } else {
      view.chipsN = big ? 8 : 6;
      view.steps = rows.map((f) => step(f, ['statement', 'reason']));
      const extra = big ? wrongTiles.slice(0, 2) : given ? wrongTiles.slice(0, Math.max(0, 6 - rows.length)) : wrongTiles.slice(0, 3);
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
