/* Shared helpers of the data pack ("חדש" module, board #84). Plain JS, no React. */
import { reduce } from '../../core.js';

/* colours of balls / sectors: palette name → Hebrew (single, plural) */
export const COL = {
  red: { one: 'אדום', many: 'אדומים' },
  blue: { one: 'כחול', many: 'כחולים' },
  green: { one: 'ירוק', many: 'ירוקים' },
  yellow: { one: 'צהוב', many: 'צהובים' },
  violet: { one: 'סגול', many: 'סגולים' },
};
export const COLS = Object.keys(COL);

/** "[[3]] כדורים אדומים" / "כדור אדום אחד" */
export const ballsText = (n, c) => (n === 1 ? `כדור ${COL[c].one} אחד` : `[[${n}]] כדורים ${COL[c].many}`);
/** a, b ו-c */
/** "ו-[[3]] כדורים" but "וכדור אחד": the hyphen only before a number */
export const and = (x) => (x.startsWith('[[') ? 'ו-' : 'ו') + x;
export const joinHe = (xs) => (xs.length < 2 ? xs[0] : xs.slice(0, -1).join(', ') + ' ' + and(xs[xs.length - 1]));
/** a stacked fraction exactly as given (not reduced) */
export const fr = (n, d) => `{${n}|${d}}`;
/** "{4|8} = {1|2}" when it can be reduced, otherwise just the fraction */
export const frEq = (n, d) => { const [a, b] = reduce(n, d); return a === n ? fr(n, d) : `${fr(n, d)} = ${b === 1 ? a : fr(a, b)}`; };
/** 50000 → "50,000" */
export const th = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** k positive whole numbers (each ≥ min) that add up to N */
export function split(R, N, k, min = 1) {
  for (let t = 0; t < 500; t++) {
    const xs = []; let s = 0;
    for (let i = 0; i < k - 1; i++) { const v = R.int(min, Math.max(min, Math.floor(N / 2))); xs.push(v); s += v; }
    if (N - s >= min) return [...xs, N - s];
  }
  const base = Math.floor(N / k); return Array.from({ length: k }, (_, i) => (i === k - 1 ? N - base * (k - 1) : base));
}
export const sameFrac = (box, n, d) => !!box && Array.isArray(box.frac) && box.frac[0] * d === n * box.frac[1];

/* ── events on the numbers 1..n (a die, numbered cards) ─────────────────────
   spec: { t: 'even' | 'odd' | 'prime' } or { t: 'gt' | 'lt' | 'ge' | 'le' | 'div' | 'eq', k } */
export function holds(s, x) {
  switch (s.t) {
    case 'even': return x % 2 === 0;
    case 'odd': return x % 2 === 1;
    case 'gt': return x > s.k;
    case 'lt': return x < s.k;
    case 'ge': return x >= s.k;
    case 'le': return x <= s.k;
    case 'div': return x % s.k === 0;
    case 'eq': return x === s.k;
    case 'prime': { if (x < 2) return false; for (let d = 2; d * d <= x; d++) if (x % d === 0) return false; return true; }
    default: return false;
  }
}
/** counting one by one (used by verify) */
export function brute(s, n) { let c = 0; for (let x = 1; x <= n; x++) if (holds(s, x)) c++; return c; }
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
/** the same count by a formula (used by make) */
export function closed(s, n) {
  switch (s.t) {
    case 'even': return Math.floor(n / 2);
    case 'odd': return Math.ceil(n / 2);
    case 'gt': return clamp(n - s.k, 0, n);
    case 'lt': return clamp(s.k - 1, 0, n);
    case 'ge': return clamp(n - s.k + 1, 0, n);
    case 'le': return clamp(s.k, 0, n);
    case 'div': return Math.floor(n / s.k);
    case 'eq': return s.k >= 1 && s.k <= n ? 1 : 0;
    case 'prime': return PRIMES.filter((p) => p <= n).length;
    default: return 0;
  }
}
export function evText(s) {
  switch (s.t) {
    case 'even': return 'מספר זוגי';
    case 'odd': return 'מספר אי-זוגי';
    case 'gt': return `מספר גדול מ-[[${s.k}]]`;
    case 'lt': return `מספר קטן מ-[[${s.k}]]`;
    case 'ge': return `מספר שהוא לפחות [[${s.k}]]`;
    case 'le': return `מספר שהוא לכל היותר [[${s.k}]]`;
    case 'div': return `מספר שמתחלק ב-[[${s.k}]]`;
    case 'eq': return `המספר [[${s.k}]]`;
    case 'prime': return 'מספר ראשוני';
    default: return '';
  }
}
/** a random event on 1..n that is neither impossible nor certain */
export function randEvent(R, n) {
  for (let t = 0; t < 200; t++) {
    const type = R.pick(['even', 'odd', 'gt', 'lt', 'ge', 'le', 'prime', 'div']);
    let s = { t: type };
    if (type === 'gt') s.k = R.int(1, n - 2);
    if (type === 'lt') s.k = R.int(3, n);
    if (type === 'ge') s.k = R.int(3, n - 1);
    if (type === 'le') s.k = R.int(2, n - 2);
    if (type === 'div') s.k = R.pick([3, 4, 5].filter((k) => k * 2 <= n));
    const c = closed(s, n);
    if (c > 0 && c < n) return s;
  }
  return { t: 'even' };
}
/** the favourable numbers as math text: "2, 4, 6" (shortened when long) */
export function favText(s, n) {
  const xs = []; for (let x = 1; x <= n; x++) if (holds(s, x)) xs.push(x);
  return xs.length <= 8 ? xs.join(', ') : `${xs.slice(0, 3).join(', ')}, ..., ${xs[xs.length - 1]}`;
}
