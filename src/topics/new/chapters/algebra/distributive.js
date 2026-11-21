/* חוק הפילוג (כיתה ז׳) — board #84 */
import { sum, term, num } from '../../core.js';

const par = (v) => (v < 0 ? `(${num(v)})` : num(v));
/** k(m·v + n) as math text; k = -1 → "-(…)" */
const open = (k, m, n, v = 'x') => `${k === -1 ? '-' : num(k)}(${sum([[m, v], [n, '']])})`;
const XS = [-4, -1, 0, 2, 5, 9];

/* a(bx + c) = ?x ± ? */
const openPos = {
  id: 'open',
  make(R) {
    const v = R.pick(['x', 'a', 'y']);
    const a = R.int(2, 9), b = R.int(1, 6), c = R.nz(-9, 9);
    const A = a * b, B = a * c;
    return {
      tag: 'פתיחת סוגריים',
      text: 'פתחו סוגריים בעזרת חוק הפילוג.',
      rows: [{ parts: [`${open(a, b, c, v)} =`, { ans: A }, `${v} ${B < 0 ? '-' : '+'}`, { ans: Math.abs(B) }] }],
      hint: 'כופלים את המספר שלפני הסוגריים בכל אחד מהאיברים שבתוך הסוגריים.',
      steps: [
        `כופלים את [[${a}]] באיבר הראשון: [[${a} * ${term(b, v)} = ${term(A, v)}]]`,
        `כופלים את [[${a}]] באיבר השני: [[${a} * ${par(c)} = ${num(B)}]]`,
        `התשובה: [[${sum([[A, v], [B, '']])}]]`,
      ],
      data: { a, b, c },
    };
  },
  verify(q) {
    const { a, b, c } = q.data;
    const p = q.rows[0].parts;
    const A = p[1].ans, B = (p[2].trim().endsWith('-') ? -1 : 1) * p[3].ans;
    if (!(p[3].ans > 0)) return 'second box must be positive';
    for (const x of XS) if (a * (b * x + c) !== A * x + B) return `value differs at ${x}`;
    return true;
  },
};

/* -a(bx + c): which expression is equal? */
const openNeg = {
  id: 'open-negative',
  make(R) {
    const a = R.int(1, 6), b = R.int(a === 1 ? 2 : 1, 5), c = R.nz(-9, 9);
    const good = [-a * b, -a * c];
    const opts = R.shuffle([good, [-a * b, a * c], [a * b, a * c], a > 1 ? [-a * b, -c] : [a * b, -a * c]]);
    const str = ([m, n]) => sum([[m, 'x'], [n, '']]);
    return {
      tag: 'מספר שלילי לפני הסוגריים',
      text: `איזה ביטוי שווה ל-[[${open(-a, b, c)}]]?`,
      choices: { options: opts.map((o) => `[[${str(o)}]]`), correct: opts.indexOf(good) },
      hint: a === 1
        ? 'מינוס לפני הסוגריים הוא כמו כפל ב-[[-1]]: הסימן של כל איבר בסוגריים מתהפך.'
        : `כופלים את [[${num(-a)}]] בכל איבר בסוגריים. כפל במספר שלילי הופך את הסימן של האיבר.`,
      steps: [
        `האיבר הראשון: [[${num(-a)} * ${term(b, 'x')} = ${term(-a * b, 'x')}]]`,
        `האיבר השני: [[${num(-a)} * ${par(c)} = ${num(-a * c)}]]`,
        `התשובה: [[${str(good)}]]`,
      ],
      data: { a, b, c, opts },
    };
  },
  verify(q) {
    const { a, b, c, opts } = q.data;
    const same = opts.map(([m, n]) => XS.every((x) => -a * (b * x + c) === m * x + n));
    if (same.filter(Boolean).length !== 1) return 'not exactly one equal option';
    if (!same[q.choices.correct]) return 'wrong option marked';
    return q.choices.options[q.choices.correct] === `[[${sum([[opts[q.choices.correct][0], 'x'], [opts[q.choices.correct][1], '']])}]]` ? true : 'option text differs';
  },
};

/* a(x + b) ± c(x + d) = ?x ± ? */
const openCollect = {
  id: 'open-collect',
  make(R) {
    let a, b, c, d;
    do { a = R.int(2, 6); c = R.nz(-5, 6, [1, -1]); b = R.nz(-9, 9); d = R.nz(-9, 9); } while (a + c < 2 || a * b + c * d === 0 || (a === c && b === d));
    const A = a + c, B = a * b + c * d;
    const expr = `${open(a, 1, b)} ${c < 0 ? '-' : '+'} ${open(Math.abs(c), 1, d)}`;
    return {
      tag: 'פתיחת סוגריים וכינוס',
      text: 'פתחו סוגריים וכנסו איברים דומים.',
      rows: [{ parts: [`${expr} =`, { ans: A }, `x ${B < 0 ? '-' : '+'}`, { ans: Math.abs(B) }] }],
      hint: c < 0
        ? `פותחים כל סוגריים בנפרד. בסוגריים השניים כופלים ב-[[${num(c)}]], כולל הסימן.`
        : 'פותחים כל סוגריים בנפרד, ורק אחר כך מחברים איברים דומים.',
      steps: [
        `הסוגריים הראשונים: [[${open(a, 1, b)} = ${sum([[a, 'x'], [a * b, '']])}]]`,
        `הסוגריים השניים: [[${open(c, 1, d)} = ${sum([[c, 'x'], [c * d, '']])}]]`,
        `מכנסים: [[${sum([[a, 'x'], [c, 'x']])} = ${term(A, 'x')}]] וגם [[${sum([[a * b, ''], [c * d, '']])} = ${num(B)}]]`,
        `התשובה: [[${sum([[A, 'x'], [B, '']])}]]`,
      ],
      data: { a, b, c, d },
    };
  },
  verify(q) {
    const { a, b, c, d } = q.data;
    const p = q.rows[0].parts;
    const A = p[1].ans, B = (p[2].trim().endsWith('-') ? -1 : 1) * p[3].ans;
    if (!(p[3].ans > 0) || A < 2) return 'degenerate boxes';
    for (const x of XS) if (a * (x + b) + c * (x + d) !== A * x + B) return `value differs at ${x}`;
    return true;
  },
};

