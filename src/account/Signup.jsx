'use client';
/* Sign-up: username, password twice, grade (optional), consent. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { accountApi, nameProblem, NAME_PROBLEM, PASS_PROBLEM, passChecks, useAccount } from "@/lib/account";
import { mpData } from "@/lib/mp-data";
import { AcctShell, PasswordInput, Spinner } from "./ui";

const GRADES = [["7", "ז׳"], ["8", "ח׳"], ["9", "ט׳"]];

export default function Signup() {
  const router = useRouter();
  const { ready, account } = useAccount();
  const [f, setF] = useState({ username: "", password: "", password2: "", grade: "", accept: false, parentOk: false });
  const [nameState, setNameState] = useState(null); // null | 'checking' | 'free' | 'taken' | problem key
  const [touched, setTouched] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const justSigned = useRef(false);

  // already signed in → profile (but right after signing up, the submit handler decides where to go)
  useEffect(() => { if (ready && account && !justSigned.current) router.replace("/profile"); }, [ready, account, router]);

  // live username check (format here, availability on the server)
  useEffect(() => {
    clearTimeout(timer.current);
    const u = f.username.trim();
    if (!u) { setNameState(null); return; }
    const prob = nameProblem(u);
    if (prob) { setNameState(prob); return; }
    if (!mpData.ready) { setNameState(null); return; }
    setNameState("checking");
    timer.current = setTimeout(() => {
      accountApi.nameFree(u).then((r) => setNameState(r.free ? "free" : r.problem || "taken")).catch(() => setNameState(null));
    }, 380);
    return () => clearTimeout(timer.current);
  }, [f.username]);

  const checks = passChecks(f.password);
  const passOk = checks.every((c) => c.ok) && f.password.length <= 72;
  const matchOk = f.password2.length > 0 && f.password === f.password2;
  const nameOk = nameState === "free";
  const canSubmit = nameOk && passOk && matchOk && f.accept && f.parentOk && !busy;
  const set = (k) => (e) => { const v = e.target.type === "checkbox" ? e.target.checked : e.target.value; setF((p) => ({ ...p, [k]: v })); setErr(""); };
  const touch = (k) => () => setTouched({ ...touched, [k]: true });

  async function submit(e) {
    e.preventDefault();
    setTouched({ username: true, password: true, password2: true, consent: true });
    if (!canSubmit) return;
    setBusy(true);
    justSigned.current = true;
    try {
      const r = await accountApi.signup(f);
      if (r && r.token) { router.replace("/profile?welcome=1"); return; }
      const map = {
        taken: "שם המשתמש הזה כבר תפוס. נסו שם אחר.",
        consent: "צריך לסמן את שתי תיבות האישור.",
        terms_changed: "התנאים עודכנו. רעננו את הדף ונסו שוב.",
        username: "שם המשתמש: " + (NAME_PROBLEM[r && r.problem] || "לא תקין"),
        password: "הסיסמה: " + (PASS_PROBLEM[r && r.problem] || "לא תקינה"),
      };
      justSigned.current = false;
      setErr(map[r && r.error] || "משהו השתבש. נסו שוב.");
      if (r && r.error === "taken") setNameState("taken");
    } catch (ex) {
      justSigned.current = false;
      setErr(ex.message === "not-connected" ? "ההרשמה עוד לא פעילה באתר הזה." : "אין חיבור כרגע. בדקו את האינטרנט ונסו שוב.");
    } finally { setBusy(false); }
  }

  const nameMsg = nameState === "checking" ? { t: "בודקים…", k: "wait" }
    : nameState === "free" ? { t: "השם פנוי ✓", k: "ok" }
    : nameState === "taken" ? { t: "השם תפוס. נסו שם אחר", k: "bad" }
    : nameState && NAME_PROBLEM[nameState] ? { t: NAME_PROBLEM[nameState], k: touched.username || f.username.length > 2 ? "bad" : "hint" }
    : { t: "אפשר בעברית או באנגלית. עדיף לא שם מלא אמיתי.", k: "hint" };

  return (
    <AcctShell>
      <section className="acct-card" aria-labelledby="su-h">
        <div className="acct-head">
          <h1 id="su-h">פתיחת חשבון</h1>
          <p>החשבון שומר את ההתקדמות שלך בכל הנושאים. בלי מייל ובלי טלפון.</p>
        </div>

        <form className="acct-form" onSubmit={submit} noValidate>
          <div className="acct-field">
            <label htmlFor="su-user">שם משתמש</label>
            <span className={"acct-in" + (nameMsg.k === "bad" ? " bad" : nameMsg.k === "ok" ? " ok" : "")}>
              <input id="su-user" value={f.username} onChange={set("username")} onBlur={touch("username")} autoComplete="username"
                autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={20} aria-describedby="su-user-m" aria-invalid={nameMsg.k === "bad" || undefined} />
              {nameState === "checking" && <Spinner />}
            </span>
            <small id="su-user-m" className={"acct-msg " + nameMsg.k} aria-live="polite">{nameMsg.t}</small>
          </div>

          <div className="acct-field">
            <label htmlFor="su-pw">סיסמה</label>
            <PasswordInput id="su-pw" value={f.password} onChange={set("password")} autoComplete="new-password" describedBy="su-pw-m"
              invalid={touched.password && !passOk} />
            <ul id="su-pw-m" className="acct-checks" aria-label="דרישות הסיסמה">
              {checks.map((c) => <li key={c.label} className={c.ok ? "ok" : ""}><i aria-hidden="true" />{c.label}</li>)}
            </ul>
          </div>

          <div className="acct-field">
            <label htmlFor="su-pw2">הסיסמה שוב</label>
            <PasswordInput id="su-pw2" value={f.password2} onChange={set("password2")} autoComplete="new-password" describedBy="su-pw2-m"
              invalid={(touched.password2 || f.password2.length >= f.password.length) && f.password2.length > 0 && !matchOk} />
            <small id="su-pw2-m" className={"acct-msg " + (!f.password2 ? "hint" : matchOk ? "ok" : f.password2.length >= f.password.length || touched.password2 ? "bad" : "hint")} aria-live="polite">
              {!f.password2 ? "הקלידו את אותה סיסמה פעם נוספת" : matchOk ? "הסיסמאות זהות ✓" : f.password2.length >= f.password.length || touched.password2 ? "הסיסמאות לא זהות" : "ממשיכים להקליד…"}
            </small>
          </div>

          <fieldset className="acct-field">
            <legend>כיתה <span className="opt">(לא חובה)</span></legend>
            <div className="acct-seg" role="radiogroup" aria-label="כיתה">
              {GRADES.map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={f.grade === v} className={f.grade === v ? "on" : ""}
                  onClick={() => setF((p) => ({ ...p, grade: p.grade === v ? "" : v }))}>כיתה {l}</button>
              ))}
            </div>
          </fieldset>

          <div className={"acct-consent" + (touched.consent && !(f.accept && f.parentOk) ? " bad" : "")}>
            <label className="acct-check">
              <input type="checkbox" checked={f.accept} onChange={set("accept")} />
              <span className="box" aria-hidden="true" />
              <span>קראתי ואני מסכים/ה ל<Link href="/terms" target="_blank">תנאי השימוש</Link> ול<Link href="/privacy" target="_blank">מדיניות הפרטיות</Link>.</span>
            </label>
            <label className="acct-check">
              <input type="checkbox" checked={f.parentOk} onChange={set("parentOk")} />
              <span className="box" aria-hidden="true" />
              <span>אם אני מתחת לגיל 18, הורה או אפוטרופוס אישר לי לפתוח חשבון.</span>
            </label>
          </div>

          {err && <div className="acct-alert" role="alert">{err}</div>}

          <button type="submit" className="acct-cta" disabled={busy} aria-disabled={!canSubmit}>
            {busy ? <><Spinner />יוצרים את החשבון…</> : "פתיחת חשבון"}
          </button>
          <p className="acct-alt">כבר יש לך חשבון? <Link href="/login">התחברות</Link></p>
        </form>
      </section>
    </AcctShell>
  );
}
