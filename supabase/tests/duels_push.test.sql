-- Duels, task 12: Web Push for invites (push_subs, push_save/remove, push_info/done,
-- duel_invite → pg_net when the invitee is offline).
-- Run: supabase test db   (local Supabase must be running)
-- pg_net only queues requests (net.http_request_queue) and sends them after the
-- commit; this file rolls back, so nothing is ever sent.
begin;
create extension if not exists pgtap with schema extensions;

select plan(68);

-- ── helpers ─────────────────────────────────────────────────────────────────
create temporary table t_acc (name text primary key, tok text, id uuid);
create function pg_temp.mk(n text) returns uuid language plpgsql as $$
declare r json;
begin
  r := public.account_signup(n, 'passw0rd1', '8', public.account_terms_version(), true, true, null);
  if r->>'token' is null then raise exception 'signup failed for %: %', n, r; end if;
  insert into t_acc values (n, r->>'token', (r->'account'->>'id')::uuid);
  return (r->'account'->>'id')::uuid;
end $$;
create function pg_temp.tok(n text) returns text language sql as $$ select tok from t_acc where name = n $$;
create function pg_temp.uid(n text) returns uuid language sql as $$ select id from t_acc where name = n $$;
create function pg_temp.befriend(x text, y text) returns void language sql as $$
  insert into public.friendships (a, b, status, requested_by, accepted_at)
  values (least(pg_temp.uid(x), pg_temp.uid(y)), greatest(pg_temp.uid(x), pg_temp.uid(y)), 'accepted', pg_temp.uid(x), now());
$$;
-- a browser-like subscription: FCM endpoint, 65-byte key (87 chars), 16-byte auth (22 chars)
create function pg_temp.sub(tag text, host text default 'fcm.googleapis.com') returns jsonb language sql as $$
  select jsonb_build_object('endpoint', 'https://' || host || '/fcm/send/' || tag,
    'keys', jsonb_build_object('p256dh', 'B' || repeat('a', 86), 'auth', repeat('z', 22)));
$$;
create function pg_temp.save(n text, s jsonb) returns text language sql as $$
  select coalesce(public.push_save(pg_temp.tok(n), s)->>'error', 'ok')
$$;
create function pg_temp.subs(n text) returns int language sql as $$ select count(*)::int from public.push_subs where uid = pg_temp.uid(n) $$;
create function pg_temp.queued() returns int language sql as $$
  select count(*)::int from net.http_request_queue where url = 'http://push.test/duel-push'
$$;
create function pg_temp.uncool(x text) returns void language sql as $$
  update public.duels set created_at = created_at - interval '31 seconds' where a = pg_temp.uid(x);
$$;
create function pg_temp.close_all() returns void language sql as $$
  update public.duels set status = 'cancelled' where status in ('invited', 'accepted', 'live');
$$;

select pg_temp.mk('dp_a');
select pg_temp.mk('dp_b');
select pg_temp.mk('dp_c');
select pg_temp.befriend('dp_a', 'dp_b');
select pg_temp.befriend('dp_c', 'dp_b');
update public.site_settings set value = '"on"' where key = 'duels';
delete from vault.secrets where name in ('push_secret', 'push_url');   -- a dev database may hold them (rolled back below)
select vault.create_secret('push-test-secret', 'push_secret');
select vault.create_secret('http://push.test/duel-push', 'push_url');

-- ── table and privileges ────────────────────────────────────────────────────
select ok((select relrowsecurity from pg_class where oid = 'public.push_subs'::regclass), 'push_subs: RLS on');
select ok(not has_table_privilege('anon', 'public.push_subs', 'select')
      and not has_table_privilege('anon', 'public.push_subs', 'insert')
      and not has_table_privilege('authenticated', 'public.push_subs', 'select'), 'push_subs: no table access for the site');
select ok(has_function_privilege('anon', 'public.push_save(text, jsonb)', 'execute')
      and has_function_privilege('anon', 'public.push_remove(text, text)', 'execute')
      and has_function_privilege('anon', 'public.push_info(text, uuid, uuid)', 'execute')
      and has_function_privilege('anon', 'public.push_done(text, text[], text[])', 'execute'), 'entry points callable by the site');
