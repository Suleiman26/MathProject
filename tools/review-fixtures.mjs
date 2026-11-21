/* Saves the HTML fixtures for src/admin/review/snapshot.test.mjs from REAL topic pages.

   For each case: open the topic (?ch=&sub=), do what a reviewer would (type, check, pick), then save the
   question card exactly as the panel sees it — hidden parts and later steps dropped, each element's real
   layout kept as data-d (i = inline, r = a row, b = block), typed values written into value="…" — plus
   what takeSnapshot() said in the browser (<name>.browser.txt), so the node test can prove that the
   fixture walk gives the same text as the live page.

   Run with the dev server up:  npx next dev -p 5196
                                node tools/review-fixtures.mjs [http://localhost:5196 [case names…]]
   Needs playwright-core (PLAYWRIGHT_CORE=<path>, default: the npx cache on Abed's Mac). */
import { createRequire } from "module";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "/Users/abedshalgam/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core");
const BASE = (process.argv[2] || "http://localhost:5196").replace(/\/$/, "");
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../src/admin/review/fixtures");
const SNAP = readFileSync(join(HERE, "../src/admin/review/snapshot.js"), "utf8").replace(/^export /gm, "");

/* page-side helpers, given to every case as `h` */
const HELPERS = `
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const root = document.getElementById("root");
  const vis = (e) => e && e.getClientRects().length > 0;
  const all = (sel) => [...root.querySelectorAll(sel)].filter(vis);
  const type = async (inp, v) => {
    const proto = inp.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    inp.focus(); Object.getOwnPropertyDescriptor(proto, "value").set.call(inp, String(v));
    inp.dispatchEvent(new Event("input", { bubbles: true })); await wait(80);
  };
  const press = async (el) => { ["pointerdown", "pointerup"].forEach((t) => el.dispatchEvent(new PointerEvent(t, { bubbles: true }))); el.click(); await wait(500); };
  const check = async () => { const b = all("button").find((x) => !x.disabled && /בדוק|אשר|בדיקה/.test(x.textContent)); if (b) await press(b); return !!b; };
  const byText = (sel, re) => all(sel).find((x) => re.test(x.textContent));
`;

const CASES = [
  { name: "powers-step2-wrong", slug: "powers-roots", ch: "2. חוקי חזקות", sub: "1. כפל חזקות", act: `
      const mx = root.querySelector(".card .eq-box .mx"), sups = [...mx.querySelectorAll("sup")].map((s) => +s.textContent).filter((n) => !isNaN(n));
      await type(all(".card input")[0], sups[0] + sups[1]); await check(); await wait(400);
      await type(all(".card .step-card:not(.done) input")[0], 5); await wait(200); await check();` },
  { name: "powers-power-of-power", slug: "powers-roots", ch: "2. חוקי חזקות", sub: "3. חזקה של חזקה", act: `
      await type(all(".card input")[0], 8);` },
  { name: "roots-simplify", slug: "powers-roots", ch: "4. שורשים", sub: "ב. פישוט שורשים", act: `
      const i = all(".card input")[0]; if (i) { await type(i, 3); await check(); }` },
  { name: "fractions-pie", slug: "directed-numbers", ch: "7. שברים", act: `
      const i = all(".card .frac input"); await type(i[0], 5); await type(i[1], 6); await check();` },
  { name: "equations-denominator", slug: "equations-advanced", ch: "4 — לינארית עם מכנה", act: `
      await type(all(".eq-card input")[0], 3); await check();` },
  { name: "equation-solver-practice", slug: "equation-solver", ch: "4. פתרון משוואות", act: `
      const i = all("input")[0]; if (i) { await type(i, 4); await check(); }` },
  { name: "triangles-drawing-choice", slug: "triangles", ch: "3. משולשים מיוחדים", act: `
      // a WRONG pick on purpose (so the fixture shows the picked choice): the hypotenuse is the longest side
      const c = all(".choice-btn"), v = c.map((b) => +b.textContent), hyp = /היתר/.test(root.querySelector(".card .hint").textContent);
      await press(c[v.indexOf(hyp ? Math.min(...v) : Math.max(...v))]); await check();` },
  { name: "linear-graph", slug: "linear-function", ch: "1. קריאת נקודות", act: `
      const i = all("input")[0]; if (i) { await type(i, 2); }` },
  { name: "new-algebraic-fractions", slug: "new", ch: "16. שברים אלגבריים", act: `
      const s = byText("button", /לתרגול|תרגול|התחל/); if (s) await press(s);
      const i = all("input")[0]; if (i) await type(i, "x+1");` },
  { name: "proofs-proof", slug: "proofs", ch: "1. קוראים את הנתון", sub: "רמה 1", act: `
      const go = byText("button", /מתחילים|התחל/); if (go) { await press(go); await wait(800); }
      for (let k = 0; k < 2; k++) { const n = all("button.prf-go")[0]; if (n) { await press(n); await wait(500); } }` },
];

