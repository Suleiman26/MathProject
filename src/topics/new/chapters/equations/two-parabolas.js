/* חיתוך שתי פרבולות (כיתה ט׳) — board #84
   A system of two quadratic functions: equate, solve (a quadratic, or a linear equation when
   the x² terms cancel), find the points; and the graphic meaning (how many points, reading them). */
import { num, poly, sum, term, signed } from '../../core.js';

const ev = ([a, b, c], x) => a * x * x + b * x + c;
const pt = (x, y) => `(${num(x)}, ${num(y)})`;
const fx = (name, c) => `${name}(x) = ${poly(c)}`;
const terms = (c) => c.filter((v) => v !== 0).length;
const sq = (p) => (p === 0 ? 'x^2' : `(x ${signed(-p)})^2`);
const boxes = (q) => q.rows.flatMap((r) => r.parts.filter((p) => p && typeof p === 'object' && 'ans' in p).map((p) => p.ans));
/** whole x in [-60, 60] where the two functions meet */
const meetings = (f, g) => { const out = []; for (let x = -60; x <= 60; x++) if (ev(f, x) === ev(g, x)) out.push(x); return out; };
const pointRow = (label, x, y) => ({ label, parts: ['(', { ans: x }, ',', { ans: y }, ')'] });

/* 1. two points: equate → quadratic with whole solutions */
const twoPoints = {
  id: 'two-points',
  make(R) {
    let a1, a2, D, p, q, f, g;
    do {
      [a1, a2] = R.pick([[1, -1], [-1, 1], [2, 1], [1, 2], [2, -1], [-1, -2], [1, -2]]); D = a1 - a2;
      p = R.int(-4, 4); q = R.int(p + 1, 5);
      const b2 = R.int(-4, 4), c2 = R.int(-6, 8);
      g = [a2, b2, c2]; f = [a1, b2 - D * (p + q), c2 + D * p * q];
    } while (terms(f) < 2 || terms(g) < 2 || Math.abs(f[1]) > 12 || Math.abs(f[2]) > 20 || Math.abs(ev(g, p)) > 30 || Math.abs(ev(g, q)) > 30);
    const y1 = ev(g, p), y2 = ev(g, q);
    const diff = [D, -D * (p + q), D * p * q], simple = [1, -(p + q), p * q];
    // substitute in the function with the smaller numbers
    const [sn, sc] = Math.abs(f[1]) + Math.abs(f[2]) <= Math.abs(g[1]) + Math.abs(g[2]) ? ['f', f] : ['g', g];
    return {
      tag: 'נקודות חיתוך של שתי פרבולות',
      text: `מצאו את נקודות החיתוך של הפרבולות:\n[[${fx('f', f)}]]\n[[${fx('g', g)}]]`,
      rows: [pointRow('נקודה אחת:', p, y1), pointRow('נקודה שנייה:', q, y2)],
      swap: [[[0, 1], [2, 3]]],
      hint: 'בנקודת חיתוך לשתי הפונקציות יש אותו [[y]]. השוו בין שני הביטויים, העבירו הכול לאגף אחד ופתרו את המשוואה הריבועית. לכל [[x]] מצאו גם את ה-[[y]].',
      steps: [
        `משווים בין הפונקציות: [[${poly(f)} = ${poly(g)}]]`,
        `מעבירים הכול לאגף אחד ומכנסים: [[${poly(diff)} = 0]]${D === 1 ? '' : `. מחלקים ב-[[${num(D)}]]: [[${poly(simple)} = 0]]`}`,
        `הפתרונות: [[x_1 = ${num(p)}]], [[x_2 = ${num(q)}]]`,
        `מציבים ב-[[${sn}(x)]]: [[${sn}(${num(p)}) = ${num(y1)}]], [[${sn}(${num(q)}) = ${num(y2)}]]`,
        `נקודות החיתוך: [[${pt(p, y1)}]] ו-[[${pt(q, y2)}]]`,
      ],
      data: { f, g },
    };
  },
  verify(q) {
    const { f, g } = q.data; const [x1, y1, x2, y2] = boxes(q);
    if (f[0] === g[0]) return 'the x² terms cancel';
    for (const [x, y] of [[x1, y1], [x2, y2]]) if (ev(f, x) !== y || ev(g, x) !== y) return `(${x}, ${y}) is not on both curves`;
    const m = meetings(f, g);
    return m.length === 2 && m.includes(x1) && m.includes(x2) && x1 !== x2 ? true : 'the meeting points are not exactly these two';
  },
};