select ok(not has_function_privilege('anon', 'public.duel_push_invite(uuid, uuid)', 'execute')
      and not has_function_privilege('anon', 'public.push_secret_ok(text)', 'execute')
      and not has_function_privilege('authenticated', 'public.duel_push_invite(uuid, uuid)', 'execute')
      and not has_function_privilege('anon', 'public.push_live(public.push_subs, uuid)', 'execute'), 'internal helpers are not');
select ok(has_function_privilege('anon', 'public.duel_invite(text, uuid, text)', 'execute'), 'duel_invite still callable');

-- ── push_save ───────────────────────────────────────────────────────────────
select throws_ok($$ select public.push_save('nope', pg_temp.sub('x')) $$, '28000', null, 'dead session → unauthorized');
update public.site_settings set value = '"off"' where key = 'duels';
select is(pg_temp.save('dp_b', pg_temp.sub('b1')), 'off', 'switch off → off');
update public.site_settings set value = '"test"' where key = 'duels';
select is(pg_temp.save('dp_b', pg_temp.sub('b1')), 'off', 'test mode, not a tester → off');
update public.accounts set duel_tester = true where id = pg_temp.uid('dp_b');
select is(pg_temp.save('dp_b', pg_temp.sub('b1')), 'ok', 'test mode, tester → saved');
update public.accounts set duel_tester = false where id = pg_temp.uid('dp_b');
update public.site_settings set value = '"on"' where key = 'duels';
delete from public.push_subs;

select is(pg_temp.save('dp_b', null), 'sub', 'no subscription → sub');
select is(pg_temp.save('dp_b', '"x"'::jsonb), 'sub', 'not an object → sub');
select is(pg_temp.save('dp_b', pg_temp.sub('b1') - 'endpoint'), 'sub', 'no endpoint → sub');
select is(pg_temp.save('dp_b', jsonb_set(pg_temp.sub('b1'), '{endpoint}', '"http://fcm.googleapis.com/fcm/send/x"')), 'sub', 'http endpoint → sub');
select is(pg_temp.save('dp_b', pg_temp.sub('b1', 'evil.example.com')), 'sub', 'unknown push service → sub');
select is(pg_temp.save('dp_b', pg_temp.sub('b1', 'fcm.googleapis.com.evil.com')), 'sub', 'look-alike host → sub');
select is(pg_temp.save('dp_b', jsonb_set(pg_temp.sub('b1'), '{endpoint}', '"https://evil.com/fcm.googleapis.com/"')), 'sub', 'push host only in the path → sub');
select is(pg_temp.save('dp_b', jsonb_set(pg_temp.sub('b1'), '{keys,p256dh}', '"short"')), 'sub', 'bad p256dh → sub');
select is(pg_temp.save('dp_b', jsonb_set(pg_temp.sub('b1'), '{keys,auth}', '"bad auth!!"')), 'sub', 'bad auth → sub');
select is(pg_temp.save('dp_b', jsonb_set(pg_temp.sub('b1'), '{endpoint}', to_jsonb('https://fcm.googleapis.com/' || repeat('x', 1000)))), 'sub', 'huge endpoint → sub');
select is(pg_temp.subs('dp_b'), 0, 'nothing saved by the bad ones');

