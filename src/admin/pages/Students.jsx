'use client';
/* Admin → students. Signed-in students are one row each, by username, with all
   their devices together; guests (no account) are one row per device with a
   random number. Tapping a row opens that student's full picture.
   Data: admin_students / admin_student (20261102100000_admin_students_accounts.sql). */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Users, Sparkle, ArrowsClockwise, DeviceMobile, Desktop, MagnifyingGlass, Warning, X, Sword, Flag } from "@phosphor-icons/react";
import { useAdmin, useData, PageHead } from "../AdminShell";
import { Card, Kpi, Meter, Seg, Switch, Empty, TopicIcon, fmt, pct, ago, whoName, GRADE, useToast } from "../ui";
import { CountUp, Donut, Bars } from "../charts";
import { Avatar } from "@/account/ui";
import { PERIODS, topicOf } from "./Dashboard";

const keyOf = (x) => x.account_id || "d:" + x.device;
const dateHe = (t) => new Date(t).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" });

export default function Students() {
  const a = useAdmin();
  const { data, loading, error } = useData(["catalog", "stats", "students"]);
  const [q, setQ] = useState("");
  const [who, setWho] = useState("all");
  const [sort, setSort] = useState("recent");
  const [open, setOpen] = useState(null);
  const tools = <><Seg value={a.days} options={PERIODS} onChange={a.setDays} label="תקופה" /><button type="button" className="ibtn" onClick={() => a.refresh(["stats", "students"])} aria-label="רענון"><ArrowsClockwise size={18} /></button></>;
  if (error) return <><PageHead tools={tools} /><Card><Empty icon={<Warning size={30} />} title="לא הצלחנו לטעון את הנתונים">{error.message}</Empty></Card></>;
  if (loading || !data.students) return <><PageHead tools={tools} /><div className="mp-boot" style={{ minHeight: 300 }}><span /></div></>;

  const list = data.students, k = data.stats.kpi, c = data.catalog;
  const members = list.filter((x) => x.username).length;
  const returning = list.filter((x) => x.days_active > 1).length, mobile = list.filter((x) => x.mobile).length;
  const answered = list.filter((x) => x.ok + x.bad > 0);
  const groups = [
    { key: "מצליחים (80%+)", value: answered.filter((x) => pct(x.ok, x.ok + x.bad) >= 80).length, color: "var(--ok-c)" },
    { key: "באמצע (60–80%)", value: answered.filter((x) => { const p = pct(x.ok, x.ok + x.bad); return p >= 60 && p < 80; }).length, color: "var(--s2)" },
    { key: "צריכים עזרה (<60%)", value: answered.filter((x) => pct(x.ok, x.ok + x.bad) < 60).length, color: "var(--bad-c)" },
  ];
  const term = q.trim().toLowerCase().replace("#", "");
  let rows = list.filter((x) => (who === "all" || (who === "members") === !!x.username) &&
    (!term || whoName(x).toLowerCase().includes(term)));
  if (sort === "active") rows = rows.slice().sort((x, y) => (y.ok + y.bad) - (x.ok + x.bad));
  if (sort === "help") rows = rows.slice().sort((x, y) => (pct(x.ok, x.ok + x.bad) ?? 101) - (pct(y.ok, y.ok + y.bad) ?? 101));

  return (
    <>
      <PageHead tools={tools} />
      <div className="kpis">
        <Kpi tone="ink" icon={<Users size={17} />} label="פעילים בתקופה" value={<CountUp value={list.length} />} sub={`${fmt(members)} רשומים · ${fmt(list.length - members)} אורחים`} />
        <Kpi icon={<Sparkle size={17} />} label="חדשים" value={<CountUp value={k.new_devices || 0} />} sub="מכשירים שנכנסו לראשונה" />
        <Kpi icon={<ArrowsClockwise size={17} />} label="חוזרים" value={<CountUp value={returning} />} sub={`${pct(returning, list.length) || 0}% תרגלו ביותר מיום אחד`} />
        <Kpi tone="blue" icon={<DeviceMobile size={17} />} label="בטלפון" value={<><CountUp value={pct(mobile, list.length) || 0} />%</>} sub={`${fmt(mobile)} תלמידים`} />
      </div>
      <div className="bento mt">
        <Card title="איך התלמידים מסתדרים" sub="לפי אחוז ההצלחה של כל מי שענה" className="span-4">
          <Donut rows={groups} center={fmt(answered.length)} sub="ענו על שאלות" />
        </Card>
        <Card title="כל התלמידים" sub="רשומים מופיעים בשם המשתמש, עם כל המכשירים שלהם יחד. אורח = מתרגל בלי חשבון (מספר אקראי לכל מכשיר). לחיצה על שורה פותחת את כל הפרטים." className="span-8">
          <div className="toolbar">
            <label className="search"><MagnifyingGlass size={18} /><input className="inp" type="search" placeholder="חיפוש לפי שם או מספר" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש תלמיד" /></label>
            <Seg value={who} onChange={setWho} label="מי" options={[["all", "כולם"], ["members", `רשומים (${fmt(members)})`], ["guests", "אורחים"]]} />
            <Seg value={sort} onChange={setSort} label="מיון" options={[["recent", "אחרונים"], ["active", "הכי פעילים"], ["help", "צריכים עזרה"]]} />
          </div>
          <div className="tbl-wrap"><table className="tbl st-tbl">
            <thead><tr><th>תלמיד</th><th>נראה לאחרונה</th><th className="n">ימים</th><th className="n">תשובות</th><th>הצלחה</th><th>נושא אהוב</th><th /></tr></thead>
            <tbody>
              {rows.slice(0, 200).map((x) => (
                <tr key={keyOf(x)} className="click" tabIndex={0} onClick={() => setOpen(x)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(x); } }} aria-label={`פרטים על ${whoName(x)}`}>
                  <td><Who x={x} /></td>
                  <td>{x.last_seen ? ago(x.last_seen) : "—"}</td>
                  <td className="n">{fmt(x.days_active)}</td>
                  <td className="n">{fmt(x.ok + x.bad)}</td>
                  <td><Meter value={pct(x.ok, x.ok + x.bad)} /></td>
                  <td>{x.top_page ? topicOf(c, x.top_page).name : "—"}</td>
                  <td className="muted st-go">{x.devices > 1 ? <span className="st-dev" title="מכשירים">{fmt(x.devices)} <DeviceMobile size={15} /></span> : x.mobile == null ? null : x.mobile ? <DeviceMobile size={18} /> : <Desktop size={18} />}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7}><Empty icon={<Users size={28} />} title={list.length ? "לא נמצא תלמיד" : "עוד אין תלמידים בתקופה הזו"} /></td></tr>}
            </tbody>
          </table></div>
        </Card>
      </div>
      {open && <StudentSheet x={open} catalog={c} onClose={() => setOpen(null)} />}
    </>
  );
}

