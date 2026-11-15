/* הסתברות: מאורע משלים ודו-שלבי (כיתה ט׳) — board #84 */
import { num, round } from '../../core.js';
import { COL, COLS, ballsText, and, fr, frEq, sameFrac, holds, brute, closed, evText, randEvent } from './util.js';

/* ── complement: 1 − p ──────────────────────────────────────────────────── */
const STORIES = [
  { pos: 'שירד גשם מחר', neg: 'שלא ירד גשם מחר' },
  { pos: 'שקבוצת הכדורסל תנצח במשחק', neg: 'שהקבוצה לא תנצח במשחק' },
  { pos: 'שהאוטובוס יאחר', neg: 'שהאוטובוס לא יאחר' },
  { pos: 'שכרטיס ההגרלה יזכה בפרס', neg: 'שהכרטיס לא יזכה בפרס' },
  { pos: 'שיעל תקלע לסל בזריקת עונשין', neg: 'שיעל לא תקלע לסל' },
];
const complement = {
  id: 'complement',
  make(R) {
    const s = R.pick(STORIES), form = R.pick(['dec', 'pct', 'frac']);
    let shown, parts, steps, data;
    if (form === 'dec') {
      const p = R.pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]), a = round(1 - p, 2);
      shown = num(p); parts = [{ ans: a }]; steps = [`[[1 - ${num(p)} = ${num(a)}]]`]; data = { form, p };
    } else if (form === 'pct') {
      const p = 5 * R.int(1, 19);
      shown = `${p}%`; parts = [{ ans: 100 - p }, '%']; steps = [`[[100% - ${p}% = ${100 - p}%]]`]; data = { form, p };
    } else {
      const d = R.int(3, 12), n = R.int(1, d - 1);
      shown = fr(n, d); parts = [{ frac: [d - n, d] }]; steps = [`[[1 - ${fr(n, d)} = ${fr(d, d)} - ${fr(n, d)} = ${frEq(d - n, d)}]]`]; data = { form, n, d };
    }
    return {
      tag: 'מאורע משלים',
      text: `ההסתברות ${s.pos} היא [[${shown}]]. מה ההסתברות ${s.neg}?`,
      rows: [{ label: 'ההסתברות:', parts }],
      hint: `שני המאורעות משלימים זה את זה: בדיוק אחד מהם יקרה. לכן סכום ההסתברויות שלהם הוא [[${form === 'pct' ? '100%' : '1'}]].`,
      steps: ['המאורע "לא יקרה" הוא המאורע המשלים של "יקרה". סכום ההסתברויות של מאורע ושל המשלים שלו הוא תמיד [[1]].', ...steps],
      data,
    };
  },
  verify(q) {
    const d = q.data, box = q.rows[0].parts[0];
    if (d.form === 'dec') return Math.abs(d.p + box.ans - 1) < 1e-9 && box.ans > 0 ? true : 'does not add up to 1';
    if (d.form === 'pct') return d.p + box.ans === 100 && box.ans > 0 ? true : 'does not add up to 100%';
    const [n, den] = box.frac;
    return n * d.d + d.n * den === den * d.d && n > 0 ? true : 'fractions do not add up to 1';
  },
};

