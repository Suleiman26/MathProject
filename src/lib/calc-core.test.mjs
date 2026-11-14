/* node --test src/lib/calc-core.test.mjs
   The side calculator on topic pages: the parser must be right (students trust it). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, format, plain, pressKey, toggleSign, closed, insertValue, errorText, solveQuadratic, eqnStart, eqnPress, eqnText, eqnScreens, menuPick } from "./calc-core.js";

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

/* ── EQN mode (MODE 5 3): aX² + bX + c = 0 ── */
const eqType = (st, keys) => { let error = ""; for (const k of keys) { const r = eqnPress(st, k); st = r.state; error = r.error; } return { st, error }; };
const K = (s) => s.split(" ");

test("EQN: two roots, in the calculator's order", () => {
  assert.deepEqual(solveQuadratic(1, -5, 6), { ok: true, kind: "two", x1: 3, x2: 2, d: 1 });
  assert.deepEqual(solveQuadratic(1, 5, 6), { ok: true, kind: "two", x1: -2, x2: -3, d: 1 });
  assert.deepEqual(solveQuadratic(2, -7, 3), { ok: true, kind: "two", x1: 3, x2: 0.5, d: 25 });
  assert.deepEqual(solveQuadratic(-1, 0, 9), { ok: true, kind: "two", x1: -3, x2: 3, d: 36 });   // a < 0 flips them, like the formula
  assert.deepEqual(solveQuadratic(1, -4, 0), { ok: true, kind: "two", x1: 4, x2: 0, d: 16 });
  assert.ok(Object.is(solveQuadratic(1, 4, 0).x1, 0));                                           // c = 0: a clean 0, never −0
  assert.deepEqual(solveQuadratic(1, 0, -2), { ok: true, kind: "two", x1: 1.414213562, x2: -1.414213562, d: 8 });
  assert.deepEqual(solveQuadratic(1, 3, 1), { ok: true, kind: "two", x1: -0.3819660113, x2: -2.618033989, d: 5 });
});

test("EQN: one root", () => {
  assert.deepEqual(solveQuadratic(1, -6, 9), { ok: true, kind: "one", x: 3, d: 0 });
  assert.deepEqual(solveQuadratic(4, 4, 1), { ok: true, kind: "one", x: -0.5, d: 0 });
  assert.deepEqual(solveQuadratic(1, 0.2, 0.01), { ok: true, kind: "one", x: -0.1, d: 0 });      // 0.2² − 0.04 is not exactly 0 in a computer
  assert.deepEqual(solveQuadratic(3, 0, 0), { ok: true, kind: "one", x: 0, d: 0 });
  assert.ok(Object.is(solveQuadratic(3, 0, 0).x, 0));
});

test("EQN: no real roots", () => {
  assert.deepEqual(solveQuadratic(1, 2, 5), { ok: true, kind: "none", d: -16 });
  assert.deepEqual(solveQuadratic(1, 0, 1), { ok: true, kind: "none", d: -4 });
  assert.deepEqual(solveQuadratic(-2, 1, -3), { ok: true, kind: "none", d: -23 });
  assert.equal(solveQuadratic(1, 1, 1 / 3).kind, "none");
});

test("EQN: a = 0 is not a quadratic; nonsense is refused", () => {
  assert.deepEqual(solveQuadratic(0, 2, 5), { ok: false, error: "notquad" });
  assert.deepEqual(solveQuadratic(0, 0, 0), { ok: false, error: "notquad" });
  assert.equal(solveQuadratic(NaN, 1, 1).ok, false);
  assert.equal(solveQuadratic(1, Infinity, 1).ok, false);
  assert.equal(solveQuadratic(1, "2", 1).ok, false);
  assert.ok(errorText("notquad").length > 0);
});

