-- Fixes board attachments (2026-11-14, Abed): images, PDFs and links on a board item or on
-- one of its comments.
--
-- Files live in the PRIVATE storage bucket "fix-files" (no storage policies at all, so the
-- public key can neither list, read nor write it). Only the edge function fix-files touches
-- objects, with the service role, and only for paths these PIN-guarded functions hand it:
--   1. admin_fix_file_begin(tok, …)   → a pending row + a fresh random path
--   2. fix-files "upload"             → a one-time signed upload URL for that path
--   3. the browser PUTs the file to that URL
--   4. admin_fix_file_ready(tok, id)  → checks the object really exists, shows it on the board
-- Reading: fix-files "urls" signs 1-hour links for the ids admin_fix_file_paths(tok, …) returns.
-- Links (kind 'link') are plain rows: admin_fix_link_add.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fix-files', 'fix-files', false, 20971520,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.fix_files (
  id         bigint generated always as identity primary key,
  item_id    bigint not null references public.fix_items(id) on delete cascade,
  comment_id bigint references public.fix_comments(id) on delete cascade,  -- null = on the item itself
  kind       text not null check (kind in ('file', 'link')),
  name       text not null,                 -- file name, or the link's title
  path       text unique,                   -- storage object path (files)
  url        text,                          -- links
  mime       text,
  size       integer,
  ready      boolean not null default false, -- files: true once the upload is confirmed
  author     text not null,
  created_at timestamptz not null default now(),
  check ((kind = 'file' and path is not null and mime is not null) or (kind = 'link' and url is not null))
);
create index if not exists fix_files_item on public.fix_files(item_id, created_at);

alter table public.fix_files enable row level security;
revoke all on public.fix_files from anon, authenticated;

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function public.fix_file_json(f fix_files)
returns json language sql immutable as $$
  select json_build_object('id', f.id, 'comment_id', f.comment_id, 'kind', f.kind, 'name', f.name,
    'url', f.url, 'mime', f.mime, 'size', f.size, 'author', f.author, 'created_at', f.created_at)
$$;