/* ── two stages by a table of outcomes ──────────────────────────────────── */
const SUMEV = {
  eq: (s) => `סכום המספרים הוא [[${s}]]`,
  ge: (s) => `סכום המספרים הוא לפחות [[${s}]]`,
  le: (s) => `סכום המספרים הוא לכל היותר [[${s}]]`,
  same: () => 'שני המספרים שווים',
  even: () => 'סכום המספרים זוגי',
};
const sumHolds = (t, s, i, j) => (t === 'eq' ? i + j === s : t === 'ge' ? i + j >= s : t === 'le' ? i + j <= s : t === 'same' ? i === j : (i + j) % 2 === 0);
const sumTable = {
  id: 'sum-table',
  make(R) {
    const [a, b] = R.pick([[6, 6], [6, 6], [4, 4], [4, 6], [3, 4]]);
    let t, s, fav;
    do {
      t = R.pick(['eq', 'eq', 'ge', 'le', 'same', 'even']);
      s = t === 'eq' ? R.int(3, a + b - 1) : t === 'ge' ? R.int(a + b - 3, a + b - 1) : R.int(3, 5);
      fav = 0;
      for (let i = 1; i <= a; i++) for (let j = 1; j <= b; j++) if (sumHolds(t, s, i, j)) fav++;
    } while (fav < 2 || fav >= a * b);
    const intro = a === 6 && b === 6
      ? 'מטילים שתי קוביות משחק הוגנות, ומחברים את שני המספרים שהתקבלו.'
      : `מסובבים שני גלגלי מזל הוגנים: על הראשון המספרים [[1]] עד [[${a}]], ועל השני המספרים [[1]] עד [[${b}]]. מחברים את שני המספרים שהתקבלו.`;
    const cols = Array.from({ length: b }, (_, j) => j + 1), rws = Array.from({ length: a }, (_, i) => i + 1);
    return {
      tag: 'טבלת תוצאות לשני שלבים',
      text: `${intro} בטבלה כל הסכומים האפשריים. מה ההסתברות ש${SUMEV[t](s)}?`,
      fig: { type: 'table', rowHead: true, head: ['[[+]]', ...cols.map((j) => `[[${j}]]`)], rows: rws.map((i) => [`[[${i}]]`, ...cols.map((j) => `[[${i + j}]]`)]) },
      rows: [
        { label: 'כמה תוצאות אפשריות יש בסך הכול?', parts: [{ ans: a * b }] },
        { label: `בכמה מהן ${SUMEV[t](s)}?`, parts: [{ ans: fav }] },
        { label: 'ההסתברות:', parts: [{ frac: [fav, a * b] }] },
      ],
      hint: 'כל משבצת בטבלה היא תוצאה אפשרית אחת, ולכל המשבצות אותו סיכוי. ספרו את המשבצות המתאימות.',
      steps: [
        `מספר כל התוצאות: [[${a} * ${b} = ${a * b}]]`,
        `סופרים בטבלה את המשבצות שבהן ${SUMEV[t](s)}: יש [[${fav}]] כאלה.`,
        `ההסתברות: [[${frEq(fav, a * b)}]]`,
      ],
      data: { a, b, t, s },
    };
  },
  verify(q) {
    const { a, b, t, s } = q.data;
    const cl = (v) => Math.max(0, Math.min(b, v));
    // row by row with arithmetic instead of looking at every cell
    let fav = 0;
    for (let i = 1; i <= a; i++) {
      if (t === 'eq') fav += s - i >= 1 && s - i <= b ? 1 : 0;
      else if (t === 'ge') fav += cl(b - Math.max(1, s - i) + 1);
      else if (t === 'le') fav += cl(s - i);
      else if (t === 'same') fav += i <= b ? 1 : 0;
      else fav += i % 2 === 1 ? Math.ceil(b / 2) : Math.floor(b / 2);
    }
    if (q.fig.rows.length !== a || q.fig.head.length !== b + 1) return 'the table has the wrong size';
    if (q.fig.rows.some((r, i) => r.slice(1).some((c, j) => c !== `[[${i + j + 2}]]`))) return 'the table has a wrong sum';
    if (q.rows[0].parts[0].ans !== a * b || q.rows[1].parts[0].ans !== fav) return `counts are wrong (expected ${fav})`;
    return sameFrac(q.rows[2].parts[0], fav, a * b) && fav > 0 && fav < a * b ? true : 'probability is wrong';
  },
};

