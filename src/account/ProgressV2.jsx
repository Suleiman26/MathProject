'use client';
/* Profile v2 pieces: points + player level, weekly goal ring, last 7 days chart,
   achievements (badges) and personal records. Styles: src/styles/account.css (pv-*) */
import { useMemo, useState } from "react";
import { accountApi } from "@/lib/account";
import { BADGES, fmt, lastDays, playerLevel, rankOf, weekStats, xpOf } from "@/lib/progress";

const DAY_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const dateLong = (d) => new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "long" });

/* ── points and player level (in the profile hero) ────────────────────── */
export function XpBar({ totals }) {
  const p = playerLevel(xpOf(totals));
  return (
    <div className="pv-xp" title="10 נקודות על כל תרגיל שפתרת עד הסוף, ונקודה על כל צעד נכון">
      <span className="pv-xp-lv" aria-hidden="true"><small>רמה</small><b>{p.L}</b></span>
      <div className="pv-xp-main">
        <div className="pv-xp-t"><b>{rankOf(p.L)}</b><span>{fmt(p.xp)} נק׳</span></div>
        <div className="pv-xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={p.cost} aria-valuenow={p.into} aria-label={`רמה ${p.L}: עוד ${p.toNext} נקודות לרמה ${p.L + 1}`}>
          <i style={{ width: Math.max(3, Math.round(p.pct * 100)) + "%" }} />
        </div>
        <small>עוד {fmt(p.toNext)} נק׳ לרמה {p.L + 1}</small>
      </div>
    </div>
  );
}

/* ── weekly goal: practice days this week (Sunday–Saturday) ───────────── */
export function WeekGoal({ account, data }) {
  const [goal, setGoal] = useState(account.weekly_goal || 4);
  const [busy, setBusy] = useState(false);
  const { now, prev } = useMemo(() => weekStats(data.days, data.today), [data]);
  const done = Math.min(now.active, goal);
  const reached = now.active >= goal;
  async function change(d) {
    const g = Math.max(1, Math.min(7, goal + d));
    if (g === goal) return;
    setGoal(g); setBusy(true);
    try { await accountApi.setGoal(g); } catch { setGoal(goal); } finally { setBusy(false); }
  }
  // ring: one arc per goal day, a small gap between arcs
  const R = 46, C = 2 * Math.PI * R, gap = goal > 1 ? 6 : 0, arc = C / goal - gap;
  const answers = now.ok + now.bad, pAnswers = prev.ok + prev.bad;
  const diff = pAnswers ? Math.round(((answers - pAnswers) / pAnswers) * 100) : null;
  return (
    <section className={"pf-card pv-goal" + (reached ? " reached" : "")} aria-labelledby="goal-h">
      <div className="pf-card-h"><h2 id="goal-h">היעד השבועי</h2><p>{reached ? "עמדת ביעד השבוע! 🎉" : `עוד ${fmt(goal - now.active)} ${goal - now.active === 1 ? "יום" : "ימים"} של תרגול השבוע`}</p></div>
      <div className="pv-goal-body">
        <div className="pv-ring">
          <svg viewBox="0 0 120 120" role="img" aria-label={`${now.active} מתוך ${goal} ימי תרגול השבוע`}>
            {Array.from({ length: goal }, (_, k) => (
              <circle key={k} cx="60" cy="60" r={R} className={k < done ? "on" : ""} style={{ "--k": k }}
                strokeDasharray={`${arc} ${C - arc}`} strokeDashoffset={-(k * (C / goal)) - gap / 2} />
            ))}
          </svg>
          <div className="pv-ring-c"><b>{fmt(now.active)}</b><span>{now.active === 1 ? "יום" : "ימים"} מתוך {fmt(goal)}</span></div>
        </div>
        <div className="pv-goal-side">
          <ol className="pv-week" aria-label="ימי השבוע">
            {now.list.map((d, k) => {
              const on = d.r && d.r.ok + d.r.bad + d.r.win > 0;
              return <li key={d.key} className={(on ? "on" : "") + (d.future ? " fut" : "") + (d.key === data.today ? " today" : "")} title={dateLong(d.dt)}><i aria-hidden="true">{on ? "✓" : ""}</i><span>{DAY_SHORT[k]}</span></li>;
            })}
          </ol>
          <div className="pv-step">
            <span>יעד:</span>
            <button type="button" onClick={() => change(-1)} disabled={busy || goal <= 1} aria-label="פחות ימים">−</button>
            <b aria-live="polite">{fmt(goal)} ימים בשבוע</b>
            <button type="button" onClick={() => change(1)} disabled={busy || goal >= 7} aria-label="יותר ימים">+</button>
          </div>
        </div>
      </div>
      <div className="pv-vs">
        <div><small>השבוע</small><b>{fmt(answers)}</b><span>תשובות · {fmt(now.win)} נפתרו</span></div>
        <div><small>שבוע שעבר</small><b>{fmt(pAnswers)}</b><span>תשובות · {fmt(prev.win)} נפתרו</span></div>
        {diff != null && <em className={diff >= 0 ? "up" : "down"}>{diff >= 0 ? "▲" : "▼"} {Math.abs(diff)}%</em>}
      </div>
    </section>
  );
}

