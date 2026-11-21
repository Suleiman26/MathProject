/* The proofs section: from a figure (maths coordinates, y up) to a screen layout (pixels of a
   `0 0 W H` viewBox, y down): parts, invisible hit shapes, marks (ticks / arcs / a square),
   point labels placed by measuring (never on a line), the chooser for near taps, and the rigid
   motion of the ending. Pure: no React, no window.
   L.segs = every drawn segment ({ id, n, a, b, tap }); `tap:false` for fig.plain (drawn, not tappable). */
import { add, sub, mul, dot, unit, dist, distPointSeg, textW, TH } from '../new/chapters/geometry/geo.js';
import { segKey, triKey, angKey, kindOf, congOf } from './core.js';
import { T } from './texts.js';

const PAD = 24;                 // room around the drawing for the letters
const HIT_W = 22, PULL_BUSY = 28, PULL = 12, WEDGE = 30, ARC_R = 18, ARC_STEP = 4;
const TICK_HALF = 6, TICK_GAP = 4.6, SQUARE = 9, CLEAR = 1.5;

/** A part's id: 's:AO', 'a:O:AC' (by rays: pass the figure to merge ∢OAC with ∢BAC), 't:ACO'. */
export function partId(part, fig) {
  const k = kindOf(part);
  if (k === 'seg') return `s:${segKey(part)}`;
  if (k === 'tri') return `t:${triKey(part)}`;
  return `a:${angKey(fig || { points: {}, lines: [] }, part)}`;
}
/** A part's name: { m:'AO', he:'הקטע AO' } · { m:'∢AOC', he:'הזווית AOC' } · { m:'△AOC', he:'המשולש AOC' }. */
export function partName(part) {
  const k = kindOf(part);
  if (k === 'seg') return { m: part, he: `${T['lbl.theSeg']} ${part}` };
  if (k === 'tri') { const s = part.join(''); return { m: `△${s}`, he: `${T['lbl.theTri']} ${s}` }; }
  const s = `${part.r[0]}${part.v}${part.r[1]}`;
  return { m: `∢${s}`, he: `${T['lbl.theAng']} ${s}` };
}

const r1 = (n) => Math.round(n * 10) / 10;
const cross = (p, q) => p[0] * q[1] - p[1] * q[0];
/** An arc path around v from direction u1 to direction u2 (the small arc). */
function arcPath(v, u1, u2, r) {
  const a = add(v, mul(u1, r)), b = add(v, mul(u2, r));
  return `M${r1(a[0])} ${r1(a[1])}A${r} ${r} 0 0 ${cross(u1, u2) > 0 ? 1 : 0} ${r1(b[0])} ${r1(b[1])}`;
}
const bisector = (u1, u2) => { const b = add(u1, u2); return Math.hypot(b[0], b[1]) < 1e-9 ? [-u1[1], u1[0]] : unit(b); };

/* ── label boxes ──────────────────────────────────────────────────────────── */
const boxOf = (l) => [l.x - l.w / 2, l.y - l.h / 2, l.x + l.w / 2, l.y + l.h / 2];
const inBox = (p, b, e = 0) => p[0] > b[0] - e && p[0] < b[2] + e && p[1] > b[1] - e && p[1] < b[3] + e;
function segsCross(a, b, c, d) {
  const d1 = cross(sub(b, a), sub(c, a)), d2 = cross(sub(b, a), sub(d, a)), d3 = cross(sub(d, c), sub(a, c)), d4 = cross(sub(d, c), sub(b, c));
  return d1 * d2 < 0 && d3 * d4 < 0;
}
/** The distance between a segment and a box (0 when they touch). */
function segBoxDist(a, b, box) {
  if (inBox(a, box) || inBox(b, box)) return 0;
  const C = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
  for (let i = 0; i < 4; i++) if (segsCross(a, b, C[i], C[(i + 1) % 4])) return 0;
  const pb = (p) => Math.hypot(Math.max(box[0] - p[0], 0, p[0] - box[2]), Math.max(box[1] - p[1], 0, p[1] - box[3]));
  return Math.min(...C.map((c) => distPointSeg(c, a, b)), pb(a), pb(b));
}
const boxesMeet = (p, q) => p[0] < q[2] && q[0] < p[2] && p[1] < q[3] && q[1] < p[3];

