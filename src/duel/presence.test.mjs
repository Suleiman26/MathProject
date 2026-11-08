/* node --test src/duel/presence.test.mjs — the heartbeat poller (no React) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPresence, PING_MS, OFF_MS } from "./presence-core.js";

// a fake clock + timers we drive by hand
function world({ answers = [] } = {}) {
  let t = 1_000_000;
  const timers = new Map(); let nextId = 1;
  const pings = [];
  let vis = true;
  const queue = [...answers];
  const p = createPresence({
    ping: async () => { pings.push(t); const a = queue.length > 1 ? queue.shift() : queue[0]; return typeof a === "function" ? a() : a; },
    now: () => t,
    setTimer: (f, ms) => { const id = nextId++; timers.set(id, { f, at: t + ms }); return id; },
    clearTimer: (id) => timers.delete(id),
    visible: () => vis,
  });
  const flush = () => new Promise((r) => setTimeout(r, 0));
  async function advance(ms) {
    const end = t + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]); t = due[1].at; due[1].f(); await flush();
    }
    t = end; await flush();
  }
  return { p, pings, advance, flush, setVisible: (v) => { vis = v; }, now: () => t, timers };
}
const OK = { now: "2026-11-08T10:00:00Z", invites: [{ id: "i1" }], live: null, _sent: 0, _recv: 0 };

test("signed out → no pings, status signed_out", async () => {
  const w = world({ answers: [OK] });
  w.p.setToken(null);
  await w.advance(60000);
  assert.equal(w.pings.length, 0);
  assert.equal(w.p.get().status, "signed_out");
});

test("signed in + visible → ping now, then every 20 s; invites and live come through", async () => {
  const w = world({ answers: [{ ...OK, live: "D9" }] });
  w.p.setToken("T");
  await w.flush();
  assert.equal(w.pings.length, 1);
  assert.equal(w.p.get().status, "ok");
  assert.deepEqual(w.p.get().invites, [{ id: "i1" }]);
  assert.equal(w.p.get().liveId, "D9");
  await w.advance(PING_MS * 3);
  assert.equal(w.pings.length, 4);
});

test("hidden tab → no pings; becoming visible → ping at once", async () => {
  const w = world({ answers: [OK] });
  w.p.setToken("T");
  await w.flush();
  w.setVisible(false);
  await w.advance(PING_MS * 5);
  assert.equal(w.pings.length, 1);
  w.setVisible(true);
  w.p.onVisible();
  await w.flush();
  assert.equal(w.pings.length, 2);
  await w.advance(PING_MS);
  assert.equal(w.pings.length, 3);
});

test("switch off → back off to every 5 minutes, even when the tab keeps becoming visible", async () => {
  const w = world({ answers: [{ error: "off" }] });
  w.p.setToken("T");
  await w.flush();
  assert.equal(w.p.get().status, "off");
  assert.deepEqual(w.p.get().invites, []);
  for (let i = 0; i < 10; i++) { w.p.onVisible(); w.p.refresh(); await w.advance(PING_MS); }
  assert.equal(w.pings.length, 1, "no extra pings inside 5 minutes");
  await w.advance(OFF_MS - PING_MS * 10);
  assert.equal(w.pings.length, 2);
});

test("switch turned on later → back to 20 s", async () => {
  const w = world({ answers: [{ error: "off" }, OK] });
  w.p.setToken("T");
  await w.flush();
  await w.advance(OFF_MS);
  assert.equal(w.p.get().status, "ok");
  await w.advance(PING_MS);
  assert.equal(w.pings.length, 3);
});

test("dead session → stop pinging", async () => {
  const w = world({ answers: [{ error: "signed_out" }] });
  w.p.setToken("T");
  await w.flush();
  assert.equal(w.p.get().status, "signed_out");
  w.p.onVisible(); w.p.refresh();
  await w.advance(OFF_MS * 3);
  assert.equal(w.pings.length, 1);
});

test("network errors → growing gaps (40, 80, 160 s … max 5 min), then normal again", async () => {
  const w = world({ answers: [{ error: "network" }, { error: "network" }, { error: "network" }, OK] });
  w.p.setToken("T");
  await w.flush();
  assert.equal(w.p.get().status, "error");
  const at = [w.now()];
  for (let i = 0; i < 3; i++) { const n = w.pings.length; while (w.pings.length === n) await w.advance(1000); at.push(w.now()); }
  assert.deepEqual(at.slice(1).map((v, i) => v - at[i]), [40000, 80000, 160000]);
  assert.equal(w.p.get().status, "ok");
});

test("signing out stops the timer; signing in as someone else starts fresh", async () => {
  const w = world({ answers: [OK] });
  w.p.setToken("T");
  await w.flush();
  w.p.setToken(null);
  assert.equal(w.p.get().status, "signed_out");
  assert.deepEqual(w.p.get().invites, []);
  await w.advance(PING_MS * 3);
  assert.equal(w.pings.length, 1);
  w.p.setToken("U");
  await w.flush();
  assert.equal(w.pings.length, 2);
});

test("an answer for the old account after a switch is ignored", async () => {
  let release;
  const slow = () => new Promise((r) => { release = () => r({ ...OK, invites: [{ id: "old" }] }); });
  const w = world({ answers: [slow, OK] });
  w.p.setToken("T");
  await w.flush();                 // the ping is on its way
  w.p.setToken(null);
  release();
  await w.flush();
  assert.equal(w.p.get().status, "signed_out");
  assert.deepEqual(w.p.get().invites, []);
});

test("refresh() pings now (a realtime invite hint), but not twice within a second", async () => {
  const w = world({ answers: [OK] });
  w.p.setToken("T");
  await w.flush();
  await w.advance(5000);
  w.p.refresh(); await w.flush();
  w.p.refresh(); await w.flush();
  assert.equal(w.pings.length, 2);
  await w.advance(PING_MS - 1);
  assert.equal(w.pings.length, 2, "the 20-s timer restarted after the refresh");
  await w.advance(1);
  assert.equal(w.pings.length, 3);
});

test("stop then attach again with the same token soon after → no extra ping (React remounts)", async () => {
  const w = world({ answers: [OK] });
  w.p.setToken("T");
  await w.flush();
  await w.advance(3000);
  w.p.stop();
  w.p.setToken("T");
  await w.flush();
  assert.equal(w.pings.length, 1);
  await w.advance(PING_MS - 3000);
  assert.equal(w.pings.length, 2);
});

test("listeners get every change; offset from the server clock", async () => {
  const w = world({ answers: [{ ...OK, now: "2026-11-08T10:05:00.000Z", _sent: Date.parse("2026-11-08T10:00:00.000Z") - 100, _recv: Date.parse("2026-11-08T10:00:00.000Z") + 100 }] });
  const seen = [];
  const off = w.p.listen((s) => seen.push(s.status));
  w.p.setToken("T");
  await w.flush();
  assert.deepEqual(seen, ["idle", "ok"]);
  assert.equal(w.p.get().offset, 300000);
  off();
});
