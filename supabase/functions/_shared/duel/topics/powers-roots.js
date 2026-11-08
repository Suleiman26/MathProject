// Powers and roots (grades 8–9) — ported from Sulaiman's
// src/topics/powers-roots/Topic.jsx (never edited).
// Answers with two or three slots on the topic page (coefficient + exponent,
// a√b, x^a·y^b) are asked here as ONE slot: the rest of the answer is printed
// ("(2b^{4})^{3} = ?b^{12}", "√8 + √2 = ?√2", "2 · 2 · 2 = 2^{?}") and the
// missing number is typed or picked from 4 plain numbers. Whole expressions as
// 4 choices gave the answer away by their numbers (see choices.js). In choice
// mode the printed part must not contain the answer: the same template is
// re-rolled (numbers / slot) until it doesn't.
// Math markup: x^{n}, \sqrt{n}, \frac{a}{b}; his "x^3" → "x^{3}".
import { randInt, pick } from '../rng.js';
import { fmt, numberQuestion, choiceQuestion } from '../choices.js';

// does the math text (with its "?") print the answer somewhere?
const printed = (q, ans) => (q.match(/\d+/g) || []).includes(String(ans));
// a count of factors, a value, a root's or a monomial's coefficient is positive:
// no "0" or negative choice there (an exponent may be 0: a⁰ is in the chapter)
const POS = { accept: (t) => Number(t.replace('−', '-')) >= 1 };

// port of VARS + pickVars() — src/topics/powers-roots/Topic.jsx L31
const VARS = ['x', 'y', 'z', 'a', 'b', 'm', 'n', 't'];
function pickVars(r) { const v = pick(r, VARS); let w = pick(r, VARS); while (w === v) w = pick(r, VARS); return [v, w]; }

const pw = (b, e) => (e === 1 ? `${b}` : `${b}^{${fmt(e)}}`);
const rt = (c, b) => (c === 1 ? '' : String(c)) + `\\sqrt{${b}}`;

/* ── Chapter 1: understanding powers ─────────────────────────────── */

// port of genCh1() — src/topics/powers-roots/Topic.jsx L38
// Duel limit: forward mode re-rolls until the power is ≤ 256 (6⁵ = 7776 is not
// a 15-second question); Sulaiman's ranges are otherwise unchanged.
function genCh1(r) {
  const mode = randInt(r, 0, 1);
  if (mode === 0) {
    let base, exp, ans;
    do { base = randInt(r, 2, 6); exp = randInt(r, 2, 5); ans = Math.pow(base, exp); } while (ans > 256);
    return { mode, base, exp, ans };
  }
  const pairs = [[2, 4, 16], [2, 5, 32], [3, 2, 9], [3, 3, 27], [3, 4, 81], [4, 2, 16], [4, 3, 64], [5, 2, 25], [5, 3, 125], [2, 6, 64], [2, 7, 128], [6, 2, 36], [7, 2, 49], [8, 2, 64], [9, 2, 81], [10, 2, 100]];
  const [base, exp, ans] = pick(r, pairs);
  return { mode, base, exp, ans };
}

// port of genBaseExp() mode 1 — src/topics/powers-roots/Topic.jsx L72
// ("write the repeated product as a power"; mode 0 needs two slots)
function genBaseExpProduct(r) {
  return { base: randInt(r, 2, 9), exp: randInt(r, 2, 6) };
}

