'use client';
import Link from "next/link";
import { Users, ListChecks, Target, Trophy, ChartLineUp, ArrowLeft, Lightning, Plus, Stack, DownloadSimple, Fire, Warning, Star } from "@phosphor-icons/react";
import { useAdmin, useData, PageHead } from "../AdminShell";
import { Card, Kpi, Delta, Meter, TopicIcon, Seg, Empty, fmt, pct, ago, studentName } from "../ui";
import { AreaCompare, CountUp, DayTimeline, Donut, Gauge, Heatmap, BarList, Sparkline } from "../charts";

export const PERIODS = [[7, "7 ימים"], [30, "30 ימים"], [90, "90 ימים"]];
const GOAL = 80; // success-rate goal (%)

export function topicOf(catalog, page) {
  const t = catalog && catalog.topics.find((x) => x.page === page);
  return t || { name: (page || "").replace(".html", ""), icon: "book", color: "teal" };
}

export default function Dashboard() {
  const a = useAdmin();
  const { data, loading, error } = useData(["catalog", "stats"]);
  if (error) return <><PageHead /><Card><Empty icon={<Warning size={30} />} title="לא הצלחנו לטעון את הנתונים">{error.message}</Empty></Card></>;
  if (loading || !data.stats || !data.catalog) return <><PageHead /><div className="mp-boot" style={{ minHeight: 300 }}><span /></div></>;
  const { stats: s, catalog: c } = data;
  const k = s.kpi, daily = s.daily || [];
  const answers = k.correct + k.wrong, answersPrev = k.correct_prev + k.wrong_prev;
  const acc = pct(k.correct, answers), accPrev = pct(k.correct_prev, answersPrev);
  const now = new Date(), hour = now.getHours();
  const hello = hour < 5 ? "לילה טוב" : hour < 12 ? "בוקר טוב" : hour < 18 ? "צהריים טובים" : "ערב טוב";
  const today = (s.today || []).map((e) => ({ ...e, name: topicOf(c, e.page).name }));
  const todayOk = today.filter((e) => e.kind === "ok").length, todayBad = today.filter((e) => e.kind === "bad").length, todayWin = today.filter((e) => e.kind === "win").length;
  const withData = (s.topics || []).filter((t) => t.attempts >= 5);
  const hardest = withData.slice().sort((x, y) => x.ok / x.attempts - y.ok / y.attempts).slice(0, 5);
  const popular = (s.topics || []).slice().sort((x, y) => y.attempts - x.attempts).slice(0, 6);
  const dev = s.devices || { mobile: 0, desktop: 0 };
  const date = now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
  const hardestName = hardest[0] ? topicOf(c, hardest[0].page).name : null;

  return (
    <>
      <h1 className="sr">לוח בקרה</h1>
      <div className="bento">
        {/* greeting + today's timeline */}
        <section className="a-card card-in greet span-7">
          <div className="greet-glow" aria-hidden="true" />
          <p className="eyebrow">{date}</p>
          <h2 className="greet-h">{hello}.</h2>
          <p className="greet-p">
            היום ענו <b>{fmt(todayOk + todayBad)} תשובות</b>, <b>{fmt(k.active_today)} תלמידים</b> תרגלו
            {todayOk + todayBad > 0 && <> ו<b>{pct(todayOk, todayOk + todayBad)}%</b> מהתשובות נכונות</>}.
            {hardestName && <> הנושא הכי מאתגר בתקופה: <Link href="/admin/analytics">{hardestName}</Link>.</>}
          </p>
          <DayTimeline events={today} />
          <div className="tl-key"><span><i style={{ background: "var(--ok-c)" }} />נכון</span><span><i style={{ background: "var(--bad-c)" }} />שגוי</span><span><i style={{ background: "var(--ok-600)" }} />פתר תרגיל</span></div>
          <div className="mini3">
            <Link href="/admin/analytics"><small>תשובות היום</small><b>{fmt(todayOk + todayBad)}</b></Link>
            <Link href="/admin/students"><small>תלמידים היום</small><b>{fmt(k.active_today)}</b></Link>
            <Link href="/admin/analytics"><small>נפתרו היום</small><b>{fmt(todayWin)}</b></Link>
          </div>
        </section>

        {/* hero: answers in the period */}
        <section className="hero-card card-in span-5">
          <div className="hero-top"><span><Star size={14} weight="fill" /> תשובות בתקופה</span><Seg value={a.days} options={PERIODS} onChange={a.setDays} label="תקופה" /></div>
          <CountUp value={answers} className="hero-num" />
          <p className="hero-sub"><span className="hero-chip"><Delta now={answers} prev={answersPrev} /></span> מול {a.days} הימים שלפני</p>
          <div className="hero-bars" aria-hidden="true" dir="ltr">
            {daily.slice(-28).map((d, i, arr) => { const m = Math.max(...arr.map((x) => x.ok + x.bad), 1); return <span key={d.day} style={{ height: `${Math.max(4, ((d.ok + d.bad) / m) * 100)}%`, animationDelay: `${i * 18}ms` }} />; })}
          </div>
          <Link href="/admin/analytics" className="hero-btn"><ChartLineUp size={16} /> לניתוח המלא</Link>
        </section>
      </div>

      <div className="kpis">
        <Kpi tone="ink" icon={<Users size={17} />} label="תלמידים פעילים" value={<CountUp value={k.active} />} delta={<Delta now={k.active} prev={k.active_prev} />} sub={`${fmt(k.new_devices)} חדשים`} />
        <Kpi tone="blue" icon={<Target size={17} />} label="אחוז הצלחה" value={acc == null ? "—" : <><CountUp value={acc} />%</>} delta={acc == null || accPrev == null ? null : <Delta now={acc} prev={accPrev} unit="pt" />} spark={<Sparkline data={daily.map((d) => pct(d.ok, d.ok + d.bad) || 0)} color="#fff" />} />
        <Kpi icon={<Trophy size={17} />} label="תרגילים שנפתרו" value={<CountUp value={k.solved} />} delta={<Delta now={k.solved} prev={k.solved_prev} />} spark={<Sparkline data={daily.map((d) => d.win)} color="var(--ok-600)" />} />
        <Kpi icon={<ListChecks size={17} />} label="תשובות לתלמיד" value={k.active ? (answers / k.active).toFixed(1) : "—"} sub="ממוצע בתקופה" spark={<Sparkline data={daily.map((d) => (d.active ? (d.ok + d.bad) / d.active : 0))} />} />
      </div>

      <div className="bento mt">
        <Card title="פעילות יומית" sub="תשובות ביום, מול התקופה הקודמת" className="span-8"
          action={<div className="legend"><span><i className="ln" />התקופה הנוכחית</span><span><i className="ln dash" />תקופה קודמת</span></div>}>
          <AreaCompare data={daily} prev={s.daily_prev || []} />
        </Card>
        <Card title="יעד הצלחה" sub={`יעד: ${GOAL}% תשובות נכונות`} className="span-4">
          <Gauge value={acc || 0} goal={GOAL} label="תשובות נכונות בתקופה" sub={acc == null ? "עוד אין תשובות" : acc >= GOAL ? "היעד הושג. כל הכבוד!" : `עוד ${GOAL - acc} נקודות ליעד`} />
        </Card>
      </div>

      <div className="bento mt">
        <Card title="הכי קשה לתלמידים" sub="אחוז הצלחה הנמוך ביותר" className="span-5" action={<Link className="a-link" href="/admin/analytics">לכל הנושאים <ArrowLeft size={13} /></Link>}>
          {hardest.length ? <ul className="rows">{hardest.map((t) => { const tp = topicOf(c, t.page); return (
            <li key={t.page} className="row"><TopicIcon t={tp} /><div><b>{tp.name}</b><small>{fmt(t.attempts)} תשובות · {fmt(t.devices)} תלמידים</small></div><Meter value={pct(t.ok, t.attempts)} /></li>); })}</ul>
            : <Empty icon={<ChartLineUp size={28} />} title="עוד אין מספיק תשובות" />}
        </Card>
        <Card title="מאיפה מתרגלים" className="span-3">
          <Donut rows={[{ key: "טלפון", value: dev.mobile, color: "var(--s1)" }, { key: "מחשב", value: dev.desktop, color: "var(--s2)" }]} center={fmt(dev.mobile + dev.desktop)} sub="תלמידים" />
        </Card>
        <Card title="פעולות מהירות" className="span-4">
          <div className="quick">
            {[
              { href: "/admin/content", Icon: Plus, t: "נושא חדש", d: "שם, כיתות, סמל ועמוד", hot: true },
              { href: "/admin/content", Icon: Stack, t: "סדר הנושאים", d: "גוררים, ודף הבית מתעדכן" },
              { href: "/admin/settings", Icon: DownloadSimple, t: "ייצוא תשובות", d: "קובץ לאקסל / Google Sheets" },
            ].map((q) => (
              <Link key={q.t} href={q.href} className={"quick-a" + (q.hot ? " hot" : "")}>
                <span className="quick-i"><q.Icon size={18} /></span>
                <span className="quick-t"><b>{q.t}</b><small>{q.d}</small></span>
                <ArrowLeft size={15} className="quick-go" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="bento mt">
        <Card title="מתי מתרגלים" sub="תשובות לפי יום ושעה" className="span-7"><Heatmap cells={s.heat || []} /></Card>
        <Card title="הכי מתורגלים" sub="תשובות בתקופה" className="span-5">
          {popular.length ? <BarList rows={popular.map((t) => { const tp = topicOf(c, t.page); return { key: tp.name, value: t.attempts, sub: `${pct(t.ok, t.attempts)}% הצלחה`, icon: <TopicIcon t={tp} size="xs" /> }; })} />
            : <Empty icon={<Fire size={28} />} title="עוד אין פעילות" />}
        </Card>
      </div>

      <Card title="פעילות אחרונה" sub="התשובות האחרונות באתר" className="mt">
        {(s.recent || []).length ? <ul className="rows feed">{s.recent.slice(0, 10).map((e, i) => {
          const tp = topicOf(c, e.page), m = { ok: ["ok", "✓", "תשובה נכונה"], bad: ["bad", "✗", "תשובה שגויה"], win: ["win", "★", "פתר תרגיל"] }[e.kind] || ["", "·", e.kind];
          return <li key={i} className="row"><span className={"dot-k " + m[0]}>{m[1]}</span><div><b>{tp.name}{e.chapter ? " · " + e.chapter : ""}</b><small>{m[2]} · {studentName(e.device)}{e.step ? " · " + e.step : ""}</small></div><small className="muted">{ago(e.at)}</small></li>;
        })}</ul> : <Empty icon={<Lightning size={28} />} title="כשתלמידים יענו על שאלות, זה יופיע כאן" />}
      </Card>
    </>
  );
}
