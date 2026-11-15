/* אי-שוויון ריבועי (כיתה ט׳) — board #84
   Method of the curriculum: find the roots, sketch the parabola (smiling / frowning), read
   where it is above / below the x-axis.
   Answers are written with the textbook forms only:  a < x < b   |   x < a או x > b. */
import { num, poly, factor } from '../../core.js';

/* a solution set: in = between lo and hi, out = outside them, lt = left of lo, gt = right of hi */
const setStr = ({ shape, lo, hi, strict }) => {
  const l = strict ? '<' : '<=', g = strict ? '>' : '>=';
  if (shape === 'in') return `[[${num(lo)} ${l} x ${l} ${num(hi)}]]`;
  if (shape === 'out') return `[[x ${l} ${num(lo)}]] או [[x ${g} ${num(hi)}]]`;
  return shape === 'lt' ? `[[x ${l} ${num(lo)}]]` : `[[x ${g} ${num(hi)}]]`;
};
const inSet = ({ shape, lo, hi, strict }, x) => {
  const below = strict ? x < lo : x <= lo, above = strict ? x > hi : x >= hi;
  if (shape === 'in') return strict ? x > lo && x < hi : x >= lo && x <= hi;
  if (shape === 'out') return below || above;
  return shape === 'lt' ? below : above;
};
const value = ([A, B, C], x) => A * x * x + B * x + C;
const truth = (coefs, op, x) => { const v = value(coefs, x); return op === '<' ? v < 0 : op === '<=' ? v <= 0 : op === '>' ? v > 0 : v >= 0; };
const SAMPLES = Array.from({ length: 81 }, (_, i) => -20 + i * 0.5);
const shapeOf = (A, op) => ((A > 0) === op.startsWith('<') ? 'in' : 'out');

const SIGN = {
  '<': 'שלילי, כלומר איפה הפרבולה מתחת לציר ה-[[x]]',
  '<=': 'שלילי או שווה ל-[[0]], כלומר איפה הפרבולה מתחת לציר ה-[[x]] או עליו',
  '>': 'חיובי, כלומר איפה הפרבולה מעל ציר ה-[[x]]',
  '>=': 'חיובי או שווה ל-[[0]], כלומר איפה הפרבולה מעל ציר ה-[[x]] או עליו',
};
const smile = (A) => (A > 0
  ? 'המקדם של [[x^2]] חיובי, לכן הפרבולה "מחייכת": בין השורשים היא מתחת לציר ה-[[x]], ומשני הצדדים היא מעליו.'
  : 'המקדם של [[x^2]] שלילי, לכן הפרבולה "בוכה": בין השורשים היא מעל ציר ה-[[x]], ומשני הצדדים היא מתחתיו.');

/* the shared multiple-choice question: right shape + right roots against wrong shape / wrong signs of the roots */
function choiceQ(R, { A, r1, r2, op, tag, text, rootStep, hint }) {
  const strict = op.length === 1, shape = shapeOf(A, op);
  const good = { shape, lo: r1, hi: r2, strict };
  const opts = R.shuffle([
    good,
    { shape: shape === 'in' ? 'out' : 'in', lo: r1, hi: r2, strict },
    { shape: 'in', lo: -r2, hi: -r1, strict },
    { shape: 'out', lo: -r2, hi: -r1, strict },
  ]);
  const coefs = [A, -A * (r1 + r2), A * r1 * r2];
  return {
    tag, text,
    choices: { options: opts.map(setStr), correct: opts.indexOf(good) },
    hint,
    steps: [
      rootStep,
      smile(A),
      `מחפשים איפה הביטוי ${SIGN[op]}: ${shape === 'in' ? 'בין השורשים' : 'משני צדי השורשים'}.${strict ? '' : ' השורשים עצמם כלולים בפתרון, כי שם הביטוי שווה ל-[[0]].'}`,
      `הפתרון: ${setStr(good)}`,
    ],
    data: { coefs, op, opts },
  };
}
function verifyChoice(q) {
  const { coefs, op, opts } = q.data;
  if (opts.length !== q.choices.options.length) return 'options mismatch';
  for (let i = 0; i < opts.length; i++) {
    if (setStr(opts[i]) !== q.choices.options[i]) return 'option text differs from its data';
    const same = SAMPLES.every((x) => truth(coefs, op, x) === inSet(opts[i], x));
    if (i === q.choices.correct && !same) return 'the marked option is not the solution set';
    if (i !== q.choices.correct && same) return 'another option is also right';
  }
  return true;
}
const twoRoots = (R, lo, hi, nonZero) => { let a, b; do { a = R.int(lo, hi); b = R.int(lo, hi); } while (a >= b || a + b === 0 || (nonZero && a * b === 0) || b - a > 9); return [a, b]; };
const HINT = 'מצאו קודם את השורשים. אחר כך שרטטו סקיצה של הפרבולה (מחייכת או בוכה?) וקראו ממנה איפה היא מעל ציר ה-[[x]] ואיפה מתחתיו.';

