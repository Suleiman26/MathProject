-- Duels, task 1: friends, presence and the release switch.
-- Run: supabase test db   (local Supabase must be running)
begin;
create extension if not exists pgtap with schema extensions;

select plan(109);

-- ── helpers ─────────────────────────────────────────────────────────────────
create temporary table t_acc (name text primary key, tok text, id uuid);

-- sign up a student through the real sign-up function; remembers token + id
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
create function pg_temp.code(n text) returns text language sql as $$ select friend_code from public.accounts a join t_acc t on t.id = a.id where t.name = n $$;
-- quick account without bcrypt (for bulk cases)
create function pg_temp.bulk(prefix text, n int) returns void language sql as $$
  insert into public.accounts (username, pass_hash, terms_version, terms_at, parent_ok)
  select prefix || g, 'x', public.account_terms_version(), now(), true from generate_series(1, n) g;
$$;

select pg_temp.mk('duel_alice');
select pg_temp.mk('duel_bob');
select pg_temp.mk('duel_carol');
select pg_temp.mk('duel_dan');
update public.site_settings set value = '"on"' where key = 'duels';

-- ── switch seed + friend codes ──────────────────────────────────────────────
select ok(exists (select 1 from public.site_settings where key = 'duels'), 'duels setting exists');

select pg_temp.bulk('duel_bulk_', 200);
select is((select count(*)::int from public.accounts where username like 'duel_bulk_%'
            and friend_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'), 200,
          '200 new accounts all get a 6-char code from the alphabet');
select is((select count(distinct friend_code)::int from public.accounts where username like 'duel_bulk_%'), 200,
          'the 200 codes are unique');
select ok(pg_temp.code('duel_alice') ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$', 'sign-up gives a friend code');
select ok((select inbox from public.accounts where id = pg_temp.uid('duel_alice')) ~ '^[0-9a-f]{32}$', 'sign-up gives a 32-char inbox');
select is((public.account_me(pg_temp.tok('duel_alice'))->>'friend_code'), pg_temp.code('duel_alice'), 'account_me returns the own friend code');
select ok((public.account_me(pg_temp.tok('duel_alice'))->>'inbox') is not null, 'account_me returns the own inbox');

-- ── add, accept, already ────────────────────────────────────────────────────
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_bob'))::jsonb,
          '{"ok":true,"state":"sent"}'::jsonb, 'A adds B by code → sent');
select is((select count(*)::int from json_array_elements(public.friends_me(pg_temp.tok('duel_bob'))->'incoming') x
            where (x->>'id')::uuid = pg_temp.uid('duel_alice')), 1, 'B sees A in incoming');
select is((select count(*)::int from json_array_elements(public.friends_me(pg_temp.tok('duel_alice'))->'outgoing') x
            where (x->>'id')::uuid = pg_temp.uid('duel_bob')), 1, 'A sees B in outgoing');
select is(public.friend_answer(pg_temp.tok('duel_bob'), pg_temp.uid('duel_alice'), true)->>'state', 'accepted', 'B accepts');
select is((select count(*)::int from json_array_elements(public.friends_me(pg_temp.tok('duel_alice'))->'friends') x
            where (x->>'id')::uuid = pg_temp.uid('duel_bob')), 1, 'A has B as friend');
select is((select count(*)::int from json_array_elements(public.friends_me(pg_temp.tok('duel_bob'))->'friends') x
            where (x->>'id')::uuid = pg_temp.uid('duel_alice')), 1, 'B has A as friend');
select is(json_array_length(public.friends_me(pg_temp.tok('duel_bob'))->'incoming'), 0, 'B incoming empty after accepting');
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_bob'))->>'state', 'already', 'adding again → already');
select is((select x->>'username' from json_array_elements(public.friends_me(pg_temp.tok('duel_alice'))->'friends') x limit 1),
          'duel_bob', 'friend row carries the username');
select is((select (x->>'level')::int from json_array_elements(public.friends_me(pg_temp.tok('duel_alice'))->'friends') x limit 1),
          1, 'a new friend is level 1');

-- adding someone who already asked you accepts the request
select is(public.friend_add(pg_temp.tok('duel_carol'), pg_temp.code('duel_alice'))->>'state', 'sent', 'C asks A');
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_carol'))->>'state', 'accepted', 'A adds C back → accepted');

-- ── errors ──────────────────────────────────────────────────────────────────
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_alice'))::jsonb, '{"error":"self"}'::jsonb, 'own code → self');
select is(public.friend_add(pg_temp.tok('duel_alice'), 'ZZZZZ1')->>'error', 'no_code', 'unknown code → no_code');
select is(public.friend_add(pg_temp.tok('duel_alice'), lower(pg_temp.code('duel_dan')))->>'state', 'sent', 'code is case-insensitive');

-- 20 requests a day, the 21st is refused
select pg_temp.bulk('duel_lim_', 21);
select is((select count(*)::int from public.accounts a where a.username like 'duel_lim_%'
             and public.friend_add(pg_temp.tok('duel_dan'), a.friend_code)->>'state' = 'sent'
             and a.username <> 'duel_lim_21'), 20, 'D sends 20 requests');
select is(public.friend_add(pg_temp.tok('duel_dan'), (select friend_code from public.accounts where username = 'duel_lim_21'))::jsonb,
          '{"error":"limit_day"}'::jsonb, '21st request in a day → limit_day');

-- ── block (B blocks A) ──────────────────────────────────────────────────────
create function pg_temp.has(lst text, viewer text, who text) returns int language sql as $$
  select count(*)::int from json_array_elements(public.friends_me(pg_temp.tok(viewer))->lst) x where (x->>'id')::uuid = pg_temp.uid(who)
$$;
select is(public.friend_block(pg_temp.tok('duel_bob'), pg_temp.uid('duel_alice'))->>'ok', 'true', 'B blocks A');
select is(pg_temp.has('friends', 'duel_bob', 'duel_alice'), 0, 'B no longer has A as friend');
select is(pg_temp.has('friends', 'duel_alice', 'duel_bob'), 0, 'A no longer has B as friend');
select is(pg_temp.has('blocked', 'duel_bob', 'duel_alice'), 1, 'B sees A in its blocked list');
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_bob'))::jsonb,
          '{"ok":true,"state":"sent"}'::jsonb, 'blocked A adding B looks like a normal send');
