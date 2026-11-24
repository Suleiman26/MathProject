/* בקרת תוכן: the site as one tree, and where each fixes-board item sits in it (design/admin-review/design.md §5, §7, §10).
   Pure functions only (no React, no window), so the panel and a test can share them.

   Tree: כל האתר → grade → topic → chapter.
     grades + which topics are in each   = the live DB (admin_catalog), else src/home/catalog.js
     topic names / colours               = catalog (short name) → registry (title before " — ")
     chapters                            = src/home/chapters.js (the exact chapter-button texts)
     registry slugs in no grade (new, proofs) → one "מוסתרים · עוד לא שובצו" group.
   A topic in several grades is ONE node: same marks, same requests (keys use the slug, not the grade). */
import { TOPICS as REGISTRY } from "@/topics/registry";
import { CHAPTERS, chapterTitle } from "@/home/chapters";
import { GRADES as LOCAL_GRADES, TOPICS as LOCAL_TOPICS } from "@/home/catalog";

/* the proofs level keys (src/topics/proofs/types: `button`), in key order. chapters.js lists only the LIVE ones (it wins
   while proofs is there); this list keeps every key, so the review panel reaches a level even when it is hidden again */
const EXTRA_CHAPTERS = { proofs: ["1. קוראים את הנתון", "2. מחפיפה לשוויונות", "3. הוכחת חפיפה", "4. חפיפה ואז מסקנה", "5. חפיפה – כמו במבחן", "6. מדמיון לשוויונות ויחס", "7. מיחס לצלע חסרה", "8. הוכחת דמיון", "9. דמיון ואז חישוב", "10. דמיון – כמו במבחן"] };
const NAME_OVERRIDE = { new: "חדש · מתוכנית הלימודים" };

export const OPEN = new Set(["new", "working", "reopened"]);
export const isOpen = (it) => OPEN.has(it.status);
export const HIDDEN_ID = "hidden";
export const chaptersOf = (slug) => CHAPTERS[slug] || EXTRA_CHAPTERS[slug] || [];
export const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

export function topicName(slug, catalogTopics) {
  if (NAME_OVERRIDE[slug]) return NAME_OVERRIDE[slug];
  const db = (catalogTopics || []).find((t) => (t.page || "").replace(/\.html$/, "") === slug);
  if (db && db.name) return db.name;
  const loc = LOCAL_TOPICS.find((t) => t.slug === slug);
  if (loc) return loc.name;
  return ((REGISTRY[slug] && REGISTRY[slug].title) || slug).split(/\s[—–-]\s/)[0];
}

/**
 * The grades with their topics, in the site's order.
 * catalog = admin_catalog() result ({grades, categories, topics}) or null → the built-in list.
 * → [{ id, name, topics: [slug], hidden? }]
 */
export function buildGrades(catalog) {
  const out = [];
  const placed = new Set();
  const known = (slug) => !!REGISTRY[slug] && chaptersOf(slug).length > 0;
  const cats = catalog && Array.isArray(catalog.grades) && catalog.grades.length ? catalog : null;
  if (cats) {
    const catPos = Object.fromEntries((catalog.categories || []).map((c, i) => [c.id, c.position ?? i]));
    const topics = (catalog.topics || []).filter((t) => t.visible !== false)
      .map((t, i) => ({ slug: (t.page || "").replace(/\.html$/, ""), g: t.grade_ids || [], cp: catPos[t.category_id] ?? 99, p: t.position ?? i, i }))
      .filter((t) => known(t.slug))
      .sort((a, b) => a.cp - b.cp || a.p - b.p || a.i - b.i);
    [...catalog.grades].filter((g) => g.visible !== false).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).forEach((g) => {
      const list = topics.filter((t) => t.g.includes(g.id)).map((t) => t.slug);
      list.forEach((s) => placed.add(s));
      out.push({ id: String(g.id), name: g.name, topics: [...new Set(list)] });
    });
  } else {
    LOCAL_GRADES.forEach((g) => {
      const list = LOCAL_TOPICS.filter((t) => t.g.includes(g.id) && known(t.slug)).map((t) => t.slug);
      list.forEach((s) => placed.add(s));
      out.push({ id: g.id, name: g.name, topics: list });
    });
  }
  const hidden = Object.keys(REGISTRY).filter((s) => !placed.has(s) && known(s));
  if (hidden.length) out.push({ id: HIDDEN_ID, name: "מוסתרים · עוד לא שובצו", topics: hidden, hidden: true });
  return out;
}

export const gradesOf = (grades, slug) => grades.filter((g) => !g.hidden && g.topics.includes(slug));

