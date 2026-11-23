/* node --test src/topics/proofs/types-sim.test.mjs        (RUNS=50 for a quick pass)
   The four similarity levels (spec 2026-11-23 §5.2, §7.6): each type × help stage × variant builds, rebuilds exactly
   from its snapshot meta, presents only canonical rows, asks for something, keeps the crossed families (H, N) to לבד
   variant B, never asks the parallel given, and ends sim-side / sim-calc with the ratio and the number. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, makeR } from '../new/core.js';
import { TYPES, typeById } from './types/index.js';
import { SUBJECTS, typesOf, levelNo, prevInSubject, demoOf, lawsOf } from './subjects.js';
import { present, decisionsOf, shapeOf, targets, classify, checkReason, canonRows, anchorOf, acceptedReasons, roleOf, measure, angKey, segKey, holds, checkProp, required } from './core.js';
import { REASONS } from './reasons.js';
import { T, NEW_DRAFTS } from './texts.js';
import { liesSim } from './families/sim-kit.js';

const RUNS = Number(process.env.RUNS || 200);
const SIM = ['sim-parts', 'sim-side', 'prove-sim', 'sim-calc'];
const KEYS = ['6. מדמיון לשוויונות ויחס', '7. מיחס לצלע חסרה', '8. הוכחת דמיון', '9. דמיון ואז חישוב'];
const SHAPES = ['parts', 'side', 'prove', 'then'];
const half = (v) => Number.isInteger(v * 2);
const STAGES = [[1, 'A'], [1, 'B'], [2, 'A'], [2, 'B'], [3, 'A'], [3, 'B']];

test('inventory: four similarity levels with the stored keys, shapes, subject, no warm-up yet, live', () => {
  SIM.forEach((id, i) => {
    const t = typeById(id);
    assert.ok(t, id);
    assert.equal(t.button, KEYS[i]); assert.equal(t.n, 6 + i); assert.equal(t.label, T[`type.${id}`]); assert.equal(t.name, t.label);
    assert.equal(t.shape, SHAPES[i]); assert.equal(shapeOf({ type: id }), SHAPES[i]); assert.equal(t.subject, 'similarity');
    assert.deepEqual(t.warm, []); assert.equal(t.live, true);
    assert.ok(T[`about.${id}`], id);
    for (const k of [`type.${id}`, `about.${id}`]) assert.ok(NEW_DRAFTS.includes(k), k);
  });
  assert.deepEqual(TYPES.map((t) => t.n), [...TYPES.map((t) => t.n)].sort((a, b) => a - b));
  assert.deepEqual(typesOf('similarity').map((t) => t.id), SIM);
  assert.deepEqual(SIM.map(levelNo), [1, 2, 3, 4]);
  assert.equal(prevInSubject('sim-parts'), null); assert.equal(prevInSubject('sim-calc').id, 'prove-sim');
  // the keys are exactly the stored ones (en dash rules: none here), and every template id is unique
  for (const t of typesOf('similarity')) assert.equal(new Set(t.templates.map((x) => x.id)).size, t.templates.length);
});

for (const id of SIM) for (const [level, variant] of STAGES) {
  test(`${id} · stage ${level}${variant}: ${RUNS} problems rebuild exactly and present only canonical rows`, () => {
    const t = typeById(id), R = makeR(seeded(9000 + level * 10 + variant.charCodeAt(0)));
    const fams = new Set();
    for (let i = 0; i < RUNS; i++) {
      const counted = i % 3;
      const p = t.make(R, level, variant, { recent: [], last: null }, { counted, words: [] });
      fams.add(p.family);
      assert.equal(p.type, id); assert.equal(shapeOf(p), t.shape); assert.equal(anchorOf(p), 'sim');
      // remake from the snapshot meta gives the very same problem
      const back = t.remake({ template: p.template, seed: p.seed, level: p.level, variant: p.variant, meta: p.meta });
      assert.deepEqual(back, p, `${p.template}:${p.seed}`);
      // crossed matchings (H, N) only at לבד, variant B
      if (!(level === 3 && variant === 'B')) assert.ok(!['H', 'N'].includes(p.family), `${p.template} at ${level}${variant}`);
      assert.ok(!p.crossed || (level === 3 && variant === 'B'));
      // the view: steps and pre rows are canonical rows; something to decide; the parallel given is never asked
      const view = present(p, level, variant, { counted, R });
      for (const s of view.steps) assert.ok(p.canon.includes(s.fact), `${p.template}: step ${s.fact}`);
      for (const f of view.pre) assert.ok(p.canon.includes(f), `${p.template}: pre ${f}`);
      assert.ok(decisionsOf(view) > 0, `${p.template} ${level}${variant}`);
      for (const s of view.steps) {
        const f = p.facts[s.fact];
        if (f.kind === 'par') assert.deepEqual(s.ask, [], `${p.template}: the parallel given is asked`);   // only the walk-through shows it as a step
        if (f.kind === 'val') assert.ok(!s.ask.includes('reason'), 'a number row asks no reason');
        if (s.options) {
          assert.equal(s.options.filter((o) => JSON.stringify(o) === JSON.stringify(f)).length, 1, `${p.template}: one right option`);
          assert.equal(s.options.length, 3, `${p.template}: ${s.fact} has ${s.options.length} options`);
        }
      }
      if (level !== 1 || variant !== 'A') for (const f of p.canon) if (p.facts[f].kind === 'par') assert.ok(view.pre.includes(f));
      // every row to write is either written by the app or a step (the whole proof is reachable)
      const known = view.known || [];
      for (const f of p.canon) if (!known.includes(f)) assert.ok(view.pre.includes(f) || view.steps.some((s) => s.fact === f), `${p.template}: ${f} missing`);
      for (const x of view.tiles) {
        assert.notEqual(x.st.kind, 'val', 'a number is never a tile (keypad)');
        if (x.fact) assert.ok(p.canon.includes(x.fact));
        else assert.equal(classify(p, [], x.st).c === 'ok', false, `${p.template}: a wrong tile is right`);
      }
      // each wrong tile is rejected with the kind it was made for (never counted right, never a true statement called false)
      const KIND = { consequence: ['looks-equal'], 'letter-swap': ['false-statement'], 'wrong-order': ['wrong-matching'], position: ['wrong-matching'], 'next-letter': ['wrong-matching'], ratio: ['ratio-flip', 'non-matching-sides'], 'num-flip': ['ratio-flip'], 'num-slip': ['calc'], 'num-near': ['calc'] };
      const after = [...p.given, ...(p.canon.includes('prop') ? p.canon.slice(0, p.canon.indexOf('prop') + 1) : [])];
      for (const w of p.tiles.wrong) {
        const c = classify(p, w.st.kind === 'val' ? after : p.given, w.st);
        assert.ok(c.c === 'early' || c.c === 'false', `${p.template}: wrong tile (${w.why}) is ${c.c}`);
        assert.ok(KIND[w.why].includes(c.kind), `${p.template}: ${w.why} → ${c.kind}`);
        assert.equal(holds(p.figure, w.st) && w.why !== 'consequence', false, `${p.template}: a true ${w.why} tile`);
      }
      // the drawing is honest (the proof types carry the family's facts as they are)
      if (id === 'prove-sim' || id === 'sim-calc') assert.deepEqual(liesSim(p, { quick: true }), [], p.id);
      // the ratio and the number close sim-side and sim-calc
      if (id === 'sim-side' || id === 'sim-calc') {
        assert.deepEqual(p.canon.slice(-2), ['prop', 'val']); assert.deepEqual(targets(p), ['val']);
        assert.equal(p.facts.prop.pairs.length, 2); assert.deepEqual(checkProp(p, p.facts.prop, { need: p.facts.prop.need }), { ok: true });
        assert.ok(half(p.facts.val.v));
      }
    }
    if (RUNS >= 50) {
      const want = level === 3 && variant === 'B' ? { 'prove-sim': ['B', 'H', 'N', 'P'], 'sim-calc': ['B', 'H', 'P'] }[id] : null;
      if (want) assert.deepEqual([...fams].sort(), want);
      if (!want && variant === 'B') assert.deepEqual([...fams].sort(), ['B', 'P'], `${id} ${level}${variant}`);
    }
  });
}

test('the canonical proof of each level is accepted row by row (first accepted reasons)', () => {
  const R = makeR(seeded(31));
  for (const id of SIM) for (const [level, variant] of STAGES) for (let i = 0; i < 25; i++) {
    const p = typeById(id).make(R, level, variant, { recent: [], last: null }, {});
    const done = anchorOf(p) && shapeOf(p) !== 'prove' && shapeOf(p) !== 'then' ? ['sim'] : [];
    for (const row of canonRows(p)) {
      if (done.includes(row.fact)) continue;
      assert.equal(classify(p, done, row.st).c, 'ok', `${p.template} ${row.fact}`);
      assert.equal(checkReason(p, done, row.fact, row.reason).ok, true, `${p.template} ${row.fact} ${row.reason}`);
      done.push(row.fact);
    }
    assert.ok(targets(p).every((x) => done.includes(x)));
  }
});

test('sim-parts: two angle pairs (never a common angle) and the three-fraction ratio; wrong tiles are false', () => {
  const R = makeR(seeded(32)), t = typeById('sim-parts');
  for (let i = 0; i < RUNS; i++) {
    const p = t.make(R, 2, i % 2 ? 'A' : 'B', { recent: [], last: null }, {});
    const angs = targets(p).filter((f) => p.facts[f].kind === 'ang');
    assert.equal(angs.length, 2); assert.deepEqual(targets(p).slice(-1), ['prop']); assert.equal(p.facts.prop.pairs.length, 3);
    for (const f of angs) {
      assert.notEqual(angKey(p.figure, p.facts[f].x), angKey(p.figure, p.facts[f].y), 'a common angle is never asked');
      assert.equal(roleOf(p, f), 'sim-partner'); assert.deepEqual(acceptedReasons(p, f), ['sim-angles']);
    }
    assert.equal(roleOf(p, 'prop'), 'ratio'); assert.deepEqual(p.given, ['sim']); assert.equal(p.facts.par, undefined);
    for (const w of p.tiles.wrong) assert.equal(holds(p.figure, w.st), false);
    assert.ok(p.tiles.wrong.some((w) => w.st.kind === 'prop'));
    for (const f of Object.keys(p.cue)) assert.ok(p.cue[f].length > 0);
  }
});

test('number chips (מודרך): the right number and two wrong ones, whole or x.5, all different', () => {
  const R = makeR(seeded(33));
  for (const id of ['sim-side', 'sim-calc']) for (let i = 0; i < RUNS; i++) {
    const p = typeById(id).make(R, 1, 'B', { recent: [], last: null }, { counted: i % 3 });
    const view = present(p, 1, 'B', { counted: i % 3, R }), s = view.steps.find((x) => x.fact === 'val');
    assert.ok(s && s.options, `${p.template}`);
    const vs = s.options.map((o) => o.v);
    assert.equal(new Set(vs).size, 3, `${p.template}: ${vs}`);
    assert.ok(vs.every((v) => half(v) && v >= 1), `${vs}`);
    assert.equal(vs.filter((v) => v === p.facts.val.v).length, 1);
    for (const o of s.options) if (o.v !== p.facts.val.v) assert.equal(classify(p, ['sim', 'prop', ...p.canon.slice(0, -1)], o).c, 'false');
  }
});

test('sim-side: מודרך writes the ratio and asks the number; ביחד and לבד build the ratio, the number has no tile', () => {
  const R = makeR(seeded(34)), t = typeById('sim-side');
  const p = t.make(R, 1, 'A', { recent: [], last: null }, {});
  let v = present(p, 1, 'A', { R });
  assert.equal(v.mode, 'walk'); assert.deepEqual(v.known, ['sim']); assert.deepEqual(v.steps.map((s) => [s.fact, s.ask]), [['prop', []], ['val', ['statement']]]);
  v = present(p, 1, 'B', { R });
  assert.equal(v.mode, 'fill'); assert.deepEqual(v.steps.map((s) => [s.fact, s.ask]), [['prop', ['reason']], ['val', ['statement']]]);
  for (const [l, va] of [[2, 'A'], [2, 'B'], [3, 'A'], [3, 'B']]) {
    v = present(p, l, va, { R });
    assert.deepEqual(v.steps.map((s) => [s.fact, s.ask]), [['prop', ['statement', 'reason']], ['val', ['statement']]], `${l}${va}`);
    if (l === 2) { assert.ok(v.tiles.some((x) => x.fact === 'prop')); assert.ok(v.tiles.every((x) => x.st.kind === 'prop')); assert.ok(v.tiles.length >= 2); }
  }
});

test('prove-sim / sim-calc: the parallel given is written by the app; ביחד wrong tiles are a false angle row and a wrong order', () => {
  const R = makeR(seeded(35));
  for (let i = 0; i < 60; i++) {
    const p = typeById('prove-sim').make(R, 2, 'B', { recent: [], last: null }, {});
    const v = present(p, 2, 'B', { R });
    if (p.facts.par) assert.deepEqual(v.pre, ['par']);
    const wrong = v.tiles.filter((x) => !x.fact);
    assert.equal(wrong.length, 2);
    assert.ok(wrong.some((x) => x.st.kind === 'sim'), 'a wrong vertex order'); assert.ok(wrong.some((x) => x.st.kind === 'ang'));
    for (const x of wrong) assert.notEqual(classify(p, [], x.st).c, 'ok');
    assert.equal(v.plan, null);
  }
  for (let i = 0; i < 30; i++) {
    const p = typeById('sim-calc').make(R, 1, 'A', { recent: [], last: null }, {});
    assert.equal(present(p, 1, 'A', { R }).plan, null, 'the "which two triangles" question is a congruence one');
    assert.ok(required(p).has('prop'));
  }
});

test('sim-calc: the first מודרך proof re-uses a drawing proved in הוכחת דמיון (ctx.prefer), never a crossed one there', () => {
  const t = typeById('sim-calc');
  for (const v of ['P-CC', 'P-CC2', 'B-VA', 'B-AA']) for (let i = 0; i < 10; i++) {
    const p = t.make(makeR(seeded(40 + i)), 1, 'A', { recent: [], last: null }, { prefer: `8-${v}` });
    assert.equal(p.template, `9-${v}`);
  }
  for (let i = 0; i < 20; i++) assert.notEqual(t.make(makeR(seeded(60 + i)), 1, 'B', { recent: [], last: null }, { prefer: '8-H-CR' }).family, 'H');
  // ctx.want prefers a template whose proof uses the reason missed
  for (let i = 0; i < 20; i++) assert.equal(typeById('prove-sim').make(makeR(seeded(80 + i)), 2, 'B', { recent: [], last: null }, { want: 'alternate' }).family, 'B');
});

test('subject: similarity is live with its four levels, its theorems (each with a full sentence) and a P hero', () => {
  const s = SUBJECTS.find((x) => x.id === 'similarity');
  assert.equal(s.live, true); assert.deepEqual(s.types, SIM);
  assert.deepEqual(s.theorems, ['aa', 'corresponding', 'alternate', 'vertical', 'common-angle', 'right-angles', 'sim-angles', 'sim-ratio', 'solve']);
  for (const r of s.theorems) assert.equal(typeof REASONS[r].full, 'string', r);
  const { laws, more } = lawsOf('similarity');
  assert.deepEqual(laws, ['aa', 'corresponding', 'alternate', 'vertical']); assert.deepEqual(more, ['sim-angles', 'sim-ratio', 'common-angle', 'right-angles', 'solve']);
  assert.equal(s.hero.type, 'prove-sim'); assert.match(s.hero.template, /^8-P-/);
  const hp = typeById(s.hero.type).remake({ template: s.hero.template, seed: s.hero.seed, level: 1, variant: 'A', meta: null });
  assert.equal(hp.family, 'P');
});

test('demos: every similarity theorem with a drawing builds, its marks are facts that show the pattern honestly (never the parallel given)', () => {
  const s = SUBJECTS.find((x) => x.id === 'similarity');
  for (const id of Object.keys(s.demos)) assert.ok(s.theorems.includes(id), id);
  for (const id of s.theorems.filter((x) => x !== 'solve')) {
    const d = demoOf('similarity', id);
    assert.ok(d, id);
    const p = d.problem, f = (m) => p.facts[m];
    assert.ok(d.marks.length > 0); assert.equal(new Set(d.marks).size, d.marks.length);
    for (const m of d.marks) { assert.ok(f(m), `${id}: ${m}`); assert.notEqual(f(m).kind, 'par', id); assert.notEqual(f(m).kind, 'prop', id); }
    if (id === 'aa') {
      const j = p.just[anchorOf(p)].find((x) => x.reasons.includes('aa'));
      assert.deepEqual([...d.marks].sort(), [...j.needs].sort());
      assert.ok(d.marks.every((m) => f(m).kind === 'ang'));
    } else if (id === 'sim-angles') {
      assert.deepEqual(d.marks.filter((m) => f(m).kind === 'sim'), [anchorOf(p)]);
      const rest = d.marks.filter((m) => f(m).kind !== 'sim');
      assert.equal(rest.length, 1); assert.ok(acceptedReasons(p, rest[0]).includes('sim-angles'));
    } else if (id === 'sim-ratio') {
      assert.deepEqual(d.marks, [anchorOf(p)]);
    } else {
      assert.equal(d.marks.length, 1, id);
      assert.ok(acceptedReasons(p, d.marks[0]).includes(id), id);
      if (id === 'right-angles') assert.equal(f(d.marks[0]).right, true);
      if (id === 'vertical') assert.equal(roleOf(p, d.marks[0]), 'vertical');
      if (id === 'corresponding' || id === 'alternate') assert.equal(roleOf(p, d.marks[0]), 'parallel');
    }
    // an angle mark is wide enough to see (≥ 30°, a right angle has its square)
    for (const m of d.marks) if (f(m).kind === 'ang' && !f(m).right) for (const part of [f(m).x, f(m).y]) assert.ok(measure(p.figure, part) >= 30, `${id}: ${m} is ${Math.round(measure(p.figure, part))}°`);
  }
});

test('texts: the similarity screen words exist and are drafts', () => {
  for (const k of ['lbl.byOrderSim', 'lbl.planL3Sim', 'lbl.planL3SimCalc', 'say.askProp', 'say.askVal', 'lbl.goalSim', 'q.partnerSim']) { assert.ok(T[k], k); assert.ok(NEW_DRAFTS.includes(k), k); }
});
