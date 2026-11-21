'use client';
/* The proofs section: the drawing. One SVG that only shows what it is told: marks (ticks / arcs in
   the pair colour, or the dashed coral "goal" style with no ticks), focus, selection, a pulse for a
   hint, the red "?" badge, tappable hit shapes (Level 3) and the ending motion (spec §7.6, §11.3).
   Geometry comes from figure-core.js; nothing here judges anything. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { layout, markGeom, partsNear, partId, partName, motionMatrix, motionFrames } from './figure-core.js';
import { partsOf } from './core.js';
import { RULES } from './mastery.js';
import { distPointSeg } from '../new/chapters/geometry/geo.js';
import { T } from './texts.js';

const r1 = (n) => Math.round(n * 10) / 10;
const pts = (list) => list.map((p) => `${r1(p[0])},${r1(p[1])}`).join(' ');

/** Does the device ask for no motion? (false on the server and on the first paint) */
export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    on();
    if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else mq.removeListener(on); };
  }, []);
  return reduce;
}

/* a triangle drawn a little inside its sides (the dashed "goal" outline of a congruence) */
function inset(P) {
  const [a, b, c] = P, la = Math.hypot(b[0] - c[0], b[1] - c[1]), lb = Math.hypot(a[0] - c[0], a[1] - c[1]), lc = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const per = la + lb + lc, I = [(la * a[0] + lb * b[0] + lc * c[0]) / per, (la * a[1] + lb * b[1] + lc * c[1]) / per];
  const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2, rad = (2 * area) / per;
  const by = Math.max(2.5, Math.min(6, rad * 0.28)), k = Math.max(0.35, 1 - by / Math.max(rad, 1));
  return P.map((p) => [I[0] + (p[0] - I[0]) * k, I[1] + (p[1] - I[1]) * k]);
}

/** Every tappable part of a figure by id: { id, kind, part, he } (the parts list uses it too). */
export function partsIndex(fig) {
  const out = [];
  for (const s of fig.segs || []) out.push({ id: partId(s), kind: 'seg', part: s, he: partName(s).he });
  for (const a of fig.angles || []) { const id = partId(a, fig); if (!out.some((x) => x.id === id)) out.push({ id, kind: 'ang', part: a, he: partName(a).he }); }
  for (const t of fig.tris || []) out.push({ id: partId(t), kind: 'tri', part: t, he: partName(t).he });
  return out;
}

