/* בקרת תוכן: the question snapshot and the request body (design/admin-review/design.md §6, §8).

   Admin bundle only — nothing here runs in a student's page. The panel shows the real topic page
   in a same-origin iframe and calls takeSnapshot(iframe.contentDocument) when "דווח" is tapped:
   the question on screen becomes plain text that KEEPS THE MATH (plain innerText turns
   "3<sup>?</sup>" into "3?"):
     <sup>   → ³ / ⁻² when only digits and minus, else ^x / ^(…)       <sub> → _x / _(…)
     <Root>  → √49 / √(x + 1)                                          fraction blocks → 3/4 / (x + 5)/3
     inputs  → [8] / [ ] inline, and per step "הוקלד: 8 · האתר ענה: לא נכון"
     choices → [3] [4 · נבחר] [5]                                       svg → [ציור: its labels in order]
     canvas  → [ציור תלת־ממד] (three.js) / [ציור]                       lesson boxes, tabs and action buttons → left out
   Then buildRequest() turns a report at any level into { topic, section, body } for admin_fix_add, in the
   shape the morning fix job already reads (fixed Hebrew labels איפה / סוג / מה לתקן, the question block,
   a link that reopens the same place, the device and the site version).

   No imports on purpose: serialize() only needs childNodes / nodeType / nodeName / getAttribute, so the
   node tests run it on small HTML fixtures saved from real topic pages (snapshot.test.mjs). */

export const SITE = "https://mathix-sooty.vercel.app";

/* ── the site's own vocabulary (src/lib/mp-runtime.js SEL, plus its .mp-right / .mp-wrong marks) ── */
const cls = (el) => ((el.getAttribute && el.getAttribute("class")) || "").split(/\s+/).filter(Boolean);
const has = (el, ...names) => { const c = cls(el); return names.every((n) => c.includes(n)); };
const any = (el, list) => list.some((sel) => has(el, ...sel));
const parse = (s) => s.split(",").map((x) => x.trim().replace(/^\./, "").split("."));
const OK = parse(".fb.ok, .feedback.ok, .feedback-ok, .msg-success, .std-banner, .choice-btn.correct, .math-input.correct, .coef-inp.ok, .mp-right");
const DONE = parse(".step-card.done, .card.done, .step-done, .step-item.sol, .banner, .success-banner, .summary-box");
const BAD = parse(".fb.err, .feedback.err, .feedback-err, .msg-error, .err-msg, .sel-err, .err, .ieq-div-err, .choice-btn.wrong, .math-input.wrong, .btn-formula.wrong-pick, .mp-wrong");
/** where a question lives (the panel reads the card around the focused box) and its steps */
export const SCOPE_SEL = ".card, .nw-card, .section-wrapper, .ex-box, .tri-box, .prf-ch";
export const STEP_SEL = ".step-card, .eq-card, .step-item";
const STEP = parse(STEP_SEL);
const STEP_LABEL = parse(".step-label, .phase-title, .card-t, .section-title, .task-title, .card-title");
/* left out: navigation (chapters, sub-tabs, levels), lesson boxes, the runtime's own small parts */
const NAV = parse(".ch-btn, .nav-btn, .ph, .sub-tab, .sub-tab-btn, .sub-btn, .tab, .diff-btn, .ch-btns, .sub-tabs, .sub-btns, .info, .info-box, .mp-fold, .mp-more, .mp-confetti, .mp-boot");
/* action buttons (check, new question, hint, next…) are not part of the question; whole words only ("כאשר" is not "אשר") */
const ACTION = /(?:^|[\s✓✔])(?:בדוק|בדקו|בדיקה|אשר|אישור|רמז|הבנתי|המשך|הבא|התחל|התחילו|מתחילים|איפוס|דלג|פשט|נקה|ניקוי|עוד|פחות|נסה שוב|נסו שוב|חדש|חדשה)(?=$|[\s!.,:?✓›‹←→])|↺|למה זה נכון|הצג פתרון|פתרון מלא/;
/* an answer choice is never an action, whatever its label says ("עוד 2", "אישור", "חדשים" are answers too) */
const CHOICE = /^(?:[a-z0-9]+-)?choice(?:-btn)?$/;
const isChoice = (n, c) => c.some((x) => CHOICE.test(x)) || attr(n, "aria-pressed") != null || attr(n, "aria-checked") != null || attr(n, "role") === "radio";
const CHOICE_ON = /^(selected|sel|picked|chosen|on|active|is-on|nw-on)$/;
const GRAPHIC = new Set(["SVG", "CANVAS", "IMG"]);
/* the proofs section draws ∢ △ ≅ ↔ as small SVGs (src/topics/proofs/signs.jsx) */
const SIGN = { "prf-sign-angle": "∢", "prf-sign-tri": "△", "prf-sign-cong": "≅", "prf-sign-match": "↔" };
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "HEAD", "DETAILS", "OPTION"]);
const INLINE_TAGS = new Set(["SPAN", "B", "I", "STRONG", "EM", "SUP", "SUB", "LABEL", "A", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "CODE", "SMALL", "MARK", "ABBR", "U", "S", "BDI", "BDO", "SVG", "CANVAS", "IMG", "Q", "VAR", "KBD"]);

