-- Progress per chapter too (the home railway shows the chapters worth strengthening).
-- everything the profile page shows
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
        'topics', count(distinct page) filter (where kind <> 'view'))
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