export default function ProofFigure({ problem, marks = [], focus = [], selected = [], pulse = [], question = [], tappable = false, onPart, ending = null, label }) {
  const fig = problem.figure;
  const L = useMemo(() => layout(fig), [fig]);
  const index = useMemo(() => Object.fromEntries(partsIndex(fig).map((x) => [x.id, x])), [fig]);
  const svg = useRef(null), mover = useRef(null);
  const reduce = useReducedMotion();
  const end = ending === 'move' && reduce ? 'tint' : ending;

  // what each part shows: { style:'on'|'goal', mark, part, delay }
  const paint = useMemo(() => {
    const seg = {}, ang = {}, tri = {};
    for (const m of marks) {
      const f = problem.facts[m.fact];
      if (!f) continue;
      if (f.kind === 'cong') { for (const t of partsOf(f)) tri[partId(t)] = m.style; continue; }
      for (const part of m.only || partsOf(f)) (f.kind === 'seg' ? seg : ang)[partId(part, fig)] = { style: m.style, mark: f.mark || {}, part, delay: m.delay || 0 };   // m.only: a goal shown by one of its parts (type 2)
    }
    return { seg, ang, tri };
  }, [marks, problem, fig]);

  const dimAll = focus.length > 0 && !focus.some((id) => id.startsWith('t:'));
  const dim = (id) => (dimAll && !focus.includes(id) ? ' is-dim' : '');
  const sel = (id) => (selected.includes(id) ? ' is-sel' : '');
  const centre = useMemo(() => { const P = Object.values(L.pts); return [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length]; }, [L]);

  // the ending: triangle 1 travels onto triangle 2 by the real rigid motion, rests, and returns
  useEffect(() => {
    const el = mover.current;
    if (end !== 'move' || !el || !el.animate) return undefined;
    let frames;
    try { frames = motionFrames(motionMatrix(L, problem), 24).map((m) => ({ transform: `matrix(${m.map((v) => +v.toFixed(4)).join(',')})` })); } catch { return undefined; }
    const there = el.animate(frames, { duration: 600, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'both' });
    let back = null, fade = null;
    const t = setTimeout(() => {
      back = el.animate([...frames].reverse(), { duration: 450, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'both' });
      fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: 450, fill: 'both' });
    }, 1250);
    return () => { clearTimeout(t); there.cancel(); if (back) back.cancel(); if (fade) fade.cancel(); };
  }, [end, L, problem]);

  function tap(e, id) {
    if (!onPart) return;
    let near = [id];
    const el = svg.current;
    if (el && e && (e.clientX || e.clientY) && el.getScreenCTM) {
      try {
        const m = el.getScreenCTM(), p = el.createSVGPoint();
        p.x = e.clientX; p.y = e.clientY;
        const q = p.matrixTransform(m.inverse()), scale = Math.abs(m.a) || 1;
        const ok = (x) => index[x] && tappable.includes(index[x].kind);
        const pt = [q.x, q.y], tight = partsNear(L, pt, 8 / scale).filter(ok);
        // a clear tap needs no chooser: on one line away from the corners, or well inside one angle
        const segs = L.segs.filter((g) => g.tap).map((g) => [g.id, distPointSeg(pt, g.a, g.b)]).sort((x, y) => x[1] - y[1]);
        const corner = L.angles.some((a2) => Math.hypot(pt[0] - a2.v[0], pt[1] - a2.v[1]) < 20);
        const mine = index[id];
        if (tight.length === 1) near = tight;
        else if (mine && mine.kind === 'seg' && segs[0] && segs[0][0] === id && segs[0][1] <= 7 && !(segs[1] && segs[1][1] < 10) && !corner) near = [id];
        else if (mine && mine.kind === 'ang' && !(segs[0] && segs[0][1] < 7) && L.angles.filter((a2) => Math.hypot(pt[0] - a2.v[0], pt[1] - a2.v[1]) < 30).length === 1) near = [id];
        else near = partsNear(L, pt, RULES.NEAR_PX / scale).filter(ok);
        if (!near.length) near = [id];
      } catch { near = [id]; }
    }
    onPart(near.includes(id) ? id : near[0], near);
  }
  const onKey = (id) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(null, id); } };

  const halo = (id, cls, key) => {
    const x = index[id];
    if (!x) {                                     // a drawn-only line (type 1: the sentence's line) pulses too
      const g = id.startsWith('s:') && L.segs.find((q) => q.id === id);
      return g ? <line key={key} className={cls} x1={r1(g.a[0])} y1={r1(g.a[1])} x2={r1(g.b[0])} y2={r1(g.b[1])} /> : null;
    }
    if (x.kind === 'seg') { const g = L.segs.find((s) => s.id === id); return g && <line key={key} className={cls} x1={r1(g.a[0])} y1={r1(g.a[1])} x2={r1(g.b[0])} y2={r1(g.b[1])} />; }
    if (x.kind === 'ang') { const h = L.hits.find((q) => q.id === id); return h && <path key={key} className={`${cls} is-fill`} d={h.d} />; }
    const t = L.tris.find((q) => q.id === id);
    return t && <polygon key={key} className={`${cls} is-fill`} points={pts(t.pts)} />;
  };
  const badgeAt = (id) => {
    const x = index[id];
    if (!x) return null;
    if (x.kind === 'seg') {
      const g = L.segs.find((s) => s.id === id); if (!g) return null;
      const m = [(g.a[0] + g.b[0]) / 2, (g.a[1] + g.b[1]) / 2], d = [g.b[0] - g.a[0], g.b[1] - g.a[1]], l = Math.hypot(d[0], d[1]) || 1;
      let n = [-d[1] / l, d[0] / l];
      if ((m[0] - centre[0]) * n[0] + (m[1] - centre[1]) * n[1] < 0) n = [-n[0], -n[1]];
      return [m[0] + n[0] * 14, m[1] + n[1] * 14];
    }
    if (x.kind === 'ang') { const a = L.angles.find((q) => q.id === id); return a && [a.v[0] + a.bis[0] * 34, a.v[1] + a.bis[1] * 34]; }
    const t = L.tris.find((q) => q.id === id);
    return t && [(t.pts[0][0] + t.pts[1][0] + t.pts[2][0]) / 3, (t.pts[0][1] + t.pts[1][1] + t.pts[2][1]) / 3];
  };

  const cong = problem.facts[problem.cong || 'cong'];
  const tri1 = cong ? cong.map.map((m) => L.pts[m[0]]) : null;
  const showAngles = Array.isArray(tappable) && tappable.includes('ang');
  const hits = Array.isArray(tappable) ? [...L.hits].filter((h) => tappable.includes(h.kind)).sort((a, b) => (a.kind === 'tri' ? 0 : a.kind === 'seg' ? 1 : 2) - (b.kind === 'tri' ? 0 : b.kind === 'seg' ? 1 : 2)) : [];

  return (
    <svg ref={svg} className={`pf-fig${end ? ` is-end-${end}` : ''}${tappable ? ' is-tap' : ''}`} viewBox={`0 0 ${L.W} ${L.H}`} role={tappable ? 'group' : 'img'} aria-label={label || T['lbl.figure']} focusable="false">
      {L.tris.map((t) => {
        const st = paint.tri[t.id];
        return (
          <g key={t.id}>
            <polygon className={`pf-tri${st === 'on' ? ' is-on' : ''}${sel(t.id)}`} points={pts(t.pts)} />
            {st === 'goal' && <polygon className="pf-tri-goal" points={pts(inset(t.pts))} />}
          </g>
        );
      })}
      {L.segs.map((g) => {
        const p = paint.seg[g.id];
        const cls = p ? (p.style === 'goal' ? ' is-goal' : ` pf-c${p.mark.color || 1}`) : '';
        return <line key={g.id} className={`pf-sg${cls}${dim(g.id)}${sel(g.id)}`} x1={r1(g.a[0])} y1={r1(g.a[1])} x2={r1(g.b[0])} y2={r1(g.b[1])} />;
      })}
      {showAngles && L.angles.map((a) => (paint.ang[a.id] ? null : <path key={`q${a.id}`} className={`pf-arc is-quiet${sel(a.id)}`} d={a.d} />))}
      {Object.entries(paint.seg).map(([id, p]) => (p.style !== 'on' ? null : (
        <g key={`m${id}`} className={`pf-mk pf-c${p.mark.color || 1}${dim(id)}`} style={p.delay ? { animationDelay: `${p.delay}ms` } : undefined}>
          {markGeom(L, p.part, p.mark).lines.map((q, i) => <line key={i} x1={r1(q[0])} y1={r1(q[1])} x2={r1(q[2])} y2={r1(q[3])} />)}
        </g>
      )))}
      {Object.entries(paint.ang).map(([id, p]) => {
        const g = markGeom(L, p.part, p.style === 'goal' ? { arcs: 1, right: p.mark.right } : p.mark);
        return (
          <g key={`m${id}`} className={`pf-mk ${p.style === 'goal' ? 'is-goal' : `pf-c${p.mark.color || 1}`}${dim(id)}${sel(id)}`} style={p.delay ? { animationDelay: `${p.delay}ms` } : undefined}>
            {g.arcs.map((d, i) => <path key={i} d={d} />)}
            {g.square && <path d={g.square} />}
          </g>
        );
      })}
      {selected.map((id) => (index[id] && index[id].kind === 'ang' ? halo(id, 'pf-selw', `s${id}`) : null))}
      {[...new Set(pulse)].map((id) => halo(id, 'pf-pulse', `p${id}`))}
      {end && tri1 && <polygon ref={mover} className="pf-mover" points={pts(tri1)} />}
      {L.labels.map((l) => <text key={l.p} className="pf-lb" x={r1(l.x)} y={r1(l.y)} dy=".36em">{l.p}</text>)}
      {[...new Set(question)].map((id) => {
        const c = badgeAt(id);
        return c && (
          <g key={`b${id}`} className="pf-qm" transform={`translate(${r1(c[0])} ${r1(c[1])})`}>
            <circle r="8.5" /><text dy=".36em">?</text>
          </g>
        );
      })}
      {hits.map((h) => {
        const x = index[h.id];
        if (!x) return null;
        const common = { className: `pf-hit pf-hit-${h.kind}`, role: 'button', tabIndex: 0, 'aria-label': x.he, 'aria-pressed': selected.includes(h.id), onClick: (e) => tap(e, h.id), onKeyDown: onKey(h.id), 'data-part': h.id };
        if (h.shape === 'line') return <line key={h.id} {...common} x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2} strokeWidth={h.w} />;
        if (h.shape === 'wedge') return <path key={h.id} {...common} d={h.d} />;
        return <polygon key={h.id} {...common} points={pts(h.pts)} />;
      })}
    </svg>
  );
}
