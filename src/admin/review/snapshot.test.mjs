// node --test src/admin/review/snapshot.test.mjs
// The question snapshot (math kept) and the request body (design/admin-review/design.md §6, §8).
// Fixtures: real topic cards saved by tools/review-fixtures.mjs, with what the live page gave in the browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHTML } from "./test-dom.mjs";
import { serialize, buildRequest, questionLink, shortStep, keyLine, deviceLine, LEVELS } from "./snapshot.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, "fixtures");
const fixture = (name) => readFileSync(join(FIX, name + ".html"), "utf8");
const snap = (name) => serialize(parseHTML(fixture(name)));
const html = (s) => serialize(parseHTML(s));

/* ── every fixture: the node walk gives exactly what the live page gave ── */
const NAMES = readdirSync(FIX).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5));
test("fixtures exist for every topic family", () => {
  for (const n of ["powers-step2-wrong", "powers-power-of-power", "roots-simplify", "fractions-pie", "equations-denominator",
    "equation-solver-practice", "triangles-drawing-choice", "linear-graph", "new-algebraic-fractions", "proofs-proof"]) assert.ok(NAMES.includes(n), n);
});
for (const n of NAMES) {
  test(`fixture ${n}: same text as in the browser`, () => {
    assert.equal(snap(n), readFileSync(join(FIX, n + ".browser.txt"), "utf8").trim());
  });
}

/* ── per family: nothing of the math is lost ── */
test("powers: digit powers become superscripts, an asked power stays ^?, steps carry what was typed and the verdict", () => {
  const t = snap("powers-step2-wrong");
  assert.match(t, /^תרגול — כפל חזקות$/m);
  assert.match(t, /^3² · 3³ = 3\^\?$/m);
  assert.match(t, /^שלב 1 — מצא את המעריך\n✓ שלב הושלם\nהאתר ענה: נכון$/m);
  assert.match(t, /^3⁵ = \[5\]$/m);
  assert.match(t, /^הוקלד: 5 · האתר ענה: לא נכון$/m);
  assert.doesNotMatch(t, /בדוק|תרגיל חדש/);              // action buttons are not the question
});
test("powers: a power of a power, a box inside the exponent, not checked yet", () => {
  const t = snap("powers-power-of-power");
  assert.match(t, /^\(3²\)³ = 3\^\?$/m);
  assert.match(t, /^3\^\[8\]$/m);
  assert.match(t, /^הוקלד: 8 · האתר ענה: עוד לא נבדק$/m);
});
test("roots: <Root> becomes √ with brackets only when needed, boxes inside the root are kept", () => {
  const t = snap("roots-simplify");
  assert.match(t, /^√72 = \?√\?$/m);
  assert.match(t, /√\(__ · __\)/);
  assert.match(t, /^√\(\[3\] · \[ \]\)$/m);
  assert.match(t, /^הוקלד: 3 · ריק · האתר ענה: לא נכון$/m);
});
test("fractions: a fraction of two boxes, the pie drawing by its name, the site's feedback", () => {
  const t = snap("fractions-pie");
  assert.match(t, /^\[5\]\/\[6\]$/m);
  assert.match(t, /^\[ציור: עיגול שמחולק ל־2 חלקים שווים, חלק מהם צבועים\]$/m);
  assert.match(t, /^הוקלד: 5 · 6 · האתר ענה: לא נכון$/m);
});
test("equations: a fraction with an expression gets brackets; the equation card above the step is kept", () => {
  const t = snap("equations-denominator");
  assert.match(t, /^המשוואה:\n\(x \+ 1\)\/3 = -1$/m);
  assert.match(t, /^מ״מ = \[3\]$/m);
  assert.doesNotMatch(t, /למה מכנה משותף/);               // the lesson box is left out
  assert.doesNotMatch(t, /שבר פשוט|ביטוי במונה/);          // the level chips are navigation
});
test("equation solver: the picked operation and the typed number", () => {
  const t = snap("equation-solver-practice");
  assert.match(t, /\[\+ · נבחר\] \[−\] \[×\] \[÷\]/);
  assert.match(t, /^הוקלד: 4 · נבחר: \+ · האתר ענה: עוד לא נבדק$/m);
});
test("triangles: the drawing's labels in order, the picked choice and the verdict", () => {
  const t = snap("triangles-drawing-choice");
  assert.match(t, /^\[ציור: 17, 8, 15, A, B, C\]$/m);
  assert.match(t, /^איזו מבין הצלעות היא ניצב\? \(בחרו אחת\)$/m);
  assert.match(t, /^\[8\] \[15\] \[17 · נבחר\]$/m);
  assert.match(t, /^נבחר: 17 · האתר ענה: לא נכון$/m);
});
test("line graph: axis numbers fold into one range, the points' boxes stay", () => {
  const t = snap("linear-graph");
  assert.match(t, /^\[ציור: x, y, A, B, C, מספרים על הצירים: -8 עד 8\]$/m);
  assert.match(t, /^A: x = \[2\] y = \[ \]$/m);
  assert.doesNotMatch(t, /דלג/);
});
test("module new: algebraic fractions and fraction choices", () => {
  const t = snap("new-algebraic-fractions");
  assert.match(t, /\(24x\)\/\(6x²\)/);
  assert.match(t, /^\[4x\] \[4\] \[4\/x²\] \[4\/x\]$/m);
});
test("proofs: the signs drawn as SVG come back as ∢ △, the given, the proof rows and the choices", () => {
  const t = snap("proofs-proof");
  assert.match(t, /^\[ציור: הציור · A, B, C, D, E\]$/m);
  assert.match(t, /^נתון: BE חוצה את ∢ABC AD גובה לצלע BC$/m);
  assert.match(t, /^בציור המשולש △ABC\.$/m);
  assert.match(t, /\[∢ADB = ∢ADC = 90°\] \[∢ABE = ∢BEA\] \[BD = DC\]/);
});

