'use client';
/* Signed-in home: the student's grade as a railway of topics (stations).
   v3 (2026-11-01), built to read at a glance:
   - one "next step" ticket on top: the topic, the exact chapter and why;
   - a mini-map under it, one segment per topic (fills as chapters are solved),
     tap a segment to fly to that station;
   - the map: travelled track in color, the road ahead as a soft trail, every
     chapter a stop on the way into its station, one tag per station at most,
     stations appear as they scroll in, an "I'm here" button when scrolled away;
   - tapping a station opens its sheet (bottom sheet on phones, popover on wide).
   The same next step (planNext) drives the ticket, the gold trail and the tag.
   Styles: src/styles/journey.css */
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { iconSvg } from "@/lib/icons";
import { Avatar } from "@/account/ui";
import { CHAPTERS, chapterStats, chapterTitle } from "./chapters";
import { levelOf, fmt, slugOf, ago, confettiAt } from "@/lib/progress";

export { levelOf };
const lastPart = (ch) => (ch || "").split(" › ").pop().replace(/^[0-9א-ת]{1,2}[.)]\s*/, "");
const Icon = ({ k }) => <span className="jr-ic" dangerouslySetInnerHTML={{ __html: iconSvg(k) }} />;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
const Check = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6.2l2 2 4-4.4" /></svg>;
const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;
const chHref = (slug, name) => `/topics/${slug}` + (name ? `?ch=${encodeURIComponent(name)}` : "");


/* colors for the SVG track (the same values as the topic accents in mp.css) */
const HEX = {
  teal: ["#5eead4", "#14b8a6", "#0d9488"], sky: ["#7dd3fc", "#0ea5e9", "#0284c7"], blue: ["#93c5fd", "#3b82f6", "#2563eb"],
  indigo: ["#a5b4fc", "#6366f1", "#4f46e5"], violet: ["#c4b5fd", "#8b5cf6", "#7c3aed"], pink: ["#f9a8d4", "#ec4899", "#db2777"],
  cyan: ["#67e8f9", "#06b6d4", "#0891b2"], orange: ["#fdba74", "#f97316", "#ea580c"],
};
const hex = (c, k = 1) => (HEX[c] || HEX.teal)[k];

