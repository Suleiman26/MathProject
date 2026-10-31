/* Shared progress rules for the railway (home) and the profile:
   topic levels, points (XP) and player level, badges, weeks. */

export const LEVELS = [0, 1, 5, 15, 30];                         // solved exercises in a topic → level 0..4
export const LEVEL_NAME = ["עוד לא התחלת", "התחלה", "התקדמות", "שליטה", "מומחיות"];
export const fmt = (n) => Number(n || 0).toLocaleString("he-IL");
export const slugOf = (page) => (page || "").replace(/\.html$/, "");
export const GRADE_NAME = { 7: "כיתה ז׳", 8: "כיתה ח׳", 9: "כיתה ט׳" };

export function levelOf(win) {
  let i = 0;
  LEVELS.forEach((m, k) => { if (win >= m) i = k; });
  const next = LEVELS[i + 1];
  return { i, name: LEVEL_NAME[i], next, nextName: LEVEL_NAME[i + 1], toNext: next ? next - win : 0, pct: next ? (win - LEVELS[i]) / (next - LEVELS[i]) : 1 };
}

/* Points: 10 for every exercise solved to the end, 1 for every correct step.
   Player level L → L+1 costs 100 + 50·(L−1) points (100, 150, 200, …).
   (Points will also pay for the avatar shop later: ROADMAP item 4.) */
export const XP_WIN = 10, XP_OK = 1;
export function xpOf(totals) { return (totals ? totals.win * XP_WIN + totals.ok * XP_OK : 0); }
export function playerLevel(xp) {
  let L = 1, floor = 0, cost = 100;
  while (xp >= floor + cost) { floor += cost; L++; cost = 100 + 50 * (L - 1); }
  return { L, xp, into: xp - floor, cost, pct: (xp - floor) / cost, toNext: floor + cost - xp };
}
export const RANK = ["", "מתחיל/ה", "מתאמן/ת", "חוקר/ת", "פותר/ת", "מומחה/ית", "אלוף/ה", "מאסטר", "גאון/ית"];
export const rankOf = (L) => RANK[Math.min(L, RANK.length - 1)];

/* Badges: what the database computes (account_achievements) → how it looks */
export const BADGES = {
  first:     { icon: "🌱", name: "צעד ראשון",        how: "לפתור תרגיל ראשון עד הסוף", tone: "ok" },
  streak3:   { icon: "🔥", name: "3 ימים ברצף",       how: "לתרגל 3 ימים רצוף", tone: "orange" },
  streak7:   { icon: "⚡", name: "שבוע שלם ברצף",     how: "לתרגל 7 ימים רצוף", tone: "orange" },
  streak30:  { icon: "🌟", name: "חודש ברצף",         how: "לתרגל 30 ימים רצוף", tone: "orange" },
  solved10:  { icon: "🎯", name: "10 תרגילים",        how: "לפתור 10 תרגילים", tone: "blue" },
  solved50:  { icon: "🏅", name: "50 תרגילים",        how: "לפתור 50 תרגילים", tone: "blue" },
  solved100: { icon: "💯", name: "100 תרגילים",       how: "לפתור 100 תרגילים", tone: "blue" },
  solved500: { icon: "🚀", name: "500 תרגילים",       how: "לפתור 500 תרגילים", tone: "blue" },
  master:    { icon: "👑", name: "שליטה ראשונה",      how: "לפתור 15 תרגילים באותו נושא", tone: "gold" },
  expert:    { icon: "💎", name: "מומחיות ראשונה",    how: "לפתור 30 תרגילים באותו נושא", tone: "violet" },
  perfect:   { icon: "✨", name: "פרק מושלם",         how: "10 תשובות נכונות ברצף באותו פרק, בלי טעות", tone: "pink" },
  grade:     { icon: "🗺️", name: "כל המסלול",         how: "להתחיל את כל הנושאים של הכיתה שלך", tone: "teal" },
  early:     { icon: "🌅", name: "ציפור מוקדמת",      how: "לתרגל לפני 7:00 בבוקר", tone: "sky" },
  night:     { icon: "🦉", name: "ינשוף לילה",        how: "לתרגל אחרי 22:00", tone: "indigo" },
};

/* Weeks start on Sunday (Israel). today = "YYYY-MM-DD" from the database. */
export function dayKey(dt) {
  const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, "0"), d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
export function weekStats(days, today) {
  const map = Object.fromEntries((days || []).map((d) => [d.day, d]));
  const end = new Date(today + "T12:00:00");
  const sun = new Date(end); sun.setDate(end.getDate() - end.getDay());
  const sum = (from, n) => {
    let active = 0, ok = 0, bad = 0, win = 0;
    const list = [];
    for (let k = 0; k < n; k++) {
      const dt = new Date(from); dt.setDate(from.getDate() + k);
      const r = map[dayKey(dt)];
      list.push({ dt, key: dayKey(dt), r, future: dt > end });
      if (r && r.ok + r.bad + r.win > 0) { active++; ok += r.ok; bad += r.bad; win += r.win; }
    }
    return { active, ok, bad, win, list };
  };
  const lastSun = new Date(sun); lastSun.setDate(sun.getDate() - 7);
  return { now: sum(sun, 7), prev: sum(lastSun, 7) };
}
export function lastDays(days, today, n = 7) {
  const map = Object.fromEntries((days || []).map((d) => [d.day, d]));
  const end = new Date(today + "T12:00:00");
  return Array.from({ length: n }, (_, k) => {
    const dt = new Date(end); dt.setDate(end.getDate() - (n - 1 - k));
    const r = map[dayKey(dt)] || { ok: 0, bad: 0, win: 0 };
    return { dt, key: dayKey(dt), ok: r.ok, bad: r.bad, win: r.win };
  });
}

export function ago(t) {
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 90) return "עכשיו";
  if (s < 3600) return `לפני ${Math.round(s / 60)} דק׳`;
  if (s < 86400) return `לפני ${Math.round(s / 3600)} שע׳`;
  const d = Math.round(s / 86400);
  return d === 1 ? "אתמול" : d < 7 ? `לפני ${d} ימים` : new Date(t).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

/* Confetti from a point (page coordinates). Honors reduced motion. */
export function confettiAt(x, y, n = 34) {
  if (typeof window === "undefined") return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.className = "mp-burst";
  layer.setAttribute("aria-hidden", "true");
  const colors = ["#f5b100", "#14b8a6", "#6366f1", "#ec4899", "#0ea5e9", "#f97316", "#22c55e"];
  let longest = 0;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const v = 70 + Math.random() * 120;
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 60;
    const dur = 900 + Math.random() * 700;
    longest = Math.max(longest, dur);
    p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};` + (i % 3 === 0 ? "border-radius:50%;width:7px;height:7px;" : "");
    layer.appendChild(p);
    p.animate([
      { transform: "translate(-50%,-50%) rotate(0) scale(.6)", opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) rotate(${180 + Math.random() * 360}deg) scale(1)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx * 1.2}px,${dy + 150}px) rotate(${360 + Math.random() * 360}deg) scale(.9)`, opacity: 0 },
    ], { duration: dur, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), longest + 100);
}
