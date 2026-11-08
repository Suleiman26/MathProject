'use client';
/* Duels: mounts DuelLayer (presence + invite drop-in + "back to duel" pill)
   once, from app/layout.tsx — only for signed-in students, only after the page
   has gone idle (so topic pages are not slowed), and never on /admin, /classic
   or /dev. The layer itself (realtime, presence, styles) loads in its own chunk. */
import { lazy, Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "@/lib/account";

const DuelLayer = lazy(() => import("./DuelLayer"));
const SKIP = /^\/(admin|classic|dev)(\/|$)/;

export default function DuelLayerMount() {
  const path = usePathname() || "/";
  const { account } = useAccount();
  const [idle, setIdle] = useState(false);
  const signedIn = !!account;
  useEffect(() => {
    if (!signedIn || idle) return;
    const w = window;
    // a duel page wants it now; everywhere else wait for an idle moment
    if (/^\/duel(\/|$)/.test(path)) { setIdle(true); return; }
    if (typeof w.requestIdleCallback === "function") {
      const h = w.requestIdleCallback(() => setIdle(true), { timeout: 2500 });
      return () => w.cancelIdleCallback(h);
    }
    const t = setTimeout(() => setIdle(true), 1200);
    return () => clearTimeout(t);
  }, [signedIn, idle, path]);
  if (!signedIn || !idle || SKIP.test(path)) return null;
  return <Suspense fallback={null}><DuelLayer /></Suspense>;
}
