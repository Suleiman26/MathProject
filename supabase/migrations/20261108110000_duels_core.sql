-- ============================================================================
-- Duels, part 2: invites, the live duel, scoring and results (2026-11-08).
-- Spec: docs/superpowers/specs/2026-11-07-duels-design.md §5, §7.1–§7.3.
-- ----------------------------------------------------------------------------
--  * Flow: invited → accepted → live → done. Side exits: declined, cancelled,
--    expired (60 s, nobody answered), failed (accepted but no questions within
--    10 s). An invite needs real friends (status 'accepted'), no block either
--    way, and both players free (no invited/accepted/live duel).
--  * Questions are made by the edge function duel-start (Task 4): the invitee
--    claims the duel once (duel_claim_start → grades, subject, seed), the
--    function writes 15 questions with duel_put_questions(secret, …). The
--    secret is the Vault secret 'duel_secret' (set on the live project by
--    hand, never in a migration); without it every write is refused.
--  * Answers are checked and scored ONLY here. The answer of a question never
--    leaves the database before the player has answered it.
--  * Time is always the database's now(); a phone's clock is never trusted.
--  * Every change sends a small realtime hint (ids/counters only) to the
--    player's inbox or the duel's channel; clients re-read duel_state.
--  * Row locks on the duel ("select … for update") make double taps and
--    accept-vs-cancel races end in exactly one outcome.
--  * Duel answers are NOT practice events: the railway and stats stay pure.
--  * New tables: RLS on, no grants; everything goes through the functions.
-- ============================================================================

