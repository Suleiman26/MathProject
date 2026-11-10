'use client';
/* Duels: the question markup on screen. Hebrew prose stays RTL; every $…$
   island is an LTR block; fractions stack, roots get their bar, exponents
   rise. Parsing: ./math-core.js (tested). Styles: src/styles/duel-arena.css
   (.dmx* — a private prefix: the admin has its own .mt, topic pages a .mx).

   <MathText text="חזקה שלילית: $4^{−3} = ?$" />     prose with islands
   <MathSpan src="\frac{1}{64}" />                      one plain-math string (a choice) */
import { splitProse, parseMath, mathToText, proseToText, isMathOnly, mathBreaks, promptLines } from "./math-core";

/* brk: spaces become no-break except right before an operator (math-core mathBreaks) — only matters
   when the prompt has to wrap ([data-fit="wrap"]); nowrap islands look the same */
function Nodes({ nodes, brk }) {
  return nodes.map((n, i) => {
    if (n.t === "txt") return <span key={i}>{brk ? mathBreaks(n.v) : n.v}</span>;
    if (n.t === "sup") return <sup key={i} className="dmx-sup"><Nodes nodes={n.b} /></sup>;
    if (n.t === "sqrt") return <span key={i} className="dmx-sqrt"><span className="dmx-rad" aria-hidden="true">√</span><span className="dmx-body"><Nodes nodes={n.b} /></span></span>;
    if (n.t === "frac") return <span key={i} className="dmx-frac"><span className="dmx-num"><Nodes nodes={n.n} /></span><span className="dmx-den"><Nodes nodes={n.d} /></span></span>;
    return null;
  });
}

export function MathSpan({ src, className = "", block, breaks }) {
  const nodes = parseMath(src);
  return (
    <span className={"dmx" + (block ? " dmx-block" : "") + (className ? " " + className : "")} dir="ltr" role="math" aria-label={mathToText(src)}>
      <Nodes nodes={nodes} brk={breaks} />
    </span>
  );
}

function Line({ text }) {
  return splitProse(text).map((p, i) => (p.math ? <MathSpan key={i} src={p.v} breaks /> : <span key={i} aria-hidden="true">{p.v}</span>));
}

/* A prompt with lines ("\n"): each line is its own row; a line that is only math is a
   formula row (centred, a little bigger) — no Hebrew glued to a formula, so no bidi mix-ups. */
export function MathText({ text, className = "", as: Tag = "span" }) {
  const lines = promptLines(text);
  const only = isMathOnly(text);
  const cls = "dmx-p" + (only ? " only" : "") + (lines.length > 1 ? " lines" : "") + (className ? " " + className : "");
  return (
    <Tag className={cls} aria-label={proseToText(text)}>
      {lines.length > 1
        ? lines.map((l, i) => <span key={i} className={"dmx-line" + (isMathOnly(l) ? " eq" : "")}><Line text={l} /></span>)
        : <Line text={text} />}
    </Tag>
  );
}
