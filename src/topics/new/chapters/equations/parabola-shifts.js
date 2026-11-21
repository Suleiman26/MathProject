/* הזזות של פרבולה (כיתה ט׳) — board #84
   y = ax² + k (vertical), y = a(x − p)² (horizontal), y = a(x − p)² + k (both), reflection in the x-axis.
   The classic mistake is the sign of the horizontal shift: (x − 3)² moves RIGHT, (x + 3)² moves LEFT. */
import { num, signed } from '../../core.js';

/** a(x − h)² + k as math text: "(x - 3)^2 + 2", "-2(x + 1)^2", "x^2 - 4" */
const vf = (a, h, k) => `${a === 1 ? '' : a === -1 ? '-' : num(a)}${h === 0 ? 'x^2' : `(x ${signed(-h)})^2`}${k === 0 ? '' : ` ${signed(k)}`}`;
/** the text back to numbers (used by verify, so a wrong sign on screen is caught) */
function parseVF(s) {
  const m = /^(-?\d*)(?:x\^2|\(x ([+-]) (\d+)\)\^2)(?: ([+-]) (\d+))?$/.exec(s);
  if (!m) return null;
  const a = m[1] === '' ? 1 : m[1] === '-' ? -1 : Number(m[1]);
  const h = m[2] ? (m[2] === '-' ? 1 : -1) * Number(m[3]) : 0;
  const k = m[4] ? (m[4] === '-' ? -1 : 1) * Number(m[5]) : 0;
  return (x) => a * (x - h) * (x - h) + k;
}
/** the vertex of a parabola given as a function, found by scanning whole x (no formula) */
function vertexOf(f) {
  const up = f(100) > f(0) || f(-100) > f(0);
  let best = -30;
  for (let x = -30; x <= 30; x++) if (up ? f(x) < f(best) : f(x) > f(best)) best = x;
  return [best, f(best), up];
}
const pt = (x, y) => `(${num(x)}, ${num(y)})`;
const units = (n) => (n === 1 ? 'יחידה אחת' : `${n} יחידות`);
const hWord = (h) => (h > 0 ? 'ימינה' : 'שמאלה'), vWord = (k) => (k > 0 ? 'למעלה' : 'למטה');
const inBrackets = (h) => (h > 0
  ? `בתוך הסוגריים כתוב [[x - ${h}]], לכן ההזזה האופקית היא ${units(h)} ימינה`
  : `בתוך הסוגריים כתוב [[x + ${-h}]], כלומר [[x - (${num(h)})]], לכן ההזזה האופקית היא ${units(-h)} שמאלה`);
const answers = (q) => q.rows.flatMap((r) => r.parts.filter((p) => p && typeof p === 'object' && 'ans' in p).map((p) => p.ans));