function errorsOf(L, l, others) {
  const out = [], b = boxOf(l);
  if (b[0] < 0 || b[1] < 0 || b[2] > L.W || b[3] > L.H) out.push(`label ${l.p} leaves the view`);
  for (const s of L.segs) if (segBoxDist(s.a, s.b, b) < CLEAR) out.push(`label ${l.p} on ${s.id}`);
  for (const h of L.hits) if (inBox(h.c, b, 2)) out.push(`label ${l.p} covers ${h.id}`);
  for (const o of others) if (o !== l && boxesMeet(b, boxOf(o))) out.push(`label ${l.p} meets label ${o.p}`);
  return out;
}
/** Everything wrong with the labels: on a segment, outside the view, over a hit shape's centre, on another label. */
export function labelErrors(L) { return L.labels.flatMap((l, i) => errorsOf(L, l, L.labels.slice(0, i))); }

/* where a point's letter wants to go: the middle of the widest free gap between its segments,
   preferring a gap that holds no tappable angle of that vertex */
function preferredDir(name, P, segs, angles, centre) {
  const dirs = segs.filter((s) => s.n.includes(name)).map((s) => unit(sub(P[s.n[0] === name ? s.n[1] : s.n[0]], P[name])));
  if (!dirs.length) { const d = sub(P[name], centre); return Math.hypot(d[0], d[1]) < 1e-6 ? [0, -1] : unit(d); }
  const at = dirs.map((d) => Math.atan2(d[1], d[0])).sort((x, y) => x - y);
  const mine = angles.filter((a) => a.vn === name).map((a) => Math.atan2(a.bis[1], a.bis[0]));
  const gaps = at.map((a, i) => { const b = i + 1 < at.length ? at[i + 1] : at[0] + 2 * Math.PI; return [a, b - a]; });
  const holds = ([a, w]) => mine.some((m) => { let t = m - a; while (t < 0) t += 2 * Math.PI; while (t >= 2 * Math.PI) t -= 2 * Math.PI; return t < w; });
  gaps.sort((g, h) => (holds(g) - holds(h)) || (h[1] - g[1]));
  const [a, w] = gaps[0], m = a + w / 2;
  return [Math.cos(m), Math.sin(m)];
}
const reach = (w, h, d) => Math.abs(d[0]) * w / 2 + Math.abs(d[1]) * h / 2;
const rot = (d, t) => [d[0] * Math.cos(t) - d[1] * Math.sin(t), d[0] * Math.sin(t) + d[1] * Math.cos(t)];

