# Duels ("דו-קרב") — design

Date: 2026-11-07 · Owner: Abed · Status: approved direction ("go for it, I trust you"), details below are Claude's calls unless marked **(Abed)**.
Mockup Abed approved: `design/duel/mockup.html` (5 screens; screen 4 playable).

## 1. Why

Students practise alone today. A live 1v1 duel against a friend turns practice into something they want to do and come back for: a short, loud, fair race on the same math they already practise. Success = students challenge friends again and again ("Revenge!"), and the loser still leaves having learned something.

## 2. What Abed decided

- **Live 1v1 only, both at the same moment (Abed).** No async, no "race my recording". If the friend doesn't accept in time, the invitation expires.
- **Invite → friend gets it at once if on the site; otherwise a notification (Abed).**
- **30-second cooldown between invitations (Abed).**
- **Pick a subject or "random" (Abed). 15 questions, 5 minutes per duel (Abed).**
- **Each player sees the other's progress live, on top (Abed).**
- **A friends system is needed (Abed).**
- **Answer style: mostly 4 choices, every ~4th question typed on a keypad (Abed).**
- **Questions come from Sulaiman's existing exercise generators, same math, "duel version" (Abed).** A better question system comes later.
- **Fun, effects, students should love it (Abed).** He approved the mockup and every extra idea in it.

## 3. Goals, non-goals, anti-goals

Goals
- Friends: add, accept, see who's online now, remove, block.
- Live duel with server-kept time and server-checked answers (fair; no peeking at answers in the browser).
- The mockup's experience: invite drop-in with 60-s ring, VS face-off + shared 3-2-1, tug-of-war HUD, two 15-dash lanes, streak flame, last question ×2, wrong-answer 2-s lock, overtake banner, staged result (columns, count-up, crown, confetti once), "what to review", Revenge.
- Head-to-head record per friend ("4 – 3"), duel badges, small XP.
- Works great on a phone first (iPhone Safari), RTL Hebrew.

Non-goals (v1)
- Async play, ghosts, public leaderboards, matchmaking with strangers, free-text chat, teams, tournaments, power-ups, spectators.
- Drawing-based questions (geometry figures, graphs, number lines) — phase 2 (§9).
- Guests dueling: duels need an account (friends need an identity).

Anti-goals (failure even if it "works")
- Strangers can find or message a child. → friend code / exact username + both accept, preset emotes only.
- Loud and noisy all the time. → effects only at big moments (start, overtake, last question, last 30 s, result).
- Losing feels humiliating. → no taunts; loser gets points + review list.
- Answers visible in the browser before answering. → server holds answers.
- Breaking Sulaiman's math or touching `Topic.jsx`. → duel generators are ports in their own folder.
- Anything left half-working on the live site. → whole feature behind a switch until Abed turns it on.

## 4. The experience (screens)

Visual system: the site's tokens (Rubik, white cards, world colours from `src/home/worlds.js`: num sky, alg violet, fn emerald, geo coral). "Me" = the student's own colour (`account.avatar`); opponent = their own colour; if both picked the same colour, the opponent gets a fixed contrast fallback (rose). Avatar = existing avatar circle (`acct-av`), 3D figure later. Respect `prefers-reduced-motion` (no shake, no confetti, instant bars). Sounds via the existing sound system in `mp-runtime.js` if one exists, else a tiny duel sound module; sound follows the site's sound setting.

