/* שברים אלגבריים (כיתה ט׳) — board #84 */
import { sum, term, num, poly, factor, gcd, reduce, fracStr } from '../../core.js';

const xp = (p) => (p === 1 ? 'x' : `x^${p}`);
/** A monomial fraction n·x^p / d (p < 0 → x in the denominator) as math text. */
function monoStr({ n, d, p }) {
  const top = p > 0 ? term(n, xp(p)) : num(n);
  const bot = p < 0 ? term(d, xp(-p)) : num(d);
  return bot === '1' ? top : `{${top}|${bot}}`;
}
const monoVal = ({ n, d, p }, x) => (n * x ** p) / d;
const close = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const XS = [2, 3, 5];

function checkMono(q, value) {
  const { opts } = q.data;
  const eq = opts.map((o) => XS.every((x) => close(monoVal(o, x), value(x))));
  if (eq.filter(Boolean).length !== 1 || !eq[q.choices.correct]) return 'not exactly the marked option is equal';
  const o = opts[q.choices.correct];
  if (gcd(o.n, o.d) !== 1) return 'the answer is not reduced';
  return q.choices.options[q.choices.correct] === `[[${monoStr(o)}]]` ? true : 'option text differs';
}

/* a·x^m / b·x^k  → reduced (multiple choice) */
const monoReduce = {
  id: 'reduce-monomial',
  make(R) {
    let g, n, d, m, k, opts;
    do {
      g = R.int(2, 6); n = R.int(1, 5); d = R.int(1, 5); m = R.int(1, 4); k = R.int(1, 4);
      const p = m - k;
      opts = [{ n, d, p }, { n, d, p: 0 }, { n, d, p: -p }, { n, d, p: p > 0 ? m : -k }];
    } while (n === d || gcd(n, d) !== 1 || m === k || new Set(opts.map(monoStr)).size !== 4);
    const a = g * n, b = g * d, p = m - k;
    const good = opts[0];
    const order = R.shuffle(opts);
    return {
      tag: 'צמצום שבר אלגברי',
      text: `צמצמו את השבר [[{${term(a, xp(m))}|${term(b, xp(k))}}]] (בתחום ההגדרה [[x != 0]]).`,
      choices: { options: order.map((o) => `[[${monoStr(o)}]]`), correct: order.indexOf(good) },
      hint: 'מצמצמים בנפרד את המספרים ובנפרד את החזקות של [[x]]. בחילוק חזקות מחסרים את המעריכים.',
      steps: [
        `מצמצמים את המספרים: מחלקים את [[${a}]] ואת [[${b}]] ב-[[${g}]] ומקבלים [[${n}]] ו-[[${d}]].`,
        p > 0
          ? `מצמצמים את [[x]]: [[${xp(m)} : ${xp(k)} = ${xp(p)}]], והוא נשאר במונה.`
          : `מצמצמים את [[x]]: [[${xp(k)} : ${xp(m)} = ${xp(-p)}]], והוא נשאר במכנה.`,
        `התשובה: [[${monoStr(good)}]]`,
      ],
      data: { a, b, m, k, opts: order },
    };
  },
  verify(q) {
    const { a, b, m, k } = q.data;
    return checkMono(q, (x) => (a * x ** m) / (b * x ** k));
  },
};