/* 1. the vertex from a(x − p)² + k */
const vertex = {
  id: 'vertex',
  make(R) {
    const a = R.pick([1, 1, -1, 2, -2, 3]);
    const form = R.pick(['both', 'both', 'both', 'h', 'k']);
    const h = form === 'k' ? 0 : R.nz(-7, 7), k = form === 'h' ? 0 : R.nz(-9, 9);
    const shown = vf(a, h, k);
    const steps = [
      h === 0 ? 'אין סוגריים עם [[x]], כלומר אין הזזה אופקית. שיעור ה-[[x]] של הקודקוד הוא [[0]].'
        : `${inBrackets(h)}. שיעור ה-[[x]] של הקודקוד הוא [[${num(h)}]].`,
      k === 0 ? 'אין מספר חופשי אחרי הסוגריים, כלומר אין הזזה אנכית. שיעור ה-[[y]] של הקודקוד הוא [[0]].'
        : `המספר החופשי הוא [[${num(k)}]]: הזזה של ${units(Math.abs(k))} ${vWord(k)}. שיעור ה-[[y]] של הקודקוד הוא [[${num(k)}]].`,
    ];
    if (a === -1) steps.push('המינוס שלפני הפונקציה הופך את הכיוון של הפרבולה, אבל לא משנה את מקום הקודקוד.');
    else if (a !== 1) steps.push(`המקדם [[${num(a)}]] משנה את הצורה של הפרבולה${a < 0 ? ' ואת הכיוון שלה' : ''}, אבל לא את מקום הקודקוד.`);
    steps.push(`הקודקוד: [[${pt(h, k)}]]`);
    return {
      tag: 'קודקוד מתוך הזזה',
      text: `מהו הקודקוד של הפרבולה?\n[[y = ${shown}]]`,
      rows: [{ label: 'הקודקוד:', parts: ['(', { ans: h }, ',', { ans: k }, ')'] }],
      hint: 'בצורה [[y = a(x - p)^2 + k]] הקודקוד הוא [[(p, k)]]. שימו לב לסימן שבתוך הסוגריים: ב-[[(x + 3)^2]] שיעור ה-[[x]] של הקודקוד הוא [[-3]].',
      steps,
      data: { shown },
    };
  },
  verify(q) {
    const f = parseVF(q.data.shown); if (!f) return 'cannot read the function';
    if (!q.text.includes(`[[y = ${q.data.shown}]]`)) return 'the text shows another function';
    const [x, y] = vertexOf(f); const [bx, by] = answers(q);
    return bx === x && by === y ? true : `vertex is (${x}, ${y})`;
  },
};

/* 2. which shift takes y = ax² to the given parabola? */
const describe = {
  id: 'describe-shift',
  make(R) {
    const a = R.pick([1, 1, 1, 2, -1]);
    const base = vf(a, 0, 0);
    let h = 0, k = 0, opts, steps;
    const kind = R.pick(['h', 'h', 'v', 'both', 'both']);
    if (kind === 'both') {
      h = R.nz(-6, 6); k = R.nz(-6, 6, [h, -h]);
      opts = [[h, k], [-h, k], [h, -k], [-h, -k]];
      steps = [`${inBrackets(h)}.`, `המספר החופשי הוא [[${num(k)}]], לכן ההזזה האנכית היא ${units(Math.abs(k))} ${vWord(k)}.`];
    } else {
      const n = R.int(1, 8);
      if (kind === 'h') h = R.sign() * n; else k = R.sign() * n;
      opts = [[n, 0], [-n, 0], [0, n], [0, -n]];
      steps = kind === 'h'
        ? [`${inBrackets(h)}.`, 'ההזזה האופקית תמיד הפוכה לסימן שבסוגריים: [[x - 3]] מזיז ימינה, [[x + 3]] מזיז שמאלה.']
        : [`המספר [[${num(k)}]] נמצא מחוץ לריבוע, לכן זו הזזה אנכית: ${k > 0 ? 'לכל ערך של הפונקציה מוסיפים' : 'מכל ערך של הפונקציה מחסרים'} [[${Math.abs(k)}]].`, `הגרף כולו זז ${units(Math.abs(k))} ${vWord(k)}.`];
    }
    const say = ([dx, dy]) => [dx ? `${units(Math.abs(dx))} ${hWord(dx)}` : '', dy ? `${units(Math.abs(dy))} ${vWord(dy)}` : ''].filter(Boolean).join(' ו-');
    const order = R.shuffle(opts);
    const shown = vf(a, h, k);
    steps.push(`בדיקה לפי הקודקוד: הקודקוד של [[y = ${base}]] הוא [[(0, 0)]], והקודקוד של הפרבולה החדשה הוא [[${pt(h, k)}]].`);
    steps.push(`ההזזה: ${say([h, k])}.`);
    return {
      tag: 'זיהוי הזזה',
      text: `הפרבולה [[y = ${shown}]] התקבלה מהזזה של הפרבולה [[y = ${base}]].\nמהי ההזזה?`,
      choices: { options: order.map(say), correct: order.findIndex(([dx, dy]) => dx === h && dy === k) },
      hint: kind === 'v'
        ? 'מספר שמוסיפים או מחסרים מחוץ לריבוע מזיז את הגרף למעלה או למטה.'
        : 'מצאו את הקודקוד של הפרבולה החדשה והשוו אותו ל-[[(0, 0)]]. זכרו: [[(x - 3)^2]] מתאפס כאשר [[x = 3]], ולכן הקודקוד זז ימינה.',
      steps,
      data: { shown, base, order },
    };
  },
  verify(q) {
    const f = parseVF(q.data.shown), b = parseVF(q.data.base); if (!f || !b) return 'cannot read the function';
    const [x, y, up] = vertexOf(f), [x0, y0, up0] = vertexOf(b);
    if (x0 !== 0 || y0 !== 0 || up !== up0) return 'the base parabola is wrong';
    for (const t of [-3, 0, 2, 5]) if (f(t + x) - y !== b(t)) return 'not a pure shift of the base';
    const hits = q.data.order.filter(([dx, dy]) => dx === x && dy === y);
    if (hits.length !== 1) return 'no single option fits';
    const [dx, dy] = q.data.order[q.choices.correct];
    if (dx !== x || dy !== y) return 'wrong option marked';
    const opt = q.choices.options[q.choices.correct];
    if (x !== 0 && !opt.includes(x > 0 ? 'ימינה' : 'שמאלה')) return 'horizontal word is wrong';
    if (y !== 0 && !opt.includes(y > 0 ? 'למעלה' : 'למטה')) return 'vertical word is wrong';
    return true;
  },
};

