// Quadrilaterals (grade 8, geo) — ported from Sulaiman's
// src/topics/quadrilaterals/Topic.jsx (never edited). His questions are
// complete in text (`given` + `askLabel`); the drawings only repeat them.
// One generator per chapter (square … kite); meta.v names the question.
// Duel limits (kid speed / text only):
//   • "reasoned angle" questions ask the ADJACENT angle only (the opposite
//     one equals the given angle — the answer would be printed);
//   • trapezoid / kite "fourth angle": the given angles always form a real
//     trapezoid (A + B = 180°) / kite (R = L), see the audit's filter;
//   • isosceles / right trapezoid area = the general area formula → only the
//     general one is asked; the Pythagoras questions (iso height, right
//     perimeter) are kept.
// Typed only (drawn on typed slots only): rhombus side and isosceles-trapezoid
// height (Pythagoras: the answer sits next to a printed length, so "the
// choice closest to a printed number" would find it).
// Angle choices: only multiples of 15° below 180° (real mistakes + other such angles).
// Length / area choices stay within ×/÷ 6 of the answer.
import { randInt, pick } from '../rng.js';
import { numberQuestion, within, niceAngleOpts } from '../choices.js';

const ANGLES = [30, 45, 60, 90, 120, 150]; // L15
const ANGLES_NO90 = [30, 45, 60, 120, 150]; // L16
const PY_TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [15, 20, 25]]; // L17

// port of pickTriple() — src/topics/quadrilaterals/Topic.jsx L18
function pickTriple(r, maxLeg) {
  const opts = PY_TRIPLES.filter((t) => t[0] <= maxLeg && t[1] <= maxLeg);
  const t = pick(r, opts.length ? opts : [[3, 4, 5]]);
  return r() < 0.5 ? [t[0], t[1], t[2]] : [t[1], t[0], t[2]];
}

const int = (w) => Number.isInteger(w) && w > 0;
// lengths and areas: no 0 and nothing far from the answer's size; angles (° in the
// prompt, always a multiple of 15° here): only multiples of 15° below 180° (convex)
const q = (r, want, prompt, ans, wrongs, meta, opts) => {
  const base = prompt.includes('°') ? niceAngleOpts(ans, 180) : { accept: within(ans) };
  return numberQuestion(r, want, prompt, ans, wrongs.filter(int), meta, { ...base, ...opts });
};
// numbers next to the ones printed in the question: with them among the
// decoys, "the choice closest to a printed number" can't find the answer
// (Pythagoras: the hypotenuse is just above the longer leg)
const nearPrinted = (...ns) => ns.flatMap((n) => [n - 2, n - 1, n + 1, n + 2]).filter(int).map(String);


/* ── 1. square ─────────────────────────────────────────────────────── */
// port of genSquareArea() L502, genSquarePerimeter() L508, genSquareSide() L514
export function square(r, want) {
  const v = pick(r, ['area', 'perim', 'side']);
  const a = randInt(r, 2, 20);
  if (v === 'area') return q(r, want, `ריבוע — שטח: צלע $a = ${a}$. $S = ?$`, a * a, [4 * a, 2 * a], { v, a });
  if (v === 'perim') return q(r, want, `ריבוע — היקף: צלע $a = ${a}$. $P = ?$`, 4 * a, [a * a, 2 * a, a + 4], { v, a });
  const S = a * a;
  // mistakes: S ÷ 2, S ÷ 4 (perimeter thinking)
  return q(r, want, `ריבוע — צלע: שטח $S = ${S}$. $a = ?$`, a, [S / 2, S / 4], { v, S });
}

/* ── 2. rectangle ──────────────────────────────────────────────────── */
// port of genRectPair() — src/topics/quadrilaterals/Topic.jsx L560
function rectPair(r) {
  const l = randInt(r, 2, 20);
  let w = randInt(r, 2, 20);
  if (l === w) w = w < 20 ? w + 1 : w - 1;
  return [l, w];
}

// port of genRectArea() L565, genRectPerimeter() L571, genRectSide() L577
export function rectangle(r, want) {
  const v = pick(r, ['area', 'perim', 'side']);
  const [l, w] = rectPair(r);
  const given = `אורך $l = ${l}$, רוחב $w = ${w}$`;
  if (v === 'area') return q(r, want, `מלבן — שטח: ${given}. $S = ?$`, l * w, [2 * (l + w), l + w], { v, l, w });
  if (v === 'perim') return q(r, want, `מלבן — היקף: ${given}. $P = ?$`, 2 * (l + w), [l * w, l + w, 2 * l + w], { v, l, w });
  const S = l * w;
  // mistakes: S − l, S ÷ 2, twice the width
  return q(r, want, `מלבן — רוחב: שטח $S = ${S}$, אורך $l = ${l}$. $w = ?$`, w, [S - l, S / 2, 2 * w], { v, S, l });
}

