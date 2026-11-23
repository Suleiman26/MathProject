/* The stable name of a chapter button or sub-tab, as the answer tracker stores it.
   A button may carry data-mp-key="<stored name>" when its visible label differs from the name
   saved in progress, admin stats, ?ch= links and the ✓ marks (the proofs topic does this).
   Buttons without it are read by their text, exactly as before.
   Copies of these lines (files that must not import): src/admin/review/snapshot.js. */
export function keyText(el) {
  if (!el) return "";
  const k = el.dataset && el.dataset.mpKey;
  return k ? k : (el.textContent || "");
}
