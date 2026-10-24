/* ==========================================================================
   MathProject app shell  (mp.js)
   --------------------------------------------------------------------------
   Adds, on every exercise page, without touching the exercise code:
   1. a top bar: "back to all topics" + sound on/off
   2. soft sounds: tap, select, correct, wrong, solved
   3. small motion on feedback: pop on correct, shake on wrong,
      confetti when a whole exercise is solved
   It only WATCHES the page (clicks and DOM changes). It never changes the
   exercise's state, text or numbers. See DESIGN.md.
   ========================================================================== */
(function () {
  "use strict";

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

  /* ── Anonymous answer stats (only when the database is connected) ────── */
  // Sends: page, chapter, step, correct/wrong/solved, phone or not, and a
  // random device number. Never names, emails or anything typed.
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
    var D = window.MPData;
    if (!D || !D.ready) return function () {};
    var dev = null;
    try { dev = localStorage.getItem("mp:device"); } catch (e) {}
    if (!dev || dev.length < 8) {
      dev = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "d" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem("mp:device", dev); } catch (e) {}
    }
    var page = (location.pathname.split("/").pop() || "index.html").slice(0, 80);
    var mobile = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
    var queue = [], timer = null;
    function flush(leaving) {
      clearTimeout(timer); timer = null;
      if (!queue.length) return;
      D.insert("events", queue.splice(0), { keepalive: !!leaving });
    }
    window.addEventListener("pagehide", function () { flush(true); });
    doc.addEventListener("visibilitychange", function () { if (doc.visibilityState === "hidden") flush(true); });
    return function (kind, el) {
      queue.push({ device: dev, page: page, chapter: chapterOf(), step: kind === "view" ? null : stepOf(el), kind: kind, mobile: mobile });
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
    if (performance.now() - lastAction > 1600) return; // only react to the student's own actions
    found = null;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
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
      play(found.kind);
      animate(found.el, found.kind);
      track(found.kind, found.el);
    }
  }

  function watch() {
    var root = doc.getElementById("root");
    if (!root || !window.MutationObserver) return;
    new MutationObserver(onMutations).observe(root, {
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
    if (t.closest(".ch-nav, .ch-btns") && t.scrollIntoView) {
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
    if (isCheck) {
      var mine = pendingCheck = { btn: t };
      setTimeout(function () {
        if (pendingCheck !== mine) return;
        pendingCheck = null;
        var box = t.closest(".step-card, .card, .eq-card, .section, .tri-box, .history") || doc.getElementById("root");
        var bad = box && box.querySelector(SEL.bad);
        if (bad && bad.offsetParent !== null && visibleText(bad)) {
          if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
          play("bad"); animate(bad, "bad"); track("bad", bad);
        }
      }, 160);
    }
  }, true);

  /* ── Top bar ─────────────────────────────────────────────────────────── */
  var ICON_BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var ICON_SOUND =
    '<svg class="mp-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" fill="currentColor" fill-opacity=".12"/><path d="M15.5 9a4 4 0 010 6"/><path d="M18 6.5a7.5 7.5 0 010 11"/></svg>' +
    '<svg class="mp-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" fill="currentColor" fill-opacity=".12"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

  function topbar() {
    if (doc.querySelector(".mp-topbar")) return;
    var bar = doc.createElement("header");
    bar.className = "mp-topbar";
    var title = (doc.title || "").split(/\s[—–-]\s/)[0];
    bar.innerHTML =
      '<a class="mp-back" href="index.html">' + ICON_BACK + '<span>כל הנושאים</span></a>' +
      '<div class="mp-topbar-title"></div>' +
      '<button type="button" class="mp-sound" aria-label="צלילים">' + ICON_SOUND + '</button>';
    bar.querySelector(".mp-topbar-title").textContent = title;
    var btn = bar.querySelector(".mp-sound");
    function sync() {
      btn.setAttribute("aria-pressed", soundOn ? "true" : "false");
      btn.title = soundOn ? "השתקה" : "הפעלת צלילים";
    }
    sync();
    btn.addEventListener("click", function () {
      soundOn = !soundOn;
      try { localStorage.setItem(KEY, soundOn ? "on" : "off"); } catch (e) {}
      sync();
      if (soundOn) play("select");
    });
    doc.body.insertBefore(bar, doc.body.firstChild);

    var scrolled = false;
    function onScroll() {
      var s = window.scrollY > 72;
      if (s !== scrolled) { scrolled = s; bar.classList.toggle("is-scrolled", s); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function start() {
    if (!doc.documentElement.hasAttribute("data-mp-home")) topbar();
    watch();
    if (doc.getElementById("root")) setTimeout(function () { track("view"); }, 1800);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start);
  else start();

  // tiny public API, e.g. for a future module: MP.sound("ok")
  // (MP.log lists the sounds played — handy for testing)
  window.MP = { sound: play, last: null, log: [] };
})();
