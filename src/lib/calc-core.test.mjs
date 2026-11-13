/* node --test src/lib/calc-core.test.mjs
   The side calculator on topic pages: the parser must be right (students trust it). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, format, plain, pressKey, toggleSign, closed, insertValue, errorText } from "./calc-core.js";

const val = (s) => { const r = evaluate(s); assert.ok(r.ok, s + " → " + r.error); return r.value; };
const err = (s) => { const r = evaluate(s); assert.equal(r.ok, false, s + " should fail"); return r.error; };

test("the four operations and their order", () => {
  assert.equal(val("2+3×4"), 14);
  assert.equal(val("2×3+4"), 10);
  assert.equal(val("20−8÷4"), 18);
  assert.equal(val("10−4−3"), 3);       // left to right
  assert.equal(val("100÷10÷2"), 5);     // left to right
  assert.equal(val("2+3×4−6÷2"), 11);
});

test("parentheses", () => {
  assert.equal(val("(2+3)×4"), 20);
  assert.equal(val("2×(3+(4−1))"), 12);
  assert.equal(val("((7))"), 7);
  assert.equal(val("(2+3"), 5);          // the last ")" may be missing
  assert.equal(val("2×(3+4"), 14);
  assert.equal(val("√(9+16"), 5);
});

test("unary minus", () => {
  assert.equal(val("−5+3"), -2);
  assert.equal(val("4×−3"), -12);
  assert.equal(val("8÷−2"), -4);
  assert.equal(val("2−−3"), 5);
  assert.equal(val("−(2+3)"), -5);
  assert.equal(val("5×(−3)"), -15);
  assert.equal(val("−3²"), -9);          // the square binds first
  assert.equal(val("(−3)²"), 9);
});

test("square, root, pi, percent", () => {
  assert.equal(val("3²+4²"), 25);
  assert.equal(val("√(3²+4²)"), 5);
  assert.equal(val("√16"), 4);
  assert.equal(val("2√16"), 8);
  assert.equal(val("√2"), 1.414213562);
  assert.equal(val("√√16"), 2);
  assert.equal(val("2²²"), 16);
  assert.equal(val("π"), 3.141592654);
  assert.equal(val("2π"), 6.283185307);
  assert.equal(val("π×5²"), 78.53981634);
  assert.equal(val("2π×3"), 18.84955592);
  assert.equal(val("50%"), 0.5);
  assert.equal(val("20%×150"), 30);
  assert.equal(val("150×20%"), 30);
  assert.equal(val("200+10%"), 220);      // like a phone calculator
  assert.equal(val("80−25%"), 60);
  assert.equal(val("30÷120×100"), 25);
});

test("multiplying without a sign", () => {
  assert.equal(val("3(4+1)"), 15);
  assert.equal(val("(2)(3)"), 6);
  assert.equal(val("2(3)²"), 18);
  assert.equal(val("12÷2(3)"), 18);       // same strength as ×, left to right
});

test("decimals are rounded sensibly", () => {
  assert.equal(val("0.1+0.2"), 0.3);
  assert.equal(val("0.1+0.2−0.3"), 0);
  assert.equal(val("1.1×3"), 3.3);
  assert.equal(val("0.7+0.1"), 0.8);
  assert.equal(val("1÷3"), 0.3333333333);
  assert.equal(val("2÷3"), 0.6666666667);
  assert.equal(val("4.35×100"), 435);
  assert.equal(val(".5+.5"), 1);
  assert.equal(val("5.+1"), 6);
  assert.equal(val("3,5×2"), 7);          // a comma typed as the decimal point
  assert.equal(format(val("0.1+0.2")), "0.3");
  assert.equal(format(val("1÷3")), "0.3333333333");
  assert.equal(format(val("2−5")), "−3");
  assert.equal(format(val("1000000×1000000")), "1000000000000");
  assert.equal(format(val("123456×10000000000")), "1.23456×10¹⁵");
  assert.equal(format(val("123456789×1000")), "123456789000");
  assert.equal(format(val("1÷8000000")), "1.25×10⁻⁷");
  assert.equal(format(val("99999×99999")), "9999800001");
});

test("keyboard signs are understood", () => {
  assert.equal(val("6*7"), 42);
  assert.equal(val("9/3"), 3);
  assert.equal(val("9-3"), 6);
  assert.equal(val(" 2 + 2 "), 4);
});

test("errors", () => {
  assert.equal(err("5÷0"), "undefined");
  assert.equal(err("5÷(3−3)"), "undefined");
  assert.equal(err("0÷0"), "undefined");
  assert.equal(err("√(−4)"), "undefined");
  assert.equal(err(""), "empty");
  assert.equal(err("2+"), "syntax");
  assert.equal(err("×3"), "syntax");
  assert.equal(err("()"), "syntax");
  assert.equal(err("2+)"), "syntax");
  assert.equal(err("(2+3)4)"), "syntax");
  assert.equal(err("1.2.3"), "syntax");
  assert.equal(err("²"), "syntax");
  assert.equal(err("2+a"), "syntax");
  assert.equal(err("alert(1)"), "syntax");
  assert.equal(err("9".repeat(60) + "²²"), "big");
  assert.equal(errorText("undefined"), "לא מוגדר");
  assert.equal(errorText("empty"), "");
});

test("never runs code", () => {
  globalThis.__calcHit = 0;
  for (const s of ["globalThis.__calcHit=1", "(()=>{globalThis.__calcHit=1})()", "constructor", "__proto__", "1;2"]) {
    assert.equal(evaluate(s).ok, false);
  }
  assert.equal(globalThis.__calcHit, 0);
  delete globalThis.__calcHit;
});

test("agrees with plain JavaScript on many random sums", () => {
  let seed = 12345;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const ops = ["+", "−", "×", "÷"], js = { "+": "+", "−": "-", "×": "*", "÷": "/" };
  for (let i = 0; i < 2000; i++) {
    const n = 2 + rnd(4);
    let ours = "", theirs = 0, parts = [];
    for (let k = 0; k < n; k++) {
      const num = (1 + rnd(99)) / (rnd(2) ? 1 : 10);
      if (k) { const o = ops[rnd(4)]; ours += o; parts.push(js[o]); }
      ours += String(num); parts.push(num);
    }
    // the reference: × ÷ first, then + −, done by hand (no eval here either)
    const st = [parts[0]];
    for (let k = 1; k < parts.length; k += 2) {
      const o = parts[k], b = parts[k + 1];
      if (o === "*") st[st.length - 1] *= b; else if (o === "/") st[st.length - 1] /= b; else st.push(o, b);
    }
    theirs = st[0];
    for (let k = 1; k < st.length; k += 2) theirs = st[k] === "+" ? theirs + st[k + 1] : theirs - st[k + 1];
    const got = val(ours);
    assert.ok(Math.abs(got - theirs) <= 1e-9 * Math.max(1, Math.abs(theirs)), ours + " → " + got + " (expected " + theirs + ")");
  }
});

test("typing key by key", () => {
  const type = (keys, start = "", fresh = false) => keys.reduce((s, k, i) => pressKey(s, k, fresh && i === 0), start);
  assert.equal(type(["3", "²", "+", "4", "²"]), "3²+4²");
  assert.equal(type(["√", "9", "+", "1", "6"]), "√(9+16");
  assert.equal(closed("√(9+16"), "√(9+16)");
  assert.equal(type(["√", "⌫"]), "");
  assert.equal(type(["1", "2", "⌫"]), "1");
  assert.equal(type(["5", "+", "×"]), "5×");          // a new sign replaces the old one
  assert.equal(type(["5", "×", "−", "3"]), "5×−3");   // but × then − is a negative number
  assert.equal(type(["5", "×", "−", "+"]), "5+");
  assert.equal(type(["×"]), "");                      // nothing to multiply yet
  assert.equal(type(["−", "5"]), "−5");
  assert.equal(type(["(", "×"]), "(");
  assert.equal(type(["1", ".", ".", "5", "."]), "1.5");
  assert.equal(type(["."]), "0.");
  assert.equal(type(["2", "+", ".", "5"]), "2+0.5");
  assert.equal(type([")"]), "");                      // nothing to close
  assert.equal(type(["(", "2", ")", ")"]), "(2)");
  assert.equal(type(["(", ")"]), "(");
  assert.equal(type(["²"]), "");
  assert.equal(type(["5", "%", "%"]), "5%%");
  assert.equal(type(["1", "2", "C"]), "");
  // after "=": a digit starts over, a sign continues from the result
  assert.equal(type(["7"], "25", true), "7");
  assert.equal(type(["+", "7"], "25", true), "25+7");
  assert.equal(type(["²"], "25", true), "25²");
  assert.equal(type(["√", "4"], "25", true), "√(4");
  assert.equal(pressKey("1".repeat(48), "1", false).length, 48);
});

test("the ± key", () => {
  assert.equal(toggleSign(""), "−");
  assert.equal(toggleSign("−"), "");
  assert.equal(toggleSign("8"), "−8");
  assert.equal(toggleSign("−8"), "8");
  assert.equal(toggleSign("5×3"), "5×(−3");
  assert.equal(toggleSign("5×(−3"), "5×3");
  assert.equal(val(toggleSign("5×3")), -15);
  assert.equal(val(toggleSign("10−4")), 14);
  assert.equal(toggleSign("5+"), "5+");
  assert.equal(toggleSign("2.5"), "−2.5");
});

test("putting an earlier result back", () => {
  assert.equal(insertValue("", 25, false), "25");
  assert.equal(insertValue("2×", 25, false), "2×25");
  assert.equal(insertValue("2+", -3, false), "2+(−3");
  assert.equal(insertValue("2×", -3, false), "2×−3");
  assert.equal(insertValue("12", 25, false), "25");      // would glue two numbers: start over
  assert.equal(insertValue("99", 0.3, true), "0.3");
  assert.equal(val(insertValue("2+", -3, false)), -1);
  assert.equal(plain(1e12), "1000000000000");
  assert.equal(val(plain(1e12) + "+1"), 1000000000001);
  assert.equal(plain(-0.75), "−0.75");
  assert.equal(plain(1.25e-7), "0.000000125");
});
