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
// değişmedi/silinmedi. ROUND 23: Kenney Racing Pack'ten 15 küratörlü asset
// (bkz. packs/racing.js) EK olarak eklendi, yine hiçbir eski kayıt
// değişmedi/silinmedi. ROUND 24: Kenney Tiny Dungeon'dan 21 küratörlü asset
// (bkz. packs/tiny-dungeon.js) EK olarak eklendi, yine hiçbir eski kayıt
// değişmedi/silinmedi. ROUND 25: 7 yeni pack birden EKLENDİ — Car Kit 6,
// City Kit Roads 9, City Kit Industrial 4, Food Kit 17, Retro Fantasy 6,
// Retro Textures Fantasy 3, Particle Pack 5 (toplam 50), yine hiçbir eski
// kayıt değişmedi/silinmedi. Bu yüzden toplam artık
// 39 + 21 + 35 + 15 + 21 + 50 = 181.
test("manifest tam olarak 181 asset içeriyor (eski 39 + SunnyLand Forest 21 + Kenney Space Shooter 35 + Racing 15 + Tiny Dungeon 21 + ROUND25: Car Kit 6/City Kit Roads 9/City Kit Industrial 4/Food Kit 17/Retro Fantasy 6/Retro Textures Fantasy 3/Particle Pack 5)", function () {
  assert.equal(ASSET_MANIFEST.length, 181);
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

test("ROUND 23: Racing pack'inin tam olarak 15 asseti var, hepsi pack:'racing' ve visualStyle:'kenney-racing-v1' taşıyor", function () {
  var racing = ASSET_MANIFEST.filter(function (a) { return a.pack === "racing"; });
  assert.equal(racing.length, 15);
  racing.forEach(function (a) {
    assert.equal(a.visualStyle, "kenney-racing-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.theme, "racing", a.id + ": beklenmedik theme");
    assert.deepEqual(a.compatibleGameTypes, ["racing"], a.id + ": beklenmedik compatibleGameTypes");
  });
});

test("ROUND 23: Racing pack ile eklenen 15 assetin tamamı doğru id/category/pack ile manifestte var, hiçbiri duplicate değil", function () {
  var expected = [
    ["racing_car_player_red", "vehicle"],
    ["racing_car_player_blue", "vehicle"],
    ["racing_traffic_car_yellow", "vehicle"],
    ["racing_traffic_car_green", "vehicle"],
    ["racing_motorcycle_black", "vehicle"],
    ["racing_cone", "obstacle"],
    ["racing_oil_slick", "obstacle"],
    ["racing_barrier", "obstacle"],
    ["racing_tile_road_straight", "tile"],
    ["racing_tile_road_curve", "tile"],
    ["racing_tile_finish_line", "tile"],
    ["racing_skidmark", "effect"],
    ["racing_tree_large", "game-object"],
    ["racing_tribune", "game-object"],
    ["racing_tent", "game-object"],
  ];
  assert.equal(expected.length, 15);
  expected.forEach(function (row) {
    var id = row[0], category = row[1];
    var matches = ASSET_MANIFEST.filter(function (a) { return a.id === id; });
    assert.equal(matches.length, 1, id + ": manifestte tam olarak bir kez bulunmalı (duplicate veya eksik)");
    assert.equal(matches[0].category, category, id + ": beklenmedik category");
    assert.equal(matches[0].pack, "racing", id + ": beklenmedik pack");
  });
});

test("ROUND 24: Tiny Dungeon pack'inin tam olarak 21 asseti var, hepsi pack:'tiny-dungeon' ve visualStyle:'kenney-tiny-dungeon-v1' taşıyor", function () {
  var tinyDungeon = ASSET_MANIFEST.filter(function (a) { return a.pack === "tiny-dungeon"; });
  assert.equal(tinyDungeon.length, 21);
  tinyDungeon.forEach(function (a) {
    assert.equal(a.visualStyle, "kenney-tiny-dungeon-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.theme, "dungeon", a.id + ": beklenmedik theme");
    assert.deepEqual(a.compatibleGameTypes, ["dungeon-rpg"], a.id + ": beklenmedik compatibleGameTypes");
  });
});

test("ROUND 24: Tiny Dungeon pack ile eklenen 21 assetin tamamı doğru id/category/pack ile manifestte var, hiçbiri duplicate değil", function () {
  var expected = [
    ["tinydungeon_player_knight", "character"],
    ["tinydungeon_player_wizard", "character"],
    ["tinydungeon_player_adventurer", "character"],
    ["tinydungeon_enemy_slime", "enemy"],
    ["tinydungeon_enemy_crab", "enemy"],
    ["tinydungeon_enemy_orc", "enemy"],
    ["tinydungeon_enemy_bat", "enemy"],
    ["tinydungeon_enemy_ghost", "enemy"],
    ["tinydungeon_enemy_spider", "enemy"],
    ["tinydungeon_enemy_mimic", "enemy"],
    ["tinydungeon_potion_red", "collectible"],
    ["tinydungeon_potion_blue", "collectible"],
    ["tinydungeon_chest", "game-object"],
    ["tinydungeon_door", "game-object"],
    ["tinydungeon_tile_floor", "tile"],
    ["tinydungeon_tile_wall", "tile"],
    ["tinydungeon_tile_door_threshold", "tile"],
    ["tinydungeon_decoration_torch", "game-object"],
    ["tinydungeon_decoration_barrel", "game-object"],
    ["tinydungeon_decoration_crate", "game-object"],
    ["tinydungeon_decoration_tombstone", "game-object"],
  ];
  assert.equal(expected.length, 21);
  expected.forEach(function (row) {
    var id = row[0], category = row[1];
    var matches = ASSET_MANIFEST.filter(function (a) { return a.id === id; });
    assert.equal(matches.length, 1, id + ": manifestte tam olarak bir kez bulunmalı (duplicate veya eksik)");
    assert.equal(matches[0].category, category, id + ": beklenmedik category");
    assert.equal(matches[0].pack, "tiny-dungeon", id + ": beklenmedik pack");
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
  var validKeys = [
    "endless-runner", "space-shooter", "forest-platformer", "fruit-puzzle",
    "racing", "dungeon-rpg", "city", "cooking",
  ];
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

// ============================== ROUND 25 ==================================
// 7 yeni pack birden (Car Kit, City Kit Roads, City Kit Industrial, Food
// Kit, Retro Fantasy Kit, Retro Textures Fantasy, Particle Pack) — bkz.
// server/config/packs/{car-kit,city-kit-roads,city-kit-industrial,food-kit,
// retro-fantasy,retro-textures-fantasy,particle-pack}.js.

test("ROUND 25: Car Kit pack'inin tam olarak 6 asseti var, hepsi pack:'car-kit' ve visualStyle:'kenney-car-kit-v1' taşıyor", function () {
  var carKit = ASSET_MANIFEST.filter(function (a) { return a.pack === "car-kit"; });
  assert.equal(carKit.length, 6);
  carKit.forEach(function (a) {
    assert.equal(a.visualStyle, "kenney-car-kit-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.theme, "city", a.id + ": beklenmedik theme");
    assert.deepEqual(a.compatibleGameTypes, ["city"], a.id + ": beklenmedik compatibleGameTypes");
  });
});

test("ROUND 25: City Kit Roads pack'inin tam olarak 9 asseti var, hepsi pack:'city-kit-roads' ve visualStyle:'kenney-city-kit-roads-v1' taşıyor", function () {
  var cityRoads = ASSET_MANIFEST.filter(function (a) { return a.pack === "city-kit-roads"; });
  assert.equal(cityRoads.length, 9);
  cityRoads.forEach(function (a) {
    assert.equal(a.visualStyle, "kenney-city-kit-roads-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.theme, "city", a.id + ": beklenmedik theme");
    assert.deepEqual(a.compatibleGameTypes, ["city"], a.id + ": beklenmedik compatibleGameTypes");
  });
});

test("ROUND 25: City Kit Industrial pack'inin tam olarak 4 asseti var, hepsi pack:'city-kit-industrial' ve visualStyle:'kenney-city-kit-industrial-v1' taşıyor", function () {
  var cityIndustrial = ASSET_MANIFEST.filter(function (a) { return a.pack === "city-kit-industrial"; });
  assert.equal(cityIndustrial.length, 4);
  cityIndustrial.forEach(function (a) {
    assert.equal(a.visualStyle, "kenney-city-kit-industrial-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.theme, "city", a.id + ": beklenmedik theme");
    assert.deepEqual(a.compatibleGameTypes, ["city"], a.id + ": beklenmedik compatibleGameTypes");
  });
});

test("ROUND 25: Food Kit pack'inin tam olarak 17 asseti var, hepsi pack:'food-kit' ve visualStyle:'kenney-food-kit-v1' taşıyor", function () {
  var foodKit = ASSET_MANIFEST.filter(function (a) { return a.pack === "food-kit"; });
  assert.equal(foodKit.length, 17);
  foodKit.forEach(function (a) {
    assert.equal(a.visualStyle, "kenney-food-kit-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.theme, "cooking", a.id + ": beklenmedik theme");
    assert.deepEqual(a.compatibleGameTypes, ["cooking"], a.id + ": beklenmedik compatibleGameTypes");
  });
});

test("ROUND 25: Retro Fantasy Kit pack'inin tam olarak 6 asseti var, hepsi pack:'retro-fantasy' ve visualStyle:'kenney-retro-fantasy-v1' taşıyor, dungeon-rpg'ye bağlı", function () {
  var retroFantasy = ASSET_MANIFEST.filter(function (a) { return a.pack === "retro-fantasy"; });
  assert.equal(retroFantasy.length, 6);
  retroFantasy.forEach(function (a) {
    assert.equal(a.visualStyle, "kenney-retro-fantasy-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.theme, "dungeon", a.id + ": beklenmedik theme");
    assert.deepEqual(a.compatibleGameTypes, ["dungeon-rpg"], a.id + ": beklenmedik compatibleGameTypes");
  });
});

test("ROUND 25: Retro Textures Fantasy pack'inin tam olarak 3 asseti var, hepsi pack:'retro-textures-fantasy' ve visualStyle:'kenney-retro-textures-fantasy-v1' taşıyor, dungeon-rpg'ye bağlı", function () {
  var retroTex = ASSET_MANIFEST.filter(function (a) { return a.pack === "retro-textures-fantasy"; });
  assert.equal(retroTex.length, 3);
  retroTex.forEach(function (a) {
    assert.equal(a.visualStyle, "kenney-retro-textures-fantasy-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.theme, "dungeon", a.id + ": beklenmedik theme");
    assert.deepEqual(a.compatibleGameTypes, ["dungeon-rpg"], a.id + ": beklenmedik compatibleGameTypes");
  });
});

test("ROUND 25: Particle Pack'in tam olarak 5 asseti var, hepsi pack:'particle-pack' ve visualStyle:'kenney-particle-pack-v1' taşıyor, ÇOK-kitli compatibleGameTypes (legacy-core'un 'sparkle' desenindeki gibi)", function () {
  var particles = ASSET_MANIFEST.filter(function (a) { return a.pack === "particle-pack"; });
  assert.equal(particles.length, 5);
  particles.forEach(function (a) {
    assert.equal(a.visualStyle, "kenney-particle-pack-v1", a.id + ": beklenmedik visualStyle");
    assert.equal(a.category, "effect", a.id + ": beklenmedik category");
    assert.ok(a.compatibleGameTypes.length >= 1, a.id + ": en az 1 compatibleGameTypes olmalı");
  });
  // En az bir partikülün BİRDEN FAZLA kite bağlı olması bekleniyor (paylaşımlı desen).
  var multiKit = particles.filter(function (a) { return a.compatibleGameTypes.length > 1; });
  assert.ok(multiKit.length > 0, "en az bir partikül birden fazla kite bağlı olmalı");
});

test("ROUND 25: 7 yeni pack ile eklenen 50 assetin tamamı doğru id/category/pack ile manifestte var, hiçbiri duplicate değil", function () {
  var expected = [
    ["carkit_vehicle_sedan", "vehicle", "car-kit"],
    ["carkit_vehicle_taxi", "vehicle", "car-kit"],
    ["carkit_vehicle_police", "vehicle", "car-kit"],
    ["carkit_vehicle_ambulance", "vehicle", "car-kit"],
    ["carkit_vehicle_van", "vehicle", "car-kit"],
    ["carkit_vehicle_garbage_truck", "vehicle", "car-kit"],
    ["cityroads_tile_road_straight", "tile", "city-kit-roads"],
    ["cityroads_tile_road_curve", "tile", "city-kit-roads"],
    ["cityroads_tile_road_intersection", "tile", "city-kit-roads"],
    ["cityroads_cone", "obstacle", "city-kit-roads"],
    ["cityroads_barrier", "obstacle", "city-kit-roads"],
    ["cityroads_traffic_light", "game-object", "city-kit-roads"],
    ["cityroads_sign_stop", "game-object", "city-kit-roads"],
    ["cityroads_dumpster", "game-object", "city-kit-roads"],
    ["cityroads_electricity_pole", "game-object", "city-kit-roads"],
    ["cityindustrial_building_office", "game-object", "city-kit-industrial"],
    ["cityindustrial_building_factory", "game-object", "city-kit-industrial"],
    ["cityindustrial_water_tower", "game-object", "city-kit-industrial"],
    ["cityindustrial_shipping_container", "game-object", "city-kit-industrial"],
    ["foodkit_apple", "collectible", "food-kit"],
    ["foodkit_banana", "collectible", "food-kit"],
    ["foodkit_tomato", "collectible", "food-kit"],
    ["foodkit_carrot", "collectible", "food-kit"],
    ["foodkit_egg", "collectible", "food-kit"],
    ["foodkit_cheese", "collectible", "food-kit"],
    ["foodkit_bread", "collectible", "food-kit"],
    ["foodkit_fish", "collectible", "food-kit"],
    ["foodkit_plate", "game-object", "food-kit"],
    ["foodkit_cutting_board", "game-object", "food-kit"],
    ["foodkit_pot", "game-object", "food-kit"],
    ["foodkit_frying_pan", "game-object", "food-kit"],
    ["foodkit_cooking_knife", "game-object", "food-kit"],
    ["foodkit_burger", "game-object", "food-kit"],
    ["foodkit_pizza", "game-object", "food-kit"],
    ["foodkit_cake", "game-object", "food-kit"],
    ["foodkit_donut", "game-object", "food-kit"],
    ["retrofantasy_stairs_stone", "tile", "retro-fantasy"],
    ["retrofantasy_ladder", "tile", "retro-fantasy"],
    ["retrofantasy_wall_fortified", "game-object", "retro-fantasy"],
    ["retrofantasy_tower", "game-object", "retro-fantasy"],
    ["retrofantasy_barrels", "game-object", "retro-fantasy"],
    ["retrofantasy_column", "game-object", "retro-fantasy"],
    ["retrotex_wall_brick", "tile", "retro-textures-fantasy"],
    ["retrotex_floor_wood", "tile", "retro-textures-fantasy"],
    ["retrotex_door_wood", "game-object", "retro-textures-fantasy"],
    ["particle_hit_impact", "effect", "particle-pack"],
    ["particle_magic_glow", "effect", "particle-pack"],
    ["particle_smoke_puff", "effect", "particle-pack"],
    ["particle_spark_burst", "effect", "particle-pack"],
    ["particle_star_sparkle", "effect", "particle-pack"],
  ];
  assert.equal(expected.length, 50);
  expected.forEach(function (row) {
    var id = row[0], category = row[1], pack = row[2];
    var matches = ASSET_MANIFEST.filter(function (a) { return a.id === id; });
    assert.equal(matches.length, 1, id + ": manifestte tam olarak bir kez bulunmalı (duplicate veya eksik)");
    assert.equal(matches[0].category, category, id + ": beklenmedik category");
    assert.equal(matches[0].pack, pack, id + ": beklenmedik pack");
  });
});