/* ── small cases ── */
test("sup / sub rules", () => {
  assert.equal(html('<span>x<sup>n+1</sup></span>'), "x^(n+1)");
  assert.equal(html('<span>2<sup>-3</sup> · 2<sup>−1</sup></span>'), "2⁻³ · 2⁻¹");
  assert.equal(html('<span>a<sub>1</sub> + a<sub>n+1</sub></span>'), "a_1 + a_(n+1)");
  assert.equal(html('<span>10<sup><input value=""></sup></span>'), "10^[ ]\nהוקלד: ריק · האתר ענה: עוד לא נבדק");
});
test("roots and fractions nest", () => {
  const root = (b) => `<span class="mp-rad"><span class="mp-rad-t">√</span><svg class="mp-rad-s" aria-hidden="true"></svg><span class="mp-rad-b">${b}</span></span>`;
  assert.equal(html(root("49") + " = 7"), "√49 = 7");
  assert.equal(html(root("b² − 4ac")), "√(b² − 4ac)");
  assert.equal(html(`<span class="frac"><span class="num">${root("2")}</span><span class="den">2</span></span>`), "(√2)/2");
  assert.equal(html('<span class="mp-frac"><span class="mp-frac-n">x</span><span class="mp-frac-d">3</span></span>'), "x/3");
  assert.equal(html('<span class="qs-fr"><span class="qs-fr-n">−b ± 1</span><span class="qs-fr-d">2a</span></span>'), "(−b ± 1)/(2a)");
});
test("boxes: select, checkbox, empty and range", () => {
  assert.equal(html('<div><select><option>א</option><option selected>ב</option></select></div>'), "[ב]\nהוקלד: ב · האתר ענה: עוד לא נבדק");
  assert.match(html('<div><input type="checkbox" checked> <input type="checkbox"></div>'), /^\[✓\] \[ \]$/m);
});
test("left out: decorative graphics, navigation, lesson boxes, action buttons — but never hidden TEXT", () => {
  assert.equal(html('<div><svg aria-hidden="true"><text>icon</text></svg>שאלה</div>'), "שאלה");
  assert.equal(html('<div><span aria-hidden="true">AB</span> = 5</div>'), "AB = 5");
  assert.equal(html('<div><div class="sub-tabs"><button class="sub-tab active">א</button></div><div class="info-box">הסבר</div>שאלה</div>'), "שאלה");
  assert.equal(html('<div>שאלה<button class="btn mp-new">תרגיל חדש ↺</button><button class="btn">✓ בדוק</button></div>'), "שאלה");
  assert.match(html('<div><button class="choice-btn">כאשר x &gt; 0</button></div>'), /\[כאשר x > 0\]/);  // "כאשר" is not "אשר"
  assert.equal(html('<div><canvas data-engine="three.js r187"></canvas></div>'), "[ציור תלת־ממד]");
});
test("a step card with a right answer", () => {
  assert.equal(html('<div class="card"><div class="step-card done"><div class="step-label">שלב 1</div><input class="mp-right" value="8"></div></div>'),
    "שלב 1\n[8]\nהוקלד: 8 · האתר ענה: נכון");
});

