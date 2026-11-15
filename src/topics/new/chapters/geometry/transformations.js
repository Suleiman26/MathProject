/* הזזה, שיקוף וסיבוב (כיתות ז׳–ח׳) — board #84 */
import { num } from '../../core.js';
import { area, dist, gridPoints } from './geo.js';

const N3 = ['A', 'B', 'C'];
const prime = (n) => `${n}'`;
const pt = (n, p) => `${n}(${num(p[0])}, ${num(p[1])})`;
const units = (n) => (n === 1 ? 'יחידה אחת' : `${n} יחידות`);

/* the six transformations, as the student applies them */
const MOVE = {
  rx: (p) => [p[0], 0 - p[1]],
  ry: (p) => [0 - p[0], p[1]],
  r90: (p) => [0 - p[1], p[0]],
  r270: (p) => [p[1], 0 - p[0]],
  r180: (p) => [0 - p[0], 0 - p[1]],
};
const NAME = {
  rx: 'שיקוף בציר [[x]]', ry: 'שיקוף בציר [[y]]',
  r90: 'סיבוב של [[90°]] נגד כיוון השעון סביב ראשית הצירים', r270: 'סיבוב של [[90°]] עם כיוון השעון סביב ראשית הצירים',
  r180: 'סיבוב של [[180°]] סביב ראשית הצירים',
};
const RULE = { rx: '(x, y) → (x, -y)', ry: '(x, y) → (-x, y)', r90: '(x, y) → (-y, x)', r270: '(x, y) → (y, -x)', r180: '(x, y) → (-x, -y)' };

/* the same transformations as matrices (for verify): rotations from cos / sin, reflections by definition */
function matrix(kind) {
  if (kind === 'rx') return [[1, 0], [0, -1]];
  if (kind === 'ry') return [[-1, 0], [0, 1]];
  const t = { r90: 90, r270: -90, r180: 180 }[kind] * Math.PI / 180, c = Math.round(Math.cos(t)), s = Math.round(Math.sin(t));
  return [[c, -s], [s, c]];
}
const applyM = (m, p) => [m[0][0] * p[0] + m[0][1] * p[1] + 0, m[1][0] * p[0] + m[1][1] * p[1] + 0];
const same = (p, q) => p[0] === q[0] && p[1] === q[1];
/* lengths are kept (the image is congruent) */
function congruent(pts, img) {
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.abs(dist(pts[i], pts[j]) - dist(img[i], img[j])) > 1e-9) return false;
  return true;
}
const boxPts = (q) => q.rows.map((r) => r.parts.filter((p) => p && typeof p === 'object' && 'ans' in p).map((p) => p.ans));
const rowsFor = (names, img) => img.map((p, i) => ({ parts: [`${prime(names[i])} = (`, { ans: p[0] }, ',', { ans: p[1] }, ')'] }));

/* a scalene triangle with whole vertices inside [lo,hi]², not thin */
function randTri(R, xr, yr) {
  for (let k = 0; k < 500; k++) {
    const pts = [0, 1, 2].map(() => [R.int(xr[0], xr[1]), R.int(yr[0], yr[1])]);
    if (area(pts) < 3) continue;
    const d = [dist(pts[0], pts[1]), dist(pts[1], pts[2]), dist(pts[2], pts[0])].sort((a, b) => a - b);
    if (d[1] - d[0] < 0.3 || d[2] - d[1] < 0.3 || d[2] > 6.5) continue;
    return pts;
  }
  return [[2, 1], [5, 2], [3, 4]];
}
const inGrid = (pts, m = 6) => pts.every((p) => Math.abs(p[0]) <= m && Math.abs(p[1]) <= m);
const grid = (extra) => ({ type: 'grid', x: [-6, 6], y: [-6, 6], ...extra });

