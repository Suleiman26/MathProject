/* מערכת משוואות (כיתה ח׳) — board #84
   Two linear equations in x and y: what a solution is, substitution, elimination
   (adding / subtracting, also after multiplying one equation), short word problems. */
import { sum, term, num } from '../../core.js';

const eqStr = (a, b, c) => `${sum([[a, 'x'], [b, 'y']])} = ${num(c)}`;
const par = (v) => (v < 0 ? `(${num(v)})` : num(v));
/** m·v written out: "3 * (-2)", "-4", "-(-4)" */
const times = (m, v) => (m === 1 ? num(v) : m === -1 ? `-${par(v)}` : `${num(m)} * ${par(v)}`);
/** the same after a + or - sign (m > 0): a negative value keeps its brackets */
const timesIn = (m, v) => (m === 1 ? par(v) : `${num(m)} * ${par(v)}`);
const holds = (a, b, c, x, y) => a * x + b * y === c;
const xyRows = (x, y) => [{ parts: ['x =', { ans: x }] }, { parts: ['y =', { ans: y }] }];
const boxXY = (q) => [q.rows[0].parts.find((p) => p && typeof p === 'object' && 'ans' in p).ans, q.rows[1].parts.find((p) => p && typeof p === 'object' && 'ans' in p).ans];

/* 1. which pair solves both equations? */
const checkPair = {
  id: 'check-pair',
  make(R) {
    let x0, y0, a1, b1, a2, b2, opts;
    do {
      x0 = R.nz(-5, 6); y0 = R.nz(-5, 6, [x0]);
      a1 = R.int(1, 4); b1 = R.nz(-3, 4); a2 = R.int(1, 4); b2 = R.nz(-3, 4);
      opts = [[x0, y0], [y0, x0], [x0 + b1, y0 - a1], [x0 - b2, y0 + a2]];
    } while (a1 * b2 - a2 * b1 === 0 || new Set(opts.map((o) => o.join())).size < 4 || opts.some(([x, y]) => Math.abs(x) > 9 || Math.abs(y) > 9));
    const c1 = a1 * x0 + b1 * y0, c2 = a2 * x0 + b2 * y0;
    const order = R.shuffle(opts);
    const show = ([x, y]) => `[[(${num(x)}, ${num(y)})]]`;
    return {
      tag: 'מהו פתרון של מערכת?',
      text: `איזה זוג מספרים [[(x, y)]] הוא פתרון של מערכת המשוואות?\n[[${eqStr(a1, b1, c1)}]]\n[[${eqStr(a2, b2, c2)}]]`,
      choices: { options: order.map(show), correct: order.indexOf(opts[0]) },
      hint: 'פתרון של מערכת חייב לקיים את שתי המשוואות. הציבו כל זוג בשתי המשוואות ובדקו. המספר הראשון בזוג הוא [[x]] והשני הוא [[y]].',
      steps: [
        'פתרון של מערכת משוואות הוא זוג מספרים שמקיים את שתי המשוואות גם יחד.',
        `מציבים [[x = ${num(x0)}]], [[y = ${num(y0)}]] במשוואה הראשונה: [[${times(a1, x0)} ${b1 < 0 ? '-' : '+'} ${timesIn(Math.abs(b1), y0)} = ${num(c1)}]]. מתקיים.`,
        `מציבים במשוואה השנייה: [[${times(a2, x0)} ${b2 < 0 ? '-' : '+'} ${timesIn(Math.abs(b2), y0)} = ${num(c2)}]]. מתקיים.`,
        `לכן הפתרון הוא ${show(opts[0])}. כל אחד מהזוגות האחרים לא מקיים לפחות אחת מהמשוואות.`,
      ],
      data: { e1: [a1, b1, c1], e2: [a2, b2, c2], order },
    };
  },
  verify(q) {
    const { e1, e2, order } = q.data;
    const good = order.filter(([x, y]) => holds(...e1, x, y) && holds(...e2, x, y));
    if (good.length !== 1) return `${good.length} options solve the system`;
    const [x, y] = good[0];
    return q.choices.options[q.choices.correct] === `[[(${num(x)}, ${num(y)})]]` ? true : 'wrong option marked';
  },
};

