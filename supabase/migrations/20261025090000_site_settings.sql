-- Site-wide switches the admin can turn on/off (e.g. the math keypad).
-- Everyone may read them; only a signed-in admin may change them.

create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
drop policy if exists "public reads site settings" on public.site_settings;
create policy "public reads site settings" on public.site_settings for select to anon, authenticated using (true);
revoke insert, update, delete on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;

insert into public.site_settings (key, value) values ('keypad', 'true'::jsonb)
on conflict (key) do nothing;

create or replace function public.admin_set_setting(tok uuid, k text, v jsonb)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard(tok);
  if k not in ('keypad') then return json_build_object('error', 'unknown'); end if;
  insert into site_settings (key, value, updated_at) values (k, v, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return json_build_object('ok', true, 'key', k, 'value', v);
end $$;

revoke execute on function public.admin_set_setting(uuid, text, jsonb) from public;
grant execute on function public.admin_set_setting(uuid, text, jsonb) to anon, authenticated;
