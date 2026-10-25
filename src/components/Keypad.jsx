'use client';
/* Math keypad for phones.
   It types into Sulaiman's existing answer boxes the same characters a
   normal keyboard would, so his checking logic is never touched.

   On by default on touch screens; the admin can turn it off in Settings. */
import { useEffect, useRef, useState } from "react";
import { mpData } from "@/lib/mp-data";

const SETTING = "mp:set:keypad";
const CHECK = /בדוק|בדיקה|אשר|אישור|✓/;
const BACK = "⌫", OK = "✓";

// which keys a box needs, guessed from the box itself (never from the answer)
function kindOf(el, page) {
  const ph = (el.getAttribute("placeholder") || "").trim();
  const cls = el.className || "";
  const extras = [];
  if (/:/.test(ph)) extras.push(":");
  if (/,/.test(ph)) extras.push(",");
  if (/\/|מונה|מכנה/.test(ph)) extras.push("/");
  if (page === "circle") extras.push("π");
  if (page === "inequalities") extras.push("<", ">");
  let mode = "num";
  if (/math-input/.test(cls) || /משוואה|=|צד|\bx\b|y/.test(ph)) mode = "math";
  if (/^(equations-advanced|intersection|parabola-practice|quadratic-solver)$/.test(page) && (ph === "" || ph === "-")) mode = "math";
  if (el.inputMode === "numeric" || /^(op-input|eqs-val|slv-opinput)$/.test(cls)) mode = "num";
  return { mode, extras };
}

const NUM = [
  ["7", "8", "9", BACK],
  ["4", "5", "6", "−"],
  ["1", "2", "3", OK],
  ["x=", "0", "."],
];
const MATH = [
  ["7", "8", "9", "x", "²", BACK],
  ["4", "5", "6", "+", "−", "="],
  ["1", "2", "3", "(", ")", OK],
  ["123", "0", ".", "/", "√"],
];
// what each key types (the rest type their own label)
const TYPES = { "−": "-" };


function setValue(el, value, caret) {
  const proto = Object.getPrototypeOf(el);
  const d = Object.getOwnPropertyDescriptor(proto, "value");
  d.set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  try { el.setSelectionRange(caret, caret); } catch {}
}

function typeInto(el, text) {
  const v = el.value || "";
  let s = el.selectionStart, e = el.selectionEnd;
  if (s == null) { s = e = v.length; }
  const max = el.maxLength > 0 ? el.maxLength : Infinity;
  if (v.length - (e - s) + text.length > max) return;
  setValue(el, v.slice(0, s) + text + v.slice(e), s + text.length);
}

function backspace(el) {
  const v = el.value || "";
  let s = el.selectionStart, e = el.selectionEnd;
  if (s == null) { s = e = v.length; }
  if (s === e) { if (!s) return; s -= 1; }
  setValue(el, v.slice(0, s) + v.slice(e), s);
}

function checkButtonFor(el) {
  // the nearest "check / confirm" button around this box
  let box = el.parentElement;
  for (let i = 0; box && i < 7; i++, box = box.parentElement) {
    const b = Array.from(box.querySelectorAll("button")).find((x) => CHECK.test(x.textContent || "") && !x.disabled && x.offsetParent);
    if (b) return b;
  }
  return null;
}

// the question area: the smallest box that holds both the answer box and its check button
function cardOf(el) {
  const b = checkButtonFor(el);
  let c = el.parentElement;
  while (c && b && !c.contains(b)) c = c.parentElement;
  return (b && c) || document.getElementById("root");
}

function fields() {
  return Array.from(document.querySelectorAll("#root input")).filter((i) => !/checkbox|radio|range|hidden/.test(i.type) && !i.disabled && !i.readOnly && i.offsetParent);
}

