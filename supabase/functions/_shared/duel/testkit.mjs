// Shared test helpers for the duel question engine (not a test file itself:
// duel.test.mjs, duel-geo.test.mjs and duel-fnalg.test.mjs import it, and
// node --test runs those three files in parallel).
//   • evalMath / tokenizers — own evaluators, written for the tests only;
//   • guessScores — the "guessers" every choice question must beat (≤ 40 %);
//   • contractTests(gens, EXPECT) — 1,000 runs per generator per answer kind:
//     well formed + the right answer recomputed by EXPECT[g.id] (independent
//     of the port);
//   • guardTests(gens) — the guessers per generator AND per variant, 3 seeds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from './rng.js';
import { checkAnswer, parseNum } from './answer.js';

/* ── helpers written for the tests only ─────────────────────────────── */
export const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
export const powLoop = (b, e) => { let p = 1; for (let i = 0; i < e; i++) p *= b; return p; };

/* A tiny evaluator for the math markup used in choices:
   numbers (− or -), "P : Q" ratios, \frac{a}{b}, \sqrt{n}, π, letters, x^{n},
   "·" or implicit products. env gives the letters' values. */
export function evalMath(src, env = {}) {
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
    if (peek() === 'π') { i++; return Math.PI; }
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
      if (s[i] === '÷') { i++; v /= power(); continue; }
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
export function evalTokens(tokens) {
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
export function mathOf(prompt) {
  const m = prompt.match(/\$([^$]*)\$/);
  assert.ok(m, 'no $…$ in ' + prompt);
  return m[1];
}
export function tokenize(expr) {
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
export function linSide(side) {
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

/* ── "guessers" that must NOT beat 40 % (chance = 25 %) ─────────────
   Each returns the share of the right answer it gets on one question (ties
   split evenly), or null when it can't decide (counted as a random pick,
   0.25). Written here independently of choices.js. */
const gcdT = (a, b) => (b ? gcdT(b, a % b) : Math.abs(a));
export function nbr(a, b) {
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
export function guessScores(q) {
  const cs = q.choices;
  const ans = Number(q.answer);
  const among = (set) => (set.length ? (set.includes(ans) ? 1 / set.length : 0) : null);
  const pickBy = (xs, wantMax) => {
    const t = wantMax ? Math.max(...xs) : Math.min(...xs);
    return among(xs.map((x, i) => (close(x, t) ? i : -1)).filter((i) => i >= 0));
  };
  // the only choice whose key differs from all others (fires when exactly one such)
  const oddOne = (keys) => {
    if (keys.some((k) => k === null)) return null;
    const u = keys.map((k, i) => (keys.filter((x) => x === k).length === 1 ? i : -1)).filter((i) => i >= 0);
    return u.length === 1 ? among(u) : null;
  };
  const nb = cs.map((c, i) => cs.filter((o, j) => j !== i && nbr(c, o)).length);
  const out = {
    pairs: pickBy(nb, true),
    isolated: pickBy(nb, false),
    'shortest text': pickBy(cs.map((c) => c.length), false),
    'longest text': pickBy(cs.map((c) => c.length), true),
    'only last digit': oddOne(cs.map((c) => (c.match(/\d(?=\D*$)/) || [null])[0])),
    'only shape': oddOne(cs.map((c) => c.replace(/\d+(\.\d+)?/g, '#'))),
  };
  // consensus: shares the most numbers (in the same places) with the others
  const toks = cs.map((c) => c.match(/\d+(\.\d+)?/g) || []);
  if (toks.some((t) => t.length > 1)) {
    out.consensus = pickBy(toks.map((t, i) => t.reduce((s, x, k) => s + toks.filter((u, j) => j !== i && u[k] === x).length, 0)), true);
  }
  // a number that appears in the prompt / the only ones that don't
  const pnums = new Set(q.prompt.match(/\d+(\.\d+)?/g) || []);
  const inP = cs.map((c, i) => (/^−?\d+(\.\d+)?$/.test(c) && pnums.has(c.replace('−', '')) ? i : -1)).filter((i) => i >= 0);
  out['number from the prompt'] = among(inP);
  out['not from the prompt'] = inP.length && inP.length < 4 ? among(cs.map((_, i) => i).filter((i) => !inP.includes(i))) : null;
  // near a printed number: a sharp kid knows the answer is not a number shown in
  // the question, but close to one — drop the printed ones, pick the closest
  const pv = [...pnums].map(Number);
  if (pv.length && cs.every((c) => /^−?\d+(\.\d+)?$/.test(c))) {
    const d = cs.map((c, i) => (inP.includes(i) ? null : Math.min(...pv.map((p) => Math.abs(p - Number(c.replace('−', '-')))))));
    const left = d.filter((x) => x !== null);
    out['near a printed number'] = left.length ? among(d.map((x, i) => (x !== null && close(x, Math.min(...left)) ? i : -1)).filter((i) => i >= 0)) : null;
  }
  // angle questions: "the only nice angle" — the choices that are multiples of 5 / 10 / 15
  // (random among them; fires when 1–3 of the 4 are)
  if (/°|מעלות|הזווית/.test(q.prompt) && cs.every((c) => /^\d+$/.test(c))) {
    for (const d of [5, 10, 15]) {
      const S = cs.map((c, i) => (Number(c) % d === 0 ? i : -1)).filter((i) => i >= 0);
      out[`only ×${d} (angle)`] = S.length && S.length < 4 ? among(S) : null;
    }
  }
  // extreme numbers, over EVERY number printed in a choice (coefficients, exponents,
  // roots, fractions, "a : b"): sum, first, last; and how many it shares with the prompt
  const nums = toks.map((t) => t.map(Number));
  if (nums.every((t) => t.length)) {
    const sums = nums.map((t) => t.reduce((s, x) => s + x, 0));
    out['smallest sum'] = pickBy(sums, false); out['largest sum'] = pickBy(sums, true);
    out['smallest first number'] = pickBy(nums.map((t) => t[0]), false); out['largest first number'] = pickBy(nums.map((t) => t[0]), true);
    out['smallest last number'] = pickBy(nums.map((t) => t[t.length - 1]), false); out['largest last number'] = pickBy(nums.map((t) => t[t.length - 1]), true);
  }
  const shared = toks.map((t) => t.filter((x) => pnums.has(x)).length);
  out['fewest shared with the prompt'] = pickBy(shared, false); out['most shared with the prompt'] = pickBy(shared, true);
  // every number of the choice appears in another choice (the hub of a web of mistakes)
  const covered = toks.map((t, i) => (t.length && t.every((x) => toks.some((u, j) => j !== i && u.includes(x))) ? i : -1)).filter((i) => i >= 0);
  out['all its numbers elsewhere'] = among(covered);
  // fractions / ratios: the only reduced one; student sanity: the only proper reduced
  // fraction, a positive "1 over …"
  const fr = cs.map((c) => c.match(/^(−?)\\frac\{(\d+)\}\{(\d+)\}$/));
  const rt = cs.map((c) => c.match(/^(\d+) : (\d+)$/));
  if (cs.every((c, i) => fr[i] || rt[i])) {
    out['only reduced'] = oddOne(cs.map((c, i) => { const m = fr[i] || rt[i]; const p = +m[fr[i] ? 2 : 1], d = +m[fr[i] ? 3 : 2]; return String(gcdT(p, d) === 1); }));
  }
  if (fr.some(Boolean)) {
    out['proper reduced fraction'] = among(fr.map((m, i) => (m && !m[1] && +m[2] < +m[3] && gcdT(+m[2], +m[3]) === 1 ? i : -1)).filter((i) => i >= 0));
    out['positive 1/x'] = among(fr.map((m, i) => (m && !m[1] && m[2] === '1' ? i : -1)).filter((i) => i >= 0));
  }
  const vals = cs.map((c) => { try { return evalMath(c); } catch { return NaN; } });
  if (vals.every(Number.isFinite)) {
    const order = vals.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]).map(([, i]) => i);
    ['smallest', 'lower median', 'upper median', 'largest'].forEach((name, k) => { out[name] = order[k] === ans ? 1 : 0; });
    out['closest to zero'] = pickBy(vals.map(Math.abs), false);
    out['farthest from zero'] = pickBy(vals.map(Math.abs), true);
    const mean = vals.reduce((s, v) => s + v, 0) / 4;
    out['nearest the mean'] = pickBy(vals.map((v) => Math.abs(v - mean)), false);
    out['only sign'] = oddOne(vals.map((v) => (v < 0 ? 'n' : v > 0 ? 'p' : 'z')));
    out['only whole'] = oddOne(vals.map((v) => (Number.isInteger(v) ? 'i' : 'f')));
    if (vals.every(Number.isInteger)) out['only parity'] = oddOne(vals.map((v) => Math.abs(v) % 2));
  }
  return out;
}

// which variant of a generator a question is (from its meta), for per-variant
// guards; the letters (v, w = x, y, …) are not part of the variant.
// ask = which slot of a multi-part answer; one = a ±1 factor (directed numbers)
export function variantOf(q) {
  const m = q.meta || {};
  const key = ['v', 'law', 'sub', 'op', 't', 'type', 'ask', 'one']
    .filter((k) => m[k] !== undefined && !/^[a-z]$/.test(String(m[k])))
    .map((k) => `${k}=${m[k]}`).join(',');
  return key || 'all';
}

/* Typed-only variants (fix round 5): one exponent / coefficient / count worked
   out from numbers printed in the question. They must come back as kind
   'number' even when 4 choices are asked for. Written here from the meta, on
   its own (the same list sits at the top of topics/powers-roots.js). */
export const TYPED_ONLY = {
  'pr.powers': (m) => m.v === 'prod' || m.v === 'rev',
  'pr.param': (m) => [0, 2, 4].includes(m.sub),
  'pr.roots': (m) => m.sub === 2 && (m.op === 2 || m.op === 3),
  'pr.mixed': () => true,
  // Task 2b: Pythagoras answers (the missing side is next to a printed side)
  'qd.rhombus': (m) => m.v === 'side',
  'qd.trap': (m) => m.v === 'isoH',
  'so.box': (m) => m.v === 'diag' || m.v === 'ratio',
  'so.cone': (m) => m.v === 'slant',
  'so.pyr': (m) => m.v === 'apothem' || m.v === 'height',
  'tr.special': (m) => m.v === 'pyHyp' || m.v === 'pyLeg',
};
export const typedOnly = (q) => !!(TYPED_ONLY[q.gen] && TYPED_ONLY[q.gen](q.meta || {}));

/* The prompt's own equation with the answer put in place of its one "?":
   both sides evaluated (own evaluator) at two sets of letter values. Checks
   one-slot answers against the TEXT the student sees, not only the meta. */
export const LETTERS = [
  { x: 1.37, y: 2.29, z: 3.11, a: 1.73, b: 2.57, m: 1.19, n: 2.83, t: 3.37 },
  { x: 2.71, y: 1.21, z: 1.53, a: 3.07, b: 1.31, m: 2.39, n: 1.47, t: 1.83 },
];
export function promptHolds(q, ansText) {
  const m = mathOf(q.prompt);
  if ((m.match(/\?/g) || []).length !== 1 || m.split('=').length !== 2) return null; // "? · ?" (law 3)
  const [lhs, rhs] = m.split('=');
  return LETTERS.every((env) => close(evalMath(lhs, env), evalMath(rhs.replace('?', `(${ansText})`), env)));
}

/** the right answer's value: the typed answer, or the marked choice evaluated */
export function valueOf(q) {
  return q.kind === 'number' ? parseNum(q.answer) : evalMath(q.choices[Number(q.answer)]);
}

/* ── the 1,000-run contract ─────────────────────────────────────────── */
export function contractTests(gens, EXPECT) {
  for (const g of gens) {
    for (const want of ['choice', 'number']) {
      test(`${g.id} (${want}) × 1000: well formed and right`, () => {
        const r = mulberry32(1000 + g.id.length * 31 + (want === 'number' ? 7 : 0));
        for (let run = 0; run < 1000; run++) {
          const q = g.make(r, want);
          const where = `${g.id} run ${run}: ${q.prompt} | ${JSON.stringify(q.choices)} | ${q.answer}`;
          assert.equal(q.gen, g.id);
          assert.equal(q.topic, g.topic);
          assert.equal(q.chapter, g.chapter);
          // typed-only variants are typed even when 4 choices are asked for
          assert.equal(q.kind, typedOnly(q) ? 'number' : want, where);
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
              for (const m of c.matchAll(/\\sqrt\{(\d+)\}/g)) assert.ok(!Number.isInteger(Math.sqrt(+m[1])), 'root of a square: ' + where);
              const eq = c.match(/^(\d+) : (\d+)$/);
              assert.ok(!eq || eq[1] !== eq[2], 'equal-parts ratio: ' + where);
              // fraction denominators stay "nice" (2^a·5^b, like the real ones)
              for (const m of c.matchAll(/\\frac\{\d+\}\{(\d+)\}/g)) {
                let d = +m[1]; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5;
                if (g.topic === 'ratio-percent') assert.ok(d === 1 && +m[1] <= 2000, 'odd denominator: ' + where);
              }
              // no negative choices when nothing in the question is negative
              // (directed numbers, algebra and functions are signed by nature)
              if (!/−/.test(q.prompt) && !/−/.test(q.choices[Number(q.answer)]) && g.topic !== 'directed-numbers' && g.world !== 'alg' && g.world !== 'fn') {
                assert.ok(!c.startsWith('−'), 'negative choice without a reason: ' + where);
              }
            }
            assert.equal(checkAnswer(q, q.answer), true);
          } else {
            assert.equal(q.choices, undefined, where);
            assert.ok(Number.isFinite(parseNum(q.answer)), where);
            assert.equal(checkAnswer(q, q.answer), true);
          }
          // powers and roots: the answer makes the prompt's own equation true, and
          // no wrong choice does
          if (g.topic === 'powers-roots') {
            const ansText = q.kind === 'number' ? q.answer : q.choices[Number(q.answer)];
            const ok = promptHolds(q, ansText);
            if (ok !== null) {
              assert.ok(ok, 'prompt says otherwise: ' + where);
              if (q.kind === 'choice') for (const c of q.choices) if (c !== ansText) assert.ok(!promptHolds(q, c), 'a wrong choice fits the prompt: ' + where);
            }
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
}

/* ── the guessers' guard ────────────────────────────────────────────── */
const GUARD_SEEDS = [777, 4242, 90001]; // each seed must pass on its own
const GUARD_RUNS = 2000; // choice questions per generator per seed
const GUARD_MIN = 150;   // a variant is judged once it has this many questions

export function guardTests(gens) {
  for (const g of gens) guardTest(g);
}
function guardTest(g) {
  test(`${g.id}: choices don't give the answer away (${GUARD_SEEDS.length} seeds × ${GUARD_RUNS}, every guesser ≤ 40%, per generator and per variant)`, () => {
    const bad = [];
    for (const seed of GUARD_SEEDS) {
      const r = mulberry32(seed + g.id.length);
      const groups = {}; // '(all)' + each variant → { guesser: [hits, n] }
      const tally = (key, s) => {
        const gr = (groups[key] = groups[key] || {});
        for (const [name, h] of Object.entries(s)) { const t = (gr[name] = gr[name] || [0, 0]); t[0] += h === null ? 0.25 : h; t[1]++; }
      };
      // at least GUARD_RUNS choice questions, and on until every variant has 200
      // (typed-only variants are skipped: they never show choices)
      const seen = {};
      let nChoice = 0;
      for (let i = 0; i < GUARD_RUNS * 6; i++) {
        if (nChoice >= GUARD_RUNS && Math.min(...Object.values(seen)) >= 200) break;
        if (i >= GUARD_RUNS * 3 && nChoice >= GUARD_RUNS) break;
        const q = g.make(r, 'choice');
        if (q.kind !== 'choice') { assert.ok(typedOnly(q), 'typed on a choice slot: ' + q.prompt); continue; }
        nChoice++;
        const s = guessScores(q);
        const v = variantOf(q);
        seen[v] = (seen[v] || 0) + 1;
        tally('(all)', s);
        tally(v, s);
      }
      for (const [key, gr] of Object.entries(groups)) {
        for (const [name, [h, n]] of Object.entries(gr)) {
          if (n >= GUARD_MIN && h / n > 0.4) bad.push(`seed ${seed} ${key} "${name}" ${(h / n * 100).toFixed(1)}% of ${n}`);
        }
      }
      // a typed-only generator never shows choices; every other one keeps enough of them
      if (g.kinds.includes('choice')) assert.ok(nChoice >= GUARD_RUNS, `${g.id}: only ${nChoice} choice questions`);
      else assert.equal(nChoice, 0, g.id);
    }
    assert.deepEqual(bad, [], `${g.id} leaks: ${bad.join('; ')}`);
  });
}
