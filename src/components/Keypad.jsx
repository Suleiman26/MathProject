'use client';
/* Math keypad for phones.
   It types into Sulaiman's existing answer boxes the same characters a
   normal keyboard would, so his checking logic is never touched.

   On by default on touch screens; the admin can turn it off in Settings.

   After "check" (spec 2026-11-10 §5.5):
   - wrong → stays open, the box is focused and its value selected, so the next digit replaces it;
   - right → closes after 180 ms (the student sees the green box), and re-opens if a NEW empty box
     of the same exercise shows up soon after (the next step; most topics show it after 600 ms);
   - ✓ while the check button still waits for other boxes → moves to the next empty box;
   - a solved banner, or the box going away / turning disabled → closes.
   The verdict comes from mp-runtime's `mp:fb` event; until/unless it arrives, the keypad reads the
   same feedback classes from the page itself (same vocabulary as mp-runtime). */
import { useEffect, useRef, useState } from "react";
import { mpData } from "@/lib/mp-data";

const SETTING = "mp:set:keypad";
const CHECK = /בדוק|בדיקה|אשר|אישור|✓|^\s*החל\s/; // "החל על שני האגפים" (inequalities) confirms its box too
const BACK = "⌫", OK = "✓";

// the feedback vocabulary (the answer-box part of mp-runtime's SEL)
const FB_WIN = ".banner, .success-banner, .summary-box";
const FB_BAD = ".fb.err, .feedback.err, .feedback-err, .msg-error, .err-msg, .sel-err, .err, .ieq-div-err, .math-input.wrong";
const FB_OK = ".fb.ok, .feedback.ok, .feedback-ok, .msg-success, .std-banner, .step-card.done, .card.done, .step-done, .math-input.correct, .coef-inp.ok, .step-item.sol";
const FB_ANY = FB_WIN + ", " + FB_BAD + ", " + FB_OK;
// REOPEN_MS: most topics show their next step 600 ms after a right answer (some 700–900), so watch a bit longer
const CLOSE_MS = 180, REOPEN_MS = 1100, CHECK_MS = 1500;

