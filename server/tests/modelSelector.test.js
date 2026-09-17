/**
 * AI MODEL SELECTOR round — testler.
 *
 * Kapsam (görev md.10, minimum 7 senaryo):
 *  1) GET /api/models başarılı + doğru şekil
 *  2) defaultModel doğru (config'teki gerçek DEFAULT_MODEL ile eşleşiyor)
 *  3) model listesi hiçbir secret/API key alanı İÇERMİYOR
 *  4) geçerli bir model kabul ediliyor VE gerçekten OpenRouter isteğinde
 *     kullanılıyor
 *  5) geçersiz bir model GÜVENLİ şekilde reddediliyor/varsayılana düşüyor
 *     (crash yok, key sızmıyor)
 *  6) /api/generate isteği seçilen modeli GERÇEKTEN kullanıyor (4 ile aynı
 *     stub, ayrı bir açıdan doğrulanıyor: request body.model)
 *  7) mevcut varsayılan DeepSeek üretim davranışı (mock mod) BOZULMADI
 *
 * Gerçek bir OpenRouter ağ çağrısı YAPILMIYOR: 4/5/6 için process.env
 * üzerinde SAHTE (gerçek olmayan, hiçbir yere gönderilmeyen — global.fetch
 * stub'landığı için ağa hiç çıkmıyor) bir OPENROUTER_API_KEY set edilip
 * global.fetch geçici olarak stub'lanıyor; test bitince İKİSİ DE (key ve
 * fetch) eski hâline geri alınıyor. API key hiçbir test çıktısına/log'a
 * yazılmıyor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const modelsRouter = require("../routes/models");
const generateRouter = require("../routes/generate");
const modelConfig = require("../config/models");

var FAKE_TEST_KEY = "test-fake-key-never-sent-over-network";

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

// Gerçek bir OpenRouter yanıtının minimal, geçerli şeklini taklit eder.
// Sadece callOpenRouterForHtml/callLlmForSpec'in beklediği alanları taşır —
// gerçek bir network çağrısı YOK, fetch tamamen stub'lı.
function fakeOpenRouterHtmlResponse() {
  return {
    ok: true,
    json: async function () {
      return {
        choices: [
          {
            message: { content: "<html><body><script>console.log('ok')</script></body></html>" },
            finish_reason: "stop",
          },
        ],
      };
    },
  };
}

// global.fetch'i geçici olarak stub'lar; her çağrının `body` alanını
// (JSON.parse edilmiş) capturedBodies dizisine kaydeder. restore() orijinal
// fetch'i geri yükler.
function stubFetch(capturedBodies) {
  var original = global.fetch;
  global.fetch = async function (url, opts) {
    var parsedBody = null;
    try { parsedBody = JSON.parse(opts && opts.body); } catch (err) { /* yok say */ }
    capturedBodies.push(parsedBody);
    return fakeOpenRouterHtmlResponse();
  };
  return function restore() {
    global.fetch = original;
  };
}

