// Four answer choices + small display helpers shared by the topic ports.
//
// Choices must not give the answer away by their pattern. duel.test.mjs runs
// these "guessers" on every generator and every variant (3 seeds); each must
// stay ≤ 40 % (chance = 25 %):
//   • pairs / isolated  — most / fewest neighbours (its negative, or the same
//                         text with one number ±1);
//   • value             — smallest, lower median, upper median, largest;
//   • distance          — closest to zero, farthest from zero; nearest the mean;
//   • length            — shortest text, longest text;
//   • odd one out       — the only one with its sign / whole-or-not / parity /
//                         last digit / shape / reduced-or-not;
//   • consensus         — shares the most numbers (same places) with the others;
//   • prompt            — a number that appears in the question (or the only
//                         ones that don't);
//   • extreme numbers   — over ALL numbers printed in a choice (coefficients,
//                         exponents, roots, fractions): smallest / largest sum,
//                         first number, last number; fewest / most numbers
//                         shared with the prompt (for plain numbers these are
//                         the distance and prompt guessers above, so they are
//                         scored only for expression / fraction choices);
//   • covered           — every number of the choice appears in another choice
//                         (the answer as the hub of its mistakes);
//   • near the prompt   — leave out the numbers printed in the question, then
//                         the choice closest to any of them (plain numbers).
// Whole expressions as 4 choices (x³y², 3√2, 2⁵) leak through the extreme-
// number family whatever the decoys, so the topic ports ask ONE slot of such
// an answer ("…= ?x^{12}"); and one exponent / coefficient worked out from
// printed numbers leaks through "near the prompt", so those are typed only
// (list at the top of topics/powers-roots.js).
// So makeChoices builds candidates — real typical mistakes, two mistakes in
// one (a "web" around the answer, not a star), then decoys — and scores sets
// of 3 wrongs:
//   + the same number of neighbours for all 4 (no centre to find),
//   + the answer's rank by value and by distance from zero hits a seeded
//     random target (among the ranks that can be reached),
//   − the answer being shortest / longest text (allowed 1 time in 4),
//   − every other guesser beating chance on this set (each one is let off for
//     1 question in 4, at random, so no guesser is ever "never right" either),
//   + real typical mistakes over decoys.
// Hard rule: the answer has at most one ±1 neighbour.
import { randInt, shuffle } from './rng.js';

const MINUS = '\u2212';

/** A number for display: real minus sign "−" (U+2212). */
export function fmt(n) {
  return n < 0 ? MINUS + String(-n) : String(n);
}

/** A number in brackets with its sign, like Sulaiman's fmtS: (+3), (−3). */
export function fmtS(n) {
  return n < 0 ? '(' + fmt(n) + ')' : '(+' + n + ')';
}

/** A number inside an expression: negatives after an operator get brackets. */
export function fmtIn(n) {
  return n < 0 ? '(' + fmt(n) + ')' : String(n);
}

const norm = (s) => String(s).replace(/-/g, MINUS).trim();
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

/* ── value of a choice text ──────────────────────────────────────────
   Numbers, leading −, \frac{a}{b}, \sqrt{n}, b^{e}, π, "·" and implicit
   products, "p : q" ratios; letters get fixed odd values (only to spot two
   choices that are equal, e.g. 2^{4} and 4^{2}, 2 : 3 and 4 : 6). */
const LETTER = { x: 1.37, y: 2.29, z: 3.11, a: 1.73, b: 2.57, m: 1.19, n: 2.83, t: 3.37 };
export const hasLetter = (t) => /[a-z]/.test(t.replace(/\\(frac|sqrt)/g, ''));

