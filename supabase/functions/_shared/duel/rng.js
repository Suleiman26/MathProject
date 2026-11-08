// Seeded random numbers for duel questions: the same seed always gives the
// same duel (Edge Function, admin samples and tests all agree).
// Plain ESM, no Node/Deno/DOM APIs: runs in Deno, the browser and Node.

/** mulberry32: small fast 32-bit PRNG. Returns () => number in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whole number a..b (both included). */
export function randInt(r, a, b) {
  return a + Math.floor(r() * (b - a + 1));
}

/** One item of arr. */
export function pick(r, arr) {
  return arr[Math.floor(r() * arr.length)];
}

/** A shuffled copy (Fisher–Yates); arr itself is not changed. */
export function shuffle(r, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}
