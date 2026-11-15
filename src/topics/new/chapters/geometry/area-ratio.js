/* יחס שטחים במשולשים דומים (כיתה ט׳) — board #84 */
import { num } from '../../core.js';
import { area, perimeter, triFromSides, dist } from './geo.js';

const PAIRS = [[['A', 'B', 'C'], ['D', 'E', 'F']], [['K', 'L', 'M'], ['P', 'Q', 'R']], [['D', 'E', 'F'], ['A', 'B', 'C']]];
/* similarity ratios big : small, as p : q */
const RATIOS = [[2, 1], [3, 1], [4, 1], [3, 2], [5, 2], [4, 3], [5, 3], [2, 1], [3, 1]];
/* triangles with whole sides and a whole area: [sides, area] */
const SHAPES = [[[3, 4, 5], 6], [[5, 5, 6], 12], [[5, 5, 8], 12], [[5, 12, 13], 30], [[13, 14, 15], 84], [[10, 13, 13], 60], [[8, 15, 17], 60]];
const tri = (n) => `△${n.join('')}`;
const side = (n, i) => [n[(i + 1) % 3], n[(i + 2) % 3]].sort().join('');
const kStr = (p, q) => (q === 1 ? `${p}` : `{${p}|${q}}`);
const kBox = (p, q) => (q === 1 ? { ans: p } : { frac: [p, q] });
const boxVal = (b) => ('frac' in b ? b.frac[0] / b.frac[1] : b.ans);
const near = (x, y) => Math.abs(x - y) < 1e-6;
const times = (v, p, q) => (q === 1 ? `${num(v)} * ${p}` : `${num(v)} * {${p}|${q}}`);

function setup(R) {
  const [small, big] = R.pick(PAIRS), [p, q] = R.pick(RATIOS);
  return { small, big, p, q, same: `[[${tri(small)} ∼ ${tri(big)}]]` };
}
const labelsAt = (i, text) => [0, 1, 2].map((j) => (j === i ? text : null));
const scaled = (pts, k) => pts.map((v) => [v[0] * k, v[1] * k]);

/* 1. similarity ratio and area ratio from a pair of matching sides */
const fromSides = {
  id: 'ratio-from-sides',
  make(R) {
    const s = setup(R), { p, q } = s, [sh] = R.pick(SHAPES), sides = R.shuffle(sh), i = R.int(0, 2);
    const a = sides[i] * q, b = sides[i] * p;
    return {
      tag: 'יחס דמיון ויחס שטחים',
      text: `נתון: ${s.same}. הצלע [[${side(s.small, i)}]] שאורכה [[${a}]] ס״מ מתאימה לצלע [[${side(s.big, i)}]] שאורכה [[${b}]] ס״מ. מצאו את יחס הדמיון ואת יחס השטחים, מהמשולש הגדול לקטן.`,
      fig: { type: 'simtri', sides, k: p / q, small: { names: s.small, sideLabels: labelsAt(i, String(a)) }, big: { names: s.big, sideLabels: labelsAt(i, String(b)) }, alt: 'שני משולשים דומים' },
      rows: [
        { label: 'יחס הדמיון:', parts: [kBox(p, q)] },
        { label: 'יחס השטחים:', parts: [kBox(p * p, q * q)] },
      ],
      hint: 'יחס הדמיון הוא היחס בין צלעות מתאימות. יחס השטחים שווה לריבוע של יחס הדמיון.',
      steps: [
        `יחס הדמיון: [[{${side(s.big, i)}|${side(s.small, i)}} = {${b}|${a}} = ${kStr(p, q)}]]`,
        `יחס השטחים הוא ריבוע יחס הדמיון: [[${q === 1 ? p : `(${kStr(p, q)})`}^2 = ${kStr(p * p, q * q)}]]`,
      ],
      data: { sides, i, a, b },
    };
  },
  verify(q) {
    const { sides, i, a, b } = q.data, unit = a / sides[i];
    const S = scaled(triFromSides(sides), unit), B = scaled(triFromSides(sides), b / sides[i]);     // both triangles in coordinates
    if (!near(dist(S[(i + 1) % 3], S[(i + 2) % 3]), a) || !near(dist(B[(i + 1) % 3], B[(i + 2) % 3]), b)) return 'sides differ';
    return near(boxVal(q.rows[0].parts[0]), perimeter(B) / perimeter(S)) && near(boxVal(q.rows[1].parts[0]), area(B) / area(S)) ? true : 'ratios differ';
  },
};

