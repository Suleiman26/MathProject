// Checking a duel answer. The database checks answers in SQL with the SAME
// parse rules (supabase/migrations, duel_answer / duel_parse_num, Task 3);
// keep the two in step, and Task 3's tests reuse the cases in duel.test.mjs.
//
// Number parse rules (parseNum):
//   • spaces are ignored; "−" (U+2212) and "–" (U+2013) count as "-"; "," counts as "."
//   • "12", "-3", "+3", "1.5", ".5", "2.50"
//   • a fraction "a/b" of two such numbers ("3/2", "-1/8"); b = 0 → not a number
//   • anything else → NaN (wrong answer)
// Number answer: right when |given − answer| ≤ (q.tol ?? 0), plus 1e-9 for
// floating-point noise (so "3/2" equals "1.5" exactly as people expect).
// Choice answer: right when the given index equals q.answer ("0".."3").

const NUM = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

export function parseNum(given) {
  if (typeof given === 'number') return Number.isFinite(given) ? given : NaN;
  if (typeof given !== 'string') return NaN;
  const s = given.replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/,/g, '.');
  if (NUM.test(s)) return Number(s);
  const parts = s.split('/');
  if (parts.length === 2 && NUM.test(parts[0]) && NUM.test(parts[1])) {
    const d = Number(parts[1]);
    return d === 0 ? NaN : Number(parts[0]) / d;
  }
  return NaN;
}

export function checkAnswer(q, given) {
  if (q.kind === 'choice') return String(given).trim() === q.answer;
  const g = parseNum(given), a = parseNum(q.answer);
  if (!Number.isFinite(g) || !Number.isFinite(a)) return false;
  return Math.abs(g - a) <= (q.tol ?? 0) + 1e-9;
}
