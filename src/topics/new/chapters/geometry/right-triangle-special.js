/* משולש 30°-60°-90° ותיכון ליתר (כיתה ט׳) — board #84 */
import { num } from '../../core.js';
import { angle, dist, lerp, deg, RAD } from './geo.js';

const SETS = [['A', 'B', 'C'], ['D', 'E', 'F'], ['P', 'Q', 'R'], ['K', 'L', 'N']];
const ang = (s) => `∠${s}`;
const seg = (a, b) => [a, b].sort().join('');
const near = (x, y) => Math.abs(x - y) < 1e-6;

/* A right triangle with the roles X (angle α), Y (angle 90° − α), Z (the right angle).
   `layouts`: which role sits bottom-left, bottom-right, on top. */
function setup(R, alpha, layouts) {
  const n = R.pick(SETS), flip = R.bool();
  const name = { X: flip ? n[1] : n[0], Y: flip ? n[0] : n[1], Z: n[2] };
  const slots = R.pick(layouts).split('');
  const by = (m) => slots.map((k) => (m[k] == null ? null : m[k]));
  return {
    ...name, tri: n.join(''), hyp: seg(name.X, name.Y), legX: seg(name.Y, name.Z), legY: seg(name.X, name.Z),   // legX lies opposite X
    intro: `במשולש ישר זווית [[${n.join('')}]] ([[${ang(name.Z)} = 90°]])`,
    slots, by,
    fig: (angleLabels, sideLabels, more = {}) => ({
      type: 'tri', angles: by({ X: alpha, Y: 90 - alpha, Z: 90 }), names: by(name), right: slots.indexOf('Z'),
      angleLabels: by(angleLabels), sideLabels: by(sideLabels), alt: 'משולש ישר זווית', ...more,
    }),
  };
}
const ANY = ['ZXY', 'ZYX', 'XZY', 'YZX', 'XYZ', 'YXZ'], HYP_BASE = ['XYZ', 'YXZ'];
/* the same triangle in coordinates (for verify): right angle at the origin, legs on the axes */
function coords(alpha, hyp) {
  const Z = [0, 0], X = [hyp * Math.cos(alpha * RAD), 0], Y = [0, hyp * Math.sin(alpha * RAD)];
  return { X, Y, Z, M: lerp(X, Y, 0.5) };
}

/* 1. the leg opposite 30° is half the hypotenuse */
const leg30 = {
  id: 'leg-30',
  make(R) {
    const t = setup(R, 30, ANY), n = R.int(3, 24), toLeg = R.bool(), give60 = R.bool(0.4);
    const givenAngle = give60 ? `[[${ang(t.Y)} = 60°]]` : `[[${ang(t.X)} = 30°]]`;
    const first = give60 ? [`הזווית החדה השנייה: [[${ang(t.X)} = 180° - 90° - 60° = 30°]].`] : [];
    return {
      tag: 'משולש 30°-60°-90°',
      text: toLeg
        ? `${t.intro} נתון: ${givenAngle}, ואורך היתר [[${t.hyp}]] הוא [[${2 * n}]] ס״מ. מצאו את אורך הניצב [[${t.legX}]].`
        : `${t.intro} נתון: ${givenAngle}, ואורך הניצב [[${t.legX}]] הוא [[${n}]] ס״מ. מצאו את אורך היתר [[${t.hyp}]].`,
      fig: t.fig(give60 ? { Y: '60°' } : { X: '30°' }, toLeg ? { Z: String(2 * n), X: '?' } : { X: String(n), Z: '?' }),
      rows: [{ parts: [`${toLeg ? t.legX : t.hyp} =`, { ans: toLeg ? n : 2 * n }, { t: 'ס״מ' }] }],
      hint: `במשולש ישר זווית, הניצב שמול הזווית של [[30°]] שווה למחצית היתר.${give60 ? ' קודם מצאו איזו זווית היא [[30°]].' : ''}`,
      steps: [
        ...first,
        `הניצב [[${t.legX}]] נמצא מול הזווית [[${ang(t.X)} = 30°]], ולכן הוא שווה למחצית היתר [[${t.hyp}]].`,
        toLeg ? `[[${t.legX} = ${2 * n} : 2 = ${n}]] ס״מ.` : `[[${t.hyp} = 2 * ${n} = ${2 * n}]] ס״מ.`,
      ],
      data: { toLeg, given: toLeg ? 2 * n : n },
    };
  },
  verify(q) {
    const { toLeg, given } = q.data, got = q.rows[0].parts[1].ans;
    const c = coords(30, toLeg ? given : got);                       // the triangle with this hypotenuse
    const leg = dist(c.Y, c.Z);                                      // the leg opposite X
    if (!near(angle(c.Y, c.X, c.Z), 30)) return 'angle is not 30';
    return near(leg, toLeg ? got : given) ? true : `leg is ${leg}`;
  },
};

