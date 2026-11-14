/* Square roots in strings (fixes board #65): turns "√(b²−4ac)", "√49", "2√3", "√(x^4)" into
   a small tree that src/components/Root.jsx draws as a real root sign whose top bar covers
   everything under it. Pure functions, no React (tested: root-core.test.mjs).

   parseRoots(s, {pow})  →  nodes: {t:"txt", v} · {t:"root", b:[nodes]} · {t:"sup", v} · {t:"ltr", b:[nodes]}
     "√( … )"  → root over the inside (the brackets go away: the bar does their job)
     "√49" "√x" "√Δ" "√n²" "√?"  → root over that one number / letter (with its ² or ³)
     "√" alone (nothing to cover) stays as typed
     pow: "x^12", "2^(−3)", "x^?" → a raised exponent (same rules as the powers topic's Mx)
     ltr: a formula with a root inside a Hebrew sentence is kept together, left to right. */

const HEB = /[֐-׿]/;
const TOKEN = /^(\d+(?:\.\d+)?|[A-Za-zΔα-ω?])[²³]?/;

function parse(s, pow) {
  const out = [];
  let buf = "", i = 0;
  const flush = () => { if (buf) { out.push({ t: "txt", v: buf }); buf = ""; } };
  while (i < s.length) {
    const ch = s[i];
    if (ch === "√") {
      let j = i + 1;
      if (s[j] === "(") {
        let d = 1, k = j + 1;
        while (k < s.length && d > 0) { if (s[k] === "(") d++; else if (s[k] === ")") d--; k++; }
        const closed = d === 0;
        const inner = s.slice(j + 1, closed ? k - 1 : k).trim();
        if (inner) {
          flush();
          out.push({ t: "root", b: parse(inner, pow) });
          i = k;
          continue;
        }
      } else {
        const m = TOKEN.exec(s.slice(j));
        if (m) {
          flush();
          out.push({ t: "root", b: [{ t: "txt", v: m[0] }] });
          i = j + m[0].length;
          continue;
        }
      }
      buf += ch; i++;
      continue;
    }
    if (pow && ch === "^") {
      let e = ""; i++;
      if (s[i] === "(") { let d = 1; i++; while (i < s.length) { if (s[i] === "(") d++; else if (s[i] === ")") { d--; if (d === 0) { i++; break; } } e += s[i]; i++; } }
      else if (/[0-9]/.test(s[i] || "")) { while (i < s.length && /[0-9]/.test(s[i])) { e += s[i]; i++; } }
      else { e = s[i] || ""; i++; }
      flush(); out.push({ t: "sup", v: e });
      continue;
    }
    buf += ch; i++;
  }
  flush();
  return out;
}

const hasRoot = (nodes) => nodes.some((n) => n.t === "root");

/* unbalanced brackets at the edges of a formula run belong to the sentence, not to the formula */
function balance(str) {
  let d = 0, min = 0;
  for (const c of str) { if (c === "(") d++; else if (c === ")") { d--; if (d < min) min = d; } }
  return { open: d - min, close: -min };   // open: "(" never closed · close: ")" never opened
}

/* Keep every formula that has a root together, left to right, inside right-to-left text:
   the Latin letters / numbers / signs touching the root join it (up to the nearest Hebrew letter). */
