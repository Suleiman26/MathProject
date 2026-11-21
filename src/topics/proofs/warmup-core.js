/* The proofs section: the warm-up ("חימום", spec §7.1). Seven single-skill task kinds W1–W7 and the
   flow rule (4 tasks, two more of each missed kind, hard cap 8; it never blocks). Pure: randomness
   only through R; no React, no window. Results never touch the mastery history.

   task = { kind, text:{ k, vars }, figure, facts:{ id: statement + mark }, marks:[id] (drawn from the
     start), reveal:[id] (drawn once answered), goal?:id (drawn dashed), input:'chips'|'tap',
     options?:[{ id, label? | m? | st? }], tap?:{ kinds, need:[partId] }, answer, why:{ k, vars },
     st? (the statement asked about), sent? ({ key, vars }: the given sentence, W7),
     given?:[statement] (the chips of the "נתון:" line), trap? (W4) }
   Every figure comes from the proof generators, so it is already honest (§6.6). */
import { T } from './texts.js';
import { REASONS } from './reasons.js';
import { RULES } from './mastery.js';
import { show, norm, segKey, congOf, targets, measure } from './core.js';
import { partId } from './figure-core.js';
import { bare } from './types/tiles.js';
import readGiven from './types/read-given.js';
import congruentParts from './types/congruent-parts.js';
import proveCongruence from './types/prove-congruence.js';
import thenConclusion from './types/then-conclusion.js';
import TWO from './families/two.js';

export const KINDS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'];
const NONE = { recent: [], last: null };
const plain = (f) => { const { right, ...st } = bare(f); return st; };          // a consequence never says "= 90°"
const freeOf = (p) => Object.keys(p.roles).find((id) => p.roles[id] === 'vertical' || p.roles[id] === 'common') || null;
const pickFacts = (p, ids) => Object.fromEntries(ids.map((id) => [id, p.facts[id]]));
const why = (kind) => ({ k: `w.${kind}.why`, vars: {} });

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

/* W2: "ידועה, או רק נראית כך?" — a given (marked) statement, or a true one that is not known yet */
function w2(R) {
  const p = proveCongruence.make(R, 1, R.bool() ? 'A' : 'B', NONE, {}), known = R.bool();
  const st = known ? bare(p.facts[R.pick(p.given)]) : plain(p.facts[R.pick(p.consequences)]);
  return { kind: 'W2', text: { k: 'w.W2', vars: { st: show(st) } }, st, figure: p.figure, facts: pickFacts(p, p.given), marks: [...p.given], reveal: [],
    given: p.given.map((id) => bare(p.facts[id])), input: 'chips',
    options: [{ id: 'known', label: T['w.W2.known'] }, { id: 'looks', label: T['w.W2.looks'] }], answer: known ? 'known' : 'looks', why: why('W2') };
}

/* W3: "איזה שוויון רואים בציור בלי שהוא נתון?" — the shared side / the vertical angles, a given, a consequence */
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

/* W6: "מותר כבר להשתמש בזה?" — before the congruence: a given or a seen fact (yes), the goal or another consequence (not yet) */
function w6(R) {
  const p = thenConclusion.make(R, 1, R.bool() ? 'A' : 'B', NONE, {}), goal = targets(p)[0], free = freeOf(p);
  const yes = R.bool();
  let id;
  if (yes) id = free && R.bool(0.3) ? free : R.pick(p.given);
  else { const others = p.consequences.filter((c) => c !== goal); id = others.length && R.bool() ? R.pick(others) : goal; }
  const st = yes ? bare(p.facts[id]) : plain(p.facts[id]);
  return { kind: 'W6', text: { k: 'w.W6', vars: { st: show(st) } }, st, figure: p.figure, facts: pickFacts(p, [...p.given, goal]), marks: [...p.given], reveal: [], goal,
    given: p.given.map((g) => bare(p.facts[g])), toProve: plain(p.facts[goal]), input: 'chips',
    options: [{ id: 'yes', label: T['w.W6.yes'] }, { id: 'no', label: T['w.W6.no'] }], answer: yes ? 'yes' : 'no', why: why('W6') };
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

const MAKE = { W1: w1, W2: w2, W3: w3, W4: w4, W5: w5, W6: w6, W7: w7 };
/** One warm-up task of a kind. */
export function makeTask(R, kind) {
  if (!MAKE[kind]) throw new Error(`warm-up: no kind ${kind}`);
  return MAKE[kind](R);
}
/** Is this the task's answer? (chips: the option id; a tap: the same set of parts, in any order) */
export function checkTask(task, answer) {
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
