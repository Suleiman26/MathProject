/* שכיחות ושכיחות יחסית (כיתות ז׳–ח׳) — board #84 */
import { num } from '../../core.js';
import { fr, frEq, split, sameFrac } from './util.js';

const CTX = [
  { ask: 'תלמידי שכבת ז׳ נשאלו מהו ענף הספורט האהוב עליהם', who: 'תלמידים', head: 'ענף ספורט', cats: ['כדורגל', 'כדורסל', 'שחייה', 'ריקוד'] },
  { ask: 'תלמידים נשאלו איזו חיית מחמד הם הכי אוהבים', who: 'תלמידים', head: 'חיית מחמד', cats: ['כלב', 'חתול', 'דג', 'תוכי'] },
  { ask: 'ילדים נשאלו מהו טעם הגלידה האהוב עליהם', who: 'ילדים', head: 'טעם', cats: ['וניל', 'שוקולד', 'תות', 'מנגו'] },
  { ask: 'תלמידים נשאלו איזה כלי נגינה היו רוצים ללמוד', who: 'תלמידים', head: 'כלי נגינה', cats: ['גיטרה', 'פסנתר', 'תופים', 'כינור'] },
  { ask: 'תלמידים נשאלו מהי עונת השנה האהובה עליהם', who: 'תלמידים', head: 'עונה', cats: ['קיץ', 'חורף', 'אביב', 'סתיו'] },
];
/* every single answer of the survey, mixed: verify() recounts from this list */
const rawOf = (R, cats, f) => R.shuffle(cats.flatMap((c, i) => Array(f[i]).fill(c)));
const times = (n) => (n === 1 ? 'פעם אחת' : `[[${n}]] פעמים`);
const countIn = (raw, c) => { let n = 0; for (const x of raw) if (x === c) n++; return n; };

/* a bar chart → how many in total, how many more */
const readBars = {
  id: 'read-bars',
  make(R) {
    const ctx = R.pick(CTX), k = R.pick([1, 2, 5]);
    let f;
    do { f = ctx.cats.map(() => k * R.int(1, 5)); } while (new Set(f).size < 3);
    let i, j;
    do { i = R.int(0, 3); j = R.int(0, 3); } while (f[i] <= f[j]);
    const N = f.reduce((s, v) => s + v, 0);
    return {
      tag: 'קריאת דיאגרמת עמודות',
      text: `${ctx.ask}. התוצאות מוצגות בדיאגרמת העמודות.`,
      fig: { type: 'bars', bars: ctx.cats.map((c, n) => ({ label: c, value: f[n] })), max: 5 * k, hideValues: true, alt: 'דיאגרמת עמודות של תוצאות הסקר' },
      rows: [
        { label: `כמה ${ctx.who} השתתפו בסקר?`, parts: [{ ans: N }] },
        { label: `כמה ${ctx.who} יותר בחרו ב${ctx.cats[i]} מאשר ב${ctx.cats[j]}?`, parts: [{ ans: f[i] - f[j] }] },
      ],
      hint: 'גובה כל עמודה הוא השכיחות: כמה בחרו בתשובה הזאת. קראו את הגובה לפי המספרים שבצד.',
      steps: [
        `קוראים את גובה העמודות: ${ctx.cats.map((c, n) => `${c} [[${f[n]}]]`).join(', ')}.`,
        `מספר המשתתפים הוא סכום כל השכיחויות: [[${f.join(' + ')} = ${N}]]`,
        `ההפרש בין ${ctx.cats[i]} ל${ctx.cats[j]}: [[${f[i]} - ${f[j]} = ${f[i] - f[j]}]]`,
      ],
      data: { raw: rawOf(R, ctx.cats, f), a: ctx.cats[i], b: ctx.cats[j] },
    };
  },
  verify(q) {
    const { raw, a, b } = q.data;
    const bars = q.fig.bars;
    for (const bar of bars) if (countIn(raw, bar.label) !== bar.value) return `bar ${bar.label} does not match the data`;
    if (q.rows[0].parts[0].ans !== raw.length) return 'total is wrong';
    return q.rows[1].parts[0].ans === countIn(raw, a) - countIn(raw, b) && q.rows[1].parts[0].ans > 0 ? true : 'difference is wrong';
  },
};

