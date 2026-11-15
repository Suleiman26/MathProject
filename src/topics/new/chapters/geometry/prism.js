/* מנסרה משולשת (כיתה ז׳) — board #84 */
import { num } from '../../core.js';
import { area, dist } from './geo.js';

/* right-triangle bases with whole sides: [leg, leg, hypotenuse] */
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]];
function dims(R) {
  let [a, b, c] = R.pick(TRIPLES);
  if (R.bool()) [a, b] = [b, a];
  const big = Math.max(a, b);
  let h;
  do { h = R.int(Math.max(3, Math.ceil(big * 0.5)), Math.max(10, Math.min(20, Math.round(big * 1.4)))); } while (h === a || h === b || h === c);
  return { a, b, c, h };
}
const fig = ({ a, b, c, h }, show = 'abch') => ({
  type: 'prism', a, b, h,
  labels: { a: show.includes('a') ? String(a) : null, b: show.includes('b') ? String(b) : null, c: show.includes('c') ? String(c) : null, h: show.includes('h') ? String(h) : null },
});
const given = ({ a, b, c, h }, withC) => `הבסיס של מנסרה משולשת ישרה הוא משולש ישר זווית שניצביו [[${a}]] ס״מ ו-[[${b}]] ס״מ${withC ? ` והיתר שלו [[${c}]] ס״מ` : ''}. גובה המנסרה [[${h}]] ס״מ.`;

/* the solid itself, in coordinates: bottom triangle at z = 0, top triangle at z = h */
function solid({ a, b, h }) {
  const base = [[0, 0], [a, 0], [0, b]];
  const rects = base.map((p, i) => dist(p, base[(i + 1) % 3]) * h);       // the three side faces
  return { baseArea: area(base), rects, volume: area(base) * h };
}
const near = (x, y) => Math.abs(x - y) < 1e-9;

/* 1. base area and volume */
const volume = {
  id: 'volume',
  make(R) {
    const d = dims(R), S = d.a * d.b / 2, V = S * d.h;
    return {
      tag: 'נפח מנסרה משולשת',
      text: `${given(d, false)} חשבו את שטח הבסיס ואת נפח המנסרה.`,
      fig: fig(d, 'abh'),
      rows: [
        { label: 'שטח הבסיס:', parts: [{ ans: S }, { t: 'סמ״ר' }] },
        { label: 'נפח המנסרה:', parts: [{ ans: V }, { t: 'סמ״ק' }] },
      ],
      hint: 'שטח משולש ישר זווית הוא מכפלת הניצבים חלקי 2. הנפח הוא שטח הבסיס כפול גובה המנסרה.',
      steps: [
        `שטח הבסיס (משולש ישר זווית): [[{${d.a} * ${d.b}|2} = ${num(S)}]] סמ״ר.`,
        `נפח = שטח הבסיס כפול הגובה: [[${num(S)} * ${d.h} = ${num(V)}]] סמ״ק.`,
      ],
      data: d,
    };
  },
  verify(q) {
    const s = solid(q.data);
    return near(q.rows[0].parts[0].ans, s.baseArea) && near(q.rows[1].parts[0].ans, s.volume) ? true : 'base area / volume differ';
  },
};

/* 2. surface area: two triangles + three rectangles */
const surface = {
  id: 'surface',
  make(R) {
    const d = dims(R), { a, b, c, h } = d, S2 = a * b, L = (a + b + c) * h, T = S2 + L;
    return {
      tag: 'שטח פנים של מנסרה משולשת',
      text: `${given(d, true)} חשבו את שטח הפנים של המנסרה.`,
      fig: fig(d),
      rows: [
        { label: 'שטח שני הבסיסים יחד:', parts: [{ ans: S2 }, { t: 'סמ״ר' }] },
        { label: 'שטח המעטפת (שלושת המלבנים):', parts: [{ ans: L }, { t: 'סמ״ר' }] },
        { label: 'שטח הפנים:', parts: [{ ans: T }, { t: 'סמ״ר' }] },
      ],
      hint: 'למנסרה משולשת 5 פאות: שני משולשים חופפים ושלושה מלבנים. אורך כל מלבן הוא צלע של הבסיס, והרוחב שלו הוא גובה המנסרה.',
      steps: [
        `שני הבסיסים: [[2 * {${a} * ${b}|2} = ${S2}]] סמ״ר.`,
        `שלושת המלבנים: [[${a} * ${h} + ${b} * ${h} + ${c} * ${h} = ${a * h} + ${b * h} + ${c * h} = ${L}]] סמ״ר.`,
        `שטח הפנים: [[${S2} + ${L} = ${T}]] סמ״ר.`,
      ],
      data: d,
    };
  },
  verify(q) {
    const s = solid(q.data), d = q.data;
    if (!near(Math.hypot(d.a, d.b), d.c)) return 'the hypotenuse does not fit the legs';
    const two = 2 * s.baseArea, lat = s.rects[0] + s.rects[1] + s.rects[2];
    const got = q.rows.map((r) => r.parts[0].ans);
    return near(got[0], two) && near(got[1], lat) && near(got[2], two + lat) ? true : 'surface differs';
  },
};