export default function Keypad({ page }) {
  const [on, setOn] = useState(false);       // feature switched on
  const [target, setTarget] = useState(null); // the focused answer box
  const [mode, setMode] = useState("num");
  const [extras, setExtras] = useState([]);
  const ref = useRef(null);
  const tgt = useRef(null);
  const hold = useRef(null);
  const opened = useRef(0);
  const swallow = useRef(0);
  const closeRef = useRef(() => {});

  // On for everyone on touch screens. The admin can switch it off
  // (Settings → math keypad); the last known choice is kept in this browser.
  useEffect(() => {
    let alive = true;
    const touch = matchMedia("(pointer: coarse)").matches;
    let cached = null;
    try { cached = localStorage.getItem(SETTING); } catch {}
    setOn(touch && cached !== "off");
    if (mpData.ready) {
      mpData.select("site_settings", "select=value&key=eq.keypad").then((rows) => {
        const v = rows && rows[0] ? rows[0].value !== false : true;
        try { localStorage.setItem(SETTING, v ? "on" : "off"); } catch {}
        if (alive) setOn(touch && v);
      }).catch(() => {});
    }
    return () => { alive = false; };
  }, []);

  // open on any tap/focus of an answer box; close on a real tap elsewhere
  useEffect(() => {
    if (!on) return;
    const isBox = (el) => el instanceof HTMLInputElement && el.closest("#root") && !/checkbox|radio|range|hidden/.test(el.type) && !el.disabled && !el.readOnly;
    const openFor = (el) => {
      if (!isBox(el) || el.dataset.kpNative) return;
      if (!("kpIm" in el.dataset)) el.dataset.kpIm = el.getAttribute("inputmode") || (el.type === "number" ? "decimal" : "");
      // "number" boxes drop a lone "−" while typing, so negatives can't be built key by key.
      // As text they behave like any box; the topic reads the value exactly the same way.
      if (el.type === "number") el.type = "text";
      el.setAttribute("inputmode", "none"); // keep the phone keyboard closed
      const k = kindOf(el, page);
      setMode(k.mode); setExtras(k.extras);
      if (tgt.current !== el) opened.current = performance.now();
      tgt.current = el; setTarget(el);
    };
    const close = () => {
      const b = tgt.current;
      tgt.current = null; setTarget(null);
      if (b && document.activeElement === b) b.blur(); // release it, so the next tap is a fresh one
    };
    closeRef.current = close;

    const onFocus = (e) => openFor(e.target);
    const start = { x: 0, y: 0, t: 0, el: null };
    const onDown = (e) => {
      const t = e.target;
      // iPhone Safari sometimes sends the first touch on the keypad to the page behind it.
      // If the touch is inside the keypad's area, act on the key under the finger ourselves.
      const kp = ref.current;
      if (kp && !(t.closest && t.closest(".kp"))) {
        const r = kp.getBoundingClientRect();
        if (e.clientY >= r.top && e.clientY <= r.bottom && e.clientX >= r.left && e.clientX <= r.right) {
          e.preventDefault(); e.stopPropagation();
          swallow.current = performance.now();
          const btn = Array.from(kp.querySelectorAll("button")).find((b) => { const q = b.getBoundingClientRect(); return e.clientX >= q.left && e.clientX <= q.right && e.clientY >= q.top && e.clientY <= q.bottom; });
          if (btn) btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
          start.el = null;
          return;
        }
      }
      // a tap on a box opens the keypad, even if that box is already selected
      if (isBox(t)) {
        start.el = null;
        // "abc" lasts while the student stays in that box; a fresh tap later brings our keypad back
        if (t.dataset.kpNative && document.activeElement !== t) delete t.dataset.kpNative;
        openFor(t); return;
      }
      start.x = e.clientX; start.y = e.clientY; start.t = performance.now(); start.el = t;
    };
    // decide on finger-up: a scroll or drag never closes the keypad, only a tap does
    const onUp = (e) => {
      const t = start.el; start.el = null;
      if (!t || !tgt.current) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
      if (t.closest && t.closest(".kp")) return;
      if (performance.now() - opened.current < 350) return; // a tap during the slide-in
      // a tap inside the same question (e.g. choosing + − × ÷, or "check") keeps the keypad
      const card = cardOf(tgt.current);
      if (card && card !== document.getElementById("root") && card.contains(t)) {
        const box = tgt.current;
        setTimeout(() => { if (box.isConnected && box.offsetParent && document.activeElement !== box) { try { box.focus({ preventScroll: true }); } catch {} } }, 80);
        return;
      }
      close();
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    const eat = (e) => { if (performance.now() - swallow.current < 600 && !(e.target.closest && e.target.closest(".kp"))) { e.preventDefault(); e.stopPropagation(); } };
    ["touchstart", "touchend", "mousedown", "click"].forEach((t) => document.addEventListener(t, eat, { capture: true, passive: false }));
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      ["touchstart", "touchend", "mousedown", "click"].forEach((t) => document.removeEventListener(t, eat, { capture: true }));
    };
  }, [on, page]);

  // mark the box being typed into (visible even before iPhone gives it focus)
  useEffect(() => {
    if (!target) return;
    target.classList.add("kp-target");
    return () => target.classList.remove("kp-target");
  }, [target]);

  // leaving the page (back to topics): clean up the page space
  useEffect(() => () => { const r = document.documentElement; r.classList.remove("kp-open"); r.style.removeProperty("--kp-h"); }, []);

  // phone turned / window resized: re-measure
  useEffect(() => {
    if (!target) return;
    const f = () => { if (ref.current) document.documentElement.style.setProperty("--kp-h", ref.current.offsetHeight + "px"); };
    addEventListener("resize", f);
    return () => removeEventListener("resize", f);
  }, [target]);

  // make room: the page gets bottom space and the box scrolls above the keypad
  useEffect(() => {
    const root = document.documentElement;
    if (!target || !ref.current) { root.style.removeProperty("--kp-h"); root.classList.remove("kp-open"); return; }
    const h = ref.current.offsetHeight;
    root.style.setProperty("--kp-h", h + "px");
    root.classList.add("kp-open");
    requestAnimationFrame(() => {
      const r = target.getBoundingClientRect();
      // keep the box AND its check button (when it sits just below) above the keypad
      const b = checkButtonFor(target);
      const br = b && b.getBoundingClientRect();
      const bottom = br && br.top - r.bottom < 120 ? Math.max(r.bottom, br.bottom) : r.bottom;
      const bottomLimit = innerHeight - h - 16, topLimit = 84;
      if (bottom > bottomLimit) window.scrollTo(0, scrollY + Math.min(bottom - bottomLimit, r.top - topLimit));
      else if (r.top < topLimit) window.scrollTo(0, scrollY + r.top - topLimit);
      // instant on purpose: an animated scroll makes iPhone Safari send taps to where things were before it
    });
  }, [target, mode, extras]);

  // close when the box goes away (answered step, new question)
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => {
      const b = tgt.current;
      if (!b || !b.isConnected || !b.offsetParent) { tgt.current = null; setTarget(null); }
    }, 400);
    return () => clearInterval(t);
  }, [target]);

  // keys act on press (like a real keyboard) and never take focus from the box
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e) => { e.preventDefault(); };
    el.addEventListener("touchstart", stop, { passive: false });
    el.addEventListener("mousedown", stop);
    return () => { el.removeEventListener("touchstart", stop); el.removeEventListener("mousedown", stop); };
  }, [target]);

  if (!on || !target) return null;

  const press = (key) => {
    const box = tgt.current;
    if (document.activeElement !== box) { try { box.focus({ preventScroll: true }); } catch {} }
    if (!box) return;
    if (navigator.vibrate) navigator.vibrate(6);
    try { window.MP && window.MP.sound && window.MP.sound("tap"); } catch {}
    if (key === BACK) return backspace(box);
    if (key === OK) {
      const b = checkButtonFor(box);
      if (b) b.click(); else closeRef.current();
      return;
    }
    if (key === "x=") return setMode("math");
    if (key === "123") return setMode("num");
    typeInto(box, TYPES[key] || key);
  };
  const startHold = (key) => {
    press(key);
    if (key !== BACK) return;
    clearTimeout(hold.current);
    const rep = () => { press(BACK); hold.current = setTimeout(rep, 70); };
    hold.current = setTimeout(rep, 420);
  };
  const endHold = () => clearTimeout(hold.current);

  // "next" = another box of the same question (the area around its check button), wrapping around
  const card = cardOf(target);
  const list = fields().filter((i) => card.contains(i));
  const idx = list.indexOf(target);
  const next = list.length > 1 ? list[(idx + 1) % list.length] : null;
  const native = () => {
    const box = tgt.current; if (!box) return;
    box.dataset.kpNative = "1";
    const im = box.dataset.kpIm;
    if (im) box.setAttribute("inputmode", im); else box.removeAttribute("inputmode");
    tgt.current = null; setTarget(null);
    box.blur(); setTimeout(() => box.focus(), 30);
  };
  const rows = mode === "math" ? MATH : NUM;

  return (
    <div className={"kp kp-" + mode} ref={ref} role="group" aria-label="מקלדת מתמטית">
      <div className="kp-bar">
        <button type="button" className="kp-chip kp-close" aria-label="סגירת המקלדת" onPointerDown={() => closeRef.current()}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <button type="button" className="kp-chip" onPointerDown={native} aria-label="מקלדת רגילה">abc</button>
        <span className="kp-grow" />
        {extras.map((x) => <button key={x} type="button" className="kp-chip kp-sym" onPointerDown={() => press(x)}>{x}</button>)}
        {next && <button type="button" className="kp-chip kp-next" onPointerDown={() => next.focus()}>הבא<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>}
      </div>
      <div className="kp-keys" dir="ltr">
        {rows.flat().map((k, i) => (
          <button
            key={k + i} type="button" data-k={k}
            className={"kp-key" + (/^\d$/.test(k) ? " kp-d" : "") + (k === OK ? " kp-ok" : "") + (k === BACK ? " kp-back" : "") + (k === "x=" || k === "123" ? " kp-mode" : "") + (k === "x" ? " kp-x" : "") + (k === "²" ? " kp-sq" : "")}
            aria-label={k === "²" ? "בריבוע" : k === BACK ? "מחיקה" : k === OK ? "בדיקה" : k === "x=" ? "מקלדת משוואות" : k === "123" ? "מקלדת מספרים" : k}
            onPointerDown={() => startHold(k)} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold}
          >{k === BACK
            ? <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" /><path d="M17 9l-5 6M12 9l5 6" /></svg>
            : k === OK ? <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            : k === "²" ? <span className="kp-sq-l" aria-hidden="true"><i>x</i>²</span>
            : k}</button>
        ))}
      </div>
    </div>
  );
}
