'use client';
/* eslint-disable */
// Topic code by Sulaiman, copied unchanged from public/classic/pythagoras.html
// (tools/verify-logic.py proves it). Added: these lines + the export at the end.
// Removed: the old ReactDOM.createRoot(...).render(<App/>) line.
import React from 'react';
import ReactDOM from 'react-dom';
// ===== BEGIN ORIGINAL =====

const {useState, useMemo} = React;

/* ═══════════════ helpers ═══════════════ */
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

function fmtVal(v) {
  return Math.abs(v - Math.round(v)) < 0.001 ? String(Math.round(v)) : v.toFixed(2);
}

/* ═══════════════ Chapter 1 data ═══════════════ */
function makeTri() {
  const mt = randInt(0, 2);
  let legH, legV, hyp;
  if (mt === 2) {
    legH = randInt(2, 15); legV = randInt(2, 15);
    hyp = Math.sqrt(legH * legH + legV * legV);
  } else {
    let kl, hv;
    do { kl = randInt(2, 13); hv = randInt(kl + 1, 15); } while (hv * hv - kl * kl < 4);
    const ol = Math.sqrt(hv * hv - kl * kl);
    if (mt === 0) { legH = ol; legV = kl; hyp = hv; }
    else          { legH = kl; legV = ol; hyp = hv; }
  }
  const names = ['BC', 'AC', 'AB'];
  const vals  = [legH, legV, hyp];
  const known = {};
  for (let i = 0; i < 3; i++) if (i !== mt) known[names[i]] = Math.round(vals[i]);
  return { legH, legV, hyp, mt, missingName: names[mt], missingVal: vals[mt], known };
}

/* ═══════════════ Chapter 2 data ═══════════════ */
/* Fixes board #72 (Sulaiman): many more shapes in the application chapter:
   square, rectangle, right trapezoid, triangle inside a triangle (height),
   isosceles triangle, kite, rhombus, and a triangle inside a rectangle.
   Every shape is points (real lengths) + segments; the student finds the
   right triangle that holds the dashed segment. Sometimes a leg is missing. */
const PY_TRIPLES = [[3,4,5],[5,12,13],[8,15,17],[7,24,25],[20,21,29]];
function pickTriple(maxHyp) {
  const opts = [];
  for (const [a, b, c] of PY_TRIPLES) for (let k = 1; c * k <= maxHyp; k++) opts.push([a * k, b * k, c * k]);
  const t = opts[randInt(0, opts.length - 1)];
  return Math.random() < 0.5 ? t : [t[1], t[0], t[2]];
}
/* two legs: often a Pythagorean triple (whole answer), otherwise random */
function pickLegs(lo, hi) {
  if (Math.random() < 0.5) {
    const [a, b] = pickTriple(40);
    if (a >= lo && b >= lo && a <= hi && b <= hi) return [a, b];
  }
  return [randInt(lo, hi), randInt(lo, hi)];
}
const segName = (p, q) => [p, q].sort().join('');
const ptDist = (P, p, q) => Math.hypot(P[p][0] - P[q][0], P[p][1] - P[q][1]);

/* right triangle a–r–b (right angle at r); `missing` is the dashed segment */
function mkRT(P, a, r, b, missing) {
  const legs = [segName(r, a), segName(r, b)], hyp = segName(a, b);
  const known = {};
  for (const n of [...legs, hyp]) if (n !== missing) known[n] = Math.round(ptDist(P, n[0], n[1]));
  let missingVal;
  if (missing === hyp) missingVal = Math.sqrt(known[legs[0]] ** 2 + known[legs[1]] ** 2);
  else { const other = legs.find(n => n !== missing); missingVal = Math.sqrt(known[hyp] ** 2 - known[other] ** 2); }
  return { verts: new Set([a, r, b]), rightAt: r, sideNames: [...legs, hyp].sort(), hyp, missingName: missing, missingVal, known };
}

function buildShape(sp) {
  const vals = {};
  for (const [p, q] of sp.labels) vals[segName(p, q)] = Math.round(ptDist(sp.P, p, q));
  return { ...sp, vals, dashName: segName(sp.dash[0], sp.dash[1]) };
}

