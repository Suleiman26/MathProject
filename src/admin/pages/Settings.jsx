'use client';
import { useEffect, useState } from "react";
import { Lock, DownloadSimple, ShieldCheck, Database, Keyboard, UsersThree, Envelope, CheckCircle } from "@phosphor-icons/react";
import { useAdmin, PageHead } from "../AdminShell";
import { Card, Seg, Switch, useToast, fmt } from "../ui";
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
