/* The proofs section: the warm-up ("חימום", spec §7.1). Seven single-skill task kinds W1–W7 and the
   flow rule (4 tasks, two more of each missed kind, hard cap 8; it never blocks). Pure: randomness
   only through R; no React, no window. Results never touch the mastery history.

   task = { kind, text:{ k, vars }, figure, facts:{ id: statement + mark }, marks:[id] (drawn from the
     start), reveal:[id] (drawn once answered), goal?:id (drawn dashed), input:'chips'|'tap',
     options?:[{ id, label? | m? | st? }], tap?:{ kinds, need:[partId] }, answer, why:{ k, vars },
     st? (the statement asked about), sent? ({ key, vars }: the given sentence, W7),
     given?:[statement] (the chips of the "נתון:" line), trap? (W4) }
   Every figure comes from the proof generators, so it is already honest (§6.6).

   Similarity (spec 2026-11-23 §7.7): S1–S5, built from the similarity families P and B (honest by liesSim). S1 asks
   the reason of a marked angle pair (common / vertical / corresponding / alternate, as the geometry gives it); S2 the
   partner of a vertex or side in a written similarity; S3 the side opposite the equal angle, from the marks only;
   S4 a bare proportion (no drawing: figure null; pairs with one 'x', input 'keypad', answer a number); S5 whether two
   polygons with equal angles are similar (two triangles: yes; two rectangles: not necessarily). */
import { T } from './texts.js';
import { REASONS } from './reasons.js';
import { RULES } from './mastery.js';
import { show, norm, segKey, angKey, congOf, targets, measure, isoLater } from './core.js';
import { partId } from './figure-core.js';
import { bare, plain } from './types/tiles.js';
import readGiven from './types/read-given.js';
import congruentParts from './types/congruent-parts.js';
import proveCongruence from './types/prove-congruence.js';
import thenConclusion from './types/then-conclusion.js';
import TWO from './families/two.js';
import { SIM_FAMS } from './types/sim-tools.js';
import { K_ALL, lengths, triangle } from './families/sim-kit.js';
import { pickNames, Ang, G, cramped } from './families/kit.js';
import { layout, labelErrors } from './figure-core.js';
import { numberOf } from './session.js';

export const KINDS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'S1', 'S2', 'S3', 'S4', 'S5'];
const NONE = { recent: [], last: null };
const freeOf = (p) => Object.keys(p.roles).find((id) => p.roles[id] === 'vertical' || p.roles[id] === 'common') || null;
const pickFacts = (p, ids) => Object.fromEntries(ids.map((id) => [id, p.facts[id]]));
const why = (kind) => ({ k: `w.${kind}.why`, vars: {} });
/* where a task's statement comes from (the problem can be rebuilt with its type's remake(); tests) */
const srcOf = (p, fact) => ({ type: p.type, template: p.template, seed: p.seed, level: p.level, variant: p.variant, meta: p.meta || null, fact });

/* W1: "נתון: AO = OB. געו בציור בשני הקטעים האלה." */
function w1(R) {
  for (let i = 0; i < 200; i++) {
    const p = proveCongruence.make(R, 1, 'A', NONE, {});
    const ids = p.given.filter((id) => p.facts[id].kind === 'seg' && segKey(p.facts[id].x) !== segKey(p.facts[id].y));
    if (!ids.length) continue;
    const id = R.pick(ids), f = p.facts[id], need = [partId(f.x), partId(f.y)];
    return { kind: 'W1', text: { k: 'w.W1', vars: { st: show(f) } }, figure: p.figure, facts: pickFacts(p, [id]), marks: [], reveal: [id],
      input: 'tap', tap: { kinds: ['seg'], need }, answer: [...need], why: why('W1') };
  }
  throw new Error('warm-up W1: no given segment pair');
}

/* W2: "ידוע, או רק נראה כך?" — a given (marked) statement, or a true one that is not known yet.
   Family T: what the isosceles triangle gives is never the "looks" answer (review I3: it is known, by a theorem we skip in phase 1). */
