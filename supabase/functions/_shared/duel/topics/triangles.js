// Triangles (grade 7, geo) — ported from Sulaiman's
// src/topics/triangles/Topic.jsx (never edited). The drawings only repeat
// numbers that are written in the duel prompt.
// Ported: ch1 (angle sum — numeric and algebraic), ch3 (special triangles:
// right, isosceles, height in an isosceles, equilateral).
// Not ported: ch2 (types — the answers are Hebrew words, 3 options),
// ch4 (congruence — needs the drawing), isosceles "identify" / "classify"
// (yes/no) and "missing leg" (the answer is printed in the question),
// "half base ↔ base" (×2 / ÷2 only).
// Duel limits (kid speed): algebraic angle sum asks x only (not the angle
// after substituting); Pythagoras without the 9-40-41 triple.
// Every angle in a question is > 0° and < 180° (the audit's filter), and so
// is every angle choice. Typed only (drawn on typed slots only): Pythagoras
// (hypotenuse / missing leg — next to a printed side).
// Wording (2026-11-10, docs/superpowers/specs/2026-11-10-duel-questions-style.md): natural
// Hebrew questions, no point letters (AM, AB), no "ו-$…$" glued to a formula. Answers that are
// angles carry display.unit '°' (deg below); the x of an equation stays a plain number.
// The numbers, answers and random calls are unchanged.
import { randInt, pick } from '../rng.js';
import { numberQuestion, within } from '../choices.js';

const int = (w) => Number.isInteger(w) && w > 0;
// lengths, areas and angles: no 0 among the choices; in an angle question (° in
// the prompt) no choice of 180 or more (no such angle in a triangle / convex quadrilateral)
const q = (r, want, prompt, ans, wrongs, meta, opts) => {
  const angle = prompt.includes('°');
  const accept = angle ? (t) => t !== '0' && Number(t) < 180 : within(ans);
  return numberQuestion(r, want, prompt, ans, wrongs.filter(int), meta, { accept, ...opts });
};
// an angle answer: the phone shows ° after every choice and in the typed box
const deg = (question) => ({ ...question, display: { unit: '°' } });
// numbers next to the ones printed in the question: with them among the
// decoys, "the choice closest to a printed number" can't find the answer
// (Pythagoras: the hypotenuse is just above the longer leg)
const nearPrinted = (...ns) => ns.flatMap((n) => [n - 2, n - 1, n + 1, n + 2]).filter(int).map(String);


// port of wellBalanced() — src/topics/triangles/Topic.jsx L485
function wellBalanced(angles) {
  return angles.every((a) => a >= 40 && a <= 90) && Math.max(...angles) - Math.min(...angles) <= 40;
}

// port of genCh1() — src/topics/triangles/Topic.jsx L488 (Math.random → r)
function genCh1(r) {
  const type = pick(r, ['numeric', 'algebra']);
  if (type === 'numeric') {
    let a, b, c;
    for (let tries = 0; tries < 300; tries++) {
      a = randInt(r, 40, 90); b = randInt(r, 40, 90); c = 180 - a - b;
      if (wellBalanced([a, b, c])) break;
    }
    if (!wellBalanced([a, b, c])) { a = 60; b = 65; c = 55; }
    return { type, angles: [a, b, c], hidden: randInt(r, 0, 2) };
  }
  for (let iter = 0; iter < 300; iter++) {
    const x = randInt(r, 5, 20);
    const a1 = randInt(r, 1, 3), b1 = randInt(r, -15, 25);
    const a2 = randInt(r, 1, 3), b2 = randInt(r, -15, 25);
    const a3 = randInt(r, 1, 3);
    const v1 = a1 * x + b1, v2 = a2 * x + b2;
    const b3 = 180 - v1 - v2 - a3 * x;
    const v3 = a3 * x + b3;
    if (wellBalanced([v1, v2, v3])) return { type, x, exprs: [{ a: a1, b: b1 }, { a: a2, b: b2 }, { a: a3, b: b3 }], angles: [v1, v2, v3] };
  }
  return { type, x: 10, exprs: [{ a: 2, b: 30 }, { a: 1, b: 50 }, { a: 1, b: 60 }], angles: [50, 60, 70] };
}

