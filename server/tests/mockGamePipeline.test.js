/**
 * PHASE 5 tests — mockAssetSelector.js + mockGameTemplate.js.
 *
 * Amaç: mock modun artık (a) gameType'a göre GERÇEK, kit'ten gelen asset
 * path'leri kullandığını, (b) kit eşleşmediğinde bile hiçbir path'in
 * uydurulmadığını (sadece manifestte GERÇEKTEN var olan path'lerin
 * kullanıldığını) ve (c) üretilen HTML'in gerçekten skor/timer/win-lose
 * içeren, tıklanabilir bir oyun olduğunu doğrulamak.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { selectRolesForMock } = require("../services/mockAssetSelector");
const { buildMockGameHtml, normalizeRoles } = require("../services/mockGameTemplate");
const { ASSET_MANIFEST } = require("../config/assetManifest");
const { getKit } = require("../config/assetKits");

var KNOWN_PATHS = {};
ASSET_MANIFEST.forEach(function (a) { KNOWN_PATHS[a.path] = true; });

function extractAssetPaths(html) {
  var re = /\/assets\/[A-Za-z0-9_\-\/.]+\.(?:svg|png|jpg|jpeg|gif|webp)/g;
  return html.match(re) || [];
}

test("selectRolesForMock: bilinen bir gameType için kit rollerini AYNEN döner (source: 'kit')", function () {
  var sel = selectRolesForMock("forest-platformer", "irrelevant text");
  assert.equal(sel.source, "kit");
  assert.equal(sel.usedFallback, false);
  assert.equal(sel.kitName, getKit("forest-platformer").name);
  // ROUND 14: forest-platformer artık SunnyLand Forest pack'ini kullanıyor
  // (bkz. assetKits.js) — background çok-seçenekli bir dizi, platform ise
  // pack'te hazır bir tile PNG'si olmadığı için dürüstçe null.
  assert.ok(Array.isArray(sel.roles.background));
  assert.equal(sel.roles.background[0].id, "sunnyland_background_forest");
  assert.equal(sel.roles.platform, null);
});

test("selectRolesForMock: gameType null olduğunda fallback tarayıcı devreye girer, hiçbir asset uydurulmaz", function () {
  var sel = selectRolesForMock(null, "A wizard collects glowing crystals near a forest cave");
  assert.equal(sel.source, "fallback");
  assert.equal(sel.usedFallback, true);
  // "forest" kelimesi burada geçse de (fonksiyon çağrısı DOĞRUDAN yapıldığı
  // için) gameType tespiti bu testin sorumluluğunda değil — sadece rollerin
  // gerçek/geçerli olduğunu doğruluyoruz.
  Object.keys(sel.roles).forEach(function (role) {
    var v = sel.roles[role];
    if (v == null) return;
    var list = Array.isArray(v) ? v : [v];
    list.forEach(function (a) {
      assert.ok(KNOWN_PATHS[a.path], role + ": bilinmeyen/uydurulmuş path -> " + a.path);
    });
  });
});

test("selectRolesForMock: kısa tag'ler başka kelimelerin İÇİNDE yanlış pozitif vermiyor (ör. 'key' tag'i 'keywords' kelimesinde eşleşmemeli)", function () {
  var sel = selectRolesForMock(null, "Something completely unrelated with no game keywords whatsoever.");
  assert.equal(sel.usedFallback, true);
  var ids = sel.roles.collectible.map(function (a) { return a.id; });
  assert.ok(ids.indexOf("key") === -1, "'keywords' içindeki 'key' alt-dizesi yanlışlıkla eşleşti");
  // Bu durumda gerçek eşleşme yok -> nötr/genel varsayılan set devreye girmeli
  assert.deepEqual(ids.sort(), ["coin_gold", "gem_blue", "star"].sort());
});

test("selectRolesForMock: tamamen alakasız bir prompt bile boş/kırık bir set DEĞİL, en az bir gerçek collectible+effect içeren bir set döner", function () {
  var sel = selectRolesForMock(null, "Just a random idea with no clear type.");
  assert.equal(sel.usedFallback, true);
  assert.ok(Array.isArray(sel.roles.collectible));
  assert.ok(sel.roles.collectible.length >= 2, "en az 2 collectible olmalı (grid'de gerçek çeldirici için)");
  assert.ok(sel.roles.effect, "effect rolü de dolu olmalı");
});

test("ROUND 23: selectRolesForMock('racing', ...) racing kitini AYNEN döner — player rolü 2 araba, platform rolü straight tile (mock'un #player-sprite / #platform-row mantığına ek kod değişikliği olmadan oturuyor)", function () {
  var sel = selectRolesForMock("racing", "irrelevant text");
  assert.equal(sel.source, "kit");
  assert.equal(sel.usedFallback, false);
  assert.equal(sel.kitName, getKit("racing").name);
  assert.ok(Array.isArray(sel.roles.player));
  assert.deepEqual(sel.roles.player.map(function (a) { return a.id; }).sort(), ["racing_car_player_blue", "racing_car_player_red"]);
  assert.equal(sel.roles.platform.id, "racing_tile_road_straight");
  assert.equal(sel.roles.collectible, null);
  assert.equal(sel.roles.background, null);
});

test("ROUND 24+25: selectRolesForMock('dungeon-rpg', ...) dungeon-rpg kitini AYNEN döner — player rolü 3 kahraman, platform rolü floor tile, obstacle rolü 7 canavar, effect ROUND25 ile artık 2 particle (mock'un #player-sprite / #platform-row mantığına ek kod değişikliği olmadan oturuyor)", function () {
  var sel = selectRolesForMock("dungeon-rpg", "irrelevant text");
  assert.equal(sel.source, "kit");
  assert.equal(sel.usedFallback, false);
  assert.equal(sel.kitName, getKit("dungeon-rpg").name);
  assert.ok(Array.isArray(sel.roles.player));
  assert.equal(sel.roles.player.length, 3);
  assert.equal(sel.roles.platform.id, "tinydungeon_tile_floor");
  assert.ok(Array.isArray(sel.roles.obstacle) && sel.roles.obstacle.length === 7);
  assert.ok(Array.isArray(sel.roles.effect) && sel.roles.effect.length === 2, "ROUND 25: Particle Pack ile effect artık 2 partikül içeriyor");
  assert.equal(sel.roles.background, null);
});

test("normalizeRoles: kit rollerinin farklı anahtar isimlerini (background/environment, enemy/asteroid/obstacle) tek şekle indirger", function () {
  var resolvedSpace = selectRolesForMock("space-shooter", "").roles;
  var normalized = normalizeRoles(resolvedSpace);
  // ROUND 16: space-shooter artık Kenney Space Shooter (Remastered) pack'ini
  // kullanıyor — background_space yerine spaceshooter_background_deep/
  // spaceshooter_background_nebula'dan biri; enemy gemiler+UFO+asteroidler
  // TEK 'obstacle' dizisinde birleştirildiği için obstaclePool 8 öge taşır.
  // ROUND 20: Asset Library genişletmesiyle 3 UFO renk varyantı + 3 gerçekten
  // farklı tasarımlı enemy varyantı + 1 ek asteroid EKLENDİ -> 8 + 7 = 15.
  assert.match(normalized.environment.id, /^spaceshooter_background_(deep|nebula)$/);
  assert.equal(normalized.obstaclePool.length, 15, "space-shooter'ın birleşik 'obstacle' rolü (5 enemy/ufo + 3 asteroid + ROUND 20: 6 enemy varyant + 1 asteroid varyant) obstaclePool'a düşmeli");
});

test("ROUND 18: normalizeRoles genişletilmiş rolleri (tile/weapon/vehicle/powerup/ui) de normalize ediyor — HİÇBİR aktif kit bunları doldurmuyor ama altyapı hazır", function () {
  // Mevcut 4 kitin hiçbiri bu rolleri tanımlamadığı için gerçek bir
  // selectRolesForMock() çağrısından elde edilemezler — bu, normalizeRoles()
  // fonksiyonunun KENDİSİNİN saf bir birim testi (toArray/first çağrılarının
  // doğru anahtarları okuduğunu doğrular), gerçek bir kite bağlı değil.
  var fakeRacingRoles = {
    vehicle: { id: "racing_car_red", path: "/assets/packs/racing/characters/car-red.png" },
    tile: [{ id: "racing_tile_road", path: "/assets/packs/racing/tiles/road.png" }],
    weapon: [],
    powerup: [
      { id: "racing_powerup_nitro", path: "/assets/packs/racing/objects/nitro.png" },
      { id: "racing_powerup_shield", path: "/assets/packs/racing/objects/shield.png" },
    ],
    ui: [{ id: "racing_ui_speedometer", path: "/assets/packs/racing/ui/speedometer.png" }],
  };
  var normalized = normalizeRoles(fakeRacingRoles);
  assert.equal(normalized.vehicle.id, "racing_car_red");
  assert.deepEqual(normalized.tilePool.map(function (a) { return a.id; }), ["racing_tile_road"]);
  assert.deepEqual(normalized.weaponPool, []);
  assert.deepEqual(normalized.powerupPool.map(function (a) { return a.id; }), ["racing_powerup_nitro", "racing_powerup_shield"]);
  assert.deepEqual(normalized.uiPool.map(function (a) { return a.id; }), ["racing_ui_speedometer"]);

  // Boş/eksik roller (bugünkü 4 aktif kitin gerçek durumu) hâlâ null/boş
  // dizi döner, uydurma bir değer YOK.
  var emptyNormalized = normalizeRoles({});
  assert.equal(emptyNormalized.vehicle, null);
  assert.deepEqual(emptyNormalized.tilePool, []);
  assert.deepEqual(emptyNormalized.weaponPool, []);
  assert.deepEqual(emptyNormalized.powerupPool, []);
  assert.deepEqual(emptyNormalized.uiPool, []);
});

["forest-platformer", "space-shooter", "endless-runner", "fruit-puzzle", "racing", "dungeon-rpg", "city", "cooking"].forEach(function (gameType) {
  test("buildMockGameHtml('" + gameType + "'): sadece GERÇEK manifest path'leri kullanır, hiç emoji/uydurma path yok", function () {
    var sel = selectRolesForMock(gameType, "Create a 5-second game.");
    var html = buildMockGameHtml({
      prompt: "Create a 5-second game.",
      kitName: sel.kitName,
      roles: sel.roles,
      usedFallback: sel.usedFallback,
    });

    var paths = extractAssetPaths(html);
    assert.ok(paths.length > 0, gameType + ": hiç asset path'i kullanılmamış");
    paths.forEach(function (p) {
      assert.ok(KNOWN_PATHS[p], gameType + ": manifestte olmayan path -> " + p);
    });

    // Oyun gerçekten interaktif + skor + timer + win/lose içeriyor mu?
    assert.match(html, /addEventListener\(.click./);
    assert.match(html, /Score:/);
    assert.match(html, /timer-bar/);
    assert.match(html, /You Win!/);
    assert.match(html, /Game Over/);
    assert.match(html, /Play Again/);

    // Hiçbir emoji-tabanlı "görsel" yok (eski statik fruitPuzzle.html'in
    // FRUITS dizisi gibi) — bütün item görselleri gerçek <img src="/assets/...">.
    assert.doesNotMatch(html, /var FRUITS/);
  });
});

test("buildMockGameHtml: prompttaki '5-second' süresi, üretilen JS'te GERÇEKTEN (TOTAL_DURATION_MS) yansıyor", function () {
  var sel = selectRolesForMock("forest-platformer", "Create a 5-second forest game.");
  var html = buildMockGameHtml({
    prompt: "Create a 5-second forest game.",
    kitName: sel.kitName,
    roles: sel.roles,
    usedFallback: sel.usedFallback,
  });
  assert.match(html, /TOTAL_DURATION_MS = 5000/);
});

test("buildMockGameHtml: meta/gameType tutarlılığı — kitName başlıkta GERÇEKTEN görünüyor (REQUIREMENTS #11 fix)", function () {
  var sel = selectRolesForMock("forest-platformer", "x");
  var html = buildMockGameHtml({ prompt: "x", kitName: sel.kitName, roles: sel.roles, usedFallback: false });
  assert.match(html, /<title>Forest Platformer<\/title>/);
  assert.match(html, /<h1>Forest Platformer<\/h1>/);
});

test("buildMockGameHtml: roles boş/eksik olsa bile (player/environment/platform yok) HTML kırılmaz — fruit-puzzle gibi", function () {
  var sel = selectRolesForMock("fruit-puzzle", "x");
  assert.equal(sel.roles.background, null); // bkz. assetKits.js notu
  var html = buildMockGameHtml({ prompt: "x", kitName: sel.kitName, roles: sel.roles, usedFallback: false });
  assert.ok(html.indexOf("<!DOCTYPE html>") === 0);
  assert.match(html, /<\/html>\s*$/);
});