test("EQN: negative and decimal coefficients", () => {
  assert.deepEqual(solveQuadratic(-1, -2, 3), { ok: true, kind: "two", x1: -3, x2: 1, d: 16 });
  assert.deepEqual(solveQuadratic(0.5, -1.5, 1), { ok: true, kind: "two", x1: 2, x2: 1, d: 0.25 });
  assert.deepEqual(solveQuadratic(1, -0.3, 0.02), { ok: true, kind: "two", x1: 0.2, x2: 0.1, d: 0.01 });
  assert.deepEqual(solveQuadratic(-0.25, 0, 1), { ok: true, kind: "two", x1: -2, x2: 2, d: 1 });
  assert.deepEqual(solveQuadratic(1.5, 4.5, -6), { ok: true, kind: "two", x1: 1, x2: -4, d: 56.25 });
});

test("EQN: big numbers and rounding", () => {
  assert.deepEqual(solveQuadratic(1, -1000001, 1000000), { ok: true, kind: "two", x1: 1000000, x2: 1, d: 999998000001 });
  const r = solveQuadratic(1, -100000, 1);                     // the small root must not be lost
  assert.equal(r.x1, 99999.99999);
  assert.equal(r.x2, 0.00001);
  assert.deepEqual(solveQuadratic(1e50, 0, -1e50), { ok: true, kind: "two", x1: 1, x2: -1, d: 4e100 });
  assert.equal(solveQuadratic(1e-90, 1e90, 1).error, "big");   // a root past 10¹⁰⁰
  const t = solveQuadratic(3, -1, -1);                          // 10 meaningful digits
  assert.equal(t.x1, 0.7675918792);
  assert.equal(t.x2, -0.4342585459);
});

test("EQN: every random integer equation built from its roots comes back exactly", () => {
  let seed = 7;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return (seed % (2 * n + 1)) - n; };
  for (let i = 0; i < 3000; i++) {
    const a = rnd(9) || 1, p = rnd(40), q = rnd(40);
    const r = solveQuadratic(a, -a * (p + q), a * p * q);
    assert.ok(r.ok);
    if (p === q) { assert.equal(r.kind, "one"); assert.equal(r.x, p); }
    else {
      assert.equal(r.kind, "two");
      assert.deepEqual([r.x1, r.x2].sort((m, n) => m - n), [p, q].sort((m, n) => m - n));
      assert.ok(a > 0 ? r.x1 > r.x2 : r.x1 < r.x2);
    }
  }
});

test("EQN keys: a, b, c with '=' after each, then X1 and X2", () => {
  let { st, error } = eqType(eqnStart(), K("1 = − 5 = 6 ="));
  assert.equal(error, "");
  assert.equal(st.step, 3);
  assert.deepEqual(st.co, [1, -5, 6]);
  assert.deepEqual([st.sol.x1, st.sol.x2, st.view], [3, 2, 0]);
  assert.equal(eqnScreens(st.sol), 2);
  st = eqnPress(st, "=").state; assert.equal(st.view, 1);            // X2
  st = eqnPress(st, "=").state;                                      // round again, the numbers stay
  assert.deepEqual([st.step, st.co, st.text], [0, [1, -5, 6], ""]);
  ({ st } = eqType(st, K("= = 4 =")));                               // only c changes: x² − 5x + 4
  assert.deepEqual([st.sol.x1, st.sol.x2], [4, 1]);
});

test("EQN keys: ± . ÷ √ and a missing ) work in a coefficient", () => {
  let { st } = eqType(eqnStart(), K("2 ± = 0 . 5 = 1 ÷ 4 ="));
  assert.deepEqual(st.co, [-2, 0.5, 0.25]);
  ({ st } = eqType(eqnStart(), K("1 = 0 = ( 1 − 3 =")));
  assert.deepEqual(st.co, [1, 0, -2]);
  ({ st } = eqType(eqnStart(), K("1 = = − √ 1 6 =")));               // b left empty = 0
  assert.deepEqual(st.co, [1, 0, -4]);
  assert.deepEqual([st.sol.x1, st.sol.x2], [2, -2]);
});

