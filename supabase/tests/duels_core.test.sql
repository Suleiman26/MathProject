-- Duels, task 3: invites, live duel rules, scoring and results.
-- Run: supabase test db   (local Supabase must be running)
-- Time is simulated by moving the stored times (start_at, ends_at,
-- accepted_at, expires_at, answer "at") — now() is fixed inside the test.
begin;
create extension if not exists pgtap with schema extensions;

select plan(227);

-- ── helpers ─────────────────────────────────────────────────────────────────
create temporary table t_acc (name text primary key, tok text, id uuid);

create function pg_temp.mk(n text, g text default '8') returns uuid language plpgsql as $$
declare r json;
begin
  r := public.account_signup(n, 'passw0rd1', g, public.account_terms_version(), true, true, null);
  if r->>'token' is null then raise exception 'signup failed for %: %', n, r; end if;
  insert into t_acc values (n, r->>'token', (r->'account'->>'id')::uuid);
  return (r->'account'->>'id')::uuid;
end $$;
create function pg_temp.tok(n text) returns text language sql as $$ select tok from t_acc where name = n $$;
create function pg_temp.uid(n text) returns uuid language sql as $$ select id from t_acc where name = n $$;
create function pg_temp.inbox(n text) returns text language sql as $$ select inbox from public.accounts where id = pg_temp.uid(n) $$;
create function pg_temp.befriend(x text, y text) returns void language sql as $$
  insert into public.friendships (a, b, status, requested_by, accepted_at)
  values (least(pg_temp.uid(x), pg_temp.uid(y)), greatest(pg_temp.uid(x), pg_temp.uid(y)), 'accepted', pg_temp.uid(x), now());
$$;
-- the fixed question set: every choice answer is "0", idx 3/7/11 are numbers with answer "5"
create function pg_temp.rows() returns jsonb language sql as $$
  select jsonb_agg(case when g in (3, 7, 11)
    then jsonb_build_object('gen', 'test.num', 'topic', 'directed-numbers', 'chapter', 'חיבור', 'kind', 'number',
                            'prompt', 'q' || g, 'answer', '5', 'meta', jsonb_build_object('a', 2, 'b', 3))
    else jsonb_build_object('gen', 'test.choice', 'topic', 'directed-numbers', 'chapter', 'חיבור', 'kind', 'choice',
                            'prompt', 'q' || g, 'choices', jsonb_build_array('5', '6', '7', '8'), 'answer', '0') end order by g)
  from generate_series(0, 14) g;
