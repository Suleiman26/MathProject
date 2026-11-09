// Powers and roots (grades 8–9) — ported from Sulaiman's
// src/topics/powers-roots/Topic.jsx (never edited).
// Answers with two or three slots on the topic page (coefficient + exponent,
// a√b, x^a·y^b) are asked here as ONE slot: the rest of the answer is printed
// ("(2b^{4})^{3} = ?b^{12}", "√8 + √2 = ?√2", "2 · 2 · 2 = 2^{?}").
// TYPED ONLY (kind 'number', even on a choice slot of the duel): every variant
// whose answer is ONE exponent / coefficient / count worked out from numbers
// printed in the question —
//   all of pr.powers (prod, rev, and calc since the final wave: "the perfect
//   square" found calc's answer), pr.param sub 0, 2, 4, pr.roots op 2, 3, and all
//   of pr.mixed (chapter 5: its exponent and one-slot templates alike).
// As 4 choices their right answer is a sum / half of printed numbers while the
// real mistakes multiply them, so "the choice nearest a printed number" picked
// it 50–79% of the time however the decoys were balanced. Typing a small
// number on the keypad is just as quick. duel.test.mjs holds the same list.
// Math markup: x^{n}, \sqrt{n}, \frac{a}{b}; his "x^3" → "x^{3}".
import { randInt, pick } from '../rng.js';
import { fmt, numberQuestion, choiceQuestion } from '../choices.js';

// a value or a root is positive: no "0" or negative choice there
const POS = { accept: (t) => Number(t.replace('−', '-')) >= 1 };
// a typed-only question (see the list above)
const typed = (prompt, ans, meta) => ({ kind: 'number', prompt, answer: String(ans), meta });

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
    // typed only: the exponent ("2 · 2 · 2 = 2^{?}") is the number of factors
    const { base, exp } = genBaseExpProduct(r);
    const chain = Array.from({ length: exp }, () => base).join(' · ');
    return typed(`כתבו את הכפל כחזקה: $${chain} = ${base}^{?}$`, exp, { v: 'prod', base, count: exp });
  }
  const ex = genCh1(r);
  if (ex.mode === 0) {
    const { base, exp, ans } = ex;
    // typed only (final wave): as 4 choices (base × exponent, one factor too few/many)
    // "the perfect square" found the answer ~48% of the time — the right power and its
    // ±1-exponent neighbours never share squareness. Typing the value is just as quick.
    return typed(`הבנת חזקות: $${pw(base, exp)} = ?$`, ans, { v: 'calc', base, exp });
  }
  // typed only: the exponent of a printed power ("81 = 3^{?}")
  const { base, exp, ans } = ex;
  return typed(`מצאו את המעריך: $${ans} = ${base}^{?}$`, exp, { v: 'rev', base, value: ans });
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
  const ex = genParam(r, sub);
  if (sub === 0) {
    // typed only: v^{a} · v^{b} = v^{?}
    const { a, b, ans } = ex;
    return typed(`${paramNames[sub]}: $${ex.q}$`, ans, { sub, a, b });
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
  // page; here ONE slot of it is asked, typed only — the coefficient ('coef')
  // or an exponent ('A' for v, 'B' for w) — and the other parts are printed.
  const { v, w } = ex;
  const n = sub === 2 ? ex.b : ex.c;
  const coef = Math.pow(ex.k, n), eA = ex.a * n, eB = sub === 4 ? ex.b * n : 0;
  const ask = pick(r, sub === 2 ? ['coef', 'A'] : ['coef', 'A', 'B']);
  const tail = sub === 4 ? pw(w, eB) : '';
  const [rhs, ans] = ask === 'coef' ? [`?${pw(v, eA)}${tail}`, coef]
    : ask === 'A' ? [`${coef}${v}^{?}${tail}`, eA]
      : [`${coef}${pw(v, eA)}${w}^{?}`, eB];
  const meta = sub === 2 ? { sub, k: ex.k, a: ex.a, b: ex.b, v, w, ask } : { sub, k: ex.k, a: ex.a, b: ex.b, c: ex.c, v, w, ask };
  return typed(`${paramNames[sub]}: $${ex.q.replace(/\?$/, rhs)}$`, ans, meta);
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
  const ex = genRoot(r, sub, op);
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
  // op 2 and 3 answer k√b on the topic page; here the root is printed and ONE
  // slot — the coefficient — is asked, typed only ("√8 + √2 = ?√2")
  if (ex.opType === 2) {
    const { base, k, m, ans } = ex;
    return typed(`${name}: $${rt(k, base)} + ${rt(m, base)} = ?\\sqrt{${base}}$`, ans, { sub, op: 2, base, k, m, ask: 'coef' });
  }
  const { a, b, coef, base } = ex;
  return typed(`${name}: $\\sqrt{${a}} + \\sqrt{${b}} = ?\\sqrt{${base}}$`, coef, { sub, op: 3, a, b, base, ask: 'coef' });
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

// one slot of a "coefexp" / "2exp" answer: the printed rest and the answer
function slotOf(tpl, ex, ask, v, w) {
  if (tpl.type === 'coefexp') {
    const { coef, e } = ex;
    return ask === 'coef' ? { rhs: `?${pw(v, e)}`, ans: coef } : { rhs: `${coef}${v}^{?}`, ans: e };
  }
  const { A, B } = ex;
  return ask === 'A' ? { rhs: `${v}^{?}${pw(w, B)}`, ans: A } : { rhs: `${pw(v, A)}${w}^{?}`, ans: B };
}
// which slots can be asked: an exponent of 1 is not written, so it is never the
// slot; h2's exponent (√(k·v^{a}), a = 2 or 4) is always 2 when it can be
// asked, so h2 asks the coefficient only (no constant answer)
const slotsOf = (tpl, ex) => (tpl.type === 'coefexp' ? (ex.e === 1 || tpl.t === 'h2' ? ['coef'] : ['coef', 'A']) : ex.A === 1 ? ['B'] : ['A', 'B']);

// typed only (see the top of this file): every template's answer is one exponent
// or one slot of a monomial, so the whole chapter is asked on the keypad
export function mixed(r) {
  const diff = randInt(r, 0, 2);
  const tpl = pick(r, COMBINED.filter((c) => DIFF[c.t[0]] === diff));
  const [v, w] = pickVars(r);
  const ex = tpl.make(r, v, w);
  const meta = { t: tpl.t, type: tpl.type, v, w, a: ex.a, b: ex.b, c: ex.c, d: ex.d, k: ex.k };
  // the answer is one missing number of an equation that is half printed
  if (tpl.type === 'exp') return typed(`השלימו את המספר החסר: $${ex.q}$`, ex.ans, meta);
  // a whole monomial on the topic page (k·v^e, v^A·w^B): ONE slot is asked here
  const ask = pick(r, slotsOf(tpl, ex));
  const slot = slotOf(tpl, ex, ask, v, w);
  return typed(`השלימו את המספר החסר: $${ex.q.replace(/\?$/, slot.rhs)}$`, slot.ans, { ...meta, ask });
}
