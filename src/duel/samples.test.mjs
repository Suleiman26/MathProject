/* node --test src/duel/samples.test.mjs
   The subject tiles of the challenge sheet follow the question engine:
   a world with no generator for the LOWER grade of the two students is hidden. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { subjectsFor, randomEmpty, duelGrade, SUBJECTS, SUBJECT_LABEL, poolFor, GENERATORS } from "./samples.js";

test("re-exports the engine", () => {
  assert.equal(typeof poolFor, "function");
  assert.ok(Array.isArray(GENERATORS) && GENERATORS.length > 0);
});

test("the duel grade is the lower of the two; a missing grade counts as 9", () => {
  assert.equal(duelGrade(7, 9), 7);
  assert.equal(duelGrade(9, 8), 8);
  assert.equal(duelGrade(null, 8), 8);
  assert.equal(duelGrade(undefined, undefined), 9);
  assert.equal(duelGrade("7", "8"), 7);
  assert.equal(duelGrade(3, 12), 9);   // nonsense → 9
});

test("a world tile is hidden exactly when poolFor is empty for that grade", () => {
  for (const [a, b] of [[7, 7], [7, 9], [8, 8], [9, null]]) {
    const g = duelGrade(a, b);
    const tiles = subjectsFor(a, b);
    assert.deepEqual(tiles.map((t) => t.key), SUBJECTS.map((s) => s.key));
    for (const t of tiles) assert.equal(t.empty, poolFor({ grade: g, subject: t.key }).length === 0, `${t.key} @${g}`);
  }
  // today's engine: numbers and algebra exist from grade 7; functions and geometry have no generators yet
  const g7 = Object.fromEntries(subjectsFor(7, 7).map((t) => [t.key, t.empty]));
  assert.equal(g7.num, false);
  assert.equal(g7.alg, false);
  assert.equal(randomEmpty(7, 7), false);
});

test("every subject has a Hebrew label (and so does 'random')", () => {
  for (const k of ["random", "num", "alg", "fn", "geo"]) assert.match(SUBJECT_LABEL[k], /[֐-׿]/);
});