export function powers(r, want) {
  if (randInt(r, 0, 2) === 0) {
    // one slot: the exponent ("2 · 2 · 2 = 2^{?}"); the base is printed, so as
    // 4 choices base ≠ count (3 · 3 · 3 = 3^{?} would print the answer)
    let base, exp;
    do { ({ base, exp } = genBaseExpProduct(r)); } while (want !== 'number' && base === exp);
    const chain = Array.from({ length: exp }, () => base).join(' · ');
    // mistakes: the base (swapped), one factor too few / many
    const wrongs = [base, exp - 1, exp + 1];
    return numberQuestion(r, want, `כתבו את הכפל כחזקה: $${chain} = ${base}^{?}$`, exp, wrongs, { v: 'prod', base, count: exp }, POS);
  }
  const ex = genCh1(r);
  if (ex.mode === 0) {
    const { base, exp, ans } = ex;
    // mistakes: base × exponent, one factor too few/many
    const wrongs = [base * exp, Math.pow(base, exp - 1), Math.pow(base, exp + 1)];
    return numberQuestion(r, want, `הבנת חזקות: $${pw(base, exp)} = ?$`, ans, wrongs, { v: 'calc', base, exp }, POS);
  }
  const { base, exp, ans } = ex;
  // mistakes: divided once instead of counting the factors, the base read as the exponent
  const wrongs = [ans / base, base].filter((w) => Number.isInteger(w) && w > 0 && w !== exp);
  return numberQuestion(r, want, `מצאו את המעריך: $${ans} = ${base}^{?}$`, exp, wrongs, { v: 'rev', base, value: ans });
}

/* ── Chapter 2: power laws (numbers) ─────────────────────────────── */

// port of lawNames — src/topics/powers-roots/Topic.jsx L237
const lawNames = ['כפל חזקות', 'חילוק חזקות', 'חזקה של חזקה', 'חזקה של מכפלה', 'חזקה אפס', 'חזקה שלילית'];

// port of genLaw(lawIdx) — src/topics/powers-roots/Topic.jsx L205
function genLaw(r, lawIdx) {
  if (lawIdx === 0) {
    const base = pick(r, [2, 3, 4, 5]); const n = randInt(r, 2, 4); const m = randInt(r, 2, 4);
    return { law: 0, base, n, m, expAns: n + m, q: `${pw(base, n)} · ${pw(base, m)} = ${base}^{?}` };
  }
  if (lawIdx === 1) {
    const base = pick(r, [2, 3, 5]); const n = randInt(r, 4, 7); const m = randInt(r, 1, n - 1);
    return { law: 1, base, n, m, expAns: n - m, q: `${pw(base, n)} ÷ ${pw(base, m)} = ${base}^{?}` };
  }
  if (lawIdx === 2) {
    const base = pick(r, [2, 3]); const n = randInt(r, 2, 3); const m = randInt(r, 2, 4);
    return { law: 2, base, n, m, expAns: n * m, q: `(${pw(base, n)})^{${m}} = ${base}^{?}` };
  }
  if (lawIdx === 3) {
    const a = pick(r, [2, 3]); const b = pick(r, [2, 3, 5]); const n = randInt(r, 2, 3);
    return { law: 3, a, b, n, ansA: Math.pow(a, n), ansB: Math.pow(b, n), q: `(${a} · ${b})^{${n}} = ? · ?` };
  }
  if (lawIdx === 4) {
    const base = pick(r, [2, 3, 5, 7, 10, 13, 42, 100]);
    return { law: 4, base, ans: 1, q: `${base}^{0} = ?` };
  }
  const base = pick(r, [2, 3, 4, 5]); const n = randInt(r, 1, 3);
  return { law: 5, base, n, den: Math.pow(base, n), q: `${base}^{−${n}} = ?` };
}

