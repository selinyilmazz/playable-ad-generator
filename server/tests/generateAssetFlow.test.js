/**
 * PHASE 3B regression tests — kit-daraltılmış asset context artık gerçek
 * generate akışına bağlı (bkz. server/services/openrouter.js
 * resolveAssetContextForGameType, server/routes/generate.js).
 *
 * (a) Forest prompt -> forest kit context
 * (b) Space prompt -> space kit context
 * (c) Belirsiz prompt -> tam manifestlik fallback
 * (d) Kit context'inde kit dışı assetlerin bulunmadığının doğrulanması
 * (e) meta.gameType'ın uçtan uca doğru dönmesi (route seviyesinde, mock modda)
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const { resolveAssetContextForGameType } = require("../services/openrouter");
const { detectGameType } = require("../services/gameTypeDetection");
const { ASSET_MANIFEST } = require("../config/assetManifest");
const generateRouter = require("../routes/generate");

var FOREST_PROMPT =
  "Create a 5-second platform jumping game set in a forest. A character jumps across a series of platforms.";
var SPACE_PROMPT =
  "Create a 5-second space shooter game with a spaceship and asteroids to shoot.";
var AMBIGUOUS_PROMPT = "Make a fun little game about numbers and colors.";

// ---- (a) Forest prompt -> forest kit context ----

test("(a) Forest prompt -> resolveAssetContextForGameType forest-platformer kitinin context'ini döner", function () {
  var detected = detectGameType(FOREST_PROMPT);
  assert.equal(detected.gameType, "forest-platformer");

  var ctx = resolveAssetContextForGameType(detected.gameType);
  assert.ok(ctx);
  assert.match(ctx, /AVAILABLE GAME ASSETS FOR THIS GAME TYPE \(Forest Platformer\)/);
  // ROUND 14: forest-platformer artık SunnyLand Forest pack'ini kullanıyor
  // (bkz. assetKits.js) — eski flat-primitive background_forest/platform bu
  // kitte artık yok; platform rolü dürüstçe null olduğu için context'te hiç
  // satır olarak görünmüyor (bkz. assetContext.js buildAssetContextMessageForKit).
  assert.match(ctx, /sunnyland_background_forest/);
  assert.match(ctx, /- player: sunnyland_player -> \/assets\/packs\/sunnyland-forest\/characters\/player\.png/);
  assert.doesNotMatch(ctx, /- platform:/);
});

// ---- (b) Space prompt -> space kit context ----

test("(b) Space prompt -> resolveAssetContextForGameType space-shooter kitinin context'ini döner", function () {
  var detected = detectGameType(SPACE_PROMPT);
  assert.equal(detected.gameType, "space-shooter");

  var ctx = resolveAssetContextForGameType(detected.gameType);
  assert.ok(ctx);
  assert.match(ctx, /AVAILABLE GAME ASSETS FOR THIS GAME TYPE \(Space Shooter\)/);
  // ROUND 16: space-shooter artık Kenney Space Shooter (Remastered) pack'ini
  // kullanıyor (bkz. assetKits.js) — eski flat-primitive background_space/
  // fireball bu kitte artık yok.
  assert.match(ctx, /spaceshooter_background_deep/);
  assert.match(ctx, /- player: spaceshooter_player_falcon -> \/assets\/packs\/kenney-space-shooter\/characters\/player-falcon\.png/);
  assert.match(ctx, /spaceshooter_laser_blue/);
});

// ---- (c) Belirsiz prompt -> tam manifestlik fallback ----

test("(c) Belirsiz/eşleşmeyen prompt -> resolveAssetContextForGameType(null) mevcut TAM manifest listesine düşer", function () {
  var detected = detectGameType(AMBIGUOUS_PROMPT);
  assert.equal(detected.gameType, null);

  var ctx = resolveAssetContextForGameType(detected.gameType);
  assert.ok(ctx);
  // Fallback -> buildAssetContextMessage() formatı: "AVAILABLE GAME ASSETS:" (kit başlığı YOK)
  assert.match(ctx, /^Use available game assets.*\n\nAVAILABLE GAME ASSETS:\n/s);
  ASSET_MANIFEST.forEach(function (a) {
    assert.ok(ctx.indexOf("- " + a.id) !== -1, "fallback context'te eksik asset: " + a.id);
  });
});

// ---- (d) Kit context'inde kit dışı asset bulunmaması ----

test("(d) forest-platformer context'inde space-shooter'a özel assetler YOK (coin_gold, background_space, fireball, explosion)", function () {
  var ctx = resolveAssetContextForGameType("forest-platformer");
  ["background_space", "fireball", "explosion", "red_enemy"].forEach(function (id) {
    assert.equal(ctx.indexOf(id), -1, "forest-platformer context'inde OLMAMASI gereken asset bulundu: " + id);
  });
});

test("(d) space-shooter context'inde forest/endless-runner'a özel assetler YOK (background_forest, tree, coin_gold, hero_generic)", function () {
  var ctx = resolveAssetContextForGameType("space-shooter");
  ["background_forest", "tree", "coin_gold", "hero_generic"].forEach(function (id) {
    assert.equal(ctx.indexOf(id), -1, "space-shooter context'inde OLMAMASI gereken asset bulundu: " + id);
  });
});

test("(d) fruit-puzzle context'inde diğer 3 kite özel assetler YOK", function () {
  var ctx = resolveAssetContextForGameType("fruit-puzzle");
  ["background_forest", "background_space", "platform", "rock", "fireball", "hero_generic"].forEach(function (id) {
    assert.equal(ctx.indexOf(id), -1, "fruit-puzzle context'inde OLMAMASI gereken asset bulundu: " + id);
  });
});

// ---- (e) meta.gameType uçtan uca doğru dönüyor (route seviyesinde, mock modda) ----

function startTestServer() {
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

function postJson(port, body) {
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify(body);
    var req = http.request(
      {
        hostname: "localhost",
        port: port,
        path: "/api/generate",
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

test("(e) /api/generate: forest prompt -> meta.gameType === 'forest-platformer'", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, { prompt: FOREST_PROMPT });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameType, "forest-platformer");
    assert.equal(res.body.meta.assetKit.key, "forest-platformer");
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});

test("(e) /api/generate: belirsiz prompt -> meta.gameType === null, assetKit === null, yanıt yine de tam (fallback bozulmuyor)", async function () {
  var ctx = await startTestServer();
  try {
    var res = await postJson(ctx.port, { prompt: AMBIGUOUS_PROMPT });
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.gameType, null);
    assert.equal(res.body.meta.assetKit, null);
    assert.equal(typeof res.body.html, "string");
    assert.ok(res.body.html.length > 0);
  } finally {
    ctx.restore();
    ctx.server.close();
  }
});
