'use client';
/* Duels: the challenge sheet. Pick a subject (the worlds + "הפתעה!"), send;
   then wait for the friend with the 60-s ring (server time, clock.js) and a
   cancel button. The 30-s send cooldown is drawn on the button.
   api: { invite(friendId, subject), cancel(id), state(id) } — each resolves to
   JSON or {error, message}. onLive(id) fires when the friend accepted. */
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Avatar } from "@/account/ui";
import { worldArt } from "@/home/worlds";
import { localNow, serverNow } from "./clock";
import { subjectsFor, randomEmpty, SUBJECT_LABEL } from "./samples";
import { FriendAvatar, H2H, seenAgo } from "./FriendRow";
import { Sheet } from "./Sheet";

export const COOLDOWN_MS = 30000;
export const INVITE_MS = 60000;
const POLL_MS = 3000;
const R = 52, CIRC = 2 * Math.PI * R;
/* "ל" + a Latin username needs a hyphen: "ל-noa"; Hebrew names glue: "לנועה" */
export const toName = (n) => (/^[A-Za-z0-9]/.test(String(n || "")) ? "ל-" : "ל") + n;

function Die({ rolling }) {
  return (
    <span className={"dl-die" + (rolling ? " roll" : "")} aria-hidden="true">
      {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((p, i) => <i key={i} className={p ? "p" : ""} />)}
    </span>
  );
}