/* ── the deep link ── */
test("the link reopens the same place: TopicView reads ch and sub back exactly", () => {
  const l = questionLink({ slug: "triangles", chapter: "3. משולשים מיוחדים", subs: ["ישר זווית", "ניצב או יתר? (א)"] });
  const u = new URL(l);
  assert.equal(u.origin + u.pathname, "https://mathix-sooty.vercel.app/topics/triangles");
  assert.equal(u.searchParams.get("ch"), "3. משולשים מיוחדים");
  assert.equal(u.searchParams.get("sub"), "ישר זווית › ניצב או יתר? (א)");
  assert.equal(questionLink({ slug: "circle", origin: "http://localhost:5180/" }), "http://localhost:5180/topics/circle");
  assert.equal(new URL(questionLink({ slug: "x", chapter: "A & B #1 + 'c' [d]" })).searchParams.get("ch"), "A & B #1 + 'c' [d]");
});
test("the whole link stays tappable on the board (src/admin/files.js linkify)", () => {
  const src = readFileSync(join(HERE, "../files.js"), "utf8");
  const m = /export function linkify[\s\S]*?const re = \/(.+)\/gi;/.exec(src);
  assert.ok(m, "linkify's pattern not found in files.js");
  const re = new RegExp(m[1], "gi");
  const l = questionLink({ slug: "parabola-practice", chapter: "8. עלייה/ירידה", subs: ["(א) מה?"] });
  assert.deepEqual(("קישור: " + l + "\nעוד").match(re), [l]);
});

/* ── the request body (design §8) ── */
const SAMPLE = `איפה: כיתה ח׳ › חזקות ושורשים › 2. חוקי חזקות › 3. חזקה של חזקה › השאלה שעל המסך › שלב 1
סוג: בדיקת התשובה לא נכונה
מה לתקן: הקלדתי 8 והאתר אמר שזה לא נכון

השאלה כמו שהופיעה:
חזקה של חזקה
(2²)² = 2^?
שלב 1 — מה המעריך?
הוקלד: 8 · האתר ענה: לא נכון

קישור: https://mathix-sooty.vercel.app/topics/powers-roots?ch=2.%20חוקי%20חזקות&sub=3.%20חזקה%20של%20חזקה
נשלח מבקרת התוכן · טלפון 393×852 · גרסה 730c785`;
const BASE = { grade: "כיתה ח׳", slug: "powers-roots", topicName: "חזקות ושורשים", chapter: "2. חוקי חזקות", subs: ["3. חזקה של חזקה"],
  reason: "בדיקת התשובה לא נכונה", text: "הקלדתי 8 והאתר אמר שזה לא נכון", device: "טלפון 393×852", version: "730c785" };