function w2(R) {
  for (let i = 0; i < 200; i++) {
    const p = proveCongruence.make(R, 1, R.bool() ? 'A' : 'B', NONE, {}), known = R.bool();
    const looks = p.consequences.filter((c) => !isoLater(p, p.given, c));
    if (!known && !looks.length) continue;
    const id = known ? R.pick(p.given) : R.pick(looks), st = known ? bare(p.facts[id]) : plain(p.facts[id]);
    return { kind: 'W2', text: { k: 'w.W2', vars: { st: show(st) } }, st, src: srcOf(p, id), figure: p.figure, facts: pickFacts(p, p.given), marks: [...p.given], reveal: [],
      given: p.given.map((id) => bare(p.facts[id])), input: 'chips',
      options: [{ id: 'known', label: T['w.W2.known'] }, { id: 'looks', label: T['w.W2.looks'] }], answer: known ? 'known' : 'looks', why: why('W2') };
  }
  throw new Error('warm-up W2: no statement');
}

/* W3: "איזה שוויון ידוע מהציור עצמו, בלי נתון?" — the shared side / the vertical angles, a given, a consequence */
function w3(R) {
  for (let i = 0; i < 200; i++) {
    const p = proveCongruence.make(R, 1, 'B', NONE, {}), free = freeOf(p);
    if (!free) continue;
    const sts = [bare(p.facts[free]), bare(p.facts[R.pick(p.given)]), plain(p.facts[R.pick(p.consequences)])];
    const options = R.shuffle(sts.map((st) => ({ id: norm(p.figure, st), st })));
    return { kind: 'W3', text: { k: 'w.W3', vars: {} }, figure: p.figure, facts: pickFacts(p, [...p.given, free]), marks: [...p.given], reveal: [free],
      given: p.given.map((id) => bare(p.facts[id])), input: 'chips', options, answer: norm(p.figure, sts[0]), why: why('W3') };
  }
  throw new Error('warm-up W3: no figure with a seen fact');
}

/* W4: "איזה משפט חפיפה מתאים לסימונים?" — two separate triangles with three marked pairs; the two traps:
   the angle is not between the two sides, and three angle pairs (answer: אי אפשר לקבוע).
   "Not between" is asked only when it is truly side-side-angle ambiguous (review I2): the angle is
   opposite the SHORTER of the two marked sides, so a second, visibly different triangle has the same
   three marks. Opposite the longer side the triangles would be congruent (צ.צ.ז, the 4th theorem). */
const SETS = {
  sas: [['sAB', 'aB', 'sBC'], ['sCA', 'aA', 'sAB'], ['sBC', 'aC', 'sCA']],
  asa: [['aA', 'sAB', 'aB'], ['aB', 'sBC', 'aC'], ['aC', 'sCA', 'aA']],
  sss: [['sAB', 'sBC', 'sCA']],
  'not-between': [['sAB', 'sBC', 'aA'], ['sAB', 'sBC', 'aC'], ['sCA', 'sAB', 'aB'], ['sCA', 'sAB', 'aC'], ['sBC', 'sCA', 'aA'], ['sBC', 'sCA', 'aB']],
  'three-angles': [['aA', 'aB', 'aC']],
};
const SSA_SHORTER = 0.9, SSA_APART = 0.25;      // opposite side ≤ 90% of the other; the two triangles' third vertices this far apart (× that side)
/** Side-side-angle with two real, visibly different triangles (the angle's vertex v, adjacent side b, opposite side a). */
export function ssaAmbiguous(fig, facts, ids) {
  const sts = ids.map((id) => facts[id]), ang = sts.find((f) => f.kind === 'ang'), sides = sts.filter((f) => f.kind === 'seg').map((f) => f.x);
  if (!ang || sides.length !== 2) return false;
  const v = ang.x.v, adj = sides.find((x) => x.includes(v)), opp = sides.find((x) => !x.includes(v));
  if (!adj || !opp) return false;
  const a = measure(fig, opp), b = measure(fig, adj), al = measure(fig, ang.x) * Math.PI / 180;
  if (!(a <= SSA_SHORTER * b)) return false;
  const disc = a * a - b * b * Math.sin(al) ** 2;            // the third vertex on the other ray: s = b·cos α ± √(a² − b²·sin² α)
  return disc > 0 && 2 * Math.sqrt(disc) >= SSA_APART * b && b * Math.cos(al) - Math.sqrt(disc) > 0;
}
function w4(R) {
  for (let i = 0; i < 400; i++) {
    const base = TWO.build(R, '2-SSS', {});
    const real = R.bool(0.6), which = real ? R.pick(['sas', 'asa', 'sss']) : R.pick(['not-between', 'three-angles']);
    const sets = which === 'not-between' ? SETS[which].filter((ids) => ssaAmbiguous(base.figure, base.facts, ids)) : SETS[which];
    if (!sets.length) continue;
    const ids = R.pick(sets), facts = {};
    let ticks = 0, arcs = 0;
    ids.forEach((id, k) => { const st = bare(base.facts[id]); facts[id] = { ...st, mark: st.kind === 'seg' ? { ticks: ++ticks, color: k + 1 } : { arcs: ++arcs, color: k + 1 } }; });
    const [t1, t2] = base.figure.tris.map((t) => `△${t.join('')}`);
    return { kind: 'W4', text: { k: 'w.W4', vars: { t1, t2 } }, figure: base.figure, facts, marks: [...ids], reveal: [], input: 'chips',
      options: [...['sas', 'asa', 'sss'].map((id) => ({ id, label: REASONS[id].short })), { id: 'cant', label: T['lbl.cant'] }],
      answer: real ? which : 'cant', ...(real ? {} : { trap: which }), why: why('W4') };
  }
  throw new Error('warm-up W4: no ambiguous side-side-angle set');
}

