'use client';
/* Duels: "I'm online" heartbeat + pending invites, for signed-in students.

   usePresence() → { status, invites, liveId, offset, refresh }
     status   'idle' | 'ok' | 'off' (switch off: pings every 5 min only)
              | 'error' (network, backing off) | 'signed_out'
     invites  presence_ping invites: [{id, from:{id,username,avatar}, subject, expires_at, h2h:[mine, theirs]}]
     liveId   my accepted/live duel id, or null
     offset   server − local clock, ms (for expires_at rings: clock.js serverNow(offset))
     refresh() ping now (call it on a realtime 'invite' / 'invite_cancelled' hint)
   Pings every 20 s while the tab is visible, at once when it becomes visible,
   only when signed in. One shared heartbeat for the whole tab, however many
   components use the hook; it stops when the last one unmounts.
   The rules themselves live in ./presence-core.js (tested). */
import { useEffect, useState } from "react";
import { useAccount } from "../lib/account";
import { duelApi } from "./api";
import { createPresence } from "./presence-core";

const isVisible = () => typeof document === "undefined" || document.visibilityState === "visible";
const poller = createPresence({ ping: () => duelApi.ping(), visible: isVisible });

let users = 0;
function onVis() { if (isVisible()) poller.onVisible(); }
function onShow() { poller.onVisible(); }

function attach(tok) {
  users++;
  if (users === 1) {
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("online", onShow);
  }
  poller.setToken(tok);
  return () => {
    users--;
    if (users === 0) {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("online", onShow);
      poller.stop();
    }
  };
}

const refresh = () => poller.refresh();

export function usePresence() {
  const { ready, tok } = useAccount();
  const [s, setS] = useState(poller.get);
  useEffect(() => { setS(poller.get()); return poller.listen(setS); }, []);
  useEffect(() => (ready ? attach(tok || null) : undefined), [ready, tok]);
  return { ...s, refresh };
}
