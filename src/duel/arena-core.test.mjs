/* node --test src/duel/arena-core.test.mjs
   The live duel's rules on the phone: tug bar, countdown from server time,
   lock timing from lock_until, keypad keys, overtake, lanes, optimistic merge. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tugWidth, countdown, lockLeft, fmtClock, timeLeft, phaseOf, overtake, streakLabel, laneClass, oppPing,
  keypadFor, typeKey, typedOk, typedParts, applyAnswer, mergeState, feedbackMs, parseTs, duelColors, colorVars, inviteLeft, currentQuestion,
  GO_MS, COUNT_MS,
} from "./arena-core.js";

const T0 = Date.parse("2026-11-08T10:00:00.000Z");

test("tug bar: opponent fill = 50 − clamp(diff/14, −42, 42)", () => {
  assert.equal(tugWidth(0, 0), 50);
  assert.equal(tugWidth(140, 0), 40);             // I lead by 140 → their side shrinks
  assert.equal(tugWidth(0, 140), 60);
  assert.equal(tugWidth(10000, 0), 8);            // clamped
  assert.equal(tugWidth(0, 10000), 92);
  assert.equal(tugWidth(null, undefined), 50);
});

test("countdown is drawn from start_at in server time", () => {
  const start = "2026-11-08T10:00:10.000Z";
  assert.deepEqual(countdown(start, T0 + 5000).phase, "hold");
  assert.deepEqual(countdown(start, T0 + 10000 - COUNT_MS).phase, "count");
  assert.equal(countdown(start, T0 + 7100).n, 3);
  assert.equal(countdown(start, T0 + 8100).n, 2);
  assert.equal(countdown(start, T0 + 9100).n, 1);
  assert.equal(countdown(start, T0 + 9999).n, 1);
  assert.equal(countdown(start, T0 + 10000).phase, "go");
  assert.equal(countdown(start, T0 + 10000 + GO_MS - 1).phase, "go");
  assert.equal(countdown(start, T0 + 10000 + GO_MS).phase, "live");
  assert.equal(countdown(null, T0).phase, "hold");
});

test("a phone 5 minutes off sees the same countdown once the offset is applied", () => {
  const start = "2026-11-08T10:00:10.000Z";
  const phoneNow = T0 + 8000 - 300000;            // phone is 5 min behind
  const offset = 300000;
  assert.equal(countdown(start, phoneNow + offset).n, 2);
});

test("lock overlay time comes from lock_until", () => {
  assert.equal(lockLeft("2026-11-08T10:00:02.000Z", T0), 2000);
  assert.equal(lockLeft("2026-11-08T10:00:02.000Z", T0 + 1500), 500);
  assert.equal(lockLeft("2026-11-08T10:00:02.000Z", T0 + 3000), 0);
  assert.equal(lockLeft(null, T0), 0);
  assert.equal(feedbackMs({ correct: true }, T0), 450);
  assert.equal(feedbackMs({ correct: false, lock_until: "2026-11-08T10:00:02.000Z" }, T0), 2000);
  assert.equal(feedbackMs({ correct: false, lock_until: null }, T0), 2000);
  assert.equal(feedbackMs({ error: "order" }, T0), 0);
});

test("timestamps from Postgres parse (microseconds, +00, space)", () => {
  assert.equal(parseTs("2026-11-08T10:00:00.123456+00:00"), T0 + 123);
  assert.equal(parseTs("2026-11-08 10:00:00.5+00"), T0 + 500);
  assert.equal(parseTs("2026-11-08T10:00:00Z"), T0);
  assert.ok(Number.isNaN(parseTs("")));
  assert.ok(Number.isNaN(parseTs(null)));
});

test("timer text and hot zone", () => {
  assert.equal(fmtClock(300000), "5:00");
  assert.equal(fmtClock(29400), "0:30");
  assert.equal(fmtClock(0), "0:00");
  assert.equal(fmtClock(-5000), "0:00");
  assert.equal(timeLeft("2026-11-08T10:05:00Z", T0), 300000);
});

test("phase of the screen", () => {
  const live = { status: "live", start_at: "2026-11-08T10:00:10Z", ends_at: "2026-11-08T10:05:10Z", me: { done: false } };
  assert.equal(phaseOf(null, T0), "loading");
  assert.equal(phaseOf({ status: "invited" }, T0), "invited");
  assert.equal(phaseOf({ status: "accepted" }, T0), "accepted");
  assert.equal(phaseOf(live, T0), "faceoff");
  assert.equal(phaseOf(live, T0 + 10000 + GO_MS), "arena");
  assert.equal(phaseOf({ ...live, me: { done: true } }, T0 + 60000), "waiting");
  assert.equal(phaseOf(live, T0 + 310001), "finishing");          // time up, server not done yet → never decide here
  assert.equal(phaseOf({ status: "done" }, T0), "done");
  for (const s of ["failed", "expired", "cancelled", "declined"]) assert.equal(phaseOf({ status: s }, T0), "ended");
});

test("overtake: a flip, or a lead from a tie where both scored; never the first points", () => {
  assert.equal(overtake({ my: 0, opp: 0 }, { my: 120, opp: 0 }), null);
  assert.equal(overtake({ my: 0, opp: 100 }, { my: 120, opp: 100 }), "me");
  assert.equal(overtake({ my: 120, opp: 100 }, { my: 120, opp: 240 }), "opp");
  assert.equal(overtake({ my: 100, opp: 100 }, { my: 220, opp: 100 }), "me");
  assert.equal(overtake({ my: 120, opp: 100 }, { my: 240, opp: 100 }), null);
  assert.equal(overtake({ my: 120, opp: 100 }, { my: 120, opp: 120 }), null);
});

test("streak label and lanes", () => {
  assert.equal(streakLabel(2), "");
  assert.equal(streakLabel(3), "רצף 3 · ×1.2");
  assert.equal(streakLabel(5), "רצף 5 · ×1.5");
  const lanes = [true, false, null, null];
  assert.equal(laneClass(lanes, 0, 2, true), "ok");
  assert.equal(laneClass(lanes, 1, 2, true), "no");
  assert.equal(laneClass(lanes, 2, 2, true), "now");
  assert.equal(laneClass(lanes, 3, 2, true), "");
  assert.equal(laneClass(lanes, 2, 2, false), "");
  assert.equal(laneClass(null, 0, 0, true), "now");
});

test("opponent ping only when their idx advanced; only right/wrong, never the answer", () => {
  const a = { idx: 3, lanes: [true, true, false, null] };
  const b = { idx: 4, lanes: [true, true, false, true] };
  assert.deepEqual(oppPing(a, b), { ok: true, idx: 3 });
  assert.equal(oppPing(b, b), null);
  assert.equal(oppPing(b, a), null);
  assert.equal(oppPing(null, b), null);
  assert.deepEqual(oppPing(a, { idx: 4, lanes: [true, true, false, false] }), { ok: false, idx: 3 });
});

test("keypad keys: hint wins; '/' for ratio-percent + powers-roots, '.' for ratio-percent", () => {
  assert.deepEqual(keypadFor({ payload: { topic: "directed-numbers", prompt: "$(+3) + (−2) = ?$" } }), { fraction: false, decimal: false });
  assert.deepEqual(keypadFor({ payload: { topic: "equation-solver", prompt: "x = ?" } }), { fraction: false, decimal: false });
  assert.deepEqual(keypadFor({ payload: { topic: "ratio-percent", prompt: "המרת שבר לעשרוני" } }), { fraction: true, decimal: true });
  assert.deepEqual(keypadFor({ payload: { topic: "powers-roots", prompt: "$4^{−3} = ?$" } }), { fraction: true, decimal: false });
  assert.deepEqual(keypadFor({ payload: { topic: "directed-numbers", prompt: "x", keys: ["/"] } }), { fraction: true, decimal: false });
  assert.deepEqual(keypadFor({ payload: { topic: "ratio-percent", prompt: "x", keys: [] } }), { fraction: false, decimal: false });
  assert.deepEqual(keypadFor({ payload: { topic: "ratio-percent", prompt: "x", display: { fraction: false, decimal: true } } }), { fraction: false, decimal: true });
  assert.deepEqual(keypadFor(null), { fraction: false, decimal: false });
});

test("typing on the keypad", () => {
  let s = "";
  for (const k of ["1", "2"]) s = typeKey(s, k);
  assert.equal(s, "12");
  assert.equal(typeKey(s, "−"), "−12");
  assert.equal(typeKey("−12", "−"), "12");
  assert.equal(typeKey("3", "/"), "3/");
  assert.equal(typeKey("3/", "/"), "3/");
  assert.equal(typeKey("", "/"), "");
  assert.equal(typeKey("3/8", "."), "3/8.");
  assert.equal(typeKey("0.5", "."), "0.5");
  assert.equal(typeKey("0.5", "⌫"), "0.");
  assert.equal(typeKey("", "⌫"), "");
  assert.equal(typeKey("1234567890", "1"), "1234567890");
  assert.equal(typeKey("5", "x"), "5");
  assert.deepEqual(typedParts("−3/8"), { neg: true, num: "3", den: "8" });
  assert.deepEqual(typedParts("0.375"), { neg: false, num: "0.375", den: null });
  assert.ok(typedOk("3/8")); assert.ok(typedOk("−3")); assert.ok(typedOk("0.375"));
  assert.ok(!typedOk("")); assert.ok(!typedOk("−")); assert.ok(!typedOk("3/")); assert.ok(!typedOk("3/0")); assert.ok(!typedOk("3."));
});

test("applyAnswer folds duel_answer into the state; mergeState never moves me backwards", () => {
  const st = { status: "live", me: { idx: 2, score: 100, ok: 1, streak: 1 }, my_lanes: [true, false, null, null], questions: [{ idx: 0 }, { idx: 1 }, { idx: 2 }] };
  const a = applyAnswer(st, 2, { correct: true, score: 242, streak: 2, points: 142, lock_until: null });
  assert.equal(a.me.idx, 3); assert.equal(a.me.score, 242); assert.equal(a.me.ok, 2); assert.equal(a.me.streak, 2); assert.equal(a.my_lanes[2], true);
  const w = applyAnswer(st, 2, { correct: false, score: 100, streak: 0, points: 0, lock_until: "2026-11-08T10:00:02Z" });
  assert.equal(w.me.idx, 3); assert.equal(w.me.streak, 0); assert.equal(w.my_lanes[2], false); assert.equal(w.me.lock_until, "2026-11-08T10:00:02Z");
  assert.equal(applyAnswer(st, 1, { correct: true }), st);      // stale idx: untouched
  const old = { ...st, me: { ...st.me, idx: 2 } };
  const merged = mergeState(a, old);
  assert.equal(merged.me.idx, 3);                                // a slow old response can't undo my answer
  assert.equal(mergeState(a, { ...a, status: "done", me: { idx: 15 } }).status, "done");
  assert.equal(mergeState(a, { error: "network" }), a);
  assert.equal(currentQuestion(st).idx, 2);
  assert.equal(currentQuestion(st, 1).idx, 1);
  assert.equal(currentQuestion(st, 9), null);
});

test("colours: same colour → opponent turns rose", () => {
  assert.deepEqual(duelColors("teal", "pink"), { me: "teal", op: "pink" });
  assert.deepEqual(duelColors("pink", "pink"), { me: "pink", op: "rose" });
  assert.deepEqual(duelColors("nope", null), { me: "teal", op: "rose" });
  const v = colorVars("sky", "orange");
  assert.equal(v["--me-5"], "#0ea5e9"); assert.equal(v["--op-7"], "#c2410c");
});

test("invite ring", () => {
  assert.equal(inviteLeft("2026-11-08T10:01:00Z", T0), 60000);
  assert.equal(inviteLeft("2026-11-08T10:01:00Z", T0 + 70000), 0);
});
