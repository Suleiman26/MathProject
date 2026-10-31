'use client';
/* Top bar on every topic: back to all topics · topic title (after scrolling) · sound on/off */
import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountButton } from "@/account/ui";

export default function TopBar({ title }) {
  const [scrolled, setScrolled] = useState(false);
  const [sound, setSound] = useState(true);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    setSound(window.MP ? window.MP.isSoundOn() : true);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  function toggle() {
    const next = !sound;
    setSound(next);
    if (window.MP) window.MP.setSound(next);
  }
  return (
    <header className={"mp-topbar" + (scrolled ? " is-scrolled" : "")}>
      <Link className="mp-back" href="/">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        <span>כל הנושאים</span>
      </Link>
      <div className="mp-topbar-title">{title}</div>
      <div className="mp-topbar-end"><AccountButton compact />
      <button type="button" className="mp-sound" aria-label="צלילים" aria-pressed={sound} title={sound ? "השתקה" : "הפעלת צלילים"} onClick={toggle}>
        <svg className="mp-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" fill="currentColor" fillOpacity=".12" /><path d="M15.5 9a4 4 0 010 6" /><path d="M18 6.5a7.5 7.5 0 010 11" /></svg>
        <svg className="mp-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" fill="currentColor" fillOpacity=".12" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></svg>
      </button></div>
    </header>
  );
}
