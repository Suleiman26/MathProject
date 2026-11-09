// Duel question engine tests.
// Run: node --test supabase/functions/_shared/duel/*.test.mjs
// (Node 22 does not expand a folder given to --test; use the glob.)
// Every generator is run 1,000 times per answer kind. The right answer is
// recomputed HERE from the question's raw numbers (q.meta) by a different
// route than the port (inverse operation, substitution, own evaluator), so a
// slip in a port cannot hide behind the same slip in the test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, randInt, pick, shuffle } from './rng.js';
import { makeChoices } from './choices.js';
import { checkAnswer, parseNum } from './answer.js';
import { GENERATORS } from './registry.js';
import { buildDuel, poolFor, GEN_CAP } from './build.js';
import {
  close, powLoop, evalTokens, mathOf, tokenize, linSide, TYPED_ONLY, typedOnly, valueOf,
  contractTests,
} from './testkit.mjs';
import { EXPECT_2B } from './expect-2b.mjs';
import { readFileSync } from 'node:fs';

// src/home/chapters.js's CHAPTERS, read as text (importing it from here would
// make Node guess its module type and print a warning)
const CHAPTERS = Object.fromEntries([...readFileSync(new URL('../../../../src/home/chapters.js', import.meta.url), 'utf8')
  .matchAll(/^\s*"([a-z0-9-]+)": (\[.*\]),$/gm)].map((m) => [m[1], JSON.parse(m[2])]));


/* Left-hand sides of powers-roots ch5 templates, evaluated at x = X, y = Y. */
const MIXED = {
  e0: (m, X) => Math.sqrt(X ** m.a),
  e1: (m, X) => (X ** m.a) ** 2 / X ** m.b,
  e2: (m, X) => X ** m.a * X ** m.b / X ** m.c,
  m0: (m, X) => Math.sqrt(X) ** m.a,
  m1: (m, X) => Math.sqrt(X ** m.a) * X ** m.b,
  m2: (m, X) => X ** m.a / Math.sqrt(X ** m.b),
  m3: (m, X) => (m.k * X ** m.a) ** 2,
  h0: (m, X, Y) => Math.sqrt(X ** (m.a * m.b) * Y ** (2 * m.b)),
  h1: (m, X) => X ** m.a * Math.sqrt(X ** (2 * m.a)),
  h2: (m, X) => Math.sqrt(m.k * X ** m.a),
  h3: (m, X) => Math.sqrt(X ** m.a) * Math.sqrt(X ** m.b),
  h4: (m, X, Y) => (X ** m.a * Y ** m.b) ** m.c / X ** m.d,
  h5: (m, X) => X ** -m.a * X ** m.b,
};

const X = 1.7, Y = 2.3; // letter values for expression choices

/* One slot of a monomial k·v^A·w^B from its left-hand side f(X, Y), read off
   numerically: k = f(1, 1), A = log₂(f(2, 1) / k), B = log₂(f(1, 2) / k). */
function slotValue(f, ask) {
  const k = f(1, 1);
  const r6 = (x) => Math.round(x * 1e6) / 1e6;
  if (ask === 'coef') return r6(k);
  if (ask === 'B') return r6(Math.log2(f(1, 2) / k));
  return r6(Math.log2(f(2, 1) / k)); // 'A' (or an exp-only template)
}

/* Per generator: expected value of the right answer, and (for expression
   choices) the letter values to evaluate the choices with. */
