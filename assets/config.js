/* ==========================================================================
   MathProject connection settings
   --------------------------------------------------------------------------
   The site talks to Supabase (Sulaiman's project). Fill in the two values
   below from Supabase → Project Settings → API:
     supabaseUrl  = "Project URL"           (looks like https://xxxx.supabase.co)
     supabaseKey  = "Publishable key"       (starts with sb_publishable_)
   Both are PUBLIC values made for websites — not passwords. The database
   rules (supabase/migrations) decide what the public may do.
   While these are empty, the site works exactly as before and the admin
   opens in "preview" mode with sample numbers.
   ========================================================================== */
window.MP_CONFIG = {
  supabaseUrl: "",
  supabaseKey: ""
};

/* Local testing on this computer (supabase start). These are Supabase's
   shared local-only defaults, never used on the live site. */
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]live=0/.test(location.search)) {
  window.MP_CONFIG = {
    supabaseUrl: "http://127.0.0.1:56421",
    supabaseKey: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
  };
}