/* very flat shapes squeeze the labels together: draw a new one */
function makeQuad() {
  for (let i = 0; i < 200; i++) {
    const q = makeQuadOnce();
    const xs = Object.values(q.P).map(p => p[0]), ys = Object.values(q.P).map(p => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    if (Math.min(w, h) / Math.max(w, h) >= 0.4) return q;
  }
  return makeQuadOnce();
}

function makeQuadOnce() {
  const kind = randInt(0, 7);

  if (kind === 0) {                                   /* square */
    const s = randInt(3, 15);
    const P = { A: [0, 0], B: [s, 0], C: [s, s], D: [0, s] };
    return buildShape({ type: 'square', label: 'ריבוע', P, outline: ['A','B','C','D'], lines: [], dash: ['A','C'],
      labels: [['A','B'], ['B','C'], ['C','D'], ['A','D']],
      ra: [['A','B','D'], ['B','A','C'], ['C','B','D'], ['D','A','C']],
      validTriangles: [mkRT(P, 'A', 'B', 'C', 'AC'), mkRT(P, 'A', 'D', 'C', 'AC')] });
  }

  if (kind === 1) {                                   /* rectangle */
    const ra = [['A','B','D'], ['B','A','C'], ['C','B','D'], ['D','A','C']];
    if (Math.random() < 0.5) {
      let w, h;
      do { [w, h] = pickLegs(3, 15); } while (w === h);
      const P = { A: [0, 0], B: [w, 0], C: [w, h], D: [0, h] };
      return buildShape({ type: 'rectangle', label: 'מלבן', P, outline: ['A','B','C','D'], lines: [], dash: ['A','C'],
        labels: [['A','B'], ['B','C'], ['C','D'], ['A','D']], ra,
        validTriangles: [mkRT(P, 'A', 'B', 'C', 'AC'), mkRT(P, 'A', 'D', 'C', 'AC')] });
    }
    let w, h;
    do { [w, h] = pickTriple(30); } while (w < 3 || h < 3);
    const P = { A: [0, 0], B: [w, 0], C: [w, h], D: [0, h] };
    return buildShape({ type: 'rectangle', label: 'מלבן', P, outline: ['A','B','C','D'], lines: [['A','C']], dash: ['B','C'],
      labels: [['A','B'], ['C','D'], ['A','C', 'B']], ra,
      validTriangles: [mkRT(P, 'A', 'B', 'C', 'BC')] });
  }

  if (kind === 2) {                                   /* right trapezoid — right angles at A and D */
    const v = randInt(0, 2);
    if (v < 2) {
      const h = randInt(3, 12), topBase = randInt(3, 10), bottomBase = topBase + randInt(2, 6);
      const P = { A: [0, 0], B: [bottomBase, 0], C: [topBase, h], D: [0, h] };
      const base = { type: 'trapezoid', label: 'טרפז ישר זווית', P, outline: ['A','B','C','D'], lines: [],
        labels: [['A','B'], ['A','D'], ['C','D']], ra: [['A','B','D'], ['D','A','C']] };
      return v === 0
        ? buildShape({ ...base, dash: ['B','D'], validTriangles: [mkRT(P, 'B', 'A', 'D', 'BD')] })
        : buildShape({ ...base, dash: ['A','C'], validTriangles: [mkRT(P, 'A', 'D', 'C', 'AC')] });
    }
    const [eb, h] = pickLegs(3, 12), topBase = randInt(3, 10);
    const P = { A: [0, 0], E: [topBase, 0], B: [topBase + eb, 0], C: [topBase, h], D: [0, h] };
    return buildShape({ type: 'trapezoid', label: 'טרפז ישר זווית', P, outline: ['A','E','B','C','D'], lines: [['C','E']], dash: ['B','C'],
      labels: [['C','D'], ['A','D'], ['C','E', 'B'], ['B','E', 'C']],
      ra: [['A','B','D'], ['D','A','C'], ['E','C','B']],
      validTriangles: [mkRT(P, 'C', 'E', 'B', 'BC')] });
  }

  if (kind === 3) {                                   /* isosceles triangle with its height */
    if (Math.random() < 0.5) {                        /* find a side */
      const [m, h] = pickLegs(3, 12);
      const P = { B: [0, 0], D: [m, 0], C: [2 * m, 0], A: [m, h] };
      return buildShape({ type: 'isosceles', label: 'משולש שווה-שוקיים', P, outline: ['B','D','C','A'], lines: [['A','D']], dash: ['A','B'],
        labels: [['B','D', 'A'], ['C','D', 'A'], ['A','D', 'C']], ra: [['D','A','B']],
        validTriangles: [mkRT(P, 'A', 'D', 'B', 'AB')] });
    }
    let m, h;                                         /* find the height */
    do { [m, h] = pickTriple(26); } while (m < 3 || h < 3);
    const P = { B: [0, 0], D: [m, 0], C: [2 * m, 0], A: [m, h] };
    return buildShape({ type: 'isosceles', label: 'משולש שווה-שוקיים', P, outline: ['B','D','C','A'], lines: [], dash: ['A','D'],
      labels: [['A','B'], ['A','C'], ['B','D', 'A'], ['C','D', 'A']], ra: [['D','A','B']],
      validTriangles: [mkRT(P, 'A', 'D', 'B', 'AD'), mkRT(P, 'A', 'D', 'C', 'AD')] });
  }

  if (kind === 4) {                                   /* triangle inside a triangle (height AD) */
    if (Math.random() < 0.5) {                        /* find AC */
      const [q, h] = pickLegs(3, 12);
      let p; do { p = randInt(4, 10); } while (p === q);
      const P = { B: [0, 0], D: [p, 0], C: [p + q, 0], A: [p, h] };
      return buildShape({ type: 'triangle', label: 'משולש', P, outline: ['B','D','C','A'], lines: [['A','D']], dash: ['A','C'],
        labels: [['A','D', 'C'], ['B','D', 'A'], ['C','D', 'A']], ra: [['D','A','C']],
        validTriangles: [mkRT(P, 'A', 'D', 'C', 'AC')] });
    }
    let q, h;                                         /* find DC */
    do { [q, h] = pickTriple(26); } while (q < 3 || h < 3);
    let p; do { p = randInt(4, 10); } while (p === q);
    const P = { B: [0, 0], D: [p, 0], C: [p + q, 0], A: [p, h] };
    return buildShape({ type: 'triangle', label: 'משולש', P, outline: ['B','D','C','A'], lines: [['A','D']], dash: ['C','D'],
      labels: [['A','C'], ['A','D', 'C'], ['B','D', 'A']], ra: [['D','A','C']],
      validTriangles: [mkRT(P, 'A', 'D', 'C', 'CD')] });
  }

  if (kind === 5) {                                   /* kite: diagonals meet at M at a right angle */
    const v = randInt(0, 2);
    let a, b, c;
    if (v === 2) { do { [a, b] = pickTriple(20); } while (a < 2 || b < 3 || a > 9); }
    else [a, b] = pickLegs(3, 9);
    c = a + randInt(3, 7);
    if (v === 1 && Math.random() < 0.5) { const t = pickTriple(26); if (t[1] > a + 1 && t[0] >= 3 && t[0] <= 10) { b = t[0]; c = t[1]; } }
    const P = { A: [0, a], B: [-b, 0], C: [0, -c], D: [b, 0], M: [0, 0] };
    const base = { type: 'kite', label: 'דלתון', P, outline: ['A','B','C','D'],
      lines: [['A','M'], ['M','C'], ['B','M'], ['M','D']], vdir: { M: [1, -1] } };
    if (v === 0) return buildShape({ ...base, dash: ['A','B'], labels: [['A','M', 'B'], ['B','M', 'A'], ['C','M', 'D']],
      ra: [['M','A','B']], validTriangles: [mkRT(P, 'A', 'M', 'B', 'AB')] });
    if (v === 1) return buildShape({ ...base, dash: ['B','C'], labels: [['A','M', 'B'], ['B','M', 'A'], ['C','M', 'D']],
      ra: [['M','B','C']], validTriangles: [mkRT(P, 'B', 'M', 'C', 'BC')] });
    return buildShape({ ...base, dash: ['B','M'], labels: [['A','B'], ['A','M', 'B'], ['C','M', 'D']],
      ra: [['M','A','B']], validTriangles: [mkRT(P, 'A', 'M', 'B', 'BM')] });
  }

  if (kind === 6) {                                   /* rhombus: diagonals meet at M at a right angle */
    const findSide = Math.random() < 0.5;
    let a, b;
    if (findSide) { do { [a, b] = pickLegs(3, 10); } while (a === b); }
    else { do { [a, b] = pickTriple(20); } while (a < 3 || b < 3); }
    const P = { A: [0, a], B: [-b, 0], C: [0, -a], D: [b, 0], M: [0, 0] };
    const base = { type: 'rhombus', label: 'מעוין', P, outline: ['A','B','C','D'],
      lines: [['A','M'], ['M','C'], ['B','M'], ['M','D']], vdir: { M: [1, -1] }, ra: [['M','A','B']] };
    return findSide
      ? buildShape({ ...base, dash: ['A','B'], labels: [['A','M', 'B'], ['B','M', 'A']], validTriangles: [mkRT(P, 'A', 'M', 'B', 'AB')] })
      : buildShape({ ...base, dash: ['B','M'], labels: [['A','B'], ['A','M', 'B']], validTriangles: [mkRT(P, 'A', 'M', 'B', 'BM')] });
  }

  /* kind 7 — triangle inside a rectangle: E on side DC */
  const left = Math.random() < 0.5;
  const [e, h] = pickLegs(3, 12);
  const rest = randInt(3, 10);
  const w = e + rest;
  const ex = left ? e : rest;                         /* DE = ex, EC = w − ex */
  const P = { A: [0, 0], B: [w, 0], C: [w, h], E: [ex, h], D: [0, h] };
  const ra = [['A','B','D'], ['B','A','C'], ['C','B','D'], ['D','A','C']];
  return left
    ? buildShape({ type: 'recttri', label: 'מלבן', P, outline: ['A','B','C','E','D'], lines: [], dash: ['A','E'], vdir: { E: [0.8, -1] },
        labels: [['A','D'], ['D','E'], ['C','E'], ['A','B']], ra, validTriangles: [mkRT(P, 'A', 'D', 'E', 'AE')] })
    : buildShape({ type: 'recttri', label: 'מלבן', P, outline: ['A','B','C','E','D'], lines: [], dash: ['B','E'], vdir: { E: [-0.8, -1] },
        labels: [['B','C'], ['D','E'], ['C','E'], ['A','B']], ra, validTriangles: [mkRT(P, 'B', 'C', 'E', 'BE')] });
}

/* ═══════════════ Triangle SVG (Ch 1) ═══════════════ */
function TriSVG({ tri, showAns }) {
  const { legH, legV, missingName, missingVal, known } = tri;
  const maxD = 180, sc = maxD / Math.max(legH, legV);
  const w = Math.max(legH * sc, 50), h = Math.max(legV * sc, 50);
  const pad = 55, svgW = w + pad * 2, svgH = h + pad * 2;

  const C = { x: pad + w, y: pad + h };
  const B = { x: pad,     y: pad + h };
  const A = { x: pad + w, y: pad     };
  const ms = 15;

  const label = n => {
    if (showAns && n === missingName) return fmtVal(missingVal);
    return n === missingName ? 'x' : String(known[n]);
  };
  const col = n => n === missingName ? '#dc2626' : '#1e293b';

  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  const dx = A.x - B.x, dy = A.y - B.y, len = Math.sqrt(dx * dx + dy * dy);
  const nx = (dy / len) * 24, ny = (-dx / len) * 24;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: '100%', height: 'auto', direction: 'ltr' }}>
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="#eef2ff" stroke="#4338ca" strokeWidth="2.5" />
      <polyline points={`${C.x - ms},${C.y} ${C.x - ms},${C.y - ms} ${C.x},${C.y - ms}`}
        fill="none" stroke="#4338ca" strokeWidth="1.5" />

      <text x={A.x + 8} y={A.y - 6}  fontSize="15" fill="#4338ca" fontWeight="bold" fontFamily="serif">A</text>
      <text x={B.x - 16} y={B.y + 6} fontSize="15" fill="#4338ca" fontWeight="bold" fontFamily="serif">B</text>
      <text x={C.x + 8} y={C.y + 18} fontSize="15" fill="#4338ca" fontWeight="bold" fontFamily="serif">C</text>

      <text x={(B.x + C.x) / 2} y={C.y + 20} textAnchor="middle" fontSize="11" fill="#6b7280">BC</text>
      <text x={(B.x + C.x) / 2} y={C.y + 36} textAnchor="middle" fontSize="16" fontWeight="bold" fill={col('BC')}>{label('BC')}</text>

      <text x={A.x + 16} y={(A.y + C.y) / 2 - 4} textAnchor="start" fontSize="11" fill="#6b7280">AC</text>
      <text x={A.x + 16} y={(A.y + C.y) / 2 + 14} textAnchor="start" fontSize="16" fontWeight="bold" fill={col('AC')}>{label('AC')}</text>

      <text x={mx + nx} y={my + ny - 8} textAnchor="middle" fontSize="11" fill="#6b7280">AB</text>
      <text x={mx + nx} y={my + ny + 10} textAnchor="middle" fontSize="16" fontWeight="bold" fill={col('AB')}>{label('AB')}</text>
    </svg>
  );
}

