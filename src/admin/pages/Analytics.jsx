'use client';
import { Fragment, useMemo, useState } from "react";
import { Target, Info, MagnifyingGlass, CaretLeft, ArrowsClockwise, Warning } from "@phosphor-icons/react";
import { useAdmin, useData, PageHead } from "../AdminShell";
import { Card, Kpi, Meter, Level, TopicIcon, Seg, Empty, fmt, pct } from "../ui";
import { StackedBars, BarList, CountUp } from "../charts";
import { PERIODS, topicOf } from "./Dashboard";

export default function Analytics() {
  const a = useAdmin();
  const { data, loading, error } = useData(["catalog", "stats"]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("hard");
  const [open, setOpen] = useState({});
  const tools = <><Seg value={a.days} options={PERIODS} onChange={a.setDays} label="תקופה" /><button type="button" className="ibtn" onClick={() => a.refresh(["stats"])} aria-label="רענון"><ArrowsClockwise size={18} /></button></>;

  const s = data.stats, c = data.catalog;
  const byPage = useMemo(() => Object.fromEntries(((s && s.topics) || []).map((t) => [t.page, t])), [s]);
  if (error) return <><PageHead tools={tools} /><Card><Empty icon={<Warning size={30} />} title="לא הצלחנו לטעון את הנתונים">{error.message}</Empty></Card></>;
  if (loading || !s || !c) return <><PageHead tools={tools} /><div className="mp-boot" style={{ minHeight: 300 }}><span /></div></>;

  const tot = s.topics.reduce((m, t) => ({ ok: m.ok + t.ok, bad: m.bad + t.bad }), { ok: 0, bad: 0 });
  const chs = s.chapters.filter((x) => x.ok + x.bad >= 5).sort((x, y) => x.ok / (x.ok + x.bad) - y.ok / (y.ok + y.bad));
  const tps = s.topics.filter((x) => x.attempts >= 5).sort((x, y) => x.ok / x.attempts - y.ok / y.attempts);
  const stat = (t) => byPage[t.page] || { attempts: 0, ok: 0, bad: 0, win: 0, devices: 0 };
  const catOrder = Object.fromEntries(c.categories.map((x, i) => [x.id, i]));
  let topics = c.topics.filter((t) => !q.trim() || t.name.includes(q.trim()));
  if (sort === "hard") topics.sort((x, y) => { const A = stat(x), B = stat(y), ea = A.attempts < 5, eb = B.attempts < 5; if (ea !== eb) return ea ? 1 : -1; return A.ok / (A.attempts || 1) - B.ok / (B.attempts || 1); });
  else if (sort === "busy") topics.sort((x, y) => stat(y).attempts - stat(x).attempts);
  else topics.sort((x, y) => ((catOrder[x.category_id] ?? 99) - (catOrder[y.category_id] ?? 99)) || x.position - y.position);
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  let lastCat = null;

  return (
    <>
      <PageHead tools={tools} />
      <div className="kpis three">
        <Kpi tone="blue" icon={<Target size={17} />} label="הצלחה כללית" value={pct(tot.ok, tot.ok + tot.bad) == null ? "—" : <><CountUp value={pct(tot.ok, tot.ok + tot.bad)} />%</>} sub={`${fmt(tot.ok)} נכונות · ${fmt(tot.bad)} שגויות`} />
        <Kpi icon={<Info size={17} />} label="הנושא הקשה ביותר" value={<span className="kpi-text">{tps[0] ? topicOf(c, tps[0].page).name : "—"}</span>} sub={tps[0] ? `${pct(tps[0].ok, tps[0].attempts)}% הצלחה` : "עוד אין מספיק נתונים"} />
        <Kpi icon={<Info size={17} />} label="הפרק הקשה ביותר" value={<span className="kpi-text">{chs[0] ? chs[0].chapter || "—" : "—"}</span>} sub={chs[0] ? `${topicOf(c, chs[0].page).name} · ${pct(chs[0].ok, chs[0].ok + chs[0].bad)}% הצלחה` : "עוד אין מספיק נתונים"} />
      </div>

      <div className="bento mt">
        <Card title="נכון מול שגוי, לפי יום" className="span-8" action={<div className="legend"><span><i style={{ background: "var(--ok-c)" }} />✓ נכון</span><span><i style={{ background: "var(--bad-c)" }} />✗ שגוי</span></div>}>
          <StackedBars data={s.daily} />
        </Card>
        <Card title="דירוג קושי" sub="אחוז תשובות שגויות, מהגבוה" className="span-4">
          {tps.length ? <BarList color="var(--bad-c)" format={(v) => v + "%"} rows={tps.slice(0, 6).map((t) => { const tp = topicOf(c, t.page); return { key: tp.name, value: 100 - pct(t.ok, t.attempts), icon: <TopicIcon t={tp} size="xs" /> }; })} />
            : <Empty icon={<Target size={28} />} title="עוד אין מספיק נתונים" />}
        </Card>
      </div>

      <Card className="mt" title="כל הנושאים" sub="לחיצה על נושא פותחת פרקים, ועל פרק פותחת שלבים">
        <div className="toolbar">
          <label className="search"><MagnifyingGlass size={18} /><input className="inp" type="search" placeholder="חיפוש נושא" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש נושא" /></label>
          <Seg value={sort} onChange={setSort} label="מיון" options={[["hard", "הכי קשה"], ["busy", "הכי מתורגל"], ["order", "לפי התוכן"]]} />
        </div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>נושא</th><th className="n">תשובות</th><th className="n">✓ נכון</th><th className="n">✗ שגוי</th><th>הצלחה</th><th>רמה</th><th className="n">נפתרו</th><th className="n">תלמידים</th></tr></thead>
          <tbody>
            {topics.map((t) => {
              const st = stat(t), isOpen = open[t.page];
              const head = sort === "order" && t.category_id !== lastCat ? (lastCat = t.category_id, <tr className="cat-row"><td colSpan={8}>{(c.categories.find((x) => x.id === t.category_id) || {}).name || "ללא קטגוריה"}</td></tr>) : null;
              const list = isOpen ? s.chapters.filter((x) => x.page === t.page).sort((x, y) => x.chapter.localeCompare(y.chapter, "he", { numeric: true })) : [];
              return (
                <Fragment key={t.id}>
                  {head}
                  <tr className={"click" + (isOpen ? " open" : "")} onClick={() => toggle(t.page)}>
                    <td><div className="tname"><CaretLeft size={15} className="chev" /><TopicIcon t={t} /><b>{t.name}</b></div></td>
                    <td className="n">{fmt(st.attempts)}</td><td className="n">{fmt(st.ok)}</td><td className="n">{fmt(st.bad)}</td>
                    <td><Meter value={pct(st.ok, st.attempts)} /></td><td><Level ok={st.ok} bad={st.bad} /></td><td className="n">{fmt(st.win)}</td><td className="n">{fmt(st.devices)}</td>
                  </tr>
                  {isOpen && !list.length && <tr className="sub"><td colSpan={8} className="muted" style={{ paddingInlineStart: 52 }}>עוד אין תשובות בנושא הזה בתקופה שנבחרה</td></tr>}
                  {list.map((ch) => {
                    const key = t.page + "|" + ch.chapter, o2 = open[key], n = ch.ok + ch.bad;
                    return (
                      <Fragment key={key}>
                        <tr className={"sub click" + (o2 ? " open" : "")} onClick={() => toggle(key)}>
                          <td><div className="tname" style={{ paddingInlineStart: 28 }}><CaretLeft size={15} className="chev" /><span>{ch.chapter || "ללא פרק"}</span></div></td>
                          <td className="n">{fmt(n)}</td><td className="n">{fmt(ch.ok)}</td><td className="n">{fmt(ch.bad)}</td><td><Meter value={pct(ch.ok, n)} /></td><td><Level ok={ch.ok} bad={ch.bad} /></td><td className="n">{fmt(ch.win)}</td><td className="n">{fmt(ch.devices)}</td>
                        </tr>
                        {o2 && s.steps.filter((x) => x.page === t.page && x.chapter === ch.chapter).sort((x, y) => x.ok / ((x.ok + x.bad) || 1) - y.ok / ((y.ok + y.bad) || 1)).slice(0, 10).map((stp) => {
                          const m = stp.ok + stp.bad;
                          return <tr key={key + stp.step} className="sub2"><td><div style={{ paddingInlineStart: 66 }}>{stp.step || "—"}</div></td><td className="n">{fmt(m)}</td><td className="n">{fmt(stp.ok)}</td><td className="n">{fmt(stp.bad)}</td><td><Meter value={pct(stp.ok, m)} /></td><td><Level ok={stp.ok} bad={stp.bad} /></td><td /><td /></tr>;
                        })}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
            {!topics.length && <tr><td colSpan={8}><Empty icon={<MagnifyingGlass size={28} />} title="לא נמצא נושא" /></td></tr>}
          </tbody>
        </table></div>
        <p className="note mt-s">"רמה" לפי אחוז ההצלחה: מתחת ל-60% קשה, 60–80% בינוני, מעל 80% קל.</p>
      </Card>
    </>
  );
}
