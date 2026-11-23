'use client';
/* Opens one topic: its own CSS, the top bar, and Sulaiman's code inside #root.
   The topic code runs only in the browser, exactly like in the HTML version. */
import { lazy, Suspense, useEffect, useState } from "react";
import { TOPICS, LOADERS, STYLES } from "@/topics/registry";
import { initRuntime } from "@/lib/mp-runtime";
import TopBar from "./TopBar";
import Keypad from "./Keypad";
import { accountApi, useAccount } from "@/lib/account";
import { chapterStats } from "@/home/chapters";
import { calcAllowed, eqnAllowed } from "@/lib/calc-topics";
import { isAdminFrame } from "@/lib/admin-frame";
import { keyText } from "@/lib/mp-key";

// the side calculator: its code is fetched only when a student opens it
const Calculator = lazy(() => import("./Calculator"));
const activeChapter = () => { const b = document.querySelector("#root :is(.ch-btn, .nav-btn, .ph).active"); return keyText(b); }; // data-mp-key, else the text

export default function TopicView({ slug }) {
  const meta = TOPICS[slug];
  const [loaded, setLoaded] = useState(null); // { Topic, css }

  useEffect(() => {
    let alive = true;
    initRuntime();
    const html = document.documentElement;
    html.dataset.topic = meta.topic;
    html.dataset.page = slug;
    Promise.all([LOADERS[slug](), STYLES[slug]()]).then(([m, s]) => {
      if (alive) setLoaded({ Topic: m.default, css: s.default });
    });
    const t = setTimeout(() => window.MP && window.MP.view(), 1800);
    // remembered on this device, for the home page's "continue" button (not from the content-review panel's frame)
    if (!isAdminFrame()) { try { localStorage.setItem("mp:last", JSON.stringify({ slug, at: Date.now() })); } catch (e) {} }
    return () => { alive = false; clearTimeout(t); delete html.dataset.topic; delete html.dataset.page; };
  }, [slug, meta.topic]);

  // signed-in students: a ✓ on every chapter tab they already solved an exercise in
  const { account } = useAccount();
  useEffect(() => {
    if (!loaded || !account) return;
    let alive = true; const solved = new Set();
    const norm = (t) => (t || "").replace(/\s+/g, " ").trim();
    const mark = () => document.querySelectorAll("#root :is(.ch-btn, .nav-btn, .ph)").forEach((b) => {
      const on = solved.has(norm(keyText(b)));
      if (b.hasAttribute("data-solved") !== on) b.toggleAttribute("data-solved", on);
    });
    accountApi.topic(slug).then((d) => {
      if (!alive || !d) return;
      chapterStats(slug, d.chapters).filter((c) => c.win > 0).forEach((c) => solved.add(c.name)); mark();
    }).catch(() => {});
    const onWin = (e) => { const main = norm((e.detail && e.detail.chapter || "").split(" › ")[0]); if (main) { solved.add(main); mark(); } };
    window.addEventListener("mp:win", onWin);
    const root = document.getElementById("root");
    const mo = new MutationObserver(mark); if (root) mo.observe(root, { childList: true, subtree: true });
    return () => { alive = false; window.removeEventListener("mp:win", onWin); mo.disconnect(); };
  }, [loaded, account && account.id, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // ?ch=<chapter name> (from the railway or the topic sheet): open that chapter.
  // &sub=<sub-tab text> (the content-review panel's links): then open that sub-tab inside it;
  // nested tabs as a path "a › b" (each one is opened in turn, after the one before it stays open).
  useEffect(() => {
    if (!loaded) return;
    const q = new URLSearchParams(window.location.search);
    const norm = (t) => (t || "").replace(/\s+/g, " ").trim();
    const want = [];
    if (q.get("ch")) want.push({ sel: "#root :is(.ch-btn, .nav-btn, .ph)", text: norm(q.get("ch")) });
    norm(q.get("sub")).split(" › ").filter(Boolean)
      .forEach((t) => want.push({ sel: "#root :is(.sub-tab, .sub-tab-btn, .sub-btn, .tab)", text: norm(t) }));
    if (!want.length) return;
    // The topic's first render can be replaced right after it appears (a click on it then gets lost and
    // chapter 1 stays open), so: click until that button is open and STAYS open for 3 checks in a row.
    let at = 0, tries = 0, stable = 0;
    const done = () => {
      clearInterval(iv);
      // keep the address clean, so a refresh does not jump again
      const u = new URL(window.location.href); u.searchParams.delete("ch"); u.searchParams.delete("sub");
      window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    };
    const iv = setInterval(() => {
      tries++;
      const w = want[at];
      const btn = [...document.querySelectorAll(w.sel)].find((b) => norm(keyText(b)) === w.text); // ?ch / &sub carry stored names (data-mp-key)
      if (btn && btn.classList.contains("active")) {
        if (++stable >= 3) { stable = 0; tries = 0; if (++at >= want.length) done(); }
        return;
      }
      stable = 0;
      if (btn && !btn.disabled) btn.click();
      if (tries > 40) done();   // not found (renamed, or a locked level): stay where the page is
    }, 100);
    return () => clearInterval(iv);
  }, [loaded]);

  // Side calculator (board #55): only on the topics / chapters listed in src/lib/calc-topics.js.
  // The chapter is read from the active chapter button, the same way the answer tracker does.
  const [calcOk, setCalcOk] = useState(() => calcAllowed(slug, ""));
  const [calcOpen, setCalcOpen] = useState(false);
  const [eqnOk, setEqnOk] = useState(() => eqnAllowed(slug, "")); // the equation mode (MODE 5 3), where quadratics are solved
  useEffect(() => {
    if (!loaded) return;
    let t = 0;
    const check = () => {
      const ok = calcAllowed(slug, activeChapter());
      setCalcOk(ok);
      setEqnOk(eqnAllowed(slug, activeChapter()));
      if (!ok) setCalcOpen(false);
    };
    const later = () => { clearTimeout(t); t = setTimeout(check, 60); }; // after the topic drew the new chapter
    later();
    document.addEventListener("click", later, true);
    const open = () => { if (calcAllowed(slug, activeChapter())) setCalcOpen(true); };
    window.addEventListener("mp:calc", open); // the calculator chip in the answer keypad's bar
    return () => { clearTimeout(t); document.removeEventListener("click", later, true); window.removeEventListener("mp:calc", open); };
  }, [loaded, slug]);

  const Topic = loaded && loaded.Topic;
  return (
    <>
      {loaded && <style dangerouslySetInnerHTML={{ __html: loaded.css }} />}
      <TopBar title={meta.title.split(/\s[—–-]\s/)[0]} calc={calcOk} calcOpen={calcOpen} onCalc={() => setCalcOpen((o) => !o)} />
      <div id="root">{Topic ? <Topic /> : <div className="mp-boot" aria-hidden="true"><span /></div>}</div>
      <Keypad page={slug} calc={calcOk} />
      {calcOk && calcOpen && <Suspense fallback={null}><Calculator eqn={eqnOk} onClose={() => setCalcOpen(false)} /></Suspense>}
    </>
  );
}
