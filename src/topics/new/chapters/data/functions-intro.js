/* מבוא לפונקציות (כיתה ח׳) — board #84 */
import { num, signed, term } from '../../core.js';

const par = (x) => (x < 0 ? `(${x})` : `${x}`);
const lin = (a, b) => `${term(a, 'x')} ${signed(b)}`;

/* f(x) from a rule */
const evaluate = {
  id: 'evaluate',
  make(R) {
    const quad = R.bool(0.3);
    const a = quad ? 1 : R.nz(-5, 6, [1, -1]), b = R.nz(-9, 9);
    const rule = quad ? `x^2 ${signed(b)}` : lin(a, b);
    const f = (x) => (quad ? x * x : a * x) + b;
    const xs = [R.int(2, 6), -R.int(1, 5)];
    const sub = (x) => (quad ? `${par(x)}^2 ${signed(b)}` : `${a} * ${par(x)} ${signed(b)}`);
    const mid = (x) => (quad ? `${x * x} ${signed(b)}` : `${a * x} ${signed(b)}`);
    return {
      tag: 'חישוב ערך של פונקציה',
      text: `נתונה הפונקציה [[f(x) = ${rule}]]. חשבו את ערך הפונקציה.`,
      rows: xs.map((x) => ({ parts: [`f(${x}) =`, { ans: f(x) }] })),
      hint: 'מציבים את המספר במקום [[x]] בכלל של הפונקציה. מספר שלילי מציבים בתוך סוגריים.',
      steps: xs.map((x) => `[[f(${x}) = ${sub(x)} = ${mid(x)} = ${f(x)}]]`),
      data: { quad, a, b, xs },
    };
  },
  verify(q) {
    const { quad, a, b, xs } = q.data;
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i], n = Math.abs(x);
      let v = b;
      if (quad) for (let k = 1; k <= n; k++) v += 2 * k - 1;          // x² = 1 + 3 + 5 + …
      else for (let k = 0; k < n; k++) v += x < 0 ? -a : a;            // a·x by repeated addition
      if (q.rows[i].parts[1].ans !== v) return `f(${x}) should be ${v}`;
      if (q.rows[i].parts[0] !== `f(${x}) =`) return 'row label differs';
    }
    return true;
  },
};

/* a table of values: fill the gaps, and go back from y to x */
const completeTable = {
  id: 'complete-table',
  make(R) {
    const a = R.pick([-3, -2, 2, 3, 4, 5]), b = R.nz(-6, 9);
    const x0 = R.int(-2, 1), xs = [0, 1, 2, 3, 4].map((d) => x0 + d);
    const f = (x) => a * x + b;
    let h1, h2;
    do { h1 = R.int(0, 4); h2 = R.int(0, 4); } while (h1 >= h2);
    const X = xs[4] + R.int(2, 6), Y = f(X);
    return {
      tag: 'טבלת ערכים',
      text: `הפונקציה נתונה בכלל [[y = ${lin(a, b)}]]. השלימו את שני הערכים החסרים בטבלה, ומצאו עבור איזה [[x]] מתקבל [[y = ${Y}]].`,
      fig: { type: 'table', head: ['[[x]]', '[[y]]'], rows: xs.map((x, i) => [`[[${x}]]`, i === h1 || i === h2 ? '?' : `[[${f(x)}]]`]) },
      rows: [
        { label: `הערך של [[y]] כאשר [[x = ${xs[h1]}]]:`, parts: [{ ans: f(xs[h1]) }] },
        { label: `הערך של [[y]] כאשר [[x = ${xs[h2]}]]:`, parts: [{ ans: f(xs[h2]) }] },
        { label: `הערך של [[x]] שעבורו [[y = ${Y}]]:`, parts: [{ ans: X }] },
      ],
      hint: 'כדי למצוא [[y]] מציבים את [[x]] בכלל. כדי למצוא [[x]] כותבים משוואה ופותרים אותה.',
      steps: [
        `[[y = ${a} * ${par(xs[h1])} ${signed(b)} = ${f(xs[h1])}]]`,
        `[[y = ${a} * ${par(xs[h2])} ${signed(b)} = ${f(xs[h2])}]]`,
        `פותרים את המשוואה [[${lin(a, b)} = ${Y}]]: [[${term(a, 'x')} = ${Y - b}]], ולכן [[x = ${X}]]`,
      ],
      data: { a, b, xs, hidden: [h1, h2], Y },
    };
  },
  verify(q) {
    const { a, b, xs, hidden, Y } = q.data;
    const shown = q.fig.rows.map((r) => (r[1] === '?' ? null : Number(r[1].slice(2, -2))));
    const base = shown.findIndex((v) => v !== null);
    if (shown.filter((v) => v === null).length !== 2) return 'two values must be hidden';
    // walk along the table from a visible row: every step of 1 in x changes y by a
    const walk = (i) => shown[base] + a * (i - base);
    for (let i = 0; i < xs.length; i++) if (shown[i] !== null && (shown[i] !== walk(i) || shown[i] !== a * xs[i] + b)) return 'a shown value is wrong';
    if (q.rows[0].parts[0].ans !== walk(hidden[0]) || q.rows[1].parts[0].ans !== walk(hidden[1])) return 'a missing y is wrong';
    const X = q.rows[2].parts[0].ans;
    return a * X + b === Y && !xs.includes(X) ? true : 'x does not give the wanted y';
  },
};

