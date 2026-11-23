// node --test src/lib/mp-key.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { keyText } from "./mp-key.js";

test("data-mp-key wins over the visible text", () => {
  assert.equal(keyText({ dataset: { mpKey: "1. קוראים את הנתון" }, textContent: "רמה 1 · קוראים את הנתון" }), "1. קוראים את הנתון");
});

test("no or empty data-mp-key: the visible text, exactly as before", () => {
  assert.equal(keyText({ dataset: {}, textContent: "4. חפיפה" }), "4. חפיפה");
  assert.equal(keyText({ dataset: { mpKey: "" }, textContent: "רמה 2" }), "רמה 2");
  assert.equal(keyText({ textContent: "  2. זוויות  " }), "  2. זוויות  ");
});

test("missing element or text gives an empty string", () => {
  assert.equal(keyText(null), "");
  assert.equal(keyText({ dataset: {} }), "");
});
