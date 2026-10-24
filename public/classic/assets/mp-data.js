/* ==========================================================================
   MathProject data helper (mp-data.js)
   Tiny client for the Supabase REST API — no library needed.
   Used by: the home page (content order), mp.js (answer stats), the admin.
   ========================================================================== */
(function () {
  "use strict";
  var cfg = window.MP_CONFIG || {};
  var base = (cfg.supabaseUrl || "").replace(/\/+$/, "");
  var key = cfg.supabaseKey || "";
  var ready = !!(base && key);

  function headers(extra) {
    var h = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
    for (var k in extra || {}) h[k] = extra[k];
    return h;
  }

  function fail(res) {
    return res.text().then(function (t) {
      var msg = t;
      try { msg = JSON.parse(t).message || t; } catch (e) {}
      var err = new Error(msg || ("HTTP " + res.status));
      err.status = res.status;
      throw err;
    });
  }

  /* call a database function: MPData.rpc("admin_stats", {tok, days}) */
  function rpc(fn, args, opts) {
    if (!ready) return Promise.reject(new Error("not-connected"));
    return fetch(base + "/rest/v1/rpc/" + fn, {
      method: "POST", headers: headers(), body: JSON.stringify(args || {}),
      signal: opts && opts.signal
    }).then(function (res) { return res.ok ? res.json() : fail(res); });
  }

  /* read a table: MPData.select("topics", "select=*&order=position") */
  function select(table, query) {
    if (!ready) return Promise.reject(new Error("not-connected"));
    return fetch(base + "/rest/v1/" + table + "?" + (query || "select=*"), { headers: headers() })
      .then(function (res) { return res.ok ? res.json() : fail(res); });
  }

  /* add rows; keepalive lets it finish while the page closes */
  function insert(table, rows, opts) {
    if (!ready) return Promise.resolve(false);
    return fetch(base + "/rest/v1/" + table, {
      method: "POST", keepalive: !!(opts && opts.keepalive),
      headers: headers({ Prefer: "return=minimal" }), body: JSON.stringify(rows)
    }).then(function (res) { return res.ok; }).catch(function () { return false; });
  }

  window.MPData = { ready: ready, url: base, rpc: rpc, select: select, insert: insert };
})();