export function valueOf(text) {
  const s = text.replace(new RegExp(MINUS, 'g'), '-').replace(/\s+/g, '');
  const ratio = s.match(/^(\d+):(\d+)$/);
  if (ratio) return Number(ratio[1]) / Number(ratio[2]);
  let i = 0;
  const fail = () => { throw new Error('bad'); };
  const group = () => { if (s[i] !== '{') fail(); i++; const v = expr(); if (s[i] !== '}') fail(); i++; return v; };
  function atom() {
    if (s.startsWith('\\frac', i)) { i += 5; const a = group(); return a / group(); }
    if (s.startsWith('\\sqrt', i)) { i += 5; return Math.sqrt(group()); }
    const num = s.slice(i).match(/^\d+(\.\d+)?/);
    if (num) { i += num[0].length; return Number(num[0]); }
    if (s[i] in LETTER) return LETTER[s[i++]];
    if (s[i] === 'π') { i++; return Math.PI; } // \frac{2π}{3} (circle: radians)
    return fail();
  }
  function power() { let v = atom(); if (s[i] === '^') { i++; v = Math.pow(v, s[i] === '{' ? group() : atom()); } return v; }
  function expr() {
    let sign = 1; if (s[i] === '-') { sign = -1; i++; }
    let v = sign * power();
    while (i < s.length && s[i] !== '}') { if (s[i] === '·') i++; v *= power(); }
    return v;
  }
  try { const v = expr(); return i === s.length && Number.isFinite(v) ? v : NaN; } catch { return NaN; }
}

/* ── neighbours: what the "pairs" guesser looks for ──────────────── */
const NUM = /\d+(\.\d+)?/g;
const plain = (t) => (/^\u2212?\d+(\.\d+)?$/.test(t) ? Number(t.replace(MINUS, '-')) : null);

/** 'sign' (one is the other's negative), 'step' (one number ±1), or null. */
export function neighbours(a, b) {
  const pa = plain(a), pb = plain(b);
  if (pa !== null && pb !== null) {
    if (pa !== 0 && pa === -pb) return 'sign';
    return close(Math.abs(pa - pb), 1) ? 'step' : null;
  }
  if (a === MINUS + b || b === MINUS + a) return 'sign';
  if (a.replace(NUM, '#') !== b.replace(NUM, '#')) return null;
  const na = a.match(NUM) || [], nb = b.match(NUM) || [];
  let diff = 0, step = false;
  na.forEach((x, k) => { if (x !== nb[k]) { diff++; step = close(Math.abs(Number(x) - Number(nb[k])), 1); } });
  return diff === 1 && step ? 'step' : null;
}

// forms nobody writes: x^{0}, x^{1}, x^{−2} in an answer, \sqrt{1}, \frac{n}{1}, 1\sqrt{…}, 0x
const ODD = /\^\{(0|1|\u2212[^}]*)\}|\\sqrt\{[01]\}|\\frac\{[^}]*\}\{1\}|\\frac\{0\}|(^|[^\d.])[01](?=\\sqrt|[a-z])/;
// a radicand with a square factor (√4, √8, √50) is never a finished answer
const squareFactor = (n) => { for (let k = 2; k * k <= n; k++) if (n % (k * k) === 0) return true; return false; };
function badForm(t, right) {
  if (ODD.test(t)) return true;
  for (const m of t.matchAll(/\\sqrt\{(\d+)\}/g)) if (squareFactor(Number(m[1]))) return true; // k√8 is 2k√2
  const ratio = t.match(/^(\d+) : (\d+)$/);
  if (ratio && ratio[1] === ratio[2] && !/^(\d+) : \1$/.test(right)) return true; // "9 : 9"
  return false;
}

// decoys near a text: whole numbers ±1…±5 and (from 20 up) ± a round step
// (180 → 175, 185, 170, 190); decimals ×10, ÷10, ×2; texts: one number ±1…±3
// (a fraction's denominator only ×2 / ÷2, powers of ten never: they stay
// "nice"); and the negative when signed
function decoys(t, signed) {
  const out = [];
  const p = plain(t);
  if (p !== null) {
    if (!Number.isInteger(p)) {
      for (const n of [p * 10, p / 10, p * 2]) out.push(fmt(Number(n.toFixed(6))));
    } else {
      const size = Math.abs(p) >= 20 ? Math.pow(10, String(Math.abs(p)).length - 2) * 5 : 0;
      const ds = size ? [1, -1, size, -size, 2 * size, -2 * size] : [1, -1, 2, -2, 3, -3, 4, -4, 5, -5];
      for (const d of ds) {
        const n = p + d;
        if (!signed && n < 0) continue; // no negatives where the answer has none
        out.push(fmt(n));
      }
    }
    if (signed && p !== 0) out.push(fmt(-p));
    return out;
  }
  for (const m of t.matchAll(NUM)) {
    if (m[1]) continue; // decimals inside text: leave alone
    const swap = (x) => t.slice(0, m.index) + x + t.slice(m.index + m[0].length);
    if (t.slice(0, m.index).endsWith('}{')) { // a denominator: only ×2 / ÷2
      const q = Number(m[0]);
      out.push(swap(q * 2));
      if (q % 2 === 0 && q > 2) out.push(swap(q / 2));
      continue;
    }
    if (/^10+$/.test(m[0])) continue; // 10, 100, 1000
    for (const d of [1, -1, 2, -2, 3, -3]) {
      const n = Number(m[0]) + d;
      if (n >= 1) out.push(swap(n));
    }
  }
  if (signed) out.push(t.startsWith(MINUS) ? t.slice(1) : MINUS + t);
  return out;
}

