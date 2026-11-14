'use client';
/* Duels: the question markup on screen. Hebrew prose stays RTL; every $…$
   island is an LTR block; fractions stack, roots get their bar, exponents
   rise. Parsing: ./math-core.js (tested). Styles: src/styles/duel-arena.css
   (.dmx* — a private prefix: the admin has its own .mt, topic pages a .mx).

   <MathText text="חזקה שלילית: $4^{−3} = ?$" />     prose with islands
   <MathSpan src="\frac{1}{64}" />                      one plain-math string (a choice)

   Question UI (2026-11-10): every line gets its role (math-core lineRole) as a class —
   .dmx-line.ask (words: what to do) · .eq (a formula row: what to work with, the hero) ·
   .target (the last short "b = ?" line: what to answer; its "?" sits in an accent chip).
   omitTarget: a typed question draws its answer slot in place of the target line. */
import { Root } from "@/components/Root";
import { splitProse, parseMath, mathToText, proseToText, isMathOnly, mathBreaks, promptLines, lineRole, tidyLines } from "./math-core";

/* the "?" of the asked quantity: a small accent chip (only inside formula / target rows) */
function Txt({ v, chip }) {
  if (!chip || !v.includes("?")) return v;
  return v.split("?").flatMap((s, i) => (i ? [<span key={i} className="dmx-q">?</span>, s] : [s]));
}

function Node({ n, chip }) {
  if (n.t === "sup") return <sup className="dmx-sup"><Nodes nodes={n.b} chip={chip} /></sup>;
  if (n.t === "sqrt") return <Root className="dmx-sqrt"><Nodes nodes={n.b} chip={chip} /></Root>;   /* the shared root sign (board #65) */
  if (n.t === "frac") return <span className="dmx-frac"><span className="dmx-num"><Nodes nodes={n.n} chip={chip} /></span><span className="dmx-den"><Nodes nodes={n.d} chip={chip} /></span></span>;
  return null;
}

/* brk (top level of an island only): spaces become no-break except right before an operator (math-core
   mathBreaks) — only matters when a row has to wrap ([data-fit="wrap"]); nowrap islands look the same.
   A fraction / root / power is glued to the operator in front of it (".dmx-nb": "= ⁽ˣ⁻⁴⁾⁄₄" never splits
   after the "=" — browsers may break around an inline box even after a no-break space). */
function Nodes({ nodes, brk, chip }) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.t !== "txt") { out.push(<Node key={i} n={n} chip={chip} />); continue; }
    const v = brk ? mathBreaks(n.v) : n.v;
    const next = nodes[i + 1];
    if (brk && next && next.t !== "txt") {
      const k = v.lastIndexOf(" ");
      const head = v.slice(0, k + 1), tail = v.slice(k + 1);
      if (head) out.push(<span key={i}><Txt v={head} chip={chip} /></span>);
      out.push(<span key={i + "nb"} className="dmx-nb"><Txt v={tail} chip={chip} /><Node n={next} chip={chip} /></span>);
      i++;
      continue;
    }
    out.push(<span key={i}><Txt v={v} chip={chip} /></span>);
  }
  return out;
}

export function MathSpan({ src, className = "", block, breaks, chip }) {
  const nodes = parseMath(src);
  return (
    <span className={"dmx" + (block ? " dmx-block" : "") + (className ? " " + className : "")} dir="ltr" role="math" aria-label={mathToText(src)}>
      <Nodes nodes={nodes} brk={breaks} chip={chip} />
    </span>
  );
}

/* each prose fragment is its own RTL run, each island an isolated LTR run: punctuation next to a
   formula ("הוא $2 : 3$.") stays on the Hebrew side, Hebrew never touches a Latin letter */
function Line({ text, chip }) {
  return splitProse(text).map((p, i) => (p.math
    ? <MathSpan key={i} src={p.v} breaks chip={chip} />
    : <span key={i} dir="rtl" aria-hidden="true">{p.v}</span>));
}

/* A prompt with lines ("\n"): each line is its own row with its role. A prompt with no formula row
   (a word problem) gets .prose: its words are the hero. */
export function MathText({ text, className = "", as: Tag = "span", omitTarget = false }) {
  const lines = tidyLines(promptLines(text));
  const roles = lines.map((l, i) => lineRole(l, i, lines));
  const only = isMathOnly(text);
  const prose = lines.length > 0 && roles.every((r) => r === "ask");
  const cls = "dmx-p" + (only ? " only" : "") + (lines.length > 1 ? " lines" : "") + (prose ? " prose" : "") + (className ? " " + className : "");
  return (
    <Tag className={cls} aria-label={proseToText(text)}>
      {lines.map((l, i) => (omitTarget && roles[i] === "target" ? null : (
        <span key={i} className={"dmx-line " + roles[i]}><Line text={l} chip={roles[i] !== "ask"} /></span>
      )))}
    </Tag>
  );
}
