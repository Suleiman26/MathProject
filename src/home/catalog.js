/* The home page's built-in topic list: exactly the original index.html
   (names, grades, order). Used until the database is connected, and as a
   fallback whenever it can't be reached. */
export const HERO = {
  title: "מתמטיקה לחטיבת הביניים",
  sub: "בחרו נושא ותתחילו לתרגל – שלב אחר שלב.",
  hub: "מצב הפרויקט: מה נעשה, מה חסר ומה בעבודה",
};

export const GRADES = [
  { id: "7", name: "כיתה ז׳" },
  { id: "8", name: "כיתה ח׳" },
  { id: "9", name: "כיתה ט׳" },
];

/* Home page groups, in curriculum order. When the database is connected,
   the groups set in the admin are used instead. */
export const CATEGORIES = [
  { id: "num", name: "תחום מספרי", color: "teal" },
  { id: "alg", name: "אלגברה", color: "indigo" },
  { id: "fn", name: "פונקציות", color: "blue" },
  { id: "geo", name: "גיאומטריה", color: "sky" },
];

export const TOPICS = [
  { cat: "alg", slug: "equation-solver", name: "משוואות", grades: "כיתה ז׳–ח׳", g: ["7", "8"], icon: "equation", color: "teal" },
  { cat: "alg", slug: "equations-advanced", name: "משוואות מתקדמות", grades: "כיתה ח׳–ט׳", g: ["8", "9"], icon: "fraction", color: "indigo" },
  { cat: "alg", slug: "inequalities", name: "אי־שוויונות", grades: "כיתה ח׳–ט׳", g: ["8", "9"], icon: "inequality", color: "pink" },
  { cat: "alg", slug: "quadratic-solver", name: "משוואות ריבועיות", grades: "כיתה ט׳", g: ["9"], icon: "square", color: "blue" },
  { cat: "fn", slug: "linear-function", name: "פונקציה לינארית", grades: "כיתה ח׳–ט׳", g: ["8", "9"], icon: "line", color: "teal" },
  { cat: "fn", slug: "parabola-practice", name: "פרבולה", grades: "כיתה ט׳", g: ["9"], icon: "parabola", color: "indigo" },
  { cat: "fn", slug: "intersection", name: "נקודות חיתוך", grades: "כיתה ט׳", g: ["9"], icon: "intersection", color: "blue" },
  { cat: "num", slug: "directed-numbers", name: "מספרים מכוונים", grades: "כיתה ז׳", g: ["7"], icon: "numberline", color: "teal" },
  { cat: "num", slug: "ratio-percent", name: "יחס ואחוזים", grades: "כיתה ז׳", g: ["7"], icon: "percent", color: "teal" },
  { cat: "num", slug: "powers-roots", name: "חזקות ושורשים", grades: "כיתה ח׳–ט׳", g: ["8", "9"], icon: "root", color: "violet" },
  { cat: "geo", slug: "angles-parallel", name: "זוויות ומקבילים", grades: "כיתה ז׳", g: ["7"], icon: "parallel", color: "teal" },
  { cat: "geo", slug: "triangles", name: "משולשים", grades: "כיתה ז׳–ח׳", g: ["7", "8"], icon: "triangle", color: "sky" },
  { cat: "geo", slug: "quadrilaterals", name: "מרובעים", grades: "כיתה ח׳", g: ["8"], icon: "quad", color: "cyan" },
  { cat: "geo", slug: "pythagoras", name: "פיתגורס", grades: "כיתה ח׳", g: ["8"], icon: "right", color: "indigo" },
  { cat: "geo", slug: "similar-triangles", name: "דמיון משולשים", grades: "כיתה ט׳", g: ["9"], icon: "similar", color: "orange" },
  { cat: "geo", slug: "circle", name: "מעגל", grades: "כיתה ט׳", g: ["9"], icon: "circle", color: "sky" },
  { cat: "geo", slug: "solids3d", name: "גופים", grades: "כיתה ז׳–ט׳", g: ["7", "8", "9"], icon: "cube", color: "teal" },
];
