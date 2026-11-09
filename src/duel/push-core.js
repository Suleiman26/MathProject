/* Duel notifications (Web Push), the parts without a browser, so node --test can run them.
   src/duel/push.js wires them to the real browser; EnablePush.jsx shows the offer.
   Spec §7.4: the offer appears only after the student's first duel, permission is asked
   only on a tap, iPhone gets them only from the home-screen app (iOS 16.4+). */

export const IOS_HINT = "ההתראות עובדות אחרי ׳הוספה למסך הבית׳";

/** iPhone / iPad (iPadOS shows a Mac user agent but has touch) */
export function isIOS(env) {
  const ua = String(env.ua || "");
  return /iPad|iPhone|iPod/.test(ua) || (env.platform === "MacIntel" && Number(env.maxTouchPoints) > 1);
}

/** iOS version from the user agent ("OS 16_4 like Mac OS X") → 16.4; unknown → null */
export function iosVersion(ua) {
  const m = /OS (\d+)[._](\d+)/.exec(String(ua || ""));
  return m && /iPhone|iPad|iPod/.test(ua) ? Number(m[1]) + Number(m[2]) / 100 : null;
}

/** What this device can do:
 *   'none'     no public key configured, or no push in this browser (or an iPhone older than 16.4)
 *   'ios-hint' iPhone/iPad in the browser: works only from the home-screen app → one-line hint
 *   'ok'       Notification + PushManager + service worker are all there */
export function pushMode(env) {
  if (!env || !env.vapid) return "none";
  if (isIOS(env)) {
    const v = iosVersion(env.ua);
    if (v !== null && v < 16.04) return "none";
    if (!env.standalone) return "ios-hint";
  }
  return env.hasNotification && env.hasPushManager && env.hasServiceWorker ? "ok" : "none";
}

/** Show the card? Only after at least one finished duel, on a device that can (or could, from the
 *  home screen) get notifications, and not after "not now" on this device — unless it is already on. */
export function shouldOffer({ played, mode, dismissed, status }) {
  if (mode === "none" || !(Number(played) >= 1)) return false;
  if (status === "on") return true;
  return !dismissed;
}

/** base64url → bytes (the VAPID public key for pushManager.subscribe) */
export function keyBytes(b64u) {
  const s = String(b64u || "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** the subscription was made with this key? (a new key means: subscribe again) */
export function sameKey(buf, bytes) {
  if (!buf || !bytes) return false;
  const a = new Uint8Array(buf);
  if (a.length !== bytes.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== bytes[i]) return false;
  return true;
}
