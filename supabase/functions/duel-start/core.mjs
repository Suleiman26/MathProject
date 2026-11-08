// duel-start: the pure parts (no Deno, no network), so node --test can check them.
// index.ts wires them to the request and the database.
import { poolFor } from "../_shared/duel/build.js";

/** Grade for the duel: the lower of the two players' grades (text "7" works too);
 *  missing/unknown → 9; kept inside 7..9 (the site's grades). */
export function gradeFor(a, b) {
  const g = (x) => {
    const n = x === null || x === undefined || x === "" ? NaN : Number(x);
    return Number.isFinite(n) ? Math.min(9, Math.max(7, Math.trunc(n))) : 9;
  };
  return Math.min(g(a), g(b));
}

/** The subject as asked, or 'random' when that world has no questions yet for this grade
 *  (geo/fn generators come later) — a duel never fails just because of that. */
export function subjectFor(subject, grade) {
  const s = typeof subject === "string" ? subject : "random";
  return s !== "random" && poolFor({ grade, subject: s }).length ? s : "random";
}

// Only these keys go to the database. answer/tol are kept apart by duel_put_questions
// (never shown before the player answers); meta and anything unknown never leave here.
const KEEP = ["gen", "topic", "chapter", "kind", "prompt", "choices", "display", "answer", "tol"];

/** buildDuel() output → rows for duel_put_questions (idx 0..n-1, no meta). */
export function toRows(questions) {
  return questions.map((q, idx) => {
    const row = { idx };
    for (const k of KEEP) if (q[k] !== undefined) row[k] = q[k];
    if (row.answer !== undefined) row.answer = String(row.answer);
    return row;
  });
}

const ORIGINS = new Set(["https://mathproject-gamma.vercel.app", "http://localhost:5180"]);
const PREVIEW = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

/** CORS headers: the live site, local dev (5180) and Vercel previews; nobody else. */
export function corsHeaders(origin) {
  const h = {
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "apikey, content-type, authorization, x-client-info",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
  if (typeof origin === "string" && (ORIGINS.has(origin) || PREVIEW.test(origin))) {
    h["access-control-allow-origin"] = origin;
  }
  return h;
}