const EXPECT = {
  // directed numbers + equations: checked against meta AND against the prompt text itself
  'dn.add': (m, q) => { const v = valueOf(q); assert.equal(v - m.b, m.a); return fromPrompt(q, v); },
  'dn.sub': (m, q) => { const v = valueOf(q); assert.equal(v + m.b, m.a); return fromPrompt(q, v); },
  'dn.mul': (m, q) => { const v = valueOf(q); assert.equal(v / m.b, m.a); return fromPrompt(q, v); },
  'dn.div': (m, q) => { const v = valueOf(q); assert.equal(v * m.b, m.a); return fromPrompt(q, v); },
  'dn.combo': (m, q) => { const v = evalTokens(m.tokens); return fromPrompt(q, v); },
  'eq.linear': (m, q) => {
    const x = valueOf(q);
    assert.equal(m.a * x + m.b, m.c * x + m.d);
    const [L, R] = mathOf(q.prompt).split('=');
    const [lx, lc] = linSide(L), [rx, rc] = linSide(R);
    assert.notEqual(lx, rx, 'not one solution: ' + q.prompt);
    assert.equal(lx * x + lc, rx * x + rc, 'prompt says otherwise: ' + q.prompt);
    return { value: x };
  },
  'pr.powers': (m, q) => {
    if (m.v === 'calc') return { value: powLoop(m.base, m.exp) };
    if (m.v === 'rev') { let e = 0, p = 1; while (p < m.value) { p *= m.base; e++; } assert.equal(p, m.value); return { value: e }; }
    // prod: "b · b · b = b^{?}" — the answer is how many factors the prompt prints
    const [chain, rhs] = mathOf(q.prompt).split('=');
    const factors = chain.split('·').map((s) => s.trim());
    assert.ok(factors.every((f) => f === String(m.base)) && rhs.trim() === `${m.base}^{?}`, q.prompt);
    return { value: factors.length };
  },
  'pr.laws': (m) => {
    const B = m.base;
    if (m.law === 0) return { value: Math.round(Math.log(B ** m.n * B ** m.m) / Math.log(B)) };
    if (m.law === 1) return { value: Math.round(Math.log(B ** m.n / B ** m.m) / Math.log(B)) };
    if (m.law === 2) return { value: Math.round(Math.log((B ** m.n) ** m.m) / Math.log(B)) };
    if (m.law === 3) return { value: powLoop(m.a * m.b, m.n) };
    if (m.law === 4) return { value: 1 };
    return { value: 1 / powLoop(B, m.n) };
  },
  'pr.param': (m) => {
    if (m.sub === 0) return { value: Math.log2(2 ** m.a * 2 ** m.b) };
    if (m.sub === 1) return { value: Math.log2((2 ** m.a) ** m.b * 2 ** m.c) };
    if (m.sub === 3) return { value: Math.log2(2 ** m.a / 2 ** m.b) };
    // subs 2 and 4: one slot of (k·v^a[·w^b])^n, read off the left-hand side
    if (m.sub === 2) return { value: slotValue((x) => (m.k * x ** m.a) ** m.b, m.ask) };
    return { value: slotValue((x, y) => (m.k * x ** m.a * y ** m.b) ** m.c, m.ask) };
  },
  'pr.roots': (m) => {
    if (m.sub === 0) return { value: Math.sqrt(m.val) };
    if (m.sub === 1) return { value: Math.sqrt(m.val) };
    if (m.op === 0) return { value: Math.sqrt(m.a * m.b) };
    if (m.op === 1) return { value: Math.sqrt(m.a / m.b) };
    // op 2 and 3: the coefficient of √base, "k√b + m√b = ?√b", "√a + √b = ?√base"
    assert.equal(m.ask, 'coef');
    if (m.op === 2) return { value: (m.k * Math.sqrt(m.base) + m.m * Math.sqrt(m.base)) / Math.sqrt(m.base) };
    return { value: (Math.sqrt(m.a) + Math.sqrt(m.b)) / Math.sqrt(m.base) };
  },
  'pr.mixed': (m, q) => {
    const f = MIXED[m.t];
    if (m.type !== 'exp') assert.ok(['coef', 'A', 'B'].includes(m.ask), q.prompt);
    return { value: slotValue((x, y) => f(m, x, y), m.ask) };
  },
  'rp.ratio': (m, q) => {
    if (m.v === 'simp') return { value: m.a / m.b, ratio: true };
    const v = valueOf(q);
    const share = (m.ask === 'A' ? m.a : m.b) / (m.a + m.b);
    assert.ok(close(v / m.total, share) && Number.isInteger(v));
    return { value: v };
  },
  'rp.proportion': (m, q) => { const v = valueOf(q); assert.equal(v * m.a, m.b * m.c); return { value: v }; },
  'rp.convert': (m) => (m.v === 'd2f' ? { value: Number(m.dec), reduced: true } : { value: m.n / m.d }),
  'rp.pct': (m, q) => {
    const v = valueOf(q);
    if (m.type === 0) assert.equal(v * 100, m.pct * m.whole);
    else if (m.type === 1) assert.equal(v * m.whole, m.part * 100);
    else assert.equal(m.pct * v, m.part * 100);
    return { value: v };
  },
  'rp.change': (m, q) => {
    const v = valueOf(q);
    if (m.type === 0) assert.equal(v * 100, m.original * (100 + m.pct));
    else if (m.type === 1) assert.equal(v * 100, m.original * (100 - m.pct));
    else if (m.type === 2) assert.equal(v * m.original, Math.abs(m.final - m.original) * 100);
    else assert.equal(v * (100 + (m.isUp ? m.pct : -m.pct)), m.final * 100);
    return { value: v };
  },
};

