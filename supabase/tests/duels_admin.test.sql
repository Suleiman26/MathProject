-- Duels, task 10: the admin side — switch, testers, reports, student detail, overview.
-- Run: supabase test db   (local Supabase must be running)
begin;
create extension if not exists pgtap with schema extensions;

select plan(31);

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

select pg_temp.mk('adm_tess');
select pg_temp.mk('adm_nora');

-- a real admin session (as admin_login makes one), and one that has expired
create temporary table t_adm (tok uuid);
with s as (insert into public.admin_sessions default values returning token) insert into t_adm select token from s;
create function pg_temp.adm() returns uuid language sql as $$ select tok from t_adm limit 1 $$;
create temporary table t_old (tok uuid);
with s as (insert into public.admin_sessions (expires_at) values (now() - interval '1 minute') returning token) insert into t_old select token from s;
create function pg_temp.old() returns uuid language sql as $$ select tok from t_old limit 1 $$;

-- ── switch ──────────────────────────────────────────────────────────────────
select is(public.admin_set_setting(pg_temp.adm(), 'duels', '"off"')->>'ok', 'true', 'admin sets the switch off');
select is(public.admin_duels(pg_temp.adm())->>'switch', 'off', 'overview shows off');
select is(public.friends_me(pg_temp.tok('adm_tess'))->>'error', 'off', 'off: a student is shut out');
select is(public.admin_set_setting(pg_temp.adm(), 'duels', '"test"')->>'ok', 'true', 'admin sets the switch to test');
select is(public.admin_duels(pg_temp.adm())->>'switch', 'test', 'overview shows test');
select is(public.friends_me(pg_temp.tok('adm_tess'))->>'error', 'off', 'test: a non-tester is still shut out');
select is(public.admin_set_setting(pg_temp.adm(), 'duels', '1')->>'error', 'value', 'switch rejects a non-string');
select throws_ok($$ select public.admin_set_setting(gen_random_uuid(), 'duels', '"on"') $$, '28000', null, 'switch needs an admin session');
select throws_ok($$ select public.admin_set_setting(pg_temp.old(), 'duels', '"on"') $$, '28000', null, 'an expired admin session cannot set the switch');
select is((select value #>> '{}' from public.site_settings where key = 'duels'), 'test', 'the failed calls left the switch alone');

-- ── testers ─────────────────────────────────────────────────────────────────
select is(public.admin_set_tester(pg_temp.adm(), pg_temp.uid('adm_tess'), true)->>'ok', 'true', 'admin makes Tess a tester');
select ok((public.friends_me(pg_temp.tok('adm_tess'))->>'error') is null, 'test: the tester is let in');
select is(public.friends_me(pg_temp.tok('adm_nora'))->>'error', 'off', 'test: Nora (not a tester) is not');
select is((select count(*)::int from json_array_elements(public.admin_duels(pg_temp.adm())->'testers') t
            where (t->>'id')::uuid = pg_temp.uid('adm_tess') and t->>'username' = 'adm_tess'), 1, 'overview lists Tess as a tester');
select is((public.admin_student(pg_temp.adm(), pg_temp.uid('adm_tess'))->'account'->>'duel_tester'), 'true', 'student detail: account.duel_tester = true');
select is((public.admin_student(pg_temp.adm(), pg_temp.uid('adm_nora'))->'account'->>'duel_tester'), 'false', 'student detail: Nora is not a tester');
select is(public.admin_set_tester(pg_temp.adm(), gen_random_uuid(), true)->>'error', 'no_user', 'unknown account → no_user');
select throws_ok(format('select public.admin_set_tester(%L::uuid, %L::uuid, true)', gen_random_uuid(), pg_temp.uid('adm_nora')),
                 '28000', null, 'set_tester needs an admin session');
select ok(not (select duel_tester from public.accounts where id = pg_temp.uid('adm_nora')), 'Nora is still not a tester');
select is(public.admin_set_tester(pg_temp.adm(), pg_temp.uid('adm_tess'), false)->>'on', 'false', 'admin takes the tester flag off');
select is(public.friends_me(pg_temp.tok('adm_tess'))->>'error', 'off', 'test: Tess is shut out again');

-- ── student detail: duel numbers ────────────────────────────────────────────
insert into public.duels (a, b, subject, status, winner, finished_at, a_score, b_score)
values (pg_temp.uid('adm_tess'), pg_temp.uid('adm_nora'), 'num', 'done', pg_temp.uid('adm_tess'), now(), 900, 400),
       (pg_temp.uid('adm_nora'), pg_temp.uid('adm_tess'), 'alg', 'done', null, now(), 500, 500),
       (pg_temp.uid('adm_nora'), pg_temp.uid('adm_tess'), 'alg', 'declined', null, null, 0, 0);
update public.duels set draw = true where subject = 'alg' and status = 'done' and a = pg_temp.uid('adm_nora');
select is((public.admin_student(pg_temp.adm(), pg_temp.uid('adm_tess'))->'duel'->>'played')::int, 2, 'detail counts finished duels only');
select is((public.admin_student(pg_temp.adm(), pg_temp.uid('adm_tess'))->'duel'->>'wins')::int, 1, 'detail: one win');
select is((public.admin_student(pg_temp.adm(), pg_temp.uid('adm_nora'))->'duel'->>'losses')::int, 1, 'detail: Nora one loss');
select ok((public.admin_student(pg_temp.adm(), null, 'some-device')->'duel') is null
          or json_typeof(public.admin_student(pg_temp.adm(), null, 'some-device')->'duel') = 'null', 'a guest has no duel block');

-- ── reports ─────────────────────────────────────────────────────────────────
update public.site_settings set value = '"on"' where key = 'duels';
select is(public.friend_report(pg_temp.tok('adm_nora'), pg_temp.uid('adm_tess'), 'name')->>'ok', 'true', 'Nora reports Tess (name)');
select is((select count(*)::int from json_array_elements(public.admin_reports(pg_temp.adm())) r
            where r->>'reporter' = 'adm_nora' and r->>'reported' = 'adm_tess' and r->>'reason' = 'name'
              and r->>'done' = 'false'), 1, 'admin reads the open report');
select throws_ok($$ select public.admin_reports(gen_random_uuid()) $$, '28000', null, 'reports need an admin session');
select throws_ok(format('select public.admin_report_done(%L::uuid, %s)', pg_temp.old(),
                   (select id from public.reports where reporter = pg_temp.uid('adm_nora') limit 1)),
                 '28000', null, 'an expired session cannot mark a report done');
select is(public.admin_report_done(pg_temp.adm(), (select id from public.reports where reporter = pg_temp.uid('adm_nora') limit 1))->>'ok',
          'true', 'admin marks it done');
select ok((select done from public.reports where reporter = pg_temp.uid('adm_nora') limit 1), 'the report is done');

select * from finish();
rollback;
