'use client';
/* Signed-in home, top: one greeting card with the big picture.
   Styles: src/styles/journey.css (.hello) */
import Link from "next/link";
import { Avatar } from "@/account/ui";
import { fmt, playerLevel, rankOf, weekStats, xpOf } from "@/lib/progress";

const Go = () => (
  <svg className="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
);

/* Signed-in student with a grade: one greeting card with the big picture
   (player level and points, streak, exercises solved, accuracy, this week). */
function greet() {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : h < 22 ? "ערב טוב" : "לילה טוב";
}
export function Hello({ account, p, gradeName }) {
  const t = p ? p.totals : null;
  const lv = playerLevel(xpOf(t));
  const n = t ? t.ok + t.bad : 0;
  const acc = n >= 5 ? Math.round((t.ok / n) * 100) : null;
  const goal = account.weekly_goal || 4;
  const week = p && p.today ? weekStats(p.days, p.today).now.active : 0;
  const streak = p ? p.streak || 0 : 0;
  const line = !p ? "\u00a0"
    : !n ? "המסלול שלך מוכן. מתחילים בצעד הראשון 👇"
    : streak >= 2 ? `${fmt(streak)} ימים ברצף. ממשיכים ככה! 🔥`
    : week >= goal ? "עמדת ביעד השבועי. כל הכבוד! 🎉"
    : "בוא/י נתרגל קצת היום";
  const tiles = [
    { ic: "🔥", v: p ? fmt(streak) : "–", l: streak === 1 ? "יום ברצף" : "ימים ברצף", tone: "orange" },
    { ic: "✓", v: p ? fmt(t.win) : "–", l: "תרגילים נפתרו", tone: "ok" },
    { ic: "🎯", v: acc == null ? "–" : acc + "%", l: "תשובות נכונות", tone: "blue" },
    { ic: "⭐", v: p ? `${fmt(Math.min(week, goal))}/${fmt(goal)}` : "–", l: "ימי תרגול השבוע", tone: "violet" },
  ];
  return (
    <section className="hello" data-topic={account.avatar} aria-label="הסיכום שלי">
      <div className="hello-top">
        <Link href="/profile" className="hello-av" aria-label="לפרופיל שלי"><Avatar account={account} size={58} /></Link>
        <div className="hello-t">
          <h1>{greet()}, <bdi>{account.username}</bdi></h1>
          <p>{line}</p>
        </div>
      </div>
      <Link href="/profile" className="hello-lv" aria-label={`רמה ${lv.L}, ${fmt(lv.xp)} נקודות. עוד ${fmt(lv.toNext)} לרמה ${lv.L + 1}. לפרופיל`}>
        <span className="hello-lv-n"><small>רמה</small><b>{lv.L}</b></span>
        <span className="hello-lv-t">
          <span className="r"><b>{rankOf(lv.L)}</b><small>{gradeName} · {fmt(lv.xp)} נק׳</small></span>
          <span className="bar" aria-hidden="true"><i style={{ width: Math.max(3, Math.round(lv.pct * 100)) + "%" }} /></span>
          <small>עוד {fmt(lv.toNext)} נק׳ לרמה {lv.L + 1}</small>
        </span>
        <Go />
      </Link>
      <ul className="hello-st">
        {tiles.map((x, k) => (
          <li key={k} className={x.tone} style={{ "--k": k }}><span className="hs-ic" aria-hidden="true">{x.ic}</span><b>{x.v}</b><small>{x.l}</small></li>
        ))}
      </ul>
    </section>
  );
}

