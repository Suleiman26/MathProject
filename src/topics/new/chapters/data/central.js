/* ממוצע, חציון, שכיח וטווח (כיתה ח׳) — board #84 */
import { num, round } from '../../core.js';
import { split } from './util.js';

const W = { 3: 'שלושה', 4: 'ארבעה', 5: 'חמישה', 6: 'שישה' };
const sumOf = (xs) => xs.reduce((s, v) => s + v, 0);
const oneDecimal = (v) => Math.abs(v - round(v, 1)) < 1e-9;
/* independent check of a mean: the deviations from it cancel out */
const balances = (xs, m) => Math.abs(xs.reduce((s, v) => s + (v - m), 0)) < 1e-6;

const MEAN = [
  { t: (n) => `הציונים של נועה ב${W[n]} בחנים`, lo: 12, hi: 20, k: 5 },
  { t: (n) => `מספר הדקות שרץ יואב ב${W[n]} אימונים`, lo: 10, hi: 45, k: 1 },
  { t: (n) => `מספר הסלים שקלעה מאיה ב${W[n]} משחקים`, lo: 2, hi: 20, k: 1 },
  { t: (n) => `הטמפרטורה (במעלות) שנמדדה בצהריים ב${W[n]} ימים`, lo: 18, hi: 34, k: 1 },
];
const mean = {
  id: 'mean',
  make(R) {
    const ctx = R.pick(MEAN), n = R.pick([4, 5, 5, 6]);
    let xs, m;
    do { xs = Array.from({ length: n }, () => ctx.k * R.int(ctx.lo, ctx.hi)); m = sumOf(xs) / n; } while (!oneDecimal(m) || new Set(xs).size < n - 1);
    m = round(m, 1);
    return {
      tag: 'ממוצע',
      text: `${ctx.t(n)}: [[${xs.join(', ')}]]. חשבו את הממוצע.`,
      rows: [{ label: 'הממוצע:', parts: [{ ans: m }] }],
      hint: `מחברים את כל הנתונים ומחלקים במספר הנתונים (כאן [[${n}]]).`,
      steps: [
        `סכום הנתונים: [[${xs.join(' + ')} = ${sumOf(xs)}]]`,
        `מספר הנתונים: [[${n}]]`,
        `הממוצע: [[${sumOf(xs)} : ${n} = ${num(m)}]]`,
      ],
      data: { xs },
    };
  },
  verify(q) {
    const { xs } = q.data, m = q.rows[0].parts[0].ans;
    if (!q.text.includes(`[[${xs.join(', ')}]]`)) return 'the list is not shown';
    return balances(xs, m) ? true : 'mean is wrong';
  },
};

const median = {
  id: 'median',
  make(R) {
    const n = R.int(5, 8), lo = R.pick([1, 3, 10, 20]);
    let xs, sorted;
    do {
      xs = Array.from({ length: n }, () => R.int(lo, lo + 14));
      sorted = [...xs].sort((a, b) => a - b);
    } while (xs.join() === sorted.join() || new Set(xs).size < n - 1);
    const even = n % 2 === 0, a = sorted[Math.floor((n - 1) / 2)], b = sorted[Math.floor(n / 2)];
    const med = (a + b) / 2;
    return {
      tag: even ? 'חציון (מספר זוגי של נתונים)' : 'חציון',
      text: `מצאו את החציון של הנתונים: [[${xs.join(', ')}]]`,
      rows: [{ label: 'החציון:', parts: [{ ans: med }] }],
      hint: even
        ? 'קודם מסדרים את הנתונים מהקטן לגדול. כשמספר הנתונים זוגי, החציון הוא הממוצע של שני הנתונים האמצעיים.'
        : 'קודם מסדרים את הנתונים מהקטן לגדול. החציון הוא הנתון שנמצא בדיוק באמצע.',
      steps: even ? [
        `מסדרים מהקטן לגדול: [[${sorted.join(', ')}]]`,
        `יש [[${n}]] נתונים (מספר זוגי), ולכן יש שני נתונים אמצעיים: [[${a}]] ו-[[${b}]].`,
        `החציון הוא הממוצע שלהם: [[(${a} + ${b}) : 2 = ${num(med)}]]`,
      ] : [
        `מסדרים מהקטן לגדול: [[${sorted.join(', ')}]]`,
        `יש [[${n}]] נתונים (מספר אי-זוגי), ולכן הנתון האמצעי הוא במקום ה-[[${(n + 1) / 2}]].`,
        `החציון: [[${med}]]`,
      ],
      data: { xs },
    };
  },
  verify(q) {
    // peel off the smallest and the largest value until one or two are left
    const rest = [...q.data.xs];
    while (rest.length > 2) {
      rest.splice(rest.indexOf(Math.min(...rest)), 1);
      rest.splice(rest.indexOf(Math.max(...rest)), 1);
    }
    const med = rest.length === 2 ? (rest[0] + rest[1]) / 2 : rest[0];
    return q.rows[0].parts[0].ans === med ? true : `median should be ${med}`;
  },
};

