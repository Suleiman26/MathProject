/* The chapters of every topic, exactly as the chapter buttons read on the
   topic page (the answer tracker records the active button's text, so the
   names must match). Taken from each src/topics/<topic>/Topic.jsx on
   2026-10-31; update here when Sulaiman adds or renames a chapter.
   A topic with one flow and no chapter buttons has an empty list. */
export const CHAPTERS = {
  "angles-parallel": ["1. קודקודיות", "2. צמודות", "3. מתחלפות", "4. מתאימות", "5. חד-צדדיות", "6. הכל יחד"],
  "circle": ["1. היכרות", "2. היקף", "3. שטח", "4. קשת", "5. הכל יחד", "6. רדיאנים"],
  "directed-numbers": ["1. חיבור", "2. חיסור", "3. כפל", "4. חילוק", "5. סדר פעולות", "6. תרגול מקיף"],
  "equation-solver": [],
  "equations-advanced": ["1 — לינארית עם מכנה", "2 — ריבועית עם מכנה", "3 — כפל מקוצר", "4 — הכל יחד"],
  "inequalities": ["1. אי-שוויון פשוט", "2. ציר מספרים", "3. מערכת אי-שוויונות"],
  "intersection": ["1. ישר–ישר", "2. ישר–פרבולה"],
  "linear-function": ["0. מערכת הצירים", "1. קריאת נקודות", "2. סימון נקודות", "3. קו ישר ושיפוע", "4. חישוב שיפוע", "5. משוואת y=mx+b", "6. זיהוי שיפוע וחיתוך", "7. סידור וזיהוי", "8. ישר מ-m ונקודה", "9. ישר מ-2 נקודות"],
  "parabola-practice": ["1. השפעת מקדמים", "2. ציר סימטריה", "3. קודקוד מגרף", "4. קודקוד ממשוואה", "5. שרטוט חופשי", "6. חיתוך ציר y", "7. שורשים", "8. עלייה/ירידה", "9. חיוביות/שליליות", "10. חקירה מלאה"],
  "powers-roots": ["1. הבנת חזקות", "2. חוקי חזקות", "3. פרמטרי", "4. שורשים", "5. הכל יחד"],
  "pythagoras": ["פרק 1 — משולשים", "פרק 2 — יישום"],
  "quadratic-solver": ["שלב 1: סידור", "שלב 2: מקדמים", "שלב 3: איזה מקרה?", "שלב 4: פתרון"],
  "quadrilaterals": ["1. ריבוע", "2. מלבן", "3. מעוין", "4. מקבילית", "5. טרפז", "6. דלתון"],
  "ratio-percent": ["1. יחס", "2. פרופורציה", "3. המרות", "4. חישובי %", "5. עלייה/ירידה"],
  "similar-triangles": ["1. זיהוי דמיון", "2. יחס דמיון וצלע חסרה", "3. דמיון בתוך צורות"],
  "solids3d": ["1. קובייה", "2. תיבה", "3. גליל", "4. קונוס", "5. פירמידה", "6. כדור", "7. שאלות משולבות"],
  "triangles": ["1. זוויות", "2. סוגי משולשים", "3. משולשים מיוחדים", "4. חפיפה"],
};

/** A chapter name without its number: "3. מתחלפות" → "מתחלפות" */
export const chapterTitle = (c) => (c || "").replace(/^(פרק\s*)?[0-9]{1,2}\s*[.):—–-]\s*/, "").replace(/^שלב\s*[0-9]+:\s*/, "");

/**
 * Progress per chapter of one topic, from account_progress().chapters (or
 * account_topic().chapters). The tracker records "chapter › sub-tab", so
 * rows are grouped by the part before " › ". Chapters not in the list
 * (renamed, or an old name) come last.
 */
export function chapterStats(slug, rows) {
  const list = CHAPTERS[slug] || [];
  const by = {};
  (rows || []).forEach((r) => {
    if (r.page && r.page.replace(/\.html$/, "") !== slug) return;
    const main = (r.chapter || "").split(" › ")[0].trim();
    if (!main) return;
    const s = by[main] || (by[main] = { name: main, ok: 0, bad: 0, win: 0, last: null });
    s.ok += r.ok || 0; s.bad += r.bad || 0; s.win += r.win || 0;
    if (r.last && (!s.last || r.last > s.last)) s.last = r.last;
  });
  const known = list.map((name, i) => ({ ...(by[name] || { name, ok: 0, bad: 0, win: 0, last: null }), i, known: true }));
  const extra = Object.values(by).filter((s) => !list.includes(s.name)).map((s, k) => ({ ...s, i: list.length + k, known: false }));
  return [...known, ...extra].map((s) => {
    const n = s.ok + s.bad;
    return { ...s, n, acc: n >= 4 ? Math.round((s.ok / n) * 100) : null, state: s.win > 0 ? "solved" : n > 0 ? "tried" : "off" };
  });
}