/* factor the numerator, then reduce:  … / (x + t) = x ± ? */
const factorReduce = {
  id: 'reduce-after-factoring',
  make(R) {
    const kind = R.pick(['dsq', 'tri', 'cf']);
    let numC, denC, r, top, bot, zero, steps, hint;
    if (kind === 'dsq') {
      const a = R.int(2, 12), t = R.sign() * a;
      numC = [1, 0, -a * a]; denC = [1, t]; r = -t; zero = -t;
      top = poly(numC); bot = sum([[1, 'x'], [t, '']]);
      hint = 'המונה הוא הפרש ריבועים: [[a^2 - b^2 = (a + b)(a - b)]].';
      steps = [
        `מפרקים את המונה (הפרש ריבועים): [[${top} = ${factor(-t)}${factor(t)}]]`,
        `בשבר [[{${factor(-t)}${factor(t)}|${bot}}]] מצמצמים את הגורם [[${factor(t)}]], שנמצא גם במונה וגם במכנה.`,
      ];
    } else if (kind === 'tri') {
      let p, s;
      do { p = R.nz(-9, 9); s = R.nz(-9, 9); } while (p === s || p === -s);
      numC = [1, p + s, p * s]; denC = [1, p]; r = s; zero = -p;
      top = poly(numC); bot = sum([[1, 'x'], [p, '']]);
      hint = `המונה הוא טרינום: מחפשים שני מספרים שהמכפלה שלהם [[${num(p * s)}]] והסכום שלהם [[${num(p + s)}]].`;
      steps = [
        `מפרקים את המונה (טרינום): [[${top} = ${factor(p)}${factor(s)}]]`,
        `בשבר [[{${factor(p)}${factor(s)}|${bot}}]] מצמצמים את הגורם [[${factor(p)}]], שנמצא גם במונה וגם במכנה.`,
      ];
    } else {
      const a = R.int(2, 7), b = R.nz(-9, 9);
      numC = [a, a * b, 0]; denC = [a, 0]; r = b; zero = 0;
      top = sum([[a, 'x^2'], [a * b, 'x']]); bot = term(a, 'x');
      hint = `במונה אפשר להוציא גורם משותף: [[${bot}]].`;
      steps = [
        `מוציאים גורם משותף במונה: [[${top} = ${bot}${factor(b)}]]`,
        `בשבר [[{${bot}${factor(b)}|${bot}}]] מצמצמים את [[${bot}]], שנמצא גם במונה וגם במכנה.`,
      ];
    }
    return {
      tag: 'צמצום אחרי פירוק לגורמים',
      text: `פרקו את המונה לגורמים וצמצמו את השבר (בתחום ההגדרה [[x != ${num(zero)}]]).`,
      rows: [{ parts: [`{${top}|${bot}} = x ${r < 0 ? '-' : '+'}`, { ans: Math.abs(r) }] }],
      hint,
      steps: [...steps, `התשובה: [[${sum([[1, 'x'], [r, '']])}]]`],
      data: { numC, denC, zero },
    };
  },
  verify(q) {
    const { numC, denC, zero } = q.data;
    const p = q.rows[0].parts;
    const r = (p[0].trim().endsWith('-') ? -1 : 1) * p[1].ans;
    if (p[1].ans <= 0) return 'box must be positive';
    const ev = (c, x) => c.reduce((s, v) => s * x + v, 0);
    if (ev(denC, zero) !== 0) return 'the stated domain is wrong';
    let n = 0;
    for (let x = -13; x <= 13; x++) {
      const den = ev(denC, x);
      if (den === 0) { if (x !== zero) return 'another zero of the denominator'; continue; }
      if (ev(numC, x) !== den * (x + r)) return `value differs at ${x}`;
      n++;
    }
    return n >= 20 ? true : 'too few test points';
  },
};

/* (ax + ab) / (cx + cb) = a/c, reduced */
const numberReduce = {
  id: 'reduce-to-number',
  make(R) {
    let a, c, b, fn, fd;
    do { a = R.int(2, 12); c = R.int(2, 12); b = R.nz(-9, 9); [fn, fd] = reduce(a, c); } while (a === c || fd === 1);
    const top = sum([[a, 'x'], [a * b, '']]), bot = sum([[c, 'x'], [c * b, '']]);
    return {
      tag: 'צמצום: גורם משותף במונה ובמכנה',
      text: `צמצמו את השבר (בתחום ההגדרה [[x != ${num(-b)}]]). כתבו את התוצאה כשבר מצומצם.`,
      rows: [{ parts: [`{${top}|${bot}} =`, { frac: [fn, fd], reduced: true }] }],
      hint: 'הוציאו גורם משותף במונה וגם במכנה. מה נשאר בסוגריים בכל אחד מהם?',
      steps: [
        `מוציאים גורם משותף במונה: [[${top} = ${a}${factor(b)}]]`,
        `מוציאים גורם משותף במכנה: [[${bot} = ${c}${factor(b)}]]`,
        `מצמצמים את [[${factor(b)}]] ונשאר [[{${a}|${c}}${fn !== a ? ` = ${fracStr(fn, fd)}` : ''}]]`,
      ],
      data: { top: [a, a * b], bot: [c, c * b] },
    };
  },
  verify(q) {
    const { top, bot } = q.data;
    const box = q.rows[0].parts[1];
    const [fn, fd] = box.frac;
    if (gcd(fn, fd) !== 1 || fd <= 1 || !box.reduced) return 'answer is not a reduced proper fraction box';
    let n = 0;
    for (let x = -12; x <= 12; x++) {
      const den = bot[0] * x + bot[1];
      if (den === 0) continue;
      if ((top[0] * x + top[1]) * fd !== fn * den) return `value differs at ${x}`;
      n++;
    }
    return n >= 20 ? true : 'too few test points';
  },
};

