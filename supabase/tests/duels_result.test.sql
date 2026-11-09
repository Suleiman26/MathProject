-- Duels, task 8: the result screen's facts in duel_state (20261109100000_duels_result_facts.sql).
-- Run: supabase test db   (local Supabase must be running)
-- Time is simulated by moving the stored times, as in duels_core.test.sql.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

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
create function pg_temp.st(x text, d uuid) returns jsonb language sql as $$ select public.duel_state(pg_temp.tok(x), d)::jsonb $$;
-- every answer is "0" (choice)
create function pg_temp.rows() returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('gen', 'test.choice', 'topic', 'directed-numbers', 'chapter', 'חיבור', 'kind', 'choice',
                   'prompt', 'q' || g, 'choices', jsonb_build_array('5', '6', '7', '8'), 'answer', '0') order by g)
  from generate_series(0, 14) g;
$$;
-- x answers question i, `secs` seconds after the previous answer (or the start)
create function pg_temp.play(x text, d uuid, i int, given text, secs numeric) returns jsonb language plpgsql as $$
begin
  if exists (select 1 from public.duel_answers where duel_id = d and uid = pg_temp.uid(x)) then
    update public.duel_answers set at = now() - secs * interval '1 second'
     where duel_id = d and uid = pg_temp.uid(x)
       and idx = (select max(idx) from public.duel_answers where duel_id = d and uid = pg_temp.uid(x));
  else
    update public.duels set start_at = now() - secs * interval '1 second',
                            ends_at = now() - secs * interval '1 second' + interval '300 seconds' where id = d;
  end if;
  return public.duel_answer(pg_temp.tok(x), d, i, given)::jsonb;
end $$;

select pg_temp.mk('dr_a');
select pg_temp.mk('dr_b');
insert into public.friendships (a, b, status, requested_by, accepted_at)
values (least(pg_temp.uid('dr_a'), pg_temp.uid('dr_b')), greatest(pg_temp.uid('dr_a'), pg_temp.uid('dr_b')), 'accepted', pg_temp.uid('dr_a'), now());
update public.site_settings set value = '"on"' where key = 'duels';
delete from vault.secrets where name = 'duel_secret';           -- a dev database may hold one already (rolled back below)
select vault.create_secret('test-secret', 'duel_secret');

create temporary table t_duel as select (public.duel_invite(pg_temp.tok('dr_a'), pg_temp.uid('dr_b'), 'num')->>'id')::uuid as id;
select is(public.duel_answer_invite(pg_temp.tok('dr_b'), (select id from t_duel), true)->>'status', 'accepted', 'accepted');
select ok(public.duel_claim_start(pg_temp.tok('dr_b'), (select id from t_duel))->>'seed' is not null, 'claimed');
select is(public.duel_put_questions('test-secret', (select id from t_duel), pg_temp.rows())->>'ok', 'true', 'questions stored');

-- A: right ×3, wrong, right ×4 (best streak 4), each answer 4 s apart → avg 4000 ms; then time runs out
select pg_temp.play('dr_a', (select id from t_duel), i, case when i = 3 then '1' else '0' end, 4) from generate_series(0, 7) i;
-- B answers nothing
update public.duels set ends_at = now() - interval '3 seconds', start_at = now() - interval '303 seconds' where id = (select id from t_duel);

select is(pg_temp.st('dr_a', (select id from t_duel))->>'status', 'done', 'time up → done');
select is((pg_temp.st('dr_a', (select id from t_duel))->'result'->>'best_streak')::int, 4, 'A: best streak 4');
select ok(abs((pg_temp.st('dr_a', (select id from t_duel))->'result'->>'avg_ms')::int - 4000) <= 50, 'A: about 4 s per question');
select is((pg_temp.st('dr_b', (select id from t_duel))->'result'->>'best_streak')::int, 0, 'B: best streak 0');
select is(pg_temp.st('dr_b', (select id from t_duel))->'result'->'avg_ms', 'null'::jsonb, 'B: no answers → avg null');
select ok(position('"answer"' in (pg_temp.st('dr_a', (select id from t_duel))->'result')::text) = 0, 'result never carries the stored answer key');

select * from finish();
rollback;
