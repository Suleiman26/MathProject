'use client';
/* /profile/<topic>: one topic in detail — level, chapters with accuracy,
   the steps with most mistakes, and a 60-day history. Styles: account.css (td-*) */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { accountApi, useAccount } from "@/lib/account";
import { iconSvg } from "@/lib/icons";
import { TOPICS } from "@/home/catalog";
import { chapterStats, chapterTitle } from "@/home/chapters";
import { ago, dayKey, fmt, levelOf, LEVEL_NAME } from "@/lib/progress";
import { AcctShell, Spinner } from "./ui";

const Icon = ({ k }) => <span className="td-ic" dangerouslySetInnerHTML={{ __html: iconSvg(k) }} />;

export default function TopicDetail({ slug }) {
  const router = useRouter();
  const { ready, account } = useAccount();
  const t = TOPICS.find((x) => x.slug === slug);
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { if (ready && (!account || account.needs_terms)) router.replace("/login"); }, [ready, account, router]);
  useEffect(() => {
    if (!ready || !account || !t) return;
    accountApi.topic(slug).then(setD).catch(() => setErr("לא הצלחנו לטעון. נסו לרענן."));
  }, [ready, account && account.id, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t) return <AcctShell wide back="/profile"><div className="pf-card"><h2>הנושא לא נמצא</h2><Link href="/profile">חזרה לפרופיל</Link></div></AcctShell>;
  if (!ready || !account || (!d && !err)) return <AcctShell wide back="/profile"><div className="pf-loading"><Spinner /></div></AcctShell>;

  return (
    <AcctShell wide back="/profile">
      <div className="pf td" data-topic={t.color}>
        {err ? <div className="acct-alert" role="alert">{err}</div> : <Detail t={t} d={d} />}
      </div>
    </AcctShell>
  );
}

