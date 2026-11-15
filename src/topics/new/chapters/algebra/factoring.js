/* פירוק לגורמים (כיתה ט׳) — board #84
   Typing convention of the whole chapter: brackets are always shown as (x + ?), and the
   missing number is typed with its sign (a subtraction = a negative number). */
import { sum, term, num, poly, factor, gcd } from '../../core.js';

const par = (v) => (v < 0 ? `(${num(v)})` : num(v));
const lin = (a, b) => `(${sum([[a, 'x'], [b, '']])})`;
const polyMul = (p, q) => { const r = Array(p.length + q.length - 1).fill(0); p.forEach((a, i) => q.forEach((b, j) => { r[i + j] += a * b; })); return r; };
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const SIGNED = 'מספר שלילי כותבים עם מינוס, למשל [[-4]].';

/* gpx + gq = g(px + q)   and   gpx² + gqx = gx(px + q) */
const common = {
  id: 'common-factor',
  make(R) {
    let g, p, q;
    do { g = R.int(2, 9); p = R.int(2, 7); q = R.nz(-9, 9); } while (gcd(p, q) !== 1);
    const withX = R.bool();
    const E = [g * p, g * q];
    const expr = withX ? sum([[E[0], 'x^2'], [E[1], 'x']]) : sum([[E[0], 'x'], [E[1], '']]);
    const G = withX ? term(g, 'x') : num(g);
    const inner = sum([[p, 'x'], [q, '']]);
    return {
      tag: 'הוצאת גורם משותף',
      text: `הוציאו את הגורם המשותף הגדול ביותר מהביטוי [[${expr}]].`,
      rows: [
        { label: 'הגורם המשותף', parts: withX ? [{ ans: g }, 'x'] : [{ ans: g }] },
        { label: 'מה נשאר בסוגריים?', parts: [{ ans: p }, `x ${q < 0 ? '-' : '+'}`, { ans: Math.abs(q) }] },
      ],
      hint: withX
        ? `מחפשים את המספר הגדול ביותר שמחלק גם את [[${E[0]}]] וגם את [[${Math.abs(E[1])}]]. בשני האיברים יש גם [[x]].`
        : `מחפשים את המספר הגדול ביותר שמחלק גם את [[${E[0]}]] וגם את [[${Math.abs(E[1])}]].`,
      steps: [
        `המספר הגדול ביותר שמחלק את [[${E[0]}]] ואת [[${Math.abs(E[1])}]] הוא [[${g}]]${withX ? `, ובשני האיברים יש [[x]]. הגורם המשותף: [[${G}]]` : ''}.`,
        withX
          ? `מחלקים כל איבר ב-[[${G}]]: [[${term(E[0], 'x^2')} : ${G} = ${term(p, 'x')}]] וגם [[${term(E[1], 'x')} : ${G} = ${num(q)}]]`
          : `מחלקים כל איבר ב-[[${g}]]: [[${term(E[0], 'x')} : ${g} = ${term(p, 'x')}]] וגם [[${num(E[1])} : ${g} = ${num(q)}]]`,
        `התשובה: [[${expr} = ${G}(${inner})]]`,
      ],
      data: { E, withX },
    };
  },
  verify(q) {
    const { E, withX } = q.data;
    const G = q.rows[0].parts[0].ans;
    const r = q.rows[1].parts;
    const P = r[0].ans, Q = (r[1].trim().endsWith('-') ? -1 : 1) * r[2].ans;
    if (withX !== (q.rows[0].parts[1] === 'x')) return 'x of the common factor is missing';
    if (G !== gcd(E[0], E[1])) return 'not the greatest common factor';
    if (G * P !== E[0] || G * Q !== E[1] || r[2].ans <= 0) return 'multiplying back gives another expression';
    return true;
  },
};

