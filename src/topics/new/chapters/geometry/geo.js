/* Geometry maths of the geo pack (board #84). Plain JS, no React: the chapters use it to build and
   verify questions, figs-geo.jsx uses it to lay out the drawings, and a node script checks
   the layouts (no label on a line, everything inside the viewBox).

   Drawing layouts: figTri / figSim / figPrism return
     { W, H, fills:[{pts}], segs:[{a,b,kind}], arcs:[{c,r,p1,p2,sweep,kind}], labels:[{x,y,w,h,text,kind}] }
   in screen pixels of a `0 0 W H` viewBox. Label x,y = the CENTRE of the text. */

/* ── plain geometry ───────────────────────────────────────────────────────── */
export const RAD = Math.PI / 180;
export const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
export const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
export const mul = (p, k) => [p[0] * k, p[1] * k];
export const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
export const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
export const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
export const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
export const centroid = (pts) => mul(pts.reduce(add, [0, 0]), 1 / pts.length);
/** area of a polygon (shoelace) */
export function area(pts) { let s = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; }); return Math.abs(s) / 2; }
export function perimeter(pts) { return pts.reduce((s, p, i) => s + dist(p, pts[(i + 1) % pts.length]), 0); }
/** the angle ∠(a, v, b) at v, in degrees */
export function angle(a, v, b) { const p = sub(a, v), q = sub(b, v); return Math.atan2(Math.abs(p[0] * q[1] - p[1] * q[0]), dot(p, q)) / RAD; }
/** the three angles of a triangle, in degrees */
export const anglesOf = (pts) => [0, 1, 2].map((i) => angle(pts[(i + 1) % 3], pts[i], pts[(i + 2) % 3]));
/** triangle from its angles at vertices 0,1,2 (degrees); |P0P1| = base. y points up. */
export function triFromAngles(angs, base = 1) {
  const [A, B, C] = angs.map((d) => d * RAD);
  const b = base * Math.sin(B) / Math.sin(C);
  return [[0, 0], [base, 0], [b * Math.cos(A), b * Math.sin(A)]];
}
/** triangle from its sides [a, b, c]: side i lies opposite vertex i. y points up. */
export function triFromSides([a, b, c]) {
  const cosA = (b * b + c * c - a * a) / (2 * b * c);
  return [[0, 0], [c, 0], [b * cosA, b * Math.sqrt(Math.max(0, 1 - cosA * cosA))]];
}
export function distPointSeg(p, a, b) {
  const ab = sub(b, a), l2 = dot(ab, ab);
  const t = l2 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
  return dist(p, add(a, mul(ab, t)));
}
export const deg = (v) => `${v}°`;

/* ── text boxes ───────────────────────────────────────────────────────────── */
export const FS = 13, TH = 15;
export const textW = (s) => Math.max(9, [...String(s)].reduce((w, ch) => w + (ch === ' ' ? 3.5 : ch === '°' ? 5.5 : 7.8), 0)) + 2;
/* how far a w×h box reaches from its centre in direction d (so a box pushed by this much just touches) */
const reach = (w, h, d) => Math.abs(d[0]) * w / 2 + Math.abs(d[1]) * h / 2;

/* ── one triangle ─────────────────────────────────────────────────────────────
   spec: { angles:[α,β,γ] | sides:[a,b,c],   vertex 0 bottom-left, 1 bottom-right, 2 on top
           names:['A','B','C'],
           sideLabels:[s0,s1,s2]     side i lies opposite vertex i
           angleLabels:[a0,a1,a2],
           right: i                  a right-angle mark at vertex i
           ticks: [i, j]             equal-length marks on sides i and j
           ext: { at:1, from:0, name:'D', label:'120°' }   side from→at continued beyond `at` (a base vertex)
           median: { from:2, name:'M', label:'5' } }       to the middle of the opposite side
   Returned in local pixels, with bbox = [x0, y0, x1, y1]. */
