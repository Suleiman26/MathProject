-- Progress v2: weekly practice goal, achievements (badges), personal records,
-- and the details of one topic for /profile/<topic>.
-- Everything is read through functions that check the session token.

alter table public.accounts add column if not exists weekly_goal int not null default 4
  check (weekly_goal between 1 and 7);

-- the account as the site sees it (now with the weekly goal)
create or replace function public.account_json(uid uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', id, 'username', username, 'grade', grade, 'avatar', avatar,
                           'created_at', created_at, 'weekly_goal', weekly_goal,
                           'needs_terms', terms_version <> account_terms_version())
    from accounts where id = uid;
$$;

-- practice days per week the student aims for (1..7)
create or replace function public.account_set_goal(tok text, goal int)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok);
begin
  update accounts set weekly_goal = greatest(1, least(7, coalesce(goal, 4))) where id = uid;
  return account_json(uid);
end $$;

-- badges (earned or not, with progress) and personal records
create or replace function public.account_achievements(tok text)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := account_from(tok);
  tz constant text := 'Asia/Jerusalem';
  g text; letter text;
  d date; prev date; run int := 0; best int := 0;
  s3 date; s7 date; s30 date;
  wins int; ok_total int;
  w1 timestamptz; w10 timestamptz; w50 timestamptz; w100 timestamptz; w500 timestamptz;
  m15 timestamptz; m30 timestamptz; top_win int;
  p10 timestamptz; best_run int;
  grade_n int; grade_started int; grade_at timestamptz;
  early timestamptz; night timestamptz;
  bd record; bs record;
begin
  select grade into g from accounts where id = uid;
  letter := case g when '7' then 'ז' when '8' then 'ח' when '9' then 'ט' end;

  -- streaks: the first day a run of 3 / 7 / 30 days was reached
  for d in select distinct (at at time zone tz)::date from events where account_id = uid and kind <> 'view' order by 1 loop
    if prev is not null and d = prev + 1 then run := run + 1; else run := 1; end if;
    if run = 3 and s3 is null then s3 := d; end if;
    if run = 7 and s7 is null then s7 := d; end if;
    if run = 30 and s30 is null then s30 := d; end if;
    best := greatest(best, run); prev := d;
  end loop;

  -- solved exercises: when the 1st / 10th / 50th / 100th / 500th was solved
  select count(*) filter (where kind = 'win'), count(*) filter (where kind = 'ok') into wins, ok_total
    from events where account_id = uid;
  select min(at) filter (where rn = 1), min(at) filter (where rn = 10), min(at) filter (where rn = 50),
         min(at) filter (where rn = 100), min(at) filter (where rn = 500)
    into w1, w10, w50, w100, w500
    from (select at, row_number() over (order by at, id) rn from events where account_id = uid and kind = 'win') x;

  -- levels per topic: first topic to reach 15 (שליטה) and 30 (מומחיות) solved
  select min(at) filter (where rn = 15), min(at) filter (where rn = 30), coalesce(max(rn), 0)
    into m15, m30, top_win
    from (select at, row_number() over (partition by page order by at, id) rn from events where account_id = uid and kind = 'win') x;

  -- perfect chapter: 10 right answers in a row in one chapter, without a mistake
  with e as (
    select at, id, kind, page, coalesce(chapter, '') ch,
           count(*) filter (where kind = 'bad') over (partition by page, coalesce(chapter, '') order by at, id) grp
      from events where account_id = uid and kind in ('ok', 'bad')
  ), r as (
    select at, page, ch, grp, row_number() over (partition by page, ch, grp order by at, id) rn
      from e where kind = 'ok'
  )
  select min(at) filter (where rn = 10), coalesce(max(rn), 0) into p10, best_run from r;

  -- every topic of the student's grade started
  if letter is not null then
    with gt as (
      select t.page from topics t
       where t.page is not null and t.visible
         and exists (select 1 from grades gr where gr.id = any (t.grade_ids) and gr.name like '%' || letter || '%')
    ), st as (
      select gt.page, (select min(at) from events e where e.account_id = uid and e.page = gt.page and e.kind <> 'view') first_at from gt
    )
    select count(*), count(first_at), max(first_at) into grade_n, grade_started, grade_at from st;
    if grade_started < grade_n then grade_at := null; end if;
  end if;

  -- early bird (before 7:00) and night owl (after 22:00), Israel time
  select min(at) filter (where extract(hour from at at time zone tz) between 4 and 6),
         min(at) filter (where extract(hour from at at time zone tz) >= 22 or extract(hour from at at time zone tz) < 4)
    into early, night
    from events where account_id = uid and kind in ('ok', 'win');

  -- records: best day (most solved) and best session (answers less than 30 minutes apart)
  select (at at time zone tz)::date as day, count(*) as win into bd
    from events where account_id = uid and kind = 'win' group by 1 order by 2 desc, 1 desc limit 1;
  with e as (
    select at, kind, case when lag(at) over (order by at, id) is null or at - lag(at) over (order by at, id) > interval '30 minutes' then 1 else 0 end s
      from events where account_id = uid and kind <> 'view'
  ), x as (select at, kind, sum(s) over (order by at rows unbounded preceding) sid from e)
  select min(at) as at, count(*) filter (where kind = 'win') as win, count(*) as answers into bs
    from x group by sid order by 2 desc, 1 desc limit 1;

  return json_build_object(
    'badges', json_build_array(
      json_build_object('id', 'first',    'at', w1,   'have', wins, 'need', 1),
      json_build_object('id', 'streak3',  'at', s3,   'have', best, 'need', 3),
      json_build_object('id', 'streak7',  'at', s7,   'have', best, 'need', 7),
      json_build_object('id', 'streak30', 'at', s30,  'have', best, 'need', 30),
      json_build_object('id', 'solved10', 'at', w10,  'have', wins, 'need', 10),
      json_build_object('id', 'solved50', 'at', w50,  'have', wins, 'need', 50),
      json_build_object('id', 'solved100','at', w100, 'have', wins, 'need', 100),
      json_build_object('id', 'solved500','at', w500, 'have', wins, 'need', 500),
      json_build_object('id', 'master',   'at', m15,  'have', top_win, 'need', 15),
      json_build_object('id', 'expert',   'at', m30,  'have', top_win, 'need', 30),
      json_build_object('id', 'perfect',  'at', p10,  'have', best_run, 'need', 10),
      json_build_object('id', 'grade',    'at', grade_at, 'have', coalesce(grade_started, 0), 'need', coalesce(grade_n, 0)),
      json_build_object('id', 'early',    'at', early, 'have', case when early is null then 0 else 1 end, 'need', 1),
      json_build_object('id', 'night',    'at', night, 'have', case when night is null then 0 else 1 end, 'need', 1)
    ),
    'records', json_build_object(
      'best_day', case when bd.day is null then null else json_build_object('day', bd.day, 'win', bd.win) end,
      'best_streak', best,
      'best_session', case when bs.at is null then null else json_build_object('at', bs.at, 'win', bs.win, 'answers', bs.answers) end,
      'best_run', best_run)
  );
