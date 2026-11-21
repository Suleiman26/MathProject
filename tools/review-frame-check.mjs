/* Network proof for the content-review guard (design/admin-review/design.md §6, phase 0).

   Opens topic pages (a) inside an iframe whose top page is /admin and (b) in a normal tab, answers
   questions, and counts the requests that would become student data. The database is faked at the
   network level (every call to the local Supabase is answered by this script), so nothing real is
   written and no local Supabase is needed.

   Run with the dev server up:   npx next dev -p 5196
                                 node tools/review-frame-check.mjs [http://localhost:5196]
   Needs playwright-core (PLAYWRIGHT_CORE=<path to its folder>, default: the npx cache on Abed's Mac). */
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const PW = process.env.PLAYWRIGHT_CORE || "/Users/abedshalgam/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core";
const { chromium } = require(PW);
const BASE = (process.argv[2] || "http://localhost:5196").replace(/\/$/, "");
const DB = /^http:\/\/127\.0\.0\.1:56421\//;          // src/lib/config.js LOCAL (localhost uses it)

const STUDENT = { tok: "11111111-2222-3333-4444-555555555555", account: { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", username: "test_student", grade: "8", avatar: "teal" } };
const ADMIN = () => ({ tok: "99999999-8888-7777-6666-555555555555", exp: new Date(Date.now() + 36e5).toISOString(), preview: false });
const VISITS = [   // 5 questions in 3 topics; the first is solved to the end (a "win")
  { slug: "powers-roots", ch: "2. חוקי חזקות", sub: "1. כפל חזקות", solve: true },
  { slug: "powers-roots", ch: "2. חוקי חזקות", sub: "1. כפל חזקות" },
  { slug: "triangles", ch: "3. משולשים מיוחדים" },
  { slug: "directed-numbers", ch: "1. חיבור" },
  { slug: "directed-numbers", ch: "7. שברים" },
];

const kindOf = (url) => {
  const p = new URL(url).pathname;
  if (p === "/rest/v1/events") return "events";
  const m = p.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
  return m ? m[1] : p;
};

async function fakeDb(ctx, log) {
  await ctx.route(DB, async (route) => {
    const req = route.request(), k = kindOf(req.url());
    log.push({ k, frame: req.frame() ? req.frame().url() : "" });
    const body = k === "account_me" ? STUDENT.account
      : k === "presence_ping" ? { open: false } : k === "account_topic" ? { chapters: [] }
      : k === "account_progress" ? { chapters: [] } : k === "events" ? "" : null;
    await route.fulfill({ status: k === "events" ? 201 : 200, contentType: "application/json", body: body === "" ? "" : JSON.stringify(body) });
  });
}

/* answer the question on screen in `f` (a Page or a Frame); solve = really solve 4^m · 4^n = 4^? */
async function answer(f, solve) {
  return f.evaluate(async (solve) => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const vis = (e) => e && e.getClientRects().length > 0;
    const root = document.getElementById("root");
    const setVal = (inp, v) => {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      inp.focus(); set.call(inp, v); inp.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const pointer = (el) => { ["pointerdown", "pointerup"].forEach((t) => el.dispatchEvent(new PointerEvent(t, { bubbles: true }))); el.click(); };
    const once = async () => {
      let v = "1";
      const inputs = [...root.querySelectorAll(".card input:not([type=range]), .card textarea")].filter(vis);
      if (solve) {   // powers-roots "כפל חזקות": step 1 the exponent m+n, step 2 the value a^(m+n)
        const mx = root.querySelector(".card .eq-box .mx"), sups = [...mx.querySelectorAll("sup")].map((s) => +s.textContent).filter((n) => !isNaN(n));
        const base = +mx.firstChild.textContent.trim(), step = inputs[0] && inputs[0].closest(".step-card");
        v = String(step && /מעריך/.test(step.textContent) ? sups[0] + sups[1] : base ** (sups[0] + sups[1]));
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

const url = (v) => `${BASE}/topics/${v.slug}?ch=${encodeURIComponent(v.ch)}` + (v.sub ? `&sub=${encodeURIComponent(v.sub)}` : "");

async function run(name, { framed, student, admin }) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const log = [];
  await fakeDb(ctx, log);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.stack || e.message).split("\n").slice(0, 3).join(" | ")));
  await page.goto(BASE + (framed ? "/admin" : "/"), { waitUntil: "domcontentloaded" });
  await page.evaluate(({ student, admin }) => {
    localStorage.clear();
    localStorage.setItem("mp:last", JSON.stringify({ slug: "circle", at: 1 }));
    if (student) localStorage.setItem("mp:account", JSON.stringify(student));
    if (admin) localStorage.setItem("mp:admin", JSON.stringify(admin));
  }, { student: student ? STUDENT : null, admin: admin ? ADMIN() : null });
  if (framed) await page.reload({ waitUntil: "domcontentloaded" });
  const notes = [];
  let adminFrame = null, wins = 0;
  for (const v of VISITS) {
    let f;
    if (framed) {
      await page.evaluate((src) => {
        document.querySelectorAll("iframe.rv-test").forEach((x) => x.remove());
        const fr = document.createElement("iframe");
        fr.className = "rv-test"; fr.src = src;
        fr.style.cssText = "position:fixed;inset:0 auto auto 0;width:400px;height:860px;z-index:99999;background:#fff;border:0";
        document.body.appendChild(fr);
      }, url(v));
      await page.waitForTimeout(300);
      f = page.frames().find((x) => x !== page.mainFrame() && x.url().includes("/topics/"));
      await f.waitForLoadState("load");
    } else {
      await page.goto(url(v), { waitUntil: "load" });
      f = page;
    }
    await f.waitForSelector("#root .card, #root .eq-card", { timeout: 20000 });
    await page.waitForTimeout(4200);           // the chapter/sub deep link settles, the 1.8 s "view" fires
    const r = await answer(f, v.solve);
    if (r.win) wins++;
    if (framed && adminFrame === null) adminFrame = await f.evaluate(() => !!(window.MP && window.MP.adminFrame));
    notes.push(`${v.slug} · ${v.ch}${v.sub ? " › " + v.sub : ""} → typed ${r.typed}${r.win ? " · solved" : ""}`);
  }
  await page.waitForTimeout(3500);             // the 2.5 s stats batch
  const last = await page.evaluate(() => localStorage.getItem("mp:last"));
  if (framed) await page.evaluate(() => document.querySelectorAll("iframe.rv-test").forEach((x) => x.remove()));
  else await page.goto("about:blank");         // pagehide flush of anything left
  await page.waitForTimeout(1500);
  await browser.close();
  const n = (k) => log.filter((x) => x.k === k).length;
  return { name, events: n("events"), account_track: n("account_track"), presence_ping: n("presence_ping"), lastKept: last === JSON.stringify({ slug: "circle", at: 1 }), adminFrame, wins, notes, errors };
}

const results = [
  await run("A. admin frame, signed-in student", { framed: true, student: true, admin: true }),
  await run("B. admin frame, guest", { framed: true, student: false, admin: false }),
  await run("C. normal tab, signed-in student", { framed: false, student: true, admin: false }),
  await run("D. normal tab, guest", { framed: false, student: false, admin: false }),
  await run("E. normal tab, guest, admin session in this browser", { framed: false, student: false, admin: true }),
  await run("F. normal tab, signed-in student, admin session in this browser", { framed: false, student: true, admin: true }),
];
const expect = {
  "A": (r) => r.events === 0 && r.account_track === 0 && r.presence_ping === 0 && r.lastKept && r.adminFrame === true,
  "B": (r) => r.events === 0 && r.account_track === 0 && r.lastKept && r.adminFrame === true,
  "C": (r) => r.account_track > 0 && r.presence_ping > 0 && !r.lastKept,
  "D": (r) => r.events > 0 && !r.lastKept,
  "E": (r) => r.events === 0 && r.account_track === 0,
  "F": (r) => r.account_track > 0,
};
let bad = 0;
for (const r of results) {
  const ok = expect[r.name[0]](r);
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.name}: events ${r.events}, account_track ${r.account_track}, presence_ping ${r.presence_ping}, mp:last ${r.lastKept ? "unchanged" : "changed"}${r.adminFrame === null ? "" : ", MP.adminFrame " + r.adminFrame}, solved ${r.wins}`);
  r.notes.forEach((x) => console.log("        " + x));
  r.errors.forEach((x) => console.log("        page error: " + x));
}
console.log(bad ? `\n${bad} FAILED` : "\nall passed");
process.exit(bad ? 1 : 0);
