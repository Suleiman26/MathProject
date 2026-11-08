'use client';
/* Duels: live hints over Supabase Realtime (broadcast, public channels).

   The database sends realtime.send(payload, event, topic, false) to a secret
   topic: accounts.inbox (my invites) or duels.channel (one duel). Anyone who
   knows a public topic name can write to it, so a message is ONLY A HINT:
   onHint gets the event name and nothing else; the caller re-fetches the truth
   (duelApi.state / duelApi.ping) and renders from that. The payload is never
   read (realtime also adds its own `id` key to it).

   API
     subscribe(topic, onHint, opts?) → unsubscribe()
       onHint(event): event is one of
         'invite' | 'invite_cancelled' | 'invite_answer'      (inbox topic)
         'duel_start' | 'opp_answer' | 'emote' | 'duel_end'  (duel topic)
         'sync'  — (re)subscribed, or the tab became visible / came back online:
                   things may have happened while we weren't listening → re-fetch.
                   Fired on the first successful subscribe too.
         Any other event name from the wire is ignored.
       opts.onStatus(connected: boolean) — called on every change (and once,
         soon after subscribing, with the current value).
     isConnected(topic?) → boolean   this topic joined (or, without a topic,
                                     the socket is open)

   Task 7 (Play) pattern:
     const off = subscribe(state.channel, () => refetch(), { onStatus: setLive });
     // while !isConnected(state.channel) (or setLive(false)): poll duelApi.state every 3 s
     // on unmount: off()

   Reconnects: realtime-js reconnects the socket (1, 2, 5, 10 s…) and rejoins
   the channels itself. On top of that: when the tab becomes visible or the
   browser comes back online we reconnect at once and send 'sync'; a channel
   the server closed, or one stuck unjoined for 20 s while visible, is rebuilt.
   realtime-js is imported lazily, so it only loads on pages that subscribe.
   One socket for the whole tab; it closes itself ~50 s after the last channel. */
import { getConfig } from "../lib/config.js";

export const HINT_EVENTS = ["invite", "invite_cancelled", "invite_answer", "duel_start", "opp_answer", "emote", "duel_end"];
const KNOWN = new Set(HINT_EVENTS);
const STUCK_MS = 20000;

const deps = {
  load: () => import("@supabase/realtime-js"),
  config: () => getConfig(),
  retryMs: (tries) => [1000, 2000, 5000, 10000][tries] || 20000,
  win: () => (typeof window !== "undefined" ? window : null),
};
/** tests only: replace the realtime loader / config / timings */
export function __setLiveDeps(d) { Object.assign(deps, d); }
/** tests only: forget everything */
export function __resetLive() {
  for (const T of topics.values()) { clearTimeout(T.retry); }
  topics.clear();
  socket = null; socketP = null;
  if (watch) { clearInterval(watch); watch = null; }
}

let socket = null;
let socketP = null;
const topics = new Map(); // topic → { topic, listeners:Set, ch, connected, tries, retry, since }
let watch = null;
let bound = false;

function wsUrl(httpUrl) {
  return String(httpUrl || "").replace(/^http/i, "ws").replace(/\/+$/, "") + "/realtime/v1";
}

function getSocket() {
  if (socket) return Promise.resolve(socket);
  if (!socketP) {
    socketP = deps.load().then((mod) => {
      const c = deps.config();
      const Client = mod.RealtimeClient || (mod.default && mod.default.RealtimeClient);
      socket = new Client(wsUrl(c.supabaseUrl), { params: { apikey: c.supabaseKey } });
      return socket;
    }).catch((e) => { socketP = null; throw e; });
  }
  return socketP;
}

function each(T, f) { for (const l of [...T.listeners]) { try { f(l); } catch (e) { setTimeout(() => { throw e; }); } } }
function hint(T, event) { each(T, (l) => l.onHint(event)); }
function setConnected(T, v) {
  if (T.connected === v) return;
  T.connected = v;
  if (!v) T.since = Date.now();
  each(T, (l) => l.onStatus && l.onStatus(v));
}

// drop a channel for good, even when the server can't be told (offline)
function forget(s, ch) {
  if (!s || !ch) return;
  Promise.resolve().then(() => s.removeChannel(ch)).catch(() => {}).finally(() => {
    try { if (s.getChannels().includes(ch)) { ch.teardown(); s._remove ? s._remove(ch) : (s.channels = s.channels.filter((c) => c !== ch)); } } catch {}
  });
}

