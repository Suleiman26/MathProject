'use client';
/* Signed-in home: the student's grade as a railway of topics (stations), with
   their level at every station, where they are now, and what is worth
   strengthening. Styles: src/styles/journey.css */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { iconSvg } from "@/lib/icons";
import { Avatar } from "@/account/ui";

const LEVELS = [0, 1, 5, 15, 30];                         // solved exercises → level 0..4
const LEVEL_NAME = ["עוד לא התחלת", "התחלה", "התקדמות", "שליטה", "מומחיות"];
const fmt = (n) => Number(n || 0).toLocaleString("he-IL");
const slugOf = (page) => (page || "").replace(/\.html$/, "");
const lastPart = (ch) => (ch || "").split(" › ").pop().replace(/^[0-9א-ת]{1,2}[.)]\s*/, "");

export function levelOf(win) {
  let i = 0;
  LEVELS.forEach((m, k) => { if (win >= m) i = k; });
  const next = LEVELS[i + 1];
  return { i, name: LEVEL_NAME[i], next, toNext: next ? next - win : 0, pct: next ? (win - LEVELS[i]) / (next - LEVELS[i]) : 1 };
}
const Icon = ({ k }) => <span className="jr-ic" dangerouslySetInnerHTML={{ __html: iconSvg(k) }} />;
const Stars = ({ n }) => (
  <span className="jr-stars" aria-label={`${n} מתוך 3 כוכבים`}>
    {[1, 2, 3].map((s) => <i key={s} className={s <= n ? "on" : ""} aria-hidden="true">★</i>)}
  </span>
);

/* ── strengths and what to strengthen ─────────────────────────────────────── */
export function Insights({ progress, topics }) {
  const bySlug = Object.fromEntries(topics.map((t) => [t.slug, t]));
  const strong = (progress.topics || [])
    .map((t) => ({ ...t, slug: slugOf(t.page), n: t.ok + t.bad }))
    .filter((t) => bySlug[t.slug] && t.n >= 8 && t.ok / t.n >= 0.8)
    .sort((a, b) => b.win - a.win || b.ok / b.n - a.ok / a.n).slice(0, 3);
  const weak = (progress.chapters || [])
    .map((c) => ({ ...c, slug: slugOf(c.page), n: c.ok + c.bad }))
    .filter((c) => bySlug[c.slug] && c.n >= 4 && c.ok / c.n < 0.65)
    .sort((a, b) => a.ok / a.n - b.ok / b.n || b.bad - a.bad).slice(0, 3);
  const any = (progress.totals.ok + progress.totals.bad) > 0;

  if (!any) {
    return (
      <section className="jr-ins jr-ins-empty">
        <span aria-hidden="true">🧭</span>
        <p><b>כאן יופיעו החוזקות שלך ומה כדאי לחזק.</b> מתחילים בתחנה הראשונה במסלול, ואחרי כמה תרגילים נראה את התמונה.</p>
      </section>
    );
  }
  return (
    <section className="jr-ins" aria-label="חוזקות ומה לחזק">
      <div className="jr-card good">
        <div className="jr-card-h"><span aria-hidden="true">💪</span><h2>החוזקות שלך</h2></div>
        {strong.length ? (
          <ul>
            {strong.map((t) => (
              <li key={t.slug} data-topic={bySlug[t.slug].color}>
                <Icon k={bySlug[t.slug].icon} />
                <span className="jr-ins-t"><b>{bySlug[t.slug].name}</b><small>{Math.round((t.ok / t.n) * 100)}% נכון · {fmt(t.win)} נפתרו</small></span>
              </li>
            ))}
          </ul>
        ) : <p className="jr-ins-none">עוד מעט! נושא נכנס לכאן אחרי 8 תשובות עם 80% הצלחה ומעלה.</p>}
      </div>
      <div className="jr-card warn">
        <div className="jr-card-h"><span aria-hidden="true">🎯</span><h2>כדאי לחזק</h2></div>
        {weak.length ? (
          <ul>
            {weak.map((c) => (
              <li key={c.page + c.chapter} data-topic={bySlug[c.slug].color}>
                <Icon k={bySlug[c.slug].icon} />
                <span className="jr-ins-t"><b>{lastPart(c.chapter) || bySlug[c.slug].name}</b><small>{bySlug[c.slug].name} · {Math.round((c.ok / c.n) * 100)}% נכון</small></span>
                <Link className="jr-ins-go" href={`/topics/${c.slug}`}>לתרגל</Link>
              </li>
            ))}
          </ul>
        ) : <p className="jr-ins-none">אין כרגע פרק חלש. כל הכבוד! 🎉</p>}
      </div>
    </section>
  );
}