/* W5: "△ABC ≅ △EFD. איזה קודקוד מתאים לקודקוד B?" / which side matches */
function w5(R) {
  for (let i = 0; i < 200; i++) {
    const p = congruentParts.make(R, 1, R.bool() ? 'A' : 'B', NONE, {}), cid = congOf(p), map = p.facts[cid].map, cong = show(p.facts[cid]);
    const common = { kind: 'W5', figure: p.figure, facts: {}, marks: [], reveal: [], input: 'chips', why: why('W5') };
    if (R.bool()) {
      const k = R.int(0, 2), options = map.map((m) => m[1]).sort().map((q) => ({ id: q, m: q }));
      return { ...common, text: { k: 'w.W5', vars: { cong, p: map[k][0] } }, options, answer: map[k][1] };
    }
    const pairs = [[0, 1], [1, 2], [0, 2]].map(([a, b]) => [map[a][0] + map[b][0], segKey(map[a][1] + map[b][1])]).filter(([s, t]) => segKey(s) !== t);
    if (!pairs.length) continue;
    const [s, t] = R.pick(pairs), sides = [[0, 1], [1, 2], [0, 2]].map(([a, b]) => segKey(map[a][1] + map[b][1])).sort();
    return { ...common, text: { k: 'w.W5side', vars: { cong, s } }, options: sides.map((q) => ({ id: q, m: q })), answer: t };
  }
  throw new Error('warm-up W5: no side to ask');
}

/* W6: "מותר כבר להשתמש בזה?" — before the congruence: a given or a seen fact (yes), the goal or another consequence (not yet).
   `from` says which (given · seen · goal · consequence). Family T: an isosceles consequence is never asked (review I3). */
function w6(R) {
  for (let i = 0; i < 200; i++) {
    const p = thenConclusion.make(R, 1, R.bool() ? 'A' : 'B', NONE, {}), goal = targets(p)[0], free = freeOf(p);
    const yes = R.bool();
    let id, from;
    if (yes) { const seen = free && R.bool(0.3); id = seen ? free : R.pick(p.given); from = seen ? 'seen' : 'given'; }
    else {
      const others = p.consequences.filter((c) => c !== goal && !isoLater(p, p.given, c)), other = others.length && R.bool();
      id = other ? R.pick(others) : goal; from = other ? 'consequence' : 'goal';
      if (isoLater(p, p.given, id)) continue;
    }
    const st = yes ? bare(p.facts[id]) : plain(p.facts[id]);
    return { kind: 'W6', text: { k: 'w.W6', vars: { st: show(st) } }, st, from, src: srcOf(p, id), figure: p.figure, facts: pickFacts(p, [...p.given, goal]), marks: [...p.given], reveal: [], goal,
      given: p.given.map((g) => bare(p.facts[g])), toProve: plain(p.facts[goal]), input: 'chips',
      options: [{ id: 'yes', label: T['w.W6.yes'] }, { id: 'no', label: T['w.W6.no'] }], answer: yes ? 'yes' : 'no', why: why('W6') };
  }
  throw new Error('warm-up W6: no statement');
}