/* name cell: avatar + username + grade, or "guest #1234" */
function Who({ x }) {
  return (
    <span className={"st-who" + (x.username ? "" : " guest")}>
      <Avatar account={x.username ? x : null} size={34} />
      <span>
        <b>{whoName(x)}</b>
        <small>{x.username ? (GRADE[x.grade] || "רשום/ה") : x.device_user ? `אורח · אותו מכשיר של ${x.device_user}` : "אורח · בלי חשבון"}</small>
      </span>
    </span>
  );
}

/* one student's full picture (also opened from admin → דו-קרב → a report) */
export function StudentSheet({ x, catalog, onClose }) {
  const a = useAdmin();
  const [on, setOn] = useState(false);
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const days = Math.max(14, a.days);
  useEffect(() => {
    requestAnimationFrame(() => setOn(true));
    a.run("admin_student", x.username ? { account_id: x.account_id, days } : { device: x.device, days }).then(setD, setErr);
    const key = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function close() { setOn(false); setTimeout(onClose, 200); }

  const name = whoName(x);
  return createPortal(
    <div className={"scrim" + (on ? " on" : "")} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="sheet st-sheet" role="dialog" aria-modal="true" aria-label={`פרטים על ${name}`}>
        <div className="sheet-h st-h">
          <span className={"st-who big" + (x.username ? "" : " guest")}>
            <Avatar account={x.username ? x : null} size={48} />
            <span>
              <h3>{name}</h3>
              <small>{x.username
                ? [GRADE[x.grade], x.joined && `נרשם/ה ב־${dateHe(x.joined)}`].filter(Boolean).join(" · ")
                : x.device_user ? `אורח (בלי חשבון) · אותו מכשיר שבו ${x.device_user} מתחבר/ת` : "אורח: מתרגל בלי חשבון, במכשיר אחד"}</small>
            </span>
          </span>
          <button type="button" className="ibtn" onClick={close} aria-label="סגירה"><X size={18} /></button>
        </div>
        <div className="sheet-b st-b">
          {err ? <Empty icon={<Warning size={28} />} title="לא הצלחנו לטעון">{err.message}</Empty>
            : !d ? <div className="mp-boot" style={{ minHeight: 220 }}><span /></div>
            : <>{d.account && <DuelBox d={d} setD={setD} />}<Detail d={d} catalog={catalog} days={days} /></>}
        </div>
      </div>
    </div>,
    document.querySelector(".adm-root") || document.body
  );
}

/* duels: the tester switch (accounts.duel_tester → admin_set_tester) and the
   student's duel numbers (admin_student → duel, 20261108130000_duels_admin.sql) */
function DuelBox({ d, setD }) {
  const a = useAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const acc = d.account, du = d.duel || {};
  const on = !!acc.duel_tester;
  async function flip(v) {
    setBusy(true);
    try {
      const r = await a.run("admin_set_tester", { account: acc.id, on: v });
      if (!r || !r.ok) throw new Error(r && r.error === "preview" ? "זמין אחרי חיבור המסד" : (r && r.error) || "not saved");
      setD({ ...d, account: { ...acc, duel_tester: v }, duel: { ...du, tester: v } });
      toast(v ? `${acc.username} בודק/ת דו-קרבים` : `${acc.username} כבר לא בודק/ת`);
    } catch (e) { toast("לא נשמר: " + e.message, true); }
    finally { setBusy(false); }
  }
  const played = +du.played || 0;
  return (
    <div className="st-duel">
      <div className="st-duel-h">
        <span className="st-duel-ic"><Sword size={18} /></span>
        <span>
          <b>בודק/ת דו-קרבים</b>
          <small>{on ? "רואה ומשחק/ת דו-קרבים גם כשהם במצב בדיקה" : "כשהדו-קרבים במצב בדיקה, רק בודקים רואים אותם"}</small>
        </span>
        <span className={busy ? "st-duel-sw busy" : "st-duel-sw"}><Switch on={on} onChange={busy ? () => {} : flip} label="בודק/ת דו-קרבים" /></span>
      </div>
      <p className="st-duel-n">
        {played
          ? <><span><b>{fmt(played)}</b> דו-קרבים</span><span><b>{fmt(du.wins)}</b> ניצחונות</span><span><b>{fmt(du.losses)}</b> הפסדים</span>{+du.draws > 0 && <span><b>{fmt(du.draws)}</b> תיקו</span>}<span><b>{fmt(du.xp)}</b> נקודות דו-קרב</span>{du.last && <span>אחרון {ago(du.last)}</span>}</>
          : <span>עוד לא שיחק/ה דו-קרב</span>}
        {+du.reported > 0 && <span className={+du.reported_open > 0 ? "warn" : ""}><Flag size={14} weight="fill" /> דווח/ה {fmt(du.reported)} {+du.reported === 1 ? "פעם" : "פעמים"}{+du.reported_open > 0 ? ` (${+du.reported_open === 1 ? "אחד פתוח" : fmt(du.reported_open) + " פתוחים"})` : ""}</span>}
      </p>
    </div>
  );
}

function Detail({ d, catalog, days }) {
  const t = d.totals || { ok: 0, bad: 0, win: 0, days: 0 }, n = t.ok + t.bad;
  // one bar per day, empty days included
  const byDay = Object.fromEntries((d.daily || []).map((r) => [r.day, r]));
  const bars = Array.from({ length: days }, (_, i) => {
    const dt = new Date(Date.now() - (days - 1 - i) * 864e5);
    const key = dt.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    const r = byDay[key] || { ok: 0, bad: 0, win: 0 };
    return { v: r.ok + r.bad, label: i % Math.ceil(days / 7) === 0 ? `${dt.getDate()}/${dt.getMonth() + 1}` : "", tipTitle: dt.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" }), tip: `${r.ok} נכונות · ${r.bad} שגויות · ${r.win} נפתרו` };
  });
  const chapters = (d.chapters || []);
  const kinds = { ok: ["ok", "✓", "תשובה נכונה"], bad: ["bad", "✗", "תשובה שגויה"], win: ["win", "★", "פתר/ה תרגיל"] };

  if (!d.last_seen) {
    return <Empty icon={<Sparkle size={28} />} title="עוד לא תרגל/ה">{d.account && d.account.last_seen ? `נכנס/ה לחשבון לאחרונה ${ago(d.account.last_seen)}, אבל עוד לא ענה/תה על שאלות.` : "החשבון נפתח, אבל עוד אין תשובות."}</Empty>;
  }
  return (
    <>
      <p className="st-meta">
        <span>התחיל/ה לתרגל {dateHe(d.first_seen)}</span>
        <span>נראה/תה לאחרונה {ago(d.last_seen)}</span>
        <span>{d.devices > 1 ? `${fmt(d.devices)} מכשירים` : d.mobile ? "טלפון" : "מחשב"}</span>
      </p>
      <div className="st-k">
        <div><b>{fmt(n)}</b><small>תשובות</small></div>
        <div className={n >= 5 && pct(t.ok, n) < 60 ? "bad" : ""}><b>{n ? pct(t.ok, n) + "%" : "—"}</b><small>הצלחה</small></div>
        <div><b>{fmt(t.win)}</b><small>תרגילים נפתרו</small></div>
        <div><b>{fmt(t.days)}</b><small>ימי תרגול</small></div>
      </div>

      <h4 className="st-t">פעילות ב־{fmt(days)} הימים האחרונים</h4>
      <Bars data={bars} height={150} label="תשובות לפי יום" />

      <h4 className="st-t">לפי נושא</h4>
      <ul className="st-topics">
        {(d.topics || []).map((tp) => {
          const T = topicOf(catalog, tp.page), tn = tp.ok + tp.bad;
          const chs = chapters.filter((ch) => ch.page === tp.page);
          return (
            <li key={tp.page}>
              <div className="st-tp">
                <TopicIcon t={T} size="xs" />
                <span><b>{T.name}</b><small>{fmt(tn)} תשובות · {fmt(tp.win)} נפתרו · {ago(tp.last)}</small></span>
                <Meter value={tn ? pct(tp.ok, tn) : null} />
              </div>
              {chs.length > 0 && (
                <ul className="st-chs">
                  {chs.map((ch) => {
                    const cn = ch.ok + ch.bad, p = pct(ch.ok, cn);
                    return (
                      <li key={ch.chapter} className={cn >= 4 && p < 60 ? "weak" : ""}>
                        <span>{ch.chapter}</span>
                        <small>{fmt(cn)} תשובות{ch.win ? ` · ${fmt(ch.win)} נפתרו` : ""}</small>
                        <b>{cn ? p + "%" : "—"}</b>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <h4 className="st-t">מה עשה/תה לאחרונה</h4>
      {(d.recent || []).length ? (
        <ul className="rows feed st-feed">
          {d.recent.slice(0, 40).map((e, i) => {
            const T = topicOf(catalog, e.page), m = kinds[e.kind] || ["", "·", e.kind];
            return <li key={i} className="row"><span className={"dot-k " + m[0]}>{m[1]}</span><div><b>{T.name}{e.chapter ? " · " + e.chapter : ""}</b><small>{m[2]}{e.step ? " · " + e.step : ""}</small></div><small className="muted">{ago(e.at)}</small></li>;
          })}
        </ul>
      ) : <p className="muted">רק צפיות, עוד בלי תשובות.</p>}
    </>
  );
}

