-- Duels, task 10: admin (spec §6 reports, §7.6 switch, §10 question samples).
--  * admin_student : unchanged shape, plus account.duel_tester and a `duel` block
--                    (tester, xp, played/wins/losses/draws, last, reports against
--                    this student) — null for guests. Otherwise identical to
--                    20261102100000_admin_students_accounts.sql.
--  * admin_duels   : the overview for admin → Settings / דו-קרב: the switch,
--                    the testers, duels played, live now, open reports.
-- Setting the switch / a tester and the report list live in
-- 20261108100000_duels_friends.sql (admin_set_setting, admin_set_tester,
-- admin_reports, admin_report_done). Every call checks the PIN session (admin_guard).

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
                                         'duel_tester', a.duel_tester)
                from accounts a where a.id = uid),
    'duel', case when uid is null then null else (select json_build_object(
                 'tester', (select a.duel_tester from accounts a where a.id = uid),
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

create or replace function public.admin_duels(tok uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return json_build_object(
    'switch', duel_switch(),
    'testers', coalesce((select json_agg(x order by x.username) from (
                 select a.id, a.username, a.grade, a.avatar, a.last_seen from accounts a where a.duel_tester) x), '[]'),
    'played', (select count(*) from duels where status = 'done'),
    'played_7d', (select count(*) from duels where status = 'done' and finished_at > now() - interval '7 days'),
    'players', (select count(distinct p) from duels, lateral (values (a), (b)) v(p) where status = 'done'),
    'live', (select count(*) from duels where status in ('accepted', 'live')),
    'open_reports', (select count(*) from reports where not done)
  );
end $$;

revoke execute on function public.admin_student(uuid, uuid, text, int), public.admin_duels(uuid) from public;
grant execute on function public.admin_student(uuid, uuid, text, int), public.admin_duels(uuid) to anon, authenticated;
