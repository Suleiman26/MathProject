// Supabase Edge Function duel-push (spec §7.4): a notification for a duel invite
// to a friend who is NOT on the site.
//
// Called only by the database: duel_invite → duel_push_invite → pg_net POST
//   headers: x-push-secret: <Vault 'push_secret'>      body: {duel_id, to_uid}
// (deployed with verify_jwt = false, see supabase/config.toml [functions.duel-push];
// the shared secret is the only key in). Steps:
//   1. secret header = PUSH_SECRET (else 401) · body = {duel_id, to_uid} (uuids).
//   2. quiet hours 21:00–07:00 Israel time → nothing is sent ({skipped:'quiet'}).
//   3. push_info(secret, duel_id, to_uid) → sender's username, subject, expiry and
//      the invitee's devices — only while the invite is still open ('gone' otherwise).
//   4. one encrypted Web Push per device (RFC 8291 aes128gcm + VAPID RFC 8292),
//      TTL = what is left of the invite (≤ 60 s), urgency high.
//   5. push_done(secret, ok, gone): devices the push service says no longer exist
//      (404/410) are deleted; the rest get last_ok_at.
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
import { isQuiet, message, sameSecret, ttlFor, vapidJwk, verdict } from "./core.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS: Record<string, number> = { method: 405, bad_request: 400, secret: 401, config: 500, db: 502 };
const MAX_BODY = 1024;
const PUSH_TIMEOUT_MS = 6000;   // per device; pg_net waits 10 s for the whole call

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

async function rpc(fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  const key = apiKey();
  if (!base || !key) throw new Fail("config");
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(4000),
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

// one device → 'ok' | 'gone' | 'fail'
async function sendOne(sub: Sub, text: string, ttl: number, keys: CryptoKeyPair, contact: string): Promise<string> {
  try {
    // a fresh application-server ECDH key for every message (RFC 8291 §3.1)
    const server = await webpush.ApplicationServer.new({ contactInformation: contact, vapidKeys: keys });
    const subscriber = server.subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error("timeout")), PUSH_TIMEOUT_MS); });
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
    return "fail";
  }
}

async function handle(req: Request): Promise<Record<string, unknown>> {
  if (req.method !== "POST") throw new Fail("method");
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

  // PUSH_NOW (ISO time) exists for the local tests only; never set it on the live project
  const fake = Deno.env.get("PUSH_NOW");
  const now = fake ? new Date(fake) : new Date();
  if (isQuiet(now)) return { skipped: "quiet" };

  const contact = Deno.env.get("VAPID_SUBJECT") || "https://mathproject-gamma.vercel.app";
  const keys = await vapidKeys();

  const info = await rpc("push_info", { secret, duel_id, to_uid });
  if (typeof info.error === "string") return { skipped: "gone" };
  const subs = (Array.isArray(info.subs) ? info.subs : []) as Sub[];
  if (!subs.length) return { skipped: "none" };
  const ttl = ttlFor(info.expires_at as string, new Date());
  if (ttl < 2) return { skipped: "gone" };

  const text = JSON.stringify(message(info));
  const results = await Promise.all(subs.map((s) => sendOne(s, text, ttl, keys, contact)));
  const ok = subs.filter((_, i) => results[i] === "ok").map((s) => s.endpoint);
  const gone = subs.filter((_, i) => results[i] === "gone").map((s) => s.endpoint);
  if (ok.length || gone.length) {
    try { await rpc("push_done", { secret, ok, gone }); } catch (e) { console.error("duel-push: push_done failed", (e as Error)?.message); }
  }
  return { sent: ok.length, gone: gone.length, failed: results.length - ok.length - gone.length };
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
