'use client';
/* Contact form: saved to the database, read in the admin (Settings). */
import { useState } from "react";
import Link from "next/link";
import { accountApi, useAccount } from "@/lib/account";
import { AcctShell, Spinner } from "@/account/ui";

export default function Contact() {
  const { account } = useAccount();
  const [f, setF] = useState({ name: "", replyTo: "", body: "" });
  const [state, setState] = useState(null); // null | busy | sent | error text
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (typeof state === "string" && state !== "busy") setState(null); };

  async function send(e) {
    e.preventDefault();
    if (f.body.trim().length < 2) { setState("כתבו את ההודעה."); return; }
    setState("busy");
    try {
      const name = f.name || (account ? "משתמש/ת: " + account.username : "");
      const r = await accountApi.contact({ name, replyTo: f.replyTo, body: f.body });
      if (r && r.ok) setState("sent");
      else setState(r && r.error === "limit" ? "שלחת כבר כמה הודעות היום. נסו שוב מחר." : "לא נשלח. נסו שוב.");
    } catch { setState("אין חיבור כרגע. נסו שוב."); }
  }

  return (
    <AcctShell>
      <section className="acct-card" aria-labelledby="ct-h">
        <div className="acct-head">
          <h1 id="ct-h">יצירת קשר</h1>
          <p>שאלה, טעות בתרגיל, בעיית נגישות, שכחת סיסמה או בקשה בנושא פרטיות. נקרא כל הודעה.</p>
        </div>
        {state === "sent" ? (
          <div className="acct-sent" role="status">
            <span aria-hidden="true">✓</span>
            <b>ההודעה נשלחה. תודה!</b>
            <p>{f.replyTo ? "נחזור אליך בדרך שהשארת." : "לא השארת דרך לחזור אליך, אז אם צריך תשובה, כתבו שוב עם פרטים."}</p>
            <Link className="acct-cta sm" href="/">לכל הנושאים</Link>
          </div>
        ) : (
          <form className="acct-form" onSubmit={send} noValidate>
            <div className="acct-field">
              <label htmlFor="ct-name">שם <span className="opt">(לא חובה)</span></label>
              <span className="acct-in"><input id="ct-name" value={f.name} onChange={set("name")} maxLength={60} autoComplete="name" /></span>
            </div>
            <div className="acct-field">
              <label htmlFor="ct-reply">איך לחזור אליך? <span className="opt">(לא חובה)</span></label>
              <span className="acct-in"><input id="ct-reply" value={f.replyTo} onChange={set("replyTo")} maxLength={120} placeholder="למשל מייל של הורה" /></span>
              <small className="acct-msg hint">תלמידים: עדיף פרטים של הורה ולא שלכם.</small>
            </div>
            <div className="acct-field">
              <label htmlFor="ct-body">ההודעה</label>
              <textarea id="ct-body" className="acct-ta" rows={6} value={f.body} onChange={set("body")} maxLength={2000} />
              <small className="acct-msg hint">{f.body.length}/2000</small>
            </div>
            {typeof state === "string" && state !== "busy" && <div className="acct-alert" role="alert">{state}</div>}
            <button type="submit" className="acct-cta" disabled={state === "busy"}>{state === "busy" ? <><Spinner />שולחים…</> : "שליחה"}</button>
          </form>
        )}
      </section>
    </AcctShell>
  );
}
