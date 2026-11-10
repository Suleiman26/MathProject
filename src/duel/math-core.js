/* The duel question markup → a small tree (no React: math-core.test.mjs runs it).
   Prompts are Hebrew with math inside $…$; choices are plain math without $.
   Inside math (Task 2's registry.js): \frac{a}{b}, x^{n} (or x^2), \sqrt{n},
   π, °, the real minus "−", "·", "×", "÷", " : " ratios, letters.

   splitProse("פתרו: $2x + 4 = 7$ — $x = ?$")
     → [{ math: false, v: "פתרו: " }, { math: true, v: "2x + 4 = 7" }, { math: false, v: " — " }, …]
   parseMath("\\frac{1}{64} + 2^{3}")
     → [{ t: "frac", n: [txt "1"], d: [txt "64"] }, { t: "txt", v: " + 2" }, { t: "sup", b: [txt "3"] }]
   Node types: txt {v} · frac {n, d} · sqrt {b} · sup {b}.
   Anything unbalanced is kept as text (never throws). */

export function splitProse(s) {
  const src = String(s == null ? "" : s);
  const out = [];
  let i = 0, text = "";
  while (i < src.length) {
    const ch = src[i];
    if (ch === "$") {
      const j = src.indexOf("$", i + 1);
      if (j < 0) { text += src.slice(i); break; }          // unbalanced: plain text
      if (text) { out.push({ math: false, v: text }); text = ""; }
      const body = src.slice(i + 1, j).trim();
      if (body) out.push({ math: true, v: body });
      i = j + 1;
      continue;
    }
    text += ch;
    i++;
  }
  if (text) out.push({ math: false, v: text });
  return out;
}

// the {…} group starting at src[i] === "{" → [inner, indexAfter] or null
function group(src, i) {
  if (src[i] !== "{") return null;
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") { depth--; if (depth === 0) return [src.slice(i + 1, j), j + 1]; }
  }
  return null;
}

export function parseMath(s) {
  const src = String(s == null ? "" : s);
  const out = [];
  let text = "";
  const flush = () => { if (text) { out.push({ t: "txt", v: text }); text = ""; } };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") {
      if (src.startsWith("\\frac", i)) {
        const a = group(src, i + 5);
        const b = a && group(src, a[1]);
        if (b) { flush(); out.push({ t: "frac", n: parseMath(a[0]), d: parseMath(b[0]) }); i = b[1]; continue; }
      }
      if (src.startsWith("\\sqrt", i)) {
        const a = group(src, i + 5);
        if (a) { flush(); out.push({ t: "sqrt", b: parseMath(a[0]) }); i = a[1]; continue; }
      }
      // unknown command: keep its name as text (without the backslash)
      const m = /^\\([a-zA-Z]+)/.exec(src.slice(i));
      if (m) { text += m[1]; i += m[0].length; continue; }
      text += ch; i++; continue;
    }
    if (ch === "^") {
      const a = group(src, i + 1);
      if (a) { flush(); out.push({ t: "sup", b: parseMath(a[0]) }); i = a[1]; continue; }
      const m = /^\^(−?[0-9a-zA-Z?]+)/.exec(src.slice(i));
      if (m) { flush(); out.push({ t: "sup", b: [{ t: "txt", v: m[1] }] }); i += m[0].length; continue; }
      text += ch; i++; continue;
    }
    text += ch; i++;
  }
  flush();
  return out;
}

/** plain text of a math string (for aria-labels / tests): \frac{1}{2} → "1/2", 2^{3} → "2^3", \sqrt{9} → "√9" */
export function mathToText(s) {
  const walk = (nodes) => nodes.map((n) =>
    n.t === "txt" ? n.v :
    n.t === "frac" ? walk(n.n) + "/" + walk(n.d) :
    n.t === "sqrt" ? "√" + walk(n.b) :
    n.t === "sup" ? "^" + walk(n.b) : "").join("");
  return walk(parseMath(s));
}

/** the whole prompt as plain text */
export function proseToText(s) {
  return promptLines(s).map((l) => splitProse(l).map((p) => (p.math ? mathToText(p.v) : p.v)).join("")).join(" ");
}

/** A prompt can have lines ("\n"): words first, then each formula on its own line, like a
    textbook ("מה ערך ה-$x$ בנקודת החיתוך?\n$y = x + 1$\n$y = 3x − 5$"). Empty lines are dropped. */
export function promptLines(text) {
  return String(text == null ? "" : text).split("\n").map((l) => l.trim()).filter(Boolean);
}

/** A question's unit (payload.display.unit) shown after every answer — the choices stay pure
    numbers (the anti-guessing guard and the answer check read them), the screen adds the unit:
    "60" + "°" → "60°", "40%", "84 ₪", "12π" ("1" → "π", "−1" → "−π"). Unknown unit → unchanged. */
export const UNITS = ["°", "%", "₪", "π", "√3"];
export function withUnit(src, unit) {
  const s = String(src == null ? "" : src);
  if (!unit || !UNITS.includes(unit) || s === "") return s;
  if (unit === "π") return s === "1" ? "π" : s === "−1" || s === "-1" ? "−π" : s + "π";
  if (unit === "√3") return (s === "1" ? "" : s) + "\\sqrt{3}";   // "100√3"
  if (unit === "₪") return s + " ₪";
  return s + unit;
}

