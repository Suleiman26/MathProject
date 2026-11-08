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
import { buildDuel, poolFor } from './build.js';

/* ── helpers written for the tests only ─────────────────────────────── */
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const powLoop = (b, e) => { let p = 1; for (let i = 0; i < e; i++) p *= b; return p; };

/* A tiny evaluator for the math markup used in choices:
   numbers (− or -), "P : Q" ratios, \frac{a}{b}, \sqrt{n}, letters, x^{n},
   "·" or implicit products. env gives the letters' values. */
function evalMath(src, env = {}) {
  let s = src.replace(/−/g, '-').replace(/\s+/g, '');
  const ratio = s.match(/^(-?\d+):(\d+)$/);
  if (ratio) return Number(ratio[1]) / Number(ratio[2]);
  let i = 0;
  const peek = () => s[i];
  function group() { // {expr}
    if (s[i] !== '{') throw new Error('expected { in ' + src);
    i++; const v = expr(); if (s[i] !== '}') throw new Error('expected } in ' + src); i++; return v;
  }
  function atom() {
    if (s.startsWith('\\frac', i)) { i += 5; const a = group(); const b = group(); return a / b; }
    if (s.startsWith('\\sqrt', i)) { i += 5; return Math.sqrt(group()); }
    if (peek() === '(') { i++; const v = expr(); if (s[i] !== ')') throw new Error(') in ' + src); i++; return v; }
    const num = s.slice(i).match(/^\d+(\.\d+)?/);
    if (num) { i += num[0].length; return Number(num[0]); }
    if (/[a-z]/.test(peek() || '')) { const c = s[i++]; if (!(c in env)) throw new Error('no value for ' + c); return env[c]; }
    throw new Error('bad token at ' + i + ' in ' + src);
  }
  function power() {
    let v = atom();
    if (s[i] === '^') { i++; v = Math.pow(v, s[i] === '{' ? group() : atom()); }
    return v;
  }
  function term() {
    let v = power();
    for (;;) {
      if (s[i] === '·') { i++; v *= power(); continue; }
      if (i < s.length && s[i] !== '}' && s[i] !== ')' && s[i] !== '+' && s[i] !== '-') { v *= power(); continue; }
      return v;
    }
  }
  function expr() {
    let sign = 1;
    if (s[i] === '-') { sign = -1; i++; }
    let v = sign * term();
    while (s[i] === '+' || s[i] === '-') { const op = s[i++]; v = op === '+' ? v + term() : v - term(); }
    return v;
  }
  const v = expr();
  if (i !== s.length) throw new Error('left over in ' + src + ' at ' + i);
  return v;
}

/* Order of operations evaluator for directed-numbers ch6 tokens (own
   shunting-yard, not the port's step reducer). */
function evalTokens(tokens) {
  const prec = { '+': 1, '−': 1, '×': 2, '÷': 2 };
  const out = [], ops = [];
  const apply = () => { const op = ops.pop(), b = out.pop(), a = out.pop();
    out.push(op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b); };
  for (const t of tokens) {
    if (typeof t === 'number') out.push(t);
    else if (t === '(') ops.push(t);
    else if (t === ')') { while (ops[ops.length - 1] !== '(') apply(); ops.pop(); }
    else { while (ops.length && ops[ops.length - 1] !== '(' && prec[ops[ops.length - 1]] >= prec[t]) apply(); ops.push(t); }
  }
  while (ops.length) apply();
  return out[0];
}

/* Read the math of a prompt (directed numbers): "(+12) + (−4) = ?" → tokens. */
function mathOf(prompt) {
  const m = prompt.match(/\$([^$]*)\$/);
  assert.ok(m, 'no $…$ in ' + prompt);
  return m[1];
}
function tokenize(expr) {
  const s = expr.replace(/\s+/g, '');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const last = out[out.length - 1];
    const afterValue = typeof last === 'number' || last === ')';
    if (/\d/.test(ch) || ((ch === '−' || ch === '+') && !afterValue)) {
      const n = s.slice(i).match(/^[−+]?\d+/)[0];
      out.push(Number(n.replace('−', '-').replace('+', '')));
      i += n.length;
    } else if ('+−×÷()'.includes(ch)) { out.push(ch); i++; }
    else throw new Error('cannot read ' + expr);
  }
  return out;
}
/* One side of a linear equation as [x coefficient, constant]: "3x − 2" → [3, −2]. */
function linSide(side) {
  const s = side.replace(/\s+/g, '').replace(/−/g, '-');
  let cx = 0, c = 0;
  for (const m of s.matchAll(/([+-]?)(\d*)(x?)/g)) {
    if (!m[0]) continue;
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3]) cx += sign * (m[2] === '' ? 1 : Number(m[2]));
    else if (m[2] !== '') c += sign * Number(m[2]);
  }
  return [cx, c];
}