/* the rule y = ax + b from a table */
const ruleFromTable = {
  id: 'rule-from-table',
  make(R) {
    const a = R.int(2, 6), b = R.int(1, 9), x0 = R.pick([0, 0, 1]);
    const xs = [0, 1, 2, 3, 4].map((d) => x0 + d), ys = xs.map((x) => a * x + b);
    return {
      tag: 'כלל של פונקציה מטבלה',
      text: 'בטבלה ערכים של פונקציה שקצב השינוי שלה אחיד. מצאו את הכלל של הפונקציה.',
      fig: { type: 'table', head: ['[[x]]', '[[y]]'], rows: xs.map((x, i) => [`[[${x}]]`, `[[${ys[i]}]]`]) },
      rows: [{ parts: ['y =', { ans: a }, 'x +', { ans: b }] }],
      hint: x0 === 0
        ? 'בדקו בכמה גדל [[y]] בכל פעם ש-[[x]] גדל ב-[[1]]: זה המספר שכופל את [[x]]. המספר החופשי הוא הערך של [[y]] כאשר [[x = 0]].'
        : 'בדקו בכמה גדל [[y]] בכל פעם ש-[[x]] גדל ב-[[1]]: זה המספר שכופל את [[x]]. כדי למצוא את המספר החופשי, הציבו שורה אחת מהטבלה.',
      steps: [
        `בכל פעם ש-[[x]] גדל ב-[[1]], [[y]] גדל ב-[[${ys[1]} - ${ys[0]} = ${a}]]. לכן הכלל מתחיל ב-[[y = ${a}x]].`,
        x0 === 0
          ? `כאשר [[x = 0]] מתקבל [[y = ${b}]], וזה המספר החופשי.`
          : `מציבים [[x = ${xs[0]}]]: [[${a} * ${xs[0]} = ${a * xs[0]}]], אבל בטבלה [[y = ${ys[0]}]]. חסר [[${ys[0]} - ${a * xs[0]} = ${b}]].`,
        `הכלל: [[y = ${a}x + ${b}]]`,
      ],
      data: { xs, ys },
    };
  },
  verify(q) {
    const { xs, ys } = q.data, a = q.rows[0].parts[1].ans, b = q.rows[0].parts[3].ans;
    if (q.fig.rows.some((r, i) => r[0] !== `[[${xs[i]}]]` || r[1] !== `[[${ys[i]}]]`)) return 'the table does not match';
    for (let i = 0; i < xs.length; i++) if (a * xs[i] + b !== ys[i]) return `the rule fails at x = ${xs[i]}`;
    return a > 1 && b > 0 ? true : 'degenerate rule';
  },
};

