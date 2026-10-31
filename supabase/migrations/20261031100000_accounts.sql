-- ============================================================================
-- Student accounts: username + password, a personal profile and progress.
-- ----------------------------------------------------------------------------
-- Security model (same as the admin PIN):
--  * Passwords are stored only as bcrypt hashes and checked here, never in
--    the browser. Sessions are random 256-bit tokens; only their SHA-256 is
--    stored, so a database leak does not reveal usable sessions.
--  * 5 wrong passwords for a username within 15 minutes lock it for 15 minutes.
--  * Nothing here is readable by the public directly (RLS on, no grants);
--    everything goes through the functions below, which check the token.
--  * We keep the minimum: username, grade (optional), avatar colour, consent
--    record, and answer events. No name, email, phone or location.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.accounts (
  id            uuid primary key default gen_random_uuid(),
  username      text not null check (char_length(username) between 3 and 20),
  username_key  text generated always as (lower(username)) stored unique,
  pass_hash     text not null,
  grade         text check (grade in ('7', '8', '9')),
  avatar        text not null default 'teal' check (char_length(avatar) <= 20),
  terms_version text not null,
  terms_at      timestamptz not null,
  parent_ok     boolean not null,
  created_at    timestamptz not null default now(),
  last_seen     timestamptz
);

create table if not exists public.account_sessions (
  token_hash text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 days'
);
create index if not exists account_sessions_account on public.account_sessions(account_id);

create table if not exists public.account_attempts (
  username_key text not null,
  at           timestamptz not null default now(),
  ok           boolean not null
);
create index if not exists account_attempts_key on public.account_attempts(username_key, at);

alter table public.events add column if not exists account_id uuid references public.accounts(id) on delete cascade;
create index if not exists events_account_idx on public.events (account_id, at);

create table if not exists public.contact_messages (
  id         bigint generated always as identity primary key,
  name       text check (char_length(name) <= 60),
  reply_to   text check (char_length(reply_to) <= 120),
  body       text not null check (char_length(body) between 2 and 2000),
  device     text check (char_length(device) <= 64),
  created_at timestamptz not null default now(),
  handled    boolean not null default false
);

alter table public.accounts enable row level security;
alter table public.account_sessions enable row level security;
alter table public.account_attempts enable row level security;
alter table public.contact_messages enable row level security;
revoke all on public.accounts, public.account_sessions, public.account_attempts, public.contact_messages from anon, authenticated;

-- ── helpers (internal) ──────────────────────────────────────────────────────
-- current terms version: bump it when the terms or privacy policy change,
-- and every user is asked to accept again on the next sign-in
create or replace function public.account_terms_version() returns text language sql immutable as $$ select '2026-10-31'::text $$;

