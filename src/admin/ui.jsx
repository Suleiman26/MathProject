'use client';
/* Admin building blocks. */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Info, X, Trash, DotsSixVertical } from "@phosphor-icons/react";
import { iconSvg } from "@/lib/icons";

export const fmt = (n) => Number(n || 0).toLocaleString("he-IL");
export const money = (n) => "⁦₪" + Number(n || 0).toLocaleString("he-IL", { maximumFractionDigits: 0 }) + "⁩";
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
export function ago(t) {
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 60) return "עכשיו";
  if (s < 3600) return "לפני " + Math.round(s / 60) + " דק׳";
  if (s < 86400) return "לפני " + Math.round(s / 3600) + " שע׳";
  if (s < 86400 * 7) return "לפני " + Math.round(s / 86400) + " ימים";
  return new Date(t).toLocaleDateString("he-IL");
}
export const studentName = (dev) => "תלמיד #" + String(dev || "").replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase();

export function Card({ title, sub, action, className = "", children, style }) {
  return (
    <section className={"a-card card-in " + className} style={style}>
      {(title || action) && (
        <div className="a-card-h">
          <div><h2>{title}</h2>{sub && <small>{sub}</small>}</div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Delta({ now, prev, unit }) {
  if (prev == null || (prev === 0 && now === 0)) return <span className="delta">—</span>;
  if (unit === "pt") {
    const d = Math.round(now - prev);
    return <span className={"delta " + (d > 0 ? "up" : d < 0 ? "down" : "")}><bdi>{d > 0 ? "↗ " : d < 0 ? "↘ " : ""}{Math.abs(d)}</bdi> נק׳</span>;
  }
  if (!prev) return <span className="delta up">חדש</span>;
  const d = Math.round(((now - prev) / prev) * 100);
  return <span className={"delta " + (d > 0 ? "up" : d < 0 ? "down" : "")}><bdi>{d > 0 ? "↗ " : d < 0 ? "↘ " : ""}{Math.abs(d)}%</bdi></span>;
}

export function Kpi({ tone = "", icon, label, value, delta, sub, spark, style }) {
  return (
    <section className={"a-kpi card-in " + tone} style={style}>
      <div className="a-kpi-l"><span className="a-kpi-i">{icon}</span>{label}</div>
      <div className="a-kpi-v">{value}</div>
      <div className="a-kpi-f"><span className="a-kpi-s">{delta} {sub && <span>{sub}</span>}</span>{spark && <span className="a-kpi-sp">{spark}</span>}</div>
    </section>
  );
}

export function Badge({ tone = "", children }) { return <span className={"badge " + tone}>{children}</span>; }

export function Meter({ value }) {
  if (value == null) return <span className="muted">—</span>;
  return <span className="meter"><span className="bar"><i style={{ width: value + "%", background: value < 60 ? "var(--bad-c)" : "var(--ok-c)" }} /></span><b>{value}%</b></span>;
}
export function Level({ ok, bad }) {
  const n = ok + bad, a = pct(ok, n);
  if (n < 5) return <Badge>מעט נתונים</Badge>;
  if (a < 60) return <Badge tone="hard">קשה</Badge>;
  if (a < 80) return <Badge tone="mid">בינוני</Badge>;
  return <Badge tone="easy">קל</Badge>;
}
export function TopicIcon({ t, size = "" }) {
  return <span className={"t-ic " + size} data-topic={t.color || "teal"} dangerouslySetInnerHTML={{ __html: iconSvg(t.icon) }} />;
}

export function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}
export function Switch({ on, onChange, label }) {
  return <button type="button" className="switch" role="switch" aria-checked={!!on} aria-label={label} onClick={() => onChange(!on)} />;
}
export function Empty({ icon, title, children }) {
  return <div className="empty">{icon}<b>{title}</b>{children}</div>;
}

/* ── toasts ─────────────────────────────────────────────────────────────── */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastHost({ children }) {
  const [t, setT] = useState(null);
  const timer = useRef();
  const show = (msg, err) => { setT({ msg, err, k: Date.now() }); clearTimeout(timer.current); timer.current = setTimeout(() => setT(null), 2400); };
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={"toast" + (t ? " on" : "") + (t && t.err ? " err" : "")} role="status">{t && (t.err ? <Info size={18} /> : <Check size={18} weight="bold" />)}<span>{t && t.msg}</span></div>
    </ToastCtx.Provider>
  );
}

/* ── sheet (edit dialog) ────────────────────────────────────────────────── */
export function Sheet({ title, onClose, onSave, onDelete, children, saving }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setOn(true));
    const key = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function close() { setOn(false); setTimeout(onClose, 200); }
  return createPortal(
    <div className={"scrim" + (on ? " on" : "")} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-h"><h3>{title}</h3><button type="button" className="ibtn" onClick={close} aria-label="סגירה"><X size={18} /></button></div>
        <div className="sheet-b" onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") onSave(close); }}>{children}</div>
        <div className="sheet-f">
          {onDelete && <button type="button" className="abtn danger" onClick={() => onDelete(close)}><Trash size={17} />מחיקה</button>}
          <span className="grow" />
          <button type="button" className="abtn ghost" onClick={close}>ביטול</button>
          <button type="button" className="abtn pri" disabled={saving} onClick={() => onSave(close)}><Check size={17} weight="bold" />שמירה</button>
        </div>
      </div>
    </div>,
    document.querySelector(".adm-root") || document.body
  );
}

/* ── drag to reorder (finger, mouse, keyboard) ──────────────────────────── */
export function Sortable({ items, render, onOrder, className = "sortable", itemClass = "item" }) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const box = useRef(null);
  const before = useRef(null);
  useEffect(() => { setOrder(items.map((i) => i.id)); }, [items]);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const reduced = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // glide items from where they were to where they are now
  useLayoutEffect(() => {
    if (!before.current || !box.current || reduced) { before.current = null; return; }
    const prev = before.current; before.current = null;
    Array.from(box.current.children).forEach((el) => {
      const was = prev[el.dataset.id]; if (was == null) return;
      const d = was - el.getBoundingClientRect().top; if (!d) return;
      el.style.transform = `translateY(${d}px)`; el.getBoundingClientRect();
      el.classList.add("shift"); el.style.transform = "";
      setTimeout(() => el.classList.remove("shift"), 260);
    });
  }, [order, reduced]);

  function commit(next, positions) {
    before.current = positions;
    setOrder(next);
    onOrder(next);
  }
  function snapshot() {
    const m = {}; Array.from(box.current.children).forEach((el) => { m[el.dataset.id] = el.getBoundingClientRect().top; }); return m;
  }

  function onPointerDown(e) {
    const h = e.target.closest(".handle"); if (!h || e.button > 0) return;
    const item = h.closest("[data-id]"); if (!item || item.parentElement !== box.current) return;
    e.preventDefault();
    const all = Array.from(box.current.children), from = all.indexOf(item);
    const rects = all.map((el) => el.getBoundingClientRect());
    const gap = all.length > 1 ? rects[1].top - rects[0].bottom : 8;
    const step = rects[from].height + gap, startY = e.clientY, startScroll = scrollY;
    let to = from, lastY = e.clientY, raf;
    item.classList.add("dragging");
    all.forEach((el) => { if (el !== item) el.classList.add("shift"); });
    if (navigator.vibrate) navigator.vibrate(8);
    h.setPointerCapture(e.pointerId);
    const layout = () => {
      const dy = lastY - startY + (scrollY - startScroll);
      item.style.transform = `translateY(${dy}px)`;
      const center = rects[from].top + rects[from].height / 2 + dy;
      to = 0; all.forEach((el, i) => { if (i !== from && rects[i].top + rects[i].height / 2 < center) to++; });
      all.forEach((el, i) => { if (el === item) return; const s = i > from && i <= to ? -step : i < from && i >= to ? step : 0; el.style.transform = s ? `translateY(${s}px)` : ""; });
    };
    const auto = () => {
      const edge = 80; let v = 0;
      if (lastY < edge) v = -Math.ceil((edge - lastY) / 6); else if (lastY > innerHeight - edge) v = Math.ceil((lastY - (innerHeight - edge)) / 6);
      if (v) { scrollBy(0, v); layout(); }
      raf = requestAnimationFrame(auto);
    };
    raf = requestAnimationFrame(auto);
    const move = (ev) => { lastY = ev.clientY; layout(); };
    const end = () => {
      cancelAnimationFrame(raf);
      h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", end); h.removeEventListener("pointercancel", end);
      const pos = snapshot();
      all.forEach((el) => { el.classList.remove("shift", "dragging"); el.style.transform = ""; });
      if (to !== from) { const next = order.slice(); const [m] = next.splice(from, 1); next.splice(to, 0, m); commit(next, pos); }
    };
    h.addEventListener("pointermove", move); h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end);
  }
  function onKeyDown(e) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const h = e.target.closest(".handle"); if (!h) return;
    const item = h.closest("[data-id]"); if (!item || item.parentElement !== box.current) return;
    e.preventDefault();
    const i = order.indexOf(item.dataset.id), j = e.key === "ArrowUp" ? i - 1 : i + 1;
    if (j < 0 || j >= order.length) return;
    const next = order.slice(); [next[i], next[j]] = [next[j], next[i]];
    commit(next, snapshot());
    requestAnimationFrame(() => { const el = box.current.querySelector(`[data-id="${item.dataset.id}"] .handle`); if (el) el.focus(); });
  }
  return (
    <div ref={box} className={className} onPointerDown={onPointerDown} onKeyDown={onKeyDown}>
      {order.filter((id) => byId[id]).map((id) => <div key={id} data-id={id} className={itemClass + (byId[id].visible === false || byId[id].active === false ? " is-hidden" : "")}>{render(byId[id])}</div>)}
    </div>
  );
}
export function Handle() {
  return <button type="button" className="handle" aria-label="גרירה לשינוי סדר (או חיצים במקלדת)"><DotsSixVertical size={20} weight="bold" /></button>;
}
