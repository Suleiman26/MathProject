// Equations ax + b = cx + d (grade 7) — ported from Sulaiman's
// src/topics/equation-solver/Topic.jsx (never edited). The topic has one
// flow and no chapter buttons, so its chapter is "".
import { randInt } from '../rng.js';
import { numberQuestion } from '../choices.js';

// port of sideStr() — src/topics/equation-solver/Topic.jsx L20
// (terms here are plain {type, num}: genEq only makes whole coefficients)
function sideStr(terms) {
  if (!terms.length) return '0';
  return terms.map((t, i) => {
    const abs = Math.abs(t.num);
    const sign = t.num < 0 ? (i === 0 ? '−' : ' − ') : (i === 0 ? '' : ' + ');
    return t.type === 'const' ? `${sign}${abs}` : `${sign}${abs === 1 ? '' : abs}x`;
  }).join('');
}

// port of genEq() — src/topics/equation-solver/Topic.jsx L66
// (Math.random() → r(); the 300 tries and the fixed fallback are kept)
function genEq(r) {
  for (let i = 0; i < 300; i++) {
    const n = (Math.floor(r() * 9) + 1) * (r() < 0.5 ? 1 : -1);
    const a = Math.floor(r() * 4) + 1;
    const c = Math.floor(r() * a);
    const b = Math.floor(r() * 11) - 5;
    const d = b + n * (a - c);
    if (Math.abs(d) > 18) continue;
    const left = [{ type: 'x', num: a }];
    if (b !== 0) left.push({ type: 'const', num: b });
    const right = [];
    if (c !== 0) right.push({ type: 'x', num: c });
    if (d !== 0) right.push({ type: 'const', num: d });
    if (!right.length) right.push({ type: 'const', num: 0 });
    if (left.length + right.length < 3) continue;
    return { left, right, a, b, c, d, x: n };
  }
  return { left: [{ type: 'x', num: 3 }, { type: 'const', num: -2 }], right: [{ type: 'x', num: 1 }, { type: 'const', num: 4 }], a: 3, b: -2, c: 1, d: 4, x: 3 };
}

export function linear(r, want) {
  const eq = genEq(r);
  const { a, b, c, d, x } = eq;
  // mistakes: wrong sign, moved a term without changing its sign, divided by a instead of a − c
  const wrongs = [-x, (d + b) / (a - c), (d - b) / a, (d - b) / (a + c)].filter((w) => Number.isInteger(w));
  return numberQuestion(r, want, `פתרו את המשוואה:\n$${sideStr(eq.left)} = ${sideStr(eq.right)}$`, x, wrongs, { a, b, c, d }, { signed: true });
}
