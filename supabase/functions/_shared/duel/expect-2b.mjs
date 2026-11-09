// Independent checks for the Task-2b generators (geometry, functions, more
// algebra). Used by duel-geo / duel-solids / duel-fnalg .test.mjs (and the
// registry test in duel.test.mjs). Not a test file itself.
// Each EXPECT_2B[id](meta, q) recomputes the right answer from the NUMBERS
// PRINTED IN THE PROMPT (read back with the test's own parsers) — or from
// q.meta where the prompt has no name for a number — with the formula
// written here, not copied from the port. It also asserts the audit's
// filters: every angle of a triangle / quadrilateral is > 0° and < 180°,
// angles add up (180° / 360°), trapezoid A + B = 180°, kite R = L.
import assert from 'node:assert/strict';
import { evalMath, mathOf, linSide, close } from './testkit.mjs';

// which test file checks which topics (the files run in parallel)
export const TOPICS_2B = {
  geo: ['quadrilaterals', 'triangles'], // duel-geo.test.mjs
  solids: ['solids3d', 'circle'], // duel-solids.test.mjs
  fnalg: ['linear-function', 'intersection', 'equations-advanced', 'quadratic-solver'], // duel-fnalg.test.mjs
};

const num = (s) => Number(String(s).replace(/−/g, '-'));
const maths = (p) => [...p.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]);
/** "name = value" pairs written in the prompt's math: a = 7, d₁ = 18, θ = 60°, S = 49π */
function given(q) {
  const out = {};
  for (const m of maths(q.prompt)) for (const x of m.matchAll(/([A-Za-zθ₁₂]+)\s*=\s*(−?\d+(?:\.\d+)?)/g)) out[x[1]] = num(x[2]);
  return out;
}
/** every number printed in the prompt, in order */
const printed = (q) => (q.prompt.match(/−?\d+(\.\d+)?/g) || []).map(num);
/** the number written just before "π" in the prompt's math (kπ), in order */
const piNums = (q) => maths(q.prompt).flatMap((m) => [...m.matchAll(/(\d+)π/g)].map((x) => num(x[1])));
const angleOk = (a) => a > 0 && a < 180;
const ints = (...xs) => xs.forEach((x) => assert.ok(Number.isInteger(x), 'not whole: ' + x));