const EXT = 56, ARC = 15, ARC_EXT = 20;
export function triLayout(spec, maxW = 232, maxH = 160) {
  const names = spec.names || ['A', 'B', 'C'];
  const raw = spec.sides ? triFromSides(spec.sides) : triFromAngles(spec.angles);
  const xs = raw.map((p) => p[0]), ys = raw.map((p) => p[1]);
  const minx = Math.min(...xs), maxy = Math.max(...ys);
  const ext = spec.ext, med = spec.median;
  const s = Math.min((maxW - (ext ? EXT : 0)) / (Math.max(...xs) - minx), maxH / (maxy - Math.min(...ys)));
  const P = raw.map(([x, y]) => [(x - minx) * s, (maxy - y) * s]);
  const segs = [], labels = [], arcs = [], fills = [{ pts: P }];
  const ends = (i) => [P[(i + 1) % 3], P[(i + 2) % 3]];
  const normalOut = (i) => { const [a, b] = ends(i); const t = unit(sub(b, a)); const n = [-t[1], t[0]]; return dot(n, sub(P[i], a)) > 0 ? mul(n, -1) : n; };
  const put = (text, at, dir, gap, kind) => { const w = textW(text), d = reach(w, TH, dir) + gap; labels.push({ text: String(text), x: at[0] + dir[0] * d, y: at[1] + dir[1] * d, w, h: TH, kind }); };
  for (let i = 0; i < 3; i++) { const [a, b] = ends(i); segs.push({ a, b, kind: 'side' }); }

  let M = null, D = null, e = null;
  if (med) { const [a, b] = ends(med.from); M = lerp(a, b, 0.5); segs.push({ a: P[med.from], b: M, kind: 'median' }); }
  if (ext) { e = unit(sub(P[ext.at], P[ext.from])); D = add(P[ext.at], mul(e, EXT)); segs.push({ a: P[ext.at], b: D, kind: 'ext' }); }

  /* an angle value between the rays u1, u2 from V: on the bisector, clear of both rays and of the arc */
  const angleLabel = (V, u1, u2, text, r, kind, limit) => {
    const half = Math.acos(Math.max(-1, Math.min(1, dot(u1, u2)))) / 2, bis = unit(add(u1, u2));
    const w = textW(text);
    const d = Math.max((reach(w, TH, [-u1[1], u1[0]]) + 4) / Math.sin(half), (reach(w, TH, [-u2[1], u2[0]]) + 4) / Math.sin(half), r + 4 + reach(w, TH, bis));
    if (half * 2 < 27 * RAD || d > limit) return false;
    const p1 = add(V, mul(u1, r)), p2 = add(V, mul(u2, r));
    arcs.push({ c: V, r, p1, p2, sweep: u1[0] * u2[1] - u1[1] * u2[0] > 0 ? 1 : 0, kind });
    labels.push({ text: String(text), x: V[0] + bis[0] * d, y: V[1] + bis[1] * d, w, h: TH, kind });
    return true;
  };

  for (let i = 0; i < 3; i++) {
    const V = P[i], u1 = unit(sub(P[(i + 1) % 3], V)), u2 = unit(sub(P[(i + 2) % 3], V));
    let letter = names[i];
    const a = spec.angleLabels && spec.angleLabels[i];
    if (spec.right === i) { const m = 11; const q1 = add(V, mul(u1, m)), q2 = add(V, mul(u2, m)), q = add(q1, mul(u2, m)); segs.push({ a: q1, b: q, kind: 'mark' }, { a: q, b: q2, kind: 'mark' }); }
    else if (a != null && !(med && med.from === i)) {
      const limit = 0.6 * Math.min(dist(V, P[(i + 1) % 3]), dist(V, P[(i + 2) % 3]));
      if (!angleLabel(V, u1, u2, a, ARC, 'angle', limit)) letter = `${names[i]} = ${a}`;   // a very sharp angle: the value goes next to the letter
    }
    // the letter: outside, on the outer bisector; at a continued side, straight away from the triangle
    const dir = ext && ext.at === i ? normalOut(3 - ext.at - ext.from) : unit(mul(add(u1, u2), -1));
    put(letter, V, dir, 4, 'vertex');
  }
  for (let i = 0; i < 3; i++) {
    const [a, b] = ends(i), n = normalOut(i), t = unit(sub(b, a)), halfMed = med && med.from === i;
    const tick = (at) => segs.push({ a: add(at, mul(n, 4.5)), b: add(at, mul(n, -4.5)), kind: 'tick' });
    if (spec.ticks && spec.ticks.includes(i)) tick(lerp(a, b, 0.5));
    if (halfMed) { [0.25, 0.75].forEach((k) => { const at = lerp(a, b, k); tick(add(at, mul(t, 2))); tick(add(at, mul(t, -2))); }); }
    const text = spec.sideLabels && spec.sideLabels[i];
    // (a side cut by a median gets no length: under one half it would read as the length of that half)
    if (text != null && !halfMed) put(text, lerp(a, b, spec.ticks && spec.ticks.includes(i) ? 0.36 : 0.5), n, 7, 'side');
  }
  if (med) {
    put(med.name || 'M', M, normalOut(med.from), 4, 'vertex');
    if (med.label != null) {
      const mid = lerp(P[med.from], M, 0.5), t = unit(sub(M, P[med.from])), w = textW(med.label);
      const cands = [[-t[1], t[0]], [t[1], -t[0]]].map((n) => { const d = reach(w, TH, n) + 6; return add(mid, mul(n, d)); });
      const clear = (c) => Math.min(...segs.filter((sg) => sg.kind === 'side').map((sg) => distPointSeg(c, sg.a, sg.b)));
      const c = clear(cands[0]) >= clear(cands[1]) ? cands[0] : cands[1];
      labels.push({ text: String(med.label), x: c[0], y: c[1], w, h: TH, kind: 'median' });
    }
  }
  if (ext) {
    put(ext.name || 'D', D, e, 4, 'vertex');
    if (ext.label != null) { const V = P[ext.at], third = P[3 - ext.at - ext.from]; angleLabel(V, e, unit(sub(third, V)), ext.label, ARC_EXT, 'ext', 1e9); }
  }
  return { fills, segs, arcs, labels, P, bbox: bboxOf(P.concat(D ? [D] : []), labels) };
}
function bboxOf(pts, labels) {
  const xs = pts.map((p) => p[0]).concat(labels.flatMap((l) => [l.x - l.w / 2, l.x + l.w / 2]));
  const ys = pts.map((p) => p[1]).concat(labels.flatMap((l) => [l.y - l.h / 2, l.y + l.h / 2]));
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
function shift(L, dx, dy) {
  const mv = (p) => [p[0] + dx, p[1] + dy];
  return {
    fills: L.fills.map((f) => ({ ...f, pts: f.pts.map(mv) })),
    segs: L.segs.map((g) => ({ ...g, a: mv(g.a), b: mv(g.b) })),
    arcs: L.arcs.map((a) => ({ ...a, c: mv(a.c), p1: mv(a.p1), p2: mv(a.p2) })),
    labels: L.labels.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy })),
  };
}
const W = 340, PAD = 8;
function frame(L) {
  const [x0, y0, x1, y1] = L.bbox;
  return { W, H: Math.ceil(y1 - y0 + PAD * 2), ...shift(L, (W - (x1 - x0)) / 2 - x0, PAD - y0) };
}

