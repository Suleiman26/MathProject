'use client';
import { useState } from "react";
import { Users, Sparkle, ArrowsClockwise, DeviceMobile, Desktop, MagnifyingGlass, Warning } from "@phosphor-icons/react";
import { useAdmin, useData, PageHead } from "../AdminShell";
import { Card, Kpi, Meter, Seg, Empty, fmt, pct, ago, studentName } from "../ui";
import { CountUp, Donut } from "../charts";
import { PERIODS, topicOf } from "./Dashboard";

export default function Students() {
  const a = useAdmin();
  const { data, loading, error } = useData(["catalog", "stats", "students"]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const tools = <><Seg value={a.days} options={PERIODS} onChange={a.setDays} label="תקופה" /><button type="button" className="ibtn" onClick={() => a.refresh(["stats", "students"])} aria-label="רענון"><ArrowsClockwise size={18} /></button></>;
  if (error) return <><PageHead tools={tools} /><Card><Empty icon={<Warning size={30} />} title="לא הצלחנו לטעון את הנתונים">{error.message}</Empty></Card></>;
  if (loading || !data.students) return <><PageHead tools={tools} /><div className="mp-boot" style={{ minHeight: 300 }}><span /></div></>;

  const list = data.students, k = data.stats.kpi, c = data.catalog;
  const returning = list.filter((x) => x.days_active > 1).length, mobile = list.filter((x) => x.mobile).length;
  const groups = [
    { key: "מצליחים (80%+)", value: list.filter((x) => pct(x.ok, x.ok + x.bad) >= 80).length, color: "var(--ok-c)" },
    { key: "באמצע (60–80%)", value: list.filter((x) => { const p = pct(x.ok, x.ok + x.bad); return p >= 60 && p < 80; }).length, color: "var(--s2)" },
    { key: "צריכים עזרה (<60%)", value: list.filter((x) => (pct(x.ok, x.ok + x.bad) ?? 100) < 60).length, color: "var(--bad-c)" },
  ];
  let rows = list.filter((x) => !q.trim() || studentName(x.device).includes(q.trim().toUpperCase().replace("#", "")));
  if (sort === "active") rows = rows.slice().sort((x, y) => (y.ok + y.bad) - (x.ok + x.bad));
  if (sort === "help") rows = rows.slice().sort((x, y) => (pct(x.ok, x.ok + x.bad) ?? 101) - (pct(y.ok, y.ok + y.bad) ?? 101));

  return (
    <>
      <PageHead tools={tools} />
      <div className="kpis">
        <Kpi tone="ink" icon={<Users size={17} />} label="פעילים בתקופה" value={<CountUp value={list.length} />} sub={`מתוך ${fmt(k.all_time_devices || list.length)} מאז ההתחלה`} />
        <Kpi icon={<Sparkle size={17} />} label="חדשים" value={<CountUp value={k.new_devices || 0} />} sub="נכנסו לראשונה" />
        <Kpi icon={<ArrowsClockwise size={17} />} label="חוזרים" value={<CountUp value={returning} />} sub={`${pct(returning, list.length) || 0}% תרגלו ביותר מיום אחד`} />
        <Kpi tone="blue" icon={<DeviceMobile size={17} />} label="בטלפון" value={<><CountUp value={pct(mobile, list.length) || 0} />%</>} sub={`${fmt(mobile)} תלמידים`} />
      </div>
      <div className="bento mt">
        <Card title="איך התלמידים מסתדרים" sub="לפי אחוז ההצלחה של כל תלמיד" className="span-4">
          <Donut rows={groups} center={fmt(list.length)} sub="תלמידים" />
        </Card>
        <Card title="כל התלמידים" sub="כל מכשיר מקבל מספר אקראי. כשתהיה הרשמה, יופיעו כאן שמות." className="span-8">
          <div className="toolbar">
            <label className="search"><MagnifyingGlass size={18} /><input className="inp" type="search" placeholder="חיפוש לפי מספר תלמיד" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש תלמיד" /></label>
            <Seg value={sort} onChange={setSort} label="מיון" options={[["recent", "אחרונים"], ["active", "הכי פעילים"], ["help", "צריכים עזרה"]]} />
          </div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>תלמיד</th><th>נראה לאחרונה</th><th className="n">ימים</th><th className="n">תשובות</th><th>הצלחה</th><th>נושא אהוב</th><th /></tr></thead>
            <tbody>
              {rows.slice(0, 200).map((x) => (
                <tr key={x.device}><td><b>{studentName(x.device)}</b></td><td>{ago(x.last_seen)}</td><td className="n">{fmt(x.days_active)}</td><td className="n">{fmt(x.ok + x.bad)}</td><td><Meter value={pct(x.ok, x.ok + x.bad)} /></td><td>{x.top_page ? topicOf(c, x.top_page).name : "—"}</td><td className="muted">{x.mobile ? <DeviceMobile size={18} /> : <Desktop size={18} />}</td></tr>
              ))}
              {!rows.length && <tr><td colSpan={7}><Empty icon={<Users size={28} />} title={list.length ? "לא נמצא תלמיד" : "עוד אין תלמידים בתקופה הזו"} /></td></tr>}
            </tbody>
          </table></div>
        </Card>
      </div>
    </>
  );
}