// split a text into [skeleton, numbers]: "9x^{6}y^{2}" → ["#x^{#}y^{#}", ["9","6","2"]]
const parts = (t) => [t.replace(NUM, '#'), t.match(NUM) || []];

// two mistakes in one: candidates that change DIFFERENT numbers of the answer
// are merged ("9x^{5}y^{4}" + "6x^{6}y^{4}" → "6x^{5}y^{4}")
function webs(right, list) {
  const [sk, tok] = parts(right);
  if (tok.length < 2) return [];
  const diffs = [];
  for (const t of list) {
    const [s2, t2] = parts(t);
    if (s2 !== sk) continue;
    const d = tok.map((x, k) => (x !== t2[k] ? k : -1)).filter((k) => k >= 0);
    if (d.length) diffs.push([d, t2]);
  }
  const out = [];
  for (let a = 0; a < diffs.length; a++) for (let b = a + 1; b < diffs.length; b++) {
    const [da, ta] = diffs[a], [db, tb] = diffs[b];
    if (da.some((k) => db.includes(k))) continue;
    const merged = tok.slice();
    for (const k of da) merged[k] = ta[k];
    for (const k of db) merged[k] = tb[k];
    let i = 0;
    out.push(sk.replace(/#/g, () => merged[i++]));
  }
  return out;
}

// A seeded (value rank, distance rank) pair for the answer among the pairs that
// 3 wrongs can reach (each wrong is below the answer by value and/or by
// distance from zero, or by neither). The pair is drawn from a distribution
// over the reachable pairs whose two marginals are as even as possible
// (a few rounds of row / column scaling), so neither "smallest" nor "closest
// to zero" is favoured even when the two ranks are tied to each other.
function jointTarget(r, lowV, lowA) {
  const cnt = [0, 0, 0, 0]; // type = lowV·2 + lowA, over the wrongs
  for (let i = 1; i < lowV.length; i++) cnt[lowV[i] * 2 + lowA[i]]++;
  const M = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (let a = 0; a <= Math.min(3, cnt[0]); a++) for (let b = 0; a + b <= 3 && b <= cnt[1]; b++)
    for (let c = 0; a + b + c <= 3 && c <= cnt[2]; c++) { const d = 3 - a - b - c; if (d <= cnt[3]) M[c + d][b + d] = 1; }
  const rows = M.map((row) => row.some(Boolean)), cols = [0, 1, 2, 3].map((j) => M.some((row) => row[j]));
  const nr = rows.filter(Boolean).length, nc = cols.filter(Boolean).length;
  if (!nr) return [-1, -1];
  for (let it = 0; it < 12; it++) {
    for (let i = 0; i < 4; i++) if (rows[i]) { const s = M[i].reduce((x, y) => x + y, 0); for (let j = 0; j < 4; j++) M[i][j] *= 1 / nr / s; }
    for (let j = 0; j < 4; j++) if (cols[j]) { let s = 0; for (let i = 0; i < 4; i++) s += M[i][j]; for (let i = 0; i < 4; i++) M[i][j] *= 1 / nc / s; }
  }
  let u = r() * M.flat().reduce((x, y) => x + y, 0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { u -= M[i][j]; if (u <= 0 && M[i][j] > 0) return [i, j]; }
  for (let i = 3; i >= 0; i--) for (let j = 3; j >= 0; j--) if (M[i][j] > 0) return [i, j];
  return [-1, -1];
}

function* combos(arr, k, start = 0, pre = []) {
  if (pre.length === k) { yield pre; return; }
  for (let i = start; i < arr.length; i++) yield* combos(arr, k, i + 1, [...pre, arr[i]]);
}

const MAX_DECOYS = 16, MAX_WEBS = 10, MAX_EVAL = 150;
const W_STRICT = 4, W_LOOSE = 2, W_RANK = 5, W_LEN = 4, W_GUESS = 2, W_REAL = 0.4;

/**
 * makeChoices(r, correct, wrongs, opts?) → { choices: string[4], answer: "0".."3" }
 * wrongs = typical mistakes, best first. Dedupes ("-" = "−"), drops wrongs
 * equal in value to the answer or to each other and odd forms, adds webs and
 * decoys, picks the best-balanced set (see the top of this file), shuffles.
 * opts: signed  — may decoys be negative? (default: only when the answer is)
 *       decoys  — false: only the given mistakes and their webs
 *       accept  — (text) => boolean, a rule every wrong choice must pass
 *       must    — (texts[3]) => boolean, a rule for the set of wrongs
 *       prompt  — the question text (for the "number in the prompt" guesser)
 *       extra   — more decoys made by the generator (tried before the generic ones)
 */
export function makeChoices(r, correct, wrongs, opts = {}) {
  const right = norm(correct);
  const accept = opts.accept || (() => true);
  const signed = opts.signed ?? right.startsWith(MINUS);
  const all = [{ t: right, v: valueOf(right), real: true }];
  const add = (t, real) => {
    if (!t || /NaN|undefined|Infinity|null/.test(t)) return false;
    if (badForm(t, right) || !accept(t)) return false;
    if (all.some((c) => c.t === t)) return false;
    const v = valueOf(t);
    if (Number.isFinite(v) && all.some((c) => Number.isFinite(c.v) && close(c.v, v))) return false;
    all.push({ t, v, real });
    return true;
  };
  wrongs.filter((w) => w !== undefined && w !== null).map(norm).forEach((t) => add(t, true));
  let w = 0;
  for (const t of webs(right, all.slice(1).map((c) => c.t))) if (w < MAX_WEBS && add(t, true)) w++;
  const nReal = all.length - 1;
  for (const t of shuffle(r, (opts.extra || []).map(norm)).slice(0, MAX_DECOYS)) add(t, false);
  if (opts.decoys !== false) {
    // the answer's own decoys first (so it can sit anywhere), then the mistakes'
    const pool = [...shuffle(r, decoys(right, signed)), ...shuffle(r, all.slice(1).flatMap((c) => decoys(c.t, signed)))];
    let d = 0;
    for (const t of pool) { if (d >= MAX_DECOYS) break; if (add(t, false)) d++; }
  }
  // webs of decoys (generic or the generator's extra) with mistakes: two changes from the answer
  let e = 0;
  for (const t of shuffle(r, webs(right, all.slice(1).map((c) => c.t)))) { if (e >= MAX_WEBS) break; if (add(t, false)) e++; }
  if (all.length < 4) throw new Error('makeChoices: cannot make 4 choices for ' + correct);

  /* ── features of every candidate (index 0 = the answer) ── */
  const n = all.length;
  const rel = new Int8Array(n * n); // neighbours: 0 none, 1 sign, 2 step
  const share = new Int8Array(n * n); // numbers in the same places
  const P = all.map((c) => parts(c.t));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const k = neighbours(all[i].t, all[j].t);
    rel[i * n + j] = rel[j * n + i] = k === 'sign' ? 1 : k === 'step' ? 2 : 0;
    let s = 0;
    const a = P[i][1], b = P[j][1];
    for (let q = 0; q < Math.min(a.length, b.length); q++) if (a[q] === b[q]) s++;
    share[i * n + j] = share[j * n + i] = s;
  }
  const multi = P.map((p) => p[1].length > 1);
  const vR = all[0].v;
  const rankable = !hasLetter(right) && all.every((c) => Number.isFinite(c.v));
  const V = all.map((c) => c.v);
  const lowV = all.map((c) => (rankable && c.v < vR ? 1 : 0));
  const lowA = all.map((c) => (rankable && Math.abs(c.v) < Math.abs(vR) ? 1 : 0));
  const useA = rankable && all.some((c) => c.v < 0); // all ≥ 0: distance rank = value rank
  const len = all.map((c) => c.t.length);
  // "odd one out" keys (−1 = not applicable)
  const keyer = () => { const m = new Map(); return (s) => (s === null ? -1 : (m.has(s) ? m.get(s) : (m.set(s, m.size), m.size - 1))); };
  const kf = [
    (c) => (rankable ? (c.v < 0 ? 'n' : c.v > 0 ? 'p' : 'z') : null), // sign
    (c) => (rankable ? (Number.isInteger(c.v) ? 'i' : 'f') : null), // whole or not
    (c) => (rankable && all.every((x) => Number.isInteger(x.v)) ? String(Math.abs(c.v) % 2) : null), // parity
    (c) => (c.t.match(/\d(?=\D*$)/) || [null])[0], // last digit
    (c) => P[all.indexOf(c)][0], // shape
    (c) => { const f = c.t.match(/^\u2212?\\frac\{(\d+)\}\{(\d+)\}$/) || c.t.match(/^(\d+) : (\d+)$/); return f ? String(gcd(+f[1], +f[2]) === 1) : null; },
  ];
  const KEYS = kf.map((f) => { const k = keyer(); return Int32Array.from(all, (c) => k(f(c))); });
  const pnums = new Set(opts.prompt ? opts.prompt.match(NUM) || [] : []);
  const inP = all.map((c) => (plain(c.t) !== null && pnums.has(c.t.replace(MINUS, '')) ? 1 : 0));
  // "near a printed number": leave out the numbers printed in the prompt, then
  // the choice closest to any of them (plain-number sets only; a printed one
  // counts as far away)
  const PV = [...pnums].map(Number);
  const nearP = all.every((c) => plain(c.t) !== null) && PV.length
    ? all.map((c, q) => (inP[q] ? 1e12 : Math.min(...PV.map((p) => Math.abs(p - c.v)))))
    : null;
  // extreme numbers (expression / fraction choices only; plain numbers are
  // covered by the distance rank and the prompt guesser)
  const plainAll = all.every((c) => plain(c.t) !== null);
  const NN = P.map((p) => p[1].map(Number));
  const EXT = plainAll ? [] : [
    [NN.map((a) => a.reduce((s, x) => s + x, 0)), false], [NN.map((a) => a.reduce((s, x) => s + x, 0)), true],
    [NN.map((a) => (a.length ? a[0] : 0)), false], [NN.map((a) => (a.length ? a[0] : 0)), true],
    [NN.map((a) => (a.length ? a[a.length - 1] : 0)), false], [NN.map((a) => (a.length ? a[a.length - 1] : 0)), true],
    [P.map((p) => p[1].filter((x) => pnums.has(x)).length), false], [P.map((p) => p[1].filter((x) => pnums.has(x)).length), true],
  ];

  /* ── seeded targets / let-offs for this question ── */
  const target = (low) => {
    const below = low.reduce((s, x) => s + x, 0) - low[0];
    const reach = [0, 1, 2, 3].filter((k) => below >= k && n - 1 - below >= 3 - k);
    return reach.length ? reach[randInt(r, 0, reach.length - 1)] : -1;
  };
  // the value rank and the distance rank are drawn TOGETHER from the pairs a
  // set can really reach (for 2 among 1, 0, −1, 4, 8 "closest to zero" also
  // means "smallest"); drawn apart they clash and the natural rank wins
  let tV = -1, tA = -1;
  if (useA) [tV, tA] = jointTarget(r, lowV, lowA);
  else if (rankable) tV = target(lowV);
  const tL = randInt(r, 0, 3); // 0: may be the shortest, 3: may be the longest
  const free = Array.from({ length: KEYS.length + 4 + EXT.length + 2 }, () => r() < 0.25); // guessers let off this time
  const best = W_STRICT + (tV >= 0 ? W_RANK : 0) + (tA >= 0 ? W_RANK : 0);

  // share of a "pick the max of x" guesser that the answer gets, minus chance
  const over = (x0, x1, x2, x3, wantMax) => {
    const t = wantMax ? Math.max(x0, x1, x2, x3) : Math.min(x0, x1, x2, x3);
    if (Math.abs(x0 - t) > 1e-9) return 0;
    const k = (Math.abs(x1 - t) <= 1e-9) + (Math.abs(x2 - t) <= 1e-9) + (Math.abs(x3 - t) <= 1e-9);
    return Math.max(0, 1 / (k + 1) - 0.25);
  };
  const score = (i, j, k) => {
    const a = rel[i], b = rel[j], c = rel[k];
    if ((a === 2) + (b === 2) + (c === 2) > 1) return -Infinity; // at most one ±1 of the answer
    const ij = rel[i * n + j] > 0, ik = rel[i * n + k] > 0, jk = rel[j * n + k] > 0;
    const s0 = (a > 0) + (b > 0) + (c > 0), si = (a > 0) + ij + ik, sj = (b > 0) + ij + jk, sk = (c > 0) + ik + jk;
    const mx = Math.max(s0, si, sj, sk), mn = Math.min(s0, si, sj, sk);
    let sc;
    if (mx === mn) sc = W_STRICT;
    else {
      const once = (v) => (s0 === v) && ((si === v) + (sj === v) + (sk === v) === 0);
      sc = once(mx) || once(mn) ? 0 : W_LOOSE;
    }
    if (tV >= 0 && lowV[i] + lowV[j] + lowV[k] === tV) sc += W_RANK;
    if (tA >= 0 && lowA[i] + lowA[j] + lowA[k] === tA) sc += W_RANK;
    const L0 = len[0], Li = len[i], Lj = len[j], Lk = len[k];
    if (tL !== 0) sc -= W_LEN * over(L0, Li, Lj, Lk, false) / 0.75;
    if (tL !== 3) sc -= W_LEN * over(L0, Li, Lj, Lk, true) / 0.75;
    let pen = 0;
    // odd one out
    for (let g = 0; g < KEYS.length; g++) {
      if (free[g]) continue;
      const K = KEYS[g], k0 = K[0], ki = K[i], kj = K[j], kk = K[k];
      if (k0 < 0 || ki < 0 || kj < 0 || kk < 0) continue;
      const u0 = k0 !== ki && k0 !== kj && k0 !== kk;
      if (!u0) continue;
      const ui = ki !== kj && ki !== kk, uj = kj !== ki && kj !== kk, uk = kk !== ki && kk !== kj;
      if (!ui && !uj && !uk) pen += 0.75; // the answer is the only odd one out
    }
    const G = KEYS.length;
    // nearest the mean
    if (rankable && !free[G]) {
      const m = (V[0] + V[i] + V[j] + V[k]) / 4;
      pen += over(Math.abs(V[0] - m), Math.abs(V[i] - m), Math.abs(V[j] - m), Math.abs(V[k] - m), false);
    }
    // consensus
    if (!free[G + 1] && (multi[0] || multi[i] || multi[j] || multi[k])) {
      const c0 = share[i] + share[j] + share[k];
      const ci = share[i] + share[i * n + j] + share[i * n + k];
      const cj = share[j] + share[i * n + j] + share[j * n + k];
      const ck = share[k] + share[i * n + k] + share[j * n + k];
      pen += over(c0, ci, cj, ck, true);
    }
    // a number from the prompt / the only ones not from it
    const pc = inP[0] + inP[i] + inP[j] + inP[k];
    if (pc > 0) {
      if (!free[G + 2] && inP[0]) pen += Math.max(0, 1 / pc - 0.25);
      if (!free[G + 3] && !inP[0] && pc < 4) pen += Math.max(0, 1 / (4 - pc) - 0.25);
    }
    // extreme numbers: smallest / largest sum, first, last, shared with the prompt
    for (let g = 0; g < EXT.length; g++) {
      if (free[G + 4 + g]) continue;
      const [A, mx] = EXT[g];
      pen += over(A[0], A[i], A[j], A[k], mx);
    }
    // "covered": every number of the choice appears in another choice (the answer
    // is the hub of its mistakes: 2 : 3 among 3 : 2, 2 : 5, 3 : 5; for plain
    // numbers: its negative is in the set)
    if (!free[G + 4 + EXT.length]) {
      const S = [0, i, j, k];
      const cov = S.map((x) => P[x][1].length > 0 && P[x][1].every((tok) => S.some((y) => y !== x && P[y][1].includes(tok))) ? 1 : 0);
      pen += over(cov[0], cov[1], cov[2], cov[3], true);
    }
    // near a printed number (not one of them)
    if (nearP && !free[G + 5 + EXT.length]) pen += over(nearP[0], nearP[i], nearP[j], nearP[k], false);
    return sc - W_GUESS * pen;
  };

  const R = shuffle(r, Array.from({ length: nReal }, (_, q) => q + 1));
  const F = shuffle(r, Array.from({ length: n - 1 - nReal }, (_, q) => q + 1 + nReal));
  const must = opts.must;
  let pick = null, top = -Infinity, fallback = null;
  // phases: 3 real mistakes, 2 + 1 decoy, 1 + 2, 3 decoys; each phase scores at
  // most MAX_EVAL sets that miss the seeded rank targets and MAX_EVAL that hit
  // them (so the all-decoy phase is always explored, and the few sets that put
  // the answer at the rank wanted are not cut off by the cap)
  const hits = (i, j, l) => (tV < 0 || lowV[i] + lowV[j] + lowV[l] === tV) && (tA < 0 || lowA[i] + lowA[j] + lowA[l] === tA);
  search: for (let k = Math.min(3, R.length); k >= 0; k--) {
    let misses = 0, onTarget = 0;
    phase: for (const rs of combos(R, k)) {
      for (const fs of combos(F, 3 - k)) {
        if (misses >= MAX_EVAL && onTarget >= MAX_EVAL) break phase;
        const [i, j, l] = [...rs, ...fs];
        const h = hits(i, j, l);
        if (h ? onTarget >= MAX_EVAL : misses >= MAX_EVAL) continue;
        if (must && !must([all[i].t, all[j].t, all[l].t])) continue;
        fallback = fallback || [i, j, l];
        const sc = score(i, j, l);
        if (sc === -Infinity) continue;
        if (h) onTarget++; else misses++;
        const total = sc + W_REAL * k;
        if (total > top) { top = total; pick = [i, j, l]; }
        if (sc >= best - 1e-9) break search; // perfect: more real mistakes were tried first
      }
    }
  }
  pick = pick || fallback;
  if (!pick) throw new Error('makeChoices: no valid set for ' + correct);
  const choices = shuffle(r, [right, ...pick.map((j) => all[j].t)]);
  return { choices, answer: String(choices.indexOf(right)) };
}

/**
 * A makeChoices `must` rule for small answers among small printed numbers: one of
 * the 3 wrongs is at least as close to a number printed in the prompt (printed
 * ones count, at distance 0) as the answer, so "the choice nearest a number in the
 * question" can't find it. Throws in makeChoices when no set can follow it — the
 * caller then falls back to the plain balanced choices.
 */
export function notNearest(prompt, ans) {
  const P = (prompt.match(/\d+/g) || []).map(Number);
  const dist = (v) => Math.min(...P.map((p) => Math.abs(p - v)));
  const d0 = dist(ans);
  return (ts) => ts.some((t) => dist(Number(t.replace('\u2212', '-'))) <= d0);
}

/**
 * A question whose answer is a number: a 'number' question when asked for
 * (want === 'number'), otherwise 4 choices built from the typical mistakes.
 * Number answers are canonical ASCII text ("-3", "0.375").
 */
export function numberQuestion(r, want, prompt, correct, wrongs, meta, opts) {
  if (want === 'number') return { kind: 'number', prompt, answer: String(correct), meta };
  return { kind: 'choice', prompt, ...makeChoices(r, fmt(correct), wrongs.filter(Number.isFinite).map(fmt), { prompt, ...opts }), meta };
}

/** A question whose answer is math text (fraction, ratio, expression): always 4 choices. */
export function choiceQuestion(r, prompt, correct, wrongs, meta, opts) {
  return { kind: 'choice', prompt, ...makeChoices(r, correct, wrongs, { prompt, ...opts }), meta };
}
