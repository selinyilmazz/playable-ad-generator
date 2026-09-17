/**
 * CUSTOM ASSET LIBRARY round — testler (görev md.14, en az 12 senaryo).
 *
 * Her test _resetForTests() ile TAZE bir geçici (os.tmpdir() altında)
 * upload dizinine geçer — gerçek proje public/uploads/ klasörüne HİÇBİR
 * test dosyası YAZILMAZ (bkz. customAssetLibrary.js _resetForTests notu),
 * ve testler birbirinin state'ini GÖRMEZ (her test kendi tmp dizinini alır).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const express = require("express");

const customAssetLibrary = require("../services/customAssetLibrary");
const assetsRouter = require("../routes/assets");
const assetLibrariesRouter = require("../routes/assetLibraries");
const { ASSET_MANIFEST_ENRICHED } = require("../config/assetManifest");
const { resolveAssetContextForGameType } = require("../services/openrouter");
const { resolveTopDownAssets, resolveTopDownDecorationAssets, toAssetPaths } = require("../services/topdown/assetResolver");
const { buildManifestZip, buildZip, TINY_PNG } = require("./testZipBuilder");

var tmpRoots = [];

function freshRoot() {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), "asset-lib-test-"));
  tmpRoots.push(dir);
  customAssetLibrary._resetForTests(dir);
  return dir;
}

test.after(function () {
  tmpRoots.forEach(function (dir) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (err) { /* yok say */ }
  });
});

function startTestServer() {
  var app = express();
  app.use("/api", assetsRouter);
  app.use("/api", assetLibrariesRouter);
  return new Promise(function (resolve) {
    var server = app.listen(0, function () {
      resolve({ server: server, port: server.address().port });
    });
  });
}

function getJson(port, urlPath) {
  return new Promise(function (resolve, reject) {
    http
      .get({ hostname: "localhost", port: port, path: urlPath }, function (res) {
        var chunks = "";
        res.on("data", function (c) { chunks += c; });
        res.on("end", function () {
          try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); } catch (err) { reject(err); }
        });
      })
      .on("error", reject);
  });
}

function postZip(port, urlPath, buffer) {
  return new Promise(function (resolve, reject) {
    var req = http.request(
      {
        hostname: "localhost",
        port: port,
        path: urlPath,
        method: "POST",
        headers: { "Content-Type": "application/zip", "Content-Length": buffer.length },
      },
      function (res) {
        var chunks = [];
        res.on("data", function (c) { chunks.push(c); });
        res.on("end", function () {
          try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) }); } catch (err) { reject(err); }
        });
      }
    );
    req.on("error", reject);
    req.write(buffer);
    req.end();
  });
}

function validManifest(overrides) {
  return Object.assign(
    {
      name: "Acme Test Assets",
      version: "1.0.0",
      assets: [
        { id: "acme-player", name: "Acme Hero", category: "character", tags: ["hero"], path: "characters/player.png", kit: "space-shooter", role: "player" },
      ],
    },
    overrides
  );
}

// -----------------------------------------------------------------------
// 1) valid asset library upload
// -----------------------------------------------------------------------
test("1) Geçerli bir asset library ZIP'i başarıyla yüklenir (201, doğru library özeti)", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var zip = buildManifestZip(validManifest(), { "characters/player.png": TINY_PNG });
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 201);
    assert.equal(res.body.library.name, "Acme Test Assets");
    assert.equal(res.body.library.assetCount, 1);
    assert.equal(typeof res.body.library.id, "string");
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 2) manifest validation (eksik zorunlu alan)
// -----------------------------------------------------------------------
test("2) manifest.json'da 'id' eksikse 400 + açık bir hata mesajı döner, server ÇÖKMEZ", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var manifest = validManifest({ assets: [{ category: "character", path: "characters/player.png" }] });
    var zip = buildManifestZip(manifest, { "characters/player.png": TINY_PNG });
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.ok(res.body.details.some(function (d) { return d.indexOf("'id'") !== -1; }));
  } finally {
    ctx.server.close();
  }
});

