-- ============================================================================
-- Duels, phase 1b: Web Push for invites (2026-11-09). Spec §7.4.
-- ----------------------------------------------------------------------------
--  * A student turns on duel notifications on a device (a tap in the hub, after
--    their first duel). The browser's push subscription is kept in push_subs
--    (one row per device; the same device signing in as someone else moves to
--    that student). Each row remembers the session it was saved with: once that
--    session ends (sign out, expiry, password reset, account deleted) the device
--    gets no more pushes for that student — nothing to clean up on the phone.
--  * duel_invite (same behaviour as in 20261108110000_duels_core.sql) now also
--    asks the edge function duel-push to send a notification when the invitee
--    is OFFLINE (no presence_ping for 70 s) and has a subscription. The call is
--    async (pg_net: queued now, sent after the commit; a rolled-back invite
--    sends nothing) and can never break or slow down the invite.
--  * The call carries only {duel_id, to_uid} and the shared secret in a header.
--    The function looks up the sender's name, the subject and the devices with
--    push_info(secret, …) and reports dead devices back with push_done(secret, …).
--  * Settings live in Vault, never in a migration (set on each project by hand):
--      push_secret  = the edge function's PUSH_SECRET (shared secret)
--      push_url     = https://<ref>.supabase.co/functions/v1/duel-push
--    Either one missing → no pushes at all (fail closed, invites still work).
--  * Quiet hours (21:00–07:00 Israel) are decided by the edge function.
--  * Table: RLS on, no grants; only the functions below touch it.
-- ============================================================================

create extension if not exists pg_net with schema extensions;

