// duel-start edge function: end-to-end against the LOCAL Supabase.
//
// Needs (see supabase/functions/duel-start/README in the task report):
//   supabase start
//   Vault secret 'duel_secret' in the local DB = DUEL_SECRET in supabase/.env.local
//   supabase functions serve duel-start --no-verify-jwt --env-file supabase/.env.local
// Run:  node --test supabase/functions/duel-start/test.mjs
//
// Writes test accounts/duels into the local database only (never the live one:
// the URLs below are the local ones from src/lib/config.js).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gradeFor, subjectFor, toRows, corsHeaders } from "./core.mjs";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

// the LOCAL block of src/lib/config.js (publishable key = Supabase's shared local default)
const cfg = readFileSync(ROOT + "src/lib/config.js", "utf8").split("const LOCAL")[1];
const API = cfg.match(/supabaseUrl:\s*"([^"]+)"/)[1];
const KEY = cfg.match(/supabaseKey:\s*"([^"]+)"/)[1];
const FN = cfg.match(/functionsUrl:\s*"([^"]+)"/)[1] + "/duel-start";
const DB = process.env.LOCAL_DB_URL || "postgresql://postgres:postgres@127.0.0.1:56422/postgres";
assert.match(API, /^http:\/\/127\.0\.0\.1:/, "tests run against the local Supabase only");

const sql = (q) => execFileSync("psql", [DB, "-Atq", "-c", q], { encoding: "utf8" }).trim();

