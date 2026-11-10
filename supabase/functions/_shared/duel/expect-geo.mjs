// Independent checks for the quadrilaterals + triangles duel generators (see expect-2b.mjs for the rules).
// The prompts are natural Hebrew (2026-11-10 wording guide): the readers here find each number by the
// WORDS printed next to it (`after`) or by its place in the sentence (`nums`), never from q.answer / q.meta.
import assert from 'node:assert/strict';
import { linSide } from './testkit.mjs';
import { num, maths, printed, angleOk, ints } from './expect-helpers.mjs';

/** the number printed right after a Hebrew label: after(q, /שצלעו/) reads "ריבוע שצלעו $17$" → 17 */
function after(q, label) {
  const re = new RegExp(label.source + '\\s*\\$?(−?\\d+(?:\\.\\d+)?)');
  const m = q.prompt.match(re);
  assert.ok(m, `no "${label.source}" + number in: ${q.prompt}`);
  return num(m[1]);
}
/** every number printed in the prompt, in reading order, with the count the sentence promises */
function nums(q, n) {
  const P = printed(q);
  assert.equal(P.length, n, `expected ${n} numbers in: ${q.prompt}`);
  return P;
}
/** the angles printed as "$…°$" islands, in order */
const degrees = (q) => maths(q.prompt).filter((t) => /°$/.test(t)).map((t) => num(t.replace('°', '')));
/** an angle question shows its unit through display.unit (the choices stay pure numbers) */
const unitDeg = (q) => assert.equal(q.display && q.display.unit, '°', 'angle answer without display.unit °: ' + q.prompt);
const noUnit = (q) => assert.ok(!(q.display && q.display.unit), 'unit on a length / x answer: ' + q.prompt);

const SIDE = /שצלעו/, AREA_IS = /הוא/, LEN = /שאורכו/, WID = /ורוחבו/, AND_LEN = /ואורכו/, BASE = /שבסיסה/, HGT = /וגובהה/;
const H_HIS = /גובהו/, ONE_BASE = /ובסיס אחד שלו/, ANGLE_OF = /זווית של/, ONE_DIAG = /ואלכסון אחד שלו/;

