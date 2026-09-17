/**
 * OPENROUTER MODEL CATALOG + USER API KEY (BYOK) round — testler (görev
 * md.13, en az 17 senaryo — 15'i burada, 2'si (arama/filtre UI'da, 390px
 * responsive) Playwright smoke testinde, bkz. o script).
 *
 * server/tests/modelSelector.test.js'in AYNI felsefesi: gerçek bir
 * OpenRouter ağ çağrısı YAPILMIYOR, global.fetch URL'e göre dallanan bir
 * stub ile taklit ediliyor; process.env.OPENROUTER_API_KEY test başına
 * set/restore ediliyor; hiçbir gerçek/sahte API key hiçbir assert/log
 * çıktısına YAZILMIYOR (sadece "response'da/response JSON'ında bu key YOK"
 * şeklinde negatif kontroller var).
 *
 * modelCatalog.js modül-seviyesi singleton önbelleğini testler arasında
 * SIZDIRMAMAK için her testin başında modelCatalog._resetCacheForTests()
 * çağrılıyor (customAssetLibrary.test.js'in freshRoot() İLE AYNI desen).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const modelsRouter = require("../routes/models");
const generateRouter = require("../routes/generate");
const modelConfig = require("../config/models");
const modelCatalog = require("../services/modelCatalog");

var FAKE_ENV_KEY = "test-fake-env-key-never-sent-over-network";
var FAKE_USER_KEY = "sk-or-test-fake-user-key-never-sent-over-network";
var FAKE_INVALID_USER_KEY = "sk-or-test-fake-invalid-user-key";

function startServer(router) {
  var app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", router);
  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

function getJson(port, path) {
  return new Promise(function (resolve, reject) {
    http
      .get({ hostname: "localhost", port: port, path: path }, function (res) {
        var chunks = "";
        res.on("data", function (c) { chunks += c; });
        res.on("end", function () {
          try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); } catch (err) { reject(err); }
        });
      })
      .on("error", reject);
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

function withFakeEnvKey() {
  var previous = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = FAKE_ENV_KEY;
  return function restore() {
    if (previous === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previous;
  };
}

function withNoEnvKey() {
  var previous = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  return function restore() {
    if (previous !== undefined) process.env.OPENROUTER_API_KEY = previous;
  };
}

// PRODUCTION BYOK SECURITY FIX — bkz. modelSelector.test.js'teki aynı adlı
// yardımcının yorumu: apiKey HİÇ gönderilmeden env key fallback'ini test
// eden senaryolar artık bunu SADECE ALLOW_SERVER_API_KEY==="true" iken
// gözlemleyebilir (production-safe yeni varsayılan). withFakeEnvKey() İLE
// BİRLİKTE kullanılır.
function withAllowServerKey(value) {
  var previous = process.env.ALLOW_SERVER_API_KEY;
  process.env.ALLOW_SERVER_API_KEY = value;
  return function restore() {
    if (previous === undefined) delete process.env.ALLOW_SERVER_API_KEY;
    else process.env.ALLOW_SERVER_API_KEY = previous;
  };
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

function fakeCatalogResponse(entries) {
  return {
    ok: true,
    json: async function () { return { data: entries }; },
  };
}

/**
 * URL'e göre dallanan genel bir fetch stub'ı. `calls` dizisine her çağrının
 * { url, opts } kaydı düşer (Authorization header'ı DAHİL — testler bunu
 * "hangi key gerçekten kullanıldı" doğrulaması için okuyor, ASLA log'a
 * yazmıyor). Beklenmeyen bir URL'e çağrı gelirse (test yanlış bir şeyi
 * tetikliyorsa hemen fark edilsin diye) throw eder.
 */
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

test.beforeEach(function () {
  modelCatalog._resetCacheForTests();
});