// which keys a box needs, guessed from the box itself (never from the answer)
function kindOf(el, page) {
  const ph = (el.getAttribute("placeholder") || "").trim();
  const cls = el.className || "";
  const extras = [];
  if (/:/.test(ph)) extras.push(":");
  if (/,/.test(ph)) extras.push(",");
  if (/\/|מונה|מכנה/.test(ph)) extras.push("/");
  if (/×/.test(ph)) extras.push("×");          // "7×7×7=..." (solids): the topic reads × itself
  if (page === "circle" || /π/.test(ph)) extras.push("π");
  if (/³/.test(ph)) extras.push("³");
  if (page === "inequalities") extras.push("<", ">");
  if (/[≤≥]/.test(ph)) extras.push("≤", "≥");
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
// landscape phones (≤ 480 px tall): the same keys in 3 rows (✓ is a 2×2 block in NUM)
const NUM_WIDE = [
  ["7", "8", "9", "−", "x=", BACK],
  ["4", "5", "6", ".", OK],
  ["1", "2", "3", "0"],
];
const MATH_WIDE = [
  ["7", "8", "9", "x", "²", "(", ")", BACK],
  ["4", "5", "6", "+", "−", "=", "√", OK],
  ["1", "2", "3", "0", ".", "/", "123"],
];
// what each key types (the rest type their own label)
const TYPES = { "−": "-" };
const WIDE_Q = "(max-height: 480px) and (orientation: landscape)";
const SHORT_Q = "(max-height: 700px)";


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

function checkButtonFor(el, evenDisabled) {
  // the nearest "check / confirm" button around this box
  let box = el.parentElement;
  for (let i = 0; box && i < 7; i++, box = box.parentElement) {
    const b = Array.from(box.querySelectorAll("button")).find((x) => CHECK.test(x.textContent || "") && (evenDisabled || !x.disabled) && x.offsetParent);
    if (b) return b;
  }
  return null;
}

// the question area: the smallest box that holds both the answer box and its check button
function cardOf(el) {
  const b = checkButtonFor(el, true); // also while it waits (disabled) for the other boxes
  let c = el.parentElement;
  while (c && b && !c.contains(b)) c = c.parentElement;
  return (b && c) || document.getElementById("root");
}

// the whole exercise around a box (a multi-step exercise shows its next step inside it)
function scopeOf(el) {
  const c = cardOf(el);
  const root = document.getElementById("root");
  const up = c && c !== root && c.parentElement && c.parentElement.closest("#root .card, #root .ex-card, #root .eq-card, #root .section, #root .tri-box");
  return up || c || root;
}

const isField = (i) => i instanceof HTMLInputElement && !/checkbox|radio|range|hidden/.test(i.type) && !i.disabled && !i.readOnly;
const usable = (i) => !!i && i.isConnected && isField(i) && !!i.offsetParent;
const shown = (el) => !!el && el.isConnected && !!el.offsetParent;
function fields() {
  return Array.from(document.querySelectorAll("#root input")).filter((i) => usable(i));
}

// Instant scroll on purpose: an animated scroll makes iPhone Safari send taps to where things were.
// Keeps the box, its check button (also when it wrapped to the next row) and `extra`
// (the feedback line) at least 12 px above the keypad, without pushing the box under the top bar.
function keepVisible(box, kpH, extra) {
  if (!box || !box.isConnected) return;
  const r = box.getBoundingClientRect();
  if (!r.height) return;
  let bottom = r.bottom;
  const b = checkButtonFor(box, true);
  const br = b && b.getBoundingClientRect();
  if (br && br.height && br.top - r.bottom < 140) bottom = Math.max(bottom, br.bottom);
  const er = extra && extra.isConnected && extra.getBoundingClientRect();
  if (er && er.height && er.top - r.bottom < 220) bottom = Math.max(bottom, er.bottom);
  const tb = document.querySelector(".mp-topbar");
  const barHidden = matchMedia(SHORT_Q).matches; // the top bar slides away while typing on short phones
  const topLimit = (tb && !barHidden ? tb.getBoundingClientRect().bottom : 0) + 12;
  const bottomLimit = innerHeight - kpH - 14; // 12 px + rounding
  if (bottom > bottomLimit) window.scrollTo(0, scrollY + Math.max(0, Math.min(bottom - bottomLimit, r.top - topLimit)));
  else if (r.top < topLimit) window.scrollTo(0, scrollY + r.top - topLimit);
}

export default function Keypad({ page, calc }) {
  const [on, setOn] = useState(false);       // feature switched on
  const [target, setTarget] = useState(null); // the focused answer box
  const [mode, setMode] = useState("num");
  const [extras, setExtras] = useState([]);
  const [wide, setWide] = useState(false);   // landscape phone
  const ref = useRef(null);
  const tgt = useRef(null);
  const hold = useRef(null);
  const opened = useRef(0);
  const swallow = useRef(0);
  const closeRef = useRef(() => {});
  const openRef = useRef(() => {});
  const lostRef = useRef(() => null);

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

  // landscape phone: 3 rows of keys
  useEffect(() => {
    if (!on) return;
    const mq = matchMedia(WIDE_Q);
    const f = () => setWide(mq.matches);
    f();
    mq.addEventListener ? mq.addEventListener("change", f) : mq.addListener(f);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", f) : mq.removeListener(f); };
  }, [on]);

  // open on any tap/focus of an answer box; close on a real tap elsewhere; react to the answer
  useEffect(() => {
    if (!on) return;
    const isBox = (el) => isField(el) && el.closest("#root");
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
    openRef.current = openFor;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let closeT = 0, watchT = 0;
    const stopTimers = () => { clearTimeout(closeT); clearInterval(watchT); };
    // soft = closed by the page (right answer, box gone): keep watching for the next step's box
    const close = (soft) => {
      if (soft === true) clearTimeout(closeT); else stopTimers();
      const b = tgt.current;
      const kp = ref.current;
      if (b && kp && !reduce) {
        // slide a still copy away, so closing is as soft as opening
        const g = kp.cloneNode(true);
        g.classList.add("kp-ghost"); g.setAttribute("aria-hidden", "true"); g.removeAttribute("role");
        document.body.appendChild(g);
        setTimeout(() => g.remove(), 260);
      }
      tgt.current = null; setTarget(null);
      if (b && document.activeElement === b) b.blur(); // release it, so the next tap is a fresh one
    };
    closeRef.current = close;
    const focusBox = (box) => {
      if (tgt.current !== box) openFor(box);
      if (document.activeElement !== box) { try { box.focus({ preventScroll: true }); } catch {} }
    };

    /* ── the answer: a check press, then the verdict ── */
    let chk = null;                       // the last check press while the keypad was open
    let last = { at: -1e9, kind: "" };
    const markCheck = () => {
      const box = tgt.current;
      if (!box) return;
      const list = fields();
      const mine = chk = {
        at: performance.now(), box, scope: scopeOf(box), before: new Set(list), idx: list.indexOf(box),
        ph: box.getAttribute("placeholder") || "", event: false, kind: "",
      };
      // the same wrong answer again changes nothing on the page: still hand the box back, selected
      setTimeout(() => {
        if (chk !== mine || mine.kind || !tgt.current) return;
        const s = mine.scope && mine.scope.isConnected ? mine.scope : null;
        const bad = s && Array.from(s.querySelectorAll(FB_BAD)).find((e) => shown(e) && (e.textContent || "").trim());
        if (bad) verdict("bad", bad, "dom");
      }, 320);
    };
    // the box was re-drawn by the topic right after "check" (same place, new element)
    const replacement = () => {
      if (!chk || performance.now() - chk.at > CHECK_MS) return null;
      const list = fields();
      const same = list[chk.idx];
      if (same && !chk.before.has(same) && (same.getAttribute("placeholder") || "") === chk.ph) return same;
      return null;
    };
    lostRef.current = replacement;
    const reselect = (fbEl) => {
      stopTimers();
      setTimeout(() => { // after the topic's own re-render
        let box = tgt.current;
        if (!usable(box)) box = replacement();
        if (!box) return;
        focusBox(box);
        try { box.setSelectionRange(0, (box.value || "").length); } catch {}
        const h = ref.current ? ref.current.offsetHeight : 0;
        if (h) keepVisible(box, h, fbEl);
      }, 30);
    };
    const finish = (kind) => {
      const from = tgt.current;
      if (!from) return;
      const recent = chk && performance.now() - chk.at < CHECK_MS;
      const scope = recent && chk.scope ? chk.scope : scopeOf(from);
      const before = recent ? chk.before : new Set(fields());
      const t0 = performance.now();
      stopTimers();
      // the next step of the same exercise: a box that was not there (or not open) at "check"
      const nextBox = () => {
        if (kind === "win") return null;
        const inScope = scope && scope.isConnected ? (i) => scope.contains(i) : () => true;
        return fields().find((i) => i !== from && inScope(i) && !before.has(i) && !String(i.value || "").trim()) || null;
      };
      const go = (box) => { stopTimers(); focusBox(box); };
      closeT = setTimeout(() => {
        if (tgt.current === from || !usable(tgt.current)) { const n = nextBox(); if (n) go(n); else close(true); }
      }, CLOSE_MS);
      if (kind === "win") return;
      watchT = setInterval(() => {
        if (performance.now() - t0 > REOPEN_MS) { clearInterval(watchT); return; }
        if (tgt.current && tgt.current !== from) { clearInterval(watchT); return; } // moved on already
        if (tgt.current === from && performance.now() - t0 < CLOSE_MS) return;      // let the green box be seen
        const n = nextBox();
        if (n) go(n);
      }, 50);
    };
    // src "event" = mp-runtime's mp:fb; "dom" = read from the page (when no event came)
    const verdict = (kind, el, src) => {
      const now = performance.now();
      const recent = chk && now - chk.at < CHECK_MS;
      if (src === "event") { if (recent) chk.event = true; }
      else if (recent && chk.event) return;          // the runtime already told us
      if (!tgt.current && !(recent && kind === "bad")) return;
      // feedback from another exercise on the page is not ours
      if (!recent && tgt.current && el && el.isConnected && kind !== "win") {
        const s = scopeOf(tgt.current);
        if (s && !s.contains(el) && !el.contains(tgt.current)) return;
      }
      if (now - last.at < 350 && last.kind === kind) return;
      last = { at: now, kind };
      if (recent) chk.kind = kind;
      if (kind === "bad") reselect(el); else finish(kind);
    };
    const onFb = (e) => { const d = (e && e.detail) || {}; if (/^(ok|bad|win)$/.test(d.kind)) verdict(d.kind, d.el, "event"); };
    window.addEventListener("mp:fb", onFb);

    // watch the page: a solved banner closes; after "check", read right / wrong ourselves
    const fbKind = (el) => el.matches(FB_WIN) ? "win" : el.matches(FB_BAD) ? "bad" : el.matches(FB_OK) ? "ok" : "";
    const RANK = { ok: 1, bad: 2, win: 3 };
    const mo = window.MutationObserver ? new MutationObserver((list) => {
      const now = performance.now();
      const recent = chk && now - chk.at < CHECK_MS;
      if (!tgt.current && !recent) return;
      let found = null;
      const consider = (el, isNew) => {
        if (!el || el.nodeType !== 1 || !el.matches(FB_ANY)) return;
        const k = fbKind(el);
        if (!k || (k === "win" && !isNew)) return;
        if (k !== "ok" && !(el.textContent || "").trim()) return;
        if (!found || RANK[k] > RANK[found.kind]) found = { kind: k, el };
      };
      for (const m of list) {
        const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (!t || !t.closest || !t.closest("#root")) continue;
        if (m.type === "childList") {
          for (const n of m.addedNodes) {
            if (n.nodeType !== 1) continue;
            consider(n, true);
            if (n.getElementsByTagName("*").length <= 40 || n.matches(FB_WIN)) n.querySelectorAll(FB_ANY).forEach((x) => consider(x, true));
            else n.querySelectorAll(FB_WIN).forEach((x) => consider(x, true));
          }
          if (m.addedNodes.length) consider(t.closest(FB_BAD + ", " + FB_OK), false);
        } else if (m.type === "attributes") {
          const tmp = document.createElement(t.tagName); tmp.className = m.oldValue || "";
          if (fbKind(tmp) !== fbKind(t)) consider(t, true);
        } else if (m.type === "characterData") {
          consider(t.closest(FB_BAD + ", " + FB_OK), false);
        }
      }
      if (!found) return;
      if (found.kind === "win") { verdict("win", found.el, "event"); return; } // a banner always closes
      if (!recent) return;
      const f = found;
      setTimeout(() => verdict(f.kind, f.el, "dom"), 40); // give mp-runtime's mp:fb the first word
    }) : null;
    if (mo) mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });

    // a press on the check button of the open box (the ✓ key clicks it too)
    const onClick = (e) => {
      const box = tgt.current;
      const b = e.target && e.target.closest && e.target.closest("button");
      if (!box || !b || !CHECK.test(b.textContent || "")) return;
      const card = cardOf(box);
      if (b === checkButtonFor(box) || (card && card.contains(b))) markCheck();
    };
    document.addEventListener("click", onClick, true);

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
        stopTimers();
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
        setTimeout(() => { if (tgt.current === box && box.isConnected && box.offsetParent && document.activeElement !== box) { try { box.focus({ preventScroll: true }); } catch {} } }, 80);
        return;
      }
      close();
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    const eat = (e) => { if (e.isTrusted && performance.now() - swallow.current < 600 && !(e.target.closest && e.target.closest(".kp"))) { e.preventDefault(); e.stopPropagation(); } };
    ["touchstart", "touchend", "mousedown", "click"].forEach((t) => document.addEventListener(t, eat, { capture: true, passive: false }));
    return () => {
      stopTimers();
      if (mo) mo.disconnect();
      window.removeEventListener("mp:fb", onFb);
      document.removeEventListener("click", onClick, true);
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
  useEffect(() => () => { const r = document.documentElement; r.classList.remove("kp-open", "kp-rest"); r.style.removeProperty("--kp-h"); }, []);

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
    if (!target || !ref.current) {
      if (!root.classList.contains("kp-open")) return;
      // Closing: keep the bottom space while it is on screen, so nothing jumps (the green box stays
      // where it is); it goes away by itself once the student scrolls up past it.
      root.classList.remove("kp-open"); root.classList.add("kp-rest");
      const relax = () => {
        if (!root.classList.contains("kp-rest") || root.classList.contains("kp-open")) { removeEventListener("scroll", relax); return; }
        const pad = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
        if (scrollY + innerHeight <= root.scrollHeight - pad + 1) {
          root.classList.remove("kp-rest"); root.style.removeProperty("--kp-h");
          removeEventListener("scroll", relax);
        }
      };
      addEventListener("scroll", relax, { passive: true });
      relax();
      return;
    }
    const h = ref.current.offsetHeight;
    root.style.setProperty("--kp-h", h + "px");
    root.classList.remove("kp-rest");
    root.classList.add("kp-open");
    requestAnimationFrame(() => keepVisible(target, h));
  }, [target, mode, extras, wide]);

  // close when the box goes away (answered step, new question) or turns disabled
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => {
      const b = tgt.current;
      if (usable(b)) return;
      const r = lostRef.current(); // re-drawn by the topic right after "check" → follow it
      if (r) { openRef.current(r); try { r.focus({ preventScroll: true }); } catch {} return; }
      closeRef.current(true);
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
    if (!box) return;
    if (document.activeElement !== box) { try { box.focus({ preventScroll: true }); } catch {} }
    if (navigator.vibrate) navigator.vibrate(6);
    try { window.MP && window.MP.sound && window.MP.sound("tap"); } catch {}
    if (key === BACK) return backspace(box);
    if (key === OK) {
      const b = checkButtonFor(box);
      if (b) { b.click(); return; }
      // the check button waits until every box is filled: go to the next empty box instead of closing
      if (checkButtonFor(box, true)) {
        const c = cardOf(box);
        const empty = fields().filter((i) => c.contains(i) && i !== box && !String(i.value || "").trim())[0];
        if (empty) { empty.focus(); }
        return;
      }
      closeRef.current();
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
  // Switch this box to the phone's own keyboard. iPhone only opens its keyboard
  // when the box is focused right inside the finger-lift of a tap, so this runs
  // on touchend (and on click for a mouse), with blur + focus in the same moment.
  const native = (e) => {
    if (e && e.cancelable) e.preventDefault();
    const box = tgt.current; if (!box) return;
    box.dataset.kpNative = "1";
    const im = box.dataset.kpIm;
    if (im) box.setAttribute("inputmode", im); else box.removeAttribute("inputmode");
    tgt.current = null;
    box.blur();
    box.focus();
    setTarget(null);
  };
  const rows = wide ? (mode === "math" ? MATH_WIDE : NUM_WIDE) : (mode === "math" ? MATH : NUM);

  return (
    <div className={"kp kp-" + mode + (wide ? " kp-wide" : "")} ref={ref} role="group" aria-label="מקלדת מתמטית">
      <div className="kp-bar">
        <button type="button" className="kp-chip kp-close" aria-label="סגירת המקלדת" onPointerDown={() => closeRef.current()}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <button type="button" className={"kp-chip kp-native" + (extras.length + (next ? 1 : 0) + (calc ? 1 : 0) >= 3 ? " kp-compact" : "")} onTouchEnd={native} onClick={native} aria-label="מקלדת הטלפון הרגילה">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" /></svg>
          <span>מקלדת רגילה</span>
        </button>
        {calc && <button type="button" className="kp-chip kp-calc" aria-label="מחשבון" onPointerUp={() => { closeRef.current(); window.dispatchEvent(new Event("mp:calc")); }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M8.5 7.5h7" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" strokeWidth="2.4" /></svg>
        </button>}
        <span className="kp-grow" />
        {extras.map((x) => <button key={x} type="button" className="kp-chip kp-sym" onPointerDown={() => press(x)}>{x}</button>)}
        {next && <button type="button" className="kp-chip kp-next" onPointerDown={() => next.focus()}>הבא<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>}
      </div>
      <div className="kp-keys" dir="ltr">
        {rows.flat().map((k, i) => (
          <button
            key={k + i} type="button" data-k={k}
            className={"kp-key" + (/^\d$/.test(k) ? " kp-d" : " kp-fn") + (k === OK ? " kp-ok" : "") + (k === BACK ? " kp-back" : "") + (k === "x=" || k === "123" ? " kp-mode" : "") + (k === "x" ? " kp-x" : "") + (k === "²" ? " kp-sq" : "")}
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
