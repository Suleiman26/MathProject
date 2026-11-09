'use client';
/* Duels: the LIGHT gate check — one presence_ping through the tiny REST client that every
   page already has (src/lib/mp-data.js), no duel API, no engine, no styles. Used by
   DuelLayerMount while duels are not known to be open for this student: once at idle on a
   page load, then every 5 minutes. Its answer goes to ./gate.js ({error:'off'} → closed,
   a normal answer → open); anything else (network, dead session) leaves the gate as it was. */
import { mpData } from "../lib/mp-data";
import { gateFrom, setDuelOpen } from "./gate";

let inflight = null;

/** → Promise<true | false | null> */
export function gatePing(uid, tok) {
  if (!uid || !tok || !mpData.ready) return Promise.resolve(null);
  if (inflight) return inflight;
  inflight = mpData.rpc("presence_ping", { tok })
    .then((r) => { const g = gateFrom(r); if (g != null) setDuelOpen(uid, g); return g; }, () => null)
    .finally(() => { inflight = null; });
  return inflight;
}