function group(nodes) {
  if (!hasRoot(nodes)) return nodes;
  const out = [];
  let run = null;           // nodes of the current ltr run
  const close = (atHebrew) => {
    if (!run) return;
    // give the sentence its punctuation back (before Hebrew: also the signs that lead into it)
    const END = atHebrew ? /[\s=:,.;×·÷+*/−-]+$/ : /[\s:,.;]+$/;
    let tail = "";
    const last = run[run.length - 1];
    if (last.t === "txt") {
      const m = END.exec(last.v);
      if (m) { tail = m[0]; last.v = last.v.slice(0, -tail.length); }
      if (!last.v) run.pop();
    }
    const flat = run.map((n) => (n.t === "txt" ? n.v : "")).join("");
    let { close: extra } = balance(flat);
    const l2 = run[run.length - 1];
    while (extra > 0 && l2 && l2.t === "txt" && /\)\s*$/.test(l2.v)) {
      const m = /\)\s*$/.exec(l2.v); tail = m[0] + tail; l2.v = l2.v.slice(0, -m[0].length); extra--;
      const m2 = END.exec(l2.v); if (m2) { tail = m2[0] + tail; l2.v = l2.v.slice(0, -m2[0].length); }
    }
    if (l2 && l2.t === "txt" && !l2.v) run.pop();
    out.push({ t: "ltr", b: run });
    if (tail) out.push({ t: "txt", v: tail });
    run = null;
  };
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.t === "root") {
      if (!run) {
        run = [];
        // pull the Latin part of the text just before the root into the run
        const prev = out[out.length - 1];
        if (prev && prev.t === "sup") { /* "x^2√3": rare; leave the power outside */ }
        if (prev && prev.t === "txt") {
          let k = prev.v.length;
          while (k > 0 && !HEB.test(prev.v[k - 1]) && prev.v[k - 1] !== ":" && prev.v[k - 1] !== ";") k--;   // a formula never crosses Hebrew, ":" or ";"
          let head = prev.v.slice(k);
          if (k > 0) {                       // stopped by Hebrew: sentence signs stay in the sentence
            const m = /^[\s=:,.;×·÷+*/_]+/.exec(head);
            if (m) { k += m[0].length; head = head.slice(m[0].length); }
          } else {
            const m = /^\s+/.exec(head);
            if (m) { k += m[0].length; head = head.slice(m[0].length); }
          }
          // an opening bracket that the run never closes belongs to the sentence
          const rest = nodes.slice(i).map((x) => (x.t === "txt" ? x.v : "")).join("");
          const cut = HEB.test(rest) ? rest.slice(0, rest.search(HEB)) : rest;
          let { open } = balance(head + cut);
          while (open > 0 && /^\(\s*/.test(head)) { const m = /^\(\s*/.exec(head); k += m[0].length; head = head.slice(m[0].length); open--; }
          if (head) {
            if (k > 0) prev.v = prev.v.slice(0, k); else out.pop();
            run.push({ t: "txt", v: head });
          }
        }
      }
      run.push(n);
      continue;
    }
    if (run) {
      if (n.t === "sup") { run.push(n); continue; }
      // text after a root: the part before the first Hebrew letter stays in the run
      const k = n.v.search(HEB);
      if (k < 0) { run.push({ t: "txt", v: n.v }); continue; }
      const head = n.v.slice(0, k);
      if (head) run.push({ t: "txt", v: head });
      close(true);
      out.push({ t: "txt", v: n.v.slice(k) });
      continue;
    }
    out.push(n.t === "txt" ? { t: "txt", v: n.v } : n);
  }
  close();
  return out;
}

/** the tree for a string. opts.pow: also raise "^" exponents. opts.flat: no ltr grouping (the caller is already left-to-right). */
export function parseRoots(s, opts = {}) {
  const str = String(s == null ? "" : s);
  const nodes = parse(str, !!opts.pow);
  return opts.flat ? nodes : group(nodes);
}

/** plain text of the tree (tests, aria): root over "b²−4ac" → "√(b²−4ac)", over "49" → "√49" */
export function rootsToText(nodes) {
  return nodes.map((n) =>
    n.t === "txt" ? n.v :
    n.t === "sup" ? "^" + (n.v.length > 1 ? "(" + n.v + ")" : n.v) :
    n.t === "ltr" ? rootsToText(n.b) :
    (() => { const b = rootsToText(n.b); return TOKEN.exec(b)?.[0] === b ? "√" + b : "√(" + b + ")"; })()
  ).join("");
}
