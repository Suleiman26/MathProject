/* צלעות וזוויות במשולש (כיתות ח׳–ט׳) — board #84 */
import { anglesOf, triFromSides, triFromAngles, dist, deg } from './geo.js';

const SETS = [['A', 'B', 'C'], ['D', 'E', 'F'], ['K', 'L', 'M'], ['P', 'Q', 'R']];
const ang = (s) => `∠${s}`;
/* the definition, checked on all three pairs */
const isTriangle = (a, b, c) => a + b > c && a + c > b && b + c > a;
const cm = (v) => `[[${v}]] ס״מ`;
const three = (t) => `${cm(t[0])}, ${cm(t[1])} ו-${cm(t[2])}`;

/* three lengths: `kind` = 'yes' | 'equal' (two add up exactly to the third) | 'short' */
function lengths(R, kind) {
  for (;;) {
    const a = R.int(2, 12), b = R.int(2, 12);
    const c = kind === 'equal' ? a + b : kind === 'short' ? a + b + R.int(1, 4) : R.int(Math.abs(a - b) + 1, a + b - 1);
    if (c > 20 || c < 2) continue;
    if (kind === 'yes' && (a === b && b === c)) continue;
    return R.shuffle([a, b, c]);
  }
}

/* 1. can these three lengths make a triangle? */
const canMake = {
  id: 'can-make',
  make(R) {
    const kind = R.pick(['yes', 'yes', 'yes', 'short', 'short', 'equal']);
    const t = lengths(R, kind), [s, m, l] = [...t].sort((x, y) => x - y), yes = kind === 'yes';
    return {
      tag: 'אי-שוויון המשולש',
      text: `האם אפשר לבנות משולש שאורכי צלעותיו ${three(t)}?`,
      choices: { options: ['כן, אפשר', 'לא, אי אפשר'], correct: yes ? 0 : 1 },
      hint: 'חברו את שתי הצלעות הקצרות והשוו לצלע הארוכה. הסכום חייב להיות גדול ממנה.',
      steps: [
        `שתי הצלעות הקצרות: [[${s} + ${m} = ${s + m}]]. הצלע הארוכה: [[${l}]].`,
        yes ? `[[${s + m} > ${l}]], ולכן אפשר לבנות משולש.`
          : kind === 'equal' ? `[[${s + m} = ${l}]]: הסכום לא גדול מהצלע הארוכה. שתי הצלעות הקצרות "נשכבות" בדיוק על הארוכה, ולא נוצר משולש.`
            : `[[${s + m} < ${l}]]: שתי הצלעות הקצרות לא מגיעות זו לזו, ולכן אי אפשר לבנות משולש.`,
      ],
      data: { t },
    };
  },
  verify(q) {
    const [a, b, c] = q.data.t;
    return (q.choices.correct === 0) === isTriangle(a, b, c) ? true : 'wrong yes / no';
  },
};

/* 2. which of four triples can be a triangle? */
const whichTriple = {
  id: 'which-triple',
  make(R) {
    let all, key;
    do {
      all = R.shuffle([lengths(R, 'yes'), lengths(R, 'equal'), lengths(R, 'short'), lengths(R, R.pick(['short', 'equal']))]);
      key = all.map((t) => [...t].sort((x, y) => x - y).join());
    } while (new Set(key).size < 4);
    const good = all.findIndex((t) => isTriangle(...t)), g = [...all[good]].sort((x, y) => x - y);
    return {
      tag: 'אי-שוויון המשולש',
      text: 'רק מאחת מהשלשות הבאות אפשר לבנות משולש (האורכים בס״מ). מאיזו?',
      choices: { options: all.map((t) => `[[${t.join(', ')}]]`), correct: good },
      hint: 'בכל שלשה חברו את שני המספרים הקטנים. משולש נוצר רק אם הסכום גדול מהמספר הגדול.',
      steps: [
        ...all.map((t) => { const [s, m, l] = [...t].sort((x, y) => x - y); return `[[${t.join(', ')}]]: [[${s} + ${m} = ${s + m}]], וזה ${s + m > l ? 'גדול מ' : s + m === l ? 'שווה ל' : 'קטן מ'}-[[${l}]]${s + m > l ? ': אפשר.' : ': אי אפשר.'}`; }),
        `התשובה: [[${g.join(', ')}]].`,
      ],
      data: { all },
    };
  },
  verify(q) {
    const ok = q.data.all.map((t) => isTriangle(...t));
    return ok.filter(Boolean).length === 1 && ok[q.choices.correct] && q.choices.options[q.choices.correct] === `[[${q.data.all[q.choices.correct].join(', ')}]]` ? true : 'not exactly one triangle';
  },
};

