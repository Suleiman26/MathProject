// Circle (grade 9, geo) — ported from Sulaiman's src/topics/circle/Topic.jsx
// (never edited). Chapter 1 (name the marked part) needs a drawing and is not
// ported. π answers are asked as the coefficient of π ("C = ?π", his own
// "C = 2π·r = __ π" input), so they stay whole numbers. The numeric
// circumference (π ≈ 3.14) is answered with tol 0.1 (his check, L218).
// "Convert degrees to radians" has a π-fraction answer: 4 choices from his
// radians table (radVals L617), never typed.
// Duel limits: arc chapter's "sector perimeter" (kπ + 2r, two parts) is not
// asked.
import { randInt, pick } from '../rng.js';
import { numberQuestion, choiceQuestion, within, niceAngleOpts } from '../choices.js';

const int = (w) => Number.isInteger(w) && w > 0;
// lengths, areas: no 0 and nothing far from the answer's size; the angle answers
// (multiples of 15° from his tables) pass niceAngleOpts
const q = (r, want, prompt, ans, wrongs, meta, opts) => numberQuestion(r, want, prompt, ans, wrongs.filter(int), meta, { accept: within(ans), ...opts });

// port of fmtFrac() — src/topics/circle/Topic.jsx L22 (as duel markup: \frac{π}{3}, \frac{2π}{3}, 2π)
export function piFrac(n, d) {
  if (d === 1) return n === 1 ? 'π' : `${n}π`;
  return `\\frac{${n === 1 ? '' : n}π}{${d}}`;
}

const turnFracs = [ // L625
  { num: 1, den: 4, deg: 90 }, { num: 1, den: 2, deg: 180 }, { num: 1, den: 8, deg: 45 }, { num: 1, den: 3, deg: 120 }, { num: 1, den: 6, deg: 60 },
  { num: 3, den: 4, deg: 270 }, { num: 1, den: 12, deg: 30 }, { num: 2, den: 3, deg: 240 }, { num: 3, den: 8, deg: 135 }, { num: 5, den: 6, deg: 300 },
];
const radVals = [ // L617
  { deg: 30, num: 1, den: 6 }, { deg: 45, num: 1, den: 4 }, { deg: 60, num: 1, den: 3 },
  { deg: 90, num: 1, den: 2 }, { deg: 120, num: 2, den: 3 }, { deg: 150, num: 5, den: 6 },
  { deg: 180, num: 1, den: 1 }, { deg: 270, num: 3, den: 2 }, { deg: 360, num: 2, den: 1 },
];

/* ── 2. radians ─ port of genCh6(part) — src/topics/circle/Topic.jsx L629 ── */
export function radians(r, want) {
  // degrees → radians has a π-fraction answer: only as 4 choices
  const v = pick(r, want === 'number' ? ['fracToDeg', 'thetaArc', 'radToDeg', 'arcRad'] : ['fracToDeg', 'thetaArc', 'radToDeg', 'arcRad', 'degToRad']);
  if (v === 'fracToDeg') {
    const f = pick(r, turnFracs);
    // mistakes: a half turn (180), forgot the numerator
    return q(r, want, `הזווית היא $\\frac{${f.num}}{${f.den}}$ מסיבוב שלם. כמה מעלות היא?`, f.deg,
      [(180 * f.num) / f.den, 360 / f.den, (90 * f.num) / f.den], { v, num: f.num, den: f.den }, niceAngleOpts(f.deg, 360)); // a part of a turn: < 360°
  }
  if (v === 'thetaArc') {
    const rr = randInt(r, 2, 9), theta = pick(r, [1, 2, 3, 0.5, 1.5, 2.5]);
    const L = rr * theta;
    // choices: the other angles of his list (no ×10 / ÷10 decoys), + r ÷ L, L − r
    const extra = [0.5, 1, 1.5, 2, 2.5, 3].filter((t) => t !== theta).map(String);
    const wrongs = [rr / L, L - rr].filter((w) => w > 0 && Number.isInteger(w * 2) && w <= 6);
    return numberQuestion(r, want, `הרדיוס הוא $${rr}$, ואורך הקשת הוא $${L}$. מה הזווית ברדיאנים?`, theta, wrongs,
      { v, r: rr, L }, { decoys: false, extra });
  }
  if (v === 'radToDeg') {
    const rv = pick(r, radVals);
    // mistakes: π = 360°, half of it, the supplement
    return q(r, want, `המר $${piFrac(rv.num, rv.den)}$ רדיאנים למעלות`, rv.deg, [2 * rv.deg, rv.deg / 2, 180 - rv.deg], { v, num: rv.num, den: rv.den }, niceAngleOpts(rv.deg, 360, true));
  }
  if (v === 'arcRad') {
    let rv, rr, coeff;
    // duel limit (choices): not θ = π (L = rπ is printed), and L ≥ 3 and not a number
    // printed in the question (1 and 2 have no smaller choices)
    const ok = (c) => Number.isInteger(c) && (want === 'number' || (rv.den !== 1 && c >= 3 && c !== rr && c !== rv.num && c !== rv.den));
    for (let i = 0; i < 200; i++) {
      rv = pick(r, radVals.slice(0, 7)); rr = randInt(r, 2, 12); coeff = (rr * rv.num) / rv.den;
      if (ok(coeff)) break;
    }
    if (!ok(coeff)) { rv = radVals[3]; rr = 6; coeff = 3; }
    // mistakes: θ upside down, forgot the denominator, twice
    return q(r, want, `$r = ${rr}$, $θ = ${piFrac(rv.num, rv.den)}$ רדיאנים. חשבו את אורך הקשת: $L = ?π$`, coeff,
      [(rr * rv.den) / rv.num, rr * rv.num, 2 * coeff, rr], { v, r: rr, num: rv.num, den: rv.den });
  }
  // degToRad: choices = his table's radian values
  const rv = pick(r, radVals);
  const form = (d) => { const x = radVals.find((t) => t.deg === d); return x ? piFrac(x.num, x.den) : null; };
  // mistakes: used 360° for π (half), 90° for π (double)
  const wrongs = [form(rv.deg / 2), form(rv.deg * 2)].filter(Boolean);
  return choiceQuestion(r, `המר $${rv.deg}°$ לרדיאנים`, piFrac(rv.num, rv.den), wrongs, { v, deg: rv.deg },
    { decoys: false, extra: radVals.map((t) => piFrac(t.num, t.den)) });
}

