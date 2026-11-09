# Duels — decisions made during the build (2026-11-08/09)

Every judgment call taken on Abed's behalf while building duels, with its reason. Change any of them by asking.

- src/duel/samples.js is created in T6 (re-export of poolFor + GENERATORS); T10 only imports it — avoids two owners — cost if wrong: trivial merge.
- T7 owns the app/layout.tsx mount of DuelLayer; T6 must not touch layout — cost if wrong: none.
- T0 may deploy+delete a throwaway function on the live Supabase project — invisible to students, Abed asked for the feature to go live — cost if wrong: a stray function, deleted in the same task.
- Work on branch `duels`, merge to main and push only after T11 checks pass (Abed asked to push) — cost if wrong: none, he asked.
- blocked add stores a sender-only 'shadow' request visible only in sender's outgoing — spec says block is silent; brief's "stores nothing" contradicted it — cost if wrong: one extra status to exclude in later queries (T3 must exclude 'shadow').
- blocker re-adding the blocked person gets {error:'you_blocked'} + new friend_unblock — blocker already knows, silent swallow only confuses — cost if wrong: small extra function.
- Task 2 dispatched while Task 1 re-review runs — disjoint files (supabase/functions/_shared/duel vs migrations/tests), implementer told to stage only its files — cost if wrong: an index.lock retry.
- Task 3 runs in parallel with Task 2 — disjoint files (migrations/tests vs functions/_shared/duel); both told to stage only their files — cost if wrong: lock retry.
- buildDuel rotates topics first, then generators — spec wants mixed topics; equation-solver was ~6% — cost if wrong: test update.
- drop package.json "main" hack; test cmd `node --test supabase/functions/_shared/duel/*.test.mjs` — cost if wrong: none.
- give-up quitter 0 XP (spec said loss=+10) — stops forfeit farming — cost if wrong: quitter misses 10 XP; spec to be updated.
- duel XP only if the player answered ≥3 questions — stops 0-answer forfeit/idle-draw farming (XP = future shop currency) — cost if wrong: very short honest duels earn 0.
- duel_state sends only questions idx ≤ me.idx while live — no reading ahead — cost if wrong: one fetch per question already happens anyway (state after each answer).
- accept-after-block → 'expired' not 'cancelled' — hides block.
- if chosen world has no questions for the pair, duel falls back to random — UI hides empty tiles so this only covers races — cost if wrong: one off-subject duel.
- decoys as a "web" (≥1 decoy derived from another decoy) to randomize consensus rank — single-change decoys make the answer the centre — cost if wrong: slightly harder distractors.
- a variant that can't be balanced without silly decoys becomes typed-only — acceptable for a duel — cost if wrong: fewer choice questions.
- onAuthLost only on function-level dead-token signals, never raw HTTP 401/403 — a missing grant must not sign out the whole site — cost if wrong: stale header until reload.
- Login/Signup honour ?next only for paths starting /duel — open-redirect safe — cost: minimal edits to account pages.
- closing the sheet keeps the invite alive (waiting pill in hub) — accidental backdrop tap shouldn't kill a challenge.
- two-tone tug pill for all my-vs-them numbers; mine on the right in RTL.
- multi-part expression answers become one-slot questions (ask a single missing coefficient/exponent, typed or number choices) — 2×2 decoy grids leak structurally — cost if wrong: slightly less variety in powers questions.
- d2f / ratio simp go typed (fraction via "/" on keypad; ratio asks one part) if balancing can't get ≤40% — cost: T7 keypad must support "/".
- use opus for remaining work until Fable resets — cost: none expected. Note: untracked AGENTS.md appeared (not ours; don't stage).
- all one-slot and exponent pr.* variants become typed-only; choice mode kept only where all guessers ≤40% — balancing arms race on rule-derived small numbers can't converge — cost if wrong: powers questions typed (still fast), fewer choice items in num duels (mix test added).
- generic push text without the friend's username (minors; free-text usernames; lock-screen exposure) — cost if wrong: slightly less personal notification; Abed can change.
- cap each generator at 4 per duel (relax only if the pool can't fill) — variety across a duel — cost if wrong: slightly more repeats from bigger topics.
- grade-7 "algebra" duel = 15 linear equations (honest to the subject) — keep; product polish later — cost: monotone for grade 7.
- per-account duel ban + close open duels on switch-off added before students — child-safety/moderation — cost: one column + admin toggle.
- admin PIN 1111 left to Abed (his 2026-10-31 decision) — raise to him before "on".
- fold residual Minor 2 (shut non-tester duels on 'test') and Minor 3 (sw.js new URL origin check) + Minor 5 (engine chunk failure message) into Task 11's check-and-fix — cheap, go-live relevant — cost: small extra migration lines.
- park duel_shut lock-order, CORS preview squat, one-time layer load — low impact, no live risk — cost if wrong: an admin switch save might need one retry.