export function laws(r, want) {
  // a^0 is always 1: as 4 choices that is a giveaway, so it is a typed question only
  const law = want === 'number' ? pick(r, [0, 1, 2, 4]) : pick(r, [0, 1, 2, 3, 5]);
  let ex = genLaw(r, law);
  // duel limit: a^{−1} has too few real "1 over …" mistakes, so a^{−n} uses n = 2–3
  while (law === 5 && ex.n < 2) ex = genLaw(r, law);
  const prompt = `${lawNames[law]}: $${ex.q}$`;
  if (law <= 2) {
    const { n, m, expAns } = ex;
    // mistakes: exponents multiplied / added / divided instead
    const wrongs = law === 0 ? [n * m, Math.pow(n, m)]
      : law === 1 ? [n + m, n / m].filter(Number.isInteger)
        : [n + m, Math.pow(n, m)];
    return numberQuestion(r, want, prompt, expAns, wrongs, { law, base: ex.base, n, m });
  }
  if (law === 3) {
    const { a, b, n, ansA, ansB } = ex;
    // each factor on its own can be: ×n instead of a power, not raised, one power too many.
    // All combinations of a wrong first and/or wrong second factor (a "web"), no ±k
    const alt = (x) => [x * n, x, Math.pow(x, n + 1)].filter((y) => y !== Math.pow(x, n));
    const wrongs = [];
    for (const x of [ansA, ...alt(a)]) for (const y of [ansB, ...alt(b)]) if (x !== ansA || y !== ansB) wrongs.push(`${x} · ${y}`);
    return choiceQuestion(r, prompt, `${ansA} · ${ansB}`, wrongs, { law, a, b, n }, { decoys: false });
  }
  if (law === 4) {
    return numberQuestion(r, want, prompt, 1, [0, ex.base],{ law, base: ex.base });
  }
  const { base, n, den } = ex;
  // real mistakes only (no decoys): 1 over the wrong power (b·n, one factor too
  // few / many, n^b), the power without "1 over", the minus kept.
  // At least 2 other "1 over …" choices, so "pick the positive 1/x" can't win.
  const unit = (d) => `\\frac{1}{${d}}`;
  // (plus the two-mistake webs base·n and −1/(base·n), so the right answer is not
  // the only choice whose numbers all appear in other choices)
  const wrongs = [unit(base * n), unit(den / base), unit(den * base), unit(den * base * base), unit(Math.pow(n, base)), `${den}`, `−${den}`, `−${unit(den)}`, `${base * n}`, `−${unit(base * n)}`];
  const isUnit = (t) => /^\\frac\{1\}\{\d+\}$/.test(t);
  return choiceQuestion(r, prompt, unit(den), wrongs, { law, base, n },
    { decoys: false, must: (ts) => ts.filter(isUnit).length >= 2 });
}

/* ── Chapter 3: power laws with letters ──────────────────────────── */

// port of paramNames — src/topics/powers-roots/Topic.jsx L388
const paramNames = ['כפל פשוט', 'חזקה של חזקה + כפל', 'חזקה עם מקדם', 'חילוק', 'ביטוי מעורב'];

// port of genParam(subIdx) — src/topics/powers-roots/Topic.jsx L366
function genParam(r, subIdx) {
  const [v, w] = pickVars(r);
  if (subIdx === 0) {
    const a = randInt(r, 2, 6), b = randInt(r, 2, 6);
    return { v, w, sub: 0, a, b, ans: a + b, q: `${pw(v, a)} · ${pw(v, b)} = ${v}^{?}` };
  }
  if (subIdx === 1) {
    const a = randInt(r, 2, 3), b = randInt(r, 2, 3), c = randInt(r, 1, 4);
    return { v, w, sub: 1, a, b, c, ans: a * b + c, q: `(${pw(v, a)})^{${b}} · ${pw(v, c)} = ${v}^{?}` };
  }
  if (subIdx === 2) {
    const k = pick(r, [2, 3, 4, 5]); const a = randInt(r, 2, 4); const b = pick(r, [2, 3]);
    return { v, w, sub: 2, k, a, b, coefAns: Math.pow(k, b), expAns: a * b, q: `(${k}${pw(v, a)})^{${b}} = ?` };
  }
  if (subIdx === 3) {
    const a = randInt(r, 5, 9), b = randInt(r, 1, a - 1);
    return { v, w, sub: 3, a, b, ans: a - b, q: `\\frac{${pw(v, a)}}{${pw(v, b)}} = ${v}^{?}` };
  }
  const k = pick(r, [2, 3]); const a = randInt(r, 1, 3), b = randInt(r, 1, 3), c = pick(r, [2, 3]);
  return { v, w, sub: 4, k, a, b, c, coefAns: Math.pow(k, c), expA: a * c, expB: b * c, q: `(${k}${pw(v, a)}${pw(w, b)})^{${c}} = ?` };
}

