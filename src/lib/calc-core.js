/* The calculator's brain (src/components/Calculator.jsx): a tiny, safe expression parser.
   No eval / new Function: the text is split into tokens and read by hand.
   Tests: node --test src/lib/calc-core.test.mjs

   Grammar (lowest → highest):
     expr    := term (("+" | "−") term)*            a ± b%  means  a ± a·b/100  (like a phone calculator)
     term    := unary (("×" | "÷") unary | primary-start)*     "2π", "3(4+1)", "(2)(3)" multiply
     unary   := ("−" | "+") unary | postfix                    so −3² = −9 and (−3)² = 9
     postfix := primary ("²" | "%")*
     primary := number | "π" | "(" expr ")" | "√" primary
   Missing ")" at the end are closed for the student. */

const BIN = "+−×÷";
const ALIAS = { "-": "−", "*": "×", "/": "÷", ",": ".", "x": "×", "X": "×", ":": "÷" };

function tokenize(src) {
  const out = [];
  const s = String(src == null ? "" : src);
  for (let i = 0; i < s.length;) {
    let c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (ALIAS[c]) c = ALIAS[c];
    if (/[0-9.]/.test(c)) {
      let j = i, text = "";
      while (j < s.length && /[0-9.,]/.test(s[j])) { text += s[j] === "," ? "." : s[j]; j++; }
      if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return null; // "1.2.3", "."
      out.push({ t: "num", v: parseFloat(text) });
      i = j; continue;
    }
    if ("+−×÷()²%π√".includes(c)) { out.push({ t: c }); i++; continue; }
    return null; // a character the calculator does not know
  }
  return out;
}

class CalcError extends Error { constructor(code) { super(code); this.code = code; } }

function parse(tokens) {
  let p = 0;
  const peek = () => (p < tokens.length ? tokens[p].t : null);
  const startsPrimary = (t) => t === "num" || t === "π" || t === "(" || t === "√";

  function primary() {
    const tk = tokens[p];
    if (!tk) throw new CalcError("syntax");
    if (tk.t === "num") { p++; return tk.v; }
    if (tk.t === "π") { p++; return Math.PI; }
    if (tk.t === "(") {
      p++;
      const v = expr();
      if (peek() === ")") p++;
      else if (peek() !== null) throw new CalcError("syntax"); // only the END may miss its ")"
      return v;
    }
    if (tk.t === "√") {
      p++;
      const v = primary();
      if (v < 0) throw new CalcError("undefined");
      return Math.sqrt(v);
    }
    throw new CalcError("syntax");
  }
  // → { v, pct }: pct = the value was written as a bare percent ("10%")
  function postfix() {
    let v = primary(), pct = false;
    while (peek() === "²" || peek() === "%") {
      if (tokens[p].t === "²") { v = v * v; pct = false; } else { v = v / 100; pct = true; }
      p++;
    }
    return { v, pct };
  }
  function unary() {
    if (peek() === "−") { p++; const u = unary(); return { v: -u.v, pct: false }; }
    if (peek() === "+") { p++; const u = unary(); return { v: u.v, pct: false }; }
    return postfix();
  }
  function term() {
    let left = unary();
    for (;;) {
      const t = peek();
      if (t === "×") { p++; left = { v: left.v * unary().v, pct: false }; }
      else if (t === "÷") {
        p++;
        const d = unary().v;
        if (d === 0) throw new CalcError("undefined");
        left = { v: left.v / d, pct: false };
      }
      else if (startsPrimary(t)) { left = { v: left.v * postfix().v, pct: false }; } // 2π, 3(4+1)
      else return left;
    }
  }
  function expr() {
    let v = term().v;
    while (peek() === "+" || peek() === "−") {
      const op = tokens[p].t; p++;
      const r = term();
      const b = r.pct ? v * r.v : r.v; // 200 + 10% → 200 + 20
      const sum = op === "+" ? v + b : v - b;
      // 0.1 + 0.2 − 0.3 must be 0, not 5.5e-17
      v = Math.abs(sum) < 1e-12 * Math.max(Math.abs(v), Math.abs(b)) ? 0 : sum;
    }
    return v;
  }

  const v = expr();
  if (p < tokens.length) throw new CalcError("syntax");
  return v;
}

/** "3²+4²" → { ok: true, value: 25 } · { ok: false, error: "empty" | "syntax" | "undefined" | "big" } */
export function evaluate(src) {
  const tokens = tokenize(src);
  if (!tokens) return { ok: false, error: "syntax" };
  if (!tokens.length) return { ok: false, error: "empty" };
  try {
    const raw = parse(tokens);
    if (Number.isNaN(raw)) return { ok: false, error: "undefined" };
    if (!Number.isFinite(raw) || Math.abs(raw) >= 1e100) return { ok: false, error: "big" };
    return { ok: true, value: round(raw) };
  } catch (e) {
    if (e instanceof CalcError) return { ok: false, error: e.code };
    throw e;
  }
}

