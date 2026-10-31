-- account_name_free: "username" was ambiguous (variable vs column). Use a local.
create or replace function public.account_name_free(username text)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  u text := trim(account_name_free.username);
  prob text := account_name_problem(u);
begin
  if prob is not null then return json_build_object('free', false, 'problem', prob); end if;
  return json_build_object('free', not exists (select 1 from accounts a where a.username_key = lower(u)));
end $$;