async function open(T) {
  clearTimeout(T.retry);
  T.retry = null;
  let s;
  try { s = await getSocket(); } catch { return retryLater(T); }
  if (topics.get(T.topic) !== T) return;                     // unsubscribed while loading
  if (T.ch) { const old = T.ch; T.ch = null; forget(s, old); }
  // a leftover channel with the same name would be handed back by channel(): remove it first
  try {
    const stale = s.getChannels().find((c) => c.topic === "realtime:" + T.topic);
    if (stale) { stale.teardown(); s._remove ? s._remove(stale) : (s.channels = s.channels.filter((c) => c !== stale)); }
  } catch {}
  const ch = s.channel(T.topic, { config: { broadcast: { self: false, ack: false }, private: false } });
  T.ch = ch;
  T.since = Date.now();
  ch.on("broadcast", { event: "*" }, (msg) => {
    if (T.ch !== ch) return;
    const ev = msg && msg.event;
    if (typeof ev === "string" && KNOWN.has(ev)) hint(T, ev);
  });
  ch.subscribe((status) => {
    if (T.ch !== ch || topics.get(T.topic) !== T) return;
    if (status === "SUBSCRIBED") {
      T.tries = 0;
      setConnected(T, true);
      hint(T, "sync");
    } else {
      setConnected(T, false);
      // CHANNEL_ERROR / TIMED_OUT: realtime-js rejoins by itself. CLOSED: the channel
      // is gone (server closed it) → build a new one.
      if (status === "CLOSED") retryLater(T);
    }
  });
}

function retryLater(T) {
  if (topics.get(T.topic) !== T || T.retry) return;
  const ms = deps.retryMs(T.tries || 0);
  T.tries = (T.tries || 0) + 1;
  T.retry = setTimeout(() => { T.retry = null; if (topics.get(T.topic) === T) open(T); }, ms);
}

function visible() {
  const w = deps.win();
  return !w || !w.document || w.document.visibilityState !== "hidden";
}

// the tab is back (visible / online): reconnect now, and tell everyone to re-fetch
function wake() {
  if (!topics.size || !visible()) return;
  if (socket && !socket.isConnected()) { try { socket.connect(); } catch {} }
  for (const T of topics.values()) hint(T, "sync");
}

function watchdog() {
  if (!topics.size || !visible()) return;
  if (socket && !socket.isConnected()) { try { socket.connect(); } catch {} }
  const now = Date.now();
  for (const T of topics.values()) {
    if (!T.connected && !T.retry && T.ch && now - T.since > STUCK_MS) { T.since = now; open(T); }
  }
}

function bind() {
  if (!watch) watch = setInterval(watchdog, 5000);
  const w = deps.win();
  if (bound || !w) return;
  bound = true;
  w.addEventListener("online", wake);
  w.addEventListener("pageshow", wake);
  if (w.document) w.document.addEventListener("visibilitychange", () => { if (visible()) wake(); });
}

export function subscribe(topic, onHint, opts) {
  if (!topic || typeof topic !== "string" || typeof onHint !== "function") return () => {};
  const l = { onHint, onStatus: opts && typeof opts.onStatus === "function" ? opts.onStatus : null };
  let T = topics.get(topic);
  const fresh = !T;
  if (!T) { T = { topic, listeners: new Set(), ch: null, connected: false, tries: 0, retry: null, since: Date.now() }; topics.set(topic, T); }
  T.listeners.add(l);
  bind();
  if (fresh) open(T);
  else if (T.connected) setTimeout(() => { if (T.listeners.has(l)) l.onHint("sync"); }, 0);
  if (l.onStatus) setTimeout(() => { if (T.listeners.has(l)) l.onStatus(T.connected); }, 0);

  return function unsubscribe() {
    if (!T.listeners.delete(l) || T.listeners.size) return;
    if (topics.get(topic) === T) topics.delete(topic);
    clearTimeout(T.retry);
    T.retry = null;
    const ch = T.ch;
    T.ch = null;
    if (ch && socket) forget(socket, ch);
    if (!topics.size && watch) { clearInterval(watch); watch = null; }
  };
}

export function isConnected(topic) {
  if (topic) { const T = topics.get(topic); return !!(T && T.connected); }
  return !!(socket && socket.isConnected());
}