/* 2. substitution: y = mx + b is given */
const substitution = {
  id: 'substitution',
  make(R) {
    let m, x0, y0, b, a, c, K;
    do {
      m = R.nz(-3, 4); x0 = R.nz(-5, 6); y0 = R.nz(-7, 9);
      b = y0 - m * x0; a = R.int(1, 5); c = R.nz(-3, 4); K = a + c * m;
    } while (b === 0 || Math.abs(b) > 12 || K === 0 || a * x0 + c * y0 === 0);
    const d = a * x0 + c * y0;
    const yExpr = sum([[m, 'x'], [b, '']]);
    const cb = c * b;
    return {
      tag: 'שיטת ההצבה',
      text: `פתרו את מערכת המשוואות בשיטת ההצבה.\n[[y = ${yExpr}]]\n[[${eqStr(a, c, d)}]]`,
      rows: xyRows(x0, y0),
      hint: 'במשוואה הראשונה [[y]] כבר מבודד. כתבו את הביטוי שלו במקום [[y]] במשוואה השנייה, ותקבלו משוואה עם [[x]] בלבד.',
      steps: [
        `מציבים את הביטוי של [[y]] במשוואה השנייה: [[${term(a, 'x')} ${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}(${yExpr}) = ${num(d)}]]`,
        `פותחים סוגריים ומכנסים: [[${sum([[K, 'x'], [cb, '']])} = ${num(d)}]]`,
        K === 1 ? `מכאן [[x = ${num(x0)}]]` : `[[${term(K, 'x')} = ${num(d - cb)}]], ולכן [[x = ${num(x0)}]]`,
        `מציבים בחזרה: [[y = ${times(m, x0)} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${num(y0)}]]`,
        `הפתרון: [[x = ${num(x0)}]], [[y = ${num(y0)}]]`,
      ],
      data: { m, b, e2: [a, c, d] },
    };
  },
  verify(q) {
    const { m, b, e2 } = q.data; const [x, y] = boxXY(q);
    if (y !== m * x + b) return 'first equation fails';
    if (!holds(...e2, x, y)) return 'second equation fails';
    return e2[0] + e2[1] * m !== 0 ? true : 'not a single solution';
  },
};

/* 3 + 4. elimination. S = the equation that is multiplied by mul (1 = no multiplying), B = the other one.
   K = the variable that stays, E = the one that is eliminated. */