const browser = await chromium.launch();
mkdirSync(OUT, { recursive: true });
const ONLY = process.argv.slice(3);   // optional case names: recapture only those
for (const c of CASES.filter((x) => !ONLY.length || ONLY.includes(x.name))) {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: false });
  page.on("pageerror", (e) => console.log("  page error:", e.message));
  await page.goto(`${BASE}/topics/${c.slug}?ch=${encodeURIComponent(c.ch)}` + (c.sub ? `&sub=${encodeURIComponent(c.sub)}` : ""), { waitUntil: "load" });
  await page.waitForSelector("#root .ch-btn, #root .nav-btn, #root .card", { timeout: 20000 });
  await page.waitForTimeout(4500);   // the ch/sub deep link settles
  await page.addScriptTag({ content: SNAP + "\nwindow.__snap = { takeSnapshot, pickQuestion, serialize };" });
  const res = await page.evaluate(async ({ act, helpers }) => {
    // eslint-disable-next-line no-new-func
    await new Function("return (async () => {" + helpers + act + "})()")();
    await new Promise((r) => setTimeout(r, 600));
    const S = window.__snap, pick = S.pickQuestion(document, {});
    const snap = S.takeSnapshot(document, {});
    const KEEP = ["class", "aria-label", "aria-hidden", "aria-pressed", "role", "type", "data-engine", "alt", "disabled", "placeholder", "dir"];
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const VOID = new Set(["input", "br", "hr", "img"]);
    const html = (n, inSvg) => {
      if (n.nodeType === 3) return esc(n.nodeValue);
      if (n.nodeType !== 1) return "";
      if (!inSvg && (!pick.shown(n) || pick.later.includes(n))) return "";
      const t = n.tagName.toLowerCase();
      if (t === "script" || t === "style") return "";
      const svg = inSvg || t === "svg";
      let a = "";
      for (const k of KEEP) if (n.hasAttribute(k) && !(svg && t !== "svg" && k !== "class")) a += ` ${k}="${esc(n.getAttribute(k))}"`;
      if (!svg) { const d = pick.display(n); a += ` data-d="${d === "inline" ? "i" : d === "row" ? "r" : "b"}"`; }
      if (t === "input" || t === "textarea") a += ` value="${esc(n.value)}"` + (n.checked ? " checked" : "");
      if (t === "option" && n.selected) a += " selected";
      if (svg && t !== "svg" && t !== "text" && t !== "tspan" && t !== "g") return "";   // shapes carry no words
      const inner = [...n.childNodes].map((k) => html(k, svg)).join("");
      return VOID.has(t) ? `<${t}${a}>` : `<${t}${a}>${inner}</${t}>`;
    };
    return { html: html(pick.scope, false), text: snap.text, snap };
  }, { act: c.act, helpers: HELPERS });
  writeFileSync(join(OUT, c.name + ".html"), `<!-- ${c.slug} · ${c.ch}${c.sub ? " › " + c.sub : ""} · saved by tools/review-fixtures.mjs -->\n` + res.html + "\n");
  writeFileSync(join(OUT, c.name + ".browser.txt"), res.text + "\n");
  console.log(`== ${c.name}  (step: ${res.snap.stepShort || "-"} · verdict: ${res.snap.verdict} · place: ${res.snap.chapter} › ${res.snap.subs.join(" › ")}${res.snap.key ? " · key " + JSON.stringify(res.snap.key) : ""})\n${res.text}\n`);
  await page.close();
}
await browser.close();