/* 1. (x − a)(x − b) > 0 */
const factored = {
  id: 'factored',
  make(R) {
    const [r1, r2] = twoRoots(R, -7, 8, false), op = R.pick(['<', '>', '<', '>', '<=', '>=']);
    const fs = R.shuffle([factor(-r1), factor(-r2)]);
    const expr = fs[0] === 'x' || fs[1] !== 'x' ? fs.join('') : fs[1] + fs[0];
    return choiceQ(R, {
      A: 1, r1, r2, op, tag: 'אי-שוויון ריבועי בצורת מכפלה', hint: HINT,
      text: `פתרו את אי-השוויון:\n[[${expr} ${op} 0]]`,
      rootStep: `מכפלה שווה ל-[[0]] כשאחד הגורמים שווה ל-[[0]]. השורשים: [[x_1 = ${num(r1)}]], [[x_2 = ${num(r2)}]]`,
    });
  },
  verify: verifyChoice,
};

/* 2. x² + bx + c < 0 */
const standard = {
  id: 'standard',
  make(R) {
    const [r1, r2] = twoRoots(R, -7, 8, true), op = R.pick(['<', '>', '<', '>', '<=', '>=']);
    const p = poly([1, -(r1 + r2), r1 * r2]);
    return choiceQ(R, {
      A: 1, r1, r2, op, tag: 'אי-שוויון ריבועי', hint: HINT,
      text: `פתרו את אי-השוויון:\n[[${p} ${op} 0]]`,
      rootStep: `פותרים את המשוואה [[${p} = 0]]. השורשים: [[x_1 = ${num(r1)}]], [[x_2 = ${num(r2)}]]`,
    });
  },
  verify: verifyChoice,
};

/* 3. −x² + bx + c > 0: the parabola frowns */
const negative = {
  id: 'negative-leading',
  make(R) {
    const [r1, r2] = twoRoots(R, -6, 7, true), op = R.pick(['<', '>', '<', '>', '<=', '>=']), A = R.pick([-1, -1, -2]);
    const p = poly([A, -A * (r1 + r2), A * r1 * r2]);
    return choiceQ(R, {
      A, r1, r2, op, tag: 'אי-שוויון ריבועי עם מקדם שלילי',
      hint: 'מצאו את השורשים, ושימו לב למקדם של [[x^2]]: הוא שלילי, ולכן הפרבולה "בוכה". איפה היא מעל ציר ה-[[x]]?',
      text: `פתרו את אי-השוויון:\n[[${p} ${op} 0]]`,
      rootStep: `פותרים את המשוואה [[${p} = 0]]. השורשים: [[x_1 = ${num(r1)}]], [[x_2 = ${num(r2)}]]`,
    });
  },
  verify: verifyChoice,
};