const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "-": "⁻", "−": "⁻" };
const squash = (s) => String(s || "").replace(/[\s ]+/g, " ");
const flat = (s) => squash(s).trim();
/** a single token needs no brackets: 49, x, ?, 2.5, ², or one answer box [8] */
const simple = (s) => /^[0-9A-Za-z.,?²³¹⁰⁴-⁹′]+$/.test(s) || /^\[[^\]]*\]$/.test(s);
const wrap = (s) => (simple(s) ? s : "(" + s + ")");
/* a fraction's part stays bare only when nobody could misread it: 3, 2.5, x, x³, 2³, ?, one box — "30x⁴/6x" becomes (30x⁴)/(6x) */
const fwrap = (s) => (/^[0-9.,]+[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*$|^[A-Za-z?][⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*$|^\[[^\]]*\]$/.test(s) ? s : "(" + s + ")");

function textOf(n) {
  if (n.nodeType === 3) return n.nodeValue || "";
  if (n.nodeType !== 1 && n.nodeType !== 9 && n.nodeType !== 11) return "";
  let s = "";
  for (const c of n.childNodes || []) s += textOf(c);
  return s;
}
const tag = (el) => String(el.nodeName || "").toUpperCase();
const attr = (el, k) => (el.getAttribute ? el.getAttribute(k) : null);
const boolAttr = (el, k) => !!(el.hasAttribute ? el.hasAttribute(k) : attr(el, k) != null);
function valueOf(el) {
  if (tag(el) === "SELECT") {
    const opts = [];
    (function walk(n) { for (const c of n.childNodes || []) { if (tag(c) === "OPTION") opts.push(c); else if (c.nodeType === 1) walk(c); } })(el);
    const i = typeof el.selectedIndex === "number" ? el.selectedIndex : opts.findIndex((o) => boolAttr(o, "selected"));
    return i >= 0 && opts[i] ? flat(textOf(opts[i])) : "";
  }
  const v = typeof el.value === "string" ? el.value : attr(el, "value");
  return flat(v);
}
function checkedOf(el) { return typeof el.checked === "boolean" ? el.checked : boolAttr(el, "checked"); }

/* ── the walker ───────────────────────────────────────────────────────── */
/**
 * The visible text of `node` with the math kept, one line per block.
 * opts.skip(el)     → true to leave an element out (the panel: hidden elements, steps after the active one)
 * opts.display(el)  → "inline" | "block" | "row" (the panel reads the real layout; fixtures carry data-d)
 * opts.verdicts     → false to leave out the "הוקלד / האתר ענה" line under each answered step
 */
export function serialize(node, opts = {}) {
  const out = [], st = blank();
  walk(node, out, opts, st);
  // a question without step cards: its one "הוקלד / האתר ענה" line at the end
  if (opts.verdicts !== false && !st.inner) { const v = verdictLine(st); if (v) out.push("\n" + v); }
  return finish(out.join(""));
}
const blank = () => ({ typed: [], picked: [], ok: false, bad: false, done: false, inner: false });

function finish(s) {
  const lines = [];
  for (const raw of s.split("\n")) {
    const l = raw.replace(/[ \t ]+/g, " ").replace(/\s+([,.:;!?)])(?=\s|$)/g, "$1").trim();
    if (l && l !== lines[lines.length - 1]) lines.push(l);
  }
  return lines.join("\n");
}

