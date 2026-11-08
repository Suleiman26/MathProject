// Four answer choices + small display helpers shared by the topic ports.
//
// Choices must not give the answer away by their pattern. Two "guessers" are
// guarded in duel.test.mjs (each must stay ≤ 40 % per generator):
//   • pairs  — pick the choice with the most "neighbours" among the others
//              (its negative, or the same text with one number ±1);
//   • median — pick the lower / upper middle value of the 4 choices.
// So makeChoices picks the 3 wrongs such that every choice has the SAME
// number of neighbours (no centre to find), the right answer has at most one
// ±1 neighbour, and the right answer's rank among the values is a seeded
// random 0–3. Real typical mistakes (the generator's list) are tried first;
// decoys (±1…±3, sign flips of the answer AND of the mistakes) only fill in.
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

// decoys near a text: whole numbers ±1, ±2 and (from 20 up) ± a round step
// (180 → 175, 185, 170, 190); decimals ×10, ÷10, ×2; texts: one number ±1, ±2;
// and the negative when signed
function decoys(t, signed) {
  const out = [];
  const p = plain(t);
  if (p !== null) {
    if (!Number.isInteger(p)) {
      for (const n of [p * 10, p / 10, p * 2]) out.push(fmt(Number(n.toFixed(6))));
    } else {
      const size = Math.abs(p) >= 20 ? Math.pow(10, String(Math.abs(p)).length - 2) * 5 : 0;
      const ds = size ? [1, -1, size, -size, 2 * size, -2 * size] : [1, -1, 2, -2, 3, -3];
      for (const d of ds) {
        const n = p + d;
        if (!signed && n <= 0 && p > 0) continue;
        out.push(fmt(n));
      }
    }
    if (signed && p !== 0) out.push(fmt(-p));
    return out;
  }
  for (const m of t.matchAll(NUM)) {
    if (m[1]) continue; // decimals inside text: leave alone
    for (const d of [1, -1, 2, -2]) {
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

/**
 * makeChoices(r, correct, wrongs, {signed}?) → { choices: string[4], answer: "0".."3" }
 * wrongs = typical mistakes, best first. Dedupes ("-" = "−"), drops wrongs
 * equal in value to the answer or to each other, adds decoys when needed,
 * picks a balanced set (see the top of this file) and shuffles.
 * signed: may decoys be negative? (default: when the answer or a mistake is)
 */
export function makeChoices(r, correct, wrongs, opts = {}) {
  const right = norm(correct);
  const vR = valueOf(right);
  const realW = wrongs.filter((w) => w !== undefined && w !== null).map(norm);
  const signed = opts.signed ?? [right, ...realW].some((t) => t.startsWith(MINUS));
  const all = [{ t: right, v: vR, real: true }];
  const add = (t, real) => {
    if (!t || /NaN|undefined|Infinity|null/.test(t)) return;
    if (ODD.test(t)) return;
    if (all.some((c) => c.t === t)) return;
    const v = valueOf(t);
    if (Number.isFinite(v) && all.some((c) => Number.isFinite(c.v) && close(c.v, v))) return;
    all.push({ t, v, real });
  };
  realW.forEach((t) => add(t, true));
  const nReal = all.length - 1;
  for (const t of shuffle(r, [right, ...all.slice(1).map((c) => c.t)].flatMap((t) => decoys(t, signed)))) {
    if (all.length - 1 - nReal >= 30) break;
    add(t, false);
  }
  if (all.length < 4) throw new Error('makeChoices: cannot make 4 choices for ' + correct);

  const n = all.length;
  const rel = all.map((a) => all.map((b) => (a === b ? null : neighbours(a.t, b.t))));
  const rankable = !hasLetter(right) && all.every((c) => Number.isFinite(c.v));
  // the answer's rank among the 4 values: random, but only among ranks that can be reached
  const below = rankable ? all.filter((c) => c.v < vR).length : 3;
  const above = rankable ? all.filter((c) => c.v > vR).length : 3;
  const reach = [0, 1, 2, 3].filter((k) => below >= k && above >= 3 - k);
  const target = reach.length ? reach[randInt(r, 0, reach.length - 1)] : randInt(r, 0, 3);
  const reals = shuffle(r, Array.from({ length: nReal }, (_, k) => k + 1));
  const fills = shuffle(r, Array.from({ length: n - 1 - nReal }, (_, k) => k + 1 + nReal));

  const ok = (tri, strict, rank) => {
    const idx = [0, ...tri];
    if (tri.filter((j) => rel[0][j] === 'step').length > 1) return false; // at most one ±1 of the answer
    const sc = idx.map((i) => idx.filter((j) => j !== i && rel[i][j]).length);
    const mx = Math.max(...sc), mn = Math.min(...sc);
    if (strict && mx !== mn) return false;
    if (!strict && mx !== mn) {
      const only = (s) => sc[0] === s && sc.filter((x) => x === s).length === 1;
      if (only(mx) || only(mn)) return false;
    }
    if (rank && rankable && tri.filter((j) => all[j].v < vR).length !== target) return false;
    return true;
  };
  const search = (strict, rank) => {
    for (let k = Math.min(3, reals.length); k >= 0; k--) {
      for (const rs of combos(reals, k)) {
        for (const fs of combos(fills, 3 - k)) {
          const tri = [...rs, ...fs];
          if (ok(tri, strict, rank)) return tri;
        }
      }
    }
    return null;
  };
  const tri = search(true, true) || search(false, true) || search(true, false) || search(false, false)
    || [...reals, ...fills].slice(0, 3);
  const choices = shuffle(r, [right, ...tri.map((j) => all[j].t)]);
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