/* x² + sx + c = (x + ?)(x + ?) */
const trinomial = {
  id: 'trinomial',
  make(R) {
    let p, q;
    do { p = R.nz(-9, 9); q = R.nz(-9, 9); } while (p === q || p === -q);
    const s = p + q, c = p * q;
    return {
      tag: 'פירוק טרינום',
      text: `השלימו את הפירוק: [[${poly([1, s, c])} = (x + ?)(x + ?)]]. ${SIGNED}`,
      rows: [{ label: 'שני המספרים החסרים', parts: [{ ans: p }, { t: 'וגם' }, { ans: q }] }],
      swap: [[[0], [1]]],
      hint: `מחפשים שני מספרים שהמכפלה שלהם [[${num(c)}]] והסכום שלהם [[${num(s)}]].`,
      steps: [
        `מחפשים שני מספרים: המכפלה שלהם [[${num(c)}]] (המספר החופשי) והסכום שלהם [[${num(s)}]] (המקדם של [[x]]).`,
        `המספרים הם [[${num(p)}]] ו-[[${num(q)}]]: [[${par(p)} * ${par(q)} = ${num(c)}]] וגם [[${par(p)} + ${par(q)} = ${num(s)}]]`,
        `התשובה: [[${poly([1, s, c])} = ${factor(p)}${factor(q)}]]`,
      ],
      data: { coefs: [1, s, c] },
    };
  },
  verify(q) {
    const [a, b] = q.rows[0].parts.filter((p) => 'ans' in p).map((p) => p.ans);
    return same(polyMul([1, a], [1, b]), q.data.coefs) && q.text.includes(`[[${poly(q.data.coefs)} =`) ? true : 'multiplying back gives another trinomial';
  },
};

/* x² − a² = (x + ?)(x + ?) */
const diffSquares = {
  id: 'diff-squares',
  make(R) {
    const a = R.int(2, 12);
    const first = R.sign();
    return {
      tag: 'הפרש ריבועים',
      text: `השלימו את הפירוק: [[x^2 - ${a * a} = (x + ?)(x + ?)]]. ${SIGNED}`,
      rows: [{ label: 'שני המספרים החסרים', parts: [{ ans: first * a }, { t: 'וגם' }, { ans: -first * a }] }],
      swap: [[[0], [1]]],
      hint: `הפרש ריבועים: [[a^2 - b^2 = (a + b)(a - b)]]. איזה מספר בריבוע נותן [[${a * a}]]?`,
      steps: [
        `[[${a * a} = ${a}^2]], ולכן הביטוי הוא הפרש ריבועים: [[x^2 - ${a}^2]]`,
        'לפי הנוסחה [[a^2 - b^2 = (a + b)(a - b)]].',
        `התשובה: [[x^2 - ${a * a} = ${factor(a)}${factor(-a)}]], כלומר המספרים הם [[${a}]] ו-[[${-a}]].`,
      ],
      data: { coefs: [1, 0, -a * a] },
    };
  },
  verify(q) {
    const [a, b] = q.rows[0].parts.filter((p) => 'ans' in p).map((p) => p.ans);
    return same(polyMul([1, a], [1, b]), q.data.coefs) && q.text.includes(`[[${poly(q.data.coefs)} =`) ? true : 'multiplying back gives another expression';
  },
};

/* x² ± 2ax + a² = (x + ?)² */
const perfectSquare = {
  id: 'perfect-square',
  make(R) {
    const a = R.int(2, 11), s = R.sign();
    const coefs = [1, 2 * s * a, a * a];
    return {
      tag: 'טרינום שהוא ריבוע שלם',
      text: `השלימו את הפירוק: [[${poly(coefs)} = (x + ?)^2]]. ${SIGNED}`,
      rows: [{ label: 'המספר החסר', parts: [{ ans: s * a }] }],
      hint: `נוסחת הכפל המקוצר: [[a^2 ${s < 0 ? '-' : '+'} 2ab + b^2 = (a ${s < 0 ? '-' : '+'} b)^2]]. איזה מספר בריבוע נותן [[${a * a}]]?`,
      steps: [
        `האיבר האחרון הוא ריבוע: [[${a * a} = ${a}^2]]`,
        `בודקים את האיבר האמצעי: [[2 * x * ${a} = ${term(2 * a, 'x')}]], והסימן שלו ${s < 0 ? 'מינוס' : 'פלוס'}.`,
        `התשובה: [[${poly(coefs)} = ${factor(s * a)}^2]], כלומר המספר החסר הוא [[${num(s * a)}]].`,
      ],
      data: { coefs },
    };
  },
  verify(q) {
    const a = q.rows[0].parts[0].ans;
    return same(polyMul([1, a], [1, a]), q.data.coefs) && q.text.includes(`[[${poly(q.data.coefs)} =`) ? true : 'squaring back gives another trinomial';
  },
};

