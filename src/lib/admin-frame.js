/* The content-review guard (admin → תיקונים → בקרת תוכן, design/admin-review/design.md §6).

   The review panel shows the REAL topic page in a same-origin iframe. Inside that frame nothing
   may count: no answer stats, no signed-in student's progress, no "continue" button change, no
   duel layer, no proofs mastery. And a browser that holds an admin PIN session sends no
   ANONYMOUS stats in any tab (Abed, 2026-11-21); a signed-in test student keeps their progress.

   isAdminFrame() is read from the TOP page, so it survives navigation inside the frame. A frame
   from another site can't read window.top.location (it throws) → false = normal student behaviour.
   Used by src/lib/mp-runtime.js, src/components/TopicView.jsx, src/duel/DuelLayerMount.jsx and
   src/topics/proofs/ProofChapter.jsx. Keep it tiny: it runs on every student page. */

/** true inside an iframe whose top page is one of our own /admin pages */
export function isAdminFrame() {
  try {
    return typeof window !== "undefined" && window.top !== window.self
      && window.top.location.origin === window.location.origin
      && /^\/admin(\/|$)/.test(window.top.location.pathname);
  } catch (e) { return false; }
}

/** true when this browser holds a live (not preview, not expired) admin PIN session — same key AdminShell keeps */
export function hasAdminSession() {
  try {
    const s = JSON.parse(localStorage.getItem("mp:admin"));
    return !!(s && s.tok && !s.preview && new Date(s.exp) > new Date());
  } catch (e) { return false; }
}

/** anonymous answer stats (the `events` table) are off in the admin frame and for an admin's browser */
export function anonStatsOff() { return isAdminFrame() || hasAdminSession(); }
