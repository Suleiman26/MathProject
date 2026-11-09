-- Duels, task 9: account_progress returns the duel XP, the SQL level
-- (duel_level) agrees with xpOf + playerLevel in src/lib/progress.js, and
-- duel_online (the home tile) counts friends online now behind the switch.
-- Run: supabase test db   (local Supabase must be running)
begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

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
create function pg_temp.totals(n text) returns jsonb language sql as $$
  select (public.account_progress(pg_temp.tok(n))->'totals')::jsonb $$;

select pg_temp.mk('dp_a');

-- a fresh account: duel_xp is there and 0 (never null — xpOf adds it blindly)
select is(pg_temp.totals('dp_a')->>'duel_xp', '0', 'new account → totals.duel_xp = 0');
select ok((pg_temp.totals('dp_a') ? 'ok') and (pg_temp.totals('dp_a') ? 'win') and (pg_temp.totals('dp_a') ? 'days'),
          'the other totals are still there');

-- duel XP is read from accounts.duel_xp (what duel_close adds to)
update public.accounts set duel_xp = 45 where id = pg_temp.uid('dp_a');
select is(pg_temp.totals('dp_a')->>'duel_xp', '45', 'totals.duel_xp follows accounts.duel_xp');

-- practice points stay the practice's own: 3 solved (win) + 5 right steps (ok) → 35 practice points
insert into public.events (account_id, device, page, kind, at)
select pg_temp.uid('dp_a'), 'test-device-01', 'directed-numbers.html', k, now() - (g || ' minutes')::interval
  from (select 'win' k, g from generate_series(1, 3) g union all select 'ok', g from generate_series(4, 8) g) x;
select is(pg_temp.totals('dp_a')->>'win', '3', 'win count unchanged by duel XP');
select is(pg_temp.totals('dp_a')->>'ok', '5', 'ok count unchanged by duel XP');
select is(pg_temp.totals('dp_a')->>'duel_xp', '45', 'duel_xp does not count as practice');

-- the SQL level mirrors xpOf + playerLevel: 3·10 + 5 + 45 = 80 → level 1 (level 2 at 100)
select is(public.duel_level(pg_temp.uid('dp_a')), 1, '80 points → level 1');
update public.accounts set duel_xp = 70 where id = pg_temp.uid('dp_a');     -- 35 + 70 = 105 → level 2
select is(public.duel_level(pg_temp.uid('dp_a')), 2, '105 points → level 2 (duel XP counts for the level)');

-- the switch does not hide XP already earned
update public.site_settings set value = '"off"' where key = 'duels';
select is(pg_temp.totals('dp_a')->>'duel_xp', '70', 'switch off → duel_xp still returned by account_progress');
update public.site_settings set value = '"on"' where key = 'duels';

-- ── duel_online: the home tile's light call ──────────────────────────────────
select pg_temp.mk('dp_b'); select pg_temp.mk('dp_c'); select pg_temp.mk('dp_d'); select pg_temp.mk('dp_e');
create function pg_temp.friends(x text, y text, st text) returns void language sql as $$
  insert into public.friendships (a, b, status, requested_by)
  values (least(pg_temp.uid(x), pg_temp.uid(y)), greatest(pg_temp.uid(x), pg_temp.uid(y)), st, pg_temp.uid(x)) $$;
select pg_temp.friends('dp_a', 'dp_b', 'accepted');   -- online now
select pg_temp.friends('dp_a', 'dp_c', 'accepted');   -- seen 2 minutes ago
select pg_temp.friends('dp_a', 'dp_d', 'pending');    -- only a request
-- dp_e: online, but not a friend
update public.accounts set online_at = now() where id in (pg_temp.uid('dp_b'), pg_temp.uid('dp_d'), pg_temp.uid('dp_e'));
update public.accounts set online_at = now() - interval '2 minutes' where id = pg_temp.uid('dp_c');

select is((public.duel_online(pg_temp.tok('dp_a'))::jsonb), '{"online": 1, "friends": 2, "faces": [{"username": "dp_b", "avatar": "teal"}]}'::jsonb,
          'on → counts accepted friends online in the last 70 s only; faces = who');
update public.accounts set online_at = now() - interval '30 seconds' where id = pg_temp.uid('dp_c');
select is((public.duel_online(pg_temp.tok('dp_a'))->>'online'), '2', '30 s ago still counts as online');
select is((public.duel_online(pg_temp.tok('dp_b'))->>'online'), '0', 'the other side: my friend is not online');
select is(public.duel_online(pg_temp.tok('dp_d'))->>'online', '0', 'a pending request is not a friend');
select is((select online_at from public.accounts where id = pg_temp.uid('dp_a')), null, 'duel_online does not mark me online');

-- the switch: off → error for everyone; test → only testers, and only tester friends count
update public.site_settings set value = '"off"' where key = 'duels';
select is(public.duel_online(pg_temp.tok('dp_a'))->>'error', 'off', 'switch off → {error:off}');
update public.site_settings set value = '"test"' where key = 'duels';
select is(public.duel_online(pg_temp.tok('dp_a'))->>'error', 'off', 'test, not a tester → {error:off}');
update public.accounts set duel_tester = true where id = pg_temp.uid('dp_a');
select is(public.duel_online(pg_temp.tok('dp_a'))->>'online', '0', 'test, tester → friends who are not testers do not count');
update public.accounts set duel_tester = true where id = pg_temp.uid('dp_b');
select is(public.duel_online(pg_temp.tok('dp_a'))->>'online', '1', 'test → tester friends online count');
update public.site_settings set value = '"on"' where key = 'duels';

select throws_ok($$ select public.duel_online('not-a-token') $$, '28000', 'unauthorized', 'dead token → unauthorized');

select * from finish();
rollback;