function elimination(R, needMul) {
  const [K, E] = R.bool() ? ['x', 'y'] : ['y', 'x'];
  let ks, es, kb, eb, mul, sg, kv, ev, D;
  do {
    mul = needMul ? R.int(2, 3) : 1;
    sg = R.sign();                                   // -1: opposite coefficients (add), +1: equal (subtract)
    es = needMul ? R.nz(-3, 3) : R.nz(-5, 5); eb = sg * mul * es;
    ks = R.int(1, 5); kb = needMul ? R.nz(-4, 5) : R.int(1, 6);
    kv = R.nz(-5, 7); ev = R.nz(-5, 7);
    D = sg < 0 ? mul * ks + kb : mul * ks - kb;
  } while (D === 0 || (needMul && ks === Math.abs(kb)) || (ks === kb && es === eb));
  const cs = ks * kv + es * ev, cb = kb * kv + eb * ev;
  const asXY = (k, e, c) => (K === 'x' ? [k, e, c] : [e, k, c]);
  const S = asXY(ks, es, cs), B = asXY(kb, eb, cb);
  const sFirst = R.bool();
  const [first, second] = sFirst ? [S, B] : [B, S];
  const nameS = sFirst ? 'הראשונה' : 'השנייה';
  // the equation in K only. For subtracting, the direction keeps the coefficient of K positive.
  const flip = sg > 0 && D < 0;
  const coef = flip ? -D : D;
  const rhs = sg < 0 ? mul * cs + cb : flip ? cb - mul * cs : mul * cs - cb;
  const now = needMul ? 'עכשיו המקדמים' : 'המקדמים';
  const how = sg < 0
    ? `${now} של [[${E}]] הם מספרים נגדיים, לכן מחברים את שתי המשוואות`
    : `${now} של [[${E}]] שווים, לכן מחסרים משוואה ממשוואה`;
  const kPart = K === 'x'
    ? `${num(ks * kv)} ${es < 0 ? '-' : '+'} ${term(Math.abs(es), 'y')}`
    : sum([[es, 'x'], [ks * kv, '']]);
  const rest = cs - ks * kv;
  const steps = [];
  if (needMul) steps.push(`כופלים את המשוואה ${nameS} ב-[[${mul}]]: [[${eqStr(...asXY(mul * ks, mul * es, mul * cs))}]]`);
  steps.push(coef === 1 ? `${how}: [[${K} = ${num(kv)}]]` : `${how}: [[${term(coef, K)} = ${num(rhs)}]], ולכן [[${K} = ${num(kv)}]]`);
  steps.push(`מציבים [[${K} = ${num(kv)}]] במשוואה ${nameS}: [[${kPart} = ${num(cs)}]]`);
  steps.push(es === 1 ? `מכאן [[${E} = ${num(ev)}]]` : `[[${term(es, E)} = ${num(rest)}]], ולכן [[${E} = ${num(ev)}]]`);
  const x0 = K === 'x' ? kv : ev, y0 = K === 'x' ? ev : kv;
  steps.push(`הפתרון: [[x = ${num(x0)}]], [[y = ${num(y0)}]]`);
  return {
    tag: needMul ? 'השוואת מקדמים עם כפל' : 'השוואת מקדמים',
    text: `פתרו את מערכת המשוואות.\n[[${eqStr(...first)}]]\n[[${eqStr(...second)}]]`,
    rows: xyRows(x0, y0),
    hint: needMul
      ? `כפלו את המשוואה ${nameS} במספר מתאים, כך שהמקדמים של [[${E}]] בשתי המשוואות יהיו שווים או נגדיים. אחר כך חברו או חסרו את המשוואות.`
      : `הסתכלו על המקדמים של [[${E}]] בשתי המשוואות. אם הם נגדיים מחברים את המשוואות, ואם הם שווים מחסרים.`,
    steps,
    data: { e1: first, e2: second, mul, K, E },
  };
}
const eliminate = {
  id: 'elimination',
  make: (R) => elimination(R, false),
  verify(q) {
    const { e1, e2, E } = q.data; const [x, y] = boxXY(q);
    if (!holds(...e1, x, y) || !holds(...e2, x, y)) return 'the solution does not fit both equations';
    const i = E === 'x' ? 0 : 1;
    if (Math.abs(e1[i]) !== Math.abs(e2[i])) return 'coefficients are not ready for adding / subtracting';
    return e1[0] * e2[1] - e2[0] * e1[1] !== 0 ? true : 'not a single solution';
  },
};
const eliminateMul = {
  id: 'elimination-multiply',
  make: (R) => elimination(R, true),
  verify(q) {
    const { e1, e2, E, mul } = q.data; const [x, y] = boxXY(q);
    if (!holds(...e1, x, y) || !holds(...e2, x, y)) return 'the solution does not fit both equations';
    const i = E === 'x' ? 0 : 1; const [p, r] = [Math.abs(e1[i]), Math.abs(e2[i])];
    if (p === r) return 'no multiplying is needed';
    if (Math.max(p, r) !== mul * Math.min(p, r)) return 'the multiplier in the steps is wrong';
    return e1[0] * e2[1] - e2[0] * e1[1] !== 0 ? true : 'not a single solution';
  },
};

