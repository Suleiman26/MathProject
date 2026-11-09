// Quadratic equations (grade 9, alg) — ported from Sulaiman's
// src/topics/quadratic-solver/Topic.jsx (never edited).
// Ported: step 2 "identify the coefficients" — on HIS unsorted equation
// (genEq), after bringing it to x² + bx + c = 0 (his step 1 + 2 together;
// a is always 1 there). ONE coefficient is asked (b or c, meta.ask).
// Not ported: step 3 "which case?" (Hebrew word answers, 3 options), step 1
// alone (an expression) and step 4 (two roots) — audit: C.
import { pick } from '../rng.js';
import { numberQuestion } from '../choices.js';

// one side as text: [x² coeff, x coeff, const] → "3x^{2} − 2x + 5" (his sideStr L20, with x^{2} markup and "−")
function sideText(x2, x1, x0) {
  const t = [[x2, 'x^{2}'], [x1, 'x'], [x0, '']].filter(([c]) => c !== 0);
  if (!t.length) return '0';
  return t.map(([c, v], i) => {
    const abs = Math.abs(c);
    const sign = c < 0 ? (i === 0 ? '−' : ' − ') : (i === 0 ? '' : ' + ');
    return `${sign}${v && abs === 1 ? '' : abs}${v}`;
  }).join('');
}

// port of genEq() — src/topics/quadratic-solver/Topic.jsx L94 (Math.random → r; the 300 tries and fallback kept)
function genEq(r) {
  const opts = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  const mode = r();
  for (let i = 0; i < 300; i++) {
    let r1 = pick(r, opts), r2 = pick(r, opts.filter((x) => x !== r1));
    if (mode < 0.2) r1 = 0;
    else if (mode < 0.4) { r2 = -Math.abs(r1); r1 = Math.abs(r1); }
    const B = -(r1 + r2), C = r1 * r2;
    const k = Math.floor(r() * 3), m = Math.floor(r() * 7) - 3, n = Math.floor(r() * 11) - 5;
    if (k === 0 && m === 0 && n === 0) continue;
    const lx2 = 1 + k, lx = B + m, lc = C + n;
    if (Math.abs(lx2) > 5 || Math.abs(lx) > 15 || Math.abs(lc) > 25) continue;
    if (lx2 === 0 && lx === 0 && lc === 0) continue;
    if (k === 0 && m === 0 && n === 0) continue;
    return { L: [lx2, lx, lc], R: [k, m, n], B, C };
  }
  return { L: [2, 3, -5], R: [1, 1, 1], B: 2, C: -6 };
}

export function coefficients(r, want) {
  const { L, R, B, C } = genEq(r);
  // duel limit (choices): a coefficient that is 0 is not asked (it would always be
  // the choice closest to zero); his b = 0 / c = 0 equations ask the other one
  let ask = pick(r, ['bcoef', 'ccoef']);
  if (want !== 'number' && (ask === 'bcoef' ? B : C) === 0) ask = ask === 'bcoef' ? 'ccoef' : 'bcoef';
  const ans = ask === 'bcoef' ? B : C;
  const li = ask === 'bcoef' ? 1 : 2;
  // mistakes: read it off the left side, moved the right-side term without changing its sign, the sign
  const wrongs = [L[li], L[li] + R[li], -ans, ask === 'bcoef' ? C : B];
  return numberQuestion(r, want,
    `סדרו את המשוואה לצורה $x^{2} + bx + c = 0$: $${sideText(...L)} = ${sideText(...R)}$. מה $${ask === 'bcoef' ? 'b' : 'c'}$?`,
    ans, wrongs, { L, R, ask }, { signed: true });
}
