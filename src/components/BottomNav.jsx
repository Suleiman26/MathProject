'use client';
/* Phones: the bottom bar that replaces the top header (Abed, 2026-11-11).
   Signed-in students only, on the home page, the profile pages and the duel hub
   (never on topic pages: their keypad lives at the bottom; never inside a duel).
   Right to left: בית · התקדמות · [Loop: the next step] · דו-קרב (or הישגים) · אני.
   The middle button goes to the same "next step" as the home railway's ticket
   (src/lib/next-step.js). "אני" opens a sheet: settings and sign out.
   While it shows, <html> gets .bnav: the page hides its top header and leaves room at
   the bottom (src/styles/bottomnav.css). Wider than 760px nothing changes. */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { House, ChartLineUp, Medal, GearSix, SignOut, CaretLeft } from "@phosphor-icons/react";
import { useAccount, accountApi } from "@/lib/account";
import { useDuelOpen } from "@/duel/gate-hook";
import { DuelMark } from "@/duel/DuelMark";
import { loadNext } from "@/lib/next-step";

const SHOW = /^\/(profile(\/[^/]+)?|duel)?\/?$/;   // "/", "/profile", "/profile/<topic>", "/duel"
let booted = false;
const GRADE = { 7: "כיתה ז׳", 8: "כיתה ח׳", 9: "כיתה ט׳" };

export default function BottomNav() {
  const path = usePathname() || "/";
  const { account } = useAccount();
  const on = !!account && SHOW.test(path);
  if (!on) return null;
  return <Bar account={account} path={path} />;
}

/** also used by the local preview /dev/railway (sample student, `duelsOn` forces the duel tab) */
export function Bar({ account, path, duelsOn }) {
  const router = useRouter();
  const gate = useDuelOpen(account.id) === true;
  const duels = duelsOn == null ? gate : duelsOn;
  const [next, setNext] = useState(null);
  const [me, setMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const sheet = useRef(null);
  // the entrance plays once per visit, not on every page change (the bar stays mounted)
  const [boot, setBoot] = useState(!booted);
  useEffect(() => { booted = true; const t = setTimeout(() => setBoot(false), 1200); return () => clearTimeout(t); }, []);

  // <html>.bnav while the bar is on the page; .bn-kb while typing (the bar steps aside for the keyboard)
  useEffect(() => {
    const h = document.documentElement;
    h.classList.add("bnav");
    const typing = (e) => {
      const t = e.target;
      const yes = e.type === "focusin" && t && t.matches && t.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select, [contenteditable=true]");
      h.classList.toggle("bn-kb", !!yes);
    };
    document.addEventListener("focusin", typing);
    document.addEventListener("focusout", typing);
    return () => { h.classList.remove("bnav", "bn-kb"); document.removeEventListener("focusin", typing); document.removeEventListener("focusout", typing); };
  }, []);

  // the next step: from this device's memory, refreshed when the home railway works it out
  useEffect(() => {
    const read = () => setNext(loadNext(account.id, account.grade));
    read();
    window.addEventListener("mp:next", read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("mp:next", read); window.removeEventListener("storage", read); };
  }, [account.id, account.grade]);

  useEffect(() => { setMe(false); }, [path]);
  useEffect(() => {
    if (!me) return;
    const key = (e) => { if (e.key === "Escape") setMe(false); };
    document.addEventListener("keydown", key);
    const f = sheet.current && sheet.current.querySelector("a,button");
    if (f) f.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", key);
  }, [me]);

  async function out() {
    setBusy(true);
    try { await accountApi.logout(); } finally { setBusy(false); setMe(false); }
    if (path !== "/") router.push("/");
  }

  const at = (re) => (re.test(path) ? "page" : undefined);
  const go = next || { href: "/", verb: "לתרגל", name: "" };
  const goLabel = go.name ? `${go.verb}: ${go.name}` : go.verb;

  return (
    <>
      <nav className={"bn" + (boot ? " boot" : "")} data-topic={account.avatar} aria-label="ניווט ראשי">
        <Link className="bn-tab" style={{ "--k": 0 }} href="/" aria-current={at(/^\/$/)}>
          <House weight={path === "/" ? "fill" : "regular"} aria-hidden="true" /><span>בית</span>
        </Link>
        <Link className="bn-tab" style={{ "--k": 1 }} href="/profile" aria-current={at(/^\/profile(\/|$)/)}>
          <ChartLineUp weight={/^\/profile/.test(path) ? "bold" : "regular"} aria-hidden="true" /><span>התקדמות</span>
        </Link>

        <Link className="bn-go" href={go.href} aria-label={goLabel}>
          <span className="bn-go-halo" aria-hidden="true" />
          <span className="bn-go-ring" aria-hidden="true" />
          <span className="bn-go-tile" aria-hidden="true"><img src="/brand/logo-loop.png" alt="" width={56} height={56} decoding="async" /><span className="bn-go-shine" /></span>
          <span className="bn-go-l" aria-hidden="true">{go.verb}</span>
        </Link>

        {duels ? (
          <Link className="bn-tab" style={{ "--k": 2 }} href="/duel" aria-current={at(/^\/duel$/)}>
            <span className="bn-duel" aria-hidden="true"><DuelMark /></span><span>דו-קרב</span>
          </Link>
        ) : (
          <Link className="bn-tab" style={{ "--k": 2 }} href="/profile#ach-h">
            <Medal weight="regular" aria-hidden="true" /><span>הישגים</span>
          </Link>
        )}
        <button type="button" className="bn-tab bn-me" style={{ "--k": 3 }} data-state={me ? "open" : undefined} aria-haspopup="dialog" aria-expanded={me} onClick={() => setMe(!me)}>
          <span className="bn-av" data-topic={account.avatar} aria-hidden="true">{[...(account.username || "?")][0].toUpperCase()}</span><span>אני</span>
        </button>
      </nav>

      <div className={"bn-sheet-wrap" + (me ? " on" : "")} inert={!me} aria-hidden={!me}>
        <div className="bn-scrim" onClick={() => setMe(false)} />
        <div className="bn-sheet" role="dialog" aria-modal="true" aria-label="החשבון שלי" ref={sheet} data-topic={account.avatar}>
                    <Link className="bn-sheet-h" href="/profile" onClick={() => setMe(false)}>
            <span className="bn-av big" data-topic={account.avatar} aria-hidden="true">{[...(account.username || "?")][0].toUpperCase()}</span>
            <span className="bn-sheet-id"><b dir="auto">{account.username}</b><small>{GRADE[account.grade] || "בלי כיתה"} · הפרופיל שלי</small></span>
            <CaretLeft className="bn-chev" weight="bold" aria-hidden="true" />
          </Link>
          <Link className="bn-row" href="/profile#settings" onClick={() => setMe(false)}>
            <i aria-hidden="true"><GearSix weight="regular" /></i><span>הגדרות: כיתה, צבע, סיסמה</span>
          </Link>
          <button type="button" className="bn-row out" disabled={busy} onClick={out}>
            <i aria-hidden="true"><SignOut weight="regular" /></i><span>{busy ? "יוצאים…" : "יציאה מהחשבון"}</span>
          </button>
        </div>
      </div>
    </>
  );
}
