/* זווית חיצונית למשולש (כיתה ח׳) — board #84 */
import { term } from '../../core.js';
import { deg } from './geo.js';

const SETS = [['A', 'B', 'C', 'D'], ['K', 'L', 'M', 'N'], ['P', 'Q', 'R', 'S'], ['D', 'E', 'F', 'G']];
const ang = (s) => `∠${s}`;

/* The frame of every exercise: vertex 0 bottom-left, 1 bottom-right, 2 on top. The base is
   continued beyond vertex `at` (0 or 1) to a fourth point. */
function frame(R) {
  const n = R.pick(SETS), at = R.pick([0, 1]), from = 1 - at;
  return {
    n, at, from,
    tri: n[0] + n[1] + n[2],
    base: n[from] + n[at],                         // the continued side, read towards the new point
    inner: ang(n[from] + n[at] + n[2]),            // the interior angle next to the exterior one
    outer: ang(n[2] + n[at] + n[3]),               // the exterior angle
    cont: `ממשיכים את הצלע [[${n[from] + n[at]}]] מעבר לקודקוד [[${n[at]}]], עד לנקודה [[${n[3]}]].`,
    intro: `במשולש [[${n[0] + n[1] + n[2]}]] ממשיכים את הצלע [[${n[from] + n[at]}]] מעבר לקודקוד [[${n[at]}]], עד לנקודה [[${n[3]}]].`,
  };
}
/* angles by vertex → the drawing */
function fig(f, angles, angleLabels, extLabel, more = {}) {
  return { type: 'tri', angles, names: f.n.slice(0, 3), angleLabels, ext: { at: f.at, from: f.from, name: f.n[3], label: extLabel }, alt: 'משולש עם זווית חיצונית', ...more };
}
const byVertex = (f, atV, fromV, topV) => { const a = [0, 0, 0]; a[f.at] = atV; a[f.from] = fromV; a[2] = topV; return a; };
/* the independent route: the exterior angle from the angle sum of the triangle and the straight angle */
const exteriorOf = (remote1, remote2) => 180 - (180 - remote1 - remote2);
const figOk = (q) => Math.abs(q.fig.angles.reduce((s, v) => s + v, 0) - 180) < 1e-9 && q.fig.angles.every((v) => v >= 27);

/* 1. the exterior angle from the two remote interior angles */
const findExt = {
  id: 'find-exterior',
  make(R) {
    const f = frame(R);
    let r1, r2;
    do { r1 = R.int(30, 85); r2 = R.int(30, 85); } while (r1 === r2 || r1 + r2 > 145 || r1 + r2 === 90);
    const E = r1 + r2;
    return {
      tag: 'מציאת זווית חיצונית',
      text: `${f.intro} נתון: [[${ang(f.n[f.from])} = ${deg(r1)}]], [[${ang(f.n[2])} = ${deg(r2)}]]. חשבו את הזווית החיצונית [[${f.outer}]].`,
      fig: fig(f, byVertex(f, 180 - E, r1, r2), byVertex(f, null, deg(r1), deg(r2)), '?'),
      rows: [{ parts: [`${f.outer} =`, { ans: E }, '°'] }],
      hint: 'זווית חיצונית למשולש שווה לסכום שתי הזוויות הפנימיות שאינן צמודות לה.',
      steps: [
        `הזווית [[${f.outer}]] היא זווית חיצונית למשולש. שתי הזוויות הפנימיות שאינן צמודות לה הן [[${ang(f.n[f.from])}]] ו-[[${ang(f.n[2])}]].`,
        `[[${f.outer} = ${deg(r1)} + ${deg(r2)} = ${deg(E)}]]`,
      ],
      data: { r1, r2 },
    };
  },
  verify(q) {
    const { r1, r2 } = q.data;
    return figOk(q) && q.rows[0].parts[1].ans === exteriorOf(r1, r2) ? true : 'exterior angle differs';
  },
};

