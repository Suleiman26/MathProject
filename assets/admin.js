/* ==========================================================================
   MathProject admin (admin.js)
   Screens: PIN · Dashboard · Content · Analytics · Students · Sales · Settings
   Data: Supabase functions (supabase/migrations). When the site is not
   connected yet, it runs in PREVIEW mode with clearly-labelled sample data.
   ========================================================================== */
(function () {
  "use strict";

  var D = window.MPData;
  var ICON = window.MP_ICON, ICONS = window.MP_ICONS;
  var DEMO = !D.ready;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var app = document.getElementById("app");
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── small helpers ──────────────────────────────────────────────────── */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return Number(n || 0).toLocaleString("he-IL"); }
  function money(n) { return "\u2066₪" + Number(n || 0).toLocaleString("he-IL", { maximumFractionDigits: 0 }) + "\u2069"; }
  function pct(a, b) { return b ? Math.round((a / b) * 100) : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ago(t) {
    var s = (Date.now() - new Date(t).getTime()) / 1000;
    if (s < 60) return "עכשיו";
    if (s < 3600) return "לפני " + Math.round(s / 60) + " דק׳";
    if (s < 86400) return "לפני " + Math.round(s / 3600) + " שע׳";
    if (s < 86400 * 7) return "לפני " + Math.round(s / 86400) + " ימים";
    return new Date(t).toLocaleDateString("he-IL");
  }
  function dShort(d) { var x = new Date(d); return x.getDate() + "/" + (x.getMonth() + 1); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function unstore(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function studentName(dev) { return "תלמיד #" + String(dev || "").replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase(); }

  /* ── UI icons ───────────────────────────────────────────────────────── */
  function ic(paths, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || "") + ">" + paths + "</svg>"; }
  var UI = {
    dashboard: ic('<rect x="3.5" y="3.5" width="7" height="8" rx="2"/><rect x="13.5" y="3.5" width="7" height="5" rx="2"/><rect x="13.5" y="11.5" width="7" height="9" rx="2"/><rect x="3.5" y="14.5" width="7" height="6" rx="2"/>'),
    content: ic('<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="1.5" fill="currentColor"/>'),
    analytics: ic('<path d="M4 20h16"/><path d="M7 16v-4M12 16V6M17 16v-7"/>'),
    students: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18.5 14.8c1.6.7 2.6 2.4 3 5.2"/>'),
    sales: ic('<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>'),
    settings: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"/>'),
    logout: ic('<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>'),
    external: ic('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4"/>'),
    refresh: ic('<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>'),
    grip: ic('<circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/>'),
    edit: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
    trash: ic('<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>'),
    check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    x: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
    search: ic('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>'),
    chev: ic('<path d="M15 6l-6 6 6 6"/>'),
    target: ic('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
    trophy: ic('<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8.5 20h7"/>'),
    answers: ic('<path d="M4 6h10M4 12h7M4 18h10"/><path d="M15 15.5l2.5 2.5 4.5-5"/>'),
    info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    lock: ic('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>'),
    backspace: ic('<path d="M9 5h10a2 2 0 012 2v10a2 2 0 01-2 2H9l-6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>'),
    download: ic('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
    phone: ic('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
    desktop: ic('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
    eye: ic('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    clock: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    spark: ic('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>')
  };
  var MARK = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#1c1b19"/><path d="M13 35l6-3 7 14 10-28h15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="40" r="5" fill="#14b8a6"/></svg>';

  var VIEWS = [
    { id: "dashboard", label: "לוח בקרה", short: "לוח", icon: "dashboard", sub: "תמונת מצב של הפלטפורמה" },
    { id: "content", label: "תוכן", short: "תוכן", icon: "content", sub: "כיתות, קטגוריות ונושאים. גררו כדי לשנות סדר." },
    { id: "analytics", label: "ניתוח", short: "ניתוח", icon: "analytics", sub: "איפה התלמידים מצליחים ואיפה נתקעים" },
    { id: "students", label: "תלמידים", short: "תלמידים", icon: "students", sub: "פעילות התלמידים (אנונימית עד שתהיה הרשמה)" },
    { id: "sales", label: "מכירות", short: "מכירות", icon: "sales", sub: "מנויים, הכנסות ותוכניות מחיר" },
    { id: "settings", label: "הגדרות", short: "הגדרות", icon: "settings", sub: "קוד כניסה, חיבור ונתונים" }
  ];
  var PAGES = ["equation-solver.html", "equations-advanced.html", "inequalities.html", "quadratic-solver.html",
    "linear-function.html", "parabola-practice.html", "intersection.html", "directed-numbers.html", "ratio-percent.html",
    "powers-roots.html", "angles-parallel.html", "triangles.html", "quadrilaterals.html", "pythagoras.html",
    "similar-triangles.html", "circle.html", "solids3d.html"];
  var COLORS = ["teal", "sky", "blue", "indigo", "violet", "pink", "cyan", "orange"];
  var STATUS = { ready: "מוכן", in_progress: "בעבודה", planned: "מתוכנן" };

  var state = {
    tok: null, view: "dashboard",
    days: store("mp:adm-days") || 30,
    catalog: null, stats: null, students: null, sales: null,
    open: {}, sort: "hard", q: "", studentQ: ""
  };

  /* ── Preview mode (no database yet): sample data ────────────────────── */
  var demo = (function () {
    function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    var DEF = (function () {
      var g = [{ id: "g7", name: "כיתה ז׳" }, { id: "g8", name: "כיתה ח׳" }, { id: "g9", name: "כיתה ט׳" }];
      var c = [{ id: "c1", name: "אלגברה", color: "indigo" }, { id: "c2", name: "גיאומטריה", color: "sky" }, { id: "c3", name: "תחום מספרי", color: "teal" }];
      var t = [
        ["משוואות", "equation-solver.html", ["g7", "g8"], "equation", "teal", "c1"],
        ["משוואות מתקדמות", "equations-advanced.html", ["g8", "g9"], "fraction", "indigo", "c1"],
        ["אי־שוויונות", "inequalities.html", ["g8", "g9"], "inequality", "pink", "c1"],
        ["משוואות ריבועיות", "quadratic-solver.html", ["g9"], "square", "blue", "c1"],
        ["פונקציה לינארית", "linear-function.html", ["g8", "g9"], "line", "teal", "c1"],
        ["פרבולה", "parabola-practice.html", ["g9"], "parabola", "indigo", "c1"],
        ["נקודות חיתוך", "intersection.html", ["g9"], "intersection", "blue", "c1"],
        ["מספרים מכוונים", "directed-numbers.html", ["g7"], "numberline", "teal", "c3"],
        ["יחס ואחוזים", "ratio-percent.html", ["g7"], "percent", "teal", "c3"],
        ["חזקות ושורשים", "powers-roots.html", ["g8", "g9"], "root", "violet", "c3"],
        ["זוויות ומקבילים", "angles-parallel.html", ["g7"], "parallel", "teal", "c2"],
        ["משולשים", "triangles.html", ["g7", "g8"], "triangle", "sky", "c2"],
        ["מרובעים", "quadrilaterals.html", ["g8"], "quad", "cyan", "c2"],
        ["פיתגורס", "pythagoras.html", ["g8"], "right", "indigo", "c2"],
        ["דמיון משולשים", "similar-triangles.html", ["g9"], "similar", "orange", "c2"],
        ["מעגל", "circle.html", ["g9"], "circle", "sky", "c2"],
        ["גופים", "solids3d.html", ["g7", "g8", "g9"], "cube", "teal", "c2"]
      ];
      var pos = {};
      return {
        grades: g.map(function (x, i) { return { id: x.id, name: x.name, position: i, visible: true }; }),
        categories: c.map(function (x, i) { return { id: x.id, name: x.name, color: x.color, position: i, visible: true }; }),
        topics: t.map(function (x, i) {
          pos[x[5]] = (pos[x[5]] || 0) + 1;
          return { id: "t" + i, name: x[0], page: x[1], grade_ids: x[2], icon: x[3], color: x[4], category_id: x[5], status: i < 5 ? "ready" : "in_progress", position: pos[x[5]] - 1, visible: true };
        }),
        plans: []
      };
    })();
    function cat() { return store("mp:demo-catalog") || JSON.parse(JSON.stringify(DEF)); }
    function save(c) { store("mp:demo-catalog", c); }
    var listOf = { grade: "grades", category: "categories", topic: "topics", plan: "plans" };
    var HARD = { "pythagoras.html": 0.52, "similar-triangles.html": 0.55, "quadratic-solver.html": 0.58, "equations-advanced.html": 0.6, "parabola-practice.html": 0.63, "intersection.html": 0.62, "solids3d.html": 0.66, "inequalities.html": 0.7, "powers-roots.html": 0.72, "circle.html": 0.71, "triangles.html": 0.76, "quadrilaterals.html": 0.78, "linear-function.html": 0.74, "ratio-percent.html": 0.8, "angles-parallel.html": 0.83, "directed-numbers.html": 0.86, "equation-solver.html": 0.84 };
    var CH = ["פרק א׳", "פרק ב׳", "פרק ג׳", "פרק ד׳"];
    var locks = [];

    return {
      login: function (pin) {
        var now = Date.now();
        locks = locks.filter(function (t) { return now - t < 15 * 60000; });
        if (locks.length >= 5) return Promise.resolve({ error: "locked", retry_at: new Date(locks[0] + 15 * 60000).toISOString() });
        if (pin === "1111") { locks = []; return Promise.resolve({ token: "preview", expires_at: new Date(now + 12 * 3600e3).toISOString() }); }
        locks.push(now);
        return Promise.resolve({ error: "wrong", left: Math.max(0, 5 - locks.length) });
      },
      admin_catalog: function () { return Promise.resolve(cat()); },
      admin_save: function (a) {
        var c = cat(), arr = c[listOf[a.kind]], it = a.item;
        if (!it.id) { it.id = a.kind[0] + Date.now().toString(36); it.position = arr.length; it.visible = it.visible !== false; arr.push(it); }
        else { var o = arr.find(function (x) { return x.id === it.id; }); Object.assign(o, it); it = o; }
        save(c); return Promise.resolve(it);
      },
      admin_delete: function (a) {
        var c = cat(); c[listOf[a.kind]] = c[listOf[a.kind]].filter(function (x) { return x.id !== a.rid; });
        if (a.kind === "grade") c.topics.forEach(function (t) { t.grade_ids = t.grade_ids.filter(function (g) { return g !== a.rid; }); });
        if (a.kind === "category") c.topics.forEach(function (t) { if (t.category_id === a.rid) t.category_id = null; });
        save(c); return Promise.resolve(null);
      },
      admin_reorder: function (a) {
        var c = cat(); a.ids.forEach(function (id, i) { var o = c[listOf[a.kind]].find(function (x) { return x.id === id; }); if (o) o.position = i; });
        save(c); return Promise.resolve(null);
      },
      admin_stats: function (a) {
        var days = a.days, r = rng(days * 7919), now = new Date();
        var daily = [], topics = {}, chapters = {}, steps = {}, recent = [];
        var pages = Object.keys(HARD);
        var weight = pages.map(function (p, i) { return 0.5 + r() * (i < 6 ? 1.6 : 1); });
        for (var d = days; d >= 0; d--) {
          var day = new Date(now.getTime() - d * 86400e3), wd = day.getDay();
          var growth = 0.75 + 0.25 * (1 - d / days);
          var act = Math.round((wd === 5 || wd === 6 ? 14 : 34) * growth * (0.8 + r() * 0.4));
          var ok = 0, bad = 0, win = 0;
          pages.forEach(function (p, i) {
            var n = Math.round(act * weight[i] * (0.4 + r() * 0.5));
            var o = Math.round(n * HARD[p] * (0.9 + r() * 0.2)), b = Math.max(0, n - o), w = Math.round(o / 6);
            ok += o; bad += b; win += w;
            var T = topics[p] = topics[p] || { page: p, attempts: 0, ok: 0, bad: 0, win: 0, views: 0, devices: 0 };
            T.ok += o; T.bad += b; T.win += w; T.attempts += o + b; T.views += Math.round(n / 3); T.devices = Math.max(T.devices, Math.round(act * weight[i] * 0.9));
            CH.slice(0, 3 + (i % 2)).forEach(function (ch, j) {
              var k = p + "|" + ch, f = [0.45, 0.3, 0.17, 0.08][j], hard = j === 2 ? 0.82 : j === 3 ? 0.9 : 1.04;
              var C = chapters[k] = chapters[k] || { page: p, chapter: ch, ok: 0, bad: 0, win: 0, devices: 0 };
              var co = Math.round(o * f * hard), cb = Math.round(b * f * (2 - hard));
              C.ok += co; C.bad += cb; C.win += Math.round(w * f); C.devices = Math.max(C.devices, Math.round(act * f));
              ["שלב 1", "שלב 2", "שלב 3"].forEach(function (st, s) {
                var sk = k + "|" + st, sf = [0.5, 0.32, 0.18][s], sh = [1.05, 0.95, 0.8][s];
                var S = steps[sk] = steps[sk] || { page: p, chapter: ch, step: st, ok: 0, bad: 0 };
                S.ok += Math.round(co * sf * sh); S.bad += Math.round(cb * sf * (2 - sh));
              });
            });
          });
          daily.push({ day: day.toISOString().slice(0, 10), ok: ok, bad: bad, win: win, active: act });
        }
        var sum = function (k) { return daily.reduce(function (s, x) { return s + x[k]; }, 0); };
        var hours = []; for (var h = 0; h < 24; h++) { var base = h < 7 ? 0.03 : h < 13 ? 0.25 : h < 15 ? 0.5 : h < 22 ? 1 : 0.3; hours.push({ h: h, n: Math.round(base * (60 + r() * 40) * days / 3) }); }
        for (var i = 0; i < 25; i++) {
          var p = pages[Math.floor(r() * pages.length)], k = r() < HARD[p] ? "ok" : "bad";
          if (r() < 0.12) k = "win";
          recent.push({ at: new Date(now.getTime() - (i * 7 + r() * 9) * 60000).toISOString(), page: p, chapter: CH[Math.floor(r() * 3)], step: "שלב " + (1 + Math.floor(r() * 3)), kind: k, device: "dev" + Math.floor(r() * 1e8).toString(36) });
        }
        var active = Math.round(sum("active") / Math.max(1, days) * 3.1);
        return Promise.resolve({
          demo: true,
          range: { days: days },
          kpi: { active: active, active_prev: Math.round(active * 0.84), active_today: daily[daily.length - 1].active,
            correct: sum("ok"), wrong: sum("bad"), solved: sum("win"), views: Math.round(sum("ok") / 3),
            correct_prev: Math.round(sum("ok") * 0.82), wrong_prev: Math.round(sum("bad") * 0.86), solved_prev: Math.round(sum("win") * 0.8),
            new_devices: Math.round(active * 0.3), all_time_devices: Math.round(active * 1.9) },
          daily: daily, topics: Object.values(topics), chapters: Object.values(chapters), steps: Object.values(steps),
          hours: hours, devices: { mobile: Math.round(active * 0.64), desktop: Math.round(active * 0.36) }, recent: recent
        });
      },
      admin_students: function (a) {
        var r = rng(a.days * 31), out = [], pages = Object.keys(HARD);
        for (var i = 0; i < 64; i++) {
          var last = Date.now() - r() * a.days * 86400e3, ok = Math.round(r() * 160), bad = Math.round(ok * (0.15 + r() * 0.5));
          out.push({ device: "dev" + Math.floor(r() * 1e9).toString(36), first_seen: new Date(last - r() * 40 * 86400e3).toISOString(), last_seen: new Date(last).toISOString(),
            days_active: 1 + Math.floor(r() * 14), ok: ok, bad: bad, win: Math.round(ok / 7), mobile: r() < 0.64, top_page: pages[Math.floor(r() * pages.length)] });
        }
        out.sort(function (x, y) { return new Date(y.last_seen) - new Date(x.last_seen); });
        return Promise.resolve(out);
      },
      admin_sales: function () {
        var months = []; var d = new Date();
        for (var i = 11; i >= 0; i--) { var m = new Date(d.getFullYear(), d.getMonth() - i, 1); months.push({ month: m.toISOString().slice(0, 7), subscribers: 0, mrr: 0 }); }
        return Promise.resolve({ active: 0, trial: 0, past_due: 0, canceled_30d: 0, mrr: 0, monthly: months, recent: [] });
      },
      admin_export: function (a) { return this.admin_stats(a).then(function () { return []; }); },
      admin_change_pin: function () { return Promise.resolve({ error: "preview" }); },
      admin_logout: function () { return Promise.resolve(null); }
    };
  })();

  /* ── API ────────────────────────────────────────────────────────────── */
  function call(fn, args) {
    args = args || {};
    if (DEMO) return demo[fn](args);
    args.tok = state.tok;
    return D.rpc(fn, args).catch(function (e) {
      if (/unauthorized/i.test(e.message)) { signOut(true); }
      throw e;
    });
  }
  function login(pin) { return DEMO ? demo.login(pin) : D.rpc("admin_login", { pin: pin }); }

  /* ── Toast & tooltip ────────────────────────────────────────────────── */
  var toastEl, toastT;
  function toast(msg, err) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.className = "toast" + (err ? " err" : "");
    toastEl.innerHTML = (err ? UI.info : UI.check) + "<span>" + esc(msg) + "</span>";
    requestAnimationFrame(function () { toastEl.classList.add("on"); });
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("on"); }, 2200);
  }
  var tipEl;
  function tip(html, x, y) {
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip"; document.body.appendChild(tipEl); }
    if (html == null) { tipEl.classList.remove("on"); return; }
    tipEl.innerHTML = html;
    var w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    var left = clamp(x - w / 2, 8, innerWidth - w - 8), top = y - h - 14;
    if (top < 8) top = y + 18;
    tipEl.style.left = left + "px"; tipEl.style.top = top + "px";
    tipEl.classList.add("on");
  }

  /* ── PIN screen ─────────────────────────────────────────────────────── */
  function renderPin(msg) {
    var digits = "";
    var keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "del"];
    app.innerHTML =
      '<main class="pin-wrap"><div class="pin-card">' + MARK.replace("<svg", '<svg class="mark"') +
      "<h1>כניסה לניהול</h1><p>הקלידו את קוד הכניסה</p>" +
      '<div class="pin-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      '<div class="pin-msg" role="alert"></div>' +
      '<div class="keypad">' + keys.map(function (k) {
        if (k === "") return "<span></span>";
        if (k === "del") return '<button type="button" class="key ghost" data-k="del" aria-label="מחיקה">' + UI.backspace + "</button>";
        return '<button type="button" class="key" data-k="' + k + '">' + k + "</button>";
      }).join("") + "</div>" +
      (DEMO ? '<p class="pin-note">מצב תצוגה · המסד עוד לא מחובר</p>' : "") +
      "</div></main>";
    var dots = $$(".pin-dots i"), msgEl = $(".pin-msg"), busy = false, lockTimer;
    if (msg) { msgEl.textContent = msg; }
    function paint() { dots.forEach(function (d, i) { d.classList.toggle("on", i < digits.length); }); }
    function setLocked(until) {
      $$(".key").forEach(function (b) { b.disabled = true; });
      function tick() {
        var s = Math.max(0, Math.round((new Date(until) - Date.now()) / 1000));
        msgEl.textContent = "נעול אחרי 5 ניסיונות שגויים · נסו שוב בעוד " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
        if (s <= 0) { clearInterval(lockTimer); msgEl.textContent = ""; $$(".key").forEach(function (b) { b.disabled = false; }); }
      }
      tick(); lockTimer = setInterval(tick, 1000);
    }
    function shake() {
      var el = $(".pin-dots");
      if (el.animate && !reduceMotion) el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-5px)" }, { transform: "translateX(3px)" }, { transform: "translateX(0)" }], { duration: 380, easing: "cubic-bezier(.36,.07,.19,.97)" });
      if (navigator.vibrate) navigator.vibrate(40);
    }
    function submit() {
      busy = true; msgEl.className = "pin-msg info"; msgEl.textContent = "בודק…";
      login(digits).then(function (r) {
        busy = false;
        if (r && r.token) {
          $(".pin-dots").classList.add("ok");
          state.tok = r.token;
          store("mp:admin", { tok: r.token, exp: r.expires_at, demo: DEMO });
          setTimeout(start, 220);
          return;
        }
        msgEl.className = "pin-msg";
        digits = ""; paint(); shake();
        if (r && r.error === "locked") setLocked(r.retry_at);
        else msgEl.textContent = "קוד שגוי" + (r && r.left != null ? " · נותרו " + r.left + " ניסיונות" : "");
      }).catch(function () {
        busy = false; digits = ""; paint();
        msgEl.className = "pin-msg"; msgEl.textContent = "אין חיבור לשרת. נסו שוב.";
      });
    }
    function press(k) {
      if (busy) return;
      if (k === "del") { digits = digits.slice(0, -1); paint(); return; }
      if (digits.length >= 4) return;
      digits += k; paint();
      if (msgEl.textContent && !busy) { msgEl.textContent = ""; }
      if (digits.length === 4) setTimeout(submit, 120);
    }
    $(".keypad").addEventListener("click", function (e) { var b = e.target.closest(".key"); if (b && !b.disabled) press(b.dataset.k); });
    function onKey(e) {
      if (!document.body.contains(msgEl)) { document.removeEventListener("keydown", onKey); return; }
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    }
    document.addEventListener("keydown", onKey);
  }

  function signOut(expired) {
    if (!DEMO && state.tok && !expired) D.rpc("admin_logout", { tok: state.tok }).catch(function () {});
    state.tok = null; unstore("mp:admin");
    renderPin(expired ? "פג תוקף הכניסה. הקלידו את הקוד שוב." : "");
  }

  /* ── Shell ──────────────────────────────────────────────────────────── */
  function shell() {
    var nav = VIEWS.map(function (v) { return '<a href="#/' + v.id + '" data-v="' + v.id + '">' + UI[v.icon] + "<span>" + v.label + "</span></a>"; }).join("");
    var bnav = VIEWS.map(function (v) { return '<a href="#/' + v.id + '" data-v="' + v.id + '">' + UI[v.icon] + "<span>" + v.short + "</span></a>"; }).join("");
    app.innerHTML =
      '<div class="shell">' +
      '<aside class="side"><div class="brand">' + MARK + '<div><b>מתמטיקה חט״ב</b><small>ניהול</small></div></div>' +
      '<nav class="nav" aria-label="ניווט ראשי">' + nav + "</nav>" +
      '<div class="side-foot">' +
      '<div class="status-pill' + (DEMO ? " demo" : "") + '"><i></i><span>' + (DEMO ? "מצב תצוגה · נתוני דוגמה" : "מחובר למסד הנתונים") + "</span></div>" +
      '<a class="side-link" href="index.html" target="_blank" rel="noopener">' + UI.external + "<span>לאתר התלמידים</span></a>" +
      '<button type="button" class="side-link" data-act="logout">' + UI.logout + "<span>יציאה</span></button>" +
      "</div></aside>" +
      '<header class="mtop"><div class="brand">' + MARK + '<div><b>ניהול</b><small>מתמטיקה חט״ב</small></div></div>' +
      '<button type="button" class="ibtn" data-act="logout" aria-label="יציאה">' + UI.logout + "</button></header>" +
      '<div class="main"><div class="main-in" id="view"></div></div>' +
      '<nav class="bnav" aria-label="ניווט">' + bnav + "</nav>" +
      "</div>";
    if (!app.dataset.bound) {
      app.dataset.bound = "1";
      app.addEventListener("click", function (e) {
        var a = e.target.closest("[data-act='logout']");
        if (a && state.tok) signOut(false);
      });
    }
  }

  function head(v, tools) {
    return '<div class="page-head"><div><h1>' + v.label + "</h1><p>" + v.sub + "</p></div>" +
      '<div class="head-tools">' + (tools || "") + "</div></div>" +
      (DEMO ? '<div class="demo-bar">' + UI.info + "<span><b>מצב תצוגה.</b> המספרים כאן הם נתוני דוגמה, לא אמיתיים. הם יתחלפו בנתונים אמיתיים ברגע שנחבר את המסד של הפרויקט (ראו <a href=\"#/settings\">הגדרות</a>).</span></div>" : "");
  }
  function periodTools() {
    return '<div class="seg" role="group" aria-label="תקופה">' + [7, 30, 90].map(function (d) {
      return '<button type="button" data-days="' + d + '" aria-pressed="' + (state.days === d) + '">' + d + " ימים</button>";
    }).join("") + '</div><button type="button" class="ibtn" data-act="refresh" aria-label="רענון">' + UI.refresh + "</button>";
  }
  function bindPeriod(reload) {
    $$("[data-days]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.days = +b.dataset.days; store("mp:adm-days", state.days);
        state.stats = null; state.students = null; reload();
      });
    });
    var r = $("[data-act='refresh']");
    if (r) r.addEventListener("click", function () { r.classList.add("spin"); state.stats = null; state.students = null; state.sales = null; reload(); });
  }

  /* ── Data loading ───────────────────────────────────────────────────── */
  function need(keys) {
    var jobs = [];
    if (keys.indexOf("catalog") >= 0 && !state.catalog) jobs.push(call("admin_catalog").then(function (c) { state.catalog = c; }));
    if (keys.indexOf("stats") >= 0 && !state.stats) jobs.push(call("admin_stats", { days: state.days }).then(function (s) { state.stats = s; }));
    if (keys.indexOf("students") >= 0 && !state.students) jobs.push(call("admin_students", { days: state.days }).then(function (s) { state.students = s; }));
    if (keys.indexOf("sales") >= 0 && !state.sales) jobs.push(call("admin_sales").then(function (s) { state.sales = s; }));
    return Promise.all(jobs);
  }
  function loading(v) {
    $("#view").innerHTML = head(v) + '<div class="panel"><div class="empty"><span class="mp-boot" style="min-height:120px"><span></span></span></div></div>';
  }
  function failed(v, e) {
    $("#view").innerHTML = head(v) + '<div class="panel"><div class="empty">' + UI.info + "<b>לא הצלחנו לטעון את הנתונים</b>" + esc(e && e.message) + '<div style="margin-top:14px"><button class="abtn" data-act="retry">נסו שוב</button></div></div></div>';
    $("[data-act='retry']").addEventListener("click", route);
  }

  function topicByPage(page) {
    var t = state.catalog && state.catalog.topics.find(function (x) { return x.page === page; });
    return t || { name: page.replace(".html", ""), icon: "book", color: "teal", page: page };
  }

  /* ── Charts (SVG, drawn to the real width) ──────────────────────────── */
  var observers = [];
  function onResize(el, draw) {
    draw();
    if (!window.ResizeObserver) return;
    var w = el.clientWidth;
    var ro = new ResizeObserver(function () { if (Math.abs(el.clientWidth - w) > 4) { w = el.clientWidth; draw(); } });
    ro.observe(el); observers.push(ro);
  }
  function niceMax(v) { if (v <= 4) return 4; var p = Math.pow(10, Math.floor(Math.log10(v))); var n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  function topRound(x, y, w, h, r) {
    if (h <= 0) return "";
    r = Math.min(r, w / 2, h);
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function barChart(el, data, opt) {
    // data: [{label, parts:[{v, color, name}], tip}]
    onResize(el, function () {
      var W = el.clientWidth, H = opt.height || 220, P = { l: 36, r: 6, t: 10, b: 26 };
      var iw = W - P.l - P.r, ih = H - P.t - P.b;
      var max = niceMax(Math.max.apply(null, data.map(function (d) { return d.parts.reduce(function (s, p) { return s + p.v; }, 0); }).concat([1])));
      var n = data.length, slot = iw / n, bw = Math.max(2, Math.min(28, slot * 0.68));
      var s = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(opt.label) + '" style="direction:ltr">';
      for (var g = 0; g <= 4; g++) {
        var gy = P.t + ih - (ih * g) / 4;
        s += '<line class="gl" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + gy + '" y2="' + gy + '"/>';
        s += '<text class="ax" x="' + (P.l - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + fmt((max * g) / 4) + "</text>";
      }
      var every = Math.ceil(n / Math.max(2, Math.floor(iw / 46)));
      data.forEach(function (d, i) {
        var x = P.l + slot * i + (slot - bw) / 2, y = P.t + ih, parts = d.parts.filter(function (p) { return p.v > 0; });
        s += '<g data-i="' + i + '">';
        parts.forEach(function (p, j) {
          var h = (p.v / max) * ih, gap = j > 0 ? 2 : 0;
          y -= h;
          var last = j === parts.length - 1;
          s += last ? '<path d="' + topRound(x, y, bw, h - gap, Math.min(4, bw / 2)) + '" fill="' + p.color + '"/>'
            : '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(0, h - gap) + '" fill="' + p.color + '"/>';
        });
        s += "</g>";
        if (i % every === 0 || i === n - 1) s += '<text class="ax" x="' + (x + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(d.label) + "</text>";
        s += '<rect class="hit" data-i="' + i + '" x="' + (P.l + slot * i) + '" y="' + P.t + '" width="' + slot + '" height="' + ih + '"/>';
      });
      s += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + (P.t + ih) + '" y2="' + (P.t + ih) + '" stroke="var(--line-strong)"/>';
      s += "</svg>";
      el.innerHTML = s;
      var svg = el.firstChild;
      svg.addEventListener("pointermove", function (e) {
        var hit = e.target.closest(".hit");
        $$("g.hov", svg).forEach(function (g) { g.classList.remove("hov"); });
        if (!hit) { tip(null); return; }
        var i = +hit.dataset.i, g = $('g[data-i="' + i + '"]', svg);
        if (g) g.classList.add("hov");
        tip(data[i].tip, e.clientX, e.clientY);
      });
      svg.addEventListener("pointerleave", function () { tip(null); $$("g.hov", svg).forEach(function (g) { g.classList.remove("hov"); }); });
    });
  }
  function spark(values, color) {
    var w = 96, h = 28, max = Math.max.apply(null, values.concat([1])), min = Math.min.apply(null, values.concat([0]));
    var span = max - min || 1, n = values.length;
    var pts = values.map(function (v, i) { return [(i / Math.max(1, n - 1)) * (w - 2) + 1, h - 2 - ((v - min) / span) * (h - 6)]; });
    var line = pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    var area = "M1," + h + " L" + line.replace(/ /g, " L") + " L" + (w - 1) + "," + h + "Z";
    return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" aria-hidden="true" style="direction:ltr"><path d="' + area + '" fill="' + color + '" opacity=".1"/><polyline points="' + line + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }
  function delta(now, prev, unit) {
    if (prev == null || (prev === 0 && now === 0)) return '<span class="delta">—</span>';
    if (unit === "pt") { var dpt = Math.round(now - prev); return '<span class="delta ' + (dpt > 0 ? "up" : dpt < 0 ? "down" : "") + '"><bdi>' + (dpt > 0 ? "▲ " : dpt < 0 ? "▼ " : "") + Math.abs(dpt) + "</bdi> נק׳</span>"; }
    if (!prev) return '<span class="delta up">חדש</span>';
    var d = Math.round(((now - prev) / prev) * 100);
    return '<span class="delta ' + (d > 0 ? "up" : d < 0 ? "down" : "") + '"><bdi>' + (d > 0 ? "▲ " : d < 0 ? "▼ " : "") + Math.abs(d) + "%</bdi></span>";
  }
  function meter(acc) {
    if (acc == null) return '<span class="muted">—</span>';
    return '<div class="meter"><div class="bar"><i style="width:' + acc + "%;background:" + (acc < 60 ? "var(--bad-c)" : "var(--ok-c)") + '"></i></div><span>' + acc + "%</span></div>";
  }
  function level(ok, bad) {
    var n = ok + bad, a = pct(ok, n);
    if (n < 5) return '<span class="badge">מעט נתונים</span>';
    if (a < 60) return '<span class="badge hard">קשה</span>';
    if (a < 80) return '<span class="badge mid">בינוני</span>';
    return '<span class="badge easy">קל</span>';
  }
  function topicIcon(t) { return '<span class="ic" data-topic="' + esc(t.color || "teal") + '">' + ICON(t.icon) + "</span>"; }

  /* ── Dashboard ──────────────────────────────────────────────────────── */
  function viewDashboard(v) {
    var s = state.stats, k = s.kpi, daily = s.daily || [];
    var answers = k.correct + k.wrong, answersPrev = k.correct_prev + k.wrong_prev;
    var acc = pct(k.correct, answers), accPrev = pct(k.correct_prev, answersPrev);
    var html = head(v, periodTools());

    html += '<div class="grid g4">' +
      kpi(UI.students, "תלמידים פעילים", fmt(k.active), delta(k.active, k.active_prev), "היום " + fmt(k.active_today) + " · חדשים " + fmt(k.new_devices), spark(daily.map(function (d) { return d.active; }), "var(--a-600)")) +
      kpi(UI.answers, "תשובות", fmt(answers), delta(answers, answersPrev), fmt(k.correct) + " נכונות · " + fmt(k.wrong) + " שגויות", spark(daily.map(function (d) { return d.ok + d.bad; }), "var(--ok-c)")) +
      kpi(UI.target, "אחוז הצלחה", acc == null ? "—" : acc + "%", acc == null || accPrev == null ? '<span class="delta">—</span>' : delta(acc, accPrev, "pt"), "מתוך כל התשובות", spark(daily.map(function (d) { return pct(d.ok, d.ok + d.bad) || 0; }), "var(--ok-c)")) +
      kpi(UI.trophy, "תרגילים שנפתרו", fmt(k.solved), delta(k.solved, k.solved_prev), "עד הסוף, כולל באנר הצלחה", spark(daily.map(function (d) { return d.win; }), "var(--ok-600)")) +
      "</div>";

    html += '<div class="grid g21 mt">' +
      '<section class="panel"><div class="panel-h"><h2>פעילות יומית</h2><div class="legend"><span><i style="background:var(--ok-c)"></i>✓ נכון</span><span><i style="background:var(--bad-c)"></i>✗ שגוי</span></div></div><div class="chart" id="ch-daily"></div></section>' +
      '<section class="panel"><div class="panel-h"><h2>מתי מתרגלים</h2><small>תשובות לפי שעה</small></div><div class="chart" id="ch-hours"></div></section>' +
      "</div>";

    var withData = (s.topics || []).filter(function (t) { return t.attempts >= 5; });
    var hardest = withData.slice().sort(function (a, b) { return a.ok / a.attempts - b.ok / b.attempts; }).slice(0, 5);
    var popular = (s.topics || []).slice().sort(function (a, b) { return b.attempts - a.attempts; }).slice(0, 5);
    var dev = s.devices || { mobile: 0, desktop: 0 }, devT = dev.mobile + dev.desktop;

    html += '<div class="grid g3 lists mt">' +
      '<section class="panel"><div class="panel-h"><h2>הכי קשה לתלמידים</h2><a class="abtn sm ghost" href="#/analytics">לניתוח המלא</a></div>' +
      (hardest.length ? '<div class="rows">' + hardest.map(function (t) {
        var tp = topicByPage(t.page);
        return '<div class="row">' + topicIcon(tp) + "<div><b>" + esc(tp.name) + "</b><small>" + fmt(t.attempts) + " תשובות</small></div>" + meter(pct(t.ok, t.attempts)) + "</div>";
      }).join("") + "</div>" : emptyMini("עוד אין מספיק תשובות")) + "</section>" +
      '<section class="panel"><div class="panel-h"><h2>הכי מתורגלים</h2></div>' +
      (popular.length ? '<div class="rows">' + popular.map(function (t) {
        var tp = topicByPage(t.page);
        return '<div class="row">' + topicIcon(tp) + "<div><b>" + esc(tp.name) + "</b><small>" + fmt(t.devices) + " תלמידים</small></div><b class=\"num\">" + fmt(t.attempts) + "</b></div>";
      }).join("") + "</div>" : emptyMini("עוד אין פעילות")) + "</section>" +
      '<section class="panel"><div class="panel-h"><h2>מאיפה מתרגלים</h2></div>' +
      (devT ? '<div class="split" style="direction:ltr"><i style="width:' + pct(dev.mobile, devT) + '%;background:var(--a-600)"></i><i style="width:' + pct(dev.desktop, devT) + '%;background:var(--a-200)"></i></div>' +
        '<div class="stat-line"><span>' + UI.phone.replace("<svg", '<svg style="width:16px;height:16px;vertical-align:-3px;margin-inline-end:6px;color:var(--a-600)"') + "טלפון</span><b>" + pct(dev.mobile, devT) + "% · " + fmt(dev.mobile) + "</b></div>" +
        '<div class="stat-line"><span>' + UI.desktop.replace("<svg", '<svg style="width:16px;height:16px;vertical-align:-3px;margin-inline-end:6px;color:var(--a-300)"') + "מחשב</span><b>" + pct(dev.desktop, devT) + "% · " + fmt(dev.desktop) + "</b></div>"
        : emptyMini("עוד אין פעילות")) +
      contentHealth() + "</section>" +
      "</div>";

    html += '<section class="panel mt feed"><div class="panel-h"><h2>פעילות אחרונה</h2><small>מתעדכן בכל כניסה</small></div>' +
      ((s.recent || []).length ? '<div class="rows">' + s.recent.slice(0, 12).map(function (e) {
        var tp = topicByPage(e.page), m = { ok: ["ok", "✓", "תשובה נכונה"], bad: ["bad", "✗", "תשובה שגויה"], win: ["win", "★", "פתר תרגיל"] }[e.kind] || ["", "·", e.kind];
        return '<div class="row"><span class="dot-k ' + m[0] + '">' + m[1] + "</span><div><b>" + esc(tp.name) + (e.chapter ? " · " + esc(e.chapter) : "") + "</b><small>" + m[2] + " · " + esc(studentName(e.device)) + (e.step ? " · " + esc(e.step) : "") + '</small></div><small class="muted">' + ago(e.at) + "</small></div>";
      }).join("") + "</div>" : emptyMini("כשתלמידים יענו על שאלות, זה יופיע כאן")) + "</section>";

    $("#view").innerHTML = html;
    bindPeriod(route);
    barChart($("#ch-daily"), daily.map(function (d) {
      var a = pct(d.ok, d.ok + d.bad);
      return { label: dShort(d.day), parts: [{ v: d.ok, color: "var(--ok-c)" }, { v: d.bad, color: "var(--bad-c)" }],
        tip: "<b>" + new Date(d.day).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" }) + "</b>" +
          '<i style="background:var(--ok-c)"></i>נכון ' + fmt(d.ok) + "<br>" + '<i style="background:var(--bad-c)"></i>שגוי ' + fmt(d.bad) + "<br>" +
          "הצלחה " + (a == null ? "—" : a + "%") + " · " + fmt(d.active) + " תלמידים" };
    }), { label: "תשובות נכונות ושגויות לפי יום", height: 230 });
    var hrs = []; for (var h = 0; h < 24; h++) { var f = (s.hours || []).find(function (x) { return x.h === h; }); hrs.push(f ? f.n : 0); }
    barChart($("#ch-hours"), hrs.map(function (n, h) {
      return { label: h % 3 === 0 ? String(h).padStart(2, "0") : "", parts: [{ v: n, color: "var(--a-500)" }], tip: "<b>" + String(h).padStart(2, "0") + ":00–" + String((h + 1) % 24).padStart(2, "0") + ":00</b>" + fmt(n) + " תשובות" };
    }), { label: "תשובות לפי שעה ביום", height: 230 });
  }
  function kpi(icon, label, value, d, sub, sp) {
    return '<section class="panel kpi"><div class="kpi-l">' + icon + "<span>" + label + '</span></div><div class="kpi-v">' + value + '</div><div class="kpi-f"><div>' + d + ' <span class="kpi-s">' + esc(sub) + "</span></div>" + sp + "</div></section>";
  }
  function emptyMini(t) { return '<div class="empty" style="padding:20px 8px">' + UI.analytics + "<b>" + esc(t) + "</b></div>"; }
  function contentHealth() {
    var c = state.catalog; if (!c) return "";
    var n = { ready: 0, in_progress: 0, planned: 0 }, hidden = 0;
    c.topics.forEach(function (t) { n[t.status] = (n[t.status] || 0) + 1; if (!t.visible) hidden++; });
    return '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)"><div class="panel-h" style="margin-bottom:8px"><h2>מצב התוכן</h2><a class="abtn sm ghost" href="#/content">לניהול</a></div>' +
      '<div class="chips"><span class="badge ready">' + n.ready + " מוכנים</span><span class=\"badge in_progress\">" + n.in_progress + " בעבודה</span><span class=\"badge planned\">" + n.planned + " מתוכננים</span>" + (hidden ? '<span class="badge hidden">' + hidden + " מוסתרים</span>" : "") + "</div></div>";
  }

  /* ── Analytics ──────────────────────────────────────────────────────── */
  function viewAnalytics(v) {
    var s = state.stats, c = state.catalog;
    var byPage = {}; (s.topics || []).forEach(function (t) { byPage[t.page] = t; });
    var tot = (s.topics || []).reduce(function (a, t) { a.ok += t.ok; a.bad += t.bad; return a; }, { ok: 0, bad: 0 });
    var chs = (s.chapters || []).filter(function (x) { return x.ok + x.bad >= 5; }).sort(function (a, b) { return a.ok / (a.ok + a.bad) - b.ok / (b.ok + b.bad); });
    var tps = (s.topics || []).filter(function (x) { return x.attempts >= 5; }).sort(function (a, b) { return a.ok / a.attempts - b.ok / b.attempts; });
    var html = head(v, periodTools());
    html += '<div class="grid g3">' +
      '<section class="panel kpi"><div class="kpi-l">' + UI.target + '<span>הצלחה כללית</span></div><div class="kpi-v">' + (pct(tot.ok, tot.ok + tot.bad) == null ? "—" : pct(tot.ok, tot.ok + tot.bad) + "%") + '</div><div class="kpi-f"><span class="kpi-s">' + fmt(tot.ok) + " נכונות · " + fmt(tot.bad) + " שגויות</span></div></section>" +
      '<section class="panel kpi"><div class="kpi-l">' + UI.info + '<span>הנושא הקשה ביותר</span></div><div class="kpi-v" style="font-size:1.35rem;line-height:1.25">' + (tps[0] ? esc(topicByPage(tps[0].page).name) : "—") + '</div><div class="kpi-f"><span class="kpi-s">' + (tps[0] ? pct(tps[0].ok, tps[0].attempts) + "% הצלחה" : "עוד אין מספיק נתונים") + "</span></div></section>" +
      '<section class="panel kpi"><div class="kpi-l">' + UI.info + '<span>הפרק הקשה ביותר</span></div><div class="kpi-v" style="font-size:1.35rem;line-height:1.25">' + (chs[0] ? esc(chs[0].chapter || "—") : "—") + '</div><div class="kpi-f"><span class="kpi-s">' + (chs[0] ? esc(topicByPage(chs[0].page).name) + " · " + pct(chs[0].ok, chs[0].ok + chs[0].bad) + "% הצלחה" : "עוד אין מספיק נתונים") + "</span></div></section>" +
      "</div>";

    html += '<section class="panel mt"><div class="toolbar">' +
      '<label class="search">' + UI.search + '<input class="inp" type="search" placeholder="חיפוש נושא" value="' + esc(state.q) + '" aria-label="חיפוש נושא"></label>' +
      '<div class="seg" role="group" aria-label="מיון">' + [["hard", "הכי קשה"], ["busy", "הכי מתורגל"], ["order", "לפי התוכן"]].map(function (o) {
        return '<button type="button" data-sort="' + o[0] + '" aria-pressed="' + (state.sort === o[0]) + '">' + o[1] + "</button>";
      }).join("") + "</div></div>" +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>נושא</th><th class="n">תשובות</th><th class="n">✓ נכון</th><th class="n">✗ שגוי</th><th>הצלחה</th><th>רמה</th><th class="n">נפתרו</th><th class="n">תלמידים</th></tr></thead><tbody id="an-body"></tbody></table></div>' +
      '<p class="note" style="margin-top:12px">לחיצה על נושא פותחת את הפרקים שלו, ולחיצה על פרק פותחת את השלבים. "רמה" נקבעת לפי אחוז ההצלחה: מתחת ל-60% קשה, 60–80% בינוני, מעל 80% קל.</p></section>';
    $("#view").innerHTML = html;
    bindPeriod(route);

    function rowsHtml() {
      var q = state.q.trim();
      var topics = c.topics.slice().filter(function (t) { return !q || t.name.indexOf(q) >= 0; });
      var stat = function (t) { return byPage[t.page] || { attempts: 0, ok: 0, bad: 0, win: 0, devices: 0 }; };
      var catOrder = {}; c.categories.forEach(function (x, i) { catOrder[x.id] = i; });
      if (state.sort === "hard") topics.sort(function (a, b) {
        var A = stat(a), B = stat(b), ea = A.attempts < 5, eb = B.attempts < 5;
        if (ea !== eb) return ea ? 1 : -1;
        return (A.ok / (A.attempts || 1)) - (B.ok / (B.attempts || 1));
      });
      else if (state.sort === "busy") topics.sort(function (a, b) { return stat(b).attempts - stat(a).attempts; });
      else topics.sort(function (a, b) { return ((catOrder[a.category_id] || 0) - (catOrder[b.category_id] || 0)) || a.position - b.position; });
      var out = "", lastCat = null;
      topics.forEach(function (t) {
        if (state.sort === "order" && t.category_id !== lastCat) {
          lastCat = t.category_id;
          var cc = c.categories.find(function (x) { return x.id === t.category_id; });
          out += '<tr class="cat-row"><td colspan="8">' + esc(cc ? cc.name : "ללא קטגוריה") + "</td></tr>";
        }
        var st = stat(t), open = state.open[t.page];
        out += '<tr class="click' + (open ? " open" : "") + '" data-page="' + esc(t.page) + '"><td><div class="tname">' + UI.chev.replace("<svg", '<svg class="chev"') + topicIcon(t) + "<b>" + esc(t.name) + '</b></div></td><td class="n">' + fmt(st.attempts) + '</td><td class="n">' + fmt(st.ok) + '</td><td class="n">' + fmt(st.bad) + "</td><td>" + meter(pct(st.ok, st.attempts)) + "</td><td>" + level(st.ok, st.bad) + '</td><td class="n">' + fmt(st.win) + '</td><td class="n">' + fmt(st.devices) + "</td></tr>";
        if (open) {
          var list = (s.chapters || []).filter(function (x) { return x.page === t.page; }).sort(function (a, b) { return a.chapter.localeCompare(b.chapter, "he", { numeric: true }); });
          if (!list.length) out += '<tr class="sub"><td colspan="8" class="muted" style="padding-inline-start:52px">עוד אין תשובות בנושא הזה בתקופה שנבחרה</td></tr>';
          list.forEach(function (ch) {
            var key = t.page + "|" + ch.chapter, o2 = state.open[key], n = ch.ok + ch.bad;
            out += '<tr class="sub click' + (o2 ? " open" : "") + '" data-ch="' + esc(key) + '"><td><div class="tname" style="padding-inline-start:28px">' + UI.chev.replace("<svg", '<svg class="chev"') + "<span>" + esc(ch.chapter || "ללא פרק") + '</span></div></td><td class="n">' + fmt(n) + '</td><td class="n">' + fmt(ch.ok) + '</td><td class="n">' + fmt(ch.bad) + "</td><td>" + meter(pct(ch.ok, n)) + "</td><td>" + level(ch.ok, ch.bad) + '</td><td class="n">' + fmt(ch.win) + '</td><td class="n">' + fmt(ch.devices) + "</td></tr>";
            if (o2) {
              (s.steps || []).filter(function (x) { return x.page === t.page && x.chapter === ch.chapter; })
                .sort(function (a, b) { return a.ok / ((a.ok + a.bad) || 1) - b.ok / ((b.ok + b.bad) || 1); }).slice(0, 10)
                .forEach(function (stp) {
                  var m = stp.ok + stp.bad;
                  out += '<tr class="sub2"><td><div style="padding-inline-start:66px">' + esc(stp.step || "—") + '</div></td><td class="n">' + fmt(m) + '</td><td class="n">' + fmt(stp.ok) + '</td><td class="n">' + fmt(stp.bad) + "</td><td>" + meter(pct(stp.ok, m)) + "</td><td>" + level(stp.ok, stp.bad) + '</td><td></td><td></td></tr>';
                });
            }
          });
        }
      });
      return out || '<tr><td colspan="8"><div class="empty">' + UI.search + "<b>לא נמצא נושא</b></div></td></tr>";
    }
    function paint() { $("#an-body").innerHTML = rowsHtml(); }
    paint();
    $("#an-body").addEventListener("click", function (e) {
      var tr = e.target.closest("tr.click"); if (!tr) return;
      var key = tr.dataset.page || tr.dataset.ch;
      state.open[key] = !state.open[key]; paint();
    });
    $(".search input").addEventListener("input", function (e) { state.q = e.target.value; paint(); });
    $$("[data-sort]").forEach(function (b) { b.addEventListener("click", function () { state.sort = b.dataset.sort; $$("[data-sort]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); paint(); }); });
  }

  /* ── Students ───────────────────────────────────────────────────────── */
  function viewStudents(v) {
    var list = state.students || [], k = (state.stats && state.stats.kpi) || {};
    var returning = list.filter(function (x) { return x.days_active > 1; }).length;
    var mobile = list.filter(function (x) { return x.mobile; }).length;
    var html = head(v, periodTools());
    html += '<div class="grid g4">' +
      kpi(UI.students, "פעילים בתקופה", fmt(list.length), "", "מתוך " + fmt(k.all_time_devices || list.length) + " מאז ההתחלה", "") +
      kpi(UI.spark, "חדשים", fmt(k.new_devices || 0), "", "נכנסו לראשונה בתקופה", "") +
      kpi(UI.refresh, "חוזרים", fmt(returning), "", (pct(returning, list.length) || 0) + "% תרגלו ביותר מיום אחד", "") +
      kpi(UI.phone, "בטלפון", (pct(mobile, list.length) || 0) + "%", "", fmt(mobile) + " תלמידים", "") +
      "</div>";
    html += '<section class="panel mt"><div class="toolbar"><label class="search">' + UI.search + '<input class="inp" type="search" placeholder="חיפוש לפי מספר תלמיד" value="' + esc(state.studentQ) + '" aria-label="חיפוש תלמיד"></label><span class="note">כל תלמיד מזוהה במספר אקראי לפי המכשיר. כשתהיה הרשמה, יופיעו כאן שמות.</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>תלמיד</th><th>נראה לאחרונה</th><th class="n">ימי תרגול</th><th class="n">תשובות</th><th>הצלחה</th><th class="n">נפתרו</th><th>נושא אהוב</th><th>מכשיר</th></tr></thead><tbody id="st-body"></tbody></table></div></section>';
    $("#view").innerHTML = html;
    bindPeriod(route);
    function paint() {
      var q = state.studentQ.trim().toUpperCase().replace("#", "");
      var rows = list.filter(function (x) { return !q || studentName(x.device).indexOf(q) >= 0; }).slice(0, 300);
      $("#st-body").innerHTML = rows.length ? rows.map(function (x) {
        var n = x.ok + x.bad, tp = topicByPage(x.top_page || "");
        return "<tr><td><b>" + esc(studentName(x.device)) + "</b></td><td>" + ago(x.last_seen) + '</td><td class="n">' + fmt(x.days_active) + '</td><td class="n">' + fmt(n) + "</td><td>" + meter(pct(x.ok, n)) + '</td><td class="n">' + fmt(x.win) + "</td><td>" + (x.top_page ? esc(tp.name) : "—") + '</td><td style="color:var(--ink-3)">' + (x.mobile ? UI.phone : UI.desktop).replace("<svg", '<svg style="width:18px;height:18px"') + "</td></tr>";
      }).join("") : '<tr><td colspan="8"><div class="empty">' + UI.students + "<b>" + (list.length ? "לא נמצא תלמיד" : "עוד אין תלמידים בתקופה הזו") + "</b></div></td></tr>";
    }
    paint();
    $(".search input").addEventListener("input", function (e) { state.studentQ = e.target.value; paint(); });
  }

  /* ── Sales ──────────────────────────────────────────────────────────── */
  function viewSales(v) {
    var s = state.sales, k = (state.stats && state.stats.kpi) || {}, plans = (state.catalog.plans || []).slice().sort(function (a, b) { return a.position - b.position; });
    var subs = s.active + s.trial, arpu = s.active ? s.mrr / s.active : 0;
    var price = store("mp:calc-price") || (plans[0] ? +plans[0].price_ils : 39), conv = store("mp:calc-conv") || 5, base = k.active || 0;
    var html = head(v, '<button type="button" class="ibtn" data-act="refresh" aria-label="רענון">' + UI.refresh + "</button>");
    if (!subs && !s.recent.length) html += '<div class="demo-bar" style="background:var(--a-50);border-color:var(--a-200);color:var(--a-900)">' + UI.info + "<span><b>התשלומים עוד לא מחוברים.</b> כשנחבר ספק תשלום (למשל Stripe) המנויים, ההכנסות והביטולים יופיעו כאן אוטומטית. בינתיים אפשר להגדיר תוכניות מחיר ולהעריך הכנסה.</span></div>";
    html += '<div class="grid g4">' +
      kpi(UI.sales, "הכנסה חודשית (MRR)", money(s.mrr), "", "מנויים פעילים בלבד", "") +
      kpi(UI.students, "מנויים פעילים", fmt(s.active), "", fmt(s.trial) + " בתקופת ניסיון", "") +
      kpi(UI.target, "הכנסה למנוי", money(arpu), "", "ממוצע חודשי", "") +
      kpi(UI.info, "ביטולים", fmt(s.canceled_30d), "", "ב-30 הימים האחרונים" + (s.past_due ? " · " + s.past_due + " בפיגור תשלום" : ""), "") +
      "</div>";
    html += '<div class="grid g21 mt"><section class="panel"><div class="panel-h"><h2>הכנסה חודשית לאורך השנה</h2><small>₪ לחודש</small></div><div class="chart" id="ch-mrr"></div></section>' +
      '<section class="panel"><div class="panel-h"><h2>משפך</h2><small>' + state.days + " ימים</small></div><div class=\"funnel\">" +
      funRow("מבקרים", k.all_time_devices || 0, k.all_time_devices || 0) + funRow("תלמידים פעילים", base, k.all_time_devices || 0) + funRow("מנויים", s.active, k.all_time_devices || 0) +
      '</div><p class="note" style="margin-top:14px">המרה מתלמיד פעיל למנוי: <b>' + (base ? ((s.active / base) * 100).toFixed(1) + "%" : "—") + "</b></p></section></div>";
    html += '<div class="grid g2 mt"><section class="panel"><div class="panel-h"><h2>תוכניות מחיר</h2><button type="button" class="abtn sm" data-act="add-plan">' + UI.plus + "תוכנית</button></div>" +
      '<div class="sortable" id="plans">' + (plans.length ? plans.map(planItem).join("") : '<div class="empty" style="padding:18px">' + UI.sales + "<b>עוד אין תוכניות</b>הוסיפו תוכנית, למשל: חודשי · ₪39</div>") + "</div></section>" +
      '<section class="panel"><div class="panel-h"><h2>מחשבון הכנסה</h2><small>הערכה בלבד</small></div><div class="calc">' +
      '<label class="field"><span>מחיר לחודש (₪)</span><input type="number" min="0" step="1" id="c-price" value="' + price + '"></label>' +
      '<label class="field"><span>אחוז שירשמו</span><input type="number" min="0" max="100" step="0.5" id="c-conv" value="' + conv + '"></label>' +
      '<label class="field"><span>תלמידים פעילים</span><input type="number" min="0" step="1" id="c-base" value="' + base + '"></label></div>' +
      '<div class="grid g2"><div><div class="muted" style="font-size:.84rem">הכנסה חודשית משוערת</div><div class="big-num" id="c-m"></div></div><div><div class="muted" style="font-size:.84rem">הכנסה שנתית משוערת</div><div class="big-num" id="c-y"></div></div></div>' +
      '<p class="note" style="margin-top:10px" id="c-n"></p></section></div>';
    html += '<section class="panel mt"><div class="panel-h"><h2>מנויים אחרונים</h2></div>' + (s.recent.length ?
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>לקוח</th><th>תוכנית</th><th>סטטוס</th><th class="n">סכום</th><th>התחיל</th></tr></thead><tbody>' + s.recent.map(function (r) {
        return "<tr><td>" + esc(r.customer) + "</td><td>" + esc(r.plan || "—") + '</td><td><span class="badge ' + (r.status === "active" ? "ready" : r.status === "trial" ? "in_progress" : "planned") + '">' + ({ active: "פעיל", trial: "ניסיון", past_due: "בפיגור", canceled: "בוטל" }[r.status] || r.status) + '</span></td><td class="n">' + money(r.amount_ils) + (r.period === "year" ? " לשנה" : " לחודש") + "</td><td>" + ago(r.started_at) + "</td></tr>";
      }).join("") + "</tbody></table></div>" : emptyMini("עוד אין מנויים")) + "</section>";
    $("#view").innerHTML = html;
    var r = $("[data-act='refresh']"); r.addEventListener("click", function () { r.classList.add("spin"); state.sales = null; state.stats = null; route(); });
    barChart($("#ch-mrr"), s.monthly.map(function (m) {
      var d = new Date(m.month + "-01");
      return { label: d.toLocaleDateString("he-IL", { month: "short" }), parts: [{ v: +m.mrr, color: "var(--a-500)" }], tip: "<b>" + d.toLocaleDateString("he-IL", { month: "long", year: "numeric" }) + "</b>" + money(m.mrr) + " · " + fmt(m.subscribers) + " מנויים" };
    }), { label: "הכנסה חודשית", height: 220 });
    function calc() {
      var p = +$("#c-price").value || 0, cv = +$("#c-conv").value || 0, b = +$("#c-base").value || 0;
      store("mp:calc-price", p); store("mp:calc-conv", cv);
      var subsN = Math.round(b * cv / 100);
      $("#c-m").textContent = money(subsN * p);
      $("#c-y").textContent = money(subsN * p * 12);
      $("#c-n").textContent = subsN + " מנויים × " + money(p) + " לחודש. לא כולל עמלות סליקה ומע״מ.";
    }
    ["#c-price", "#c-conv", "#c-base"].forEach(function (id) { $(id).addEventListener("input", calc); });
    calc();
    $("[data-act='add-plan']").addEventListener("click", function () { editPlan(null); });
    $("#plans").addEventListener("click", function (e) {
      var b = e.target.closest("[data-edit]"); if (b) editPlan(plans.find(function (p) { return p.id === b.dataset.edit; }));
      var sw = e.target.closest(".switch"); if (sw) toggle("plan", plans.find(function (p) { return p.id === sw.dataset.id; }), "active", sw);
    });
    sortable($("#plans"), ".item", function (ids) { saveOrder("plan", ids); });
  }
  function funRow(label, n, max) {
    return '<div class="fun-row"><span>' + label + '</span><div class="bar"><i style="width:' + (max ? Math.max(2, (n / max) * 100) : 0) + '%"></i></div><b>' + fmt(n) + "</b></div>";
  }
  function planItem(p) {
    return '<div class="item' + (p.active ? "" : " is-hidden") + '" data-id="' + p.id + '">' + handle() +
      '<div class="item-main"><div class="item-t"><b>' + esc(p.name) + "</b><small>" + money(p.price_ils) + (p.period === "year" ? " לשנה" : " לחודש") + (p.active ? "" : " · כבויה") + "</small></div></div>" +
      '<div class="item-act"><button type="button" class="switch" role="switch" aria-checked="' + !!p.active + '" aria-label="תוכנית פעילה" data-id="' + p.id + '"></button><button type="button" class="ibtn" data-edit="' + p.id + '" aria-label="עריכה">' + UI.edit + "</button></div></div>";
  }
  function editPlan(p) {
    var it = p ? Object.assign({}, p) : { name: "", price_ils: 39, period: "month", active: true };
    sheet({
      title: p ? "עריכת תוכנית" : "תוכנית חדשה",
      body: '<label class="field"><span>שם התוכנית</span><input type="text" id="f-name" maxlength="60" value="' + esc(it.name) + '" placeholder="למשל: חודשי"></label>' +
        '<label class="field"><span>מחיר (₪)</span><input type="number" id="f-price" min="0" step="1" value="' + esc(it.price_ils) + '"></label>' +
        '<div class="field"><span>חיוב</span><div class="seg" id="f-period">' + [["month", "חודשי"], ["year", "שנתי"]].map(function (o) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (it.period === o[0]) + '">' + o[1] + "</button>"; }).join("") + "</div></div>",
      bind: function (root) { segPick($("#f-period", root), function (v) { it.period = v; }); },
      onSave: function (root) {
        it.name = $("#f-name", root).value.trim(); it.price_ils = +$("#f-price", root).value || 0;
        if (!it.name) { $("#f-name", root).focus(); return false; }
        return saveItem("plan", it);
      },
      onDelete: p ? function () { return removeItem("plan", p); } : null
    });
  }

  /* ── Content (grades, categories, topics) ───────────────────────────── */
  function handle() { return '<button type="button" class="handle" aria-label="גרירה לשינוי סדר (או חיצים במקלדת)">' + UI.grip + "</button>"; }
  function viewContent(v) {
    var c = state.catalog;
    var grades = c.grades.slice().sort(by("position")), cats = c.categories.slice().sort(by("position"));
    var html = head(v, '<a class="abtn" href="index.html" target="_blank" rel="noopener">' + UI.external + "צפייה בדף הבית</a>");
    html += '<div class="grid g21" style="align-items:start">' +
      '<section class="panel"><div class="panel-h"><h2>קטגוריות ונושאים</h2><button type="button" class="abtn sm" data-act="add-cat">' + UI.plus + "קטגוריה</button></div>" +
      '<div class="sortable" id="cats">' + cats.map(function (k) { return catBlock(k, c); }).join("") + orphanBlock(c) + "</div></section>" +
      '<div class="grid" style="gap:16px"><section class="panel grade-list"><div class="panel-h"><h2>כיתות</h2><button type="button" class="abtn sm" data-act="add-grade">' + UI.plus + "כיתה</button></div>" +
      '<div class="sortable" id="grades">' + grades.map(gradeItem).join("") + "</div>" +
      '<p class="note" style="margin-top:12px">הסדר כאן הוא סדר כפתורי הסינון בדף הבית.</p></section>' +
      '<section class="panel"><div class="panel-h"><h2>איך זה עובד</h2></div><p class="note">גוררים בעזרת הידית ' + UI.grip.replace("<svg", '<svg style="width:15px;height:15px;vertical-align:-3px"') + ' כדי לשנות סדר. הסדר נשמר מיד ומופיע בדף הבית.<br><br>נושא בלי עמוד מופיע לתלמידים כ"בקרוב". נושא מוסתר לא מופיע בכלל.<br><br>הפרקים שבתוך כל נושא כתובים בקוד של הנושא עצמו, ולכן הם לא נערכים מכאן.</p></section></div>' +
      "</div>";
    $("#view").innerHTML = html;

    $("[data-act='add-cat']").addEventListener("click", function () { editCategory(null); });
    $("[data-act='add-grade']").addEventListener("click", function () { editGrade(null); });
    $("#view").addEventListener("click", function (e) {
      var b = e.target.closest("[data-edit]");
      if (b) {
        var kind = b.dataset.kind, id = b.dataset.edit;
        if (kind === "topic") editTopic(c.topics.find(function (t) { return t.id === id; }));
        if (kind === "category") editCategory(c.categories.find(function (t) { return t.id === id; }));
        if (kind === "grade") editGrade(c.grades.find(function (t) { return t.id === id; }));
      }
      var add = e.target.closest("[data-add-topic]");
      if (add) editTopic(null, add.dataset.addTopic || null);
      var sw = e.target.closest(".switch[data-kind]");
      if (sw) {
        var list = { topic: c.topics, category: c.categories, grade: c.grades }[sw.dataset.kind];
        toggle(sw.dataset.kind, list.find(function (x) { return x.id === sw.dataset.id; }), "visible", sw);
      }
    });
    sortable($("#grades"), ".item", function (ids) { saveOrder("grade", ids); });
    sortable($("#cats"), ".cat:not(.orphan)", function (ids) { saveOrder("category", ids); });
    $$(".cat .sortable").forEach(function (list) { sortable(list, ".item", function (ids) { saveOrder("topic", ids); }); });
  }
  function by(k) { return function (a, b) { return (a[k] - b[k]) || String(a.created_at || "").localeCompare(String(b.created_at || "")); }; }
  function gradeName(c, id) { var g = c.grades.find(function (x) { return x.id === id; }); return g ? g.name.replace("כיתה ", "") : ""; }
  function topicItem(t, c) {
    var gr = (t.grade_ids || []).map(function (id) { return gradeName(c, id); }).filter(Boolean).join("·");
    return '<div class="item' + (t.visible ? "" : " is-hidden") + '" data-id="' + t.id + '">' + handle() +
      '<div class="item-main">' + topicIcon(t) + '<div class="item-t"><b>' + esc(t.name) + "</b><small>" +
      (gr ? "<span>" + esc(gr) + "</span>" : "") + '<span class="badge ' + t.status + '">' + STATUS[t.status] + "</span>" +
      (t.page ? "" : '<span class="badge planned">בלי עמוד</span>') + (t.visible ? "" : '<span class="badge hidden">מוסתר</span>') + "</small></div></div>" +
      '<div class="item-act"><button type="button" class="switch" role="switch" data-kind="topic" data-id="' + t.id + '" aria-checked="' + !!t.visible + '" aria-label="מוצג לתלמידים"></button>' +
      '<button type="button" class="ibtn" data-kind="topic" data-edit="' + t.id + '" aria-label="עריכה">' + UI.edit + "</button></div></div>";
  }
  function catBlock(k, c) {
    var topics = c.topics.filter(function (t) { return t.category_id === k.id; }).sort(by("position"));
    return '<div class="cat' + (k.visible ? "" : " is-hidden") + '" data-id="' + k.id + '" data-topic="' + esc(k.color) + '">' +
      '<div class="item">' + handle() + '<div class="item-main"><span class="cat-dot"></span><div class="item-t"><b>' + esc(k.name) + "</b><small>" + topics.length + " נושאים" + (k.visible ? "" : " · מוסתרת") + "</small></div></div>" +
      '<div class="item-act"><button type="button" class="switch" role="switch" data-kind="category" data-id="' + k.id + '" aria-checked="' + !!k.visible + '" aria-label="מוצגת לתלמידים"></button>' +
      '<button type="button" class="ibtn" data-kind="category" data-edit="' + k.id + '" aria-label="עריכה">' + UI.edit + "</button></div></div>" +
      '<div class="sortable">' + topics.map(function (t) { return topicItem(t, c); }).join("") + "</div>" +
      '<button type="button" class="add-row" data-add-topic="' + k.id + '">' + UI.plus + "נושא חדש ב" + esc(k.name) + "</button></div>";
  }
  function orphanBlock(c) {
    var ids = c.categories.map(function (x) { return x.id; });
    var topics = c.topics.filter(function (t) { return ids.indexOf(t.category_id) < 0; }).sort(by("position"));
    if (!topics.length) return "";
    return '<div class="cat orphan"><div class="item"><div class="item-main"><div class="item-t"><b>ללא קטגוריה</b><small>' + topics.length + " נושאים · לא מוצגים בדף הבית עד שמשייכים לקטגוריה</small></div></div></div>" +
      '<div class="sortable">' + topics.map(function (t) { return topicItem(t, c); }).join("") + "</div></div>";
  }
  function gradeItem(g) {
    var n = state.catalog.topics.filter(function (t) { return (t.grade_ids || []).indexOf(g.id) >= 0; }).length;
    return '<div class="item' + (g.visible ? "" : " is-hidden") + '" data-id="' + g.id + '">' + handle() +
      '<div class="item-main"><div class="item-t"><b>' + esc(g.name) + "</b><small>" + n + " נושאים</small></div></div>" +
      '<div class="item-act"><button type="button" class="switch" role="switch" data-kind="grade" data-id="' + g.id + '" aria-checked="' + !!g.visible + '" aria-label="מוצגת לתלמידים"></button>' +
      '<button type="button" class="ibtn" data-kind="grade" data-edit="' + g.id + '" aria-label="עריכה">' + UI.edit + "</button></div></div>";
  }

  function editGrade(g) {
    var it = g ? Object.assign({}, g) : { name: "", visible: true };
    sheet({
      title: g ? "עריכת כיתה" : "כיתה חדשה",
      body: '<label class="field"><span>שם הכיתה</span><input type="text" id="f-name" maxlength="40" value="' + esc(it.name) + '" placeholder="למשל: כיתה י׳"></label>',
      onSave: function (root) { it.name = $("#f-name", root).value.trim(); if (!it.name) return false; return saveItem("grade", it); },
      onDelete: g ? function () { return removeItem("grade", g, "הכיתה תוסר גם מכל הנושאים שמשויכים אליה."); } : null
    });
  }
  function editCategory(k) {
    var it = k ? Object.assign({}, k) : { name: "", color: "teal", visible: true };
    sheet({
      title: k ? "עריכת קטגוריה" : "קטגוריה חדשה",
      body: '<label class="field"><span>שם הקטגוריה</span><input type="text" id="f-name" maxlength="60" value="' + esc(it.name) + '" placeholder="למשל: סטטיסטיקה"></label>' +
        '<div class="field"><span>צבע</span>' + swatches(it.color) + "</div>",
      bind: function (root) { pickSwatch(root, function (v) { it.color = v; }); },
      onSave: function (root) { it.name = $("#f-name", root).value.trim(); if (!it.name) return false; return saveItem("category", it); },
      onDelete: k ? function () { return removeItem("category", k, "הנושאים שבה לא יימחקו. הם יעברו ל\"ללא קטגוריה\"."); } : null
    });
  }
  function editTopic(t, catId) {
    var c = state.catalog;
    var it = t ? JSON.parse(JSON.stringify(t)) : { name: "", page: "", grade_ids: [], icon: "book", color: "teal", status: "planned", visible: true, category_id: catId || (c.categories[0] && c.categories[0].id) };
    var used = c.topics.filter(function (x) { return x.page && (!t || x.id !== t.id); }).map(function (x) { return x.page; });
    sheet({
      title: t ? "עריכת נושא" : "נושא חדש",
      body: '<label class="field"><span>שם הנושא (כפי שהתלמיד רואה)</span><input type="text" id="f-name" maxlength="80" value="' + esc(it.name) + '"></label>' +
        '<label class="field"><span>קטגוריה</span><select id="f-cat">' + c.categories.slice().sort(by("position")).map(function (k) { return '<option value="' + k.id + '"' + (k.id === it.category_id ? " selected" : "") + ">" + esc(k.name) + "</option>"; }).join("") + "</select></label>" +
        '<div class="field"><span>כיתות</span><div class="chips" id="f-grades">' + c.grades.slice().sort(by("position")).map(function (g) { return '<button type="button" class="chip-t" data-id="' + g.id + '" aria-pressed="' + ((it.grade_ids || []).indexOf(g.id) >= 0) + '">' + esc(g.name) + "</button>"; }).join("") + "</div></div>" +
        '<label class="field"><span>עמוד התרגול</span><select id="f-page"><option value="">בלי עמוד (יוצג כ"בקרוב")</option>' + PAGES.map(function (p) { return '<option value="' + p + '"' + (p === it.page ? " selected" : "") + (used.indexOf(p) >= 0 ? " disabled" : "") + ">" + p + (used.indexOf(p) >= 0 ? " (בשימוש)" : "") + "</option>"; }).join("") + "</select><small>עמוד חדש? מוסיפים את הקובץ לפרויקט ואז בוחרים אותו כאן.</small></label>" +
        '<div class="field"><span>סטטוס</span><div class="seg" id="f-status">' + Object.keys(STATUS).map(function (s) { return '<button type="button" data-v="' + s + '" aria-pressed="' + (it.status === s) + '">' + STATUS[s] + "</button>"; }).join("") + "</div></div>" +
        '<div class="field"><span>צבע</span>' + swatches(it.color) + "</div>" +
        '<div class="field"><span>סמל</span><div class="icon-pick" id="f-icon" data-topic="' + esc(it.color) + '">' + Object.keys(ICONS).map(function (k) { return '<button type="button" data-v="' + k + '" aria-pressed="' + (it.icon === k) + '" title="' + esc(ICONS[k].label) + '">' + ICON(k) + "</button>"; }).join("") + "</div></div>",
      bind: function (root) {
        $("#f-grades", root).addEventListener("click", function (e) { var b = e.target.closest(".chip-t"); if (b) b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); });
        segPick($("#f-status", root), function (v) { it.status = v; });
        pickSwatch(root, function (v) { it.color = v; $("#f-icon", root).setAttribute("data-topic", v); });
        $("#f-icon", root).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; $$("#f-icon button", root).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); it.icon = b.dataset.v; });
      },
      onSave: function (root) {
        it.name = $("#f-name", root).value.trim(); if (!it.name) { $("#f-name", root).focus(); return false; }
        it.category_id = $("#f-cat", root).value; it.page = $("#f-page", root).value;
        it.grade_ids = $$("#f-grades .chip-t", root).filter(function (b) { return b.getAttribute("aria-pressed") === "true"; }).map(function (b) { return b.dataset.id; });
        return saveItem("topic", it);
      },
      onDelete: t ? function () { return removeItem("topic", t, "רק הכרטיס בדף הבית יוסר. קובץ התרגול עצמו נשאר בפרויקט."); } : null
    });
  }
  function swatches(cur) { return '<div class="swatches">' + COLORS.map(function (k) { return '<button type="button" data-topic="' + k + '" data-v="' + k + '" aria-pressed="' + (k === cur) + '" aria-label="' + k + '"></button>'; }).join("") + "</div>"; }
  function pickSwatch(root, cb) { $(".swatches", root).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; $$(".swatches button", root).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); cb(b.dataset.v); }); }
  function segPick(el, cb) { el.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; $$("button", el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); cb(b.dataset.v); }); }

  function listKey(kind) { return { grade: "grades", category: "categories", topic: "topics", plan: "plans" }[kind]; }
  function saveItem(kind, it) {
    var payload = Object.assign({}, it);
    return call("admin_save", { kind: kind, item: payload }).then(function (saved) {
      var arr = state.catalog[listKey(kind)], i = arr.findIndex(function (x) { return x.id === saved.id; });
      if (i >= 0) arr[i] = saved; else arr.push(saved);
      toast("נשמר");
      route();
      return true;
    }).catch(function (e) { toast("השמירה נכשלה: " + e.message, true); return false; });
  }
  function removeItem(kind, it, warn) {
    if (!confirm("למחוק את \"" + it.name + "\"?" + (warn ? "\n" + warn : ""))) return Promise.resolve(false);
    return call("admin_delete", { kind: kind, rid: it.id }).then(function () {
      state.catalog = null; toast("נמחק"); route(); return true;
    }).catch(function (e) { toast("המחיקה נכשלה: " + e.message, true); return false; });
  }
  function toggle(kind, it, field, sw) {
    var next = !it[field];
    sw.setAttribute("aria-checked", next);
    var patch = { id: it.id }; patch[field] = next;
    call("admin_save", { kind: kind, item: patch }).then(function (saved) {
      Object.assign(it, saved);
      toast(field === "active" ? (next ? "התוכנית פעילה" : "התוכנית כבויה") : (next ? "מוצג לתלמידים" : "הוסתר מהתלמידים"));
      route();
    }).catch(function (e) { sw.setAttribute("aria-checked", !next); toast("לא נשמר: " + e.message, true); });
  }
  function saveOrder(kind, ids) {
    var arr = state.catalog[listKey(kind)];
    ids.forEach(function (id, i) { var o = arr.find(function (x) { return x.id === id; }); if (o) o.position = i; });
    call("admin_reorder", { kind: kind, ids: ids }).then(function () { toast("הסדר נשמר"); })
      .catch(function (e) { toast("הסדר לא נשמר: " + e.message, true); state.catalog = null; route(); });
  }

  /* ── Drag to reorder (finger, mouse, keyboard) ──────────────────────── */
  function sortable(list, itemSel, onDrop) {
    if (!list) return;
    function items() { return Array.prototype.filter.call(list.children, function (el) { return el.matches(itemSel); }); }
    list.addEventListener("pointerdown", function (e) {
      var h = e.target.closest(".handle"); if (!h || e.button > 0) return;
      var item = h.closest(itemSel); if (!item || item.parentElement !== list) return;
      e.preventDefault();
      var all = items(), from = all.indexOf(item);
      var rects = all.map(function (el) { return el.getBoundingClientRect(); });
      var gap = all.length > 1 ? rects[1].top - rects[0].bottom : 8;
      var step = rects[from].height + gap, startY = e.clientY, startScroll = scrollY, to = from, lastY = e.clientY;
      var raf = null;
      item.classList.add("dragging");
      all.forEach(function (el) { if (el !== item) el.classList.add("shift"); });
      if (navigator.vibrate) navigator.vibrate(8);
      h.setPointerCapture(e.pointerId);
      function layout() {
        var dy = lastY - startY + (scrollY - startScroll);
        item.style.transform = "translateY(" + dy + "px)";
        var center = rects[from].top + rects[from].height / 2 + dy;
        to = 0;
        all.forEach(function (el, i) { if (i !== from && rects[i].top + rects[i].height / 2 < center) to++; });
        all.forEach(function (el, i) {
          if (el === item) return;
          var shift = (i > from && i <= to) ? -step : (i < from && i >= to) ? step : 0;
          el.style.transform = shift ? "translateY(" + shift + "px)" : "";
        });
      }
      function autoscroll() {
        var edge = 80, v = 0;
        if (lastY < edge) v = -Math.ceil((edge - lastY) / 6);
        else if (lastY > innerHeight - edge) v = Math.ceil((lastY - (innerHeight - edge)) / 6);
        if (v) { scrollBy(0, v); layout(); }
        raf = requestAnimationFrame(autoscroll);
      }
      raf = requestAnimationFrame(autoscroll);
      function move(ev) { lastY = ev.clientY; layout(); }
      function end() {
        cancelAnimationFrame(raf);
        h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", end); h.removeEventListener("pointercancel", end);
        var before = all.map(function (el) { return el.getBoundingClientRect().top; });
        all.forEach(function (el) { el.classList.remove("shift", "dragging"); el.style.transform = ""; });
        if (to !== from) {
          var ref = all.filter(function (el) { return el !== item; });
          var anchor = ref[to] || null;
          if (anchor) list.insertBefore(item, anchor);
          else { var lastItem = ref[ref.length - 1]; list.insertBefore(item, lastItem.nextSibling); }
        }
        // glide everything from where it was to where it is now
        if (!reduceMotion) all.forEach(function (el, i) {
          var d = before[i] - el.getBoundingClientRect().top;
          if (!d) return;
          el.style.transform = "translateY(" + d + "px)";
          el.getBoundingClientRect();
          el.classList.add("shift"); el.style.transform = "";
          setTimeout(function () { el.classList.remove("shift"); }, 260);
        });
        if (to !== from) onDrop(items().map(function (el) { return el.dataset.id; }));
      }
      h.addEventListener("pointermove", move); h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end);
    });
    list.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      var h = e.target.closest(".handle"); if (!h) return;
      var item = h.closest(itemSel); if (!item || item.parentElement !== list) return;
      e.preventDefault();
      var all = items(), i = all.indexOf(item), j = e.key === "ArrowUp" ? i - 1 : i + 1;
      if (j < 0 || j >= all.length) return;
      if (j < i) list.insertBefore(item, all[j]); else list.insertBefore(item, all[j].nextSibling);
      h.focus();
      onDrop(items().map(function (el) { return el.dataset.id; }));
    });
  }

  /* ── Sheet (dialog) ─────────────────────────────────────────────────── */
  function sheet(o) {
    var scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '">' +
      '<div class="sheet-h"><h3>' + esc(o.title) + '</h3><button type="button" class="ibtn" data-x aria-label="סגירה">' + UI.x + "</button></div>" +
      '<div class="sheet-b">' + o.body + "</div>" +
      '<div class="sheet-f">' + (o.onDelete ? '<button type="button" class="abtn danger" data-del>' + UI.trash + "מחיקה</button>" : "") + '<span class="grow"></span>' +
      '<button type="button" class="abtn ghost" data-x>ביטול</button><button type="button" class="abtn pri" data-save>' + UI.check + "שמירה</button></div></div>";
    document.body.appendChild(scrim);
    var last = document.activeElement;
    requestAnimationFrame(function () { scrim.classList.add("on"); var f = $("input, select", scrim); if (f && innerWidth > 980) f.focus(); });
    function close() {
      scrim.classList.remove("on"); document.removeEventListener("keydown", key);
      setTimeout(function () { scrim.remove(); }, 220);
      if (last && last.focus) last.focus();
    }
    function key(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", key);
    scrim.addEventListener("click", function (e) { if (e.target === scrim || e.target.closest("[data-x]")) close(); });
    if (o.bind) o.bind(scrim);
    var saveBtn = $("[data-save]", scrim);
    saveBtn.addEventListener("click", function () {
      var r = o.onSave(scrim);
      if (r === false) return;
      saveBtn.disabled = true;
      Promise.resolve(r).then(function (ok) { saveBtn.disabled = false; if (ok !== false) close(); });
    });
    $$("input", scrim).forEach(function (i) { i.addEventListener("keydown", function (e) { if (e.key === "Enter") saveBtn.click(); }); });
    var del = $("[data-del]", scrim);
    if (del) del.addEventListener("click", function () { o.onDelete().then(function (ok) { if (ok) close(); }); });
  }

  /* ── Settings ───────────────────────────────────────────────────────── */
  function viewSettings(v) {
    var host = ""; try { host = new URL(D.url).host; } catch (e) {}
    var html = head(v);
    html += '<div class="grid g2" style="align-items:start">' +
      '<section class="panel"><div class="panel-h"><h2>קוד כניסה</h2>' + UI.lock.replace("<svg", '<svg style="width:18px;height:18px;color:var(--ink-3)"') + "</div>" +
      '<label class="field"><span>הקוד הנוכחי</span><input type="password" inputmode="numeric" maxlength="8" id="p-old" autocomplete="current-password"></label>' +
      '<label class="field"><span>קוד חדש (4–8 ספרות)</span><input type="password" inputmode="numeric" maxlength="8" id="p-new" autocomplete="new-password"></label>' +
      '<label class="field"><span>שוב את הקוד החדש</span><input type="password" inputmode="numeric" maxlength="8" id="p-new2" autocomplete="new-password"></label>' +
      '<button type="button" class="abtn pri" id="p-save"' + (DEMO ? " disabled" : "") + ">החלפת קוד</button>" +
      '<p class="note" style="margin-top:12px">אחרי 5 ניסיונות שגויים הכניסה ננעלת ל-15 דקות. החלפת הקוד מנתקת את שאר המכשירים.' + (DEMO ? " (זמין אחרי חיבור המסד)" : "") + "</p></section>" +
      '<section class="panel"><div class="panel-h"><h2>חיבור למסד הנתונים</h2><span class="status-pill' + (DEMO ? " demo" : "") + '" style="padding:4px 10px"><i></i>' + (DEMO ? "לא מחובר" : "מחובר") + "</span></div>" +
      (DEMO ? '<p class="note">הניהול רץ עכשיו עם נתוני דוגמה. כדי לחבר את המסד האמיתי (Supabase של הפרויקט):</p><ol class="note" style="padding-inline-start:18px;margin:8px 0 0"><li>בחשבון Supabase של הפרויקט: Project Settings ← API.</li><li>מעתיקים את <b>Project URL</b> ואת <b>Publishable key</b> (שניהם ציבוריים, לא סיסמאות).</li><li>שולחים לי אותם, ואני מחבר ומעלה את טבלאות הניהול.</li></ol>'
        : '<div class="stat-line"><span>שרת</span><b class="ltr">' + esc(host) + "</b></div><p class=\"note\">כל הנתונים נשמרים במסד של הפרויקט. התלמידים יכולים רק לקרוא את סדר התוכן ולשלוח סטטיסטיקה אנונימית של תשובות.</p>") +
      "</section>" +
      '<section class="panel"><div class="panel-h"><h2>ייצוא נתונים</h2>' + UI.download.replace("<svg", '<svg style="width:18px;height:18px;color:var(--ink-3)"') + "</div>" +
      '<p class="note">קובץ CSV של כל התשובות בתקופה, לפתיחה באקסל או ב-Google Sheets.</p><div class="toolbar" style="margin:12px 0 0">' + periodSeg() + '<button type="button" class="abtn" id="x-csv"' + (DEMO ? " disabled" : "") + ">" + UI.download + "הורדה</button></div></section>" +
      '<section class="panel"><div class="panel-h"><h2>פרטיות</h2></div><p class="note">התלמידים לא נרשמים. כל מכשיר מקבל מספר אקראי, ונשמרים רק: העמוד, הפרק, השלב, אם התשובה נכונה, וסוג המכשיר. לא נשמרים שם, מייל, טלפון או מיקום.</p></section>' +
      "</div>";
    $("#view").innerHTML = html;
    $$("[data-days]").forEach(function (b) { b.addEventListener("click", function () { state.days = +b.dataset.days; store("mp:adm-days", state.days); $$("[data-days]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); }); });
    $("#p-save").addEventListener("click", function () {
      var o = $("#p-old").value, n = $("#p-new").value, n2 = $("#p-new2").value;
      if (!/^[0-9]{4,8}$/.test(n)) return toast("הקוד החדש צריך 4 עד 8 ספרות", true);
      if (n !== n2) return toast("הקודים החדשים לא זהים", true);
      call("admin_change_pin", { old_pin: o, new_pin: n }).then(function (r) {
        if (r && r.ok) { toast("הקוד הוחלף"); $$("#view input[type=password]").forEach(function (i) { i.value = ""; }); }
        else toast(r && r.error === "wrong" ? "הקוד הנוכחי שגוי" : "לא הצלחנו להחליף", true);
      }).catch(function (e) { toast(e.message, true); });
    });
    $("#x-csv").addEventListener("click", function () {
      call("admin_export", { days: state.days }).then(function (rows) {
        var cols = ["at", "device", "page", "chapter", "step", "kind", "mobile"];
        var csv = "﻿" + cols.join(",") + "\n" + rows.map(function (r) { return cols.map(function (k) { return '"' + String(r[k] == null ? "" : r[k]).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        a.download = "mathproject-answers-" + state.days + "d.csv"; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        toast(fmt(rows.length) + " שורות יוצאו");
      }).catch(function (e) { toast(e.message, true); });
    });
  }
  function periodSeg() { return '<div class="seg" role="group" aria-label="תקופה">' + [7, 30, 90].map(function (d) { return '<button type="button" data-days="' + d + '" aria-pressed="' + (state.days === d) + '">' + d + " ימים</button>"; }).join("") + "</div>"; }

  /* ── Router ─────────────────────────────────────────────────────────── */
  var NEEDS = { dashboard: ["catalog", "stats"], content: ["catalog"], analytics: ["catalog", "stats"], students: ["catalog", "stats", "students"], sales: ["catalog", "stats", "sales"], settings: [] };
  var RENDER = { dashboard: viewDashboard, content: viewContent, analytics: viewAnalytics, students: viewStudents, sales: viewSales, settings: viewSettings };
  function route() {
    if (!state.tok) return;
    var id = (location.hash.match(/^#\/(\w+)/) || [])[1];
    if (!RENDER[id]) id = "dashboard";
    state.view = id;
    observers.forEach(function (o) { o.disconnect(); }); observers = []; tip(null);
    var v = VIEWS.find(function (x) { return x.id === id; });
    $$(".nav a, .bnav a").forEach(function (a) { if (a.dataset.v === id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.title = v.label + " · ניהול מתמטיקה חט״ב";
    var view = $("#view"), fresh = view.cloneNode(false); view.parentNode.replaceChild(fresh, view);   // drop old listeners
    var needs = NEEDS[id].filter(function (k) { return !state[k]; });
    if (needs.length) loading(v);
    need(NEEDS[id]).then(function () {
      if (state.view !== id) return;
      RENDER[id](v);
      if (!reduceMotion && $("#view").animate) $("#view").animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "cubic-bezier(.23,1,.32,1)" });
    }).catch(function (e) { if (state.tok) failed(v, e); });
  }

  function start() {
    shell();
    window.addEventListener("hashchange", route);
    route();
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */
  var saved = store("mp:admin");
  if (saved && saved.tok && new Date(saved.exp) > new Date() && !!saved.demo === DEMO) { state.tok = saved.tok; start(); }
  else renderPin();
})();