function withFakeApiKey() {
  var previous = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = FAKE_TEST_KEY;
  return function restore() {
    if (previous === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previous;
  };
}

// PRODUCTION BYOK SECURITY FIX — bu dosyadaki bazı testler, apiKey HİÇ
// gönderilmeden (BYOK olmadan) env key'in gerçekten kullanıldığını
// doğruluyor (yerel geliştirme senaryosu). openrouterClient.resolveEffectiveApiKey()
// artık bunu SADECE ALLOW_SERVER_API_KEY==="true" iken kabul ediyor —
// aksi halde (yeni, production-safe varsayılan) bu istekler mock'a düşer.
// Bu yardımcı, o testlerin AYNI senaryoyu (yerel dev + env key) yeni,
// doğru gate ile devam ettirmesini sağlar; withFakeApiKey() İLE BİRLİKTE
// kullanılır.
function withAllowServerKey(value) {
  var previous = process.env.ALLOW_SERVER_API_KEY;
  process.env.ALLOW_SERVER_API_KEY = value;
  return function restore() {
    if (previous === undefined) delete process.env.ALLOW_SERVER_API_KEY;
    else process.env.ALLOW_SERVER_API_KEY = previous;
  };
}

// -----------------------------------------------------------------------
// 1) GET /api/models — başarılı + doğru şekil
// -----------------------------------------------------------------------
test("GET /api/models: 200 döner, { models: [{id, displayName}], defaultModel } şeklinde", async function () {
  var ctx = await startServer(modelsRouter);
  try {
    var res = await getJson(ctx.port, "/api/models");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.models));
    assert.ok(res.body.models.length > 0);
    res.body.models.forEach(function (m) {
      assert.equal(typeof m.id, "string");
      assert.equal(typeof m.displayName, "string");
    });
    assert.equal(typeof res.body.defaultModel, "string");
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 2) defaultModel doğru
// -----------------------------------------------------------------------
test("GET /api/models: defaultModel, server/config/models.js'in GERÇEK varsayılanıyla (deepseek/deepseek-v4-flash-0731) eşleşiyor", async function () {
  var ctx = await startServer(modelsRouter);
  try {
    var res = await getJson(ctx.port, "/api/models");
    assert.equal(res.body.defaultModel, "deepseek/deepseek-v4-flash-0731");
    assert.equal(res.body.defaultModel, modelConfig.defaultModel);
    assert.ok(res.body.models.some(function (m) { return m.id === res.body.defaultModel; }));
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 3) Model listesi hiçbir secret içermiyor
// -----------------------------------------------------------------------
test("GET /api/models: yanıt hiçbir API key/secret/internal config alanı İÇERMİYOR", async function () {
  var ctx = await startServer(modelsRouter);
  try {
    var res = await getJson(ctx.port, "/api/models");
    var raw = JSON.stringify(res.body);

    // Yanıtın SADECE iki üst seviye alanı olmalı: models, defaultModel.
    assert.deepEqual(Object.keys(res.body).sort(), ["defaultModel", "models"]);

    // OPENROUTER MODEL CATALOG + BYOK round — her model girdisi artık id/
    // displayName'e EK OLARAK provider/contextLength/pricing/
    // inputModalities/outputModalities taşıyabilir (görev md.1/md.2 — bu
    // yeni alanların HİÇBİRİ secret DEĞİL, OpenRouter'ın PUBLIC
    // kataloğundan geliyor, bkz. modelCatalog.js). Eski TAM eşleşme (SADECE
    // id/displayName) yerine artık bir ALLOWLIST kontrolüne geçildi — bu
    // testin GÜVENLİK NİYETİ (apiUrl/apiKey/reasoning/temperature/
    // max_tokens/appName/appUrl gibi dahili/secret alanların ASLA
    // sızmaması) birebir KORUNUYOR, sadece meşru yeni alanlara izin
    // veriliyor.
    var ALLOWED_MODEL_FIELDS = ["id", "displayName", "provider", "contextLength", "pricing", "inputModalities", "outputModalities"];
    res.body.models.forEach(function (m) {
      Object.keys(m).forEach(function (k) {
        assert.ok(ALLOWED_MODEL_FIELDS.indexOf(k) !== -1, "model girdisi beklenmedik/izinsiz bir alan içeriyor: " + k);
      });
      assert.equal(typeof m.id, "string");
      assert.equal(typeof m.displayName, "string");
    });

    ["apiKey", "apiUrl", "appName", "appUrl", "reasoning", "temperature", "max_tokens", "OPENROUTER"].forEach(function (secretish) {
      assert.equal(raw.indexOf(secretish), -1, "yanıt beklenmedik şekilde '" + secretish + "' içeriyor");
    });
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 4) + 6) Geçerli, varsayılan-olmayan bir model /api/generate'e verilince
//    gerçekten OpenRouter isteğinde KULLANILIYOR.
// -----------------------------------------------------------------------
test("/api/generate: geçerli, varsayılan olmayan bir model seçilirse OpenRouter isteğinde VE yanıt meta.model'de o model kullanılır", async function () {
  var nonDefault = modelConfig.models.filter(function (m) { return m.id !== modelConfig.defaultModel; })[0];
  assert.ok(nonDefault, "test için varsayılan-olmayan en az bir desteklenen model gerekli");

  var restoreKey = withFakeApiKey();
  var restoreFlag = withAllowServerKey("true");
  var capturedBodies = [];
  var restoreFetch = stubFetch(capturedBodies);
  var ctx = await startServer(generateRouter);
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      model: nonDefault.id,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.model, nonDefault.id);
    assert.ok(capturedBodies.length > 0);
    assert.equal(capturedBodies[0].model, nonDefault.id);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreKey();
    restoreFlag();
  }
});

// -----------------------------------------------------------------------
// 5) Geçersiz model GÜVENLİ şekilde reddedilir (crash yok, key sızmıyor,
//    varsayılana düşer).
// -----------------------------------------------------------------------
test("/api/generate: geçersiz/uydurma bir model id'si request'i ÇÖKERTMEZ, sessizce varsayılan modele düşer", async function () {
  var restoreKey = withFakeApiKey();
  var restoreFlag = withAllowServerKey("true");
  var capturedBodies = [];
  var restoreFetch = stubFetch(capturedBodies);
  var ctx = await startServer(generateRouter);
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      model: "totally/fake-model-id-that-does-not-exist",
    });
    assert.equal(res.status, 200); // crash yok
    assert.equal(res.body.meta.model, modelConfig.defaultModel); // güvenli fallback
    assert.equal(capturedBodies[0].model, modelConfig.defaultModel); // OpenRouter'a GİDEN model de default
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_TEST_KEY), -1); // key hiçbir yerde
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreKey();
    restoreFlag();
  }
});

