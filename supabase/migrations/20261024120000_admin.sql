-- ============================================================================
-- MathProject admin: content order, answer analytics, sales, admin PIN
-- ----------------------------------------------------------------------------
-- Security model
--  * Students (the public site) may only: read visible content, and add
--    anonymous answer events. Nothing else.
--  * Every admin action goes through a function that checks a session token.
--    The token comes from admin_login(pin). The PIN is stored hashed (bcrypt)
--    and is checked here in the database, never in the browser.
--  * 5 wrong PINs within 15 minutes lock the admin for 15 minutes.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ── Content ────────────────────────────────────────────────────────────────
create table public.grades (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 40),
  position   int  not null default 0,
  visible    boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 60),
  color      text not null default 'teal',
  position   int  not null default 0,
  visible    boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name        text not null check (char_length(name) between 1 and 80),
  page        text check (page is null or page ~ '^[a-z0-9-]+\.html$'),
  grade_ids   uuid[] not null default '{}',
  icon        text not null default 'equation',
  color       text not null default 'teal',
  status      text not null default 'ready' check (status in ('ready', 'in_progress', 'planned')),
  position    int  not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── Answer analytics (anonymous) ───────────────────────────────────────────
create table public.events (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  device  text not null check (char_length(device) between 8 and 64),
  page    text not null check (char_length(page) <= 80),
  chapter text check (char_length(chapter) <= 160),
  step    text check (char_length(step) <= 200),
  kind    text not null check (kind in ('view', 'ok', 'bad', 'win')),
  mobile  boolean
);
create index events_at_idx on public.events (at);
create index events_page_at_idx on public.events (page, at);
create index events_device_idx on public.events (device, at);

-- ── Sales (filled once payments are connected) ─────────────────────────────
create table public.plans (
  id        uuid primary key default gen_random_uuid(),
  name      text not null check (char_length(name) between 1 and 60),
  price_ils numeric(10, 2) not null default 0 check (price_ils >= 0),
  period    text not null default 'month' check (period in ('month', 'year')),
  active    boolean not null default true,
  position  int not null default 0,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  customer    text not null,                      -- account / email id from the payment provider
  plan_id     uuid references public.plans(id) on delete set null,
  status      text not null check (status in ('trial', 'active', 'past_due', 'canceled')),
  amount_ils  numeric(10, 2) not null default 0,
  period      text not null default 'month' check (period in ('month', 'year')),
  started_at  timestamptz not null default now(),
  canceled_at timestamptz
);

-- ── Admin internals (never readable by the public) ─────────────────────────
create table public.admin_settings (
  id         int primary key default 1 check (id = 1),
  pin_hash   text not null,
  updated_at timestamptz not null default now()
);
create table public.admin_sessions (
  token      uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);
create table public.admin_attempts (
  id  bigint generated always as identity primary key,
  at  timestamptz not null default now(),
  ok  boolean not null
);

insert into public.admin_settings (pin_hash) values (extensions.crypt('1111', extensions.gen_salt('bf')));

-- ── Row level security ─────────────────────────────────────────────────────
alter table public.grades         enable row level security;
alter table public.categories     enable row level security;
alter table public.topics         enable row level security;
alter table public.events         enable row level security;
alter table public.plans          enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.admin_settings enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_attempts enable row level security;

create policy "public reads visible grades"     on public.grades     for select to anon, authenticated using (visible);
create policy "public reads visible categories" on public.categories for select to anon, authenticated using (visible);
create policy "public reads visible topics"     on public.topics     for select to anon, authenticated using (visible);
create policy "public reads active plans"       on public.plans      for select to anon, authenticated using (active);
create policy "students add answer events"      on public.events     for insert to anon, authenticated with check (at > now() - interval '1 minute' and at < now() + interval '1 minute');

revoke all on public.events from anon, authenticated;
grant insert (device, page, chapter, step, kind, mobile) on public.events to anon, authenticated;
revoke all on public.admin_settings, public.admin_sessions, public.admin_attempts, public.subscriptions from anon, authenticated;
revoke insert, update, delete on public.grades, public.categories, public.topics, public.plans from anon, authenticated;

