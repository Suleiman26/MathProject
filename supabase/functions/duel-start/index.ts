// Supabase Edge Function duel-start (spec §7.2): makes the 15 questions of a duel.
//
// The invitee's phone calls it right after accepting: POST {tok, id} with only the
// site's publishable key (deployed with --no-verify-jwt; we check our own token):
//   1. duel_claim_start(tok, id)  → grades + subject + seed, only for the invitee
//      of an 'accepted' duel, once (anything else → 'gone').
//   2. buildDuel(seed, {grade: min of both, subject}) → 15 questions.
//   3. duel_put_questions(DUEL_SECRET, id, rows) → stored (answers kept apart),
//      duel goes live, both players get the 'duel_start' hint.
// Answers never come back in the response; meta never leaves this function.
//
// Database calls go through PostgREST (SUPABASE_URL + the project's anon /
// publishable key, which the runtime provides): both functions are granted to
// anon and guard themselves (session token / Vault secret), so no admin key is needed.
// Secret: DUEL_SECRET (supabase secrets set) = Vault secret 'duel_secret'.
//
// Answers {ok:true} or {error:'<code>'}:
//   method (405) · bad_request (400) · signed_out (403, dead session) · off (403, switch)
//   gone (409, not the invitee / not accepted / already started / too late)
//   secret (500, DUEL_SECRET missing or ≠ Vault) · gen (500, no questions could be made)
//   rows (500, the DB refused the questions) · db (502, database unreachable/odd answer)
import { buildDuel } from "../_shared/duel/build.js";
import { gradeFor, subjectFor, toRows, corsHeaders } from "./core.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS: Record<string, number> = {
  method: 405, bad_request: 400, signed_out: 403, off: 403, gone: 409,
  secret: 500, gen: 500, rows: 500, db: 502,
};

// the project's public key for PostgREST: legacy anon JWT, else the new publishable key
function apiKey(): string {
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (anon) return anon;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const k = keys.default || Object.values(keys)[0];
    if (typeof k === "string" && k) return k;
  } catch { /* not set */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

class Fail extends Error {
  constructor(public code: string) { super(code); }
}

async function rpc(fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: apiKey(), "content-type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Fail("db");
  }
  let body: unknown = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (!res.ok) {
    // duel_uid() raises 'unauthorized' for a dead/unknown session token
    if (/unauthori[sz]ed/i.test(String(b.message ?? ""))) throw new Fail("signed_out");
    console.error(`duel-start: ${fn} → HTTP ${res.status} ${String(b.code ?? "")}`);
    throw new Fail("db");
  }
  if (typeof b.error === "string") throw new Fail(b.error);
  return b;
}

async function handle(req: Request): Promise<Record<string, unknown>> {
  if (req.method !== "POST") throw new Fail("method");

  let input: unknown = null;
  try { input = JSON.parse(await req.text()); } catch { /* bad JSON */ }
  const { tok, id } = (input && typeof input === "object" && !Array.isArray(input) ? input : {}) as Record<string, unknown>;
  if (typeof tok !== "string" || !tok || tok.length > 200 || typeof id !== "string" || !UUID.test(id)) {
    throw new Fail("bad_request");
  }

  // checked before the claim, so a misconfigured function never uses up the duel's one claim
  const secret = Deno.env.get("DUEL_SECRET");
  if (!secret) throw new Fail("secret");

  const claim = await rpc("duel_claim_start", { tok, id });
  const seed = Number(claim.seed);
  if (!Number.isInteger(seed)) throw new Fail("db");
  const grade = gradeFor(claim.grade_a, claim.grade_b);

  let rows;
  try {
    rows = toRows(buildDuel(seed, { grade, subject: subjectFor(claim.subject, grade) }));
  } catch (e) {
    console.error("duel-start: buildDuel failed:", (e as Error)?.message);
    throw new Fail("gen");
  }

  await rpc("duel_put_questions", { secret, id, rows });
  return { ok: true };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
  try {
    return json(200, await handle(req));
  } catch (e) {
    const code = e instanceof Fail ? e.code : "db";
    if (!(e instanceof Fail)) console.error("duel-start:", (e as Error)?.message);
    return json(STATUS[code] ?? 400, { error: code });
  }
});
