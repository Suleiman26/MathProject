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
  return splitProse(s).map((p) => (p.math ? mathToText(p.v) : p.v)).join("");
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

/** the prompt's size step on the arena card (CSS .dar-prompt.sz-*): short prose big (2rem at 375 px),
    long prose smaller so 4 lines + the keypad still fit a phone; short math-only prompts
    the biggest (the mockup's 44 px) */
export function promptSize(text) {
  const t = String(text == null ? "" : text);
  const n = t.replace(/\\(frac|sqrt)|[$\{\}]/g, "").replace(/\s+/g, " ").trim().length;
  // the longest island never wraps on its own (.dmx is nowrap): a long expression takes a smaller step
  const island = Math.max(0, ...splitProse(t).filter((p) => p.math).map((p) => mathLength(p.v)));
  const step = isMathOnly(t) ? (n <= 12 ? 0 : n <= 20 ? 1 : 2) : (n <= 34 ? 1 : n <= 62 ? 2 : 3);
  const need = island > 20 ? 3 : island > 14 ? 2 : 0;
  return ["xl", "s", "m", "l"][Math.max(step, need)];
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
