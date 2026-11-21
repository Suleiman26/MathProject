/* בקרת תוכן: the panel's data adapter (design/admin-review/design.md §5, §8).
   The screen (src/admin/pages/Review.jsx) talks only to this file.

   Fixes board items, comments and files go through the board's own database functions (admin_fixes,
   admin_fix_add, admin_fix_comment) and the attach kit (FixAttach.jsx), unchanged.
   "✓ checked" goes through api.js contentChecks (admin_content_checks / _check / _uncheck,
   supabase/migrations/20261121100000_content_checks.sql; preview mode has its own demo). Until that
   migration is applied to a database, the ✓ marks are kept in this browser only and `checksShared`
   says so, so the screen can tell the truth ("נשמר רק במכשיר הזה"). Any other error is shown, never hidden.

   `run` = useAdmin().run (adds the PIN session; an expired one signs out). */
import { contentChecks } from "../api";
export { takeSnapshot, buildRequest, readPlace, deviceLine, questionLink, QUESTION_PLACE } from "./snapshot";
export { siteVersion } from "./version";

const LOCAL = "mp:cpl-checks";
const readLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL)) || []; } catch { return []; } };
const writeLocal = (v) => { try { localStorage.setItem(LOCAL, JSON.stringify(v)); } catch {} };
/* the function does not exist (yet): preview's demo object has no entry, or PostgREST can't find it */
const missingFn = (e) => /is not a function|Could not find the function|PGRST202|schema cache|404/i.test(String((e && e.message) || e));

export let checksShared = true;

/** all fix items with comments[] and files[] (newest change first) */
export async function listFixes(run) {
  const r = await run("admin_fixes", {});
  return Array.isArray(r) ? r : [];
}

/** a new request → { id } (status "new", as the morning job reads it) */
export async function addFix(run, { topic, section, body, author }) {
  const r = await run("admin_fix_add", { topic, section: section || "", body, author });
  if (r && r.error) throw new Error(r.error);
  return { id: r && r.id };
}

/** a comment and/or a status change → { id } of the new comment (for its attachments) */
export async function commentFix(run, { itemId, author, body, status, hasFiles }) {
  const r = await run("admin_fix_comment", { item_id: itemId, author, body: body || "", new_status: status || null, has_files: !!hasFiles });
  if (r && r.error) throw new Error(r.error);
  return { id: (r && r.id) || null };
}

/** the latest ✓ per chapter: [{ topic, section, author, created_at }] */
export async function listChecks(run) {
  try {
    const r = await contentChecks.list(run);
    checksShared = true;
    return Array.isArray(r) ? r : [];
  } catch (e) {
    if (!missingFn(e)) throw e;
    checksShared = false;
    return readLocal();
  }
}

/** ✓ one chapter (topic = slug, section = the exact chapter-button text) → the new row */
export async function markChecked(run, { topic, section, author }) {
  if (checksShared) {
    try {
      const r = await contentChecks.check(run, { topic, section, author });
      if (r && r.error) throw new Error(r.error);
      return r;
    } catch (e) { if (!missingFn(e)) throw e; checksShared = false; }
  }
  const row = { topic, section, author, created_at: new Date().toISOString() };
  writeLocal([...readLocal().filter((c) => !(c.topic === topic && c.section === section)), row]);
  return row;
}

/** un-✓ one chapter */
export async function unmarkChecked(run, { topic, section }) {
  if (checksShared) {
    try { return await contentChecks.uncheck(run, { topic, section }); }
    catch (e) { if (!missingFn(e)) throw e; checksShared = false; }
  }
  writeLocal(readLocal().filter((c) => !(c.topic === topic && c.section === section)));
  return { ok: true };
}
