import { test } from "node:test";
import assert from "node:assert/strict";
import { corsHeaders, parseRequest, safePath } from "./core.mjs";

const tok = "123e4567-e89b-42d3-a456-426614174000";

test("CORS: mathix, its previews and local dev only", () => {
  assert.equal(corsHeaders("https://mathix-sooty.vercel.app")["access-control-allow-origin"], "https://mathix-sooty.vercel.app");
  assert.equal(corsHeaders("https://mathix-abc123-abed-shalgams-projects.vercel.app")["access-control-allow-origin"], "https://mathix-abc123-abed-shalgams-projects.vercel.app");
  assert.equal(corsHeaders("http://localhost:5180")["access-control-allow-origin"], "http://localhost:5180");
  for (const o of ["https://evil.com", "https://mathproject-gamma.vercel.app", "https://mathix-sooty.vercel.app.evil.com", null, undefined])
    assert.equal(corsHeaders(o)["access-control-allow-origin"], undefined, String(o));
});

test("upload requests are checked", () => {
  const ok = { tok, action: "upload", item_id: 5, name: "a.png", mime: "image/png", size: 1000, author: "עבד" };
  assert.deepEqual(parseRequest(ok), { ...ok, comment_id: null });
  assert.equal(parseRequest({ ...ok, comment_id: 9 }).comment_id, 9);
  assert.equal(parseRequest({ ...ok, mime: "text/html" }), null);
  assert.equal(parseRequest({ ...ok, mime: "image/svg+xml" }), null);
  assert.equal(parseRequest({ ...ok, size: 0 }), null);
  assert.equal(parseRequest({ ...ok, size: 1.5 }), null);
  assert.equal(parseRequest({ ...ok, item_id: "5" }), null);
  assert.equal(parseRequest({ ...ok, item_id: -1 }), null);
  assert.equal(parseRequest({ ...ok, tok: "nope" }), null);
  assert.equal(parseRequest({ ...ok, name: "x".repeat(500) }).name.length, 200);
});

test("other actions", () => {
  assert.deepEqual(parseRequest({ tok, action: "urls", ids: [1, 2] }), { action: "urls", tok, ids: [1, 2] });
  assert.equal(parseRequest({ tok, action: "urls", ids: [] }), null);
  assert.equal(parseRequest({ tok, action: "urls", ids: [1, "2"] }), null);
  assert.equal(parseRequest({ tok, action: "urls", ids: Array(201).fill(1) }), null);
  assert.deepEqual(parseRequest({ tok, action: "delete", id: 3 }), { action: "delete", tok, id: 3 });
  assert.deepEqual(parseRequest({ tok, action: "delete_item", item_id: 3 }), { action: "delete_item", tok, item_id: 3 });
  assert.equal(parseRequest({ tok, action: "list" }), null);
  assert.equal(parseRequest(null), null);
});

test("only board-made paths are ever signed or removed", () => {
  assert.ok(safePath("12/123e4567-e89b-42d3-a456-426614174000.png"));
  assert.ok(safePath("1/123e4567-e89b-42d3-a456-426614174000.pdf"));
  for (const p of ["", "../x.png", "12/../../secret.png", "12/x.png", "12/123e4567-e89b-42d3-a456-426614174000.svg", "/12/123e4567-e89b-42d3-a456-426614174000.png", null])
    assert.equal(safePath(p), false, String(p));
});
