// Advanced equations (grade 8, alg) — ported from Sulaiman's
// src/topics/equations-advanced/Topic.jsx (never edited).
// Ported: ch1 linear with a denominator (makeLinearEq levels 1–3),
// ch3 the LINEAR short-multiplication equation (makeLinearSM),
// ch4 level 1 (makeCombinedEq template A).
// Not ported (audit: C): quadratic equations with two roots (ch2, ch3
// makeQuadSM, ch4 levels 2–3), factoring / expansion (expression answers).
// Duel limit: ch1 level 3 uses only the a/(x + p) + b = c form; his second
// level-3 form "(x + r)/(x + p) = s/(x + p) + b" is half "no solution"
// (x = −p rejected), which is not a number answer.
import { pick } from '../rng.js';
import { fmt, numberQuestion } from '../choices.js';

const SIGNED = { signed: true };
// port of rand() / randNonZero() — src/topics/equations-advanced/Topic.jsx L25–26
const rand = (r, min, max) => Math.floor(r() * (max - min + 1)) + min;
const randNonZero = (r, min, max) => { let v; do { v = rand(r, min, max); } while (v === 0); return v; };
const isInt = (w) => Number.isInteger(w);

const plus = (n) => (n > 0 ? ` + ${n}` : n < 0 ? ` − ${-n}` : ''); // " + 3" / " − 3" / ""
const xPlus = (p) => (p === 0 ? 'x' : `x${plus(p)}`); // x + p
const ax = (a) => (a === 1 ? 'x' : a === -1 ? '−x' : `${fmt(a)}x`);
const sq = (a) => (a === 0 ? 'x^{2}' : `(x${plus(a)})^{2}`);

// port of makeLinearEq(level) — src/topics/equations-advanced/Topic.jsx L50 (levels 1, 2 and level 3's a/(x+p) + b = c)
function makeLinearEq(r, level) {
  if (level === 1) { // x/a + b = c
    let a, b, c, x;
    do { a = pick(r, [2, 3, 4, 5, 6]); b = rand(r, -5, 5); c = rand(r, -8, 8); x = a * (c - b); }
    while (x === 0 || Math.abs(x) > 30);
    return { level, a, b, c, x, text: `\\frac{x}{${a}}${plus(b)} = ${fmt(c)}`,
      // mistakes: forgot × a, b not multiplied by a, sign of b
      wrongs: [c - b, a * c - b, a * (c + b), (c - b) / a] };
  }
  if (level === 2) { // (ax + b)/d = c
    let a, b, d, c, x, tries = 0;
    for (;;) {
      tries++; if (tries > 300) { a = 1; b = 1; d = 2; c = 3; x = c * 2 - 1; break; }
      a = pick(r, [1, 1, 2, 2, 3]); d = pick(r, [2, 3, 4, 5, 6]); c = rand(r, -6, 6); b = rand(r, -8, 8);
      const num = c * d - b; if (num % a !== 0) continue;
      x = num / a; if (x === 0 || Math.abs(x) > 20) continue;
      break;
    }
    return { level, a, b, d, c, x, text: `\\frac{${ax(a)}${plus(b)}}{${d}} = ${fmt(c)}`,
      // mistakes: sign of b, forgot × d, forgot ÷ a
      wrongs: [(c * d + b) / a, (c - b) / a, c * d - b, (c * d - b) / d] };
  }
  // a/(x + p) + b = c
  let a, b, c, p, x, tries = 0;
  for (;;) {
    tries++; if (tries > 400) return makeLinearEq(r, 2);
    a = randNonZero(r, -6, 6); b = rand(r, -4, 4); c = rand(r, -6, 6);
    if (c === b) continue;
    const diff = c - b; if (a % diff !== 0) continue;
    p = rand(r, -5, 5); x = a / diff - p;
    if (!isInt(x) || x === 0 || x + p === 0) continue;
    if (Math.abs(x) > 15) continue;
    break;
  }
  return { level, a, b, c, p, x, text: `\\frac{${fmt(a)}}{${xPlus(p)}}${plus(b)} = ${fmt(c)}`,
    // mistakes: sign of p, forgot p, upside down (c − b)/a − p
    wrongs: [a / (c - b) + p, a / (c - b), (c - b) / a - p, a / (c + b) - p] };
}

export function linearFrac(r, want) {
  const level = pick(r, [1, 2, 3]);
  const e = makeLinearEq(r, level);
  return numberQuestion(r, want, `פתרו את המשוואה: $${e.text}$ — $x = ?$`, e.x, e.wrongs.filter(isInt),
    { level, a: e.a, b: e.b, c: e.c, d: e.d, p: e.p }, SIGNED);
}

// port of makeLinearSM() — src/topics/equations-advanced/Topic.jsx L1251: (x + a)² − (x + b)² = c
export function shortMult(r, want) {
  let a, b, x, c, tries = 0;
  for (;;) {
    tries++; if (tries > 300) { a = 3; b = 1; x = 2; c = 2 * (a - b) * x + (a * a - b * b); break; }
    a = rand(r, -5, 5); b = rand(r, -5, 5);
    if (a === b) continue;
    x = rand(r, -8, 8);
    if (x === 0 && want !== 'number') continue; // duel limit: 0 would always be the choice closest to zero
    c = 2 * (a - b) * x + (a * a - b * b);
    if (Math.abs(c) > 50 || c === 0) continue;
    break;
  }
  const k = 2 * (a - b), m = a * a - b * b;
  // mistakes: (x + a)² read as x² + a² (no 2ax: the x vanishes → use the constants only), forgot the 2,
  // sign of the constant
  const wrongs = [(c - m) / (a - b), (c + m) / k, c / k, (c - (a - b) * (a - b)) / k].filter(isInt);
  return numberQuestion(r, want, `פתרו את המשוואה: $${sq(a)} − ${sq(b)} = ${fmt(c)}$ — $x = ?$`, x, wrongs, { a, b, c }, SIGNED);
}

// port of makeCombinedEq(1) — src/topics/equations-advanced/Topic.jsx L2249 (template A):
// (x + a)²/d − c = (x² − a²)/d
export function combined(r, want) {
  let a, d, c, x, tries = 0;
  for (;;) {
    tries++; if (tries > 400) { a = 2; d = 2; x = 1; c = 6; break; }
    a = randNonZero(r, -4, 4); d = pick(r, [2, 3, 4]); x = rand(r, -6, 6);
    if (x === 0 && want !== 'number') continue; // duel limit: 0 would always be the choice closest to zero
    const cd = 2 * a * (x + a); if (cd % d !== 0) continue;
    c = cd / d; if (c === 0 || Math.abs(c) > 18) continue;
    break;
  }
  // after × d: 2ax = cd − 2a². Mistakes: forgot × d on c, a² not doubled, sign of a²
  const wrongs = [(c - 2 * a * a) / (2 * a), (c * d - a * a) / (2 * a), (c * d + 2 * a * a) / (2 * a), (c * d - 2 * a * a) / a].filter(isInt);
  return numberQuestion(r, want,
    `פתרו את המשוואה: $\\frac{(x${plus(a)})^{2}}{${d}}${plus(-c)} = \\frac{x^{2} − ${a * a}}{${d}}$ — $x = ?$`,
    x, wrongs, { a, d, c }, SIGNED);
}
