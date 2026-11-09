-- Duels, final fix wave (20261109120000_duels_final.sql): duel ban, switch-off
-- closes open duels, no question before start_at, XP slots, report duel id,
-- frozen levels, coarse "last seen".
-- Run: supabase test db   (local Supabase must be running)
begin;
create extension if not exists pgtap with schema extensions;

select plan(49);

-- ── helpers (as in duels_core.test.sql) ─────────────────────────────────────
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
create function pg_temp.uncool(x text) returns void language sql as $$
  update public.duels set created_at = created_at - interval '31 seconds' where a = pg_temp.uid(x);
$$;
create function pg_temp.invite(x text, y text) returns uuid language plpgsql as $$
declare r json;
begin
  perform pg_temp.uncool(x);
  r := public.duel_invite(pg_temp.tok(x), pg_temp.uid(y), 'num');
  if r->>'id' is null then raise exception 'invite % → %: %', x, y, r; end if;
  return (r->>'id')::uuid;
end $$;
create function pg_temp.accepted(x text, y text) returns uuid language plpgsql as $$
declare d uuid := pg_temp.invite(x, y); r json;
begin
  r := public.duel_answer_invite(pg_temp.tok(y), d, true);
  if r->>'status' is distinct from 'accepted' then raise exception 'accept: %', r; end if;
  return d;
end $$;
create function pg_temp.live(x text, y text) returns uuid language plpgsql as $$
declare d uuid := pg_temp.accepted(x, y); r json;
begin
  r := public.duel_claim_start(pg_temp.tok(y), d);
  if r->>'seed' is null then raise exception 'claim: %', r; end if;
  r := public.duel_put_questions('test-secret', d, pg_temp.rows());
  if r->>'ok' is null then raise exception 'put: %', r; end if;
  return d;
end $$;
-- the duel started `secs` ago; x answers questions 0..n-1 right, 2 s apart
create function pg_temp.answer_n(x text, d uuid, n int) returns void language plpgsql as $$
declare i int; r json;
begin
  update public.duels set start_at = now() - interval '200 seconds', ends_at = now() + interval '100 seconds' where id = d;
  for i in 0 .. n - 1 loop
    update public.duel_answers set at = now() - interval '2 seconds' where duel_id = d and uid = pg_temp.uid(x) and idx = i - 1;
    r := public.duel_answer(pg_temp.tok(x), d, i, '0');
    if r->>'error' is not null then raise exception 'answer % %: %', x, i, r; end if;
  end loop;
end $$;
create function pg_temp.st(x text, d uuid) returns jsonb language sql as $$ select public.duel_state(pg_temp.tok(x), d)::jsonb $$;
create function pg_temp.status(d uuid) returns text language sql as $$ select status from public.duels where id = d $$;
create function pg_temp.msgs(topic text, ev text) returns int language sql as $$
  select count(*)::int from realtime.messages m where m.topic = msgs.topic and m.event = ev
$$;

select pg_temp.mk('fw_a'); select pg_temp.mk('fw_b'); select pg_temp.mk('fw_c'); select pg_temp.mk('fw_d');
select pg_temp.mk('fw_e'); select pg_temp.mk('fw_f'); select pg_temp.mk('fw_g'); select pg_temp.mk('fw_h');
select pg_temp.befriend('fw_a', 'fw_b'); select pg_temp.befriend('fw_c', 'fw_d'); select pg_temp.befriend('fw_e', 'fw_f');
select pg_temp.befriend('fw_g', 'fw_h'); select pg_temp.befriend('fw_a', 'fw_c');
update public.site_settings set value = '"on"' where key = 'duels';
delete from vault.secrets where name = 'duel_secret';           -- a dev database may hold one already (rolled back below)
select vault.create_secret('test-secret', 'duel_secret');
create temporary table t_adm (tok uuid);
with s as (insert into public.admin_sessions default values returning token) insert into t_adm select token from s;
create function pg_temp.adm() returns uuid language sql as $$ select tok from t_adm limit 1 $$;

-- ── F5: no question before start_at ─────────────────────────────────────────
create temporary table t_d (k text primary key, id uuid);
insert into t_d values ('q0', pg_temp.live('fw_a', 'fw_b'));
select is(pg_temp.status((select id from t_d where k = 'q0')), 'live', 'F5: the duel is live (start_at 4 s ahead)');
select is(jsonb_array_length(pg_temp.st('fw_a', (select id from t_d where k = 'q0'))->'questions'), 0, 'F5: the sender sees no question during the face-off');
select is(jsonb_array_length(pg_temp.st('fw_b', (select id from t_d where k = 'q0'))->'questions'), 0, 'F5: the invitee sees no question during the face-off');
update public.duels set start_at = now(), ends_at = now() + interval '300 seconds' where id = (select id from t_d where k = 'q0');
select is(jsonb_array_length(pg_temp.st('fw_a', (select id from t_d where k = 'q0'))->'questions'), 1, 'F5: at start_at question 0 appears');
select is(pg_temp.st('fw_a', (select id from t_d where k = 'q0'))->'questions'->0->'payload'->>'prompt', 'q0', 'F5: …and it is question 0');

