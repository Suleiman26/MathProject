/* The duel heartbeat, without React (node --test runs it: presence.test.mjs).
   src/duel/presence.js wraps it in the usePresence() hook.

   Rules (spec §5, §7.3):
   - ping (presence_ping) every 20 s, only while signed in and the tab is visible;
     ping at once when the tab becomes visible again;
   - switch off ({error:'off'}) → once every 5 minutes, nothing in between;
   - dead session → stop until the token changes;
   - network trouble → 40 s, 80 s, 160 s … at most 5 minutes, then back to 20 s;
   - refresh() (e.g. a realtime 'invite' hint) pings now, at most once a second.
   State: { status: 'idle'|'ok'|'off'|'error'|'signed_out', invites: [], liveId, offset }
   offset = server − local clock in ms (clock.js), from the ping's server now. */
import { clockOffset } from "./clock.js";

export const PING_MS = 20000;
export const OFF_MS = 300000;
const VISIBLE_GAP_MS = 3000;
const REFRESH_GAP_MS = 1000;

export function createPresence(deps) {
  const now = deps.now || Date.now;
  const setTimer = deps.setTimer || setTimeout;
  const clearTimer = deps.clearTimer || clearTimeout;
  const visible = deps.visible || (() => true);

  let state = { status: "idle", invites: [], liveId: null, offset: 0 };
  const listeners = new Set();
  let tok = null;
  let gen = 0;           // bumps on every token change: late answers for an old token are dropped
  let stopped = false;
  let timer = null;
  let nextAt = 0;
  let lastAt = -Infinity; // when the last ping was sent
  let inflight = null;
  let errors = 0;

  function set(next) {
    state = { ...state, ...next };
    for (const l of [...listeners]) l(state);
  }
  function clear() { if (timer != null) clearTimer(timer); timer = null; }
  function schedule(ms) {
    clear();
    nextAt = now() + ms;
    if (stopped) return;
    timer = setTimer(() => { timer = null; if (visible()) pingNow(); }, ms);
  }

  function pingNow() {
    if (!tok || stopped || state.status === "signed_out") return Promise.resolve();
    if (inflight) return inflight;
    if (!visible()) return Promise.resolve();
    clear();
    const my = gen;
    lastAt = now();
    inflight = Promise.resolve()
      .then(() => deps.ping())
      .catch(() => ({ error: "network" }))
      .then((r) => {
        if (my !== gen) return;
        inflight = null;
        const code = r && r.error;
        if (code === "off") {
          errors = 0;
          set({ status: "off", invites: [], liveId: null });
          schedule(OFF_MS);
        } else if (code === "signed_out") {
          set({ status: "signed_out", invites: [], liveId: null });
          clear();
        } else if (code || !r) {
          errors++;
          set({ status: "error" });
          schedule(Math.min(PING_MS * 2 ** errors, OFF_MS));
        } else {
          errors = 0;
          set({
            status: "ok",
            invites: Array.isArray(r.invites) ? r.invites : [],
            liveId: r.live || null,
            offset: r.now ? clockOffset(r.now, r._sent, r._recv) : state.offset,
          });
          schedule(PING_MS);
        }
      })
      .finally(() => { if (my === gen) inflight = null; });
    return inflight;
  }

  return {
    get: () => state,
    listen(f) { listeners.add(f); return () => listeners.delete(f); },
    /** the signed-in token (null = signed out) */
    setToken(t) {
      t = t || null;
      if (t === tok && !stopped) {
        if (!t && state.status !== "signed_out") set({ status: "signed_out", invites: [], liveId: null });
        return;
      }
      if (t && t === tok && stopped) {
        // the same student again (a remount): carry on where we were
        stopped = false;
        if (state.status === "signed_out") return;
        if (nextAt > now()) schedule(nextAt - now()); else pingNow();
        return;
      }
      gen++;
      inflight = null;
      clear();
      tok = t;
      stopped = false;
      errors = 0;
      nextAt = 0;
      lastAt = -Infinity;
      if (!t) { set({ status: "signed_out", invites: [], liveId: null }); return; }
      set({ status: "idle", invites: [], liveId: null });
      pingNow();
    },
    /** the tab became visible */
    onVisible() {
      if (!tok || stopped || inflight || state.status === "signed_out") return;
      if (state.status === "off" || state.status === "error") {
        if (now() >= nextAt) pingNow();
        else if (timer == null) schedule(nextAt - now());
        return;
      }
      if (now() - lastAt >= VISIBLE_GAP_MS) pingNow();
      else if (timer == null) schedule(Math.max(0, lastAt + PING_MS - now()));
    },
    /** ping now (a realtime hint said something changed) */
    refresh() {
      if (!tok || stopped || state.status === "off" || state.status === "signed_out") return Promise.resolve();
      if (now() - lastAt < REFRESH_GAP_MS) return inflight || Promise.resolve();
      return pingNow();
    },
    /** nobody is listening any more: stop the timer, keep the token and state */
    stop() { stopped = true; clear(); },
  };
}