function Detail({ t, d }) {
  const tot = d.totals;
  const lv = levelOf(tot.win);
  const tries = tot.ok + tot.bad;
  const acc = tries >= 5 ? Math.round((tot.ok / tries) * 100) : null;
  const ch = chapterStats(t.slug, d.chapters).filter((c) => c.known || c.n + c.win > 0);
  const started = tries + tot.win > 0;
  return (
    <>
      <section className="td-hero">
        <div className="pf-hero-bg" aria-hidden="true" />
        <Icon k={t.icon} />
        <div className="td-id">
          <h1>{t.name}</h1>
          <p>{started ? <>רמה: <b>{lv.name}</b>{lv.next ? ` · עוד ${fmt(lv.toNext)} תרגילים ל${LEVEL_NAME[lv.i + 1]}` : " · הרמה הגבוהה ביותר"}</> : "עוד לא התחלת את הנושא"}</p>
          <div className="td-lvbar" aria-hidden="true">{[1, 2, 3, 4].map((k) => <i key={k} className={lv.i >= k ? "on" : lv.i + 1 === k ? "part" : ""} style={lv.i + 1 === k ? { "--p": lv.pct } : undefined}><span>{LEVEL_NAME[k]}</span></i>)}</div>
        </div>
        <Link href={`/topics/${t.slug}`} className="td-go">{started ? "להמשיך לתרגל" : "להתחיל"}</Link>
      </section>

      {started && <section className="pf-kpis">
        {[
          { k: "win", icon: "✓", label: "נפתרו", v: fmt(tot.win) },
          { k: "acc", icon: "◎", label: "דיוק", v: acc == null ? "—" : acc + "%" },
          { k: "days", icon: "▦", label: "ימי תרגול", v: fmt(tot.days) },
          { k: "streak", icon: "🕒", label: "תרגול אחרון", v: tot.last ? ago(tot.last) : "—", small: true },
        ].map((x, i) => (
          <div key={x.k} className={"pf-kpi " + x.k} style={{ "--i": i }}>
            <div className="pf-kpi-t"><span className="pf-kpi-i" aria-hidden="true">{x.icon}</span>{x.label}</div>
            <div className={"pf-kpi-v" + (x.small ? " sm" : "")}>{x.v}</div>
          </div>
        ))}
      </section>}

      <div className="pf-cols even">
        {ch.length > 0 && <section className="pf-card td-ch" aria-labelledby="tdc-h">
          <div className="pf-card-h"><h2 id="tdc-h">פרקים</h2><p>{fmt(ch.filter((c) => c.win > 0).length)} מתוך {fmt(ch.filter((c) => c.known).length)} עם תרגיל פתור</p></div>
          <ol>
            {ch.map((c) => {
              const tone = c.acc == null ? "" : c.acc >= 80 ? "good" : c.acc >= 60 ? "mid" : "low";
              return (
                <li key={c.name} className={c.state}>
                  <span className="td-num" aria-hidden="true">{c.state === "solved" ? "✓" : c.i + 1}</span>
                  <div className="td-chm">
                    <b>{chapterTitle(c.name)}</b>
                    <small>{c.win ? (c.win === 1 ? "נפתר 1" : `${fmt(c.win)} נפתרו`) : c.n ? "התחלת" : "עוד לא"}{c.last ? ` · ${ago(c.last)}` : ""}</small>
                  </div>
                  <div className={"td-acc " + tone}>
                    {c.acc == null ? <small>{c.n ? "מעט תשובות" : "—"}</small> : <>
                      <span className="bar" aria-hidden="true"><i style={{ width: c.acc + "%" }} /></span>
                      <b>{c.acc}%</b>
                    </>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>}
        <Mistakes list={d.mistakes} />
      </div>
      <History days={d.days} today={d.today} />
    </>
  );
}

function Mistakes({ list }) {
  return (
    <section className="pf-card td-mis" aria-labelledby="tdm-h">
      <div className="pf-card-h"><h2 id="tdm-h">איפה טועים הכי הרבה</h2></div>
      {!list.length ? <p className="td-none">אין כאן טעויות שחוזרות. יפה מאוד! 🎉</p> : (
        <ol>
          {list.map((m, i) => {
            const n = m.ok + m.bad;
            return (
              <li key={i}>
                <span className="td-rank" aria-hidden="true">{i + 1}</span>
                <div>
                  <b>{m.step}</b>
                  <small>{m.chapter ? chapterTitle(m.chapter.split(" › ")[0]) + (m.chapter.includes(" › ") ? " · " + m.chapter.split(" › ").pop() : "") : ""}</small>
                </div>
                <span className="td-bad"><b>{m.bad === 1 ? "טעות אחת" : `${fmt(m.bad)} טעויות`}</b><small>{n ? `${Math.round((m.ok / n) * 100)}% הצלחה` : ""}</small></span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/* solved per day, last 30 days: a single line with a soft area, hover crosshair */
function History({ days, today }) {
  const [hov, setHov] = useState(null);
  const pts = useMemo(() => {
    const map = Object.fromEntries((days || []).map((x) => [x.day, x]));
    const end = new Date(today + "T12:00:00");
    return Array.from({ length: 30 }, (_, k) => {
      const dt = new Date(end); dt.setDate(end.getDate() - (29 - k));
      const r = map[dayKey(dt)] || { ok: 0, bad: 0, win: 0 };
      return { dt, ...r };
    });
  }, [days, today]);
  const W = 600, H = 150, P = 8;
  const max = Math.max(3, ...pts.map((p) => p.win));
  const x = (i) => P + (i / 29) * (W - 2 * P), y = (v) => H - 18 - (v / max) * (H - 36);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.win).toFixed(1)}`).join(" ");
  const area = `${line} L${x(29)},${H - 18} L${x(0)},${H - 18} Z`;
  const total = pts.reduce((s, p) => s + p.win, 0);
  const h = hov != null ? pts[hov] : null;
  function move(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;           // the chart reads right→left (oldest on the right)
    setHov(Math.max(0, Math.min(29, Math.round((1 - f) * 29))));
  }
  return (
    <section className="pf-card td-hist" aria-labelledby="tdh-h">
      <div className="pf-card-h"><h2 id="tdh-h">30 הימים האחרונים</h2><p>{fmt(total)} תרגילים נפתרו</p></div>
      <div className="td-chart" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHov(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`תרגילים שנפתרו ביום, 30 הימים האחרונים. סך הכל ${total}`} style={{ transform: "scaleX(-1)" }}>
          <line x1={P} x2={W - P} y1={H - 18} y2={H - 18} className="base" />
          <line x1={P} x2={W - P} y1={y(max)} y2={y(max)} className="grid" />
          <path d={area} className="area" />
          <path d={line} className="line" vectorEffect="non-scaling-stroke" />
          {h && <line x1={x(hov)} x2={x(hov)} y1={10} y2={H - 18} className="cross" vectorEffect="non-scaling-stroke" />}
        </svg>
        {h && <span className="td-dot" style={{ right: `${(x(hov) / W) * 100}%`, top: `${(y(h.win) / H) * 100}%` }} aria-hidden="true" />}
        {h && <span className="pf-tip td-tip" style={{ right: `${(x(hov) / W) * 100}%`, top: `${(y(h.win) / H) * 100}%` }}>
          <b>{h.dt.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" })}</b>
          <span>{fmt(h.win)} נפתרו · {fmt(h.ok)} ✓ · {fmt(h.bad)} ✗</span>
        </span>}
        <span className="td-ymax" aria-hidden="true">{fmt(max)}</span>
        <div className="td-x" aria-hidden="true"><span>לפני 30 יום</span><span>לפני שבועיים</span><span>היום</span></div>
      </div>
    </section>
  );
}
