'use client';
/* Admin charts: hand-drawn SVG, no chart library. Thin marks, quiet axes,
   a hover layer on every chart, drawn at the real width so text stays sharp. */
import { useEffect, useMemo, useRef, useState } from "react";

export const fmt = (n) => Number(n || 0).toLocaleString("he-IL");
const reduced = () => typeof window !== "undefined" && window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Width of the parent, kept up to date. */
function useWidth(min = 260, start = 720) {
  const ref = useRef(null);
  const [w, setW] = useState(start);
  useEffect(() => {
    const el = ref.current && ref.current.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(min, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, w];
}

/** Smooth path through points (monotone: never overshoots). */
export function smooth(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  const n = pts.length, dx = (i) => pts[i + 1][0] - pts[i][0], sl = (i) => (pts[i + 1][1] - pts[i][1]) / (dx(i) || 1);
  const m = pts.map((_, i) => (i === 0 ? sl(0) : i === n - 1 ? sl(n - 2) : sl(i - 1) * sl(i) <= 0 ? 0 : (sl(i - 1) + sl(i)) / 2));
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx(i) / 3;
    d += `C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + m[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - m[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}
const niceMax = (v) => { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
const dShort = (d) => { const x = new Date(d); return `${x.getDate()}/${x.getMonth() + 1}`; };

/** Number that counts up when it appears. */
export function CountUp({ value, format = fmt, className }) {
  const [v, setV] = useState(reduced() ? value : 0);
  useEffect(() => {
    if (reduced()) { setV(value); return; }
    let raf, t0;
    const from = 0, dur = 900;
    const step = (t) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      setV(from + (value - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{format(Math.round(v))}</span>;
}

export function Sparkline({ data, color = "var(--s1)", className = "spark" }) {
  const w = 120, h = 36, max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, h - 3 - ((v - min) / (max - min || 1)) * (h - 6)]);
  const d = smooth(pts);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d}L${w},${h}L0,${h}Z`} fill={color} opacity=".1" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

/** Answers per day vs the previous period (dashed), with crosshair + tooltip. */
export function AreaCompare({ data, prev = [], height = 260 }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const H = W < 500 ? Math.round(height * 0.82) : height, P = { t: 14, r: 8, b: 26, l: 44 };
  const total = (d) => (d ? d.ok + d.bad : 0);
  const max = useMemo(() => niceMax(Math.max(...data.map(total), ...prev.map(total), 1) * 1.05), [data, prev]);
  const x = (i) => P.l + (i / Math.max(1, data.length - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  const cur = smooth(data.map((d, i) => [x(i), y(total(d))]));
  const prv = prev.length ? smooth(prev.slice(-data.length).map((d, i, a) => [x(i + (data.length - a.length)), y(total(d))])) : "";
  const every = Math.ceil(data.length / (W < 500 ? 4 : 7));
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1)))));
  };
  const h = hover != null ? data[hover] : null;
  const pv = hover != null ? prev[prev.length - data.length + hover] : null;
  const acc = h && total(h) ? Math.round((h.ok / total(h)) * 100) : null;
  return (
    <div className="chart" dir="ltr">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchStart={(e) => onMove(e.touches[0])} onTouchMove={(e) => onMove(e.touches[0])} role="img" aria-label="תשובות לפי יום מול התקופה הקודמת">
        <defs><linearGradient id="ac-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--s1)" stopOpacity=".18" /><stop offset="1" stopColor="var(--s1)" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}><line className="gl" x1={P.l} x2={W - P.r} y1={y(max * t)} y2={y(max * t)} /><text className="ax" x={P.l - 8} y={y(max * t) + 4} textAnchor="end">{fmt(max * t)}</text></g>
        ))}
        {data.map((d, i) => (i % every === 0 || (i === data.length - 1 && (data.length - 1) % every >= every * 0.6)) && <text key={d.day} className="ax" x={x(i)} y={H - 6} textAnchor="middle">{dShort(d.day)}</text>)}
        {prv && <path d={prv} fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="4 4" opacity=".75" />}
        <path className="draw-area" d={`${cur}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill="url(#ac-g)" />
        <path className="draw-line" d={cur} fill="none" stroke="var(--s1)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" pathLength="1" />
        {h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx={x(hover)} cy={y(total(h))} r="5" fill="var(--s1)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div className="ctip" dir="rtl" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? "-108%" : "8%"})` }}>
          <p className="ctip-d">{new Date(h.day).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</p>
          <p className="ctip-v">{fmt(total(h))} תשובות</p>
          <p><i style={{ background: "var(--ok-c)" }} />{fmt(h.ok)} נכונות · <i style={{ background: "var(--bad-c)" }} />{fmt(h.bad)} שגויות</p>
          <p className="ctip-m">הצלחה {acc == null ? "—" : acc + "%"} · {fmt(h.active)} תלמידים{pv ? ` · תקופה קודמת ${fmt(total(pv))}` : ""}</p>
        </div>
      )}
    </div>
  );
}