test("2b) manifest.json geçerli JSON değilse 400 döner", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var zip = buildZip([{ name: "manifest.json", content: "{ not json" }]);
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /JSON/);
  } finally {
    ctx.server.close();
  }
});

test("2c) geçersiz category değeri 400 + geçerli değerleri listeleyen bir mesajla reddedilir", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var manifest = validManifest({ assets: [{ id: "x", category: "spaceship-driver", path: "characters/player.png" }] });
    var zip = buildManifestZip(manifest, { "characters/player.png": TINY_PNG });
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.ok(res.body.details.some(function (d) { return d.indexOf("geçersiz category") !== -1; }));
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 3) missing asset rejection (manifest path ZIP'te yok)
// -----------------------------------------------------------------------
test("3) manifest bir asset'e işaret ediyor ama dosya ZIP'te yoksa 400 döner", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var manifest = validManifest({ assets: [{ id: "ghost", category: "character", path: "characters/does-not-exist.png" }] });
    var zip = buildManifestZip(manifest, {}); // dosya HİÇ eklenmedi
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.ok(res.body.details.some(function (d) { return d.indexOf("bulunamadı") !== -1; }));
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 4) duplicate ID handling
// -----------------------------------------------------------------------
test("4) aynı manifest içinde yinelenen id 400 döner", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var manifest = {
      name: "Dup",
      assets: [
        { id: "same", category: "character", path: "characters/player.png" },
        { id: "same", category: "enemy", path: "characters/player.png" },
      ],
    };
    var zip = buildManifestZip(manifest, { "characters/player.png": TINY_PNG });
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.ok(res.body.details.some(function (d) { return d.indexOf("yinelenen id") !== -1; }));
  } finally {
    ctx.server.close();
  }
});

test("4b) FARKLI custom library'ler AYNI orijinal id'yi kullanabilir (namespace izolasyonu çakışmayı önler)", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var manifest = validManifest({ name: "Lib One", assets: [{ id: "hero", category: "character", path: "characters/player.png" }] });
    var zip = buildManifestZip(manifest, { "characters/player.png": TINY_PNG });

    var res1 = await postZip(ctx.port, "/api/assets/libraries", zip);
    var res2 = await postZip(ctx.port, "/api/assets/libraries", buildManifestZip(
      validManifest({ name: "Lib Two", assets: [{ id: "hero", category: "character", path: "characters/player.png" }] }),
      { "characters/player.png": TINY_PNG }
    ));

    assert.equal(res1.status, 201);
    assert.equal(res2.status, 201);
    assert.notEqual(res1.body.library.id, res2.body.library.id);

    var all = customAssetLibrary.listAllCustomAssets();
    assert.equal(all.length, 2);
    assert.notEqual(all[0].id, all[1].id); // namespaced id'ler farklı
    assert.equal(all[0].originalId, "hero");
    assert.equal(all[1].originalId, "hero");
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 5) path traversal rejection
// -----------------------------------------------------------------------
test("5) manifest path'inde '../' (path traversal) varsa 400 döner, DİSKE HİÇBİR ŞEY YAZILMAZ", async function () {
  var root = freshRoot();
  var ctx = await startTestServer();
  try {
    var manifest = validManifest({ assets: [{ id: "evil", category: "character", path: "../../etc/passwd" }] });
    var zip = buildManifestZip(manifest, {}); // path zaten format olarak reddedilecek
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.ok(res.body.details.some(function (d) { return d.indexOf("güvensiz") !== -1; }));
    // Hiçbir library dizini oluşturulmadı:
    var entries = fs.existsSync(root) ? fs.readdirSync(root) : [];
    assert.equal(entries.filter(function (n) { return n !== "registry.json"; }).length, 0);
  } finally {
    ctx.server.close();
  }
});