select is(pg_temp.has('outgoing', 'duel_alice', 'duel_bob'), 1, 'A outgoing shows B, like a normal request');
select is(json_array_length(public.friends_me(pg_temp.tok('duel_bob'))->'incoming'), 0, 'B incoming stays empty');
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_bob'))->>'state', 'sent', 'A adding B again → still sent');
select is((select status from public.friendships
            where a = least(pg_temp.uid('duel_alice'), pg_temp.uid('duel_bob'))
              and b = greatest(pg_temp.uid('duel_alice'), pg_temp.uid('duel_bob'))), 'shadow', 'only a shadow row exists between A and B');
select is(public.friend_answer(pg_temp.tok('duel_bob'), pg_temp.uid('duel_alice'), true)::jsonb, '{"error":"gone"}'::jsonb, 'a shadow can never be accepted');
select is(public.friend_add(pg_temp.tok('duel_bob'), pg_temp.code('duel_alice'))::jsonb, '{"error":"you_blocked"}'::jsonb, 'blocker adding the blocked → you_blocked');
select is(public.friend_remove(pg_temp.tok('duel_bob'), pg_temp.uid('duel_alice'))->>'ok', 'true', 'B removes A');
select is(pg_temp.has('outgoing', 'duel_alice', 'duel_bob'), 1, 'B removing does not touch A''s shadow request');
select is(public.friend_remove(pg_temp.tok('duel_alice'), pg_temp.uid('duel_bob'))->>'ok', 'true', 'A cancels the request to B');
select is(pg_temp.has('outgoing', 'duel_alice', 'duel_bob'), 0, 'A outgoing no longer shows B');
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_bob'))->>'state', 'sent', 'A can send again (shadow again)');
select is(pg_temp.has('outgoing', 'duel_alice', 'duel_bob'), 1, 'A outgoing shows B again');
-- unblock: B can add A for real; A's old shadow is replaced by B's real request
select is(public.friend_unblock(pg_temp.tok('duel_bob'), pg_temp.uid('duel_alice'))::jsonb, '{"ok":true}'::jsonb, 'B unblocks A');
select is(json_array_length(public.friends_me(pg_temp.tok('duel_bob'))->'blocked'), 0, 'B blocked list is empty');
select is(public.friend_add(pg_temp.tok('duel_bob'), pg_temp.code('duel_alice'))->>'state', 'sent', 'B adds A after unblocking');
select is(pg_temp.has('incoming', 'duel_alice', 'duel_bob'), 1, 'A gets B''s real request');
select is(pg_temp.has('outgoing', 'duel_alice', 'duel_bob'), 0, 'A''s shadow is gone');
select is(public.friend_answer(pg_temp.tok('duel_alice'), pg_temp.uid('duel_bob'), true)->>'state', 'accepted', 'A accepts B again');