/* 3. faces, edges, vertices */
const FORMS = [
  { ask: 'כמה פאות, כמה מקצועות וכמה קודקודים יש למנסרה משולשת?', rows: [['פאות:', 'faces'], ['מקצועות:', 'edges'], ['קודקודים:', 'verts']],
    steps: ['פאות: 2 בסיסים משולשים ו-3 מלבנים, יחד [[5]].', 'מקצועות: 3 בכל בסיס ועוד 3 שמחברים בין הבסיסים, יחד [[9]].', 'קודקודים: 3 בכל בסיס, יחד [[6]].'] },
  { ask: 'כמה מהפאות של מנסרה משולשת הן משולשים, וכמה הן מלבנים?', rows: [['פאות משולשות:', 'tri'], ['פאות מלבניות:', 'rect']],
    steps: ['שני הבסיסים הם משולשים חופפים: [[2]] פאות משולשות.', 'מכל צלע של הבסיס עולה מלבן אחד, ולמשולש 3 צלעות: [[3]] פאות מלבניות.'] },
  { ask: 'כמה מקצועות יש בשני הבסיסים של מנסרה משולשת יחד, וכמה מקצועות מחברים בין הבסיסים?', rows: [['מקצועות בשני הבסיסים:', 'baseEdges'], ['מקצועות בין הבסיסים:', 'sideEdges']],
    steps: ['בכל בסיס 3 מקצועות (צלעות המשולש), ובשני הבסיסים: [[2 * 3 = 6]].', 'מכל קודקוד של הבסיס התחתון עולה מקצוע אחד אל הבסיס העליון: [[3]] מקצועות.'] },
  { ask: 'כמה קודקודים וכמה מקצועות יש למנסרה משולשת? וכמה מקצועות נפגשים בכל קודקוד?', rows: [['קודקודים:', 'verts'], ['מקצועות:', 'edges'], ['מקצועות בכל קודקוד:', 'perVertex']],
    steps: ['קודקודים: 3 בכל בסיס, יחד [[6]].', 'מקצועות: 3 בכל בסיס ועוד 3 בין הבסיסים, יחד [[9]].', 'בכל קודקוד נפגשים 2 מקצועות של הבסיס ומקצוע אחד שעולה לבסיס השני: [[3]].'] },
];
/* count on the solid itself: vertices 0,1,2 (bottom) and 3,4,5 (top) */
function counts() {
  const edges = new Set(), key = (i, j) => (i < j ? `${i}-${j}` : `${j}-${i}`);
  const faces = [[0, 1, 2], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]];
  faces.forEach((f) => f.forEach((v, i) => edges.add(key(v, f[(i + 1) % f.length]))));
  const list = [...edges].map((e) => e.split('-').map(Number));
  const level = (v) => (v < 3 ? 0 : 1);
  return {
    faces: faces.length, verts: new Set(faces.flat()).size, edges: list.length,
    tri: faces.filter((f) => f.length === 3).length, rect: faces.filter((f) => f.length === 4).length,
    baseEdges: list.filter(([i, j]) => level(i) === level(j)).length, sideEdges: list.filter(([i, j]) => level(i) !== level(j)).length,
    perVertex: list.filter((e) => e.includes(0)).length,
  };
}
const ANSWER = { faces: 5, edges: 9, verts: 6, tri: 2, rect: 3, baseEdges: 6, sideEdges: 3, perVertex: 3 };
const count = {
  id: 'count',
  make(R) {
    const d = dims(R), form = R.int(0, FORMS.length - 1), f = FORMS[form];
    return {
      tag: 'פאות, מקצועות וקודקודים',
      text: `${f.ask} היעזרו בציור.`,
      fig: fig(d, ''),
      rows: f.rows.map(([label, k]) => ({ label, parts: [{ ans: ANSWER[k] }] })),
      hint: 'ספרו בנפרד את מה שיש בבסיס התחתון, את מה שיש בבסיס העליון ואת מה שמחבר ביניהם. בציור, הקו המקווקו הוא מקצוע שמוסתר מאחור.',
      steps: f.steps,
      data: { form },
    };
  },
  verify(q) {
    const c = counts(), f = FORMS[q.data.form];
    if (c.verts - c.edges + c.faces !== 2) return 'Euler fails';
    return f.rows.every(([, k], i) => q.rows[i].parts[0].ans === c[k]) ? true : 'count differs';
  },
};