/* 1. translation of a triangle */
const translate = {
  id: 'translate',
  make(R) {
    let pts, dx, dy, img, g;
    for (let k = 0; k < 300; k++) {
      pts = randTri(R, [-5, 5], [-5, 5]); dx = R.nz(-6, 6); dy = R.nz(-6, 6);
      img = pts.map((p) => [p[0] + dx, p[1] + dy]);
      g = gridPoints([{ pts, names: N3, color: 'a' }]);
      if (inGrid(img, 5) && g.ok) break;
    }
    const hor = `${units(Math.abs(dx))} ${dx > 0 ? 'ימינה' : 'שמאלה'}`, ver = `${units(Math.abs(dy))} ${dy > 0 ? 'למעלה' : 'למטה'}`;
    return {
      tag: 'הזזה',
      text: `קודקודי המשולש הם [[${pt('A', pts[0])}]], [[${pt('B', pts[1])}]], [[${pt('C', pts[2])}]]. מזיזים את המשולש ${hor} ו-${ver}. כתבו את שיעורי הקודקודים של המשולש החדש.`,
      fig: grid({ polys: [{ pts, color: 'a' }], points: g.points, alt: 'משולש במערכת צירים' }),
      rows: rowsFor(N3, img),
      hint: 'הזזה ימינה או שמאלה משנה רק את [[x]]. הזזה למעלה או למטה משנה רק את [[y]]. עושים את אותו שינוי בכל קודקוד.',
      steps: [
        `${dx > 0 ? 'ימינה' : 'שמאלה'}: ${dx > 0 ? 'מוסיפים' : 'מחסירים'} [[${Math.abs(dx)}]] ${dx > 0 ? 'ל' : 'מ'}שיעור ה-[[x]]. ${dy > 0 ? 'למעלה' : 'למטה'}: ${dy > 0 ? 'מוסיפים' : 'מחסירים'} [[${Math.abs(dy)}]] ${dy > 0 ? 'ל' : 'מ'}שיעור ה-[[y]].`,
        ...pts.map((p, i) => `[[${pt(N3[i], p)} → ${pt(prime(N3[i]), img[i])}]]`),
      ],
      data: { pts, dx, dy },
    };
  },
  verify(q) {
    const { pts, dx, dy } = q.data, got = boxPts(q);
    // every vertex moved by the same vector, and that vector is the one in the question
    if (!got.every((p, i) => p[0] - pts[i][0] === dx && p[1] - pts[i][1] === dy)) return 'not the same shift for every vertex';
    if (!congruent(pts, got)) return 'lengths changed';
    return Math.abs(area(pts) - area(got)) < 1e-9 ? true : 'area changed';
  },
};

/* 2. reflection of a triangle in an axis */
const reflect = {
  id: 'reflect',
  make(R) {
    const kind = R.pick(['rx', 'ry']);
    let pts, g;
    for (let k = 0; k < 300; k++) {
      const side = R.sign(), other = [-5, 5], away = side > 0 ? [1, 5] : [-5, -1];      // the whole triangle on one side of the mirror
      pts = kind === 'rx' ? randTri(R, other, away) : randTri(R, away, other);
      g = gridPoints([{ pts, names: N3, color: 'a' }]);
      if (g.ok) break;
    }
    const img = pts.map(MOVE[kind]), ax = kind === 'rx' ? 'x' : 'y', keep = ax, flip = ax === 'x' ? 'y' : 'x';
    return {
      tag: 'שיקוף',
      text: `קודקודי המשולש הם [[${pt('A', pts[0])}]], [[${pt('B', pts[1])}]], [[${pt('C', pts[2])}]]. משקפים את המשולש בציר [[${ax}]]. כתבו את שיעורי הקודקודים של המשולש החדש.`,
      fig: grid({ polys: [{ pts, color: 'a' }], points: g.points, alt: 'משולש במערכת צירים' }),
      rows: rowsFor(N3, img),
      hint: `ציר [[${ax}]] הוא המראה. כל קודקוד עובר לצד השני של הציר, באותו מרחק ממנו.`,
      steps: [
        `בשיקוף בציר [[${ax}]] שיעור ה-[[${keep}]] נשאר, ושיעור ה-[[${flip}]] מחליף סימן: [[${RULE[kind]}]]`,
        ...pts.map((p, i) => `[[${pt(N3[i], p)} → ${pt(prime(N3[i]), img[i])}]]`),
      ],
      data: { pts, kind },
    };
  },
  verify(q) {
    const { pts, kind } = q.data, got = boxPts(q), m = matrix(kind);
    for (let i = 0; i < 3; i++) {
      if (!same(applyM(m, pts[i]), got[i])) return `vertex ${i} differs from the matrix`;
      // the mirror passes through the middle between a point and its image
      const mid = [(pts[i][0] + got[i][0]) / 2, (pts[i][1] + got[i][1]) / 2];
      if ((kind === 'rx' ? mid[1] : mid[0]) !== 0) return 'middle is not on the axis';
    }
    return congruent(pts, got) ? true : 'lengths changed';
  },
};