test("question level: exactly the design's sample", () => {
  const snapshot = { text: "חזקה של חזקה\n(2²)² = 2^?\nשלב 1 — מה המעריך?\nהוקלד: 8 · האתר ענה: לא נכון", stepShort: shortStep("שלב 1 — מה המעריך?") };
  const r = buildRequest({ ...BASE, level: "question", snapshot });
  assert.deepEqual(r, { topic: "powers-roots", section: "2. חוקי חזקות › 3. חזקה של חזקה", body: SAMPLE });
});
test("every level maps onto topic / section / where as in design §8", () => {
  const b = (level, more = {}) => buildRequest({ ...BASE, level, ...more });
  const first = (r) => r.body.split("\n")[0];
  let r = b("site");
  assert.deepEqual([r.topic, r.section, first(r)], ["general", "", "איפה: כל האתר"]);
  assert.doesNotMatch(r.body, /קישור:/);
  r = b("grade");
  assert.deepEqual([r.topic, r.section, first(r)], ["general", "כיתה ח׳ · כל הכיתה", "איפה: כיתה ח׳"]);
  r = b("topic");
  assert.deepEqual([r.topic, r.section, first(r)], ["powers-roots", "", "איפה: כיתה ח׳ › חזקות ושורשים"]);
  assert.match(r.body, /^קישור: https:\/\/mathix-sooty\.vercel\.app\/topics\/powers-roots$/m);
  r = b("chapter");
  assert.deepEqual([r.topic, r.section, first(r)], ["powers-roots", "2. חוקי חזקות", "איפה: כיתה ח׳ › חזקות ושורשים › 2. חוקי חזקות"]);
  assert.match(r.body, /\?ch=2\.%20חוקי%20חזקות$/m);
  r = b("sub");
  assert.deepEqual([r.topic, r.section, first(r)], ["powers-roots", "2. חוקי חזקות › 3. חזקה של חזקה", "איפה: כיתה ח׳ › חזקות ושורשים › 2. חוקי חזקות › 3. חזקה של חזקה"]);
  // a hidden module has no grade yet: the where line starts at the topic
  assert.equal(first(buildRequest({ ...BASE, level: "topic", grade: "", slug: "proofs", topicName: "הוכחות" })), "איפה: הוכחות");
  assert.deepEqual(LEVELS, ["site", "grade", "topic", "chapter", "sub", "question"]);
});
test("reason or sentence: either one is enough, none is an error; the lines appear only when given", () => {
  assert.deepEqual(buildRequest({ ...BASE, level: "chapter", reason: "", text: " " }), { error: "empty" });
  assert.doesNotMatch(buildRequest({ ...BASE, level: "chapter", reason: "" }).body, /סוג:/);
  assert.doesNotMatch(buildRequest({ ...BASE, level: "chapter", text: "" }).body, /מה לתקן:/);
  assert.match(buildRequest({ ...BASE, level: "chapter", text: "שורה א\nשורה ב" }).body, /^מה לתקן: שורה א שורה ב$/m);
  assert.deepEqual(buildRequest({ ...BASE, level: "nope" }), { error: "level" });
  assert.deepEqual(buildRequest({ ...BASE, level: "topic", slug: "" }), { error: "topic" });
  assert.deepEqual(buildRequest({ ...BASE, level: "sub", subs: [] }), { error: "level" });
});
test("proofs: the exact rebuild key goes in the body; no version → no version text", () => {
  const key = { template: "3-X-SAS", seed: 20261121, level: 2, variant: "B" };
  assert.equal(keyLine(key), "מפתח: 3-X-SAS:20261121 · רמה 2 · וריאנט B");
  const r = buildRequest({ ...BASE, level: "question", slug: "proofs", topicName: "הוכחות", grade: "", chapter: "3. הוכחת חפיפה", subs: ["רמה 2"],
    version: "", snapshot: { text: "נתון: …", stepShort: "", key } });
  assert.match(r.body, /\nמפתח: 3-X-SAS:20261121 · רמה 2 · וריאנט B\nקישור: /);
  assert.match(r.body, /\nנשלח מבקרת התוכן · טלפון 393×852$/);
  assert.match(r.body, /^איפה: הוכחות › 3\. הוכחת חפיפה › רמה 2 › השאלה שעל המסך$/m);
});
test("device line", () => {
  assert.equal(deviceLine({ innerWidth: 393, innerHeight: 852, matchMedia: () => ({ matches: true }) }), "טלפון 393×852");
  assert.equal(deviceLine({ innerWidth: 1440, innerHeight: 900, matchMedia: () => ({ matches: false }) }), "מחשב 1440×900");
});
