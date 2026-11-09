-- ============================================================================
-- Duels: the final fix wave before students (2026-11-09).
-- Every function below is redefined from its LATEST definition; only the lines
-- marked "final wave" change. Grants stay as they were (create or replace keeps
-- them); new functions get their grants at the end.
-- ----------------------------------------------------------------------------
--  * Per-account duel ban (F3): accounts.duel_banned. duel_guard says 'off' to a
--    banned student (neutral: the same answer as a closed switch), so friends,
--    invites, presence and the duel itself are shut for them. Admin sets it with
--    admin_set_duel_ban (Students → a student, or a report row); a ban closes
--    that student's open duels at once (duel_shut).
--  * Switch to 'off' closes every open duel (F4): invited/accepted → cancelled,
--    live → done through the normal close path (duel_close: scores, winner, XP
--    as usual). Nothing is left frozen.
--  * duel_state hides question 0 until start_at (F5): no peeking during the
--    3-2-1 face-off.
--  * Daily XP cap (F7): only duels where THIS player earned XP (> 0) use up one
--    of the 5 slots of the day.
--  * friend_report (F8): a duel id is kept only when the reporter played it.
--  * Levels frozen at the start (F10): duel_put_questions stores both players'
--    levels on the duel; duel_player reads them instead of recomputing the level
--    from all practice events on every duel_state call.
--  * friends_me (F18): "last seen" is a coarse bucket — online / today / week /
--    long — never exact seconds.
--  * Catalog hygiene (F9, found by supabase/tests/duels_catalog.test.sql): the two
--    validation helpers are internal only; the public content tables keep SELECT
--    and nothing else (no TRUNCATE / TRIGGER / REFERENCES for the public roles);
--    the public roles hold no sequence rights.
-- ============================================================================

-- ── columns ─────────────────────────────────────────────────────────────────
alter table public.accounts
  add column if not exists duel_banned boolean not null default false;

alter table public.duels
  add column if not exists a_level int,     -- final wave: levels frozen when the duel goes live
  add column if not exists b_level int;

