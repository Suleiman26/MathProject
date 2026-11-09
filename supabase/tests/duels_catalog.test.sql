-- The whole public schema, checked from the catalog (final wave, F9):
--  * every function the site's public roles (anon, authenticated) can execute is
--    on the allow-list below — a new function that forgot its `revoke` fails here;
--  * every table has row-level security on;
--  * the public roles hold no table rights except SELECT on the content tables
--    and the guest answer-stats INSERT columns on events; no view or sequence rights.
-- Run: supabase test db   (local Supabase must be running)
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

create temporary table t_allow (sig text primary key);
insert into t_allow values
  -- student accounts (each checks the session token)
  ('account_accept_terms(tok text, terms_version text, parent_ok boolean)'),
  ('account_achievements(tok text)'),
  ('account_delete(tok text, password text)'),
  ('account_login(username text, password text)'),
  ('account_logout(tok text)'),
  ('account_me(tok text)'),
  ('account_name_free(username text)'),
  ('account_password(tok text, old_password text, new_password text)'),
  ('account_progress(tok text)'),
  ('account_set_goal(tok text, goal integer)'),
  ('account_signup(username text, password text, grade text, terms_version text, accept boolean, parent_ok boolean, device text)'),
  ('account_terms_version()'),
  ('account_topic(tok text, page text)'),
  ('account_track(tok text, rows jsonb)'),
  ('account_update(tok text, grade text, avatar text)'),
  ('contact_send(name text, reply_to text, body text, device text)'),
  -- admin (each checks the PIN session)
  ('admin_account_reset(tok uuid, username text, new_password text)'),
  ('admin_catalog(tok uuid)'),
  ('admin_change_pin(tok uuid, old_pin text, new_pin text)'),
  ('admin_contact(tok uuid)'),
  ('admin_contact_done(tok uuid, msg_id bigint, done boolean)'),
  ('admin_delete(tok uuid, kind text, rid uuid)'),
  ('admin_duels(tok uuid)'),
  ('admin_export(tok uuid, days integer)'),
  ('admin_fix_add(tok uuid, topic text, section text, body text, author text)'),
  ('admin_fix_comment(tok uuid, item_id bigint, author text, body text, new_status text)'),
  ('admin_fix_delete(tok uuid, item_id bigint)'),
  ('admin_fix_edit(tok uuid, item_id bigint, topic text, section text, body text)'),
  ('admin_fixes(tok uuid)'),
  ('admin_login(pin text)'),
  ('admin_logout(tok uuid)'),
  ('admin_reorder(tok uuid, kind text, ids uuid[])'),
  ('admin_report_done(tok uuid, id bigint)'),
  ('admin_reports(tok uuid)'),
  ('admin_sales(tok uuid)'),
  ('admin_save(tok uuid, kind text, item jsonb)'),
  ('admin_set_duel_ban(tok uuid, account uuid, banned boolean)'),
  ('admin_set_setting(tok uuid, k text, v jsonb)'),
  ('admin_set_tester(tok uuid, account uuid, "on" boolean)'),
  ('admin_stats(tok uuid, days integer)'),
  ('admin_student(tok uuid, account_id uuid, device text, days integer)'),
  ('admin_students(tok uuid, days integer)'),
  -- friends + duels (session token + duel_guard)
  ('duel_answer(tok text, id uuid, idx integer, given text)'),
  ('duel_answer_invite(tok text, id uuid, accept boolean)'),
  ('duel_cancel(tok text, id uuid)'),
  ('duel_claim_start(tok text, id uuid)'),
  ('duel_emote(tok text, id uuid, emote text)'),
  ('duel_give_up(tok text, id uuid)'),
  ('duel_history(tok text)'),
  ('duel_invite(tok text, friend uuid, subject text)'),
  ('duel_online(tok text)'),
  ('duel_state(tok text, id uuid)'),
  ('friend_add(tok text, code text)'),
  ('friend_answer(tok text, other uuid, accept boolean)'),
  ('friend_block(tok text, other uuid)'),
  ('friend_remove(tok text, other uuid)'),
  ('friend_report(tok text, other uuid, reason text, duel uuid)'),
  ('friend_unblock(tok text, other uuid)'),
  ('friends_me(tok text)'),
  ('presence_ping(tok text)'),
  ('push_remove(tok text, endpoint text)'),
  ('push_save(tok text, sub jsonb)'),
  -- edge functions (each checks a Vault secret)
  ('duel_put_questions(secret text, id uuid, rows jsonb)'),
  ('push_done(secret text, ok text[], gone text[], failed text[])'),
  ('push_info(secret text, duel_id uuid, to_uid uuid)');

-- every function in public the public roles can run
create temporary view t_exec as
  select r.rolname as role, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as sig, p.prosecdef
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('anon'), ('authenticated')) r(rolname)
   where n.nspname = 'public' and p.prokind in ('f', 'p')
     and has_function_privilege(r.rolname, p.oid, 'execute');

select is((select coalesce(array_agg(sig order by sig), '{}') from t_exec where role = 'anon' and sig not in (select sig from t_allow)),
          '{}'::text[], 'anon can run only allow-listed functions');
select is((select coalesce(array_agg(sig order by sig), '{}') from t_exec where role = 'authenticated' and sig not in (select sig from t_allow)),
          '{}'::text[], 'authenticated can run only allow-listed functions');
select is((select coalesce(array_agg(sig order by sig), '{}') from t_exec where role = 'anon' and not prosecdef and sig <> 'account_terms_version()'),
          '{}'::text[], 'every function the site can call runs as its owner (security definer), except the constant terms version');
select is((select coalesce(array_agg(sig order by sig), '{}') from t_allow where sig not in (select sig from t_exec where role = 'anon')),
          '{}'::text[], 'every allow-listed function exists and the site can call it (the list is not stale)');

-- tables, views, sequences
select is((select coalesce(array_agg(c.relname::text order by c.relname), '{}') from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
          '{}'::text[], 'every public table has row-level security on');
select is((select coalesce(array_agg(table_name || ':' || grantee || ':' || privilege_type order by 1), '{}')
             from information_schema.role_table_grants
            where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
              and not (privilege_type = 'SELECT' and table_name in ('grades', 'categories', 'topics', 'plans', 'site_settings'))),
          '{}'::text[], 'the public roles hold no table rights but SELECT on the content tables');
select is((select coalesce(array_agg(distinct table_name || ':' || privilege_type), '{}')
             from information_schema.column_privileges
            where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
              and table_name not in ('grades', 'categories', 'topics', 'plans', 'site_settings')),
          '{events:INSERT}'::text[], 'column rights: only the guest answer stats (INSERT on events)');
select is((select coalesce(array_agg(c.relname::text order by c.relname), '{}') from pg_class c join pg_namespace n on n.oid = c.relnamespace
            cross join (values ('anon'), ('authenticated')) r(rolname)
            where n.nspname = 'public' and c.relkind in ('v', 'm', 'S')
              and (has_table_privilege(r.rolname, c.oid, 'select')
                   or (c.relkind = 'S' and (has_sequence_privilege(r.rolname, c.oid, 'usage') or has_sequence_privilege(r.rolname, c.oid, 'update'))))),
          '{}'::text[], 'no view or sequence the public roles can read or use');

select * from finish();
rollback;
