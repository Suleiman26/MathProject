-- Duels, task 9: account_progress returns the duel XP (spec §5, "Rewards").
-- Duel answers never touch the practice `events`, so the only change here is one
-- more number in `totals`: duel_xp (accounts.duel_xp, written by duel_close).
-- xpOf() in src/lib/progress.js adds it to the practice points — the same sum
-- duel_level() computes in SQL (20261108100000_duels_friends.sql). Keep all three
-- in sync.
-- Otherwise identical to 20261031110000_progress_chapters.sql.
create or replace function public.account_progress(tok text)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := account_from(tok);
  tz constant text := 'Asia/Jerusalem';
  today date := (now() at time zone tz)::date;
  d date; streak int := 0; best int := 0; run int := 0; prev date;
begin
  -- current streak: consecutive days with at least one answer, ending today (or yesterday)
  d := today;
  if not exists (select 1 from events where account_id = uid and kind <> 'view' and (at at time zone tz)::date = d) then d := d - 1; end if;
  while exists (select 1 from events where account_id = uid and kind <> 'view' and (at at time zone tz)::date = d) loop
    streak := streak + 1; d := d - 1;
  end loop;
  -- best streak ever
  for d in select distinct (at at time zone tz)::date from events where account_id = uid and kind <> 'view' order by 1 loop
    if prev is not null and d = prev + 1 then run := run + 1; else run := 1; end if;
    best := greatest(best, run); prev := d;
  end loop;

  return json_build_object(
    'account', account_json(uid),
    'today', today,
    'streak', streak,
    'best_streak', best,
    'totals', (select json_build_object(
        'ok', count(*) filter (where kind = 'ok'), 'bad', count(*) filter (where kind = 'bad'),
        'win', count(*) filter (where kind = 'win'),
        'days', count(distinct (at at time zone tz)::date) filter (where kind <> 'view'),
        'topics', count(distinct page) filter (where kind <> 'view'),
        -- duel XP (task 9): kept on the account, not in events
        'duel_xp', coalesce((select duel_xp from accounts where id = uid), 0))
      from events where account_id = uid),
    'days', coalesce((select json_agg(x order by x.day) from (
        select (at at time zone tz)::date as day,
               count(*) filter (where kind = 'ok') as ok, count(*) filter (where kind = 'bad') as bad,
               count(*) filter (where kind = 'win') as win
          from events where account_id = uid and kind <> 'view' and at > now() - interval '371 days'
         group by 1) x), '[]'),
    'topics', coalesce((select json_agg(x order by x.last desc) from (
        select page,
               count(*) filter (where kind = 'ok') as ok, count(*) filter (where kind = 'bad') as bad,
               count(*) filter (where kind = 'win') as win, max(at) as last,
               count(distinct chapter) filter (where kind <> 'view' and chapter is not null) as chapters
          from events where account_id = uid group by page) x), '[]'),
    'chapters', coalesce((select json_agg(x) from (
        select page, chapter,
               count(*) filter (where kind = 'ok') as ok, count(*) filter (where kind = 'bad') as bad,
               count(*) filter (where kind = 'win') as win, max(at) as last
          from events where account_id = uid and kind <> 'view' and chapter is not null
         group by page, chapter) x), '[]'),
    'recent', coalesce((select json_agg(x order by x.last desc) from (
        select page, chapter, max(at) as last,
               count(*) filter (where kind = 'ok') as ok, count(*) filter (where kind = 'bad') as bad,
               count(*) filter (where kind = 'win') as win
          from events where account_id = uid and kind <> 'view' and at > now() - interval '60 days'
         group by page, chapter order by max(at) desc limit 8) x), '[]')
  );
end $$;

-- ── the home tile: who of my friends is online right now ────────────────────
-- A light call for the "דו-קרב" tile on the signed-in home (src/home/DuelTile.jsx),
-- made once after the page goes idle. friends_me is too heavy for every home load
-- (it works out a level per friend). "Online" = seen in the last 70 s (same as
-- friends_me), and only friends who may duel right now (duel_guard: in "test",
-- testers only). Returns {online, friends, faces:[{username, avatar}] (≤ 3, the most
-- recently seen first)} — only to the friends themselves, like friends_me.
-- Read-only for me: it does not mark me online (presence_ping does that).
-- Switch off / not a tester → {error:'off'}, so the tile and the menu item hide.
create or replace function public.duel_online(tok text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok); g text := duel_guard(uid);
begin
  if g is not null then return json_build_object('error', g); end if;
  return (
    with fr as (
      select o.username, o.avatar, o.online_at,
             coalesce(o.online_at > now() - interval '70 seconds', false) and duel_guard(o.id) is null as on_now
        from friendships f join accounts o on o.id = case when f.a = uid then f.b else f.a end
       where (f.a = uid or f.b = uid) and f.status = 'accepted')
    select json_build_object(
      'online', (select count(*)::int from fr where on_now),
      'friends', (select count(*)::int from fr),
      'faces', coalesce((select json_agg(json_build_object('username', x.username, 'avatar', x.avatar) order by x.online_at desc)
                           from (select * from fr where on_now order by online_at desc limit 3) x), '[]'::json)));
end $$;

revoke execute on function public.duel_online(text) from public;
grant execute on function public.duel_online(text) to anon, authenticated, service_role;
