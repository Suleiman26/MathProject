// 3D solids (grade 7, geo) — ported from Sulaiman's
// src/topics/solids3d/Topic.jsx (never edited). His answers are computed
// inside the Ch*Q* components; the formulas are copied from there.
// π answers are asked as the coefficient of π, so they stay whole numbers:
// the question carries display.unit 'π', so every choice shows as "196π" and the
// typing box as "? π" (a typed prompt also ends with a "$V = ?π$" line); √3 answers
// likewise ("V = ?√3", no unit exists for √3).
// Wording (2026-11-10, docs/superpowers/specs/2026-11-10-duel-questions-style.md):
// everything named in words ("גליל עם רדיוס $7$ וגובה $4$"), no bare symbols,
// formulas on their own lines. The independent checks (expect-solids.mjs) read
// these words back — change a phrase here and there together.
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

// π answers: the phone adds "π" to every choice and to the typing box (display.unit).
// A choice question ends with the words; a typed one adds a formula line "$V = ?π$".
const PI = (qq) => ({ ...qq, display: { unit: 'π' } });
const askPi = (want, sym) => (want === 'number' ? `\n$${sym} = ?π$` : '');


/* ── 1. cube ─ genCube() L182; Ch1Q1 L203 (V = a³), Ch1Q2 L214 (S = 6a²) */
export function cube(r, want) {
  const v = pick(r, ['vol', 'surf']);
  const a = randInt(r, 2, 10); // duel limit (his 2–12)
  if (v === 'vol') return q(r, want, `מה הנפח של קובייה שצלעה $${a}$?`, a ** 3, [3 * a, a * a, 6 * a * a], { v, a });
  return q(r, want, `מה שטח הפנים הכולל של קובייה שצלעה $${a}$?`, 6 * a * a, [a * a, 4 * a * a, a ** 3, 6 * a], { v, a });
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
    // (his "l : w : h = 2 : 2 : 3, find the scale factor k" — said as the three edges in k)
    const prompt = `נפח התיבה הוא $${V}$. האורך, הרוחב והגובה שלה הם:\n$${kt(p)}, ${kt(s)}, ${kt(t)}$\n$k = ?$`;
    // typed only: k is a small number worked out from small printed numbers (as 4
    // choices "near / equal to a printed number" finds it, like powers' exponents)
    return q(r, 'number', prompt, k, [], { v, ratio: [p, s, t], V });
  }
  const { l, w, h, d } = pickQuad(r);
  const given = `תיבה באורך $${l}$, ברוחב $${w}$ ובגובה $${h}$`;
  if (v === 'vol') return q(r, want, `מה הנפח של ${given}?`, l * w * h, [2 * (l * w + l * h + w * h), l + w + h, l * w + h], { v, l, w, h });
  if (v === 'surf') return q(r, want, `מה שטח הפנים הכולל של ${given}?`,
    2 * (l * w + l * h + w * h), [l * w + l * h + w * h, l * w * h, 2 * (l * w + l * h)], { v, l, w, h });
  // space diagonal: mistakes — added the edges, forgot the root
  // typed only (Pythagoras: the diagonal is next to the longest edge)
  return q(r, 'number', `מה אורך האלכסון המרחבי של ${given}?`, d, [l + w + h, d * d], { v, l, w, h }, { extra: nearPrinted(l, w, h) });
}

/* ── 3. cylinder ─ genCylinder() L492; Ch3Q1 L511 (V = πr²h), Ch3Q2 L524 (S = 2πr² + 2πrh), Ch3Q3 L537 (h from V) */
export function cylinder(r, want) {
  const v = pick(r, ['vol', 'surf', 'height']);
  const rr = randInt(r, 2, 8), h = randInt(r, 2, 12);
  const given = `גליל עם רדיוס $${rr}$ וגובה $${h}$`;
  if (v === 'vol') return PI(q(r, want, `מה הנפח של ${given}?${askPi(want, 'V')}`, rr * rr * h, [2 * rr * h, rr * h, rr * h * h], { v, r: rr, h }));
  if (v === 'surf') return PI(q(r, want, `מה שטח הפנים הכולל של ${given}?${askPi(want, 'S')}`,
    2 * rr * rr + 2 * rr * h, [rr * rr + rr * h, 2 * rr * h, rr * rr + 2 * rr * h, 2 * rr * rr * h], { v, r: rr, h }));
  const V = rr * rr * h;
  // mistakes: forgot to square r, V − r²
  return q(r, want, `מה הגובה של גליל שנפחו $${V}π$ ורדיוס הבסיס שלו $${rr}$?`, h, [V / rr, V / (2 * rr), V - rr * rr], { v, V, r: rr });
}