/* W7: a word → what it gives ("AD תיכון לצלע BC" → pick the equality) */
function w7(R) {
  for (let i = 0; i < 400; i++) {
    const p = readGiven.make(R, 1, 'A', NONE, {});
    const gs = p.givenText.filter((g) => g.form === 'words' && g.facts.length === 1);
    if (!gs.length) continue;
    const g = R.pick(gs), id = g.facts[0], right = bare(p.facts[id]);
    const mine = p.tiles.wrong.filter((w) => w.for === id), rest = p.tiles.wrong.filter((w) => w.for !== id);
    const wrong = [...mine.filter((w) => w.why === 'word'), ...mine.filter((w) => w.why !== 'word'), ...rest].slice(0, 2).map((w) => bare(w.st));
    if (!wrong.length) continue;
    const sts = [right, ...wrong], keys = sts.map((st) => norm(p.figure, st));
    if (new Set(keys).size !== keys.length) continue;
    return { kind: 'W7', text: { k: 'w.W7', vars: { sent: tplFill(g.key, g.vars) } }, sent: { key: g.key, vars: { ...g.vars } }, figure: p.figure,
      facts: pickFacts(p, [id]), marks: [], reveal: [id], cue: p.cue && p.cue[id] ? p.cue[id] : null,
      input: 'chips', options: R.shuffle(sts.map((st, k) => ({ id: keys[k], st }))), answer: keys[0], why: why('W7') };
  }
  throw new Error('warm-up W7: no sentence in words');
}
const tplFill = (key, vars) => (T[key] || '').replace(/\{(\w+)\}/g, (_, n) => (vars[n] == null ? '' : String(vars[n])));

/* ── similarity (spec 2026-11-23 §7.7) ────────────────────────────────────── */
const SIM_REASONS = ['common-angle', 'vertical', 'corresponding', 'alternate'];
const PLACE = ['lbl.place1', 'lbl.place2', 'lbl.place3'];
/* a similarity drawing of family P (the pyramid) or B (the butterfly), any variant: honest by the family's own check */
function simBase(R) {
  const fam = SIM_FAMS[R.pick(['P', 'B'])];
  return fam.build(R, R.pick(Object.keys(fam.variants)), {});
}
const angName = (tri, i) => `∢${tri[(i + 1) % 3]}${tri[i]}${tri[(i + 2) % 3]}`;
const sideOpp = (tri, i) => segKey(tri[(i + 1) % 3] + tri[(i + 2) % 3]);

/* S1: "למה הזוויות המסומנות שוות?" — one angle pair known without the similarity, and the reason the drawing gives
   (the family's own reason; corresponding vs alternate is checked by parallelKind in the family's honesty check) */
function s1(R) {
  for (let i = 0; i < 50; i++) {
    const b = simBase(R);
    const direct = ['a0', 'a1', 'a2'].map((id) => [id, (b.just[id] || []).flatMap((j) => j.reasons).find((r) => SIM_REASONS.includes(r))]).filter(([, r]) => r);
    if (!direct.length || !b.facts.par) continue;
    const [id, reason] = R.pick(direct), st = plain(b.facts[id]);
    return { kind: 'S1', text: { k: 'w.S1', vars: {} }, st, figure: b.figure,
      facts: { par: bare(b.facts.par), [id]: { ...st, mark: { arcs: 1, color: 1 } } }, marks: [id], reveal: [],
      given: [bare(b.facts.par)], input: 'chips', options: SIM_REASONS.map((r) => ({ id: r, label: REASONS[r].short })),
      answer: reason, why: { k: `w.S1.why.${reason}`, vars: {} } };
  }
  throw new Error('warm-up S1: no angle pair with a reason');
}

/* S2: "△ADE ∼ △ABC. איזה קודקוד מתאים לקודקוד D?" / which side matches — read from the written vertex order
   (never a shared vertex: it matches itself) */
