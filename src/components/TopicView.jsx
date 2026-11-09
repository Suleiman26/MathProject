'use client';
/* Opens one topic: its own CSS, the top bar, and Sulaiman's code inside #root.
   The topic code runs only in the browser, exactly like in the HTML version. */
import { useEffect, useState } from "react";
import { TOPICS, LOADERS, STYLES } from "@/topics/registry";
import { initRuntime } from "@/lib/mp-runtime";
import TopBar from "./TopBar";
import Keypad from "./Keypad";
import { accountApi, useAccount } from "@/lib/account";
import { chapterStats } from "@/home/chapters";

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
    // remembered on this device, for the home page's "continue" button
    try { localStorage.setItem("mp:last", JSON.stringify({ slug, at: Date.now() })); } catch (e) {}
    return () => { alive = false; clearTimeout(t); delete html.dataset.topic; delete html.dataset.page; };
  }, [slug, meta.topic]);

  // signed-in students: a ✓ on every chapter tab they already solved an exercise in
  const { account } = useAccount();
  useEffect(() => {
    if (!loaded || !account) return;
    let alive = true; const solved = new Set();
    const norm = (t) => (t || "").replace(/\s+/g, " ").trim();
    const mark = () => document.querySelectorAll("#root :is(.ch-btn, .nav-btn, .ph)").forEach((b) => {
      const on = solved.has(norm(b.textContent));
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

  // ?ch=<chapter name> (from the railway or the topic sheet): open that chapter
  useEffect(() => {
    if (!loaded) return;
    const want = new URLSearchParams(window.location.search).get("ch");
    if (!want) return;
    const norm = (t) => (t || "").replace(/\s+/g, " ").trim();
    // The topic's first render can be replaced right after it appears (a click on it then gets lost and
    // chapter 1 stays open), so: click until that chapter is open and STAYS open for 3 checks in a row.
    let tries = 0, stable = 0;
    const done = () => {
      clearInterval(iv);
      // keep the address clean, so a refresh does not jump again
      const u = new URL(window.location.href); u.searchParams.delete("ch"); window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    };
    const iv = setInterval(() => {
      tries++;
      const btn = [...document.querySelectorAll("#root :is(.ch-btn, .nav-btn, .ph)")].find((b) => norm(b.textContent) === norm(want));
      if (btn && btn.classList.contains("active")) { if (++stable >= 3) done(); return; }
      stable = 0;
      if (btn) btn.click();
      if (tries > 40) done();
    }, 100);
    return () => clearInterval(iv);
  }, [loaded]);

  const Topic = loaded && loaded.Topic;
  return (
    <>
      {loaded && <style dangerouslySetInnerHTML={{ __html: loaded.css }} />}
      <TopBar title={meta.title.split(/\s[—–-]\s/)[0]} />
      <div id="root">{Topic ? <Topic /> : <div className="mp-boot" aria-hidden="true"><span /></div>}</div>
      <Keypad page={slug} />
    </>
  );
}
