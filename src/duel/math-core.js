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