// -----------------------------------------------------------------------
// 1) OpenRouter model kataloğu yanıtı doğru ayrıştırılıyor
// -----------------------------------------------------------------------
test("modelCatalog.getModelCatalog: canlı OpenRouter kataloğunu doğru ayrıştırır (id/displayName/provider/contextLength/pricing/modaliteler)", async function () {
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [
      {
        match: /openrouter\.ai\/api\/v1\/models$/,
        respond: function () {
          return fakeCatalogResponse([
            {
              id: "openai/gpt-4o-mini",
              name: "OpenAI: GPT-4o mini",
              context_length: 128000,
              pricing: { prompt: "0.00000015", completion: "0.0000006" },
              architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] },
            },
          ]);
        },
      },
    ],
    calls
  );
  try {
    var result = await modelCatalog.getModelCatalog();
    assert.equal(result.source, "live");
    var entry = result.models.filter(function (m) { return m.id === "openai/gpt-4o-mini"; })[0];
    assert.ok(entry, "canlı katalogdan gelen model listede bulunamadı");
    assert.equal(entry.displayName, "GPT-4o mini");
    assert.equal(entry.provider, "openai");
    assert.equal(entry.contextLength, 128000);
    assert.deepEqual(entry.pricing, { prompt: "0.00000015", completion: "0.0000006" });
    assert.deepEqual(entry.inputModalities, ["text", "image"]);
    assert.deepEqual(entry.outputModalities, ["text"]);
  } finally {
    restoreFetch();
  }
});

// -----------------------------------------------------------------------
// 2) Uyumsuz modaliteler (embedding/görsel-üretim/vb.) süzülüyor
// -----------------------------------------------------------------------
test("modelCatalog.getModelCatalog: text->text OLMAYAN modeller (embedding/image-only/rerank) SÜZÜLÜR, DeepSeek/Qwen HER ZAMAN listede kalır", async function () {
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [
      {
        match: /openrouter\.ai\/api\/v1\/models$/,
        respond: function () {
          return fakeCatalogResponse([
            { id: "openai/text-embedding-3-large", name: "OpenAI: Embedding v3", architecture: { input_modalities: ["text"], output_modalities: ["embedding"] } },
            { id: "cohere/rerank-english-v3", name: "Cohere: Rerank v3", architecture: { input_modalities: ["text"], output_modalities: ["text"] } },
            { id: "stability/stable-diffusion-xl", name: "Stability: SDXL", architecture: { input_modalities: ["text"], output_modalities: ["image"] } },
            { id: "anthropic/claude-3.5-sonnet", name: "Anthropic: Claude 3.5 Sonnet", context_length: 200000, architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] } },
          ]);
        },
      },
    ],
    calls
  );
  try {
    var result = await modelCatalog.getModelCatalog();
    var ids = result.models.map(function (m) { return m.id; });
    assert.ok(ids.indexOf("openai/text-embedding-3-large") === -1, "embedding modeli süzülmeliydi");
    assert.ok(ids.indexOf("stability/stable-diffusion-xl") === -1, "image-only model süzülmeliydi (denylist: id'de 'stable-diffusion')");
    assert.ok(ids.indexOf("cohere/rerank-english-v3") === -1, "rerank modeli süzülmeliydi (denylist: id'de 'rerank')");
    assert.ok(ids.indexOf("anthropic/claude-3.5-sonnet") !== -1, "geçerli text->text model listede olmalıydı");
    // md.10: canlı katalog dönse bile DeepSeek/Qwen ASLA tamamen kaybolmaz.
    modelConfig.models.forEach(function (m) {
      assert.ok(ids.indexOf(m.id) !== -1, "statik model kayboldu: " + m.id);
    });
  } finally {
    restoreFetch();
  }
});

// -----------------------------------------------------------------------
// 3) GET /api/models — canlı katalog kullanılabiliyorsa zengin şekli döner
// -----------------------------------------------------------------------
test("GET /api/models: canlı katalog kullanılabiliyorsa provider/contextLength/pricing/modaliteler İLE birlikte döner", async function () {
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [
      {
        match: /openrouter\.ai\/api\/v1\/models$/,
        respond: function () {
          return fakeCatalogResponse([
            { id: "google/gemini-2.0-flash", name: "Google: Gemini 2.0 Flash", context_length: 1000000, pricing: { prompt: "0.0000001", completion: "0.0000004" }, architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] } },
          ]);
        },
      },
    ],
    calls
  );
  var ctx = await startServer(modelsRouter);
  try {
    var res = await getJson(ctx.port, "/api/models");
    assert.equal(res.status, 200);
    var entry = res.body.models.filter(function (m) { return m.id === "google/gemini-2.0-flash"; })[0];
    assert.ok(entry);
    assert.equal(entry.provider, "google");
    assert.equal(typeof entry.contextLength, "number");
    assert.equal(res.body.defaultModel, modelConfig.defaultModel);
  } finally {
    ctx.server.close();
    restoreFetch();
  }
});

