/**
 * PRODUCTION BYOK SECURITY FIX — dedike test dosyası (görev md.5).
 *
 * Kapsam:
 *  1) openrouterClient.resolveEffectiveApiKey() saf fonksiyon testleri
 *     (network yok) — bu görevin TEK, merkezi güvenlik kuralının kendisi.
 *  2) /api/generate, /api/improve, /api/autofix üzerinden uçtan uca:
 *     - BYOK (req.body.apiKey) HER ZAMAN çalışır (flag'den bağımsız).
 *     - BYOK yok + ALLOW_SERVER_API_KEY yok/false -> gerçek AI çağrısı
 *       YAPILMAZ (mevcut, DEĞİŞMEMİŞ mock-fallback mimarisine düşülür —
 *       generate: meta.mock=true, improve/autofix: applied=false/mock=true).
 *     - BYOK yok + ALLOW_SERVER_API_KEY=true + env key var -> server-side
 *       key KULLANILABİLİR (bilinçli local-dev opt-in).
 *     - API key hiçbir zaman response body'sinde YER ALMAZ.
 *
 * modelCatalogByok.test.js / improveWithAi.test.js İLE AYNI desen: gerçek
 * bir OpenRouter ağ çağrısı YAPILMIYOR, global.fetch URL'e göre dallanan bir
 * stub ile taklit ediliyor; process.env.OPENROUTER_API_KEY / ALLOW_SERVER_API_KEY
 * her testte set/restore ediliyor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const { resolveEffectiveApiKey } = require("../services/openrouterClient");
const generateRouter = require("../routes/generate");
const improveRouter = require("../routes/improve");
const autofixRouter = require("../routes/autofix");
const modelCatalog = require("../services/modelCatalog");

var FAKE_ENV_KEY = "test-fake-env-key-never-sent-over-network";
var FAKE_USER_KEY = "sk-or-test-fake-user-key-never-sent-over-network";

var SAMPLE_HTML =
  "<html><body><h1>Fruit Tapper</h1><script>var score=0;function tap(){score++;}</script></body></html>";

function withEnvVar(name, value) {
  var previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  return function restore() {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  };
}

function startServer() {
  var app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", generateRouter);
  app.use("/api", improveRouter);
  app.use("/api", autofixRouter);
  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

function postJson(port, path, body) {
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify(body);
    var req = http.request(
      {
        hostname: "localhost",
        port: port,
        path: path,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      },
      function (res) {
        var chunks = "";
        res.on("data", function (c) { chunks += c; });
        res.on("end", function () {
          try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); } catch (err) { reject(err); }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function fakeChatCompletionResponse() {
  return {
    ok: true,
    json: async function () {
      return {
        choices: [
          { message: { content: "<html><body><script>console.log('ok')</script></body></html>" }, finish_reason: "stop" },
        ],
      };
    },
  };
}

function stubFetchByUrl(handlers, calls) {
  var original = global.fetch;
  global.fetch = async function (url, opts) {
    calls.push({ url: url, opts: opts || {} });
    for (var i = 0; i < handlers.length; i++) {
      if (handlers[i].match.test(url)) {
        return handlers[i].respond(url, opts);
      }
    }
    throw new Error("stubFetchByUrl: beklenmeyen URL'e çağrı: " + url);
  };
  return function restore() {
    global.fetch = original;
  };
}

function stubChatCompletions(calls) {
  return stubFetchByUrl([{ match: /chat\/completions$/, respond: fakeChatCompletionResponse }], calls);
}

test.beforeEach(function () {
  modelCatalog._resetCacheForTests();
});

// =========================================================================
// 1) resolveEffectiveApiKey() — saf fonksiyon, network yok
// =========================================================================

// PERSISTENT USER OPENROUTER API KEYS round — resolveEffectiveApiKey artık
// ASYNC (üç tier'lı: override -> stored user key -> server env key). Bu
// testler bu round'dan ÖNCE yazılmıştı ve fonksiyonu SENKRON çağırıyordu;
// SADECE async/await eklendi -- her testin kendi assertion'ı/senaryosu
// BİREBİR AYNI kaldı (hiçbir davranış/beklenti değişmedi). authContext
// (2. parametre) HİÇ verilmiyor -- bu, YENİ orta tier'ın hiç devreye
// girmediği, ÖNCEKİ (2-tier) davranışın test edildiği durum.
test("resolveEffectiveApiKey: apiKeyOverride varsa, ALLOW_SERVER_API_KEY/env key durumundan BAĞIMSIZ olarak HER ZAMAN o kullanılır", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  try {
    assert.equal(await resolveEffectiveApiKey(FAKE_USER_KEY), FAKE_USER_KEY);
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey: override yok + ALLOW_SERVER_API_KEY tanımsız (production varsayılanı) -> null, env key GÖRMEZDEN gelinir", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  try {
    assert.equal(await resolveEffectiveApiKey(null), null);
    assert.equal(await resolveEffectiveApiKey(undefined), null);
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey: override yok + ALLOW_SERVER_API_KEY='false' -> null, env key GÖRMEZDEN gelinir", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "false");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  try {
    assert.equal(await resolveEffectiveApiKey(null), null);
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey: override boş string (\"\") -> yok sayılır (falsy), flag true olmadıkça server key kullanılmaz", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  try {
    assert.equal(await resolveEffectiveApiKey(""), null);
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey: override yok + ALLOW_SERVER_API_KEY='true' + env key VAR -> env key döner (bilinçli local-dev opt-in)", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "true");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  try {
    assert.equal(await resolveEffectiveApiKey(null), FAKE_ENV_KEY);
    assert.equal(await resolveEffectiveApiKey(""), FAKE_ENV_KEY);
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey: override yok + ALLOW_SERVER_API_KEY='true' + env key YOK -> falsy (undefined) döner, uydurma bir key İCAT edilmez", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "true");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  try {
    assert.ok(!(await resolveEffectiveApiKey(null)));
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

// =========================================================================
// 1b) resolveEffectiveApiKey() — YENİ orta tier (stored user key), saf
// fonksiyon testleri. Gerçek apiKeyCrypto (AES-256-GCM) + userApiKeyPersistence
// kullanılıyor, SADECE Supabase client'ı (test seam ile) sahte -- bu yüzden
// bu testler hem çözümleme SIRASINI hem GERÇEK encrypt/decrypt round-trip'ini
// aynı anda doğruluyor.
// =========================================================================

test("resolveEffectiveApiKey (stored key tier): authContext + kayıtlı bir key varsa VE override/ALLOW_SERVER_API_KEY yoksa, stored key döner", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var restoreMasterKey = withEnvVar("API_KEY_ENCRYPTION_KEY", require("crypto").randomBytes(32).toString("base64"));
  var userApiKeyPersistence = require("../services/userApiKeyPersistence");
  var apiKeyCrypto = require("../services/apiKeyCrypto");
  var STORED_KEY = "sk-or-stored-key-never-logged";
  var enc = apiKeyCrypto.encryptApiKey(STORED_KEY);
  var db = { api_keys: [{ user_id: "userA", provider: "openrouter", ciphertext: enc.ciphertext, nonce: enc.nonce, auth_tag: enc.authTag, key_version: enc.keyVersion }] };
  userApiKeyPersistence._internal.setClientFactoryForTests(function (accessToken) {
    if (!accessToken) return null;
    return {
      from: function () {
        return {
          select: function () { return this; },
          eq: function () { return this; },
          maybeSingle: function () {
            return Promise.resolve({ data: db.api_keys[0], error: null });
          },
        };
      },
    };
  });
  try {
    var result = await resolveEffectiveApiKey(null, { userId: "userA", accessToken: "token-for-userA" });
    assert.equal(result, STORED_KEY);
  } finally {
    userApiKeyPersistence._internal.resetClientFactoryForTests();
    restoreFlag();
    restoreEnv();
    restoreMasterKey();
  }
});

test("resolveEffectiveApiKey (stored key tier): explicit apiKeyOverride, kayıtlı bir key olsa BİLE HER ZAMAN kazanır", async function () {
  var userApiKeyPersistence = require("../services/userApiKeyPersistence");
  var storedLookupCalled = false;
  userApiKeyPersistence._internal.setClientFactoryForTests(function () {
    storedLookupCalled = true;
    throw new Error("stored key lookup should never be attempted when apiKeyOverride is present");
  });
  try {
    var result = await resolveEffectiveApiKey(FAKE_USER_KEY, { userId: "userA", accessToken: "token-for-userA" });
    assert.equal(result, FAKE_USER_KEY);
    assert.equal(storedLookupCalled, false, "apiKeyOverride varken stored-key lookup'a HİÇ girilmemeli");
  } finally {
    userApiKeyPersistence._internal.resetClientFactoryForTests();
  }
});

test("resolveEffectiveApiKey (stored key tier): kayıtlı key ALLOW_SERVER_API_KEY=false iken BİLE kullanılabilir (server key gate'inden bağımsız)", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "false");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  var restoreMasterKey = withEnvVar("API_KEY_ENCRYPTION_KEY", require("crypto").randomBytes(32).toString("base64"));
  var userApiKeyPersistence = require("../services/userApiKeyPersistence");
  var apiKeyCrypto = require("../services/apiKeyCrypto");
  var STORED_KEY = "sk-or-stored-key-beats-disabled-server-key";
  var enc = apiKeyCrypto.encryptApiKey(STORED_KEY);
  userApiKeyPersistence._internal.setClientFactoryForTests(function (accessToken) {
    if (!accessToken) return null;
    return {
      from: function () {
        return {
          select: function () { return this; },
          eq: function () { return this; },
          maybeSingle: function () {
            return Promise.resolve({ data: { ciphertext: enc.ciphertext, nonce: enc.nonce, auth_tag: enc.authTag, key_version: enc.keyVersion }, error: null });
          },
        };
      },
    };
  });
  try {
    var result = await resolveEffectiveApiKey(null, { userId: "userA", accessToken: "token-for-userA" });
    assert.equal(result, STORED_KEY);
  } finally {
    userApiKeyPersistence._internal.resetClientFactoryForTests();
    restoreFlag();
    restoreEnv();
    restoreMasterKey();
  }
});

test("resolveEffectiveApiKey (stored key tier): kayıtlı key YOKSA (satır bulunamadı) ALLOW_SERVER_API_KEY='true' + env key VAR -> env key'e düşülür", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "true");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  var userApiKeyPersistence = require("../services/userApiKeyPersistence");
  userApiKeyPersistence._internal.setClientFactoryForTests(function (accessToken) {
    if (!accessToken) return null;
    return {
      from: function () {
        return {
          select: function () { return this; },
          eq: function () { return this; },
          maybeSingle: function () { return Promise.resolve({ data: null, error: null }); },
        };
      },
    };
  });
  try {
    var result = await resolveEffectiveApiKey(null, { userId: "userA", accessToken: "token-for-userA" });
    assert.equal(result, FAKE_ENV_KEY);
  } finally {
    userApiKeyPersistence._internal.resetClientFactoryForTests();
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey (stored key tier): anonim istek (authContext yok/userId+accessToken eksik) stored-key lookup'ı HİÇ DENEMEZ", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var userApiKeyPersistence = require("../services/userApiKeyPersistence");
  var lookupAttempted = false;
  userApiKeyPersistence._internal.setClientFactoryForTests(function () {
    lookupAttempted = true;
    return null;
  });
  try {
    assert.equal(await resolveEffectiveApiKey(null), null);
    assert.equal(await resolveEffectiveApiKey(null, null), null);
    assert.equal(await resolveEffectiveApiKey(null, { userId: null, accessToken: null }), null);
    assert.equal(lookupAttempted, false, "anonim istek (userId/accessToken eksik) stored-key client factory'sini HİÇ ÇAĞIRMAMALI");
  } finally {
    userApiKeyPersistence._internal.resetClientFactoryForTests();
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey (stored key tier): decrypt/DB hatası isteği ÇÖKERTMEZ -- güvenli şekilde bir sonraki tier'a düşer", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "true");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  var restoreMasterKey = withEnvVar("API_KEY_ENCRYPTION_KEY", require("crypto").randomBytes(32).toString("base64"));
  var userApiKeyPersistence = require("../services/userApiKeyPersistence");
  // Bozuk/tamper edilmiş bir kayıt -- decrypt BAŞARISIZ olacak.
  userApiKeyPersistence._internal.setClientFactoryForTests(function (accessToken) {
    if (!accessToken) return null;
    return {
      from: function () {
        return {
          select: function () { return this; },
          eq: function () { return this; },
          maybeSingle: function () {
            return Promise.resolve({
              data: { ciphertext: Buffer.from("not-real-ciphertext"), nonce: Buffer.alloc(12, 1), auth_tag: Buffer.alloc(16, 2), key_version: 1 },
              error: null,
            });
          },
        };
      },
    };
  });
  try {
    var result = await resolveEffectiveApiKey(null, { userId: "userA", accessToken: "token-for-userA" });
    // decrypt başarısız -> stored tier sessizce atlanır -> ALLOW_SERVER_API_KEY
    // gate'inden geçer -> env key. İstek hiçbir zaman throw/500 ile çökmedi.
    assert.equal(result, FAKE_ENV_KEY);
  } finally {
    userApiKeyPersistence._internal.resetClientFactoryForTests();
    restoreFlag();
    restoreEnv();
    restoreMasterKey();
  }
});

// =========================================================================
// 2) /api/generate — uçtan uca
// =========================================================================

test("/api/generate: BYOK (req.body.apiKey) çalışır — env key/flag olmasa BİLE gerçek çağrı yapılır", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.mock, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_USER_KEY);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_USER_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreFlag();
    restoreEnv();
  }
});

test("/api/generate: BYOK yok + ALLOW_SERVER_API_KEY yok/false + env key VAR -> gerçek çağrı YAPILMAZ, mock'a düşülür", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
    });
    assert.equal(res.status, 200); // reddedilmiyor, güvenli şekilde mock'a düşüyor
    assert.equal(res.body.meta.mock, true);
    assert.equal(calls.length, 0, "server-side key'e (ALLOW_SERVER_API_KEY olmadan) HİÇBİR gerçek ağ isteği atılmamalı");
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_ENV_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreFlag();
    restoreEnv();
  }
});

test("/api/generate: BYOK yok + ALLOW_SERVER_API_KEY='true' + env key VAR -> server-side key KULLANILABİLİR (local dev opt-in)", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "true");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.mock, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_ENV_KEY);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_ENV_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreFlag();
    restoreEnv();
  }
});

// =========================================================================
// 3) /api/improve — uçtan uca
// =========================================================================

test("/api/improve: BYOK çalışır — env key/flag olmasa BİLE gerçek çağrı yapılır", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["visual"],
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_USER_KEY);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_USER_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreFlag();
    restoreEnv();
  }
});

test("/api/improve: BYOK yok + ALLOW_SERVER_API_KEY yok/false + env key VAR -> gerçek çağrı YAPILMAZ, applied:false/mock:true döner", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["visual"],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, false);
    assert.equal(res.body.mock, true);
    assert.equal(calls.length, 0, "server-side key'e (ALLOW_SERVER_API_KEY olmadan) HİÇBİR gerçek ağ isteği atılmamalı");
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_ENV_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreFlag();
    restoreEnv();
  }
});

// =========================================================================
// 4) /api/autofix — uçtan uca (görev md.2 — TÜM AI request'leri kapsanmalı;
//    bu route'un ÖNCEDEN hiç BYOK desteği/test dosyası yoktu)
// =========================================================================

test("/api/autofix: BYOK çalışır — env key/flag olmasa BİLE gerçek çağrı yapılır", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/autofix", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      checks: [{ key: "has-js", name: "Has JS", status: "fail", detail: "eksik" }],
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_USER_KEY);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_USER_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreFlag();
    restoreEnv();
  }
});

test("/api/autofix: BYOK yok + ALLOW_SERVER_API_KEY yok/false + env key VAR -> gerçek çağrı YAPILMAZ, applied:false/mock:true döner", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/autofix", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      checks: [{ key: "has-js", name: "Has JS", status: "fail", detail: "eksik" }],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, false);
    assert.equal(res.body.mock, true);
    assert.equal(calls.length, 0, "server-side key'e (ALLOW_SERVER_API_KEY olmadan) HİÇBİR gerçek ağ isteği atılmamalı");
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_ENV_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreFlag();
    restoreEnv();
  }
});

test("/api/autofix: BYOK yok + ALLOW_SERVER_API_KEY='true' + env key VAR -> server-side key KULLANILABİLİR (local dev opt-in)", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "true");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/autofix", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      checks: [{ key: "has-js", name: "Has JS", status: "fail", detail: "eksik" }],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_ENV_KEY);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_ENV_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreFlag();
    restoreEnv();
  }
});

// =========================================================================
// 5) Negatif kontrol — hiçbir key/secret hiçbir response'da YER ALMAZ
//    (modelSelector.test.js'teki "yanıt hiçbir API key/secret ... İÇERMİYOR"
//    testiyle AYNI felsefe, üç route için tekrarlanıyor)
// =========================================================================

test("generate/improve/autofix: BYOK key GERÇEK bir çağrıda kullanılsa bile, hiçbir response body'sinde YER ALMAZ", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServer();
  try {
    var genRes = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      apiKey: FAKE_USER_KEY,
    });
    var improveRes = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["visual"],
      apiKey: FAKE_USER_KEY,
    });
    var autofixRes = await postJson(ctx.port, "/api/autofix", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      checks: [],
      apiKey: FAKE_USER_KEY,
    });

    [genRes, improveRes, autofixRes].forEach(function (res) {
      assert.equal(JSON.stringify(res.body).indexOf(FAKE_USER_KEY), -1);
    });
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreFlag();
    restoreEnv();
  }
});

// =========================================================================
// 6) PERSISTENT USER OPENROUTER API KEYS round — /api/generate, /api/autofix,
//    /api/improve, kullanıcının HESABINA KAYITLI bir key varsa (ve request
//    body'sinde apiKey YOKSA) bunu kullanır -- attachUser'ın gerçek doğrulama
//    mantığı BURADA test edilmiyor (bkz. attachUser.test.js), SADECE onun
//    SONUCUNU (req.userId/req.accessToken) simüle eden minimal bir sahte
//    middleware + userApiKeyPersistence'in gerçek client-factory test seam'i
//    kullanılıyor (gamesRoute.test.js İLE AYNI desen).
// =========================================================================

function startServerWithAuth(userId) {
  var app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(function (req, res, next) {
    req.user = userId ? { id: userId, email: userId + "@example.com" } : null;
    req.userId = userId || null;
    req.accessToken = userId ? "token-for-" + userId : null;
    next();
  });
  app.use("/api", generateRouter);
  app.use("/api", improveRouter);
  app.use("/api", autofixRouter);
  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

function stubStoredKeyFor(userId, plaintextKey) {
  var userApiKeyPersistence = require("../services/userApiKeyPersistence");
  var apiKeyCrypto = require("../services/apiKeyCrypto");
  var enc = apiKeyCrypto.encryptApiKey(plaintextKey);
  userApiKeyPersistence._internal.setClientFactoryForTests(function (accessToken) {
    if (!accessToken || accessToken !== "token-for-" + userId) return null;
    return {
      from: function () {
        return {
          select: function () { return this; },
          eq: function () { return this; },
          maybeSingle: function () {
            return Promise.resolve({
              data: { ciphertext: enc.ciphertext, nonce: enc.nonce, auth_tag: enc.authTag, key_version: enc.keyVersion },
              error: null,
            });
          },
        };
      },
    };
  });
  return function restore() {
    userApiKeyPersistence._internal.resetClientFactoryForTests();
  };
}

var FAKE_STORED_KEY = "sk-or-fake-stored-key-never-sent-over-network";

test("/api/generate: signed-in kullanıcı, req.body.apiKey YOKKEN, hesabına KAYITLI key'i kullanır", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var restoreMasterKey = withEnvVar("API_KEY_ENCRYPTION_KEY", require("crypto").randomBytes(32).toString("base64"));
  var restoreStored = stubStoredKeyFor("userA", FAKE_STORED_KEY);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServerWithAuth("userA");
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.mock, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_STORED_KEY);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_STORED_KEY), -1, "stored key HİÇBİR response body'sinde yer almamalı");
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreStored();
    restoreFlag();
    restoreEnv();
    restoreMasterKey();
  }
});

test("/api/generate: signed-in kullanıcı, explicit BYOK (req.body.apiKey) verirse, kayıtlı key'inden ÖNCELİKLİDİR", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var restoreMasterKey = withEnvVar("API_KEY_ENCRYPTION_KEY", require("crypto").randomBytes(32).toString("base64"));
  var restoreStored = stubStoredKeyFor("userA", FAKE_STORED_KEY);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServerWithAuth("userA");
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 200);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_USER_KEY);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreStored();
    restoreFlag();
    restoreEnv();
    restoreMasterKey();
  }
});

test("/api/autofix: signed-in kullanıcı, req.body.apiKey YOKKEN, hesabına KAYITLI key'i kullanır", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var restoreMasterKey = withEnvVar("API_KEY_ENCRYPTION_KEY", require("crypto").randomBytes(32).toString("base64"));
  var restoreStored = stubStoredKeyFor("userA", FAKE_STORED_KEY);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServerWithAuth("userA");
  try {
    var res = await postJson(ctx.port, "/api/autofix", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      checks: [{ key: "has-js", name: "Has JS", status: "fail", detail: "eksik" }],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, true);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_STORED_KEY);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_STORED_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreStored();
    restoreFlag();
    restoreEnv();
    restoreMasterKey();
  }
});

test("/api/improve: signed-in kullanıcı, req.body.apiKey YOKKEN, hesabına KAYITLI key'i kullanır", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var restoreMasterKey = withEnvVar("API_KEY_ENCRYPTION_KEY", require("crypto").randomBytes(32).toString("base64"));
  var restoreStored = stubStoredKeyFor("userA", FAKE_STORED_KEY);
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServerWithAuth("userA");
  try {
    var res = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["visual"],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, true);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_STORED_KEY);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_STORED_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreStored();
    restoreFlag();
    restoreEnv();
    restoreMasterKey();
  }
});

test("/api/generate: anonim istek (signed-in DEĞİL), hesap-bazlı stored-key lookup'ı HİÇ DENEMEZ (regression guard)", async function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  var userApiKeyPersistence = require("../services/userApiKeyPersistence");
  var lookupAttempted = false;
  userApiKeyPersistence._internal.setClientFactoryForTests(function () {
    lookupAttempted = true;
    return null;
  });
  var calls = [];
  var restoreFetch = stubChatCompletions(calls);
  var ctx = await startServerWithAuth(null); // anonim -- req.userId=null
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.mock, true, "anonim + BYOK yok -> mock (ÖNCEKİ davranışla BİREBİR aynı)");
    assert.equal(lookupAttempted, false, "anonim istek stored-key client factory'sini HİÇ ÇAĞIRMAMALI");
  } finally {
    ctx.server.close();
    restoreFetch();
    userApiKeyPersistence._internal.resetClientFactoryForTests();
    restoreFlag();
    restoreEnv();
  }
});