/** { type:'tri', …spec } */
export const figTri = (fig) => frame(triLayout(fig));

/** { type:'simtri', angles|sides, k, small:{names, sideLabels}, big:{names, sideLabels} }
    two similar triangles side by side, the small one on the left. k = big : small. */
export function figSim(fig) {
  const shape = fig.sides ? { sides: fig.sides } : { angles: fig.angles };
  const kd = Math.max(1.4, Math.min(2.2, fig.k || 2));          // drawn ratio: true up to 2.2, so the small one stays readable
  let bw = 150, out = null;
  for (let n = 0; n < 8; n++) {
    const B = triLayout({ ...shape, ...fig.big }, bw, 130), S = triLayout({ ...shape, ...fig.small }, bw / kd, 130 / kd);
    const gap = 18, sw = S.bbox[2] - S.bbox[0], total = sw + gap + B.bbox[2] - B.bbox[0];
    const s2 = shift(S, -S.bbox[0], -S.P[0][1]), b2 = shift(B, sw + gap - B.bbox[0], -B.P[0][1]);   // bases on one line
    const all = { fills: [...s2.fills, ...b2.fills], segs: [...s2.segs, ...b2.segs], arcs: [...s2.arcs, ...b2.arcs], labels: [...s2.labels, ...b2.labels] };
    all.bbox = bboxOf(all.fills.flatMap((f) => f.pts), all.labels);
    out = frame(all);
    if (total <= W - 8) break;
    bw *= (W - 10) / total * 0.97;
  }
  return out;
}

/** { type:'prism', a, b, h, labels:{a,b,c,h} }  a right prism standing on a right-triangle base
    (legs a, b; right angle at the front corner where the two seen side faces meet). Drawn like a box
    seen from the upper left: the front face (a × h), the left face (b × h) and the top triangle are seen;
    only the bottom edge of the back face (the hypotenuse) is hidden. */
