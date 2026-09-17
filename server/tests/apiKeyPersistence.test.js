/**
 * PERSISTENT USER OPENROUTER API KEYS round — server/services/
 * userApiKeyPersistence.js için odaklı testler.
 *
 * gamesRoute.test.js İLE AYNI konvansiyon: gerçek bir Postgres/Supabase
 * bağlantısı OLMADAN, KENDİ query-inşa mantığını (ownership filtreleri,
 * userId'nin HER ZAMAN parametre olarak geldiği, service-role'ün ASLA
 * kullanılmadığı, plaintext'in HİÇBİR satıra yazılmadığı) doğrulayan
 * minimal bir sahte (in-memory) Supabase query-builder kullanılıyor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");

const userApiKeyPersistence = require("../services/userApiKeyPersistence");
const apiKeyCrypto = require("../services/apiKeyCrypto");

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
// Sahte, in-memory Supabase query-builder -- gamesRoute.test.js'teki
// createFakeSupabaseClient İLE AYNI desen, upsert desteği EKLENDİ.
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
          if (mode === "single") {
            if (rows.length === 1) resolve({ data: rows[0], error: null });
            else resolve({ data: null, error: { message: "no rows", code: "PGRST116" } });
          } else if (mode === "maybeSingle") {
            resolve({ data: rows[0] || null, error: null });
          } else {
            resolve({ data: rows.slice(), error: null });
          }
        } else if (op === "insert") {
          var newRow = Object.assign(
            { id: "fake-id-" + ++fakeIdCounter, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            writeValue
          );
          db[table].push(newRow);
          resolve({ data: newRow, error: null });
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
      insert: function (row) { op = "insert"; writeValue = row; return builder; },
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

// ---------------------------------------------------------------------
// bytea <-> Buffer helper round-trip (saf, network yok)
// ---------------------------------------------------------------------
test("bufferToPgBytea/pgByteaToBuffer: round-trip orijinal Buffer'ı geri verir", function () {
  var original = crypto.randomBytes(24);
  var encoded = userApiKeyPersistence._internal.bufferToPgBytea(original);
  assert.equal(typeof encoded, "string");
  assert.ok(encoded.indexOf("\\x") === 0);
  var decoded = userApiKeyPersistence._internal.pgByteaToBuffer(encoded);
  assert.equal(decoded.toString("hex"), original.toString("hex"));
});

// ---------------------------------------------------------------------
// saveUserApiKey / getUserApiKeyStatus / getUserApiKey / deleteUserApiKey
// ---------------------------------------------------------------------
test("saveUserApiKey: plaintext'i ASLA satıra yazmaz -- SADECE ciphertext/nonce/auth_tag/key_version kaydedilir", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    var plaintext = "sk-or-v1-should-never-be-stored-in-plain";
    await userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", plaintext);

    assert.equal(db.api_keys.length, 1);
    var row = db.api_keys[0];
    assert.equal(row.user_id, "userA");
    assert.equal(row.provider, "openrouter");
    assert.ok(row.ciphertext);
    assert.ok(row.nonce);
    assert.ok(row.auth_tag);
    assert.equal(row.key_version, 1);
    assert.equal(row.encrypted_key, undefined, "eski placeholder alan yazılmamalı");
    // Plaintext, satırın HİÇBİR alanında (JSON olarak serileştirilse bile) YER ALMAMALI.
    assert.equal(JSON.stringify(row).indexOf(plaintext), -1);

    // Round-trip: gerçekten decrypt edilebiliyor mu?
    var record = userApiKeyPersistence._internal.rowToDecryptRecord(row);
    assert.equal(apiKeyCrypto.decryptApiKey(record), plaintext);
  } finally {
    restoreKey();
  }
});

test("saveUserApiKey: aynı (user_id, provider) için ikinci bir save GÜNCELLER (upsert), yeni bir satır EKLEMEZ", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "sk-or-v1-first");
    await userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "sk-or-v1-second");
    assert.equal(db.api_keys.length, 1, "aynı user/provider için TEK satır olmalı (unique constraint semantiği)");
    var record = userApiKeyPersistence._internal.rowToDecryptRecord(db.api_keys[0]);
    assert.equal(apiKeyCrypto.decryptApiKey(record), "sk-or-v1-second");
  } finally {
    restoreKey();
  }
});

test("saveUserApiKey: master key eksikse PersistenceError fırlatır (plaintext'e DÜŞMEZ, satır YAZILMAZ)", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", undefined);
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await assert.rejects(
      userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "sk-or-v1-x"),
      userApiKeyPersistence.PersistenceError
    );
    assert.equal(db.api_keys.length, 0, "encryption başarısızsa HİÇBİR satır yazılmamalı");
  } finally {
    restoreKey();
  }
});

test("saveUserApiKey: boş/whitespace-only plaintext reddedilir", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await assert.rejects(userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", ""), userApiKeyPersistence.PersistenceError);
    await assert.rejects(userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "   "), userApiKeyPersistence.PersistenceError);
  } finally {
    restoreKey();
  }
});

test("saveUserApiKey: desteklenmeyen provider reddedilir", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await assert.rejects(userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "unsupported-provider", "sk-x"), userApiKeyPersistence.PersistenceError);
  } finally {
    restoreKey();
  }
});

test("getUserApiKeyStatus: satır varsa hasKey:true + updatedAt, ciphertext/nonce/authTag SELECT EDİLMEZ (response şekli zaten secret içermiyor)", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "sk-or-v1-x");
    var status = await userApiKeyPersistence.getUserApiKeyStatus("token-for-userA", "userA", "openrouter");
    assert.deepEqual(Object.keys(status).sort(), ["hasKey", "provider", "updatedAt"]);
    assert.equal(status.hasKey, true);
    assert.equal(status.provider, "openrouter");
    assert.ok(status.updatedAt);
  } finally {
    restoreKey();
  }
});

test("getUserApiKeyStatus: satır yoksa hasKey:false/updatedAt:null döner (çökmez)", async function () {
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  var status = await userApiKeyPersistence.getUserApiKeyStatus("token-for-userA", "userA", "openrouter");
  assert.equal(status.hasKey, false);
  assert.equal(status.updatedAt, null);
});

test("getUserApiKeyStatus: userB, userA'nın key'inin varlığını GÖREMEZ (user isolation)", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "sk-or-v1-userA-key");
    var statusB = await userApiKeyPersistence.getUserApiKeyStatus("token-for-userB", "userB", "openrouter");
    assert.equal(statusB.hasKey, false);
  } finally {
    restoreKey();
  }
});

test("getUserApiKey (server-içi): kayıtlı key'i DOĞRU şekilde decrypt edip döner", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "sk-or-v1-secret-value");
    var plaintext = await userApiKeyPersistence.getUserApiKey("token-for-userA", "userA", "openrouter");
    assert.equal(plaintext, "sk-or-v1-secret-value");
  } finally {
    restoreKey();
  }
});

test("getUserApiKey: userB, userA'nın key'ini OKUYAMAZ (user isolation) -- null döner, throw etmez", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "sk-or-v1-userA-only");
    var result = await userApiKeyPersistence.getUserApiKey("token-for-userB", "userB", "openrouter");
    assert.equal(result, null);
  } finally {
    restoreKey();
  }
});

test("getUserApiKey: master key SONRADAN değişirse (rotasyon/kayıp) decrypt başarısız olur ama throw ETMEZ -- null döner", async function () {
  var restoreKeyA = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "sk-or-v1-x");
  } finally {
    restoreKeyA();
  }
  var restoreKeyB = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  try {
    var result = await userApiKeyPersistence.getUserApiKey("token-for-userA", "userA", "openrouter");
    assert.equal(result, null, "decrypt başarısız olursa güvenli şekilde null dönmeli, throw ETMEMELİ");
  } finally {
    restoreKeyB();
  }
});

test("deleteUserApiKey: kendi key'ini siler, tekrar status sorgusunda hasKey:false döner", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "sk-or-v1-x");
    var deleted = await userApiKeyPersistence.deleteUserApiKey("token-for-userA", "userA", "openrouter");
    assert.equal(deleted, true);
    assert.equal(db.api_keys.length, 0);
    var status = await userApiKeyPersistence.getUserApiKeyStatus("token-for-userA", "userA", "openrouter");
    assert.equal(status.hasKey, false);
  } finally {
    restoreKey();
  }
});

test("deleteUserApiKey: userB, userA'nın key'ini SİLEMEZ (user isolation)", async function () {
  var restoreKey = withEnvVar("API_KEY_ENCRYPTION_KEY", validMasterKey());
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  try {
    await userApiKeyPersistence.saveUserApiKey("token-for-userA", "userA", "openrouter", "sk-or-v1-x");
    var deleted = await userApiKeyPersistence.deleteUserApiKey("token-for-userB", "userB", "openrouter");
    assert.equal(deleted, false);
    assert.equal(db.api_keys.length, 1, "userA'nın satırı DOKUNULMAMIŞ kalmalı");
  } finally {
    restoreKey();
  }
});

test("deleteUserApiKey: hiç satır yokken çağrılırsa hasKey:false semantiğinde false döner (idempotent, çökmez)", async function () {
  var db = freshDb();
  var cf = makeClientFactory(db);
  userApiKeyPersistence._internal.setClientFactoryForTests(cf.factory);
  var deleted = await userApiKeyPersistence.deleteUserApiKey("token-for-userA", "userA", "openrouter");
  assert.equal(deleted, false);
});

test("Supabase yapılandırılmamışsa/token yoksa PersistenceUnavailableError fırlatır (çökme yok)", async function () {
  await assert.rejects(
    userApiKeyPersistence.saveUserApiKey("", "userA", "openrouter", "sk-or-v1-x"),
    userApiKeyPersistence.PersistenceUnavailableError
  );
});

// ---------------------------------------------------------------------
// Statik kod incelemesi -- gamesRoute.test.js İLE AYNI desen.
// ---------------------------------------------------------------------
test("kod incelemesi: userApiKeyPersistence.js hiçbir yerde req.body.userId/req.body.user_id OKUMUYOR (yorumlar hariç)", function () {
  var src = fs.readFileSync(require.resolve("../services/userApiKeyPersistence.js"), "utf8");
  var codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.equal(/req\.body\.user_?[Ii]d/.test(codeOnly), false);
  assert.equal(/req\.query\.user_?[Ii]d/.test(codeOnly), false);
});

test("kod incelemesi: userApiKeyPersistence.js SERVICE_ROLE'e referans içermiyor -- SADECE anon key ile İSTEK-BAZLI client kurmalı", function () {
  var src = fs.readFileSync(require.resolve("../services/userApiKeyPersistence.js"), "utf8");
  var codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.equal(/SERVICE_ROLE/i.test(codeOnly), false);
  assert.match(codeOnly, /supabaseConfig\.anonKey/);
});

test("kod incelemesi: userApiKeyPersistence.js hiçbir console çağrısında access token/plaintext/ciphertext İÇERMİYOR", function () {
  var src = fs.readFileSync(require.resolve("../services/userApiKeyPersistence.js"), "utf8");
  var logCalls = src.match(/console\.(log|error|warn|info)\([^)]*\)/g) || [];
  logCalls.forEach(function (call) {
    assert.equal(/accessToken|access_token|plaintext|ciphertext/i.test(call), false, "Bir console çağrısı hassas bir değişken adı içeriyor olabilir: " + call);
  });
});

test("kod incelemesi: routes/apiKeys.js getUserApiKey (plaintext döndüren server-içi fonksiyon) İMPORT/ÇAĞIRMIYOR", function () {
  var src = fs.readFileSync(require.resolve("../routes/apiKeys.js"), "utf8");
  var codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.equal(/getUserApiKey\s*\(/.test(codeOnly), false, "routes/apiKeys.js plaintext döndüren getUserApiKey()'i ÇAĞIRMAMALI -- SADECE status/save/delete kullanmalı");
});