/* ── 3. rhombus ────────────────────────────────────────────────────── */
// port of genRhombusArea() L613, genRhombusPerimeter() L620, genRhombusSide() L626, genRhombusAngle() L632
export function rhombus(r, want) {
  // (typed-only variants are drawn on typed slots only, so a duel stays mostly 4 choices)
  const v = pick(r, want === 'number' ? ['area', 'perim', 'side', 'angle'] : ['area', 'perim', 'angle']);
  if (v === 'area') {
    let d1 = randInt(r, 2, 20); if (d1 % 2 !== 0) d1++;
    const d2 = randInt(r, 2, 20);
    // mistakes: forgot ÷ 2, added the diagonals, ÷ 4
    return q(r, want, `מעוין — שטח: אלכסון $d₁ = ${d1}$, אלכסון $d₂ = ${d2}$. $S = ?$`, (d1 * d2) / 2, [d1 * d2, d1 + d2, (d1 * d2) / 4], { v, d1, d2 });
  }
  if (v === 'perim') {
    const a = randInt(r, 2, 20);
    return q(r, want, `מעוין — היקף: צלע $a = ${a}$. $P = ?$`, 4 * a, [a * a, 2 * a, a + 4], { v, a });
  }
  if (v === 'side') {
    const [p, s, side] = pickTriple(r, 20);
    // mistakes: added the half diagonals, forgot the root, doubled (whole diagonals)
    // typed only: the side is next to the longer half diagonal ("near a printed number")
    return q(r, 'number', `מעוין — צלע: חצי אלכסון אחד $= ${p}$, חצי אלכסון שני $= ${s}$ (משולש ישר-זווית עם האלכסונים). $a = ?$`,
      side, [p + s, p * p + s * s, 2 * side], { v, p, q: s }, { extra: nearPrinted(p, s) });
  }
  const A = pick(r, ANGLES_NO90);
  // the adjacent angle (180 − A); mistakes: the opposite one (= A), 360 − A, 90 − A
  return q(r, want, `מעוין — זווית: זווית $A = ${A}°$. זווית $B$ (סמוכה ל-$A$) $= ?$`, 180 - A, [A, 360 - A, 90 - A], { v, A });
}

/* ── 4. parallelogram ──────────────────────────────────────────────── */
// port of genParaArea() L676, genParaPerimeter() L682, genParaSide() L689, genParaAngle() L695
export function parallelogram(r, want) {
  const v = pick(r, ['area', 'perim', 'side', 'angle']);
  if (v === 'area') {
    const b = randInt(r, 2, 20), h = randInt(r, 2, 20);
    return q(r, want, `מקבילית — שטח: בסיס $b = ${b}$, גובה $h = ${h}$. $S = ?$`, b * h, [2 * (b + h), (b * h) / 2, b + h], { v, b, h });
  }
  if (v === 'perim') {
    let a = randInt(r, 2, 20), b = randInt(r, 2, 20);
    if (a === b) b = b < 20 ? b + 1 : b - 1;
    return q(r, want, `מקבילית — היקף: צלע $a = ${a}$, צלע $b = ${b}$. $P = ?$`, 2 * (a + b), [a * b, a + b, 2 * a + b], { v, a, b });
  }
  if (v === 'side') {
    const b = randInt(r, 2, 20), h = randInt(r, 2, 20);
    const S = b * h;
    return q(r, want, `מקבילית — בסיס: שטח $S = ${S}$, גובה $h = ${h}$. $b = ?$`, b, [S - h, S / 2, 2 * b], { v, S, h });
  }
  const A = pick(r, ANGLES_NO90);
  return q(r, want, `מקבילית — זווית: זווית $A = ${A}°$. זווית $B$ (סמוכה ל-$A$) $= ?$`, 180 - A, [A, 360 - A, 90 - A], { v, A });
}

