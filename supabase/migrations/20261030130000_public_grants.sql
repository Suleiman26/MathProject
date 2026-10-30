-- New Supabase projects (2026) no longer give the public roles table access by
-- default. Grant exactly what the site needs; the row-level policies in
-- 20261024120000_admin.sql still decide which rows (only visible / active ones).
grant usage on schema public to anon, authenticated;
grant select on public.grades, public.categories, public.topics, public.plans to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert (device, page, chapter, step, kind, mobile) on public.events to anon, authenticated;