/* zones: one landscape per category */
const ZONE = {
  num: { glyph: "±", sym: ["−7", "+3", "½", "%", "0", "÷", "−", "+", "¾", "1:2"] },
  alg: { glyph: "x", sym: ["x", "=", "y", "2x", "≠", "≤", "(a+b)", "3y", "≥", "x+1"] },
  fn:  { glyph: "ƒ", sym: ["f(x)", "y=mx+b", "x²", "↗", "(0,b)", "m", "y", "∩", "↘", "x"] },
  geo: { glyph: "△", sym: ["△", "○", "□", "∠", "π", "90°", "⬡", "◇", "r", "a²+b²"] },
};
function zoneKey(z) {
  const n = (z && z.name) || "";
  if (/מספר/.test(n) || z?.id === "num") return "num";
  if (/פונקצ/.test(n) || z?.id === "fn") return "fn";
  if (/גיאומ/.test(n) || z?.id === "geo") return "geo";
  return "alg";
}
function rand(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

/* one curve from a to b (leaves a downward, arrives at b from above), with arc length */
function curve(a, b) {
  const k = (b[1] - a[1]) * 0.55;
  const P = [a, [a[0], a[1] + k], [b[0], b[1] - k], b];
  const pt = (t) => {
    const u = 1 - t, A = u * u * u, B = 3 * u * u * t, C = 3 * u * t * t, D = t * t * t;
    return [A * P[0][0] + B * P[1][0] + C * P[2][0] + D * P[3][0], A * P[0][1] + B * P[1][1] + C * P[2][1] + D * P[3][1]];
  };
  const N = 60, cum = [0];
  let prev = pt(0);
  for (let i = 1; i <= N; i++) { const q = pt(i / N); cum.push(cum[i - 1] + Math.hypot(q[0] - prev[0], q[1] - prev[1])); prev = q; }
  const len = cum[N];
  const at = (f) => {
    const target = Math.max(0, Math.min(1, f)) * len;
    let i = 1; while (i < N && cum[i] < target) i++;
    const t = (i - 1 + (target - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])) / N;
    return pt(t);
  };
  const fAtY = (y) => { // y grows along the curve, so search it
    let lo = 0, hi = 1;
    for (let k2 = 0; k2 < 24; k2++) { const m = (lo + hi) / 2; if (at(m)[1] < y) lo = m; else hi = m; }
    return lo;
  };
  const p = (q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`;
  return { a, b, len, at, fAtY, M: `M${p(P[0])}`, C: ` C${p(P[1])} ${p(P[2])} ${p(P[3])}`, R: ` C${p(P[2])} ${p(P[1])} ${p(P[0])}` };
}

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

/* ── the next step: one rule for the ticket, the gold trail and the tags ── */
export function planNext(stations, here) {
  if (!stations.length) return null;
  const pick = (i, c, kind, why) => ({ i, ch: c ? { name: c.name, title: chapterTitle(c.name) } : null, kind, why });
  // 1. a chapter that keeps going wrong (enough answers to be sure)
  let weak = null;
  stations.forEach((st, i) => st.known.forEach((c) => {
    if (c.n >= 6 && c.acc != null && c.acc < 65 && (!weak || c.acc < weak.c.acc)) weak = { i, c };  // same bar as "worth strengthening" below
  }));
  if (weak) return pick(weak.i, weak.c, "weak", `כדאי לחזק · ${weak.c.acc}% נכון`);
  // 2. keep going in the station practised last
  const h = stations[here];
  if (h && h.started) {
    const c = h.known.find((x) => x.state !== "solved");
    if (c) return pick(here, c, "go", "ממשיכים מאיפה שעצרת");
  }
  // 3. the next station not started yet
  const anyStarted = stations.some((s) => s.started);
  const after = stations.findIndex((s, i) => i >= here && !s.started);
  const ns = after >= 0 ? after : stations.findIndex((s) => !s.started);
  if (ns >= 0) return pick(ns, stations[ns].known[0], "new", anyStarted ? "התחנה הבאה במסלול" : "התחנה הראשונה במסלול");
  // 4. any chapter not solved yet
  for (let i = 0; i < stations.length; i++) {
    const c = stations[i].known.find((x) => x.state !== "solved");
    if (c) return pick(i, c, "go", "פרק שעוד לא פתרת");
  }
  // 5. level up the lowest station
  const low = stations.map((s, i) => ({ s, i })).filter(({ s }) => s.lv.i < 4).sort((a, b) => a.s.lv.i - b.s.lv.i || a.s.s.win - b.s.s.win)[0];
  return low ? pick(low.i, null, "level", `עוד ${fmt(low.s.lv.toNext)} תרגילים לרמת ${low.s.lv.nextName}`) : null;
}
const VERB = { weak: "לחזק", go: "להמשיך", new: "להתחיל", level: "לתרגל" };
const KIND = { weak: "🎯", go: "▶", new: "✦", level: "⬆" };

function Ticket({ st, next }) {
  if (!st || !next) {
    return (
      <Link className="jr-tk gold" href="/profile">
        <span className="jr-tk-ic" aria-hidden="true">🏆</span>
        <span className="jr-tk-t"><small>כל המסלול הושלם</small><b>מדהים! כל התחנות בשליטה מלאה</b></span>
        <span className="jr-tk-go"><span>לפרופיל</span><Arrow /></span>
      </Link>
    );
  }
  return (
    <Link className={"jr-tk k-" + next.kind} data-topic={st.color} href={chHref(st.slug, next.ch && next.ch.name)}>
      <span className="jr-tk-ic"><Icon k={st.icon} /></span>
      <span className="jr-tk-t">
        <small>הצעד הבא · {next.why}</small>
        <b>{st.name}{next.ch ? <span> · {next.ch.title}</span> : null}</b>
      </span>
      <span className="jr-tk-go"><span>{VERB[next.kind]}</span><Arrow /></span>
    </Link>
  );
}

/* ── the railway ──────────────────────────────────────────────────────────── */
export function Railway({ topics, progress, account, gradeName }) {
  const box = useRef(null);
  const [w, setW] = useState(0);
  const [open, setOpen] = useState(null);           // index of the station whose sheet is open
  const [toast, setToast] = useState(null);
  const [reduced, setReduced] = useState(false);
  const [ping, setPing] = useState(null);           // station flashed after a mini-map tap
  const [away, setAway] = useState(null);           // "up" / "down" when the student's station is off screen
  useIsoLayout(() => {
    const el = box.current;
    if (!el) return;
    setW(el.clientWidth);
    setReduced(!!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches));
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* stations with their stats, level, chapters and how complete they are */
  const stats = useMemo(() => Object.fromEntries((progress.topics || []).map((t) => [slugOf(t.page), t])), [progress]);
  const stations = useMemo(() => topics.map((t) => {
    const s = stats[t.slug] || { ok: 0, bad: 0, win: 0 };
    const n = s.ok + s.bad;
    const ch = chapterStats(t.slug, progress.chapters);
    const known = ch.filter((c) => c.known);
    const chDone = known.filter((c) => c.state === "solved").length;
    const lv = levelOf(s.win);
    const started = s.ok + s.bad + s.win > 0;
    // complete = every chapter solved (topics with no chapters: the "mastery" level)
    const comp = known.length ? chDone / known.length : Math.min(1, s.win / 15);
    const weakest = ch.filter((c) => c.acc != null && c.acc < 80).sort((a, b) => a.acc - b.acc)[0] || null;
    return { ...t, s, n, ch, known, chDone, comp, weakest, zk: zoneKey(t.zone), started, lv, acc: n >= 5 ? Math.round((s.ok / n) * 100) : null };
  }), [topics, stats, progress]);

  // "you are here": the station practised most recently (only real answers count); a new student starts at the first
  let here = 0, lastAt = 0;
  stations.forEach((st, i) => { const t = st.started && st.s.last ? new Date(st.s.last).getTime() : 0; if (t > lastAt) { lastAt = t; here = i; } });
  const startedCount = stations.filter((s) => s.started).length;
  const chAll = stations.reduce((a, s) => a + s.known.length, 0);
  const chDoneAll = stations.reduce((a, s) => a + s.chDone, 0);
  const allDone = stations.length > 0 && stations.every((s) => s.comp >= 1);
  const next = useMemo(() => planNext(stations, here), [stations, here]);

  /* geometry: stations zig-zag down, first one on the right (reading direction).
     Segment i leads INTO station i and carries that topic's chapter stops. */
  const narrow = w < 560;
  const R = narrow ? 31 : 38;
  const geo = useMemo(() => {
    if (!w) return null;
    const xs = (i) => (i % 2 === 0 ? w * (narrow ? 0.75 : 0.74) : w * (narrow ? 0.25 : 0.26));
    const base = narrow ? 104 : 124, per = narrow ? 14 : 13, ZONE_GAP = 66;
    const start = [w / 2, 58];
    const pts = [], segs = [], zones = [], labels = [];
    let y = start[1], prev = start, zoneStart = 0, zoneOf = null;
    stations.forEach((st, i) => {
      const nCh = st.known.length;
      const newZone = i > 0 && st.zk !== stations[i - 1].zk;
      y += base + Math.max(0, nCh - 2) * per + (newZone ? ZONE_GAP : 0);
      const p = [xs(i), y];
      const c = curve(prev, p);
      // chapter stops: evenly by length, below the previous node (and its zone label) and above this node
      const y0 = prev[1] + (i === 0 ? 26 : R + 18) + (newZone ? ZONE_GAP - 4 : 0), y1 = p[1] - R - 18;
      const f0 = c.fAtY(y0), f1 = c.fAtY(y1);
      const stops = st.known.map((ch, k) => ({ ch, at: c.at(nCh === 1 ? (f0 + f1) / 2 : f0 + ((f1 - f0) * k) / (nCh - 1)) }));
      if (newZone) {
        const yb = prev[1] + R + 22;
        zones.push({ key: zoneOf.zk, zone: zoneOf.zone, top: zoneStart, bottom: yb + 120 });
        labels.push({ zone: st.zone, zk: st.zk, y: yb + 18, side: (i - 1) % 2 === 0 ? "left" : "right" });
        zoneStart = yb;
      }
      if (i === 0) labels.push({ zone: st.zone, zk: st.zk, y: 18, side: "right" });
      zoneOf = st;
      pts.push(p); segs.push({ ...c, stops }); prev = p;
    });
    const flag = [w / 2, y + (narrow ? 104 : 118)];
    const fin = curve(prev, flag);
    const height = flag[1] + 84;
    if (zoneOf) zones.push({ key: zoneOf.zk, zone: zoneOf.zone, top: zoneStart, bottom: height });
    // a few floating math symbols per zone (stable positions)
    const symbols = [];
    zones.forEach((z, zi) => {
      const r = rand(zi + 3 + z.top), list = ZONE[z.key].sym, n = Math.max(3, Math.min(8, Math.round((z.bottom - z.top) / 150)));
      for (let k = 0; k < n; k++) {
        symbols.push({ t: list[k % list.length], side: k % 2 === 0, x: 2 + r() * 12, y: z.top + 50 + r() * Math.max(10, z.bottom - z.top - 100), s: 16 + r() * 22, d: 0.08 + r() * 0.22, rot: -16 + r() * 32, zk: z.key });
      }
    });
    return { pts, segs, fin, flag, start, height, zones, labels, symbols };
  }, [w, narrow, stations, R]);

  /* parallax for the floating symbols (cheap: one CSS variable on scroll) */
  useEffect(() => {
    const el = box.current;
    if (!el || reduced) return;
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { el.style.setProperty("--py", Math.round(-el.getBoundingClientRect().top) + "px"); }); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, [reduced, geo]);

  /* "I'm here" button: shown while the map is on screen but the student's station is not */
  useEffect(() => {
    const map = box.current, node = map && map.querySelector(`[data-st="${here}"] .jr-node`);
    if (!geo || !node || !window.IntersectionObserver) return;
    let mapIn = false, nodeIn = true, dir = "down";
    const upd = () => setAway(mapIn && !nodeIn ? dir : null);
    const a = new IntersectionObserver(([e]) => { mapIn = e.isIntersecting; upd(); }, { rootMargin: "-30% 0px -30% 0px" });
    const b = new IntersectionObserver(([e]) => { nodeIn = e.isIntersecting; dir = e.boundingClientRect.top > 0 ? "down" : "up"; upd(); });
    a.observe(map); b.observe(node);
    return () => { a.disconnect(); b.disconnect(); };
  }, [geo, here]);

  /* fly to a station (mini-map, "I'm here") and flash it */
  const fly = useCallback((i) => {
    const node = box.current && box.current.querySelector(`[data-st="${i}"] .jr-node`);
    if (!node) return;
    node.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    setPing(i);
  }, [reduced]);
  useEffect(() => { if (ping == null) return; const t = setTimeout(() => setPing(null), 1700); return () => clearTimeout(t); }, [ping]);

  /* level-up celebration: the first time a new level is seen on this device */
  useEffect(() => {
    if (!geo || !account) return;
    const key = "mp:seenlv:" + account.id;
    let seen = null;
    try { seen = JSON.parse(localStorage.getItem(key)); } catch {}
    const now = Object.fromEntries(stations.map((s) => [s.slug, s.lv.i]));
    try { localStorage.setItem(key, JSON.stringify({ ...(seen || {}), ...now })); } catch {}
    if (!seen) return;
    const up = stations.map((s, i) => ({ s, i })).filter(({ s }) => s.lv.i >= 2 && s.lv.i > (seen[s.slug] || 0)).sort((a, b) => b.s.lv.i - a.s.lv.i)[0];
    if (!up) return;
    const t = setTimeout(() => {
      setToast({ name: up.s.name, lv: up.s.lv.name, color: up.s.color });
      const node = box.current && box.current.querySelector(`[data-st="${up.i}"] .jr-node`);
      if (node) { const r = node.getBoundingClientRect(); if (r.top > -40 && r.top < innerHeight) confettiAt(r.left + r.width / 2, r.top + r.height / 2, 46); }
    }, 1500);
    return () => clearTimeout(t);
  }, [geo && geo.height, account && account.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5200); return () => clearTimeout(t); }, [toast]);

  if (!stations.length) return null;

  // paths
  let full = "", ride = "", nextPath = "";
  if (geo) {
    full = geo.segs[0].M + geo.segs.map((s) => s.C).join("") + geo.fin.C;
    ride = geo.segs[0].M + geo.segs.slice(0, here + 1).map((s) => s.C).join("");
    if (next && next.i !== here && next.kind !== "level") {
      const from = `M${geo.pts[here].map((v) => v.toFixed(1)).join(",")}`;
      if (next.i > here) nextPath = from + geo.segs.slice(here + 1, next.i + 1).map((s) => s.C).join("");
      else nextPath = from + geo.segs.slice(next.i + 1, here + 1).reverse().map((s) => s.R).join("");
    }
  }
  const rideMs = Math.min(2400, 800 + here * 150);

  return (
    <section className="jr" aria-labelledby="jr-h">
      <header className="jr-head">
        <div className="jr-head-t">
          <h2 id="jr-h">המסלול שלי · {gradeName}</h2>
          <p>{startedCount
            ? <><b>{fmt(chDoneAll)}</b> מתוך {fmt(chAll)} פרקים · {fmt(startedCount)} מתוך {fmt(stations.length)} תחנות</>
            : <>{fmt(stations.length)} תחנות ו־{fmt(chAll)} פרקים מחכים לך</>}</p>
        </div>
        <div className="jr-mm" aria-label="התחנות במסלול. לחיצה מעבירה לתחנה">
          {stations.map((st, i) => (
            <button key={st.slug} type="button" className={"jr-mm-s" + (st.comp >= 1 ? " done" : st.started ? " on" : "") + (i === here ? " here" : "") + (next && next.i === i ? " nx" : "")}
              data-topic={st.color} style={{ "--f": Math.max(st.started ? 0.08 : 0, st.comp), "--i": i }} onClick={() => fly(i)}
              aria-label={`${st.name}: ${st.known.length ? `${fmt(st.chDone)} מתוך ${fmt(st.known.length)} פרקים` : st.lv.name}`} title={st.name}>
              <i />
            </button>
          ))}
        </div>
        <Ticket st={next ? stations[next.i] : null} next={next} />
      </header>
      {toast && (
        <div className="jr-toast" data-topic={toast.color} role="status">
          <span aria-hidden="true">🎉</span><div><b>עלית רמה!</b> {toast.name}: <b>{toast.lv}</b></div>
          <button type="button" onClick={() => setToast(null)} aria-label="סגירה">✕</button>
        </div>
      )}

      <div className={"jr-map" + (reduced ? " still" : "")} ref={box} style={{ height: geo ? geo.height : 480, "--ride": rideMs + "ms" }}>
        {geo && <>
          {/* zones: a soft colored landscape per category, fading into each other */}
          {geo.zones.map((z, zi) => (
            <div key={zi} className={"jr-zone z-" + z.key + (zi ? " fade" : "")} data-topic={z.zone ? z.zone.color : "teal"} style={{ top: z.top, height: z.bottom - z.top }} aria-hidden="true" />
          ))}
          <div className="jr-syms" aria-hidden="true">
            {geo.symbols.map((s, k) => (
              <span key={k} className={"z-" + s.zk} style={{ [s.side ? "left" : "right"]: s.x + "%", top: s.y, fontSize: s.s, "--d": s.d, "--r": s.rot + "deg" }}>{s.t}</span>
            ))}
          </div>
          {geo.labels.map((b, k) => (
            <div key={k} className={"jr-zl " + b.side} data-topic={b.zone ? b.zone.color : "teal"} style={{ top: b.y }}>
              <span className="g" aria-hidden="true">{ZONE[b.zk].glyph}</span><b>{b.zone ? b.zone.name : ""}</b>
            </div>
          ))}

          <svg className="jr-track" width={w} height={geo.height} viewBox={`0 0 ${w} ${geo.height}`} aria-hidden="true">
            <defs>
              {geo.segs.map((s, i) => {
                const from = i === 0 ? stations[0].color : stations[i - 1].color;
                return (
                  <linearGradient key={i} id={`jr-g${i}`} gradientUnits="userSpaceOnUse" x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]}>
                    <stop offset="0" stopColor={hex(from, 1)} /><stop offset="1" stopColor={hex(stations[i].color, 1)} />
                  </linearGradient>
                );
              })}
              <linearGradient id="jr-gfin" gradientUnits="userSpaceOnUse" x1={geo.fin.a[0]} y1={geo.fin.a[1]} x2={geo.fin.b[0]} y2={geo.fin.b[1]}>
                <stop offset="0" stopColor={hex(stations[stations.length - 1].color, 1)} /><stop offset="1" stopColor="#f5b100" />
              </linearGradient>
            </defs>
            {/* the road ahead: a soft trail */}
            <path d={full} className="road" />
            <path d={full} className="trail" />
            {/* travelled: a colored railway into every station that was started, drawn one after another */}
            {geo.segs.map((s, i) => stations[i].started && (
              <g key={i} className="lit" style={{ "--k": i }}>
                <path d={s.M + s.C} className="ties" style={{ stroke: hex(stations[i].color, 0) }} />
                <path d={s.M + s.C} className="rail" style={{ stroke: `url(#jr-g${i})` }} pathLength="1" />
                <path d={s.M + s.C} className="gap" pathLength="1" />
              </g>
            ))}
            {allDone && <g className="lit" style={{ "--k": stations.length }}>
              <path d={geo.fin.M + geo.fin.C} className="rail" style={{ stroke: "url(#jr-gfin)" }} pathLength="1" />
              <path d={geo.fin.M + geo.fin.C} className="gap" pathLength="1" />
            </g>}
            {nextPath && <path d={nextPath} className="next" />}
            <circle cx={geo.start[0]} cy={geo.start[1]} r="6" className="start-dot" />
          </svg>
          <span className="jr-start" style={{ left: geo.start[0], top: geo.start[1] - 32 }}>יציאה</span>

          {/* chapter stops */}
          {geo.segs.map((s, i) => s.stops.map(({ ch, at }) => {
            const st = stations[i], isNx = next && next.i === i && next.ch && next.ch.name === ch.name;
            return (
              <Link key={i + ":" + ch.i} href={chHref(st.slug, ch.name)} className={"jr-stop " + ch.state + (st.started ? "" : " far") + (isNx ? " nx" : "")} data-topic={st.color} style={{ left: at[0], top: at[1], "--k": i }}
                data-tip={chapterTitle(ch.name) + (ch.win ? ` · ${fmt(ch.win)} נפתרו` : ch.n ? " · התחלת" : "")} aria-label={`${st.name}: ${chapterTitle(ch.name)}`}>
                {ch.state === "solved" && <Check />}
              </Link>
            );
          }))}

          {/* the avatar rides along the track to "you are here" */}
          {!reduced && <span className="jr-rider" style={{ offsetPath: `path("${ride}")` }} aria-hidden="true"><Avatar account={account} size={narrow ? 28 : 32} /></span>}

          {stations.map((st, i) => {
            const [x, y] = geo.pts[i];
            const right = i % 2 === 0;
            const isHere = i === here && st.started;
            const isNext = next && next.i === i;
            const circ = 2 * Math.PI * (R + 6);
            const state = st.comp >= 1 ? "done" : st.started ? "on" : "off";
            const tag = isHere ? <span className="jr-tag here">את/ה כאן</span> : isNext ? <span className="jr-tag nx">{next.kind === "new" ? "התחנה הבאה" : "הצעד הבא"}</span> : null;
            const labelStyle = right ? { right: w - x + R + 14, top: y, maxWidth: x - R - 20 } : { left: x + R + 14, top: y, maxWidth: w - (x + R + 14) - 6 };
            return (
              <div key={st.slug} data-st={i} className={`jr-st ${state}${isHere ? " here" : ""}${isNext ? " is-next" : ""}${open === i ? " open" : ""}${ping === i ? " ping" : ""}`} data-topic={st.color} style={{ "--i": i }}>
                <button type="button" className="jr-node" style={{ left: x - R, top: y - R, width: R * 2, height: R * 2 }}
                  aria-haspopup="dialog" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}
                  aria-label={`${st.name}: ${st.started ? st.lv.name : "עוד לא התחלת"}${isHere ? " (את/ה כאן)" : ""}${isNext ? " (הצעד הבא)" : ""}. פתיחת פרטי התחנה`}>
                  <svg className="jr-ring" viewBox={`0 0 ${2 * (R + 9)} ${2 * (R + 9)}`} style={{ left: -11, top: -11, width: 2 * (R + 9), height: 2 * (R + 9) }} aria-hidden="true">
                    <circle cx={R + 9} cy={R + 9} r={R + 6} className="bg" />
                    {st.comp > 0 && <circle cx={R + 9} cy={R + 9} r={R + 6} className="fg" style={{ strokeDasharray: `${circ * st.comp} ${circ}` }} />}
                  </svg>
                  <Icon k={st.icon} />
                  {state === "done" && <span className="jr-badge" aria-hidden="true">{st.lv.i >= 4 ? "💎" : st.lv.i >= 3 ? "👑" : <Check />}</span>}
                  {isHere && <span className="jr-me"><Avatar account={account} size={narrow ? 26 : 30} /></span>}
                </button>
                <div className={"jr-label " + (right ? "to-left" : "to-right")} style={labelStyle} onClick={() => setOpen(i)}>
                  {tag}
                  <b>{st.name}</b>
                  <small>{st.started
                    ? <><span className="lv">{st.lv.name}</span>{st.known.length ? ` · ${fmt(st.chDone)}/${fmt(st.known.length)} פרקים` : ` · ${fmt(st.s.win)} נפתרו`}</>
                    : st.known.length ? `${fmt(st.known.length)} פרקים` : "תחנה חדשה"}</small>
                </div>
                {open === i && !narrow && <StationSheet st={st} next={isNext ? next : null} onClose={() => setOpen(null)} mode="pop"
                  pos={right ? { right: w - x + R + 16, top: Math.max(10, Math.min(y - 70, geo.height - 560)), width: Math.min(380, x - R - 34) }
                    : { left: x + R + 16, top: Math.max(10, Math.min(y - 70, geo.height - 560)), width: Math.min(380, w - x - R - 34) }} />}
              </div>
            );
          })}

          {/* finish line */}
          <div className={"jr-flag" + (allDone ? " done" : "")} style={{ left: geo.flag[0] - 30, top: geo.flag[1] - 30 }}>
            <span aria-hidden="true">🏆</span>
          </div>
          <span className="jr-finish" style={{ left: geo.flag[0], top: geo.flag[1] - 48 }} aria-hidden="true" />
          <span className="jr-flag-t" style={{ left: geo.flag[0], top: geo.flag[1] + 38 }}>{allDone ? `סיימת את כל המסלול של ${gradeName}!` : `קו הסיום של ${gradeName}`}</span>
        </>}
      </div>
      {away && open == null && !toast && (
        <button type="button" className={"jr-jump " + away} data-topic={account ? account.avatar : "teal"} onClick={() => fly(here)}>
          <Avatar account={account} size={24} /><span>אני כאן</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={away === "down" ? "M6 9l6 6 6-6" : "M6 15l6-6 6 6"} /></svg>
        </button>
      )}
      {open != null && narrow && stations[open] && <StationSheet st={stations[open]} next={next && next.i === open ? next : null} onClose={() => setOpen(null)} mode="sheet" />}
    </section>
  );
}

