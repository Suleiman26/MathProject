'use client';
/* Drawings of the data pack for the "חדש" module (board #84). Each entry: type → component
   that receives { fig }. Import INK / MUTED / LINE / col from './figs-kit' for colours.
     { type:'balls', balls:['red','blue',…] }                       coloured balls + a legend
     { type:'spinner', sectors:[{ color, label? }, …] }             a wheel of equal sectors
     { type:'tree', branches:[{ color? | label, p, kids:[{ color? | label, p }] }] }
        a two-stage probability tree; p = [numerator, denominator] or a short string ('?')
   Colour names: red, blue, green, yellow, violet. Every ball / sector also carries the first
   Hebrew letter of its colour, so the drawing does not depend on colour vision. */
import React from 'react';
import { INK, col } from './figs-kit';
import { CoinSim } from './figs-coin';  // { type:'coinSim' } an interactive coin-flip lab (board #96)

const NAMES = { red: ['אדום', 'א'], blue: ['כחול', 'כ'], green: ['ירוק', 'י'], yellow: ['צהוב', 'צ'], violet: ['סגול', 'ס'] };
const onInk = (c) => (c === 'yellow' ? INK : '#fff');
const letter = (c) => (NAMES[c] ? NAMES[c][1] : '');
const uniq = (xs) => xs.filter((c, i) => c && NAMES[c] && xs.indexOf(c) === i);

function Ball({ x, y, r = 13, color, label }) {
  const t = label != null ? label : letter(color);
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={col(color)} stroke="#fff" strokeWidth="1.5" />
      {t !== '' && <text x={x} y={y + (r >= 12 ? 4.5 : 4)} textAnchor="middle" fontSize={r >= 12 ? 13 : 11} fontWeight="700" fill={onInk(color)}>{t}</text>}
    </g>
  );
}

/* letter → colour name; items run right-to-left, all text is centred (safe in RTL) */
function Legend({ colors, y, W }) {
  const slot = Math.min(80, (W - 16) / colors.length), total = slot * colors.length;
  return colors.map((c, i) => {
    const cx = W / 2 + total / 2 - slot * (i + 0.5);
    return (
      <g key={c}>
        <Ball x={cx + 24} y={y} r={9} color={c} />
        <text x={cx - 8} y={y + 4} textAnchor="middle" fontSize="12" fill={INK}>{NAMES[c][0]}</text>
      </g>
    );
  });
}

function Balls({ fig }) {
  const balls = fig.balls, per = 8, rows = Math.ceil(balls.length / per);
  const W = 340, gap = 38, top = 20;
  const legendY = top + (rows - 1) * gap + 36;
  const H = legendY + 16;
  return (
    <svg className="nw-fig nw-balls" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={fig.alt || 'כדורים צבעוניים'}>
      {balls.map((c, i) => {
        const r = Math.floor(i / per), k = i % per, cnt = Math.min(per, balls.length - r * per);
        return <Ball key={i} x={W / 2 - ((cnt - 1) * gap) / 2 + k * gap} y={top + r * gap} color={c} />;
      })}
      <Legend colors={uniq(balls)} y={legendY} W={W} />
    </svg>
  );
}

function Spinner({ fig }) {
  const S = fig.sectors, n = S.length;
  const W = 340, cx = 170, cy = 126, r = 96;
  const ang = (i) => ((-90 - 180 / n + (i * 360) / n) * Math.PI) / 180;
  const P = (a, rad) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  const colors = uniq(S.map((s) => s.color));
  const H = 232 + (colors.length ? 30 : 0);
  return (
    <svg className="nw-fig nw-spinner" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={fig.alt || 'גלגל מזל'}>
      {S.map((s, i) => {
        const [x0, y0] = P(ang(i), r), [x1, y1] = P(ang(i + 1), r);
        const [tx, ty] = P((ang(i) + ang(i + 1)) / 2, r * 0.64);
        const t = s.label != null ? s.label : letter(s.color);
        return (
          <g key={i}>
            <path d={`M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`} fill={col(s.color)} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            {t !== '' && <text x={tx} y={ty + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill={onInk(s.color)}>{t}</text>}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="6" fill="#fff" stroke={INK} strokeWidth="1.5" />
      <path d={`M${cx - 9} 8 L${cx + 9} 8 L${cx} ${cy - r + 4} Z`} fill={INK} />
      {colors.length > 0 && <Legend colors={colors} y={248} W={W} />}
    </svg>
  );
}

/* a probability next to its branch: never on the line */
function Prob({ p, x, y }) {
  if (Array.isArray(p)) {
    return (
      <g fill={INK} fontSize="12" fontWeight="700" textAnchor="middle">
        <text x={x} y={y - 3}>{p[0]}</text>
        <line x1={x - 8} x2={x + 8} y1={y + 1} y2={y + 1} stroke={INK} strokeWidth="1.3" />
        <text x={x} y={y + 13}>{p[1]}</text>
      </g>
    );
  }
  return <text x={x} y={y + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>{p}</text>;
}
function Branch({ from, to, p }) {
  const [x1, y1] = from, [x2, y2] = to;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const slope = Math.abs((x2 - x1) / (y2 - y1)), side = x2 < x1 ? -1 : 1;
  const hw = Array.isArray(p) ? 9 : 4 + 3.5 * String(p == null ? '' : p).length;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      {p != null && <Prob p={p} x={mx + side * (slope * 14 + hw + 5)} y={my} />}
    </g>
  );
}
function Node({ n, y }) {
  if (n.color) return <Ball x={n.x} y={y} color={n.color} label={n.label} />;
  return <text x={n.x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>{n.label}</text>;
}

function Tree({ fig }) {
  const W = 340, y0 = 14, y1 = 92, y2 = 184;
  const leaves = fig.branches.reduce((s, b) => s + ((b.kids || []).length || 1), 0);
  let k = 0;
  const leafX = () => 20 + ((k++ + 0.5) * 300) / leaves;
  const lay = fig.branches.map((b) => {
    const kids = (b.kids || []).map((c) => ({ ...c, x: leafX() }));
    const x = kids.length ? kids.reduce((s, c) => s + c.x, 0) / kids.length : leafX();
    return { ...b, x, kids };
  });
  const deep = lay.some((b) => b.kids.length);
  const H = (deep ? y2 : y1) + 24;
  return (
    <svg className="nw-fig nw-tree" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={fig.alt || 'דיאגרמת עץ'}>
      <circle cx={W / 2} cy={y0} r="3.5" fill={INK} />
      {lay.map((b, i) => (
        <g key={i}>
          <Branch from={[W / 2, y0 + 4]} to={[b.x, y1 - 16]} p={b.p} />
          <Node n={b} y={y1} />
          {b.kids.map((c, j) => (
            <g key={j}>
              <Branch from={[b.x, y1 + 16]} to={[c.x, y2 - 16]} p={c.p} />
              <Node n={c} y={y2} />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

const FIGS = { balls: Balls, spinner: Spinner, tree: Tree, coinSim: CoinSim };
export default FIGS;