end $$;

-- one topic in detail: chapters, the steps with most mistakes, and a 60-day history
create or replace function public.account_topic(tok text, page text)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := account_from(tok);
  tz constant text := 'Asia/Jerusalem';
  p text := page;
begin
  if p is null or p !~ '^[a-z0-9-]+\.html$' then return json_build_object('error', 'page'); end if;
  return json_build_object(
    'today', (now() at time zone tz)::date,
    'totals', (select json_build_object(
        'ok', count(*) filter (where kind = 'ok'), 'bad', count(*) filter (where kind = 'bad'),
        'win', count(*) filter (where kind = 'win'),
        'first', min(at) filter (where kind <> 'view'), 'last', max(at) filter (where kind <> 'view'),
        'days', count(distinct (at at time zone tz)::date) filter (where kind <> 'view'))
      from events e where e.account_id = uid and e.page = p),
    'chapters', coalesce((select json_agg(x) from (
        select chapter, count(*) filter (where kind = 'ok') ok, count(*) filter (where kind = 'bad') bad,
               count(*) filter (where kind = 'win') win, max(at) last
          from events e where e.account_id = uid and e.page = p and kind <> 'view'
         group by chapter) x), '[]'),
    'mistakes', coalesce((select json_agg(x order by x.bad desc, x.last desc) from (
        select chapter, step, count(*) filter (where kind = 'bad') bad, count(*) filter (where kind = 'ok') ok, max(at) last
          from events e where e.account_id = uid and e.page = p and kind in ('ok', 'bad') and step is not null
         group by chapter, step having count(*) filter (where kind = 'bad') > 0
         order by 3 desc, 5 desc limit 6) x), '[]'),
    'days', coalesce((select json_agg(x order by x.day) from (
        select (at at time zone tz)::date as day, count(*) filter (where kind = 'ok') ok,
               count(*) filter (where kind = 'bad') bad, count(*) filter (where kind = 'win') win
          from events e where e.account_id = uid and e.page = p and kind <> 'view' and at > now() - interval '61 days'
         group by 1) x), '[]')
  );
end $$;

revoke execute on function public.account_set_goal(text, int), public.account_achievements(text), public.account_topic(text, text) from public;
grant execute on function public.account_set_goal(text, int), public.account_achievements(text), public.account_topic(text, text) to anon, authenticated;
