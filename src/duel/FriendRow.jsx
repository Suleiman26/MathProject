'use client';
/* Duels: one friend in the list (tap → challenge sheet), the "⋯" menu
   (remove / block / report, each with a confirm step), and the small shared
   bits: the avatar with its online dot, "seen ago", the head-to-head score. */
import { useState } from "react";
import { Avatar } from "@/account/ui";
import { Sheet } from "./Sheet";

export const GRADE_NAME = { 7: "כיתה ז׳", 8: "כיתה ח׳", 9: "כיתה ט׳" };
const GRADE_SHORT = { 7: "ז׳", 8: "ח׳", 9: "ט׳" };

export function seenAgo(f) {
  if (f.online) return "פעיל/ה עכשיו";
  const s = Number(f.seen_ago_s);
  if (!Number.isFinite(s)) return "עוד לא ביקר/ה";
  if (s < 90) return "לפני רגע";
  if (s < 3600) return `לפני ${Math.round(s / 60)} דק׳`;
  if (s < 86400) return `לפני ${Math.round(s / 3600)} שע׳`;
  const d = Math.round(s / 86400);
  return d === 1 ? "אתמול" : d < 30 ? `לפני ${d} ימים` : "מזמן";
}

/** avatar + online dot */
export function FriendAvatar({ friend, size = 46 }) {
  return (
    <span className={"dl-av" + (friend.online ? " on" : "")}>
      <Avatar account={friend} size={size} />
      <i className="dl-dot" aria-hidden="true" />
    </span>
  );
}

/** "4 – 3" (mine first, reading right to left) with a tiny label */
export function H2H({ wins, losses, name, compact }) {
  const w = Number(wins) || 0, l = Number(losses) || 0;
  const played = w + l > 0;
  return (
    <span className={"dl-h2h" + (compact ? " sm" : "") + (!played ? " none" : w > l ? " up" : l > w ? " down" : "")}
      aria-label={played ? `המאזן ביניכם: ${w} ניצחונות לך, ${l} ל${name}` : "עוד לא שיחקתם"}>
      {played ? <><b><span>{w}</span><em>–</em><span>{l}</span></b><small>המאזן</small></> : <small>עוד לא שיחקתם</small>}
    </span>
  );
}

const MI = {
  more: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2.1" /><circle cx="12" cy="12" r="2.1" /><circle cx="19" cy="12" r="2.1" /></svg>,
  swords: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" /><path d="M9.5 6.5L21 3v3l-8.5 8.5" /><path d="M5 14l-2 2 4 4 2-2" /></svg>,
};

export function FriendRow({ friend, onChallenge, onRemove, onBlock, onReport, busy }) {
  const [menu, setMenu] = useState(false);
  return (
    <li className={"dl-fr" + (friend.online ? " online" : "")}>
      <button type="button" className="dl-fr-main" onClick={() => onChallenge(friend)} disabled={busy}
        aria-label={`לאתגר את ${friend.username} · ${seenAgo(friend)}`}>
        <FriendAvatar friend={friend} />
        <span className="dl-fr-t">
          <b dir="auto">{friend.username}</b>
          <small>{seenAgo(friend)}{friend.grade ? <> · {GRADE_SHORT[friend.grade]}</> : null}{friend.level ? <> · רמה {friend.level}</> : null}</small>
        </span>
        <H2H wins={friend.wins} losses={friend.losses} name={friend.username} />
        <span className="dl-fr-go" aria-hidden="true">{MI.swords}</span>
      </button>
      <button type="button" className="dl-more" aria-label={`עוד פעולות עבור ${friend.username}`} aria-haspopup="dialog" onClick={() => setMenu(true)}>{MI.more}</button>
      <FriendMenu open={menu} onClose={() => setMenu(false)} friend={friend} onRemove={onRemove} onBlock={onBlock} onReport={onReport} />
    </li>
  );
}

const toName = (n) => (/^[A-Za-z0-9]/.test(String(n || "")) ? "ל-" : "ל") + n;
export const REPORT_REASONS = [
  { id: "name", label: "שם משתמש לא מתאים" },
  { id: "spam", label: "מציק/ה או שולח/ת יותר מדי" },
  { id: "other", label: "משהו אחר" },
];

