// Independent checks for the linear function, intersection, advanced equations, quadratic duel generators (see expect-2b.mjs for the rules).
import assert from 'node:assert/strict';
import { evalMath, mathOf, linSide, close } from './testkit.mjs';
import { num, maths, given, printed, piNums, angleOk, ints, lin3, quadSide, lineOf, points, solves } from './expect-helpers.mjs';

export const EXPECT_FNALG = {
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
