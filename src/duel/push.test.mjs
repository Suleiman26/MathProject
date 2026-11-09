// node --test src/duel/push.test.mjs — duel notifications, the browser-free parts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pushMode, shouldOffer, isIOS, iosVersion, keyBytes, sameKey, IOS_HINT } from "./push-core.js";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const IPHONE = (v) => `Mozilla/5.0 (iPhone; CPU iPhone OS ${v} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1`;
const full = { vapid: "BKey", hasNotification: true, hasPushManager: true, hasServiceWorker: true, standalone: false, platform: "MacIntel", maxTouchPoints: 0 };

test("pushMode: desktop/Android browsers with push → ok", () => {
  assert.equal(pushMode({ ...full, ua: CHROME }), "ok");
});
test("pushMode: no public key or no push → none", () => {
  assert.equal(pushMode({ ...full, ua: CHROME, vapid: "" }), "none");
  assert.equal(pushMode(null), "none");
  assert.equal(pushMode({ ...full, ua: CHROME, hasPushManager: false }), "none");
  assert.equal(pushMode({ ...full, ua: CHROME, hasNotification: false }), "none");
  assert.equal(pushMode({ ...full, ua: CHROME, hasServiceWorker: false }), "none");
});
test("pushMode: iPhone in Safari → the home-screen hint, even though Safari hides PushManager", () => {
  assert.equal(pushMode({ ...full, ua: IPHONE("17_1"), platform: "iPhone", hasNotification: false, hasPushManager: false }), "ios-hint");
  assert.equal(IOS_HINT, "ההתראות עובדות אחרי ׳הוספה למסך הבית׳");
});
test("pushMode: iPhone home-screen app (16.4+) → ok", () => {
  assert.equal(pushMode({ ...full, ua: IPHONE("16_4"), platform: "iPhone", standalone: true }), "ok");
  assert.equal(pushMode({ ...full, ua: IPHONE("18_0"), platform: "iPhone", standalone: true }), "ok");
});
test("pushMode: iPhone older than 16.4 → none (no hint that can't come true)", () => {
  assert.equal(pushMode({ ...full, ua: IPHONE("16_3"), platform: "iPhone" }), "none");
  assert.equal(pushMode({ ...full, ua: IPHONE("15_8"), platform: "iPhone", standalone: true }), "none");
});
test("isIOS / iosVersion: iPadOS with a Mac user agent counts as iOS", () => {
  assert.equal(isIOS({ ua: CHROME, platform: "MacIntel", maxTouchPoints: 5 }), true);
  assert.equal(isIOS({ ua: CHROME, platform: "MacIntel", maxTouchPoints: 0 }), false);
  assert.equal(iosVersion(IPHONE("16_4")), 16.04);
  assert.equal(iosVersion(IPHONE("16_10")) > 16.04, true);
  assert.equal(iosVersion(CHROME), null);
  assert.equal(pushMode({ ...full, ua: CHROME, maxTouchPoints: 5 }), "ios-hint");   // iPad in Safari, version unknown
});

test("shouldOffer: only after the first duel, never after 'not now' (unless already on)", () => {
  assert.equal(shouldOffer({ played: 0, mode: "ok", dismissed: false, status: "off" }), false);
  assert.equal(shouldOffer({ played: undefined, mode: "ok", dismissed: false, status: "off" }), false);
  assert.equal(shouldOffer({ played: 1, mode: "ok", dismissed: false, status: "off" }), true);
  assert.equal(shouldOffer({ played: "3", mode: "ios-hint", dismissed: false, status: "off" }), true);
  assert.equal(shouldOffer({ played: 1, mode: "ok", dismissed: true, status: "off" }), false);
  assert.equal(shouldOffer({ played: 1, mode: "ok", dismissed: true, status: "on" }), true);
  assert.equal(shouldOffer({ played: 5, mode: "none", dismissed: false, status: "off" }), false);
});

test("keyBytes / sameKey: the VAPID key in config.js is a 65-byte P-256 point", () => {
  const cfg = readFileSync(new URL("../lib/config.js", import.meta.url), "utf8");
  const keys = [...cfg.matchAll(/vapidPublic:\s*"([^"]*)"/g)].map((m) => m[1]);
  assert.equal(keys.length, 2, "LIVE and LOCAL");
  for (const k of keys) {
    const b = keyBytes(k);
    assert.equal(b.length, 65);
    assert.equal(b[0], 4);
    assert.equal(sameKey(b.buffer, keyBytes(k)), true);
  }
  assert.equal(sameKey(new Uint8Array([1, 2]).buffer, new Uint8Array([1, 3])), false);
  assert.equal(sameKey(null, new Uint8Array([1])), false);
});

test("config.js holds only public keys (no private VAPID key)", () => {
  const cfg = readFileSync(new URL("../lib/config.js", import.meta.url), "utf8");
  assert.doesNotMatch(cfg, /vapidPrivate|VAPID_PRIVATE|PUSH_SECRET/);
});

test("service worker: push + click only, no fetch handler, no caches", () => {
  const sw = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
  assert.match(sw, /addEventListener\("push"/);
  assert.match(sw, /addEventListener\("notificationclick"/);
  assert.doesNotMatch(sw, /addEventListener\("fetch"/);
  assert.doesNotMatch(sw, /caches\./);
  assert.match(sw, /dir: "rtl"/);
  assert.match(sw, /lang: "he"/);
  assert.match(sw, /icon: "\/icon-192\.png"/);
});
