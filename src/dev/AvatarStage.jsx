'use client';
/* One 3D avatar on a small stage: a character playing its idle motion, and
   (optionally) a pet sitting on its shoulder, also playing its idle.
   Local comparison page only for now (app/dev/avatars). */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const loader = new GLTFLoader();
const load = (url) => new Promise((ok, bad) => loader.load(url, ok, undefined, bad));
const idleClip = (clips, prefer) => {
  const last = (c) => c.name.split("|").pop();
  return (prefer && clips.find((c) => last(c) === prefer)) || clips.find((c) => last(c) === "Idle") || clips.find((c) => /idle/i.test(c.name)) || clips[0];
};
const SHOULDER = { R: ["Shoulder.R", "upperarm.r", "RightShoulder", "UpperArm.R"], L: ["Shoulder.L", "upperarm.l", "LeftShoulder", "UpperArm.L"] };

export default function AvatarStage({ char, pet, side = "R", framing = "bust", petSize = 0.3, petTurn = -0.5, tint, height = 280, label, idle, hide, petLift = 0.03, petOut = 0.04, petFwd = -0.02 }) {
  const box = useRef(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let stop = false, raf = 0;
    const W = el.clientWidth, H = height;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    // soft studio light all around, so PBR colours look like the drawing (not dark)
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c3d6, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 4, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(tint || 0x9db7ff, 1.4); rim.position.set(-3, 2, -2); scene.add(rim);
    const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 100);
    const mixers = [];
    let shoulder = null, petObj = null, petOffset = new THREE.Vector3();
    let still = null, baseY = 0;   // a model without a skeleton: breathe + sway the whole body
    const clock = new THREE.Clock();
    const v = new THREE.Vector3();

    (async () => {
      try {
        const c = await load(char);
        if (stop) return;
        const root = c.scene;
        const hideRe = hide ? new RegExp(hide, "i") : null;
        root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; if (hideRe && o.name && hideRe.test(o.name)) o.visible = false; });
        let charMixer = null;
        if (c.animations.length) {
          charMixer = new THREE.AnimationMixer(root);
          charMixer.clipAction(idleClip(c.animations, idle)).play();
          charMixer.update(0);
          mixers.push(charMixer);
        }
        // normalise: 1.7 units tall, feet on the floor, centred (measured on the posed, skinned mesh)
        const measure = (o) => { o.updateMatrixWorld(true); const bb = new THREE.Box3(); o.traverse((m) => { if (m.isMesh && m.visible) bb.expandByObject(m, true); }); return bb; };
        let b = measure(root);
        const h = b.max.y - b.min.y || 1;
        root.scale.multiplyScalar(1.7 / h);
        b = measure(root);
        root.position.y -= b.min.y;
        root.position.x -= (b.min.x + b.max.x) / 2;
        root.position.z -= (b.min.z + b.max.z) / 2;
        const pivot = new THREE.Group();
        pivot.add(root);
        scene.add(pivot);
        if (!c.animations.length) { still = pivot; baseY = pivot.position.y; }
        root.updateMatrixWorld(true);
        // the loader strips dots from bone names ("Shoulder.R" → "ShoulderR"), so compare letters only
        const key = (n) => (n || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const bones = {}; root.traverse((o) => { if (o.isBone) bones[key(o.name)] = bones[key(o.name)] || o; });
        for (const n of SHOULDER[side]) { shoulder = bones[key(n)]; if (shoulder) break; }
        // camera: bust = from the chest up, full = whole body
        const top = 1.7;
        const [focus, span] = typeof framing === "object" ? [framing.f * top, framing.s * top] : framing === "bust" ? [1.22, 1.05] : [0.88, 2.05];
        // with a pet, aim between the character and the pet so both are in the frame
        const cx = pet ? (side === "R" ? -1 : 1) * petOut * 0.5 : 0;
        const dist = (span * (pet ? 1.08 : 1)) / 2 / Math.tan((camera.fov * Math.PI) / 360);
        camera.position.set(cx + 0.28, focus + 0.08, dist);
        camera.lookAt(cx, focus, 0);

        if (pet) {
          const p = await load(pet);
          if (stop) return;
          petObj = p.scene;
          let petMixer = null;
          if (p.animations.length) { petMixer = new THREE.AnimationMixer(petObj); petMixer.clipAction(idleClip(p.animations)).play(); petMixer.update(0); }
          let pb = measure(petObj);
          const ph = Math.max(pb.max.y - pb.min.y, (pb.max.x - pb.min.x) * 0.8, 1e-3);
          petObj.scale.multiplyScalar((top * petSize) / ph);
          pb = measure(petObj);
          petOffset.set(-(pb.min.x + pb.max.x) / 2, -pb.min.y, -(pb.min.z + pb.max.z) / 2);
          petObj.rotation.y = petTurn;
          const holder = new THREE.Group();
          holder.add(petObj);
          petObj.position.copy(petOffset);
          petObj.userData.holder = holder;
          scene.add(holder);
          petObj.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
          if (petMixer) mixers.push(petMixer);
        }
        setState("ok");
        renderer.render(scene, camera);
      } catch (e) { console.error(e); setState("error"); }
    })();

    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (!raf) loop(); } else { cancelAnimationFrame(raf); raf = 0; } });
    io.observe(el);
    function loop() {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      mixers.forEach((m) => m.update(dt));
      if (still) {
        const t = clock.elapsedTime;
        still.rotation.y = Math.sin(t * 0.55) * 0.16;              // slow look left / right
        still.rotation.z = Math.sin(t * 1.1) * 0.012;               // tiny weight shift
        still.scale.set(1 + Math.sin(t * 1.9) * 0.006, 1 + Math.sin(t * 1.9) * 0.012, 1);   // breathing
        still.position.y = baseY + Math.abs(Math.sin(t * 0.95)) * 0.012;                    // soft bounce
      }
      if (petObj && shoulder) {
        shoulder.getWorldPosition(v);
        const hold = petObj.userData.holder;
        hold.position.set(v.x + (side === "R" ? -petOut : petOut), v.y + petLift, v.z + petFwd);
      }
      renderer.render(scene, camera);
    }
    return () => { stop = true; io.disconnect(); cancelAnimationFrame(raf); pmrem.dispose(); renderer.dispose(); el.innerHTML = ""; };
  }, [char, pet, side, JSON.stringify(framing), petSize, petTurn, tint, height, idle, hide, petLift, petOut, petFwd]);

  return (
    <figure className="av-stage" style={{ height }}>
      <div ref={box} className="av-canvas" />
      {state !== "ok" && <span className="av-wait">{state === "error" ? "לא נטען" : "טוען…"}</span>}
      {label && <figcaption>{label}</figcaption>}
    </figure>
  );
}
