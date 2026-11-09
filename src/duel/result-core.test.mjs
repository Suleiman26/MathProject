/* node --test src/duel/result-core.test.mjs
   The result screen's rules: who won and how, kind headlines, the XP line
   (incl. the three reasons for 0), facts, what to review, emotes. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  outcome, headline, xpNote, facts, streakFromLanes, reviewItems, reviewHref, columnShares, countAt, easeOut,
  emotesOf, lastEmote, announce, rematchLabel, waitLeft, closeGap, EMOTES,
} from "./result-core.js";

const ME = "11111111-0000-4000-8000-000000000001", OP = "11111111-0000-4000-8000-000000000002";
function st(o = {}) {
  return {
    status: "done",
    me: { id: ME, username: "עבד", score: 1840, ok: 12, idx: 15, ...(o.me || {}) },
    opp: { id: OP, username: "נועה", score: 1510, ok: 11, idx: 15, ...(o.opp || {}) },
    my_lanes: o.lanes || [true, true, false, true, true, true, true, true, true, false, true, true, false, true, true],
    questions: o.questions || [],
    emotes: o.emotes || [],
    result: { winner: ME, draw: false, xp_me: 30, review: [], ...(o.result || {}) },
  };
}

test("outcome: win / lose / draw from the server's winner, never from the scores", () => {
  assert.equal(outcome(st()).kind, "win");
  assert.equal(outcome(st({ result: { winner: OP, xp_me: 10 } })).kind, "lose");
  assert.equal(outcome(st({ result: { winner: null, draw: true, xp_me: 20 } })).kind, "draw");
  // the server says the opponent won even though my score is higher (I gave up): lose
  const g = outcome(st({ result: { winner: OP, gave_up: ME, xp_me: 0 } }));
  assert.equal(g.kind, "lose"); assert.equal(g.gaveUp, "me");
  assert.equal(outcome(st({ result: { winner: ME, gave_up: OP } })).gaveUp, "opp");
});

test("outcome: tie broken on right answers, then on time", () => {
  assert.equal(outcome(st({ me: { score: 900, ok: 8 }, opp: { score: 900, ok: 7 } })).tie, "ok");
  assert.equal(outcome(st({ me: { score: 900, ok: 8 }, opp: { score: 900, ok: 8 } })).tie, "time");
  assert.equal(outcome(st()).tie, null);
  assert.equal(outcome(st({ me: { score: 0, ok: 0 }, opp: { score: 0, ok: 0 }, result: { winner: null, draw: true } })).tie, null);
});

test("outcome: comeback only when it's mine; perfect at 15/15", () => {
  assert.equal(outcome(st({ result: { comeback_by: ME } })).comeback, true);
  assert.equal(outcome(st({ result: { comeback_by: OP } })).comeback, false);
  assert.equal(outcome(st({ me: { ok: 15 } })).perfect, true);
  assert.equal(outcome(st()).perfect, false);
});

test("headline: the loser is told kindly, with the small gap", () => {
  const lose = headline(st({ me: { score: 1400 }, opp: { score: 1510 }, result: { winner: OP, xp_me: 10 } }));
  assert.equal(lose.title, "הפעם נועה…");
  assert.equal(lose.sub, "הפרש של 110 נקודות בלבד");
  const far = headline(st({ me: { score: 300 }, opp: { score: 1900 }, result: { winner: OP, xp_me: 10 } }));
  assert.match(far.sub, /יכול להתהפך/);
  assert.doesNotMatch(far.sub, /בלבד/);
  assert.equal(headline(st()).title, "ניצחת!");
  assert.equal(headline(st()).sub, "הפרש של 330 נקודות");
  assert.equal(headline(st({ result: { winner: null, draw: true } })).title, "תיקו!");
  assert.equal(headline(st({ result: { winner: OP, gave_up: ME, xp_me: 0 } })).title, "ויתרת הפעם");
  assert.match(headline(st({ result: { winner: ME, gave_up: OP } })).sub, /ויתר\/ה/);
  // perfect / comeback have their own moment on the page: the sub line stays the gap
  assert.equal(headline(st({ me: { ok: 15 } })).sub, "הפרש של 330 נקודות");
  assert.equal(headline(st({ result: { comeback_by: ME } })).sub, "הפרש של 330 נקודות");
  // one "!" at most in title + sub
  for (const s of [st(), st({ result: { winner: OP } }), st({ result: { draw: true, winner: null } })]) {
    const h = headline(s);
    assert.ok((h.title + h.sub).split("!").length - 1 <= 1, h.title + h.sub);
  }
});

test("closeGap: ≤ 150 points or ≤ 20 % of the winner's score", () => {
  assert.equal(closeGap(150, 300), true);
  assert.equal(closeGap(151, 300), false);
  assert.equal(closeGap(400, 2000), true);
  assert.equal(closeGap(401, 2000), false);
});

test("xpNote: the server's XP, and why it is 0", () => {
  assert.deepEqual(xpNote(st()), { xp: 30, zero: false, text: "+30 נקודות דו-קרב" });
  assert.equal(xpNote(st({ result: { winner: OP, xp_me: 10 } })).text, "+10 נקודות דו-קרב");
  assert.equal(xpNote(st({ result: { winner: OP, gave_up: ME, xp_me: 0 } })).text, "ויתור לא מזכה בנקודות דו-קרב");
  assert.equal(xpNote(st({ me: { idx: 2 }, result: { xp_me: 0 } })).text, "נקודות דו-קרב מגיעות אחרי 3 תשובות לפחות");
  assert.equal(xpNote(st({ me: { idx: 15 }, result: { xp_me: 0 } })).text, "הגעת למקסימום נקודות דו-קרב להיום");
  assert.equal(xpNote(st({ result: { xp_me: null } })).zero, true);
});

test("facts: server best streak + avg, lanes as a fallback, avg hidden when unknown", () => {
  assert.deepEqual(facts(st({ result: { best_streak: 6, avg_ms: 8420 } })), { ok: 12, best: 6, avg: "8.4" });
  assert.deepEqual(facts(st()), { ok: 12, best: 6, avg: null });         // older server: lanes → 6 in a row
  assert.equal(facts(st({ result: { avg_ms: null } })).avg, null);
  assert.equal(facts(st({ result: { avg_ms: 4000 } })).avg, "4.0");
  assert.equal(streakFromLanes([true, true, null, true]), 2);
  assert.equal(streakFromLanes(null), 0);
});

test("reviewHref: chapter as ?ch=, none for equation-solver, null for junk", () => {
  assert.equal(reviewHref("directed-numbers", "חיבור וחיסור"), "/topics/directed-numbers?ch=" + encodeURIComponent("חיבור וחיסור"));
  assert.equal(reviewHref("equation-solver", ""), "/topics/equation-solver");
  assert.equal(reviewHref("equation-solver", null), "/topics/equation-solver");
  assert.equal(reviewHref("../admin", "x"), null);
  assert.equal(reviewHref("", "x"), null);
});

test("reviewItems: wrong ones first, then unreached; choice indexes become the choice text", () => {
  const review = [
    { idx: 2, payload: { prompt: "$(−7) × (+3)$", choices: ["21", "−21", "−10", "4"], topic: "directed-numbers", chapter: "כפל וחילוק" }, right: "1", given: "0" },
    { idx: 9, payload: { prompt: "$x + 4 = 9$", topic: "equation-solver", chapter: "" }, right: "5", given: null },
    { idx: 12, payload: { prompt: "$2^{3}$", topic: "powers-roots", chapter: "הבנת חזקות" }, right: "-8", given: "8" },
    { idx: 13, payload: { prompt: "$1+1$", topic: "directed-numbers", chapter: "" }, right: "2", given: null },
  ];
  const qs = [{ idx: 2, kind: "choice" }, { idx: 9, kind: "number" }, { idx: 12, kind: "number" }, { idx: 13, kind: "number" }];
  const r = reviewItems(st({ result: { review }, questions: qs }));
  assert.equal(r.nWrong, 2); assert.equal(r.nUnreached, 2);
  assert.deepEqual(r.items.map((x) => x.idx), [2, 12, 9]);
  assert.equal(r.items[0].right, "−21"); assert.equal(r.items[0].given, "21"); assert.equal(r.items[0].wrong, true);
  assert.equal(r.items[1].right, "−8"); assert.equal(r.items[1].given, "8");
  assert.equal(r.items[2].given, null); assert.equal(r.items[2].wrong, false);
  assert.equal(r.items[2].href, "/topics/equation-solver");
  assert.equal(r.items[2].label, "משוואות");                           // no chapter → the topic's name
  assert.equal(r.items[0].label, "כפל וחילוק");
  assert.equal(reviewItems(st({ result: { review } }), 1).items.length, 1);
  assert.deepEqual(reviewItems(st({ result: { review: null } })).items, []);
  // no kind in questions: choices decide
  assert.equal(reviewItems(st({ result: { review: [review[0]] } })).items[0].kind, "choice");
});

test("podium: shares of the tallest, count-up lands with the rise", () => {
  assert.deepEqual(columnShares(1840, 920), [1, 0.5]);
  assert.deepEqual(columnShares(0, 0), [0, 0]);
  assert.deepEqual(columnShares(0, 500), [0, 1]);
  assert.equal(countAt(1840, 0), 0);
  assert.equal(countAt(1840, 1), 1840);
  assert.equal(countAt(1840, 2), 1840);
  assert.ok(countAt(1000, 0.5) > 500);                                // ease-out: fast first
  assert.equal(easeOut(-1), 0);
});

test("emotes: per side, valid ids only, the last one with a count", () => {
  const s = st({ emotes: [{ uid: OP, emote: "gg" }, { uid: ME, emote: "wow" }, { uid: OP, emote: "nope" }, { uid: OP, emote: "again" }] });
  assert.deepEqual(emotesOf(s, OP), ["gg", "again"]);
  assert.deepEqual(emotesOf(s, ME), ["wow"]);
  assert.deepEqual(lastEmote(s, OP), { id: "again", n: 2, label: "עוד אחד?" });
  assert.equal(lastEmote(st(), OP), null);
  assert.deepEqual(EMOTES.map((e) => e.id), ["gg", "wow", "again"]);
});

test("announce: one sentence with the result, scores, right answers and XP", () => {
  const a = announce(st());
  assert.match(a, /ניצחת!/); assert.match(a, /1840 מול 1510/); assert.match(a, /12 מתוך 15/); assert.match(a, /\+30/);
});

test("rematch: revenge is the loser's word; the cooldown counts down in whole seconds", () => {
  assert.equal(rematchLabel(st({ result: { winner: OP } })), "נקמה! עוד סיבוב");
  assert.equal(rematchLabel(st()), "עוד סיבוב");
  assert.equal(rematchLabel(st({ result: { winner: OP, gave_up: ME, xp_me: 0 } })), "עוד סיבוב");   // after giving up: no "revenge"
  assert.equal(waitLeft(10500, 0), 11);
  assert.equal(waitLeft(0, 5), 0);
});