/* ── two independent stages: multiply ───────────────────────────────────── */
const independent = {
  id: 'two-independent',
  make(R) {
    const coin = R.bool(0.4);
    let m = 2, c = 1, col = null;
    if (!coin) { m = R.pick([4, 5, 8, 10]); do { c = R.int(1, m - 1); } while (c * 2 === m); col = R.pick(COLS); }
    const ev = randEvent(R, 6), k = closed(ev, 6);
    const introA = coin ? 'מטילים מטבע הוגן' : `מסובבים גלגל מזל שמחולק ל-[[${m}]] גזרות שוות, ${c === 1 ? 'ואחת' : `ו-[[${c}]]`} מהן בצבע ${COL[col].one}`;
    const labelA = coin ? 'ההסתברות לקבל "עץ" במטבע:' : `ההסתברות שהגלגל ייעצר על צבע ${COL[col].one}:`;
    const both = coin ? `"עץ" במטבע וגם ${evText(ev)} בקובייה` : `צבע ${COL[col].one} בגלגל וגם ${evText(ev)} בקובייה`;
    return {
      tag: 'שני שלבים בלתי תלויים',
      text: `${introA}, ומטילים גם קוביית משחק הוגנת. מה ההסתברות לקבל ${both}?`,
      rows: [
        { label: labelA, parts: [{ frac: [c, m] }] },
        { label: `ההסתברות לקבל ${evText(ev)} בקובייה:`, parts: [{ frac: [k, 6] }] },
        { label: 'ההסתברות ששני המאורעות יקרו:', parts: [{ frac: [c * k, m * 6] }] },
      ],
      hint: 'התוצאה של השלב הראשון לא משפיעה על השלב השני. לכן כופלים את שתי ההסתברויות.',
      steps: [
        `השלב הראשון: [[${frEq(c, m)}]]`,
        `השלב השני: [[${frEq(k, 6)}]]`,
        `כופלים: [[${fr(c, m)} * ${fr(k, 6)} = ${frEq(c * k, m * 6)}]]`,
      ],
      data: { m, c, ev },
    };
  },
  verify(q) {
    const { m, c, ev } = q.data;
    // every pair (slot of the first stage, face of the die)
    let all = 0, fav = 0, fa = 0, fb = 0;
    for (let i = 0; i < m; i++) for (let x = 1; x <= 6; x++) { all++; const A = i < c, B = holds(ev, x); if (A) fa++; if (B) fb++; if (A && B) fav++; }
    if (!sameFrac(q.rows[0].parts[0], fa, all) || !sameFrac(q.rows[1].parts[0], fb, all)) return 'a single-stage probability is wrong';
    if (!q.text.includes(evText(ev))) return 'the event is not in the text';
    return sameFrac(q.rows[2].parts[0], fav, all) && fav > 0 ? true : 'joint probability is wrong';
  },
};

/* ── two draws: tree, with and without replacement ──────────────────────── */
function pairCounts(balls, A, replace) {
  const c = { all: 0, AA: 0, BB: 0, AB: 0, same: 0, diff: 0, firstA: 0 };
  for (let i = 0; i < balls.length; i++) for (let j = 0; j < balls.length; j++) {
    if (!replace && i === j) continue;
    c.all++;
    const x = balls[i] === A, y = balls[j] === A;
    if (x) c.firstA++;
    if (x && y) c.AA++;
    if (!x && !y) c.BB++;
    if (x && !y) c.AB++;
    if (x === y) c.same++; else c.diff++;
  }
  return c;
}
const twoCols = (R) => R.shuffle(COLS).slice(0, 2);