/* 2. same leading coefficient: the x² terms cancel, one point */
const onePoint = {
  id: 'one-point',
  make(R) {
    let a, x0, f, g;
    do {
      a = R.pick([1, 1, -1, 2]); x0 = R.nz(-5, 5);
      const b1 = R.int(-6, 6), b2 = R.int(-6, 6), c2 = R.int(-8, 8);
      g = [a, b2, c2]; f = [a, b1, c2 + (b2 - b1) * x0];
    } while (f[1] === g[1] || terms(f) < 2 || terms(g) < 2 || Math.abs(f[2]) > 20 || Math.abs(ev(g, x0)) > 30 || (f[1] === 0 && f[2] === 0) || (g[1] === 0 && g[2] === 0));
    const y0 = ev(g, x0);
    const lin = (c) => sum([[c[1], 'x'], [c[2], '']]);
    // collect x on the side where its coefficient stays positive
    const k = f[1] - g[1], rhs = g[2] - f[2];
    return {
      tag: 'חיתוך פרבולות עם אותו מקדם',
      text: `מצאו את נקודת החיתוך של הפרבולות:\n[[${fx('f', f)}]]\n[[${fx('g', g)}]]`,
      rows: [pointRow('נקודת החיתוך:', x0, y0)],
      hint: 'השוו בין שני הביטויים. שימו לב מה קורה לאיברים עם [[x^2]] בשני האגפים. אחרי שמצאתם את [[x]], הציבו כדי למצוא את [[y]].',
      steps: [
        `משווים בין הפונקציות: [[${poly(f)} = ${poly(g)}]]`,
        `האיבר [[${term(a, 'x^2')}]] מופיע בשני האגפים ומצטמצם. נשארת משוואה ממעלה ראשונה: [[${lin(f)} = ${lin(g)}]]`,
        k > 0 ? `[[${term(k, 'x')} = ${num(rhs)}]], ולכן [[x = ${num(x0)}]]` : `[[${num(-rhs)} = ${term(-k, 'x')}]], ולכן [[x = ${num(x0)}]]`,
        `מציבים ב-[[f(x)]]: [[f(${num(x0)}) = ${num(y0)}]]`,
        `לפרבולות נקודת חיתוך אחת: [[${pt(x0, y0)}]]`,
      ],
      data: { f, g },
    };
  },
  verify(q) {
    const { f, g } = q.data; const [x, y] = boxes(q);
    if (f[0] !== g[0]) return 'leading coefficients differ';
    if (ev(f, x) !== y || ev(g, x) !== y) return 'the point is not on both curves';
    const m = meetings(f, g);
    return m.length === 1 && m[0] === x ? true : 'not exactly one meeting point';
  },
};

/* a drawing of two parabolas on a 12 × 12 grid.
   kind: 'two' | 'one' | 'none'  (a smiling and a frowning parabola), 'cross' (same leading coefficient) */
