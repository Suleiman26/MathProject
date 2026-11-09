// duel-push edge function: pure parts + end-to-end against the LOCAL Supabase.
//
// Needs (for the served part; the pure tests always run):
//   supabase start  (migrations up to 20261109110000_duels_push.sql)
//   Vault secret 'push_secret' in the local DB = PUSH_SECRET in supabase/.env.local
//   supabase/.env.local: PUSH_SECRET, VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (gitignored)
//   supabase functions serve --env-file supabase/.env.local
// Run:  node --test supabase/functions/duel-push/test.mjs
// Quiet hours, served: start serve with PUSH_NOW=2026-11-09T20:30:00Z added to a copy of the
//   env file (22:30 in Israel), then run with EXPECT_QUIET=1.
//
// A fake push service runs inside this test (http://host.docker.internal:<port>, reachable
// from the edge runtime's container): it checks the VAPID signature and DECRYPTS every
// message with the device's own keys (RFC 8291), like a browser would. Its devices are put
// straight into push_subs (push_save only takes the real push services' https addresses).
// Writes test accounts/duels into the local database only.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import http from "node:http";
import crypto from "node:crypto";
import { isLocal, isQuiet, ttlFor, message, vapidJwk, sameSecret, verdict, SUBJECT_LABEL } from "./core.mjs";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const cfg = readFileSync(ROOT + "src/lib/config.js", "utf8").split("const LOCAL")[1];
const FN = cfg.match(/functionsUrl:\s*"([^"]+)"/)[1] + "/duel-push";
const DB = process.env.LOCAL_DB_URL || "postgresql://postgres:postgres@127.0.0.1:56422/postgres";
assert.match(FN, /^http:\/\/127\.0\.0\.1:/, "tests run against the local Supabase only");
const env = Object.fromEntries(readFileSync(ROOT + "supabase/.env.local", "utf8").split("\n")
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const sql = (q) => execFileSync("psql", [DB, "-Atq", "-c", q], { encoding: "utf8" }).trim();
const b64u = (b) => Buffer.from(b).toString("base64url");

// ── pure parts ──────────────────────────────────────────────────────────────
test("isQuiet: 21:00–07:00 Israel time, summer and winter", () => {
  // winter (UTC+2): 18:59Z = 20:59 → loud; 19:00Z = 21:00 → quiet; 04:59Z = 06:59 → quiet; 05:00Z = 07:00 → loud
  assert.equal(isQuiet(new Date("2026-11-09T18:59:00Z")), false);
  assert.equal(isQuiet(new Date("2026-11-09T19:00:00Z")), true);
  assert.equal(isQuiet(new Date("2026-11-09T23:30:00Z")), true);
  assert.equal(isQuiet(new Date("2026-11-10T04:59:00Z")), true);
  assert.equal(isQuiet(new Date("2026-11-10T05:00:00Z")), false);
  // summer (UTC+3): 17:59Z = 20:59 → loud; 18:00Z = 21:00 → quiet; 04:00Z = 07:00 → loud
  assert.equal(isQuiet(new Date("2026-07-01T17:59:00Z")), false);
  assert.equal(isQuiet(new Date("2026-07-01T18:00:00Z")), true);
  assert.equal(isQuiet(new Date("2026-07-02T03:59:00Z")), true);
  assert.equal(isQuiet(new Date("2026-07-02T04:00:00Z")), false);
});

test("ttlFor: what is left of the invite, at most 60 s", () => {
  const now = new Date("2026-11-09T10:00:00Z");
  assert.equal(ttlFor("2026-11-09T10:01:00Z", now), 60);
  assert.equal(ttlFor("2026-11-09T10:00:42.9Z", now), 42);
  assert.equal(ttlFor("2026-11-09T10:05:00Z", now), 60);
  assert.equal(ttlFor("2026-11-09T09:59:00Z", now), 0);
  assert.equal(ttlFor("nonsense", now), 0);
});

test("message: generic Hebrew (no name on a lock screen), the subject, /duel, a tag per duel", () => {
  const m = message({ duel_id: "d1", from: "noa", subject: "alg" });
  assert.equal(m.title, "יש לך הזמנה לדו-קרב!");
  assert.equal(m.body, "חבר/ה מאתגר/ת אותך · אלגברה · ההזמנה פתוחה דקה אחת");
  assert.doesNotMatch(JSON.stringify(m), /noa/);
  assert.equal(m.url, "/duel");
  assert.equal(m.tag, "duel-d1");
  assert.equal(message({ duel_id: "d", subject: "??" }).body.includes(SUBJECT_LABEL.random), true);
  assert.deepEqual(Object.keys(m).sort(), ["body", "id", "t", "tag", "title", "url"]);
});

test("isLocal: PUSH_NOW is honoured only against a local Supabase", () => {
  for (const u of ["http://kong:8000", "http://127.0.0.1:56421", "http://localhost:54321/", "http://host.docker.internal:56421"]) assert.equal(isLocal(u), true, u);
  for (const u of ["https://uucqyjskkyrfhvbsmorx.supabase.co", "http://kong.evil.com:8000", "https://kong:8000", "", undefined]) assert.equal(isLocal(u), false, String(u));
});

test("vapidJwk: raw base64url keys → a JWK pair node can sign/verify with", () => {
  const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const j = privateKey.export({ format: "jwk" });
  const pub = b64u(Buffer.concat([Buffer.from([4]), Buffer.from(j.x, "base64url"), Buffer.from(j.y, "base64url")]));
  const k = vapidJwk(pub, j.d);
  assert.equal(k.publicKey.x, j.x);
  assert.equal(k.privateKey.d, j.d);
  const sig = crypto.sign("sha256", Buffer.from("hi"), { key: crypto.createPrivateKey({ key: k.privateKey, format: "jwk" }), dsaEncoding: "ieee-p1363" });
  assert.equal(crypto.verify("sha256", Buffer.from("hi"), { key: crypto.createPublicKey({ key: k.publicKey, format: "jwk" }), dsaEncoding: "ieee-p1363" }, sig), true);
  assert.equal(vapidJwk("", j.d), null);
  assert.equal(vapidJwk(pub, "short"), null);
  assert.equal(vapidJwk(pub.slice(2), j.d), null);
  assert.equal(vapidJwk(undefined, undefined), null);
});

test("sameSecret / verdict", () => {
  assert.equal(sameSecret("abc", "abc"), true);
  assert.equal(sameSecret("abc", "abd"), false);
  assert.equal(sameSecret("abc", "abcd"), false);
  assert.equal(sameSecret("", ""), false);
  assert.equal(sameSecret(undefined, "x"), false);
  assert.equal(verdict(201), "ok");
  assert.equal(verdict(410), "gone");
  assert.equal(verdict(404), "gone");
  assert.equal(verdict(429), "fail");
  assert.equal(verdict(500), "fail");
});

// ── the served function ─────────────────────────────────────────────────────
let served = false;
try { served = (await fetch(FN, { method: "GET", signal: AbortSignal.timeout(3000) })).status === 405; } catch { served = false; }
const live = { skip: served ? false : "supabase functions serve is not running" };

// a fake push service with four devices: 'ok' answers 201, 'gone' 410, 'bad' 500,
// 'redir' 307 → /push/hit (the function must not follow it)
const got = [];
let server, port;
function device(name) {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  return { name, ecdh, pub: ecdh.getPublicKey(), auth: crypto.randomBytes(16) };
}
const devs = { ok: device("ok"), gone: device("gone"), bad: device("bad"), redir: device("redir") };
const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
// RFC 8291 + RFC 8188, as the browser does it
function decrypt(dev, body) {
  const salt = body.subarray(0, 16), idlen = body[20], asPub = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const secret = dev.ecdh.computeSecret(asPub);
  const prkKey = hmac(dev.auth, secret);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from("WebPush: info\0"), dev.pub, asPub, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01", "binary")).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01", "binary")).subarray(0, 12);
  const d = crypto.createDecipheriv("aes-128-gcm", cek, nonce);
  d.setAuthTag(ct.subarray(ct.length - 16));
  let plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  let end = plain.length - 1;
  while (end >= 0 && plain[end] === 0) end--;
  assert.equal(plain[end], 2, "last-record padding delimiter");
  return JSON.parse(plain.subarray(0, end).toString("utf8"));
}
function checkVapid(auth, endpointOrigin) {
  const m = /^vapid t=([^,\s]+),\s*k=([A-Za-z0-9_-]+)$/.exec(auth || "");
  assert.ok(m, "Authorization: vapid t=…, k=…");
  assert.equal(m[2], env.VAPID_PUBLIC, "k = our public key");
  const [h, p, s] = m[1].split(".");
  const jwk = vapidJwk(env.VAPID_PUBLIC, "A".repeat(43)).publicKey;
  const ok = crypto.verify("sha256", Buffer.from(h + "." + p), { key: crypto.createPublicKey({ key: jwk, format: "jwk" }), dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"));
  assert.equal(ok, true, "JWT signed with our private VAPID key");
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  assert.equal(claims.aud, endpointOrigin);
  assert.ok(claims.exp > Date.now() / 1000 && claims.exp <= Date.now() / 1000 + 24 * 3600, "exp within 24 h");
  assert.match(claims.sub, /^(mailto:|https:)/);
}

const T = { ids: {} };
before(async () => {
  if (!served) return;
  server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const name = req.url.split("/").pop();
      got.push({ name, headers: req.headers, body: Buffer.concat(chunks) });
      if (name === "redir") return res.writeHead(307, { location: `http://host.docker.internal:${port}/push/hit` }).end();
      res.writeHead(name === "ok" ? 201 : name === "gone" ? 410 : 500).end();
    });
  });
  await new Promise((r) => server.listen(0, "0.0.0.0", r));
  port = server.address().port;

  T.switch = sql("select value #>> '{}' from site_settings where key = 'duels'");
  if (T.switch === "off") sql("update site_settings set value = '\"test\"' where key = 'duels'");
  const tag = Date.now().toString(36).slice(-6);
  for (const n of ["a", "b"]) {
    const r = JSON.parse(sql(`select account_signup('dpt${n}_${tag}', 'passw0rd1', '8', account_terms_version(), true, true, null)`));
    T.ids[n] = r.account.id;
    T[n + "tok"] = r.token;
    T[n + "name"] = `dpt${n}_${tag}`;
  }
  sql(`update accounts set duel_tester = true where id in ('${T.ids.a}', '${T.ids.b}')`);
  T.duel = sql(`insert into duels (a, b, subject) values ('${T.ids.a}', '${T.ids.b}', 'geo') returning id`);
  const sess = crypto.createHash("sha256").update(T.btok).digest("hex");
  for (const d of Object.values(devs)) {
    sql(`insert into push_subs (uid, endpoint, p256dh, auth, sess) values ('${T.ids.b}',
      'http://host.docker.internal:${port}/push/${d.name}', '${b64u(d.pub)}', '${b64u(d.auth)}', '${sess}')`);
  }
});
after(() => {
  if (!served) return;
  server?.close();
  if (T.ids.a) sql(`delete from accounts where id in ('${T.ids.a}', '${T.ids.b}')`);   // cascades: duels, push_subs, sessions
  if (T.switch === "off") sql("update site_settings set value = '\"off\"' where key = 'duels'");
});