/* ── the railway ──────────────────────────────────────────────────────────── */
export function Railway({ topics, progress, account, gradeName }) {
  const box = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setW(el.clientWidth);
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stats = useMemo(() => Object.fromEntries((progress.topics || []).map((t) => [slugOf(t.page), t])), [progress]);
  const stations = topics.map((t) => {
    const s = stats[t.slug] || { ok: 0, bad: 0, win: 0 };
    const n = s.ok + s.bad;
    return { ...t, s, started: s.ok + s.bad + s.win > 0, lv: levelOf(s.win), acc: n >= 5 ? Math.round((s.ok / n) * 100) : null };
  });
  // "you are here": the station practised most recently; a new student starts at the first one
  // (only stations with real answers count: just opening a topic doesn't move you there)
  let here = 0, lastAt = 0;
  stations.forEach((st, i) => { const t = st.started && st.s.last ? new Date(st.s.last).getTime() : 0; if (t > lastAt) { lastAt = t; here = i; } });
  const furthest = stations.reduce((m, st, i) => (st.started ? i : m), -1);
  const startedCount = stations.filter((s) => s.started).length;
  const mastered = stations.filter((s) => s.lv.i >= 3).length;

  // geometry: stations zig-zag down the page, first one on the right (reading direction)
  const narrow = w < 560;
  const H = narrow ? 150 : 180, TOP = 104, R = narrow ? 34 : 42;
  const xs = (i) => (i % 2 === 0 ? w * (narrow ? 0.76 : 0.78) : w * (narrow ? 0.24 : 0.22));
  const pts = stations.map((_, i) => [xs(i), TOP + i * H]);
  const flag = [w / 2, TOP + stations.length * H - H * 0.25];
  const seg = (a, b) => `M${a[0]},${a[1]} C${a[0]},${a[1] + H * 0.55} ${b[0]},${b[1] - H * 0.55} ${b[0]},${b[1]}`;
  const all = [...pts, flag];
  const full = all.slice(1).map((p, i) => seg(all[i], p)).join(" ");
  const lit = furthest > 0 ? pts.slice(1, furthest + 1).map((p, i) => seg(pts[i], p)).join(" ") : "";
  const height = flag[1] + 70;

  return (
    <section className="jr" aria-labelledby="jr-h">
      <header className="jr-head">
        <div>
          <h2 id="jr-h">המסלול שלי · {gradeName}</h2>
          <p>{startedCount ? `התחלת ${fmt(startedCount)} מתוך ${fmt(stations.length)} תחנות` : `${fmt(stations.length)} תחנות בדרך. התחנה הראשונה מחכה לך`}{mastered ? ` · ${fmt(mastered)} בשליטה` : ""}</p>
        </div>
        <div className="jr-meter" role="progressbar" aria-valuemin={0} aria-valuemax={stations.length} aria-valuenow={startedCount} aria-label="תחנות שהתחלת">
          <i style={{ width: (stations.length ? (startedCount / stations.length) * 100 : 0) + "%" }} />
        </div>
      </header>

      <div className="jr-map" ref={box} style={{ height: w ? height : 400 }}>
        {w > 0 && <>
          <svg className="jr-track" width={w} height={height} viewBox={`0 0 ${w} ${height}`} aria-hidden="true">
            <defs>
              <linearGradient id="jr-lit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--jr-a)" /><stop offset="1" stopColor="var(--jr-b)" />
              </linearGradient>
            </defs>
            {/* sleepers + two rails (a wide line, then a narrower one in the background colour) */}
            <path d={full} className="ties" />
            <path d={full} className="rail" />
            <path d={full} className="gap" />
            {lit && <>
              <path d={lit} className="ties lit" />
              <path d={lit} className="rail lit" pathLength="1" />
              <path d={lit} className="gap lit" pathLength="1" />
            </>}
            <circle cx={pts[0] ? pts[0][0] : 0} cy={TOP - 78} r="5" className="start-dot" />
            <path d={pts[0] ? `M${pts[0][0]},${TOP - 78} L${pts[0][0]},${TOP - R - 8}` : ""} className="start-line" />
          </svg>
          <span className="jr-start" style={{ left: pts[0] ? pts[0][0] : 0, top: TOP - 100 }}>יציאה</span>

          {stations.map((st, i) => {
            const [x, y] = pts[i];
            const right = i % 2 === 0;
            const isHere = i === here;
            const circ = 2 * Math.PI * (R + 6);
            const state = st.lv.i >= 3 ? "gold" : st.started ? "on" : "off";
            return (
              <div key={st.slug} className={`jr-st ${state}${isHere ? " here" : ""}`} data-topic={st.color} style={{ "--i": i }}>
                <Link href={`/topics/${st.slug}`} className="jr-node" style={{ left: x - R, top: y - R, width: R * 2, height: R * 2 }}
                  aria-label={`${st.name}: ${st.lv.name}${isHere ? " (את/ה כאן)" : ""}`}>
                  <svg className="jr-ring" viewBox={`0 0 ${2 * (R + 9)} ${2 * (R + 9)}`} style={{ left: -9, top: -9, width: 2 * (R + 9), height: 2 * (R + 9) }} aria-hidden="true">
                    <circle cx={R + 9} cy={R + 9} r={R + 6} className="bg" />
                    {st.started && <circle cx={R + 9} cy={R + 9} r={R + 6} className="fg" style={{ strokeDasharray: `${circ * st.lv.pct} ${circ}` }} />}
                  </svg>
                  <Icon k={st.icon} />
                  {st.lv.i >= 3 && <span className="jr-crown" aria-hidden="true">👑</span>}
                  {isHere && <span className="jr-me"><Avatar account={account} size={narrow ? 28 : 32} /></span>}
                </Link>
                <div className={"jr-label " + (right ? "to-left" : "to-right")}
                  style={right ? { right: w - x + R + 14, top: y - 34, maxWidth: x - R - 14 - 4 } : { left: x + R + 14, top: y - 34, maxWidth: w - (x + R + 14) - 4 }}>
                  {isHere && <span className="jr-here">{st.started ? "את/ה כאן" : "מתחילים כאן"}</span>}
                  <b>{st.name}</b>
                  {st.started ? <>
                    <span className="jr-lv"><Stars n={Math.max(0, st.lv.i - 1)} /> {st.lv.name}</span>
                    <small>{fmt(st.s.win)} נפתרו{st.acc != null ? ` · ${st.acc}% נכון` : ""}{st.lv.next ? ` · עוד ${fmt(st.lv.toNext)} ל${LEVEL_NAME[st.lv.i + 1]}` : ""}</small>
                  </> : <small className="muted">עוד לא התחלת</small>}
                </div>
              </div>
            );
          })}

          <div className={"jr-flag" + (startedCount === stations.length && stations.length ? " done" : "")} style={{ left: flag[0] - 30, top: flag[1] - 30 }}>
            <span aria-hidden="true">🏁</span>
          </div>
          <span className="jr-flag-t" style={{ left: flag[0], top: flag[1] + 36 }}>סוף המסלול של {gradeName}</span>
        </>}
      </div>
    </section>
  );
}
