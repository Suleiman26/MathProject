// Four answer choices + small display helpers shared by the topic ports.
//
// Choices must not give the answer away by their pattern. duel.test.mjs runs
// these "guessers" on every generator AND every variant of it; each must stay
// ≤ 40 % (chance = 25 %):
//   • pairs     — the choice with the most neighbours (its negative, or the
//                 same text with one number ±1);   • isolated — the fewest;
//   • value     — smallest, lower median, upper median, largest value;
//   • distance  — closest to zero, farthest from zero;
//   • length    — shortest text, longest text.
// So makeChoices scores every candidate set of 3 wrongs and keeps the best:
//   + the same number of neighbours for all 4 (no centre to find),
//   + the answer's rank by value and by distance from zero hits a seeded
//     random target (among the ranks that can be reached),
//   − the answer being shortest / longest text (allowed 1 time in 4),
//   + real typical mistakes (the generator's list) over decoys.
// Hard rule: the answer has at most one ±1 neighbour.
// Decoys (±1, ±2, round steps, sign flips of the answer AND of the mistakes)
// only fill in where real mistakes can't keep the set balanced.
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

/* ── value of a choice text ──────────────────────────────────────────
   Numbers, leading −, \frac{a}{b}, \sqrt{n}, b^{e}, "·" and implicit
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
const isSquare = (n) => Number.isInteger(Math.sqrt(n));
function badForm(t, right) {
  if (ODD.test(t)) return true;
  for (const m of t.matchAll(/\\sqrt\{(\d+)\}/g)) if (isSquare(Number(m[1]))) return true; // k√4 is just 2k
  const ratio = t.match(/^(\d+) : (\d+)$/);
  if (ratio && ratio[1] === ratio[2] && !/^(\d+) : \1$/.test(right)) return true; // "9 : 9"
  return false;
}

// decoys near a text: whole numbers ±1, ±2 and (from 20 up) ± a round step
// (180 → 175, 185, 170, 190); decimals ×10, ÷10, ×2; texts: one number ±1, ±2
// (never a fraction's denominator or a power of ten: they stay "nice"); and the
// negative when signed
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
    if (t.slice(0, m.index).endsWith('}{')) { // a denominator: only ×2 / ÷2, so it stays "nice"
      const q = Number(m[0]);
      out.push(swap(q * 2));
      if (q % 2 === 0 && q > 2) out.push(swap(q / 2));
      continue;
    }
    if (/^10+$/.test(m[0])) continue; // 10, 100, 1000
    for (const d of [1, -1, 2, -2, 3, -3]) {
      const n = Number(m[0]) + d;
      if (n < 1) continue;
      out.push(t.slice(0, m.index) + n + t.slice(m.index + m[0].length));
    }
  }
  if (signed) out.push(t.startsWith(MINUS) ? t.slice(1) : MINUS + t);
  return out;
}

function* combos(arr, k, start = 0, pre = []) {
  if (pre.length === k) { yield pre; return; }
  for (let i = start; i < arr.length; i++) yield* combos(arr, k, i + 1, [...pre, arr[i]]);
}

const MAX_DECOYS = 18;

/**
 * makeChoices(r, correct, wrongs, {signed}?) → { choices: string[4], answer: "0".."3" }
 * wrongs = typical mistakes, best first. Dedupes ("-" = "−"), drops wrongs
 * equal in value to the answer or to each other and odd forms, adds decoys,
 * picks the best-balanced set (see the top of this file) and shuffles.
 * signed: may decoys be negative? (default: only when the answer is)
 */
