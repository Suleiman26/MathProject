// Ratio, proportion and percent (grade 7) — ported from Sulaiman's
// src/topics/ratio-percent/Topic.jsx (never edited). The ready Hebrew
// questions (q) of chapters 4–5 are used word for word.
import { randInt, pick } from '../rng.js';
import { numberQuestion, choiceQuestion } from '../choices.js';

// port of gcd() — src/topics/ratio-percent/Topic.jsx L15
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }

/* ── Chapter 1: ratio ────────────────────────────────────────────── */

// port of genRatio() — src/topics/ratio-percent/Topic.jsx L201 (contexts without colours)
function genRatio(r) {
  const contexts = [
    { label1: 'שוקולד', label2: 'וניל' },
    { label1: 'תות', label2: 'מנגו' },
    { label1: 'אדום', label2: 'כחול' },
    { label1: 'בנים', label2: 'בנות' },
    { label1: 'תפוחים', label2: 'תפוזים' },
  ];
  const ctx = pick(r, contexts);
  const simpleRatios = [[2, 3], [3, 4], [1, 2], [1, 3], [2, 5], [3, 5], [1, 4], [3, 7], [2, 7], [4, 5]];
  const [sa, sb] = pick(r, simpleRatios);
  const mult = randInt(r, 2, 4);
  const a = sa * mult, b = sb * mult;
  return { ctx, a, b, total: a + b, simA: sa, simB: sb };
}

// port of genRatioAmount(kind) — src/topics/ratio-percent/Topic.jsx L326 ("table" kind:
// ratio + total → one amount)
function genRatioAmount(r) {
  const ctxs = [
    { l1: 'בנים', l2: 'בנות', unit: 'ילדים' },
    { l1: 'עפרונות אדומים', l2: 'עפרונות כחולים', unit: 'עפרונות' },
    { l1: 'תפוחים', l2: 'תפוזים', unit: 'פירות' },
    { l1: 'כדורים צהובים', l2: 'כדורים סגולים', unit: 'כדורים' },
  ];
  const ctx = pick(r, ctxs);
  const [a, b] = pick(r, [[1, 2], [2, 3], [1, 3], [3, 4], [2, 5], [3, 5], [1, 4], [3, 2], [4, 3], [5, 2]]);
  const k = randInt(r, 2, 8);
  return { ctx, a, b, k, total: (a + b) * k, A: a * k, B: b * k };
}

const ratioText = (p, q) => `${p} : ${q}`;

export function ratio(r, want) {
  if (want !== 'number' && randInt(r, 0, 1) === 0) {
    const ex = genRatio(r);
    const { ctx, a, b, total, simA, simB } = ex;
    // mistakes: swapped, part : whole (either part)
    const cand = [[simB, simA], [simA, simA + simB], [simB, simA + simB]];
    const wrongs = cand
      .map(([p, q]) => [p / gcd(p, q), q / gcd(p, q)])
      .filter(([p, q]) => p * simB !== q * simA)
      .map(([p, q]) => ratioText(p, q));
    return choiceQuestion(r,
      `מתוך ${total}: ${a} ${ctx.label1} ו-${b} ${ctx.label2}. מה היחס בין ${ctx.label1} ל${ctx.label2}, במספרים הקטנים ביותר?`,
      ratioText(simA, simB), wrongs, { v: 'simp', a, b });
  }
  const ex = genRatioAmount(r);
  const { ctx, a, b, k, total, A, B } = ex;
  const askA = randInt(r, 0, 1) === 0;
  const ans = askA ? A : B;
  const other = askA ? B : A;
  // mistakes: the other amount, the number of groups, total ÷ one ratio number
  const wrongs = [other, k, total / (askA ? a : b)]
    .filter((w) => Number.isInteger(w) && w > 0);
  return numberQuestion(r, want,
    `היחס בין ${ctx.l1} ל${ctx.l2} הוא $${ratioText(a, b)}$, ובסך הכל יש ${total} ${ctx.unit}. כמה ${askA ? ctx.l1 : ctx.l2}?`,
    ans, wrongs, { v: 'amount', a, b, total, ask: askA ? 'A' : 'B' });
}

/* ── Chapter 2: proportion ───────────────────────────────────────── */

// port of genProportion() — src/topics/ratio-percent/Topic.jsx L456
function genProportion(r) {
  const contexts = [
    { q: 'מים שוקלות', unit1: 'כוסות', unit2: 'גרם', tail: (c) => `כמה גרם ישקלו ${c} כוסות?` },
    { q: 'נסיעה לוקחת', unit1: 'ק"מ', unit2: 'דקות', tail: (c) => `כמה דקות ייקחו ${c} ק"מ?` },
    { q: 'דורשות', unit1: 'עוגות', unit2: 'ביצים', tail: (c) => `כמה ביצים יידרשו ל-${c} עוגות?` },
    { q: 'עולות', unit1: 'חולצות', unit2: '₪', tail: (c) => `כמה יעלו ${c} חולצות?` },
    { q: 'מכילים', unit1: 'בקבוקים', unit2: 'ליטר', tail: (c) => `כמה ליטר יכילו ${c} בקבוקים?` },
  ];
  const ctx = pick(r, contexts);
  const a = randInt(r, 2, 6);
  const b = a * pick(r, [5, 10, 15, 20, 25, 30, 50]);
  const c = randInt(r, a + 1, 12);
  const d = (b / a) * c;
  return { ctx, a, b, c, d: Math.round(d) };
}