/* 3. write the function after a shift: p and k of y = a(x − p)² + k */
const write = {
  id: 'write-shifted',
  make(R) {
    const a = R.pick([1, 1, 2, -1, 3]);
    const base = vf(a, 0, 0);
    const kind = R.pick(['both', 'both', 'h', 'v', 'vertex']);
    const h = kind === 'v' ? 0 : R.nz(-7, 7), k = kind === 'h' ? 0 : R.nz(-8, 8);
    const moves = [h ? `${units(Math.abs(h))} ${hWord(h)}` : '', k ? `${units(Math.abs(k))} ${vWord(k)}` : ''].filter(Boolean).join(' ו-');
    const tmpl = `y = ${a === 1 ? '' : a === -1 ? '-' : num(a)}(x - p)^2 + k`;
    const ask = `את הפרבולה החדשה כותבים בצורה [[${tmpl}]]. מצאו את [[p]] ואת [[k]] (מספר שלילי כותבים עם מינוס).`;
    const result = vf(a, h, k);
    return {
      tag: 'כתיבת הפונקציה אחרי הזזה',
      text: kind === 'vertex'
        ? `מזיזים את הפרבולה [[y = ${base}]] כך שהקודקוד שלה עובר לנקודה [[${pt(h, k)}]].\n${ask}`
        : `מזיזים את הפרבולה [[y = ${base}]] ${moves}.\n${ask}`,
      rows: [{ parts: ['p =', { ans: h }] }, { parts: ['k =', { ans: k }] }],
      hint: 'בצורה [[y = a(x - p)^2 + k]] המספר [[p]] הוא ההזזה האופקית (ימינה חיובי, שמאלה שלילי) והמספר [[k]] הוא ההזזה האנכית (למעלה חיובי, למטה שלילי). אם אין הזזה בכיוון מסוים, המספר הוא [[0]].',
      steps: [
        kind === 'vertex' ? `הקודקוד של [[y = ${base}]] הוא [[(0, 0)]]. כדי שיעבור ל-[[${pt(h, k)}]] צריך להזיז ${moves}.`
          : `הקודקוד של [[y = ${base}]] הוא [[(0, 0)]]. אחרי ההזזה הקודקוד הוא [[${pt(h, k)}]].`,
        h === 0 ? 'אין הזזה אופקית, לכן [[p = 0]].' : `הזזה של ${units(Math.abs(h))} ${hWord(h)}: [[p = ${num(h)}]]${h < 0 ? `. בתוך הסוגריים מתקבל [[x - (${num(h)}) = x + ${-h}]]` : ''}`,
        k === 0 ? 'אין הזזה אנכית, לכן [[k = 0]].' : `הזזה של ${units(Math.abs(k))} ${vWord(k)}: [[k = ${num(k)}]]`,
        `הפונקציה: [[y = ${result}]]`,
      ],
      data: { base, result, move: { right: h > 0 ? h : 0, left: h < 0 ? -h : 0, up: k > 0 ? k : 0, down: k < 0 ? -k : 0 }, kind },
    };
  },
  verify(q) {
    const { base, result, move, kind } = q.data;
    const f = parseVF(result), b = parseVF(base); if (!f || !b) return 'cannot read the function';
    const [p, k] = answers(q);
    if (p !== move.right - move.left || k !== move.up - move.down) return 'boxes do not match the moves';
    // the result is the base moved by (p, k): f(x) = b(x − p) + k, and its vertex is (p, k)
    for (const x of [-6, -1, 0, 2, 7]) if (f(x) !== b(x - p) + k) return 'the final function is not the shifted base';
    const [vx, vy] = vertexOf(f);
    if (vx !== p || vy !== k) return 'vertex of the final function differs';
    if (!q.steps[q.steps.length - 1].includes(`[[y = ${result}]]`)) return 'last step shows another function';
    if (kind !== 'vertex') {
      for (const [w, n] of [['ימינה', move.right], ['שמאלה', move.left], ['למעלה', move.up], ['למטה', move.down]]) {
        const first = q.text.split('\n')[0];
        if ((n > 0) !== first.includes(w)) return `direction word ${w} is wrong in the text`;
        if (n > 1 && !first.includes(`${n} יחידות ${w}`)) return 'size is missing in the text';
      }
    } else if (!q.text.includes(`[[${pt(p, k)}]]`)) return 'vertex is missing in the text';
    return true;
  },
};

