/* The site version written at the end of every content-review request ("גרסה 730c785").
   mathix is deployed from `git archive HEAD` (CLAUDE.md), and .gitattributes marks this file
   export-subst, so git writes the commit's short hash into RAW below in the deployed copy.
   A Vercel git build has VERCEL_GIT_COMMIT_SHA instead; the local dev server says "dev". */
const RAW = "$Format:%h$";
export function siteVersion() {
  if (/^[0-9a-f]{6,40}$/.test(RAW)) return RAW.slice(0, 7);
  const sha = typeof process !== "undefined" && process.env ? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA : "";
  return sha ? String(sha).slice(0, 7) : "dev";
}