function s2(R) {
  for (let i = 0; i < 50; i++) {
    const b = simBase(R), M = b.facts.sim.map, sim = show(b.facts.sim);
    const common = { kind: 'S2', figure: b.figure, facts: {}, marks: [], reveal: [], input: 'chips', map: M.map((m) => [...m]) };
    if (R.bool()) {
      const k = R.pick([0, 1, 2].filter((j) => M[j][0] !== M[j][1])), p = M[k][0], q = M[k][1];
      return { ...common, text: { k: 'w.S2', vars: { sim, p } }, ask: { p }, options: M.map((m) => m[1]).sort().map((x) => ({ id: x, m: x })), answer: q,
        why: { k: 'w.S2.why', vars: { p, q, place: T[PLACE[k]] } } };
    }
    const pairs = [[0, 1], [1, 2], [0, 2]].filter(([a, c]) => segKey(M[a][0] + M[c][0]) !== segKey(M[a][1] + M[c][1]));
    if (!pairs.length) continue;
    const [a, c] = R.pick(pairs), s = M[a][0] + M[c][0], t = segKey(M[a][1] + M[c][1]);
    const options = [[0, 1], [1, 2], [0, 2]].map(([x, y]) => segKey(M[x][1] + M[y][1])).sort().map((x) => ({ id: x, m: x }));
    return { ...common, text: { k: 'w.S2side', vars: { sim, s } }, ask: { s }, options, answer: t,
      why: { k: 'w.S2side.why', vars: { s, p1: M[a][0], p2: M[c][0], q1: M[a][1], q2: M[c][1], t } } };
  }
  throw new Error('warm-up S2: no vertex to ask');
}

/* S3: "איזו צלע מתאימה?" — the three angle pairs marked (no similarity written, the triangles named in letter order):
   the side opposite the equal angle */
function s3(R) {
  const b = simBase(R), M = b.facts.sim.map, facts = {};
  ['a0', 'a1', 'a2'].forEach((id, k) => { facts[id] = { ...plain(b.facts[id]), mark: { arcs: k + 1, color: k + 1 } }; });
  const tris = [M.map((m) => m[0]), M.map((m) => m[1])], dir = R.bool() ? 0 : 1, from = tris[dir], to = tris[1 - dir], i = R.int(0, 2);
  const s = sideOpp(from, i), t = sideOpp(to, i);
  const shared = angKey(b.figure, Ang(from[i], [from[(i + 1) % 3], from[(i + 2) % 3]])) === angKey(b.figure, Ang(to[i], [to[(i + 1) % 3], to[(i + 2) % 3]]));   // one angle (P: ∢A), not vertical angles at a shared point (B: O)
  const options = [0, 1, 2].map((j) => sideOpp(to, j)).sort().map((x) => ({ id: x, m: x }));
  return { kind: 'S3', text: { k: 'w.S3', vars: { t: `△${[...to].sort().join('')}`, s } }, figure: b.figure, facts, marks: ['a0', 'a1', 'a2'], reveal: [],
    input: 'chips', options, answer: t, ask: { s, tris: [[...from], [...to]] },
    why: shared ? { k: 'w.S3.whyCommon', vars: { s, a: angName(from, i), t } } : { k: 'w.S3.why', vars: { s, a: angName(from, i), b: angName(to, i), t } } };
}

/* S4: solve a proportion "4/10 = x/15" on the keypad — the lengths of a real similar pair (whole or x.5, at most 30),
   x in any of the four places, the four numbers all different */
function s4(R) {
  for (let i = 0; i < 400; i++) {
    const L = lengths(R, R.pick(K_ALL));
    if (!L) continue;
    const [i1, i2] = R.shuffle([0, 1, 2]).slice(0, 2), big = R.bool();
    const pairs = [i1, i2].map((j) => (big ? [L.big[j], L.small[j]] : [L.small[j], L.big[j]]));
    const nums = pairs.flat();
    if (new Set(nums).size !== 4) continue;
    const at = R.int(0, 3), shown = pairs.map((pr, a) => pr.map((v, c) => (a * 2 + c === at ? 'x' : String(v))));
    const [[n1, d1], [n2, d2]] = shown;
    return { kind: 'S4', text: { k: 'w.S4', vars: { x: 'x' } }, figure: null, facts: {}, marks: [], reveal: [], input: 'keypad', name: 'x',
      pairs: shown, answer: nums[at], why: { k: 'w.S4.why', vars: { cross: `${n1} · ${d2} = ${d1} · ${n2}`, res: `x = ${nums[at]}` } } };
  }
  throw new Error('warm-up S4: no proportion');
}

/* S5: "האם המצולעים דומים?" — equal angles: two triangles (similar, ז.ז) or two rectangles whose side ratios clearly
   differ (not necessarily: right angles everywhere, different shapes). Drawn side by side, letters clear of the lines. */
