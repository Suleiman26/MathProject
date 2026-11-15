/* חוק הפילוג המורחב וכפל מקוצר (כיתה ט׳) — board #84 */
import { sum, term, num, poly, factor } from '../../core.js';

const lin = (a, b) => `(${sum([[a, 'x'], [b, '']])})`;
const polyMul = (p, q) => { const r = Array(p.length + q.length - 1).fill(0); p.forEach((a, i) => q.forEach((b, j) => { r[i + j] += a * b; })); return r; };
const pad3 = (c) => [...Array(3 - c.length).fill(0), ...c];
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/** The polynomial a row shows: "… = x^2 -" [box] "x +" [box]  → [1, -box, box] */
function rowPoly(parts) {
  const c = [0, 0, 0];
  if (/=\s*x\^2/.test(parts[0])) c[0] += 1;
  parts.forEach((p, i) => {
    if (!p || typeof p !== 'object' || !('ans' in p)) return;
    const before = String(parts[i - 1] || '').trim(), after = String(parts[i + 1] || '').trim();
    const sign = before.endsWith('-') ? -1 : 1;
    const deg = after.startsWith('x^2') ? 2 : after.startsWith('x') ? 1 : 0;
    c[2 - deg] += sign * p.ans;
  });
  return c;
}
const pm = (v) => (v < 0 ? '-' : '+');

/* (x + a)(x + b) = x² ± ?x ± ? */
const binomials = {
  id: 'binomials',
  make(R) {
    let a, b;
    do { a = R.nz(-9, 9); b = R.nz(-9, 9); } while (a === b || Math.abs(a + b) < 2);
    const s = a + b, p = a * b;
    return {
      tag: 'חוק הפילוג המורחב',
      text: 'פתחו סוגריים וכנסו איברים דומים.',
      rows: [{ parts: [`${factor(a)}${factor(b)} = x^2 ${pm(s)}`, { ans: Math.abs(s) }, `x ${pm(p)}`, { ans: Math.abs(p) }] }],
      hint: 'כופלים כל איבר בסוגריים הראשונים בכל איבר בסוגריים השניים: ארבע מכפלות.',
      steps: [
        `ארבע המכפלות: [[${sum([[1, 'x^2'], [b, 'x'], [a, 'x'], [p, '']])}]]`,
        `מכנסים את האיברים עם [[x]]: [[${sum([[b, 'x'], [a, 'x']])} = ${term(s, 'x')}]]`,
        `התשובה: [[${poly([1, s, p])}]]`,
      ],
      data: { f: [[1, a], [1, b]] },
    };
  },
  verify(q) {
    const want = polyMul(...q.data.f);
    return same(want, rowPoly(q.rows[0].parts)) ? true : 'product differs from the row';
  },
};

/* (ax + b)(cx + d) = ?x² ± ?x ± ? */
const general = {
  id: 'general',
  make(R) {
    let a, b, c, d;
    do { a = R.int(1, 4); c = R.int(1, 4); b = R.nz(-7, 7); d = R.nz(-7, 7); } while (a * c < 2 || Math.abs(a * d + b * c) < 2);
    const m = a * d + b * c, e = b * d;
    return {
      tag: 'כפל שני דו-איברים',
      text: 'פתחו סוגריים וכנסו איברים דומים.',
      rows: [{ parts: [`${lin(a, b)}${lin(c, d)} =`, { ans: a * c }, `x^2 ${pm(m)}`, { ans: Math.abs(m) }, `x ${pm(e)}`, { ans: Math.abs(e) }] }],
      hint: 'ארבע מכפלות: ראשון בראשון, ראשון בשני, שני בראשון, שני בשני. בסוף מכנסים את האיברים עם [[x]].',
      steps: [
        `ארבע המכפלות: [[${sum([[a * c, 'x^2'], [a * d, 'x'], [b * c, 'x'], [e, '']])}]]`,
        `מכנסים את האיברים עם [[x]]: [[${sum([[a * d, 'x'], [b * c, 'x']])} = ${term(m, 'x')}]]`,
        `התשובה: [[${poly([a * c, m, e])}]]`,
      ],
      data: { f: [[a, b], [c, d]] },
    };
  },
  verify(q) {
    const want = polyMul(...q.data.f);
    return same(want, rowPoly(q.rows[0].parts)) ? true : 'product differs from the row';
  },
};

