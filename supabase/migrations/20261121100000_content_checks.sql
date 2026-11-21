-- Content review (admin → תיקונים → בקרת תוכן, 2026-11-21, Abed approved; design/admin-review/design.md §5):
-- "✓ checked" per chapter, shared between Sulaiman's phone and Abed's desktop.
--
-- One small append-only table: every ✓ is a new row (the history of who checked what, when). The panel
-- reads the LATEST row per (topic, section); a ✓ older than a later fix is shown as "not checked" by the
-- panel itself (computed, nothing stored). Un-checking deletes that chapter's rows.
--   topic   = registry slug ('powers-roots'), section = the exact chapter-button text ('2. חוקי חזקות')
-- Admin only (PIN session), nothing public: RLS on, no table or sequence rights for the public roles,
-- every function starts with admin_guard(tok).

create table if not exists public.content_checks (
  id         bigint generated always as identity primary key,
  topic      text not null check (length(topic) between 1 and 80),
  section    text not null check (length(section) between 1 and 200),
  author     text not null,
  created_at timestamptz not null default now()
);
create index if not exists content_checks_place on public.content_checks(topic, section, created_at desc);

alter table public.content_checks enable row level security;
revoke all on public.content_checks from anon, authenticated;
revoke all on sequence public.content_checks_id_seq from anon, authenticated;
-- (same hardening for the attachments' sequence; a no-op where it was never granted)
revoke all on sequence public.fix_files_id_seq from anon, authenticated;

-- the latest ✓ of every chapter: [{id, topic, section, author, created_at, times}] (times = how many ✓ rows it has)
create or replace function public.admin_content_checks(tok uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return coalesce((
    select json_agg(json_build_object('id', x.id, 'topic', x.topic, 'section', x.section, 'author', x.author,
                                      'created_at', x.created_at, 'times', x.times) order by x.topic, x.section)
    from (
      select distinct on (c.topic, c.section) c.id, c.topic, c.section, c.author, c.created_at,
             count(*) over (partition by c.topic, c.section) as times
      from content_checks c
      order by c.topic, c.section, c.created_at desc, c.id desc
    ) x
  ), '[]');
end $$;

-- ✓ one chapter (a new row every time = history); answers with the new row
create or replace function public.admin_content_check(tok uuid, topic text, section text, author text)
returns json language plpgsql security definer set search_path = public as $$
declare t text := trim(coalesce(admin_content_check.topic, ''));
        s text := trim(coalesce(admin_content_check.section, ''));
        r content_checks;
begin
  perform admin_guard(tok);
  if t = '' or s = '' then return json_build_object('error', 'empty'); end if;
  if length(t) > 80 or length(s) > 200 then return json_build_object('error', 'long'); end if;
  insert into content_checks (topic, section, author)
  values (t, s, left(coalesce(nullif(trim(admin_content_check.author), ''), 'צוות'), 40))
  returning * into r;
  return json_build_object('id', r.id, 'topic', r.topic, 'section', r.section, 'author', r.author, 'created_at', r.created_at);
end $$;

-- un-✓ one chapter: removes its rows; answers {ok, deleted}
create or replace function public.admin_content_uncheck(tok uuid, topic text, section text)
returns json language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform admin_guard(tok);
  delete from content_checks c
   where c.topic = trim(coalesce(admin_content_uncheck.topic, ''))
     and c.section = trim(coalesce(admin_content_uncheck.section, ''));
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'deleted', n);
end $$;

revoke execute on function public.admin_content_checks(uuid), public.admin_content_check(uuid, text, text, text),
  public.admin_content_uncheck(uuid, text, text) from public;
grant execute on function public.admin_content_checks(uuid), public.admin_content_check(uuid, text, text, text),
  public.admin_content_uncheck(uuid, text, text) to anon, authenticated;