// -----------------------------------------------------------------------
// 4) OpenRouter kataloğu erişilemezse GET /api/models güvenli fallback verir
// -----------------------------------------------------------------------
test("GET /api/models: OpenRouter kataloğuna ULAŞILAMAZSA (ağ hatası) MEVCUT statik DeepSeek/Qwen listesine güvenli şekilde düşer, request ÇÖKMEZ", async function () {
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [
      {
        match: /openrouter\.ai\/api\/v1\/models$/,
        respond: function () { throw new Error("simulated network failure"); },
      },
    ],
    calls
  );
  var ctx = await startServer(modelsRouter);
  try {
    var res = await getJson(ctx.port, "/api/models");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.models) && res.body.models.length > 0);
    var ids = res.body.models.map(function (m) { return m.id; });
    modelConfig.models.forEach(function (m) {
      assert.ok(ids.indexOf(m.id) !== -1, "fallback listede statik model eksik: " + m.id);
    });
    assert.equal(res.body.defaultModel, modelConfig.defaultModel);
  } finally {
    ctx.server.close();
    restoreFetch();
  }
});

// -----------------------------------------------------------------------
// 5) Dinamik katalogdan gelen, statik listede OLMAYAN bir model kabul edilir
// -----------------------------------------------------------------------
test("modelCatalog.resolveRequestedModelFromCache: önbellekte olan (statik listede OLMAYAN) bir katalog modeli GERÇEKTEN kabul edilir", function () {
  modelCatalog._resetCacheForTests([
    { id: "openai/gpt-4o-mini", displayName: "GPT-4o mini", provider: "openai", contextLength: 128000, pricing: null, inputModalities: ["text"], outputModalities: ["text"] },
  ]);
  assert.equal(modelCatalog.resolveRequestedModelFromCache("openai/gpt-4o-mini"), "openai/gpt-4o-mini");
});

// -----------------------------------------------------------------------
// 6) Geçersiz/uydurma bir model id'si varsayılana düşer
// -----------------------------------------------------------------------
test("modelCatalog.resolveRequestedModelFromCache: kataloğun/statik listenin üyesi OLMAYAN bir id varsayılana düşer", function () {
  modelCatalog._resetCacheForTests([
    { id: "openai/gpt-4o-mini", displayName: "GPT-4o mini", provider: "openai" },
  ]);
  assert.equal(modelCatalog.resolveRequestedModelFromCache("totally/fake-model"), modelConfig.model);
  assert.equal(modelCatalog.resolveRequestedModelFromCache(undefined), modelConfig.model);
});

// -----------------------------------------------------------------------
// 7) Önbellek boşsa (hiç GET /api/models çağrılmadıysa) ESKİ senkron davranış
// -----------------------------------------------------------------------
test("modelCatalog.resolveRequestedModelFromCache: önbellek BOŞSA modelConfig.resolveRequestedModel İLE BİREBİR aynı (regresyon yok)", function () {
  modelCatalog._resetCacheForTests(); // boş
  var validNonDefault = modelConfig.models.filter(function (m) { return m.id !== modelConfig.defaultModel; })[0];
  if (validNonDefault) {
    assert.equal(modelCatalog.resolveRequestedModelFromCache(validNonDefault.id), validNonDefault.id);
  }
  assert.equal(modelCatalog.resolveRequestedModelFromCache("fake/does-not-exist"), modelConfig.model);
});

// -----------------------------------------------------------------------
// 8) Model id GÜVENLİ FORMAT kontrolü (md.11)
// -----------------------------------------------------------------------
test("modelCatalog.isSafeModelIdFormat: güvensiz/bozuk formatları reddeder, geçerli 'sağlayıcı/model' şeklini kabul eder", function () {
  assert.equal(modelCatalog.isSafeModelIdFormat("deepseek/deepseek-v4-flash-0731"), true);
  assert.equal(modelCatalog.isSafeModelIdFormat("openai/gpt-4o-mini"), true);
  assert.equal(modelCatalog.isSafeModelIdFormat("no-slash-here"), false);
  assert.equal(modelCatalog.isSafeModelIdFormat(""), false);
  assert.equal(modelCatalog.isSafeModelIdFormat(null), false);
  assert.equal(modelCatalog.isSafeModelIdFormat(undefined), false);
  assert.equal(modelCatalog.isSafeModelIdFormat(123), false);
  assert.equal(modelCatalog.isSafeModelIdFormat("a/b c"), false); // boşluk içeriyor
  assert.equal(modelCatalog.isSafeModelIdFormat("a/" + "b".repeat(300)), false); // çok uzun
});

