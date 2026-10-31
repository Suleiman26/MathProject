'use client';
/* Signed-in home: the student's grade as a railway of topics (stations).
   v2: every chapter is a small stop on the track leading into its station,
   the route crosses colored zones (one per category), tapping a station opens
   its sheet, the avatar rides to "you are here", and a dashed "next step"
   route points to what is worth practising next.
   Styles: src/styles/journey.css */
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { iconSvg } from "@/lib/icons";
import { Avatar } from "@/account/ui";
import { CHAPTERS, chapterStats, chapterTitle } from "./chapters";
import { LEVEL_NAME, levelOf, fmt, slugOf, ago, confettiAt } from "@/lib/progress";

export { levelOf };
const lastPart = (ch) => (ch || "").split(" › ").pop().replace(/^[0-9א-ת]{1,2}[.)]\s*/, "");
const Icon = ({ k }) => <span className="jr-ic" dangerouslySetInnerHTML={{ __html: iconSvg(k) }} />;
const Stars = ({ n }) => (
  <span className="jr-stars" aria-label={`${n} מתוך 3 כוכבים`}>
    {[1, 2, 3].map((s) => <i key={s} className={s <= n ? "on" : ""} aria-hidden="true">★</i>)}
  </span>
);
const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

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

/* ── the railway ──────────────────────────────────────────────────────────── */
export function Railway({ topics, progress, account, gradeName }) {
  const box = useRef(null);
  const [w, setW] = useState(0);
  const [open, setOpen] = useState(null);           // index of the station whose sheet is open
  const [toast, setToast] = useState(null);
  const [reduced, setReduced] = useState(false);
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

  /* stations with their stats, level and chapters */
  const stats = useMemo(() => Object.fromEntries((progress.topics || []).map((t) => [slugOf(t.page), t])), [progress]);
  const stations = useMemo(() => topics.map((t) => {
    const s = stats[t.slug] || { ok: 0, bad: 0, win: 0 };
    const n = s.ok + s.bad;
    const ch = chapterStats(t.slug, progress.chapters);
    const known = ch.filter((c) => c.known);
    const weakest = ch.filter((c) => c.acc != null && c.acc < 80).sort((a, b) => a.acc - b.acc)[0] || null;
    return {
      ...t, s, n, ch, known, weakest, zk: zoneKey(t.zone),
      started: s.ok + s.bad + s.win > 0, lv: levelOf(s.win), acc: n >= 5 ? Math.round((s.ok / n) * 100) : null,
      chDone: known.filter((c) => c.state === "solved").length,
    };
  }), [topics, stats, progress]);

  // "you are here": the station practised most recently (only real answers count); a new student starts at the first
  let here = 0, lastAt = 0;
  stations.forEach((st, i) => { const t = st.started && st.s.last ? new Date(st.s.last).getTime() : 0; if (t > lastAt) { lastAt = t; here = i; } });
  const startedCount = stations.filter((s) => s.started).length;
  const mastered = stations.filter((s) => s.lv.i >= 3).length;
  const allDone = stations.length > 0 && startedCount === stations.length;
  const allGold = stations.length > 0 && mastered === stations.length;
  const firstGold = stations.findIndex((s) => s.lv.i >= 3);

  // the next step: the weakest started topic; else the next station not started yet; else the lowest level
  const next = useMemo(() => {
    const weak = stations.map((s, i) => ({ s, i })).filter(({ s }) => s.started && s.acc != null && s.acc < 75).sort((a, b) => a.s.acc - b.s.acc)[0];
    if (weak) return { i: weak.i, why: `כדאי לחזק (${weak.s.acc}% נכון)` };
    const after = stations.findIndex((s, i) => i >= here && !s.started);
    const any = after >= 0 ? after : stations.findIndex((s) => !s.started);
    if (any >= 0) return { i: any, why: startedCount ? "התחנה הבאה במסלול" : "התחנה הראשונה" };
    const low = stations.map((s, i) => ({ s, i })).filter(({ s }) => s.lv.i < 3).sort((a, b) => a.s.lv.i - b.s.lv.i || a.s.s.win - b.s.s.win)[0];
    return low ? { i: low.i, why: `עוד ${fmt(low.s.lv.toNext)} ל${low.s.lv.nextName}` } : null;
  }, [stations, here, startedCount]);

  /* geometry: stations zig-zag down, first one on the right (reading direction).
     Segment i leads INTO station i and carries that topic's chapter stops. */
  const narrow = w < 560;
  const R = narrow ? 32 : 40;
  const geo = useMemo(() => {
    if (!w) return null;
    const xs = (i) => (i % 2 === 0 ? w * (narrow ? 0.76 : 0.77) : w * (narrow ? 0.24 : 0.23));
    const base = narrow ? 120 : 150, per = narrow ? 17 : 15, BANNER = 92;
    const start = [w / 2, 96];
    const pts = [], segs = [], zones = [], banners = [];
    let y = start[1], prev = start, zoneStart = 0, zoneOf = null;
    stations.forEach((st, i) => {
      const nCh = CHAPTERS[st.slug] ? CHAPTERS[st.slug].length : 0;
      const newZone = i > 0 && st.zk !== stations[i - 1].zk;
      const h = base + Math.max(0, nCh - 2) * per + (newZone ? BANNER : 0);
      y += h;
      const p = [xs(i), y];
      const c = curve(prev, p);
      // chapter stops: evenly by length, below the previous node (and its zone banner) and above this node
      const y0 = prev[1] + (i === 0 ? 44 : R + 26) + (newZone ? BANNER - 6 : 0), y1 = p[1] - R - 24;
      const f0 = c.fAtY(y0), f1 = c.fAtY(y1);
      const stops = st.known.map((ch, k) => ({ ch, at: c.at(st.known.length === 1 ? (f0 + f1) / 2 : f0 + ((f1 - f0) * k) / (st.known.length - 1)) }));
      if (newZone) {
        const yb = prev[1] + 58;
        zones.push({ key: zoneOf.zk, zone: zoneOf.zone, top: zoneStart, bottom: yb, from: zones.length ? zones[zones.length - 1].toIndex + 1 : 0, toIndex: i - 1 });
        banners.push({ zone: st.zone, zk: st.zk, y: yb + 14, side: (i - 1) % 2 === 0 ? "left" : "right", count: 0, first: i });
        zoneStart = yb;
      }
      if (i === 0) banners.push({ zone: st.zone, zk: st.zk, y: 14, side: "right", count: 0, first: 0 });
      zoneOf = st;
      pts.push(p); segs.push({ ...c, stops }); prev = p;
    });
    const flag = [w / 2, y + (narrow ? 120 : 140)];
    const fin = curve(prev, flag);
    const height = flag[1] + 96;
    if (zoneOf) zones.push({ key: zoneOf.zk, zone: zoneOf.zone, top: zoneStart, bottom: height, toIndex: stations.length - 1 });
    banners.forEach((b) => { b.count = stations.filter((s, k) => k >= b.first && s.zk === b.zk && stations.slice(b.first, k + 1).every((x) => x.zk === b.zk)).length; });
    // floating math symbols, a few per zone (stable positions)
    const symbols = [];
    zones.forEach((z, zi) => {
      const r = rand(zi + 3 + z.top), list = ZONE[z.key].sym, n = Math.max(4, Math.min(12, Math.round((z.bottom - z.top) / 95)));
      for (let k = 0; k < n; k++) {
        const side = k % 2 === 0;
        symbols.push({ t: list[k % list.length], side, x: 2 + r() * 14, y: z.top + 40 + r() * (z.bottom - z.top - 80), s: 16 + r() * 26, d: 0.08 + r() * 0.26, rot: -18 + r() * 36, zk: z.key });
      }
    });
    return { pts, segs, fin, flag, start, height, zones, banners, symbols };
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
    if (next && next.i !== here) {
      if (next.i > here) nextPath = `M${geo.pts[here].map((v) => v.toFixed(1)).join(",")}` + geo.segs.slice(here + 1, next.i + 1).map((s) => s.C).join("");
      else nextPath = `M${geo.pts[here].map((v) => v.toFixed(1)).join(",")}` + geo.segs.slice(next.i + 1, here + 1).reverse().map((s) => s.R).join("");
    }
  }
  const rideMs = Math.min(2600, 900 + here * 160);
  const halfway = stations.length >= 4 ? Math.ceil(stations.length / 2) : -1;  // the sign sits on the segment into this station
  const halfLit = halfway >= 0 && startedCount >= halfway;

  return (
    <section className="jr" aria-labelledby="jr-h">
      <header className="jr-head">
        <div>
          <h2 id="jr-h">המסלול שלי · {gradeName}</h2>
          <p>{startedCount ? `התחלת ${fmt(startedCount)} מתוך ${fmt(stations.length)} תחנות` : `${fmt(stations.length)} תחנות בדרך. התחנה הראשונה מחכה לך`}{mastered ? ` · ${fmt(mastered)} בשליטה` : ""}</p>
        </div>
        <div className="jr-meter" role="progressbar" aria-valuemin={0} aria-valuemax={stations.length} aria-valuenow={startedCount} aria-label="תחנות שהתחלת">
          <i style={{ width: (stations.length ? (startedCount / stations.length) * 100 : 0) + "%" }} />
          {halfway > 0 && <b className={halfLit ? "on" : ""} style={{ right: `${(halfway / stations.length) * 100}%` }} aria-hidden="true" />}
        </div>
        <ul className="jr-legend" aria-label="מקרא">
          <li><i className="d solved" />פרק שפתרת בו תרגיל</li>
          <li><i className="d tried" />פרק שהתחלת</li>
          <li><i className="d next" />הצעד הבא</li>
        </ul>
      </header>
      {toast && (
        <div className="jr-toast" data-topic={toast.color} role="status">
          <span aria-hidden="true">🎉</span><div><b>עלית רמה!</b> {toast.name}: <b>{toast.lv}</b></div>
          <button type="button" onClick={() => setToast(null)} aria-label="סגירה">✕</button>
        </div>
      )}

      <div className={"jr-map" + (reduced ? " still" : "")} ref={box} style={{ height: geo ? geo.height : 480, "--ride": rideMs + "ms" }}>
        {geo && <>
          {/* zones: a colored landscape per category, hills at the top edge, floating symbols */}
          {geo.zones.map((z, zi) => (
            <div key={zi} className={"jr-zone z-" + z.key} data-topic={z.zone ? z.zone.color : "teal"} style={{ top: z.top, height: z.bottom - z.top }} aria-hidden="true">
              {zi > 0 && <svg className="jr-hills" viewBox="0 0 400 40" preserveAspectRatio="none"><path d="M0,40 L0,22 C50,4 90,2 140,16 S240,38 300,18 S370,2 400,14 L400,40 Z" /><path className="b" d="M0,40 L0,30 C60,16 120,14 170,26 S280,40 330,28 S385,18 400,24 L400,40 Z" /></svg>}
            </div>
          ))}
          <div className="jr-syms" aria-hidden="true">
            {geo.symbols.map((s, k) => (
              <span key={k} className={"z-" + s.zk} style={{ [s.side ? "left" : "right"]: s.x + "%", top: s.y, fontSize: s.s, "--d": s.d, "--r": s.rot + "deg" }}>{s.t}</span>
            ))}
          </div>
          {geo.banners.map((b, k) => (
            <div key={k} className={"jr-banner " + b.side} data-topic={b.zone ? b.zone.color : "teal"} style={{ top: b.y }}>
              <span className="g" aria-hidden="true">{ZONE[b.zk].glyph}</span>
              <span><small>אזור</small><b>{b.zone ? b.zone.name : ""}</b></span>
              <em>{fmt(b.count)} {b.count === 1 ? "תחנה" : "תחנות"}</em>
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
            {/* sleepers + two rails (a wide line, then a narrower one in the background color) */}
            <path d={full} className="ties" />
            <path d={full} className="rail" />
            <path d={full} className="gap" />
            {/* lit: every segment into a station that was started, drawn one after another */}
            {geo.segs.map((s, i) => stations[i].started && (
              <g key={i} className="lit" style={{ "--k": i }}>
                <path d={s.M + s.C} className="ties lit" style={{ stroke: `color-mix(in srgb, ${hex(stations[i].color, 0)} 70%, transparent)` }} />
                <path d={s.M + s.C} className="rail lit" style={{ stroke: `url(#jr-g${i})` }} pathLength="1" />
                <path d={s.M + s.C} className="gap lit" pathLength="1" />
              </g>
            ))}
            {allDone && <g className="lit" style={{ "--k": stations.length }}>
              <path d={geo.fin.M + geo.fin.C} className="rail lit" style={{ stroke: "url(#jr-gfin)" }} pathLength="1" />
              <path d={geo.fin.M + geo.fin.C} className="gap lit" pathLength="1" />
            </g>}
            {nextPath && <path d={nextPath} className="next" />}
            <circle cx={geo.start[0]} cy={geo.start[1]} r="7" className="start-dot" />
          </svg>
          <span className="jr-start" style={{ left: geo.start[0], top: geo.start[1] - 34 }}>יציאה</span>

          {/* chapter stops */}
          {geo.segs.map((s, i) => s.stops.map(({ ch, at }) => (
            <span key={i + ":" + ch.i} className={"jr-stop " + ch.state} data-topic={stations[i].color} style={{ left: at[0], top: at[1], "--k": i }}
              data-tip={chapterTitle(ch.name) + (ch.win ? ` · ${fmt(ch.win)} נפתרו` : ch.n ? " · התחלת" : "")}>
              {ch.state === "solved" && <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6.2l2 2 4-4.4" /></svg>}
            </span>
          )))}

          {/* half way sign */}
          {halfway > 0 && (() => {
            // at the map edge, level with the middle of the segment (the track is in the center there), away from the zone banner
            const s = geo.segs[halfway], p = s.at(0.5), right = (halfway - 1) % 2 === 0;
            return <span className={"jr-mile" + (halfLit ? " on" : "") + (right ? " r" : " l")} style={{ top: p[1], ...(right ? { right: 12 } : { left: 12 }) }}><i aria-hidden="true">🚩</i>חצי מסלול</span>;
          })()}

          {/* the avatar rides along the track to "you are here" */}
          {!reduced && <span className="jr-rider" style={{ offsetPath: `path("${ride}")` }} aria-hidden="true"><Avatar account={account} size={narrow ? 30 : 34} /></span>}

          {stations.map((st, i) => {
            const [x, y] = geo.pts[i];
            const right = i % 2 === 0;
            const isHere = i === here;
            const isNext = next && next.i === i;
            const circ = 2 * Math.PI * (R + 6);
            const state = st.lv.i >= 3 ? "gold" : st.started ? "on" : "off";
            const labelStyle = right ? { right: w - x + R + 14, top: y - 36, maxWidth: x - R - 18 } : { left: x + R + 14, top: y - 36, maxWidth: w - (x + R + 14) - 4 };
            return (
              <div key={st.slug} data-st={i} className={`jr-st ${state}${isHere ? " here" : ""}${isNext ? " is-next" : ""}${open === i ? " open" : ""}`} data-topic={st.color} style={{ "--i": i }}>
                <button type="button" className="jr-node" style={{ left: x - R, top: y - R, width: R * 2, height: R * 2 }}
                  aria-haspopup="dialog" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}
                  aria-label={`${st.name}: ${st.lv.name}${isHere ? " (את/ה כאן)" : ""}${isNext ? " (הצעד הבא)" : ""}. פתיחת פרטי התחנה`}>
                  <svg className="jr-ring" viewBox={`0 0 ${2 * (R + 9)} ${2 * (R + 9)}`} style={{ left: -11, top: -11, width: 2 * (R + 9), height: 2 * (R + 9) }} aria-hidden="true">
                    <circle cx={R + 9} cy={R + 9} r={R + 6} className="bg" />
                    {st.started && <circle cx={R + 9} cy={R + 9} r={R + 6} className="fg" style={{ strokeDasharray: `${circ * st.lv.pct} ${circ}` }} />}
                  </svg>
                  {state === "gold" && <span className="jr-shine" aria-hidden="true" />}
                  <Icon k={st.icon} />
                  {st.lv.i >= 3 && <span className="jr-crown" aria-hidden="true">{st.lv.i >= 4 ? "💎" : "👑"}</span>}
                  {isHere && <span className="jr-me"><Avatar account={account} size={narrow ? 28 : 32} /></span>}
                </button>
                <div className={"jr-label " + (right ? "to-left" : "to-right")} style={labelStyle} onClick={() => setOpen(i)}>
                  {(isHere || isNext || i === firstGold) && <span className="jr-pills">
                    {isHere && <span className="jr-here">{st.started ? "את/ה כאן" : "מתחילים כאן"}</span>}
                    {isNext && !(isHere && !st.started) && <span className="jr-nextp">הצעד הבא</span>}
                    {i === firstGold && <span className="jr-gold1">🏅 שליטה ראשונה</span>}
                  </span>}
                  <b>{st.name}</b>
                  {st.started ? <>
                    <span className="jr-lv"><Stars n={Math.max(0, st.lv.i - 1)} /> {st.lv.name}</span>
                    <small>{fmt(st.s.win)} נפתרו{st.known.length ? ` · ${fmt(st.chDone)}/${fmt(st.known.length)} פרקים` : st.acc != null ? ` · ${st.acc}% נכון` : ""}</small>
                  </> : <small className="muted">{st.known.length ? `${fmt(st.known.length)} פרקים · ` : ""}עוד לא התחלת</small>}
                </div>
                {open === i && !narrow && <StationSheet st={st} why={isNext ? next.why : null} onClose={() => setOpen(null)} mode="pop"
                  pos={right ? { right: w - x + R + 16, top: Math.max(10, Math.min(y - 70, geo.height - 560)), width: Math.min(380, x - R - 34) }
                    : { left: x + R + 16, top: Math.max(10, Math.min(y - 70, geo.height - 560)), width: Math.min(380, w - x - R - 34) }} />}
              </div>
            );
          })}

          {/* finish line */}
          <div className={"jr-flag" + (allDone ? " done" : "") + (allGold ? " gold" : "")} style={{ left: geo.flag[0] - 34, top: geo.flag[1] - 34 }}>
            <span aria-hidden="true">🏆</span>
          </div>
          <span className="jr-finish" style={{ left: geo.flag[0], top: geo.flag[1] - 54 }} aria-hidden="true" />
          <span className="jr-flag-t" style={{ left: geo.flag[0], top: geo.flag[1] + 42 }}>{allGold ? "מושלם! כל המסלול בשליטה" : allDone ? `הגעת לסוף המסלול של ${gradeName}` : `קו הסיום של ${gradeName}`}</span>
        </>}
      </div>
      {open != null && narrow && stations[open] && <StationSheet st={stations[open]} why={next && next.i === open ? next.why : null} onClose={() => setOpen(null)} mode="sheet" />}
    </section>
  );
}

/* ── station sheet: bottom sheet on phones, popover on wider screens ───── */
function StationSheet({ st, why, onClose, mode, pos }) {
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
          <span className="jr-lv">{st.started ? <><Stars n={Math.max(0, lv.i - 1)} /> {lv.name}</> : "עוד לא התחלת"}</span>
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
      </> : <p className="jr-sh-new">{why || "תחנה חדשה"}. {st.known.length ? `${fmt(st.known.length)} פרקים מחכים לך.` : "בוא/י נתחיל."}</p>}

      {why && st.started && <p className="jr-sh-why"><span aria-hidden="true">👉</span> הצעד הבא: {why}</p>}

      {st.ch.length > 0 && (
        <div className="jr-sh-ch">
          <h4>פרקים</h4>
          <ol>
            {st.ch.filter((c) => c.known || c.n + c.win > 0).map((c) => {
              const pct = Math.min(1, c.win / 5);
              const isWeak = st.weakest && st.weakest.name === c.name;
              return (
                <li key={c.name} className={c.state + (isWeak ? " weak" : "")}>
                  <i className={"jr-stop mini " + c.state} aria-hidden="true">{c.state === "solved" && <svg viewBox="0 0 12 12"><path d="M3 6.2l2 2 4-4.4" /></svg>}</i>
                  <span className="nm">{chapterTitle(c.name)}{isWeak && <em>כדאי לחזק</em>}</span>
                  <span className="bar" aria-hidden="true"><i style={{ width: Math.round(pct * 100) + "%" }} /></span>
                  <small>{c.win ? (c.win === 1 ? "נפתר 1" : `${fmt(c.win)} נפתרו`) : c.n ? "התחלת" : "—"}{c.acc != null ? ` · ${c.acc}%` : ""}</small>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="jr-sh-acts">
        <Link className="jr-sh-go" href={`/topics/${st.slug}`}>
          <span>{st.started ? "להמשיך לתרגל" : "להתחיל לתרגל"}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        {st.started && <Link className="jr-sh-more" href={`/profile/${st.slug}`}>כל הפרטים</Link>}
      </div>
    </div>
  );
  if (mode === "pop") return body;
  return createPortal(<div className="jr-sh-wrap" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>{body}</div>, document.body);
}