// port of fmtExpr() — src/topics/triangles/Topic.jsx L522 (with the real minus "−")
export function fmtExpr(e) {
  const x = e.a === 1 ? 'x' : `${e.a}x`;
  return e.b > 0 ? `${x} + ${e.b}` : e.b < 0 ? `${x} − ${-e.b}` : x;
}

/* ── 1. angles ─────────────────────────────────────────────────────── */
export function angles(r, want) {
  const ex = genCh1(r);
  if (ex.type === 'numeric') {
    // the two known angles (ex.hidden says which one is asked; the order of the two is kept)
    const known = ex.angles.filter((_, i) => i !== ex.hidden);
    const [a, b] = known;
    // mistakes: 360 (quadrilateral sum), added them, 180 minus one angle only, 90 − …
    return deg(q(r, want, `במשולש יש זווית של $${a}°$ וזווית של $${b}°$. מה גודל הזווית השלישית?`,
      ex.angles[ex.hidden], [360 - a - b, a + b, 180 - a, 180 - b], { v: 'numeric', known }));
  }
  const A = ex.exprs.reduce((s, e) => s + e.a, 0), B = ex.exprs.reduce((s, e) => s + e.b, 0);
  // mistakes: constants moved without changing sign, constants forgotten, divided only by the first coefficient
  const wrongs = [(180 + B) / A, 180 / A, (180 - B) / ex.exprs[0].a, (180 - B) / (A - 1)];
  // the three expressions as three islands separated by commas (never "ו-$…$")
  return q(r, want, `זוויות המשולש הן $(${fmtExpr(ex.exprs[0])})°$, $(${fmtExpr(ex.exprs[1])})°$, $(${fmtExpr(ex.exprs[2])})°$. מצאו את $x$.`,
    ex.x, wrongs, { v: 'algebra', exprs: ex.exprs });
}

/* ── 3. special triangles ──────────────────────────────────────────── */
const pyTriples = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [7, 24, 25], [8, 15, 17], [9, 12, 15], [10, 24, 26], [12, 16, 20], [15, 20, 25]]; // L668 without 9-40-41