export function figPrism(fig) {
  const { a, b, h } = fig, lab = fig.labels || {};
  const k = 0.55, ph = 40 * RAD, bx = b * k * Math.cos(ph), by = b * k * Math.sin(ph);       // the depth direction, foreshortened
  const s = Math.min(196 / (a + bx), 172 / (h + by));
  const X = (x, y, z) => [(bx + x - y * k * Math.cos(ph)) * s, (h + by - z - y * k * Math.sin(ph)) * s];
  const B0 = X(0, 0, 0), B1 = X(a, 0, 0), B2 = X(0, b, 0), T0 = X(0, 0, h), T1 = X(a, 0, h), T2 = X(0, b, h);
  const fills = [{ pts: [B0, B1, T1, T0] }, { pts: [B2, B0, T0, T2], dark: true }, { pts: [T0, T1, T2], top: true }];
  const segs = [
    { a: B0, b: B1, kind: 'side' }, { a: B0, b: T0, kind: 'side' }, { a: B1, b: T1, kind: 'side' },
    { a: T0, b: T1, kind: 'side' }, { a: T0, b: T2, kind: 'side' }, { a: T1, b: T2, kind: 'side' },
    { a: B0, b: B2, kind: 'side' }, { a: B2, b: T2, kind: 'side' }, { a: B1, b: B2, kind: 'hidden' },
  ];
  // right-angle mark in the top face (drawn in perspective)
  const m = 11, u = [1, 0], v = unit(sub(T2, T0)), q1 = add(T0, mul(u, m)), q2 = add(T0, mul(v, m * 0.62)), q = add(q1, mul(v, m * 0.62));
  segs.push({ a: q1, b: q, kind: 'mark' }, { a: q, b: q2, kind: 'mark' });
  const labels = [];
  const put = (text, at, dir, gap) => { if (text == null) return; const w = textW(text), d = reach(w, TH, dir) + gap; labels.push({ text: String(text), x: at[0] + dir[0] * d, y: at[1] + dir[1] * d, w, h: TH, kind: 'side' }); };
  const out = (p, r, away) => { const t = unit(sub(r, p)); const n = [-t[1], t[0]]; return dot(n, sub(away, p)) > 0 ? mul(n, -1) : n; };
  put(lab.a, lerp(B0, B1, 0.5), [0, 1], 6);
  put(lab.h, lerp(B1, T1, 0.5), [1, 0], 7);
  put(lab.b, lerp(B0, B2, 0.5), out(B0, B2, T0), 7);
  put(lab.c, lerp(T1, T2, 0.5), out(T1, T2, T0), 7);
  return frame({ fills, segs, arcs: [], labels, bbox: bboxOf([B0, B1, B2, T0, T1, T2], labels) });
}

export const LAYOUT = { tri: figTri, simtri: figSim, prism: figPrism };

/* ── labels on the core coordinate grid ───────────────────────────────────────
   items: [{ pts:[[x,y],…], names:['A',…], color }]  → { points:[{x,y,label,color,dx,dy}], ok }
   Every label is pushed away from the middle of its own shape. ok = no label centre near an
   edge of any shape, near an axis (or its numbers), near another label, or outside the grid. */
export function gridPoints(items, R = 6) {
  const u = 320 / (2 * R);
  const px = (p) => [p[0] * u, -p[1] * u];
  const segs = [{ a: px([-R, 0]), b: px([R, 0]) }, { a: px([0, -R]), b: px([0, R]) }];
  items.forEach((it) => { if (it.pts.length > 1) it.pts.forEach((p, i) => { if (it.pts.length > 2 || i === 0) segs.push({ a: px(p), b: px(it.pts[(i + 1) % it.pts.length]) }); }); });
  const points = [], boxes = [];
  items.forEach((it) => {
    const mid = it.pts.length > 1 ? centroid(it.pts) : [0, 0];
    it.pts.forEach((p, i) => {
      const d = unit([p[0] - mid[0], -(p[1] - mid[1])]);
      const dx = d[0] >= 0 ? 4 + 5 * d[0] : -(4 - 5 * d[0]), dy = 4 + 11 * d[1];
      const name = it.names[i], w = [...name].reduce((s, ch) => s + (ch === "'" ? 3.5 : 8.5), 0);
      const P = px(p), cx = P[0] + (dx >= 0 ? dx + w / 2 : dx - w / 2), cy = P[1] + dy - 4.5;
      points.push({ x: p[0], y: p[1], label: name, color: it.color, dx: Math.round(dx * 10) / 10, dy: Math.round(dy * 10) / 10 });
      boxes.push({ cx, cy, w, h: 11 });
    });
  });
  const lim = R * u + 12;
  const ok = boxes.every((b, i) => {
    if (Math.abs(b.cx) + b.w / 2 > lim || Math.abs(b.cy) + b.h / 2 > lim) return false;
    if (segs.some((g) => distPointSeg([b.cx, b.cy], g.a, g.b) < 10)) return false;
    if (b.cy > 0 && b.cy < 20) return false;                       // the numbers under the x-axis
    if (b.cx < 0 && b.cx > -18 - b.w / 2) return false;            // the numbers left of the y-axis
    return boxes.every((o, j) => j === i || Math.abs(o.cx - b.cx) > (o.w + b.w) / 2 + 3 || Math.abs(o.cy - b.cy) > 13);
  });
  return { points, ok };
}
