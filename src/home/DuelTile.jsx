'use client';
/* Signed-in home: the "דו-קרב" tile under the four number tiles (spec §4.7,
   Task 9). A white tile from the same family, with one small peek of the arena:
   a night disc where two blades meet in the student's own colour (once, on
   arrival). It says who of my friends is online right now and takes me to /duel.

   Shows only when duels are open for me (src/duel/gate.js: switch on, or test +
   tester). The friends-online number comes from ONE light call (duel_online)
   after the page has gone idle, and again when the tab comes back after 30 s —
   the duel API is loaded only then, in its own chunk.
   `sample` (dev pages): {online, friends, faces} drawn without any call.
   Styles: src/styles/hero.css (.hh-duel*). */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/account/ui";
import { useDuelOpen } from "@/duel/gate-hook";
import { gateFrom, setDuelOpen } from "@/duel/gate";
import { fmt } from "@/lib/progress";
import { DuelMark } from "@/duel/DuelMark";

const AGAIN_MS = 30000;

function whenIdle(f) {
  const w = window;
  if (typeof w.requestIdleCallback === "function") {
    const h = w.requestIdleCallback(f, { timeout: 3000 });
    return () => w.cancelIdleCallback(h);
  }
  const t = setTimeout(f, 1500);
  return () => clearTimeout(t);
}

/** the words under "דו-קרב" for what we know so far */
export function duelLine(info) {
  if (!info) return { text: "15 שאלות, 5 דקות. מי מנצח?", live: false };
  const online = Number(info.online) || 0;
  if (online === 1 && info.faces && info.faces[0]) return { text: <><bdi>{info.faces[0].username}</bdi> מחובר/ת עכשיו</>, live: true, plain: info.faces[0].username + " מחובר/ת עכשיו" };
  if (online > 1) return { text: `${fmt(online)} חברים מחוברים`, live: true, plain: `${fmt(online)} חברים מחוברים עכשיו` };
  if (!Number(info.friends)) return { text: "מוסיפים חבר עם קוד, ומשחקים", live: false };
  return { text: "15 שאלות, 5 דקות. מי מנצח?", live: false };
}

export function DuelTile({ account, sample }) {
  const known = useDuelOpen(account.id);
  const [info, setInfo] = useState(sample || null);

  useEffect(() => {
    if (sample) { setInfo(sample); return; }
    let dead = false, last = 0, busy = false;
    async function load() {
      if (busy || dead) return;
      busy = true; last = Date.now();
      try {
        const { duelApi } = await import("@/duel/api");
        const r = await duelApi.online();
        if (dead) return;
        const g = gateFrom(r);
        if (g != null) setDuelOpen(account.id, g);
        if (g) setInfo({ online: r.online, friends: r.friends, faces: Array.isArray(r.faces) ? r.faces : [] });
      } catch {} finally { busy = false; }
    }
    const stopIdle = whenIdle(load);
    const vis = () => { if (document.visibilityState === "visible" && Date.now() - last > AGAIN_MS) load(); };
    document.addEventListener("visibilitychange", vis);
    return () => { dead = true; stopIdle(); document.removeEventListener("visibilitychange", vis); };
  }, [account.id, sample]);

  if (!sample && known !== true) return null;
  const line = duelLine(info);
  // up to 3 faces; with more friends online, 2 faces and a "+N" bubble (keeps the line on one row on phones)
  const all = (info && info.faces) || [];
  const online = Number(info && info.online) || 0;
  const faces = online > 3 ? all.slice(0, 2) : all.slice(0, 3);
  const more = Math.max(0, online - faces.length);
  return (
    <Link href="/duel" className={"hh-duel" + (line.live ? " live" : "")}
      aria-label={"דו-קרב: " + (line.plain || (typeof line.text === "string" ? line.text : ""))}>
      <span className="hh-duel-mk" aria-hidden="true"><DuelMark className="hh-duel-sw" /></span>
      <span className="hh-duel-t">
        <b>דו-קרב</b>
        <small key={line.plain || String(line.text)}>{line.live && <i className="hh-duel-dot" />}{line.text}</small>
      </span>
      {/* desktop only: the room in the middle says what a duel is */}
      {line.live && <span className="hh-duel-tag" aria-hidden="true">15 שאלות · 5 דקות · מי מנצח?</span>}
      {faces.length > 0 && (
        <span className="hh-duel-faces" aria-hidden="true">
          {faces.map((f, k) => <span key={f.username + k} className="hh-duel-face" style={{ "--k": k }}><Avatar account={f} size={30} /></span>)}
          {more > 0 && <span className="hh-duel-more"><bdi dir="ltr">+{fmt(more)}</bdi></span>}
        </span>
      )}
      <span className="hh-duel-go" aria-hidden="true">
        <em>לזירה</em>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
      </span>
    </Link>
  );
}