/* 3. the smallest and the largest whole third side */
const thirdRange = {
  id: 'third-range',
  make(R) {
    let a, b;
    do { a = R.int(3, 14); b = R.int(3, 14); } while (Math.abs(a - b) < 2);
    const lo = Math.abs(a - b) + 1, hi = a + b - 1, big = Math.max(a, b), small = Math.min(a, b);
    return {
      tag: 'הצלע השלישית',
      text: `במשולש שתי צלעות שאורכן ${cm(a)} ו-${cm(b)}. אורך הצלע השלישית הוא מספר שלם של ס״מ. מה האורך הקטן ביותר האפשרי שלה, ומה האורך הגדול ביותר האפשרי?`,
      rows: [
        { label: 'האורך הקטן ביותר:', parts: [{ ans: lo }, { t: 'ס״מ' }] },
        { label: 'האורך הגדול ביותר:', parts: [{ ans: hi }, { t: 'ס״מ' }] },
      ],
      hint: 'הצלע השלישית גדולה מההפרש בין שתי הצלעות וקטנה מהסכום שלהן. שימו לב: ההפרש והסכום עצמם אינם אפשריים.',
      steps: [
        `הצלע השלישית קטנה מהסכום: [[${a} + ${b} = ${a + b}]], ולכן האורך השלם הגדול ביותר הוא [[${hi}]] ס״מ.`,
        `הצלע השלישית גדולה מההפרש: [[${big} - ${small} = ${big - small}]], ולכן האורך השלם הקטן ביותר הוא [[${lo}]] ס״מ.`,
        `בדיקה: [[${small} + ${lo} = ${small + lo} > ${big}]].`,
      ],
      data: { a, b },
    };
  },
  verify(q) {
    const { a, b } = q.data, ok = [];
    for (let c = 1; c <= 200; c++) if (isTriangle(a, b, c)) ok.push(c);          // every whole length, one by one
    return q.rows[0].parts[0].ans === ok[0] && q.rows[1].parts[0].ans === ok[ok.length - 1] ? true : `range is ${ok[0]}..${ok[ok.length - 1]}`;
  },
};

/* a scalene triangle with whole sides that draws well: [a, b, c], side i opposite vertex i */
function scalene(R) {
  for (;;) {
    const s = [R.int(4, 15), R.int(4, 15), R.int(4, 15)];
    if (new Set(s).size < 3 || !isTriangle(...s)) continue;
    const an = anglesOf(triFromSides(s));
    if (Math.min(...an) < 30 || Math.max(...an) > 105) continue;
    const so = [...an].sort((x, y) => x - y);
    if (so[1] - so[0] < 6 || so[2] - so[1] < 6) continue;
    return s;
  }
}
const sideName = (n, i) => [n[(i + 1) % 3], n[(i + 2) % 3]].sort().join('');