/* 4. which formula fits the drawn parabola? */
const matchGraph = {
  id: 'match-graph',
  make(R) {
    let a, h, k;
    do { a = R.sign(); h = R.nz(-4, 4); k = R.nz(-4, 4); } while (a * k > 2);
    const f = (x) => a * (x - h) * (x - h) + k;
    const pts = [];
    for (let i = 0; i <= 240; i++) { const x = -6 + i / 20, y = f(x); if (y >= -6 && y <= 6) pts.push([Math.round(x * 100) / 100, Math.round(y * 1000) / 1000]); }
    const good = vf(a, h, k);
    const options = R.shuffle([good, vf(a, -h, k), vf(a, h, -k), vf(a, -h, -k)]);
    return {
      tag: 'התאמת פונקציה לגרף',
      text: 'איזו פונקציה מתאימה לפרבולה שבשרטוט?',
      fig: { type: 'grid', x: [-6, 6], y: [-6, 6], curves: [{ pts, color: 'blue' }], points: [{ x: h, y: k, color: 'orange' }], alt: 'פרבולה במערכת צירים, הקודקוד מסומן' },
      choices: { options: options.map((o) => `[[y = ${o}]]`), correct: options.indexOf(good) },
      hint: 'קראו מהשרטוט את הקודקוד [[(p, k)]], וכתבו [[y = a(x - p)^2 + k]]. זכרו שבתוך הסוגריים הסימן מתהפך.',
      steps: [
        `קוראים מהשרטוט את הקודקוד: [[${pt(h, k)}]].`,
        a > 0 ? 'הפרבולה ישרה (מחייכת), לכן לפני הסוגריים אין מינוס.' : 'הפרבולה הפוכה (עצובה), לכן לפני הסוגריים יש מינוס.',
        `מציבים [[p = ${num(h)}]] ו-[[k = ${num(k)}]] בצורה [[y = ${a < 0 ? '-' : ''}(x - p)^2 + k]]${h < 0 ? `. בתוך הסוגריים: [[x - (${num(h)}) = x + ${-h}]]` : ''}`,
        `הפונקציה: [[y = ${good}]]`,
      ],
      data: { options },
    };
  },
  verify(q) {
    const pts = q.fig.curves[0].pts;
    if (pts.length < 40) return 'the curve is too short';
    const fits = q.data.options.map((o) => { const f = parseVF(o); return !!f && pts.every(([x, y]) => Math.abs(f(x) - y) < 0.01); });
    if (fits.filter(Boolean).length !== 1) return `${fits.filter(Boolean).length} options fit the curve`;
    if (!fits[q.choices.correct]) return 'wrong option marked';
    if (q.choices.options[q.choices.correct] !== `[[y = ${q.data.options[q.choices.correct]}]]`) return 'option text differs';
    const [vx, vy] = vertexOf(parseVF(q.data.options[q.choices.correct])); const p = q.fig.points[0];
    return p.x === vx && p.y === vy && Math.abs(vx) <= 5 && Math.abs(vy) <= 5 ? true : 'the marked vertex is wrong';
  },
};

