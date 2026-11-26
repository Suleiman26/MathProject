/* The student's own work on a word problem (fixes board #93, Sulaiman): before the final answer the
   student may write the equation that comes out of the story, or (motion questions) fill a helper
   table speed · time = distance. Both are checked by VALUE with the safe parser of
   ../equation-solver/words.js (no eval), so any equivalent form is accepted.
   Pure logic, no React. Tests: node --test src/topics/new/work.test.mjs */
import { parse, evalAst, hasX, sameValue } from '../equation-solver/words.js';

const close = (u, v) => Math.abs(u - v) <= 1e-7 * Math.max(1, Math.abs(u), Math.abs(v));
const PROBES = [1.37, 2.9, 5.11, 7.3, -3.41];
const clean = (s) => String(s == null ? '' : s).replace(/[‎‏‪-‮⁦-⁩]/g, '').trim();
const bareX = (n) => n.t === 'x' || (n.t === 'grp' && bareX(n.a));

const SIDE_ERR = {
  empty: 'חסר אגף: משני הצדדים של הסימן = צריך להיות ביטוי',
  equals: 'כתבו משוואה אחת, עם סימן = אחד',
  letter: 'משתמשים רק בנעלם [[x]], במספרים ובפעולות חשבון',
  char: 'יש כאן סימן שאי אפשר להשתמש בו. מותר: מספרים, [[x]], סוגריים, פעולות חשבון וסימן =',
  xnum: 'את המספר כותבים לפני ה-[[x]]: למשל [[2x]] ולא x2',
  paren: 'בדקו את הסוגריים: כל סוגר שנפתח צריך להיסגר',
  syntax: 'המשוואה לא כתובה נכון. בדקו שלא חסר מספר או [[x]] ליד סימן הפעולה',
};

/** Parse "3x + 5 = 20" → { ok, L, R } | { ok: false, msg } */
export function parseEquation(src) {
  const s = clean(src);
  if (!s) return { ok: false, msg: 'כתבו כאן משוואה' };
  const parts = s.split('=');
  if (parts.length === 1) return { ok: false, msg: 'במשוואה יש סימן = בין שני אגפים' };
  if (parts.length > 2) return { ok: false, msg: SIDE_ERR.equals };
  const sides = parts.map((p) => (p.trim() ? parse(p) : { ok: false, err: 'empty' }));
  const bad = sides.find((r) => !r.ok);
  if (bad) return { ok: false, msg: SIDE_ERR[bad.err] || SIDE_ERR.syntax };
  return { ok: true, L: sides[0].ast, R: sides[1].ast };
}

/** Check the student's equation against the story.
    xs = the values x may stand for (the answer, or another quantity of the story the student may
    have called x, e.g. the older age). → { ok: true, msg } | { ok: false, format?: true, msg } */
export function checkEquation(src, xs) {
  const r = parseEquation(src);
  if (!r.ok) return { ok: false, format: true, msg: r.msg };
  const { L, R } = r;
  if (!hasX(L) && !hasX(R)) return { ok: false, format: true, msg: 'במשוואה צריך להופיע הנעלם [[x]]: מה שמחפשים' };
  if ((bareX(L) && !hasX(R)) || (bareX(R) && !hasX(L))) {
    return { ok: false, format: true, msg: 'זו כבר התוצאה של הפתרון. כתבו קודם את המשוואה שיוצאת מהסיפור.' };
  }
  const f = (x) => evalAst(L, x) - evalAst(R, x);
  const vals = PROBES.map(f).filter(Number.isFinite);
  if (vals.length >= 3 && vals.every((v) => close(v, 0))) {
    return { ok: false, msg: 'המשוואה נכונה לכל [[x]], ולכן אי אפשר למצוא ממנה את [[x]]. בדקו שהשתמשתם בנתונים מהסיפור.' };
  }
  if (xs.some((c) => { const v = f(c); return Number.isFinite(v) && close(v, 0); })) {
    return { ok: true, msg: 'המשוואה מתאימה לסיפור. עכשיו פתרו אותה כאן, שורה אחרי שורה, וכתבו למטה את התשובה הסופית.' };
  }
  return { ok: false, msg: 'המשוואה עדיין לא מתאימה לסיפור. בדקו מה מסמן [[x]], ושכל נתון מהסיפור נמצא במקום הנכון.' };
}

/* ── solving the equation the student wrote (board #93, Sulaiman 2026-11-25: "let them also solve the
   equation once they write it correctly"). Every line must stay equivalent to that equation: linear
   with the same root. The solving ends at "x = a number". ── */

/** f(x) = L − R as a·x + b, or null when it is not linear (or not finite) */
export function linearOf(L, R) {
  const f = (x) => evalAst(L, x) - evalAst(R, x);
  const b = f(0), a = f(1) - b;
  if (![a, b].every(Number.isFinite)) return null;
  if (!PROBES.every((x) => { const v = f(x); return Number.isFinite(v) && close(v, a * x + b); })) return null;
  return { a, b };
}