/* a raw list of data → the frequency of each value */
const TALLY = [
  { t: 'בטבלה רשום מספר האחים והאחיות של כל תלמיד בכיתה', lo: 0 },
  { t: 'בטבלה רשומים ציוני התלמידים בבוחן קצר', lo: 7 },
  { t: 'בטבלה רשום מספר השערים שהבקיעה קבוצת כדורגל בכל משחק העונה', lo: 0 },
  { t: 'בטבלה רשום מספר הספרים שקרא כל תלמיד בחופשה', lo: 1 },
];
const tally = {
  id: 'tally',
  make(R) {
    const ctx = R.pick(TALLY), per = R.pick([5, 6]), n = per * 3;
    const vals = [0, 1, 2, 3].map((d) => ctx.lo + d);
    let f;
    do { f = split(R, n, 4, 1); } while (new Set(f).size < 3 || Math.max(...f) > 8);
    const raw = R.shuffle(vals.flatMap((v, i) => Array(f[i]).fill(v)));
    const rows = [0, 1, 2].map((r) => raw.slice(r * per, r * per + per).map((v) => `[[${v}]]`));
    return {
      tag: 'מרשימת נתונים לשכיחות',
      text: `${ctx.t} ([[${n}]] נתונים). מצאו את השכיחות של כל ערך: כמה פעמים הוא מופיע.`,
      fig: { type: 'table', rows },
      rows: vals.map((v, i) => ({ label: `השכיחות של [[${v}]]:`, parts: [{ ans: f[i] }] })),
      hint: `עברו על הנתונים אחד אחד וסמנו כל נתון שספרתם. בסוף סכום השכיחויות צריך להיות [[${n}]].`,
      steps: [
        `הערך [[${vals[0]}]] מופיע ${times(f[0])}, והערך [[${vals[1]}]] מופיע ${times(f[1])}.`,
        `הערך [[${vals[2]}]] מופיע ${times(f[2])}, והערך [[${vals[3]}]] מופיע ${times(f[3])}.`,
        `בדיקה: [[${f.join(' + ')} = ${n}]], כמספר הנתונים.`,
      ],
      data: { raw, vals },
    };
  },
  verify(q) {
    const { raw, vals } = q.data;
    const shown = q.fig.rows.flat().join(' ');
    if (shown !== raw.map((v) => `[[${v}]]`).join(' ')) return 'the table does not show the data';
    let total = 0;
    for (let i = 0; i < vals.length; i++) {
      const c = raw.reduce((s, x) => s + (x === vals[i] ? 1 : 0), 0);
      if (q.rows[i].parts[0].ans !== c || c < 1) return `frequency of ${vals[i]} is wrong`;
      total += c;
    }
    return total === raw.length ? true : 'frequencies do not add up';
  },
};

