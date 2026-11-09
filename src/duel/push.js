'use client';
/* Duel notifications (Web Push) in the browser. Spec §7.4.
   Pure parts + tests: ./push-core.js. The service worker: public/sw.js (push + click only,
   no caching). The sender: supabase/functions/duel-push (called by duel_invite when the
   friend is offline). Database: push_save / push_remove (20261109110000_duels_push.sql).

     pushEnv()                 → what this browser can do (for pushMode)
     pushStatus(accountId)     → 'on' | 'off' | 'denied'   (never asks anything)
     enablePush(accountId)     → {ok:true} | {error:'denied'|'unsupported'|'failed'|…}
                                 CALL IT STRAIGHT FROM THE TAP: it asks for permission first.
     disablePush()             → {ok:true}
     syncPush(accountId)       → quietly re-saves this device for the student who turned it on
                                 here (a new session after signing in again); a subscription made
                                 with an old VAPID key is turned off instead; nothing otherwise.
     isDismissed() / dismiss() → "not now", remembered on this device

   A device is "on" for the student whose id is in localStorage mp:duel:push — so a brother
   signing in on the same phone is offered the button, never subscribed without his own tap. */
import { mpData } from "../lib/mp-data";
import { sessionToken } from "../lib/account";
import { getConfig } from "../lib/config";
import { keyBytes, sameKey } from "./push-core";

const ON_KEY = "mp:duel:push";              // account id that turned notifications on here
const DISMISS_KEY = "mp:duel:push-no";      // "not now"

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} },
};

export function pushEnv() {
  if (typeof window === "undefined") return null;
  const nav = window.navigator || {};
  let standalone = false;
  try { standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || nav.standalone === true; } catch {}
  return {
    vapid: getConfig().vapidPublic || "",
    ua: nav.userAgent || "",
    platform: nav.platform || "",
    maxTouchPoints: nav.maxTouchPoints || 0,
    standalone,
    hasNotification: "Notification" in window,
    hasPushManager: "PushManager" in window,
    hasServiceWorker: "serviceWorker" in nav,
  };
}

export const isDismissed = () => store.get(DISMISS_KEY) === "1";
export const dismiss = () => store.set(DISMISS_KEY, "1");

async function registration() {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  // wait until it is active (subscribe needs an active worker)
  if (!reg.active) await navigator.serviceWorker.ready;
  return reg;
}
async function existing() {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch { return null; }
}

function within(ms, promise) {
  let t;
  return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(new Error("timeout")), ms); })]).finally(() => clearTimeout(t));
}

async function save(sub) {
  const tok = sessionToken();
  if (!tok) return { error: "signed_out" };
  try {
    const r = await mpData.rpc("push_save", { tok, sub: sub.toJSON() });
    return r && r.ok ? { ok: true } : { error: (r && r.error) || "failed" };
  } catch (e) {
    return { error: /unauthori[sz]ed/i.test(String(e && e.message)) ? "signed_out" : "failed" };
  }
}

// the subscription was made with today's public key? (a new key pair = it can no longer get pushes)
function current(sub) {
  const vapid = getConfig().vapidPublic;
  try { return !!(sub && vapid && sameKey(sub.options && sub.options.applicationServerKey, keyBytes(vapid))); } catch { return false; }
}

export async function pushStatus(accountId) {
  if (typeof Notification === "undefined") return "off";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted" || !accountId || store.get(ON_KEY) !== accountId) return "off";
  return current(await existing()) ? "on" : "off";
}

export function enablePush(accountId) {
  if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return Promise.resolve({ error: "unsupported" });
  }
  const vapid = getConfig().vapidPublic;
  if (!vapid) return Promise.resolve({ error: "unsupported" });
  // asked first, inside the tap (Safari only shows the question from a user gesture)
  const asked = Notification.permission === "granted" ? Promise.resolve("granted") : Notification.requestPermission();
  return asked.then(async (p) => {
    if (p !== "granted") return { error: p === "denied" ? "denied" : "dismissed" };
    try {
      const key = keyBytes(vapid);
      const reg = await registration();
      let sub = await reg.pushManager.getSubscription();
      if (sub && !sameKey(sub.options && sub.options.applicationServerKey, key)) { await sub.unsubscribe(); sub = null; }
      // the first subscribe on a device can take a while (the browser registers with its push
      // service); never leave the button spinning forever
      if (!sub) sub = await within(30000, reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
      const r = await save(sub);
      if (r.ok) { store.set(ON_KEY, accountId); store.set(DISMISS_KEY, null); }
      // not saved (database not ready, push service not accepted, …): leave nothing half-on
      else { try { await sub.unsubscribe(); } catch {} }
      return r;
    } catch {
      return { error: "failed" };
    }
  }, () => ({ error: "failed" }));
}

export async function disablePush() {
  const sub = await existing();
  store.set(ON_KEY, null);
  if (!sub) return { ok: true };
  const tok = sessionToken();
  if (tok) { try { await mpData.rpc("push_remove", { tok, endpoint: sub.endpoint }); } catch {} }
  try { await sub.unsubscribe(); } catch {}
  return { ok: true };
}

export async function syncPush(accountId) {
  if (!accountId || store.get(ON_KEY) !== accountId) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const sub = await existing();
  if (!sub) return;
  // made with an old public key: it can't get our pushes any more → off, so the
  // student can turn it on again cleanly with one tap
  if (!current(sub)) { await disablePush(); return; }
  await save(sub);
}

/** Hebrew for the card */
export const PUSH_ERRORS = {
  denied: "ההתראות חסומות בדפדפן. אפשר להפעיל אותן בהגדרות האתר",
  dismissed: "לא אושר. אפשר לנסות שוב מתי שרוצים",
  unsupported: "הדפדפן הזה לא תומך בהתראות",
  off: "דו-קרבים עוד לא פתוחים. בקרוב!",
  signed_out: "צריך להתחבר לחשבון",
  sub: "הדפדפן הזה לא נתמך כרגע להתראות",
  failed: "לא הצלחנו להפעיל התראות. נסו שוב בעוד רגע",
};