/* 4. the largest / smallest angle from the sides */
const largestAngle = {
  id: 'largest-angle',
  make(R) {
    const n = R.pick(SETS), s = scalene(R), wantBig = R.bool();
    const target = wantBig ? Math.max(...s) : Math.min(...s), i = s.indexOf(target);
    return {
      tag: 'הזווית שמול הצלע',
      text: `במשולש [[${n.join('')}]] נתון: [[${sideName(n, 0)} = ${s[0]}]] ס״מ, [[${sideName(n, 1)} = ${s[1]}]] ס״מ, [[${sideName(n, 2)} = ${s[2]}]] ס״מ. איזו זווית היא ${wantBig ? 'הגדולה' : 'הקטנה'} ביותר במשולש?`,
      fig: { type: 'tri', sides: s, names: n, sideLabels: s.map(String), alt: 'משולש עם אורכי הצלעות' },
      choices: { options: n.map((v) => `[[${ang(v)}]]`), correct: i },
      hint: `במשולש, מול הצלע הגדולה נמצאת הזווית הגדולה, ומול הצלע הקטנה נמצאת הזווית הקטנה. הזווית שמול צלע היא הזווית בקודקוד שאינו על הצלע.`,
      steps: [
        `הצלע ${wantBig ? 'הגדולה' : 'הקטנה'} ביותר היא [[${sideName(n, i)} = ${target}]] ס״מ.`,
        `הקודקוד שאינו על הצלע [[${sideName(n, i)}]] הוא [[${n[i]}]], ולכן הזווית שמולה היא [[${ang(n[i])}]].`,
        `מול הצלע ${wantBig ? 'הגדולה' : 'הקטנה'} נמצאת הזווית ${wantBig ? 'הגדולה' : 'הקטנה'}: התשובה [[${ang(n[i])}]].`,
      ],
      data: { s, wantBig, n },
    };
  },
  verify(q) {
    const { s, wantBig, n } = q.data, an = anglesOf(triFromSides(s));            // the real angles, from coordinates
    const best = an.indexOf(wantBig ? Math.max(...an) : Math.min(...an));
    return q.choices.correct === best && q.choices.options[best] === `[[${ang(n[best])}]]` ? true : `angles ${an.map((v) => v.toFixed(1))}`;
  },
};