/* 2. the converse: a leg that is half the hypotenuse lies opposite 30° */
const converse = {
  id: 'converse',
  make(R) {
    const t = setup(R, 30, ANY), n = R.int(3, 24), firstX = R.bool();
    const rows = [{ parts: [`${ang(t.X)} =`, { ans: 30 }, '°'] }, { parts: [`${ang(t.Y)} =`, { ans: 60 }, '°'] }];
    return {
      tag: 'המשפט ההפוך',
      text: `${t.intro} אורך היתר [[${t.hyp}]] הוא [[${2 * n}]] ס״מ, ואורך הניצב [[${t.legX}]] הוא [[${n}]] ס״מ. מצאו את שתי הזוויות החדות של המשולש.`,
      fig: t.fig({}, { Z: String(2 * n), X: String(n) }),
      rows: firstX ? rows : rows.reverse(),
      hint: 'השוו בין הניצב ליתר. אם ניצב שווה למחצית היתר, הזווית שמולו היא [[30°]].',
      steps: [
        `[[${2 * n} : 2 = ${n}]], כלומר הניצב [[${t.legX}]] שווה למחצית היתר.`,
        `לכן הזווית שמול הניצב הזה היא [[30°]]: [[${ang(t.X)} = 30°]].`,
        `הזווית החדה השנייה: [[${ang(t.Y)} = 90° - 30° = 60°]].`,
      ],
      data: { hyp: 2 * n, leg: n, firstX },
    };
  },
  verify(q) {
    const { hyp, leg, firstX } = q.data;
    const x = Math.asin(leg / hyp) / RAD;                            // the angle opposite the leg
    const got = q.rows.map((r) => r.parts[1].ans), gx = firstX ? got[0] : got[1], gy = firstX ? got[1] : got[0];
    return near(gx, x) && near(gy, 180 - 90 - x) ? true : `angles are ${x}, ${90 - x}`;
  },
};

