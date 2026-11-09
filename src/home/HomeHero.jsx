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
import { Fire, ArrowDown, Confetti } from "@phosphor-icons/react";
import { Avatar, AccountMenu } from "@/account/ui";
import { HERO } from "./catalog";
import { DuelTile } from "./DuelTile";
import { fmt, playerLevel, rankOf, weekStats, xpOf } from "@/lib/progress";

export const HERO_LOOK = "sky";
const Rig3D = dynamic(() => import("@/avatars/Avatar3D"), { ssr: false });

function greet() {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : h < 22 ? "ערב טוב" : "לילה טוב";
}
// a 3D sun by day, a 3D moon from "ערב טוב" on: same hours as greet() (sun showed with "good evening" at 17:54)
const dayArt = () => { const h = new Date().getHours(); return h >= 5 && h < 17 ? "sun" : "moon"; };

export function HomeHero({ account, p, gradeName, look = HERO_LOOK, figure, duel }) {
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
  // each number with its own small 3D piece (same family as the world art, public/home/hero/) — 2026-11-07
  const stats = [
    { art: "fire", v: p ? fmt(streak) : "–", l: streak === 1 ? "יום ברצף" : "ימים ברצף" },
    { art: "check", v: p ? fmt(t.win) : "–", l: "נפתרו" },
    { art: "target", v: acc == null ? "–" : acc + "%", l: "נכונות" },
    { art: "calendar", v: p ? `${fmt(Math.min(week, goal))}/${fmt(goal)}` : "–", l: "ימים השבוע", seg: [Math.min(week, goal), goal] },
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

  // the phone's top bar (status bar / Safari bar) takes the header's own top colour, so there is
  // no grey strip above it (Abed's iPhone, 2026-11-07). Same mix as .hh-bg's top: 80% --a-100 + white.
  useEffect(() => {
    const hh = document.querySelector(".hh");
    if (!hh) return;
    const hex = getComputedStyle(hh).getPropertyValue("--a-100").trim();
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return;
    const n = parseInt(m[1], 16), mix = (c) => Math.round(c * 0.8 + 255 * 0.2);
    const top = "#" + [n >> 16, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, "0")).join("");
    const meta = document.querySelector('meta[name="theme-color"]');
    const before = meta && meta.getAttribute("content");
    if (meta) meta.setAttribute("content", top);
    document.documentElement.style.backgroundColor = top;
    document.body.style.backgroundColor = top;
    return () => {
      if (meta && before) meta.setAttribute("content", before);
      document.documentElement.style.backgroundColor = ""; document.body.style.backgroundColor = "";
    };
  }, [account.avatar]);

  const pct = Math.max(0.03, Math.min(1, lv.pct || 0));
  const [art, setArt] = useState("sun");
  useEffect(() => setArt(dayArt()), []);
  return (
    <>
      <section className={"hh hh-" + look} data-topic={account.avatar} aria-label="הסיכום שלי">
        <div className="hh-bg" aria-hidden="true" />
        <div className="hh-in">
          {/* a frosted glass capsule: logo + name and the menu, the same look as the bar that shows on scroll */}
          <div className="hh-row">
            <Link href="/" className="hh-brand" aria-label={HERO.title}><img src="/brand/logo-loop.png" alt="" width={38} height={38} /><span><b>{HERO.title.split(" ")[0]}</b><small>{HERO.title.split(" ").slice(1).join(" ")}</small></span></Link>
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
                <Link href="/profile" className="hh-av" aria-label={`הפרופיל שלי · רמה ${lv.L}`}>
                  <Avatar account={account} size={64} />
                </Link>
              )}
              <img className="hh-day" src={`/home/hero/${art}.webp`} alt="" width={64} height={64} decoding="async" />
              <div className="hh-t">
                <p className="hh-hi">{greet()},</p>
                <h1><bdi>{account.username}</bdi></h1>
                <p className="hh-line">{line}{LineIc && <LineIc className="hh-line-ic" size={15} weight="bold" aria-hidden="true" />}</p>
              </div>
            </div>

            {/* "me" in the student's colour: level, points, the way to the next level, with a 3D star
                standing out of the card (the same idea as the world banners below) */}
            <Link href="/profile" className="hh-lvc" style={{ "--p": pct }} aria-label={`רמה ${lv.L}, ${rankOf(lv.L)}: ${fmt(lv.xp)} נקודות, עוד ${fmt(lv.toNext)} לרמה ${lv.L + 1}`}>
              <img className="hh-lvc-art" src="/home/hero/star.webp" alt="" width={120} height={120} decoding="async" />
              <span className="hh-lvc-k">רמה {lv.L} · {rankOf(lv.L)}</span>
              <span className="hh-lvc-xp"><b>{fmt(lv.xp)}</b> נק׳</span>
              <span className="hh-lvc-bar" aria-hidden="true"><i /></span>
              <span className="hh-lvc-next">עוד {fmt(lv.toNext)} לרמה {lv.L + 1}</span>
            </Link>

            <ul className="hh-st" aria-label="המספרים שלי">
              {stats.map((x, k) => (
                <li key={k} style={{ "--k": k }}>
                  <img className="hh-st-art" src={`/home/hero/${x.art}.webp`} alt="" width={44} height={44} decoding="async" />
                  <b>{x.v}</b>
                  <small>{x.l}</small>
                  {x.seg && <span className="hh-seg" aria-hidden="true">{Array.from({ length: x.seg[1] }, (_, i) => <i key={i} className={i < x.seg[0] ? "on" : ""} />)}</span>}
                </li>
              ))}
            </ul>
            {/* duels: shows only when they are open for me (switch / tester), see DuelTile.jsx.
                `duel` = sample {online, friends, faces} on dev pages */}
            <DuelTile account={account} sample={duel} />
            {/* the slim bar shows only once this whole card is behind it (it peeked above the bar, 2026-11-07) */}
            <span ref={ref} className="hh-end" aria-hidden="true" />
          </div>
        </div>
      </section>

      <div className={"hh-scrim" + (away ? " on" : "")} aria-hidden="true" />
      <div className={"hh-bar" + (away ? " on" : "")} data-topic={account.avatar} inert={!away}>
        <Link href="/" className="hh-bar-b"><img src="/brand/logo-loop.png" alt="" width={30} height={30} /><span><b>המסלול שלי</b><small>{gradeName}</small></span></Link>
        <span className="hh-bar-lv" aria-label={`רמה ${lv.L}`}>רמה {lv.L}</span>
        <AccountMenu account={account} />
      </div>
    </>
  );
}
