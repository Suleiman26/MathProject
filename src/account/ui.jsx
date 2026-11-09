'use client';
/* Shared pieces for the account pages: avatar, the account button in the
   top bars, the page frame, password field. Styles: src/styles/account.css */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAccount, accountApi } from "@/lib/account";
import { useDuelOpen } from "@/duel/gate-hook";
import { DuelMark } from "@/duel/DuelMark";

export function Avatar({ account, size = 40 }) {
  const letter = account ? [...(account.username || "?")][0].toUpperCase() : "";
  return (
    <span className="acct-av" data-topic={account ? account.avatar : "teal"} style={{ "--s": size + "px" }} aria-hidden="true">
      {account ? letter : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c1.3-3.3 4-5 7-5s5.7 1.7 7 5" /></svg>}
    </span>
  );
}

/** Small button for the top bars: "sign in" when signed out, avatar + name when signed in. */
export function AccountButton({ compact }) {
  const { ready, account } = useAccount();
  if (!ready) return <span className="acct-btn ghost" aria-hidden="true" />;
  if (!account) {
    return (
      <Link className="acct-btn" href="/login">
        <Avatar account={null} size={26} /><span>{compact ? "כניסה" : "התחברות"}</span>
      </Link>
    );
  }
  return <AccountMenu account={account} />;
}

/* Signed in: the avatar opens a small menu (profile, duels when open for me, settings, sign out).
   Same menu on the home page and on every topic page. */
const GRADE_NAME = { 7: "כיתה ז׳", 8: "כיתה ח׳", 9: "כיתה ט׳" };
const MI = {
  me: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>,
  set: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>,
  out: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></svg>,
  chev: <svg className="acct-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>,
};
export function AccountMenu({ account, trigger = "avatar" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const router = useRouter();
  const path = usePathname();
  // "דו-קרב" only when duels are open for me (switch on, or test + tester): src/duel/gate.js
  const duels = useDuelOpen(account.id) === true;
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [open]);
  async function out() {
    setBusy(true);
    try { await accountApi.logout(); } finally { setBusy(false); setOpen(false); }
    if (path !== "/") router.push("/");
  }
  return (
    <div className={"acct-menu" + (open ? " open" : "")} ref={box}>
      {trigger === "icon" ? (
        <button type="button" className="acct-ibtn" aria-haspopup="menu" aria-expanded={open} aria-label="התפריט שלי" onClick={() => setOpen(!open)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 8h14M5 16h9" /></svg>
        </button>
      ) : (
        <button type="button" className="acct-btn in" aria-haspopup="menu" aria-expanded={open} aria-label={"החשבון של " + account.username} onClick={() => setOpen(!open)}>
          <Avatar account={account} size={26} /><span className="nm">{account.username}</span>{MI.chev}
        </button>
      )}
      <div className="acct-pop" role="menu" aria-label="החשבון שלי" inert={!open}>
        <div className="acct-pop-h">
          <Avatar account={account} size={44} />
          <span><b dir="auto">{account.username}</b><small>{GRADE_NAME[account.grade] || "בלי כיתה"}</small></span>
        </div>
        <Link role="menuitem" href="/profile" onClick={() => setOpen(false)}><i>{MI.me}</i><span>הפרופיל וההתקדמות שלי</span></Link>
        {duels && <Link role="menuitem" href="/duel" className="acct-duel" aria-current={path === "/duel" ? "page" : undefined} onClick={() => setOpen(false)}><i data-topic={account.avatar}><DuelMark /></i><span>דו-קרב</span></Link>}
        <Link role="menuitem" href="/profile#settings" onClick={() => setOpen(false)}><i>{MI.set}</i><span>הגדרות: כיתה, צבע, סיסמה</span></Link>
        <button type="button" role="menuitem" className="out" disabled={busy} onClick={out}><i>{MI.out}</i><span>{busy ? "יוצאים…" : "יציאה מהחשבון"}</span></button>
      </div>
    </div>
  );
}

/** Frame for sign-in / sign-up / legal pages */
export function AcctShell({ children, wide, split, back = "/" }) {
  return (
    <div className={"acct" + (wide ? " wide" : "") + (split ? " split" : "")}>
      <header className="acct-top">
        <Link className="acct-home" href={back}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          <span>{back === "/" ? "לכל הנושאים" : "חזרה"}</span>
        </Link>
        <Link className="acct-brand" href="/"><img src="/brand/logo-loop.png" alt="" width={28} height={28} /><span>מתמטיקה חט״ב</span></Link>
      </header>
      <main className="acct-main">{children}</main>
      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="acct-foot">
      <Link href="/terms">תנאי שימוש</Link><i />
      <Link href="/privacy">מדיניות פרטיות</Link><i />
      <Link href="/accessibility">הצהרת נגישות</Link><i />
      <Link href="/contact">יצירת קשר</Link>
      <Link className="acct-foot-staff" href="/admin">כניסת צוות</Link>
    </footer>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete, invalid, describedBy, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <span className={"acct-pw" + (invalid ? " bad" : "")}>
      <input id={id} type={show ? "text" : "password"} dir="ltr" value={value} onChange={onChange} autoComplete={autoComplete}
        autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={invalid || undefined} aria-describedby={describedBy} placeholder={placeholder} />
      <button type="button" className="acct-eye" onClick={() => setShow(!show)} aria-label={show ? "הסתרת הסיסמה" : "הצגת הסיסמה"} aria-pressed={show}>
        {show
          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l18 18" /><path d="M10.6 6.2A9.6 9.6 0 0112 6c5 0 8.5 4.4 9.5 6-.4.7-1.3 1.9-2.6 3.1M6.4 7.6C4.6 8.9 3.2 10.6 2.5 12c1 1.6 4.5 6 9.5 6 1.6 0 3-.4 4.3-1.1" /><path d="M9.9 10a3 3 0 004.1 4.1" /></svg>
          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2.5 12c1-1.6 4.5-6 9.5-6s8.5 4.4 9.5 6c-1 1.6-4.5 6-9.5 6s-8.5-4.4-9.5-6z" /><circle cx="12" cy="12" r="3" /></svg>}
      </button>
    </span>
  );
}

export function Spinner() { return <span className="acct-spin" aria-hidden="true" />; }