export function makeChoices(r, correct, wrongs, opts = {}) {
  const right = norm(correct);
  const vR = valueOf(right);
  const realW = wrongs.filter((w) => w !== undefined && w !== null).map(norm);
  const signed = opts.signed ?? right.startsWith(MINUS);
  const all = [{ t: right, v: vR, real: true }];
  const add = (t, real) => {
    if (!t || /NaN|undefined|Infinity|null/.test(t)) return;
    if (badForm(t, right)) return;
    if (all.some((c) => c.t === t)) return;
    const v = valueOf(t);
    if (Number.isFinite(v) && all.some((c) => Number.isFinite(c.v) && close(c.v, v))) return;
    all.push({ t, v, real });
  };
  realW.forEach((t) => add(t, true));
  const nReal = all.length - 1;
  // the answer's own decoys first (so it can sit anywhere), then the mistakes'
  const pool = [...shuffle(r, decoys(right, signed)), ...shuffle(r, all.slice(1).flatMap((c) => decoys(c.t, signed)))];
  for (const t of pool) {
    if (all.length - 1 - nReal >= MAX_DECOYS) break;
    add(t, false);
  }
  if (all.length < 4) throw new Error('makeChoices: cannot make 4 choices for ' + correct);

  const n = all.length;
  const rel = new Int8Array(n * n); // 0 none, 1 sign, 2 step
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const k = neighbours(all[i].t, all[j].t);
    rel[i * n + j] = rel[j * n + i] = k === 'sign' ? 1 : k === 'step' ? 2 : 0;
  }
  // features of each candidate, compared with the answer
  const rankable = !hasLetter(right) && all.every((c) => Number.isFinite(c.v));
  const lowV = all.map((c) => (rankable && c.v < vR ? 1 : 0));
  const lowA = all.map((c) => (rankable && Math.abs(c.v) < Math.abs(vR) ? 1 : 0));
  const useA = rankable && all.some((c) => c.v < 0); // all ≥ 0: distance rank = value rank
  const len = all.map((c) => c.t.length);
  const target = (low) => { // a random reachable rank 0–3
    const below = low.reduce((s, x) => s + x, 0) - low[0];
    const reach = [0, 1, 2, 3].filter((k) => below >= k && n - 1 - below >= 3 - k);
    return reach.length ? reach[randInt(r, 0, reach.length - 1)] : -1;
  };
  const tV = rankable ? target(lowV) : -1;
  const tA = useA ? target(lowA) : -1;
  const tL = randInt(r, 0, 3); // 0: may be the shortest, 3: may be the longest, else neither
  // weights: a hit rank target (3) beats a perfectly even neighbour count (4 vs 2 for
  // "no single centre"), so tiny answers like x^{1} can still sit anywhere by value
  const W_RANK = 3, W_LEN = 2;
  const best = 4 + (tV >= 0 ? W_RANK : 0) + (tA >= 0 ? W_RANK : 0);

  const score = (i, j, k) => {
    const a = rel[i], b = rel[j], c = rel[k];
    if ((a === 2) + (b === 2) + (c === 2) > 1) return -Infinity; // at most one ±1 of the answer
    const ij = rel[i * n + j] > 0, ik = rel[i * n + k] > 0, jk = rel[j * n + k] > 0;
    const s0 = (a > 0) + (b > 0) + (c > 0), si = (a > 0) + ij + ik, sj = (b > 0) + ij + jk, sk = (c > 0) + ik + jk;
    const mx = Math.max(s0, si, sj, sk), mn = Math.min(s0, si, sj, sk);
    let sc;
    if (mx === mn) sc = 4;
    else {
      const once = (v) => (s0 === v) && ((si === v) + (sj === v) + (sk === v) === 0);
      sc = once(mx) || once(mn) ? 0 : 2;
    }
    if (tV >= 0 && lowV[i] + lowV[j] + lowV[k] === tV) sc += W_RANK;
    if (tA >= 0 && lowA[i] + lowA[j] + lowA[k] === tA) sc += W_RANK;
    const L = [len[0], len[i], len[j], len[k]];
    const lo = Math.min(...L), hi = Math.max(...L);
    const share = (v) => (L[0] === v ? 1 / L.filter((x) => x === v).length : 0);
    if (lo !== hi) sc -= W_LEN * ((tL !== 0 ? share(lo) : 0) + (tL !== 3 ? share(hi) : 0));
    return sc;
  };

  const reals = shuffle(r, Array.from({ length: nReal }, (_, k) => k + 1));
  const fills = shuffle(r, Array.from({ length: n - 1 - nReal }, (_, k) => k + 1 + nReal));
  let pick = null, top = -Infinity;
  search: for (let k = Math.min(3, reals.length); k >= 0; k--) {
    for (const rs of combos(reals, k)) {
      for (const fs of combos(fills, 3 - k)) {
        const [i, j, l] = [...rs, ...fs];
        const sc = score(i, j, l);
        if (sc === -Infinity) continue;
        const total = sc + 0.4 * k; // real mistakes are worth a little
        if (total > top) { top = total; pick = [i, j, l]; }
        if (sc >= best) break search; // can't do better on balance; more reals were tried first
      }
    }
  }
  if (!pick) pick = [...reals, ...fills].slice(0, 3);
  const choices = shuffle(r, [right, ...pick.map((j) => all[j].t)]);
  return { choices, answer: String(choices.indexOf(right)) };
}

/**
 * A question whose answer is a number: a 'number' question when asked for
 * (want === 'number'), otherwise 4 choices built from the typical mistakes.
 * Number answers are canonical ASCII text ("-3", "0.375").
 */
export function numberQuestion(r, want, prompt, correct, wrongs, meta, opts) {
  if (want === 'number') return { kind: 'number', prompt, answer: String(correct), meta };
  return { kind: 'choice', prompt, ...makeChoices(r, fmt(correct), wrongs.filter(Number.isFinite).map(fmt), opts), meta };
}

/** A question whose answer is math text (fraction, ratio, expression): always 4 choices. */
export function choiceQuestion(r, prompt, correct, wrongs, meta, opts) {
  return { kind: 'choice', prompt, ...makeChoices(r, correct, wrongs, opts), meta };
}
