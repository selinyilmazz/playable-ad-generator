/**
 * PERSISTENT USER OPENROUTER API KEYS round — server/routes/apiKeys.js
 * için HTTP katmanı testleri. gamesRoute.test.js İLE AYNI desen: fake
 * attachUser middleware + fake in-memory Supabase client (test seam).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const crypto = require("node:crypto");
const express = require("express");

const userApiKeyPersistence = require("../services/userApiKeyPersistence");
const apiKeysRouter = require("../routes/apiKeys");

function withEnvVar(name, value) {
  var previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  return function restore() {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  };
}

function validMasterKey() {
  return crypto.randomBytes(32).toString("base64");
}

// ---------------------------------------------------------------------
// Sahte in-memory Supabase client -- apiKeyPersistence.test.js İLE AYNI
// (upsert destekli) query-builder.
// ---------------------------------------------------------------------
var fakeIdCounter = 0;

function createFakeSupabaseClient(db) {
  function makeQuery(table) {
    var op = null;
    var filters = [];
    var writeValue = null;
    var upsertConflictCols = null;

    function applyFilters(rows) {
      return rows.filter(function (row) {
        return filters.every(function (f) { return row[f[0]] === f[1]; });
      });
    }

    function execute(mode) {
      return new Promise(function (resolve) {
        if (op === "select") {
          var rows = applyFilters(db[table]);
          if (mode === "maybeSingle") resolve({ data: rows[0] || null, error: null });
          else resolve({ data: rows.slice(), error: null });
        } else if (op === "upsert") {
          var conflictCols = (upsertConflictCols || "").split(",").filter(Boolean);
          var existing = db[table].filter(function (row) {
            return conflictCols.every(function (c) { return row[c] === writeValue[c]; });
          })[0];
          if (existing) {
            Object.assign(existing, writeValue, { updated_at: new Date().toISOString() });
            resolve({ data: existing, error: null });
          } else {
            var inserted = Object.assign(
              { id: "fake-id-" + ++fakeIdCounter, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              writeValue
            );
            db[table].push(inserted);
            resolve({ data: inserted, error: null });
          }
        } else if (op === "delete") {
          var toDelete = applyFilters(db[table]);
          db[table] = db[table].filter(function (row) { return toDelete.indexOf(row) === -1; });
          resolve({ data: toDelete, error: null });
        }
      });
    }

    var builder = {
      select: function () { if (!op) op = "select"; return builder; },
      upsert: function (row, opts) { op = "upsert"; writeValue = row; upsertConflictCols = opts && opts.onConflict; return builder; },
      delete: function () { op = "delete"; return builder; },
      eq: function (col, val) { filters.push([col, val]); return builder; },
      single: function () { return execute("single"); },
      maybeSingle: function () { return execute("maybeSingle"); },
      then: function (resolve, reject) { return execute(null).then(resolve, reject); },
    };
    return builder;
  }
  return { from: function (table) { return makeQuery(table); } };
}

function makeClientFactory(db) {
  var calls = [];
  return {
    calls: calls,
    factory: function (accessToken) {
      calls.push(accessToken);
      if (!accessToken) return null;
      return createFakeSupabaseClient(db);
    },
  };
}

function freshDb() {
  return { api_keys: [] };
}

test.beforeEach(function () {
  userApiKeyPersistence._internal.resetClientFactoryForTests();
});
test.after(function () {
  userApiKeyPersistence._internal.resetClientFactoryForTests();
});

function startTestServer(db, opts) {
  opts = opts || {};
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);

  var app = express();
  app.use(express.json());
  // attachUser'ın GERÇEK doğrulama mantığı burada TEKRAR test edilmiyor --
  // SADECE sonucunu (req.user/req.userId/req.accessToken) simüle eden
  // minimal bir sahte middleware (gamesRoute.test.js İLE AYNI desen).
  app.use(function (req, res, next) {
    req.user = opts.userId ? { id: opts.userId, email: opts.userId + "@example.com" } : null;
    req.userId = opts.userId || null;
    req.accessToken = opts.userId ? "token-for-" + opts.userId : null;
    next();
  });
  app.use("/api", apiKeysRouter);

  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({ server: server, port: server.address().port, clientFactoryCalls: cf.calls });
    });
  });
}

function jsonRequest(port, method, path, body) {
  return new Promise(function (resolve, reject) {
    var data = body !== undefined ? JSON.stringify(body) : null;
    var req = http.request(
      { hostname: "localhost", port: port, path: path, method: method, headers: data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {} },
      function (res) {
        var chunks = "";
        res.on("data", function (c) { chunks += c; });
        res.on("end", function () {
          var parsed = null;
          try { parsed = chunks ? JSON.parse(chunks) : null; } catch (err) { parsed = null; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

var FAKE_KEY = "sk-or-fake-route-test-key-never-sent-over-network";

function stubValidKeyNetwork() {
  var original = global.fetch;
  global.fetch = async function (url) {
    if (/auth\/key$/.test(url)) {
      return { ok: true, json: async function () { return { data: {} }; } };
    }
    throw new Error("stubValidKeyNetwork: beklenmeyen URL: " + url);
  };
  return function restore() {
    global.fetch = original;
  };
}

test("route: anonim istek (req.userId yok) /api/keys endpoint'lerinin TÜMÜNDE 401 döner, hiçbir persistence çağrısı yapılmaz", async function () {
  var db = freshDb();
  var ctx = await startTestServer(db, {});
  try {
    var postRes = await jsonRequest(ctx.port, "POST", "/api/keys/openrouter", { apiKey: FAKE_KEY });
    assert.equal(postRes.status, 401);
    var statusRes = await jsonRequest(ctx.port, "GET", "/api/keys/openrouter/status");
    assert.equal(statusRes.status, 401);
    var delRes = await jsonRequest(ctx.port, "DELETE", "/api/keys/openrouter");
    assert.equal(delRes.status, 401);
    assert.deepEqual(ctx.clientFactoryCalls, []);
  } finally {
    ctx.server.close();
  }
});

test("route: desteklenmeyen provider 400 döner (openrouter dışında hiçbir şey desteklenmiyor)", async function () {
  var db = freshDb();
  var ctx = await startTestServer(db, { userId: "userA" });
  try {
    var res = await jsonRequest(ctx.port, "GET", "/api/keys/some-other-provider/status");
    assert.equal(res.status, 400);
  } finally {
    ctx.server.close();
  }
});

test("route: kimliği doğrulanmış kullanıcı save/status/delete akışını tam olarak çalıştırabilir", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var restoreFetch = stubValidKeyNetwork();
  var db = freshDb();
  var ctx = await startTestServer(db, { userId: "userA" });
  try {
    var saveRes = await jsonRequest(ctx.port, "POST", "/api/keys/openrouter", { apiKey: FAKE_KEY });
    assert.equal(saveRes.status, 200);
    assert.deepEqual(saveRes.body, { provider: "openrouter", hasKey: true, updatedAt: saveRes.body.updatedAt });
    assert.ok(saveRes.body.updatedAt);

    var statusRes = await jsonRequest(ctx.port, "GET", "/api/keys/openrouter/status");
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.hasKey, true);

    var deleteRes = await jsonRequest(ctx.port, "DELETE", "/api/keys/openrouter");
    assert.equal(deleteRes.status, 200);
    assert.deepEqual(deleteRes.body, { provider: "openrouter", hasKey: false });

    var statusAfterDelete = await jsonRequest(ctx.port, "GET", "/api/keys/openrouter/status");
    assert.equal(statusAfterDelete.body.hasKey, false);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreKey();
  }
});

test("route: POST boş/whitespace-only apiKey ile 400 döner, hiçbir satır yazılmaz", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var ctx = await startTestServer(db, { userId: "userA" });
  try {
    var res = await jsonRequest(ctx.port, "POST", "/api/keys/openrouter", { apiKey: "   " });
    assert.equal(res.status, 400);
    assert.equal(db.api_keys.length, 0);
  } finally {
    ctx.server.close();
    restoreKey();
  }
});

test("route: req.body içindeki bir userId/user_id alanı HİÇBİR ZAMAN kimlik olarak kullanılmaz -- kayıt SADECE req.userId'ye ait olur", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var restoreFetch = stubValidKeyNetwork();
  var db = freshDb();
  var ctx = await startTestServer(db, { userId: "realUser" });
  try {
    var res = await jsonRequest(ctx.port, "POST", "/api/keys/openrouter", { apiKey: FAKE_KEY, userId: "attacker", user_id: "attacker2" });
    assert.equal(res.status, 200);
    assert.equal(db.api_keys[0].user_id, "realUser");
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreKey();
  }
});

test("route: userB, userA'nın key durumunu GÖREMEZ/SİLEMEZ (cross-user isolation, HTTP katmanı)", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var restoreFetch = stubValidKeyNetwork();
  var db = freshDb();
  var ctxA = await startTestServer(db, { userId: "userA" });
  await jsonRequest(ctxA.port, "POST", "/api/keys/openrouter", { apiKey: FAKE_KEY });
  ctxA.server.close();

  var ctxB = await startTestServer(db, { userId: "userB" });
  try {
    var statusRes = await jsonRequest(ctxB.port, "GET", "/api/keys/openrouter/status");
    assert.equal(statusRes.body.hasKey, false, "userB, userA'nın key'ini GÖRMEMELİ");

    var deleteRes = await jsonRequest(ctxB.port, "DELETE", "/api/keys/openrouter");
    assert.deepEqual(deleteRes.body, { provider: "openrouter", hasKey: false });
    assert.equal(db.api_keys.length, 1, "userA'nın satırı DOKUNULMAMIŞ kalmalı");
  } finally {
    ctxB.server.close();
    restoreFetch();
    restoreKey();
  }
});

test("route: geçersiz bir OpenRouter key (validate-key servisi reddeder) 400 ile reddedilir, satır YAZILMAZ", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var original = global.fetch;
  global.fetch = async function () {
    return { ok: false, status: 401 };
  };
  var db = freshDb();
  var ctx = await startTestServer(db, { userId: "userA" });
  try {
    var res = await jsonRequest(ctx.port, "POST", "/api/keys/openrouter", { apiKey: "sk-or-clearly-invalid-key" });
    assert.equal(res.status, 400);
    assert.equal(db.api_keys.length, 0);
  } finally {
    ctx.server.close();
    global.fetch = original;
    restoreKey();
  }
});

test("hiçbir response (save/status/delete, başarılı ya da başarısız) apiKey/plaintext/ciphertext/nonce/authTag/master key İÇERMEZ", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var restoreFetch = stubValidKeyNetwork();
  var db = freshDb();
  var ctx = await startTestServer(db, { userId: "userA" });
  try {
    var saveRes = await jsonRequest(ctx.port, "POST", "/api/keys/openrouter", { apiKey: FAKE_KEY });
    var statusRes = await jsonRequest(ctx.port, "GET", "/api/keys/openrouter/status");
    var deleteRes = await jsonRequest(ctx.port, "DELETE", "/api/keys/openrouter");

    [saveRes, statusRes, deleteRes].forEach(function (res) {
      var serialized = JSON.stringify(res.body);
      assert.equal(serialized.indexOf(FAKE_KEY), -1);
      assert.equal(/ciphertext|nonce|authTag|auth_tag|encrypted_key/i.test(serialized), false, "response secret-ilişkili bir alan adı içeriyor: " + serialized);
    });
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreKey();
  }
});

// ---------------------------------------------------------------------
// Statik kod incelemesi
// ---------------------------------------------------------------------
test("kod incelemesi: routes/apiKeys.js hiçbir yerde req.body.userId/req.body.user_id OKUMUYOR", function () {
  var src = fs.readFileSync(require.resolve("../routes/apiKeys.js"), "utf8");
  var codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.equal(/req\.body\.user_?[Ii]d/.test(codeOnly), false);
  assert.equal(/req\.query\.user_?[Ii]d/.test(codeOnly), false);
});

test("kod incelemesi: routes/apiKeys.js hiçbir console çağrısında access token içermiyor", function () {
  var src = fs.readFileSync(require.resolve("../routes/apiKeys.js"), "utf8");
  var logCalls = src.match(/console\.(log|error|warn|info)\([^)]*\)/g) || [];
  logCalls.forEach(function (call) {
    assert.equal(/accessToken|access_token/i.test(call), false, "Bir console çağrısı access token içeriyor olabilir: " + call);
  });
});
