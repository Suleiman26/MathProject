/* The route's "worlds" (2026-11-07, design/home-calm.md "v2 Worlds").
   Each area (תחום) is a world with its own fixed colour and a 3D illustration.
   The colour comes from the area itself (number / algebra / functions / geometry), not from the
   database colour: those were three shades of blue. Colours live in journey.css ([data-w="…"]).
   Illustrations: public/home/worlds/<key>.webp (made with gpt-image, see design/worlds/). */
import { useEffect, useRef, useState } from "react";

/* which world a topic belongs to, from its area (zone) */
export function zoneKey(z) {
  const n = (z && z.name) || "";
  if (z?.id === "num" || /מספר/.test(n)) return "num";
  if (z?.id === "fn" || /פונקצ/.test(n)) return "fn";
  if (z?.id === "geo" || /גיאומ/.test(n)) return "geo";
  return "alg";
}

export const worldArt = (k) => `/home/worlds/${k}.webp`;

/* true once the element has come into view (stays true). No observer / reduced motion = at once. */
export function useReveal() {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: "0px 0px 6% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on];
}

/* the illustrations drift a few px against the scroll (depth). One passive listener for all of
   them, transform-free: it writes the CSS `translate` property, so the reveal's `transform` stays its own. */
export function useArtParallax() {
  useEffect(() => {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = innerHeight;
      // read every position first, then write (reading after a write forces an extra layout pass)
      const arts = [...document.querySelectorAll(".wd-art")];
      const at = arts.map((a) => a.parentNode.getBoundingClientRect());   // the banner: it doesn't move with the drift
      arts.forEach((a, i) => {
        const r = at[i];
        if (r.bottom < -60 || r.top > vh + 60) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;   // -0.5 (top) … 0.5 (bottom)
        const v = (p * -18).toFixed(1) + "px";
        if (a.dataset.py !== v) { a.dataset.py = v; a.style.translate = "0 " + v; }
      });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    on();
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
}