const withReplacement = {
  id: 'with-replacement',
  make(R) {
    const [A, B] = twoCols(R);
    let a, b;
    do { a = R.int(1, 5); b = R.int(1, 5); } while (a + b < 3 || a + b > 8 || a === b);
    const N = a + b, D = N * N;
    const pure = R.pick(['AA', 'BB', 'AB']), comb = R.pick(['same', 'diff']);
    const P = {
      AA: { label: `ההסתברות ששני הכדורים יהיו ${COL[A].many}:`, n: a * a, step: `שני ${COL[A].many}: [[${fr(a, N)} * ${fr(a, N)} = ${frEq(a * a, D)}]]` },
      BB: { label: `ההסתברות ששני הכדורים יהיו ${COL[B].many}:`, n: b * b, step: `שני ${COL[B].many}: [[${fr(b, N)} * ${fr(b, N)} = ${frEq(b * b, D)}]]` },
      AB: { label: `ההסתברות שהראשון יהיה ${COL[A].one} והשני ${COL[B].one}:`, n: a * b, step: `ראשון ${COL[A].one} ושני ${COL[B].one}: [[${fr(a, N)} * ${fr(b, N)} = ${frEq(a * b, D)}]]` },
      same: { label: 'ההסתברות ששני הכדורים יהיו באותו צבע:', n: a * a + b * b, step: `אותו צבע, שני מסלולים בעץ: [[${fr(a * a, D)} + ${fr(b * b, D)} = ${frEq(a * a + b * b, D)}]]` },
      diff: { label: 'ההסתברות ששני הכדורים יהיו בצבעים שונים:', n: 2 * a * b, step: `צבעים שונים, שני מסלולים בעץ: [[${fr(a * b, D)} + ${fr(a * b, D)} = ${frEq(2 * a * b, D)}]]` },
    };
    const kids = [{ color: A, p: [a, N] }, { color: B, p: [b, N] }];
    return {
      tag: 'שתי הוצאות עם החזרה',
      text: `בשקית יש ${ballsText(a, A)} ${and(ballsText(b, B))}. מוציאים כדור, רושמים את צבעו ומחזירים אותו לשקית. אחר כך מוציאים כדור נוסף. היעזרו בדיאגרמת העץ.`,
      fig: { type: 'tree', branches: [{ color: A, p: [a, N], kids }, { color: B, p: [b, N], kids }], alt: 'דיאגרמת עץ של שתי ההוצאות' },
      rows: [
        { label: P[pure].label, parts: [{ frac: [P[pure].n, D] }] },
        { label: P[comb].label, parts: [{ frac: [P[comb].n, D] }] },
      ],
      hint: 'לאורך מסלול בעץ כופלים את ההסתברויות. אם כמה מסלולים מתאימים למאורע, מחברים את התוצאות שלהם.',
      steps: [
        'הכדור מוחזר לשקית, ולכן ההסתברויות בהוצאה השנייה זהות לאלה שבהוצאה הראשונה.',
        P[pure].step,
        ...(comb === 'same' ? [pure === 'AA' ? P.BB.step : pure === 'BB' ? P.AA.step : `${P.AA.step}, ${P.BB.step}`] : pure === 'AB' ? [] : [P.AB.step]),
        P[comb].step,
      ],
      data: { balls: [...Array(a).fill(A), ...Array(b).fill(B)], A, pure, comb },
    };
  },
  verify(q) {
    const { balls, A, pure, comb } = q.data, c = pairCounts(balls, A, true);
    const N = balls.length, a = balls.filter((x) => x === A).length;
    const br = q.fig.branches;
    if (br[0].color !== A || br[0].p[0] !== a || br[0].p[1] !== N || br[1].p[0] !== N - a || br.some((x) => x.kids[0].p[0] !== a || x.kids[1].p[0] !== N - a || x.kids[0].p[1] !== N)) return 'the tree is wrong';
    if (!sameFrac(q.rows[0].parts[0], c[pure], c.all)) return `${pure} is wrong`;
    return sameFrac(q.rows[1].parts[0], c[comb], c.all) ? true : `${comb} is wrong`;
  },
};

