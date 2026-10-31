'use client';
/* 3D view for the solids topic (cube, box, cylinder, cone, pyramids, sphere,
   cylinder+cone). The heavy 3D code (three.js) loads only when a shape is shown.
   Devices without WebGL, or ?flat=1, keep Sulaiman's flat drawings. */
import dynamic from "next/dynamic";

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => <div className="s3d s3d-loading" aria-hidden="true"><span /></div>,
});

let support = null;
export function has3D() {
  if (typeof window === "undefined") return false;
  if (support !== null) return support;
  try {
    if (/[?&]flat=1/.test(window.location.search)) return (support = false);
    const c = document.createElement("canvas");
    support = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) { support = false; }
  return support;
}

export function Solid3D(props) {
  return <Scene {...props} />;
}
