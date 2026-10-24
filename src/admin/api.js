/* Admin data layer.
   Connected  → Supabase functions (supabase/migrations), every call carries
                the PIN session token.
   Not yet    → PREVIEW mode: clearly-labelled sample data, kept in this
                browser only. */
import { mpData } from "@/lib/mp-data";

export const isPreview = () => !mpData.ready;

/* ── sample data (preview mode) ─────────────────────────────────────────── */
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DEFAULT_CATALOG = (() => {
  const g = [["g7", "כיתה ז׳"], ["g8", "כיתה ח׳"], ["g9", "כיתה ט׳"]];
  const c = [["c1", "אלגברה", "indigo"], ["c2", "גיאומטריה", "sky"], ["c3", "תחום מספרי", "teal"]];
  const t = [
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
    ["גופים", "solids3d.html", ["g7", "g8", "g9"], "cube", "teal", "c2"],
  ];
  const pos = {};
  return {
    grades: g.map(([id, name], i) => ({ id, name, position: i, visible: true })),
    categories: c.map(([id, name, color], i) => ({ id, name, color, position: i, visible: true })),
    topics: t.map(([name, page, grade_ids, icon, color, category_id], i) => {
      pos[category_id] = (pos[category_id] || 0) + 1;
      return { id: "t" + i, name, page, grade_ids, icon, color, category_id, status: i < 5 ? "ready" : "in_progress", position: pos[category_id] - 1, visible: true };
    }),
    plans: [],
  };
})();
const HARD = { "pythagoras.html": 0.52, "similar-triangles.html": 0.55, "quadratic-solver.html": 0.58, "equations-advanced.html": 0.6, "parabola-practice.html": 0.63, "intersection.html": 0.62, "solids3d.html": 0.66, "inequalities.html": 0.7, "powers-roots.html": 0.72, "circle.html": 0.71, "triangles.html": 0.76, "quadrilaterals.html": 0.78, "linear-function.html": 0.74, "ratio-percent.html": 0.8, "angles-parallel.html": 0.83, "directed-numbers.html": 0.86, "equation-solver.html": 0.84 };
const CH = ["פרק א׳", "פרק ב׳", "פרק ג׳", "פרק ד׳"];
const LS = "mp:demo-catalog";
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const listOf = { grade: "grades", category: "categories", topic: "topics", plan: "plans" };
let locks = [];

function sampleDays(days, seed, scale) {
  const r = rng(seed), now = new Date(), out = [];
  for (let d = days; d >= 0; d--) {
    const day = new Date(now.getTime() - d * 864e5), wd = day.getDay();
    const growth = 0.75 + 0.25 * (1 - d / days);
    const act = Math.round((wd === 5 || wd === 6 ? 14 : 34) * growth * (0.8 + r() * 0.4) * scale);
    const n = Math.round(act * 9 * (0.85 + r() * 0.3));
    const ok = Math.round(n * (0.66 + r() * 0.08));
    out.push({ day: day.toISOString().slice(0, 10), ok, bad: n - ok, win: Math.round(ok / 6), active: act });
  }
  return out;
}