-- a pending request becomes a shadow when the receiver blocks the sender
select pg_temp.mk('duel_fay');
select pg_temp.mk('duel_gus');
select is(public.friend_add(pg_temp.tok('duel_fay'), pg_temp.code('duel_gus'))->>'state', 'sent', 'F asks G');
select is(public.friend_block(pg_temp.tok('duel_gus'), pg_temp.uid('duel_fay'))->>'ok', 'true', 'G blocks F');
select is(pg_temp.has('outgoing', 'duel_fay', 'duel_gus'), 1, 'F still sees the request as waiting');
select is(pg_temp.has('incoming', 'duel_gus', 'duel_fay'), 0, 'G no longer sees F''s request');

-- ── answer, decline, remove ─────────────────────────────────────────────────
select pg_temp.mk('duel_eve');
select is(public.friend_add(pg_temp.tok('duel_eve'), pg_temp.code('duel_carol'))->>'state', 'sent', 'E asks C');
select is(public.friend_answer(pg_temp.tok('duel_carol'), pg_temp.uid('duel_eve'), false)::jsonb,
          '{"ok":true,"state":"declined"}'::jsonb, 'C declines');
select is(pg_temp.has('incoming', 'duel_carol', 'duel_eve'), 0, 'C incoming is empty after declining');
select is(pg_temp.has('outgoing', 'duel_eve', 'duel_carol'), 0, 'E outgoing is empty after the decline');
select is(public.friend_answer(pg_temp.tok('duel_carol'), pg_temp.uid('duel_eve'), true)::jsonb, '{"error":"gone"}'::jsonb, 'answering a gone request → gone');
select is(public.friend_add(pg_temp.tok('duel_eve'), pg_temp.code('duel_carol'))->>'state', 'sent', 'E asks C again');
select is(public.friend_remove(pg_temp.tok('duel_eve'), pg_temp.uid('duel_carol'))::jsonb, '{"ok":true}'::jsonb, 'E cancels');
select is(pg_temp.has('incoming', 'duel_carol', 'duel_eve'), 0, 'C incoming empty after the cancel');
select is(public.friend_remove(pg_temp.tok('duel_alice'), pg_temp.uid('duel_bob'))::jsonb, '{"ok":true}'::jsonb, 'A unfriends B');
select is(pg_temp.has('friends', 'duel_bob', 'duel_alice'), 0, 'B no longer has A after unfriending');