// a linear side with y, x and constants: "−y + 3x − 2" → {y, x, c}
function lin3(side) {
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
function quadSide(side) {
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
const lineOf = (t) => { const [L, R] = t.split('='); assert.equal(L.trim(), 'y', t); return linSide(R); };
// the points "(x, y)" printed in the prompt
const points = (q) => [...q.prompt.matchAll(/\((−?\d+), (−?\d+)\)/g)].map((m) => [num(m[1]), num(m[2])]);
// the equation in the prompt's first $…$ holds at x = v (own evaluator), and not at v + 1 (one solution)
function solves(q, v) {
  const [L, R] = maths(q.prompt)[0].split('=');
  const f = (x) => evalMath(L, { x }) - evalMath(R, { x });
  assert.ok(close(f(v), 0), `x = ${v} does not solve ${q.prompt}`);
  const u = f(v + 0.37); // never a pole (poles are whole numbers)
  assert.ok(Number.isFinite(u) && !close(u, 0), 'more than one solution: ' + q.prompt);
}

export const EXPECT_2B = {
  /* ── quadrilaterals ── */
  'qd.square': (m, q) => {
    const G = given(q);
    if (m.v === 'area') return { value: G.a ** 2 };
    if (m.v === 'perim') return { value: G.a * 4 };
    const a = Math.sqrt(G.S); ints(a); return { value: a };
  },
  'qd.rect': (m, q) => {
    const G = given(q);
    if (m.v === 'area') return { value: G.l * G.w };
    if (m.v === 'perim') return { value: G.l + G.w + G.l + G.w };
    return { value: G.S / G.l };
  },
  'qd.rhombus': (m, q) => {
    const G = given(q);
    if (m.v === 'area') return { value: G['d₁'] * G['d₂'] / 2 };
    if (m.v === 'perim') return { value: 4 * G.a };
    if (m.v === 'side') { const [p, s] = printed(q); return { value: Math.hypot(p, s) }; }
    assert.ok(angleOk(G.A)); return { value: 180 - G.A }; // adjacent angles of a rhombus add to 180°
  },
  'qd.para': (m, q) => {
    const G = given(q);
    if (m.v === 'area') return { value: G.b * G.h };
    if (m.v === 'perim') return { value: 2 * G.a + 2 * G.b };
    if (m.v === 'side') return { value: G.S / G.h };
    assert.ok(angleOk(G.A)); return { value: 180 - G.A };
  },
  'qd.trap': (m, q) => {
    const G = given(q);
    const ans = { value: NaN };
    if (m.v === 'area') ans.value = (G['b₁'] + G['b₂']) * G.h / 2;
    // the unnamed values "שוק $= 5$" (legs)
    const legs = maths(q.prompt).filter((t) => /^=/.test(t.trim())).map((t) => num(t.replace('=', '')));
    if (m.v === 'perim') ans.value = G['b₁'] + G['b₂'] + legs[0] + legs[1];
    if (m.v === 'side' || m.v === 'rightSide') ans.value = 2 * G.S / G.h - G['b₁'];
    if (m.v === 'angle') {
      const D = 360 - G.A - G.B - G.C;
      assert.equal(G.A + G.B, 180, 'not a trapezoid: ' + q.prompt); // AB is a leg between the bases
      [G.A, G.B, G.C, D].forEach((x) => assert.ok(angleOk(x), q.prompt));
      ans.value = D;
    }
    if (m.v === 'isoH') { const s = legs[0]; const k = (G['b₂'] - G['b₁']) / 2; ans.value = Math.sqrt(s * s - k * k); }
    if (m.v === 'isoP') { const s = legs[0]; ans.value = G['b₁'] + G['b₂'] + 2 * s; }
    if (m.v === 'rightP') ans.value = G['b₁'] + G['b₂'] + G.h + Math.hypot(G['b₂'] - G['b₁'], G.h);
    if (m.v === 'rightAngle') { const g = printed(q).filter((x) => x !== 90).pop(); assert.ok(angleOk(g)); ans.value = 360 - 90 - 90 - g; }
    ints(ans.value); assert.ok(ans.value > 0);
    return ans;
  },
  'qd.kite': (m, q) => {
    const G = given(q);
    if (m.v === 'area') return { value: G['d₁'] * G['d₂'] / 2 };
    if (m.v === 'perim') return { value: 2 * G.a + 2 * G.b };
    if (m.v === 'side') return { value: 2 * G.S / G['d₁'] };
    const B = 360 - G.T - 2 * G.R; // R = L
    [G.T, G.R, B].forEach((x) => assert.ok(angleOk(x), q.prompt));
    return { value: B };
  },
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
  /* ── triangles ── */
  'tr.angles': (m, q) => {
    const M = maths(q.prompt);
    if (m.v === 'numeric') {
      const known = M.filter((t) => /°$/.test(t)).map((t) => num(t.replace('°', '')));
      assert.equal(known.length, 2, q.prompt);
      const x = 180 - known[0] - known[1];
      [...known, x].forEach((a) => assert.ok(angleOk(a), q.prompt));
      return { value: x };
    }
    // three expressions in x: solve their sum = 180 (own reading), then every angle in (0°, 180°)
    const exprs = M.slice(0, 3).map((t) => t.replace(/^\(|\)°$/g, ''));
    const sides = exprs.map(linSide);
    const A = sides.reduce((s, [a]) => s + a, 0), B = sides.reduce((s, [, b]) => s + b, 0);
    const x = (180 - B) / A;
    sides.forEach(([a, b]) => assert.ok(angleOk(a * x + b), q.prompt));
    return { value: x };
  },
  'tr.special': (m, q) => {
    const G = given(q), P = printed(q);
    const v = m.v;
    let ans;
    if (v === 'rightArea') ans = P[0] * P[1] / 2;
    else if (v === 'rightLeg') ans = 2 * P[1] / P[0];
    else if (v === 'pyHyp') ans = Math.hypot(P[0], P[1]);
    else if (v === 'pyLeg') ans = Math.sqrt(P[1] ** 2 - P[0] ** 2);
    else if (v === 'isoBase') { ans = (180 - P[0]) / 2; [P[0], ans, ans].forEach((a) => assert.ok(angleOk(a), q.prompt)); }
    else if (v === 'isoApex') { ans = 180 - 2 * P[0]; [P[0], P[0], ans].forEach((a) => assert.ok(angleOk(a), q.prompt)); }
    else if (v === 'heightLeg') { ans = 180 - 90 - P[0]; assert.ok(angleOk(ans) && angleOk(180 - 2 * P[0])); }
    else if (v === 'heightBase') { ans = 180 - 90 - P[0]; assert.ok(angleOk(2 * P[0]) && angleOk(ans)); }
    else if (v === 'equiAngle') { const [a, b] = linSide(maths(q.prompt)[0].replace(/^\(|\)°$/g, '')); ans = (60 - b) / a; }
    else { const [a, b] = linSide(maths(q.prompt)[1].replace(/^AC = /, '')); ans = (G.AB - b) / a; }
    ints(ans); assert.ok(ans > 0);
    return { value: ans };
  },
  /* ── linear function ── */
  'lf.slope': (m, q) => { const [[x1, y1], [x2, y2]] = points(q); return { value: (y2 - y1) / (x2 - x1) }; },
  'lf.read': (m, q) => { const [mm, b] = lineOf(maths(q.prompt)[0]); return { value: m.ask === 'slope' ? mm : b }; },
  'lf.rearr': (m, q) => {
    const [L, R] = maths(q.prompt)[1].split('=').map(lin3);
    const ky = L.y - R.y; // ky·y = (R.x − L.x)·x + (R.c − L.c)
    return { value: m.ask === 'slope' ? (R.x - L.x) / ky : (R.c - L.c) / ky };
  },
  'lf.mpoint': (m, q) => { const mm = given(q).m; const [[x, y]] = points(q); return { value: y - mm * x }; },
  'lf.twopts': (m, q) => {
    const [[x1, y1], [x2, y2]] = points(q);
    const mm = (y2 - y1) / (x2 - x1);
    ints(mm);
    return { value: m.ask === 'slope' ? mm : y1 - mm * x1 };
  },
  'ix.lines': (m, q) => {
    const [l1, l2] = maths(q.prompt).slice(0, 2).map(lineOf);
    const x = (l2[1] - l1[1]) / (l1[0] - l2[0]);
    assert.notEqual(l1[0], l2[0], 'parallel: ' + q.prompt);
    return { value: m.ask === 'xval' ? x : l1[0] * x + l1[1] };
  },
  /* ── advanced equations, quadratic coefficients ── */
  'ea.linfrac': (m, q) => { const v = q.kind === 'number' ? Number(q.answer) : evalMath(q.choices[Number(q.answer)]); solves(q, v); return { value: v }; },
  'ea.sm': (m, q) => { const v = q.kind === 'number' ? Number(q.answer) : evalMath(q.choices[Number(q.answer)]); solves(q, v); return { value: v }; },
  'ea.combo': (m, q) => { const v = q.kind === 'number' ? Number(q.answer) : evalMath(q.choices[Number(q.answer)]); solves(q, v); return { value: v }; },
  'qs.coef': (m, q) => {
    const [L, R] = maths(q.prompt)[1].split('=').map(quadSide);
    const std = L.map((c, i) => c - R[i]);
    assert.equal(std[0], 1, 'a is not 1: ' + q.prompt);
    return { value: m.ask === 'bcoef' ? std[1] : std[2] };
  },
};
