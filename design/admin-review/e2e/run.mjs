/* בקרת תוכן: end-to-end test kit (design/admin-review/design.md). Read README.md next to this file first.

   node design/admin-review/e2e/run.mjs [BASE]            BASE default http://localhost:5198
   env: ENGINES=chromium,webkit   VIEWPORTS=desktop,phone   PLAYWRIGHT_CORE=<path>   HEADED=1   ONLY=<check-substring>

   The database is FAKED at the network level: every call to the local Supabase (127.0.0.1:56421) is answered
   by this script, and any call to the LIVE Supabase is aborted and fails the run. Nothing real is written.

   For each engine (WebKit, Chromium) × viewport (1440×900 desktop, 393×852 phone):
     PIN 1111 → /admin/review → walk the tree (כיתה ח׳ › חזקות ושורשים › 2. חוקי חזקות) → the real page loads
     in the preview frame → answer a question wrong → "דווח" → the report form at EVERY scope (question, sub-tab,
     chapter, topic, grade, site) → the admin_fix_add payload is captured and checked against design §8 →
     ✓ the chapter (admin_content_check payload) → "הבא" goes to the fix waiting for approval first.
   And: zero events / account_track / presence_ping from inside the preview frame (a signed-in student is in
   localStorage the whole time), mp:last unchanged; a normal student tab without an admin session DOES send
   stats; no console errors (except Supabase connection refusals); no horizontal scroll at 393; tap targets
   ≥ 40px at 393; the frame-ancestors header on every route. Screens go to ./shots/, results to ./results.json. */
import { createRequire } from "module";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const PW = process.env.PLAYWRIGHT_CORE || "/Users/abedshalgam/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core";
const pw = require(PW);
const BASE = (process.argv[2] || process.env.BASE || "http://localhost:5198").replace(/\/$/, "");
const ENGINES = (process.env.ENGINES || "webkit,chromium").split(",").map((s) => s.trim()).filter(Boolean);
const VIEWPORTS = (process.env.VIEWPORTS || "desktop,phone").split(",").map((s) => s.trim()).filter(Boolean);
const SHOTS = join(HERE, "shots");
const ONLY = process.env.ONLY || "";

