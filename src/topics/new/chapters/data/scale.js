/* קנה מידה (כיתה ח׳) — board #84 */
import { num, round } from '../../core.js';
import { th } from './util.js';

const MAPS = [25000, 50000, 100000, 200000, 500000];
const PLACES = ['בין שני יישובים', 'בין שתי ערים', 'בין שני כפרים', 'בין תחנת הרכבת לחוף הים', 'בין שני מעיינות'];
const oneDecimal = (v) => Math.abs(v - round(v, 1)) < 1e-9;
const close = (a, b) => Math.abs(a - b) < 1e-6;
const sc = (S) => `1:${th(S)}`;

/* map (cm) → reality (km) */
const mapToReal = {
  id: 'map-to-real',
  make(R) {
    const S = R.pick(MAPS), pl = R.pick(PLACES);
    let d, km;
    do { d = R.int(2, 24) / 2; km = (d * S) / 100000; } while (!oneDecimal(km) || km > 60);
    km = round(km, 1);
    return {
      tag: 'מהמפה למציאות',
      text: `במפה בקנה מידה [[${sc(S)}]], המרחק ${pl} הוא [[${num(d)}]] ס״מ. מה המרחק הזה במציאות?`,
      rows: [{ label: 'המרחק במציאות (בק״מ):', parts: [{ ans: km }] }],
      hint: `כל [[1]] ס״מ במפה הוא [[${th(S)}]] ס״מ במציאות. אחרי הכפל עוברים מס״מ לק״מ: ב-[[1]] ק״מ יש [[100,000]] ס״מ.`,
      steps: [
        `קנה מידה [[${sc(S)}]]: כל [[1]] ס״מ במפה הוא [[${th(S)}]] ס״מ במציאות.`,
        `[[${num(d)} * ${th(S)} = ${th(d * S)}]] ס״מ`,
        `עוברים לק״מ ([[1]] ק״מ = [[100,000]] ס״מ): [[${th(d * S)} : 100,000 = ${num(km)}]] ק״מ`,
      ],
      data: { S, d },
    };
  },
  verify(q) {
    const { S, d } = q.data;
    if (!q.text.includes(`[[${sc(S)}]]`) || !q.text.includes(`[[${num(d)}]] ס״מ`)) return 'numbers are not in the text';
    const metresPerCm = S / 100;                       // another route: through metres
    const km = (d * metresPerCm) / 1000;
    return close(q.rows[0].parts[0].ans, km) ? true : `should be ${km} km`;
  },
};

/* reality (km) → map (cm) */
const realToMap = {
  id: 'real-to-map',
  make(R) {
    const S = R.pick(MAPS), pl = R.pick(PLACES);
    let d, km;
    do { d = R.int(2, 30) / 2; km = (d * S) / 100000; } while (!oneDecimal(km) || km > 60);
    km = round(km, 1);
    const cm = Math.round(km * 100000);
    return {
      tag: 'מהמציאות למפה',
      text: `המרחק ${pl} במציאות הוא [[${num(km)}]] ק״מ. מה יהיה המרחק הזה במפה בקנה מידה [[${sc(S)}]]?`,
      rows: [{ label: 'המרחק במפה (בס״מ):', parts: [{ ans: d }] }],
      hint: `קודם עוברים מק״מ לס״מ (ב-[[1]] ק״מ יש [[100,000]] ס״מ), ואז מחלקים ב-[[${th(S)}]].`,
      steps: [
        `עוברים לס״מ: [[${num(km)} * 100,000 = ${th(cm)}]] ס״מ במציאות`,
        `כל [[${th(S)}]] ס״מ במציאות הם [[1]] ס״מ במפה.`,
        `[[${th(cm)} : ${th(S)} = ${num(d)}]] ס״מ במפה`,
      ],
      data: { S, km },
    };
  },
  verify(q) {
    const { S, km } = q.data, d = q.rows[0].parts[0].ans;
    if (!q.text.includes(`[[${num(km)}]] ק״מ`) || !q.text.includes(`[[${sc(S)}]]`)) return 'numbers are not in the text';
    return d > 0 && close((d * S) / 100 / 1000, km) ? true : 'map distance does not give the real distance';
  },
};