export const EXPECT_GEO = {
  /* ── quadrilaterals ── */
  'qd.square': (m, q) => {
    noUnit(q);
    if (m.v === 'area') return { value: after(q, SIDE) ** 2 };
    if (m.v === 'perim') return { value: after(q, SIDE) * 4 };
    const a = Math.sqrt(after(q, AREA_IS)); ints(a); return { value: a };
  },
  'qd.rect': (m, q) => {
    noUnit(q);
    if (m.v === 'area') return { value: after(q, LEN) * after(q, WID) };
    if (m.v === 'perim') { const l = after(q, LEN), w = after(q, WID); return { value: l + w + l + w }; }
    return { value: after(q, AREA_IS) / after(q, AND_LEN) };
  },
  'qd.rhombus': (m, q) => {
    if (m.v === 'area') { noUnit(q); const [d1, d2] = nums(q, 2); return { value: d1 * d2 / 2 }; }
    if (m.v === 'perim') { noUnit(q); return { value: 4 * after(q, SIDE) }; }
    if (m.v === 'side') { noUnit(q); const [p, s] = nums(q, 2); return { value: Math.hypot(p, s) }; }
    unitDeg(q);
    const A = after(q, ANGLE_OF); assert.ok(angleOk(A)); return { value: 180 - A }; // adjacent angles of a rhombus add to 180°
  },
  'qd.para': (m, q) => {
    if (m.v === 'area') { noUnit(q); return { value: after(q, BASE) * after(q, HGT) }; }
    if (m.v === 'perim') { noUnit(q); const [a, b] = nums(q, 2); return { value: 2 * a + 2 * b }; }
    if (m.v === 'side') { noUnit(q); return { value: after(q, AREA_IS) / after(q, HGT) }; }
    unitDeg(q);
    const A = after(q, ANGLE_OF); assert.ok(angleOk(A)); return { value: 180 - A };
  },
  'qd.trap': (m, q) => {
    const ans = { value: NaN };
    if (m.v === 'area') { const [b1, b2, h] = nums(q, 3); ans.value = (b1 + b2) * h / 2; }
    if (m.v === 'perim') { const [b1, b2, l1, l2] = nums(q, 4); ans.value = b1 + b2 + l1 + l2; }
    if (m.v === 'side' || m.v === 'rightSide') ans.value = 2 * after(q, AREA_IS) / after(q, H_HIS) - after(q, ONE_BASE);
    if (m.v === 'angle') {
      const [A, B, C] = degrees(q);
      assert.equal(degrees(q).length, 3, q.prompt);
      const D = 360 - A - B - C;
      assert.equal(A + B, 180, 'not a trapezoid: ' + q.prompt); // the first two angles sit on one leg
      [A, B, C, D].forEach((x) => assert.ok(angleOk(x), q.prompt));
      ans.value = D;
    }
    if (m.v === 'isoH') { const [b1, b2, s] = nums(q, 3); const k = (b2 - b1) / 2; ans.value = Math.sqrt(s * s - k * k); }
    if (m.v === 'isoP') { const [b1, b2, s] = nums(q, 3); ans.value = b1 + b2 + 2 * s; }
    if (m.v === 'rightP') { const [b1, b2, h] = nums(q, 3); ans.value = b1 + b2 + h + Math.hypot(b2 - b1, h); }
    if (m.v === 'rightAngle') { const g = after(q, ANGLE_OF); assert.ok(angleOk(g)); ans.value = 360 - 90 - 90 - g; }
    if (m.v === 'angle' || m.v === 'rightAngle') unitDeg(q); else noUnit(q);
    ints(ans.value); assert.ok(ans.value > 0);
    return ans;
  },
  'qd.kite': (m, q) => {
    if (m.v === 'area') { noUnit(q); const [d1, d2] = nums(q, 2); return { value: d1 * d2 / 2 }; }
    if (m.v === 'perim') { noUnit(q); const a = after(q, /קצרה היא/), b = after(q, /ארוכה היא/); return { value: 2 * a + 2 * b }; }
    if (m.v === 'side') { noUnit(q); return { value: 2 * after(q, AREA_IS) / after(q, ONE_DIAG) }; }
    unitDeg(q);
    const R = after(q, /השוות הן/), T = after(q, /נוספת היא/); // R = L (the two equal angles), T one more
    const B = 360 - T - 2 * R;
    [T, R, B].forEach((x) => assert.ok(angleOk(x), q.prompt));
    assert.ok(B !== R && B !== T, 'a third equal angle: ' + q.prompt); // "the two equal angles" must be exactly two
    return { value: B };
  },
  /* ── triangles ── */
  'tr.angles': (m, q) => {
    const M = maths(q.prompt);
    if (m.v === 'numeric') {
      unitDeg(q);
      const known = degrees(q);
      assert.equal(known.length, 2, q.prompt);
      const x = 180 - known[0] - known[1];
      [...known, x].forEach((a) => assert.ok(angleOk(a), q.prompt));
      return { value: x };
    }
    // three expressions in x: solve their sum = 180 (own reading), then every angle in (0°, 180°)
    noUnit(q);
    const exprs = M.slice(0, 3).map((t) => t.replace(/^\(|\)°$/g, ''));
    const sides = exprs.map(linSide);
    const A = sides.reduce((s, [a]) => s + a, 0), B = sides.reduce((s, [, b]) => s + b, 0);
    const x = (180 - B) / A;
    sides.forEach(([a, b]) => assert.ok(angleOk(a * x + b), q.prompt));
    return { value: x };
  },
  'tr.special': (m, q) => {
    const v = m.v;
    let ans;
    if (v === 'rightArea') { const [a, b] = nums(q, 2); ans = a * b / 2; }
    else if (v === 'rightLeg') ans = 2 * after(q, /והשטח/) / after(q, /ניצב אחד הוא/);
    else if (v === 'pyHyp') { const [a, b] = nums(q, 2); ans = Math.hypot(a, b); }
    else if (v === 'pyLeg') { const leg = after(q, /ניצב אחד הוא/), hyp = after(q, /והיתר/); ans = Math.sqrt(hyp ** 2 - leg ** 2); }
    else if (v === 'isoBase') { const apex = after(q, /זווית הראש היא/); ans = (180 - apex) / 2; [apex, ans, ans].forEach((a) => assert.ok(angleOk(a), q.prompt)); }
    else if (v === 'isoApex') { const b = after(q, /זווית הבסיס היא/); ans = 180 - 2 * b; [b, b, ans].forEach((a) => assert.ok(angleOk(a), q.prompt)); }
    else if (v === 'heightLeg') { const b = after(q, /זווית הבסיס היא/); ans = 180 - 90 - b; assert.ok(angleOk(ans) && angleOk(180 - 2 * b)); }
    else if (v === 'heightBase') { const half = after(q, ANGLE_OF); ans = 180 - 90 - half; assert.ok(angleOk(2 * half) && angleOk(ans)); }
    else if (v === 'equiAngle') { const [a, b] = linSide(maths(q.prompt)[0].replace(/^\(|\)°$/g, '')); ans = (60 - b) / a; }
    else { const k = after(q, /צלע אחת היא/); const [a, b] = linSide(maths(q.prompt)[1]); ans = (k - b) / a; }
    if (['isoBase', 'isoApex', 'heightLeg', 'heightBase'].includes(v)) unitDeg(q); else noUnit(q);
    ints(ans); assert.ok(ans > 0);
    return { value: ans };
  },
};