select is(pg_temp.save('dp_b', pg_temp.sub('b1')), 'ok', 'Chrome/Android (FCM) → saved');
select is(pg_temp.save('dp_b', pg_temp.sub('m1', 'updates.push.services.mozilla.com')), 'ok', 'Firefox → saved');
select is(pg_temp.save('dp_b', pg_temp.sub('i1', 'web.push.apple.com')), 'ok', 'Safari/iPhone → saved');
select is(pg_temp.save('dp_b', pg_temp.sub('w1', 'wns2-db5p.notify.windows.com')), 'ok', 'Edge (WNS) → saved');
select is(pg_temp.save('dp_b', pg_temp.sub('j1', 'jmt17.google.com')), 'ok', 'newer Chrome (jmt17.google.com) → saved');
select is(pg_temp.save('dp_b', pg_temp.sub('j1', 'google.com.evil.com')), 'sub', 'google.com look-alike → sub');
select is(public.push_remove(pg_temp.tok('dp_b'), 'https://jmt17.google.com/fcm/send/j1')->>'ok', 'true', '(removed again)');
select is(pg_temp.subs('dp_b'), 4, 'four devices');
select is(pg_temp.save('dp_b', pg_temp.sub('b1')), 'ok', 'same device again (double tap) → ok');
select is(pg_temp.subs('dp_b'), 4, '… still four rows');
select is((select sess from public.push_subs where endpoint like '%/b1'), encode(extensions.digest(pg_temp.tok('dp_b'), 'sha256'), 'hex'),
          'row remembers the saving session (hash, never the token)');
update public.push_subs set created_at = now() - interval '1 day' where endpoint like '%/b1';   -- the oldest
select pg_temp.save('dp_b', pg_temp.sub('b2')) = 'ok' as saved;
select pg_temp.save('dp_b', pg_temp.sub('b3')) = 'ok' as saved;
select is(pg_temp.subs('dp_b'), 5, 'six devices → five kept');
select ok(not exists (select 1 from public.push_subs where endpoint like '%/b1'), '… the oldest one went');
-- the same device, now signed in as someone else, moves to them
select is(pg_temp.save('dp_c', pg_temp.sub('b3')), 'ok', 'C saves B''s device');
select is((select uid from public.push_subs where endpoint like '%/b3'), pg_temp.uid('dp_c'), '… it is C''s now');
select is(pg_temp.subs('dp_b'), 4, '… B has four left');

-- ── push_remove ─────────────────────────────────────────────────────────────
select throws_ok($$ select public.push_remove('nope', 'x') $$, '28000', null, 'remove: dead session → unauthorized');
select is(public.push_remove(pg_temp.tok('dp_a'), 'https://fcm.googleapis.com/fcm/send/b2')->>'ok', 'true', 'A removes B''s device → ok …');
select is(pg_temp.subs('dp_b'), 4, '… but nothing happened');
update public.site_settings set value = '"off"' where key = 'duels';
select is(public.push_remove(pg_temp.tok('dp_b'), 'https://fcm.googleapis.com/fcm/send/b2')->>'ok', 'true', 'B removes own device (switch off too)');
update public.site_settings set value = '"on"' where key = 'duels';
select is(pg_temp.subs('dp_b'), 3, '… gone');

-- ── duel_invite → push call ─────────────────────────────────────────────────
-- B is offline (never pinged) and has devices → one queued call
create temporary table t_d (k text primary key, id uuid);
insert into t_d select 'one', (public.duel_invite(pg_temp.tok('dp_a'), pg_temp.uid('dp_b'), 'alg')->>'id')::uuid;
select ok((select id from t_d where k = 'one') is not null, 'invite works as before');
select is(pg_temp.queued(), 1, 'offline invitee with a device → one push call queued');
select is((select convert_from(body, 'utf8')::jsonb from net.http_request_queue where url = 'http://push.test/duel-push' order by id desc limit 1),
          jsonb_build_object('duel_id', (select id from t_d where k = 'one'), 'to_uid', pg_temp.uid('dp_b')),
          'body = {duel_id, to_uid} only');
select is((select headers->>'x-push-secret' from net.http_request_queue where url = 'http://push.test/duel-push' order by id desc limit 1),
          'push-test-secret', 'secret travels in the header');
select is((select method::text from net.http_request_queue where url = 'http://push.test/duel-push' order by id desc limit 1), 'POST', 'POST');