test("/api/generate: model alanı hiç gönderilmezse (undefined/eksik) request ÇÖKMEZ, varsayılan model kullanılır", async function () {
  var restoreKey = withFakeApiKey();
  var restoreFlag = withAllowServerKey("true");
  var capturedBodies = [];
  var restoreFetch = stubFetch(capturedBodies);
  var ctx = await startServer(generateRouter);
  try {
    var res = await postJson(ctx.port, "/api/generate", { prompt: "Create a 5-second space shooter game with asteroids." });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.model, modelConfig.defaultModel);
    assert.equal(capturedBodies[0].model, modelConfig.defaultModel);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreKey();
    restoreFlag();
  }
});

// -----------------------------------------------------------------------
// 7) Mevcut varsayılan DeepSeek üretim davranışı (mock mod, key YOK) BOZULMADI
// -----------------------------------------------------------------------
test("/api/generate (mock modda, key yok): mevcut davranış (meta.mock/model/gameType) DEĞİŞMEDİ — model alanı gönderilse bile mock moddan çıkılmaz", async function () {
  var previousKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  var ctx = await startServer(generateRouter);
  try {
    var res = await postJson(ctx.port, "/api/generate", {
      prompt: "Create a 5-second space shooter game with asteroids.",
      model: modelConfig.models[0].id,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.mock, true);
    assert.equal(res.body.meta.model, null); // mock modda model her zaman null (ÖNCEKİ round'la aynı)
    assert.equal(res.body.meta.gameType, "space-shooter");
  } finally {
    ctx.server.close();
    if (previousKey !== undefined) process.env.OPENROUTER_API_KEY = previousKey;
  }
});

// -----------------------------------------------------------------------
// Ekstra — models.js'in saf fonksiyonları (network'süz, doğrudan unit test)
// -----------------------------------------------------------------------
test("modelConfig.isSupportedModel: sadece SUPPORTED_MODELS içindeki id'ler için true", function () {
  assert.equal(modelConfig.isSupportedModel(modelConfig.defaultModel), true);
  assert.equal(modelConfig.isSupportedModel("fake/does-not-exist"), false);
  assert.equal(modelConfig.isSupportedModel(null), false);
  assert.equal(modelConfig.isSupportedModel(undefined), false);
  assert.equal(modelConfig.isSupportedModel(123), false);
});

test("modelConfig.resolveRequestedModel: geçerli id'yi AYNEN döner, geçersiz/eksik id'de ASLA throw etmeden varsayılana düşer", function () {
  var validNonDefault = modelConfig.models.filter(function (m) { return m.id !== modelConfig.defaultModel; })[0];
  if (validNonDefault) {
    assert.equal(modelConfig.resolveRequestedModel(validNonDefault.id), validNonDefault.id);
  }
  assert.equal(modelConfig.resolveRequestedModel("fake/does-not-exist"), modelConfig.model);
  assert.equal(modelConfig.resolveRequestedModel(undefined), modelConfig.model);
  assert.equal(modelConfig.resolveRequestedModel(null), modelConfig.model);
  assert.equal(modelConfig.resolveRequestedModel(""), modelConfig.model);
});
