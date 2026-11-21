-- Content review (admin → בקרת תוכן), Abed 2026-11-21: a status per topic so Sulaiman can mark it
-- "ready" (מוכן) or "still missing" (חסר עוד). One row per topic (registry slug); no row = not marked yet.
-- Admin only (PIN session), nothing public: RLS on, no table rights for the public roles,
-- every function starts with admin_guard(tok).

create table if not exists public.topic_status (
  topic      text primary key check (length(topic) between 1 and 80),
  status     text not null check (status in ('ready', 'missing')),
  author     text not null,
  updated_at timestamptz not null default now()
);
alter table public.topic_status enable row level security;
revoke all on public.topic_status from anon, authenticated;

-- every marked topic: [{topic, status, author, updated_at}]
create or replace function public.admin_topic_statuses(tok uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return coalesce((select json_agg(json_build_object('topic', s.topic, 'status', s.status, 'author', s.author,
                                                     'updated_at', s.updated_at) order by s.topic)
                   from topic_status s), '[]');
end $$;

-- set one topic's status ('ready' | 'missing'); null or '' clears it. Answers with the row, or {ok, cleared}.
create or replace function public.admin_topic_status_set(tok uuid, topic text, status text, author text)
returns json language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare t text := trim(coalesce(admin_topic_status_set.topic, ''));
        s text := nullif(trim(coalesce(admin_topic_status_set.status, '')), '');
        r topic_status;
begin
  perform admin_guard(tok);
  if t = '' then return json_build_object('error', 'empty'); end if;
  if length(t) > 80 then return json_build_object('error', 'long'); end if;
  if s is null then
    delete from topic_status x where x.topic = t;
    return json_build_object('ok', true, 'cleared', true);
  end if;
  if s not in ('ready', 'missing') then return json_build_object('error', 'status'); end if;
  insert into topic_status (topic, status, author, updated_at)
  values (t, s, left(coalesce(nullif(trim(admin_topic_status_set.author), ''), 'צוות'), 40), now())
  on conflict (topic) do update set status = excluded.status, author = excluded.author, updated_at = now()
  returning * into r;
  return json_build_object('topic', r.topic, 'status', r.status, 'author', r.author, 'updated_at', r.updated_at);
end $$;

revoke execute on function public.admin_topic_statuses(uuid), public.admin_topic_status_set(uuid, text, text, text) from public;
grant execute on function public.admin_topic_statuses(uuid), public.admin_topic_status_set(uuid, text, text, text) to anon, authenticated;

-- (hardening) the attachments' row helper is internal: on a fresh local stack the public roles got it by
-- default privileges, so the catalog test failed locally; the live database already denies it.
revoke execute on function public.fix_file_json(fix_files) from anon, authenticated;