/* ── 3. circumference ─ port of genCh2() — src/topics/circle/Topic.jsx L191 ── */
export function circumference(r, want) {
  const v = pick(r, ['calc', 'findR', 'numerical']);
  const rr = randInt(r, 2, 15);
  if (v === 'calc') return q(r, want, `$r = ${rr}$. חשבו את היקף המעגל: $C = 2π · ${rr} = ?π$`, 2 * rr, [rr, rr * rr, 4 * rr], { v, r: rr });
  if (v === 'findR') return q(r, want, `היקף המעגל הוא $${2 * rr}π$. מצאו את הרדיוס: $r = ?$`, rr, [2 * rr, 4 * rr, rr * rr], { v, C: 2 * rr });
  // numerical, π ≈ 3.14 (his check: within 0.1 of 2·3.14·r)
  const c = (k) => String(Number((3.14 * k).toFixed(2)));
  const ans = Number((6.28 * rr).toFixed(2));
  if (want === 'number') return { kind: 'number', prompt: `$r = ${rr}$. חשבו את ההיקף לפי $π ≈ 3.14$: $C = ?$`, answer: String(ans), tol: 0.1, meta: { v, r: rr } };
  // mistakes: forgot the 2, the area, π · (2r ± 1)
  const wrongs = [c(rr), c(rr * rr), c(4 * rr)];
  const extra = [2 * rr - 2, 2 * rr - 1, 2 * rr + 1, 2 * rr + 2, rr + 1, rr - 1].filter((k) => k > 0).map(c);
  return choiceQuestion(r, `$r = ${rr}$. חשבו את ההיקף לפי $π ≈ 3.14$: $C = ?$`, String(ans), wrongs, { v, r: rr }, { decoys: false, extra });
}

