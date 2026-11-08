'use client';
/* Duels: the incoming invite (mockup screen 2). A white card drops from the
   top of any page (never a modal — the page under it keeps working), with the
   challenger, the subject, the head-to-head, a 60-s ring in the challenger's
   colour drawn from expires_at in server time, one small shake after it lands,
   and "לא עכשיו" / "קבל/י את האתגר". The same card sits inline on /duel/<id>
   when the invitee opens the duel page directly (InviteCard). */
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/account/ui";
import { SUBJECT_LABEL } from "./samples";
import { serverNow } from "./clock";
import { inviteLeft, INVITE_MS, atName } from "./arena-core";
import { reduced, sfx } from "./fx";

const R = 19, CIRC = 2 * Math.PI * R;

export function InviteCard({ invite, offset = 0, onAccept, onDecline, busy, inline, gone }) {
  const [left, setLeft] = useState(() => inviteLeft(invite.expires_at, serverNow(offset)));
  const [shook, setShook] = useState(false);
  const card = useRef(null);
  useEffect(() => {
    const tick = () => setLeft(inviteLeft(invite.expires_at, serverNow(offset)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [invite.expires_at, offset]);
  // one small shake once the card has landed
  useEffect(() => {
    if (inline || reduced()) return;
    const t = setTimeout(() => setShook(true), 820);
    return () => clearTimeout(t);
  }, [inline]);
  useEffect(() => { if (!inline) sfx("tick"); }, [inline]);

  const s = Math.ceil(left / 1000);
  const from = invite.from || {};
  const h2h = Array.isArray(invite.h2h) ? invite.h2h : null;   // [mine, theirs]
  const played = h2h && (h2h[0] + h2h[1] > 0);
  const subject = SUBJECT_LABEL[invite.subject] || invite.subject;
  const expired = left <= 0 || gone;
  return (
    <div className={"inv" + (inline ? " inline" : "") + (shook ? " shake" : "") + (expired ? " gone" : "")} data-topic={from.avatar || "rose"} ref={card}
      role="dialog" aria-label={`${from.username} מאתגר/ת אותך לדו-קרב`} aria-live="polite">
      <div className="inv-top">
        <Avatar account={from} size={46} />
        <div className="inv-t">
          <b><span dir="auto">{from.username}</span> מאתגר/ת אותך!</b>
          <small>דו-קרב · {subject}</small>
        </div>
        <div className="inv-ring" role="timer" aria-label={`עוד ${s} שניות`}>
          <svg viewBox="0 0 46 46" aria-hidden="true">
            <circle cx="23" cy="23" r={R} className="inv-ring-bg" />
            <circle cx="23" cy="23" r={R} className="inv-ring-fg" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - Math.min(1, left / INVITE_MS))} />
          </svg>
          <span>{s}</span>
        </div>
      </div>
      <div className="inv-chips">
        <span>15 שאלות</span><span>5 דקות</span>
        <span>{played ? <>את/ה <b dir="ltr">{h2h[0]} – {h2h[1]}</b> {from.username}</> : "משחק ראשון ביניכם"}</span>
      </div>
      {expired ? (
        <p className="inv-gone" role="status">{gone === "declined" ? "ההזמנה נדחתה" : "ההזמנה כבר לא פעילה"}</p>
      ) : (
        <div className="inv-row">
          <button type="button" className="dl-btn ghost" disabled={!!busy} onClick={onDecline}>{busy === "no" ? "…" : "לא עכשיו"}</button>
          <button type="button" className="dl-btn inv-go" disabled={!!busy} onClick={onAccept}>{busy === "yes" ? "נכנסים…" : "קבל/י את האתגר"}</button>
        </div>
      )}
    </div>
  );
}

/** the floating version: fixed at the top of the page, above everything */
export function InviteDrop(props) {
  return (
    <div className="inv-wrap" role="region" aria-label="הזמנה לדו-קרב">
      <InviteCard {...props} />
    </div>
  );
}

export { atName };