/* 2. a remote interior angle (and the adjacent one) from the exterior angle */
const findRemote = {
  id: 'find-remote',
  make(R) {
    const f = frame(R);
    let r1, r2;
    do { r1 = R.int(30, 85); r2 = R.int(30, 85); } while (r1 === r2 || r1 + r2 > 145 || r1 + r2 === 90);
    const E = r1 + r2, knownTop = R.bool();
    const known = knownTop ? f.n[2] : f.n[f.from], asked = knownTop ? f.n[f.from] : f.n[2];
    const kv = knownTop ? r2 : r1, av = knownTop ? r1 : r2;
    return {
      tag: 'מציאת זווית פנימית',
      text: `${f.intro} נתון: הזווית החיצונית [[${f.outer} = ${deg(E)}]], וגם [[${ang(known)} = ${deg(kv)}]]. חשבו את [[${ang(asked)}]] ואת [[${f.inner}]].`,
      fig: fig(f, byVertex(f, 180 - E, r1, r2), byVertex(f, null, knownTop ? '?' : deg(r1), knownTop ? deg(r2) : '?'), deg(E)),
      rows: [
        { parts: [`${ang(asked)} =`, { ans: av }, '°'] },
        { parts: [`${f.inner} =`, { ans: 180 - E }, '°'] },
      ],
      hint: 'הזווית החיצונית שווה לסכום שתי הזוויות הפנימיות שאינן צמודות לה. הזווית הפנימית שלידה משלימה אותה ל-[[180°]].',
      steps: [
        `[[${f.outer} = ${ang(known)} + ${ang(asked)}]], ולכן [[${ang(asked)} = ${deg(E)} - ${deg(kv)} = ${deg(av)}]].`,
        `[[${f.inner}]] ו-[[${f.outer}]] הן זוויות צמודות: [[${f.inner} = 180° - ${deg(E)} = ${deg(180 - E)}]].`,
        `בדיקה: [[${deg(kv)} + ${deg(av)} + ${deg(180 - E)} = 180°]].`,
      ],
      data: { E, known: kv },
    };
  },
  verify(q) {
    const { E, known } = q.data, asked = q.rows[0].parts[1].ans, inner = q.rows[1].parts[1].ans;
    if (!figOk(q)) return 'bad drawing';
    if (asked + known + inner !== 180) return 'the three angles do not add up to 180';
    return inner + E === 180 && exteriorOf(known, asked) === E ? true : 'exterior angle does not fit';
  },
};