/* which factorisation is right? (three methods) */
const which = {
  id: 'which-factorisation',
  make(R) {
    const kind = R.pick(['tri', 'dsq', 'cf']);
    let expr, opts, why;   // an option: { s: text, f: [factor coefficient lists] }
    if (kind === 'tri') {
      let p, q;
      do { p = R.nz(-9, 9); q = R.nz(-9, 9); } while (p === q || p === -q);
      const o = (a, b) => ({ s: `${factor(a)}${factor(b)}`, f: [[1, a], [1, b]] });
      expr = poly([1, p + q, p * q]);
      opts = [o(p, q), o(-p, -q), o(-p, q), o(p, -q)];
      why = [
        'זה טרינום: מחפשים שני מספרים לפי המכפלה והסכום.',
        `המכפלה [[${num(p * q)}]] והסכום [[${num(p + q)}]]: המספרים הם [[${num(p)}]] ו-[[${num(q)}]].`,
      ];
    } else if (kind === 'dsq') {
      let k, a;
      do { k = R.int(1, 4); a = R.int(1, 9); } while (gcd(k, a) !== 1 || (k === 1 && a === 1));
      expr = poly([k * k, 0, -a * a]);
      opts = [
        { s: `${lin(k, -a)}${lin(k, a)}`, f: [[k, -a], [k, a]] },
        { s: `${lin(k, -a)}^2`, f: [[k, -a], [k, -a]] },
        { s: `${lin(k, a)}^2`, f: [[k, a], [k, a]] },
        { s: `x${lin(k * k, -a * a)}`, f: [[1, 0], [k * k, -a * a]] },
      ];
      why = [
        k === 1
          ? `שני איברים עם מינוס ביניהם, ושניהם ריבועים: [[x^2]] וגם [[${a * a} = ${a}^2]].`
          : `שני איברים עם מינוס ביניהם, ושניהם ריבועים: [[${term(k * k, 'x^2')} = (${term(k, 'x')})^2]] וגם [[${a * a} = ${a}^2]].`,
        'זה הפרש ריבועים: [[a^2 - b^2 = (a - b)(a + b)]].',
      ];
    } else {
      let g, p, q;
      do { g = R.int(2, 6); p = R.int(2, 5); q = R.nz(-7, 7); } while (gcd(p, q) !== 1);
      expr = sum([[g * p, 'x^2'], [g * q, 'x']]);
      opts = [
        { s: `${g}x${lin(p, q)}`, f: [[g, 0], [p, q]] },
        { s: `${g}(${poly([p, 0, q])})`, f: [[g], [p, 0, q]] },
        { s: `x${lin(g * p, q)}`, f: [[1, 0], [g * p, q]] },
        { s: `${g}x${lin(p, g * q)}`, f: [[g, 0], [p, g * q]] },
      ];
      why = [
        `בשני האיברים יש [[x]], ושני המקדמים מתחלקים ב-[[${g}]]. הגורם המשותף הוא [[${term(g, 'x')}]].`,
        `מחלקים כל איבר ב-[[${term(g, 'x')}]] ומקבלים בסוגריים [[${sum([[p, 'x'], [q, '']])}]].`,
      ];
    }
    const good = opts[0];
    const order = R.shuffle(opts);
    return {
      tag: 'איזה פירוק נכון?',
      text: `איזה פירוק לגורמים נכון לביטוי [[${expr}]]?`,
      choices: { options: order.map((o) => `[[${o.s}]]`), correct: order.indexOf(good) },
      hint: 'בדקו קודם אם יש גורם משותף. אם לא: שני איברים שהם ריבועים עם מינוס ביניהם הם הפרש ריבועים, ושלושה איברים הם טרינום. אפשר תמיד לבדוק פירוק על ידי פתיחת הסוגריים.',
      steps: [...why, `התשובה: [[${expr} = ${good.s}]]`],
      data: { expr, coefs: polyMul(...good.f), opts: order.map((o) => o.f) },
    };
  },
  verify(q) {
    const { coefs, opts, expr } = q.data;
    // the expression shown is really the one multiplied back (check by value)
    const shown = expr.replace(/\s/g, '');
    const fromCoefs = poly(coefs).replace(/\s/g, '');
    if (shown !== fromCoefs) return 'expression text and product differ';
    const eq = opts.map((f) => same(polyMul(...f), coefs));
    return eq.filter(Boolean).length === 1 && eq[q.choices.correct] ? true : 'not exactly the marked option multiplies back';
  },
};