const demo = {
  login(pin) {
    const now = Date.now();
    locks = locks.filter((t) => now - t < 15 * 6e4);
    if (locks.length >= 5) return { error: "locked", retry_at: new Date(locks[0] + 15 * 6e4).toISOString() };
    if (pin === "1111") { locks = []; return { token: "preview", expires_at: new Date(now + 12 * 36e5).toISOString() }; }
    locks.push(now);
    return { error: "wrong", left: Math.max(0, 5 - locks.length) };
  },
  admin_catalog: () => load(LS) || structuredClone(DEFAULT_CATALOG),
  admin_save({ kind, item }) {
    const c = demo.admin_catalog(), arr = c[listOf[kind]];
    let it = { ...item };
    if (!it.id) { it.id = kind[0] + Date.now().toString(36); it.position = arr.length; it.visible = it.visible !== false; arr.push(it); }
    else { const o = arr.find((x) => x.id === it.id); Object.assign(o, it); it = o; }
    save(LS, c);
    return it;
  },
  admin_delete({ kind, rid }) {
    const c = demo.admin_catalog();
    c[listOf[kind]] = c[listOf[kind]].filter((x) => x.id !== rid);
    if (kind === "grade") c.topics.forEach((t) => { t.grade_ids = t.grade_ids.filter((g) => g !== rid); });
    if (kind === "category") c.topics.forEach((t) => { if (t.category_id === rid) t.category_id = null; });
    save(LS, c);
    return null;
  },
  admin_reorder({ kind, ids }) {
    const c = demo.admin_catalog();
    ids.forEach((id, i) => { const o = c[listOf[kind]].find((x) => x.id === id); if (o) o.position = i; });
    save(LS, c);
    return null;
  },
  admin_stats({ days }) {
    const r = rng(days * 7919), now = new Date();
    const daily = sampleDays(days, days * 13, 1), daily_prev = sampleDays(days - 1, days * 17, 0.84);
    const pages = Object.keys(HARD), weight = pages.map((p, i) => 0.5 + r() * (i < 6 ? 1.6 : 1));
    const wsum = weight.reduce((a, b) => a + b, 0);
    const total = daily.reduce((s, d) => s + d.ok + d.bad, 0);
    const topics = [], chapters = [], steps = [];
    pages.forEach((p, i) => {
      const n = Math.round(total * weight[i] / wsum), ok = Math.round(n * HARD[p]), bad = n - ok, win = Math.round(ok / 6);
      topics.push({ page: p, attempts: n, ok, bad, win, views: Math.round(n / 3), devices: Math.round(n / 14) });
      CH.slice(0, 3 + (i % 2)).forEach((ch, j) => {
        const f = [0.45, 0.3, 0.17, 0.08][j], hard = j === 2 ? 0.82 : j === 3 ? 0.9 : 1.04;
        const co = Math.round(ok * f * hard), cb = Math.round(bad * f * (2 - hard));
        chapters.push({ page: p, chapter: ch, ok: co, bad: cb, win: Math.round(win * f), devices: Math.round(n * f / 14) });
        ["שלב 1", "שלב 2", "שלב 3"].forEach((st, s) => {
          const sf = [0.5, 0.32, 0.18][s], sh = [1.05, 0.95, 0.8][s];
          steps.push({ page: p, chapter: ch, step: st, ok: Math.round(co * sf * sh), bad: Math.round(cb * sf * (2 - sh)) });
        });
      });
    });
    const heat = [];
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
      const base = h < 7 ? 0.02 : h < 13 ? 0.22 : h < 15 ? 0.5 : h < 22 ? 1 : 0.25;
      const wk = d === 5 ? 0.45 : d === 6 ? 0.6 : 1;
      heat.push({ d, h, n: Math.round(base * wk * (40 + r() * 30) * days / 30) });
    }
    const today = [], hourNow = now.getHours() + now.getMinutes() / 60;
    for (let i = 0; i < 60; i++) {
      const h = Math.max(7, hourNow - r() * Math.max(1, hourNow - 7));
      const p = pages[Math.floor(r() * pages.length)];
      const at = new Date(now); at.setHours(Math.floor(h), Math.floor((h % 1) * 60));
      today.push({ at: at.toISOString(), page: p, kind: r() < 0.1 ? "win" : r() < HARD[p] ? "ok" : "bad" });
    }
    today.sort((a, b) => new Date(a.at) - new Date(b.at));
    const recent = today.slice(-25).reverse().map((e, i) => ({ ...e, chapter: CH[i % 3], step: "שלב " + (1 + (i % 3)), device: "dev" + Math.floor(r() * 1e8).toString(36) }));
    const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
    const active = Math.round(sum(daily, "active") / Math.max(1, days) * 3.1);
    const hours = Array.from({ length: 24 }, (_, h) => ({ h, n: heat.filter((x) => x.h === h).reduce((s, x) => s + x.n, 0) }));
    return {
      demo: true, range: { days },
      kpi: {
        active, active_prev: Math.round(active * 0.86), active_today: daily[daily.length - 1].active,
        correct: sum(daily, "ok"), wrong: sum(daily, "bad"), solved: sum(daily, "win"), views: Math.round(sum(daily, "ok") / 3),
        correct_prev: sum(daily_prev, "ok"), wrong_prev: sum(daily_prev, "bad"), solved_prev: sum(daily_prev, "win"),
        new_devices: Math.round(active * 0.3), all_time_devices: Math.round(active * 1.9),
      },
      daily, daily_prev, topics, chapters, steps, hours, heat, today, recent,
      devices: { mobile: Math.round(active * 0.64), desktop: Math.round(active * 0.36) },
    };
  },
  admin_students({ days }) {
    const r = rng(days * 31), pages = Object.keys(HARD), out = [];
    for (let i = 0; i < 64; i++) {
      const last = Date.now() - r() * days * 864e5, ok = Math.round(r() * 160), bad = Math.round(ok * (0.15 + r() * 0.5));
      out.push({ device: "dev" + Math.floor(r() * 1e9).toString(36), first_seen: new Date(last - r() * 40 * 864e5).toISOString(), last_seen: new Date(last).toISOString(), days_active: 1 + Math.floor(r() * 14), ok, bad, win: Math.round(ok / 7), mobile: r() < 0.64, top_page: pages[Math.floor(r() * pages.length)] });
    }
    return out.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));
  },
  admin_sales() {
    const d = new Date(), monthly = [];
    for (let i = 11; i >= 0; i--) { const m = new Date(d.getFullYear(), d.getMonth() - i, 1); monthly.push({ month: m.toISOString().slice(0, 7), subscribers: 0, mrr: 0 }); }
    return { active: 0, trial: 0, past_due: 0, canceled_30d: 0, mrr: 0, monthly, recent: [] };
  },
  admin_export: () => [],
  admin_change_pin: () => ({ error: "preview" }),
  admin_logout: () => null,
};

/* ── public API ──────────────────────────────────────────────────────────── */
export async function login(pin) {
  return isPreview() ? demo.login(pin) : mpData.rpc("admin_login", { pin });
}
export async function call(fn, args, tok) {
  if (isPreview()) return demo[fn]({ ...(args || {}) });
  try {
    return await mpData.rpc(fn, { ...(args || {}), tok });
  } catch (e) {
    if (/unauthorized/i.test(e.message)) e.unauthorized = true;
    throw e;
  }
}
