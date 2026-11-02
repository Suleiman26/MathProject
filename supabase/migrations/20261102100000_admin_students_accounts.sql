-- Admin: see each signed-in student by username (2026-11-02).
--  * admin_students : signed-in students are one row each (all their devices
--                     together), named by username; guests stay one row per
--                     device with a random number. Signed-up students with no
--                     practice in the period still appear (with zeros).
--  * admin_student  : one student's full picture: per topic, per chapter, day
--                     by day, and their latest answers.
--  * admin_stats    : the "latest activity" feed also carries the username.
-- Read-only; every call checks the admin PIN session (admin_guard).

create or replace function public.admin_students(tok uuid, days int default 30)
returns json language plpgsql security definer set search_path = public as $$
declare t0 timestamptz := now() - make_interval(days => days);
begin
  perform admin_guard(tok);
  return coalesce((
    select json_agg(y order by y.last_seen desc nulls last) from (
      select x.*,
             -- a guest device that a signed-in student also used
             case when x.account_id is null then (
               select a2.username from events e2 join accounts a2 on a2.id = e2.account_id
               where e2.device = x.device order by e2.at desc limit 1) end as device_user
      from (
        select e.account_id,
               min(e.device) as device,
               count(distinct e.device) as devices,
               a.username, a.grade, a.avatar, a.created_at as joined,
               min(e.at) as first_seen,
               max(e.at) as last_seen,
               count(distinct (e.at at time zone 'Asia/Jerusalem')::date) as days_active,
               count(*) filter (where e.kind = 'ok')  as ok,
               count(*) filter (where e.kind = 'bad') as bad,
               count(*) filter (where e.kind = 'win') as win,
               bool_or(e.mobile) as mobile,
               mode() within group (order by e.page) as top_page
        from events e left join accounts a on a.id = e.account_id
        where coalesce(e.account_id::text, e.device) in (
          select distinct coalesce(account_id::text, device) from events where at >= t0)
        group by coalesce(e.account_id::text, e.device), e.account_id, a.username, a.grade, a.avatar, a.created_at
        union all
        -- signed up or signed in during the period, but no practice in it
        select a.id, null, 0, a.username, a.grade, a.avatar, a.created_at,
               null, coalesce(a.last_seen, a.created_at), 0, 0, 0, 0, null, null
        from accounts a
        where coalesce(a.last_seen, a.created_at) >= t0
          and not exists (select 1 from events e where e.account_id = a.id and e.at >= t0)
        limit 1000
      ) x
    ) y), '[]');
end $$;

-- one student: pass account_id for a signed-in student, or device for a guest
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
                                         'joined', a.created_at, 'last_seen', a.last_seen)
                from accounts a where a.id = uid),
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

create or replace function public.admin_stats(tok uuid, days int default 30)
returns json language plpgsql security definer set search_path = public as $$
declare
  t1 timestamptz := now();
  t0 timestamptz := now() - make_interval(days => days);
  tp timestamptz := now() - make_interval(days => days * 2);
  tz text := 'Asia/Jerusalem';