/* the three formulas, typed: (kx ± a)²  and  (kx + a)(kx − a) */
const formulas = {
  id: 'formulas',
  make(R) {
    const k = R.bool(0.6) ? 1 : R.int(2, 4);
    const a = k === 1 ? R.int(2, 12) : R.int(1, 6);
    const kx = term(k, 'x');
    if (R.bool(0.6)) {
      const s = R.sign();
      const expr = `${lin(k, s * a)}^2`;
      const tail = [`x^2 ${pm(s)}`, { ans: 2 * k * a }, 'x +', { ans: a * a }];
      return {
        tag: 'ריבוע של דו-איבר',
        text: 'פתחו סוגריים בעזרת נוסחת הכפל המקוצר.',
        rows: [{ parts: k === 1 ? [`${expr} = ${tail[0]}`, ...tail.slice(1)] : [`${expr} =`, { ans: k * k }, ...tail] }],
        hint: `הנוסחה: [[(a ${pm(s)} b)^2 = a^2 ${pm(s)} 2ab + b^2]]. אל תשכחו את האיבר האמצעי.`,
        steps: [
          `לפי הנוסחה [[(a ${pm(s)} b)^2 = a^2 ${pm(s)} 2ab + b^2]], וכאן [[a = ${kx}]] ו-[[b = ${a}]].`,
          k === 1 ? `האיבר האמצעי: [[2 * x * ${a} = ${term(2 * a, 'x')}]]` : `[[(${kx})^2 = ${term(k * k, 'x^2')}]], והאיבר האמצעי: [[2 * ${kx} * ${a} = ${term(2 * k * a, 'x')}]]`,
          `האיבר האחרון: [[${a}^2 = ${a * a}]]`,
          `התשובה: [[${poly([k * k, s * 2 * k * a, a * a])}]]`,
        ],
        data: { f: [[k, s * a], [k, s * a]] },
      };
    }
    const first = R.sign();
    const expr = `${lin(k, first * a)}${lin(k, -first * a)}`;
    return {
      tag: 'מכפלת סכום בהפרש',
      text: 'פתחו סוגריים בעזרת נוסחת הכפל המקוצר.',
      rows: [{ parts: k === 1 ? [`${expr} = x^2 -`, { ans: a * a }] : [`${expr} =`, { ans: k * k }, 'x^2 -', { ans: a * a }] }],
      hint: 'הנוסחה: [[(a + b)(a - b) = a^2 - b^2]]. כאן אין איבר אמצעי.',
      steps: [
        `לפי הנוסחה [[(a + b)(a - b) = a^2 - b^2]], וכאן [[a = ${kx}]] ו-[[b = ${a}]].`,
        k === 1 ? `[[${a}^2 = ${a * a}]]` : `[[(${kx})^2 = ${term(k * k, 'x^2')}]] וגם [[${a}^2 = ${a * a}]]`,
        `התשובה: [[${poly([k * k, 0, -a * a])}]]`,
      ],
      data: { f: [[k, first * a], [k, -first * a]] },
    };
  },
  verify(q) {
    const want = polyMul(...q.data.f);
    return same(want, rowPoly(q.rows[0].parts)) ? true : 'product differs from the row';
  },
};

/* which expression equals (x ± a)² / (x + a)(x − a) ? */
const which = {
  id: 'which-formula',
  make(R) {
    const a = R.int(2, 9), kind = R.pick(['plus', 'minus', 'diff']);
    const s = kind === 'minus' ? -1 : 1;
    let expr, f, good, bads, why;
    if (kind === 'diff') {
      expr = `${factor(a)}${factor(-a)}`; f = [[1, a], [1, -a]];
      good = [1, 0, -a * a]; bads = [[1, 0, a * a], [1, -2 * a, a * a], [1, -2 * a, -a * a]];
      why = ['זו מכפלה של סכום בהפרש: [[(a + b)(a - b) = a^2 - b^2]].', `כאן [[a = x]] ו-[[b = ${a}]], ולכן מקבלים [[x^2 - ${a}^2]].`];
    } else {
      expr = `${factor(s * a)}^2`; f = [[1, s * a], [1, s * a]];
      good = [1, 2 * s * a, a * a]; bads = [[1, 0, a * a], [1, s * a, a * a], [1, 2 * s * a, -a * a]];
      why = [`זה ריבוע של דו-איבר: [[(a ${pm(s)} b)^2 = a^2 ${pm(s)} 2ab + b^2]].`, `כאן [[a = x]] ו-[[b = ${a}]]: האיבר האמצעי הוא [[2 * x * ${a} = ${term(2 * a, 'x')}]] והאחרון [[${a}^2 = ${a * a}]].`];
    }
    const opts = R.shuffle([good, ...bads]);
    return {
      tag: 'זיהוי נוסחת כפל מקוצר',
      text: `איזה ביטוי שווה ל-[[${expr}]]?`,
      choices: { options: opts.map((o) => `[[${poly(o)}]]`), correct: opts.indexOf(good) },
      hint: kind === 'diff' ? 'סכום כפול הפרש של אותם שני איברים: האיברים האמצעיים מתבטלים.' : 'ריבוע של דו-איבר נותן שלושה איברים, ולא שניים.',
      steps: [...why, `התשובה: [[${poly(good)}]]`],
      data: { f, opts },
    };
  },
  verify(q) {
    const want = polyMul(...q.data.f);
    const eq = q.data.opts.map((o) => same(o, want));
    if (eq.filter(Boolean).length !== 1 || !eq[q.choices.correct]) return 'not exactly the marked option is equal';
    return q.choices.options[q.choices.correct] === `[[${poly(want)}]]` ? true : 'option text differs';
  },
};