const withoutReplacement = {
  id: 'without-replacement',
  make(R) {
    const [A, B] = twoCols(R);
    let a, b;
    do { a = R.int(2, 6); b = R.int(2, 6); } while (a + b > 9 || a === b);
    const N = a + b, D = N * (N - 1);
    return {
      tag: 'שתי הוצאות בלי החזרה',
      text: `בשקית יש ${ballsText(a, A)} ${and(ballsText(b, B))}. מוציאים כדור ולא מחזירים אותו, ואחר כך מוציאים כדור נוסף. בדיאגרמת העץ חסרות ההסתברויות של ההוצאה השנייה.`,
      fig: { type: 'tree', branches: [
        { color: A, p: [a, N], kids: [{ color: A, p: '?' }, { color: B, p: '?' }] },
        { color: B, p: [b, N], kids: [{ color: A, p: '?' }, { color: B, p: '?' }] },
      ], alt: 'דיאגרמת עץ של שתי ההוצאות' },
      rows: [
        { label: `הכדור הראשון היה ${COL[A].one}. מה ההסתברות שגם השני יהיה ${COL[A].one}?`, parts: [{ frac: [a - 1, N - 1] }] },
        { label: `ההסתברות ששני הכדורים יהיו ${COL[A].many}:`, parts: [{ frac: [a * (a - 1), D] }] },
        { label: 'ההסתברות ששני הכדורים יהיו בצבעים שונים:', parts: [{ frac: [2 * a * b, D] }] },
      ],
      hint: `אחרי ההוצאה הראשונה נשארים בשקית רק [[${N - 1}]] כדורים, ומהצבע שיצא נשאר כדור אחד פחות.`,
      steps: [
        `אחרי שיצא כדור ${COL[A].one} נשארו [[${N - 1}]] כדורים, מהם ${a - 1 === 1 ? `אחד ${COL[A].one}` : `[[${a - 1}]] ${COL[A].many}`}: ההסתברות [[${frEq(a - 1, N - 1)}]]`,
        `שני ${COL[A].many}: [[${fr(a, N)} * ${fr(a - 1, N - 1)} = ${frEq(a * (a - 1), D)}]]`,
        `ראשון ${COL[A].one} ושני ${COL[B].one}: [[${fr(a, N)} * ${fr(b, N - 1)} = ${fr(a * b, D)}]]. ראשון ${COL[B].one} ושני ${COL[A].one}: [[${fr(b, N)} * ${fr(a, N - 1)} = ${fr(a * b, D)}]]`,
        `צבעים שונים: [[${fr(a * b, D)} + ${fr(a * b, D)} = ${frEq(2 * a * b, D)}]]`,
      ],
      data: { balls: [...Array(a).fill(A), ...Array(b).fill(B)], A },
    };
  },
  verify(q) {
    const { balls, A } = q.data, c = pairCounts(balls, A, false);
    const N = balls.length, a = balls.filter((x) => x === A).length, br = q.fig.branches;
    if (br[0].color !== A || br[0].p[0] !== a || br[0].p[1] !== N || br[1].p[0] !== N - a || br[1].p[1] !== N) return 'the tree is wrong';
    if (!sameFrac(q.rows[0].parts[0], c.AA, c.firstA)) return 'conditional step is wrong';
    if (!sameFrac(q.rows[1].parts[0], c.AA, c.all)) return 'both-same is wrong';
    return sameFrac(q.rows[2].parts[0], c.diff, c.all) ? true : 'different colours is wrong';
  },
};