/* a frequency table → relative frequency as a fraction and as a percent */
const relative = {
  id: 'relative',
  make(R) {
    const ctx = R.pick(CTX), N = R.pick([20, 25, 40, 50]);
    let f, i;
    do { f = split(R, N, 4, 2); i = R.int(0, 3); } while (new Set(f).size < 3 || (100 * f[i]) % N !== 0);
    const pct = (100 * f[i]) / N, c = ctx.cats[i];
    return {
      tag: 'שכיחות יחסית',
      text: `${ctx.ask}. התוצאות רשומות בטבלת השכיחויות. מהי השכיחות היחסית של ${c}?`,
      fig: { type: 'table', head: [ctx.head, 'שכיחות'], rows: ctx.cats.map((x, n) => [x, `[[${f[n]}]]`]) },
      rows: [
        { label: 'כשבר:', parts: [{ frac: [f[i], N] }] },
        { label: 'באחוזים:', parts: [{ ans: pct }, '%'] },
      ],
      hint: 'שכיחות יחסית היא השכיחות חלקי מספר כל הנתונים. קודם מחברים את כל השכיחויות.',
      steps: [
        `מספר כל הנתונים: [[${f.join(' + ')} = ${N}]]`,
        `השכיחות של ${c} היא [[${f[i]}]], ולכן השכיחות היחסית היא [[${frEq(f[i], N)}]]`,
        `באחוזים: [[${fr(f[i], N)} = ${fr(pct, 100)} = ${pct}%]]`,
      ],
      data: { raw: rawOf(R, ctx.cats, f), c },
    };
  },
  verify(q) {
    const { raw, c } = q.data;
    for (const [name, v] of q.fig.rows) if (`[[${countIn(raw, name)}]]` !== v) return 'the table does not match the data';
    const k = countIn(raw, c);
    if (!sameFrac(q.rows[0].parts[0], k, raw.length)) return 'fraction is wrong';
    return q.rows[1].parts[0].ans * raw.length === 100 * k ? true : 'percent is wrong';
  },
};

/* the total is known, one frequency is missing */
const missing = {
  id: 'missing',
  make(R) {
    const ctx = R.pick(CTX), N = R.pick([20, 25, 50]);
    let f, i;
    do { f = split(R, N, 4, 2); i = R.int(0, 3); } while (new Set(f).size < 3 || (100 * f[i]) % N !== 0);
    const pct = (100 * f[i]) / N, c = ctx.cats[i];
    const known = f.filter((_, n) => n !== i), sumKnown = N - f[i];
    return {
      tag: 'שכיחות חסרה',
      text: `${ctx.ask}. בסקר השתתפו [[${N}]] ${ctx.who}, אבל שכיחות אחת נמחקה מהטבלה.`,
      fig: { type: 'table', head: [ctx.head, 'שכיחות'], rows: [...ctx.cats.map((x, n) => [x, n === i ? '?' : `[[${f[n]}]]`]), ['סך הכול', `[[${N}]]`]] },
      rows: [
        { label: `כמה ${ctx.who} בחרו ב${c}?`, parts: [{ ans: f[i] }] },
        { label: `מהי השכיחות היחסית של ${c}, באחוזים?`, parts: [{ ans: pct }, '%'] },
      ],
      hint: 'סכום כל השכיחויות שווה למספר המשתתפים. חברו את השכיחויות הידועות והחסירו מהסך הכול.',
      steps: [
        `השכיחויות הידועות: [[${known.join(' + ')} = ${sumKnown}]]`,
        `השכיחות החסרה: [[${N} - ${sumKnown} = ${f[i]}]]`,
        `השכיחות היחסית: [[${fr(f[i], N)} = ${fr(pct, 100)} = ${pct}%]]`,
      ],
      data: { raw: rawOf(R, ctx.cats, f), c, N },
    };
  },
  verify(q) {
    const { raw, c, N } = q.data;
    if (raw.length !== N) return 'total is wrong';
    let hidden = 0;
    for (const [name, v] of q.fig.rows.slice(0, -1)) {
      if (v === '?') { hidden++; if (name !== c) return 'wrong row is hidden'; } else if (`[[${countIn(raw, name)}]]` !== v) return 'the table does not match the data';
    }
    const k = countIn(raw, c);
    if (hidden !== 1 || q.rows[0].parts[0].ans !== k) return 'missing frequency is wrong';
    return q.rows[1].parts[0].ans * N === 100 * k ? true : 'percent is wrong';
  },
};

