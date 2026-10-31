'use client';
/* Shared pieces for the account pages: avatar, the account button in the
   top bars, the page frame, password field. Styles: src/styles/account.css */
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "@/lib/account";

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
  return (
    <Link className="acct-btn in" href="/profile" aria-label={"הפרופיל של " + account.username}>
      <Avatar account={account} size={26} /><span className="nm">{account.username}</span>
    </Link>
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
        <Link className="acct-brand" href="/"><img src="/icon.png" alt="" width={28} height={28} /><span>מתמטיקה חט״ב</span></Link>
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