/* ── at least one ───────────────────────────────────────────────────────── */
const atLeastOne = {
  id: 'at-least-one',
  make(R) {
    const kind = R.pick(['coin', 'die', 'die', 'bag', 'bag', 'bag']);
    let m, k, t = 2, text, none, some, data, one;
    if (kind === 'coin') {
      t = R.pick([2, 3]); m = 2; k = 1;
      text = `מטילים מטבע הוגן ${t === 2 ? 'פעמיים' : 'שלוש פעמים'}.`;
      none = 'ההסתברות שלא יתקבל "עץ" באף הטלה:'; some = 'ההסתברות לקבל "עץ" לפחות פעם אחת:';
      one = 'לא לקבל "עץ" בהטלה אחת'; data = { kind, t };
    } else if (kind === 'die') {
      const ev = randEvent(R, 6); m = 6; k = closed(ev, 6);
      text = 'מטילים קוביית משחק הוגנת פעמיים.';
      none = `ההסתברות שלא יתקבל ${evText(ev)} באף הטלה:`; some = `ההסתברות לקבל ${evText(ev)} לפחות פעם אחת:`;
      one = `לא לקבל ${evText(ev)} בהטלה אחת`; data = { kind, t, ev };
    } else {
      const [A, B] = twoCols(R);
      let a, b;
      do { a = R.int(1, 5); b = R.int(1, 5); } while (a + b < 3 || a + b > 8);
      m = a + b; k = a;
      text = `בשקית יש ${ballsText(a, A)} ${and(ballsText(b, B))}. מוציאים כדור, מחזירים אותו לשקית, ומוציאים כדור שוב.`;
      none = `ההסתברות שאף אחד משני הכדורים לא יהיה ${COL[A].one}:`; some = `ההסתברות שלפחות אחד מהכדורים יהיה ${COL[A].one}:`;
      one = `להוציא כדור שאינו ${COL[A].one} בהוצאה אחת`; data = { kind, t, balls: [...Array(a).fill(A), ...Array(b).fill(B)], A };
    }
    const D = m ** t, no = (m - k) ** t;
    return {
      tag: 'לפחות פעם אחת',
      text: `${text} חשבו את שתי ההסתברויות.`,
      rows: [
        { label: none, parts: [{ frac: [no, D] }] },
        { label: some, parts: [{ frac: [D - no, D] }] },
      ],
      hint: '"לפחות פעם אחת" הוא המאורע המשלים של "אף פעם". קל יותר לחשב את ההסתברות של "אף פעם", ולהחסיר אותה מ-[[1]].',
      steps: [
        `ההסתברות ${one}: [[${frEq(m - k, m)}]]`,
        `"אף פעם": כופלים [[${Array(t).fill(fr(m - k, m)).join(' * ')} = ${frEq(no, D)}]]`,
        `"לפחות פעם אחת" הוא המאורע המשלים: [[1 - ${fr(no, D)} = ${frEq(D - no, D)}]]`,
      ],
      data,
    };
  },
  verify(q) {
    const d = q.data;
    // the outcomes of one trial, as true (the event happened) / false
    const one = d.kind === 'coin' ? [true, false] : d.kind === 'die' ? [1, 2, 3, 4, 5, 6].map((x) => holds(d.ev, x)) : d.balls.map((b) => b === d.A);
    if (d.kind === 'die' && brute(d.ev, 6) !== one.filter(Boolean).length) return 'event count differs';
    let all = 0, none = 0;
    const go = (depth, hit) => { if (depth === d.t) { all++; if (!hit) none++; return; } for (const o of one) go(depth + 1, hit || o); };
    go(0, false);
    if (none === 0 || none === all) return 'degenerate';
    if (!sameFrac(q.rows[0].parts[0], none, all)) return '"never" is wrong';
    return sameFrac(q.rows[1].parts[0], all - none, all) ? true : '"at least once" is wrong';
  },
};