create or replace function public.account_from(tok text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid;
begin
  select account_id into uid from account_sessions
   where token_hash = encode(digest(coalesce(tok, ''), 'sha256'), 'hex') and expires_at > now();
  if uid is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  update accounts set last_seen = now() where id = uid and (last_seen is null or last_seen < now() - interval '5 minutes');
  return uid;
end $$;

create or replace function public.account_new_session(uid uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(gen_random_bytes(32), 'hex');
begin
  delete from account_sessions where account_id = uid and expires_at < now();
  insert into account_sessions (token_hash, account_id) values (encode(digest(t, 'sha256'), 'hex'), uid);
  return t;
end $$;

create or replace function public.account_json(uid uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', id, 'username', username, 'grade', grade, 'avatar', avatar,
                           'created_at', created_at, 'needs_terms', terms_version <> account_terms_version())
    from accounts where id = uid;
$$;

create or replace function public.account_name_problem(u text)
returns text language sql immutable as $$
  select case
    when u is null or char_length(u) < 3 then 'short'
    when char_length(u) > 20 then 'long'
    when u !~ '^[A-Za-z0-9א-ת_.-]+$' then 'chars'
    when lower(u) in ('admin', 'administrator', 'root', 'mathix', 'support', 'system', 'moderator', 'מנהל', 'ניהול') then 'reserved'
    else null end;
$$;

create or replace function public.account_pass_problem(p text)
returns text language sql immutable as $$
  select case
    when p is null or char_length(p) < 8 then 'short'
    when char_length(p) > 72 then 'long'
    when p !~ '[A-Za-zא-ת]' or p !~ '[0-9]' then 'mix'
    else null end;
$$;

-- ── public functions ────────────────────────────────────────────────────────
-- is this username available? (for live feedback while typing)
create or replace function public.account_name_free(username text)
returns json language plpgsql stable security definer set search_path = public as $$
declare prob text := account_name_problem(trim(username));
begin
  if prob is not null then return json_build_object('free', false, 'problem', prob); end if;
  return json_build_object('free', not exists (select 1 from accounts where username_key = lower(trim(username))));
end $$;

create or replace function public.account_signup(username text, password text, grade text, terms_version text,
                                                  accept boolean, parent_ok boolean, device text default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  u text := trim(username);
  prob text;
  uid uuid;
begin
  if not coalesce(accept, false) or not coalesce(parent_ok, false) then return json_build_object('error', 'consent'); end if;
  if terms_version is distinct from account_terms_version() then return json_build_object('error', 'terms_changed'); end if;
  prob := account_name_problem(u);
  if prob is not null then return json_build_object('error', 'username', 'problem', prob); end if;
  prob := account_pass_problem(password);
  if prob is not null then return json_build_object('error', 'password', 'problem', prob); end if;
  if grade is not null and grade not in ('7', '8', '9') then grade := null; end if;
  if exists (select 1 from accounts where username_key = lower(u)) then return json_build_object('error', 'taken'); end if;

  insert into accounts (username, pass_hash, grade, terms_version, terms_at, parent_ok)
  values (u, crypt(password, gen_salt('bf', 10)), grade, account_terms_version(), now(), true)
  returning id into uid;

  -- practice done on this device before signing up joins the new account
  if device is not null and char_length(device) between 8 and 64 then
    update events set account_id = uid where events.device = account_signup.device and account_id is null and at > now() - interval '180 days';
  end if;

  return json_build_object('token', account_new_session(uid), 'account', account_json(uid));
exception when unique_violation then
  return json_build_object('error', 'taken');
end $$;

create or replace function public.account_login(username text, password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  k text := lower(trim(username));
  fails int; oldest timestamptz;
  a accounts;
begin
  select count(*), min(at) into fails, oldest from account_attempts
   where username_key = k and not ok and at > now() - interval '15 minutes';
  if fails >= 5 then return json_build_object('error', 'locked', 'retry_at', oldest + interval '15 minutes'); end if;

  select * into a from accounts where username_key = k;
  if a.id is not null and a.pass_hash = crypt(password, a.pass_hash) then
    delete from account_attempts where username_key = k;
    return json_build_object('token', account_new_session(a.id), 'account', account_json(a.id));
  end if;

  insert into account_attempts (username_key, ok) values (k, false);
  delete from account_attempts where at < now() - interval '1 day';
  return json_build_object('error', 'wrong', 'left', greatest(0, 4 - fails));   -- same answer for unknown user and wrong password
end $$;

create or replace function public.account_me(tok text)
returns json language plpgsql security definer set search_path = public as $$
begin return account_json(account_from(tok)); end $$;

create or replace function public.account_logout(tok text)
returns void language sql security definer set search_path = public, extensions as $$
  delete from account_sessions where token_hash = encode(digest(coalesce(tok, ''), 'sha256'), 'hex');
$$;

create or replace function public.account_accept_terms(tok text, terms_version text, parent_ok boolean)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok);
begin
  if terms_version is distinct from account_terms_version() or not coalesce(parent_ok, false) then return json_build_object('error', 'consent'); end if;
  update accounts set terms_version = account_terms_version(), terms_at = now(), parent_ok = true where id = uid;
  return account_json(uid);
end $$;

create or replace function public.account_update(tok text, grade text, avatar text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok);
begin
  update accounts set
    grade = case when account_update.grade in ('7', '8', '9') then account_update.grade else null end,
    avatar = coalesce(nullif(left(account_update.avatar, 20), ''), accounts.avatar)
   where id = uid;
  return account_json(uid);
end $$;

create or replace function public.account_password(tok text, old_password text, new_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := account_from(tok); prob text;
begin
  if not exists (select 1 from accounts where id = uid and pass_hash = crypt(old_password, pass_hash)) then
    return json_build_object('error', 'wrong');
  end if;
  prob := account_pass_problem(new_password);
  if prob is not null then return json_build_object('error', 'password', 'problem', prob); end if;
  update accounts set pass_hash = crypt(new_password, gen_salt('bf', 10)) where id = uid;
  delete from account_sessions where account_id = uid and token_hash <> encode(digest(tok, 'sha256'), 'hex');   -- sign out other devices
  return json_build_object('ok', true);
end $$;

-- delete the account and everything tied to it (answers included)
create or replace function public.account_delete(tok text, password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := account_from(tok);
begin
  if not exists (select 1 from accounts where id = uid and pass_hash = crypt(password, pass_hash)) then
    return json_build_object('error', 'wrong');
  end if;
  delete from accounts where id = uid;   -- sessions and answer events go with it (on delete cascade)
  return json_build_object('ok', true);
end $$;

-- answers while signed in (same shape as the anonymous events)
create or replace function public.account_track(tok text, rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok);
begin
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 50 then return; end if;
  insert into events (device, page, chapter, step, kind, mobile, account_id)
  select left(r->>'device', 64), left(r->>'page', 80), left(r->>'chapter', 160), left(r->>'step', 200), r->>'kind', (r->>'mobile')::boolean, uid
    from jsonb_array_elements(rows) r
   where r->>'kind' in ('view', 'ok', 'bad', 'win') and char_length(coalesce(r->>'device', '')) between 8 and 64 and r->>'page' is not null;
end $$;

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
    'recent', coalesce((select json_agg(x order by x.last desc) from (
        select page, chapter, max(at) as last,
               count(*) filter (where kind = 'ok') as ok, count(*) filter (where kind = 'bad') as bad,
               count(*) filter (where kind = 'win') as win
          from events where account_id = uid and kind <> 'view' and at > now() - interval '60 days'
         group by page, chapter order by max(at) desc limit 8) x), '[]')
  );
end $$;

-- contact form (public): at most 5 messages per device per day
create or replace function public.contact_send(name text, reply_to text, body text, device text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if char_length(coalesce(trim(body), '')) < 2 then return json_build_object('error', 'empty'); end if;
  if (select count(*) from contact_messages m where m.device = contact_send.device and m.created_at > now() - interval '1 day') >= 5 then
    return json_build_object('error', 'limit');
  end if;
  insert into contact_messages (name, reply_to, body, device)
  values (left(nullif(trim(name), ''), 60), left(nullif(trim(reply_to), ''), 120), left(trim(body), 2000), left(device, 64));
  return json_build_object('ok', true);
end $$;

-- admin: messages from the contact form, and how many accounts exist
create or replace function public.admin_contact(tok uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return json_build_object(
    'accounts', (select count(*) from accounts),
    'accounts_7d', (select count(*) from accounts where created_at > now() - interval '7 days'),
    'messages', coalesce((select json_agg(m order by m.created_at desc) from
      (select id, name, reply_to, body, created_at, handled from contact_messages order by created_at desc limit 100) m), '[]'));
end $$;

create or replace function public.admin_contact_done(tok uuid, msg_id bigint, done boolean)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  update contact_messages set handled = done where id = msg_id;
  return json_build_object('ok', true);
end $$;

-- only the public entry points are callable from the site
revoke execute on function public.account_from(text), public.account_new_session(uuid), public.account_json(uuid) from public, anon, authenticated;
revoke execute on function public.account_name_free(text), public.account_signup(text, text, text, text, boolean, boolean, text),
  public.account_login(text, text), public.account_me(text), public.account_logout(text), public.account_accept_terms(text, text, boolean),
  public.account_update(text, text, text), public.account_password(text, text, text), public.account_delete(text, text),
  public.account_track(text, jsonb), public.account_progress(text), public.contact_send(text, text, text, text),
  public.admin_contact(uuid), public.admin_contact_done(uuid, bigint, boolean) from public;
grant execute on function public.account_name_free(text), public.account_signup(text, text, text, text, boolean, boolean, text),
  public.account_login(text, text), public.account_me(text), public.account_logout(text), public.account_accept_terms(text, text, boolean),
  public.account_update(text, text, text), public.account_password(text, text, text), public.account_delete(text, text),
  public.account_track(text, jsonb), public.account_progress(text), public.contact_send(text, text, text, text),
  public.admin_contact(uuid), public.admin_contact_done(uuid, bigint, boolean), public.account_terms_version() to anon, authenticated;