-- 30 unknown codes a day, then even a real code is refused (codes can't be guessed)
select is((select count(*)::int from generate_series(1, 30) g
            where public.friend_add(pg_temp.tok('duel_eve'), '1111' || g)->>'error' = 'no_code'), 30, '30 unknown codes → no_code');
select is(public.friend_add(pg_temp.tok('duel_eve'), pg_temp.code('duel_alice'))::jsonb, '{"error":"limit_day"}'::jsonb, 'after 30 misses → limit_day');

-- 100 friends max (both when adding and when accepting)
select pg_temp.mk('duel_hank');
select pg_temp.bulk('duel_h100_', 100);
insert into public.friendships (a, b, status, requested_by, accepted_at)
select least(pg_temp.uid('duel_hank'), id), greatest(pg_temp.uid('duel_hank'), id), 'accepted', id, now()
  from public.accounts where username like 'duel_h100_%';
select is(public.friend_add(pg_temp.tok('duel_hank'), pg_temp.code('duel_carol'))::jsonb, '{"error":"limit_friends"}'::jsonb, 'adding a 101st friend → limit_friends');
select is(public.friend_add(pg_temp.tok('duel_carol'), pg_temp.code('duel_hank'))->>'state', 'sent', 'C asks the full H');
select is(public.friend_answer(pg_temp.tok('duel_hank'), pg_temp.uid('duel_carol'), true)::jsonb, '{"error":"limit_friends"}'::jsonb, 'accepting a 101st friend → limit_friends');

-- ── release switch ──────────────────────────────────────────────────────────
update public.site_settings set value = '"off"' where key = 'duels';
select is(public.friends_me(pg_temp.tok('duel_alice'))::jsonb, '{"error":"off"}'::jsonb, 'switch off → friends_me off');
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_carol'))::jsonb, '{"error":"off"}'::jsonb, 'switch off → friend_add off');
select is(public.friend_answer(pg_temp.tok('duel_hank'), pg_temp.uid('duel_carol'), false)::jsonb, '{"error":"off"}'::jsonb, 'switch off → friend_answer off');
select is(public.friend_remove(pg_temp.tok('duel_alice'), pg_temp.uid('duel_carol'))::jsonb, '{"error":"off"}'::jsonb, 'switch off → friend_remove off');
select is(public.friend_block(pg_temp.tok('duel_alice'), pg_temp.uid('duel_carol'))::jsonb, '{"error":"off"}'::jsonb, 'switch off → friend_block off');
select is(public.friend_unblock(pg_temp.tok('duel_gus'), pg_temp.uid('duel_fay'))::jsonb, '{"error":"off"}'::jsonb, 'switch off → friend_unblock off');
select is(public.friend_report(pg_temp.tok('duel_alice'), pg_temp.uid('duel_carol'), 'spam')::jsonb, '{"error":"off"}'::jsonb, 'switch off → friend_report off');
select is(public.presence_ping(pg_temp.tok('duel_alice'))::jsonb, '{"error":"off"}'::jsonb, 'switch off → presence_ping off');
select is((select count(*)::int from public.friendships where status = 'accepted'
            and pg_temp.uid('duel_alice') in (a, b) and pg_temp.uid('duel_carol') in (a, b)), 1, 'nothing changed while off');
update public.site_settings set value = '"test"' where key = 'duels';
update public.accounts set duel_tester = true where id = pg_temp.uid('duel_alice');
select is(public.friends_me(pg_temp.tok('duel_alice'))->>'status', 'test', 'switch test → tester allowed');
select is(public.friends_me(pg_temp.tok('duel_bob'))::jsonb, '{"error":"off"}'::jsonb, 'switch test → non-tester gets off');
select is(public.presence_ping(pg_temp.tok('duel_bob'))::jsonb, '{"error":"off"}'::jsonb, 'switch test → non-tester ping off');
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_gus'))::jsonb, '{"error":"no_code"}'::jsonb, 'test mode: a non-tester''s code → no_code');
update public.site_settings set value = '"on"' where key = 'duels';

-- ── presence ────────────────────────────────────────────────────────────────
select is((public.presence_ping(pg_temp.tok('duel_carol'))->'invites')::jsonb, '[]'::jsonb, 'ping returns an empty invite list');
select ok((select online_at from public.accounts where id = pg_temp.uid('duel_carol')) = now(), 'ping sets online_at');
select is((select (x->>'online')::boolean from json_array_elements(public.friends_me(pg_temp.tok('duel_alice'))->'friends') x
            where (x->>'id')::uuid = pg_temp.uid('duel_carol')), true, 'friend who pinged is online');
update public.accounts set online_at = now() - interval '71 seconds' where id = pg_temp.uid('duel_carol');
select is((select (x->>'online')::boolean from json_array_elements(public.friends_me(pg_temp.tok('duel_alice'))->'friends') x
            where (x->>'id')::uuid = pg_temp.uid('duel_carol')), false, 'after 71 s the friend is offline');

-- ── level = playerLevel(xpOf(totals) + duel_xp), as in src/lib/progress.js ──
insert into public.events (device, page, kind, account_id)
select 'testdevice01', 'circle.html', k, pg_temp.uid('duel_carol')
  from (select 'win' k from generate_series(1, 24) union all select 'ok' from generate_series(1, 9)
        union all select 'bad' from generate_series(1, 5) union all select 'view' from generate_series(1, 5)) x;
select is(public.duel_level(pg_temp.uid('duel_carol')), 2, '249 points → level 2');
update public.accounts set duel_xp = 1 where id = pg_temp.uid('duel_carol');
select is(public.duel_level(pg_temp.uid('duel_carol')), 3, '250 points (with duel XP) → level 3');
select is((select (x->>'level')::int from json_array_elements(public.friends_me(pg_temp.tok('duel_alice'))->'friends') x
            where (x->>'id')::uuid = pg_temp.uid('duel_carol')), 3, 'friend list shows the level');

-- ── reports ─────────────────────────────────────────────────────────────────
select is(public.friend_report(pg_temp.tok('duel_alice'), pg_temp.uid('duel_carol'), 'spam')->>'ok', 'true', 'report with reason spam');
select is(public.friend_report(pg_temp.tok('duel_alice'), pg_temp.uid('duel_carol'), 'xyz')::jsonb, '{"error":"reason"}'::jsonb, 'unknown reason → reason');
insert into public.admin_sessions default values;
select is((select count(*)::int from json_array_elements(
             public.admin_reports((select token from public.admin_sessions limit 1))) r
            where r->>'reason' = 'spam' and r->>'reported' = 'duel_carol' and r->>'reporter' = 'duel_alice'), 1, 'admin sees the report');
select is(public.admin_report_done((select token from public.admin_sessions limit 1),
            (select id from public.reports where reason = 'spam' and reporter = pg_temp.uid('duel_alice') limit 1))->>'ok', 'true', 'admin marks the report done');
select ok((select done from public.reports where reason = 'spam' and reporter = pg_temp.uid('duel_alice') limit 1), 'report is done');

-- ── admin: switch + testers ─────────────────────────────────────────────────
select is(public.admin_set_setting((select token from public.admin_sessions limit 1), 'duels', '"maybe"')->>'error', 'value', 'switch rejects unknown values');
select is(public.admin_set_setting((select token from public.admin_sessions limit 1), 'duels', '"test"')->>'ok', 'true', 'admin sets the switch to test');
select is(public.admin_set_tester((select token from public.admin_sessions limit 1), pg_temp.uid('duel_bob'), true)->>'ok', 'true', 'admin makes B a tester');
select is(public.friends_me(pg_temp.tok('duel_bob'))->>'status', 'test', 'B (now tester) is allowed in test mode');
select throws_ok($$ select public.admin_set_tester('00000000-0000-0000-0000-000000000000'::uuid, null, true) $$, '28000', null, 'set_tester needs an admin session');

-- ── no direct access for the public ─────────────────────────────────────────
select ok(not has_function_privilege('anon', 'public.duel_guard(uuid)', 'execute'), 'anon cannot call duel_guard');
select ok(not has_function_privilege('anon', 'public.duel_level(uuid)', 'execute'), 'anon cannot call duel_level');
select ok(not has_function_privilege('anon', 'public.account_json(uuid)', 'execute'), 'anon cannot call account_json');
select ok(not has_function_privilege('anon', 'public.friends_blocked(uuid, uuid)', 'execute'), 'anon cannot call friends_blocked');
select ok(not has_function_privilege('anon', 'public.friends_count(uuid)', 'execute'), 'anon cannot call friends_count');
select ok(not has_function_privilege('anon', 'public.friend_code_new()', 'execute'), 'anon cannot call friend_code_new');
select ok(not has_function_privilege('anon', 'public.duel_switch()', 'execute'), 'anon cannot call duel_switch');
select ok(has_function_privilege('anon', 'public.friend_unblock(text, uuid)', 'execute'), 'anon can call friend_unblock (token checked inside)');
select ok(has_function_privilege('anon', 'public.friend_add(text, text)', 'execute'), 'anon can call friend_add (token checked inside)');
select ok(not has_table_privilege('anon', 'public.friend_sends', 'select'), 'anon cannot read friend_sends');
set local role anon;
select throws_ok('select * from public.friendships', '42501', null, 'anon cannot read friendships');
select throws_ok('select * from public.blocks', '42501', null, 'anon cannot read blocks');
select throws_ok('select * from public.reports', '42501', null, 'anon cannot read reports');
reset role;

select * from finish();
rollback;
