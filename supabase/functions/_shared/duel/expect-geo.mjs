// Independent checks for the quadrilaterals + triangles duel generators (see expect-2b.mjs for the rules).
import assert from 'node:assert/strict';
import { evalMath, mathOf, linSide, close } from './testkit.mjs';
import { num, maths, given, printed, piNums, angleOk, ints, lin3, quadSide, lineOf, points, solves } from './expect-helpers.mjs';

export const EXPECT_GEO = {
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
};