/* 3. an isosceles triangle */
const isosceles = {
  id: 'isosceles',
  make(R) {
    const f = frame(R), n = f.n;
    if (R.bool()) {
      // the exterior angle is next to a base angle; the apex is on top
      const b = R.int(40, 74), E = 180 - b, apex = 180 - 2 * b;
      return {
        tag: 'זווית חיצונית במשולש שווה שוקיים',
        text: `המשולש [[${f.tri}]] שווה שוקיים: [[${n[0] + n[2]} = ${n[1] + n[2]}]]. ${f.cont} הזווית החיצונית [[${f.outer}]] שווה ל-[[${deg(E)}]]. חשבו את זווית הבסיס [[${f.inner}]] ואת זווית הראש [[${ang(n[2])}]].`,
        fig: fig(f, [b, b, apex], [null, null, null], deg(E), { ticks: [0, 1] }),
        rows: [
          { parts: [`${f.inner} =`, { ans: b }, '°'] },
          { parts: [`${ang(n[2])} =`, { ans: apex }, '°'] },
        ],
        hint: 'קודם מצאו את זווית הבסיס שצמודה לזווית החיצונית. במשולש שווה שוקיים שתי זוויות הבסיס שוות.',
        steps: [
          `זוויות צמודות: [[${f.inner} = 180° - ${deg(E)} = ${deg(b)}]].`,
          `זוויות הבסיס שוות, ולכן גם [[${ang(n[f.from])} = ${deg(b)}]].`,
          `הזווית החיצונית שווה לסכום שתי הזוויות הפנימיות שאינן צמודות לה: [[${ang(n[2])} = ${deg(E)} - ${deg(b)} = ${deg(apex)}]].`,
        ],
        data: { kind: 'base', E },
      };
    }
    // the exterior angle is next to the apex
    const half = R.int(35, 70), E = 2 * half, apex = 180 - E;
    const legs = [n[f.at] + n[f.from], n[f.at] + n[2]];
    return {
      tag: 'זווית חיצונית במשולש שווה שוקיים',
      text: `המשולש [[${f.tri}]] שווה שוקיים: [[${legs[0]} = ${legs[1]}]]. ${f.cont} הזווית החיצונית [[${f.outer}]] שווה ל-[[${deg(E)}]]. חשבו את זווית הבסיס [[${ang(n[f.from])}]] ואת זווית הראש [[${f.inner}]].`,
      fig: fig(f, byVertex(f, apex, half, half), [null, null, null], deg(E), { ticks: [2, f.from] }),
      rows: [
        { parts: [`${ang(n[f.from])} =`, { ans: half }, '°'] },
        { parts: [`${f.inner} =`, { ans: apex }, '°'] },
      ],
      hint: 'הזווית החיצונית שווה לסכום שתי זוויות הבסיס, והן שוות זו לזו.',
      steps: [
        `הזוויות שאינן צמודות לזווית החיצונית הן שתי זוויות הבסיס [[${ang(n[f.from])}]] ו-[[${ang(n[2])}]], והן שוות.`,
        `לכן כל אחת מהן היא חצי מהזווית החיצונית: [[${ang(n[f.from])} = ${deg(E)} : 2 = ${deg(half)}]].`,
        `זווית הראש צמודה לזווית החיצונית: [[${f.inner} = 180° - ${deg(E)} = ${deg(apex)}]].`,
      ],
      data: { kind: 'apex', E },
    };
  },
  verify(q) {
    const { kind, E } = q.data, a1 = q.rows[0].parts[1].ans, a2 = q.rows[1].parts[1].ans;
    if (!figOk(q)) return 'bad drawing';
    // rebuild the triangle: [angle next to the exterior, the two others]
    const tri = kind === 'base' ? [a1, a1, a2] : [a2, a1, a1];
    if (tri[0] + tri[1] + tri[2] !== 180) return 'angles do not add up to 180';
    if (tri[0] + E !== 180) return 'adjacent angles do not add up to 180';
    const sorted = [...q.fig.angles].sort((x, y) => x - y), mine = [...tri].sort((x, y) => x - y);
    return exteriorOf(tri[1], tri[2]) === E && sorted.every((v, i) => v === mine[i]) ? true : 'exterior angle does not fit';
  },
};