function displayOf(el, opts) {
  const d = opts.display ? opts.display(el) : null;
  if (d) return d;
  const a = attr(el, "data-d");
  if (a) return a === "i" ? "inline" : a === "r" ? "row" : "block";
  return INLINE_TAGS.has(tag(el)) ? "inline" : "block";
}

/* every element: what the student sees there, in the order it is on screen */
function walk(n, out, opts, st) {
  if (n.nodeType === 3) { out.push(squash(n.nodeValue)); return; }
  if (n.nodeType !== 1 && n.nodeType !== 9 && n.nodeType !== 11) return;
  if (n.nodeType === 1) {
    const t = tag(n);
    // aria-hidden: only decorative graphics are left out (proofs hide the TEXT of a formula from screen readers, not from eyes)
    if (SKIP_TAGS.has(t) || any(n, NAV) || (attr(n, "aria-hidden") === "true" && GRAPHIC.has(t) && !has(n, "prf-sign"))) return;
    if (opts.skip && opts.skip(n)) return;
    if (st) {
      if (any(n, BAD)) st.bad = true;
      if (any(n, OK)) st.ok = true;
      if (any(n, DONE)) st.done = true;
    }
    const piece = leaf(n, opts, st);
    if (piece !== null) { out.push(piece); return; }
    if (any(n, STEP) && opts.verdicts !== false) {
      const s = { ...blank(), ok: any(n, OK), bad: any(n, BAD), done: any(n, DONE) };
      out.push("\n");
      kids(n, out, opts, s);
      const v = verdictLine(s);
      if (v) out.push("\n" + v);
      out.push("\n");
      if (st) { st.inner = true; if (s.bad) st.bad = true; if (s.ok) st.ok = true; }
      return;
    }
    const d = displayOf(n, opts);
    if (d === "inline") { kids(n, out, opts, st); return; }
    out.push("\n");
    if (d === "row" || t === "TR") kids(n, out, opts, st, t === "TR" ? " | " : " ");
    else kids(n, out, opts, st);
    out.push("\n");
    return;
  }
  kids(n, out, opts, st);
}

