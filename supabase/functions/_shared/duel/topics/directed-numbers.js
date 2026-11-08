// Directed numbers (grade 7) — ported from Sulaiman's
// src/topics/directed-numbers/Topic.jsx (that file is never edited).
// Each make(r, want) returns { kind, prompt, choices?, answer, meta };
// registry.js adds gen/topic/chapter. Chapter 5 (order of operations,
// "which operation first?") is a poor fit and is not ported.
import { randInt, pick } from '../rng.js';
import { fmt, fmtS, fmtIn, numberQuestion } from '../choices.js';

// port of pickSigns() — src/topics/directed-numbers/Topic.jsx L78
function pickSigns(r) {
  const c = [['p', 'p'], ['n', 'n'], ['p', 'n'], ['n', 'p']][randInt(r, 0, 3)];
  return [c[0] === 'p' ? 1 : -1, c[1] === 'p' ? 1 : -1];
}

// port of randNonZero() — src/topics/directed-numbers/Topic.jsx L533
function randNonZero(r, a, b) {
  let v;
  do { v = randInt(r, a, b); } while (v === 0);
  return v;
}

// card titles are Sulaiman's (stored as \u escapes in Topic.jsx L232, L389, L480)
const T_ADD = 'חיבור מספרים מכוונים';
const T_SUB = 'חיסור מספרים מכוונים';
const T_MUL = 'כפל מספרים מכוונים';
const T_DIV = 'חילוק מספרים מכוונים';
const SIGNED = { signed: true }; // decoys may be negative here

// port of genAdd() — src/topics/directed-numbers/Topic.jsx L83
export function add(r, want) {
  let a, b;
  do { const [sa, sb] = pickSigns(r); a = randInt(r, 1, 15) * sa; b = randInt(r, 1, 15) * sb; }
  while (Math.abs(a + b) > 20);
  const ans = a + b;
  // mistakes: subtracted instead (a − b or b − a), wrong sign
  const wrongs = [a - b, -ans, b - a];
  return numberQuestion(r, want, `${T_ADD}: $${fmtS(a)} + ${fmtS(b)} = ?$`, ans, wrongs, { a, b }, SIGNED);
}

// port of genSub() — src/topics/directed-numbers/Topic.jsx L90
export function sub(r, want) {
  let a, b;
  do { const [sa, sb] = pickSigns(r); a = randInt(r, 1, 15) * sa; b = randInt(r, 1, 15) * sb; }
  while (Math.abs(a - b) > 20);
  const ans = a - b;
  // mistakes: added instead (forgot the opposite), b − a, wrong sign
  const wrongs = [a + b, b - a, -(a + b)];
  return numberQuestion(r, want, `${T_SUB}: $${fmtS(a)} − ${fmtS(b)} = ?$`, ans, wrongs, { a, b }, SIGNED);
}

// port of genMul() — src/topics/directed-numbers/Topic.jsx L97
export function mul(r, want) {
  let a, b;
  do { const [sa, sb] = pickSigns(r); a = randInt(r, 1, 10) * sa; b = randInt(r, 1, 10) * sb; }
  while (Math.abs(a * b) > 20);
  const ans = a * b;
  // mistakes: sign rule, added instead
  // + the factors themselves with both signs: with a ±1 factor the answer is one of
  // them, so the sign rule (the skill) must decide, not "the number from the question"
  const wrongs = [-ans, a + b, -(a + b), a, -a, b, -b];
  return numberQuestion(r, want, `${T_MUL}: $${fmtS(a)} × ${fmtS(b)} = ?$`, ans, wrongs, { a, b }, SIGNED);
}

// port of genDiv() — src/topics/directed-numbers/Topic.jsx L104
export function div(r, want) {
  let dv, ds, q;
  do { const [sa, sb] = pickSigns(r); q = randInt(r, 1, 10) * sa; ds = randInt(r, 1, 10) * sb; dv = q * ds; }
  while (Math.abs(dv) > 20 || ds === 0);
  // mistakes: sign rule, multiplied instead, subtracted instead
  const wrongs = [-q, dv * ds, dv - ds, dv, -dv, ds, -ds]; // + the given numbers, both signs
  return numberQuestion(r, want, `${T_DIV}: $${fmtS(dv)} ÷ ${fmtS(ds)} = ?$`, q, wrongs, { a: dv, b: ds }, SIGNED);
}