// the prompt's own expression ("… = ?") evaluated with the test's evaluator
function fromPrompt(q, v) {
  const expr = mathOf(q.prompt).replace(/=\s*\?\s*$/, '');
  assert.equal(evalTokens(tokenize(expr)), v, 'prompt says otherwise: ' + q.prompt);
  return { value: v };
}

/* ── tests ──────────────────────────────────────────────────────────── */
test('mulberry32 is repeatable', () => {
  const a = mulberry32(42), b = mulberry32(42);
  const x = [a(), a(), a(), a(), a()], y = [b(), b(), b(), b(), b()];
  assert.deepEqual(x, y);
  assert.ok(x.every((n) => n >= 0 && n < 1));
  assert.notDeepEqual(x, [mulberry32(43)(), 0, 0, 0, 0]);
});

test('randInt, pick, shuffle stay in range', () => {
  const r = mulberry32(1);
  for (let i = 0; i < 500; i++) {
    const n = randInt(r, -3, 3);
    assert.ok(Number.isInteger(n) && n >= -3 && n <= 3);
    assert.ok(['a', 'b'].includes(pick(r, ['a', 'b'])));
  }
  const arr = [1, 2, 3, 4, 5];
  const s = shuffle(r, arr);
  assert.deepEqual([...s].sort(), arr);
  assert.deepEqual(arr, [1, 2, 3, 4, 5]); // input untouched
});

test('makeChoices: 4 distinct, answer points at the correct one, fills missing', () => {
  const r = mulberry32(7);
  for (let i = 0; i < 200; i++) {
    const { choices, answer } = makeChoices(r, '5', ['4', '4', '5', '−5']);
    assert.equal(choices.length, 4);
    assert.equal(new Set(choices).size, 4);
    assert.equal(choices[Number(answer)], '5');
  }
  const { choices } = makeChoices(r, '2 : 3', []);
  assert.equal(new Set(choices).size, 4);
  assert.ok(choices.includes('2 : 3'));
});

test('checkAnswer number cases', () => {
  const q = (answer, tol) => ({ kind: 'number', answer, tol });
  assert.equal(checkAnswer(q('-3'), '−3'), true);
  assert.equal(checkAnswer(q('-3'), '-3'), true);
  assert.equal(checkAnswer(q('-3'), '3'), false);
  assert.equal(checkAnswer(q('1.5'), '3/2'), true);
  assert.equal(checkAnswer(q('3/2'), '1.5'), true);
  assert.equal(checkAnswer(q('2.5'), '2.50'), true);
  assert.equal(checkAnswer(q('1.5', 0.05), '1.49'), true);
  assert.equal(checkAnswer(q('1.5'), '1.49'), false);
  assert.equal(checkAnswer(q('7'), 7), true);
  assert.equal(checkAnswer(q('7'), ''), false);
  assert.equal(checkAnswer(q('7'), 'abc'), false);
  assert.equal(checkAnswer(q('7'), '7/0'), false);
});

test('checkAnswer choice cases', () => {
  const q = { kind: 'choice', choices: ['a', 'b', 'c', 'd'], answer: '2' };
  assert.equal(checkAnswer(q, '2'), true);
  assert.equal(checkAnswer(q, 2), true);
  assert.equal(checkAnswer(q, '1'), false);
  assert.equal(checkAnswer(q, 'c'), false);
});