function kids(n, out, opts, st, sep) {
  let first = true;
  const list = [];
  // in a row (flex) container each element is one item, and a run of text nodes is ONE item ("3", " ו-", "4")
  for (const c of n.childNodes || []) {
    const prev = list[list.length - 1];
    if (sep && c.nodeType === 3 && prev && prev.nodeType === 3) list[list.length - 1] = { nodeType: 3, nodeValue: prev.nodeValue + c.nodeValue };
    else list.push(c);
  }
  for (const c of list) {
    if (sep) {
      const part = [];
      walk(c, part, opts, st);
      const s = part.join("").replace(/\n+/g, " ").trim();
      if (!s) continue;
      if (!first && !/^[\^_⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/.test(s)) out.push(sep);
      out.push(s);
      first = false;
    } else walk(c, out, opts, st);
  }
}

/* inline content of an element as one line (for sup, sub, roots, fractions, choices) */
function inline(n, opts, st) {
  const part = [];
  kids(n, part, opts, st);
  return finish(part.join("")).replace(/\n/g, " ");
}
/* one element itself (it may be an answer box) as one line */
function one(n, opts, st) {
  const part = [];
  walk(n, part, opts, st);
  return finish(part.join("")).replace(/\n/g, " ");
}

/* the elements that become one token; null = walk into it as usual */
function leaf(n, opts, st) {
  const t = tag(n), c = cls(n);
  if (t === "BR" || t === "HR") return "\n";
  if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") {
    const type = (attr(n, "type") || "").toLowerCase();
    if (type === "hidden") return "";
    if (type === "checkbox" || type === "radio") return checkedOf(n) ? "[✓]" : "[ ]";
    const v = valueOf(n);
    if (st) st.typed.push(v || "ריק");
    if (type === "range") return "[מחוון: " + v + "]";
    return v ? "[" + v + "]" : "[ ]";
  }
  if (t === "BUTTON" || attr(n, "role") === "button") {
    const label = inline(n, opts, null);
    if (!label || has(n, "mp-check") || has(n, "mp-new") || (!isChoice(n, c) && ACTION.test(label))) return "";
    const right = any(n, OK) || c.includes("correct") || c.includes("right");
    const wrong = any(n, BAD) || c.includes("wrong");
    const on = c.some((x) => CHOICE_ON.test(x)) || attr(n, "aria-pressed") === "true" || attr(n, "aria-checked") === "true";
    if (st && (on || right || wrong)) st.picked.push(label);
    if (st && right) st.ok = true;
    if (st && wrong) st.bad = true;
    return " [" + label + (right ? " ✓" : wrong ? " ✗" : on ? " · נבחר" : "") + "] ";
  }
  if (t === "SUP" || t === "SUB") {
    const s = inline(n, opts, st);
    if (!s) return "";
    if (t === "SUP" && /^[0-9\-−]+$/.test(s)) return [...s].map((ch) => SUP[ch]).join("");
    return (t === "SUP" ? "^" : "_") + wrap(s);
  }
  if (c.includes("mp-rad")) {                        // <Root>: src/components/Root.jsx
    const body = [...(n.childNodes || [])].find((k) => k.nodeType === 1 && has(k, "mp-rad-b"));
    return "√" + wrap(body ? inline(body, opts, st) : flat(textOf(n)).replace(/^√/, ""));
  }
  const fr = fraction(n);
  if (fr) return fwrap(one(fr[0], opts, st)) + "/" + fwrap(one(fr[1], opts, st));
  if (t === "SVG") {
    const sign = c.find((x) => SIGN[x]);
    if (sign) return SIGN[sign];
    return " " + drawing(n) + " ";
  }
  if (c.includes("prf-slot")) return "[ ]";
  if (t === "CANVAS") return /three/i.test(attr(n, "data-engine") || "") ? " [ציור תלת־ממד] " : " [ציור] ";
  if (t === "IMG") { const alt = flat(attr(n, "alt")); return alt ? " [תמונה: " + alt + "] " : " [תמונה] "; }
  return null;
}

/* a fraction block: .frac (.frac-num/.frac-den or .num/.den), .mp-frac (-n/-d), .qs-fr, .pp-frac, .nw-fr … */
const FRAC = /^(?:[a-z0-9]+-)?(?:frac|fraction|fr|frin)$/;
const NUM = /(?:^|-)(?:num|numer|n|top)$/;
const DEN = /(?:^|-)(?:den|denom|d|bot|bottom)$/;
function fraction(n) {
  if (!cls(n).some((x) => FRAC.test(x))) return null;
  const el = [...(n.childNodes || [])].filter((k) => k.nodeType === 1);
  const num = el.find((k) => cls(k).some((x) => NUM.test(x)));
  const den = el.find((k) => cls(k).some((x) => DEN.test(x)));
  if (num && den) return [num, den];
  const full = el.filter((k) => flat(textOf(k)) || hasBox(k));
  return full.length === 2 ? full : null;
}
function hasBox(n) {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag(n))) return true;
  return [...(n.childNodes || [])].some((k) => k.nodeType === 1 && hasBox(k));
}