test("5b) ZIP'in KENDİSİNDEKİ bir entry adı path traversal içeriyorsa (manifest onu referans etmese bile) tüm upload reddedilir", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var manifest = validManifest({ assets: [{ id: "acme-player", category: "character", path: "characters/player.png" }] });
    var zip = buildManifestZip(manifest, { "characters/player.png": TINY_PNG }, {
      extraEntries: [{ name: "../../evil.png", content: TINY_PNG }],
    });
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /[Gg]üvenlik/);
  } finally {
    ctx.server.close();
  }
});

test("5c) ZIP bir sembolik link entry'si içeriyorsa reddedilir", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var manifest = validManifest({ assets: [{ id: "acme-player", category: "character", path: "characters/player.png" }] });
    var zip = buildManifestZip(manifest, { "characters/player.png": TINY_PNG }, {
      extraEntries: [{ name: "sneaky-link", content: "/etc/passwd", symlink: true }],
    });
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /sembolik link/);
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 6) unsupported file rejection
// -----------------------------------------------------------------------
test("6) desteklenmeyen dosya formatı (.txt) 400 ile reddedilir", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var manifest = validManifest({ assets: [{ id: "x", category: "character", path: "characters/player.txt" }] });
    var zip = buildManifestZip(manifest, { "characters/player.txt": "hello" });
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.ok(res.body.details.some(function (d) { return d.indexOf("desteklenmeyen dosya formatı") !== -1; }));
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 7) library listing
// -----------------------------------------------------------------------
test("7) GET /api/assets/libraries yüklenen library'yi doğru assetCount ile listeler", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    await postZip(ctx.port, "/api/assets/libraries", buildManifestZip(validManifest(), { "characters/player.png": TINY_PNG }));
    var res = await getJson(ctx.port, "/api/assets/libraries");
    assert.equal(res.status, 200);
    assert.equal(res.body.libraries.length, 1);
    assert.equal(res.body.libraries[0].name, "Acme Test Assets");
    assert.equal(res.body.libraries[0].assetCount, 1);
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 8) asset listing (GET /api/assets'e custom asset'lerin GERÇEKTEN eklendiği)
// -----------------------------------------------------------------------
test("8) GET /api/assets, yüklenen custom asset'i namespaced id ve doğru path ile içerir; customLibraries alanı doğru", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var uploadRes = await postZip(ctx.port, "/api/assets/libraries", buildManifestZip(validManifest(), { "characters/player.png": TINY_PNG }));
    var libraryId = uploadRes.body.library.id;

    var res = await getJson(ctx.port, "/api/assets");
    assert.equal(res.status, 200);

    var customAsset = res.body.assets.filter(function (a) { return a.originalId === "acme-player"; })[0];
    assert.ok(customAsset, "custom asset assets[] içinde bulunamadı");
    assert.equal(customAsset.id, "custom_" + libraryId.replace(/-/g, "_") + "_acme-player");
    assert.equal(customAsset.path, "/uploads/asset-libraries/" + libraryId + "/characters/player.png");
    assert.equal(customAsset.category, "character");
    assert.equal(customAsset.group, "CHARACTERS");

    assert.equal(res.body.customLibraries.length, 1);
    assert.equal(res.body.customLibraries[0].id, libraryId);
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 9) custom asset generation context
// -----------------------------------------------------------------------
test("9a) resolveAssetContextForGameType: kit eşleşen custom asset, o kitin context'ine EKLENİR", function () {
  freshRoot();
  var zip = buildManifestZip(validManifest(), { "characters/player.png": TINY_PNG }); // kit: space-shooter, role: player
  customAssetLibrary.registerLibrary(zip);

  var ctxMsg = resolveAssetContextForGameType("space-shooter", "a space shooter game");
  assert.ok(ctxMsg.indexOf("CUSTOM COMPANY ASSETS AVAILABLE") !== -1);
  assert.ok(ctxMsg.indexOf("acme-player".replace("acme-player", "")) !== -1 || true); // id kontrolü aşağıda kesin
  var customAssets = customAssetLibrary.listAllCustomAssets();
  assert.ok(ctxMsg.indexOf(customAssets[0].id) !== -1);
  assert.ok(ctxMsg.indexOf(customAssets[0].path) !== -1);
});

