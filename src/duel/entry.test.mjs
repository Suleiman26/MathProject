// Duels, task 9: the entry-point gate (gate.js), duel XP in xpOf and the duel badges (src/lib/progress.js).
// Run: node --test src/duel/*.test.mjs
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { duelOpen, setDuelOpen, gateFrom, onDuelOpen, _resetGate } from "./gate.js";
import { xpOf, playerLevel, duelBadges, DUEL_BADGES, BADGES } from "../lib/progress.js";

const ROOT = new URL("../../", import.meta.url).pathname;

// a tiny localStorage for node
function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}
beforeEach(() => { globalThis.localStorage = fakeStorage(); _resetGate(); });

test("gate: unknown until a server answer, then remembered per account", () => {
  assert.equal(duelOpen("u1"), null);
  assert.equal(duelOpen(null), false);            // signed out: never open
  setDuelOpen("u1", true);
  assert.equal(duelOpen("u1"), true);
  assert.equal(duelOpen("u2"), null);              // another account on the same device
  // a fresh page load reads it back
  _resetGate();
  assert.equal(duelOpen("u1"), true);
  setDuelOpen("u1", false);
  _resetGate();
  assert.equal(duelOpen("u1"), false);
});

test("gate: only {error:'off'} closes; network trouble changes nothing", () => {
  assert.equal(gateFrom({ error: "off" }), false);
  assert.equal(gateFrom({ online: 2, friends: 3, faces: [] }), true);
  assert.equal(gateFrom({ stats: {}, recent: [] }), true);
  assert.equal(gateFrom({ now: "x", invites: [] }), true);
  for (const r of [{ error: "network" }, { error: "offline" }, { error: "signed_out" }, { error: "bad_request" }, null, undefined, "x"]) {
    assert.equal(gateFrom(r), null, JSON.stringify(r));
  }
});

test("gate: listeners hear changes only, and bad input is ignored", () => {
  const heard = [];
  const off = onDuelOpen((u, v) => heard.push([u, v]));
  setDuelOpen("u1", true);
  setDuelOpen("u1", true);                          // no change → no event
  setDuelOpen("u1", false);
  setDuelOpen("", true);
  setDuelOpen("u1", "yes");
  off();
  setDuelOpen("u1", true);
  assert.deepEqual(heard, [["u1", true], ["u1", false]]);
});

test("gate: a broken or missing localStorage never throws", () => {
  globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  _resetGate();
  assert.equal(duelOpen("u1"), null);
  setDuelOpen("u1", true);
  assert.equal(duelOpen("u1"), true);
  delete globalThis.localStorage;
  _resetGate();
  assert.equal(duelOpen("u1"), null);
});

test("gate: keeps at most 5 accounts on the device", () => {
  for (let i = 1; i <= 8; i++) setDuelOpen("u" + i, i % 2 === 0);
  const saved = JSON.parse(globalThis.localStorage.getItem("mp:duel:open"));
  assert.equal(Object.keys(saved).length, 5);
  assert.deepEqual(saved.u8, 1);
});

test("xpOf adds the duel XP to the practice points (same sum as duel_level in SQL)", () => {
  assert.equal(xpOf(null), 0);
  assert.equal(xpOf({ win: 3, ok: 5 }), 35);                      // older answers without duel_xp
  assert.equal(xpOf({ win: 3, ok: 5, duel_xp: 45 }), 80);
  assert.equal(xpOf({ win: 3, ok: 5, duel_xp: null }), 35);
  assert.equal(playerLevel(xpOf({ win: 3, ok: 5, duel_xp: 45 })).L, 1);   // the pgTAP test: 80 → level 1
  assert.equal(playerLevel(xpOf({ win: 3, ok: 5, duel_xp: 70 })).L, 2);   // 105 → level 2
  // the SQL copy still says what it adds
  const sql = readFileSync(ROOT + "supabase/migrations/20261108100000_duels_friends.sql", "utf8");
  assert.match(sql, /count\(\*\) filter \(where kind = 'win'\), 0\) \* 10 \+ coalesce\(count\(\*\) filter \(where kind = 'ok'\)/);
  assert.match(sql, /xp := xp \+ coalesce\(\(select duel_xp from accounts where id = uid\), 0\)/);
  assert.match(sql, /cost := 100 \+ 50 \* \(lvl - 1\)/);
});

test("duel badges: first duel, first win, 5 wins, 25 wins, perfect, comeback", () => {
  assert.deepEqual(Object.keys(DUEL_BADGES), ["duel_first", "duel_win1", "duel_win5", "duel_win25", "duel_perfect", "duel_comeback"]);
  for (const id of Object.keys(DUEL_BADGES)) assert.ok(!(id in BADGES), id + " clashes with a practice badge");
  assert.deepEqual(duelBadges(null), []);
  const none = duelBadges({ played: 0, wins: 0, losses: 0, draws: 0, perfect: 0, comebacks: 0, duel_xp: 0 });
  assert.equal(none.length, 6);
  assert.ok(none.every((b) => !b.got && b.have === 0));
  const some = Object.fromEntries(duelBadges({ played: 9, wins: 5, perfect: 1, comebacks: 0 }).map((b) => [b.id, b]));
  assert.equal(some.duel_first.got, true);
  assert.equal(some.duel_win1.got, true);
  assert.equal(some.duel_win5.got, true);
  assert.deepEqual([some.duel_win25.got, some.duel_win25.have, some.duel_win25.need], [false, 5, 25]);
  assert.equal(some.duel_perfect.got, true);
  assert.equal(some.duel_comeback.got, false);
  // strings from the server, junk → 0
  const s = Object.fromEntries(duelBadges({ played: "2", wins: "x", comebacks: -1 }).map((b) => [b.id, b]));
  assert.equal(s.duel_first.got, true);
  assert.equal(s.duel_win1.have, 0);
  assert.equal(s.duel_comeback.have, 0);
});
