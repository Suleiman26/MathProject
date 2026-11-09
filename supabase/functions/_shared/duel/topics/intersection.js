// Intersection points (grade 9, fn) — ported from Sulaiman's
// src/topics/intersection/Topic.jsx (never edited). Chapter 1 (line–line)
// only; chapter 2 (line–parabola) is a poor fit (audit: C).
// The meeting point has two numbers: ONE is asked at a time (meta.ask).
// Duel limit: his 20% parallel / identical lines (no single point) are not
// asked.
import { pick } from '../rng.js';
import { numberQuestion } from '../choices.js';
import { lineText } from './linear-function.js';

// port of randInt() — src/topics/intersection/Topic.jsx (Math.random → r)
const randInt = (r, a, b) => a + Math.floor(r() * (b - a + 1));

// port of genLL() — src/topics/intersection/Topic.jsx L365 (the 'normal' case)
function genLL(r, want) {
  let x0, y0;
  do { x0 = randInt(r, -5, 5); y0 = randInt(r, -5, 5); } while (want !== 'number' && x0 === 0 && y0 === 0);
  let m1, m2;
  do { m1 = randInt(r, -3, 3); } while (m1 === 0);
  do { m2 = randInt(r, -3, 3); } while (m2 === 0 || m2 === m1);
  return { m1, b1: y0 - m1 * x0, m2, b2: y0 - m2 * x0, x: x0, y: y0 };
}

export function lineLine(r, want) {
  const { m1, b1, m2, b2, x, y } = genLL(r, want);
  // duel limit (choices): a 0 is not asked (it would always be the choice closest to zero)
  let ask = pick(r, ['xval', 'yval']);
  if (want !== 'number' && (ask === 'xval' ? x : y) === 0) ask = ask === 'xval' ? 'yval' : 'xval';
  const head = `מצאו את נקודת החיתוך של הישרים $${lineText(m1, b1)}$ ו-$${lineText(m2, b2)}$ (בנקודת החיתוך ערכי $y$ שווים).`;
  const isInt = Number.isInteger;
  if (ask === 'xval') {
    // mistakes: a term moved without changing its sign, the y of the point, −x
    const wrongs = [(b2 + b1) / (m1 - m2), (b1 - b2) / (m1 - m2), (b2 - b1) / (m1 + m2), y, -x].filter((w) => isInt(w) && w !== x);
    return numberQuestion(r, want, `${head} מה ערך ה-$x$ שלה?`, x, wrongs, { m1, b1, m2, b2, ask }, { signed: true });
  }
  // y: mistakes — the x of the point, the sign, put x into the wrong place
  const wrongs = [x, -y, b1, b2, m1 * x - b1, m2 * x - b2, b1 + b2].filter((w) => isInt(w) && w !== y);
  return numberQuestion(r, want, `${head} מה ערך ה-$y$ שלה?`, y, wrongs, { m1, b1, m2, b2, ask }, { signed: true });
}