/* multiply two monomial fractions and reduce (multiple choice) */
const multiply = {
  id: 'multiply',
  make(R) {
    let a, b, c, d, m, k, N, D, opts;
    do {
      a = R.int(2, 9); b = R.int(2, 9); c = R.int(2, 9); d = R.int(2, 9); m = R.int(1, 3); k = R.int(1, 3);
      [N, D] = reduce(a * c, b * d);
      const [n2, d2] = reduce(a * d, b * c);
      const p = m - k;
      opts = [{ n: N, d: D, p }, { n: N, d: D, p: -p }, { n: N, d: D, p: m + k }, { n: n2, d: d2, p }];
    } while (gcd(a, b) !== 1 || gcd(c, d) !== 1 || (gcd(a, d) === 1 && gcd(c, b) === 1) || m === k || new Set(opts.map(monoStr)).size !== 4);
    const flip = R.bool();   // where the x's sit
    const f1 = flip ? `{${a}|${term(b, xp(k))}}` : `{${term(a, xp(m))}|${b}}`;
    const f2 = flip ? `{${term(c, xp(m))}|${d}}` : `{${c}|${term(d, xp(k))}}`;
    const g = gcd(a * c, b * d), p = m - k;
    const good = opts[0];
    const order = R.shuffle(opts);
    return {
      tag: 'כפל שברים אלגבריים',
      text: `כפלו וצמצמו (בתחום ההגדרה [[x != 0]]): [[${f1} * ${f2}]]`,
      choices: { options: order.map((o) => `[[${monoStr(o)}]]`), correct: order.indexOf(good) },
      hint: 'כופלים מונה במונה ומכנה במכנה, ואז מצמצמים את המספרים ואת החזקות של [[x]].',
      steps: [
        `כופלים מונה במונה ומכנה במכנה: [[{${term(a * c, xp(m))}|${term(b * d, xp(k))}}]]`,
        `מצמצמים את המספרים ב-[[${g}]]: [[${a * c} : ${g} = ${N}]] וגם [[${b * d} : ${g} = ${D}]]`,
        p > 0
          ? `מצמצמים את [[x]]: [[${xp(m)} : ${xp(k)} = ${xp(p)}]], והוא נשאר במונה.`
          : `מצמצמים את [[x]]: [[${xp(k)} : ${xp(m)} = ${xp(-p)}]], והוא נשאר במכנה.`,
        `התשובה: [[${monoStr(good)}]]`,
      ],
      data: { a, b, c, d, m, k, opts: order },
    };
  },
  verify(q) {
    const { a, b, c, d, m, k } = q.data;
    // both layouts have the same value: (a·x^m / b) · (c / d·x^k)
    return checkMono(q, (x) => ((a * x ** m) / b) * (c / (d * x ** k)));
  },
};