/* is the rate of change uniform? */
const rateKind = {
  id: 'rate-uniform',
  make(R) {
    const uniform = R.bool(), x0 = R.pick([0, 1]), xs = [0, 1, 2, 3, 4].map((d) => x0 + d);
    const opt = (d) => `קצב השינוי אחיד: [[y]] גדל ב-[[${d}]] בכל פעם ש-[[x]] גדל ב-[[1]]`;
    const NOT = 'קצב השינוי אינו אחיד';
    let ys, options, good, steps;
    if (uniform) {
      const a = R.int(2, 7);
      let y0;
      do { y0 = R.int(1, 9); } while (y0 === a || y0 === a + 1);
      ys = xs.map((_, i) => y0 + a * i);
      good = opt(a);
      options = [good, opt(R.bool() ? y0 : a + 1), NOT];
      steps = [`ההפרשים בין ערכי [[y]] סמוכים: [[${ys.slice(1).map((y, i) => `${y} - ${ys[i]} = ${a}`).join(',  ')}]]`, `כל ההפרשים שווים ל-[[${a}]], ולכן קצב השינוי אחיד.`];
    } else {
      let d;
      do { d = R.bool() ? [1, 2, 3, 4].map((k) => k + R.int(0, 2)) : Array.from({ length: 4 }, () => R.int(1, 6)); } while (d[0] === d[3] || new Set(d).size < 2 || (d[0] === d[1] && d[1] === d[2]));
      const y0 = R.int(0, 6);
      ys = [y0]; d.forEach((v) => ys.push(ys[ys.length - 1] + v));
      good = NOT;
      options = [opt(d[0]), opt(d[3]), NOT];
      steps = [`ההפרשים בין ערכי [[y]] סמוכים: [[${d.join(', ')}]]`, 'ההפרשים אינם שווים, ולכן קצב השינוי אינו אחיד.'];
    }
    options = R.shuffle(options);
    return {
      tag: 'קצב שינוי אחיד או לא אחיד',
      text: 'בטבלה ערכים של פונקציה. מה אפשר לומר על קצב השינוי שלה?',
      fig: { type: 'table', head: ['[[x]]', '[[y]]'], rows: xs.map((x, i) => [`[[${x}]]`, `[[${ys[i]}]]`]) },
      choices: { options, correct: options.indexOf(good) },
      hint: 'חשבו את ההפרש בין כל שני ערכי [[y]] סמוכים. אם כל ההפרשים שווים, קצב השינוי אחיד.',
      steps,
      data: { ys },
    };
  },
  verify(q) {
    const ys = q.fig.rows.map((r) => Number(r[1].slice(2, -2)));
    if (ys.join() !== q.data.ys.join()) return 'the table does not match';
    const d = ys.slice(1).map((y, i) => y - ys[i]);
    const uniform = d.every((v) => v === d[0]);
    const right = q.choices.options[q.choices.correct];
    const fits = (o) => (uniform ? o.includes('קצב השינוי אחיד') && o.includes(`ב-[[${d[0]}]] בכל פעם`) : o.includes('אינו אחיד'));
    if (!fits(right)) return 'the marked option is wrong';
    return q.choices.options.filter(fits).length === 1 ? true : 'more than one option fits';
  },
};