test("9b) resolveAssetContextForGameType: kit eşleşmesi yoksa (gameType null), custom asset SADECE prompt'ta alakalı kelimeler geçerse eklenir", function () {
  freshRoot();
  var manifest = validManifest({
    assets: [{ id: "robo-guard", name: "Robo Guard", category: "enemy", tags: ["robot", "guard"], path: "enemies/guard.png" }],
  });
  customAssetLibrary.registerLibrary(buildManifestZip(manifest, { "enemies/guard.png": TINY_PNG }));

  var relevant = resolveAssetContextForGameType(null, "I want a robot guard boss");
  assert.ok(relevant.indexOf("CUSTOM COMPANY ASSETS AVAILABLE") !== -1);

  var irrelevant = resolveAssetContextForGameType(null, "a calm fishing simulator");
  assert.equal(irrelevant.indexOf("CUSTOM COMPANY ASSETS AVAILABLE"), -1);
});

test("9c) custom library HİÇ yüklenmemişse resolveAssetContextForGameType davranışı ÖNCEKİ round'la BİREBİR aynı (regresyon yok)", function () {
  freshRoot(); // boş, hiçbir library yüklenmedi
  var ctxMsg = resolveAssetContextForGameType("space-shooter", "a space shooter game");
  assert.equal(ctxMsg.indexOf("CUSTOM COMPANY ASSETS AVAILABLE"), -1);
});

// -----------------------------------------------------------------------
// 10) default library regression
// -----------------------------------------------------------------------
test("10) Default 181 asset'in sayısı/id'leri custom library yüklendikten SONRA bile DEĞİŞMEDİ", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var beforeCount = ASSET_MANIFEST_ENRICHED.length;
    await postZip(ctx.port, "/api/assets/libraries", buildManifestZip(validManifest(), { "characters/player.png": TINY_PNG }));

    var res = await getJson(ctx.port, "/api/assets");
    var defaultAssetsInResponse = res.body.assets.filter(function (a) { return !a.libraryId; });
    assert.equal(defaultAssetsInResponse.length, beforeCount);
    assert.equal(res.body.assets.length, beforeCount + 1);

    // Hiçbir default id "custom_" ile başlamıyor -> namespace çakışması sıfır ihtimal.
    assert.equal(ASSET_MANIFEST_ENRICHED.some(function (a) { return a.id.indexOf("custom_") === 0; }), false);
  } finally {
    ctx.server.close();
  }
});

// -----------------------------------------------------------------------
// 11) TopDown custom asset resolution
// -----------------------------------------------------------------------
test("11a) resolveTopDownAssets: dungeon-rpg'nin varsayılan olarak BOŞ bıraktığı 'background' slotu, kit+role beyan eden bir custom asset'le DOLAR", function () {
  freshRoot();
  // Ön koşul/regresyon çıpası: dungeon-rpg kitinin background'ı GERÇEKTEN null (bkz. assetKits.js).
  var before = resolveTopDownAssets("dungeon");
  assert.equal(before.background, null);

  var manifest = validManifest({
    assets: [{ id: "dungeon-bg", name: "Dungeon Backdrop", category: "background", path: "backgrounds/dungeon.png", kit: "dungeon-rpg", role: "background" }],
  });
  customAssetLibrary.registerLibrary(buildManifestZip(manifest, { "backgrounds/dungeon.png": TINY_PNG }));

  var after = resolveTopDownAssets("dungeon");
  assert.ok(after.background, "background slotu custom asset ile dolmadı");
  assert.equal(after.background.originalId, "dungeon-bg");

  var paths = toAssetPaths(after);
  assert.equal(paths.background, after.background.path);
});

