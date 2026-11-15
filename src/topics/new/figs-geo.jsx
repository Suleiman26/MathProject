'use client';
/* Drawings of the geo pack for the "חדש" module (board #84). Each entry: type → component
   that receives { fig }. Import INK / MUTED / LINE / col from './figs-kit' for colours.
     { type:'tri', angles|sides, names, sideLabels, angleLabels, right, ticks, ext, median }   one triangle
     { type:'simtri', angles|sides, k, small:{names, sideLabels}, big:{names, sideLabels} }   two similar triangles
     { type:'prism', a, b, h, labels:{a,b,c,h} }                                              a triangular prism
   All positions are computed in ./chapters/geometry/geo.js (true to the numbers; a label never
   sits on a line: sides are named beside their middle, angles inside near the vertex, letters outside). */
import React from 'react';
import { INK, MUTED, col } from './figs-kit';
import { figTri, figSim, figPrism } from './chapters/geometry/geo.js';

const f1 = (v) => v.toFixed(1);
const STROKE = { side: 2, ext: 1.75, median: 2, hidden: 1.5, tick: 1.75, mark: 1.5 };

function Label({ l }) {
  // lowercase latin letters (x) are drawn italic, like in the text
  const parts = l.text.split(/([a-z]+)/).filter(Boolean);
  return (
    <text x={f1(l.x)} y={f1(l.y + 4.6)} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK} stroke="#fff" strokeWidth="3" paintOrder="stroke">
      {parts.map((p, i) => (/^[a-z]+$/.test(p) ? <tspan key={i} fontStyle="italic">{p}</tspan> : <tspan key={i}>{p}</tspan>))}
    </text>
  );
}

function Draw({ L, fig, alt }) {
  const main = col(fig.color), medc = col('violet'), extc = col('orange');
  const stroke = (k) => (k === 'median' ? medc : k === 'ext' ? MUTED : k === 'mark' ? INK : main);
  return (
    <svg className={`nw-fig nw-geo nw-geo--${fig.type}`} viewBox={`0 0 ${L.W} ${L.H}`} role="img" aria-label={fig.alt || alt} style={{ direction: 'ltr' }}>
      {L.fills.map((f, i) => <path key={'f' + i} d={f.pts.map((p, k) => `${k ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join(' ') + ' Z'} fill={main} fillOpacity={f.top ? 0.26 : f.dark ? 0.19 : 0.12} stroke="none" />)}
      {L.segs.map((g, i) => <line key={'s' + i} x1={f1(g.a[0])} y1={f1(g.a[1])} x2={f1(g.b[0])} y2={f1(g.b[1])} stroke={stroke(g.kind)} strokeWidth={STROKE[g.kind] || 2} strokeLinecap="round" strokeDasharray={g.kind === 'hidden' ? '5 4' : undefined} />)}
      {L.arcs.map((a, i) => <path key={'a' + i} d={`M${f1(a.p1[0])} ${f1(a.p1[1])} A${a.r} ${a.r} 0 0 ${a.sweep} ${f1(a.p2[0])} ${f1(a.p2[1])}`} fill="none" stroke={a.kind === 'ext' ? extc : main} strokeWidth="1.75" strokeLinecap="round" />)}
      {L.labels.map((l, i) => <Label key={'t' + i} l={l} />)}
    </svg>
  );
}

const Tri = ({ fig }) => <Draw L={figTri(fig)} fig={fig} alt="משולש" />;
const SimTri = ({ fig }) => <Draw L={figSim(fig)} fig={fig} alt="שני משולשים דומים" />;
const Prism = ({ fig }) => <Draw L={figPrism(fig)} fig={fig} alt="מנסרה משולשת" />;

const FIGS = { tri: Tri, simtri: SimTri, prism: Prism };
export default FIGS;
