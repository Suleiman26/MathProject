/* node --test src/topics/equation-solver/words.test.mjs
   "From words to an algebraic expression" (board #70): the parser and the by-value checker
   must be right, and every story template must give sensible numbers and working hints. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, evalAst, hasX, sameValue, check, plain, ERR, TEMPLATES, makeStory, storyDeck } from "./words.js";

const val = (s, x) => { const r = parse(s); assert.ok(r.ok, `should parse: ${s}`); return evalAst(r.ast, x); };
const same = (a, b) => sameValue(parse(a).ast, parse(b).ast);
// a small seeded random source, so failures can be repeated
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

test("parser: numbers, x, the four operations, parentheses", () => {
  assert.equal(val("2x-20", 15), 10);
  assert.equal(val("2 x − 20", 15), 10);
  assert.equal(val("-20+2x", 15), 10);
  assert.equal(val("2(x-10)", 15), 10);
  assert.equal(val("2·x", 4), 8);
  assert.equal(val("2×x", 4), 8);
  assert.equal(val("2*x", 4), 8);
  assert.equal(val("x·2", 4), 8);
  assert.equal(val("x÷2", 9), 4.5);
  assert.equal(val("x:2", 9), 4.5);
  assert.equal(val("x/2+4", 10), 9);
  assert.equal(val("1/2x", 10), 5);
  assert.equal(val("0.5x", 10), 5);
  assert.equal(val(".5x", 10), 5);
  assert.equal(val("(x+3)(x-1)", 2), 5);
  assert.equal(val("x(x+5)", 2), 14);
  assert.equal(val("3(x+1)2".replace(/2$/, ""), 2), 9);
  assert.equal(val("X+1", 2), 3);
  assert.equal(val("-(x-4)", 1), 3);
  assert.equal(val("--x", 3), 3);
  assert.equal(val("2-3-4", 0), -5);        // left to right
  assert.equal(val("12/2/3", 0), 2);
  assert.equal(val("2+3*4", 0), 14);        // order of operations
  assert.equal(val("100-8x", 5), 60);
  assert.equal(val("2 ( x + 1 )", 3), 8);
});

test("parser: refuses anything else, with the right reason", () => {
  const err = (s) => { const r = parse(s); assert.equal(r.ok, false, `should refuse: ${s}`); return r.err; };
  assert.equal(err(""), "empty");
  assert.equal(err("   "), "empty");
  assert.equal(err("y=2x"), "equals");
  assert.equal(err("2x=10"), "equals");
  assert.equal(err("2y"), "letter");
  assert.equal(err("שני x"), "letter");
  assert.equal(err("alert(1)"), "letter");
  assert.equal(err("x2"), "xnum");
  assert.equal(err("(x+1)2"), "xnum");
  assert.equal(err("2(x+1"), "paren");
  assert.equal(err("2x+1)"), "paren");
  assert.equal(err("()"), "paren");
  assert.equal(err("2x+"), "syntax");
  assert.equal(err("*2x"), "syntax");
  assert.equal(err("2 3"), "syntax");
  assert.equal(err("2++x"), "syntax");
  assert.equal(err("1.2.3"), "syntax");
  assert.equal(err("x²"), "char");
  assert.equal(err("√x"), "char");
  assert.equal(err("2,5x"), "char");
  assert.equal(err("x;1"), "char");
  for (const k of ["empty", "equals", "letter", "char", "xnum", "paren", "syntax", "zero"]) assert.ok(ERR[k], k);
});

test("checker: any equivalent form is accepted", () => {
  const part = { label: "הכסף של אבי", ans: "2x-20", traps: [["x+2-20", "פי"]], hint: "רמז" };
  for (const s of ["2x-20", "−20+2x", "2(x-10)", "x+x-20", "2x - 20", "2·x−20", "x*2-20", "(4x-40)/2", "2x+0-20", "-(20-2x)", "3x-x-20", "2x-10-10"]) {
    assert.deepEqual(check(s, part), { ok: true }, s);
  }
  const half = { label: "חצי", ans: "x/2+10", traps: [] };
  for (const s of ["x/2+10", "0.5x+10", "10+x÷2", "(x+20)/2", "1/2x+10", "x:2+10"]) assert.deepEqual(check(s, half), { ok: true }, s);
  const paren = { label: "חולצות", ans: "3(x-15)", traps: [] };
  for (const s of ["3(x-15)", "3x-45", "(x-15)3".replace(")3", ")*3"), "(x-15)+(x-15)+(x-15)"]) assert.deepEqual(check(s, paren), { ok: true }, s);
});

test("checker: wrong answers are rejected, with a helpful hint", () => {
  const a = { label: "הכסף של אבי", ans: "2x-20", traps: [["x+2-20", "פי 2 זה כפל"], ["2x+20", "נתן = פחות"]], hint: "רמז כללי" };
  const b = { label: "הכסף של אורן", ans: "x+20", traps: [["x-20", "קיבל = יותר"]], hint: "רמז ב" };
  const no = (s, part, others) => { const r = check(s, part, others); assert.equal(r.ok, false, s); return r; };
  assert.equal(no("x+2-20", a).msg, "פי 2 זה כפל");
  assert.equal(no("x-18", a).msg, "פי 2 זה כפל");           // the same mistake, written differently
  assert.equal(no("20+2x", a).msg, "נתן = פחות");
  assert.match(no("x+20", a, [a, b]).msg, /הכסף של אורן/);  // the other part's answer
  assert.match(no("2x-10", a).msg, /החלק עם \[\[x\]\] נכון/); // only the number is off
  assert.equal(no("3x-20", a).msg, "רמז כללי");
  assert.match(no("40", a).msg, /חייב להופיע/);             // no x at all
  assert.match(no("20-20", a).msg, /חייב להופיע/);
  assert.equal(no("20-2x", a).msg, "רמז כללי");
  assert.equal(no("x-20", b).msg, "קיבל = יותר");
  // not real tries: the box just is not an expression yet
  assert.equal(no("", a).format, true);
  assert.equal(no("2x-", a).format, true);
  assert.equal(no("y", a).format, true);
  assert.equal(no("2x=20", a).format, true);
  assert.equal(no("x/0", a).format, true);
  assert.equal(no("x/(2-2)", a).format, true);
  assert.equal(no("x-x+2x-21", a).format, undefined);
});

test("checker never runs code", () => {
  globalThis.__hit = 0;
  for (const s of ["globalThis.__hit=1", "(()=>{globalThis.__hit=1})()", "constructor", "x.constructor", "[1]", "`x`", "x;globalThis.__hit=1"]) {
    assert.equal(parse(s).ok, false, s);
  }
  assert.equal(globalThis.__hit, 0);
});

test("there are about 50 different stories, each with its own id", () => {
  assert.ok(TEMPLATES.length >= 50, `only ${TEMPLATES.length} templates`);
  assert.equal(new Set(TEMPLATES.map((t) => t[0])).size, TEMPLATES.length);
  const tags = new Set(TEMPLATES.map((t) => t[1]));
  assert.ok(tags.size >= 40, `only ${tags.size} different subjects`);
  // "most not about money"
  const money = TEMPLATES.filter((t, i) => /שקל/.test(makeStory(i, seeded(i + 1)).text)).length;
  assert.ok(money <= 8, `${money} money stories`);
});

test("every template: sensible numbers, right answers accepted, every trap gives its own hint", () => {
  for (let i = 0; i < TEMPLATES.length; i++) {
    for (let seed = 1; seed <= 300; seed++) {
      const s = makeStory(i, seeded(seed * 7919 + i));
      const where = `${s.id} (seed ${seed}): ${plain(s.text)}`;
      // the text
      assert.ok(!/undefined|NaN|null|\$\{|\[object/.test(s.text), where);
      assert.ok(s.text.includes("סמנו ב-[[x]] את"), where);
      assert.ok(s.text.includes("וכתבו ביטוי אלגברי"), where);
      assert.ok(!/\d[.,]\d/.test(s.text), "whole numbers only: " + where);
      assert.ok(!/[−-]\d/.test(s.text.replace(/[֐-׿]-\d/g, "")), "no negative numbers: " + where);
      assert.ok(!/(^|[^\d])0(?!\d)/.test(s.text.replace(/\d+/g, (d) => (d === "0" ? "0" : "9"))), "no zero amounts: " + where);
      const sentences = plain(s.text).split(/[.?!]\s/).length;
      assert.ok(sentences >= 2 && sentences <= 4, `2-4 sentences (${sentences}): ` + where);
      assert.ok(plain(s.text).length <= 330, "short: " + where);
      for (const m of s.text.matchAll(/\[\[(.*?)\]\]/g)) assert.ok(parse(m[1]).ok, `math in text: ${m[1]} in ` + where);
      // the answers
      assert.ok(s.parts.length >= 1 && s.parts.length <= 2, where);
      assert.ok(s.xr[0] <= s.xr[1] && s.xr[0] >= 0, "x range: " + where);
      s.parts.forEach((p, k) => {
        const pr = parse(p.ans);
        assert.ok(pr.ok && hasX(pr.ast), `answer ${p.ans}: ` + where);
        assert.ok(p.label && p.hint, where);
        for (const x of [s.xr[0], (s.xr[0] + s.xr[1]) / 2, s.xr[1]]) {
          const v = evalAst(pr.ast, x);
          assert.ok(Number.isFinite(v) && v > 0, `${p.ans} at x=${x} gives ${v}: ` + where);
        }
        assert.deepEqual(check(p.ans, p, s.parts), { ok: true }, where);
        assert.deepEqual(check(`(${p.ans})+0`, p, s.parts), { ok: true }, where);
        // traps: wrong, different from each other, and each gives its own hint
        (p.traps || []).forEach(([e, hint], t) => {
          const r = check(e, p, s.parts);
          assert.equal(r.ok, false, `trap ${e} must be wrong for ${p.ans}: ` + where);
          assert.equal(r.msg, hint, `trap ${e} of ${p.ans}: ` + where);
          assert.ok(hint && !/undefined|NaN/.test(hint), where);
          for (const m of hint.matchAll(/\[\[(.*?)\]\]/g)) assert.ok(parse(m[1]).ok, `math in hint: ${m[1]} in ` + where);
          (p.traps || []).forEach(([e2], t2) => { if (t2 > t) assert.ok(!same(e, e2), `traps ${e} and ${e2} are the same: ` + where); });
        });
        for (const m of p.hint.matchAll(/\[\[(.*?)\]\]/g)) assert.ok(parse(m[1]).ok, `math in hint: ${m[1]} in ` + where);
        // the two parts of a story are really different, and mixing them up is explained
        s.parts.forEach((o, k2) => {
          if (k2 === k) return;
          assert.ok(!same(p.ans, o.ans), "two parts with the same answer: " + where);
          const r = check(o.ans, p, s.parts);
          assert.equal(r.ok, false, where);
          assert.ok(r.msg && r.msg.length > 5, where);
        });
        // a plain number is never accepted
        assert.equal(check(String(Math.round(evalAst(pr.ast, s.xr[1]))), p, s.parts).ok, false, where);
      });
    }
  }
});

test("names: boys and girls both appear, and the verbs follow the name", () => {
  const r = seeded(42);
  let boys = 0, girls = 0;
  for (let n = 0; n < 400; n++) {
    const s = makeStory("bike", r);
    if (/ רכב על/.test(s.text)) { boys++; assert.ok(/שרכב,/.test(s.text) && /שעבר /.test(s.text), s.text); }
    else { girls++; assert.ok(/ רכבה על/.test(s.text) && /שרכבה,/.test(s.text) && /שעברה /.test(s.text), s.text); }
  }
  assert.ok(boys > 120 && girls > 120, `${boys} boys, ${girls} girls`);
});

test("deck: every story once before any repeats, never the same subject twice in a row", () => {
  const next = storyDeck(seeded(7));
  const seen = [];
  for (let n = 0; n < TEMPLATES.length * 4; n++) seen.push(next());
  for (let round = 0; round < 4; round++) {
    const ids = seen.slice(round * TEMPLATES.length, (round + 1) * TEMPLATES.length).map((s) => s.id);
    assert.equal(new Set(ids).size, TEMPLATES.length, `round ${round}`);
  }
  for (let n = 1; n < seen.length; n++) {
    assert.notEqual(seen[n].id, seen[n - 1].id);
    if (n % TEMPLATES.length !== 0) assert.notEqual(seen[n].tag, seen[n - 1].tag, `${seen[n].id} after ${seen[n - 1].id}`);
  }
});