export default {
  id: 'factoring',
  name: 'פירוק לגורמים',
  grade: 'ט׳',
  about: 'כותבים ביטוי כמכפלה: גורם משותף, טרינום, והנוסחאות של הכפל המקוצר',
  place: 'הנושא "משוואות מתקדמות" ← פרק חדש בתחילת הנושא, אחרי הפרק החדש "חוק הפילוג המורחב וכפל מקוצר" (מתאים גם כהכנה ל"משוואות ריבועיות", לפני "2. גורם משותף")',
  lesson: [
    { t: 'מהו פירוק לגורמים?', items: [
      'פירוק לגורמים הוא הפעולה ההפוכה לפתיחת סוגריים: כותבים את הביטוי כמכפלה.',
      { f: '6x + 12 = 6(x + 2)' },
      'תמיד אפשר לבדוק פירוק: פותחים את הסוגריים וצריך לקבל שוב את הביטוי המקורי.',
    ] },
    { t: 'הוצאת גורם משותף', items: [
      'מחפשים את הגורם הגדול ביותר שמחלק את כל האיברים, כותבים אותו לפני הסוגריים, ובסוגריים כותבים מה שנשאר מכל איבר.',
      { ex: 'פרקו לגורמים: [[6x^2 + 9x]]', sol: ['[[3]] מחלק את [[6]] ואת [[9]], ובשני האיברים יש [[x]]. הגורם המשותף: [[3x]]', '[[6x^2 : 3x = 2x]] וגם [[9x : 3x = 3]]', 'התשובה: [[3x(2x + 3)]]'] },
    ] },
    { t: 'פירוק טרינום', items: [
      'בטרינום [[x^2 + bx + c]] מחפשים שני מספרים שהמכפלה שלהם [[c]] והסכום שלהם [[b]]. אלה המספרים שבסוגריים.',
      { ex: 'פרקו לגורמים: [[x^2 - 2x - 15]]', sol: ['מחפשים: מכפלה [[-15]] וסכום [[-2]].', 'המספרים הם [[-5]] ו-[[3]]: [[(-5) * 3 = -15]] וגם [[(-5) + 3 = -2]]', 'התשובה: [[(x - 5)(x + 3)]]'] },
      { note: 'בתרגילים כאן הסוגריים כתובים בצורה [[(x + ?)]]. אם בפירוק צריך להיות [[(x - 5)]], המספר החסר הוא [[-5]].' },
    ] },
    { t: 'פירוק לפי נוסחאות הכפל המקוצר', items: [
      { list: ['הפרש ריבועים: [[a^2 - b^2 = (a + b)(a - b)]]', 'ריבוע שלם: [[a^2 + 2ab + b^2 = (a + b)^2]]', 'ריבוע שלם: [[a^2 - 2ab + b^2 = (a - b)^2]]'] },
      { ex: 'פרקו לגורמים: [[x^2 - 49]]', sol: ['[[49 = 7^2]], ולכן זה הפרש ריבועים.', 'התשובה: [[(x + 7)(x - 7)]]'] },
      { note: 'סכום ריבועים, כמו [[x^2 + 49]], אי אפשר לפרק כך. הנוסחה מתאימה רק להפרש.' },
    ] },
  ],
  gens: [common, trinomial, diffSquares, perfectSquare, which],
};
