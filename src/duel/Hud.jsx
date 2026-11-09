'use client';
/* Duels: the dark HUD on top of the arena (mockup screen 4): both players with
   counting scores, the timer (red pulse in the last 30 s), the tug-of-war bar
   (the white knot slides to the leader), two 15-dash lanes, and the opponent's
   ping ("נועה ענה/תה ✓"). Server time throughout. Rules: ./arena-core.js. */
import { useEffect, useState } from "react";
import { Avatar } from "@/account/ui";
import { serverNow } from "./clock";
import { tugWidth, laneClass, fmtClock, timeLeft, HOT_MS, QUESTIONS } from "./arena-core";
import { useCountUp } from "./fx";

export function Timer({ endsAt, offset, onHot }) {
  const [left, setLeft] = useState(() => timeLeft(endsAt, serverNow(offset)));
  useEffect(() => {
    const tick = () => setLeft(timeLeft(endsAt, serverNow(offset)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [endsAt, offset]);
  const hot = left <= HOT_MS && left > 0;
  useEffect(() => { if (hot && onHot) onHot(); }, [hot]); // eslint-disable-line react-hooks/exhaustive-deps
  // screen readers hear the time twice only: at 30 s and at 10 s (not every second)
  const say = left > 0 && left <= 10000 ? "נשארו 10 שניות" : hot ? "נשארו 30 שניות" : "";
  return (
    <>
      <div className={"ar-timer" + (hot ? " hot" : "")} role="timer" aria-label={"נשארו " + fmtClock(left)}>
        {fmtClock(left)}
      </div>
      <span className="ar-sr" aria-live="polite">{say}</span>
    </>
  );
}

function Score({ value }) {
  const n = useCountUp(value, 500);
  return <b className="ar-sc">{n}</b>;
}

export function Lane({ lanes, idx, live, who, name }) {
  const ok = (lanes || []).filter((v) => v === true).length;
  return (
    <div className={"ar-lane " + who} role="img" aria-label={`${name}: ${ok} נכונות מתוך ${Math.min(QUESTIONS, idx || 0)} שנענו`}>
      {Array.from({ length: QUESTIONS }, (_, i) => <i key={i} className={laneClass(lanes, i, idx, live)} />)}
    </div>
  );
}

export function Hud({ me, opp, myLanes, endsAt, offset, live, ping, onHot }) {
  const w = tugWidth(me.score, opp.score);
  return (
    <header className="ar-hud">
      <div className="ar-hud-row">
        <div className="ar-p me">
          <Avatar account={me} size={38} />
          <div><div className="ar-nm">את/ה</div><Score value={me.score} /></div>
        </div>
        <Timer endsAt={endsAt} offset={offset} onHot={onHot} />
        <div className="ar-p op">
          <Avatar account={opp} size={38} />
          <div><div className="ar-nm" dir="auto">{opp.username}</div><Score value={opp.score} /></div>
        </div>
      </div>
      <div className="ar-tug" role="img" aria-label={me.score === opp.score ? "תיקו" : me.score > opp.score ? `את/ה מוביל/ה ב-${me.score - opp.score}` : `${opp.username} מוביל/ה ב-${opp.score - me.score}`}>
        {/* transform only: the fill scales from the left edge, the knot's runner slides (same look as width / left) */}
        <div className="ar-tug-track"><div className="ar-tug-op" style={{ transform: `scaleX(${w / 100})` }} /></div>
        <div className="ar-knot-run" style={{ transform: `translateX(${w}%)` }}><div className="ar-knot" /></div>
      </div>
      <div className="ar-lanes">
        <Lane lanes={myLanes} idx={me.idx} live={live && !me.done} who="me" name="את/ה" />
        <Lane lanes={opp.lanes} idx={opp.idx} live={live && !opp.done} who="op" name={opp.username} />
      </div>
      <div className={"ar-ping" + (ping ? " on" : "") + (ping && !ping.ok ? " bad" : "")} aria-live="polite">
        {ping ? <><span dir="auto">{opp.username}</span> {ping.ok ? "ענה/תה ✓" : "טעה/תה ✗"}</> : null}
      </div>
    </header>
  );
}