/* a room on a plan → real length, width and area */
const ROOMS = ['חדר שינה', 'סלון', 'מטבח', 'חדר עבודה', 'חדר ילדים'];
const plan = {
  id: 'plan',
  make(R) {
    const S = R.pick([50, 100, 100, 200]), room = R.pick(ROOMS);
    let L, Wd;
    do {
      L = S === 200 ? R.int(3, 10) : R.int(6, 16) / 2;
      Wd = S === 200 ? R.int(2, 8) : R.int(4, 12) / 2;
    } while (L <= Wd || (!Number.isInteger(L) && !Number.isInteger(Wd)));
    const a = (L * 100) / S, b = (Wd * 100) / S, area = round(L * Wd, 2);
    const perCm = S / 100;
    return {
      tag: 'תוכנית דירה',
      text: `בתוכנית דירה בקנה מידה [[${sc(S)}]] משורטט ${room} מלבני. בתוכנית אורכו [[${num(a)}]] ס״מ ורוחבו [[${num(b)}]] ס״מ. מהן המידות של החדר במציאות?`,
      rows: [
        { label: 'האורך במציאות (במטרים):', parts: [{ ans: L }] },
        { label: 'הרוחב במציאות (במטרים):', parts: [{ ans: Wd }] },
        { label: 'שטח החדר במציאות (במ״ר):', parts: [{ ans: area }] },
      ],
      hint: `כל [[1]] ס״מ בתוכנית הוא [[${S}]] ס״מ במציאות, כלומר [[${num(perCm)}]] מטר. את השטח מחשבים מהמידות שבמציאות.`,
      steps: [
        `כל [[1]] ס״מ בתוכנית הוא [[${S}]] ס״מ במציאות, כלומר [[${num(perCm)}]] מטר.`,
        `האורך: [[${num(a)} * ${num(perCm)} = ${num(L)}]] מטר. הרוחב: [[${num(b)} * ${num(perCm)} = ${num(Wd)}]] מטר.`,
        `השטח: [[${num(L)} * ${num(Wd)} = ${num(area)}]] מ״ר`,
      ],
      data: { S, a, b },
    };
  },
  verify(q) {
    const { S, a, b } = q.data, [L, Wd, area] = q.rows.map((r) => r.parts[0].ans);
    if (!q.text.includes(`[[${num(a)}]] ס״מ`) || !q.text.includes(`[[${num(b)}]] ס״מ`)) return 'plan sizes are not in the text';
    if (!close(L * 100, a * S) || !close(Wd * 100, b * S)) return 'a real length is wrong';
    // another route for the area: the plan area in cm², enlarged by S², then cm² → m²
    return close(area, (a * b * S * S) / 10000) ? true : 'area is wrong';
  },
};

