// Supabase Edge Function duel-push (spec §7.4): a notification for a duel invite
// to a friend who is NOT on the site.
//
// Called only by the database: duel_invite → duel_push_invite → pg_net POST
//   headers: x-push-secret: <Vault 'push_secret'>      body: {duel_id, to_uid}
// (deployed with verify_jwt = false, see supabase/config.toml [functions.duel-push];
// the shared secret is the only key in). Steps:
//   1. secret header = PUSH_SECRET (else 401) · body = {duel_id, to_uid} (uuids).
//   2. quiet hours 21:00–07:00 Israel time → nothing is sent ({skipped:'quiet'}).
//   3. push_info(secret, duel_id, to_uid) → subject, expiry and the invitee's devices —
//      only while the invite is still open ('gone' otherwise). No sender name: the
//      notification is generic ("יש לך הזמנה לדו-קרב!"), nothing personal on a lock screen.
//   4. one encrypted Web Push per device (RFC 8291 aes128gcm + VAPID RFC 8292),
//      TTL = what is left of the invite (≤ 60 s), urgency high, redirects refused.
//   5. push_done(secret, ok, gone, failed): 404/410 → deleted; 2xx → last_ok_at;
//      anything else (403, 5xx, timeout) counts a failure — 3 in a row drop the device —
//      except 429 and a timeout that started with < 1 s left (ours, not the device's).
// One deadline for the whole run (8 s), so it ends before pg_net's 10 s. A send that
// misses it is reported as failed; its HTTP request is NOT cancelled (the library's
// fetch takes no signal) — it just finishes unobserved.
// Database calls go through PostgREST with the project's PUBLIC key (like duel-start):
// push_info / push_done are granted to anon and check the Vault secret themselves.
//
// Library: jsr:@negrel/webpush@0.5.0 — Deno-native, WebCrypto only (no node polyfills).
// Secrets (supabase secrets set): PUSH_SECRET (= Vault 'push_secret'),
//   VAPID_PUBLIC (base64url 65-byte point, the same as vapidPublic in src/lib/config.js),
//   VAPID_PRIVATE (base64url 32-byte d), VAPID_SUBJECT (mailto: or https: contact).
// Answers: 200 {sent, gone, failed} | {skipped:'quiet'|'gone'|'none'} ·
//   401 {error:'secret'} · 400 bad_request · 405 method · 500 config · 502 db
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { isLocal, isQuiet, message, sameSecret, timeoutVerdict, ttlFor, vapidJwk, verdict } from "./core.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS: Record<string, number> = { method: 405, bad_request: 400, secret: 401, config: 500, db: 502 };
const MAX_BODY = 1024;
const DEADLINE_MS = 8000;       // the whole run; pg_net waits 10 s
const DONE_RESERVE_MS = 1200;   // kept for push_done after the sends

// Push endpoints come from the database's allow-list; a redirect could still send
// the request somewhere else, so this function never follows one (the library calls
// the global fetch without options; our PostgREST calls never redirect either).
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
  nativeFetch(input, { ...(init || {}), redirect: "error" })) as typeof fetch;

const left = (deadline: number) => deadline - Date.now();

class Fail extends Error {
  constructor(public code: string) { super(code); }
}

// the project's PUBLIC key for PostgREST (legacy anon JWT, else the new publishable key)
function apiKey(): string {
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (anon) return anon;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const k = keys.default || Object.values(keys)[0];
    if (typeof k === "string" && k) return k;
  } catch { /* not set */ }
  return "";
}

async function rpc(fn: string, args: Record<string, unknown>, deadline: number): Promise<Record<string, unknown>> {
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  const key = apiKey();
  if (!base || !key) throw new Fail("config");
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(Math.max(1, left(deadline))),
    });
  } catch {
    throw new Fail("db");
  }
  let body: unknown = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (!res.ok) {
    console.error(`duel-push: ${fn} → HTTP ${res.status}`);
    throw new Fail("db");
  }
  if (b.error === "secret") throw new Fail("config");   // PUSH_SECRET ≠ Vault 'push_secret'
  return b;
}

// VAPID keys are imported once per instance
let vapid: Promise<CryptoKeyPair> | null = null;
function vapidKeys(): Promise<CryptoKeyPair> {
  if (!vapid) {
    const jwk = vapidJwk(Deno.env.get("VAPID_PUBLIC"), Deno.env.get("VAPID_PRIVATE"));
    if (!jwk) throw new Fail("config");
    vapid = webpush.importVapidKeys(jwk as webpush.ExportedVapidKeys, { extractable: false });
    vapid.catch(() => { vapid = null; });
  }
  return vapid;
}