const modeRange = {
  id: 'mode-range',
  make(R) {
    const lo = R.pick([0, 2, 5, 10, 30]);
    let pool;
    do { pool = R.shuffle(Array.from({ length: 13 }, (_, i) => lo + i)).slice(0, R.pick([4, 5])); } while (Math.max(...pool) - Math.min(...pool) < 5);
    const counts = pool.map((_, i) => (i === 0 ? R.pick([3, 3, 4]) : i === 1 ? R.pick([1, 2]) : 1));
    let xs;
    do { xs = R.shuffle(pool.flatMap((v, i) => Array(counts[i]).fill(v))); } while (xs.some((v, i) => i > 1 && v === xs[i - 1] && v === xs[i - 2]));
    const mx = Math.max(...xs), mn = Math.min(...xs);
    return {
      tag: 'שכיח וטווח',
      text: `מצאו את השכיח ואת הטווח של הנתונים: [[${xs.join(', ')}]]`,
      rows: [
        { label: 'השכיח:', parts: [{ ans: pool[0] }] },
        { label: 'הטווח:', parts: [{ ans: mx - mn }] },
      ],
      hint: 'השכיח הוא הנתון שמופיע הכי הרבה פעמים. הטווח הוא ההפרש בין הנתון הגדול ביותר לקטן ביותר.',
      steps: [
        `הנתון [[${pool[0]}]] מופיע [[${counts[0]}]] פעמים, יותר מכל נתון אחר. לכן השכיח הוא [[${pool[0]}]].`,
        `הנתון הגדול ביותר הוא [[${mx}]] והקטן ביותר הוא [[${mn}]].`,
        `הטווח: [[${mx} - ${mn} = ${mx - mn}]]`,
      ],
      data: { xs },
    };
  },
  verify(q) {
    const { xs } = q.data;
    const seen = new Map();
    for (const v of xs) seen.set(v, (seen.get(v) || 0) + 1);
    const top = Math.max(...seen.values());
    const modes = [...seen.keys()].filter((v) => seen.get(v) === top);
    if (modes.length !== 1) return 'the mode is not unique';
    if (q.rows[0].parts[0].ans !== modes[0]) return 'mode is wrong';
    let hi = -Infinity, lo = Infinity;
    for (const v of xs) { if (v > hi) hi = v; if (v < lo) lo = v; }
    return q.rows[1].parts[0].ans === hi - lo && hi - lo > 0 ? true : 'range is wrong';
  },
};

const TABLES = [
  { t: 'בטבלה ציוני התלמידים בבוחן', vh: 'ציון', fh: 'מספר התלמידים', who: 'כמה תלמידים נבחנו?', what: 'הציון הממוצע:', lo: [5, 6, 7] },
  { t: 'בטבלה מספר השערים שהבקיעה קבוצת כדורגל במשחקי העונה', vh: 'שערים במשחק', fh: 'מספר המשחקים', who: 'כמה משחקים שיחקה הקבוצה?', what: 'ממוצע השערים למשחק:', lo: [0] },
  { t: 'בטבלה מספר הספרים שקראו תלמידי הכיתה בחופשה', vh: 'מספר הספרים', fh: 'מספר התלמידים', who: 'כמה תלמידים יש בכיתה?', what: 'ממוצע הספרים לתלמיד:', lo: [1, 2] },
];
const meanTable = {
  id: 'mean-from-table',
  make(R) {
    const ctx = R.pick(TABLES), lo = R.pick(ctx.lo), N = R.pick([10, 20, 25]);
    const vals = [0, 1, 2, 3].map((d) => lo + d);
    let f, total;
    do { f = split(R, N, 4, 1); total = sumOf(vals.map((v, i) => v * f[i])); } while (!oneDecimal(total / N) || new Set(f).size < 3);
    const m = round(total / N, 1);
    return {
      tag: 'ממוצע מטבלת שכיחויות',
      text: `${ctx.t}. חשבו את הממוצע.`,
      fig: { type: 'table', head: [ctx.vh, ctx.fh], rows: vals.map((v, i) => [`[[${v}]]`, `[[${f[i]}]]`]) },
      rows: [
        { label: ctx.who, parts: [{ ans: N }] },
        { label: ctx.what, parts: [{ ans: m }] },
      ],
      hint: 'כל ערך מופיע כמה פעמים: כופלים כל ערך בשכיחות שלו, מחברים, ומחלקים במספר כל הנתונים (סכום השכיחויות).',
      steps: [
        `מספר הנתונים: [[${f.join(' + ')} = ${N}]]`,
        `סכום הנתונים: [[${vals.map((v, i) => `${v} * ${f[i]}`).join(' + ')} = ${total}]]`,
        `הממוצע: [[${total} : ${N} = ${num(m)}]]`,
      ],
      data: { vals, f },
    };
  },
  verify(q) {
    const { vals, f } = q.data;
    const all = vals.flatMap((v, i) => Array(f[i]).fill(v));   // the full list of data, one by one
    if (q.fig.rows.some(([v, c], i) => v !== `[[${vals[i]}]]` || c !== `[[${f[i]}]]`)) return 'the table does not match';
    if (q.rows[0].parts[0].ans !== all.length) return 'count is wrong';
    return balances(all, q.rows[1].parts[0].ans) ? true : 'mean is wrong';
  },
};

