-- ============================================================================
-- Duels, part 1: friends, presence and the release switch (2026-11-08).
-- Spec: docs/superpowers/specs/2026-11-07-duels-design.md §5–§7.
-- ----------------------------------------------------------------------------
--  * Friends are added ONLY by a friend code (6 chars, no username search).
--    Both sides must accept. 20 requests a day per sender, 100 friends max.
--  * Block is silent: it removes the friendship, and any later add between the
--    two looks like a normal "sent" but stores nothing.
--  * Reports use a fixed reason list (no free text between students).
--  * Release switch site_settings.duels = "off" | "test" | "on", enforced in
--    every friend/duel function by duel_guard(uid) (test = accounts.duel_tester).
--  * Online = presence_ping within the last 70 s (accounts.online_at). The
--    existing last_seen keeps its meaning for the admin.
--  * New tables: RLS on, no grants to the public roles; everything goes through
--    the security-definer functions below, which check the session token.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ── friend code + inbox on every account ─────────────────────────────────────
-- a fresh, unused friend code (alphabet without 0/O/1/I)
create or replace function public.friend_code_new()
returns text language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea; c text;
begin
  loop
    b := gen_random_bytes(6);
    c := '';
    for i in 0..5 loop c := c || substr(abc, (get_byte(b, i) % 32) + 1, 1); end loop;   -- 256 % 32 = 0: no bias
    exit when not exists (select 1 from accounts where friend_code = c);
  end loop;
  return c;
end $$;

alter table public.accounts
  add column if not exists friend_code text,
  add column if not exists inbox       text,
  add column if not exists online_at   timestamptz,
  add column if not exists duel_xp     int not null default 0,
  add column if not exists duel_tester boolean not null default false;

-- backfill existing accounts one by one (so each new code sees the ones before it)
do $$
declare r record;
begin
  for r in select id from public.accounts where friend_code is null or inbox is null loop
    update public.accounts set
      friend_code = coalesce(friend_code, public.friend_code_new()),
      inbox = coalesce(inbox, encode(extensions.gen_random_bytes(16), 'hex'))
     where id = r.id;
  end loop;
end $$;

alter table public.accounts
  alter column friend_code set default public.friend_code_new(),
  alter column friend_code set not null,
  alter column inbox set default encode(extensions.gen_random_bytes(16), 'hex'),   -- 32 hex chars: the user's realtime channel name
  alter column inbox set not null;
create unique index if not exists accounts_friend_code on public.accounts (friend_code);
create unique index if not exists accounts_inbox on public.accounts (inbox);

-- ── tables ──────────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  a            uuid not null references public.accounts(id) on delete cascade,
  b            uuid not null references public.accounts(id) on delete cascade,
  status       text not null check (status in ('pending', 'accepted')),
  requested_by uuid not null references public.accounts(id) on delete cascade,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (a, b),
  check (a < b),
  check (requested_by in (a, b))
);
create index if not exists friendships_b on public.friendships (b);

