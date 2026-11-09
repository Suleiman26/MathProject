-- Duels, task 8: the result screen's facts.
--  * duel_state: result gains `best_streak` (my longest run of right answers)
--    and `avg_ms` (my average time per answered question, null when I answered
--    nothing). Otherwise identical to 20261108110000_duels_core.sql.
-- Grants stay as they were (create or replace keeps them).

create or replace function public.duel_state(tok text, id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := duel_uid(tok); g text := duel_guard(me); d duels; opp uuid; r jsonb;
begin
  if g is not null then return json_build_object('error', g); end if;
  select * into d from duels where duels.id = duel_state.id;
  if not found or me not in (d.a, d.b) then return json_build_object('error', 'gone'); end if;
  perform duel_finish_if_due(d.id);
  select * into d from duels where duels.id = duel_state.id;
  opp := case when me = d.a then d.b else d.a end;
  r := jsonb_build_object(
    'id', d.id, 'now', now(), 'status', d.status, 'subject', d.subject, 'i_invited', me = d.a,
    'created_at', d.created_at, 'expires_at', d.expires_at, 'accepted_at', d.accepted_at,
    'start_at', d.start_at, 'ends_at', d.ends_at, 'channel', d.channel,
    'me', duel_player(d.id, me, true),
    'opp', duel_player(d.id, opp, false),
    'my_lanes', duel_lanes(d.id, me),
    -- live: only the questions up to my current one (no reading ahead); done: all
    'questions', case when d.status in ('live', 'done') then
        coalesce((select jsonb_agg(jsonb_build_object('idx', q.idx, 'kind', q.kind, 'payload', q.payload) order by q.idx)
                    from duel_questions q
                   where q.duel_id = d.id
                     and (d.status = 'done'
                          or q.idx <= (select count(*) from duel_answers da where da.duel_id = d.id and da.uid = me))), '[]'::jsonb)
      else '[]'::jsonb end,
    'emotes', coalesce((select jsonb_agg(jsonb_build_object('uid', e.uid, 'emote', e.emote) order by e.at, e.id)
                          from duel_emotes e where e.duel_id = d.id), '[]'::jsonb));
  if d.status = 'done' then
    r := r || jsonb_build_object('result', jsonb_build_object(
      'winner', d.winner, 'draw', d.draw,
      'xp_me', case when me = d.a then d.xp_a else d.xp_b end,
      'comeback_by', d.comeback_by, 'gave_up', d.gave_up,
      -- my facts for the result screen: best streak and average time per answered question
      'best_streak', (select coalesce(max(a.streak), 0) from duel_answers a where a.duel_id = d.id and a.uid = me),
      'avg_ms', (select round(avg(a.ms))::int from duel_answers a where a.duel_id = d.id and a.uid = me),
      -- what to review: every question I missed or didn't reach, with the right answer
      'review', coalesce((select jsonb_agg(jsonb_build_object('idx', q.idx, 'payload', q.payload, 'right', q.answer, 'given', a.given) order by q.idx)
                            from duel_questions q
                            left join duel_answers a on a.duel_id = q.duel_id and a.uid = me and a.idx = q.idx
                           where q.duel_id = d.id and coalesce(a.correct, false) = false), '[]'::jsonb)));
  end if;
  return r::json;
end $$;
