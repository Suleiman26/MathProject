'use client';
/* useDuelOpen(uid) → true | false | null: are duels open for this student?
   See ./gate.js. Tiny on purpose (no duel API here): the account menu on every page uses it. */
import { useEffect, useState } from "react";
import { duelOpen, onDuelOpen } from "./gate";

export function useDuelOpen(uid) {
  // null on the server (and without an account). The callers render only once the account is
  // known (after hydration), so the first client render can already use what this device
  // remembers: a known-off student never sees a placeholder, a known-open one sees the tile at once
  const [open, setOpen] = useState(() => (uid && typeof window !== "undefined" ? duelOpen(uid) : null));
  useEffect(() => {
    setOpen(duelOpen(uid));
    return onDuelOpen((u, v) => { if (u === uid) setOpen(v); });
  }, [uid]);
  return open;
}