/** The root of the student's accepted equation, or null when it cannot be solved step by step */
export function rootOf(src) {
  const r = parseEquation(src);
  if (!r.ok) return null;
  const lin = linearOf(r.L, r.R);
  if (!lin || close(lin.a, 0)) return null;
  const x = -lin.b / lin.a;
  return Number.isFinite(x) ? x : null;
}

const plainNum = (n) => n.t === 'n' || (n.t === 'neg' && n.a.t === 'n') || (n.t === 'grp' && plainNum(n.a));
const fmt = (x) => String(Math.round(x * 1e6) / 1e6);

/** One solving line → { ok, done?, format?, msg } */
export function checkSolveStep(src, root) {
  const r = parseEquation(src);
  if (!r.ok) return { ok: false, format: true, msg: r.msg };
  const { L, R } = r;
  if (!hasX(L) && !hasX(R)) return { ok: false, format: true, msg: 'בכל שורה של הפתרון נשאר הנעלם [[x]], עד שמגיעים ל-[[x = …]]' };
  const lin = linearOf(L, R);
  if (!lin) return { ok: false, msg: 'השורה הזאת כבר לא משוואה כמו שלכם. בדקו את הפעולה שעשיתם.' };
  if (close(lin.a, 0)) return { ok: false, msg: 'ה-[[x]] נעלם מהמשוואה. בדקו את הפעולה שעשיתם בשני האגפים.' };
  if (!close(-lin.b / lin.a, root)) return { ok: false, msg: 'השורה הזאת לא שקולה לשורה הקודמת. בדקו שעשיתם את אותה פעולה בשני האגפים, ואת החשבון.' };
  if ((bareX(L) && plainNum(R)) || (bareX(R) && plainNum(L))) {
    return { ok: true, done: true, msg: `פתרתם את המשוואה: [[x = ${fmt(root)}]]. עכשיו בדקו מה מסמן [[x]] בסיפור, וכתבו למטה את התשובה הסופית.` };
  }
  return { ok: true, msg: 'נכון. כתבו את השורה הבאה.' };
}

/** One row of the motion table: [speed, time, distance] as typed.
    → { state: 'empty' | 'part' | 'ok' | 'bad' | 'format', msg? } */
export function checkTableRow(cells) {
  const filled = cells.map((c) => clean(c) !== '');
  if (!filled.some(Boolean)) return { state: 'empty' };
  if (!filled.every(Boolean)) return { state: 'part' };
  const asts = [];
  for (const c of cells) {
    const p = parse(clean(c));
    if (!p.ok) return { state: 'format', msg: SIDE_ERR[p.err] || SIDE_ERR.syntax };
    asts.push(p.ast);
  }
  const [v, t, d] = asts;
  return sameValue(d, { t: '*', a: v, b: t }) ? { state: 'ok' } : { state: 'bad' };
}

/** The whole table → { ok, msg, rows: [state…] } */
export function checkTable(rows, names) {
  const res = rows.map(checkTableRow);
  const fmt = res.find((r) => r.state === 'format');
  if (fmt) return { ok: false, format: true, msg: fmt.msg, rows: res.map((r) => r.state) };
  const states = res.map((r) => r.state);
  if (states.every((s) => s === 'empty')) return { ok: false, format: true, msg: 'מלאו בטבלה את המהירות, הזמן והדרך', rows: states };
  const bad = states.findIndex((s) => s === 'bad');
  if (bad >= 0) return { ok: false, msg: `בשורה של ${names[bad]}: הדרך צריכה להיות מהירות · זמן.`, rows: states };
  const part = states.findIndex((s) => s !== 'ok');
  if (part >= 0) return { ok: false, format: true, msg: `השלימו את השורה של ${names[part]}`, rows: states };
  return { ok: true, msg: 'הטבלה נכונה: בכל שורה דרך = מהירות · זמן. עכשיו כתבו משוואה לפי עמודת הדרך.', rows: states };
}

/* the AST back as a string for the page's math renderer (./rich.jsx): fractions stacked */
export function toM(n) {
  switch (n.t) {
    case 'n': return String(n.v);
    case 'x': return 'x';
    case 'grp': return `(${toM(n.a)})`;
    case 'neg': return `-${toM(n.a)}`;
    case '+': return `${toM(n.a)} + ${toM(n.b)}`;
    case '-': return `${toM(n.a)} - ${toM(n.b)}`;
    case '*': return n.imp ? `${toM(n.a)}${toM(n.b)}` : `${toM(n.a)} * ${toM(n.b)}`;
    case '/': return `{${toM(n.a.t === 'grp' ? n.a.a : n.a)}|${toM(n.b.t === 'grp' ? n.b.a : n.b)}}`;
  }
  return '';
}
