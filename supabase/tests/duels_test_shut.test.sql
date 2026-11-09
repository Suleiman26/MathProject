-- Duels: switching to 'test' closes the open duels of non-testers
-- (20261109130000_duels_test_shut.sql). Testers' duels keep going.
-- Run: supabase test db   (local Supabase must be running)
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

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
create function pg_temp.rows() returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('gen', 'test.choice', 'topic', 'directed-numbers', 'chapter', 'חיבור', 'kind', 'choice',
                                      'prompt', 'q' || g, 'choices', jsonb_build_array('5', '6', '7', '8'), 'answer', '0') order by g)
  from generate_series(0, 14) g;
$$;
create function pg_temp.invite(x text, y text) returns uuid language plpgsql as $$
declare r json;
begin
  update public.duels set created_at = created_at - interval '31 seconds' where a = pg_temp.uid(x);
  r := public.duel_invite(pg_temp.tok(x), pg_temp.uid(y), 'num');
  if r->>'id' is null then raise exception 'invite % → %: %', x, y, r; end if;
  return (r->>'id')::uuid;
end $$;
create function pg_temp.live(x text, y text) returns uuid language plpgsql as $$
declare d uuid := pg_temp.invite(x, y); r json;
begin
  r := public.duel_answer_invite(pg_temp.tok(y), d, true);
  r := public.duel_claim_start(pg_temp.tok(y), d);
  if r->>'seed' is null then raise exception 'claim: %', r; end if;
  r := public.duel_put_questions('test-secret', d, pg_temp.rows());
  if r->>'ok' is null then raise exception 'put: %', r; end if;
  return d;
end $$;
create function pg_temp.status(d uuid) returns text language sql as $$ select status from public.duels where id = d $$;
create function pg_temp.msgs(topic text, ev text) returns int language sql as $$
  select count(*)::int from realtime.messages m where m.topic = msgs.topic and m.event = ev
$$;

-- t* testers, n* not; t3 becomes a banned tester (one open duel per player: disjoint pairs)
select pg_temp.mk('ts_t' || g) from generate_series(1, 6) g;
select pg_temp.mk('ts_n' || g) from generate_series(1, 4) g;
select pg_temp.befriend('ts_t1', 'ts_t2'); select pg_temp.befriend('ts_t5', 'ts_n1'); select pg_temp.befriend('ts_n2', 'ts_n3');
select pg_temp.befriend('ts_t3', 'ts_t4'); select pg_temp.befriend('ts_t6', 'ts_n4');
update public.accounts set duel_tester = true where id in (select id from t_acc where name like 'ts_t%');
update public.site_settings set value = '"on"' where key = 'duels';
delete from vault.secrets where name = 'duel_secret';           -- a dev database may hold one already (rolled back below)
select vault.create_secret('test-secret', 'duel_secret');
create temporary table t_adm (tok uuid);
with s as (insert into public.admin_sessions default values returning token) insert into t_adm select token from s;
create function pg_temp.adm() returns uuid language sql as $$ select tok from t_adm limit 1 $$;

create temporary table t_d (k text primary key, id uuid);
insert into t_d values ('tt', pg_temp.live('ts_t1', 'ts_t2'));     -- tester vs tester, live
insert into t_d values ('tn', pg_temp.live('ts_t5', 'ts_n1'));     -- tester vs non-tester, live
insert into t_d values ('nn', pg_temp.invite('ts_n2', 'ts_n3'));   -- non-testers, invited
insert into t_d values ('tn2', pg_temp.invite('ts_t6', 'ts_n4'));  -- tester invites a non-tester
insert into t_d values ('ban', pg_temp.invite('ts_t3', 'ts_t4'));  -- testers, one will be banned
-- the ban flag alone (set directly, so admin_set_duel_ban doesn't close it first)
update public.accounts set duel_banned = true where id = pg_temp.uid('ts_t3');

select is((public.admin_set_setting(pg_temp.adm(), 'duels', '"test"')->>'closed')::int, 4, 'test: closes the 4 open duels that have a non-tester or banned player');
select is(pg_temp.status((select id from t_d where k = 'tt')), 'live', 'test: tester vs tester keeps playing');
select is(pg_temp.status((select id from t_d where k = 'tn')), 'done', 'test: tester vs non-tester (live) → done (normal close)');
select is(pg_temp.status((select id from t_d where k = 'nn')), 'cancelled', 'test: non-testers'' invite → cancelled');
select is(pg_temp.status((select id from t_d where k = 'tn2')), 'cancelled', 'test: a tester''s invite to a non-tester → cancelled');
select is(pg_temp.status((select id from t_d where k = 'ban')), 'cancelled', 'test: a banned tester''s invite → cancelled');
select is(pg_temp.msgs((select channel from public.duels where id = (select id from t_d where k = 'tn')), 'duel_end'), 1, 'test: the closed live duel''s players get duel_end');
select is(pg_temp.msgs((select inbox from public.accounts where id = pg_temp.uid('ts_n4')), 'invite_cancelled'), 1, 'test: the non-tester invitee hears the invite is gone');
select is(public.admin_set_setting(pg_temp.adm(), 'duels', '"test"')->>'closed', '0', 'test again → nothing left to close');
select is(public.admin_set_setting(pg_temp.adm(), 'duels', '"on"')->>'closed', '0', 'on closes nothing');
select is(pg_temp.status((select id from t_d where k = 'tt')), 'live', 'on: the testers'' duel still live');
select is(public.admin_set_setting(pg_temp.adm(), 'keypad', '"on"')->>'closed', '0', 'another setting closes nothing');
select is(public.admin_set_setting(pg_temp.adm(), 'duels', '"off"')->>'closed', '1', 'off still closes the rest');
select is(pg_temp.status((select id from t_d where k = 'tt')), 'done', 'off: the testers'' duel is done');

select * from finish();
rollback;