/* 3. rotation of a segment about the origin */
const rotate = {
  id: 'rotate',
  make(R) {
    const kind = R.pick(['r90', 'r270', 'r180', 'r90']);
    let pts, g;
    for (let k = 0; k < 400; k++) {
      pts = [[R.int(-5, 5), R.int(-5, 5)], [R.int(-5, 5), R.int(-5, 5)]];
      if (pts.some((p) => p[0] === 0 || p[1] === 0) || dist(pts[0], pts[1]) < 2 || dist(pts[0], pts[1]) > 6) continue;
      g = gridPoints([{ pts, names: ['A', 'B'], color: 'a' }]);
      if (g.ok) break;
    }
    const img = pts.map(MOVE[kind]);
    return {
      tag: 'סיבוב',
      text: `נתון הקטע [[AB]]: [[${pt('A', pts[0])}]], [[${pt('B', pts[1])}]]. מבצעים ${NAME[kind]}. כתבו את שיעורי הנקודות [[A']] ו-[[B']].`,
      fig: grid({ lines: [{ from: pts[0], to: pts[1], color: 'a' }], points: g.points, alt: 'קטע במערכת צירים' }),
      rows: rowsFor(['A', 'B'], img),
      hint: kind === 'r180'
        ? 'בסיבוב של [[180°]] סביב הראשית הנקודה עוברת לצד הנגדי של הראשית: שני השיעורים מחליפים סימן.'
        : 'בסיבוב של [[90°]] סביב הראשית שני השיעורים מחליפים מקום, ואחד מהם מחליף סימן. בדקו בציור לאיזה רביע הנקודה עוברת.',
      steps: [
        `הכלל של ${NAME[kind]}: [[${RULE[kind]}]]`,
        ...pts.map((p, i) => `[[${pt('AB'[i], p)} → ${pt(prime('AB'[i]), img[i])}]]`),
        'המרחק של כל נקודה מראשית הצירים לא השתנה.',
      ],
      data: { pts, kind },
    };
  },
  verify(q) {
    const { pts, kind } = q.data, got = boxPts(q), m = matrix(kind), turn = { r90: 90, r270: -90, r180: 180 }[kind];
    for (let i = 0; i < 2; i++) {
      const p = pts[i], g = got[i];
      if (!same(applyM(m, p), g)) return `point ${i} differs from the matrix`;
      if (Math.abs(Math.hypot(...p) - Math.hypot(...g)) > 1e-9) return 'distance from the origin changed';
      // the directed angle from p to its image
      const a = (Math.round((Math.atan2(g[1], g[0]) - Math.atan2(p[1], p[0])) * 180 / Math.PI) + 720) % 360;
      if (a !== (turn + 360) % 360) return `turned by ${a}`;
    }
    return congruent(pts, got) ? true : 'lengths changed';
  },
};