const QUAD_SETS = [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['K', 'L', 'M', 'N'], ['P', 'R', 'S', 'T']];
const turn = (p, t) => [p[0] * Math.cos(t) - p[1] * Math.sin(t), p[0] * Math.sin(t) + p[1] * Math.cos(t)];
/* the second shape to the right of the first, a gap between them */
function sideBySide(one, two, gap = 0.3) {
  const xs = (q) => q.map((p) => p[0]), ys = (q) => q.map((p) => p[1]);
  const r1 = Math.max(...xs(one)), l2 = Math.min(...xs(two)), m1 = (Math.min(...ys(one)) + Math.max(...ys(one))) / 2, m2 = (Math.min(...ys(two)) + Math.max(...ys(two))) / 2;
  return two.map((p) => [p[0] + r1 - l2 + gap, p[1] + m1 - m2]);
}
function twoTris(R) {
  const L = lengths(R, R.pick(K_ALL.filter((k) => k.p / k.q <= 2.5)));
  if (!L) return null;
  const s = Math.max(...L.big), small = triangle(L.small).map((p) => [p[0] / s, p[1] / s]), big = triangle(L.big).map((p) => [p[0] / s, p[1] / s]);
  const centred = (q) => { const c = [0, 1].map((k) => q.reduce((a, p) => a + p[k], 0) / 3); return q.map((p) => [p[0] - c[0], p[1] - c[1]]); };
  const t1 = R.int(-3, 3) * 15 * Math.PI / 180, t2 = R.int(-3, 3) * 15 * Math.PI / 180, mirror = R.bool();
  let one = centred(small).map((p) => turn(p, t1)), two = centred(big).map((p) => turn(mirror ? [-p[0], p[1]] : p, t2));
  if (R.bool()) [one, two] = [two, one];
  const placed = sideBySide(one, two, 0.45), names = pickNames(R, 6), n1 = names.slice(0, 3), n2 = names.slice(3);
  const pts = {};
  n1.forEach((q, i) => { pts[q] = one[i]; }); n2.forEach((q, i) => { pts[q] = placed[i]; });
  const facts = {}, angles = [];
  for (let i = 0; i < 3; i++) {
    const x = Ang(n1[i], [n1[(i + 1) % 3], n1[(i + 2) % 3]]), y = Ang(n2[i], [n2[(i + 1) % 3], n2[(i + 2) % 3]]);
    facts[`a${i}`] = { ...G(x, y), mark: { arcs: i + 1, color: i + 1 } }; angles.push(x, y);
  }
  const figure = { points: pts, lines: [], segs: [0, 1, 2].flatMap((i) => [n1[i] + n1[(i + 1) % 3], n2[i] + n2[(i + 1) % 3]]), angles, tris: [n1, n2] };
  return { figure, facts, marks: ['a0', 'a1', 'a2'], polys: [n1, n2], names: [`△${n1.join('')}`, `△${n2.join('')}`] };
}
function twoRects(R) {
  const near = R.pick([1.15, 1.25, 1.35]), far = R.pick([2.5, 2.8, 3.1]), h1 = 1, h2 = R.pick([0.55, 0.7, 0.85]);   // almost a square beside a long thin one
  const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
  let one = rect(near * h1, h1), two = rect(far * h2, h2);
  if (R.bool()) [one, two] = [two, one];
  const placed = sideBySide(one, two, 0.7), [n1, n2] = R.shuffle(QUAD_SETS).slice(0, 2), pts = {};
  n1.forEach((q, i) => { pts[q] = one[i]; }); n2.forEach((q, i) => { pts[q] = placed[i]; });
  const facts = {}, angles = [];
  for (let i = 0; i < 4; i++) {
    const x = Ang(n1[i], [n1[(i + 3) % 4], n1[(i + 1) % 4]]), y = Ang(n2[i], [n2[(i + 3) % 4], n2[(i + 1) % 4]]);
    facts[`r${i}`] = { ...G(x, y, { right: true }), mark: { right: true, color: 1 } }; angles.push(x, y);
  }
  const figure = { points: pts, lines: [], segs: [0, 1, 2, 3].flatMap((i) => [n1[i] + n1[(i + 1) % 4], n2[i] + n2[(i + 1) % 4]]), angles };
  return { figure, facts, marks: ['r0', 'r1', 'r2', 'r3'], polys: [n1, n2], names: [n1.join(''), n2.join('')] };
}
const APART_PX = 30;                                   // two letters of different shapes at least this far apart: the shapes read apart
function apart(L, [p1, p2]) {
  const at = Object.fromEntries(L.labels.map((l) => [l.p, l]));
  return p1.every((a) => p2.every((b) => Math.hypot(at[a].x - at[b].x, at[a].y - at[b].y) >= APART_PX));
}
function s5(R) {
  const yes = R.bool();
  for (let i = 0; i < 200; i++) {
    const d = yes ? twoTris(R) : twoRects(R);
    if (!d) continue;
    const L = layout(d.figure);
    if (labelErrors(L).length || cramped(d.figure).length || !apart(L, d.polys)) continue;
    return { kind: 'S5', text: { k: 'w.S5', vars: { p1: d.names[0], p2: d.names[1] } }, figure: d.figure, facts: d.facts, marks: d.marks, reveal: [],
      polys: d.polys, input: 'chips', options: [{ id: 'yes', label: T['w.S5.yes'] }, { id: 'no', label: T['w.S5.no'] }],
      answer: yes ? 'yes' : 'no', why: { k: `w.S5.why.${yes ? 'yes' : 'no'}`, vars: {} } };
  }
  throw new Error('warm-up S5: no drawing with room for its letters');
}