$$;
create function pg_temp.right_for(i int) returns text language sql as $$ select case when i in (3, 7, 11) then '5' else '0' end $$;
-- earlier invites by x move 31 s into the past (so the 30-s cooldown doesn't block the next test duel)
create function pg_temp.uncool(x text) returns void language sql as $$
  update public.duels set created_at = created_at - interval '31 seconds' where a = pg_temp.uid(x);
$$;
-- a new live duel x vs y through the real functions
create function pg_temp.live(x text, y text, subj text default 'num') returns uuid language plpgsql as $$
declare r json; d uuid;
begin
  perform pg_temp.uncool(x);
  r := public.duel_invite(pg_temp.tok(x), pg_temp.uid(y), subj);
  if r->>'id' is null then raise exception 'invite % → %: %', x, y, r; end if;
  d := (r->>'id')::uuid;
  r := public.duel_answer_invite(pg_temp.tok(y), d, true);
  if r->>'status' is distinct from 'accepted' then raise exception 'accept: %', r; end if;
  r := public.duel_claim_start(pg_temp.tok(y), d);
  if r->>'seed' is null then raise exception 'claim: %', r; end if;
  r := public.duel_put_questions('test-secret', d, pg_temp.rows());
  if r->>'ok' is null then raise exception 'put: %', r; end if;
  return d;
end $$;
-- x answers question i; x's previous answer (or the start) happened `secs` seconds ago
create function pg_temp.play(x text, d uuid, i int, given text, secs numeric default 2) returns jsonb language plpgsql as $$
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
-- x answers all remaining questions: 'right' = every answer right, else that text every time
create function pg_temp.play_all(x text, d uuid, given text, secs numeric default 2) returns jsonb language plpgsql as $$
declare r jsonb; i int;
begin
  for i in (select count(*)::int from public.duel_answers where duel_id = d and uid = pg_temp.uid(x)) .. 14 loop
    r := pg_temp.play(x, d, i, case when given = 'right' then pg_temp.right_for(i) else given end, secs);
    if r ? 'error' then raise exception 'play_all % idx %: %', x, i, r; end if;
  end loop;
  return r;
end $$;
create function pg_temp.st(x text, d uuid) returns jsonb language sql as $$ select public.duel_state(pg_temp.tok(x), d)::jsonb $$;
create function pg_temp.status(d uuid) returns text language sql as $$ select status from public.duels where id = d $$;
create function pg_temp.xp(x text) returns int language sql as $$ select duel_xp from public.accounts where id = pg_temp.uid(x) $$;
create function pg_temp.msgs(topic text, ev text) returns int language sql as $$
  select count(*)::int from realtime.messages m where m.topic = msgs.topic and m.event = ev
$$;

select pg_temp.mk('dc_a');
select pg_temp.mk('dc_b', '7');
select pg_temp.mk('dc_c');
select pg_temp.mk('dc_d');
select pg_temp.mk('dc_e');
select pg_temp.mk('dc_f');
select pg_temp.mk('dc_g');
select pg_temp.mk('dc_h');
select pg_temp.befriend('dc_a', 'dc_b');
select pg_temp.befriend('dc_d', 'dc_b');
select pg_temp.befriend('dc_d', 'dc_a');
select pg_temp.befriend('dc_e', 'dc_f');
select pg_temp.befriend('dc_g', 'dc_h');
update public.site_settings set value = '"on"' where key = 'duels';
select vault.create_secret('test-secret', 'duel_secret');

-- ── answer check (mirror of supabase/functions/_shared/duel/answer.js) ──────
select is(public.duel_check('choice', '0', null, '0'), true, 'choice: same index → right');
select is(public.duel_check('choice', '0', null, '1'), false, 'choice: other index → wrong');
select is(public.duel_check('choice', '2', null, ' 2 '), true, 'choice: spaces ignored');
select is(public.duel_check('choice', '0', null, ''), false, 'choice: empty → wrong');
select is(public.duel_check('number', '-3', null, '−3'), true, 'number: "−3" (U+2212) = "-3"');
select is(public.duel_check('number', '−3', null, '-3'), true, 'number: "-3" = stored "−3"');
select is(public.duel_check('number', '1.5', null, '3/2'), true, 'number: "3/2" = "1.5"');
select is(public.duel_check('number', '3/2', null, '1.5'), true, 'number: "1.5" = "3/2"');
select is(public.duel_check('number', '2.5', null, '2.50'), true, 'number: "2.50" = "2.5"');
select is(public.duel_check('number', '1.5', 0.05, '1.49'), true, 'number: "1.49" vs "1.5" with tol 0.05 → right');
select is(public.duel_check('number', '1.5', null, '1.49'), false, 'number: "1.49" vs "1.5" without tol → wrong');
select is(public.duel_check('number', '-0.5', null, '−1/2'), true, 'number: "−1/2" = "-0.5"');
select is(public.duel_check('number', '5', null, 'abc'), false, 'number: text → wrong');
select is(public.duel_check('number', '5', null, ''), false, 'number: empty → wrong');
select is(public.duel_check('number', '5', null, null), false, 'number: null → wrong');
select is(public.duel_check('number', '0', null, '1/0'), false, 'number: divide by zero → wrong, no crash');
select is(public.duel_check('number', '5', null, '5.'), true, 'number: "5." = 5 (as in answer.js)');
select is(public.duel_check('number', '-3', null, '3'), false, 'number: "3" ≠ "-3"');
select is(public.duel_check('number', '3', null, '+3'), true, 'number: "+3" = 3');
select is(public.duel_check('number', '0.5', null, '.5'), true, 'number: ".5" = 0.5');
select is(public.duel_check('number', '1.5', null, '1,5'), true, 'number: "1,5" = 1.5 (comma as decimal point)');
select is(public.duel_check('number', '-3', null, '–3'), true, 'number: "–3" (en dash) = -3');
select is(public.duel_check('number', '0.5', null, ' 1 / 2 '), true, 'number: spaces ignored');
select is(public.duel_check('number', '0.5', null, '-1/-2'), true, 'number: signed denominator');
select is(public.duel_check('number', '5', null, '1/2/3'), false, 'number: two slashes → wrong');
select is(public.duel_check('number', '5', null, '1e3'), false, 'number: exponent form → wrong');
select is(public.duel_check('choice', '2', null, 'c'), false, 'choice: letter → wrong');

-- ── invite ──────────────────────────────────────────────────────────────────
create temporary table t_d (name text primary key, id uuid);
select ok((public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_b'), 'num')->>'id') is not null, 'A invites B');
insert into t_d select 'd1', id from public.duels where a = pg_temp.uid('dc_a') and b = pg_temp.uid('dc_b');
create function pg_temp.d(n text) returns uuid language sql as $$ select id from t_d where name = n $$;
select is((select expires_at - now() from public.duels where id = pg_temp.d('d1')), interval '60 seconds', 'invite lives 60 s');
select is(pg_temp.status(pg_temp.d('d1')), 'invited', 'status invited');
select is((select count(*)::int from json_array_elements(public.presence_ping(pg_temp.tok('dc_b'))->'invites') x
            where (x->>'id')::uuid = pg_temp.d('d1')), 1, 'B''s ping lists the invite');
select is((select x->'from'->>'username' from json_array_elements(public.presence_ping(pg_temp.tok('dc_b'))->'invites') x limit 1),
          'dc_a', 'invite carries the sender''s name');
select is((select x->>'subject' from json_array_elements(public.presence_ping(pg_temp.tok('dc_b'))->'invites') x limit 1),
          'num', 'invite carries the subject');
select is((select (x->'h2h')::jsonb from json_array_elements(public.presence_ping(pg_temp.tok('dc_b'))->'invites') x limit 1),
          '[0,0]'::jsonb, 'invite carries head-to-head');
select is(json_array_length(public.presence_ping(pg_temp.tok('dc_a'))->'invites'), 0, 'the sender has no incoming invites');
select is(pg_temp.msgs(pg_temp.inbox('dc_b'), 'invite'), 1, 'invite broadcast to B''s inbox');
select is((select payload - 'id' from realtime.messages where topic = pg_temp.inbox('dc_b') and event = 'invite'), '{}'::jsonb,
          'invite broadcast carries only the duel id');
select is((select payload->>'id' from realtime.messages where topic = pg_temp.inbox('dc_b') and event = 'invite'), pg_temp.d('d1')::text,
          'invite broadcast id = duel id');
select is(public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_b'), 'num')->>'error', 'cooldown', 'second invite within 30 s → cooldown');
select ok((public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_b'), 'num')->>'wait_s')::int between 1 and 30, 'cooldown says how long to wait');
select is(public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_c'), 'num')::jsonb, '{"error":"not_friend"}'::jsonb, 'A → C (not a friend) → not_friend');
select is(public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_a'), 'num')::jsonb, '{"error":"not_friend"}'::jsonb, 'inviting yourself → not_friend');
select is(public.duel_invite(pg_temp.tok('dc_d'), pg_temp.uid('dc_b'), 'xyz')::jsonb, '{"error":"subject"}'::jsonb, 'unknown subject → subject');
select is(public.duel_invite(pg_temp.tok('dc_d'), pg_temp.uid('dc_b'), 'geo')::jsonb, '{"error":"busy"}'::jsonb, 'B has an open invite → busy');
select is(public.duel_invite(pg_temp.tok('dc_d'), pg_temp.uid('dc_a'), 'geo')::jsonb, '{"error":"busy"}'::jsonb, 'A has an open invite out → busy');
select is((select count(*)::int from public.duels where a = pg_temp.uid('dc_d')), 0, 'refused invites store nothing');
select is(public.duel_cancel(pg_temp.tok('dc_b'), pg_temp.d('d1'))::jsonb, '{"error":"gone"}'::jsonb, 'only the sender can cancel');
select is(public.duel_answer_invite(pg_temp.tok('dc_a'), pg_temp.d('d1'), true)::jsonb, '{"error":"gone"}'::jsonb, 'the sender cannot accept own invite');
select is(public.duel_claim_start(pg_temp.tok('dc_b'), pg_temp.d('d1'))->>'error', 'gone', 'claim before accept → error');

-- ── accept + claim + questions ──────────────────────────────────────────────
select is(public.duel_answer_invite(pg_temp.tok('dc_b'), pg_temp.d('d1'), true)::jsonb, '{"status":"accepted"}'::jsonb, 'B accepts');
select is(pg_temp.status(pg_temp.d('d1')), 'accepted', 'status accepted');
select is(pg_temp.msgs(pg_temp.inbox('dc_a'), 'invite_answer'), 1, 'accept broadcast to A''s inbox');
select is(public.duel_answer_invite(pg_temp.tok('dc_b'), pg_temp.d('d1'), true)::jsonb, '{"error":"gone"}'::jsonb, 'accepting twice → gone');
select is(public.presence_ping(pg_temp.tok('dc_a'))->>'live', pg_temp.d('d1')::text, 'A''s ping points at the accepted duel');
select is(public.presence_ping(pg_temp.tok('dc_b'))->>'live', pg_temp.d('d1')::text, 'B''s ping points at the accepted duel');
select is(json_array_length(public.presence_ping(pg_temp.tok('dc_b'))->'invites'), 0, 'accepted invite leaves B''s invite list');
select is(public.duel_claim_start(pg_temp.tok('dc_a'), pg_temp.d('d1'))->>'error', 'gone', 'claim by the sender → error');
select is((select (r->>'grade_a')::int * 10 + (r->>'grade_b')::int from (select public.duel_claim_start(pg_temp.tok('dc_b'), pg_temp.d('d1')) r) x),
          87, 'claim by the invitee → both grades (8, 7)');
select ok((select seed from public.duels where id = pg_temp.d('d1')) is not null, 'claim stores a seed');
select is(public.duel_claim_start(pg_temp.tok('dc_b'), pg_temp.d('d1'))->>'error', 'gone', 'claim twice → error');
select is(public.duel_put_questions('wrong-secret', pg_temp.d('d1'), pg_temp.rows())::jsonb, '{"error":"secret"}'::jsonb, 'wrong secret → error');
select is(public.duel_put_questions(null, pg_temp.d('d1'), pg_temp.rows())::jsonb, '{"error":"secret"}'::jsonb, 'no secret → error');
select is(public.duel_put_questions('test-secret', pg_temp.d('d1'), pg_temp.rows() - 14)::jsonb, '{"error":"rows"}'::jsonb, '14 rows → error');
select is(public.duel_put_questions('test-secret', pg_temp.d('d1'),
            jsonb_set(pg_temp.rows(), '{0,answer}', '"7"'))::jsonb, '{"error":"rows"}'::jsonb, 'choice answer outside 0..3 → error');
select is(public.duel_put_questions('test-secret', pg_temp.d('d1'),
            jsonb_set(pg_temp.rows(), '{1,display}', '{"answer":"0"}'))::jsonb, '{"error":"rows"}'::jsonb, 'an "answer" key inside the visible part → error');
select is(pg_temp.status(pg_temp.d('d1')), 'accepted', 'refused question sets change nothing');
select is(public.duel_state(pg_temp.tok('dc_a'), pg_temp.d('d1'))->>'status', 'accepted', 'state while waiting for questions');
select is(json_array_length(public.duel_state(pg_temp.tok('dc_a'), pg_temp.d('d1'))->'questions'), 0, 'no questions before live');
select is(public.duel_put_questions('test-secret', pg_temp.d('d1'), pg_temp.rows())->>'ok', 'true', 'right secret → ok');
select is(pg_temp.status(pg_temp.d('d1')), 'live', 'status live');
select is((select start_at - now() from public.duels where id = pg_temp.d('d1')), interval '4 seconds', 'start = now + 4 s');
select is((select ends_at - start_at from public.duels where id = pg_temp.d('d1')), interval '300 seconds', 'ends 300 s after start');
select is(pg_temp.msgs((select channel from public.duels where id = pg_temp.d('d1')), 'duel_start'), 1, 'duel_start broadcast on the duel channel');
select is(public.duel_put_questions('test-secret', pg_temp.d('d1'), pg_temp.rows())::jsonb, '{"error":"gone"}'::jsonb, 'questions twice → gone');
select is((select count(*)::int from public.duel_questions where duel_id = pg_temp.d('d1')), 15, '15 questions stored');

-- ── state: questions without answers ────────────────────────────────────────
select is(jsonb_array_length(pg_temp.st('dc_a', pg_temp.d('d1'))->'questions'), 15, 'state has 15 questions');
select ok(position('"answer"' in (pg_temp.st('dc_a', pg_temp.d('d1'))->'questions')::text) = 0, 'no "answer" key anywhere in questions');
select ok(position('"tol"' in (pg_temp.st('dc_a', pg_temp.d('d1'))->'questions')::text) = 0, 'no "tol" key in questions');
select ok(position('"meta"' in (pg_temp.st('dc_a', pg_temp.d('d1'))->'questions')::text) = 0, 'no "meta" key in questions');
select is(pg_temp.st('dc_a', pg_temp.d('d1'))->'questions'->0->'payload'->>'prompt', 'q0', 'question payload has the prompt');
select is(pg_temp.st('dc_a', pg_temp.d('d1'))->'questions'->3->>'kind', 'number', 'question kind is shown');
select is((pg_temp.st('dc_a', pg_temp.d('d1'))->'me'->>'idx')::int, 0, 'my next question is 0');
select is(pg_temp.st('dc_a', pg_temp.d('d1'))->'opp'->>'username', 'dc_b', 'opponent''s name');
select is(pg_temp.st('dc_a', pg_temp.d('d1'))->'opp'->'lanes', '[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]'::jsonb,
          'opponent lane: 15 empty dashes');
select ok(pg_temp.st('dc_a', pg_temp.d('d1')) ? 'now', 'state carries the server time');
select is(public.duel_state(pg_temp.tok('dc_c'), pg_temp.d('d1'))::jsonb, '{"error":"gone"}'::jsonb, 'an outsider cannot read the duel');

-- ── answering + scoring ─────────────────────────────────────────────────────
select is(public.duel_answer(pg_temp.tok('dc_a'), pg_temp.d('d1'), 0, '0')::jsonb, '{"error":"not_live"}'::jsonb, 'answer before start → not_live');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 0, '0'), '{"correct":true,"right":"0","points":142,"score":142,"streak":1,"lock_until":null}'::jsonb,
          'right at 2.0 s → 142');
select is((select ms from public.duel_answers where duel_id = pg_temp.d('d1') and uid = pg_temp.uid('dc_a') and idx = 0), 2000, 'ms measured from the start');
select is(pg_temp.msgs((select channel from public.duels where id = pg_temp.d('d1')), 'opp_answer'), 1, 'opp_answer broadcast');
select ok((select not (payload ? 'given') and not (payload ? 'correct') and (payload->>'idx')::int = 0
             from realtime.messages where event = 'opp_answer' limit 1), 'opp_answer carries only counters');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 1, '0')->>'points', '142', '2nd in a row → 142');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 2, '0')->>'points', '170', '3rd in a row → ×1.2 = 170');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 3, '10/2')->>'points', '170', 'number "10/2" = 5, 4th in a row → 170');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 4, '0'), '{"correct":true,"right":"0","points":213,"score":837,"streak":5,"lock_until":null}'::jsonb,
          '5th in a row → ×1.5 = 213');
