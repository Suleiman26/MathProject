// 3D solids (grade 7, geo) — ported from Sulaiman's
// src/topics/solids3d/Topic.jsx (never edited). His answers are computed
// inside the Ch*Q* components; the formulas are copied from there.
// π answers are asked as the coefficient of π ("V = ?π"), so they stay
// whole numbers; √3 answers likewise ("V = ?√3").
// Duel limits (kid speed / text only):
//   • cube edge 2–10 (his 2–12: 12³ = 1728 is not a 15-second sum);
//   • cube "d = a√3 → a" is not asked (the answer is printed in d);
//   • chapter 7 (combined) is not ported (audit: C);
//   • sphere "S → V" without r = 3 (V = S) as choices.
// Typed only (drawn on typed slots only): Pythagoras answers — box space
// diagonal, cone slant height, pyramid apothem and height; the box scale
// factor k (a small number worked out from the small printed ratio).
import { randInt, pick, shuffle } from '../rng.js';
import { numberQuestion, within } from '../choices.js';

const PY_TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15]]; // L16
// port of pickTriple() — src/topics/solids3d/Topic.jsx L18
function pickTriple(r) { const t = pick(r, PY_TRIPLES); return r() < 0.5 ? [t[0], t[1], t[2]] : [t[1], t[0], t[2]]; }
const BOX_QUADS = [[3, 4, 12, 13], [2, 6, 9, 11], [6, 6, 7, 11], [4, 4, 7, 9], [2, 3, 6, 7], [2, 10, 11, 15]]; // L19
// port of pickQuad() — src/topics/solids3d/Topic.jsx L20
function pickQuad(r) {
  const qd = pick(r, BOX_QUADS);
  const [l, w, h] = shuffle(r, [qd[0], qd[1], qd[2]]);
  return { l, w, h, d: qd[3] };
}

const int = (w) => Number.isInteger(w) && w > 0;
// lengths, areas, volumes: no 0 and nothing far from the answer's size
const q = (r, want, prompt, ans, wrongs, meta, opts) => numberQuestion(r, want, prompt, ans, wrongs.filter(int), meta, { accept: within(ans), ...opts });
// numbers next to the ones printed in the question: with them among the
// decoys, "the choice closest to a printed number" can't find the answer
// (Pythagoras: the hypotenuse is just above the longer leg)
const nearPrinted = (...ns) => ns.flatMap((n) => [n - 2, n - 1, n + 1, n + 2]).filter(int).map(String);


/* ── 1. cube ─ genCube() L182; Ch1Q1 L203 (V = a³), Ch1Q2 L214 (S = 6a²) */
export function cube(r, want) {
  const v = pick(r, ['vol', 'surf']);
  const a = randInt(r, 2, 10); // duel limit (his 2–12)
  if (v === 'vol') return q(r, want, `צלע הקובייה: $a = ${a}$. חשבו את נפח הקובייה: $V = ?$`, a ** 3, [3 * a, a * a, 6 * a * a], { v, a });
  return q(r, want, `צלע הקובייה: $a = ${a}$. חשבו את שטח הפנים הכולל של הקובייה: $S = ?$`, 6 * a * a, [a * a, 4 * a * a, a ** 3, 6 * a], { v, a });
}

