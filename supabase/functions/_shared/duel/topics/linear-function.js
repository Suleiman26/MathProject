// Linear function (grade 8, fn) — ported from Sulaiman's
// src/topics/linear-function/Topic.jsx (never edited). His generators sit
// inside the chapter components (genQ); they are copied here as functions.
// Ported: ch4 (slope from 2 points), ch6 (m and b from y = mx + b),
// ch7 (rearrange, then m and b), ch8 (b from m and a point),
// ch9 (m or b from 2 points). Ch0/3/5 have no exercise; ch1/2 need the grid.
// Two-part answers (m AND b) are asked ONE slot at a time (meta.ask).
// Duel limits for 4 choices (typed keeps his full range):
//   • ch6/ch7: m = ±1, b = 0 and |m| = |b| are typed only (the answer would
//     be the only number not printed, or two choices would read the same);
//     ch7's "2y = 2mx + 2b" form is typed only (the answer is never printed);
//   • ch8: a point on the y-axis (x = 0, so b is printed) is typed only.
import { pick } from '../rng.js';
import { fmt, numberQuestion, notNearest } from '../choices.js';

const SIGNED = { signed: true };
// port of rnd() / rndNonZero() — src/topics/linear-function/Topic.jsx L101–102
const rnd = (r, a, b) => Math.floor(r() * (b - a + 1)) + a;
const rndNonZero = (r, a, b) => { let v; do { v = rnd(r, a, b); } while (v === 0); return v; };
const GRID_MIN = -8, GRID_MAX = 8; // L13

const isInt = (w) => Number.isInteger(w);
const pt = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
// Prompt wording (style guide docs/superpowers/specs/2026-11-10-duel-questions-style.md):
// words on line 1, formulas on their own lines, never "ו-$…$". Two points share ONE
// formula island "$A(−4, 3)   B(0, −3)$" (one left-to-right island, so A reads first;
// two islands on an RTL line would show B before A).
const twoPts = (x1, y1, x2, y2) => `$A${pt(x1, y1)}   B${pt(x2, y2)}$`;
const ASK_SLOPE = 'מהו השיפוע של הישר?';
const ASK_ICPT = 'מהי נקודת החיתוך של הישר עם ציר $y$?';

// y = mx + b as text (his eqStr L904, with the real minus): y = 3x − 2, y = −x + 4, y = 2x
export function lineText(m, b) {
  const mPart = m === 1 ? 'x' : m === -1 ? '−x' : `${fmt(m)}x`;
  let s = `y = ${mPart}`;
  if (b > 0) s += ` + ${b}`; else if (b < 0) s += ` − ${-b}`;
  return s;
}

/* ── 4. slope from two points ─ port of Chapter3.genQ() L563 ──────── */
function genSlope(r) {
  for (;;) {
    const x1 = rnd(r, -5, 2), x2 = x1 + rnd(r, 1, 4);
    const mNum = rndNonZero(r, -4, 4);
    const mDen = r() < 0.4 ? 2 : 1;
    const y1 = rnd(r, -4, 4);
    const dy = mNum * (x2 - x1);
    if (dy % mDen !== 0) continue;
    const y2 = y1 + dy / mDen;
    if (y2 < GRID_MIN || y2 > GRID_MAX) continue;
    return { x1, y1, x2, y2, m: mNum / mDen };
  }
}
export function slope(r, want) {
  const { x1, y1, x2, y2, m } = genSlope(r);
  const dy = y2 - y1, dx = x2 - x1;
  // mistakes: Δx ÷ Δy, the sign, forgot to divide (Δy), y₂ + y₁ over x₂ + x₁ — whole or halves only
  const half = (w) => Number.isFinite(w) && isInt(w * 2) && Math.abs(w) <= 12;
  const wrongs = [dx / dy, -m, dy, dx, (y2 + y1) / (x2 + x1)].filter(half);
  // halves near the answer instead of ×10 / ÷10 decoys
  const extra = [m + 0.5, m - 0.5, m + 1, m - 1, m + 1.5, m - 1.5, m + 2, m - 2, -m - 1, -m + 1, y1, y2, x2].filter((w) => w !== 0).map(fmt);
  const prompt = `מהו השיפוע של הישר שעובר דרך שתי הנקודות?\n${twoPts(x1, y1, x2, y2)}\n$m = ?$`;
  // the slope is small, like the coordinates: some wrong choice is at least as close to a
  // printed number as the answer ("the choice nearest a number in the question" can't find it)
  const opts = { ...SIGNED, decoys: false, extra: [...extra, ...[x1, dx].filter((w) => w !== 0).map(fmt)] };
  try {
    return numberQuestion(r, want, prompt, m, wrongs, { x1, y1, x2, y2 }, { ...opts, must: notNearest(prompt, m) });
  } catch { // no set can follow the rule (rare): the plain balanced choices
    return numberQuestion(r, want, prompt, m, wrongs, { x1, y1, x2, y2 }, opts);
  }
}

/* ── 6. m and b from y = mx + b ─ port of genQ() L911 ─────────────── */
export function readLine(r, want) {
  let m, b;
  // duel limit (choices): no m = ±1, no b = 0, |m| ≠ |b|
  do { m = rndNonZero(r, -5, 5); b = rnd(r, -6, 6); } while (want !== 'number' && (Math.abs(m) === 1 || b === 0 || Math.abs(m) === Math.abs(b)));
  const ask = b === 0 ? 'slope' : pick(r, ['slope', 'icpt']);
  const ans = ask === 'slope' ? m : b, other = ask === 'slope' ? b : m;
  const prompt = ask === 'slope' ? `${ASK_SLOPE}\n$${lineText(m, b)}$` : `${ASK_ICPT}\n$${lineText(m, b)}$\n$b = ?$`;
  // mistakes: the sign, the other number (m ↔ b), both
  // all four are numbers printed in the equation (with either sign): no decoys,
  // so "a number from the question" can't single out the answer
  return numberQuestion(r, want, prompt, ans, [-ans, other, -other], { m, b, ask }, { ...SIGNED, decoys: false });
}