/* an inline drawing: its accessible name and the text labels on it, in order */
function drawing(svg) {
  const labels = [];
  (function walk(n) {
    for (const k of n.childNodes || []) {
      if (k.nodeType !== 1) continue;
      if (tag(k) === "TEXT") { const s = flat(textOf(k)); if (s) labels.push(s); }
      else if (tag(k) !== "TITLE" && tag(k) !== "DESC") walk(k);
    }
  })(svg);
  const name = flat(attr(svg, "aria-label"));
  // a graph's axis numbers (many plain numbers) become one range: "מספרים על הצירים: −8 עד 8"
  const NUMBER = /^[−-]?[0-9]+(?:\.[0-9]+)?$/;
  const nums = labels.filter((x) => NUMBER.test(x));
  let words = labels;
  if (nums.length >= 8) {
    const v = nums.map((x) => +x.replace("−", "-"));
    words = [...labels.filter((x) => !NUMBER.test(x)), "מספרים על הצירים: " + Math.min(...v) + " עד " + Math.max(...v)];
  }
  const all = [name, words.join(", ")].filter(Boolean).join(" · ");
  return all ? "[ציור: " + all + "]" : "[ציור]";
}

function verdictLine(s) {
  const parts = [];
  if (s.typed.length) parts.push("הוקלד: " + s.typed.join(" · "));
  if (s.picked.length) parts.push("נבחר: " + s.picked.join(" · "));
  const asked = parts.length > 0;
  if (!asked && !s.ok && !s.bad && !s.done) return "";
  parts.push("האתר ענה: " + verdictWord(s));
  return parts.join(" · ");
}
const verdictWord = (s) => (s.done ? "נכון" : s.bad ? "לא נכון" : s.ok ? "נכון" : "עוד לא נבדק");

/* ── reading the live frame (browser only) ─────────────────────────────── */
const norm = (t) => flat(t);
/** The place the page is on: the active chapter button and the FULL active sub-tab path (nested tabs too). */
export function readPlace(doc) {
  const root = doc && doc.getElementById("root");
  if (!root) return { chapter: "", subs: [] };
  const ch = root.querySelector(":is(.ch-btn, .nav-btn, .ph).active");
  const subs = [...root.querySelectorAll(":is(.sub-tab, .sub-tab-btn, .sub-btn, .tab).active")].map((b) => norm(b.textContent)).filter(Boolean);
  return { chapter: ch ? norm(ch.textContent) : "", subs };
}

/**
 * Which part of the frame is "the question on screen": the card around the focused answer box (else the
 * first box not in a finished step, else the first card), its active step, and the steps after it (left out).
 * → { root, scope, step, later, shown(el), display(el) } or null. takeSnapshot uses it; so can the panel.
 */
export function pickQuestion(doc, { focused } = {}) {
  const root = doc && doc.getElementById("root");
  if (!root) return null;
  const win = doc.defaultView;
  const shown = (el) => {
    if (el.getClientRects().length) return true;
    try { return win.getComputedStyle(el).display === "contents"; } catch { return false; }
  };
  const BOX = "input:not([type=hidden]):not([type=range]), textarea, select, .choice-btn";
  const boxes = [...root.querySelectorAll(BOX)].filter(shown);
  let a = focused && root.contains(focused) && shown(focused) ? focused : null;
  const act = doc.activeElement;
  if (!a && act && act !== doc.body && root.contains(act) && act.matches(BOX)) a = act;
  if (!a) a = boxes.find((b) => !b.closest(".done, .sol")) || boxes[0] || null;
  if (!a) a = [...root.querySelectorAll(SCOPE_SEL)].find(shown) || root;
  const scope = a.closest(SCOPE_SEL) || a.closest(".content") || root;
  const st = a === scope ? null : a.closest(STEP_SEL);
  const step = st && st !== scope && scope.contains(st) ? st : null;
  const FOLLOWING = 4;
  const later = step ? [...scope.querySelectorAll(STEP_SEL)].filter((x) => x !== step && !x.contains(step) && !step.contains(x) && (step.compareDocumentPosition(x) & FOLLOWING)) : [];
  const display = (el) => {
    let cs; try { cs = win.getComputedStyle(el); } catch { return null; }
    const d = cs.display;
    if (d.startsWith("inline")) return "inline";
    if ((d === "flex" || d === "inline-flex") && cs.flexDirection.startsWith("row") && norm(el.textContent).length <= 160) return "row";
    return "block";
  };
  return { root, scope, step, later, shown, display };
}