/* divide = multiply by the reciprocal; the result is a number fraction */
const divide = {
  id: 'divide',
  make(R) {
    let text, expr, steps, data, fn, fd;
    if (R.bool()) {
      let s, k, m;
      do { s = R.nz(-9, 9); k = R.int(2, 12); m = R.int(2, 12); [fn, fd] = reduce(m, k); } while (k === m || fd === 1);
      const bin = sum([[1, 'x'], [s, '']]);
      expr = `{${bin}|${k}} : {${bin}|${m}}`;
      text = `חשבו וצמצמו (בתחום ההגדרה [[x != ${num(-s)}]]). כתבו את התוצאה כשבר מצומצם.`;
      steps = [
        `חילוק בשבר הוא כפל בשבר ההופכי: [[{${bin}|${k}} * {${m}|${bin}}]]`,
        `כופלים מונה במונה ומכנה במכנה: [[{${m}${factor(s)}|${k}${factor(s)}}]]`,
        `מצמצמים את [[${factor(s)}]] ונשאר [[{${m}|${k}}${fn !== m ? ` = ${fracStr(fn, fd)}` : ''}]]`,
      ];
      data = { kind: 'bin', s, k, m };
    } else {
      let a, b, c, d;
      do { a = R.int(2, 9); b = R.int(2, 9); c = R.int(2, 9); d = R.int(2, 9); [fn, fd] = reduce(a * d, b * c); } while (gcd(a, b) !== 1 || gcd(c, d) !== 1 || fd === 1 || (a === c && b === d));
      expr = `{${a}x|${b}} : {${c}x|${d}}`;
      text = 'חשבו וצמצמו (בתחום ההגדרה [[x != 0]]). כתבו את התוצאה כשבר מצומצם.';
      steps = [
        `חילוק בשבר הוא כפל בשבר ההופכי: [[{${a}x|${b}} * {${d}|${c}x}]]`,
        `כופלים מונה במונה ומכנה במכנה: [[{${a * d}x|${b * c}x}]]`,
        `מצמצמים את [[x]] ונשאר [[{${a * d}|${b * c}}${fn !== a * d ? ` = ${fracStr(fn, fd)}` : ''}]]`,
      ];
      data = { kind: 'mono', a, b, c, d };
    }
    return {
      tag: 'חילוק שברים אלגבריים',
      text,
      rows: [{ parts: [`${expr} =`, { frac: [fn, fd], reduced: true }] }],
      hint: 'הופכים את השבר השני (המחלק) ומחליפים את החילוק בכפל. אחר כך מצמצמים.',
      steps,
      data,
    };
  },
  verify(q) {
    const t = q.data;
    const box = q.rows[0].parts[1];
    const [fn, fd] = box.frac;
    if (gcd(fn, fd) !== 1 || fd <= 1 || !box.reduced) return 'answer is not a reduced fraction box';
    let n = 0;
    for (let x = -12; x <= 12; x++) {
      // first = n1/d1, second = n2/d2 (whole numbers at a whole x)
      const [n1, d1, n2, d2] = t.kind === 'bin' ? [x + t.s, t.k, x + t.s, t.m] : [t.a * x, t.b, t.c * x, t.d];
      if (n2 === 0) continue;                       // outside the domain
      if (n1 * d2 * fd !== fn * d1 * n2) return `value differs at ${x}`;
      n++;
    }
    return n >= 20 ? true : 'too few test points';
  },
};

export default {
  id: 'alg-fractions',
  name: 'שברים אלגבריים',
  grade: 'ט׳',
  about: 'מצמצמים, כופלים ומחלקים שברים שיש בהם x',
  place: 'הנושא "משוואות מתקדמות" ← פרק חדש בתחילת הנושא, אחרי הפרק החדש "פירוק לגורמים" ולפני "1 — לינארית עם מכנה"',
  lesson: [
    { t: 'מהו שבר אלגברי?', items: [
      'שבר אלגברי הוא שבר שיש בו משתנה, למשל [[{6x^2|9x}]] או [[{x^2 - 9|x + 3}]].',
      'אסור לחלק ב-[[0]], ולכן המכנה לא יכול להיות [[0]]. הערכים של [[x]] שמותר להציב נקראים תחום ההגדרה.',
      { list: ['בשבר [[{5|x}]] תחום ההגדרה הוא [[x != 0]].', 'בשבר [[{x^2 - 9|x + 3}]] תחום ההגדרה הוא [[x != -3]].'] },
    ] },
    { t: 'צמצום', items: [
      'מצמצמים שבר אלגברי כמו שבר רגיל: מחלקים את המונה ואת המכנה באותו גורם.',
      { ex: 'צמצמו: [[{6x^2|9x}]]', sol: ['מצמצמים את המספרים ב-[[3]]: [[6 : 3 = 2]] וגם [[9 : 3 = 3]]', 'מצמצמים את [[x]]: [[x^2 : x = x]]', 'התשובה: [[{2x|3}]]'] },
      'כשיש חיבור או חיסור, קודם מפרקים לגורמים ורק אז מצמצמים.',
      { ex: 'צמצמו: [[{x^2 - 9|x + 3}]]', sol: ['מפרקים את המונה: [[x^2 - 9 = (x - 3)(x + 3)]]', 'מצמצמים את הגורם [[(x + 3)]]', 'התשובה: [[x - 3]]'] },
      { note: 'מצמצמים רק גורמים של כפל, ולא איברים של חיבור. ב-[[{x + 3|3}]] אי אפשר לצמצם את ה-[[3]].' },
    ] },
    { t: 'כפל וחילוק', items: [
      'כפל: מונה כפול מונה, מכנה כפול מכנה, ואז מצמצמים.',
      { f: '{3x|4} * {8|9x} = {24x|36x} = {2|3}' },
      'חילוק: הופכים את השבר השני וכופלים.',
      { f: '{x + 2|3} : {x + 2|6} = {x + 2|3} * {6|x + 2} = 2' },
    ] },
  ],
  gens: [monoReduce, factorReduce, numberReduce, multiply, divide],
};
