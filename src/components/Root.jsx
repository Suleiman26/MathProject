'use client';
/* The square-root sign, drawn like in a textbook (fixes board #65): the hook plus a top bar
   that covers EVERYTHING under the root, at any size — numbers, b² − 4ac, stacked fractions,
   answer boxes, another root.

   <Root>b² − 4ac</Root>                  the sign over any content
   <Root row>…boxes and signs…</Root>     content laid out in a centred row (inputs inside)
   <RootText s="2√3 + √(x^4)" pow />      a string: every "√(…)" / "√49" becomes a real root;
                                          pow also raises "^" exponents. In Hebrew sentences each
                                          formula with a root is kept together left-to-right.
   Parsing: src/lib/root-core.js (tested). Styles: src/styles/root.css (.mp-rad*). */
import "@/styles/root.css";
import { parseRoots } from "@/lib/root-core";

export function Root({ children, row, className = "" }) {
  return (
    <span className={"mp-rad" + (row ? " mp-rad--row" : "") + (className ? " " + className : "")} dir="ltr">
      <span className="mp-rad-t">√</span>
      <svg className="mp-rad-s" viewBox="0 0 14 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M1 18.4 L3.7 16.8 L7.4 28.8 L14 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="mp-rad-b">{children}</span>
    </span>
  );
}

function Nodes({ nodes }) {
  const out = [];
  let skip = -1;
  nodes.forEach((n, i) => {
    if (i === skip) return;
    if (n.t === "sup") out.push(<sup key={i}>{n.v}</sup>);
    else if (n.t === "ltr") out.push(<span key={i} className="mp-mx" dir="ltr"><Nodes nodes={n.b} /></span>);
    else if (n.t === "root") out.push(<Root key={i}><Nodes nodes={n.b} /></Root>);
    else {
      // a coefficient never leaves its root at a line break: "2√3", "a√2"
      const m = nodes[i + 1] && nodes[i + 1].t === "root" ? /[0-9A-Za-z.]+$/.exec(n.v) : null;
      if (!m) { out.push(n.v); return; }
      if (m.index) out.push(n.v.slice(0, m.index));
      out.push(<span key={i} className="mp-nb">{m[0]}<Root><Nodes nodes={nodes[i + 1].b} /></Root></span>);
      skip = i + 1;
    }
  });
  return out;
}

/* flat: the caller is already a left-to-right formula (no grouping needed) */
export function RootText({ s, pow, flat }) {
  return <Nodes nodes={parseRoots(s, { pow, flat })} />;
}

export default Root;
