'use client';
/* Duels: one friend in the list (tap → challenge sheet; online rows carry an
   "אתגר" pill), the "⋯" menu (remove / block / report, each with a confirm
   step), and the small shared bits: the avatar with its online dot, "seen ago",
   the two-tone tug pill that shows "mine | theirs" (mine on the right, in my
   colour; theirs in the friend's colour — rose when we share a colour). */
import { useState } from "react";
import { Avatar } from "@/account/ui";
import { Sheet, radioKeys } from "./Sheet";

export const GRADE_NAME = { 7: "כיתה ז׳", 8: "כיתה ח׳", 9: "כיתה ט׳" };
export const GRADE_SHORT = { 7: "ז׳", 8: "ח׳", 9: "ט׳" };
/* "ל" + a Latin username needs a hyphen: "ל-noa"; Hebrew names glue: "לנועה" */
export const toName = (n) => (/^[A-Za-z0-9]/.test(String(n || "")) ? "ל-" : "ל") + n;

/** the opponent's colour token: their own, or rose when it would be the same as mine */
export function oppColor(me, other) {
  const mine = (me && me.avatar) || "teal", theirs = (other && other.avatar) || "teal";
  return theirs === mine ? "rose" : theirs;
}

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
/** the separator for meta lines: the dot stays glued to the NEXT item, so a wrapped line never ends with a dangling "·" */
export const SEP = " ·\u00a0";
/** "פעיל/ה עכשיו · ח׳ · רמה 6" — only the parts we know */
export function metaLine(f) {
  return [seenAgo(f), GRADE_SHORT[f.grade], f.level ? `רמה ${f.level}` : null].filter(Boolean).join(SEP);
}
/** the head-to-head in words (for labels) */
export function h2hWords(f) {
  const w = Number(f.wins) || 0, l = Number(f.losses) || 0;
  return w + l ? `המאזן ${w}–${l}` : "עוד לא שיחקתם";
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

/** The tug pill: [ mine | theirs ], mine on the RIGHT (RTL), each half in its owner's colour.
    The split follows the numbers (never thinner than 32%) — the same idea as the arena's tug-of-war bar. */
export function Tug({ mine, theirs, me, other, label, size, caption }) {
  const a = Number(mine) || 0, b = Number(theirs) || 0;
  const p = a + b ? Math.max(32, Math.min(68, Math.round((a / (a + b)) * 100))) : 50;
  return (
    <span className={"dl-tug-w" + (size ? " " + size : "")}>
      <span className="dl-tug" role="img" aria-label={label} data-topic={oppColor(me, other)} style={{ "--p": p + "%" }}>
        <b className="dl-tug-me" aria-hidden="true">{a}</b><b className="dl-tug-op" aria-hidden="true">{b}</b>
      </span>
      {caption && <small aria-hidden="true">{caption}</small>}
    </span>
  );
}

/** head-to-head for a friend row / the sheet */
export function H2H({ friend, me, compact }) {
  const w = Number(friend.wins) || 0, l = Number(friend.losses) || 0;
  if (!w && !l) return <span className="dl-h2h-none">עוד לא שיחקתם</span>;
  return <Tug mine={w} theirs={l} me={me} other={friend} size={compact ? "sm" : ""} caption="המאזן"
    label={`המאזן ביניכם: ${w} ניצחונות לך, ${l} ${toName(friend.username)}`} />;
}

const MI = {
  more: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2.1" /><circle cx="12" cy="12" r="2.1" /><circle cx="19" cy="12" r="2.1" /></svg>,
  swords: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" /><path d="M9.5 6.5L21 3v3l-8.5 8.5" /><path d="M5 14l-2 2 4 4 2-2" /></svg>,
};

export function FriendRow({ friend, me, onChallenge, onRemove, onBlock, onReport, busy }) {
  const [menu, setMenu] = useState(false);
  return (
    <li className={"dl-fr" + (friend.online ? " online" : "")}>
      <button type="button" className="dl-fr-main" onClick={() => onChallenge(friend)} disabled={busy}
        aria-label={`לאתגר את ${friend.username} · ${seenAgo(friend)} · ${h2hWords(friend)}`}>
        <FriendAvatar friend={friend} />
        <span className="dl-fr-t">
          <b dir="auto">{friend.username}</b>
          <small>{metaLine(friend)}</small>
          <H2H friend={friend} me={me} compact />
        </span>
        {friend.online && <span className="dl-fr-go" aria-hidden="true">{MI.swords}<span>אתגר</span></span>}
      </button>
      <button type="button" className="dl-more" aria-label={`עוד פעולות עבור ${friend.username}`} aria-haspopup="dialog" onClick={() => setMenu(true)}>{MI.more}</button>
      <FriendMenu open={menu} onClose={() => setMenu(false)} friend={friend} onRemove={onRemove} onBlock={onBlock} onReport={onReport} />
    </li>
  );
}

export const REPORT_REASONS = [
  { id: "name", label: "שם משתמש לא מתאים" },
  { id: "spam", label: "מציק/ה או שולח/ת יותר מדי" },
  { id: "other", label: "משהו אחר" },
];

/* ⋯ → remove / block / report; every one asks once before it happens.
   pending: 'incoming' (their request to me: decline) | 'outgoing' (my request: cancel) | falsy (a friend: remove) */
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
  const first = pending === "incoming"
    ? { item: "דחיית הבקשה", sub: "הבקשה תימחק בשקט", title: `לדחות את הבקשה של ${name}?`, text: "", yes: "כן, לדחות" }
    : pending ? { item: "ביטול הבקשה", sub: "הבקשה תימחק", title: `לבטל את הבקשה ${toName(name)}?`, text: "", yes: "כן, לבטל" }
    : { item: "הסרה מהחברים", sub: "אפשר להוסיף שוב עם הקוד", title: `להסיר את ${name} מהחברים?`, text: "המאזן ביניכם נשמר; אפשר להתחבר שוב עם הקוד.", yes: "כן, להסיר" };
  return (
    <Sheet open={open} onClose={close} label={`פעולות עבור ${name}`} className="dl-menu">
      <div className="dl-menu-h"><Avatar account={friend} size={44} /><div><b dir="auto">{name}</b><small>{pending ? "בקשת חברות" : seenAgo(friend)}</small></div></div>
      {step === null && (
        <ul className="dl-menu-list">
          <li><button type="button" data-autofocus onClick={() => setStep("remove")}><span>{first.item}</span><small>{first.sub}</small></button></li>
          <li><button type="button" onClick={() => setStep("block")}><span>חסימה</span><small>לא יראו אותך ולא יוכלו לשלוח לך כלום</small></button></li>
          <li><button type="button" className="warn" onClick={() => setStep("report")}><span>דיווח לצוות</span><small>בלי שידעו</small></button></li>
        </ul>
      )}
      {step === "remove" && (
        <Confirm title={first.title} text={first.text} yes={first.yes} busy={busy} err={err} onBack={() => setStep(null)} onYes={() => run(() => onRemove(friend))} />
      )}
      {step === "block" && (
        <Confirm title={`לחסום את ${name}?`} text="החסימה שקטה: החברות נמחקת, ואי אפשר לשלוח לך בקשות או אתגרים. אפשר לבטל חסימה מהרשימה בדף."
          yes="כן, לחסום" busy={busy} err={err} onBack={() => setStep(null)} onYes={() => run(() => onBlock(friend))} />
      )}
      {step === "report" && (
        <div className="dl-confirm">
          <h3>מה קרה?</h3>
          <div className="dl-reasons" role="radiogroup" aria-label="סיבת הדיווח">
            {REPORT_REASONS.map((r, i) => (
              <button key={r.id} type="button" role="radio" data-id={r.id} aria-checked={reason === r.id} tabIndex={reason ? (reason === r.id ? 0 : -1) : (i === 0 ? 0 : -1)}
                className={reason === r.id ? "on" : ""} onClick={() => setReason(r.id)}
                onKeyDown={(e) => radioKeys(e, REPORT_REASONS.map((x) => x.id), r.id, setReason)}>{r.label}</button>
            ))}
          </div>
          <p className="dl-sh-m">הדיווח מגיע לצוות האתר בלבד, בלי ש{name} ידע/תדע.</p>
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