export function param(r, want) {
  const sub = randInt(r, 0, 4);
  let ex = genParam(r, sub);
  if (sub === 0) {
    const { a, b, ans } = ex;
    return numberQuestion(r, want, `${paramNames[sub]}: $${ex.q}$`, ans, [a * b, Math.max(a, b)], { sub, a, b });
  }
  if (sub === 1) {
    const { a, b, c, ans } = ex;
    return numberQuestion(r, want, `${paramNames[sub]}: $${ex.q}$`, ans, [a + b + c, a * b * c, Math.pow(a, b) + c],{ sub, a, b, c });
  }
  if (sub === 3) {
    const { a, b, ans } = ex;
    return numberQuestion(r, want, `${paramNames[sub]}: $${ex.q}$`, ans, [a + b, a / b, a * b].filter(Number.isInteger), { sub, a, b });
  }
  // subs 2 and 4 answer a whole monomial (k^n · v^{an} [· w^{bn}]) on the topic
  // page; here ONE slot of it is asked — the coefficient ('coef') or an
  // exponent ('A' for v, 'B' for w) — and the other parts are printed.
  // Mistakes per slot: ×n instead of a power / added instead of multiplied,
  // the part not raised at all, the two numbers swapped as a power.
  let ask, rhs, ans, wrongs, meta;
  for (let t = 0; ; t++) {
    const { v, w } = ex;
    const n = sub === 2 ? ex.b : ex.c;
    const coef = Math.pow(ex.k, n), eA = ex.a * n, eB = sub === 4 ? ex.b * n : 0;
    ask = pick(r, sub === 2 ? ['coef', 'A'] : ['coef', 'A', 'B']);
    const tail = sub === 4 ? pw(w, eB) : '';
    if (ask === 'coef') { rhs = `?${pw(v, eA)}${tail}`; ans = coef; wrongs = [ex.k * n, ex.k, Math.pow(ex.k, n + 1), Math.pow(n, ex.k)]; }
    else if (ask === 'A') { rhs = `${coef}${v}^{?}${tail}`; ans = eA; wrongs = [ex.a + n, ex.a, Math.pow(ex.a, n), Math.pow(n, ex.a)]; }
    else { rhs = `${coef}${pw(v, eA)}${w}^{?}`; ans = eB; wrongs = [ex.b + n, ex.b, Math.pow(ex.b, n), Math.pow(n, ex.b)]; }
    meta = sub === 2 ? { sub, k: ex.k, a: ex.a, b: ex.b, v, w, ask } : { sub, k: ex.k, a: ex.a, b: ex.b, c: ex.c, v, w, ask };
    if (want === 'number' || t >= 20 || !printed(ex.q + rhs, ans)) break;
    ex = genParam(r, sub);
  }
  return numberQuestion(r, want, `${paramNames[sub]}: $${ex.q.replace(/\?$/, rhs)}$`, ans, wrongs, meta, ask === 'coef' ? POS : undefined);
}

/* ── Chapter 4: square roots ─────────────────────────────────────── */

// port of rootNames — src/topics/powers-roots/Topic.jsx L520
const rootNames = ['שורשים מדויקים', 'פישוט שורשים', 'פעולות עם שורשים'];