test('registry: every generator has its metadata and an independent check', () => {
  assert.ok(GENERATORS.length >= 16);
  const ids = new Set();
  for (const g of GENERATORS) {
    assert.ok(!ids.has(g.id), 'duplicate id ' + g.id); ids.add(g.id);
    assert.ok([7, 8, 9].includes(g.grade), g.id);
    assert.ok(['num', 'alg', 'fn', 'geo'].includes(g.world), g.id);
    assert.equal(typeof g.chapter, 'string');
    assert.ok(g.kinds.includes('number'), g.id + ' must support typed answers');
    // only a generator whose every variant is typed-only may skip 'choice'
    assert.equal(g.kinds.includes('choice'), !(TYPED_ONLY[g.id] && TYPED_ONLY[g.id]({})), g.id + ' kinds');
    assert.ok(EXPECT[g.id] || EXPECT_2B[g.id], 'no independent check for ' + g.id);
    // the chapter is a real chapter button of that topic (src/home/chapters.js, read as text)
    if (g.chapter) assert.ok(CHAPTERS[g.topic] && CHAPTERS[g.topic].includes(g.chapter), `${g.id}: no chapter "${g.chapter}"`);
  }
});

// the contract for the generators checked in THIS file; their guessers' guard
// is in duel-guard.test.mjs, and the Task-2b topics are checked in
// duel-geo / duel-solids / duel-fnalg .test.mjs (the files run in parallel)
const MINE = GENERATORS.filter((g) => EXPECT[g.id]);
contractTests(MINE, EXPECT);


test('buildDuel spreads over topics first, then generators', () => {
  const cases = [[7, 'random'], [8, 'random'], [8, 'num'], [9, 'random']];
  for (const [grade, subject] of cases) {
    const pool = poolFor({ grade, subject });
    for (let seed = 1; seed <= 50; seed++) {
      const qs = buildDuel(seed, { grade, subject });
      const byTopic = {};
      for (const q of qs) byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
      const topics = [...new Set(pool.map((g) => g.topic))];
      const counts = topics.map((t) => byTopic[t] || 0);
      assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `${grade}/${subject}/${seed} topics ${JSON.stringify(byTopic)}`);
      for (const t of topics) {
        const ids = pool.filter((g) => g.topic === t).map((g) => g.id);
        const per = ids.map((id) => qs.filter((q) => q.gen === id).length);
        assert.ok(Math.max(...per) - Math.min(...per) <= 1, `${grade}/${subject}/${seed} ${t} ${JSON.stringify(per)}`);
      }
    }
  }
});

test('buildDuel: no generator more than 4 times when the pool allows (one-generator topics do not fill a duel)', () => {
  for (const grade of [7, 8, 9]) for (const subject of ['random', 'num', 'alg', 'fn', 'geo']) {
    const pool = poolFor({ grade, subject });
    if (!pool.length) continue;
    const cap = Math.max(GEN_CAP, Math.ceil(15 / pool.length)); // grade 7 alg: equation-solver alone → 15
    for (let seed = 1; seed <= 60; seed++) {
      const qs = buildDuel(seed * 7717 + 1, { grade, subject });
      const per = {};
      for (const q of qs) per[q.gen] = (per[q.gen] || 0) + 1;
      assert.ok(Math.max(...Object.values(per)) <= cap, `${grade}/${subject}/${seed}: ${JSON.stringify(per)}`);
      for (const i of [3, 7, 11]) assert.equal(qs[i].kind, 'number', `${grade}/${subject}/${seed} slot ${i}`);
    }
  }
  assert.equal(GEN_CAP, 4);
  // grade 9 functions: intersection (one generator) gets at most 4 of 15
  for (let seed = 1; seed <= 60; seed++) assert.ok(buildDuel(seed, { grade: 9, subject: 'fn' }).filter((q) => q.gen === 'ix.lines').length <= 4);
});