/* the size of a uniform rate of change, from a story table */
const STORIES = [
  { intro: 'ממלאים בריכה במים בקצב קבוע. בטבלה כמות המים בבריכה בזמנים שונים.', xh: 'זמן (דקות)', yh: 'כמות המים (ליטרים)', ask: 'כמה ליטרים נוספים לבריכה בכל דקה?', dir: 1, hs: [2, 5, 10], rs: [20, 30, 40, 50, 60], y0: [0, 100, 200], xw: 'הזמן', yw: 'כמות המים', fem: true, unit: 'ליטרים לדקה' },
  { intro: 'נר דולק ומתקצר בקצב קבוע. בטבלה גובה הנר בזמנים שונים.', xh: 'זמן (דקות)', yh: 'גובה הנר (ס״מ)', ask: 'בכמה ס״מ מתקצר הנר בכל דקה?', dir: -1, hs: [2, 4, 10], rs: [0.5, 1, 1.5], y0: [24, 30, 36, 50], xw: 'הזמן', yw: 'גובה הנר', unit: 'ס״מ לדקה' },
  { intro: 'מחיר נסיעה במונית עולה בקצב קבוע לפי המרחק. בטבלה המחיר למרחקים שונים.', xh: 'מרחק (ק״מ)', yh: 'מחיר (₪)', ask: 'בכמה שקלים עולה המחיר בכל ק״מ?', dir: 1, hs: [2, 5], rs: [3, 4, 5, 6], y0: [12, 15, 20], xw: 'המרחק', yw: 'המחיר', unit: '₪ לק״מ' },
  { intro: 'מכונית נוסעת במהירות קבועה. בטבלה המרחק שעברה בזמנים שונים.', xh: 'זמן (שעות)', yh: 'מרחק (ק״מ)', ask: 'כמה ק״מ עוברת המכונית בכל שעה?', dir: 1, hs: [2, 3], rs: [60, 70, 80, 90], y0: null, xw: 'הזמן', yw: 'המרחק', unit: 'ק״מ לשעה' },
  { intro: 'מרוקנים מכל מים בקצב קבוע. בטבלה כמות המים במכל בזמנים שונים.', xh: 'זמן (דקות)', yh: 'כמות המים (ליטרים)', ask: 'כמה ליטרים יוצאים מהמכל בכל דקה?', dir: -1, hs: [2, 5, 10], rs: [4, 5, 8, 10], y0: [400, 500, 600], xw: 'הזמן', yw: 'כמות המים', fem: true, unit: 'ליטרים לדקה' },
];
const rateSize = {
  id: 'rate-size',
  make(R) {
    let s, h, r, x0, y0, ys, xs;
    do {
      s = R.pick(STORIES); h = R.pick(s.hs); r = R.pick(s.rs); x0 = R.pick([0, h]);
      y0 = s.y0 ? R.pick(s.y0) : r * x0;
      xs = [0, 1, 2, 3].map((i) => x0 + i * h);
      ys = xs.map((_, i) => y0 + s.dir * r * h * i);
    } while (ys[3] <= 0 || (ys[0] === 0 && xs[0] !== 0));
    const dy = r * h;
    return {
      tag: 'גודל קצב השינוי',
      text: `${s.intro} ${s.ask}`,
      fig: { type: 'table', head: [s.xh, s.yh], rows: xs.map((x, i) => [`[[${x}]]`, `[[${num(ys[i])}]]`]) },
      rows: [{ label: `קצב השינוי (${s.unit}):`, parts: [{ ans: r }] }],
      hint: `בטבלה ${s.xw} לא גדל ב-[[1]] אלא ב-[[${h}]]. בדקו בכמה משתנה ${s.yw} בין שתי שורות סמוכות, וחלקו ב-[[${h}]].`,
      steps: [
        `בין שתי שורות סמוכות בטבלה ${s.xw} גדל ב-[[${h}]], ו${s.yw} ${s.dir > 0 ? (s.fem ? 'גדלה' : 'גדל') : (s.fem ? 'קטנה' : 'קטן')} ב-[[${num(dy)}]].`,
        `קצב השינוי: [[${num(dy)} : ${h} = ${num(r)}]] ${s.unit}`,
      ],
      data: { xs, ys },
    };
  },
  verify(q) {
    const { xs, ys } = q.data, r = q.rows[0].parts[0].ans;
    if (q.fig.rows.some((row, i) => row[0] !== `[[${xs[i]}]]` || row[1] !== `[[${num(ys[i])}]]`)) return 'the table does not match';
    const sign = ys[1] > ys[0] ? 1 : -1;
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) if (Math.abs((ys[j] - ys[i]) - sign * r * (xs[j] - xs[i])) > 1e-9) return 'the rate is not the same between all rows';
    return r > 0 && xs[1] - xs[0] > 1 ? true : 'degenerate';
  },
};