-- ── Admin: login / session ─────────────────────────────────────────────────
create or replace function public.admin_login(pin text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  fails int;
  oldest timestamptz;
  t uuid;
begin
  select count(*), min(at) into fails, oldest
    from admin_attempts where not ok and at > now() - interval '15 minutes';
  if fails >= 5 then
    return json_build_object('error', 'locked', 'retry_at', oldest + interval '15 minutes');
  end if;

  if exists (select 1 from admin_settings where pin_hash = crypt(pin, pin_hash)) then
    insert into admin_attempts (ok) values (true);
    delete from admin_attempts where not ok;                 -- a correct PIN clears the counter
    delete from admin_sessions where expires_at < now();
    insert into admin_sessions default values returning token into t;
    return json_build_object('token', t, 'expires_at', now() + interval '12 hours');
  end if;

  insert into admin_attempts (ok) values (false);
  return json_build_object('error', 'wrong', 'left', greatest(0, 4 - fails));
end $$;

create or replace function public.admin_guard(tok uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if tok is null or not exists (select 1 from admin_sessions where token = tok and expires_at > now()) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
end $$;

create or replace function public.admin_logout(tok uuid)
returns void language sql security definer set search_path = public as $$
  delete from admin_sessions where token = tok;
$$;

create or replace function public.admin_change_pin(tok uuid, old_pin text, new_pin text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  perform admin_guard(tok);
  if new_pin !~ '^[0-9]{4,8}$' then return json_build_object('error', 'format'); end if;
  if not exists (select 1 from admin_settings where pin_hash = crypt(old_pin, pin_hash)) then
    return json_build_object('error', 'wrong');
  end if;
  update admin_settings set pin_hash = crypt(new_pin, gen_salt('bf')), updated_at = now() where id = 1;
  delete from admin_sessions where token <> tok;            -- sign out other devices
  return json_build_object('ok', true);
end $$;

-- ── Admin: content ─────────────────────────────────────────────────────────
create or replace function public.admin_catalog(tok uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return json_build_object(
    'grades',     coalesce((select json_agg(g order by g.position, g.created_at) from grades g), '[]'),
    'categories', coalesce((select json_agg(c order by c.position, c.created_at) from categories c), '[]'),
    'topics',     coalesce((select json_agg(t order by t.position, t.created_at) from topics t), '[]'),
    'plans',      coalesce((select json_agg(p order by p.position, p.created_at) from plans p), '[]')
  );
end $$;

-- save = insert when id is null, update otherwise. Returns the saved row.
create or replace function public.admin_save(tok uuid, kind text, item jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  rid uuid := nullif(item->>'id', '')::uuid;
  nextpos int;
  r json;
begin
  perform admin_guard(tok);
  if kind = 'grade' then
    if rid is null then
      select coalesce(max(position) + 1, 0) into nextpos from grades;
      insert into grades (name, visible, position) values (item->>'name', coalesce((item->>'visible')::boolean, true), nextpos) returning id into rid;
    else
      update grades set name = coalesce(item->>'name', name), visible = coalesce((item->>'visible')::boolean, visible) where id = rid;
    end if;
    select row_to_json(g) into r from grades g where id = rid;
  elsif kind = 'category' then
    if rid is null then
      select coalesce(max(position) + 1, 0) into nextpos from categories;
      insert into categories (name, color, visible, position)
        values (item->>'name', coalesce(item->>'color', 'teal'), coalesce((item->>'visible')::boolean, true), nextpos) returning id into rid;
    else
      update categories set name = coalesce(item->>'name', name), color = coalesce(item->>'color', color),
        visible = coalesce((item->>'visible')::boolean, visible) where id = rid;
    end if;
    select row_to_json(c) into r from categories c where id = rid;
  elsif kind = 'topic' then
    if rid is null then
      select coalesce(max(position) + 1, 0) into nextpos from topics
        where category_id is not distinct from nullif(item->>'category_id', '')::uuid;
      insert into topics (category_id, name, page, grade_ids, icon, color, status, visible, position)
      values (nullif(item->>'category_id', '')::uuid, item->>'name', nullif(item->>'page', ''),
              coalesce(array(select jsonb_array_elements_text(item->'grade_ids'))::uuid[], '{}'),
              coalesce(item->>'icon', 'equation'), coalesce(item->>'color', 'teal'),
              coalesce(item->>'status', 'ready'), coalesce((item->>'visible')::boolean, true), nextpos)
      returning id into rid;
    else
      update topics set
        category_id = case when item ? 'category_id' then nullif(item->>'category_id', '')::uuid else category_id end,
        name        = coalesce(item->>'name', name),
        page        = case when item ? 'page' then nullif(item->>'page', '') else page end,
        grade_ids   = case when item ? 'grade_ids' then array(select jsonb_array_elements_text(item->'grade_ids'))::uuid[] else grade_ids end,
        icon        = coalesce(item->>'icon', icon),
        color       = coalesce(item->>'color', color),
        status      = coalesce(item->>'status', status),
        visible     = coalesce((item->>'visible')::boolean, visible)
      where id = rid;
    end if;
    select row_to_json(t) into r from topics t where id = rid;
  elsif kind = 'plan' then
    if rid is null then
      select coalesce(max(position) + 1, 0) into nextpos from plans;
      insert into plans (name, price_ils, period, active, position)
      values (item->>'name', coalesce((item->>'price_ils')::numeric, 0), coalesce(item->>'period', 'month'),
              coalesce((item->>'active')::boolean, true), nextpos) returning id into rid;
    else
      update plans set name = coalesce(item->>'name', name), price_ils = coalesce((item->>'price_ils')::numeric, price_ils),
        period = coalesce(item->>'period', period), active = coalesce((item->>'active')::boolean, active) where id = rid;
    end if;
    select row_to_json(p) into r from plans p where id = rid;
  else
    raise exception 'unknown kind %', kind;
  end if;
  return r;
end $$;

create or replace function public.admin_delete(tok uuid, kind text, rid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  if kind = 'grade' then
    update topics set grade_ids = array_remove(grade_ids, rid) where rid = any (grade_ids);
    delete from grades where id = rid;
  elsif kind = 'category' then delete from categories where id = rid;
  elsif kind = 'topic'    then delete from topics where id = rid;
  elsif kind = 'plan'     then delete from plans where id = rid;
  else raise exception 'unknown kind %', kind;
  end if;
end $$;

-- new order = the ids in the order they should appear
create or replace function public.admin_reorder(tok uuid, kind text, ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  if kind = 'grade' then
    update grades g set position = o.n - 1 from unnest(ids) with ordinality o(id, n) where g.id = o.id;
  elsif kind = 'category' then
    update categories c set position = o.n - 1 from unnest(ids) with ordinality o(id, n) where c.id = o.id;
  elsif kind = 'topic' then
    update topics t set position = o.n - 1 from unnest(ids) with ordinality o(id, n) where t.id = o.id;
  elsif kind = 'plan' then
    update plans p set position = o.n - 1 from unnest(ids) with ordinality o(id, n) where p.id = o.id;
  else raise exception 'unknown kind %', kind;
  end if;
end $$;

-- ── Admin: analytics ───────────────────────────────────────────────────────
-- days = length of the period. The previous period of the same length is
-- returned too, so the dashboard can show "up/down vs before".
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

create or replace function public.admin_students(tok uuid, days int default 30)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return coalesce((
    select json_agg(x order by x.last_seen desc) from (
      select device,
             min(at) as first_seen,
             max(at) as last_seen,
             count(distinct (at at time zone 'Asia/Jerusalem')::date) as days_active,
             count(*) filter (where kind = 'ok')  as ok,
             count(*) filter (where kind = 'bad') as bad,
             count(*) filter (where kind = 'win') as win,
             bool_or(mobile) as mobile,
             mode() within group (order by page) as top_page
      from events
      where device in (select distinct device from events where at >= now() - make_interval(days => days))
      group by device
      limit 1000
    ) x), '[]');
end $$;

create or replace function public.admin_sales(tok uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return json_build_object(
    'active',   (select count(*) from subscriptions where status = 'active'),
    'trial',    (select count(*) from subscriptions where status = 'trial'),
    'past_due', (select count(*) from subscriptions where status = 'past_due'),
    'canceled_30d', (select count(*) from subscriptions where status = 'canceled' and canceled_at > now() - interval '30 days'),
    'mrr', (select coalesce(sum(case when period = 'year' then amount_ils / 12 else amount_ils end), 0)
              from subscriptions where status = 'active'),
    'monthly', coalesce((
      select json_agg(m order by m.month) from (
        select to_char(s.month, 'YYYY-MM') as month,
               (select count(*) from subscriptions x where x.started_at < s.month + interval '1 month'
                  and (x.canceled_at is null or x.canceled_at >= s.month + interval '1 month')
                  and x.status <> 'trial') as subscribers,
               (select coalesce(sum(case when x.period = 'year' then x.amount_ils / 12 else x.amount_ils end), 0)
                  from subscriptions x where x.started_at < s.month + interval '1 month'
                  and (x.canceled_at is null or x.canceled_at >= s.month + interval '1 month')
                  and x.status <> 'trial') as mrr
        from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') s(month)
      ) m), '[]'),
    'recent', coalesce((select json_agg(x) from (
        select s.customer, s.status, s.amount_ils, s.period, s.started_at, s.canceled_at, p.name as plan
        from subscriptions s left join plans p on p.id = s.plan_id order by s.started_at desc limit 20) x), '[]')
  );
end $$;

-- CSV-friendly export of raw events for a period
create or replace function public.admin_export(tok uuid, days int default 30)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return coalesce((select json_agg(e order by e.at) from (
    select at, device, page, chapter, step, kind, mobile from events
    where at >= now() - make_interval(days => days) limit 50000) e), '[]');
end $$;

-- who may call what
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.admin_login(text),
  public.admin_logout(uuid),
  public.admin_change_pin(uuid, text, text),
  public.admin_catalog(uuid),
  public.admin_save(uuid, text, jsonb),
  public.admin_delete(uuid, text, uuid),
  public.admin_reorder(uuid, text, uuid[]),
  public.admin_stats(uuid, int),
  public.admin_students(uuid, int),
  public.admin_sales(uuid),
  public.admin_export(uuid, int)
to anon, authenticated;
-- admin_guard stays internal (only callable from inside the functions above)