/* (x + a)(x + b) − x(x + c) = ?x ± ? */
const simplify = {
  id: 'simplify',
  make(R) {
    let a, b, c;
    do { a = R.nz(-8, 8); b = R.nz(-8, 8); c = R.nz(-9, 9); } while (a === b || a + b - c < 2);
    const A = a + b - c, B = a * b;
    return {
      tag: 'פישוט ביטוי',
      text: 'פתחו סוגריים וכנסו איברים דומים.',
      rows: [{ parts: [`${factor(a)}${factor(b)} - x${factor(c)} =`, { ans: A }, `x ${pm(B)}`, { ans: Math.abs(B) }] }],
      hint: 'פותחים כל מכפלה בנפרד. שימו לב למינוס שלפני המכפלה השנייה: הוא הופך את הסימן של כל איבר בה.',
      steps: [
        `המכפלה הראשונה: [[${factor(a)}${factor(b)} = ${poly([1, a + b, B])}]]`,
        `המכפלה השנייה, עם המינוס: [[-x${factor(c)} = ${sum([[-1, 'x^2'], [-c, 'x']])}]]`,
        `[[x^2]] ו-[[-x^2]] מתבטלים. נשאר: [[${sum([[a + b, 'x'], [-c, 'x'], [B, '']])}]]`,
        `התשובה: [[${sum([[A, 'x'], [B, '']])}]]`,
      ],
      data: { a, b, c },
    };
  },
  verify(q) {
    const { a, b, c } = q.data;
    const got = rowPoly(q.rows[0].parts);
    if (got[0] !== 0 || got[1] < 2) return 'degenerate row';
    for (const x of [-5, -2, 0, 1, 3, 8]) if ((x + a) * (x + b) - x * (x + c) !== got[1] * x + got[2]) return `value differs at ${x}`;
    return true;
  },
};

export default {
  id: 'short-mult',
  name: 'חוק הפילוג המורחב וכפל מקוצר',
  grade: 'ט׳',
  about: 'כופלים סוגריים בסוגריים, ומכירים את שלוש נוסחאות הכפל המקוצר',
  place: 'הנושא "משוואות מתקדמות" ← פרק חדש בתחילת הנושא, לפני "1 — לינארית עם מכנה" (בכל מקרה לפני "3 — כפל מקוצר", שמשתמש בנוסחאות בתוך משוואות)',
  lesson: [
    { t: 'חוק הפילוג המורחב', items: [
      'כשכופלים סוגריים בסוגריים, כל איבר בסוגריים הראשונים כופל כל איבר בסוגריים השניים. מתקבלות ארבע מכפלות.',
      { f: '(a + b)(c + d) = ac + ad + bc + bd' },
      { ex: 'פתחו סוגריים: [[(x + 3)(x + 5)]]', sol: ['ארבע המכפלות: [[x^2 + 5x + 3x + 15]]', 'מכנסים: [[5x + 3x = 8x]]', 'התשובה: [[x^2 + 8x + 15]]'] },
      { note: 'הסימן שייך לאיבר: ב-[[(x - 2)(x + 7)]] כופלים ב-[[-2]], ולכן האיבר האחרון הוא [[-14]].' },
    ] },
    { t: 'שלוש נוסחאות הכפל המקוצר', items: [
      'יש שלוש מכפלות שחוזרות הרבה, ולכן כדאי לזכור את התוצאה שלהן.',
      { list: ['ריבוע של סכום: [[(a + b)^2 = a^2 + 2ab + b^2]]', 'ריבוע של הפרש: [[(a - b)^2 = a^2 - 2ab + b^2]]', 'מכפלת סכום בהפרש: [[(a + b)(a - b) = a^2 - b^2]]'] },
      { ex: 'פתחו סוגריים: [[(x - 4)^2]]', sol: ['כאן [[a = x]] ו-[[b = 4]].', 'האיבר האמצעי: [[2 * x * 4 = 8x]], והאחרון: [[4^2 = 16]]', 'התשובה: [[x^2 - 8x + 16]]'] },
      { ex: 'פתחו סוגריים: [[(3x + 2)(3x - 2)]]', sol: ['כאן [[a = 3x]] ו-[[b = 2]].', '[[(3x)^2 = 9x^2]] וגם [[2^2 = 4]]', 'התשובה: [[9x^2 - 4]]'] },
    ] },
    { t: 'טעות נפוצה', items: [
      { note: '[[(x + 3)^2]] אינו שווה ל-[[x^2 + 9]]. חסר האיבר האמצעי: [[(x + 3)^2 = x^2 + 6x + 9]].' },
      'אפשר תמיד לבדוק: [[(x + 3)^2 = (x + 3)(x + 3)]], ופותחים לפי חוק הפילוג המורחב.',
    ] },
  ],
  gens: [binomials, general, formulas, which, simplify],
};
