/* Server time on the phone (duels).
   A phone clock can be minutes off, so every timer (3-2-1, the 300-s clock)
   is drawn from SERVER time = local time + offset, where the offset comes from
   the server's now() in duel_state / presence_ping (Review Focus 2).

   API
     clockOffset(serverNowIso, sentAtMs, receivedAtMs) → ms (server − local)
         The server stamped now() somewhere between send and receive; we assume
         the middle, so the error is at most half the round trip. Bad input → 0.
     serverNow(offset) → ms   server time right now (local now + offset)
     localNow() → ms          Date.now(), plus a dev-only skew (below)
     createClock() → { sample(serverNowIso, sentAtMs, receivedAtMs), offset(), now() }
         Keeps the sample with the shortest round trip among the last 5
         (a slow response gives a less certain offset).

   Testing a wrong phone clock (localhost only): add ?skew=300000 to the URL to
   make this tab's clock 5 minutes ahead (negative = behind). Use localNow() for
   send/receive times so the skew is applied consistently. */

let skew = null;
function devSkew() {
  if (skew !== null) return skew;
  skew = 0;
  try {
    if (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      const m = /[?&]skew=(-?\d+)/.exec(window.location.search);
      if (m) skew = Number(m[1]) || 0;
    }
  } catch {}
  return skew;
}

export function localNow() { return Date.now() + devSkew(); }

function toMs(t) {
  if (typeof t === "number") return t;
  if (typeof t !== "string" || !t) return NaN;
  return Date.parse(t);
}

export function clockOffset(serverNowIso, sentAtMs, receivedAtMs) {
  const server = toMs(serverNowIso);
  if (!Number.isFinite(server) || !Number.isFinite(sentAtMs) || !Number.isFinite(receivedAtMs)) return 0;
  if (receivedAtMs < sentAtMs) return 0;
  return Math.round(server - (sentAtMs + (receivedAtMs - sentAtMs) / 2));
}

export function serverNow(offset) { return localNow() + (Number.isFinite(offset) ? offset : 0); }

export function createClock() {
  const samples = []; // { off, rtt }
  let best = 0;
  return {
    sample(serverNowIso, sentAtMs, receivedAtMs) {
      const server = toMs(serverNowIso);
      if (!Number.isFinite(server) || !Number.isFinite(sentAtMs) || !Number.isFinite(receivedAtMs) || receivedAtMs < sentAtMs) return best;
      samples.push({ off: clockOffset(server, sentAtMs, receivedAtMs), rtt: receivedAtMs - sentAtMs });
      if (samples.length > 5) samples.shift();
      best = samples.reduce((a, b) => (b.rtt < a.rtt ? b : a)).off;
      return best;
    },
    offset() { return best; },
    now() { return serverNow(best); },
  };
}
