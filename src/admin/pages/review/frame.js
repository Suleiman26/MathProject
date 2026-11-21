'use client';
/* בקרת תוכן: the live preview frame, read and driven from the admin side only (design §6).
   Same origin, so the panel reads iframe.contentDocument directly: no postMessage bridge and no admin
   code in student pages. The page's own guard (src/lib/admin-frame.js) is read back from window.MP. */
import { useCallback, useEffect, useRef, useState } from "react";
import { readPlace } from "@/admin/review/data";
import { pickQuestion } from "@/admin/review/snapshot";

const CH_SEL = "#root :is(.ch-btn, .nav-btn, .ph)";
const SUB_SEL = "#root :is(.sub-tab, .sub-tab-btn, .sub-btn, .tab)";
const NEW_Q = /תרגיל חדש|שאלה חדשה|עוד תרגיל|תרגיל נוסף/;
const nrm = (t) => String(t || "").replace(/\s+/g, " ").trim();
const GUARD_WAIT = 30000;
/** true / false only when the page's own MP says so; null while it isn't there yet */
const guardOf = (w) => { try { const mp = w && w.MP; return mp && typeof mp.adminFrame === "boolean" ? mp.adminFrame : null; } catch { return null; } };

export const topicUrl = (slug, chapter, subs) => {
  const p = new URLSearchParams();
  if (chapter) p.set("ch", chapter);
  if (subs && subs.length) p.set("sub", subs.join(" › "));
  const s = p.toString().replace(/\+/g, "%20");
  return "/topics/" + slug + (s ? "?" + s : "");
};

/**
 * state: { url, loaded, failed, guard: null|true|false, path, place: {chapter, subs} }
 * onPlace(place, path) runs whenever the page inside changes what is open (debounced).
 */
export function useFrame(onPlace, onClick) {
  const ref = useRef(null);
  const clk = useRef(onClick); clk.current = onClick;
  const [st, setSt] = useState({ url: null, loaded: false, failed: false, guard: null, path: "", place: { chapter: "", subs: [] } });
  const cb = useRef(onPlace); cb.current = onPlace;
  const focused = useRef(null);
  const timers = useRef([]);
  const mo = useRef(null);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  const doc = useCallback(() => { try { return ref.current && ref.current.contentDocument; } catch { return null; } }, []);
  const win = useCallback(() => { try { return ref.current && ref.current.contentWindow; } catch { return null; } }, []);

  const read = useCallback(() => {
    const d = doc(); if (!d) return;
    let path = ""; try { path = d.location.pathname; } catch {}
    const place = readPlace(d);
    const g = guardOf(win());
    setSt((s) => {
      const guard = g === true ? true : g === false ? false : s.guard;
      return s.path === path && s.guard === guard && s.place.chapter === place.chapter && s.place.subs.join("›") === place.subs.join("›") ? s : { ...s, path, place, guard };
    });
    cb.current && cb.current(place, path);
  }, [doc, win]);

  const onLoad = useCallback(() => {
    clear();
    if (mo.current) { mo.current.disconnect(); mo.current = null; }
    const d = doc(); if (!d) return;
    focused.current = null;
    setSt((s) => ({ ...s, loaded: true, failed: false, guard: null }));
    let t = 0;
    const deb = () => { clearTimeout(t); t = setTimeout(read, 140); };
    try {
      mo.current = new MutationObserver(deb);
      mo.current.observe(d.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
      d.addEventListener("focusin", (e) => { const el = e.target; if (el && el.matches && el.matches("input, textarea, select, .choice-btn")) focused.current = el; }, true);
      // a tap on a button in the page (e.g. "✓ בדוק"): the panel may refresh a frozen question
      d.addEventListener("click", (e) => { if (e.target && e.target.closest && e.target.closest("button")) setTimeout(() => clk.current && clk.current(), 350); }, true);
      d.addEventListener("keydown", (e) => { if (e.key === "Enter") setTimeout(() => clk.current && clk.current(), 350); }, true);
    } catch {}
    read();
    // the guard: the page itself says it runs as the admin's frame (never assumed). A slow (cold phone) load
    // keeps the pill on "בודק…": red only when the page's MP says false, or nothing confirmed it in 30 s.
    // Backoff 250 ms → 2 s; stops when this document goes away (the frame navigated or the panel unmounted).
    const t0 = Date.now();
    let gap = 250;
    const poll = () => {
      if (doc() !== d) return;
      const g = guardOf(win());
      if (g === true) { setSt((s) => (s.guard === true ? s : { ...s, guard: true })); return; }
      if (g === false || Date.now() - t0 >= GUARD_WAIT) { setSt((s) => (s.guard === false ? s : { ...s, guard: false })); if (g === false) return; }
      gap = Math.min(gap * 1.5, 2000);
      later(poll, gap);
    };
    poll();
    // a topic page that never draws (missing, crashed): offer "open in a tab" and a report
    later(() => {
      const dd = doc(); let p = ""; try { p = dd.location.pathname; } catch {}
      const root = dd && dd.getElementById("root");
      if (p.startsWith("/topics/") && (!root || !root.querySelector("*:not(.mp-boot):not(.mp-boot span)"))) setSt((s) => ({ ...s, failed: true }));
    }, 9000);
  }, [doc, win, read]);

  useEffect(() => () => { clear(); if (mo.current) mo.current.disconnect(); }, []);

  /** go to a topic page (same frame; replace = no history in the frame) */
  const go = useCallback((url) => {
    const w = win();
    setSt((s) => ({ ...s, url: s.url || url, loaded: s.url ? false : s.loaded, failed: false }));
    if (w && st.url) { try { w.location.replace(url); return; } catch {} }
  }, [win, st.url]);

  /** click the chapter (and sub-tabs) in the open page; false when the button isn't there */
  const openChapter = useCallback((chapter, subs = []) => {
    const d = doc(); if (!d) return false;
    const btn = [...d.querySelectorAll(CH_SEL)].find((b) => nrm(b.textContent) === nrm(chapter));
    if (!btn) return false;
    if (!btn.classList.contains("active")) btn.click();
    subs.forEach((s, i) => later(() => {
      const b = [...d.querySelectorAll(SUB_SEL)].find((x) => nrm(x.textContent) === nrm(s));
      if (b && !b.classList.contains("active")) b.click();
    }, 250 * (i + 1)));
    return true;
  }, [doc]);

  /** "שאלה חדשה": the topic's own new-exercise button in the active card, else reload the same place */
  const newQuestion = useCallback((slug) => {
    const d = doc();
    if (d) {
      const pick = (() => { try { return pickQuestion(d); } catch { return null; } })();
      const shown = (b) => b.getClientRects().length > 0 && !b.disabled;
      const inScope = pick && pick.scope ? [...pick.scope.querySelectorAll("button")] : [];
      const all = [...d.querySelectorAll("#root button")];
      const b = inScope.find((x) => shown(x) && NEW_Q.test(x.textContent)) || all.find((x) => shown(x) && NEW_Q.test(x.textContent));
      if (b) { b.click(); return "button"; }
    }
    const pl = st.place;
    const w = win();
    try { w.location.replace(topicUrl(slug, pl.chapter, pl.subs)); setSt((s) => ({ ...s, loaded: false })); } catch {}
    return "reload";
  }, [doc, win, st.place]);

  const reload = useCallback(() => { const w = win(); try { w.location.reload(); setSt((s) => ({ ...s, loaded: false, failed: false })); } catch {} }, [win]);

  return { ref, st, onLoad, go, openChapter, newQuestion, reload, doc, focused };
}
