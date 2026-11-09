'use client';
/* Duels: effects — sounds, shake, floating points, counting numbers, the
   phone's status-bar colour. Everything respects prefers-reduced-motion and
   the site's sound switch (localStorage "mp:sound", the same key the topic
   pages' runtime uses; "off" = silent). Only transform/opacity animate.

   sfx("tick" | "go" | "ok" | "bad" | "x2" | "over" | "end")
   reduced()                 → true when motion should be minimal
   shake(el, strong?)        one shake on an element (none under reduced motion)
   floatPoints(el, text)     "+142" rising out of a button
   useCountUp(value, ms)     a number that counts to its new value (jumps under reduced motion)
   usePaintStatusBar(color, on)   theme-color + html/body background while a dark screen is up */
import { useEffect, useRef, useState } from "react";

export function reduced() {
  try { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch { return false; }
}

/* ── sound: soft mallet notes, like src/lib/mp-runtime.js ───────────────── */
const KEY = "mp:sound";
let ctx = null, out = null, unlocked = false;
function soundOn() { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } }
function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    out = ctx.createGain(); out.gain.value = 1;
    out.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === "suspended") { try { ctx.resume(); } catch {} }
  return ctx;
}
/* iPhone: audio may only start inside a real tap — arm it on the first touch */
function unlock() {
  if (unlocked) return;
  const c = audio();
  if (!c) return;
  try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch {}
  if (c.state === "running") { unlocked = true; for (const t of EV) document.removeEventListener(t, unlock, true); }
}
const EV = ["touchend", "pointerup", "click", "keydown"];
export function armSound() {
  if (typeof document === "undefined" || unlocked || !soundOn()) return;
  for (const t of EV) document.addEventListener(t, unlock, true);
}
function note(freq, o = {}) {
  const c = audio(); if (!c) return;
  const t0 = c.currentTime + (o.at || 0) + 0.005;
  const dur = o.dur || 0.2, vol = o.vol || 0.07;
  const body = c.createOscillator(), g = c.createGain();
  body.type = o.type || "sine";
  body.frequency.setValueAtTime(freq, t0);
  if (o.to) body.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  body.connect(g); g.connect(out);
  body.start(t0); body.stop(t0 + dur + 0.05);
  if (o.shine) {
    const hi = c.createOscillator(), hg = c.createGain();
    hi.type = "sine"; hi.frequency.setValueAtTime(freq * 4, t0);
    hg.gain.setValueAtTime(0.0001, t0);
    hg.gain.exponentialRampToValueAtTime(vol * o.shine, t0 + 0.004);
    hg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.35);
    hi.connect(hg); hg.connect(out);
    hi.start(t0); hi.stop(t0 + dur);
  }
}
const SOUNDS = {
  tick: () => note(880, { dur: 0.09, vol: 0.05, type: "triangle" }),
  go:   () => { [659.25, 783.99, 1046.5].forEach((f, i) => note(f, { at: i * 0.07, dur: 0.35, vol: 0.07, shine: 0.3 })); },
  ok:   () => { note(784, { dur: 0.2, vol: 0.07, shine: 0.25 }); note(1175, { at: 0.08, dur: 0.3, vol: 0.07, shine: 0.25 }); },
  bad:  () => { note(330, { dur: 0.15, vol: 0.055, type: "triangle" }); note(262, { at: 0.1, dur: 0.24, vol: 0.055, type: "triangle", to: 247 }); },
  x2:   () => { note(523.25, { dur: 0.12, vol: 0.06 }); note(523.25, { at: 0.16, dur: 0.12, vol: 0.06 }); note(783.99, { at: 0.32, dur: 0.3, vol: 0.06, shine: 0.3 }); },
  over: () => { note(587.33, { dur: 0.12, vol: 0.06 }); note(880, { at: 0.1, dur: 0.3, vol: 0.07, shine: 0.3 }); },
  end:  () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, { at: i * 0.075, dur: 0.4, vol: 0.055, shine: 0.3 })); },
};
export const sfxLog = [];
export function sfx(name) {
  sfxLog.push(name);
  if (typeof document === "undefined" || !soundOn() || document.hidden || !SOUNDS[name]) return;
  try { SOUNDS[name](); } catch {}
}

/* ── motion ──────────────────────────────────────────────────────────────── */
export function shake(el, strong) {
  if (!el || reduced()) return;
  const cls = strong ? "dar-shake" : "dar-shake-sm";
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  const off = () => { el.classList.remove(cls); el.removeEventListener("animationend", off); };
  el.addEventListener("animationend", off);
  setTimeout(off, 700);
}

export function floatPoints(el, text, color) {
  if (!el || typeof document === "undefined") return;
  const root = el.closest(".dar") || document.body;
  const r = el.getBoundingClientRect(), pr = root.getBoundingClientRect();
  const f = document.createElement("b");
  f.className = "dar-float";
  f.textContent = text;
  if (color) f.style.color = color;
  f.style.left = (r.left - pr.left + r.width / 2) + "px";
  f.style.top = (r.top - pr.top + 8) + "px";
  root.appendChild(f);
  if (reduced()) { setTimeout(() => f.remove(), 700); return; }
  const a = f.animate(
    [{ transform: "translate(-50%, 0) scale(.7)", opacity: 0 }, { transform: "translate(-50%, -22px) scale(1.1)", opacity: 1, offset: 0.25 }, { transform: "translate(-50%, -84px) scale(1)", opacity: 0 }],
    { duration: 950, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
  a.onfinish = () => f.remove();
  setTimeout(() => f.remove(), 1200);
}

/** a number that counts up (or down) to its new value */
export function useCountUp(value, ms = 500) {
  const v = Number(value) || 0;
  const [shown, setShown] = useState(v);
  const from = useRef(v);
  useEffect(() => {
    const start = from.current;
    if (start === v) return;
    if (reduced() || typeof requestAnimationFrame === "undefined") { from.current = v; setShown(v); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const cur = Math.round(start + (v - start) * e);
      setShown(cur);
      if (k < 1) raf = requestAnimationFrame(step); else from.current = v;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = v; };
  }, [v, ms]);
  return shown;
}

/** paint the phone's status bar (theme-color + html/body background) while a dark screen is up */
export function usePaintStatusBar(color, on = true) {
  useEffect(() => {
    if (!on || typeof document === "undefined") return;
    const meta = document.querySelector('meta[name="theme-color"]');
    const before = meta && meta.getAttribute("content");
    const html = document.documentElement, body = document.body;
    const prev = [html.style.backgroundColor, body.style.backgroundColor];
    if (meta) meta.setAttribute("content", color);
    html.style.backgroundColor = color; body.style.backgroundColor = color;
    return () => {
      if (meta && before) meta.setAttribute("content", before);
      html.style.backgroundColor = prev[0]; body.style.backgroundColor = prev[1];
    };
  }, [color, on]);
}
