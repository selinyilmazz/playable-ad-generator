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

test("tam olarak 12 aktif pack var: legacy-core, sunnyland-forest, kenney-space-shooter, racing (ROUND 23), tiny-dungeon (ROUND 24), ROUND 25: car-kit/city-kit-roads/city-kit-industrial/food-kit/retro-fantasy/retro-textures-fantasy/particle-pack", function () {
  var active = getActivePacks();
  assert.deepEqual(
    active.map(function (p) { return p.key; }).sort(),
    [
      "car-kit", "city-kit-industrial", "city-kit-roads", "food-kit",
      "kenney-space-shooter", "legacy-core", "particle-pack", "racing",
      "retro-fantasy", "retro-textures-fantasy", "sunnyland-forest", "tiny-dungeon",
    ]
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

test("tam olarak 6 planned pack var (Selin'in istediği 8 yeni türden 'racing' ROUND 23'te, 'dungeon' ROUND 24'te 'tiny-dungeon' adıyla aktifleşti), hepsi assetCount:0 ve folderPath:null", function () {
  var planned = getPlannedPacks();
  assert.equal(planned.length, 6);
  planned.forEach(function (p) {
    assert.equal(p.status, "planned");
    assert.equal(p.assetCount, 0);
    assert.equal(p.folderPath, null);
    assert.equal(p.license, null, p.key + ": planned pack'in henüz gerçek bir lisansı olamaz");
  });
});

test("planned pack key'leri Selin'in verdiği 8 klasör adından 'racing' ve 'dungeon' çıkarılmış geriye kalan 6'sıyla birebir aynı", function () {
  var planned = getPlannedPacks().map(function (p) { return p.key; }).sort();
  assert.deepEqual(planned, [
    "farming", "fantasy", "medieval-rpg", "ninja-platformer",
    "underwater", "zombie-survival",
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

test("hiçbir planned pack key'i, mevcut 5 aktif pack key'iyle ÇAKIŞMIYOR", function () {
  var activeKeys = getActivePacks().map(function (p) { return p.key; });
  getPlannedPacks().forEach(function (p) {
    assert.equal(activeKeys.indexOf(p.key), -1, p.key + ": aktif bir pack'le çakışıyor");
  });
});

test("hiçbir planned pack'in suggestedGameTypeKey'i, mevcut 6 AKTİF GAME_KITS key'iyle ÇAKIŞMIYOR (henüz aktifleştirilmedi)", function () {
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

test("ROUND 23: racing pack'i active, license CC0, source Kenney Vleugels, assetCount 15, poweredGameTypes ['racing']", function () {
  var p = getPack("racing");
  assert.ok(p);
  assert.equal(p.status, "active");
  assert.equal(p.license, "CC0");
  assert.equal(p.source, "Kenney Vleugels (kenney.nl)");
  assert.equal(p.assetCount, 15);
  assert.deepEqual(p.poweredGameTypes, ["racing"]);
  assert.equal(p.folderPath, "public/assets/packs/racing/");
});

test("ROUND 24: tiny-dungeon pack'i active, license CC0, source Kenney, assetCount 21, poweredGameTypes ['dungeon-rpg']", function () {
  var p = getPack("tiny-dungeon");
  assert.ok(p);
  assert.equal(p.status, "active");
  assert.equal(p.license, "CC0");
  assert.equal(p.source, "Kenney (kenney.nl)");
  assert.equal(p.assetCount, 21);
  assert.deepEqual(p.poweredGameTypes, ["dungeon-rpg"]);
  assert.equal(p.folderPath, "public/assets/packs/tiny-dungeon/");
});

test("getPack(): bilinen bir key için gerçek pack objesi, bilinmeyen bir key için null döner", function () {
  assert.ok(getPack("sunnyland-forest"));
  assert.ok(getPack("medieval-rpg"));
  assert.equal(getPack("does-not-exist"), null);
});

test("ASSET_PACKS toplamı aktif + planned sayısına eşit (18 = 12 + 6)", function () {
  assert.equal(ASSET_PACKS.length, 18);
});

test("ROUND 25: yeni 7 pack'in her biri active, license CC0, source Kenney, doğru assetCount ve poweredGameTypes", function () {
  var expected = [
    ["car-kit", 6, ["city"]],
    ["city-kit-roads", 9, ["city"]],
    ["city-kit-industrial", 4, ["city"]],
    ["food-kit", 17, ["cooking"]],
    ["retro-fantasy", 6, ["dungeon-rpg"]],
    ["retro-textures-fantasy", 3, ["dungeon-rpg"]],
    ["particle-pack", 5, ["dungeon-rpg", "city", "cooking"]],
  ];
  expected.forEach(function (row) {
    var key = row[0], assetCount = row[1], poweredGameTypes = row[2];
    var p = getPack(key);
    assert.ok(p, key + ": pack bulunamadı");
    assert.equal(p.status, "active");
    assert.equal(p.license, "CC0");
    assert.match(p.source, /Kenney/);
    assert.equal(p.assetCount, assetCount, key + ": beklenmedik assetCount");
    assert.deepEqual(p.poweredGameTypes, poweredGameTypes, key + ": beklenmedik poweredGameTypes");
    assert.equal(p.folderPath, "public/assets/packs/" + key + "/");
  });
});
