/* The "חדש" module (fixes board #84): shared pure helpers. No React here, so every
   chapter and generator can be run and checked with node (see new.test.mjs).

   ── A chapter (one file in ./chapters/<pack>/) ───────────────────────────────
   {
     id: 'like-terms',                 // latin, unique
     name: 'כינוס איברים דומים',        // the chapter button reads "<n>. <name>"
     grade: 'ז׳',                      // 'ז׳' | 'ח׳' | 'ט׳' | 'ז׳–ח׳' …
     about: 'one plain line: what the chapter is about',
     place: 'where Sulaiman should put it, e.g. משוואות ← אחרי "1. ביטוי אלגברי"',
     lesson: [ { t: 'card title', items: [ <item>, … ] }, … ],
     gens: [ { id, make(R) → question, verify(q) → true | 'what is wrong' }, … ],
   }
   Lesson items:  'rich paragraph'  |  { f: 'math' }  (a centred formula)
     | { list: ['rich', …] }  |  { note: 'rich' }  |  { fig: {…} }
     | { ex: 'rich question', sol: ['rich step', …] }   (a worked example)

   ── A question (what make(R) returns) ────────────────────────────────────────
   {
     tag: 'short name of the exercise type',
     text: 'the story / question, rich',
     fig: { type: 'bars' | 'table' | 'grid' | …, … }      // optional, see figs*.jsx
     rows: [ { label: 'rich', parts: [ 'math', { ans: 12 }, { t: 'ס״מ' }, … ] }, … ]
       // OR
     choices: { options: ['rich', …], correct: 0 },
     swap: [ [ [0], [1] ] ],     // optional: answer boxes (numbered in reading order) whose
                                 // order does not matter; [[ [0,1], [2,3] ]] swaps pairs
     hint: 'rich',               // optional, shown with a wrong answer
     steps: ['rich', …],         // the worked solution (shown after solving / on request)
     data: { … },                // the raw numbers, for verify()
   }
   Row parts:  'math string' (drawn left-to-right, see rich.jsx for the syntax)
     { t: 'Hebrew or unit text' }
     { ans: 12 }            a number box (also negative / decimal). { ans: 3.14, tol: 0.01 }
     { frac: [3, 4] }       a stacked fraction box; any equal fraction is accepted
                            ({ frac: [3, 4], reduced: true } asks for the reduced one)

   ── Rich text ────────────────────────────────────────────────────────────────
   Hebrew with [[math]] inside. Math syntax: {a|b} stacked fraction, x^2 / x^{10} power,
   √(…) root, * → ·, - → −, <= >= != → ≤ ≥ ≠, x_1 index, lowercase latin letters italic. */

/* ── random ───────────────────────────────────────────────────────────────── */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
/** The random helper every generator receives. */
export function makeR(rand = Math.random) {
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return {
    rand, int, pick, shuffle,
    bool: (p = 0.5) => rand() < p,
    /** a whole number in [a, b] that is not 0 (and not in `not`) */
    nz: (a, b, not = []) => { for (let k = 0; k < 200; k++) { const v = int(a, b); if (v !== 0 && !not.includes(v)) return v; } return a || 1; },
    sign: () => (rand() < 0.5 ? -1 : 1),
  };
}

/* ── numbers ──────────────────────────────────────────────────────────────── */
export function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
export function reduce(n, d) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return [n / g, d / g]; }
export const round = (v, places = 2) => { const p = 10 ** places; return Math.round((v + Number.EPSILON) * p) / p; };

/** A number as math text: "−3", "2.5" (no float noise, at most 3 decimals). */
export function num(v) {
  const r = round(v, 3);
  const s = String(Math.abs(r));
  return (r < 0 ? '-' : '') + s;
}
/** "+ 3" / "- 3" for the middle of an expression. */
export const signed = (v) => (v < 0 ? `- ${num(-v)}` : `+ ${num(v)}`);
/** A fraction as math text, reduced: "{3|4}", "2", "-{1|2}". */
export function fracStr(n, d) {
  const [a, b] = reduce(n, d);
  if (b === 1) return num(a);
  return (a < 0 ? '-' : '') + `{${Math.abs(a)}|${b}}`;
}
/** coefficient · symbol: term(1,'x') → "x", term(-1,'x') → "-x", term(3,'x^2') → "3x^2", term(5,'') → "5". */
export function term(c, sym = '') {
  if (!sym) return num(c);
  if (c === 1) return sym;
  if (c === -1) return '-' + sym;
  return num(c) + sym;
}
/** A sum of terms as math text, skipping zeros: sum([[2,'x^2'],[-3,'x'],[1,'']]) → "2x^2 - 3x + 1". */
export function sum(terms) {
  const ts = terms.filter(([c]) => c !== 0);
  if (!ts.length) return '0';
  return ts.map(([c, sym], i) => (i === 0 ? term(c, sym) : (c < 0 ? '- ' : '+ ') + term(Math.abs(c), sym))).join(' ');
}
/** A polynomial in x from its coefficients, highest power first: poly([1,-5,6]) → "x^2 - 5x + 6". */
export function poly(coefs, v = 'x') {
  const n = coefs.length - 1;
  return sum(coefs.map((c, i) => [c, n - i === 0 ? '' : n - i === 1 ? v : `${v}^${n - i}`]));
}
/** (x + 3), (x - 2), x  — a linear factor in brackets. */
export const factor = (r, v = 'x') => (r === 0 ? v : `(${v} ${signed(r)})`);