create table if not exists public.blocks (
  blocker    uuid not null references public.accounts(id) on delete cascade,
  blocked    uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
create index if not exists blocks_blocked on public.blocks (blocked);

create table if not exists public.reports (
  id         bigint generated always as identity primary key,
  reporter   uuid references public.accounts(id) on delete set null,
  reported   uuid references public.accounts(id) on delete set null,
  reason     text not null check (reason in ('name', 'spam', 'other')),
  duel_id    uuid,                                    -- the duels table arrives in a later migration
  created_at timestamptz not null default now(),
  done       boolean not null default false
);
create index if not exists reports_open on public.reports (done, created_at desc);
create index if not exists reports_reporter on public.reports (reporter, created_at);

-- every friend_add that reaches the "send" step (daily cap), and every unknown
-- code typed (so codes can't be guessed by trying many) — the sender only, no target
create table if not exists public.friend_sends (
  uid  uuid not null references public.accounts(id) on delete cascade,
  at   timestamptz not null default now(),
  miss boolean not null default false
);
create index if not exists friend_sends_uid on public.friend_sends (uid, at);

alter table public.friendships  enable row level security;
alter table public.blocks       enable row level security;
alter table public.reports      enable row level security;
alter table public.friend_sends enable row level security;
revoke all on public.friendships, public.blocks, public.reports, public.friend_sends from public, anon, authenticated;

-- ── release switch ──────────────────────────────────────────────────────────
insert into public.site_settings (key, value) values ('duels', '"off"'::jsonb)
on conflict (key) do nothing;

create or replace function public.duel_switch()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select value #>> '{}' from site_settings where key = 'duels'), 'off');
$$;

-- null = allowed; 'off' = this account can't use friends/duels right now
create or replace function public.duel_guard(uid uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare s text := duel_switch();
begin
  if s = 'on' then return null; end if;
  if s = 'test' and exists (select 1 from accounts where id = uid and duel_tester) then return null; end if;
  return 'off';
end $$;

create or replace function public.admin_set_setting(tok uuid, k text, v jsonb)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  if k not in ('keypad', 'duels') then return json_build_object('error', 'unknown'); end if;
  if k = 'duels' and (jsonb_typeof(v) is distinct from 'string' or v #>> '{}' not in ('off', 'test', 'on')) then
    return json_build_object('error', 'value');
  end if;
  insert into site_settings (key, value, updated_at) values (k, v, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return json_build_object('ok', true, 'key', k, 'value', v);
end $$;

-- ── level (rank) of a player ────────────────────────────────────────────────
-- SQL copy of xpOf + playerLevel in src/lib/progress.js — keep the two in sync.
-- Points: 10 per solved exercise ('win'), 1 per correct step ('ok') — the same
-- events account_progress counts — plus accounts.duel_xp.
-- Level L → L+1 costs 100 + 50·(L−1) points.
create or replace function public.duel_level(uid uuid)
returns int language plpgsql stable security definer set search_path = public as $$
declare
  xp bigint;
  lvl int := 1; floor_xp bigint := 0; cost bigint := 100;
begin
  select coalesce(count(*) filter (where kind = 'win'), 0) * 10 + coalesce(count(*) filter (where kind = 'ok'), 0)
    into xp from events where account_id = uid;
  xp := xp + coalesce((select duel_xp from accounts where id = uid), 0);
  while xp >= floor_xp + cost loop
    floor_xp := floor_xp + cost; lvl := lvl + 1; cost := 100 + 50 * (lvl - 1);
  end loop;
  return lvl;
end $$;

-- ── the account as its owner sees it (now with friend code + inbox) ──────────
-- Only ever returned to the account's owner (sign-up, login, me, terms,
-- update, progress, goal), so the secret inbox is safe here.
create or replace function public.account_json(uid uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', id, 'username', username, 'grade', grade, 'avatar', avatar,
                           'created_at', created_at, 'weekly_goal', weekly_goal,
                           'friend_code', friend_code, 'inbox', inbox,
                           'needs_terms', terms_version <> account_terms_version())
    from accounts where id = uid;
$$;

-- ── friends ─────────────────────────────────────────────────────────────────
create or replace function public.friends_blocked(x uuid, y uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x));
$$;

create or replace function public.friends_count(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from friendships where (a = uid or b = uid) and status = 'accepted';
$$;

-- my code, my friends (with online status + level), requests in and out
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
               0 as wins, 0 as losses                    -- head-to-head: filled when the duels table exists
          from friendships f join accounts o on o.id = case when f.a = uid then f.b else f.a end
         where (f.a = uid or f.b = uid) and f.status = 'accepted') x), '[]'),
    'incoming', coalesce((select json_agg(x order by x.created_at desc) from (
        select o.id, o.username, o.avatar, f.created_at
          from friendships f join accounts o on o.id = f.requested_by
         where (f.a = uid or f.b = uid) and f.status = 'pending' and f.requested_by <> uid) x), '[]'),
    'outgoing', coalesce((select json_agg(x order by x.created_at desc) from (
        select o.id, o.username, o.avatar, f.created_at
          from friendships f join accounts o on o.id = case when f.a = uid then f.b else f.a end
         where (f.a = uid or f.b = uid) and f.status = 'pending' and f.requested_by = uid) x), '[]')
  );
end $$;

-- add a friend by code: sent | accepted (they had asked me) | already (friends)
create or replace function public.friend_add(tok text, code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := account_from(tok); g text := duel_guard(me);
  c text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  other uuid; f friendships;
begin
  if g is not null then return json_build_object('error', g); end if;
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

  select * into f from friendships where a = least(me, other) and b = greatest(me, other);
  if f.status = 'accepted' then return json_build_object('ok', true, 'state', 'already'); end if;
  if f.status = 'pending' and f.requested_by = other then           -- they asked me first: accept
    if friends_count(me) >= 100 or friends_count(other) >= 100 then return json_build_object('error', 'limit_friends'); end if;
    update friendships set status = 'accepted', accepted_at = now() where a = f.a and b = f.b;
    return json_build_object('ok', true, 'state', 'accepted');
  end if;

  -- the "send" step: the same checks and the same answer whether or not there is a block
  if friends_count(me) >= 100 then return json_build_object('error', 'limit_friends'); end if;
  if (select count(*) from friend_sends s where s.uid = me and not s.miss and s.at > now() - interval '1 day') >= 20 then
    return json_build_object('error', 'limit_day');
  end if;
  insert into friend_sends (uid) values (me);
  delete from friend_sends where at < now() - interval '2 days';
  if friends_blocked(me, other) then return json_build_object('ok', true, 'state', 'sent'); end if;   -- never reveal a block
  insert into friendships (a, b, status, requested_by) values (least(me, other), greatest(me, other), 'pending', me)
  on conflict (a, b) do nothing;                                     -- my request is already waiting: still "sent"
  return json_build_object('ok', true, 'state', 'sent');
end $$;

-- accept or decline a request someone sent me
create or replace function public.friend_answer(tok text, other uuid, accept boolean)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok); g text := duel_guard(uid);
begin
  if g is not null then return json_build_object('error', g); end if;
  if not exists (select 1 from friendships where a = least(uid, other) and b = greatest(uid, other)
                  and status = 'pending' and requested_by = other) then
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

