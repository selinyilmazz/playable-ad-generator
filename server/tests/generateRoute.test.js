/**
 * PHASE 3A tests — /api/generate uçtan uca (mock modda) smoke test.
 *
 * Amaç: routes/generate.js'e eklenen additive meta.gameType/meta.assetKit
 * alanlarının GERÇEKTEN HTTP yanıtına ulaştığını, ve mevcut alanların
 * (html, validation, meta.mock/model/finishReason/assetRetryApplied)
 * KIRILMADIĞINI doğrulamak. server/index.js'e dokunulmuyor — aynı
 * generateRouter'ı ayrı, minimal bir Express app'e mount edip gerçek bir
 * HTTP isteği atıyoruz (yeni bir test dependency'si — supertest vb. —
 * EKLENMEDİ, sadece Node'un yerleşik http modülü kullanıldı).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const generateRouter = require("../routes/generate");

function startTestServer() {
  // Mock moda ZORLAMAK için: gerçek bir OPENROUTER_API_KEY varsa bile bu
  // testler için geçici olarak kaldırılıyor (process.env üzerinde, sadece
  // bu process'in ömrü boyunca — .env dosyasına dokunulmuyor).
  var previousKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;

  var app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", generateRouter);

  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({
        server: server,
        port: server.address().port,
        restore: function () {
          if (previousKey !== undefined) process.env.OPENROUTER_API_KEY = previousKey;
        },
      });
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
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

test("/api/generate (mock modda): mevcut alanlar korunuyor + yeni gameType/assetKit alanları ekleniyor", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(
      ctx.port,
      "/api/generate",
      { prompt: "Create a 5-second space shooter game with asteroids." }
    );

    assert.equal(res.status, 200);

    // Mevcut sözleşme (Phase 2 ve öncesi) — HİÇ değişmedi:
    assert.equal(typeof res.body.html, "string");
    assert.equal(typeof res.body.validation, "object");
    assert.equal(typeof res.body.validation.score, "number");
    assert.ok(Array.isArray(res.body.validation.checks));
    assert.equal(res.body.meta.mock, true); // key yok -> mock mod
    assert.equal(res.body.meta.model, null);
    assert.equal(res.body.meta.assetRetryApplied, false);

    // PHASE 3A additive alanlar:
    assert.ok("gameType" in res.body.meta);
    assert.ok("assetKit" in res.body.meta);
    assert.equal(res.body.meta.gameType, "space-shooter");
    assert.equal(res.body.meta.assetKit.key, "space-shooter");
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("/api/generate (mock modda): eşleşmeyen bir prompt için gameType null, assetKit null", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", { prompt: "Just a random idea with no clear type." });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameType, null);
    assert.equal(res.body.meta.assetKit, null);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("/api/generate: boş prompt hâlâ 400 döner (mevcut davranış değişmedi)", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, "/api/generate", { prompt: "" });
    assert.equal(res.status, 400);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});