-- ── tables ──────────────────────────────────────────────────────────────────
create table if not exists public.duels (
  id          uuid primary key default gen_random_uuid(),
  a           uuid not null references public.accounts(id) on delete cascade,   -- sender
  b           uuid not null references public.accounts(id) on delete cascade,   -- invitee
  subject     text not null check (subject in ('random', 'num', 'alg', 'fn', 'geo')),
  status      text not null default 'invited'
              check (status in ('invited', 'declined', 'cancelled', 'expired', 'accepted', 'live', 'done', 'failed')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '60 seconds',
  accepted_at timestamptz,
  claimed_at  timestamptz,                -- the invitee's edge-function call took the duel (once)
  seed        int,                        -- random seed for the question generator
  start_at    timestamptz,
  ends_at     timestamptz,
  finished_at timestamptz,                -- when it became done/failed (daily XP cap counts these)
  channel     text not null default encode(extensions.gen_random_bytes(16), 'hex'),   -- secret realtime topic
  a_score     int not null default 0,
  b_score     int not null default 0,
  a_ok        int not null default 0,
  b_ok        int not null default 0,
  a_done_at   timestamptz,
  b_done_at   timestamptz,
  winner      uuid,
  draw        boolean not null default false,
  xp_a        int not null default 0,
  xp_b        int not null default 0,
  comeback_by uuid,
  gave_up     uuid,
  check (a <> b)
);
create index if not exists duels_a on public.duels (a, status);
create index if not exists duels_b on public.duels (b, status);
create index if not exists duels_a_created on public.duels (a, created_at);
create index if not exists duels_finished on public.duels (finished_at) where status = 'done';

create table if not exists public.duel_questions (
  duel_id uuid not null references public.duels(id) on delete cascade,
  idx     smallint not null check (idx between 0 and 14),
  gen     text,
  topic   text,
  chapter text,
  kind    text not null check (kind in ('choice', 'number')),
  payload jsonb not null,                 -- what the player sees: prompt, choices, display hints
  answer  text not null,                  -- server only: choice index "0".."3" or a number
  tol     numeric,
  primary key (duel_id, idx)
);

create table if not exists public.duel_answers (
  duel_id uuid not null references public.duels(id) on delete cascade,
  uid     uuid not null references public.accounts(id) on delete cascade,
  idx     smallint not null check (idx between 0 and 14),
  given   text,
  correct boolean not null,
  points  int not null,
  ms      int not null,                   -- time on this question (since my previous answer, or the start)
  streak  int not null default 0,         -- my streak after this answer
  at      timestamptz not null default now(),
  primary key (duel_id, uid, idx)
);

create table if not exists public.duel_emotes (
  id      bigint generated always as identity primary key,
  duel_id uuid not null references public.duels(id) on delete cascade,
  uid     uuid not null references public.accounts(id) on delete cascade,
  emote   text not null check (emote in ('gg', 'wow', 'again')),
  at      timestamptz not null default now()
);
create index if not exists duel_emotes_duel on public.duel_emotes (duel_id);

alter table public.duels          enable row level security;
alter table public.duel_questions enable row level security;
alter table public.duel_answers   enable row level security;
alter table public.duel_emotes    enable row level security;
revoke all on public.duels, public.duel_questions, public.duel_answers, public.duel_emotes from public, anon, authenticated;

-- ── answer check ────────────────────────────────────────────────────────────
-- SQL copy of parseNum / checkAnswer in supabase/functions/_shared/duel/answer.js
-- — keep the two in step (same cases in both test files).
--   spaces ignored; "−" (U+2212) and "–" (U+2013) = "-"; "," = "."
--   "12", "-3", "+3", "1.5", ".5", "5.", "2.50", or a fraction "a/b" of two of
--   those (b = 0 → not a number); anything else → not a number (wrong).
create or replace function public.duel_parse_num(t text)
returns numeric language plpgsql immutable set search_path = public as $$
declare
  num constant text := '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$';
  s text; p text[]; d numeric;
begin
  if t is null then return null; end if;
  s := translate(regexp_replace(t, '\s+', '', 'g'), '−–,', '--.');
  if s ~ num then return s::numeric; end if;
  p := string_to_array(s, '/');
  if array_length(p, 1) = 2 and p[1] ~ num and p[2] ~ num then
    d := p[2]::numeric;
    if d = 0 then return null; end if;
    return p[1]::numeric / d;
  end if;
  return null;
end $$;

-- choice: the given index equals the stored one; number: |given − answer| ≤ tol (+1e-9, as in answer.js)
create or replace function public.duel_check(kind text, answer text, tol numeric, given text)
returns boolean language plpgsql immutable set search_path = public as $$
declare g numeric; a numeric;
begin
  if given is null or answer is null then return false; end if;
  if kind = 'choice' then return regexp_replace(given, '^\s+|\s+$', '', 'g') = answer; end if;
  g := duel_parse_num(given); a := duel_parse_num(answer);
  if g is null or a is null then return false; end if;
  return abs(g - a) <= coalesce(tol, 0) + 0.000000001;
end $$;

-- ── internal helpers ────────────────────────────────────────────────────────
-- a realtime hint; never lets a broadcast problem break the game
create or replace function public.duel_hint(topic text, event text, payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if topic is null then return; end if;
  perform realtime.send(payload, event, topic, false);
exception when others then
  raise warning 'duel_hint % failed: %', event, sqlerrm;
end $$;

-- x's wins against y (finished duels)
create or replace function public.duel_wins(x uuid, y uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from duels
   where status = 'done' and winner = x and ((a = x and b = y) or (a = y and b = x));
$$;

-- 15 dashes: true / false / null (not answered yet)
create or replace function public.duel_lanes(d uuid, u uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_agg(da.correct order by g)
    from generate_series(0, 14) g
    left join duel_answers da on da.duel_id = d and da.uid = u and da.idx = g;
$$;

-- XP for one player at the end of a duel: only the first 5 finished duels of
-- the (Israeli) day earn XP. Adds it to accounts.duel_xp and returns it.
create or replace function public.duel_xp_award(u uuid, d uuid, base int)
returns int language plpgsql security definer set search_path = public as $$
begin
  if coalesce(base, 0) <= 0 then return 0; end if;
  if (select count(*) from duels
       where (a = u or b = u) and status = 'done' and id <> d
         and (finished_at at time zone 'Asia/Jerusalem')::date = (now() at time zone 'Asia/Jerusalem')::date) >= 5 then
    return 0;
  end if;
  update accounts set duel_xp = duel_xp + base where id = u;
  return base;
end $$;

-- end a live duel now: scores, winner, XP, comeback. The caller holds the row lock.
-- quitter = a player who gave up (loses whatever the score, earns no XP).
create or replace function public.duel_close(d_id uuid, quitter uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  d duels;
  sa int; sb int; oa int; ob int; na int; nb int; ma bigint; mb bigint;
  w uuid; dr boolean := false; t timestamptz; cb uuid; xa int; xb int;
begin
  select * into d from duels where id = d_id;
  if d.status <> 'live' then return; end if;
  select coalesce(sum(points), 0), count(*) filter (where correct), count(*), coalesce(sum(ms), 0)
    into sa, oa, na, ma from duel_answers where duel_id = d.id and uid = d.a;
  select coalesce(sum(points), 0), count(*) filter (where correct), count(*), coalesce(sum(ms), 0)
    into sb, ob, nb, mb from duel_answers where duel_id = d.id and uid = d.b;
  -- total time for the tie-break: someone who didn't answer all 15 counts as slower than any finisher
  if na < 15 then ma := 9000000000; end if;
  if nb < 15 then mb := 9000000000; end if;

  if quitter is not null then w := case when quitter = d.a then d.b else d.a end;
  elsif sa <> sb then w := case when sa > sb then d.a else d.b end;     -- 1. score
  elsif oa <> ob then w := case when oa > ob then d.a else d.b end;     -- 2. right answers
  elsif ma <> mb then w := case when ma < mb then d.a else d.b end;     -- 3. less total time
  else dr := true;
  end if;

  -- comeback: the winner was behind at the moment both had answered 10 questions
  if w is not null and quitter is null
     and (select count(*) from duel_answers where duel_id = d.id and idx = 9) = 2 then
    select max(at) into t from duel_answers where duel_id = d.id and idx = 9;
    if (select coalesce(sum(points), 0) from duel_answers where duel_id = d.id and uid = w and at <= t)
     < (select coalesce(sum(points), 0) from duel_answers where duel_id = d.id and uid <> w and at <= t) then
      cb := w;
    end if;
  end if;

  xa := duel_xp_award(d.a, d.id, case when dr then 20 when w = d.a then 30 when quitter = d.a then 0 else 10 end);
  xb := duel_xp_award(d.b, d.id, case when dr then 20 when w = d.b then 30 when quitter = d.b then 0 else 10 end);

  update duels set status = 'done', finished_at = now(),
         a_score = sa, b_score = sb, a_ok = oa, b_ok = ob,
         winner = w, draw = dr, xp_a = xa, xp_b = xb, comeback_by = cb, gave_up = quitter
   where id = d.id;
  perform duel_hint(d.channel, 'duel_end', jsonb_build_object('id', d.id));
end $$;

-- move a duel on when its time has come (idempotent; no token — internal only):
-- invited past expires_at → expired; accepted 10 s without questions → failed;
-- live and both answered 15, or past ends_at + 2 s → done. Returns the status.
create or replace function public.duel_finish_if_due(id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare d duels;
begin
  select * into d from duels where duels.id = duel_finish_if_due.id;
  if not found then return null; end if;
  -- cheap check first; lock only when something may change
  if not ((d.status = 'invited' and now() > d.expires_at)
       or (d.status = 'accepted' and now() > d.accepted_at + interval '10 seconds')
       or (d.status = 'live' and (now() > d.ends_at + interval '2 seconds'
                                  or (select count(*) from duel_answers where duel_id = d.id) >= 30))) then
    return d.status;
  end if;
  select * into d from duels where duels.id = duel_finish_if_due.id for update;
  if d.status = 'invited' and now() > d.expires_at then
    update duels set status = 'expired' where duels.id = d.id;
    return 'expired';
  elsif d.status = 'accepted' and now() > d.accepted_at + interval '10 seconds' then
    update duels set status = 'failed', finished_at = now() where duels.id = d.id;
    perform duel_hint(d.channel, 'duel_end', jsonb_build_object('id', d.id));
    return 'failed';
  elsif d.status = 'live' and (now() > d.ends_at + interval '2 seconds'
                               or (select count(*) from duel_answers where duel_id = d.id) >= 30) then
    perform duel_close(d.id);
    return 'done';
  end if;
  return d.status;
end $$;

-- every open duel of a player moves on if due (called by invite and ping)
create or replace function public.duel_tidy(u uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from duels where (a = u or b = u) and status in ('invited', 'accepted', 'live') order by id loop
    perform duel_finish_if_due(r.id);
  end loop;
end $$;

-- ── invite ──────────────────────────────────────────────────────────────────
-- errors: subject, not_friend (also for a block, either way — never revealed),
-- cooldown (+wait_s), limit_day, busy (either player has an open duel)
create or replace function public.duel_invite(tok text, friend uuid, subject text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := account_from(tok); g text := duel_guard(me);
  last timestamptz; d duels;
begin
  if g is not null then return json_build_object('error', g); end if;
  if subject is null or subject not in ('random', 'num', 'alg', 'fn', 'geo') then
    return json_build_object('error', 'subject');
  end if;
  if friend is null or friend = me or duel_guard(friend) is not null or friends_blocked(me, friend)
     or not exists (select 1 from friendships where a = least(me, friend) and b = greatest(me, friend) and status = 'accepted') then
    return json_build_object('error', 'not_friend');
  end if;
  -- both players, always in the same order: double taps and two people inviting
  -- the same friend at once are handled one after the other
  perform pg_advisory_xact_lock(hashtext('duel:' || least(me, friend)::text));
  perform pg_advisory_xact_lock(hashtext('duel:' || greatest(me, friend)::text));

  select max(created_at) into last from duels where a = me;
  if last > now() - interval '30 seconds' then
    return json_build_object('error', 'cooldown',
      'wait_s', greatest(1, ceil(30 - extract(epoch from now() - last)))::int);
  end if;
  if (select count(*) from duels where a = me
        and (created_at at time zone 'Asia/Jerusalem')::date = (now() at time zone 'Asia/Jerusalem')::date) >= 40 then
    return json_build_object('error', 'limit_day');
  end if;
  perform duel_tidy(me);
  perform duel_tidy(friend);
  if exists (select 1 from duels where status in ('invited', 'accepted', 'live')
               and (a in (me, friend) or b in (me, friend))) then
    return json_build_object('error', 'busy');
  end if;

  insert into duels (a, b, subject) values (me, friend, duel_invite.subject) returning * into d;
  perform duel_hint((select inbox from accounts where id = friend), 'invite', jsonb_build_object('id', d.id));
  return json_build_object('id', d.id, 'expires_at', d.expires_at);
end $$;

-- the sender takes back an open invite
create or replace function public.duel_cancel(tok text, id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := account_from(tok); g text := duel_guard(me); d duels;
begin
  if g is not null then return json_build_object('error', g); end if;
  select * into d from duels where duels.id = duel_cancel.id for update;
  if not found or d.a <> me or d.status <> 'invited' then return json_build_object('error', 'gone'); end if;
  if now() > d.expires_at then
    update duels set status = 'expired' where duels.id = d.id;
    return json_build_object('error', 'gone');
  end if;
  update duels set status = 'cancelled' where duels.id = d.id;
  perform duel_hint((select inbox from accounts where accounts.id = d.b), 'invite_cancelled', jsonb_build_object('id', d.id));
  return json_build_object('status', 'cancelled');
end $$;

-- the invitee accepts or declines; gone when it was cancelled, expired or already answered
create or replace function public.duel_answer_invite(tok text, id uuid, accept boolean)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := account_from(tok); g text := duel_guard(me); d duels;
begin
  if g is not null then return json_build_object('error', g); end if;
  select * into d from duels where duels.id = duel_answer_invite.id for update;
  if not found or d.b <> me or d.status <> 'invited' then return json_build_object('error', 'gone'); end if;
  if now() > d.expires_at then
    update duels set status = 'expired' where duels.id = d.id;
    return json_build_object('error', 'gone');
  end if;
  -- still friends, no block, sender still allowed in (a block or unfriend since the invite)
  if friends_blocked(d.a, d.b) or duel_guard(d.a) is not null
     or not exists (select 1 from friendships where a = least(d.a, d.b) and b = greatest(d.a, d.b) and status = 'accepted') then
    update duels set status = 'cancelled' where duels.id = d.id;
    return json_build_object('error', 'gone');
  end if;
  if not coalesce(accept, false) then
    update duels set status = 'declined', finished_at = now() where duels.id = d.id;
    perform duel_hint((select inbox from accounts where accounts.id = d.a), 'invite_answer', jsonb_build_object('id', d.id));
    return json_build_object('status', 'declined');
  end if;
  update duels set status = 'accepted', accepted_at = now() where duels.id = d.id;
  perform duel_hint((select inbox from accounts where accounts.id = d.a), 'invite_answer', jsonb_build_object('id', d.id));
  return json_build_object('status', 'accepted');
end $$;

-- ── questions (edge function duel-start) ────────────────────────────────────
-- the invitee's duel-start call takes the accepted duel, once: grades + subject + seed
create or replace function public.duel_claim_start(tok text, id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := account_from(tok); g text := duel_guard(me); d duels; s int;
begin
  if g is not null then return json_build_object('error', g); end if;
  perform duel_finish_if_due(duel_claim_start.id);                    -- too late → failed
  select * into d from duels where duels.id = duel_claim_start.id for update;
  if not found or d.b <> me or d.status <> 'accepted' or d.claimed_at is not null then
    return json_build_object('error', 'gone');
  end if;
  s := floor(random() * 2147483647)::int;
  update duels set claimed_at = now(), seed = s where duels.id = d.id;
  return json_build_object(
    'grade_a', (select grade::int from accounts where accounts.id = d.a),
    'grade_b', (select grade::int from accounts where accounts.id = d.b),
    'subject', d.subject, 'seed', s);
end $$;

-- the edge function writes the 15 questions (rows = buildDuel() output, in order).
-- secret = Vault 'duel_secret'; no such secret → everything is refused.
-- "answer", "tol" and "meta" are kept out of the visible payload; a row that
-- would still show one of them is refused.
create or replace function public.duel_put_questions(secret text, id uuid, rows jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare v text; d duels; e jsonb; i int; vis jsonb; k text; ans text;
begin
  begin
    select decrypted_secret into v from vault.decrypted_secrets where name = 'duel_secret' order by created_at desc limit 1;
  exception when others then v := null;
  end;
  if v is null or v = '' or secret is null or secret <> v then return json_build_object('error', 'secret'); end if;

  perform duel_finish_if_due(duel_put_questions.id);                  -- too late → failed
  select * into d from duels where duels.id = duel_put_questions.id for update;
  if not found or d.status <> 'accepted' or d.claimed_at is null then return json_build_object('error', 'gone'); end if;

  if rows is null or jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) <> 15 then
    return json_build_object('error', 'rows');
  end if;
  for e, i in select x, (o - 1)::int from jsonb_array_elements(rows) with ordinality t(x, o) loop
    if jsonb_typeof(e) <> 'object' then return json_build_object('error', 'rows'); end if;
    k := e->>'kind'; ans := e->>'answer';
    if k is null or k not in ('choice', 'number') or ans is null or ans = '' then return json_build_object('error', 'rows'); end if;
    if k = 'choice' and (ans !~ '^[0-3]$' or jsonb_typeof(e->'choices') is distinct from 'array'
                         or jsonb_array_length(e->'choices') <> 4) then
      return json_build_object('error', 'rows');
    end if;
    if k = 'number' and duel_parse_num(ans) is null then return json_build_object('error', 'rows'); end if;
    if e ? 'tol' and jsonb_typeof(e->'tol') <> 'null' and (jsonb_typeof(e->'tol') <> 'number' or (e->>'tol')::numeric < 0) then
      return json_build_object('error', 'rows');
    end if;
    vis := e - 'answer' - 'tol' - 'meta' - 'idx' - 'kind' - 'gen';
    if vis::text ~ '"(answer|tol|meta)": ' then return json_build_object('error', 'rows'); end if;
  end loop;

  insert into duel_questions (duel_id, idx, gen, topic, chapter, kind, payload, answer, tol)
  select d.id, (o - 1)::smallint, x->>'gen', x->>'topic', x->>'chapter', x->>'kind',
         x - 'answer' - 'tol' - 'meta' - 'idx' - 'kind' - 'gen', x->>'answer',
         case when jsonb_typeof(x->'tol') = 'number' then (x->>'tol')::numeric end
    from jsonb_array_elements(rows) with ordinality t(x, o);
  update duels set status = 'live', start_at = now() + interval '4 seconds', ends_at = now() + interval '304 seconds'
   where duels.id = d.id
   returning * into d;
  perform duel_hint(d.channel, 'duel_start', jsonb_build_object('id', d.id));
  return json_build_object('ok', true, 'start_at', d.start_at, 'ends_at', d.ends_at);
end $$;

-- ── playing ─────────────────────────────────────────────────────────────────
-- one answer per question, in order. Errors: not_live, order, locked (2 s after
-- a wrong answer), time (after ends_at + 2 s). Points per Global Constraints:
-- right = round((100 + max(0, round(50 − 4·s))) × streak mult × (last ? 2 : 1)),
-- mult 1.2 at streak 3–4, 1.5 at 5+; wrong = 0 and the streak resets.
create or replace function public.duel_answer(tok text, id uuid, idx int, given text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := account_from(tok); g text := duel_guard(me); d duels; q duel_questions;
  n int; prev duel_answers; ok boolean; ms int; st int; pts int; sc int;
begin
  if g is not null then return json_build_object('error', g); end if;
  select * into d from duels where duels.id = duel_answer.id for update;      -- one answer at a time per duel
  if not found or me not in (d.a, d.b) then return json_build_object('error', 'gone'); end if;
  if d.status <> 'live' or now() < d.start_at then return json_build_object('error', 'not_live'); end if;
  if now() > d.ends_at + interval '2 seconds' then
    perform duel_close(d.id);
    return json_build_object('error', 'time');
  end if;
  select count(*) into n from duel_answers where duel_id = d.id and uid = me;
  if duel_answer.idx is null or duel_answer.idx <> n or n >= 15 then return json_build_object('error', 'order'); end if;
  select * into prev from duel_answers where duel_id = d.id and uid = me and duel_answers.idx = n - 1;
  if prev.correct = false and now() < prev.at + interval '2 seconds' then return json_build_object('error', 'locked'); end if;

  select * into q from duel_questions where duel_id = d.id and duel_questions.idx = n;
  if not found then return json_build_object('error', 'not_live'); end if;
  ok := duel_check(q.kind, q.answer, q.tol, given);
  ms := greatest(0, round(extract(epoch from now() - coalesce(prev.at, d.start_at)) * 1000))::int;
  st := case when ok then coalesce(prev.streak, 0) + 1 else 0 end;
  pts := case when ok then
           round((100 + greatest(0, round(50 - 4 * ms / 1000.0)))
                 * (case when st >= 5 then 1.5 when st >= 3 then 1.2 else 1 end)
                 * (case when n = 14 then 2 else 1 end))::int
         else 0 end;
  insert into duel_answers (duel_id, uid, idx, given, correct, points, ms, streak)
  values (d.id, me, n, left(given, 40), ok, pts, ms, st);
  if me = d.a then
    update duels set a_score = a_score + pts, a_ok = a_ok + ok::int,
                     a_done_at = case when n = 14 then now() else a_done_at end
     where duels.id = d.id returning a_score into sc;
  else
    update duels set b_score = b_score + pts, b_ok = b_ok + ok::int,
                     b_done_at = case when n = 14 then now() else b_done_at end
     where duels.id = d.id returning b_score into sc;
  end if;
  perform duel_hint(d.channel, 'opp_answer', jsonb_build_object('uid', me, 'idx', n));
  if (select count(*) from duel_answers where duel_id = d.id) >= 30 then perform duel_close(d.id); end if;
  return json_build_object('correct', ok, 'right', q.answer, 'points', pts, 'score', sc, 'streak', st,
                           'lock_until', case when ok then null else now() + interval '2 seconds' end);
end $$;

-- give up: the duel ends now as a loss for me (no XP for me)
create or replace function public.duel_give_up(tok text, id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := account_from(tok); g text := duel_guard(me); d duels; s text;
begin
  if g is not null then return json_build_object('error', g); end if;
  s := duel_finish_if_due(duel_give_up.id);
  select * into d from duels where duels.id = duel_give_up.id for update;
  if not found or me not in (d.a, d.b) then return json_build_object('error', 'gone'); end if;
  if d.status = 'accepted' then                                      -- questions not there yet: just call it off
    update duels set status = 'cancelled', finished_at = now() where duels.id = d.id;
    perform duel_hint(d.channel, 'duel_end', jsonb_build_object('id', d.id));
    return json_build_object('ok', true);
  end if;
  if d.status <> 'live' then return json_build_object('error', 'not_live'); end if;
  perform duel_close(d.id, me);
  return json_build_object('ok', true);
end $$;

-- a preset emote after the end (gg | wow | again), at most 3 per player per duel
create or replace function public.duel_emote(tok text, id uuid, emote text)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := account_from(tok); g text := duel_guard(me); d duels;
begin
  if g is not null then return json_build_object('error', g); end if;
  if emote is null or emote not in ('gg', 'wow', 'again') then return json_build_object('error', 'emote'); end if;
  select * into d from duels where duels.id = duel_emote.id for update;
  if not found or me not in (d.a, d.b) then return json_build_object('error', 'gone'); end if;
  if d.status <> 'done' then return json_build_object('error', 'not_done'); end if;
  if (select count(*) from duel_emotes e where e.duel_id = d.id and e.uid = me) >= 3 then
    return json_build_object('error', 'limit');
  end if;
  insert into duel_emotes (duel_id, uid, emote) values (d.id, me, duel_emote.emote);
  perform duel_hint(d.channel, 'emote', jsonb_build_object('uid', me, 'emote', duel_emote.emote));
  return json_build_object('ok', true);
end $$;

-- ── reading ─────────────────────────────────────────────────────────────────
-- one player's progress in a duel (mine = with streak + lock, theirs = with lanes)
create or replace function public.duel_player(d uuid, u uuid, mine boolean)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare acc accounts; n int; sc int; ok int; last duel_answers; r jsonb;
begin
  select * into acc from accounts where id = u;
  select count(*), coalesce(sum(points), 0), count(*) filter (where correct)
    into n, sc, ok from duel_answers where duel_id = d and uid = u;
  r := jsonb_build_object('id', u, 'username', acc.username, 'avatar', acc.avatar, 'level', duel_level(u),
                          'score', sc, 'ok', ok, 'idx', n, 'done', n >= 15);
  if mine then
    select * into last from duel_answers where duel_id = d and uid = u and idx = n - 1;
    r := r || jsonb_build_object('streak', coalesce(last.streak, 0),
                                 'lock_until', case when last.correct = false and last.at + interval '2 seconds' > now()
                                                    then last.at + interval '2 seconds' end);
  else
    r := r || jsonb_build_object('lanes', duel_lanes(d, u));
  end if;
  return r;
end $$;

-- everything the duel screen needs; the answers of the questions are never in it
create or replace function public.duel_state(tok text, id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := account_from(tok); g text := duel_guard(me); d duels; opp uuid; r jsonb;
begin
  if g is not null then return json_build_object('error', g); end if;
  select * into d from duels where duels.id = duel_state.id;
  if not found or me not in (d.a, d.b) then return json_build_object('error', 'gone'); end if;
  perform duel_finish_if_due(d.id);
  select * into d from duels where duels.id = duel_state.id;
  opp := case when me = d.a then d.b else d.a end;
  r := jsonb_build_object(
    'id', d.id, 'now', now(), 'status', d.status, 'subject', d.subject, 'i_invited', me = d.a,
    'created_at', d.created_at, 'expires_at', d.expires_at, 'accepted_at', d.accepted_at,
    'start_at', d.start_at, 'ends_at', d.ends_at, 'channel', d.channel,
    'me', duel_player(d.id, me, true),
    'opp', duel_player(d.id, opp, false),
    'my_lanes', duel_lanes(d.id, me),
    'questions', case when d.status in ('live', 'done') then
        coalesce((select jsonb_agg(jsonb_build_object('idx', q.idx, 'kind', q.kind, 'payload', q.payload) order by q.idx)
                    from duel_questions q where q.duel_id = d.id), '[]'::jsonb)
      else '[]'::jsonb end,
    'emotes', coalesce((select jsonb_agg(jsonb_build_object('uid', e.uid, 'emote', e.emote) order by e.at, e.id)
                          from duel_emotes e where e.duel_id = d.id), '[]'::jsonb));
  if d.status = 'done' then
    r := r || jsonb_build_object('result', jsonb_build_object(
      'winner', d.winner, 'draw', d.draw,
      'xp_me', case when me = d.a then d.xp_a else d.xp_b end,
      'comeback_by', d.comeback_by, 'gave_up', d.gave_up,
      -- what to review: every question I missed or didn't reach, with the right answer
      'review', coalesce((select jsonb_agg(jsonb_build_object('idx', q.idx, 'payload', q.payload, 'right', q.answer, 'given', a.given) order by q.idx)
                            from duel_questions q
                            left join duel_answers a on a.duel_id = q.duel_id and a.uid = me and a.idx = q.idx
                           where q.duel_id = d.id and coalesce(a.correct, false) = false), '[]'::jsonb)));
  end if;
  return r::json;
end $$;

-- my record + the last 10 finished duels
create or replace function public.duel_history(tok text)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := account_from(tok); g text := duel_guard(me);
begin
  if g is not null then return json_build_object('error', g); end if;
  return json_build_object(
    'stats', (select json_build_object(
                'played', count(*),
                'wins', count(*) filter (where winner = me),
                'losses', count(*) filter (where winner is not null and winner <> me),
                'draws', count(*) filter (where draw),
                'perfect', count(*) filter (where (a = me and a_ok = 15) or (b = me and b_ok = 15)),
                'comebacks', count(*) filter (where comeback_by = me),
                'duel_xp', (select duel_xp from accounts where id = me))
                from duels where (a = me or b = me) and status = 'done'),
    'recent', coalesce((select json_agg(x order by x.at desc) from (
        select d.id, json_build_object('username', o.username, 'avatar', o.avatar) as opp, d.subject,
               case when d.a = me then d.a_score else d.b_score end as my,
               case when d.a = me then d.b_score else d.a_score end as their,
               case when d.draw then 'draw' when d.winner = me then 'win' else 'loss' end as result,
               d.finished_at as at
          from duels d join accounts o on o.id = case when d.a = me then d.b else d.a end
         where (d.a = me or d.b = me) and d.status = 'done'
         order by d.finished_at desc
         limit 10) x), '[]'));
end $$;

-- ── presence (replaces the Task 1 stub) ─────────────────────────────────────
-- heartbeat every ~20 s: marks me online, moves my stale duels on, returns my
-- pending invites (fallback when realtime is off) and my accepted/live duel
create or replace function public.presence_ping(tok text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok); g text := duel_guard(uid);
begin
  if g is not null then return json_build_object('error', g); end if;
  update accounts set online_at = now() where id = uid;
  perform duel_tidy(uid);
  return json_build_object(
    'now', now(),
    'invites', coalesce((select json_agg(x order by x.expires_at) from (
        select d.id, json_build_object('id', o.id, 'username', o.username, 'avatar', o.avatar) as "from",
               d.subject, d.expires_at, json_build_array(duel_wins(uid, d.a), duel_wins(d.a, uid)) as h2h
          from duels d join accounts o on o.id = d.a
         where d.b = uid and d.status = 'invited' and d.expires_at > now()
           and not friends_blocked(uid, d.a) and duel_guard(d.a) is null
           and exists (select 1 from friendships f where f.a = least(uid, d.a) and f.b = greatest(uid, d.a) and f.status = 'accepted')) x), '[]'),
    'live', (select d.id from duels d where (d.a = uid or d.b = uid) and d.status in ('accepted', 'live')
              order by d.created_at desc limit 1));
end $$;

-- ── friends: head-to-head + Task 1 follow-ups ───────────────────────────────
-- same as Task 1, plus: wins/losses from finished duels; a request from someone
-- I blocked (left behind by a block racing a request) never shows
create or replace function public.friends_me(tok text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok); g text := duel_guard(uid);
begin
  if g is not null then return json_build_object('error', g); end if;
  return json_build_object(
    'status', duel_switch(),
    'code', (select friend_code from accounts where id = uid),
    'inbox', (select inbox from accounts where id = uid),
    'friends', coalesce((select json_agg(x order by x.online desc, lower(x.username)) from (
        select o.id, o.username, o.avatar, o.grade, duel_level(o.id) as level,
               coalesce(o.online_at > now() - interval '70 seconds', false) as online,
               case when o.online_at is null then null else floor(extract(epoch from now() - o.online_at))::int end as seen_ago_s,
               duel_wins(uid, o.id) as wins, duel_wins(o.id, uid) as losses
          from friendships f join accounts o on o.id = case when f.a = uid then f.b else f.a end
         where (f.a = uid or f.b = uid) and f.status = 'accepted') x), '[]'),
    -- only real requests ('pending'); a 'shadow', or anything from someone I blocked, never shows here
    'incoming', coalesce((select json_agg(x order by x.created_at desc) from (
        select o.id, o.username, o.avatar, f.created_at
          from friendships f join accounts o on o.id = f.requested_by
         where (f.a = uid or f.b = uid) and f.status = 'pending' and f.requested_by <> uid
           and not exists (select 1 from blocks bl where bl.blocker = uid and bl.blocked = f.requested_by)) x), '[]'),
    -- my requests; a 'shadow' (the other side blocked me) looks exactly like a pending one
    'outgoing', coalesce((select json_agg(x order by x.created_at desc) from (
        select o.id, o.username, o.avatar, f.created_at
          from friendships f join accounts o on o.id = case when f.a = uid then f.b else f.a end
         where (f.a = uid or f.b = uid) and f.status in ('pending', 'shadow') and f.requested_by = uid) x), '[]'),
    'blocked', coalesce((select json_agg(x order by lower(x.username)) from (
        select o.id, o.username, o.avatar
          from blocks bl join accounts o on o.id = bl.blocked
         where bl.blocker = uid) x), '[]')
  );
end $$;

-- same as Task 1, plus: my own old shadow request (they blocked me, then
-- unblocked) becomes a real request when I add them again
create or replace function public.friend_add(tok text, code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := account_from(tok); g text := duel_guard(me);
  c text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  other uuid; f friendships;
begin
  if g is not null then return json_build_object('error', g); end if;
  perform pg_advisory_xact_lock(hashtext('friend:' || me::text));   -- one add/answer at a time per student (double taps)
  if (select count(*) from friend_sends s where s.uid = me and s.miss and s.at > now() - interval '1 day') >= 30 then
    return json_build_object('error', 'limit_day');
  end if;
  select id into other from accounts where friend_code = c;
  -- outside the release (e.g. a non-tester while testing) a code counts as unknown
  if other is null or (other <> me and duel_guard(other) is not null) then
    insert into friend_sends (uid, miss) values (me, true);
    return json_build_object('error', 'no_code');
  end if;
  if other = me then return json_build_object('error', 'self'); end if;
  -- I blocked them: I already know, so say so (unblock first)
  if exists (select 1 from blocks where blocker = me and blocked = other) then
    return json_build_object('error', 'you_blocked');
  end if;

  select * into f from friendships where a = least(me, other) and b = greatest(me, other);
  if f.status = 'accepted' then return json_build_object('ok', true, 'state', 'already'); end if;
  if f.status = 'pending' and f.requested_by = other then           -- they asked me first: accept
    if friends_count(me) >= 100 or friends_count(other) >= 100 then return json_build_object('error', 'limit_friends'); end if;
    update friendships set status = 'accepted', accepted_at = now() where a = f.a and b = f.b;
    return json_build_object('ok', true, 'state', 'accepted');
  end if;

  -- the "send" step: the same checks and the same answer whether or not they blocked me
  if friends_count(me) >= 100 then return json_build_object('error', 'limit_friends'); end if;
  if (select count(*) from friend_sends s where s.uid = me and not s.miss and s.at > now() - interval '1 day') >= 20 then
    return json_build_object('error', 'limit_day');
  end if;
  insert into friend_sends (uid) values (me);
  delete from friend_sends where at < now() - interval '2 days';
  if exists (select 1 from blocks where blocker = other and blocked = me) then
    -- they blocked me: a shadow request only I can see (never reveal a block)
    insert into friendships (a, b, status, requested_by) values (least(me, other), greatest(me, other), 'shadow', me)
    on conflict (a, b) do nothing;
    return json_build_object('ok', true, 'state', 'sent');
  end if;
  if f.status = 'shadow' and f.requested_by = other then
    -- an old shadow from them (I have since unblocked): my real request replaces it
    update friendships set status = 'pending', requested_by = me, created_at = now() where a = f.a and b = f.b;
    return json_build_object('ok', true, 'state', 'sent');
  end if;
  if f.status = 'shadow' and f.requested_by = me then
    -- my own shadow, and they no longer block me: it becomes a real request
    update friendships set status = 'pending', created_at = now() where a = f.a and b = f.b;
    return json_build_object('ok', true, 'state', 'sent');
  end if;
  insert into friendships (a, b, status, requested_by) values (least(me, other), greatest(me, other), 'pending', me)
  on conflict (a, b) do nothing;                                     -- my request is already waiting: still "sent"
  return json_build_object('ok', true, 'state', 'sent');
end $$;

-- same as Task 1, plus: a request from someone I blocked is gone
create or replace function public.friend_answer(tok text, other uuid, accept boolean)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok); g text := duel_guard(uid);
begin
  if g is not null then return json_build_object('error', g); end if;
  perform pg_advisory_xact_lock(hashtext('friend:' || uid::text));  -- one add/answer at a time per student (double taps)
  if not exists (select 1 from friendships where a = least(uid, other) and b = greatest(uid, other)
                  and status = 'pending' and requested_by = other)
     or exists (select 1 from blocks where blocker = uid and blocked = other) then
    return json_build_object('error', 'gone');
  end if;
  if coalesce(accept, false) then
    if friends_count(uid) >= 100 or friends_count(other) >= 100 then return json_build_object('error', 'limit_friends'); end if;
    update friendships set status = 'accepted', accepted_at = now() where a = least(uid, other) and b = greatest(uid, other);
    return json_build_object('ok', true, 'state', 'accepted');
  end if;
  delete from friendships where a = least(uid, other) and b = greatest(uid, other);
  return json_build_object('ok', true, 'state', 'declined');
end $$;

-- ── who may call what ───────────────────────────────────────────────────────
-- internal helpers: not callable from the site
revoke execute on function public.duel_parse_num(text), public.duel_check(text, text, numeric, text),
  public.duel_hint(text, text, jsonb), public.duel_wins(uuid, uuid), public.duel_lanes(uuid, uuid),
  public.duel_xp_award(uuid, uuid, int), public.duel_close(uuid, uuid), public.duel_finish_if_due(uuid),
  public.duel_tidy(uuid), public.duel_player(uuid, uuid, boolean)
  from public, anon, authenticated;
-- public entry points (each checks the session token — or the Vault secret — and the switch)
revoke execute on function public.duel_invite(text, uuid, text), public.duel_cancel(text, uuid),
  public.duel_answer_invite(text, uuid, boolean), public.duel_claim_start(text, uuid),
  public.duel_put_questions(text, uuid, jsonb), public.duel_answer(text, uuid, int, text),
  public.duel_give_up(text, uuid), public.duel_emote(text, uuid, text), public.duel_state(text, uuid),
  public.duel_history(text) from public;
grant execute on function public.duel_invite(text, uuid, text), public.duel_cancel(text, uuid),
  public.duel_answer_invite(text, uuid, boolean), public.duel_claim_start(text, uuid),
  public.duel_put_questions(text, uuid, jsonb), public.duel_answer(text, uuid, int, text),
  public.duel_give_up(text, uuid), public.duel_emote(text, uuid, text), public.duel_state(text, uuid),
  public.duel_history(text) to anon, authenticated, service_role;