select is(public.duel_answer(pg_temp.tok('dc_a'), pg_temp.d('d1'), 4, '0')::jsonb, '{"error":"order"}'::jsonb, 'same question twice → order');
select is(public.duel_answer(pg_temp.tok('dc_a'), pg_temp.d('d1'), 6, '0')::jsonb, '{"error":"order"}'::jsonb, 'skipping a question → order');
select is((select a_score from public.duels where id = pg_temp.d('d1')), 837, 'score unchanged after the refused answers');
select is((select count(*)::int from public.duel_answers where duel_id = pg_temp.d('d1') and uid = pg_temp.uid('dc_a')), 5, 'still 5 answers');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 5, '1')::jsonb - 'lock_until',
          '{"correct":false,"right":"0","points":0,"score":837,"streak":0}'::jsonb, 'wrong → 0 points, streak reset');
select is((select at + interval '2 seconds' from public.duel_answers where duel_id = pg_temp.d('d1') and uid = pg_temp.uid('dc_a') and idx = 5),
          (select (public.duel_state(pg_temp.tok('dc_a'), pg_temp.d('d1'))->'me'->>'lock_until')::timestamptz), 'state shows the 2-s lock');
select is(public.duel_answer(pg_temp.tok('dc_a'), pg_temp.d('d1'), 6, '0')::jsonb, '{"error":"locked"}'::jsonb, 'answer within 2 s of a wrong one → locked');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 6, '0', 1.9)::jsonb, '{"error":"locked"}'::jsonb, 'still locked at 1.9 s');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 6, '0')->>'points', '142', 'after the lock → 142 (streak 1)');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 7, '−5')->>'correct', 'false', 'number "−5" ≠ 5 → wrong');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 8, '0', 12.5)->>'points', '100', 'at 12.5 s no speed bonus → 100');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 9, '0', 0.3)->>'points', '149', 'at 0.3 s → 100 + round(48.8) = 149');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 10, '0')->>'points', '170', 'streak 3 → 170');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 11, '5.00')->>'points', '170', 'number "5.00", streak 4 → 170');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 12, '0')->>'points', '213', 'streak 5 → 213');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 13, '0')->>'points', '213', 'streak 6 → 213');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 14, '0')->>'points', '426', 'question 15 right at 2.0 s with streak ≥ 5 → 426');
select is(pg_temp.play('dc_a', pg_temp.d('d1'), 15, '0')::jsonb, '{"error":"order"}'::jsonb, 'no 16th question');
select is((pg_temp.st('dc_a', pg_temp.d('d1'))->'me'->>'done')::boolean, true, 'A is done');
select is((pg_temp.st('dc_a', pg_temp.d('d1'))->'me'->>'ok')::int, 13, 'A has 13 right');
select is(pg_temp.st('dc_a', pg_temp.d('d1'))->>'status', 'live', 'duel still live while B plays');
select is(pg_temp.st('dc_b', pg_temp.d('d1'))->'opp'->'lanes',
          '[true,true,true,true,true,false,true,false,true,true,true,true,true,true,true]'::jsonb, 'B sees A''s lane');