/* 2. an area from the other area and the similarity ratio */
const findArea = {
  id: 'find-area',
  make(R) {
    const s = setup(R), { p, q } = s, m = R.int(2, 12), toBig = R.bool(0.6);
    const Ss = m * q * q, Sb = m * p * p, [sh] = R.pick(SHAPES), sides = R.shuffle(sh);
    const known = toBig ? s.small : s.big, asked = toBig ? s.big : s.small;
    return {
      tag: 'מציאת שטח',
      text: `נתון: ${s.same}. המשולש [[${tri(s.big)}]] הוא הגדול, ויחס הדמיון מהמשולש הגדול לקטן הוא [[${p} : ${q}]]. שטח המשולש [[${tri(known)}]] הוא [[${toBig ? Ss : Sb}]] סמ״ר. מצאו את יחס השטחים (מהגדול לקטן) ואת שטח המשולש [[${tri(asked)}]].`,
      fig: { type: 'simtri', sides, k: p / q, small: { names: s.small }, big: { names: s.big }, alt: 'שני משולשים דומים' },
      rows: [
        { label: 'יחס השטחים:', parts: [kBox(p * p, q * q)] },
        { label: `שטח המשולש [[${tri(asked)}]]:`, parts: [{ ans: toBig ? Sb : Ss }, { t: 'סמ״ר' }] },
      ],
      hint: `יחס השטחים הוא ריבוע יחס הדמיון. ${toBig ? 'המשולש המבוקש גדול יותר, ולכן כופלים ביחס השטחים.' : 'המשולש המבוקש קטן יותר, ולכן מחלקים ביחס השטחים.'}`,
      steps: [
        `יחס השטחים: [[${q === 1 ? p : `(${kStr(p, q)})`}^2 = ${kStr(p * p, q * q)}]]`,
        toBig
          ? `שטח המשולש הגדול: [[${times(Ss, p * p, q * q)} = ${Sb}]] סמ״ר.`
          : q === 1 ? `שטח המשולש הקטן: [[${Sb} : ${p * p} = ${Ss}]] סמ״ר.` : `שטח המשולש הקטן: [[${Sb} : {${p * p}|${q * q}} = ${Sb} * {${q * q}|${p * p}} = ${Ss}]] סמ״ר.`,
      ],
      data: { p, q, toBig, known: toBig ? Ss : Sb },
    };
  },
  verify(q) {
    const { p, q: qq, toBig, known } = q.data, got = q.rows[1].parts[0].ans;
    const Ss = toBig ? known : got;
    const small = [[0, 0], [4, 0], [1, Ss / 2]], big = scaled(small, p / qq);             // a triangle with the small area, enlarged
    if (!near(area(small), Ss)) return 'small area differs';
    return near(area(big), toBig ? got : known) && near(boxVal(q.rows[0].parts[0]), area(big) / area(small)) ? true : `big area is ${area(big)}`;
  },
};