export const ChallengeSheet = forwardRef(function ChallengeSheet(
  { open, onClose, friend, me, offset = 0, api, cooldownUntil = 0, onCooldown, onLive, initialWaiting = null, liveId = null }, ref) {
  const [subject, setSubject] = useState("random");
  const [phase, setPhase] = useState(initialWaiting ? "waiting" : "pick");  // pick | sending | waiting | declined | expired | error
  const [invite, setInvite] = useState(initialWaiting);                      // { id, expires_at }
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [rolled, setRolled] = useState(false);
  const polling = useRef(null);

  // a fresh open starts at the picker (unless told to start waiting)
  useEffect(() => {
    if (!open) return;
    setPhase(initialWaiting ? "waiting" : "pick"); setInvite(initialWaiting); setErr(""); setSubject("random");
  }, [open, friend && friend.id, initialWaiting]);

  // one clock for the ring and the cooldown
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [open]);

  const check = useCallback(async () => {
    if (!invite || !api || !api.state) return;
    const r = await api.state(invite.id);
    if (!r) return;
    const st = r.error ? (r.error === "gone" ? "expired" : null) : r.status;
    if (st === "accepted" || st === "live") { onLive?.(invite.id); return; }
    if (st === "declined") setPhase("declined");
    else if (st === "expired" || st === "cancelled") setPhase("expired");
  }, [invite, api, onLive]);
  useImperativeHandle(ref, () => ({ poke: check }), [check]);

  // waiting: ask every 3 s (realtime hints call poke() in between)
  useEffect(() => {
    if (!open || phase !== "waiting" || !invite) return;
    polling.current = setInterval(check, POLL_MS);
    return () => clearInterval(polling.current);
  }, [open, phase, invite, check]);
  useEffect(() => { if (open && phase === "waiting" && liveId) onLive?.(liveId); }, [open, phase, liveId, onLive]);

  if (!friend) return null;
  const name = friend.username;
  const subjects = subjectsFor(me && me.grade, friend.grade).filter((s) => !s.empty);
  const noQuestions = randomEmpty(me && me.grade, friend.grade);
  const cdLeft = Math.max(0, Math.ceil((cooldownUntil - localNow()) / 1000));
  const left = invite ? Math.max(0, (Date.parse(invite.expires_at) - serverNow(offset)) / 1000) : 0;
  const leftS = Math.ceil(left);
  if (phase === "waiting" && invite && left <= 0 && leftS === 0) { /* the ring ran out: let the server confirm */ }

  async function send() {
    if (phase !== "pick" || cdLeft > 0 || noQuestions) return;
    setPhase("sending"); setErr("");
    const r = await api.invite(friend.id, subject);
    if (r && r.error) {
      if (r.error === "cooldown") onCooldown?.(localNow() + Math.max(1, Number(r.wait_s) || 30) * 1000);
      setErr(r.message || "לא הצלחנו לשלוח. נסו שוב"); setPhase("pick");
      return;
    }
    onCooldown?.(localNow() + COOLDOWN_MS);
    setInvite({ id: r.id, expires_at: r.expires_at });
    setPhase("waiting");
  }
  async function cancel() {
    const id = invite && invite.id;
    setPhase("pick"); setInvite(null);
    if (id) await api.cancel(id);
  }
  function again() { setPhase("pick"); setInvite(null); setErr(""); }

  const picking = phase === "pick" || phase === "sending";
  return (
    <Sheet open={open} onClose={phase === "waiting" ? cancel : onClose} label={`אתגר ${toName(name)}`} className="dl-ch">
      {/* who */}
      <div className="dl-ch-who" data-topic={friend.avatar}>
        <FriendAvatar friend={friend} size={52} />
        <div className="dl-ch-nm"><b dir="auto">{name}</b><small>{seenAgo(friend)}</small></div>
        <H2H wins={friend.wins} losses={friend.losses} name={name} compact />
      </div>

      {picking && (
        <>
          <h2 className="dl-sh-t">על מה?</h2>
          {noQuestions ? (
            <p className="dl-sh-m">אין עדיין שאלות לדו-קרב ביניכם. בקרוב.</p>
          ) : (
            <div className="dl-subj" role="radiogroup" aria-label="נושא הדו-קרב">
              <button type="button" role="radio" aria-checked={subject === "random"} className={"dl-sj rnd" + (subject === "random" ? " on" : "")}
                onClick={() => { setSubject("random"); setRolled((r) => !r); }} data-autofocus>
                <Die rolling={rolled} />
                <span className="dl-sj-t"><b>הפתעה!</b><small>שאלות מכל הנושאים של שניכם</small></span>
              </button>
              {subjects.map((s) => (
                <button key={s.key} type="button" role="radio" aria-checked={subject === s.key} className={"dl-sj" + (subject === s.key ? " on" : "")} data-w={s.key} onClick={() => setSubject(s.key)}>
                  <img className="dl-sj-art" src={worldArt(s.key)} alt="" width={96} height={96} decoding="async" />
                  <span className="dl-sj-t"><b>{s.label}</b><small>{s.sub}</small></span>
                </button>
              ))}
            </div>
          )}
          {err && <p className="dl-err" role="alert">{err}</p>}
          <div className="dl-ch-foot">
            <button type="button" className={"dl-btn send" + (cdLeft > 0 ? " cd" : "")} onClick={send} disabled={phase === "sending" || cdLeft > 0 || noQuestions}
              style={cdLeft > 0 ? { "--cd": (cdLeft / (COOLDOWN_MS / 1000)).toFixed(3) } : undefined} aria-live="polite">
              <span>{phase === "sending" ? "שולחים…" : cdLeft > 0 ? `אפשר לשלוח שוב בעוד ${cdLeft} שנ׳` : `שליחת אתגר ${toName(name)}`}</span>
            </button>
            <p className="dl-ch-note">15 שאלות · 5 דקות · אותן שאלות לשניכם</p>
          </div>
        </>
      )}

      {phase === "waiting" && invite && (
        <div className="dl-wait">
          <div className="dl-ring" data-topic={friend.avatar} role="timer" aria-label={`עוד ${leftS} שניות`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r={R} className="dl-ring-bg" />
              <circle cx="60" cy="60" r={R} className="dl-ring-fg" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - Math.min(1, left / (INVITE_MS / 1000)))} />
            </svg>
            <span className="dl-ring-av"><Avatar account={friend} size={64} /></span>
            <b className="dl-ring-n">{leftS}</b>
          </div>
          <h2 className="dl-sh-t" role="status" aria-live="polite">מחכים {toName(name)}…</h2>
          <p className="dl-sh-m">ההזמנה אצל{friend.online ? "" : " (כשייכנס/תיכנס לאתר)"} · {SUBJECT_LABEL[subject] || "הפתעה"} · 15 שאלות</p>
          <button type="button" className="dl-btn ghost wide" onClick={cancel}>ביטול ההזמנה</button>
        </div>
      )}

      {(phase === "declined" || phase === "expired") && (
        <div className="dl-wait">
          <div className="dl-ring quiet" data-topic={friend.avatar}><span className="dl-ring-av"><Avatar account={friend} size={64} /></span></div>
          <h2 className="dl-sh-t" role="status">{phase === "declined" ? `${name} לא יכול/ה עכשיו` : "הזמן עבר"}</h2>
          <p className="dl-sh-m">{phase === "declined" ? "אולי באמצע משהו. אפשר לנסות שוב מאוחר יותר." : `אולי ${name} לא ראה/תה. אפשר לשלוח שוב.`}</p>
          <div className="dl-row">
            <button type="button" className="dl-btn ghost" onClick={onClose}>סגירה</button>
            <button type="button" className="dl-btn dark" onClick={again} data-autofocus>{phase === "declined" ? "לבחור נושא אחר" : "לשלוח שוב"}</button>
          </div>
        </div>
      )}
    </Sheet>
  );
});