/* the other way round: which bracket form equals abx + ac ? */
const reverse = {
  id: 'reverse',
  make(R) {
    const a = R.int(2, 6), b = R.int(2, 5), c = R.nz(-6, 6);
    const good = [a, b, c];
    const opts = R.shuffle([good, [a, b, a * c], [a * b, 1, c], [a, a * b, c]]);
    const str = ([k, m, n]) => open(k, m, n);
    const expr = sum([[a * b, 'x'], [a * c, '']]);
    return {
      tag: 'מביטוי פתוח לסוגריים',
      text: `איזה ביטוי שווה ל-[[${expr}]]?`,
      choices: { options: opts.map((o) => `[[${str(o)}]]`), correct: opts.indexOf(good) },
      hint: 'פתחו את הסוגריים בכל אחת מהאפשרויות ובדקו מה מתקבל.',
      steps: [
        `בשני האיברים אפשר לחלק ב-[[${a}]]: [[${term(a * b, 'x')} = ${a} * ${term(b, 'x')}]] וגם [[${num(a * c)} = ${a} * ${par(c)}]]`,
        `לכן [[${expr} = ${str(good)}]]`,
        `בדיקה: פותחים סוגריים ומקבלים שוב [[${expr}]].`,
      ],
      data: { coefs: [a * b, a * c], opts },
    };
  },
  verify(q) {
    const { coefs, opts } = q.data;
    const same = opts.map(([k, m, n]) => XS.every((x) => k * (m * x + n) === coefs[0] * x + coefs[1]));
    if (same.filter(Boolean).length !== 1) return 'not exactly one equal option';
    if (!same[q.choices.correct]) return 'wrong option marked';
    const o = opts[q.choices.correct];
    return q.choices.options[q.choices.correct] === `[[${open(o[0], o[1], o[2])}]]` ? true : 'option text differs';
  },
};

export default {
  id: 'distributive',
  name: 'חוק הפילוג',
  grade: 'ז׳',
  about: 'פותחים סוגריים: כופלים את המספר שלפני הסוגריים בכל איבר שבתוכם',
  place: 'הנושא "משוואות ליניאריות" ← פרק חדש אחרי הפרק החדש "כינוס איברים דומים" ולפני "2. פתרון משוואות"',
  lesson: [
    { t: 'מהו חוק הפילוג?', items: [
      'כשמספר כופל סוגריים, הוא כופל כל אחד מהאיברים שבתוך הסוגריים.',
      { f: 'a(b + c) = ab + ac' },
      'אפשר לראות את זה במספרים: [[3 * (10 + 2) = 3 * 10 + 3 * 2 = 36]], וגם [[3 * 12 = 36]].',
      { ex: 'פתחו סוגריים: [[4(2x + 5)]]', sol: ['[[4 * 2x = 8x]]', '[[4 * 5 = 20]]', 'התשובה: [[8x + 20]]'] },
      { note: 'טעות נפוצה: לכפול רק את האיבר הראשון. [[3(x + 4)]] שווה ל-[[3x + 12]], ולא ל-[[3x + 4]].' },
    ] },
    { t: 'מספר שלילי לפני הסוגריים', items: [
      'כשהמספר שלפני הסוגריים שלילי, כופלים בו כולל הסימן. הסימן של כל איבר בסוגריים מתהפך.',
      { f: '-2(x - 5) = -2x + 10' },
      { f: '-(3x + 4) = -3x - 4' },
      { note: 'מינוס כפול מינוס נותן פלוס: [[-2 * (-5) = 10]].' },
    ] },
    { t: 'פותחים סוגריים ומכנסים', items: [
      'כשיש כמה סוגריים, פותחים כל אחד בנפרד, ואחר כך מכנסים איברים דומים.',
      { ex: 'פשטו: [[3(x + 4) - 2(x - 1)]]', sol: ['[[3(x + 4) = 3x + 12]]', '[[-2(x - 1) = -2x + 2]]', 'מכנסים: [[3x - 2x = x]] וגם [[12 + 2 = 14]]', 'התשובה: [[x + 14]]'] },
    ] },
    { t: 'ובכיוון ההפוך', items: [
      'אפשר גם לחזור מביטוי פתוח לסוגריים: מחפשים מספר שמחלק את כל האיברים.',
      { f: '6x + 12 = 6(x + 2)' },
      'בודקים על ידי פתיחת הסוגריים: [[6 * x + 6 * 2 = 6x + 12]].',
    ] },
  ],
  gens: [openPos, openNeg, openCollect, reverse],
};