-- ── F10: levels frozen at the start ─────────────────────────────────────────
select is((select array[a_level, b_level] from public.duels where id = (select id from t_d where k = 'q0')), array[1, 1], 'F10: both levels stored when the duel went live');
update public.accounts set duel_xp = 5000 where id = pg_temp.uid('fw_b');   -- B levels up a lot mid-duel
select is((pg_temp.st('fw_a', (select id from t_d where k = 'q0'))->'opp'->>'level')::int, 1, 'F10: duel_state shows the level from the start, not a fresh one');
select is((pg_temp.st('fw_b', (select id from t_d where k = 'q0'))->'me'->>'level')::int, 1, 'F10: …for me too');
update public.duels set a_level = null, b_level = null where id = (select id from t_d where k = 'q0');
select ok((pg_temp.st('fw_a', (select id from t_d where k = 'q0'))->'opp'->>'level')::int > 1, 'F10: a duel without stored levels still computes them');
update public.accounts set duel_xp = 0 where id = pg_temp.uid('fw_b');

-- ── F4: switch off closes every open duel ───────────────────────────────────
-- q0 (A–B) is live with A 4 answers in; C–D invited; E–F accepted; G–H live with nobody answering
select pg_temp.answer_n('fw_a', (select id from t_d where k = 'q0'), 4);
insert into t_d values ('inv', pg_temp.invite('fw_c', 'fw_d'));
insert into t_d values ('acc', pg_temp.accepted('fw_e', 'fw_f'));
insert into t_d values ('gh', pg_temp.live('fw_g', 'fw_h'));
-- (all eight are testers here: test mode closes non-testers' duels — see duels_test_shut.test.sql)
update public.accounts set duel_tester = true where id in (select id from t_acc);
select is(public.admin_set_setting(pg_temp.adm(), 'duels', '"test"')->>'closed', '0', 'F4: test mode closes nothing (all testers)');
select is(pg_temp.status((select id from t_d where k = 'inv')), 'invited', 'F4: …the invite is still open in test mode');
update public.accounts set duel_tester = false where id in (select id from t_acc);
select is((public.admin_set_setting(pg_temp.adm(), 'duels', '"off"')->>'closed')::int, 4, 'F4: off closes the 4 open duels');
select is(pg_temp.status((select id from t_d where k = 'inv')), 'cancelled', 'F4: invited → cancelled');
select is(pg_temp.status((select id from t_d where k = 'acc')), 'cancelled', 'F4: accepted → cancelled');
select is(pg_temp.status((select id from t_d where k = 'q0')), 'done', 'F4: live → done (normal close)');
select is((select winner from public.duels where id = (select id from t_d where k = 'q0')), pg_temp.uid('fw_a'), 'F4: the closed duel has a winner by score');
select is((select array[xp_a, xp_b] from public.duels where id = (select id from t_d where k = 'q0')), array[30, 0], 'F4: XP as usual (B answered < 3 → 0)');
select is((select duel_xp from public.accounts where id = pg_temp.uid('fw_a')), 30, 'F4: A''s XP added');
select is(pg_temp.status((select id from t_d where k = 'gh')), 'done', 'F4: the idle live duel is done too');
select ok((select draw from public.duels where id = (select id from t_d where k = 'gh')), 'F4: 0–0 → draw (no XP: nobody answered)');
select is(pg_temp.msgs((select channel from public.duels where id = (select id from t_d where k = 'acc')), 'duel_end'), 1, 'F4: the accepted duel''s players get duel_end');
select is(pg_temp.msgs((select inbox from public.accounts where id = pg_temp.uid('fw_d')), 'invite_cancelled'), 1, 'F4: the invitee hears the invite is gone');
select is(public.admin_set_setting(pg_temp.adm(), 'duels', '"off"')->>'closed', '0', 'F4: off again → nothing left to close');
select is(public.admin_set_setting(pg_temp.adm(), 'keypad', '"on"')->>'closed', '0', 'F4: another setting closes nothing');
update public.site_settings set value = '"on"' where key = 'duels';

-- ── F3: per-account duel ban ────────────────────────────────────────────────
select ok((public.friends_me(pg_temp.tok('fw_c'))->>'error') is null, 'F3: C plays before the ban');
insert into t_d values ('ban', pg_temp.invite('fw_c', 'fw_a'));
select is(public.admin_set_duel_ban(pg_temp.adm(), pg_temp.uid('fw_c'), true)->>'closed', '1', 'F3: the ban closes C''s open invite');
select is(pg_temp.status((select id from t_d where k = 'ban')), 'cancelled', 'F3: …it is cancelled');
select is(public.friends_me(pg_temp.tok('fw_c'))->>'error', 'off', 'F3: banned → friends say off (same as a closed switch)');
select is(public.presence_ping(pg_temp.tok('fw_c'))->>'error', 'off', 'F3: banned → presence says off');
select is(public.duel_invite(pg_temp.tok('fw_c'), pg_temp.uid('fw_a'), 'num')->>'error', 'off', 'F3: banned → can''t invite');
select is(public.duel_history(pg_temp.tok('fw_c'))->>'error', 'off', 'F3: banned → history says off');
select pg_temp.uncool('fw_a');
select is(public.duel_invite(pg_temp.tok('fw_a'), pg_temp.uid('fw_c'), 'num')->>'error', 'not_friend', 'F3: a friend can''t invite the banned student (looks like any other refusal)');
update public.site_settings set value = '"test"' where key = 'duels';
update public.accounts set duel_tester = true where id = pg_temp.uid('fw_c');
select is(public.friends_me(pg_temp.tok('fw_c'))->>'error', 'off', 'F3: a banned tester is shut out in test mode too');
update public.site_settings set value = '"on"' where key = 'duels';
select is((public.admin_student(pg_temp.adm(), pg_temp.uid('fw_c'))->'account'->>'duel_banned'), 'true', 'F3: student detail shows the ban');
select is((public.admin_student(pg_temp.adm(), pg_temp.uid('fw_c'))->'duel'->>'banned'), 'true', 'F3: …in the duel block too');
select is(public.admin_set_duel_ban(pg_temp.adm(), pg_temp.uid('fw_c'), false)->>'banned', 'false', 'F3: admin lifts the ban');
select ok((public.friends_me(pg_temp.tok('fw_c'))->>'error') is null, 'F3: C plays again');
select is(public.admin_set_duel_ban(pg_temp.adm(), gen_random_uuid(), true)->>'error', 'no_user', 'F3: unknown account → no_user');
select throws_ok(format('select public.admin_set_duel_ban(%L::uuid, %L::uuid, true)', gen_random_uuid(), pg_temp.uid('fw_c')),
                 '28000', null, 'F3: the ban needs an admin session');
select ok(not (select duel_banned from public.accounts where id = pg_temp.uid('fw_c')), 'F3: …and changed nothing');

-- ── F8: a report keeps the duel id only for a duel the reporter played ──────
select is(public.friend_report(pg_temp.tok('fw_c'), pg_temp.uid('fw_a'), 'spam', (select id from t_d where k = 'q0'))->>'ok', 'true', 'F8: C reports A with a duel C never played');
select is((select duel_id from public.reports where reporter = pg_temp.uid('fw_c') order by id desc limit 1), null, 'F8: …that duel id is dropped');
select is(public.friend_report(pg_temp.tok('fw_b'), pg_temp.uid('fw_a'), 'name', (select id from t_d where k = 'q0'))->>'ok', 'true', 'F8: B reports A from their own duel');
select is((select duel_id from public.reports where reporter = pg_temp.uid('fw_b') order by id desc limit 1), (select id from t_d where k = 'q0'), 'F8: …that duel id is kept');
select is((select (x->>'reported_banned')::boolean from json_array_elements(public.admin_reports(pg_temp.adm())) x limit 1), false, 'F3: report rows carry reported_banned');

-- ── F7: only duels that earned XP use up the 5 daily slots ──────────────────
-- 5 finished duels today where A earned 0 (gave up / idle) + 1 normal one: the normal one still pays
insert into public.duels (a, b, subject, status, finished_at, xp_a, xp_b)
select pg_temp.uid('fw_a'), pg_temp.uid('fw_b'), 'num', 'done', now(), 0, 10 from generate_series(1, 5);
select is(public.duel_xp_award(pg_temp.uid('fw_a'), gen_random_uuid(), 30, now()), 30, 'F7: five 0-XP duels today don''t use up A''s slots');
select is(public.duel_xp_award(pg_temp.uid('fw_b'), gen_random_uuid(), 30, now()), 0, 'F7: B earned XP in all five → B''s cap is reached');

-- ── F18: coarse "last seen" ─────────────────────────────────────────────────
update public.accounts set online_at = now() where id = pg_temp.uid('fw_b');
select is((select f->>'seen' from json_array_elements(public.friends_me(pg_temp.tok('fw_a'))->'friends') f where f->>'username' = 'fw_b'), 'online', 'F18: online now → online');
select ok(not ((public.friends_me(pg_temp.tok('fw_a'))->'friends'->0)::jsonb ? 'seen_ago_s'), 'F18: no exact seconds any more');

select * from finish();
rollback;
