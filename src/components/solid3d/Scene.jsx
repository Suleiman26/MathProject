'use client';
/* The 3D scene for one solid. Touching it only turns it (the page stays
   still). Each measure's line is drawn in its colour and its number is pinned
   to the middle of that line, so it turns with the shape and stays put. The part chosen below lights up green,
   as in the flat drawings. Renders only when something changes, and never
   while off screen. */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const HI = "#16a34a", INK = "#334155", SOFT = "#94a3b8", BLUE = "#2563eb", ORANGE = "#ea580c", VIOLET = "#7c3aed", RED = "#dc2626";
const NAMES = { cube: "קובייה", box: "תיבה", cylinder: "גליל", cone: "חרוט", pyrSq: "פירמידה עם בסיס מרובע", pyrTri: "פירמידה עם בסיס משולשי", sphere: "כדור", composite: "גליל וחרוט על אותו בסיס" };
const SIZE = 2.4; // longest measure of every shape, in scene units

function accent() {
  if (typeof window === "undefined") return "#6366f1";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--a-500").trim();
  return v || "#6366f1";
}

/* ── small building blocks ── */
function Body({ geo, color, opacity = 0.2, hi }) {
  return (
    <mesh geometry={geo} renderOrder={1}>
      <meshStandardMaterial color={hi ? HI : color} transparent opacity={hi ? 0.42 : opacity}
        roughness={0.55} metalness={0.05} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}
function Edge({ a, b, color = INK, width = 2.2, dashed, hi }) {
  return <Line points={[a, b]} color={hi ? HI : color} lineWidth={hi ? 3.4 : width}
    dashed={!!dashed && !hi} dashSize={0.09} gapSize={0.06} renderOrder={3} />;
}
function Loop({ pts, color = INK, width = 2, dashed, hi }) {
  return <Line points={pts} color={hi ? HI : color} lineWidth={hi ? 3.2 : width}
    dashed={!!dashed && !hi} dashSize={0.08} gapSize={0.06} renderOrder={3} />;
}
function Dot({ p, hi, r = 0.045 }) {
  return (
    <mesh position={p} renderOrder={4}>
      <sphereGeometry args={[hi ? r * 1.7 : r, 16, 12]} />
      <meshBasicMaterial color={hi ? HI : INK} />
    </mesh>
  );
}
const v3 = (a) => new THREE.Vector3(...a);
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
/* a tag beside an edge: pushed away from the shape's centre so it never sits on a line */
function beside(a, b, amt = 0.3, center = [0, 0, 0]) {
  const m = v3(mid(a, b)); const d = m.clone().sub(v3(center));
  if (d.lengthSq() < 1e-6) d.set(1, 0, 0);
  return m.add(d.normalize().multiplyScalar(amt)).toArray();
}
function circle(R, y, n = 72) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2; pts.push([R * Math.cos(t), y, R * Math.sin(t)]); }
  return pts;
}

