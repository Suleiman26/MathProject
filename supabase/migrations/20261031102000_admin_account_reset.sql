-- Admin: reset a student's password (they have no email, so this is how
-- "I forgot my password" gets solved, after the student asks via the contact form).
create or replace function public.admin_account_reset(tok uuid, username text, new_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid; prob text := account_pass_problem(new_password);
begin
  perform admin_guard(tok);
  if prob is not null then return json_build_object('error', 'password', 'problem', prob); end if;
  select id into uid from accounts where username_key = lower(trim(admin_account_reset.username));
  if uid is null then return json_build_object('error', 'missing'); end if;
  update accounts set pass_hash = crypt(new_password, gen_salt('bf', 10)) where id = uid;
  delete from account_sessions where account_id = uid;                 -- sign out everywhere
  delete from account_attempts where username_key = lower(trim(admin_account_reset.username));
  return json_build_object('ok', true);
end $$;
revoke execute on function public.admin_account_reset(uuid, text, text) from public;
grant execute on function public.admin_account_reset(uuid, text, text) to anon, authenticated;