/* ── two "guessers" that must NOT beat 40 % (chance = 25 %) ────────
   pairs: pick the choice with the most neighbours (its negative, or the
   same text with one number ±1); ties split evenly. isolated: the choice
   with the fewest. median: lower / upper middle of the 4 values. */
function nbr(a, b) {
  const num = (t) => (/^−?\d+(\.\d+)?$/.test(t) ? Number(t.replace('−', '-')) : null);
  const pa = num(a), pb = num(b);
  if (pa !== null && pb !== null) return (pa !== 0 && pa === -pb) || close(Math.abs(pa - pb), 1);
  if (a === '−' + b || b === '−' + a) return true;
  const sk = (t) => t.replace(/\d+(\.\d+)?/g, '#');
  if (sk(a) !== sk(b)) return false;
  const na = a.match(/\d+(\.\d+)?/g) || [], nb = b.match(/\d+(\.\d+)?/g) || [];
  const d = na.map((x, i) => [Number(x), Number(nb[i])]).filter(([x, y]) => x !== y);
  return d.length === 1 && close(Math.abs(d[0][0] - d[0][1]), 1);
}
function guessScores(q) {
  const cs = q.choices;
  const sc = cs.map((c, i) => cs.filter((o, j) => j !== i && nbr(c, o)).length);
  const ans = Number(q.answer);
  const share = (target) => { const set = sc.map((s, i) => (s === target ? i : -1)).filter((i) => i >= 0); return set.includes(ans) ? 1 / set.length : 0; };
  const pairs = share(Math.max(...sc)), isolated = share(Math.min(...sc));
  let ranks = null; // the answer's rank among the values: [smallest, lower, upper, largest]
  const vals = cs.map((c) => { try { return evalMath(c); } catch { return NaN; } });
  if (vals.every(Number.isFinite)) {
    const order = vals.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]).map(([, i]) => i);
    ranks = order.map((i) => (i === ans ? 1 : 0));
  }
  return { pairs, isolated, ranks };
}

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
  'pr.powers': (m) => {
    if (m.v === 'calc') return { value: powLoop(m.base, m.exp) };
    if (m.v === 'rev') { let e = 0, p = 1; while (p < m.value) { p *= m.base; e++; } assert.equal(p, m.value); return { value: e }; }
    return { value: powLoop(m.base, m.count) }; // prod: the choice is a power with that value
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
    const env = { [m.v]: X, [m.w]: Y };
    if (m.sub === 2) return { value: (m.k * X ** m.a) ** m.b, env };
    return { value: (m.k * X ** m.a * Y ** m.b) ** m.c, env };
  },
  'pr.roots': (m) => {
    if (m.sub === 0) return { value: Math.sqrt(m.val) };
    if (m.sub === 1) return { value: Math.sqrt(m.val) };
    if (m.op === 0) return { value: Math.sqrt(m.a * m.b) };
    if (m.op === 1) return { value: Math.sqrt(m.a / m.b) };
    if (m.op === 2) return m.ask === 'coef' ? { value: (m.k * Math.sqrt(m.base) + m.m * Math.sqrt(m.base)) / Math.sqrt(m.base) }
      : { value: m.k * Math.sqrt(m.base) + m.m * Math.sqrt(m.base) };
    return { value: Math.sqrt(m.a) + Math.sqrt(m.b) };
  },
  'pr.mixed': (m) => {
    const f = MIXED[m.t];
    if (m.type === 'exp') return { value: Math.round(Math.log2(f(m, 2, 3)) * 1e6) / 1e6 };
    return { value: f(m, X, Y), env: { [m.v]: X, [m.w]: Y } };
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

function valueOf(q) {
  return q.kind === 'number' ? parseNum(q.answer) : evalMath(q.choices[Number(q.answer)]);
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
    assert.ok(g.kinds.includes('choice'), g.id + ' must support choice');
    assert.ok(EXPECT[g.id], 'no independent check for ' + g.id);
  }
});