const MISS = [
  { t: (n, m) => `הממוצע של ${W[n]} ציונים הוא [[${m}]]`, known: (n) => `${W[n - 1]} מהציונים הם`, q: 'מהו הציון הנוסף?', ask: 'הציון הנוסף:', lo: 12, hi: 20, k: 5 },
  { t: (n, m) => `דן שיחק ${W[n]} משחקי כדורסל וקלע בממוצע [[${m}]] נקודות למשחק`, known: (n) => `ב${W[n - 1]} מהמשחקים קלע`, q: 'כמה נקודות קלע במשחק הנוסף?', ask: 'מספר הנקודות במשחק הנוסף:', lo: 4, hi: 24, k: 1 },
  { t: (n, m) => `הגובה הממוצע של ${W[n]} שתילים הוא [[${m}]] ס״מ`, known: (n) => `הגבהים של ${W[n - 1]} מהם, בס״מ`, q: 'מה הגובה של השתיל הנוסף?', ask: 'הגובה של השתיל הנוסף (בס״מ):', lo: 10, hi: 40, k: 1 },
];
const missingValue = {
  id: 'missing-value',
  make(R) {
    const ctx = R.pick(MISS), n = R.pick([4, 5]);
    let xs;
    do { xs = Array.from({ length: n }, () => ctx.k * R.int(ctx.lo, ctx.hi)); } while (sumOf(xs) % n !== 0 || new Set(xs).size < n);
    const m = sumOf(xs) / n, x = xs[n - 1], known = xs.slice(0, -1);
    return {
      tag: 'נתון חסר לפי הממוצע',
      text: `${ctx.t(n, m)}. ${ctx.known(n)}: [[${known.join(', ')}]]. ${ctx.q}`,
      rows: [{ label: ctx.ask, parts: [{ ans: x }] }],
      hint: `אם הממוצע של [[${n}]] נתונים הוא [[${m}]], הסכום של כולם הוא [[${n} * ${m}]].`,
      steps: [
        `סכום כל הנתונים: [[${n} * ${m} = ${n * m}]]`,
        `סכום הנתונים הידועים: [[${known.join(' + ')} = ${sumOf(known)}]]`,
        `הנתון החסר: [[${n * m} - ${sumOf(known)} = ${x}]]`,
      ],
      data: { known, m, n },
    };
  },
  verify(q) {
    const { known, m, n } = q.data, x = q.rows[0].parts[0].ans;
    if (known.length !== n - 1) return 'wrong number of known values';
    return balances([...known, x], m) && x > 0 ? true : 'missing value is wrong';
  },
};