/* 4. which transformation took the solid triangle to the dashed one? */
const KINDS = ['tr', 'rx', 'ry', 'r90', 'r180'];
const OPTION = { tr: 'הזזה', rx: NAME.rx, ry: NAME.ry, r90: NAME.r90, r180: NAME.r180 };
/* is `img` the image of `pts` under this kind? (vertex i → vertex perm[i]) */
function maps(kind, pts, img) {
  if (kind === 'tr') { const d = [img[0][0] - pts[0][0], img[0][1] - pts[0][1]]; return pts.every((p, i) => img[i][0] - p[0] === d[0] && img[i][1] - p[1] === d[1]); }
  const m = matrix(kind);
  return pts.every((p, i) => same(applyM(m, p), img[i]));
}
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const fits = (pts, img) => KINDS.filter((k) => PERMS.some((pm) => maps(k, pts, pm.map((i) => img[i]))));
const identify = {
  id: 'identify',
  make(R) {
    const kind = R.pick(KINDS);
    let pts, img, g;
    for (let k = 0; k < 400; k++) {
      const sx = R.sign(), sy = R.sign();
      pts = randTri(R, [1, 5], [1, 5]).map((p) => [p[0] * sx, p[1] * sy]);              // inside one quadrant
      if (kind === 'tr') {
        const [dx, dy] = R.pick([[-6, 0], [0, -6], [-6, -6]]);
        img = pts.map((p) => [p[0] + dx * sx, p[1] + dy * sy]);
      } else img = pts.map(MOVE[kind]);
      if (fits(pts, img).length !== 1) continue;                                        // only one answer can be right
      g = gridPoints([{ pts, names: N3, color: 'a' }, { pts: img, names: N3.map(prime), color: 'orange' }]);
      if (g.ok) break;
    }
    const a = pts[0], b = img[0];
    const why = {
      tr: ['כל הקודקודים זזו באותו כיוון ובאותו מרחק, והמשולש לא התהפך ולא הסתובב.', `למשל [[${pt('A', a)} → ${pt("A'", b)}]], וכך גם שני הקודקודים האחרים. זו הזזה.`],
      rx: [`בכל קודקוד שיעור ה-[[x]] נשאר ושיעור ה-[[y]] החליף סימן, למשל [[${pt('A', a)} → ${pt("A'", b)}]].`, 'ציר [[x]] הוא המראה: זה שיקוף בציר [[x]].'],
      ry: [`בכל קודקוד שיעור ה-[[y]] נשאר ושיעור ה-[[x]] החליף סימן, למשל [[${pt('A', a)} → ${pt("A'", b)}]].`, 'ציר [[y]] הוא המראה: זה שיקוף בציר [[y]].'],
      r90: [`בכל קודקוד [[${RULE.r90}]], למשל [[${pt('A', a)} → ${pt("A'", b)}]].`, 'המשולש הסתובב רבע סיבוב נגד כיוון השעון סביב ראשית הצירים.'],
      r180: [`בכל קודקוד שני השיעורים החליפו סימן, למשל [[${pt('A', a)} → ${pt("A'", b)}]].`, 'המשולש הסתובב חצי סיבוב סביב ראשית הצירים.'],
    }[kind];
    return {
      tag: 'זיהוי טרנספורמציה',
      text: "המשולש [[ABC]] (בקו מלא) עבר טרנספורמציה, והתקבל המשולש [[A'B'C']] (בקו מקווקו). איזו טרנספורמציה בוצעה?",
      fig: grid({ polys: [{ pts, color: 'a' }, { pts: img, color: 'orange', dashed: true }], points: g.points, alt: 'שני משולשים במערכת צירים' }),
      choices: { options: KINDS.map((k) => OPTION[k]), correct: KINDS.indexOf(kind) },
      hint: 'השוו בין השיעורים של [[A]] לשיעורים של [[A\']], וכך גם בשאר הקודקודים. מה נשאר ומה השתנה?',
      steps: why,
      data: { pts, img, kind },
    };
  },
  verify(q) {
    const { pts, img } = q.data;
    const ok = KINDS.filter((k) => maps(k, pts, img)), loose = fits(pts, img);
    if (ok.length !== 1 || loose.length !== 1) return `fits ${ok.join(',')} / ${loose.join(',')}`;
    if (!congruent(pts, img)) return 'not congruent';
    return KINDS[q.choices.correct] === ok[0] && q.choices.options[q.choices.correct] === OPTION[ok[0]] ? true : 'wrong option marked';
  },
};

