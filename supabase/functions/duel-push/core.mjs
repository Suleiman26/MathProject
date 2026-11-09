// duel-push: the pure parts (no Deno, no network), so node --test can check them.
// index.ts wires them to the request, the database and the push services.

// same words as SUBJECT_LABEL in src/duel/samples.js
export const SUBJECT_LABEL = { random: "הפתעה", num: "מספרים", alg: "אלגברה", fn: "פונקציות", geo: "גיאומטריה" };

/** Quiet hours: 21:00–07:00 Israel time (Asia/Jerusalem, summer time included) → no pushes. */
export function isQuiet(date = new Date()) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "numeric", hourCycle: "h23" }).format(date));
  return h >= 21 || h < 7;
}

/** Seconds the push service may keep the message: what is left of the invite (it lives 60 s),
 *  never more than 60. 0 → don't send. */
export function ttlFor(expiresAt, now = new Date()) {
  const left = Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000);
  return Number.isFinite(left) ? Math.max(0, Math.min(60, left)) : 0;
}

/** The notification the service worker shows (public/sw.js). Generic on purpose: no username
 *  on a child's lock screen (the name is shown in the site, after the tap). Tag per duel:
 *  a repeat of the same invite replaces the first. */
export function message(info) {
  const subject = SUBJECT_LABEL[info.subject] || SUBJECT_LABEL.random;
  return {
    t: "invite",
    id: info.duel_id,
    title: "יש לך הזמנה לדו-קרב!",
    body: `חבר/ה מאתגר/ת אותך · ${subject} · ההזמנה פתוחה דקה אחת`,
    url: "/duel",
    tag: `duel-${info.duel_id}`,
  };
}

/** The function runs against a LOCAL Supabase (supabase start / functions serve)? Test-only
 *  switches (PUSH_NOW) are honoured only then. */
export function isLocal(url) {
  return /^http:\/\/(kong|localhost|127\.0\.0\.1|host\.docker\.internal)(:\d+)?\/?$/.test(String(url || ""));
}

const b64u = /^[A-Za-z0-9_-]+$/;
const fromB64u = (s) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const toB64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** VAPID keys in the usual web-push form (public = 65-byte raw point, private = 32-byte d,
 *  both base64url) → the JWK pair the push library imports. null when they don't fit. */
export function vapidJwk(pub, priv) {
  if (typeof pub !== "string" || typeof priv !== "string" || !b64u.test(pub) || !b64u.test(priv)) return null;
  let p, d;
  try { p = fromB64u(pub); d = fromB64u(priv); } catch { return null; }
  if (p.length !== 65 || p[0] !== 4 || d.length !== 32) return null;
  const x = toB64u(p.slice(1, 33)), y = toB64u(p.slice(33));
  return {
    publicKey: { kty: "EC", crv: "P-256", x, y, ext: true },
    privateKey: { kty: "EC", crv: "P-256", x, y, d: priv, ext: false },
  };
}

/** Equal strings without an early exit (the shared secret). */
export function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** The push service's answer → what to do with the device: 'ok' (201/202/200), 'gone'
 *  (404/410: the subscription no longer exists → delete it), 'fail' (anything else: keep it). */
export function verdict(status) {
  if (status >= 200 && status < 300) return "ok";
  if (status === 404 || status === 410) return "gone";
  return "fail";
}
