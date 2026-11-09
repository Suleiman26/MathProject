'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, DownloadSimple, ShieldCheck, Database, Keyboard, UsersThree, Envelope, CheckCircle, Sword } from "@phosphor-icons/react";
import { useAdmin, PageHead } from "../AdminShell";
import { Card, Seg, Switch, useToast, fmt, GRADE } from "../ui";
import { Avatar } from "@/account/ui";
import { getSetting } from "../api";
import { mpData } from "@/lib/mp-data";
import { PERIODS } from "./Dashboard";

export default function Settings() {
  const a = useAdmin();
  const toast = useToast();
  const [pin, setPin] = useState({ old: "", n1: "", n2: "" });
  const [days, setDays] = useState(a.days);
  const [keypad, setKeypad] = useState(null);
  useEffect(() => { getSetting("keypad", true).then((v) => setKeypad(v !== false)).catch(() => setKeypad(true)); }, []);
  let host = ""; try { host = new URL(mpData.url).host; } catch {}

  async function toggleKeypad(v) {
    const before = keypad;
    setKeypad(v);
    try {
      const r = await a.run("admin_set_setting", { k: "keypad", v });
      if (!r || !r.ok) throw new Error("not saved");
      toast(v ? "המקלדת המתמטית פועלת" : "המקלדת המתמטית כבויה");
    } catch (e) { setKeypad(before); toast("לא נשמר: " + e.message, true); }
  }

  async function changePin() {
    if (!/^[0-9]{4,8}$/.test(pin.n1)) return toast("הקוד החדש צריך 4 עד 8 ספרות", true);
    if (pin.n1 !== pin.n2) return toast("הקודים החדשים לא זהים", true);
    try {
      const r = await a.run("admin_change_pin", { old_pin: pin.old, new_pin: pin.n1 });
      if (r && r.ok) { toast("הקוד הוחלף"); setPin({ old: "", n1: "", n2: "" }); }
      else toast(r && r.error === "wrong" ? "הקוד הנוכחי שגוי" : "לא הצלחנו להחליף", true);
    } catch (e) { toast(e.message, true); }
  }
  async function exportCsv() {
    try {
      const rows = await a.run("admin_export", { days });
      const cols = ["at", "device", "page", "chapter", "step", "kind", "mobile"];
      const csv = "﻿" + cols.join(",") + "\n" + rows.map((r) => cols.map((k) => '"' + String(r[k] ?? "").replace(/"/g, '""') + '"').join(",")).join("\n");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      link.download = `mathproject-answers-${days}d.csv`; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
      toast(fmt(rows.length) + " שורות יוצאו");
    } catch (e) { toast(e.message, true); }
  }

  return (
    <>
      <PageHead />
      <div className="bento" style={{ alignItems: "start" }}>
        <DuelsCard a={a} toast={toast} />
        <AccountsCard a={a} toast={toast} />
        <Card title="מקלדת מתמטית" className="span-6" action={keypad == null ? null : <Switch on={keypad} onChange={toggleKeypad} label="מקלדת מתמטית" />}>
          <div className="stat-line"><span><Keyboard size={16} /> בטלפון ובטאבלט</span><b>{keypad == null ? "…" : keypad ? "פועלת" : "כבויה"}</b></div>
          <p className="note">מקלדת עם מספרים, x, חזקה, שורש ושברים במקום מקלדת הטלפון. כשהיא כבויה, התלמידים מקבלים את מקלדת הטלפון הרגילה. במחשב אין שינוי.{a.preview && " (במצב תצוגה השינוי חל רק על המכשיר הזה. לכל התלמידים – אחרי חיבור המסד.)"}</p>
        </Card>
        <Card title="קוד כניסה" className="span-6" action={<Lock size={18} className="muted" />}>
          {[["old", "הקוד הנוכחי", "current-password"], ["n1", "קוד חדש (4–8 ספרות)", "new-password"], ["n2", "שוב את הקוד החדש", "new-password"]].map(([k, l, ac]) => (
            <label key={k} className="field"><span>{l}</span><input type="password" inputMode="numeric" maxLength={8} autoComplete={ac} value={pin[k]} onChange={(e) => setPin({ ...pin, [k]: e.target.value })} /></label>
          ))}
          <button type="button" className="abtn pri" disabled={a.preview} onClick={changePin}>החלפת קוד</button>
          <p className="note mt-s">אחרי 5 ניסיונות שגויים הכניסה ננעלת ל-15 דקות. החלפת הקוד מנתקת את שאר המכשירים.{a.preview && " (זמין אחרי חיבור המסד)"}</p>
        </Card>
        <Card title="חיבור למסד הנתונים" className="span-6" action={<span className={"status-pill" + (a.preview ? " demo" : "")}><i />{a.preview ? "לא מחובר" : "מחובר"}</span>}>
          {a.preview ? (
            <>
              <p className="note">הניהול רץ עכשיו עם נתוני דוגמה. כדי לחבר את המסד האמיתי (Supabase של הפרויקט):</p>
              <ol className="note steps-ol">
                <li>בחשבון Supabase של הפרויקט: Project Settings ← API.</li>
                <li>מעתיקים את <b>Project URL</b> ואת <b>Publishable key</b> (שניהם ציבוריים, לא סיסמאות).</li>
                <li>שולחים לי אותם, ואני מחבר ומעלה את טבלאות הניהול.</li>
              </ol>
            </>
          ) : (
            <><div className="stat-line"><span><Database size={16} /> שרת</span><b className="ltr">{host}</b></div><p className="note">כל הנתונים נשמרים במסד של הפרויקט. התלמידים יכולים רק לקרוא את סדר התוכן ולשלוח סטטיסטיקה אנונימית של תשובות.</p></>
          )}
        </Card>
        <Card title="ייצוא נתונים" className="span-6" action={<DownloadSimple size={18} className="muted" />}>
          <p className="note">קובץ CSV של כל התשובות בתקופה, לפתיחה באקסל או ב-Google Sheets.</p>
          <div className="toolbar mt-s"><Seg value={days} options={PERIODS} onChange={setDays} label="תקופה" /><button type="button" className="abtn" disabled={a.preview} onClick={exportCsv}><DownloadSimple size={17} />הורדה</button></div>
        </Card>
        <Card title="פרטיות" className="span-6" action={<ShieldCheck size={18} className="muted" />}>
          <p className="note">התלמידים לא נרשמים. כל מכשיר מקבל מספר אקראי, ונשמרים רק: העמוד, הפרק, השלב, אם התשובה נכונה, וסוג המכשיר. לא נשמרים שם, מייל, טלפון או מיקום.</p>
        </Card>
      </div>
    </>
  );
}

/* Student accounts + contact messages + password reset */
function AccountsCard({ a, toast }) {
  const [d, setD] = useState(null);
  const [reset, setReset] = useState({ username: "", pw: "" });
  const load = () => a.run("admin_contact", {}).then(setD).catch(() => setD({ accounts: 0, accounts_7d: 0, messages: [] }));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function done(m) {
    try { await a.run("admin_contact_done", { msg_id: m.id, done: !m.handled }); load(); } catch (e) { toast(e.message, true); }
  }
  async function doReset() {
    if (!reset.username.trim() || reset.pw.length < 8) return toast("שם משתמש וסיסמה חדשה (8 תווים לפחות, אותיות וספרות)", true);
    try {
      const r = await a.run("admin_account_reset", { username: reset.username, new_password: reset.pw });
      if (r && r.ok) { toast("הסיסמה של " + reset.username + " הוחלפה"); setReset({ username: "", pw: "" }); }
      else toast(r && r.error === "missing" ? "אין משתמש בשם הזה" : r && r.error === "preview" ? "זמין אחרי חיבור המסד" : "הסיסמה צריכה 8 תווים לפחות, עם אותיות וספרות", true);
    } catch (e) { toast(e.message, true); }
  }
  const open = d ? d.messages.filter((m) => !m.handled).length : 0;
  return (
    <Card title="חשבונות ופניות" className="span-12" action={<UsersThree size={18} className="muted" />}>
      <div className="stat-line"><span><UsersThree size={16} /> חשבונות תלמידים</span><b>{d ? fmt(d.accounts) : "…"}{d && d.accounts_7d ? ` (+${fmt(d.accounts_7d)} השבוע)` : ""}</b></div>
      <div className="stat-line"><span><Envelope size={16} /> פניות מטופס יצירת קשר</span><b>{d ? (open ? open + " חדשות" : "אין חדשות") : "…"}</b></div>
      {d && d.messages.length > 0 && (
        <ul className="msg-list">
          {d.messages.slice(0, 20).map((m) => (
            <li key={m.id} className={m.handled ? "done" : ""}>
              <div className="msg-h"><b>{m.name || "ללא שם"}</b>{m.reply_to && <span className="ltr">{m.reply_to}</span>}<time>{new Date(m.created_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}</time></div>
              <p>{m.body}</p>
              <button type="button" className="abtn sm" onClick={() => done(m)}><CheckCircle size={16} />{m.handled ? "סמן כלא טופל" : "טופל"}</button>
            </li>
          ))}
        </ul>
      )}
      <div className="reset-box">
        <b>איפוס סיסמה לתלמיד/ה ששכח/ה</b>
        <p className="note">אחרי שהתלמיד/ה פנה/תה בטופס יצירת קשר. כל המכשירים שלו/ה ינותקו.</p>
        <div className="toolbar">
          <label className="field" style={{ margin: 0 }}><span>שם משתמש</span><input type="text" value={reset.username} onChange={(e) => setReset({ ...reset, username: e.target.value })} autoComplete="off" /></label>
          <label className="field" style={{ margin: 0 }}><span>סיסמה חדשה</span><input type="text" value={reset.pw} onChange={(e) => setReset({ ...reset, pw: e.target.value })} autoComplete="off" /></label>
          <button type="button" className="abtn pri" onClick={doReset}>איפוס</button>
        </div>
      </div>
    </Card>
  );
}

/* Duels release switch (spec §7.6): site_settings.duels = off | test | on.
   The database enforces it in every friend/duel function (duel_guard), so this is
   not just hiding buttons. Testers: accounts.duel_tester, set in Students → a student. */
export const DUEL_MODES = [
  { v: "off", label: "כבוי", tone: "off", text: "אף תלמיד לא רואה דו-קרבים: אין אריח בדף הבית, אין פריט בתפריט, והשרת חוסם כל ניסיון להיכנס. דו-קרבים פתוחים נסגרים מיד (מי שבאמצע משחק מקבל תוצאה)." },
  { v: "test", label: "בדיקה", tone: "test", text: "רק תלמידים שסומנו כבודקים רואים ומשחקים. כל השאר לא רואים כלום, כאילו הדו-קרבים כבויים. דו-קרבים פתוחים של מי שאינו בודק נסגרים מיד." },
  { v: "on", label: "פתוח לכולם", tone: "on", text: "כל תלמיד/ה עם חשבון רואה את הדו-קרבים, מוסיף/ה חברים ומזמין/ה לדו-קרב." },
];

function DuelsCard({ a, toast }) {
  const [d, setD] = useState(null);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  // the switch buttons stay disabled until the real state is known (a failed load must not look like "off")
  const load = () => { setLoadErr(false); return a.run("admin_duels", {}).then((x) => { if (!x || !x.switch) throw new Error("no state"); setD(x); }).catch(() => { setD(null); setLoadErr(true); }); };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(v) {
    if (!d || busy || v === d.switch) { setAsk(false); return; }
    if (v === "on" && !ask) { setAsk(true); return; }
    setAsk(false); setBusy(true);
    const before = d.switch;
    setD({ ...d, switch: v });
    try {
      const r = await a.run("admin_set_setting", { k: "duels", v });
      if (!r || !r.ok) throw new Error(r && r.error ? r.error : "not saved");
      const closed = Number(r.closed) || 0;
      const shut = closed === 1 ? "דו-קרב פתוח אחד נסגר" : `${closed} דו-קרבים פתוחים נסגרו`;
      toast(v === "off" ? (closed ? `הדו-קרבים כבויים · ${shut}` : "הדו-קרבים כבויים")
        : v === "test" ? (closed ? `הדו-קרבים פתוחים לבודקים בלבד · ${shut}` : "הדו-קרבים פתוחים לבודקים בלבד") : "הדו-קרבים פתוחים לכל התלמידים");
    } catch (e) { setD((x) => ({ ...x, switch: before })); toast("לא נשמר: " + e.message, true); }
    finally { setBusy(false); }
  }

  const cur = d && d.switch;
  const testers = (d && d.testers) || [];
  return (
    <Card title="דו-קרבים" sub="מי יכול לשחק דו-קרב מול חברים" className="span-12" action={<Sword size={18} className="muted" />}>
      {loadErr && (
        <div className="du-ask" role="alert">
          <span>לא הצלחנו לטעון את מצב הדו-קרבים</span>
          <span className="du-ask-b"><button type="button" className="abtn sm" onClick={load}>לנסות שוב</button></span>
        </div>
      )}
      <div className="du-modes" role="radiogroup" aria-label="מצב הדו-קרבים">
        {DUEL_MODES.map((m) => (
          <button key={m.v} type="button" role="radio" aria-checked={cur === m.v} disabled={!d || busy}
            className={"du-mode " + m.tone} onClick={() => pick(m.v)}>
            <span className="du-mode-h"><i aria-hidden="true" /><b>{m.label}</b>{cur === m.v && <small>המצב עכשיו</small>}</span>
            <span className="du-mode-t">{m.text}</span>
          </button>
        ))}
      </div>
      {ask && (
        <div className="du-ask" role="alert">
          <span>לפתוח את הדו-קרבים לכל התלמידים? כל מי שיש לו חשבון יראה אותם בדף הבא שיפתח באתר.</span>
          <span className="du-ask-b">
            <button type="button" className="abtn pri sm" onClick={() => pick("on")}>כן, לפתוח לכולם</button>
            <button type="button" className="abtn sm" onClick={() => setAsk(false)}>ביטול</button>
          </span>
        </div>
      )}
      <div className="du-testers">
        <div className="stat-line"><span><UsersThree size={16} /> בודקים</span><b>{d ? fmt(testers.length) : "…"}</b></div>
        {testers.length > 0 ? (
          <ul className="du-chips">
            {testers.map((t) => (
              <li key={t.id}><Avatar account={t} size={24} /><b>{t.username}</b>{GRADE[t.grade] && <small>{GRADE[t.grade]}</small>}</li>
            ))}
          </ul>
        ) : d && <p className="note">עוד אין בודקים.</p>}
        <p className="note">מסמנים בודק/ת ב<Link href="/admin/students">תלמידים</Link>: לוחצים על שורה של תלמיד/ה רשום/ה ← &quot;בודק/ת דו-קרבים&quot;. פתיחה מגיעה לתלמיד/ה בדף הבא שנפתח באתר; סגירה מגיעה גם למי שכבר באתר, תוך פחות מדקה.{a.preview && " (במצב תצוגה אין בודקים: זמין אחרי חיבור המסד.)"}</p>
      </div>
    </Card>
  );
}