export default {
  id: 'central',
  name: 'ממוצע, חציון, שכיח וטווח',
  grade: 'ח׳',
  about: 'מתארים קבוצת נתונים במספר אחד: ממוצע, חציון ושכיח, ובודקים כמה הנתונים מפוזרים בעזרת הטווח',
  place: 'נושא חדש בתחום "מספרים": "סטטיסטיקה והסתברות" ← פרק שני, אחרי "שכיחות ושכיחות יחסית"',
  /* lesson order (fixes board #99, Sulaiman 2026-11-25: the intro to statistical measures and the mode moved to
     chapter 1 "שכיחות ושכיחות יחסית"; this chapter only links back to them). Earlier (fixes board #95, Sulaiman 2026-11-22): what a statistical measure is → mode →
     mean → median, an example for each, then one example that finds all of them, with the
     meaning of every final answer */
  lesson: [
    { t: 'מהשכיח לממוצע ולחציון', items: [
      'בפרק הקודם הכרנו מדד סטטיסטי אחד: השכיח. בפרק הזה נלמד עוד שני מדדים, הממוצע והחציון, ובסוף גם את הטווח.',
    ] },
    { t: 'ממוצע', items: [
      'הממוצע הוא סכום כל הנתונים חלקי מספר הנתונים.',
      { ex: 'הציונים של גיל: [[70, 85, 90, 75]]. מהו הממוצע?', sol: ['סכום הנתונים: [[70 + 85 + 90 + 75 = 320]]', 'מספר הנתונים: [[4]]', 'הממוצע: [[320 : 4 = 80]]', 'כלומר, אם כל ארבעת הציונים היו שווים, כל ציון היה [[80]].'] },
      'כשהנתונים רשומים בטבלת שכיחויות, כופלים כל ערך בשכיחות שלו, מחברים, ומחלקים בסכום השכיחויות.',
    ] },
    { t: 'חציון', items: [
      'החציון הוא הנתון האמצעי, אחרי שמסדרים את הנתונים מהקטן לגדול.',
      { ex: 'מהו החציון של [[12, 5, 9, 3, 8]]?', sol: ['מסדרים מהקטן לגדול: [[3, 5, 8, 9, 12]]', 'יש [[5]] נתונים, והנתון השלישי נמצא בדיוק באמצע. החציון הוא [[8]].', 'כלומר, שני נתונים קטנים מ-[[8]] ושני נתונים גדולים ממנו.'] },
      { list: ['מספר אי-זוגי של נתונים: יש נתון אחד באמצע, והוא החציון.', 'מספר זוגי של נתונים: [[3, 5, 8, 10]]. החציון הוא הממוצע של שני האמצעיים: [[(5 + 8) : 2 = 6.5]].'] },
      { note: 'טעות נפוצה: לקחת את הנתון האמצעי בלי לסדר קודם. תמיד מסדרים את הנתונים לפני שמחפשים את החציון.' },
    ] },
    { t: 'טווח', items: [
      'הטווח הוא ההפרש בין הנתון הגדול ביותר לנתון הקטן ביותר. הוא מראה כמה הנתונים מפוזרים.',
      { ex: 'מהו הטווח של [[4, 7, 4, 9, 2, 4, 7]]?', sol: ['הגדול ביותר הוא [[9]] והקטן ביותר הוא [[2]].', 'הטווח: [[9 - 2 = 7]]', 'כלומר, המרחק בין הנתון הקטן לגדול הוא [[7]].'] },
    ] },
    { t: 'דוגמה מסכמת: כל המדדים יחד', items: [
      { ex: '[[8]] תלמידים רשמו כמה ספרים קראו בחופשה: [[2, 6, 1, 6, 3, 6, 8, 0]]. מצאו את השכיח, הממוצע, החציון והטווח.', sol: [
        'שכיח: הנתון [[6]] מופיע שלוש פעמים, יותר מכל נתון אחר. השכיח הוא [[6]].',
        'ממוצע: [[2 + 6 + 1 + 6 + 3 + 6 + 8 + 0 = 32]], ואז [[32 : 8 = 4]]. הממוצע הוא [[4]].',
        'חציון: מסדרים [[0, 1, 2, 3, 6, 6, 6, 8]]. יש [[8]] נתונים, ולכן לוקחים את שני האמצעיים: [[(3 + 6) : 2 = 4.5]]. החציון הוא [[4.5]].',
        'טווח: [[8 - 0 = 8]].',
        'מה זה אומר? הכי הרבה תלמידים קראו [[6]] ספרים (השכיח). אם נחלק את כל הספרים שווה בשווה, כל תלמיד יקבל [[4]] ספרים (הממוצע). חצי מהתלמידים קראו פחות מ-[[4.5]] ספרים, וחצי קראו יותר (החציון).',
      ] },
      { note: 'שלושת המדדים יצאו שונים: [[6]], [[4]] ו-[[4.5]]. כל אחד מהם מתאר את אותם נתונים מזווית אחרת.' },
    ] },
  ],
  gens: [mean, median, modeRange, meanTable, missingValue],
};