1. **Duel hub `/duel`** (signed-in only; guests see an invite to open an account).
   - Top: "דו-קרב" title, my record (wins–losses), my friend code + "share link" + QR button.
   - Friends list: avatar, name, green dot if online now, "last seen", head-to-head ("4 – 3"), tap a friend → challenge sheet.
   - Requests block (incoming requests with accept/decline; outgoing pending).
   - "Add a friend": type a friend code (or open a friend's link / scan their QR) → sends a request.
   - Recent duels (last 10: opponent, result, score, subject).
2. **Challenge sheet** (bottom sheet on phone): subject tiles = the 4 worlds + "הפתעה!" (random, dice). Send button. After sending: "waiting for Noa…" with the 60-s ring and a cancel button; the 30-s cooldown shows on the send button.
3. **Incoming invite** (anywhere on the site, signed-in): drops from the top with the 60-s ring, challenger name, subject, head-to-head, "לא עכשיו" / "קבל/י". Small shake once. If the student is inside a topic exercise, the drop-in is the same (non-blocking card), not a modal.
4. **Face-off** `/duel/<id>`: split diagonal VS screen, both avatars + level rank, then shared 3-2-1-"יאללה!" counting to the server start time (both screens hit "go" at the same moment, ±network).
5. **Duel**: dark HUD on top (scores, timer, tug-of-war bar, two 15-dash lanes, "Noa answered ✓" ping), question card, 4 big choice buttons or the keypad (digits, minus, ⌫, send; fraction/decimal input only if the question needs it). Streak flame at 3+, ×1.2 at 3, ×1.5 at 5. Wrong → red + shake on the button + 2-s lock overlay. Last question: "שאלה אחרונה ×2" banner + heartbeat. Last 30 s: timer turns red and pulses. Overtake: banner "עקפת את נועה!" + one small shake; being overtaken: banner only. If I finish first: "waiting for Noa — 9/15" with her lane still live; I can't change answers.
6. **Result**: both columns rise together with count-up, crown + confetti once for the winner, "draw" state, facts (correct /15, best streak, avg seconds), "what to review" (up to 3 missed questions with the right answer + a link to that chapter), preset emotes (good game / wow / another one?) that the other side sees as a small bubble, buttons "חזרה" and "נקמה! עוד סיבוב" (sends a new invite with the same subject; the other side gets it as an invite).
7. **Entry points**: a duel tile on the signed-in home (`HomeHero` area, near the number tiles), "דו-קרב" in the account menu, and the invite drop-in everywhere.

## 5. Rules

- **Invite** expires 60 s after sending. Sender can cancel. One open invite per sender; a player who is in a live duel can't be invited (sender sees "Noa is in a duel now").
- **Cooldown**: 30 s between invites from the same sender (server-enforced). Plus a safety cap: max 40 invites per sender per day.
- **Start**: on accept, server sets `start_at = now() + 5 s` (face-off + countdown) and `ends_at = start_at + 300 s`.
- **Questions**: 15, same for both, generated on the server at accept time. Order: mixed topics within the chosen area; `random` = all 4 areas. No duplicate prompt in one duel.
- **Topics allowed** (Claude's call) = topics whose grade is ≤ the *lower* grade of the two players (cumulative: a grade-8 pair gets grade 7 + 8 topics). A player with no grade set counts as grade 9. Never widen upward. A world tile with no generators for that pair is hidden in the challenge sheet; "הפתעה!" is always available. Topic → grade mapping comes from the topic titles / `src/home/catalog.js` and is written into the generator registry.
- **Answering**: one answer per question, no going back. A wrong answer locks the next answer for 2 s (server rejects earlier submissions).
- **Scoring** (server): correct = 100 + speed bonus `max(0, 50 − 4·seconds_on_this_question)`, × streak multiplier (1.2 at streak 3–4, 1.5 at 5+), × 2 on question 15; wrong = 0 and streak resets. Seconds on a question = time since the previous answer by that player (or since `start_at`).
- **End**: when both answered 15, or at `ends_at` (+2 s grace). Winner = higher score; tie → more correct; tie → lower total time; else draw.
- **Leaving**: closing the page doesn't stop the clock. Coming back to `/duel/<id>` resumes where you were. A "give up" button ends it as a loss for that player.
- **Rewards**: winner +30 XP, loser +10 XP, draw +20; only the first 5 duels per day per player earn XP (no farming). A player earns duel XP only if they answered at least 3 questions in that duel; a player who gives up gets 0 XP (Claude's calls after review, against forfeit/idle farming). Badges: first duel, first win, 5 wins, 25 wins, perfect 15/15, comeback (won after being behind at question 10).
- **Duels are separate from practice** (Claude's call): duel answers are NOT written to the practice `events`, so the railway, strengths, Sulaiman's answer stats and practice badges stay pure practice. Duel XP is stored on the server (`accounts.duel_xp`, summed from finished duels), returned by `account_progress`, and `xpOf()` in `src/lib/progress.js` adds it. Note: XP will later be shop currency, so the daily cap matters.
- **Level/rank of a friend** (shown on face-off and friends list): computed in SQL by a copy of `xpOf`/`playerLevel` (`progress.js`), kept in sync by a comment in both places.
- **Online** = had the site open in the last 70 s. Heartbeat `presence_ping` every 20 s while the tab is visible, writing a new column `accounts.online_at` (the existing `last_seen` keeps its meaning for the admin).

## 6. Friends and safety

- Every account gets a **friend code**: 6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, unique, shown on `/duel` with copy + share link `/duel/add/<code>` + QR (QR drawn client-side, no external service).
- Add **only by friend code** (typed, link or QR) — *Claude's call after review:* no username search at all, because a guessed username would let a stranger send a request (and the sender's chosen username works as a short message). The code is something a student hands out on purpose. Both sides must accept. Max 100 friends. Friend requests: max 20 per day per sender; a request has "report" next to accept/decline.
- **Block**: silent; removes friendship; the blocked user can't send requests or invites; neither sees the other. **Report**: a preset reason list → goes to admin (new admin list).
- **No free text** anywhere between students. Emotes are a fixed list.
- Only usernames, avatar colour, level/rank, grade and online status are shown, and only to friends.
- **Privacy policy + terms**: must mention friends, online status, duels, and that usernames are visible to friends. Changing them means bumping `account_terms_version()` + `TERMS_VERSION` → every student re-accepts. **Needs Abed's OK on the new wording before release.**

## 7. Architecture

Current stack: Next.js 16 on Vercel (Sulaiman's team; Abed can't set Vercel env vars), Supabase project "mathix" on Abed's side, our own token auth (`account_from(tok)`), browser calls DB functions via REST `rpc` with the publishable key (`src/lib/mp-data.js`). Rule: every privileged action is a `security definer` DB function that checks the token; no secret key in the site.

### 7.1 Database (new migration(s) in `supabase/migrations/`)

- `accounts`: add `friend_code text unique`, `online_at timestamptz` (`last_seen` already exists and is updated by `account_from` at most every 5 min — leave it), `duel_xp int default 0`, `inbox text` (random 32-char secret: the name of the user's realtime channel; returned only to the owner by `account_me`/`account_json`).
- `friendships(a uuid, b uuid, status 'pending'|'accepted', requested_by uuid, created_at, accepted_at)`, stored with `a < b`, primary key `(a,b)`.
- `blocks(blocker uuid, blocked uuid, created_at)`, `reports(id, reporter, reported, reason, duel_id null, created_at, done bool)`.
- `duels(id uuid, a uuid /*sender*/, b uuid, subject text, status 'invited'|'declined'|'cancelled'|'expired'|'live'|'done', created_at, expires_at, start_at, ends_at, channel text /*random secret*/, a_score, b_score, a_ok, b_ok, a_done_at, b_done_at, winner uuid null, draw bool, xp_a, xp_b)`.
- `duel_questions(duel_id, idx 0..14, topic text, chapter text, kind 'choice'|'number', payload jsonb /*prompt, choices, display hints*/, answer jsonb /*server only*/)` — **no grant to anon on `answer`**: table not readable by anon at all; the client gets questions only through `duel_state`.
- `duel_answers(duel_id, uid, idx, given jsonb, correct bool, points int, ms int, at timestamptz, primary key(duel_id, uid, idx))`.
- `duel_sends(uid, at)` for cooldown + daily cap (or computed from `duels.created_at`).
- All tables: RLS on, no direct anon access; access only through functions. Grants on functions to `anon`.

DB functions (all take `tok`, all `security definer`, return json; errors as `{error:'code'}` mapped to Hebrew in the client like `account.js` does):
`friends_me(tok)` (code, list with online/last_seen/head-to-head, requests in/out), `friend_add(tok, code_or_username)`, `friend_answer(tok, other, accept)`, `friend_remove(tok, other)`, `friend_block(tok, other)`, `friend_report(tok, other, reason, duel_id)`, `presence_ping(tok)` (sets last_seen; returns pending invites as a fallback), `duel_invite(tok, friend, subject)`, `duel_cancel(tok, id)`, `duel_answer_invite(tok, id, accept)`, `duel_state(tok, id)` (questions without answers, both players' progress, times, server `now()`), `duel_answer(tok, id, idx, given)` (checks lock/time/order, scores, returns `{correct, right_answer, points, my_score, streak}`), `duel_give_up(tok, id)`, `duel_emote(tok, id, emote)`, `duel_history(tok)`, `duel_finish_if_due(id)` (idempotent; called by answer/state/ping).
Admin: `admin_reports(tok)`, `admin_report_done`, duel counts in admin stats, `admin_set_setting` accepts `'duels'`.

### 7.2 Question generation (server, hidden answers)

- **Supabase Edge Function `duel-start`** (Deno, on Abed's Supabase; deployed with `supabase functions deploy duel-start` — `verify_jwt = false` is set in `supabase/config.toml` — no Vercel change). Decided after review: **the accepting client calls it** (`{tok, duel_id}`), not pg_net (pg_net is fire-and-forget after commit, so the DB can't wait for the questions). The site's `sb_publishable_…` key is not a JWT, hence `verify_jwt = false`; the function checks our own token itself through a DB function (`duel_claim_start(tok, id)` → returns both players' grades + subject, only for the invitee of an `accepted` duel, once). It then generates 15 questions and calls a DB function `duel_put_questions(secret, id, rows)` that inserts them, sets status `live`, `start_at = now() + 4 s`, `ends_at = start_at + 300 s`, and broadcasts `duel_start`. Writing (as built): the function calls both DB functions through PostgREST rpc with the project's public anon/publishable key only — no service-role key; `duel_put_questions` requires a shared secret from Supabase function secrets + Vault so nobody else can call it. Status flow: `invited → accepted → live → done`. If questions aren't in within 10 s of `accepted`, any `duel_state`/`presence_ping` call marks the duel `failed` and both players see "something went wrong, try again" (no XP, no record).
- Generators live in `supabase/functions/_shared/duel/` — one file per topic, plain JS, **ported** (copied and adapted) from `src/topics/<topic>/Topic.jsx` generator functions with a comment pointing to the source function + line. Each returns `{prompt, kind, answer, choices?, display?}`. Wrong choices: plausible mistakes (sign flip, ±1, swapped operation, common mistake), unique, shuffled, 4 total.
- Hebrew prompts reuse Sulaiman's wording from his chapters where they exist; short neutral prompts otherwise ("x = ?"). Math display: a small `MathText` component for fractions, exponents, √, π, and LTR math inside RTL.
- Which chapters are in v1: the "A" chapters from the topic audit (49 of 84; saved in `docs/superpowers/specs/2026-11-07-duels-topic-audit.md`, re-check chapter names against `src/home/chapters.js` when porting — circle's chapters were renumbered 2026-11-02) — directed-numbers ch1–4,6; equation-solver; powers-roots; ratio-percent; quadrilaterals (text form); solids3d ch1–6; circle ch2–6; triangles ch1–3 (text form); linear-function ch4,6–9; intersection ch1; equations-advanced ch1 + ch4 level 1; quadratic-solver coefficient/case steps. Known generator bugs are filtered in the port (e.g. angle ≤ 0, kite angles that aren't a real kite, fewer than 4 choices).
- Each generator ships with a self-check test (1,000 runs: answer is right by an independent computation, 4 distinct choices, no NaN, prompt renders) — run locally with Deno or Node.
- Sulaiman's `Topic.jsx` files are not edited; `tools/verify-logic.py` must keep saying "math and text untouched".

### 7.3 Live updates

- **Supabase Realtime broadcast** from the database: DB functions call `realtime.send(payload, event, topic, false)` (signature `(payload jsonb, event text, topic text, private boolean)`) with `topic` = a random secret (`accounts.inbox` for invites to a user, `duels.channel` for a duel). Clients subscribe with `@supabase/realtime-js` (add the small package) using the publishable key. Requires the project's Realtime "allow public access" to be on.
- **Every realtime message is only a hint.** Public channels can be *written* by anyone who knows the name (both players know the duel channel), so the client never trusts payload content: on any event it re-fetches `duel_state` / `presence_ping` and renders from that. Emotes are sent as an id from the fixed list and rendered from the client's own list; unknown ids are ignored. Payloads carry only ids/counters, never names or text. Events: `invite`, `invite_cancelled`, `invite_answer`, `duel_start`, `opp_answer`, `emote`, `duel_end`.
- **Where the socket is open** (Claude's call, free plan ≈ 200 concurrent realtime connections): only on `/duel` pages and during a duel. Elsewhere on the site the 20-s `presence_ping` returns pending invites, so an invite shows within ~20 s (the invite lives 60 s). If the project moves to a paid plan, the socket can be opened site-wide.
- **Fallbacks** (realtime can drop): `presence_ping` every 30 s returns pending invites; the duel screen polls `duel_state` every 3 s when the socket isn't connected and once on every reconnect/visibility change. The truth is always the DB; realtime is just speed.
- **Time**: server `now()` from `duel_state` → client computes clock offset; timer and 3-2-1 are drawn from `start_at`/`ends_at` minus offset.
- Spike first: confirm `realtime.send` → browser works on the hosted project and locally (enable both `[realtime]` and `[edge_runtime]` in `supabase/config.toml`), and that an edge function with `verify_jwt = false` can be called with the publishable key and can write through `duel_put_questions`.

### 7.4 Notifications when the friend isn't on the site

- In-site: invite drop-in (realtime) + `presence_ping` fallback.
- **Web Push** (phase 1b, after the core works): service worker `public/sw.js`, "turn on duel notifications" button shown only after the student's first duel (permission is asked only on that tap, never on first visit), subscription stored in `push_subs(uid, endpoint, keys, created_at)`, sent by an edge function `duel-push` with the private VAPID key in Supabase secrets (public VAPID key goes in `src/lib/config.js`). Use a Deno-native Web Push library (not `npm:web-push`). iPhone only gets them when the site is added to the home screen (iOS 16.4+) — the prompt explains this in one line. Quiet hours 21:00–07:00 Israel time: no pushes.

### 7.5 Client code (new, own files)

- `app/duel/page.tsx` (hub), `app/duel/[id]/page.tsx` (play), `app/duel/add/[code]/page.tsx` (friend link).
- `src/duel/` — `Hub.jsx`, `ChallengeSheet.jsx`, `InviteDrop.jsx`, `FaceOff.jsx`, `Arena.jsx` (HUD + question), `Result.jsx`, `MathText.jsx`, `Keypad.jsx`, `fx.js` (confetti reuse `confettiAt` from `progress.js`, shake, banners, sounds), `api.js` (rpc wrappers + Hebrew errors), `live.js` (realtime + fallbacks + clock offset), `presence.js`.
- Styles: `src/styles/duel.css`.
- `DuelLayer` mounted once for signed-in users (root layout client wrapper): heartbeat + inbox subscription + `InviteDrop`. Must not run on admin pages, must not slow topic pages (lazy-load realtime after idle).
- Dev preview without a DB: `/dev/duel?s=hub|invite|faceoff|arena|result` with sample data (404 on live like `/dev/railway`).

### 7.6 Release switch

`site_settings.duels` = `"off" | "test" | "on"` (public, so the UI can hide the entry points). Testers are a flag on the account (`accounts.duel_tester bool`, set from admin → Students), not a public list. **The switch is enforced inside every friend/duel DB function** (helper `duel_guard(uid)`: off → error, test → only testers, on → everyone), not only by hiding UI. Admin → Settings gets the switch. Code ships to `main` with `off`/`test`; Abed tests on the live site; Abed alone decides `on`.

## 8. Testing (before Abed sees it)

- Generators: 1,000-run self-checks per generator.
- DB: local Supabase (`supabase start`), SQL tests for every function: cooldown, expiry, double accept, answer after end, answer during lock, wrong order, blocked users, non-friends, finished-duel scoring, draws, XP cap.
- Two real browsers (two test accounts) through the whole flow: add friend → invite → accept → duel → result → revenge; plus: decline, expire, cancel, close tab mid-duel and return, network off for 10 s mid-duel, both finish early, one times out.
- iPhone Safari (simulator) scroll/feel video of every screen, both directions; reduced-motion; 375 px width.
- `python3 tools/verify-logic.py` = "math and text untouched"; `npx next build` passes.

## 9. Later (not v1)

Drawing kit for geometry/graph questions (unlocks ~18 chapters), C-chapters as 4-choice questions, 3D avatars in face-off and result, class codes from a teacher, weekly friend streak, more emotes, season badges, Sulaiman's improved question system.

## 10. Open for Abed (before release, not before building)

- New privacy/terms wording (friends, online status, duels) and the re-accept that comes with it.
- Who are the testers for `duels = test` (his test usernames).
- Sulaiman: the duel questions are ports of his generators with new wrong-answer choices. Claude's call: an admin page "שאלות דו-קרב" shows 3 samples of every generator (prompt, choices, answer) so Sulaiman can check them any time; release does not wait for him unless Abed says so.
