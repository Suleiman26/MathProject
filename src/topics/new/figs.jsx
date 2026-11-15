'use client';
/* Drawings for the "חדש" module (board #84). A question or a lesson item carries
   `fig: { type, … }`; the component for each type is looked up here.
   Core types (this file):
     { type:'table', head:['rich',…], rows:[['rich',…],…] }                 a small data table
     { type:'bars', bars:[{label, value, color?}], yLabel?, xLabel?, max? }  a bar chart
     { type:'grid', x:[-6,6], y:[-6,6], points:[{x,y,label?,color?}],
       polys:[{pts:[[x,y],…], color?, label?, dashed?}],
       lines:[{from:[x,y], to:[x,y], color?, dashed?}],
       curves:[{pts:[[x,y],…], color?}] }                                    a coordinate grid
   The packs add their own types in figs-data.jsx / figs-geo.jsx.
   Rules: labels never sit on a line; colours come from the palette below. */
import React from 'react';
import { Rich } from './rich';
import DATA_FIGS from './figs-data';
import GEO_FIGS from './figs-geo';
import { INK, MUTED, LINE, col } from './figs-kit';

function Table({ fig }) {
  return (
    <div className="nw-tablewrap">
      <table className="nw-table">
        {fig.head && <thead><tr>{fig.head.map((h, i) => <th key={i}><Rich text={h} /></th>)}</tr></thead>}
        <tbody>{fig.rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 && fig.rowHead ? <th key={j}><Rich text={String(c)} /></th> : <td key={j}><Rich text={String(c)} /></td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}

function niceStep(max) { const raw = max / 5; const p = 10 ** Math.floor(Math.log10(raw || 1)); const m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
function Bars({ fig }) {
  const bars = fig.bars, n = bars.length;
  const top = fig.max || Math.max(...bars.map((b) => b.value), 1);
  const step = niceStep(top), yMax = Math.ceil(top / step) * step;
  const W = 340, H = 220, L = 34, B = 34, T = 14, R = 8;
  const pw = W - L - R, ph = H - T - B, slot = pw / n, bw = Math.min(46, slot * 0.62);
  const y = (v) => T + ph - (v / yMax) * ph;
  const ticks = []; for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(v);
  return (
    <svg className="nw-fig nw-bars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={fig.alt || 'דיאגרמת עמודות'}>
      {ticks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={LINE} strokeWidth="1" /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill={MUTED}>{Math.round(v * 100) / 100}</text></g>)}
      {bars.map((b, i) => {
        const cx = L + slot * i + slot / 2;
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={y(b.value)} width={bw} height={Math.max(0, T + ph - y(b.value))} rx="4" fill={col(b.color)} />
            {!fig.hideValues && <text x={cx} y={y(b.value) - 5} textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>{b.value}</text>}
            <text x={cx} y={H - B + 16} textAnchor="middle" fontSize="12" fill={INK}>{b.label}</text>
          </g>
        );
      })}
      <line x1={L} x2={W - R} y1={T + ph} y2={T + ph} stroke={INK} strokeWidth="1.5" />
      {fig.xLabel && <text x={L + pw / 2} y={H - 3} textAnchor="middle" fontSize="11" fill={MUTED}>{fig.xLabel}</text>}
    </svg>
  );
}

/* A coordinate grid. One unit = one square; labels are pushed off the axes and lines. */
function Grid({ fig }) {
  const [x0, x1] = fig.x || [-6, 6], [y0, y1] = fig.y || [-6, 6];
  const u = Math.min(30, 320 / (x1 - x0)), pad = 18;
  const W = (x1 - x0) * u + pad * 2, H = (y1 - y0) * u + pad * 2;
  const X = (x) => pad + (x - x0) * u, Y = (y) => pad + (y1 - y) * u;
  const xs = [], ys = [];
  for (let v = x0; v <= x1; v++) xs.push(v);
  for (let v = y0; v <= y1; v++) ys.push(v);
  const every = (x1 - x0) > 14 || (y1 - y0) > 14 ? 2 : 1;
  const path = (pts, close) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ') + (close ? ' Z' : '');
  return (
    <svg className="nw-fig nw-grid" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={fig.alt || 'מערכת צירים'}>
      {xs.map((v) => <line key={'x' + v} x1={X(v)} x2={X(v)} y1={Y(y0)} y2={Y(y1)} stroke={LINE} strokeWidth="1" />)}
      {ys.map((v) => <line key={'y' + v} x1={X(x0)} x2={X(x1)} y1={Y(v)} y2={Y(v)} stroke={LINE} strokeWidth="1" />)}
      {y0 <= 0 && y1 >= 0 && <line x1={X(x0)} x2={X(x1)} y1={Y(0)} y2={Y(0)} stroke={INK} strokeWidth="1.5" />}
      {x0 <= 0 && x1 >= 0 && <line x1={X(0)} x2={X(0)} y1={Y(y0)} y2={Y(y1)} stroke={INK} strokeWidth="1.5" />}
      {!fig.noNumbers && xs.filter((v) => v !== 0 && v % every === 0).map((v) => <text key={'tx' + v} x={X(v)} y={Y(Math.max(y0, Math.min(0, y1))) + 12} textAnchor="middle" fontSize="10" fill={MUTED}>{v}</text>)}
      {!fig.noNumbers && ys.filter((v) => v !== 0 && v % every === 0).map((v) => <text key={'ty' + v} x={X(Math.max(x0, Math.min(0, x1))) - 4} y={Y(v) + 3} textAnchor="end" fontSize="10" fill={MUTED}>{v}</text>)}
      {x0 <= 0 && x1 >= 0 && <text x={X(0) + 7} y={Y(y1) + 2} fontSize="11" fontStyle="italic" fill={INK}>y</text>}
      {y0 <= 0 && y1 >= 0 && <text x={X(x1) + 3} y={Y(0) - 6} fontSize="11" fontStyle="italic" fill={INK}>x</text>}
      {(fig.polys || []).map((p, i) => <path key={'p' + i} d={path(p.pts, true)} fill={col(p.color)} fillOpacity={p.dashed ? 0.06 : 0.16} stroke={col(p.color)} strokeWidth="2" strokeDasharray={p.dashed ? '5 4' : undefined} strokeLinejoin="round" />)}
      {(fig.lines || []).map((l, i) => <line key={'l' + i} x1={X(l.from[0])} y1={Y(l.from[1])} x2={X(l.to[0])} y2={Y(l.to[1])} stroke={col(l.color, 'gray')} strokeWidth="2" strokeDasharray={l.dashed ? '5 4' : undefined} strokeLinecap="round" />)}
      {(fig.curves || []).map((c, i) => <path key={'c' + i} d={path(c.pts, false)} fill="none" stroke={col(c.color)} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />)}
      {(fig.points || []).map((p, i) => {
        const dx = p.dx != null ? p.dx : 7, dy = p.dy != null ? p.dy : -7;
        return (
          <g key={'pt' + i}>
            <circle cx={X(p.x)} cy={Y(p.y)} r="4" fill={col(p.color)} stroke="#fff" strokeWidth="1.5" />
            {p.label && <text x={X(p.x) + dx} y={Y(p.y) + dy} fontSize="12" fontWeight="700" fill={col(p.color)} stroke="#fff" strokeWidth="3" paintOrder="stroke" textAnchor={dx < 0 ? 'end' : 'start'}>{p.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

const FIGS = { table: Table, bars: Bars, grid: Grid, ...DATA_FIGS, ...GEO_FIGS };

export function Fig({ fig }) {
  const C = fig && FIGS[fig.type];
  if (!C) return null;
  return <div className={`nw-figbox nw-figbox--${fig.type}`}><C fig={fig} />{fig.caption && <div className="nw-cap"><Rich text={fig.caption} /></div>}</div>;
}
export const FIG_TYPES = Object.keys(FIGS);