/** is this math "short" (a bare number / expression) — used to size choice buttons */
export function mathLength(s) {
  return mathToText(s).replace(/\s+/g, "").length;
}

/** a prompt with no words, only math */
export function isMathOnly(text) {
  const parts = splitProse(text);
  return parts.length > 0 && parts.every((p) => p.math || !p.v.trim());
}

/** The ask line's size step on the arena card (CSS .dar-prompt.sz-*), from the WORDS only
    (2026-11-10 question UI: the formula rows have their own fixed size, --q-math, and
    Arena's useFitPrompt shrinks only them — so a long expression never makes the words
    smaller, and the math is always bigger than the words).
    "xl" = a prompt with no words at all (one big formula); otherwise s / m / l by the
    length of the prose lines (inline islands count as part of their line). */
export function promptSize(text) {
  const t = String(text == null ? "" : text);
  if (isMathOnly(t)) return "xl";
  const len = (s) => s.replace(/\\(frac|sqrt)|[$\{\}]/g, "").replace(/\s+/g, " ").trim().length;
  const words = promptLines(t).filter((l) => !isMathOnly(l)).map(len).reduce((a, b) => a + b, 0);
  return words <= 34 ? "s" : words <= 62 ? "m" : "l";
}

/** The three roles of a prompt line (question UI spec §4.2):
    'ask'    — a prose line (has words): what to do;
    'eq'     — a math-only formula row: what to work with (the hero);
    'target' — the LAST line, math-only and short, naming the asked quantity: "$b = ?$",
               "$S = ?π$", "$V = ?\\sqrt{3}$", "$? °$" — or a short "… = ?" when a formula row
               comes before it. A typed question shows its answer slot in place of the target.
    A prompt's only line is never a target (it is the whole question). */
const TARGET_RES = [
  /^[A-Za-zα-ω][₀-₉]?\s*=\s*\?(\s*[°%₪π]|\s*\\sqrt\{3\})?$/,
  /^\?\s*[°%π]?$/,
];
const mathBody = (line) => splitProse(line).filter((p) => p.math).map((p) => p.v).join(" ").trim();
export function lineRole(line, i = 0, lines = [line]) {
  if (!isMathOnly(line)) return "ask";
  const n = lines.length;
  if (n > 1 && i === n - 1) {
    const body = mathBody(line);
    if (TARGET_RES.some((re) => re.test(body))) return "target";
    if (/=\s*\?$/.test(body) && mathLength(body) <= 8 && lines.slice(0, i).some((l) => isMathOnly(l))) return "target";
  }
  return "eq";
}

/** a target line split around its "?": "$S = ?π$" → { before: "S =", after: "π" } (math strings) */
export function targetParts(line) {
  const body = mathBody(line);
  const k = body.indexOf("?");
  if (k < 0) return { before: body, after: "" };
  return { before: body.slice(0, k).trim(), after: body.slice(k + 1).trim() };
}

/** Display-only tidy of prompt lines (proseToText keeps the original for aria): a prose line that
    ends with a math island followed only by ":" loses that colon when more lines follow — in RTL
    the colon would land on the far side of the LTR island (":x² + bx + c = 0 לצורה"), and the
    next line (a formula row) needs no colon. */
export function tidyLines(lines) {
  const ls = Array.isArray(lines) ? lines : promptLines(lines);
  return ls.map((l, i) => (i < ls.length - 1 && !isMathOnly(l) && /\$\s*:\s*$/.test(l) ? l.replace(/\s*:\s*$/, "") : l));
}

/** Break chances inside one math island, used only if even the smallest size can't fit it:
    every space becomes a no-break space except the one right BEFORE an operator, so a
    line can only end before "−", "+", "×", "÷", "=" … and the operator starts the next line
    ("−1 × (−27) ÷ 3 + (−15)" / "− (−13) = ?"), never a dangling "−" at a line end. */
export function mathBreaks(s) {
  return String(s == null ? "" : s)
    .replace(/ (?=[−+×÷=·:<>≤≥≠-] )/g, "\u0001")
    .replace(/ /g, "\u00a0")
    .replace(/\u0001/g, " ");
}

/** Shrink-to-fit for the prompt: widest = the widest math island (px), avail = the card's width,
    fontPx = the prompt's step size. → { fontPx, wrap }: unchanged when it fits; else scaled down
    (never under floorPx ≈ 1.2rem); only when even the floor can't hold it → wrap (before operators)
    at a readable size (≤ 24 px). */
export function fitPrompt({ widest, avail, fontPx, floorPx = 19.2 }) {
  if (!(widest > 0) || !(avail > 0) || widest <= avail) return { fontPx, wrap: false };
  const scaled = Math.floor((fontPx * avail / widest) * 0.97 * 10) / 10;
  if (scaled >= floorPx) return { fontPx: scaled, wrap: false };
  return { fontPx: Math.max(floorPx, Math.min(fontPx, 24)), wrap: true };
}