/* where does the graph rise and fall? */
const graph = {
  id: 'graph-rise-fall',
  make(R) {
    const up = R.bool(), flat = R.bool(0.4);
    let a, f, c;
    do { a = R.int(2, 4); f = flat ? R.int(1, 3) : 0; c = R.int(2, 4); } while (a + f + c > 10);
    let y0, y1, y2;
    if (up) { y0 = R.int(0, 3); y1 = R.int(y0 + 2, 8); y2 = R.int(0, y1 - 2); } else { y0 = R.int(4, 8); y1 = R.int(0, y0 - 2); y2 = R.int(y1 + 2, 8); }
    const pts = [[0, y0], [a, y1], ...(flat ? [[a + f, y1]] : []), [a + f + c, y2]];
    const first = [0, a], last = [a + f, a + f + c];
    const rise = up ? first : last, fall = up ? last : first;
    return {
      tag: 'עלייה וירידה של פונקציה',
      text: `לפניכם גרף של פונקציה. מצאו את תחום העלייה ואת תחום הירידה שלה${flat ? ' (יש גם קטע שבו הפונקציה קבועה)' : ''}.`,
      fig: { type: 'grid', x: [0, 10], y: [0, 8], curves: [{ pts, color: 'blue' }], points: pts.map(([x, y]) => ({ x, y, color: 'blue' })), alt: 'גרף של פונקציה במערכת צירים' },
      rows: [
        { label: 'הפונקציה עולה כאשר:', parts: [{ ans: rise[0] }, '< x <', { ans: rise[1] }] },
        { label: 'הפונקציה יורדת כאשר:', parts: [{ ans: fall[0] }, '< x <', { ans: fall[1] }] },
        { label: up ? 'הערך הגדול ביותר של הפונקציה:' : 'הערך הקטן ביותר של הפונקציה:', parts: [{ ans: y1 }] },
      ],
      hint: 'קוראים את הגרף משמאל לימין. כשהקו עולה, הפונקציה עולה. כשהקו יורד, הפונקציה יורדת. את התחום קוראים על ציר ה-[[x]].',
      steps: [
        `משמאל לימין: הקו ${up ? 'עולה' : 'יורד'} מ-[[x = 0]] עד [[x = ${a}]]${flat ? `, נשאר באותו גובה עד [[x = ${a + f}]],` : ''} ו${up ? 'יורד' : 'עולה'} מ-[[x = ${a + f}]] עד [[x = ${a + f + c}]].`,
        `תחום העלייה: [[${rise[0]} < x < ${rise[1]}]]. תחום הירידה: [[${fall[0]} < x < ${fall[1]}]].`,
        `הנקודה ${up ? 'הגבוהה' : 'הנמוכה'} ביותר בגרף היא בגובה [[y = ${y1}]].`,
      ],
      data: { pts },
    };
  },
  verify(q) {
    const { pts } = q.data;
    if (JSON.stringify(q.fig.curves[0].pts) !== JSON.stringify(pts)) return 'the drawing does not match';
    const rise = [], fall = [];
    for (let i = 1; i < pts.length; i++) {
      const dy = pts[i][1] - pts[i - 1][1], seg = [pts[i - 1][0], pts[i][0]];
      if (seg[1] <= seg[0]) return 'x must grow';
      if (dy > 0) rise.push(seg); else if (dy < 0) fall.push(seg);
    }
    if (rise.length !== 1 || fall.length !== 1) return 'needs exactly one rising and one falling part';
    const b = q.rows.map((r) => r.parts.filter((p) => typeof p === 'object').map((p) => p.ans));
    if (b[0][0] !== rise[0][0] || b[0][1] !== rise[0][1]) return 'rising interval is wrong';
    if (b[1][0] !== fall[0][0] || b[1][1] !== fall[0][1]) return 'falling interval is wrong';
    const ysAll = pts.map((p) => p[1]);
    const ext = rise[0][0] < fall[0][0] ? Math.max(...ysAll) : Math.min(...ysAll);
    if (ysAll.some((y) => y < 0 || y > 8) || pts[pts.length - 1][0] > 10) return 'the graph leaves the grid';
    return b[2][0] === ext && ysAll.filter((y) => y === ext).length <= 2 ? true : 'extreme value is wrong';
  },
};