-- push_info for that invite
select is(public.push_info('wrong', (select id from t_d where k = 'one'), pg_temp.uid('dp_b'))->>'error', 'secret', 'info: wrong secret → secret');
select is(public.push_info(null, (select id from t_d where k = 'one'), pg_temp.uid('dp_b'))->>'error', 'secret', 'info: no secret → secret');
select is(public.push_info('push-test-secret', (select id from t_d where k = 'one'), pg_temp.uid('dp_a'))->>'error', 'gone', 'info: not the invitee → gone');
select is(public.push_info('push-test-secret', gen_random_uuid(), pg_temp.uid('dp_b'))->>'error', 'gone', 'info: no such duel → gone');
create temporary table t_info as select public.push_info('push-test-secret', (select id from t_d where k = 'one'), pg_temp.uid('dp_b'))::jsonb as j;
select is((select j->>'from' from t_info), 'dp_a', 'info: sender''s username');
select is((select j->>'subject' from t_info), 'alg', 'info: subject');
select is((select jsonb_array_length(j->'subs') from t_info), 3, 'info: B''s three devices');
select ok((select (j->'subs'->0) ?& array['endpoint', 'p256dh', 'auth'] and not (j->'subs'->0) ? 'sess' from t_info), 'info: endpoint + keys, nothing else');

-- push_done: ok → last_ok_at, gone → deleted
select is(public.push_done('wrong', array['https://fcm.googleapis.com/fcm/send/b3'], null)->>'error', 'secret', 'done: wrong secret → secret');
select is(public.push_done('push-test-secret',
            array['https://updates.push.services.mozilla.com/fcm/send/m1'],
            array['https://web.push.apple.com/fcm/send/i1'])->>'removed', '1', 'done: one dead device removed');
select ok((select last_ok_at is not null from public.push_subs where endpoint like '%/m1'), 'done: delivered device gets last_ok_at');
select is(pg_temp.subs('dp_b'), 2, 'done: B has two devices left');

-- the invite is answered / expired → nothing to send
update public.duels set expires_at = now() - interval '1 second' where id = (select id from t_d where k = 'one');
select is(public.push_info('push-test-secret', (select id from t_d where k = 'one'), pg_temp.uid('dp_b'))->>'error', 'gone', 'info: expired invite → gone');
select pg_temp.close_all();

-- B signs out on every device → their devices get no more pushes (and no call is made)
select public.account_logout(pg_temp.tok('dp_b'));
select pg_temp.uncool('dp_a');
insert into t_d select 'two', (public.duel_invite(pg_temp.tok('dp_a'), pg_temp.uid('dp_b'), 'num')->>'id')::uuid;
select ok((select id from t_d where k = 'two') is not null, 'invite after B signed out: works');
select is(pg_temp.queued(), 1, '… no push call (no signed-in device)');
select is((select jsonb_array_length(public.push_info('push-test-secret', (select id from t_d where k = 'two'), pg_temp.uid('dp_b'))::jsonb->'subs')), 0,
          '… and push_info lists no device');
select pg_temp.close_all();

-- C (online right now) has a device: invited by B → no push, the in-site drop-in is enough
update public.accounts set online_at = now() - interval '20 seconds' where id = pg_temp.uid('dp_c');
create temporary table t_b2 as select public.account_login('dp_b', 'passw0rd1')::jsonb as j;   -- B signs in again
update t_acc set tok = (select j->>'token' from t_b2) where name = 'dp_b';
select ok((public.duel_invite(pg_temp.tok('dp_b'), pg_temp.uid('dp_c'), 'geo')->>'id') is not null, 'B invites C (online)');
select is(pg_temp.queued(), 1, '… online invitee → no push call');
select pg_temp.close_all();
-- C offline for 71 s → a call
update public.accounts set online_at = now() - interval '71 seconds' where id = pg_temp.uid('dp_c');
select pg_temp.uncool('dp_b');
select ok((public.duel_invite(pg_temp.tok('dp_b'), pg_temp.uid('dp_c'), 'geo')->>'id') is not null, 'B invites C (offline 71 s)');
select is(pg_temp.queued(), 2, '… offline → push call');
select pg_temp.close_all();

-- no push_url in Vault → invites still work, no call
delete from vault.secrets where name = 'push_url';
select pg_temp.uncool('dp_b');
select ok((public.duel_invite(pg_temp.tok('dp_b'), pg_temp.uid('dp_c'), 'fn')->>'id') is not null, 'no push_url: invite still works');
select is(pg_temp.queued(), 2, '… and nothing is queued');

select * from finish();
rollback;
