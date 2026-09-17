/**
 * ROUND G — IMPROVE WITH AI testleri (görev md.15, en az 20 senaryo — bir
 * kısmı burada backend/HTTP seviyesinde, bir kısmı (modal açma/kapama,
 * seçenek seçimi, 390px responsive, "current game preserved on failure"in
 * GÖRSEL doğrulaması) Playwright smoke testinde, bkz. o script).
 *
 * modelCatalogByok.test.js İLE AYNI desen: gerçek bir OpenRouter ağ çağrısı
 * YAPILMIYOR, global.fetch URL'e göre dallanan bir stub ile taklit ediliyor;
 * process.env.OPENROUTER_API_KEY test başına set/restore ediliyor; hiçbir
 * gerçek/sahte API key hiçbir assert/log çıktısına YAZILMIYOR.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const improveRouter = require("../routes/improve");
const modelCatalog = require("../services/modelCatalog");

var FAKE_ENV_KEY = "test-fake-env-key-never-sent-over-network";
var FAKE_USER_KEY = "sk-or-test-fake-user-key-never-sent-over-network";

var SAMPLE_HTML =
  "<html><body><h1>Fruit Tapper</h1><script>var score=0;function tap(){score++;}</script></body></html>";

function startServer() {
  var app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", improveRouter);
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

// PRODUCTION BYOK SECURITY FIX — bkz. modelSelector.test.js/modelCatalogByok.test.js'teki
// aynı adlı yardımcının yorumu: apiKey hiç gönderilmeden env key fallback'ini
// test eden senaryo artık SADECE ALLOW_SERVER_API_KEY==="true" iken geçerli
// (production-safe yeni varsayılan). withFakeEnvKey() İLE BİRLİKTE kullanılır.
function withAllowServerKey(value) {
  var previous = process.env.ALLOW_SERVER_API_KEY;
  process.env.ALLOW_SERVER_API_KEY = value;
  return function restore() {
    if (previous === undefined) delete process.env.ALLOW_SERVER_API_KEY;
    else process.env.ALLOW_SERVER_API_KEY = previous;
  };
}

function fakeChatCompletionResponse(html) {
  return {
    ok: true,
    json: async function () {
      return { choices: [{ message: { content: html || SAMPLE_HTML }, finish_reason: "stop" }] };
    },
  };
}

function stubFetchByUrl(handlers, calls) {
  var original = global.fetch;
  global.fetch = async function (url, opts) {
    calls.push({ url: url, opts: opts || {} });
    for (var i = 0; i < handlers.length; i++) {
      if (handlers[i].match.test(url)) return handlers[i].respond(url, opts);
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
// 1) ESKİ (Phase 4) sözleşme HİÇ DEĞİŞMEDİ — {html, prompt, instruction}
// -----------------------------------------------------------------------
test("/api/improve: eski {html, prompt, instruction} sözleşmesi birebir aynı çalışmaya devam ediyor (regresyon yok)", async function () {
  var restoreEnv = withNoEnvKey();
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      instruction: "Make it faster",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, false); // key yok -> mock
    assert.equal(res.body.html, SAMPLE_HTML);
    assert.equal(typeof res.body.message, "string");
    assert.equal(typeof res.body.validation, "object");
  } finally {
    ctx.server.close();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 2) instruction da improvements/customText de yoksa 400
// -----------------------------------------------------------------------
test("/api/improve: instruction YOK ve improvements/customText de YOKSA 400 döner", async function () {
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", { html: SAMPLE_HTML, prompt: "Fruit tapping game" });
    assert.equal(res.status, 400);
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 3) Seçili improvement seçenekleri + custom text -> AI'ya giden mesajda
//    CURRENT GAME / ORIGINAL USER IDEA / IMPROVEMENT REQUEST / USER CUSTOM
//    REQUEST / RULES yapılandırılmış bloklarının HEPSİ gerçekten var (md.4/md.8)
// -----------------------------------------------------------------------
test("/api/improve: improvements + customText verildiğinde AI'ya giden mesaj yapılandırılmış (CURRENT GAME/ORIGINAL USER IDEA/IMPROVEMENT REQUEST/USER CUSTOM REQUEST/RULES) ve mevcut oyunun context'ini içeriyor", async function () {
  var restoreEnv = withNoEnvKey();
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } }],
    calls
  );
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      meta: { gameType: "endless-runner", assetKit: { name: "City Runner Kit", description: "desc" } },
      improvements: ["visual", "gameplay"],
      customText: "Make the game faster and add two new obstacles.",
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, true);
    assert.equal(calls.length, 1);
    var sentMessages = JSON.parse(calls[0].opts.body).messages;
    var userMessage = sentMessages[1].content;

    assert.match(userMessage, /CURRENT GAME:/);
    assert.match(userMessage, /ORIGINAL USER IDEA:\nFruit tapping game/);
    assert.match(userMessage, /IMPROVEMENT REQUEST:/);
    assert.match(userMessage, /Visual Quality/);
    assert.match(userMessage, /Gameplay/);
    assert.match(userMessage, /USER CUSTOM REQUEST:\nMake the game faster and add two new obstacles\./);
    assert.match(userMessage, /RULES:/);
    assert.match(userMessage, /Preserve the core game concept/);
    // Mevcut oyunun GERÇEK HTML'i de (MEVCUT HTML: bloğu) mesajın içinde.
    assert.match(userMessage, /MEVCUT HTML:\n<html><body><h1>Fruit Tapper<\/h1>/);
    // gameType context'i de gerçekten iletiliyor.
    assert.match(userMessage, /Game type \(detected\): endless-runner/);
    assert.match(userMessage, /City Runner Kit/);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 4) DO NOT REPLACE THE GAME CONCEPT — sadece seçilen improvement açıklaması
//    isteğe eklenir, seçilmeyenler eklenmez.
// -----------------------------------------------------------------------
test("/api/improve: SADECE seçilen improvement seçenekleri isteğe eklenir, seçilmeyenler eklenmez", async function () {
  var restoreEnv = withNoEnvKey();
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } }],
    calls
  );
  var ctx = await startServer();
  try {
    await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["challenge"],
      apiKey: FAKE_USER_KEY,
    });
    var userMessage = JSON.parse(calls[0].opts.body).messages[1].content;
    assert.match(userMessage, /Increase Challenge/);
    assert.doesNotMatch(userMessage, /Visual Quality/);
    assert.doesNotMatch(userMessage, /Add Effects/);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 5) Geçersiz/bilinmeyen improvement anahtarları SESSİZCE yoksayılır (çökmez)
// -----------------------------------------------------------------------
test("/api/improve: bilinmeyen improvement anahtarları yoksayılır, çökmez", async function () {
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["not-a-real-key", "__proto__"],
      customText: "still works",
    });
    assert.equal(res.status, 200);
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 6) Seçili model korunuyor (md.5/md.9 test senaryosu)
// -----------------------------------------------------------------------
test("/api/improve: seçili model (Generate ile AYNI resolveRequestedModelFromCache) korunur ve OpenRouter'a GERÇEKTEN o model gönderilir", async function () {
  var restoreEnv = withNoEnvKey();
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [
      { match: /openrouter\.ai\/api\/v1\/models$/, respond: function () { return { ok: true, json: async function () { return { data: [{ id: "openai/gpt-4o-mini", name: "OpenAI: GPT-4o mini", architecture: { input_modalities: ["text"], output_modalities: ["text"] } }] }; } }; } },
      { match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } },
    ],
    calls
  );
  var modelsRouter = require("../routes/models");
  var app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", modelsRouter);
  app.use("/api", improveRouter);
  var server = app.listen(0);
  var port = server.address().port;
  try {
    // Önce katalog önbelleğe alınsın (resolveRequestedModelFromCache canlı
    // kataloğa karşı doğrulayabilsin diye) — routes/generate.js'teki AYNI
    // ön koşul.
    await new Promise(function (resolve) {
      http.get({ hostname: "localhost", port: port, path: "/api/models" }, function (res) {
        res.on("data", function () {});
        res.on("end", resolve);
      });
    });

    var res = await postJson(port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["visual"],
      model: "openai/gpt-4o-mini",
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 200);
    var chatCall = calls.filter(function (c) { return /chat\/completions$/.test(c.url); })[0];
    assert.equal(JSON.parse(chatCall.opts.body).model, "openai/gpt-4o-mini");
    assert.equal(res.body.model, "openai/gpt-4o-mini");
  } finally {
    server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 7) BYOK key doğru şekilde iletiliyor
// -----------------------------------------------------------------------
test("/api/improve: kullanıcının BYOK apiKey'i ENV key olmasa bile GERÇEKTEN kullanılır", async function () {
  var restoreEnv = withNoEnvKey();
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } }],
    calls
  );
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
    assert.equal(calls[0].opts.headers.Authorization, "Bearer " + FAKE_USER_KEY);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_USER_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 8) ENV key fallback'i (apiKey verilmezse) çalışıyor
// -----------------------------------------------------------------------
test("/api/improve: apiKey hiç gönderilmezse, ALLOW_SERVER_API_KEY=true İKEN mevcut ENV key fallback'i çalışır", async function () {
  var restoreEnv = withFakeEnvKey();
  var restoreFlag = withAllowServerKey("true");
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } }],
    calls
  );
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["visual"],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, true);
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
// 9) Ne ENV ne BYOK key varsa -> mock, mevcut oyun (html) AYNEN geri döner
// -----------------------------------------------------------------------
test("/api/improve: hiçbir key yoksa mock modda kalır, GERÇEK bir AI çağrısı yapmaz, mevcut html AYNEN döner", async function () {
  var restoreEnv = withNoEnvKey();
  var calls = [];
  var restoreFetch = stubFetchByUrl([], calls);
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["visual"],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, false);
    assert.equal(res.body.html, SAMPLE_HTML);
    assert.equal(calls.length, 0);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 10) Validation AYNI pipeline'dan geçiyor — kritik fail varsa valid:false
//     döner (md.10 Quality Guard) — mevcut oyunu korumak FRONTEND'in işi
//     (applyNewResult'a hiç girmemek, bkz. app.js), ama server'ın valid:false
//     BİLDİRMESİ bunun ön koşulu.
// -----------------------------------------------------------------------
test("/api/improve: AI kritik bir HTML/JS hatası üretirse validation.valid=false döner (Quality Guard'ın ön koşulu)", async function () {
  var restoreEnv = withNoEnvKey();
  var restoreFetch = stubFetchByUrl(
    [
      {
        match: /chat\/completions$/,
        respond: function () {
          // has-js / valid-html gibi kritik kontrolleri fail ettirecek,
          // bilerek bozuk/eksik bir HTML.
          return fakeChatCompletionResponse("<html><body>no script tag at all</body></html>");
        },
      },
    ],
    []
  );
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["visual"],
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.applied, true); // AI GERÇEKTEN çağrıldı
    assert.equal(res.body.validation.valid, false); // ama çıktı geçersiz
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 11) OpenRouter isteği başarısız olursa (401/429/500 vb.) 500 döner ve
//     GÜVENLİK: hiçbir key değeri response'a sızmaz.
// -----------------------------------------------------------------------
test("/api/improve: OpenRouter isteği başarısız olursa 500 döner, hiçbir key değeri response'a sızmaz", async function () {
  var restoreEnv = withNoEnvKey();
  // NOT: gerçek OpenRouter, gönderilen key'i hata gövdesinde ASLA yankılamaz
  // (jenerik "Invalid API key" döner) — bu test o gerçekçi davranışı taklit
  // eder. Asıl güvenlik garantisi zaten routes/*.js'in KENDİSİNİN
  // selectedApiKey/process.env.OPENROUTER_API_KEY'i hiçbir throw/response'a
  // ASLA interpolate etmemesidir (bkz. improve.js/generate.js catch blokları).
  var restoreFetch = stubFetchByUrl(
    [
      {
        match: /chat\/completions$/,
        respond: function () {
          return { ok: false, status: 401, text: async function () { return "Invalid API key provided."; } };
        },
      },
    ],
    []
  );
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Fruit tapping game",
      improvements: ["visual"],
      apiKey: FAKE_USER_KEY,
    });
    assert.equal(res.status, 500);
    assert.equal(JSON.stringify(res.body).indexOf(FAKE_USER_KEY), -1);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 12) html alanı yoksa/tipı yanlışsa 400 (mevcut sözleşme, regresyon yok)
// -----------------------------------------------------------------------
test("/api/improve: html alanı yoksa 400 döner", async function () {
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", { prompt: "x", improvements: ["visual"] });
    assert.equal(res.status, 400);
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 13) gameSpec (TopDown Runtime context) verildiğinde mesaja dahil ediliyor
// -----------------------------------------------------------------------
test("/api/improve: pipeline=topdown-runtime + gameSpec verildiğinde yapılandırılmış spec JSON'ı AI mesajına dahil edilir", async function () {
  var restoreEnv = withNoEnvKey();
  var calls = [];
  var restoreFetch = stubFetchByUrl(
    [{ match: /chat\/completions$/, respond: function () { return fakeChatCompletionResponse(); } }],
    calls
  );
  var ctx = await startServer();
  try {
    await postJson(ctx.port, "/api/improve", {
      html: SAMPLE_HTML,
      prompt: "Top down dungeon crawler",
      meta: { pipeline: "topdown-runtime", gameSpec: { world: { width: 800, height: 600 }, difficulty: "normal" } },
      improvements: ["content"],
      apiKey: FAKE_USER_KEY,
    });
    var userMessage = JSON.parse(calls[0].opts.body).messages[1].content;
    assert.match(userMessage, /Structured game spec/);
    assert.match(userMessage, /"difficulty":"normal"/);
  } finally {
    ctx.server.close();
    restoreFetch();
    restoreEnv();
  }
});

// -----------------------------------------------------------------------
// 14) improvements/customText hiç yoksa ama eski instruction alanı da
//     boşsa 400 (empty-string instruction eski davranışla AYNI şekilde
//     reddediliyor).
// -----------------------------------------------------------------------
test("/api/improve: boş/whitespace-only instruction ve improvements/customText de yoksa 400 döner", async function () {
  var ctx = await startServer();
  try {
    var res = await postJson(ctx.port, "/api/improve", { html: SAMPLE_HTML, prompt: "x", instruction: "   " });
    assert.equal(res.status, 400);
  } finally {
    ctx.server.close();
  }
});
