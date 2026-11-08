'use client';
/* Duels: the result screen. PLACEHOLDER — Task 8 replaces this file with the
   staged reveal (columns rising, count-up, crown, confetti once, what to
   review, emotes, "נקמה"). Keep the interface: <Result state={duel_state} />
   (plus optional onRematch(), rematchBusy, rematchError from Play.jsx). */
import Link from "next/link";
import { Avatar } from "@/account/ui";

export default function Result({ state, onRematch, rematchBusy, rematchError }) {
  const me = state.me || {}, opp = state.opp || {}, r = state.result || {};
  const win = r.winner === me.id, draw = !!r.draw;
  const title = draw ? "תיקו!" : win ? "ניצחת!" : `הפעם ${opp.username}…`;
  return (
    <div className={"rs" + (win ? " win" : draw ? " draw" : " lose")} role="status" aria-live="polite">
      <h1>{title}</h1>
      <div className="rs-pods" dir="ltr">
        <div className="rs-pod me"><Avatar account={me} size={64} /><b>{me.score}</b><small>את/ה</small></div>
        <div className="rs-pod op"><Avatar account={opp} size={64} /><b>{opp.score}</b><small dir="auto">{opp.username}</small></div>
      </div>
      <p className="rs-facts">{me.ok || 0}/15 נכונות{r.xp_me ? ` · +${r.xp_me} נק׳` : ""}{r.gave_up ? (r.gave_up === me.id ? " · ויתרת" : ` · ${opp.username} ויתר/ה`) : ""}</p>
      {rematchError && <p className="dl-err" role="alert">{rematchError}</p>}
      <div className="dl-row">
        <Link className="dl-btn ghost" href="/duel">חזרה</Link>
        {onRematch && <button type="button" className="dl-btn accent" disabled={!!rematchBusy} onClick={onRematch}>{rematchBusy ? "שולחים…" : "נקמה! עוד סיבוב"}</button>}
      </div>
    </div>
  );
}
