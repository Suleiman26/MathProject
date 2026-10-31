'use client';
/* Sign-in. If the terms changed since the student agreed, they confirm again here. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { accountApi, useAccount } from "@/lib/account";
import { AcctShell, PasswordInput, Spinner } from "./ui";

export default function Login() {
  const router = useRouter();
  const { ready, account } = useAccount();
  const [f, setF] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState({ accept: false, parentOk: false });
  const needsTerms = !!(account && account.needs_terms);

  useEffect(() => { if (ready && account && !account.needs_terms) router.replace("/profile"); }, [ready, account, router]);

  async function submit(e) {
    e.preventDefault();
    if (!f.username.trim() || !f.password) { setErr("הקלידו שם משתמש וסיסמה."); return; }
    setBusy(true); setErr("");
    try {
      const r = await accountApi.login(f);
      if (r && r.token) return; // the effect above moves on (or the terms step shows)
      if (r && r.error === "locked") {
        const min = Math.max(1, Math.ceil((new Date(r.retry_at) - Date.now()) / 60000));
        setErr(`יותר מדי ניסיונות. החשבון נעול לכמה דקות. נסו שוב בעוד ${min} דק׳.`);
      } else setErr("שם המשתמש או הסיסמה לא נכונים." + (r && r.left != null && r.left <= 2 ? ` נשארו ${r.left} ניסיונות.` : ""));
      setF({ ...f, password: "" });
    } catch (ex) {
      setErr(ex.message === "not-connected" ? "ההתחברות עוד לא פעילה באתר הזה." : "אין חיבור כרגע. בדקו את האינטרנט ונסו שוב.");
    } finally { setBusy(false); }
  }

  async function agree(e) {
    e.preventDefault();
    if (!terms.accept || !terms.parentOk) { setErr("צריך לסמן את שתי התיבות כדי להמשיך."); return; }
    setBusy(true);
    try { const a = await accountApi.acceptTerms(); if (!a || !a.id) setErr("לא נשמר. נסו שוב."); }
    catch { setErr("אין חיבור כרגע. נסו שוב."); }
    finally { setBusy(false); }
  }

  if (needsTerms) {
    return (
      <AcctShell>
        <section className="acct-card" aria-labelledby="tr-h">
          <div className="acct-head">
            <h1 id="tr-h">עדכנו את התנאים</h1>
            <p>שלום <bdi>{account.username}</bdi>! מאז הכניסה האחרונה שלך עדכנו את תנאי השימוש או את מדיניות הפרטיות. כדי להמשיך, אשרו אותם שוב.</p>
          </div>
          <form className="acct-form" onSubmit={agree}>
            <div className="acct-consent">
              <label className="acct-check"><input type="checkbox" checked={terms.accept} onChange={(e) => setTerms({ ...terms, accept: e.target.checked })} /><span className="box" aria-hidden="true" />
                <span>קראתי ואני מסכים/ה ל<Link href="/terms" target="_blank">תנאי השימוש</Link> ול<Link href="/privacy" target="_blank">מדיניות הפרטיות</Link> המעודכנים.</span></label>
              <label className="acct-check"><input type="checkbox" checked={terms.parentOk} onChange={(e) => setTerms({ ...terms, parentOk: e.target.checked })} /><span className="box" aria-hidden="true" />
                <span>אם אני מתחת לגיל 18, הורה או אפוטרופוס אישר זאת.</span></label>
            </div>
            {err && <div className="acct-alert" role="alert">{err}</div>}
            <button type="submit" className="acct-cta" disabled={busy}>{busy ? <><Spinner />שומרים…</> : "אישור והמשך"}</button>
            <p className="acct-alt"><button type="button" className="acct-link" onClick={() => accountApi.logout()}>יציאה מהחשבון</button></p>
          </form>
        </section>
      </AcctShell>
    );
  }

  return (
    <AcctShell>
      <section className="acct-card" aria-labelledby="li-h">
        <div className="acct-head">
          <h1 id="li-h">התחברות</h1>
          <p>ממשיכים מאיפה שעצרת.</p>
        </div>
        <form className="acct-form" onSubmit={submit} noValidate>
          <div className="acct-field">
            <label htmlFor="li-user">שם משתמש</label>
            <span className="acct-in"><input id="li-user" value={f.username} onChange={(e) => { setF({ ...f, username: e.target.value }); setErr(""); }}
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={20} /></span>
          </div>
          <div className="acct-field">
            <label htmlFor="li-pw">סיסמה</label>
            <PasswordInput id="li-pw" value={f.password} onChange={(e) => { setF({ ...f, password: e.target.value }); setErr(""); }} autoComplete="current-password" />
          </div>
          {err && <div className="acct-alert" role="alert">{err}</div>}
          <button type="submit" className="acct-cta" disabled={busy}>{busy ? <><Spinner />מתחברים…</> : "התחברות"}</button>
          <p className="acct-alt">אין לך חשבון? <Link href="/signup">פתיחת חשבון</Link></p>
          <p className="acct-alt small">שכחת את הסיסמה? אין איפוס במייל, כי אנחנו לא שומרים מייל. <Link href="/contact">כתבו לנו</Link> ונעזור.</p>
        </form>
      </section>
    </AcctShell>
  );
}