/* 4. with x */
const withX = {
  id: 'with-x',
  make(R) {
    const f = frame(R);
    const [p1, p2, lo, hi] = R.pick([[1, 2, 30, 48], [2, 1, 30, 48], [1, 3, 30, 36], [3, 1, 30, 36], [2, 3, 15, 29], [3, 2, 15, 29]]);
    const x = R.int(lo, hi), E = (p1 + p2) * x;
    const big = p1 > p2 ? f.n[f.from] : f.n[2], bigP = Math.max(p1, p2);
    const t1 = term(p1, 'x'), t2 = term(p2, 'x');
    return {
      tag: 'זווית חיצונית עם נעלם',
      text: `${f.intro} נתון: [[${ang(f.n[f.from])} = ${t1}]], [[${ang(f.n[2])} = ${t2}]], והזווית החיצונית [[${f.outer}]] שווה ל-[[${deg(E)}]]. מצאו את [[x]] ואת [[${ang(big)}]].`,
      fig: fig(f, byVertex(f, 180 - E, p1 * x, p2 * x), byVertex(f, null, t1, t2), deg(E)),
      rows: [
        { parts: ['x =', { ans: x }, '°'] },
        { parts: [`${ang(big)} =`, { ans: bigP * x }, '°'] },
      ],
      hint: 'כתבו משוואה: סכום שתי הזוויות הפנימיות שאינן צמודות לזווית החיצונית שווה לזווית החיצונית.',
      steps: [
        `הזווית החיצונית שווה לסכום שתי הזוויות הפנימיות שאינן צמודות לה: [[${t1} + ${t2} = ${E}]]`,
        `[[${p1 + p2}x = ${E}]], ולכן [[x = ${E} : ${p1 + p2} = ${x}]].`,
        `[[${ang(big)} = ${term(bigP, 'x')} = ${bigP} * ${x} = ${deg(bigP * x)}]]`,
      ],
      data: { p1, p2, E },
    };
  },
  verify(q) {
    const { p1, p2, E } = q.data, x = q.rows[0].parts[1].ans;
    if (!figOk(q)) return 'bad drawing';
    const third = 180 - p1 * x - p2 * x;                 // from the angle sum
    if (third + E !== 180) return 'x does not fit the exterior angle';
    return q.rows[1].parts[1].ans === Math.max(p1, p2) * x && Number.isInteger(x) ? true : 'the angle differs';
  },
};

export default {
  id: 'exterior-angle',
  name: 'זווית חיצונית למשולש',
  grade: 'ח׳',
  about: 'זווית חיצונית שווה לסכום שתי הזוויות הפנימיות שאינן צמודות לה',
  place: 'הנושא "משולשים" ← פרק חדש אחרי "1. זוויות" ולפני "2. סוגי משולשים"',
  lesson: [
    { t: 'מהי זווית חיצונית?', items: [
      'כשממשיכים צלע של משולש מעבר לקודקוד, נוצרת זווית בין ההמשך לבין הצלע השנייה שיוצאת מאותו קודקוד. זו זווית חיצונית למשולש.',
      { fig: { type: 'tri', angles: [50, 70, 60], names: ['A', 'B', 'C'], angleLabels: ['50°', '70°', '60°'], ext: { at: 1, from: 0, name: 'D', label: '110°' }, caption: '[[∠CBD]] היא זווית חיצונית למשולש [[ABC]]' } },
      'הזווית החיצונית והזווית הפנימית שלידה הן זוויות צמודות, ולכן סכומן [[180°]].',
    ] },
    { t: 'המשפט', items: [
      'זווית חיצונית למשולש שווה לסכום שתי הזוויות הפנימיות שאינן צמודות לה.',
      { f: '∠CBD = ∠A + ∠C' },
      'למה? סכום הזוויות במשולש הוא [[180°]], וגם סכום הזוויות הצמודות הוא [[180°]]. בשני המקרים משלימים את [[∠ABC]] ל-[[180°]], ולכן מקבלים אותו דבר.',
      { ex: 'במשולש [[ABC]] נתון [[∠A = 50°]], [[∠C = 60°]]. מה גודל הזווית החיצונית [[∠CBD]]?', sol: ['[[∠CBD = ∠A + ∠C]]', '[[∠CBD = 50° + 60° = 110°]]', 'בדיקה: [[∠ABC = 180° - 50° - 60° = 70°]], ואכן [[70° + 110° = 180°]].'] },
      { note: 'טעות נפוצה: לחבר לזווית החיצונית את הזווית הפנימית שלידה. מחברים רק את שתי הזוויות הרחוקות ממנה.' },
    ] },
    { t: 'עם נעלם', items: [
      { ex: 'במשולש שתי זוויות פנימיות הן [[x]] ו-[[2x]], והזווית החיצונית שאינה צמודה להן היא [[120°]]. מצאו את [[x]].', sol: ['[[x + 2x = 120]]', '[[3x = 120]]', '[[x = 40]]. הזוויות הן [[40°]] ו-[[80°]].'] },
    ] },
  ],
  gens: [findExt, findRemote, isosceles, withX],
};