-- ── table ───────────────────────────────────────────────────────────────────
create table if not exists public.push_subs (
  uid        uuid not null references public.accounts(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  sess       text not null,                      -- account_sessions.token_hash of the session that saved it
  created_at timestamptz not null default now(),
  last_ok_at timestamptz                         -- last time the push service took a message
);
create index if not exists push_subs_uid on public.push_subs (uid);

alter table public.push_subs enable row level security;
revoke all on public.push_subs from public, anon, authenticated;

-- ── the student's device ────────────────────────────────────────────────────
-- sub = PushSubscription.toJSON(): {endpoint, keys: {p256dh, auth}}.
-- Only the real browser push services are accepted (Chrome/Android = FCM, which
-- newer Chrome hands out as https://jmt17.google.com/fcm/send/…; Firefox = Mozilla;
-- Safari/iPhone = Apple; Edge = WNS), so the edge function never POSTs to an
-- address a student made up.
-- At most 5 devices per student (the oldest goes). Errors: off, sub.
create or replace function public.push_save(tok text, sub jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := account_from(tok); g text := duel_guard(me);
        h text := encode(digest(coalesce(tok, ''), 'sha256'), 'hex');
        ep text; k1 text; k2 text;
begin
  if g is not null then return json_build_object('error', g); end if;
  if sub is null or jsonb_typeof(sub) <> 'object' then return json_build_object('error', 'sub'); end if;
  ep := sub->>'endpoint'; k1 := sub#>>'{keys,p256dh}'; k2 := sub#>>'{keys,auth}';
  if ep is null or length(ep) > 1000
     or ep !~ '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|google\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)/[!-~]*$'
     or k1 is null or k1 !~ '^[A-Za-z0-9_-]{86,88}={0,2}$'          -- 65-byte P-256 point, base64url
     or k2 is null or k2 !~ '^[A-Za-z0-9_-]{20,24}={0,2}$' then      -- 16-byte auth secret
    return json_build_object('error', 'sub');
  end if;
  perform pg_advisory_xact_lock(hashtext('push:' || me::text));   -- double taps: one at a time
  insert into push_subs (uid, endpoint, p256dh, auth, sess) values (me, ep, k1, k2, h)
  on conflict (endpoint) do update
     set uid = excluded.uid, p256dh = excluded.p256dh, auth = excluded.auth, sess = excluded.sess,
         created_at = case when push_subs.uid = excluded.uid then push_subs.created_at else now() end;
  -- my devices whose session has ended, then the oldest beyond 5
  delete from push_subs s where s.uid = me
     and not exists (select 1 from account_sessions x where x.token_hash = s.sess and x.account_id = me and x.expires_at > now());
  delete from push_subs where uid = me and endpoint in (
    select endpoint from push_subs where uid = me order by created_at desc offset 5);
  return json_build_object('ok', true);
end $$;

-- this device stops getting duel notifications (turned off, or signing out).
-- Works with the switch off too (a student can always leave). Errors: none.
create or replace function public.push_remove(tok text, endpoint text)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := account_from(tok);
begin
  delete from push_subs s where s.uid = me and s.endpoint = push_remove.endpoint;
  return json_build_object('ok', true);
end $$;

-- a device still belongs to a signed-in session of u
create or replace function public.push_live(s push_subs, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select s.uid = u and exists (select 1 from account_sessions x where x.token_hash = s.sess and x.account_id = u and x.expires_at > now());
$$;

-- ── edge function side (shared secret = Vault 'push_secret') ────────────────
create or replace function public.push_secret_ok(secret text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  begin
    select decrypted_secret into v from vault.decrypted_secrets where name = 'push_secret' order by created_at desc limit 1;
  exception when others then v := null;
  end;
  return v is not null and v <> '' and secret is not null and secret = v;
end $$;

-- what to send: the open invite to_uid got, who sent it, and to_uid's devices.
-- Errors: secret, gone (no such invite / not to_uid's / answered / expired / switched off).
create or replace function public.push_info(secret text, duel_id uuid, to_uid uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare d duels;
begin
  if not push_secret_ok(secret) then return json_build_object('error', 'secret'); end if;
  select * into d from duels where id = push_info.duel_id;
  if not found or d.b is distinct from to_uid or d.status <> 'invited' or d.expires_at <= now()
     or duel_guard(d.b) is not null then
    return json_build_object('error', 'gone');
  end if;
  return json_build_object(
    'duel_id', d.id,
    'from', (select username from accounts where id = d.a),
    'subject', d.subject,
    'expires_at', d.expires_at,
    'subs', coalesce((select json_agg(json_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)
                                      order by s.created_at desc)
                        from push_subs s where s.uid = d.b and push_live(s, d.b)), '[]'));
end $$;

-- after sending: ok = endpoints the push service took, gone = endpoints it says
-- no longer exist (HTTP 404/410) → deleted. Errors: secret.
create or replace function public.push_done(secret text, ok text[], gone text[])
returns json language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not push_secret_ok(secret) then return json_build_object('error', 'secret'); end if;
  update push_subs set last_ok_at = now() where endpoint = any(coalesce(ok, '{}'));
  delete from push_subs where endpoint = any(coalesce(gone, '{}'));
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'removed', n);
end $$;

-- ── the call from duel_invite ───────────────────────────────────────────────
-- queued only when the invitee is offline and has a device; never raises.
create or replace function public.duel_push_invite(d uuid, to_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_secret text; v_url text;
begin
  if exists (select 1 from accounts where id = to_uid and online_at > now() - interval '70 seconds') then return; end if;
  if not exists (select 1 from push_subs s where s.uid = to_uid and push_live(s, to_uid)) then return; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_secret' order by created_at desc limit 1;
  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'push_url'    order by created_at desc limit 1;
  if v_secret is null or v_secret = '' or v_url is null or v_url !~ '^https?://' then return; end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('duel_id', d, 'to_uid', to_uid),
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 10000);
exception when others then
  raise warning 'duel_push_invite failed: %', sqlerrm;
end $$;

-- ── invite (20261108110000_duels_core.sql, unchanged + the push call) ───────
-- errors: subject, not_friend (also for a block, either way — never revealed),
-- cooldown (+wait_s), limit_day, busy (either player has an open duel)
create or replace function public.duel_invite(tok text, friend uuid, subject text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := duel_uid(tok); g text := duel_guard(me);           -- no accounts write before duel_tidy (lock order)
  last timestamptz; d duels;
begin
  if g is not null then return json_build_object('error', g); end if;
  if subject is null or subject not in ('random', 'num', 'alg', 'fn', 'geo') then
    return json_build_object('error', 'subject');
  end if;
  if friend is null or friend = me or duel_guard(friend) is not null or friends_blocked(me, friend)
     or not exists (select 1 from friendships where a = least(me, friend) and b = greatest(me, friend) and status = 'accepted') then
    return json_build_object('error', 'not_friend');
  end if;
  -- both players, always in the same order: double taps and two people inviting
  -- the same friend at once are handled one after the other
  perform pg_advisory_xact_lock(hashtext('duel:' || least(me, friend)::text));
  perform pg_advisory_xact_lock(hashtext('duel:' || greatest(me, friend)::text));

  select max(created_at) into last from duels where a = me;
  if last > now() - interval '30 seconds' then
    return json_build_object('error', 'cooldown',
      'wait_s', greatest(1, ceil(30 - extract(epoch from now() - last)))::int);
  end if;
  if (select count(*) from duels where a = me
        and (created_at at time zone 'Asia/Jerusalem')::date = (now() at time zone 'Asia/Jerusalem')::date) >= 40 then
    return json_build_object('error', 'limit_day');
  end if;
  perform duel_tidy(me);
  perform duel_tidy(friend);
  if exists (select 1 from duels where status in ('invited', 'accepted', 'live')
               and (a in (me, friend) or b in (me, friend))) then
    return json_build_object('error', 'busy');
  end if;

  insert into duels (a, b, subject) values (me, friend, duel_invite.subject) returning * into d;
  perform duel_hint((select inbox from accounts where id = friend), 'invite', jsonb_build_object('id', d.id));
  perform duel_push_invite(d.id, friend);                            -- offline friend with a device → notification
  return json_build_object('id', d.id, 'expires_at', d.expires_at);
end $$;

-- ── who may call what ───────────────────────────────────────────────────────
revoke execute on function public.push_secret_ok(text), public.duel_push_invite(uuid, uuid), public.push_live(public.push_subs, uuid)
  from public, anon, authenticated;
revoke execute on function public.push_save(text, jsonb), public.push_remove(text, text),
  public.push_info(text, uuid, uuid), public.push_done(text, text[], text[]) from public;
-- push_info / push_done are called by the edge function with the public key (like
-- duel_put_questions); they check the Vault secret themselves.
grant execute on function public.push_save(text, jsonb), public.push_remove(text, text),
  public.push_info(text, uuid, uuid), public.push_done(text, text[], text[]) to anon, authenticated, service_role;