/* 4. the height from the volume */
const height = {
  id: 'height-from-volume',
  make(R) {
    const d = dims(R), S = d.a * d.b / 2, V = S * d.h;
    return {
      tag: 'מציאת גובה המנסרה',
      text: `הבסיס של מנסרה משולשת הוא משולש ישר זווית שניצביו [[${d.a}]] ס״מ ו-[[${d.b}]] ס״מ. נפח המנסרה [[${V}]] סמ״ק. מצאו את שטח הבסיס ואת גובה המנסרה.`,
      fig: { ...fig(d, 'ab'), labels: { a: String(d.a), b: String(d.b), c: null, h: '?' } },
      rows: [
        { label: 'שטח הבסיס:', parts: [{ ans: S }, { t: 'סמ״ר' }] },
        { label: 'גובה המנסרה:', parts: [{ ans: d.h }, { t: 'ס״מ' }] },
      ],
      hint: 'נפח = שטח הבסיס כפול הגובה. לכן הגובה הוא הנפח חלקי שטח הבסיס.',
      steps: [
        `שטח הבסיס: [[{${d.a} * ${d.b}|2} = ${S}]] סמ״ר.`,
        `נפח = שטח הבסיס כפול הגובה, ולכן הגובה: [[${V} : ${S} = ${d.h}]] ס״מ.`,
        `בדיקה: [[${S} * ${d.h} = ${V}]] סמ״ק.`,
      ],
      data: { ...d, V },
    };
  },
  verify(q) {
    const { a, b, V } = q.data, base = area([[0, 0], [a, 0], [0, b]]);
    const S = q.rows[0].parts[0].ans, h = q.rows[1].parts[0].ans;
    return near(S, base) && near(base * h, V) && Number.isInteger(h) ? true : 'height does not give the volume';
  },
};

export default {
  id: 'prism',
  name: 'מנסרה משולשת',
  grade: 'ז׳',
  about: 'מכירים את המנסרה המשולשת ומחשבים את הנפח ואת שטח הפנים שלה',
  place: 'הנושא "גופים" ← פרק חדש אחרי "2. תיבה" ולפני "3. גליל"',
  lesson: [
    { t: 'מהי מנסרה משולשת?', items: [
      'מנסרה משולשת ישרה היא גוף שיש לו שני בסיסים שהם משולשים חופפים ומקבילים, ושלוש פאות צדדיות שהן מלבנים. שלושת המלבנים יחד נקראים המעטפת.',
      { fig: { type: 'prism', a: 6, b: 8, h: 12, labels: { a: '6', b: '8', c: '10', h: '12' }, caption: 'מנסרה שהבסיס שלה משולש ישר זווית (המידות בס״מ)' } },
      { list: ['[[5]] פאות: 2 משולשים ו-3 מלבנים.', '[[9]] מקצועות: 3 בכל בסיס ו-3 בין הבסיסים.', '[[6]] קודקודים: 3 בכל בסיס.'] },
      'גובה המנסרה הוא המרחק בין שני הבסיסים. במנסרה ישרה זה אורך המקצוע שמחבר בין הבסיסים.',
    ] },
    { t: 'נפח', items: [
      'נפח של מנסרה שווה לשטח הבסיס כפול גובה המנסרה.',
      'כשהבסיס הוא משולש ישר זווית, שטח הבסיס הוא מכפלת הניצבים חלקי 2.',
      { ex: 'בסיס המנסרה הוא משולש ישר זווית שניצביו [[6]] ס״מ ו-[[8]] ס״מ, וגובה המנסרה [[12]] ס״מ. מה הנפח?', sol: ['שטח הבסיס: [[{6 * 8|2} = 24]] סמ״ר.', 'נפח: [[24 * 12 = 288]] סמ״ק.'] },
      { note: 'טעות נפוצה: לשכוח לחלק ב-2 בשטח הבסיס. [[6 * 8 * 12]] הוא נפח של תיבה, והמנסרה המשולשת היא בדיוק חצי ממנה.' },
    ] },
    { t: 'שטח פנים', items: [
      'שטח הפנים הוא סכום השטחים של כל חמש הפאות: שני הבסיסים ושלושת המלבנים של המעטפת.',
      'לכל מלבן צלע אחת שהיא צלע של הבסיס, וצלע שנייה שהיא גובה המנסרה.',
      { ex: 'באותה מנסרה היתר של הבסיס הוא [[10]] ס״מ. מה שטח הפנים?', sol: ['שני הבסיסים: [[2 * 24 = 48]] סמ״ר.', 'שלושת המלבנים: [[6 * 12 + 8 * 12 + 10 * 12 = 288]] סמ״ר.', 'שטח הפנים: [[48 + 288 = 336]] סמ״ר.'] },
    ] },
  ],
  gens: [volume, surface, count, height],
};
