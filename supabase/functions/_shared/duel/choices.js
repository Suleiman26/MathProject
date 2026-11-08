// Four answer choices + small display helpers shared by the topic ports.
import { shuffle } from './rng.js';

/** A number for display: real minus sign "−" (U+2212). */
export function fmt(n) {
  return n < 0 ? '−' + String(-n) : String(n);
}

/** A number in brackets with its sign, like Sulaiman's fmtS: (+3), (−3). */
export function fmtS(n) {
  return n < 0 ? '(' + fmt(n) + ')' : '(+' + n + ')';
}

/** A number inside an expression: negatives after an operator get brackets. */
export function fmtIn(n) {
  return n < 0 ? '(' + fmt(n) + ')' : String(n);
}

const norm = (s) => String(s).replace(/-/g, '−').trim();

// near values for a numeric text: ±1, ±2, … in its last decimal place;
// keeps the sign of a non-negative answer (no "−2 children")
function nearNumbers(correct) {
  const s = correct.replace(/−/g, '-');
  const v = Number(s);
  const dec = (s.split('.')[1] || '').length;
  const step = Math.pow(10, -dec);
  const out = [];
  for (let k = 1; out.length < 12 && k < 40; k++) {
    for (const d of [k, -k]) {
      const n = Number((v + d * step).toFixed(dec));
      if (v >= 0 && n < 0) continue;
      out.push(fmt(n));
    }
  }
  return out;
}

// near values for a text with numbers in it ("2 : 3", "3\sqrt{2}"):
// change its first number by ±1, ±2, …
function nearTexts(correct) {
  const m = correct.match(/\d+/);
  if (!m) return [];
  const n = Number(m[0]);
  const out = [];
  for (let k = 1; out.length < 12 && k < 40; k++) {
    for (const d of [k, -k]) {
      if (n + d < 1) continue;
      out.push(correct.slice(0, m.index) + (n + d) + correct.slice(m.index + m[0].length));
    }
  }
  return out;
}

/**
 * makeChoices(r, correct, wrongs) → { choices: string[4], answer: "0".."3" }
 * Dedupes (also "-" vs "−"), drops wrongs equal to the correct one, fills up
 * to 3 wrongs with near values, then shuffles.
 */
export function makeChoices(r, correct, wrongs) {
  const right = norm(correct);
  const seen = new Set([right]);
  const picked = [];
  const add = (w) => {
    if (picked.length >= 3 || w === undefined || w === null) return;
    const t = norm(w);
    if (!t || seen.has(t) || /NaN|undefined|Infinity/.test(t)) return;
    seen.add(t); picked.push(t);
  };
  wrongs.forEach(add);
  if (picked.length < 3) {
    const numeric = /^−?\d+(\.\d+)?$/.test(right);
    (numeric ? nearNumbers(right) : nearTexts(right)).forEach(add);
  }
  if (picked.length < 3) throw new Error('makeChoices: cannot make 4 choices for ' + correct);
  const choices = shuffle(r, [right, ...picked]);
  return { choices, answer: String(choices.indexOf(right)) };
}

/**
 * A question whose answer is a number: a 'number' question when asked for
 * (want === 'number'), otherwise 4 choices built from the typical mistakes.
 * Number answers are canonical ASCII text ("-3", "0.375").
 */
export function numberQuestion(r, want, prompt, correct, wrongs, meta) {
  if (want === 'number') return { kind: 'number', prompt, answer: String(correct), meta };
  return { kind: 'choice', prompt, ...makeChoices(r, fmt(correct), wrongs.map(fmt)), meta };
}

/** A question whose answer is math text (fraction, ratio, expression): always 4 choices. */
export function choiceQuestion(r, prompt, correct, wrongs, meta) {
  return { kind: 'choice', prompt, ...makeChoices(r, correct, wrongs), meta };
}