-- ── the guard: a banned account is shut out like a closed switch ────────────
-- null = allowed; 'off' = this account can't use friends/duels right now
create or replace function public.duel_guard(uid uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare s text := duel_switch();
begin
  -- final wave: a duel ban answers exactly like the switch being off (never revealed)
  if exists (select 1 from accounts where id = uid and duel_banned) then return 'off'; end if;
  if s = 'on' then return null; end if;
  if s = 'test' and exists (select 1 from accounts where id = uid and duel_tester) then return null; end if;
  return 'off';
end $$;

-- ── close open duels (switch off / a ban) ───────────────────────────────────
-- only_uid null = every open duel; else only that student's. Returns how many.
-- Duel rows are taken one at a time in id order, accounts after (duel_close):
-- the usual lock order.
create or replace function public.duel_shut(only_uid uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare r record; d duels; n int := 0;
begin
  for r in select x.id from duels x
            where x.status in ('invited', 'accepted', 'live')
              and (only_uid is null or x.a = only_uid or x.b = only_uid)
            order by x.id loop
    select * into d from duels where duels.id = r.id for update;
    if d.status in ('invited', 'accepted') then
      update duels set status = 'cancelled' where duels.id = d.id;
      if d.status = 'invited' then
        perform duel_hint((select inbox from accounts where accounts.id = d.b), 'invite_cancelled', jsonb_build_object('id', d.id));
      end if;
      perform duel_hint((select inbox from accounts where accounts.id = d.a), 'invite_answer', jsonb_build_object('id', d.id));
      perform duel_hint(d.channel, 'duel_end', jsonb_build_object('id', d.id));
      n := n + 1;
    elsif d.status = 'live' then
      perform duel_close(d.id);              -- scores, winner, XP as usual; sends duel_end
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ── admin: the switch (latest: 20261108100000_duels_friends.sql) ────────────
create or replace function public.admin_set_setting(tok uuid, k text, v jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare closed int := 0;
begin
  perform admin_guard(tok);
  if k not in ('keypad', 'duels') then return json_build_object('error', 'unknown'); end if;
  if k = 'duels' and (jsonb_typeof(v) is distinct from 'string' or v #>> '{}' not in ('off', 'test', 'on')) then
    return json_build_object('error', 'value');
  end if;
  insert into site_settings (key, value, updated_at) values (k, v, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  -- final wave: switching duels off closes every open duel, so nothing freezes
  if k = 'duels' and v #>> '{}' = 'off' then closed := duel_shut(null); end if;
  return json_build_object('ok', true, 'key', k, 'value', v, 'closed', closed);
end $$;

-- ── admin: ban / unban one student from duels (final wave) ──────────────────
create or replace function public.admin_set_duel_ban(tok uuid, account uuid, banned boolean)
returns json language plpgsql security definer set search_path = public as $$
declare closed int := 0;
begin
  perform admin_guard(tok);
  update accounts set duel_banned = coalesce($3, false) where id = $2;
  if not found then return json_build_object('error', 'no_user'); end if;
  if coalesce($3, false) then closed := duel_shut($2); end if;
  return json_build_object('ok', true, 'id', $2, 'banned', coalesce($3, false), 'closed', closed);
end $$;

-- ── admin: student detail (latest: 20261108130000_duels_admin.sql) ──────────
-- final wave: account.duel_banned and duel.banned
create or replace function public.admin_student(tok uuid, account_id uuid default null, device text default null, days int default 30)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := admin_student.account_id;
  dev text := admin_student.device;
  t0 timestamptz := now() - make_interval(days => greatest(1, least(days, 365)));
  r json;
begin
  perform admin_guard(tok);
  if uid is null and dev is null then return json_build_object('error', 'missing'); end if;
  with ev as (
    select e.* from events e
    where (uid is not null and e.account_id = uid)
       or (uid is null and e.device = dev and e.account_id is null)
  )
  select json_build_object(
    'account', (select json_build_object('id', a.id, 'username', a.username, 'grade', a.grade, 'avatar', a.avatar,
                                         'joined', a.created_at, 'last_seen', a.last_seen,
                                         'duel_tester', a.duel_tester, 'duel_banned', a.duel_banned)
                from accounts a where a.id = uid),
    'duel', case when uid is null then null else (select json_build_object(
                 'tester', (select a.duel_tester from accounts a where a.id = uid),
                 'banned', (select a.duel_banned from accounts a where a.id = uid),
                 'xp', coalesce((select a.duel_xp from accounts a where a.id = uid), 0),
                 'played', count(*),
                 'wins', count(*) filter (where d.winner = uid),
                 'losses', count(*) filter (where d.winner is not null and d.winner <> uid),
                 'draws', count(*) filter (where d.draw),
                 'last', max(d.finished_at),
                 'reported', (select count(*) from reports r where r.reported = uid),
                 'reported_open', (select count(*) from reports r where r.reported = uid and not r.done))
               from duels d where (d.a = uid or d.b = uid) and d.status = 'done') end,
    'device', dev,
    'devices', (select count(distinct ev.device) from ev),
    'mobile', (select bool_or(ev.mobile) from ev),
    'first_seen', (select min(ev.at) from ev),
    'last_seen', (select max(ev.at) from ev),
    'totals', (select json_build_object(
                 'ok', count(*) filter (where kind = 'ok'), 'bad', count(*) filter (where kind = 'bad'),
                 'win', count(*) filter (where kind = 'win'),
                 'days', count(distinct (at at time zone 'Asia/Jerusalem')::date) filter (where kind <> 'view'))
               from ev),
    'topics', coalesce((select json_agg(t order by t.last desc) from (
                 select page, count(*) filter (where kind = 'ok') as ok, count(*) filter (where kind = 'bad') as bad,
                        count(*) filter (where kind = 'win') as win, max(at) as last
                 from ev group by page) t), '[]'),
    'chapters', coalesce((select json_agg(c order by c.last desc) from (
                 select page, chapter, count(*) filter (where kind = 'ok') as ok, count(*) filter (where kind = 'bad') as bad,
                        count(*) filter (where kind = 'win') as win, max(at) as last
                 from ev where chapter is not null and kind <> 'view' group by page, chapter) c), '[]'),
    'daily', coalesce((select json_agg(d order by d.day) from (
                 select (at at time zone 'Asia/Jerusalem')::date as day,
                        count(*) filter (where kind = 'ok') as ok, count(*) filter (where kind = 'bad') as bad,
                        count(*) filter (where kind = 'win') as win
                 from ev where at >= t0 group by 1) d), '[]'),
    'recent', coalesce((select json_agg(z) from (
                 select at, page, chapter, step, kind, mobile from ev
                 where kind <> 'view' order by at desc limit 60) z), '[]')
  ) into r;
  return r;
end $$;

-- ── admin: reports (latest: 20261108100000_duels_friends.sql) ───────────────
-- final wave: reported_banned (the report row offers "block from duels")
create or replace function public.admin_reports(tok uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return coalesce((select json_agg(x order by x.done, x.created_at desc) from (
    select r.id, r.reason, r.duel_id, r.created_at, r.done,
           r.reporter as reporter_id, ra.username as reporter,
           r.reported as reported_id, rb.username as reported,
           coalesce(rb.duel_banned, false) as reported_banned,
           (select count(*) from reports r2 where r2.reported = r.reported) as reported_total
      from reports r
      left join accounts ra on ra.id = r.reporter
      left join accounts rb on rb.id = r.reported
     order by r.done, r.created_at desc
     limit 300) x), '[]');
end $$;

-- ── XP (latest: 20261108110000_duels_core.sql) ──────────────────────────────
-- XP for one player at the end of a duel: only the first 5 finished duels of
-- the (Israeli) day of `at` (the duel's end) that EARNED this player XP count
-- (final wave: a duel where they got 0 doesn't use up a slot). Adds it to
-- accounts.duel_xp and returns it.
create or replace function public.duel_xp_award(u uuid, d uuid, base int, at timestamptz)
returns int language plpgsql security definer set search_path = public as $$
begin
  if coalesce(base, 0) <= 0 then return 0; end if;
  if (select count(*) from duels
       where (a = u or b = u) and status = 'done' and id <> d
         and (case when a = u then xp_a else xp_b end) > 0
         and (finished_at at time zone 'Asia/Jerusalem')::date = (at at time zone 'Asia/Jerusalem')::date) >= 5 then
    return 0;
  end if;
  update accounts set duel_xp = duel_xp + base where id = u;
  return base;
end $$;

-- ── report (latest: 20261108100000_duels_friends.sql) ───────────────────────
-- report someone to the admin (fixed reasons only); 20 reports a day per reporter.
-- final wave: the duel id is kept only when the reporter played that duel.
create or replace function public.friend_report(tok text, other uuid, reason text, duel uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok); g text := duel_guard(uid); did uuid := friend_report.duel;
begin
  if g is not null then return json_build_object('error', g); end if;
  if reason is null or reason not in ('name', 'spam', 'other') then return json_build_object('error', 'reason'); end if;
  if other is null or other = uid then return json_build_object('error', 'self'); end if;
  if not exists (select 1 from accounts where id = other) then return json_build_object('error', 'no_user'); end if;
  if (select count(*) from reports r where r.reporter = uid and r.created_at > now() - interval '1 day') >= 20 then
    return json_build_object('error', 'limit_day');
  end if;
  if did is not null and not exists (select 1 from duels x where x.id = did and uid in (x.a, x.b)) then did := null; end if;
  insert into reports (reporter, reported, reason, duel_id) values (uid, other, reason, did);
  return json_build_object('ok', true);
end $$;

-- ── questions (latest: 20261108110000_duels_core.sql) ───────────────────────
-- the edge function writes the 15 questions (rows = buildDuel() output, in order).
-- secret = Vault 'duel_secret'; no such secret → everything is refused.
-- "answer", "tol" and "meta" are kept out of the visible payload; a row that
-- would still show one of them is refused.
-- final wave: both players' levels are stored on the duel as it goes live.
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
  update duels set status = 'live', start_at = now() + interval '4 seconds', ends_at = now() + interval '304 seconds',
                   a_level = duel_level(d.a), b_level = duel_level(d.b)          -- final wave
   where duels.id = d.id
   returning * into d;
  perform duel_hint(d.channel, 'duel_start', jsonb_build_object('id', d.id));
  return json_build_object('ok', true, 'start_at', d.start_at, 'ends_at', d.ends_at);
end $$;

-- ── one player on the duel screen (latest: 20261108110000_duels_core.sql) ───
-- final wave: the level comes from the duel row (frozen at the start); a duel
-- from before this migration falls back to computing it.
create or replace function public.duel_player(d uuid, u uuid, mine boolean)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare acc accounts; n int; sc int; ok int; last duel_answers; r jsonb; lv int;
begin
  select * into acc from accounts where id = u;
  select case when u = x.a then x.a_level when u = x.b then x.b_level end into lv from duels x where x.id = d;
  select count(*), coalesce(sum(points), 0), count(*) filter (where correct)
    into n, sc, ok from duel_answers where duel_id = d and uid = u;
  r := jsonb_build_object('id', u, 'username', acc.username, 'avatar', acc.avatar, 'level', coalesce(lv, duel_level(u)),
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

-- ── the duel screen (latest: 20261109100000_duels_result_facts.sql) ─────────
-- final wave: live questions only from start_at on (nothing during the face-off)
create or replace function public.duel_state(tok text, id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := duel_uid(tok); g text := duel_guard(me); d duels; opp uuid; r jsonb;
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
    -- live: nothing before start_at (final wave), then only the questions up to my current one (no reading ahead); done: all
    'questions', case when d.status = 'done' or (d.status = 'live' and now() >= d.start_at) then
        coalesce((select jsonb_agg(jsonb_build_object('idx', q.idx, 'kind', q.kind, 'payload', q.payload) order by q.idx)
                    from duel_questions q
                   where q.duel_id = d.id
                     and (d.status = 'done'
                          or q.idx <= (select count(*) from duel_answers da where da.duel_id = d.id and da.uid = me))), '[]'::jsonb)
      else '[]'::jsonb end,
    'emotes', coalesce((select jsonb_agg(jsonb_build_object('uid', e.uid, 'emote', e.emote) order by e.at, e.id)
                          from duel_emotes e where e.duel_id = d.id), '[]'::jsonb));
  if d.status = 'done' then
    r := r || jsonb_build_object('result', jsonb_build_object(
      'winner', d.winner, 'draw', d.draw,
      'xp_me', case when me = d.a then d.xp_a else d.xp_b end,
      'comeback_by', d.comeback_by, 'gave_up', d.gave_up,
      -- my facts for the result screen: best streak and average time per answered question
      'best_streak', (select coalesce(max(a.streak), 0) from duel_answers a where a.duel_id = d.id and a.uid = me),
      'avg_ms', (select round(avg(a.ms))::int from duel_answers a where a.duel_id = d.id and a.uid = me),
      -- what to review: every question I missed or didn't reach, with the right answer
      'review', coalesce((select jsonb_agg(jsonb_build_object('idx', q.idx, 'payload', q.payload, 'right', q.answer, 'given', a.given) order by q.idx)
                            from duel_questions q
                            left join duel_answers a on a.duel_id = q.duel_id and a.uid = me and a.idx = q.idx
                           where q.duel_id = d.id and coalesce(a.correct, false) = false), '[]'::jsonb)));
  end if;
  return r::json;
end $$;

-- ── friends (latest: 20261108110000_duels_core.sql) ─────────────────────────
-- final wave: `seen` = 'online' | 'today' (Israel day) | 'week' | 'long' | null
-- (never visited) instead of the exact seconds since the last ping
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
               case when o.online_at is null then null
                    when o.online_at > now() - interval '70 seconds' then 'online'
                    when (o.online_at at time zone 'Asia/Jerusalem')::date = (now() at time zone 'Asia/Jerusalem')::date then 'today'
                    when o.online_at > now() - interval '7 days' then 'week'
                    else 'long' end as seen,
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

-- ── who may call what ───────────────────────────────────────────────────────
-- internal helper: not callable from the site
revoke execute on function public.duel_shut(uuid) from public, anon, authenticated;
-- admin entry point (checks the PIN session itself)
revoke execute on function public.admin_set_duel_ban(uuid, uuid, boolean) from public;
grant execute on function public.admin_set_duel_ban(uuid, uuid, boolean) to anon, authenticated;
-- F9: the name/password checks are internal (only security-definer functions call them)
revoke execute on function public.account_name_problem(text), public.account_pass_problem(text) from public, anon, authenticated;
-- F9: public content tables: SELECT only (row policies still pick the visible rows)
revoke all on public.grades, public.categories, public.topics, public.plans, public.site_settings from anon, authenticated;
grant select on public.grades, public.categories, public.topics, public.plans, public.site_settings to anon, authenticated;
-- F9: sequences — every insert goes through a security-definer function or an identity
-- column (guest answer stats into events), so the public roles need none of them
revoke all on sequence public.events_id_seq, public.admin_attempts_id_seq, public.fix_items_id_seq, public.fix_comments_id_seq,
  public.contact_messages_id_seq, public.reports_id_seq, public.duel_emotes_id_seq from anon, authenticated;