/* ── 4. area ─ port of genCh3() — src/topics/circle/Topic.jsx L270 ── */
const ANG = [30, 45, 60, 90, 120, 150, 180];
export function area(r, want) {
  const v = pick(r, ['calc', 'findR', 'sector']);
  if (v === 'sector') {
    let angle, rr, c;
    // duel limit (choices): the answer is not r (printed) and ≥ 2
    const ok = (x) => Number.isInteger(x) && (want === 'number' || (x !== rr && x >= 2));
    for (let i = 0; i < 200; i++) { angle = pick(r, ANG); rr = randInt(r, 2, 12); c = (angle * rr * rr) / 360; if (ok(c)) break; }
    if (!ok(c)) { angle = 90; rr = 6; c = 9; }
    // mistakes: the whole circle, the arc's coefficient, forgot ÷ 2 (θ/180)
    return q(r, want, `$r = ${rr}$, $θ = ${angle}°$. חשבו את שטח הגזרה: $S = ?π$`, c,
      [rr * rr, (angle * rr) / 180, (angle * rr * rr) / 180], { v, r: rr, angle });
  }
  const rr = randInt(r, 2, 12);
  if (v === 'calc') return q(r, want, `$r = ${rr}$. חשבו את שטח המעגל: $S = ?π$`, rr * rr, [2 * rr, 4 * rr * rr, 2 * rr * rr], { v, r: rr });
  const S = rr * rr;
  return q(r, want, `שטח המעגל הוא $${S}π$. מה הרדיוס? $r = ?$`, rr, [S / 2, S / 4, 2 * rr], { v, S });
}

/* ── 5. arc ─ port of genCh4() — src/topics/circle/Topic.jsx L385 ── */
export function arc(r, want) {
  const v = pick(r, ['arcLen', 'findAngle']);
  let angle, rr, arcCoeff;
  // duel limit (choices, arc length): L ≥ 3 and not r (θ = 180° prints it)
  const ok = (x) => Number.isInteger(x) && (want === 'number' || v !== 'arcLen' || (x >= 3 && x !== rr));
  for (let i = 0; i < 200; i++) {
    angle = pick(r, ANG); rr = randInt(r, 2, 15); arcCoeff = (angle * rr) / 180;
    // choices: θ = 180° fits every r, so it would be ~37% of the central angles — 3 in 4 re-rolled
    if (v === 'findAngle' && want !== 'number' && angle === 180 && r() < 0.75) continue;
    if (ok(arcCoeff)) break;
  }
  if (!ok(arcCoeff)) { angle = 90; rr = 6; arcCoeff = 3; }
  if (v === 'arcLen') return q(r, want, `$r = ${rr}$, $θ = ${angle}°$. חשבו את אורך הקשת: $L = ?π$`, arcCoeff,
    [2 * rr, (angle * rr) / 360, (angle * rr * rr) / 360, 2 * arcCoeff], { v, r: rr, angle });
  // mistakes: 360 instead of 180, half, the supplement
  return q(r, want, `אורך הקשת הוא $${arcCoeff === 1 ? '' : arcCoeff}π$, $r = ${rr}$. מצאו את הזווית המרכזית: $θ = ?$`, angle,
    [(360 * arcCoeff) / rr, (90 * arcCoeff) / rr, 180 - angle, 360 - angle], { v, L: arcCoeff, r: rr }, niceAngleOpts(angle, 360, true));
}

/* ── 6. all together ─ port of genCh5() — src/topics/circle/Topic.jsx L501 ── */
export function combined(r, want) {
  const v = pick(r, ['circToArea', 'sectorToR', 'annulus']);
  if (v === 'circToArea') {
    const rr = randInt(r, 2, 15);
    // mistakes: used the circumference's number as r, stopped at 2r
    return q(r, want, `היקף המעגל הוא $${2 * rr}π$. מצאו את שטחו: $S = ?π$`, rr * rr, [4 * rr * rr, 2 * rr, rr, 2 * rr * rr], { v, C: 2 * rr });
  }
  if (v === 'sectorToR') {
    let angle, rr, sa;
    // duel limit (choices): the radius is not the printed sector number
    const ok = (x) => Number.isInteger(x) && (want === 'number' || x !== rr);
    for (let i = 0; i < 200; i++) { angle = pick(r, ANG); rr = randInt(r, 2, 10); sa = (angle * rr * rr) / 360; if (ok(sa)) break; }
    if (!ok(sa)) { angle = 90; rr = 6; sa = 9; }
    // mistakes: forgot the root (r²), ×2 instead of ×(360/θ)
    return q(r, want, `שטח גזרה $= ${sa}π$, $θ = ${angle}°$. מצאו את הרדיוס: $r = ?$`, rr, [rr * rr, (sa * 360) / angle / 2, 2 * rr], { v, S: sa, angle });
  }
  const R = randInt(r, 6, 15), rr = randInt(r, 2, R - 2);
  // mistakes: (R − r)², added, only the big circle
  return q(r, want, `$R = ${R}$, $r = ${rr}$. חשבו את שטח הטבעת (השטח בין שני המעגלים): $S = ?π$`, R * R - rr * rr,
    [(R - rr) ** 2, R * R + rr * rr, R * R, 2 * (R - rr)], { v, R, r: rr });
}