/* interpolation and extrapolation in a uniform table */
const interpolate = {
  id: 'interpolate',
  make(R) {
    const h = R.pick([2, 4, 5, 10]);
    const r = h > 4 ? R.int(2, 6) : R.pick([2, 3, 4, 5, -2, -3]);
    const x0 = R.pick([0, h]), y0 = r > 0 ? R.int(1, 12) : R.int(70, 90);
    const xs = [0, 1, 2, 3].map((i) => x0 + i * h), f = (x) => y0 + r * (x - x0);
    const i = R.int(0, 2), xin = xs[i] + R.int(1, h - 1), xout = xs[3] + R.int(1, h);
    const how = (base, x) => `[[y = ${f(base)} ${r < 0 ? '-' : '+'} ${x - base} * ${Math.abs(r)} = ${f(x)}]]`;
    const verb = r > 0 ? 'גדל' : 'קטן';
    return {
      tag: 'ערכים בין שורות הטבלה ומעבר לה',
      text: 'בטבלה ערכים של פונקציה שקצב השינוי שלה אחיד. מצאו את שני הערכים שאינם מופיעים בטבלה.',
      fig: { type: 'table', head: ['[[x]]', '[[y]]'], rows: xs.map((x) => [`[[${x}]]`, `[[${f(x)}]]`]) },
      rows: [
        { label: `הערך של [[y]] כאשר [[x = ${xin}]]:`, parts: [{ ans: f(xin) }] },
        { label: `הערך של [[y]] כאשר [[x = ${xout}]]:`, parts: [{ ans: f(xout) }] },
      ],
      hint: `קצב השינוי אחיד. מצאו קודם בכמה משתנה [[y]] כאשר [[x]] גדל ב-[[1]] (בטבלה [[x]] גדל כל פעם ב-[[${h}]]).`,
      steps: [
        `בטבלה: כאשר [[x]] גדל ב-[[${h}]], [[y]] ${verb} ב-[[${Math.abs(r) * h}]]. לכן כאשר [[x]] גדל ב-[[1]], [[y]] ${verb} ב-[[${Math.abs(r) * h} : ${h} = ${Math.abs(r)}]].`,
        `[[x = ${xin}]] נמצא [[${xin - xs[i]}]] אחרי [[x = ${xs[i]}]]: ${how(xs[i], xin)}`,
        `[[x = ${xout}]] נמצא [[${xout - xs[3]}]] אחרי [[x = ${xs[3]}]]: ${how(xs[3], xout)}`,
      ],
      data: { xin, xout },
    };
  },
  verify(q) {
    const { xin, xout } = q.data;
    const T = q.fig.rows.map((r) => [Number(r[0].slice(2, -2)), Number(r[1].slice(2, -2))]);
    const [xa, ya] = T[0], [xb, yb] = T[T.length - 1];
    // a point is on the same line as the table when the cross product is zero
    const on = (x, y) => (x - xa) * (yb - ya) === (y - ya) * (xb - xa);
    if (!T.every(([x, y]) => on(x, y))) return 'the table is not uniform';
    if (T.some(([x]) => x === xin || x === xout) || xin <= xa || xin >= xb || xout <= xb) return 'the asked x values are badly placed';
    const [yin, yout] = q.rows.map((r) => r.parts[0].ans);
    if (!q.rows[0].label.includes(`x = ${xin}]]`) || !q.rows[1].label.includes(`x = ${xout}]]`)) return 'labels differ';
    return on(xin, yin) && on(xout, yout) && yout >= 0 ? true : 'a value is not on the line';
  },
};