/** 10 meaningful digits: 0.1 + 0.2 → 0.3, 1 ÷ 3 → 0.3333333333. Whole numbers stay exact. */
export function round(v) {
  if (!Number.isFinite(v) || v === 0) return v === 0 ? 0 : v;
  if (Number.isSafeInteger(v)) return v;
  return Number(v.toPrecision(10));
}

const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

/** A number the calculator can read back ("−0.75", never "1e+21"). */
export function plain(v) {
  const r = round(v);
  if (r === 0) return "0";
  let s = Number.isSafeInteger(r)
    ? String(Math.abs(r))
    : Math.abs(r).toLocaleString("en-US", { useGrouping: false, maximumSignificantDigits: 10 });
  if (/e/i.test(s)) s = String(Math.abs(r));
  return (r < 0 ? "−" : "") + s;
}

/** A number for the screen: very big / very small ones as 1.5×10¹⁵ (raised power, never "^"). */
export function format(v) {
  const r = round(v);
  const a = Math.abs(r);
  if (a !== 0 && (a >= 1e15 || a < 1e-6)) {
    const [m, e] = r.toExponential(9).split("e");
    const mant = String(Number(m)).replace("-", "−");
    const exp = String(Number(e)).split("").map((ch) => SUP[ch]).join("");
    return mant + "×10" + exp;
  }
  return plain(r);
}

/** The Hebrew line for an error (empty → nothing to say). */
export function errorText(code) {
  if (code === "undefined") return "לא מוגדר";
  if (code === "big") return "מספר גדול מדי";
  if (code === "syntax") return "ביטוי לא שלם";
  return "";
}

/* ── editing the expression, key by key (pure, so it is tested too) ───────── */

const MAX_LEN = 48;
const endsOperand = (s) => /[0-9.)π²%]$/.test(s);
const openParens = (s) => (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;

/** One key press. `fresh` = the text is a result just shown by "=" (a digit then starts over). */
export function pressKey(expr, key, fresh) {
  let s = expr || "";
  if (key === "C") return "";
  if (key === "⌫") return s.endsWith("√(") ? s.slice(0, -2) : s.slice(0, -1);
  if (key === "±") return toggleSign(s);
  const startsNew = /^[0-9.π√(]$/.test(key);
  if (fresh && startsNew) s = "";
  if (s.length >= MAX_LEN) return s;

  if (/^[0-9]$/.test(key)) return s + key;
  if (key === ".") {
    const cur = (s.match(/[0-9.]*$/) || [""])[0];
    if (cur.includes(".")) return s;
    return s + (cur === "" ? "0." : ".");
  }
  if (key === "π") return s + "π";
  if (key === "√") return s + "√(";
  if (key === "(") return s + "(";
  if (key === ")") return openParens(s) > 0 && endsOperand(s) ? s + ")" : s;
  if (key === "²" || key === "%") return endsOperand(s) && !s.endsWith(".") ? s + key : s;
  if (BIN.includes(key)) {
    if (s === "" || s.endsWith("(")) return key === "−" ? s + "−" : s;
    if (BIN.includes(s.slice(-1))) {
      // "5×" then "−" → 5×−…; any other pair: the new sign replaces the old one
      if (key === "−" && "×÷".includes(s.slice(-1))) return s + "−";
      let cut = s.slice(0, -1);
      if (BIN.includes(cut.slice(-1))) cut = cut.slice(0, -1); // "5×−" then "+" → "5+"
      if (cut === "" || cut.endsWith("(")) return key === "−" ? cut + "−" : cut;
      return cut + key;
    }
    return s + key;
  }
  return s;
}

/** ±: flips the sign of the last number ("5×3" → "5×(−3" → "5×3"; "−8" → "8"). */
export function toggleSign(s) {
  const m = s.match(/([0-9.]+|π)$/);
  if (!m) return s === "" ? "−" : s === "−" ? "" : s;
  const head = s.slice(0, s.length - m[0].length);
  if (head.endsWith("(−")) return head.slice(0, -2) + m[0];
  if (head === "−") return m[0];
  if (head === "") return "−" + m[0];
  return head + "(−" + m[0];
}

/** The text with its missing ")" added, as it is kept in the history. */
export function closed(s) {
  const n = openParens(s);
  return n > 0 ? s + ")".repeat(n) : s;
}

/** Putting an earlier result back into the text: after a sign or "(" it joins, otherwise it starts over. */
export function insertValue(expr, value, fresh) {
  const txt = plain(value);
  if (fresh || !expr || endsOperand(expr)) return txt;
  if (txt.startsWith("−") && /[+−]$/.test(expr)) return expr + "(" + txt;
  return expr + txt;
}
