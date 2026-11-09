'use client';
/* Duels: the question markup on screen. Hebrew prose stays RTL; every $…$
   island is an LTR block; fractions stack, roots get their bar, exponents
   rise. Parsing: ./math-core.js (tested). Styles: src/styles/duel-arena.css
   (.dmx* — a private prefix: the admin has its own .mt, topic pages a .mx).

   <MathText text="חזקה שלילית: $4^{−3} = ?$" />     prose with islands
   <MathSpan src="\frac{1}{64}" />                      one plain-math string (a choice) */
import { splitProse, parseMath, mathToText, proseToText, isMathOnly } from "./math-core";

function Nodes({ nodes }) {
  return nodes.map((n, i) => {
    if (n.t === "txt") return <span key={i}>{n.v}</span>;
    if (n.t === "sup") return <sup key={i} className="dmx-sup"><Nodes nodes={n.b} /></sup>;
    if (n.t === "sqrt") return <span key={i} className="dmx-sqrt"><span className="dmx-rad" aria-hidden="true">√</span><span className="dmx-body"><Nodes nodes={n.b} /></span></span>;
    if (n.t === "frac") return <span key={i} className="dmx-frac"><span className="dmx-num"><Nodes nodes={n.n} /></span><span className="dmx-den"><Nodes nodes={n.d} /></span></span>;
    return null;
  });
}

export function MathSpan({ src, className = "", block }) {
  const nodes = parseMath(src);
  return (
    <span className={"dmx" + (block ? " dmx-block" : "") + (className ? " " + className : "")} dir="ltr" role="math" aria-label={mathToText(src)}>
      <Nodes nodes={nodes} />
    </span>
  );
}

export function MathText({ text, className = "", as: Tag = "span" }) {
  const parts = splitProse(text);
  const only = isMathOnly(text);
  return (
    <Tag className={"dmx-p" + (only ? " only" : "") + (className ? " " + className : "")} aria-label={proseToText(text)}>
      {parts.map((p, i) => (p.math ? <MathSpan key={i} src={p.v} /> : <span key={i} aria-hidden="true">{p.v}</span>))}
    </Tag>
  );
}