-- ── the board, now with attachments ──────────────────────────────────────────
create or replace function public.admin_fixes(tok uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return coalesce((
    select json_agg(row_to_json(x) order by x.updated_at desc)
    from (
      select i.*,
        coalesce((select json_agg(c order by c.created_at)
                  from (select id, author, body, status, created_at from fix_comments where item_id = i.id) c), '[]') as comments,
        coalesce((select json_agg(fix_file_json(f) order by f.created_at)
                  from fix_files f where f.item_id = i.id and (f.kind = 'link' or f.ready)), '[]') as files
      from fix_items i
    ) x
  ), '[]');
end $$;

-- comments: now answer with the new comment's id (attachments hang on it), and a comment may be
-- attachments only (has_files) — the body can then be empty.
drop function if exists public.admin_fix_comment(uuid, bigint, text, text, text);
create or replace function public.admin_fix_comment(tok uuid, item_id bigint, author text, body text,
                                                    new_status text default null, has_files boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  perform admin_guard(tok);
  if new_status is not null and new_status not in ('new','working','review','reopened','done','later') then
    return json_build_object('error', 'status');
  end if;
  if coalesce(trim(body), '') = '' and new_status is null and not coalesce(has_files, false) then
    return json_build_object('error', 'empty');
  end if;
  if not exists (select 1 from fix_items where id = item_id) then return json_build_object('error', 'missing'); end if;
  insert into fix_comments (item_id, author, body, status)
  values (item_id, left(coalesce(nullif(trim(author), ''), 'צוות'), 40), coalesce(trim(body), ''), new_status)
  returning id into cid;
  update fix_items set status = coalesce(new_status, status), updated_at = now() where id = item_id;
  return json_build_object('ok', true, 'id', cid);
end $$;

-- 1. reserve a path for an upload (the browser then asks fix-files for a signed upload URL)
create or replace function public.admin_fix_file_begin(tok uuid, item_id bigint, comment_id bigint,
                                                       name text, mime text, size integer, author text)
returns json language plpgsql security definer set search_path = public as $$
declare ext text; p text; r fix_files;
begin
  perform admin_guard(tok);
  ext := case mime when 'image/png' then 'png' when 'image/jpeg' then 'jpg' when 'image/webp' then 'webp'
                   when 'image/gif' then 'gif' when 'application/pdf' then 'pdf' end;
  if ext is null then return json_build_object('error', 'type'); end if;
  if size is null or size <= 0 or size > 20971520 then return json_build_object('error', 'size'); end if;
  if not exists (select 1 from fix_items i where i.id = admin_fix_file_begin.item_id) then
    return json_build_object('error', 'missing');
  end if;
  if comment_id is not null and not exists (select 1 from fix_comments c
      where c.id = admin_fix_file_begin.comment_id and c.item_id = admin_fix_file_begin.item_id) then
    return json_build_object('error', 'missing');
  end if;
  if (select count(*) from fix_files f where f.item_id = admin_fix_file_begin.item_id) >= 40 then
    return json_build_object('error', 'too_many');
  end if;
  -- uploads that never finished (tab closed mid-way): forget them after a day
  delete from fix_files f where f.kind = 'file' and not f.ready and f.created_at < now() - interval '1 day';
  p := admin_fix_file_begin.item_id || '/' || gen_random_uuid() || '.' || ext;
  insert into fix_files (item_id, comment_id, kind, name, path, mime, size, author)
  values (admin_fix_file_begin.item_id, admin_fix_file_begin.comment_id, 'file',
          left(coalesce(nullif(trim(name), ''), 'קובץ.' || ext), 120), p, mime, size,
          left(coalesce(nullif(trim(author), ''), 'צוות'), 40))
  returning * into r;
  return json_build_object('id', r.id, 'path', r.path);
end $$;

-- 4. the upload finished: show it (only if the object is really there)
create or replace function public.admin_fix_file_ready(tok uuid, file_id bigint)
returns json language plpgsql security definer set search_path = public, storage as $$
declare r fix_files;
begin
  perform admin_guard(tok);
  select * into r from fix_files where id = file_id and kind = 'file';
  if not found then return json_build_object('error', 'missing'); end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'fix-files' and o.name = r.path) then
    return json_build_object('error', 'not_uploaded');
  end if;
  update fix_files set ready = true where id = file_id returning * into r;
  update fix_items set updated_at = now() where id = r.item_id;
  return fix_file_json(r);
end $$;

-- storage paths the caller may read (ready files only); fix-files signs them
create or replace function public.admin_fix_file_paths(tok uuid, ids bigint[])
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return coalesce((select json_agg(json_build_object('id', f.id, 'path', f.path))
                   from fix_files f where f.id = any(ids) and f.kind = 'file' and f.ready), '[]');
end $$;

-- remove one attachment (fix-files then deletes the object, if it was a file)
create or replace function public.admin_fix_file_delete(tok uuid, file_id bigint)
returns json language plpgsql security definer set search_path = public as $$
declare p text;
begin
  perform admin_guard(tok);
  delete from fix_files where id = file_id returning path into p;
  return json_build_object('ok', true, 'path', p);
end $$;

-- every stored file of an item (fix-files deletes the objects before the item itself is deleted)
create or replace function public.admin_fix_item_paths(tok uuid, item_id bigint)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  return coalesce((select json_agg(f.path) from fix_files f
                   where f.item_id = admin_fix_item_paths.item_id and f.kind = 'file'), '[]');
end $$;

-- a link (http/https only)
create or replace function public.admin_fix_link_add(tok uuid, item_id bigint, comment_id bigint,
                                                     url text, title text, author text)
returns json language plpgsql security definer set search_path = public as $$
declare u text := trim(coalesce(url, '')); r fix_files;
begin
  perform admin_guard(tok);
  if u !~* '^https?://[^\s/]+\.[^\s]+$' or length(u) > 2000 then return json_build_object('error', 'url'); end if;
  if not exists (select 1 from fix_items i where i.id = admin_fix_link_add.item_id) then
    return json_build_object('error', 'missing');
  end if;
  if comment_id is not null and not exists (select 1 from fix_comments c
      where c.id = admin_fix_link_add.comment_id and c.item_id = admin_fix_link_add.item_id) then
    return json_build_object('error', 'missing');
  end if;
  insert into fix_files (item_id, comment_id, kind, name, url, ready, author)
  values (admin_fix_link_add.item_id, admin_fix_link_add.comment_id, 'link',
          left(coalesce(nullif(trim(title), ''), regexp_replace(u, '^https?://(www\.)?([^/?#]+).*$', '\2')), 120),
          u, true, left(coalesce(nullif(trim(author), ''), 'צוות'), 40))
  returning * into r;
  update fix_items set updated_at = now() where id = r.item_id;
  return fix_file_json(r);
end $$;

revoke execute on function public.fix_file_json(fix_files) from public;
revoke execute on function public.admin_fix_comment(uuid, bigint, text, text, text, boolean),
  public.admin_fix_file_begin(uuid, bigint, bigint, text, text, integer, text), public.admin_fix_file_ready(uuid, bigint),
  public.admin_fix_file_paths(uuid, bigint[]), public.admin_fix_file_delete(uuid, bigint),
  public.admin_fix_item_paths(uuid, bigint), public.admin_fix_link_add(uuid, bigint, bigint, text, text, text) from public;
grant execute on function public.admin_fix_comment(uuid, bigint, text, text, text, boolean),
  public.admin_fix_file_begin(uuid, bigint, bigint, text, text, integer, text), public.admin_fix_file_ready(uuid, bigint),
  public.admin_fix_file_paths(uuid, bigint[]), public.admin_fix_file_delete(uuid, bigint),
  public.admin_fix_item_paths(uuid, bigint), public.admin_fix_link_add(uuid, bigint, bigint, text, text, text)
  to anon, authenticated;