// port of genRoot(subIdx) — src/topics/powers-roots/Topic.jsx L479
function genRoot(r, subIdx, opType) {
  if (subIdx === 0) {
    const n = pick(r, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    return { sub: 0, val: n * n, ans: n };
  }
  if (subIdx === 1) {
    const pairs = [[2, 2, 8], [2, 3, 12], [2, 5, 20], [2, 7, 28], [3, 2, 18], [3, 3, 27], [3, 5, 45], [4, 2, 32], [4, 3, 48], [5, 2, 50], [5, 3, 75], [6, 2, 72]];
    const [a, b, val] = pick(r, pairs);
    return { sub: 1, val, a, b };
  }
  if (opType === 0) {
    const pairs = [[3, 12, 36, 6], [2, 8, 16, 4], [5, 20, 100, 10], [2, 18, 36, 6], [3, 27, 81, 9], [2, 32, 64, 8]];
    const [a, b, prod, ans] = pick(r, pairs);
    return { sub: 2, opType: 0, a, b, prod, ans };
  }
  if (opType === 1) {
    const pairs = [[50, 2, 25, 5], [72, 2, 36, 6], [75, 3, 25, 5], [48, 3, 16, 4], [98, 2, 49, 7]];
    const [a, b, div, ans] = pick(r, pairs);
    return { sub: 2, opType: 1, a, b, div, ans };
  }
  if (opType === 2) {
    const base = pick(r, [2, 3, 5, 7]); const k = randInt(r, 1, 5), m = randInt(r, 1, 5);
    return { sub: 2, opType: 2, base, k, m, ans: k + m };
  }
  const triples = [[8, 2, 3, 2], [18, 2, 4, 2], [12, 3, 3, 3], [27, 3, 4, 3], [20, 5, 3, 5], [45, 5, 4, 5], [50, 2, 6, 2]];
  const [a, b, coef, base] = pick(r, triples);
  return { sub: 2, opType: 3, a, b, coef, base };
}

export function roots(r, want) {
  // which kind: 0 exact, 1 simplify, 2.0 ×, 2.1 ÷, 2.2 like terms, 2.3 √a+√b
  const kinds = want === 'number' ? [[0], [2, 0], [2, 1], [2, 2], [2, 3]] : [[0], [1], [2, 0], [2, 1], [2, 2], [2, 3]];
  const [sub, op] = pick(r, kinds);
  let ex = genRoot(r, sub, op);
  const name = rootNames[sub];
  if (sub === 0) {
    const { val, ans } = ex;
    return numberQuestion(r, want, `${name}: $\\sqrt{${val}} = ?$`, ans, [val / 2, ans * 2, val].filter(Number.isInteger), { sub, val }, POS);
  }
  if (sub === 1) {
    const { a, b, val } = ex;
    // mistakes: a and b swapped, a² left outside, the number outside forgotten
    const wrongs = [rt(b, a), rt(a * a, b), rt(1, b)];
    return choiceQuestion(r, `${name}: $\\sqrt{${val}} = ?$`, rt(a, b), wrongs, { sub, val });
  }
  if (ex.opType === 0) {
    const { a, b, prod, ans } = ex;
    return numberQuestion(r, want, `${name}: $\\sqrt{${a}} · \\sqrt{${b}} = ?$`, ans, [prod, a + b, b - a],{ sub, op: 0, a, b }, POS);
  }
  if (ex.opType === 1) {
    const { a, b, div, ans } = ex;
    return numberQuestion(r, want, `${name}: $\\sqrt{${a}} ÷ \\sqrt{${b}} = ?$`, ans, [div, a - b, div / 2].filter(Number.isInteger),{ sub, op: 1, a, b }, POS);
  }
  // op 2 and 3 answer k√b; here the root is printed and ONE slot — the
  // coefficient — is asked ("√8 + √2 = ?√2"). As 4 choices the printed part
  // must not contain the answer (2√5 + 3√5 = ?√5; √12 + √3 = ?√3): re-roll.
  if (ex.opType === 2) {
    for (let t = 0; want !== 'number' && t < 20 && printed(`${ex.k} ${ex.base} ${ex.m}`, ex.ans); t++) ex = genRoot(r, 2, 2);
    const { base, k, m, ans } = ex;
    // mistakes: coefficients multiplied, one of them forgotten
    return numberQuestion(r, want, `${name}: $${rt(k, base)} + ${rt(m, base)} = ?\\sqrt{${base}}$`, ans, [k * m, Math.max(k, m)], { sub, op: 2, base, k, m, ask: 'coef' }, POS);
  }
  for (let t = 0; want !== 'number' && t < 20 && printed(`${ex.a} ${ex.b} ${ex.base}`, ex.coef); t++) ex = genRoot(r, 2, 3);
  const { a, b, coef, base } = ex;
  // mistakes: the lone √b forgotten (coef − 1), √a "simplified" to (a/b)√b, a/b alone, one too many
  const wrongs = [coef - 1, a / b + 1, a / b, coef + 1];
  return numberQuestion(r, want, `${name}: $\\sqrt{${a}} + \\sqrt{${b}} = ?\\sqrt{${base}}$`, coef, wrongs, { sub, op: 3, a, b, base, ask: 'coef' }, POS);
}

/* ── Chapter 5: everything together ──────────────────────────────── */

// port of genCombined(diff) — src/topics/powers-roots/Topic.jsx L668
// Same templates and ranges, written straight in the duel markup. t = template
// id (e = easy, m = medium, h = hard); "exp" answers are one exponent,
// "2exp"/"coefexp" answers are a whole monomial, of which one slot is asked.
const COMBINED = [
  { t: 'e0', type: 'exp', make: (r, v) => { const a = pick(r, [4, 6, 8, 10]); return { a, q: `\\sqrt{${pw(v, a)}} = ${v}^{?}`, ans: a / 2, alt: [a, a - 2] }; } },
  { t: 'e1', type: 'exp', make: (r, v) => { const a = randInt(r, 3, 5), b = randInt(r, 1, 2 * a - 1); return { a, b, q: `(${pw(v, a)})^{2} ÷ ${pw(v, b)} = ${v}^{?}`, ans: 2 * a - b, alt: [a + 2 - b, a * a - b] }; } },
  { t: 'e2', type: 'exp', make: (r, v) => { const a = randInt(r, 2, 6), b = randInt(r, 2, 6), c = randInt(r, 1, a + b - 1); return { a, b, c, q: `${pw(v, a)} · ${pw(v, b)} ÷ ${pw(v, c)} = ${v}^{?}`, ans: a + b - c, alt: [a * b - c, a + b + c] }; } },
  { t: 'm0', type: 'exp', make: (r, v) => { const a = pick(r, [4, 6, 8]); return { a, q: `(\\sqrt{${v}})^{${a}} = ${v}^{?}`, ans: a / 2, alt: [a, 2 * a] }; } },
  { t: 'm1', type: 'exp', make: (r, v) => { const a = pick(r, [2, 4, 6]), b = randInt(r, 1, 4); return { a, b, q: `\\sqrt{${pw(v, a)}} · ${pw(v, b)} = ${v}^{?}`, ans: a / 2 + b, alt: [a + b, a * b / 2] }; } },
  { t: 'm2', type: 'exp', make: (r, v) => { const b = pick(r, [2, 4, 6]), a = randInt(r, b / 2 + 1, b / 2 + 5); return { a, b, q: `${pw(v, a)} ÷ \\sqrt{${pw(v, b)}} = ${v}^{?}`, ans: a - b / 2, alt: [a - b, a + b / 2] }; } },
  { t: 'm3', type: 'coefexp', make: (r, v) => { const k = randInt(r, 2, 5), a = randInt(r, 1, 4); return { k, a, q: `(${k}${pw(v, a)})^{2} = ?`, coef: k * k, e: 2 * a, alt: [[2 * k, 2 * a], [k * k, a + 2], [k, 2 * a]] }; } },
  { t: 'h0', type: '2exp', make: (r, v, w) => { const a = pick(r, [2, 3]), b = pick(r, [2, 4]); return { a, b, q: `\\sqrt{${pw(v, a * b)} · ${pw(w, 2 * b)}} = ?`, A: a * b / 2, B: b, alt: [[a * b, 2 * b], [a * b / 2, 2 * b], [a * b, b]] }; } },
  { t: 'h1', type: 'exp', make: (r, v) => { const a = pick(r, [2, 3, 4]); return { a, q: `${pw(v, a)} · \\sqrt{${pw(v, 2 * a)}} = ${v}^{?}`, ans: 2 * a, alt: [3 * a, a * a] }; } },
  { t: 'h2', type: 'coefexp', make: (r, v) => { const k = pick(r, [4, 9, 16, 25]); const rk = Math.sqrt(k); const a = pick(r, [2, 4]); return { k, a, q: `\\sqrt{${k}${pw(v, a)}} = ?`, coef: rk, e: a / 2, alt: [[k, a / 2], [rk, a], [2 * rk, a / 2]] }; } },
  { t: 'h3', type: 'exp', make: (r, v) => { const a = pick(r, [3, 5, 7]), b = pick(r, [1, 3, 5]); return { a, b, q: `\\sqrt{${pw(v, a)}} · \\sqrt{${pw(v, b)}} = ${v}^{?}`, ans: (a + b) / 2, alt: [a + b, a * b] }; } },
  { t: 'h4', type: '2exp', make: (r, v, w) => { const a = randInt(r, 2, 3), b = randInt(r, 2, 3), c = pick(r, [2, 3]), d = randInt(r, 1, a * c - 1); return { a, b, c, d, q: `(${pw(v, a)}${pw(w, b)})^{${c}} ÷ ${pw(v, d)} = ?`, A: a * c - d, B: b * c, alt: [[a + c - d, b + c], [a * c, b * c], [a * c - d, b]] }; } },
  { t: 'h5', type: 'exp', make: (r, v) => { const a = randInt(r, 1, 4), b = randInt(r, a + 1, a + 6); return { a, b, q: `${pw(v, -a)} · ${pw(v, b)} = ${v}^{?}`, ans: b - a, alt: [a + b, -a * b] }; } },
];
const DIFF = { e: 0, m: 1, h: 2 };

// one slot of a "coefexp" / "2exp" answer: which slots can be asked (an exponent
// of 1 is not written, so it is never the slot), the printed rest, the answer
// and the typical mistakes for that slot (from the template's alt pairs)
function slotOf(tpl, ex, ask, v, w) {
  if (tpl.type === 'coefexp') {
    const { coef, e, alt } = ex;
    return ask === 'coef'
      ? { rhs: `?${pw(v, e)}`, ans: coef, wrongs: alt.map((x) => x[0]) }
      : { rhs: `${coef}${v}^{?}`, ans: e, wrongs: alt.map((x) => x[1]) };
  }
  const { A, B, alt } = ex;
  return ask === 'A'
    ? { rhs: `${v}^{?}${pw(w, B)}`, ans: A, wrongs: alt.map((x) => x[0]) }
    : { rhs: `${pw(v, A)}${w}^{?}`, ans: B, wrongs: alt.map((x) => x[1]) };
}
const slotsOf = (tpl, ex) => (tpl.type === 'coefexp' ? (ex.e === 1 ? ['coef'] : ['coef', 'A']) : ex.A === 1 ? ['B'] : ['A', 'B']);

export function mixed(r, want) {
  const diff = randInt(r, 0, 2);
  let list = COMBINED.filter((c) => DIFF[c.t[0]] === diff);
  // h1 (v^{a} · √(v^{2a}) = v^{2a}) prints its answer in the prompt: typed only
  if (want !== 'number') list = list.filter((c) => c.t !== 'h1');
  const tpl = pick(r, list);
  const [v, w] = pickVars(r);
  let ex = tpl.make(r, v, w);
  const meta = () => ({ t: tpl.t, type: tpl.type, v, w, a: ex.a, b: ex.b, c: ex.c, d: ex.d, k: ex.k });
  if (tpl.type === 'exp') {
    // as 4 choices, an exponent answer must not be a number printed in the prompt
    // (e.g. √(v³)·√(v³) = v³); re-roll the numbers (same template) a few times
    // (and h5's answer 1 has nothing below it but 0, so it would be the smallest choice)
    const giveaway = (e) => printed(e.q, e.ans) || (tpl.t === 'h5' && e.ans === 1);
    for (let k = 0; k < 20 && want !== 'number' && giveaway(ex); k++) ex = tpl.make(r, v, w);
    // negative exponents only as a mistake where the question itself has one (h5)
    return numberQuestion(r, want, `פשטו את הביטוי: $${ex.q}$`, ex.ans, ex.alt.filter((x) => x >= 0 || tpl.t === 'h5'), meta());
  }
  // a whole monomial on the topic page (k·v^e, v^A·w^B): ONE slot is asked here,
  // the rest is printed; as 4 choices the printed part must not contain the answer
  let ask, slot;
  for (let k = 0; ; k++) {
    ask = pick(r, slotsOf(tpl, ex));
    slot = slotOf(tpl, ex, ask, v, w);
    if (want === 'number' || k >= 20 || !printed(ex.q + slot.rhs, slot.ans)) break;
    ex = tpl.make(r, v, w);
  }
  return numberQuestion(r, want, `פשטו את הביטוי: $${ex.q.replace(/\?$/, slot.rhs)}$`, slot.ans,
    slot.wrongs.filter((x) => x >= 1), { ...meta(), ask }, ask === 'coef' ? POS : undefined); // no x^{−n} / 0·x forms
}
