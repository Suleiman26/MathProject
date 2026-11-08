-- Duels, task 1: friends, presence and the release switch.
-- Run: supabase test db   (local Supabase must be running)
begin;
create extension if not exists pgtap with schema extensions;

select plan(62);

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
select is(public.friend_add(pg_temp.tok('duel_alice'), 'ZZZZZZ')->>'error', 'no_code', 'unknown code → no_code');
select is(public.friend_add(pg_temp.tok('duel_alice'), lower(pg_temp.code('duel_dan')))->>'state', 'sent', 'code is case-insensitive');

-- 20 requests a day, the 21st is refused
select pg_temp.bulk('duel_lim_', 21);
select is((select count(*)::int from public.accounts a where a.username like 'duel_lim_%'
             and public.friend_add(pg_temp.tok('duel_dan'), a.friend_code)->>'state' = 'sent'
             and a.username <> 'duel_lim_21'), 20, 'D sends 20 requests');
select is(public.friend_add(pg_temp.tok('duel_dan'), (select friend_code from public.accounts where username = 'duel_lim_21'))::jsonb,
          '{"error":"limit_day"}'::jsonb, '21st request in a day → limit_day');

-- ── block ───────────────────────────────────────────────────────────────────
select is(public.friend_block(pg_temp.tok('duel_bob'), pg_temp.uid('duel_alice'))->>'ok', 'true', 'B blocks A');
select is((select count(*)::int from json_array_elements(public.friends_me(pg_temp.tok('duel_bob'))->'friends') x
            where (x->>'id')::uuid = pg_temp.uid('duel_alice')), 0, 'B no longer has A as friend');
select is((select count(*)::int from json_array_elements(public.friends_me(pg_temp.tok('duel_alice'))->'friends') x
            where (x->>'id')::uuid = pg_temp.uid('duel_bob')), 0, 'A no longer has B as friend');
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_bob'))::jsonb,
          '{"ok":true,"state":"sent"}'::jsonb, 'blocked A adding B looks like a normal send');
select is(json_array_length(public.friends_me(pg_temp.tok('duel_bob'))->'incoming'), 0, 'B incoming stays empty');
select is(json_array_length(public.friends_me(pg_temp.tok('duel_alice'))->'outgoing'), 1, 'A outgoing shows only the request to D');
select is(public.friend_add(pg_temp.tok('duel_bob'), pg_temp.code('duel_alice'))->>'state', 'sent', 'B (blocker) adding A also stores nothing');
select is((select count(*)::int from public.friendships
            where a = least(pg_temp.uid('duel_alice'), pg_temp.uid('duel_bob'))
              and b = greatest(pg_temp.uid('duel_alice'), pg_temp.uid('duel_bob'))), 0, 'no friendship row between A and B');

-- ── release switch ──────────────────────────────────────────────────────────
update public.site_settings set value = '"off"' where key = 'duels';
select is(public.friends_me(pg_temp.tok('duel_alice'))::jsonb, '{"error":"off"}'::jsonb, 'switch off → friends_me off');
select is(public.friend_add(pg_temp.tok('duel_alice'), pg_temp.code('duel_carol'))::jsonb, '{"error":"off"}'::jsonb, 'switch off → friend_add off');
update public.site_settings set value = '"test"' where key = 'duels';
update public.accounts set duel_tester = true where id = pg_temp.uid('duel_alice');
select is(public.friends_me(pg_temp.tok('duel_alice'))->>'status', 'test', 'switch test → tester allowed');
select is(public.friends_me(pg_temp.tok('duel_bob'))::jsonb, '{"error":"off"}'::jsonb, 'switch test → non-tester gets off');
select is(public.presence_ping(pg_temp.tok('duel_bob'))::jsonb, '{"error":"off"}'::jsonb, 'switch test → non-tester ping off');
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
            (select id from public.reports where reason = 'spam' limit 1))->>'ok', 'true', 'admin marks the report done');
select ok((select done from public.reports where reason = 'spam' limit 1), 'report is done');

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
select ok(has_function_privilege('anon', 'public.friend_add(text, text)', 'execute'), 'anon can call friend_add (token checked inside)');
select ok(not has_table_privilege('anon', 'public.friend_sends', 'select'), 'anon cannot read friend_sends');
set local role anon;
select throws_ok('select * from public.friendships', '42501', null, 'anon cannot read friendships');
select throws_ok('select * from public.blocks', '42501', null, 'anon cannot read blocks');
select throws_ok('select * from public.reports', '42501', null, 'anon cannot read reports');
reset role;

select * from finish();
rollback;