/* 5. a story that leads to a system */
const COUNT = [
  (R) => { const p = R.pick([30, 40, 50]), q = R.pick([15, 20, 25]); return { p, q, x: R.int(6, 25), y: R.int(6, 25),
    story: (n, T) => `להצגה נמכרו ${n} כרטיסים. כרטיס למבוגר עולה ${p} ₪ וכרטיס לילד עולה ${q} ₪. בסך הכול שילמו על הכרטיסים ${T} ₪.\nכמה כרטיסים למבוגרים וכמה כרטיסים לילדים נמכרו?`,
    lx: 'מספר הכרטיסים למבוגרים', ly: 'מספר הכרטיסים לילדים', end: (x, y) => `נמכרו ${x} כרטיסים למבוגרים ו-${y} כרטיסים לילדים.` }; },
  (R) => { const [p, q] = R.pick([[10, 5], [5, 2], [10, 2]]); return { p, q, x: R.int(3, 14), y: R.int(3, 14),
    story: (n, T) => `בקופה יש ${n} מטבעות: חלק מהם מטבעות של ${p} ₪ והשאר מטבעות של ${q} ₪. הסכום הכולל בקופה הוא ${T} ₪.\nכמה מטבעות יש בקופה מכל סוג?`,
    lx: `מספר המטבעות של ${p} ₪`, ly: `מספר המטבעות של ${q} ₪`, end: (x, y) => `בקופה יש ${x} מטבעות של ${p} ₪ ו-${y} מטבעות של ${q} ₪.` }; },
  (R) => ({ p: 4, q: 2, x: R.int(4, 15), y: R.int(4, 20),
    story: (n, T) => `בחווה יש פרות ותרנגולות. לכל פרה 4 רגליים ולכל תרנגולת 2 רגליים. בסך הכול יש בחווה ${n} בעלי חיים ו-${T} רגליים.\nכמה פרות וכמה תרנגולות יש בחווה?`,
    lx: 'מספר הפרות', ly: 'מספר התרנגולות', end: (x, y) => `בחווה יש ${x} פרות ו-${y} תרנגולות.` }),
  (R) => ({ p: 6, q: 4, x: R.int(3, 12), y: R.int(3, 12),
    story: (n, T) => `באולם יש ${n} שולחנות: ליד שולחן גדול יושבים 6 אנשים וליד שולחן קטן יושבים 4 אנשים. כל המקומות תפוסים, ובאולם יושבים ${T} אנשים.\nכמה שולחנות גדולים וכמה שולחנות קטנים יש באולם?`,
    lx: 'מספר השולחנות הגדולים', ly: 'מספר השולחנות הקטנים', end: (x, y) => `באולם יש ${x} שולחנות גדולים ו-${y} שולחנות קטנים.` }),
];
const PRICE = [
  { who: ['דנה קנתה', 'יואב קנה'], ax: 'מחברות', by: 'עטים', lx: 'מחיר של מחברת', ly: 'מחיר של עט', one: ['מחברת', 'עט'] },
  { who: ['מאיה קנתה', 'עומר קנה'], ax: 'לחמניות', by: 'כוסות מיץ', lx: 'מחיר של לחמנייה', ly: 'מחיר של כוס מיץ', one: ['לחמנייה', 'כוס מיץ'] },
  { who: ['נועה קנתה', 'איתי קנה'], ax: 'חבילות מדבקות', by: 'מחקים', lx: 'מחיר של חבילת מדבקות', ly: 'מחיר של מחק', one: ['חבילת מדבקות', 'מחק'] },
];
const word = {
  id: 'word-problem',
  make(R) {
    if (R.bool(0.6)) {
      let t;
      do { t = R.pick(COUNT)(R); } while (t.x === t.y);
      const { p, q, x, y } = t; const n = x + y, T = p * x + q * y;
      return {
        tag: 'שאלה מילולית עם מערכת משוואות',
        text: t.story(n, T),
        rows: [{ label: `${t.lx}:`, parts: ['x =', { ans: x }] }, { label: `${t.ly}:`, parts: ['y =', { ans: y }] }],
        hint: 'סמנו שני נעלמים וכתבו שתי משוואות: אחת על הכמות הכוללת, ואחת על הסכום הכולל.',
        steps: [
          `נסמן: [[x]] הוא ${t.lx}, [[y]] הוא ${t.ly}.`,
          `המערכת: [[x + y = ${n}]] וגם [[${p}x + ${q}y = ${T}]]`,
          `מהמשוואה הראשונה [[y = ${n} - x]]. מציבים בשנייה: [[${p}x + ${q}(${n} - x) = ${T}]]`,
          `[[${term(p - q, 'x')} = ${T - q * n}]], ולכן [[x = ${x}]] ו-[[y = ${n} - ${x} = ${y}]]`,
          `תשובה: ${t.end(x, y)}`,
        ],
        data: { kind: 'count', e1: [1, 1, n], e2: [p, q, T], nums: [n, T] },
      };
    }
    const t = R.pick(PRICE);
    let x, y, a1, a2, b;
    do { x = R.int(3, 12); y = R.int(2, 9); a1 = R.int(3, 6); a2 = R.int(2, a1 - 1); b = R.int(2, 4); } while (x === y);
    const c1 = a1 * x + b * y, c2 = a2 * x + b * y;
    return {
      tag: 'שאלה מילולית עם מערכת משוואות',
      text: `${t.who[0]} ${a1} ${t.ax} ו-${b} ${t.by} ושילמה ${c1} ₪. ${t.who[1]} באותה חנות ${a2} ${t.ax} ו-${b} ${t.by} ושילם ${c2} ₪.\nמה ה${t.lx} ומה ה${t.ly}?`,
      rows: [{ label: `ה${t.lx}:`, parts: ['x =', { ans: x }, { t: '₪' }] }, { label: `ה${t.ly}:`, parts: ['y =', { ans: y }, { t: '₪' }] }],
      hint: 'סמנו את שני המחירים ב-[[x]] וב-[[y]] וכתבו משוואה לכל קנייה. שימו לב שמספר ה' + t.by + ' שווה בשתי הקניות.',
      steps: [
        `נסמן: [[x]] הוא ה${t.lx}, [[y]] הוא ה${t.ly} (בשקלים).`,
        `המערכת: [[${eqStr(a1, b, c1)}]] וגם [[${eqStr(a2, b, c2)}]]`,
        `המקדמים של [[y]] שווים, לכן מחסרים את המשוואות: [[${term(a1 - a2, 'x')} = ${c1 - c2}]]${a1 - a2 === 1 ? '' : `, ולכן [[x = ${x}]]`}`,
        `מציבים במשוואה השנייה: [[${a2 * x} + ${b}y = ${c2}]], ולכן [[${b}y = ${c2 - a2 * x}]] ו-[[y = ${y}]]`,
        `תשובה: ${t.one[0]} עולה ${x} ₪ ו${t.one[1]} עולה ${y} ₪.`,
      ],
      data: { kind: 'price', e1: [a1, b, c1], e2: [a2, b, c2], nums: [a1, a2, b, c1, c2] },
    };
  },
  verify(q) {
    const { e1, e2, nums } = q.data; const [x, y] = boxXY(q);
    if (!holds(...e1, x, y) || !holds(...e2, x, y)) return 'the answer does not fit the story';
    if (x <= 0 || y <= 0) return 'amounts must be positive';
    if (e1[0] * e2[1] - e2[0] * e1[1] === 0) return 'not a single solution';
    const inText = (q.text.match(/\d+/g) || []).map(Number);
    return nums.every((v) => inText.includes(v)) ? true : 'a number of the story is missing in the text';
  },
};