/* 5. reflection in the x-axis */
const reflection = {
  id: 'reflection',
  make(R) {
    const a = R.pick([1, 1, 2, 3, -1, -2]), h = R.nz(-6, 6), k = R.nz(-8, 8);
    const shown = vf(a, h, k), good = vf(-a, h, -k);
    const options = R.shuffle([good, vf(-a, h, k), vf(a, -h, k), vf(-a, -h, -k)]);
    return {
      tag: 'שיקוף ביחס לציר x',
      text: `משקפים את הפרבולה [[y = ${shown}]] ביחס לציר ה-[[x]].\nמהי הפונקציה של הפרבולה החדשה?`,
      choices: { options: options.map((o) => `[[y = ${o}]]`), correct: options.indexOf(good) },
      hint: 'בשיקוף ביחס לציר ה-[[x]] כל נקודה [[(x, y)]] עוברת לנקודה [[(x, -y)]]. לכן כל הביטוי של הפונקציה מוכפל ב-[[-1]], גם המספר החופשי.',
      steps: [
        'בשיקוף ביחס לציר ה-[[x]] כל נקודה [[(x, y)]] עוברת ל-[[(x, -y)]], כלומר כל הפונקציה מוכפלת ב-[[-1]].',
        `[[y = -(${shown}) = ${good}]]`,
        `הקודקוד עובר מ-[[${pt(h, k)}]] ל-[[${pt(h, -k)}]], והפרבולה מתהפכת: ${a > 0 ? 'מישרה להפוכה' : 'מהפוכה לישרה'}.`,
        `הפונקציה החדשה: [[y = ${good}]]`,
      ],
      data: { shown, options },
    };
  },
  verify(q) {
    const f = parseVF(q.data.shown); if (!f) return 'cannot read the function';
    if (!q.text.includes(`[[y = ${q.data.shown}]]`)) return 'the text shows another function';
    const mirror = q.data.options.map((o) => { const g = parseVF(o); return !!g && [-7, -2, 0, 1, 4, 9].every((x) => g(x) === -f(x)); });
    if (mirror.filter(Boolean).length !== 1) return `${mirror.filter(Boolean).length} options are the mirror image`;
    return mirror[q.choices.correct] && q.choices.options[q.choices.correct] === `[[y = ${q.data.options[q.choices.correct]}]]` ? true : 'wrong option marked';
  },
};

const lessonCurve = (f, y0, y1) => { const pts = []; for (let i = 0; i <= 240; i++) { const x = -6 + i / 20, y = f(x); if (y >= y0 && y <= y1) pts.push([Math.round(x * 100) / 100, Math.round(y * 1000) / 1000]); } return pts; };