select is((pg_temp.st('dc_b', pg_temp.d('d1'))->'opp'->>'score')::int, 2420, 'B sees A''s score');
select ok(not (pg_temp.st('dc_b', pg_temp.d('d1')) ? 'result'), 'no result while live');
select is(public.duel_emote(pg_temp.tok('dc_a'), pg_temp.d('d1'), 'gg')::jsonb, '{"error":"not_done"}'::jsonb, 'emote while live → error');
select is(pg_temp.play_all('dc_b', pg_temp.d('d1'), '1')->>'score', '0', 'B answers everything wrong');

-- ── result ──────────────────────────────────────────────────────────────────
select is(pg_temp.status(pg_temp.d('d1')), 'done', 'both finished → done');
select is((select winner from public.duels where id = pg_temp.d('d1')), pg_temp.uid('dc_a'), 'A wins');
select is((select array[xp_a, xp_b] from public.duels where id = pg_temp.d('d1')), array[30, 10], 'XP 30 / 10 on the duel');
select is(array[pg_temp.xp('dc_a'), pg_temp.xp('dc_b')], array[30, 10], 'XP 30 / 10 added to duel_xp');
select is(pg_temp.msgs((select channel from public.duels where id = pg_temp.d('d1')), 'duel_end'), 1, 'duel_end broadcast');
select is(pg_temp.st('dc_a', pg_temp.d('d1'))->'result'->>'winner', pg_temp.uid('dc_a')::text, 'result: winner');
select is((pg_temp.st('dc_a', pg_temp.d('d1'))->'result'->>'xp_me')::int, 30, 'result: my XP');
select is((pg_temp.st('dc_b', pg_temp.d('d1'))->'result'->>'xp_me')::int, 10, 'result: loser XP');
select is(jsonb_array_length(pg_temp.st('dc_a', pg_temp.d('d1'))->'result'->'review'), 2, 'A reviews the 2 missed questions');
select is((pg_temp.st('dc_a', pg_temp.d('d1'))->'result'->'review'->0) - 'payload',
          '{"idx":5,"right":"0","given":"1"}'::jsonb, 'review: right answer + what I gave');
