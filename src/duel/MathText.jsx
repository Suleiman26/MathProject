'use client';
/* Duels: the question markup on screen. Hebrew prose stays RTL; every $…$
   island is an LTR block; fractions stack, roots get their bar, exponents
   rise. Parsing: ./math-core.js (tested). Styles: src/styles/duel-arena.css (.mt*).

   <MathText text="חזקה שלילית: $4^{−3} = ?$" />     prose with islands
   <Math src="\frac{1}{64}" />                          one plain-math string (a choice) */
import { splitProse, parseMath, mathToText, proseToText } from "./math-core";

function Nodes({ nodes }) {
  return nodes.map((n, i) => {
    if (n.t === "txt") return <span key={i}>{n.v}</span>;
    if (n.t === "sup") return <sup key={i} className="mt-sup"><Nodes nodes={n.b} /></sup>;
    if (n.t === "sqrt") return <span key={i} className="mt-sqrt"><span className="mt-rad" aria-hidden="true">√</span><span className="mt-body"><Nodes nodes={n.b} /></span></span>;
    if (n.t === "frac") return <span key={i} className="mt-frac"><span className="mt-num"><Nodes nodes={n.n} /></span><span className="mt-den"><Nodes nodes={n.d} /></span></span>;
    return null;
  });
}

export function Math({ src, className = "", block }) {
  const nodes = parseMath(src);
  return (
    <span className={"mt" + (block ? " block" : "") + (className ? " " + className : "")} dir="ltr" role="math" aria-label={mathToText(src)}>
      <Nodes nodes={nodes} />
    </span>
  );
}

export function MathText({ text, className = "", as: Tag = "span" }) {
  const parts = splitProse(text);
  const only = parts.length > 0 && parts.every((p) => p.math || !p.v.trim());   // pure math → bigger
  return (
    <Tag className={"mtp" + (only ? " only" : "") + (className ? " " + className : "")} aria-label={proseToText(text)}>
      {parts.map((p, i) => (p.math ? <Math key={i} src={p.v} /> : <span key={i} aria-hidden="true">{p.v}</span>))}
    </Tag>
  );
}