// -----------------------------------------------------------------------
// 9) Kullanıcının kendi API key'i (BYOK) — ENV key OLMASA bile KULLANILIR
// -----------------------------------------------------------------------
test("/api/generate: kullanıcının kendi apiKey'i ENV key hiç TANIMLI OLMASA bile GERÇEKTEN kullanılır (mock moddan ÇIKILIR)", async function () {
  var restoreEnv = withNoEnvKey();
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } }],
    calls
  );
  var ctx = await startServer(generateRouter);
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.mock, false, "kullanıcı key'i verildiğinde mock moda düşülmemeli");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_USER_KEY);
    // GÜVENLİK: key ne response'da ne de request body'nin dışında hiçbir yerde.
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_USER_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 10) ENV key fallback'i (apiKey verilmezse) BOZULMADI
// -----------------------------------------------------------------------
test("/api/generate: apiKey alanı hiç gönderilmezse, ALLOW_SERVER_API_KEY=true İKEN MEVCUT ENV key fallback'i ÇALIŞMAYA devam eder (regresyon yok)", async function () {
  var restoreEnv = withFakeEnvKey();
  var restoreFlag = withAllowServerKey("true");
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } }],
    calls
  );
  var ctx = await startServer(generateRouter);
  try {
    var res = await postJson(ctx.port, "/api/generate", { prompt: "Create a 5-second space shooter game with asteroids." });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.mock, false);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_ENV_KEY);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_ENV_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
    restoreFlag();
  }
});

// -----------------------------------------------------------------------
// 11) Hem ENV hem user key varsa, USER key ÖNCELİKLİDİR
// -----------------------------------------------------------------------
test("/api/generate: HEM ENV key HEM kullanıcı apiKey'i verilmişse, KULLANICI key'i ENV key'in ÖNÜNE geçer", async function () {
  var restoreEnv = withFakeEnvKey();
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } }],
    calls
  );
  var ctx = await startServer(generateRouter);
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 200);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_USER_KEY);
    assert.notEqual(calls[0].opts.headers.Authorization, "Bearer " + FAKE_ENV_KEY);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 12) Seçilen model + kullanıcı key'i BİRLİKTE, OpenRouter isteğine doğru geçiyor
// -----------------------------------------------------------------------
test("/api/generate: seçilen (varsayılan olmayan) model VE kullanıcı key'i AYNI ANDA OpenRouter isteğine doğru şekilde geçer", async function () {
  var nonDefault = modelConfig.models.filter(function (m) { return m.id !== modelConfig.defaultModel; })[0];
  assert.ok(nonDefault);
  var restoreEnv = withNoEnvKey();
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } }],
    calls
  );
  var ctx = await startServer(generateRouter);
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      model: nonDefault.id,
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.model, nonDefault.id);
    var sentBody = JSON.parse(calls[0].opts.body);
    assert.equal(sentBody.model, nonDefault.id);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_USER_KEY);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 13) POST /api/models/validate-key — geçerli key
// -----------------------------------------------------------------------
test("POST /api/models/validate-key: geçerli bir key için {valid:true} döner, key response'ta ASLA yer almaz", async function () {
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /auth\/key$/, respond: function () { return { ok: true, json: async function () { return { data: {} }; } }; } }],
    calls
  );
  var ctx = await startServer(modelsRouter);
  try {
    var res = await postJson(ctx.port, "/api/models/validate-key", { apiKey: FAKE_USER_KEY });
    assert.equal(res.status, 200);
    assert.equal(res.body.valid, true);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_USER_KEY), -1);
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_USER_KEY);
  } finally {
    ctx.server.close();
    restoreFetch();
  }
});