/**
 * The question on screen in the frame, frozen as text.
 * focused = the last answer box the admin focused in the frame (the panel tracks focusin), if any.
 * → { text, title, step, stepShort, verdict, typed, picked, chapter, subs, at } or null (no topic page)
 */
export function takeSnapshot(doc, { focused } = {}) {
  const pick = pickQuestion(doc, { focused });
  if (!pick) return null;
  const { scope, step, later, shown, display } = pick;
  const opts = { skip: (el) => !shown(el) || later.includes(el), display };
  const text = serialize(scope, opts);
  // the active step's own verdict (for the "where" line and the card in the panel)
  const s = blank();
  const target = step || scope;
  walk(target, [], { ...opts, verdicts: false }, s);
  if (any(target, OK)) s.ok = true;
  if (any(target, BAD)) s.bad = true;
  if (any(target, DONE)) s.done = true;
  const labelEl = step ? [...step.querySelectorAll(".step-label, .phase-title, .card-t, .section-title, .task-title, .card-title")][0] : null;
  const titleEl = scope.querySelector(".card-t, .section-title, .task-title, .card-title, .nw-tag");
  const stepLabel = labelEl ? norm(labelEl.textContent) : "";
  const place = readPlace(doc);
  return {
    text, title: titleEl ? norm(titleEl.textContent) : "", step: stepLabel, stepShort: shortStep(stepLabel),
    verdict: verdictWord(s), typed: s.typed, picked: s.picked, chapter: place.chapter, subs: place.subs,
    key: proofKey(doc), at: Date.now(),
  };
}
/** The proofs section rebuilds a proof exactly from its key (data-pf on the open proof, src/topics/proofs/ProofScreen.jsx):
    → { template, seed, level, variant } or null. keyLine() writes it for the body. */
export function proofKey(doc) {
  try {
    const el = doc.querySelector("#root .prf-screen[data-pf]");
    const k = el && JSON.parse(el.getAttribute("data-pf"));
    return k && k.template ? { template: String(k.template), seed: k.seed, level: k.level, variant: k.variant } : null;
  } catch { return null; }
}
export const keyLine = (k) => (k && k.template ? "מפתח: " + k.template + ":" + k.seed + (k.level ? " · רמה " + k.level : "") + (k.variant ? " · וריאנט " + k.variant : "") : "");

/** "שלב 1 — מצא את המעריך" → "שלב 1"; any other label, up to 40 characters */
export function shortStep(label) {
  const l = norm(label);
  const m = /^(שלב\s*[0-9]+|חלק\s*[א-ת0-9]+)/.exec(l);
  return m ? m[1] : l.length > 40 ? l.slice(0, 39) + "…" : l;
}

/* ── the deep link and the request ─────────────────────────────────────── */
/* only what would break the link in the board's text (src/admin/files.js linkify) or its query: spaces,
   & # % + = ? quotes, brackets; Hebrew stays readable (norm() already made every space a plain one) */
