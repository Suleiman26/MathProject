'use client';
/* Signed-in home, top of the page. Calm version (2026-11-07, design/home-calm.md):
   one soft wash of the student's own colour, brand + menu, the student with a level
   ring, greeting, and ONE white card with the points bar and four numbers (icons in
   the student's colour, no rainbow badges, no floating symbols). When it scrolls
   away, a slim glass bar takes its place. Styles: src/styles/hero.css
   (The earlier "night" and "card" looks are in git history, commit 02cdec5.) */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Fire, CheckCircle, Target, CalendarCheck, ArrowDown, Confetti } from "@phosphor-icons/react";
import { Avatar, AccountMenu } from "@/account/ui";
import { HERO } from "./catalog";
import { fmt, playerLevel, rankOf, weekStats, xpOf } from "@/lib/progress";

export const HERO_LOOK = "sky";
const Rig3D = dynamic(() => import("@/avatars/Avatar3D"), { ssr: false });

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
  // same words as before; the emoji at the end became an icon in the app's style
  const [line, LineIc] = !p ? ["\u00a0", null]   // keeps the line height while loading
    : !n && !(t && t.win) ? ["המסלול שלך מוכן. מתחילים בצעד הראשון", ArrowDown]
    : streak >= 2 ? [`${fmt(streak)} ימים ברצף. ממשיכים ככה!`, Fire]
    : week >= goal ? ["עמדת ביעד השבועי. כל הכבוד!", Confetti]
    : ["בוא/י נתרגל קצת היום", null];
  // icons in the app's own style (Phosphor, white on a coloured badge), not emoji (Abed, 2026-11-07)
  const stats = [
    { Ic: Fire, c: "fire", v: p ? fmt(streak) : "–", l: streak === 1 ? "יום ברצף" : "ימים ברצף" },
    { Ic: CheckCircle, c: "ok", v: p ? fmt(t.win) : "–", l: "נפתרו" },
    { Ic: Target, c: "aim", v: acc == null ? "–" : acc + "%", l: "נכונות" },
    { Ic: CalendarCheck, c: "week", v: p ? `${fmt(Math.min(week, goal))}/${fmt(goal)}` : "–", l: "ימים השבוע" },
  ];

  // the slim bar shows once the hero has scrolled away
  const ref = useRef(null);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pct = Math.max(0.03, Math.min(1, lv.pct || 0));
  return (
    <>
      <section className={"hh hh-" + look} data-topic={account.avatar} aria-label="הסיכום שלי">
        <div className="hh-bg" aria-hidden="true" />
        <div className="hh-in">
          <div className="hh-row">
            <Link href="/" className="hh-brand"><img src="/icon.png" alt="" width={36} height={36} /><span><b>{HERO.title}</b></span></Link>
            <AccountMenu account={account} trigger="icon" />
          </div>

          <div className="hh-main">
            <div className="hh-me">
              {figure ? (
                /* the student's 3D character (src/avatars): stands, breathes, waves hello */
                <Link href="/profile" className="hh-fig" aria-label={`הפרופיל שלי · רמה ${lv.L}`}>
                  <span className="hh-fig-glow" aria-hidden="true" />
                  <span className="hh-fig-floor" aria-hidden="true" />
                  <span className="hh-fig-in"><Rig3D src={figure.src} height="fill" shadow={false} /></span>
                  <span className="hh-lv"><small>רמה</small>{lv.L}</span>
                </Link>
              ) : (
              <Link href="/profile" className="hh-ring" style={{ "--p": pct }} aria-label={`הפרופיל שלי · רמה ${lv.L}`}>
                  <Avatar account={account} size={64} />
                  <span className="hh-lv"><small>רמה</small>{lv.L}</span>
                </Link>
              )}
              <div className="hh-t">
                <p className="hh-hi">{greet()},</p>
                <h1><bdi>{account.username}</bdi></h1>
                <p className="hh-line">{line}{LineIc && <LineIc className="hh-line-ic" size={15} weight="bold" aria-hidden="true" />}</p>
              </div>
            </div>

            <div className="hh-sum">
            <Link href="/profile" className="hh-xp" aria-label={`${rankOf(lv.L)}: ${fmt(lv.xp)} נקודות, עוד ${fmt(lv.toNext)} לרמה ${lv.L + 1}`}>
              <span className="hh-xp-r"><b>{rankOf(lv.L)}</b><span>{fmt(lv.xp)} נק׳ · עוד {fmt(lv.toNext)} לרמה {lv.L + 1}</span></span>
              <span className="hh-xp-bar" aria-hidden="true"><i style={{ width: Math.round(pct * 100) + "%" }} /></span>
            </Link>

            <ul className="hh-st" aria-label="המספרים שלי">
              {stats.map((x, k) => (
                <li key={k} style={{ "--k": k }}><span className={"hh-st-ic is-" + x.c} aria-hidden="true"><x.Ic size={19} weight="duotone" /></span><b>{x.v}</b><small>{x.l}</small></li>
              ))}
            </ul>
            </div>
            {/* the slim bar shows only once this whole card is behind it (it peeked above the bar, 2026-11-07) */}
            <span ref={ref} className="hh-end" aria-hidden="true" />
          </div>
        </div>
      </section>

      <div className={"hh-scrim" + (away ? " on" : "")} aria-hidden="true" />
      <div className={"hh-bar" + (away ? " on" : "")} data-topic={account.avatar} inert={!away}>
        <Link href="/" className="hh-bar-b"><img src="/icon.png" alt="" width={30} height={30} /><span><b>המסלול שלי</b><small>{gradeName}</small></span></Link>
        <span className="hh-bar-lv" aria-label={`רמה ${lv.L}`}>רמה {lv.L}</span>
        <AccountMenu account={account} />
      </div>
    </>
  );
}
