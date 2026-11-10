// Independent checks for the solids + circle duel generators (see expect-2b.mjs for the rules).
// The prompts name every number in words (2026-11-10 style guide), so the readers here
// look for the words: "רדיוס $7$", "וגובה $4$", "קשת באורך $15$", "$120°$", "$26π$".
import assert from 'node:assert/strict';
import { evalMath, close } from './testkit.mjs';
import { num, maths, printed, piNums } from './expect-helpers.mjs';

/** the number printed right after a Hebrew phrase: after(q, 'רדיוס') on "…עם רדיוס $7$ ו…" → 7 */
function after(q, phrase) {
  const m = q.prompt.match(new RegExp(phrase + '\\s*\\$(\\d+(?:\\.\\d+)?)\\$'));
  assert.ok(m, `"${phrase}" is not printed: ${q.prompt}`);
  return num(m[1]);
}
/** every number printed after that phrase, in order */
const afterAll = (q, phrase) => [...q.prompt.matchAll(new RegExp(phrase + '\\s*\\$(\\d+(?:\\.\\d+)?)\\$', 'g'))].map((m) => num(m[1]));
/** the one angle printed as "$120°$" */
function deg(q) {
  const m = q.prompt.match(/\$(\d+)°\$/);
  assert.ok(m, 'no angle printed: ' + q.prompt);
  return num(m[1]);
}
/** "תיבה באורך $l$, ברוחב $w$ ובגובה $h$" → { l, w, h } */
function boxDims(q) {
  const m = q.prompt.match(/באורך \$(\d+)\$, ברוחב \$(\d+)\$ ובגובה \$(\d+)\$/);
  assert.ok(m, 'box edges not printed: ' + q.prompt);
  return { l: num(m[1]), w: num(m[2]), h: num(m[3]) };
}
/** the one $…$ island that holds π, as a number of radians: "\frac{2π}{3}" → 2π/3 */
function radiansOf(q) {
  const m = maths(q.prompt).find((s) => /π/.test(s));
  assert.ok(m, 'no radians printed: ' + q.prompt);
  return evalMath(m);
}

