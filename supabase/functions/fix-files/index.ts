// Supabase Edge Function fix-files: attachments on the admin fixes board.
//
// The admin page calls it with the site's publishable key (deployed with --no-verify-jwt,
// see supabase/config.toml) and the admin PIN session token. Every action first asks a
// PIN-guarded database function (granted to anon, checks the token itself) what it may do,
// and only then touches the private "fix-files" bucket with the service role. The browser
// never gets a key that can read or write storage on its own: only one-time upload URLs and
// 1-hour read URLs for paths the database handed out.
//
//   upload      {tok, action, item_id, comment_id?, name, mime, size, author}
//               → admin_fix_file_begin → {id, path, upload_url}   (then PUT the file, then admin_fix_file_ready)
//   urls        {tok, action, ids[]}  → admin_fix_file_paths → {urls: {id: "/storage/v1/…signed"}}
//   (both links are paths; the page puts its project URL in front)
//   delete      {tok, action, id}     → admin_fix_file_delete → removes the object → {ok}
//   delete_item {tok, action, item_id} → admin_fix_item_paths → removes the objects → {ok}
//               (the page then calls admin_fix_delete, which removes the rows)
//
// Errors: {error: code} — method 405 · bad_request 400 · signed_out 403 · type/size/missing/too_many 400 · storage/db 502
import { corsHeaders, parseRequest, safePath } from "./core.mjs";

const BUCKET = "fix-files";
const MAX_BODY = 8192;
const READ_SECONDS = 3600;

const base = () => (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");

// the public key for PostgREST (the guarded functions are granted to anon)
function publicKey(): string {
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (anon) return anon;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const k = keys.default || Object.values(keys)[0];
    if (typeof k === "string") return k;
  } catch { /* not set */ }
  return "";
}
// the service role, for storage only — never sent to the browser
function serviceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const k = keys.default || Object.values(keys)[0];
    if (typeof k === "string") return k;
  } catch { /* not set */ }
  return "";
}

class Fail extends Error { constructor(public code: string, public status = 400) { super(code); } }

async function rpc(fn: string, args: Record<string, unknown>) {
  const key = publicKey();
  if (!base() || !key) throw new Fail("db", 502);
  const res = await fetch(`${base()}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) {
    if (/unauthorized/i.test(text)) throw new Fail("signed_out", 403);
    console.error(`fix-files: ${fn} → ${res.status} ${text.slice(0, 200)}`);
    throw new Fail("db", 502);
  }
  const out = text ? JSON.parse(text) : null;
  if (out && typeof out === "object" && !Array.isArray(out) && out.error) throw new Fail(String(out.error), 400);
  return out;
}

async function storage(method: string, path: string, body?: unknown) {
  const key = serviceKey();
  if (!base() || !key) throw new Fail("storage", 502);
  const res = await fetch(`${base()}/storage/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body === undefined ? {} : body),   // storage refuses an empty JSON body
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`fix-files: storage ${method} ${path.split("/").slice(0, 3).join("/")} → ${res.status} ${text.slice(0, 200)}`);
    throw new Fail("storage", 502);
  }
  return text ? JSON.parse(text) : null;
}

// links go back as paths ("/storage/v1/object/…?token=…"); the page adds its own project URL,
// so they work the same on the hosted project and on a local copy
const rel = (u: string) => {
  const p = u.startsWith("http") ? new URL(u).pathname + new URL(u).search : u;
  return p.startsWith("/storage/v1/") ? p : `/storage/v1${p.startsWith("/") ? "" : "/"}${p}`;
};

async function handle(req: Record<string, unknown>) {
  const r = parseRequest(req);
  if (!r) throw new Fail("bad_request", 400);

  if (r.action === "upload") {
    const row = await rpc("admin_fix_file_begin", {
      tok: r.tok, item_id: r.item_id, comment_id: r.comment_id, name: r.name, mime: r.mime, size: r.size, author: r.author,
    });
    if (!row || !safePath(row.path)) throw new Fail("db", 502);
    const signed = await storage("POST", `object/upload/sign/${BUCKET}/${row.path}`);
    if (!signed || typeof signed.url !== "string") throw new Fail("storage", 502);
    return { id: row.id, path: row.path, upload_url: rel(signed.url) };
  }

  if (r.action === "urls") {
    const rows = (await rpc("admin_fix_file_paths", { tok: r.tok, ids: r.ids })) as { id: number; path: string }[];
    const ok = (rows || []).filter((x) => safePath(x.path));
    if (!ok.length) return { urls: {} };
    const signed = (await storage("POST", `object/sign/${BUCKET}`, { expiresIn: READ_SECONDS, paths: ok.map((x) => x.path) })) as
      { path: string; signedURL?: string; error?: string }[];
    const byPath = new Map((signed || []).filter((s) => s.signedURL).map((s) => [s.path, rel(s.signedURL as string)]));
    const urls: Record<string, string> = {};
    for (const x of ok) if (byPath.has(x.path)) urls[x.id] = byPath.get(x.path) as string;
    return { urls, expires_in: READ_SECONDS };
  }

  if (r.action === "delete") {
    const out = await rpc("admin_fix_file_delete", { tok: r.tok, file_id: r.id });
    if (out && safePath(out.path)) await storage("DELETE", `object/${BUCKET}`, { prefixes: [out.path] });
    return { ok: true };
  }

  // delete_item: remove every stored file of the item; the rows go with admin_fix_delete
  const paths = ((await rpc("admin_fix_item_paths", { tok: r.tok, item_id: r.item_id })) || []).filter(safePath);
  if (paths.length) await storage("DELETE", `object/${BUCKET}`, { prefixes: paths });
  return { ok: true, removed: paths.length };
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ error: "method" }, 405);
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: "bad_request" }, 400);
    let body: Record<string, unknown>;
    try { body = JSON.parse(text); } catch { return json({ error: "bad_request" }, 400); }
    return json(await handle(body));
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.code }, e.status);
    console.error("fix-files: unexpected", e);
    return json({ error: "db" }, 502);
  }
});