const WIN = { x: [-6, 6], y: [-6, 6] };
function curve(c) {
  const pts = [];
  for (let i = 0; i <= 240; i++) { const x = -6 + i / 20, y = ev(c, x); if (y >= WIN.y[0] && y <= WIN.y[1]) pts.push([Math.round(x * 100) / 100, Math.round(y * 1000) / 1000]); }
  return pts;
}
const inside = (x, y, m = 5) => Math.abs(x) <= m && Math.abs(y) <= m;
function scene(R, kind) {
  for (;;) {
    let up, down, info;
    if (kind === 'cross') {
      const a = R.sign(), h1 = R.int(-3, 3), h2 = R.int(-3, 3), k1 = R.int(-4, 4), k2 = R.int(-4, 4);
      if (h1 === h2 || k1 === k2) continue;
      up = [a, -2 * a * h1, a * h1 * h1 + k1]; down = [a, -2 * a * h2, a * h2 * h2 + k2];
      const xs = (down[2] - up[2]) / (up[1] - down[1]);
      if (!Number.isInteger(xs) || !inside(xs, ev(up, xs), 4) || !inside(h1, k1) || !inside(h2, k2)) continue;
      info = { xs: [xs] };
    } else {
      const p = R.int(-3, 3), e = R.int(-1, 1), h = p + e, k = R.int(-3, 5);
      const s = kind === 'two' ? R.pick([1, 4]) : kind === 'one' ? 0 : -R.int(1, 3);
      down = [-1, 2 * h, k - h * h];                                          // −(x − h)² + k
      up = [1, 2 * h - 4 * p, 2 * p * p - h * h + k - 2 * s];                 // down + 2((x − p)² − s)
      const n = Math.sqrt(Math.max(s, 0));
      const xs = kind === 'two' ? [p - n, p + n] : kind === 'one' ? [p] : [];
      if (!inside(h, k) || !inside(p - e, ev(up, p - e)) || xs.some((x) => !inside(x, ev(up, x)))) continue;
      if (kind === 'none' && ev(up, p - e) - k < 2) continue;                 // a clear gap between the curves
      info = { xs, p, s };
    }
    const swapNames = R.bool();
    const [f, g] = swapNames ? [down, up] : [up, down];
    const fig = { type: 'grid', x: WIN.x, y: WIN.y, curves: [{ pts: curve(f), color: 'blue' }, { pts: curve(g), color: 'orange' }], caption: 'כחול: [[f(x)]], כתום: [[g(x)]]', alt: 'שתי פרבולות במערכת צירים' };
    if (fig.curves.some((c) => c.pts.length < 30)) continue;
    return { f, g, fig, ...info };
  }
}
function figOk(q) {
  const { f, g } = q.data; const [cf, cg] = q.fig.curves;
  for (const [c, fn] of [[cf, f], [cg, g]]) {
    if (c.pts.length < 30) return 'a curve is too short';
    for (const [x, y] of c.pts) { if (Math.abs(ev(fn, x) - y) > 0.01) return 'a drawn curve is not its function'; if (Math.abs(x) > 6 || Math.abs(y) > 6) return 'a curve leaves the grid'; }
  }
  return true;
}
/** number of meeting points, from the coefficients */
function countMeet(f, g) {
  const [A, B, C] = [f[0] - g[0], f[1] - g[1], f[2] - g[2]];
  if (A === 0) return B === 0 ? (C === 0 ? Infinity : 0) : 1;
  const disc = B * B - 4 * A * C;
  return disc > 0 ? 2 : disc === 0 ? 1 : 0;
}

/* 3. how many meeting points? */
const COUNT_OPTS = ['אין נקודות חיתוך', 'נקודת חיתוך אחת', 'שתי נקודות חיתוך'];
const howMany = {
  id: 'how-many',
  make(R) {
    const kind = R.pick(['two', 'two', 'one', 'none', 'none', 'cross']);
    const sc = scene(R, kind);
    const { f, g, fig } = sc;
    const n = kind === 'two' ? 2 : kind === 'none' ? 0 : 1;
    let algebra, end;
    if (kind === 'cross') {
      algebra = `בדיקה אלגברית: משווים [[${poly(f)} = ${poly(g)}]]. האיברים עם [[x^2]] מצטמצמים ונשארת משוואה ממעלה ראשונה, שיש לה פתרון אחד: [[x = ${num(sc.xs[0])}]]`;
      end = 'לכן יש לפרבולות נקודת חיתוך אחת.';
    } else {
      const { p, s } = sc;
      algebra = `בדיקה אלגברית: משווים [[${poly(f)} = ${poly(g)}]], מעבירים אגף ומצמצמים: ${p === 0 ? '' : `[[${poly([1, -2 * p, p * p - s])} = 0]], כלומר `}[[${sq(p)} = ${num(s)}]]`;
      end = kind === 'two' ? `למשוואה שני פתרונות, [[x_1 = ${num(sc.xs[0])}]] ו-[[x_2 = ${num(sc.xs[1])}]], לכן יש שתי נקודות חיתוך.`
        : kind === 'one' ? `למשוואה פתרון אחד, [[x = ${num(p)}]], לכן יש נקודת חיתוך אחת: הפרבולות נוגעות זו בזו.`
          : 'ריבוע של מספר אינו יכול להיות שלילי, לכן למשוואה אין פתרון ואין נקודות חיתוך.';
    }
    return {
      tag: 'כמה נקודות חיתוך?',
      text: `בשרטוט הגרפים של הפונקציות:\n[[${fx('f', f)}]]\n[[${fx('g', g)}]]\nכמה נקודות חיתוך יש לשתי הפרבולות?`,
      fig,
      choices: { options: COUNT_OPTS, correct: n },
      hint: 'נקודת חיתוך היא נקודה שנמצאת על שני הגרפים. ספרו בשרטוט בכמה נקודות הגרפים נפגשים. שימו לב: שתי פרבולות נפגשות בשתי נקודות לכל היותר.',
      steps: [
        `נקודת חיתוך היא נקודה ששייכת לשני הגרפים. בשרטוט רואים ${n === 0 ? 'שהגרפים לא נפגשים' : n === 1 ? 'שהגרפים נפגשים בנקודה אחת' : 'שהגרפים נפגשים בשתי נקודות'}.`,
        algebra,
        end,
      ],
      data: { f, g, kind },
    };
  },
  verify(q) {
    const { f, g } = q.data;
    const ok = figOk(q); if (ok !== true) return ok;
    const n = countMeet(f, g);
    if (COUNT_OPTS[q.choices.correct] !== COUNT_OPTS[n]) return `the curves meet ${n} times`;
    // every meeting point is visible in the drawing (they have whole x here)
    const m = meetings(f, g);
    if (m.length !== n) return 'meeting points are not at whole x';
    return m.every((x) => inside(x, ev(f, x))) ? true : 'a meeting point is outside the drawing';
  },
};