/* ── where a board item sits ─────────────────────────────────────────── */
const GRADE_SEC = /^(.+?)\s*·\s*כל הכיתה$/;
/** a free-text section → the chapter it belongs to (exact button text, or the same name without the number) */
export function matchChapter(slug, section) {
  const list = chaptersOf(slug);
  const s = norm(section);
  if (!s) return null;
  const exact = list.find((c) => norm(c) === s);
  if (exact) return exact;
  const t = chapterTitle(s);
  const byTitle = list.find((c) => chapterTitle(c) === t);
  if (byTitle) return byTitle;
  const pre = list.find((c) => { const ct = chapterTitle(c); return ct.length > 2 && (t.startsWith(ct + " ") || t.startsWith(ct + " -") || t.startsWith(ct + " /")); });
  return pre || null;
}

/**
 * Where one fix_items row sits: { lvl: "site"|"grade"|"topic"|"chapter", slug, grade (name), chapter, subs[], question, unplaced }
 * The board stores free text in `section`; requests sent from this panel use the exact shapes of design §8.
 */
export function placeOf(it, grades) {
  const sec = norm(it.section);
  const firstLine = String(it.body || "").split("\n")[0];
  const question = /^איפה:.*השאלה שעל המסך/.test(firstLine);
  if (it.topic === "general" || !REGISTRY[it.topic]) {
    const m = GRADE_SEC.exec(sec);
    const g = m && grades.find((x) => norm(x.name) === norm(m[1]));
    if (g) return { lvl: "grade", gradeId: g.id, grade: g.name, subs: [] };
    const w = /^איפה:\s*(כיתה [א-ת]׳)\s*$/.exec(firstLine);
    const g2 = w && grades.find((x) => norm(x.name) === w[1]);
    if (g2) return { lvl: "grade", gradeId: g2.id, grade: g2.name, subs: [] };
    return { lvl: "site", subs: [], foreign: it.topic !== "general" ? it.topic : null };
  }
  const slug = it.topic;
  if (!sec) return { lvl: "topic", slug, subs: [] };
  const parts = sec.split(" › ").map(norm).filter(Boolean);
  const head = matchChapter(slug, parts[0]);
  const ch = head || matchChapter(slug, sec);
  if (!ch) return { lvl: "topic", slug, subs: [], unplaced: sec };
  return { lvl: "chapter", slug, chapter: ch, subs: head ? parts.slice(1) : [], question };
}

/* a node = { lvl: "site"|"grade"|"topic"|"chapter", gradeId, slug, chapter } */
export function inNode(p, n, grades) {
  switch (n.lvl) {
    case "site": return true;
    case "grade": {
      if (p.lvl === "grade") return p.gradeId === n.gradeId;
      const g = grades.find((x) => x.id === n.gradeId);
      return !!p.slug && !!g && g.topics.includes(p.slug);
    }
    case "topic": return p.slug === n.slug;
    case "chapter": return p.slug === n.slug && p.chapter === n.chapter;
    default: return false;
  }
}
/** open items on the levels ABOVE a node (they still apply here): site, the selected grade, the topic itself */
export function aboveNode(p, n) {
  if (n.lvl === "site") return false;
  if (p.lvl === "site") return true;
  if (n.lvl === "grade") return false;
  if (p.lvl === "grade") return p.gradeId === n.gradeId;
  if (n.lvl === "topic") return false;
  return p.lvl === "topic" && p.slug === n.slug;
}

/** the item's place relative to the selected node, for its chip: "כאן", "5. חזקה אפס › השאלה שעל המסך" */
export function whereRel(p, n, names) {
  const out = [];
  if (n.lvl === "site" || n.lvl === "grade") {
    if (p.lvl === "grade" && n.lvl === "site") out.push(p.grade);
    if (p.slug) out.push(names(p.slug));
  }
  if ((n.lvl === "site" || n.lvl === "grade" || n.lvl === "topic") && p.chapter) out.push(p.chapter);
  if (p.unplaced) out.push("לא משויך לפרק · " + p.unplaced);
  if (p.subs && p.subs.length) out.push(...p.subs);
  if (p.question) out.push("שאלה");
  if (p.foreign) out.push(p.foreign);
  return out.length ? out.join(" › ") : "כאן";
}

/* ── ✓ checked ───────────────────────────────────────────────────────── */
export const ckKey = (slug, chapter) => slug + "|" + chapter;
/**
 * The mark of one chapter. ONE meaning each (design §0.3):
 *   coral N = open requests · ↻ = a fix waits for your approval · ✓ = checked · ○ = to do
 * A ✓ older than an approval that was not given in the panel (a `done` comment newer than it) is ○ again.
 */
