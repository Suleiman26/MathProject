-- Admin dashboard v2: more numbers for the interactive dashboard
--  * daily_prev : the same daily series for the previous period (comparison line)
--  * heat       : answers by weekday x hour ("when do students practice")
--  * today      : today's answers, for the day timeline
-- Same function name and arguments; replaces the earlier version.

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
        select at, page, chapter, step, kind, device from events
        where kind <> 'view' order by at desc limit 25
      ) x), '[]')
  );
end $$;