/* ── checking answers ─────────────────────────────────────────────────────── */
/** What the student typed → a number, or null. Accepts "−3", "-3", "2.5", "2,5". */
export function parseNum(s) {
  const t = String(s == null ? '' : s).trim().replace(/[−–]/g, '-').replace(',', '.').replace(/\s+/g, '');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}
const isInt = (v) => v !== null && Number.isInteger(v);

/** All answer boxes of a question, in reading order. */
export function boxesOf(q) {
  const out = [];
  (q.rows || []).forEach((row) => row.parts.forEach((p) => { if (p && typeof p === 'object' && ('ans' in p || 'frac' in p)) out.push(p); }));
  return out;
}
export const emptyValue = (box) => ('frac' in box ? ['', ''] : '');
export const isEmpty = (box, v) => ('frac' in box ? !String(v[0]).trim() && !String(v[1]).trim() : !String(v).trim());

/** One box against one typed value → { ok } | { ok:false, format:true, msg } | { ok:false, msg? } */
export function checkBox(box, v) {
  if ('frac' in box) {
    const n = parseNum(v[0]), d = parseNum(v[1]);
    if (!String(v[0]).trim() || !String(v[1]).trim()) return { ok: false, format: true, msg: 'בשבר ממלאים גם מונה וגם מכנה.' };
    if (!isInt(n) || !isInt(d)) return { ok: false, format: true, msg: 'במונה ובמכנה כותבים מספרים שלמים.' };
    if (d === 0) return { ok: false, format: true, msg: 'המכנה לא יכול להיות 0.' };
    const [an, ad] = box.frac;
    if (n * ad !== an * d) return { ok: false };
    if (box.reduced) { const [rn, rd] = reduce(an, ad); if (Math.abs(n) !== Math.abs(rn) || Math.abs(d) !== Math.abs(rd)) return { ok: false, format: true, msg: 'השבר נכון, אבל אפשר עוד לצמצם אותו.' }; }
    return { ok: true };
  }
  const x = parseNum(v);
  if (x === null) return { ok: false, format: true, msg: 'כותבים כאן מספר בלבד.' };
  const tol = box.tol != null ? box.tol : 1e-9;
  return { ok: Math.abs(x - box.ans) <= tol + 1e-12 };
}

function perms(n) { if (n <= 1) return [[0]]; const out = []; const go = (a, rest) => { if (!rest.length) { out.push(a); return; } rest.forEach((r, i) => go([...a, r], rest.filter((_, j) => j !== i))); }; go([], [...Array(n).keys()]); return out; }

/**
 * All boxes at once. values[i] belongs to box i (reading order). Boxes named in q.swap may
 * be answered in any order. Returns { res: [per box: null (empty) | {ok,…}], solved }.
 */
export function checkAll(q, values) {
  const boxes = boxesOf(q);
  // which answer each box is checked against (identity, unless a swap group fits better)
  const target = boxes.map((_, i) => i);
  (q.swap || []).forEach((group) => {
    let best = null, bestScore = -1;
    perms(group.length).forEach((pm) => {
      let score = 0;
      group.forEach((tuple, gi) => tuple.forEach((bi, k) => {
        const want = boxes[group[pm[gi]][k]];
        if (!isEmpty(boxes[bi], values[bi]) && checkBox(want, values[bi]).ok) score++;
      }));
      if (score > bestScore) { bestScore = score; best = pm; }
    });
    group.forEach((tuple, gi) => tuple.forEach((bi, k) => { target[bi] = group[best[gi]][k]; }));
  });
  const res = boxes.map((b, i) => (isEmpty(b, values[i]) ? null : checkBox(boxes[target[i]], values[i])));
  return { res, solved: res.length > 0 && res.every((r) => r && r.ok) };
}