test("EQN keys: a = 0, broken numbers, one root, no roots", () => {
  let r = eqType(eqnStart(), K("0 ="));
  assert.deepEqual([r.error, r.st.step, r.st.text], ["notquad", 0, ""]);
  r = eqType(eqnStart(), K("="));                                    // nothing typed for a
  assert.equal(r.error, "notquad");
  r = eqType(eqnStart(), K("1 = 5 ÷ 0 ="));
  assert.deepEqual([r.error, r.st.step, r.st.text], ["undefined", 1, "5÷0"]);
  r = eqType(eqnStart(), K("1 = 5 × ="));
  assert.deepEqual([r.error, r.st.step], ["syntax", 1]);
  r = eqType(eqnStart(), K("1 = − 6 = 9 ="));
  assert.deepEqual([r.st.sol.kind, r.st.sol.x, eqnScreens(r.st.sol)], ["one", 3, 1]);
  assert.equal(eqnPress(r.st, "=").state.step, 0);
  r = eqType(eqnStart(), K("1 = 2 = 5 ="));
  assert.deepEqual([r.st.sol.kind, r.st.sol.d, eqnScreens(r.st.sol)], ["none", -16, 1]);
});

test("EQN keys: ⌫ and C", () => {
  let { st } = eqType(eqnStart(), K("1 2 ⌫"));
  assert.equal(st.text, "1");
  ({ st } = eqType(eqnStart(), K("1 = 7 = ⌫")));                     // empty c → back to b, its 7 stays
  assert.deepEqual([st.step, st.co[1], st.text], [1, 7, ""]);
  ({ st } = eqType(st, K("= 1 0 =")));
  assert.deepEqual(st.co, [1, 7, 10]);
  ({ st } = eqType(st, K("⌫")));                                     // from the answer back to c
  assert.deepEqual([st.step, st.sol, st.co[2]], [2, null, 10]);
  ({ st } = eqType(eqnStart(), K("⌫")));                             // nothing to go back to
  assert.equal(st.step, 0);
  ({ st } = eqType(eqnStart(), K("1 = 4 5 C")));                     // C: first the number…
  assert.deepEqual([st.step, st.text, st.co[0]], [1, "", 1]);
  ({ st } = eqType(st, K("C")));                                     // …then everything
  assert.deepEqual(st, eqnStart());
  ({ st } = eqType(eqnStart(), K("1 = 2 = 1 = C")));
  assert.deepEqual(st, eqnStart());
  ({ st } = eqType(eqnStart(), K("1 = 2 = 1 = 3")));                 // typing on the answer starts a new equation
  assert.deepEqual([st.step, st.text, st.co], [0, "3", [null, null, null]]);
  ({ st } = eqType(eqnStart(), K("1 = 2 = 1 = +")));                 // a key that types nothing changes nothing
  assert.equal(st.step, 3);
});

test("EQN: the equation line and the MODE menus", () => {
  assert.equal(eqnText(1, -5, 6), "X²−5X+6=0");
  assert.equal(eqnText(-1, 1, -1), "−X²+X−1=0");
  assert.equal(eqnText(2, 0, -8), "2X²−8=0");
  assert.equal(eqnText(0.5, -1.5, 0), "0.5X²−1.5X=0");
  assert.equal(eqnText(3, 0, 0), "3X²=0");
  assert.deepEqual(menuPick("mode", "1"), { mode: "comp" });
  assert.deepEqual(menuPick("mode", "5"), { menu: "eqn" });
  assert.deepEqual(menuPick("eqn", "3"), { mode: "eqn" });
  assert.deepEqual(menuPick("eqn", "⌫"), { menu: "mode" });
  assert.deepEqual(menuPick("mode", "C"), { menu: null });
  assert.equal(menuPick("mode", "3"), null);
  assert.equal(menuPick("eqn", "1"), null);
  assert.equal(menuPick(null, "5"), null);
});
