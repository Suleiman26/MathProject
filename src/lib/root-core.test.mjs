import test from "node:test";
import assert from "node:assert/strict";
import { parseRoots, rootsToText } from "./root-core.js";

const shape = (nodes) => nodes.map((n) => n.t === "txt" ? n.v : n.t === "sup" ? `^{${n.v}}` : n.t === "ltr" ? `<${shape(n.b)}>` : `R[${shape(n.b)}]`).join("");
const p = (s, o) => shape(parseRoots(s, o));

test("simple roots", () => {
  assert.equal(p("√49 = 7", { flat: true }), "R[49] = 7");
  assert.equal(p("√(b²−4ac)", { flat: true }), "R[b²−4ac]");
  assert.equal(p("2√3 + 5√3", { flat: true }), "2R[3] + 5R[3]");
  assert.equal(p("√n² = n", { flat: true }), "R[n²] = n");
  assert.equal(p("√Δ = √49 = 7", { flat: true }), "R[Δ] = R[49] = 7");
  assert.equal(p("√12 = ?√?", { flat: true }), "R[12] = ?R[?]");
  assert.equal(p("√(4·3) = √4 · √3", { flat: true }), "R[4·3] = R[4] · R[3]");
  assert.equal(p("√2.25", { flat: true }), "R[2.25]");
});
test("nothing to cover stays as typed", () => {
  assert.equal(p("√", { flat: true }), "√");
  assert.equal(p("x = ±√ ", { flat: true }), "x = ±√ ");
  assert.equal(p("√()", { flat: true }), "√()");
  assert.equal(p("no roots here"), "no roots here");
});
test("nested, unclosed", () => {
  assert.equal(p("√(a + √(b))", { flat: true }), "R[a + R[b]]");
  assert.equal(p("√(9+16", { flat: true }), "R[9+16]");
  assert.equal(p("√( (3)² − 4·(1)·(2) )", { flat: true }), "R[(3)² − 4·(1)·(2)]");
});
test("powers", () => {
  assert.equal(p("√(x^4) = x^?", { pow: true, flat: true }), "R[x^{4}] = x^{?}");
  assert.equal(p("(√a · √b)^2 = a·b", { pow: true, flat: true }), "(R[a] · R[b])^{2} = a·b");
  assert.equal(p("x^(−3) · x^12", { pow: true, flat: true }), "x^{−3} · x^{12}");
  assert.equal(p("√(x^6·y^4) = x^?·y^?", { pow: true, flat: true }), "R[x^{6}·y^{4}] = x^{?}·y^{?}");
  assert.equal(p("x^2", { flat: true }), "x^2");
});
test("Hebrew sentences keep each formula together, left to right", () => {
  assert.equal(p("מחשבים אותו לפי פיתגורס: a√2."), "מחשבים אותו לפי פיתגורס: <aR[2]>.");
  assert.equal(p("דרך תוך הגוף; d = √(l²+w²+h²)."), "דרך תוך הגוף; <d = R[l²+w²+h²]>.");
  assert.equal(p("(שטח הבסיס = 12√3)"), "(שטח הבסיס = <12R[3]>)");
  assert.equal(p("(בצורת מקדם × √3)"), "(בצורת מקדם × <R[3]>)");
  assert.equal(p("שלב 2: חשבו l = √(r²+h²)"), "שלב 2: חשבו <l = R[r²+h²]>");
  assert.equal(p("m = √(h² + (חצי-צלע)²)"), "<m = R[h² + (חצי-צלע)²]>");
  assert.equal(p("d = a√2 , d = a√3"), "<d = aR[2] , d = aR[3]>");
  assert.equal(p("שלב 2: d = √(d_בסיס² + a²) = a√3"), "שלב 2: <d = R[d_בסיס² + a²] = aR[3]>");
  assert.equal(p("r = √25 ="), "<r = R[25] =>");
  assert.equal(p("√9 ועוד √16 שווה 7"), "<R[9]> ועוד <R[16]> שווה 7");
});
test("text round trip", () => {
  for (const s of ["√49 = 7", "2√3", "√(b²−4ac)", "a√2 + √(x+1)"]) assert.equal(rootsToText(parseRoots(s, { flat: true })), s);
});