// port of genChRight() L670 (area / pythagoras), genIsoBasics() L1080 (missingAngle),
// genIsoHeight() L1318 (legAngle, baseAngleHalf), genChEquilateral() L1577
export function special(r, want) {
  // (typed-only variants are drawn on typed slots only, so a duel stays mostly 4 choices)
  const v = pick(r, ['rightArea', 'rightLeg', ...(want === 'number' ? ['pyHyp', 'pyLeg'] : []), 'isoBase', 'isoApex', 'heightLeg', 'heightBase', 'equiAngle', 'equiSide']);
  if (v === 'rightArea' || v === 'rightLeg' || v === 'pyHyp' || v === 'pyLeg') {
    const t = pick(r, pyTriples);
    const swap = r() < 0.5;
    const legA = swap ? t[1] : t[0], legB = swap ? t[0] : t[1], hyp = t[2];
    const area = (legA * legB) / 2;
    if (v === 'rightArea') {
      // mistakes: forgot ÷ 2, used the hypotenuse, added
      // the other triangles' areas as decoys (whole and "round" like the answer), and
      // round answers (30, 60, 120, 150) among other multiples of 15
      const args = [r, want, `מה השטח של משולש ישר-זווית שהניצבים שלו ${legA} ו-${legB}?`, area,
        [legA * legB, (legA * hyp) / 2, legA + legB], { v, legA, legB }];
      const extra = [...pyTriples.map((t) => (t[0] * t[1]) / 2), area - 15, area + 15, area + 30].filter((x) => x > 0 && x !== area).map(String);
      const m15 = (ts) => ts.filter((t) => Number(t) % 15 === 0).length >= 1;
      try { return q(...args, { extra, must: m15 }); } catch { return q(...args, { extra }); }
    }
    if (v === 'rightLeg') {
      // "ניצב אחד = …, שטח המשולש = …. מצאו את הניצב השני" (L204); mistakes: forgot × 2, area − leg
      return q(r, want, `במשולש ישר-זווית ניצב אחד הוא $${legB}$ והשטח $${area}$. מה אורך הניצב השני?`, legA,
        [area / legB, area - legB, 2 * area, 4 * legA], { v, legB, area });
    }
    if (v === 'pyHyp') {
      // mistakes: added the legs, forgot the root
      // typed only (the hypotenuse is next to the longer leg)
      return q(r, 'number', `במשולש ישר-זווית הניצבים הם ${legA} ו-${legB}. מה אורך היתר?`, hyp,
        [legA + legB, legA * legA + legB * legB], { v, legA, legB }, { extra: nearPrinted(legA, legB) });
    }
    // a missing leg; mistakes: hyp − leg, added the squares, forgot the root
    // typed only (a missing leg: Pythagoras, like the hypotenuse)
    return q(r, 'number', `במשולש ישר-זווית ניצב אחד הוא $${legB}$ והיתר $${hyp}$. מה אורך הניצב השני?`, legA,
      [hyp - legB, hyp * hyp - legB * legB, hyp + legB], { v, legB, hyp }, { extra: nearPrinted(legB, hyp) });
  }
  if (v === 'isoBase') { // missingAngle fromVertex: "זווית הראש = …°. … מצאו את זווית הבסיס"
    const va = randInt(r, 10, 65) * 2, b = (180 - va) / 2;
    // mistakes: forgot ÷ 2, the apex itself, 90 − apex
    return deg(q(r, want, `במשולש שווה-שוקיים זווית הראש היא $${va}°$. מה גודל זווית הבסיס?`, b,
      [180 - va, va, 90 - va, 180 - 2 * va, va / 2], { v, apex: va }));
  }
  if (v === 'isoApex') { // missingAngle fromBase: "זווית בסיס = …°. … מצאו את זווית הראש"
    const b = randInt(r, 25, 80), va = 180 - 2 * b;
    // mistakes: subtracted only one base angle, the base angle itself, half
    return deg(q(r, want, `במשולש שווה-שוקיים זווית הבסיס היא $${b}°$. מה גודל זווית הראש?`, va,
      [180 - b, b, (180 - b) / 2, 90 - b], { v, base: b }));
  }
  if (v === 'heightLeg') { // legAngle (L1394): the angle between the height (to the base) and the leg = 90 − base angle
    const b = randInt(r, 25, 65);
    return deg(q(r, want, `במשולש שווה-שוקיים זווית הבסיס היא $${b}°$. מעבירים גובה מזווית הראש לבסיס. מה גודל הזווית בין הגובה לשוק?`, 90 - b,
      [180 - 2 * b, 180 - b, b, 2 * (90 - b)], { v, base: b }, { extra: nearPrinted(b) }));
  }
  if (v === 'heightBase') { // baseAngleHalf (L1421): base angle = 90 − half of the apex
    // (the height to the base halves the apex angle: half of it = the angle between the height and a leg)
    const half = randInt(r, 15, 55);
    return deg(q(r, want, `במשולש שווה-שוקיים הגובה לבסיס יוצר עם השוק זווית של $${half}°$. מה גודל זווית הבסיס?`, 90 - half,
      [180 - 2 * half, 2 * half, 180 - half, (180 - half) / 2], { v, half }));
  }
  // equilateral (genChEquilateral L1577): every angle is 60°, every side equal
  if (v === 'equiAngle') {
    const x = randInt(r, 4, 15), a = pick(r, [1, 2, 3]), b = 60 - a * x;
    const e = { a, b };
    // mistakes: used 180 (the sum) for one angle, constant not moved, ignored the coefficient
    return q(r, want, `במשולש שווה-צלעות זווית אחת היא $(${fmtExpr(e)})°$. מצאו את $x$.`, x,
      [(180 - b) / a, (60 + b) / a, 60 - b, 60 / a], { v, a, b });
  }
  let x, a, b, k;
  for (let tries = 0; tries < 200; tries++) {
    x = randInt(r, 4, 15); a = pick(r, [1, 2, 3]); b = randInt(r, -15, 20); k = a * x + b;
    if (k >= 3 && k <= 60) break;
  }
  if (!(k >= 3 && k <= 60)) { x = 6; a = 2; b = 3; k = 15; }
  const e = { a, b };
  return q(r, want, `במשולש שווה-צלעות צלע אחת היא $${k}$ וצלע אחרת היא $${fmtExpr(e)}$. מצאו את $x$.`, x,
    [(k + b) / a, k / a, k - b, (3 * k - b) / a], { v, a, b, k });
}