// -----------------------------------------------------------------------
// 14) POST /api/models/validate-key — geçersiz key (401)
// -----------------------------------------------------------------------
test("POST /api/models/validate-key: geçersiz key (OpenRouter 401 döndürür) için {valid:false, error} döner, key HİÇBİR YERDE yok", async function () {
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /auth\/key$/, respond: function () { return { ok: false, status: 401, text: async function () { return "{\"error\":\"Unauthorized\"}"; } }; } }],
    calls
  );
  var ctx = await startServer(modelsRouter);
  try {
    var res = await postJson(ctx.port, "/api/models/validate-key", { apiKey: FAKE_INVALID_USER_KEY });
    assert.equal(res.status, 200); // request çökmedi
    assert.equal(res.body.valid, false);
    assert.equal(typeof res.body.error, "string");
    assert.ok(res.body.error.length > 0);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_INVALID_USER_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
  }
});

// -----------------------------------------------------------------------
// Ek — boş/eksik key ağa hiç istek atmadan reddedilir
// -----------------------------------------------------------------------
test("POST /api/models/validate-key: boş/eksik key AĞA HİÇ İSTEK ATMADAN güvenli şekilde reddedilir", async function () {
  var calls = [];
  var restoreFetch = stubFetchByUrl([{ match: /auth\/key$/, respond: function () { return { ok: true, json: async function () { return {}; } }; } }], calls);
  var ctx = await startServer(modelsRouter);
  try {
    var res1 = await postJson(ctx.port, "/api/models/validate-key", {});
    assert.equal(res1.body.valid, false);
    var res2 = await postJson(ctx.port, "/api/models/validate-key", { apiKey: "   " });
    assert.equal(res2.body.valid, false);
    assert.equal(calls.length, 0, "boş/eksik key için ağa hiç istek atılmamalıydı");
  } finally {
    ctx.server.close();
    restoreFetch();
  }
});

// -----------------------------------------------------------------------
// 15) OpenRouter'a ulaşılamazsa validate-key ÇÖKMEZ
// -----------------------------------------------------------------------
test("POST /api/models/validate-key: OpenRouter'a ULAŞILAMAZSA (ağ hatası) request ÇÖKMEZ, kullanıcı dostu bir hata döner", async function () {
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /auth\/key$/, respond: function () { throw new Error("simulated network failure"); } }],
    calls
  );
  var ctx = await startServer(modelsRouter);
  try {
    var res = await postJson(ctx.port, "/api/models/validate-key", { apiKey: FAKE_USER_KEY });
    assert.equal(res.status, 200);
    assert.equal(res.body.valid, false);
    assert.equal(typeof res.body.error, "string");
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_USER_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
  }
});

// -----------------------------------------------------------------------
// 16) Mevcut mock mod davranışı (ne ENV ne user key) BOZULMADI
// -----------------------------------------------------------------------
test("/api/generate: ne ENV key ne kullanıcı apiKey'i varsa MEVCUT mock mod davranışı (meta.mock/model/gameType) DEĞİŞMEDİ", async function () {
  var restoreEnv = withNoEnvKey();
  var ctx = await startServer(generateRouter);
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      apiKey: "   ", // sadece boşluk -> yoksayılmalı
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.mock, true);
    assert.equal(res.body.meta.model, null);
    assert.equal(res.body.meta.gameType, "space-shooter");
  } finally {
    ctx.server.close();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 17) Mevcut generation akışı (dinamik katalog/BYOK olmadan) BOZULMADI
// -----------------------------------------------------------------------
test("/api/generate: modelCatalog/BYOK değişiklikleri sonrası, ALLOW_SERVER_API_KEY=true İKEN HİÇ önbellek/apiKey olmadan eski davranış (varsayılan olmayan model seçimi) BİREBİR ÇALIŞIYOR", async function () {
  modelCatalog._resetCacheForTests(); // hiç GET /api/models çağrılmamış gibi
  var nonDefault = modelConfig.models.filter(function (m) { return m.id !== modelConfig.defaultModel; })[0];
  var restoreEnv = withFakeEnvKey();
  var restoreFlag = withAllowServerKey("true");
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } }],
    calls
  );
  var ctx = await startServer(generateRouter);
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      model: nonDefault.id,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.model, nonDefault.id);
    var sentBody = JSON.parse(calls[0].opts.body);
    assert.equal(sentBody.model, nonDefault.id);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
    restoreFlag();
  }
});