select is(jsonb_array_length(pg_temp.st('dc_b', pg_temp.d('d1'))->'result'->'review'), 15, 'B reviews all 15');
select is(pg_temp.st('dc_b', pg_temp.d('d1'))->'opp'->>'score', '2420', 'final scores in state');
select is(public.duel_answer(pg_temp.tok('dc_b'), pg_temp.d('d1'), 0, '0')::jsonb, '{"error":"not_live"}'::jsonb, 'answer after the end → not_live');
select is(json_typeof(public.presence_ping(pg_temp.tok('dc_a'))->'live'), 'null', 'ping: no live duel after the end');
select is((select (x->>'wins')::int * 10 + (x->>'losses')::int from json_array_elements(public.friends_me(pg_temp.tok('dc_a'))->'friends') x
            where (x->>'id')::uuid = pg_temp.uid('dc_b')), 10, 'friends_me: A vs B = 1–0');
select is((select (x->>'wins')::int * 10 + (x->>'losses')::int from json_array_elements(public.friends_me(pg_temp.tok('dc_b'))->'friends') x
            where (x->>'id')::uuid = pg_temp.uid('dc_a')), 1, 'friends_me: B vs A = 0–1');
select is((select (x->>'wins')::int + (x->>'losses')::int from json_array_elements(public.friends_me(pg_temp.tok('dc_b'))->'friends') x
            where (x->>'id')::uuid = pg_temp.uid('dc_d')), 0, 'friends_me: other friends stay 0–0');

-- emotes
select is(public.duel_emote(pg_temp.tok('dc_a'), pg_temp.d('d1'), 'hello')::jsonb, '{"error":"emote"}'::jsonb, 'unknown emote → error');
select is(public.duel_emote(pg_temp.tok('dc_a'), pg_temp.d('d1'), 'gg')::jsonb, '{"ok":true}'::jsonb, 'gg after the end → ok');
select is(public.duel_emote(pg_temp.tok('dc_a'), pg_temp.d('d1'), 'wow')::jsonb, '{"ok":true}'::jsonb, 'wow → ok');
select is(public.duel_emote(pg_temp.tok('dc_a'), pg_temp.d('d1'), 'again')::jsonb, '{"ok":true}'::jsonb, 'again → ok');
select is(public.duel_emote(pg_temp.tok('dc_a'), pg_temp.d('d1'), 'gg')::jsonb, '{"error":"limit"}'::jsonb, '4th emote → limit');
select is(public.duel_emote(pg_temp.tok('dc_c'), pg_temp.d('d1'), 'gg')::jsonb, '{"error":"gone"}'::jsonb, 'outsider emote → gone');
select is(pg_temp.st('dc_b', pg_temp.d('d1'))->'emotes'->0, jsonb_build_object('uid', pg_temp.uid('dc_a'), 'emote', 'gg'), 'B sees A''s emote');
select is(pg_temp.msgs((select channel from public.duels where id = pg_temp.d('d1')), 'emote'), 3, 'emotes broadcast');

-- history
select is((public.duel_history(pg_temp.tok('dc_a'))->'stats')::jsonb,
          '{"played":1,"wins":1,"losses":0,"draws":0,"perfect":0,"comebacks":0,"duel_xp":30}'::jsonb, 'history stats for A');
select is((public.duel_history(pg_temp.tok('dc_b'))->'recent'->0)::jsonb - 'at' - 'id',
          '{"opp":{"username":"dc_a","avatar":"teal"},"subject":"num","my":0,"their":2420,"result":"loss"}'::jsonb, 'history: recent duel for B');

