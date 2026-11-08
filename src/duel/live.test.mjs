/* node --test src/duel/live.test.mjs — live hints with a fake realtime client */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { subscribe, isConnected, __setLiveDeps, __resetLive } from "./live.js";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function fakeRealtime() {
  const made = { clients: [], channels: [] };
  class Channel {
    constructor(topic, params, client) { this.topic = "realtime:" + topic; this.params = params; this.client = client; this.handlers = []; this.closed = false; }
    on(type, filter, cb) { this.handlers.push({ type, filter, cb }); return this; }
    subscribe(cb) { this.cb = cb; return this; }
    emit(event, payload) { for (const h of this.handlers) if (h.type === "broadcast") h.cb({ type: "broadcast", event, payload }); }
    status(s) { this.cb && this.cb(s); }
    async unsubscribe() { this.closed = true; return "ok"; }
    teardown() { this.torn = true; }
  }
  class RealtimeClient {
    constructor(url, opts) { this.url = url; this.opts = opts; this.channels = []; this.connected = true; this.connects = 0; made.clients.push(this); }
    channel(topic, params) {
      const ex = this.channels.find((c) => c.topic === "realtime:" + topic);
      if (ex) return ex;
      const c = new Channel(topic, params, this); this.channels.push(c); made.channels.push(c); return c;
    }
    getChannels() { return this.channels; }
    async removeChannel(ch) { await ch.unsubscribe(); ch.teardown(); this._remove(ch); return "ok"; }
    _remove(ch) { this.channels = this.channels.filter((c) => c !== ch); }
    isConnected() { return this.connected; }
    connect() { this.connects++; this.connected = true; }
  }
  return { made, mod: { RealtimeClient } };
}

let rt;
beforeEach(() => {
  __resetLive();
  rt = fakeRealtime();
  __setLiveDeps({
    load: async () => rt.mod,
    config: () => ({ supabaseUrl: "https://abc.supabase.co", supabaseKey: "sb_publishable_x" }),
    retryMs: () => 5,
    win: () => null,
  });
});

test("connects with the publishable key to the realtime websocket, public channel", async () => {
  const off = subscribe("inbox123", () => {});
  await tick();
  assert.equal(rt.made.clients.length, 1);
  assert.equal(rt.made.clients[0].url, "wss://abc.supabase.co/realtime/v1");
  assert.deepEqual(rt.made.clients[0].opts.params, { apikey: "sb_publishable_x" });
  const ch = rt.made.channels[0];
  assert.equal(ch.topic, "realtime:inbox123");
  assert.equal(ch.params.config.private, false);
  off();
});

test("hints carry only the event name; unknown events are ignored", async () => {
  const got = [];
  const off = subscribe("duelchan", (...a) => got.push(a));
  await tick();
  const ch = rt.made.channels[0];
  ch.status("SUBSCRIBED");
  ch.emit("opp_answer", { uid: "x", idx: 3, id: "injected" });
  ch.emit("hack", { a: 1 });
  ch.emit("duel_end", { id: "d" });
  assert.deepEqual(got, [["sync"], ["opp_answer"], ["duel_end"]]);
  off();
});

test("status: connected after SUBSCRIBED, not after an error; 'sync' again on rejoin", async () => {
  const got = [], st = [];
  const off = subscribe("t1", (e) => got.push(e), { onStatus: (v) => st.push(v) });
  await tick();
  assert.equal(isConnected("t1"), false);
  const ch = rt.made.channels[0];
  ch.status("SUBSCRIBED");
  assert.equal(isConnected("t1"), true);
  ch.status("CHANNEL_ERROR");
  assert.equal(isConnected("t1"), false);
  ch.status("SUBSCRIBED");
  assert.deepEqual(got, ["sync", "sync"]);
  assert.deepEqual(st, [false, true, false, true]);
  assert.equal(rt.made.channels.length, 1, "error/rejoin is left to realtime-js, no new channel");
  off();
});

test("a channel the server closes is rebuilt", async () => {
  const got = [];
  const off = subscribe("t2", (e) => got.push(e));
  await tick();
  const ch = rt.made.channels[0];
  ch.status("SUBSCRIBED");
  rt.made.clients[0]._remove(ch);           // what realtime-js does on close
  ch.status("CLOSED");
  assert.equal(isConnected("t2"), false);
  await tick(20);
  assert.equal(rt.made.channels.length, 2);
  rt.made.channels[1].status("SUBSCRIBED");
  assert.equal(isConnected("t2"), true);
  assert.deepEqual(got, ["sync", "sync"]);
  off();
});

test("unsubscribe stops hints and removes the channel; shared topic stays until the last one leaves", async () => {
  const a = [], b = [];
  const offA = subscribe("shared", (e) => a.push(e));
  const offB = subscribe("shared", (e) => b.push(e));
  await tick();
  assert.equal(rt.made.channels.length, 1);
  const ch = rt.made.channels[0];
  ch.status("SUBSCRIBED");
  offA();
  ch.emit("emote");
  assert.deepEqual(a, ["sync"]);
  assert.deepEqual(b, ["sync", "emote"]);
  offB();
  await tick();
  assert.equal(ch.closed, true);
  assert.equal(rt.made.clients[0].channels.length, 0);
  ch.emit("emote");
  assert.deepEqual(b, ["sync", "emote"]);
  assert.equal(isConnected("shared"), false);
});

test("unsubscribe before realtime-js finished loading → no channel at all", async () => {
  const off = subscribe("early", () => {});
  off();
  await tick();
  assert.equal(rt.made.channels.length, 0);
});

test("subscribing again to a topic after leaving gets a fresh channel", async () => {
  const off1 = subscribe("again", () => {});
  await tick();
  off1();
  await tick();
  const got = [];
  const off2 = subscribe("again", (e) => got.push(e));
  await tick();
  assert.equal(rt.made.channels.length, 2);
  rt.made.channels[1].status("SUBSCRIBED");
  assert.deepEqual(got, ["sync"]);
  off2();
});

test("bad arguments → a harmless no-op", () => {
  assert.equal(typeof subscribe("", () => {}), "function");
  assert.equal(typeof subscribe("x", null), "function");
  assert.equal(rt.made.clients.length, 0);
});