/* ═══════════════ Shape SVG (Ch 2) ═══════════════ */
function QuadSVG({ quad, selected, onClickVertex, clickMode, activeTri, showAns }) {
  const { P, outline, lines, dash, dashName, labels, vals, ra, vdir = {} } = quad;
  const names = Object.keys(P);
  const xs = names.map(n => P[n][0]), ys = names.map(n => P[n][1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const maxD = 200, pad = 55;
  const sc = maxD / Math.max(maxX - minX, maxY - minY, 1);
  const pts = {};
  names.forEach(n => { pts[n] = { x: pad + (P[n][0] - minX) * sc, y: pad + (maxY - P[n][1]) * sc }; });
  const svgW = (maxX - minX) * sc + pad * 2, svgH = (maxY - minY) * sc + pad * 2;
  const cx = outline.reduce((s, v) => s + pts[v].x, 0) / outline.length;
  const cy = outline.reduce((s, v) => s + pts[v].y, 0) / outline.length;
  const polyStr = outline.map(v => `${pts[v].x},${pts[v].y}`).join(' ');

  /* a label next to segment p–q, on the side away from point `away` (default: the shape's centre) */
  const labelAt = (p, q, away, dist = 24) => {
    const p1 = pts[p], p2 = pts[q];
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    const ax = away ? pts[away].x : cx, ay = away ? pts[away].y : cy;
    const dot = nx * (mx - ax) + ny * (my - ay);
    if (dot < 0 || (Math.abs(dot) < 1 && ny > 0)) { nx = -nx; ny = -ny; }
    return { x: mx + nx * dist, y: my + ny * dist };
  };

  const edges = outline.map((v, i) => [v, outline[(i + 1) % outline.length]]);
  const isDash = (p, q) => segName(p, q) === dashName;
  const dashAway = (labels.find(l => segName(l[0], l[1]) === dashName) || [])[2];
  const dl = labelAt(dash[0], dash[1], dashAway);

  const raSize = 12;
  const raMark = (v, t1, t2) => {
    const vt = pts[v], p1 = pts[t1], p2 = pts[t2];
    const d1 = Math.hypot(p1.x - vt.x, p1.y - vt.y) || 1, d2 = Math.hypot(p2.x - vt.x, p2.y - vt.y) || 1;
    const ux1 = (p1.x - vt.x) / d1 * raSize, uy1 = (p1.y - vt.y) / d1 * raSize;
    const ux2 = (p2.x - vt.x) / d2 * raSize, uy2 = (p2.y - vt.y) / d2 * raSize;
    return `${vt.x+ux1},${vt.y+uy1} ${vt.x+ux1+ux2},${vt.y+uy1+uy2} ${vt.x+ux2},${vt.y+uy2}`;
  };

  const vlPos = v => {
    let dx, dy;
    if (vdir[v]) { dx = vdir[v][0]; dy = -vdir[v][1]; }
    else { dx = pts[v].x - cx; dy = pts[v].y - cy; if (Math.hypot(dx, dy) < 1) { dx = 0; dy = 1; } }
    const d = Math.hypot(dx, dy) || 1;
    return { x: pts[v].x + dx / d * 19, y: pts[v].y + dy / d * 19 + 5 };
  };

  const triPoly = activeTri ? [...activeTri.verts].map(v => `${pts[v].x},${pts[v].y}`).join(' ') : null;
  const diagVal = showAns && activeTri ? fmtVal(activeTri.missingVal) : 'x';

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: '100%', height: 'auto', direction: 'ltr' }}>
      <polygon points={polyStr} fill="#eef2ff" stroke="none" />
      {triPoly && <polygon points={triPoly} fill="rgba(99,102,241,0.18)" stroke="#6366f1" strokeWidth="2" />}

      {edges.filter(([p, q]) => !isDash(p, q)).map(([p, q]) => (
        <line key={'e' + p + q} x1={pts[p].x} y1={pts[p].y} x2={pts[q].x} y2={pts[q].y}
          stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" />
      ))}
      {lines.filter(([p, q]) => !isDash(p, q)).map(([p, q]) => (
        <line key={'l' + p + q} x1={pts[p].x} y1={pts[p].y} x2={pts[q].x} y2={pts[q].y}
          stroke="#4338ca" strokeWidth="1.8" />
      ))}
      <line x1={pts[dash[0]].x} y1={pts[dash[0]].y} x2={pts[dash[1]].x} y2={pts[dash[1]].y}
        stroke="#6366f1" strokeWidth="2.2" strokeDasharray="8,5" />

      {ra.map((r, i) =>
        <polyline key={i} points={raMark(r[0], r[1], r[2])} fill="none" stroke="#4338ca" strokeWidth="1.5" />
      )}

      {names.map(v => {
        const p = vlPos(v);
        return <text key={v} x={p.x} y={p.y} textAnchor="middle"
          fontSize="15" fill="#4338ca" fontWeight="bold" fontFamily="serif">{v}</text>;
      })}

      {labels.filter(([p, q]) => !isDash(p, q)).map(([p, q, away]) => {
        const s = labelAt(p, q, away), n = segName(p, q);
        return (
          <g key={'t' + n}>
            <text x={s.x} y={s.y - 7} textAnchor="middle" fontSize="11" fill="#6b7280">{n}</text>
            <text x={s.x} y={s.y + 9} textAnchor="middle" fontSize="15" fontWeight="bold" fill="#1e293b">{vals[n]}</text>
          </g>
        );
      })}

      <text x={dl.x} y={dl.y - 7} textAnchor="middle" fontSize="11" fill="#6b7280">{dashName}</text>
      <text x={dl.x} y={dl.y + 10} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#dc2626">{diagVal}</text>

      {clickMode && names.map(v => (
        <circle key={'c' + v} cx={pts[v].x} cy={pts[v].y} r={14}
          fill={selected.has(v) ? '#4338ca' : 'rgba(67,56,202,0.1)'}
          stroke="#4338ca" strokeWidth="2.5" style={{ cursor: 'pointer' }}
          onClick={() => onClickVertex(v)} />
      ))}
    </svg>
  );
}