/* ── 2. box ─ genBox() L322; Ch2Q1 L342, Ch2Q2 L354, Ch2Q3 L366; genBoxRatio() L383 / Ch2Q4 L391 */
// port of genBoxRatio() — src/topics/solids3d/Topic.jsx L383
function boxRatio(r) {
  const ratios = [[1, 2, 2], [1, 2, 3], [2, 3, 4], [1, 1, 2], [2, 2, 3], [1, 3, 4]];
  const [p, s, t] = pick(r, ratios);
  const kMax = Math.floor(12 / Math.max(p, s, t));
  const k = randInt(r, 2, Math.max(2, kMax));
  return { p, s, t, k, V: p * s * t * k ** 3 };
}
const kt = (n) => (n === 1 ? 'k' : `${n}k`);
export function box(r, want) {
  // (typed-only variants are drawn on typed slots only, so a duel stays mostly 4 choices)
  const v = pick(r, want === 'number' ? ['vol', 'surf', 'diag', 'ratio'] : ['vol', 'surf']);
  if (v === 'ratio') {
    const { p, s, t, k, V } = boxRatio(r);
    // mistakes: forgot the cube root (k³), k², V ÷ (p + q + r)
    const prompt = `נפח התיבה $V = ${V}$, ויחס המידות $l : w : h = ${p} : ${s} : ${t}$. מצאו את גורם הקנה-מידה $k$ (כך ש-$l = ${kt(p)}$, $w = ${kt(s)}$, $h = ${kt(t)}$). $k = ?$`;
    // typed only: k is a small number worked out from small printed numbers (as 4
    // choices "near / equal to a printed number" finds it, like powers' exponents)
    return q(r, 'number', prompt, k, [], { v, ratio: [p, s, t], V });
  }
  const { l, w, h, d } = pickQuad(r);
  const given = `$l = ${l}$, $w = ${w}$, $h = ${h}$`;
  if (v === 'vol') return q(r, want, `${given}. חשבו את נפח התיבה: $V = ?$`, l * w * h, [2 * (l * w + l * h + w * h), l + w + h, l * w + h], { v, l, w, h });
  if (v === 'surf') return q(r, want, `${given}. חשבו את שטח הפנים הכולל של התיבה: $S = ?$`,
    2 * (l * w + l * h + w * h), [l * w + l * h + w * h, l * w * h, 2 * (l * w + l * h)], { v, l, w, h });
  // space diagonal: mistakes — added the edges, forgot the root
  // typed only (Pythagoras: the diagonal is next to the longest edge)
  return q(r, 'number', `${given}. מצאו את האלכסון המרחבי של התיבה: $d = ?$`, d, [l + w + h, d * d], { v, l, w, h }, { extra: nearPrinted(l, w, h) });
}

/* ── 3. cylinder ─ genCylinder() L492; Ch3Q1 L511 (V = πr²h), Ch3Q2 L524 (S = 2πr² + 2πrh), Ch3Q3 L537 (h from V) */
export function cylinder(r, want) {
  const v = pick(r, ['vol', 'surf', 'height']);
  const rr = randInt(r, 2, 8), h = randInt(r, 2, 12);
  if (v === 'vol') return q(r, want, `$r = ${rr}$, $h = ${h}$. חשבו את נפח הגליל: $V = ?π$`, rr * rr * h, [2 * rr * h, rr * h, rr * h * h], { v, r: rr, h });
  if (v === 'surf') return q(r, want, `$r = ${rr}$, $h = ${h}$. חשבו את שטח הפנים הכולל של הגליל: $S = ?π$`,
    2 * rr * rr + 2 * rr * h, [rr * rr + rr * h, 2 * rr * h, rr * rr + 2 * rr * h, 2 * rr * rr * h], { v, r: rr, h });
  const V = rr * rr * h;
  // mistakes: forgot to square r, V − r²
  return q(r, want, `נפח הגליל $V = ${V}π$, ורדיוס הבסיס $r = ${rr}$. מצאו את גובה הגליל: $h = ?$`, h, [V / rr, V / (2 * rr), V - rr * rr], { v, V, r: rr });
}

/* ── 4. cone ─ genCone() L639; Ch4Q1 L659 (V = ⅓πr²h), Ch4Q2 L672 (S = πr² + πrl), Ch4Q3 L685 (l) */
export function cone(r, want) {
  // (typed-only variants are drawn on typed slots only, so a duel stays mostly 4 choices)
  const v = pick(r, want === 'number' ? ['vol', 'surf', 'slant'] : ['vol', 'surf']);
  const [rr, h, l] = pickTriple(r);
  if (v === 'vol') return q(r, want, `$r = ${rr}$, $h = ${h}$. חשבו את נפח החרוט: $V = ?π$`, (rr * rr * h) / 3, [rr * rr * h, rr * h, (rr * rr * h) / 2], { v, r: rr, h });
  if (v === 'surf') return q(r, want, `$r = ${rr}$, $l = ${l}$. חשבו את שטח הפנים הכולל של החרוט: $S = ?π$`,
    rr * rr + rr * l, [rr * l, rr * rr + 2 * rr * l, 2 * rr * rr + rr * l, rr * rr * l], { v, r: rr, l });
  // typed only (Pythagoras)
  return q(r, 'number', `$r = ${rr}$, $h = ${h}$. מצאו את הגובה האלכסוני של החרוט בעזרת פיתגורס: $l = ?$`, l, [rr + h, rr * rr + h * h], { v, r: rr, h }, { extra: nearPrinted(rr, h) });
}

