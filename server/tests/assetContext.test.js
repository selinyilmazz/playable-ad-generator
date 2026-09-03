/**
 * PHASE 3A/3B tests — assetContext.js.
 * Amaç: (1) mevcut buildAssetContextMessage()/getKnownAssetPaths()
 * davranışının BOZULMADIĞINI doğrulamak (regresyon testi — bu iki
 * fonksiyon Phase 3B'de de HİÇ değiştirilmedi, sadece fallback olarak
 * kullanılıyor), (2) buildAssetContextMessageForKit()'in — Phase 3B'de
 * artık gerçek generate akışına bağlı (bkz. openrouter.js
 * resolveAssetContextForGameType) — doğru çalıştığını doğrulamak. Format,
 * Phase 3B'de token-verimliliği için TEK SATIR/asset olacak şekilde
 * sıkıştırıldı ("- role: id -> path") — bu testler o güncel formatı
 * doğruluyor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAssetContextMessage,
  getKnownAssetPaths,
  buildAssetContextMessageForKit,
} = require("../services/assetContext");
const { ASSET_MANIFEST } = require("../config/assetManifest");

test("REGRESYON: buildAssetContextMessage() hâlâ manifestteki assetlerin TAMAMINI içeriyor (ROUND 14 sonrası 56)", function () {
  var msg = buildAssetContextMessage();
  assert.ok(msg);
  ASSET_MANIFEST.forEach(function (a) {
    assert.ok(msg.indexOf("- " + a.id) !== -1, "eksik asset: " + a.id);
    assert.ok(msg.indexOf(a.path) !== -1, "eksik path: " + a.path);
  });
});

test("REGRESYON: buildAssetContextMessage() hâlâ kullanım kuralıyla başlıyor (USAGE_RULE değişmedi)", function () {
  var msg = buildAssetContextMessage();
  assert.match(msg, /^Use available game assets when they match the user's requested game\./);
});

test("REGRESYON: getKnownAssetPaths() hâlâ tüm path'lerin tamamını biliyor (ROUND 16 sonrası 78)", function () {
  var known = getKnownAssetPaths();
  assert.equal(Object.keys(known).length, ASSET_MANIFEST.length);
  ASSET_MANIFEST.forEach(function (a) {
    assert.ok(known[a.path], "bilinmeyen path: " + a.path);
  });
});

test("YENİ (altyapı): buildAssetContextMessageForKit('forest-platformer') sadece o kitin gerçek (SunnyLand) assetlerini içeriyor, tam manifesti DEĞİL", function () {
  var msg = buildAssetContextMessageForKit("forest-platformer");
  assert.ok(msg);
  assert.ok(msg.indexOf("sunnyland_background_forest") !== -1);
  assert.ok(msg.indexOf("sunnyland_player") !== -1);
  // ROUND 14: pack'te hazır tek-parça bir platform tile'ı yok — roles.platform
  // null olduğu için o satır hiç yazılmıyor (uydurulmadı, bkz. assetKits.js).
  assert.equal(/- platform:/.test(msg), false);
  // Space Shooter'a özel bir asset burada OLMAMALI (kit daraltması çalışıyor).
  assert.equal(msg.indexOf("background_space"), -1);
  assert.equal(msg.indexOf("fireball"), -1);
});

test("buildAssetContextMessageForKit() her satırda rolü inline ('- role: id -> path') açıkça veriyor", function () {
  var msg = buildAssetContextMessageForKit("endless-runner");
  assert.match(msg, /- player: hero_generic -> \/assets\/characters\/hero_generic\.svg/);
  assert.match(msg, /- collectible: coin_gold -> \/assets\/objects\/coin_gold\.svg/);
});

test("buildAssetContextMessageForKit() null rolleri (örn. endless-runner.environment) asla yazmıyor — uydurma asset satırı yok", function () {
  var msg = buildAssetContextMessageForKit("endless-runner");
  assert.equal(/- environment:/.test(msg), false);
});

test("bilinmeyen kit key'i için null döner, hata fırlatmaz", function () {
  assert.equal(buildAssetContextMessageForKit("no-such-kit"), null);
});

test("fruit-puzzle kitinin mesajı 10 meyve/sebzenin tamamını 'collectible:' rolüyle içeriyor", function () {
  var msg = buildAssetContextMessageForKit("fruit-puzzle");
  ["apple", "banana", "orange", "strawberry", "carrot", "broccoli", "tomato", "corn", "grapes", "potato"].forEach(
    function (id) {
      assert.ok(msg.indexOf("collectible: " + id + " ->") !== -1, "eksik: " + id);
    }
  );
});
