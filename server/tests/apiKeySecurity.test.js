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

test("resolveEffectiveApiKey: apiKeyOverride varsa, ALLOW_SERVER_API_KEY/env key durumundan BAĞIMSIZ olarak HER ZAMAN o kullanılır", function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  try {
    assert.equal(resolveEffectiveApiKey(FAKE_USER_KEY), FAKE_USER_KEY);
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey: override yok + ALLOW_SERVER_API_KEY tanımsız (production varsayılanı) -> null, env key GÖRMEZDEN gelinir", function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  try {
    assert.equal(resolveEffectiveApiKey(null), null);
    assert.equal(resolveEffectiveApiKey(undefined), null);
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey: override yok + ALLOW_SERVER_API_KEY='false' -> null, env key GÖRMEZDEN gelinir", function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "false");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  try {
    assert.equal(resolveEffectiveApiKey(null), null);
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey: override boş string (\"\") -> yok sayılır (falsy), flag true olmadıkça server key kullanılmaz", function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", undefined);
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  try {
    assert.equal(resolveEffectiveApiKey(""), null);
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey: override yok + ALLOW_SERVER_API_KEY='true' + env key VAR -> env key döner (bilinçli local-dev opt-in)", function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "true");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", FAKE_ENV_KEY);
  try {
    assert.equal(resolveEffectiveApiKey(null), FAKE_ENV_KEY);
    assert.equal(resolveEffectiveApiKey(""), FAKE_ENV_KEY);
  } finally {
    restoreFlag();
    restoreEnv();
  }
});

test("resolveEffectiveApiKey: override yok + ALLOW_SERVER_API_KEY='true' + env key YOK -> falsy (undefined) döner, uydurma bir key İCAT edilmez", function () {
  var restoreFlag = withEnvVar("ALLOW_SERVER_API_KEY", "true");
  var restoreEnv = withEnvVar("OPENROUTER_API_KEY", undefined);
  try {
    assert.ok(!resolveEffectiveApiKey(null));
  } finally {
    restoreFlag();
    restoreEnv();
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
