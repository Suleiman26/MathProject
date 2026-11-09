/* Connection settings for Supabase (Sulaiman's project).
   Fill in from Supabase → Project Settings → API. Both values are public
   (made for websites), not passwords. While empty, the site works as before
   and the admin opens in preview mode with sample numbers.
   See supabase/README.md. */
const LIVE = {
  supabaseUrl: "https://uucqyjskkyrfhvbsmorx.supabase.co",
  supabaseKey: "sb_publishable_iVOeHH932U6US3g7722FjQ_kIDz3puf",
  functionsUrl: "https://uucqyjskkyrfhvbsmorx.supabase.co/functions/v1", // edge functions (duel-start)
  vapidPublic: "BLlO_c65nFOow2_wHKgA63KV1NuvxeqPyX1GweDUPiflz4qgtTi5BOOqeREZr918vVOmrl7-xhXGkj0OfqAgc9g", // public Web Push key (duel notifications); public by design — the private half is a Supabase secret
};

/* Local testing on this computer (supabase start): Supabase's shared
   local-only defaults, never used on the live site. Add ?live=0 to skip. */
const LOCAL = {
  supabaseUrl: "http://127.0.0.1:56421",
  supabaseKey: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
  functionsUrl: "http://127.0.0.1:56421/functions/v1",
  vapidPublic: "BLlO_c65nFOow2_wHKgA63KV1NuvxeqPyX1GweDUPiflz4qgtTi5BOOqeREZr918vVOmrl7-xhXGkj0OfqAgc9g", // same key pair as LIVE (private half: supabase/.env.local)
};

export function getConfig() {
  if (typeof window === "undefined" || !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return LIVE;
  try {
    if (/[?&]live=0/.test(location.search)) sessionStorage.setItem("mp:live0", "1");
    if (/[?&]live=1/.test(location.search)) sessionStorage.removeItem("mp:live0");
    if (sessionStorage.getItem("mp:live0")) return LIVE;
  } catch {}
  return LOCAL;
}