/* from a relative frequency (percent) back to the number of answers */
const fromPercent = {
  id: 'from-percent',
  make(R) {
    const ctx = R.pick(CTX), N = R.pick([20, 40, 50, 60, 80, 120, 200]);
    let pct;
    do { pct = 5 * R.int(1, 15); } while ((pct * N) % 100 !== 0 || pct === 50);
    const c = R.pick(ctx.cats), k = (pct * N) / 100;
    return {
      tag: 'משכיחות יחסית לשכיחות',
      text: `${ctx.ask}. בסקר השתתפו [[${N}]] ${ctx.who}, והשכיחות היחסית של ${c} היא [[${pct}%]].`,
      rows: [
        { label: `כמה ${ctx.who} בחרו ב${c}?`, parts: [{ ans: k }] },
        { label: `כמה ${ctx.who} בחרו בתשובה אחרת?`, parts: [{ ans: N - k }] },
      ],
      hint: `השכיחות היחסית היא החלק מתוך כל המשתתפים. חשבו [[${pct}%]] מתוך [[${N}]].`,
      steps: [
        `[[${pct}%]] מתוך [[${N}]]: [[${fr(pct, 100)} * ${N} = ${num(k)}]]`,
        `לכן [[${k}]] ${ctx.who} בחרו ב${c}.`,
        `כל השאר: [[${N} - ${k} = ${N - k}]]`,
      ],
      data: { N, pct },
    };
  },
  verify(q) {
    const { N, pct } = q.data;
    const k = q.rows[0].parts[0].ans, rest = q.rows[1].parts[0].ans;
    if (!Number.isInteger(k) || k <= 0 || k >= N) return 'count is not a sensible whole number';
    if (k * 100 !== pct * N) return 'count does not give the percent';
    return k + rest === N ? true : 'the rest is wrong';
  },
};

export default {
  id: 'frequency',
  name: 'שכיחות ושכיחות יחסית',
  grade: 'ז׳–ח׳',
  about: 'קוראים טבלאות ודיאגרמות, סופרים כמה פעמים מופיע כל נתון, ומחשבים איזה חלק הוא מכל הנתונים',
  place: 'נושא חדש בתחום "מספרים": "סטטיסטיקה והסתברות" ← פרק ראשון בנושא (לפני "ממוצע, חציון, שכיח וטווח")',
  lesson: [
    { t: 'מהי שכיחות?', items: [
      'השכיחות של נתון היא מספר הפעמים שהוא מופיע.',
      'שאלו [[20]] תלמידים מהו הפרי האהוב עליהם. את התשובות מסכמים בטבלת שכיחויות:',
      { fig: { type: 'table', head: ['פרי', 'שכיחות'], rows: [['תפוח', '[[8]]'], ['בננה', '[[5]]'], ['ענבים', '[[7]]']] } },
      'השכיחות של "תפוח" היא [[8]]: שמונה תלמידים בחרו בתפוח.',
      { note: 'סכום כל השכיחויות שווה למספר הנתונים: [[8 + 5 + 7 = 20]].' },
    ] },
    { t: 'דיאגרמת עמודות', items: [
      'אפשר להציג את אותן שכיחויות בדיאגרמת עמודות. גובה כל עמודה הוא השכיחות.',
      { fig: { type: 'bars', bars: [{ label: 'תפוח', value: 8 }, { label: 'בננה', value: 5 }, { label: 'ענבים', value: 7 }], max: 10 } },
      'העמודה הגבוהה ביותר מראה את הנתון השכיח ביותר: כאן זה "תפוח".',
    ] },
    { t: 'שכיחות יחסית', items: [
      'השכיחות היחסית אומרת איזה חלק מכל הנתונים הוא הנתון הזה. מחלקים את השכיחות במספר כל הנתונים.',
      'אפשר לכתוב אותה כשבר, כמספר עשרוני או באחוזים.',
      { ex: 'מהי השכיחות היחסית של "בננה" בסקר הפירות?', sol: ['השכיחות של "בננה" היא [[5]], ומספר כל הנתונים הוא [[20]].', 'השכיחות היחסית: [[{5|20} = {1|4}]]', 'באחוזים: [[{5|20} = {25|100} = 25%]]'] },
      { note: 'טעות נפוצה: לחלק במספר השורות בטבלה. מחלקים תמיד במספר כל הנתונים (כאן [[20]]). סכום כל השכיחויות היחסיות הוא [[1]], כלומר [[100%]].' },
    ] },
  ],
  gens: [readBars, tally, relative, missing, fromPercent],
};
