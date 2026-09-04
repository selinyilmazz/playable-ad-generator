/**
 * PHASE 3A tests — assetKits.js (Game Kit sistemi).
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { GAME_KITS, getKit, listGameTypeKeys, resolveKitRoles } = require("../config/assetKits");
const { ASSET_MANIFEST } = require("../config/assetManifest");

var EXPECTED_KIT_KEYS = [
  "endless-runner", "space-shooter", "forest-platformer", "fruit-puzzle",
  "racing", "dungeon-rpg", "city", "cooking",
];

function assetIds() {
  return ASSET_MANIFEST.map(function (a) { return a.id; });
}

test("tam olarak 8 kit tanımlı, beklenen key'lerle (ROUND 23: racing, ROUND 24: dungeon-rpg, ROUND 25: city+cooking eklendi)", function () {
  assert.equal(GAME_KITS.length, 8);
  assert.deepEqual(listGameTypeKeys().sort(), EXPECTED_KIT_KEYS.sort());
});

test("her kit key/name/description/roles/missingRoles taşıyor", function () {
  GAME_KITS.forEach(function (kit) {
    assert.equal(typeof kit.key, "string");
    assert.equal(typeof kit.name, "string");
    assert.equal(typeof kit.description, "string");
    assert.equal(typeof kit.roles, "object");
    assert.ok(Array.isArray(kit.missingRoles));
  });
});

test("kit roles içindeki her id (null olmayan), gerçek manifestte var", function () {
  var ids = assetIds();
  GAME_KITS.forEach(function (kit) {
    Object.keys(kit.roles).forEach(function (role) {
      var value = kit.roles[role];
      if (value == null) return;
      var list = Array.isArray(value) ? value : [value];
      list.forEach(function (id) {
        assert.ok(ids.indexOf(id) !== -1, kit.key + "." + role + ": bilinmeyen asset id '" + id + "'");
      });
    });
  });
});

test("forest-platformer kitinin missingRoles listesi 'platform' rolünü içeriyor (ROUND 14 — SunnyLand pack'inde hazır tek-parça bir platform tile'ı yok, dürüstçe not edildi)", function () {
  var kit = getKit("forest-platformer");
  assert.equal(kit.missingRoles.length, 1);
  assert.match(kit.missingRoles[0], /platform/);
  assert.equal(kit.roles.platform, null);
});

test("endless-runner kitinin environment rolü null (şehir background'u yok)", function () {
  var kit = getKit("endless-runner");
  assert.equal(kit.roles.environment, null);
});

test("ROUND 16: space-shooter kitinin missingRoles listesi boş — Kenney Space Shooter (Remastered) pack'i tüm rolleri gerçek assetle karşılıyor (player/enemy+asteroid/collectible/background/effect/projectile)", function () {
  var kit = getKit("space-shooter");
  assert.deepEqual(kit.missingRoles, []);
  // ROUND 20: 3 orijinal gemi + 2 alt-renk varyantı (interceptor-blue,
  // vanguard-blue) = 5.
  assert.ok(Array.isArray(kit.roles.player) && kit.roles.player.length === 5, "player 5 gemi varyantı içermeli (3 orijinal + ROUND 20: 2 alt-renk)");
  // ROUND 16: normalizeRoles()'in obstacle||enemy||asteroid OR-precedence
  // tuzağını aşmak için enemy gemiler + UFO + asteroidler TEK 'obstacle'
  // dizisinde birleştirildi (forest-platformer'daki enemy+obstacle
  // birleştirmesiyle aynı çözüm). ROUND 20: 3 UFO renk varyantı + 3 gerçekten
  // farklı tasarımlı enemy varyantı (red mk1/mk3, black mk1) + 1 ek asteroid
  // (grey large) EKLENDİ -> 8 + 7 = 15.
  assert.ok(Array.isArray(kit.roles.obstacle) && kit.roles.obstacle.length === 15, "obstacle: 5 enemy/ufo + 3 asteroid + ROUND 20: 6 enemy varyant + 1 asteroid varyant");
  assert.equal(kit.roles.enemy, undefined, "ayrı bir 'enemy' anahtarı kalmamalı, hepsi obstacle'a taşındı");
  assert.equal(kit.roles.asteroid, undefined, "ayrı bir 'asteroid' anahtarı kalmamalı, hepsi obstacle'a taşındı");
});

test("fruit-puzzle kitinin background rolü null (nötr puzzle background'u yok)", function () {
  var kit = getKit("fruit-puzzle");
  assert.equal(kit.roles.background, null);
});

test("resolveKitRoles: null rol için null döner, tanımlı rol için gerçek asset objesi döner, unresolved boş", function () {
  var resolved = resolveKitRoles("endless-runner");
  assert.equal(resolved.roles.environment, null);
  assert.equal(resolved.roles.collectible.id, "coin_gold");
  assert.equal(resolved.roles.collectible.path, "/assets/objects/coin_gold.svg");
  assert.deepEqual(resolved.unresolved, []);
});

test("resolveKitRoles: dizi-değerli roller (örn. forest-platformer.collectible) tüm asset objelerini döner", function () {
  var resolved = resolveKitRoles("forest-platformer");
  assert.ok(Array.isArray(resolved.roles.collectible));
  var ids = resolved.roles.collectible.map(function (a) { return a.id; });
  assert.deepEqual(
    ids.sort(),
    ["sunnyland_carrot", "sunnyland_star", "sunnyland_chest"].sort()
  );
});

test("ROUND 14: forest-platformer.player artık SunnyLand pack'inin tek karakteri (sunnyland_player)", function () {
  var resolved = resolveKitRoles("forest-platformer");
  assert.equal(resolved.roles.player.id, "sunnyland_player");
  assert.equal(resolved.roles.player.path, "/assets/packs/sunnyland-forest/characters/player.png");
});

test("ROUND 14+20: forest-platformer.obstacle hem SunnyLand engellerini hem düşmanlarını (+ ROUND 20: piranha-plant saldırı pozu) içeriyor", function () {
  var resolved = resolveKitRoles("forest-platformer");
  var ids = resolved.roles.obstacle.map(function (a) { return a.id; }).sort();
  assert.deepEqual(
    ids,
    [
      "sunnyland_bee", "sunnyland_piranha_plant", "sunnyland_piranha_plant_attack",
      "sunnyland_rock", "sunnyland_slug", "sunnyland_tree",
    ].sort()
  );
});

test("resolveKitRoles: bilinmeyen kit key için null döner", function () {
  assert.equal(resolveKitRoles("not-a-real-kit"), null);
});

test("ROUND 23: racing kitinin missingRoles listesi collectible/background/powerup/ui'ı içeriyor (Kenney Racing Pack'te bu 4 rol için gerçek asset yok, uydurulmadı)", function () {
  var kit = getKit("racing");
  assert.equal(kit.missingRoles.length, 4);
  assert.equal(kit.roles.collectible, null);
  assert.equal(kit.roles.background, null);
  assert.equal(kit.roles.powerup, null);
  assert.equal(kit.roles.ui, null);
});

test("ROUND 23: racing kitinin player rolü 2 oyuncu arabası, obstacle rolü trafik+motosiklet+koni+yağ+bariyer (6), platform straight tile, tile curve+finish-line, decoration tree+tribune+tent", function () {
  var resolved = resolveKitRoles("racing");
  assert.deepEqual(
    resolved.roles.player.map(function (a) { return a.id; }).sort(),
    ["racing_car_player_blue", "racing_car_player_red"]
  );
  assert.deepEqual(
    resolved.roles.obstacle.map(function (a) { return a.id; }).sort(),
    [
      "racing_barrier", "racing_cone", "racing_motorcycle_black",
      "racing_oil_slick", "racing_traffic_car_green", "racing_traffic_car_yellow",
    ].sort()
  );
  assert.equal(resolved.roles.platform.id, "racing_tile_road_straight");
  assert.deepEqual(
    resolved.roles.tile.map(function (a) { return a.id; }).sort(),
    ["racing_tile_finish_line", "racing_tile_road_curve"]
  );
  assert.equal(resolved.roles.effect.id, "racing_skidmark");
  assert.deepEqual(
    resolved.roles.decoration.map(function (a) { return a.id; }).sort(),
    ["racing_tent", "racing_tree_large", "racing_tribune"]
  );
  assert.deepEqual(resolved.unresolved, []);
});

test("ROUND 25: dungeon-rpg kitinin missingRoles listesi artık SADECE background/ui'ı içeriyor (ROUND 25: Particle Pack ile effect artık gerçek asset kazandı, missingRoles'ten çıkarıldı)", function () {
  var kit = getKit("dungeon-rpg");
  assert.equal(kit.missingRoles.length, 2);
  assert.equal(kit.roles.background, null);
  assert.equal(kit.roles.ui, null);
  assert.notEqual(kit.roles.effect, null);
});

test("ROUND 24+25: dungeon-rpg kitinin player rolü 3 kahraman, obstacle rolü 7 canavar (hazard sprite'ı olmadığı için enemy+trap tek pool'da), platform floor, tile wall+threshold+ROUND25:4 retro tile, gameObject chest+door+ROUND25:retrotex door, decoration 4 tinydungeon+ROUND25:4 retrofantasy prop, effect ROUND25:2 particle", function () {
  var resolved = resolveKitRoles("dungeon-rpg");
  assert.deepEqual(
    resolved.roles.player.map(function (a) { return a.id; }).sort(),
    ["tinydungeon_player_adventurer", "tinydungeon_player_knight", "tinydungeon_player_wizard"]
  );
  assert.deepEqual(
    resolved.roles.obstacle.map(function (a) { return a.id; }).sort(),
    [
      "tinydungeon_enemy_bat", "tinydungeon_enemy_crab", "tinydungeon_enemy_ghost",
      "tinydungeon_enemy_mimic", "tinydungeon_enemy_orc", "tinydungeon_enemy_slime",
      "tinydungeon_enemy_spider",
    ].sort()
  );
  assert.equal(resolved.roles.platform.id, "tinydungeon_tile_floor");
  assert.deepEqual(
    resolved.roles.tile.map(function (a) { return a.id; }).sort(),
    [
      "tinydungeon_tile_door_threshold", "tinydungeon_tile_wall",
      "retrofantasy_stairs_stone", "retrofantasy_ladder",
      "retrotex_wall_brick", "retrotex_floor_wood",
    ].sort()
  );
  assert.deepEqual(
    resolved.roles.collectible.map(function (a) { return a.id; }).sort(),
    ["tinydungeon_potion_blue", "tinydungeon_potion_red"]
  );
  assert.deepEqual(
    resolved.roles.gameObject.map(function (a) { return a.id; }).sort(),
    ["tinydungeon_chest", "tinydungeon_door", "retrotex_door_wood"].sort()
  );
  assert.deepEqual(
    resolved.roles.decoration.map(function (a) { return a.id; }).sort(),
    [
      "tinydungeon_decoration_barrel", "tinydungeon_decoration_crate",
      "tinydungeon_decoration_tombstone", "tinydungeon_decoration_torch",
      "retrofantasy_wall_fortified", "retrofantasy_tower",
      "retrofantasy_barrels", "retrofantasy_column",
    ].sort()
  );
  assert.deepEqual(
    resolved.roles.effect.map(function (a) { return a.id; }).sort(),
    ["particle_hit_impact", "particle_magic_glow"].sort()
  );
  assert.deepEqual(resolved.unresolved, []);
});

test("ROUND 25: city kitinin missingRoles listesi collectible/background/ui'ı içeriyor, player sedan, obstacle 5 trafik aracı+2 engel, platform straight, tile curve+intersection, gameObject trafficLight+stopSign, decoration 6, effect 3 particle", function () {
  var kit = getKit("city");
  assert.equal(kit.missingRoles.length, 3);
  assert.equal(kit.roles.collectible, null);
  assert.equal(kit.roles.background, null);
  assert.equal(kit.roles.ui, null);

  var resolved = resolveKitRoles("city");
  assert.equal(resolved.roles.player.id, "carkit_vehicle_sedan");
  assert.deepEqual(
    resolved.roles.obstacle.map(function (a) { return a.id; }).sort(),
    [
      "carkit_vehicle_taxi", "carkit_vehicle_police", "carkit_vehicle_ambulance",
      "carkit_vehicle_van", "carkit_vehicle_garbage_truck",
      "cityroads_cone", "cityroads_barrier",
    ].sort()
  );
  assert.equal(resolved.roles.platform.id, "cityroads_tile_road_straight");
  assert.deepEqual(
    resolved.roles.tile.map(function (a) { return a.id; }).sort(),
    ["cityroads_tile_road_curve", "cityroads_tile_road_intersection"].sort()
  );
  assert.deepEqual(
    resolved.roles.gameObject.map(function (a) { return a.id; }).sort(),
    ["cityroads_traffic_light", "cityroads_sign_stop"].sort()
  );
  assert.deepEqual(
    resolved.roles.decoration.map(function (a) { return a.id; }).sort(),
    [
      "cityroads_dumpster", "cityroads_electricity_pole",
      "cityindustrial_building_office", "cityindustrial_building_factory",
      "cityindustrial_water_tower", "cityindustrial_shipping_container",
    ].sort()
  );
  assert.deepEqual(
    resolved.roles.effect.map(function (a) { return a.id; }).sort(),
    ["particle_hit_impact", "particle_smoke_puff", "particle_spark_burst"].sort()
  );
  assert.deepEqual(resolved.unresolved, []);
});

test("ROUND 25: cooking kitinin missingRoles listesi player/obstacle/background/ui'ı içeriyor (Food Kit'te karakter/düşman/arka plan/UI yok), collectible 8 malzeme, target plate+cutting-board, gameObject 3 alet, decoration 4 yemek, effect 2 particle", function () {
  var kit = getKit("cooking");
  assert.equal(kit.missingRoles.length, 4);
  assert.equal(kit.roles.player, null);
  assert.equal(kit.roles.obstacle, null);
  assert.equal(kit.roles.background, null);
  assert.equal(kit.roles.ui, null);

  var resolved = resolveKitRoles("cooking");
  assert.deepEqual(
    resolved.roles.collectible.map(function (a) { return a.id; }).sort(),
    [
      "foodkit_apple", "foodkit_banana", "foodkit_tomato", "foodkit_carrot",
      "foodkit_egg", "foodkit_cheese", "foodkit_bread", "foodkit_fish",
    ].sort()
  );
  assert.deepEqual(
    resolved.roles.target.map(function (a) { return a.id; }).sort(),
    ["foodkit_plate", "foodkit_cutting_board"].sort()
  );
  assert.deepEqual(
    resolved.roles.gameObject.map(function (a) { return a.id; }).sort(),
    ["foodkit_pot", "foodkit_frying_pan", "foodkit_cooking_knife"].sort()
  );
  assert.deepEqual(
    resolved.roles.decoration.map(function (a) { return a.id; }).sort(),
    ["foodkit_burger", "foodkit_pizza", "foodkit_cake", "foodkit_donut"].sort()
  );
  assert.deepEqual(
    resolved.roles.effect.map(function (a) { return a.id; }).sort(),
    ["particle_smoke_puff", "particle_star_sparkle"].sort()
  );
  assert.deepEqual(resolved.unresolved, []);
});

test("her manifest asseti için compatibleGameTypes, o kitin roles'ünde GERÇEKTEN kullanılıyor mu (tutarlılık çapraz kontrolü)", function () {
  ASSET_MANIFEST.forEach(function (asset) {
    asset.compatibleGameTypes.forEach(function (gtKey) {
      var kit = getKit(gtKey);
      assert.ok(kit, asset.id + ": bilinmeyen game type '" + gtKey + "'");
      var usedInKit = Object.keys(kit.roles).some(function (role) {
        var value = kit.roles[role];
        if (value == null) return false;
        var list = Array.isArray(value) ? value : [value];
        return list.indexOf(asset.id) !== -1;
      });
      assert.ok(
        usedInKit,
        asset.id + ": compatibleGameTypes '" + gtKey + "' diyor ama " + kit.key + " kitinin roles'ünde yok"
      );
    });
  });
});
