'use client';
/* Duels: face-off (mockup screen 3). Two diagonal halves — the opponent on top
   in their colour, me below in mine — avatars, names, "רמה 6 · אלוף/ה", a "VS"
   that slams in, then the shared 3-2-1 and "יאללה!" drawn from start_at in
   SERVER time (both phones hit "go" together, Review Focus 2). While the
   questions are still being made (status accepted) it shows "מכינים…". */
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/account/ui";
import { rankOf } from "@/lib/progress";
import { serverNow } from "./clock";
import { countdown } from "./arena-core";
import { sfx } from "./fx";

function Half({ who, p, pos }) {
  return (
    <div className={"fo-half " + pos}>
      <Avatar account={p} size={96} />
      <b dir="auto">{p.username}</b>
      <small>{p.level ? `רמה ${p.level} · ${rankOf(p.level)}` : " "}</small>
    </div>
  );
}

export function FaceOff({ me, opp, startAt, offset, preparing, failedSoon }) {
  const [cd, setCd] = useState(() => countdown(startAt, serverNow(offset)));
  const last = useRef("");
  useEffect(() => {
    if (!startAt) return;
    const tick = () => setCd(countdown(startAt, serverNow(offset)));
    tick();
    const t = setInterval(tick, 100);
    return () => clearInterval(t);
  }, [startAt, offset]);
  // one sound per step
  useEffect(() => {
    const key = cd.phase === "count" ? "c" + cd.n : cd.phase;
    if (key === last.current) return;
    last.current = key;
    if (cd.phase === "count") sfx("tick");
    if (cd.phase === "go") sfx("go");
  }, [cd.phase, cd.n]);

  const text = cd.phase === "count" ? String(cd.n) : cd.phase === "go" ? "יאללה!" : "";
  return (
    <div className={"fo" + (text ? " counting" : "")} role="status" aria-live="assertive" aria-label={text ? (cd.phase === "go" ? "יאללה!" : `מתחילים בעוד ${cd.n}`) : "פנים מול פנים"}>
      <Half who="op" p={opp} pos="t" />
      <div className="fo-vs" aria-hidden="true">VS</div>
      <Half who="me" p={me} pos="b" />
      {text && <div className={"fo-count" + (cd.phase === "go" ? " go" : "")} aria-hidden="true"><span key={text}>{text}</span></div>}
      {preparing && !text && (
        <div className="fo-prep" aria-hidden="true">
          <span className="fo-dots"><i /><i /><i /></span>
          {failedSoon ? "עוד רגע…" : "מכינים את השאלות…"}
        </div>
      )}
    </div>
  );
}