/* ⋯ → remove / block / report; every one asks once before it happens */
export function FriendMenu({ open, onClose, friend, onRemove, onBlock, onReport, pending }) {
  const [step, setStep] = useState(null);   // null | 'remove' | 'block' | 'report' | 'done'
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const close = () => { onClose(); setTimeout(() => { setStep(null); setReason(""); setErr(""); }, 250); };
  async function run(fn) {
    setBusy(true); setErr("");
    const r = await fn();
    setBusy(false);
    if (r && r.error) { setErr(r.message || "לא הצלחנו. נסו שוב"); return; }
    setStep("done");
    setTimeout(close, 900);
  }
  const name = friend.username;
  return (
    <Sheet open={open} onClose={close} label={`פעולות עבור ${name}`} className="dl-menu">
      <div className="dl-menu-h"><Avatar account={friend} size={44} /><div><b dir="auto">{name}</b><small>{pending ? "בקשת חברות" : seenAgo(friend)}</small></div></div>
      {step === null && (
        <ul className="dl-menu-list">
          <li><button type="button" data-autofocus onClick={() => setStep("remove")}><span>{pending ? "ביטול הבקשה" : "הסרה מהחברים"}</span><small>{pending ? "הבקשה תימחק" : "אפשר להוסיף שוב עם הקוד"}</small></button></li>
          <li><button type="button" onClick={() => setStep("block")}><span>חסימה</span><small>לא יראה/תראה אותך יותר ולא יוכל/תוכל לשלוח כלום</small></button></li>
          <li><button type="button" className="warn" onClick={() => setStep("report")}><span>דיווח לצוות</span><small>בלי שמו/ה ידע/תדע</small></button></li>
        </ul>
      )}
      {step === "remove" && (
        <Confirm title={pending ? `לבטל את הבקשה ${toName(name)}?` : `להסיר את ${name} מהחברים?`} text={pending ? "" : "המאזן ביניכם נשמר; אפשר להתחבר שוב עם הקוד."}
          yes={pending ? "כן, לבטל" : "כן, להסיר"} busy={busy} err={err} onBack={() => setStep(null)} onYes={() => run(() => onRemove(friend))} />
      )}
      {step === "block" && (
        <Confirm title={`לחסום את ${name}?`} text="החסימה שקטה: החברות נמחקת, ואי אפשר לשלוח לך בקשות או אתגרים. אפשר לבטל חסימה מהרשימה למטה בדף."
          yes="כן, לחסום" busy={busy} err={err} onBack={() => setStep(null)} onYes={() => run(() => onBlock(friend))} />
      )}
      {step === "report" && (
        <div className="dl-confirm">
          <h3>מה קרה?</h3>
          <div className="dl-reasons" role="radiogroup" aria-label="סיבת הדיווח">
            {REPORT_REASONS.map((r) => (
              <button key={r.id} type="button" role="radio" aria-checked={reason === r.id} className={reason === r.id ? "on" : ""} onClick={() => setReason(r.id)}>{r.label}</button>
            ))}
          </div>
          <p className="dl-sh-m">הדיווח מגיע לצוות האתר בלבד. {name} לא ידע/תדע.</p>
          {err && <p className="dl-err" role="alert">{err}</p>}
          <div className="dl-row">
            <button type="button" className="dl-btn ghost" onClick={() => setStep(null)} disabled={busy}>חזרה</button>
            <button type="button" className="dl-btn warn" disabled={!reason || busy} onClick={() => run(() => onReport(friend, reason))}>{busy ? "שולחים…" : "שליחת הדיווח"}</button>
          </div>
        </div>
      )}
      {step === "done" && <p className="dl-done" role="status">בוצע</p>}
    </Sheet>
  );
}

function Confirm({ title, text, yes, busy, err, onBack, onYes }) {
  return (
    <div className="dl-confirm">
      <h3>{title}</h3>
      {text && <p className="dl-sh-m">{text}</p>}
      {err && <p className="dl-err" role="alert">{err}</p>}
      <div className="dl-row">
        <button type="button" className="dl-btn ghost" onClick={onBack} disabled={busy} data-autofocus>חזרה</button>
        <button type="button" className="dl-btn dark" onClick={onYes} disabled={busy}>{busy ? "רגע…" : yes}</button>
      </div>
    </div>
  );
}
