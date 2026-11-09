'use client';
/* Duels: mounts DuelLayer (presence + invite drop-in + "back to duel" pill) once, from
   app/layout.tsx — only for signed-in students, only after the page has gone idle (so topic
   pages are not slowed), and never on /admin, /classic or /dev.

   Switch off = site unchanged: while duels are NOT known to be open for this student
   (src/duel/gate.js says false, or nothing yet on this device) nothing heavy loads — no
   DuelLayer chunk, no duel styles, no question engine. Only ./gate-ping.js asks the server
   (one light presence_ping at idle, then every 5 minutes while the tab is visible). When it
   answers "open", DuelLayer loads in its own chunk and takes over the heartbeat; when the
   heartbeat later says "off", DuelLayer goes away again. Duel pages load the duel code
   anyway, so there the layer mounts at once. */
import { lazy, Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "@/lib/account";
import { useDuelOpen } from "./gate-hook";
import { gatePing } from "./gate-ping";

const DuelLayer = lazy(() => import("./DuelLayer"));
const SKIP = /^\/(admin|classic|dev)(\/|$)/;
const OFF_MS = 300000;           // the "off" re-check, as presence-core's OFF_MS

export default function DuelLayerMount() {
  const path = usePathname() || "/";
  const { account, tok } = useAccount();
  const [idle, setIdle] = useState(false);
  const signedIn = !!account;
  const uid = account && account.id;
  const open = useDuelOpen(uid);
  const onDuelPage = /^\/duel(\/|$)/.test(path);
  const skip = SKIP.test(path);

  useEffect(() => {
    if (!signedIn || idle) return;
    const w = window;
    // a duel page wants it now; everywhere else wait for an idle moment
    if (onDuelPage) { setIdle(true); return; }
    if (typeof w.requestIdleCallback === "function") {
      const h = w.requestIdleCallback(() => setIdle(true), { timeout: 2500 });
      return () => w.cancelIdleCallback(h);
    }
    const t = setTimeout(() => setIdle(true), 1200);
    return () => clearTimeout(t);
  }, [signedIn, idle, onDuelPage]);

  // not known open → the light check: now (at idle), then every 5 min while visible
  const light = signedIn && idle && !skip && open !== true && !onDuelPage;
  useEffect(() => {
    if (!light || !tok) return;
    let last = 0;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      last = Date.now();
      gatePing(uid, tok);
    };
    check();
    const t = setInterval(check, OFF_MS);
    const vis = () => { if (document.visibilityState === "visible" && Date.now() - last >= OFF_MS) check(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [light, uid, tok]);

  if (!signedIn || !idle || skip) return null;
  if (open !== true && !onDuelPage) return null;
  return <Suspense fallback={null}><DuelLayer /></Suspense>;
}