/** Correct (blue) + wrong (orange) stacked per day. */
export function StackedBars({ data, height = 230 }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const H = height, P = { t: 10, r: 6, b: 26, l: 40 }, iw = W - P.l - P.r, ih = H - P.t - P.b;
  const max = niceMax(Math.max(...data.map((d) => d.ok + d.bad), 1));
  const slot = iw / Math.max(1, data.length), bw = Math.max(2, Math.min(26, slot * 0.66));
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 46)));
  const h = hover != null ? data[hover] : null;
  return (
    <div className="chart" dir="ltr">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" onMouseLeave={() => setHover(null)} role="img" aria-label="תשובות נכונות ושגויות לפי יום">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line className="gl" x1={P.l} x2={W - P.r} y1={P.t + ih * (1 - t)} y2={P.t + ih * (1 - t)} /><text className="ax" x={P.l - 8} y={P.t + ih * (1 - t) + 4} textAnchor="end">{fmt(max * t)}</text></g>)}
        {data.map((d, i) => {
          const x0 = P.l + slot * i + (slot - bw) / 2, hOk = (d.ok / max) * ih, hBad = (d.bad / max) * ih;
          const dim = hover != null && hover !== i;
          return (
            <g key={d.day} opacity={dim ? 0.45 : 1} className="bar-g" style={{ "--bi": i }}>
              <rect x={x0} y={P.t + ih - hOk} width={bw} height={Math.max(0, hOk)} fill="var(--ok-c)" />
              {hBad > 2 && <rect x={x0} y={P.t + ih - hOk - hBad} width={bw} height={hBad - 2} rx="3" fill="var(--bad-c)" />}
              {(i % every === 0 || (i === data.length - 1 && (data.length - 1) % every >= every * 0.6)) && <text className="ax" x={x0 + bw / 2} y={H - 6} textAnchor="middle">{dShort(d.day)}</text>}
              <rect x={P.l + slot * i} y={P.t} width={slot} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      {h && (
        <div className="ctip" dir="rtl" style={{ left: `${((P.l + slot * hover + slot / 2) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? "-108%" : "8%"})` }}>
          <p className="ctip-d">{new Date(h.day).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" })}</p>
          <p><i style={{ background: "var(--ok-c)" }} />{fmt(h.ok)} נכונות</p>
          <p><i style={{ background: "var(--bad-c)" }} />{fmt(h.bad)} שגויות</p>
          <p className="ctip-m">הצלחה {h.ok + h.bad ? Math.round((h.ok / (h.ok + h.bad)) * 100) + "%" : "—"}</p>
        </div>
      )}
    </div>
  );
}

/** Single-series bars (e.g. revenue by month). */
export function Bars({ data, height = 220, format = fmt, label }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const H = height, P = { t: 10, r: 6, b: 26, l: 44 }, iw = W - P.l - P.r, ih = H - P.t - P.b;
  const max = niceMax(Math.max(...data.map((d) => d.v), 1));
  const slot = iw / Math.max(1, data.length), bw = Math.max(2, Math.min(30, slot * 0.6));
  const h = hover != null ? data[hover] : null;
  return (
    <div className="chart" dir="ltr">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" onMouseLeave={() => setHover(null)} role="img" aria-label={label}>
        {[0, 0.5, 1].map((t) => <g key={t}><line className="gl" x1={P.l} x2={W - P.r} y1={P.t + ih * (1 - t)} y2={P.t + ih * (1 - t)} /><text className="ax" x={P.l - 8} y={P.t + ih * (1 - t) + 4} textAnchor="end">{format(max * t)}</text></g>)}
        {data.map((d, i) => {
          const x0 = P.l + slot * i + (slot - bw) / 2, bh = (d.v / max) * ih;
          return (
            <g key={i} opacity={hover != null && hover !== i ? 0.45 : 1}>
              <rect x={x0} y={P.t + ih - bh} width={bw} height={Math.max(0, bh)} rx="3" fill="var(--s1)" />
              <text className="ax" x={x0 + bw / 2} y={H - 6} textAnchor="middle">{d.label}</text>
              <rect x={P.l + slot * i} y={P.t} width={slot} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      {h && <div className="ctip" dir="rtl" style={{ left: `${((P.l + slot * hover + slot / 2) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? "-108%" : "8%"})` }}><p className="ctip-d">{h.tipTitle || h.label}</p><p className="ctip-v">{format(h.v)}</p>{h.tip && <p className="ctip-m">{h.tip}</p>}</div>}
    </div>
  );
}

/** Answers by weekday × hour, one hue light→dark. */
export function Heatmap({ cells }) {
  const [hover, setHover] = useState(null);
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  cells.forEach((c) => { grid[c.d][c.h] = c.n; });
  const max = Math.max(...grid.flat(), 1);
  const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 07:00–23:00
  return (
    <div className="heat">
      <div className="heat-g" style={{ gridTemplateColumns: `24px repeat(${hours.length}, minmax(0,1fr))` }} dir="ltr">
        <span />
        {hours.map((h) => <span key={h} className="heat-x">{h % 3 === 0 ? h : ""}</span>)}
        {grid.map((row, d) => (
          <div key={d} className="heat-row">
            <span className="heat-y">{days[d]}</span>
            {hours.map((h) => {
              const v = row[h];
              return <span key={h} className="heat-c" onMouseEnter={() => setHover([d, h])} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover([d, h])}
                style={{ background: v ? `color-mix(in oklab, var(--s1) ${14 + (v / max) * 86}%, var(--surface))` : "var(--surface-3)" }} />;
            })}
          </div>
        ))}
      </div>
      <div className="heat-f">
        <span>{hover ? `יום ${days[hover[0]]}, ${String(hover[1]).padStart(2, "0")}:00 · ${fmt(grid[hover[0]][hover[1]])} תשובות` : "העבירו את העכבר על משבצת"}</span>
        <span className="heat-l">פחות <i /> יותר</span>
      </div>
    </div>
  );
}

/** Part-to-whole with legend (identity never colour alone). */
export function Donut({ rows, center, sub = "סה״כ", format = fmt }) {
  const [hover, setHover] = useState(null);
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const R = 70, r0 = 50, C = 90, gap = 0.03;
  let a = -Math.PI / 2;
  const arcs = rows.map((row, i) => {
    const sweep = (row.value / total) * Math.PI * 2, s = a + (sweep > gap * 2 ? gap : 0), e = a + sweep - (sweep > gap * 2 ? gap : 0);
    a += sweep;
    const p = (ang, rad) => `${(C + rad * Math.cos(ang)).toFixed(2)},${(C + rad * Math.sin(ang)).toFixed(2)}`;
    const large = e - s > Math.PI ? 1 : 0;
    return { i, d: sweep >= Math.PI * 2 - 0.001 ? `M${C},${C - R}A${R},${R} 0 1 1 ${C - 0.01},${C - R}L${C - 0.01},${C - r0}A${r0},${r0} 0 1 0 ${C},${C - r0}Z` : `M${p(s, R)}A${R},${R} 0 ${large} 1 ${p(e, R)}L${p(e, r0)}A${r0},${r0} 0 ${large} 0 ${p(s, r0)}Z` };
  });
  const h = hover != null ? rows[hover] : null;
  return (
    <div className="donut">
      <svg viewBox="0 0 180 180" className="donut-s" role="img" aria-label={sub}>
        {arcs.map(({ i, d }) => <path key={i} d={d} fill={rows[i].color} opacity={hover == null || hover === i ? 1 : 0.35} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />)}
        <text x={C} y={C - 2} textAnchor="middle" className="donut-v">{h ? `${Math.round((h.value / total) * 100)}%` : center}</text>
        <text x={C} y={C + 16} textAnchor="middle" className="donut-l">{h ? h.key : sub}</text>
      </svg>
      <ul className="donut-k">
        {rows.map((row, i) => (
          <li key={row.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={hover === i ? "on" : ""}>
            <i style={{ background: row.color }} /><span>{row.key}</span>
            <span className="muted">{Math.round((row.value / total) * 100)}%</span><b>{format(row.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Half-circle gauge: one value against 100%. */
export function Gauge({ value, label, sub, goal }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const R = 80, C = 100, a = Math.PI + (v / 100) * Math.PI;
  const pt = (ang, r = R) => [C + r * Math.cos(ang), C + r * Math.sin(ang)];
  const [nx, ny] = pt(a, 52);
  const g = goal != null ? Math.PI + (goal / 100) * Math.PI : null;
  return (
    <div className="gauge">
      <svg viewBox="0 0 200 118" role="img" aria-label={`${label}: ${Math.round(v)}%`}>
        <path d={`M${pt(Math.PI).join(",")} A${R},${R} 0 0 1 ${pt(2 * Math.PI).join(",")}`} fill="none" stroke="var(--surface-3)" strokeWidth="14" strokeLinecap="round" />
        <path className="gauge-arc" d={`M${pt(Math.PI).join(",")} A${R},${R} 0 0 1 ${pt(a).join(",")}`} fill="none" stroke={v >= (goal || 0) ? "var(--ok-600)" : "var(--s1)"} strokeWidth="14" strokeLinecap="round" pathLength="100" />
        {g && <line x1={pt(g, 62)[0]} y1={pt(g, 62)[1]} x2={pt(g, 98)[0]} y2={pt(g, 98)[1]} stroke="var(--ink)" strokeWidth="2" strokeDasharray="3 2" />}
        <line className="gauge-needle" x1={C} y1={C} x2={nx} y2={ny} stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={C} cy={C} r="7" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3.5" />
      </svg>
      <p className="gauge-v">{Math.round(v)}%</p>
      <p className="gauge-l">{label}</p>
      {sub && <p className="gauge-s">{sub}</p>}
    </div>
  );
}

/** Ranked bars with direct labels. */
export function BarList({ rows, format = fmt, color = "var(--s1)" }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="barlist">
      {rows.map((r, i) => (
        <li key={r.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <div className="bl-t"><span className="bl-k">{r.icon}{r.key}</span><span className="bl-v">{format(r.value)}{r.sub && <span className="muted"> · {r.sub}</span>}</span></div>
          <div className="bl-b"><i style={{ width: `${(r.value / max) * 100}%`, background: r.color || color, opacity: hover == null || hover === i ? 1 : 0.45 }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Funnel as stepped bars with step-to-step rate. */
export function Funnel({ steps }) {
  const max = steps[0] && steps[0].value ? steps[0].value : 1;
  return (
    <ol className="funnel">
      {steps.map((s, i) => (
        <li key={s.key}>
          <div className="bl-t"><span>{s.key}</span><span className="bl-v">{fmt(s.value)}{i > 0 && <span className="muted"> · {steps[i - 1].value ? ((s.value / steps[i - 1].value) * 100).toFixed(1) + "%" : "—"}</span>}</span></div>
          <div className="fn-b"><i style={{ width: `${Math.max(1.5, (s.value / max) * 100)}%`, opacity: 1 - i * 0.14 }} /></div>
        </li>
      ))}
    </ol>
  );
}

/** Today's answers as dots along the day. */
export function DayTimeline({ events, from = 7, to = 24 }) {
  const [hover, setHover] = useState(null);
  const now = new Date(), nowH = now.getHours() + now.getMinutes() / 60;
  const pos = (h) => ((Math.min(to, Math.max(from, h)) - from) / (to - from)) * 100;
  const tone = { ok: "var(--ok-c)", bad: "var(--bad-c)", win: "var(--ok-600)" };
  const label = { ok: "נכון", bad: "שגוי", win: "פתר תרגיל" };
  return (
    <div className="tl" dir="ltr">
      <div className="tl-track">
        <div className="tl-line" />
        <div className="tl-done" style={{ width: `${pos(nowH)}%` }} />
        {events.map((e, i) => {
          const d = new Date(e.at), h = d.getHours() + d.getMinutes() / 60;
          return <button key={i} type="button" className="tl-dot" aria-label={label[e.kind]} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} style={{ left: `${pos(h)}%`, background: tone[e.kind] }} />;
        })}
        <span className="tl-now" style={{ left: `${pos(nowH)}%` }} title="עכשיו" />
        {hover != null && events[hover] && <span className="tl-tip" style={{ left: `${pos(new Date(events[hover].at).getHours() + new Date(events[hover].at).getMinutes() / 60)}%` }} dir="rtl">{new Date(events[hover].at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} · {label[events[hover].kind]} · {events[hover].name}</span>}
      </div>
      <div className="tl-x">{[7, 10, 13, 16, 19, 22].map((h) => <span key={h}>{h}:00</span>)}</div>
    </div>
  );
}