export default {
  id: 'functions-intro',
  name: 'מבוא לפונקציות',
  grade: 'ח׳',
  about: 'פונקציה מתאימה לכל x ערך אחד של y: מכירים אותה ככלל, כטבלה וכגרף, ובודקים איך היא משתנה',
  place: 'הנושא "פונקציה לינארית" ← פרק חדש אחרי "2. סימון נקודות" ולפני "3. קו ישר ושיפוע"',
  lesson: [
    { t: 'מהי פונקציה?', items: [
      'פונקציה היא התאמה: לכל ערך של [[x]] היא מתאימה ערך אחד בלבד של [[y]].',
      'אפשר להציג אותה פונקציה בשלוש דרכים: בכלל (ייצוג אלגברי), בטבלת ערכים ובגרף.',
      { f: 'f(x) = 2x + 1' },
      { fig: { type: 'table', head: ['[[x]]', '[[y]]'], rows: [['[[0]]', '[[1]]'], ['[[1]]', '[[3]]'], ['[[2]]', '[[5]]'], ['[[3]]', '[[7]]']] } },
      { ex: 'נתונה הפונקציה [[f(x) = 2x + 1]]. חשבו את [[f(4)]] ואת [[f(-3)]].', sol: ['מציבים [[4]] במקום [[x]]: [[f(4) = 2 * 4 + 1 = 9]]', 'מספר שלילי מציבים בסוגריים: [[f(-3) = 2 * (-3) + 1 = -5]]'] },
    ] },
    { t: 'קצב שינוי', items: [
      'קצב השינוי אומר בכמה משתנה [[y]] כאשר [[x]] גדל ב-[[1]].',
      { list: ['אם ההפרשים בין ערכי [[y]] סמוכים שווים (כש-[[x]] גדל בצעדים שווים), קצב השינוי אחיד. בטבלה שלמעלה: [[2, 2, 2]].', 'אם ההפרשים שונים, למשל [[1, 3, 5]], קצב השינוי אינו אחיד.'] },
      'כשקצב השינוי אחיד, הכלל הוא מהצורה [[y = ax + b]]: המספר [[a]] הוא קצב השינוי, ו-[[b]] הוא הערך של [[y]] כאשר [[x = 0]].',
      { ex: 'בטבלה: כאשר [[x = 0, 2, 4, 6]] מתקבל [[y = 5, 11, 17, 23]]. מהו [[y]] כאשר [[x = 3]]? וכאשר [[x = 8]]?', sol: ['כאשר [[x]] גדל ב-[[2]], [[y]] גדל ב-[[6]]. לכן כאשר [[x]] גדל ב-[[1]], [[y]] גדל ב-[[3]].', '[[x = 3]] נמצא [[1]] אחרי [[x = 2]]: [[y = 11 + 3 = 14]]', '[[x = 8]] נמצא [[2]] אחרי [[x = 6]]: [[y = 23 + 2 * 3 = 29]]'] },
      { note: 'טעות נפוצה: לשכוח לבדוק בכמה גדל [[x]] בין שורות הטבלה. אם [[x]] גדל ב-[[2]] ו-[[y]] גדל ב-[[6]], קצב השינוי הוא [[3]] ולא [[6]].' },
    ] },
    { t: 'עלייה וירידה', items: [
      'קוראים גרף משמאל לימין. כשהגרף עולה, הפונקציה עולה: [[y]] גדל כש-[[x]] גדל. כשהגרף יורד, הפונקציה יורדת.',
      { fig: { type: 'grid', x: [0, 8], y: [0, 6], curves: [{ pts: [[0, 1], [3, 5], [7, 2]], color: 'blue' }], points: [{ x: 0, y: 1, color: 'blue' }, { x: 3, y: 5, color: 'blue' }, { x: 7, y: 2, color: 'blue' }] } },
      'בגרף הזה הפונקציה עולה כאשר [[0 < x < 3]] ויורדת כאשר [[3 < x < 7]]. הערך הגדול ביותר שלה הוא [[5]].',
      { note: 'את תחום העלייה והירידה כותבים לפי ציר ה-[[x]], ולא לפי הגובה של הגרף.' },
    ] },
  ],
  gens: [evaluate, completeTable, ruleFromTable, rateKind, rateSize, graph, interpolate],
};