export function proportion(r, want) {
  const { ctx, a, b, c, d } = genProportion(r);
  const unit = b / a;
  // mistakes: forgot to divide, added the difference, multiplied the givens, one unit too many
  const wrongs = [b * c, b + (c - a), b * a, d + unit];
  // Sulaiman's text (L551): "אם {a} {unit1} {q} {b} {unit2}, {tail}"
  return numberQuestion(r, want, `אם ${a} ${ctx.unit1} ${ctx.q} ${b} ${ctx.unit2}, ${ctx.tail(c)}`, d, wrongs, { a, b, c });
}

/* ── Chapter 3: fraction ↔ decimal ───────────────────────────────── */

// port of genDecToFracEx() — src/topics/ratio-percent/Topic.jsx L636
// Duel limit: 1–2 decimal digits, or 3 digits only when the fraction's
// denominator is ≤ 8 (0.375 = 3/8 yes, 0.124 = 31/250 no).
function genDecToFracEx(r) {
  for (let tries = 0; tries < 300; tries++) {
    const digits = pick(r, [1, 2, 3]);
    const target = Math.pow(10, digits);
    const numerator = randInt(r, 1, target - 1);
    const g = gcd(numerator, target);
    if (g <= 1) continue;
    if (digits === 3 && target / g > 8) continue; // duel limit
    return { n: numerator / g, d: target / g, dec: numerator / target, unreducedNum: numerator, unreducedDen: target };
  }
  return { n: 3, d: 4, dec: 0.75, unreducedNum: 75, unreducedDen: 100 };
}

// port of genFracToDecEx() — src/topics/ratio-percent/Topic.jsx L649
// Duel limit: denominators ≤ 25 (2, 4, 5, 8, 10, 20, 25).
function genFracToDecEx(r) {
  for (let tries = 0; tries < 300; tries++) {
    const a = randInt(r, 0, 3), b = randInt(r, 0, 3);
    if (a === 0 && b === 0) continue;
    const d = Math.pow(2, a) * Math.pow(5, b);
    if (d > 25) continue; // duel limit
    const n = randInt(r, 1, d - 1);
    if (gcd(n, d) !== 1) continue;
    return { n, d };
  }
  return { n: 3, d: 4 };
}

const decText = (x) => String(Number(x.toFixed(6)));

// port of genDecFracEx(forceType) — src/topics/ratio-percent/Topic.jsx L666
export function convert(r, want) {
  const type = want === 'number' ? 1 : randInt(r, 0, 1); // 0 = decimal→fraction, 1 = fraction→decimal
  if (type === 0) {
    const { n, d, dec, unreducedNum, unreducedDen } = genDecToFracEx(r);
    const f = (p, q) => `\\frac{${p}}{${q}}`;
    // mistakes: only the numerator reduced, off by one, numerator over the wrong power of 10
    const wrongs = [[n, unreducedDen], [n + 1, d], [n, d + 1], [unreducedNum, unreducedDen * 10]]
      .filter(([p, q]) => p < q && p * d !== q * n) // a proper fraction, not equal to the answer
      .map(([p, q]) => f(p, q));
    return choiceQuestion(r, `המרת עשרוני לשבר: כתבו את $${decText(dec)}$ כשבר מצומצם`, f(n, d), wrongs, { v: 'd2f', dec: decText(dec) });
  }
  const { n, d } = genFracToDecEx(r);
  const ans = Number((n / d).toFixed(6));
  // mistakes: numerator and denominator glued ("3/4" → 0.34), flipped, ×10
  const wrongs = [Number(`0.${n}${d}`), Number((d / n).toFixed(3)), Number((ans * 10).toFixed(6)), Number((ans / 10).toFixed(7))]
    .filter((w) => Number.isFinite(w) && w !== ans);
  return numberQuestion(r, want, `המרת שבר לעשרוני: $\\frac{${n}}{${d}} = ?$`, ans, wrongs, { v: 'f2d', n, d });
}

/* ── Chapter 4: percent calculations ─────────────────────────────── */