/* 3. the similarity ratio from two areas, then a side */
const fromAreas = {
  id: 'ratio-from-areas',
  make(R) {
    const s = setup(R), { p, q } = s, m = R.int(2, 10), t = R.int(2, 6), [sh] = R.pick(SHAPES), sides = R.shuffle(sh), i = R.int(0, 2);
    const Ss = m * q * q, Sb = m * p * p, a = q * t, b = p * t;
    return {
      tag: 'יחס דמיון מתוך שטחים',
      text: `נתון: ${s.same}. שטח המשולש [[${tri(s.small)}]] הוא [[${Ss}]] סמ״ר, ושטח המשולש [[${tri(s.big)}]] הוא [[${Sb}]] סמ״ר. אורך הצלע [[${side(s.small, i)}]] הוא [[${a}]] ס״מ. מצאו את יחס הדמיון (מהגדול לקטן) ואת אורך הצלע המתאימה [[${side(s.big, i)}]].`,
      fig: { type: 'simtri', sides, k: p / q, small: { names: s.small, sideLabels: labelsAt(i, String(a)) }, big: { names: s.big, sideLabels: labelsAt(i, '?') }, alt: 'שני משולשים דומים' },
      rows: [
        { label: 'יחס הדמיון:', parts: [kBox(p, q)] },
        { parts: [`${side(s.big, i)} =`, { ans: b }, { t: 'ס״מ' }] },
      ],
      hint: 'קודם מצאו את יחס השטחים וצמצמו אותו. יחס הדמיון הוא השורש של יחס השטחים.',
      steps: [
        `יחס השטחים: [[{${Sb}|${Ss}} = ${kStr(p * p, q * q)}]]`,
        `יחס הדמיון הוא השורש של יחס השטחים: [[√(${kStr(p * p, q * q)}) = ${kStr(p, q)}]]`,
        `[[${side(s.big, i)} = ${times(a, p, q)} = ${b}]] ס״מ.`,
      ],
      data: { Ss, Sb, a },
    };
  },
  verify(q) {
    const { Ss, Sb, a } = q.data, k = boxVal(q.rows[0].parts[0]), b = q.rows[1].parts[1].ans;
    const small = [[0, 0], [a, 0], [0, 2 * Ss / a]], big = scaled(small, b / a);          // a triangle with side a and the small area
    return near(area(big), Sb) && near(k, b / a) && near(k * k, Sb / Ss) ? true : `big area would be ${area(big)}`;
  },
};

/* 4. perimeter grows by k, area by k² */
const periArea = {
  id: 'perimeter-and-area',
  make(R) {
    let s, sh, S0;
    do { s = setup(R); [sh, S0] = R.pick(SHAPES); } while (Math.max(...sh) * s.p > 60 || S0 * s.p * s.p > 600);
    const { p, q } = s, sides = R.shuffle(sh), i = R.int(0, 2);
    const sm = sides.map((v) => v * q), Ss = S0 * q * q, Ps = sm[0] + sm[1] + sm[2], Pb = Ps * p / q, Sb = S0 * p * p;
    return {
      tag: 'היקף ושטח במשולשים דומים',
      text: `נתון: ${s.same}. במשולש [[${tri(s.small)}]]: [[${side(s.small, 2)} = ${sm[2]}]] ס״מ, [[${side(s.small, 0)} = ${sm[0]}]] ס״מ, [[${side(s.small, 1)} = ${sm[1]}]] ס״מ, ושטחו [[${Ss}]] סמ״ר. במשולש [[${tri(s.big)}]] נתון [[${side(s.big, i)} = ${sides[i] * p}]] ס״מ. מצאו את יחס הדמיון (מהגדול לקטן), ואת ההיקף והשטח של [[${tri(s.big)}]].`,
      fig: { type: 'simtri', sides, k: p / q, small: { names: s.small, sideLabels: sm.map(String) }, big: { names: s.big, sideLabels: labelsAt(i, String(sides[i] * p)) }, alt: 'שני משולשים דומים' },
      rows: [
        { label: 'יחס הדמיון:', parts: [kBox(p, q)] },
        { label: `היקף [[${tri(s.big)}]]:`, parts: [{ ans: Pb }, { t: 'ס״מ' }] },
        { label: `שטח [[${tri(s.big)}]]:`, parts: [{ ans: Sb }, { t: 'סמ״ר' }] },
      ],
      hint: 'ההיקף גדל לפי יחס הדמיון. השטח גדל לפי ריבוע יחס הדמיון.',
      steps: [
        `יחס הדמיון: [[{${side(s.big, i)}|${side(s.small, i)}} = {${sides[i] * p}|${sm[i]}} = ${kStr(p, q)}]]`,
        `היקף המשולש הקטן: [[${sm[2]} + ${sm[0]} + ${sm[1]} = ${Ps}]] ס״מ. יחס ההיקפים שווה ליחס הדמיון: [[${times(Ps, p, q)} = ${Pb}]] ס״מ.`,
        `יחס השטחים הוא ריבוע יחס הדמיון, [[${kStr(p * p, q * q)}]]: [[${times(Ss, p * p, q * q)} = ${Sb}]] סמ״ר.`,
      ],
      data: { sm, Ss, i, bigSide: sides[i] * p },
    };
  },
  verify(q) {
    const { sm, Ss, i, bigSide } = q.data, small = triFromSides(sm);
    if (!near(area(small), Ss)) return `the small triangle really has area ${area(small)}`;
    const big = scaled(small, bigSide / sm[i]);
    return near(boxVal(q.rows[0].parts[0]), bigSide / sm[i]) && near(q.rows[1].parts[0].ans, perimeter(big)) && near(q.rows[2].parts[0].ans, area(big)) ? true : `big: perimeter ${perimeter(big)}, area ${area(big)}`;
  },
};