/* ── 5. pyramid ─ PYR_TRIPLES L753 / pickPyr() L754; Ch5Q1Sq L841, Ch5Q1Tri L854, Ch5Q2Sq L868, Ch5Q3 L895, Ch5Q4Sq L911 */
const PYR_TRIPLES = [{ half: 3, h: 4, m: 5, b: 6 }, { half: 6, h: 8, m: 10, b: 12 }, { half: 5, h: 12, m: 13, b: 10 }];
export function pyramid(r, want) {
  // (typed-only variants are drawn on typed slots only, so a duel stays mostly 4 choices)
  const v = pick(r, want === 'number' ? ['volSq', 'volTri', 'surfSq', 'apothem', 'height'] : ['volSq', 'volTri', 'surfSq']);
  const { half, h, m, b } = pick(r, PYR_TRIPLES);
  if (v === 'volSq') return q(r, want, `בסיס מרובע: $b = ${b}$, גובה $h = ${h}$. חשבו את נפח הפירמידה: $V = ?$`,
    (b * b * h) / 3, [b * b * h, b * h, (b * b * h) / 2], { v, b, h });
  if (v === 'volTri') {
    const k = (b * b) / 4;
    return q(r, want, `בסיס משולש שווה-צלעות: $b = ${b}$, גובה הפירמידה $h = ${h}$, שטח הבסיס $= ${k}\\sqrt{3}$. חשבו את נפח הפירמידה: $V = ?\\sqrt{3}$`,
      (k * h) / 3, [k * h, (k * h) / 2, k + h], { v, b, h, k });
  }
  if (v === 'surfSq') return q(r, want, `בסיס מרובע: $b = ${b}$, אפותם $m = ${m}$. חשבו את שטח הפנים הכולל: $S = ?$`,
    b * b + 2 * b * m, [b * b + 4 * b * m, 2 * b * m, b * b + b * m], { v, b, m });
  // apothem and height: typed only (Pythagoras: next to a printed length, 3 triangles only)
  if (v === 'apothem') return q(r, 'number', `חצי-צלע הבסיס $= ${half}$, גובה הפירמידה $h = ${h}$. מצאו את האפותם (גובה הפאה הצדדית): $m = ?$`,
    m, [half + h, half * half + h * h], { v, half, h }, { extra: nearPrinted(half, h) });
  return q(r, 'number', `בסיס מרובע: $b = ${b}$, אפותם $m = ${m}$. מצאו את גובה הפירמידה: $h = ?$`,
    h, [m - half, m * m - half * half, m - b], { v, b, m }, { extra: nearPrinted(b, m) });
}

/* ── 6. sphere ─ genSphere() L1013; Ch6Q1 L1032 (V = ⁴⁄₃πr³), Ch6Q2 L1045 (S = 4πr²), Ch6Q3 L1058 (S → r → V) */
export function sphere(r, want) {
  const v = pick(r, ['vol', 'surf', 'radius', 'sToV']);
  // duel limits (mental arithmetic): r ≤ 6 — his 3 or 6 when the volume is involved
  // (⁴⁄₃r³ whole), 2–6 for the surface and the radius; S → V as choices only r = 6
  // (r = 3 gives V = S = 36π, the answer would be printed)
  const rr = v === 'surf' || v === 'radius' ? randInt(r, 2, 6) : v === 'sToV' && want !== 'number' ? 6 : pick(r, [3, 6]);
  const S = 4 * rr * rr, V = (4 / 3) * rr ** 3;
  if (v === 'vol') return q(r, want, `$r = ${rr}$. חשבו את נפח הכדור: $V = ?π$`, V, [4 * rr ** 3, S, rr ** 3, (4 / 3) * rr * rr], { v, r: rr });
  if (v === 'surf') return q(r, want, `$r = ${rr}$. חשבו את שטח הפנים של הכדור: $S = ?π$`, S, [4 * rr, rr * rr, 2 * rr * rr, V], { v, r: rr });
  if (v === 'radius') return q(r, want, `שטח הפנים של הכדור: $S = ${S}π$. מצאו את הרדיוס: $r = ?$`, rr, [rr * rr, S / 2, 2 * rr], { v, S });
  return q(r, want, `שטח הפנים של הכדור: $S = ${S}π$. מצאו את נפח הכדור: $V = ?π$`, V, [S, rr ** 3, 4 * rr ** 3], { v, S });
}