export default {
  id: 'parabola-shifts',
  name: 'הזזות של פרבולה',
  grade: 'ט׳',
  about: 'מזיזים את הפרבולה למעלה, למטה, ימינה ושמאלה, וקוראים את הקודקוד ישר מהנוסחה',
  place: 'הנושא "פרבולה" ← פרק חדש אחרי "1. השפעת מקדמים" (ולפני "2. ציר סימטריה"). גם "4. קודקוד ממשוואה" יכול להישען עליו',
  lesson: [
    { t: 'הזזה אנכית: למעלה ולמטה', items: [
      'כשמוסיפים מספר לפונקציה [[y = x^2]], כל הגרף עולה. כשמחסרים מספר, כל הגרף יורד.',
      { f: 'y = ax^2 + k' },
      { list: ['[[y = x^2 + 3]]: הזזה של [[3]] יחידות למעלה. הקודקוד: [[(0, 3)]].', '[[y = x^2 - 2]]: הזזה של [[2]] יחידות למטה. הקודקוד: [[(0, -2)]].'] },
    ] },
    { t: 'הזזה אופקית: ימינה ושמאלה', items: [
      'כשמחליפים את [[x]] ב-[[x - p]], הגרף זז לצדדים.',
      { f: 'y = a(x - p)^2' },
      { list: ['[[y = (x - 3)^2]]: הזזה של [[3]] יחידות ימינה. הקודקוד: [[(3, 0)]].', '[[y = (x + 3)^2]]: הזזה של [[3]] יחידות שמאלה. הקודקוד: [[(-3, 0)]].'] },
      { fig: { type: 'grid', x: [-6, 6], y: [-1, 6], curves: [{ pts: lessonCurve((x) => x * x, -1, 6), color: 'gray' }, { pts: lessonCurve((x) => (x - 3) * (x - 3), -1, 6), color: 'blue' }, { pts: lessonCurve((x) => (x + 3) * (x + 3), -1, 6), color: 'orange' }], caption: 'אפור: [[y = x^2]], כחול: [[y = (x - 3)^2]], כתום: [[y = (x + 3)^2]]' } },
      { note: 'טעות נפוצה: לחשוב ש-[[(x + 3)^2]] מזיז ימינה כי יש פלוס. הכיוון הפוך לסימן! הקודקוד נמצא במקום שבו הסוגריים מתאפסים: [[x + 3 = 0]] כאשר [[x = -3]], כלומר שמאלה.' },
    ] },
    { t: 'שילוב של שתי ההזזות', items: [
      { f: 'y = a(x - p)^2 + k' },
      'זו הפרבולה [[y = ax^2]] אחרי הזזה אופקית של [[p]] והזזה אנכית של [[k]]. הקודקוד שלה הוא [[(p, k)]].',
      { ex: 'מהו הקודקוד של [[y = (x + 4)^2 - 1]], ואיזו הזזה של [[y = x^2]] היא?', sol: [
        'בתוך הסוגריים כתוב [[x + 4]], כלומר [[x - (-4)]]: הזזה של [[4]] יחידות שמאלה.',
        'המספר החופשי הוא [[-1]]: הזזה של יחידה אחת למטה.',
        'הקודקוד: [[(-4, -1)]]',
      ] },
      { ex: 'מזיזים את [[y = 2x^2]] [[5]] יחידות ימינה ו-[[3]] יחידות למעלה. מהי הפונקציה?', sol: [
        'ימינה [[5]]: [[p = 5]]. למעלה [[3]]: [[k = 3]].',
        'הפונקציה: [[y = 2(x - 5)^2 + 3]]',
      ] },
    ] },
    { t: 'שיקוף ביחס לציר x', items: [
      'בשיקוף ביחס לציר ה-[[x]] הגרף מתהפך כמו במראה: כל נקודה [[(x, y)]] עוברת ל-[[(x, -y)]]. בנוסחה כופלים את כל הפונקציה ב-[[-1]].',
      { ex: 'משקפים את [[y = (x - 2)^2 + 3]] ביחס לציר ה-[[x]]. מהי הפונקציה החדשה?', sol: [
        '[[y = -((x - 2)^2 + 3) = -(x - 2)^2 - 3]]',
        'הקודקוד עובר מ-[[(2, 3)]] ל-[[(2, -3)]], והפרבולה הישרה (המחייכת) הופכת להפוכה (עצובה).',
      ] },
      { note: 'המינוס חל על כל הפונקציה, גם על המספר החופשי. ההזזה האופקית (מה שבתוך הסוגריים) לא משתנה.' },
    ] },
  ],
  gens: [vertex, describe, write, matchGraph, reflection],
};
