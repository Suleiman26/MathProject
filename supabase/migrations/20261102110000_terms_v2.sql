-- Privacy policy updated 2026-11-02: the site's operators can see each signed-in
-- student's progress by username (admin → students). Everyone agrees again.
-- Must match TERMS_VERSION in src/lib/account.js.
create or replace function public.account_terms_version() returns text language sql immutable as $$ select '2026-11-02'::text $$;
