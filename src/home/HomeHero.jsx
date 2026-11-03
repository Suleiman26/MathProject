'use client';
/* Signed-in home, top of the page (2026-11-02): one hero instead of a thin bar
   plus a card. Brand + menu, the student with a level ring around the avatar,
   greeting, points to the next level and four numbers. It blends into the page
   (no hard edge); when it scrolls away, a slim glass bar takes its place.
   Three looks for Abed to choose from: "sky" (light aurora), "night" (dark),
   "card" (a bold player card). Styles: src/styles/hero.css */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Avatar, AccountMenu } from "@/account/ui";
import { HERO } from "./catalog";
import { fmt, playerLevel, rankOf, weekStats, xpOf } from "@/lib/progress";

export const HERO_LOOK = "sky";
const Stage3D = dynamic(() => import("@/dev/AvatarStage"), { ssr: false });
const GLYPHS = ["π", "√", "x²", "∑", "÷", "△", "∞", "%", "½", "≠"];

function greet() {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : h < 22 ? "ערב טוב" : "לילה טוב";
}

export function HomeHero({ account, p, gradeName, look = HERO_LOOK, figure }) {
  const t = p ? p.totals : null;
  const lv = playerLevel(xpOf(t));
  const n = t ? t.ok + t.bad : 0;
  const acc = n >= 5 ? Math.round((t.ok / n) * 100) : null;
  const goal = account.weekly_goal || 4;
  const week = p && p.today ? weekStats(p.days, p.today).now.active : 0;
  const streak = p ? p.streak || 0 : 0;
  const line = !p ? " "
    : !n && !(t && t.win) ? "המסלול שלך מוכן. מתחילים בצעד הראשון 👇"
    : streak >= 2 ? `${fmt(streak)} ימים ברצף. ממשיכים ככה! 🔥`
    : week >= goal ? "עמדת ביעד השבועי. כל הכבוד! 🎉"
    : "בוא/י נתרגל קצת היום";
  const stats = [
    { ic: "🔥", v: p ? fmt(streak) : "–", l: streak === 1 ? "יום ברצף" : "ימים ברצף" },
    { ic: "✅", v: p ? fmt(t.win) : "–", l: "נפתרו" },
    { ic: "🎯", v: acc == null ? "–" : acc + "%", l: "נכונות" },
    { ic: "⭐", v: p ? `${fmt(Math.min(week, goal))}/${fmt(goal)}` : "–", l: "ימים השבוע" },
  ];

  // the slim bar shows once the hero has scrolled away
  const ref = useRef(null);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting), { rootMargin: "-70px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pct = Math.max(0.03, Math.min(1, lv.pct || 0));
  return (
    <>
      <section className={"hh hh-" + look} data-topic={account.avatar} aria-label="הסיכום שלי">
        <div className="hh-bg" aria-hidden="true">
          {GLYPHS.map((g, i) => <i key={i} style={{ "--g": i }}>{g}</i>)}
        </div>
        <div className="hh-in">
          <div className="hh-row">
            <Link href="/" className="hh-brand"><img src="/icon.png" alt="" width={36} height={36} /><span><b>{HERO.title}</b><small>{gradeName} · המסלול שלי</small></span></Link>
            <AccountMenu account={account} trigger="icon" />
          </div>

          <div className="hh-main">
            <div className="hh-me">
              {figure ? (
                /* the student's character: a drawn figure that breathes and sways, or a 3D model */
                <Link href="/profile" className={"hh-fig is-" + figure.type} aria-label={`הפרופיל שלי · רמה ${lv.L}`}>
                  <span className="hh-fig-glow" aria-hidden="true" />
                  <span className="hh-fig-floor" aria-hidden="true" />
                  <span className="hh-fig-sway">
                    {figure.type === "2d"
                      ? <img src={figure.src} alt="" width={figure.w || 147} height={figure.h || 320} draggable="false" />
                      : <Stage3D char={figure.src} framing={{ f: 0.5, s: 1.06 }} height={210} />}
                  </span>
                  <span className="hh-lv"><small>רמה</small>{lv.L}</span>
                </Link>
              ) : (
              <Link href="/profile" className="hh-ring" style={{ "--p": pct }} aria-label={`הפרופיל שלי · רמה ${lv.L}`}>
                  <Avatar account={account} size={76} />
                  <span className="hh-lv"><small>רמה</small>{lv.L}</span>
                </Link>
              )}
              <div className="hh-t">
                <p className="hh-hi">{greet()},</p>
                <h1><bdi>{account.username}</bdi></h1>
                <p className="hh-line">{line}</p>
              </div>
            </div>

            <Link href="/profile" className="hh-xp" aria-label={`${rankOf(lv.L)}: ${fmt(lv.xp)} נקודות, עוד ${fmt(lv.toNext)} לרמה ${lv.L + 1}`}>
              <span className="hh-xp-r"><b>{rankOf(lv.L)}</b><span>{fmt(lv.xp)} נק׳ · עוד {fmt(lv.toNext)} לרמה {lv.L + 1}</span></span>
              <span className="hh-xp-bar" aria-hidden="true"><i style={{ width: Math.round(pct * 100) + "%" }} /></span>
            </Link>

            <ul className="hh-st" aria-label="המספרים שלי">
              {stats.map((x, k) => (
                <li key={k} style={{ "--k": k }}><span aria-hidden="true">{x.ic}</span><b>{x.v}</b><small>{x.l}</small></li>
              ))}
            </ul>
          </div>
        </div>
        <span ref={ref} className="hh-end" aria-hidden="true" />
      </section>

      <div className={"hh-bar" + (away ? " on" : "")} data-topic={account.avatar} inert={!away}>
        <Link href="/" className="hh-bar-b"><img src="/icon.png" alt="" width={30} height={30} /><span><b>המסלול שלי</b><small>{gradeName}</small></span></Link>
        <span className="hh-bar-lv" aria-label={`רמה ${lv.L}`}>רמה {lv.L}</span>
        <AccountMenu account={account} />
      </div>
    </>
  );
}