/* ── validation (used by the tests; a generator that breaks the contract fails) ── */
const BAD = /undefined|NaN|Infinity|\[object/;
function balanced(s) { let d = 0; for (const m of String(s).matchAll(/\[\[|\]\]/g)) { d += m[0] === '[[' ? 1 : -1; if (d < 0 || d > 1) return false; } return d === 0; }
function richOk(s, where, errs) {
  if (typeof s !== 'string' || !s.trim()) { errs.push(`${where}: empty text`); return; }
  if (BAD.test(s)) errs.push(`${where}: broken value in "${s}"`);
  if (!balanced(s)) errs.push(`${where}: unbalanced [[ ]] in "${s}"`);
  if (/\+ -|- -|\+ \+|--|\+-/.test(s.replace(/\s+/g, ' '))) errs.push(`${where}: double sign in "${s}"`);
}
export function validate(q) {
  const errs = [];
  if (!q || typeof q !== 'object') return ['not an object'];
  richOk(q.tag, 'tag', errs); richOk(q.text, 'text', errs);
  if (!Array.isArray(q.steps) || !q.steps.length) errs.push('steps missing'); else q.steps.forEach((s, i) => richOk(s, `steps[${i}]`, errs));
  if (q.hint != null) richOk(q.hint, 'hint', errs);
  if (!!q.rows === !!q.choices) errs.push('needs exactly one of rows / choices');
  if (q.choices) {
    const { options, correct } = q.choices;
    if (!Array.isArray(options) || options.length < 2) errs.push('choices: too few options');
    else {
      options.forEach((o, i) => richOk(o, `option[${i}]`, errs));
      if (new Set(options).size !== options.length) errs.push(`choices: repeated option (${options.join(' | ')})`);
      if (!(correct >= 0 && correct < options.length)) errs.push('choices: correct out of range');
    }
  }
  if (q.rows) {
    const boxes = boxesOf(q);
    if (!boxes.length) errs.push('rows: no answer box');
    q.rows.forEach((row, ri) => {
      if (row.label != null) richOk(row.label, `rows[${ri}].label`, errs);
      row.parts.forEach((p, pi) => {
        const w = `rows[${ri}].parts[${pi}]`;
        if (typeof p === 'string') { if (BAD.test(p) || !p.trim()) errs.push(`${w}: bad math "${p}"`); }
        else if (p && 't' in p) richOk(p.t, w, errs);
        else if (p && 'ans' in p) { if (typeof p.ans !== 'number' || !Number.isFinite(p.ans)) errs.push(`${w}: answer is not a number`); else if (p.tol == null && Math.abs(p.ans - round(p.ans, 3)) > 1e-9) errs.push(`${w}: answer ${p.ans} has more than 3 decimals and no tol`); }
        else if (p && 'frac' in p) { const [n, d] = p.frac || []; if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) errs.push(`${w}: bad fraction`); }
        else errs.push(`${w}: unknown part`);
      });
    });
    (q.swap || []).forEach((g) => g.forEach((tuple) => tuple.forEach((bi) => { if (!(bi >= 0 && bi < boxes.length)) errs.push('swap: box index out of range'); })));
  }
  return errs;
}
export function validateChapter(ch) {
  const errs = [];
  ['id', 'name', 'grade', 'about', 'place'].forEach((k) => { if (typeof ch[k] !== 'string' || !ch[k].trim()) errs.push(`chapter.${k} missing`); });
  if (!Array.isArray(ch.lesson) || !ch.lesson.length) errs.push('lesson missing');
  (ch.lesson || []).forEach((card, ci) => {
    richOk(card.t, `lesson[${ci}].t`, errs);
    (card.items || []).forEach((it, ii) => {
      const w = `lesson[${ci}].items[${ii}]`;
      if (typeof it === 'string') richOk(it, w, errs);
      else if (it.f != null) { if (BAD.test(it.f) || !String(it.f).trim()) errs.push(`${w}: bad formula`); }
      else if (it.list) it.list.forEach((s) => richOk(s, w, errs));
      else if (it.note != null) richOk(it.note, w, errs);
      else if (it.ex != null) { richOk(it.ex, w, errs); (it.sol || []).forEach((s) => richOk(s, w + '.sol', errs)); if (!(it.sol || []).length) errs.push(`${w}: example without a solution`); }
      else if (!it.fig) errs.push(`${w}: unknown lesson item`);
    });
  });
  if (!Array.isArray(ch.gens) || ch.gens.length < 2) errs.push('needs at least 2 generators');
  (ch.gens || []).forEach((g) => { if (!g.id || typeof g.make !== 'function' || typeof g.verify !== 'function') errs.push(`generator ${g.id || '?'}: needs id, make, verify`); });
  return errs;
}

/** Gives one question after another, going through the chapter's generators in a shuffled round. */
export function deck(ch, rand = Math.random) {
  const R = makeR(rand);
  let round = [];
  return () => { if (!round.length) round = R.shuffle(ch.gens); const g = round.pop(); const q = g.make(R); return { ...q, gen: g.id, key: `${g.id}-${Math.floor(rand() * 1e9)}` }; };
}