/* 5. the image is congruent: lengths and area are kept */
const keeps = {
  id: 'congruent',
  make(R) {
    const kind = R.pick(['tr', 'rx', 'ry', 'r90', 'r270', 'r180']);
    let pts, w, h, g, dx = 0, dy = 0;
    for (let k = 0; k < 300; k++) {
      w = R.int(2, 5); h = R.int(2, 5);
      if (w === h) continue;
      const x0 = R.int(-5, 5 - w), y0 = R.int(-5, 5 - h);
      pts = [[x0, y0], [x0 + w, y0], R.bool() ? [x0, y0 + h] : [x0 + w, y0 + h]];        // AB lies along the grid
      if (R.bool()) pts = [pts[0], pts[2], pts[1]];
      g = gridPoints([{ pts, names: N3, color: 'a' }]);
      if (g.ok) break;
    }
    if (kind === 'tr') { dx = R.nz(-4, 4); dy = R.nz(-4, 4); }
    const did = kind === 'tr'
      ? `הזזה של ${units(Math.abs(dx))} ${dx > 0 ? 'ימינה' : 'שמאלה'} ו-${units(Math.abs(dy))} ${dy > 0 ? 'למעלה' : 'למטה'}`
      : NAME[kind];
    // the two sides that lie along the grid lines
    const along = [[0, 1], [1, 2], [0, 2]].filter(([i, j]) => pts[i][0] === pts[j][0] || pts[i][1] === pts[j][1]);
    const [i, j] = R.pick(along), len = dist(pts[i], pts[j]), S = w * h / 2;
    const side = N3[i] + N3[j], side2 = prime(N3[i]) + prime(N3[j]);
    return {
      tag: 'צורות חופפות',
      text: `על המשולש [[ABC]] שבציור מבצעים ${did}, ומתקבל המשולש [[A'B'C']]. כל משבצת היא יחידה אחת. בלי לשרטט: מה אורך הצלע [[${side2}]], ומה שטח המשולש [[A'B'C']]?`,
      fig: grid({ polys: [{ pts, color: 'a' }], points: g.points, alt: 'משולש ישר זווית במערכת צירים' }),
      rows: [
        { parts: [`${side2} =`, { ans: len }, { t: 'יחידות' }] },
        { label: `שטח המשולש [[A'B'C']]:`, parts: [{ ans: S }, { t: 'יחידות שטח' }] },
      ],
      hint: 'הזזה, שיקוף וסיבוב לא משנים את הצורה ולא את הגודל שלה. מספיק למדוד במשולש המקורי.',
      steps: [
        'המשולש החדש חופף למשולש המקורי, ולכן אורכי הצלעות והשטח נשמרים.',
        `סופרים משבצות: [[${side} = ${len}]], ולכן גם [[${side2} = ${len}]].`,
        `הניצבים של המשולש הם [[${w}]] ו-[[${h}]], ולכן השטח: [[{${w} * ${h}|2} = ${num(S)}]] יחידות שטח.`,
      ],
      data: { pts, kind, dx, dy, i, j },
    };
  },
  verify(q) {
    const { pts, kind, dx, dy, i, j } = q.data;
    const img = kind === 'tr' ? pts.map((p) => [p[0] + dx, p[1] + dy]) : pts.map((p) => applyM(matrix(kind), p));
    const len = dist(img[i], img[j]), S = area(img);
    return Math.abs(q.rows[0].parts[1].ans - len) < 1e-9 && Math.abs(q.rows[1].parts[0].ans - S) < 1e-9 ? true : `image has side ${len}, area ${S}`;
  },
};