const q = (s) => norm(s).replace(/[%&#+=?"'<>`()[\]\s]/g, (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));
/** /topics/<slug>?ch=<chapter>&sub=<a › b> — what TopicView opens (src/components/TopicView.jsx) */
export function questionLink({ slug, chapter, subs = [], origin = SITE }) {
  let u = String(origin || SITE).replace(/\/+$/, "") + "/topics/" + slug;
  const p = [];
  if (chapter) p.push("ch=" + q(chapter));
  if (subs && subs.length) p.push("sub=" + q(subs.join(" › ")));
  return p.length ? u + "?" + p.join("&") : u;
}

/** "טלפון 393×852" / "מחשב 1440×900" (pass the panel's window) */
export function deviceLine(win) {
  try {
    const w = Math.round(win.innerWidth), h = Math.round(win.innerHeight);
    const phone = (win.matchMedia && win.matchMedia("(pointer: coarse)").matches) || w < 768;
    return (phone ? "טלפון " : "מחשב ") + w + "×" + h;
  } catch { return ""; }
}

export const LEVELS = ["site", "grade", "topic", "chapter", "sub", "question"];
export const QUESTION_PLACE = "השאלה שעל המסך";

/**
 * One request at any level → the fix_items fields (no change to the table or the morning job; design §8).
 *   level     "site" | "grade" | "topic" | "chapter" | "sub" | "question"
 *   grade     "כיתה ח׳" (omit for hidden modules that have no grade yet)
 *   slug      registry slug (topic and below); topicName = its short Hebrew name ("חזקות ושורשים")
 *   chapter   exact chapter-button text; subs = the sub-tab path (["3. חזקה של חזקה"])
 *   reason    one of the reason chips (optional); text = the sentence (optional; one of the two is needed)
 *   snapshot  takeSnapshot(...) result (question level)
 *   device    deviceLine(window); version = siteVersion(); origin for the link (default the live site)
 *   extra     more fixed lines before the link, e.g. ["מפתח: 3-X-SAS:20261121 · רמה 2 · וריאנט 1"] (proofs)
 * → { topic, section, body } or { error: "empty" | "level" | "topic" }
 */
export function buildRequest(r) {
  const level = r.level;
  if (!LEVELS.includes(level)) return { error: "level" };
  const reason = flat(r.reason), text = String(r.text || "").trim();
  if (!reason && !text) return { error: "empty" };
  const atTopic = level !== "site" && level !== "grade";
  if (atTopic && !r.slug) return { error: "topic" };
  const subs = (r.subs || []).map(norm).filter(Boolean);
  const chapter = norm(r.chapter);
  const grade = norm(r.grade);
  if ((level === "chapter" && !chapter) || (level === "sub" && !subs.length) || (level === "grade" && !grade)) return { error: "level" };
  const where = [];
  if (level === "site") where.push("כל האתר");
  else {
    if (grade) where.push(grade);
    if (atTopic) where.push(norm(r.topicName) || r.slug);
    if (level === "chapter" || level === "sub" || level === "question") { if (chapter) where.push(chapter); }
    if (level === "sub" || level === "question") where.push(...subs);
    if (level === "question") { where.push(QUESTION_PLACE); if (r.snapshot && r.snapshot.stepShort) where.push(r.snapshot.stepShort); }
  }
  const topic = atTopic ? r.slug : "general";
  const section = level === "grade" ? grade + " · כל הכיתה"
    : level === "chapter" ? chapter
    : level === "sub" || level === "question" ? [chapter, ...subs].filter(Boolean).join(" › ")
    : "";
  const lines = ["איפה: " + where.join(" › ")];
  if (reason) lines.push("סוג: " + reason);
  if (text) lines.push("מה לתקן: " + text.replace(/\s*\n\s*/g, " "));
  if (level === "question" && r.snapshot && r.snapshot.text) lines.push("", "השאלה כמו שהופיעה:", r.snapshot.text);
  const tail = [...(r.extra || [])];
  if (level === "question" && r.snapshot && r.snapshot.key) tail.unshift(keyLine(r.snapshot.key));
  if (atTopic) tail.push("קישור: " + questionLink({ slug: r.slug, chapter: level === "topic" ? "" : chapter, subs: level === "sub" || level === "question" ? subs : [], origin: r.origin }));
  tail.push(["נשלח מבקרת התוכן", r.device, r.version ? "גרסה " + r.version : ""].filter(Boolean).join(" · "));
  lines.push("", ...tail);
  return { topic, section, body: lines.join("\n") };
}