export const EXPECT_SOLIDS = {
  /* ── solids ── */
  'so.cube': (m, q) => { const a = after(q, 'שצלעה'); return { value: m.v === 'vol' ? a * a * a : 6 * a * a }; },
  'so.box': (m, q) => {
    if (m.v === 'ratio') {
      // "נפח התיבה הוא $V$" + a formula line "2k, 2k, 3k": V = p·s·t·k³
      const V = after(q, 'נפח התיבה הוא');
      const edges = maths(q.prompt).find((s) => /k,/.test(s));
      assert.ok(edges, 'no edges line: ' + q.prompt);
      const [p, s, t] = edges.split(',').map((e) => { const d = e.trim().match(/^(\d*)k$/); assert.ok(d, 'odd edge: ' + e); return d[1] === '' ? 1 : num(d[1]); });
      assert.deepEqual([p, s, t], m.ratio);
      const k = Math.cbrt(V / (p * s * t)); assert.ok(close(k, Math.round(k))); return { value: Math.round(k) };
    }
    const { l, w, h } = boxDims(q);
    if (m.v === 'vol') return { value: l * w * h };
    if (m.v === 'surf') return { value: 2 * l * w + 2 * l * h + 2 * w * h };
    return { value: Math.sqrt(l * l + w * w + h * h) };
  },
  'so.cyl': (m, q) => {
    if (m.v === 'vol') { const r = after(q, 'רדיוס'), h = after(q, 'וגובה'); return { value: r * r * h }; }
    if (m.v === 'surf') { const r = after(q, 'רדיוס'), h = after(q, 'וגובה'); return { value: 2 * r * r + 2 * r * h }; }
    const V = piNums(q)[0], r = after(q, 'ורדיוס הבסיס שלו'); return { value: V / (r * r) };
  },
  'so.cone': (m, q) => {
    const r = after(q, 'רדיוס');
    if (m.v === 'vol') return { value: r * r * after(q, 'וגובה') / 3 };
    if (m.v === 'surf') return { value: r * r + r * after(q, 'גובה אלכסוני') };
    return { value: Math.hypot(r, after(q, 'וגובה')) };
  },
  'so.pyr': (m, q) => {
    if (m.v === 'volSq') return { value: after(q, 'שצלעו') ** 2 * after(q, 'וגובה') / 3 };
    if (m.v === 'volTri') {
      // base area printed as "k√3" (k = b²/4 of his equilateral base, from meta), V = k√3·h/3 → the number before √3
      const k = num(maths(q.prompt)[1].match(/^(\d+)\\sqrt\{3\}$/)[1]);
      assert.equal(k, (m.b * m.b) / 4);
      return { value: k * after(q, 'גובה') / 3 };
    }
    if (m.v === 'surfSq') { const b = after(q, 'שצלעו'), mm = after(q, 'הפאה הצדדית'); return { value: b * b + 4 * (b * mm / 2) }; }
    if (m.v === 'apothem') return { value: Math.hypot(after(q, 'חצי צלע הבסיס'), after(q, 'גובה הפירמידה')) };
    const b = after(q, 'שצלעו'), mm = after(q, 'הפאה הצדדית'); return { value: Math.sqrt(mm * mm - (b / 2) ** 2) };
  },
  'so.sphere': (m, q) => {
    const r = m.v === 'vol' || m.v === 'surf' ? after(q, 'רדיוס') : Math.sqrt(piNums(q)[0] / 4);
    if (m.v === 'vol' || m.v === 'sToV') return { value: 4 * r ** 3 / 3 };
    if (m.v === 'surf') return { value: 4 * r * r };
    return { value: r };
  },
  /* ── circle ── */
  'ci.rad': (m, q) => {
    if (m.v === 'fracToDeg') { const [n, d] = printed(q); return { value: 360 * n / d }; }
    if (m.v === 'thetaArc') return { value: after(q, 'באורך') / after(q, 'רדיוס') };
    if (m.v === 'radToDeg') return { value: radiansOf(q) * 180 / Math.PI };
    if (m.v === 'arcRad') return { value: after(q, 'רדיוס') * radiansOf(q) / Math.PI };
    return { value: deg(q) * Math.PI / 180 }; // degToRad: the choice is a π-fraction
  },
  'ci.circ': (m, q) => {
    if (m.v === 'calc') return { value: 2 * after(q, 'רדיוס') };
    if (m.v === 'findR') return { value: piNums(q)[0] / 2 };
    // numerical, π ≈ 3.14: his check accepts within 0.1 of 2 · 3.14 · r
    assert.ok(/π ≈ 3\.14/.test(q.prompt), 'the prompt must say π ≈ 3.14: ' + q.prompt);
    const exact = 2 * 3.14 * after(q, 'רדיוס');
    if (q.kind === 'number') { assert.equal(q.tol, 0.1); assert.ok(Math.abs(Number(q.answer) - exact) <= 0.1); return { value: Number(q.answer) }; }
    return { value: exact };
  },
  'ci.area': (m, q) => {
    if (m.v === 'calc') return { value: after(q, 'רדיוס') ** 2 };
    if (m.v === 'findR') return { value: Math.sqrt(piNums(q)[0]) };
    const θ = deg(q), r = after(q, 'רדיוס');
    assert.ok(θ > 0 && θ <= 180);
    return { value: (θ / 360) * r * r };
  },
  'ci.arc': (m, q) => {
    const r = after(q, 'רדיוס');
    if (m.v === 'arcLen') return { value: (deg(q) / 360) * 2 * r };
    const L = piNums(q)[0] ?? 1; // "קשת באורך $π$" when the coefficient is 1
    return { value: (L / (2 * r)) * 360 };
  },
  'ci.mix': (m, q) => {
    if (m.v === 'circToArea') return { value: (piNums(q)[0] / 2) ** 2 };
    if (m.v === 'sectorToR') { const S = piNums(q)[0]; return { value: Math.sqrt(S * 360 / deg(q)) }; }
    const [R, r] = afterAll(q, 'ברדיוס');
    assert.ok(R > r, 'the big circle first: ' + q.prompt);
    return { value: R * R - r * r };
  },
};