/* 4. read the two meeting points from the drawing, check by substituting */
const readGraph = {
  id: 'read-graph',
  make(R) {
    const { f, g, fig, xs } = scene(R, 'two');
    const [x1, x2] = xs, y1 = ev(f, x1), y2 = ev(f, x2);
    return {
      tag: 'קריאת נקודות חיתוך מגרף',
      text: `בשרטוט הגרפים של הפונקציות:\n[[${fx('f', f)}]]\n[[${fx('g', g)}]]\nקראו מהשרטוט את שתי נקודות החיתוך של הפרבולות.`,
      fig,
      rows: [pointRow('נקודה אחת:', x1, y1), pointRow('נקודה שנייה:', x2, y2)],
      swap: [[[0, 1], [2, 3]]],
      hint: 'חפשו את הנקודות שבהן שני הגרפים נפגשים. בכל נקודה קוראים קודם את [[x]] (על הציר האופקי) ואחר כך את [[y]] (על הציר האנכי).',
      steps: [
        `הגרפים נפגשים בשתי נקודות: [[${pt(x1, y1)}]] ו-[[${pt(x2, y2)}]].`,
        `בדיקה בהצבה של [[x = ${num(x1)}]]: [[f(${num(x1)}) = ${num(y1)}]] וגם [[g(${num(x1)}) = ${num(ev(g, x1))}]]. שתי הפונקציות נותנות אותו [[y]].`,
        `בדיקה בהצבה של [[x = ${num(x2)}]]: [[f(${num(x2)}) = ${num(y2)}]] וגם [[g(${num(x2)}) = ${num(ev(g, x2))}]].`,
        'נקודת חיתוך היא פתרון של מערכת המשוואות: היא מקיימת את שתי המשוואות.',
      ],
      data: { f, g },
    };
  },
  verify(q) {
    const { f, g } = q.data; const [x1, y1, x2, y2] = boxes(q);
    const ok = figOk(q); if (ok !== true) return ok;
    for (const [x, y] of [[x1, y1], [x2, y2]]) { if (ev(f, x) !== y || ev(g, x) !== y) return 'a point is not on both curves'; if (!inside(x, y)) return 'a point is outside the drawing'; }
    const m = meetings(f, g);
    return countMeet(f, g) === 2 && m.length === 2 && m.includes(x1) && m.includes(x2) && x1 !== x2 ? true : 'the meeting points are not exactly these two';
  },
};