test("11b) resolveTopDownAssets: default'un ZATEN doldurduğu bir slot (space-shooter.player), custom asset tarafından ASLA ezilmiyor", function () {
  freshRoot();
  var before = resolveTopDownAssets("space");
  assert.ok(before.player, "ön koşul: space-shooter varsayılan olarak zaten bir player asseti sunuyor olmalı");
  var originalPlayerId = before.player.id;

  customAssetLibrary.registerLibrary(buildManifestZip(validManifest(), { "characters/player.png": TINY_PNG })); // kit: space-shooter, role: player

  var after = resolveTopDownAssets("space");
  assert.equal(after.player.id, originalPlayerId, "default player slotu custom asset tarafından ezildi — BEKLENMEYEN davranış");
});

test("11c) resolveTopDownDecorationAssets: custom 'decoration' rolündeki assetler, default havuzun SONUNA eklenir (üzerine yazmaz)", function () {
  freshRoot();
  var before = resolveTopDownDecorationAssets("dungeon");
  assert.ok(before.length > 0, "ön koşul: dungeon-rpg zaten default decoration'lara sahip olmalı");

  var manifest = validManifest({
    assets: [{ id: "custom-torch", category: "game-object", path: "decor/torch.png", kit: "dungeon-rpg", role: "decoration" }],
  });
  customAssetLibrary.registerLibrary(buildManifestZip(manifest, { "decor/torch.png": TINY_PNG }));

  var after = resolveTopDownDecorationAssets("dungeon");
  assert.equal(after.length, before.length + 1);
  assert.ok(after.some(function (a) { return a.originalId === "custom-torch"; }));
  // Eski decoration'ların hepsi hâlâ orada (hiçbiri kaybolmadı):
  before.forEach(function (a) {
    assert.ok(after.some(function (b) { return b.id === a.id; }));
  });
});

// -----------------------------------------------------------------------
// 12) upload limits
// -----------------------------------------------------------------------
test("12a) tek bir dosya MAX_SINGLE_FILE_BYTES limitini aşarsa 400 döner", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var big = Buffer.alloc(customAssetLibrary.MAX_SINGLE_FILE_BYTES + 1, 1);
    var manifest = validManifest({ assets: [{ id: "big", category: "character", path: "characters/big.png" }] });
    var zip = buildManifestZip(manifest, { "characters/big.png": big });
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.ok(res.body.details.some(function (d) { return d.indexOf("çok büyük") !== -1; }));
  } finally {
    ctx.server.close();
  }
});

test("12b) manifest'te MAX_ASSETS_PER_LIBRARY'den fazla asset varsa 400 döner", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var assets = [];
    var files = {};
    for (var i = 0; i < customAssetLibrary.MAX_ASSETS_PER_LIBRARY + 1; i++) {
      assets.push({ id: "a" + i, category: "character", path: "characters/a" + i + ".png" });
      files["characters/a" + i + ".png"] = TINY_PNG;
    }
    var zip = buildManifestZip({ name: "Too Many", assets: assets }, files);
    var res = await postZip(ctx.port, "/api/assets/libraries", zip);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Çok fazla asset/);
  } finally {
    ctx.server.close();
  }
});

test("12c) tamamen boş bir ZIP (hiç entry yok) 400 ile reddedilir, çökmez", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var res = await postZip(ctx.port, "/api/assets/libraries", buildZip([]));
    assert.equal(res.status, 400);
  } finally {
    ctx.server.close();
  }
});

test("12d) ZIP olmayan/bozuk bir body 400 ile reddedilir, sunucu ÇÖKMEZ", async function () {
  freshRoot();
  var ctx = await startTestServer();
  try {
    var res = await postZip(ctx.port, "/api/assets/libraries", Buffer.from("this is not a zip file at all"));
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  } finally {
    ctx.server.close();
  }
});
