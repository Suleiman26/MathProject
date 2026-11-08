/* node --test src/duel/api.test.mjs
   The duel API: argument names must match the SQL parameter names exactly,
   every database error code has kind Hebrew, and the API never throws. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { makeDuelApi, duelError, DUEL_ERRORS, GENERIC_ERROR } from "./api-core.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const HEB = /[֐-׿]/;

function fake({ tok = "T", rpcResult = { ok: true }, rpcThrow, fetchRes, onAuthLost } = {}) {
  const calls = [];
  const api = makeDuelApi({
    onAuthLost,
    token: () => tok,
    rpc: async (fn, args) => { calls.push({ fn, args }); if (rpcThrow) throw rpcThrow; return typeof rpcResult === "function" ? rpcResult(fn, args) : rpcResult; },
    fetch: async (url, init) => { calls.push({ url, init }); if (fetchRes instanceof Error) throw fetchRes; return fetchRes; },
    config: () => ({ functionsUrl: "https://x.supabase.co/functions/v1", supabaseKey: "sb_publishable_test" }),
  });
  return { api, calls };
}

test("every rpc wrapper sends the exact SQL parameter names", async () => {
  const F = "11111111-1111-1111-1111-111111111111", D = "22222222-2222-2222-2222-222222222222";
  const cases = [
    [(a) => a.friends(), "friends_me", { tok: "T" }],
    [(a) => a.addFriend("ab3-k9z"), "friend_add", { tok: "T", code: "ab3-k9z" }],
    [(a) => a.answerFriend(F, 1), "friend_answer", { tok: "T", other: F, accept: true }],
    [(a) => a.answerFriend(F, false), "friend_answer", { tok: "T", other: F, accept: false }],
    [(a) => a.removeFriend(F), "friend_remove", { tok: "T", other: F }],
    [(a) => a.block(F), "friend_block", { tok: "T", other: F }],
    [(a) => a.unblock(F), "friend_unblock", { tok: "T", other: F }],
    [(a) => a.report(F, "spam", D), "friend_report", { tok: "T", other: F, reason: "spam", duel: D }],
    [(a) => a.report(F, "name"), "friend_report", { tok: "T", other: F, reason: "name", duel: null }],
    [(a) => a.ping(), "presence_ping", { tok: "T" }],
    [(a) => a.invite(F, "geo"), "duel_invite", { tok: "T", friend: F, subject: "geo" }],
    [(a) => a.cancel(D), "duel_cancel", { tok: "T", id: D }],
    [(a) => a.answerInvite(D, true), "duel_answer_invite", { tok: "T", id: D, accept: true }],
    [(a) => a.state(D), "duel_state", { tok: "T", id: D }],
    [(a) => a.answer(D, 3, 2), "duel_answer", { tok: "T", id: D, idx: 3, given: "2" }],
    [(a) => a.answer(D, 4, " -3/4 "), "duel_answer", { tok: "T", id: D, idx: 4, given: " -3/4 " }],
    [(a) => a.giveUp(D), "duel_give_up", { tok: "T", id: D }],
    [(a) => a.emote(D, "gg"), "duel_emote", { tok: "T", id: D, emote: "gg" }],
    [(a) => a.history(), "duel_history", { tok: "T" }],
  ];
  for (const [call, fn, args] of cases) {
    const { api, calls } = fake();
    await call(api);
    assert.equal(calls.length, 1, fn);
    assert.equal(calls[0].fn, fn);
    assert.deepEqual(calls[0].args, args, fn);
  }
});

test("the SQL functions really have those parameter names", () => {
  const sql = ["20261108100000_duels_friends.sql", "20261108110000_duels_core.sql"]
    .map((f) => readFileSync(ROOT + "supabase/migrations/" + f, "utf8")).join("\n");
  const expect = {
    friends_me: "tok", friend_add: "tok,code", friend_answer: "tok,other,accept", friend_remove: "tok,other",
    friend_block: "tok,other", friend_unblock: "tok,other", friend_report: "tok,other,reason,duel",
    presence_ping: "tok", duel_invite: "tok,friend,subject", duel_cancel: "tok,id",
    duel_answer_invite: "tok,id,accept", duel_state: "tok,id", duel_answer: "tok,id,idx,given",
    duel_give_up: "tok,id", duel_emote: "tok,id,emote", duel_history: "tok",
  };
  for (const [fn, params] of Object.entries(expect)) {
    const all = [...sql.matchAll(new RegExp("create or replace function public\\." + fn + "\\(([^)]*)\\)", "g"))];
    assert.ok(all.length, fn + " not found");
    const last = all[all.length - 1][1]; // the latest migration's version wins
    const names = last.split(",").map((p) => p.trim().split(/\s+/)[0]).join(",");
    assert.equal(names, params, fn);
  }
});

test("no session → {error:'signed_out'} and no request", async () => {
  const { api, calls } = fake({ tok: null });
  assert.deepEqual(await api.friends(), { error: "signed_out" });
  assert.deepEqual(await api.start("x"), { error: "signed_out" });
  assert.equal(calls.length, 0);
});

test("never throws: dead session, no network, not connected", async () => {
  const unauth = Object.assign(new Error("unauthorized"), { status: 401 });
  assert.deepEqual(await fake({ rpcThrow: unauth }).api.state("d"), { error: "signed_out" });
  const forbidden = Object.assign(new Error("unauthorized"), { status: 403 });
  assert.deepEqual(await fake({ rpcThrow: forbidden }).api.ping(), { error: "signed_out" });
  assert.deepEqual(await fake({ rpcThrow: new TypeError("Failed to fetch") }).api.ping(), { error: "network" });
  assert.deepEqual(await fake({ rpcThrow: new Error("not-connected") }).api.ping(), { error: "offline" });
  assert.deepEqual(await fake({ rpcThrow: Object.assign(new Error("boom"), { status: 500 }) }).api.ping(), { error: "network" });
});

test("HTTP 4xx that isn't a dead session → bad_request; no status / 5xx → network", async () => {
  const bad = Object.assign(new Error("invalid input syntax"), { status: 400 });
  assert.deepEqual(await fake({ rpcThrow: bad }).api.addFriend("x"), { error: "bad_request" });
  const missing = Object.assign(new Error("function not found"), { status: 404 });
  assert.deepEqual(await fake({ rpcThrow: missing }).api.friends(), { error: "bad_request" });
  const many = Object.assign(new Error("too many"), { status: 429 });
  assert.deepEqual(await fake({ rpcThrow: many }).api.friends(), { error: "bad_request" });
  assert.deepEqual(await fake({ rpcThrow: Object.assign(new Error("gateway"), { status: 502 }) }).api.friends(), { error: "network" });
  assert.deepEqual(await fake({ rpcThrow: new Error("Load failed") }).api.friends(), { error: "network" });
  assert.match(duelError("bad_request"), HEB);
  assert.notEqual(duelError("bad_request"), duelError("network"));
});

test("wording: network says 'נסו', the two limits read as asked", () => {
  assert.equal(duelError("network"), "אין חיבור כרגע. נסו שוב בעוד רגע");
  assert.equal(duelError("limit_day"), "הגעת למקסימום להיום");
  assert.equal(duelError("limit_friends"), "אי אפשר להוסיף עוד חברים כרגע (עד 100)");
});

test("the function body says the token is dead → onAuthLost runs (once per call)", async () => {
  let lost = 0;
  // duel_uid / account_from: raise exception 'unauthorized' (SQLSTATE 28000) → PostgREST 400 with that message
  const unauth = Object.assign(new Error("unauthorized"), { status: 400, code: "28000" });
  assert.deepEqual(await fake({ rpcThrow: unauth, onAuthLost: () => lost++ }).api.friends(), { error: "signed_out" });
  assert.equal(lost, 1);
  // a function that answers {error:'signed_out'} as JSON
  assert.deepEqual(await fake({ rpcResult: { error: "signed_out" }, onAuthLost: () => lost++ }).api.friends(), { error: "signed_out" });
  assert.equal(lost, 2);
  // duel-start: {error:'unauthorized'} body
  const r401 = { ok: false, status: 401, text: async () => JSON.stringify({ error: "unauthorized" }) };
  assert.deepEqual(await fake({ fetchRes: r401, onAuthLost: () => lost++ }).api.start("D"), { error: "signed_out" });
  assert.equal(lost, 3);
  await fake({ tok: null, onAuthLost: () => lost++ }).api.friends();   // never had a session: nothing to clear
  assert.equal(lost, 3);
  // a hook that throws never breaks the call
  assert.deepEqual(await fake({ rpcThrow: unauth, onAuthLost: () => { throw new Error("x"); } }).api.friends(), { error: "signed_out" });
});

test("a bare HTTP 401/403 (gateway, missing grant) → signed_out for that call, but the session is NOT cleared", async () => {
  let lost = 0;
  const h401 = Object.assign(new Error("JWT expired"), { status: 401 });
  assert.deepEqual(await fake({ rpcThrow: h401, onAuthLost: () => lost++ }).api.friends(), { error: "signed_out" });
  const h403 = Object.assign(new Error("permission denied for function friends_me"), { status: 403 });
  assert.deepEqual(await fake({ rpcThrow: h403, onAuthLost: () => lost++ }).api.friends(), { error: "signed_out" });
  const s401 = { ok: false, status: 401, text: async () => "" };
  assert.deepEqual(await fake({ fetchRes: s401, onAuthLost: () => lost++ }).api.start("D"), { error: "signed_out" });
  const s403 = { ok: false, status: 403, text: async () => JSON.stringify({ error: "forbidden" }) };
  assert.deepEqual(await fake({ fetchRes: s403, onAuthLost: () => lost++ }).api.start("D"), { error: "signed_out" });
  assert.equal(lost, 0);
});

test("database errors come back as they are (with extras like wait_s)", async () => {
  const { api } = fake({ rpcResult: { error: "cooldown", wait_s: 12 } });
  assert.deepEqual(await api.invite("f", "num"), { error: "cooldown", wait_s: 12 });
  const { api: api2 } = fake({ rpcResult: null });
  assert.deepEqual(await api2.removeFriend("f"), { ok: true });
});

test("state() and ping() carry local send/receive times for the clock", async () => {
  const { api } = fake({ rpcResult: () => ({ now: "2026-11-08T10:00:10Z", status: "live" }) });
  const r = await api.state("d");
  assert.equal(r.status, "live");
  assert.ok(Number.isFinite(r._sent) && Number.isFinite(r._recv) && r._recv >= r._sent);
  const p = await api.ping();
  assert.ok(Number.isFinite(p._sent) && Number.isFinite(p._recv));
});

test("double tap: the same answer / invite in flight is sent once", async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const calls = [];
  const api = makeDuelApi({
    token: () => "T",
    rpc: async (fn, args) => { calls.push(fn); await gate; return { correct: true }; },
    fetch: async () => ({}), config: () => ({}),
  });
  const a = api.answer("d", 0, "1"), b = api.answer("d", 0, "1"), c = api.answer("d", 1, "1");
  const i1 = api.invite("f", "num"), i2 = api.invite("f", "num");
  const e1 = api.emote("d", "gg"), e2 = api.emote("d", "gg"), e3 = api.emote("d", "wow");
  release();
  const [ra, rb] = await Promise.all([a, b, c, i1, i2, e1, e2, e3]);
  assert.equal(ra, rb);
  assert.equal(await e1, await e2);
  assert.deepEqual(calls, ["duel_answer", "duel_answer", "duel_invite", "duel_emote", "duel_emote"]);
  await api.answer("d", 0, "1");            // after it finished, a new call goes through (server says 'order')
  assert.equal(calls.length, 6);
});

test("start(id) posts {tok,id} to the duel-start edge function with the publishable key", async () => {
  const ok = { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) };
  const { api, calls } = fake({ fetchRes: ok });
  assert.deepEqual(await api.start("D1"), { ok: true });
  assert.equal(calls[0].url, "https://x.supabase.co/functions/v1/duel-start");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.apikey, "sb_publishable_test");
  assert.equal(calls[0].init.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].init.body), { tok: "T", id: "D1" });
});

test("start(id) errors: {error} body, bad HTTP without body, network", async () => {
  const gone = { ok: false, status: 409, text: async () => JSON.stringify({ error: "gone" }) };
  assert.deepEqual(await fake({ fetchRes: gone }).api.start("D"), { error: "gone" });
  const html = { ok: false, status: 502, text: async () => "<html>bad gateway</html>" };
  assert.deepEqual(await fake({ fetchRes: html }).api.start("D"), { error: "start" });
  const unauth = { ok: false, status: 401, text: async () => JSON.stringify({ error: "unauthorized" }) };
  assert.deepEqual(await fake({ fetchRes: unauth }).api.start("D"), { error: "signed_out" });
  assert.deepEqual(await fake({ fetchRes: new TypeError("Failed to fetch") }).api.start("D"), { error: "network" });
});

test("duelError: cooldown is Hebrew and uses wait_s", () => {
  const plain = duelError("cooldown");
  assert.match(plain, HEB);
  assert.notEqual(plain, GENERIC_ERROR);
  const withWait = duelError({ error: "cooldown", wait_s: 12 });
  assert.match(withWait, /12/);
  assert.match(withWait, HEB);
  assert.match(duelError("cooldown", { wait_s: 7 }), /7/);
});

test("duelError: unknown code → the generic Hebrew message", () => {
  assert.equal(duelError("no_such_code_xyz"), GENERIC_ERROR);
  assert.equal(duelError(undefined), GENERIC_ERROR);
  assert.equal(duelError({}), GENERIC_ERROR);
  assert.equal(duelError("toString"), GENERIC_ERROR);   // no prototype keys
  assert.match(GENERIC_ERROR, HEB);
});

test("every error code the database (and edge function) can return has its own Hebrew", () => {
  const files = ["supabase/migrations/20261108100000_duels_friends.sql", "supabase/migrations/20261108110000_duels_core.sql"];
  const fnDir = ROOT + "supabase/functions/duel-start/";
  if (existsSync(fnDir)) for (const f of readdirSync(fnDir)) if (/\.(ts|js)$/.test(f) && !/test/.test(f)) files.push("supabase/functions/duel-start/" + f);
  const codes = new Set(["off", "signed_out", "network", "offline", "start"]);
  for (const f of files) {
    const src = readFileSync(ROOT + f, "utf8");
    for (const m of src.matchAll(/'error',\s*'([a-z_]+)'/g)) codes.add(m[1]);
    for (const m of src.matchAll(/error:\s*["']([a-z_]+)["']/g)) codes.add(m[1]);
  }
  assert.ok(codes.size >= 25, "found only " + codes.size);
  for (const c of codes) {
    assert.ok(Object.prototype.hasOwnProperty.call(DUEL_ERRORS, c), "no Hebrew for '" + c + "'");
    const msg = duelError(c);
    assert.match(msg, HEB, c);
    assert.notEqual(msg, GENERIC_ERROR, c);
    assert.ok(msg.length <= 70, c + " too long: " + msg);
  }
});

test("errors that could hide a block read neutrally (no 'blocked', no 'you')", () => {
  for (const c of ["not_friend", "gone", "no_code", "busy"]) {
    assert.doesNotMatch(duelError(c), /חס(ם|מ)/, c);
  }
});
