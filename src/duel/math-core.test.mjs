/* node --test src/duel/math-core.test.mjs
   The question markup (Task 2) → tree: $…$ islands, \frac, \sqrt, ^{n}. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitProse, parseMath, mathToText, proseToText, mathLength, isMathOnly, promptSize } from "./math-core.js";

test("prose splits into Hebrew text and math islands", () => {
  assert.deepEqual(splitProse("פתרו את המשוואה: $2x + 4 = x + 7$ — $x = ?$"), [
    { math: false, v: "פתרו את המשוואה: " }, { math: true, v: "2x + 4 = x + 7" }, { math: false, v: " — " }, { math: true, v: "x = ?" },
  ]);
  assert.deepEqual(splitProse("בלי מתמטיקה"), [{ math: false, v: "בלי מתמטיקה" }]);
  assert.deepEqual(splitProse("$3 : 4$"), [{ math: true, v: "3 : 4" }]);
  assert.deepEqual(splitProse("מחיר $ לא סגור"), [{ math: false, v: "מחיר $ לא סגור" }]);   // unbalanced → text
  assert.deepEqual(splitProse(""), []);
  assert.deepEqual(splitProse(null), []);
});

test("fractions, roots and exponents", () => {
  assert.deepEqual(parseMath("\\frac{1}{64}"), [{ t: "frac", n: [{ t: "txt", v: "1" }], d: [{ t: "txt", v: "64" }] }]);
  assert.deepEqual(parseMath("4^{−3} = ?"), [{ t: "txt", v: "4" }, { t: "sup", b: [{ t: "txt", v: "−3" }] }, { t: "txt", v: " = ?" }]);
  assert.deepEqual(parseMath("x^2"), [{ t: "txt", v: "x" }, { t: "sup", b: [{ t: "txt", v: "2" }] }]);
  assert.deepEqual(parseMath("\\sqrt{27} + \\sqrt{3}"), [{ t: "sqrt", b: [{ t: "txt", v: "27" }] }, { t: "txt", v: " + " }, { t: "sqrt", b: [{ t: "txt", v: "3" }] }]);
  assert.deepEqual(parseMath("4\\sqrt{3}"), [{ t: "txt", v: "4" }, { t: "sqrt", b: [{ t: "txt", v: "3" }] }]);
  // nested: a power inside a root, a root inside a fraction
  assert.deepEqual(parseMath("\\sqrt{t^{3}}"), [{ t: "sqrt", b: [{ t: "txt", v: "t" }, { t: "sup", b: [{ t: "txt", v: "3" }] }] }]);
  assert.deepEqual(parseMath("\\frac{\\sqrt{2}}{2}"), [{ t: "frac", n: [{ t: "sqrt", b: [{ t: "txt", v: "2" }] }], d: [{ t: "txt", v: "2" }] }]);
  assert.deepEqual(parseMath("n^{?}"), [{ t: "txt", v: "n" }, { t: "sup", b: [{ t: "txt", v: "?" }] }]);
});

test("broken markup never throws and stays readable", () => {
  assert.deepEqual(parseMath("\\frac{1}{"), [{ t: "txt", v: "frac{1}{" }]);
  assert.deepEqual(parseMath("\\sqrt"), [{ t: "txt", v: "sqrt" }]);
  assert.deepEqual(parseMath("2^"), [{ t: "txt", v: "2^" }]);
  assert.deepEqual(parseMath("\\pi"), [{ t: "txt", v: "pi" }]);
  assert.deepEqual(parseMath(""), []);
  assert.deepEqual(parseMath(undefined), []);
});

test("plain text for aria-labels", () => {
  assert.equal(mathToText("\\frac{1}{64} + 2^{3}"), "1/64 + 2^3");
  assert.equal(mathToText("4\\sqrt{3}"), "4√3");
  assert.equal(proseToText("חזקה שלילית: $4^{−3} = ?$"), "חזקה שלילית: 4^−3 = ?");
  assert.equal(mathLength("\\frac{1}{64}"), 4);
  assert.equal(mathLength("−14"), 3);
});

test("prompt size steps: short prose big, long prose smaller, short pure math biggest", () => {
  assert.equal(isMathOnly("$3 : 4$"), true);
  assert.equal(isMathOnly("כמה זה $3 + 4$?"), false);
  assert.equal(promptSize("$12 + 7 = ?$"), "xl");
  assert.equal(promptSize("$\\frac{1}{2} + \\frac{1}{3} + \\frac{1}{4} = ?$"), "s");
  assert.equal(promptSize("פתרו: $2x + 4 = 10$"), "s");
  assert.equal(promptSize("פתרו את המשוואה: $2x + 2 = x − 1$ — $x = ?$"), "m");
  assert.equal(promptSize("היחס בין עפרונות אדומים לעפרונות כחולים הוא $3 : 2$, ובסך הכל יש 15 עפרונות. כמה עפרונות אדומים?"), "l");
  assert.equal(promptSize(""), "s");
});
