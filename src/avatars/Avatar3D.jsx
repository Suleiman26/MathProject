'use client';
/* A student's 3D character, alive on the page.
   - Plays the "Idle" clip all the time (weight on one leg, breathing, looking around).
   - Plays a one-time clip over it (now: "Wave") when it appears, every ~9-13 s, or when
     `cmd` changes ({ name: "Wave", n: Date.now() }). Clips always cross-fade, so the body
     never shows the bare skeleton pose in between.
   - Renders only while on screen. Models are small (meshopt + WebP, ~1-1.4 MB).
   How models and clips are made: avatars/README.md. */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();   // same model on the page twice = one download
const load = (src) => { if (!cache.has(src)) cache.set(src, loader.loadAsync(src)); return cache.get(src); };

// a soft round shadow texture for under the feet
function shadowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(30,28,40,0.55)"); r.addColorStop(0.55, "rgba(30,28,40,0.22)"); r.addColorStop(1, "rgba(30,28,40,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export default function Avatar3D({ src, height = 280,  /* a number, or "fill" = the size of the parent box */ framing = { f: 0.52, s: 1.12 }, auto = true, shadow = true, label, cmd, onReady }) {
  const box = useRef(null);
  const api = useRef(null);
  const [state, setState] = useState("loading");
  useEffect(() => { if (cmd && api.current) api.current.play(cmd.name || "Wave"); }, [cmd]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let stop = false, raf = 0;
    const W = el.clientWidth, H = height === "fill" ? (el.clientHeight || 210) : height;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Khronos "PBR Neutral": keeps the drawing's colours (ACES made them pale)
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    scene.add(new THREE.HemisphereLight(0xfff8f0, 0xc9cfe0, 1.25));
    const key = new THREE.DirectionalLight(0xfff3e6, 2.1); key.position.set(1.8, 3.2, 3.2); scene.add(key);       // warm key, front-right
    const fill = new THREE.DirectionalLight(0xe6eeff, 0.6); fill.position.set(-2.5, 1.2, 2); scene.add(fill);       // cool fill
    const rim = new THREE.DirectionalLight(0xbfd0ff, 1.6); rim.position.set(-1.5, 2.6, -3); scene.add(rim);        // edge light from behind

    const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 100);
    const TALL = 1.7, focus = framing.f * TALL, span = framing.s * TALL;
    camera.position.set(0.22, focus + 0.06, span / 2 / Math.tan((camera.fov * Math.PI) / 360));
    camera.lookAt(0, focus, 0);

    const timer = new THREE.Timer();
    let mixer = null, idle = null, acts = {}, cur = null, next = 1.0, frozen = false, blob = null, hips = null, root = null;
    const play = (name) => {
      const a = acts[name];
      if (!a || cur) return;
      cur = a;
      a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
      a.play(); idle.crossFadeTo(a, 0.25, false);
    };
    api.current = { play };

    (async () => {
      try {
        const gltf = await load(src);
        if (stop) return;
        // each viewer gets its own copy of the skinned model
        const { clone } = await import("three/examples/jsm/utils/SkeletonUtils.js");
        root = clone(gltf.scene);
        root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; } if (o.isBone && o.name === "Hips") hips = o; });
        mixer = new THREE.AnimationMixer(root);
        for (const c of gltf.animations) acts[c.name] = mixer.clipAction(c);
        idle = acts.Idle || Object.values(acts)[0];
        idle.play();
        mixer.update(0);
        const measure = () => { root.updateMatrixWorld(true); const bb = new THREE.Box3(); root.traverse((m) => { if (m.isMesh) bb.expandByObject(m, true); }); return bb; };
        let b = measure();
        root.scale.multiplyScalar(TALL / (b.max.y - b.min.y || 1));
        b = measure();
        root.position.y -= b.min.y; root.position.x -= (b.min.x + b.max.x) / 2; root.position.z -= (b.min.z + b.max.z) / 2;
        scene.add(root);
        if (shadow) {
          blob = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.42), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false }));
          blob.rotation.x = -Math.PI / 2; blob.position.y = 0.002; scene.add(blob);
        }
        setState("ok");
        renderer.render(scene, camera);
        onReady && onReady();
        if (process.env.NODE_ENV !== "production") {
          // testing: window.__anim.at("Wave", 1.2) freezes that moment; .run() goes back to normal
          window.__anim = {
            play, clips: Object.keys(acts), dur: (n) => acts[n]?.getClip().duration,
            at: (n, t) => { frozen = true; mixer.stopAllAction(); const a = acts[n]; a.reset().play(); a.setEffectiveWeight(1); a.time = t; mixer.update(0); renderer.render(scene, camera); },
            run: () => { frozen = false; cur = null; mixer.stopAllAction(); idle.reset().play(); },
          };
        }
      } catch (e) { console.error(e); setState("error"); }
    })();

    const hp = new THREE.Vector3();
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      timer.update(ts);
      if (!mixer || frozen) return;
      const t = timer.getElapsed();
      if (auto && !cur && t > next) { play("Wave"); next = t + 9 + Math.random() * 4; }
      // hand back to standing a little before the one-time clip ends
      if (cur && cur.time > cur.getClip().duration - 0.35) { const a = cur; cur = null; idle.reset().play(); a.crossFadeTo(idle, 0.3, false); }
      mixer.update(Math.min(timer.getDelta(), 0.05));
      if (blob && hips) { hips.getWorldPosition(hp); blob.position.x = hp.x * 0.6; }   // shadow follows the weight shift
      renderer.render(scene, camera);
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (!raf) loop(); } else { cancelAnimationFrame(raf); raf = 0; } });
    io.observe(el);
    return () => { stop = true; io.disconnect(); cancelAnimationFrame(raf); pmrem.dispose(); renderer.dispose(); el.innerHTML = ""; api.current = null; };
  }, [src, height, framing.f, framing.s, auto, shadow]);

  return (
    <figure className="av-stage" style={{ height: height === "fill" ? "100%" : height }}>
      <div ref={box} className="av-canvas" />
      {state !== "ok" && <span className="av-wait">{state === "error" ? "לא נטען" : "טוען…"}</span>}
      {label && <figcaption>{label}</figcaption>}
    </figure>
  );
}