/* ── 4. cone ─ genCone() L639; Ch4Q1 L659 (V = ⅓πr²h), Ch4Q2 L672 (S = πr² + πrl), Ch4Q3 L685 (l) */
// (his name for the slant height l: "גובה אלכסוני", Topic.jsx L610)
export function cone(r, want) {
  // (typed-only variants are drawn on typed slots only, so a duel stays mostly 4 choices)
  const v = pick(r, want === 'number' ? ['vol', 'surf', 'slant'] : ['vol', 'surf']);
  const [rr, h, l] = pickTriple(r);
  if (v === 'vol') return PI(q(r, want, `מה הנפח של חרוט עם רדיוס $${rr}$ וגובה $${h}$?${askPi(want, 'V')}`, (rr * rr * h) / 3, [rr * rr * h, rr * h, (rr * rr * h) / 2], { v, r: rr, h }));
  if (v === 'surf') return PI(q(r, want, `מה שטח הפנים הכולל של חרוט עם רדיוס $${rr}$ וגובה אלכסוני $${l}$?${askPi(want, 'S')}`,
    rr * rr + rr * l, [rr * l, rr * rr + 2 * rr * l, 2 * rr * rr + rr * l, rr * rr * l], { v, r: rr, l }));
  // typed only (Pythagoras)
  return q(r, 'number', `מה הגובה האלכסוני של חרוט עם רדיוס $${rr}$ וגובה $${h}$?`, l, [rr + h, rr * rr + h * h], { v, r: rr, h }, { extra: nearPrinted(rr, h) });
}

/* ── 5. pyramid ─ PYR_TRIPLES L753 / pickPyr() L754; Ch5Q1Sq L841, Ch5Q1Tri L854, Ch5Q2Sq L868, Ch5Q3 L895, Ch5Q4Sq L911 */
// (his "אפותם m" is said as "גובה הפאה הצדדית", the words he explains it with, L759)
const PYR_TRIPLES = [{ half: 3, h: 4, m: 5, b: 6 }, { half: 6, h: 8, m: 10, b: 12 }, { half: 5, h: 12, m: 13, b: 10 }];
export function pyramid(r, want) {
  // (typed-only variants are drawn on typed slots only, so a duel stays mostly 4 choices)
  const v = pick(r, want === 'number' ? ['volSq', 'volTri', 'surfSq', 'apothem', 'height'] : ['volSq', 'volTri', 'surfSq']);
  const { half, h, m, b } = pick(r, PYR_TRIPLES);
  if (v === 'volSq') return q(r, want, `מה הנפח של פירמידה עם בסיס ריבועי שצלעו $${b}$ וגובה $${h}$?`,
    (b * b * h) / 3, [b * b * h, b * h, (b * b * h) / 2], { v, b, h });
  if (v === 'volTri') {
    // his question prints the side b too; the duel gives only what the sum needs:
    // the base area k√3 (k = b²/4) and the height — the answer is the number before √3
    const k = (b * b) / 4;
    // √3 is shown like π: choices read "100√3"; a typed one keeps the "$V = ?√3$" line
    const ask = want === 'number' ? '\n$V = ?\\sqrt{3}$' : '';
    return { ...q(r, want, `מה הנפח של פירמידה עם גובה $${h}$ ושטח בסיס $${k}\\sqrt{3}$?${ask}`,
      (k * h) / 3, [k * h, (k * h) / 2, k + h], { v, b, h, k }), display: { unit: '√3' } };
  }
  if (v === 'surfSq') return q(r, want, `פירמידה עם בסיס ריבועי שצלעו $${b}$ וגובה הפאה הצדדית $${m}$.\nמה שטח הפנים הכולל שלה?`,
    b * b + 2 * b * m, [b * b + 4 * b * m, 2 * b * m, b * b + b * m], { v, b, m });
  // apothem and height: typed only (Pythagoras: next to a printed length, 3 triangles only)
  if (v === 'apothem') return q(r, 'number', `פירמידה עם בסיס ריבועי: חצי צלע הבסיס $${half}$, גובה הפירמידה $${h}$.\nמה גובה הפאה הצדדית?`,
    m, [half + h, half * half + h * h], { v, half, h }, { extra: nearPrinted(half, h) });
  return q(r, 'number', `פירמידה עם בסיס ריבועי שצלעו $${b}$ וגובה הפאה הצדדית $${m}$.\nמה גובה הפירמידה?`,
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
  if (v === 'vol') return PI(q(r, want, `מה הנפח של כדור עם רדיוס $${rr}$?${askPi(want, 'V')}`, V, [4 * rr ** 3, S, rr ** 3, (4 / 3) * rr * rr], { v, r: rr }));
  if (v === 'surf') return PI(q(r, want, `מה שטח הפנים של כדור עם רדיוס $${rr}$?${askPi(want, 'S')}`, S, [4 * rr, rr * rr, 2 * rr * rr, V], { v, r: rr }));
  if (v === 'radius') return q(r, want, `מה הרדיוס של כדור ששטח הפנים שלו $${S}π$?`, rr, [rr * rr, S / 2, 2 * rr], { v, S });
  return PI(q(r, want, `מה הנפח של כדור ששטח הפנים שלו $${S}π$?${askPi(want, 'V')}`, V, [S, rr ** 3, 4 * rr ** 3], { v, S }));
}