/* ── 7. rearrange, then m and b ─ port of ChapterRearrangeIdEq.genQ() L952 ── */
// the five starting forms (his variantBuilders), as text
function sideText(terms) {
  const t = terms.filter(([, c]) => c !== 0);
  if (!t.length) return '0';
  return t.map(([v, c], i) => {
    const abs = Math.abs(c);
    const sign = c < 0 ? (i === 0 ? '−' : ' − ') : (i === 0 ? '' : ' + ');
    return `${sign}${v === '' ? abs : (abs === 1 ? '' : abs) + v}`;
  }).join('');
}
const FORMS = [
  (m, b) => [[['y', 1], ['x', -m]], [['', b]]], // y − mx = b
  (m, b) => [[['x', -m], ['y', 1]], [['', b]]], // −mx + y = b
  (m, b) => [[['y', 1]], [['', b], ['x', m]]], // y = b + mx
  (m, b) => [[['y', -1]], [['x', -m], ['', -b]]], // −y = −mx − b
  (m, b) => [[['y', 2]], [['x', 2 * m], ['', 2 * b]]], // 2y = 2mx + 2b
];
export function rearrange(r, want) {
  let m, b;
  do { m = rndNonZero(r, -5, 5); b = rnd(r, -6, 6); } while (want !== 'number' && (Math.abs(m) === 1 || b === 0 || Math.abs(m) === Math.abs(b)));
  const form = rnd(r, 0, want === 'number' ? 4 : 3); // 2y = … only typed
  const [L, R] = FORMS[form](m, b);
  const ask = b === 0 ? 'slope' : pick(r, ['slope', 'icpt']);
  const ans = ask === 'slope' ? m : b, other = ask === 'slope' ? b : m;
  const eq = `$${sideText(L)} = ${sideText(R)}$`;
  const prompt = ask === 'slope' ? `${ASK_SLOPE}\n${eq}` : `${ASK_ICPT}\n${eq}\n$b = ?$`;
  // mistakes: sign not changed when moving a term, the other number (and its sign), forgot ÷ 2
  const wrongs = [-ans, other, -other, form === 4 ? 2 * ans : NaN];
  return numberQuestion(r, want, prompt,
    ans, wrongs, { m, b, ask, form }, { ...SIGNED, decoys: false }); // as in ch6: the printed numbers with both signs
}

/* ── 8. b from m and a point ─ port of Chapter5.genQ() L1083 ──────── */
export function slopePoint(r, want) {
  let m, b, px, py;
  for (;;) {
    m = rndNonZero(r, -4, 4); b = rnd(r, -5, 5); px = rnd(r, -4, 4); py = m * px + b;
    if (py < GRID_MIN + 1 || py > GRID_MAX - 1) continue;
    if (want !== 'number' && (px === 0 || b === 0)) continue; // duel limit: b printed / 0 always closest to zero
    break;
  }
  // mistakes: sign of m·x, forgot x (y − m), m·x − y, y − x
  return numberQuestion(r, want, `ישר עם שיפוע $m = ${fmt(m)}$ עובר דרך הנקודה $${pt(px, py)}$.\nמהי נקודת החיתוך שלו עם ציר $y$?\n$b = ?$`,
    b, [py + m * px, py - m, m * px - py, py - px], { m, px, py }, SIGNED);
}

/* ── 9. line through two points ─ port of Chapter6.genQ() L1162 ───── */
export function twoPoints(r, want) {
  let m, b, x1, x2, y1, y2;
  for (;;) {
    m = rndNonZero(r, -4, 4); b = rnd(r, -5, 5); x1 = rnd(r, -5, -1); x2 = rnd(r, 1, 5);
    y1 = m * x1 + b; y2 = m * x2 + b;
    if (y1 < GRID_MIN + 1 || y1 > GRID_MAX - 1 || y2 < GRID_MIN + 1 || y2 > GRID_MAX - 1) continue;
    break;
  }
  // duel limits (choices): b = 0 is not asked, nor m = ±1 (always the choice closest to zero)
  let ask = pick(r, ['slope', 'icpt']);
  if (want !== 'number') { if (ask === 'icpt' && b === 0) ask = 'slope'; if (ask === 'slope' && Math.abs(m) === 1) ask = 'icpt'; }
  if (want !== 'number' && ask === 'icpt' && b === 0) return twoPoints(r, want);
  const pts = twoPts(x1, y1, x2, y2);
  if (ask === 'slope') {
    // mistakes: Δx ÷ Δy, the sign, forgot to divide
    return numberQuestion(r, want, `מהו השיפוע של הישר שעובר דרך שתי הנקודות?\n${pts}\n$m = ?$`, m,
      [(x2 - x1) / (y2 - y1), -m, y2 - y1].filter(isInt), { x1, y1, x2, y2, ask }, { ...SIGNED, extra: ['0', '1', '−1', '2', '−2'] });
  }
  // b: mistakes — sign of m·x, y₁ − m, the slope itself, −b
  return numberQuestion(r, want, `ישר עובר דרך שתי הנקודות. מהי נקודת החיתוך שלו עם ציר $y$?\n${pts}\n$b = ?$`, b,
    [y1 + m * x1, y1 - m, m, -b, y2 + m * x2], { x1, y1, x2, y2, ask }, SIGNED);
}
