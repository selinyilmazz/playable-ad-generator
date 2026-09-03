/**
 * PHASE 3A tests — assetManifest.js şema/veri bütünlüğü.
 * Node'un yerleşik test runner'ı kullanılıyor (node:test) — yeni bir
 * dependency EKLENMEDİ. Çalıştırma: `node --test server/tests`
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { ASSET_MANIFEST, CATEGORY_TO_GROUP } = require("../config/assetManifest");

// ROUND 18: Multi-Genre Asset Library mimarisiyle enum 9 -> 14 değere
// genişledi (tile/powerup/weapon/vehicle/ui eklendi, bkz. assetManifest.js
// dosya başı yorumu). Mevcut 78 kaydın HİÇBİRİ bu yeni değerleri
// KULLANMIYOR — sadece gelecekteki paketler için şema önceden hazırlandı.
var VALID_CATEGORIES = [
  "character", "enemy", "collectible", "obstacle", "platform",
  "projectile", "background", "effect", "game-object",
  "tile", "powerup", "weapon", "vehicle", "ui",
];

// ROUND 14: SunnyLand Forest pack (17 yeni asset, hepsi `pack:
// "sunnyland-forest"` alanıyla işaretli) eklendi — orijinal 39 kayıt HİÇ
// değiştirilmedi/silinmedi, sadece EK yapıldı (bkz. assetManifest.js "ROUND
// 14 NOTU"). ROUND 16: Kenney Space Shooter (Remastered) pack'i (22 yeni
// asset, `pack: "kenney-space-shooter"`) aynı şekilde EK olarak eklendi —
// yine hiçbir eski kayıt silinmedi. ROUND 20 (Part B): Selin'in onayladığı
// Asset Library genişletme raporundan 4 SunnyLand + 13 Kenney asset (17
// toplam — önerilen 18'den, kaynağın gerçekte bir platform tile'ı
// İÇERMEDİĞİ görülen 1 tanesi çıkarılarak) EKLENDİ, yine hiçbir eski kayıt
// değişmedi/silinmedi. Bu yüzden toplam artık 39 + 21 + 35 = 95.
test("manifest tam olarak 95 asset içeriyor (eski 39 + SunnyLand Forest 21 [17+ROUND20:4] + Kenney Space Shooter 35 [22+ROUND20:13])", function () {
  assert.equal(ASSET_MANIFEST.length, 95);
});

test("eski 39 kayıt (pack alanı olmayanlar) sayıca değişmedi", function () {
  var legacy = ASSET_MANIFEST.filter(function (a) { return !a.pack; });
  assert.equal(legacy.length, 39);
});

test("ROUND 14+20: SunnyLand Forest pack'inin tam olarak 21 asseti var, hepsi pack:'sunnyland-forest' ve visualStyle:'sunnyland-forest-v1' taşıyor", function () {
  var sunnyland = ASSET_MANIFEST.filter(function (a) { return a.pack === "sunnyland-forest"; });
  assert.equal(sunnyland.length, 21);
  sunnyland.forEach(function (a) {
    assert.equal(a.visualStyle, "sunnyland-forest-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.theme, "forest", a.id + ": beklenmedik theme");
  });
});

test("ROUND 16+20: Kenney Space Shooter pack'inin tam olarak 35 asseti var, hepsi pack:'kenney-space-shooter' ve visualStyle:'kenney-space-shooter-v1' taşıyor", function () {
  var spaceShooter = ASSET_MANIFEST.filter(function (a) { return a.pack === "kenney-space-shooter"; });
  assert.equal(spaceShooter.length, 35);
  spaceShooter.forEach(function (a) {
    assert.equal(a.visualStyle, "kenney-space-shooter-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.theme, "space", a.id + ": beklenmedik theme");
  });
});

test("ROUND 20: Asset Library genişletmesiyle eklenen 17 assetin tamamı doğru id/category/pack ile manifestte var, hiçbiri duplicate değil", function () {
  var expected = [
    ["sunnyland_background_middleground", "background", "sunnyland-forest"],
    ["sunnyland_piranha_plant_attack", "enemy", "sunnyland-forest"],
    ["sunnyland_player_hurt", "effect", "sunnyland-forest"],
    ["sunnyland_hud_life_bar", "ui", "sunnyland-forest"],
    ["spaceshooter_enemy_ufo_blue", "enemy", "kenney-space-shooter"],
    ["spaceshooter_enemy_ufo_green", "enemy", "kenney-space-shooter"],
    ["spaceshooter_enemy_ufo_yellow", "enemy", "kenney-space-shooter"],
    ["spaceshooter_enemy_red_mk1", "enemy", "kenney-space-shooter"],
    ["spaceshooter_enemy_red_mk3", "enemy", "kenney-space-shooter"],
    ["spaceshooter_enemy_black_mk1", "enemy", "kenney-space-shooter"],
    ["spaceshooter_player_interceptor_blue", "character", "kenney-space-shooter"],
    ["spaceshooter_player_vanguard_blue", "character", "kenney-space-shooter"],
    ["spaceshooter_asteroid_large_grey", "obstacle", "kenney-space-shooter"],
    ["spaceshooter_speed_boost", "effect", "kenney-space-shooter"],
    ["spaceshooter_powerup_shield_gold", "collectible", "kenney-space-shooter"],
    ["spaceshooter_powerup_star_gold", "collectible", "kenney-space-shooter"],
    ["spaceshooter_coin_treasure", "collectible", "kenney-space-shooter"],
  ];
  assert.equal(expected.length, 17);
  expected.forEach(function (row) {
    var id = row[0], category = row[1], pack = row[2];
    var matches = ASSET_MANIFEST.filter(function (a) { return a.id === id; });
    assert.equal(matches.length, 1, id + ": manifestte tam olarak bir kez bulunmalı (duplicate veya eksik)");
    assert.equal(matches[0].category, category, id + ": beklenmedik category");
    assert.equal(matches[0].pack, pack, id + ": beklenmedik pack");
  });
});

test("ROUND 16: eski space-shooter'a özel 9 legacy asset artık compatibleGameTypes içinde 'space-shooter' TAŞIMIYOR (dosyalar silinmedi, sadece kit'ten çıkarıldı)", function () {
  var oldIds = [
    "red_enemy", "blue_enemy", "green_enemy", "boss_enemy",
    "gem_blue", "star", "fireball", "explosion", "background_space",
  ];
  oldIds.forEach(function (id) {
    var asset = ASSET_MANIFEST.find(function (a) { return a.id === id; });
    assert.ok(asset, id + ": manifestten TAMAMEN silinmiş olmamalı, sadece kit bağlantısı kesilmeli");
    assert.equal(
      asset.compatibleGameTypes.indexOf("space-shooter"), -1,
      id + ": hâlâ compatibleGameTypes içinde 'space-shooter' taşıyor"
    );
  });
});

test("her asset zorunlu alanları taşıyor: id, path, category, name, tags, compatibleGameTypes, visualStyle, animationType", function () {
  ASSET_MANIFEST.forEach(function (a) {
    assert.equal(typeof a.id, "string", a.id + ": id string olmalı");
    assert.equal(typeof a.path, "string", a.id + ": path string olmalı");
    assert.equal(typeof a.category, "string", a.id + ": category string olmalı");
    assert.equal(typeof a.name, "string", a.id + ": name string olmalı");
    assert.ok(a.name.length > 0, a.id + ": name boş olamaz");
    assert.ok(Array.isArray(a.tags), a.id + ": tags dizi olmalı");
    assert.ok(Array.isArray(a.compatibleGameTypes), a.id + ": compatibleGameTypes dizi olmalı");
    assert.equal(typeof a.visualStyle, "string", a.id + ": visualStyle string olmalı");
    assert.equal(typeof a.animationType, "string", a.id + ": animationType string olmalı");
  });
});

test("category sadece tanımlı enum değerlerinden biri olabilir", function () {
  ASSET_MANIFEST.forEach(function (a) {
    assert.ok(
      VALID_CATEGORIES.indexOf(a.category) !== -1,
      a.id + ": geçersiz category '" + a.category + "'"
    );
  });
});

test("ROUND 18: CATEGORY_TO_GROUP, VALID_CATEGORIES'teki 14 değerin TAMAMI için bir group tanımlıyor (yeni tile/powerup/weapon/vehicle/ui dahil)", function () {
  VALID_CATEGORIES.forEach(function (cat) {
    assert.equal(typeof CATEGORY_TO_GROUP[cat], "string", cat + ": CATEGORY_TO_GROUP'ta eksik");
  });
});

test("gameplayRole (varsa) dizi olmalı", function () {
  ASSET_MANIFEST.forEach(function (a) {
    if (a.gameplayRole !== undefined) {
      assert.ok(Array.isArray(a.gameplayRole), a.id + ": gameplayRole tanımlıysa dizi olmalı");
    }
  });
});

test("id'ler benzersiz", function () {
  var seen = {};
  ASSET_MANIFEST.forEach(function (a) {
    assert.ok(!seen[a.id], "duplicate id: " + a.id);
    seen[a.id] = true;
  });
});

test("path'ler benzersiz", function () {
  var seen = {};
  ASSET_MANIFEST.forEach(function (a) {
    assert.ok(!seen[a.path], "duplicate path: " + a.path);
    seen[a.path] = true;
  });
});

test("her path'in gerçek bir dosya karşılığı var (public/ altında)", function () {
  var publicDir = path.join(__dirname, "..", "..", "public");
  ASSET_MANIFEST.forEach(function (a) {
    var fullPath = path.join(publicDir, a.path.replace(/^\//, ""));
    assert.ok(fs.existsSync(fullPath), a.id + ": dosya yok -> " + fullPath);
  });
});

test("compatibleGameTypes sadece geçerli game-type key'leri içerebilir", function () {
  var validKeys = ["endless-runner", "space-shooter", "forest-platformer", "fruit-puzzle"];
  ASSET_MANIFEST.forEach(function (a) {
    a.compatibleGameTypes.forEach(function (gt) {
      assert.ok(validKeys.indexOf(gt) !== -1, a.id + ": geçersiz game type '" + gt + "'");
    });
  });
});

test("eski 39 kayıt için tags ve path hiç değişmedi (Phase 3A'nın 'mevcut SVG/manifest verisini bozma' kısıtı) — path formatı hâlâ /assets/... ve .svg", function () {
  ASSET_MANIFEST.filter(function (a) { return !a.pack; }).forEach(function (a) {
    assert.match(a.path, /^\/assets\/[a-z]+\/[a-z0-9_]+\.svg$/, a.id + ": path formatı beklenmedik");
    assert.ok(a.tags.length > 0, a.id + ": tags boş olamaz");
  });
});

test("ROUND 14: SunnyLand Forest pack asset path'leri kendi pack klasörünü işaret ediyor ve gerçek PNG dosyaları", function () {
  ASSET_MANIFEST.filter(function (a) { return a.pack === "sunnyland-forest"; }).forEach(function (a) {
    assert.match(
      a.path,
      /^\/assets\/packs\/sunnyland-forest\/[a-z]+\/[a-z0-9\-]+\.png$/,
      a.id + ": path formatı beklenmedik"
    );
    assert.ok(a.tags.length > 0, a.id + ": tags boş olamaz");
  });
});