begin
  perform admin_guard(tok);
  return json_build_object(
    'range', json_build_object('days', days, 'from', t0, 'to', t1),
    'kpi', (
      select json_build_object(
        'active',        count(distinct device) filter (where at >= t0),
        'active_prev',   count(distinct device) filter (where at <  t0),
        'active_today',  count(distinct device) filter (where (at at time zone tz)::date = (now() at time zone tz)::date),
        'correct',       count(*) filter (where kind = 'ok'  and at >= t0),
        'wrong',         count(*) filter (where kind = 'bad' and at >= t0),
        'solved',        count(*) filter (where kind = 'win' and at >= t0),
        'views',         count(*) filter (where kind = 'view' and at >= t0),
        'correct_prev',  count(*) filter (where kind = 'ok'  and at <  t0),
        'wrong_prev',    count(*) filter (where kind = 'bad' and at <  t0),
        'solved_prev',   count(*) filter (where kind = 'win' and at <  t0),
        'new_devices',   (select count(*) from (select device, min(at) f from events group by device) x where x.f >= t0),
        'all_time_devices', (select count(distinct device) from events)
      ) from events where at >= tp
    ),
    'daily', coalesce((
      select json_agg(d order by d.day) from (
        select s.day::date as day,
               count(e.*) filter (where e.kind = 'ok')  as ok,
               count(e.*) filter (where e.kind = 'bad') as bad,
               count(e.*) filter (where e.kind = 'win') as win,
               count(distinct e.device) as active
        from generate_series((t0 at time zone tz)::date, (t1 at time zone tz)::date, interval '1 day') s(day)
        left join events e on (e.at at time zone tz)::date = s.day::date and e.at >= t0
        group by s.day
      ) d), '[]'),
    'topics', coalesce((
      select json_agg(x order by x.attempts desc) from (
        select page,
               count(*) filter (where kind in ('ok', 'bad')) as attempts,
               count(*) filter (where kind = 'ok')  as ok,
               count(*) filter (where kind = 'bad') as bad,
               count(*) filter (where kind = 'win') as win,
               count(*) filter (where kind = 'view') as views,
               count(distinct device) as devices
        from events where at >= t0 group by page
      ) x), '[]'),
    'chapters', coalesce((
      select json_agg(x) from (
        select page, coalesce(chapter, '') as chapter,
               count(*) filter (where kind = 'ok')  as ok,
               count(*) filter (where kind = 'bad') as bad,
               count(*) filter (where kind = 'win') as win,
               count(distinct device) as devices
        from events where at >= t0 and kind <> 'view' group by page, chapter
      ) x), '[]'),
    'steps', coalesce((
      select json_agg(x) from (
        select page, coalesce(chapter, '') as chapter, coalesce(step, '') as step,
               count(*) filter (where kind = 'ok')  as ok,
               count(*) filter (where kind = 'bad') as bad
        from events where at >= t0 and kind in ('ok', 'bad') group by page, chapter, step
      ) x), '[]'),
    'daily_prev', coalesce((
      select json_agg(d order by d.day) from (
        select s.day::date as day,
               count(e.*) filter (where e.kind = 'ok')  as ok,
               count(e.*) filter (where e.kind = 'bad') as bad,
               count(e.*) filter (where e.kind = 'win') as win,
               count(distinct e.device) as active
        from generate_series((tp at time zone tz)::date, ((t0 at time zone tz)::date - 1), interval '1 day') s(day)
        left join events e on (e.at at time zone tz)::date = s.day::date and e.at >= tp and e.at < t0
        group by s.day
      ) d), '[]'),
    'heat', coalesce((
      select json_agg(x) from (
        select extract(dow from at at time zone tz)::int as d, extract(hour from at at time zone tz)::int as h, count(*) as n
        from events where at >= t0 and kind in ('ok', 'bad') group by 1, 2
      ) x), '[]'),
    'today', coalesce((
      select json_agg(x order by x.at) from (
        select at, page, kind from events
        where kind <> 'view' and (at at time zone tz)::date = (now() at time zone tz)::date
        order by at desc limit 400
      ) x), '[]'),
    'hours', coalesce((
      select json_agg(x order by x.h) from (
        select extract(hour from at at time zone tz)::int as h, count(*) as n
        from events where at >= t0 and kind in ('ok', 'bad') group by 1
      ) x), '[]'),
    'devices', (
      select json_build_object(
        'mobile',  count(distinct device) filter (where mobile),
        'desktop', count(distinct device) filter (where mobile is false))
      from events where at >= t0),
    'recent', coalesce((
      select json_agg(x) from (
        select e.at, e.page, e.chapter, e.step, e.kind, e.device, e.account_id, a.username from events e
          left join accounts a on a.id = e.account_id
        where e.kind <> 'view' order by e.at desc limit 25
      ) x), '[]')
  );
end $$;

grant execute on function public.admin_students(uuid, int) to anon, authenticated;
grant execute on function public.admin_student(uuid, uuid, text, int) to anon, authenticated;
grant execute on function public.admin_stats(uuid, int) to anon, authenticated;