-- unfriend, or cancel my own request
create or replace function public.friend_remove(tok text, other uuid)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok); g text := duel_guard(uid);
begin
  if g is not null then return json_build_object('error', g); end if;
  delete from friendships where a = least(uid, other) and b = greatest(uid, other);
  return json_build_object('ok', true);
end $$;

-- silent block: removes the friendship (and any request), stops all later adds
create or replace function public.friend_block(tok text, other uuid)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok); g text := duel_guard(uid);
begin
  if g is not null then return json_build_object('error', g); end if;
  if other is null or other = uid then return json_build_object('error', 'self'); end if;
  if not exists (select 1 from accounts where id = other) then return json_build_object('error', 'no_user'); end if;
  insert into blocks (blocker, blocked) values (uid, other) on conflict do nothing;
  delete from friendships where a = least(uid, other) and b = greatest(uid, other);
  return json_build_object('ok', true);
end $$;

-- report someone to the admin (fixed reasons only); 20 reports a day per reporter
create or replace function public.friend_report(tok text, other uuid, reason text, duel uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok); g text := duel_guard(uid);
begin
  if g is not null then return json_build_object('error', g); end if;
  if reason is null or reason not in ('name', 'spam', 'other') then return json_build_object('error', 'reason'); end if;
  if other is null or other = uid then return json_build_object('error', 'self'); end if;
  if not exists (select 1 from accounts where id = other) then return json_build_object('error', 'no_user'); end if;
  if (select count(*) from reports r where r.reporter = uid and r.created_at > now() - interval '1 day') >= 20 then
    return json_build_object('error', 'limit_day');
  end if;
  insert into reports (reporter, reported, reason, duel_id) values (uid, other, reason, duel);
  return json_build_object('ok', true);
end $$;

-- heartbeat every ~20 s while the site is open; invites/live are filled by the duels migration
create or replace function public.presence_ping(tok text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := account_from(tok); g text := duel_guard(uid);
begin
  if g is not null then return json_build_object('error', g); end if;
  update accounts set online_at = now() where id = uid;
  return json_build_object('now', now(), 'invites', '[]'::json, 'live', null);
end $$;

-- ── admin ───────────────────────────────────────────────────────────────────
create or replace function public.admin_set_tester(tok uuid, account uuid, "on" boolean)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  update accounts set duel_tester = coalesce($3, false) where id = $2;
  if not found then return json_build_object('error', 'no_user'); end if;
  return json_build_object('ok', true, 'id', $2, 'on', coalesce($3, false));
end $$;

create or replace function public.admin_reports(tok uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return coalesce((select json_agg(x order by x.done, x.created_at desc) from (
    select r.id, r.reason, r.duel_id, r.created_at, r.done,
           r.reporter as reporter_id, ra.username as reporter,
           r.reported as reported_id, rb.username as reported,
           (select count(*) from reports r2 where r2.reported = r.reported) as reported_total
      from reports r
      left join accounts ra on ra.id = r.reporter
      left join accounts rb on rb.id = r.reported
     order by r.done, r.created_at desc
     limit 300) x), '[]');
end $$;

create or replace function public.admin_report_done(tok uuid, id bigint)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  update reports set done = true where reports.id = admin_report_done.id;
  return json_build_object('ok', true);
end $$;

-- ── who may call what ───────────────────────────────────────────────────────
-- internal helpers: not callable from the site
revoke execute on function public.friend_code_new(), public.duel_switch(), public.duel_guard(uuid), public.duel_level(uuid),
  public.friends_blocked(uuid, uuid), public.friends_count(uuid), public.account_json(uuid)
  from public, anon, authenticated;
-- public entry points (each checks the session token and the switch)
revoke execute on function public.friends_me(text), public.friend_add(text, text), public.friend_answer(text, uuid, boolean),
  public.friend_remove(text, uuid), public.friend_block(text, uuid), public.friend_report(text, uuid, text, uuid),
  public.presence_ping(text), public.admin_set_setting(uuid, text, jsonb), public.admin_set_tester(uuid, uuid, boolean),
  public.admin_reports(uuid), public.admin_report_done(uuid, bigint) from public;
grant execute on function public.friends_me(text), public.friend_add(text, text), public.friend_answer(text, uuid, boolean),
  public.friend_remove(text, uuid), public.friend_block(text, uuid), public.friend_report(text, uuid, text, uuid),
  public.presence_ping(text), public.admin_set_setting(uuid, text, jsonb), public.admin_set_tester(uuid, uuid, boolean),
  public.admin_reports(uuid), public.admin_report_done(uuid, bigint) to anon, authenticated;