export default {
  id: 'area-ratio',
  name: 'יחס שטחים במשולשים דומים',
  grade: 'ט׳',
  about: 'במשולשים דומים יחס השטחים שווה לריבוע יחס הדמיון',
  place: 'הנושא "דמיון משולשים" ← פרק חדש אחרי "2. יחס דמיון וצלע חסרה" ולפני "3. דמיון בתוך צורות"',
  lesson: [
    { t: 'תזכורת: יחס הדמיון', items: [
      'במשולשים דומים היחס בין כל שתי צלעות מתאימות הוא אותו מספר. המספר הזה הוא יחס הדמיון.',
      { fig: { type: 'simtri', sides: [5, 4, 3], k: 2, small: { names: ['A', 'B', 'C'], sideLabels: ['5', '4', '3'] }, big: { names: ['D', 'E', 'F'], sideLabels: ['10', '8', '6'] }, caption: 'יחס הדמיון הוא [[2]]: כל צלע גדלה פי 2' } },
      'גם יחס ההיקפים שווה ליחס הדמיון: כאן ההיקפים הם [[12]] ו-[[24]].',
    ] },
    { t: 'יחס השטחים', items: [
      'יחס השטחים של משולשים דומים שווה לריבוע של יחס הדמיון.',
      { list: ['יחס דמיון [[2]] ← יחס שטחים [[2^2 = 4]].', 'יחס דמיון [[3]] ← יחס שטחים [[3^2 = 9]].', 'יחס דמיון [[{3|2}]] ← יחס שטחים [[{9|4}]].'] },
      'למה? כשמגדילים משולש פי [[2]], גם הבסיס וגם הגובה גדלים פי [[2]], ולכן השטח גדל פי [[2 * 2 = 4]].',
      { ex: 'במשולשים שבציור למעלה, שטח המשולש הקטן הוא [[6]] סמ״ר. מה שטח המשולש הגדול?', sol: ['יחס הדמיון: [[2]]', 'יחס השטחים: [[2^2 = 4]]', 'שטח המשולש הגדול: [[6 * 4 = 24]] סמ״ר.'] },
      { note: 'טעות נפוצה: לכפול את השטח ביחס הדמיון עצמו. הצלעות וההיקף גדלים פי [[k]], אבל השטח גדל פי [[k^2]].' },
    ] },
    { t: 'מיחס השטחים ליחס הדמיון', items: [
      'כשידועים השטחים, הולכים בכיוון ההפוך: יחס הדמיון הוא השורש של יחס השטחים.',
      { ex: 'שטחי שני משולשים דומים הם [[8]] סמ״ר ו-[[72]] סמ״ר. מה יחס הדמיון?', sol: ['יחס השטחים: [[{72|8} = 9]]', 'יחס הדמיון: [[√9 = 3]]'] },
    ] },
  ],
  gens: [fromSides, findArea, fromAreas, periArea],
};