/* 4. read the solution from a drawn parabola */
const fromGraph = {
  id: 'from-graph',
  make(R) {
    let r1, r2, A;
    do { r1 = R.int(-5, 3); r2 = r1 + R.int(2, 5); A = R.sign(); } while (r2 > 5);
    const op = R.pick(['<', '>']);
    const f = (x) => A * (x - r1) * (x - r2);
    const depth = Math.abs(f((r1 + r2) / 2));
    const x0 = Math.min(r1 - 2, -1), x1 = Math.max(r2 + 2, 1);
    const [y0, y1] = A > 0 ? [-Math.ceil(depth) - 1, 5] : [-5, Math.ceil(depth) + 1];
    const pts = [];
    for (let i = 0; i <= (x1 - x0) * 20; i++) { const x = x0 + i / 20, y = f(x); if (y >= y0 && y <= y1) pts.push([Math.round(x * 100) / 100, Math.round(y * 1000) / 1000]); }
    const shape = shapeOf(A, op);
    const good = { shape, lo: r1, hi: r2, strict: true };
    const opts = R.shuffle([good, { shape: shape === 'in' ? 'out' : 'in', lo: r1, hi: r2, strict: true }, { shape: 'lt', lo: r1, hi: r2, strict: true }, { shape: 'gt', lo: r1, hi: r2, strict: true }]);
    return {
      tag: 'קריאת פתרון מגרף',
      text: `בשרטוט הגרף של פונקציה ריבועית [[f(x)]].\nלפי הגרף, עבור אילו ערכים של [[x]] מתקיים [[f(x) ${op} 0]]?`,
      fig: { type: 'grid', x: [x0, x1], y: [y0, y1], curves: [{ pts, color: 'blue' }], points: [{ x: r1, y: 0, color: 'orange' }, { x: r2, y: 0, color: 'orange' }], alt: 'פרבולה במערכת צירים' },
      choices: { options: opts.map(setStr), correct: opts.indexOf(good) },
      hint: `[[f(x) ${op} 0]] פירושו שהגרף נמצא ${op === '>' ? 'מעל ציר' : 'מתחת לציר'} ה-[[x]]. מצאו בשרטוט את נקודות החיתוך עם הציר, ובדקו בין אילו ערכים של [[x]] זה קורה.`,
      steps: [
        `הגרף חותך את ציר ה-[[x]] בנקודות [[x = ${num(r1)}]] ו-[[x = ${num(r2)}]].`,
        `[[f(x) ${op} 0]] פירושו שהגרף ${op === '>' ? 'מעל ציר' : 'מתחת לציר'} ה-[[x]].`,
        `בשרטוט רואים שזה קורה ${shape === 'in' ? 'בין שתי נקודות החיתוך' : 'משמאל לנקודת החיתוך השמאלית ומימין לנקודת החיתוך הימנית'}.`,
        `הפתרון: ${setStr(good)}`,
      ],
      data: { coefs: [A, -A * (r1 + r2), A * r1 * r2], op, opts },
    };
  },
  verify(q) {
    const base = verifyChoice(q); if (base !== true) return base;
    const { coefs, op, opts } = q.data; const good = opts[q.choices.correct];
    const pts = q.fig.curves[0].pts;
    if (pts.length < 40) return 'the curve is too short';
    for (const [x, y] of pts) {
      if (Math.abs(y - value(coefs, x)) > 0.01) return 'the drawn curve is not the function';
      if (Math.abs(y) > 0.05 && (op === '>' ? y > 0 : y < 0) !== inSet(good, x)) return 'the drawing disagrees with the answer';
      if (x < q.fig.x[0] || x > q.fig.x[1] || y < q.fig.y[0] || y > q.fig.y[1]) return 'curve leaves the grid';
    }
    // both signs are visible, and the marked points are the roots
    if (!pts.some(([, y]) => y > 0.5) || !pts.some(([, y]) => y < -0.5)) return 'one side of the axis is not visible';
    return q.fig.points.every((p) => p.y === 0 && value(coefs, p.x) === 0) && q.fig.points.length === 2 ? true : 'marked points are not the roots';
  },
};

/* 5. how many whole numbers solve it? (solutions between the roots) */
const countWhole = {
  id: 'count-whole',
  make(R) {
    let r1, r2;
    do { r1 = R.int(-6, 5); r2 = r1 + R.int(2, 7); } while (r1 * r2 === 0 || r1 + r2 === 0);
    const A = R.pick([1, 1, -1]), strict = R.bool(0.6);
    const op = A > 0 ? (strict ? '<' : '<=') : (strict ? '>' : '>=');
    const p = poly([A, -A * (r1 + r2), A * r1 * r2]);
    const list = []; for (let x = strict ? r1 + 1 : r1; x <= (strict ? r2 - 1 : r2); x++) list.push(x);
    const good = { shape: 'in', lo: r1, hi: r2, strict };
    return {
      tag: 'פתרונות שלמים של אי-שוויון ריבועי',
      text: `כמה מספרים שלמים מקיימים את אי-השוויון?\n[[${p} ${op} 0]]`,
      rows: [{ label: 'מספר הפתרונות השלמים:', parts: [{ ans: list.length }] }],
      hint: `פתרו קודם את אי-השוויון, ואז ספרו את המספרים השלמים שבתחום. בדקו אם השורשים עצמם כלולים: הסימן כאן הוא [[${op}]].`,
      steps: [
        `פותרים את המשוואה [[${p} = 0]]. השורשים: [[x_1 = ${num(r1)}]], [[x_2 = ${num(r2)}]]`,
        smile(A),
        `הפתרון של אי-השוויון: ${setStr(good)}${strict ? ' (השורשים עצמם אינם כלולים)' : ' (השורשים עצמם כלולים)'}`,
        `המספרים השלמים בתחום: [[${list.map(num).join(', ')}]]. בסך הכול ${list.length === 1 ? 'מספר אחד' : `${list.length} מספרים`}.`,
      ],
      data: { coefs: [A, -A * (r1 + r2), A * r1 * r2], op },
    };
  },
  verify(q) {
    const { coefs, op } = q.data;
    let n = 0; for (let x = -80; x <= 80; x++) if (truth(coefs, op, x)) n++;
    if (truth(coefs, op, -80) || truth(coefs, op, 80)) return 'the solution set is not bounded';
    return n === q.rows[0].parts[0].ans && n >= 1 ? true : `brute force counts ${n}`;
  },
};