for (const g of GENERATORS) {
  for (const want of g.kinds) {
    test(`${g.id} (${want}) × 1000: well formed and right`, () => {
      const r = mulberry32(1000 + g.id.length * 31 + (want === 'number' ? 7 : 0));
      for (let run = 0; run < 1000; run++) {
        const q = g.make(r, want);
        const where = `${g.id} run ${run}: ${q.prompt} | ${JSON.stringify(q.choices)} | ${q.answer}`;
        assert.equal(q.gen, g.id);
        assert.equal(q.topic, g.topic);
        assert.equal(q.chapter, g.chapter);
        assert.equal(q.kind, want, where);
        assert.ok(typeof q.prompt === 'string' && q.prompt.trim().length > 0, where);
        assert.ok(!/NaN|undefined|null|Infinity/.test(q.prompt), where);
        assert.ok(!/(^|[\s(=+×÷·])-\d/.test(q.prompt), 'ASCII minus in prompt: ' + where);
        assert.equal((q.prompt.match(/\$/g) || []).length % 2, 0, 'unbalanced $: ' + where);
        if (q.kind === 'choice') {
          assert.equal(q.choices.length, 4, where);
          assert.equal(new Set(q.choices).size, 4, where);
          assert.ok(['0', '1', '2', '3'].includes(q.answer), where);
          for (const c of q.choices) {
            assert.ok(typeof c === 'string' && c.length > 0 && !/NaN|undefined|null|Infinity/.test(c), where);
            assert.ok(!/(^|[\s(·])-\d/.test(c), 'ASCII minus in choice: ' + where);
            assert.ok(!/\^\{(0|1|−[^}]*)\}|\\sqrt\{[01]\}|(^|[^\d.])[01](?=\\sqrt|[a-z])/.test(c), 'odd form in choice: ' + where);
          }
          assert.equal(checkAnswer(q, q.answer), true);
        } else {
          assert.equal(q.choices, undefined, where);
          assert.ok(Number.isFinite(parseNum(q.answer)), where);
          assert.equal(checkAnswer(q, q.answer), true);
        }
        const exp = EXPECT[g.id](q.meta, q);
        if (q.kind === 'number') {
          assert.ok(close(parseNum(q.answer), exp.value), `expected ${exp.value}: ` + where);
        } else {
          // exactly one choice has the right value (no second right answer hiding as a "wrong" one)
          const vals = q.choices.map((c) => evalMath(c, exp.env || {}));
          const hits = vals.map((v, i) => (close(v, exp.value) ? i : -1)).filter((i) => i >= 0);
          assert.deepEqual(hits, [Number(q.answer)], `expected ${exp.value}: ` + where);
          if (exp.reduced) { const f = q.choices[Number(q.answer)].match(/\\frac\{(\d+)\}\{(\d+)\}/); assert.ok(f && gcd(+f[1], +f[2]) === 1, where); }
          if (exp.ratio) { const p = q.choices[Number(q.answer)].match(/(\d+) : (\d+)/); assert.ok(p && gcd(+p[1], +p[2]) === 1, where); }
        }
      }
    });
  }
}

for (const g of GENERATORS) {
  test(`${g.id}: choices don't give the answer away (4000 questions, guessers ≤ 40%)`, () => {
    const r = mulberry32(777 + g.id.length);
    const sum = { pairs: 0, isolated: 0, ranks: [0, 0, 0, 0] };
    let n = 0, nMed = 0;
    for (let i = 0; i < 4000; i++) {
      const s = guessScores(g.make(r, 'choice'));
      n++; sum.pairs += s.pairs; sum.isolated += s.isolated;
      if (s.ranks) { nMed++; s.ranks.forEach((x, k) => { sum.ranks[k] += x; }); }
    }
    const rates = { pairs: sum.pairs / n, isolated: sum.isolated / n };
    if (nMed >= 400) {
      ['smallest', 'lower median', 'upper median', 'largest'].forEach((name, k) => { rates[name] = sum.ranks[k] / nMed; });
    }
    for (const [k, v] of Object.entries(rates)) {
      assert.ok(v <= 0.4, `${g.id}: "${k}" guesser hits ${(v * 100).toFixed(1)}%`);
    }
  });
}

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

test('poolFor filters by grade and world', () => {
  assert.deepEqual(poolFor({ grade: 7, subject: 'fn' }), []);
  assert.deepEqual(poolFor({ grade: 7, subject: 'geo' }), []);
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