/* ── 5. trapezoid (general, isosceles, right) ─────────────────────── */
// port of genTrapGenPair() — src/topics/quadrilaterals/Topic.jsx L756
function trapPair(r) {
  const b1 = randInt(r, 2, 20);
  let b2 = randInt(r, 2, 20);
  if (b1 === b2) b2 = b2 < 20 ? b2 + 1 : b2 - 1;
  return b1 < b2 ? [b1, b2] : [b2, b1];
}
// port of genTrapGenBasesEven() L761
function trapBasesEven(r) {
  const b1 = randInt(r, 2, 18);
  const maxDelta = 20 - b1;
  const maxEvenDelta = maxDelta - (maxDelta % 2);
  const opts = []; for (let d = 2; d <= maxEvenDelta; d += 2) opts.push(d);
  const delta = opts.length ? pick(r, opts) : 2;
  return [b1, b1 + delta];
}
// port of genTrapIsoBase() L819
function trapIsoBase(r) {
  const [k, h, s] = pickTriple(r, 9);
  const b1 = randInt(r, 2, Math.max(2, 20 - 2 * k));
  return { k, h, s, b1, b2: b1 + 2 * k };
}
// port of genTrapRightBase() L872
function trapRightBase(r) {
  const [k, h, s] = pickTriple(r, 14);
  const b1 = randInt(r, 2, Math.max(2, 20 - k));
  return { k, h, s, b1, b2: b1 + k };
}

const T = 'טרפז';
export function trapezoid(r, want) {
  // (typed-only variants are drawn on typed slots only, so a duel stays mostly 4 choices)
  const v = pick(r, ['area', 'perim', 'side', 'angle', ...(want === 'number' ? ['isoH'] : []), 'isoP', 'rightP', 'rightSide', 'rightAngle']);
  if (v === 'area') { // genTrapGenArea() L769
    const [b1, b2] = trapBasesEven(r);
    const h = randInt(r, 2, 20);
    // mistakes: forgot ÷ 2, only the long base, half the difference
    return q(r, want, `${T} — שטח: בסיס עליון $b₁ = ${b1}$, בסיס תחתון $b₂ = ${b2}$, גובה $h = ${h}$. $S = ?$`,
      ((b1 + b2) / 2) * h, [(b1 + b2) * h, b2 * h, ((b2 - b1) / 2) * h], { v, b1, b2, h });
  }
  if (v === 'perim') { // genTrapGenPerimeter() L776
    const [b1, b2] = trapPair(r);
    const l1 = randInt(r, 2, 20), l2 = randInt(r, 2, 20);
    const P = b1 + b2 + l1 + l2;
    return q(r, want, `${T} — היקף: $b₁ = ${b1}$, $b₂ = ${b2}$, השוק הראשונה $= ${l1}$, השוק השנייה $= ${l2}$. $P = ?$`,
      P, [P - l1, P - l2, 2 * (b1 + b2)], { v, b1, b2, l1, l2 });
  }
  if (v === 'side') { // genTrapGenSide() L782
    const [b1, b2] = trapBasesEven(r);
    const h = randInt(r, 2, 20);
    const S = ((b1 + b2) / 2) * h;
    // mistakes: forgot × 2, forgot − b₁, the sum of the bases
    return q(r, want, `${T} — בסיס שני: שטח $S = ${S}$, גובה $h = ${h}$, בסיס עליון $b₁ = ${b1}$. $b₂ = ?$`,
      b2, [S / h - b1, (2 * S) / h, b1 + b2], { v, S, h, b1 });
  }
  if (v === 'angle') { // genTrapGenAngle() L789 — a real trapezoid: A + B = 180° (AB is a leg), D = 180° − C
    let A, C;
    // duel limit (choices): D is not one of the printed angles
    do { A = pick(r, ANGLES); C = pick(r, ANGLES); } while ((A === 90 && C === 90) || (want !== 'number' && [A, 180 - A, C].includes(180 - C)));
    const B = 180 - A, D = 180 - C;
    return q(r, want, `${T} — זווית (הרביעית): זווית $A = ${A}°$, זווית $B = ${B}°$, זווית $C = ${C}°$. זווית $D = ?$`,
      D, [C, A, 360 - A - C], { v, A, B, C });
  }
  if (v === 'isoH') { // genTrapIsoSide() L837
    const { k, h, s, b1, b2 } = trapIsoBase(r);
    // mistakes: the whole difference of the bases, half of it, leg − half
    // typed only (Pythagoras: the height is next to a printed length)
    return q(r, 'number', `${T} שווה שוקיים — גובה: $b₁ = ${b1}$, $b₂ = ${b2}$, שוק $= ${s}$ (השתמשו בפיתגורס). $h = ?$`,
      h, [b2 - b1, k, s - k, s + k], { v, b1, b2, s }, { extra: nearPrinted(s, b1, b2) });
  }
  if (v === 'isoP') { // genTrapIsoPerimeter() L831
    const { s, b1, b2 } = trapIsoBase(r);
    const P = b1 + b2 + 2 * s;
    return q(r, want, `${T} שווה שוקיים — היקף: $b₁ = ${b1}$, $b₂ = ${b2}$, שוק $= ${s}$. $P = ?$`,
      P, [b1 + b2 + s, 2 * (b1 + b2) + s, P + s], { v, b1, b2, s });
  }
  if (v === 'rightP') { // genTrapRightPerimeter() L884
    const { k, h, s, b1, b2 } = trapRightBase(r);
    const P = b1 + b2 + h + s;
    // mistakes: forgot the slanted leg, used h twice, used the difference instead of the leg
    return q(r, want, `${T} ישר זווית — היקף: $b₁ = ${b1}$, $b₂ = ${b2}$, שוק ניצבה $h = ${h}$ (מצאו את השוק האלכסונית בעזרת פיתגורס). $P = ?$`,
      P, [b1 + b2 + h, b1 + b2 + 2 * h, b1 + b2 + h + k], { v, b1, b2, h });
  }
  if (v === 'rightSide') { // genTrapRightSide() L890
    const { h, b1, b2 } = trapRightBase(r);
    const S = ((b1 + b2) / 2) * h;
    return q(r, want, `${T} ישר זווית — בסיס שני: שטח $S = ${S}$, שוק ניצבה $h = ${h}$, בסיס עליון $b₁ = ${b1}$. $b₂ = ?$`,
      b2, [S / h - b1, (2 * S) / h, b1 + b2], { v, S, h, b1 });
  }
  // rightAngle — genTrapRightAngle() L897
  const g = pick(r, [60, 120, 150, 30, 45]);
  return q(r, want, `${T} ישר זווית — הזווית השלישית: שתי הזוויות הישרות ידועות; הזווית הנוספת $= ${g}°$. הזווית השלישית $= ?$`,
    180 - g, [g, 270 - g, 90 - g], { v, g }); // mistakes: equal to it, forgot one right angle
}

