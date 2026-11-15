'use client';
/* Math and rich text for the "חדש" module (board #84). Syntax: see ./core.js.
   Math is always drawn left-to-right, so "<" / ">" are never mirrored inside Hebrew;
   a fraction is numerator over denominator; a power is a raised exponent. */
import React from 'react';
import { Root } from '@/components/Root';

/* "…" → nodes. Stops at one of `stop` (not consumed). */
function parseMath(s, i, stop) {
  const out = [];
  let buf = '';
  const flush = () => { if (buf) { out.push({ t: 'txt', v: buf }); buf = ''; } };
  // the body after ^ or _ : {…} or one run of digits / one letter
  const small = (j) => {
    if (s[j] === '{') { const r = parseMath(s, j + 1, '}'); return [r.nodes, r.i + 1]; }
    const m = /^-?(\d+|[a-zA-Z])/.exec(s.slice(j));
    return m ? [[{ t: 'txt', v: m[0] }], j + m[0].length] : [[], j];
  };
  while (i < s.length && !stop.includes(s[i])) {
    const c = s[i];
    if (c === '{') {
      const a = parseMath(s, i + 1, '|}');
      if (s[a.i] === '|') { const b = parseMath(s, a.i + 1, '}'); flush(); out.push({ t: 'frac', a: a.nodes, b: b.nodes }); i = b.i + 1; }
      else { flush(); out.push(...a.nodes); i = a.i + 1; }
    } else if (c === '^' || c === '_') {
      const [nodes, j] = small(i + 1); flush(); out.push({ t: c === '^' ? 'sup' : 'sub', b: nodes }); i = j;
    } else if (c === '√') {
      flush();
      if (s[i + 1] === '(') { const r = parseMath(s, i + 2, ')'); out.push({ t: 'root', b: r.nodes }); i = r.i + 1; }
      else { const m = /^(\d+(\.\d+)?|[a-zA-Z])/.exec(s.slice(i + 1)); out.push({ t: 'root', b: [{ t: 'txt', v: m ? m[0] : '' }] }); i += 1 + (m ? m[0].length : 0); }
    } else if (c === '(') {
      // a bracket left open on purpose ("(x +" before an answer box) stays open
      const r = parseMath(s, i + 1, ')'); flush(); out.push({ t: 'txt', v: '(' }, ...r.nodes);
      if (s[r.i] === ')') out.push({ t: 'txt', v: ')' });
      i = r.i + 1;
    } else if (c === '?') { flush(); out.push({ t: 'slot' }); i++; }
    else if (c === '<' && s[i + 1] === '=') { buf += '≤'; i += 2; }
    else if (c === '>' && s[i + 1] === '=') { buf += '≥'; i += 2; }
    else if (c === '!' && s[i + 1] === '=') { buf += '≠'; i += 2; }
    else if (c === '*') { buf += '·'; i++; }
    else if (c === '-') { buf += '−'; i++; }
    else if (/[a-z]/.test(c)) { flush(); out.push({ t: 'var', v: c }); i++; }
    else { buf += c; i++; }
  }
  flush();
  return { nodes: out, i };
}

function Nodes({ nodes }) {
  return nodes.map((n, k) => {
    switch (n.t) {
      case 'txt': return <React.Fragment key={k}>{n.v}</React.Fragment>;
      case 'var': return <i className="nw-v" key={k}>{n.v}</i>;
      case 'sup': return <sup key={k}><Nodes nodes={n.b} /></sup>;
      case 'sub': return <sub key={k}><Nodes nodes={n.b} /></sub>;
      case 'root': return <Root key={k}><Nodes nodes={n.b} /></Root>;
      case 'slot': return <span className="nw-slot" key={k} aria-label="מקום ריק" />;
      case 'frac': return <span className="nw-fr" key={k}><span><Nodes nodes={n.a} /></span><span><Nodes nodes={n.b} /></span></span>;
      default: return null;
    }
  });
}

/** One math expression, left-to-right. */
export function M({ s, className = '' }) {
  return <span dir="ltr" className={'nw-m' + (className ? ' ' + className : '')}><Nodes nodes={parseMath(String(s), 0, '').nodes} /></span>;
}

/** Hebrew text with [[math]] inside. */
export function Rich({ text }) {
  return String(text).split(/(\[\[.*?\]\])/).map((seg, i) =>
    (seg.startsWith('[[') ? <M key={i} s={seg.slice(2, -2)} /> : <React.Fragment key={i}>{seg}</React.Fragment>));
}
