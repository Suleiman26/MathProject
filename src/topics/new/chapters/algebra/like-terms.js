/* כינוס איברים דומים (כיתה ז׳) — board #84 */
import { sum, term, num } from '../../core.js';

/* a·x + b + c·x + d  →  ?x + ? */
const twoKinds = {
  id: 'two-kinds',
  make(R) {
    const v = R.pick(['x', 'a', 'y']);
    let a, b, c, d;
    do { a = R.nz(-9, 9); c = R.nz(-9, 9); b = R.nz(-12, 12); d = R.nz(-12, 12); } while (a + c === 0 || a + c === 1 || b + d === 0);
    const terms = R.bool() ? [[a, v], [b, ''], [c, v], [d, '']] : [[a, v], [c, v], [b, ''], [d, '']];
    const A = a + c, B = b + d;
    return {
      tag: 'כינוס איברים דומים',
      text: 'כנסו איברים דומים וכתבו את הביטוי בצורה הקצרה ביותר. מספר שלילי כותבים עם מינוס.',
      rows: [{ parts: [`${sum(terms)} =`, { ans: A }, `${v} ${B < 0 ? '-' : '+'}`, { ans: Math.abs(B) }] }],
      hint: `מחברים בנפרד את האיברים עם [[${v}]] ובנפרד את המספרים החופשיים. שימו לב לסימן שלפני כל איבר.`,
      steps: [
        `האיברים עם [[${v}]]: [[${sum([[a, v], [c, v]])} = ${term(A, v)}]]`,
        `המספרים החופשיים: [[${sum([[b, ''], [d, '']])} = ${num(B)}]]`,
        `התשובה: [[${sum([[A, v], [B, '']])}]]`,
      ],
      data: { v, terms, A, B },
    };
  },
  verify(q) {
    const { terms, A, B } = q.data;
    for (const x of [-3, 0, 2, 7]) {
      const left = terms.reduce((s, [c, sym]) => s + c * (sym ? x : 1), 0);
      if (left !== A * x + B) return `value differs at ${x}`;
    }
    const [bx, bc] = [q.rows[0].parts[1].ans, q.rows[0].parts[3].ans];
    const shownSign = q.rows[0].parts[2].includes('-') ? -1 : 1;
    return bx === A && shownSign * bc === B ? true : 'boxes do not match';
  },
};

/* three terms of x and one of x² are NOT alike:  a·x² + b·x + c·x² + d·x → ?x² + ?x */
const squares = {
  id: 'with-squares',
  make(R) {
    let a, b, c, d;
    do { a = R.nz(-6, 6); c = R.nz(-6, 6); b = R.nz(-9, 9); d = R.nz(-9, 9); } while (a + c === 0 || a + c === 1 || b + d <= 1);
    const terms = [[a, 'x^2'], [b, 'x'], [c, 'x^2'], [d, 'x']];
    const A = a + c, B = b + d;
    return {
      tag: 'איברים דומים עם חזקה',
      text: 'כנסו איברים דומים. זכרו: [[x^2]] ו-[[x]] אינם איברים דומים. מספר שלילי כותבים עם מינוס.',
      rows: [{ parts: [`${sum(terms)} =`, { ans: A }, 'x^2 +', { ans: B }, 'x'] }],
      hint: 'מחברים רק איברים שיש להם בדיוק אותה אות ואותה חזקה.',
      steps: [
        `האיברים עם [[x^2]]: [[${sum([[a, 'x^2'], [c, 'x^2']])} = ${term(A, 'x^2')}]]`,
        `האיברים עם [[x]]: [[${sum([[b, 'x'], [d, 'x']])} = ${term(B, 'x')}]]`,
        `התשובה: [[${sum([[A, 'x^2'], [B, 'x']])}]]`,
      ],
      data: { terms, A, B },
    };
  },
  verify(q) {
    const { terms, A, B } = q.data;
    for (const x of [-2, 1, 3, 5]) {
      const left = terms.reduce((s, [c, sym]) => s + c * (sym === 'x^2' ? x * x : x), 0);
      if (left !== A * x * x + B * x) return `value differs at ${x}`;
    }
    return q.rows[0].parts[1].ans === A && q.rows[0].parts[3].ans === B ? true : 'boxes do not match';
  },
};

/* which terms are alike? */
const which = {
  id: 'which-alike',
  make(R) {
    const c = R.int(2, 9), k = R.nz(-9, 9, [c, 1]);
    const [good, bads] = R.pick([
      [`${term(k, 'x')}`, [`${term(k, 'x^2')}`, `${term(k, 'y')}`, `${num(k)}`]],
      [`${term(k, 'x')}`, [`${term(c, 'x^2')}`, `${term(c, 'xy')}`, `${num(c)}`]],
    ]);
    const options = R.shuffle([good, ...bads]);
    return {
      tag: 'זיהוי איברים דומים',
      text: `איזה מהאיברים הבאים דומה לאיבר [[${term(c, 'x')}]]?`,
      choices: { options: options.map((o) => `[[${o}]]`), correct: options.indexOf(good) },
      hint: 'איברים דומים: אותה אות בדיוק ואותה חזקה. המספר שלפני האות יכול להיות שונה.',
      steps: [`איבר דומה ל-[[${term(c, 'x')}]] הוא איבר עם [[x]] בלבד (בלי חזקה ובלי אות נוספת).`, `לכן התשובה היא [[${good}]].`],
      data: { good, options },
    };
  },
  verify(q) {
    const g = q.data.good;
    return /^-?\d*x$/.test(g) && q.choices.options[q.choices.correct] === `[[${g}]]` && q.data.options.filter((o) => /^-?\d*x$/.test(o)).length === 1 ? true : 'more than one / wrong like term';
  },
};

export default {
  id: 'like-terms',
  name: 'כינוס איברים דומים',
  grade: 'ז׳',
  about: 'מחברים איברים שיש להם אותה אות, וכותבים ביטוי קצר יותר',
  place: 'הנושא "משוואות" ← פרק חדש אחרי "1. ביטוי אלגברי" ולפני "2. פתרון משוואות"',
  lesson: [
    { t: 'מה הם איברים דומים?', items: [
      'איברים דומים הם איברים שיש להם בדיוק אותה אות ואותה חזקה. רק המספר שלפני האות (המקדם) יכול להיות שונה.',
      { list: ['[[3x]] ו-[[5x]] הם איברים דומים.', '[[4]] ו-[[-7]] הם איברים דומים (מספרים חופשיים).', '[[3x]] ו-[[3y]] אינם דומים: האות שונה.', '[[2x]] ו-[[2x^2]] אינם דומים: החזקה שונה.'] },
    ] },
    { t: 'איך מכנסים?', items: [
      'מחברים את המקדמים של האיברים הדומים, והאות נשארת כמו שהיא.',
      { f: '3x + 5x = 8x' },
      { f: '7a - 2a = 5a' },
      { note: 'הסימן שלפני האיבר שייך לאיבר. ב-[[4x - 6 + 2x]] המספר החופשי הוא [[-6]].' },
      { ex: 'כנסו איברים דומים: [[4x - 6 + 2x + 10]]', sol: ['האיברים עם [[x]]: [[4x + 2x = 6x]]', 'המספרים החופשיים: [[-6 + 10 = 4]]', 'התשובה: [[6x + 4]]'] },
    ] },
  ],
  gens: [twoKinds, squares, which],
};