test('poolFor filters by grade and world', () => {
  // no grade-7 functions topic; grade-7 geometry = solids and triangles
  assert.deepEqual(poolFor({ grade: 7, subject: 'fn' }), []);
  assert.deepEqual([...new Set(poolFor({ grade: 7, subject: 'geo' }).map((g) => g.topic))].sort(), ['solids3d', 'triangles']);
  assert.ok(poolFor({ grade: 8, subject: 'fn' }).every((g) => g.topic === 'linear-function'));
  assert.ok(poolFor({ grade: 9, subject: 'fn' }).some((g) => g.topic === 'intersection'));
  assert.ok(poolFor({ grade: 9, subject: 'geo' }).some((g) => g.topic === 'circle'));
  const p7 = poolFor({ grade: 7, subject: 'random' });
  assert.ok(p7.length > 0 && p7.every((g) => g.grade <= 7));
  assert.ok(!p7.some((g) => g.topic === 'powers-roots'));
  const p8 = poolFor({ grade: 8, subject: 'num' });
  assert.ok(p8.some((g) => g.topic === 'powers-roots'));
  assert.ok(p8.every((g) => g.world === 'num'));
  assert.ok(poolFor({ grade: 9, subject: 'alg' }).every((g) => g.world === 'alg'));
});

test('buildDuel(7, grade 7 random): 15 distinct questions, number slots, grade-7 topics only', () => {
  const qs = buildDuel(7, { grade: 7, subject: 'random' });
  assert.equal(qs.length, 15);
  assert.equal(new Set(qs.map((q) => q.prompt)).size, 15);
  for (const i of [3, 7, 11]) assert.equal(qs[i].kind, 'number', 'idx ' + i);
  for (const [i, q] of qs.entries()) if (![3, 7, 11].includes(i)) assert.equal(q.kind, 'choice', 'idx ' + i);
  const grade7 = new Set(GENERATORS.filter((g) => g.grade <= 7).map((g) => g.topic));
  assert.ok(qs.every((q) => grade7.has(q.topic)));
  // the same seed gives the same duel
  assert.deepEqual(buildDuel(7, { grade: 7, subject: 'random' }).map((q) => q.prompt), qs.map((q) => q.prompt));
  // spread: more than one topic in a random duel
  assert.ok(new Set(qs.map((q) => q.topic)).size >= 3);
});

test('buildDuel over many seeds, grades and subjects', () => {
  for (const grade of [7, 8, 9]) {
    for (const subject of ['random', 'num', 'alg', 'fn', 'geo']) {
      const pool = poolFor({ grade, subject });
      if (!pool.length) { assert.throws(() => buildDuel(1, { grade, subject })); continue; }
      const numberable = pool.some((g) => g.kinds.includes('number'));
      for (let seed = 1; seed <= 50; seed++) {
        const qs = buildDuel(seed * 7919, { grade, subject });
        assert.equal(qs.length, 15);
        assert.equal(new Set(qs.map((q) => q.prompt)).size, 15, `${grade}/${subject}/${seed}`);
        if (numberable) for (const i of [3, 7, 11]) assert.equal(qs[i].kind, 'number');
        assert.ok(qs.every((q) => pool.some((g) => g.id === q.gen)));
      }
    }
  }
});

test('buildDuel stays mostly choice although some questions are typed only', () => {
  const cases = [];
  for (const grade of [7, 8, 9]) for (const subject of ['random', 'num', 'alg', 'fn', 'geo']) if (poolFor({ grade, subject }).length) cases.push([grade, subject]);
  for (const [grade, subject] of cases) {
    let choice = 0, total = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const qs = buildDuel(seed * 104729, { grade, subject });
      const c = qs.filter((q) => q.kind === 'choice').length;
      // more than half of every duel is 4 choices; slots 3, 7, 11 stay typed
      assert.ok(c >= 8, `${grade}/${subject}/${seed}: only ${c} choice questions`);
      for (const i of [3, 7, 11]) assert.equal(qs[i].kind, 'number');
      // a typed question on a choice slot is always a typed-only variant
      qs.forEach((q, i) => { if (![3, 7, 11].includes(i) && q.kind === 'number') assert.ok(typedOnly(q), q.prompt); });
      choice += c; total += qs.length;
    }
    assert.ok(choice / total >= 0.6, `${grade}/${subject}: ${(choice / total * 100).toFixed(1)}% choice`);
  }
});