/* ── station sheet: bottom sheet on phones, popover on wider screens ───── */
function StationSheet({ st, next, onClose, mode, pos }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(0);
  const startY = useRef(null);
  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") onClose(); };
    const down = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest(".jr-node, .jr-label")) onClose(); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    if (ref.current) ref.current.focus({ preventScroll: true });
    let undo = null;
    if (mode === "sheet") { const o = document.body.style.overflow; document.body.style.overflow = "hidden"; undo = () => { document.body.style.overflow = o; }; }
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", down); if (undo) undo(); };
  }, [onClose, mode]);

  const lv = st.lv;
  const lastT = st.s.last && st.started ? ago(st.s.last) : null;
  const goCh = next && next.ch ? next.ch.name : (st.known.find((c) => c.state !== "solved") || {}).name;
  const body = (
    <div ref={ref} className={"jr-sh " + mode} data-topic={st.color} role="dialog" tabIndex={-1} aria-modal={mode === "sheet"} aria-labelledby={"sh-" + st.slug}
      style={mode === "pop" ? pos : { transform: drag ? `translateY(${drag}px)` : undefined, transition: drag ? "none" : undefined }}>
      {mode === "sheet" && (
        <div className="jr-sh-grip" onPointerDown={(e) => { startY.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (startY.current != null) setDrag(Math.max(0, e.clientY - startY.current)); }}
          onPointerUp={() => { if (drag > 90) onClose(); setDrag(0); startY.current = null; }} onPointerCancel={() => { setDrag(0); startY.current = null; }}>
          <i />
        </div>
      )}
      <div className="jr-sh-h">
        <span className="jr-sh-ic"><Icon k={st.icon} /></span>
        <div className="jr-sh-t">
          <h3 id={"sh-" + st.slug}>{st.name}</h3>
          <span className="jr-lv">{st.started ? <>רמה: {lv.name}{st.known.length ? ` · ${fmt(st.chDone)}/${fmt(st.known.length)} פרקים` : ""}</> : st.known.length ? `${fmt(st.known.length)} פרקים · עוד לא התחלת` : "עוד לא התחלת"}</span>
        </div>
        <button type="button" className="jr-sh-x" onClick={onClose} aria-label="סגירה">✕</button>
      </div>

      {st.started ? <>
        <div className="jr-sh-kpis">
          <div><b>{fmt(st.s.win)}</b><small>נפתרו</small></div>
          <div><b>{st.acc == null ? "—" : st.acc + "%"}</b><small>{st.acc == null ? "דיוק אחרי 5 תשובות" : "תשובות נכונות"}</small></div>
          <div><b>{lastT}</b><small>תרגול אחרון</small></div>
        </div>
        <div className="jr-sh-lv">
          <div className="jr-sh-bar"><i style={{ width: Math.round(lv.pct * 100) + "%" }} /></div>
          <small>{lv.next ? <>עוד <b>{fmt(lv.toNext)}</b> תרגילים לרמת <b>{lv.nextName}</b></> : "הרמה הגבוהה ביותר. מדהים!"}</small>
        </div>
      </> : null}

      {next && <p className="jr-sh-why"><span aria-hidden="true">{KIND[next.kind]}</span> הצעד הבא: {next.why}{next.ch ? ` · ${next.ch.title}` : ""}</p>}

      {st.ch.length > 0 && (
        <div className="jr-sh-ch">
          <h4>פרקים</h4>
          <ol>
            {st.ch.filter((c) => c.known || c.n + c.win > 0).map((c) => {
              const pct = Math.min(1, c.win / 5);
              const isWeak = st.weakest && st.weakest.name === c.name;
              const isNx = next && next.ch && next.ch.name === c.name;
              return (
                <li key={c.name} className={c.state + (isWeak ? " weak" : "") + (isNx ? " nx" : "")}>
                  <Link href={chHref(st.slug, c.name)} aria-label={`לפתוח את הפרק ${chapterTitle(c.name)}`}>
                    <i className={"jr-stop mini " + c.state} aria-hidden="true">{c.state === "solved" && <Check />}</i>
                    <span className="nm">{chapterTitle(c.name)}{isNx ? <em className="nx">הבא</em> : isWeak ? <em>כדאי לחזק</em> : null}</span>
                    <span className="bar" aria-hidden="true"><i style={{ width: Math.round(pct * 100) + "%" }} /></span>
                    <small>{c.win ? (c.win === 1 ? "נפתר 1" : `${fmt(c.win)} נפתרו`) : c.n ? "התחלת" : "—"}{c.acc != null ? ` · ${c.acc}%` : ""}</small>
                    <svg className="go" viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 3L4.5 6l3 3" /></svg>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="jr-sh-acts">
        <Link className="jr-sh-go" href={chHref(st.slug, goCh)}>
          <span>{st.started ? "להמשיך לתרגל" : "להתחיל לתרגל"}</span><Arrow />
        </Link>
        {st.started && <Link className="jr-sh-more" href={`/profile/${st.slug}`}>כל הפרטים</Link>}
      </div>
    </div>
  );
  if (mode === "pop") return body;
  return createPortal(<div className="jr-sh-wrap" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>{body}</div>, document.body);
}