/* ── what we walk to (must exist in src/home/chapters.js and the topic) ─────────────────────────────── */
const T = {
  gradeId: "g8", grade: "כיתה ח׳",
  slug: "powers-roots", topic: "חזקות ושורשים", chapter: "2. חוקי חזקות", sub: "1. כפל חזקות",
  // the stub board has a fix waiting for approval here, so "הבא" must go here first (design §10, group 1)
  nextSlug: "triangles", nextChapter: "3. משולשים מיוחדים",
};
const VP = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const LOCAL_DB = /^http:\/\/127\.0\.0\.1:56421\//;              // src/lib/config.js LOCAL
const LIVE_DB = /^https:\/\/uucqyjskkyrfhvbsmorx\.supabase\.co\//; // src/lib/config.js LIVE — must never be hit
const TOK = "99999999-8888-7777-6666-555555555555";
const STUDENT = { tok: "11111111-2222-3333-4444-555555555555", account: { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", username: "e2e_student", grade: "8", avatar: "teal" } };
const LAST = JSON.stringify({ slug: "circle", at: 1 });          // mp:last sentinel: must survive the panel
const PEOPLE = ["סולימאן", "עבד"];
const STATS = new Set(["events", "account_track", "presence_ping"]);

/* ── results ────────────────────────────────────────────────────────────────────────────────────── */
const results = [];
function rec(run, check, status, detail = "") {
  results.push({ run, check, status, detail: String(detail).slice(0, 900) });
  const tag = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : status === "warn" ? "WARN" : "SKIP";
  console.log(`  ${tag}  ${check}${detail ? " — " + String(detail).split("\n")[0].slice(0, 220) : ""}`);
}
async function step(run, check, fn) {
  if (ONLY && !check.includes(ONLY)) return null;
  try {
    const r = await fn();
    if (r && r.status) rec(run, check, r.status, r.detail);
    else rec(run, check, "pass", r && r.detail ? r.detail : typeof r === "string" ? r : "");
    return r;
  } catch (e) {
    rec(run, check, "fail", (e && e.message) || e);
    return null;
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── the fake database ──────────────────────────────────────────────────────────────────────────── */
function catalog() {
  const grades = [["g7", "כיתה ז׳"], ["g8", "כיתה ח׳"], ["g9", "כיתה ט׳"]].map(([id, name], i) => ({ id, name, position: i, visible: true }));
  const categories = [["c1", "אלגברה"], ["c2", "גיאומטריה"], ["c3", "תחום מספרי"]].map(([id, name], i) => ({ id, name, color: "teal", position: i, visible: true }));
  const t = [
    ["מספרים מכוונים", "directed-numbers", ["g7"], "c3"], ["חזקות ושורשים", "powers-roots", ["g8", "g9"], "c3"],
    ["משוואות", "equation-solver", ["g7", "g8"], "c1"], ["אי־שוויונות", "inequalities", ["g8", "g9"], "c1"],
    ["משולשים", "triangles", ["g7", "g8"], "c2"], ["מרובעים", "quadrilaterals", ["g8"], "c2"], ["מעגל", "circle", ["g9"], "c2"],
  ];
  const topics = t.map(([name, slug, grade_ids, category_id], i) => ({ id: "t" + i, name, page: slug + ".html", grade_ids, category_id, icon: "root", color: "violet", status: "ready", position: i, visible: true }));
  return { grades, categories, topics, plans: [] };
}
function seedFixes() {
  const at = (h) => new Date(Date.now() - h * 36e5).toISOString();
  return [
    { id: 85, topic: "powers-roots", section: "2. חוקי חזקות › 5. חזקה אפס", body: "איפה: כיתה ח׳ › חזקות ושורשים › 2. חוקי חזקות › 5. חזקה אפס\nמה לתקן: להוסיף הסבר למה a⁰ = 1",
      status: "new", author: "סולימאן", created_at: at(30), updated_at: at(30), comments: [], files: [] },
    { id: 86, topic: "triangles", section: "3. משולשים מיוחדים", body: "איפה: כיתה ח׳ › משולשים › 3. משולשים מיוחדים\nמה לתקן: השטח לא מודגש",
      status: "review", author: "סולימאן", created_at: at(50), updated_at: at(5),
      comments: [{ id: 1, author: "Claude", body: "השטח צבוע ומסומן ב-S.", status: "review", created_at: at(5) }], files: [] },
    { id: 87, topic: "general", section: null, body: "איפה: כל האתר\nמה לתקן: כפתור ״בדוק״ קטן בטלפון",
      status: "new", author: "עבד", created_at: at(70), updated_at: at(70), comments: [], files: [] },
  ];
}
const kindOf = (u) => {
  const p = new URL(u).pathname;
  const m = p.match(/^\/rest\/v1\/rpc\/([a-z0-9_]+)$/);
  if (m) return m[1];
  if (p.startsWith("/rest/v1/")) return p.slice(9);          // a table: events, site_settings, topics…
  if (p.startsWith("/functions/v1/")) return "fn:" + p.slice(14);
  return p;
};
async function fakeDb(ctx, state) {
  await ctx.route(LIVE_DB, async (route) => { state.live.push(route.request().url()); await route.abort("blockedbyclient"); });
  await ctx.route(LOCAL_DB, async (route) => {
    const req = route.request(), k = kindOf(req.url());
    let args = null; try { args = req.postDataJSON(); } catch {}
    let fromFrame = false, frameUrl = "";
    try { const f = req.frame(); frameUrl = f.url(); fromFrame = !!f.parentFrame(); } catch {}
    state.log.push({ k, args, fromFrame, frameUrl, t: Date.now() });
    const json = (v, status = 200) => route.fulfill({ status, contentType: "application/json", body: v === undefined ? "" : JSON.stringify(v) });
    switch (k) {
      case "admin_login": return json(args && args.pin === "1111" ? { token: TOK, expires_at: new Date(Date.now() + 12 * 36e5).toISOString() } : { error: "pin", left: 4 });
      case "admin_catalog": return json(catalog());
      case "admin_fixes": return json(state.fixes);
      case "admin_content_checks": return json(state.checks);
      case "admin_content_check": {
        const row = { id: state.checks.length + 1, topic: args.topic, section: args.section, author: args.author || "צוות", created_at: new Date().toISOString(), times: 1 };
        state.checks = [...state.checks.filter((c) => !(c.topic === row.topic && c.section === row.section)), row];
        return json(row);
      }
      case "admin_content_uncheck": { state.checks = state.checks.filter((c) => !(c.topic === args.topic && c.section === args.section)); return json({ ok: true, deleted: 1 }); }
      case "admin_fix_add": {
        const now = new Date().toISOString();
        const it = { id: state.nextId++, topic: args.topic, section: args.section || null, body: args.body, status: "new", author: args.author, created_at: now, updated_at: now, comments: [], files: [] };
        state.fixes = [it, ...state.fixes];
        state.sent.push(args);
        return json(it);
      }
      case "admin_fix_comment": {
        const it = state.fixes.find((x) => x.id === args.item_id);
        if (it) { it.comments.push({ id: Date.now(), author: args.author, body: args.body, status: args.new_status, created_at: new Date().toISOString() }); if (args.new_status) it.status = args.new_status; it.updated_at = new Date().toISOString(); }
        return json({ ok: true, id: Date.now() });
      }
      case "admin_logout": return json(undefined, 204);
      case "account_me": return json(STUDENT.account);
      case "account_topic": case "account_progress": return json({ chapters: [] });
      case "account_achievements": return json([]);
      case "account_track": return json(undefined, 204);
      case "presence_ping": return json({ open: false });
      case "events": return json(undefined, 201);
      default:
        if (req.method() === "GET") return json([]);           // table reads (site_settings, catalog…)
        return json(null);
    }
  });
}

/* the Next.js dev indicator ("N 1 Insight", bottom corner, also inside the preview frame) sits on top of the
   panel's buttons in `next dev` only; it is not part of the site, so it is hidden for the test */
async function hideDevOverlay(ctx) {
  await ctx.addInitScript(() => {
    const css = "nextjs-portal{display:none!important}";
    const put = () => { try { const s = document.createElement("style"); s.textContent = css; (document.head || document.documentElement).appendChild(s); } catch {} };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", put); else put();
  });
}

/* ── finding things: data hooks first (README.md), then roles and Hebrew text ───────────────────── */
async function first(where, cands, { timeout = 15000, what = "element" } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    for (const c of cands) {
      try {
        const all = typeof c === "function" ? c(where) : where.locator(c);
        const n = Math.min(await all.count(), 12);
        for (let i = 0; i < n; i++) { const loc = all.nth(i); if (await loc.isVisible()) return loc; }
      } catch {}
    }
    await sleep(200);
  }
  throw new Error(`not found: ${what}`);
}
const visible = async (loc) => { try { return await loc.first().isVisible(); } catch { return false; } };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const H = {
  root: ["[data-cpl=root]", ".cpl-root", ".cpl", (p) => p.getByRole("tree", { name: "תוכן האתר" })],
  tree: ["[data-cpl=tree]", (p) => p.getByRole("tree", { name: "תוכן האתר" }), (p) => p.getByRole("tree")],
  node: (k, text) => [`[role=treeitem][data-k="${k}"]`, `[data-cpl-node="${k}"]`, (p) => p.getByRole("tree").getByRole("treeitem").filter({ hasText: new RegExp("^\\s*" + esc(text)) }), (p) => p.getByRole("treeitem", { name: new RegExp(esc(text)) })],
  frame: ["iframe[data-cpl=frame]", 'iframe[title^="תצוגה חיה"]', 'iframe[src*="/topics/"]'],
  pill: ["[data-cpl=pill]", ".cpl-iso:not(.wait)", (p) => p.getByText(/לא נספר/)],
  report: ["[data-cpl=report]", ".cpl-bar [data-act=report]", (p) => p.getByRole("button", { name: /^דווח$/ }), (p) => p.getByRole("button", { name: /^דווח/ })],
  form: ["[data-cpl=form]", ".cpl-rep.on", (p) => p.getByRole("dialog").filter({ hasText: "על מה?" })],
  scope: (lvl, rx) => [`[data-cpl-scope="${lvl}"]`, (f) => f.getByRole("radio", { name: rx }), (f) => f.getByText(rx)],
  more: ["[data-cpl=more-levels]", ".cpl-more", (f) => f.getByRole("button", { name: /^רמה אחרת/ })],
  reason: (r) => [`[data-cpl-reason="${r}"]`, (f) => f.getByRole("button", { name: r, exact: true })],
  text: ["[data-cpl=text]", "textarea"],
  send: ["[data-cpl=send]", (f) => f.getByRole("button", { name: /שליחה$/ })],
  who: (n) => [(f) => f.getByRole("button", { name: n, exact: true })],
  check: ["[data-cpl=check]", (p) => p.getByRole("button", { name: /^(✓\s*)?(הפרק\s+)?תקין(\s*·\s*נבדק)?$/ }), (p) => p.getByRole("button", { name: /הפרק תקין|✓ תקין/ })],
  next: ["[data-cpl=toast-next]", (p) => p.getByRole("status").getByRole("button", { name: /הבא/ }), (p) => p.locator(".toast, .tst, [class*=toast]").getByRole("button", { name: /הבא/ }), (p) => p.getByRole("button", { name: /^הבא\s*›?$/ })],
  approveNext: ["[data-cpl=next]", (p) => p.getByRole("button", { name: /לאשר תיקון/ }), (p) => p.getByRole("button", { name: /הבא לבדיקה/ })],
  requests: ["[data-cpl=requests]", (p) => p.getByRole("button", { name: /^בקשות/ })],
  close: ["[data-cpl=close]", (p) => p.getByRole("button", { name: "סגירה" })],
};

/* ── the topic page inside the frame ────────────────────────────────────────────────────────────── */
async function topicFrame(page, slug, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const f = page.frames().find((x) => x !== page.mainFrame() && new URL(x.url(), BASE).pathname === "/topics/" + slug);
    if (f) {
      try { await f.waitForSelector("#root .card, #root .eq-card, #root .ch-btn", { timeout: Math.max(1000, end - Date.now()) }); return f; } catch {}
    }
    await sleep(250);
  }
  throw new Error("the preview frame did not load /topics/" + slug);
}
/* answer the question on screen; solve=true really solves powers-roots "כפל חזקות" (4^m · 4^n = 4^?) */
async function answer(f, solve) {
  return f.evaluate(async (solve) => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const vis = (e) => e && e.getClientRects().length > 0;
    const root = document.getElementById("root");
    const setVal = (inp, v) => {
      const proto = inp.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      inp.focus(); Object.getOwnPropertyDescriptor(proto, "value").set.call(inp, v); inp.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const pointer = (el) => { ["pointerdown", "pointerup"].forEach((t) => el.dispatchEvent(new PointerEvent(t, { bubbles: true }))); el.click(); };
    const once = async () => {
      let v = "1";
      const inputs = [...root.querySelectorAll(".card input:not([type=range]), .card textarea")].filter(vis);
      if (solve) {
        const mx = root.querySelector(".card .eq-box .mx");
        if (mx) {
          const sups = [...mx.querySelectorAll("sup")].map((s) => +s.textContent).filter((n) => !isNaN(n));
          const base = +mx.firstChild.textContent.trim(), st = inputs[0] && inputs[0].closest(".step-card");
          v = String(st && /מעריך/.test(st.textContent) ? sups[0] + sups[1] : base ** (sups[0] + sups[1]));
        }
      }
      if (inputs.length) inputs.forEach((inp) => setVal(inp, v));
      else { const c = [...root.querySelectorAll(".choice-btn")].find(vis); if (c) pointer(c); }
      await wait(150);
      const check = [...root.querySelectorAll("button.mp-check, button")].find((b) => vis(b) && !b.disabled && /בדוק|אשר/.test(b.textContent));
      if (check) pointer(check);
      await wait(700);
      return inputs.length ? v : "choice";
    };
    const typed = [await once()];
    if (solve) typed.push(await once());
    return { typed: typed.join(", "), win: !!root.querySelector(".banner, .success-banner, .summary-box") };
  }, !!solve);
}

/* ── layout checks (phone) ──────────────────────────────────────────────────────────────────────── */
async function noHScroll(page) {
  return page.evaluate(() => {
    const d = document.documentElement, b = document.body, w = window.innerWidth;
    const over = [];
    if (d.scrollWidth > w + 1) over.push(`html.scrollWidth ${d.scrollWidth} > ${w}`);
    if (b && b.scrollWidth > w + 1) over.push(`body.scrollWidth ${b.scrollWidth} > ${w}`);
    // the widest offenders, to fix fast
    if (over.length) {
      const wide = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > w + 1 || r.left < -1); })
        .slice(0, 6).map((e) => (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : e.tagName) + " " + Math.round(e.getBoundingClientRect().left) + "→" + Math.round(e.getBoundingClientRect().right));
      over.push("wide: " + wide.join(", "));
    }
    return over;
  });
}
async function smallTargets(page) {
  return page.evaluate((MIN) => {
    const W = window.innerWidth, Hh = window.innerHeight;
    const sel = "button, a[href], [role=button], [role=tab], [role=radio], [role=treeitem], [role=checkbox], input:not([type=hidden]), select, textarea, summary";
    const out = [];
    for (const e of document.querySelectorAll(sel)) {
      if (e.closest("[aria-hidden=true], [hidden], [inert]")) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0 || cs.pointerEvents === "none") continue;
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > Hh || r.right < 0 || r.left > W) continue;
      // a control nested inside a bigger control (a caret inside a tree row) is part of that target
      const parent = e.parentElement && e.parentElement.closest(sel);
      if (parent) { const pr = parent.getBoundingClientRect(); if (pr.width >= MIN && pr.height >= MIN && e.getAttribute("role") === "button") continue; }
      if (r.width < MIN || r.height < MIN) {
        const name = (e.getAttribute("aria-label") || e.textContent || e.getAttribute("placeholder") || e.tagName).replace(/\s+/g, " ").trim().slice(0, 30);
        out.push(`${name} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    return [...new Set(out)];
  }, TAP_MIN);
}

/* ── body format (design §8) ────────────────────────────────────────────────────────────────────── */
/* phone tap targets: Apple's 44 pt (review M3); TAP_MIN=40 for the older, looser check */
const TAP_MIN = +(process.env.TAP_MIN || 44);
const DEVICE = { desktop: /מחשב 1440×900/, phone: /טלפון 393×852/ };
function expectFor(lvl, sub) {
  const pre = `איפה: ${T.grade} › ${T.topic}`;
  return {
    site: { topic: "general", section: "", where: "איפה: כל האתר", link: false },
    grade: { topic: "general", section: `${T.grade} · כל הכיתה`, where: `איפה: ${T.grade}`, link: false },
    topic: { topic: T.slug, section: "", where: pre, link: true },
    chapter: { topic: T.slug, section: T.chapter, where: `${pre} › ${T.chapter}`, link: true },
    sub: { topic: T.slug, section: `${T.chapter} › ${sub}`, where: `${pre} › ${T.chapter} › ${sub}`, link: true },
    question: { topic: T.slug, section: `${T.chapter} › ${sub}`, where: `${pre} › ${T.chapter} › ${sub} › השאלה שעל המסך`, link: true },
  }[lvl];
}
function checkPayload(p, lvl, vp, { reason, text, sub }) {
  const e = expectFor(lvl, sub), bad = [];
  if (!p) return ["no admin_fix_add request was sent"];
  if (p.tok !== TOK) bad.push("tok is not the PIN session token");
  if (p.topic !== e.topic) bad.push(`topic "${p.topic}" ≠ "${e.topic}"`);
  if ((p.section || "") !== e.section) bad.push(`section "${p.section}" ≠ "${e.section}"`);
  if (!PEOPLE.includes(p.author)) bad.push(`author "${p.author}" not one of ${PEOPLE.join("/")}`);
  const lines = String(p.body || "").split("\n");
  if (!lines[0].startsWith(e.where)) bad.push(`first line "${lines[0]}" does not start with "${e.where}"`);
  if (lvl === "question" && !/› השאלה שעל המסך( › .+)?$/.test(lines[0])) bad.push("question 'where' does not end with השאלה שעל המסך [› step]");
  if (lvl !== "question" && /השאלה שעל המסך/.test(lines[0])) bad.push("non-question 'where' mentions the question");
  if (reason && !lines.includes("סוג: " + reason)) bad.push(`no line "סוג: ${reason}"`);
  if (!reason && lines.some((l) => l.startsWith("סוג:"))) bad.push("a סוג line without a reason");
  if (!lines.includes("מה לתקן: " + text)) bad.push(`no line "מה לתקן: ${text}"`);
  const link = lines.find((l) => l.startsWith("קישור: "));
  if (e.link && !link) bad.push("no קישור line");
  if (!e.link && link) bad.push("a קישור line on a site/grade request");
  if (link) {
    let u; try { u = new URL(link.slice(7)); } catch { bad.push("קישור is not a URL"); }
    if (u) {
      if (u.pathname !== "/topics/" + T.slug) bad.push(`link path ${u.pathname}`);
      const ch = u.searchParams.get("ch"), sb = u.searchParams.get("sub");
      if (lvl === "topic" && (ch || sb)) bad.push("topic link carries ch/sub");
      if (["chapter", "sub", "question"].includes(lvl) && ch !== T.chapter) bad.push(`link ch="${ch}"`);
      if (["sub", "question"].includes(lvl) && sb !== sub) bad.push(`link sub="${sb}"`);
      if (lvl === "chapter" && sb) bad.push("chapter link carries sub");
      if (/localhost|127\.0\.0\.1/.test(u.host)) bad.push("link points at localhost, not the live site");
    }
  }
  const last = lines[lines.length - 1];
  if (!last.startsWith("נשלח מבקרת התוכן")) bad.push(`last line "${last}" is not "נשלח מבקרת התוכן · …"`);
  if (!DEVICE[vp].test(last)) bad.push(`last line has no device "${DEVICE[vp]}"`);
  if (!/גרסה [0-9a-f]{7}|גרסה dev/.test(last)) bad.push("last line has no version (design §8: גרסה <7 chars>) — see early-review M2");
  if (lvl === "question") {
    const i = lines.indexOf("השאלה כמו שהופיעה:");
    if (i < 0) bad.push("no 'השאלה כמו שהופיעה:' block");
    else {
      const q = lines.slice(i + 1).join("\n");
      if (!/[⁰¹²³⁴⁵⁶⁷⁸⁹]|\^/.test(q)) bad.push("the frozen question lost its exponents (no ² or ^)");
      if (!/הוקלד: /.test(q)) bad.push("the frozen question has no 'הוקלד:' (what was typed)");
      if (!/האתר ענה: /.test(q)) bad.push("the frozen question has no 'האתר ענה:'");
    }
  } else if (lines.includes("השאלה כמו שהופיעה:")) bad.push("a question block on a non-question request");
  // nothing personal (design §8): not the signed-in student, not the device id
  if (/e2e_student|aaaaaaaa-bbbb|11111111-2222/.test(p.body)) bad.push("the body carries the signed-in student's data");
  return bad;
}

/* ── one engine × one viewport ──────────────────────────────────────────────────────────────────── */
async function runPanel(browserType, engine, vpName) {
  const run = `${engine}·${vpName}`;
  console.log(`\n${run}`);
  const shotDir = SHOTS;
  let n = 0;
  const shot = async (page, name) => { try { await page.screenshot({ path: join(shotDir, `${engine}-${vpName}-${String(++n).padStart(2, "0")}-${name}.png`) }); } catch {} };
  const browser = await browserType.launch({ headless: !process.env.HEADED });
  const opts = { ...VP[vpName], locale: "he-IL" };
  if (engine === "webkit" && vpName === "phone") opts.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  let ctx;
  try { ctx = await browser.newContext(opts); } catch { delete opts.isMobile; ctx = await browser.newContext(opts); }
  const state = { log: [], live: [], fixes: seedFixes(), checks: [], sent: [], nextId: 92 };
  await fakeDb(ctx, state);
  await hideDevOverlay(ctx);
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  const okErr = (text, url) => LOCAL_DB.test(url || "") || LIVE_DB.test(url || "") || /ERR_CONNECTION_REFUSED|Could not connect|127\.0\.0\.1:56421|supabase|blockedbyclient|ERR_BLOCKED_BY_CLIENT/i.test(text);
  page.on("console", (m) => { if (m.type() === "error") { const loc = m.location() || {}; if (!okErr(m.text(), loc.url)) errors.push(`${m.text().slice(0, 300)} @ ${(loc.url || "").replace(BASE, "")}`); } });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e.stack || e.message).split("\n").slice(0, 3).join(" | ")));
  const phone = vpName === "phone";
  const layout = [];      // phone: horizontal scroll + small targets per screen
  const measure = async (where) => {
    if (!phone) return;
    const h = await noHScroll(page).catch((e) => ["(measure failed) " + e.message]);
    const s = await smallTargets(page).catch((e) => ["(measure failed) " + e.message]);
    layout.push({ where, h, s });
  };

  try {
    /* 1. PIN 1111 */
    const login = await step(run, "login with PIN 1111", async () => {
      await page.goto(BASE + "/admin/review", { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.evaluate(({ student, last }) => {
        localStorage.clear(); sessionStorage.clear();
        localStorage.setItem("mp:account", JSON.stringify(student));   // a signed-in student on the same device
        localStorage.setItem("mp:last", last);
      }, { student: STUDENT, last: LAST });
      await page.reload({ waitUntil: "domcontentloaded" });
      await first(page, [(p) => p.getByRole("button", { name: "1", exact: true })], { timeout: 60000, what: "the PIN pad" });
      await shot(page, "pin");
      for (let i = 0; i < 4; i++) { await page.getByRole("button", { name: "1", exact: true }).click(); await sleep(60); }
      await page.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem("mp:admin")).tok; } catch { return false; } }, null, { timeout: 15000 });
      const l = state.log.find((x) => x.k === "admin_login");
      if (!l || !l.args || l.args.pin !== "1111") throw new Error("admin_login was not called with pin 1111");
      return "admin_login {pin:1111} → session saved";
    });
    if (!login) throw new Error("stop: no admin session");

    /* 2. the panel */
    await step(run, "panel opens at /admin/review", async () => {
      await first(page, H.tree, { timeout: 60000, what: "the tree (role=tree 'תוכן האתר')" });
      await page.waitForFunction(() => !document.querySelector(".cpl-tree-sk"), null, { timeout: 20000 }).catch(() => {});
      await sleep(600);
      await shot(page, "panel");
      await measure("list / panel");
      return page.url().replace(BASE, "");
    });

    /* 3. walk the tree: grade → topic → chapter */
    const walked = await step(run, "walk the tree: grade › topic › chapter", async () => {
      const kG = "g|" + T.gradeId, kT = `t|${T.gradeId}|${T.slug}`, kC = `c|${T.gradeId}|${T.slug}|${T.chapter}`;
      const topicRow = () => first(page, H.node(kT, T.topic), { timeout: 2500, what: "topic row" });
      const chapterRow = () => first(page, H.node(kC, T.chapter), { timeout: 2500, what: "chapter row" });
      let tr = await topicRow().catch(() => null);
      if (!tr) { (await first(page, H.node(kG, T.grade), { what: "grade row " + T.grade })).click(); await sleep(400); tr = await topicRow(); }
      let cr = await chapterRow().catch(() => null);
      if (!cr) { await tr.click(); await sleep(400); cr = await chapterRow(); }
      await shot(page, "tree-open");
      await cr.click();
      await sleep(500);
      const sel = await page.evaluate(() => { const s = document.querySelector("[role=treeitem][aria-selected=true]"); return s ? s.getAttribute("data-k") || s.textContent.trim() : null; });
      if (!phone && (!sel || !sel.includes(T.chapter))) throw new Error("the chapter row is not selected (aria-selected): " + sel);
      return "selected " + (sel || "(phone: page screen)");
    });

    /* 4. the real page in the frame */
    let f = null, sub = T.sub;
    await step(run, "preview loads the chapter (real page in a same-origin frame)", async () => {
      await first(page, H.frame, { timeout: 30000, what: "the preview iframe" });
      f = await topicFrame(page, T.slug);
      await f.waitForFunction((ch) => { const b = document.querySelector("#root .ch-btn.active"); return b && b.textContent.replace(/\s+/g, " ").trim() === ch; }, T.chapter, { timeout: 20000 });
      await sleep(1500);
      const s = await f.evaluate(() => { const b = document.querySelector("#root :is(.sub-tab, .sub-tab-btn, .sub-btn, .tab).active"); return b ? b.textContent.replace(/\s+/g, " ").trim() : ""; });
      if (s) sub = s;
      await shot(page, "preview");
      await measure("page screen");
      return `/topics/${T.slug} · chapter "${T.chapter}" active · sub "${sub}"`;
    });

    await step(run, "guard on in the frame (MP.adminFrame) + green pill", async () => {
      if (!f) throw new Error("no frame");
      const g = await f.evaluate(() => !!(window.MP && window.MP.adminFrame === true));
      if (!g) throw new Error("MP.adminFrame is not true inside the preview");
      const pill = await first(page, H.pill, { timeout: 10000, what: "the 'not counted' pill" });
      const t = (await pill.textContent()).trim();
      if (/נספרות!|נספר!|זהירות/.test(t)) throw new Error("the pill says answers COUNT: " + t);
      return `MP.adminFrame true · pill "${t}"`;
    });

    /* 5. answer wrong, then report at every scope */
    if (f) await step(run, "answer a question in the frame (wrong, to freeze 'הוקלד' + 'לא נכון')", async () => {
      const r = await answer(f, false);
      await sleep(400);
      return "typed " + r.typed;
    });

    const scopes = [
      { lvl: "question", rx: /^השאלה שעל המסך/, reason: "בדיקת התשובה לא נכונה" },
      { lvl: "sub", rx: () => new RegExp("^כל ״" + esc(sub) + "״"), reason: "" },
      { lvl: "chapter", rx: new RegExp("^כל הפרק ״" + esc(T.chapter) + "״"), reason: "טעות במתמטיקה" },
      { lvl: "topic", rx: /^כל הנושא/, reason: "חסר / להוסיף", more: true },
      { lvl: "grade", rx: new RegExp("^כל " + esc(T.grade)), reason: "", more: true },
      { lvl: "site", rx: /^כל האתר/, reason: "סדר / מבנה", more: true },
    ];
    for (const sc of scopes) {
      await step(run, `report form · scope ${sc.lvl} → admin_fix_add body (design §8)`, async () => {
        if (!f) throw new Error("no frame");
        const before = state.sent.length;
        let whoAsked = false, secondTap = false;
        if (await visible(page.locator(".cpl-rep.on, [data-cpl=form]"))) { await page.keyboard.press("Escape"); await sleep(400); }   // left open by a failed step
        const rb = await first(page, H.report, { what: "the דווח button" });
        await rb.click();
        const form = await first(page, H.form, { timeout: 8000, what: "the report form (role=dialog with 'על מה?')" });
        await sleep(350);
        if (sc.lvl === "question") await measure("report form");
        const rx = typeof sc.rx === "function" ? sc.rx() : sc.rx;
        let opt = await first(form, H.scope(sc.lvl, rx), { timeout: 1500, what: "scope " + sc.lvl }).catch(() => null);
        if (!opt && sc.more) { const m = await first(form, H.more, { timeout: 3000, what: "'רמה אחרת'" }); await m.click(); await sleep(250); }
        if (!opt) opt = await first(form, H.scope(sc.lvl, rx), { timeout: 4000, what: `scope option ${sc.lvl} (${rx})` });
        await opt.click();
        const checked = await opt.getAttribute("aria-checked").catch(() => null);
        if (checked === "false") throw new Error(`scope ${sc.lvl} did not get aria-checked=true`);
        if (sc.reason) await (await first(form, H.reason(sc.reason), { timeout: 4000, what: "reason chip " + sc.reason })).click();
        const text = `e2e ${sc.lvl}: בדיקה אוטומטית`;
        await (await first(form, H.text, { what: "the sentence box" })).fill(text);
        if (sc.lvl === "question") {
          const snap = await form.locator(".cpl-snap, [data-cpl=snapshot]").first().textContent().catch(() => "");
          if (snap && /לא הצלחנו לקרוא/.test(snap)) throw new Error("the form could not read the question from the frame");
        }
        await shot(page, "form-" + sc.lvl);
        const reqP = page.waitForRequest((r) => /\/rpc\/admin_fix_add$/.test(r.url()), { timeout: 10000 }).catch(() => null);
        await (await first(form, H.send, { what: "שליחה" })).click();
        await sleep(300);
        // first send of the session may ask "מי שולח?"
        if (state.sent.length === before) {
          const w = await first(page, H.who(PEOPLE[0]), { timeout: 1500 }).catch(() => null);
          if (w) {
            await w.click(); await sleep(400); whoAsked = true;
            // the pick itself sends (review L7); a second tap is only needed by an older build
            if (state.sent.length === before) { secondTap = true; await (await first(form, H.send, { what: "שליחה (after picking who)" })).click(); }
          }
        }
        const req = await reqP;
        const p = req ? req.postDataJSON() : state.sent[state.sent.length - 1];
        await sleep(600);
        if (await visible(form)) { await page.keyboard.press("Escape"); await sleep(300); }
        const bad = checkPayload(p, sc.lvl, vpName, { reason: sc.reason, text, sub });
        if (bad.length) {
          const versionOnly = bad.length === 1 && /no version/.test(bad[0]);
          return { status: versionOnly ? "warn" : "fail", detail: bad.join("; ") + "\nbody:\n" + (p && p.body) };
        }
        return `topic=${p.topic} · section="${p.section}" · ${p.body.split("\n")[0]}` + (whoAsked ? (secondTap ? " (first send asked 'מי שולח?', then needed a 2nd tap on שליחה)" : " (first send asked 'מי שולח?'; the pick sent it)") : "");
      });
    }
    if (state.sent.length) writeFileSync(join(SHOTS, `${engine}-${vpName}-payloads.json`), JSON.stringify(state.sent, null, 2));

    /* 6. requests sheet (phone) */
    if (phone) await step(run, "phone: requests sheet opens and closes", async () => {
      const b = await first(page, H.requests, { what: "בקשות N" });
      await b.click(); await sleep(500);
      await shot(page, "sheet");
      await measure("requests sheet");
      const c = await first(page, H.close, { timeout: 4000, what: "close (סגירה)" }).catch(() => null);
      if (c) await c.click(); else await page.keyboard.press("Escape");
      await sleep(400);
      return "ok";
    });

    /* 7. solve one (a win in the frame), then ✓ the chapter */
    if (f) await step(run, "solve a question in the frame (mp:win still fires)", async () => {
      const r = await answer(f, true);
      return "typed " + r.typed + (r.win ? " · solved" : " · (not solved: generator changed?)");
    });
    await step(run, "✓ the chapter → admin_content_check {topic, section}", async () => {
      if (await visible(page.locator(".cpl-rep.on, [data-cpl=form]"))) { await page.keyboard.press("Escape"); await sleep(400); }
      const reqP = page.waitForRequest((r) => /\/rpc\/admin_content_check$/.test(r.url()), { timeout: 10000 }).catch(() => null);
      await (await first(page, H.check, { what: "✓ תקין / הפרק תקין · נבדק" })).click();
      await sleep(300);
      if (!(await reqP)) { const w = await first(page, H.who(PEOPLE[0]), { timeout: 1500 }).catch(() => null); if (w) await w.click(); }
      await sleep(600);
      const c = state.log.filter((x) => x.k === "admin_content_check").pop();
      if (!c) throw new Error("no admin_content_check request");
      const a = c.args || {};
      const bad = [];
      if (a.tok !== TOK) bad.push("tok");
      if (a.topic !== T.slug) bad.push(`topic "${a.topic}"`);
      if (a.section !== T.chapter) bad.push(`section "${a.section}" (must be the exact chapter-button text)`);
      if (!PEOPLE.includes(a.author)) bad.push(`author "${a.author}"`);
      await shot(page, "checked");
      if (bad.length) throw new Error(bad.join("; "));
      return `{topic:${a.topic}, section:"${a.section}", author:${a.author}}`;
    });

    /* 8. "הבא": the fix waiting for approval goes first */
    await step(run, "'הבא' goes to the fix waiting for approval first (design §10)", async () => {
      const lbl = await first(page, H.approveNext, { timeout: phone ? 1500 : 5000 }).then((l) => l.textContent()).catch(() => "");
      let nb = await first(page, H.next, { timeout: 6000, what: "the toast's 'הבא ›'" }).catch(() => null);
      if (!nb) nb = await first(page, H.approveNext, { timeout: 6000, what: "'לאשר תיקון' / 'הבא לבדיקה'" });
      await nb.click();
      const fr = await topicFrame(page, T.nextSlug, 45000);
      await fr.waitForFunction((ch) => { const b = document.querySelector("#root .ch-btn.active"); return b && b.textContent.replace(/\s+/g, " ").trim() === ch; }, T.nextChapter, { timeout: 20000 })
        .catch(() => { throw new Error(`went to ${T.nextSlug} but chapter "${T.nextChapter}" is not active`); });
      await sleep(800);
      await shot(page, "next");
      return `→ /topics/${T.nextSlug} › ${T.nextChapter}` + (lbl ? ` (progress button read "${lbl.trim()}")` : "");
    });

    /* 9. isolation: nothing counted from the frame */
    await sleep(3500);                                         // past the 2.5 s stats batch
    await step(run, "zero stats / track / presence from the preview frame; mp:last unchanged", async () => {
      // close the frame's page so a pagehide flush would show up too
      await page.evaluate(() => document.querySelectorAll("iframe").forEach((x) => { try { x.src = "about:blank"; } catch {} })).catch(() => {});
      await sleep(1500);
      const fromFrame = state.log.filter((x) => STATS.has(x.k) && x.fromFrame);
      const anyEvents = state.log.filter((x) => x.k === "events" || x.k === "account_track");
      const last = await page.evaluate(() => localStorage.getItem("mp:last"));
      const bad = [];
      if (fromFrame.length) bad.push("from the frame: " + fromFrame.map((x) => x.k).join(", "));
      if (anyEvents.length) bad.push("events/account_track from the admin tab at all: " + anyEvents.length);
      if (last !== LAST) bad.push("mp:last changed to " + last);
      if (bad.length) throw new Error(bad.join("; "));
      const framed = state.log.filter((x) => x.fromFrame).map((x) => x.k);
      return `0 of events/account_track/presence_ping · mp:last kept · frame did only: ${[...new Set(framed)].join(", ") || "nothing"}`;
    });
  } catch (e) {
    rec(run, "run aborted", "fail", e.message);
  }

  /* layout (phone) */
  if (phone) {
    await step(run, "no horizontal scroll at 393", async () => {
      const bad = layout.filter((x) => x.h.length);
      if (!layout.length) return { status: "skip", detail: "no screen measured" };
      if (bad.length) throw new Error(bad.map((x) => `${x.where}: ${x.h.join(" · ")}`).join(" | "));
      return "screens: " + layout.map((x) => x.where).join(", ");
    });
    await step(run, `tap targets ≥ ${TAP_MIN}px at 393`, async () => {
      const bad = layout.filter((x) => x.s.length);
      if (!layout.length) return { status: "skip", detail: "no screen measured" };
      if (bad.length) throw new Error(bad.map((x) => `${x.where}: ${x.s.slice(0, 12).join(", ")}${x.s.length > 12 ? ` (+${x.s.length - 12})` : ""}`).join(" | "));
      return "screens: " + layout.map((x) => x.where).join(", ");
    });
  }
  await step(run, "no console errors (except Supabase connection refusals)", async () => {
    if (errors.length) throw new Error(`${errors.length}: ` + [...new Set(errors)].slice(0, 6).join(" ‖ "));
    return "none";
  });
  await step(run, "the LIVE database was never called", async () => {
    if (state.live.length) throw new Error(state.live.length + " calls, e.g. " + state.live[0]);
    return "0 calls";
  });
  await browser.close();
}

/* ── a normal student tab, no admin session: stats DO go out (proves the test can see them) ─────── */
async function runStudent(browserType, engine) {
  const run = `${engine}·student-tab`;
  console.log(`\n${run}`);
  const browser = await browserType.launch({ headless: !process.env.HEADED });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const state = { log: [], live: [], fixes: [], checks: [], sent: [], nextId: 1 };
  await fakeDb(ctx, state);
  const page = await ctx.newPage();
  await step(run, "normal student tab (guest, no admin session) sends > 0 stats", async () => {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(`${BASE}/topics/${T.slug}?ch=${encodeURIComponent(T.chapter)}&sub=${encodeURIComponent(T.sub)}`, { waitUntil: "load", timeout: 120000 });
    await page.waitForSelector("#root .card, #root .eq-card", { timeout: 60000 });
    await sleep(4200);
    await answer(page, true);
    await sleep(3500);
    const n = state.log.filter((x) => x.k === "events").length;
    const sub = await page.evaluate(() => { const b = document.querySelector("#root .sub-btn.active"); return b ? b.textContent.replace(/\s+/g, " ").trim() : ""; });
    if (!n) throw new Error("no events insert from a plain student tab (the guard is too wide, or the test can't see stats)");
    return `${n} events inserts · &sub= opened "${sub}"`;
  });
  await step(run, "the LIVE database was never called", async () => {
    if (state.live.length) throw new Error(state.live.length + " calls");
    return "0 calls";
  });
  await browser.close();
}

/* ── headers ────────────────────────────────────────────────────────────────────────────────────── */
async function headers() {
  console.log("\nheaders");
  for (const p of ["/", "/topics/" + T.slug, "/admin/review", "/admin", "/classic/index.html"]) {
    await step("headers", `frame-ancestors 'self' on ${p}`, async () => {
      const r = await fetch(BASE + p, { redirect: "manual" });
      const csp = r.headers.get("content-security-policy") || "";
      if (!/frame-ancestors 'self'/.test(csp)) throw new Error(`status ${r.status}, CSP "${csp}"`);
      const robots = r.headers.get("x-robots-tag") || "";
      if (p.startsWith("/admin") && !/noindex/.test(robots)) throw new Error("admin lost its X-Robots-Tag noindex");
      return `${r.status} · ${csp}${robots ? " · X-Robots-Tag " + robots : ""}`;
    });
  }
}

/* ── main ───────────────────────────────────────────────────────────────────────────────────────── */
if (existsSync(SHOTS)) rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });
console.log(`בקרת תוכן e2e · ${BASE} · engines ${ENGINES.join(", ")} · viewports ${VIEWPORTS.join(", ")}`);
// warm the dev server (first compile of each route can take a while)
for (const p of ["/admin/review", "/topics/" + T.slug, "/topics/" + T.nextSlug]) { try { await fetch(BASE + p); } catch (e) { console.log("cannot reach " + BASE + p + ": " + e.message); process.exit(2); } }
await headers();
for (const engine of ENGINES) {
  const bt = pw[engine];
  if (!bt) { rec(engine, "engine available", "fail", "playwright-core has no " + engine); continue; }
  for (const vp of VIEWPORTS) await runPanel(bt, engine, vp);
  await runStudent(bt, engine);
}
writeFileSync(join(HERE, "results.json"), JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
const fails = results.filter((r) => r.status === "fail"), warns = results.filter((r) => r.status === "warn");
console.log(`\n${results.length} checks · ${results.filter((r) => r.status === "pass").length} pass · ${fails.length} fail · ${warns.length} warn`);
process.exit(fails.length ? 1 : 0);
