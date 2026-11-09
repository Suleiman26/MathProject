'use client';
/* Duels: the challenge sheet. Pick a subject (the worlds + "הפתעה!"), send;
   then the friend's 60-s ring (server time, clock.js) and a cancel button.
   The 30-s send cooldown is drawn on the button.

   The waiting state is OWNED BY THE HUB (`wait`): closing the sheet keeps the
   invite alive (the hub shows a small waiting pill); only "ביטול ההזמנה"
   cancels. The hub also polls duel_state for it (useInviteWatch in Hub.jsx).
     wait = { friend, invite: {id, expires_at}, subject, phase: 'waiting'|'declined'|'expired' }
   api: { invite(friendId, subject), cancel(id) } — each resolves to JSON or {error, message}. */
import { useEffect, useState } from "react";
import { Avatar } from "@/account/ui";
import { worldArt } from "@/home/worlds";
import { localNow, serverNow } from "./clock";
import { SUBJECTS, SUBJECT_LABEL } from "./subjects";
import { FriendAvatar, H2H, seenAgo, toName, SEP } from "./FriendRow";
import { Sheet, radioKeys } from "./Sheet";

/* The question engine (./samples.js: which worlds have questions for these grades) is
   ~22 KB gz, so it is loaded only here, lazily: the hub starts it at idle (preloadEngine),
   and an open sheet waits for it. Until then the four worlds show and "send" waits. */
let engine = null;
let enginePromise = null;
export function preloadEngine() {
  if (!enginePromise) enginePromise = import("./samples").then((m) => (engine = m)).catch(() => { enginePromise = null; return null; });
  return enginePromise;
}

export const COOLDOWN_MS = 30000;
export const INVITE_MS = 60000;
const R = 52, CIRC = 2 * Math.PI * R;

function Die({ rolling }) {
  return (
    <span className={"dl-die" + (rolling ? " roll" : "")} aria-hidden="true">
      {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((p, i) => <i key={i} className={p ? "p" : ""} />)}
    </span>
  );
}

/** The friend inside the 60-s ring (also used by the hub's waiting pill, small) */
export function WaitRing({ friend, left, total = INVITE_MS / 1000, size = 132, quiet }) {
  const r = R, circ = CIRC;
  const s = Math.ceil(Math.max(0, left));
  return (
    <span className={"dl-ring" + (quiet ? " quiet" : "")} style={{ "--size": size + "px" }} role={quiet ? undefined : "timer"} aria-label={quiet ? undefined : `עוד ${s} שניות`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="dl-ring-bg" />
        {!quiet && <circle cx="60" cy="60" r={r} className="dl-ring-fg" strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(1, Math.max(0, left) / total))} />}
      </svg>
      <span className="dl-ring-av"><Avatar account={friend} size={Math.round(size * 0.485)} /></span>
      {!quiet && <b className="dl-ring-n" aria-hidden="true">{s}</b>}
    </span>
  );
}