export default {
  id: 'quad-inequality',
  name: 'אי-שוויון ריבועי',
  grade: 'ט׳',
  about: 'מוצאים שורשים, משרטטים סקיצה של הפרבולה וקוראים ממנה איפה הביטוי חיובי ואיפה שלילי',
  place: 'הנושא "אי־שוויונות" ← פרק חדש אחרי "3. מערכת אי-שוויונות" (כיתה ט׳). כדאי ללמוד אותו אחרי "פרבולה" ← "9. חיוביות/שליליות", כי השיטה נשענת עליו',
  lesson: [
    { t: 'מהו אי-שוויון ריבועי?', items: [
      'באי-שוויון ריבועי מופיע [[x^2]], למשל [[x^2 - 7x + 10 < 0]]. הפתרון אינו מספר אחד אלא תחום של מספרים.',
      'פותרים בעזרת הפרבולה [[y = x^2 - 7x + 10]]: שואלים איפה היא מתחת לציר ה-[[x]] (ערכים שליליים) ואיפה היא מעליו (ערכים חיוביים).',
    ] },
    { t: 'שלושה שלבים', items: [
      { list: [
        'מוצאים את השורשים: פותרים את המשוואה שבה הביטוי שווה ל-[[0]].',
        'משרטטים סקיצה: מקדם חיובי של [[x^2]] נותן פרבולה "מחייכת" (פרבולת מינימום), מקדם שלילי נותן פרבולה "בוכה" (פרבולת מקסימום).',
        'קוראים מהסקיצה את התחום המתאים.',
      ] },
      { fig: { type: 'grid', x: [-1, 7], y: [-3, 5], curves: [{ color: 'blue', pts: Array.from({ length: 121 }, (_, i) => { const x = 0.5 + i * 0.05; return [Math.round(x * 100) / 100, Math.round((x * x - 7 * x + 10) * 1000) / 1000]; }).filter(([, y]) => y <= 5) }], points: [{ x: 2, y: 0, color: 'orange' }, { x: 5, y: 0, color: 'orange' }], caption: 'הפרבולה [[y = x^2 - 7x + 10]]: מתחת לציר בין [[2]] ל-[[5]], ומעליו משני הצדדים' } },
      'בפרבולה מחייכת יש שתי צורות של תשובה:',
      { list: [
        'הביטוי שלילי בין השורשים: [[2 < x < 5]]',
        'הביטוי חיובי משני צדי השורשים: [[x < 2]] או [[x > 5]]',
      ] },
    ] },
    { t: 'דוגמה', items: [
      { ex: 'פתרו: [[x^2 - 7x + 10 > 0]]', sol: [
        'פותרים [[x^2 - 7x + 10 = 0]]. השורשים: [[x_1 = 2]], [[x_2 = 5]]',
        'המקדם של [[x^2]] חיובי, לכן הפרבולה מחייכת.',
        'מחפשים איפה היא מעל ציר ה-[[x]]: משני צדי השורשים.',
        'הפתרון: [[x < 2]] או [[x > 5]]',
      ] },
      { ex: 'פתרו: [[-x^2 + 4x + 5 >= 0]]', sol: [
        'פותרים [[-x^2 + 4x + 5 = 0]]. השורשים: [[x_1 = -1]], [[x_2 = 5]]',
        'המקדם של [[x^2]] שלילי, לכן הפרבולה בוכה: היא מעל הציר דווקא בין השורשים.',
        'הסימן הוא [[>=]], לכן גם השורשים עצמם כלולים.',
        'הפתרון: [[-1 <= x <= 5]]',
      ] },
    ] },
    { t: 'טעויות נפוצות', items: [
      { note: 'לא פותרים אי-שוויון ריבועי כמו משוואה. מ-[[x^2 - 7x + 10 > 0]] לא נובע "[[x > 2]] ו-[[x > 5]]". חייבים לבדוק בסקיצה איפה הפרבולה מעל הציר.' },
      { note: 'כשהמקדם של [[x^2]] שלילי הכול מתהפך: הפרבולה בוכה, והיא חיובית בין השורשים.' },
      { note: 'בסימן [[<]] או [[>]] השורשים אינם כלולים בפתרון. בסימן [[<=]] או [[>=]] הם כלולים.' },
    ] },
  ],
  gens: [factored, standard, negative, fromGraph, countWhole],
};