export function chapterMark(slug, chapter, ctx) {
  const list = ctx.byChapter.get(ckKey(slug, chapter)) || [];
  const o = list.filter((x) => isOpen(x.it)).length;
  const r = list.filter((x) => x.it.status === "review").length;
  const ck = ctx.checks.get(ckKey(slug, chapter)) || null;
  let stale = false;
  if (ck) {
    const at = new Date(ck.created_at).getTime();
    stale = list.some((x) => (x.it.comments || []).some((c) => c.status === "done" && new Date(c.created_at).getTime() > at + 1000));
  }
  const valid = !!ck && !stale;
  return { o, r, ck, stale, valid, kind: o ? "open" : r ? "chg" : valid ? "ok" : "none" };
}

/** everything the tree and inspector need, computed once per data change */
export function buildIndex(items, grades, checksList) {
  const placed = (items || []).map((it) => ({ it, p: placeOf(it, grades) }));
  const byChapter = new Map();
  placed.forEach((x) => { if (x.p.lvl === "chapter") { const k = ckKey(x.p.slug, x.p.chapter); if (!byChapter.has(k)) byChapter.set(k, []); byChapter.get(k).push(x); } });
  const checks = new Map();
  (checksList || []).forEach((c) => {
    const k = ckKey(c.topic, c.section), was = checks.get(k);
    if (!was || new Date(c.created_at) > new Date(was.created_at)) checks.set(k, c);
  });
  return { placed, byChapter, checks, grades };
}

export function countsIn(n, ctx) {
  const l = ctx.placed.filter((x) => inNode(x.p, n, ctx.grades));
  return { o: l.filter((x) => isOpen(x.it)).length, r: l.filter((x) => x.it.status === "review").length };
}
export function topicProg(slug, ctx) {
  const l = chaptersOf(slug);
  const ok = l.filter((c) => { const m = chapterMark(slug, c, ctx); return m.valid && !m.r; }).length;
  return { ok, n: l.length };
}
/** unique chapters of the real grades (a topic in two grades counts once) */
export function allProg(ctx) {
  const seen = new Set(); let ok = 0, chg = 0, n = 0;
  ctx.grades.forEach((g) => { if (g.hidden) return; g.topics.forEach((t) => {
    if (seen.has(t)) return; seen.add(t);
    chaptersOf(t).forEach((c) => { n++; const m = chapterMark(t, c, ctx); if (m.r) chg++; else if (m.valid) ok++; });
  }); });
  return { ok, chg, n };
}
export function gradeProg(g, ctx) {
  let ok = 0, n = 0;
  g.topics.forEach((t) => { const p = topicProg(t, ctx); ok += p.ok; n += p.n; });
  return { ok, n };
}

/* ── "הבא" (design §10): fixes to approve → sent back → changed since checked → never checked ── */
export const WHY = ["תוקן, מחכה לאישור שלך", "הוחזר לתיקון", "השתנה מאז שנבדק", "עוד לא נבדק"];
export function queue(ctx) {
  const all = [], seen = new Set();
  ctx.grades.forEach((g) => { if (g.hidden) return; g.topics.forEach((t) => { if (seen.has(t)) return; seen.add(t); chaptersOf(t).forEach((c) => all.push({ gradeId: g.id, slug: t, chapter: c })); }); });
  const pri = (x) => {
    const m = chapterMark(x.slug, x.chapter, ctx);
    if (m.r) return 0;
    if ((ctx.byChapter.get(ckKey(x.slug, x.chapter)) || []).some((y) => y.it.status === "reopened")) return 1;
    if (m.ck && !m.valid) return 2;
    if (!m.valid) return 3;
    return 9;
  };
  return all.map((x) => ({ ...x, p: pri(x) })).filter((x) => x.p < 9).sort((a, b) => a.p - b.p);
}
/** the next chapter after `cur` ({slug, chapter}) in the most urgent group; null when nothing is left */
export function nextInQueue(ctx, cur) {
  const q = queue(ctx);
  if (!q.length) return null;
  const at = cur ? q.find((x) => x.slug === cur.slug && x.chapter === cur.chapter) : null;
  const others = q.filter((x) => x !== at);
  if (!others.length) return { last: true };
  const minP = Math.min(...others.map((x) => x.p));
  const grp = q.filter((x) => x.p === minP);
  return at && at.p === minP ? grp[(grp.indexOf(at) + 1) % grp.length] : grp[0];
}

/* ── tree search: topic, chapter (and the item ids, "#85") ──────────── */
export const matches = (q, s) => !q || norm(s).includes(q);
