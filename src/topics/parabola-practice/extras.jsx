'use client';
/* Display helpers for the quadratic-function topic (not Sulaiman's math):
   - drawGraph: the coordinate grid + parabola, sharp on retina screens (fixes board #62)
   - MonoRows / monoCheck: rising / falling ranges written as [ ] < [ ] (fixes board #39) */
import React from 'react';

// ── Graph ────────────────────────────────────────────────────────────────────
// The canvas keeps its logical size (400×400, all the topic's maths use it); only the
// backing store is larger, so lines and numbers stay sharp on phones.
export const graphDpr = () =>
  typeof window === 'undefined' ? 2 : Math.min(3, Math.max(2, window.devicePixelRatio || 1));

const INK = '#1e293b', NUM = '#526077', MINOR = '#eceff6', MAJOR = '#d3d9e8';
const fmt = (v) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(2)));

function pill(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawGraph(canvas, p) {
  const { a, b, c, width, height, range, offset, toC, toV, toCY } = p;
  const evalY = (x) => a * x * x + b * x + c;
  const ctx = canvas.getContext('2d');
  const dpr = canvas.width / width;
  // k: logical px per screen px, so text and dots keep the same size on screen when the
  // canvas is shown smaller than 400 px (phones)
  const shownW = canvas.clientWidth || width;
  const k = Math.max(1, width / shownW);
  const cs = getComputedStyle(canvas);
  const font = cs.fontFamily || 'system-ui, sans-serif';
  const accent = (cs.getPropertyValue('--a-600') || '').trim() || '#4f46e5';
  const accentInk = (cs.getPropertyValue('--a-900') || '').trim() || '#312e81';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.direction = 'ltr'; // the page is RTL: without this "-7" is drawn as "7-"
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const xAxis = toC(0), yAxis = toCY(0);
  const unit = shownW / (2 * range);          // screen px per unit
  const step = unit >= 17 ? 1 : unit >= 9 ? 2 : 5; // numbers every `step` units
  const major = step === 2 ? 10 : 5;
  const x0 = Math.ceil(offset.x - range), x1 = Math.floor(offset.x + range);
  const y0 = Math.ceil(offset.y - range), y1 = Math.floor(offset.y + range);

  // grid: light unit lines, slightly stronger every 5 (or 10)
  ctx.lineCap = 'butt';
  for (const strong of [false, true]) {
    ctx.strokeStyle = strong ? MAJOR : MINOR;
    ctx.lineWidth = 1 * k;
    ctx.beginPath();
    for (let i = x0; i <= x1; i++) {
      if ((i % major === 0) !== strong || i === 0) continue;
      const xp = toC(i); ctx.moveTo(xp, 0); ctx.lineTo(xp, height);
    }
    for (let i = y0; i <= y1; i++) {
      if ((i % major === 0) !== strong || i === 0) continue;
      const yp = toCY(i); ctx.moveTo(0, yp); ctx.lineTo(width, yp);
    }
    ctx.stroke();
  }

  // shaded ranges (rise / fall, positive / negative)
  const band = (regions, fill) => regions.forEach(([r0, r1]) => {
    const l = toC(Math.min(r0, r1)), r = toC(Math.max(r0, r1));
    ctx.fillStyle = fill; ctx.fillRect(l, 0, r - l, height);
  });
  band(p.riseRegions, 'rgba(34,197,94,0.16)');
  band(p.fallRegions, 'rgba(239,68,68,0.15)');
  band(p.posRegions, 'rgba(34,197,94,0.18)');
  band(p.negRegions, 'rgba(239,68,68,0.17)');

  // axes with arrows
  const ah = 7 * k;
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1.6 * k;
  ctx.beginPath();
  ctx.moveTo(0, yAxis); ctx.lineTo(width - ah, yAxis);
  ctx.moveTo(xAxis, height); ctx.lineTo(xAxis, ah);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width, yAxis); ctx.lineTo(width - ah * 1.3, yAxis - ah * 0.55); ctx.lineTo(width - ah * 1.3, yAxis + ah * 0.55); ctx.closePath();
  ctx.moveTo(xAxis, 0); ctx.lineTo(xAxis - ah * 0.55, ah * 1.3); ctx.lineTo(xAxis + ah * 0.55, ah * 1.3); ctx.closePath();
  ctx.fill();

  // small tick marks + numbers, beside the axes (never on them), with a white halo
  const numY = Math.max(4 * k, Math.min(height - 15 * k, yAxis + 5 * k));
  const numX = Math.max(20 * k, Math.min(width - 4 * k, xAxis - 6 * k));
  ctx.font = `500 ${11.5 * k}px ${font}`;
  ctx.lineWidth = 3 * k; ctx.strokeStyle = '#ffffff'; ctx.fillStyle = NUM;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = x0; i <= x1; i++) {
    if (i === 0 || i % step !== 0) continue;
    const xp = toC(i);
    if (xp < 9 * k || xp > width - 16 * k) continue;
    ctx.strokeText(String(i), xp, numY); ctx.fillText(String(i), xp, numY);
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = y0; i <= y1; i++) {
    if (i === 0 || i % step !== 0) continue;
    const yp = toCY(i);
    if (yp < 16 * k || yp > height - 8 * k) continue;
    ctx.strokeText(String(i), numX, yp); ctx.fillText(String(i), numX, yp);
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2 * k;
  ctx.beginPath();
  for (let i = x0; i <= x1; i++) { if (i === 0 || i % step !== 0) continue; const xp = toC(i); if (xp > width - 12 * k) continue; ctx.moveTo(xp, yAxis - 3 * k); ctx.lineTo(xp, yAxis + 3 * k); }
  for (let i = y0; i <= y1; i++) { if (i === 0 || i % step !== 0) continue; const yp = toCY(i); if (yp < 12 * k) continue; ctx.moveTo(xAxis - 3 * k, yp); ctx.lineTo(xAxis + 3 * k, yp); }
  ctx.stroke();
  // axis names
  ctx.fillStyle = accentInk; ctx.font = `italic 700 ${14 * k}px ${font}`;
  ctx.lineWidth = 3 * k; ctx.strokeStyle = '#ffffff';
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  const xnY = yAxis - 6 * k < 18 * k ? yAxis + 22 * k : yAxis - 6 * k;
  ctx.strokeText('x', width - 4 * k, xnY); ctx.fillText('x', width - 4 * k, xnY);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const ynX = xAxis + 9 * k > width - 14 * k ? xAxis - 18 * k : xAxis + 9 * k;
  ctx.strokeText('y', ynX, 2 * k); ctx.fillText('y', ynX, 2 * k);

  // axis of symmetry (dashed line; its label is placed later, beside the line)
  ctx.lineCap = 'butt';
  if (p.axisOfSymmetry !== null) {
    const xp = toC(p.axisOfSymmetry);
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2 * k; ctx.setLineDash([6 * k, 5 * k]);
    ctx.beginPath(); ctx.moveTo(xp, 0); ctx.lineTo(xp, height); ctx.stroke();
    ctx.setLineDash([]);
  }
  // hover line
  if (p.hoverX !== null) {
    const xp = toC(p.hoverX);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5 * k; ctx.setLineDash([5 * k, 4 * k]);
    ctx.beginPath(); ctx.moveTo(xp, 0); ctx.lineTo(xp, height); ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.lineCap = 'round';
  // the parabola: thick, smooth, in the topic's colour
  if (a !== 0) {
    ctx.strokeStyle = accent; ctx.lineWidth = 3 * k;
    ctx.beginPath();
    let started = false;
    for (let px = 0; px <= width; px += 0.5) {
      const py = toCY(evalY(toV(px)));
      if (py >= -20 && py <= height + 20) {
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      } else started = false;
    }
    ctx.stroke();
  }
  // the true parabola shown after a drawing task (green)
  if (p.drawPath.length > 1) {
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3 * k;
    ctx.beginPath();
    p.drawPath.forEach((pt, i) => { const px = toC(pt.x), py = toCY(pt.y); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.stroke();
  }
  // the student's own line (orange)
  if (p.userPath.length > 1) {
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3 * k;
    ctx.beginPath();
    p.userPath.forEach((pt, i) => { const px = toC(pt.wx), py = toCY(pt.wy); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.stroke();
  }

  // key points: clean dots with a white ring
  const dots = [];
  p.roots.forEach((rx) => dots.push({ x: toC(rx), y: toCY(0), color: '#e11d63' }));
  p.extraPoints.forEach((pt) => dots.push({ x: toC(pt.x), y: toCY(pt.y), color: pt.color || '#e11d63', label: pt.label }));
  if (p.highlightVertex && a !== 0) { const vx = -b / (2 * a); dots.push({ x: toC(vx), y: toCY(evalY(vx)), color: '#f97316' }); }
  const R = 5.5 * k;
  dots.forEach((d) => {
    ctx.beginPath(); ctx.arc(d.x, d.y, R + 2 * k, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.beginPath(); ctx.arc(d.x, d.y, R, 0, Math.PI * 2); ctx.fillStyle = d.color; ctx.fill();
  });

  // labels: small white tags, put where they do not sit on an axis, the curve, a dot or each other
  const taken = dots.map((d) => ({ x: d.x - R - 2 * k, y: d.y - R - 2 * k, w: 2 * R + 4 * k, h: 2 * R + 4 * k }));
  taken.push({ x: ynX - 2 * k, y: 0, w: 14 * k, h: 20 * k }, { x: width - 16 * k, y: xnY - 18 * k, w: 16 * k, h: 20 * k }); // the axis names
  const vLines = [[xAxis - 20 * k, xAxis + 2 * k]]; // the y axis and its numbers
  if (p.axisOfSymmetry !== null) { const s = toC(p.axisOfSymmetry); vLines.push([s - 2 * k, s + 2 * k]); }
  const hLines = [[yAxis - 2 * k, yAxis + 17 * k]]; // the x axis and its numbers
  const onCurve = (r) => {
    if (a === 0) return false;
    for (let px = r.x; px <= r.x + r.w; px += 2) { const py = toCY(evalY(toV(px))); if (py >= r.y - 2 * k && py <= r.y + r.h + 2 * k) return true; }
    return false;
  };
  const cost = (r) => {
    let s = 0;
    if (r.x < 2 || r.y < 2 || r.x + r.w > width - 2 || r.y + r.h > height - 2) s += 100;
    vLines.forEach(([l, rr]) => { if (rr > r.x && l < r.x + r.w) s += 10; });
    hLines.forEach(([t, bb]) => { if (bb > r.y && t < r.y + r.h) s += 10; });
    if (onCurve(r)) s += 8;
    taken.forEach((t) => { if (t.x < r.x + r.w && t.x + t.w > r.x && t.y < r.y + r.h && t.y + t.h > r.y) s += 50; });
    return s;
  };
  const tag = (text, color, spots) => {
    ctx.font = `600 ${12 * k}px ${font}`;
    const w = ctx.measureText(text).width + 12 * k, h = 20 * k;
    let best = null, bestCost = Infinity;
    spots(w, h).forEach(([x, y]) => { const r = { x, y, w, h }, s = cost(r); if (s < bestCost) { best = r; bestCost = s; } });
    taken.push(best);
    pill(ctx, best.x, best.y, w, h, 6 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fill();
    ctx.strokeStyle = color; ctx.globalAlpha = 0.45; ctx.lineWidth = 1 * k; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, best.x + w / 2, best.y + h / 2 + 0.5 * k);
  };
  const g = R + 5 * k;
  dots.forEach((d) => {
    if (!d.label) return;
    tag(String(d.label), INK, (w, h) => [
      [d.x + g, d.y - g - h], [d.x - g - w, d.y - g - h], [d.x + g, d.y + g], [d.x - g - w, d.y + g],
      [d.x - w / 2, d.y - g - h - 3 * k], [d.x - w / 2, d.y + g + 3 * k], [d.x + g + 3 * k, d.y - h / 2], [d.x - g - w - 3 * k, d.y - h / 2],
    ]);
  });
  if (p.axisOfSymmetry !== null) {
    const s = toC(p.axisOfSymmetry), m = 7 * k;
    tag('x = ' + fmt(p.axisOfSymmetry), '#15803d', (w, h) => [
      [s + m, 6 * k], [s - m - w, 6 * k], [s + m, height - h - 6 * k], [s - m - w, height - h - 6 * k],
      [s + m, 32 * k], [s - m - w, 32 * k],
    ]);
  }
}

// ── Rising / falling ranges: [ ] < [ ] ───────────────────────────────────────
// One box holds x, the other the number (the vertex's x). The sign is always "<"
// (Sulaiman, board #39 round 2: "x < 2" or "2 < x", never ">").
// What a box holds: 'x', a number (decimal or a/b), null when empty, NaN when unreadable.
export function monoSide(s) {
  const t = String(s == null ? '' : s).replace(/\s+/g, '').replace(/[−–]/g, '-').replace(',', '.');
  if (t === '') return null;
  if (/^[xX]$/.test(t)) return 'x';
  const m = t.match(/^([+-]?\d*\.?\d+)(?:\/([+-]?\d*\.?\d+))?$/);
  if (!m) return NaN;
  const v = m[2] !== undefined ? parseFloat(m[1]) / parseFloat(m[2]) : parseFloat(m[1]);
  return Number.isFinite(v) ? v : NaN;
}
const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);
// a row "[l] < [r]" → 'empty' | 'form' | { dir: 'gt' (x > n, written n < x) | 'lt' (x < n), n }
export function monoRow(v) {
  const l = monoSide(v.l), r = monoSide(v.r);
  if (l === null || r === null) return 'empty';
  if (l === 'x' && isNum(r)) return { dir: 'lt', n: r };
  if (r === 'x' && isNum(l)) return { dir: 'gt', n: l };
  return 'form';
}
// a > 0: rises for x > vx (vx < x), falls for x < vx.  a < 0: the other way round.
export function monoCheck(a, vx, rise, fall) {
  const R = monoRow(rise), F = monoRow(fall);
  const res = (code, okR, okF) => ({ code, rise: okR, fall: okF });
  if (R === 'empty' || F === 'empty') return res('empty', R !== 'empty', F !== 'empty');
  if (R === 'form' || F === 'form') return res('form', R !== 'form', F !== 'form');
  const nR = Math.abs(R.n - vx) < 0.01, nF = Math.abs(F.n - vx) < 0.01;
  if (!nR || !nF) return res('num', nR, nF);
  const dR = R.dir === (a > 0 ? 'gt' : 'lt'), dF = F.dir === (a > 0 ? 'lt' : 'gt');
  if (!dR || !dF) return res('dir', dR, dF);
  return res('ok', true, true);
}

export function MonoRows({ rise, fall, setRise, setFall, res, onEdit, onEnter }) {
  const rows = [['rise', 'עולה כאשר', rise, setRise], ['fall', 'יורדת כאשר', fall, setFall]];
  const box = (v, set, side, name) => (
    <input className="pp-rv" dir="ltr" type="text" value={v[side]} maxLength={6}
      autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
      aria-label={name + (side === 'l' ? ' — המשבצת השמאלית' : ' — המשבצת הימנית')}
      onChange={(e) => { const t = e.target.value; set((p) => ({ ...p, [side]: t })); onEdit && onEdit(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }} />
  );
  return (
    <>
      <div className="pp-mon-hint">
        כותבים <span className="pp-ltr" dir="ltr">x</span> במשבצת אחת ואת המספר במשבצת השנייה. הסימן שבאמצע קבוע: הצד הקטן נכתב משמאל לו.
      </div>
      {rows.map(([k, l, v, set]) => (
        <div className={'pp-range' + (res && res.code !== 'ok' && !res[k] ? ' bad' : '')} key={k}>
          <span className="pp-range-l">{l}</span>
          <span className="pp-range-m" dir="ltr">
            {box(v, set, 'l', l)}
            <span className="pp-gt" aria-label="קטן מ">&lt;</span>
            {box(v, set, 'r', l)}
          </span>
        </div>
      ))}
    </>
  );
}

export function MonoError({ res }) {
  if (!res || res.code === 'ok') return null;
  return (
    <div className="msg-error">
      {res.code === 'empty' && <>יש למלא את שתי המשבצות בכל שורה: באחת <span className="pp-ltr" dir="ltr">x</span> ובשנייה מספר</>}
      {res.code === 'form' && <>בכל שורה צריך להיות <span className="pp-ltr" dir="ltr">x</span> במשבצת אחת ומספר במשבצת השנייה</>}
      {res.code === 'num' && <>המספר לא נכון — הגבול בין עלייה לירידה הוא ה-x של הקודקוד</>}
      {res.code === 'dir' && <>המספר נכון, אבל הכיוון הפוך — שים לב לכיוון הפרבולה, ולכך שהצד הקטן נכתב משמאל לסימן</>}
    </div>
  );
}

// the same ranges as plain text for the summary, always with "<"
export function MonoSummary({ a, vx }) {
  const n = fmt(vx);
  const gt = <span className="pp-ltr" dir="ltr">{n} &lt; x</span>, lt = <span className="pp-ltr" dir="ltr">x &lt; {n}</span>;
  return <span>עולה: {a > 0 ? gt : lt}, יורדת: {a > 0 ? lt : gt}</span>;
}
