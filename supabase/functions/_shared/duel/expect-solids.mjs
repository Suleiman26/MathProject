// Independent checks for the solids + circle duel generators (see expect-2b.mjs for the rules).
import assert from 'node:assert/strict';
import { evalMath, mathOf, linSide, close } from './testkit.mjs';
import { num, maths, given, printed, piNums, angleOk, ints, lin3, quadSide, lineOf, points, solves } from './expect-helpers.mjs';

export const EXPECT_SOLIDS = {
  /* ── solids ── */
  'so.cube': (m, q) => { const { a } = given(q); return { value: m.v === 'vol' ? a * a * a : 6 * a * a }; },
  'so.box': (m, q) => {
    const G = given(q);
    if (m.v === 'ratio') { const [p, s, t] = m.ratio; const k = Math.cbrt(G.V / (p * s * t)); assert.ok(close(k, Math.round(k))); return { value: Math.round(k) }; }
    const { l, w, h } = G;
    if (m.v === 'vol') return { value: l * w * h };
    if (m.v === 'surf') return { value: 2 * l * w + 2 * l * h + 2 * w * h };
    return { value: Math.sqrt(l * l + w * w + h * h) };
  },
  'so.cyl': (m, q) => {
    const G = given(q);
    if (m.v === 'vol') return { value: G.r * G.r * G.h };
    if (m.v === 'surf') return { value: 2 * G.r * G.r + 2 * G.r * G.h };
    return { value: G.V / (G.r * G.r) };
  },
  'so.cone': (m, q) => {
    const G = given(q);
    if (m.v === 'vol') return { value: G.r * G.r * G.h / 3 };
    if (m.v === 'surf') return { value: G.r * G.r + G.r * G.l };
    return { value: Math.hypot(G.r, G.h) };
  },
  'so.pyr': (m, q) => {
    const G = given(q);
    if (m.v === 'volSq') return { value: G.b * G.b * G.h / 3 };
    if (m.v === 'volTri') return { value: (Math.sqrt(3) / 4) * G.b * G.b * G.h / 3 / Math.sqrt(3) };
    if (m.v === 'surfSq') return { value: G.b * G.b + 4 * (G.b * G.m / 2) };
    if (m.v === 'apothem') { const half = printed(q)[0]; return { value: Math.hypot(half, G.h) }; }
    return { value: Math.sqrt(G.m * G.m - (G.b / 2) ** 2) };
  },
  'so.sphere': (m, q) => {
    const G = given(q);
    const r = m.v === 'vol' || m.v === 'surf' ? G.r : Math.sqrt(G.S / 4);
    if (m.v === 'vol' || m.v === 'sToV') return { value: 4 * r ** 3 / 3 };
    if (m.v === 'surf') return { value: 4 * r * r };
    return { value: r };
  },
  /* ── circle ── */
  'ci.rad': (m, q) => {
    const G = given(q);
    if (m.v === 'fracToDeg') { const [n, d] = printed(q); return { value: 360 * n / d }; }
    if (m.v === 'thetaArc') { const [r, L] = printed(q); return { value: L / r }; }
    if (m.v === 'radToDeg') return { value: evalMath(maths(q.prompt)[0]) * 180 / Math.PI };
    if (m.v === 'arcRad') return { value: G.r * evalMath(maths(q.prompt)[1].replace(/^θ =/, '')) / Math.PI };
    const deg = printed(q)[0]; return { value: deg * Math.PI / 180 }; // degToRad: the choice is a π-fraction
  },
  'ci.circ': (m, q) => {
    if (m.v === 'calc') return { value: 2 * given(q).r };
    if (m.v === 'findR') return { value: piNums(q)[0] / 2 };
    // numerical, π ≈ 3.14: his check accepts within 0.1 of 2 · 3.14 · r
    const exact = 2 * 3.14 * given(q).r;
    if (q.kind === 'number') { assert.equal(q.tol, 0.1); assert.ok(Math.abs(Number(q.answer) - exact) <= 0.1); return { value: Number(q.answer) }; }
    return { value: exact };
  },
  'ci.area': (m, q) => {
    const G = given(q);
    if (m.v === 'calc') return { value: G.r * G.r };
    if (m.v === 'findR') return { value: Math.sqrt(piNums(q)[0]) };
    assert.ok(G.θ > 0 && G.θ <= 180);
    return { value: (G.θ / 360) * G.r * G.r };
  },
  'ci.arc': (m, q) => {
    const G = given(q);
    if (m.v === 'arcLen') return { value: (G.θ / 360) * 2 * G.r };
    const L = piNums(q)[0] ?? 1; // "אורך הקשת הוא π" when the coefficient is 1
    return { value: (L / (2 * G.r)) * 360 };
  },
  'ci.mix': (m, q) => {
    const G = given(q);
    if (m.v === 'circToArea') return { value: (piNums(q)[0] / 2) ** 2 };
    if (m.v === 'sectorToR') { const S = piNums(q)[0]; return { value: Math.sqrt(S * 360 / G.θ) }; }
    return { value: G.R * G.R - G.r * G.r };
  },
};
