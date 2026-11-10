/* ==========================================================================
   MathProject runtime (sounds, feedback motion, answer stats)
   --------------------------------------------------------------------------
   Adds, on every exercise page, without touching the exercise code:
   1. (the top bar is src/components/TopBar.jsx)
   2. soft sounds: tap, select, correct, wrong, solved
   3. small motion on feedback: pop on correct, shake on wrong,
      confetti when a whole exercise is solved
   4. question anatomy (2026-11-10): colours the answer box right / wrong
      (.mp-right / .mp-wrong), tells the keypad (window "mp:fb" event), keeps
      the feedback line above the keypad, tags the check button (.mp-check)
      and folds long lesson panels on phones ("עוד")
   It only WATCHES the page (clicks and DOM changes) and adds classes,
   attributes and its own small elements. It never changes the exercise's
   state, text or numbers. See DESIGN.md ("Question anatomy").
   ========================================================================== */
import { mpData } from "./mp-data";

let started = false;

/** Start once per browser tab. Safe to call on every topic page. */
export function initRuntime() {
  if (started || typeof window === "undefined") return;
  started = true;

  var doc = document;
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Which classes mean what (shared vocabulary across all modules) ──── */
  var SEL = {
    win: ".banner, .success-banner, .summary-box",
    bad: ".fb.err, .feedback.err, .feedback-err, .msg-error, .err-msg, .sel-err, .err, .ieq-div-err, " +
         ".choice-btn.wrong, .math-input.wrong, .btn-formula.wrong-pick",
    ok:  ".fb.ok, .feedback.ok, .feedback-ok, .msg-success, .std-banner, .step-card.done, .card.done, .step-done, " +
         ".choice-btn.correct, .math-input.correct, .coef-inp.ok, .step-item.sol",
    chip: ".ch-btn, .nav-btn, .choice-btn, .sub-tab, .tab, .sub-tab-btn, .sub-btn, .special-btn, .eq-choice, " +
          ".part-btn, .prop-btn, .diff-btn, .btn-formula, .point-chip, .theorem-card, .op-btn, .op-x-btn, " +
          ".eqs-op, .eqs-x, .slv-opbtn, .slv-opxbtn, .nl-toggle, .op-mark-btn",
    press: "button, a[href], [role='button'], .tp.click, .drag, .point-chip, .theorem-card, select"
  };
  var ANY = SEL.win + ", " + SEL.bad + ", " + SEL.ok;

  function matches(el, sel) { return el && el.nodeType === 1 && el.matches(sel); }
  function kindOf(el) {
    if (matches(el, SEL.win)) return "win";
    if (matches(el, SEL.bad)) return "bad";
    if (matches(el, SEL.ok)) return "ok";
    return null;
  }
  function visibleText(el) { return (el.textContent || "").trim().length > 0; }

  /* ── Sound ───────────────────────────────────────────────────────────── */
  var KEY = "mp:sound";
  var soundOn = true;
  try { soundOn = localStorage.getItem(KEY) !== "off"; } catch (e) {}

  var ctx = null, out = null;
  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      out = ctx.createGain(); out.gain.value = 1;
      out.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* ?mpdebug in the address shows a tiny status line (for testing on phones) */
  var dbg = null;
  if (/[?&]mpdebug/.test(location.search)) {
    dbg = doc.createElement("div");
    dbg.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:999;padding:6px 10px;border-radius:8px;background:#111;color:#fff;font:12px system-ui;direction:ltr";
    dbg.textContent = "mpdebug ready";
    doc.body.appendChild(dbg);
  }

  /* iPhone/iPad: audio may only start inside a real tap. Switch it on during
     the first touches (create + resume + a silent blip), so the sounds that
     follow a moment later are allowed to play. */
  function unlockAudio() {
    var c = audio();
    if (!c) return;
    try {
      var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
      s.buffer = b; s.connect(c.destination); s.start(0);
    } catch (e) {}
    if (c.state === "running") {
      ["touchend", "pointerup", "click", "keydown"].forEach(function (t) { doc.removeEventListener(t, unlockAudio, true); });
    }
  }
  ["touchend", "pointerup", "click", "keydown"].forEach(function (t) { doc.addEventListener(t, unlockAudio, true); });

  /* a soft mallet-like note: sine body + quiet bright overtone, quick decay */
  function note(freq, o) {
    o = o || {};
    var c = audio(); if (!c) return;
    var t0 = c.currentTime + (o.at || 0) + 0.005;
    var dur = o.dur || 0.2, vol = o.vol || 0.08;
    var body = c.createOscillator(), bodyGain = c.createGain();
    body.type = o.type || "sine";
    body.frequency.setValueAtTime(freq, t0);
    if (o.to) body.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    bodyGain.gain.setValueAtTime(0.0001, t0);
    bodyGain.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    body.connect(bodyGain); bodyGain.connect(out);
    body.start(t0); body.stop(t0 + dur + 0.05);
    if (o.shine) {
      var hi = c.createOscillator(), hiGain = c.createGain();
      hi.type = "sine"; hi.frequency.setValueAtTime(freq * 4, t0);
      hiGain.gain.setValueAtTime(0.0001, t0);
      hiGain.gain.exponentialRampToValueAtTime(vol * o.shine, t0 + 0.004);
      hiGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.35);
      hi.connect(hiGain); hiGain.connect(out);
      hi.start(t0); hi.stop(t0 + dur);
    }
  }

  var SOUNDS = {
    tap:    function () { note(1250, { dur: 0.045, vol: 0.03 }); },
    select: function () { note(880, { dur: 0.07, vol: 0.04, type: "triangle" }); },
    ok:     function () { note(784, { dur: 0.22, vol: 0.075, shine: 0.25 }); note(1175, { at: 0.085, dur: 0.32, vol: 0.075, shine: 0.25 }); },
    bad:    function () { note(330, { dur: 0.15, vol: 0.06, type: "triangle" }); note(262, { at: 0.1, dur: 0.24, vol: 0.06, type: "triangle", to: 247 }); },
    win:    function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { note(f, { at: i * 0.075, dur: 0.4, vol: 0.06, shine: 0.3 }); });
      note(1568, { at: 0.33, dur: 0.6, vol: 0.03, shine: 0.4 });
    }
  };
  function play(name) {
    if (window.MP) { window.MP.last = name; window.MP.log.push(name); }
    if (dbg) dbg.textContent = "sound: " + name + " · audio: " + (ctx ? ctx.state : "none") + " · on: " + soundOn;
    if (!soundOn || doc.hidden) return;
    try { SOUNDS[name](); } catch (e) {}
  }

  /* ── Motion on feedback ──────────────────────────────────────────────── */
  function animate(el, kind) {
    if (!el || !el.animate) return;
    if (reduceMotion) {
      el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
      return;
    }
    if (kind === "bad") {
      el.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(4px)" },
         { transform: "translateX(-3px)" }, { transform: "translateX(2px)" }, { transform: "translateX(0)" }],
        { duration: 340, easing: "cubic-bezier(.36,.07,.19,.97)" });
    } else if (kind === "ok") {
      el.animate([{ transform: "scale(.97)", opacity: 0.5 }, { transform: "scale(1)", opacity: 1 }],
        { duration: 260, easing: "cubic-bezier(.23,1,.32,1)" });
    } else if (kind === "win") {
      el.animate([{ transform: "translateY(10px) scale(.98)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 420, easing: "cubic-bezier(.23,1,.32,1)" });
      confetti(el);
    }
  }

  function confetti(anchor) {
    if (reduceMotion || !doc.body.animate) return;
    var r = anchor.getBoundingClientRect();
    var x0 = r.left + r.width / 2, y0 = r.top + Math.min(40, r.height / 2);
    var layer = doc.createElement("div");
    layer.className = "mp-confetti";
    layer.setAttribute("aria-hidden", "true");
    var accent = getComputedStyle(doc.documentElement).getPropertyValue("--a-500").trim() || "#14b8a6";
    var colors = [accent, "#22c55e", "#f59e0b", "#ec4899", "#3b82f6"];
    var n = 26, longest = 0;
    for (var i = 0; i < n; i++) {
      var p = doc.createElement("i");
      p.style.left = x0 + "px"; p.style.top = y0 + "px";
      p.style.background = colors[i % colors.length];
      layer.appendChild(p);
      var ang = (-90 + (Math.random() * 140 - 70)) * Math.PI / 180;
      var dist = 90 + Math.random() * 120;
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      var rot = (Math.random() * 540 - 270) | 0;
      var dur = 900 + Math.random() * 500;
      longest = Math.max(longest, dur);
      p.animate([
        { transform: "translate(0,0) rotate(0deg) scale(.6)", opacity: 1 },
        { transform: "translate(" + dx + "px," + dy + "px) rotate(" + rot / 2 + "deg) scale(1)", opacity: 1, offset: 0.45 },
        { transform: "translate(" + dx * 1.15 + "px," + (dy + 160) + "px) rotate(" + rot + "deg) scale(.9)", opacity: 0 }
      ], { duration: dur, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
    }
    doc.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, longest + 100);
  }

  /* ── Answer stats (only when the database is connected) ─────────────── */
  // Sends: page, chapter, step, correct/wrong/solved, phone or not, and a
  // random device number. Never names, emails or anything typed. When a
  // student is signed in, the same rows go to their own progress.
  function clean(s, max) { return (s || "").replace(/\s+/g, " ").trim().slice(0, max) || null; }
  function textOf(sel, root) { var el = (root || doc).querySelector(sel); return el ? el.textContent : ""; }
  function chapterOf() {
    var main = textOf(".ch-btn.active, .nav-btn.active, .ph.active");
    var sub = textOf("#root .sub-tab.active, #root .sub-tab-btn.active, #root .sub-btn.active, #root .tab.active");
    return clean([main, sub].filter(Boolean).join(" › "), 150);
  }
  function stepOf(el) {
    var box = el && el.closest && el.closest(".step-card, .card, .eq-card, .step-item, .section, .tri-box");
    var label = box ? textOf(".step-label, .card-t, .phase-title, .section-title, .task-title, .card-title", box) : "";
    return clean(label, 190);
  }
  var track = (function () {
    var D = mpData;
    if (!D || !D.ready) return function () {};
    var dev = null;
    try { dev = localStorage.getItem("mp:device"); } catch (e) {}
    if (!dev || dev.length < 8) {
      dev = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "d" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem("mp:device", dev); } catch (e) {}
    }
    function pageKey() { var m = location.pathname.match(/\/topics\/([a-z0-9-]+)/); return ((m ? m[1] : "home") + ".html").slice(0, 80); }
    var mobile = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
    var queue = [], timer = null;
    function flush(leaving) {
      clearTimeout(timer); timer = null;
      if (!queue.length) return;
      var rows = queue.splice(0);
      // signed in: the answers go to the student's own progress; otherwise anonymous
      var tok = null;
      try { var s = JSON.parse(localStorage.getItem("mp:account")); tok = s && s.tok; } catch (e) {}
      if (tok) D.rpc("account_track", { tok: tok, rows: rows }, { keepalive: !!leaving }).catch(function () { D.insert("events", rows, { keepalive: !!leaving }); });
      else D.insert("events", rows, { keepalive: !!leaving });
    }
    window.addEventListener("pagehide", function () { flush(true); });
    doc.addEventListener("visibilitychange", function () { if (doc.visibilityState === "hidden") flush(true); });
    return function (kind, el) {
      queue.push({ device: dev, page: pageKey(), chapter: chapterOf(), step: kind === "view" ? null : stepOf(el), kind: kind, mobile: mobile });
      // let the page mark the chapter as solved right away (✓ on its tab)
      if (kind === "win") { try { window.dispatchEvent(new CustomEvent("mp:win", { detail: { chapter: chapterOf() } })); } catch (e) {} }
      if (queue.length >= 20) flush(false);
      else if (!timer) timer = setTimeout(function () { flush(false); }, 2500);
    };
  })();

  /* ── Watching the exercise for feedback ──────────────────────────────── */
  var lastAction = -1e9;
  function userActed() { lastAction = performance.now(); }
  ["pointerdown", "pointerup", "keydown"].forEach(function (t) { doc.addEventListener(t, userActed, true); });

  var pendingTap = null;
  var pendingCheck = null;
  var CHECK = /בדוק|בדיקה|אשר|אישור|✓/;
  var found = null;   // {kind, el} strongest feedback seen in this batch
  var RANK = { ok: 1, bad: 2, win: 3 };

  function consider(el) {
    var kind = kindOf(el);
    if (!kind || !visibleText(el) && kind !== "ok") return;
    if (!found || RANK[kind] > RANK[found.kind]) found = { kind: kind, el: el };
  }

  function scan(node) {
    if (node.nodeType !== 1) return;
    // A whole new section (e.g. switching chapters) is not feedback.
    if (node.getElementsByTagName("*").length > 40) return;
    consider(node);
    var inner = node.querySelectorAll(ANY);
    for (var i = 0; i < inner.length; i++) consider(inner[i]);
  }

  function onMutations(list) {
    scheduleDecorate();
    if (performance.now() - lastAction > 1600) return; // only react to the student's own actions
    found = null;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      var tgt = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      if (!tgt || !tgt.closest("#root")) continue;
      if (m.type === "attributes") {
        var before = m.oldValue || "";
        var el = m.target;
        var nowKind = kindOf(el);
        if (!nowKind) continue;
        // only when the class actually turned into a feedback class
        var tmp = doc.createElement(el.tagName); tmp.className = before;
        if (kindOf(tmp) === nowKind) continue;
        consider(el);
      } else if (m.type === "childList") {
        for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]);
        // text inside an existing feedback line changed (e.g. a new message)
        var host = m.target.nodeType === 1 ? m.target.closest(ANY) : null;
        if (host && m.addedNodes.length) consider(host);
      } else if (m.type === "characterData") {
        var h = m.target.parentElement && m.target.parentElement.closest(ANY);
        if (h) consider(h);
      }
    }
    if (found) {
      if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
      pendingCheck = null;
      if (found.kind === "bad" && nudgeEmpty(found.el)) return;
      play(found.kind);
      var marked = markBoxes(found.el, found.kind);
      if (!marked.length && !cssAnimated(found.el)) animate(found.el, found.kind);
      else if (found.kind === "win") animate(found.el, found.kind);
      track(found.kind, found.el);
      announce(found.kind, found.el);
    }
  }

  /* ── Question anatomy: right / wrong on the box, the keypad contract ──── */
  // The CSS animates these itself (pop / shake), so no second JS animation.
  function cssAnimated(el) { return matches(el, ".choice-btn, .eq-choice, input"); }
  var BOX = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"])';
  var SCOPE = ".step-card, .card, .eq-card, .section, .tri-box, .history";
  function shown(el) { return el.offsetParent !== null || (el.getClientRects && el.getClientRects().length > 0); }
  var lastCheck = null; // {scope, t}: the step whose check button was pressed last
  function scopeOf(el) {
    var s = el.closest && el.closest(SCOPE);
    if (s) {
      // a "done" step card holds only the solved line: look one level up
      var up = s.parentElement && s.parentElement.closest(SCOPE);
      if (!s.querySelector(BOX) && up) s = up;
      return s;
    }
    // feedback outside any card (e.g. the solved banner): the step that was just checked
    if (lastCheck && performance.now() - lastCheck.t < 2000 && lastCheck.scope.isConnected) return lastCheck.scope;
    return null;
  }
  // bad → every visible, filled, enabled box of that step turns red (until the
  // student types again); ok / win → green (until its value changes).
  function markBoxes(el, kind) {
    var out = [];
    if (!el || !el.closest) return out;
    var scope = scopeOf(el);
    if (!scope) return out;
    var boxes = scope.querySelectorAll(BOX);
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (!shown(b) || !String(b.value || "").trim()) continue;
      if (kind === "bad" && (b.disabled || b.readOnly)) continue;
      if (b.closest(".op-box, .eqs-box, .slv-opbox, .kp")) continue;
      // the page marks this box right / wrong itself (e.g. .math-input.correct): keep its verdict
      if (b.matches(".correct, .wrong, .ok, .err, .bad, .rp-bad, .rp-ok")) continue;
      b.classList.remove("mp-right", "mp-wrong");
      void b.offsetWidth; // restart the shake / pop on a repeated answer
      b.classList.add(kind === "bad" ? "mp-wrong" : "mp-right");
      b.setAttribute("data-mp-v", b.value);
      out.push(b);
    }
    return out;
  }
  // a box whose value changed (typing, a new exercise) loses its colour
  function sweepMarks() {
    var m = doc.querySelectorAll("#root input.mp-right, #root input.mp-wrong");
    for (var i = 0; i < m.length; i++) {
      if (m[i].value !== m[i].getAttribute("data-mp-v")) { m[i].classList.remove("mp-right", "mp-wrong"); m[i].removeAttribute("data-mp-v"); }
    }
  }
  doc.addEventListener("input", function (e) {
    var t = e.target;
    if (t && t.classList && (t.classList.contains("mp-wrong") || t.classList.contains("mp-right"))) {
      t.classList.remove("mp-wrong", "mp-right"); t.removeAttribute("data-mp-v");
    }
  }, true);

  // Tell the keypad (src/components/Keypad.jsx) what happened, AFTER the boxes
  // are coloured: window "mp:fb" { kind: "ok" | "bad" | "win", el }.
  // Then keep the feedback line in sight above the open keypad.
  function announce(kind, el) {
    leadGlyph(el);
    try { window.dispatchEvent(new CustomEvent("mp:fb", { detail: { kind: kind, el: el } })); } catch (e) {}
    if (kind === "bad" || kind === "ok") requestAnimationFrame(function () { keepAboveKeypad(el); });
  }
  function keepAboveKeypad(el) {
    var html = doc.documentElement;
    if (!el || !el.isConnected || !html.classList.contains("kp-open")) return;
    var kpH = parseFloat(getComputedStyle(html).getPropertyValue("--kp-h")) || 0;
    if (!kpH) return;
    var r = el.getBoundingClientRect();
    if (!r.height) return;
    var limit = innerHeight - kpH - 12;
    var delta = r.bottom - limit;
    if (delta <= 0) return;
    delta = Math.min(delta, Math.max(0, r.top - 64)); // never push its top under the top bar
    if (delta > 0) window.scrollBy({ top: delta, left: 0, behavior: "instant" });
  }
  // the page's own "✓ …" / "✗ …" text: the CSS icon replaces the glyph
  var LEAD = /^[\s\u200f\u200e]*[✓✔✗✘✕✖❌✅🎉]/u;
  function leadGlyph(el) {
    if (!el || !el.matches || !el.matches(SEL.ok + ", " + SEL.bad + ", " + SEL.win)) return;
    var has = LEAD.test(el.textContent || "") && el.firstChild && el.firstChild.nodeType === 3;
    if (has && !el.hasAttribute("data-mp-lead")) el.setAttribute("data-mp-lead", "");
    else if (!has && el.hasAttribute("data-mp-lead")) el.removeAttribute("data-mp-lead");
  }

  // "Check" pressed with nothing typed: no wrong sound, not counted as a
  // mistake; the empty box is focused and glows softly instead.
  var emptyPress = null;
  function nudgeEmpty(el) {
    var e = emptyPress;
    if (!e || performance.now() > e.until || !(e.box.contains(el) || e.box === doc.getElementById("root"))) return false;
    emptyPress = null;
    play("tap");
    try { e.input.focus({ preventScroll: true }); } catch (err) {}
    e.input.classList.remove("mp-need"); void e.input.offsetWidth; e.input.classList.add("mp-need");
    setTimeout(function () { e.input.classList.remove("mp-need"); }, 1400);
    return true;
  }

  function watch() {
    if (!window.MutationObserver) return;
    new MutationObserver(onMutations).observe(doc.body, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ["class"], attributeOldValue: true
    });
  }

  /* tap / select sounds on presses (a feedback sound replaces the tap) */
  doc.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest(SEL.press);
    if (!t || t.closest(".mp-topbar")) return;
    if (t.matches("select")) return;
    var name = t.matches(SEL.chip) ? "select" : "tap";
    if (t.closest(".ch-nav, .ch-btns, .top-nav, .nav") && t.matches(".ch-btn, .nav-btn") && t.scrollIntoView) {
      // keep the chosen chapter in view on phones
      try { t.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" }); } catch (err) {}
    }
    if (pendingTap) clearTimeout(pendingTap);
    // a "check" button gets its own sound (correct / wrong), so its tap waits and usually never plays
    var isCheck = t.matches("button") && CHECK.test(t.textContent || "");
    pendingTap = setTimeout(function () { pendingTap = null; play(name); }, isCheck ? 220 : 40);
    if (t.matches(".ch-btn, .nav-btn")) setTimeout(function () { track("view"); }, 300);
    // A "check" press that changes nothing while a wrong-answer message is
    // still showing = the same wrong answer again. Say so (and count it).
    if (isCheck || t.matches(".mp-check")) {
      var sc = t.closest(SCOPE);
      if (sc) lastCheck = { scope: sc, t: performance.now() };
    }
    if (isCheck) {
      // all answer boxes of this step still empty? Then it is not a wrong answer.
      var stepBox = t.closest(".step-card, .card, .eq-card, .section, .tri-box, .history") || doc.getElementById("root");
      var boxes = stepBox ? [].filter.call(stepBox.querySelectorAll('input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea'), function (x) { return x.offsetParent !== null && !x.disabled; }) : [];
      emptyPress = boxes.length && boxes.every(function (x) { return !String(x.value || "").trim(); })
        ? { box: stepBox, input: boxes[0], until: performance.now() + 1600 } : null;
      var mine = pendingCheck = { btn: t };
      setTimeout(function () {
        if (pendingCheck !== mine) return;
        pendingCheck = null;
        var box = t.closest(".step-card, .card, .eq-card, .section, .tri-box, .history") || doc.getElementById("root");
        var bad = box && box.querySelector(SEL.bad);
        if (bad && bad.offsetParent !== null && visibleText(bad)) {
          if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
          if (nudgeEmpty(bad)) return;
          play("bad");
          if (!markBoxes(bad, "bad").length) animate(bad, "bad");
          track("bad", bad);
          announce("bad", bad);
        } else if (emptyPress && emptyPress.box === box) {
          // nothing typed and the exercise shows nothing: point to the empty box
          if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
          nudgeEmpty(box);
        }
      }, 160);
    }
  }, true);

  /* ── Decorations that follow the page (display only) ───────────────────
     - .mp-check on the button that checks an answer (filled accent in mp.css)
     - data-mp-lead on feedback lines whose own text starts with ✓ / ✗
     - long lesson panels fold on phones behind an "עוד" button
     - answer-box colours drop when the value changed (new exercise)
     Runs once per frame at most, after the page changed. */
  var CHECK_BTN = /בדוק|בדיקה|בדקו|אישור|^אשר|✓/;
  var NOT_CHECK = /הבנתי|חדש|הבא|המשך|הסבר|רמז/;
  var PANELS = ".info-box, .info, .def-box, .example-box, .explanation, .pw-info, .py-intro, .rules-grid";
  var NO_CHECK_IN = ".banner, .success-banner, .summary-box, .kp, .mp-topbar, .op-box, .eqs-box, .slv-opbox, " + PANELS;
  var FB_ALL = ".fb.ok, .fb.err, .feedback.ok, .feedback.err, .feedback-ok, .feedback-err, .msg-success, .msg-error, " + SEL.win;
  var phoneMq = window.matchMedia ? matchMedia("(max-width: 640px)") : null;
  var decoQueued = false;
  function scheduleDecorate() {
    if (decoQueued) return;
    decoQueued = true;
    requestAnimationFrame(function () { decoQueued = false; try { decorate(); } catch (e) {} });
  }
  function isCheckBtn(b) {
    if (b.matches(SEL.chip) || b.closest(NO_CHECK_IN)) return false;
    var t = (b.textContent || "").trim();
    if (!t || t.length > 24 || !CHECK_BTN.test(t) || NOT_CHECK.test(t)) return false;
    var sc = b.closest(SCOPE) || b.parentElement;
    return !!(sc && sc.querySelector(BOX + ", select, .choice-btn, .eq-choice, .btn-formula"));
  }
  // "תרגיל חדש", "משוואה חדשה", "פרבולה חדשה"…: a secondary action (outline in mp.css)
  var NEW_BTN = /חדש|חדשה/;
  function isNewBtn(b) {
    if (!b.matches(".bp, .btn-primary, .btn-new, .bo, .btn.orange") || b.closest(".banner, .success-banner, .summary-box")) return false;
    var t = (b.textContent || "").trim();
    return t.length <= 24 && NEW_BTN.test(t);
  }
  function decorate() {
    var root = doc.getElementById("root");
    if (!root) return;
    sweepMarks();
    var btns = root.querySelectorAll("button");
    for (var i = 0; i < btns.length; i++) {
      var want = isCheckBtn(btns[i]);
      if (want !== btns[i].classList.contains("mp-check")) btns[i].classList.toggle("mp-check", want);
      var nw = !want && isNewBtn(btns[i]);
      if (nw !== btns[i].classList.contains("mp-new")) btns[i].classList.toggle("mp-new", nw);
    }
    var fbs = root.querySelectorAll(FB_ALL);
    for (var j = 0; j < fbs.length; j++) leadGlyph(fbs[j]);
    foldPanels(root);
  }
  function foldPanels(root) {
    var on = !!(phoneMq && phoneMq.matches);
    var ps = root.querySelectorAll(PANELS);
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (p.parentElement && p.parentElement.closest(PANELS)) continue; // a panel inside a panel
      var folded = p.classList.contains("mp-fold");
      var ctl = p.querySelector("button:not(.mp-more), input, select, textarea, a[href]");
      if (!on || ctl) { if (folded) unfold(p); continue; }
      if (folded) {
        var more = p.querySelector(":scope > .mp-more");
        if (!more) { unfold(p); folded = false; }
        else {
          if (p.lastElementChild !== more) p.appendChild(more); // the page added content after it
          if (p.scrollHeight < 200) unfold(p);
          continue;
        }
      }
      if (!shown(p) || p.scrollHeight <= 220) continue;
      foldOne(p);
    }
  }
  function foldOne(p) {
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "mp-more";
    btn.textContent = "עוד";
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !p.classList.contains("mp-open");
      p.classList.toggle("mp-open", open);
      btn.textContent = open ? "פחות" : "עוד";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) {
        var r = p.getBoundingClientRect();
        if (r.top < 64) window.scrollBy({ top: r.top - 72, left: 0, behavior: "instant" });
      }
    });
    // the fade at the bottom uses the panel's own background colour
    var bg = getComputedStyle(p).backgroundColor;
    if (bg && bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg)) p.style.setProperty("--mp-fold-bg", bg);
    p.classList.add("mp-fold");
    p.appendChild(btn);
  }
  function unfold(p) {
    p.classList.remove("mp-fold", "mp-open");
    p.style.removeProperty("--mp-fold-bg");
    var more = p.querySelector(":scope > .mp-more");
    if (more) more.remove();
  }
  if (phoneMq) {
    if (phoneMq.addEventListener) phoneMq.addEventListener("change", scheduleDecorate);
    else if (phoneMq.addListener) phoneMq.addListener(scheduleDecorate);
  }
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(scheduleDecorate);
  window.addEventListener("load", scheduleDecorate);

  watch();
  centerShapes();
  scheduleDecorate();

  /* Geometry drawings are often placed off to one side of their frame, which
     leaves an empty strip on phones. Slide the frame (not the shape) so the
     drawing sits in the middle. Size and math stay exactly the same.
     Drawings you drag on (touch-action: none) are left alone. */
  function centerShapes() {
    if (!window.MutationObserver) return;
    var PAGES = /^(triangles|quadrilaterals|similar-triangles|pythagoras|angles-parallel|circle)$/;
    var queued = false;
    function fit() {
      queued = false;
      if (!PAGES.test(doc.documentElement.dataset.page || "")) return;
      var svgs = doc.querySelectorAll("#root svg[viewBox]");
      for (var i = 0; i < svgs.length; i++) {
        var s = svgs[i];
        if (s.style.touchAction === "none" || s.closest("[data-mp-keep]")) continue;
        // drawings made of stacked layers (an overlay on top of the shape) must keep
        // identical frames, or the marks stop lining up with the shape. Leave them alone.
        var stacked = false, sib = s.parentElement ? s.parentElement.children : [];
        for (var k = 0; k < sib.length; k++) if (sib[k] !== s && sib[k].tagName.toLowerCase() === "svg") stacked = true;
        if (stacked) {
          if (s.hasAttribute("data-mp-vb") && s.getAttribute("viewBox") !== s.getAttribute("data-mp-vb")) s.setAttribute("viewBox", s.getAttribute("data-mp-vb"));
          continue;
        }
        var cur = s.getAttribute("viewBox");
        // a new frame from the topic itself (not one we set) becomes the new original
        if (cur !== s.getAttribute("data-mp-set")) s.setAttribute("data-mp-vb", cur);
        var vb = s.getAttribute("data-mp-vb").split(/[\s,]+/).map(Number);
        if (vb.length !== 4 || !(vb[2] > 0)) continue;
        var box; try { box = s.getBBox(); } catch (e) { continue; }
        if (!box.width || box.width > vb[2] * 0.96) continue;
        var shift = Math.round(box.x + box.width / 2 - (vb[0] + vb[2] / 2));
        var next = Math.abs(shift) < vb[2] * 0.03 ? vb.slice() : [vb[0] + shift, vb[1], vb[2], vb[3]];
        // trim a big empty band above/below (same scale, so the shape keeps its size)
        var pad = Math.max(18, Math.round(vb[2] * 0.08)), h = Math.ceil(box.height + pad * 2);
        var autoH = !s.getAttribute("height") && (!s.style.height || s.style.height === "auto");
        if (autoH && box.height && h < vb[3] * 0.8) { next[1] = Math.floor(box.y - pad); next[3] = h; }
        var val = next.join(" ");
        s.setAttribute("data-mp-set", val);
        if (cur !== val) s.setAttribute("viewBox", val);
      }
    }
    new MutationObserver(function (list) {
      if (queued) return;
      for (var i = 0; i < list.length; i++) {
        var t = list[i].target;
        if (t.nodeType !== 1) t = t.parentNode;
        if (t && t.closest && t.closest("#root")) { queued = true; requestAnimationFrame(fit); return; }
      }
    }).observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["points", "d", "x", "cx", "x1"] });
    queued = true; requestAnimationFrame(fit);
  }

  /* ── Finger dragging for mouse-only drags ─────────────────────────────── */
  // Some modules move terms across "=" with mouse events only, so on a phone
  // the finger just scrolled the page. On those pages, a finger on a draggable
  // term is passed on as the same mouse drag. The exercise code is unchanged.
  var MOUSE_DRAG_PAGES = { "equations-advanced": 1 };
  var DRAGGABLE = "[title='גרור לצד השני']"; // the term chips (other chips use the browser's own drag)
  var fingerDrag = null;
  function sendMouse(type, target, t) {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: t.clientX, clientY: t.clientY, button: 0, buttons: type === "mouseup" ? 0 : 1 }));
  }
  doc.addEventListener("touchstart", function (e) {
    if (!MOUSE_DRAG_PAGES[doc.documentElement.dataset.page] || e.touches.length !== 1) return;
    var el = e.target.closest && e.target.closest(DRAGGABLE);
    if (!el || !el.closest("#root")) return;
    e.preventDefault(); // no page scroll, no extra emulated click
    fingerDrag = { last: e.touches[0] };
    sendMouse("mousedown", el, e.touches[0]);
  }, { passive: false, capture: true });
  doc.addEventListener("touchmove", function (e) {
    if (!fingerDrag) return;
    e.preventDefault();
    fingerDrag.last = e.touches[0];
    sendMouse("mousemove", doc, e.touches[0]);
  }, { passive: false, capture: true });
  function endFinger(e) {
    if (!fingerDrag) return;
    var t = (e.changedTouches && e.changedTouches[0]) || fingerDrag.last;
    fingerDrag = null;
    sendMouse("mouseup", doc, t);
  }
  doc.addEventListener("touchend", endFinger, { capture: true });
  doc.addEventListener("touchcancel", endFinger, { capture: true });

  // tiny public API, e.g. for a future module: MP.sound("ok")
  // (MP.log lists the sounds played — handy for testing)
  window.MP = {
    sound: play, last: null, log: [],
    view: function () { track("view"); },
    isSoundOn: function () { return soundOn; },
    setSound: function (on) { soundOn = !!on; try { localStorage.setItem(KEY, soundOn ? "on" : "off"); } catch (e) {} if (soundOn) play("select"); }
  };
}