/* 5. order the sides from the angles */
const orderSides = {
  id: 'order-sides',
  make(R) {
    const n = R.pick(SETS);
    let a;
    do { a = [R.int(30, 100), R.int(30, 100)]; a.push(180 - a[0] - a[1]); } while (a[2] < 30 || a[2] > 100 || Math.abs(a[0] - a[1]) < 7 || Math.abs(a[0] - a[2]) < 7 || Math.abs(a[1] - a[2]) < 7);
    const hide = R.int(0, 2), shown = [0, 1, 2].filter((i) => i !== hide);
    const order = [0, 1, 2].sort((i, j) => a[i] - a[j]);                           // by angle, small → large
    const str = (o) => `[[${o.map((i) => sideName(n, i)).join(' < ')}]]`;
    const right = str(order);
    const others = R.shuffle([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(str).filter((o) => o !== right && o !== str([...order].reverse()))).slice(0, 2);
    const options = R.shuffle([right, str([...order].reverse()), ...others]);
    return {
      tag: 'סידור צלעות לפי זוויות',
      text: `במשולש [[${n.join('')}]] נתון: [[${ang(n[shown[0]])} = ${deg(a[shown[0]])}]], [[${ang(n[shown[1]])} = ${deg(a[shown[1]])}]]. סדרו את צלעות המשולש מהקצרה לארוכה.`,
      fig: { type: 'tri', angles: a, names: n, angleLabels: a.map((v, i) => (i === hide ? null : deg(v))), alt: 'משולש עם שתי זוויות נתונות' },
      choices: { options, correct: options.indexOf(right) },
      hint: 'קודם מצאו את הזווית השלישית. אחר כך: מול הזווית הקטנה נמצאת הצלע הקצרה, ומול הזווית הגדולה נמצאת הצלע הארוכה.',
      steps: [
        `הזווית השלישית: [[${ang(n[hide])} = 180° - ${deg(a[shown[0]])} - ${deg(a[shown[1]])} = ${deg(a[hide])}]].`,
        `הזוויות מהקטנה לגדולה: ${order.map((k) => `[[${ang(n[k])} = ${deg(a[k])}]]`).join(', ')}.`,
        `מול כל זווית נמצאת הצלע שאינה עוברת בקודקוד שלה: מול [[${ang(n[order[0]])}]] הצלע [[${sideName(n, order[0])}]], מול [[${ang(n[order[1]])}]] הצלע [[${sideName(n, order[1])}]], מול [[${ang(n[order[2]])}]] הצלע [[${sideName(n, order[2])}]].`,
        `לכן: ${right}.`,
      ],
      data: { a, n },
    };
  },
  verify(q) {
    const { a, n } = q.data;
    if (a[0] + a[1] + a[2] !== 180) return 'angles do not add up to 180';
    const P = triFromAngles(a), len = [0, 1, 2].map((i) => dist(P[(i + 1) % 3], P[(i + 2) % 3]));      // real side lengths
    const order = [0, 1, 2].sort((i, j) => len[i] - len[j]);
    const want = `[[${order.map((i) => sideName(n, i)).join(' < ')}]]`;
    return q.choices.options[q.choices.correct] === want && q.choices.options.filter((o) => o === want).length === 1 ? true : `order should be ${want}`;
  },
};

export default {
  id: 'triangle-sides',
  name: 'צלעות וזוויות במשולש',
  grade: 'ח׳–ט׳',
  about: 'מתי שלושה קטעים יוצרים משולש, ואיך אורכי הצלעות קשורים לגודל הזוויות שמולן',
  place: 'הנושא "משולשים" ← פרק חדש אחרי "2. סוגי משולשים" ולפני "3. משולשים מיוחדים"',
  lesson: [
    { t: 'אי-שוויון המשולש', items: [
      'לא מכל שלושה קטעים אפשר לבנות משולש. במשולש, הסכום של כל שתי צלעות גדול מהצלע השלישית.',
      'בדיקה מהירה: מחברים את שתי הצלעות הקצרות. אם הסכום גדול מהצלע הארוכה, אפשר לבנות משולש.',
      { list: ['[[4, 6, 8]]: [[4 + 6 = 10 > 8]], אפשר.', '[[3, 4, 9]]: [[3 + 4 = 7 < 9]], אי אפשר.', '[[3, 5, 8]]: [[3 + 5 = 8]], אי אפשר (הסכום שווה ולא גדול).'] },
    ] },
    { t: 'הצלע השלישית', items: [
      'כשידועות שתי צלעות, הצלע השלישית גדולה מההפרש שלהן וקטנה מהסכום שלהן.',
      { ex: 'במשולש צלעות שאורכן [[5]] ס״מ ו-[[9]] ס״מ. אילו אורכים שלמים אפשריים לצלע השלישית?', sol: ['הסכום: [[5 + 9 = 14]]. הצלע השלישית קטנה מ-[[14]].', 'ההפרש: [[9 - 5 = 4]]. הצלע השלישית גדולה מ-[[4]].', 'האורכים השלמים האפשריים: מ-[[5]] ס״מ עד [[13]] ס״מ.'] },
      { note: 'טעות נפוצה: לכלול את הסכום או את ההפרש עצמם. כאן [[4]] ו-[[14]] אינם אפשריים.' },
    ] },
    { t: 'צלעות וזוויות', items: [
      'במשולש, מול הצלע הגדולה נמצאת הזווית הגדולה, ומול הצלע הקטנה נמצאת הזווית הקטנה. וגם להפך: מול הזווית הגדולה נמצאת הצלע הגדולה.',
      { fig: { type: 'tri', sides: [9, 7, 5], names: ['A', 'B', 'C'], sideLabels: ['9', '7', '5'], caption: 'הצלע [[BC]] היא הגדולה, ולכן [[∠A]] שמולה היא הזווית הגדולה' } },
      'הזווית שמול צלע היא הזווית בקודקוד השלישי, זה שאינו על הצלע. מול הצלע [[BC]] נמצאת [[∠A]].',
      { ex: 'במשולש [[ABC]] נתון [[∠A = 70°]], [[∠B = 50°]]. איזו צלע היא הארוכה ביותר?', sol: ['[[∠C = 180° - 70° - 50° = 60°]]', 'הזווית הגדולה ביותר היא [[∠A = 70°]].', 'מול [[∠A]] נמצאת הצלע [[BC]], ולכן [[BC]] היא הצלע הארוכה ביותר.'] },
    ] },
  ],
  gens: [canMake, whichTriple, thirdRange, largestAngle, orderSides],
};