/* ═══════════════ Shared: drag-solve step ═══════════════ */
function Step4({ tri, eqOrder, onDone }) {
  const buildEq = () => {
    const left = [], right = [];
    for (let i = 0; i < 2; i++) {
      const nm = eqOrder[i];
      if (nm === tri.missingName) left.push({ id: 'u', v: 0, s: 1, unk: true });
      else { const k = tri.known[nm]; left.push({ id: `n${i}`, v: k * k, s: 1, unk: false }); }
    }
    const nm2 = eqOrder[2];
    if (nm2 === tri.missingName) right.push({ id: 'u', v: 0, s: 1, unk: true });
    else { const k = tri.known[nm2]; right.push({ id: 'n2', v: k * k, s: 1, unk: false }); }
    return { left, right };
  };

  const [eq, setEq] = useState(buildEq);
  const [rootMode, setRootMode] = useState(false);
  const [ans, setAns] = useState('');
  const [fb, setFb] = useState('');

  const sqInfo = eqOrder
    .filter(nm => nm !== tri.missingName)
    .map(nm => { const k = tri.known[nm]; return `${k}\u00B2 = ${k * k}`; })
    .join(' ,  ');

  const solved = useMemo(() => {
    const { left: L, right: R } = eq;
    if (L.length === 1 && L[0].unk && R.length === 1 && !R[0].unk && R[0].v * R[0].s > 0)
      return R[0].v * R[0].s;
    if (R.length === 1 && R[0].unk && L.length === 1 && !L[0].unk && L[0].v * L[0].s > 0)
      return L[0].v * L[0].s;
    return null;
  }, [eq]);

  const move = (side, id) => {
    setEq(p => {
      const from = side === 'L' ? [...p.left] : [...p.right];
      const to   = side === 'L' ? [...p.right] : [...p.left];
      const i = from.findIndex(t => t.id === id);
      if (i < 0 || from[i].unk) return p;
      to.push({ ...from[i], s: -from[i].s });
      from.splice(i, 1);
      return side === 'L' ? { left: from, right: to } : { left: to, right: from };
    });
    setFb('');
  };

  const simplify = () => setEq(p => {
    const simp = ts => {
      const us = ts.filter(t => t.unk), ns = ts.filter(t => !t.unk);
      if (ns.length <= 1) return ts;
      const sum = ns.reduce((a, t) => a + t.v * t.s, 0);
      const res = [...us];
      if (sum !== 0) res.push({ id: ns[0].id, v: Math.abs(sum), s: sum > 0 ? 1 : -1, unk: false });
      return res.length ? res : [{ id: 'z', v: 0, s: 1, unk: false }];
    };
    return { left: simp(p.left), right: simp(p.right) };
  });

  const resetEq = () => { setEq(buildEq()); setRootMode(false); setAns(''); setFb(''); };

  const checkRoot = () => {
    const student = parseFloat(ans);
    if (isNaN(student)) { setFb('\u05D4\u05D6\u05DF \u05DE\u05E1\u05E4\u05E8.'); return; }
    const correct = Math.sqrt(solved);
    if (Math.abs(student - correct) < 0.05) onDone(parseFloat(fmtVal(correct)));
    else setFb('\u2717 \u05DC\u05D0 \u05E0\u05DB\u05D5\u05DF, \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.');
  };

  const renderSide = (terms, side) => {
    if (!terms.length) return <span style={{ color: '#9ca3af' }}>0</span>;
    return terms.map((t, i) => {
      const pre = i === 0 ? (t.s < 0 ? '\u2212' : '') : (t.s > 0 ? ' + ' : ' \u2212 ');
      const txt = t.unk ? 'x\u00B2' : String(t.v);
      const can = !t.unk && !rootMode;
      return (
        <React.Fragment key={t.id + '_' + i}>
          <span>{pre}</span>
          <span className={can ? 'drag' : ''} onClick={can ? () => move(side, t.id) : undefined}
            style={t.unk ? { color: '#dc2626', fontWeight: 700 } : {}}>{txt}</span>
        </React.Fragment>
      );
    });
  };

  return (
    <div>
      <div style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', marginBottom: 4 }}>{'\u05D7\u05D9\u05E9\u05D5\u05D1 \u05E8\u05D9\u05D1\u05D5\u05E2\u05D9\u05DD:'}</div>
      <div style={{ direction: 'ltr', textAlign: 'center', fontSize: 14, color: '#6b7280', marginBottom: 10 }}>{sqInfo}</div>

      <p style={{ marginBottom: 8, fontSize: 14 }}>{'\u05DC\u05D7\u05E5 \u05E2\u05DC \u05DE\u05E1\u05E4\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05E2\u05D1\u05D9\u05E8 \u05D0\u05D5\u05EA\u05D5 \u05DC\u05E6\u05D3 \u05D4\u05E9\u05E0\u05D9:'}</p>

      <div className="eq" style={{ fontSize: 24, padding: 14, background: '#f8fafc', borderRadius: 8 }}>
        {renderSide(eq.left, 'L')}
        <span style={{ margin: '0 10px' }}>=</span>
        {renderSide(eq.right, 'R')}
      </div>

      <div style={{ textAlign: 'center', marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center' }}>
        {!rootMode && <button className="btn bp" onClick={simplify}>{'\u05E4\u05E9\u05D8 \u2295'}</button>}
        <button className="btn" style={{ background: '#e5e7eb', color: '#374151' }} onClick={resetEq}>{'\u21BA \u05D0\u05E4\u05E1'}</button>
      </div>

      {solved !== null && !rootMode && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button className="btn bg" onClick={() => setRootMode(true)}
            style={{ fontSize: 17, padding: '10px 28px' }}>{'\u221A'} {'\u05D4\u05D5\u05E6\u05D0 \u05E9\u05D5\u05E8\u05E9'}</button>
        </div>
      )}

      {rootMode && (
        <div style={{ textAlign: 'center', marginTop: 16, direction: 'ltr' }}>
          <div style={{ fontSize: 16, marginBottom: 10, color: '#4338ca', fontWeight: 600 }}>{'\u05D4\u05D5\u05E6\u05D0 \u05E9\u05D5\u05E8\u05E9 \u05DE\u05E9\u05E0\u05D9 \u05D4\u05D0\u05D2\u05E4\u05D9\u05DD:'}</div>
          <span style={{ fontSize: 20, fontFamily: 'monospace' }}>x = </span>
          <input style={{ width: 80 }} value={ans}
            onChange={e => { setAns(e.target.value); setFb(''); }}
            onKeyDown={e => e.key === 'Enter' && checkRoot()} />
          <button className="btn bg" style={{ marginLeft: 8 }} onClick={checkRoot}>{'\u2713'} {'\u05D1\u05D3\u05D5\u05E7'}</button>
        </div>
      )}

      {fb && <div className="fb err" style={{ textAlign: 'center' }}>{fb}</div>}
    </div>
  );
}

/* ═══════════════ Chapter 1 component ═══════════════ */
function Chapter1() {
  const [tri, setTri] = useState(() => makeTri());
  const [phase, setPhase] = useState(0);

  const [s1, setS1]     = useState('');
  const [s1fb, setS1fb] = useState('');
  const [s2, setS2]     = useState('');
  const [s2fb, setS2fb] = useState('');
  const [eqOrd, setEqOrd] = useState([]);
  const [s3, setS3]     = useState(['', '', '']);
  const [s3fb, setS3fb] = useState('');
  const [solVal, setSolVal] = useState(null);

  const sideNames = ['AB', 'BC', 'AC'];

  const reset = () => {
    setTri(makeTri()); setPhase(0);
    setS1(''); setS1fb('');
    setS2(''); setS2fb(''); setEqOrd([]);
    setS3(['', '', '']); setS3fb('');
    setSolVal(null);
  };

  const chk1 = () => {
    if (s1 === 'AB') { setS1fb(''); setPhase(1); }
    else setS1fb('\u05D4\u05D9\u05EA\u05E8 \u05D4\u05D9\u05D0 \u05D4\u05E6\u05DC\u05E2 \u05D4\u05D0\u05E8\u05D5\u05DB\u05D4 \u05D1\u05D9\u05D5\u05EA\u05E8, \u05D4\u05E0\u05DE\u05E6\u05D0\u05EA \u05DE\u05D5\u05DC \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05D4\u05D9\u05E9\u05E8\u05D4. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.');
  };

  const chk2 = () => {
    const legs = sideNames.filter(n => n !== 'AB');
    const clean = s2.replace(/\s+/g, '').toUpperCase();
    const m = clean.match(/^([A-Z]{2})(?:\^2|\*\*2|\u00B2)\+([A-Z]{2})(?:\^2|\*\*2|\u00B2)=([A-Z]{2})(?:\^2|\*\*2|\u00B2)$/);
    const ok = m && m[3] === 'AB' && new Set([m[1], m[2]]).size === 2 &&
      [m[1], m[2]].every(n => legs.includes(n));
    if (!ok) { setS2fb('\u2717 \u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4.'); return; }
    setS2fb(''); setEqOrd([m[1], m[2], m[3]]); setPhase(2);
  };

  const chk3 = () => {
    for (let i = 0; i < 3; i++) {
      const nm = eqOrd[i];
      if (nm === tri.missingName) {
        if (s3[i].trim().toLowerCase() !== 'x') { setS3fb('\u05E1\u05DE\u05DF x \u05E2\u05D1\u05D5\u05E8 \u05D4\u05E6\u05DC\u05E2 \u05D4\u05D7\u05E1\u05E8\u05D4.'); return; }
      } else {
        const v = parseFloat(s3[i]);
        if (isNaN(v) || v !== tri.known[nm]) { setS3fb('\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E2\u05E8\u05DB\u05D9\u05DD \u05D4\u05DE\u05E1\u05E4\u05E8\u05D9\u05D9\u05DD \u05E9\u05D4\u05D6\u05E0\u05EA.'); return; }
      }
    }
    setS3fb(''); setPhase(3);
  };

  const upS3 = (i, v) => { const a = [...s3]; a[i] = v; setS3(a); };

  return (
    <div className="main">
      <div className="tri-box">
        <TriSVG tri={tri} showAns={phase === 4} />
        <div style={{ marginTop: 10 }}>
          <button className="btn bp" onClick={reset}>{'\u05DE\u05E9\u05D5\u05DC\u05E9 \u05D7\u05D3\u05E9 \u21BA'}</button>
        </div>
      </div>

      <div className="steps">
        {/* Step 1 — identify hypotenuse */}
        <div className={`card ${phase > 0 ? 'done' : 'on'}`}>
          <div className="card-t">{'\u05E9\u05DC\u05D1 1 \u2014 \u05D6\u05D9\u05D4\u05D5\u05D9 \u05D4\u05D9\u05EA\u05E8'}</div>
          {phase === 0 ? (<>
            <p>{'\u05D0\u05D9\u05D6\u05D5 \u05E6\u05DC\u05E2 \u05D4\u05D9\u05D0 \u05D4\u05D9\u05EA\u05E8?'}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
              {sideNames.map(n => (
                <button key={n} className={`btn ${s1 === n ? 'bp' : ''}`}
                  style={s1 !== n ? { background: '#e5e7eb', color: '#1e293b' } : {}}
                  onClick={() => { setS1(n); setS1fb(''); }}>{n}</button>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button className="btn bg" onClick={chk1} disabled={!s1}>{'\u2713'} {'\u05D1\u05D3\u05D5\u05E7'}</button>
            </div>
            {s1fb && <div className="fb err">{s1fb}</div>}
          </>) : (
            <p style={{ color: '#16a34a' }}>{'\u2713'} AB</p>
          )}
        </div>

        {/* Step 2 — write equation */}
        {phase >= 1 && (
          <div className={`card ${phase > 1 ? 'done' : 'on'}`}>
            <div className="card-t">{'\u05E9\u05DC\u05D1 2 \u2014 \u05DB\u05EA\u05D9\u05D1\u05EA \u05D4\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4'}</div>
            {phase === 1 ? (<>
              <p>{'\u05DB\u05EA\u05D5\u05D1 \u05D0\u05EA \u05DE\u05E9\u05E4\u05D8 \u05E4\u05D9\u05EA\u05D2\u05D5\u05E8\u05E1 \u05E2\u05D1\u05D5\u05E8 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9 (\u05DC\u05D3\u05D5\u05D2\u05DE\u05D4: XY\u00B2+YZ\u00B2=XZ\u00B2):'}</p>
              <div className="eq" style={{ textAlign: 'center' }}>
                <input style={{ width: 220, direction: 'ltr' }} value={s2}
                  onChange={e => { setS2(e.target.value); setS2fb(''); }}
                  onKeyDown={e => e.key === 'Enter' && chk2()} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button className="btn bg" onClick={chk2}>{'\u2713'} {'\u05D1\u05D3\u05D5\u05E7'}</button>
              </div>
              {s2fb && <div className="fb err">{s2fb}</div>}
            </>) : (
              <p className="eq" style={{ color: '#16a34a' }}>
                {'\u2713'} {eqOrd[0]}{'\u00B2'} + {eqOrd[1]}{'\u00B2'} = {eqOrd[2]}{'\u00B2'}
              </p>
            )}
          </div>
        )}

        {/* Step 3 — substitute values */}
        {phase >= 2 && (
          <div className={`card ${phase > 2 ? 'done' : 'on'}`}>
            <div className="card-t">{'\u05E9\u05DC\u05D1 3 \u2014 \u05D4\u05E6\u05D1\u05EA \u05E2\u05E8\u05DB\u05D9\u05DD'}</div>
            {phase === 2 ? (<>
              <p>{'\u05D4\u05E6\u05D1 \u05D0\u05EA \u05D4\u05E2\u05E8\u05DB\u05D9\u05DD \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D1\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4 (\u05E1\u05DE\u05DF x \u05DC\u05E6\u05DC\u05E2 \u05D4\u05D7\u05E1\u05E8\u05D4):'}</p>
              <div className="eq" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{eqOrd[0]}</div>
                  <input style={{ width: 55 }} value={s3[0]} onChange={e => upS3(0, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && chk3()} />
                  <span>{'\u00B2'}</span>
                </div>
                <span style={{ fontSize: 20, paddingBottom: 4 }}>+</span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{eqOrd[1]}</div>
                  <input style={{ width: 55 }} value={s3[1]} onChange={e => upS3(1, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && chk3()} />
                  <span>{'\u00B2'}</span>
                </div>
                <span style={{ fontSize: 20, paddingBottom: 4 }}>=</span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{eqOrd[2]}</div>
                  <input style={{ width: 55 }} value={s3[2]} onChange={e => upS3(2, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && chk3()} />
                  <span>{'\u00B2'}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button className="btn bg" onClick={chk3}>{'\u2713'} {'\u05D1\u05D3\u05D5\u05E7'}</button>
              </div>
              {s3fb && <div className="fb err">{s3fb}</div>}
            </>) : (
              <p className="eq" style={{ color: '#16a34a' }}>
                {'\u2713'} {s3[0]}{'\u00B2'} + {s3[1]}{'\u00B2'} = {s3[2]}{'\u00B2'}
              </p>
            )}
          </div>
        )}

        {/* Step 4 — solve */}
        {phase >= 3 && (
          <div className={`card ${phase > 3 ? 'done' : 'on'}`}>
            <div className="card-t">{'\u05E9\u05DC\u05D1 4 \u2014 \u05D7\u05D9\u05E9\u05D5\u05D1 \u05D5\u05E4\u05EA\u05E8\u05D5\u05DF'}</div>
            {phase === 3 ? (
              <Step4 tri={tri} eqOrder={eqOrd} onDone={v => { setSolVal(v); setPhase(4); }} />
            ) : (
              <p className="eq" style={{ color: '#16a34a' }}>
                {'\u2713'} {tri.missingName} = {solVal}
              </p>
            )}
          </div>
        )}

        {/* Success banner */}
        {phase === 4 && (
          <div className="banner">
            {'\u2705'} {'\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3!'} &nbsp; {tri.missingName} = {solVal}
            <div style={{ marginTop: 12 }}>
              <button className="btn" style={{ background: '#fff', color: '#16a34a', fontSize: 17 }}
                onClick={reset}>{'\u05DE\u05E9\u05D5\u05DC\u05E9 \u05D7\u05D3\u05E9 \u21BA'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Where the theorem comes from + one solved example (Sulaiman, fixes board #47).
   A 3-4-5 right triangle with a square built on every side; the unit grid lets
   the student count: 9 + 16 = 25. */
function PyProofSVG() {
  const u = 22, ox = 3 * u + 14, oy = 7 * u + 14;           // math (x, y) → svg; C = (0, 0)
  const P = (x, y) => [ox + x * u, oy - y * u];
  const pts = (...a) => a.map(([x, y]) => P(x, y).join(',')).join(' ');
  const A = [0, 3], B = [4, 0], C = [0, 0], N = [3, 4];         // N: step from AB outwards (length 5)
  const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k];
  const grid = [];
  for (let i = 1; i < 3; i++) grid.push([[-i, 0], [-i, 3]], [[0, i], [-3, i]]);                                   // a² (left)
  for (let i = 1; i < 4; i++) grid.push([[i, 0], [i, -4]], [[0, -i], [4, -i]]);                                   // b² (below)
  for (let i = 1; i < 5; i++) { const t = i / 5;
    grid.push([add(A, [4, -3], t), add(add(A, [4, -3], t), N)], [add(A, N, t), add(B, N, t)]); }                // c² (on the hypotenuse)
  const label = (x, y, t, c, fs = 15) => { const [sx, sy] = P(x, y); return <text x={sx} y={sy} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fontWeight={fs < 15 ? 700 : 800} fill={c}>{t}</text>; };
  return (
    <svg className="py-proof" viewBox={`0 0 ${10 * u + 28} ${11 * u + 28}`} role="img" aria-label="משולש ישר-זווית עם ריבוע על כל צלע: 9 ועוד 16 שווה 25">
      <polygon points={pts([0, 0], [0, 3], [-3, 3], [-3, 0])} fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
      <polygon points={pts([0, 0], [4, 0], [4, -4], [0, -4])} fill="#ffedd5" stroke="#ea580c" strokeWidth="2" />
      <polygon points={pts(A, B, add(B, N), add(A, N))} fill="#dcfce7" stroke="#16a34a" strokeWidth="2" />
      {grid.map(([p, q], i) => <line key={i} x1={P(...p)[0]} y1={P(...p)[1]} x2={P(...q)[0]} y2={P(...q)[1]} stroke="#0f172a" strokeOpacity=".18" strokeWidth="1" />)}
      <polygon points={pts(A, B, C)} fill="#fff" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
      <polyline points={pts([0.5, 0], [0.5, 0.5], [0, 0.5])} fill="none" stroke="#0f172a" strokeWidth="1.5" />
      {label(-1.5, 1.95, 'a = 3', '#1d4ed8', 13)}{label(-1.5, 1.05, 'a² = 9', '#1d4ed8')}
      {label(2, -1.55, 'b = 4', '#c2410c', 13)}{label(2, -2.45, 'b² = 16', '#c2410c')}
      {label(3.5, 3.95, 'c = 5', '#15803d', 13)}{label(3.5, 3.05, 'c² = 25', '#15803d')}
      {label(0.42, 1.15, 'a', '#1d4ed8', 14)}{label(1.55, 0.4, 'b', '#c2410c', 14)}{label(1.75, 1.15, 'c', '#15803d', 14)}
    </svg>
  );
}

function PyIntro() {
  const [open, setOpen] = useState(true);
  return (
    <div className="py-intro">
      <button className="py-intro-t" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>מאיפה מגיע המשפט? הסבר ודוגמה פתורה</span><span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="py-intro-b">
        <div className="py-why">
          <PyProofSVG />
          <div className="py-why-t">
            <p>במשולש ישר-זווית, <b>הניצבים</b> הם שתי הצלעות שיוצרות את הזווית הישרה (a ו-b), ו<b>היתר</b> הוא הצלע הארוכה שמולה (c).</p>
            <p>בונים <b>ריבוע</b> על כל צלע. השטח של ריבוע שצלעו a הוא <bdi dir="ltr">a · a = a²</bdi>.</p>
            <p>סופרים משבצות: בריבוע הכחול <b>9</b>, בכתום <b>16</b> ובירוק <b>25</b>. ואכן <bdi dir="ltr">9 + 16 = 25</bdi>.</p>
            <p className="py-rule">בכל משולש ישר-זווית: שטח הריבוע על היתר שווה לסכום השטחים של הריבועים על הניצבים:<br /><bdi dir="ltr" className="py-big">a² + b² = c²</bdi></p>
          </div>
        </div>
        <div className="py-ex">
          <div className="py-ex-t">דוגמה פתורה</div>
          <p>במשולש ישר-זווית הניצבים הם 6 ו-8. מה אורך היתר?</p>
          <ol>
            <li><b>זיהוי היתר:</b> היתר הוא הצלע שמול הזווית הישרה. נקרא לו c.</li>
            <li><b>כתיבת המשוואה:</b> <bdi dir="ltr">a² + b² = c²</bdi></li>
            <li><b>הצבת ערכים:</b> <bdi dir="ltr">6² + 8² = c²</bdi></li>
            <li><b>חישוב:</b> <bdi dir="ltr">36 + 64 = c²</bdi>, כלומר <bdi dir="ltr">c² = 100</bdi>, ולכן <bdi dir="ltr">c = √100 = 10</bdi></li>
          </ol>
          <p className="py-ans">✓ אורך היתר הוא 10</p>
        </div>
      </div>}
    </div>
  );
}

/* ═══════════════ Chapter 2 component ═══════════════ */
function Chapter2() {
  const [quad, setQuad] = useState(() => makeQuad());
  const [phase, setPhase] = useState(0); // 0-5
  const [activeTri, setActiveTri] = useState(null);

  const [selVerts, setSelVerts] = useState(new Set());
  const [s1fb, setS1fb] = useState('');

  const [s2, setS2]     = useState('');
  const [s2fb, setS2fb] = useState('');

  const [s3, setS3]     = useState('');
  const [s3fb, setS3fb] = useState('');
  const [eqOrd, setEqOrd] = useState([]);

  const [s4, setS4]     = useState(['', '', '']);
  const [s4fb, setS4fb] = useState('');

  const [solVal, setSolVal] = useState(null);

  const reset = () => {
    setQuad(makeQuad()); setPhase(0); setActiveTri(null);
    setSelVerts(new Set()); setS1fb('');
    setS2(''); setS2fb('');
    setS3(''); setS3fb(''); setEqOrd([]);
    setS4(['', '', '']); setS4fb('');
    setSolVal(null);
  };

  const onClickVertex = v => {
    if (phase !== 0) return;
    setSelVerts(prev => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v); else if (next.size < 3) next.add(v);
      return next;
    });
    setS1fb('');
  };

  /* step checks */
  const chk1 = () => {
    if (selVerts.size !== 3) { setS1fb('\u05D1\u05D7\u05E8 3 \u05E7\u05D5\u05D3\u05E7\u05D5\u05D3\u05D9\u05DD.'); return; }
    const match = quad.validTriangles.find(t => {
      if (t.verts.size !== selVerts.size) return false;
      for (const v of selVerts) if (!t.verts.has(v)) return false;
      return true;
    });
    if (!match) {
      setS1fb('\u05D4\u05E7\u05D5\u05D3\u05E7\u05D5\u05D3\u05D9\u05DD \u05E9\u05E0\u05D1\u05D7\u05E8\u05D5 \u05DC\u05D0 \u05D9\u05D5\u05E6\u05E8\u05D9\u05DD \u05DE\u05E9\u05D5\u05DC\u05E9 \u05D9\u05E9\u05E8-\u05D6\u05D5\u05D5\u05D9\u05EA \u05E9\u05DB\u05D5\u05DC\u05DC \u05D0\u05EA \u05D4\u05E7\u05D5 \u05D4\u05DE\u05E7\u05D5\u05D5\u05E7\u05D5. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.');
      return;
    }
    setActiveTri(match); setS1fb(''); setPhase(1);
  };

  const chk2 = () => {
    if (s2 === activeTri.hyp) { setS2fb(''); setPhase(2); }
    else setS2fb('\u05D4\u05D9\u05EA\u05E8 \u05D4\u05D9\u05D0 \u05D4\u05E6\u05DC\u05E2 \u05D4\u05D0\u05E8\u05D5\u05DB\u05D4 \u05D1\u05D9\u05D5\u05EA\u05E8, \u05DE\u05D5\u05DC \u05D4\u05D6\u05D5\u05D5\u05D9\u05EA \u05D4\u05D9\u05E9\u05E8\u05D4. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.');
  };

  const chk3 = () => {
    const legs = activeTri.sideNames.filter(n => n !== activeTri.hyp);
    const clean = s3.replace(/\s+/g, '').toUpperCase();
    const m = clean.match(/^([A-Z]{2})(?:\^2|\*\*2|\u00B2)\+([A-Z]{2})(?:\^2|\*\*2|\u00B2)=([A-Z]{2})(?:\^2|\*\*2|\u00B2)$/);
    const nz = s => s.split('').sort().join('');   /* MA and AM are the same segment */
    const n1 = m && nz(m[1]), n2 = m && nz(m[2]), n3 = m && nz(m[3]);
    const ok = m && n3 === activeTri.hyp && n1 !== n2 &&
      [n1, n2].every(n => legs.includes(n));
    if (!ok) { setS3fb('\u2717 \u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4.'); return; }
    setS3fb(''); setEqOrd([n1, n2, n3]); setPhase(3);
  };

  const chk4 = () => {
    for (let i = 0; i < 3; i++) {
      const nm = eqOrd[i];
      if (nm === activeTri.missingName) {
        if (s4[i].trim().toLowerCase() !== 'x') { setS4fb('\u05E1\u05DE\u05DF x \u05E2\u05D1\u05D5\u05E8 \u05D4\u05E6\u05DC\u05E2 \u05D4\u05D7\u05E1\u05E8\u05D4.'); return; }
      } else {
        const v = parseFloat(s4[i]);
        if (isNaN(v) || v !== activeTri.known[nm]) { setS4fb('\u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E2\u05E8\u05DB\u05D9\u05DD \u05E9\u05D4\u05D6\u05E0\u05EA.'); return; }
      }
    }
    setS4fb(''); setPhase(4);
  };

  const upS4 = (i, v) => { const a = [...s4]; a[i] = v; setS4(a); };

  return (
    <div className="main">
      {/* shape panel */}
      <div className="tri-box">
        <div style={{ fontWeight: 700, color: '#4338ca', marginBottom: 8, fontSize: 17 }}>{quad.label}</div>
        <QuadSVG quad={quad} selected={selVerts} onClickVertex={onClickVertex}
          clickMode={phase === 0} activeTri={phase >= 1 ? activeTri : null} showAns={phase === 5} />
        <div style={{ marginTop: 10 }}>
          <button className="btn bp" onClick={reset}>{'\u05EA\u05E8\u05D2\u05D9\u05DC \u05D7\u05D3\u05E9 \u21BA'}</button>
        </div>
      </div>

      {/* steps */}
      <div className="steps">

        {/* ── Step 1 — identify the triangle ── */}
        <div className={`card ${phase > 0 ? 'done' : 'on'}`}>
          <div className="card-t">{'\u05E9\u05DC\u05D1 1 \u2014 \u05D6\u05D9\u05D4\u05D5\u05D9 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9 \u05D4\u05D9\u05E9\u05E8-\u05D6\u05D5\u05D5\u05D9\u05EA'}</div>
          {phase === 0 ? (<>
            <p>{'\u05DC\u05D7\u05E5 \u05E2\u05DC 3 \u05E7\u05D5\u05D3\u05E7\u05D5\u05D3\u05D9\u05DD \u05E9\u05D9\u05D5\u05E6\u05E8\u05D9\u05DD \u05DE\u05E9\u05D5\u05DC\u05E9 \u05D9\u05E9\u05E8-\u05D6\u05D5\u05D5\u05D9\u05EA \u05D1\u05EA\u05D5\u05DA \u05D4'}{quad.label}:</p>
            <div style={{ textAlign: 'center', marginTop: 8, minHeight: 30 }}>
              {selVerts.size > 0 && (
                <span style={{ fontWeight: 700, fontSize: 18, color: '#4338ca' }}>
                  {[...selVerts].sort().join(' , ')}
                </span>
              )}
            </div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button className="btn bg" onClick={chk1} disabled={selVerts.size !== 3}>{'\u2713'} {'\u05D1\u05D3\u05D5\u05E7'}</button>
            </div>
            {s1fb && <div className="fb err">{s1fb}</div>}
          </>) : (
            <p style={{ color: '#16a34a' }}>{'\u2713'} {'\u25B3'}{[...activeTri.verts].sort().join('')}</p>
          )}
        </div>

        {/* ── Step 2 — identify hypotenuse ── */}
        {phase >= 1 && (
          <div className={`card ${phase > 1 ? 'done' : 'on'}`}>
            <div className="card-t">{'\u05E9\u05DC\u05D1 2 \u2014 \u05D6\u05D9\u05D4\u05D5\u05D9 \u05D4\u05D9\u05EA\u05E8'}</div>
            {phase === 1 ? (<>
              <p>{'\u05D0\u05D9\u05D6\u05D5 \u05E6\u05DC\u05E2 \u05D4\u05D9\u05D0 \u05D4\u05D9\u05EA\u05E8 \u05D1\u05DE\u05E9\u05D5\u05DC\u05E9 '}{[...activeTri.verts].sort().join('')}?</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
                {activeTri.sideNames.map(n => (
                  <button key={n} className={`btn ${s2 === n ? 'bp' : ''}`}
                    style={s2 !== n ? { background: '#e5e7eb', color: '#1e293b' } : {}}
                    onClick={() => { setS2(n); setS2fb(''); }}>{n}</button>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button className="btn bg" onClick={chk2} disabled={!s2}>{'\u2713'} {'\u05D1\u05D3\u05D5\u05E7'}</button>
              </div>
              {s2fb && <div className="fb err">{s2fb}</div>}
            </>) : (
              <p style={{ color: '#16a34a' }}>{'\u2713'} {activeTri.hyp}</p>
            )}
          </div>
        )}

        {/* ── Step 3 — write equation ── */}
        {phase >= 2 && (
          <div className={`card ${phase > 2 ? 'done' : 'on'}`}>
            <div className="card-t">{'\u05E9\u05DC\u05D1 3 \u2014 \u05DB\u05EA\u05D9\u05D1\u05EA \u05D4\u05DE\u05E9\u05D5\u05D5\u05D0\u05D4'}</div>
            {phase === 2 ? (<>
              <p>{'\u05DB\u05EA\u05D5\u05D1 \u05D0\u05EA \u05DE\u05E9\u05E4\u05D8 \u05E4\u05D9\u05EA\u05D2\u05D5\u05E8\u05E1 \u05E2\u05D1\u05D5\u05E8 \u05D4\u05DE\u05E9\u05D5\u05DC\u05E9 (\u05DC\u05D3\u05D5\u05D2\u05DE\u05D4: XY\u00B2+YZ\u00B2=XZ\u00B2):'}</p>
              <div className="eq" style={{ textAlign: 'center' }}>
                <input style={{ width: 220, direction: 'ltr' }} value={s3}
                  onChange={e => { setS3(e.target.value); setS3fb(''); }}
                  onKeyDown={e => e.key === 'Enter' && chk3()} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button className="btn bg" onClick={chk3}>{'\u2713'} {'\u05D1\u05D3\u05D5\u05E7'}</button>
              </div>
              {s3fb && <div className="fb err">{s3fb}</div>}
            </>) : (
              <p className="eq" style={{ color: '#16a34a' }}>
                {'\u2713'} {eqOrd[0]}{'\u00B2'} + {eqOrd[1]}{'\u00B2'} = {eqOrd[2]}{'\u00B2'}
              </p>
            )}
          </div>
        )}

        {/* ── Step 4 — substitute values ── */}
        {phase >= 3 && (
          <div className={`card ${phase > 3 ? 'done' : 'on'}`}>
            <div className="card-t">{'\u05E9\u05DC\u05D1 4 \u2014 \u05D4\u05E6\u05D1\u05EA \u05E2\u05E8\u05DB\u05D9\u05DD'}</div>
            {phase === 3 ? (<>
              <p>{'\u05D4\u05E6\u05D1 \u05D0\u05EA \u05D4\u05E2\u05E8\u05DB\u05D9\u05DD \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD (\u05E1\u05DE\u05DF x \u05DC\u05E6\u05DC\u05E2 \u05D4\u05D7\u05E1\u05E8\u05D4):'}</p>
              <div className="eq" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{eqOrd[0]}</div>
                  <input style={{ width: 55 }} value={s4[0]} onChange={e => upS4(0, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && chk4()} />
                  <span>{'\u00B2'}</span>
                </div>
                <span style={{ fontSize: 20, paddingBottom: 4 }}>+</span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{eqOrd[1]}</div>
                  <input style={{ width: 55 }} value={s4[1]} onChange={e => upS4(1, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && chk4()} />
                  <span>{'\u00B2'}</span>
                </div>
                <span style={{ fontSize: 20, paddingBottom: 4 }}>=</span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{eqOrd[2]}</div>
                  <input style={{ width: 55 }} value={s4[2]} onChange={e => upS4(2, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && chk4()} />
                  <span>{'\u00B2'}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button className="btn bg" onClick={chk4}>{'\u2713'} {'\u05D1\u05D3\u05D5\u05E7'}</button>
              </div>
              {s4fb && <div className="fb err">{s4fb}</div>}
            </>) : (
              <p className="eq" style={{ color: '#16a34a' }}>
                {'\u2713'} {s4[0]}{'\u00B2'} + {s4[1]}{'\u00B2'} = {s4[2]}{'\u00B2'}
              </p>
            )}
          </div>
        )}

        {/* ── Step 5 — solve ── */}
        {phase >= 4 && (
          <div className={`card ${phase > 4 ? 'done' : 'on'}`}>
            <div className="card-t">{'\u05E9\u05DC\u05D1 5 \u2014 \u05D7\u05D9\u05E9\u05D5\u05D1 \u05D5\u05E4\u05EA\u05E8\u05D5\u05DF'}</div>
            {phase === 4 ? (
              <Step4 tri={activeTri} eqOrder={eqOrd}
                onDone={v => { setSolVal(v); setPhase(5); }} />
            ) : (
              <p className="eq" style={{ color: '#16a34a' }}>
                {'\u2713'} {activeTri.missingName} = {solVal}
              </p>
            )}
          </div>
        )}

        {/* Success banner */}
        {phase === 5 && (
          <div className="banner">
            {'\u2705'} {'\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3!'} &nbsp; {activeTri.missingName} = {solVal}
            <div style={{ marginTop: 12 }}>
              <button className="btn" style={{ background: '#fff', color: '#16a34a', fontSize: 17 }}
                onClick={reset}>{'\u05EA\u05E8\u05D2\u05D9\u05DC \u05D7\u05D3\u05E9 \u21BA'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ Main App ═══════════════ */
function App() {
  const [chapter, setChapter] = useState(1);
  return (
    <div>
      <div className="hdr">
        <div className="hdr-title">{'\u05DE\u05E9\u05E4\u05D8 \u05E4\u05D9\u05EA\u05D2\u05D5\u05E8\u05E1'}</div>
        <div className="ch-btns">
          <button className={`ch-btn ${chapter === 1 ? 'active' : ''}`}
            onClick={() => setChapter(1)}>{'\u05E4\u05E8\u05E7 1 \u2014 \u05DE\u05E9\u05D5\u05DC\u05E9\u05D9\u05DD'}</button>
          <button className={`ch-btn ${chapter === 2 ? 'active' : ''}`}
            onClick={() => setChapter(2)}>{'\u05E4\u05E8\u05E7 2 \u2014 \u05D9\u05D9\u05E9\u05D5\u05DD'}</button>
        </div>
      </div>
      {chapter === 1 ? <><PyIntro key="in1" /><Chapter1 key="ch1" /></> : <Chapter2 key="ch2" />}
    </div>
  );
}


// ===== END ORIGINAL =====
export default App;
