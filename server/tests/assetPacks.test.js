/**
 * ROUND 18 tests — server/config/assetPacks.js (Multi-Genre Asset Library
 * Architecture: pack registry — hangi paketler aktif, hangileri planlanan).
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { ASSET_PACKS, getPack, getActivePacks, getPlannedPacks } = require("../config/assetPacks");
const { ASSET_MANIFEST } = require("../config/assetManifest");
const { listGameTypeKeys } = require("../config/assetKits");
const { GAME_TYPE_KEYWORDS } = require("../services/gameTypeDetection");

test("tam olarak 3 aktif pack var: legacy-core, sunnyland-forest, kenney-space-shooter", function () {
  var active = getActivePacks();
  assert.deepEqual(
    active.map(function (p) { return p.key; }).sort(),
    ["kenney-space-shooter", "legacy-core", "sunnyland-forest"]
  );
});

test("her aktif pack'in assetCount'u ASSET_MANIFEST'teki GERÇEK sayıyla birebir eşleşiyor (elle yazılmış/eskimiş bir sayı DEĞİL)", function () {
  getActivePacks().forEach(function (p) {
    var real = p.isFlat
      ? ASSET_MANIFEST.filter(function (a) { return !a.pack; }).length
      : ASSET_MANIFEST.filter(function (a) { return a.pack === p.key; }).length;
    assert.equal(p.assetCount, real, p.key + ": assetCount tutarsız");
    assert.ok(p.assetCount > 0, p.key + ": aktif bir pack'in 0 asseti olamaz");
  });
});

test("her aktif pack'in gerçek bir lisansı ve kaynağı var (planned paketlerin aksine null DEĞİL)", function () {
  getActivePacks().forEach(function (p) {
    assert.equal(typeof p.license, "string", p.key + ": license eksik");
    assert.equal(typeof p.source, "string", p.key + ": source eksik");
  });
});

test("tam olarak 8 planned pack var (Selin'in istediği 8 yeni tür), hepsi assetCount:0 ve folderPath:null", function () {
  var planned = getPlannedPacks();
  assert.equal(planned.length, 8);
  planned.forEach(function (p) {
    assert.equal(p.status, "planned");
    assert.equal(p.assetCount, 0);
    assert.equal(p.folderPath, null);
    assert.equal(p.license, null, p.key + ": planned pack'in henüz gerçek bir lisansı olamaz");
  });
});

test("planned pack key'leri Selin'in verdiği 8 klasör adıyla birebir aynı", function () {
  var planned = getPlannedPacks().map(function (p) { return p.key; }).sort();
  assert.deepEqual(planned, [
    "dungeon", "farming", "fantasy", "medieval-rpg", "ninja-platformer",
    "racing", "underwater", "zombie-survival",
  ].sort());
});

test("her planned pack'in roleBreakdown'u var, en az 1 rol içeriyor, ve estimatedAssetCount roleBreakdown'un GERÇEK toplamı (elle yazılmış çelişkili bir sayı DEĞİL)", function () {
  getPlannedPacks().forEach(function (p) {
    assert.ok(Array.isArray(p.roleBreakdown) && p.roleBreakdown.length > 0, p.key + ": roleBreakdown boş");
    var sum = p.roleBreakdown.reduce(function (s, r) { return s + r.estimatedCount; }, 0);
    assert.equal(p.estimatedAssetCount, sum, p.key + ": estimatedAssetCount roleBreakdown toplamıyla uyuşmuyor");
    assert.ok(p.estimatedAssetCount >= 15 && p.estimatedAssetCount <= 35, p.key + ": tahmini asset sayısı curated-kit ölçeğinin (15-35) dışında");
  });
});

test("hiçbir planned pack key'i, mevcut 3 aktif pack key'iyle ÇAKIŞMIYOR", function () {
  var activeKeys = getActivePacks().map(function (p) { return p.key; });
  getPlannedPacks().forEach(function (p) {
    assert.equal(activeKeys.indexOf(p.key), -1, p.key + ": aktif bir pack'le çakışıyor");
  });
});

test("hiçbir planned pack'in suggestedGameTypeKey'i, mevcut 4 AKTİF GAME_KITS key'iyle ÇAKIŞMIYOR (henüz aktifleştirilmedi)", function () {
  var activeGameTypes = listGameTypeKeys();
  getPlannedPacks().forEach(function (p) {
    assert.equal(activeGameTypes.indexOf(p.suggestedGameTypeKey), -1, p.suggestedGameTypeKey + ": zaten aktif bir GAME_KITS key'i");
  });
});

test("hiçbir planned pack'in suggestedGameTypeKey'i, gameTypeDetection.js'in AKTİF GAME_TYPE_KEYWORDS'ünde henüz TANIMLI DEĞİL (yanlışlıkla erken aktifleşmiş olmasın)", function () {
  var activeDetectionKeys = Object.keys(GAME_TYPE_KEYWORDS);
  getPlannedPacks().forEach(function (p) {
    assert.equal(activeDetectionKeys.indexOf(p.suggestedGameTypeKey), -1, p.suggestedGameTypeKey + ": zaten aktif detection'da tanımlı");
  });
});

test("getPack(): bilinen bir key için gerçek pack objesi, bilinmeyen bir key için null döner", function () {
  assert.ok(getPack("sunnyland-forest"));
  assert.ok(getPack("dungeon"));
  assert.equal(getPack("does-not-exist"), null);
});

test("ASSET_PACKS toplamı aktif + planned sayısına eşit (11 = 3 + 8)", function () {
  assert.equal(ASSET_PACKS.length, 11);
});