async function rpc(fn, args) {
  const r = await fetch(`${API}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const body = await r.json();
  assert.ok(r.ok, `${fn} → HTTP ${r.status} ${JSON.stringify(body)}`);
  return body;
}

// what the site does: POST {tok, id} with only the publishable key
async function start(body, { method = "POST", origin = "http://localhost:5180", raw } = {}) {
  const r = await fetch(FN, {
    method,
    headers: { apikey: KEY, "content-type": "application/json", origin },
    body: method === "GET" ? undefined : raw ?? JSON.stringify(body),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text, headers: r.headers };
}

// every key at every depth
function keysDeep(x, out = new Set()) {
  if (Array.isArray(x)) x.forEach((v) => keysDeep(v, out));
  else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { out.add(k); keysDeep(v, out); }
  return out;
}

const run = Date.now().toString(36).slice(-6);
const P = {};
async function signup(name, grade) {
  const r = await rpc("account_signup", {
    username: name + run, password: "passw0rd1", grade, terms_version: sql("select public.account_terms_version()"),
    accept: true, parent_ok: true, device: null,
  });
  assert.ok(r.token, JSON.stringify(r));
  P[name] = { tok: r.token, id: r.account.id };
}
async function befriend(x, y) {
  const { code } = await rpc("friends_me", { tok: P[y].tok });
  const r1 = await rpc("friend_add", { tok: P[x].tok, code });
  assert.ok(!r1.error, JSON.stringify(r1));
  const r2 = await rpc("friend_answer", { tok: P[y].tok, other: P[x].id, accept: true });
  assert.ok(!r2.error, JSON.stringify(r2));
}
async function acceptedDuel(x, y, subject) {
  const inv = await rpc("duel_invite", { tok: P[x].tok, friend: P[y].id, subject });
  assert.ok(inv.id, JSON.stringify(inv));
  const acc = await rpc("duel_answer_invite", { tok: P[y].tok, id: inv.id, accept: true });
  assert.equal(acc.status, "accepted", JSON.stringify(acc));
  return inv.id;
}

let prevSwitch;
before(async () => {
  prevSwitch = sql("select value::text from public.site_settings where key = 'duels'");
  sql(`update public.site_settings set value = '"on"' where key = 'duels'`);
  await signup("dsa", "9");
  await signup("dsb", "7");
  await signup("dsc", null);   // no grade → 9
  await signup("dsd", null);
  await befriend("dsa", "dsb");
  await befriend("dsc", "dsd");
});

// ── pure helpers (core.mjs) ───────────────────────────────────────────────────
test("gradeFor: min of both grades, text grades work, missing → 9, kept to 7..9", () => {
  assert.equal(gradeFor("9", "7"), 7);
  assert.equal(gradeFor(8, 9), 8);
  assert.equal(gradeFor(null, 8), 8);
  assert.equal(gradeFor(undefined, null), 9);
  assert.equal(gradeFor("x", ""), 9);
  assert.equal(gradeFor(5, 9), 7);
  assert.equal(gradeFor(12, 12), 9);
});

test("subjectFor: a world with no questions for this grade falls back to 'random'", () => {
  assert.equal(subjectFor("num", 7), "num");
  assert.equal(subjectFor("alg", 7), "alg");
  assert.equal(subjectFor("geo", 9), "random");
  assert.equal(subjectFor("nope", 9), "random");
});

test("toRows: idx 0..14, answer/tol kept top-level for the DB, meta and unknown keys dropped", () => {
  const qs = Array.from({ length: 15 }, (_, i) => ({
    gen: "g", topic: "t", chapter: "c", kind: i % 4 === 3 ? "number" : "choice", prompt: "p" + i,
    ...(i % 4 === 3 ? { answer: "5", tol: 0.01 } : { choices: ["1", "2", "3", "4"], answer: "2" }),
    meta: { a: 1, answer: 2 }, secretThing: 1,
  }));
  const rows = toRows(qs);
  assert.equal(rows.length, 15);
  rows.forEach((r, i) => {
    assert.equal(r.idx, i);
    assert.ok(!("meta" in r) && !("secretThing" in r));
    assert.equal(typeof r.answer, "string");
  });
  assert.equal(rows[3].tol, 0.01);
  assert.ok(!("tol" in rows[0]));
});

test("corsHeaders: the live site, localhost:5180 and *.vercel.app previews only", () => {
  const ok = (o) => corsHeaders(o)["access-control-allow-origin"] === o;
  assert.ok(ok("https://mathproject-gamma.vercel.app"));
  assert.ok(ok("http://localhost:5180"));
  assert.ok(ok("https://mathproject-git-duels-math-project.vercel.app"));
  assert.ok(!ok("https://evil.com"));
  assert.ok(!ok("https://vercel.app.evil.com"));
  assert.ok(!ok("http://mathproject-gamma.vercel.app"));
  assert.ok(!ok("null"));
  assert.match(corsHeaders("http://localhost:5180")["access-control-allow-headers"], /apikey/);
});

// ── the served function ───────────────────────────────────────────────────────
// Locally, Kong's own cors plugin answers every /functions/v1 preflight with "*" (the hosted
// gateway passes OPTIONS through to the function), so the function's own CORS answer is read
// straight from the edge runtime, from inside the local Kong container.
function direct(origin, method = "OPTIONS") {
  const req = `${method} /duel-start HTTP/1.1\r\nHost: edge\r\nOrigin: ${origin}\r\n` +
              `Access-Control-Request-Method: POST\r\nContent-Length: 0\r\n\r\n`;
  const out = execFileSync("docker", ["exec", "supabase_kong_mathproject", "sh", "-c",
    `(printf '${req}'; sleep 2) | nc supabase_edge_runtime_mathproject 8081`], { encoding: "utf8" });
  const h = {};
  for (const line of out.split("\r\n").slice(1)) { const i = line.indexOf(":"); if (i > 0) h[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim(); }
  return { status: Number(out.split(" ")[1]), h };
}

test("CORS (function's own answer): allowed origins get the headers, a stranger doesn't", () => {
  for (const o of ["https://mathproject-gamma.vercel.app", "http://localhost:5180", "https://mathproject-git-duels-x.vercel.app"]) {
    const r = direct(o);
    assert.ok(r.status >= 200 && r.status < 300, o + " status " + r.status);
    assert.equal(r.h["access-control-allow-origin"], o);
    assert.match(r.h["access-control-allow-methods"] || "", /POST/);
    assert.match(r.h["access-control-allow-headers"] || "", /apikey/);
  }
  const bad = direct("https://evil.com");
  assert.equal(bad.h["access-control-allow-origin"], undefined);
  // the error answers carry it too (the browser must be able to read {error})
  assert.equal(direct("http://localhost:5180", "POST").h["access-control-allow-origin"], "http://localhost:5180");
});

test("CORS through the local gateway: preflight answers 2xx", async () => {
  const r = await fetch(FN, { method: "OPTIONS", headers: { origin: "https://mathproject-gamma.vercel.app",
    "access-control-request-method": "POST", "access-control-request-headers": "apikey,content-type" } });
  assert.ok(r.status >= 200 && r.status < 300, "status " + r.status);
  assert.ok(r.headers.get("access-control-allow-origin"));
});

test("wrong method / bad body → method / bad_request (4xx, JSON)", async () => {
  const g = await start(null, { method: "GET" });
  assert.equal(g.status, 405);
  assert.deepEqual(g.json, { error: "method" });
  for (const raw of ["not json", "[]", "{}", JSON.stringify({ tok: "x" }), JSON.stringify({ tok: "x", id: "nope" }),
                     JSON.stringify({ tok: 5, id: "00000000-0000-0000-0000-000000000000" })]) {
    const r = await start(null, { raw });
    assert.equal(r.status, 400, raw);
    assert.deepEqual(r.json, { error: "bad_request" }, raw);
  }
});

test("invitee starts the duel: live, questions in the DB, no answer/meta/tol on any device", async () => {
  const id = await acceptedDuel("dsa", "dsb", "random");

  // the sender (A) can't start it, and a stranger's token can't either — and that doesn't use up the claim
  const byA = await start({ tok: P.dsa.tok, id });
  assert.equal(byA.json?.error, "gone", byA.text);
  assert.ok(byA.status >= 400 && byA.status < 500);
  const junk = await start({ tok: "not-a-real-token", id });
  assert.ok(junk.status >= 400 && junk.status < 500 && junk.status !== 401, junk.text);
  assert.equal(junk.json?.error, "signed_out", junk.text);

  const r = await start({ tok: P.dsb.tok, id });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true });

  for (const who of ["dsa", "dsb"]) {
    const st = await rpc("duel_state", { tok: P[who].tok, id });
    assert.equal(st.status, "live", who);
    assert.ok(st.start_at && st.ends_at, who);
    assert.equal(st.questions.length, 1, who + ": only the current question is visible");
    assert.equal(st.questions[0].idx, 0);
    assert.ok(typeof st.questions[0].payload.prompt === "string" && st.questions[0].payload.prompt.length > 0);
    const keys = keysDeep(st);
    for (const k of ["answer", "meta", "tol"]) assert.ok(!keys.has(k), `${who}: '${k}' leaked`);
  }

  // in the DB: 15 questions, idx 0..14, numbers at 3/7/11, nothing secret in the payloads,
  // grade = min(9, 7) = 7 → no grade-8 topic (powers-roots)
  const rows = sql(`select idx || '|' || kind || '|' || topic || '|' || (payload ? 'answer' or payload ? 'meta' or payload ? 'tol')
                      || '|' || (answer is not null) from public.duel_questions where duel_id = '${id}' order by idx`).split("\n");
  assert.equal(rows.length, 15);
  rows.forEach((line, i) => {
    const [idx, kind, topic, leak, hasAnswer] = line.split("|");
    assert.equal(Number(idx), i);
    assert.equal(kind, [3, 7, 11].includes(i) ? "number" : "choice", line);
    assert.notEqual(topic, "powers-roots", line);
    assert.equal(leak, "false", line);
    assert.equal(hasAnswer, "true", line);
  });

  // once only
  const again = await start({ tok: P.dsb.tok, id });
  assert.equal(again.json?.error, "gone", again.text);
  assert.ok(again.status >= 400 && again.status < 500);
  const byA2 = await start({ tok: P.dsa.tok, id });
  assert.equal(byA2.json?.error, "gone", byA2.text);
});

test("no grades + a world without questions yet → grade 9, random questions, still live", async () => {
  const id = await acceptedDuel("dsc", "dsd", "geo");
  const r = await start({ tok: P.dsd.tok, id });
  assert.equal(r.status, 200, r.text);
  const st = await rpc("duel_state", { tok: P.dsc.tok, id });
  assert.equal(st.status, "live");
  assert.equal(Number(sql(`select count(*) from public.duel_questions where duel_id = '${id}'`)), 15);
});

test("switch off → off", async () => {
  sql(`update public.site_settings set value = '"off"' where key = 'duels'`);
  try {
    const r = await start({ tok: P.dsb.tok, id: "00000000-0000-0000-0000-000000000000" });
    assert.equal(r.json?.error, "off", r.text);
    assert.ok(r.status >= 400 && r.status < 500);
  } finally {
    sql(`update public.site_settings set value = '${prevSwitch.replace(/'/g, "''")}' where key = 'duels'`);
  }
});
