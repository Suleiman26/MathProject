'use client';
/* useDuelOpen(uid) → true | false | null: are duels open for this student?
   See ./gate.js. Tiny on purpose (no duel API here): the account menu on every page uses it. */
import { useEffect, useState } from "react";
import { duelOpen, onDuelOpen } from "./gate";

export function useDuelOpen(uid) {
  // null on the server and in the first render: the tile/menu item never flashes before hydration
  const [open, setOpen] = useState(null);
  useEffect(() => {
    setOpen(duelOpen(uid));
    return onDuelOpen((u, v) => { if (u === uid) setOpen(v); });
  }, [uid]);
  return open;
}