type Sub = { endpoint: string; p256dh: string; auth: string };

// one device → 'ok' | 'gone' | 'fail' | 'skip' (429, or our own deadline left it < 1 s: not counted)
async function sendOne(sub: Sub, text: string, ttl: number, keys: CryptoKeyPair, contact: string, until: number): Promise<string> {
  const budget = left(until);
  try {
    // a fresh application-server ECDH key for every message (RFC 8291 §3.1)
    const server = await webpush.ApplicationServer.new({ contactInformation: contact, vapidKeys: keys });
    const subscriber = server.subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error("timeout")), Math.max(0, left(until))); });
    try {
      await Promise.race([subscriber.pushTextMessage(text, { ttl, urgency: webpush.Urgency.High }), timeout]);
    } finally {
      clearTimeout(timer);
    }
    return "ok";
  } catch (e) {
    const status = (e as { response?: Response })?.response?.status;
    if (typeof status === "number") {
      const v = verdict(status);
      if (v !== "gone") console.error(`duel-push: push service answered ${status} (${new URL(sub.endpoint).host})`);
      return v;
    }
    console.error(`duel-push: send failed (${new URL(sub.endpoint).host}): ${(e as Error)?.message}`);
    // our own deadline cut it: a failure only if the send had a fair chance (≥ 1 s)
    if ((e as Error)?.message === "timeout") return timeoutVerdict(budget);
    return "fail";
  }
}

async function handle(req: Request): Promise<Record<string, unknown>> {
  if (req.method !== "POST") throw new Fail("method");
  const deadline = Date.now() + DEADLINE_MS;
  const secret = Deno.env.get("PUSH_SECRET") || "";
  if (!secret) throw new Fail("config");
  if (!sameSecret(req.headers.get("x-push-secret") || "", secret)) throw new Fail("secret");

  let input: unknown = null;
  try {
    const text = await req.text();
    if (text.length <= MAX_BODY) input = JSON.parse(text);
  } catch { /* bad JSON */ }
  const { duel_id, to_uid } = (input && typeof input === "object" && !Array.isArray(input) ? input : {}) as Record<string, unknown>;
  if (typeof duel_id !== "string" || !UUID.test(duel_id) || typeof to_uid !== "string" || !UUID.test(to_uid)) {
    throw new Fail("bad_request");
  }

  // PUSH_NOW (ISO time) is for the local tests only: honoured only when the function
  // runs against a local Supabase (SUPABASE_URL http://kong:8000 / localhost)
  const fake = isLocal(Deno.env.get("SUPABASE_URL")) ? Deno.env.get("PUSH_NOW") : "";
  const now = fake ? new Date(fake) : new Date();
  if (isQuiet(now)) return { skipped: "quiet" };

  const contact = Deno.env.get("VAPID_SUBJECT") || "https://mathproject-gamma.vercel.app";
  const keys = await vapidKeys();

  const info = await rpc("push_info", { secret, duel_id, to_uid }, deadline);
  if (typeof info.error === "string") return { skipped: "gone" };
  const subs = (Array.isArray(info.subs) ? info.subs : []) as Sub[];
  if (!subs.length) return { skipped: "none" };
  const ttl = ttlFor(info.expires_at as string, new Date());
  if (ttl < 2) return { skipped: "gone" };

  const text = JSON.stringify(message(info));
  const results = await Promise.all(subs.map((s) => sendOne(s, text, ttl, keys, contact, deadline - DONE_RESERVE_MS)));
  const pick = (v: string) => subs.filter((_, i) => results[i] === v).map((s) => s.endpoint);
  const ok = pick("ok"), gone = pick("gone"), failed = pick("fail");
  try { await rpc("push_done", { secret, ok, gone, failed }, deadline); } catch (e) { console.error("duel-push: push_done failed", (e as Error)?.message); }
  return { sent: ok.length, gone: gone.length, failed: failed.length };
}

Deno.serve(async (req) => {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  try {
    return json(200, await handle(req));
  } catch (e) {
    const code = e instanceof Fail ? e.code : "db";
    if (!(e instanceof Fail)) console.error("duel-push:", (e as Error)?.message);
    return json(STATUS[code] ?? 500, { error: code });
  }
});