/** The screen layout of a figure. */
export function layout(fig, W = 320, H = 196) {
  const names = Object.keys(fig.points), raw = fig.points;
  const xs = names.map((n) => raw[n][0]), ys = names.map((n) => raw[n][1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const bw = Math.max(x1 - x0, 1e-9), bh = Math.max(y1 - y0, 1e-9);
  const s = Math.min((W - 2 * PAD) / bw, (H - 2 * PAD) / bh);
  const ox = (W - bw * s) / 2, oy = (H - bh * s) / 2;
  const pts = {};
  for (const n of names) pts[n] = [ox + (raw[n][0] - x0) * s, oy + (y1 - raw[n][1]) * s];

  // fig.segs are drawn and tappable; fig.plain are drawn only (no hit shape)
  const segs = [...(fig.segs || []).map((sg) => [sg, true]), ...(fig.plain || []).map((sg) => [sg, false])]
    .map(([sg, tap]) => ({ id: partId(sg), n: [sg[0], sg[1]], a: pts[sg[0]], b: pts[sg[1]], tap }));
  const tris = (fig.tris || []).map((t) => ({ id: partId(t), n: [...t], pts: t.map((q) => pts[q]) }));
  const angles = (fig.angles || []).map((a) => {
    const v = pts[a.v], u1 = unit(sub(pts[a.r[0]], v)), u2 = unit(sub(pts[a.r[1]], v));
    return { id: partId(a, fig), part: a, vn: a.v, v, u1, u2, bis: bisector(u1, u2), p1: add(v, mul(u1, ARC_R)), p2: add(v, mul(u2, ARC_R)), r: ARC_R, d: arcPath(v, u1, u2, ARC_R) };
  });

  // hit shapes: a wide line pulled back from busy ends, a wedge, a triangle's fill
  const degree = (n) => segs.filter((g) => g.n.includes(n)).length + angles.filter((a) => a.vn === n).length;
  const hits = [];
  for (const g of segs) {
    if (!g.tap) continue;
    const d = unit(sub(g.b, g.a)), len = dist(g.a, g.b);
    let ca = degree(g.n[0]) >= 3 ? PULL_BUSY : PULL, cb = degree(g.n[1]) >= 3 ? PULL_BUSY : PULL;
    if (ca + cb > len - 8) { const k = Math.max(0, len - 8) / (ca + cb); ca *= k; cb *= k; }
    const a = add(g.a, mul(d, ca)), b = sub(g.b, mul(d, cb));
    hits.push({ id: g.id, kind: 'seg', shape: 'line', x1: r1(a[0]), y1: r1(a[1]), x2: r1(b[0]), y2: r1(b[1]), w: HIT_W, c: mul(add(g.a, g.b), 0.5) });
  }
  for (const a of angles) hits.push({ id: a.id, kind: 'ang', shape: 'wedge', d: `${arcPath(a.v, a.u1, a.u2, WEDGE)}L${r1(a.v[0])} ${r1(a.v[1])}Z`, r: WEDGE, c: add(a.v, mul(a.bis, ARC_R)) });
  for (const t of tris) hits.push({ id: t.id, kind: 'tri', shape: 'poly', pts: t.pts, c: mul(t.pts.reduce(add, [0, 0]), 1 / 3) });

  const L = { W, H, pts, segs, tris, angles, labels: [], hits, scale: s };

  // letters: start in the preferred direction, then turn and step out until nothing is in the way
  const centre = mul(names.map((n) => pts[n]).reduce(add, [0, 0]), 1 / names.length);
  for (const n of names) {
    const w = textW(n), h = TH, pref = preferredDir(n, pts, segs, angles, centre);
    let best = null, bestErr = Infinity;
    search: for (const gap of [4, 7, 10, 14, 19, 25]) {
      for (const turn of [0, 20, -20, 40, -40, 60, -60, 80, -80, 100, -100, 120, -120, 140, -140, 160, -160, 180]) {
        const d = rot(pref, turn * Math.PI / 180), k = reach(w, h, d) + gap;
        const l = { p: n, x: pts[n][0] + d[0] * k, y: pts[n][1] + d[1] * k, w, h };
        const e = errorsOf(L, l, L.labels).length;
        if (e < bestErr) { best = l; bestErr = e; }
        if (!e) break search;
      }
    }
    L.labels.push(best);
  }
  return L;
}

/** The marks of one part: ticks at a segment's middle, arcs (or a 90° square) at an angle. */
export function markGeom(L, part, mark = {}) {
  const out = { lines: [], arcs: [], square: null };
  const k = kindOf(part);
  if (k === 'seg') {
    const a = L.pts[part[0]], b = L.pts[part[1]], d = unit(sub(b, a)), m = mul(add(a, b), 0.5), n = mark.ticks || 1;
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * TICK_GAP, c = add(m, mul(d, o));
      out.lines.push([c[0] - d[1] * TICK_HALF, c[1] + d[0] * TICK_HALF, c[0] + d[1] * TICK_HALF, c[1] - d[0] * TICK_HALF]);
    }
  } else if (k === 'ang') {
    const v = L.pts[part.v], u1 = unit(sub(L.pts[part.r[0]], v)), u2 = unit(sub(L.pts[part.r[1]], v));
    if (mark.right || mark.square) {
      const q1 = add(v, mul(u1, SQUARE)), q2 = add(v, mul(u2, SQUARE)), q = add(q1, mul(u2, SQUARE));
      out.square = `M${r1(q1[0])} ${r1(q1[1])}L${r1(q[0])} ${r1(q[1])}L${r1(q2[0])} ${r1(q2[1])}`;
    } else {
      for (let i = 0; i < (mark.arcs || 1); i++) out.arcs.push(arcPath(v, u1, u2, ARC_R + ARC_STEP * i));
    }
  }
  return out;
}

const angleBetween = (p, q) => Math.acos(Math.max(-1, Math.min(1, dot(p, q))));
function inTri(p, [a, b, c]) {
  const s1 = cross(sub(b, a), sub(p, a)), s2 = cross(sub(c, b), sub(p, b)), s3 = cross(sub(a, c), sub(p, c));
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
}
/** The parts near a tap, nearest first (2 or more → the chooser). A triangle only when no side or
    angle is near (its middle). */
export function partsNear(L, p, r = 22) {
  const c = [];
  for (const g of L.segs) { if (!g.tap) continue; const d = distPointSeg(p, g.a, g.b); if (d <= r) c.push([g.id, d]); }
  for (const a of L.angles) {
    const dv = dist(p, a.v);
    if (dv > WEDGE + r / 2) continue;
    if (dv < 1e-6) { c.push([a.id, 0]); continue; }
    const w = unit(sub(p, a.v)), full = angleBetween(a.u1, a.u2);
    if (angleBetween(a.u1, w) + angleBetween(w, a.u2) <= full + 0.05) c.push([a.id, Math.max(0, dv - WEDGE)]);
  }
  if (!c.length) for (const t of L.tris) if (inTri(p, t.pts)) c.push([t.id, 0]);
  return c.sort((x, y) => x[1] - y[1]).map((x) => x[0]);
}

/** The rigid motion (SVG matrix [a,b,c,d,e,f], screen space) that lays triangle 1 on triangle 2
    along the congruence's matching. The figure's motion kind says how the UI should move it. */
export function motionMatrix(L, problem) {
  const map = problem.facts[congOf(problem)].map;
  const S = map.map((m) => L.pts[m[0]]), D = map.map((m) => L.pts[m[1]]);
  const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const M = S.map(([x, y]) => [x, y, 1]), det = det3(M);
  const solve = (rhs) => [0, 1, 2].map((col) => det3(M.map((row, i) => row.map((v, j) => (j === col ? rhs[i] : v)))) / det);
  const [a, c, e] = solve(D.map((q) => q[0])), [b, d, f] = solve(D.map((q) => q[1]));
  return [a, b, c, d, e, f];
}

/** A rigid motion M as n + 1 frames from "where it is" to M: a turn about its centre, a slide, or a
    flip over its axis (with its glide). Each frame is an SVG matrix [a,b,c,d,e,f]. */
export function motionFrames(M, n = 24) {
  const [a, b, c, d, e, f] = M, det = a * d - b * c, out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (det > 0) {
      const th = Math.atan2(b, a);
      if (Math.abs(th) < 1e-6) { out.push([1, 0, 0, 1, e * t, f * t]); continue; }
      const k = (1 - a) * (1 - d) - b * c;                       // the centre: (I − R) c = t
      const cx = ((1 - d) * e + c * f) / k, cy = (b * e + (1 - a) * f) / k;
      const co = Math.cos(th * t), si = Math.sin(th * t);
      out.push([co, si, -si, co, cx - co * cx + si * cy, cy - si * cx - co * cy]);
    } else {
      const ph = Math.atan2(b, a) / 2, u = [Math.cos(ph), Math.sin(ph)], nn = [-u[1], u[0]];
      const g = e * u[0] + f * u[1], h = e * nn[0] + f * nn[1];  // glide along the axis; the axis is h/2 off the origin
      const p0 = [nn[0] * h / 2, nn[1] * h / 2], k = Math.cos(Math.PI * t);
      const A = u[0] * u[0] + k * nn[0] * nn[0], B = u[1] * u[0] + k * nn[1] * nn[0];
      const C = u[0] * u[1] + k * nn[0] * nn[1], D = u[1] * u[1] + k * nn[1] * nn[1];
      out.push([A, B, C, D, p0[0] - (A * p0[0] + C * p0[1]) + g * t * u[0], p0[1] - (B * p0[0] + D * p0[1]) + g * t * u[1]]);
    }
  }
  return out;
}