const MAKE = { W1: w1, W2: w2, W3: w3, W4: w4, W5: w5, W6: w6, W7: w7, S1: s1, S2: s2, S3: s3, S4: s4, S5: s5 };
/** One warm-up task of a kind. */
export function makeTask(R, kind) {
  if (!MAKE[kind]) throw new Error(`warm-up: no kind ${kind}`);
  return MAKE[kind](R);
}
/** Is this the task's answer? (chips: the option id; a tap: the same set of parts, in any order; the keypad: the
    number, as typed or as a number — a format slip such as "06" or "." is never right) */
export function checkTask(task, answer) {
  if (task.input === 'keypad') {
    const v = typeof answer === 'number' ? answer : typeof answer === 'string' ? numberOf(answer).v : undefined;
    return Number.isFinite(v) && Math.abs(v - task.answer) < 1e-9;
  }
  if (task.input === 'tap') {
    if (!Array.isArray(answer)) return false;
    const a = [...new Set(answer)].sort(), b = [...task.tap.need].sort();
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }
  return answer === task.answer;
}

/* ── the flow (§7.1) ──────────────────────────────────────────────────────── */
/** state = { kinds, first:[kind × 4], res:{ kind:[bool…] }, n (tasks answered) } */
export function flow(kinds, { tasks = RULES.WARM_TASKS } = {}) {
  if (!kinds || !kinds.length) throw new Error('warm-up flow: no kinds');
  return { kinds: [...kinds], first: [...Array(tasks)].map((_, i) => kinds[i % kinds.length]), res: {}, n: 0 };
}
const firstOf = (s, k) => s.first.filter((x) => x === k).length;
const missed = (s, k) => (s.res[k] || []).slice(0, firstOf(s, k)).some((r) => !r);
/* a missed kind is settled after two more tasks, once 2 of its last 3 are right */
function settled(s, k) {
  const r = s.res[k] || [], extra = r.length - firstOf(s, k), [need, of] = RULES.WARM_PASS;
  return extra >= RULES.WARM_EXTRA && r.slice(-of).filter(Boolean).length >= need;
}
/** The next kind to ask, or null when the warm-up is over (all right, every missed kind settled, or the cap). */
export function next(s) {
  if (s.n < s.first.length) return s.first[s.n];
  if (s.n >= RULES.WARM_CAP) return null;
  const open = s.kinds.filter((k) => missed(s, k) && !settled(s, k));
  if (!open.length) return null;
  // round-robin: the open kind with the fewest answers so far
  return open.reduce((a, b) => ((s.res[b] || []).length < (s.res[a] || []).length ? b : a));
}
export function answer(s, kind, right) {
  return { ...s, res: { ...s.res, [kind]: [...(s.res[kind] || []), !!right] }, n: s.n + 1 };
}
/** Over, and no kind is left open (false when the cap ended it: Level 1 opens anyway). */
export function passed(s) {
  return s.n >= s.first.length && s.kinds.every((k) => !missed(s, k) || settled(s, k));
}