// port of genCombo() — src/topics/directed-numbers/Topic.jsx L636
function genCombo(r) {
  const templates = [
    () => { // a + b×c − d÷e
      const e = randInt(r, 2, 9), k1 = randNonZero(r, -9, 9), d = k1 * e;
      const c = randInt(r, 2, 9), b = randNonZero(r, -9, 9);
      const a = randInt(r, -15, 15);
      return { tokens: [a, '+', b, '×', c, '−', d, '÷', e], result: a + b * c - k1 };
    },
    () => { // a×b − c÷d + e
      const d = randInt(r, 2, 9), k2 = randNonZero(r, -9, 9), c = k2 * d;
      const b = randInt(r, 2, 9), a = randNonZero(r, -9, 9);
      const e = randInt(r, -15, 15);
      return { tokens: [a, '×', b, '−', c, '÷', d, '+', e], result: a * b - k2 + e };
    },
    () => { // (a + b) × c − d÷e
      const e = randInt(r, 2, 9), k1 = randNonZero(r, -9, 9), d = k1 * e;
      const c = randInt(r, 2, 9);
      const a = randInt(r, -9, 9), b = randInt(r, -9, 9);
      const s = a + b;
      return { tokens: ['(', a, '+', b, ')', '×', c, '−', d, '÷', e], result: s * c - k1 };
    },
    () => { // a÷b + (c − d) × e
      const b = randInt(r, 2, 9), k1 = randNonZero(r, -9, 9), a = k1 * b;
      const c = randInt(r, -9, 9), d = randInt(r, -9, 9);
      const e = randInt(r, 2, 9);
      const diff = c - d;
      return { tokens: [a, '÷', b, '+', '(', c, '−', d, ')', '×', e], result: k1 + diff * e };
    },
    () => { // a×b÷c + d − e
      const c = randInt(r, 2, 9), m = randNonZero(r, -9, 9), b = c * m;
      const a = randNonZero(r, -9, 9);
      const d = randInt(r, -15, 15), e = randInt(r, -15, 15);
      return { tokens: [a, '×', b, '÷', c, '+', d, '−', e], result: a * m + d - e };
    },
    () => { // a + b÷c − d×e
      const c = randInt(r, 2, 9), k1 = randNonZero(r, -9, 9), b = k1 * c;
      const d = randNonZero(r, -9, 9), e = randNonZero(r, -9, 9);
      const a = randInt(r, -15, 15);
      return { tokens: [a, '+', b, '÷', c, '−', d, '×', e], result: a + k1 - d * e };
    },
  ];
  return pick(r, templates)();
}

// the typical mistake: working strictly left to right (brackets still first)
function leftToRight(tokens) {
  const flat = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '(') {
      const j = tokens.indexOf(')', i);
      flat.push(leftToRight(tokens.slice(i + 1, j)));
      i = j;
    } else flat.push(tokens[i]);
  }
  let v = flat[0];
  for (let i = 1; i < flat.length; i += 2) {
    const op = flat[i], n = flat[i + 1];
    v = op === '+' ? v + n : op === '−' ? v - n : op === '×' ? v * n : v / n;
  }
  return v;
}

function showTokens(tokens) {
  let out = '';
  tokens.forEach((t, i) => {
    const prev = tokens[i - 1];
    if (t === '(') out += (out ? ' ' : '') + '(';
    else if (t === ')') out += ')';
    else if (typeof t === 'number') {
      const first = i === 0 || prev === '(';
      out += first ? fmt(t) : ' ' + fmtIn(t); // a leading negative needs no brackets
    } else out += ' ' + t;
  });
  return out.trim();
}

// chapter 6 "תרגול מקיף" (Topic.jsx L813) — order of operations
export function combo(r, want) {
  const ex = genCombo(r);
  const ans = ex.result;
  const ltr = leftToRight(ex.tokens);
  // mistakes: left to right (precedence ignored), wrong sign
  const wrongs = [Number.isInteger(ltr) ? ltr : NaN, -ans];
  return numberQuestion(r, want, `תרגול מקיף — סדר פעולות חשבון: $${showTokens(ex.tokens)} = ?$`, ans,
    wrongs, { tokens: ex.tokens }, SIGNED);
}