export default {
  id: 'probability-two-stage',
  name: 'הסתברות: מאורע משלים ודו-שלבי',
  grade: 'ט׳',
  about: 'מחשבים הסתברות של "לא יקרה", ושל ניסוי בשני שלבים בעזרת טבלה ודיאגרמת עץ',
  place: 'נושא חדש בתחום "מספרים": "סטטיסטיקה והסתברות" ← פרק רביעי, אחרי "הסתברות"',
  lesson: [
    { t: 'מאורע משלים', items: [
      'המאורע המשלים של מאורע הוא "המאורע לא קרה". בדיוק אחד מהשניים קורה, ולכן סכום ההסתברויות שלהם הוא [[1]].',
      'כלומר: ההסתברות של המאורע המשלים היא [[1]] פחות ההסתברות של המאורע.',
      { ex: 'ההסתברות שירד גשם מחר היא [[0.3]]. מה ההסתברות שלא ירד גשם?', sol: ['"לא ירד גשם" הוא המאורע המשלים.', '[[1 - 0.3 = 0.7]]'] },
    ] },
    { t: 'שני שלבים: טבלת תוצאות', items: [
      'כשיש שני שלבים (שתי הטלות, מטבע וקובייה), רושמים בטבלה את כל הצירופים האפשריים. כשלכל הצירופים אותו סיכוי, סופרים את המתאימים.',
      { fig: { type: 'table', rowHead: true, head: ['מטבע 1 / מטבע 2', 'עץ', 'פלי'], rows: [['עץ', 'עץ, עץ', 'עץ, פלי'], ['פלי', 'פלי, עץ', 'פלי, פלי']] } },
      { ex: 'מטילים שני מטבעות. מה ההסתברות לקבל "עץ" בשניהם?', sol: ['בטבלה [[2 * 2 = 4]] תוצאות אפשריות.', 'רק תוצאה אחת מתאימה: עץ, עץ.', 'ההסתברות: [[{1|4}]]'] },
      'אפשר גם לכפול: [[{1|2} * {1|2} = {1|4}]]. כשהשלב הראשון לא משפיע על השני, כופלים את ההסתברויות.',
    ] },
    { t: 'דיאגרמת עץ', items: [
      'בדיאגרמת עץ כל ענף הוא תוצאה אפשרית, ולידו ההסתברות שלה. לאורך מסלול כופלים. כשכמה מסלולים מתאימים, מחברים.',
      { ex: 'בשקית [[3]] כדורים אדומים ו-[[2]] כחולים. מוציאים שני כדורים בזה אחר זה, בלי להחזיר. מה ההסתברות ששניהם אדומים? ומה ההסתברות שהם בצבעים שונים?', fig2: { type: 'tree', branches: [
        { color: 'red', p: [3, 5], kids: [{ color: 'red', p: [2, 4] }, { color: 'blue', p: [2, 4] }] },
        { color: 'blue', p: [2, 5], kids: [{ color: 'red', p: [3, 4] }, { color: 'blue', p: [1, 4] }] },
      ] }, sol: ['אחרי שיצא כדור אדום נשארו [[4]] כדורים, מהם [[2]] אדומים. לכן בענף השני ההסתברות היא [[{2|4}]].', 'שני אדומים: [[{3|5} * {2|4} = {6|20} = {3|10}]]', 'צבעים שונים, שני מסלולים: [[{3|5} * {2|4} + {2|5} * {3|4} = {6|20} + {6|20} = {12|20} = {3|5}]]'] },
      { note: 'עם החזרה: ההסתברויות בשלב השני נשארות כמו בראשון. בלי החזרה: בשלב השני יש כדור אחד פחות, וההסתברויות משתנות.' },
    ] },
    { t: 'לפחות פעם אחת', items: [
      '"לפחות פעם אחת" הוא המאורע המשלים של "אף פעם". לכן מחשבים את ההסתברות של "אף פעם" ומחסירים מ-[[1]].',
      { ex: 'מטילים קובייה פעמיים. מה ההסתברות לקבל [[6]] לפחות פעם אחת?', sol: ['ההסתברות לא לקבל [[6]] בהטלה אחת: [[{5|6}]]', 'אף פעם לא [[6]]: [[{5|6} * {5|6} = {25|36}]]', 'לפחות פעם אחת: [[1 - {25|36} = {11|36}]]'] },
    ] },
  ],
  gens: [complement, sumTable, independent, withReplacement, withoutReplacement, atLeastOne],
};