export default {
  id: 'systems',
  name: 'מערכת משוואות',
  grade: 'ח׳',
  about: 'שתי משוואות עם שני נעלמים: מוצאים את הזוג שמקיים את שתיהן, בהצבה או בהשוואת מקדמים',
  place: 'נושא חדש בתחום אלגברה, אחרי "משוואות" (כיתה ח׳): יש כאן שתי שיטות ושאלות מילוליות, יותר מפרק אחד. "נקודות חיתוך" ← "1. ישר–ישר" הוא הצד הגרפי של אותו רעיון',
  lesson: [
    { t: 'מהי מערכת משוואות?', items: [
      'מערכת משוואות היא שתי משוואות עם שני נעלמים, [[x]] ו-[[y]]. פתרון של המערכת הוא זוג מספרים שמקיים את שתי המשוואות גם יחד.',
      { f: 'x + y = 7' },
      { f: 'x - y = 3' },
      'הזוג [[x = 5]], [[y = 2]] הוא הפתרון: [[5 + 2 = 7]] וגם [[5 - 2 = 3]].',
      { note: 'זוג שמקיים רק משוואה אחת אינו פתרון. למשל [[x = 4]], [[y = 3]] מקיים את הראשונה ([[4 + 3 = 7]]) אבל לא את השנייה ([[4 - 3 = 1]]).' },
    ] },
    { t: 'שיטת ההצבה', items: [
      'כשבאחת המשוואות נעלם אחד כבר מבודד, כותבים את הביטוי שלו במקומו במשוואה השנייה. כך מקבלים משוואה עם נעלם אחד.',
      { ex: 'פתרו: [[y = 2x + 1]] וגם [[3x + y = 11]]', sol: [
        'מציבים במשוואה השנייה: [[3x + (2x + 1) = 11]]',
        'מכנסים: [[5x + 1 = 11]], ולכן [[5x = 10]] ו-[[x = 2]]',
        'מציבים בחזרה: [[y = 2 * 2 + 1 = 5]]',
        'הפתרון: [[x = 2]], [[y = 5]]',
      ] },
    ] },
    { t: 'שיטת השוואת המקדמים', items: [
      'כשהמקדמים של אחד הנעלמים נגדיים, מחברים את המשוואות והנעלם הזה נעלם. כשהמקדמים שווים, מחסרים משוואה ממשוואה.',
      { ex: 'פתרו: [[2x + 3y = 13]] וגם [[x - 3y = -7]]', sol: [
        'המקדמים של [[y]] הם [[3]] ו-[[-3]], מספרים נגדיים. מחברים: [[3x = 6]], ולכן [[x = 2]]',
        'מציבים במשוואה הראשונה: [[4 + 3y = 13]], ולכן [[3y = 9]] ו-[[y = 3]]',
        'הפתרון: [[x = 2]], [[y = 3]]',
      ] },
      'אם המקדמים אינם שווים ואינם נגדיים, כופלים קודם אחת מהמשוואות במספר מתאים.',
      { ex: 'פתרו: [[x + 2y = 8]] וגם [[3x + 4y = 18]]', sol: [
        'כופלים את המשוואה הראשונה ב-[[2]]: [[2x + 4y = 16]]',
        'עכשיו המקדמים של [[y]] שווים. מחסרים מהמשוואה השנייה: [[x = 2]]',
        'מציבים במשוואה הראשונה: [[2 + 2y = 8]], ולכן [[2y = 6]] ו-[[y = 3]]',
        'הפתרון: [[x = 2]], [[y = 3]]',
      ] },
      { note: 'כשכופלים משוואה במספר, כופלים את כל האיברים בשני האגפים, גם את המספר החופשי. ואחרי שמצאתם נעלם אחד, אל תשכחו למצוא גם את השני.' },
    ] },
  ],
  gens: [checkPair, substitution, eliminate, eliminateMul, word],
};
