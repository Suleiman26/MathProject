'use client';
/* Admin → דו-קרב: the overview (switch, duels played, live now) and the students'
   reports (spec §6). The switch itself is in admin → Settings; the question samples
   for Sulaiman are the second tab (./DuelQuestions.jsx).
   Data: admin_duels (20261108130000_duels_admin.sql), admin_reports /
   admin_report_done (20261108100000_duels_friends.sql). */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowsClockwise, Flag, CheckCircle, Sword, Lightning, Warning, UsersThree, Gear, Prohibit } from "@phosphor-icons/react";
import { useAdmin, useData, PageHead } from "../AdminShell";
import { Card, Kpi, Seg, Empty, useToast, fmt, ago } from "../ui";
import { StudentSheet } from "./Students";

/* same wording the student picks from (src/duel/FriendRow.jsx REPORT_REASONS) */
export const REASON = {
  name: "שם משתמש לא מתאים",
  spam: "מציק/ה או שולח/ת יותר מדי",
  other: "משהו אחר",
};
const MODE = { off: "כבוי", test: "בדיקה", on: "פתוח לכולם" };
const MODE_SUB = { off: "אף תלמיד לא רואה דו-קרבים", test: "רק הבודקים רואים", on: "כל התלמידים רואים" };

/** the two tabs under the page title */
export function DuelTabs() {
  const path = usePathname();
  const tabs = [["/admin/duels", "דיווחים ומצב"], ["/admin/duels/questions", "שאלות דו-קרב"]];
  return (
    <nav className="du-tabs" aria-label="דו-קרב">
      {tabs.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>)}
    </nav>
  );
}