/* find the scale from a pair of lengths */
const findScale = {
  id: 'find-scale',
  make(R) {
    const map = R.bool();
    let S, d, real, text, toCm, unit;
    if (map) {
      do { S = R.pick(MAPS); d = R.int(2, 10); real = (d * S) / 100000; } while (!oneDecimal(real));
      real = round(real, 1); toCm = 100000; unit = 'ק״מ';
      text = `במפה, קטע באורך [[${d}]] ס״מ מייצג מרחק של [[${num(real)}]] ק״מ במציאות. מהו קנה המידה של המפה?`;
    } else {
      do { S = R.pick([20, 50, 100, 200, 250, 500]); d = R.int(2, 12); real = (d * S) / 100; } while (!oneDecimal(real));
      real = round(real, 1); toCm = 100; unit = 'מטר';
      text = `בתוכנית של בניין, קטע באורך [[${d}]] ס״מ מייצג אורך של [[${num(real)}]] מטר במציאות. מהו קנה המידה של התוכנית?`;
    }
    const cm = Math.round(real * toCm);
    return {
      tag: 'מציאת קנה המידה',
      text,
      rows: [{ label: 'קנה המידה:', parts: ['1 :', { ans: S, w: 9 }] }],
      hint: 'קנה מידה משווה אורכים באותה יחידה. העבירו את האורך שבמציאות לס״מ, ובדקו כמה ס״מ במציאות מתאימים ל-[[1]] ס״מ בשרטוט.',
      steps: [
        `עוברים לס״מ ([[1]] ${unit} = [[${th(toCm)}]] ס״מ): [[${num(real)} * ${th(toCm)} = ${th(cm)}]] ס״מ`,
        `[[${d}]] ס״מ בשרטוט הם [[${th(cm)}]] ס״מ במציאות, ולכן [[1]] ס״מ בשרטוט הוא [[${th(cm)} : ${d} = ${th(S)}]] ס״מ במציאות.`,
        `קנה המידה: [[${sc(S)}]]`,
      ],
      data: { map, d, real },
    };
  },
  verify(q) {
    const { map, d, real } = q.data, S = q.rows[0].parts[1].ans;
    if (!q.text.includes(`[[${d}]] ס״מ`) || !q.text.includes(`[[${num(real)}]] ${map ? 'ק״מ' : 'מטר'}`)) return 'numbers are not in the text';
    const realCm = map ? real * 1000 * 100 : real * 100;     // km → m → cm
    return Number.isInteger(S) && S > 1 && close(d * S, realCm) ? true : 'scale is wrong';
  },
};

/* models: reduction 1:S and enlargement S:1 */
const BIG = [
  { name: 'מכונית', S: [10, 20, 25], lo: 3.5, hi: 5 },
  { name: 'אוטובוס', S: [20, 40, 50], lo: 10, hi: 13 },
  { name: 'מטוס נוסעים', S: [200, 250], lo: 30, hi: 70 },
  { name: 'מגדל', S: [200, 500], lo: 40, hi: 150, dim: 'גובה' },
  { name: 'ספינה', S: [200, 250, 500], lo: 50, hi: 200 },
];
const SMALL = ['נמלה', 'חיפושית', 'דבורה', 'זבוב'];
const model = {
  id: 'model',
  make(R) {
    if (R.bool(0.6)) {
      let o, S, m, real;
      do { o = R.pick(BIG); S = R.pick(o.S); m = R.int(8, 60); real = (m * S) / 100; } while (!oneDecimal(real) || real < o.lo || real > o.hi);
      real = round(real, 1);
      return {
        tag: 'דגם מוקטן',
        text: `דגם של ${o.name} נבנה בקנה מידה [[1:${S}]]. ${o.dim || 'אורך'} הדגם [[${m}]] ס״מ. מה ה${o.dim || 'אורך'} במציאות?`,
        rows: [{ label: `ה${o.dim || 'אורך'} במציאות (במטרים):`, parts: [{ ans: real }] }],
        hint: `כל [[1]] ס״מ בדגם הוא [[${S}]] ס״מ במציאות. בסוף עוברים מס״מ למטרים: ב-[[1]] מטר יש [[100]] ס״מ.`,
        steps: [
          `כל [[1]] ס״מ בדגם הוא [[${S}]] ס״מ במציאות.`,
          `[[${m} * ${S} = ${th(m * S)}]] ס״מ`,
          `עוברים למטרים: [[${th(m * S)} : 100 = ${num(real)}]] מטר`,
        ],
        data: { big: true, S, m },
      };
    }
    const S = R.pick([4, 5, 20]), name = R.pick(SMALL);
    let mm, cm;
    do { mm = R.int(3, 18); cm = (mm * S) / 10; } while (cm > 30 || !oneDecimal(cm));
    cm = round(cm, 1);
    return {
      tag: 'ציור מוגדל',
      text: `בספר מדע מופיע ציור מוגדל של ${name}, בקנה מידה [[${S}:1]]. אורך ה${name} בציור [[${num(cm)}]] ס״מ. מה האורך במציאות?`,
      rows: [{ label: 'האורך במציאות (במ״מ):', parts: [{ ans: mm }] }],
      hint: `קנה מידה [[${S}:1]] הוא הגדלה: הציור גדול פי [[${S}]] מהמציאות. לכן מחלקים. שימו לב שהתשובה במ״מ: ב-[[1]] ס״מ יש [[10]] מ״מ.`,
      steps: [
        `קנה מידה [[${S}:1]]: כל [[${S}]] ס״מ בציור הם [[1]] ס״מ במציאות (הציור מוגדל).`,
        `עוברים למ״מ: [[${num(cm)} * 10 = ${num(cm * 10)}]] מ״מ בציור`,
        `[[${num(cm * 10)} : ${S} = ${mm}]] מ״מ במציאות`,
      ],
      data: { big: false, S, cm },
    };
  },
  verify(q) {
    const d = q.data, x = q.rows[0].parts[0].ans;
    if (d.big) return x > 0 && close((x * 100) / d.S, d.m) ? true : 'real length does not shrink back to the model';
    return x > 0 && close((x / 10) * d.S, d.cm) ? true : 'real length does not grow to the drawing';
  },
};

