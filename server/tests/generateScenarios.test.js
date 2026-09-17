/**
 * PHASE 5 — REQUIREMENTS #11'deki 5 minimum test senaryosu (A-E), doğrudan
 * gerçek /api/generate route'u (mock modda) üzerinden, uçtan uca.
 *
 * A) Forest Platformer  B) Endless Runner  C) Space Shooter
 * D) Fruit Puzzle        E) Unknown/eşleşmeyen prompt (safe fallback)
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const generateRouter = require("../routes/generate");
const { ASSET_MANIFEST } = require("../config/assetManifest");

var KNOWN_PATHS = {};
ASSET_MANIFEST.forEach(function (a) { KNOWN_PATHS[a.path] = true; });

function extractAssetPaths(html) {
  var re = /\/assets\/[A-Za-z0-9_\-\/.]+\.(?:svg|png|jpg|jpeg|gif|webp)/g;
  return html.match(re) || [];
}

function startTestServer() {
  var previousKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY; // mock moda zorla
  var app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", generateRouter);
  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({
        server: server,
        port: server.address().port,
        restore: function () { if (previousKey !== undefined) process.env.OPENROUTER_API_KEY = previousKey; },
      });
    });
  });
}

function postJson(port, body) {
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify(body);
    var req = http.request(
      {
        hostname: "localhost", port: port, path: "/api/generate", method: "POST",
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

function assertRealAssetsOnly(html) {
  var paths = extractAssetPaths(html);
  paths.forEach(function (p) {
    assert.ok(KNOWN_PATHS[p], "manifestte olmayan/uydurulmuş path -> " + p);
  });
  return paths;
}

// ROUND L — bu fonksiyon HEM eski genel tap-grid şablonunun (buildMockGameHtml
// — hâlâ DEĞİŞMEDİ, D/E senaryoları hâlâ buraya düşüyor) HEM YENİ mekanik-özel
// şablonların (mockGameplayTemplates.js — A/B/C artık buraya düşüyor) ortak,
// GERÇEKTEN paylaştığı asgari sözleşmeyi doğrular. "timer-bar" id'si SADECE
// eski genel şablonun kendi iç implementasyon detayıydı (bir countdown-bar
// div'i) — yeni mekanik şablonların HİÇBİRİ bunu kullanmıyor (bazılarının
// hiç zamanlayıcısı yok, ör. memory/math/dungeon skor+ilerleme tabanlı) —
// bu yüzden BİLEREK genel kontrolden ÇIKARILDI, iki grubun da GERÇEKTEN
// sağladığı garantiler (etkileşim + skor + kazan/kaybet + güvenlik) kaldı.
function assertPlayableBasics(html) {
  assert.match(html, /addEventListener\(.click.|addEventListener\(.keydown./);
  assert.match(html, /Score:|Destroyed:|Moves:/);
  assert.match(html, /You Win!/);
  assert.match(html, /Game Over/);
  assert.match(html, /Play Again/);
  // Güvenlik (REQUIREMENTS #10) — bkz. validation checks no-storage/
  // no-external-resources zaten bunu kritik olarak kontrol ediyor, burada
  // ayrıca ham HTML üzerinde de doğrudan doğrulanıyor.
  assert.doesNotMatch(html, /localStorage|sessionStorage/i);
  assert.doesNotMatch(html, /(src|href)\s*=\s*["']https?:\/\//i);
}

// ---- A) Forest Platformer ----
// ROUND 14: forest-platformer artık Selin'in kendi sağladığı, CC0 lisanslı
// "SunnyLand Forest" pack'ini (Luis Zuno "Ansimuz") kullanıyor — bkz.
// assetKits.js/assetManifest.js. Eski flat-primitive SVG'ler (background_forest,
// platform.svg, star.svg, rock.svg, tree.svg, sparkle.svg) bu kitten çıkarıldı;
// "platform" rolü pack'te hazır tek-parça bir tile PNG'si olmadığı için
// dürüstçe null (bkz. assetKits.js missingRoles) — bu yüzden bu senaryoda
// artık bir platform asseti BEKLENMİYOR.
test("A) Forest Platformer prompt -> gameType doğru, SunnyLand forest background + character + collectible + obstacle/enemy + effect + playable HTML", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, {
      prompt: "Create a 5-second platform jumping game set in a forest. A character jumps across platforms and collects stars.",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameType, "forest-platformer");
    assert.equal(res.body.meta.assetKit.key, "forest-platformer");

    var html = res.body.html;
    var paths = assertRealAssetsOnly(html);
    assert.ok(
      paths.some(function (p) { return p.indexOf("/packs/sunnyland-forest/backgrounds/") !== -1; }),
      "SunnyLand forest background eksik"
    );
    assert.ok(
      paths.some(function (p) { return p.indexOf("/packs/sunnyland-forest/characters/player.png") !== -1; }),
      "SunnyLand character sprite eksik"
    );
    assert.ok(
      paths.some(function (p) {
        return /\/packs\/sunnyland-forest\/objects\/(star|carrot|chest)\.png/.test(p);
      }),
      "SunnyLand collectible eksik"
    );
    assert.ok(
      paths.some(function (p) {
        return /\/packs\/sunnyland-forest\/(objects\/(rock|tree)|enemies\/(bee|piranha-plant|slug))\.png/.test(p);
      }),
      "SunnyLand obstacle/enemy eksik"
    );
    assert.ok(
      paths.some(function (p) { return p.indexOf("/packs/sunnyland-forest/effects/enemy-death.png") !== -1; }),
      "SunnyLand effect eksik"
    );
    assertPlayableBasics(html);
    assert.equal(res.body.validation.valid, true);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

// ---- B) Endless Runner ----
test("B) Endless Runner prompt -> runner/player, obstacle, collectible, playable game (background bilerek yok — kürüte edilmiş kitte gerçek şehir asseti yok)", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, {
      prompt: "Create an endless runner game in a city. The player dashes down the street avoiding barriers and collecting coins.",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameType, "endless-runner");

    var html = res.body.html;
    var paths = assertRealAssetsOnly(html);
    assert.ok(paths.some(function (p) { return p.indexOf("hero_generic") !== -1; }), "runner/player eksik");
    assert.ok(paths.some(function (p) { return p.indexOf("rock.svg") !== -1; }), "obstacle eksik");
    assert.ok(paths.some(function (p) { return p.indexOf("coin_gold.svg") !== -1; }), "collectible eksik");
    assertPlayableBasics(html);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

// ---- C) Space Shooter ----
test("C) Space Shooter prompt -> player alanı, enemy/object, background, effect, playable game", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, {
      prompt: "Create a 5-second space shooter game with a spaceship shooting asteroids and aliens.",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameType, "space-shooter");

    var html = res.body.html;
    var paths = assertRealAssetsOnly(html);
    // ROUND 16: space-shooter artık Kenney Space Shooter (Remastered) pack'ini
    // kullanıyor — eski flat-primitive background_space/red_enemy/explosion.svg
    // bu kitte artık yok (bkz. assetKits.js, assetManifest.js).
    assert.ok(
      paths.some(function (p) { return p.indexOf("/packs/kenney-space-shooter/characters/") !== -1; }),
      "player gemi eksik"
    );
    assert.ok(
      paths.some(function (p) { return p.indexOf("/packs/kenney-space-shooter/backgrounds/") !== -1; }),
      "space background eksik"
    );
    assert.ok(
      paths.some(function (p) {
        return /\/packs\/kenney-space-shooter\/enemies\/(enemy-(red|blue|green|heavy|ufo))\.png/.test(p);
      }),
      "enemy/object eksik"
    );
    assert.ok(
      paths.some(function (p) { return p.indexOf("/packs/kenney-space-shooter/effects/") !== -1; }),
      "effect eksik"
    );
    assertPlayableBasics(html);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

// ---- D) Fruit Puzzle ----
test("D) Fruit Puzzle prompt -> gerçek fruit assetleri, basket/container, doğru interaction, playable game", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, { prompt: "Match the correct fruit to the basket before time runs out." });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameType, "fruit-puzzle");

    var html = res.body.html;
    var paths = assertRealAssetsOnly(html);
    assert.ok(
      paths.some(function (p) { return /\/objects\/(apple|banana|orange|strawberry|carrot|broccoli|tomato|corn|grapes|potato)\.svg/.test(p); }),
      "gerçek fruit asseti eksik"
    );
    assert.ok(paths.some(function (p) { return /basket_(red|green)\.svg/.test(p); }), "basket/container asseti eksik");
    assertPlayableBasics(html);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

// ---- E) Unknown / eşleşmeyen prompt ----
test("E) Unknown prompt -> safe fallback, uydurma path/emoji yok, external resource yok, yine de playable", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, { prompt: "Something completely unrelated with no game keywords whatsoever." });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameType, null);
    assert.equal(res.body.meta.assetKit, null);
    assert.equal(res.body.meta.mockAssetSource, "fallback");

    var html = res.body.html;
    assertRealAssetsOnly(html); // hiçbir uydurma path yok
    assert.doesNotMatch(html, /[\u{1F300}-\u{1FAFF}]/u, "emoji tabanlı görsel kullanılmamalı"); // emoji Unicode aralığı
    assertPlayableBasics(html);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});
