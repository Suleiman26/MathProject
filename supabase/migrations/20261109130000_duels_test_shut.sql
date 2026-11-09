-- ============================================================================
-- Duels: switching to 'test' closes the open duels of non-testers (2026-11-09).
-- Before: 'off' closed every open duel, but 'on' → 'test' left duels with a
-- non-tester frozen (their guard answers 'off', so they could not finish).
-- Now 'test' closes every open duel where a player is not a tester (or is
-- banned): the same close as 'off' (duel_shut), only for those players.
-- Redefined from its LATEST version: 20261109120000_duels_final.sql. Only the
-- line marked "test shut" is new; grants stay (create or replace keeps them).
-- ============================================================================

create or replace function public.admin_set_setting(tok uuid, k text, v jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare closed int := 0; r record;
begin
  perform admin_guard(tok);
  if k not in ('keypad', 'duels') then return json_build_object('error', 'unknown'); end if;
  if k = 'duels' and (jsonb_typeof(v) is distinct from 'string' or v #>> '{}' not in ('off', 'test', 'on')) then
    return json_build_object('error', 'value');
  end if;
  insert into site_settings (key, value, updated_at) values (k, v, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  -- final wave: switching duels off closes every open duel, so nothing freezes
  if k = 'duels' and v #>> '{}' = 'off' then closed := duel_shut(null); end if;
  -- test shut: switching to test closes the open duels of every player who is
  -- not a tester (or is banned) — they can't play in test mode
  if k = 'duels' and v #>> '{}' = 'test' then
    for r in select distinct p.uid from (
               select x.a as uid from duels x where x.status in ('invited', 'accepted', 'live')
               union
               select x.b from duels x where x.status in ('invited', 'accepted', 'live')
             ) p join accounts ac on ac.id = p.uid
             where not ac.duel_tester or ac.duel_banned
             order by p.uid loop
      closed := closed + duel_shut(r.uid);
    end loop;
  end if;
  return json_build_object('ok', true, 'key', k, 'value', v, 'closed', closed);
end $$;
