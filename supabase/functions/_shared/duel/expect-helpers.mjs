// Shared readers for the independent duel checks (expect-*.mjs). Read-only for topic work:
// a group that needs a new reader adds it in its own expect-<group>.mjs.
import assert from 'node:assert/strict';
import { evalMath, linSide, close } from './testkit.mjs';

export const num = (s) => Number(String(s).replace(/−/g, '-'));
export const maths = (p) => [...p.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]);
/** "name = value" pairs written in the prompt's math: a = 7, d₁ = 18, θ = 60°, S = 49π */
export function given(q) {
  const out = {};
  for (const m of maths(q.prompt)) for (const x of m.matchAll(/([A-Za-zθ₁₂]+)\s*=\s*(−?\d+(?:\.\d+)?)/g)) out[x[1]] = num(x[2]);
  return out;
}
/** every number printed in the prompt, in order */
export const printed = (q) => (q.prompt.match(/−?\d+(\.\d+)?/g) || []).map(num);
/** the number written just before "π" in the prompt's math (kπ), in order */
export const piNums = (q) => maths(q.prompt).flatMap((m) => [...m.matchAll(/(\d+)π/g)].map((x) => num(x[1])));
export const angleOk = (a) => a > 0 && a < 180;
export const ints = (...xs) => xs.forEach((x) => assert.ok(Number.isInteger(x), 'not whole: ' + x));

// a linear side with y, x and constants: "−y + 3x − 2" → {y, x, c}
export function lin3(side) {
  const s = side.replace(/\s+/g, '').replace(/−/g, '-');
  const o = { y: 0, x: 0, c: 0 };
  for (const m of s.matchAll(/([+-]?)(\d*)([xy]?)/g)) {
    if (!m[0]) continue;
    const k = (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
    if (m[3]) o[m[3]] += k; else if (m[2] !== '') o.c += k;
  }
  return o;
}
// a quadratic side: "3x^{2} − 2x + 5" → [x², x, const]
export function quadSide(side) {
  const s = side.replace(/\s+/g, '').replace(/−/g, '-').replace(/x\^\{2\}/g, 'Q');
  const o = [0, 0, 0];
  for (const m of s.matchAll(/([+-]?)(\d*)([Qx]?)/g)) {
    if (!m[0]) continue;
    const k = (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
    if (m[3] === 'Q') o[0] += k; else if (m[3] === 'x') o[1] += k; else if (m[2] !== '') o[2] += k;
  }
  return o;
}
// "y = 3x − 2" → [m, b] (own reading, via linSide)
export const lineOf = (t) => { const [L, R] = t.split('='); assert.equal(L.trim(), 'y', t); return linSide(R); };
// the points "(x, y)" printed in the prompt
export const points = (q) => [...q.prompt.matchAll(/\((−?\d+), (−?\d+)\)/g)].map((m) => [num(m[1]), num(m[2])]);
// the equation in the prompt's first $…$ holds at x = v (own evaluator), and not at v + 1 (one solution)
export function solves(q, v) {
  const [L, R] = maths(q.prompt)[0].split('=');
  const f = (x) => evalMath(L, { x }) - evalMath(R, { x });
  assert.ok(close(f(v), 0), `x = ${v} does not solve ${q.prompt}`);
  const u = f(v + 0.37); // never a pole (poles are whole numbers)
  assert.ok(Number.isFinite(u) && !close(u, 0), 'more than one solution: ' + q.prompt);
}
