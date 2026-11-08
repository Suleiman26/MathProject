/* node --test src/duel/clock.test.mjs
   Review Focus 2: a phone clock that is minutes off must still show the same
   timer as the opponent. Everything is drawn from server time = local + offset. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { clockOffset, serverNow, createClock } from "./clock.js";

const SERVER = Date.parse("2026-11-08T10:00:10.000Z");

test("phone 5 minutes behind → offset ≈ +300000 (within half the round trip)", () => {
  const behind = 300000;
  const rtt = 240;
  // the request left 120 ms (on the server's clock) before the server stamped now()
  const sent = SERVER - 120 - behind;
  const recv = sent + rtt;
  const off = clockOffset("2026-11-08T10:00:10.000Z", sent, recv);
  assert.ok(Math.abs(off - behind) <= rtt / 2, `offset ${off} not within ${rtt / 2} of ${behind}`);
});

test("asymmetric network: error is never more than rtt/2", () => {
  const behind = 300000;
  for (const [up, down] of [[10, 500], [500, 10], [0, 0], [300, 300]]) {
    const sent = SERVER - up - behind;
    const recv = SERVER + down - behind;
    const off = clockOffset("2026-11-08T10:00:10.000Z", sent, recv);
    assert.ok(Math.abs(off - behind) <= (up + down) / 2 + 1, `${up}/${down}: ${off}`);
  }
});

test("phone ahead → negative offset; Postgres microseconds and +00:00 parse", () => {
  const ahead = 125000;
  const sent = SERVER - 50 + ahead, recv = SERVER + 50 + ahead;
  assert.equal(clockOffset("2026-11-08T10:00:10.000000+00:00", sent, recv), -ahead);
  assert.equal(clockOffset("2026-11-08T12:00:10.000+02:00", sent, recv), -ahead);
});

test("bad input → 0 (never NaN, so timers still draw)", () => {
  assert.equal(clockOffset(null, 1, 2), 0);
  assert.equal(clockOffset("not a date", 1, 2), 0);
  assert.equal(clockOffset("2026-11-08T10:00:10.000Z", NaN, 2), 0);
  assert.equal(clockOffset("2026-11-08T10:00:10.000Z", 5, 2), 0); // received before sent
});

test("serverNow = local now + offset", () => {
  const before = Date.now();
  const v = serverNow(300000);
  const after = Date.now();
  assert.ok(v >= before + 300000 && v <= after + 300000);
  assert.ok(Math.abs(serverNow() - Date.now()) < 50);
});

test("two phones with different wrong clocks agree on the remaining time", () => {
  const endsAt = SERVER + 300000;
  const phones = [-180000, 0, 420000]; // phone clock − true time
  const left = phones.map((skew) => {
    const sent = SERVER - 80 + skew, recv = SERVER + 80 + skew;
    const off = clockOffset(new Date(SERVER).toISOString(), sent, recv);
    const localNowAtRecv = recv;
    return endsAt - (localNowAtRecv + off);
  });
  for (const l of left) assert.ok(Math.abs(l - left[0]) <= 160, String(left));
});

test("createClock keeps the sample with the shortest round trip", () => {
  const c = createClock();
  assert.equal(c.offset(), 0);
  // slow sample: rtt 2000, says +301000
  c.sample(new Date(SERVER).toISOString(), SERVER - 300000 - 1000 - 1000, SERVER - 300000 - 1000 + 1000);
  // fast sample: rtt 40, true offset +300000
  c.sample(new Date(SERVER).toISOString(), SERVER - 300000 - 20, SERVER - 300000 + 20);
  assert.equal(c.offset(), 300000);
  // a later slower sample does not replace it
  c.sample(new Date(SERVER + 5000).toISOString(), SERVER - 300000 + 5000 - 1500 + 400, SERVER - 300000 + 5000 + 1500 + 400);
  assert.equal(c.offset(), 300000);
  assert.ok(Math.abs(c.now() - (Date.now() + 300000)) < 50);
  // garbage is ignored
  c.sample("nope", 1, 2);
  assert.equal(c.offset(), 300000);
});