/* 3. the median to the hypotenuse is half the hypotenuse */
const TRIPLES = [[6, 8, 10], [10, 24, 26], [12, 16, 20], [5, 12, 13], [8, 15, 17], [9, 12, 15], [3, 4, 5]];
const medianLen = {
  id: 'median-length',
  make(R) {
    const kind = R.pick(['hyp', 'median', 'legs']);
    let alpha, a, b, c;
    if (kind === 'legs') { [a, b, c] = R.pick(TRIPLES); if (R.bool()) [a, b] = [b, a]; alpha = Math.atan2(a, b) / RAD; }
    else { do { alpha = R.int(28, 62); } while (alpha === 45); c = R.int(6, 40); }
    const t = setup(R, alpha, HYP_BASE), m = c / 2, med = t.Z + 'M';
    const fig = (side, label) => { const f = t.fig({}, side, { median: { from: 2, name: 'M', label } }); if (kind === 'legs') { delete f.angles; f.sides = t.by({ X: a, Y: b, Z: c }); } return f; };
    const base = { tag: 'תיכון ליתר', hint: 'במשולש ישר זווית, התיכון ליתר שווה למחצית היתר.' };
    if (kind === 'hyp') return {
      ...base,
      text: `${t.intro} אורך היתר [[${t.hyp}]] הוא [[${c}]] ס״מ. הקטע [[${med}]] הוא התיכון ליתר. מצאו את אורך התיכון.`,
      fig: fig({}, '?'),
      rows: [{ parts: [`${med} =`, { ans: m }, { t: 'ס״מ' }] }],
      steps: ['במשולש ישר זווית, התיכון ליתר שווה למחצית היתר.', `[[${med} = ${c} : 2 = ${num(m)}]] ס״מ.`],
      data: { kind, alpha, c },
    };
    if (kind === 'median') return {
      ...base,
      text: `${t.intro} הקטע [[${med}]] הוא התיכון ליתר, ואורכו [[${num(m)}]] ס״מ. מצאו את אורך היתר [[${t.hyp}]].`,
      fig: fig({}, num(m)),
      rows: [{ parts: [`${t.hyp} =`, { ans: c }, { t: 'ס״מ' }] }],
      steps: ['במשולש ישר זווית, התיכון ליתר שווה למחצית היתר. לכן היתר גדול פי 2 מהתיכון.', `[[${t.hyp} = 2 * ${num(m)} = ${c}]] ס״מ.`],
      data: { kind, alpha, m },
    };
    return {
      ...base,
      text: `${t.intro} אורכי הניצבים הם [[${t.legX} = ${a}]] ס״מ ו-[[${t.legY} = ${b}]] ס״מ. הקטע [[${med}]] הוא התיכון ליתר. מצאו את אורך היתר ואת אורך התיכון.`,
      fig: fig({ X: String(a), Y: String(b) }, '?'),
      rows: [
        { parts: [`${t.hyp} =`, { ans: c }, { t: 'ס״מ' }] },
        { parts: [`${med} =`, { ans: m }, { t: 'ס״מ' }] },
      ],
      hint: 'קודם מצאו את היתר בעזרת משפט פיתגורס. התיכון ליתר שווה למחצית היתר.',
      steps: [
        `משפט פיתגורס: [[${t.hyp}^2 = ${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${c * c}]], ולכן [[${t.hyp} = ${c}]] ס״מ.`,
        `התיכון ליתר שווה למחצית היתר: [[${med} = ${c} : 2 = ${num(m)}]] ס״מ.`,
      ],
      data: { kind, a, b },
    };
  },
  verify(q) {
    const d = q.data, got = q.rows.map((r) => r.parts[1].ans);
    if (d.kind === 'legs') {
      const Z = [0, 0], X = [d.b, 0], Y = [0, d.a], M = lerp(X, Y, 0.5);
      return near(got[0], dist(X, Y)) && near(got[1], dist(Z, M)) ? true : 'hypotenuse / median differ';
    }
    const c = coords(d.alpha, d.kind === 'hyp' ? d.c : got[0]), med = dist(c.Z, c.M);
    return near(med, d.kind === 'hyp' ? got[0] : d.m) ? true : `median is ${med}`;
  },
};

