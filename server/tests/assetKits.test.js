/**
 * PHASE 3A tests — assetKits.js (Game Kit sistemi).
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { GAME_KITS, getKit, listGameTypeKeys, resolveKitRoles } = require("../config/assetKits");
const { ASSET_MANIFEST } = require("../config/assetManifest");

var EXPECTED_KIT_KEYS = ["endless-runner", "space-shooter", "forest-platformer", "fruit-puzzle"];

function assetIds() {
  return ASSET_MANIFEST.map(function (a) { return a.id; });
}

test("tam olarak 4 kit tanımlı, beklenen key'lerle", function () {
  assert.equal(GAME_KITS.length, 4);
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