-- ── cancel, decline, expiry, invite races (Review Focus 4) ──────────────────
select pg_temp.uncool('dc_a');
insert into t_d select 'd2', (public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_b'), 'random')->>'id')::uuid;
select is((select (x->'h2h')::jsonb from json_array_elements(public.presence_ping(pg_temp.tok('dc_b'))->'invites') x limit 1),
          '[0,1]'::jsonb, 'head-to-head from the invitee''s side');
select is(public.duel_cancel(pg_temp.tok('dc_a'), pg_temp.d('d2'))::jsonb, '{"status":"cancelled"}'::jsonb, 'A cancels');
select is(public.duel_answer_invite(pg_temp.tok('dc_b'), pg_temp.d('d2'), true)::jsonb, '{"error":"gone"}'::jsonb, 'accept after cancel → gone');
select is(pg_temp.msgs(pg_temp.inbox('dc_b'), 'invite_cancelled'), 1, 'cancel broadcast to B''s inbox');
select is(json_array_length(public.presence_ping(pg_temp.tok('dc_b'))->'invites'), 0, 'cancelled invite leaves the list');
select is(public.duel_cancel(pg_temp.tok('dc_a'), pg_temp.d('d2'))::jsonb, '{"error":"gone"}'::jsonb, 'cancel twice → gone');

select pg_temp.uncool('dc_a');
insert into t_d select 'd3', (public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_b'), 'alg')->>'id')::uuid;
update public.duels set expires_at = now() - interval '1 second' where id = pg_temp.d('d3');
select is(json_array_length(public.presence_ping(pg_temp.tok('dc_b'))->'invites'), 0, 'expired invite is not listed');
select is(public.duel_answer_invite(pg_temp.tok('dc_b'), pg_temp.d('d3'), true)::jsonb, '{"error":"gone"}'::jsonb, 'accept after expiry → gone');
select is(pg_temp.status(pg_temp.d('d3')), 'expired', 'status expired');
select is(public.duel_cancel(pg_temp.tok('dc_a'), pg_temp.d('d3'))::jsonb, '{"error":"gone"}'::jsonb, 'cancel after expiry → gone');

select pg_temp.uncool('dc_a');
insert into t_d select 'd4', (public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_b'), 'geo')->>'id')::uuid;
select is(public.duel_answer_invite(pg_temp.tok('dc_b'), pg_temp.d('d4'), false)::jsonb, '{"status":"declined"}'::jsonb, 'B declines');
select is(pg_temp.msgs(pg_temp.inbox('dc_a'), 'invite_answer'), 2, 'decline broadcast to A');
select is(public.duel_cancel(pg_temp.tok('dc_a'), pg_temp.d('d4'))::jsonb, '{"error":"gone"}'::jsonb, 'cancel after decline → gone');

-- a stale invite (never answered) doesn't make anyone busy
select pg_temp.uncool('dc_a');
insert into t_d select 'd5', (public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_b'), 'fn')->>'id')::uuid;
update public.duels set expires_at = now() - interval '1 second' where id = pg_temp.d('d5');
select ok(public.duel_invite(pg_temp.tok('dc_d'), pg_temp.uid('dc_b'), 'num')->>'id' is not null, 'expired invite → B is free for D');
select is(pg_temp.status(pg_temp.d('d5')), 'expired', 'the stale invite is marked expired');
-- block: D's open invite disappears for B, and D can't invite B any more
select is(public.friend_block(pg_temp.tok('dc_b'), pg_temp.uid('dc_d'))->>'ok', 'true', 'B blocks D');
select is(json_array_length(public.presence_ping(pg_temp.tok('dc_b'))->'invites'), 0, 'invite from a blocked friend is hidden');
select is(public.duel_answer_invite(pg_temp.tok('dc_b'), (select id from public.duels where a = pg_temp.uid('dc_d')), true)::jsonb,
          '{"error":"gone"}'::jsonb, 'invite from a blocked player can''t be accepted');
update public.duels set status = 'cancelled' where a = pg_temp.uid('dc_d');
select pg_temp.uncool('dc_d');
select is(public.duel_invite(pg_temp.tok('dc_d'), pg_temp.uid('dc_b'), 'num')::jsonb, '{"error":"not_friend"}'::jsonb, 'blocked → not_friend');
-- a friendship row left over next to a block (race) still refuses, both ways
select pg_temp.befriend('dc_d', 'dc_b');
select is(public.duel_invite(pg_temp.tok('dc_d'), pg_temp.uid('dc_b'), 'num')::jsonb, '{"error":"not_friend"}'::jsonb, 'blocked (friend row still there) → not_friend');
select is(public.duel_invite(pg_temp.tok('dc_b'), pg_temp.uid('dc_d'), 'num')::jsonb, '{"error":"not_friend"}'::jsonb, 'blocker inviting the blocked → not_friend');

-- ── tie-breaks, draw, daily XP cap ──────────────────────────────────────────
insert into t_d select 'd6', pg_temp.live('dc_a', 'dc_b');
select pg_temp.play_all('dc_a', pg_temp.d('d6'), 'right', 13);
select pg_temp.play_all('dc_b', pg_temp.d('d6'), 'right', 14);
select is((select array[a_score, b_score, a_ok, b_ok] from public.duels where id = pg_temp.d('d6')), array[2240, 2240, 15, 15], 'same score and same right answers');
select is((select winner from public.duels where id = pg_temp.d('d6')), pg_temp.uid('dc_a'), 'tie → lower total time wins (A)');
select is((select draw from public.duels where id = pg_temp.d('d6')), false, 'not a draw');
select is((public.duel_history(pg_temp.tok('dc_a'))->'stats'->>'perfect')::int, 1, 'a 15/15 duel counts as perfect');

insert into t_d select 'd7', pg_temp.live('dc_a', 'dc_b');
select pg_temp.play_all('dc_a', pg_temp.d('d7'), 'right', 3);
select pg_temp.play_all('dc_b', pg_temp.d('d7'), 'right', 3);
select is((select draw from public.duels where id = pg_temp.d('d7')), true, 'full tie → draw');
select ok((select winner is null from public.duels where id = pg_temp.d('d7')), 'a draw has no winner');
select is((select array[xp_a, xp_b] from public.duels where id = pg_temp.d('d7')), array[20, 20], 'draw → 20 / 20');
select is(pg_temp.st('dc_b', pg_temp.d('d7'))->'result'->>'draw', 'true', 'result says draw');

-- A has 3 finished duels today (d1, d6, d7); one more today vs D makes 4.
-- One from 3 days ago doesn't count. The 5th today earns XP, the 6th doesn't.
insert into public.duels (a, b, subject, status, created_at, finished_at, winner, xp_a, xp_b)
values (pg_temp.uid('dc_a'), pg_temp.uid('dc_d'), 'num', 'done', now() - interval '1 minute', now(), pg_temp.uid('dc_a'), 30, 10),
       (pg_temp.uid('dc_a'), pg_temp.uid('dc_d'), 'num', 'done', now() - interval '3 days', now() - interval '3 days', pg_temp.uid('dc_a'), 30, 10);
select is(pg_temp.xp('dc_a'), 80, 'A has 30 + 30 + 20 XP so far');
insert into t_d select 'd8', pg_temp.live('dc_a', 'dc_b');
select pg_temp.play_all('dc_a', pg_temp.d('d8'), 'right');
select pg_temp.play_all('dc_b', pg_temp.d('d8'), '1');
select is((select array[xp_a, xp_b] from public.duels where id = pg_temp.d('d8')), array[30, 10], '5th duel today (an old one doesn''t count) → 30 / 10');
insert into t_d select 'd8b', pg_temp.live('dc_a', 'dc_b');
select pg_temp.play_all('dc_a', pg_temp.d('d8b'), 'right');
select pg_temp.play_all('dc_b', pg_temp.d('d8b'), '1');
select is((select array[xp_a, xp_b] from public.duels where id = pg_temp.d('d8b')), array[0, 10], '6th duel today: A earns 0, B (5th) earns 10');
select is(pg_temp.xp('dc_a'), 110, 'A''s duel_xp unchanged by the 6th duel');
select is(pg_temp.xp('dc_b'), 60, 'B''s XP: 10 + 10 + 20 + 10 + 10');
-- 40 invites a day
insert into public.duels (a, b, subject, status, created_at)
select pg_temp.uid('dc_a'), pg_temp.uid('dc_b'), 'num', 'cancelled', now() - interval '1 minute'
  from generate_series(1, 40 - (select count(*)::int from public.duels where a = pg_temp.uid('dc_a')
                                   and (created_at at time zone 'Asia/Jerusalem')::date = (now() at time zone 'Asia/Jerusalem')::date));
select pg_temp.uncool('dc_a');
select is(public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_b'), 'num')::jsonb, '{"error":"limit_day"}'::jsonb, '41st invite in a day → limit_day');

-- ── time runs out (Review Focus 5) ──────────────────────────────────────────
insert into t_d select 'd9', pg_temp.live('dc_e', 'dc_f');
select pg_temp.play('dc_f', pg_temp.d('d9'), 0, '0');
select pg_temp.play('dc_f', pg_temp.d('d9'), 1, '0');
select pg_temp.play('dc_f', pg_temp.d('d9'), 2, '0');
update public.duels set ends_at = now() - interval '2.5 seconds' where id = pg_temp.d('d9');
select is(pg_temp.st('dc_e', pg_temp.d('d9'))->>'status', 'done', 'ends_at passed with F at idx 3 → state returns done');
select is((select winner from public.duels where id = pg_temp.d('d9')), pg_temp.uid('dc_f'), 'F (more points) wins at the end of time');
select is(public.duel_answer(pg_temp.tok('dc_f'), pg_temp.d('d9'), 3, '5')::jsonb, '{"error":"not_live"}'::jsonb, 'answer after the end → not_live');

insert into t_d select 'd10', pg_temp.live('dc_e', 'dc_f');
select pg_temp.play('dc_e', pg_temp.d('d10'), 0, '0');
update public.duels set ends_at = now() - interval '1.5 seconds' where id = pg_temp.d('d10');
select is(pg_temp.play('dc_e', pg_temp.d('d10'), 1, '0', 0)->>'points', '150', 'answer inside the 2-s grace still counts');
select is(pg_temp.status(pg_temp.d('d10')), 'live', 'still live inside the grace');
update public.duels set ends_at = now() - interval '2.5 seconds' where id = pg_temp.d('d10');
select is(public.duel_answer(pg_temp.tok('dc_e'), pg_temp.d('d10'), 2, '0')::jsonb, '{"error":"time"}'::jsonb, 'answer after ends_at + 2 s → time');
select is(pg_temp.status(pg_temp.d('d10')), 'done', 'the late answer closes the duel');
select is((select a_score from public.duels where id = pg_temp.d('d10')), 292, 'the late answer is not counted');

-- ── questions never arrive (Review Focus 5) ─────────────────────────────────
select pg_temp.uncool('dc_e');
insert into t_d select 'd11', (public.duel_invite(pg_temp.tok('dc_e'), pg_temp.uid('dc_f'), 'num')->>'id')::uuid;
select is(public.duel_answer_invite(pg_temp.tok('dc_f'), pg_temp.d('d11'), true)->>'status', 'accepted', 'F accepts');
update public.duels set accepted_at = now() - interval '9 seconds' where id = pg_temp.d('d11');
select is(pg_temp.st('dc_e', pg_temp.d('d11'))->>'status', 'accepted', 'after 9 s still waiting for questions');
update public.duels set accepted_at = now() - interval '11 seconds' where id = pg_temp.d('d11');
select is(pg_temp.st('dc_e', pg_temp.d('d11'))->>'status', 'failed', 'no questions after 10 s → failed');
select is(public.duel_put_questions('test-secret', pg_temp.d('d11'), pg_temp.rows())::jsonb, '{"error":"gone"}'::jsonb, 'questions after failing → gone');
select is(json_typeof(public.presence_ping(pg_temp.tok('dc_f'))->'live'), 'null', 'a failed duel is not "live" in ping');
select is((select array[xp_a, xp_b] from public.duels where id = pg_temp.d('d11')), array[0, 0], 'a failed duel gives no XP');
-- ping also fails it (without anyone opening the duel)
select pg_temp.uncool('dc_e');
insert into t_d select 'd12', (public.duel_invite(pg_temp.tok('dc_e'), pg_temp.uid('dc_f'), 'num')->>'id')::uuid;
select public.duel_answer_invite(pg_temp.tok('dc_f'), pg_temp.d('d12'), true);
update public.duels set accepted_at = now() - interval '11 seconds' where id = pg_temp.d('d12');
select is(json_typeof(public.presence_ping(pg_temp.tok('dc_e'))->'live'), 'null', 'ping: stuck duel is not live');
select is(pg_temp.status(pg_temp.d('d12')), 'failed', 'ping marks the stuck duel failed');

-- ── give up ─────────────────────────────────────────────────────────────────
insert into t_d select 'd13', pg_temp.live('dc_e', 'dc_f');
select pg_temp.play('dc_e', pg_temp.d('d13'), 0, '0');
select is(public.duel_give_up(pg_temp.tok('dc_e'), pg_temp.d('d13'))::jsonb, '{"ok":true}'::jsonb, 'E gives up');
select is(pg_temp.status(pg_temp.d('d13')), 'done', 'give up ends the duel');
select is((select winner from public.duels where id = pg_temp.d('d13')), pg_temp.uid('dc_f'), 'the other player wins even with fewer points');
select is((select xp_a from public.duels where id = pg_temp.d('d13')), 0, 'giving up earns no XP');
select is(public.duel_give_up(pg_temp.tok('dc_f'), pg_temp.d('d13'))::jsonb, '{"error":"not_live"}'::jsonb, 'give up after the end → not_live');

-- ── comeback ────────────────────────────────────────────────────────────────
insert into t_d select 'd14', pg_temp.live('dc_g', 'dc_h');
-- H leads 1000–0 when both have 10 answers; G wins in the end
insert into public.duel_answers (duel_id, uid, idx, given, correct, points, ms, at)
select pg_temp.d('d14'), pg_temp.uid('dc_g'), i, '1', false, 0, 1000, now() - interval '100 seconds' + i * interval '1 second' from generate_series(0, 9) i
union all
select pg_temp.d('d14'), pg_temp.uid('dc_h'), i, '0', true, 100, 1000, now() - interval '80 seconds' + i * interval '1 second' from generate_series(0, 9) i
union all
select pg_temp.d('d14'), pg_temp.uid('dc_g'), i, '0', true, 500, 1000, now() - interval '50 seconds' + i * interval '1 second' from generate_series(10, 14) i;
update public.duels set ends_at = now() - interval '3 seconds' where id = pg_temp.d('d14');
select is(pg_temp.st('dc_g', pg_temp.d('d14'))->'result'->>'winner', pg_temp.uid('dc_g')::text, 'G wins 2500–1000');
select is((select comeback_by from public.duels where id = pg_temp.d('d14')), pg_temp.uid('dc_g'), 'G was behind at question 10 → comeback');
select is((public.duel_history(pg_temp.tok('dc_g'))->'stats'->>'comebacks')::int, 1, 'history counts the comeback');
select ok((select comeback_by is null from public.duels where id = pg_temp.d('d1')), 'a leader who stays ahead is no comeback');

-- ── release switch ──────────────────────────────────────────────────────────
update public.site_settings set value = '"off"' where key = 'duels';
select is(public.duel_invite(pg_temp.tok('dc_a'), pg_temp.uid('dc_b'), 'num')::jsonb, '{"error":"off"}'::jsonb, 'switch off → duel_invite off');
select is(public.duel_state(pg_temp.tok('dc_a'), pg_temp.d('d1'))::jsonb, '{"error":"off"}'::jsonb, 'switch off → duel_state off');
select is(public.duel_answer(pg_temp.tok('dc_a'), pg_temp.d('d1'), 0, '0')::jsonb, '{"error":"off"}'::jsonb, 'switch off → duel_answer off');
select is(public.duel_history(pg_temp.tok('dc_a'))::jsonb, '{"error":"off"}'::jsonb, 'switch off → duel_history off');
update public.site_settings set value = '"on"' where key = 'duels';

-- ── Task 1 follow-ups ───────────────────────────────────────────────────────
-- (a) my shadow request turns into a real one when I add again after being unblocked
select is(public.friend_block(pg_temp.tok('dc_h'), pg_temp.uid('dc_c'))->>'ok', 'true', 'H blocks C');
select is(public.friend_add(pg_temp.tok('dc_c'), (select friend_code from public.accounts where id = pg_temp.uid('dc_h')))->>'state', 'sent', 'C adds H (shadow)');
select is(public.friend_unblock(pg_temp.tok('dc_h'), pg_temp.uid('dc_c'))->>'ok', 'true', 'H unblocks C');
select is(public.friend_add(pg_temp.tok('dc_c'), (select friend_code from public.accounts where id = pg_temp.uid('dc_h')))->>'state', 'sent', 'C adds H again');
select is((select count(*)::int from json_array_elements(public.friends_me(pg_temp.tok('dc_h'))->'incoming') x
            where (x->>'id')::uuid = pg_temp.uid('dc_c')), 1, 'H now sees C''s request');
-- (b) a request from someone I blocked (left by a race) is hidden and can't be accepted
insert into public.friendships (a, b, status, requested_by)
values (least(pg_temp.uid('dc_e'), pg_temp.uid('dc_c')), greatest(pg_temp.uid('dc_e'), pg_temp.uid('dc_c')), 'pending', pg_temp.uid('dc_e'));
insert into public.blocks (blocker, blocked) values (pg_temp.uid('dc_c'), pg_temp.uid('dc_e'));
select is((select count(*)::int from json_array_elements(public.friends_me(pg_temp.tok('dc_c'))->'incoming') x
            where (x->>'id')::uuid = pg_temp.uid('dc_e')), 0, 'request from a blocked player is hidden');
select is(public.friend_answer(pg_temp.tok('dc_c'), pg_temp.uid('dc_e'), true)::jsonb, '{"error":"gone"}'::jsonb, 'and can''t be accepted');

-- ── no direct access for the public ─────────────────────────────────────────
select ok(not has_function_privilege('anon', 'public.duel_finish_if_due(uuid)', 'execute'), 'anon cannot call duel_finish_if_due');
select ok(not has_function_privilege('anon', 'public.duel_check(text, text, numeric, text)', 'execute'), 'anon cannot call duel_check');
select ok(has_function_privilege('anon', 'public.duel_answer(text, uuid, integer, text)', 'execute'), 'anon can call duel_answer (token checked inside)');
select ok(has_function_privilege('anon', 'public.duel_put_questions(text, uuid, jsonb)', 'execute'), 'anon can call duel_put_questions (secret checked inside)');
set local role anon;
select throws_ok('select * from public.duels', '42501', null, 'anon cannot read duels');
select throws_ok('select * from public.duel_questions', '42501', null, 'anon cannot read duel_questions');
select throws_ok('select * from public.duel_answers', '42501', null, 'anon cannot read duel_answers');
select throws_ok('select * from public.duel_emotes', '42501', null, 'anon cannot read duel_emotes');
reset role;

select * from finish();
rollback;