/* 4. the two isosceles triangles that the median creates */
const medianAngles = {
  id: 'median-angles',
  make(R) {
    let alpha;
    do { alpha = R.int(28, 62); } while (alpha === 45);
    const t = setup(R, alpha, HYP_BASE), { X, Y, Z } = t, med = Z + 'M';
    const atZ = R.pick([
      { pts: ['X', 'Z', 'M'], name: ang(X + Z + 'M'), val: alpha, step: null },
      { pts: ['Y', 'Z', 'M'], name: ang(Y + Z + 'M'), val: 90 - alpha, step: `[[${ang(Y + Z + 'M')} = 90° - ${deg(alpha)} = ${deg(90 - alpha)}]], כי שתי הזוויות יחד הן הזווית הישרה [[${ang(Z)}]].` },
    ]);
    const atM = R.pick([
      { pts: ['X', 'M', 'Z'], name: ang(X + 'M' + Z), val: 180 - 2 * alpha, step: `סכום הזוויות במשולש [[${X}M${Z}]]: [[${ang(X + 'M' + Z)} = 180° - ${deg(alpha)} - ${deg(alpha)} = ${deg(180 - 2 * alpha)}]].` },
      { pts: ['Y', 'M', 'Z'], name: ang(Y + 'M' + Z), val: 2 * alpha, step: `[[${ang(Y + 'M' + Z)}]] היא זווית חיצונית למשולש [[${X}M${Z}]]: [[${ang(Y + 'M' + Z)} = ${deg(alpha)} + ${deg(alpha)} = ${deg(2 * alpha)}]].` },
    ]);
    return {
      tag: 'זוויות עם התיכון ליתר',
      text: `${t.intro} הקטע [[${med}]] הוא התיכון ליתר [[${t.hyp}]]. נתון: [[${ang(X)} = ${deg(alpha)}]]. חשבו את [[${atZ.name}]] ואת [[${atM.name}]].`,
      fig: t.fig({ X: deg(alpha) }, {}, { median: { from: 2, name: 'M' } }),
      rows: [atZ, atM].map((a) => ({ parts: [`${a.name} =`, { ans: a.val }, '°'] })),
      hint: `התיכון ליתר שווה למחצית היתר, ולכן [[${med} = ${X}M = ${Y}M]]. חפשו את שני המשולשים שווי השוקיים שנוצרו.`,
      steps: [
        `התיכון ליתר שווה למחצית היתר: [[${med} = ${X}M = ${Y}M]].`,
        `המשולש [[${X}M${Z}]] שווה שוקיים ([[${X}M = ${Z}M]]), ולכן זוויות הבסיס שלו שוות: [[${ang(X + Z + 'M')} = ${ang(X)} = ${deg(alpha)}]].`,
        ...[atZ.step, atM.step].filter(Boolean),
      ],
      data: { alpha, ask: [atZ.pts, atM.pts] },
    };
  },
  verify(q) {
    const { alpha, ask } = q.data, c = coords(alpha, 10);
    if (!near(dist(c.Z, c.M), dist(c.X, c.M)) || !near(dist(c.Z, c.M), dist(c.Y, c.M))) return 'M is not at the same distance from the three vertices';
    for (let i = 0; i < 2; i++) {
      const [p, v, r] = ask[i], real = angle(c[p], c[v], c[r]);
      if (!near(real, q.rows[i].parts[1].ans)) return `angle ${ask[i].join('')} is ${real}`;
    }
    return true;
  },
};

/* 5. both theorems together: 30° and the median give an equilateral triangle */
const both = {
  id: 'both-theorems',
  make(R) {
    const t = setup(R, 30, HYP_BASE), n = R.int(3, 20), { Y, Z } = t, med = Z + 'M', small = [Y, Z, 'M'].sort((a, b) => (a === 'M' ? 1 : b === 'M' ? -1 : a < b ? -1 : 1)).join('');
    return {
      tag: 'שני המשפטים יחד',
      text: `${t.intro} נתון: [[${ang(t.X)} = 30°]], ואורך היתר [[${t.hyp}]] הוא [[${2 * n}]] ס״מ. הקטע [[${med}]] הוא התיכון ליתר. מצאו את [[${t.legX}]], את [[${med}]] ואת היקף המשולש [[${small}]].`,
      fig: t.fig({ X: '30°' }, {}, { median: { from: 2, name: 'M' } }),
      rows: [
        { parts: [`${t.legX} =`, { ans: n }, { t: 'ס״מ' }] },
        { parts: [`${med} =`, { ans: n }, { t: 'ס״מ' }] },
        { label: `היקף המשולש [[${small}]]:`, parts: [{ ans: 3 * n }, { t: 'ס״מ' }] },
      ],
      hint: 'השתמשו בשני משפטים: הניצב שמול [[30°]] שווה למחצית היתר, וגם התיכון ליתר שווה למחצית היתר.',
      steps: [
        `הניצב [[${t.legX}]] נמצא מול [[30°]]: [[${t.legX} = ${2 * n} : 2 = ${n}]] ס״מ.`,
        `התיכון ליתר שווה למחצית היתר: [[${med} = ${n}]] ס״מ, וגם [[${Y}M = ${n}]] ס״מ.`,
        `שלוש צלעות המשולש [[${small}]] שוות (זה משולש שווה צלעות), ולכן ההיקף: [[3 * ${n} = ${3 * n}]] ס״מ.`,
      ],
      data: { hyp: 2 * n },
    };
  },
  verify(q) {
    const c = coords(30, q.data.hyp), leg = dist(c.Y, c.Z), med = dist(c.Z, c.M), per = leg + med + dist(c.M, c.Y);
    const got = [q.rows[0].parts[1].ans, q.rows[1].parts[1].ans, q.rows[2].parts[0].ans];
    return near(got[0], leg) && near(got[1], med) && near(got[2], per) ? true : `real: ${leg}, ${med}, ${per}`;
  },
};

