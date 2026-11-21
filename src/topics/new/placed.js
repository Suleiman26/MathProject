/* Where the chapters of the "חדש" module live now (fixes board #84, Sulaiman 2026-11-21: "create a
   new module 'סטטיסטיקה והסתברות' with the relevant chapters in the order you suggested, put the new
   algebra chapters at the places you suggested, then remove them from the 22-chapter module").
   chapter = the chapter button's text in that topic (= src/home/chapters.js); '' = the topic is that
   one chapter. A chapter listed here is no longer in the "חדש" module (./chapters/index.js).
   new.test.mjs checks every line against src/home/chapters.js. */
export const PLACED = [
  // new topic "סטטיסטיקה והסתברות" (src/topics/statistics), in the suggested order
  { id: 'frequency', topic: 'statistics', chapter: '1. שכיחות ושכיחות יחסית' },
  { id: 'central', topic: 'statistics', chapter: '2. ממוצע, חציון, שכיח וטווח' },
  { id: 'probability', topic: 'statistics', chapter: '3. הסתברות' },
  { id: 'probability-two-stage', topic: 'statistics', chapter: '4. הסתברות: מאורע משלים ודו-שלבי' },
  // algebra, at the suggested places
  { id: 'like-terms', topic: 'equation-solver', chapter: '2. כינוס איברים דומים' },
  { id: 'distributive', topic: 'equation-solver', chapter: '3. חוק הפילוג' },
  { id: 'word-problems', topic: 'equation-solver', chapter: '5. שאלות מילוליות' },      // the linear stories
  { id: 'word-problems', topic: 'quadratic-solver', chapter: '6. שאלות מילוליות' },     // the quadratic stories (grade 9)
  { id: 'systems', topic: 'systems', chapter: '' },                                    // suggested as a topic of its own
  { id: 'short-mult', topic: 'equations-advanced', chapter: '1 — חוק הפילוג המורחב וכפל מקוצר' },
  { id: 'factoring', topic: 'equations-advanced', chapter: '2 — פירוק לגורמים' },
  { id: 'alg-fractions', topic: 'equations-advanced', chapter: '3 — שברים אלגבריים' },
  { id: 'functions-intro', topic: 'linear-function', chapter: '3. מבוא לפונקציות' },
  { id: 'parabola-shifts', topic: 'parabola-practice', chapter: '2. הזזות של פרבולה' },
  { id: 'quad-inequality', topic: 'inequalities', chapter: '4. אי-שוויון ריבועי' },
  { id: 'two-parabolas', topic: 'intersection', chapter: '3. פרבולה–פרבולה' },
];
export const PLACED_IDS = new Set(PLACED.map((p) => p.id));