export default {
  id: 'scale',
  name: 'קנה מידה',
  grade: 'ח׳',
  about: 'עוברים ממרחק במפה או בתוכנית לאורך במציאות ובחזרה, ומוצאים את קנה המידה',
  place: 'הנושא "יחס ואחוזים" ← פרק חדש אחרי "2. פרופורציה" ולפני "3. המרות"',
  lesson: [
    { t: 'מהו קנה מידה?', items: [
      'קנה מידה הוא היחס בין אורך בשרטוט (מפה, תוכנית, דגם) לבין האורך המתאים במציאות, כששניהם באותה יחידה.',
      'קנה מידה [[1:100]] אומר: כל [[1]] ס״מ בשרטוט הוא [[100]] ס״מ במציאות, כלומר [[1]] מטר.',
      'קנה מידה [[1:50,000]] אומר: כל [[1]] ס״מ במפה הוא [[50,000]] ס״מ במציאות, כלומר חצי ק״מ.',
      { list: ['[[1]] מטר = [[100]] ס״מ', '[[1]] ק״מ = [[1,000]] מטר = [[100,000]] ס״מ', '[[1]] ס״מ = [[10]] מ״מ'] },
    ] },
    { t: 'מהשרטוט למציאות ובחזרה', items: [
      'מהשרטוט למציאות כופלים במספר שבקנה המידה. מהמציאות לשרטוט מחלקים בו. בסוף עוברים ליחידה שמתאימה לשאלה.',
      { ex: 'במפה בקנה מידה [[1:50,000]] המרחק בין שני יישובים הוא [[6]] ס״מ. מה המרחק במציאות?', sol: ['[[6 * 50,000 = 300,000]] ס״מ', 'עוברים לק״מ: [[300,000 : 100,000 = 3]] ק״מ'] },
      { ex: 'אורך חדר במציאות [[4]] מטר. מה אורכו בתוכנית בקנה מידה [[1:100]]?', sol: ['עוברים לס״מ: [[4 * 100 = 400]] ס״מ', '[[400 : 100 = 4]] ס״מ בתוכנית'] },
    ] },
    { t: 'מציאת קנה המידה, והגדלה', items: [
      'כדי למצוא קנה מידה כותבים את שני האורכים באותה יחידה, ובודקים כמה ס״מ במציאות מתאימים ל-[[1]] ס״מ בשרטוט.',
      { ex: 'במפה, [[4]] ס״מ מייצגים [[2]] ק״מ. מהו קנה המידה?', sol: ['[[2]] ק״מ = [[200,000]] ס״מ', '[[200,000 : 4 = 50,000]]', 'קנה המידה: [[1:50,000]]'] },
      'כשהמספר הראשון גדול, למשל [[20:1]], זו הגדלה: השרטוט גדול פי [[20]] מהמציאות (ציור של חרק, למשל).',
      { note: 'טעות נפוצה: לשכוח להמיר יחידות. קנה מידה משווה תמיד אורכים באותה יחידה. שימו לב גם: שטח לא מחשבים מהמידות שבשרטוט, אלא מהמידות שבמציאות.' },
    ] },
  ],
  gens: [mapToReal, realToMap, plan, findScale, model],
};