export default {
  id: 'right-triangle-special',
  name: 'משולש 30°-60°-90° ותיכון ליתר',
  grade: 'ט׳',
  about: 'שני משפטים על משולש ישר זווית: הניצב שמול 30° והתיכון ליתר שווים למחצית היתר',
  place: 'הנושא "משולשים" ← בתוך הפרק "3. משולשים מיוחדים", או פרק חדש מיד אחריו (ולפני "4. חפיפה")',
  lesson: [
    { t: 'הניצב שמול 30°', items: [
      'במשולש ישר זווית שאחת מזוויותיו [[30°]], הניצב שמול הזווית הזו שווה למחצית היתר.',
      { fig: { type: 'tri', angles: [30, 90, 60], names: ['A', 'C', 'B'], right: 1, angleLabels: ['30°', null, '60°'], sideLabels: ['6', '12', null], caption: '[[BC]] מול [[30°]], ולכן [[BC]] הוא חצי מהיתר [[AB]]' } },
      { ex: 'במשולש ישר זווית [[ABC]] ([[∠C = 90°]]) נתון [[∠A = 30°]] והיתר [[AB = 12]] ס״מ. מה אורך [[BC]]?', sol: ['[[BC]] הוא הניצב שמול [[∠A = 30°]].', '[[BC = 12 : 2 = 6]] ס״מ.'] },
      { note: 'שימו לב איזה ניצב: רק הניצב שמול [[30°]] שווה למחצית היתר. הניצב השני (מול [[60°]]) ארוך ממנו.' },
    ] },
    { t: 'המשפט ההפוך', items: [
      'אם במשולש ישר זווית אחד הניצבים שווה למחצית היתר, אז הזווית שמול הניצב הזה היא [[30°]].',
      { ex: 'במשולש ישר זווית היתר [[16]] ס״מ ואחד הניצבים [[8]] ס״מ. מהן הזוויות החדות?', sol: ['[[8]] הוא חצי מ-[[16]], ולכן הזווית שמול הניצב הזה היא [[30°]].', 'הזווית החדה השנייה: [[90° - 30° = 60°]].'] },
    ] },
    { t: 'התיכון ליתר', items: [
      'תיכון הוא קטע שמחבר קודקוד עם אמצע הצלע שמולו. במשולש ישר זווית, התיכון ליתר שווה למחצית היתר.',
      { fig: { type: 'tri', angles: [35, 55, 90], names: ['A', 'B', 'C'], right: 2, median: { from: 2, name: 'M', label: '5' }, caption: 'היתר [[AB = 10]], ולכן [[CM = AM = BM = 5]]' } },
      'התיכון מחלק את המשולש לשני משולשים שווי שוקיים: [[AMC]] ו-[[BMC]]. לכן [[∠ACM = ∠A]] וגם [[∠BCM = ∠B]].',
      { ex: 'במשולש ישר זווית [[ABC]] ([[∠C = 90°]]) נתון [[∠A = 35°]], ו-[[CM]] הוא התיכון ליתר. מה גודל [[∠BMC]]?', sol: ['[[CM = AM]], ולכן המשולש [[AMC]] שווה שוקיים: [[∠ACM = ∠A = 35°]].', '[[∠BMC]] היא זווית חיצונית למשולש [[AMC]]: [[∠BMC = 35° + 35° = 70°]].'] },
    ] },
  ],
  gens: [leg30, converse, medianLen, medianAngles, both],
};