const call = (body, headers = {}) => fetch(FN, {
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});
const good = () => ({ "x-push-secret": env.PUSH_SECRET });

test("served: GET → 405", live, async () => {
  const r = await fetch(FN);
  assert.equal(r.status, 405);
});

test("served: no or wrong secret → 401, nothing sent", live, async () => {
  const n = got.length;
  for (const h of [{}, { "x-push-secret": "nope" }, { "x-push-secret": env.PUSH_SECRET + "x" }, { authorization: "Bearer " + env.PUSH_SECRET }]) {
    const r = await call({ duel_id: T.duel, to_uid: T.ids.b }, h);
    assert.equal(r.status, 401);
    assert.deepEqual(await r.json(), { error: "secret" });
  }
  assert.equal(got.length, n);
});

test("served: bad body → 400", live, async () => {
  for (const b of ["{", "[]", { duel_id: "x", to_uid: T.ids.b }, { duel_id: T.duel }, "x".repeat(2000)]) {
    const r = await call(b, good());
    assert.equal(r.status, 400, JSON.stringify(b).slice(0, 40));
  }
});

if (process.env.EXPECT_QUIET) {
  test("served (PUSH_NOW in quiet hours): a valid invite is skipped, nothing sent", live, async () => {
    const n = got.length;
    const r = await call({ duel_id: T.duel, to_uid: T.ids.b }, good());
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { skipped: "quiet" });
    assert.equal(got.length, n);
  });
} else {
  test("served: someone else / unknown duel → skipped:gone, nothing sent", live, async () => {
    const n = got.length;
    let r = await call({ duel_id: T.duel, to_uid: T.ids.a }, good());
    assert.deepEqual(await r.json(), { skipped: "gone" });
    r = await call({ duel_id: crypto.randomUUID(), to_uid: T.ids.b }, good());
    assert.deepEqual(await r.json(), { skipped: "gone" });
    assert.equal(got.length, n);
  });

  test("served: real Web Push to four devices — decrypted, signed, dead one removed, no redirect followed", live, async () => {
    const r = await call({ duel_id: T.duel, to_uid: T.ids.b }, good());
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { sent: 1, gone: 1, failed: 2 });
    assert.equal(got.length, 4);
    assert.equal(got.some((g) => g.name === "hit"), false, "the 307 was not followed");
    for (const g of got) {
      assert.equal(g.headers["content-encoding"], "aes128gcm");
      assert.equal(g.headers.urgency, "high");
      const ttl = Number(g.headers.ttl);
      assert.ok(ttl > 50 && ttl <= 60, "TTL ≤ 60 s (what is left of the invite): " + ttl);
      checkVapid(g.headers.authorization, `http://host.docker.internal:${port}`);
      const m = decrypt(devs[g.name], g.body);
      assert.equal(m.title, "יש לך הזמנה לדו-קרב!");
      assert.equal(m.body, "חבר/ה מאתגר/ת אותך · גיאומטריה · ההזמנה פתוחה דקה אחת");
      assert.equal(JSON.stringify(m).includes(T.aname), false, "no username in the push");
      assert.equal(m.url, "/duel");
      assert.equal(m.tag, `duel-${T.duel}`);
      assert.equal(m.id, T.duel);
    }
    const left = sql(`select string_agg(split_part(endpoint, '/', 5) || ':' || (last_ok_at is not null)::text || ':' || fail_count, ',' order by endpoint) from push_subs where uid = '${T.ids.b}'`);
    assert.equal(left, "bad:false:1,ok:true:0,redir:false:1", "410 → removed; 201 → last_ok_at; 500/307 → kept, one failure counted");
  });

  test("served: the invite was answered → skipped:gone", live, async () => {
    sql(`update duels set status = 'declined' where id = '${T.duel}'`);
    const r = await call({ duel_id: T.duel, to_uid: T.ids.b }, good());
    assert.deepEqual(await r.json(), { skipped: "gone" });
  });
}