export default {
  id: 'transformations',
  name: 'הזזה, שיקוף וסיבוב',
  grade: 'ז׳–ח׳',
  about: 'מעבירים צורה למקום חדש במערכת הצירים ומוצאים את השיעורים החדשים; הצורה נשארת חופפת',
  place: 'נושא חדש בתחום הגיאומטריה ("טרנספורמציות"). הפרק נשען על מערכת הצירים, ולכן מקומו אחרי הנושא "פונקציה לינארית" ← "2. סימון נקודות"',
  lesson: [
    { t: 'מהי טרנספורמציה?', items: [
      'הזזה, שיקוף וסיבוב הן שלוש דרכים להעביר צורה למקום חדש. הצורה החדשה חופפת לצורה המקורית: אותן צלעות, אותן זוויות ואותו שטח.',
      'את הנקודה החדשה מסמנים באותה אות עם תג: הנקודה [[A]] עוברת לנקודה [[A\']].',
    ] },
    { t: 'הזזה', items: [
      'בהזזה כל הנקודות זזות באותו כיוון ובאותו מרחק.',
      { list: ['ימינה: מוסיפים ל-[[x]]. שמאלה: מחסירים מ-[[x]].', 'למעלה: מוסיפים ל-[[y]]. למטה: מחסירים מ-[[y]].'] },
      { ex: 'מזיזים את הנקודה [[A(2, 1)]] 3 יחידות ימינה ו-4 יחידות למטה. לאן היא מגיעה?', sol: ['ימינה 3: [[x = 2 + 3 = 5]]', 'למטה 4: [[y = 1 - 4 = -3]]', 'התשובה: [[A\'(5, -3)]]'] },
    ] },
    { t: 'שיקוף', items: [
      'בשיקוף הציר הוא מראה: כל נקודה עוברת לצד השני של הציר, באותו מרחק ממנו.',
      'שיקוף בציר [[x]]: שיעור ה-[[y]] מחליף סימן.',
      { f: '(x, y) → (x, -y)' },
      'שיקוף בציר [[y]]: שיעור ה-[[x]] מחליף סימן.',
      { f: '(x, y) → (-x, y)' },
      { fig: { type: 'grid', x: [-6, 6], y: [-6, 6], polys: [{ pts: [[2, 1], [5, 2], [3, 4]], color: 'a' }, { pts: [[-2, 1], [-5, 2], [-3, 4]], color: 'orange', dashed: true }],
        points: gridPoints([{ pts: [[2, 1], [5, 2], [3, 4]], names: N3, color: 'a' }, { pts: [[-2, 1], [-5, 2], [-3, 4]], names: N3.map(prime), color: 'orange' }]).points,
        caption: 'שיקוף בציר [[y]]', alt: 'משולש והשיקוף שלו בציר y' } },
      { note: 'טעות נפוצה: בשיקוף בציר [[x]] משנים את [[y]], ולא את [[x]]. הנקודה נשארת באותו מקום לאורך הציר ורק עוברת לצד השני שלו.' },
    ] },
    { t: 'סיבוב סביב ראשית הצירים', items: [
      'בסיבוב כל נקודה נעה על מעגל סביב ראשית הצירים, והמרחק שלה מהראשית לא משתנה.',
      { list: ['סיבוב של [[180°]]: [[(x, y) → (-x, -y)]]', 'סיבוב של [[90°]] נגד כיוון השעון: [[(x, y) → (-y, x)]]', 'סיבוב של [[90°]] עם כיוון השעון: [[(x, y) → (y, -x)]]'] },
      { ex: 'מסובבים את הנקודה [[A(4, 1)]] ב-[[90°]] נגד כיוון השעון סביב ראשית הצירים. לאן היא מגיעה?', sol: ['הכלל: [[(x, y) → (-y, x)]]', 'מציבים [[x = 4]], [[y = 1]]: [[(-1, 4)]]', 'התשובה: [[A\'(-1, 4)]]. הנקודה עברה מהרביע הראשון לרביע השני.'] },
    ] },
  ],
  gens: [translate, reflect, rotate, identify, keeps],
};