const lessonFig = (() => {
  const f = [1, -2, -1], g = [-1, 2, 5];
  const c = (k) => { const pts = []; for (let i = 0; i <= 200; i++) { const x = -4 + i / 20, y = ev(k, x); if (y >= -3 && y <= 7) pts.push([Math.round(x * 100) / 100, Math.round(y * 1000) / 1000]); } return pts; };
  return { type: 'grid', x: [-4, 6], y: [-3, 7], curves: [{ pts: c(f), color: 'blue' }, { pts: c(g), color: 'orange' }], points: [{ x: -1, y: 2, label: '(-1, 2)', color: 'green', dx: -9, dy: -4 }, { x: 3, y: 2, label: '(3, 2)', color: 'green', dx: 9, dy: -4 }], caption: 'כחול: [[f(x) = x^2 - 2x - 1]], כתום: [[g(x) = -x^2 + 2x + 5]]' };
})();

export default {
  id: 'two-parabolas',
  name: 'חיתוך שתי פרבולות',
  grade: 'ט׳',
  about: 'מוצאים את הנקודות שבהן שתי פרבולות נפגשות: משווים בין הפונקציות, פותרים ומציבים',
  place: 'הנושא "נקודות חיתוך" ← פרק חדש 3, אחרי "2. ישר–פרבולה"',
  lesson: [
    { t: 'מהי נקודת חיתוך של שתי פרבולות?', items: [
      'נקודת חיתוך היא נקודה שנמצאת על שני הגרפים. בנקודה כזאת לשתי הפונקציות יש אותו [[x]] ואותו [[y]].',
      { fig: lessonFig },
      'מבחינה אלגברית, נקודת חיתוך היא פתרון של מערכת משוואות ממעלה שנייה: זוג [[(x, y)]] שמקיים את שתי המשוואות.',
    ] },
    { t: 'איך מוצאים?', items: [
      { list: [
        'משווים בין שני הביטויים, כי ה-[[y]] שווה.',
        'מעבירים הכול לאגף אחד ופותרים את המשוואה.',
        'מציבים כל [[x]] שמצאתם באחת הפונקציות ומוצאים את ה-[[y]].',
      ] },
      { ex: 'מצאו את נקודות החיתוך של [[f(x) = x^2 - 2x - 1]] ושל [[g(x) = -x^2 + 2x + 5]].', sol: [
        'משווים: [[x^2 - 2x - 1 = -x^2 + 2x + 5]]',
        'מעבירים הכול לאגף אחד: [[2x^2 - 4x - 6 = 0]]. מחלקים ב-[[2]]: [[x^2 - 2x - 3 = 0]]',
        'הפתרונות: [[x_1 = -1]], [[x_2 = 3]]',
        'מציבים ב-[[f(x)]]: [[f(-1) = 2]], [[f(3) = 2]]',
        'נקודות החיתוך: [[(-1, 2)]] ו-[[(3, 2)]]',
      ] },
      { note: 'נקודה היא גם [[x]] וגם [[y]]. אחרי שפתרתם את המשוואה ומצאתם את [[x]], אל תשכחו להציב ולמצוא את [[y]].' },
    ] },
    { t: 'כמה נקודות חיתוך יכולות להיות?', items: [
      'מספר נקודות החיתוך שווה למספר הפתרונות של המשוואה שמתקבלת:',
      { list: [
        'שני פתרונות: שתי נקודות חיתוך.',
        'פתרון אחד: נקודת חיתוך אחת.',
        'אין פתרון: הפרבולות לא נפגשות.',
      ] },
      'כשלשתי הפרבולות אותו מקדם של [[x^2]], האיברים האלה מצטמצמים ונשארת משוואה ממעלה ראשונה. אז יש נקודת חיתוך אחת.',
      { ex: 'מצאו את נקודת החיתוך של [[f(x) = x^2 + 3x - 2]] ושל [[g(x) = x^2 + x + 4]].', sol: [
        'משווים: [[x^2 + 3x - 2 = x^2 + x + 4]]',
        'האיבר [[x^2]] מצטמצם: [[3x - 2 = x + 4]]',
        '[[2x = 6]], ולכן [[x = 3]]',
        'מציבים: [[f(3) = 9 + 9 - 2 = 16]]. נקודת החיתוך: [[(3, 16)]]',
      ] },
    ] },
  ],
  gens: [twoPoints, onePoint, howMany, readGraph],
};