export function ChallengeSheet({ open, onClose, friend, me, offset = 0, api, cooldownUntil = 0, onCooldown, wait, onWait, onCancel, onAgain }) {
  const [subject, setSubject] = useState("random");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [, setTick] = useState(0);
  const [rolled, setRolled] = useState(false);
  const [cdNote, setCdNote] = useState("");   // announced once when the cooldown ends (never the countdown itself)

  useEffect(() => { if (open) { setErr(""); setSubject("random"); setSending(false); } }, [open, friend && friend.id]);
  const [eng, setEng] = useState(engine);
  const [engFail, setEngFail] = useState(false);   // the engine chunk didn't load (offline / a new deploy): offer a retry
  useEffect(() => {
    if (!open || eng || engFail) return;
    let dead = false;
    preloadEngine().then((m) => { if (dead) return; if (m) setEng(m); else setEngFail(true); });
    return () => { dead = true; };
  }, [open, eng, engFail]);
  // one clock for the ring and the cooldown
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [open]);

  const cdLeft = Math.max(0, Math.ceil((cooldownUntil - localNow()) / 1000));
  const coolingDown = cdLeft > 0;
  // every hook before the early return below (rules of hooks)
  useEffect(() => {
    if (!open) return;
    if (coolingDown) setCdNote("");
    else if (cooldownUntil) setCdNote("אפשר לשלוח אתגר שוב");
  }, [open, coolingDown, cooldownUntil]);

  if (!friend) return null;
  const name = friend.username;
  // the worlds this pair has questions for (all four until the engine has loaded)
  const subjects = eng ? eng.subjectsFor(me && me.grade, friend.grade).filter((s) => !s.empty) : SUBJECTS;
  const keys = ["random", ...subjects.map((s) => s.key)];
  const noQuestions = eng ? eng.randomEmpty(me && me.grade, friend.grade) : false;
  const loading = !eng && !engFail;
  const mine = wait && wait.friend && wait.friend.id === friend.id ? wait : null;     // the wait shown in THIS sheet
  const otherWait = wait && !mine;                                                   // an open invite to someone else
  const left = mine && mine.invite ? (Date.parse(mine.invite.expires_at) - serverNow(offset)) / 1000 : 0;

  async function send() {
    if (engFail) { setEngFail(false); return; }      // "try again": the effect above loads the engine again
    if (sending || loading || !eng || cdLeft > 0 || noQuestions || otherWait) return;
    setSending(true); setErr("");
    const r = await api.invite(friend.id, subject);
    setSending(false);
    if (r && r.error) {
      if (r.error === "cooldown") onCooldown?.(localNow() + Math.max(1, Number(r.wait_s) || 30) * 1000);
      setErr(r.message || "לא הצלחנו לשלוח. נסו שוב");
      return;
    }
    onCooldown?.(localNow() + COOLDOWN_MS);
    onWait?.({ friend, invite: { id: r.id, expires_at: r.expires_at }, subject, phase: "waiting" });
  }

  const picking = !mine;
  return (
    <Sheet open={open} onClose={onClose} label={`אתגר ${toName(name)}`} className="dl-ch">
      {/* who: only the avatar carries the friend's colour */}
      <div className="dl-ch-who">
        <FriendAvatar friend={friend} size={52} />
        <div className="dl-ch-nm"><b dir="auto">{name}</b><small>{seenAgo(friend)}</small></div>
        <H2H friend={friend} me={me} compact />
      </div>

      {picking && (
        <>
          <h2 className="dl-sh-t">על מה?</h2>
          {!friend.online && <p className="dl-note">{name} לא מחובר/ת עכשיו — ההזמנה תחכה דקה</p>}
          {otherWait && <p className="dl-note">יש כבר הזמנה פתוחה {toName(wait.friend.username)}. אפשר לבטל אותה מהדף ואז לשלוח כאן.</p>}
          {noQuestions ? (
            <p className="dl-sh-m">אין עדיין שאלות לדו-קרב ביניכם. בקרוב.</p>
          ) : (
            <div className="dl-subj" role="radiogroup" aria-label="נושא הדו-קרב">
              <button type="button" role="radio" data-id="random" aria-checked={subject === "random"} tabIndex={subject === "random" ? 0 : -1}
                className={"dl-sj rnd" + (subject === "random" ? " on" : "")}
                onClick={() => { setSubject("random"); setRolled((r) => !r); }} onKeyDown={(e) => radioKeys(e, keys, subject, setSubject)} data-autofocus>
                <Die rolling={rolled} />
                <span className="dl-sj-t"><b>הפתעה!</b><small>שאלות מכל הנושאים של שניכם</small></span>
              </button>
              {subjects.map((s) => (
                <button key={s.key} type="button" role="radio" data-id={s.key} aria-checked={subject === s.key} tabIndex={subject === s.key ? 0 : -1}
                  className={"dl-sj" + (subject === s.key ? " on" : "")} data-w={s.key} onClick={() => setSubject(s.key)} onKeyDown={(e) => radioKeys(e, keys, subject, setSubject)}>
                  <img className="dl-sj-art" src={worldArt(s.key)} alt="" width={96} height={96} decoding="async" />
                  <span className="dl-sj-t"><b>{s.label}</b><small>{s.sub}</small></span>
                </button>
              ))}
            </div>
          )}
          {err && <p className="dl-err" role="alert">{err}</p>}
          {engFail && <p className="dl-err" role="alert">לא הצלחנו לטעון את הדו-קרב. בדקו את החיבור ונסו שוב</p>}
          <div className="dl-ch-foot">
            <button type="button" className={"dl-btn send" + (cdLeft > 0 && !engFail ? " cd" : "")} onClick={send} disabled={!engFail && (sending || loading || cdLeft > 0 || noQuestions || !!otherWait)}
              style={cdLeft > 0 && !engFail ? { "--cd": (cdLeft / (COOLDOWN_MS / 1000)).toFixed(3) } : undefined}>
              <span>{engFail ? "לנסות שוב" : sending ? "שולחים…" : cdLeft > 0 ? `אפשר לשלוח שוב בעוד ${cdLeft} שנ׳` : `שליחת אתגר ${toName(name)}`}</span>
            </button>
            <p className="dl-sr" role="status" aria-live="polite">{cdNote}</p>
            <p className="dl-ch-note">15 שאלות · 5 דקות · אותן שאלות לשניכם</p>
          </div>
        </>
      )}

      {mine && mine.phase === "waiting" && (
        <div className="dl-wait">
          <WaitRing friend={friend} left={left} />
          <h2 className="dl-sh-t" role="status" aria-live="polite">מחכים {toName(name)}…</h2>
          <p className="dl-sh-m">{friend.online ? `ההזמנה הגיעה ${toName(name)}` : `${name} לא מחובר/ת עכשיו — ההזמנה מחכה`}{SEP}{SUBJECT_LABEL[mine.subject] || "הפתעה"}{SEP}15 שאלות</p>
          <p className="dl-sh-m small">אפשר לסגור ולהמשיך בדף — ההזמנה נשארת פתוחה.</p>
          <button type="button" className="dl-btn ghost wide" onClick={onCancel}>ביטול ההזמנה</button>
        </div>
      )}

      {mine && (mine.phase === "declined" || mine.phase === "expired") && (
        <div className="dl-wait">
          <WaitRing friend={friend} left={0} quiet />
          <h2 className="dl-sh-t" role="status">{mine.phase === "declined" ? `${name} לא יכול/ה עכשיו` : "הזמן עבר"}</h2>
          <p className="dl-sh-m">{mine.phase === "declined" ? "אולי באמצע משהו. אפשר לנסות שוב מאוחר יותר." : `אולי ${name} לא ראה/תה. אפשר לשלוח שוב.`}</p>
          <div className="dl-row">
            <button type="button" className="dl-btn ghost" onClick={() => { onAgain?.(); onClose?.(); }}>סגירה</button>
            <button type="button" className="dl-btn dark" onClick={onAgain} data-autofocus>{mine.phase === "declined" ? "לבחור נושא אחר" : "לשלוח שוב"}</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