// port of genPctCalc() — src/topics/ratio-percent/Topic.jsx L862
function genPctCalc(r) {
  const type = randInt(r, 0, 2);
  let pct, whole, part;
  for (let tries = 0; tries < 200; tries++) {
    pct = pick(r, [10, 15, 20, 25, 30, 40, 50, 60, 75, 80]);
    whole = pick(r, [40, 50, 60, 80, 100, 120, 150, 200, 240, 250, 300, 400, 500]);
    part = whole * pct / 100;
    if (Number.isInteger(part)) break;
  }
  if (!Number.isInteger(part)) { pct = 20; whole = 50; part = 10; }
  if (type === 0) {
    const contexts = [
      `כמה זה ${pct}% מ-${whole}?`,
      `${pct}% מתוך ${whole} תלמידים — כמה תלמידים?`,
      `${pct}% הנחה על פריט ב-${whole}₪ — כמה ההנחה?`,
    ];
    return { type, pct, whole, part, ans: part, q: pick(r, contexts) };
  } else if (type === 1) {
    const contexts = [
      `${part} הם כמה אחוז מ-${whole}?`,
      `מתוך ${whole} תלמידים, ${part} קיבלו ציון מעולה. כמה אחוז?`,
    ];
    return { type, pct, whole, part, ans: pct, q: pick(r, contexts) };
  }
  const q = `${pct}% מהכיתה הם ${part} תלמידים. כמה תלמידים בכיתה?`;
  return { type, pct, whole, part, ans: whole, q };
}

export function pct(r, want) {
  const ex = genPctCalc(r);
  const { type, pct: p, whole, part, ans, q } = ex;
  let wrongs, meta;
  // mistakes: the other part, a slipped decimal point, the percent itself / the part itself
  if (type === 0) { wrongs = [whole - part, part * 10, p]; meta = { type, pct: p, whole }; }
  else if (type === 1) { wrongs = [100 - p, part, whole / part]; meta = { type, part, whole }; }
  else { wrongs = [whole + part, whole - part, part * p / 100]; meta = { type, pct: p, part }; }
  return numberQuestion(r, want, q, ans, wrongs.filter((w) => w > 0 && Number.isInteger(w)), meta);
}

/* ── Chapter 5: percent increase / decrease ──────────────────────── */

// port of genExactPctPair() — src/topics/ratio-percent/Topic.jsx L1052
function genExactPctPair(r) {
  const pcts = [10, 15, 20, 25, 30, 40, 50];
  let pct, original, diff;
  for (let tries = 0; tries < 200; tries++) {
    pct = pick(r, pcts);
    original = pick(r, [40, 50, 60, 80, 100, 120, 150, 200, 240, 250, 300, 400, 500]);
    diff = original * pct / 100;
    if (Number.isInteger(diff)) break;
  }
  if (!Number.isInteger(diff)) { pct = 10; original = 200; diff = 20; }
  return { pct, original, diff };
}

// port of genPctChange() — src/topics/ratio-percent/Topic.jsx L1065
function genPctChange(r) {
  const type = randInt(r, 0, 3);
  if (type === 0) {
    const { pct, original, diff } = genExactPctPair(r);
    const q = pick(r, [`מחיר של ${original}₪ עלה ב-${pct}%. כמה הוא עכשיו?`, `שכר של ${original}₪ עלה ב-${pct}%. כמה הוא עכשיו?`]);
    return { type, pct, original, diff, final: original + diff, q };
  } else if (type === 1) {
    const { pct, original, diff } = genExactPctPair(r);
    const q = pick(r, [`הנחה של ${pct}% על פריט ב-${original}₪ — כמה משלמים?`, `מחיר של ${original}₪ ירד ב-${pct}%. כמה הוא עכשיו?`]);
    return { type, pct, original, diff, final: original - diff, q };
  } else if (type === 2) {
    const { pct, original, diff } = genExactPctPair(r);
    const isUp = randInt(r, 0, 1);
    const final_ = isUp ? original + diff : original - diff;
    const dir = isUp ? 'עלה' : 'ירד';
    return { type, pct, original, final: final_, diff, q: `מחיר ${dir} מ-${original}₪ ל-${final_}₪ — בכמה אחוז?` };
  }
  const { pct, original, diff } = genExactPctPair(r);
  const isUp = randInt(r, 0, 1);
  const final_ = isUp ? original + diff : original - diff;
  const dir = isUp ? 'עלייה' : 'הנחה';
  return { type, pct, original, final: final_, diff, isUp: !!isUp, q: `אחרי ${dir} של ${pct}% המחיר הוא ${final_}₪ — מה היה המחיר המקורי?` };
}

export function change(r, want) {
  const ex = genPctChange(r);
  const { type, pct: p, original, diff, final, q } = ex;
  let ans, wrongs, meta;
  // mistakes: wrong direction, only the change, percent added as shekels, percent of the wrong price
  if (type === 0) { ans = final; wrongs = [original - diff, diff, original + p]; meta = { type, pct: p, original }; }
  else if (type === 1) { ans = final; wrongs = [original + diff, diff, original - p]; meta = { type, pct: p, original }; }
  else if (type === 2) {
    ans = p;
    const ofFinal = diff * 100 / final;
    wrongs = [diff, Number.isInteger(ofFinal) ? ofFinal : undefined, 100 - p];
    meta = { type, original, final };
  } else {
    ans = original;
    // mistake: took the percent of the final price instead of the original
    const d2 = Math.round(final * p / 100);
    wrongs = [ex.isUp ? final - d2 : final + d2, final, ex.isUp ? final + diff : final - diff];
    meta = { type, pct: p, final, isUp: ex.isUp };
  }
  return numberQuestion(r, want, q, ans, wrongs.filter((w) => w !== undefined && w > 0 && Number.isInteger(w)), meta);
}