/* ── last 7 days: correct vs wrong answers per day (stacked bars) ─────── */
export function LastDays({ data }) {
  const days = useMemo(() => lastDays(data.days, data.today, 7), [data]);
  const [tip, setTip] = useState(null);
  const max = Math.max(4, ...days.map((d) => d.ok + d.bad));
  const step = max <= 10 ? 2 : max <= 25 ? 5 : max <= 60 ? 10 : max <= 150 ? 25 : 50;
  const top = Math.ceil(max / (2 * step)) * 2 * step;     // two equal whole-number steps
  const ticks = [0, top / 2, top];
  const H = 150;
  const total = days.reduce((s, d) => s + d.ok + d.bad, 0);
  const best = days.reduce((m, d, i) => (d.ok + d.bad > days[m].ok + days[m].bad ? i : m), 0);
  return (
    <section className="pf-card pv-7" aria-labelledby="d7-h">
      <div className="pf-card-h"><h2 id="d7-h">7 הימים האחרונים</h2><p>{total ? `${fmt(total)} תשובות` : "עוד אין תשובות השבוע"}</p></div>
      <ul className="pv-legend" aria-hidden="true"><li><i className="ok" />נכונות</li><li><i className="bad" />טעויות</li></ul>
      <div className="pv-chart" onMouseLeave={() => setTip(null)}>
        <div className="pv-y" aria-hidden="true">{ticks.slice().reverse().map((t) => <span key={t}>{fmt(t)}</span>)}</div>
        <div className="pv-plot" style={{ height: H }}>
          {ticks.map((t) => <i key={t} className="pv-grid" style={{ bottom: (t / top) * 100 + "%" }} aria-hidden="true" />)}
          {days.map((d, i) => {
            const okH = (d.ok / top) * H, badH = (d.bad / top) * H, n = d.ok + d.bad;
            const isToday = d.key === data.today;
            return (
              <button key={d.key} type="button" className={"pv-col" + (isToday ? " today" : "") + (tip === i ? " on" : "")} style={{ "--i": i }}
                onMouseEnter={() => setTip(i)} onFocus={() => setTip(i)} onClick={() => setTip(tip === i ? null : i)} onBlur={() => setTip(null)}
                aria-label={`${dateLong(d.dt)}: ${d.ok} נכונות, ${d.bad} טעויות, ${d.win} נפתרו`}>
                <span className="pv-stack">
                  {d.bad > 0 && <span className="bad" style={{ height: badH }} />}
                  {d.ok > 0 && <span className="ok" style={{ height: okH }} />}
                </span>
                {(i === best || isToday) && n > 0 && <b className="pv-val" style={{ bottom: okH + badH + (d.ok && d.bad ? 2 : 0) + 4 }}>{fmt(n)}</b>}
                {tip === i && (
                  <span className="pv-tip" role="tooltip">
                    <b>{d.dt.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "short" })}</b>
                    <span><i className="ok" />{fmt(d.ok)} נכונות</span>
                    <span><i className="bad" />{fmt(d.bad)} טעויות</span>
                    {d.win > 0 && <span>✓ {fmt(d.win)} תרגילים נפתרו</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="pv-x" aria-hidden="true">{days.map((d) => <span key={d.key} className={d.key === data.today ? "today" : ""}>{d.key === data.today ? "היום" : DAY_SHORT[d.dt.getDay()]}</span>)}</div>
      </div>
      <table className="sr-only">
        <caption>תשובות ב-7 הימים האחרונים</caption>
        <thead><tr><th>יום</th><th>נכונות</th><th>טעויות</th><th>נפתרו</th></tr></thead>
        <tbody>{days.map((d) => <tr key={d.key}><td>{dateLong(d.dt)}</td><td>{d.ok}</td><td>{d.bad}</td><td>{d.win}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

/* ── achievements ─────────────────────────────────────────────────────── */
export function Achievements({ ach }) {
  const [all, setAll] = useState(false);
  if (ach === false) return null;
  if (!ach) return <section className="pf-card pv-ach" aria-hidden="true"><div className="pv-ach-skel" /></section>;
  const list = ach.badges.filter((b) => BADGES[b.id] && !(b.id === "grade" && !b.need));
  const got = list.filter((b) => b.at);
  const locked = list.filter((b) => !b.at).sort((a, b) => b.have / b.need - a.have / a.need);
  const shown = all ? [...got, ...locked] : [...got, ...locked].slice(0, Math.max(6, got.length + 2));
  return (
    <section className="pf-card pv-ach" aria-labelledby="ach-h">
      <div className="pf-card-h">
        <h2 id="ach-h">הישגים</h2>
        <p><b>{fmt(got.length)}</b> מתוך {fmt(list.length)}</p>
      </div>
      <ul className="pv-badges">
        {shown.map((b, i) => {
          const m = BADGES[b.id];
          const pct = Math.min(1, b.have / b.need);
          return (
            <li key={b.id} className={"pv-badge " + (b.at ? "got t-" + m.tone : "locked")} style={{ "--i": i }}>
              <span className="pv-medal" aria-hidden="true"><span>{m.icon}</span>{!b.at && <i className="lock">🔒</i>}</span>
              <b>{m.name}</b>
              {b.at ? <small>{dateLong(b.at)}</small> : <>
                <small>{m.how}</small>
                {b.need > 1 && <span className="pv-prog" aria-label={`${b.have} מתוך ${b.need}`}><i style={{ width: Math.round(pct * 100) + "%" }} /><em>{fmt(Math.min(b.have, b.need))}/{fmt(b.need)}</em></span>}
              </>}
            </li>
          );
        })}
      </ul>
      {got.length + locked.length > shown.length && <button type="button" className="pf-more" onClick={() => setAll(true)}>כל ההישגים ({fmt(list.length)})</button>}
      {all && <button type="button" className="pf-more" onClick={() => setAll(false)}>פחות</button>}
    </section>
  );
}

/* ── personal records ─────────────────────────────────────────────────── */
export function Records({ ach, data }) {
  if (!ach || !ach.records) return null;
  const r = ach.records;
  const items = [
    { k: "day", icon: "📅", label: "היום הכי טוב", v: r.best_day ? fmt(r.best_day.win) : "—", sub: r.best_day ? `תרגילים ב-${dateLong(r.best_day.day + "T12:00:00")}` : "עוד אין" },
    { k: "streak", icon: "🔥", label: "הרצף הארוך", v: fmt(r.best_streak), sub: r.best_streak === 1 ? "יום" : "ימים ברצף" + (data.streak && data.streak === r.best_streak ? " · עכשיו!" : "") },
    { k: "sess", icon: "⏱️", label: "הכי הרבה בישיבה אחת", v: r.best_session ? fmt(r.best_session.win) : "—", sub: r.best_session ? `תרגילים · ${dateLong(r.best_session.at)}` : "עוד אין" },
    { k: "run", icon: "🎯", label: "תשובות נכונות ברצף", v: fmt(r.best_run), sub: "באותו פרק, בלי טעות" },
  ];
  return (
    <section className="pv-recs" aria-label="שיאים אישיים">
      <h2 className="pv-recs-h"><span aria-hidden="true">🏆</span> השיאים שלי</h2>
      <div className="pv-recs-g">
        {items.map((x, i) => (
          <div key={x.k} className={"pv-rec " + x.k} style={{ "--i": i }}>
            <span className="pv-rec-i" aria-hidden="true">{x.icon}</span>
            <small>{x.label}</small>
            <b>{x.v}</b>
            <span>{x.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
