/* node --test src/duel/math-core.test.mjs
   The question markup (Task 2) → tree: $…$ islands, \frac, \sqrt, ^{n}. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitProse, parseMath, mathToText, proseToText, mathLength, isMathOnly, promptSize, mathBreaks, fitPrompt } from "./math-core.js";

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

test("prompt size steps: by the words only (the ask line); a prompt with no words is xl", () => {
  assert.equal(isMathOnly("$3 : 4$"), true);
  assert.equal(isMathOnly("כמה זה $3 + 4$?"), false);
  assert.equal(promptSize("$12 + 7 = ?$"), "xl");
  assert.equal(promptSize("$\\frac{1}{2} + \\frac{1}{3} + \\frac{1}{4} = ?$"), "xl");
  assert.equal(promptSize("פתרו: $2x + 4 = 10$"), "s");
  assert.equal(promptSize("פתרו את המשוואה: $2x + 2 = x − 1$ — $x = ?$"), "m");
  assert.equal(promptSize("היחס בין עפרונות אדומים לעפרונות כחולים הוא $3 : 2$, ובסך הכל יש 15 עפרונות. כמה עפרונות אדומים?"), "l");
  assert.equal(promptSize(""), "s");
});

test("prompt size: a long expression never makes the words smaller (dn.combo: the math stays the hero)", () => {
  // the formula row has its own size (--q-math, fitted by Arena); promptSize only sizes the words
  assert.equal(promptSize("חשבו לפי סדר פעולות החשבון:\n$−6 × (−24) ÷ 4 + 7 − 7 = ?$"), "s");
  assert.equal(promptSize("חשבו לפי סדר פעולות החשבון:\n$−6 × (−24) ÷ 4 + 7 − 7 = ?$"), promptSize("חשבו לפי סדר פעולות החשבון:\n$1 + 1 = ?$"));
  assert.equal(promptSize("חשבו:\n$3 + 4 × 2 − 1 = ?$"), "s");
});

test("line roles: ask (words) / eq (formula row) / target (the asked quantity, last line)", async () => {
  const { lineRole } = await import("./math-core.js");
  const roles = (p) => { const ls = p.split("\n"); return ls.map((l, i) => lineRole(l, i, ls)); };
  assert.deepEqual(roles("סדרו את המשוואה לצורה הכללית $x^{2} + bx + c = 0$\n$x^{2} + 8x + 11 = 2x + 3$\n$b = ?$"), ["ask", "eq", "target"]);
  assert.deepEqual(roles("מה הנפח של גליל עם רדיוס $6$ וגובה $2$?\n$V = ?π$"), ["ask", "target"]);
  assert.deepEqual(roles("מה שטח הפנים הכולל של גליל עם רדיוס $3$ וגובה $12$?\n$S = ?π$"), ["ask", "target"]);
  assert.deepEqual(roles("מה הנפח של פירמידה עם גובה $8$ ושטח בסיס $36\\sqrt{3}$?\n$V = ?\\sqrt{3}$"), ["ask", "target"]);
  assert.deepEqual(roles("מה גודל הזווית?\n$x = ?°$"), ["ask", "target"]);
  assert.deepEqual(roles("מה גודל הזווית?\n$? °$"), ["ask", "target"]);
  // a math-only middle line is a formula row; two formula rows
  assert.deepEqual(roles("מהו ערך $x$ בנקודת החיתוך של שני הישרים?\n$y = −3x + 7$\n$y = x − 1$"), ["ask", "eq", "eq"]);
  assert.deepEqual(roles("מהו השיפוע של הישר שעובר דרך שתי הנקודות?\n$A(−4, −1)   B(1, −6)$\n$m = ?$"), ["ask", "eq", "target"]);
  // the expression to compute is the hero, not a target, even when it ends with "= ?"
  assert.deepEqual(roles("חשבו:\n$2^{2} = ?$"), ["ask", "eq"]);
  assert.deepEqual(roles("חשבו לפי סדר פעולות החשבון:\n$−6 × (−24) ÷ 4 + 7 − 7 = ?$"), ["ask", "eq"]);
  // short "… = ?" after a formula row is the asked quantity
  assert.deepEqual(roles("נתון:\n$a = 3$\n$2a = ?$"), ["ask", "eq", "target"]);
  // a single prose line is ask; a single math line is the whole question (eq), never a target
  assert.equal(lineRole("כמה זה 30% מ-40?"), "ask");
  assert.equal(lineRole("$b = ?$"), "eq");
  assert.equal(lineRole("$b = ?$", 0, ["$b = ?$"]), "eq");
  // a long math last line is a formula row
  assert.deepEqual(roles("פתרו:\n$x + 2 = 9$\n$3x + 2y − 7 = ?$"), ["ask", "eq", "eq"]);
});

test("target parts: around the ?", async () => {
  const { targetParts } = await import("./math-core.js");
  assert.deepEqual(targetParts("$S = ?π$"), { before: "S =", after: "π" });
  assert.deepEqual(targetParts("$b = ?$"), { before: "b =", after: "" });
  assert.deepEqual(targetParts("$V = ?\\sqrt{3}$"), { before: "V =", after: "\\sqrt{3}" });
  assert.deepEqual(targetParts("$? °$"), { before: "", after: "°" });
});

test("tidy lines: a colon right after a math island is dropped when a formula row follows", async () => {
  const { tidyLines } = await import("./math-core.js");
  assert.deepEqual(tidyLines(["סדרו את המשוואה לצורה $x^{2} + bx + c = 0$:", "$x^{2} + 8x = 3$", "$b = ?$"]),
    ["סדרו את המשוואה לצורה $x^{2} + bx + c = 0$", "$x^{2} + 8x = 3$", "$b = ?$"]);
  assert.deepEqual(tidyLines(["סדרו לצורה $x = 0$ :", "$x = 1$"]), ["סדרו לצורה $x = 0$", "$x = 1$"]);
  // a colon after words stays; a last line keeps its colon; formula rows untouched
  assert.deepEqual(tidyLines(["פתרו את המשוואה:", "$2x = 4$"]), ["פתרו את המשוואה:", "$2x = 4$"]);
  assert.deepEqual(tidyLines(["חשבו את $2 + 2$:"]), ["חשבו את $2 + 2$:"]);
  assert.deepEqual(tidyLines("סדרו לצורה $x = 0$:\n$x = 1$"), ["סדרו לצורה $x = 0$", "$x = 1$"]);
  // aria keeps the original text
  assert.equal(proseToText("סדרו לצורה $x = 0$:\n$x = 1$"), "סדרו לצורה x = 0: x = 1");
});

test("math breaks: a line may only end right before an operator", () => {
  const nb = "\u00a0";
  assert.equal(mathBreaks("−14 + 7 × 7 − (−9) ÷ 9 = ?"), `−14 +${nb}7 ×${nb}7 −${nb}(−9) ÷${nb}9 =${nb}?`);
  assert.equal(mathBreaks("2x + 4 = 10"), `2x +${nb}4 =${nb}10`);
  assert.equal(mathBreaks("3 : 4"), `3 :${nb}4`);
  assert.equal(mathBreaks("x"), "x");
  // no break opportunity after an operator: the next line never begins with a number after a dangling "−"
  assert.ok(!/[−+×÷=] /.test(mathBreaks("−1 × (−27) ÷ 3 + (−15) − (−13) = ?")));
});

test("fit: fits → same size; too wide → scaled down to the floor; beyond the floor → wrap", () => {
  assert.deepEqual(fitPrompt({ widest: 300, avail: 339, fontPx: 28 }), { fontPx: 28, wrap: false });
  const a = fitPrompt({ widest: 400, avail: 339, fontPx: 28 });
  assert.equal(a.wrap, false); assert.ok(a.fontPx < 28 && a.fontPx >= 19.2 && a.fontPx * 400 / 28 <= 339);
  assert.deepEqual(fitPrompt({ widest: 700, avail: 284, fontPx: 24.8 }), { fontPx: 24, wrap: true });
  assert.deepEqual(fitPrompt({ widest: 700, avail: 284, fontPx: 20 }), { fontPx: 20, wrap: true });
  assert.deepEqual(fitPrompt({ widest: 0, avail: 284, fontPx: 20 }), { fontPx: 20, wrap: false });
});

test("prompt lines: words, then each formula on its own line", async () => {
  const { promptLines } = await import("./math-core.js");
  const p = "מה ערך ה-$x$ בנקודת החיתוך?\n$y = x + 1$\n$y = 3x − 5$";
  assert.deepEqual(promptLines(p), ["מה ערך ה-$x$ בנקודת החיתוך?", "$y = x + 1$", "$y = 3x − 5$"]);
  assert.deepEqual(promptLines("שורה אחת $2 + 2$"), ["שורה אחת $2 + 2$"]);
  assert.deepEqual(promptLines("א\n\n  \n$1$"), ["א", "$1$"]);
  assert.equal(isMathOnly(p), false);
  assert.equal(isMathOnly("$x + 1 = 3$\n$x = ?$"), true);
  assert.equal(proseToText(p), "מה ערך ה-x בנקודת החיתוך? y = x + 1 y = 3x − 5");
  // sized by the words only (formula rows have their own size)
  assert.equal(promptSize("פתרו את המשוואה:\n$2x − 3 = x − 10$"), "s");
  assert.equal(promptSize(p), "s");
  assert.equal(promptSize("פתרו את המשוואה:\n$\\frac{(x − 4)^{2}}{4} − 16 = \\frac{x^{2} − 16}{4}$"), "s");   // long island: fit shrinks the row, not the words
});

test("units: added on screen after a pure-number answer", async () => {
  const { withUnit } = await import("./math-core.js");
  assert.equal(withUnit("60", "°"), "60°");
  assert.equal(withUnit("40", "%"), "40%");
  assert.equal(withUnit("84", "₪"), "84 ₪");
  assert.equal(withUnit("12", "π"), "12π");
  assert.equal(withUnit("1", "π"), "π");
  assert.equal(withUnit("−1", "π"), "−π");
  assert.equal(withUnit("\\frac{3}{2}", "π"), "\\frac{3}{2}π");
  assert.equal(withUnit("100", "√3"), "100\\sqrt{3}");
  assert.equal(withUnit("7", ""), "7");
  assert.equal(withUnit("7", "kg"), "7");
  assert.equal(withUnit("", "°"), "");
});