export default function Duels() {
  const a = useAdmin();
  const toast = useToast();
  const { data } = useData(["catalog"]);
  const [ov, setOv] = useState(null);
  const [list, setList] = useState(null);
  const [err, setErr] = useState(null);
  const [show, setShow] = useState("open");
  const [busy, setBusy] = useState(null);
  const [who, setWho] = useState(null);

  function load() {
    setErr(null);
    Promise.all([a.run("admin_duels", {}), a.run("admin_reports", {})])
      .then(([o, r]) => { setOv(o); setList(Array.isArray(r) ? r : []); })
      .catch(setErr);
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function done(r) {
    setBusy(r.id);
    try {
      const res = await a.run("admin_report_done", { id: r.id });
      if (!res || !res.ok) throw new Error("not saved");
      setList((l) => l.map((x) => (x.id === r.id ? { ...x, done: true } : x)));
      setOv((o) => o && { ...o, open_reports: Math.max(0, (o.open_reports || 0) - 1) });
      toast("הדיווח סומן כטופל");
    } catch (e) { toast("לא נשמר: " + e.message, true); }
    finally { setBusy(null); }
  }

  // "חסימה מדו-קרבים" straight from a report row (admin_set_duel_ban); every row of that student follows
  async function ban(r, v) {
    setBusy(r.id);
    try {
      const res = await a.run("admin_set_duel_ban", { account: r.reported_id, banned: v });
      if (!res || !res.ok) throw new Error(res && res.error === "preview" ? "זמין אחרי חיבור המסד" : (res && res.error) || "not saved");
      setList((l) => l.map((x) => (x.reported_id === r.reported_id ? { ...x, reported_banned: v } : x)));
      toast(v ? `${r.reported} חסום/ה מדו-קרבים` : `החסימה של ${r.reported} הוסרה`);
    } catch (e) { toast("לא נשמר: " + e.message, true); }
    finally { setBusy(null); }
  }

  const tools = <button type="button" className="ibtn" onClick={load} aria-label="רענון"><ArrowsClockwise size={18} /></button>;
  if (err) return <><PageHead tools={tools} /><DuelTabs /><Card><Empty icon={<Warning size={30} />} title="לא הצלחנו לטעון">{err.message}</Empty></Card></>;
  if (!ov || !list) return <><PageHead tools={tools} /><DuelTabs /><div className="mp-boot" style={{ minHeight: 300 }}><span /></div></>;

  const open = list.filter((r) => !r.done);
  const rows = show === "open" ? open : list;
  const person = (id, username) => (id ? <button type="button" className="du-who" onClick={() => setWho({ account_id: id, username })}>{username}</button> : <span className="muted">חשבון שנמחק</span>);

  return (
    <>
      <PageHead tools={tools} />
      <DuelTabs />
      <div className="kpis">
        <Kpi tone="ink" icon={<Sword size={17} />} label="מצב הדו-קרבים" value={MODE[ov.switch] || "—"}
          sub={<>{MODE_SUB[ov.switch] || ""}{ov.switch === "test" ? ` · ${fmt((ov.testers || []).length)} בודקים` : ""} · <Link href="/admin/settings">לשינוי</Link></>} />
        <Kpi icon={<CheckCircle size={17} />} label="דו-קרבים שהסתיימו" value={fmt(ov.played)} sub={`${fmt(ov.played_7d)} בשבוע האחרון · ${fmt(ov.players)} שחקנים`} />
        <Kpi icon={<Lightning size={17} />} label="משחקים עכשיו" value={fmt(ov.live)} sub="דו-קרבים שרצים ברגע זה" />
        <Kpi tone={ov.open_reports ? "warn" : ""} icon={<Flag size={17} />} label="דיווחים פתוחים" value={fmt(open.length)} sub={list.length === 1 ? "דיווח אחד בסך הכול" : `${fmt(list.length)} דיווחים בסך הכול`} />
      </div>

      <Card title="דיווחים" className="mt" sub="תלמידים מדווחים לצוות על חבר/ה (בלי שהצד השני יודע). לחיצה על שם פותחת את כל הפרטים על התלמיד/ה. הכפתור חסימה מדו-קרבים סוגר לתלמיד/ה את הדו-קרבים והחברים (בלי שיידע/תדע), והתרגול נשאר פתוח."
        action={<Seg value={show} onChange={setShow} label="אילו דיווחים" options={[["open", `פתוחים (${fmt(open.length)})`], ["all", "הכל"]]} />}>
        {rows.length ? (
          <ul className="du-reports">
            {rows.map((r) => (
              <li key={r.id} className={"du-rep " + r.reason + (r.done ? " done" : "")}>
                <span className="du-rep-ic" aria-hidden="true"><Flag size={18} weight="fill" /></span>
                <div className="du-rep-m">
                  <div className="du-rep-h">
                    {person(r.reported_id, r.reported)}
                    <span className="du-reason">{REASON[r.reason] || r.reason}</span>
                  </div>
                  <small>
                    <span>דווח/ה ע״י {person(r.reporter_id, r.reporter)}</span>
                    <time dateTime={r.created_at} title={new Date(r.created_at).toLocaleString("he-IL")}>{ago(r.created_at)}</time>
                    {r.duel_id && <span className="du-chip" title={"מזהה הדו-קרב: " + r.duel_id}><Sword size={13} /> מתוך דו-קרב <span className="ltr">#{String(r.duel_id).slice(0, 6)}</span></span>}
                    {+r.reported_total > 1 && <span className="du-chip warn"><UsersThree size={13} /> דווח/ה {fmt(r.reported_total)} פעמים בסך הכול</span>}
                  </small>
                </div>
                <span className="du-rep-act">
                  {r.reported_id && (r.reported_banned
                    ? <button type="button" className="abtn sm" disabled={busy === r.id} onClick={() => ban(r, false)} title="הסרת החסימה מדו-קרבים"><Prohibit size={16} />חסום/ה · ביטול</button>
                    : <button type="button" className="abtn sm" disabled={busy === r.id} onClick={() => ban(r, true)}><Prohibit size={16} />חסימה מדו-קרבים</button>)}
                  {r.done
                    ? <span className="du-done"><CheckCircle size={17} weight="fill" />טופל</span>
                    : <button type="button" className="abtn sm" disabled={busy === r.id} onClick={() => done(r)}><CheckCircle size={16} />טופל</button>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={<Flag size={28} />} title={show === "open" && list.length ? "אין דיווחים פתוחים" : "עוד אין דיווחים"}>
            {show === "open" && list.length ? "כל הדיווחים טופלו." : "כשתלמיד/ה ידווח/תדווח על חבר/ה, זה יופיע כאן."}
          </Empty>
        )}
        {a.preview && <p className="note mt-s">(במצב תצוגה אין דיווחים: זמין אחרי חיבור המסד.)</p>}
      </Card>
      <p className="note mt-s"><Gear size={14} /> את מצב הדו-קרבים (כבוי / בדיקה / פתוח) ואת רשימת הבודקים משנים ב<Link href="/admin/settings">הגדרות</Link>.</p>
      {who && <StudentSheet x={who} catalog={data.catalog || { topics: [] }} onClose={() => setWho(null)} />}
    </>
  );
}
