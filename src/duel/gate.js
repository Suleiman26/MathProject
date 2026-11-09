/* Duels: "are duels open for me?" — the one answer the entry points (home tile
   src/home/DuelTile.jsx, the "דו-קרב" item in AccountMenu src/account/ui.jsx and
   the duel part of the profile) need, without loading the duel code on every page.

   No public tester list: the answer comes from the server's own replies —
   presence_ping (the heartbeat, src/duel/presence.js), duel_online (home tile),
   duel_history (profile): {error:'off'} → closed (switch off, or "test" and I'm
   not a tester); a normal answer → open. Anything else (network, offline) leaves
   it as it was.
   Remembered per account in localStorage ("mp:duel:open" = {<account id>: 1|0}),
   so a returning student sees the tile at once instead of it popping in later.
   Pure module: no React, no network (gate.test.mjs). The hook lives in ./gate-hook.js. */

const KEY = "mp:duel:open";
let mem = null;              // { [uid]: true|false }
const subs = new Set();

function store() {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}
function load() {
  if (mem) return mem;
  mem = {};
  const ls = store();
  try {
    const o = ls && JSON.parse(ls.getItem(KEY) || "{}");
    if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) if (v === 1 || v === 0) mem[k] = v === 1;
  } catch {}
  return mem;
}

/** true | false | null (not known yet on this device) */
export function duelOpen(uid) {
  if (!uid) return false;
  const m = load();
  return Object.prototype.hasOwnProperty.call(m, uid) ? m[uid] : null;
}

/** remember the answer for this account (and tell every listener) */
export function setDuelOpen(uid, open) {
  if (!uid || typeof open !== "boolean") return;
  const m = load();
  if (m[uid] === open) return;
  m[uid] = open;
  const ls = store();
  try {
    if (ls) {
      // keep only the last few accounts used on this device
      const keep = Object.fromEntries(Object.entries(m).slice(-5).map(([k, v]) => [k, v ? 1 : 0]));
      ls.setItem(KEY, JSON.stringify(keep));
    }
  } catch {}
  for (const f of [...subs]) f(uid, open);
}

/** what a server reply says about the gate: true (open), false ({error:'off'}), null (says nothing) */
export function gateFrom(reply) {
  if (!reply || typeof reply !== "object") return null;
  if (reply.error === "off") return false;
  if (reply.error) return null;
  return true;
}

/** listen for changes: f(uid, open); returns unsubscribe */
export function onDuelOpen(f) { subs.add(f); return () => subs.delete(f); }

/** tests only: forget the in-memory copy */
export function _resetGate() { mem = null; subs.clear(); }