/* ── shapes (orig. x → right, orig. y → depth, orig. z → up) ── */
function BoxShape({ l, w, h, cube, activePart, showBaseDiag, showSpaceDiag, showDiag, color }) {
  const s = SIZE / Math.max(l, w, h), X = l * s, Y = h * s, Z = w * s;
  const A = [-X / 2, -Y / 2, Z / 2], B = [X / 2, -Y / 2, Z / 2], C = [X / 2, -Y / 2, -Z / 2], D = [-X / 2, -Y / 2, -Z / 2];
  const E = [-X / 2, Y / 2, Z / 2], F = [X / 2, Y / 2, Z / 2], G = [X / 2, Y / 2, -Z / 2], H = [-X / 2, Y / 2, -Z / 2];
  const geo = useMemo(() => new THREE.BoxGeometry(X, Y, Z), [X, Y, Z]);
  const top = useMemo(() => new THREE.PlaneGeometry(X, Z), [X, Z]);
  const edges = [[A, B], [B, C], [C, D], [D, A], [E, F], [F, G], [G, H], [H, E], [A, E], [B, F], [C, G], [D, H]];
  const eHi = activePart === "edge";
  return (
    <group>
      <Body geo={geo} color={color} />
      {activePart === "face" && (
        <mesh geometry={top} position={[0, Y / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <meshBasicMaterial color={HI} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {edges.map(([a, b], i) => {
        // the three measured edges (one per direction, meeting at B) carry their colour
        const mc = { 0: cube ? BLUE : BLUE, 1: cube ? BLUE : ORANGE, 9: cube ? BLUE : VIOLET }[i];
        return <Edge key={i} a={a} b={b} hi={eHi} color={mc || INK} width={mc ? 3.2 : 2.2} />;
      })}
      {[A, B, C, D, E, F, G, H].map((p, i) => <Dot key={i} p={p} hi={activePart === "vertex"} />)}
      {showBaseDiag && <Edge a={E} b={G} color={BLUE} width={3} dashed />}
      {(showSpaceDiag || showDiag) && <Edge a={A} b={G} color={RED} width={3} />}
    </group>
  );
}

function CylinderShape({ r, h, activePart, color, y0 = null, part }) {
  const s = SIZE / Math.max(2 * r, h), R = r * s, H = h * s;
  const lat = useMemo(() => new THREE.CylinderGeometry(R, R, H, 72, 1, true), [R, H]);
  const disk = useMemo(() => new THREE.CircleGeometry(R, 72), [R]);
  const baseHi = activePart === "base";
  return (
    <group>
      <Body geo={lat} color={color} opacity={0.26} hi={activePart === "lateral"} />
      {[H / 2, -H / 2].map((y) => (
        <mesh key={y} geometry={disk} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <meshStandardMaterial color={baseHi ? HI : color} transparent opacity={baseHi ? 0.45 : 0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <Loop pts={circle(R, H / 2)} hi={baseHi} />
      <Loop pts={circle(R, -H / 2)} hi={baseHi} />
      <Edge a={[0, -H / 2, 0]} b={[0, H / 2, 0]} color={ORANGE} dashed hi={activePart === "height"} />
      <Edge a={[0, H / 2, 0]} b={[R, H / 2, 0]} color={BLUE} hi={activePart === "radius"} />
      <Dot p={[0, H / 2, 0]} r={0.035} />
    </group>
  );
}

function ConeShape({ r, h, activePart, color }) {
  const s = SIZE / Math.max(2 * r, h), R = r * s, H = h * s;
  const lat = useMemo(() => new THREE.ConeGeometry(R, H, 72, 1, true), [R, H]);
  const disk = useMemo(() => new THREE.CircleGeometry(R, 72), [R]);
  const apex = [0, H / 2, 0], bc = [0, -H / 2, 0], rim = [R, -H / 2, 0];
  const baseHi = activePart === "base";
  return (
    <group>
      <Body geo={lat} color={color} opacity={0.26} />
      <mesh geometry={disk} position={bc} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <meshStandardMaterial color={baseHi ? HI : color} transparent opacity={baseHi ? 0.45 : 0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Loop pts={circle(R, -H / 2)} hi={baseHi} />
      <Edge a={bc} b={apex} color={ORANGE} dashed hi={activePart === "height"} />
      <Edge a={bc} b={rim} color={BLUE} hi={activePart === "radius"} />
      <Edge a={apex} b={rim} color={activePart === "slant" ? RED : "#64748b"} width={activePart === "slant" ? 3.4 : 2.4} />
      <Dot p={apex} r={0.04} />
    </group>
  );
}

function PyramidShape({ b, h, tri, activePart, color }) {
  const s = SIZE / Math.max(b, h), Bs = b * s, H = h * s;
  const base = tri
    ? [90, 210, 330].map((d) => { const t = (d * Math.PI) / 180, R = Bs / Math.sqrt(3); return [R * Math.cos(t), -H / 2, R * Math.sin(t)]; })
    : [[-Bs / 2, -H / 2, Bs / 2], [Bs / 2, -H / 2, Bs / 2], [Bs / 2, -H / 2, -Bs / 2], [-Bs / 2, -H / 2, -Bs / 2]];
  const apex = [0, H / 2, 0], bc = [0, -H / 2, 0];
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(); const v = [];
    base.forEach((p, i) => { const q = base[(i + 1) % base.length]; v.push(...p, ...q, ...apex); });
    for (let i = 1; i < base.length - 1; i++) v.push(...base[0], ...base[i], ...base[i + 1]);
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
  }, [Bs, H, tri]); // eslint-disable-line react-hooks/exhaustive-deps
  const baseGeo = useMemo(() => {
    const g = new THREE.BufferGeometry(); const v = [];
    for (let i = 1; i < base.length - 1; i++) v.push(...base[0], ...base[i], ...base[i + 1]);
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); return g;
  }, [Bs, H, tri]); // eslint-disable-line react-hooks/exhaustive-deps
  // the base edge facing the viewer carries b and the apothem
  const front = tri ? [base[0], base[2]] : [base[0], base[1]];
  const fm = mid(front[0], front[1]);
  const baseHi = activePart === "base";
  return (
    <group>
      <Body geo={geo} color={color} opacity={0.2} />
      {baseHi && <mesh geometry={baseGeo} renderOrder={2}><meshBasicMaterial color={HI} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
      {base.map((p, i) => <Edge key={"b" + i} a={p} b={base[(i + 1) % base.length]} hi={baseHi} />)}
      <Edge a={front[0]} b={front[1]} color={BLUE} width={3.2} hi={baseHi} />
      {base.map((p, i) => <Edge key={"s" + i} a={p} b={apex} />)}
      <Edge a={bc} b={apex} color={ORANGE} dashed hi={activePart === "height"} />
      <Edge a={apex} b={fm} color={activePart === "apothem" ? RED : SOFT} width={activePart === "apothem" ? 3.2 : 1.6} dashed={activePart !== "apothem"} />
      <Dot p={apex} hi={activePart === "apex"} />
      <Dot p={bc} r={0.03} />
    </group>
  );
}

function SphereShape({ r, activePart, color }) {
  const R = SIZE / 2;
  const geo = useMemo(() => new THREE.SphereGeometry(R, 64, 40), [R]);
  return (
    <group>
      <Body geo={geo} color={color} opacity={0.24} hi={activePart === "surface"} />
      <Loop pts={circle(R, 0)} color={SOFT} width={1.6} dashed />
      <Edge a={[0, 0, 0]} b={[R, 0, 0]} color={BLUE} width={2.6} hi={activePart === "radius"} />
      <Dot p={[0, 0, 0]} hi={activePart === "center"} />
    </group>
  );
}

function CompositeShape({ r, h1, h2, activePart, color }) {
  const s = SIZE / Math.max(2 * r, h1 + h2), R = r * s, H1 = h1 * s, H2 = h2 * s;
  const y0 = -(H1 + H2) / 2, y1 = y0 + H1, y2 = y1 + H2;
  const lat = useMemo(() => new THREE.CylinderGeometry(R, R, H1, 72, 1, true), [R, H1]);
  const cone = useMemo(() => new THREE.ConeGeometry(R, H2, 72, 1, true), [R, H2]);
  const disk = useMemo(() => new THREE.CircleGeometry(R, 72), [R]);
  return (
    <group>
      <group position={[0, (y0 + y1) / 2, 0]}><Body geo={lat} color={color} opacity={0.26} hi={activePart === "cyl"} /></group>
      <group position={[0, (y1 + y2) / 2, 0]}><Body geo={cone} color={color} opacity={0.26} hi={activePart === "cone"} /></group>
      <mesh geometry={disk} position={[0, y0, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <meshStandardMaterial color={color} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Loop pts={circle(R, y0)} />
      <Loop pts={circle(R, y1)} color={SOFT} width={1.6} dashed />
      <Edge a={[0, y0, 0]} b={[0, y1, 0]} color={ORANGE} dashed />
      <Edge a={[0, y1, 0]} b={[0, y2, 0]} color={VIOLET} dashed />
      <Edge a={[0, y0, 0]} b={[R, y0, 0]} color={BLUE} />
      <Dot p={[0, y2, 0]} r={0.04} />
    </group>
  );
}

/* Each number is pinned to the middle of the line it measures (that line is
   drawn in the number's colour). A pin is a fixed point on the shape, so the
   number turns with the shape and always stays on its own line. */
function pinsFor(kind, p, activePart) {
  const P = (a, b, text, color) => ({ a, b, text: String(text), color });
  if (kind === "cube" || kind === "box") {
    const cube = kind === "cube", l = cube ? p.a : p.l, w = cube ? p.a : p.w, h = cube ? p.a : p.h;
    const s = SIZE / Math.max(l, w, h), X = l * s / 2, Y = h * s / 2, Z = w * s / 2;
    const A = [-X, -Y, Z], B = [X, -Y, Z], C = [X, -Y, -Z], F = [X, Y, Z];
    return [P(A, B, cube ? l : `l=${l}`, BLUE), P(B, C, cube ? w : `w=${w}`, cube ? BLUE : ORANGE), P(B, F, cube ? h : `h=${h}`, cube ? BLUE : VIOLET)];
  }
  if (kind === "cylinder" || kind === "cone") {
    const s = SIZE / Math.max(2 * p.r, p.h), R = p.r * s, H = p.h * s;
    const ry = kind === "cone" ? -H / 2 : H / 2;
    const out = [P([0, -H / 2, 0], [0, H / 2, 0], `h=${p.h}`, ORANGE), P([0, ry, 0], [R, ry, 0], `r=${p.r}`, BLUE)];
    if (kind === "cone") out.push(P([0, H / 2, 0], [R, -H / 2, 0], "l", activePart === "slant" ? RED : "#64748b"));
    return out;
  }
  if (kind === "pyrSq" || kind === "pyrTri") {
    const s = SIZE / Math.max(p.b, p.h), Bs = p.b * s, H = p.h * s;
    const base = kind === "pyrTri"
      ? [90, 210, 330].map((d) => { const t = (d * Math.PI) / 180, R = Bs / Math.sqrt(3); return [R * Math.cos(t), -H / 2, R * Math.sin(t)]; })
      : [[-Bs / 2, -H / 2, Bs / 2], [Bs / 2, -H / 2, Bs / 2]];
    const f = kind === "pyrTri" ? [base[0], base[2]] : [base[0], base[1]];
    const out = [P(f[0], f[1], `b=${p.b}`, BLUE), P([0, -H / 2, 0], [0, H / 2, 0], `h=${p.h}`, ORANGE)];
    if (activePart === "apothem") out.push(P([0, H / 2, 0], mid(f[0], f[1]), "m", RED));
    return out;
  }
  if (kind === "sphere") return [P([0, 0, 0], [SIZE / 2, 0, 0], `r=${p.r}`, BLUE)];
  if (kind === "composite") {
    const s = SIZE / Math.max(2 * p.r, p.h1 + p.h2), R = p.r * s, H1 = p.h1 * s, H2 = p.h2 * s;
    const y0 = -(H1 + H2) / 2, y1 = y0 + H1, y2 = y1 + H2;
    return [P([0, y0, 0], [0, y1, 0], `h1=${p.h1}`, ORANGE), P([0, y1, 0], [0, y2, 0], `h2=${p.h2}`, VIOLET), P([0, y0, 0], [R, y0, 0], `r=${p.r}`, BLUE)];
  }
  return [];
}

/* Keeps every number on its own line, every frame: at the middle of the line,
   or, if that spot is taken by another number, slid along the same line to the
   nearest free spot. A spot is kept until it stops being free (no flicker). */
const SPOTS = [0.5, 0.35, 0.65, 0.22, 0.78];
function Pins({ pins, spans }) {
  const ref = useRef(); const v = useMemo(() => new THREE.Vector3(), []);
  const st = useRef({ pins: null, k: [], pos: [] });
  useFrame(({ camera, size, invalidate }) => {
    const g = ref.current; if (!g) return;
    g.updateWorldMatrix(true, false);
    if (st.current.pins !== pins) st.current = { pins, k: [], pos: [] };
    const S = st.current;
    const scr = (q) => { v.set(q[0], q[1], q[2]).applyMatrix4(g.matrixWorld).project(camera); return [(v.x + 1) / 2 * size.width, (1 - v.y) / 2 * size.height]; };
    const placed = []; let moving = false;
    pins.forEach((t, i) => {
      const el = spans.current[i]; if (!el) return;
      const w = el.offsetWidth + 2, h = el.offsetHeight + 2;
      const A = scr(t.a), B = scr(t.b);
      const at = (u) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u];
      const free = (q) => !placed.some((o) => Math.abs(o[0] - q[0]) < (o[2] + w) / 2 && Math.abs(o[1] - q[1]) < (o[3] + h) / 2);
      let k = S.k[i] ?? 0;
      if (!free(at(SPOTS[k]))) { const nk = SPOTS.findIndex((u) => free(at(u))); if (nk >= 0) k = nk; }
      else if (k !== 0 && free(at(SPOTS[0]))) k = 0;      // back to the middle once it is free
      S.k[i] = k;
      let [x, y] = at(SPOTS[k]);
      const prev = S.pos[i];
      if (prev && Math.hypot(x - prev[0], y - prev[1]) > 0.4) { x = prev[0] + (x - prev[0]) * 0.35; y = prev[1] + (y - prev[1]) * 0.35; moving = true; }
      S.pos[i] = [x, y];
      placed.push([x, y, w, h]);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      el.style.opacity = "1";
    });
    if (moving) invalidate();
  });
  return <group ref={ref} />;
}

/* how far out the shape (plus its labels) reaches from the centre */
function reach(kind, p) {
  const sc = (m) => SIZE / m;
  if (kind === "cube") return Math.sqrt(3) * SIZE / 2;
  if (kind === "box") { const s = sc(Math.max(p.l, p.w, p.h)); return Math.hypot(p.l * s, p.w * s, p.h * s) / 2; }
  if (kind === "cylinder" || kind === "cone") { const s = sc(Math.max(2 * p.r, p.h)); return Math.hypot(p.r * s, p.h * s / 2); }
  if (kind === "pyrSq" || kind === "pyrTri") { const s = sc(Math.max(p.b, p.h)); return Math.hypot(p.b * s / Math.SQRT2, p.h * s / 2); }
  if (kind === "composite") { const s = sc(Math.max(2 * p.r, p.h1 + p.h2)); return Math.hypot(p.r * s, (p.h1 + p.h2) * s / 2); }
  return SIZE / 2;
}
/* puts the camera just far enough to show the whole shape and its labels */
function CameraFit({ r }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const half = (camera.fov * Math.PI) / 360;
    const halfH = Math.atan(Math.tan(half) * Math.min(1, size.width / size.height));
    const dist = (r + 0.42) / Math.sin(Math.min(half, halfH));
    camera.position.copy(new THREE.Vector3(5.5, 4.1, 7.2).normalize().multiplyScalar(dist));
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); invalidate();
  }, [r, size.width, size.height, camera, invalidate]);
  return null;
}

/* ── turning: the shape sways gently until touched, then follows the drag ── */
function Rig({ ctl, children }) {
  const g = useRef();
  const { invalidate } = useThree();
  useEffect(() => { ctl.current.invalidate = invalidate; }, [ctl, invalidate]);
  useFrame((state) => {
    const c = ctl.current; if (!g.current) return;
    // after a flick the shape keeps turning a little and slows down
    if (!c.dragging && (Math.abs(c.vy) > 1e-5 || Math.abs(c.vp) > 1e-5)) {
      c.yaw += c.vy * 16; c.pitch = Math.max(-0.9, Math.min(0.9, c.pitch + c.vp * 16));
      c.vy *= 0.9; c.vp *= 0.9; invalidate();
    }
    let ty = c.yaw, tp = c.pitch;
    if (!c.touched && !c.still) { ty += Math.sin(state.clock.elapsedTime * 0.55) * 0.32; }
    const r = g.current.rotation;
    r.y += (ty - r.y) * 0.18; r.x += (tp - r.x) * 0.18;
    const moving = Math.abs(ty - r.y) > 1e-4 || Math.abs(tp - r.x) > 1e-4;
    if (moving || (!c.touched && !c.still)) invalidate();
  });
  return <group ref={g}>{children}</group>;
}

export default function Scene({ kind, activePart, ...p }) {
  const wrap = useRef(null);
  const ctl = useRef({ yaw: 0, pitch: 0, vy: 0, vp: 0, dragging: false, touched: false, still: false, invalidate: null });
  const [visible, setVisible] = useState(true);
  const [touched, setTouched] = useState(false);
  const color = useMemo(accent, []);
  const drag = useRef(null);

  useEffect(() => {
    ctl.current.still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = wrap.current; if (!el || !window.IntersectionObserver) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el); return () => io.disconnect();
  }, []);

  // touching the shape only turns it (any direction); the page stays still
  function down(e) {
    const c = ctl.current;
    drag.current = { x: e.clientX, y: e.clientY, yaw: c.yaw, pitch: c.pitch, t: performance.now(), lx: e.clientX, ly: e.clientY };
    c.dragging = true; c.vy = 0; c.vp = 0;
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    const d = drag.current; if (!d) return;
    e.preventDefault();
    const c = ctl.current, now = performance.now(), dt = Math.max(8, now - d.t);
    c.yaw = d.yaw + (e.clientX - d.x) * 0.011;
    c.pitch = Math.max(-0.9, Math.min(0.9, d.pitch + (e.clientY - d.y) * 0.008));
    c.vy = ((e.clientX - d.lx) * 0.011) / dt; c.vp = ((e.clientY - d.ly) * 0.008) / dt;
    d.t = now; d.lx = e.clientX; d.ly = e.clientY;
    if (!c.touched && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) { c.touched = true; setTouched(true); }
    c.invalidate && c.invalidate();
  }
  function up() {
    const c = ctl.current, d = drag.current;
    if (d && performance.now() - d.t > 80) { c.vy = 0; c.vp = 0; } // held still before letting go: no glide
    drag.current = null; c.dragging = false; c.invalidate && c.invalidate();
  }
  function reset() { const c = ctl.current; c.yaw = 0; c.pitch = 0; c.vy = 0; c.vp = 0; c.invalidate && c.invalidate(); }

  const shapeEl = {
    cube: <BoxShape l={p.a} w={p.a} h={p.a} cube activePart={activePart} showBaseDiag={p.showBaseDiag} showSpaceDiag={p.showSpaceDiag} color={color} />,
    box: <BoxShape l={p.l} w={p.w} h={p.h} activePart={activePart} showDiag={p.showDiag} color={color} />,
    cylinder: <CylinderShape r={p.r} h={p.h} activePart={activePart} color={color} />,
    cone: <ConeShape r={p.r} h={p.h} activePart={activePart} color={color} />,
    pyrSq: <PyramidShape b={p.b} h={p.h} activePart={activePart} color={color} />,
    pyrTri: <PyramidShape b={p.b} h={p.h} tri activePart={activePart} color={color} />,
    sphere: <SphereShape r={p.r} activePart={activePart} color={color} />,
    composite: <CompositeShape r={p.r} h1={p.h1} h2={p.h2} activePart={activePart} color={color} />,
  }[kind];
  const ms = useMemo(() => pinsFor(kind, p, activePart),
    [kind, activePart, JSON.stringify(p)]); // eslint-disable-line react-hooks/exhaustive-deps
  const spans = useRef([]);
    // new labels (another part chosen) get placed on the next frame
  useEffect(() => { const c = ctl.current; c.invalidate && c.invalidate(); }, [ms]);

  return (
    <div ref={wrap} className="s3d" role="img" aria-label={(NAMES[kind] || "") + (ms.length ? " — " + ms.map((m) => m.text).join(", ") : "")}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <Canvas frameloop={visible ? "demand" : "never"} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}
        camera={{ position: [5.5, 4.1, 7.2], fov: 30, near: 0.1, far: 60 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 6, 4]} intensity={1.25} />
        <directionalLight position={[-4, 2, -3]} intensity={0.35} />
        <CameraFit r={reach(kind, p)} />
        <Rig ctl={ctl}>{shapeEl}<Pins pins={ms} spans={spans} /></Rig>
      </Canvas>
      <div className="s3d-tags" aria-hidden="true">
        {ms.map((m, i) => <span key={i} ref={(el) => (spans.current[i] = el)} className="s3d-tag" style={{ color: m.color, borderColor: m.color }}>{String(m.text)}</span>)}
      </div>
      <span className={"s3d-hint" + (touched ? " gone" : "")} aria-hidden="true">גררו לסיבוב</span>
      <button type="button" className="s3d-reset" onClick={reset} onPointerDown={(e) => e.stopPropagation()} aria-label="חזרה למבט הרגיל">↺</button>
    </div>
  );
}