/* ── 6. kite ───────────────────────────────────────────────────────── */
// port of genKiteArea() L946, genKitePerimeter() L953, genKiteSide() L961, genKiteAngle() L968
export function kite(r, want) {
  const v = pick(r, ['area', 'perim', 'side', 'angle']);
  if (v === 'area') {
    let d1 = randInt(r, 2, 20); if (d1 % 2 !== 0 && d1 < 20) d1++;
    const d2 = randInt(r, 2, 20);
    return q(r, want, `דלתון — שטח: אלכסון ראשי $d₁ = ${d1}$, אלכסון משני $d₂ = ${d2}$. $S = ?$`, (d1 * d2) / 2, [d1 * d2, d1 + d2, (d1 * d2) / 4], { v, d1, d2 });
  }
  if (v === 'perim') {
    let a = randInt(r, 2, 20), b = randInt(r, 2, 20);
    if (a === b) b = b < 20 ? b + 1 : b - 1;
    if (a > b) [a, b] = [b, a];
    return q(r, want, `דלתון — היקף: צלע קצרה $a = ${a}$, צלע ארוכה $b = ${b}$. $P = ?$`, 2 * (a + b), [a * b, a + b, 2 * a + b], { v, a, b });
  }
  if (v === 'side') {
    let d1 = randInt(r, 2, 20); if (d1 % 2 !== 0 && d1 < 20) d1++;
    const d2 = randInt(r, 2, 20);
    const S = (d1 * d2) / 2;
    // mistakes: forgot × 2, S − d₁
    return q(r, want, `דלתון — אלכסון שני: שטח $S = ${S}$, אלכסון $d₁ = ${d1}$. $d₂ = ?$`, d2, [S / d1, S - d1, 2 * d2], { v, S, d1 });
  }
  // angle: a real kite — R = L (the angles between the unequal sides);
  // T and R are given, B = 360° − T − 2R (duel version of his "fourth angle")
  let Ta, R, B;
  do { Ta = pick(r, ANGLES); R = pick(r, ANGLES); B = 360 - Ta - 2 * R; } while (B <= 10 || B >= 170 || B === Ta);
  // mistakes: forgot that L = R (360 − T − R), B = T, B = R, 180 − T
  return q(r, want, `דלתון TRBL — זווית: זווית $T = ${Ta}°$, זווית $R = ${R}°$ (הזוויות $R$ ו-$L$ שוות). זווית $B = ?$`,
    B, [360 - Ta - R, Ta, R, 180 - Ta], { v, T: Ta, R });
}
